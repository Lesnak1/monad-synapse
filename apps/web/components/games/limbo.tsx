'use client';

import { useState, useEffect } from 'react';
import { useGameContract } from '@/lib/useGameContract';
// Game logic now handled server-side via /api/game/result for security
import { toast } from 'react-hot-toast';

export function LimboGame() {
  const { address, balance, isConnected, placeBet, payoutWin, gameState, isTransacting, finalizeRound } = useGameContract();
  const [betAmount, setBetAmount] = useState(1.0);
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);
  const [gamePhase, setGamePhase] = useState<'betting' | 'flying' | 'crashed' | 'won'>('betting');
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [isFlying, setIsFlying] = useState(false);
  const [gameHistory, setGameHistory] = useState<number[]>([]);

  const potentialPayout = betAmount * targetMultiplier;

  const startFlight = async () => {
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

    if (targetMultiplier < 1.01) {
      toast.error('Target multiplier must be at least 1.01x');
      return;
    }

    try {
      setGamePhase('flying');
      setIsFlying(true);
      setCurrentMultiplier(1.0);

      // Place bet
      await placeBet(betAmount, 'limbo');
      
      // Call secure game API endpoint
      const response = await fetch('/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          gameType: 'crash',
          gameParams: {
            betAmount,
            clientSeed: `limbo${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
            nonce: Math.floor(Math.random() * 1000000),
            multiplier: targetMultiplier
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

      setCrashPoint(result.gameResult.crashPoint);
      
      // Animate flight
      const startTime = Date.now();
      const flightDuration = Math.min(result.gameResult.crashPoint * 1000, 10000); // Max 10 seconds
      
      const animateMultiplier = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / flightDuration, 1);
        
        // Exponential growth curve
        const currentMult = 1 + (result.gameResult.crashPoint - 1) * progress;
        setCurrentMultiplier(currentMult);

        if (progress < 1 && isFlying) {
          requestAnimationFrame(animateMultiplier);
        } else {
          // Flight ended
          setIsFlying(false);
          
          if (result.gameResult.crashPoint >= targetMultiplier) {
            // Won!
            setGamePhase('won');
            const winAmount = betAmount * targetMultiplier;
            payoutWin(winAmount, 'limbo');
            toast.success(`🚀 Rocket flew to ${result.gameResult.crashPoint.toFixed(2)}x! You won ${winAmount.toFixed(4)} MON!`);
          } else {
            // Crashed before target
            setGamePhase('crashed');
            toast.error(`💥 Rocket crashed at ${result.gameResult.crashPoint.toFixed(2)}x!`);
          }

          // Add to history
          setGameHistory(prev => [result.gameResult.crashPoint, ...prev.slice(0, 9)]);
          
          // Reset after 3 seconds
          setTimeout(() => {
            setGamePhase('betting');
            setCurrentMultiplier(1.0);
            setCrashPoint(0);
            finalizeRound('limbo');
          }, 3000);
        }
      };

      requestAnimationFrame(animateMultiplier);

    } catch (error) {
      console.error('Limbo error:', error);
      toast.error('Game failed. Please try again.');
      setGamePhase('betting');
      setIsFlying(false);
      setCurrentMultiplier(1.0);
    }
  };

  const getMultiplierColor = () => {
    if (gamePhase === 'crashed') return 'text-red-500';
    if (gamePhase === 'won') return 'text-green-500';
    if (currentMultiplier >= targetMultiplier) return 'text-green-400';
    return 'text-white';
  };

  const getRocketPosition = () => {
    const maxHeight = 200;
    const progress = Math.min((currentMultiplier - 1) / Math.max(targetMultiplier - 1, 1), 1);
    return maxHeight * (1 - progress);
  };

  return (
    <div className="casino-card max-w-4xl mx-auto">
      {/* Game Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">🚀 Limbo</h2>
        <p className="text-white/70">How high will the rocket fly before it crashes?</p>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-white/70 text-sm">Balance</div>
          <div className="text-white font-bold">{balance.toFixed(4)} MON</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-white/70 text-sm">Target</div>
          <div className="text-white font-bold">{targetMultiplier.toFixed(2)}x</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🚀</div>
          <div className="text-white/70 text-sm">Current</div>
          <div className={`font-bold ${getMultiplierColor()}`}>
            {currentMultiplier.toFixed(2)}x
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">💸</div>
          <div className="text-white/70 text-sm">Potential</div>
          <div className="text-green-400 font-bold">{potentialPayout.toFixed(4)}</div>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative bg-gradient-to-b from-blue-900/20 to-purple-900/20 rounded-2xl p-6 mb-6 overflow-hidden">
        {/* Background Stars */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Flight Area */}
        <div className="relative h-64 mb-6">
          {/* Multiplier Display */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className={`text-6xl font-bold ${getMultiplierColor()} text-center`}>
              {currentMultiplier.toFixed(2)}x
            </div>
            {gamePhase === 'crashed' && (
              <div className="text-red-500 text-xl font-bold text-center animate-pulse">
                💥 CRASHED!
              </div>
            )}
            {gamePhase === 'won' && (
              <div className="text-green-500 text-xl font-bold text-center animate-bounce">
                🎉 SUCCESS!
              </div>
            )}
          </div>

          {/* Rocket */}
          <div
            className={`absolute left-1/2 transform -translate-x-1/2 text-4xl transition-all duration-200 ${
              isFlying ? 'animate-pulse' : ''
            }`}
            style={{
              bottom: `${getRocketPosition()}px`,
            }}
          >
            🚀
          </div>

          {/* Ground */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-green-600 to-green-500 rounded-full" />
          
          {/* Target Line */}
          {targetMultiplier > 1 && (
            <div
              className="absolute left-0 right-0 h-0.5 bg-green-400 opacity-50 border-t-2 border-dashed border-green-400"
              style={{
                bottom: `${200 * (1 - 1 / targetMultiplier) + 8}px`,
              }}
            >
              <div className="absolute right-2 -top-6 text-green-400 text-sm">
                Target: {targetMultiplier}x
              </div>
            </div>
          )}
        </div>

        {/* Flight Path */}
        {gamePhase !== 'betting' && (
          <div className="text-center">
            <div className="text-white/70 text-sm">
              {gamePhase === 'flying' && 'Rocket is flying...'}
              {gamePhase === 'crashed' && `Crashed at ${crashPoint.toFixed(2)}x`}
              {gamePhase === 'won' && `Reached target at ${crashPoint.toFixed(2)}x`}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
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
                disabled={gamePhase !== 'betting' || isTransacting}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400 disabled:opacity-50"
              />
              <button
                onClick={() => setBetAmount(Math.min(5, betAmount * 2))}
                disabled={gamePhase !== 'betting' || isTransacting}
                className="px-4 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-50"
              >
                2x
              </button>
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Target Multiplier</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={targetMultiplier}
                onChange={(e) => setTargetMultiplier(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
                min="1.01"
                max="100"
                step="0.01"
                disabled={gamePhase !== 'betting' || isTransacting}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400 disabled:opacity-50"
              />
              <div className="flex gap-1">
                {[2, 5, 10].map(mult => (
                  <button
                    key={mult}
                    onClick={() => setTargetMultiplier(mult)}
                    disabled={gamePhase !== 'betting' || isTransacting}
                    className="px-3 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-50 text-sm"
                  >
                    {mult}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Game History */}
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3">Recent Flights</h3>
          <div className="grid grid-cols-5 gap-2">
            {gameHistory.map((multiplier, index) => (
              <div
                key={index}
                className={`
                  text-center py-2 px-1 rounded text-sm font-bold
                  ${multiplier >= 2 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                `}
              >
                {multiplier.toFixed(2)}x
              </div>
            ))}
            {gameHistory.length === 0 && (
              <div className="col-span-5 text-center text-white/50 py-4">
                No flights yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={startFlight}
        disabled={!isConnected || gamePhase !== 'betting' || isTransacting || betAmount < 0.1 || betAmount > balance}
        className={`
          w-full py-4 rounded-xl font-bold text-lg transition-all
          ${gamePhase !== 'betting' || isTransacting
            ? 'bg-white/20 text-white/50 cursor-not-allowed'
            : 'neon-button hover:scale-105'
          }
        `}
      >
        {gamePhase === 'betting' ? (
          `🚀 LAUNCH ROCKET (${betAmount.toFixed(2)} MON)`
        ) : gamePhase === 'flying' ? (
          'ROCKET FLYING...'
        ) : gamePhase === 'crashed' ? (
          '💥 CRASHED'
        ) : (
          '🎉 SUCCESS!'
        )}
      </button>

      {/* Game Rules */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl">
        <h3 className="text-white font-bold mb-2">How to Play</h3>
        <ul className="text-white/70 text-sm space-y-1">
          <li>• Set your bet amount and target multiplier</li>
          <li>• Launch the rocket and watch it fly</li>
          <li>• If the rocket reaches your target before crashing, you win!</li>
          <li>• Higher targets = higher risk but bigger rewards</li>
          <li>• RTP: 95% | House Edge: 5%</li>
        </ul>
      </div>
    </div>
  );
}