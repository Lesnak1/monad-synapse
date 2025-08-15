/**
 * Cryptographically Secure Random Number Generation
 * Replaces weak Math.random() with provably fair, secure randomness
 */

import { createHash, randomBytes } from 'crypto';

export interface SecureRandomResult {
  value: number;
  seed: string;
  hash: string;
  timestamp: number;
  blockHash?: string;
}

export interface GameSeed {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  combined: string;
  hash: string;
}

export class SecureRandomGenerator {
  private static instance: SecureRandomGenerator;
  private serverSeed: string = '';
  
  static getInstance(): SecureRandomGenerator {
    if (!SecureRandomGenerator.instance) {
      SecureRandomGenerator.instance = new SecureRandomGenerator();
    }
    return SecureRandomGenerator.instance;
  }

  constructor() {
    this.generateNewServerSeed();
  }

  /**
   * Generate cryptographically secure server seed
   */
  private generateNewServerSeed(): void {
    this.serverSeed = randomBytes(32).toString('hex');
  }

  /**
   * Create a provably fair game seed
   */
  createGameSeed(clientSeed: string, nonce: number): GameSeed {
    if (!clientSeed || clientSeed.length < 8) {
      throw new Error('Client seed must be at least 8 characters');
    }

    const combined = `${this.serverSeed}:${clientSeed}:${nonce}`;
    const hash = createHash('sha256').update(combined).digest('hex');

    return {
      serverSeed: this.serverSeed,
      clientSeed,
      nonce,
      combined,
      hash
    };
  }

  /**
   * Generate cryptographically secure random number (0-1)
   */
  generateSecureRandom(clientSeed: string, nonce: number): SecureRandomResult {
    const gameSeed = this.createGameSeed(clientSeed, nonce);
    
    // Use first 8 bytes of hash for random value
    const hashBytes = Buffer.from(gameSeed.hash, 'hex').slice(0, 8);
    
    // Convert to number between 0 and 1
    let value = 0;
    for (let i = 0; i < 8; i++) {
      value += hashBytes[i] * Math.pow(256, -(i + 1));
    }

    return {
      value,
      seed: gameSeed.combined,
      hash: gameSeed.hash,
      timestamp: Date.now()
    };
  }

  /**
   * Generate random integer in range [min, max]
   */
  generateSecureInt(clientSeed: string, nonce: number, min: number, max: number): number {
    const random = this.generateSecureRandom(clientSeed, nonce);
    return Math.floor(random.value * (max - min + 1)) + min;
  }

  /**
   * Generate multiple secure random values for complex games
   */
  generateMultipleRandom(clientSeed: string, startNonce: number, count: number): SecureRandomResult[] {
    const results: SecureRandomResult[] = [];
    
    for (let i = 0; i < count; i++) {
      results.push(this.generateSecureRandom(clientSeed, startNonce + i));
    }
    
    return results;
  }

  /**
   * Verify a game result using provided seeds
   */
  verifyGameResult(
    serverSeed: string, 
    clientSeed: string, 
    nonce: number, 
    expectedHash: string
  ): boolean {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    const actualHash = createHash('sha256').update(combined).digest('hex');
    return actualHash === expectedHash;
  }

  /**
   * Get server seed hash for client verification (before game)
   */
  getServerSeedHash(): string {
    return createHash('sha256').update(this.serverSeed).digest('hex');
  }

  /**
   * Reveal server seed after game completion
   */
  revealServerSeed(): string {
    const revealed = this.serverSeed;
    this.generateNewServerSeed(); // Generate new seed for next game
    return revealed;
  }

  /**
   * Enhanced randomness with blockchain entropy
   */
  async generateWithBlockchainEntropy(
    clientSeed: string, 
    nonce: number, 
    blockHash?: string
  ): Promise<SecureRandomResult> {
    let enhancedSeed = this.serverSeed;
    
    if (blockHash) {
      // Combine with recent block hash for additional entropy
      enhancedSeed = createHash('sha256')
        .update(`${this.serverSeed}:${blockHash}`)
        .digest('hex');
    }

    const combined = `${enhancedSeed}:${clientSeed}:${nonce}:${Date.now()}`;
    const hash = createHash('sha256').update(combined).digest('hex');
    
    // Use multiple hash rounds for extra security
    const finalHash = createHash('sha256').update(hash).digest('hex');
    
    const hashBytes = Buffer.from(finalHash, 'hex').slice(0, 8);
    let value = 0;
    for (let i = 0; i < 8; i++) {
      value += hashBytes[i] * Math.pow(256, -(i + 1));
    }

    return {
      value,
      seed: combined,
      hash: finalHash,
      timestamp: Date.now(),
      blockHash
    };
  }
}

// Singleton instance
export const secureRandom = SecureRandomGenerator.getInstance();

// Game-specific secure random functions
export const gameRandom = {
  /**
   * Generate secure random for dice game
   */
  dice: (clientSeed: string, nonce: number): number => {
    const random = secureRandom.generateSecureRandom(clientSeed, nonce);
    return Math.floor(random.value * 100 * 10000) / 10000; // 4 decimal precision
  },

  /**
   * Generate secure random for mines game
   */
  mines: (clientSeed: string, nonce: number, gridSize: number = 25): number[] => {
    const results = secureRandom.generateMultipleRandom(clientSeed, nonce, gridSize);
    return results.map(r => Math.floor(r.value * gridSize));
  },

  /**
   * Generate secure random for slot games
   */
  slots: (clientSeed: string, nonce: number, reels: number = 5, symbols: number = 10): number[][] => {
    const results = secureRandom.generateMultipleRandom(clientSeed, nonce, reels);
    return results.map(r => {
      const symbolIndex = Math.floor(r.value * symbols);
      return [symbolIndex, (symbolIndex + 1) % symbols, (symbolIndex + 2) % symbols];
    });
  },

  /**
   * Generate secure random for crash game
   */
  crash: (clientSeed: string, nonce: number): number => {
    const random = secureRandom.generateSecureRandom(clientSeed, nonce);
    // Use exponential distribution for crash multiplier
    const e = 2.718281828;
    const multiplier = Math.max(1.0, -Math.log(random.value) / Math.log(e)) * 0.99;
    return Math.floor(multiplier * 100) / 100; // 2 decimal precision
  },

  /**
   * Generate secure random for plinko
   */
  plinko: (clientSeed: string, nonce: number, rows: number = 16): string => {
    const results = secureRandom.generateMultipleRandom(clientSeed, nonce, rows);
    return results.map(r => r.value < 0.5 ? 'L' : 'R').join('');
  }
};

// Validation functions
export const randomValidation = {
  /**
   * Validate client seed format
   */
  validateClientSeed: (seed: string): boolean => {
    return seed.length >= 8 && seed.length <= 64 && /^[a-zA-Z0-9]+$/.test(seed);
  },

  /**
   * Validate nonce value
   */
  validateNonce: (nonce: number): boolean => {
    return Number.isInteger(nonce) && nonce >= 0 && nonce < Number.MAX_SAFE_INTEGER;
  },

  /**
   * Validate game result against seeds
   */
  validateGameResult: (
    serverSeed: string,
    clientSeed: string, 
    nonce: number,
    expectedResult: number,
    gameType: string
  ): boolean => {
    try {
      const gameSeed = secureRandom.createGameSeed(clientSeed, nonce);
      let actualResult: number;

      switch (gameType) {
        case 'dice':
          actualResult = gameRandom.dice(clientSeed, nonce);
          break;
        case 'crash':
          actualResult = gameRandom.crash(clientSeed, nonce);
          break;
        default:
          return false;
      }

      return Math.abs(actualResult - expectedResult) < 0.0001; // Allow tiny floating point differences
    } catch (error) {
      return false;
    }
  }
};