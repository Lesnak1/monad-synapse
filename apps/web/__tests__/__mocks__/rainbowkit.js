// Mock for @rainbow-me/rainbowkit
module.exports = {
  connectorsForWallets: jest.fn(() => []),
  getDefaultWallets: jest.fn(() => ({
    connectors: [],
    wallets: []
  })),
  RainbowKitProvider: jest.fn(({ children }) => children),
  Chain: {},
};