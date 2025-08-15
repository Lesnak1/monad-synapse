'use client';

import { useAccount, useBalance, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { useState, useEffect, useCallback } from 'react';
import { getPoolBalance, sendFromPool, POOL_WALLET_ADDRESS, validateBet, poolManager } from './poolWallet';
import { securityAuditor } from './securityAudit';
import { transactionMonitor } from './transactionMonitor';
// Security functions removed for testing - to be re-implemented with server-side validation
import { toast } from 'react-hot-toast';

export function useGameContract() {
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [gameState, setGameState] = useState<'idle' | 'betting' | 'waiting' | 'completed'>('idle');
  const [isTransacting, setIsTransacting] = useState(false);
  const [currentPoolBalance, setCurrentPoolBalance] = useState(0);
  
  // User's MON token balance
  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
  });

  // Fetch pool balance
  useEffect(() => {
    const fetchPoolBalance = async () => {
      const poolBal = await getPoolBalance();
      setCurrentPoolBalance(poolBal);
    };
    
    fetchPoolBalance();
    const interval = setInterval(fetchPoolBalance, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const placeBet = useCallback(async (betAmount: number, gameType: string) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    // Check if transaction is already in progress
    if (isTransacting) {
      toast.error('Please wait for previous transaction to complete');
      return false;
    }

    // Enhanced validation with security audit
    if (!address || betAmount <= 0) {
      throw new Error('Invalid bet parameters');
    }
    
    // Perform security validation
    const betValidation = await validateBet(betAmount, address);
    if (!betValidation.valid) {
      throw new Error(betValidation.error || 'Bet validation failed');
    }
    
    // Security level warnings
    if (betValidation.securityLevel === 'high' || betValidation.securityLevel === 'critical') {
      toast.error(`High-risk bet detected. Security level: ${betValidation.securityLevel}`);
    }
    
    if (betValidation.requiresMultiSig) {
      toast('Large bet requires multi-signature approval');
    }

    // Critical: Check pool balance before accepting bet
    const poolBal = await getPoolBalance();
    const maxPossibleWin = betAmount * 50; // Assume max 50x multiplier possible
    const minReserveBalance = 10;
    
    if (poolBal - minReserveBalance < maxPossibleWin) {
      toast.error(`Pool temporarily low. Max bet: ${((poolBal - minReserveBalance) / 50).toFixed(4)} MON`);
      throw new Error('Pool balance insufficient for this bet size');
    }
    
    try {
      setIsTransacting(true);
      setGameState('betting');
      
      // Enhanced transaction tracking with security monitoring
      const transactionId = transactionMonitor.createTransaction(
        address,
        POOL_WALLET_ADDRESS,
        parseEther(betAmount.toString()),
        '0x',
        { 
          strategy: 'standard',
          priority: 'medium' as const,
          timeout: 120000 // 2 minutes
        },
        {
          gameType,
          playerAddress: address,
          betAmount: parseEther(betAmount.toString()),
          expectedOutcome: 'unknown'
        }
      );
      
      // Add minimal delay to prevent rapid-fire betting
      await new Promise(resolve => setTimeout(resolve, 150));

      // On-chain bet accounting: send native MON to pool wallet
      if (!POOL_WALLET_ADDRESS) throw new Error('Pool wallet not configured');
      
      // Execute transaction with monitoring
      const txHash = await sendTransactionAsync({ 
        to: POOL_WALLET_ADDRESS, 
        value: parseEther(betAmount.toString())
      });
      
      // Submit transaction for monitoring
      await transactionMonitor.submitTransaction(transactionId, txHash);

      setGameState('waiting');
      
      // Refresh balances
      await refetchBalance();
      const newPoolBalance = await getPoolBalance();
      setCurrentPoolBalance(newPoolBalance);
      
      return true;
    } catch (error) {
      setGameState('idle');
      
      
      
      throw error;
    } finally {
      setIsTransacting(false);
    }
  }, [address, isConnected, refetchBalance, sendTransactionAsync, isTransacting]);

  const payoutWin = useCallback(async (winAmount: number, gameType: string) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      setIsTransacting(true);
      
      // Validate win amount
      if (winAmount <= 0 || winAmount > 1000) {
        throw new Error('Invalid win amount');
      }
      
      // Check current pool balance before payout
      const poolBal = await getPoolBalance();
      if (poolBal < winAmount + 5) { // Need winAmount + 5 MON buffer
        toast.error('Pool refilling. Winnings secured, will be processed shortly.');
        throw new Error('Insufficient pool balance for payout');
      }
      
      // Add delay to prevent transaction conflicts
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create transaction for monitoring
      const payoutTransactionId = transactionMonitor.createTransaction(
        POOL_WALLET_ADDRESS,
        address,
        parseEther(winAmount.toString()),
        '0x',
        {
          strategy: 'aggressive', // Higher priority for payouts
          priority: 'high',
          timeout: 180000 // 3 minutes
        },
        {
          gameType,
          playerAddress: address,
          betAmount: parseEther(winAmount.toString()),
          expectedOutcome: 'win'
        }
      );
      
      // Send winnings from pool to player with enhanced retry logic
      let success = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!success && attempts < maxAttempts) {
        try {
          success = await sendFromPool(address, winAmount, gameType, 'high'); // High priority for payouts
          if (success) {
            console.log(`✅ Payout successful on attempt ${attempts + 1}`);
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Payout attempt ${attempts + 1} failed:`, error);
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          const delay = 2000 * attempts; // Exponential backoff
          console.log(`🔄 Retrying payout in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      if (!success) {
        throw new Error('Payout transaction failed after multiple attempts');
      }
      
      // payout recorded
      
      // Complete game tracking with verification
      
      // Lock ID removed
      
      // Session update removed for testing
      
      setGameState('completed');
      
      // Refresh balances
      await refetchBalance();
      const newPoolBalance = await getPoolBalance();
      setCurrentPoolBalance(newPoolBalance);
      
      return true;
    } catch (error) {
      
      
      
      throw error;
    } finally {
      setIsTransacting(false);
    }
  }, [address, isConnected, refetchBalance]);

  const getFormattedBalance = () => {
    return balance ? parseFloat(balance.formatted) : 0;
  };

  const finalizeRound = useCallback(async (gameType: string) => {
    if (!address) return;
    try {
      // Run quick security check after game rounds
      const quickCheck = await securityAuditor.runQuickCheck();
      if (quickCheck.overallStatus === 'critical') {
        console.error('🚨 Critical security issues detected!');
        toast.error('Security check failed. Please contact support.');
      } else if (quickCheck.overallStatus === 'warning') {
        console.warn('⚠️ Security issues detected:', quickCheck);
      }
      
      setGameState('idle');
      setIsTransacting(false);
      
      // Refresh balances after round ends
      await refetchBalance();
      const newPoolBalance = await getPoolBalance();
      setCurrentPoolBalance(newPoolBalance);
      
      // Update pool statistics
      const poolStats = await poolManager.getPoolStatistics();
      console.log('📊 Pool Statistics:', poolStats);
      
    } catch (error) {
      console.error('Finalize round error:', error);
    }
  }, [address, refetchBalance]);

  const resetGameState = useCallback(() => {
    if (address) {
      
      setIsTransacting(false);
      setGameState('idle');
    }
  }, [address]);

  // Reset game state after transaction completion
  useEffect(() => {
    if (gameState === 'completed') {
      const timer = setTimeout(() => {
        setGameState('idle');
        // Force cleanup transaction state
        if (address) {
          // Lock ID removed
          
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState, address]);

  // Force cleanup on unmount or address change
  useEffect(() => {
    return () => {
      if (address) {
        
        setIsTransacting(false);
        setGameState('idle');
      }
    };
  }, [address]);

  return {
    address,
    isConnected,
    balance: getFormattedBalance(),
    poolBalance: currentPoolBalance,
    gameState,
    isTransacting,
    placeBet,
    payoutWin,
    finalizeRound,
    resetGameState,
    refetchBalance,
    poolWalletAddress: POOL_WALLET_ADDRESS,
  };
}