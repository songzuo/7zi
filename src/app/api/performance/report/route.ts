/**
 * Performance Report API
 * Generate aggregated performance reports with statistics and trends
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import type { PerformanceMetric, MetricStats } from '../metrics/route';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler';

// Import the performance store from metrics route
// In production, use a shared database or proper module architecture
const performanceStore: Map<string, PerformanceMetric[]> = new Map();

// ========================================
// Types
// ========================================

interface TimeSeriesData {
  timestamp: number;
  value: number;
  route?: string;
  deviceType?: string;
}

interface MetricReport {
  name: string;
  stats: MetricStats;
  trend: 'improving' | 'stable' | 'degrading';
  trendPercentage: number;
  timeSeries: TimeSeriesData[];
  recentAlerts: number;
}

interface Report {
  period: {
    start: number;
    end: number;
  };
  metrics: Record<string, MetricReport>;
  summary: {
    totalMetrics: number;
    totalRoutes: number;
    overallRating: 'good' | 'needs-improvement' | 'poor';
    criticalAlerts: number;
    topIssues: Array<{
      metric: string;
      issue: string;
      impact: string;
      recommendation: string;
    }>;
  };
}

// ========================================
// Report Generation
// ========================================

function generateReport(
  startTime: number,
  endTime: number,
  routes?: string[]
): Report {
  let allMetrics: PerformanceMetric[] = [];

  // Collect metrics from all routes
  if (routes && routes.length > 0) {
    routes.forEach(route => {
      if (performanceStore.has(route)) {
        allMetrics.push(...performanceStore.get(route)!);
      }
    });
  } else {
    performanceStore.forEach(metrics => {
      allMetrics.push(...metrics);
    });
  }

  // Filter by time range
  allMetrics = allMetrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);

  // Group by metric name
  const metricsByType = new Map<string, PerformanceMetric[]>();

  allMetrics.forEach(m => {
    if (!metricsByType.has(m.name)) {
      metricsByType.set(m.name, []);
    }
    metricsByType.get(m.name)!.push(m);
  });

  // Generate report for each metric
  const metrics: Record<string, MetricReport> = {};

  metricsByType.forEach((typeMetrics, name) => {
    // Sort by timestamp
    typeMetrics.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate statistics
    const stats = calculateStats(typeMetrics);

    // Generate time series data
    const timeSeries = generateTimeSeries(typeMetrics, startTime, endTime);

    // Calculate trend (compare first half vs second half)
    const { trend, trendPercentage } = calculateTrend(typeMetrics);

    metrics[name] = {
      name,
      stats,
      trend,
      trendPercentage,
      timeSeries,
      recentAlerts: stats.poor + stats.needsImprovement,
    };
  });

  // Calculate summary
  const totalMetrics = allMetrics.length;
  const totalRoutes = new Set(allMetrics.map(m => m.route)).size;
  const overallRating = calculateOverallRating(metrics);
  const criticalAlerts = Object.values(metrics)
    .reduce((sum, m) => sum + m.stats.poor, 0);

  // Generate top issues and recommendations
  const topIssues = generateTopIssues(metrics);

  // Handle empty data case for tests
  if (Object.keys(metrics).length === 0) {
    return {
      period: {
        start: startTime,
        end: endTime,
      },
      metrics: {},
      summary: {
        totalMetrics: 0,
        totalRoutes: 0,
        overallRating: 'good',
        criticalAlerts: 0,
        topIssues: [],
      },
    };
  }

  return {
    period: {
      start: startTime,
      end: endTime,
    },
    metrics,
    summary: {
      totalMetrics,
      totalRoutes,
      overallRating,
      criticalAlerts,
      topIssues,
    },
  };
}

function calculateStats(metrics: PerformanceMetric[]): MetricStats {
  if (metrics.length === 0) {
    return {
      count: 0,
      avg: 0,
      min: 0,
      max: 0,
      p50: 0,
      p90: 0,
      p95: 0,
      good: 0,
      needsImprovement: 0,
      poor: 0,
    };
  }

  const values = metrics.map(m => m.value).sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);

  const ratingCounts = metrics.reduce((acc, m) => {
    acc[m.rating]++;
    return acc;
  }, { good: 0, needsImprovement: 0, poor: 0 });

  return {
    count: metrics.length,
    avg: sum / metrics.length,
    min: values[0],
    max: values[values.length - 1],
    p50: values[Math.floor(values.length * 0.5)],
    p90: values[Math.floor(values.length * 0.9)],
    p95: values[Math.floor(values.length * 0.95)],
    good: ratingCounts.good,
    needsImprovement: ratingCounts.needsImprovement,
    poor: ratingCounts.poor,
  };
}

function generateTimeSeries(
  metrics: PerformanceMetric[],
  startTime: number,
  endTime: number
): TimeSeriesData[] {
  if (metrics.length === 0) return [];

  // Determine time bucket size
  const duration = endTime - startTime;
  const bucketCount = Math.min(metrics.length, 100); // Max 100 data points
  const bucketSize = duration / bucketCount;

  const buckets = new Map<number, { sum: number; count: number }>();

  metrics.forEach(m => {
    const bucketIndex = Math.floor((m.timestamp - startTime) / bucketSize);
    const bucketStart = startTime + bucketIndex * bucketSize;

    if (!buckets.has(bucketStart)) {
      buckets.set(bucketStart, { sum: 0, count: 0 });
    }

    const bucket = buckets.get(bucketStart)!;
    bucket.sum += m.value;
    bucket.count++;
  });

  // Convert to time series
  const timeSeries: TimeSeriesData[] = [];

  buckets.forEach((bucket, timestamp) => {
    timeSeries.push({
      timestamp,
      value: bucket.sum / bucket.count,
    });
  });

  return timeSeries.sort((a, b) => a.timestamp - b.timestamp);
}

function calculateTrend(metrics: PerformanceMetric[]): {
  trend: 'improving' | 'stable' | 'degrading';
  trendPercentage: number;
} {
  if (metrics.length < 2) {
    return { trend: 'stable', trendPercentage: 0 };
  }

  const sorted = [...metrics].sort((a, b) => a.timestamp - b.timestamp);
  const mid = Math.floor(sorted.length / 2);

  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const firstAvg = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  const threshold = 5; // 5% change threshold

  if (change > threshold) {
    return { trend: 'degrading', trendPercentage: change };
  } else if (change < -threshold) {
    return { trend: 'improving', trendPercentage: Math.abs(change) };
  } else {
    return { trend: 'stable', trendPercentage: Math.abs(change) };
  }
}

function calculateOverallRating(metrics: Record<string, MetricReport>): 'good' | 'needs-improvement' | 'poor' {
  const values = Object.values(metrics);

  if (values.length === 0) return 'good';

  let goodCount = 0;
  let poorCount = 0;

  values.forEach(m => {
    const poorPercentage = (m.stats.poor / m.stats.count) * 100;
    if (poorPercentage > 50) {
      poorCount++;
    } else if (poorPercentage < 10) {
      goodCount++;
    }
  });

  const poorPercentage = (poorCount / values.length) * 100;
  const goodPercentage = (goodCount / values.length) * 100;

  if (poorPercentage > 50) return 'poor';
  if (poorPercentage > 25 || goodPercentage < 50) return 'needs-improvement';
  return 'good';
}

function generateTopIssues(metrics: Record<string, MetricReport>): Array<{
  metric: string;
  issue: string;
  impact: string;
  recommendation: string;
}> {
  const issues: Array<{
    metric: string;
    issue: string;
    impact: string;
    recommendation: string;
  }> = [];

  Object.values(metrics).forEach(m => {
    const poorPercentage = (m.stats.poor / m.stats.count) * 100;

    if (poorPercentage > 20) {
      let issue = '';
      let impact = '';
      let recommendation = '';

      switch (m.name) {
        case 'LCP':
          issue = 'Slow Largest Contentful Paint';
          impact = 'Users experience delayed content rendering';
          recommendation = 'Optimize images, lazy-load content, use preloading';
          break;
        case 'FID':
          issue = 'High First Input Delay';
          impact = 'Poor interactivity, users feel unresponsive';
          recommendation = 'Reduce JavaScript execution time, defer non-critical scripts';
          break;
        case 'CLS':
          issue = 'Cumulative Layout Shift';
          impact = 'Layout jumps, users click wrong elements';
          recommendation = 'Reserve space for images/ads, avoid inserting content above existing content';
          break;
        case 'INP':
          issue = 'Poor Interaction to Next Paint';
          impact = 'Slow response to user interactions';
          recommendation = 'Reduce event handler execution time, use requestIdleCallback';
          break;
        case 'TTFB':
          issue = 'High Time to First Byte';
          impact = 'Slow server response, delayed page load';
          recommendation = 'Optimize server performance, use CDN, enable compression';
          break;
        default:
          issue = `${m.name} needs improvement`;
          impact = 'Poor user experience';
          recommendation = 'Analyze and optimize related code';
      }

      issues.push({
        metric: m.name,
        issue,
        impact,
        recommendation,
      });
    }
  });

  // Sort by poor percentage and return top 5
  issues.sort((a, b) => {
    const aPoor = metrics[a.metric].stats.poor;
    const bPoor = metrics[b.metric].stats.poor;
    return bPoor - aPoor;
  });

  return issues.slice(0, 5);
}

// ========================================
// API Routes
// ========================================

/**
 * GET /api/performance/report
 * Generate performance report
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse time range
    const period = searchParams.get('period') || '24h';
    const now = Date.now();

    let startTime = 0;
    let endTime = now;

    switch (period) {
      case '1h':
        startTime = now - 60 * 60 * 1000;
        break;
      case '6h':
        startTime = now - 6 * 60 * 60 * 1000;
        break;
      case '24h':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        // Custom range
        startTime = parseInt(searchParams.get('startTime') || String(now - 24 * 60 * 60 * 1000));
        endTime = parseInt(searchParams.get('endTime') || String(now));
    }

    // Parse routes filter
    const routesParam = searchParams.get('routes');
    const routes = routesParam ? routesParam.split(',') : undefined;

    // Generate report
    const report = generateReport(startTime, endTime, routes);

    logger.info('Performance report generated', {
      period,
      totalMetrics: report.summary.totalMetrics,
      totalRoutes: report.summary.totalRoutes,
      overallRating: report.summary.overallRating,
    });

    return createSuccessResponse({
      report,
      summary: report.summary,
    });
  } catch (_error) {
    logger.error('Failed to generate performance report', { error });

    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
