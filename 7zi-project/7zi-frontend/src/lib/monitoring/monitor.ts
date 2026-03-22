/**
 * Performance Monitor
 * 性能监控核心类
 */

import { v4 as uuidv4 } from 'uuid';
import {
  PerformanceMetric,
  APIMetric,
  ErrorMetric,
  OperationMetric,
  AggregatedMetrics,
  AlarmEvent,
  MonitoringConfig,
} from './types';
import { getMonitoringConfig } from './config';
import { MonitoringStorage, MemoryStorage, LocalStorageStorage } from './storage';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: MonitoringConfig;
  private storage: MonitoringStorage;
  private activeOperations: Map<string, { startTime: number; name: string }> =
    new Map();

  private constructor() {
    this.config = getMonitoringConfig();
    this.storage = this.createStorage();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private createStorage(): MonitoringStorage {
    switch (this.config.storageType) {
      case 'localStorage':
        return new LocalStorageStorage(this.config.retentionPeriodMs);
      case 'memory':
      default:
        return new MemoryStorage(this.config.retentionPeriodMs);
    }
  }

  private shouldSample(): boolean {
    if (!this.config.enabled) return false;
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Track API request performance
   * 追踪 API 请求性能
   */
  async trackAPIRequest(
    method: APIMetric['method'],
    endpoint: string,
    statusCode: number,
    responseTime: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.shouldSample()) return;

    const metric: APIMetric = {
      id: uuidv4(),
      name: `API ${method} ${endpoint}`,
      timestamp: Date.now(),
      type: 'api',
      method,
      endpoint,
      statusCode,
      responseTime,
      success: statusCode >= 200 && statusCode < 300,
      value: responseTime,
      unit: 'ms',
      metadata,
    };

    await this.storage.saveMetric(metric);

    // 检查是否触发告警
    if (this.config.alarms.responseTime.enabled) {
      await this.checkResponseTimeAlarm();
    }
    if (this.config.alarms.errorRate.enabled) {
      await this.checkErrorRateAlarm();
    }
  }

  /**
   * Track error
   * 追踪错误
   */
  async trackError(
    errorType: string,
    errorMessage: string,
    stackTrace?: string,
    context?: Record<string, any>
  ): Promise<void> {
    if (!this.shouldSample()) return;

    const metric: ErrorMetric = {
      id: uuidv4(),
      name: `Error: ${errorType}`,
      timestamp: Date.now(),
      type: 'error',
      errorType,
      errorMessage,
      stackTrace,
      context,
      value: 1,
      unit: 'count',
    };

    await this.storage.saveMetric(metric);

    // 检查是否触发错误率告警
    if (this.config.alarms.errorRate.enabled) {
      await this.checkErrorRateAlarm();
    }
  }

  /**
   * Start tracking an operation
   * 开始追踪操作
   */
  startOperation(operationName: string): string {
    const operationId = uuidv4();
    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      name: operationName,
    });
    return operationId;
  }

  /**
   * End tracking an operation
   * 结束追踪操作
   */
  async endOperation(
    operationId: string,
    success: boolean = true,
    metadata?: Record<string, any>
  ): Promise<void> {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    const duration = Date.now() - operation.startTime;
    this.activeOperations.delete(operationId);

    if (!this.shouldSample()) return;

    const metric: OperationMetric = {
      id: uuidv4(),
      name: operation.name,
      timestamp: Date.now(),
      type: 'operation',
      operationName: operation.name,
      duration,
      success,
      value: duration,
      unit: 'ms',
      metadata,
    };

    await this.storage.saveMetric(metric);

    // 检查是否触发操作时长告警
    if (this.config.alarms.operationDuration.enabled) {
      await this.checkOperationDurationAlarm();
    }
  }

  /**
   * Track custom metric
   * 追踪自定义指标
   */
  async trackCustomMetric(
    name: string,
    value: number,
    unit: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.shouldSample()) return;

    const metric: PerformanceMetric = {
      id: uuidv4(),
      name,
      timestamp: Date.now(),
      type: 'custom',
      value,
      unit,
      metadata,
    };

    await this.storage.saveMetric(metric);
  }

  /**
   * Get aggregated metrics
   * 获取聚合指标
   */
  async getAggregatedMetrics(
    timeWindowMs: number = 5 * 60 * 1000
  ): Promise<AggregatedMetrics> {
    const endTime = Date.now();
    const startTime = endTime - timeWindowMs;

    const allMetrics = await this.storage.getMetricsByTimeRange(startTime, endTime);

    // API Metrics
    const apiMetrics = allMetrics.filter((m) => m.type === 'api') as APIMetric[];
    const totalRequests = apiMetrics.length;
    const averageResponseTime =
      totalRequests > 0
        ? apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
        : 0;
    const successCount = apiMetrics.filter((m) => m.success).length;
    const successRate = totalRequests > 0 ? successCount / totalRequests : 0;
    const errorCount = totalRequests - successCount;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

    // Operation Metrics
    const operationMetrics = allMetrics.filter((m) => m.type === 'operation') as OperationMetric[];
    const totalOperations = operationMetrics.length;
    const averageDuration =
      totalOperations > 0
        ? operationMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations
        : 0;
    const operationSuccessCount = operationMetrics.filter((m) => m.success).length;
    const operationSuccessRate =
      totalOperations > 0 ? operationSuccessCount / totalOperations : 0;

    // Error Metrics
    const errorMetrics = allMetrics.filter((m) => m.type === 'error') as ErrorMetric[];
    const totalErrors = errorMetrics.length;
    const errorsByType: Record<string, number> = {};
    errorMetrics.forEach((e) => {
      errorsByType[e.errorType] = (errorsByType[e.errorType] || 0) + 1;
    });

    return {
      apiMetrics: {
        totalRequests,
        averageResponseTime,
        successRate,
        errorCount,
        errorRate,
      },
      operationMetrics: {
        totalOperations,
        averageDuration,
        successRate: operationSuccessRate,
      },
      errorMetrics: {
        totalErrors,
        errorsByType,
      },
      timeWindow: {
        start: startTime,
        end: endTime,
      },
    };
  }

  /**
   * Check and trigger alarms
   * 检查并触发告警
   */
  private async checkErrorRateAlarm(): Promise<void> {
    const config = this.config.alarms.errorRate;
    if (!config.enabled) return;

    const now = Date.now();
    const startTime = now - config.windowMs;
    const metrics = await this.storage.getMetrics({ startTime, type: 'api' });

    if (metrics.length === 0) return;

    const errorCount = metrics.filter((m) => !(m as APIMetric).success).length;
    const errorRate = errorCount / metrics.length;

    if (errorRate > config.threshold) {
      await this.triggerAlarm({
        id: uuidv4(),
        timestamp: now,
        type: 'errorRate',
        currentValue: errorRate,
        threshold: config.threshold,
        message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(config.threshold * 100).toFixed(2)}%`,
        severity: errorRate > config.threshold * 2 ? 'critical' : 'high',
      });
    }
  }

  private async checkResponseTimeAlarm(): Promise<void> {
    const config = this.config.alarms.responseTime;
    if (!config.enabled) return;

    const now = Date.now();
    const startTime = now - config.windowMs;
    const metrics = await this.storage.getMetrics({ startTime, type: 'api' });

    if (metrics.length === 0) return;

    const avgResponseTime =
      metrics.reduce((sum, m) => sum + (m as APIMetric).responseTime, 0) / metrics.length;

    if (avgResponseTime > config.threshold) {
      await this.triggerAlarm({
        id: uuidv4(),
        timestamp: now,
        type: 'responseTime',
        currentValue: avgResponseTime,
        threshold: config.threshold,
        message: `Average response time ${avgResponseTime.toFixed(0)}ms exceeds threshold ${config.threshold}ms`,
        severity: avgResponseTime > config.threshold * 2 ? 'critical' : 'high',
      });
    }
  }

  private async checkOperationDurationAlarm(): Promise<void> {
    const config = this.config.alarms.operationDuration;
    if (!config.enabled) return;

    const now = Date.now();
    const startTime = now - config.windowMs;
    const metrics = await this.storage.getMetrics({ startTime, type: 'operation' });

    if (metrics.length === 0) return;

    const avgDuration =
      metrics.reduce((sum, m) => sum + (m as OperationMetric).duration, 0) / metrics.length;

    if (avgDuration > config.threshold) {
      await this.triggerAlarm({
        id: uuidv4(),
        timestamp: now,
        type: 'operationDuration',
        currentValue: avgDuration,
        threshold: config.threshold,
        message: `Average operation duration ${avgDuration.toFixed(0)}ms exceeds threshold ${config.threshold}ms`,
        severity: avgDuration > config.threshold * 2 ? 'critical' : 'high',
      });
    }
  }

  private async triggerAlarm(event: AlarmEvent): Promise<void> {
    // Save alarm event
    await this.storage.saveAlarm(event);

    // Log to console
    console.warn(`[MONITORING ALARM] ${event.message}`, {
      severity: event.severity,
      currentValue: event.currentValue,
      threshold: event.threshold,
    });
  }

  /**
   * Get alarms
   * 获取告警列表
   */
  async getAlarms(startTime?: number): Promise<AlarmEvent[]> {
    return this.storage.getAlarms(startTime);
  }

  /**
   * Clear all data
   * 清除所有数据
   */
  async clearAllData(): Promise<void> {
    await this.storage.clearMetrics();
    await this.storage.clearAlarms();
  }

  /**
   * Get all metrics
   * 获取所有指标
   */
  async getMetrics(filter?: {
    type?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<PerformanceMetric[]> {
    return this.storage.getMetrics(filter);
  }

  /**
   * Get metrics count
   * 获取指标数量
   */
  async getMetricsCount(): Promise<number> {
    return this.storage.getMetricsCount();
  }

  /**
   * Update config
   * 更新配置
   */
  updateConfig(partialConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...partialConfig };
  }
}

// Export singleton instance
export const monitor = PerformanceMonitor.getInstance();
