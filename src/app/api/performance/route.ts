/**
 * Performance Metrics API
 * 
 * Provides detailed performance metrics for monitoring and debugging
 */

import { NextResponse } from 'next/server';
import {
  getPerformanceSummary,
  getSlowestEndpoints,
  getMostAccessedEndpoints,
  getErrorProneEndpoints,
  getEndpointMetrics,
  getSystemSnapshots,
  getLatestSnapshot,
  getHourlyStats,
  takeSystemSnapshot,
} from '@/lib/monitoring/performance-metrics';

/**
 * GET /api/performance
 * 
 * Returns comprehensive performance metrics
 * 
 * Query params:
 * - detail: 'summary' | 'full' | 'endpoints' | 'system' (default: 'summary')
 * - limit: number of items to return for lists (default: 10)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const detail = url.searchParams.get('detail') || 'summary';
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);

  try {
    // Take a fresh snapshot
    const currentSnapshot = takeSystemSnapshot();

    switch (detail) {
      case 'endpoints':
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          endpoints: getEndpointMetrics(),
          slowest: getSlowestEndpoints(limit),
          mostAccessed: getMostAccessedEndpoints(limit),
          errorProne: getErrorProneEndpoints(limit),
        });

      case 'system':
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          current: currentSnapshot,
          history: getSystemSnapshots(limit),
        });

      case 'hourly':
        const hours = Math.min(limit, 168); // Max 7 days
        const hourlyStats = getHourlyStats(hours);
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          hours: Array.from(hourlyStats.entries()).map(([hour, stats]) => ({
            hour,
            ...stats,
          })),
        });

      case 'full':
        const summary = getPerformanceSummary();
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          summary,
          system: {
            current: currentSnapshot,
            history: getSystemSnapshots(10),
          },
          endpoints: {
            all: getEndpointMetrics(),
            slowest: getSlowestEndpoints(limit),
            mostAccessed: getMostAccessedEndpoints(limit),
            errorProne: getErrorProneEndpoints(limit),
          },
          hourly: Array.from(getHourlyStats(24).entries()).map(([hour, stats]) => ({
            hour,
            ...stats,
          })),
        });

      case 'summary':
      default:
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          summary: getPerformanceSummary(),
          latestSnapshot: getLatestSnapshot(),
          slowestEndpoints: getSlowestEndpoints(limit),
          mostAccessedEndpoints: getMostAccessedEndpoints(limit),
        });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to collect performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}