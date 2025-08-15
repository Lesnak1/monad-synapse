export default function TermsPage() {
  return (
    <main className="min-h-screen pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-white/70">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="casino-card space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-white/80 leading-relaxed">
              By accessing and using Monad Synapse casino platform, you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Eligibility</h2>
            <div className="space-y-3 text-white/80">
              <p>To use our services, you must:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Be at least 18 years of age or the minimum legal gambling age in your jurisdiction</li>
                <li>Have the legal capacity to enter into this agreement</li>
                <li>Not be located in a jurisdiction where online gambling is prohibited</li>
                <li>Use the platform in accordance with all applicable laws and regulations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Account and Wallet</h2>
            <div className="space-y-3 text-white/80">
              <p>
                <strong>Wallet Connection:</strong> You must connect a compatible crypto wallet (MetaMask, Phantom, etc.) 
                to access our games. You are solely responsible for the security of your wallet and private keys.
              </p>
              <p>
                <strong>Funds:</strong> All gaming is conducted using MON tokens on the Monad testnet. You acknowledge 
                that testnet tokens have no real-world value.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Gaming Rules</h2>
            <div className="space-y-3 text-white/80">
              <h3 className="text-lg font-semibold text-white">Betting Limits</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Minimum bet: 0.1 MON tokens</li>
                <li>Maximum bet: 5.0 MON tokens per game</li>
                <li>All bets are final once placed and cannot be cancelled</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">Game Fairness</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All games use provably fair algorithms</li>
                <li>Game results are determined by blockchain-verifiable random number generation</li>
                <li>The house maintains a statistical edge across all games</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Responsible Gaming</h2>
            <div className="space-y-3 text-white/80">
              <p>We are committed to promoting responsible gaming:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Set personal betting limits and stick to them</li>
                <li>Never gamble more than you can afford to lose</li>
                <li>Take regular breaks from gaming</li>
                <li>If you feel you have a gambling problem, seek professional help</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Prohibited Activities</h2>
            <div className="space-y-3 text-white/80">
              <p>The following activities are strictly prohibited:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Using bots, scripts, or automated tools</li>
                <li>Exploiting bugs or vulnerabilities</li>
                <li>Colluding with other players</li>
                <li>Money laundering or financing illegal activities</li>
                <li>Creating multiple accounts to circumvent limits</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-white/80 leading-relaxed">
              The platform is provided "as is" without warranties of any kind. We do not guarantee 
              uninterrupted service, error-free operation, or that the platform will meet your requirements. 
              You use the service at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Limitation of Liability</h2>
            <p className="text-white/80 leading-relaxed">
              In no event shall Monad Synapse be liable for any indirect, incidental, special, 
              consequential, or punitive damages, including loss of profits, data, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Modifications</h2>
            <p className="text-white/80 leading-relaxed">
              We reserve the right to modify these terms at any time. Changes will be effective immediately 
              upon posting. Your continued use of the platform constitutes acceptance of modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Governing Law</h2>
            <p className="text-white/80 leading-relaxed">
              These terms shall be governed by and construed in accordance with applicable laws. 
              Any disputes shall be resolved through binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Contact Information</h2>
            <p className="text-white/80 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through our 
              support channels available on the platform.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}