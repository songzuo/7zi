/**
 * Web Vitals Reporting API
 * 接收并存储 Core Web Vitals 性能指标
 *
 * 功能：
 * - 接收客户端上报的 Web Vitals 数据
 * - 验证数据格式
 * - 存储到数据库（可选）
 * - 转发到分析平台（Sentry, Google Analytics, etc.）
 */

import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createSuccessResponse, createErrorResponse, createValidationError } from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';

// ============================================
// 类型定义
// ============================================

interface WebVitalMetric {
  id: string;
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType?: string;
  timestamp: number;
  route: string;
  userAgent?: string;
  sessionId?: string;
}

interface WebVitalsReport {
  metrics: WebVitalMetric[];
  metadata: {
    url: string;
    referrer?: string;
    viewportWidth: number;
    viewportHeight: number;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    connectionType?: string;
  };
}

// ============================================
// 辅助函数
// ============================================

/**
 * 检测设备类型
 */
function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase();
  
  if (/tablet|ipad|playbook|silk|kindle|android(?!.*mobi)/i.test(ua)) {
    return 'tablet';
  }
  
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    return 'mobile';
  }
  
  return 'desktop';
}

/**
 * 验证 Web Vitals 数据
 */
function validateMetric(metric: WebVitalMetric): boolean {
  if (!metric.id || !metric.name || typeof metric.value !== 'number') {
    return false;
  }

  if (
    !['LCP', 'FID', 'CLS', 'TTFB', 'FCP', 'INP'].includes(metric.name)
  ) {
    return false;
  }

  if (!['good', 'needs-improvement', 'poor'].includes(metric.rating)) {
    return false;
  }

  // 验证数值范围
  const validRanges: Record<string, { min: number; max: number }> = {
    LCP: { min: 0, max: 30000 },      // 0-30s
    FID: { min: 0, max: 5000 },       // 0-5s
    CLS: { min: 0, max: 10 },        // 0-10
    TTFB: { min: 0, max: 10000 },    // 0-10s
    FCP: { min: 0, max: 20000 },     // 0-20s
    INP: { min: 0, max: 10000 },     // 0-10s
  };

  const range = validRanges[metric.name];
  if (range && (metric.value < range.min || metric.value > range.max)) {
    return false;
  }

  return true;
}

/**
 * 发送到 Sentry
 */
function sendToSentry(metrics: WebVitalMetric[]) {
  metrics.forEach((metric) => {
    // 发送性能指标到 Sentry
    try {
      Sentry.setMeasurement?.(
        `web_vitals.${metric.name.toLowerCase()}`,
        metric.value,
        'millisecond'
      );

      // 对于 poor 评级，发送事件
      if (metric.rating === 'poor') {
        Sentry.captureMessage(`Poor ${metric.name}: ${metric.value}ms`, {
          level: 'warning',
          tags: {
            metric: metric.name,
            rating: metric.rating,
            route: metric.route,
          },
          extra: {
            value: metric.value,
            delta: metric.delta,
            timestamp: metric.timestamp,
          },
        });
      }
    } catch (error) {
      logger.error('[Web Vitals] Failed to send to Sentry:', error instanceof Error ? error : new Error(String(error)), { category: 'web-vitals' });
    }
  });
}

/**
 * 计算性能评分
 */
function calculatePerformanceScore(metrics: WebVitalMetric[]): number {
  if (metrics.length === 0) return 0;

  const weights: Record<string, number> = {
    LCP: 0.25,
    INP: 0.25,
    CLS: 0.25,
    FCP: 0.15,
    TTFB: 0.1,
  };

  let totalScore = 0;
  let totalWeight = 0;

  metrics.forEach((metric) => {
    const weight = weights[metric.name] || 0;
    if (weight === 0) return;

    let score = 0;
    if (metric.rating === 'good') score = 100;
    else if (metric.rating === 'needs-improvement') score = 50;
    else score = 0;

    totalScore += score * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

// ============================================
// API Route Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: WebVitalsReport = await request.json();

    // 验证数据
    if (!body.metrics || !Array.isArray(body.metrics)) {
      return createValidationError('Invalid metrics data');
    }

    if (!body.metadata || !body.metadata.url) {
      return createValidationError('Invalid metadata');
    }

    // 验证每个指标
    const validMetrics = body.metrics.filter(validateMetric);

    if (validMetrics.length === 0) {
      return createValidationError('No valid metrics');
    }

    // 添加元数据
    const userAgent = request.headers.get('user-agent') || '';
    const deviceType = getDeviceType(userAgent);

    const enrichedMetrics: WebVitalMetric[] = validMetrics.map((metric) => ({
      ...metric,
      userAgent,
      route: body.metadata.url,
    }));

    // 发送到 Sentry
    sendToSentry(enrichedMetrics);

    // 计算性能评分
    const performanceScore = calculatePerformanceScore(enrichedMetrics);

    // TODO: 存储到数据库
    // await db.webVitals.createMany({
    //   data: enrichedMetrics.map(metric => ({
    //     name: metric.name,
    //     value: metric.value,
    //     rating: metric.rating,
    //     route: metric.route,
    //     deviceType,
    //     timestamp: new Date(metric.timestamp),
    //   })),
    // });

    // 返回成功响应
    return createSuccessResponse({
      received: enrichedMetrics.length,
      score: performanceScore,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('[Web Vitals API] Error:', error instanceof Error ? error : new Error(String(error)), { category: 'web-vitals' });

    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'));
  }
}

/**
 * GET 请求 - 返回 Web Vitals 统计摘要（可选）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const route = searchParams.get('route');
    const hours = parseInt(searchParams.get('hours') || '24', 10);

    // TODO: 从数据库查询统计数据
    // const stats = await db.webVitals.groupBy({
    //   by: ['name', 'rating'],
    //   where: {
    //     route: route || undefined,
    //     timestamp: {
    //       gte: new Date(Date.now() - hours * 60 * 60 * 1000),
    //     },
    //   },
    //   _count: true,
    // });

    return createSuccessResponse({
      message: 'Database integration pending',
      route,
      hours,
    });

  } catch (error) {
    logger.error('[Web Vitals API] GET Error:', error instanceof Error ? error : new Error(String(error)), { category: 'web-vitals' });

    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'));
  }
}
