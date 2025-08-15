/**
 * Test Setup Configuration
 * Jest test environment setup for casino platform testing
 */

import { config } from '@jest/globals';

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.API_KEY_SECRET = 'test-api-key-secret-for-testing-only';
process.env.SECURE_WALLET_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-long';
process.env.DATABASE_PATH = './test-data';
process.env.LOG_DIRECTORY = './test-logs';
process.env.LOG_LEVEL = 'ERROR'; // Reduce logging during tests

// Mock console methods to reduce test noise
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = originalConsole.error; // Keep error logs for debugging
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Global test utilities
global.createMockRequest = (overrides = {}) => ({
  headers: new Map([
    ['user-agent', 'test-agent'],
    ['content-type', 'application/json']
  ]),
  nextUrl: {
    pathname: '/test',
    clone: () => ({ protocol: 'http:' })
  },
  method: 'POST',
  ip: '127.0.0.1',
  cookies: {
    get: jest.fn().mockReturnValue({ value: 'test-csrf-token' })
  },
  json: jest.fn().mockResolvedValue({}),
  ...overrides
});

global.createMockPlayerAddress = () => 
  `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`;

global.createMockGameRequest = (gameType = 'dice', betAmount = 1) => ({
  gameType,
  gameParams: {
    betAmount,
    clientSeed: 'test-client-seed-123',
    nonce: 1
  },
  playerAddress: global.createMockPlayerAddress()
});

global.sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Jest configuration
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000,
  verbose: true
};