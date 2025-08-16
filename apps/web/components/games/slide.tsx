'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameContract } from '@/lib/useGameContract';
// Game logic now handled server-side via /api/game/result for security
import { toast } from 'react-hot-toast';

type SlideLevel = {
  targetPosition: number;
  targetWidth: number;
  speed: number;
  direction: 1 | -1;
  multiplier: number;
  color: string;
};

export function SlideGame() {
  const { address, balance, isConnected, placeBet, payoutWin, gameState, isTransacting, finalizeRound } = useGameContract();
  const [betAmount, setBetAmount] = useState(1.0);
  const [gamePhase, setGamePhase] = useState<'idle' | 'instructions' | 'playing' | 'complete'>('idle');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isMoving, setIsMoving] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [totalMultiplier, setTotalMultiplier] = useState(1);
  const [levelResults, setLevelResults] = useState<boolean[]>([]);
  const [totalWin, setTotalWin] = useState(0);
  const [gameSpeed, setGameSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');

  const animationRef = useRef<number>();
  const gameStartTime = useRef<number>(0);

  const generateLevels = useCallback((): SlideLevel[] => {
    const speedSettings = {
      slow: { baseSpeed: 0.3, multiplierBonus: 1.2 },
      medium: { baseSpeed: 0.6, multiplierBonus: 1.5 },
      fast: { baseSpeed: 1.0, multiplierBonus: 2.0 }
    };
    const speedSetting = speedSettings[gameSpeed];
    return [
      { targetPosition: 50, targetWidth: 30, speed: speedSetting.baseSpeed * 0.8, direction: 1, multiplier: 1.2 * speedSetting.multiplierBonus, color: 'from-green-500 to-green-600' },
      { targetPosition: 30, targetWidth: 25, speed: speedSetting.baseSpeed * 1.0, direction: -1, multiplier: 1.5 * speedSetting.multiplierBonus, color: 'from-blue-500 to-blue-600' },
      { targetPosition: 70, targetWidth: 20, speed: speedSetting.baseSpeed * 1.2, direction: 1, multiplier: 2.0 * speedSetting.multiplierBonus, color: 'from-yellow-500 to-yellow-600' },
      { targetPosition: 40, targetWidth: 18, speed: speedSetting.baseSpeed * 1.4, direction: -1, multiplier: 2.5 * speedSetting.multiplierBonus, color: 'from-orange-500 to-orange-600' },
      { targetPosition: 60, targetWidth: 15, speed: speedSetting.baseSpeed * 1.6, direction: 1, multiplier: 3.5 * speedSetting.multiplierBonus, color: 'from-red-500 to-red-600' },
      { targetPosition: 50, targetWidth: 12, speed: speedSetting.baseSpeed * 1.8, direction: -1, multiplier: 5.0 * speedSetting.multiplierBonus, color: 'from-purple-500 to-purple-600' },
      { targetPosition: 35, targetWidth: 10, speed: speedSetting.baseSpeed * 2.0, direction: 1, multiplier: 8.0 * speedSetting.multiplierBonus, color: 'from-pink-500 to-pink-600' },
      { targetPosition: 65, targetWidth: 8, speed: speedSetting.baseSpeed * 2.2, direction: -1, multiplier: 12.0 * speedSetting.multiplierBonus, color: 'from-indigo-500 to-indigo-600' },
      { targetPosition: 50, targetWidth: 6, speed: speedSetting.baseSpeed * 2.5, direction: 1, multiplier: 20.0 * speedSetting.multiplierBonus, color: 'from-cyan-500 to-cyan-600' },
      { targetPosition: 45, targetWidth: 4, speed: speedSetting.baseSpeed * 3.0, direction: -1, multiplier: 50.0 * speedSetting.multiplierBonus, color: 'from-emerald-500 to-emerald-600' }
    ];
  }, [gameSpeed]);

  const [levels, setLevels] = useState<SlideLevel[]>([]);

  useEffect(() => {
    setLevels(generateLevels());
  }, [generateLevels]);

  const moveSlider = useCallback(() => {
    if (!isMoving || currentLevel >= levels.length) return;

    const level = levels[currentLevel];
    const elapsed = (Date.now() - gameStartTime.current) / 1000;
    const newPosition = 50 + Math.sin(elapsed * level.speed) * 40 * direction;
    
    setSliderPosition(Math.max(5, Math.min(95, newPosition)));
    animationRef.current = requestAnimationFrame(moveSlider);
  }, [isMoving, currentLevel, levels, direction]);

  useEffect(() => {
    if (isMoving) {
      gameStartTime.current = Date.now();
      animationRef.current = requestAnimationFrame(moveSlider);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMoving, moveSlider]);

  const startGame = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (betAmount < 0.1 || betAmount > balance) {
      toast.error(`Bet amount must be between 0.001 and ${balance.toFixed(4)} MON`);
      return;
    }

    if (balance < betAmount) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      await placeBet(betAmount, 'slide');
      
      setGamePhase('instructions');
      setCurrentLevel(0);
      setSliderPosition(50);
      setDirection(levels[0]?.direction || 1);
      setTotalMultiplier(1);
      setLevelResults([]);
      setTotalWin(0);
      
      // Show instructions for 3 seconds
      setTimeout(() => {
        if (levels.length > 0) {
          setGamePhase('playing');
          setIsMoving(true);
        }
      }, 3000);

    } catch (error) {
      console.error('Slide game error:', error);
      toast.error('Game failed. Please try again.');
      setGamePhase('idle');
    }
  };

  const stopSlider = async () => {
    if (!isMoving || currentLevel >= levels.length) return;

    setIsMoving(false);
    const level = levels[currentLevel];
    
    try {
      // Call secure game API endpoint
      const response = await fetch('/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          gameType: 'slide',
          gameParams: {
            betAmount,
            clientSeed: `slide-${Date.now()}`,
            nonce: Math.floor(Math.random() * 1000000),
            level: currentLevel,
            position: sliderPosition
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

      const hit = result.gameResult.isWin;

      const newResults = [...levelResults, hit];
      setLevelResults(newResults);

      if (hit) {
        const newMultiplier = totalMultiplier * level.multiplier;
        setTotalMultiplier(newMultiplier);
        toast.success(`Level ${currentLevel + 1} hit! Multiplier: ${newMultiplier.toFixed(2)}x`);
        
        if (currentLevel < levels.length - 1) {
          // Next level
          setTimeout(() => {
            setCurrentLevel(prev => prev + 1);
            setSliderPosition(50);
            setDirection(levels[currentLevel + 1]?.direction || 1);
            setIsMoving(true);
          }, 1500);
        } else {
          // Game complete - all levels passed
          completeGame(newMultiplier, true);
        }
      } else {
        toast.error(`Level ${currentLevel + 1} missed! Game over.`);
        completeGame(totalMultiplier, false);
      }
    } catch (error) {
      console.error('Slide game error:', error);
      toast.error('Game failed. Please try again.');
      setIsMoving(false);
      setGamePhase('idle');
    }
  };

  const completeGame = async (finalMultiplier: number, allLevelsPassed: boolean) => {
    setGamePhase('complete');
    setIsMoving(false);
    
    // Calculate final payout
    let payout = 0;
    if (finalMultiplier > 1) {
      payout = betAmount * finalMultiplier;
      
      // Bonus for completing all levels
      if (allLevelsPassed) {
        payout *= 1.5; // 50% bonus for perfect run
      }
    }
    
    setTotalWin(payout);

    if (payout > 0) {
      await payoutWin(payout, 'slide');
      toast.success(`Slide mastery! ${payout.toFixed(4)} MON with ${finalMultiplier.toFixed(2)}x multiplier!`);
    } else {
      toast('Practice makes perfect! Try again.');
    }

    setTimeout(() => {
      setGamePhase('idle');
      finalizeRound('slide');
    }, 5000);
  };

  const cashOut = async () => {
    if (gamePhase !== 'playing' || currentLevel === 0) return;

    setIsMoving(false);
    const payout = betAmount * totalMultiplier;
    setTotalWin(payout);

    await payoutWin(payout, 'slide');
    toast.success(`Cashed out! ${payout.toFixed(4)} MON with ${totalMultiplier.toFixed(2)}x multiplier!`);
    
    setGamePhase('complete');
    setTimeout(() => {
      setGamePhase('idle');
      finalizeRound('slide');
    }, 3000);
  };

  const getCurrentLevel = () => levels[currentLevel];
  const currentLevelData = getCurrentLevel();

  const getTargetZoneStyle = () => {
    if (!currentLevelData) return {};
    
    return {
      left: `${currentLevelData.targetPosition - currentLevelData.targetWidth / 2}%`,
      width: `${currentLevelData.targetWidth}%`,
    };
  };

  const getSliderStyle = () => {
    return {
      left: `${sliderPosition - 2}%`,
    };
  };

  return (
    <div className="casino-card max-w-4xl mx-auto">
      {/* Game Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">🎯 Slide</h2>
        <p className="text-white/70">Perfect timing precision game with multiplying rewards!</p>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-white/70 text-sm">Balance</div>
          <div className="text-white font-bold">{balance.toFixed(4)} MON</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-white/70 text-sm">Level</div>
          <div className="text-white font-bold">{currentLevel + 1}/10</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">⚡</div>
          <div className="text-white/70 text-sm">Speed</div>
          <div className="text-yellow-400 font-bold">{gameSpeed.toUpperCase()}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🔥</div>
          <div className="text-white/70 text-sm">Multiplier</div>
          <div className="text-orange-400 font-bold">{totalMultiplier.toFixed(2)}x</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <div className="text-white/70 text-sm">Win</div>
          <div className="text-green-400 font-bold">{totalWin.toFixed(4)}</div>
        </div>
      </div>

      {/* Game Area */}
      <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-2xl p-8 mb-6 min-h-[300px] flex flex-col justify-center">
        {gamePhase === 'instructions' && (
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <div className="text-white text-xl font-bold mb-4">Get Ready!</div>
            <div className="text-white/70">Click STOP when the slider is in the target zone</div>
            <div className="text-white/60 text-sm mt-2">Game starting in 3 seconds...</div>
          </div>
        )}

        {gamePhase === 'playing' && currentLevelData && (
          <>
            {/* Level Info */}
            <div className="text-center mb-6">
              <div className="text-white text-xl font-bold">
                Level {currentLevel + 1}: {currentLevelData.multiplier.toFixed(1)}x Multiplier
              </div>
              <div className="text-white/70 text-sm">
                Hit the {currentLevelData.color.includes('green') ? 'green' : 
                         currentLevelData.color.includes('blue') ? 'blue' :
                         currentLevelData.color.includes('yellow') ? 'yellow' :
                         currentLevelData.color.includes('orange') ? 'orange' :
                         currentLevelData.color.includes('red') ? 'red' :
                         currentLevelData.color.includes('purple') ? 'purple' :
                         currentLevelData.color.includes('pink') ? 'pink' :
                         currentLevelData.color.includes('indigo') ? 'indigo' :
                         currentLevelData.color.includes('cyan') ? 'cyan' : 'emerald'} zone
              </div>
            </div>

            {/* Slider Track */}
            <div className="relative h-16 bg-gray-700 rounded-xl mb-6 overflow-hidden">
              {/* Target Zone */}
              <div
                className={`absolute top-0 h-full bg-gradient-to-r ${currentLevelData.color} opacity-80 transition-all duration-300`}
                style={getTargetZoneStyle()}
              />
              
              {/* Slider */}
              <div
                className="absolute top-1 w-4 h-14 bg-white rounded-lg shadow-lg transition-all duration-75 border-2 border-gray-300"
                style={getSliderStyle()}
              />
              
              {/* Position markers */}
              <div className="absolute top-0 w-full h-full flex justify-between items-center px-2">
                {Array.from({ length: 11 }, (_, i) => (
                  <div key={i} className="w-0.5 h-8 bg-white/30" />
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={stopSlider}
                disabled={!isMoving}
                className="neon-button px-8 py-4 text-lg font-bold"
              >
                🎯 STOP
              </button>
              {currentLevel > 0 && (
                <button
                  onClick={cashOut}
                  className="px-6 py-3 bg-yellow-500/20 text-yellow-400 rounded-xl hover:bg-yellow-500/30 font-bold border border-yellow-500/50"
                >
                  💰 CASH OUT ({(betAmount * totalMultiplier).toFixed(4)} MON)
                </button>
              )}
            </div>
          </>
        )}

        {gamePhase === 'complete' && (
          <div className="text-center">
            <div className="text-6xl mb-4">
              {totalWin > 0 ? '🏆' : '😔'}
            </div>
            <div className={`text-2xl font-bold mb-4 ${totalWin > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalWin > 0 ? 'PRECISION MASTER!' : 'NICE TRY!'}
            </div>
            <div className="text-white/70">
              Final Multiplier: {totalMultiplier.toFixed(2)}x
            </div>
            <div className="text-white/70">
              Total Win: {totalWin.toFixed(4)} MON
            </div>
          </div>
        )}

        {gamePhase === 'idle' && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <div className="text-white text-xl font-bold mb-4">Slide Precision Game</div>
            <div className="text-white/70 mb-6">
              Test your timing across 10 increasingly difficult levels.<br/>
              Each level multiplies your winnings!
            </div>
          </div>
        )}
      </div>

      {/* Level Progress */}
      {levelResults.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-3">Level Progress</h3>
          <div className="flex gap-2 flex-wrap">
            {levelResults.map((hit, index) => (
              <div
                key={index}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  hit ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Bet Controls */}
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
                disabled={gamePhase !== 'idle' || isTransacting}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400 disabled:opacity-50"
              />
              <button
                onClick={() => setBetAmount(Math.min(5, betAmount * 2))}
                disabled={gamePhase !== 'idle' || isTransacting}
                className="px-4 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-50"
              >
                2x
              </button>
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Game Speed</label>
            <div className="flex gap-2">
              {(['slow', 'medium', 'fast'] as const).map((speed) => (
                <button
                  key={speed}
                  onClick={() => setGameSpeed(speed)}
                  disabled={gamePhase !== 'idle'}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all ${
                    gameSpeed === speed
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  } disabled:opacity-50`}
                >
                  {speed.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Level Multipliers Preview */}
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3">Level Multipliers ({gameSpeed} speed)</h3>
          <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
            {levels.slice(0, 5).map((level, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-white/70">Level {index + 1}:</span>
                <span className="text-green-400 font-bold">{level.multiplier.toFixed(1)}x</span>
              </div>
            ))}
            <div className="text-white/60 text-xs pt-1">+ 5 more levels...</div>
            <div className="border-t border-white/20 pt-2 mt-2">
              <div className="text-white/70 text-xs">
                • Complete all levels: +50% bonus<br/>
                • Higher speed = higher multipliers<br/>
                • Can cash out after any level
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={startGame}
        disabled={!isConnected || gamePhase !== 'idle' || isTransacting}
        className={`
          w-full py-4 rounded-xl font-bold text-lg transition-all
          ${gamePhase !== 'idle' || isTransacting
            ? 'bg-white/20 text-white/50 cursor-not-allowed'
            : 'neon-button hover:scale-105'
          }
        `}
      >
        {gamePhase === 'idle' ? (
          `🎯 START SLIDE GAME (${betAmount.toFixed(2)} MON)`
        ) : gamePhase === 'instructions' ? (
          'GET READY...'
        ) : gamePhase === 'playing' ? (
          `LEVEL ${currentLevel + 1} - STOP AT THE RIGHT TIME!`
        ) : (
          `${totalWin > 0 ? 'PRECISION MASTER!' : 'TRY AGAIN'} - ${totalWin.toFixed(4)} MON`
        )}
      </button>

      {/* Game Rules */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl">
        <h3 className="text-white font-bold mb-2">How to Play</h3>
        <ul className="text-white/70 text-sm space-y-1">
          <li>• Watch the slider move and click STOP when it's in the target zone</li>
          <li>• Each level increases the multiplier but makes timing harder</li>
          <li>• Miss a level = game over, but keep previous multipliers</li>
          <li>• Complete all 10 levels for a 50% bonus on top of multipliers</li>
          <li>• Can cash out after any completed level to secure winnings</li>
          <li>• Higher speed = higher risk but much bigger multipliers</li>
          <li>• RTP: 96% | House Edge: 4%</li>
        </ul>
      </div>
    </div>
  );
}