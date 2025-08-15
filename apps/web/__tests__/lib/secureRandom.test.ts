/**
 * Secure Random Number Generation Tests
 * Testing cryptographically secure randomness and provably fair gaming
 */

import { SecureRandomGenerator, GameSeed } from '../../lib/secureRandom';
import crypto from 'crypto';

describe('SecureRandomGenerator', () => {
  let generator: SecureRandomGenerator;

  beforeEach(() => {
    generator = new SecureRandomGenerator();
  });

  describe('Game Seed Generation', () => {
    test('should generate deterministic server seeds for same generator instance', () => {
      const seed1 = generator.createGameSeed('client-seed-test', 1);
      const seed2 = generator.createGameSeed('client-seed-test', 1);
      
      // Same generator instance uses same server seed
      expect(seed1.serverSeed).toBe(seed2.serverSeed);
    });

    test('should create deterministic combined seeds', () => {
      const clientSeed = 'test-client-seed';
      const nonce = 42;
      
      const seed1 = generator.createGameSeed(clientSeed, nonce);
      const seed2 = generator.createGameSeed(clientSeed, nonce);
      
      // Combined should be same for same generator instance
      expect(seed1.combined).toBe(seed2.combined);
      
      // Hash should be deterministic for same combined seed
      const hash1 = crypto.createHash('sha256').update(seed1.combined).digest('hex');
      expect(seed1.hash).toBe(hash1);
    });

    test('should generate 64-character server seeds', () => {
      const seed = generator.createGameSeed('test-seed-123', 1);
      expect(seed.serverSeed).toHaveLength(64);
      expect(seed.serverSeed).toMatch(/^[a-f0-9]+$/);
    });

    test('should generate 64-character SHA256 hashes', () => {
      const seed = generator.createGameSeed('test-seed-456', 1);
      expect(seed.hash).toHaveLength(64);
      expect(seed.hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('Secure Random Generation', () => {
    test('should generate values between 0 and 1', () => {
      for (let i = 0; i < 100; i++) {
        const result = generator.generateSecureRandom(`client-${i}`, i);
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThan(1);
      }
    });

    test('should be deterministic for same inputs', () => {
      const clientSeed = 'test-seed-123456';
      const nonce = 123;
      
      const result1 = generator.generateSecureRandom(clientSeed, nonce);
      const result2 = generator.generateSecureRandom(clientSeed, nonce);
      
      // Same generator instance = same results
      expect(result1.value).toBe(result2.value);
    });

    test('should produce different values for different nonces', () => {
      const clientSeed = 'consistent-seed';
      const results = [];
      
      for (let nonce = 0; nonce < 10; nonce++) {
        const result = generator.generateSecureRandom(clientSeed, nonce);
        results.push(result.value);
      }
      
      // All values should be different
      const uniqueValues = new Set(results);
      expect(uniqueValues.size).toBe(results.length);
    });

    test('should include valid metadata', () => {
      const result = generator.generateSecureRandom('test', 1);
      
      expect(result.seed).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(Date.now() - 1000);
      expect(result.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('should handle edge case inputs', () => {
      // Empty client seed
      expect(() => generator.generateSecureRandom('', 0)).not.toThrow();
      
      // Very long client seed
      const longSeed = 'a'.repeat(1000);
      expect(() => generator.generateSecureRandom(longSeed, 0)).not.toThrow();
      
      // Large nonce
      expect(() => generator.generateSecureRandom('test', Number.MAX_SAFE_INTEGER)).not.toThrow();
    });
  });

  describe('Statistical Distribution Tests', () => {
    test('should produce roughly uniform distribution', () => {
      const samples = 10000;
      const buckets = 10;
      const bucketCounts = new Array(buckets).fill(0);
      
      for (let i = 0; i < samples; i++) {
        const result = generator.generateSecureRandom(`seed-${i}`, i);
        const bucket = Math.floor(result.value * buckets);
        bucketCounts[bucket]++;
      }
      
      // Expected count per bucket (with tolerance)
      const expectedCount = samples / buckets;
      const tolerance = expectedCount * 0.1; // 10% tolerance
      
      bucketCounts.forEach(count => {
        expect(count).toBeGreaterThan(expectedCount - tolerance);
        expect(count).toBeLessThan(expectedCount + tolerance);
      });
    });

    test('should pass basic randomness tests', () => {
      const samples = 1000;
      const values = [];
      
      for (let i = 0; i < samples; i++) {
        const result = generator.generateSecureRandom(`test-${i}`, i);
        values.push(result.value);
      }
      
      // Test for serial correlation (consecutive values shouldn't be correlated)
      let correlation = 0;
      for (let i = 1; i < values.length; i++) {
        correlation += values[i] * values[i - 1];
      }
      correlation /= (values.length - 1);
      
      // Should be close to 0.25 for uniform random variables
      expect(correlation).toBeGreaterThan(0.2);
      expect(correlation).toBeLessThan(0.3);
    });
  });

  describe('Provably Fair Verification', () => {
    test('should allow verification of game results', () => {
      const clientSeed = 'player-seed-123';
      const nonce = 456;
      
      const result = generator.generateSecureRandom(clientSeed, nonce);
      
      // Player should be able to verify this result
      const verificationHash = crypto
        .createHash('sha256')
        .update(result.seed)
        .digest('hex');
      
      expect(verificationHash).toBe(result.hash);
    });

    test('should produce consistent results for verification', () => {
      const clientSeed = 'verification-test';
      const nonce = 789;
      
      const result1 = generator.generateSecureRandom(clientSeed, nonce);
      
      // Simulate player verification
      const verificationResult = generator.verifyResult(
        result1.seed,
        result1.hash,
        clientSeed,
        nonce
      );
      
      expect(verificationResult.isValid).toBe(true);
      expect(verificationResult.value).toBe(result1.value);
    });

    test('should detect tampered results', () => {
      const result = generator.generateSecureRandom('test', 1);
      
      // Tamper with the hash
      const tamperedHash = result.hash.replace('a', 'b');
      
      const verification = generator.verifyResult(
        result.seed,
        tamperedHash,
        'test',
        1
      );
      
      expect(verification.isValid).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('should generate random numbers efficiently', () => {
      const start = Date.now();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        generator.generateSecureRandom(`perf-test-${i}`, i);
      }
      
      const elapsed = Date.now() - start;
      const averageTime = elapsed / iterations;
      
      // Should generate each number in less than 5ms
      expect(averageTime).toBeLessThan(5);
    });

    test('should handle concurrent generation', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve(generator.generateSecureRandom(`concurrent-${i}`, i))
        );
      }
      
      const results = await Promise.all(promises);
      
      // All results should be valid and unique
      expect(results).toHaveLength(100);
      const values = results.map(r => r.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(100);
    });
  });

  describe('Security Tests', () => {
    test('should not leak server seed information', () => {
      const result = generator.generateSecureRandom('test', 1);
      
      // Result should not contain server seed directly
      expect(result.seed).toContain('test'); // Contains client seed
      expect(result.seed).toContain('1'); // Contains nonce
      expect(JSON.stringify(result)).not.toMatch(/server.*seed/i);
    });

    test('should resist prediction attacks', () => {
      const values = [];
      
      // Generate sequence of values
      for (let i = 0; i < 100; i++) {
        const result = generator.generateSecureRandom('attack-test', i);
        values.push(result.value);
      }
      
      // Simple prediction test: next value should not be predictable
      // from previous values using linear regression
      const predictions = [];
      for (let i = 2; i < values.length; i++) {
        // Simple linear prediction: next = a * prev1 + b * prev2
        const predicted = values[i-1] * 0.5 + values[i-2] * 0.5;
        predictions.push(Math.abs(predicted - values[i]));
      }
      
      const averageError = predictions.reduce((sum, err) => sum + err, 0) / predictions.length;
      
      // Error should be significant (not predictable)
      expect(averageError).toBeGreaterThan(0.2);
    });
  });
});