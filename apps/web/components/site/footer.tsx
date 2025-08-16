import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-black/20 border-t border-white/10 py-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link 
              href="/" 
              className="font-display text-xl font-bold cursor-pointer block hover:opacity-80 transition-opacity"
            >
              <span className="text-gradient flex items-center gap-2">
                🎰 MonCas (Monad Synapse)
              </span>
            </Link>
            <p className="text-white/60 mt-4 text-sm">
              The future of decentralized gaming on Monad blockchain. Experience provably fair casino games with instant rewards.
            </p>
            <div className="flex gap-4 mt-6">
              <a 
                href="https://discord.gg/monadsynapse" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors cursor-pointer block p-2 rounded-lg hover:bg-white/10 active:bg-white/20 touch-manipulation" 
                aria-label="Discord"
              >
                <span className="text-xl">💬</span>
              </a>
              <a 
                href="https://twitter.com/monadsynapse" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors cursor-pointer block p-2 rounded-lg hover:bg-white/10 active:bg-white/20 touch-manipulation" 
                aria-label="Twitter"
              >
                <span className="text-xl">🐦</span>
              </a>
              <a 
                href="https://t.me/monadsynapse" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors cursor-pointer block p-2 rounded-lg hover:bg-white/10 active:bg-white/20 touch-manipulation" 
                aria-label="Telegram"
              >
                <span className="text-xl">📱</span>
              </a>
              <a 
                href="https://github.com/Lesnak1/monad-synapse" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors cursor-pointer block p-2 rounded-lg hover:bg-white/10 active:bg-white/20 touch-manipulation" 
                aria-label="GitHub"
              >
                <span className="text-xl">⚡</span>
              </a>
            </div>
          </div>

          {/* Games */}
          <div>
            <h3 className="text-white font-semibold mb-4">🎮 Casino Games</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/games/coin-master" 
                  className="text-white/60 hover:text-white transition-colors block py-1 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 active:bg-white/10 touch-manipulation"
                >
                  🪙 Coin Master
                </Link>
              </li>
              <li>
                <Link 
                  href="/games/crash" 
                  className="text-white/60 hover:text-white transition-colors block py-1 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 active:bg-white/10 touch-manipulation"
                >
                  📈 Crash
                </Link>
              </li>
              <li>
                <Link 
                  href="/games/mines" 
                  className="text-white/60 hover:text-white transition-colors block py-1 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 active:bg-white/10 touch-manipulation"
                >
                  💎 Mines
                </Link>
              </li>
              <li>
                <Link 
                  href="/games/plinko" 
                  className="text-white/60 hover:text-white transition-colors block py-1 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 active:bg-white/10 touch-manipulation"
                >
                  🎲 Plinko
                </Link>
              </li>
              <li>
                <Link 
                  href="/games/dice" 
                  className="text-white/60 hover:text-white transition-colors block py-1 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 active:bg-white/10 touch-manipulation"
                >
                  🎲 Dice
                </Link>
              </li>
              <li>
                <Link 
                  href="/games/wheel" 
                  className="text-white/60 hover:text-white transition-colors block py-1 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 active:bg-white/10 touch-manipulation"
                >
                  🎡 Roulette
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">📞 Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/about" 
                  className="text-white/60 hover:text-white transition-colors block py-1 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 active:bg-white/10 touch-manipulation"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/support" 
                  className="text-white/60 hover:text-white transition-colors block py-1 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 active:bg-white/10 touch-manipulation"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="text-white/60 hover:text-white transition-colors block py-1 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 active:bg-white/10 touch-manipulation"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-white/60 hover:text-white transition-colors block py-1 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 active:bg-white/10 touch-manipulation"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  href="/games" 
                  className="text-white/60 hover:text-white transition-colors block py-1 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 active:bg-white/10 touch-manipulation"
                >
                  All Games
                </Link>
              </li>
            </ul>
          </div>

          {/* Blockchain Info */}
          <div>
            <h3 className="text-white font-semibold mb-4">⚡ Blockchain</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/80 font-medium">Network</div>
                <div className="text-purple-400">Monad Testnet</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/80 font-medium">Chain ID</div>
                <div className="text-green-400">10143</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/80 font-medium">Token</div>
                <div className="text-yellow-400">MON</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-white/60 text-sm">
            © 2024 Monad Synapse. All rights reserved. Built for decentralized gaming.
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <span className="text-white/60 text-sm">Powered by</span>
            <a
              href="https://github.com/Lesnak1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gradient font-bold cursor-pointer hover:opacity-80 transition-opacity"
            >
              ⚡ Leknax
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}