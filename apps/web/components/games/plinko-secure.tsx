'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useSecureGame } from '@/lib/useSecureGame';
import { useWalletAuth } from '@/lib/useWalletAuth';
import { BET_LIMITS } from '@/lib/poolWallet';
import { toast } from 'react-hot-toast';

export function PlinkoSecureGame() {
  const [isDropping, setIsDropping] = useState(false);
  const [bet, setBet] = useState<number>(BET_LIMITS.min);
  const [ballPath, setBallPath] = useState<number[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isAuthenticating, authenticate } = useWalletAuth();
  const { playGameWithPayout, isLoading } = useSecureGame();

  const dropBall = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first!');
      return;
    }
    
    if (!isAuthenticated) {
      const authSuccess = await authenticate();
      if (!authSuccess) return;
    }

    try {
      setIsDropping(true);
      setBallPath([]);
      setLastResult(null);
      
      // Play game using secure API (no blockchain transactions)
      const { gameResult, payoutResult } = await playGameWithPayout(
        'plinko',
        address,
        { betAmount: bet },
        (result) => {
          if (result.success && result.result) {
            const plinkoData = result.result.gameResult;
            setLastResult(plinkoData);
            
            // Animate ball path if available
            if (plinkoData.path) {
              setBallPath(plinkoData.path.split('').map((c: string) => c === 'L' ? 0 : 1));
            }
            
            if (result.result.isWin && result.result.winAmount > 0) {
              setLastWin(result.result.winAmount);
              toast.success(`🎉 You won ${result.result.winAmount.toFixed(4)} MON! (${plinkoData.multiplier}x)`);
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
      console.error('Plinko game error:', error);
      toast.error('Game failed. Please try again.');
    } finally {
      setIsDropping(false);
    }
  };

  return (
    <div className="casino-card">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🎲 Plinko</h2>
        <p className="text-white/70 text-sm">Drop the ball and watch it bounce to multipliers!</p>
      </div>

      {/* Game Display */}
      <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-6 mb-6">
        {/* Plinko board visualization */}
        <div className="grid grid-cols-9 gap-1 mb-4">
          {Array.from({ length: 81 }, (_, i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-white/10 border border-white/20"></div>
          ))}
        </div>

        {/* Result display */}
        {lastResult && (
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-lg mb-2">
              Multiplier: {lastResult.multiplier?.toFixed(2)}x
            </div>
            <div className="text-white text-sm">
              Landing Bucket: {lastResult.bucket || 'N/A'}
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
          disabled={isDropping || isLoading || isAuthenticating}
        />
      </div>

      {/* Drop Button */}
      <button
        onClick={!isAuthenticated ? authenticate : dropBall}
        disabled={!isConnected || isDropping || isLoading || isAuthenticating}
        className={`w-full neon-button py-4 text-lg font-bold ${
          (!isConnected || isDropping || isLoading || isAuthenticating) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {!isConnected
          ? 'CONNECT WALLET'
          : isAuthenticating
          ? 'AUTHENTICATING...'
          : isDropping || isLoading
          ? 'DROPPING...'
          : !isAuthenticated
          ? 'SIGN TO PLAY'
          : 'DROP BALL'
        }
      </button>

      {/* Game Rules */}
      <div className="mt-6 text-xs text-white/60">
        <div className="font-semibold mb-2">How to Play:</div>
        <div>• Drop a ball from the top</div>
        <div>• Ball bounces through pegs randomly</div>
        <div>• Landing position determines multiplier</div>
        <div>• Edge buckets have higher multipliers</div>
        <div>• Center buckets have lower multipliers</div>
      </div>
    </div>
  );
}