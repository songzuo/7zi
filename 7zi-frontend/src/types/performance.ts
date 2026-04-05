/**
 * Performance Monitoring Types
 * 性能监控类型定义
 */

/**
 * Web Vitals 指标类型
 */
export interface WebVitalsMetrics {
  // Core Web Vitals
  LCP?: number // Largest Contentful Paint - 最大内容绘制
  CLS?: number // Cumulative Layout Shift - 累积布局偏移
  INP?: number // Interaction to Next Paint - 交互到下一次绘制的延迟

  // Other Web Vitals
  FCP?: number // First Contentful Paint - 首次内容绘制
  TTFB?: number // Time to First Byte - 首字节时间
}

/**
 * 自定义指标类型
 */
export interface CustomMetrics {
  // 页面加载指标
  pageLoadTime?: number // 页面完全加载时间
  domContentLoaded?: number // DOM 内容加载完成时间
  firstPaint?: number // 首次绘制时间
  firstContentfulPaint?: number // 首次内容绘制时间

  // 资源加载指标
  largestContentfulPaint?: number // 最大内容绘制时间

  // 网络指标
  dnsLookup?: number // DNS 查询时间
  tcpConnection?: number // TCP 连接时间
  tlsHandshake?: number // TLS 握手时间
  serverResponse?: number // 服务器响应时间

  // WebSocket 指标
  wsConnectTime?: number // WebSocket 连接时间
  wsLatency?: number // WebSocket 延迟 (ping-pong)
  wsMessagesPerSecond?: number // 每秒消息数
  wsReconnectCount?: number // 重连次数

  // API 指标
  apiAverageResponseTime?: number // API 平均响应时间
  apiSuccessRate?: number // API 成功率
  apiErrorRate?: number // API 错误率

  // 错误指标
  errorCount?: number // 错误总数
  errorRate?: number // 错误率 (错误数/请求数)

  // 内存指标
  memoryUsage?: number // 内存使用量 (MB)
  memoryLimit?: number // 内存限制 (MB)
  memoryUsagePercent?: number // 内存使用百分比
}

/**
 * 性能预算配置
 */
export interface PerformanceBudget {
  // Core Web Vitals
  webVitals: {
    LCP: { threshold: number; weight: number }
    CLS: { threshold: number; weight: number }
    INP: { threshold: number; weight: number }
  }

  // Custom Metrics
  customMetrics: {
    pageLoadTime: { threshold: number; weight: number }
    apiAverageResponseTime: { threshold: number; weight: number }
    apiErrorRate: { threshold: number; weight: number }
    memoryUsagePercent: { threshold: number; weight: number }
    wsLatency: { threshold: number; weight: number }
  }

  // Resource Budget
  resources: {
    totalSize: number // 总大小
    scriptSize: number
    stylesheetSize: number
    imageSize: number
  }
}

/**
 * 告警规则
 */
export interface AlarmRule {
  id: string
  name: string
  description: string
  metric: string // 指标名称
  condition: 'greater' | 'less' | 'equals' | 'greater_equal' | 'less_equal'
  threshold: number
  windowMs: number // 时间窗口
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  cooldownMs: number // 冷却时间
}

/**
 * 告警事件
 */
export interface AlarmNotification {
  id: string
  ruleId: string
  ruleName: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  metric: string
  currentValue: number
  threshold: number
  condition: string
  message: string
  timestamp: number
  acknowledged: boolean
  resolved: boolean
  resolvedAt?: number
}

/**
 * 性能预算报告
 */
export interface PerformanceBudgetReport {
  overallScore: number // 0-100
  webVitalsScore: number
  customMetricsScore: number
  resourceScore: number
  status: 'pass' | 'warning' | 'fail'
  violations: BudgetViolation[]
  recommendations: string[]
}

/**
 * 预算违规
 */
export interface BudgetViolation {
  metric: string
  currentValue: number
  threshold: number
  severity: 'low' | 'medium' | 'high'
  impact: string
}

/**
 * 性能指标评级
 */
export type MetricRating = 'good' | 'needs-improvement' | 'poor'

/**
 * 性能指标状态
 */
export interface MetricStatus {
  value: number
  rating: MetricRating
  threshold: number
  isGood: boolean
}

/**
 * 性能摘要
 */
export interface PerformanceSummary {
  webVitals: WebVitalsMetrics
  customMetrics: CustomMetrics
  budget: PerformanceBudgetReport
  timestamp: number
}

/**
 * 性能趋势数据点
 */
export interface PerformanceTrendDataPoint {
  timestamp: number
  value: number
  metric: string
}

/**
 * 性能趋势
 */
export interface PerformanceTrend {
  metric: string
  data: PerformanceTrendDataPoint[]
  trend: 'up' | 'down' | 'stable'
  average: number
  min: number
  max: number
}
