import Link from 'next/link';

export const metadata = {
  title: 'About - Monad Synapse',
  description: 'Learn about Monad Synapse, the premier decentralized casino gaming platform built on Monad blockchain.',
};

export const viewport = {
  themeColor: '#8b5cf6',
  colorScheme: 'dark',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">About MonCas (Monad Synapse)</h1>
          <p className="text-white/70 text-lg">The Future of Decentralized Gaming</p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Mission */}
          <section className="casino-card">
            <h2 className="text-2xl font-bold text-white mb-6">🚀 Our Mission</h2>
            <p className="text-white/80 text-lg leading-relaxed mb-4">
              Monad Synapse is revolutionizing the crypto gaming landscape by bringing you the most 
              thrilling and fair casino experience on the Monad blockchain. We combine cutting-edge 
              technology with classic casino games to create an unparalleled gaming platform.
            </p>
            <p className="text-white/80 text-lg leading-relaxed">
              Our mission is to provide a transparent, secure, and entertaining environment where 
              players can enjoy their favorite casino games while experiencing the benefits of 
              blockchain technology.
            </p>
          </section>

          {/* Why Monad */}
          <section className="casino-card">
             <h2 className="text-2xl font-bold text-white mb-6">⚡ Why Monad Testnet?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-xl p-6">
                <div className="text-3xl mb-3">🌪️</div>
                <h3 className="text-xl font-bold text-white mb-2">Ultra-Fast Transactions</h3>
                <p className="text-white/70">
                  Monad's parallel execution provides lightning-fast transaction speeds, 
                  ensuring instant deposits and withdrawals.
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-6">
                <div className="text-3xl mb-3">💰</div>
                <h3 className="text-xl font-bold text-white mb-2">Low Fees</h3>
                <p className="text-white/70">
                  Enjoy minimal transaction costs, allowing you to maximize your gaming 
                  experience without worrying about high fees.
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-6">
                <div className="text-3xl mb-3">🔒</div>
                <h3 className="text-xl font-bold text-white mb-2">Provably Fair</h3>
                <p className="text-white/70">
                  All games are transparently verifiable on the blockchain, ensuring 
                  complete fairness and trustworthiness.
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-6">
                <div className="text-3xl mb-3">🌍</div>
                <h3 className="text-xl font-bold text-white mb-2">Global Access</h3>
                <p className="text-white/70">
                   Play from anywhere in the world with just your crypto wallet - 
                  no KYC, no barriers, just pure gaming fun.
                </p>
              </div>
            </div>
          </section>

          {/* Games */}
          <section className="casino-card">
            <h2 className="text-2xl font-bold text-white mb-6">🎮 Our Games</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🪙</div>
                <h3 className="text-lg font-bold text-white mb-2">Coin Master</h3>
                <p className="text-white/70 text-sm">Classic slot machine with exciting multipliers</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📈</div>
                <h3 className="text-lg font-bold text-white mb-2">Crash</h3>
                <p className="text-white/70 text-sm">Watch the multiplier rise and cash out before it crashes</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">💎</div>
                <h3 className="text-lg font-bold text-white mb-2">Mines</h3>
                <p className="text-white/70 text-sm">Navigate the minefield to find hidden gems</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🎲</div>
                <h3 className="text-lg font-bold text-white mb-2">Plinko</h3>
                <p className="text-white/70 text-sm">Drop the ball and watch it bounce to fortune</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🎲</div>
                <h3 className="text-lg font-bold text-white mb-2">Dice</h3>
                <p className="text-white/70 text-sm">Roll the dice and predict the outcome</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🎡</div>
                <h3 className="text-lg font-bold text-white mb-2">Roulette</h3>
                <p className="text-white/70 text-sm">Classic European roulette with crypto twist</p>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="casino-card">
            <h2 className="text-2xl font-bold text-white mb-6">🛡️ Security & Fairness</h2>
            <div className="space-y-4 text-white/80">
              <div className="flex items-start gap-4">
                <div className="text-green-400 text-xl">✓</div>
                <div>
                  <h3 className="font-bold text-white mb-1">Blockchain Verification</h3>
                  <p>All game results are recorded on the Monad blockchain for full transparency.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-green-400 text-xl">✓</div>
                <div>
                   <h3 className="font-bold text-white mb-1">Smart Contract Security</h3>
                   <p>OpenZeppelin best‑practices, Foundry tests, Slither static checks, TWAP oracles.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-green-400 text-xl">✓</div>
                <div>
                  <h3 className="font-bold text-white mb-1">Non-Custodial</h3>
                  <p>You maintain full control of your wallet and funds at all times.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-green-400 text-xl">✓</div>
                <div>
                  <h3 className="font-bold text-white mb-1">Responsible Gaming</h3>
                  <p>We promote responsible gaming with built-in betting limits and cool-down periods.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Team */}
          <section className="casino-card">
            <h2 className="text-2xl font-bold text-white mb-6">👥 Our Team</h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Monad Synapse is built by a team of passionate developers and gaming enthusiasts 
              who believe in the power of decentralized technology. We're committed to creating 
              the best crypto gaming experience while maintaining the highest standards of 
              security and fairness.
            </p>
          </section>

          {/* Call to Action */}
          <section className="text-center py-8">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Play?</h2>
            <p className="text-white/70 mb-6">Join thousands of players enjoying the future of crypto gaming</p>
            <Link href="/games" className="neon-button text-lg px-8 py-4">
              Start Playing Now
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}