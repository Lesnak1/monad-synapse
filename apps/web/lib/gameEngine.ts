/**
 * Server-side Game Engine
 * Secure game logic execution with provably fair results
 */

import { secureRandom, gameRandom } from './secureRandom';
import { z } from 'zod';

export interface GameSession {
  sessionId: string;
  playerAddress: string;
  gameType: string;
  betAmount: number;
  clientSeed: string;
  nonce: number;
  gameState: any;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface GameResult {
  success: boolean;
  gameResult: any;
  winAmount: number;
  isWin: boolean;
  multiplier: number;
  proof: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    gameHash: string;
  };
  session: GameSession;
}

// Game configuration and rules
const GAME_CONFIGS = {
  mines: {
    minMines: 1,
    maxMines: 24,
    gridSize: 25,
    maxMultiplier: 50,
    houseEdge: 0.02 // 2%
  },
  dice: {
    minTarget: 1,
    maxTarget: 99,
    maxMultiplier: 99,
    houseEdge: 0.01 // 1%
  },
  crash: {
    minMultiplier: 1.01,
    maxMultiplier: 100,
    baseMultiplier: 0.99,
    houseEdge: 0.01 // 1%
  },
  slots: {
    reels: 5,
    symbols: 10,
    maxMultiplier: 50,
    houseEdge: 0.05 // 5%
  },
  plinko: {
    rows: 16,
    maxMultiplier: 1000,
    houseEdge: 0.02 // 2%
  }
};

export class SecureGameEngine {
  private static instance: SecureGameEngine;
  private activeSessions: Map<string, GameSession> = new Map();

  static getInstance(): SecureGameEngine {
    if (!SecureGameEngine.instance) {
      SecureGameEngine.instance = new SecureGameEngine();
    }
    return SecureGameEngine.instance;
  }

  /**
   * Create a new game session
   */
  createGameSession(
    playerAddress: string,
    gameType: string,
    betAmount: number,
    clientSeed: string,
    nonce: number
  ): GameSession {
    const sessionId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: GameSession = {
      sessionId,
      playerAddress: playerAddress.toLowerCase(),
      gameType,
      betAmount,
      clientSeed,
      nonce,
      gameState: {},
      isActive: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Execute game logic securely on server
   */
  async executeGame(sessionId: string, gameParams: any): Promise<GameResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive || session.expiresAt < Date.now()) {
      throw new Error('Invalid or expired game session');
    }

    // Validate game parameters
    this.validateGameParams(session.gameType, gameParams);

    const gameResult = await this.processGameLogic(session, gameParams);
    
    // Mark session as completed
    session.isActive = false;
    
    return gameResult;
  }

  /**
   * Process game logic based on game type
   */
  private async processGameLogic(session: GameSession, gameParams: any): Promise<GameResult> {
    const { gameType, clientSeed, nonce, betAmount } = session;
    const config = GAME_CONFIGS[gameType as keyof typeof GAME_CONFIGS];
    
    if (!config) {
      throw new Error(`Unsupported game type: ${gameType}`);
    }

    let gameResult: any = {};
    let winAmount = 0;
    let isWin = false;
    let multiplier = 0;

    switch (gameType) {
      case 'mines':
        const result = this.processMinesGame(session, gameParams, config);
        gameResult = result.gameResult;
        winAmount = result.winAmount;
        isWin = result.isWin;
        multiplier = result.multiplier;
        break;

      case 'dice':
        const diceResult = this.processDiceGame(session, gameParams, config);
        gameResult = diceResult.gameResult;
        winAmount = diceResult.winAmount;
        isWin = diceResult.isWin;
        multiplier = diceResult.multiplier;
        break;

      case 'crash':
        const crashResult = this.processCrashGame(session, gameParams, config);
        gameResult = crashResult.gameResult;
        winAmount = crashResult.winAmount;
        isWin = crashResult.isWin;
        multiplier = crashResult.multiplier;
        break;

      case 'slots':
        const slotsResult = this.processSlotsGame(session, gameParams, config);
        gameResult = slotsResult.gameResult;
        winAmount = slotsResult.winAmount;
        isWin = slotsResult.isWin;
        multiplier = slotsResult.multiplier;
        break;

      case 'plinko':
        const plinkoResult = this.processPlinkoGame(session, gameParams, config);
        gameResult = plinkoResult.gameResult;
        winAmount = plinkoResult.winAmount;
        isWin = plinkoResult.isWin;
        multiplier = plinkoResult.multiplier;
        break;

      default:
        throw new Error(`Unsupported game type: ${gameType}`);
    }

    // Generate proof
    const serverSeedHash = secureRandom.getServerSeedHash();
    const proof = {
      serverSeedHash,
      clientSeed,
      nonce,
      gameHash: secureRandom.createGameSeed(clientSeed, nonce).hash
    };

    return {
      success: true,
      gameResult,
      winAmount: Math.round(winAmount * 10000) / 10000,
      isWin,
      multiplier: Math.round(multiplier * 100) / 100,
      proof,
      session
    };
  }

  /**
   * Process Mines game logic
   */
  private processMinesGame(session: GameSession, params: any, config: any) {
    const { mines = 3, revealTile } = params;
    const { clientSeed, nonce, betAmount } = session;

    // Validate mines count
    if (mines < config.minMines || mines > config.maxMines) {
      throw new Error(`Invalid mines count: ${mines}`);
    }

    // Generate mine positions
    const minePositions = gameRandom.mines(clientSeed, nonce, config.gridSize)
      .slice(0, mines)
      .sort((a, b) => a - b);

    // Check if revealed tile hits a mine
    const hitMine = revealTile !== undefined && minePositions.includes(revealTile);

    let winAmount = 0;
    let isWin = false;
    let multiplier = 0;

    if (!hitMine && revealTile !== undefined) {
      // Safe tile revealed - calculate multiplier
      const safeCount = config.gridSize - mines;
      const revealedCount = 1; // For simplicity, assume 1 tile revealed
      
      // Calculate fair multiplier with house edge
      const baseMultiplier = Math.pow(safeCount / (safeCount - revealedCount + 1), revealedCount);
      multiplier = baseMultiplier * (1 - config.houseEdge);
      
      winAmount = betAmount * multiplier;
      isWin = true;
    }

    return {
      gameResult: {
        minePositions,
        revealedTile: revealTile,
        hitMine,
        mines,
        gridSize: config.gridSize,
        safeTilesRemaining: config.gridSize - mines - (hitMine ? 0 : 1)
      },
      winAmount,
      isWin,
      multiplier
    };
  }

  /**
   * Process Dice game logic
   */
  private processDiceGame(session: GameSession, params: any, config: any) {
    const { target = 50, prediction = 'over' } = params;
    const { clientSeed, nonce, betAmount } = session;

    if (target < config.minTarget || target > config.maxTarget) {
      throw new Error(`Invalid target: ${target}`);
    }

    const roll = gameRandom.dice(clientSeed, nonce);
    const isWin = prediction === 'under' ? roll < target : roll > target;
    
    let winAmount = 0;
    let multiplier = 0;

    if (isWin) {
      const winChance = prediction === 'under' ? target / 100 : (100 - target) / 100;
      multiplier = (1 - config.houseEdge) / winChance;
      winAmount = betAmount * multiplier;
    }

    return {
      gameResult: {
        roll: Math.round(roll * 100) / 100,
        target,
        prediction,
        isWin
      },
      winAmount,
      isWin,
      multiplier
    };
  }

  /**
   * Process Crash game logic
   */
  private processCrashGame(session: GameSession, params: any, config: any) {
    const { cashOutAt = 2.0 } = params;
    const { clientSeed, nonce, betAmount } = session;

    if (cashOutAt < config.minMultiplier || cashOutAt > config.maxMultiplier) {
      throw new Error(`Invalid cash out multiplier: ${cashOutAt}`);
    }

    const crashPoint = gameRandom.crash(clientSeed, nonce);
    const isWin = crashPoint >= cashOutAt;
    
    let winAmount = 0;
    let multiplier = 0;

    if (isWin) {
      multiplier = cashOutAt * config.baseMultiplier;
      winAmount = betAmount * multiplier;
    }

    return {
      gameResult: {
        crashPoint,
        cashOutAt,
        isWin
      },
      winAmount,
      isWin,
      multiplier
    };
  }

  /**
   * Process Slots game logic
   */
  private processSlotsGame(session: GameSession, params: any, config: any) {
    const { clientSeed, nonce, betAmount } = session;

    const reels = gameRandom.slots(clientSeed, nonce, config.reels, config.symbols);
    
    // Determine winning combinations
    const paylines = this.calculateSlotPaylines(reels);
    const totalWin = paylines.reduce((sum, line) => sum + line.payout, 0);
    
    const isWin = totalWin > 0;
    const multiplier = isWin ? (totalWin * (1 - config.houseEdge)) / betAmount : 0;
    const winAmount = isWin ? betAmount * multiplier : 0;

    return {
      gameResult: {
        reels,
        paylines,
        totalWin,
        isWin
      },
      winAmount,
      isWin,
      multiplier
    };
  }

  /**
   * Process Plinko game logic
   */
  private processPlinkoGame(session: GameSession, params: any, config: any) {
    const { clientSeed, nonce, betAmount } = session;

    const path = gameRandom.plinko(clientSeed, nonce, config.rows);
    const leftMoves = (path.match(/L/g) || []).length;
    const rightMoves = path.length - leftMoves;
    
    // Calculate landing bucket
    const bucket = Math.abs(leftMoves - rightMoves);
    
    // Plinko multiplier distribution (bell curve)
    const multipliers = [1000, 130, 26, 9, 4, 2, 1.4, 1.4, 1.2, 1.4, 1.4, 2, 4, 9, 26, 130, 1000];
    let multiplier = multipliers[bucket] || 1;
    
    // Apply house edge
    multiplier *= (1 - config.houseEdge);
    
    const isWin = multiplier > 1;
    const winAmount = betAmount * multiplier;

    return {
      gameResult: {
        path,
        bucket,
        leftMoves,
        rightMoves,
        isWin
      },
      winAmount,
      isWin,
      multiplier
    };
  }

  /**
   * Calculate slot paylines (simplified)
   */
  private calculateSlotPaylines(reels: number[][]): Array<{ line: number; symbols: number[]; payout: number }> {
    const paylines = [];
    
    // Check horizontal lines
    for (let row = 0; row < 3; row++) {
      const line = reels.map(reel => reel[row]);
      const payout = this.calculateLinePayout(line);
      if (payout > 0) {
        paylines.push({ line: row, symbols: line, payout });
      }
    }
    
    return paylines;
  }

  /**
   * Calculate payout for a line of symbols
   */
  private calculateLinePayout(symbols: number[]): number {
    if (symbols.length < 3) return 0;
    
    const first = symbols[0];
    let count = 1;
    
    for (let i = 1; i < symbols.length; i++) {
      if (symbols[i] === first) {
        count++;
      } else {
        break;
      }
    }
    
    // Payout table (simplified)
    const payouts: { [key: number]: number } = {
      3: 2,   // 3 matching symbols: 2x
      4: 5,   // 4 matching symbols: 5x
      5: 10   // 5 matching symbols: 10x
    };
    
    return payouts[count] || 0;
  }

  /**
   * Validate game parameters
   */
  private validateGameParams(gameType: string, params: any): void {
    const schemas: { [key: string]: z.ZodSchema } = {
      mines: z.object({
        mines: z.number().int().min(1).max(24).optional(),
        revealTile: z.number().int().min(0).max(24).optional()
      }),
      dice: z.object({
        target: z.number().min(1).max(99).optional(),
        prediction: z.enum(['under', 'over']).optional()
      }),
      crash: z.object({
        cashOutAt: z.number().min(1.01).max(100).optional()
      }),
      slots: z.object({}), // No additional params needed
      plinko: z.object({}) // No additional params needed
    };

    const schema = schemas[gameType];
    if (schema) {
      const result = schema.safeParse(params);
      if (!result.success) {
        throw new Error(`Invalid game parameters: ${result.error.message}`);
      }
    }
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }
}

// Export singleton instance
export const gameEngine = SecureGameEngine.getInstance();

// Auto-cleanup expired sessions every 5 minutes
setInterval(() => {
  gameEngine.cleanupExpiredSessions();
}, 5 * 60 * 1000);