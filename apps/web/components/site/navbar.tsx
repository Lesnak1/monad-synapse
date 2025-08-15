'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-black/20 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-display text-lg sm:text-xl font-bold">
            <span className="text-gradient flex items-center gap-2">
              🎰 Monad Synapse
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm text-white/80">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/games" className="hover:text-white transition-colors">Games</Link>
            <Link href="/lottery" className="hover:text-white transition-colors">Lottery</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            <div className="flex items-center gap-3">
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated');

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                      suppressHydrationWarning
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button onClick={openConnectModal} className="neon-button text-sm px-4 py-2">
                              Connect Wallet
                            </button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <button onClick={openChainModal} className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-xl">
                              Wrong network
                            </button>
                          );
                        }

                        return (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={openChainModal}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              {chain.hasIcon && (
                                <div
                                  style={{
                                    background: chain.iconBackground,
                                    width: 16,
                                    height: 16,
                                    borderRadius: 999,
                                    overflow: 'hidden',
                                    marginRight: 4,
                                  }}
                                >
                                  {chain.iconUrl && (
                                    <img
                                      alt={chain.name ?? 'Chain icon'}
                                      src={chain.iconUrl}
                                      style={{ width: 16, height: 16 }}
                                    />
                                  )}
                                </div>
                              )}
                              <span className="text-white text-sm">{chain.name}</span>
                            </button>

                            <button onClick={openAccountModal} className="neon-button text-sm px-4 py-2">
                              {account.displayName}
                              {account.displayBalance
                                ? ` (${account.displayBalance})`
                                : ''}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden flex flex-col items-center justify-center w-8 h-8 space-y-1"
          >
            <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={`lg:hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <nav className="py-4 space-y-4">
            <Link 
              href="/" 
              className="block text-white/80 hover:text-white transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/games" 
              className="block text-white/80 hover:text-white transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Games
            </Link>
            <Link 
              href="/lottery" 
              className="block text-white/80 hover:text-white transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Lottery
            </Link>
            <Link 
              href="/dashboard" 
              className="block text-white/80 hover:text-white transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              href="/blog" 
              className="block text-white/80 hover:text-white transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Blog
            </Link>
            <Link 
              href="/contact" 
              className="block text-white/80 hover:text-white transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-white/10" suppressHydrationWarning>
              <ConnectButton />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}