'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useWalletAuth } from '@/lib/useWalletAuth';
import { useSecureGame } from '@/lib/useSecureGame';

export default function DebugPage() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isAuthenticating, authenticate } = useWalletAuth();
  const { playGameWithPayout, isLoading } = useSecureGame();
  const [testResults, setTestResults] = useState<any[]>([]);

  const log = (message: string, data?: any) => {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      data
    };
    console.log(message, data);
    setTestResults(prev => [...prev, entry]);
  };

  const testAuthentication = async () => {
    log('🔐 Testing authentication...');
    try {
      const result = await authenticate();
      log('Authentication result:', result);
    } catch (error) {
      log('Authentication error:', error);
    }
  };

  const testCoinMasterGame = async () => {
    log('🎰 Testing Coin Master game...');
    
    if (!isConnected || !address) {
      log('❌ Wallet not connected');
      return;
    }

    if (!isAuthenticated) {
      log('❌ Not authenticated, trying to authenticate...');
      const authResult = await authenticate();
      if (!authResult) {
        log('❌ Authentication failed');
        return;
      }
    }

    try {
      log('🎮 Starting coin master game...');
      const result = await playGameWithPayout(
        'coin-master',
        address,
        { betAmount: 0.1 },
        (gameResult) => {
          log('Game callback result:', gameResult);
        }
      );
      log('Final game result:', result);
    } catch (error) {
      log('Game error:', error);
    }
  };

  const testDirectAPI = async () => {
    log('🔗 Testing direct API calls...');
    
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      log('❌ No auth token found');
      return;
    }

    // Test game API
    try {
      const response = await fetch('/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          gameType: 'coin-master',
          gameParams: {
            betAmount: 0.1,
            clientSeed: 'test123456789',
            nonce: 1
          },
          playerAddress: address
        })
      });

      const data = await response.json();
      log(`Game API response (${response.status}):`, data);
    } catch (error) {
      log('Game API error:', error);
    }
  };

  const clearTests = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Casino Debug Page</h1>
        
        {/* Status Panel */}
        <div className="bg-black/20 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Current Status</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60">Wallet Connected:</span>
              <span className={`ml-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-white/60">Address:</span>
              <span className="ml-2 text-white text-xs">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'None'}
              </span>
            </div>
            <div>
              <span className="text-white/60">Authenticated:</span>
              <span className={`ml-2 ${isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
                {isAuthenticated ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-white/60">Auth Token:</span>
              <span className="ml-2 text-white text-xs">
                {localStorage.getItem('authToken') ? 'Present' : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-black/20 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Test Controls</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={testAuthentication}
              disabled={isAuthenticating}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {isAuthenticating ? 'Authenticating...' : 'Test Authentication'}
            </button>
            
            <button
              onClick={testCoinMasterGame}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Playing...' : 'Test Coin Master Game'}
            </button>
            
            <button
              onClick={testDirectAPI}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Test Direct API
            </button>
            
            <button
              onClick={clearTests}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-black/20 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Test Results</h2>
          <div className="max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-white/60">No test results yet. Click buttons above to run tests.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-3 p-3 bg-white/5 rounded text-xs">
                  <div className="text-white/60 text-xs mb-1">
                    {result.timestamp}
                  </div>
                  <div className="text-white font-mono">
                    {result.message}
                  </div>
                  {result.data && (
                    <pre className="text-yellow-400 mt-2 whitespace-pre-wrap">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}