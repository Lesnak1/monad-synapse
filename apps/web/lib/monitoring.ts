/**
 * Production Monitoring and Error Tracking System
 * Comprehensive logging, alerting, and observability for production environment
 */

import { performanceMonitor } from './performance';

// Error levels for classification
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info', 
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  category: string;
  metadata?: Record<string, any>;
  stack?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (logs: LogEntry[]) => boolean;
  threshold: number;
  timeWindow: number; // milliseconds
  enabled: boolean;
  cooldown: number; // milliseconds between alerts
}

export class MonitoringSystem {
  private static instance: MonitoringSystem;
  private logs: LogEntry[] = [];
  private alertRules: AlertRule[] = [];
  private lastAlerts: Map<string, number> = new Map();
  private readonly maxLogs = 50000; // Keep last 50k logs in memory

  constructor() {
    this.initializeDefaultAlertRules();
    this.startCleanupInterval();
  }

  static getInstance(): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem();
    }
    return MonitoringSystem.instance;
  }

  /**
   * Log a message with context
   */
  log(
    level: LogLevel,
    message: string,
    category: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      category,
      metadata: {
        ...metadata,
        userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location?.href : undefined,
      },
      stack: error?.stack
    };

    // Add to in-memory storage
    this.logs.push(entry);
    
    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === LogLevel.ERROR || level === LogLevel.CRITICAL ? 'error' :
                       level === LogLevel.WARN ? 'warn' :
                       level === LogLevel.INFO ? 'info' : 'debug';
      
      console[logMethod](`[${level.toUpperCase()}] ${category}: ${message}`, metadata || '');
    }

    // Check alert rules
    this.checkAlertRules();

    // In production, send to external logging service
    this.sendToExternalLogging(entry);
  }

  /**
   * Log different severity levels
   */
  debug(message: string, category: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, category, metadata);
  }

  info(message: string, category: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, category, metadata);
  }

  warn(message: string, category: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, category, metadata);
  }

  error(message: string, category: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, category, metadata, error);
  }

  critical(message: string, category: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.CRITICAL, message, category, metadata, error);
    
    // Critical errors trigger immediate alerts
    this.triggerImmediateAlert({
      type: 'critical_error',
      message,
      category,
      timestamp: Date.now(),
      error: error?.message,
      stack: error?.stack
    });
  }

  /**
   * Track business events
   */
  trackEvent(eventName: string, properties?: Record<string, any>): void {
    this.info(`Event: ${eventName}`, 'analytics', {
      event: eventName,
      properties,
      timestamp: Date.now()
    });

    // Record performance metric
    performanceMonitor.incrementCounter(`event_${eventName}`);
  }

  /**
   * Track user actions
   */
  trackUserAction(userId: string, action: string, metadata?: Record<string, any>): void {
    this.info(`User action: ${action}`, 'user_behavior', {
      userId,
      action,
      ...metadata
    });
  }

  /**
   * Track API calls and responses
   */
  trackApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    error?: string
  ): void {
    const level = statusCode >= 500 ? LogLevel.ERROR :
                 statusCode >= 400 ? LogLevel.WARN :
                 LogLevel.INFO;

    this.log(level, `API ${method} ${endpoint} - ${statusCode}`, 'api', {
      endpoint,
      method,
      statusCode,
      responseTime,
      userId,
      error
    });
  }

  /**
   * Track game events
   */
  trackGameEvent(
    gameType: string,
    event: string,
    playerAddress: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`Game event: ${gameType} ${event}`, 'game', {
      gameType,
      event,
      playerAddress: playerAddress.slice(0, 6) + '...' + playerAddress.slice(-4),
      ...metadata
    });
  }

  /**
   * Track security events
   */
  trackSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', details?: Record<string, any>): void {
    const level = severity === 'high' ? LogLevel.ERROR :
                 severity === 'medium' ? LogLevel.WARN :
                 LogLevel.INFO;

    this.log(level, `Security event: ${event}`, 'security', {
      severity,
      ...details
    });

    // High severity security events trigger alerts
    if (severity === 'high') {
      this.triggerImmediateAlert({
        type: 'security_incident',
        event,
        severity,
        timestamp: Date.now(),
        details
      });
    }
  }

  /**
   * Get logs with filtering
   */
  getLogs(
    level?: LogLevel,
    category?: string,
    limit: number = 100,
    timeWindow?: number
  ): LogEntry[] {
    let filtered = [...this.logs];

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      filtered = filtered.filter(log => log.timestamp > cutoff);
    }

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }

    return filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindow: number = 60 * 60 * 1000): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    trending: Array<{ hour: number; count: number }>;
  } {
    const cutoff = Date.now() - timeWindow;
    const errors = this.logs.filter(log => 
      log.timestamp > cutoff && 
      (log.level === LogLevel.ERROR || log.level === LogLevel.CRITICAL)
    );

    const byLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.CRITICAL]: 0
    };

    const byCategory: Record<string, number> = {};
    const hourlyTrends: Record<number, number> = {};

    errors.forEach(error => {
      byLevel[error.level]++;
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      
      const hour = Math.floor(error.timestamp / (60 * 60 * 1000));
      hourlyTrends[hour] = (hourlyTrends[hour] || 0) + 1;
    });

    const trending = Object.entries(hourlyTrends)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.hour - a.hour)
      .slice(0, 24);

    return {
      total: errors.length,
      byLevel,
      byCategory,
      trending
    };
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: (logs) => {
          const last5Min = logs.filter(log => 
            Date.now() - log.timestamp < 5 * 60 * 1000 &&
            (log.level === LogLevel.ERROR || log.level === LogLevel.CRITICAL)
          );
          return last5Min.length > 10;
        },
        threshold: 10,
        timeWindow: 5 * 60 * 1000,
        enabled: true,
        cooldown: 15 * 60 * 1000 // 15 minutes
      },
      {
        id: 'critical_errors',
        name: 'Critical Errors',
        condition: (logs) => {
          return logs.some(log => 
            log.level === LogLevel.CRITICAL &&
            Date.now() - log.timestamp < 60 * 1000 // Last minute
          );
        },
        threshold: 1,
        timeWindow: 60 * 1000,
        enabled: true,
        cooldown: 5 * 60 * 1000 // 5 minutes
      },
      {
        id: 'api_failures',
        name: 'API Failures',
        condition: (logs) => {
          const apiErrors = logs.filter(log =>
            log.category === 'api' &&
            log.level === LogLevel.ERROR &&
            Date.now() - log.timestamp < 10 * 60 * 1000
          );
          return apiErrors.length > 20;
        },
        threshold: 20,
        timeWindow: 10 * 60 * 1000,
        enabled: true,
        cooldown: 10 * 60 * 1000
      }
    ];
  }

  /**
   * Check alert rules and trigger alerts
   */
  private checkAlertRules(): void {
    this.alertRules
      .filter(rule => rule.enabled)
      .forEach(rule => {
        const lastAlert = this.lastAlerts.get(rule.id) || 0;
        const now = Date.now();
        
        // Check cooldown
        if (now - lastAlert < rule.cooldown) {
          return;
        }
        
        // Check condition
        const recentLogs = this.logs.filter(log => 
          now - log.timestamp < rule.timeWindow
        );
        
        if (rule.condition(recentLogs)) {
          this.triggerAlert(rule, recentLogs);
          this.lastAlerts.set(rule.id, now);
        }
      });
  }

  /**
   * Trigger alert
   */
  private triggerAlert(rule: AlertRule, triggeredLogs: LogEntry[]): void {
    const alertData = {
      rule: rule.name,
      ruleId: rule.id,
      timestamp: Date.now(),
      triggeredBy: triggeredLogs.slice(0, 5), // Include first 5 logs
      count: triggeredLogs.length
    };

    // Log the alert
    this.warn(`Alert triggered: ${rule.name}`, 'monitoring', alertData);

    // In production, send to alerting systems
    this.sendAlert(alertData);
  }

  /**
   * Trigger immediate alert for critical events
   */
  private triggerImmediateAlert(data: Record<string, any>): void {
    // Log the immediate alert
    this.error('Immediate alert triggered', 'monitoring', undefined, data);
    
    // Send to alerting systems
    this.sendAlert({
      type: 'immediate',
      ...data
    });
  }

  /**
   * Send alert to external systems
   */
  private sendAlert(data: Record<string, any>): void {
    // In production, integrate with:
    // - Discord/Slack webhooks
    // - PagerDuty
    // - Email notifications
    // - SMS alerts
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('🚨 ALERT:', data);
    }
    
    // Example webhook integration (commented out)
    /*
    if (process.env.DISCORD_WEBHOOK_URL) {
      fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **Alert**: ${data.rule || data.type}`,
          embeds: [{
            title: 'System Alert',
            description: JSON.stringify(data, null, 2),
            color: 0xff0000,
            timestamp: new Date().toISOString()
          }]
        })
      }).catch(console.error);
    }
    */
  }

  /**
   * Send logs to external logging service
   */
  private sendToExternalLogging(entry: LogEntry): void {
    // In production, integrate with:
    // - Datadog
    // - New Relic
    // - Sentry
    // - CloudWatch
    // - Custom logging service
    
    // Example implementation (commented out)
    /*
    if (process.env.LOG_ENDPOINT) {
      fetch(process.env.LOG_ENDPOINT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LOG_API_KEY}`
        },
        body: JSON.stringify({
          ...entry,
          service: 'monad-synapse-casino',
          environment: process.env.NODE_ENV,
          version: process.env.APP_VERSION || '1.0.0'
        })
      }).catch(() => {
        // Fail silently to avoid recursive logging
      });
    }
    */
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up old logs every hour
    setInterval(() => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      this.logs = this.logs.filter(log => log.timestamp > oneHourAgo);
      
      // Clean up old alert timestamps
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      for (const [ruleId, timestamp] of this.lastAlerts.entries()) {
        if (timestamp < oneDayAgo) {
          this.lastAlerts.delete(ruleId);
        }
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Generate monitoring report
   */
  generateReport(timeWindow: number = 24 * 60 * 60 * 1000): {
    summary: {
      totalLogs: number;
      errorCount: number;
      criticalCount: number;
      alertsTriggered: number;
    };
    topErrors: Array<{ message: string; count: number; category: string }>;
    categoryBreakdown: Record<string, number>;
    timelineData: Array<{ timestamp: number; level: LogLevel; category: string }>;
  } {
    const cutoff = Date.now() - timeWindow;
    const relevantLogs = this.logs.filter(log => log.timestamp > cutoff);
    
    const errorCount = relevantLogs.filter(log => log.level === LogLevel.ERROR).length;
    const criticalCount = relevantLogs.filter(log => log.level === LogLevel.CRITICAL).length;
    const alertsTriggered = relevantLogs.filter(log => 
      log.category === 'monitoring' && log.message.includes('Alert triggered')
    ).length;

    // Count messages for top errors
    const errorMessages: Record<string, { count: number; category: string }> = {};
    relevantLogs
      .filter(log => log.level === LogLevel.ERROR || log.level === LogLevel.CRITICAL)
      .forEach(log => {
        const key = log.message.substring(0, 100); // Truncate for grouping
        if (!errorMessages[key]) {
          errorMessages[key] = { count: 0, category: log.category };
        }
        errorMessages[key].count++;
      });

    const topErrors = Object.entries(errorMessages)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10)
      .map(([message, data]) => ({
        message,
        count: data.count,
        category: data.category
      }));

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    relevantLogs.forEach(log => {
      categoryBreakdown[log.category] = (categoryBreakdown[log.category] || 0) + 1;
    });

    return {
      summary: {
        totalLogs: relevantLogs.length,
        errorCount,
        criticalCount,
        alertsTriggered
      },
      topErrors,
      categoryBreakdown,
      timelineData: relevantLogs.slice(0, 1000).map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        category: log.category
      }))
    };
  }

  /**
   * Clear all logs (for testing/maintenance)
   */
  clearLogs(): void {
    this.logs = [];
    this.lastAlerts.clear();
  }
}

// Export singleton instance
export const monitoring = MonitoringSystem.getInstance();

// Convenience functions
export const logDebug = (message: string, category: string, metadata?: Record<string, any>) =>
  monitoring.debug(message, category, metadata);

export const logInfo = (message: string, category: string, metadata?: Record<string, any>) =>
  monitoring.info(message, category, metadata);

export const logWarn = (message: string, category: string, metadata?: Record<string, any>) =>
  monitoring.warn(message, category, metadata);

export const logError = (message: string, category: string, error?: Error, metadata?: Record<string, any>) =>
  monitoring.error(message, category, error, metadata);

export const logCritical = (message: string, category: string, error?: Error, metadata?: Record<string, any>) =>
  monitoring.critical(message, category, error, metadata);

export const trackEvent = (eventName: string, properties?: Record<string, any>) =>
  monitoring.trackEvent(eventName, properties);

export const trackUserAction = (userId: string, action: string, metadata?: Record<string, any>) =>
  monitoring.trackUserAction(userId, action, metadata);

export const trackGameEvent = (gameType: string, event: string, playerAddress: string, metadata?: Record<string, any>) =>
  monitoring.trackGameEvent(gameType, event, playerAddress, metadata);

export const trackSecurityEvent = (event: string, severity: 'low' | 'medium' | 'high', details?: Record<string, any>) =>
  monitoring.trackSecurityEvent(event, severity, details);