import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the useGameContract hook
const mockUseGameContract = {
  address: '0x1234567890abcdef',
  isConnected: true,
  balance: 100.0,
  poolBalance: 1000.0,
  gameState: 'idle' as const,
  isTransacting: false,
  placeBet: jest.fn().mockResolvedValue(true),
  payoutWin: jest.fn().mockResolvedValue(true),
  finalizeRound: jest.fn().mockResolvedValue(undefined),
  resetGameState: jest.fn(),
  refetchBalance: jest.fn().mockResolvedValue(undefined),
  poolWalletAddress: '0xabcdef1234567890',
}

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock useGameContract before any tests run
jest.mock('@/lib/useGameContract', () => ({
  useGameContract: jest.fn(() => mockUseGameContract),
}))

// Mock toast notifications
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn(),
}

jest.mock('react-hot-toast', () => ({
  toast: mockToast,
  default: mockToast,
}))

// Game test utilities
export const createMockGameContract = (overrides = {}) => ({
  ...mockUseGameContract,
  ...overrides,
})

export const getGameTestWrapper = (gameContractMock = {}) => {
  const mockContract = createMockGameContract(gameContractMock)
  
  // Update the mock implementation
  const { useGameContract } = require('@/lib/useGameContract')
  useGameContract.mockReturnValue(mockContract)
  
  return AllTheProviders
}

// Test helpers for different game states
export const createGameStateScenarios = () => ({
  idle: { gameState: 'idle', isTransacting: false },
  betting: { gameState: 'betting', isTransacting: true },
  waiting: { gameState: 'waiting', isTransacting: false },
  completed: { gameState: 'completed', isTransacting: false },
})

// Test helpers for wallet connection states
export const createWalletScenarios = () => ({
  connected: { isConnected: true, address: '0x1234567890abcdef', balance: 100.0 },
  disconnected: { isConnected: false, address: undefined, balance: 0 },
  lowBalance: { isConnected: true, address: '0x1234567890abcdef', balance: 0.05 },
})

// Test helpers for bet validation
export const createBetScenarios = () => ({
  validBet: 1.0,
  minBet: 0.1,
  maxBet: 5.0,
  belowMin: 0.05,
  aboveMax: 10.0,
  zero: 0,
  negative: -1.0,
})

// Mock game algorithms for consistent testing
export const mockGameResults = {
  win: {
    isWin: true,
    multiplier: 2.5,
    payout: 2.5,
  },
  lose: {
    isWin: false,
    multiplier: 0,
    payout: 0,
  },
  bigWin: {
    isWin: true,
    multiplier: 10.0,
    payout: 10.0,
  },
}

// Animation and timer utilities for testing
export const mockTimers = () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })
}

// Security testing utilities
export const createSecurityTestScenarios = () => ({
  validInput: '1.0',
  sqlInjection: "1'; DROP TABLE users; --",
  xssAttempt: '<script>alert("xss")</script>',
  oversizedInput: 'a'.repeat(10000),
  unicodeAttack: '𝟭𝟬𝟬', // Unicode numbers that could bypass validation
  nullByte: '\x001.0',
})

export const waitForGameAnimation = async (animationTime = 1000) => {
  jest.advanceTimersByTime(animationTime)
  await Promise.resolve() // Allow promises to resolve
}

export * from '@testing-library/react'
export { customRender as render }
export { mockToast }
export { mockUseGameContract }