/**
 * Performance Monitoring and Optimization
 * Real-time performance metrics, bottleneck detection, and optimization strategies
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'api' | 'database' | 'cache' | 'game' | 'blockchain' | 'ui';
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  api: {
    responseTime: number; // milliseconds
    errorRate: number; // percentage
  };
  database: {
    queryTime: number;
    connectionPool: number;
  };
  cache: {
    hitRate: number; // percentage
    memoryUsage: number; // bytes
  };
  game: {
    processingTime: number;
    concurrentSessions: number;
  };
  blockchain: {
    transactionTime: number;
    gasUsage: number;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics: number = 10000;
  private timers: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private readonly thresholds: PerformanceThresholds;

  constructor() {
    this.thresholds = {
      api: {
        responseTime: 1000, // 1 second
        errorRate: 5 // 5%
      },
      database: {
        queryTime: 500, // 500ms
        connectionPool: 80 // 80% usage
      },
      cache: {
        hitRate: 80, // 80%
        memoryUsage: 100 * 1024 * 1024 // 100MB
      },
      game: {
        processingTime: 200, // 200ms
        concurrentSessions: 1000
      },
      blockchain: {
        transactionTime: 30000, // 30 seconds
        gasUsage: 100000 // gas units
      }
    };

    // Clean up old metrics every 10 minutes
    setInterval(() => this.cleanupMetrics(), 10 * 60 * 1000);
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End timing an operation and record metric
   */
  endTimer(
    name: string, 
    category: PerformanceMetric['category'],
    metadata?: Record<string, any>
  ): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      throw new Error(`Timer ${name} was not started`);
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.recordMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      category,
      metadata
    });

    return duration;
  }

  /**
   * Time an async operation
   */
  async timeAsync<T>(
    name: string,
    category: PerformanceMetric['category'],
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTimer(name);
    
    try {
      const result = await operation();
      this.endTimer(name, category, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.endTimer(name, category, { 
        ...metadata, 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Time a synchronous operation
   */
  timeSync<T>(
    name: string,
    category: PerformanceMetric['category'],
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    this.startTimer(name);
    
    try {
      const result = operation();
      this.endTimer(name, category, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.endTimer(name, category, { 
        ...metadata, 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Check thresholds and alert if necessary
    this.checkThresholds(metric);

    // Trim metrics if we exceed maximum
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(
    category?: PerformanceMetric['category'],
    timeWindow: number = 5 * 60 * 1000 // 5 minutes
  ): {
    count: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const now = Date.now();
    const cutoff = now - timeWindow;
    
    let relevantMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    if (category) {
      relevantMetrics = relevantMetrics.filter(m => m.category === category);
    }

    if (relevantMetrics.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    }

    const values = relevantMetrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    
    return {
      count,
      average: sum / count,
      min: values[0],
      max: values[count - 1],
      p50: values[Math.floor(count * 0.5)],
      p95: values[Math.floor(count * 0.95)],
      p99: values[Math.floor(count * 0.99)]
    };
  }

  /**
   * Get top slowest operations
   */
  getSlowOperations(limit: number = 10): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  /**
   * Get error rate for a specific operation
   */
  getErrorRate(
    operationName: string,
    timeWindow: number = 5 * 60 * 1000
  ): number {
    const now = Date.now();
    const cutoff = now - timeWindow;
    
    const relevantMetrics = this.metrics.filter(
      m => m.name === operationName && m.timestamp > cutoff
    );

    if (relevantMetrics.length === 0) return 0;

    const errors = relevantMetrics.filter(
      m => m.metadata?.success === false
    ).length;

    return (errors / relevantMetrics.length) * 100;
  }

  /**
   * Check performance thresholds and trigger alerts
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.getThresholdForMetric(metric);
    
    if (threshold && metric.value > threshold) {
      this.triggerAlert({
        type: 'performance_threshold_exceeded',
        metric: metric.name,
        category: metric.category,
        value: metric.value,
        threshold,
        timestamp: metric.timestamp
      });
    }
  }

  /**
   * Get threshold value for specific metric
   */
  private getThresholdForMetric(metric: PerformanceMetric): number | null {
    switch (metric.category) {
      case 'api':
        return this.thresholds.api.responseTime;
      case 'database':
        return this.thresholds.database.queryTime;
      case 'game':
        return this.thresholds.game.processingTime;
      case 'blockchain':
        return this.thresholds.blockchain.transactionTime;
      default:
        return null;
    }
  }

  /**
   * Trigger performance alert
   */
  private triggerAlert(alert: {
    type: string;
    metric: string;
    category: string;
    value: number;
    threshold: number;
    timestamp: number;
  }): void {
    // In production, this would send alerts via:
    // - Discord/Slack webhooks
    // - Email notifications
    // - PagerDuty/monitoring systems
    
    console.warn('🚨 PERFORMANCE ALERT:', alert);

    // Store alert for dashboard
    this.recordMetric({
      name: 'performance_alert',
      value: alert.value,
      timestamp: alert.timestamp,
      category: 'ui', // UI category for dashboard display
      metadata: alert
    });
  }

  /**
   * Clean up old metrics
   */
  private cleanupMetrics(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
  }

  /**
   * Get real-time performance dashboard data
   */
  getDashboardData(): {
    overview: {
      totalRequests: number;
      avgResponseTime: number;
      errorRate: number;
      activeUsers: number;
    };
    categories: Record<string, any>;
    alerts: PerformanceMetric[];
    trends: Array<{ timestamp: number; value: number; category: string }>;
  } {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    const recentMetrics = this.metrics.filter(m => m.timestamp > fiveMinutesAgo);
    const apiMetrics = recentMetrics.filter(m => m.category === 'api');
    const errors = recentMetrics.filter(m => m.metadata?.success === false);
    
    const totalRequests = apiMetrics.length;
    const avgResponseTime = totalRequests > 0 
      ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / totalRequests 
      : 0;
    const errorRate = totalRequests > 0 ? (errors.length / totalRequests) * 100 : 0;
    
    // Get category-specific stats
    const categories: Record<string, any> = {};
    ['api', 'database', 'cache', 'game', 'blockchain'].forEach(category => {
      categories[category] = this.getStats(category as PerformanceMetric['category']);
    });

    // Get recent alerts
    const alerts = this.metrics
      .filter(m => m.name === 'performance_alert' && m.timestamp > fiveMinutesAgo)
      .slice(-20);

    // Get trend data (last 30 minutes in 5-minute buckets)
    const trends: Array<{ timestamp: number; value: number; category: string }> = [];
    const thirtyMinutesAgo = now - (30 * 60 * 1000);
    
    for (let i = 0; i < 6; i++) {
      const bucketStart = thirtyMinutesAgo + (i * 5 * 60 * 1000);
      const bucketEnd = bucketStart + (5 * 60 * 1000);
      
      ['api', 'database', 'game'].forEach(category => {
        const bucketMetrics = this.metrics.filter(
          m => m.category === category && 
               m.timestamp >= bucketStart && 
               m.timestamp < bucketEnd
        );
        
        if (bucketMetrics.length > 0) {
          const avgValue = bucketMetrics.reduce((sum, m) => sum + m.value, 0) / bucketMetrics.length;
          trends.push({
            timestamp: bucketStart,
            value: avgValue,
            category
          });
        }
      });
    }

    return {
      overview: {
        totalRequests,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        activeUsers: this.counters.get('active_users') || 0
      },
      categories,
      alerts,
      trends
    };
  }

  /**
   * Reset all metrics and counters
   */
  reset(): void {
    this.metrics = [];
    this.counters.clear();
    this.timers.clear();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Utility functions for common performance patterns
export const withPerformanceTracking = <T>(
  name: string,
  category: PerformanceMetric['category'],
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  return performanceMonitor.timeAsync(name, category, operation, metadata);
};

export const trackApiCall = <T>(
  endpoint: string,
  operation: () => Promise<T>
): Promise<T> => {
  return withPerformanceTracking(`api_${endpoint}`, 'api', operation, { endpoint });
};

export const trackGameOperation = <T>(
  gameType: string,
  operation: () => Promise<T>
): Promise<T> => {
  return withPerformanceTracking(`game_${gameType}`, 'game', operation, { gameType });
};

export const trackDatabaseQuery = <T>(
  queryType: string,
  operation: () => Promise<T>
): Promise<T> => {
  return withPerformanceTracking(`db_${queryType}`, 'database', operation, { queryType });
};