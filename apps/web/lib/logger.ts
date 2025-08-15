/**
 * Comprehensive Logging System
 * Structured logging with different levels and secure error handling
 */

import { writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  category: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stack?: string;
  metadata?: {
    userAgent?: string;
    ip?: string;
    gameType?: string;
    amount?: number;
    address?: string;
  };
}

export interface SecurityEvent {
  type: 'authentication_failure' | 'authorization_failure' | 'rate_limit_exceeded' | 'suspicious_activity' | 'pool_balance_critical' | 'transaction_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userAddress?: string;
  ipAddress?: string;
  timestamp: number;
  data?: any;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logDirectory: string;
  private securityEvents: SecurityEvent[] = [];

  constructor() {
    this.logDirectory = process.env.LOG_DIRECTORY || './logs';
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'INFO');
    this.initializeLogDirectory();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toUpperCase()) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'CRITICAL': return LogLevel.CRITICAL;
      default: return LogLevel.INFO;
    }
  }

  private initializeLogDirectory(): void {
    if (typeof window === 'undefined' && !existsSync(this.logDirectory)) {
      mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const sanitizedEntry = this.sanitizeLogEntry(entry);
    return JSON.stringify(sanitizedEntry) + '\n';
  }

  private sanitizeLogEntry(entry: LogEntry): LogEntry {
    // Remove sensitive information from logs
    const sanitized = { ...entry };
    
    if (sanitized.data) {
      sanitized.data = this.sanitizeSensitiveData(sanitized.data);
    }
    
    if (sanitized.metadata) {
      // Remove sensitive metadata
      const { ...safeMetadata } = sanitized.metadata;
      if (safeMetadata.address) {
        safeMetadata.address = this.maskAddress(safeMetadata.address);
      }
      sanitized.metadata = safeMetadata;
    }

    return sanitized;
  }

  private sanitizeSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = ['privateKey', 'password', 'secret', 'token', 'signature', 'seed'];
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeSensitiveData(sanitized[key]);
      }
    }

    return sanitized;
  }

  private maskAddress(address: string): string {
    if (address.length > 10) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return address;
  }

  private writeToFile(entry: LogEntry): void {
    if (typeof window !== 'undefined') return; // Browser environment

    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = join(this.logDirectory, `casino-${date}.log`);
      const formatted = this.formatLogEntry(entry);
      
      appendFileSync(filename, formatted, 'utf8');
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  public log(level: LogLevel, message: string, category: string, data?: any, metadata?: LogEntry['metadata']): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      category,
      data,
      metadata,
      ...(level >= LogLevel.ERROR && data?.stack ? { stack: data.stack } : {})
    };

    // Console output with colors
    this.writeToConsole(entry);
    
    // File output (server-side only)
    this.writeToFile(entry);

    // Security monitoring
    if (level >= LogLevel.ERROR) {
      this.handleSecurityEvent(entry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.CRITICAL]: '\x1b[35m' // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[entry.level] || '';
    const levelName = LogLevel[entry.level];

    console.log(
      `${color}[${entry.timestamp}] ${levelName} [${entry.category}]${reset} ${entry.message}`,
      entry.data ? entry.data : ''
    );
  }

  private handleSecurityEvent(entry: LogEntry): void {
    // Determine if this is a security-relevant event
    const securityCategories = ['auth', 'security', 'payment', 'game', 'pool'];
    
    if (securityCategories.some(cat => entry.category.includes(cat))) {
      const securityEvent: SecurityEvent = {
        type: this.categorizeSecurityEvent(entry),
        severity: entry.level >= LogLevel.CRITICAL ? 'critical' : 
                 entry.level >= LogLevel.ERROR ? 'high' : 'medium',
        description: entry.message,
        userAddress: entry.metadata?.address,
        ipAddress: entry.metadata?.ip,
        timestamp: Date.now(),
        data: entry.data
      };

      this.securityEvents.push(securityEvent);
      
      // Alert for critical events
      if (securityEvent.severity === 'critical') {
        this.alertCriticalEvent(securityEvent);
      }
    }
  }

  private categorizeSecurityEvent(entry: LogEntry): SecurityEvent['type'] {
    const message = entry.message.toLowerCase();
    
    if (message.includes('authentication')) return 'authentication_failure';
    if (message.includes('authorization') || message.includes('permission')) return 'authorization_failure';
    if (message.includes('rate limit')) return 'rate_limit_exceeded';
    if (message.includes('pool') && message.includes('balance')) return 'pool_balance_critical';
    if (message.includes('transaction') && message.includes('failed')) return 'transaction_failure';
    
    return 'suspicious_activity';
  }

  private alertCriticalEvent(event: SecurityEvent): void {
    // In production, this would send alerts via:
    // - Email notifications
    // - Slack/Discord webhooks
    // - SMS alerts
    // - Monitoring dashboards
    
    console.error('🚨 CRITICAL SECURITY EVENT:', {
      type: event.type,
      description: event.description,
      timestamp: new Date(event.timestamp).toISOString(),
      userAddress: event.userAddress,
      ipAddress: event.ipAddress
    });
  }

  // Convenience methods
  public debug(message: string, category: string = 'general', data?: any, metadata?: LogEntry['metadata']): void {
    this.log(LogLevel.DEBUG, message, category, data, metadata);
  }

  public info(message: string, category: string = 'general', data?: any, metadata?: LogEntry['metadata']): void {
    this.log(LogLevel.INFO, message, category, data, metadata);
  }

  public warn(message: string, category: string = 'general', data?: any, metadata?: LogEntry['metadata']): void {
    this.log(LogLevel.WARN, message, category, data, metadata);
  }

  public error(message: string, category: string = 'general', data?: any, metadata?: LogEntry['metadata']): void {
    this.log(LogLevel.ERROR, message, category, data, metadata);
  }

  public critical(message: string, category: string = 'general', data?: any, metadata?: LogEntry['metadata']): void {
    this.log(LogLevel.CRITICAL, message, category, data, metadata);
  }

  // Specialized logging methods
  public logGameEvent(gameType: string, playerAddress: string, action: string, data?: any): void {
    this.info(`Game ${action}`, 'game', data, {
      gameType,
      address: playerAddress
    });
  }

  public logPayoutEvent(playerAddress: string, amount: number, success: boolean, data?: any): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Payout ${success ? 'successful' : 'failed'}`;
    
    this.log(level, message, 'payment', data, {
      address: playerAddress,
      amount
    });
  }

  public logSecurityViolation(violation: string, userAddress?: string, ipAddress?: string, data?: any): void {
    this.error(`Security violation: ${violation}`, 'security', data, {
      address: userAddress,
      ip: ipAddress
    });
  }

  public logPoolEvent(event: string, balance: number, data?: any): void {
    const level = event.includes('critical') ? LogLevel.CRITICAL : 
                 event.includes('low') ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, `Pool ${event}`, 'pool', data, {
      amount: balance
    });
  }

  public logAuthEvent(event: string, userAddress: string, success: boolean, data?: any): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    this.log(level, `Authentication ${event}`, 'auth', data, {
      address: userAddress
    });
  }

  // Monitoring and analytics
  public getSecurityEvents(timeframe?: number): SecurityEvent[] {
    if (!timeframe) return this.securityEvents;
    
    const cutoff = Date.now() - timeframe;
    return this.securityEvents.filter(event => event.timestamp > cutoff);
  }

  public getSecuritySummary(): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    recentEvents: SecurityEvent[];
  } {
    const events = this.getSecurityEvents(24 * 60 * 60 * 1000); // Last 24 hours
    
    return {
      total: events.length,
      critical: events.filter(e => e.severity === 'critical').length,
      high: events.filter(e => e.severity === 'high').length,
      medium: events.filter(e => e.severity === 'medium').length,
      low: events.filter(e => e.severity === 'low').length,
      recentEvents: events.slice(-10) // Last 10 events
    };
  }

  public clearOldLogs(daysToKeep: number = 30): void {
    if (typeof window !== 'undefined') return;
    
    // In production, implement log rotation and cleanup
    this.info(`Log cleanup initiated (keeping ${daysToKeep} days)`, 'system');
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience exports
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  critical: logger.critical.bind(logger),
  game: logger.logGameEvent.bind(logger),
  payout: logger.logPayoutEvent.bind(logger),
  security: logger.logSecurityViolation.bind(logger),
  pool: logger.logPoolEvent.bind(logger),
  auth: logger.logAuthEvent.bind(logger)
};

// Global error handlers
if (typeof window === 'undefined') {
  // Server-side error handlers
  process.on('uncaughtException', (error) => {
    logger.critical('Uncaught Exception', 'system', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', 'system', {
      reason,
      promise: promise.toString()
    });
  });
} else {
  // Client-side error handler
  window.addEventListener('error', (event) => {
    logger.error('Client Error', 'client', {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', 'client', {
      reason: event.reason
    });
  });
}