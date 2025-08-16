'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useSecureGame } from '@/lib/useSecureGame';
import { BET_LIMITS } from '@/lib/poolWallet';
import { toast } from 'react-hot-toast';

export function MinesSecureGame() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bet, setBet] = useState<number>(BET_LIMITS.min);
  const [mineCount, setMineCount] = useState(3);
  const [lastResult, setLastResult] = useState<{
    minePositions: number[];
    safeTiles: number[];
    multiplier: number;
    isWin: boolean;
  } | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  
  const { address, isConnected } = useAccount();
  const { playGameWithPayout, isLoading } = useSecureGame();

  const playMines = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first!');
      return;
    }

    if (mineCount < 1 || mineCount > 24) {
      toast.error('Mine count must be between 1 and 24');
      return;
    }

    try {
      setIsPlaying(true);
      setLastResult(null);
      setLastWin(null);
      
      // Play game using secure API (no blockchain transactions)
      const { gameResult, payoutResult } = await playGameWithPayout(
        'mines',
        address,
        { betAmount: bet, mines: mineCount },
        (result) => {
          if (result.success && result.result) {
            const minesData = result.result.gameResult;
            setLastResult({
              minePositions: minesData.minePositions || [],
              safeTiles: minesData.safeTiles || [],
              multiplier: minesData.multiplier || 0,
              isWin: result.result.isWin
            });
            
            if (result.result.isWin && result.result.winAmount > 0) {
              setLastWin(result.result.winAmount);
              toast.success(`💎 Found safe tiles! Won ${result.result.winAmount.toFixed(4)} MON!`);
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
      console.error('Mines game error:', error);
      toast.error('Game failed. Please try again.');
    } finally {
      setIsPlaying(false);
    }
  };

  const renderGrid = () => {
    const tiles = [];
    for (let i = 0; i < 25; i++) {
      const isMine = lastResult?.minePositions.includes(i);
      const isSafe = lastResult?.safeTiles.includes(i);
      
      tiles.push(
        <div
          key={i}
          className={`
            aspect-square rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all
            ${isMine 
              ? 'bg-red-500/30 border-red-500 text-red-400' 
              : isSafe 
                ? 'bg-green-500/30 border-green-500 text-green-400'
                : 'bg-gray-800/50 border-gray-600 hover:border-gray-400'
            }
          `}
        >
          {isMine ? '💣' : isSafe ? '💎' : '?'}
        </div>
      );
    }
    return tiles;
  };

  return (
    <div className="casino-card">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Game Area */}
        <div className="flex-1">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">💎 Mines</h2>
            <p className="text-white/60">Avoid the mines and find the gems!</p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-5 gap-2 mb-6 max-w-md mx-auto">
            {renderGrid()}
          </div>

          {/* Game Info */}
          {lastResult && (
            <div className="bg-black/20 rounded-lg p-4 mb-6 text-center">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-white/60 text-sm">Mines</div>
                  <div className="text-red-400 font-bold">{lastResult.minePositions.length}</div>
                </div>
                <div>
                  <div className="text-white/60 text-sm">Multiplier</div>
                  <div className="text-green-400 font-bold">{lastResult.multiplier.toFixed(2)}x</div>
                </div>
              </div>
            </div>
          )}

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
              <label className="block text-white/80 mb-2">Number of Mines</label>
              <input
                type="number"
                value={mineCount}
                onChange={(e) => setMineCount(Math.max(1, Math.min(24, parseInt(e.target.value) || 3)))}
                className="w-full px-4 py-2 bg-black/20 border border-purple-500/30 rounded-lg text-white"
                min="1"
                max="24"
                disabled={isLoading || isPlaying}
              />
              <div className="text-sm text-white/60 mt-1">
                More mines = higher multiplier, but higher risk
              </div>
            </div>

            <button
              onClick={playMines}
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

        {/* Game Info */}
        <div className="w-full lg:w-80">
          <h3 className="text-xl font-bold text-white mb-4">How to Play</h3>
          <div className="space-y-4 text-white/80">
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="font-bold text-white mb-2">Rules</h4>
              <ul className="space-y-1 text-sm">
                <li>• Choose number of mines (1-24)</li>
                <li>• Place your bet</li>
                <li>• Game reveals safe tiles and mines</li>
                <li>• More mines = higher multiplier</li>
                <li>• Find safe tiles to win!</li>
              </ul>
            </div>
            
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="font-bold text-white mb-2">Symbols</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💎</span>
                  <span>Safe tile (win)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💣</span>
                  <span>Mine (avoid)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}