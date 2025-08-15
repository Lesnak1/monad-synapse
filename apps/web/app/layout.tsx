import './globals.css';
import type { ReactNode } from 'react';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Footer } from '../components/site/footer';
import { Navbar } from '../components/site/navbar';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', display: 'swap' });

export const metadata = {
  title: 'MonCas — Monad Synapse Crypto Casino',
  description: 'MonCas: Play Crash, Mines, Plinko, Dice and more using MON on Monad testnet. Provably fair, fast payouts.',
  other: {
    // Browser extension compatibility
    'web3-compatibility': 'true',
    'extension-friendly': 'true',
  },
};

export const viewport = {
  themeColor: '#8b5cf6',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased text-white bg-gradient-to-br from-[#0B0217] via-[#16043A] to-[#2C0A63] overflow-x-hidden" suppressHydrationWarning>
        {/* Etkileyici arkaplan efektleri (sade ama canlı) */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_15%_10%,rgba(168,85,247,.35),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_85%_15%,rgba(236,72,153,.18),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_50%_100%,rgba(139,92,246,.25),transparent_70%)]" />
          <div className="absolute inset-0 bg-[conic-gradient(from_140deg_at_50%_50%,rgba(217,70,239,.08),transparent_40%,rgba(59,130,246,.06))]" />
        </div>
        <Providers>
          <Navbar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}


