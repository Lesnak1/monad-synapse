/**
 * Authentication System Tests
 * Testing JWT tokens, API keys, and session management
 */

import { AuthenticationService, ApiKeyManager, rateLimit } from '../../lib/auth';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

describe('AuthenticationService', () => {
  let authService: AuthenticationService;

  beforeEach(() => {
    authService = AuthenticationService.getInstance();
    // Clear sessions between tests
    authService['sessions'].clear();
  });

  describe('Session Management', () => {
    test('should create valid session with signature', async () => {
      const testAddress = global.createMockPlayerAddress();
      const message = `Login request for ${testAddress} at ${Date.now()}`;
      
      // Mock signature verification
      jest.spyOn(authService as any, 'verifySignature').mockReturnValue(true);
      
      const result = await authService.createSession(testAddress, 'mock-signature', message);
      
      expect(result.session.address).toBe(testAddress.toLowerCase());
      expect(result.session.isActive).toBe(true);
      expect(result.session.expiresAt).toBeGreaterThan(Date.now());
      expect(result.token).toBeDefined();
    });

    test('should reject invalid signatures', async () => {
      const testAddress = global.createMockPlayerAddress();
      const message = 'test message';
      
      jest.spyOn(authService as any, 'verifySignature').mockReturnValue(false);
      
      await expect(
        authService.createSession(testAddress, 'invalid-signature', message)
      ).rejects.toThrow('Invalid signature');
    });

    test('should validate active sessions', async () => {
      const testAddress = global.createMockPlayerAddress();
      const message = 'test message';
      
      jest.spyOn(authService as any, 'verifySignature').mockReturnValue(true);
      
      const { token, session } = await authService.createSession(testAddress, 'signature', message);
      
      const validation = authService.validateSession(token);
      expect(validation.isValid).toBe(true);
      expect(validation.session?.id).toBe(session.id);
    });

    test('should reject expired sessions', async () => {
      const testAddress = global.createMockPlayerAddress();
      
      jest.spyOn(authService as any, 'verifySignature').mockReturnValue(true);
      
      const { token } = await authService.createSession(testAddress, 'signature', 'message');
      
      // Manually expire the session
      const decoded = jwt.decode(token) as any;
      const session = authService['sessions'].get(decoded.sessionId);
      if (session) {
        session.expiresAt = Date.now() - 1000; // Expired 1 second ago
      }
      
      const validation = authService.validateSession(token);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('expired');
    });

    test('should clean up expired sessions', async () => {
      const testAddress = global.createMockPlayerAddress();
      
      jest.spyOn(authService as any, 'verifySignature').mockReturnValue(true);
      
      // Create session
      const { token } = await authService.createSession(testAddress, 'signature', 'message');
      
      // Expire it
      const decoded = jwt.decode(token) as any;
      const session = authService['sessions'].get(decoded.sessionId);
      if (session) {
        session.expiresAt = Date.now() - 1000;
      }
      
      // Cleanup should remove expired session
      authService.cleanupExpiredSessions();
      
      const validation = authService.validateSession(token);
      expect(validation.isValid).toBe(false);
    });

    test('should handle session permissions', async () => {
      const testAddress = global.createMockPlayerAddress();
      
      jest.spyOn(authService as any, 'verifySignature').mockReturnValue(true);
      
      const { session } = await authService.createSession(testAddress, 'signature', 'message');
      
      expect(session.permissions).toContain('game:play');
      expect(session.permissions).toContain('game:result');
      expect(session.permissions).toContain('payout:request');
    });
  });

  describe('JWT Token Handling', () => {
    test('should create valid JWT tokens', async () => {
      const testAddress = global.createMockPlayerAddress();
      
      jest.spyOn(authService as any, 'verifySignature').mockReturnValue(true);
      
      const { token } = await authService.createSession(testAddress, 'signature', 'message');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      expect(decoded.address).toBe(testAddress.toLowerCase());
      expect(decoded.permissions).toEqual(['game:play', 'game:result', 'payout:request']);
    });

    test('should reject tampered tokens', () => {
      const validToken = jwt.sign({ test: 'data' }, process.env.JWT_SECRET!);
      const tamperedToken = validToken.slice(0, -5) + 'xxxxx';
      
      const validation = authService.validateSession(tamperedToken);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Invalid token');
    });

    test('should reject tokens with wrong secret', () => {
      const wrongToken = jwt.sign({ test: 'data' }, 'wrong-secret');
      
      const validation = authService.validateSession(wrongToken);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Invalid token');
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within limit', () => {
      const key = 'test-key';
      const limit = 5;
      const window = 60000;
      
      for (let i = 0; i < limit; i++) {
        expect(rateLimit(key, limit, window)).toBe(true);
      }
    });

    test('should block requests exceeding limit', () => {
      const key = 'test-key-2';
      const limit = 3;
      const window = 60000;
      
      // Use up the limit
      for (let i = 0; i < limit; i++) {
        expect(rateLimit(key, limit, window)).toBe(true);
      }
      
      // Next request should be blocked
      expect(rateLimit(key, limit, window)).toBe(false);
    });

    test('should reset after time window', async () => {
      const key = 'test-key-3';
      const limit = 2;
      const window = 100; // 100ms window
      
      // Use up limit
      expect(rateLimit(key, limit, window)).toBe(true);
      expect(rateLimit(key, limit, window)).toBe(true);
      expect(rateLimit(key, limit, window)).toBe(false);
      
      // Wait for window to reset
      await global.sleep(150);
      
      // Should allow requests again
      expect(rateLimit(key, limit, window)).toBe(true);
    });
  });

  describe('Security Tests', () => {
    test('should handle address case sensitivity', async () => {
      const address = '0xAbC123456789012345678901234567890123dEf';
      const lowerAddress = address.toLowerCase();
      
      jest.spyOn(authService as any, 'verifySignature').mockReturnValue(true);
      
      const { session } = await authService.createSession(address, 'signature', 'message');
      
      expect(session.address).toBe(lowerAddress);
    });

    test('should prevent session hijacking', async () => {
      const address1 = global.createMockPlayerAddress();
      const address2 = global.createMockPlayerAddress();
      
      jest.spyOn(authService as any, 'verifySignature').mockReturnValue(true);
      
      const { token: token1 } = await authService.createSession(address1, 'sig1', 'msg1');
      const { token: token2 } = await authService.createSession(address2, 'sig2', 'msg2');
      
      const validation1 = authService.validateSession(token1);
      const validation2 = authService.validateSession(token2);
      
      expect(validation1.session?.address).toBe(address1.toLowerCase());
      expect(validation2.session?.address).toBe(address2.toLowerCase());
      expect(validation1.session?.id).not.toBe(validation2.session?.id);
    });

    test('should handle concurrent session creation', async () => {
      const address = global.createMockPlayerAddress();
      
      jest.spyOn(authService as any, 'verifySignature').mockReturnValue(true);
      
      const promises = Array.from({ length: 10 }, (_, i) =>
        authService.createSession(address, `signature-${i}`, `message-${i}`)
      );
      
      const results = await Promise.all(promises);
      
      // All sessions should be valid but different
      const sessionIds = results.map(r => r.session.id);
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(10);
    });
  });
});

describe('ApiKeyManager', () => {
  let apiKeyManager: ApiKeyManager;

  beforeEach(() => {
    apiKeyManager = ApiKeyManager.getInstance();
    apiKeyManager['apiKeys'].clear();
  });

  describe('API Key Generation', () => {
    test('should generate valid API keys', () => {
      const permissions = ['game:play', 'payout:request'];
      const key = apiKeyManager.generateApiKey(permissions);
      
      expect(key.id).toMatch(/^ak_[a-f0-9]+$/);
      expect(key.secret).toHaveLength(64);
      expect(key.permissions).toEqual(permissions);
      expect(key.isActive).toBe(true);
    });

    test('should generate unique API keys', () => {
      const key1 = apiKeyManager.generateApiKey(['game:play']);
      const key2 = apiKeyManager.generateApiKey(['game:play']);
      
      expect(key1.id).not.toBe(key2.id);
      expect(key1.secret).not.toBe(key2.secret);
    });

    test('should handle empty permissions', () => {
      const key = apiKeyManager.generateApiKey([]);
      
      expect(key.permissions).toEqual([]);
      expect(key.isActive).toBe(true);
    });
  });

  describe('API Key Validation', () => {
    test('should validate correct API keys', () => {
      const key = apiKeyManager.generateApiKey(['test:permission']);
      
      const validation = apiKeyManager.validateApiKey(key.id, key.secret);
      
      expect(validation.isValid).toBe(true);
      expect(validation.apiKey?.id).toBe(key.id);
    });

    test('should reject invalid API key ID', () => {
      const key = apiKeyManager.generateApiKey(['test:permission']);
      
      const validation = apiKeyManager.validateApiKey('invalid-id', key.secret);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('not found');
    });

    test('should reject invalid API key secret', () => {
      const key = apiKeyManager.generateApiKey(['test:permission']);
      
      const validation = apiKeyManager.validateApiKey(key.id, 'invalid-secret');
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Invalid secret');
    });

    test('should reject inactive API keys', () => {
      const key = apiKeyManager.generateApiKey(['test:permission']);
      key.isActive = false;
      
      const validation = apiKeyManager.validateApiKey(key.id, key.secret);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('inactive');
    });
  });

  describe('Permission Management', () => {
    test('should check permissions correctly', () => {
      const key = apiKeyManager.generateApiKey(['game:play', 'game:result']);
      
      expect(apiKeyManager.hasPermission(key, 'game:play')).toBe(true);
      expect(apiKeyManager.hasPermission(key, 'game:result')).toBe(true);
      expect(apiKeyManager.hasPermission(key, 'payout:request')).toBe(false);
    });

    test('should handle wildcard permissions', () => {
      const key = apiKeyManager.generateApiKey(['game:*']);
      
      expect(apiKeyManager.hasPermission(key, 'game:play')).toBe(true);
      expect(apiKeyManager.hasPermission(key, 'game:result')).toBe(true);
      expect(apiKeyManager.hasPermission(key, 'payout:request')).toBe(false);
    });

    test('should handle admin permissions', () => {
      const key = apiKeyManager.generateApiKey(['admin:*']);
      
      expect(apiKeyManager.hasPermission(key, 'game:play')).toBe(true);
      expect(apiKeyManager.hasPermission(key, 'payout:request')).toBe(true);
      expect(apiKeyManager.hasPermission(key, 'any:permission')).toBe(true);
    });
  });

  describe('Security Tests', () => {
    test('should use cryptographically secure random for secrets', () => {
      const keys = Array.from({ length: 100 }, () =>
        apiKeyManager.generateApiKey(['test'])
      );
      
      const secrets = keys.map(k => k.secret);
      const uniqueSecrets = new Set(secrets);
      
      // All secrets should be unique
      expect(uniqueSecrets.size).toBe(100);
      
      // Secrets should be hexadecimal
      secrets.forEach(secret => {
        expect(secret).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    test('should prevent timing attacks on secret validation', () => {
      const key = apiKeyManager.generateApiKey(['test']);
      const correctSecret = key.secret;
      const wrongSecret = 'a'.repeat(64);
      
      const iterations = 100;
      let correctTimes = 0;
      let wrongTimes = 0;
      
      // Measure validation times
      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        apiKeyManager.validateApiKey(key.id, correctSecret);
        const end = process.hrtime.bigint();
        correctTimes += Number(end - start);
        
        const start2 = process.hrtime.bigint();
        apiKeyManager.validateApiKey(key.id, wrongSecret);
        const end2 = process.hrtime.bigint();
        wrongTimes += Number(end2 - start2);
      }
      
      const avgCorrect = correctTimes / iterations;
      const avgWrong = wrongTimes / iterations;
      const timeDifference = Math.abs(avgCorrect - avgWrong) / Math.max(avgCorrect, avgWrong);
      
      // Time difference should be minimal (constant time)
      expect(timeDifference).toBeLessThan(0.1); // Less than 10% difference
    });
  });
});