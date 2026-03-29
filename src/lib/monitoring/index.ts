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
 * - 根因分析
 * - 预算控制
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
  TrackedError,
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
  AlertSystem,
  AlertDeduplication,
  AlertAggregator,
  type AlertSeverity,
  type AlertConfig,
  type AlertChannel,
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
// NOTE: React hooks moved to './hooks/' to avoid circular dependencies
// Import them from './hooks/' instead:
// import { usePerformanceMonitor } from '@/lib/monitoring/hooks';
// ============================================

// ============================================
// Prometheus Metrics Exporter
// ============================================
export {
  PrometheusExporter,
  prometheusExporter,
  exportPrometheusMetrics,
  type Metric,
  type HistogramMetric,
  type MetricType,
} from './prometheus';

// ============================================
// 根因分析 (Root Cause Analysis)
// ============================================
export {
  RootCauseAnalyzer,
  rootCauseAnalyzer,
  type RootCauseAnalysis,
  type MemoryLeakIndicator,
  type SlowQueryIndicator,
  type CacheHitRateIndicator,
  type PerformanceIndicator,
  type MetricCorrelation,
  type DiagnosisReport,
  type ActionItem,
} from './root-cause';

// Re-export from root-cause subdirectory
export {
  BottleneckDetector,
  bottleneckDetector,
  type Bottleneck,
  type BottleneckAnalysis,
  type BottleneckRecommendation,
  type PerformanceProfile,
} from './root-cause';

export {
  SlowRequestTracker,
  slowRequestTracker,
  type RequestTiming,
  type SlowRequestAnalysis,
  type RequestBottleneck,
} from './root-cause';

export {
  PerformanceWaterfall,
  performanceWaterfall,
  type ResourceTiming,
  type WaterfallAnalysis,
} from './root-cause';

// ============================================
// 预算控制器 (Budget Controller)
// ============================================
export {
  BudgetController,
  budgetController,
  DEFAULT_BUDGET_RULES,
  createBudgetControllerWithAlerts,
  formatBudgetResultsForDisplay,
  type BudgetRule,
  type BudgetCheckResult,
  type BudgetReport,
  type BudgetSummary,
  type BudgetViolationAlert,
  type SuppressionRule,
} from './budget-controller';

// ============================================
// 告警管理器 (Alert Manager)
// ============================================
export {
  AlertManager,
  getAlertManager,
  createAlertManager,
  DEFAULT_ALERT_RULES,
  ALERT_LEVELS,
  createSilenceRule,
  formatAlertForDisplay,
  formatAlertStatsForDisplay,
  type AlertLevel,
  type AlertLevelKey,
  type AlertRecord as AlertManagerRecord,
  type AlertStats,
  type SilenceRule as AlertSilenceRule,
  type AlertMatcher,
  type EscalationPolicy,
  type EscalationLevel,
} from './alert-manager';

// ============================================
// 性能预算 (Budget - Legacy)
// ============================================
export {
  PerformanceBudget,
  DEFAULT_BUDGETS,
  createDefaultBudget,
  createBudget,
  formatBudgetViolation,
  type BudgetThreshold,
  type BudgetConfig,
  type BudgetResult,
  type BudgetViolation,
  type BudgetReport as LegacyBudgetReport,
} from './budget';
