// Mock for viem
module.exports = {
  createWalletClient: jest.fn(() => ({})),
  createPublicClient: jest.fn(() => ({
    getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')) // 1 ETH
  })),
  http: jest.fn(() => ({})),
  parseEther: jest.fn((value) => BigInt(value) * BigInt('1000000000000000000')),
  formatEther: jest.fn((value) => (Number(value) / 1e18).toString()),
  publicActions: {},
  privateKeyToAccount: jest.fn(() => ({ address: '0x1234567890123456789012345678901234567890' })),
};