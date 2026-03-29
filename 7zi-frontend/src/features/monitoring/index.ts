/**
 * Monitoring Feature
 * 监控功能模块
 */

// Components
export { PerformanceDashboard } from './components/PerformanceDashboard';
export { SimplePerformanceDashboard } from './components/SimplePerformanceDashboard';
export { EnhancedPerformanceDashboard } from './components/EnhancedPerformanceDashboard';

// Lib - selectively export to avoid duplicate type exports
export {
  PerformanceMonitor,
  monitor,
  DEFAULT_MONITORING_CONFIG,
  ENV_SPECIFIC_CONFIG,
  getMonitoringConfig,
  withPerformanceTracking,
  monitoredFetch,
  trackReactError,
  logBrowserMetrics,
  initBrowserTracking,
} from './lib';

// Storage (export types separately due to isolatedModules)
export type {
  MonitoringStorage,
  MemoryStorage,
  LocalStorageStorage,
} from './lib';

// Types from lib (more detailed)
export type {
  PerformanceMetric,
  APIMetric,
  ErrorMetric,
  OperationMetric,
  AggregatedMetrics,
  AlarmThreshold,
  AlarmEvent,
  MonitoringConfig,
} from './lib/types';

// Additional types from ./types.ts
export type {
  PerformanceBudget,
  CustomMetric,
} from './types';
