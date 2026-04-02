/**
 * Performance Metrics Types
 * 性能指标类型定义 v1.9.0
 */

/**
 * 系统性能指标
 */
export interface SystemMetrics {
  /** CPU 使用率 (百分比 0-100) */
  cpuUsage: number
  /** 内存使用率 (百分比 0-100) */
  memoryUsage: number
  /** 堆内存使用 (MB) */
  heapUsed?: number
  /** 堆内存总量 (MB) */
  heapTotal?: number
  /** 外部内存 (MB) */
  external?: number
  /** RSS 内存 (MB) */
  rss?: number
  /** 采集时间戳 */
  timestamp: number
}

/**
 * 响应时间指标
 */
export interface ResponseTimeMetrics {
  /** 平均响应时间 (ms) */
  average: number
  /** 最小响应时间 (ms) */
  min: number
  /** 最大响应时间 (ms) */
  max: number
  /** P50 响应时间 (ms) */
  p50: number
  /** P95 响应时间 (ms) */
  p95: number
  /** P99 响应时间 (ms) */
  p99: number
  /** 样本数量 */
  sampleCount: number
  /** 采集时间戳 */
  timestamp: number
}

/**
 * 错误率指标
 */
export interface ErrorRateMetrics {
  /** 错误率 (百分比 0-100) */
  rate: number
  /** 总请求数 */
  totalRequests: number
  /** 错误请求数 */
  errorCount: number
  /** 按错误类型分类 */
  errorsByType?: Record<string, number>
  /** 按状态码分类 */
  errorsByStatus?: Record<string, number>
  /** 采集时间戳 */
  timestamp: number
}

/**
 * 吞吐量指标
 */
export interface ThroughputMetrics {
  /** 每分钟请求数 (req/min) */
  requestsPerMinute: number
  /** 每秒请求数 (req/s) */
  requestsPerSecond: number
  /** 统计时间窗口 (ms) */
  timeWindowMs: number
  /** 总请求数 */
  totalRequests: number
  /** 采集时间戳 */
  timestamp: number
}

/**
 * 综合性能指标
 */
export interface PerformanceMetrics {
  /** 系统指标 */
  system: SystemMetrics
  /** 响应时间指标 */
  responseTime: ResponseTimeMetrics
  /** 错误率指标 */
  errorRate: ErrorRateMetrics
  /** 吞吐量指标 */
  throughput: ThroughputMetrics
  /** 采集时间戳 */
  timestamp: number
  /** 指标版本 */
  version: string
}

/**
 * 指标数据点
 */
export interface MetricDataPoint {
  value: number
  timestamp: number
  metadata?: Record<string, unknown>
}

/**
 * 指标采集器配置
 */
export interface MetricsCollectorConfig {
  /** 是否启用 CPU 采集 */
  collectCpu: boolean
  /** 是否启用内存采集 */
  collectMemory: boolean
  /** 是否启用响应时间采集 */
  collectResponseTime: boolean
  /** 是否启用错误率采集 */
  collectErrorRate: boolean
  /** 是否启用吞吐量采集 */
  collectThroughput: boolean
  /** 采集间隔 (ms) */
  collectInterval: number
  /** 响应时间样本保留数量 */
  responseTimeSampleSize: number
  /** 吞吐量统计时间窗口 (ms) */
  throughputTimeWindow: number
}

/**
 * 指标聚合结果
 */
export interface AggregatedMetricResult {
  /** 最小值 */
  min: number
  /** 最大值 */
  max: number
  /** 平均值 */
  avg: number
  /** P50 百分位 */
  p50: number
  /** P90 百分位 */
  p90: number
  /** P95 百分位 */
  p95: number
  /** P99 百分位 */
  p99: number
  /** 标准差 */
  stdDev: number
  /** 样本数量 */
  count: number
  /** 时间范围 */
  timeRange: {
    start: number
    end: number
  }
}

/**
 * 指标历史记录
 */
export interface MetricsHistory {
  /** 系统指标历史 */
  system: SystemMetrics[]
  /** 响应时间历史 */
  responseTime: ResponseTimeMetrics[]
  /** 错误率历史 */
  errorRate: ErrorRateMetrics[]
  /** 吞吐量历史 */
  throughput: ThroughputMetrics[]
  /** 最大保留数量 */
  maxItems: number
}

/**
 * 指标报告格式
 */
export type ReportFormat = 'text' | 'html' | 'json'

/**
 * 指标报告配置
 */
export interface MetricsReportConfig {
  /** 报告格式 */
  format: ReportFormat
  /** 是否包含系统指标 */
  includeSystem: boolean
  /** 是否包含响应时间指标 */
  includeResponseTime: boolean
  /** 是否包含错误率指标 */
  includeErrorRate: boolean
  /** 是否包含吞吐量指标 */
  includeThroughput: boolean
  /** 是否包含历史趋势 */
  includeHistory: boolean
  /** 历史数据点数 */
  historyPoints: number
}

/**
 * 告警阈值配置
 */
export interface MetricsThreshold {
  /** 指标名称 */
  metric: keyof Omit<PerformanceMetrics, 'timestamp' | 'version'>
  /** 警告阈值 */
  warning: number
  /** 严重阈值 */
  critical: number
  /** 是否启用 */
  enabled: boolean
}

/**
 * 指标状态
 */
export type MetricStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

/**
 * 指标健康检查结果
 */
export interface MetricsHealthCheck {
  /** 状态 */
  status: MetricStatus
  /** 检查项 */
  checks: {
    name: string
    status: MetricStatus
    value: number
    threshold: number
    message: string
  }[]
  /** 检查时间 */
  timestamp: number
}
