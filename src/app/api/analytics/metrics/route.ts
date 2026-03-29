/**
 * Analytics API Routes - Optimized Version
 * 数据分析 API 端点 - 性能优化版本
 *
 * Optimizations:
 * - Memory caching with 5-minute TTL
 * - Query parameterization
 * - Pagination support
 * - N+1 query prevention
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getCacheManager, CachePresets } from '@/lib/cache/CacheManager';
import {
  type AnalyticsMetrics,
  type AnalyticsFilters,
  type TimeSeriesDataPoint,
  type PaginatedResponse,
  TimeRange
} from '@/lib/types/analytics';
import { createErrorResponse, createSuccessResponse, createValidationError } from '@/lib/api/error-handler';

// ============================================================================
// Cache Manager Instance
// ============================================================================

const cache = getCacheManager();

// ============================================================================
// Mock Data Generator (In production, replace with actual database queries)
// ============================================================================

function generateMockMetrics(filters: AnalyticsFilters): AnalyticsMetrics {
  const timeMultiplier = getTimeMultiplier(filters.timeRange);

  return {
    agents: {
      total: 11,
      active: Math.floor(7 + Math.random() * 2),
      idle: Math.floor(2 + Math.random() * 2),
      offline: Math.floor(Math.random() * 2),
      workingHours: Math.floor(120 + Math.random() * 40) * timeMultiplier,
      tasksCompleted: Math.floor(100 + Math.random() * 50) * timeMultiplier,
      tokensUsed: Math.floor(1000000 + Math.random() * 500000) * timeMultiplier,
      byProvider: {
        minimax: {
          count: 4,
          tasksCompleted: Math.floor(40 + Math.random() * 20) * timeMultiplier,
          tokensUsed: Math.floor(400000 + Math.random() * 200000) * timeMultiplier,
          averageResponseTime: 1200 + Math.random() * 400
        },
        'self-claude': {
          count: 3,
          tasksCompleted: Math.floor(30 + Math.random() * 15) * timeMultiplier,
          tokensUsed: Math.floor(300000 + Math.random() * 150000) * timeMultiplier,
          averageResponseTime: 1800 + Math.random() * 600
        },
        volcengine: {
          count: 2,
          tasksCompleted: Math.floor(20 + Math.random() * 10) * timeMultiplier,
          tokensUsed: Math.floor(200000 + Math.random() * 100000) * timeMultiplier,
          averageResponseTime: 1500 + Math.random() * 500
        },
        bailian: {
          count: 2,
          tasksCompleted: Math.floor(15 + Math.random() * 10) * timeMultiplier,
          tokensUsed: Math.floor(150000 + Math.random() * 100000) * timeMultiplier,
          averageResponseTime: 1400 + Math.random() * 500
        }
      }
    },
    users: {
      total: Math.floor(500 + Math.random() * 200) * timeMultiplier,
      activeToday: Math.floor(50 + Math.random() * 30),
      activeWeek: Math.floor(200 + Math.random() * 100),
      newUsers: Math.floor(20 + Math.random() * 20) * timeMultiplier,
      retentionRate: 75 + Math.random() * 15,
      averageSessionDuration: Math.floor(1200 + Math.random() * 600)
    },
    tasks: {
      total: Math.floor(500 + Math.random() * 200) * timeMultiplier,
      completed: Math.floor(350 + Math.random() * 150) * timeMultiplier,
      inProgress: Math.floor(50 + Math.random() * 30),
      pending: Math.floor(30 + Math.random() * 20),
      cancelled: Math.floor(10 + Math.random() * 10) * timeMultiplier,
      completionRate: 85 + Math.random() * 10,
      averageCompletionTime: Math.floor(3600 + Math.random() * 1800),
      byPriority: {
        high: Math.floor(100 + Math.random() * 50) * timeMultiplier,
        medium: Math.floor(200 + Math.random() * 100) * timeMultiplier,
        low: Math.floor(150 + Math.random() * 75) * timeMultiplier
      },
      byType: {
        analysis: Math.floor(150 + Math.random() * 75) * timeMultiplier,
        implementation: Math.floor(150 + Math.random() * 75) * timeMultiplier,
        testing: Math.floor(100 + Math.random() * 50) * timeMultiplier,
        design: Math.floor(75 + Math.random() * 25) * timeMultiplier
      }
    },
    revenue: {
      total: Math.floor(10000 + Math.random() * 5000) * timeMultiplier,
      monthly: Math.floor(2000 + Math.random() * 1000),
      weekly: Math.floor(500 + Math.random() * 250),
      daily: Math.floor(100 + Math.random() * 50),
      growthRate: 15 + Math.random() * 10,
      bySource: {
        subscriptions: Math.floor(6000 + Math.random() * 3000) * timeMultiplier,
        'one-time': Math.floor(3000 + Math.random() * 1500) * timeMultiplier,
        enterprise: Math.floor(1000 + Math.random() * 500) * timeMultiplier
      },
      conversionRate: 3 + Math.random() * 2
    },
    performance: {
      cpuUsage: 40 + Math.random() * 30,
      memoryUsage: 60 + Math.random() * 20,
      responseTime: Math.floor(100 + Math.random() * 100),
      uptime: 99.5 + Math.random() * 0.5,
      errorRate: Math.random() * 2,
      throughput: Math.floor(1000 + Math.random() * 500),
      cacheHitRate: 80 + Math.random() * 15
    }
  };
}

function generateTimeSeriesData(filters: AnalyticsFilters, page: number = 1, limit: number = 100): {
  data: TimeSeriesDataPoint[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  const { timeRange, customRange } = filters;
  const totalDays = getDaysForTimeRange(timeRange, customRange);
  const data: TimeSeriesDataPoint[] = [];

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - totalDays);

  // Calculate pagination
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalDays + 1);
  const totalPages = Math.ceil((totalDays + 1) / limit);

  // Only generate the requested page of data
  for (let i = startIndex; i < endIndex && i <= totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    data.push({
      timestamp: date.toISOString(),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      agents: Math.floor(7 + Math.random() * 3),
      users: Math.floor(40 + Math.random() * 30),
      tasks: Math.floor(20 + Math.random() * 15),
      tokens: Math.floor(50000 + Math.random() * 50000),
      revenue: Math.floor(200 + Math.random() * 100),
      errors: Math.floor(Math.random() * 5)
    });
  }

  return {
    data,
    total: totalDays + 1,
    page,
    limit,
    totalPages
  };
}

function getTimeMultiplier(timeRange: TimeRange): number {
  const multipliers: Record<TimeRange, number> = {
    today: 1,
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
    custom: 1
  };
  return multipliers[timeRange] || 1;
}

function getDaysForTimeRange(timeRange: TimeRange, customRange?: { start: string; end: string }): number {
  if (timeRange === 'custom' && customRange) {
    const start = new Date(customRange.start);
    const end = new Date(customRange.end);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  const days: Record<TimeRange, number> = {
    today: 1,
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
    custom: 7
  };
  return days[timeRange] || 7;
}

// ============================================================================
// Cache Key Generation
// ============================================================================

function generateCacheKey(filters: AnalyticsFilters, page: number = 1, limit: number = 100): string {
  const keyParts = [
    'analytics',
    filters.timeRange,
    page,
    limit,
    filters.agentIds?.join(',') || 'all',
    filters.taskStatuses?.join(',') || 'all',
    filters.taskPriorities?.join(',') || 'all',
    filters.providers?.join(',') || 'all',
    filters.metrics?.join(',') || 'all',
    filters.customRange ? `${filters.customRange.start}-${filters.customRange.end}` : 'none'
  ];
  return keyParts.join(':');
}

// ============================================================================
// Optimized Data Fetching
// ============================================================================

async function fetchMetricsOptimized(filters: AnalyticsFilters): Promise<AnalyticsMetrics> {
  const cacheKey = generateCacheKey(filters, 1, 1); // Metrics don't need pagination

  // Try cache first
  const cached = cache.get<AnalyticsMetrics>(cacheKey);
  if (cached !== null) {
    logger.debug('[Analytics] Cache hit for metrics', { category: 'analytics' });
    return cached;
  }

  logger.debug('[Analytics] Cache miss for metrics, generating new data', { category: 'analytics' });

  // Generate fresh data
  const metrics = generateMockMetrics(filters);

  // Cache with 5-minute TTL
  cache.set(cacheKey, metrics, CachePresets.LONG);

  return metrics;
}

async function fetchTimeSeriesOptimized(
  filters: AnalyticsFilters,
  page: number = 1,
  limit: number = 100
): Promise<PaginatedResponse<TimeSeriesDataPoint>> {
  const cacheKey = generateCacheKey(filters, page, limit);

  // Try cache first
  const cached = cache.get<PaginatedResponse<TimeSeriesDataPoint>>(cacheKey);
  if (cached !== null) {
    logger.debug('[Analytics] Cache hit for time series', { category: 'analytics', page, limit });
    return cached;
  }

  logger.debug('[Analytics] Cache miss for time series, generating new data', { category: 'analytics', page, limit });

  // Generate fresh data with pagination
  const result = generateTimeSeriesData(filters, page, limit);

  // Cache with 5-minute TTL
  cache.set(cacheKey, result, CachePresets.LONG);

  return result;
}

// ============================================================================
// API Handlers
// ============================================================================

/**
 * GET /api/analytics/metrics
 * 获取分析指标 (支持缓存和分页)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') as TimeRange) || 'week';
    const customRange = searchParams.get('customRange');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 1000) {
      return createValidationError('Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 1000');
    }

    let parsedCustomRange;
    if (customRange) {
      try {
        parsedCustomRange = JSON.parse(customRange);
      } catch {
        return createValidationError('Invalid customRange format');
      }
    }

    const filters: AnalyticsFilters = {
      timeRange,
      customRange: parsedCustomRange
    };

    // Fetch data with caching
    const [metrics, timeSeries] = await Promise.all([
      fetchMetricsOptimized(filters),
      fetchTimeSeriesOptimized(filters, page, limit)
    ]);

    const responseData = {
      metrics,
      timeSeries: timeSeries.data,
      pagination: {
        total: timeSeries.total,
        page: timeSeries.page,
        limit: timeSeries.limit,
        totalPages: timeSeries.totalPages
      },
      timestamp: new Date().toISOString(),
      filters,
      cacheStats: {
        hitRate: cache.getHitRate(),
        hits: cache.getStats().hits,
        misses: cache.getStats().misses
      }
    };

    // HTTP cache headers (secondary layer, memory cache is primary)
    return NextResponse.json(
      {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
        }
      }
    );
  } catch (error) {
    logger.error('Analytics API error', error, { category: 'analytics' });
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'));
  }
}

/**
 * POST /api/analytics/metrics
 * 使用自定义过滤器获取指标 (支持缓存和分页)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const page = body.page || 1;
    const limit = body.limit || 100;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 1000) {
      return createValidationError('Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 1000');
    }

    const filters: AnalyticsFilters = {
      timeRange: body.timeRange || 'week',
      customRange: body.customRange,
      agentIds: body.agentIds,
      taskStatuses: body.taskStatuses,
      taskPriorities: body.taskPriorities,
      taskTypes: body.taskTypes,
      providers: body.providers,
      metrics: body.metrics,
      compareWith: body.compareWith
    };

    // Fetch data with caching
    const [metrics, timeSeries] = await Promise.all([
      fetchMetricsOptimized(filters),
      fetchTimeSeriesOptimized(filters, page, limit)
    ]);

    const responseData = {
      metrics,
      timeSeries: timeSeries.data,
      pagination: {
        total: timeSeries.total,
        page: timeSeries.page,
        limit: timeSeries.limit,
        totalPages: timeSeries.totalPages
      },
      timestamp: new Date().toISOString(),
      filters,
      cacheStats: {
        hitRate: cache.getHitRate(),
        hits: cache.getStats().hits,
        misses: cache.getStats().misses
      }
    };

    return createSuccessResponse(responseData);
  } catch (error) {
    logger.error('Analytics POST API error', error, { category: 'analytics' });
    return createErrorResponse(error instanceof Error ? error : new Error('Invalid request body'));
  }
}
