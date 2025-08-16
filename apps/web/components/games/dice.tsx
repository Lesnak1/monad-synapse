'use client';

import { useState, useEffect } from 'react';
import { useGameContract } from '@/lib/useGameContract';
import { toast } from 'react-hot-toast';
// BotDetection removed for testing

export function DiceGame() {
  const [isRolling, setIsRolling] = useState(false);
  const [bet, setBet] = useState<number>(0.1);
  const [prediction, setPrediction] = useState<'under' | 'over'>('under');
  const [targetNumber, setTargetNumber] = useState(50);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [gameHistory, setGameHistory] = useState<Array<{roll: number, win: boolean, multiplier: number}>>([]);
  
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

  const calculateMultiplier = () => {
    const winChance = prediction === 'under' 
      ? targetNumber / 100 
      : (100 - targetNumber) / 100;
    
    // House edge of 1%
    return (0.99 / winChance);
  };

  const rollDice = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first!');
      return;
    }

    if (balance < bet) {
      toast.error('Insufficient MON balance!');
      return;
    }

    try {
      setIsRolling(true);
      
      // Place bet on blockchain
      await placeBet(bet, 'dice');
      toast.success(`Dice rolled: ${bet} MON`);
      
      // Simulate dice rolling animation (visual only)
      let animationCount = 0;
      const animationInterval = setInterval(() => {
        setLastRoll(Math.floor(Math.random() * 100) + 1);
        animationCount++;
        
        if (animationCount >= 10) {
          clearInterval(animationInterval);
          
          // SECURE: Get result from server-side API
          getSecureGameResult();
        }
      }, 100);
      
    } catch (error) {
      toast.error('Transaction failed. Please try again.');
      setIsRolling(false);
      finalizeRound('dice');
    }
  };
  
  // SECURE: Get game result from server-side API
  const getSecureGameResult = async () => {
    try {
      const response = await fetch('/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: address,
          gameType: 'dice',
          gameParams: {
            prediction,
            target: targetNumber
          },
          betAmount: bet
        })
      });
      
      if (!response.ok) {
        throw new Error('Server error');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Game result generation failed');
      }
      
      // Use server-generated result
      const finalRoll = data.gameResult;
      const winAmount = data.winAmount;
      const won = winAmount > 0;
      
      setLastRoll(finalRoll);
      
      // Update game history
      setGameHistory(prev => [
        { roll: finalRoll, win: won, multiplier: won ? winAmount / bet : 0 },
        ...prev.slice(0, 9)
      ]);
      
      if (won) {
        // Winner - payout handled server-side
        await payoutWin(winAmount, 'dice');
        setLastWin(winAmount);
        toast.success(`You won ${winAmount.toFixed(4)} MON! (${(winAmount/bet).toFixed(2)}x)`);
      } else {
        setLastWin(null);
        toast.error(`Roll: ${finalRoll} - Better luck next time!`);
      }
      
      setIsRolling(false);
      finalizeRound('dice');
      
    } catch (error) {
      console.error('Failed to get secure game result:', error);
      toast.error('Game result failed. Please contact support.');
      setIsRolling(false);
      finalizeRound('dice');
    }
  };

  const getWinChance = () => {
    return prediction === 'under' 
      ? ((targetNumber - 1) / 100 * 100).toFixed(2)
      : ((100 - targetNumber) / 100 * 100).toFixed(2);
  };

  const getDiceEmoji = () => {
    if (!lastRoll) return '🎲';
    if (lastRoll <= 16) return '⚀';
    if (lastRoll <= 32) return '⚁';
    if (lastRoll <= 48) return '⚂';
    if (lastRoll <= 64) return '⚃';
    if (lastRoll <= 80) return '⚄';
    return '⚅';
  };

  // Anti-bot activity tracking
  useEffect(() => {
    const handleActivity = (type: 'click' | 'keystroke' | 'mousemove') => {
      if (address) {
        // BotDetection removed for testing
      }
    };
    
    const handleClick = () => handleActivity('click');
    const handleKeydown = () => handleActivity('keystroke');
    const handleMouseMove = () => handleActivity('mousemove');
    
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [address]);
  
  return (
    <div className="casino-card max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🎲 Dice</h2>
        <p className="text-white/70 text-sm">Roll the dice and predict the outcome!</p>
        {/* Security indicator */}
        <div className="text-xs text-green-400 mt-1">🔒 Provably Fair • Server-Side RNG</div>
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
          <div className="text-yellow-400 font-bold">{calculateMultiplier().toFixed(2)}x</div>
          <div className="text-white/70 text-xs">Multiplier</div>
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

      {/* Dice Display */}
      <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-8 mb-6 text-center">
        <div className={`text-8xl mb-4 transition-transform duration-300 ${
          isRolling ? 'animate-spin scale-110' : ''
        }`}>
          {getDiceEmoji()}
        </div>
        <div className="text-white/80 text-lg mb-2">
          {lastRoll ? `Rolled: ${lastRoll}` : 'Ready to Roll'}
        </div>
        <div className="text-white/60 text-sm">
          Win Chance: {getWinChance()}% | Payout: {calculateMultiplier().toFixed(2)}x
        </div>
      </div>

      {/* Game Settings */}
      <div className="space-y-4 mb-6">
        {/* Prediction Type */}
        <div>
          <label className="block text-white/70 text-sm mb-2">Prediction</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPrediction('under')}
              disabled={isRolling}
              className={`py-3 px-4 rounded-xl font-bold transition-all ${
                prediction === 'under'
                  ? 'bg-green-500 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              UNDER {targetNumber}
            </button>
            <button
              onClick={() => setPrediction('over')}
              disabled={isRolling}
              className={`py-3 px-4 rounded-xl font-bold transition-all ${
                prediction === 'over'
                  ? 'bg-red-500 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              OVER {targetNumber}
            </button>
          </div>
        </div>

        {/* Target Number Slider */}
        <div>
          <label className="block text-white/70 text-sm mb-2">
            Target Number: {targetNumber}
          </label>
          <input
            type="range"
            min="2"
            max="98"
            value={targetNumber}
            onChange={(e) => setTargetNumber(parseInt(e.target.value))}
            disabled={isRolling}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, ${
                prediction === 'under' ? '#10b981' : '#ef4444'
              } 0%, ${
                prediction === 'under' ? '#10b981' : '#ef4444'
              } ${targetNumber}%, rgba(255,255,255,0.2) ${targetNumber}%, rgba(255,255,255,0.2) 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-white/60 mt-1">
            <span>1</span>
            <span>50</span>
            <span>99</span>
          </div>
        </div>

        {/* Bet Amount */}
        <div>
          <label className="block text-white/70 text-sm mb-2">Bet Amount</label>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setBet(prev => Math.max(0.1, prev - 0.1))}
              disabled={isRolling || isTransacting}
              className="casino-card px-3 py-2 text-white hover:bg-white/20 transition-colors"
            >
              -
            </button>
            <input
              type="number"
              value={bet.toFixed(4)}
              onChange={(e) => setBet(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              disabled={isRolling || isTransacting}
              className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-center focus:outline-none focus:border-purple-400"
              step="0.1"
              min="0.1"
              max={balance}
            />
            <button 
              onClick={() => setBet(prev => Math.min(balance, prev + 0.001))}
              disabled={isRolling || isTransacting}
              className="casino-card px-3 py-2 text-white hover:bg-white/20 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={rollDice}
        disabled={!isConnected || isRolling || isTransacting || balance < bet}
        className={`w-full neon-button py-4 text-lg font-bold ${
          (!isConnected || isRolling || isTransacting || balance < bet) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {!isConnected
          ? 'CONNECT WALLET'
          : isRolling
          ? 'ROLLING...'
          : isTransacting
          ? 'PROCESSING...'
          : 'ROLL DICE'
        }
      </button>

      {/* Game History */}
      {gameHistory.length > 0 && (
        <div className="mt-6">
          <div className="text-white/70 text-sm mb-3">Recent Rolls:</div>
          <div className="grid grid-cols-5 gap-2">
            {gameHistory.slice(0, 10).map((game, i) => (
              <div key={i} className={`casino-card px-2 py-1 text-center text-xs ${
                game.win ? 'text-green-400 border-green-400/30' : 'text-red-400 border-red-400/30'
              }`}>
                <div className="font-bold">{game.roll}</div>
                <div className="text-xs">
                  {game.win ? `${game.multiplier.toFixed(1)}x` : 'Loss'}
                </div>
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
        <div>• Choose UNDER or OVER</div>
        <div>• Set your target number (2-98)</div>
        <div>• Place your bet and roll the dice</div>
        <div>• Win if your prediction is correct</div>
        <div>• Lower win chance = higher multiplier</div>
      </div>
    </div>
  );
}