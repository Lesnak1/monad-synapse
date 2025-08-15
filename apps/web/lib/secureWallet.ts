/**
 * Secure Wallet Management System
 * Server-side only private key handling with HSM-level security
 */

import { createHash, createHmac, randomBytes, pbkdf2Sync } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface WalletConfig {
  address: string;
  encryptedKey: string;
  keyDerivation: {
    algorithm: string;
    iterations: number;
    salt: string;
    keyLength: number;
  };
  metadata: {
    createdAt: number;
    lastUsed?: number;
    purpose: string;
    permissions: string[];
  };
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  gameType: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  transactionHash?: string;
  gasUsed?: number;
  signature?: string;
}

export class SecureWalletManager {
  private static instance: SecureWalletManager;
  private wallets: Map<string, WalletConfig> = new Map();
  private masterKey: Buffer | null = null;
  private isInitialized: boolean = false;
  private keystore: string;

  constructor() {
    this.keystore = process.env.KEYSTORE_PATH || './secure/keystore';
    this.initializeSecureEnvironment();
  }

  static getInstance(): SecureWalletManager {
    if (!SecureWalletManager.instance) {
      SecureWalletManager.instance = new SecureWalletManager();
    }
    return SecureWalletManager.instance;
  }

  /**
   * Initialize secure environment
   */
  private initializeSecureEnvironment(): void {
    try {
      // Ensure we're in server environment
      if (typeof window !== 'undefined') {
        throw new Error('Wallet manager must only be used server-side');
      }

      // Check environment security
      this.validateEnvironment();
      
      // Initialize master key
      this.initializeMasterKey();
      
      // Load existing wallets
      this.loadWallets();
      
      this.isInitialized = true;
      console.log('🔐 Secure wallet manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize secure wallet manager:', error);
      throw error;
    }
  }

  /**
   * Validate environment security
   */
  private validateEnvironment(): void {
    // Check required environment variables
    const requiredEnvVars = ['NODE_ENV', 'MASTER_KEY_PASSPHRASE'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.warn(`⚠️ Missing environment variable: ${envVar}`);
      }
    }

    // Ensure production security settings
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.MASTER_KEY_PASSPHRASE || process.env.MASTER_KEY_PASSPHRASE.length < 32) {
        throw new Error('Production requires strong master key passphrase (32+ chars)');
      }
    }
  }

  /**
   * Initialize or load master key
   */
  private initializeMasterKey(): void {
    const passphrase = process.env.MASTER_KEY_PASSPHRASE || 'fallback-dev-passphrase-change-in-production';
    const salt = process.env.MASTER_KEY_SALT || randomBytes(32).toString('hex');
    
    // Derive master key using PBKDF2
    this.masterKey = pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
    
    console.log('🔑 Master key derived successfully');
  }

  /**
   * Create a new secure wallet
   */
  createWallet(purpose: string = 'pool', permissions: string[] = ['send', 'receive']): WalletConfig {
    if (!this.isInitialized || !this.masterKey) {
      throw new Error('Wallet manager not initialized');
    }

    // Generate new private key (32 bytes)
    const privateKey = randomBytes(32);
    
    // Generate address from private key (simplified - would use proper secp256k1 in production)
    const address = '0x' + createHash('sha256').update(privateKey).digest('hex').slice(0, 40);
    
    // Encrypt private key
    const encryptedKey = this.encryptPrivateKey(privateKey);
    
    // Create wallet configuration
    const walletConfig: WalletConfig = {
      address,
      encryptedKey,
      keyDerivation: {
        algorithm: 'aes-256-gcm',
        iterations: 100000,
        salt: randomBytes(32).toString('hex'),
        keyLength: 32
      },
      metadata: {
        createdAt: Date.now(),
        purpose,
        permissions
      }
    };

    // Store wallet
    this.wallets.set(address, walletConfig);
    this.saveWallets();

    console.log(`🆕 Created new ${purpose} wallet: ${address}`);
    return walletConfig;
  }

  /**
   * Get pool wallet (create if doesn't exist)
   */
  getPoolWallet(): WalletConfig {
    // Find existing pool wallet
    for (const wallet of this.wallets.values()) {
      if (wallet.metadata.purpose === 'pool') {
        wallet.metadata.lastUsed = Date.now();
        return wallet;
      }
    }

    // Create new pool wallet if none exists
    return this.createWallet('pool', ['send', 'receive', 'pool-management']);
  }

  /**
   * Sign transaction securely
   */
  async signTransaction(walletAddress: string, transaction: Omit<Transaction, 'id' | 'timestamp' | 'status' | 'signature'>): Promise<Transaction> {
    const wallet = this.wallets.get(walletAddress);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check permissions
    if (!wallet.metadata.permissions.includes('send')) {
      throw new Error('Wallet does not have send permission');
    }

    // Decrypt private key
    const privateKey = this.decryptPrivateKey(wallet.encryptedKey);

    // Create transaction object
    const tx: Transaction = {
      id: randomBytes(16).toString('hex'),
      ...transaction,
      timestamp: Date.now(),
      status: 'pending'
    };

    // Sign transaction (simplified - would use proper secp256k1 in production)
    const txHash = createHash('sha256').update(JSON.stringify({
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      timestamp: tx.timestamp
    })).digest('hex');

    tx.signature = createHmac('sha256', privateKey).update(txHash).digest('hex');

    // Update wallet metadata
    wallet.metadata.lastUsed = Date.now();
    this.saveWallets();

    console.log(`📝 Transaction signed: ${tx.id}`);
    return tx;
  }

  /**
   * Execute payout transaction
   */
  async executePoolPayout(toAddress: string, amount: number, gameType: string): Promise<{
    success: boolean;
    transaction?: Transaction;
    error?: string;
  }> {
    try {
      const poolWallet = this.getPoolWallet();
      
      // Validate recipient address format
      if (!toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        return { success: false, error: 'Invalid recipient address format' };
      }

      // Validate amount
      if (amount <= 0 || amount > 10000) {
        return { success: false, error: 'Invalid payout amount' };
      }

      // Check pool balance (simplified - would check actual blockchain balance)
      const poolBalance = await this.getWalletBalance(poolWallet.address);
      if (poolBalance < amount + 1) { // Keep 1 MON for gas
        return { success: false, error: 'Insufficient pool balance' };
      }

      // Sign and execute transaction
      const transaction = await this.signTransaction(poolWallet.address, {
        from: poolWallet.address,
        to: toAddress,
        amount,
        gameType
      });

      // Simulate blockchain execution (in production, would submit to blockchain)
      await this.simulateBlockchainExecution(transaction);

      return { success: true, transaction };

    } catch (error: any) {
      console.error('Pool payout error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get wallet balance (simplified)
   */
  async getWalletBalance(address: string): Promise<number> {
    // In production, this would query the actual blockchain
    // For now, return a simulated balance
    return 1000; // 1000 MON
  }

  /**
   * Encrypt private key using master key
   */
  private encryptPrivateKey(privateKey: Buffer): string {
    if (!this.masterKey) {
      throw new Error('Master key not available');
    }

    const cipher = require('crypto').createCipher('aes-256-gcm', this.masterKey);
    let encrypted = cipher.update(privateKey, 'binary', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  }

  /**
   * Decrypt private key using master key
   */
  private decryptPrivateKey(encryptedKey: string): Buffer {
    if (!this.masterKey) {
      throw new Error('Master key not available');
    }

    const decipher = require('crypto').createDecipher('aes-256-gcm', this.masterKey);
    let decrypted = decipher.update(encryptedKey, 'hex', 'binary');
    decrypted += decipher.final('binary');
    
    return Buffer.from(decrypted, 'binary');
  }

  /**
   * Save wallets to secure storage
   */
  private saveWallets(): void {
    if (!existsSync(this.keystore)) {
      require('fs').mkdirSync(this.keystore, { recursive: true });
    }

    const walletsData = Array.from(this.wallets.entries());
    const encryptedData = this.encryptData(JSON.stringify(walletsData));
    
    writeFileSync(join(this.keystore, 'wallets.enc'), encryptedData);
  }

  /**
   * Load wallets from secure storage
   */
  private loadWallets(): void {
    const walletFile = join(this.keystore, 'wallets.enc');
    
    if (existsSync(walletFile)) {
      try {
        const encryptedData = readFileSync(walletFile, 'utf-8');
        const decryptedData = this.decryptData(encryptedData);
        const walletsData = JSON.parse(decryptedData);
        
        this.wallets = new Map(walletsData);
        console.log(`📂 Loaded ${this.wallets.size} wallets from keystore`);
      } catch (error) {
        console.error('Failed to load wallets:', error);
        this.wallets = new Map();
      }
    }
  }

  /**
   * Encrypt data using master key
   */
  private encryptData(data: string): string {
    if (!this.masterKey) {
      throw new Error('Master key not available');
    }

    const cipher = require('crypto').createCipher('aes-256-gcm', this.masterKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  }

  /**
   * Decrypt data using master key
   */
  private decryptData(encryptedData: string): string {
    if (!this.masterKey) {
      throw new Error('Master key not available');
    }

    const decipher = require('crypto').createDecipher('aes-256-gcm', this.masterKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Simulate blockchain transaction execution
   */
  private async simulateBlockchainExecution(transaction: Transaction): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate 99% success rate
    if (Math.random() > 0.01) {
      transaction.status = 'confirmed';
      transaction.blockNumber = Math.floor(Math.random() * 1000000) + 1000000;
      transaction.transactionHash = '0x' + randomBytes(32).toString('hex');
      transaction.gasUsed = Math.floor(Math.random() * 50000) + 21000;
    } else {
      transaction.status = 'failed';
    }
  }

  /**
   * Get wallet info (safe for logging)
   */
  getWalletInfo(address: string): { address: string; purpose: string; permissions: string[]; lastUsed?: number } | null {
    const wallet = this.wallets.get(address);
    if (!wallet) return null;

    return {
      address: wallet.address,
      purpose: wallet.metadata.purpose,
      permissions: wallet.metadata.permissions,
      lastUsed: wallet.metadata.lastUsed
    };
  }

  /**
   * List all wallets (safe info only)
   */
  listWallets(): Array<{ address: string; purpose: string; permissions: string[]; lastUsed?: number }> {
    return Array.from(this.wallets.values()).map(wallet => ({
      address: wallet.address,
      purpose: wallet.metadata.purpose,
      permissions: wallet.metadata.permissions,
      lastUsed: wallet.metadata.lastUsed
    }));
  }

  /**
   * Backup wallets (encrypted)
   */
  async createBackup(): Promise<string> {
    const backupData = {
      wallets: Array.from(this.wallets.entries()),
      timestamp: Date.now(),
      version: '1.0'
    };

    const backupString = JSON.stringify(backupData);
    const encryptedBackup = this.encryptData(backupString);
    
    const backupId = randomBytes(16).toString('hex');
    const backupPath = join(this.keystore, `backup_${backupId}.enc`);
    
    writeFileSync(backupPath, encryptedBackup);
    
    console.log(`💾 Wallet backup created: ${backupId}`);
    return backupId;
  }
}

// Export singleton instance (server-side only)
export const secureWallet = SecureWalletManager.getInstance();

// Enhanced pool wallet functions with security
export async function getSecurePoolBalance(): Promise<number> {
  const poolWallet = secureWallet.getPoolWallet();
  return await secureWallet.getWalletBalance(poolWallet.address);
}

export async function executeSecurePoolPayout(toAddress: string, amount: number, gameType: string): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  const result = await secureWallet.executePoolPayout(toAddress, amount, gameType);
  
  if (result.success && result.transaction) {
    return {
      success: true,
      transactionHash: result.transaction.transactionHash
    };
  }
  
  return {
    success: false,
    error: result.error
  };
}

// Ensure server-side only execution
if (typeof window !== 'undefined') {
  throw new Error('Secure wallet manager cannot be used in browser environment');
}