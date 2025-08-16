'use client';

import { useState, useRef, useEffect } from 'react';
import { useGameContract } from '@/lib/useGameContract';
import { toast } from 'react-hot-toast';

export function PlinkoGame() {
  const [isDropping, setIsDropping] = useState(false);
  const [bet, setBet] = useState<number>(0.1);
  const [ballPath, setBallPath] = useState<number[]>([]);
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  
  const {
    address,
    isConnected,
    balance,
    poolBalance,
    isTransacting,
    placeBet,
    payoutWin,
    finalizeRound,
  } = useGameContract();

  // Plinko multipliers based on risk level
  const multipliers = {
    low: [1.5, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.5],
    medium: [5.6, 2.1, 1.1, 1.0, 0.5, 0.3, 0.5, 1.0, 1.1, 2.1, 5.6],
    high: [29.0, 8.1, 3.0, 1.5, 1.0, 0.5, 0.2, 0.2, 0.5, 1.0, 1.5, 3.0, 8.1, 29.0]
  };

  const currentMultipliers = multipliers[risk];
  const rows = risk === 'high' ? 12 : risk === 'medium' ? 10 : 8;

  const dropBall = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first!');
      return;
    }

    if (balance < bet) {
      toast.error('Insufficient MON balance!');
      return;
    }

    try {
      setIsDropping(true);
      
      // Place bet on blockchain
      await placeBet(bet, 'plinko');
      toast.success(`Ball dropped: ${bet} MON`);
      
      // Simulate ball dropping with physics
      const path: number[] = [];
      let position = Math.floor(currentMultipliers.length / 2); // Start from center
      
      for (let i = 0; i < rows; i++) {
        // Random direction (left or right)
        const direction = Math.random() > 0.5 ? 1 : -1;
        position = Math.max(0, Math.min(currentMultipliers.length - 1, position + direction));
        path.push(position);
        
        // Visual delay for ball animation
        await new Promise(resolve => setTimeout(resolve, 200));
        setBallPath([...path]);
      }

      // Final position determines multiplier
      const finalMultiplier = currentMultipliers[position];
      const winAmount = bet * finalMultiplier;
      
      setLastMultiplier(finalMultiplier);
      
      if (finalMultiplier >= 1.0) {
        // Winner
        await payoutWin(winAmount, 'plinko');
        setLastWin(winAmount);
        toast.success(`You won ${winAmount.toFixed(4)} MON! (${finalMultiplier}x)`);
      } else {
        // Partial loss
        if (finalMultiplier > 0) {
          await payoutWin(winAmount, 'plinko');
          setLastWin(winAmount);
          toast.error(`Partial win: ${winAmount.toFixed(4)} MON (${finalMultiplier}x)`);
        } else {
          setLastWin(null);
          toast.error('Better luck next time!');
        }
      }
      
    } catch (error) {
      toast.error('Transaction failed. Please try again.');
    } finally {
      setIsDropping(false);
      
      // Reset after animation
      setTimeout(() => {
        setBallPath([]);
        finalizeRound('plinko');
      }, 2000);
    }
  };

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 10) return 'text-red-400 bg-red-500/20';
    if (multiplier >= 5) return 'text-orange-400 bg-orange-500/20';
    if (multiplier >= 2) return 'text-yellow-400 bg-yellow-500/20';
    if (multiplier >= 1) return 'text-green-400 bg-green-500/20';
    return 'text-red-300 bg-red-900/20';
  };

  return (
    <div className="casino-card max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🎲 Plinko</h2>
        <p className="text-white/70 text-sm">Drop the ball and watch it bounce to fortune!</p>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="casino-card text-center p-3">
          <div className="text-green-400 font-bold">💰 {balance.toFixed(4)} MON</div>
          <div className="text-white/70 text-xs">Balance</div>
        </div>
        <div className="casino-card text-center p-3">
          <div className="text-purple-400 font-bold">{bet.toFixed(4)} MON</div>
          <div className="text-white/70 text-xs">Bet</div>
        </div>
        <div className="casino-card text-center p-3">
          <div className="text-yellow-400 font-bold">
            {lastMultiplier ? `${lastMultiplier}x` : '0x'}
          </div>
          <div className="text-white/70 text-xs">Last Multiplier</div>
        </div>
        <div className="casino-card text-center p-3">
          <div className={`font-bold ${lastWin ? 'text-green-400' : 'text-white/50'}`}>
            {lastWin ? `+${lastWin.toFixed(4)} MON` : '0 MON'}
          </div>
          <div className="text-white/70 text-xs">Last Win</div>
        </div>
      </div>

      {/* Pool Balance */}
      <div className="casino-card text-center p-3 mb-6">
        <div className="text-blue-400 font-bold">🏦 {poolBalance.toFixed(4)} MON</div>
        <div className="text-white/70 text-xs">Pool Balance</div>
      </div>

      {/* Game Settings */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-white/70 text-sm mb-2">Risk Level</label>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value as 'low' | 'medium' | 'high')}
            disabled={isDropping}
            className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400"
          >
            <option value="low" className="bg-gray-800">Low Risk</option>
            <option value="medium" className="bg-gray-800">Medium Risk</option>
            <option value="high" className="bg-gray-800">High Risk</option>
          </select>
        </div>
        <div>
          <label className="block text-white/70 text-sm mb-2">Bet Amount</label>
          <input
            type="number"
            value={bet.toFixed(4)}
            onChange={(e) => setBet(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
            disabled={isDropping}
            className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400"
            step="0.1"
            min="0.1"
            max={balance}
          />
        </div>
        <div>
          <label className="block text-white/70 text-sm mb-2">Max Multiplier</label>
          <div className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-center text-white">
            {Math.max(...currentMultipliers)}x
          </div>
        </div>
      </div>

      {/* Plinko Board */}
      <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-6 mb-6">
        <div className="relative">
          {/* Ball Drop Point */}
          <div className="flex justify-center mb-4">
            <div className={`w-6 h-6 rounded-full transition-all duration-500 ${
              isDropping ? 'bg-yellow-400 animate-bounce' : 'bg-white/40'
            }`}>
              {isDropping && ballPath.length === 0 && '⚪'}
            </div>
          </div>

          {/* Pegs Grid */}
          <div className="space-y-4 mb-8">
            {Array.from({ length: rows }, (_, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-8">
                {Array.from({ length: rowIndex + 2 }, (_, pegIndex) => (
                  <div 
                    key={pegIndex}
                    className="w-2 h-2 bg-white/60 rounded-full"
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Ball Animation */}
          {isDropping && ballPath.length > 0 && (
            <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
              <div className="text-2xl animate-bounce">⚪</div>
            </div>
          )}
        </div>

        {/* Multiplier Slots */}
        <div className="grid gap-1 justify-center" 
             style={{ gridTemplateColumns: `repeat(${currentMultipliers.length}, minmax(0, 1fr))` }}>
          {currentMultipliers.map((multiplier, index) => (
            <div
              key={index}
              className={`px-2 py-3 rounded-lg text-center font-bold text-sm border-2 transition-all duration-300 ${
                getMultiplierColor(multiplier)
              } ${
                lastMultiplier === multiplier && ballPath.length > 0 
                  ? 'border-yellow-400 scale-110 shadow-lg shadow-yellow-400/50' 
                  : 'border-transparent'
              }`}
            >
              {multiplier}x
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={dropBall}
        disabled={!isConnected || isDropping || isTransacting || balance < bet}
        className={`w-full neon-button py-4 text-lg font-bold ${
          (!isConnected || isDropping || isTransacting || balance < bet) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {!isConnected
          ? 'CONNECT WALLET'
          : isDropping
          ? 'BALL DROPPING...'
          : isTransacting
          ? 'PROCESSING...'
          : 'DROP BALL'
        }
      </button>

      {/* Wallet Connection Status */}
      {isConnected && address && (
        <div className="mt-4 text-center text-xs text-white/60">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      )}

      {/* Game Rules */}
      <div className="mt-6 text-xs text-white/60">
        <div className="font-semibold mb-2">How to Play:</div>
        <div>• Choose your risk level (Low/Medium/High)</div>
        <div>• Set your bet amount</div>
        <div>• Drop the ball and watch it bounce</div>
        <div>• Win based on the multiplier slot it lands in</div>
        <div>• Higher risk = higher potential rewards</div>
      </div>
    </div>
  );
}