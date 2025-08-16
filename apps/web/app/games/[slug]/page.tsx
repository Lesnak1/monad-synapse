import Link from 'next/link';
// Secure versions to avoid transaction failed errors
import { CoinMasterSecureGame } from '@/components/games/coin-master-secure';
import { DiceSecureGame } from '@/components/games/dice-secure';
import { CrashSecureGame } from '@/components/games/crash-secure';
import { MinesSecureGame } from '@/components/games/mines-secure';
// Old versions (using useGameContract - may cause transaction failed)
import { PlinkoGame } from '@/components/games/plinko';
import { WheelGame } from '@/components/games/wheel';
import { SpinWinGame } from '@/components/games/spin-win';
import { LimboGame } from '@/components/games/limbo';
import { KenoGame } from '@/components/games/keno';
import { HiLoGame } from '@/components/games/hi-lo';
import { TowerGame } from '@/components/games/tower';

interface GamePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;

  const getGameComponent = () => {
    switch (slug) {
      case 'coin-master':
        return <CoinMasterSecureGame />;
      case 'dice':
        return <DiceSecureGame />;
      case 'crash':
        return <CrashSecureGame />;
      case 'mines':
        return <MinesSecureGame />;
      // These games still use old versions (may cause transaction failed)
      case 'plinko':
        return <PlinkoGame />;
      case 'wheel':
        return <WheelGame />;
      case 'spin-win':
        return <SpinWinGame />;
      case 'limbo':
        return <LimboGame />;
      case 'keno':
        return <KenoGame />;
      case 'hi-lo':
        return <HiLoGame />;
      case 'tower':
        return <TowerGame />;
      default:
        return (
          <div className="casino-card text-center p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Game Coming Soon!</h2>
            <p className="text-white/70 mb-6">This game is currently under development.</p>
            <Link href="/games" className="neon-button px-6 py-3">
              Back to Games
            </Link>
          </div>
        );
    }
  };

  const getGameTitle = () => {
    switch (slug) {
      case 'coin-master':
        return '🪙 Coin Master';
      case 'crash':
        return '📈 Crash';
      case 'mines':
        return '💎 Mines';
      case 'plinko':
        return '🎲 Plinko';
      case 'dice':
        return '🎲 Dice';
      case 'wheel':
        return '🎡 Wheel';
      case 'spin-win':
        return '🎰 Spin Win';
      case 'limbo':
        return '🚀 Limbo';
      case 'keno':
        return '🎱 Keno';
      case 'hi-lo':
        return '🎴 Hi-Lo';
      case 'tower':
        return '🗼 Tower';
      default:
        return `🎮 ${slug.charAt(0).toUpperCase() + slug.slice(1)}`;
    }
  };

  return (
    <main className="min-h-screen pt-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">{getGameTitle()}</h1>
            <nav className="text-white/60 text-sm">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-2">›</span>
              <Link href="/games" className="hover:text-white">Games</Link>
              <span className="mx-2">›</span>
              <span className="text-white">{getGameTitle()}</span>
            </nav>
          </div>
          <div className="text-4xl sm:text-6xl floating-orb">🎰</div>
        </div>
      </div>

      {/* Game Container */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Component */}
          <div className="lg:col-span-2">
            {getGameComponent()}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Popular Games */}
            <div className="casino-card">
              <h3 className="text-xl font-bold text-white mb-4">Popular Games</h3>
              <div className="space-y-3">
                {[
                  { name: 'Coin Master', icon: '🪙', players: '1,234' },
                  { name: 'Crash', icon: '📈', players: '987' },
                  { name: 'Plinko', icon: '🎲', players: '756' },
                  { name: 'Wheel', icon: '🎡', players: '643' }
                ].map((game, i) => (
                  <Link 
                    key={i}
                    href={`/games/${game.name.toLowerCase().replace(' ', '-')}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{game.icon}</span>
                      <div>
                        <div className="text-white font-medium text-sm">{game.name}</div>
                        <div className="text-white/60 text-xs">{game.players} playing</div>
                      </div>
                    </div>
                    <button className="text-green-400 text-sm hover:text-green-300">
                      Play
                    </button>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Winners */}
            <div className="casino-card">
              <h3 className="text-xl font-bold text-white mb-4">Recent Winners</h3>
              <div className="space-y-3">
                 {[
                   { user: '0xA1...93f2', win: '0.0345 MON', game: 'Coin Master' },
                   { user: '0x77...1288', win: '0.0189 MON', game: 'Crash' },
                   { user: '0xCC...09ad', win: '0.4567 MON', game: 'Plinko' },
                   { user: '0x31...beef', win: '0.1234 MON', game: 'Wheel' }
                 ].map((winner, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-white text-sm font-medium">{winner.user}</div>
                      <div className="text-white/60 text-xs">{winner.game}</div>
                    </div>
                    <div className="text-green-400 font-bold text-sm">{winner.win}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Stats */}
            <div className="casino-card">
              <h3 className="text-xl font-bold text-white mb-4">Today's Stats</h3>
              <div className="space-y-4">
                {[
                   { label: 'Total Bets', value: '2,847', icon: '🎲' },
                   { label: 'Total Winnings', value: '4,567.890 MON', icon: '💰' },
                   { label: 'Biggest Win', value: '123.400 MON', icon: '🏆' },
                  { label: 'Active Players', value: '892', icon: '👥' }
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{stat.icon}</span>
                      <span className="text-white/70 text-sm">{stat.label}</span>
                    </div>
                    <span className="text-white font-bold">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Similar Games */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8">Similar Games</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'MINES', icon: '💎', color: 'from-emerald-500 to-cyan-500' },
              { name: 'PLINKO', icon: '🎲', color: 'from-purple-500 to-pink-500' },
              { name: 'WHEEL', icon: '🎡', color: 'from-yellow-500 to-orange-500' },
              { name: 'LIMBO', icon: '🚀', color: 'from-purple-600 to-blue-700' },
              { name: 'DICE', icon: '🎲', color: 'from-blue-500 to-cyan-600' },
              { name: 'KENO', icon: '🎱', color: 'from-green-400 to-emerald-600' }
            ].map((game, i) => (
              <Link
                key={i}
                href={`/games/${game.name.toLowerCase()}`}
                className={`casino-card text-center bg-gradient-to-br ${game.color} hover:scale-105 transition-all cursor-pointer p-4`}
              >
                <div className="text-3xl mb-2">{game.icon}</div>
                <div className="text-white font-semibold text-sm">{game.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}