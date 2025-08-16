'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useSecureGame } from '@/lib/useSecureGame';
import { useWalletAuth } from '@/lib/useWalletAuth';
import { BET_LIMITS } from '@/lib/poolWallet';
import { toast } from 'react-hot-toast';

export function DiceSecureGame() {
  const [isRolling, setIsRolling] = useState(false);
  const [bet, setBet] = useState<number>(BET_LIMITS.min);
  const [prediction, setPrediction] = useState<'under' | 'over'>('under');
  const [targetNumber, setTargetNumber] = useState(50);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [gameHistory, setGameHistory] = useState<Array<{roll: number, win: boolean, multiplier: number}>>([]);
  
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isAuthenticating, authenticate } = useWalletAuth();
  const { playGameWithPayout, isLoading } = useSecureGame();

  const calculateMultiplier = () => {
    const winChance = prediction === 'under' 
      ? targetNumber / 100 
      : (100 - targetNumber) / 100;
    
    // House edge of 1%
    return (0.99 / winChance);
  };

  const rollDice = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first!');
      return;
    }
    
    if (!isAuthenticated) {
      const authSuccess = await authenticate();
      if (!authSuccess) return;
    }

    try {
      setIsRolling(true);
      
      // Play game using secure API
      const { gameResult, payoutResult } = await playGameWithPayout(
        'dice',
        address,
        { 
          betAmount: bet,
          target: targetNumber,
          prediction: prediction
        },
        (result) => {
          // Callback when game result is received
          if (result.success && result.result) {
            const roll = result.result.gameResult.roll;
            const win = result.result.isWin;
            const multiplier = result.result.gameResult.multiplier;
            
            setLastRoll(roll);
            
            if (win && result.result.winAmount > 0) {
              setLastWin(result.result.winAmount);
              toast.success(`🎲 Rolled ${roll.toFixed(2)}! Won ${result.result.winAmount.toFixed(4)} MON!`);
            } else {
              setLastWin(null);
              toast.success(`🎲 Rolled ${roll.toFixed(2)}. Better luck next time!`);
            }
            
            // Add to history
            setGameHistory(prev => [{roll, win, multiplier}, ...prev.slice(0, 9)]);
          }
        }
      );

      if (!gameResult.success) {
        toast.error(gameResult.error?.message || 'Game failed');
      }

    } catch (error) {
      console.error('Dice game error:', error);
      toast.error('Game failed. Please try again.');
    } finally {
      setIsRolling(false);
    }
  };

  const getWinCondition = () => {
    return prediction === 'under' 
      ? `Roll under ${targetNumber}` 
      : `Roll over ${targetNumber}`;
  };

  const getWinChance = () => {
    const chance = prediction === 'under' 
      ? targetNumber 
      : 100 - targetNumber;
    return `${chance}%`;
  };

  return (
    <div className="casino-card max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🎲 Dice</h2>
        <p className="text-white/70 text-sm">Predict if the dice will roll under or over your target!</p>
      </div>

      {/* Dice Display */}
      <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-6 mb-6">
        <div className="text-center mb-4">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-xl border-2 border-blue-400/50 bg-blue-900/50 text-4xl font-bold text-white transition-all duration-300 ${
            isRolling ? 'animate-bounce' : ''
          }`}>
            {lastRoll !== null ? lastRoll.toFixed(2) : '?'}
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <div className="text-blue-400 font-semibold">{getWinCondition()}</div>
          <div className="text-green-400">Win Chance: {getWinChance()}</div>
          <div className="text-yellow-400">Multiplier: {calculateMultiplier().toFixed(2)}x</div>
          {lastWin && (
            <div className="text-green-400 font-bold">
              Last Win: +{lastWin.toFixed(4)} MON
            </div>
          )}
        </div>
      </div>

      {/* Game Controls */}
      <div className="space-y-4 mb-6">
        {/* Prediction Toggle */}
        <div>
          <label className="block text-white/70 text-sm mb-2">Prediction</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setPrediction('under')}
              className={`flex-1 py-2 px-4 rounded-xl font-bold transition-all ${
                prediction === 'under'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
              disabled={isRolling || isLoading}
            >
              UNDER
            </button>
            <button
              onClick={() => setPrediction('over')}
              className={`flex-1 py-2 px-4 rounded-xl font-bold transition-all ${
                prediction === 'over'
                  ? 'bg-red-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
              disabled={isRolling || isLoading}
            >
              OVER
            </button>
          </div>
        </div>

        {/* Target Number */}
        <div>
          <label className="block text-white/70 text-sm mb-2">
            Target Number: {targetNumber}
          </label>
          <input
            type="range"
            min="1"
            max="99"
            value={targetNumber}
            onChange={(e) => setTargetNumber(parseInt(e.target.value))}
            className="w-full"
            disabled={isRolling || isLoading}
          />
        </div>

        {/* Bet Amount */}
        <div>
          <label className="block text-white/70 text-sm mb-2">Bet Amount</label>
          <input
            type="number"
            value={bet.toFixed(3)}
            onChange={(e) => setBet(Math.max(BET_LIMITS.min, parseFloat(e.target.value) || BET_LIMITS.min))}
            className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400"
            step="0.1"
            min={BET_LIMITS.min}
            max={BET_LIMITS.max}
            disabled={isRolling || isLoading}
          />
        </div>
      </div>

      {/* Roll Button */}
      <button
        onClick={rollDice}
        disabled={!isConnected || isRolling || isLoading || isAuthenticating}
        className={`w-full neon-button py-4 text-lg font-bold ${
          (!isConnected || isRolling || isLoading || isAuthenticating) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {!isConnected
          ? 'CONNECT WALLET'
          : isAuthenticating
          ? 'AUTHENTICATING...'
          : isRolling || isLoading
          ? 'ROLLING...'
          : !isAuthenticated
          ? 'SIGN TO PLAY'
          : 'ROLL DICE'
        }
      </button>

      {/* Game History */}
      {gameHistory.length > 0 && (
        <div className="mt-6">
          <h3 className="text-white font-semibold mb-3">Recent Rolls</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {gameHistory.map((game, index) => (
              <div
                key={index}
                className={`flex justify-between items-center p-2 rounded-lg text-sm ${
                  game.win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                <span>Roll: {game.roll.toFixed(2)}</span>
                <span>{game.win ? 'WIN' : 'LOSS'}</span>
                <span>{game.multiplier.toFixed(2)}x</span>
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
    </div>
  );
}