/**
 * Monitoring Module
 * 监控模块入口
 */

// Core monitor
export { PerformanceMonitor, monitor } from './monitor'

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
  AlertChannel,
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
} from './alert-engine'

// Alert Channels
export {
  EmailAlertChannel,
  SlackAlertChannel,
  BaseAlertChannel,
  createEmailChannelFromEnv,
  createSlackChannelFromEnv,
} from './channels'
export type {
  EmailChannelConfig,
  SlackChannelConfig,
  BaseChannelConfig,
  AlertLevel,
  RetryConfig,
  DedupConfig,
  RateLimitConfig,
  ChannelMetrics,
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
