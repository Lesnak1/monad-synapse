'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export interface UserStats {
  totalBalance: string;
  todayProfit: string;
  todayProfitChange: string;
  gamesPlayed: number;
  gamesPlayedChange: number;
  winRate: number;
  winRateChange: number;
  recentGames: Array<{
    game: string;
    bet: string;
    result: 'Win' | 'Loss';
    profit: string;
    multiplier: string;
    timestamp: number;
    timeAgo: string;
  }>;
}

export function useUserStats() {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem('authToken');
    const expiry = localStorage.getItem('authExpiry');
    
    if (token && expiry && Date.now() > parseInt(expiry)) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authExpiry');
      localStorage.removeItem('authAddress');
      return null;
    }
    
    return token;
  }, []);

  const fetchStats = useCallback(async () => {
    if (!isConnected || !address) {
      setStats(null);
      setError(null);
      return;
    }

    const authToken = getAuthToken();
    if (!authToken) {
      setError('Authentication required - Please connect wallet and sign message');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📊 Fetching user statistics...');
      
      const response = await fetch('/api/user/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user statistics');
      }

      console.log('✅ User statistics loaded:', result.data);
      setStats(result.data);
    } catch (err: any) {
      console.error('❌ Failed to fetch user statistics:', err);
      setError(err.message || 'Failed to load statistics');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, getAuthToken]);

  // Fetch stats when wallet connects or address changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Refresh stats every 30 seconds
  useEffect(() => {
    if (!isConnected || !address) return;
    
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchStats, isConnected, address]);

  const refreshStats = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refreshStats,
    isConnected,
    address
  };
}