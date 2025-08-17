'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useSecureGame } from '@/lib/useSecureGame';
import { useWalletAuth } from '@/lib/useWalletAuth';
import { BET_LIMITS } from '@/lib/poolWallet';
import { toast } from 'react-hot-toast';

export function WheelSecureGame() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [bet, setBet] = useState<number>(BET_LIMITS.min);
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<'red' | 'black' | 'green'>('red');
  
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isAuthenticating, authenticate } = useWalletAuth();
  const { playGameWithPayout, isLoading } = useSecureGame();

  const spinWheel = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first!');
      return;
    }
    
    if (!isAuthenticated) {
      const authSuccess = await authenticate();
      if (!authSuccess) return;
    }

    try {
      setIsSpinning(true);
      setLastResult(null);
      
      // Play game using secure API
      const { gameResult, payoutResult } = await playGameWithPayout(
        'wheel',
        address,
        { betAmount: bet, prediction: selectedColor },
        (result) => {
          if (result.success && result.result) {
            const wheelData = result.result.gameResult;
            setLastResult(wheelData);
            
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
        toast.error(gameResult.error?.message || 'Game failed');
      }

    } catch (error) {
      console.error('Wheel game error:', error);
      toast.error('Game failed. Please try again.');
    } finally {
      setIsSpinning(false);
    }
  };

  const getColorStyle = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'black': return 'bg-gray-800';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="casino-card">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🎡 Wheel</h2>
        <p className="text-white/70 text-sm">Bet on colors and spin the wheel!</p>
      </div>

      {/* Wheel Display */}
      <div className="bg-gradient-to-br from-yellow-900/30 to-red-900/30 rounded-xl p-6 mb-6">
        <div className="flex justify-center mb-4">
          <div className={`w-32 h-32 rounded-full border-4 border-white/30 flex items-center justify-center text-4xl ${
            isSpinning ? 'animate-spin' : ''
          } ${lastResult ? getColorStyle(lastResult.result || 'gray') : 'bg-gradient-to-br from-red-500 via-black to-green-500'}`}>
            🎡
          </div>
        </div>

        {/* Result display */}
        {lastResult && (
          <div className="text-center">
            <div className="text-white font-bold text-lg mb-2">
              Result: <span className={`px-2 py-1 rounded ${getColorStyle(lastResult.result)}`}>
                {lastResult.result?.toUpperCase()}
              </span>
            </div>
            <div className="text-yellow-400 font-bold">
              Multiplier: {lastResult.multiplier?.toFixed(1)}x
            </div>
          </div>
        )}

        {lastWin && (
          <div className="text-center mt-4">
            <div className="text-green-400 font-bold">
              Last Win: +{lastWin.toFixed(4)} MON
            </div>
          </div>
        )}
      </div>

      {/* Color Selection */}
      <div className="mb-6">
        <label className="block text-white/70 text-sm mb-2">Choose Color</label>
        <div className="flex gap-2">
          {(['red', 'black', 'green'] as const).map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`flex-1 py-2 px-4 rounded-lg text-white font-bold border-2 ${
                selectedColor === color ? 'border-white' : 'border-transparent'
              } ${getColorStyle(color)}`}
              disabled={isSpinning || isLoading || isAuthenticating}
            >
              {color.toUpperCase()}
              <div className="text-xs">
                {color === 'green' ? '14x' : color === 'red' ? '2x' : '2x'}
              </div>
            </button>
          ))}
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
        onClick={!isAuthenticated ? authenticate : spinWheel}
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
          : 'SPIN WHEEL'
        }
      </button>

      {/* Game Rules */}
      <div className="mt-6 text-xs text-white/60">
        <div className="font-semibold mb-2">Payouts:</div>
        <div>• RED: 2x multiplier (18/37 chance)</div>
        <div>• BLACK: 2x multiplier (18/37 chance)</div>
        <div>• GREEN: 14x multiplier (1/37 chance)</div>
      </div>
    </div>
  );
}