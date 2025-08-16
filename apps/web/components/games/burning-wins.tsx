'use client';

import { useState, useEffect } from 'react';
import { useGameContract } from '@/lib/useGameContract';
import { toast } from 'react-hot-toast';

const SYMBOLS = ['🔥', '💰', '🎰', '⭐', '💎', '🍀', '🎲', '🔔'];

export function BurningWinsGame() {
  const { address, balance, isConnected, placeBet, payoutWin, gameState, isTransacting, finalizeRound } = useGameContract();
  const [betAmount, setBetAmount] = useState(1.0);
  const [reels, setReels] = useState<string[][]>([]);
  const [gamePhase, setGamePhase] = useState<'idle' | 'spinning' | 'evaluating' | 'burning' | 'complete'>('idle');
  const [winAmount, setWinAmount] = useState(0);
  const [winLines, setWinLines] = useState<{line: number, symbols: string[], multiplier: number}[]>([]);
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [gameNonce, setGameNonce] = useState(1);

  useEffect(() => {
    // Initialize 5x3 reels
    const initialReels = Array(5).fill(null).map(() => Array(3).fill('🎲'));
    setReels(initialReels);
  }, []);

  const playGame = async () => {
    if (!isConnected || !address || isGameLoading) return;
    
    try {
      setIsGameLoading(true);
      setGamePhase('spinning');
      
      // Generate client seed for provably fair gaming
      const clientSeed = `burning-wins-${address}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Call secure game API
      const response = await fetch('/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          gameType: 'burning-wins',
          gameParams: {
            betAmount,
            clientSeed,
            nonce: gameNonce,
            reelCount: 5,
            symbolCount: 3
          },
          playerAddress: address
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Game request failed');
      }

      const gameResult = await response.json();
      
      if (gameResult.success) {
        // Process server result
        const { result } = gameResult;
        setReels(result.gameResult.reels);
        setWinLines(result.gameResult.winLines || []);
        setWinAmount(result.winAmount);
        
        setGamePhase('evaluating');
        
        // Simulate reel animation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (result.isWin) {
          setGamePhase('burning');
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Process payout
          const payoutResponse = await fetch('/api/payout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
              playerAddress: address,
              winAmount: result.winAmount,
              gameType: 'burning-wins',
              transactionId: `burning-wins-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            })
          });

          if (payoutResponse.ok) {
            const payoutResult = await payoutResponse.json();
            if (payoutResult.success) {
              toast.success(`🔥 Burning Win! ${result.winAmount} MON!`);
            }
          }
        }
        
        setGamePhase('complete');
        setGameNonce(prev => prev + 1);
        
        // Reset after showing results
        setTimeout(() => {
          setGamePhase('idle');
          setWinAmount(0);
          setWinLines([]);
        }, 3000);
        
      } else {
        throw new Error('Game execution failed');
      }
      
    } catch (error: any) {
      console.error('Burning Wins game error:', error);
      toast.error(error.message || 'Game failed');
      setGamePhase('idle');
    } finally {
      setIsGameLoading(false);
    }
  };

  const canPlay = isConnected && address && !isGameLoading && gamePhase === 'idle' && betAmount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-800 to-yellow-700 flex items-center justify-center p-4">
      <div className="bg-black/80 backdrop-blur rounded-2xl p-8 w-full max-w-4xl border border-orange-500/30">
        {/* Game Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">
            🔥 Burning Wins
          </h1>
          <p className="text-orange-200 mt-2">Fire up your luck with burning multipliers!</p>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-b from-red-600/20 to-orange-800/20 rounded-lg p-4 text-center border border-orange-500/30">
            <div className="text-orange-400 text-sm">Balance</div>
            <div className="text-white font-bold">{balance?.toFixed(4) || '0'} MON</div>
          </div>
          <div className="bg-gradient-to-b from-red-600/20 to-orange-800/20 rounded-lg p-4 text-center border border-orange-500/30">
            <div className="text-orange-400 text-sm">Bet Amount</div>
            <div className="text-white font-bold">{betAmount} MON</div>
          </div>
          <div className="bg-gradient-to-b from-red-600/20 to-orange-800/20 rounded-lg p-4 text-center border border-orange-500/30">
            <div className="text-orange-400 text-sm">Win Amount</div>
            <div className="text-white font-bold">{winAmount.toFixed(4)} MON</div>
          </div>
          <div className="bg-gradient-to-b from-red-600/20 to-orange-800/20 rounded-lg p-4 text-center border border-orange-500/30">
            <div className="text-orange-400 text-sm">Game Phase</div>
            <div className="text-white font-bold capitalize">{gamePhase}</div>
          </div>
        </div>

        {/* Game Reels */}
        <div className="bg-gradient-to-b from-orange-900/50 to-red-900/50 rounded-xl p-6 mb-6 border-2 border-orange-500/50">
          <div className="grid grid-cols-5 gap-2">
            {reels.map((reel, reelIndex) => (
              <div key={reelIndex} className="space-y-2">
                {reel.map((symbol, symbolIndex) => (
                  <div
                    key={`${reelIndex}-${symbolIndex}`}
                    className={`
                      h-16 w-16 mx-auto rounded-lg border-2 flex items-center justify-center text-2xl
                      transition-all duration-500 transform
                      ${gamePhase === 'spinning' ? 'animate-pulse scale-110' : ''}
                      ${gamePhase === 'burning' && symbol === '🔥' ? 'animate-bounce border-yellow-400 bg-yellow-500/20' : 'border-orange-500/50 bg-orange-900/30'}
                    `}
                  >
                    {symbol}
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Win Lines Display */}
          {winLines.length > 0 && (
            <div className="mt-4 text-center">
              <div className="text-orange-200 text-sm mb-2">Winning Lines:</div>
              <div className="flex flex-wrap justify-center gap-2">
                {winLines.map((line, index) => (
                  <div key={index} className="bg-gradient-to-r from-yellow-500/20 to-orange-600/20 rounded-lg px-3 py-1 text-xs border border-yellow-500/50">
                    Line {line.line}: {line.symbols.join('')} × {line.multiplier}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-orange-200 text-sm mb-2">Bet Amount (MON)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={betAmount}
                onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-orange-900/30 border border-orange-500/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-400"
                disabled={gamePhase !== 'idle'}
              />
            </div>
          </div>

          <button
            onClick={playGame}
            disabled={!canPlay}
            className={`
              w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 transform
              ${canPlay
                ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 hover:scale-105 text-white shadow-lg hover:shadow-orange-500/25'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isGameLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {gamePhase === 'spinning' ? 'Spinning...' : 
                 gamePhase === 'evaluating' ? 'Calculating...' : 
                 gamePhase === 'burning' ? 'Burning...' : 'Processing...'}
              </div>
            ) : (
              '🔥 Ignite the Reels!'
            )}
          </button>
        </div>

        {!isConnected && (
          <div className="text-center text-orange-300 mt-4">
            Connect your wallet to play Burning Wins
          </div>
        )}
      </div>
    </div>
  );
}