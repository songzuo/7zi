/**
 * Monitoring Module
 * 监控模块入口
 */

// Core monitor
export { PerformanceMonitor, monitor } from './monitor';

// Types
export type {
  PerformanceMetric,
  APIMetric,
  ErrorMetric,
  OperationMetric,
  AggregatedMetrics,
  AlarmThreshold,
  AlarmEvent,
  MonitoringConfig,
} from './types';

// Config
export { DEFAULT_MONITORING_CONFIG, ENV_SPECIFIC_CONFIG, getMonitoringConfig } from './config';

// Storage - export type for interface when isolatedModules is enabled
export type { MonitoringStorage } from './storage';
export { MemoryStorage, LocalStorageStorage } from './storage';

// Utilities
export {
  withPerformanceTracking,
  monitoredFetch,
  trackReactError,
  createPerformanceTracker,
  logBrowserMetrics,
  initBrowserTracking,
  usePerformanceTracker,
} from './utils';
