import { NextResponse } from 'next/server';

// Readiness probe - checks if the application is ready to serve requests
// This is different from liveness probe - it checks if the app can serve traffic
export async function GET() {
  try {
    // Check if the application is properly initialized
    const readinessChecks = {
      server: await checkServerReadiness(),
      dependencies: await checkCriticalDependencies(),
      configuration: checkConfiguration(),
    };
    
    const allReady = Object.values(readinessChecks).every(check => check.ready);
    
    if (allReady) {
      return NextResponse.json(
        {
          status: 'ready',
          timestamp: new Date().toISOString(),
          checks: readinessChecks,
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
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          checks: readinessChecks,
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
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Readiness check failed',
      },
      { status: 503 }
    );
  }
}

async function checkServerReadiness(): Promise<{ ready: boolean; message?: string }> {
  try {
    // Check if Next.js server is properly initialized
    // This could include checking if routes are loaded, middleware is ready, etc.
    return {
      ready: true,
      message: 'Server is ready to serve requests',
    };
  } catch (error) {
    return {
      ready: false,
      message: error instanceof Error ? error.message : 'Server not ready',
    };
  }
}

async function checkCriticalDependencies(): Promise<{ ready: boolean; message?: string }> {
  try {
    // Check critical dependencies that must be available before serving traffic
    // This could include database connectivity, required external services, etc.
    
    // Simulate dependency checks - replace with actual checks
    const criticalServices = [
      // Database connection
      checkDatabaseConnection(),
      // Cache connection (if required for serving requests)
      // checkCacheConnection(),
    ];
    
    const results = await Promise.all(criticalServices);
    const allDependenciesReady = results.every(result => result.ready);
    
    if (allDependenciesReady) {
      return {
        ready: true,
        message: 'All critical dependencies are ready',
      };
    } else {
      const failedServices = results.filter(result => !result.ready);
      return {
        ready: false,
        message: `Dependencies not ready: ${failedServices.map(s => s.message).join(', ')}`,
      };
    }
  } catch (error) {
    return {
      ready: false,
      message: error instanceof Error ? error.message : 'Dependency check failed',
    };
  }
}

function checkConfiguration(): { ready: boolean; message?: string } {
  try {
    // Check if all required configuration is present
    const requiredEnvVars = [
      'NODE_ENV',
      // Add other critical environment variables
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      return {
        ready: false,
        message: `Missing required environment variables: ${missingEnvVars.join(', ')}`,
      };
    }
    
    return {
      ready: true,
      message: 'Configuration is valid',
    };
  } catch (error) {
    return {
      ready: false,
      message: error instanceof Error ? error.message : 'Configuration check failed',
    };
  }
}

async function checkDatabaseConnection(): Promise<{ ready: boolean; message?: string }> {
  try {
    // Add actual database connection check here
    // For now, we'll simulate it
    return {
      ready: true,
      message: 'Database connection ready',
    };
  } catch (error) {
    return {
      ready: false,
      message: error instanceof Error ? error.message : 'Database not ready',
    };
  }
}

export async function HEAD() {
  try {
    const ready = await checkServerReadiness();
    return new Response(null, { status: ready.ready ? 200 : 503 });
  } catch {
    return new Response(null, { status: 503 });
  }
}