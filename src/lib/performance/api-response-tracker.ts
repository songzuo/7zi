/**
 * API Response Time Tracker
 * API 响应时间追踪器
 *
 * 功能：
 * - 追踪 API 请求响应时间
 * - 计算平均、最小、最大、P95、P99 统计
 * - 慢请求检测与告警
 * - 按端点和方法分组统计
 */

import { performance } from 'perf_hooks';
import { recordCustomMetric } from '@/lib/monitoring';

// ============================================
// 类型定义
// ============================================

export interface ApiRequestMetric {
  requestId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface EndpointStats {
  endpoint: string;
  method: string;
  count: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
  successRate: number;
  slowCount: number;
  errorCount: number;
}

export interface ApiTrackerConfig {
  slowThreshold: number;
  criticalThreshold: number;
  maxMetrics: number;
  enablePercentiles: boolean;
}

// ============================================
// 默认配置
// ============================================

const DEFAULT_CONFIG: ApiTrackerConfig = {
  slowThreshold: 500,
  criticalThreshold: 2000,
  maxMetrics: 1000,
  enablePercentiles: true,
};

// ============================================
// API 响应时间追踪器
// ============================================

export class ApiResponseTimeTracker {
  private metrics: ApiRequestMetric[] = [];
  private config: ApiTrackerConfig;
  private endpointMetrics: Map<string, ApiRequestMetric[]> = new Map();

  constructor(config: Partial<ApiTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 开始追踪请求
   */
  startTracking(requestId: string, endpoint: string, method: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordRequest({
        requestId,
        endpoint,
        method,
        statusCode: 0, // 将在结束时更新
        duration,
        timestamp: Date.now(),
        success: true,
      });
    };
  }

  /**
   * 记录请求完成
   */
  recordRequest(metric: Partial<ApiRequestMetric> & Pick<ApiRequestMetric, 'requestId' | 'endpoint' | 'method' | 'duration' | 'success'>): void {
    const fullMetric: ApiRequestMetric = {
      requestId: metric.requestId,
      endpoint: metric.endpoint,
      method: metric.method,
      statusCode: metric.statusCode ?? 0,
      duration: metric.duration,
      timestamp: metric.timestamp ?? Date.now(),
      success: metric.success,
      error: metric.error,
      metadata: metric.metadata,
    };

    // 添加到全局指标
    this.metrics.push(fullMetric);

    // 按端点分组
    const key = this.getEndpointKey(metric.endpoint, metric.method);
    if (!this.endpointMetrics.has(key)) {
      this.endpointMetrics.set(key, []);
    }
    this.endpointMetrics.get(key)!.push(fullMetric);

    // 检查慢请求
    this.checkSlowRequest(fullMetric);

    // 限制内存使用
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics.shift();
    }

    // 记录到监控系统
    recordCustomMetric(
      `api.response.${metric.method.toLowerCase()}`,
      metric.duration,
      'api',
      {
        endpoint: metric.endpoint,
        statusCode: metric.statusCode,
        success: metric.success,
        requestId: metric.requestId,
      }
    );
  }

  /**
   * 检查慢请求
   */
  private checkSlowRequest(metric: ApiRequestMetric): void {
    const { slowThreshold, criticalThreshold } = this.config;

    if (metric.duration > criticalThreshold) {
      // 严重性能问题 - 应该触发告警
      this.triggerAlert('critical', metric, criticalThreshold);
    } else if (metric.duration > slowThreshold) {
      // 慢请求 - 记录警告
      this.triggerAlert('warning', metric, slowThreshold);
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(
    level: 'critical' | 'warning',
    metric: ApiRequestMetric,
    threshold: number
  ): void {
    // 这里可以集成到告警系统
    const alert = {
      level,
      metric: 'api_response_time',
      endpoint: metric.endpoint,
      method: metric.method,
      duration: metric.duration,
      threshold,
      requestId: metric.requestId,
      timestamp: metric.timestamp,
    };

    // 发送到监控系统的自定义指标
    recordCustomMetric(
      `api.alert.${level}`,
      metric.duration,
      'api',
      alert
    );
  }

  /**
   * 获取端点统计
   */
  getEndpointStats(endpoint: string, method: string): EndpointStats {
    const key = this.getEndpointKey(endpoint, method);
    const metrics = this.endpointMetrics.get(key) || [];

    if (metrics.length === 0) {
      return {
        endpoint,
        method,
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p95: 0,
        p99: 0,
        successRate: 0,
        slowCount: 0,
        errorCount: 0,
      };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.success).length;
    const slowCount = metrics.filter(m => m.duration > this.config.slowThreshold).length;
    const errorCount = metrics.filter(m => !m.success).length;

    return {
      endpoint,
      method,
      count: metrics.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      p95: this.calculatePercentile(durations, 95),
      p99: this.calculatePercentile(durations, 99),
      successRate: (successCount / metrics.length) * 100,
      slowCount,
      errorCount,
    };
  }

  /**
   * 获取所有端点统计
   */
  getAllEndpointStats(): EndpointStats[] {
    const stats: EndpointStats[] = [];

    for (const [key] of this.endpointMetrics) {
      const [endpoint, method] = key.split(':');
      stats.push(this.getEndpointStats(endpoint, method));
    }

    // 按平均响应时间排序
    return stats.sort((a, b) => b.avg - a.avg);
  }

  /**
   * 获取慢请求列表
   */
  getSlowRequests(threshold?: number): ApiRequestMetric[] {
    const slowThreshold = threshold || this.config.slowThreshold;
    return this.metrics.filter(m => m.duration > slowThreshold)
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * 获取统计摘要
   */
  getSummary(): {
    totalRequests: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
    slowRate: number;
    errorRate: number;
  } {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        slowRate: 0,
        errorRate: 0,
      };
    }

    const durations = this.metrics.map(m => m.duration);
    const successCount = this.metrics.filter(m => m.success).length;
    const slowCount = this.metrics.filter(m => m.duration > this.config.slowThreshold).length;
    const errorCount = this.metrics.filter(m => !m.success).length;

    return {
      totalRequests: this.metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successCount / this.metrics.length) * 100,
      slowRate: (slowCount / this.metrics.length) * 100,
      errorRate: (errorCount / this.metrics.length) * 100,
    };
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(sortedDurations: number[], percentile: number): number {
    if (!this.config.enablePercentiles || sortedDurations.length === 0) {
      return 0;
    }

    const index = Math.ceil((percentile / 100) * sortedDurations.length) - 1;
    return sortedDurations[Math.max(0, index)];
  }

  /**
   * 获取端点键
   */
  private getEndpointKey(endpoint: string, method: string): string {
    return `${endpoint}:${method}`;
  }

  /**
   * 清除所有指标
   */
  clear(): void {
    this.metrics = [];
    this.endpointMetrics.clear();
  }

  /**
   * 清除旧指标
   */
  clearOldMetrics(olderThanMs: number): void {
    const cutoff = Date.now() - olderThanMs;

    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);

    for (const [key, metrics] of this.endpointMetrics) {
      this.endpointMetrics.set(key, metrics.filter(m => m.timestamp > cutoff));
    }
  }
}

// ============================================
// 单例实例
// ============================================

export const apiResponseTracker = new ApiResponseTimeTracker();

// ============================================
// 便捷函数
// ============================================

/**
 * 追踪 API 响应时间
 */
export function trackApiResponse(
  requestId: string,
  endpoint: string,
  method: string
): [() => void, (statusCode: number, success: boolean, error?: string) => void] {
  const stopTracking = apiResponseTracker.startTracking(requestId, endpoint, method);

  const completeTracking = (statusCode: number, success: boolean, error?: string) => {
    const stop = stopTracking;
    if (stop) {
      stop();
    }
    apiResponseTracker.recordRequest({
      requestId,
      endpoint,
      method,
      statusCode,
      duration: 0, // 已经在 startTracking 中计算
      timestamp: Date.now(),
      success,
      error,
    });
  };

  return [stopTracking, completeTracking];
}

/**
 * 获取 API 性能报告
 */
export function getApiPerformanceReport() {
  return {
    summary: apiResponseTracker.getSummary(),
    endpoints: apiResponseTracker.getAllEndpointStats(),
    slowRequests: apiResponseTracker.getSlowRequests(),
  };
}
