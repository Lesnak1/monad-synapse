'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameContract } from '@/lib/useGameContract';
// Game logic now handled server-side via /api/game/result for security
import { toast } from 'react-hot-toast';

const GEMS = ['💎', '💠', '🔷', '🔹', '🟦', '🟪', '⭐', '✨'];
const GEM_VALUES = {
  '💎': 100, // Rare diamond
  '💠': 50,  // Blue diamond
  '🔷': 25,  // Large blue diamond
  '🔹': 15,  // Small blue diamond
  '🟦': 10,  // Blue square
  '🟪': 8,   // Purple square
  '⭐': 5,   // Star
  '✨': 3    // Sparkles
};

type Position = { row: number; col: number };

export function DiamondsGame() {
  const { address, balance, isConnected, placeBet, payoutWin, gameState, isTransacting, finalizeRound } = useGameContract();
  const [betAmount, setBetAmount] = useState(1.0);
  const [gameBoard, setGameBoard] = useState<string[][]>([]);
  const [gamePhase, setGamePhase] = useState<'idle' | 'playing' | 'swapping' | 'matching' | 'complete'>('idle');
  const [selectedGem, setSelectedGem] = useState<Position | null>(null);
  const [moves, setMoves] = useState(15);
  const [score, setScore] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [combo, setCombo] = useState(0);
  const [targetScore, setTargetScore] = useState(0);

  const generateRandomGem = useCallback((): string => {
    const weights = [1, 2, 4, 6, 10, 12, 20, 15]; // Rare gems are less likely
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < GEMS.length; i++) {
      random -= weights[i];
      if (random <= 0) return GEMS[i];
    }
    return GEMS[GEMS.length - 1];
  }, []);

  const hasInitialMatches = useCallback((board: string[][]): boolean => {
    // Check for 3+ horizontal matches
    for (let row = 0; row < 8; row++) {
      let count = 1;
      for (let col = 1; col < 8; col++) {
        if (board[row][col] === board[row][col - 1]) {
          count++;
          if (count >= 3) return true;
        } else {
          count = 1;
        }
      }
    }

    // Check for 3+ vertical matches
    for (let col = 0; col < 8; col++) {
      let count = 1;
      for (let row = 1; row < 8; row++) {
        if (board[row][col] === board[row - 1][col]) {
          count++;
          if (count >= 3) return true;
        } else {
          count = 1;
        }
      }
    }

    return false;
  }, []);

  const initializeBoard = useCallback(() => {
    let board: string[][];
    do {
      board = Array(8).fill(null).map(() => 
        Array(8).fill(null).map(() => generateRandomGem())
      );
    } while (hasInitialMatches(board));
    
    setGameBoard(board);
  }, [generateRandomGem, hasInitialMatches]);

  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  const isValidPosition = (row: number, col: number): boolean => {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  };

  const areAdjacent = (pos1: Position, pos2: Position): boolean => {
    const rowDiff = Math.abs(pos1.row - pos2.row);
    const colDiff = Math.abs(pos1.col - pos2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  };

  const swapGems = (pos1: Position, pos2: Position, board: string[][]): string[][] => {
    const newBoard = board.map(row => [...row]);
    const temp = newBoard[pos1.row][pos1.col];
    newBoard[pos1.row][pos1.col] = newBoard[pos2.row][pos2.col];
    newBoard[pos2.row][pos2.col] = temp;
    return newBoard;
  };

  const findMatches = (board: string[][]): Position[] => {
    const matches: Position[] = [];
    const visited = new Set<string>();

    // Find horizontal matches
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 6; col++) {
        if (board[row][col] === board[row][col + 1] && board[row][col] === board[row][col + 2]) {
          // Found a 3+ match, extend it
          let endCol = col + 2;
          while (endCol + 1 < 8 && board[row][endCol + 1] === board[row][col]) {
            endCol++;
          }
          
          for (let c = col; c <= endCol; c++) {
            const key = `${row},${c}`;
            if (!visited.has(key)) {
              matches.push({ row, col: c });
              visited.add(key);
            }
          }
        }
      }
    }

    // Find vertical matches
    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 6; row++) {
        if (board[row][col] === board[row + 1][col] && board[row][col] === board[row + 2][col]) {
          // Found a 3+ match, extend it
          let endRow = row + 2;
          while (endRow + 1 < 8 && board[endRow + 1][col] === board[row][col]) {
            endRow++;
          }
          
          for (let r = row; r <= endRow; r++) {
            const key = `${r},${col}`;
            if (!visited.has(key)) {
              matches.push({ row: r, col });
              visited.add(key);
            }
          }
        }
      }
    }

    return matches;
  };

  const calculateScore = (matches: Position[], board: string[][]): number => {
    let points = 0;
    matches.forEach(pos => {
      const gem = board[pos.row][pos.col];
      const value = GEM_VALUES[gem as keyof typeof GEM_VALUES] || 1;
      points += value;
    });
    
    // Apply combo multiplier
    const comboMultiplier = Math.min(combo + 1, 10);
    return Math.floor(points * comboMultiplier);
  };

  const dropGems = (board: string[][], matches: Position[]): string[][] => {
    const newBoard = board.map(row => [...row]);
    
    // Mark matched gems as empty
    matches.forEach(pos => {
      newBoard[pos.row][pos.col] = '';
    });

    // Drop gems down
    for (let col = 0; col < 8; col++) {
      const column = [];
      for (let row = 7; row >= 0; row--) {
        if (newBoard[row][col] !== '') {
          column.push(newBoard[row][col]);
        }
      }
      
      // Fill from bottom up
      for (let i = 0; i < column.length; i++) {
        newBoard[7 - i][col] = column[i];
      }
      
      // Fill empty spaces with new gems
      for (let row = 0; row < 8 - column.length; row++) {
        newBoard[row][col] = generateRandomGem();
      }
    }

    return newBoard;
  };

  const processMatches = async (board: string[][]): Promise<{ board: string[][], totalScore: number, matchCount: number }> => {
    let currentBoard = board;
    let totalScore = 0;
    let matchCount = 0;
    let currentCombo = combo;

    while (true) {
      const matches = findMatches(currentBoard);
      if (matches.length === 0) break;

      const matchScore = calculateScore(matches, currentBoard);
      totalScore += matchScore;
      matchCount += matches.length;
      currentCombo++;
      
      setCombo(currentCombo);
      setScore(prev => prev + matchScore);

      currentBoard = dropGems(currentBoard, matches);
      setGameBoard(currentBoard);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { board: currentBoard, totalScore, matchCount };
  };

  const handleGemClick = async (row: number, col: number) => {
    if (gamePhase !== 'playing' || moves <= 0) return;

    const clickedPos = { row, col };

    if (!selectedGem) {
      setSelectedGem(clickedPos);
      return;
    }

    if (selectedGem.row === row && selectedGem.col === col) {
      setSelectedGem(null);
      return;
    }

    if (!areAdjacent(selectedGem, clickedPos)) {
      setSelectedGem(clickedPos);
      return;
    }

    // Try swap
    setGamePhase('swapping');
    const testBoard = swapGems(selectedGem, clickedPos, gameBoard);
    const matches = findMatches(testBoard);

    if (matches.length === 0) {
      toast.error('Invalid move - no matches created!');
      setSelectedGem(null);
      setGamePhase('playing');
      return;
    }

    setGameBoard(testBoard);
    setMoves(prev => prev - 1);
    setSelectedGem(null);

    setGamePhase('matching');
    const result = await processMatches(testBoard);
    setGameBoard(result.board);
    
    if (moves <= 1) {
      finishGame();
    } else {
      setGamePhase('playing');
    }
  };

  const finishGame = async () => {
    setGamePhase('complete');
    
    const winMultiplier = score >= targetScore ? 2.0 : score >= targetScore * 0.75 ? 1.5 : score >= targetScore * 0.5 ? 1.0 : 0;
    const finalWin = betAmount * winMultiplier;
    
    setTotalWin(finalWin);

    if (finalWin > 0) {
      await payoutWin(finalWin, 'diamonds');
      toast.success(`Diamond win! ${finalWin.toFixed(4)} MON for ${score} points!`);
    } else {
      toast('Try again! Need more points to win.');
    }

    setTimeout(() => {
      setGamePhase('idle');
      setScore(0);
      setCombo(0);
      setMoves(15);
      finalizeRound('diamonds');
    }, 5000);
  };

  const startGame = async () => {
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
      await placeBet(betAmount, 'diamonds');
      
      setGamePhase('playing');
      setScore(0);
      setCombo(0);
      setMoves(15);
      setTotalWin(0);
      setSelectedGem(null);
      
      // Set target score based on bet amount
      setTargetScore(Math.floor(betAmount * 5000));
      
      initializeBoard();
      toast.success('Diamond hunt started! Make matches to score points!');

    } catch (error) {
      console.error('Diamonds game error:', error);
      toast.error('Game failed. Please try again.');
      setGamePhase('idle');
    }
  };

  const getCellClass = (row: number, col: number) => {
    const isSelected = selectedGem?.row === row && selectedGem?.col === col;
    const baseClass = "w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-bold transition-all duration-200 cursor-pointer border-2";
    
    if (isSelected) {
      return `${baseClass} border-yellow-400 bg-yellow-400/20 scale-110 shadow-lg shadow-yellow-400/50`;
    }
    
    if (gamePhase === 'playing') {
      return `${baseClass} border-white/20 bg-gradient-to-br from-purple-900/30 to-blue-900/30 hover:scale-105 hover:border-white/40`;
    }
    
    return `${baseClass} border-white/20 bg-gradient-to-br from-purple-900/30 to-blue-900/30`;
  };

  return (
    <div className="casino-card max-w-6xl mx-auto">
      {/* Game Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">💎 Diamonds</h2>
        <p className="text-white/70">Match 3+ gems to score points and win prizes!</p>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-white/70 text-sm">Balance</div>
          <div className="text-white font-bold">{balance.toFixed(4)} MON</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-white/70 text-sm">Score</div>
          <div className="text-white font-bold">{score.toLocaleString()}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🎪</div>
          <div className="text-white/70 text-sm">Target</div>
          <div className="text-yellow-400 font-bold">{targetScore.toLocaleString()}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🔥</div>
          <div className="text-white/70 text-sm">Combo</div>
          <div className="text-orange-400 font-bold">{combo}x</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🎲</div>
          <div className="text-white/70 text-sm">Moves</div>
          <div className="text-blue-400 font-bold">{moves}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <div className="text-white/70 text-sm">Win</div>
          <div className="text-green-400 font-bold">{totalWin.toFixed(4)}</div>
        </div>
      </div>

      {/* Game Board */}
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-8 gap-1 sm:gap-2 max-w-lg mx-auto">
          {gameBoard.map((row, rowIndex) => 
            row.map((gem, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={getCellClass(rowIndex, colIndex)}
                onClick={() => handleGemClick(rowIndex, colIndex)}
              >
                {gem}
              </div>
            ))
          )}
        </div>
        
        {gamePhase === 'playing' && selectedGem && (
          <div className="text-center mt-4 text-white/70">
            Selected gem at ({selectedGem.row + 1}, {selectedGem.col + 1}) - Click adjacent gem to swap
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
                disabled={gamePhase !== 'idle' || isTransacting}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400 disabled:opacity-50"
              />
              <button
                onClick={() => setBetAmount(Math.min(5, betAmount * 2))}
                disabled={gamePhase !== 'idle' || isTransacting}
                className="px-4 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-50"
              >
                2x
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setBetAmount(0.1)}
              disabled={gamePhase !== 'idle'}
              className="flex-1 py-2 px-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 text-sm"
            >
              Min
            </button>
            <button
              onClick={() => setBetAmount(1.0)}
              disabled={gamePhase !== 'idle'}
              className="flex-1 py-2 px-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 text-sm"
            >
              1 MON
            </button>
            <button
              onClick={() => setBetAmount(5.0)}
              disabled={gamePhase !== 'idle'}
              className="flex-1 py-2 px-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 text-sm"
            >
              Max
            </button>
          </div>
        </div>

        {/* Gem Values */}
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3">Gem Values</h3>
          <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
            {Object.entries(GEM_VALUES).map(([gem, value]) => (
              <div key={gem} className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="text-lg">{gem}</span>
                </span>
                <span className="text-green-400 font-bold">{value} pts</span>
              </div>
            ))}
            <div className="border-t border-white/20 pt-2 mt-3">
              <div className="text-white/70 text-xs">
                • Match 3+ gems to score<br/>
                • Longer chains = higher combos<br/>
                • Reach target score to win
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={startGame}
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
          `💎 START DIAMOND HUNT (${betAmount.toFixed(2)} MON)`
        ) : gamePhase === 'playing' ? (
          `PLAYING - ${moves} moves left`
        ) : gamePhase === 'swapping' ? (
          'SWAPPING GEMS...'
        ) : gamePhase === 'matching' ? (
          'FINDING MATCHES...'
        ) : (
          `${totalWin > 0 ? 'DIAMOND WIN!' : 'GAME OVER'} - ${totalWin.toFixed(4)} MON`
        )}
      </button>

      {/* Game Rules */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl">
        <h3 className="text-white font-bold mb-2">How to Play</h3>
        <ul className="text-white/70 text-sm space-y-1">
          <li>• Click a gem, then click an adjacent gem to swap them</li>
          <li>• Create lines of 3+ matching gems to score points</li>
          <li>• Chains create combos for multiplied points</li>
          <li>• Reach the target score within 15 moves to win</li>
          <li>• Higher bets = higher target scores and rewards</li>
          <li>• RTP: 95% | House Edge: 5%</li>
        </ul>
      </div>
    </div>
  );
}