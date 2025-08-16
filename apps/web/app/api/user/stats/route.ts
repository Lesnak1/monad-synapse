import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { parseEther, formatEther } from 'viem';
import { z } from 'zod';

// User statistics interface
interface UserStats {
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

// Mock database simulation for development
const mockUserStats: Record<string, UserStats> = {};

// Helper function to format time ago
function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// Helper function to generate realistic user stats
function generateUserStats(address: string): UserStats {
  // Check if we already have stats for this user
  if (mockUserStats[address]) {
    return mockUserStats[address];
  }

  // Generate realistic but varied stats for each user
  const seed = address.slice(-4); // Use last 4 chars as seed for consistency
  const seedNum = parseInt(seed, 16) || 1;
  
  // Generate base values with some randomness but consistency per user
  const baseBalance = 10 + (seedNum % 50); // 10-60 MON base
  const todayChange = (seedNum % 30) - 15; // -15 to +15 MON change
  const gamesCount = 10 + (seedNum % 40); // 10-50 games
  const winCount = Math.floor(gamesCount * (0.45 + (seedNum % 25) / 100)); // 45-70% win rate
  
  const stats: UserStats = {
    totalBalance: baseBalance.toFixed(3),
    todayProfit: Math.abs(todayChange).toFixed(3),
    todayProfitChange: todayChange > 0 ? `+${(todayChange / baseBalance * 100).toFixed(1)}%` : `${(todayChange / baseBalance * 100).toFixed(1)}%`,
    gamesPlayed: gamesCount,
    gamesPlayedChange: Math.floor(seedNum % 10),
    winRate: (winCount / gamesCount * 100),
    winRateChange: (seedNum % 10) - 5, // -5 to +5% change
    recentGames: []
  };

  // Generate recent games with realistic data
  const gameTypes = ['Coin Master', 'Crash', 'Plinko', 'Mines', 'Dice', 'Sweet Bonanza', 'Burning Wins'];
  const now = Date.now();
  
  for (let i = 0; i < 5; i++) {
    const isWin = Math.random() < (stats.winRate / 100);
    const betAmount = 0.01 + Math.random() * 0.5; // 0.01-0.5 MON
    const multiplier = isWin ? 1 + Math.random() * 4 : 0; // 0-5x multiplier
    const profit = isWin ? betAmount * multiplier - betAmount : -betAmount;
    const timestamp = now - (i * 5 * 60 * 1000) - Math.random() * 300000; // 5min intervals with some randomness
    
    stats.recentGames.push({
      game: gameTypes[Math.floor(Math.random() * gameTypes.length)],
      bet: betAmount.toFixed(4) + ' MON',
      result: isWin ? 'Win' : 'Loss',
      profit: (profit >= 0 ? '+' : '') + profit.toFixed(4) + ' MON',
      multiplier: multiplier > 0 ? `${multiplier.toFixed(1)}x` : '0x',
      timestamp,
      timeAgo: timeAgo(timestamp)
    });
  }

  // Cache the generated stats
  mockUserStats[address] = stats;
  return stats;
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 User stats API called');
    
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }

    // Get user address from session
    const userAddress = 'address' in authResult.user ? authResult.user.address : null;
    if (!userAddress) {
      return NextResponse.json({
        success: false,
        error: 'User address not found in session',
        code: 'ADDRESS_MISSING'
      }, { status: 400 });
    }

    console.log('✅ Generating stats for user:', userAddress);
    
    // In production, this would query the database for real user statistics
    // For now, generate realistic stats based on user address
    const userStats = generateUserStats(userAddress);
    
    return NextResponse.json({
      success: true,
      data: userStats,
      userAddress,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('User stats API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}