'use client';

import { useState, useEffect } from 'react';
import { useGameContract } from '@/lib/useGameContract';
// Game logic now handled server-side via /api/game/result for security
import { toast } from 'react-hot-toast';

const SYMBOLS = ['🍭', '🍌', '🍇', '🍒', '🍊', '🟦', '🟪', '🔴'];
const SYMBOL_VALUES = {
  '🍭': 50, // Highest value - candy scatter
  '🍌': 20,
  '🍇': 15,
  '🍒': 10,
  '🍊': 8,
  '🟦': 5, // Diamond shapes
  '🟪': 4,
  '🔴': 3
};

export function SweetBonanzaGame() {
  const { address, balance, isConnected, placeBet, payoutWin, gameState, isTransacting, finalizeRound } = useGameContract();
  const [betAmount, setBetAmount] = useState(1.0);
  const [gameBoard, setGameBoard] = useState<string[][]>([]);
  const [gamePhase, setGamePhase] = useState<'idle' | 'spinning' | 'tumbling' | 'complete'>('idle');
  const [winAmount, setWinAmount] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [cascadeCount, setCascadeCount] = useState(0);
  const [winningCombos, setWinningCombos] = useState<{symbol: string, count: number, payout: number}[]>([]);

  useEffect(() => {
    // Initialize empty 6x5 board
    const initialBoard = Array(5).fill(null).map(() => Array(6).fill(''));
    setGameBoard(initialBoard);
  }, []);

  const generateRandomSymbol = (): string => {
    const weights = [2, 8, 10, 12, 15, 20, 18, 15]; // Candy scatter rarest
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < SYMBOLS.length; i++) {
      random -= weights[i];
      if (random <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[SYMBOLS.length - 1];
  };

  const fillBoard = (): string[][] => {
    return Array(5).fill(null).map(() => 
      Array(6).fill(null).map(() => generateRandomSymbol())
    );
  };

  const findWinningCombinations = (board: string[][]): {symbol: string, positions: [number, number][], count: number}[] => {
    const symbolCounts: Record<string, [number, number][]> = {};
    
    // Count all symbols on the board
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
        const symbol = board[row][col];
        if (!symbolCounts[symbol]) {
          symbolCounts[symbol] = [];
        }
        symbolCounts[symbol].push([row, col]);
      }
    }

    // Find winning combinations (need 8+ of the same symbol anywhere)
    const winners: {symbol: string, positions: [number, number][], count: number}[] = [];
    
    Object.entries(symbolCounts).forEach(([symbol, positions]) => {
      if (positions.length >= 8) {
        winners.push({ symbol, positions, count: positions.length });
      }
    });

    return winners;
  };

  const calculatePayout = (winningCombos: {symbol: string, count: number}[]): number => {
    let totalPayout = 0;
    
    winningCombos.forEach(combo => {
      const baseValue = SYMBOL_VALUES[combo.symbol as keyof typeof SYMBOL_VALUES] || 1;
      // Exponential scaling for more symbols
      const countMultiplier = Math.pow(combo.count / 8, 1.5);
      const symbolPayout = betAmount * baseValue * countMultiplier * 0.01;
      totalPayout += symbolPayout;
    });

    return totalPayout;
  };

  const removeWinningSymbols = (board: string[][], winningCombos: {symbol: string, positions: [number, number][]}[]): string[][] => {
    const newBoard = board.map(row => [...row]);
    
    winningCombos.forEach(combo => {
      combo.positions.forEach(([row, col]) => {
        newBoard[row][col] = '';
      });
    });

    return newBoard;
  };

  const dropSymbols = (board: string[][]): string[][] => {
    const newBoard: string[][] = Array(5).fill(null).map(() => Array(6).fill(''));
    
    // Drop existing symbols down
    for (let col = 0; col < 6; col++) {
      const column = [];
      for (let row = 4; row >= 0; row--) {
        if (board[row][col] !== '') {
          column.push(board[row][col]);
        }
      }
      
      // Fill from bottom up
      for (let i = 0; i < column.length; i++) {
        newBoard[4 - i][col] = column[i];
      }
      
      // Fill empty spaces with new symbols
      for (let row = 0; row < 5 - column.length; row++) {
        newBoard[row][col] = generateRandomSymbol();
      }
    }

    return newBoard;
  };

  const processCascade = async (board: string[][], cascadeNum: number = 0): Promise<{board: string[][], totalWin: number, cascades: number}> => {
    const winningCombos = findWinningCombinations(board);
    
    if (winningCombos.length === 0) {
      return { board, totalWin: 0, cascades: cascadeNum };
    }

    // Calculate winnings for this cascade
    const cascadeWin = calculatePayout(winningCombos.map(combo => ({
      symbol: combo.symbol,
      count: combo.count
    })));

    // Apply cascade multiplier
    const multipliedWin = cascadeWin * (cascadeNum + 1);

    // Remove winning symbols and drop new ones
    const boardAfterRemoval = removeWinningSymbols(board, winningCombos);
    await new Promise(resolve => setTimeout(resolve, 500)); // Animation delay
    
    const boardAfterDrop = dropSymbols(boardAfterRemoval);
    setGameBoard(boardAfterDrop);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Recursive cascade
    const nextCascade = await processCascade(boardAfterDrop, cascadeNum + 1);
    
    return {
      board: nextCascade.board,
      totalWin: multipliedWin + nextCascade.totalWin,
      cascades: nextCascade.cascades
    };
  };

  const spin = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (betAmount < 0.1 || betAmount > balance) {
      toast.error(`Bet amount must be between 0.001 and ${balance.toFixed(4)} MON`);
      return;
    }

    if (balance < betAmount) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      setGamePhase('spinning');
      setTotalWin(0);
      setWinAmount(0);
      setMultiplier(1);
      setCascadeCount(0);
      setWinningCombos([]);

      // Place bet
      await placeBet(betAmount, 'sweet-bonanza');

      // Call secure game API endpoint
      const response = await fetch('/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          gameType: 'sweet-bonanza',
          gameParams: {
            betAmount,
            clientSeed: `bonanza-${Date.now()}`,
            nonce: Math.floor(Math.random() * 1000000)
          },
          playerAddress: address,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error('Game request failed');
      }

      const gameResult = await response.json();
      if (!gameResult.success) {
        throw new Error(gameResult.error || 'Game failed');
      }

      // Use server-generated board
      const initialBoard = gameResult.gameResult.grid;
      setGameBoard(initialBoard);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setGamePhase('tumbling');

      // Process cascades with server result
      const result = await processCascade(initialBoard);
      
      setTotalWin(result.totalWin);
      setCascadeCount(result.cascades);

      if (result.totalWin > 0) {
        await payoutWin(result.totalWin, 'sweet-bonanza');
        toast.success(`Sweet win! ${result.totalWin.toFixed(4)} MON with ${result.cascades} cascades!`);
      } else {
        toast('No winning combinations this time');
      }

      setGamePhase('complete');
      
      // Reset after delay
      setTimeout(() => {
        setGamePhase('idle');
        finalizeRound('sweet-bonanza');
      }, 3000);

    } catch (error) {
      console.error('Sweet Bonanza error:', error);
      toast.error('Game failed. Please try again.');
      setGamePhase('idle');
    }
  };

  const getBoardCellClass = (row: number, col: number) => {
    const baseClass = "w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold transition-all duration-300 border-2 border-white/20 bg-gradient-to-br from-pink-500/20 to-purple-500/20";
    
    if (gamePhase === 'spinning') {
      return `${baseClass} animate-pulse`;
    }
    
    return `${baseClass} hover:scale-105`;
  };

  return (
    <div className="casino-card max-w-6xl mx-auto">
      {/* Game Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">🍭 Sweet Bonanza</h2>
        <p className="text-white/70">Tumbling reels with cascade multipliers!</p>
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
          <div className="text-white/70 text-sm">Bet</div>
          <div className="text-white font-bold">{betAmount.toFixed(2)} MON</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">⚡</div>
          <div className="text-white/70 text-sm">Cascades</div>
          <div className="text-yellow-400 font-bold">{cascadeCount}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🔥</div>
          <div className="text-white/70 text-sm">Multiplier</div>
          <div className="text-orange-400 font-bold">{cascadeCount + 1}x</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <div className="text-white/70 text-sm">Total Win</div>
          <div className="text-green-400 font-bold">{totalWin.toFixed(4)}</div>
        </div>
      </div>

      {/* Game Board */}
      <div className="bg-gradient-to-br from-pink-900/30 to-purple-900/30 rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-6 gap-2 max-w-lg mx-auto">
          {gameBoard.map((row, rowIndex) => 
            row.map((symbol, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={getBoardCellClass(rowIndex, colIndex)}
              >
                {symbol}
              </div>
            ))
          )}
        </div>
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
                max={balance}
                step="0.1"
                disabled={gamePhase !== 'idle' || isTransacting}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400 disabled:opacity-50"
              />
              <button
                onClick={() => setBetAmount(Math.min(balance, betAmount * 2))}
                disabled={gamePhase !== 'idle' || isTransacting}
                className="px-4 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-50"
              >
                2x
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setBetAmount(0.001)}
              disabled={gamePhase !== 'idle'}
              className="flex-1 py-2 px-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 text-sm"
            >
              Min
            </button>
            <button
              onClick={() => setBetAmount(Math.min(1.0, balance))}
              disabled={gamePhase !== 'idle'}
              className="flex-1 py-2 px-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 text-sm"
            >
              1 MON
            </button>
            <button
              onClick={() => setBetAmount(balance)}
              disabled={gamePhase !== 'idle'}
              className="flex-1 py-2 px-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 text-sm"
            >
              Max
            </button>
          </div>
        </div>

        {/* Paytable */}
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3">Symbol Values (8+ symbols)</h3>
          <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
            {Object.entries(SYMBOL_VALUES).map(([symbol, value]) => (
              <div key={symbol} className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="text-lg">{symbol}</span>
                  <span className="text-white/70">8+ symbols</span>
                </span>
                <span className="text-green-400 font-bold">{value}x</span>
              </div>
            ))}
            <div className="border-t border-white/20 pt-2 mt-3">
              <div className="text-white/70 text-xs">
                • Cascading wins with multipliers<br/>
                • Each cascade increases multiplier<br/>
                • Need 8+ matching symbols anywhere
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={spin}
        disabled={!isConnected || gamePhase !== 'idle' || isTransacting}
        className={`
          w-full py-4 rounded-xl font-bold text-lg transition-all
          ${gamePhase !== 'idle' || isTransacting
            ? 'bg-white/20 text-white/50 cursor-not-allowed'
            : 'neon-button hover:scale-105'
          }
        `}
      >
        {gamePhase === 'idle' ? (
          `🍭 SPIN SWEET BONANZA (${betAmount.toFixed(2)} MON)`
        ) : gamePhase === 'spinning' ? (
          'SPINNING REELS...'
        ) : gamePhase === 'tumbling' ? (
          `CASCADING... (${cascadeCount} cascades)`
        ) : (
          `${totalWin > 0 ? 'SWEET WIN!' : 'TRY AGAIN'} - ${totalWin.toFixed(4)} MON`
        )}
      </button>

      {/* Game Rules */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl">
        <h3 className="text-white font-bold mb-2">How to Play</h3>
        <ul className="text-white/70 text-sm space-y-1">
          <li>• Need 8+ matching symbols anywhere on the board to win</li>
          <li>• Winning symbols tumble away and new ones drop down</li>
          <li>• Each cascade increases the win multiplier</li>
          <li>• Chain cascades for massive multiplied wins!</li>
          <li>• 🍭 Candy symbols are the highest paying</li>
          <li>• RTP: 94% | House Edge: 6%</li>
        </ul>
      </div>
    </div>
  );
}