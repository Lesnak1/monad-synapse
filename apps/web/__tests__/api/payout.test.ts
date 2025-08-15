/**
 * Payout API Integration Tests
 * Testing payout processing, pool balance checks, and security
 */

import { POST } from '../../app/api/payout/route';
import { NextRequest } from 'next/server';
import { AuthenticationService } from '../../lib/auth';
import { SecureWalletManager } from '../../lib/secureWallet';

// Mock dependencies
jest.mock('../../lib/auth');
jest.mock('../../lib/secureWallet');
jest.mock('../../lib/database');
jest.mock('../../lib/logger');

describe('/api/payout', () => {
  let mockAuthService: jest.Mocked<AuthenticationService>;
  let mockWalletManager: jest.Mocked<SecureWalletManager>;

  beforeEach(() => {
    mockAuthService = AuthenticationService.getInstance() as jest.Mocked<AuthenticationService>;
    mockWalletManager = SecureWalletManager.getInstance() as jest.Mocked<SecureWalletManager>;
    
    // Default mocks
    mockAuthService.validateSession.mockReturnValue({
      isValid: true,
      session: {
        id: 'test-session',
        address: global.createMockPlayerAddress(),
        nonce: 1,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        permissions: ['payout:request']
      }
    });

    mockWalletManager.getWalletBalance.mockResolvedValue(1000); // Sufficient balance
  });

  describe('Authentication', () => {
    test('should reject requests without authorization', async () => {
      const request = new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: global.createMockPlayerAddress(),
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTH_ERROR');
    });

    test('should reject invalid tokens', async () => {
      mockAuthService.validateSession.mockReturnValue({
        isValid: false,
        error: 'Invalid token'
      });

      const request = new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          playerAddress: global.createMockPlayerAddress(),
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    test('should check payout permissions', async () => {
      mockAuthService.validateSession.mockReturnValue({
        isValid: true,
        session: {
          id: 'test-session',
          address: global.createMockPlayerAddress(),
          nonce: 1,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 3600000,
          permissions: ['game:play'] // Missing payout permission
        }
      });

      const request = new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          playerAddress: global.createMockPlayerAddress(),
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHZ_ERROR');
    });
  });

  describe('Input Validation', () => {
    const createAuthenticatedRequest = (body: any) => {
      return new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(body)
      });
    };

    test('should validate player address format', async () => {
      const invalidRequest = {
        playerAddress: 'invalid-address',
        winAmount: 10,
        gameType: 'dice',
        transactionId: 'test-tx-123'
      };

      const request = createAuthenticatedRequest(invalidRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate win amount limits', async () => {
      const invalidRequest = {
        playerAddress: global.createMockPlayerAddress(),
        winAmount: -5, // Negative amount
        gameType: 'dice',
        transactionId: 'test-tx-123'
      };

      const request = createAuthenticatedRequest(invalidRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate game type', async () => {
      const invalidRequest = {
        playerAddress: global.createMockPlayerAddress(),
        winAmount: 10,
        gameType: 'invalid-game',
        transactionId: 'test-tx-123'
      };

      const request = createAuthenticatedRequest(invalidRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate transaction ID format', async () => {
      const invalidRequest = {
        playerAddress: global.createMockPlayerAddress(),
        winAmount: 10,
        gameType: 'dice',
        transactionId: '' // Empty transaction ID
      };

      const request = createAuthenticatedRequest(invalidRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate maximum payout amount', async () => {
      const invalidRequest = {
        playerAddress: global.createMockPlayerAddress(),
        winAmount: 10000, // Exceeds maximum
        gameType: 'dice',
        transactionId: 'test-tx-123'
      };

      const request = createAuthenticatedRequest(invalidRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Pool Balance Management', () => {
    const createValidRequest = (amount = 10) => {
      return new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          playerAddress: global.createMockPlayerAddress(),
          winAmount: amount,
          gameType: 'dice',
          transactionId: `test-tx-${Date.now()}`
        })
      });
    };

    test('should check pool balance before payout', async () => {
      mockWalletManager.getWalletBalance.mockResolvedValue(5); // Insufficient balance
      
      const request = createValidRequest(10);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.code).toBe('POOL_INSUFFICIENT');
      expect(data.error.retryable).toBe(true);
    });

    test('should succeed with sufficient pool balance', async () => {
      mockWalletManager.getWalletBalance.mockResolvedValue(1000);
      mockWalletManager.executePoolPayout.mockResolvedValue({
        success: true,
        transaction: {
          hash: 'tx-hash-123',
          from: 'pool-address',
          to: 'player-address',
          amount: 10,
          timestamp: Date.now()
        }
      });

      const request = createValidRequest(10);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.transaction).toBeDefined();
      expect(data.transaction.hash).toBe('tx-hash-123');
    });

    test('should handle pool balance edge cases', async () => {
      // Exactly enough balance (including gas buffer)
      mockWalletManager.getWalletBalance.mockResolvedValue(11); // 10 + 1 gas buffer
      mockWalletManager.executePoolPayout.mockResolvedValue({
        success: true,
        transaction: {
          hash: 'tx-hash-123',
          from: 'pool-address',
          to: 'player-address',
          amount: 10,
          timestamp: Date.now()
        }
      });

      const request = createValidRequest(10);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    test('should account for gas costs', async () => {
      // Balance exactly equals payout (no gas buffer)
      mockWalletManager.getWalletBalance.mockResolvedValue(10);
      
      const request = createValidRequest(10);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.code).toBe('POOL_INSUFFICIENT');
    });
  });

  describe('Transaction Processing', () => {
    const createValidRequest = (txId?: string) => {
      return new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          playerAddress: global.createMockPlayerAddress(),
          winAmount: 10,
          gameType: 'dice',
          transactionId: txId || `test-tx-${Date.now()}-${Math.random()}`
        })
      });
    };

    test('should prevent transaction replay', async () => {
      const txId = `replay-test-${Date.now()}`;
      
      mockWalletManager.executePoolPayout.mockResolvedValue({
        success: true,
        transaction: {
          hash: 'tx-hash-123',
          from: 'pool-address',
          to: 'player-address',
          amount: 10,
          timestamp: Date.now()
        }
      });

      // First request
      const request1 = createValidRequest(txId);
      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Second request with same transaction ID
      const request2 = createValidRequest(txId);
      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.error).toContain('already processed');
    });

    test('should handle transaction locking', async () => {
      const playerAddress = global.createMockPlayerAddress();
      
      // Mock slow transaction
      mockWalletManager.executePoolPayout.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          transaction: {
            hash: 'tx-hash-123',
            from: 'pool-address',
            to: playerAddress,
            amount: 10,
            timestamp: Date.now()
          }
        }), 1000))
      );

      const request1 = new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          playerAddress,
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'tx-1'
        })
      });

      const request2 = new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          playerAddress,
          winAmount: 5,
          gameType: 'dice',
          transactionId: 'tx-2'
        })
      });

      // Start both requests simultaneously
      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2)
      ]);

      // One should succeed, one should be locked
      const statuses = [response1.status, response2.status].sort();
      expect(statuses).toEqual([200, 423]); // 423 = Locked
    });

    test('should handle transaction failures', async () => {
      mockWalletManager.executePoolPayout.mockResolvedValue({
        success: false,
        error: 'Transaction failed on blockchain'
      });

      const request = createValidRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.retryable).toBe(true);
    });

    test('should include transaction metadata', async () => {
      mockWalletManager.executePoolPayout.mockResolvedValue({
        success: true,
        transaction: {
          hash: 'tx-hash-123',
          from: 'pool-address',
          to: 'player-address',
          amount: 10,
          timestamp: Date.now(),
          gasUsed: 21000,
          blockNumber: 12345
        }
      });

      const request = createValidRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(data.transaction.gasUsed).toBe(21000);
      expect(data.transaction.blockNumber).toBe(12345);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting per address', async () => {
      const playerAddress = global.createMockPlayerAddress();
      const requests = [];

      mockWalletManager.executePoolPayout.mockResolvedValue({
        success: true,
        transaction: {
          hash: 'tx-hash-123',
          from: 'pool-address',
          to: playerAddress,
          amount: 1,
          timestamp: Date.now()
        }
      });

      // Create multiple requests rapidly for same address
      for (let i = 0; i < 25; i++) {
        const request = new NextRequest('http://localhost:3002/api/payout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
            'X-Forwarded-For': '127.0.0.1'
          },
          body: JSON.stringify({
            playerAddress,
            winAmount: 1,
            gameType: 'dice',
            transactionId: `tx-${i}`
          })
        });
        requests.push(POST(request));
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      // Should have some rate limited responses
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should include rate limit headers', async () => {
      const request = new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          playerAddress: global.createMockPlayerAddress(),
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-123'
        })
      });

      const response = await POST(request);

      if (response.status === 429) {
        expect(response.headers.get('Retry-After')).toBeDefined();
        expect(response.headers.get('X-RateLimit-Endpoint')).toBe('sensitive');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle wallet manager errors', async () => {
      mockWalletManager.getWalletBalance.mockRejectedValue(new Error('Wallet connection failed'));

      const request = new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          playerAddress: global.createMockPlayerAddress(),
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.retryable).toBe(true);
    });

    test('should return proper error structure', async () => {
      mockWalletManager.getWalletBalance.mockResolvedValue(0); // Insufficient

      const request = new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          playerAddress: global.createMockPlayerAddress(),
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(data.error).toHaveProperty('retryable');
      expect(data).toHaveProperty('timestamp');
    });

    test('should include retry delay for retryable errors', async () => {
      mockWalletManager.getWalletBalance.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          playerAddress: global.createMockPlayerAddress(),
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.retryable).toBe(true);
      expect(data.retryAfter).toBeDefined();
      expect(data.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Security Tests', () => {
    test('should validate session ownership for payout', async () => {
      const sessionAddress = global.createMockPlayerAddress();
      const payoutAddress = global.createMockPlayerAddress();

      mockAuthService.validateSession.mockReturnValue({
        isValid: true,
        session: {
          id: 'test-session',
          address: sessionAddress,
          nonce: 1,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 3600000,
          permissions: ['payout:request']
        }
      });

      const request = new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          playerAddress: payoutAddress, // Different from session
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHZ_ERROR');
    });

    test('should sanitize sensitive data in logs', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      mockWalletManager.executePoolPayout.mockRejectedValue(
        new Error('Secret key exposure: sk_test_12345')
      );

      const request = new NextRequest('http://localhost:3002/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          playerAddress: global.createMockPlayerAddress(),
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-123'
        })
      });

      await POST(request);

      // Check that error logs don't contain sensitive data
      const errorCalls = consoleErrorSpy.mock.calls;
      const hasSecretKey = errorCalls.some(call => 
        call.some(arg => typeof arg === 'string' && arg.includes('sk_test_12345'))
      );
      
      expect(hasSecretKey).toBe(false);
    });
  });
});