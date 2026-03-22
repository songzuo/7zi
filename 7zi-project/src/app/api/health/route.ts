/**
 * Health Check API Routes
 *
 * Provides health check endpoints for monitoring and load balancers
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check response structure - matches test expectations
 */
interface HealthCheckResponse {
  /** Overall health status */
  status: 'healthy' | 'unhealthy';
  /** Timestamp */
  timestamp: string;
  /** Uptime in seconds */
  uptime: number;
  /** Version */
  version: string;
  /** Service checks */
  checks: {
    memory: {
      status: 'ok' | 'warning';
      used: number;
      limit: number;
    };
    node: {
      status: 'ok';
      version: string;
    };
  };
}

/**
 * GET /api/health
 * Basic health check endpoint
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get memory usage in MB
    const usedMemory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const memoryLimit = 512; // Default memory limit in MB

    // Determine memory status
    const memoryStatus = usedMemory > memoryLimit * 0.9 ? 'warning' : 'ok';

    // Get uptime in seconds
    const uptime = Math.floor(process.uptime());

    // Get version from package.json or use fallback
    const version = process.env.npm_package_version || process.env.APP_VERSION || '1.0.6';

    // Get Node.js version
    const nodeVersion = process.version;

    const response: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      version,
      checks: {
        memory: {
          status: memoryStatus,
          used: usedMemory,
          limit: memoryLimit
        },
        node: {
          status: 'ok',
          version: nodeVersion
        }
      }
    };

    return NextResponse.json(
      {
        success: true,
        data: response
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (err) {
    console.error('Health check failed', { error: err });

    return NextResponse.json(
      {
        success: false,
        message: 'Health check failed'
      },
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

/**
 * HEAD /api/health
 * Lightweight health check (returns status code only)
 */
export async function HEAD() {
  try {
    const response = await GET(new NextRequest('http://localhost/api/health', {
      method: 'GET',
    }));

    return response;
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
