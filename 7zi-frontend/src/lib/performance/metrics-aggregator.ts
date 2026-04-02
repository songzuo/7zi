/**
 * Metrics Aggregator
 * 指标聚合器 - 计算 P50, P95, P99 等百分位统计
 */

import type {
  MetricDataPoint,
  AggregatedMetricResult,
  MetricsHistory,
  SystemMetrics,
  ResponseTimeMetrics,
  ErrorRateMetrics,
  ThroughputMetrics,
} from './metrics-types'

/**
 * 聚合器配置
 */
export interface MetricsAggregatorConfig {
  /** 最大历史记录数 */
  maxHistorySize: number
  /** 默认百分位数 */
  defaultPercentiles: number[]
  /** 是否自动清理过期数据 */
  autoCleanup: boolean
  /** 数据过期时间 (ms) */
  dataExpiryMs: number
}

/**
 * 默认聚合器配置
 */
const DEFAULT_AGGREGATOR_CONFIG: MetricsAggregatorConfig = {
  maxHistorySize: 100,
  defaultPercentiles: [50, 90, 95, 99],
  autoCleanup: true,
  dataExpiryMs: 3600000, // 1 小时
}

/**
 * 指标聚合器
 */
export class MetricsAggregator {
  private config: MetricsAggregatorConfig
  private history: MetricsHistory

  constructor(config: Partial<MetricsAggregatorConfig> = {}) {
    this.config = { ...DEFAULT_AGGREGATOR_CONFIG, ...config }
    this.history = this.initHistory()
  }

  /**
   * 初始化历史记录
   */
  private initHistory(): MetricsHistory {
    return {
      system: [],
      responseTime: [],
      errorRate: [],
      throughput: [],
      maxItems: this.config.maxHistorySize,
    }
  }

  /**
   * 添加系统指标到历史
   */
  addSystemMetrics(metrics: SystemMetrics): void {
    this.history.system.push(metrics)
    this.enforceHistoryLimit('system')
  }

  /**
   * 添加响应时间指标到历史
   */
  addResponseTimeMetrics(metrics: ResponseTimeMetrics): void {
    this.history.responseTime.push(metrics)
    this.enforceHistoryLimit('responseTime')
  }

  /**
   * 添加错误率指标到历史
   */
  addErrorRateMetrics(metrics: ErrorRateMetrics): void {
    this.history.errorRate.push(metrics)
    this.enforceHistoryLimit('errorRate')
  }

  /**
   * 添加吞吐量指标到历史
   */
  addThroughputMetrics(metrics: ThroughputMetrics): void {
    this.history.throughput.push(metrics)
    this.enforceHistoryLimit('throughput')
  }

  /**
   * 从原始数据聚合指标
   */
  aggregateFromDataPoints(dataPoints: MetricDataPoint[]): AggregatedMetricResult {
    if (dataPoints.length === 0) {
      return this.emptyAggregatedResult()
    }

    const values = dataPoints.map(dp => dp.value).sort((a, b) => a - b)
    const timestamps = dataPoints.map(dp => dp.timestamp)

    return {
      min: values[0],
      max: values[values.length - 1],
      avg: this.mean(values),
      p50: this.percentile(values, 50),
      p90: this.percentile(values, 90),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99),
      stdDev: this.standardDeviation(values),
      count: values.length,
      timeRange: {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps),
      },
    }
  }

  /**
   * 计算指定百分位数
   */
  calculatePercentile(dataPoints: MetricDataPoint[], percentile: number): number {
    if (dataPoints.length === 0) return 0

    const sortedValues = dataPoints.map(dp => dp.value).sort((a, b) => a - b)
    return this.percentile(sortedValues, percentile)
  }

  /**
   * 计算百分位值（使用线性插值法）
   */
  percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0
    if (sortedValues.length === 1) return sortedValues[0]

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
   * 计算平均值
   */
  mean(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  /**
   * 计算中位数
   */
  median(values: number[]): number {
    if (values.length === 0) return 0
    return this.percentile(values, 50)
  }

  /**
   * 计算标准差
   */
  standardDeviation(values: number[]): number {
    if (values.length === 0) return 0
    if (values.length === 1) return 0

    const avg = this.mean(values)
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2))
    const variance = this.mean(squaredDiffs)
    return Math.sqrt(variance)
  }

  /**
   * 计算移动平均
   */
  movingAverage(values: number[], windowSize: number): number[] {
    if (values.length < windowSize) {
      return [this.mean(values)]
    }

    const result: number[] = []
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1)
      result.push(this.mean(window))
    }
    return result
  }

  /**
   * 获取响应时间百分位统计
   */
  getResponseTimePercentiles(responseTimeHistory?: ResponseTimeMetrics[]): {
    p50: number
    p95: number
    p99: number
  } {
    const history = responseTimeHistory || this.history.responseTime

    if (history.length === 0) {
      return { p50: 0, p95: 0, p99: 0 }
    }

    const p50Values = history.map(m => m.p50).filter(v => v > 0)
    const p95Values = history.map(m => m.p95).filter(v => v > 0)
    const p99Values = history.map(m => m.p99).filter(v => v > 0)

    return {
      p50: this.median(p50Values),
      p95: this.percentile(
        p95Values.sort((a, b) => a - b),
        95
      ),
      p99: this.percentile(
        p99Values.sort((a, b) => a - b),
        99
      ),
    }
  }

  /**
   * 获取错误率趋势
   */
  getErrorRateTrend(errorRateHistory?: ErrorRateMetrics[]): 'increasing' | 'decreasing' | 'stable' {
    const history = errorRateHistory || this.history.errorRate

    if (history.length < 2) {
      return 'stable'
    }

    const recent = history.slice(-5)
    const values = recent.map(m => m.rate)

    if (values.length < 2) {
      return 'stable'
    }

    const first = values.slice(0, Math.floor(values.length / 2))
    const second = values.slice(Math.floor(values.length / 2))

    const firstAvg = this.mean(first)
    const secondAvg = this.mean(second)
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100

    if (changePercent > 10) return 'increasing'
    if (changePercent < -10) return 'decreasing'
    return 'stable'
  }

  /**
   * 获取吞吐量趋势
   */
  getThroughputTrend(
    throughputHistory?: ThroughputMetrics[]
  ): 'increasing' | 'decreasing' | 'stable' {
    const history = throughputHistory || this.history.throughput

    if (history.length < 2) {
      return 'stable'
    }

    const recent = history.slice(-10)
    const values = recent.map(m => m.requestsPerMinute)

    if (values.length < 2) {
      return 'stable'
    }

    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))

    const firstAvg = this.mean(firstHalf)
    const secondAvg = this.mean(secondHalf)
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100

    if (changePercent > 10) return 'increasing'
    if (changePercent < -10) return 'decreasing'
    return 'stable'
  }

  /**
   * 获取时间加权平均
   */
  getTimeWeightedAverage(dataPoints: MetricDataPoint[]): number {
    if (dataPoints.length === 0) return 0
    if (dataPoints.length === 1) return dataPoints[0].value

    // 按时间排序
    const sorted = [...dataPoints].sort((a, b) => a.timestamp - b.timestamp)

    let weightedSum = 0
    let totalWeight = 0

    for (let i = 1; i < sorted.length; i++) {
      const duration = sorted[i].timestamp - sorted[i - 1].timestamp
      const weight = duration
      const avgValue = (sorted[i].value + sorted[i - 1].value) / 2

      weightedSum += avgValue * weight
      totalWeight += duration
    }

    return totalWeight > 0 ? weightedSum / totalWeight : sorted[0].value
  }

  /**
   * 获取历史记录
   */
  getHistory(): MetricsHistory {
    return {
      ...this.history,
      system: [...this.history.system],
      responseTime: [...this.history.responseTime],
      errorRate: [...this.history.errorRate],
      throughput: [...this.history.throughput],
    }
  }

  /**
   * 获取指定时间范围的历史
   */
  getHistoryInRange(
    startTime: number,
    endTime: number
  ): {
    system: SystemMetrics[]
    responseTime: ResponseTimeMetrics[]
    errorRate: ErrorRateMetrics[]
    throughput: ThroughputMetrics[]
  } {
    return {
      system: this.history.system.filter(m => m.timestamp >= startTime && m.timestamp <= endTime),
      responseTime: this.history.responseTime.filter(
        m => m.timestamp >= startTime && m.timestamp <= endTime
      ),
      errorRate: this.history.errorRate.filter(
        m => m.timestamp >= startTime && m.timestamp <= endTime
      ),
      throughput: this.history.throughput.filter(
        m => m.timestamp >= startTime && m.timestamp <= endTime
      ),
    }
  }

  /**
   * 获取最新 N 条历史记录
   */
  getLatestHistory(count: number): MetricsHistory {
    return {
      system: this.history.system.slice(-count),
      responseTime: this.history.responseTime.slice(-count),
      errorRate: this.history.errorRate.slice(-count),
      throughput: this.history.throughput.slice(-count),
      maxItems: this.config.maxHistorySize,
    }
  }

  /**
   * 清理过期数据
   */
  cleanupExpiredData(): void {
    const cutoff = Date.now() - this.config.dataExpiryMs

    this.history.system = this.history.system.filter(m => m.timestamp > cutoff)
    this.history.responseTime = this.history.responseTime.filter(m => m.timestamp > cutoff)
    this.history.errorRate = this.history.errorRate.filter(m => m.timestamp > cutoff)
    this.history.throughput = this.history.throughput.filter(m => m.timestamp > cutoff)
  }

  /**
   * 强制执行历史记录限制
   */
  private enforceHistoryLimit(type: 'system' | 'responseTime' | 'errorRate' | 'throughput'): void {
    const maxItems = this.config.maxHistorySize

    if (type === 'system' && this.history.system.length > maxItems) {
      this.history.system = this.history.system.slice(-maxItems)
    } else if (type === 'responseTime' && this.history.responseTime.length > maxItems) {
      this.history.responseTime = this.history.responseTime.slice(-maxItems)
    } else if (type === 'errorRate' && this.history.errorRate.length > maxItems) {
      this.history.errorRate = this.history.errorRate.slice(-maxItems)
    } else if (type === 'throughput' && this.history.throughput.length > maxItems) {
      this.history.throughput = this.history.throughput.slice(-maxItems)
    }
  }

  /**
   * 返回空聚合结果
   */
  private emptyAggregatedResult(): AggregatedMetricResult {
    return {
      min: 0,
      max: 0,
      avg: 0,
      p50: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
      count: 0,
      timeRange: {
        start: 0,
        end: 0,
      },
    }
  }

  /**
   * 重置历史记录
   */
  reset(): void {
    this.history = this.initHistory()
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MetricsAggregatorConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取配置
   */
  getConfig(): MetricsAggregatorConfig {
    return { ...this.config }
  }
}

// 单例实例
export const metricsAggregator = new MetricsAggregator()
