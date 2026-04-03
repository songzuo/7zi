/**
 * Observability Hub Types - 可观测性中心类型定义
 * 
 * 企业级可观测性系统，支持 Metrics、Tracing、Logging 三大支柱
 * 
 * @version v1.11.0
 * @author AI Executor + Architect
 */

// ============================================
// Common Types
// ============================================

/**
 * 时间范围
 */
export interface TimeRange {
  start: Date | number
  end: Date | number
}

/**
 * 标签/维度
 */
export type Tags = Record<string, string | number | boolean>

/**
 * 分页参数
 */
export interface Pagination {
  offset?: number
  limit?: number
}

/**
 * 排序参数
 */
export interface Sort {
  field: string
  order: 'asc' | 'desc'
}

// ============================================
// Metrics Types
// ============================================

/**
 * 指标类型
 */
export enum MetricType {
  /** 计数器 - 只增不减 */
  COUNTER = 'counter',
  /** 仪表 - 可增可减 */
  GAUGE = 'gauge',
  /** 直方图 - 分布统计 */
  HISTOGRAM = 'histogram',
  /** 摘要 - 分位数统计 */
  SUMMARY = 'summary',
}

/**
 * 指标值类型
 */
export interface MetricValue {
  name: string
  type: MetricType
  value: number
  tags?: Tags
  timestamp: number
}

/**
 * 指标定义
 */
export interface MetricDefinition {
  name: string
  type: MetricType
  description?: string
  unit?: string
  tags?: string[]
  bucketBoundaries?: number[] // for histogram
  quantiles?: number[] // for summary
}

/**
 * 指标聚合结果
 */
export interface MetricAggregate {
  name: string
  count: number
  sum: number
  min: number
  max: number
  avg: number
  p50?: number
  p95?: number
  p99?: number
  tags?: Tags
  timeRange: TimeRange
}

/**
 * 指标查询过滤器
 */
export interface MetricFilter {
  names?: string[]
  tags?: Tags
  timeRange?: TimeRange
  aggregation?: 'none' | 'sum' | 'avg' | 'min' | 'max' | 'count'
  groupBy?: string[]
}

/**
 * Prometheus 导出格式
 */
export interface PrometheusMetric {
  name: string
  help: string
  type: string
  samples: Array<{
    value: number
    labels: Record<string, string>
    timestamp?: number
  }>
}

// ============================================
// Tracing Types
// ============================================

/**
 * Trace ID 类型
 */
export type TraceId = string

/**
 * Span ID 类型
 */
export type SpanId = string

/**
 * Span 状态码
 */
export enum SpanStatusCode {
  OK = 0,
  ERROR = 1,
  UNSET = -1,
}

/**
 * Span 类型
 */
export enum SpanKind {
  INTERNAL = 0,
  SERVER = 1,
  CLIENT = 2,
  PRODUCER = 3,
  CONSUMER = 4,
}

/**
 * Span 状态
 */
export type SpanStatus =
  | { code: SpanStatusCode.OK }
  | { code: SpanStatusCode.ERROR; message?: string }
  | { code: SpanStatusCode.UNSET }

/**
 * Span 事件
 */
export interface SpanEvent {
  name: string
  timestamp: number
  attributes?: Record<string, string | number | boolean>
}

/**
 * Span 链接
 */
export interface SpanLink {
  traceId: TraceId
  spanId: SpanId
  attributes?: Record<string, string | number | boolean>
}

/**
 * Span 上下文
 */
export interface SpanContext {
  traceId: TraceId
  spanId: SpanId
  parentSpanId?: SpanId
  sampled?: boolean
  traceFlags?: number
  baggage?: Record<string, string>
}

/**
 * Span 定义
 */
export interface Span {
  spanId: SpanId
  traceId: TraceId
  name: string
  kind: SpanKind
  status: SpanStatus
  startTime: number
  endTime?: number
  duration?: number
  attributes: Record<string, string | number | boolean>
  events: SpanEvent[]
  links: SpanLink[]
  parentSpanId?: SpanId
}

/**
 * 追踪元数据
 */
export interface TraceMetadata {
  traceId: TraceId
  spanId: SpanId
  serviceName: string
  serviceVersion?: string
  environment?: string
  operationType?: string
  timestamp: number
}

/**
 * 追踪查询过滤器
 */
export interface TraceFilter {
  traceId?: TraceId
  traceIds?: TraceId[]
  serviceName?: string
  operationName?: string
  minDuration?: number
  maxDuration?: number
  status?: SpanStatusCode
  timeRange?: TimeRange
  tags?: Tags
  hasErrors?: boolean
  limit?: number
  offset?: number
}

/**
 * 完整的追踪数据
 */
export interface Trace {
  traceId: TraceId
  rootSpanName: string
  rootSpanId: SpanId
  spans: Span[]
  duration: number
  startTime: number
  endTime: number
  status: SpanStatusCode
  serviceCount: number
  spanCount: number
  hasErrors: boolean
}

/**
 * 采样策略
 */
export interface SamplingStrategy {
  type: 'always' | 'never' | 'probabilistic' | 'ratelimit'
  rate?: number // 0-1 for probabilistic
  maxTracesPerSecond?: number // for ratelimit
}

// ============================================
// Logging Types
// ============================================

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: string
  level: string
  message: string
  trace?: {
    traceId: string
    spanId?: string
    parentSpanId?: string
  }
  fields?: Record<string, unknown>
  error?: {
    type: string
    message: string
    stacktrace?: string
    cause?: string
  }
  service?: string
  environment?: string
  version?: string
}

/**
 * 日志查询过滤器
 */
export interface LogFilter {
  levels?: LogLevel[]
  message?: string
  messageRegex?: string
  traceId?: TraceId
  spanId?: SpanId
  serviceName?: string
  timeRange?: TimeRange
  fields?: Record<string, unknown>
  hasError?: boolean
  limit?: number
  offset?: number
}

/**
 * 日志聚合结果
 */
export interface LogAggregate {
  level: string
  count: number
  firstOccurrence: string
  lastOccurrence: string
  sampleMessage?: string
}

// ============================================
// Dashboard Types
// ============================================

/**
 * 仪表板小组件类型
 */
export enum WidgetType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  GAUGE = 'gauge',
  STAT = 'stat',
  TABLE = 'table',
  HEATMAP = 'heatmap',
  TRACE_LIST = 'trace_list',
  LOG_LIST = 'log_list',
}

/**
 * 仪表板小组件
 */
export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  width: number
  height: number
  x: number
  y: number
  config: Record<string, unknown>
  dataSource: {
    type: 'metric' | 'trace' | 'log'
    query: MetricFilter | TraceFilter | LogFilter
  }
}

/**
 * 仪表板定义
 */
export interface Dashboard {
  id: string
  name: string
  description?: string
  widgets: DashboardWidget[]
  timeRange?: TimeRange
  refreshInterval?: number
  tags?: string[]
  createdAt: number
  updatedAt: number
}

/**
 * 仪表板数据
 */
export interface DashboardData {
  dashboardId: string
  timeRange: TimeRange
  generatedAt: number
  widgets: Array<{
    id: string
    data: unknown
    error?: string
  }>
}

// ============================================
// Alert Types
// ============================================

/**
 * 告警严重程度
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 告警状态
 */
export enum AlertState {
  FIRING = 'firing',
  RESOLVED = 'resolved',
  PENDING = 'pending',
  INACTIVE = 'inactive',
}

/**
 * 告警规则
 */
export interface AlertRule {
  id: string
  name: string
  description?: string
  severity: AlertSeverity
  enabled: boolean
  condition: AlertCondition
  duration?: number // 持续时间(ms)
  labels?: Tags
  annotations?: Record<string, string>
  notificationChannels?: string[]
}

/**
 * 告警条件
 */
export interface AlertCondition {
  type: 'metric' | 'trace' | 'log'
  query: MetricFilter | TraceFilter | LogFilter
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq'
  threshold: number
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'rate'
  groupBy?: string[]
}

/**
 * 告警实例
 */
export interface AlertInstance {
  ruleId: string
  state: AlertState
  severity: AlertSeverity
  startedAt: number
  resolvedAt?: number
  value: number
  labels: Tags
  annotations: Record<string, string>
}

// ============================================
// Observability Hub Types
// ============================================

/**
 * 可观测性中心配置
 */
export interface ObservabilityConfig {
  serviceName: string
  serviceVersion?: string
  environment?: string
  
  // Metrics 配置
  metrics?: {
    enabled?: boolean
    collectInterval?: number
    exportInterval?: number
    prometheusEnabled?: boolean
    prometheusPort?: number
  }
  
  // Tracing 配置
  tracing?: {
    enabled?: boolean
    samplingStrategy?: SamplingStrategy
    maxSpansPerTrace?: number
    exportEndpoint?: string
  }
  
  // Logging 配置
  logging?: {
    enabled?: boolean
    minLevel?: LogLevel
    consoleEnabled?: boolean
    fileEnabled?: boolean
    filePath?: string
    jsonOutput?: boolean
  }
  
  // Dashboard 配置
  dashboard?: {
    enabled?: boolean
    refreshInterval?: number
  }
  
  // Alert 配置
  alerts?: {
    enabled?: boolean
    checkInterval?: number
  }
}

/**
 * 可观测性中心状态
 */
export interface ObservabilityStatus {
  metrics: {
    enabled: boolean
    registeredCount: number
    collectedCount: number
  }
  tracing: {
    enabled: boolean
    activeTraces: number
    activeSpans: number
  }
  logging: {
    enabled: boolean
    entriesCount: number
  }
  dashboard: {
    enabled: boolean
    dashboardsCount: number
  }
  alerts: {
    enabled: boolean
    rulesCount: number
    activeAlerts: number
  }
}

// ============================================
// Export Functions
// ============================================

/**
 * 生成 Trace ID
 */
export function generateTraceId(): TraceId {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  }
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 生成 Span ID
 */
export function generateSpanId(): SpanId {
  const bytes = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  }
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
