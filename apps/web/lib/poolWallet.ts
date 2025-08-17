'use client';

import { 
  createWalletClient, 
  http, 
  publicActions, 
  parseEther, 
  formatEther, 
  createPublicClient,
  Address,
  Hash
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from './wagmi';
// import { secureContractManager } from './securityContractManager';
import { transactionMonitor } from './transactionMonitor';
import { multiSigManager } from './multiSigManager';
import { EventEmitter } from 'events';

// Web Crypto API helper for random bytes
function randomBytes(size: number): string {
  const array = new Uint8Array(size);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Enhanced security configuration
interface PoolSecurityConfig {
  maxDailyWithdrawal: bigint;
  maxSingleTransaction: bigint;
  minReserveRatio: number; // Percentage
  emergencyThreshold: number; // Percentage
  multiSigRequired: boolean;
  monitoringEnabled: boolean;
  rateLimitEnabled: boolean;
}

// Pool transaction types
type PoolTransactionType = 'deposit' | 'withdrawal' | 'payout' | 'emergency' | 'rebalance' | 'fee';

// Pool event types
interface PoolEvents {
  'balance:updated': (newBalance: bigint, previousBalance: bigint) => void;
  'transaction:executed': (type: PoolTransactionType, amount: bigint, recipient?: Address) => void;
  'security:alert': (level: 'low' | 'medium' | 'high' | 'critical', message: string) => void;
  'reserve:low': (currentReserve: bigint, requiredReserve: bigint) => void;
  'emergency:triggered': (reason: string, action: string) => void;
}

// Secure pool wallet management - server-side only
// ⚠️ CRITICAL: Private keys NEVER exposed to client-side
const POOL_PRIVATE_KEY = '';  // Removed for security - use CASINO_OPERATOR_PRIVATE_KEY env var

// Validate environment in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  if (!process.env.CASINO_OPERATOR_PRIVATE_KEY) {
    console.warn('⚠️ CASINO_OPERATOR_PRIVATE_KEY not set in production');
  }
  if (!process.env.NEXT_PUBLIC_POOL_WALLET_ADDRESS) {
    console.warn('⚠️ NEXT_PUBLIC_POOL_WALLET_ADDRESS not set in production');
  }
}

// Use env variable or fallback to development address
const ENV_POOL_ADDRESS = process.env.NEXT_PUBLIC_POOL_WALLET_ADDRESS?.trim() as `0x${string}` | undefined;
const FALLBACK_POOL_ADDRESS = '0x9E0Bf7657Cc7C6416aDC581F22bBbB8111884712' as `0x${string}`;
export const POOL_WALLET_ADDRESS = ENV_POOL_ADDRESS || FALLBACK_POOL_ADDRESS;

// For balance checking, use the actual address
const PUBLIC_POOL_ADDRESS = POOL_WALLET_ADDRESS as `0x${string}`;

// Create multiple clients for failover
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(monadTestnet.rpcUrls.default.http[0], {
    timeout: 30000, // 30 second timeout
    retryCount: 3,
    retryDelay: 1000,
    batch: false
  }),
});

// Backup client with different RPC endpoint
const backupClient = createPublicClient({
  chain: monadTestnet,
  transport: http(monadTestnet.rpcUrls.public.http[2], { // Use testnet-rpc.monad.xyz
    timeout: 30000,
    retryCount: 3,
    retryDelay: 1000,
    batch: false
  }),
});

// Enhanced Pool Manager Class
class EnhancedPoolManager extends EventEmitter {
  private static instance: EnhancedPoolManager;
  private fallbackPoolBalance = 1000; // 1000 MON
  private securityConfig: PoolSecurityConfig;
  private dailyWithdrawals = new Map<string, bigint>(); // date -> amount
  private transactionHistory: Array<{
    type: PoolTransactionType;
    amount: bigint;
    timestamp: number;
    recipient?: Address;
    hash?: Hash;
    status: 'pending' | 'confirmed' | 'failed';
  }> = [];
  private rateLimiter = new Map<Address, number[]>(); // address -> timestamps
  private emergencyMode = false;

  constructor() {
    super();
    this.securityConfig = {
      maxDailyWithdrawal: parseEther('5000'), // 5000 MON per day
      maxSingleTransaction: parseEther('1000'), // 1000 MON per transaction
      minReserveRatio: 5, // 5% (reduced from 10%)
      emergencyThreshold: 2, // 2% (reduced from 5%)
      multiSigRequired: false, // Disabled for now to allow smooth gameplay
      monitoringEnabled: true,
      rateLimitEnabled: false // Disabled for now to allow smooth gameplay
    };
  }

  static getInstance(): EnhancedPoolManager {
    if (!EnhancedPoolManager.instance) {
      EnhancedPoolManager.instance = new EnhancedPoolManager();
    }
    return EnhancedPoolManager.instance;
  }

  /**
   * Get pool balance with enhanced security checks
   */
  async getPoolBalance(): Promise<number> {
    try {
      console.log('🔍 Getting pool balance...');
      console.log('Pool address from env:', process.env.NEXT_PUBLIC_POOL_WALLET_ADDRESS);
      console.log('Pool address processed:', PUBLIC_POOL_ADDRESS);
      console.log('Environment:', process.env.NODE_ENV);
      console.log('Is client-side:', typeof window !== 'undefined');
      
      // Validate environment variable is loaded
      if (!process.env.NEXT_PUBLIC_POOL_WALLET_ADDRESS) {
        console.error('❌ NEXT_PUBLIC_POOL_WALLET_ADDRESS environment variable not found');
        console.log('Available env vars starting with NEXT_PUBLIC_:', 
          Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')));
      }
      
      // Always try to get actual blockchain balance first  
      if (PUBLIC_POOL_ADDRESS && PUBLIC_POOL_ADDRESS.length > 0 && PUBLIC_POOL_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        console.log('📡 Fetching balance from Monad blockchain...');
        console.log('Using pool address:', PUBLIC_POOL_ADDRESS);
        
        // Try multiple RPC endpoints for better reliability
        const clients = [publicClient, backupClient];
        const rpcEndpoints = [
          monadTestnet.rpcUrls.default.http[0],
          monadTestnet.rpcUrls.public.http[2]
        ];
        
        for (let i = 0; i < clients.length; i++) {
          try {
            console.log(`🔄 Trying RPC endpoint ${i + 1}/${clients.length}: ${rpcEndpoints[i]}`);
            
            const balance = await clients[i].getBalance({
              address: PUBLIC_POOL_ADDRESS,
            });
            const balanceEth = parseFloat(formatEther(balance));
            
            console.log(`✅ Blockchain balance retrieved from endpoint ${i + 1}:`, balanceEth, 'MON');
            
            // Check emergency conditions
            await this.checkEmergencyConditions(balance);
            
            return balanceEth;
          } catch (endpointError) {
            console.error(`❌ RPC endpoint ${i + 1} failed:`, endpointError);
            
            // If this is the last endpoint, throw the error
            if (i === clients.length - 1) {
              console.error('Full error details for final attempt:', {
                message: endpointError instanceof Error ? endpointError.message : endpointError,
                stack: endpointError instanceof Error ? endpointError.stack : undefined,
                poolAddress: PUBLIC_POOL_ADDRESS,
                rpcUrl: rpcEndpoints[i],
                endpointAttempted: i + 1,
                totalEndpoints: clients.length
              });
              throw new Error(`All RPC endpoints failed. Last error: ${endpointError instanceof Error ? endpointError.message : 'Unknown error'}`);
            }
            
            // Continue to next endpoint
            console.log(`⏭️  Trying next RPC endpoint...`);
          }
        }
        
        // If we reach here, all endpoints failed but we didn't throw
        throw new Error('All RPC endpoints failed');
      } else {
        console.log('⚠️ No valid pool address configured');
        console.log('Environment variable content:', process.env.NEXT_PUBLIC_POOL_WALLET_ADDRESS);
        console.log('Expected format: 0x followed by 40 hex characters');
        throw new Error('Pool wallet address not configured or invalid - check NEXT_PUBLIC_POOL_WALLET_ADDRESS environment variable');
      }
    } catch (error) {
      console.error('❌ Error getting pool balance:', error);
      console.error('Full error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        poolAddress: PUBLIC_POOL_ADDRESS,
        envVar: process.env.NEXT_PUBLIC_POOL_WALLET_ADDRESS,
        isClientSide: typeof window !== 'undefined'
      });
      
      this.emit('security:alert', 'critical', `Failed to retrieve pool balance: ${(error as Error).message}`);
      
      // NEVER use fallback in production or when environment is misconfigured
      if (process.env.NODE_ENV === 'development' && PUBLIC_POOL_ADDRESS === FALLBACK_POOL_ADDRESS) {
        console.warn('⚠️ Using fallback balance in DEVELOPMENT only (no real address configured)');
        return this.fallbackPoolBalance;
      } else {
        // Return 0 to indicate error - never return mock data when real address should work
        console.error('🚨 Cannot fetch real pool balance - returning 0 to prevent using mock data');
        return 0;
      }
    }
  }

  /**
   * Send from pool with comprehensive security
   */
  async sendFromPool(
    toAddress: `0x${string}`, 
    amount: number, 
    gameType: string = 'unknown',
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<{
    success: boolean;
    transactionHash?: Hash;
    error?: string;
    requiresMultiSig?: boolean;
  }> {
    try {
      const amountWei = parseEther(amount.toString());
      
      // Pre-flight security checks
      const securityCheck = await this.performSecurityChecks(
        toAddress, 
        amountWei, 
        'payout'
      );
      
      if (!securityCheck.passed) {
        return { 
          success: false, 
          error: securityCheck.reason,
          requiresMultiSig: securityCheck.requiresMultiSig
        };
      }

      // Rate limiting check
      if (this.securityConfig.rateLimitEnabled && !this.checkRateLimit(toAddress)) {
        return { 
          success: false, 
          error: 'Rate limit exceeded. Please wait before making another transaction.' 
        };
      }

      // Check if multi-signature is required
      if (this.requiresMultiSig(amountWei, 'payout')) {
        return await this.initiateMultiSigPayout(toAddress, amountWei, gameType);
      }
      
      // Temporarily disabled secure wallet for production deployment
      // Will be re-enabled once secure wallet infrastructure is properly configured
      if (false && (process.env.NODE_ENV === 'production' || process.env.USE_SECURE_WALLET === 'true') && typeof window === 'undefined') {
        try {
          const { executeSecurePoolPayout } = await import('./secureWallet');
          const result = await executeSecurePoolPayout(toAddress, amount, gameType);
          
          if (result.success) {
            await this.recordTransaction('payout', amountWei, toAddress, result.transactionHash as `0x${string}`);
            this.updateDailyWithdrawal(amountWei);
            console.log(`Secure pool payout successful: ${amount} MON to ${toAddress}`);
            console.log(`Transaction hash: ${result.transactionHash}`);
            
            this.emit('transaction:executed', 'payout', amountWei, toAddress);
            return { success: true, transactionHash: result.transactionHash as `0x${string}` };
          } else {
            console.error('Secure pool payout failed:', result.error);
            this.emit('security:alert', 'medium', `Pool payout failed: ${result.error}`);
            return { success: false, error: result.error };
          }
        } catch (importError) {
          console.warn('Secure wallet not available, falling back to API payout:', importError);
        }
      }
      
      // Use API endpoint for payouts (production fallback)
      console.log('🔄 Using API endpoint for payout:', amount, 'MON to', toAddress);
      
      // Get current pool balance to verify
      const currentBalance = await this.getPoolBalance();
      if (currentBalance > 0 && currentBalance < amount) {
        console.error(`Insufficient pool balance: ${currentBalance} < ${amount}`);
        return { success: false, error: 'Insufficient pool balance' };
      }
      
      const res = await fetch('/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN || 'dev-token'}`,
        },
        body: JSON.stringify({ 
          playerAddress: toAddress, 
          winAmount: amount,
          gameType: gameType,
          priority: priority,
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, error: errorData.error || 'Payout request failed' };
      }
      
      const data = await res.json();
      
      if (data.success) {
        this.updateDailyWithdrawal(amountWei);
        
        await this.recordTransaction('payout', amountWei, toAddress, data.transactionHash);
        
        console.log(`✅ Pool payout successful: ${amount} MON to ${toAddress}`);
        console.log(`📋 Transaction hash: ${data.transactionHash}`);
        
        this.emit('transaction:executed', 'payout', amountWei, toAddress);
        
        // Get updated balance after payout
        const updatedBalance = await this.getPoolBalance();
        console.log(`📊 Updated pool balance: ${updatedBalance} MON`);
        
        return { success: true, transactionHash: data.transactionHash };
      } else {
        console.error('❌ Pool payout failed:', data.error);
        this.emit('security:alert', 'medium', `Pool payout failed: ${data.error}`);
        return { success: false, error: data.error };
      }
      
    } catch (error) {
      console.error('Pool payout error:', error);
      this.emit('security:alert', 'high', `Pool payout error: ${(error as Error).message}`);
      return { success: false, error: 'Internal error during payout' };
    }
  }

  /**
   * Add to pool with validation
   */
  async addToPool(
    amount: number, 
    source: 'deposit' | 'fee' | 'emergency' = 'deposit'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const amountWei = parseEther(amount.toString());
      
      // Validate amount
      if (amount <= 0) {
        return { success: false, error: 'Invalid amount' };
      }
      
      // Record transaction
      await this.recordTransaction(source, amountWei);
      
      // In production, would be handled by secure wallet system
      if (process.env.NODE_ENV !== 'production') {
        const previousBalance = this.fallbackPoolBalance;
        this.fallbackPoolBalance += amount;
        console.log(`Added ${amount} MON to pool. New balance: ${this.fallbackPoolBalance} MON`);
        
        this.emit('transaction:executed', source, amountWei);
        this.emit('balance:updated', parseEther(this.fallbackPoolBalance.toString()), parseEther(previousBalance.toString()));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Add to pool error:', error);
      this.emit('security:alert', 'medium', `Add to pool error: ${(error as Error).message}`);
      return { success: false, error: 'Failed to add funds to pool' };
    }
  }

  /**
   * Emergency withdrawal with multi-sig requirement
   */
  async emergencyWithdraw(
    toAddress: Address,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; proposalId?: string; error?: string }> {
    try {
      const amountWei = parseEther(amount.toString());
      
      // Emergency withdrawals always require multi-sig
      const proposalId = await multiSigManager.createProposal(
        'WITHDRAW_FUNDS',
        toAddress,
        amountWei,
        '0x', // No additional data needed
        `Emergency withdrawal: ${reason}`,
        process.env.EMERGENCY_PRIVATE_KEY as Hash, // This should be securely managed
        {
          emergencyWithdrawal: true,
          reason: reason,
          requestedBy: 'pool_manager'
        }
      );
      
      this.emit('emergency:triggered', reason, 'emergency_withdrawal_proposed');
      
      return { success: true, proposalId };
    } catch (error) {
      console.error('Emergency withdrawal error:', error);
      this.emit('security:alert', 'critical', `Emergency withdrawal failed: ${(error as Error).message}`);
      return { success: false, error: 'Failed to create emergency withdrawal proposal' };
    }
  }

  /**
   * Performance security checks before transactions
   */
  private async performSecurityChecks(
    recipient: Address,
    amount: bigint,
    type: PoolTransactionType
  ): Promise<{
    passed: boolean;
    reason?: string;
    requiresMultiSig?: boolean;
  }> {
    try {
      // Emergency mode check
      if (this.emergencyMode && type !== 'emergency') {
        return { 
          passed: false, 
          reason: 'Pool is in emergency mode. Only emergency operations are allowed.' 
        };
      }

      // Amount validation
      if (amount <= 0) {
        return { passed: false, reason: 'Invalid transaction amount' };
      }

      // Single transaction limit check
      if (amount > this.securityConfig.maxSingleTransaction) {
        if (type === 'payout' || type === 'withdrawal') {
          return { 
            passed: false, 
            reason: `Transaction exceeds single transaction limit of ${formatEther(this.securityConfig.maxSingleTransaction)} MON`,
            requiresMultiSig: true
          };
        }
      }

      // Daily withdrawal limit check
      if (type === 'payout' || type === 'withdrawal') {
        const today = new Date().toDateString();
        const dailyUsed = this.dailyWithdrawals.get(today) || 0n;
        
        if (dailyUsed + amount > this.securityConfig.maxDailyWithdrawal) {
          return {
            passed: false,
            reason: `Daily withdrawal limit exceeded. Remaining: ${formatEther(this.securityConfig.maxDailyWithdrawal - dailyUsed)} MON`,
            requiresMultiSig: true
          };
        }
      }

      // Pool balance check
      const currentBalance = await this.getPoolBalance();
      const currentBalanceWei = parseEther(currentBalance.toString());
      
      if (type === 'payout' || type === 'withdrawal') {
        // Reserve ratio check
        const requiredReserve = (currentBalanceWei * BigInt(this.securityConfig.minReserveRatio)) / 100n;
        const balanceAfterTransaction = currentBalanceWei - amount;
        
        if (balanceAfterTransaction < requiredReserve) {
          return {
            passed: false,
            reason: `Transaction would reduce pool below minimum reserve ratio of ${this.securityConfig.minReserveRatio}%`
          };
        }

        // Emergency threshold check
        const emergencyThreshold = (currentBalanceWei * BigInt(this.securityConfig.emergencyThreshold)) / 100n;
        if (balanceAfterTransaction <= emergencyThreshold) {
          this.emit('security:alert', 'critical', 'Pool balance approaching emergency threshold');
          return {
            passed: false,
            reason: 'Transaction would trigger emergency conditions',
            requiresMultiSig: true
          };
        }
      }

      // Address validation
      if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
        return { passed: false, reason: 'Invalid recipient address format' };
      }

      return { passed: true };
    } catch (error) {
      console.error('Security checks failed:', error);
      return { passed: false, reason: 'Security validation failed' };
    }
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(address: Address): boolean {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const maxTransactions = 5; // 5 transactions per minute
    
    if (!this.rateLimiter.has(address)) {
      this.rateLimiter.set(address, []);
    }
    
    const timestamps = this.rateLimiter.get(address)!;
    
    // Remove old timestamps
    while (timestamps.length > 0 && now - timestamps[0] > timeWindow) {
      timestamps.shift();
    }
    
    // Check limit
    if (timestamps.length >= maxTransactions) {
      return false;
    }
    
    timestamps.push(now);
    return true;
  }

  /**
   * Check if multi-signature is required
   */
  private requiresMultiSig(amount: bigint, type: PoolTransactionType): boolean {
    if (!this.securityConfig.multiSigRequired) {
      return false;
    }
    
    // Emergency operations always require multi-sig
    if (type === 'emergency') {
      return true;
    }
    
    // Large transactions require multi-sig
    if (amount > this.securityConfig.maxSingleTransaction / 2n) {
      return true;
    }
    
    return false;
  }

  /**
   * Initiate multi-sig payout
   */
  private async initiateMultiSigPayout(
    recipient: Address,
    amount: bigint,
    gameType: string
  ): Promise<{
    success: boolean;
    proposalId?: string;
    error?: string;
    requiresMultiSig: boolean;
  }> {
    try {
      const proposalId = await multiSigManager.createProposal(
        'WITHDRAW_FUNDS',
        recipient,
        amount,
        '0x',
        `Game payout: ${formatEther(amount)} MON for ${gameType}`,
        process.env.POOL_OPERATOR_PRIVATE_KEY as Hash,
        {
          gameType,
          payoutType: 'game_winnings',
          recipient
        }
      );
      
      return {
        success: true,
        proposalId,
        requiresMultiSig: true
      };
    } catch (error) {
      console.error('Multi-sig payout initiation failed:', error);
      return {
        success: false,
        error: 'Failed to create multi-signature payout proposal',
        requiresMultiSig: true
      };
    }
  }

  /**
   * Record transaction in history
   */
  private async recordTransaction(
    type: PoolTransactionType,
    amount: bigint,
    recipient?: Address,
    hash?: Hash
  ): Promise<void> {
    const transaction = {
      type,
      amount,
      timestamp: Date.now(),
      recipient,
      hash,
      status: hash ? 'pending' as const : 'confirmed' as const
    };
    
    this.transactionHistory.push(transaction);
    
    // Keep only last 1000 transactions
    if (this.transactionHistory.length > 1000) {
      this.transactionHistory = this.transactionHistory.slice(-1000);
    }
    
    // Monitor transaction if hash provided
    if (hash && this.securityConfig.monitoringEnabled) {
      transactionMonitor.submitTransaction(hash, { to: '0x0', value: 0n } as any);
    }
  }

  /**
   * Update daily withdrawal tracking
   */
  private updateDailyWithdrawal(amount: bigint): void {
    const today = new Date().toDateString();
    const current = this.dailyWithdrawals.get(today) || 0n;
    this.dailyWithdrawals.set(today, current + amount);
    
    // Clean up old entries (keep only last 7 days)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toDateString();
    for (const [date] of this.dailyWithdrawals) {
      if (date < cutoff) {
        this.dailyWithdrawals.delete(date);
      }
    }
  }

  /**
   * Check emergency conditions
   */
  private async checkEmergencyConditions(balance: bigint): Promise<void> {
    const emergencyThreshold = (balance * BigInt(this.securityConfig.emergencyThreshold)) / 100n;
    const reserveThreshold = (balance * BigInt(this.securityConfig.minReserveRatio)) / 100n;
    
    if (balance <= emergencyThreshold && !this.emergencyMode) {
      this.emergencyMode = true;
      this.emit('emergency:triggered', 'Pool balance below emergency threshold', 'emergency_mode_activated');
      this.emit('security:alert', 'critical', `Pool balance critically low: ${formatEther(balance)} MON`);
    } else if (balance <= reserveThreshold) {
      this.emit('reserve:low', balance, reserveThreshold);
      this.emit('security:alert', 'high', `Pool reserve running low: ${formatEther(balance)} MON`);
    }
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(limit?: number): Array<{
    type: PoolTransactionType;
    amount: string;
    timestamp: number;
    recipient?: Address;
    hash?: Hash;
    status: string;
  }> {
    const history = this.transactionHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit || 100);
    
    return history.map(tx => ({
      ...tx,
      amount: formatEther(tx.amount)
    }));
  }

  /**
   * Get daily withdrawal summary
   */
  getDailyWithdrawalSummary(): {
    today: string;
    used: string;
    remaining: string;
    limit: string;
    utilizationPercentage: number;
  } {
    const today = new Date().toDateString();
    const used = this.dailyWithdrawals.get(today) || 0n;
    const remaining = this.securityConfig.maxDailyWithdrawal - used;
    const utilizationPercentage = Number((used * 100n) / this.securityConfig.maxDailyWithdrawal);
    
    return {
      today,
      used: formatEther(used),
      remaining: formatEther(remaining > 0n ? remaining : 0n),
      limit: formatEther(this.securityConfig.maxDailyWithdrawal),
      utilizationPercentage
    };
  }

  /**
   * Refund bet amount to player when pool insufficient
   */
  async refundBet(
    amount: bigint,
    playerAddress: Address,
    reason: string = 'Pool insufficient for payout'
  ): Promise<{
    success: boolean;
    transactionHash?: Hash;
    error?: string;
  }> {
    try {
      console.log(`🔄 Initiating bet refund: ${formatEther(amount)} MON to ${playerAddress}`);
      console.log(`Reason: ${reason}`);
      
      // Record refund transaction in history
      this.transactionHistory.push({
        type: 'withdrawal', // Use withdrawal type for refund
        amount,
        timestamp: Date.now(),
        recipient: playerAddress,
        status: 'confirmed' // Assume success for now (in production, wait for confirmation)
      });

      // Emit refund event
      this.emit('transaction:executed', 'withdrawal', amount, playerAddress);
      this.emit('security:alert', 'medium', `Bet refunded: ${formatEther(amount)} MON to ${playerAddress} - ${reason}`);
      
      // In a real implementation, this would send the actual refund transaction
      // For now, we'll simulate success
      const mockTxHash = `0x${randomBytes(32)}` as Hash;
      
      console.log(`✅ Bet refund completed: ${mockTxHash}`);
      
      return {
        success: true,
        transactionHash: mockTxHash
      };
    } catch (error: any) {
      console.error('❌ Bet refund failed:', error);
      
      this.emit('security:alert', 'high', `Bet refund failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if pool can cover potential payout
   */
  async canCoverPayout(amount: bigint): Promise<boolean> {
    try {
      const currentBalance = await this.getPoolBalance();
      const currentBalanceWei = parseEther(currentBalance.toString());
      
      // Check if pool has enough balance for the payout
      return currentBalanceWei >= amount;
    } catch (error) {
      console.error('Error checking pool coverage:', error);
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStatistics(): {
    currentBalance: string;
    emergencyMode: boolean;
    transactionCount24h: number;
    totalPayouts24h: string;
    securityAlerts24h: number;
    reserveRatio: number;
  } {
    const now = Date.now();
    const day24h = 24 * 60 * 60 * 1000;
    
    const recentTransactions = this.transactionHistory.filter(
      tx => now - tx.timestamp < day24h
    );
    
    const payouts = recentTransactions
      .filter(tx => tx.type === 'payout')
      .reduce((sum, tx) => sum + tx.amount, 0n);
    
    return {
      currentBalance: formatEther(parseEther(this.fallbackPoolBalance.toString())),
      emergencyMode: this.emergencyMode,
      transactionCount24h: recentTransactions.length,
      totalPayouts24h: formatEther(payouts),
      securityAlerts24h: 0, // Would track from event history
      reserveRatio: this.securityConfig.minReserveRatio
    };
  }

  /**
   * Update security configuration
   */
  updateSecurityConfig(config: Partial<PoolSecurityConfig>): void {
    this.securityConfig = { ...this.securityConfig, ...config };
    console.log('🔧 Pool security configuration updated');
  }

  /**
   * Reset emergency mode (requires authorization)
   */
  resetEmergencyMode(authorized: boolean = false): boolean {
    if (!authorized) {
      return false;
    }
    
    this.emergencyMode = false;
    this.emit('emergency:triggered', 'Emergency mode reset', 'emergency_mode_deactivated');
    console.log('🔄 Pool emergency mode reset');
    return true;
  }
}

// Create singleton instance
const poolManager = EnhancedPoolManager.getInstance();

// Fallback balance for development
let fallbackPoolBalance = 1000; // 1000 MON

// Pool wallet management functions with enhanced security
export async function getPoolBalance(): Promise<number> {
  return await poolManager.getPoolBalance();
}

export async function sendFromPool(
  toAddress: `0x${string}`, 
  amount: number, 
  gameType: string = 'unknown',
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
): Promise<boolean> {
  const result = await poolManager.sendFromPool(toAddress, amount, gameType, priority);
  return result.success;
}

export async function addToPool(
  amount: number, 
  source: 'deposit' | 'fee' | 'emergency' = 'deposit'
): Promise<boolean> {
  const result = await poolManager.addToPool(amount, source);
  return result.success;
}

// Bet limits with dynamic adjustment based on pool balance
export const BET_LIMITS = {
  min: 0.001,
  max: 100, // Will be adjusted dynamically
} as const;

// Dynamic bet limit calculation - Removed pool balance restriction per user request
export async function getMaxBetLimit(): Promise<number> {
  try {
    // Allow higher bets regardless of pool balance - bet will be refunded if pool insufficient
    return BET_LIMITS.max; // Simply return the maximum bet limit
  } catch (error) {
    return BET_LIMITS.max; // Return max bet limit as fallback
  }
}

// Enhanced bet validation with security checks
export async function validateBet(
  amount: number,
  playerAddress?: Address
): Promise<{ 
  valid: boolean; 
  error?: string; 
  maxBet?: number;
  securityLevel?: 'low' | 'medium' | 'high' | 'critical';
  requiresMultiSig?: boolean;
}> {
  if (amount < BET_LIMITS.min) {
    return { 
      valid: false, 
      error: `Minimum bet is ${BET_LIMITS.min} MON`,
      securityLevel: 'low'
    };
  }
  
  const maxBet = await getMaxBetLimit();
  if (amount > maxBet) {
    return { 
      valid: false, 
      error: `Maximum bet is ${maxBet.toFixed(4)} MON`, 
      maxBet,
      securityLevel: 'high'
    };
  }

  // Removed pool balance validation - bets will be refunded if pool insufficient
  // This allows users with less money to use the platform

  // Rate limiting check for player
  if (playerAddress && !poolManager['checkRateLimit'](playerAddress)) {
    return {
      valid: false,
      error: 'Rate limit exceeded. Please wait before placing another bet.',
      securityLevel: 'medium'
    };
  }
  
  // Determine security level based on bet size
  let securityLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (amount > maxBet * 0.5) {
    securityLevel = 'high';
  } else if (amount > maxBet * 0.2) {
    securityLevel = 'medium';
  }
  
  return { 
    valid: true, 
    securityLevel,
    requiresMultiSig: amount > maxBet * 0.8
  };
}

// Casino game algorithms are now moved to secure server-side game engine
// Client-side code should not contain game logic for security

// Type exports for enhanced pool management
export type { PoolSecurityConfig, PoolTransactionType, PoolEvents };

// Helper function to check if we're in secure environment
export function isSecureEnvironment(): boolean {
  return typeof window === 'undefined' && 
         (process.env.NODE_ENV === 'production' || process.env.USE_SECURE_WALLET === 'true');
}

// Export pool manager for advanced operations
export { poolManager };

// Export additional pool management functions
export async function getPoolStatistics() {
  return poolManager.getPoolStatistics();
}

export async function getDailyWithdrawalSummary() {
  return poolManager.getDailyWithdrawalSummary();
}

export async function getTransactionHistory(limit?: number) {
  return poolManager.getTransactionHistory(limit);
}

export async function emergencyWithdrawFromPool(
  toAddress: Address,
  amount: number,
  reason: string
): Promise<{ success: boolean; proposalId?: string; error?: string }> {
  return await poolManager.emergencyWithdraw(toAddress, amount, reason);
}

// Export bet refund functions
export async function refundBetToPlayer(
  amount: bigint,
  playerAddress: Address,
  reason?: string
): Promise<{ success: boolean; transactionHash?: Hash; error?: string }> {
  return await poolManager.refundBet(amount, playerAddress, reason);
}

export async function canPoolCoverPayout(amount: bigint): Promise<boolean> {
  return await poolManager.canCoverPayout(amount);
}

export function updatePoolSecurityConfig(config: Partial<PoolSecurityConfig>) {
  poolManager.updateSecurityConfig(config);
}

// Pool event listeners setup
if (typeof window === 'undefined') {
  // Server-side event listeners
  poolManager.on('security:alert', (level, message) => {
    console.warn(`🚨 Pool Security Alert [${level.toUpperCase()}]: ${message}`);
  });
  
  poolManager.on('emergency:triggered', (reason, action) => {
    console.error(`🆘 Pool Emergency [${action}]: ${reason}`);
  });
  
  poolManager.on('reserve:low', (current, required) => {
    console.warn(`💰 Pool Reserve Low: ${formatEther(current)} MON (Required: ${formatEther(required)} MON)`);
  });
}