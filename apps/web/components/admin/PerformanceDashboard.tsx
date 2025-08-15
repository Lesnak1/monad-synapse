'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface PerformanceData {
  overview: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    activeUsers: number;
  };
  categories: Record<string, any>;
  alerts: Array<{
    name: string;
    value: number;
    category: string;
    timestamp: number;
    metadata: any;
  }>;
  trends: Array<{
    timestamp: number;
    value: number;
    category: string;
  }>;
}

interface CacheMetrics {
  apiCache: {
    entries: number;
    hitRate: number;
    hits: number;
    misses: number;
    memoryUsage: string;
  };
  mainCache: {
    entries: number;
    hitRate: number;
    hits: number;
    misses: number;
    memoryUsage: string;
  };
}

export function PerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const [performanceRes, cacheRes] = await Promise.all([
        fetch('/api/performance?endpoint=dashboard'),
        fetch('/api/performance?endpoint=cache-metrics')
      ]);

      if (performanceRes.ok) {
        const perfData = await performanceRes.json();
        setPerformanceData(perfData.data);
      }

      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        setCacheMetrics(cacheData.data);
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setIsLoading(false);
    }
  };

  const resetMetrics = async () => {
    try {
      const response = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-metrics' })
      });

      if (response.ok) {
        toast.success('Performance metrics reset');
        fetchData();
      } else {
        toast.error('Failed to reset metrics');
      }
    } catch (error) {
      toast.error('Failed to reset metrics');
    }
  };

  useEffect(() => {
    fetchData();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  if (isLoading) {
    return (
      <div className="casino-card max-w-6xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚡</div>
          <div className="text-white">Loading performance data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="casino-card p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">⚡ Performance Dashboard</h1>
            <p className="text-white/70">Real-time system performance monitoring</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                autoRefresh
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-white/10 text-white/70 border border-white/20'
              }`}
            >
              {autoRefresh ? '🔄 Auto Refresh ON' : '⏸️ Auto Refresh OFF'}
            </button>
            <button
              onClick={resetMetrics}
              className="px-4 py-2 rounded-lg font-medium bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-all"
            >
              🗑️ Reset Metrics
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      {performanceData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="casino-card p-6 text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold text-blue-400">
              {performanceData.overview.totalRequests}
            </div>
            <div className="text-white/70 text-sm">Total Requests</div>
            <div className="text-xs text-white/50 mt-1">(Last 5 minutes)</div>
          </div>

          <div className="casino-card p-6 text-center">
            <div className="text-3xl mb-2">⚡</div>
            <div className={`text-2xl font-bold ${
              performanceData.overview.avgResponseTime < 500 ? 'text-green-400' :
              performanceData.overview.avgResponseTime < 1000 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {performanceData.overview.avgResponseTime}ms
            </div>
            <div className="text-white/70 text-sm">Avg Response Time</div>
          </div>

          <div className="casino-card p-6 text-center">
            <div className="text-3xl mb-2">🚨</div>
            <div className={`text-2xl font-bold ${
              performanceData.overview.errorRate < 1 ? 'text-green-400' :
              performanceData.overview.errorRate < 5 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {performanceData.overview.errorRate}%
            </div>
            <div className="text-white/70 text-sm">Error Rate</div>
          </div>

          <div className="casino-card p-6 text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-purple-400">
              {performanceData.overview.activeUsers}
            </div>
            <div className="text-white/70 text-sm">Active Users</div>
          </div>
        </div>
      )}

      {/* Cache Metrics */}
      {cacheMetrics && (
        <div className="casino-card p-6">
          <h2 className="text-xl font-bold text-white mb-4">🗄️ Cache Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">API Response Cache</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/70">Hit Rate:</span>
                  <span className={`font-bold ${
                    cacheMetrics.apiCache.hitRate > 80 ? 'text-green-400' :
                    cacheMetrics.apiCache.hitRate > 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {cacheMetrics.apiCache.hitRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Entries:</span>
                  <span className="text-white">{cacheMetrics.apiCache.entries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Memory:</span>
                  <span className="text-white">{cacheMetrics.apiCache.memoryUsage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Hits/Misses:</span>
                  <span className="text-white">
                    {cacheMetrics.apiCache.hits}/{cacheMetrics.apiCache.misses}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Main Cache</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/70">Hit Rate:</span>
                  <span className={`font-bold ${
                    cacheMetrics.mainCache.hitRate > 80 ? 'text-green-400' :
                    cacheMetrics.mainCache.hitRate > 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {cacheMetrics.mainCache.hitRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Entries:</span>
                  <span className="text-white">{cacheMetrics.mainCache.entries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Memory:</span>
                  <span className="text-white">{cacheMetrics.mainCache.memoryUsage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Hits/Misses:</span>
                  <span className="text-white">
                    {cacheMetrics.mainCache.hits}/{cacheMetrics.mainCache.misses}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Performance */}
      {performanceData && (
        <div className="casino-card p-6">
          <h2 className="text-xl font-bold text-white mb-4">📈 Category Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(performanceData.categories).map(([category, stats]: [string, any]) => (
              <div key={category} className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 capitalize">
                  {category === 'api' ? '🌐' : category === 'database' ? '🗃️' : category === 'game' ? '🎮' : '⚡'} {category}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Count:</span>
                    <span className="text-white">{stats.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Avg:</span>
                    <span className="text-white">{Math.round(stats.average)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">P95:</span>
                    <span className="text-white">{Math.round(stats.p95)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Max:</span>
                    <span className={`${stats.max > 1000 ? 'text-red-400' : 'text-white'}`}>
                      {Math.round(stats.max)}ms
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {performanceData && performanceData.alerts.length > 0 && (
        <div className="casino-card p-6">
          <h2 className="text-xl font-bold text-white mb-4">🚨 Recent Alerts</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {performanceData.alerts.slice(0, 10).map((alert, index) => (
              <div key={index} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-red-400 font-semibold">{alert.name}</div>
                    <div className="text-white/70 text-sm">
                      {alert.category.toUpperCase()} • {alert.value.toFixed(2)}ms
                    </div>
                  </div>
                  <div className="text-white/50 text-xs">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Tips */}
      <div className="casino-card p-6">
        <h2 className="text-xl font-bold text-white mb-4">💡 Performance Tips</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-semibold text-green-400 mb-2">✅ Good Performance</h3>
            <ul className="text-white/70 text-sm space-y-1">
              <li>• Response times under 500ms</li>
              <li>• Cache hit rates above 80%</li>
              <li>• Error rates below 1%</li>
              <li>• Memory usage under control</li>
            </ul>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-semibold text-red-400 mb-2">⚠️ Watch Out For</h3>
            <ul className="text-white/70 text-sm space-y-1">
              <li>• Response times above 1000ms</li>
              <li>• Cache hit rates below 60%</li>
              <li>• Error rates above 5%</li>
              <li>• Memory usage growing rapidly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}