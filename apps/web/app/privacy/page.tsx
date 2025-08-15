export default function PrivacyPage() {
  return (
    <main className="min-h-screen pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-white/70">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="casino-card space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p className="text-white/80 leading-relaxed">
              Monad Synapse ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our decentralized 
              casino platform. By using our service, you consent to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <div className="space-y-4 text-white/80">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2.1 Wallet Information</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Your wallet address when you connect to our platform</li>
                  <li>Transaction hashes and blockchain interactions</li>
                  <li>Token balances and gaming history</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2.2 Technical Information</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>IP address and browser information</li>
                  <li>Device type and operating system</li>
                  <li>Usage patterns and platform interactions</li>
                  <li>Error logs and performance data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2.3 Gaming Data</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Game preferences and playing patterns</li>
                  <li>Bet amounts and win/loss records</li>
                  <li>Session duration and frequency</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <div className="space-y-3 text-white/80">
              <p>We use the collected information for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Platform Operation:</strong> To provide and maintain our gaming services</li>
                <li><strong>Security:</strong> To detect fraud, abuse, and ensure fair play</li>
                <li><strong>Improvement:</strong> To analyze usage and improve user experience</li>
                <li><strong>Compliance:</strong> To comply with legal obligations and regulations</li>
                <li><strong>Communication:</strong> To send important platform updates and announcements</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Blockchain Transparency</h2>
            <p className="text-white/80 leading-relaxed">
              As a decentralized platform built on the Monad blockchain, certain information is inherently 
              public and transparent. This includes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-white/80 mt-3">
              <li>All transaction data recorded on the blockchain</li>
              <li>Wallet addresses and their associated gaming activity</li>
              <li>Smart contract interactions and results</li>
              <li>Token transfers and balance changes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Information Sharing</h2>
            <div className="space-y-3 text-white/80">
              <p>We do not sell, trade, or rent your personal information. We may share information only in these circumstances:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Legal Requirements:</strong> When required by law or legal process</li>
                <li><strong>Security:</strong> To prevent fraud or protect user safety</li>
                <li><strong>Service Providers:</strong> With trusted third-party services that help operate our platform</li>
                <li><strong>Business Transfer:</strong> In case of merger, acquisition, or asset sale</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Data Security</h2>
            <div className="space-y-3 text-white/80">
              <p>We implement industry-standard security measures to protect your information:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication systems</li>
                <li>Monitoring for suspicious activity</li>
              </ul>
              <p className="mt-4">
                However, no method of transmission over the internet is 100% secure. We cannot guarantee 
                absolute security of your information.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Your Privacy Rights</h2>
            <div className="space-y-3 text-white/80">
              <p>Depending on your location, you may have certain rights regarding your personal information:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request information about data we collect</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal requirements)</li>
                <li><strong>Portability:</strong> Request a copy of your data in machine-readable format</li>
                <li><strong>Opt-out:</strong> Withdraw consent for certain data processing activities</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Cookies and Tracking</h2>
            <p className="text-white/80 leading-relaxed">
              We use cookies and similar tracking technologies to enhance user experience, analyze platform 
              usage, and remember your preferences. You can control cookie settings through your browser, 
              but disabling cookies may affect platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Third-Party Services</h2>
            <p className="text-white/80 leading-relaxed">
              Our platform may integrate with third-party services (wallet providers, blockchain networks, etc.). 
              These services have their own privacy policies, and we encourage you to review them. We are not 
              responsible for the privacy practices of these third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Children's Privacy</h2>
            <p className="text-white/80 leading-relaxed">
              Our platform is not intended for individuals under 18 years of age. We do not knowingly collect 
              personal information from children. If we become aware that we have collected personal information 
              from a child, we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. International Transfers</h2>
            <p className="text-white/80 leading-relaxed">
              As a decentralized platform, your information may be processed in various jurisdictions. 
              By using our service, you consent to the transfer of your information to countries that 
              may have different privacy laws than your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Data Retention</h2>
            <p className="text-white/80 leading-relaxed">
              We retain your information for as long as necessary to provide our services, comply with 
              legal obligations, resolve disputes, and enforce our policies. Blockchain data is permanent 
              and cannot be deleted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Changes to Privacy Policy</h2>
            <p className="text-white/80 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new policy on this page with an updated date. Your continued use of the platform 
              after changes indicates acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">14. Contact Us</h2>
            <p className="text-white/80 leading-relaxed">
              If you have any questions about this Privacy Policy or our privacy practices, please contact 
              us through the support channels available on our platform.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}