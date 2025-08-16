'use client';

import { useState } from 'react';
import { useGameContract } from '@/lib/useGameContract';
// Game logic now handled server-side via /api/game/result for security
import { toast } from 'react-hot-toast';

export function TowerGame() {
  const { address, balance, isConnected, placeBet, payoutWin, gameState, isTransacting, finalizeRound } = useGameContract();
  const [betAmount, setBetAmount] = useState(1.0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [gamePhase, setGamePhase] = useState<'betting' | 'playing' | 'complete'>('betting');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [tower, setTower] = useState<('safe' | 'danger' | 'unknown')[][]>([]);
  const [gameHistory, setGameHistory] = useState<number[]>([]);

  const levels = 8;
  const tilesPerLevel = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
  const dangerTilesPerLevel = 1;

  const multiplierProgression = {
    easy: [1.5, 2.0, 2.6, 3.4, 4.5, 6.0, 8.0, 10.5],
    medium: [1.33, 2.0, 3.0, 4.5, 6.75, 10.1, 15.2, 22.8],
    hard: [1.25, 1.87, 2.8, 4.2, 6.3, 9.45, 14.2, 21.3]
  };

  const initializeTower = () => {
    const newTower = [];
    for (let level = 0; level < levels; level++) {
      const row = Array(tilesPerLevel).fill('unknown');
      newTower.push(row);
    }
    return newTower;
  };

  const startGame = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (betAmount < 0.1 || betAmount > balance) {
      toast.error('Bet amount must be between 0.001 and ${balance.toFixed(4)} MON');
      return;
    }

    if (balance < betAmount) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      await placeBet(betAmount, 'tower');
      
      setGamePhase('playing');
      setCurrentLevel(0);
      setTotalWin(0);
      setMultiplier(1.0);
      setTower(initializeTower());

    } catch (error) {
      console.error('Tower start error:', error);
      toast.error('Failed to start game. Please try again.');
    }
  };

  const selectTile = async (levelIndex: number, tileIndex: number) => {
    if (gamePhase !== 'playing' || levelIndex !== currentLevel) return;

    try {
      // Call secure game API endpoint
      const response = await fetch('/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          gameType: 'tower',
          gameParams: {
            betAmount,
            clientSeed: `tower-${Date.now()}`,
            nonce: Math.floor(Math.random() * 1000000),
            level: currentLevel,
            tileIndex
          },
          playerAddress: address,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error('Game request failed');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Game failed');
      }

      // Update tower with revealed tiles
      const newTower = [...tower];
      
      if (result.gameResult.isSafe) {
        // Safe tile - reveal it and show multiplier
        newTower[levelIndex][tileIndex] = 'safe';
        
        // Reveal danger tiles for this level
        for (let i = 0; i < tilesPerLevel; i++) {
          if (i !== tileIndex) {
            newTower[levelIndex][i] = 'danger';
          }
        }
        
        const newLevel = currentLevel + 1;
        const newMultiplier = multiplierProgression[difficulty][currentLevel];
        const currentWin = betAmount * newMultiplier;
        
        setTower(newTower);
        setCurrentLevel(newLevel);
        setMultiplier(newMultiplier);
        setTotalWin(currentWin);
        
        if (newLevel >= levels) {
          // Completed tower!
          setGamePhase('complete');
          await payoutWin(currentWin, 'tower');
          toast.success(`🗼 Tower completed! You won ${currentWin.toFixed(4)} MON!`);
          
          setGameHistory(prev => [newMultiplier, ...prev.slice(0, 9)]);
          
          setTimeout(() => {
            setGamePhase('betting');
            finalizeRound('tower');
          }, 3000);
        } else {
          toast.success(`Level ${newLevel}/8 cleared! Multiplier: ${newMultiplier.toFixed(2)}x`);
        }
        
      } else {
        // Danger tile - game over
        newTower[levelIndex][tileIndex] = 'danger';
        
        // Reveal all tiles for this level
        for (let i = 0; i < tilesPerLevel; i++) {
          if (i !== tileIndex) {
            newTower[levelIndex][i] = Math.random() > 0.5 ? 'safe' : 'danger';
          }
        }
        
        setTower(newTower);
        setGamePhase('complete');
        
        toast.error(`💥 Hit a danger tile! Game over at level ${currentLevel + 1}`);
        
        setGameHistory(prev => [0, ...prev.slice(0, 9)]);
        
        setTimeout(() => {
          setGamePhase('betting');
          setCurrentLevel(0);
          setTotalWin(0);
          setMultiplier(1.0);
          finalizeRound('tower');
        }, 3000);
      }

    } catch (error) {
      console.error('Tower tile error:', error);
      toast.error('Action failed. Please try again.');
    }
  };

  const cashOut = async () => {
    if (totalWin <= 0) return;

    try {
      await payoutWin(totalWin, 'tower');
      toast.success(`💰 Cashed out ${totalWin.toFixed(4)} MON!`);
      
      setGameHistory(prev => [multiplier, ...prev.slice(0, 9)]);
      
      // Reset game
      setGamePhase('betting');
      setCurrentLevel(0);
      setTotalWin(0);
      setMultiplier(1.0);
      setTower([]);
      finalizeRound('tower');
      
    } catch (error) {
      console.error('Cash out error:', error);
      toast.error('Cash out failed. Please try again.');
    }
  };

  const getTileStyle = (tile: 'safe' | 'danger' | 'unknown', levelIndex: number, tileIndex: number) => {
    const isCurrentLevel = levelIndex === currentLevel && gamePhase === 'playing';
    const isClickable = isCurrentLevel && tile === 'unknown';
    
    if (tile === 'safe') {
      return 'bg-green-500 text-white border-green-400 shadow-lg shadow-green-500/50';
    }
    if (tile === 'danger') {
      return 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/50';
    }
    if (isCurrentLevel) {
      return 'bg-blue-500/30 text-white border-blue-400 hover:bg-blue-500/50 cursor-pointer';
    }
    return 'bg-white/10 text-white border-white/20';
  };

  const getTileIcon = (tile: 'safe' | 'danger' | 'unknown') => {
    if (tile === 'safe') return '✅';
    if (tile === 'danger') return '💥';
    return '❓';
  };

  return (
    <div className="casino-card max-w-4xl mx-auto">
      {/* Game Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">🗼 Tower</h2>
        <p className="text-white/70">Climb the tower by avoiding danger tiles!</p>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-white/70 text-sm">Balance</div>
          <div className="text-white font-bold">{balance.toFixed(4)} MON</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">📶</div>
          <div className="text-white/70 text-sm">Level</div>
          <div className="text-white font-bold">{currentLevel}/{levels}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">⚡</div>
          <div className="text-white/70 text-sm">Difficulty</div>
          <div className="text-white font-bold capitalize">{difficulty}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">📈</div>
          <div className="text-white/70 text-sm">Multiplier</div>
          <div className="text-green-400 font-bold">{multiplier.toFixed(2)}x</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <div className="text-white/70 text-sm">Current Win</div>
          <div className="text-yellow-400 font-bold">{totalWin.toFixed(4)}</div>
        </div>
      </div>

      {/* Tower Game Area */}
      <div className="bg-gradient-to-b from-purple-900/20 to-blue-900/20 rounded-2xl p-6 mb-6">
        {gamePhase === 'betting' ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🗼</div>
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Climb?</h3>
            <p className="text-white/70 mb-6">Choose difficulty and start your ascent!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Render tower from top to bottom (reverse order for visual appeal) */}
            {tower.slice().reverse().map((level, reversedIndex) => {
              const levelIndex = levels - 1 - reversedIndex;
              const isCurrentLevel = levelIndex === currentLevel && gamePhase === 'playing';
              
              return (
                <div key={levelIndex} className={`
                  flex justify-center gap-2 p-2 rounded-lg transition-all
                  ${isCurrentLevel ? 'bg-blue-500/20 border-2 border-blue-400/50' : ''}
                `}>
                  <div className="flex items-center gap-3 mr-4">
                    <div className="text-white/70 text-sm font-bold w-8">L{levelIndex + 1}</div>
                    <div className="text-green-400 text-sm font-bold w-12">
                      {multiplierProgression[difficulty][levelIndex]?.toFixed(2)}x
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {level.map((tile, tileIndex) => (
                      <button
                        key={tileIndex}
                        onClick={() => selectTile(levelIndex, tileIndex)}
                        disabled={gamePhase !== 'playing' || levelIndex !== currentLevel}
                        className={`
                          w-16 h-16 rounded-xl border-2 transition-all duration-200
                          flex items-center justify-center text-xl
                          disabled:cursor-not-allowed
                          ${getTileStyle(tile, levelIndex, tileIndex)}
                        `}
                      >
                        {getTileIcon(tile)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-6">
        {gamePhase === 'betting' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Bet Amount (MON)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                    min="0.1"
                    max="5"
                    step="0.1"
                    disabled={isTransacting}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400 disabled:opacity-50"
                  />
                  <button
                    onClick={() => setBetAmount(Math.min(5, betAmount * 2))}
                    disabled={isTransacting}
                    className="px-4 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    2x
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      disabled={isTransacting}
                      className={`
                        py-2 rounded-xl font-medium transition-all capitalize
                        ${difficulty === diff 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                        }
                      `}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  Easy: 2 tiles | Medium: 3 tiles | Hard: 4 tiles per level
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3">Multiplier Ladder ({difficulty})</h3>
                <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                  {multiplierProgression[difficulty].map((mult, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-white/70">Level {i + 1}:</span>
                      <span className="text-green-400 font-bold">{mult.toFixed(2)}x</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={startGame}
                disabled={!isConnected || isTransacting || betAmount < 0.1 || betAmount > balance}
                className={`
                  w-full py-3 rounded-xl font-bold transition-all
                  ${!isConnected || isTransacting || betAmount < 0.1 || betAmount > balance
                    ? 'bg-white/20 text-white/50 cursor-not-allowed'
                    : 'neon-button hover:scale-105'
                  }
                `}
              >
                🗼 START CLIMB ({betAmount.toFixed(2)} MON)
              </button>
            </div>
          </div>
        )}

        {gamePhase === 'playing' && totalWin > 0 && (
          <button
            onClick={cashOut}
            disabled={isTransacting}
            className="w-full py-4 rounded-xl font-bold text-lg bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50 hover:bg-yellow-500/30 disabled:opacity-50 transition-all"
          >
            💰 CASH OUT ({totalWin.toFixed(4)} MON)
          </button>
        )}

        {gamePhase === 'complete' && (
          <div className="text-center">
            <div className="text-white text-lg font-bold mb-4">
              {totalWin > 0 ? '🎉 Congratulations!' : '💥 Better luck next time!'}
            </div>
          </div>
        )}
      </div>

      {/* Game History */}
      {gameHistory.length > 0 && (
        <div className="mt-6 p-4 bg-white/5 rounded-xl">
          <h3 className="text-white font-bold mb-3">Recent Climbs</h3>
          <div className="flex gap-2 flex-wrap">
            {gameHistory.map((result, index) => (
              <div
                key={index}
                className={`
                  px-3 py-2 rounded-lg text-sm font-bold
                  ${result > 1 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                `}
              >
                {result > 1 ? `${result.toFixed(2)}x` : 'BUST'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Rules */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl">
        <h3 className="text-white font-bold mb-2">How to Play</h3>
        <ul className="text-white/70 text-sm space-y-1">
          <li>• Choose difficulty: Easy (2 tiles), Medium (3 tiles), Hard (4 tiles)</li>
          <li>• Climb 8 levels by selecting safe tiles and avoiding danger tiles</li>
          <li>• Each level has 1 danger tile - avoid it to continue</li>
          <li>• Cash out anytime or reach the top for maximum payout</li>
          <li>• Higher difficulty = higher risk but better multipliers</li>
          <li>• RTP: 94% | House Edge: 6%</li>
        </ul>
      </div>
    </div>
  );
}