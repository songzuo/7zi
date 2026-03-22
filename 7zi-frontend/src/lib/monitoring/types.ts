/**
 * Performance Monitoring Types
 * 性能监控类型定义
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  timestamp: number;
  type: 'api' | 'operation' | 'error' | 'custom';
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface APIMetric extends PerformanceMetric {
  type: 'api';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  statusCode: number;
  responseTime: number;
  success: boolean;
}

export interface ErrorMetric extends PerformanceMetric {
  type: 'error';
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, any>;
}

export interface OperationMetric extends PerformanceMetric {
  type: 'operation';
  operationName: string;
  duration: number;
  success: boolean;
}

export interface AggregatedMetrics {
  apiMetrics: {
    totalRequests: number;
    averageResponseTime: number;
    successRate: number;
    errorCount: number;
    errorRate: number;
  };
  operationMetrics: {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
  };
  errorMetrics: {
    totalErrors: number;
    errorsByType: Record<string, number>;
  };
  timeWindow: {
    start: number;
    end: number;
  };
}

export interface AlarmThreshold {
  metric: 'errorRate' | 'responseTime' | 'operationDuration';
  threshold: number;
  windowMs: number;
  enabled: boolean;
}

export interface AlarmEvent {
  id: string;
  timestamp: number;
  type: 'errorRate' | 'responseTime' | 'operationDuration';
  currentValue: number;
  threshold: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, 采样率
  retentionPeriodMs: number; // 数据保留时间
  alarms: {
    errorRate: AlarmThreshold;
    responseTime: AlarmThreshold;
    operationDuration: AlarmThreshold;
  };
  storageType: 'memory' | 'localStorage' | 'custom';
}
