/**
 * Performance Monitoring Upgrade - Main Entry Point
 * 性能监控升级 - 主入口
 * 
 * This module provides advanced performance monitoring capabilities:
 * - Intelligent anomaly detection
 * - Root cause analysis
 * - Performance budget control
 * - Real-time alerting
 */

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

// Alerting
export { PerformanceAlerter, performanceAlerter } from './alerting/alerter';
export {
  EmailChannel,
  SlackChannel,
  DashboardChannel,
  WebhookChannel,
  TelegramChannel,
} from './alerting/channels';

// Budget Control
export {
  BudgetChecker,
  budgetChecker,
  BudgetConfigManager,
  budgetConfigManager,
  BudgetAlertManager,
  budgetAlertManager,
  DEFAULT_BUDGET_ALERT_CONFIG,
} from './budget-control/index';

export type {
  BudgetThreshold,
  PageBudget,
  BudgetViolation,
  BudgetCheckResult,
  PerformanceBudgetConfig,
  BudgetAlertConfig,
  BudgetConfigOptions,
  BudgetValidationResult,
} from './budget-control/index';

// Types
export type {
  MetricBaseline,
  AnomalyDetection,
  AnomalyDetectionConfig,
  AnomalyEvent,
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
  BudgetViolation,
  BudgetCheckResult,
  PerformanceBudgetConfig,
  PerformanceMetrics as BudgetMetrics,
  ResourceMetrics,
} from './budget-control/types';

// Constants
export { DEFAULT_ANOMALY_CONFIG } from './anomaly-detection/types';
export { DEFAULT_ROOT_CAUSE_CONFIG } from './root-cause-analysis/types';
export { DEFAULT_ALERTING_CONFIG } from './alerting/types';
export { DEFAULT_BUDGET_CONFIG } from './budget-control/types';

// Re-export default configs for convenience
export const defaultConfigs = {
  anomaly: require('./anomaly-detection/types').DEFAULT_ANOMALY_CONFIG,
  rootCause: require('./root-cause-analysis/types').DEFAULT_ROOT_CAUSE_CONFIG,
  alerting: require('./alerting/types').DEFAULT_ALERTING_CONFIG,
  budget: require('./budget-control/types').DEFAULT_BUDGET_CONFIG,
};
