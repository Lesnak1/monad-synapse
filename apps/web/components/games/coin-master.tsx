'use client';

import { useState } from 'react';
import { useGameContract } from '@/lib/useGameContract';
import { BET_LIMITS } from '@/lib/poolWallet';
// Game logic now handled server-side via /api/game/result for security
import { toast } from 'react-hot-toast';

export function CoinMasterGame() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [bet, setBet] = useState<number>(BET_LIMITS.min);
  const [lastWin, setLastWin] = useState<number | null>(null);
  
  const {
    address,
    isConnected,
    balance,
    poolBalance,
    gameState,
    isTransacting,
    placeBet,
    payoutWin,
    finalizeRound,
  } = useGameContract();

  const symbols = ['🪙', '💎', '⚡', '🍀', '🔥', '💰', '⭐'];
  
  const spin = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first!');
      return;
    }

    if (balance < bet) {
      toast.error('Insufficient MON balance!');
      return;
    }

    try {
      setIsSpinning(true);
      
      // Place bet on blockchain
      await placeBet(bet, 'coin-master');
      toast.success(`Bet placed: ${bet} MON`);
      
      // Simulate spinning animation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Call secure game API for fair results
      // Generate alphanumeric client seed
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substr(2, 9);
      const addressSuffix = address?.slice(2, 8) || 'unknown';
      const clientSeed = `coinmaster${addressSuffix}${timestamp}${random}`;
      
      const response = await fetch('/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          gameType: 'coin-master',
          gameParams: {
            betAmount: bet,
            clientSeed,
            nonce: Date.now() % 10000
          },
          playerAddress: address
        })
      });

      if (response.ok) {
        const gameResult = await response.json();
        if (gameResult.success) {
          setResult(gameResult.result.gameResult.spinResult);
          
          if (gameResult.result.isWin && gameResult.result.winAmount > 0) {
            setLastWin(gameResult.result.winAmount);
            toast.success(`You won ${gameResult.result.winAmount.toFixed(4)} MON!`);
            
            // Process payout
            const payoutResponse = await fetch('/api/payout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({
                playerAddress: address,
                winAmount: gameResult.result.winAmount,
                gameType: 'coin-master',
                transactionId: `coin-master-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              })
            });
            
            if (!payoutResponse.ok) {
              toast.error('Payout failed. Please contact support.');
            }
          } else {
            setLastWin(null);
            toast.error('Better luck next time!');
          }
        }
      } else {
        toast.error('Game request failed');
      }
      
    } catch (error) {
      toast.error('Transaction failed. Please try again.');
    } finally {
      // Round cleanup to release transaction lock
      finalizeRound('coin-master');
      setIsSpinning(false);
    }
  };

  const getResultSymbol = () => {
    if (result === null) return symbols[0];
    return symbols[result % symbols.length];
  };

  const getMultiplier = () => {
    if (!result) return '0x';
    if (result >= 95) return '10x';
    if (result >= 80) return '5x';
    if (result >= 60) return '2x';
    if (result >= 40) return '1.5x';
    return '0x';
  };

  return (
    <div className="casino-card max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🪙 Coin Master</h2>
        <p className="text-white/70 text-sm">Spin the coin and win big!</p>
      </div>

      {/* Game Display */}
      <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-8 mb-6 text-center">
        <div className={`text-8xl mb-4 transition-transform duration-1000 ${isSpinning ? 'animate-spin scale-110' : ''}`}>
          {isSpinning ? '🌀' : getResultSymbol()}
        </div>
        
        <div className="text-white/80 text-sm mb-2">Multiplier</div>
        <div className="text-2xl font-bold text-gradient">
          {getMultiplier()}
        </div>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="casino-card text-center p-3">
          <div className="text-green-400 font-bold">💰 {balance.toFixed(4)} MON</div>
          <div className="text-white/70 text-xs">Your Balance</div>
        </div>
        <div className="casino-card text-center p-3">
          <div className="text-purple-400 font-bold">{bet.toFixed(4)} MON</div>
          <div className="text-white/70 text-xs">Bet Amount</div>
        </div>
        <div className="casino-card text-center p-3">
          <div className={`font-bold ${lastWin ? 'text-yellow-400' : 'text-white/50'}`}>
            {lastWin ? `+${lastWin.toFixed(4)} MON` : '0 MON'}
          </div>
          <div className="text-white/70 text-xs">Last Win</div>
        </div>
      </div>
      
      {/* Pool Balance Info */}
      <div className="casino-card text-center p-3 mb-6">
        <div className="text-blue-400 font-bold">🏦 {poolBalance.toFixed(4)} MON</div>
        <div className="text-white/70 text-xs">Pool Balance</div>
      </div>

      {/* Bet Controls */}
      <div className="mb-6">
        <label className="block text-white/70 text-sm mb-2">Bet Amount</label>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setBet(prev => Math.max(BET_LIMITS.min, prev - 0.1))}
            className="casino-card px-3 py-2 text-white hover:bg-white/20 transition-colors"
            disabled={isSpinning || isTransacting}
          >
            -
          </button>
          <input
            type="number"
            value={bet.toFixed(1)}
            onChange={(e) => setBet(Math.max(BET_LIMITS.min, Math.min(BET_LIMITS.max, parseFloat(e.target.value) || BET_LIMITS.min)))}
            className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-center focus:outline-none focus:border-purple-400"
            disabled={isSpinning || isTransacting}
            step="0.1"
            min={BET_LIMITS.min}
            max={BET_LIMITS.max}
          />
          <button 
            onClick={() => setBet(prev => Math.min(BET_LIMITS.max, prev + 0.1))}
            className="casino-card px-3 py-2 text-white hover:bg-white/20 transition-colors"
            disabled={isSpinning || isTransacting}
          >
            +
          </button>
        </div>
      </div>

      {/* Spin Button */}
      <button
        onClick={spin}
        disabled={!isConnected || isSpinning || isTransacting || balance < bet}
        className={`w-full neon-button py-4 text-lg font-bold ${
          (!isConnected || isSpinning || isTransacting || balance < bet) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {!isConnected
          ? 'CONNECT WALLET'
          : isSpinning
          ? 'SPINNING...'
          : isTransacting
          ? 'PROCESSING...'
          : 'SPIN'
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
        <div className="font-semibold mb-2">Win Rules:</div>
        <div>95-99: 10x multiplier</div>
        <div>80-94: 5x multiplier</div>
        <div>60-79: 2x multiplier</div>
        <div>40-59: 1.5x multiplier</div>
      </div>
    </div>
  );
}