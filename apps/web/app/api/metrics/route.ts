import { NextResponse } from 'next/server';
import { formatPrometheusMetrics, getMetricsStore } from '@/lib/metrics';

// Main metrics endpoint
export async function GET() {
  try {
    const metricsText = formatPrometheusMetrics();
    
    return new Response(metricsText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to generate metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Custom metrics endpoint for JSON format (useful for debugging)
export async function POST() {
  try {
    const metricsStore = getMetricsStore();
    
    const metricsObj: Record<string, any> = {};
    for (const [name, metric] of metricsStore.entries()) {
      metricsObj[name] = {
        type: metric.type,
        help: metric.help,
        value: metric.value,
        labels: metric.labels,
      };
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      metrics: metricsObj,
      runtime: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to generate JSON metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}