import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testEnvironment: 'node', // Use node environment for API and server-side tests
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
    // Mock problematic external modules
    '@rainbow-me/rainbowkit': '<rootDir>/__tests__/__mocks__/rainbowkit.js',
    'wagmi': '<rootDir>/__tests__/__mocks__/wagmi.js',
    'viem': '<rootDir>/__tests__/__mocks__/viem.js',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/__tests__/**',
    '!**/coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html'
  ],
  testTimeout: 30000,
  verbose: true,
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true
    }]
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(viem|@rainbow-me|@tanstack)/)'
  ]
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig);