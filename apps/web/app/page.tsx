import Link from 'next/link';
import { HeroParticles } from '@/components/hero-particles';

export default function Page() {
  return (
    <main className="relative overflow-hidden">
      {/* Enhanced Background with Monad-themed gradients */}
      <div className="fixed inset-0">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-black/40 animate-gradient-x"></div>
        
        {/* Monad-themed geometric patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-purple-500 rounded-full animate-spin-slow"></div>
          <div className="absolute top-3/4 right-1/4 w-24 h-24 border-2 border-blue-400 rounded-lg transform rotate-45 animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/3 w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-bounce"></div>
        </div>
        
        {/* Enhanced particles */}
        <HeroParticles />
      </div>
      
      {/* Hero Section - Enhanced */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left space-y-6 sm:space-y-8 z-10">
            {/* Enhanced title with better animations */}
            <div className="space-y-2">
              <div className="text-sm sm:text-base font-medium text-purple-400 tracking-wider uppercase mb-4 animate-fade-in">
                ⚡ Lightning Fast • 🔒 Provably Fair • 💫 Monad Powered
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
                <span className="text-white animate-fade-in-up">The Future of</span><br/>
                <span className="text-gradient bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient-text">
                  Casino Gaming
                </span><br/>
                <span className="text-white animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                  on Monad
                </span>
              </h1>
            </div>
            
            <p className="text-white/80 text-lg sm:text-xl max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-fade-in-up" style={{animationDelay: '0.6s'}}>
              Experience next-generation casino gaming with <span className="text-purple-400 font-semibold">instant transactions</span>, 
              <span className="text-blue-400 font-semibold"> ultra-low fees</span>, and 
              <span className="text-pink-400 font-semibold"> provably fair</span> gameplay on the Monad blockchain.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{animationDelay: '0.9s'}}>
              <Link href="/games" className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <span className="relative text-lg">🎰 Start Playing Now</span>
              </Link>
              
              <Link href="/about" className="group border-2 border-purple-500/50 hover:border-purple-400 text-white hover:text-purple-300 font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:bg-purple-500/10 hover:shadow-lg hover:shadow-purple-500/25">
                <span className="text-lg">📖 Learn More</span>
              </Link>
            </div>
          </div>
          
          {/* Enhanced right side with 3D-style gaming elements */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Main gaming orb with enhanced effects */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                <div className="relative text-8xl sm:text-9xl floating-orb z-10 filter drop-shadow-2xl">🎰</div>
              </div>
              
              {/* Orbiting elements */}
              <div className="absolute inset-0 animate-spin-slow">
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-3xl sm:text-4xl">💎</div>
                <div className="absolute top-1/2 -right-8 transform -translate-y-1/2 text-3xl sm:text-4xl">🎲</div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-3xl sm:text-4xl">⚡</div>
                <div className="absolute top-1/2 -left-8 transform -translate-y-1/2 text-3xl sm:text-4xl">🪙</div>
              </div>
              
              {/* Additional floating elements */}
              <div className="absolute top-0 right-8 text-2xl floating-orb opacity-80" style={{animationDelay: '1s'}}>🔥</div>
              <div className="absolute bottom-8 left-8 text-2xl floating-orb opacity-80" style={{animationDelay: '2s'}}>💫</div>
              <div className="absolute top-16 left-16 text-xl floating-orb opacity-60" style={{animationDelay: '1.5s'}}>✨</div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="text-white/60 text-center">
            <div className="text-sm mb-2">Scroll to explore</div>
            <div className="w-6 h-10 border-2 border-white/30 rounded-full mx-auto">
              <div className="w-1 h-3 bg-white/60 rounded-full mx-auto mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Play on Monad Testnet</h2>
            <p className="text-white/70 text-sm sm:text-base max-w-2xl mx-auto">
              Experience lightning-fast gaming with MON tokens on the Monad blockchain. 
              Low gas fees, instant transactions, and provably fair gameplay.
            </p>
          </div>

          {/* Featured Games - Enhanced */}
           <div className="text-center mb-8 sm:mb-12">
             <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
               <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                 Featured Games
               </span>
             </h2>
             <p className="text-white/70 text-lg max-w-2xl mx-auto">
               Discover our collection of <span className="text-purple-400 font-semibold">provably fair</span> casino games powered by Monad blockchain
             </p>
           </div>
          
          {/* Original Games */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 mb-8">
            {[
              { name: 'COIN MASTER', icon: '🪙', color: 'from-amber-500 via-yellow-500 to-orange-500', category: 'Classic' },
              { name: 'MINES', icon: '💎', color: 'from-emerald-500 via-teal-500 to-cyan-500', category: 'Strategy' },
              { name: 'CRASH', icon: '📈', color: 'from-green-500 via-emerald-500 to-teal-500', category: 'Multiplier' },
              { name: 'PLINKO', icon: '🎲', color: 'from-purple-500 via-indigo-500 to-blue-500', category: 'Luck' },
              { name: 'KENO', icon: '🎰', color: 'from-pink-500 via-rose-500 to-red-500', category: 'Numbers' },
              { name: 'DICE', icon: '🎲', color: 'from-cyan-500 via-blue-500 to-indigo-500', category: 'Classic' }
            ].map((game, i) => (
              <Link key={i} href={`/games/${game.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`} 
                    className={`group relative casino-card text-center bg-gradient-to-br ${game.color} hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer p-4 sm:p-6 block overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="text-3xl sm:text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300">{game.icon}</div>
                  <div className="text-white font-bold text-xs sm:text-sm mb-1">{game.name}</div>
                  <div className="text-white/70 text-xs">{game.category}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* New Games Section */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                🆕 <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">New Games</span>
              </h3>
              <p className="text-white/60">Fresh additions to our gaming collection</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
              {[
                { name: 'SWEET BONANZA', icon: '🍭', color: 'from-pink-500 via-red-500 to-rose-500', category: 'Slots', isNew: true },
                { name: 'DIAMONDS', icon: '💎', color: 'from-blue-500 via-cyan-500 to-teal-500', category: 'Puzzle', isNew: true },
                { name: 'SLIDE', icon: '🎯', color: 'from-orange-500 via-amber-500 to-yellow-500', category: 'Skill', isNew: true },
                { name: 'BURNING WINS', icon: '🔥', color: 'from-red-500 via-orange-500 to-amber-500', category: 'Slots', isNew: true },
              ].map((game, i) => (
                <Link key={i} href={`/games/${game.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`} 
                      className={`group relative casino-card text-center bg-gradient-to-br ${game.color} hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer p-4 sm:p-6 block overflow-hidden`}>
                  {game.isNew && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                      NEW
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                  <div className="relative z-10">
                    <div className="text-3xl sm:text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300">{game.icon}</div>
                    <div className="text-white font-bold text-xs sm:text-sm mb-1">{game.name}</div>
                    <div className="text-white/70 text-xs">{game.category}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <Link href="/games" className="neon-button inline-block">View All Games</Link>
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-transparent to-blue-900/10"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="mb-12 sm:mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-white">Why Choose </span>
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Monad Synapse?
              </span>
            </h2>
            <p className="text-white/70 text-lg sm:text-xl max-w-3xl mx-auto">
              Built on the fastest blockchain, designed for the ultimate gaming experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { 
                icon: '⚡', 
                title: 'Lightning Fast', 
                subtitle: 'Transactions', 
                desc: 'Sub-second finality on Monad blockchain with 10,000+ TPS', 
                color: 'from-yellow-500 via-orange-500 to-red-500',
                accent: 'border-yellow-500/30 hover:border-yellow-400/50'
              },
              { 
                icon: '💸', 
                title: 'Ultra Low', 
                subtitle: 'Gas Fees', 
                desc: 'Enjoy gaming without worrying about transaction costs', 
                color: 'from-blue-500 via-cyan-500 to-teal-500',
                accent: 'border-blue-500/30 hover:border-blue-400/50'
              },
              { 
                icon: '🛡️', 
                title: 'Provably', 
                subtitle: 'Fair Gaming', 
                desc: 'Transparent algorithms with cryptographic verification', 
                color: 'from-green-500 via-emerald-500 to-teal-500',
                accent: 'border-green-500/30 hover:border-green-400/50'
              },
              { 
                icon: '🔐', 
                title: 'Anonymous', 
                subtitle: 'No KYC', 
                desc: 'Connect wallet and start playing instantly with privacy', 
                color: 'from-purple-500 via-indigo-500 to-blue-500',
                accent: 'border-purple-500/30 hover:border-purple-400/50'
              }
            ].map((feature, i) => (
              <div key={i} className={`group relative casino-card bg-gradient-to-br ${feature.color} ${feature.accent} hover:scale-105 transform transition-all duration-300 overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                <div className="relative z-10 text-center">
                  <div className="text-4xl sm:text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-2">{feature.title}</div>
                  <div className="text-xl text-white/90 font-semibold mb-3">{feature.subtitle}</div>
                  <div className="text-white/70 text-sm sm:text-base leading-relaxed">{feature.desc}</div>
                </div>
                
                {/* Glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional stats */}
          <div className="mt-16 sm:mt-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {[
                { value: '10,000+', label: 'TPS', desc: 'Transactions per second' },
                { value: '<1s', label: 'Finality', desc: 'Transaction confirmation' },
                { value: '$0.01', label: 'Gas Fees', desc: 'Average transaction cost' },
                { value: '99.9%', label: 'Uptime', desc: 'Network reliability' }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-white font-semibold text-lg mb-1">{stat.label}</div>
                  <div className="text-white/60 text-sm">{stat.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works - Enhanced */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        {/* Enhanced background with particles */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-blue-900/10"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/6 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-pink-400 rounded-full animate-ping"></div>
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="mb-12 sm:mb-16">
            <div className="text-sm font-medium text-purple-400 tracking-wider uppercase mb-4 animate-fade-in">
              ⚡ Simple Process
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-white">How </span>
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient-text">
                It Works
              </span>
            </h2>
            <p className="text-white/70 text-lg sm:text-xl max-w-2xl mx-auto">
              Start playing in just <span className="text-purple-400 font-semibold">3 simple steps</span> and experience the future of gaming
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {[
              { 
                icon: '🔗', 
                title: 'Connect Wallet', 
                desc: 'Connect your Web3 wallet to Monad testnet and get MON tokens from the faucet.',
                step: '01',
                color: 'from-blue-500 to-cyan-500'
              },
              { 
                icon: '🎰', 
                title: 'Choose Game', 
                desc: 'Select from our collection of provably fair casino games with transparent algorithms.',
                step: '02',
                color: 'from-purple-500 to-pink-500'
              },
              { 
                icon: '⚡', 
                title: 'Play & Win', 
                desc: 'Enjoy instant transactions with minimal fees. Wins are paid out immediately to your wallet.',
                step: '03',
                color: 'from-green-500 to-teal-500'
              }
            ].map((step, i) => (
              <div key={i} className="group relative">
                {/* Step number background */}
                <div className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center text-white font-bold text-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300`}>
                  {step.step}
                </div>
                
                {/* Enhanced card */}
                <div className="casino-card-monad text-center h-full relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10">
                    <div className={`text-5xl sm:text-6xl mb-4 transform group-hover:scale-110 transition-all duration-300 filter drop-shadow-lg`}>
                      {step.icon}
                    </div>
                    <h4 className="text-xl sm:text-2xl font-bold text-white mb-4 group-hover:text-purple-300 transition-colors duration-300">
                      {step.title}
                    </h4>
                    <p className="text-white/70 text-sm sm:text-base leading-relaxed group-hover:text-white/90 transition-colors duration-300">
                      {step.desc}
                    </p>
                  </div>
                  
                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${step.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`}></div>
                </div>
                
                {/* Connection line (for desktop) */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 w-12 h-0.5 bg-gradient-to-r from-purple-500/50 to-transparent"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Enhanced */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        {/* Dramatic background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-pink-900/10 to-blue-900/20"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/5 to-transparent"></div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-6 h-6 bg-purple-500 rounded-full animate-pulse opacity-30"></div>
          <div className="absolute top-3/4 right-1/3 w-4 h-4 bg-blue-400 rounded-full animate-bounce opacity-40"></div>
          <div className="absolute bottom-1/4 left-2/3 w-8 h-8 bg-pink-500 rounded-full animate-ping opacity-20"></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="relative">
            {/* Enhanced main card with multiple layers */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-3xl blur-xl"></div>
            <div className="relative casino-card-monad bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-blue-900/40 border-2 border-purple-500/40 p-8 sm:p-12 overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 left-4 w-16 h-16 border-2 border-purple-400 rounded-full"></div>
                <div className="absolute bottom-4 right-4 w-12 h-12 border border-blue-400 rounded-lg rotate-45"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-pink-400 rounded-full opacity-50"></div>
              </div>
              
              <div className="relative z-10">
                {/* Enhanced rocket animation */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                  <div className="relative text-6xl sm:text-8xl floating-orb filter drop-shadow-2xl">🚀</div>
                </div>
                
                <div className="mb-6">
                  <div className="text-sm font-medium text-purple-400 tracking-wider uppercase mb-4 animate-fade-in">
                    🎯 Ready for Launch
                  </div>
                  <h2 className="text-4xl sm:text-6xl font-bold mb-4">
                    <span className="text-white">Ready to </span>
                    <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient-text">
                      Play?
                    </span>
                  </h2>
                  <p className="text-white/80 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
                    Connect your wallet and start winning with <span className="text-purple-400 font-semibold">MON tokens</span> on 
                    <span className="text-blue-400 font-semibold"> Monad Synapse</span>! 
                    Experience the future of <span className="text-pink-400 font-semibold">decentralized gaming</span>.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/games" className="group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 text-white font-bold text-lg px-10 py-5 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    <span className="relative flex items-center gap-2">
                      🎮 Start Playing Now
                      <span className="text-2xl group-hover:translate-x-1 transition-transform duration-300">→</span>
                    </span>
                  </Link>
                  
                  <Link href="/about" className="group border-2 border-purple-500/50 hover:border-purple-400 text-white hover:text-purple-300 font-bold text-lg px-8 py-5 rounded-2xl transition-all duration-300 hover:bg-purple-500/10 hover:shadow-lg hover:shadow-purple-500/25 flex items-center gap-2">
                    📚 Learn More
                  </Link>
                </div>
                
                {/* Stats row */}
                <div className="mt-10 pt-8 border-t border-white/10">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { value: '10+', label: 'Games Available' },
                      { value: '<1s', label: 'Transaction Speed' },
                      { value: '99%', label: 'Provably Fair' },
                      { value: '$0.01', label: 'Gas Fees' }
                    ].map((stat, i) => (
                      <div key={i} className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-1">
                          {stat.value}
                        </div>
                        <div className="text-white/60 text-sm">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Community Section - Enhanced */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 via-transparent to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
        </div>
        
        {/* Constellation effect */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute top-1/4 left-1/5 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-300 rounded-full animate-ping"></div>
          <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-pink-400 rounded-full animate-bounce"></div>
          <div className="absolute bottom-1/4 right-1/5 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="text-sm font-medium text-purple-400 tracking-wider uppercase mb-4 animate-fade-in">
              🌟 Join the Revolution
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-white">Join the </span>
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient-text">
                Monad Synapse
              </span>
              <span className="text-white"> Community</span>
            </h2>
            <p className="text-white/70 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed">
              Be part of the future of <span className="text-purple-400 font-semibold">decentralized gaming</span> on the 
              <span className="text-blue-400 font-semibold"> fastest blockchain</span> in the world
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Community Features */}
            <div className="space-y-6">
              {[
                {
                  icon: '⚡',
                  title: 'Lightning Fast Gaming',
                  desc: 'Experience sub-second finality with 10,000+ TPS on Monad',
                  color: 'from-yellow-500 to-orange-500'
                },
                {
                  icon: '🛡️',
                  title: 'Provably Fair',
                  desc: 'Every game result is verifiable and transparent on-chain',
                  color: 'from-green-500 to-emerald-500'
                },
                {
                  icon: '💎',
                  title: 'Premium Rewards',
                  desc: 'Earn MON tokens and exclusive NFT rewards for active players',
                  color: 'from-purple-500 to-pink-500'
                },
                {
                  icon: '🔐',
                  title: 'Anonymous & Secure',
                  desc: 'No KYC required - connect wallet and start playing instantly',
                  color: 'from-blue-500 to-cyan-500'
                }
              ].map((feature, i) => (
                <div key={i} className="group flex items-start gap-4 casino-card-monad p-6 hover:scale-105 transition-all duration-300">
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center text-white text-xl font-bold group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-purple-300 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 text-sm group-hover:text-white/90 transition-colors">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Main CTA Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl blur-xl"></div>
              <div className="relative casino-card-monad bg-gradient-to-br from-purple-900/40 via-pink-900/20 to-blue-900/30 border-2 border-purple-500/40 text-center p-8 lg:p-10 h-full flex flex-col justify-center">
                {/* Animated community icon */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-2xl animate-pulse"></div>
                  <div className="relative text-6xl lg:text-7xl floating-orb filter drop-shadow-2xl">🌟</div>
                </div>
                
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                  Ready to <span className="text-gradient">Join</span>?
                </h3>
                <p className="text-white/80 mb-8 text-sm lg:text-base">
                  Connect your wallet and become part of the most innovative gaming platform on Monad. 
                  Start with <span className="text-purple-400 font-semibold">free MON tokens</span> from our faucet!
                </p>
                
                <div className="space-y-4">
                  <Link href="/games" className="w-full group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    <span className="relative flex items-center justify-center gap-2">
                      🎮 Start Playing Now
                    </span>
                  </Link>
                  
                  <Link href="/about" className="w-full group border-2 border-purple-500/50 hover:border-purple-400 text-white hover:text-purple-300 font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:bg-purple-500/10 hover:shadow-lg hover:shadow-purple-500/25 inline-block">
                    📚 Learn About Monad
                  </Link>
                </div>
                
                {/* Quick stats */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gradient">10+</div>
                      <div className="text-white/60 text-xs">Games</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gradient">24/7</div>
                      <div className="text-white/60 text-xs">Available</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}