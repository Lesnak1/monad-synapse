'use client';

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export interface GameParams {
  betAmount: number;
  clientSeed: string;
  nonce: number;
  [key: string]: any; // Allow game-specific parameters
}

export interface GameResult {
  success: boolean;
  result?: {
    gameType: string;
    isWin: boolean;
    winAmount: number;
    gameResult: any;
    proof: {
      serverSeedHash: string;
      clientSeed: string;
      nonce: number;
      gameHash: string;
    };
    timestamp: number;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface PayoutResult {
  success: boolean;
  transaction?: {
    hash: string;
    amount: number;
    timestamp: number;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export function useSecureGame() {
  const [isLoading, setIsLoading] = useState(false);
  const [gameNonce, setGameNonce] = useState(1);

  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem('authToken');
    const expiry = localStorage.getItem('authExpiry');
    const address = localStorage.getItem('authAddress');
    
    // Check if token is expired
    if (token && expiry && Date.now() > parseInt(expiry)) {
      console.log('🕐 Auth token expired, clearing...');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authExpiry');
      localStorage.removeItem('authAddress');
      return null;
    }
    
    return token;
  }, []);

  const generateClientSeed = useCallback((gameType: string, playerAddress: string) => {
    // Generate alphanumeric only client seed to pass server validation
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 9);
    const gamePrefix = gameType.replace(/[^a-zA-Z0-9]/g, ''); // Remove non-alphanumeric
    const addressSuffix = playerAddress?.slice(2, 8) || 'unknown'; // Use part of address (without 0x)
    return `${gamePrefix}${addressSuffix}${timestamp}${random}`;
  }, []);

  const playGame = useCallback(async (
    gameType: string,
    playerAddress: string,
    gameParams: Omit<GameParams, 'clientSeed' | 'nonce'>
  ): Promise<GameResult> => {
    try {
      setIsLoading(true);
      console.log('🎮 Starting game:', gameType, 'for player:', playerAddress);

      const clientSeed = generateClientSeed(gameType, playerAddress);
      const authToken = getAuthToken();

      const fullGameParams: GameParams = {
        betAmount: gameParams.betAmount || 0,
        ...gameParams,
        clientSeed,
        nonce: gameNonce
      };

      console.log('📡 Game request params:', {
        gameType,
        gameParams: fullGameParams,
        playerAddress,
        hasAuthToken: !!authToken
      });

      // Production authentication required
      if (!authToken) {
        throw new Error('Authentication required - Please connect wallet and sign message to play games');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      };

      const response = await fetch('/api/game/result', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gameType,
          gameParams: fullGameParams,
          playerAddress
        })
      });

      console.log('📨 Game response status:', response.status, response.statusText);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Game request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: response.url
        });
        
        // Log specific error details for debugging
        if (response.status === 401) {
          console.error('🔒 Authentication error - token may be expired or invalid');
          console.error('🔑 Current auth token:', getAuthToken()?.substring(0, 20) + '...');
        } else if (response.status === 400) {
          console.error('📝 Validation error - check game parameters');
          console.error('🎮 Game params sent:', fullGameParams);
        } else if (response.status === 500) {
          console.error('💥 Server error - check API endpoint');
        }
        
        throw new Error(errorData.error?.message || errorData.message || `Game request failed with status ${response.status}`);
      }

      const gameResult: GameResult = await response.json();
      
      // Increment nonce for next game
      setGameNonce(prev => prev + 1);
      
      return gameResult;

    } catch (error: any) {
      console.error(`${gameType} game error:`, error);
      return {
        success: false,
        error: {
          code: 'GAME_ERROR',
          message: error.message || 'Game execution failed',
          retryable: true
        }
      };
    } finally {
      setIsLoading(false);
    }
  }, [gameNonce, generateClientSeed, getAuthToken]);

  const processPayout = useCallback(async (
    playerAddress: string,
    winAmount: number,
    gameType: string
  ): Promise<PayoutResult> => {
    try {
      const authToken = getAuthToken();

      if (!authToken) {
        throw new Error('Authentication required');
      }

      const transactionId = `${gameType}-payout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('💳 Initiating payout:', { playerAddress, winAmount, gameType, transactionId });
      
      const response = await fetch('/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          playerAddress,
          winAmount,
          gameType,
          transactionId
        })
      });

      console.log('💳 Payout response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Payout failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: response.url
        });
        
        // Log specific payout errors
        if (response.status === 401) {
          console.error('🔒 Payout authentication error');
        } else if (response.status === 503) {
          console.error('🚨 Service unavailable - security audit blocking');
        } else if (response.status === 400) {
          console.error('📝 Payout validation error');
        } else if (response.status === 423) {
          console.error('🔒 Another payout in progress');
        }
        
        throw new Error(errorData.error?.message || `Payout failed with status ${response.status}`);
      }

      const payoutResult: PayoutResult = await response.json();
      
      if (payoutResult.success) {
        toast.success(`💰 Won ${winAmount.toFixed(4)} MON!`);
      }
      
      return payoutResult;

    } catch (error: any) {
      console.error('Payout error:', error);
      const payoutError: PayoutResult = {
        success: false,
        error: {
          code: 'PAYOUT_ERROR',
          message: error.message || 'Payout processing failed',
          retryable: true
        }
      };

      // Show appropriate error message
      if (error.message.includes('insufficient')) {
        toast.error('Pool is being refilled. Please try again in a few minutes.');
      } else if (error.message.includes('rate limit')) {
        toast.error('Too many requests. Please wait before trying again.');
      } else {
        toast.error('Payout failed. Please try again.');
      }

      return payoutError;
    }
  }, [getAuthToken]);

  const playGameWithPayout = useCallback(async (
    gameType: string,
    playerAddress: string,
    gameParams: Omit<GameParams, 'clientSeed' | 'nonce'>,
    onGameResult?: (result: GameResult) => void
  ): Promise<{ gameResult: GameResult; payoutResult?: PayoutResult }> => {
    console.log('🎮 Starting playGameWithPayout:', { gameType, playerAddress, gameParams });
    
    const gameResult = await playGame(gameType, playerAddress, gameParams);
    console.log('🎲 Game result received:', gameResult);
    
    // Call optional callback for UI updates
    if (onGameResult) {
      console.log('📞 Calling onGameResult callback');
      onGameResult(gameResult);
    }

    let payoutResult: PayoutResult | undefined;

    // Process payout if game was won
    if (gameResult.success && gameResult.result?.isWin && gameResult.result.winAmount > 0) {
      console.log('💰 Processing payout for win amount:', gameResult.result.winAmount);
      payoutResult = await processPayout(
        playerAddress, 
        gameResult.result.winAmount, 
        gameType
      );
      console.log('💳 Payout result:', payoutResult);
    } else {
      console.log('❌ No payout needed - not a win or no win amount');
    }

    console.log('✅ playGameWithPayout completed:', { gameResult, payoutResult });
    return { gameResult, payoutResult };
  }, [playGame, processPayout]);

  const resetNonce = useCallback(() => {
    setGameNonce(1);
  }, []);

  return {
    playGame,
    processPayout,
    playGameWithPayout,
    isLoading,
    gameNonce,
    resetNonce
  };
}