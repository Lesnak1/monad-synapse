import { NextRequest, NextResponse } from 'next/server';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      duration?: number;
      timestamp: string;
    };
  };
}

async function checkDatabase(): Promise<{ status: 'pass' | 'fail'; duration: number; message?: string }> {
  const startTime = Date.now();
  try {
    // Add your database connection check here
    // For now, we'll simulate a database check
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate DB query
    
    return {
      status: 'pass',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'fail',
      duration: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

async function checkRedis(): Promise<{ status: 'pass' | 'fail'; duration: number; message?: string }> {
  const startTime = Date.now();
  try {
    // Add your Redis connection check here
    // For now, we'll simulate a Redis check
    await new Promise(resolve => setTimeout(resolve, 5)); // Simulate Redis ping
    
    return {
      status: 'pass',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'fail',
      duration: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
}

async function checkBlockchainConnection(): Promise<{ status: 'pass' | 'fail' | 'warn'; duration: number; message?: string }> {
  const startTime = Date.now();
  try {
    // Add your blockchain connection check here
    // For now, we'll simulate a blockchain RPC check
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate RPC call
    
    return {
      status: 'pass',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'warn', // Blockchain issues shouldn't fail the health check completely
      duration: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Blockchain connection warning',
    };
  }
}

async function checkExternalServices(): Promise<{ status: 'pass' | 'fail' | 'warn'; duration: number; message?: string }> {
  const startTime = Date.now();
  try {
    // Check external APIs, monitoring services, etc.
    // For now, we'll simulate external service checks
    await new Promise(resolve => setTimeout(resolve, 20)); // Simulate API calls
    
    return {
      status: 'pass',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'warn',
      duration: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'External service warning',
    };
  }
}

function checkMemoryUsage(): { status: 'pass' | 'warn' | 'fail'; message?: string } {
  const memUsage = process.memoryUsage();
  const totalMemMB = memUsage.rss / 1024 / 1024;
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
  
  // Define thresholds (adjust based on your container limits)
  const memoryLimitMB = 1024; // 1GB limit
  const warningThreshold = 0.8; // 80%
  const criticalThreshold = 0.95; // 95%
  
  const memoryUsageRatio = totalMemMB / memoryLimitMB;
  
  if (memoryUsageRatio > criticalThreshold) {
    return {
      status: 'fail',
      message: `Critical memory usage: ${totalMemMB.toFixed(2)}MB (${(memoryUsageRatio * 100).toFixed(1)}%)`,
    };
  } else if (memoryUsageRatio > warningThreshold) {
    return {
      status: 'warn',
      message: `High memory usage: ${totalMemMB.toFixed(2)}MB (${(memoryUsageRatio * 100).toFixed(1)}%)`,
    };
  }
  
  return {
    status: 'pass',
    message: `Memory usage: ${totalMemMB.toFixed(2)}MB (${(memoryUsageRatio * 100).toFixed(1)}%)`,
  };
}

async function performHealthCheck(): Promise<HealthCheck> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Run all health checks concurrently
  const [dbCheck, redisCheck, blockchainCheck, externalCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkBlockchainConnection(),
    checkExternalServices(),
  ]);
  
  const memoryCheck = checkMemoryUsage();
  
  const checks = {
    database: {
      ...dbCheck,
      timestamp,
    },
    redis: {
      ...redisCheck,
      timestamp,
    },
    blockchain: {
      ...blockchainCheck,
      timestamp,
    },
    external_services: {
      ...externalCheck,
      timestamp,
    },
    memory: {
      ...memoryCheck,
      timestamp,
    },
    system: {
      status: 'pass' as const,
      timestamp,
      message: `Node.js ${process.version}, Platform: ${process.platform}`,
    },
  };
  
  // Determine overall health status
  const hasFailures = Object.values(checks).some(check => check.status === 'fail');
  const hasWarnings = Object.values(checks).some(check => check.status === 'warn');
  
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  if (hasFailures) {
    overallStatus = 'unhealthy';
  } else if (hasWarnings) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }
  
  return {
    status: overallStatus,
    timestamp,
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    checks,
  };
}

// Basic health check endpoint
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const detailed = url.searchParams.get('detailed') === 'true';
  
  try {
    if (detailed) {
      // Detailed health check with all components
      const healthCheck = await performHealthCheck();
      
      const statusCode = healthCheck.status === 'healthy' ? 200 : 
                        healthCheck.status === 'degraded' ? 200 : 503;
      
      return NextResponse.json(healthCheck, { 
        status: statusCode,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Simple health check for load balancer
      return NextResponse.json(
        { 
          status: 'healthy',
          timestamp: new Date().toISOString(),
          message: 'Service is running',
        },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// HEAD request for simple health checks
export async function HEAD() {
  return new Response(null, { status: 200 });
}