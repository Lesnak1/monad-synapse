/**
 * Comprehensive Game Result API Tests
 * Tests all supported game types with validation, security, and edge cases
 */

import { POST } from '../../app/api/game/result/route';
import { NextRequest } from 'next/server';
import { authService } from '../../lib/auth';

// Mock auth service for testing
jest.mock('../../lib/auth', () => ({
  authService: {
    createSession: jest.fn(),
    validateToken: jest.fn()
  },
  authenticateRequest: jest.fn(),
  requirePermission: jest.fn()
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const { authenticateRequest, requirePermission } = require('../../lib/auth');

// Mock external dependencies
jest.mock('../../lib/poolWallet', () => ({
  getPoolBalance: jest.fn().mockResolvedValue({ balance: 1000000, isHealthy: true })
}));

jest.mock('../../lib/cacheManager', () => ({
  cache: {
    getOrSet: jest.fn().mockResolvedValue('mock-server-seed-hash')
  }
}));

jest.mock('../../lib/performance', () => ({
  trackApiCall: jest.fn().mockImplementation((name, fn) => fn())
}));

jest.mock('../../lib/gameStats', () => ({
  addGameRecord: jest.fn()
}));

describe('/api/game/result - Comprehensive Game Tests', () => {
  let authToken: string;
  const mockPlayerAddress = '0x742d35Cc6634C0532925a3b8D400E4E62f8d6641';
  const validClientSeed = 'testclientseed123';
  const validNonce = 1;

  beforeAll(async () => {
    // Mock authenticated session for testing
    mockAuthService.createSession.mockResolvedValue({
      token: 'mock-test-jwt-token',
      session: {
        id: 'test-session',
        address: mockPlayerAddress.toLowerCase(),
        permissions: ['game:play', 'game:result'],
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      }
    });
    
    // Mock authentication for API calls
    authenticateRequest.mockResolvedValue({
      isAuthenticated: true,
      user: {
        address: mockPlayerAddress.toLowerCase(),
        permissions: ['game:play', 'game:result']
      }
    });
    
    requirePermission.mockReturnValue(() => true);
    
    authToken = 'mock-test-jwt-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create authenticated game requests
  const createGameRequest = (gameType: string, betAmount: number = 1, additionalParams: any = {}) => {
    return new NextRequest('http://localhost:3000/api/game/result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        gameType,
        gameParams: {
          betAmount,
          clientSeed: validClientSeed,
          nonce: validNonce,
          ...additionalParams
        },
        playerAddress: mockPlayerAddress
      })
    });
  };

  describe('Authentication and Authorization', () => {
    test('should reject requests without authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/game/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'dice',
          gameParams: { betAmount: 1, clientSeed: validClientSeed, nonce: validNonce },
          playerAddress: mockPlayerAddress
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_REQUIRED');
    });

    test('should reject requests with invalid token', async () => {
      const request = new NextRequest('http://localhost:3000/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          gameType: 'dice',
          gameParams: { betAmount: 1, clientSeed: validClientSeed, nonce: validNonce },
          playerAddress: mockPlayerAddress
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('Input Validation', () => {
    test('should validate supported game types', async () => {
      const supportedGames = [
        'mines', 'dice', 'crash', 'slots', 'plinko', 'slide', 'diamonds',
        'burning-wins', 'sweet-bonanza', 'coin-flip', 'coin-master',
        'tower', 'spin-win', 'limbo'
      ];

      for (const gameType of supportedGames) {
        const request = createGameRequest(gameType);
        const response = await POST(request);
        
        // Should not fail validation for supported games
        expect(response.status).not.toBe(400);
      }
    });

    test('should reject unsupported game types', async () => {
      const unsupportedGames = ['poker', 'blackjack', 'roulette', 'invalid-game'];

      for (const gameType of unsupportedGames) {
        const request = createGameRequest(gameType);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      }
    });

    test('should validate bet amount range (0.1 - 1000 MON)', async () => {
      const invalidBetAmounts = [0, 0.05, -1, 1001, 10000];

      for (const betAmount of invalidBetAmounts) {
        const request = createGameRequest('dice', betAmount);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      }
    });

    test('should accept valid bet amounts', async () => {
      const validBetAmounts = [0.1, 1, 10, 100, 500, 1000];

      for (const betAmount of validBetAmounts) {
        const request = createGameRequest('dice', betAmount);
        const response = await POST(request);

        expect(response.status).toBe(200);
      }
    });

    test('should validate client seed format (alphanumeric only)', async () => {
      const invalidSeeds = [
        'seed-with-dash',
        'seed@with#special!',
        'seed with spaces',
        'seed_with_underscore',
        ''
      ];

      for (const clientSeed of invalidSeeds) {
        const request = new NextRequest('http://localhost:3000/api/game/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            gameType: 'dice',
            gameParams: { betAmount: 1, clientSeed, nonce: validNonce },
            playerAddress: mockPlayerAddress
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      }
    });

    test('should accept valid client seeds', async () => {
      const validSeeds = [
        'abc12345', // At least 8 chars
        'UPPERCASE123',
        'MixedCase123',
        '1234567890',
        'abcdefghijklmnopqrstuvwxyz',
        'a'.repeat(64) // Max length
      ];

      for (const clientSeed of validSeeds) {
        const request = new NextRequest('http://localhost:3000/api/game/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            gameType: 'dice',
            gameParams: { betAmount: 1, clientSeed, nonce: validNonce },
            playerAddress: mockPlayerAddress
          })
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
      }
    });

    test('should validate nonce range', async () => {
      const invalidNonces = [-1, -100, 1.5, Number.MAX_SAFE_INTEGER + 1];

      for (const nonce of invalidNonces) {
        const request = new NextRequest('http://localhost:3000/api/game/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            gameType: 'dice',
            gameParams: { betAmount: 1, clientSeed: validClientSeed, nonce },
            playerAddress: mockPlayerAddress
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      }
    });

    test('should validate player address format', async () => {
      const invalidAddresses = [
        'not-an-address',
        '0x123',
        '0xinvalid',
        '742d35Cc6634C0532925a3b8D400E4E62f8d6641', // Missing 0x
        '0x742d35Cc6634C0532925a3b8D400E4E62f8d6641EXTRA' // Too long
      ];

      for (const playerAddress of invalidAddresses) {
        const request = new NextRequest('http://localhost:3000/api/game/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            gameType: 'dice',
            gameParams: { betAmount: 1, clientSeed: validClientSeed, nonce: validNonce },
            playerAddress
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      }
    });
  });

  describe('Game-Specific Logic Tests', () => {
    describe('Dice Game', () => {
      test('should handle dice game with default parameters', async () => {
        const request = createGameRequest('dice');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.gameType).toBe('dice');
        expect(data.gameResult).toHaveProperty('roll');
        expect(data.gameResult).toHaveProperty('target');
        expect(data.gameResult).toHaveProperty('prediction');
        expect(data.gameResult).toHaveProperty('isWin');
        expect(data.gameResult).toHaveProperty('multiplier');
      });

      test('should handle dice game with custom target and prediction', async () => {
        const request = createGameRequest('dice', 1, { target: 25, prediction: 'under' });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.gameResult.target).toBe(25);
        expect(data.gameResult.prediction).toBe('under');
      });

      test('should reject invalid dice targets', async () => {
        const invalidTargets = [0, -1, 100, 101];

        for (const target of invalidTargets) {
          const request = createGameRequest('dice', 1, { target });
          const response = await POST(request);
          const data = await response.json();

          expect(response.status).toBe(400);
          expect(data.success).toBe(false);
        }
      });
    });

    describe('Mines Game', () => {
      test('should handle mines game with default parameters', async () => {
        const request = createGameRequest('mines');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.gameType).toBe('mines');
        expect(data.gameResult).toHaveProperty('minePositions');
        expect(data.gameResult).toHaveProperty('safeTiles');
        expect(data.gameResult).toHaveProperty('multiplier');
        expect(data.gameResult).toHaveProperty('gridSize', 25);
      });

      test('should handle mines game with custom mine count', async () => {
        const request = createGameRequest('mines', 1, { mines: 5 });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.gameResult.mines).toBe(5);
        expect(data.gameResult.minePositions).toHaveLength(5);
      });

      test('should reject invalid mine counts', async () => {
        const invalidMineCounts = [0, -1, 25, 26, 100];

        for (const mines of invalidMineCounts) {
          const request = createGameRequest('mines', 1, { mines });
          const response = await POST(request);
          const data = await response.json();

          expect(response.status).toBe(400);
          expect(data.success).toBe(false);
        }
      });
    });

    describe('Crash Game', () => {
      test('should handle crash game with default parameters', async () => {
        const request = createGameRequest('crash');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.gameType).toBe('crash');
        expect(data.gameResult).toHaveProperty('crashPoint');
        expect(data.gameResult).toHaveProperty('playerMultiplier');
        expect(data.gameResult).toHaveProperty('isWin');
      });

      test('should handle crash game with custom multiplier', async () => {
        const request = createGameRequest('crash', 1, { multiplier: 5.0 });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.gameResult.playerMultiplier).toBe(5.0);
      });

      test('should reject invalid multipliers', async () => {
        const invalidMultipliers = [0, 1.0, 101, -1];

        for (const multiplier of invalidMultipliers) {
          const request = createGameRequest('crash', 1, { multiplier });
          const response = await POST(request);
          const data = await response.json();

          expect(response.status).toBe(400);
          expect(data.success).toBe(false);
        }
      });
    });

    describe('Coin Flip Game', () => {
      test('should handle coin flip game', async () => {
        const request = createGameRequest('coin-flip');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.gameType).toBe('coin-flip');
        expect(data.gameResult).toHaveProperty('result');
        expect(data.gameResult).toHaveProperty('prediction');
        expect(data.gameResult).toHaveProperty('isWin');
        expect(data.gameResult).toHaveProperty('multiplier', 1.98);
        expect(['heads', 'tails']).toContain(data.gameResult.result);
      });

      test('should handle coin flip with custom prediction', async () => {
        const request = createGameRequest('coin-flip', 1, { prediction: 'tails' });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.gameResult.prediction).toBe('tails');
      });
    });

    describe('Coin Master Game', () => {
      test('should handle coin master game', async () => {
        const request = createGameRequest('coin-master');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.gameType).toBe('coin-master');
        expect(data.gameResult).toHaveProperty('spinResult');
        expect(data.gameResult).toHaveProperty('symbols');
        expect(data.gameResult).toHaveProperty('multiplier');
        expect(data.gameResult).toHaveProperty('isWin');
        expect(data.gameResult.spinResult).toHaveLength(3);
      });
    });

    describe('Slots Game', () => {
      test('should handle slots game', async () => {
        const request = createGameRequest('slots');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.gameType).toBe('slots');
        expect(data.gameResult).toHaveProperty('reels');
        expect(data.gameResult).toHaveProperty('matches');
        expect(data.gameResult).toHaveProperty('multiplier');
        expect(data.gameResult).toHaveProperty('isWin');
      });
    });

    describe('Plinko Game', () => {
      test('should handle plinko game', async () => {
        const request = createGameRequest('plinko');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.gameType).toBe('plinko');
        expect(data.gameResult).toHaveProperty('path');
        expect(data.gameResult).toHaveProperty('bucket');
        expect(data.gameResult).toHaveProperty('multiplier');
        expect(data.gameResult).toHaveProperty('isWin');
        expect(data.gameResult.bucket).toBeGreaterThanOrEqual(0);
        expect(data.gameResult.bucket).toBeLessThanOrEqual(16);
      });
    });

    describe('Sweet Bonanza Game', () => {
      test('should handle sweet bonanza game', async () => {
        const request = createGameRequest('sweet-bonanza');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.gameType).toBe('sweet-bonanza');
        expect(data.gameResult).toHaveProperty('grid');
        expect(data.gameResult).toHaveProperty('symbolCounts');
        expect(data.gameResult).toHaveProperty('maxCount');
        expect(data.gameResult).toHaveProperty('multiplier');
        expect(data.gameResult).toHaveProperty('isWin');
        expect(data.gameResult.grid).toHaveLength(6); // 6 rows
        expect(data.gameResult.grid[0]).toHaveLength(5); // 5 columns
      });
    });

    describe('Tower Game', () => {
      test('should handle tower game', async () => {
        const request = createGameRequest('tower');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.gameType).toBe('tower');
        expect(data.gameResult).toHaveProperty('isSafe');
        expect(data.gameResult).toHaveProperty('roll');
        expect(data.gameResult).toHaveProperty('safeChance');
        expect(data.gameResult).toHaveProperty('multiplier');
        expect(data.gameResult).toHaveProperty('isWin');
      });
    });

    describe('Limbo Game', () => {
      test('should handle limbo game', async () => {
        const request = createGameRequest('limbo');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.gameType).toBe('limbo');
        expect(data.gameResult).toHaveProperty('crashPoint');
        expect(data.gameResult).toHaveProperty('targetMultiplier');
        expect(data.gameResult).toHaveProperty('isWin');
      });

      test('should handle limbo with custom target multiplier', async () => {
        const request = createGameRequest('limbo', 1, { multiplier: 3.0 });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.gameResult.targetMultiplier).toBe(3.0);
      });
    });
  });

  describe('Response Structure Validation', () => {
    test('should return consistent response structure for all games', async () => {
      const gameTypes = ['dice', 'mines', 'crash', 'coin-flip', 'slots'];

      for (const gameType of gameTypes) {
        const request = createGameRequest(gameType);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('gameResult');
        expect(data).toHaveProperty('winAmount');
        expect(data).toHaveProperty('isWin');
        expect(data).toHaveProperty('playerAddress');
        expect(data).toHaveProperty('gameType');
        expect(data).toHaveProperty('proof');
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('version', '2.0');
      }
    });

    test('should include provably fair proof in all responses', async () => {
      const request = createGameRequest('dice');
      const response = await POST(request);
      const data = await response.json();

      expect(data.proof).toHaveProperty('serverSeedHash');
      expect(data.proof).toHaveProperty('clientSeed');
      expect(data.proof).toHaveProperty('nonce');
      expect(data.proof).toHaveProperty('gameType');
      expect(data.proof).toHaveProperty('timestamp');
      expect(data.proof).toHaveProperty('gameHash');
    });

    test('should include proper win amount calculations', async () => {
      const betAmount = 10;
      const request = createGameRequest('dice', betAmount);
      const response = await POST(request);
      const data = await response.json();

      expect(typeof data.winAmount).toBe('number');
      expect(data.winAmount).toBeGreaterThanOrEqual(0);
      
      if (data.isWin) {
        expect(data.winAmount).toBeGreaterThan(0);
      } else {
        expect(data.winAmount).toBe(0);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: 'invalid-json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    test('should handle missing game parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          gameType: 'dice',
          playerAddress: mockPlayerAddress
          // Missing gameParams
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('should return proper error structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          gameType: 'invalid-game',
          gameParams: { betAmount: 1, clientSeed: validClientSeed, nonce: validNonce },
          playerAddress: mockPlayerAddress
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('Performance and Timing', () => {
    test('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      const request = createGameRequest('dice');
      const response = await POST(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () => createGameRequest('dice'));
      const promises = requests.map(request => POST(request));
      
      const responses = await Promise.all(promises);
      
      // All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
      }
    });
  });
});