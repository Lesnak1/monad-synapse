/**
 * Database Integration for Transaction Tracking
 * Secure database operations for casino transactions and audit trails
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
// Web Crypto API helper for Edge Runtime compatibility
async function createHash(algorithm: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
import { logger } from './logger';

export interface GameTransaction {
  id: string;
  playerAddress: string;
  gameType: string;
  betAmount: number;
  winAmount: number;
  isWin: boolean;
  gameResult: any;
  proof: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    gameHash: string;
  };
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  blockNumber?: number;
  transactionHash?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  };
}

export interface PayoutTransaction {
  id: string;
  playerAddress: string;
  amount: number;
  gameType: string;
  gameTransactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  transactionHash?: string;
  blockNumber?: number;
  timestamp: number;
  retryCount: number;
  lastRetry?: number;
  failureReason?: string;
  partialAmount?: number;
  metadata?: {
    poolBalance?: number;
    gasUsed?: number;
    confirmation?: number;
  };
}

export interface AuditLog {
  id: string;
  event: string;
  category: 'game' | 'payout' | 'auth' | 'security' | 'admin';
  severity: 'info' | 'warn' | 'error' | 'critical';
  description: string;
  playerAddress?: string;
  ipAddress?: string;
  userAgent?: string;
  data?: any;
  timestamp: number;
}

export interface UserSession {
  id: string;
  playerAddress: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  gamesPlayed: string[];
}

export class CasinoDatabase {
  private static instance: CasinoDatabase;
  private dbPath: string;
  private gameTransactions: Map<string, GameTransaction> = new Map();
  private payoutTransactions: Map<string, PayoutTransaction> = new Map();
  private auditLogs: AuditLog[] = [];
  private userSessions: Map<string, UserSession> = new Map();

  constructor() {
    // Production-safe database path
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      // In Vercel, use /tmp for temporary storage
      this.dbPath = process.env.DATABASE_PATH || '/tmp/casino-data';
      console.log('💾 Production database path:', this.dbPath);
    } else {
      this.dbPath = process.env.DATABASE_PATH || './data';
    }
    
    this.initializeDatabase().catch(error => {
      console.error('Database initialization failed:', error);
    });
  }

  static getInstance(): CasinoDatabase {
    if (!CasinoDatabase.instance) {
      CasinoDatabase.instance = new CasinoDatabase();
    }
    return CasinoDatabase.instance;
  }

  private async initializeDatabase(): Promise<void> {
    if (typeof window !== 'undefined') {
      throw new Error('Database can only be used server-side');
    }

    try {
      if (!existsSync(this.dbPath)) {
        mkdirSync(this.dbPath, { recursive: true });
      }

      await this.loadData();
      logger.info('Database initialized successfully', 'database');
    } catch (error) {
      logger.error('Failed to initialize database', 'database', error);
      throw error;
    }
  }

  // Game Transaction Methods
  async createGameTransaction(transaction: Omit<GameTransaction, 'id' | 'timestamp' | 'status'>): Promise<GameTransaction> {
    const gameTransaction: GameTransaction = {
      ...transaction,
      id: this.generateId('game'),
      timestamp: Date.now(),
      status: 'pending'
    };

    this.gameTransactions.set(gameTransaction.id, gameTransaction);
    await this.saveGameTransactions();

    logger.info('Game transaction created', 'database', { 
      transactionId: gameTransaction.id,
      gameType: transaction.gameType,
      playerAddress: transaction.playerAddress,
      betAmount: transaction.betAmount,
      winAmount: transaction.winAmount
    });

    return gameTransaction;
  }

  async updateGameTransaction(id: string, updates: Partial<GameTransaction>): Promise<GameTransaction | null> {
    const transaction = this.gameTransactions.get(id);
    if (!transaction) {
      logger.error(`Game transaction not found: ${id}`, 'database');
      return null;
    }

    const updatedTransaction = { ...transaction, ...updates };
    this.gameTransactions.set(id, updatedTransaction);
    await this.saveGameTransactions();

    logger.info('Game transaction updated', 'database', { 
      transactionId: id, 
      gameType: transaction.gameType,
      playerAddress: transaction.playerAddress,
      updates 
    });

    return updatedTransaction;
  }

  async getGameTransaction(id: string): Promise<GameTransaction | null> {
    return this.gameTransactions.get(id) || null;
  }

  async getGameTransactionsByPlayer(playerAddress: string, limit: number = 50): Promise<GameTransaction[]> {
    const transactions = Array.from(this.gameTransactions.values())
      .filter(tx => tx.playerAddress.toLowerCase() === playerAddress.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return transactions;
  }

  // Payout Transaction Methods
  async createPayoutTransaction(transaction: Omit<PayoutTransaction, 'id' | 'timestamp' | 'retryCount'>): Promise<PayoutTransaction> {
    const payoutTransaction: PayoutTransaction = {
      ...transaction,
      id: this.generateId('payout'),
      timestamp: Date.now(),
      retryCount: 0
    };

    this.payoutTransactions.set(payoutTransaction.id, payoutTransaction);
    await this.savePayoutTransactions();

    logger.info('Payout transaction created', 'database', { 
      payoutId: payoutTransaction.id,
      gameType: transaction.gameType,
      playerAddress: transaction.playerAddress,
      amount: transaction.amount,
      status: transaction.status
    });

    return payoutTransaction;
  }

  async updatePayoutTransaction(id: string, updates: Partial<PayoutTransaction>): Promise<PayoutTransaction | null> {
    const transaction = this.payoutTransactions.get(id);
    if (!transaction) {
      logger.error(`Payout transaction not found: ${id}`, 'database');
      return null;
    }

    const updatedTransaction = { ...transaction, ...updates };
    this.payoutTransactions.set(id, updatedTransaction);
    await this.savePayoutTransactions();

    logger.info('Payout transaction updated', 'database', { 
      payoutId: id,
      gameType: transaction.gameType,
      playerAddress: transaction.playerAddress,
      amount: transaction.amount,
      updates 
    });

    return updatedTransaction;
  }

  async getPayoutTransaction(id: string): Promise<PayoutTransaction | null> {
    return this.payoutTransactions.get(id) || null;
  }

  async getPendingPayouts(): Promise<PayoutTransaction[]> {
    return Array.from(this.payoutTransactions.values())
      .filter(tx => tx.status === 'pending' || tx.status === 'processing')
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async getFailedPayouts(): Promise<PayoutTransaction[]> {
    return Array.from(this.payoutTransactions.values())
      .filter(tx => tx.status === 'failed')
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Audit Log Methods
  async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const auditLog: AuditLog = {
      ...log,
      id: this.generateId('audit'),
      timestamp: Date.now()
    };

    this.auditLogs.push(auditLog);
    
    // Keep only last 10000 audit logs to prevent memory issues
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    await this.saveAuditLogs();

    if (log.severity === 'critical' || log.severity === 'error') {
      logger.error(`Audit: ${log.description}`, log.category, log.data);
    }

    return auditLog;
  }

  async getAuditLogs(filters?: {
    category?: string;
    severity?: string;
    playerAddress?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<AuditLog[]> {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.category) {
        logs = logs.filter(log => log.category === filters.category);
      }
      if (filters.severity) {
        logs = logs.filter(log => log.severity === filters.severity);
      }
      if (filters.playerAddress) {
        logs = logs.filter(log => log.playerAddress?.toLowerCase() === filters.playerAddress?.toLowerCase());
      }
      if (filters.startTime) {
        logs = logs.filter(log => log.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        logs = logs.filter(log => log.timestamp <= filters.endTime!);
      }
    }

    logs.sort((a, b) => b.timestamp - a.timestamp);
    
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  // User Session Methods
  async createUserSession(session: Omit<UserSession, 'id' | 'createdAt' | 'lastActivity' | 'totalBets' | 'totalWagered' | 'totalWon' | 'gamesPlayed'>): Promise<UserSession> {
    const userSession: UserSession = {
      ...session,
      id: this.generateId('session'),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      totalBets: 0,
      totalWagered: 0,
      totalWon: 0,
      gamesPlayed: []
    };

    this.userSessions.set(userSession.id, userSession);
    await this.saveUserSessions();

    logger.info('User session created', 'database', { 
      playerAddress: session.playerAddress, 
      sessionId: userSession.id 
    });

    return userSession;
  }

  async updateUserSession(id: string, updates: Partial<UserSession>): Promise<UserSession | null> {
    const session = this.userSessions.get(id);
    if (!session) {
      return null;
    }

    const updatedSession = { 
      ...session, 
      ...updates,
      lastActivity: Date.now()
    };
    
    this.userSessions.set(id, updatedSession);
    await this.saveUserSessions();

    return updatedSession;
  }

  async getUserSession(id: string): Promise<UserSession | null> {
    return this.userSessions.get(id) || null;
  }

  async getActiveUserSessions(): Promise<UserSession[]> {
    const now = Date.now();
    return Array.from(this.userSessions.values())
      .filter(session => session.isActive && session.expiresAt > now);
  }

  async expireUserSession(id: string): Promise<boolean> {
    const session = this.userSessions.get(id);
    if (!session) {
      return false;
    }

    session.isActive = false;
    this.userSessions.set(id, session);
    await this.saveUserSessions();

    logger.info('User session expired', 'database', { 
      playerAddress: session.playerAddress, 
      sessionId: id 
    });
    return true;
  }

  // Analytics and Reporting Methods
  async getPlayerStats(playerAddress: string): Promise<{
    totalGames: number;
    totalWagered: number;
    totalWon: number;
    netResult: number;
    favoriteGame: string;
    winRate: number;
    lastActivity: number;
  }> {
    const transactions = await this.getGameTransactionsByPlayer(playerAddress);
    
    if (transactions.length === 0) {
      return {
        totalGames: 0,
        totalWagered: 0,
        totalWon: 0,
        netResult: 0,
        favoriteGame: 'none',
        winRate: 0,
        lastActivity: 0
      };
    }

    const totalWagered = transactions.reduce((sum, tx) => sum + tx.betAmount, 0);
    const totalWon = transactions.reduce((sum, tx) => sum + tx.winAmount, 0);
    const wins = transactions.filter(tx => tx.isWin).length;
    
    const gameTypeCounts: { [key: string]: number } = {};
    transactions.forEach(tx => {
      gameTypeCounts[tx.gameType] = (gameTypeCounts[tx.gameType] || 0) + 1;
    });
    
    const favoriteGame = Object.entries(gameTypeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    return {
      totalGames: transactions.length,
      totalWagered,
      totalWon,
      netResult: totalWon - totalWagered,
      favoriteGame,
      winRate: transactions.length > 0 ? (wins / transactions.length) * 100 : 0,
      lastActivity: Math.max(...transactions.map(tx => tx.timestamp))
    };
  }

  async getGameStats(gameType: string, timeframe: number = 24 * 60 * 60 * 1000): Promise<{
    totalGames: number;
    totalWagered: number;
    totalWon: number;
    houseEdge: number;
    uniquePlayers: number;
    averageBet: number;
  }> {
    const cutoff = Date.now() - timeframe;
    const transactions = Array.from(this.gameTransactions.values())
      .filter(tx => tx.gameType === gameType && tx.timestamp > cutoff);

    if (transactions.length === 0) {
      return {
        totalGames: 0,
        totalWagered: 0,
        totalWon: 0,
        houseEdge: 0,
        uniquePlayers: 0,
        averageBet: 0
      };
    }

    const totalWagered = transactions.reduce((sum, tx) => sum + tx.betAmount, 0);
    const totalWon = transactions.reduce((sum, tx) => sum + tx.winAmount, 0);
    const uniquePlayers = new Set(transactions.map(tx => tx.playerAddress)).size;

    return {
      totalGames: transactions.length,
      totalWagered,
      totalWon,
      houseEdge: ((totalWagered - totalWon) / totalWagered) * 100,
      uniquePlayers,
      averageBet: totalWagered / transactions.length
    };
  }

  // Utility Methods
  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  private async saveGameTransactions(): Promise<void> {
    try {
      const data = JSON.stringify(Array.from(this.gameTransactions.entries()));
      const hash = await createHash('sha256', data);
      writeFileSync(join(this.dbPath, 'game_transactions.json'), data);
      writeFileSync(join(this.dbPath, 'game_transactions.hash'), hash);
    } catch (error) {
      logger.error('Failed to save game transactions', 'database', error);
    }
  }

  private async savePayoutTransactions(): Promise<void> {
    try {
      const data = JSON.stringify(Array.from(this.payoutTransactions.entries()));
      const hash = await createHash('sha256', data);
      writeFileSync(join(this.dbPath, 'payout_transactions.json'), data);
      writeFileSync(join(this.dbPath, 'payout_transactions.hash'), hash);
    } catch (error) {
      logger.error('Failed to save payout transactions', 'database', error);
    }
  }

  private async saveAuditLogs(): Promise<void> {
    try {
      const data = JSON.stringify(this.auditLogs);
      const hash = await createHash('sha256', data);
      writeFileSync(join(this.dbPath, 'audit_logs.json'), data);
      writeFileSync(join(this.dbPath, 'audit_logs.hash'), hash);
    } catch (error) {
      logger.error('Failed to save audit logs', 'database', error);
    }
  }

  private async saveUserSessions(): Promise<void> {
    try {
      const data = JSON.stringify(Array.from(this.userSessions.entries()));
      const hash = await createHash('sha256', data);
      writeFileSync(join(this.dbPath, 'user_sessions.json'), data);
      writeFileSync(join(this.dbPath, 'user_sessions.hash'), hash);
    } catch (error) {
      logger.error('Failed to save user sessions', 'database', error);
    }
  }

  private async loadData(): Promise<void> {
    try {
      await this.loadGameTransactions();
      await this.loadPayoutTransactions();
      await this.loadAuditLogs();
      await this.loadUserSessions();
    } catch (error) {
      logger.error('Failed to load database data', 'database', error);
    }
  }

  private async loadGameTransactions(): Promise<void> {
    const filePath = join(this.dbPath, 'game_transactions.json');
    const hashPath = join(this.dbPath, 'game_transactions.hash');
    
    if (existsSync(filePath) && existsSync(hashPath)) {
      try {
        const data = readFileSync(filePath, 'utf-8');
        const expectedHash = readFileSync(hashPath, 'utf-8');
        const actualHash = await createHash('sha256', data);
        
        if (expectedHash === actualHash) {
          const entries = JSON.parse(data);
          this.gameTransactions = new Map(entries);
          logger.info(`Loaded ${this.gameTransactions.size} game transactions`, 'database');
        } else {
          logger.error('Game transactions file integrity check failed', 'database');
        }
      } catch (error) {
        logger.error('Failed to load game transactions', 'database', error);
      }
    }
  }

  private async loadPayoutTransactions(): Promise<void> {
    const filePath = join(this.dbPath, 'payout_transactions.json');
    const hashPath = join(this.dbPath, 'payout_transactions.hash');
    
    if (existsSync(filePath) && existsSync(hashPath)) {
      try {
        const data = readFileSync(filePath, 'utf-8');
        const expectedHash = readFileSync(hashPath, 'utf-8');
        const actualHash = await createHash('sha256', data);
        
        if (expectedHash === actualHash) {
          const entries = JSON.parse(data);
          this.payoutTransactions = new Map(entries);
          logger.info(`Loaded ${this.payoutTransactions.size} payout transactions`, 'database');
        } else {
          logger.error('Payout transactions file integrity check failed', 'database');
        }
      } catch (error) {
        logger.error('Failed to load payout transactions', 'database', error);
      }
    }
  }

  private async loadAuditLogs(): Promise<void> {
    const filePath = join(this.dbPath, 'audit_logs.json');
    const hashPath = join(this.dbPath, 'audit_logs.hash');
    
    if (existsSync(filePath) && existsSync(hashPath)) {
      try {
        const data = readFileSync(filePath, 'utf-8');
        const expectedHash = readFileSync(hashPath, 'utf-8');
        const actualHash = await createHash('sha256', data);
        
        if (expectedHash === actualHash) {
          this.auditLogs = JSON.parse(data);
          logger.info(`Loaded ${this.auditLogs.length} audit logs`, 'database');
        } else {
          logger.error('Audit logs file integrity check failed', 'database');
        }
      } catch (error) {
        logger.error('Failed to load audit logs', 'database', error);
      }
    }
  }

  private async loadUserSessions(): Promise<void> {
    const filePath = join(this.dbPath, 'user_sessions.json');
    const hashPath = join(this.dbPath, 'user_sessions.hash');
    
    if (existsSync(filePath) && existsSync(hashPath)) {
      try {
        const data = readFileSync(filePath, 'utf-8');
        const expectedHash = readFileSync(hashPath, 'utf-8');
        const actualHash = await createHash('sha256', data);
        
        if (expectedHash === actualHash) {
          const entries = JSON.parse(data);
          this.userSessions = new Map(entries);
          logger.info(`Loaded ${this.userSessions.size} user sessions`, 'database');
        } else {
          logger.error('User sessions file integrity check failed', 'database');
        }
      } catch (error) {
        logger.error('Failed to load user sessions', 'database', error);
      }
    }
  }

  // Cleanup and maintenance
  async cleanup(): Promise<void> {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Clean up expired sessions
    let expiredSessions = 0;
    for (const [id, session] of this.userSessions.entries()) {
      if (!session.isActive || session.expiresAt < now) {
        this.userSessions.delete(id);
        expiredSessions++;
      }
    }
    
    // Clean up old audit logs (keep only last 10000)
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }
    
    if (expiredSessions > 0) {
      await this.saveUserSessions();
      logger.info(`Cleaned up ${expiredSessions} expired sessions`, 'database');
    }
    
    await this.saveAuditLogs();
  }
}

// Export singleton instance getter function to avoid build-time initialization
export function getCasinoDb(): CasinoDatabase {
  return CasinoDatabase.getInstance();
}

// Legacy export for compatibility
export const casinoDb = {
  getInstance: () => CasinoDatabase.getInstance(),
  createGameTransaction: (transaction: any) => getCasinoDb().createGameTransaction(transaction),
  updateGameTransaction: (id: string, updates: any) => getCasinoDb().updateGameTransaction(id, updates),
  getGameTransaction: (id: string) => getCasinoDb().getGameTransaction(id),
  getGameTransactionsByPlayer: (playerAddress: string, limit?: number) => getCasinoDb().getGameTransactionsByPlayer(playerAddress, limit),
  createPayoutTransaction: (transaction: any) => getCasinoDb().createPayoutTransaction(transaction),
  updatePayoutTransaction: (id: string, updates: any) => getCasinoDb().updatePayoutTransaction(id, updates),
  getPayoutTransaction: (id: string) => getCasinoDb().getPayoutTransaction(id),
  getPendingPayouts: () => getCasinoDb().getPendingPayouts(),
  getFailedPayouts: () => getCasinoDb().getFailedPayouts(),
  addAuditLog: (log: any) => getCasinoDb().addAuditLog(log),
  getAuditLogs: (filters?: any) => getCasinoDb().getAuditLogs(filters),
  createUserSession: (session: any) => getCasinoDb().createUserSession(session),
  updateUserSession: (id: string, updates: any) => getCasinoDb().updateUserSession(id, updates),
  getUserSession: (id: string) => getCasinoDb().getUserSession(id),
  getActiveUserSessions: () => getCasinoDb().getActiveUserSessions(),
  expireUserSession: (id: string) => getCasinoDb().expireUserSession(id),
  getPlayerStats: (playerAddress: string) => getCasinoDb().getPlayerStats(playerAddress),
  getGameStats: (gameType: string, timeframe?: number) => getCasinoDb().getGameStats(gameType, timeframe),
  cleanup: () => getCasinoDb().cleanup()
};

// Auto-cleanup every hour
if (typeof window === 'undefined') {
  setInterval(() => {
    getCasinoDb().cleanup();
  }, 60 * 60 * 1000);
}