/**
 * Performance Monitoring Library
 * 性能监控库 - 入口文件
 */

// Web Vitals
export {
  WebVitalsMonitor,
  webVitalsMonitor,
  initWebVitalsMonitoring,
  calculateWebVitalsScore,
  type WebVitalsMetrics,
  type WebVitalsConfig,
} from './web-vitals';

// Custom Metrics
export {
  CustomMetricsTracker,
  customMetricsTracker,
  initCustomMetricsTracking,
  type CustomMetrics,
  type MetricsTrackerConfig,
} from './custom-metrics';

// Performance Budget
export {
  PerformanceBudgetManager,
  budgetManager,
  initPerformanceBudget,
  type PerformanceBudget,
  type AlarmRule,
  type AlarmNotification,
  type PerformanceBudgetReport,
  type BudgetViolation,
} from './budget';
