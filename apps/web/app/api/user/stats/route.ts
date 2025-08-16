import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { parseEther, formatEther } from 'viem';
import { z } from 'zod';
import { getUserGameHistory } from '@/lib/gameStats';

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

// Function to calculate real user stats from game history
function calculateUserStats(address: string): UserStats {
  const userGames = getUserGameHistory(address);
  
  if (userGames.length === 0) {
    // Return empty stats for new users
    return {
      totalBalance: '0.000',
      todayProfit: '0.000',
      todayProfitChange: '0%',
      gamesPlayed: 0,
      gamesPlayedChange: 0,
      winRate: 0,
      winRateChange: 0,
      recentGames: []
    };
  }

  // Calculate total profit/loss
  const totalProfit = userGames.reduce((sum, game) => sum + (game.winAmount - game.betAmount), 0);
  
  // Calculate today's profit (last 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const todayGames = userGames.filter(game => game.timestamp > oneDayAgo);
  const todayProfit = todayGames.reduce((sum, game) => sum + (game.winAmount - game.betAmount), 0);
  
  // Calculate yesterday's profit for comparison
  const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
  const yesterdayGames = userGames.filter(game => game.timestamp > twoDaysAgo && game.timestamp <= oneDayAgo);
  const yesterdayProfit = yesterdayGames.reduce((sum, game) => sum + (game.winAmount - game.betAmount), 0);
  
  const profitChange = yesterdayProfit !== 0 ? ((todayProfit - yesterdayProfit) / Math.abs(yesterdayProfit) * 100) : 0;
  
  // Calculate win rate
  const wins = userGames.filter(game => game.isWin).length;
  const winRate = userGames.length > 0 ? (wins / userGames.length * 100) : 0;
  
  // Calculate yesterday's win rate for comparison
  const yesterdayWins = yesterdayGames.filter(game => game.isWin).length;
  const yesterdayWinRate = yesterdayGames.length > 0 ? (yesterdayWins / yesterdayGames.length * 100) : 0;
  const winRateChange = winRate - yesterdayWinRate;
  
  // Get recent games (last 10)
  const recentGames = userGames
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
    .map(game => ({
      game: formatGameName(game.gameType),
      bet: `${game.betAmount.toFixed(4)} MON`,
      result: game.isWin ? 'Win' as const : 'Loss' as const,
      profit: `${game.isWin ? '+' : ''}${(game.winAmount - game.betAmount).toFixed(4)} MON`,
      multiplier: game.multiplier > 0 ? `${game.multiplier.toFixed(1)}x` : '0x',
      timestamp: game.timestamp,
      timeAgo: timeAgo(game.timestamp)
    }));

  return {
    totalBalance: Math.max(0, totalProfit).toFixed(3),
    todayProfit: Math.abs(todayProfit).toFixed(3),
    todayProfitChange: profitChange >= 0 ? `+${profitChange.toFixed(1)}%` : `${profitChange.toFixed(1)}%`,
    gamesPlayed: userGames.length,
    gamesPlayedChange: todayGames.length,
    winRate: winRate,
    winRateChange: winRateChange,
    recentGames: recentGames
  };
}

// Helper to format game names
function formatGameName(gameType: string): string {
  const gameNames: Record<string, string> = {
    'tower': 'Tower',
    'limbo': 'Limbo',
    'crash': 'Crash',
    'sweet-bonanza': 'Sweet Bonanza',
    'spin-win': 'Spin Win',
    'slots': 'Slots',
    'slide': 'Slide',
    'dice': 'Dice',
    'mines': 'Mines',
    'plinko': 'Plinko',
    'coin-flip': 'Coin Flip'
  };
  
  return gameNames[gameType] || gameType;
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

    console.log('✅ Calculating real stats for user:', userAddress);
    
    // Calculate real user statistics from game history
    const userStats = calculateUserStats(userAddress);
    
    console.log('📈 User stats calculated:', {
      gamesPlayed: userStats.gamesPlayed,
      winRate: userStats.winRate,
      totalProfit: userStats.totalBalance
    });
    
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