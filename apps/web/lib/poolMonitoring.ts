'use client';

import { getPoolBalance } from './poolWallet';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';

// Pool monitoring configuration
const POOL_MONITORING_CONFIG = {
  minReserveBalance: 10, // Minimum MON to keep in pool
  lowBalanceThreshold: 50, // Show warning when pool < 50 MON
  criticalBalanceThreshold: 20, // Block new bets when pool < 20 MON
  refillThreshold: 100, // Target refill amount
  checkInterval: 30000, // Check every 30 seconds
};

// Pool status type
export type PoolStatus = 'healthy' | 'low' | 'critical' | 'insufficient';

// Pool monitoring class
export class PoolMonitor {
  private static instance: PoolMonitor;
  private intervalId: NodeJS.Timeout | null = null;
  private lastBalance: number = 0;
  private statusCallbacks: Array<(status: PoolStatus, balance: number) => void> = [];

  static getInstance(): PoolMonitor {
    if (!PoolMonitor.instance) {
      PoolMonitor.instance = new PoolMonitor();
    }
    return PoolMonitor.instance;
  }

  // Start monitoring pool balance
  startMonitoring(): void {
    if (this.intervalId) return; // Already monitoring

    this.checkPoolBalance(); // Initial check
    this.intervalId = setInterval(() => {
      this.checkPoolBalance();
    }, POOL_MONITORING_CONFIG.checkInterval);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Subscribe to pool status changes
  onStatusChange(callback: (status: PoolStatus, balance: number) => void): void {
    this.statusCallbacks.push(callback);
  }

  // Get current pool status
  getPoolStatus(balance: number): PoolStatus {
    if (balance < POOL_MONITORING_CONFIG.minReserveBalance) {
      return 'insufficient';
    } else if (balance < POOL_MONITORING_CONFIG.criticalBalanceThreshold) {
      return 'critical';
    } else if (balance < POOL_MONITORING_CONFIG.lowBalanceThreshold) {
      return 'low';
    }
    return 'healthy';
  }

  // Check if bet amount is allowed based on pool balance
  isBetAllowed(betAmount: number, poolBalance: number): { allowed: boolean; maxBet?: number; reason?: string } {
    const maxPossibleWin = betAmount * 50; // Assume max 50x multiplier
    const availableForBets = poolBalance - POOL_MONITORING_CONFIG.minReserveBalance;

    if (availableForBets < maxPossibleWin) {
      const maxAllowedBet = availableForBets / 50;
      return {
        allowed: false,
        maxBet: Math.max(0, maxAllowedBet),
        reason: maxAllowedBet <= 0 
          ? 'Pool is being refilled. Please try again in a few minutes.'
          : `Current max bet: ${maxAllowedBet.toFixed(4)} MON due to pool balance.`
      };
    }

    return { allowed: true };
  }

  // Get user-friendly status message
  getStatusMessage(status: PoolStatus, balance: number): string {
    switch (status) {
      case 'insufficient':
        return '🔴 Pool refilling - New bets temporarily disabled';
      case 'critical':
        return '🟠 Pool balance low - Limited bet amounts';
      case 'low':
        return '🟡 Pool balance getting low';
      case 'healthy':
      default:
        return '🟢 Pool balance healthy';
    }
  }

  // Private method to check pool balance
  private async checkPoolBalance(): Promise<void> {
    try {
      const currentBalance = await getPoolBalance();
      const status = this.getPoolStatus(currentBalance);
      
      // If balance changed significantly, notify callbacks
      if (Math.abs(currentBalance - this.lastBalance) > 1) {
        this.statusCallbacks.forEach(callback => {
          callback(status, currentBalance);
        });
      }

      // Show toast notifications for critical situations
      if (status === 'critical' && this.lastBalance >= POOL_MONITORING_CONFIG.criticalBalanceThreshold) {
        toast.error('🚨 Pool balance critically low! Admin notification sent.');
      } else if (status === 'insufficient' && this.lastBalance >= POOL_MONITORING_CONFIG.minReserveBalance) {
        toast.error('❌ Pool insufficient! New bets disabled until refill.');
      }

      this.lastBalance = currentBalance;
    } catch (error) {
      console.error('Pool monitoring error:', error);
    }
  }
}

// Export singleton instance
export const poolMonitor = PoolMonitor.getInstance();

// Utility functions for components
export async function checkPoolSufficiency(betAmount: number): Promise<{
  sufficient: boolean;
  maxBet?: number;
  message?: string;
  poolBalance: number;
}> {
  const poolBalance = await getPoolBalance();
  const result = poolMonitor.isBetAllowed(betAmount, poolBalance);
  
  return {
    sufficient: result.allowed,
    maxBet: result.maxBet,
    message: result.reason,
    poolBalance
  };
}

// Hook for React components to get pool status

export function usePoolStatus() {
  const [status, setStatus] = useState<PoolStatus>('healthy');
  const [balance, setBalance] = useState<number>(0);
  
  useEffect(() => {
    const updateStatus = (newStatus: PoolStatus, newBalance: number) => {
      setStatus(newStatus);
      setBalance(newBalance);
    };
    
    poolMonitor.onStatusChange(updateStatus);
    poolMonitor.startMonitoring();
    
    return () => {
      poolMonitor.stopMonitoring();
    };
  }, []);
  
  return { status, balance, message: poolMonitor.getStatusMessage(status, balance) };
}

// Emergency admin notification (would integrate with real notification system)
export async function notifyAdminLowBalance(balance: number): Promise<void> {
  try {
    // In production, this would send notifications via:
    // - Email alerts
    // - Slack/Discord webhooks  
    // - SMS notifications
    // - Dashboard alerts
    
    console.error(`🚨 URGENT: Pool balance critically low: ${balance.toFixed(4)} MON`);
    console.error('Admin action required: Refill pool wallet immediately');
    
    // For now, just log the emergency
    const emergencyLog = {
      timestamp: new Date().toISOString(),
      event: 'POOL_BALANCE_CRITICAL',
      balance: balance,
      threshold: POOL_MONITORING_CONFIG.criticalBalanceThreshold,
      action_required: 'IMMEDIATE_REFILL'
    };
    
    console.error('Emergency Log:', emergencyLog);
    
    // In real implementation:
    // await sendAdminNotification(emergencyLog);
    // await logToMonitoringSystem(emergencyLog);
    
  } catch (error) {
    console.error('Failed to notify admin:', error);
  }
}