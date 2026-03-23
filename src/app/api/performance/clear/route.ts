/**
 * Performance Metrics Management API
 * POST /api/performance/clear - Clear all performance metrics (requires admin privileges)
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearApiPerformanceData } from '@/lib/middleware/api-performance';
import { clearQueryMetrics } from '@/lib/middleware/db-performance';
import { logger } from '@/lib/logger';
import { getCacheManager } from '@/lib/cache/CacheManager';
import { withAdmin, RBACUserContext } from '@/lib/auth/middleware-rbac';

async function POSTHandler(
  request: NextRequest,
  context: RBACUserContext
) {
  try {
    logger.info(`Performance metrics clear requested by admin: ${context.userId}`, {
      userId: context.userId,
    });

    // Clear all metrics
    clearApiPerformanceData();
    clearQueryMetrics();

    // Invalidate performance report cache
    const cacheManager = getCacheManager();
    cacheManager.delete('perf-report:detailed:5');
    cacheManager.delete('perf-report:summary:5');

    logger.info('Performance metrics cleared successfully', {
      userId: context.userId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'All performance metrics cleared',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error clearing performance metrics', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to clear metrics',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return withAdmin(request, POSTHandler);
}

// Disable caching
export const dynamic = 'force-dynamic';
