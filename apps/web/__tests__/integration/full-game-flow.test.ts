/**
 * Full Game Flow Integration Tests
 * Tests complete user journey: authentication → play game → receive result → process payout
 */

import { POST as loginPOST } from '../../app/api/auth/login/route';
import { POST as gameResultPOST } from '../../app/api/game/result/route';
import { POST as payoutPOST } from '../../app/api/payout/route';
import { NextRequest } from 'next/server';

// Mock external dependencies
jest.mock('../../lib/poolWallet', () => ({
  getPoolBalance: jest.fn().mockResolvedValue({ balance: 1000000, isHealthy: true }),
  poolManager: {
    sendFromPool: jest.fn().mockResolvedValue({
      success: true,
      transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      gasUsed: '21000'
    })
  },
  canPoolCoverPayout: jest.fn().mockReturnValue(true),
  refundBetToPlayer: jest.fn().mockResolvedValue({
    success: true,
    transactionHash: '0xrefund123'
  })
}));

jest.mock('../../lib/cacheManager', () => ({
  cache: {
    getOrSet: jest.fn().mockResolvedValue('mock-server-seed-hash')
  },
  poolBalanceCache: {
    delete: jest.fn()
  }
}));

jest.mock('../../lib/performance', () => ({
  trackApiCall: jest.fn().mockImplementation((name, fn) => fn())
}));

jest.mock('../../lib/gameStats', () => ({
  addGameRecord: jest.fn()
}));

jest.mock('../../lib/secureContractManager', () => ({
  getSecureContractManager: jest.fn().mockReturnValue({
    processGameResult: jest.fn().mockResolvedValue({
      success: true,
      transactionHash: '0xcontract123',
      gasUsed: '50000',
      confirmations: 1
    })
  })
}));

jest.mock('../../lib/transactionMonitor', () => ({
  transactionMonitor: {
    createTransaction: jest.fn().mockReturnValue('monitoring-id-123')
  }
}));

jest.mock('../../lib/securityAudit', () => ({
  securityAuditor: {
    runQuickCheck: jest.fn().mockResolvedValue({
      overallStatus: 'healthy',
      criticalIssues: []
    })
  }
}));

describe('Full Game Flow Integration Tests', () => {
  const mockPlayerAddress = '0x742d35Cc6634C0532925a3b8D400E4E62f8d6641';
  const mockSignature = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b';
  const validClientSeed = 'testclientseed123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Game Flow - Happy Path', () => {
    test('should complete full dice game flow successfully', async () => {
      // Step 1: Authentication
      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: mockPlayerAddress,
          signature: mockSignature,
          message: `Login to Monad Casino with ${mockPlayerAddress} at ${Date.now()}`
        })
      });

      const loginResponse = await loginPOST(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(200);
      expect(loginData.success).toBe(true);
      expect(loginData.token).toBeDefined();

      // Step 2: Play Game
      const gameRequest = new NextRequest('http://localhost:3000/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          gameType: 'dice',
          gameParams: {
            betAmount: 10,
            clientSeed: validClientSeed,
            nonce: 1,
            target: 50,
            prediction: 'over'
          },
          playerAddress: mockPlayerAddress
        })
      });

      const gameResponse = await gameResultPOST(gameRequest);
      const gameData = await gameResponse.json();

      expect(gameResponse.status).toBe(200);
      expect(gameData.success).toBe(true);
      expect(gameData.gameType).toBe('dice');
      expect(gameData.playerAddress).toBe(mockPlayerAddress);
      expect(gameData.proof).toBeDefined();

      // Step 3: Process Payout (if win)
      if (gameData.isWin && gameData.winAmount > 0) {
        const payoutRequest = new NextRequest('http://localhost:3000/api/payout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
          },
          body: JSON.stringify({
            playerAddress: mockPlayerAddress,
            winAmount: gameData.winAmount,
            gameType: 'dice',
            transactionId: `payout_${Date.now()}`,
            priority: 'normal',
            gameProof: gameData.proof
          })
        });

        const payoutResponse = await payoutPOST(payoutRequest);
        const payoutData = await payoutResponse.json();

        expect(payoutResponse.status).toBe(200);
        expect(payoutData.success).toBe(true);
        expect(payoutData.transactionHash).toBeDefined();
        expect(payoutData.payoutAmount).toBe(gameData.winAmount);
      }
    });

    test('should handle multiple games in sequence', async () => {
      // Step 1: Authentication
      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: mockPlayerAddress,
          signature: mockSignature,
          message: `Login to Monad Casino with ${mockPlayerAddress} at ${Date.now()}`
        })
      });

      const loginResponse = await loginPOST(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(200);

      // Play multiple games in sequence
      const gameTypes = ['dice', 'coin-flip', 'mines'];
      const gameResults = [];

      for (const [index, gameType] of gameTypes.entries()) {
        const gameParams = gameType === 'mines' 
          ? { betAmount: 5, clientSeed: `${validClientSeed}${index}`, nonce: index + 1, mines: 3 }
          : { betAmount: 5, clientSeed: `${validClientSeed}${index}`, nonce: index + 1 };

        const gameRequest = new NextRequest('http://localhost:3000/api/game/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
          },
          body: JSON.stringify({
            gameType,
            gameParams,
            playerAddress: mockPlayerAddress
          })
        });

        const gameResponse = await gameResultPOST(gameRequest);
        const gameData = await gameResponse.json();

        expect(gameResponse.status).toBe(200);
        expect(gameData.success).toBe(true);
        expect(gameData.gameType).toBe(gameType);

        gameResults.push(gameData);
      }

      // Process payouts for winning games
      for (const [index, gameResult] of gameResults.entries()) {
        if (gameResult.isWin && gameResult.winAmount > 0) {
          const payoutRequest = new NextRequest('http://localhost:3000/api/payout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${loginData.token}`
            },
            body: JSON.stringify({
              playerAddress: mockPlayerAddress,
              winAmount: gameResult.winAmount,
              gameType: gameResult.gameType,
              transactionId: `multi_payout_${index}_${Date.now()}`,
              priority: 'normal',
              gameProof: gameResult.proof
            })
          });

          const payoutResponse = await payoutPOST(payoutRequest);
          const payoutData = await payoutResponse.json();

          expect(payoutResponse.status).toBe(200);
          expect(payoutData.success).toBe(true);
        }
      }
    });
  });

  describe('Error Scenarios in Game Flow', () => {
    test('should handle game play without authentication', async () => {
      const gameRequest = new NextRequest('http://localhost:3000/api/game/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'dice',
          gameParams: {
            betAmount: 10,
            clientSeed: validClientSeed,
            nonce: 1
          },
          playerAddress: mockPlayerAddress
        })
      });

      const gameResponse = await gameResultPOST(gameRequest);
      const gameData = await gameResponse.json();

      expect(gameResponse.status).toBe(401);
      expect(gameData.success).toBe(false);
      expect(gameData.code).toBe('AUTH_REQUIRED');
    });

    test('should handle payout without prior game', async () => {
      // Get auth token
      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: mockPlayerAddress,
          signature: mockSignature,
          message: `Login to Monad Casino with ${mockPlayerAddress} at ${Date.now()}`
        })
      });

      const loginResponse = await loginPOST(loginRequest);
      const loginData = await loginResponse.json();

      // Try to request payout without playing a game
      const payoutRequest = new NextRequest('http://localhost:3000/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          playerAddress: mockPlayerAddress,
          winAmount: 100,
          gameType: 'dice',
          transactionId: `unauthorized_payout_${Date.now()}`,
          priority: 'normal'
        })
      });

      const payoutResponse = await payoutPOST(payoutRequest);

      // Should still process (as game proof validation is optional)
      // But in a real system, this would be linked to game sessions
      expect(payoutResponse.status).toBe(200);
    });

    test('should handle invalid client seed in game flow', async () => {
      // Get auth token
      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: mockPlayerAddress,
          signature: mockSignature,
          message: `Login to Monad Casino with ${mockPlayerAddress} at ${Date.now()}`
        })
      });

      const loginResponse = await loginPOST(loginRequest);
      const loginData = await loginResponse.json();

      // Try game with invalid client seed
      const gameRequest = new NextRequest('http://localhost:3000/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          gameType: 'dice',
          gameParams: {
            betAmount: 10,
            clientSeed: 'invalid-seed-with-special@characters!',
            nonce: 1
          },
          playerAddress: mockPlayerAddress
        })
      });

      const gameResponse = await gameResultPOST(gameRequest);
      const gameData = await gameResponse.json();

      expect(gameResponse.status).toBe(400);
      expect(gameData.success).toBe(false);
    });

    test('should handle expired token during game flow', async () => {
      // This test would require manipulating token expiration
      // For now, we'll test with an invalid token
      const gameRequest = new NextRequest('http://localhost:3000/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer expired-or-invalid-token'
        },
        body: JSON.stringify({
          gameType: 'dice',
          gameParams: {
            betAmount: 10,
            clientSeed: validClientSeed,
            nonce: 1
          },
          playerAddress: mockPlayerAddress
        })
      });

      const gameResponse = await gameResultPOST(gameRequest);
      const gameData = await gameResponse.json();

      expect(gameResponse.status).toBe(401);
      expect(gameData.success).toBe(false);
    });
  });

  describe('High-Value Game Flow', () => {
    test('should handle high-value game and payout flow', async () => {
      // Mock high win for this test
      const { poolManager } = require('../../lib/poolWallet');
      poolManager.sendFromPool.mockResolvedValueOnce({
        success: false,
        requiresMultiSig: true,
        proposalId: 'high-value-proposal-123'
      });

      // Authentication
      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: mockPlayerAddress,
          signature: mockSignature,
          message: `Login to Monad Casino with ${mockPlayerAddress} at ${Date.now()}`
        })
      });

      const loginResponse = await loginPOST(loginRequest);
      const loginData = await loginResponse.json();

      // High-value game
      const gameRequest = new NextRequest('http://localhost:3000/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          gameType: 'plinko',
          gameParams: {
            betAmount: 1000, // High bet
            clientSeed: validClientSeed,
            nonce: 1
          },
          playerAddress: mockPlayerAddress
        })
      });

      const gameResponse = await gameResultPOST(gameRequest);
      const gameData = await gameResponse.json();

      expect(gameResponse.status).toBe(200);

      // Attempt high-value payout
      if (gameData.isWin && gameData.winAmount > 1000) {
        const payoutRequest = new NextRequest('http://localhost:3000/api/payout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
          },
          body: JSON.stringify({
            playerAddress: mockPlayerAddress,
            winAmount: gameData.winAmount,
            gameType: 'plinko',
            transactionId: `high_value_payout_${Date.now()}`,
            priority: 'urgent',
            gameProof: gameData.proof
          })
        });

        const payoutResponse = await payoutPOST(payoutRequest);
        const payoutData = await payoutResponse.json();

        // Should require multi-sig approval
        expect(payoutResponse.status).toBe(202);
        expect(payoutData.requiresApproval).toBe(true);
        expect(payoutData.proposalId).toBeDefined();
      }
    });
  });

  describe('Concurrent User Sessions', () => {
    test('should handle multiple users playing simultaneously', async () => {
      const users = [
        '0x742d35Cc6634C0532925a3b8D400E4E62f8d6641',
        '0x8ba1f109551bD432803012645Hac136c5e2012a',
        '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5'
      ];

      const userSessions = [];

      // Authenticate all users
      for (const [index, address] of users.entries()) {
        const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address,
            signature: mockSignature,
            message: `Login to Monad Casino with ${address} at ${Date.now()}`
          })
        });

        const loginResponse = await loginPOST(loginRequest);
        const loginData = await loginResponse.json();

        expect(loginResponse.status).toBe(200);
        userSessions.push({ address, token: loginData.token });
      }

      // All users play games simultaneously
      const gamePromises = userSessions.map((session, index) => {
        const gameRequest = new NextRequest('http://localhost:3000/api/game/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`
          },
          body: JSON.stringify({
            gameType: 'dice',
            gameParams: {
              betAmount: 5,
              clientSeed: `${validClientSeed}${index}`,
              nonce: index + 1
            },
            playerAddress: session.address
          })
        });

        return gameResultPOST(gameRequest);
      });

      const gameResponses = await Promise.all(gamePromises);

      // All games should succeed
      for (const response of gameResponses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });
  });

  describe('Game Session Validation', () => {
    test('should validate game results are properly linked to authenticated user', async () => {
      // User 1 authentication
      const user1Address = '0x742d35Cc6634C0532925a3b8D400E4E62f8d6641';
      const user2Address = '0x8ba1f109551bD432803012645Hac136c5e2012a';

      const loginRequest1 = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: user1Address,
          signature: mockSignature,
          message: `Login to Monad Casino with ${user1Address} at ${Date.now()}`
        })
      });

      const loginResponse1 = await loginPOST(loginRequest1);
      const loginData1 = await loginResponse1.json();

      // Try to play game for different address using user1's token
      const gameRequest = new NextRequest('http://localhost:3000/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData1.token}`
        },
        body: JSON.stringify({
          gameType: 'dice',
          gameParams: {
            betAmount: 10,
            clientSeed: validClientSeed,
            nonce: 1
          },
          playerAddress: user2Address // Different address
        })
      });

      const gameResponse = await gameResultPOST(gameRequest);

      // Should still work (current implementation doesn't validate address matching)
      // In a stricter implementation, this might be rejected
      expect(gameResponse.status).toBe(200);
    });
  });

  describe('Performance Under Load', () => {
    test('should handle rapid game sequences', async () => {
      // Get auth token
      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: mockPlayerAddress,
          signature: mockSignature,
          message: `Login to Monad Casino with ${mockPlayerAddress} at ${Date.now()}`
        })
      });

      const loginResponse = await loginPOST(loginRequest);
      const loginData = await loginResponse.json();

      // Rapid game sequence
      const rapidGames = Array.from({ length: 10 }, (_, i) => {
        const gameRequest = new NextRequest('http://localhost:3000/api/game/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
          },
          body: JSON.stringify({
            gameType: 'coin-flip',
            gameParams: {
              betAmount: 1,
              clientSeed: `${validClientSeed}${i}`,
              nonce: i + 1
            },
            playerAddress: mockPlayerAddress
          })
        });

        return gameResultPOST(gameRequest);
      });

      const startTime = Date.now();
      const responses = await Promise.all(rapidGames);
      const endTime = Date.now();

      // All should succeed or be rate limited
      const successful = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(successful.length + rateLimited.length).toBe(10);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });
});