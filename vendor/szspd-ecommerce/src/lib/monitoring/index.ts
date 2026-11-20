// @ts-nocheck
// @ts-nocheck
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
 * - 实时性能仪表板
 * - 增强指标收集器
 * - 性能告警管理器
 */

// ============================================
// Core Web Vitals (保留向后兼容)
// ============================================
export { initWebVitalsMonitoring, observePerformance, getCurrentVitals } from './web-vitals'

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
} from './performance.config'

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
} from './performance.monitor'

// ============================================
// 告警管理
// ============================================
export {
  performanceAlertManager,
  defaultAlertRules,
  type AlertRecord,
  type AlertRule,
} from './performance.alerts'

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
} from './errors'

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
} from './alerts'

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
} from './health'

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
} from './prometheus'

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
} from './root-cause'

// Re-export from root-cause subdirectory
export {
  BottleneckDetector,
  bottleneckDetector,
  type Bottleneck,
  type BottleneckAnalysis,
  type BottleneckRecommendation,
  type PerformanceProfile,
} from './root-cause'

export {
  SlowRequestTracker,
  slowRequestTracker,
  type RequestTiming,
  type SlowRequestAnalysis,
  type RequestBottleneck,
} from './root-cause'

export {
  PerformanceWaterfall,
  performanceWaterfall,
  type ResourceTiming,
  type WaterfallAnalysis,
} from './root-cause'

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
} from './budget-controller'

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
} from './alert-manager'

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
} from './budget'

// ============================================
// Sentry Client (Legacy Shim)
// ============================================
// This provides backward compatibility for code importing from @/lib/monitoring
import * as SentryModule from '@/lib/sentry'

// ============================================
// Optimized Metrics Aggregation
// ============================================
export {
  getAggregatedMetrics,
  getGroupedAggregation,
  getMultiMetricAggregation,
  analyzeTrend,
  calculateMovingAverage,
  getPercentiles,
  type MetricDataPoint,
  type AggregatedMetrics,
  type TimeWindowOptions,
  type GroupedAggregation,
  type TrendAnalysis,
} from './metrics-aggregation'

// ============================================
// Optimized Metrics Aggregator (v2.0)
// ============================================
export {
  OptimizedMetricsAggregator,
  createOptimizedAggregator,
  type AggregatorMetric,
  type TimeWindow,
  type WorkerResult,
  type SamplingConfig,
  type AggregatorConfig,
} from './optimized-metrics-aggregator'

// ============================================
// Memory Optimizer (v2.0)
// ============================================
export {
  MemoryMonitor,
  MapCacheCleaner,
  ResourceTracker,
  createMemoryMonitor,
  createMapCacheCleaner,
  createResourceTracker,
  type MemoryStats,
  type MemoryAlert,
  type MemoryMonitorConfig,
} from './memory-optimizer'

// Simple span object with end() method
interface SimpleSpan {
  end: () => void
  setAttribute: (key: string, value: string) => void
}

interface SentryStatus {
  isInitialized: boolean
  hasDsn: boolean
  environment: string
  release?: string
  tracesSampleRate: number
  profilesSampleRate: number
  debug: boolean
}

interface AgentStats {
  totalAgents: number
  totalTasks: number
  completedTasks: number
  failedTasks: number
  activeTasks: number
  avgTaskDuration: number
  totalTokens: number
}

export const sentryClient = {
  // Support new-style options object calls (used in APM route)
  startSpan: (options: {
    op: string
    description: string
    data?: Record<string, unknown>
  }): SimpleSpan | null => {
    if (!SentryModule.isSentryInitialized()) return null
    const attributes: Record<string, string> = {}
    if (options.data) {
      Object.entries(options.data).forEach(([key, value]) => {
        attributes[key] = String(value)
      })
    }
    return {
      end: () => {
        /* span ended */
      },
      setAttribute: (key: string, value: string) => {
        attributes[key] = value
      },
    }
  },
  getStatus: (): SentryStatus => ({
    isInitialized: SentryModule.isSentryInitialized(),
    hasDsn: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    debug: process.env.NODE_ENV === 'development',
  }),
  captureException: SentryModule.captureException,
  captureMessage: SentryModule.captureMessage,
  addBreadcrumb: SentryModule.addBreadcrumb,
}

export const agentTracker = {
  getGlobalStats: (): AgentStats => ({
    totalAgents: 0,
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    activeTasks: 0,
    avgTaskDuration: 0,
    totalTokens: 0,
  }),
}

// ============================================
// Real-Time Performance Dashboard (v1.12.2)
// ============================================
export { realTimeDashboard, type RealTimeMetrics, type PerformanceTrend, type DashboardClient } from './realtime-dashboard'
export { default as RealTimeDashboardService } from './realtime-dashboard'

// ============================================
// Enhanced Metrics Collector (v1.12.2)
// ============================================
export { enhancedMetricsCollector, type AggregatedMetric, type MetricSnapshot, type PerformanceAlert as EnhancedPerformanceAlert, type MetricCallback } from './enhanced-metrics-collector'
export { default as EnhancedMetricsCollector } from './enhanced-metrics-collector'

// ============================================
// Performance Alert Manager (v1.12.2)
// ============================================
export {
  alertManager,
  type ActiveAlert,
  type AlertNotification,
  type AlertCallback as AlertManagerCallback,
} from './alert-manager-enhanced'
export { default as PerformanceAlertManager } from './alert-manager-enhanced'
