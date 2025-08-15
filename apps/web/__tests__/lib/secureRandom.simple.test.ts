/**
 * Simplified Secure Random Number Generation Tests
 * Testing core cryptographically secure randomness functionality
 */

import { SecureRandomGenerator } from '../../lib/secureRandom';
import crypto from 'crypto';

describe('SecureRandomGenerator - Core Functionality', () => {
  let generator: SecureRandomGenerator;

  beforeEach(() => {
    generator = new SecureRandomGenerator();
  });

  test('should generate values between 0 and 1', () => {
    for (let i = 0; i < 50; i++) {
      const result = generator.generateSecureRandom(`client-seed-${i}`, i);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(1);
    }
  });

  test('should generate deterministic results for same inputs', () => {
    const clientSeed = 'test-seed-deterministic';
    const nonce = 42;
    
    const result1 = generator.generateSecureRandom(clientSeed, nonce);
    const result2 = generator.generateSecureRandom(clientSeed, nonce);
    
    expect(result1.value).toBe(result2.value);
    expect(result1.hash).toBe(result2.hash);
  });

  test('should generate different values for different nonces', () => {
    const clientSeed = 'constant-seed-test';
    const values = [];
    
    for (let nonce = 0; nonce < 10; nonce++) {
      const result = generator.generateSecureRandom(clientSeed, nonce);
      values.push(result.value);
    }
    
    // All values should be different
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  test('should generate valid metadata', () => {
    const result = generator.generateSecureRandom('metadata-test', 1);
    
    expect(result.seed).toBeDefined();
    expect(result.hash).toBeDefined();
    expect(result.hash).toHaveLength(64);
    expect(result.timestamp).toBeGreaterThan(Date.now() - 1000);
    expect(result.timestamp).toBeLessThanOrEqual(Date.now());
  });

  test('should handle minimum client seed length', () => {
    expect(() => generator.generateSecureRandom('short', 1)).toThrow('Client seed must be at least 8 characters');
    expect(() => generator.generateSecureRandom('longEnoughSeed', 1)).not.toThrow();
  });

  test('should produce roughly uniform distribution', () => {
    const samples = 1000;
    const buckets = 10;
    const bucketCounts = new Array(buckets).fill(0);
    
    for (let i = 0; i < samples; i++) {
      const result = generator.generateSecureRandom(`uniform-test-${i}`, i);
      const bucket = Math.floor(result.value * buckets);
      bucketCounts[bucket]++;
    }
    
    // Expected count per bucket (with tolerance)
    const expectedCount = samples / buckets;
    const tolerance = expectedCount * 0.15; // 15% tolerance
    
    bucketCounts.forEach(count => {
      expect(count).toBeGreaterThan(expectedCount - tolerance);
      expect(count).toBeLessThan(expectedCount + tolerance);
    });
  });

  test('should allow verification of results', () => {
    const clientSeed = 'verification-test';
    const nonce = 123;
    
    const result = generator.generateSecureRandom(clientSeed, nonce);
    
    // Verify the hash matches the seed
    const expectedHash = crypto.createHash('sha256').update(result.seed).digest('hex');
    expect(result.hash).toBe(expectedHash);
  });

  test('should generate secure integers in range', () => {
    const min = 1;
    const max = 100;
    
    for (let i = 0; i < 50; i++) {
      const value = generator.generateSecureInt(`int-test-${i}`, i, min, max);
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});