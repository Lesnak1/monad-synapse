/**
 * End-to-End Casino Flow Integration Tests
 * Testing complete user journey from authentication to payout
 */

import { NextRequest } from 'next/server';
import { POST as gameResultPOST } from '../../app/api/game/result/route';
import { POST as payoutPOST } from '../../app/api/payout/route';
import { AuthenticationService } from '../../lib/auth';
import { SecureGameEngine } from '../../lib/gameEngine';
import { SecureWalletManager } from '../../lib/secureWallet';
import { casinoDb } from '../../lib/database';

// Mock dependencies but allow some real functionality
jest.mock('../../lib/logger');

describe('Complete Casino Flow Integration', () => {
  let authService: AuthenticationService;
  let gameEngine: SecureGameEngine;
  let walletManager: SecureWalletManager;
  let playerAddress: string;
  let authToken: string;

  beforeEach(async () => {
    // Initialize services
    authService = AuthenticationService.getInstance();
    gameEngine = SecureGameEngine.getInstance();
    walletManager = SecureWalletManager.getInstance();
    
    // Clear any existing state
    authService['sessions'].clear();
    gameEngine['activeSessions'].clear();
    
    // Create test player
    playerAddress = global.createMockPlayerAddress();
    
    // Mock signature verification for authentication
    jest.spyOn(authService as any, 'verifySignature').mockReturnValue(true);
    
    // Create authenticated session
    const { token } = await authService.createSession(
      playerAddress,
      'mock-signature',
      `Login request for ${playerAddress}`
    );
    authToken = token;
    
    // Mock wallet operations
    jest.spyOn(walletManager, 'getWalletBalance').mockResolvedValue(1000);
    jest.spyOn(walletManager, 'executePoolPayout').mockImplementation(async (to, amount) => ({
      success: true,
      transaction: {
        hash: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from: 'pool-address',
        to,
        amount,
        timestamp: Date.now(),
        gasUsed: 21000,
        blockNumber: Math.floor(Math.random() * 1000000)
      }
    }));
  });

  describe('Complete Game Flow - Dice', () => {
    test('should complete full dice game flow', async () => {
      const betAmount = 5;
      const gameRequest = {
        gameType: 'dice' as const,
        gameParams: {
          betAmount,
          clientSeed: 'player-seed-123',
          nonce: 1
        },
        playerAddress
      };

      // Step 1: Submit game request
      const gameResponse = await gameResultPOST(new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(gameRequest)
      }));

      expect(gameResponse.status).toBe(200);
      const gameData = await gameResponse.json();
      
      expect(gameData.success).toBe(true);
      expect(gameData.result.gameType).toBe('dice');
      expect(gameData.result.proof).toBeDefined();
      
      // Step 2: If player won, process payout
      if (gameData.result.isWin && gameData.result.winAmount > 0) {
        const payoutRequest = {
          playerAddress,
          winAmount: gameData.result.winAmount,
          gameType: 'dice',
          transactionId: `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        const payoutResponse = await payoutPOST(new NextRequest('http://localhost:3002/api/payout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(payoutRequest)
        }));

        expect(payoutResponse.status).toBe(200);
        const payoutData = await payoutResponse.json();
        
        expect(payoutData.success).toBe(true);
        expect(payoutData.transaction).toBeDefined();
        expect(payoutData.transaction.hash).toBeDefined();
        expect(payoutData.transaction.amount).toBe(gameData.result.winAmount);
      }
    });
  });

  describe('Complete Game Flow - Mines', () => {
    test('should complete full mines game flow', async () => {
      const betAmount = 2;
      const gameRequest = {
        gameType: 'mines' as const,
        gameParams: {
          betAmount,
          clientSeed: 'mines-seed-456',
          nonce: 1,
          mineCount: 5,
          selectedTiles: [0, 1, 2, 3, 4] // First 5 tiles
        },
        playerAddress
      };

      const gameResponse = await gameResultPOST(new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(gameRequest)
      }));

      expect(gameResponse.status).toBe(200);
      const gameData = await gameResponse.json();
      
      expect(gameData.success).toBe(true);
      expect(gameData.result.gameType).toBe('mines');
      expect(gameData.result.gameResult.minePositions).toBeDefined();
      expect(gameData.result.gameResult.selectedTiles).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('Multiple Game Sessions', () => {
    test('should handle multiple concurrent games', async () => {
      const gamePromises = [];
      
      // Create 5 concurrent dice games
      for (let i = 0; i < 5; i++) {
        const gameRequest = {
          gameType: 'dice' as const,
          gameParams: {
            betAmount: 1,
            clientSeed: `concurrent-seed-${i}`,
            nonce: i + 1
          },
          playerAddress
        };

        const promise = gameResultPOST(new NextRequest('http://localhost:3002/api/game/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(gameRequest)
        }));
        
        gamePromises.push(promise);
      }

      const responses = await Promise.all(gamePromises);
      
      // All games should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });

    test('should handle rapid sequential games', async () => {
      const results = [];
      
      // Play 10 games sequentially
      for (let i = 0; i < 10; i++) {
        const gameRequest = {
          gameType: 'dice' as const,
          gameParams: {
            betAmount: 0.5,
            clientSeed: `sequential-seed-${i}`,
            nonce: i + 1
          },
          playerAddress
        };

        const response = await gameResultPOST(new NextRequest('http://localhost:3002/api/game/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(gameRequest)
        }));

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        
        results.push(data.result);
      }

      // Verify all results are unique and properly generated
      const hashes = results.map(r => r.proof.gameHash);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(10); // All hashes should be unique
    });
  });

  describe('Pool Balance Scenarios', () => {
    test('should handle insufficient pool balance gracefully', async () => {
      // Mock insufficient balance
      jest.spyOn(walletManager, 'getWalletBalance').mockResolvedValue(1); // Only 1 MON

      const gameRequest = {
        gameType: 'dice' as const,
        gameParams: {
          betAmount: 100, // Large bet that would win > pool balance
          clientSeed: 'big-win-seed',
          nonce: 1
        },
        playerAddress
      };

      const gameResponse = await gameResultPOST(new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(gameRequest)
      }));

      const gameData = await gameResponse.json();
      
      // Game should still complete
      expect(gameResponse.status).toBe(200);
      expect(gameData.success).toBe(true);

      // If player won, payout should fail due to insufficient pool
      if (gameData.result.isWin && gameData.result.winAmount > 1) {
        const payoutRequest = {
          playerAddress,
          winAmount: gameData.result.winAmount,
          gameType: 'dice',
          transactionId: `insufficient_${Date.now()}`
        };

        const payoutResponse = await payoutPOST(new NextRequest('http://localhost:3002/api/payout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(payoutRequest)
        }));

        expect(payoutResponse.status).toBe(503);
        const payoutData = await payoutResponse.json();
        expect(payoutData.error.code).toBe('POOL_INSUFFICIENT');
        expect(payoutData.error.retryable).toBe(true);
      }
    });

    test('should handle pool refill scenario', async () => {
      // Start with low balance
      jest.spyOn(walletManager, 'getWalletBalance').mockResolvedValue(1);

      const payoutRequest = {
        playerAddress,
        winAmount: 10,
        gameType: 'dice',
        transactionId: `refill_test_${Date.now()}`
      };

      // First payout should fail
      const firstPayoutResponse = await payoutPOST(new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payoutRequest)
      }));

      expect(firstPayoutResponse.status).toBe(503);

      // Simulate pool refill
      jest.spyOn(walletManager, 'getWalletBalance').mockResolvedValue(1000);

      // Retry with different transaction ID (simulating frontend retry)
      const retryPayoutRequest = {
        ...payoutRequest,
        transactionId: `refill_retry_${Date.now()}`
      };

      const retryPayoutResponse = await payoutPOST(new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(retryPayoutRequest)
      }));

      expect(retryPayoutResponse.status).toBe(200);
      const retryData = await retryPayoutResponse.json();
      expect(retryData.success).toBe(true);
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should handle game engine temporary failures', async () => {
      // Mock temporary failure
      const originalCreateSession = gameEngine.createGameSession;
      let callCount = 0;
      
      jest.spyOn(gameEngine, 'createGameSession').mockImplementation(async (...args) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary game engine failure');
        }
        return originalCreateSession.call(gameEngine, ...args);
      });

      const gameRequest = {
        gameType: 'dice' as const,
        gameParams: {
          betAmount: 1,
          clientSeed: 'recovery-test',
          nonce: 1
        },
        playerAddress
      };

      // First request should fail
      const firstResponse = await gameResultPOST(new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(gameRequest)
      }));

      expect(firstResponse.status).toBe(500);

      // Second request should succeed (with different nonce)
      const secondRequest = {
        ...gameRequest,
        gameParams: { ...gameRequest.gameParams, nonce: 2 }
      };

      const secondResponse = await gameResultPOST(new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(secondRequest)
      }));

      expect(secondResponse.status).toBe(200);
      const data = await secondResponse.json();
      expect(data.success).toBe(true);
    });

    test('should handle wallet transaction failures with retry', async () => {
      let failureCount = 0;
      
      jest.spyOn(walletManager, 'executePoolPayout').mockImplementation(async (to, amount) => {
        failureCount++;
        if (failureCount <= 2) {
          return { success: false, error: 'Network congestion' };
        }
        return {
          success: true,
          transaction: {
            hash: `retry_tx_${Date.now()}`,
            from: 'pool-address',
            to,
            amount,
            timestamp: Date.now()
          }
        };
      });

      const payoutRequest = {
        playerAddress,
        winAmount: 5,
        gameType: 'dice',
        transactionId: `retry_test_${Date.now()}`
      };

      // First two attempts should fail
      for (let i = 0; i < 2; i++) {
        const response = await payoutPOST(new NextRequest('http://localhost:3002/api/payout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            ...payoutRequest,
            transactionId: `${payoutRequest.transactionId}_attempt_${i}`
          })
        }));

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error.retryable).toBe(true);
      }

      // Third attempt should succeed
      const finalResponse = await payoutPOST(new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ...payoutRequest,
          transactionId: `${payoutRequest.transactionId}_final`
        })
      }));

      expect(finalResponse.status).toBe(200);
      const finalData = await finalResponse.json();
      expect(finalData.success).toBe(true);
    });
  });

  describe('Security Integration', () => {
    test('should prevent cross-player payouts', async () => {
      const otherPlayerAddress = global.createMockPlayerAddress();
      
      // Try to request payout for different address
      const payoutRequest = {
        playerAddress: otherPlayerAddress, // Different from authenticated session
        winAmount: 10,
        gameType: 'dice',
        transactionId: `cross_player_${Date.now()}`
      };

      const response = await payoutPOST(new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` // Token for different player
        },
        body: JSON.stringify(payoutRequest)
      }));

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error.code).toBe('AUTHZ_ERROR');
    });

    test('should track all transactions in database', async () => {
      const gameRequest = {
        gameType: 'dice' as const,
        gameParams: {
          betAmount: 3,
          clientSeed: 'tracking-test',
          nonce: 1
        },
        playerAddress
      };

      // Play game
      const gameResponse = await gameResultPOST(new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(gameRequest)
      }));

      const gameData = await gameResponse.json();
      expect(gameData.success).toBe(true);

      // Process payout if won
      if (gameData.result.isWin) {
        const payoutRequest = {
          playerAddress,
          winAmount: gameData.result.winAmount,
          gameType: 'dice',
          transactionId: `tracking_payout_${Date.now()}`
        };

        await payoutPOST(new NextRequest('http://localhost:3002/api/payout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(payoutRequest)
        }));

        // Verify transactions are tracked
        const playerTransactions = await casinoDb.getGameTransactionsByPlayer(playerAddress);
        expect(playerTransactions.length).toBeGreaterThan(0);
        
        const latestTransaction = playerTransactions[0];
        expect(latestTransaction.gameType).toBe('dice');
        expect(latestTransaction.betAmount).toBe(3);
        expect(latestTransaction.playerAddress.toLowerCase()).toBe(playerAddress.toLowerCase());
      }
    });
  });
});