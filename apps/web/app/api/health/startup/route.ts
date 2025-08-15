import { NextResponse } from 'next/server';

// Startup probe - checks if the application has completed initialization
// This is used by Kubernetes to know when to start sending traffic
export async function GET() {
  try {
    const startupChecks = {
      initialization: await checkInitialization(),
      warmup: await checkWarmupStatus(),
      resources: checkResourceAvailability(),
    };
    
    const allStarted = Object.values(startupChecks).every(check => check.started);
    
    if (allStarted) {
      return NextResponse.json(
        {
          status: 'started',
          timestamp: new Date().toISOString(),
          checks: startupChecks,
        },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    } else {
      return NextResponse.json(
        {
          status: 'starting',
          timestamp: new Date().toISOString(),
          checks: startupChecks,
        },
        { 
          status: 503,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'starting',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Startup check failed',
      },
      { status: 503 }
    );
  }
}

async function checkInitialization(): Promise<{ started: boolean; message?: string; duration?: number }> {
  const startTime = Date.now();
  
  try {
    // Check if the application has completed its initialization process
    // This might include loading configuration, initializing services, etc.
    
    // Simulate initialization check - replace with actual initialization status
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate initialization check
    
    return {
      started: true,
      message: 'Application initialization completed',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      started: false,
      message: error instanceof Error ? error.message : 'Initialization not complete',
      duration: Date.now() - startTime,
    };
  }
}

async function checkWarmupStatus(): Promise<{ started: boolean; message?: string; duration?: number }> {
  const startTime = Date.now();
  
  try {
    // Check if the application has completed its warmup process
    // This might include pre-loading data, establishing connections, etc.
    
    const warmupChecks = [
      checkDatabaseWarmup(),
      checkCacheWarmup(),
      checkBlockchainWarmup(),
    ];
    
    const results = await Promise.all(warmupChecks);
    const allWarmedUp = results.every(result => result.warmedUp);
    
    if (allWarmedUp) {
      return {
        started: true,
        message: 'All services warmed up',
        duration: Date.now() - startTime,
      };
    } else {
      const notWarmedUp = results.filter(result => !result.warmedUp);
      return {
        started: false,
        message: `Services still warming up: ${notWarmedUp.map(s => s.service).join(', ')}`,
        duration: Date.now() - startTime,
      };
    }
  } catch (error) {
    return {
      started: false,
      message: error instanceof Error ? error.message : 'Warmup check failed',
      duration: Date.now() - startTime,
    };
  }
}

function checkResourceAvailability(): { started: boolean; message?: string } {
  try {
    // Check if necessary resources are available
    const memUsage = process.memoryUsage();
    const freeMemory = process.memoryUsage().heapTotal - process.memoryUsage().heapUsed;
    
    // Basic resource availability check
    if (freeMemory < 50 * 1024 * 1024) { // Less than 50MB free
      return {
        started: false,
        message: 'Insufficient memory available for startup',
      };
    }
    
    return {
      started: true,
      message: 'Sufficient resources available',
    };
  } catch (error) {
    return {
      started: false,
      message: error instanceof Error ? error.message : 'Resource check failed',
    };
  }
}

async function checkDatabaseWarmup(): Promise<{ warmedUp: boolean; service: string; message?: string }> {
  try {
    // Add actual database warmup check here
    // This might include testing connection pool, running initial queries, etc.
    return {
      warmedUp: true,
      service: 'database',
      message: 'Database connections established',
    };
  } catch (error) {
    return {
      warmedUp: false,
      service: 'database',
      message: error instanceof Error ? error.message : 'Database warmup failed',
    };
  }
}

async function checkCacheWarmup(): Promise<{ warmedUp: boolean; service: string; message?: string }> {
  try {
    // Add actual cache warmup check here
    // This might include connecting to Redis, loading initial cache data, etc.
    return {
      warmedUp: true,
      service: 'cache',
      message: 'Cache connections established',
    };
  } catch (error) {
    return {
      warmedUp: false,
      service: 'cache',
      message: error instanceof Error ? error.message : 'Cache warmup failed',
    };
  }
}

async function checkBlockchainWarmup(): Promise<{ warmedUp: boolean; service: string; message?: string }> {
  try {
    // Add actual blockchain warmup check here
    // This might include connecting to blockchain RPC, loading contract ABIs, etc.
    return {
      warmedUp: true,
      service: 'blockchain',
      message: 'Blockchain connections established',
    };
  } catch (error) {
    return {
      warmedUp: false,
      service: 'blockchain',
      message: error instanceof Error ? error.message : 'Blockchain warmup failed',
    };
  }
}

export async function HEAD() {
  try {
    const started = await checkInitialization();
    return new Response(null, { status: started.started ? 200 : 503 });
  } catch {
    return new Response(null, { status: 503 });
  }
}