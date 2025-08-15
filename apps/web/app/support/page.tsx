export default function SupportPage() {
  return (
    <main className="min-h-screen pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Support Center</h1>
          <p className="text-white/70">Get help with your Monad Synapse gaming experience</p>
        </div>

        {/* Quick Help */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="casino-card">
            <h2 className="text-2xl font-bold text-white mb-4">🚀 Quick Start Guide</h2>
            <div className="space-y-3 text-white/80">
              <div className="flex items-start gap-3">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                <p>Connect your crypto wallet (MetaMask, Phantom, or Backpack)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                <p>Ensure you're connected to Monad Testnet (Chain ID: 10143)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                <p>Get MON testnet tokens from faucet if needed</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                <p>Choose a game and start playing with 0.1-5 MON bets</p>
              </div>
            </div>
          </div>

          <div className="casino-card">
            <h2 className="text-2xl font-bold text-white mb-4">⚡ Common Issues</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-1">Wallet won't connect?</h3>
                <p className="text-white/70 text-sm">Make sure your wallet extension is installed and unlocked</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Wrong network?</h3>
                <p className="text-white/70 text-sm">Switch to Monad Testnet in your wallet settings</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Transaction failed?</h3>
                <p className="text-white/70 text-sm">Check your MON balance and gas fees</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Game not loading?</h3>
                <p className="text-white/70 text-sm">Try refreshing the page or clearing browser cache</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="casino-card mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">❓ Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">What is Monad Testnet?</h3>
              <p className="text-white/80">
                Monad Testnet is a high-performance blockchain designed for parallel execution. 
                It offers fast transactions and low fees, making it perfect for gaming applications.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Are the games fair?</h3>
              <p className="text-white/80">
                Yes! All our games use provably fair algorithms. Results are generated using 
                blockchain-verifiable random number generation, ensuring complete transparency.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">What are the betting limits?</h3>
              <p className="text-white/80">
                You can bet between 0.1 and 5.0 MON tokens per game. These limits promote 
                responsible gaming while allowing for exciting gameplay.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">How do I get MON testnet tokens?</h3>
              <p className="text-white/80">
                MON testnet tokens can be obtained from Monad faucets or testnet distribution channels. 
                Remember, testnet tokens have no real-world value.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Is my wallet secure?</h3>
              <p className="text-white/80">
                Your wallet remains under your full control. We never ask for private keys or seed phrases. 
                Always keep your wallet credentials secure and never share them.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Can I play on mobile?</h3>
              <p className="text-white/80">
                Yes! Our platform is fully responsive and works great on mobile devices. 
                Use a mobile wallet app that supports Monad Testnet for the best experience.
              </p>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="casino-card mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">🔧 Troubleshooting</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Connection Issues</h3>
              <ul className="space-y-2 text-white/80 ml-4">
                <li>• Ensure your wallet is unlocked and connected</li>
                <li>• Check that you're on the correct network (Monad Testnet)</li>
                <li>• Try disconnecting and reconnecting your wallet</li>
                <li>• Refresh the page and try again</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Game Issues</h3>
              <ul className="space-y-2 text-white/80 ml-4">
                <li>• Check your MON token balance</li>
                <li>• Ensure your bet is within the 0.1-5 MON limit</li>
                <li>• Wait for previous transactions to confirm</li>
                <li>• Try using a different browser or device</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Performance Issues</h3>
              <ul className="space-y-2 text-white/80 ml-4">
                <li>• Clear your browser cache and cookies</li>
                <li>• Disable browser extensions that might interfere</li>
                <li>• Use a supported browser (Chrome, Firefox, Safari, Edge)</li>
                <li>• Check your internet connection stability</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="casino-card text-center">
          <h2 className="text-2xl font-bold text-white mb-4">📞 Still Need Help?</h2>
          <p className="text-white/80 mb-6">
            Our support team is here to help you with any issues or questions you may have.
          </p>
          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Community Support</h3>
              <p className="text-white/70 text-sm">
                Join our community channels for peer-to-peer help and updates
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Bug Reports</h3>
              <p className="text-white/70 text-sm">
                Found a bug? Help us improve by reporting technical issues
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Feature Requests</h3>
              <p className="text-white/70 text-sm">
                Have an idea for a new game or feature? We'd love to hear it!
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}