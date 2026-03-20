/**
 * Prometheus Metrics Endpoint
 * Prometheus 格式的指标导出端点
 *
 * GET /api/metrics/prometheus - Export metrics in Prometheus format
 *
 * Use this endpoint to integrate with Prometheus/Grafana monitoring stack:
 * - Configure Prometheus to scrape: http://your-domain/api/metrics/prometheus
 * - Import Grafana dashboard from monitoring/grafana-dashboard.json
 */

import { NextResponse } from 'next/server';
import { exportPrometheusMetrics } from '@/lib/monitoring/prometheus';
import { logger } from '@/lib/logger';

/**
 * GET /api/metrics/prometheus
 * Export metrics in Prometheus/OpenMetrics format
 */
export async function GET() {
  try {
    // Generate Prometheus metrics
    const metrics = await exportPrometheusMetrics();

    // Return metrics with plain text content type
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      },
    });
  } catch (error) {
    logger.error('[Prometheus Metrics] Failed to export metrics', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return error metrics
    const errorMetrics = `# ERROR: Failed to export metrics
# ${error instanceof Error ? error.message : String(error)}
# Time: ${new Date().toISOString()}
`;

    return new NextResponse(errorMetrics, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  }
}

// 禁用缓存以获取最新指标
export const dynamic = 'force-dynamic';
