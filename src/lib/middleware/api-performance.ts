/**
 * API Performance Middleware
 * API 性能追踪中间件
 *
 * 功能：
 * - 自动追踪 API 请求响应时间
 * - 慢查询告警（>500ms）
 * - 性能指标收集
 * - 错误率统计
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordCustomMetric } from '@/lib/monitoring/performance.monitor';
import { logger } from '@/lib/logger';

// ============================================
// 类型定义
// ============================================

export interface ApiPerformanceData {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  success: boolean;
  errorMessage?: string;
}

export interface ApiPerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  slowRequests: number; // >500ms
  errors: Map<number, number>; // status code -> count
}

/**
 * Route-specific performance statistics
 */
export interface RoutePerformanceStats {
  count: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  errors: number;
  errorRate: number;
  slowRequests: number;
  slowRequestRate: number;
}

// ============================================
// 配置
// ============================================

const SLOW_REQUEST_THRESHOLD = 500; // 500ms
const CRITICAL_REQUEST_THRESHOLD = 2000; // 2000ms

// ============================================
// 性能指标存储（内存中）
// ============================================

export class ApiPerformanceCollector {
  private metrics: Map<string, ApiPerformanceData[]> = new Map();
  private summary: ApiPerformanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageDuration: 0,
    maxDuration: 0,
    minDuration: Infinity,
    slowRequests: 0,
    errors: new Map(),
  };
  private maxRecordsPerRoute = 100;

  /**
   * 记录 API 请求性能
   */
  record(data: ApiPerformanceData) {
    const { path } = data;

    // 存储到路由特定的列表
    if (!this.metrics.has(path)) {
      this.metrics.set(path, []);
    }

    const routeMetrics = this.metrics.get(path)!;
    routeMetrics.push(data);

    // 限制记录数量
    if (routeMetrics.length > this.maxRecordsPerRoute) {
      routeMetrics.shift();
    }

    // 更新汇总统计
    this.updateSummary(data);

    // 记录自定义指标
    recordCustomMetric(`api.${path}`, data.duration, 'api', {
      method: data.method,
      statusCode: data.statusCode,
      success: data.success,
    });

    // 检查慢查询告警
    this.checkSlowRequestAlert(data);
  }

  /**
   * 更新汇总统计
   */
  private updateSummary(data: ApiPerformanceData) {
    this.summary.totalRequests++;

    if (data.success) {
      this.summary.successfulRequests++;
    } else {
      this.summary.failedRequests++;
    }

    // 更新响应时间统计
    if (data.duration > this.summary.maxDuration) {
      this.summary.maxDuration = data.duration;
    }

    if (data.duration < this.summary.minDuration) {
      this.summary.minDuration = data.duration;
    }

    // 计算平均响应时间
    const totalDuration =
      this.summary.averageDuration * (this.summary.totalRequests - 1) + data.duration;
    this.summary.averageDuration = totalDuration / this.summary.totalRequests;

    // 检查慢请求
    if (data.duration > SLOW_REQUEST_THRESHOLD) {
      this.summary.slowRequests++;
    }

    // 统计错误状态码
    if (!data.success) {
      const errorCount = this.summary.errors.get(data.statusCode) || 0;
      this.summary.errors.set(data.statusCode, errorCount + 1);
    }
  }

  /**
   * 检查慢查询告警
   */
  private checkSlowRequestAlert(data: ApiPerformanceData) {
    if (data.duration > CRITICAL_REQUEST_THRESHOLD) {
      logger.error('[API Performance] Critical slow request detected', {
        requestId: data.requestId,
        method: data.method,
        path: data.path,
        statusCode: data.statusCode,
        duration: data.duration,
        timestamp: new Date(data.timestamp).toISOString(),
      });
    } else if (data.duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('[API Performance] Slow request detected', {
        requestId: data.requestId,
        method: data.method,
        path: data.path,
        statusCode: data.statusCode,
        duration: data.duration,
        timestamp: new Date(data.timestamp).toISOString(),
      });
    }
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): Map<string, ApiPerformanceData[]> {
    return this.metrics;
  }

  /**
   * 获取汇总统计
   */
  getSummary(): ApiPerformanceMetrics {
    return {
      ...this.summary,
      errors: new Map(this.summary.errors), // 返回副本
    };
  }

  /**
   * 获取特定路由的指标
   */
  getRouteMetrics(path: string): ApiPerformanceData[] {
    return this.metrics.get(path) || [];
  }

  /**
   * 获取慢请求列表（>500ms）
   */
  getSlowRequests(): ApiPerformanceData[] {
    const slowRequests: ApiPerformanceData[] = [];

    this.metrics.forEach((metrics) => {
      metrics
        .filter((m) => m.duration > SLOW_REQUEST_THRESHOLD)
        .forEach((m) => slowRequests.push(m));
    });

    // 按响应时间降序排序
    return slowRequests.sort((a, b) => b.duration - a.duration);
  }

  /**
   * 获取性能报告数据
   */
  getReportData(): {
    summary: Omit<ApiPerformanceMetrics, 'errors'> & { errors: Record<number, number> };
    slowRequests: ApiPerformanceData[];
    routes: Record<string, {
      count: number;
      avgDuration: number;
      maxDuration: number;
      minDuration: number;
      errorRate: number;
    }>;
  } {
    // 转换 errors Map 为对象
    const errorsRecord: Record<number, number> = {};
    this.summary.errors.forEach((count, code) => {
      errorsRecord[code] = count;
    });

    // 计算每个路由的统计
    const routes: Record<string, RoutePerformanceStats> = {};

    this.metrics.forEach((metrics, path) => {
      const durations = metrics.map((m) => m.duration);
      const errors = metrics.filter((m) => !m.success).length;

      routes[path] = {
        count: metrics.length,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        maxDuration: Math.max(...durations),
        minDuration: Math.min(...durations),
        errorRate: (errors / metrics.length) * 100,
        errors,
        slowRequests: metrics.filter((m) => m.duration > SLOW_REQUEST_THRESHOLD).length,
        slowRequestRate: (metrics.filter((m) => m.duration > SLOW_REQUEST_THRESHOLD).length / metrics.length) * 100,
      };
    });

    return {
      summary: {
        ...this.summary,
        errors: errorsRecord,
      },
      slowRequests: this.getSlowRequests(),
      routes,
    };
  }

  /**
   * 清除所有指标
   */
  clear() {
    this.metrics.clear();
    this.summary = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      slowRequests: 0,
      errors: new Map(),
    };
  }
}

// ============================================
// 单例
// ============================================

export const apiPerformanceCollector = new ApiPerformanceCollector();

// ============================================
// 请求包装器
// ============================================

/**
 * 包装 API 请求处理器，自动记录性能
 */
export function withApiPerformanceTracking(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 添加 requestId 到请求头
    const requestWithId = new NextRequest(request, {
      headers: new Headers(request.headers),
    });
    requestWithId.headers.set('x-request-id', requestId);

    try {
      // 执行原始处理器
      const response = await handler(requestWithId);

      // 计算响应时间
      const duration = Date.now() - startTime;
      const url = new URL(request.url);
      const path = url.pathname;

      // 记录性能数据
      apiPerformanceCollector.record({
        requestId,
        method: request.method,
        path,
        statusCode: response.status,
        duration,
        timestamp: Date.now(),
        success: response.status >= 200 && response.status < 400,
      });

      // 添加性能响应头
      response.headers.set('x-request-id', requestId);
      response.headers.set('x-response-time', `${duration.toFixed(2)}ms`);

      return response;
    } catch (error) {
      // 计算响应时间
      const duration = Date.now() - startTime;
      const url = new URL(request.url);
      const path = url.pathname;

      // 记录错误性能数据
      apiPerformanceCollector.record({
        requestId,
        method: request.method,
        path,
        statusCode: 500,
        duration,
        timestamp: Date.now(),
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      // 重新抛出错误
      throw error;
    }
  };
}

// ============================================
// 获取性能报告
// ============================================

export function getApiPerformanceReport() {
  return apiPerformanceCollector.getReportData();
}

export interface ApiMetricsSummary {
  total: number;
  successRate: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  slowRequests: number;
  successfulRequests: number;
  failedRequests: number;
  byPath: Record<string, RoutePerformanceStats>;
}

export function getApiMetricsSummary(): ApiMetricsSummary {
  const report = apiPerformanceCollector.getReportData();
  const summary = report.summary;
  
  return {
    total: summary.totalRequests,
    successRate: summary.totalRequests > 0 
      ? (summary.successfulRequests / summary.totalRequests) * 100 
      : 0,
    averageDuration: summary.averageDuration,
    maxDuration: summary.maxDuration,
    minDuration: summary.minDuration === Infinity ? 0 : summary.minDuration,
    slowRequests: summary.slowRequests,
    successfulRequests: summary.successfulRequests,
    failedRequests: summary.failedRequests,
    byPath: report.routes.reduce((acc, route) => {
      acc[route.path] = {
        count: route.stats.count,
        avgDuration: route.stats.avgDuration,
        maxDuration: route.stats.maxDuration,
        minDuration: route.stats.minDuration,
        errors: route.stats.errors,
        errorRate: route.stats.errorRate,
        slowRequests: route.stats.slowRequests,
        slowRequestRate: route.stats.slowRequestRate,
      };
      return acc;
    }, {} as Record<string, RoutePerformanceStats>),
  };
}

export function getApiMetrics(): ApiPerformanceData[] {
  const report = apiPerformanceCollector.getReportData();
  return report.routes.reduce<ApiPerformanceData[]>(
    (all, route) => [...all, ...route.metrics],
    []
  );
}

export function getRecentMetrics(minutes: number = 5): ApiPerformanceData[] {
  const report = apiPerformanceCollector.getReportData();
  const cutoff = Date.now() - minutes * 60 * 1000;
  return report.routes.reduce<ApiPerformanceData[]>(
    (all, route) => [
      ...all,
      ...route.metrics.filter(m => m.timestamp >= cutoff),
    ],
    []
  );
}

export function clearApiMetrics() {
  apiPerformanceCollector.clear();
}

/**
 * 清除性能数据
 */
export function clearApiPerformanceData() {
  apiPerformanceCollector.clear();
}
