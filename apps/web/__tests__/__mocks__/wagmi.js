// Mock for wagmi
module.exports = {
  createConfig: jest.fn(() => ({})),
  WagmiProvider: jest.fn(({ children }) => children),
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  })),
  useConnect: jest.fn(() => ({
    connect: jest.fn(),
    connectors: []
  })),
  useDisconnect: jest.fn(() => ({
    disconnect: jest.fn()
  })),
};