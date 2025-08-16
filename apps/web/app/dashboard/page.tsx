'use client';

import { PriceStream } from '@/components/price-stream';
import { useUserStats } from '@/lib/useUserStats';
import { useWalletAuth } from '@/lib/useWalletAuth';
import Link from 'next/link';

export default function DashboardPage() {
  const { stats, isLoading, error, refreshStats } = useUserStats();
  const { isConnected, isAuthenticated, authenticate } = useWalletAuth();

  // Show authentication prompt if not connected/authenticated
  if (!isConnected || !isAuthenticated) {
    return (
      <main className="min-h-screen pt-8 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="casino-card p-8">
            <div className="text-6xl mb-4">🎮</div>
            <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
            <p className="text-white/70 mb-6">
              Connect your wallet and sign the authentication message to view your personal gaming dashboard.
            </p>
            {isConnected && !isAuthenticated && (
              <button 
                onClick={authenticate}
                className="neon-button w-full py-3"
              >
                Authenticate Wallet
              </button>
            )}
            {!isConnected && (
              <p className="text-white/50 text-sm">
                Use the wallet button in the navigation to connect.
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Show loading state
  if (isLoading && !stats) {
    return (
      <main className="min-h-screen pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className="text-2xl sm:text-4xl font-bold text-gradient mb-8">Dashboard</h1>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="casino-card p-6 animate-pulse">
                <div className="h-8 bg-white/10 rounded mb-3"></div>
                <div className="h-6 bg-white/10 rounded mb-2"></div>
                <div className="h-4 bg-white/10 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Show error state
  if (error && !stats) {
    return (
      <main className="min-h-screen pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="casino-card p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-4">Failed to Load Dashboard</h2>
            <p className="text-white/70 mb-6">{error}</p>
            <button 
              onClick={refreshStats}
              className="neon-button px-6 py-3"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Default stats while loading or if no stats available
  const quickStats = stats ? [
    { 
      label: 'Total Balance', 
      value: `${stats.totalBalance} MON`, 
      change: stats.todayProfitChange, 
      icon: '💰', 
      color: stats.todayProfitChange.startsWith('+') ? 'text-green-400' : 'text-red-400' 
    },
    { 
      label: 'Today\'s Profit', 
      value: `${stats.todayProfit} MON`, 
      change: stats.todayProfitChange, 
      icon: '📈', 
      color: stats.todayProfitChange.startsWith('+') ? 'text-emerald-400' : 'text-red-400' 
    },
    { 
      label: 'Games Played', 
      value: `${stats.gamesPlayed}`, 
      change: stats.gamesPlayedChange > 0 ? `+${stats.gamesPlayedChange}` : `${stats.gamesPlayedChange}`, 
      icon: '🎮', 
      color: 'text-blue-400' 
    },
    { 
      label: 'Win Rate', 
      value: `${stats.winRate.toFixed(1)}%`, 
      change: stats.winRateChange > 0 ? `+${stats.winRateChange.toFixed(1)}%` : `${stats.winRateChange.toFixed(1)}%`, 
      icon: '🏆', 
      color: stats.winRateChange >= 0 ? 'text-purple-400' : 'text-red-400' 
    }
  ] : [
    { label: 'Total Balance', value: '0.000 MON', change: '0%', icon: '💰', color: 'text-gray-400' },
    { label: 'Today\'s Profit', value: '0.000 MON', change: '0%', icon: '📈', color: 'text-gray-400' },
    { label: 'Games Played', value: '0', change: '0', icon: '🎮', color: 'text-gray-400' },
    { label: 'Win Rate', value: '0%', change: '0%', icon: '🏆', color: 'text-gray-400' }
  ];

  const recentGames = stats?.recentGames || [];

  const topGames = [
    { name: 'COIN MASTER', icon: '🪙', players: '1,234', jackpot: '12,500 MON' },
    { name: 'CRASH', icon: '📈', players: '987', jackpot: '8,200 MON' },
    { name: 'PLINKO', icon: '🎲', players: '756', jackpot: '5,700 MON' },
    { name: 'WHEEL', icon: '🎡', players: '643', jackpot: '4,100 MON' }
  ];

  return (
    <main className="min-h-screen pt-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6 sm:mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gradient mb-2">Dashboard</h1>
            <p className="text-white/70 text-sm sm:text-base">Welcome back! Here\'s your personal gaming overview and live market data.</p>
          </div>
          <button 
            onClick={refreshStats}
            disabled={isLoading}
            className="neon-button px-4 py-2 text-sm disabled:opacity-50"
          >
            {isLoading ? '🔄' : '↻'} Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6 sm:space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {quickStats.map((stat, i) => (
            <div key={i} className="casino-card p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-lg sm:text-2xl">{stat.icon}</span>
                <span className={`text-xs sm:text-sm font-medium ${stat.color}`}>{stat.change}</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-white/70 text-xs sm:text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Games */}
          <div className="lg:col-span-2">
            <div className="casino-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Recent Games</h2>
                <Link href="/games" className="text-green-400 text-sm hover:text-green-300">
                  View All
                </Link>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-6 gap-4 text-white/70 text-sm font-semibold border-b border-white/10 pb-3">
                  <div>GAME</div>
                  <div>BET</div>
                  <div>RESULT</div>
                  <div>PROFIT</div>
                  <div>MULTIPLIER</div>
                  <div>TIME</div>
                </div>
                
                {recentGames.length > 0 ? recentGames.map((game, i) => (
                  <div key={i} className="grid grid-cols-6 gap-4 items-center py-3 border-b border-white/10">
                    <div className="text-white font-medium">{game.game}</div>
                    <div className="text-white/70">{game.bet}</div>
                    <div className={`font-semibold ${
                      game.result === 'Win' ? 'text-green-400' : 'text-red-400'
                    }`}>{game.result}</div>
                    <div className={`font-bold ${
                      game.profit.startsWith('+') ? 'text-green-400' : 'text-red-400'
                    }`}>{game.profit}</div>
                    <div className="text-white/70">{game.multiplier}</div>
                    <div className="text-white/50 text-xs">{game.timeAgo}</div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-white/70">
                    <div className="text-4xl mb-4">🎮</div>
                    <p>No games played yet</p>
                    <Link href="/games" className="text-green-400 hover:text-green-300 text-sm">
                      Start playing to see your history
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Games */}
          <div>
            <div className="casino-card mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Top Games</h3>
              <div className="space-y-4">
                {topGames.map((game, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{game.icon}</span>
                      <div>
                        <div className="text-white font-medium text-sm">{game.name}</div>
                        <div className="text-white/60 text-xs">{game.players} playing</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-400 font-bold text-sm">{game.jackpot}</div>
                      <div className="text-white/60 text-xs">Jackpot</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 neon-button py-3">
                Play Now
              </button>
            </div>

            {/* Quick Actions */}
            <div className="casino-card">
              <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/games" className="casino-card bg-gradient-to-br from-blue-600/50 to-purple-700/50 text-center p-4 hover:scale-105 transition-all">
                  <div className="text-2xl mb-2">🎮</div>
                  <div className="text-white text-sm font-medium">Play Games</div>
                </Link>
                <Link href="/lottery" className="casino-card bg-gradient-to-br from-green-600/50 to-emerald-700/50 text-center p-4 hover:scale-105 transition-all">
                  <div className="text-2xl mb-2">🎫</div>
                  <div className="text-white text-sm font-medium">Buy Lottery</div>
                </Link>
                <button className="casino-card bg-gradient-to-br from-yellow-600/50 to-orange-700/50 text-center p-4 hover:scale-105 transition-all">
                  <div className="text-2xl mb-2">💳</div>
                  <div className="text-white text-sm font-medium">Deposit</div>
                </button>
                <button className="casino-card bg-gradient-to-br from-pink-600/50 to-red-700/50 text-center p-4 hover:scale-105 transition-all">
                  <div className="text-2xl mb-2">💸</div>
                  <div className="text-white text-sm font-medium">Withdraw</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Price Data */}
        <div className="casino-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Live Market Data</h2>
            <div className="text-green-400 text-sm">🔄 Real-time</div>
          </div>
          <PriceStream />
        </div>

        {/* Achievements */}
        <div className="casino-card">
          <h2 className="text-xl font-bold text-white mb-6">Recent Achievements</h2>
          <div className="grid md:grid-cols-3 gap-6">
              {[
              { title: 'High Roller', desc: 'Bet over 50 MON in a single game', icon: '👑', unlocked: true },
              { title: 'Lucky Streak', desc: 'Win 5 games in a row', icon: '🍀', unlocked: true },
              { title: 'Jackpot Hunter', desc: 'Win a jackpot prize', icon: '🏆', unlocked: false }
            ].map((achievement, i) => (
              <div key={i} className={`casino-card text-center ${achievement.unlocked ? 'border-yellow-500/30' : 'opacity-60'}`}>
                <div className="text-4xl mb-3">{achievement.icon}</div>
                <div className="text-white font-bold mb-2">{achievement.title}</div>
                <div className="text-white/60 text-sm">{achievement.desc}</div>
                {achievement.unlocked && (
                  <div className="mt-3 text-green-400 text-xs font-medium">✓ UNLOCKED</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}


