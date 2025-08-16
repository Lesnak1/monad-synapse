'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useSecureGame } from '@/lib/useSecureGame';
import { useWalletAuth } from '@/lib/useWalletAuth';
import { BET_LIMITS } from '@/lib/poolWallet';
import { toast } from 'react-hot-toast';

export function CoinMasterSecureGame() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string[]>([]);
  const [bet, setBet] = useState<number>(BET_LIMITS.min);
  const [lastWin, setLastWin] = useState<number | null>(null);
  
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isAuthenticating, authenticate } = useWalletAuth();
  const { playGameWithPayout, isLoading } = useSecureGame();

  const symbols = ['🪙', '💎', '⚡', '🍀', '🔥', '💰', '⭐'];
  
  const spin = async () => {
    console.log('🎰 Coin Master spin started');
    console.log('Wallet connected:', isConnected);
    console.log('Address:', address);
    console.log('Authenticated:', isAuthenticated);
    
    if (!isConnected || !address) {
      console.log('❌ Wallet not connected');
      toast.error('Please connect your wallet first!');
      return;
    }
    
    if (!isAuthenticated) {
      console.log('❌ Not authenticated, starting authentication...');
      const authSuccess = await authenticate();
      if (!authSuccess) {
        console.log('❌ Authentication failed');
        return;
      }
    }

    try {
      console.log('🎮 Starting coin master game with bet:', bet);
      setIsSpinning(true);
      setResult([]);
      
      // Play game using secure API (handles everything automatically)
      const { gameResult, payoutResult } = await playGameWithPayout(
        'coin-master',
        address,
        { betAmount: bet },
        (result) => {
          // Callback when game result is received
          if (result.success && result.result) {
            const gameData = result.result.gameResult;
            setResult(gameData.symbols || gameData.spinResult || []);
            
            if (result.result.isWin && result.result.winAmount > 0) {
              setLastWin(result.result.winAmount);
              toast.success(`🎉 You won ${result.result.winAmount.toFixed(4)} MON!`);
            } else {
              setLastWin(null);
              toast.success('Better luck next time!');
            }
          }
        }
      );

      if (!gameResult.success) {
        console.log('❌ Game failed:', gameResult.error);
        toast.error(gameResult.error?.message || 'Game failed');
      } else {
        console.log('✅ Game success:', gameResult);
      }

    } catch (error) {
      console.error('❌ Coin Master game error:', error);
      toast.error('Game failed. Please try again.');
    } finally {
      console.log('🏁 Coin Master game ended');
      setIsSpinning(false);
    }
  };

  const getMultiplier = () => {
    if (!result || result.length === 0) return '0x';
    
    // Count unique symbols
    const uniqueSymbols = new Set(result).size;
    
    if (uniqueSymbols === 1) {
      // All 3 same symbols
      const symbol = result[0];
      if (symbol === '💎') return '10x';
      if (symbol === '⭐') return '5x';
      if (symbol === '🎰') return '3x';
      return '2x';
    } else if (uniqueSymbols === 2) {
      // 2 matching symbols
      return '1.5x';
    }
    return '0x';
  };

  return (
    <div className="casino-card max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🪙 Coin Master</h2>
        <p className="text-white/70 text-sm">Spin 3 reels and match symbols to win!</p>
      </div>

      {/* Game Display */}
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl p-6 mb-6">
        <div className="flex justify-center space-x-4 mb-6">
          {[0, 1, 2].map(index => (
            <div
              key={index}
              className={`w-20 h-20 rounded-xl border-2 border-purple-400/50 bg-purple-900/50 flex items-center justify-center text-3xl transition-all duration-300 ${
                isSpinning ? 'animate-spin' : ''
              }`}
            >
              {result[index] || '❓'}
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="text-yellow-400 font-bold text-lg mb-2">
            Multiplier: {getMultiplier()}
          </div>
          {lastWin && (
            <div className="text-green-400 font-bold">
              Last Win: +{lastWin.toFixed(4)} MON
            </div>
          )}
        </div>
      </div>

      {/* Bet Control */}
      <div className="mb-6">
        <label className="block text-white/70 text-sm mb-2">Bet Amount</label>
        <input
          type="number"
          value={bet.toFixed(3)}
          onChange={(e) => setBet(Math.max(BET_LIMITS.min, parseFloat(e.target.value) || BET_LIMITS.min))}
          className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400"
          step="0.1"
          min={BET_LIMITS.min}
          max={BET_LIMITS.max}
          disabled={isSpinning || isLoading || isAuthenticating}
        />
      </div>

      {/* Spin Button */}
      <button
        onClick={spin}
        disabled={!isConnected || isSpinning || isLoading || isAuthenticating}
        className={`w-full neon-button py-4 text-lg font-bold ${
          (!isConnected || isSpinning || isLoading || isAuthenticating) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {!isConnected
          ? 'CONNECT WALLET'
          : isAuthenticating
          ? 'AUTHENTICATING...'
          : isSpinning || isLoading
          ? 'SPINNING...'
          : !isAuthenticated
          ? 'SIGN TO PLAY'
          : 'SPIN'
        }
      </button>

      {/* Game Rules */}
      <div className="mt-6 text-xs text-white/60">
        <div className="font-semibold mb-2">How to Win:</div>
        <div>• 3 💎 symbols = 10x multiplier</div>
        <div>• 3 ⭐ symbols = 5x multiplier</div>
        <div>• 3 🎰 symbols = 3x multiplier</div>
        <div>• 3 matching symbols = 2x multiplier</div>
        <div>• 2 matching symbols = 1.5x multiplier</div>
      </div>

      {/* Wallet Connection Status */}
      {isConnected && address && (
        <div className="mt-4 text-center text-xs text-white/60">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      )}
    </div>
  );
}