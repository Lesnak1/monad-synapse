'use client';

import { useState } from 'react';
import { useGameContract } from '@/lib/useGameContract';
import { toast } from 'react-hot-toast';
import { checkPoolSufficiency } from '@/lib/poolMonitoring';

export function MinesGame() {
  const [gameBoard, setGameBoard] = useState<Array<'star' | 'mine'>>(Array(25).fill('star'));
  const [revealedTiles, setRevealedTiles] = useState<Array<boolean>>(Array(25).fill(false));
  const [gameActive, setGameActive] = useState(false);
  const [minesCount, setMinesCount] = useState(5);
  const [bet, setBet] = useState<number>(0.1);
  const [revealedStars, setRevealedStars] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  
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

  const multipliers = [
    1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 4.0, 4.9, 6.0,
    7.4, 9.0, 11.0, 13.5, 16.5, 20.0, 24.5, 30.0, 37.0, 45.0, 55.0
  ];

  const startGame = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first!');
      return;
    }

    if (balance < bet) {
      toast.error('Insufficient MON balance!');
      return;
    }

    // Check pool sufficiency before allowing bet
    const poolCheck = await checkPoolSufficiency(bet);
    if (!poolCheck.sufficient) {
      if (poolCheck.maxBet && poolCheck.maxBet > 0) {
        toast.error(`Pool balance low. Max bet: ${poolCheck.maxBet.toFixed(4)} MON`);
      } else {
        toast.error('Pool is being refilled. Please try again in a few minutes.');
      }
      return;
    }

    try {
      await placeBet(bet, 'mines');
      toast.success(`Bet placed: ${bet} MON`);
      
      // Generate random mine positions
      const minePositions = new Set<number>();
      while (minePositions.size < minesCount) {
        minePositions.add(Math.floor(Math.random() * 25));
      }

      // Initialize board with actual content
      const boardContent = Array(25).fill('star').map((_, i) =>
        minePositions.has(i) ? 'mine' : 'star'
      ) as Array<'star' | 'mine'>;
      
      // Reset all states
      setGameBoard(boardContent);
      setRevealedTiles(Array(25).fill(false));
      setGameActive(true);
      setGameOver(false);
      setRevealedStars(0);
      setCurrentMultiplier(1.0);
      setLastWin(null);
    } catch (error) {
      toast.error('Transaction failed. Please try again.');
    }
  };

  const revealTile = (index: number) => {
    if (!gameActive || gameOver) return;
    
    // Only allow clicking on unrevealed tiles
    if (revealedTiles[index]) return;

    const newRevealedTiles = [...revealedTiles];
    newRevealedTiles[index] = true;
    setRevealedTiles(newRevealedTiles);
    
    // Check what's under this tile
    const tileContent = gameBoard[index];
    
    if (tileContent === 'mine') {
      // Hit mine - game over
      setGameActive(false);
      setGameOver(true);
      toast.error('💥 You hit a mine! Game over!');
      
      // Reveal all mines after a delay
      setTimeout(() => {
        const allMinesRevealed = [...revealedTiles];
        gameBoard.forEach((tile, i) => {
          if (tile === 'mine') {
            allMinesRevealed[i] = true;
          }
        });
        setRevealedTiles(allMinesRevealed);
        finalizeRound('mines');
      }, 1000);
      
      return;
    }

    if (tileContent === 'star') {
      const newRevealedStars = revealedStars + 1;
      const newMultiplier = multipliers[newRevealedStars - 1] || 1.0;
      
      setRevealedStars(newRevealedStars);
      setCurrentMultiplier(newMultiplier);
      
      toast.success(`💎 Found diamond! ${newMultiplier.toFixed(2)}x multiplier`);
      
      // Check if won all possible stars
      if (newRevealedStars >= 25 - minesCount) {
        toast.success('🎉 All diamonds found! Auto cash out!');
        setTimeout(() => cashOut(newMultiplier), 500);
      }
    }
  };

  const cashOut = async (multiplier?: number) => {
    if (!gameActive || gameOver) return;

    const finalMultiplier = multiplier || currentMultiplier;
    const winAmount = bet * finalMultiplier;

    try {
      setGameActive(false);
      setGameOver(true);
      
      await payoutWin(winAmount, 'mines');
      setLastWin(winAmount);
      toast.success(`Cashed out ${winAmount.toFixed(4)} MON! (${finalMultiplier.toFixed(2)}x)`);
      
      // Reset game after delay
      setTimeout(() => {
        setGameBoard(Array(25).fill('star'));
        setRevealedTiles(Array(25).fill(false));
        setRevealedStars(0);
        setCurrentMultiplier(1.0);
        setGameOver(false);
        finalizeRound('mines');
      }, 2000);
    } catch (error) {
      toast.error('Cash out transaction failed!');
      setGameActive(true);
      setGameOver(false);
    }
  };

  const getTileContent = (index: number) => {
    if (!revealedTiles[index]) return '';
    
    const tile = gameBoard[index];
    if (tile === 'star') return '💎';
    if (tile === 'mine') return '💥';
    return '';
  };

  const getTileClass = (index: number) => {
    const baseClass = "w-12 h-12 rounded-lg border-2 transition-all duration-200 flex items-center justify-center text-xl font-bold";
    const isRevealed = revealedTiles[index];
    const tile = gameBoard[index];
    
    if (!isRevealed) {
      const isClickable = gameActive && !gameOver;
      return `${baseClass} border-purple-500/40 bg-purple-900/30 ${isClickable ? 'cursor-pointer hover:bg-purple-800/40 hover:scale-105' : 'cursor-not-allowed opacity-50'}`;
    }
    
    if (tile === 'star') {
      return `${baseClass} border-green-400 bg-green-500/20 text-green-400 cursor-default`;
    }
    if (tile === 'mine') {
      return `${baseClass} border-red-400 bg-red-500/20 text-red-400 cursor-default animate-pulse`;
    }
    return baseClass;
  };

  return (
    <div className="casino-card max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">💎 Mines</h2>
        <p className="text-white/70 text-sm">Find the diamonds and avoid the mines!</p>
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
          <div className="text-yellow-400 font-bold">{currentMultiplier.toFixed(2)}x</div>
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

      {/* Game Settings */}
      {!gameActive && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-white/70 text-sm mb-2">Mines Count</label>
            <select
              value={minesCount}
              onChange={(e) => setMinesCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400"
            >
              {[3, 5, 7, 10, 12, 15].map(count => (
                <option key={count} value={count} className="bg-gray-800">{count} mines</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-2">Bet Amount</label>
            <input
              type="number"
              value={bet.toFixed(4)}
              onChange={(e) => setBet(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400"
              step="0.1"
              min="0.1"
              max={balance}
            />
          </div>
        </div>
      )}

      {/* Game Board */}
      <div className="grid grid-cols-5 gap-2 mb-6 justify-center">
        {gameBoard.map((_, index) => (
          <button
            key={index}
            className={getTileClass(index)}
            onClick={() => revealTile(index)}
            disabled={!gameActive || gameOver || revealedTiles[index]}
          >
            {getTileContent(index)}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {!gameActive && (
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

        {gameActive && revealedStars > 0 && (
          <button
            onClick={() => cashOut()}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-black font-bold py-4 rounded-xl hover:from-green-400 hover:to-green-500 transition-all"
          >
            CASH OUT: {(bet * currentMultiplier).toFixed(4)} MON ({currentMultiplier.toFixed(2)}x)
          </button>
        )}
      </div>

      {/* Game Stats */}
      {gameActive && (
        <div className="mt-4 text-center">
          <div className="text-white/70 text-sm">
            Revealed: {revealedStars} / {25 - minesCount} | Mines: {minesCount}
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
        <div>• Click tiles to reveal diamonds 💎</div>
        <div>• Avoid mines 💥 or lose your bet</div>
        <div>• Cash out anytime to secure winnings</div>
        <div>• More revealed diamonds = higher multiplier</div>
      </div>
    </div>
  );
}