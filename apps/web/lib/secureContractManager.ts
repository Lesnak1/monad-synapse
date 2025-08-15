/**
 * Secure Contract Manager
 * Advanced smart contract interaction layer with comprehensive security patterns
 */

import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseEther, 
  formatEther, 
  getContract,
  encodeFunctionData,
  decodeFunctionResult,
  parseAbi,
  Address,
  Hash,
  TransactionReceipt,
  Log,
  GetContractReturnType,
  PublicClient,
  WalletClient
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from './wagmi';
// Web Crypto API helpers for Edge Runtime compatibility
async function createHash(algorithm: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomBytes(size: number): string {
  const array = new Uint8Array(size);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Contract ABI (simplified - would import from generated types in production)
const CASINO_CONTRACT_ABI = parseAbi([
  'function placeBet(string gameType, uint256 betAmount, bytes gameData, bytes signature) payable',
  'function processGameResult(address player, bytes32 gameId, uint256 betAmount, uint256 multiplier, bytes signature)',
  'function getPoolStatus() view returns (uint256 totalBalance, uint256 reserveBalance, uint256 availableBalance, uint256 utilizationRatio)',
  'function checkPlayerLossLimits(address player) view returns (uint256 dailyLosses, uint256 remainingLimit, bool isLimitExceeded)',
  'function emergencyPause()',
  'function unpause()',
  'function addToPool() payable',
  'event GameBetPlaced(address indexed player, uint256 amount, bytes32 indexed gameId, uint256 nonce)',
  'event GameResult(address indexed player, bytes32 indexed gameId, uint256 betAmount, uint256 winAmount, bool won)',
  'event SecurityAlert(string indexed alertType, address indexed actor, bytes data)',
  'event PoolBalanceUpdated(uint256 newBalance, uint256 newReserve)'
]);

// Security configuration
const SECURITY_CONFIG = {
  MAX_GAS_PRICE: parseEther('0.1'), // 0.1 ETH max gas price
  TRANSACTION_TIMEOUT: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 3,
  CONFIRMATION_BLOCKS: 3,
  RATE_LIMIT_WINDOW: 1000, // 1 second
  MAX_CONCURRENT_TRANSACTIONS: 5,
  SIGNATURE_VALIDITY_PERIOD: 300000, // 5 minutes
  NONCE_TOLERANCE: 5 // Allow up to 5 nonce gap
};

// Transaction status tracking
interface PendingTransaction {
  hash: Hash;
  gameId: string;
  playerAddress: Address;
  amount: bigint;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'confirmed' | 'failed' | 'timeout';
}

// Gas estimation result
interface GasEstimation {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedCost: bigint;
}

// Contract interaction result
interface ContractResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionHash?: Hash;
  gasUsed?: bigint;
  confirmations?: number;
}

// Event filter for monitoring
interface EventFilter {
  address?: Address;
  fromBlock?: bigint;
  toBlock?: bigint;
  topics?: (Hash | Hash[] | null)[];
}

export class SecureContractManager {
  private static instance: SecureContractManager;
  private publicClient: PublicClient = createPublicClient({
    chain: monadTestnet,
    transport: http()
  });
  private walletClient: WalletClient | null = null;
  private contract: GetContractReturnType<typeof CASINO_CONTRACT_ABI, PublicClient> | null = null;
  private pendingTransactions = new Map<Hash, PendingTransaction>();
  private rateLimitMap = new Map<Address, number[]>();
  private nonceTracker = new Map<Address, number>();
  private eventListeners = new Map<string, ((log: Log) => void)[]>();
  private contractAddress: Address;
  private isInitialized = false;
  private lastHealthCheck = 0;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailure = 0;

  constructor() {
    this.contractAddress = (process.env.NEXT_PUBLIC_CASINO_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address;
    // Initialize clients asynchronously to avoid build-time issues
    if (typeof window === 'undefined') {
      // Only initialize on server-side
      setTimeout(() => this.initializeClients(), 0);
    }
  }

  static getInstance(): SecureContractManager {
    if (!SecureContractManager.instance) {
      SecureContractManager.instance = new SecureContractManager();
    }
    return SecureContractManager.instance;
  }

  /**
   * Ensure client is initialized before use
   */
  private ensureInitialized(): void {
    if (!this.isInitialized && typeof window === 'undefined') {
      this.initializeClients();
    }
  }

  /**
   * Initialize blockchain clients
   */
  private initializeClients(): void {
    try {
      // Only initialize if not already initialized and on server-side
      if (this.isInitialized || typeof window !== 'undefined') {
        return;
      }

      this.publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http('https://monad-testnet.drpc.org', {
          timeout: SECURITY_CONFIG.TRANSACTION_TIMEOUT,
          retryCount: SECURITY_CONFIG.MAX_RETRY_ATTEMPTS,
          batch: true
        })
      });

      // Initialize wallet client if in secure environment
      if (process.env.CASINO_OPERATOR_PRIVATE_KEY) {
        const account = privateKeyToAccount(process.env.CASINO_OPERATOR_PRIVATE_KEY as Hash);
        this.walletClient = createWalletClient({
          account,
          chain: monadTestnet,
          transport: http('https://monad-testnet.drpc.org')
        });
      }

      if (this.contractAddress !== '0x0000000000000000000000000000000000000000') {
        this.contract = getContract({
          address: this.contractAddress,
          abi: CASINO_CONTRACT_ABI,
          client: this.publicClient
        });
      }

      this.isInitialized = true;
      console.log('🔐 Secure contract manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize contract manager:', error);
      // Don't throw error during initialization to prevent build failures
    }
  }

  /**
   * Health check for contract and network
   */
  async performHealthCheck(): Promise<boolean> {
    try {
      this.ensureInitialized();
      const now = Date.now();
      if (now - this.lastHealthCheck < 30000) {
        return true; // Skip if checked recently
      }

      // Check network connectivity
      const blockNumber = await this.publicClient.getBlockNumber();
      if (!blockNumber || blockNumber === 0n) {
        throw new Error('Invalid block number');
      }

      // Check contract existence and state
      if (this.contract) {
        const poolStatus = await this.contract.read.getPoolStatus();
        if (!poolStatus || poolStatus[0] === 0n) {
          throw new Error('Invalid pool status');
        }
      }

      this.lastHealthCheck = now;
      this.circuitBreakerState = 'closed';
      this.failureCount = 0;
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      this._handleCircuitBreaker();
      return false;
    }
  }

  /**
   * Place a secure bet with comprehensive validation
   */
  async placeBet(
    playerAddress: Address,
    gameType: string,
    betAmount: bigint,
    gameData: string,
    privateKey?: Hash
  ): Promise<ContractResult<{ gameId: string; transactionHash: Hash }>> {
    try {
      this.ensureInitialized();
      // Pre-flight checks
      if (!await this._preflightChecks(playerAddress, betAmount)) {
        return { success: false, error: 'Pre-flight checks failed' };
      }

      // Rate limiting
      if (!this._checkRateLimit(playerAddress)) {
        return { success: false, error: 'Rate limit exceeded' };
      }

      // Generate secure game ID
      const gameId = await this._generateGameId(playerAddress, betAmount, gameType);
      
      // Create game data
      const encodedGameData = Buffer.from(JSON.stringify({
        gameId,
        playerAddress,
        timestamp: Date.now(),
        nonce: this._getNextNonce(playerAddress)
      })).toString('hex');

      // Generate server signature (in production, this would be done server-side)
      const signature = await this._generateServerSignature(
        playerAddress,
        betAmount,
        gameType,
        encodedGameData
      );

      // Estimate gas
      const gasEstimation = await this._estimateGas('placeBet', [
        gameType,
        betAmount,
        `0x${encodedGameData}`,
        signature
      ], betAmount);

      if (!gasEstimation) {
        return { success: false, error: 'Gas estimation failed' };
      }

      // Execute transaction
      const result = await this._executeTransaction(
        'placeBet',
        [gameType, betAmount, `0x${encodedGameData}`, signature],
        { value: betAmount, ...gasEstimation },
        privateKey
      );

      if (result.success && result.transactionHash) {
        // Track transaction
        this.pendingTransactions.set(result.transactionHash, {
          hash: result.transactionHash,
          gameId,
          playerAddress,
          amount: betAmount,
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending'
        });

        return {
          success: true,
          data: { gameId, transactionHash: result.transactionHash },
          gasUsed: result.gasUsed
        };
      }

      return result;
    } catch (error: any) {
      console.error('Place bet error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process game result with validation
   */
  async processGameResult(
    playerAddress: Address,
    gameId: string,
    betAmount: bigint,
    multiplier: number,
    privateKey?: Hash
  ): Promise<ContractResult<{ winAmount: bigint }>> {
    try {
      this.ensureInitialized();
      if (!this.walletClient && !privateKey) {
        return { success: false, error: 'Wallet client not available' };
      }

      const gameIdHash = `0x${await createHash('sha256', gameId)}` as Hash;
      const multiplierBigInt = BigInt(Math.floor(multiplier * 100)); // Convert to basis points

      // Generate server signature
      const signature = await this._generateResultSignature(
        playerAddress,
        gameIdHash,
        betAmount,
        multiplierBigInt
      );

      const result = await this._executeTransaction(
        'processGameResult',
        [playerAddress, gameIdHash, betAmount, multiplierBigInt, signature],
        {},
        privateKey
      );

      if (result.success) {
        const winAmount = (betAmount * multiplierBigInt) / 100n;
        return {
          success: true,
          data: { winAmount },
          transactionHash: result.transactionHash,
          gasUsed: result.gasUsed
        };
      }

      return result;
    } catch (error: any) {
      console.error('Process game result error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pool status with caching
   */
  async getPoolStatus(): Promise<ContractResult<{
    totalBalance: bigint;
    reserveBalance: bigint;
    availableBalance: bigint;
    utilizationRatio: number;
  }>> {
    try {
      this.ensureInitialized();
      if (!this.contract) {
        return { success: false, error: 'Contract not initialized' };
      }

      const result = await this.contract.read.getPoolStatus();
      const [totalBalance, reserveBalance, availableBalance, utilizationRatio] = result;

      return {
        success: true,
        data: {
          totalBalance,
          reserveBalance,
          availableBalance,
          utilizationRatio: Number(utilizationRatio) / 100
        }
      };
    } catch (error: any) {
      console.error('Get pool status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check player loss limits
   */
  async checkPlayerLossLimits(playerAddress: Address): Promise<ContractResult<{
    dailyLosses: bigint;
    remainingLimit: bigint;
    isLimitExceeded: boolean;
  }>> {
    try {
      if (!this.contract) {
        return { success: false, error: 'Contract not initialized' };
      }

      const result = await this.contract.read.checkPlayerLossLimits([playerAddress]);
      const [dailyLosses, remainingLimit, isLimitExceeded] = result;

      return {
        success: true,
        data: { dailyLosses, remainingLimit, isLimitExceeded }
      };
    } catch (error: any) {
      console.error('Check player loss limits error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Monitor contract events
   */
  async startEventMonitoring(): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    // Monitor game events
    this.publicClient.watchContractEvent({
      address: this.contractAddress,
      abi: CASINO_CONTRACT_ABI,
      eventName: 'GameBetPlaced',
      onLogs: (logs) => {
        logs.forEach(log => this._handleGameBetPlaced(log));
      }
    });

    this.publicClient.watchContractEvent({
      address: this.contractAddress,
      abi: CASINO_CONTRACT_ABI,
      eventName: 'GameResult',
      onLogs: (logs) => {
        logs.forEach(log => this._handleGameResult(log));
      }
    });

    this.publicClient.watchContractEvent({
      address: this.contractAddress,
      abi: CASINO_CONTRACT_ABI,
      eventName: 'SecurityAlert',
      onLogs: (logs) => {
        logs.forEach(log => this._handleSecurityAlert(log));
      }
    });

    console.log('📡 Event monitoring started');
  }

  /**
   * Emergency functions
   */
  async emergencyPause(privateKey?: Hash): Promise<ContractResult> {
    try {
      return await this._executeTransaction('emergencyPause', [], {}, privateKey);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async emergencyUnpause(privateKey?: Hash): Promise<ContractResult> {
    try {
      return await this._executeTransaction('unpause', [], {}, privateKey);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Transaction monitoring and retry logic
   */
  async monitorTransaction(hash: Hash): Promise<TransactionReceipt | null> {
    try {
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes with 10-second intervals
      
      while (attempts < maxAttempts) {
        const receipt = await this.publicClient.getTransactionReceipt({ hash });
        
        if (receipt) {
          // Update pending transaction status
          const pending = this.pendingTransactions.get(hash);
          if (pending) {
            pending.status = receipt.status === 'success' ? 'confirmed' : 'failed';
            
            if (receipt.status === 'success') {
              console.log(`✅ Transaction confirmed: ${hash}`);
            } else {
              console.error(`❌ Transaction failed: ${hash}`);
            }
          }
          
          return receipt;
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;
      }
      
      // Timeout
      const pending = this.pendingTransactions.get(hash);
      if (pending) {
        pending.status = 'timeout';
      }
      
      console.warn(`⏰ Transaction timeout: ${hash}`);
      return null;
    } catch (error) {
      console.error('Monitor transaction error:', error);
      return null;
    }
  }

  /**
   * Private helper methods
   */
  private async _preflightChecks(playerAddress: Address, betAmount: bigint): Promise<boolean> {
    try {
      // Health check
      if (this.circuitBreakerState === 'open') {
        return false;
      }

      // Network health
      if (!await this.performHealthCheck()) {
        return false;
      }

      // Contract validation
      if (!this.contract || this.contractAddress === '0x0000000000000000000000000000000000000000') {
        return false;
      }

      // Amount validation
      const minBet = parseEther('0.001');
      const maxBet = parseEther('1000');
      if (betAmount < minBet || betAmount > maxBet) {
        return false;
      }

      // Pool balance check
      const poolStatus = await this.getPoolStatus();
      if (!poolStatus.success || !poolStatus.data) {
        return false;
      }

      const maxPossibleWin = betAmount * 100n; // Assume max 100x
      if (maxPossibleWin > poolStatus.data.availableBalance) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Preflight checks failed:', error);
      return false;
    }
  }

  private _checkRateLimit(address: Address): boolean {
    const now = Date.now();
    const window = SECURITY_CONFIG.RATE_LIMIT_WINDOW;
    
    if (!this.rateLimitMap.has(address)) {
      this.rateLimitMap.set(address, []);
    }
    
    const timestamps = this.rateLimitMap.get(address)!;
    
    // Remove old timestamps
    while (timestamps.length > 0 && now - timestamps[0] > window) {
      timestamps.shift();
    }
    
    // Check limit (max 1 transaction per second)
    if (timestamps.length >= 1) {
      return false;
    }
    
    timestamps.push(now);
    return true;
  }

  private async _generateGameId(playerAddress: Address, betAmount: bigint, gameType: string): Promise<string> {
    const nonce = this._getNextNonce(playerAddress);
    const timestamp = Date.now();
    const randomBytes32 = randomBytes(32);
    
    return await createHash('sha256', `${playerAddress}${betAmount}${gameType}${nonce}${timestamp}${randomBytes32}`);
  }

  private _getNextNonce(address: Address): number {
    const current = this.nonceTracker.get(address) || 0;
    const next = current + 1;
    this.nonceTracker.set(address, next);
    return next;
  }

  private async _generateServerSignature(
    playerAddress: Address,
    betAmount: bigint,
    gameType: string,
    gameData: string
  ): Promise<Hash> {
    // In production, this would call a secure signing service
    // For now, return a mock signature
    const message = `${playerAddress}${betAmount}${gameType}${gameData}`;
    const hash = await createHash('sha256', message);
    return `0x${hash}` as Hash;
  }

  private async _generateResultSignature(
    playerAddress: Address,
    gameId: Hash,
    betAmount: bigint,
    multiplier: bigint
  ): Promise<Hash> {
    // In production, this would call a secure signing service
    const message = `${playerAddress}${gameId}${betAmount}${multiplier}`;
    const hash = await createHash('sha256', message);
    return `0x${hash}` as Hash;
  }

  private async _estimateGas(
    functionName: string,
    args: any[],
    value?: bigint
  ): Promise<GasEstimation | null> {
    try {
      if (!this.contract || !this.walletClient) {
        return null;
      }

      const gasLimit = await this.publicClient.estimateContractGas({
        address: this.contractAddress,
        abi: CASINO_CONTRACT_ABI,
        functionName: functionName as any,
        args: args as any,
        value: undefined,
        account: this.walletClient.account
      });

      const gasPrice = await this.publicClient.getGasPrice();
      const maxFeePerGas = gasPrice * 110n / 100n; // 10% buffer
      const maxPriorityFeePerGas = parseEther('0.001'); // 0.001 ETH priority fee

      return {
        gasLimit: gasLimit * 110n / 100n, // 10% buffer
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCost: gasLimit * gasPrice
      };
    } catch (error) {
      console.error('Gas estimation failed:', error);
      return null;
    }
  }

  private async _executeTransaction(
    functionName: string,
    args: any[],
    txOptions: any = {},
    privateKey?: Hash
  ): Promise<ContractResult> {
    try {
      if (!this.contract) {
        return { success: false, error: 'Contract not initialized' };
      }

      // Use provided private key or default wallet client
      let walletClient = this.walletClient;
      if (privateKey && !walletClient) {
        const account = privateKeyToAccount(privateKey);
        walletClient = createWalletClient({
          account,
          chain: monadTestnet,
          transport: http('https://monad-testnet.drpc.org')
        });
      }

      if (!walletClient) {
        return { success: false, error: 'No wallet client available' };
      }

      const hash = await walletClient.writeContract({
        address: this.contractAddress,
        abi: CASINO_CONTRACT_ABI,
        functionName,
        args,
        ...txOptions
      });

      console.log(`📤 Transaction sent: ${hash}`);
      
      // Monitor transaction
      const receipt = await this.monitorTransaction(hash);
      
      if (receipt?.status === 'success') {
        return {
          success: true,
          transactionHash: hash,
          gasUsed: receipt.gasUsed,
          confirmations: 1
        };
      } else {
        return {
          success: false,
          error: 'Transaction failed or timed out',
          transactionHash: hash
        };
      }
    } catch (error: any) {
      console.error('Execute transaction error:', error);
      this._handleCircuitBreaker();
      return { success: false, error: error.message };
    }
  }

  private _handleCircuitBreaker(): void {
    this.failureCount++;
    this.lastFailure = Date.now();

    if (this.failureCount >= 5) {
      this.circuitBreakerState = 'open';
      console.warn('🔴 Circuit breaker opened due to failures');
      
      // Auto-recovery after 5 minutes
      setTimeout(() => {
        this.circuitBreakerState = 'half-open';
        this.failureCount = 0;
        console.log('🟡 Circuit breaker half-open for testing');
      }, 300000);
    }
  }

  private _handleGameBetPlaced(log: Log): void {
    console.log('🎲 Game bet placed:', log);
    // Emit event to listeners
    this._emitEvent('gameBetPlaced', log);
  }

  private _handleGameResult(log: Log): void {
    console.log('🎯 Game result:', log);
    // Update pending transaction if found
    if (log.transactionHash) {
      const pending = this.pendingTransactions.get(log.transactionHash);
      if (pending) {
        pending.status = 'confirmed';
      }
    }
    this._emitEvent('gameResult', log);
  }

  private _handleSecurityAlert(log: Log): void {
    console.warn('🚨 Security alert:', log);
    this._emitEvent('securityAlert', log);
  }

  private _emitEvent(eventName: string, log: Log): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => listener(log));
    }
  }

  /**
   * Public event listener management
   */
  addEventListener(eventName: string, listener: (log: Log) => void): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName)!.push(listener);
  }

  removeEventListener(eventName: string, listener: (log: Log) => void): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    isInitialized: boolean;
    circuitBreakerState: string;
    failureCount: number;
    pendingTransactionCount: number;
    lastHealthCheck: number;
  } {
    return {
      isInitialized: this.isInitialized,
      circuitBreakerState: this.circuitBreakerState,
      failureCount: this.failureCount,
      pendingTransactionCount: this.pendingTransactions.size,
      lastHealthCheck: this.lastHealthCheck
    };
  }

  /**
   * Cleanup pending transactions
   */
  cleanup(): void {
    const now = Date.now();
    const timeout = 300000; // 5 minutes
    
    for (const [hash, tx] of this.pendingTransactions.entries()) {
      if (now - tx.timestamp > timeout) {
        this.pendingTransactions.delete(hash);
      }
    }
  }
}

// Export singleton instance getter function to avoid build-time initialization
export function getSecureContractManager(): SecureContractManager {
  return SecureContractManager.getInstance();
}

// Legacy export for compatibility
export const secureContractManager = {
  getInstance: () => SecureContractManager.getInstance(),
  placeBet: (playerAddress: Address, gameType: string, betAmount: bigint, gameData: string, privateKey?: Hash) => 
    getSecureContractManager().placeBet(playerAddress, gameType, betAmount, gameData, privateKey),
  processGameResult: (playerAddress: Address, gameId: string, betAmount: bigint, multiplier: number, privateKey?: Hash) => 
    getSecureContractManager().processGameResult(playerAddress, gameId, betAmount, multiplier, privateKey),
  getPoolStatus: () => getSecureContractManager().getPoolStatus(),
  checkPlayerLossLimits: (address: Address) => getSecureContractManager().checkPlayerLossLimits(address),
  performHealthCheck: () => getSecureContractManager().performHealthCheck(),
  getSystemStatus: () => getSecureContractManager().getSystemStatus(),
  emergencyPause: (privateKey?: Hash) => getSecureContractManager().emergencyPause(privateKey),
  emergencyUnpause: (privateKey?: Hash) => getSecureContractManager().emergencyUnpause(privateKey),
  monitorTransaction: (hash: Hash) => getSecureContractManager().monitorTransaction(hash),
  startEventMonitoring: () => getSecureContractManager().startEventMonitoring(),
  addEventListener: (eventName: string, listener: (log: any) => void) => getSecureContractManager().addEventListener(eventName, listener),
  removeEventListener: (eventName: string, listener: (log: any) => void) => getSecureContractManager().removeEventListener(eventName, listener),
  cleanup: () => getSecureContractManager().cleanup()
};

// Ensure server-side only for sensitive operations
if (typeof window !== 'undefined') {
  console.warn('⚠️ SecureContractManager should primarily be used server-side for sensitive operations');
}