'use client';

import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { ThemeProvider } from 'next-themes';
import { ClientOnly } from '@/components/client-only';

import '@rainbow-me/rainbowkit/styles.css';
import { Toaster } from 'react-hot-toast';
// BotDetection removed for testing
import { useEffect } from 'react';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  // Handle browser extension errors gracefully
  useEffect(() => {
    const handleExtensionError = (error: ErrorEvent) => {
      if (error.filename?.includes('chrome-extension://') || 
          error.filename?.includes('moz-extension://') ||
          error.filename?.includes('webkit-extension://')) {
        // Suppress extension-related errors
        console.debug('Browser extension error suppressed:', error.message);
        return true;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Failed to fetch') && 
          (event.reason?.stack?.includes('chrome-extension://') ||
           event.reason?.stack?.includes('moz-extension://') ||
           event.reason?.stack?.includes('webkit-extension://'))) {
        // Suppress extension fetch errors
        console.debug('Extension fetch error suppressed:', event.reason.message);
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleExtensionError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleExtensionError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ClientOnly>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider 
            theme={darkTheme({
              accentColor: '#8b5cf6',
              accentColorForeground: 'white',
              borderRadius: 'large',
              fontStack: 'system',
              overlayBlur: 'small',
            })}
          >
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
              {/* Global user interaction hooks to avoid false bot flags */}
              <ActivityListener>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  },
                }}
              />
              </ActivityListener>
            </ThemeProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ClientOnly>
  );
}

// ActivityListener removed for testing
function ActivityListener({ children }: { children: ReactNode }) {
  return <>{children}</>;
}


