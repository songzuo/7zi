/**
 * Monitoring Module
 * 监控模块入口
 */

// Core monitor
export { PerformanceMonitor, monitor } from './monitor'

// Client-side performance monitoring SDK
export {
  initClientMonitoring,
  trackCustomEvent,
  trackPageLoad,
  getClientConfig,
  isMonitoringInitialized,
} from './client'

export type {
  ClientMonitoringConfig,
  PerformanceEventData,
  PerformanceReporter,
  WebVitalsMetric,
  WebVitalsThresholds,
  PerformanceRating,
} from './client'

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
} from './types'

// Config
export { DEFAULT_MONITORING_CONFIG, ENV_SPECIFIC_CONFIG, getMonitoringConfig } from './config'

// Storage - export type for interface when isolatedModules is enabled
export type { MonitoringStorage } from './storage'
export { MemoryStorage, LocalStorageStorage } from './storage'

// Alert Engine
export {
  AlertEngine,
  alertEngine,
  DEFAULT_ALERT_ENGINE_CONFIG,
  DEFAULT_ALERT_RULES,
  DEFAULT_ESCALATION_POLICIES,
} from './alert-engine'
export type {
  Alert,
  AlertRule,
  AlertPriority,
  AlertSeverity,
  AlertStatus,
  AlertCondition,
  EscalationPolicy,
  AlertEngineConfig,
  AlertSummary,
  AlertChannel,
} from './alert-engine'

// Alert Channels (base only - server channels are in ./channels/server)
export {
  BaseAlertChannel,
  DEFAULT_DEDUP_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
  DEFAULT_RETRY_CONFIG,
  getLevelPriority,
  priorityToLevel,
  severityToLevel,
} from './channels'
export type {
  AlertLevel,
  BaseChannelConfig,
  ChannelMetrics,
  DedupConfig,
  RateLimitConfig,
  RetryConfig,
  SendResult,
} from './channels'

// Utilities
export {
  withPerformanceTracking,
  monitoredFetch,
  trackReactError,
  createPerformanceTracker,
  logBrowserMetrics,
  initBrowserTracking,
  usePerformanceTracker,
} from './utils'

// Metrics Aggregator
export {
  MetricsAggregator,
  aggregateByTimeWindow,
  aggregatePercentiles,
  aggregateTrend,
} from './aggregator'
export type {
  TimeWindowBucket,
  PercentileResult,
  TrendResult,
  AggregationStats,
} from './aggregator'
