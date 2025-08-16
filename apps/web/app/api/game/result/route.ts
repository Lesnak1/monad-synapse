import { NextRequest, NextResponse } from 'next/server';
import { getPoolBalance } from '@/lib/poolWallet';
import { secureRandom, gameRandom, randomValidation } from '@/lib/secureRandom';
import { createHash } from 'crypto';
import { z } from 'zod';
import { authenticateRequest, requirePermission } from '@/lib/auth';
import { cache } from '@/lib/cacheManager';
import { trackApiCall } from '@/lib/performance';
import { addGameRecord } from '@/lib/gameStats';

// Input validation schema
const gameRequestSchema = z.object({
  gameType: z.enum(['mines', 'dice', 'crash', 'slots', 'plinko', 'slide', 'diamonds', 'burning-wins', 'sweet-bonanza', 'coin-flip', 'coin-master', 'roulette', 'blackjack', 'baccarat', 'keno', 'lottery', 'tower', 'spin-win', 'limbo']),
  gameParams: z.object({
    betAmount: z.number().min(0.1).max(1000),
    clientSeed: z.string().min(8).max(64).regex(/^[a-zA-Z0-9]+$/),
    nonce: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    mines: z.number().int().min(1).max(24).optional(),
    targetNumber: z.number().min(1).max(99).optional(),
    multiplier: z.number().min(1.01).max(100).optional(),
    prediction: z.enum(['under', 'over', 'heads', 'tails']).optional(),
    target: z.number().min(1).max(99).optional(),
  }),
  playerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().optional(),
  timestamp: z.number().optional(),
});

export async function POST(request: NextRequest) {
  return trackApiCall('game_result', async () => {
    try {
      console.log('🎮 Game result API called - Production Mode');
      
      // Production authentication required
      const authResult = await authenticateRequest(request);
      if (!authResult.isAuthenticated) {
        console.log('❌ Authentication failed in game result API:', authResult.error);
        console.log('Headers received:', {
          authorization: request.headers.get('Authorization')?.substring(0, 20) + '...',
          contentType: request.headers.get('Content-Type'),
          userAgent: request.headers.get('User-Agent')?.substring(0, 50) + '...'
        });
        return NextResponse.json({
          success: false,
          error: 'Authentication required - Please connect wallet and sign message',
          details: authResult.error,
          code: 'AUTH_REQUIRED'
        }, { status: 401 });
      }

      console.log('✅ User authenticated in game result API:', {
        address: 'address' in authResult.user! ? authResult.user.address : 'N/A',
        permissions: authResult.user!.permissions
      });

      // Check permissions
      if (!requirePermission('game:result')(authResult.user!)) {
        console.log('❌ Insufficient permissions for user');
        return NextResponse.json({
          success: false,
          error: 'Insufficient permissions for gameplay',
          code: 'INSUFFICIENT_PERMISSIONS'
        }, { status: 403 });
      }

    const body = await request.json();
    console.log('📨 Game request body received:', {
      gameType: body.gameType,
      betAmount: body.gameParams?.betAmount,
      playerAddress: body.playerAddress,
      hasClientSeed: !!body.gameParams?.clientSeed,
      hasNonce: body.gameParams?.nonce !== undefined,
      clientSeedLength: body.gameParams?.clientSeed?.length,
      clientSeedFormat: body.gameParams?.clientSeed?.match(/^[a-zA-Z0-9]+$/) ? 'valid' : 'invalid'
    });
    
    // Comprehensive input validation
    const validationResult = gameRequestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('❌ Game request validation failed:', validationResult.error.issues);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid request parameters',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    console.log('✅ Game request validation passed');

    const { gameType, gameParams, playerAddress } = validationResult.data;

    // Validate client seed and nonce
    console.log('🔍 Validating client seed:', {
      seed: gameParams.clientSeed,
      length: gameParams.clientSeed.length,
      format: /^[a-zA-Z0-9]+$/.test(gameParams.clientSeed)
    });
    
    if (!randomValidation.validateClientSeed(gameParams.clientSeed)) {
      console.error('❌ Invalid client seed format');
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid client seed format' 
      }, { status: 400 });
    }

    console.log('🔍 Validating nonce:', {
      nonce: gameParams.nonce,
      isInteger: Number.isInteger(gameParams.nonce),
      isInRange: gameParams.nonce >= 0 && gameParams.nonce < Number.MAX_SAFE_INTEGER
    });

    if (!randomValidation.validateNonce(gameParams.nonce)) {
      console.error('❌ Invalid nonce value');
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid nonce value' 
      }, { status: 400 });
    }

    console.log('✅ Client seed and nonce validation passed');

    // Get server seed hash for client verification (cached for performance)
    const serverSeedHash = await cache.getOrSet(
      `server_seed_hash_${Math.floor(Date.now() / 60000)}`, // Rotate every minute
      () => secureRandom.getServerSeedHash(),
      60000 // 1 minute TTL
    );
    
    // Generate cryptographically secure game result
    let gameResult: any = {};
    let winAmount = 0;
    let isWin = false;

    switch (gameType) {
      case 'mines':
        const { mines = 3, betAmount } = gameParams;
        if (mines < 1 || mines > 24) {
          return NextResponse.json({ success: false, error: 'Invalid mines count' }, { status: 400 });
        }
        
        const minePositions = gameRandom.mines(gameParams.clientSeed, gameParams.nonce, 25)
          .slice(0, mines)
          .sort((a, b) => a - b);
        
        const safeTiles = Array.from({ length: 25 }, (_, i) => i)
          .filter(i => !minePositions.includes(i));
        
        // Calculate fair multiplier based on revealed tiles
        const tilesRevealed = 1;
        const multiplier = Math.pow((25 - mines) / (25 - mines - tilesRevealed + 1), tilesRevealed);
        
        gameResult = {
          minePositions,
          safeTiles: safeTiles.slice(0, tilesRevealed),
          multiplier: Math.round(multiplier * 100) / 100,
          mines,
          gridSize: 25
        };
        
        isWin = true;
        winAmount = betAmount * gameResult.multiplier;
        break;

      case 'dice':
        const rollResult = gameRandom.dice(gameParams.clientSeed, gameParams.nonce);
        const target = gameParams.target || 50;
        const prediction = gameParams.prediction || 'over';
        
        if (target < 1 || target > 99) {
          return NextResponse.json({ success: false, error: 'Invalid target number' }, { status: 400 });
        }
        
        isWin = prediction === 'under' ? rollResult < target : rollResult > target;
        const winChance = prediction === 'under' ? target / 100 : (100 - target) / 100;
        const diceMultiplier = 0.99 / winChance; // 1% house edge
        winAmount = isWin ? gameParams.betAmount * diceMultiplier : 0;
        
        gameResult = {
          roll: Math.round(rollResult * 100) / 100,
          target,
          prediction,
          isWin,
          multiplier: Math.round(diceMultiplier * 100) / 100
        };
        break;

      case 'crash':
        const crashPoint = gameRandom.crash(gameParams.clientSeed, gameParams.nonce);
        const playerMultiplier = gameParams.multiplier || 2.0;
        
        if (playerMultiplier < 1.01 || playerMultiplier > 100) {
          return NextResponse.json({ success: false, error: 'Invalid multiplier' }, { status: 400 });
        }
        
        isWin = crashPoint >= playerMultiplier;
        winAmount = isWin ? gameParams.betAmount * playerMultiplier : 0;
        
        gameResult = {
          crashPoint,
          playerMultiplier,
          isWin
        };
        break;

      case 'coin-flip':
        const coinResult = gameRandom.dice(gameParams.clientSeed, gameParams.nonce) > 50 ? 'heads' : 'tails';
        const coinPrediction = gameParams.prediction || 'heads';
        
        isWin = coinResult === coinPrediction;
        winAmount = isWin ? gameParams.betAmount * 1.98 : 0; // 1% house edge
        
        gameResult = {
          result: coinResult,
          prediction: coinPrediction,
          isWin,
          multiplier: 1.98
        };
        break;

      case 'coin-master':
        // Coin Master style slot machine with multiple symbols
        const coinMasterSymbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🎰', '🔔'];
        const coinMasterReels = [];
        
        // Generate 3 reels with random symbols
        for (let i = 0; i < 3; i++) {
          const reelRoll = gameRandom.dice(gameParams.clientSeed, gameParams.nonce + i);
          const symbolIndex = Math.floor(reelRoll / 100 * coinMasterSymbols.length);
          coinMasterReels.push(coinMasterSymbols[symbolIndex]);
        }
        
        // Check for wins
        const uniqueSymbols = new Set(coinMasterReels).size;
        let coinMasterMultiplier = 0;
        
        if (uniqueSymbols === 1) {
          // All 3 same symbols
          const symbol = coinMasterReels[0];
          if (symbol === '💎') coinMasterMultiplier = 10;
          else if (symbol === '⭐') coinMasterMultiplier = 5;
          else if (symbol === '🎰') coinMasterMultiplier = 3;
          else coinMasterMultiplier = 2;
        } else if (uniqueSymbols === 2) {
          // 2 matching symbols
          coinMasterMultiplier = 1.5;
        }
        
        isWin = coinMasterMultiplier > 0;
        winAmount = isWin ? gameParams.betAmount * coinMasterMultiplier : 0;
        
        gameResult = {
          spinResult: coinMasterReels,
          symbols: coinMasterReels,
          multiplier: coinMasterMultiplier,
          isWin
        };
        break;

      case 'slots':
        const slotResults = gameRandom.slots(gameParams.clientSeed, gameParams.nonce, 5, 10);
        // Simple win detection - 3 matching symbols
        const firstReel = slotResults[0][1]; // Middle symbol of first reel
        const matches = slotResults.filter(reel => reel[1] === firstReel).length;
        
        isWin = matches >= 3;
        const slotMultiplier = matches === 5 ? 10 : matches === 4 ? 5 : matches === 3 ? 2 : 0;
        winAmount = isWin ? gameParams.betAmount * slotMultiplier : 0;
        
        gameResult = {
          reels: slotResults,
          matches,
          winningSymbol: firstReel,
          multiplier: slotMultiplier,
          isWin
        };
        break;

      case 'plinko':
        const path = gameRandom.plinko(gameParams.clientSeed, gameParams.nonce, 16);
        const leftMoves = (path.match(/L/g) || []).length;
        const rightMoves = path.length - leftMoves;
        
        // Calculate landing bucket (0-16)
        const bucket = Math.abs(leftMoves - rightMoves);
        const plinkoMultipliers = [1000, 130, 26, 9, 4, 2, 1.4, 1.4, 1.2, 1.4, 1.4, 2, 4, 9, 26, 130, 1000];
        const plinkoMultiplier = plinkoMultipliers[bucket] || 1;
        
        isWin = plinkoMultiplier > 1;
        winAmount = gameParams.betAmount * plinkoMultiplier;
        
        gameResult = {
          path,
          bucket,
          multiplier: plinkoMultiplier,
          isWin
        };
        break;

      case 'sweet-bonanza':
        // Generate secure 6x5 grid
        const bonanzaSymbols = ['🍭', '🍌', '🍇', '🍒', '🍊', '🟦', '🟪', '🔴'];
        const gridResults = [];
        for (let i = 0; i < 30; i++) { // 6x5 = 30 positions
          const secureRoll = secureRandom.generateSecureRandom(gameParams.clientSeed, gameParams.nonce + i);
          gridResults.push(bonanzaSymbols[Math.floor(secureRoll.value * bonanzaSymbols.length)]);
        }
        
        const grid = [];
        for (let i = 0; i < 6; i++) {
          grid.push(gridResults.slice(i * 5, (i + 1) * 5));
        }
        
        // Simple win detection (count matching symbols)
        const symbolCounts: {[key: string]: number} = {};
        gridResults.forEach(symbol => {
          symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
        });
        
        const maxCount = Math.max(...Object.values(symbolCounts));
        isWin = maxCount >= 8; // Need 8+ matching symbols
        const bonanzaMultiplier = maxCount >= 12 ? 5 : maxCount >= 10 ? 3 : maxCount >= 8 ? 2 : 0;
        winAmount = isWin ? gameParams.betAmount * bonanzaMultiplier : 0;
        
        gameResult = {
          grid,
          symbolCounts,
          maxCount,
          multiplier: bonanzaMultiplier,
          isWin
        };
        break;

      case 'diamonds':
        // Generate secure match-3 result
        const diamondRoll = gameRandom.dice(gameParams.clientSeed, gameParams.nonce);
        isWin = diamondRoll > 70; // 30% win chance
        const diamondMultiplier = isWin ? 1.5 + (diamondRoll - 70) / 30 * 2 : 0; // 1.5x to 3.5x
        winAmount = isWin ? gameParams.betAmount * diamondMultiplier : 0;
        
        gameResult = {
          roll: diamondRoll,
          threshold: 70,
          multiplier: Math.round(diamondMultiplier * 100) / 100,
          isWin
        };
        break;

      case 'slide':
        // Generate precision-based result
        const slideRoll = gameRandom.dice(gameParams.clientSeed, gameParams.nonce);
        isWin = slideRoll > 70; // 30% win chance for good precision
        const slideMultiplier = isWin ? 2 + (slideRoll - 70) / 30 * 3 : 0; // 2x to 5x
        winAmount = isWin ? gameParams.betAmount * slideMultiplier : 0;
        
        gameResult = {
          precision: slideRoll,
          threshold: 70,
          multiplier: Math.round(slideMultiplier * 100) / 100,
          isWin
        };
        break;

      case 'burning-wins':
        // Generate secure slot result
        const burningRoll = gameRandom.dice(gameParams.clientSeed, gameParams.nonce);
        isWin = burningRoll > 80; // 20% win chance
        const burningMultiplier = isWin ? 2 + (burningRoll - 80) / 20 * 8 : 0; // 2x to 10x
        winAmount = isWin ? gameParams.betAmount * burningMultiplier : 0;
        
        gameResult = {
          roll: burningRoll,
          threshold: 80,
          multiplier: Math.round(burningMultiplier * 100) / 100,
          isWin
        };
        break;

      case 'tower':
        // Tower climbing game - determine if tile is safe
        const towerRoll = gameRandom.dice(gameParams.clientSeed, gameParams.nonce);
        const difficulty = 'medium'; // Default difficulty
        const tilesPerLevel = 3; // Medium = 3 tiles
        const safeChance = (tilesPerLevel - 1) / tilesPerLevel * 100; // 66.67% chance for medium
        
        isWin = towerRoll < safeChance;
        const towerMultiplier = isWin ? 1.5 : 0; // Level multiplier
        winAmount = isWin ? gameParams.betAmount * towerMultiplier : 0;
        
        gameResult = {
          isSafe: isWin,
          roll: towerRoll,
          safeChance,
          multiplier: towerMultiplier,
          isWin
        };
        break;

      case 'spin-win':
        // 5-reel slot machine
        const spinResults = gameRandom.slots(gameParams.clientSeed, gameParams.nonce, 5, 3);
        // Simple win detection - 3 matching symbols in a line
        const centerLine = spinResults.map(reel => reel[1]); // Middle line
        const firstSymbol = centerLine[0];
        const spinMatches = centerLine.filter(symbol => symbol === firstSymbol).length;
        
        isWin = spinMatches >= 3;
        const spinMultiplier = spinMatches === 5 ? 10 : spinMatches === 4 ? 5 : spinMatches === 3 ? 2 : 0;
        winAmount = isWin ? gameParams.betAmount * spinMultiplier : 0;
        
        gameResult = {
          reels: spinResults,
          centerLine,
          matches: spinMatches,
          multiplier: spinMultiplier,
          winningLines: isWin ? [1] : [], // Middle line = index 1
          isWin
        };
        break;

      case 'limbo':
        // Same as crash for backend logic
        const limboPoint = gameRandom.crash(gameParams.clientSeed, gameParams.nonce);
        const targetMultiplier = gameParams.multiplier || 2.0;
        
        isWin = limboPoint >= targetMultiplier;
        winAmount = isWin ? gameParams.betAmount * targetMultiplier : 0;
        
        gameResult = {
          crashPoint: limboPoint,
          targetMultiplier,
          isWin
        };
        break;

      default:
        return NextResponse.json({ success: false, error: 'Unknown game type' }, { status: 400 });
    }

    // Generate game proof for verification
    const gameProof = {
      serverSeedHash,
      clientSeed: gameParams.clientSeed,
      nonce: gameParams.nonce,
      gameType,
      timestamp: Date.now(),
      gameHash: createHash('sha256')
        .update(`${serverSeedHash}:${gameParams.clientSeed}:${gameParams.nonce}:${gameType}`)
        .digest('hex')
    };

    // Record the game in user statistics
    const multiplier = gameResult.multiplier || (isWin ? winAmount / gameParams.betAmount : 0);
    addGameRecord(
      playerAddress,
      gameType,
      gameParams.betAmount,
      winAmount,
      isWin,
      multiplier
    );

    console.log('🎮 Game recorded:', {
      player: playerAddress,
      game: gameType,
      bet: gameParams.betAmount,
      win: winAmount,
      result: isWin ? 'WIN' : 'LOSS'
    });

    return NextResponse.json({
      success: true,
      gameResult,
      winAmount: Math.round(winAmount * 10000) / 10000,
      isWin,
      playerAddress,
      gameType,
      proof: gameProof,
      timestamp: Date.now(),
      version: '2.0' // Secure version
    });

    } catch (error) {
      console.error('Game result API error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Internal server error',
        timestamp: Date.now()
      }, { status: 500 });
    }
  });
}