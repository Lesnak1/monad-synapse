/**
 * Secure Game Contract Hook
 * Enhanced version of useGameContract with advanced security patterns
 */

'use client';

import { useAccount, useBalance, useSendTransaction, usePublicClient } from 'wagmi';
import { parseEther, formatEther, Address, Hash } from 'viem';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { secureContractManager } from './secureContractManager';
import { validateBet } from './poolWallet';

// Security configuration
const SECURITY_CONFIG = {
  MIN_BET: parseEther('0.001'),
  MAX_BET: parseEther('100'),
  MAX_DAILY_LOSSES: parseEther('100'),
  RATE_LIMIT_WINDOW: 1000, // 1 second
  SESSION_TIMEOUT: 1800000, // 30 minutes
  MAX_CONSECUTIVE_LOSSES: 10,
  SUSPICIOUS_WIN_THRESHOLD: 50, // 50x multiplier triggers review
};

// Game session tracking
interface GameSession {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  consecutiveLosses: number;
  isActive: boolean;
  flags: string[];
}

// Transaction tracking
interface GameTransaction {
  id: string;
  type: 'bet' | 'payout';
  amount: bigint;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  hash?: Hash;
  gameType: string;
  multiplier?: number;
  metadata?: Record<string, any>;
}

// Security validation result
interface SecurityValidation {
  isValid: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations?: string[];
}

export function useSecureGameContract() {
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();
  const [gameState, setGameState] = useState<'idle' | 'betting' | 'waiting' | 'completed' | 'error'>('idle');
  const [isTransacting, setIsTransacting] = useState(false);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [transactions, setTransactions] = useState<GameTransaction[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<string[]>([]);
  const [poolStatus, setPoolStatus] = useState<{
    totalBalance: bigint;
    availableBalance: bigint;
    utilizationRatio: number;
  } | null>(null);
  
  // Rate limiting
  const lastTransactionTime = useRef<number>(0);
  const transactionQueue = useRef<(() => Promise<void>)[]>([]);
  const isProcessingQueue = useRef<boolean>(false);
  
  // User's balance
  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
  });

  /**
   * Initialize secure session
   */
  useEffect(() => {
    if (isConnected && address && !currentSession) {
      const sessionId = `session_${address}_${Date.now()}`;
      const newSession: GameSession = {
        sessionId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        totalBets: 0,
        totalWins: 0,
        totalLosses: 0,
        consecutiveLosses: 0,
        isActive: true,
        flags: []
      };
      
      setCurrentSession(newSession);
      console.log('🔐 Secure game session initialized:', sessionId);
    }
  }, [isConnected, address, currentSession]);

  /**
   * Monitor pool status
   */
  useEffect(() => {
    const updatePoolStatus = async () => {
      try {
        const result = await secureContractManager.getPoolStatus();
        if (result.success && result.data) {
          setPoolStatus({
            totalBalance: result.data.totalBalance,
            availableBalance: result.data.availableBalance,
            utilizationRatio: result.data.utilizationRatio
          });
        }
      } catch (error) {
        console.error('Failed to update pool status:', error);
      }
    };

    updatePoolStatus();
    const interval = setInterval(updatePoolStatus, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  /**
   * Session timeout monitoring
   */
  useEffect(() => {
    if (!currentSession || !currentSession.isActive) return;

    const checkTimeout = () => {
      const now = Date.now();
      if (now - currentSession.lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT) {
        setCurrentSession(prev => prev ? { ...prev, isActive: false } : null);
        setGameState('idle');
        setIsTransacting(false);
        toast.error('Session expired for security. Please refresh to continue.');
      }
    };

    const interval = setInterval(checkTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [currentSession]);

  /**
   * Advanced security validation
   */
  const validateSecurity = useCallback(async (
    betAmount: bigint,
    gameType: string
  ): Promise<SecurityValidation> => {
    try {
      // Basic amount validation
      if (betAmount < SECURITY_CONFIG.MIN_BET || betAmount > SECURITY_CONFIG.MAX_BET) {
        return {
          isValid: false,
          reason: 'Bet amount outside allowed range',
          riskLevel: 'medium'
        };
      }

      // Session validation
      if (!currentSession || !currentSession.isActive) {
        return {
          isValid: false,
          reason: 'Invalid or expired session',
          riskLevel: 'high'
        };
      }

      // Rate limiting validation
      const now = Date.now();
      if (now - lastTransactionTime.current < SECURITY_CONFIG.RATE_LIMIT_WINDOW) {
        return {
          isValid: false,
          reason: 'Rate limit exceeded',
          riskLevel: 'medium'
        };
      }

      // Check daily loss limits
      if (address) {
        const lossCheck = await secureContractManager.checkPlayerLossLimits(address);
        if (lossCheck.success && lossCheck.data?.isLimitExceeded) {
          return {
            isValid: false,
            reason: 'Daily loss limit exceeded',
            riskLevel: 'high',
            recommendations: ['Take a break', 'Consider smaller bets']
          };
        }
      }

      // Pattern analysis
      const riskLevel = analyzeRiskPattern(currentSession, betAmount);
      
      // Pool balance validation
      if (poolStatus) {
        const maxPossibleWin = betAmount * 100n; // Assume max 100x multiplier
        if (maxPossibleWin > poolStatus.availableBalance) {
          return {
            isValid: false,
            reason: 'Insufficient pool balance for potential payout',
            riskLevel: 'critical'
          };
        }
      }

      return {
        isValid: true,
        riskLevel
      };
    } catch (error) {
      console.error('Security validation error:', error);
      return {
        isValid: false,
        reason: 'Security validation failed',
        riskLevel: 'critical'
      };
    }
  }, [address, currentSession, poolStatus]);

  /**
   * Place a secure bet with comprehensive validation
   */
  const placeBet = useCallback(async (
    betAmount: number,
    gameType: string,
    gameData?: Record<string, any>
  ): Promise<{ success: boolean; gameId?: string; error?: string }> => {
    if (!address || !isConnected) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (isTransacting) {
      return { success: false, error: 'Transaction already in progress' };
    }

    try {
      setIsTransacting(true);
      setGameState('betting');

      const betAmountWei = parseEther(betAmount.toString());
      
      // Comprehensive security validation
      const securityValidation = await validateSecurity(betAmountWei, gameType);
      if (!securityValidation.isValid) {
        throw new Error(securityValidation.reason || 'Security validation failed');
      }

      // Add security alert for high-risk transactions
      if (securityValidation.riskLevel === 'high' || securityValidation.riskLevel === 'critical') {
        const alertMessage = `High-risk transaction detected: ${securityValidation.reason}`;
        setSecurityAlerts(prev => [...prev, alertMessage]);
        toast.error(alertMessage);
        
        if (securityValidation.riskLevel === 'critical') {
          throw new Error('Transaction blocked for security reasons');
        }
      }

      // Queue transaction to prevent concurrent execution
      return new Promise((resolve) => {
        transactionQueue.current.push(async () => {
          try {
            // Execute the bet through secure contract manager
            const result = await secureContractManager.placeBet(
              address,
              gameType,
              betAmountWei,
              JSON.stringify(gameData || {})
            );

            if (result.success && result.data) {
              // Track transaction
              const transaction: GameTransaction = {
                id: result.data.gameId,
                type: 'bet',
                amount: betAmountWei,
                timestamp: Date.now(),
                status: 'pending',
                hash: result.data.transactionHash,
                gameType,
                metadata: gameData
              };
              
              setTransactions(prev => [...prev, transaction]);
              
              // Update session
              if (currentSession) {
                setCurrentSession(prev => prev ? {
                  ...prev,
                  lastActivity: Date.now(),
                  totalBets: prev.totalBets + 1
                } : null);
              }
              
              lastTransactionTime.current = Date.now();
              setGameState('waiting');
              
              // Monitor transaction
              if (result.data.transactionHash) {
                monitorTransaction(result.data.transactionHash, transaction.id);
              }
              
              resolve({ success: true, gameId: result.data.gameId });
            } else {
              throw new Error(result.error || 'Transaction failed');
            }
          } catch (error: any) {
            console.error('Place bet error:', error);
            setGameState('error');
            resolve({ success: false, error: error.message });
          }
        });
        
        processTransactionQueue();
      });
    } catch (error: any) {
      console.error('Place bet validation error:', error);
      setGameState('error');
      return { success: false, error: error.message };
    } finally {
      setTimeout(() => {
        if (gameState !== 'waiting') {
          setIsTransacting(false);
        }
      }, 1000);
    }
  }, [address, isConnected, currentSession, gameState, isTransacting]); // Simplified to avoid hoisting issues

  /**
   * Process game result with validation
   */
  const processGameResult = useCallback(async (
    gameId: string,
    betAmount: number,
    multiplier: number,
    gameType: string
  ): Promise<{ success: boolean; winAmount?: number; error?: string }> => {
    try {
      if (!address) {
        return { success: false, error: 'Wallet not connected' };
      }

      const betAmountWei = parseEther(betAmount.toString());
      
      // Validate multiplier for suspicious activity
      if (multiplier > SECURITY_CONFIG.SUSPICIOUS_WIN_THRESHOLD) {
        const alert = `Suspicious win multiplier detected: ${multiplier}x`;
        setSecurityAlerts(prev => [...prev, alert]);
        console.warn(alert);
      }

      // Process through secure contract manager
      const result = await secureContractManager.processGameResult(
        address,
        gameId,
        betAmountWei,
        multiplier
      );

      if (result.success && result.data) {
        const winAmountEth = parseFloat(formatEther(result.data.winAmount));
        const won = multiplier > 1;
        
        // Update session statistics
        if (currentSession) {
          setCurrentSession(prev => prev ? {
            ...prev,
            lastActivity: Date.now(),
            totalWins: won ? prev.totalWins + 1 : prev.totalWins,
            totalLosses: won ? prev.totalLosses : prev.totalLosses + 1,
            consecutiveLosses: won ? 0 : prev.consecutiveLosses + 1
          } : null);
        }
        
        // Track payout transaction
        if (won) {
          const payoutTransaction: GameTransaction = {
            id: `payout_${gameId}`,
            type: 'payout',
            amount: result.data.winAmount,
            timestamp: Date.now(),
            status: 'confirmed',
            hash: result.transactionHash,
            gameType,
            multiplier
          };
          
          setTransactions(prev => [...prev, payoutTransaction]);
        }
        
        setGameState('completed');
        
        // Refresh balance
        await refetchBalance();
        
        return { success: true, winAmount: winAmountEth };
      } else {
        throw new Error(result.error || 'Game result processing failed');
      }
    } catch (error: any) {
      console.error('Process game result error:', error);
      setGameState('error');
      return { success: false, error: error.message };
    }
  }, [address, currentSession, refetchBalance]);

  /**
   * Transaction monitoring
   */
  const monitorTransaction = useCallback(async (hash: Hash, transactionId: string) => {
    try {
      const receipt = await secureContractManager.monitorTransaction(hash);
      
      setTransactions(prev => prev.map(tx => 
        tx.id === transactionId 
          ? { ...tx, status: receipt?.status === 'success' ? 'confirmed' : 'failed' }
          : tx
      ));
      
      if (receipt?.status === 'success') {
        toast.success('Transaction confirmed!');
      } else if (receipt?.status === 'reverted') {
        toast.error('Transaction failed');
        setGameState('error');
      }
    } catch (error) {
      console.error('Transaction monitoring error:', error);
    }
  }, []);

  /**
   * Process transaction queue
   */
  const processTransactionQueue = useCallback(async () => {
    if (isProcessingQueue.current || transactionQueue.current.length === 0) {
      return;
    }
    
    isProcessingQueue.current = true;
    
    while (transactionQueue.current.length > 0) {
      const transaction = transactionQueue.current.shift();
      if (transaction) {
        await transaction();
        // Add delay between transactions
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    isProcessingQueue.current = false;
  }, []);

  /**
   * Emergency functions
   */
  const emergencyStop = useCallback(async (): Promise<boolean> => {
    try {
      setGameState('idle');
      setIsTransacting(false);
      
      // Clear transaction queue
      transactionQueue.current = [];
      
      // Deactivate session
      if (currentSession) {
        setCurrentSession(prev => prev ? { ...prev, isActive: false } : null);
      }
      
      toast.error('Emergency stop activated');
      return true;
    } catch (error) {
      console.error('Emergency stop error:', error);
      return false;
    }
  }, [currentSession]);

  /**
   * Reset game state
   */
  const resetGameState = useCallback(() => {
    setGameState('idle');
    setIsTransacting(false);
    setSecurityAlerts([]);
  }, []);

  /**
   * Get formatted balance
   */
  const getFormattedBalance = useCallback(() => {
    return balance ? parseFloat(balance.formatted) : 0;
  }, [balance]);

  /**
   * Get session statistics
   */
  const getSessionStats = useCallback(() => {
    if (!currentSession) return null;
    
    const duration = Date.now() - currentSession.startTime;
    const winRate = currentSession.totalBets > 0 
      ? (currentSession.totalWins / currentSession.totalBets) * 100 
      : 0;
      
    return {
      duration,
      totalBets: currentSession.totalBets,
      totalWins: currentSession.totalWins,
      totalLosses: currentSession.totalLosses,
      winRate,
      consecutiveLosses: currentSession.consecutiveLosses,
      isActive: currentSession.isActive,
      flags: currentSession.flags
    };
  }, [currentSession]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (currentSession) {
        setCurrentSession(prev => prev ? { ...prev, isActive: false } : null);
      }
    };
  }, [currentSession]);

  return {
    // Connection status
    address,
    isConnected,
    balance: getFormattedBalance(),
    
    // Game state
    gameState,
    isTransacting,
    currentSession,
    
    // Pool information
    poolBalance: poolStatus?.totalBalance ? parseFloat(formatEther(poolStatus.totalBalance)) : 0,
    availableBalance: poolStatus?.availableBalance ? parseFloat(formatEther(poolStatus.availableBalance)) : 0,
    poolUtilization: poolStatus?.utilizationRatio || 0,
    
    // Security
    securityAlerts,
    transactions,
    
    // Functions
    placeBet,
    processGameResult,
    resetGameState,
    emergencyStop,
    refetchBalance,
    
    // Statistics
    getSessionStats,
    
    // Validation
    validateSecurity,
    
    // System status
    systemStatus: secureContractManager.getSystemStatus()
  };
}

/**
 * Helper function to analyze risk patterns
 */
function analyzeRiskPattern(session: GameSession, betAmount: bigint): 'low' | 'medium' | 'high' | 'critical' {
  // Check for suspicious patterns
  if (session.consecutiveLosses >= SECURITY_CONFIG.MAX_CONSECUTIVE_LOSSES) {
    return 'high';
  }
  
  if (betAmount > SECURITY_CONFIG.MAX_BET / 2n) {
    return 'medium';
  }
  
  // Check session duration and activity
  const sessionDuration = Date.now() - session.startTime;
  if (sessionDuration < 60000 && session.totalBets > 10) { // More than 10 bets in 1 minute
    return 'high';
  }
  
  return 'low';
}