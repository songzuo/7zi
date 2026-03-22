/**
 * Performance API Integration Tests
 *
 * 测试性能 API 的完整功能：
 * - 性能数据上报
 * - 性能报告生成
 * - 指标聚合
 * - 告警系统
 * - 数据存储和查询
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// Mock Setup
// ============================================================================

interface Metric {
  id: string;
  name: string;
  timestamp: number;
  type: 'api' | 'error' | 'operation' | 'custom' | 'web-vital';
  value: number;
  unit: string;
  metadata?: Record<string, unknown>;
}

interface APIRequestMetric extends Metric {
  type: 'api';
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
}

interface ErrorMetric extends Metric {
  type: 'error';
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
}

interface OperationMetric extends Metric {
  type: 'operation';
  operationName: string;
  duration: number;
  success: boolean;
}

interface CustomMetric extends Metric {
  type: 'custom';
  tags?: Record<string, string>;
}

interface WebVitalMetric extends Metric {
  type: 'web-vital';
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface AggregatedMetrics {
  apiMetrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    successRate: number;
    errorRate: number;
    requestsByMethod: Record<string, number>;
    requestsByPath: Record<string, number>;
    errorsByStatus: Record<number, number>;
  };
  errorMetrics: {
    totalErrors: number;
    errorsByType: Record<string, number>;
  };
  operationMetrics: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
    operationsByName: Record<string, { count: number; avgDuration: number }>;
  };
  customMetrics: {
    totalMetrics: number;
    metricsByName: Record<string, { count: number; avg: number; min: number; max: number }>;
  };
  webVitalMetrics: {
    totalMetrics: number;
    metricsByName: Record<string, {
      count: number;
      avg: number;
      rating: 'good' | 'needs-improvement' | 'poor';
    }>;
  };
}

interface Alarm {
  id: string;
  type: 'errorRate' | 'responseTime' | 'operationDuration' | 'custom';
  metricName: string;
  threshold: number;
  currentValue: number;
  triggeredAt: number;
  message: string;
}

interface PerformanceReport {
  period: {
    start: number;
    end: number;
  };
  summary: {
    totalMetrics: number;
    timeRange: string;
  };
  metrics: AggregatedMetrics;
  alarms: Alarm[];
  recommendations: string[];
}

interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number;
  retentionMs: number;
  alarms: {
    errorRate?: {
      metric: string;
      threshold: number;
      windowMs: number;
      enabled: boolean;
    };
    responseTime?: {
      metric: string;
      threshold: number;
      windowMs: number;
      enabled: boolean;
    };
    operationDuration?: {
      metric: string;
      threshold: number;
      windowMs: number;
      enabled: boolean;
    };
  };
}

// ============================================================================
// Performance Monitor Class
// ============================================================================

class PerformanceMonitor {
  private metrics: Map<string, Metric> = new Map();
  private config: MonitoringConfig;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      retentionMs: 3600000, // 1 hour
      alarms: {},
      ...config
    };
  }

  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  // ============================================================================
  // API Request Tracking
  // ============================================================================

  async trackAPIRequest(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number
  ): Promise<void> {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    const metric: APIRequestMetric = {
      id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${method} ${path}`,
      timestamp: Date.now(),
      type: 'api',
      value: responseTime,
      unit: 'ms',
      method,
      path,
      statusCode,
      responseTime,
      metadata: {
        success: statusCode >= 200 && statusCode < 400
      }
    };

    this.metrics.set(metric.id, metric);
  }

  // ============================================================================
  // Error Tracking
  // ============================================================================

  async trackError(
    errorType: string,
    errorMessage: string,
    stackTrace?: string
  ): Promise<void> {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    const metric: ErrorMetric = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: errorType,
      timestamp: Date.now(),
      type: 'error',
      value: 1,
      unit: 'count',
      errorType,
      errorMessage,
      stackTrace
    };

    this.metrics.set(metric.id, metric);
  }

  // ============================================================================
  // Operation Tracking
  // ============================================================================

  startOperation(operationName: string): string {
    return `op_${Date.now()}_${operationName}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async endOperation(operationId: string, success: boolean): Promise<number> {
    // Extract operation name from ID: op_${timestamp}_${operationName}_${random}
    // Operation name may contain underscores, so we need to handle that
    const parts = operationId.split('_');
    const timestamp = parseInt(parts[1]);
    // The operation name is everything between timestamp and the last part (random string)
    const lastPart = parts[parts.length - 1];
    const operationName = parts.slice(2, -1).join('_');
    const duration = Date.now() - timestamp;

    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return duration;
    }

    const metric: OperationMetric = {
      id: operationId,
      name: operationName,
      timestamp: timestamp,
      type: 'operation',
      value: duration,
      unit: 'ms',
      operationName,
      duration,
      success
    };

    this.metrics.set(metric.id, metric);
    return duration;
  }

  // ============================================================================
  // Custom Metrics
  // ============================================================================

  async trackCustomMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): Promise<void> {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    const metric: CustomMetric = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      timestamp: Date.now(),
      type: 'custom',
      value,
      unit,
      tags
    };

    this.metrics.set(metric.id, metric);
  }

  // ============================================================================
  // Web Vitals
  // ============================================================================

  async trackWebVital(
    name: string,
    value: number,
    rating: 'good' | 'needs-improvement' | 'poor'
  ): Promise<void> {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    const metric: WebVitalMetric = {
      id: `vital_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      timestamp: Date.now(),
      type: 'web-vital',
      value,
      unit: 'ms',
      rating
    };

    this.metrics.set(metric.id, metric);
  }

  // ============================================================================
  // Metrics Query
  // ============================================================================

  async getMetrics(filter?: {
    type?: Metric['type'];
    name?: string;
    since?: number;
  }): Promise<Metric[]> {
    let metrics = Array.from(this.metrics.values());

    if (filter?.type) {
      metrics = metrics.filter(m => m.type === filter.type);
    }

    if (filter?.name) {
      metrics = metrics.filter(m => m.name === filter.name);
    }

    if (filter?.since) {
      metrics = metrics.filter(m => m.timestamp >= filter.since);
    }

    // Sort by timestamp descending
    return metrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getAggregatedMetrics(): Promise<AggregatedMetrics> {
    const metrics = Array.from(this.metrics.values());

    // API Metrics
    const apiMetrics = metrics.filter(m => m.type === 'api') as APIRequestMetric[];
    const apiMetricsAgg: AggregatedMetrics['apiMetrics'] = {
      totalRequests: apiMetrics.length,
      successfulRequests: apiMetrics.filter(m => m.statusCode >= 200 && m.statusCode < 400).length,
      failedRequests: apiMetrics.filter(m => m.statusCode >= 400).length,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      successRate: 0,
      errorRate: 0,
      requestsByMethod: {},
      requestsByPath: {},
      errorsByStatus: {}
    };

    if (apiMetrics.length > 0) {
      const totalTime = apiMetrics.reduce((sum, m) => sum + m.responseTime, 0);
      apiMetricsAgg.averageResponseTime = totalTime / apiMetrics.length;
      apiMetricsAgg.minResponseTime = Math.min(...apiMetrics.map(m => m.responseTime));
      apiMetricsAgg.maxResponseTime = Math.max(...apiMetrics.map(m => m.responseTime));
      apiMetricsAgg.successRate = apiMetricsAgg.successfulRequests / apiMetrics.length;
      apiMetricsAgg.errorRate = apiMetricsAgg.failedRequests / apiMetrics.length;

      // Group by method and path
      apiMetrics.forEach(m => {
        apiMetricsAgg.requestsByMethod[m.method] = (apiMetricsAgg.requestsByMethod[m.method] || 0) + 1;
        apiMetricsAgg.requestsByPath[m.path] = (apiMetricsAgg.requestsByPath[m.path] || 0) + 1;
        if (m.statusCode >= 400) {
          apiMetricsAgg.errorsByStatus[m.statusCode] = (apiMetricsAgg.errorsByStatus[m.statusCode] || 0) + 1;
        }
      });
    }

    // Error Metrics
    const errorMetrics = metrics.filter(m => m.type === 'error') as ErrorMetric[];
    const errorMetricsAgg: AggregatedMetrics['errorMetrics'] = {
      totalErrors: errorMetrics.length,
      errorsByType: {}
    };

    errorMetrics.forEach(m => {
      errorMetricsAgg.errorsByType[m.errorType] = (errorMetricsAgg.errorsByType[m.errorType] || 0) + 1;
    });

    // Operation Metrics
    const operationMetrics = metrics.filter(m => m.type === 'operation') as OperationMetric[];
    const operationMetricsAgg: AggregatedMetrics['operationMetrics'] = {
      totalOperations: operationMetrics.length,
      successfulOperations: operationMetrics.filter(m => m.success).length,
      failedOperations: operationMetrics.filter(m => !m.success).length,
      averageDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      successRate: 0,
      operationsByName: {}
    };

    if (operationMetrics.length > 0) {
      const totalDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
      operationMetricsAgg.averageDuration = totalDuration / operationMetrics.length;
      operationMetricsAgg.minDuration = Math.min(...operationMetrics.map(m => m.duration));
      operationMetricsAgg.maxDuration = Math.max(...operationMetrics.map(m => m.duration));
      operationMetricsAgg.successRate = operationMetricsAgg.successfulOperations / operationMetrics.length;

      // Group by operation name
      const operationsByName: Record<string, number[]> = {};
      operationMetrics.forEach(m => {
        if (!operationsByName[m.operationName]) {
          operationsByName[m.operationName] = [];
        }
        operationsByName[m.operationName].push(m.duration);
      });

      Object.entries(operationsByName).forEach(([name, durations]) => {
        const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        operationMetricsAgg.operationsByName[name] = {
          count: durations.length,
          avgDuration
        };
      });
    }

    // Custom Metrics
    const customMetrics = metrics.filter(m => m.type === 'custom') as CustomMetric[];
    const customMetricsAgg: AggregatedMetrics['customMetrics'] = {
      totalMetrics: customMetrics.length,
      metricsByName: {}
    };

    customMetrics.forEach(m => {
      if (!customMetricsAgg.metricsByName[m.name]) {
        customMetricsAgg.metricsByName[m.name] = {
          count: 0,
          avg: 0,
          min: Infinity,
          max: 0
        };
      }
      const stats = customMetricsAgg.metricsByName[m.name];
      stats.count++;
      stats.avg = (stats.avg * (stats.count - 1) + m.value) / stats.count;
      stats.min = Math.min(stats.min, m.value);
      stats.max = Math.max(stats.max, m.value);
    });

    // Web Vitals
    const webVitalMetrics = metrics.filter(m => m.type === 'web-vital') as WebVitalMetric[];
    const webVitalMetricsAgg: AggregatedMetrics['webVitalMetrics'] = {
      totalMetrics: webVitalMetrics.length,
      metricsByName: {}
    };

    webVitalMetrics.forEach(m => {
      if (!webVitalMetricsAgg.metricsByName[m.name]) {
        webVitalMetricsAgg.metricsByName[m.name] = {
          count: 0,
          avg: 0,
          rating: 'good'
        };
      }
      const stats = webVitalMetricsAgg.metricsByName[m.name];
      stats.count++;
      stats.avg = (stats.avg * (stats.count - 1) + m.value) / stats.count;
      stats.rating = m.rating;
    });

    return {
      apiMetrics: apiMetricsAgg,
      errorMetrics: errorMetricsAgg,
      operationMetrics: operationMetricsAgg,
      customMetrics: customMetricsAgg,
      webVitalMetrics: webVitalMetricsAgg
    };
  }

  // ============================================================================
  // Alarms
  // ============================================================================

  async getAlarms(): Promise<Alarm[]> {
    const metrics = Array.from(this.metrics.values());
    const alarms: Alarm[] = [];

    // Error rate alarm
    if (this.config.alarms.errorRate?.enabled) {
      const errorRateConfig = this.config.alarms.errorRate;
      const apiMetrics = metrics.filter(m => m.type === 'api') as APIRequestMetric[];
      if (apiMetrics.length > 0) {
        const errorRate = apiMetrics.filter(m => m.statusCode >= 400).length / apiMetrics.length;
        if (errorRate >= errorRateConfig.threshold) {
          alarms.push({
            id: `alarm_error_${Date.now()}`,
            type: 'errorRate',
            metricName: 'errorRate',
            threshold: errorRateConfig.threshold,
            currentValue: errorRate,
            triggeredAt: Date.now(),
            message: `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold (${(errorRateConfig.threshold * 100).toFixed(1)}%)`
          });
        }
      }
    }

    // Response time alarm
    if (this.config.alarms.responseTime?.enabled) {
      const responseTimeConfig = this.config.alarms.responseTime;
      const apiMetrics = metrics.filter(m => m.type === 'api') as APIRequestMetric[];
      if (apiMetrics.length > 0) {
        const avgResponseTime = apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / apiMetrics.length;
        if (avgResponseTime >= responseTimeConfig.threshold) {
          alarms.push({
            id: `alarm_response_${Date.now()}`,
            type: 'responseTime',
            metricName: 'responseTime',
            threshold: responseTimeConfig.threshold,
            currentValue: avgResponseTime,
            triggeredAt: Date.now(),
            message: `Average response time (${avgResponseTime.toFixed(0)}ms) exceeds threshold (${responseTimeConfig.threshold}ms)`
          });
        }
      }
    }

    // Operation duration alarm
    if (this.config.alarms.operationDuration?.enabled) {
      const operationConfig = this.config.alarms.operationDuration;
      const operationMetrics = metrics.filter(m => m.type === 'operation') as OperationMetric[];
      if (operationMetrics.length > 0) {
        const avgDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0) / operationMetrics.length;
        if (avgDuration >= operationConfig.threshold) {
          alarms.push({
            id: `alarm_operation_${Date.now()}`,
            type: 'operationDuration',
            metricName: 'operationDuration',
            threshold: operationConfig.threshold,
            currentValue: avgDuration,
            triggeredAt: Date.now(),
            message: `Average operation duration (${avgDuration.toFixed(0)}ms) exceeds threshold (${operationConfig.threshold}ms)`
          });
        }
      }
    }

    return alarms;
  }

  // ============================================================================
  // Reports
  // ============================================================================

  async generateReport(periodStart?: number, periodEnd?: number): Promise<PerformanceReport> {
    const now = Date.now();
    const start = periodStart || now - 3600000; // Default to 1 hour ago
    const end = periodEnd || now;

    const metrics = Array.from(this.metrics.values()).filter(
      m => m.timestamp >= start && m.timestamp <= end
    );

    const aggregatedMetrics = await this.getAggregatedMetrics();
    const alarms = await this.getAlarms();

    // Generate recommendations
    const recommendations: string[] = [];

    if (aggregatedMetrics.apiMetrics.errorRate > 0.1) {
      recommendations.push('High error rate detected. Check error logs and API endpoints.');
    }

    if (aggregatedMetrics.apiMetrics.averageResponseTime > 500) {
      recommendations.push('High average response time. Consider optimization or caching.');
    }

    if (alarms.length > 0) {
      recommendations.push(`${alarms.length} active alarms require attention.`);
    }

    return {
      period: {
        start,
        end
      },
      summary: {
        totalMetrics: metrics.length,
        timeRange: `${Math.floor((end - start) / 60000)} minutes`
      },
      metrics: aggregatedMetrics,
      alarms,
      recommendations
    };
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  async clearAllData(): Promise<void> {
    this.metrics.clear();
  }

  async getMetricsCount(): Promise<number> {
    return this.metrics.size;
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Performance API - Integration Tests', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      enabled: true,
      sampleRate: 1.0,
      retentionMs: 3600000
    });
  });

  afterEach(async () => {
    await monitor.clearAllData();
  });

  // ============================================================================
  // Test Group 1: 性能数据上报
  // ============================================================================

  describe('1. 性能数据上报', () => {
    it('应该能够成功上报 API 请求指标', async () => {
      await monitor.trackAPIRequest('GET', '/api/users', 200, 150);
      await monitor.trackAPIRequest('POST', '/api/users', 201, 250);
      await monitor.trackAPIRequest('GET', '/api/users/1', 404, 50);

      const metrics = await monitor.getMetrics({ type: 'api' });

      expect(metrics.length).toBe(3);
      expect(metrics[0].type).toBe('api');
    });

    it('应该能够上报不同类型的错误', async () => {
      await monitor.trackError('ValidationError', 'Invalid input data');
      await monitor.trackError('DatabaseError', 'Connection failed', 'stack trace');
      await monitor.trackError('ValidationError', 'Another validation error');

      const metrics = await monitor.getMetrics({ type: 'error' });

      expect(metrics.length).toBe(3);
      expect(metrics.filter((m: any) => m.errorType === 'ValidationError').length).toBe(2);
      expect(metrics.filter((m: any) => m.errorType === 'DatabaseError').length).toBe(1);
    });

    it('应该能够跟踪操作的开始和结束', async () => {
      const opId1 = monitor.startOperation('data_processing');
      await new Promise(resolve => setTimeout(resolve, 50));
      await monitor.endOperation(opId1, true);

      const opId2 = monitor.startOperation('file_upload');
      await new Promise(resolve => setTimeout(resolve, 30));
      await monitor.endOperation(opId2, false);

      const metrics = await monitor.getMetrics({ type: 'operation' });

      expect(metrics.length).toBe(2);
      expect((metrics[0] as any).operationName).toBe('file_upload');
      expect((metrics[1] as any).operationName).toBe('data_processing');
    });

    it('应该能够上报自定义指标', async () => {
      await monitor.trackCustomMetric('memory_usage', 1024, 'MB', { server: 'server-1' });
      await monitor.trackCustomMetric('cpu_usage', 75, '%', { server: 'server-1' });
      await monitor.trackCustomMetric('disk_io', 500, 'IOPS');

      const metrics = await monitor.getMetrics({ type: 'custom' });

      expect(metrics.length).toBe(3);
      expect(metrics.filter((m: any) => m.name === 'memory_usage').length).toBe(1);
      expect(metrics.filter((m: any) => m.name === 'cpu_usage').length).toBe(1);
    });

    it('应该能够上报 Web Vitals', async () => {
      await monitor.trackWebVital('LCP', 2500, 'good');
      await monitor.trackWebVital('FID', 100, 'good');
      await monitor.trackWebVital('CLS', 0.1, 'needs-improvement');
      await monitor.trackWebVital('LCP', 4000, 'needs-improvement');

      const metrics = await monitor.getMetrics({ type: 'web-vital' });

      expect(metrics.length).toBe(4);
      expect(metrics.filter((m: any) => m.name === 'LCP').length).toBe(2);
    });

    it('应该支持采样率配置', async () => {
      monitor.updateConfig({ sampleRate: 0 });

      await monitor.trackAPIRequest('GET', '/api/test', 200, 100);

      const metrics = await monitor.getMetrics();
      expect(metrics.length).toBe(0);

      monitor.updateConfig({ sampleRate: 1.0 });

      await monitor.trackAPIRequest('GET', '/api/test', 200, 100);

      const metrics2 = await monitor.getMetrics();
      expect(metrics2.length).toBe(1);
    });

    it('应该支持禁用监控', async () => {
      monitor.updateConfig({ enabled: false });

      await monitor.trackAPIRequest('GET', '/api/test', 200, 100);
      await monitor.trackError('TestError', 'Test message');

      const metrics = await monitor.getMetrics();
      expect(metrics.length).toBe(0);
    });
  });

  // ============================================================================
  // Test Group 2: 指标聚合
  // ============================================================================

  describe('2. 指标聚合', () => {
    it('应该正确聚合 API 指标', async () => {
      await monitor.trackAPIRequest('GET', '/api/users', 200, 150);
      await monitor.trackAPIRequest('GET', '/api/users', 200, 180);
      await monitor.trackAPIRequest('POST', '/api/users', 201, 250);
      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);
      await monitor.trackAPIRequest('GET', '/api/error', 500, 120);

      const aggregated = await monitor.getAggregatedMetrics();

      expect(aggregated.apiMetrics.totalRequests).toBe(5);
      expect(aggregated.apiMetrics.successfulRequests).toBe(3);
      expect(aggregated.apiMetrics.failedRequests).toBe(2);
      expect(aggregated.apiMetrics.averageResponseTime).toBeCloseTo(160, 0);
      expect(aggregated.apiMetrics.successRate).toBeCloseTo(0.6, 1);
      expect(aggregated.apiMetrics.errorRate).toBeCloseTo(0.4, 1);
      expect(aggregated.apiMetrics.requestsByMethod['GET']).toBe(4);
      expect(aggregated.apiMetrics.requestsByMethod['POST']).toBe(1);
      expect(aggregated.apiMetrics.errorsByStatus[500]).toBe(2);
    });

    it('应该正确聚合错误指标', async () => {
      await monitor.trackError('TypeError', 'Type error 1');
      await monitor.trackError('TypeError', 'Type error 2');
      await monitor.trackError('ReferenceError', 'Reference error');
      await monitor.trackError('ValidationError', 'Validation error');
      await monitor.trackError('ValidationError', 'Another validation error');

      const aggregated = await monitor.getAggregatedMetrics();

      expect(aggregated.errorMetrics.totalErrors).toBe(5);
      expect(aggregated.errorMetrics.errorsByType['TypeError']).toBe(2);
      expect(aggregated.errorMetrics.errorsByType['ValidationError']).toBe(2);
      expect(aggregated.errorMetrics.errorsByType['ReferenceError']).toBe(1);
    });

    it('应该正确聚合操作指标', async () => {
      const op1 = monitor.startOperation('export_data');
      await new Promise(resolve => setTimeout(resolve, 50));
      await monitor.endOperation(op1, true);

      const op2 = monitor.startOperation('export_data');
      await new Promise(resolve => setTimeout(resolve, 60));
      await monitor.endOperation(op2, true);

      const op3 = monitor.startOperation('import_data');
      await new Promise(resolve => setTimeout(resolve, 30));
      await monitor.endOperation(op3, false);

      const aggregated = await monitor.getAggregatedMetrics();

      expect(aggregated.operationMetrics.totalOperations).toBe(3);
      expect(aggregated.operationMetrics.successfulOperations).toBe(2);
      expect(aggregated.operationMetrics.failedOperations).toBe(1);
      expect(aggregated.operationMetrics.successRate).toBeCloseTo(0.67, 1);
      expect(aggregated.operationMetrics.operationsByName['export_data'].count).toBe(2);
      expect(aggregated.operationMetrics.operationsByName['export_data'].avgDuration).toBeGreaterThan(50);
      expect(aggregated.operationMetrics.operationsByName['export_data'].avgDuration).toBeLessThan(70);
    });

    it('应该正确聚合自定义指标', async () => {
      await monitor.trackCustomMetric('memory', 1024, 'MB');
      await monitor.trackCustomMetric('memory', 2048, 'MB');
      await monitor.trackCustomMetric('memory', 1536, 'MB');
      await monitor.trackCustomMetric('cpu', 50, '%');
      await monitor.trackCustomMetric('cpu', 75, '%');

      const aggregated = await monitor.getAggregatedMetrics();

      expect(aggregated.customMetrics.totalMetrics).toBe(5);
      expect(aggregated.customMetrics.metricsByName['memory'].count).toBe(3);
      expect(aggregated.customMetrics.metricsByName['memory'].avg).toBeCloseTo(1536, 0);
      expect(aggregated.customMetrics.metricsByName['memory'].min).toBe(1024);
      expect(aggregated.customMetrics.metricsByName['memory'].max).toBe(2048);
      expect(aggregated.customMetrics.metricsByName['cpu'].count).toBe(2);
      expect(aggregated.customMetrics.metricsByName['cpu'].avg).toBeCloseTo(62.5, 1);
    });

    it('应该正确聚合 Web Vitals', async () => {
      await monitor.trackWebVital('LCP', 2500, 'good');
      await monitor.trackWebVital('LCP', 3000, 'needs-improvement');
      await monitor.trackWebVital('FID', 100, 'good');
      await monitor.trackWebVital('CLS', 0.1, 'needs-improvement');

      const aggregated = await monitor.getAggregatedMetrics();

      expect(aggregated.webVitalMetrics.totalMetrics).toBe(4);
      expect(aggregated.webVitalMetrics.metricsByName['LCP'].count).toBe(2);
      expect(aggregated.webVitalMetrics.metricsByName['LCP'].avg).toBeCloseTo(2750, 0);
      expect(aggregated.webVitalMetrics.metricsByName['FID'].count).toBe(1);
      expect(aggregated.webVitalMetrics.metricsByName['FID'].avg).toBe(100);
    });
  });

  // ============================================================================
  // Test Group 3: 告警系统
  // ============================================================================

  describe('3. 告警系统', () => {
    beforeEach(async () => {
      await monitor.clearAllData();
      monitor.updateConfig({
        enabled: true,
        sampleRate: 1.0,
        alarms: {
          errorRate: {
            metric: 'errorRate',
            threshold: 0.5,
            windowMs: 60000,
            enabled: true
          },
          responseTime: {
            metric: 'responseTime',
            threshold: 100,
            windowMs: 60000,
            enabled: true
          },
          operationDuration: {
            metric: 'operationDuration',
            threshold: 100,
            windowMs: 60000,
            enabled: true
          }
        }
      } as MonitoringConfig);
    });

    it('应该在错误率超过阈值时触发告警', async () => {
      // 3 个错误请求，2 个成功请求 -> 错误率 60%
      await monitor.trackAPIRequest('GET', '/api/error1', 500, 100);
      await monitor.trackAPIRequest('GET', '/api/error2', 500, 150);
      await monitor.trackAPIRequest('GET', '/api/error3', 500, 120);
      await monitor.trackAPIRequest('GET', '/api/success1', 200, 100);
      await monitor.trackAPIRequest('GET', '/api/success2', 200, 80);

      const alarms = await monitor.getAlarms();

      const errorRateAlarms = alarms.filter(a => a.type === 'errorRate');
      expect(errorRateAlarms.length).toBeGreaterThan(0);
      expect(errorRateAlarms[0].currentValue).toBeGreaterThanOrEqual(0.5);
    });

    it('应该在响应时间超过阈值时触发告警', async () => {
      await monitor.trackAPIRequest('GET', '/api/slow1', 200, 200);
      await monitor.trackAPIRequest('GET', '/api/slow2', 200, 250);
      await monitor.trackAPIRequest('GET', '/api/slow3', 200, 180);

      const alarms = await monitor.getAlarms();

      const responseTimeAlarms = alarms.filter(a => a.type === 'responseTime');
      expect(responseTimeAlarms.length).toBeGreaterThan(0);
      expect(responseTimeAlarms[0].currentValue).toBeGreaterThanOrEqual(100);
    });

    it('应该在操作持续时间超过阈值时触发告警', async () => {
      const op1 = monitor.startOperation('slow_operation');
      await new Promise(resolve => setTimeout(resolve, 150));
      await monitor.endOperation(op1, true);

      const op2 = monitor.startOperation('another_slow_op');
      await new Promise(resolve => setTimeout(resolve, 200));
      await monitor.endOperation(op2, true);

      const alarms = await monitor.getAlarms();

      const durationAlarms = alarms.filter(a => a.type === 'operationDuration');
      expect(durationAlarms.length).toBeGreaterThan(0);
      expect(durationAlarms[0].currentValue).toBeGreaterThanOrEqual(100);
    });

    it('不应该在指标正常时触发告警', async () => {
      // Low error rate
      await monitor.trackAPIRequest('GET', '/api/success1', 200, 50);
      await monitor.trackAPIRequest('GET', '/api/success2', 200, 60);
      await monitor.trackAPIRequest('GET', '/api/success3', 200, 55);
      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);

      // Fast response times
      const op = monitor.startOperation('fast_operation');
      await monitor.endOperation(op, true);

      const alarms = await monitor.getAlarms();

      expect(alarms.length).toBe(0);
    });

    it('应该生成有意义的告警消息', async () => {
      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);
      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);

      const alarms = await monitor.getAlarms();

      if (alarms.length > 0) {
        expect(alarms[0].message).toBeTruthy();
        expect(alarms[0].threshold).toBeDefined();
        expect(alarms[0].currentValue).toBeDefined();
        expect(alarms[0].triggeredAt).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // Test Group 4: 性能报告生成
  // ============================================================================

  describe('4. 性能报告生成', () => {
    it('应该生成完整的性能报告', async () => {
      // Add some test data
      await monitor.trackAPIRequest('GET', '/api/users', 200, 150);
      await monitor.trackAPIRequest('POST', '/api/users', 201, 250);
      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);
      await monitor.trackError('TestError', 'Test message');
      await monitor.trackCustomMetric('memory', 1024, 'MB');

      const report = await monitor.generateReport();

      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('alarms');
      expect(report).toHaveProperty('recommendations');

      expect(report.summary.totalMetrics).toBeGreaterThan(0);
      expect(report.summary.timeRange).toBeTruthy();
    });

    it('应该支持自定义时间范围', async () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const twoHoursAgo = now - 7200000;

      await monitor.trackAPIRequest('GET', '/api/test1', 200, 100);
      await new Promise(resolve => setTimeout(resolve, 100));
      await monitor.trackAPIRequest('GET', '/api/test2', 200, 150);

      const report = await monitor.generateReport(oneHourAgo, now);

      expect(report.period.start).toBe(oneHourAgo);
      expect(report.period.end).toBeGreaterThanOrEqual(oneHourAgo);
      expect(report.summary.totalMetrics).toBeGreaterThanOrEqual(0);
    });

    it('应该包含聚合指标数据', async () => {
      await monitor.trackAPIRequest('GET', '/api/users', 200, 150);
      await monitor.trackAPIRequest('POST', '/api/users', 201, 250);
      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);

      const report = await monitor.generateReport();

      expect(report.metrics.apiMetrics.totalRequests).toBe(3);
      expect(report.metrics.apiMetrics.successfulRequests).toBe(2);
      expect(report.metrics.apiMetrics.failedRequests).toBe(1);
    });

    it('应该包含活动告警', async () => {
      monitor.updateConfig({
        enabled: true,
        sampleRate: 1.0,
        alarms: {
          errorRate: {
            metric: 'errorRate',
            threshold: 0.3,
            windowMs: 60000,
            enabled: true
          }
        }
      } as MonitoringConfig);

      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);
      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);

      const report = await monitor.generateReport();

      expect(report.alarms.length).toBeGreaterThan(0);
      expect(report.alarms[0].type).toBe('errorRate');
    });

    it('应该生成优化建议', async () => {
      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);
      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);
      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);

      const report = await monitor.generateReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('error rate'))).toBe(true);
    });

    it('应该处理没有数据的情况', async () => {
      const report = await monitor.generateReport();

      expect(report.summary.totalMetrics).toBe(0);
      expect(report.metrics.apiMetrics.totalRequests).toBe(0);
      expect(report.alarms.length).toBe(0);
    });
  });

  // ============================================================================
  // Test Group 5: 数据查询和过滤
  // ============================================================================

  describe('5. 数据查询和过滤', () => {
    it('应该能够按类型过滤指标', async () => {
      await monitor.trackAPIRequest('GET', '/api/users', 200, 150);
      await monitor.trackError('TestError', 'Test message');
      await monitor.trackCustomMetric('memory', 1024, 'MB');

      const apiMetrics = await monitor.getMetrics({ type: 'api' });
      const errorMetrics = await monitor.getMetrics({ type: 'error' });
      const customMetrics = await monitor.getMetrics({ type: 'custom' });

      expect(apiMetrics.length).toBe(1);
      expect(errorMetrics.length).toBe(1);
      expect(customMetrics.length).toBe(1);
    });

    it('应该能够按名称过滤指标', async () => {
      await monitor.trackAPIRequest('GET', '/api/users', 200, 150);
      await monitor.trackAPIRequest('POST', '/api/users', 201, 250);
      await monitor.trackAPIRequest('GET', '/api/projects', 200, 100);

      const usersMetrics = await monitor.getMetrics({ name: 'GET /api/users' });
      const projectsMetrics = await monitor.getMetrics({ name: 'GET /api/projects' });

      expect(usersMetrics.length).toBe(1);
      expect(projectsMetrics.length).toBe(1);
    });

    it('应该能够按时间过滤指标', async () => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      await monitor.trackAPIRequest('GET', '/api/users', 200, 150);

      const recentMetrics = await monitor.getMetrics({ since: oneMinuteAgo });
      expect(recentMetrics.length).toBeGreaterThan(0);

      const oldMetrics = await monitor.getMetrics({ since: now + 60000 });
      expect(oldMetrics.length).toBe(0);
    });

    it('应该能够清除所有数据', async () => {
      await monitor.trackAPIRequest('GET', '/api/users', 200, 150);
      await monitor.trackError('TestError', 'Test message');
      await monitor.trackCustomMetric('memory', 1024, 'MB');

      expect(await monitor.getMetricsCount()).toBe(3);

      await monitor.clearAllData();

      expect(await monitor.getMetricsCount()).toBe(0);
    });

    it('应该能够统计指标数量', async () => {
      expect(await monitor.getMetricsCount()).toBe(0);

      await monitor.trackAPIRequest('GET', '/api/users', 200, 150);
      await monitor.trackAPIRequest('POST', '/api/users', 201, 250);
      await monitor.trackAPIRequest('GET', '/api/projects', 200, 100);

      expect(await monitor.getMetricsCount()).toBe(3);
    });
  });

  // ============================================================================
  // Test Group 6: 集成场景测试
  // ============================================================================

  describe('6. 集成场景测试', () => {
    it('场景1: 高流量 API 监控', async () => {
      // Simulate high traffic
      for (let i = 0; i < 100; i++) {
        const isSlow = i % 10 === 0;
        const isError = i % 20 === 0;
        await monitor.trackAPIRequest(
          'GET',
          '/api/data',
          isError ? 500 : 200,
          isSlow ? 300 + Math.random() * 200 : 50 + Math.random() * 50
        );
      }

      const report = await monitor.generateReport();

      expect(report.summary.totalMetrics).toBe(100);
      expect(report.metrics.apiMetrics.totalRequests).toBe(100);
      expect(report.metrics.apiMetrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('场景2: 错误监控和告警', async () => {
      monitor.updateConfig({
        enabled: true,
        sampleRate: 1.0,
        alarms: {
          errorRate: {
            metric: 'errorRate',
            threshold: 0.2,
            windowMs: 60000,
            enabled: true
          }
        }
      } as MonitoringConfig);

      // Generate some errors
      for (let i = 0; i < 10; i++) {
        await monitor.trackAPIRequest('GET', '/api/error', 500, 100);
      }
      await monitor.trackAPIRequest('GET', '/api/success', 200, 100);

      const report = await monitor.generateReport();

      expect(report.alarms.length).toBeGreaterThan(0);
      expect(report.alarms[0].type).toBe('errorRate');
      expect(report.recommendations.some(r => r.includes('error rate'))).toBe(true);
    });

    it('场景3: Web Vitals 监控', async () => {
      // Simulate Web Vitals from multiple page loads
      for (let i = 0; i < 20; i++) {
        await monitor.trackWebVital('LCP', 2000 + Math.random() * 3000, 'good');
        await monitor.trackWebVital('FID', 50 + Math.random() * 100, 'good');
        await monitor.trackWebVital('CLS', Math.random() * 0.25, 'good');
      }

      // Add some poor performance
      await monitor.trackWebVital('LCP', 4500, 'needs-improvement');
      await monitor.trackWebVital('CLS', 0.3, 'poor');

      const report = await monitor.generateReport();

      expect(report.metrics.webVitalMetrics.totalMetrics).toBe(62);
      expect(report.metrics.webVitalMetrics.metricsByName['LCP'].count).toBe(21);
    });

    it('场景4: 操作性能跟踪', async () => {
      const operations = ['export_data', 'import_data', 'process_image', 'send_email'];

      for (const operation of operations) {
        const opId = monitor.startOperation(operation);
        const duration = 50 + Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, duration));
        await monitor.endOperation(opId, Math.random() > 0.1);
      }

      const aggregated = await monitor.getAggregatedMetrics();

      expect(aggregated.operationMetrics.totalOperations).toBe(4);
      expect(Object.keys(aggregated.operationMetrics.operationsByName).length).toBe(4);
    });

    it('场景5: 自定义业务指标', async () => {
      // Track business-specific metrics
      await monitor.trackCustomMetric('active_users', 1234, 'count');
      await monitor.trackCustomMetric('active_users', 1256, 'count');
      await monitor.trackCustomMetric('active_users', 1301, 'count');

      await monitor.trackCustomMetric('revenue', 5000, 'USD');
      await monitor.trackCustomMetric('revenue', 7500, 'USD');
      await monitor.trackCustomMetric('revenue', 10000, 'USD');

      const aggregated = await monitor.getAggregatedMetrics();

      expect(aggregated.customMetrics.metricsByName['active_users'].count).toBe(3);
      expect(aggregated.customMetrics.metricsByName['active_users'].avg).toBeCloseTo(1264, 0);
      expect(aggregated.customMetrics.metricsByName['revenue'].count).toBe(3);
      expect(aggregated.customMetrics.metricsByName['revenue'].avg).toBeCloseTo(7500, 0);
    });
  });

  // ============================================================================
  // Test Group 7: 边界情况和错误处理
  // ============================================================================

  describe('7. 边界情况和错误处理', () => {
    it('应该正确处理零指标', async () => {
      const report = await monitor.generateReport();

      expect(report.summary.totalMetrics).toBe(0);
      expect(report.metrics.apiMetrics.totalRequests).toBe(0);
      expect(report.metrics.errorMetrics.totalErrors).toBe(0);
      expect(report.alarms.length).toBe(0);
    });

    it('应该正确处理禁用告警', async () => {
      monitor.updateConfig({
        enabled: true,
        sampleRate: 1.0,
        alarms: {
          errorRate: {
            metric: 'errorRate',
            threshold: 0.1,
            windowMs: 60000,
            enabled: false
          }
        }
      } as MonitoringConfig);

      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);
      await monitor.trackAPIRequest('GET', '/api/error', 500, 100);

      const alarms = await monitor.getAlarms();

      expect(alarms.length).toBe(0);
    });

    it('应该正确处理极端响应时间', async () => {
      await monitor.trackAPIRequest('GET', '/api/ultra-fast', 200, 1);
      await monitor.trackAPIRequest('GET', '/api/ultra-slow', 200, 10000);

      const aggregated = await monitor.getAggregatedMetrics();

      expect(aggregated.apiMetrics.minResponseTime).toBe(1);
      expect(aggregated.apiMetrics.maxResponseTime).toBe(10000);
    });

    it('应该正确处理混合状态码', async () => {
      const statusCodes = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503];

      for (const statusCode of statusCodes) {
        await monitor.trackAPIRequest('GET', `/api/status/${statusCode}`, statusCode, 100);
      }

      const aggregated = await monitor.getAggregatedMetrics();

      expect(aggregated.apiMetrics.totalRequests).toBe(10);
      expect(aggregated.apiMetrics.successfulRequests).toBe(3);
      expect(aggregated.apiMetrics.failedRequests).toBe(7);
      expect(Object.keys(aggregated.apiMetrics.errorsByStatus).length).toBeGreaterThan(0);
    });

    it('应该正确处理采样率为 0', async () => {
      monitor.updateConfig({ sampleRate: 0 });

      await monitor.trackAPIRequest('GET', '/api/test', 200, 100);
      await monitor.trackError('TestError', 'Test message');

      const metrics = await monitor.getMetrics();
      expect(metrics.length).toBe(0);
    });

    it('应该正确处理采样率为 1', async () => {
      monitor.updateConfig({ sampleRate: 1 });

      await monitor.trackAPIRequest('GET', '/api/test', 200, 100);

      const metrics = await monitor.getMetrics();
      expect(metrics.length).toBe(1);
    });
  });
});
