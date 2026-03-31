/**
 * API Metrics Performance Endpoint
 * 统一的性能指标端点
 *
 * GET /api/metrics/performance - Get all performance metrics (API + rate limits + system)
 */

import {
  getApiPerformanceReport,
} from '@/lib/middleware/api-performance';
import {
  getRateLimitStats,
} from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';

interface PerformanceMetricsResponse {
  success: true;
  data: {
    apiPerformance?: {
      summary: unknown;
      topSlowRequests: unknown[];
      routeCount: number;
    };
    rateLimiting?: {
      totalEntries: number;
      trackedPaths: string[];
      totalRequestsTracked: number;
      pathsCount: number;
    };
    system?: {
      uptime: {
        seconds: number;
        formatted: string;
      };
      memory: {
        heapUsed: string;
        heapTotal: string;
        external: string;
        rss: string;
        heapUsedPercent: string;
      };
      nodeVersion: string;
      platform: string;
      arch: string;
    };
  };
  timestamp: string;
}

/**
 * GET /api/metrics/performance
 * 获取综合性能指标（包括API性能、速率限制、系统指标）
 *
 * Query Parameters:
 * - category: "all" | "api" | "ratelimit" | "system" - Filter metrics category (default: "all")
 * - period: "1h" | "24h" | "7d" | "30d" - Time period for historical data (default: "24h")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';

    const response: PerformanceMetricsResponse = {
      success: true,
      data: {},
      timestamp: new Date().toISOString(),
    };

    // API Performance Metrics
    if (category === 'all' || category === 'api') {
      const apiReport = getApiPerformanceReport();
      response.data.apiPerformance = {
        summary: apiReport.summary,
        topSlowRequests: apiReport.slowRequests.slice(0, 10), // Top 10 slowest
        routeCount: Object.keys(apiReport.routes).length,
      };
    }

    // Rate Limit Metrics
    if (category === 'all' || category === 'ratelimit') {
      const rateLimitStats = getRateLimitStats();
      response.data.rateLimiting = {
        totalEntries: rateLimitStats.totalEntries,
        trackedPaths: rateLimitStats.trackedPaths,
        totalRequestsTracked: rateLimitStats.totalRequests,
        pathsCount: rateLimitStats.trackedPaths.length,
      };
    }

    // System Metrics
    if (category === 'all' || category === 'system') {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();

      response.data.system = {
        uptime: {
          seconds: uptime,
          formatted: formatUptime(uptime),
        },
        memory: {
          heapUsed: formatBytes(memUsage.heapUsed),
          heapTotal: formatBytes(memUsage.heapTotal),
          external: formatBytes(memUsage.external),
          rss: formatBytes(memUsage.rss),
          heapUsedPercent: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2),
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      };
    }

    logger.debug('[Metrics API] Performance metrics retrieved', {
      category,
      responseSize: JSON.stringify(response.data).length,
    });

    return NextResponse.json(response);
  } catch (_error) {
    logger.error('[Metrics API] Failed to retrieve performance metrics', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve performance metrics',
      },
      { status: 500 }
    );
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format uptime to human-readable string
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
