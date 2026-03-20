/**
 * API Performance Logger Enhancement
 * API 性能日志记录增强
 *
 * 在现有的 api-logger 基础上添加性能追踪
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { performance } from 'perf_hooks';
import { recordCustomMetric } from '@/lib/monitoring';

// 性能阈值配置
export const PERFORMANCE_THRESHOLDS = {
  slow: 500,      // 慢查询阈值 (ms)
  critical: 2000, // 严重性能问题阈值 (ms)
  warning: 1000,  // 警告阈值 (ms)
};

// ============================================
// 类型定义
// ============================================

export interface PerformanceMetadata {
  requestId: string;
  startTime: number;
  path: string;
  method: string;
  query: Record<string, string>;
}

export interface PerformanceSummary {
  duration: number;
  isSlow: boolean;
  isCritical: boolean;
  isWarning: boolean;
}

// ============================================
// 性能监控函数
// ============================================

/**
 * 记录 API 请求性能
 */
export function logApiPerformance(
  metadata: PerformanceMetadata,
  statusCode: number,
  success: boolean
): PerformanceSummary {
  const endTime = performance.now();
  const duration = endTime - metadata.startTime;

  const isSlow = duration > PERFORMANCE_THRESHOLDS.slow;
  const isCritical = duration > PERFORMANCE_THRESHOLDS.critical;
  const isWarning = duration > PERFORMANCE_THRESHOLDS.warning;

  // 记录自定义指标
  recordCustomMetric(`api.${metadata.path}`, duration, 'api', {
    method: metadata.method,
    statusCode,
    success,
    requestId: metadata.requestId,
  });

  // 根据性能级别记录日志
  if (isCritical) {
    logger.error('[API Performance] Critical performance issue detected', {
      requestId: metadata.requestId,
      path: metadata.path,
      method: metadata.method,
      statusCode,
      duration: `${duration.toFixed(2)}ms`,
      query: metadata.query,
      timestamp: new Date().toISOString(),
    });
  } else if (isSlow) {
    logger.warn('[API Performance] Slow request detected', {
      requestId: metadata.requestId,
      path: metadata.path,
      method: metadata.method,
      statusCode,
      duration: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    duration,
    isSlow,
    isCritical,
    isWarning,
  };
}

/**
 * 检查并记录慢查询
 */
export function checkSlowQuery(
  metadata: PerformanceMetadata,
  queryName: string,
  queryDuration: number
): void {
  const threshold = PERFORMANCE_THRESHOLDS.slow;

  if (queryDuration > threshold) {
    logger.warn('[API Performance] Slow database query detected', {
      requestId: metadata.requestId,
      path: metadata.path,
      method: metadata.method,
      queryName,
      duration: `${queryDuration.toFixed(2)}ms`,
      threshold: `${threshold}ms`,
      timestamp: new Date().toISOString(),
    });

    // 记录自定义指标
    recordCustomMetric(`db.query.${queryName}`, queryDuration, 'api', {
      requestId: metadata.requestId,
      path: metadata.path,
    });
  }
}

/**
 * 创建性能追踪包装器
 */
export function withPerformanceTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  operationName: string,
  metadata: PerformanceMetadata
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const startTime = performance.now();

    try {
      const result = await fn(...args) as Awaited<ReturnType<T>>;
      const duration = performance.now() - startTime;

      // 记录操作性能
      recordCustomMetric(`operation.${operationName}`, duration, 'api', {
        requestId: metadata.requestId,
        path: metadata.path,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      // 记录失败的操作
      recordCustomMetric(`operation.${operationName}`, duration, 'api', {
        requestId: metadata.requestId,
        path: metadata.path,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }) as T;
}

/**
 * 获取性能摘要信息
 */
export function getPerformanceSummary(duration: number): {
  level: 'fast' | 'moderate' | 'slow' | 'critical';
  color: string;
  message: string;
} {
  if (duration > PERFORMANCE_THRESHOLDS.critical) {
    return {
      level: 'critical',
      color: '🔴',
      message: `Critical performance issue: ${duration.toFixed(2)}ms`,
    };
  } else if (duration > PERFORMANCE_THRESHOLDS.warning) {
    return {
      level: 'slow',
      color: '🟠',
      message: `Slow response: ${duration.toFixed(2)}ms`,
    };
  } else if (duration > PERFORMANCE_THRESHOLDS.slow) {
    return {
      level: 'moderate',
      color: '🟡',
      message: `Moderate performance: ${duration.toFixed(2)}ms`,
    };
  } else {
    return {
      level: 'fast',
      color: '🟢',
      message: `Fast response: ${duration.toFixed(2)}ms`,
    };
  }
}
