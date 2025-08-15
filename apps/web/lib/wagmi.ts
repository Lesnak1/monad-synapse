'use client';

import { http } from 'viem';
import { defineChain } from 'viem';
import { createConfig } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { 
      http: ['https://monad-testnet.drpc.org', 'https://testnet-rpc.monad.xyz'],
      webSocket: ['wss://monad-testnet.drpc.org']
    },
    public: { 
      http: ['https://monad-testnet.drpc.org', 'https://rpc.ankr.com/monad_testnet', 'https://testnet-rpc.monad.xyz'],
      webSocket: ['wss://monad-testnet.drpc.org']
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadexplorer.com',
    },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: 'MonCas — Monad Synapse Casino',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0]!),
  },
  ssr: true,
});

export const chains = [monadTestnet];


