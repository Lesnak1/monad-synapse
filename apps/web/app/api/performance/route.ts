/**
 * Performance Monitoring Dashboard API
 * Real-time performance metrics and system health
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance';
import { getCacheMetrics } from '@/lib/apiCache';
import { authenticateRequest, requirePermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check admin permissions for performance data
    if (!requirePermission('admin:performance')(authResult.user!)) {
      return NextResponse.json({
        success: false,
        error: 'Admin permissions required'
      }, { status: 403 });
    }

    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');

    switch (endpoint) {
      case 'dashboard':
        return NextResponse.json({
          success: true,
          data: performanceMonitor.getDashboardData(),
          timestamp: Date.now()
        });

      case 'stats':
        const category = url.searchParams.get('category') as any;
        const timeWindow = parseInt(url.searchParams.get('timeWindow') || '300000');
        
        return NextResponse.json({
          success: true,
          data: performanceMonitor.getStats(category, timeWindow),
          category,
          timeWindow,
          timestamp: Date.now()
        });

      case 'slow-operations':
        const limit = parseInt(url.searchParams.get('limit') || '10');
        
        return NextResponse.json({
          success: true,
          data: performanceMonitor.getSlowOperations(limit),
          timestamp: Date.now()
        });

      case 'cache-metrics':
        return NextResponse.json({
          success: true,
          data: getCacheMetrics(),
          timestamp: Date.now()
        });

      case 'error-rate':
        const operation = url.searchParams.get('operation');
        if (!operation) {
          return NextResponse.json({
            success: false,
            error: 'Operation parameter required'
          }, { status: 400 });
        }
        
        const errorWindow = parseInt(url.searchParams.get('timeWindow') || '300000');
        const errorRate = performanceMonitor.getErrorRate(operation, errorWindow);
        
        return NextResponse.json({
          success: true,
          data: {
            operation,
            errorRate,
            timeWindow: errorWindow
          },
          timestamp: Date.now()
        });

      case 'health':
        // System health check
        const dashboardData = performanceMonitor.getDashboardData();
        const cacheMetrics = getCacheMetrics();
        
        const health = {
          status: 'healthy',
          checks: {
            api: {
              status: dashboardData.overview.avgResponseTime < 1000 ? 'healthy' : 'warning',
              avgResponseTime: dashboardData.overview.avgResponseTime,
              errorRate: dashboardData.overview.errorRate
            },
            cache: {
              status: cacheMetrics.apiCache.hitRate > 70 ? 'healthy' : 'warning',
              hitRate: cacheMetrics.apiCache.hitRate,
              entries: cacheMetrics.apiCache.entries
            },
            memory: {
              status: 'healthy', // Would check actual memory usage in production
              usage: `${cacheMetrics.apiCache.memoryUsage} + ${cacheMetrics.mainCache.memoryUsage}`
            }
          }
        };
        
        // Set overall status based on individual checks
        const hasWarnings = Object.values(health.checks).some(check => check.status === 'warning');
        if (hasWarnings) {
          health.status = 'warning';
        }
        
        return NextResponse.json({
          success: true,
          data: health,
          timestamp: Date.now()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid endpoint. Use: dashboard, stats, slow-operations, cache-metrics, error-rate, health'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check admin permissions
    if (!requirePermission('admin:performance')(authResult.user!)) {
      return NextResponse.json({
        success: false,
        error: 'Admin permissions required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'reset-metrics':
        performanceMonitor.reset();
        return NextResponse.json({
          success: true,
          message: 'Performance metrics reset',
          timestamp: Date.now()
        });

      case 'record-metric':
        const { metric } = body;
        if (!metric || !metric.name || !metric.value || !metric.category) {
          return NextResponse.json({
            success: false,
            error: 'Invalid metric data. Required: name, value, category'
          }, { status: 400 });
        }
        
        performanceMonitor.recordMetric({
          name: metric.name,
          value: metric.value,
          timestamp: Date.now(),
          category: metric.category,
          metadata: metric.metadata || {}
        });
        
        return NextResponse.json({
          success: true,
          message: 'Metric recorded',
          timestamp: Date.now()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: reset-metrics, record-metric'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Performance API POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}