import { enhancedHealthReport, healthResponse } from '@/lib/monitoring';
import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Enhanced health check endpoint with:
 * - Basic status (ok/degraded/error)
 * - Component status (cache, auth, logger)
 * - Performance metrics (response time)
 * - Version and uptime information
 * 
 * Query params:
 * - history: include health check history (true/false)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeHistory = url.searchParams.get('history') === 'true';

    const health = await enhancedHealthReport(includeHistory);

    // Return simplified response for basic endpoint
    const response: Record<string, unknown> = {
      status: health.status,
      timestamp: health.timestamp,
      version: health.version,
      uptime: health.uptime,
      environment: health.environment,
      responseTime: health.responseTime,
    };

    // Include component status if available
    if (health.components) {
      response.components = {
        cache: health.components.cache.status,
        auth: health.components.auth.status,
        logger: health.components.logger.status,
      };
    }

    // Include history if requested
    if (includeHistory && health.history) {
      response.history = health.history;
    }

    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error during health check',
      },
      { status: 500 }
    );
  }
}

/**
 * HEAD /api/health
 * Lightweight health check for load balancers
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
