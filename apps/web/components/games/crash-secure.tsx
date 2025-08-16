'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useSecureGame } from '@/lib/useSecureGame';
import { BET_LIMITS } from '@/lib/poolWallet';
import { toast } from 'react-hot-toast';

export function CrashSecureGame() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bet, setBet] = useState<number>(BET_LIMITS.min);
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);
  const [lastCrash, setLastCrash] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [gameHistory, setGameHistory] = useState<Array<{crash: number, win: boolean, multiplier: number}>>([]);
  
  const { address, isConnected } = useAccount();
  const { playGameWithPayout, isLoading } = useSecureGame();

  const playCrash = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first!');
      return;
    }

    if (targetMultiplier < 1.01 || targetMultiplier > 100) {
      toast.error('Target multiplier must be between 1.01x and 100x');
      return;
    }

    try {
      setIsPlaying(true);
      setLastCrash(null);
      setLastWin(null);
      
      // Play game using secure API (no blockchain transactions)
      const { gameResult, payoutResult } = await playGameWithPayout(
        'crash',
        address,
        { betAmount: bet, multiplier: targetMultiplier },
        (result) => {
          if (result.success && result.result) {
            const crashData = result.result.gameResult;
            setLastCrash(crashData.crashPoint);
            
            const gameRecord = {
              crash: crashData.crashPoint,
              win: result.result.isWin,
              multiplier: result.result.isWin ? targetMultiplier : 0
            };
            setGameHistory(prev => [gameRecord, ...prev.slice(0, 9)]);
            
            if (result.result.isWin && result.result.winAmount > 0) {
              setLastWin(result.result.winAmount);
              toast.success(`🚀 Cashed out at ${targetMultiplier}x! Won ${result.result.winAmount.toFixed(4)} MON!`);
            } else {
              setLastWin(null);
              toast.error(`💥 Crashed at ${crashData.crashPoint.toFixed(2)}x!`);
            }
          }
        }
      );

      if (!gameResult.success) {
        toast.error(gameResult.error?.message || 'Game failed');
      }

    } catch (error) {
      console.error('Crash game error:', error);
      toast.error('Game failed. Please try again.');
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="casino-card">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Game Area */}
        <div className="flex-1">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">🚀 Crash Game</h2>
            <p className="text-white/60">Set your target multiplier and cash out before the crash!</p>
          </div>

          {/* Crash Display */}
          <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-lg p-8 mb-6 text-center border border-red-500/20">
            {lastCrash !== null ? (
              <div className="space-y-4">
                <div className="text-6xl font-bold text-red-400">
                  {lastCrash.toFixed(2)}x
                </div>
                <div className="text-xl text-white/80">
                  {lastCrash >= targetMultiplier ? '🚀 Success!' : '💥 Crashed!'}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-4xl">🚀</div>
                <div className="text-xl text-white/60">Ready to launch...</div>
              </div>
            )}
          </div>

          {/* Game Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 mb-2">Bet Amount (MON)</label>
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(BET_LIMITS.min, Math.min(BET_LIMITS.max, parseFloat(e.target.value) || BET_LIMITS.min)))}
                className="w-full px-4 py-2 bg-black/20 border border-purple-500/30 rounded-lg text-white"
                min={BET_LIMITS.min}
                max={BET_LIMITS.max}
                step="0.1"
                disabled={isLoading || isPlaying}
              />
            </div>

            <div>
              <label className="block text-white/80 mb-2">Target Multiplier</label>
              <input
                type="number"
                value={targetMultiplier}
                onChange={(e) => setTargetMultiplier(Math.max(1.01, Math.min(100, parseFloat(e.target.value) || 2.0)))}
                className="w-full px-4 py-2 bg-black/20 border border-purple-500/30 rounded-lg text-white"
                min="1.01"
                max="100"
                step="0.01"
                disabled={isLoading || isPlaying}
              />
              <div className="text-sm text-white/60 mt-1">
                Potential win: {(bet * targetMultiplier).toFixed(4)} MON
              </div>
            </div>

            <button
              onClick={playCrash}
              disabled={isLoading || isPlaying || !isConnected}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50"
            >
              {isLoading || isPlaying ? 'Playing...' : `Bet ${bet} MON`}
            </button>
          </div>

          {lastWin !== null && (
            <div className="mt-4 text-center">
              <div className="text-lg text-green-400">
                Won: {lastWin.toFixed(4)} MON
              </div>
            </div>
          )}
        </div>

        {/* Game History */}
        <div className="w-full lg:w-80">
          <h3 className="text-xl font-bold text-white mb-4">Recent Games</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {gameHistory.length === 0 ? (
              <div className="text-white/60 text-center py-4">
                No games played yet
              </div>
            ) : (
              gameHistory.map((game, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    game.win
                      ? 'bg-green-900/20 border-green-500/30'
                      : 'bg-red-900/20 border-red-500/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white">
                      {game.crash.toFixed(2)}x
                    </span>
                    <span className={game.win ? 'text-green-400' : 'text-red-400'}>
                      {game.win ? `+${game.multiplier.toFixed(2)}x` : 'Loss'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}