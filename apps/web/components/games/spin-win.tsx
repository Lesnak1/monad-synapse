'use client';

import { useState, useEffect } from 'react';
import { useGameContract } from '@/lib/useGameContract';
// Game logic now handled server-side via /api/game/result for security
import { toast } from 'react-hot-toast';

export function SpinWinGame() {
  const { address, balance, isConnected, placeBet, payoutWin, gameState, isTransacting, finalizeRound } = useGameContract();
  const [betAmount, setBetAmount] = useState(1.0);
  const [selectedLines, setSelectedLines] = useState(25);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState([
    ['🍒', '🍋', '🍊'],
    ['🍇', '🍒', '⭐'],
    ['🍋', '🍊', '🍇'],
    ['⭐', '🍒', '🍋'],
    ['🍊', '🍇', '⭐']
  ]);
  const [winAmount, setWinAmount] = useState(0);
  const [winLines, setWinLines] = useState<number[]>([]);

  const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🔔'];
  const payouts = {
    '🍒': 2, '🍋': 2.5, '🍊': 3, '🍇': 4, 
    '⭐': 10, '💎': 50, '🔔': 100
  };

  const lines = [
    [0, 0, 0, 0, 0], // Top line
    [1, 1, 1, 1, 1], // Middle line  
    [2, 2, 2, 2, 2], // Bottom line
    [0, 1, 2, 1, 0], // V shape
    [2, 1, 0, 1, 2], // ^ shape
    [0, 0, 1, 2, 2], // Diagonal down
    [2, 2, 1, 0, 0], // Diagonal up
    [1, 0, 0, 0, 1], // W shape
    [1, 2, 2, 2, 1], // M shape
    [0, 1, 0, 1, 0], // Zigzag 1
    [2, 1, 2, 1, 2], // Zigzag 2
    [1, 0, 1, 2, 1], // Cross
    [0, 2, 0, 2, 0], // Up-down
    [2, 0, 2, 0, 2], // Down-up
    [1, 1, 0, 1, 1], // Dip down
    [1, 1, 2, 1, 1], // Dip up
    [0, 0, 2, 0, 0], // Bottom V
    [2, 2, 0, 2, 2], // Top ^
    [0, 1, 1, 1, 0], // Plateau
    [2, 1, 1, 1, 2], // Valley
    [1, 0, 2, 0, 1], // X pattern 1
    [1, 2, 0, 2, 1], // X pattern 2
    [0, 0, 0, 1, 2], // Stair up
    [2, 2, 2, 1, 0], // Stair down
    [1, 0, 1, 0, 1], // Checker 1
  ];

  const generateReels = () => {
    const newReels = [];
    for (let i = 0; i < 5; i++) {
      const reel = [];
      for (let j = 0; j < 3; j++) {
        const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        reel.push(randomSymbol);
      }
      newReels.push(reel);
    }
    return newReels;
  };

  const checkWinningLines = (gameReels: string[][]) => {
    const wins = [];
    let totalWin = 0;

    for (let i = 0; i < selectedLines; i++) {
      const line = lines[i];
      const lineSymbols = line.map((row, col) => gameReels[col][row]);
      
      // Check for matching symbols (minimum 3)
      let matchCount = 1;
      const firstSymbol = lineSymbols[0];
      
      for (let j = 1; j < lineSymbols.length; j++) {
        if (lineSymbols[j] === firstSymbol) {
          matchCount++;
        } else {
          break;
        }
      }

      if (matchCount >= 3) {
        const symbol = firstSymbol as keyof typeof payouts;
        const linePayout = (payouts[symbol] || 1) * betAmount * matchCount;
        wins.push(i);
        totalWin += linePayout;
      }
    }

    return { winningLines: wins, totalWin };
  };

  const handleSpin = async () => {
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
      setSpinning(true);
      setWinAmount(0);
      setWinLines([]);

      // Place bet
      await placeBet(betAmount, 'spin-win');
      
      // Call secure game API endpoint
      const response = await fetch('/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          gameType: 'slots',
          gameParams: {
            betAmount,
            clientSeed: `spin-${Date.now()}`,
            nonce: Math.floor(Math.random() * 1000000),
            lines: selectedLines
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
      
      // Animate spin
      const spinDuration = 2000;
      const spinInterval = setInterval(() => {
        setReels(generateReels());
      }, 100);

      setTimeout(() => {
        clearInterval(spinInterval);
        
        // Set final result from server
        const finalReels = result.gameResult.reels || generateReels();
        setReels(finalReels);
        
        // Use server-calculated wins
        const totalWin = result.winAmount || 0;
        setWinLines(result.gameResult.winningLines || []);
        setWinAmount(totalWin);

        if (totalWin > 0) {
          payoutWin(totalWin, 'spin-win');
          toast.success(`You won ${totalWin.toFixed(4)} MON!`);
        } else {
          toast('No winning combination this time');
        }

        setSpinning(false);
        finalizeRound('spin-win');
      }, spinDuration);

    } catch (error) {
      console.error('Spin error:', error);
      toast.error('Spin failed. Please try again.');
      setSpinning(false);
      finalizeRound('spin-win');
    }
  };

  return (
    <div className="casino-card max-w-4xl mx-auto">
      {/* Game Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">🎰 Spin Win</h2>
        <p className="text-white/70">Classic 5-reel slot machine with 25 paylines</p>
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
          <div className="text-white/70 text-sm">Lines</div>
          <div className="text-white font-bold">{selectedLines}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🎲</div>
          <div className="text-white/70 text-sm">Bet/Line</div>
          <div className="text-white font-bold">{(betAmount / selectedLines).toFixed(4)}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <div className="text-white/70 text-sm">Last Win</div>
          <div className="text-green-400 font-bold">{winAmount.toFixed(4)}</div>
        </div>
      </div>

      {/* Slot Machine */}
      <div className="bg-gradient-to-b from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 mb-6">
        <div className="bg-black/50 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-5 gap-2">
            {reels.map((reel, colIndex) => (
              <div key={colIndex} className="space-y-1">
                {reel.map((symbol, rowIndex) => (
                  <div
                    key={rowIndex}
                    className={`
                      bg-white/10 rounded-lg h-16 flex items-center justify-center text-3xl
                      transition-all duration-200 border-2
                      ${spinning ? 'animate-pulse border-yellow-400' : 'border-white/20'}
                    `}
                  >
                    {symbol}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Winning Lines Indicator */}
        {winLines.length > 0 && (
          <div className="text-center mb-4">
            <div className="text-green-400 font-bold text-lg mb-2">
              🎉 Winning Lines: {winLines.join(', ')}
            </div>
            <div className="text-yellow-400 text-2xl font-bold">
              WIN: {winAmount.toFixed(4)} MON
            </div>
          </div>
        )}
      </div>

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
                disabled={spinning || isTransacting}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400 disabled:opacity-50"
              />
              <button
                onClick={() => setBetAmount(Math.min(5, betAmount * 2))}
                disabled={spinning || isTransacting}
                className="px-4 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-50"
              >
                2x
              </button>
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Active Lines: {selectedLines}</label>
            <input
              type="range"
              value={selectedLines}
              onChange={(e) => setSelectedLines(parseInt(e.target.value))}
              min="1"
              max="25"
              disabled={spinning || isTransacting}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-white/50 mt-1">
              <span>1</span>
              <span>25</span>
            </div>
          </div>
        </div>

        {/* Paytable */}
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3">Paytable (3+ symbols)</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(payouts).map(([symbol, multiplier]) => (
              <div key={symbol} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{symbol}</span>
                  <span className="text-white/70">x3</span>
                </div>
                <span className="text-green-400">{multiplier}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleSpin}
          disabled={!isConnected || spinning || isTransacting || betAmount < 0.1 || betAmount > balance}
          className={`
            flex-1 py-4 rounded-xl font-bold text-lg transition-all
            ${spinning || isTransacting
              ? 'bg-white/20 text-white/50 cursor-not-allowed'
              : 'neon-button hover:scale-105'
            }
          `}
        >
          {spinning ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              SPINNING...
            </div>
          ) : (
            `🎰 SPIN (${(betAmount * selectedLines).toFixed(2)} MON)`
          )}
        </button>

        <button
          onClick={() => setBetAmount(Math.max(0.1, betAmount / 2))}
          disabled={spinning || isTransacting}
          className="px-6 py-4 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-50 transition-all"
        >
          ½ Bet
        </button>

        <button
          onClick={() => setBetAmount(Math.min(5, balance))}
          disabled={spinning || isTransacting}
          className="px-6 py-4 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-50 transition-all"
        >
          Max
        </button>
      </div>

      {/* Game Rules */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl">
        <h3 className="text-white font-bold mb-2">How to Play</h3>
        <ul className="text-white/70 text-sm space-y-1">
          <li>• Select your bet amount and number of active paylines</li>
          <li>• Spin the reels and match 3 or more symbols on active lines</li>
          <li>• Higher value symbols pay more - Diamond and Bell are jackpots!</li>
          <li>• More matching symbols = higher multiplier</li>
          <li>• RTP: 91.5% | House Edge: 8.5%</li>
        </ul>
      </div>
    </div>
  );
}