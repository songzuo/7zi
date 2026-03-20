/**
 * Monitoring Middleware Wrapper
 * 监控中间件包装器 - 自动添加性能追踪和错误记录
 *
 * 功能：
 * - 自动包装 API 路由处理器
 * - 添加性能追踪（响应时间）
 * - 添加错误追踪（Sentry）
 * - 添加请求 ID 生成
 * - 添加告警触发
 *
 * 使用方法：
 * export const GET = withMonitoring(handler);
 * export const POST = withMonitoring(handler);
 */

import { NextRequest, NextResponse } from 'next/server';
import { performance } from 'perf_hooks';
import { captureError, ErrorCategory, ErrorSeverity } from '@/lib/monitoring/errors';
import { logger } from '@/lib/logger';
import { alerts } from '@/lib/monitoring/alerts';
import { getApiPerformanceReport } from '@/lib/middleware/api-performance';

// ============================================
// 类型定义
// ============================================

export interface MonitoringOptions {
  /**
   * 告警阈值（毫秒）
   */
  alertThreshold?: number;
  /**
   * 是否记录错误到 Sentry
   */
  captureErrors?: boolean;
  /**
   * 路由名称（用于日志和指标）
   */
  routeName?: string;
  /**
   * 是否在慢请求时发送告警
   */
  alertOnSlowRequests?: boolean;
  /**
   * 自定义指标
   */
  customMetrics?: Record<string, (duration: number) => number>;
}

// ============================================
// 全局监控统计
// ============================================

export interface MonitoringStats {
  totalRequests: number;
  totalErrors: number;
  totalSlowRequests: number;
  lastError?: {
    message: string;
    timestamp: number;
    route: string;
  };
}

const globalStats: MonitoringStats = {
  totalRequests: 0,
  totalErrors: 0,
  totalSlowRequests: 0,
};

// ============================================
// 主包装器函数
// ============================================

/**
 * 监控包装器 - 自动添加性能追踪和错误记录
 */
export function withMonitoring<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: MonitoringOptions = {}
): (request: NextRequest, ...args: T) => Promise<NextResponse> {
  const {
    alertThreshold = 2000, // 2秒默认告警阈值
    captureErrors = true,
    routeName,
    alertOnSlowRequests = true,
  } = options;

  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = performance.now();
    const requestId = generateRequestId();

    // 添加请求 ID 到请求头
    const requestWithId = new NextRequest(request, {
      headers: new Headers(request.headers),
    });
    requestWithId.headers.set('x-request-id', requestId);

    // 获取路由名称
    const url = new URL(request.url);
    const route = routeName || url.pathname;

    // 更新统计
    globalStats.totalRequests++;

    // 记录请求开始
    logger.debug(`[Monitoring] Request started`, {
      requestId,
      method: request.method,
      route,
      userAgent: request.headers.get('user-agent'),
    });

    try {
      // 执行原始处理器
      const response = await handler(requestWithId, ...args);

      // 计算响应时间
      const duration = performance.now() - startTime;

      // 添加性能响应头
      response.headers.set('x-request-id', requestId);
      response.headers.set('x-response-time', `${duration.toFixed(2)}ms`);

      // 记录成功请求
      logger.debug(`[Monitoring] Request completed`, {
        requestId,
        method: request.method,
        route,
        statusCode: response.status,
        duration: `${duration.toFixed(2)}ms`,
      });

      // 检查慢请求告警
      if (alertOnSlowRequests && duration > alertThreshold) {
        handleSlowRequest(request, route, duration, requestId, response.status);
      }

      // 检查高错误率告警
      checkErrorRate(route);

      return response;
    } catch (error) {
      // 计算响应时间
      const duration = performance.now() - startTime;

      // 更新错误统计
      globalStats.totalErrors++;
      globalStats.lastError = {
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        route,
      };

      // 记录错误
      logger.error(`[Monitoring] Request failed`, {
        requestId,
        method: request.method,
        route,
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // 捕获错误到 Sentry
      if (captureErrors) {
        captureError(error, {
          category: ErrorCategory.API,
          severity: ErrorSeverity.ERROR,
          tags: {
            requestId,
            method: request.method,
            route,
          },
          extra: {
            duration,
          },
        });
      }

      // 发送告警
      await sendErrorAlert(error, request, route, requestId, duration);

      // 重新抛出错误
      throw error;
    }
  };
}

// ============================================
// 辅助函数
// ============================================

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 处理慢请求告警
 */
function handleSlowRequest(
  request: NextRequest,
  route: string,
  duration: number,
  requestId: string,
  statusCode: number
): void {
  globalStats.totalSlowRequests++;

  const severity = duration > 5000 ? 'p0' : 'p1';

  alerts.performanceDegradation(
    route,
    duration,
    2000
  ).catch(err => {
    logger.error('[Monitoring] Failed to send slow request alert', err);
  });

  logger.warn(`[Monitoring] Slow request detected`, {
    requestId,
    method: request.method,
    route,
    duration: `${duration.toFixed(2)}ms`,
    statusCode,
  });
}

/**
 * 检查错误率
 */
function checkErrorRate(route: string): void {
  const report = getApiPerformanceReport();
  const routeStats = report.routes[route];

  if (!routeStats) return;

  // 检查错误率是否超过 10%
  if (routeStats.errorRate > 10) {
    alerts.errorRateSpike(
      routeStats.errorRate,
      5 // baseline
    ).catch(err => {
      logger.error('[Monitoring] Failed to send error rate alert', err);
    });

    logger.warn(`[Monitoring] High error rate detected`, {
      route,
      errorRate: `${routeStats.errorRate.toFixed(2)}%`,
    });
  }
}

/**
 * 发送错误告警
 */
async function sendErrorAlert(
  error: unknown,
  request: NextRequest,
  route: string,
  requestId: string,
  duration: number
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';

  // 只对特定错误发送告警（避免告警风暴）
  const shouldAlert = isCriticalError(error, route);

  if (shouldAlert) {
    alerts.newError(errorMessage, errorType).catch(err => {
      logger.error('[Monitoring] Failed to send error alert', err);
    });
  }
}

/**
 * 判断是否为严重错误
 */
function isCriticalError(error: unknown, route: string): boolean {
  // 对所有路由的错误都进行告警（可调整策略）
  return true;

  // 可选：只对特定路由的错误告警
  // const criticalRoutes = ['/api/auth', '/api/payment'];
  // return criticalRoutes.some(r => route.startsWith(r));
}

// ============================================
// 统计获取函数
// ============================================

/**
 * 获取全局监控统计
 */
export function getMonitoringStats(): MonitoringStats {
  return { ...globalStats };
}

/**
 * 重置监控统计
 */
export function resetMonitoringStats(): void {
  globalStats.totalRequests = 0;
  globalStats.totalErrors = 0;
  globalStats.totalSlowRequests = 0;
  delete globalStats.lastError;
}

// ============================================
// 便捷装饰器
// ============================================

/**
 * GET 请求监控装饰器
 */
export function withGETMonitoring<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options?: MonitoringOptions
) {
  return withMonitoring(handler, options);
}

/**
 * POST 请求监控装饰器
 */
export function withPOSTMonitoring<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options?: MonitoringOptions
) {
  return withMonitoring(handler, options);
}

/**
 * PUT 请求监控装饰器
 */
export function withPUTMonitoring<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options?: MonitoringOptions
) {
  return withMonitoring(handler, options);
}

/**
 * DELETE 请求监控装饰器
 */
export function withDELETEMonitoring<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options?: MonitoringOptions
) {
  return withMonitoring(handler, options);
}
