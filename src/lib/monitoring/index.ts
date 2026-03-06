/**
 * Monitoring Module
 * 监控模块 - 统一导出
 * 
 * 包含：
 * - Core Web Vitals 监控
 * - 性能指标收集
 * - 告警管理
 * - 错误追踪
 * - 健康检查
 */

// ============================================
// Core Web Vitals (保留向后兼容)
// ============================================
export {
  initWebVitalsMonitoring,
  observePerformance,
  getCurrentVitals,
} from './web-vitals';

// ============================================
// 性能监控配置
// ============================================
export {
  CORE_WEB_VITALS_THRESHOLDS,
  CUSTOM_METRICS_CONFIG,
  ALERT_CONFIG,
  REPORTING_CONFIG,
  REALTIME_CONFIG,
  ENVIRONMENT_CONFIG,
  getMetricRating,
  shouldReport,
  getEnvironmentConfig,
  getConfig,
  type MetricRating,
  type AlertLevel,
  type Environment,
} from './performance.config';

// ============================================
// 增强性能监控
// ============================================
export {
  performanceCollector,
  initPerformanceMonitoring,
  recordCustomMetric,
  getPerformanceSummary,
  onPerformanceMetric,
  onPerformanceAlert,
  trackApiPerformance,
  trackRenderPerformance,
  type PerformanceMetric,
  type CustomMetric,
  type PerformanceAlert,
} from './performance.monitor';

// ============================================
// 告警管理
// ============================================
export {
  performanceAlertManager,
  defaultAlertRules,
  type AlertRecord,
  type AlertRule,
} from './performance.alerts';

// ============================================
// 错误追踪
// ============================================
export {
  AppError,
  ErrorCategory,
  ErrorSeverity,
  captureError,
  withErrorTracking,
  handleApiError,
  addBreadcrumb,
} from './errors';

// ============================================
// 告警通知
// ============================================
export {
  sendAlert,
  sendSlackAlert,
  sendEmailAlert,
  alerts,
  type AlertSeverity,
  type AlertConfig,
} from './alerts';

// ============================================
// 健康检查
// ============================================
export {
  basicHealthCheck,
  detailedHealthCheck,
  healthResponse,
  probes,
  type HealthStatus,
  type CheckResult,
} from './health';

// ============================================
// React Hooks
// ============================================
export {
  usePerformanceMonitor,
  useRenderPerformance,
  useApiPerformance,
  useRouteChangePerformance,
  useMemoryUsage,
  PerformanceScore,
  type PerformanceSummary,
  type UsePerformanceMonitorOptions,
  type UsePerformanceMonitorReturn,
} from './use-performance';
