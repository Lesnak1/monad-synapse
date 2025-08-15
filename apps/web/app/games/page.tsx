import Link from 'next/link';

export default function GamesPage() {
  const games = [
    { name: 'COIN MASTER', icon: '🪙', color: 'from-blue-500 to-purple-600', category: 'Strategy' },
    { name: 'SPIN WIN', icon: '🎰', color: 'from-pink-500 to-red-500', category: 'Slots' },
    { name: 'WHEEL', icon: '🎡', color: 'from-yellow-500 to-orange-500', category: 'Wheel' },
    { name: 'CRYPTO', icon: '₿', color: 'from-orange-500 to-red-600', category: 'Crypto' },
    { name: 'CRASH', icon: '📈', color: 'from-green-500 to-teal-500', category: 'Crash' },
    { name: 'PLINKO', icon: '🎲', color: 'from-purple-500 to-pink-500', category: 'Plinko' },
    { name: 'MINES', icon: '💎', color: 'from-emerald-500 to-cyan-500', category: 'Strategy' },
    { name: 'SWEET BONANZA', icon: '🍭', color: 'from-pink-400 to-purple-500', category: 'Slots' },
    { name: 'DIAMONDS', icon: '💎', color: 'from-blue-400 to-indigo-600', category: 'Gems' },
    { name: 'SLIDE', icon: '🎯', color: 'from-teal-500 to-blue-600', category: 'Action' },
    { name: 'KENO', icon: '🎱', color: 'from-green-400 to-emerald-600', category: 'Numbers' },
    { name: 'HI-LO', icon: '🎴', color: 'from-red-500 to-pink-600', category: 'Cards' },
    { name: 'LIMBO', icon: '🚀', color: 'from-purple-600 to-blue-700', category: 'Crash' },
    { name: 'KENO', icon: '⚡', color: 'from-yellow-400 to-orange-600', category: 'Lightning' },
    { name: 'TOWER', icon: '🗼', color: 'from-indigo-500 to-purple-600', category: 'Tower' },
    { name: 'BURNING WINS', icon: '🔥', color: 'from-red-600 to-orange-700', category: 'Hot' },
    { name: 'MINES', icon: '⛏️', color: 'from-gray-600 to-slate-700', category: 'Mining' },
    { name: 'DICE', icon: '🎲', color: 'from-blue-500 to-cyan-600', category: 'Dice' }
  ];

  const categories = ['All', 'Live Games', 'Slots', 'Table Games', 'Originals', 'Game Shows', 'Virtual Sports', 'Others'];

  return (
    <main className="min-h-screen pt-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Games</h1>
            <nav className="text-white/60 text-sm">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-2">›</span>
              <span className="text-white">Games</span>
            </nav>
          </div>
          <div className="text-4xl sm:text-6xl floating-orb">🏆</div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
          {categories.map((category, i) => (
            <button
              key={i}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                i === 0 
                  ? 'neon-button' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search Games"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400 text-sm sm:text-base"
            />
            <span className="absolute right-3 top-3 text-white/60">🔍</span>
          </div>
          <div className="text-3xl sm:text-4xl floating-orb">💰</div>
        </div>
      </div>

      {/* Games Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {games.map((game, i) => (
            <Link
              key={i}
              href={`/games/${game.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
              className={`casino-card text-center bg-gradient-to-br ${game.color} hover:scale-105 transition-all cursor-pointer group relative overflow-hidden p-3 sm:p-6 block`}
            >
              {/* Game Icon */}
              <div className="text-2xl sm:text-4xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                {game.icon}
              </div>
              
              {/* Game Name */}
              <div className="text-white font-semibold text-xs sm:text-sm mb-1 sm:mb-2">
                {game.name}
              </div>
              
              {/* Category */}
              <div className="text-white/70 text-xs">
                {game.category}
              </div>
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="neon-button text-xs sm:text-sm px-3 sm:px-4 py-2">
                  Play Now
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Load more */}
        <div className="text-center mt-8 sm:mt-12">
          <button className="neon-button px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base">
            Load More Games
          </button>
        </div>
      </section>

      {/* Promo Section */}
      <section className="py-8 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="casino-card bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 text-center p-6 sm:p-8 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-3 sm:mb-4">Drop & Win | Live Casino</h2>
              <h3 className="text-2xl sm:text-4xl font-bold text-gradient mb-3 sm:mb-4">Play with MON on Monad</h3>
              <div className="text-3xl sm:text-6xl font-bold text-yellow-400 mb-3 sm:mb-4">500,000 MON</div>
              <p className="text-white/70 mb-4 sm:mb-6 text-sm sm:text-base">Prizes 15 Days 7 Hrs 26 Min</p>
              <button className="neon-button px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base">
                Deposit and Play
              </button>
            </div>
            
            {/* Floating elements */}
            <div className="absolute top-2 sm:top-4 right-4 sm:right-8 text-2xl sm:text-4xl floating-orb opacity-50">
              🎰
            </div>
            <div className="absolute bottom-2 sm:bottom-4 left-4 sm:left-8 text-xl sm:text-3xl floating-orb opacity-50" style={{animationDelay: '1s'}}>
              💎
            </div>
          </div>
        </div>
      </section>

      {/* Latest Bets */}
      <section className="py-8 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8">
            <div className="mb-4 sm:mb-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Latest Winners</h2>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Latest Bets</h3>
              <p className="text-white/60 mt-2 text-sm sm:text-base">More and more winners are added every day! So you can be the next to the list!</p>
            </div>
            <div className="text-4xl sm:text-6xl floating-orb">🏆</div>
          </div>
          
          <div className="casino-card">
            <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
              <button className="neon-button px-3 sm:px-4 py-2 text-xs sm:text-sm">ALL BETS</button>
              <button className="text-white/60 hover:text-white px-3 sm:px-4 py-2 text-xs sm:text-sm">HIGH ROLLER</button>
              <button className="text-white/60 hover:text-white px-3 sm:px-4 py-2 text-xs sm:text-sm">RARE WINS</button>
            </div>
            
            <div className="space-y-3">
              {[
                { user: 'Tom Ryan', game: 'Coin Master', bet: '0.00000734', multiplier: '1.502x', win: '0', avatar: '👤' },
                { user: 'Karl Day', game: 'Plinko', bet: '0.00000734', multiplier: '2.01x', win: '0', avatar: '👤' },
                { user: 'Jim Arnold', game: 'Wheel', bet: '0.00000734', multiplier: '14.08x', win: '0', avatar: '👤' },
                { user: 'Ann Clark', game: 'Crash', bet: '0.00000734', multiplier: '7.27x', win: '0', avatar: '👤' },
                { user: 'Sergio Ray', game: 'Mines', bet: '0.00000734', multiplier: '6.24x', win: '0', avatar: '👤' },
                { user: 'Tom Berry', game: 'Sweet Bonanza', bet: '0.00000734', multiplier: '7.03x', win: '0', avatar: '👤' },
                { user: 'Bruce Ryan', game: 'Plinko', bet: '0.00000734', multiplier: '4.83x', win: '0', avatar: '👤' },
                { user: 'Allen Ray', game: 'Limbo', bet: '0.00000734', multiplier: '4.16x', win: '0', avatar: '👤' },
                { user: 'Lenny Ray', game: 'Dice', bet: '0.00000734', multiplier: '5.76x', win: '0', avatar: '👤' }
              ].map((bet, i) => (
                <div key={i} className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between py-3 border-b border-white/10 gap-2 sm:gap-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-lg sm:text-2xl">{bet.avatar}</span>
                    <span className="text-white font-medium text-sm sm:text-base">{bet.user}</span>
                  </div>
                  <div className="text-white/70 text-xs sm:text-base sm:hidden">{bet.game}</div>
                  <div className="hidden sm:block text-white/70">{bet.game}</div>
                  <div className="text-white/70 text-xs sm:text-base">{bet.bet}</div>
                  <div className="text-green-400 text-xs sm:text-base">{bet.multiplier}</div>
                  <div className="text-white font-bold text-sm sm:text-base">{bet.win}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Email Signup */}
      <section className="py-8 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="casino-card bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 text-center p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">To Get Exclusive Benefits</h2>
            <p className="text-white/70 mb-6 text-sm sm:text-base">Enter your email address</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email address"
                className="flex-1 px-4 py-3 rounded-xl sm:rounded-l-xl sm:rounded-r-none bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400"
              />
              <button className="neon-button rounded-xl sm:rounded-l-none px-6 py-3">→</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}