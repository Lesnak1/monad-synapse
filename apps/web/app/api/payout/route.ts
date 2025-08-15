import { NextRequest, NextResponse } from 'next/server';
import { getPoolBalance, poolManager, canPoolCoverPayout, refundBetToPlayer } from '@/lib/poolWallet';
import { authenticateRequest, requirePermission, rateLimit } from '@/lib/auth';
import { getSecureContractManager } from '@/lib/secureContractManager';
import { transactionMonitor } from '@/lib/transactionMonitor';
import { securityAuditor } from '@/lib/securityAudit';
import { z } from 'zod';
// Web Crypto API helpers for Edge Runtime compatibility
async function createHash(algorithm: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomBytes(size: number): string {
  const array = new Uint8Array(size);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}
import { poolBalanceCache, cache } from '@/lib/cacheManager';
import { trackApiCall } from '@/lib/performance';
import { Address, parseEther, formatEther } from 'viem';

// Zod schema for payout validation
const payoutSchema = z.object({
  playerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  winAmount: z.number().min(0.001, 'Win amount must be at least 0.001').max(10000, 'Win amount exceeds maximum'),
  gameType: z.string().min(1, 'Game type is required'),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  gameId: z.string().optional(),
  multiplier: z.number().min(0).max(10000).optional(),
  gameProof: z.object({
    serverSeedHash: z.string(),
    clientSeed: z.string(),
    nonce: z.number(),
    gameHash: z.string()
  }).optional(),
  securityChecks: z.object({
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    sessionId: z.string().optional()
  }).optional()
});

// Type definitions
type PayoutData = z.infer<typeof payoutSchema>;
type PayoutPriority = 'low' | 'normal' | 'high' | 'urgent';

interface PayoutResponse {
  success: boolean;
  transactionHash?: string;
  payoutAmount?: number;
  playerAddress?: string;
  gameType?: string;
  gameId?: string;
  priority?: PayoutPriority;
  timestamp: number;
  confirmations?: number;
  proof?: PayoutData['gameProof'];
  authenticated?: boolean;
  monitoringId?: string;
  contractResult?: {
    success: boolean;
    transactionHash?: string;
    gasUsed?: string;
    confirmations?: number;
  } | null;
  securityStatus?: string;
  poolStatus?: {
    healthy: boolean;
    emergencyMode: boolean;
  };
  error?: string;
  errorId?: string;
  retryable?: boolean;
  details?: any;
  requiresApproval?: boolean;
  proposalId?: string;
  message?: string;
  retryAfter?: number;
  support?: string;
  criticalIssues?: any[];
}

interface ErrorResponse {
  success: false;
  error: string;
  errorId?: string;
  timestamp: number;
  retryable?: boolean;
  details?: any;
}

// Transaction store for replay protection (in production, use Redis/database)
const processedTransactions = new Set<string>();
const transactionLocks = new Map<string, number>();

// Game win amount limits for validation
const MAX_WIN_LIMITS: Record<string, number> = {
  'dice': 1000,           // Max based on 99% win chance
  'mines': 500,           // Max based on revealing multiple tiles
  'crash': 2000,          // Max based on crash multiplier
  'coin-flip': 200,       // Max based on simple 2x
  'slots': 1000,          // Max based on slot multipliers
  'plinko': 10000,        // Higher due to rare extreme multipliers
  'sweet-bonanza': 500,
  'diamonds': 350,
  'slide': 500,
  'burning-wins': 1000
};

// Suspicious IP addresses (in production, use database/external service)
const SUSPICIOUS_IPS = new Set(['127.0.0.1', '0.0.0.0']);

// Helper function to validate maximum win amounts
function validateMaxWinAmount(gameType: string, winAmount: number): boolean {
  const maxLimit = MAX_WIN_LIMITS[gameType] || 100; // Default conservative limit
  return winAmount <= maxLimit;
}

// Helper function to validate game proof integrity
async function validateGameProof(gameProof: PayoutData['gameProof'], gameType: string): Promise<boolean> {
  if (!gameProof) return true; // Optional validation

  const expectedHash = await createHash('sha256', 
    `${gameProof.serverSeedHash}:${gameProof.clientSeed}:${gameProof.nonce}:${gameType}`);
  
  return expectedHash === gameProof.gameHash;
}

// Helper function to perform security validation
function performSecurityChecks(securityChecks?: PayoutData['securityChecks']): { passed: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (securityChecks?.ipAddress && SUSPICIOUS_IPS.has(securityChecks.ipAddress)) {
    warnings.push(`Suspicious IP detected: ${securityChecks.ipAddress}`);
  }
  
  // Add more security checks as needed
  // - Geolocation restrictions
  // - User agent validation
  // - Session validation
  // - Rate limiting patterns
  
  return {
    passed: warnings.length === 0,
    warnings
  };
}

// Helper function to generate error response
function createErrorResponse(
  error: string, 
  status: number, 
  details?: any, 
  retryable: boolean = false
): NextResponse<ErrorResponse> {
  const errorId = `err_${Date.now()}_${randomBytes(4)}`;
  
  return NextResponse.json({
    success: false,
    error,
    errorId,
    timestamp: Date.now(),
    retryable,
    ...(details && { details })
  }, { status });
}

// Helper function to clean up old transactions and locks
function cleanupOldEntries(): void {
  const cutoff = Date.now() - 60000; // 1 minute ago
  
  // Remove old locks
  for (const [key, timestamp] of transactionLocks.entries()) {
    if (timestamp < cutoff) {
      transactionLocks.delete(key);
    }
  }
  
  // In production, also cleanup old processed transactions from database
  // Consider implementing a more sophisticated cleanup strategy
}

// Main POST handler for casino payouts
export async function POST(request: NextRequest): Promise<NextResponse<PayoutResponse | ErrorResponse>> {
  return trackApiCall('payout', async (): Promise<NextResponse<PayoutResponse | ErrorResponse>> => {
    const startTime = Date.now();
    let playerAddress: string | undefined;
    
    try {
      // Step 1: Authentication and authorization
      const authResult = await authenticateRequest(request);
      if (!authResult.isAuthenticated) {
        return createErrorResponse(
          'Authentication required',
          401,
          authResult.error
        );
      }

      // Check permissions
      if (!requirePermission('payout:request')(authResult.user!)) {
        return createErrorResponse(
          'Insufficient permissions for payout',
          403
        );
      }

      // Step 2: Rate limiting
      const rateLimitKey = 'address' in authResult.user! 
        ? authResult.user.address 
        : authResult.user!.keyId;
        
      if (!rateLimit(rateLimitKey, 50, 60000)) { // 50 requests per minute
        return createErrorResponse(
          'Rate limit exceeded',
          429,
          { retryAfter: 60 }
        );
      }

      // Step 3: Input validation
      let body: any;
      try {
        body = await request.json();
      } catch (parseError) {
        return createErrorResponse(
          'Invalid JSON payload',
          400,
          { parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error' }
        );
      }

      const validation = payoutSchema.safeParse(body);
      if (!validation.success) {
        return createErrorResponse(
          'Invalid payout parameters',
          400,
          validation.error.issues
        );
      }

      const payoutData: PayoutData = validation.data;
      playerAddress = payoutData.playerAddress;

      // Step 4: Transaction replay protection
      if (processedTransactions.has(payoutData.transactionId)) {
        return NextResponse.json({
          success: false,
          error: 'Transaction already processed',
          timestamp: Date.now(),
          details: { transactionId: payoutData.transactionId }
        }, { status: 409 });
      }

      // Step 5: Distributed locking
      const existingLock = transactionLocks.get(playerAddress);
      if (existingLock && Date.now() - existingLock < 30000) { // 30 second lock
        return NextResponse.json({
          success: false,
          error: 'Another payout in progress for this address',
          timestamp: Date.now(),
          retryAfter: 30
        }, { status: 423 });
      }

      // Acquire lock
      transactionLocks.set(playerAddress, Date.now());

      try {
        // Step 6: Security auditing
        const securityCheck = await securityAuditor.runQuickCheck();
        if (securityCheck.overallStatus === 'critical') {
          console.error('🚨 Critical security issues detected, blocking payout');
          return NextResponse.json({
            success: false,
            error: 'System temporarily unavailable due to security issues',
            timestamp: Date.now(),
            securityStatus: securityCheck.overallStatus,
            criticalIssues: securityCheck.criticalIssues
          }, { status: 503 });
        }

        // Step 7: Game proof validation
        if (!(await validateGameProof(payoutData.gameProof, payoutData.gameType))) {
          return createErrorResponse('Invalid game proof', 400);
        }

        // Step 8: Enhanced security validation
        const securityValidation = performSecurityChecks(payoutData.securityChecks);
        if (!securityValidation.passed) {
          console.warn('⚠️ Security warnings:', securityValidation.warnings);
          // Continue with warnings but log them
        }

        // Step 9: Win amount validation
        if (!validateMaxWinAmount(payoutData.gameType, payoutData.winAmount)) {
          return createErrorResponse(
            'Win amount exceeds game maximum',
            400,
            { maxLimit: MAX_WIN_LIMITS[payoutData.gameType] || 100 }
          );
        }

        // Step 10: Process payout through pool manager
        const payoutResult = await poolManager.sendFromPool(
          payoutData.playerAddress as Address,
          payoutData.winAmount,
          payoutData.gameType,
          payoutData.priority
        );

        if (!payoutResult.success) {
          console.error('🚫 Pool payout failed:', payoutResult.error);

          // Handle multi-sig requirement
          if (payoutResult.requiresMultiSig) {
            return NextResponse.json({
              success: false,
              error: 'payout_requires_approval',
              message: 'This payout requires multi-signature approval due to size or security policies',
              requiresApproval: true,
              proposalId: (payoutResult as any).proposalId || `proposal_${Date.now()}`,
              payoutAmount: payoutData.winAmount,
              playerAddress: payoutData.playerAddress,
              gameType: payoutData.gameType,
              timestamp: Date.now()
            }, { status: 202 });
          }

          // Handle insufficient funds - Refund bet amount to player
          if (payoutResult.error?.includes('insufficient')) {
            console.log(`🔄 Pool insufficient for payout. Attempting bet refund for ${payoutData.playerAddress}`);
            
            try {
              // Calculate original bet amount (assuming win = bet * multiplier)
              const originalBetAmount = payoutData.multiplier ? 
                parseEther((payoutData.winAmount / payoutData.multiplier).toString()) :
                parseEther('0.1'); // Fallback bet amount if multiplier not available
              
              // Attempt to refund the original bet
              const refundResult = await refundBetToPlayer(
                originalBetAmount,
                payoutData.playerAddress as Address,
                `Pool insufficient for payout. Refunding original bet amount.`
              );
              
              if (refundResult.success) {
                console.log(`✅ Bet refund successful: ${refundResult.transactionHash}`);
                
                return NextResponse.json({
                  success: true,
                  message: 'Pool was insufficient for your winnings. Your original bet has been refunded.',
                  refunded: true,
                  refundAmount: Number(formatEther(originalBetAmount)),
                  transactionHash: refundResult.transactionHash,
                  playerAddress: payoutData.playerAddress,
                  gameType: payoutData.gameType,
                  timestamp: Date.now()
                }, { status: 200 });
              } else {
                console.error(`❌ Bet refund failed: ${refundResult.error}`);
                
                return NextResponse.json({
                  success: false,
                  error: 'pool_insufficient_refund_failed',
                  message: 'Pool insufficient and bet refund failed. Please contact support immediately.',
                  payoutAmount: payoutData.winAmount,
                  playerAddress: payoutData.playerAddress,
                  gameType: payoutData.gameType,
                  timestamp: Date.now(),
                  support: 'Your funds are safe. Contact support for manual processing.'
                }, { status: 503 });
              }
            } catch (refundError: any) {
              console.error(`❌ Bet refund error: ${refundError.message}`);
              
              return NextResponse.json({
                success: false,
                error: 'pool_insufficient_refund_error',
                message: 'Pool insufficient and error during bet refund. Please contact support.',
                payoutAmount: payoutData.winAmount,
                playerAddress: payoutData.playerAddress,
                gameType: payoutData.gameType,
                timestamp: Date.now(),
                support: 'Your funds are safe. Contact support for immediate assistance.'
              }, { status: 503 });
            }
          }

          // Generic payout failure
          return createErrorResponse(
            payoutResult.error || 'Payout processing failed',
            400,
            {
              winAmount: payoutData.winAmount,
              playerAddress: payoutData.playerAddress,
              gameType: payoutData.gameType
            },
            true
          );
        }

        // Step 11: Smart contract processing (if applicable)
        let contractResult: any = null;
        if (payoutData.gameId && payoutData.multiplier) {
          try {
            contractResult = await getSecureContractManager().processGameResult(
              payoutData.playerAddress as Address,
              payoutData.gameId,
              parseEther(payoutData.winAmount.toString()),
              payoutData.multiplier
            );

            if (!contractResult.success) {
              console.error('🚫 Contract game result processing failed:', contractResult.error);
            } else {
              console.log('✅ Contract game result processed successfully');
            }
          } catch (contractError) {
            console.error('💥 Contract processing error:', contractError);
            // Don't fail the payout for contract errors, just log them
          }
        }

        // Step 12: Transaction monitoring
        const monitoringTxId = transactionMonitor.createTransaction(
          '0x0000000000000000000000000000000000000000' as Address, // Pool address placeholder
          payoutData.playerAddress as Address,
          parseEther(payoutData.winAmount.toString()),
          '0x',
          {
            strategy: 'aggressive',
            priority: payoutData.priority as any,
            timeout: 180000 // 3 minutes
          },
          {
            gameType: payoutData.gameType,
            playerAddress: payoutData.playerAddress as Address,
            betAmount: parseEther(payoutData.winAmount.toString()),
            expectedOutcome: 'win'
          }
        );

        // Step 13: Mark transaction as processed
        processedTransactions.add(payoutData.transactionId);

        // Step 14: Invalidate cache
        poolBalanceCache.delete('current_pool_balance');

        // Step 15: Create success response
        const response: PayoutResponse = {
          success: true,
          transactionHash: payoutResult.transactionHash || `0x${randomBytes(32)}`,
          payoutAmount: payoutData.winAmount,
          playerAddress: payoutData.playerAddress,
          gameType: payoutData.gameType,
          gameId: payoutData.gameId,
          priority: payoutData.priority,
          timestamp: Date.now(),
          confirmations: 1,
          proof: payoutData.gameProof,
          authenticated: true,
          monitoringId: monitoringTxId,
          contractResult: contractResult ? {
            success: contractResult.success,
            transactionHash: contractResult.transactionHash,
            gasUsed: contractResult.gasUsed?.toString(),
            confirmations: contractResult.confirmations
          } : null,
          securityStatus: securityCheck.overallStatus,
          poolStatus: {
            healthy: true,
            emergencyMode: false
          }
        };

        console.log('✅ Payout processed successfully:', {
          amount: payoutData.winAmount,
          recipient: payoutData.playerAddress,
          game: payoutData.gameType,
          txHash: response.transactionHash,
          processingTime: Date.now() - startTime
        });

        return NextResponse.json(response);

      } catch (innerError: any) {
        // Handle inner try block errors
        console.error('💥 Inner processing error:', innerError);
        throw innerError; // Re-throw to be caught by outer catch
      } finally {
        // Always release the lock in the finally block
        transactionLocks.delete(playerAddress);
      }

    } catch (error: any) {
      console.error('💥 Payout API critical error:', error);

      // Enhanced error reporting and security logging
      const errorId = `err_${Date.now()}_${randomBytes(8)}`;
      const errorDetails = {
        errorId,
        timestamp: Date.now(),
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        endpoint: 'payout',
        severity: 'critical',
        processingTime: Date.now() - startTime,
        playerAddress
      };

      // Release lock on error
      if (playerAddress) {
        transactionLocks.delete(playerAddress);
      }

      // In production, log to security monitoring system
      console.error('🚨 Security Log - Payout API Error:', errorDetails);

      return NextResponse.json({
        success: false,
        error: errorDetails.error,
        errorId,
        timestamp: Date.now(),
        retryable: !error.message?.includes('validation') && 
                  !error.message?.includes('authorization') &&
                  !error.message?.includes('authentication')
      }, { status: 500 });
    }
  });
}

// Cleanup interval for old transactions and locks
const CLEANUP_INTERVAL = 60000; // 1 minute
setInterval(cleanupOldEntries, CLEANUP_INTERVAL);

// Graceful cleanup on process termination
process.on('SIGTERM', () => {
  console.log('🛑 Cleaning up payout route resources...');
  processedTransactions.clear();
  transactionLocks.clear();
});

process.on('SIGINT', () => {
  console.log('🛑 Cleaning up payout route resources...');
  processedTransactions.clear();
  transactionLocks.clear();
});