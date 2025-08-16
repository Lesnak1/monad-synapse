/**
 * Comprehensive Payout API Tests
 * Tests payout processing, authentication, validation, and error scenarios
 */

import { POST } from '../../app/api/payout/route';
import { NextRequest } from 'next/server';
import { authService } from '../../lib/auth';

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

jest.mock('../../lib/cacheManager', () => ({
  poolBalanceCache: {
    delete: jest.fn()
  },
  cache: {
    getOrSet: jest.fn()
  }
}));

jest.mock('../../lib/performance', () => ({
  trackApiCall: jest.fn().mockImplementation((name, fn) => fn())
}));

describe('/api/payout - Comprehensive Payout Tests', () => {
  let authToken: string;
  const mockPlayerAddress = '0x742d35Cc6634C0532925a3b8D400E4E62f8d6641';

  beforeAll(async () => {
    // Create authenticated session for testing
    const { token } = await authService.createSession(
      mockPlayerAddress,
      'mock-signature',
      `Login message with ${mockPlayerAddress}`
    );
    authToken = token;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create authenticated payout requests
  const createPayoutRequest = (payoutData: any) => {
    const defaultPayoutData = {
      playerAddress: mockPlayerAddress,
      winAmount: 10,
      gameType: 'dice',
      transactionId: `tx_${Date.now()}_${Math.random()}`,
      priority: 'normal',
      ...payoutData
    };

    return new NextRequest('http://localhost:3000/api/payout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(defaultPayoutData)
    });
  };

  describe('Authentication and Authorization', () => {
    test('should reject requests without authorization', async () => {
      const request = new NextRequest('http://localhost:3000/api/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: mockPlayerAddress,
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-1'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    test('should reject requests with invalid token', async () => {
      const request = new NextRequest('http://localhost:3000/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          playerAddress: mockPlayerAddress,
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-1'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    test('should accept valid authentication', async () => {
      const request = createPayoutRequest({});
      const response = await POST(request);
      
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('Input Validation', () => {
    test('should validate required fields', async () => {
      const requiredFields = ['playerAddress', 'winAmount', 'gameType', 'transactionId'];
      
      for (const field of requiredFields) {
        const payoutData = {
          playerAddress: mockPlayerAddress,
          winAmount: 10,
          gameType: 'dice',
          transactionId: 'test-tx-1'
        };
        
        delete payoutData[field as keyof typeof payoutData];
        
        const request = createPayoutRequest(payoutData);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid payout parameters');
      }
    });

    test('should validate player address format', async () => {
      const invalidAddresses = [
        'not-an-address',
        '0x123',
        '742d35Cc6634C0532925a3b8D400E4E62f8d6641', // Missing 0x
        '0x742d35Cc6634C0532925a3b8D400E4E62f8d6641EXTRA' // Too long
      ];

      for (const playerAddress of invalidAddresses) {
        const request = createPayoutRequest({ playerAddress });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid payout parameters');
      }
    });

    test('should validate win amount range', async () => {
      const invalidAmounts = [
        0,           // Below minimum
        0.0005,      // Below minimum
        -1,          // Negative
        10001        // Above maximum
      ];

      for (const winAmount of invalidAmounts) {
        const request = createPayoutRequest({ winAmount });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      }
    });

    test('should accept valid win amounts', async () => {
      const validAmounts = [0.001, 0.1, 1, 100, 1000, 10000];

      for (const winAmount of validAmounts) {
        const request = createPayoutRequest({ winAmount });
        const response = await POST(request);

        expect(response.status).toBe(200);
      }
    });

    test('should validate priority levels', async () => {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];

      for (const priority of validPriorities) {
        const request = createPayoutRequest({ priority });
        const response = await POST(request);

        expect(response.status).toBe(200);
      }
    });

    test('should reject invalid priority levels', async () => {
      const invalidPriorities = ['critical', 'medium', 'super-high', ''];

      for (const priority of invalidPriorities) {
        const request = createPayoutRequest({ priority });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      }
    });

    test('should validate game proof structure when provided', async () => {
      const validGameProof = {
        serverSeedHash: 'hash123',
        clientSeed: 'client123',
        nonce: 1,
        gameHash: 'game-hash-123'
      };

      const request = createPayoutRequest({ gameProof: validGameProof });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    test('should reject incomplete game proof', async () => {
      const incompleteGameProof = {
        serverSeedHash: 'hash123',
        clientSeed: 'client123'
        // Missing nonce and gameHash
      };

      const request = createPayoutRequest({ gameProof: incompleteGameProof });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Successful Payout Processing', () => {
    test('should process valid payout successfully', async () => {
      const request = createPayoutRequest({
        winAmount: 50,
        gameType: 'dice',
        priority: 'normal'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.transactionHash).toBeDefined();
      expect(data.payoutAmount).toBe(50);
      expect(data.playerAddress).toBe(mockPlayerAddress);
      expect(data.gameType).toBe('dice');
      expect(data.priority).toBe('normal');
      expect(data.timestamp).toBeDefined();
      expect(data.authenticated).toBe(true);
      expect(data.monitoringId).toBeDefined();
    });

    test('should include contract processing result when gameId provided', async () => {
      const request = createPayoutRequest({
        gameId: 'game-123',
        multiplier: 2.5
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.contractResult).toBeDefined();
      expect(data.contractResult.success).toBe(true);
      expect(data.contractResult.transactionHash).toBeDefined();
    });

    test('should handle high priority payouts', async () => {
      const request = createPayoutRequest({
        priority: 'urgent',
        winAmount: 1000
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.priority).toBe('urgent');
    });

    test('should include security status in response', async () => {
      const request = createPayoutRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.securityStatus).toBe('healthy');
      expect(data.poolStatus).toBeDefined();
      expect(data.poolStatus.healthy).toBe(true);
    });
  });

  describe('Replay Protection', () => {
    test('should prevent duplicate transaction processing', async () => {
      const transactionId = `duplicate-tx-${Date.now()}`;
      
      // First request should succeed
      const request1 = createPayoutRequest({ transactionId });
      const response1 = await POST(request1);
      
      expect(response1.status).toBe(200);
      
      // Second request with same transaction ID should be rejected
      const request2 = createPayoutRequest({ transactionId });
      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.success).toBe(false);
      expect(data2.error).toBe('Transaction already processed');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      // Create many requests rapidly
      const requests = Array.from({ length: 60 }, (_, i) => 
        createPayoutRequest({ transactionId: `rate-limit-tx-${i}` })
      );

      // Execute all requests
      const responses = await Promise.all(requests.map(req => POST(req)));
      
      // Some should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Game Win Amount Validation', () => {
    test('should validate maximum win amounts per game type', async () => {
      const gameMaxLimits = {
        'dice': 1000,
        'mines': 500,
        'crash': 2000,
        'coin-flip': 200,
        'slots': 1000,
        'plinko': 10000
      };

      for (const [gameType, maxLimit] of Object.entries(gameMaxLimits)) {
        // Test amount within limit
        const validRequest = createPayoutRequest({
          gameType,
          winAmount: maxLimit - 1
        });
        const validResponse = await POST(validRequest);
        expect(validResponse.status).toBe(200);

        // Test amount exceeding limit
        const invalidRequest = createPayoutRequest({
          gameType,
          winAmount: maxLimit + 1
        });
        const invalidResponse = await POST(invalidRequest);
        const invalidData = await invalidResponse.json();

        expect(invalidResponse.status).toBe(400);
        expect(invalidData.error).toBe('Win amount exceeds game maximum');
      }
    });
  });

  describe('Pool Insufficient Funds Scenarios', () => {
    beforeEach(() => {
      // Mock pool manager to simulate insufficient funds
      const { poolManager } = require('../../lib/poolWallet');
      poolManager.sendFromPool.mockResolvedValue({
        success: false,
        error: 'Pool has insufficient funds for this payout'
      });
    });

    test('should handle pool insufficient funds with bet refund', async () => {
      const request = createPayoutRequest({
        winAmount: 100,
        multiplier: 2.0 // Implies original bet was 50
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.refunded).toBe(true);
      expect(data.message).toContain('original bet has been refunded');
      expect(data.transactionHash).toBeDefined();
    });

    test('should handle failed bet refund scenario', async () => {
      // Mock refund to fail as well
      const { refundBetToPlayer } = require('../../lib/poolWallet');
      refundBetToPlayer.mockResolvedValue({
        success: false,
        error: 'Refund failed'
      });

      const request = createPayoutRequest({
        winAmount: 100,
        multiplier: 2.0
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('pool_insufficient_refund_failed');
      expect(data.support).toBeDefined();
    });
  });

  describe('Multi-Signature Requirements', () => {
    test('should handle payouts requiring multi-sig approval', async () => {
      // Mock pool manager to require multi-sig
      const { poolManager } = require('../../lib/poolWallet');
      poolManager.sendFromPool.mockResolvedValue({
        success: false,
        requiresMultiSig: true,
        proposalId: 'proposal-123'
      });

      const request = createPayoutRequest({
        winAmount: 5000 // Large amount requiring approval
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(false);
      expect(data.error).toBe('payout_requires_approval');
      expect(data.requiresApproval).toBe(true);
      expect(data.proposalId).toBe('proposal-123');
    });
  });

  describe('Security Auditing', () => {
    test('should block payouts during critical security issues', async () => {
      // Mock security audit to return critical status
      const { securityAuditor } = require('../../lib/securityAudit');
      securityAuditor.runQuickCheck.mockResolvedValue({
        overallStatus: 'critical',
        criticalIssues: ['Suspicious activity detected']
      });

      const request = createPayoutRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toContain('security issues');
      expect(data.securityStatus).toBe('critical');
      expect(data.criticalIssues).toBeDefined();
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple payouts for same address with locking', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => 
        createPayoutRequest({ 
          transactionId: `concurrent-tx-${i}`,
          winAmount: 10 + i 
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      
      // At least one should succeed, others might be locked
      const successful = responses.filter(r => r.status === 200);
      const locked = responses.filter(r => r.status === 423);
      
      expect(successful.length).toBeGreaterThanOrEqual(1);
      
      if (locked.length > 0) {
        const lockedData = await locked[0].json();
        expect(lockedData.error).toContain('payout in progress');
        expect(lockedData.retryAfter).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: 'invalid-json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON payload');
    });

    test('should return proper error structure', async () => {
      const request = createPayoutRequest({ winAmount: -1 }); // Invalid amount
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('errorId');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('retryable');
    });

    test('should handle internal server errors gracefully', async () => {
      // Mock an internal error
      const { poolManager } = require('../../lib/poolWallet');
      poolManager.sendFromPool.mockRejectedValue(new Error('Internal server error'));

      const request = createPayoutRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errorId).toBeDefined();
      expect(data.retryable).toBeDefined();
    });
  });

  describe('Response Structure Validation', () => {
    test('should return consistent response structure', async () => {
      const request = createPayoutRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('transactionHash');
      expect(data).toHaveProperty('payoutAmount');
      expect(data).toHaveProperty('playerAddress');
      expect(data).toHaveProperty('gameType');
      expect(data).toHaveProperty('priority');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('authenticated');
      expect(data).toHaveProperty('monitoringId');
      expect(data).toHaveProperty('securityStatus');
      expect(data).toHaveProperty('poolStatus');
    });

    test('should include transaction monitoring information', async () => {
      const request = createPayoutRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(data.monitoringId).toBe('monitoring-id-123');
    });
  });

  describe('Performance Tests', () => {
    test('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      const request = createPayoutRequest({});
      const response = await POST(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(10000); // Should respond within 10 seconds
    });
  });
});