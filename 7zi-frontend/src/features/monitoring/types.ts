/**
 * Monitoring Feature Types
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface PerformanceBudget {
  metric: string;
  budget: number;
  actual: number;
  status: 'pass' | 'warn' | 'fail';
}

export interface CustomMetric {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
}

export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number;
  reportInterval: number;
  endpoint?: string;
}
