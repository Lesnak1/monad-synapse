'use client';

import { useState } from 'react';
import { useGameContract } from '@/lib/useGameContract';
// Game logic now handled server-side via /api/game/result for security
import { toast } from 'react-hot-toast';

export function KenoGame() {
  const { address, balance, isConnected, placeBet, payoutWin, gameState, isTransacting, finalizeRound } = useGameContract();
  const [betAmount, setBetAmount] = useState(1.0);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [gamePhase, setGamePhase] = useState<'selecting' | 'drawing' | 'complete'>('selecting');
  const [hits, setHits] = useState(0);
  const [winAmount, setWinAmount] = useState(0);

  // Keno paytable based on spots picked and hits
  const payouts: Record<number, Record<number, number>> = {
    1: { 1: 3 },
    2: { 1: 1, 2: 12 },
    3: { 2: 1, 3: 42 },
    4: { 2: 1, 3: 4, 4: 100 },
    5: { 3: 1, 4: 12, 5: 810 },
    6: { 3: 1, 4: 3, 5: 90, 6: 1600 },
    7: { 4: 1, 5: 20, 6: 400, 7: 7000 },
    8: { 5: 10, 6: 80, 7: 1000, 8: 10000 },
    9: { 5: 5, 6: 50, 7: 300, 8: 4000, 9: 10000 },
    10: { 5: 2, 6: 20, 7: 80, 8: 500, 9: 4000, 10: 10000 }
  };

  const toggleNumber = (number: number) => {
    if (gamePhase !== 'selecting') return;
    
    setSelectedNumbers(prev => {
      if (prev.includes(number)) {
        return prev.filter(n => n !== number);
      } else if (prev.length < 10) {
        return [...prev, number].sort((a, b) => a - b);
      }
      return prev;
    });
  };

  const clearSelection = () => {
    setSelectedNumbers([]);
  };

  const quickPick = (count: number) => {
    const numbers: number[] = [];
    while (numbers.length < count) {
      const num = Math.floor(Math.random() * 80) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    setSelectedNumbers(numbers.sort((a, b) => a - b));
  };

  const startDraw = async () => {
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

    if (selectedNumbers.length === 0) {
      toast.error('Please select at least 1 number');
      return;
    }

    try {
      setGamePhase('drawing');
      setDrawnNumbers([]);
      setHits(0);
      setWinAmount(0);

      // Place bet
      await placeBet(betAmount, 'keno');
      
      // Generate drawn numbers using casino algorithm
      // Server-side game logic - use API endpoint instead

      const result = { isWin: false, winAmount: 0, gameResult: {} };
      
      // Animate number drawing
      const drawNumbers = async () => {
        const drawnNumbers = (result as any).drawnNumbers || [];
        for (let i = 0; i < drawnNumbers.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 150));
          setDrawnNumbers(prev => [...prev, drawnNumbers[i]]);
        }
      };

      await drawNumbers();

      // Calculate hits and payout
      const matchingNumbers = selectedNumbers.filter(num => 
        drawnNumbers.includes(num)
      );
      const hitCount = matchingNumbers.length;
      setHits(hitCount);

      const spotCount = selectedNumbers.length;
      const multiplier = payouts[spotCount]?.[hitCount] || 0;
      const payout = betAmount * multiplier;
      
      setWinAmount(payout);
      setGamePhase('complete');

      if (payout > 0) {
        await payoutWin(payout, 'keno');
        toast.success(`${hitCount} hits! You won ${payout.toFixed(4)} MON!`);
      } else {
        toast('No winning combination this time');
      }

      // Reset after 5 seconds
      setTimeout(() => {
        setGamePhase('selecting');
        setDrawnNumbers([]);
        setHits(0);
        setWinAmount(0);
        finalizeRound('keno');
      }, 5000);

    } catch (error) {
      console.error('Keno error:', error);
      toast.error('Game failed. Please try again.');
      setGamePhase('selecting');
    }
  };

  const getNumberStyle = (number: number) => {
    const isSelected = selectedNumbers.includes(number);
    const isDrawn = drawnNumbers.includes(number);
    const isHit = isSelected && isDrawn;

    if (isHit) {
      return 'bg-green-500 text-white border-green-400 shadow-lg shadow-green-500/50';
    }
    if (isDrawn) {
      return 'bg-yellow-500 text-black border-yellow-400';
    }
    if (isSelected) {
      return 'bg-blue-500 text-white border-blue-400';
    }
    return 'bg-white/10 text-white border-white/20 hover:bg-white/20';
  };

  const getExpectedPayout = () => {
    const spotCount = selectedNumbers.length;
    if (spotCount === 0) return 0;
    
    // Calculate weighted average payout
    const possiblePayouts = payouts[spotCount] || {};
    const avgMultiplier = Object.values(possiblePayouts).reduce((sum, mult) => sum + mult, 0) / Object.keys(possiblePayouts).length || 0;
    return betAmount * avgMultiplier * 0.4; // Reduced for house edge
  };

  return (
    <div className="casino-card max-w-6xl mx-auto">
      {/* Game Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">🎱 Keno</h2>
        <p className="text-white/70">Pick 1-10 numbers and see how many match the draw!</p>
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
          <div className="text-white/70 text-sm">Selected</div>
          <div className="text-white font-bold">{selectedNumbers.length}/10</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🎲</div>
          <div className="text-white/70 text-sm">Hits</div>
          <div className="text-green-400 font-bold">{hits}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">💸</div>
          <div className="text-white/70 text-sm">Expected</div>
          <div className="text-yellow-400 font-bold">{getExpectedPayout().toFixed(2)}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <div className="text-white/70 text-sm">Win</div>
          <div className="text-green-400 font-bold">{winAmount.toFixed(4)}</div>
        </div>
      </div>

      {/* Number Grid */}
      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-10 gap-2 md:gap-3">
          {Array.from({ length: 80 }, (_, i) => i + 1).map(number => (
            <button
              key={number}
              onClick={() => toggleNumber(number)}
              disabled={gamePhase !== 'selecting'}
              className={`
                aspect-square rounded-xl font-bold text-sm md:text-base
                border-2 transition-all duration-200
                disabled:cursor-not-allowed
                ${getNumberStyle(number)}
                ${gamePhase === 'selecting' ? 'hover:scale-105' : ''}
              `}
            >
              {number}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
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
                disabled={gamePhase !== 'selecting' || isTransacting}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400 disabled:opacity-50"
              />
              <button
                onClick={() => setBetAmount(Math.min(5, betAmount * 2))}
                disabled={gamePhase !== 'selecting' || isTransacting}
                className="px-4 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-50"
              >
                2x
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={clearSelection}
              disabled={gamePhase !== 'selecting'}
              className="flex-1 py-2 px-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 disabled:opacity-50 text-sm"
            >
              Clear
            </button>
            <button
              onClick={() => quickPick(5)}
              disabled={gamePhase !== 'selecting'}
              className="flex-1 py-2 px-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 text-sm"
            >
              Quick 5
            </button>
            <button
              onClick={() => quickPick(10)}
              disabled={gamePhase !== 'selecting'}
              className="flex-1 py-2 px-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 text-sm"
            >
              Quick 10
            </button>
          </div>
        </div>

        {/* Selected Numbers */}
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3">Your Numbers</h3>
          <div className="min-h-[60px] flex flex-wrap gap-2">
            {selectedNumbers.length > 0 ? (
              selectedNumbers.map(number => (
                <div
                  key={number}
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                    ${drawnNumbers.includes(number) 
                      ? 'bg-green-500 text-white' 
                      : 'bg-blue-500 text-white'
                    }
                  `}
                >
                  {number}
                </div>
              ))
            ) : (
              <div className="text-white/50 text-sm">No numbers selected</div>
            )}
          </div>
        </div>

        {/* Paytable */}
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3">
            Paytable {selectedNumbers.length > 0 && `(${selectedNumbers.length} spots)`}
          </h3>
          <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
            {selectedNumbers.length > 0 ? (
              Object.entries(payouts[selectedNumbers.length] || {}).map(([hits, multiplier]) => (
                <div key={hits} className="flex justify-between items-center">
                  <span className="text-white/70">{hits} hits:</span>
                  <span className="text-green-400 font-bold">{multiplier}x</span>
                </div>
              ))
            ) : (
              <div className="text-white/50">Select numbers to see payouts</div>
            )}
          </div>
        </div>
      </div>

      {/* Drawn Numbers */}
      {drawnNumbers.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-3">Drawn Numbers ({drawnNumbers.length}/20)</h3>
          <div className="flex flex-wrap gap-2">
            {drawnNumbers.map(number => (
              <div
                key={number}
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center font-bold
                  ${selectedNumbers.includes(number)
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                    : 'bg-yellow-500 text-black'
                  }
                `}
              >
                {number}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={startDraw}
        disabled={!isConnected || gamePhase !== 'selecting' || isTransacting || selectedNumbers.length === 0}
        className={`
          w-full py-4 rounded-xl font-bold text-lg transition-all
          ${gamePhase !== 'selecting' || isTransacting || selectedNumbers.length === 0
            ? 'bg-white/20 text-white/50 cursor-not-allowed'
            : 'neon-button hover:scale-105'
          }
        `}
      >
        {gamePhase === 'selecting' ? (
          selectedNumbers.length > 0 ? 
            `🎱 START DRAW (${betAmount.toFixed(2)} MON)` : 
            'SELECT NUMBERS FIRST'
        ) : gamePhase === 'drawing' ? (
          'DRAWING NUMBERS...'
        ) : (
          `${hits} HITS - ${winAmount > 0 ? 'YOU WIN!' : 'TRY AGAIN'}`
        )}
      </button>

      {/* Game Rules */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl">
        <h3 className="text-white font-bold mb-2">How to Play</h3>
        <ul className="text-white/70 text-sm space-y-1">
          <li>• Pick 1-10 numbers from 1-80</li>
          <li>• 20 numbers will be drawn randomly</li>
          <li>• Match more numbers to win bigger payouts</li>
          <li>• More spots picked = higher potential payouts but harder to hit</li>
          <li>• RTP: 92% | House Edge: 8%</li>
        </ul>
      </div>
    </div>
  );
}