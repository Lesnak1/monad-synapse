'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameContract } from '@/lib/useGameContract';
import { BET_LIMITS } from '@/lib/poolWallet';
import { useSecureGame } from '@/lib/useSecureGame';
import { useWalletAuth } from '@/lib/useWalletAuth';
import { toast } from 'react-hot-toast';

export function CrashGame() {
  const [gameState, setGameState] = useState<'waiting' | 'flying' | 'crashed'>('waiting');
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState<number>(0);
  const [bet, setBet] = useState<number>(BET_LIMITS.min);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashOutAt, setCashOutAt] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [gameHistory, setGameHistory] = useState<number[]>([2.34, 1.56, 8.42, 1.12, 3.67]);
  
  const {
    address,
    isConnected,
    balance,
    poolBalance,
    gameState: contractState,
    isTransacting,
    placeBet,
    payoutWin,
    finalizeRound,
  } = useGameContract();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartTime = useRef<number>(0);

  const { playGame } = useSecureGame();
  const { isAuthenticated, isAuthenticating, authenticate } = useWalletAuth();

  const generateCrashPoint = async () => {
    // Ensure wallet is connected and authenticated
    if (!address || !isConnected) {
      toast.error('Please connect your wallet to play');
      return 2.0;
    }

    if (!isAuthenticated) {
      toast.error('Please authenticate your wallet to play games');
      if (!isAuthenticating) {
        authenticate();
      }
      return 2.0;
    }
    
    try {
      const gameResult = await playGame('crash', address, {
        betAmount: bet,
        multiplier: cashOutAt || 2.0
      });
      
      if (gameResult.success && gameResult.result) {
        return (gameResult.result as any).crashPoint || 2.0;
      } else {
        console.error('Game failed:', gameResult.error);
        toast.error(gameResult.error?.message || 'Game execution failed');
        return 2.0;
      }
    } catch (error: any) {
      console.error('Game error:', error);
      toast.error(error.message || 'Game failed');
      return 2.0;
    }
    
    return 2.0; // Fallback
  };

  const startGame = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first!');
      return;
    }

    if (balance < bet) {
      toast.error('Insufficient MON balance!');
      return;
    }

    try {
      // Place bet on blockchain
      await placeBet(bet, 'crash');
      toast.success(`Bet placed: ${bet} MON`);
      
      setCashOutAt(null);
      setCashedOut(false);
      setLastWin(null);
      
      const newCrashPoint = await generateCrashPoint();
      setCrashPoint(newCrashPoint);
      
      setGameState('flying');
      setMultiplier(1.00);
      gameStartTime.current = Date.now();

      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - gameStartTime.current) / 1000;
        const newMultiplier = 1 + Math.pow(elapsed * 0.1, 1.5);
        
        setMultiplier(newMultiplier);
        
        if (newMultiplier >= newCrashPoint) {
          crash();
        }
      }, 50);
    } catch (error) {
      toast.error('Transaction failed. Please try again.');
    }
  };

  const crash = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setGameState('crashed');
    setGameHistory(prev => [crashPoint, ...prev.slice(0, 4)]);
    
    setTimeout(() => {
      setGameState('waiting');
      setMultiplier(1.00);
      finalizeRound('crash');
    }, 3000);
  };

  const cashOut = async () => {
    if (gameState === 'flying' && !cashedOut) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      setCashedOut(true);
      setCashOutAt(multiplier);
      const winAmount = bet * multiplier;
      
      try {
        // Pay out winnings from pool
        await payoutWin(winAmount, 'crash');
        setLastWin(winAmount);
        toast.success(`Cashed out ${winAmount.toFixed(4)} MON!`);
      } catch (error) {
        console.error('Cash out failed:', error);
        toast.error('Cash out transaction failed!');
      }
      
      setTimeout(() => {
        setGameState('waiting');
        setMultiplier(1.00);
        finalizeRound('crash');
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getGameDisplay = () => {
    if (gameState === 'crashed') {
      return (
        <div className="text-center">
          <div className="text-6xl mb-4">💥</div>
          <div className="text-red-400 text-2xl font-bold">CRASHED!</div>
          <div className="text-white/70">at {crashPoint.toFixed(2)}x</div>
        </div>
      );
    }
    
    if (cashedOut && cashOutAt) {
      return (
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <div className="text-green-400 text-2xl font-bold">CASHED OUT!</div>
          <div className="text-white/70">at {cashOutAt.toFixed(2)}x</div>
        </div>
      );
    }
    
    return (
      <div className="text-center">
        <div className={`text-6xl mb-4 transition-transform ${gameState === 'flying' ? 'animate-bounce' : ''}`}>
          🚀
        </div>
        <div className={`text-4xl font-bold ${
          gameState === 'flying' 
            ? multiplier > 2 ? 'text-green-400' : 'text-yellow-400'
            : 'text-white'
        }`}>
          {multiplier.toFixed(2)}x
        </div>
      </div>
    );
  };

  return (
    <div className="casino-card max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">📈 Crash</h2>
        <p className="text-white/70 text-sm">Cash out before the rocket crashes!</p>
      </div>

      {/* Game Display */}
      <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-8 mb-6">
        {getGameDisplay()}
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="casino-card text-center p-3">
          <div className="text-green-400 font-bold">💰 {balance.toFixed(4)} MON</div>
          <div className="text-white/70 text-xs">Balance</div>
        </div>
        <div className="casino-card text-center p-3">
          <div className="text-purple-400 font-bold">{bet.toFixed(4)} MON</div>
          <div className="text-white/70 text-xs">Bet</div>
        </div>
        <div className="casino-card text-center p-3">
          <div className={`font-bold ${lastWin ? 'text-yellow-400' : 'text-white/50'}`}>
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

      {/* Game History */}
      <div className="mb-6">
        <div className="text-white/70 text-sm mb-2">Recent Crashes:</div>
        <div className="flex gap-2">
          {gameHistory.map((crash, i) => (
            <div key={i} className={`casino-card px-2 py-1 text-xs font-bold ${
              crash >= 10 ? 'text-green-400' : crash >= 5 ? 'text-yellow-400' : crash >= 2 ? 'text-blue-400' : 'text-red-400'
            }`}>
              {crash.toFixed(2)}x
            </div>
          ))}
        </div>
      </div>

      {/* Bet Controls */}
      <div className="mb-6">
        <label className="block text-white/70 text-sm mb-2">Bet Amount</label>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setBet(prev => Math.max(0.001, prev - 0.001))}
            className="casino-card px-3 py-2 text-white hover:bg-white/20 transition-colors"
            disabled={gameState === 'flying' || isTransacting}
          >
            -
          </button>
          <input
            type="number"
            value={bet.toFixed(4)}
            onChange={(e) => setBet(Math.max(0.001, parseFloat(e.target.value) || 0.001))}
            className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-center focus:outline-none focus:border-purple-400"
            disabled={gameState === 'flying' || isTransacting}
            step="0.001"
            min="0.001"
            max={balance}
          />
          <button 
            onClick={() => setBet(prev => Math.min(balance, prev + 0.001))}
            className="casino-card px-3 py-2 text-white hover:bg-white/20 transition-colors"
            disabled={gameState === 'flying' || isTransacting}
          >
            +
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {gameState === 'waiting' && (
          <button
            onClick={startGame}
            disabled={!isConnected || balance < bet || isTransacting}
            className={`w-full neon-button py-4 text-lg font-bold ${
              (!isConnected || balance < bet || isTransacting) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {!isConnected
              ? 'CONNECT WALLET'
              : isTransacting
              ? 'PROCESSING...'
              : 'START GAME'
            }
          </button>
        )}
        
        {gameState === 'flying' && !cashedOut && (
          <button
            onClick={cashOut}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-black font-bold py-4 rounded-xl hover:from-green-400 hover:to-green-500 transition-all"
          >
            CASH OUT at {multiplier.toFixed(2)}x
          </button>
        )}
        
        {gameState === 'crashed' && (
          <div className="text-center text-white/60 py-4">
            Next round starting soon...
          </div>
        )}
      </div>

      {/* Wallet Connection Status */}
      {isConnected && address && (
        <div className="mt-4 text-center text-xs text-white/60">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      )}

      {/* Game Rules */}
      <div className="mt-6 text-xs text-white/60">
        <div className="font-semibold mb-2">How to Play:</div>
        <div>• Place your bet and watch the multiplier rise</div>
        <div>• Cash out before the rocket crashes</div>
        <div>• The longer you wait, the higher the multiplier</div>
      </div>
    </div>
  );
}