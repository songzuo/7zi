/**
 * Health Check API Routes
 *
 * Provides health check endpoints for monitoring and load balancers
 */

import { NextRequest, NextResponse } from 'next/server';
import { success, error as apiError } from '@/lib/api/api-response-wrapper';
import { logger } from '@/lib/logger';
import { DegradationManager } from '@/lib/fallback/graceful-degradation';
import { CircuitBreakerRegistry } from '@/lib/fallback/circuit-breaker';

/**
 * Health check response structure
 */
interface HealthCheckResponse {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Timestamp */
  timestamp: string;
  /** Version */
  version?: string;
  /** Environment */
  environment: string;
  /** Service checks */
  checks: Record<string, {
    /** Individual check status */
    status: 'pass' | 'fail' | 'warn';
    /** Response time (ms) */
    responseTime?: number;
    /** Error message */
    message?: string;
  }>;
  /** Degraded features */
  degradedFeatures?: string[];
  /** Circuit breaker status */
  circuitBreakers?: Record<string, {
    state: string;
    isHealthy: boolean;
    failureRate: number;
  }>;
}

/**
 * GET /api/health
 * Basic health check endpoint
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const checks: HealthCheckResponse['checks'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // 1. Check API connectivity
    checks.api = {
      status: 'pass',
      responseTime: Date.now() - startTime,
    };

    // 2. Check database (if applicable)
    checks.database = await checkDatabase();

    // 3. Check cache (if applicable)
    checks.cache = await checkCache();

    // 4. Check circuit breakers
    const circuitBreakerStatus = checkCircuitBreakers();
    checks.circuitBreakers = {
      status: circuitBreakerStatus.isHealthy ? 'pass' : 'warn',
      message: circuitBreakerStatus.message,
    };

    // 5. Check degraded features
    const degradationStatus = checkDegradedFeatures();
    if (degradationStatus.degradedFeatures.length > 0) {
      overallStatus = 'degraded';
    }

    // Determine overall status
    const hasFailures = Object.values(checks).some(check => check.status === 'fail');
    const hasWarnings = Object.values(checks).some(check => check.status === 'warn');

    if (hasFailures) {
      overallStatus = 'unhealthy';
    } else if (hasWarnings || overallStatus !== 'healthy') {
      overallStatus = 'degraded';
    }

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || process.env.APP_VERSION,
      environment: process.env.NODE_ENV || 'unknown',
      checks,
      degradedFeatures: degradationStatus.degradedFeatures,
      circuitBreakers: circuitBreakerStatus.breakers,
    };

    // Log health check
    logger.info('Health check completed', {
      status: overallStatus,
      responseTime: Date.now() - startTime,
      checks,
    });

    return success(response, undefined, {
      requestId: request.headers.get('X-Request-ID') || undefined,
    });
  } catch (err) {
    logger.error('Health check failed', { error: err });

    return apiError({
      message: '健康检查失败',
      detail: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    }, {
      status: 503,
    });
  }
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheckResponse['checks'][string]> {
  const startTime = Date.now();

  try {
    // TODO: Add actual database check
    // Example: await db.query('SELECT 1');
    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      status: 'pass',
      responseTime: Date.now() - startTime,
    };
  } catch (err) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Check cache connectivity
 */
async function checkCache(): Promise<HealthCheckResponse['checks'][string]> {
  const startTime = Date.now();

  try {
    // TODO: Add actual cache check
    // Example: await redis.ping();
    await new Promise(resolve => setTimeout(resolve, 5));

    return {
      status: 'pass',
      responseTime: Date.now() - startTime,
    };
  } catch (err) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Check circuit breakers
 */
function checkCircuitBreakers(): {
  isHealthy: boolean;
  message: string;
  breakers: Record<string, {
    state: string;
    isHealthy: boolean;
    failureRate: number;
  }>;
} {
  const registry = CircuitBreakerRegistry.getInstance();
  const breakers = registry.getAllBreakers();
  const breakerStatus: Record<string, {
    state: string;
    isHealthy: boolean;
    failureRate: number;
  }> = {};
  let openCount = 0;

  breakers.forEach((breaker, name) => {
    const health = breaker.getHealth();
    breakerStatus[name] = {
      state: health.state,
      isHealthy: health.isHealthy,
      failureRate: health.failureRate,
    };

    if (!health.isHealthy) {
      openCount++;
    }
  });

  return {
    isHealthy: openCount === 0,
    message: openCount > 0 ? `${openCount} circuit(s) open` : 'All circuits closed',
    breakers: breakerStatus,
  };
}

/**
 * Check degraded features
 */
function checkDegradedFeatures(): {
  degradedFeatures: string[];
} {
  const manager = DegradationManager.getInstance();
  const status = manager.getStatus();

  return {
    degradedFeatures: status.degradedFeatures,
  };
}

/**
 * HEAD /api/health
 * Lightweight health check (returns status code only)
 */
export async function HEAD() {
  try {
    const checks = {
      api: 'pass',
    };

    // Quick checks only
    const response = await GET(new NextRequest('http://localhost/api/health', {
      method: 'GET',
    }));

    return response;
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}

/**
 * GET /api/health/ready
 * Readiness probe - checks if service is ready to accept traffic
 */
export async function GET_READY() {
  try {
    // Basic readiness checks
    const isReady = true; // TODO: Add actual checks

    return NextResponse.json(
      {
        ready: isReady,
        timestamp: new Date().toISOString(),
      },
      {
        status: isReady ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch {
    return new NextResponse(
      JSON.stringify({ ready: false, timestamp: new Date().toISOString() }),
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
 * GET /api/health/live
 * Liveness probe - checks if service is alive
 */
export async function GET_LIVE() {
  return NextResponse.json(
    {
      alive: true,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
      },
    }
  );
}
