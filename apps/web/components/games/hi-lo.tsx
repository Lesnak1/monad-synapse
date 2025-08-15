'use client';

import { useState } from 'react';
import { useGameContract } from '@/lib/useGameContract';
import { useSecureGame } from '@/lib/useSecureGame';
import { toast } from 'react-hot-toast';

interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: string;
  value: number;
  color: 'red' | 'black';
}

export function HiLoGame() {
  const { address, balance, isConnected, placeBet, payoutWin, gameState, isTransacting, finalizeRound } = useGameContract();
  const [betAmount, setBetAmount] = useState(1.0);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [gamePhase, setGamePhase] = useState<'betting' | 'guessing' | 'revealing' | 'complete'>('betting');
  const [streak, setStreak] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [canCashOut, setCanCashOut] = useState(false);

  const suits: Array<'♠' | '♥' | '♦' | '♣'> = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const createCard = (rank: string, suit: '♠' | '♥' | '♦' | '♣'): Card => {
    let value = ranks.indexOf(rank) + 1;
    if (rank === 'A') value = 1; // Ace low
    
    return {
      suit,
      rank,
      value,
      color: suit === '♥' || suit === '♦' ? 'red' : 'black'
    };
  };

  const generateRandomCard = (exclude?: Card): Card => {
    let card: Card;
    do {
      const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
      const randomSuit = suits[Math.floor(Math.random() * suits.length)];
      card = createCard(randomRank, randomSuit);
    } while (exclude && card.rank === exclude.rank && card.suit === exclude.suit);
    
    return card;
  };

  const startGame = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (betAmount < 0.001 || betAmount > balance) {
      toast.error('Bet amount must be between 0.001 and ${balance.toFixed(4)} MON');
      return;
    }

    if (balance < betAmount) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      // Place initial bet
      await placeBet(betAmount, 'hi-lo');
      
      // Start game
      setGamePhase('guessing');
      setCurrentCard(generateRandomCard());
      setNextCard(null);
      setStreak(0);
      setTotalWin(0);
      setMultiplier(1.0);
      setCanCashOut(false);

    } catch (error) {
      toast.error('Failed to start game. Please try again.');
    }
  };

  const { playGame } = useSecureGame();

  const makeGuess = async (guess: 'higher' | 'lower') => {
    if (!currentCard || gamePhase !== 'guessing' || !address) return;

    try {
      setGamePhase('revealing');
      
      // Use secure server-side game logic
      const gameResult = await playGame('hi-lo', address, {
        betAmount,
        guess,
        currentCardValue: currentCard.value
      });
      
      if (!gameResult.success) {
        toast.error('Game failed. Please try again.');
        setGamePhase('guessing');
        return;
      }

      const result = gameResult.result!;
      const newCard = createCard(
        ranks[(result as any).nextCardValue - 1] || ranks[0], 
        suits[Math.floor(Math.random() * 4)]
      );
      setNextCard(newCard);

      // Wait for reveal animation
      await new Promise(resolve => setTimeout(resolve, 1500));

      const isCorrect = result.isWin;
      
      if (isCorrect) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        
        // Calculate multiplier based on streak
        const newMultiplier = Math.pow(1.8, newStreak);
        setMultiplier(newMultiplier);
        
        const currentWin = betAmount * newMultiplier;
        setTotalWin(currentWin);
        setCanCashOut(true);
        
        toast.success(`Correct! Streak: ${newStreak} | Multiplier: ${newMultiplier.toFixed(2)}x`);
        
        // Move to next round
        setCurrentCard(newCard);
        setNextCard(null);
        setGamePhase('guessing');
        
      } else {
        // Wrong guess - lose everything
        setStreak(0);
        setMultiplier(1.0);
        setTotalWin(0);
        setCanCashOut(false);
        setGamePhase('complete');
        
        toast.error(`Wrong! The card was ${guess === 'higher' ? 'lower' : 'higher'}`);
        
        // Process payout if there was a win amount
        if (result.winAmount > 0) {
          try {
            await payoutWin(result.winAmount, 'hi-lo');
          } catch (error) {
            console.error('Payout failed:', error);
          }
        }
        
        // Reset after 3 seconds
        setTimeout(() => {
          setGamePhase('betting');
          setCurrentCard(null);
          setNextCard(null);
          finalizeRound('hi-lo');
        }, 3000);
      }

    } catch (error) {
      toast.error('Guess failed. Please try again.');
      setGamePhase('guessing');
    }
  };

  const cashOut = async () => {
    if (totalWin <= 0) return;

    try {
      await payoutWin(totalWin, 'hi-lo');
      toast.success(`Cashed out ${totalWin.toFixed(4)} MON!`);
      
      // Reset game
      setGamePhase('betting');
      setCurrentCard(null);
      setNextCard(null);
      setStreak(0);
      setTotalWin(0);
      setMultiplier(1.0);
      setCanCashOut(false);
      finalizeRound('hi-lo');
      
    } catch (error) {
      toast.error('Cash out failed. Please try again.');
    }
  };

  const CardComponent = ({ card, isRevealing }: { card: Card; isRevealing?: boolean }) => (
    <div className={`
      w-24 h-32 md:w-32 md:h-40 rounded-xl border-2 flex flex-col items-center justify-center
      font-bold text-xl md:text-2xl transition-all duration-500
      ${isRevealing ? 'animate-pulse scale-110' : ''}
      ${card.color === 'red' 
        ? 'bg-white text-red-600 border-red-300' 
        : 'bg-white text-black border-gray-300'
      }
    `}>
      <div className="text-sm md:text-base">{card.suit}</div>
      <div className="text-2xl md:text-3xl">{card.rank}</div>
      <div className="text-sm md:text-base rotate-180">{card.suit}</div>
    </div>
  );

  const CardBack = () => (
    <div className="w-24 h-32 md:w-32 md:h-40 rounded-xl border-2 border-purple-400 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
      <div className="text-white text-3xl">🎴</div>
    </div>
  );

  return (
    <div className="casino-card max-w-4xl mx-auto">
      {/* Game Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">🎴 Hi-Lo Cards</h2>
        <p className="text-white/70">Guess if the next card will be higher or lower!</p>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-white/70 text-sm">Balance</div>
          <div className="text-white font-bold">{balance.toFixed(4)} MON</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🔥</div>
          <div className="text-white/70 text-sm">Streak</div>
          <div className="text-orange-400 font-bold">{streak}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">📈</div>
          <div className="text-white/70 text-sm">Multiplier</div>
          <div className="text-green-400 font-bold">{multiplier.toFixed(2)}x</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <div className="text-white/70 text-sm">Current Win</div>
          <div className="text-yellow-400 font-bold">{totalWin.toFixed(4)}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-white/70 text-sm">Bet</div>
          <div className="text-white font-bold">{betAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Game Area */}
      <div className="bg-gradient-to-b from-green-900/20 to-blue-900/20 rounded-2xl p-6 mb-6">
        {gamePhase === 'betting' ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎴</div>
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Play?</h3>
            <p className="text-white/70 mb-6">Set your bet and start guessing!</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-8 py-8">
            {/* Current Card */}
            <div className="text-center">
              <div className="text-white/70 text-sm mb-2">Current Card</div>
              {currentCard && <CardComponent card={currentCard} />}
              {currentCard && (
                <div className="text-white/70 text-xs mt-2">Value: {currentCard.value}</div>
              )}
            </div>

            {/* VS */}
            <div className="text-white/50 text-2xl font-bold">VS</div>

            {/* Next Card */}
            <div className="text-center">
              <div className="text-white/70 text-sm mb-2">Next Card</div>
              {gamePhase === 'revealing' && nextCard ? (
                <CardComponent card={nextCard} isRevealing />
              ) : (
                <CardBack />
              )}
              {gamePhase === 'revealing' && nextCard && (
                <div className="text-white/70 text-xs mt-2">Value: {nextCard.value}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-6">
        {gamePhase === 'betting' && (
          <div className="grid md:grid-cols-2 gap-6">
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
                  disabled={isTransacting}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-purple-400 disabled:opacity-50"
                />
                <button
                  onClick={() => setBetAmount(Math.min(5, betAmount * 2))}
                  disabled={isTransacting}
                  className="px-4 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-50"
                >
                  2x
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={startGame}
                disabled={!isConnected || isTransacting || betAmount < 0.001 || betAmount > balance}
                className={`
                  w-full py-3 rounded-xl font-bold transition-all
                  ${!isConnected || isTransacting || betAmount < 0.001 || betAmount > balance
                    ? 'bg-white/20 text-white/50 cursor-not-allowed'
                    : 'neon-button hover:scale-105'
                  }
                `}
              >
                🎴 START GAME ({betAmount.toFixed(2)} MON)
              </button>
            </div>
          </div>
        )}

        {gamePhase === 'guessing' && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => makeGuess('higher')}
              disabled={isTransacting}
              className="py-4 rounded-xl font-bold text-lg bg-green-500/20 text-green-400 border-2 border-green-500/50 hover:bg-green-500/30 disabled:opacity-50 transition-all"
            >
              📈 HIGHER
            </button>
            <button
              onClick={() => makeGuess('lower')}
              disabled={isTransacting}
              className="py-4 rounded-xl font-bold text-lg bg-red-500/20 text-red-400 border-2 border-red-500/50 hover:bg-red-500/30 disabled:opacity-50 transition-all"
            >
              📉 LOWER
            </button>
          </div>
        )}

        {canCashOut && gamePhase === 'guessing' && (
          <button
            onClick={cashOut}
            disabled={isTransacting}
            className="w-full py-4 rounded-xl font-bold text-lg bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50 hover:bg-yellow-500/30 disabled:opacity-50 transition-all"
          >
            💰 CASH OUT ({totalWin.toFixed(4)} MON)
          </button>
        )}

        {gamePhase === 'revealing' && (
          <div className="text-center">
            <div className="animate-pulse text-white text-lg font-bold">
              Revealing card...
            </div>
          </div>
        )}

        {gamePhase === 'complete' && (
          <div className="text-center">
            <div className="text-red-400 text-lg font-bold mb-4">
              Game Over! Starting new game in 3 seconds...
            </div>
          </div>
        )}
      </div>

      {/* Multiplier Chart */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl">
        <h3 className="text-white font-bold mb-3">Multiplier Chart</h3>
        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(streak => (
            <div
              key={streak}
              className={`
                py-2 rounded-lg
                ${streak <= 5 ? 'bg-green-500/20 text-green-400' : 
                  streak <= 8 ? 'bg-yellow-500/20 text-yellow-400' : 
                  'bg-red-500/20 text-red-400'}
              `}
            >
              <div className="font-bold">{streak}</div>
              <div className="text-xs">{Math.pow(1.8, streak).toFixed(1)}x</div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Rules */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl">
        <h3 className="text-white font-bold mb-2">How to Play</h3>
        <ul className="text-white/70 text-sm space-y-1">
          <li>• Guess if the next card will be higher or lower than the current card</li>
          <li>• Each correct guess increases your multiplier (1.8x per streak)</li>
          <li>• Cash out anytime to secure your winnings</li>
          <li>• One wrong guess loses everything - risk vs reward!</li>
          <li>• Ace = 1, Jack = 11, Queen = 12, King = 13</li>
          <li>• RTP: 95% | House Edge: 5%</li>
        </ul>
      </div>
    </div>
  );
}