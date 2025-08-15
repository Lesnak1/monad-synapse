'use client';

import { PriceStream } from '@/components/price-stream';
import Link from 'next/link';

export default function DashboardPage() {
  const quickStats = [
    { label: 'Total Balance', value: '12,542.500 MON', change: '+5.2%', icon: '💰', color: 'text-green-400' },
    { label: 'Today\'s Profit', value: '847.200 MON', change: '+12.1%', icon: '📈', color: 'text-emerald-400' },
    { label: 'Games Played', value: '47', change: '+8', icon: '🎮', color: 'text-blue-400' },
    { label: 'Win Rate', value: '67.2%', change: '+3.1%', icon: '🏆', color: 'text-purple-400' }
  ];

  const recentGames = [
    { game: 'Coin Master', bet: '0.1500 MON', result: 'Win', profit: '+0.3456 MON', time: '2 min ago', multiplier: '2.3x' },
    { game: 'Crash', bet: '0.5000 MON', result: 'Win', profit: '+1.8000 MON', time: '5 min ago', multiplier: '3.6x' },
    { game: 'Plinko', bet: '0.2000 MON', result: 'Loss', profit: '-0.2000 MON', time: '8 min ago', multiplier: '0x' },
    { game: 'Wheel', bet: '0.3000 MON', result: 'Win', profit: '+0.9000 MON', time: '12 min ago', multiplier: '3.0x' },
    { game: 'Mines', bet: '0.1000 MON', result: 'Win', profit: '+0.4000 MON', time: '15 min ago', multiplier: '4.0x' }
  ];

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
        <h1 className="text-2xl sm:text-4xl font-bold text-gradient mb-2">Dashboard</h1>
        <p className="text-white/70 text-sm sm:text-base">Welcome back! Here\'s your gaming overview and live market data.</p>
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
                
                {recentGames.map((game, i) => (
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
                    <div className="text-white/50 text-xs">{game.time}</div>
                  </div>
                ))}
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


