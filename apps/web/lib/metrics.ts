interface MetricValue {
  value: number;
  timestamp: number;
}

interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  labels?: Record<string, string>;
  value: number | MetricValue[];
}

// Simple in-memory metrics store (in production, use Redis or similar)
const metricsStore = new Map<string, Metric>();

// Initialize default metrics
const initializeMetrics = () => {
  // HTTP request metrics
  metricsStore.set('http_requests_total', {
    name: 'http_requests_total',
    type: 'counter',
    help: 'Total number of HTTP requests',
    value: 0,
  });

  metricsStore.set('http_request_duration_seconds', {
    name: 'http_request_duration_seconds',
    type: 'histogram',
    help: 'HTTP request duration in seconds',
    value: [],
  });

  // Application metrics
  metricsStore.set('app_uptime_seconds', {
    name: 'app_uptime_seconds',
    type: 'gauge',
    help: 'Application uptime in seconds',
    value: process.uptime(),
  });

  metricsStore.set('nodejs_memory_usage_bytes', {
    name: 'nodejs_memory_usage_bytes',
    type: 'gauge',
    help: 'Node.js memory usage in bytes',
    value: process.memoryUsage().rss,
  });

  // Business metrics for casino platform
  metricsStore.set('game_results_total', {
    name: 'game_results_total',
    type: 'counter',
    help: 'Total number of game results',
    value: 0,
  });

  metricsStore.set('bets_total', {
    name: 'bets_total',
    type: 'counter',
    help: 'Total number of bets placed',
    value: 0,
  });

  metricsStore.set('wallet_balance_total', {
    name: 'wallet_balance_total',
    type: 'gauge',
    help: 'Current wallet balance in tokens',
    value: 1000, // Default value
  });

  metricsStore.set('active_users_gauge', {
    name: 'active_users_gauge',
    type: 'gauge',
    help: 'Number of currently active users',
    value: 0,
  });

  metricsStore.set('auth_failures_total', {
    name: 'auth_failures_total',
    type: 'counter',
    help: 'Total number of authentication failures',
    value: 0,
  });

  metricsStore.set('suspicious_activity_total', {
    name: 'suspicious_activity_total',
    type: 'counter',
    help: 'Total number of suspicious activity events',
    value: 0,
  });

  // Performance metrics
  metricsStore.set('database_query_duration_seconds', {
    name: 'database_query_duration_seconds',
    type: 'histogram',
    help: 'Database query duration in seconds',
    value: [],
  });

  metricsStore.set('blockchain_rpc_duration_seconds', {
    name: 'blockchain_rpc_duration_seconds',
    type: 'histogram',
    help: 'Blockchain RPC call duration in seconds',
    value: [],
  });
};

// Update runtime metrics
const updateRuntimeMetrics = () => {
  // Update uptime
  const uptimeMetric = metricsStore.get('app_uptime_seconds');
  if (uptimeMetric) {
    uptimeMetric.value = process.uptime();
  }

  // Update memory usage
  const memUsage = process.memoryUsage();
  const memMetric = metricsStore.get('nodejs_memory_usage_bytes');
  if (memMetric) {
    memMetric.value = memUsage.rss;
  }

  // Add heap usage metrics
  metricsStore.set('nodejs_heap_used_bytes', {
    name: 'nodejs_heap_used_bytes',
    type: 'gauge',
    help: 'Node.js heap used in bytes',
    value: memUsage.heapUsed,
  });

  metricsStore.set('nodejs_heap_total_bytes', {
    name: 'nodejs_heap_total_bytes',
    type: 'gauge',
    help: 'Node.js heap total in bytes',
    value: memUsage.heapTotal,
  });

  // Add CPU usage if available
  const cpuUsage = process.cpuUsage();
  metricsStore.set('nodejs_cpu_user_seconds_total', {
    name: 'nodejs_cpu_user_seconds_total',
    type: 'counter',
    help: 'Total user CPU time spent in seconds',
    value: cpuUsage.user / 1000000, // Convert microseconds to seconds
  });

  metricsStore.set('nodejs_cpu_system_seconds_total', {
    name: 'nodejs_cpu_system_seconds_total',
    type: 'counter',
    help: 'Total system CPU time spent in seconds',
    value: cpuUsage.system / 1000000,
  });
};

// Format metrics in Prometheus format
export const formatPrometheusMetrics = (): string => {
  updateRuntimeMetrics();
  
  const lines: string[] = [];
  
  for (const [name, metric] of metricsStore.entries()) {
    // Add help comment
    lines.push(`# HELP ${metric.name} ${metric.help}`);
    
    // Add type comment
    lines.push(`# TYPE ${metric.name} ${metric.type}`);
    
    // Add metric value(s)
    if (typeof metric.value === 'number') {
      const labelsStr = metric.labels ? 
        `{${Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}` : '';
      lines.push(`${metric.name}${labelsStr} ${metric.value}`);
    } else if (Array.isArray(metric.value)) {
      // For histogram/summary metrics (simplified)
      metric.value.forEach((point, index) => {
        lines.push(`${metric.name}_bucket{le="${index + 1}"} ${point.value}`);
      });
    }
    
    lines.push(''); // Empty line between metrics
  }
  
  return lines.join('\n');
};

// Initialize metrics on first load
if (metricsStore.size === 0) {
  initializeMetrics();
}

// Utility function to increment a counter metric
export const incrementCounter = (metricName: string, labels?: Record<string, string>, value: number = 1) => {
  const metric = metricsStore.get(metricName);
  if (metric && metric.type === 'counter') {
    metric.value = (metric.value as number) + value;
    if (labels) {
      metric.labels = { ...metric.labels, ...labels };
    }
  }
};

// Utility function to set a gauge metric
export const setGauge = (metricName: string, value: number, labels?: Record<string, string>) => {
  const metric = metricsStore.get(metricName);
  if (metric && metric.type === 'gauge') {
    metric.value = value;
    if (labels) {
      metric.labels = { ...metric.labels, ...labels };
    }
  }
};

// Utility function to observe a histogram metric
export const observeHistogram = (metricName: string, value: number, labels?: Record<string, string>) => {
  const metric = metricsStore.get(metricName);
  if (metric && metric.type === 'histogram') {
    const values = metric.value as MetricValue[];
    values.push({ value, timestamp: Date.now() });
    
    // Keep only last 1000 observations to prevent memory leak
    if (values.length > 1000) {
      values.splice(0, values.length - 1000);
    }
    
    if (labels) {
      metric.labels = { ...metric.labels, ...labels };
    }
  }
};

export const getMetricsStore = () => metricsStore;