/**
 * Performance Monitoring Library
 * 性能监控库 - 入口文件
 *
 * Unified performance monitoring including:
 * - Web Vitals (Core, CLS, FID, LCP)
 * - Custom Metrics Tracking
 * - Performance Budget Management
 * - Anomaly Detection
 * - Root Cause Analysis
 * - Alerting System
 */

// ============================================================================
// Core Performance Monitoring
// ============================================================================

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

// Performance Budget Manager (Legacy - kept for backward compatibility)
export {
  PerformanceBudgetManager,
  budgetManager,
  initPerformanceBudget,
  type PerformanceBudget,
  type AlarmRule,
  type AlarmNotification,
  type PerformanceBudgetReport,
  type BudgetViolation,
} from './budget-manager';

// ============================================================================
// Advanced Performance Monitoring (from performance-monitoring merge)
// ============================================================================

// Anomaly Detection
export { PerformanceAnomalyDetector, anomalyDetector } from './anomaly-detection/detector';
export { BaselineManager } from './anomaly-detection/baseline';
export {
  detectAnomalyZScore,
  calculateZScore,
  interpretZScore,
  detectAnomalyPercentile,
  calculatePercentChange,
} from './anomaly-detection/algorithms/z-score';
export {
  buildIsolationForest,
  detectAnomalyIsolationForest,
  trainAndDetect,
} from './anomaly-detection/algorithms/isolation-forest';
export {
  createCooldownFilter,
  createConfidenceFilter,
  createSeasonalFilter,
  createSystemLoadFilter,
  createTrendFilter,
  CompositeFilter,
  createDefaultFilters,
} from './anomaly-detection/filters';

// Root Cause Analysis
export { RootCauseAnalyzer, rootCauseAnalyzer } from './root-cause-analysis/analyzer';
export { DatabaseTracker, databaseTracker } from './root-cause-analysis/database-tracker';
export { APITracker, apiTracker } from './root-cause-analysis/api-tracker';

// Alerting System
export { PerformanceAlerter, performanceAlerter } from './alerting/alerter';
export {
  EmailChannel,
  SlackChannel,
  DashboardChannel,
  WebhookChannel,
  TelegramChannel,
} from './alerting/channels';

// Budget Control (Advanced)
export {
  BudgetChecker,
  budgetChecker,
  BudgetConfigManager,
  budgetConfigManager,
  BudgetAlertManager,
  budgetAlertManager,
  DEFAULT_BUDGET_ALERT_CONFIG,
} from './budget-control/index';

// ============================================================================
// Types
// ============================================================================

// Core Types
export type {
  CustomMetrics,
  MetricsTrackerConfig,
} from './custom-metrics';

export type {
  PerformanceBudget,
  AlarmRule,
  AlarmNotification,
  PerformanceBudgetReport,
  BudgetViolation,
} from './budget-manager';

// Advanced Types (from performance-monitoring)
export type {
  MetricDataPoint,
} from './anomaly-detection/types';

export type {
  PerformanceContext,
  RootCause,
  RootCauseCandidate,
  SlowQuery,
  SlowAPICall,
  RenderingMetrics,
  ResourceMetrics,
} from './root-cause-analysis/types';

export type {
  PerformanceAlert,
  AlertLevel,
  AlertSeverity,
  AlertChannel,
  AlertChannelType,
  AlertRule,
  AlertChannelConfig,
  AlertingConfig,
  AlertStats,
  SuppressionConfig,
} from './alerting/types';

export type {
  BudgetThreshold,
  PageBudget,
  BudgetCheckResult,
  PerformanceBudgetConfig,
  BudgetAlertConfig,
  BudgetConfigOptions,
  BudgetValidationResult,
} from './budget-control/index';

// ============================================================================
// Constants
// ============================================================================

export { DEFAULT_ANOMALY_CONFIG } from './anomaly-detection/types';
export { DEFAULT_ROOT_CAUSE_CONFIG } from './root-cause-analysis/types';
export { DEFAULT_BUDGET_CONFIG } from './budget-control/types';
