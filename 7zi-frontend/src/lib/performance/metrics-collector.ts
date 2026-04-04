/**
 * Metrics Collector
 * 指标采集器 - 收集 CPU, Memory, ResponseTime, ErrorRate, Throughput
 */

import type {
  SystemMetrics,
  ResponseTimeMetrics,
  ErrorRateMetrics,
  ThroughputMetrics,
  PerformanceMetrics,
  MetricDataPoint,
  MetricsCollectorConfig,
} from './metrics-types'

/**
 * Extended Performance interface with memory API (Chrome-specific)
 */
export interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

/**
 * 默认采集器配置
 */
const DEFAULT_COLLECTOR_CONFIG: MetricsCollectorConfig = {
  collectCpu: true,
  collectMemory: true,
  collectResponseTime: true,
  collectErrorRate: true,
  collectThroughput: true,
  collectInterval: 10000, // 10 秒
  responseTimeSampleSize: 1000,
  throughputTimeWindow: 60000, // 1 分钟
}

/**
 * 指标采集器
 */
export class MetricsCollector {
  private config: MetricsCollectorConfig
  private responseTimeSamples: MetricDataPoint[] = []
  private requestTimestamps: number[] = []
  private errorCount = 0
  private totalRequests = 0
  private errorsByType: Record<string, number> = {}
  private errorsByStatus: Record<string, number> = {}
  private collectIntervalId?: ReturnType<typeof setInterval>
  private isCollecting = false

  constructor(config: Partial<MetricsCollectorConfig> = {}) {
    this.config = { ...DEFAULT_COLLECTOR_CONFIG, ...config }
  }

  /**
   * 启动采集
   */
  start(): void {
    if (this.isCollecting) return

    this.isCollecting = true
    this.collectIntervalId = setInterval(() => {
      this.collect()
    }, this.config.collectInterval)
  }

  /**
   * 停止采集
   */
  stop(): void {
    if (this.collectIntervalId) {
      clearInterval(this.collectIntervalId)
      this.collectIntervalId = undefined
    }
    this.isCollecting = false
  }

  /**
   * 采集系统指标
   */
  collectSystemMetrics(): SystemMetrics {
    const timestamp = Date.now()

    // 浏览器环境
    if (typeof window !== 'undefined') {
      return this.collectBrowserSystemMetrics(timestamp)
    }

    // Node.js 环境
    if (typeof process !== 'undefined') {
      return this.collectNodeSystemMetrics(timestamp)
    }

    // 降级返回默认值
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      timestamp,
    }
  }

  /**
   * 浏览器环境系统指标采集
   */
  private collectBrowserSystemMetrics(timestamp: number): SystemMetrics {
    let memoryUsage = 0
    let heapUsed = 0
    let heapTotal = 0

    // Chrome 特有的 memory API
    const performanceWithMemory = performance as PerformanceWithMemory
    if (performanceWithMemory.memory) {
      const memory = performanceWithMemory.memory
      heapUsed = memory.usedJSHeapSize / 1024 / 1024
      heapTotal = memory.totalJSHeapSize / 1024 / 1024
      memoryUsage = (heapUsed / heapTotal) * 100
    }

    // CPU 使用率 - 浏览器环境无法直接获取，通过 Performance API 估算
    // 基于 long task 数量估算负载
    let cpuUsage = 0
    if (typeof PerformanceObserver !== 'undefined') {
      const longTaskEntries = performance.getEntriesByType('longtask')
      if (longTaskEntries.length > 0) {
        // 如果有 long tasks，说明 CPU 有负载
        const recentLongTasks = longTaskEntries.filter(entry => entry.startTime > Date.now() - 1000)
        cpuUsage = Math.min(100, recentLongTasks.length * 20)
      }
    }

    return {
      cpuUsage,
      memoryUsage,
      heapUsed,
      heapTotal,
      timestamp,
    }
  }

  /**
   * Node.js 环境系统指标采集
   */
  private collectNodeSystemMetrics(timestamp: number): SystemMetrics {
    const memoryUsage = process.memoryUsage()
    const heapUsed = memoryUsage.heapUsed / 1024 / 1024
    const heapTotal = memoryUsage.heapTotal / 1024 / 1024
    const external = memoryUsage.external / 1024 / 1024
    const rss = memoryUsage.rss / 1024 / 1024

    // 内存使用率
    const memoryUsagePercent = (heapUsed / heapTotal) * 100

    // CPU 使用率 - 使用 process.cpuUsage()
    const cpuUsage = process.cpuUsage()
    const totalCpu = cpuUsage.user + cpuUsage.system
    const elapsed = process.uptime() * 1000000 // 转换为微秒
    const cpuUsagePercent = elapsed > 0 ? (totalCpu / elapsed) * 100 : 0

    return {
      cpuUsage: Math.min(100, cpuUsagePercent),
      memoryUsage: memoryUsagePercent,
      heapUsed,
      heapTotal,
      external,
      rss,
      timestamp,
    }
  }

  /**
   * 记录响应时间
   */
  recordResponseTime(responseTime: number, metadata?: Record<string, unknown>): void {
    const dataPoint: MetricDataPoint = {
      value: responseTime,
      timestamp: Date.now(),
      metadata,
    }

    this.responseTimeSamples.push(dataPoint)

    // 限制样本数量
    if (this.responseTimeSamples.length > this.config.responseTimeSampleSize) {
      this.responseTimeSamples.shift()
    }

    // 同时记录请求时间戳用于吞吐量计算
    this.recordRequest()
  }

  /**
   * 记录请求
   */
  recordRequest(): void {
    this.requestTimestamps.push(Date.now())
    this.totalRequests++

    // 清理过期的时间戳
    this.cleanupRequestTimestamps()
  }

  /**
   * 记录错误
   */
  recordError(errorType: string, statusCode?: number): void {
    this.errorCount++
    this.errorsByType[errorType] = (this.errorsByType[errorType] || 0) + 1

    if (statusCode) {
      const statusKey = String(statusCode)
      this.errorsByStatus[statusKey] = (this.errorsByStatus[statusKey] || 0) + 1
    }
  }

  /**
   * 获取响应时间指标
   */
  getResponseTimeMetrics(): ResponseTimeMetrics {
    const timestamp = Date.now()

    if (this.responseTimeSamples.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        sampleCount: 0,
        timestamp,
      }
    }

    const values = this.responseTimeSamples.map(s => s.value).sort((a, b) => a - b)
    const sum = values.reduce((acc, val) => acc + val, 0)

    return {
      average: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99),
      sampleCount: values.length,
      timestamp,
    }
  }

  /**
   * 获取错误率指标
   */
  getErrorRateMetrics(): ErrorRateMetrics {
    const timestamp = Date.now()
    const rate = this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0

    return {
      rate,
      totalRequests: this.totalRequests,
      errorCount: this.errorCount,
      errorsByType: { ...this.errorsByType },
      errorsByStatus: { ...this.errorsByStatus },
      timestamp,
    }
  }

  /**
   * 获取吞吐量指标
   */
  getThroughputMetrics(): ThroughputMetrics {
    const timestamp = Date.now()
    this.cleanupRequestTimestamps()

    const timeWindowMs = this.config.throughputTimeWindow
    const requestCount = this.requestTimestamps.length
    const requestsPerSecond = timeWindowMs > 0 ? requestCount / (timeWindowMs / 1000) : 0
    const requestsPerMinute = requestsPerSecond * 60

    return {
      requestsPerMinute: Math.round(requestsPerMinute),
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      timeWindowMs,
      totalRequests: this.totalRequests,
      timestamp,
    }
  }

  /**
   * 获取完整性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const timestamp = Date.now()

    return {
      system: this.collectSystemMetrics(),
      responseTime: this.getResponseTimeMetrics(),
      errorRate: this.getErrorRateMetrics(),
      throughput: this.getThroughputMetrics(),
      timestamp,
      version: '1.9.0',
    }
  }

  /**
   * 执行采集（内部方法）
   */
  private collect(): void {
    // 触发系统指标采集
    this.collectSystemMetrics()

    // 清理过期数据
    this.cleanupRequestTimestamps()
  }

  /**
   * 清理过期的请求时间戳
   */
  private cleanupRequestTimestamps(): void {
    const cutoff = Date.now() - this.config.throughputTimeWindow
    this.requestTimestamps = this.requestTimestamps.filter(t => t > cutoff)
  }

  /**
   * 计算百分位值
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0
    if (sortedValues.length === 1) return sortedValues[0]

    // 使用线性插值法
    const index = (p / 100) * (sortedValues.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)

    if (lower === upper) {
      return sortedValues[lower]
    }

    const fraction = index - lower
    return sortedValues[lower] * (1 - fraction) + sortedValues[upper] * fraction
  }

  /**
   * 重置所有指标
   */
  reset(): void {
    this.responseTimeSamples = []
    this.requestTimestamps = []
    this.errorCount = 0
    this.totalRequests = 0
    this.errorsByType = {}
    this.errorsByStatus = {}
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MetricsCollectorConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取配置
   */
  getConfig(): MetricsCollectorConfig {
    return { ...this.config }
  }

  /**
   * 是否正在采集
   */
  isActive(): boolean {
    return this.isCollecting
  }
}

// 单例实例
export const metricsCollector = new MetricsCollector()
