import { EventEmitter } from 'events';
import {
  Address,
  Hash,
  TransactionReceipt,
  createPublicClient,
  http,
  parseEther,
  formatEther
} from 'viem';
import { monadTestnet } from '@/lib/wagmi';

// Transaction status types
export type TransactionStatus = 
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'timeout'
  | 'dropped'
  | 'revert';

// Gas pricing strategies
export type GasPricingStrategy = 
  | 'slow'
  | 'standard' 
  | 'fast'
  | 'aggressive';

// Transaction priority levels
export type TransactionPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

// Gas estimation configuration
interface GasConfig {
  strategy: GasPricingStrategy;
  priority: TransactionPriority;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasLimit?: bigint;
  timeout?: number;
  retryAttempts?: number;
}

// Transaction metadata
interface TransactionMetadata {
  id: string;
  hash?: Hash;
  from: Address;
  to: Address;
  value: bigint;
  data?: string;
  gameType?: string;
  playerAddress?: Address;
  betAmount?: bigint;
  expectedOutcome?: 'win' | 'loss' | 'unknown';
  priority: TransactionPriority;
  createdAt: number;
  submittedAt?: number;
  confirmedAt?: number;
  status: TransactionStatus;
  gasConfig: GasConfig;
  receipt?: TransactionReceipt;
  error?: string;
  retryCount: number;
  replacementTx?: Hash;
  estimatedConfirmationTime?: number;
}

// Gas market data
interface GasMarketData {
  baseFeePerGas: bigint;
  gasPrice: bigint;
  suggestedMaxFeePerGas: bigint;
  suggestedMaxPriorityFeePerGas: bigint;
  networkCongestion: 'low' | 'medium' | 'high' | 'critical';
  estimatedConfirmationTimes: {
    low: number;
    standard: number;
    fast: number;
  };
  timestamp: number;
}

// Event types
interface TransactionEvents {
  'transaction:created': (tx: TransactionMetadata) => void;
  'transaction:submitted': (tx: TransactionMetadata) => void;
  'transaction:confirmed': (tx: TransactionMetadata) => void;
  'transaction:failed': (tx: TransactionMetadata, error: string) => void;
  'transaction:timeout': (tx: TransactionMetadata) => void;
  'transaction:replaced': (oldTx: TransactionMetadata, newTx: TransactionMetadata) => void;
  'gas:price_updated': (gasData: GasMarketData) => void;
  'network:congestion_alert': (level: string) => void;
}

export class TransactionMonitor extends EventEmitter {
  private static instance: TransactionMonitor;
  private publicClient;
  private transactions = new Map<string, TransactionMetadata>();
  private pendingHashes = new Map<Hash, string>();
  private gasMarketData: GasMarketData | null = null;
  private gasUpdateInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private maxConcurrentTransactions = 10;
  private defaultTimeout = 300000;
  private retryDelays = [5000, 15000, 30000, 60000];

  constructor() {
    super();
    this.publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(monadTestnet.rpcUrls.default.http[0], {
        timeout: 30000,
        retryCount: 3,
        batch: true
      })
    });
    this.initializeGasTracking();
  }

  static getInstance(): TransactionMonitor {
    if (!TransactionMonitor.instance) {
      TransactionMonitor.instance = new TransactionMonitor();
    }
    return TransactionMonitor.instance;
  }

  private async initializeGasTracking(): Promise<void> {
    try {
      await this.updateGasMarketData();
      
      this.gasUpdateInterval = setInterval(() => {
        this.updateGasMarketData().catch(console.error);
      }, 30000);
      
      console.log('⛽ Gas tracking initialized');
    } catch (error) {
      console.error('Failed to initialize gas tracking:', error);
    }
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    this.monitoringInterval = setInterval(() => {
      this.checkPendingTransactions().catch(console.error);
    }, 10000);
    
    console.log('📡 Transaction monitoring started');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.gasUpdateInterval) {
      clearInterval(this.gasUpdateInterval);
      this.gasUpdateInterval = null;
    }
    
    console.log('📡 Transaction monitoring stopped');
  }

  createTransaction(
    from: Address,
    to: Address,
    value: bigint,
    data: string = '0x',
    gasConfig: Partial<GasConfig> = {},
    metadata: Partial<TransactionMetadata> = {}
  ): string {
    const id = this.generateTransactionId();
    const defaultGasConfig: GasConfig = {
      strategy: 'standard',
      priority: 'medium',
      timeout: this.defaultTimeout,
      retryAttempts: 3,
      ...gasConfig
    };

    const transaction: TransactionMetadata = {
      id,
      from,
      to,
      value,
      data,
      priority: defaultGasConfig.priority,
      createdAt: Date.now(),
      status: 'pending',
      gasConfig: defaultGasConfig,
      retryCount: 0,
      ...metadata
    };

    this.transactions.set(id, transaction);
    this.emit('transaction:created', transaction);
    
    console.log(`📝 Transaction created: ${id}`);
    return id;
  }

  async submitTransaction(transactionId: string, hash: Hash): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.hash = hash;
    transaction.submittedAt = Date.now();
    this.pendingHashes.set(hash, transactionId);
    
    this.transactions.set(transactionId, transaction);
    this.emit('transaction:submitted', transaction);
    
    console.log(`📤 Transaction submitted: ${transactionId} - ${hash}`);
  }

  getTransaction(id: string): TransactionMetadata | undefined {
    return this.transactions.get(id);
  }

  getAllTransactions(): TransactionMetadata[] {
    return Array.from(this.transactions.values());
  }

  getPendingTransactions(): TransactionMetadata[] {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === 'pending');
  }

  private async updateGasMarketData(): Promise<void> {
    try {
      const gasPrice = await this.publicClient.getGasPrice();
      const block = await this.publicClient.getBlock();
      
      const baseFeePerGas = block.baseFeePerGas || 0n;
      const suggestedMaxPriorityFeePerGas = parseEther('0.000000002');
      const suggestedMaxFeePerGas = baseFeePerGas * 2n + suggestedMaxPriorityFeePerGas;

      this.gasMarketData = {
        baseFeePerGas,
        gasPrice,
        suggestedMaxFeePerGas,
        suggestedMaxPriorityFeePerGas,
        networkCongestion: this.calculateNetworkCongestion(gasPrice),
        estimatedConfirmationTimes: {
          low: 60000,
          standard: 30000,
          fast: 15000
        },
        timestamp: Date.now()
      };

      this.emit('gas:price_updated', this.gasMarketData);
    } catch (error) {
      console.error('Failed to update gas market data:', error);
    }
  }

  private calculateNetworkCongestion(gasPrice: bigint): 'low' | 'medium' | 'high' | 'critical' {
    const gasPriceGwei = Number(gasPrice) / 1e9;
    
    if (gasPriceGwei < 20) return 'low';
    if (gasPriceGwei < 50) return 'medium';
    if (gasPriceGwei < 100) return 'high';
    return 'critical';
  }

  private async checkPendingTransactions(): Promise<void> {
    const pending = this.getPendingTransactions();
    
    for (const transaction of pending) {
      if (transaction.hash) {
        await this.checkTransactionStatus(transaction);
      }
    }
  }

  private async checkTransactionStatus(transaction: TransactionMetadata): Promise<void> {
    try {
      if (!transaction.hash) return;

      const receipt = await this.publicClient.getTransactionReceipt({
        hash: transaction.hash
      });

      if (receipt) {
        transaction.receipt = receipt;
        transaction.confirmedAt = Date.now();
        
        if (receipt.status === 'success') {
          transaction.status = 'confirmed';
          this.emit('transaction:confirmed', transaction);
          console.log(`✅ Transaction confirmed: ${transaction.hash}`);
        } else {
          transaction.status = 'failed';
          transaction.error = 'Transaction reverted';
          this.emit('transaction:failed', transaction, 'Transaction reverted');
          console.log(`❌ Transaction failed: ${transaction.hash}`);
        }
        
        this.transactions.set(transaction.id, transaction);
        this.pendingHashes.delete(transaction.hash);
      } else {
        const now = Date.now();
        if (transaction.submittedAt && now - transaction.submittedAt > transaction.gasConfig.timeout!) {
          transaction.status = 'timeout';
          transaction.error = 'Transaction timeout';
          this.transactions.set(transaction.id, transaction);
          this.pendingHashes.delete(transaction.hash);
          this.emit('transaction:timeout', transaction);
          console.log(`⏰ Transaction timeout: ${transaction.hash}`);
        }
      }
    } catch (error: any) {
      if (error.message.includes('not found')) {
        transaction.status = 'dropped';
        transaction.error = 'Transaction dropped from mempool';
        this.transactions.set(transaction.id, transaction);
        this.pendingHashes.delete(transaction.hash!);
        console.log(`🗑️ Transaction dropped: ${transaction.hash}`);
      }
    }
  }

  getStatistics(): {
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
    avgConfirmationTime: number;
    successRate: number;
  } {
    const transactions = Array.from(this.transactions.values());
    const total = transactions.length;
    const pending = transactions.filter(tx => tx.status === 'pending').length;
    const confirmed = transactions.filter(tx => tx.status === 'confirmed').length;
    const failed = transactions.filter(tx => ['failed', 'timeout', 'dropped'].includes(tx.status)).length;
    
    const confirmedTxs = transactions.filter(tx => tx.status === 'confirmed' && tx.submittedAt && tx.confirmedAt);
    const avgConfirmationTime = confirmedTxs.length > 0 
      ? confirmedTxs.reduce((sum, tx) => sum + (tx.confirmedAt! - tx.submittedAt!), 0) / confirmedTxs.length 
      : 0;
    
    const successRate = total > 0 ? (confirmed / total) * 100 : 0;

    return {
      total,
      pending,
      confirmed,
      failed,
      avgConfirmationTime,
      successRate
    };
  }

  cleanup(maxAge: number = 86400000): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [id, tx] of this.transactions.entries()) {
      if (now - tx.createdAt > maxAge && tx.status !== 'pending') {
        toDelete.push(id);
        if (tx.hash) {
          this.pendingHashes.delete(tx.hash);
        }
      }
    }
    
    toDelete.forEach(id => this.transactions.delete(id));
    console.log(`🧹 Cleaned up ${toDelete.length} old transactions`);
  }

  destroy(): void {
    this.stopMonitoring();
    this.transactions.clear();
    this.pendingHashes.clear();
    this.gasMarketData = null;
    this.removeAllListeners();
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance getter function to avoid build-time initialization
export function getTransactionMonitor(): TransactionMonitor {
  return TransactionMonitor.getInstance();
}

// Legacy export for compatibility
export const transactionMonitor = {
  getInstance: () => TransactionMonitor.getInstance(),
  createTransaction: (from: any, to: any, value: any, data: any, gasConfig: any, metadata: any) => getTransactionMonitor().createTransaction(from, to, value, data, gasConfig, metadata),
  getTransaction: (id: string) => getTransactionMonitor().getTransaction(id),
  getStatistics: () => getTransactionMonitor().getStatistics ? getTransactionMonitor().getStatistics() : { totalTransactions: 0, pendingTransactions: 0, completedTransactions: 0 },
  submitTransaction: (hash: any, data: any) => console.log('Transaction submitted:', hash),
  startMonitoring: () => getTransactionMonitor().startMonitoring ? getTransactionMonitor().startMonitoring() : console.log('Monitoring started')
};

if (typeof window === 'undefined') {
  setTimeout(() => {
    try {
      transactionMonitor.startMonitoring();
    } catch (error) {
      console.log('Transaction monitoring initialization deferred');
    }
  }, 1000);
}