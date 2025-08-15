/**
 * Game Result API Integration Tests
 * Testing game logic, validation, and security
 */

import { POST } from '../../app/api/game/result/route';
import { NextRequest } from 'next/server';
import { AuthenticationService } from '../../lib/auth';
import { SecureGameEngine } from '../../lib/gameEngine';

// Mock dependencies
jest.mock('../../lib/auth');
jest.mock('../../lib/gameEngine');
jest.mock('../../lib/database');
jest.mock('../../lib/logger');

describe('/api/game/result', () => {
  let mockAuthService: jest.Mocked<AuthenticationService>;
  let mockGameEngine: jest.Mocked<SecureGameEngine>;

  beforeEach(() => {
    mockAuthService = AuthenticationService.getInstance() as jest.Mocked<AuthenticationService>;
    mockGameEngine = SecureGameEngine.getInstance() as jest.Mocked<SecureGameEngine>;
    
    // Default mocks
    mockAuthService.validateSession.mockReturnValue({
      isValid: true,
      session: {
        id: 'test-session',
        address: global.createMockPlayerAddress(),
        nonce: 1,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        permissions: ['game:play', 'game:result']
      }
    });
  });

  describe('Authentication', () => {
    test('should reject requests without authorization', async () => {
      const request = new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(global.createMockGameRequest())
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

      const request = new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify(global.createMockGameRequest())
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    test('should accept valid authentication', async () => {
      mockGameEngine.createGameSession.mockResolvedValue({
        sessionId: 'game-session-123',
        gameType: 'dice',
        isActive: true,
        expiresAt: Date.now() + 300000
      });

      const request = new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(global.createMockGameRequest())
      });

      const response = await POST(request);
      
      expect(response.status).not.toBe(401);
    });
  });

  describe('Input Validation', () => {
    const createAuthenticatedRequest = (body: any) => {
      return new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(body)
      });
    };

    test('should validate game type', async () => {
      const invalidGameRequest = {
        ...global.createMockGameRequest(),
        gameType: 'invalid-game'
      };

      const request = createAuthenticatedRequest(invalidGameRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate bet amount limits', async () => {
      const invalidBetRequest = {
        ...global.createMockGameRequest(),
        gameParams: {
          ...global.createMockGameRequest().gameParams,
          betAmount: 0.0001 // Below minimum
        }
      };

      const request = createAuthenticatedRequest(invalidBetRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate client seed format', async () => {
      const invalidSeedRequest = {
        ...global.createMockGameRequest(),
        gameParams: {
          ...global.createMockGameRequest().gameParams,
          clientSeed: 'invalid@seed!' // Invalid characters
        }
      };

      const request = createAuthenticatedRequest(invalidSeedRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate player address format', async () => {
      const invalidAddressRequest = {
        ...global.createMockGameRequest(),
        playerAddress: 'invalid-address'
      };

      const request = createAuthenticatedRequest(invalidAddressRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate nonce range', async () => {
      const invalidNonceRequest = {
        ...global.createMockGameRequest(),
        gameParams: {
          ...global.createMockGameRequest().gameParams,
          nonce: -1 // Invalid negative nonce
        }
      };

      const request = createAuthenticatedRequest(invalidNonceRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Game Logic', () => {
    const createValidRequest = (gameType = 'dice', betAmount = 1) => {
      mockGameEngine.createGameSession.mockResolvedValue({
        sessionId: 'game-session-123',
        gameType,
        isActive: true,
        expiresAt: Date.now() + 300000
      });

      mockGameEngine.executeGame.mockResolvedValue({
        gameType,
        isWin: true,
        winAmount: betAmount * 2,
        gameResult: { roll: 50 },
        proof: {
          serverSeedHash: 'hash123',
          clientSeed: 'client123',
          nonce: 1,
          gameHash: 'game-hash'
        },
        timestamp: Date.now()
      });

      return new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(global.createMockGameRequest(gameType, betAmount))
      });
    };

    test('should handle dice game correctly', async () => {
      const request = createValidRequest('dice', 5);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.gameType).toBe('dice');
      expect(data.result.isWin).toBe(true);
      expect(data.result.winAmount).toBe(10);
    });

    test('should handle mines game correctly', async () => {
      const request = createValidRequest('mines', 2);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.gameType).toBe('mines');
    });

    test('should handle crash game correctly', async () => {
      const request = createValidRequest('crash', 3);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.gameType).toBe('crash');
    });

    test('should provide provably fair proof', async () => {
      const request = createValidRequest('dice', 1);
      const response = await POST(request);
      const data = await response.json();

      expect(data.result.proof).toBeDefined();
      expect(data.result.proof.serverSeedHash).toBeDefined();
      expect(data.result.proof.clientSeed).toBeDefined();
      expect(data.result.proof.nonce).toBeDefined();
      expect(data.result.proof.gameHash).toBeDefined();
    });

    test('should handle game engine errors', async () => {
      mockGameEngine.createGameSession.mockRejectedValue(new Error('Game engine error'));

      const request = createValidRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.category).toBe('game');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting', async () => {
      const requests = [];
      
      // Create multiple requests rapidly
      for (let i = 0; i < 25; i++) {
        const request = new NextRequest('http://localhost:3002/api/game/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
            'X-Forwarded-For': '127.0.0.1' // Same IP
          },
          body: JSON.stringify(global.createMockGameRequest())
        });
        requests.push(POST(request));
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      // Should have some rate limited responses
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should include rate limit headers', async () => {
      const request = new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(global.createMockGameRequest())
      });

      const response = await POST(request);

      if (response.status === 429) {
        expect(response.headers.get('Retry-After')).toBeDefined();
        expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: 'invalid-json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('should handle missing request body', async () => {
      const request = new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('should return proper error structure', async () => {
      const request = new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({ invalid: 'data' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('Security Tests', () => {
    test('should prevent replay attacks with nonce tracking', async () => {
      const gameRequest = global.createMockGameRequest();
      
      mockGameEngine.createGameSession.mockResolvedValue({
        sessionId: 'game-session-123',
        gameType: 'dice',
        isActive: true,
        expiresAt: Date.now() + 300000
      });

      const request1 = new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(gameRequest)
      });

      const request2 = new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(gameRequest) // Same request
      });

      await POST(request1);
      const response2 = await POST(request2);

      // Second request should be blocked (replay protection)
      expect(response2.status).toBe(409);
    });

    test('should validate session ownership', async () => {
      const playerAddress = global.createMockPlayerAddress();
      const differentAddress = global.createMockPlayerAddress();

      // Mock session for different address
      mockAuthService.validateSession.mockReturnValue({
        isValid: true,
        session: {
          id: 'test-session',
          address: differentAddress,
          nonce: 1,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 3600000,
          permissions: ['game:play', 'game:result']
        }
      });

      const gameRequest = {
        ...global.createMockGameRequest(),
        playerAddress: playerAddress // Different from session
      };

      const request = new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(gameRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHZ_ERROR');
    });

    test('should sanitize error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockGameEngine.createGameSession.mockRejectedValue(new Error('Sensitive internal error'));

      const request = new NextRequest('http://localhost:3002/api/game/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(global.createMockGameRequest())
      });

      const response = await POST(request);
      const data = await response.json();

      // Should not expose internal error details
      expect(JSON.stringify(data)).not.toContain('Sensitive internal error');

      process.env.NODE_ENV = originalEnv;
    });
  });
});