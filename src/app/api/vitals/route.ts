/**
 * Web Vitals API Endpoint
 * Receives and logs Core Web Vitals metrics from the client
 */

import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, createValidationError } from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';

interface Metric {
  id: string;
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
  timestamp: number;
  route: string;
}

interface VitalsRequestBody {
  metrics: Metric[];
  metadata: {
    url: string;
    viewportWidth: number;
    viewportHeight: number;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    connectionType: string;
  };
}

// 简单的内存存储（生产环境应使用数据库）
const vitalsStore: Array<{
  timestamp: number;
  metrics: Metric[];
  metadata: VitalsRequestBody['metadata'];
}> = [];

// 定期清理旧数据（保留最近 1000 条）
setInterval(() => {
  while (vitalsStore.length > 1000) {
    vitalsStore.shift();
  }
}, 5 * 60 * 1000); // 每 5 分钟清理一次

export async function POST(request: NextRequest) {
  try {
    const body: VitalsRequestBody = await request.json();
    const { metrics, metadata } = body;

    // 验证数据
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return createValidationError('Invalid metrics data');
    }

    // 存储指标
    vitalsStore.push({
      timestamp: Date.now(),
      metrics,
      metadata,
    });

    // 在生产环境中，这里可以：
    // 1. 存储到数据库（PostgreSQL, MongoDB, etc.）
    // 2. 发送到分析服务（Google Analytics, Plausible, etc.）
    // 3. 发送到 Sentry 作为性能监控
    // 4. 发送到 Prometheus/Grafana

    // 示例：Sentry 性能监控集成
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.withScope((scope) => {
    //     scope.setContext('web_vitals', {
    //       metrics,
    //       metadata,
    //     });
    //     Sentry.captureMessage('Web Vitals Report');
    //   });
    // }

    return createSuccessResponse({
      received: metrics.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('[Web Vitals API] Error processing request:', error instanceof Error ? error : new Error(String(error)), { category: 'vitals' });

    return createErrorResponse(new Error('Failed to process metrics'));
  }
}

/**
 * GET endpoint - retrieve stored metrics (for debugging/monitoring)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 查询参数
  const limit = Math.min(
    parseInt(searchParams.get('limit') || '100'),
    1000
  );
  const offset = parseInt(searchParams.get('offset') || '0');
  const route = searchParams.get('route');
  const name = searchParams.get('name');

  // 过滤和分页
  let filtered = [...vitalsStore];

  if (route) {
    filtered = filtered.filter(entry =>
      entry.metrics.some(m => m.route === route)
    );
  }

  if (name) {
    filtered = filtered.filter(entry =>
      entry.metrics.some(m => m.name === name)
    );
  }

  // 排序（最新的在前）
  filtered.sort((a, b) => b.timestamp - a.timestamp);

  // 分页
  const paginated = filtered.slice(offset, offset + limit);

  // 计算统计信息
  const allMetrics = filtered.flatMap(entry => entry.metrics);
  const stats = calculateStats(allMetrics);

  return createSuccessResponse({
    data: paginated,
    pagination: {
      total: filtered.length,
      limit,
      offset,
    },
    stats,
  });
}

/**
 * Calculate statistics for metrics
 */
function calculateStats(metrics: Metric[]) {
  const stats: Record<string, {
    count: number;
    avg: number;
    min: number;
    max: number;
    good: number;
    needsImprovement: number;
    poor: number;
  }> = {};

  // 按指标名称分组
  const groups: Record<string, number[]> = {};
  const ratingGroups: Record<string, Record<string, number>> = {};

  metrics.forEach(m => {
    if (!groups[m.name]) {
      groups[m.name] = [];
      ratingGroups[m.name] = { good: 0, needsImprovement: 0, poor: 0 };
    }
    groups[m.name].push(m.value);
    ratingGroups[m.name][m.rating]++;
  });

  // 计算统计值
  Object.entries(groups).forEach(([name, values]) => {
    const sum = values.reduce((a, b) => a + b, 0);
    stats[name] = {
      count: values.length,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      good: ratingGroups[name].good,
      needsImprovement: ratingGroups[name].needsImprovement,
      poor: ratingGroups[name].poor,
    };
  });

  return stats;
}

/**
 * DELETE endpoint - clear old metrics (for maintenance)
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const beforeTimestamp = parseInt(searchParams.get('before') || '0');

  if (beforeTimestamp > 0) {
    // 删除指定时间戳之前的所有数据
    const initialLength = vitalsStore.length;
    const cutoffIndex = vitalsStore.findIndex(entry => entry.timestamp >= beforeTimestamp);

    if (cutoffIndex > 0) {
      vitalsStore.splice(0, cutoffIndex);
    }

    return createSuccessResponse({
      deleted: initialLength - vitalsStore.length,
      remaining: vitalsStore.length,
    });
  } else {
    // 清空所有数据（谨慎使用）
    const initialLength = vitalsStore.length;
    vitalsStore.length = 0;

    return createSuccessResponse({
      deleted: initialLength,
      remaining: 0,
    });
  }
}
