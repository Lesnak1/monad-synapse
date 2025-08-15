'use client';

import { useState } from 'react';
import { useGameContract } from '@/lib/useGameContract';
import { toast } from 'react-hot-toast';

export function WheelGame() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [bet, setBet] = useState<number>(0.1);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<'red' | 'black' | 'green' | null>(null);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [gameHistory, setGameHistory] = useState<number[]>([]);
  
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

  // European Roulette numbers (0-36)
  const numbers = Array.from({ length: 37 }, (_, i) => i);
  
  // Red numbers in European roulette
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

  const getNumberColor = (num: number) => {
    if (num === 0) return 'green';
    return redNumbers.includes(num) ? 'red' : 'black';
  };

  const spinWheel = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first!');
      return;
    }

    if (balance < bet) {
      toast.error('Insufficient MON balance!');
      return;
    }

    if (!selectedNumber && !selectedColor) {
      toast.error('Please select a number or color to bet on!');
      return;
    }

    try {
      setIsSpinning(true);
      
      // Place bet on blockchain
      await placeBet(bet, 'wheel');
      toast.success(`Wheel spinning: ${bet} MON`);
      
      // Generate random result
      const result = Math.floor(Math.random() * 37);
      const resultColor = getNumberColor(result);
      
      // Calculate spin rotation (multiple full rotations + result position)
      const newRotation = wheelRotation + 1800 + (result * (360 / 37));
      setWheelRotation(newRotation);
      
      // Simulate spinning duration
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setLastResult(result);
      setGameHistory(prev => [result, ...prev.slice(0, 9)]);
      
      // Check if won
      let won = false;
      let multiplier = 0;
      
      if (selectedNumber === result) {
        // Single number bet - 35:1 payout
        won = true;
        multiplier = 35;
      } else if (selectedColor === resultColor) {
        // Color bet - 1:1 payout (except green)
        if (selectedColor !== 'green') {
          won = true;
          multiplier = 1;
        } else if (result === 0) {
          // Green (0) bet - 35:1 payout
          won = true;
          multiplier = 35;
        }
      }
      
      if (won) {
        const winAmount = bet * (multiplier + 1); // Include original bet
        await payoutWin(winAmount, 'wheel');
        setLastWin(winAmount);
        toast.success(`You won ${winAmount.toFixed(4)} MON! (${multiplier + 1}x)`);
      } else {
        setLastWin(null);
        toast.error(`Result: ${result} ${resultColor.toUpperCase()} - Better luck next time!`);
      }
      
    } catch (error) {
      toast.error('Transaction failed. Please try again.');
    } finally {
      setIsSpinning(false);
      finalizeRound('wheel');
    }
  };

  const selectBet = (type: 'number' | 'color', value: number | string) => {
    if (type === 'number') {
      setSelectedNumber(value as number);
      setSelectedColor(null);
    } else {
      setSelectedColor(value as 'red' | 'black' | 'green');
      setSelectedNumber(null);
    }
  };

  const getNumberClass = (num: number) => {
    const color = getNumberColor(num);
    const baseClass = "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer transition-all hover:scale-110";
    
    const isSelected = selectedNumber === num;
    
    if (color === 'red') {
      return `${baseClass} bg-red-500 ${isSelected ? 'ring-2 ring-yellow-400 scale-110' : ''}`;
    } else if (color === 'black') {
      return `${baseClass} bg-gray-800 ${isSelected ? 'ring-2 ring-yellow-400 scale-110' : ''}`;
    } else {
      return `${baseClass} bg-green-500 ${isSelected ? 'ring-2 ring-yellow-400 scale-110' : ''}`;
    }
  };

  const getColorBetClass = (color: 'red' | 'black' | 'green') => {
    const baseClass = "px-6 py-3 rounded-xl font-bold text-white transition-all cursor-pointer hover:scale-105";
    const isSelected = selectedColor === color;
    
    if (color === 'red') {
      return `${baseClass} bg-red-500 ${isSelected ? 'ring-2 ring-yellow-400 scale-105' : ''}`;
    } else if (color === 'black') {
      return `${baseClass} bg-gray-800 ${isSelected ? 'ring-2 ring-yellow-400 scale-105' : ''}`;
    } else {
      return `${baseClass} bg-green-500 ${isSelected ? 'ring-2 ring-yellow-400 scale-105' : ''}`;
    }
  };

  return (
    <div className="casino-card max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🎡 Roulette Wheel</h2>
        <p className="text-white/70 text-sm">Place your bets and spin the wheel of fortune!</p>
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
            {lastResult !== null ? lastResult : '?'}
          </div>
          <div className="text-white/70 text-xs">Last Number</div>
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

      {/* Roulette Wheel */}
      <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-8 mb-6">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div 
              className={`w-64 h-64 rounded-full border-8 border-yellow-400 bg-gradient-to-r from-green-800 via-red-600 to-black transition-transform duration-3000 ease-out ${
                isSpinning ? 'animate-spin' : ''
              }`}
              style={{ transform: `rotate(${wheelRotation}deg)` }}
            >
              {/* Wheel segments - simplified visual */}
              <div className="absolute inset-4 rounded-full bg-gradient-conic from-red-500 via-black to-green-500 opacity-80"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-black">
                {lastResult !== null ? lastResult : '🎡'}
              </div>
            </div>
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
              <div className="w-4 h-8 bg-yellow-400 rounded-b-full"></div>
            </div>
          </div>
        </div>

        {/* Current Bet Display */}
        <div className="text-center text-white mb-4">
          {selectedNumber !== null && (
            <div>Betting on Number: <span className="font-bold text-yellow-400">{selectedNumber}</span> (35:1)</div>
          )}
          {selectedColor && (
            <div>Betting on Color: <span className={`font-bold ${
              selectedColor === 'red' ? 'text-red-400' : 
              selectedColor === 'black' ? 'text-gray-400' : 'text-green-400'
            }`}>
              {selectedColor.toUpperCase()}
            </span> ({selectedColor === 'green' ? '35:1' : '1:1'})</div>
          )}
          {!selectedNumber && !selectedColor && (
            <div className="text-white/60">Select a number or color to bet on</div>
          )}
        </div>
      </div>

      {/* Betting Options */}
      <div className="space-y-6 mb-6">
        {/* Number Betting */}
        <div>
          <h3 className="text-white font-semibold mb-3">Number Bets (35:1)</h3>
          <div className="grid grid-cols-10 gap-2">
            {numbers.map(num => (
              <button
                key={num}
                onClick={() => selectBet('number', num)}
                disabled={isSpinning}
                className={getNumberClass(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Color Betting */}
        <div>
          <h3 className="text-white font-semibold mb-3">Color Bets</h3>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => selectBet('color', 'red')}
              disabled={isSpinning}
              className={getColorBetClass('red')}
            >
              RED (1:1)
            </button>
            <button
              onClick={() => selectBet('color', 'black')}
              disabled={isSpinning}
              className={getColorBetClass('black')}
            >
              BLACK (1:1)
            </button>
            <button
              onClick={() => selectBet('color', 'green')}
              disabled={isSpinning}
              className={getColorBetClass('green')}
            >
              GREEN (35:1)
            </button>
          </div>
        </div>

        {/* Bet Amount */}
        <div>
          <label className="block text-white/70 text-sm mb-2">Bet Amount</label>
          <div className="flex items-center gap-2 max-w-sm mx-auto">
            <button 
              onClick={() => setBet(prev => Math.max(0.001, prev - 0.001))}
              disabled={isSpinning || isTransacting}
              className="casino-card px-3 py-2 text-white hover:bg-white/20 transition-colors"
            >
              -
            </button>
            <input
              type="number"
              value={bet.toFixed(4)}
              onChange={(e) => setBet(Math.max(0.001, parseFloat(e.target.value) || 0.001))}
              disabled={isSpinning || isTransacting}
              className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-center focus:outline-none focus:border-purple-400"
              step="0.001"
              min="0.001"
              max={balance}
            />
            <button 
              onClick={() => setBet(prev => Math.min(balance, prev + 0.001))}
              disabled={isSpinning || isTransacting}
              className="casino-card px-3 py-2 text-white hover:bg-white/20 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={spinWheel}
          disabled={!isConnected || isSpinning || isTransacting || balance < bet || (!selectedNumber && !selectedColor)}
          className={`w-full neon-button py-4 text-lg font-bold ${
            (!isConnected || isSpinning || isTransacting || balance < bet || (!selectedNumber && !selectedColor)) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {!isConnected
            ? 'CONNECT WALLET'
            : isSpinning
            ? 'SPINNING...'
            : isTransacting
            ? 'PROCESSING...'
            : (!selectedNumber && !selectedColor)
            ? 'SELECT YOUR BET'
            : 'SPIN WHEEL'
          }
        </button>
        
        <button
          onClick={() => {
            setSelectedNumber(null);
            setSelectedColor(null);
          }}
          disabled={isSpinning}
          className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl transition-colors"
        >
          Clear Bets
        </button>
      </div>

      {/* Game History */}
      {gameHistory.length > 0 && (
        <div className="mt-6">
          <div className="text-white/70 text-sm mb-3">Recent Results:</div>
          <div className="flex gap-2 justify-center flex-wrap">
            {gameHistory.map((result, i) => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                getNumberColor(result) === 'red' ? 'bg-red-500' :
                getNumberColor(result) === 'black' ? 'bg-gray-800' : 'bg-green-500'
              }`}>
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wallet Connection Status */}
      {isConnected && address && (
        <div className="mt-4 text-center text-xs text-white/60">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      )}

      {/* Game Rules */}
      <div className="mt-6 text-xs text-white/60">
        <div className="font-semibold mb-2">How to Play:</div>
        <div>• Single number bet: 35:1 payout</div>
        <div>• Red/Black color bet: 1:1 payout</div>
        <div>• Green (0) color bet: 35:1 payout</div>
        <div>• Place your bet and spin the wheel</div>
        <div>• Win based on where the ball lands</div>
      </div>
    </div>
  );
}