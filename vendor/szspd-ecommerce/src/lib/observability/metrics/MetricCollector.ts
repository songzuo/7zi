/**
 * MetricCollector - 指标收集器
 * 
 * 支持 Counter、Gauge、Histogram、Summary 四种指标类型
 * 
 * @version v1.11.0
 */

import {
  MetricType,
  MetricValue,
  MetricDefinition,
  MetricAggregate,
  MetricFilter,
  Tags,
  TimeRange,
} from '../types'

// ============================================
// Metric Base
// ============================================

interface MetricData {
  definition: MetricDefinition
  values: MetricValue[]
}

// ============================================
// MetricCollector Class
// ============================================

export class MetricCollector {
  private metrics: Map<string, MetricData> = new Map()
  private collectInterval: ReturnType<typeof setInterval> | undefined
  private maxValuesPerMetric: number = 10000

  constructor(options?: { maxValuesPerMetric?: number }) {
    if (options?.maxValuesPerMetric) {
      this.maxValuesPerMetric = options.maxValuesPerMetric
    }
  }

  // ============================================
  // Metric Registration
  // ============================================

  /**
   * 注册指标定义
   */
  register(definition: MetricDefinition): void {
    if (this.metrics.has(definition.name)) {
      console.warn(`Metric ${definition.name} already registered, overwriting`)
    }

    this.metrics.set(definition.name, {
      definition,
      values: [],
    })
  }

  /**
   * 批量注册指标
   */
  registerAll(definitions: MetricDefinition[]): void {
    for (const def of definitions) {
      this.register(def)
    }
  }

  /**
   * 注销指标
   */
  unregister(name: string): boolean {
    return this.metrics.delete(name)
  }

  /**
   * 检查指标是否已注册
   */
  has(name: string): boolean {
    return this.metrics.has(name)
  }

  /**
   * 获取所有已注册的指标定义
   */
  getDefinitions(): MetricDefinition[] {
    return Array.from(this.metrics.values()).map(m => m.definition)
  }

  // ============================================
  // Metric Recording
  // ============================================

  /**
   * 记录指标值
   * @param name 指标名称
   * @param value 指标值
   * @param tags 标签/维度
   */
  record(name: string, value: number, tags?: Tags): void {
    const metric = this.metrics.get(name)
    if (!metric) {
      // 自动注册为 gauge
      this.register({ name, type: MetricType.GAUGE })
      return this.record(name, value, tags)
    }

    const now = Date.now()
    const metricValue: MetricValue = {
      name,
      type: metric.definition.type,
      value,
      tags,
      timestamp: now,
    }

    // 根据类型处理
    switch (metric.definition.type) {
      case MetricType.COUNTER:
        // Counter 只增不减
        metric.values.push(metricValue)
        break

      case MetricType.GAUGE:
        // Gauge 可增可减
        metric.values.push(metricValue)
        break

      case MetricType.HISTOGRAM:
        // Histogram 存储原始值，后续计算分布
        metric.values.push(metricValue)
        break

      case MetricType.SUMMARY:
        // Summary 存储原始值，后续计算分位数
        metric.values.push(metricValue)
        break
    }

    // 限制存储数量
    if (metric.values.length > this.maxValuesPerMetric) {
      metric.values = metric.values.slice(-this.maxValuesPerMetric)
    }
  }

  /**
   * 递增 Counter
   */
  increment(name: string, value: number = 1, tags?: Tags): void {
    const metric = this.metrics.get(name)
    if (!metric || metric.definition.type !== MetricType.COUNTER) {
      this.register({ name, type: MetricType.COUNTER })
    }
    this.record(name, value, tags)
  }

  /**
   * 设置 Gauge 值
   */
  gauge(name: string, value: number, tags?: Tags): void {
    const metric = this.metrics.get(name)
    if (!metric || metric.definition.type !== MetricType.GAUGE) {
      this.register({ name, type: MetricType.GAUGE })
    }
    this.record(name, value, tags)
  }

  /**
   * 观察值 (用于 Histogram/Summary)
   */
  observe(name: string, value: number, tags?: Tags): void {
    const metric = this.metrics.get(name)
    if (!metric || (metric.definition.type !== MetricType.HISTOGRAM && metric.definition.type !== MetricType.SUMMARY)) {
      this.register({ name, type: MetricType.HISTOGRAM })
    }
    this.record(name, value, tags)
  }

  /**
   * 计时 (返回结束函数)
   */
  startTimer(name: string, tags?: Tags): () => number {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      this.observe(name, duration, tags)
      return duration
    }
  }

  // ============================================
  // Metric Query
  // ============================================

  /**
   * 获取指标值
   */
  getValue(name: string, tags?: Tags): MetricValue[] {
    const metric = this.metrics.get(name)
    if (!metric) return []

    if (!tags) return [...metric.values]

    return metric.values.filter(v => this.matchTags(v.tags, tags))
  }

  /**
   * 获取最新值
   */
  getLatest(name: string, tags?: Tags): MetricValue | undefined {
    const values = this.getValue(name, tags)
    return values[values.length - 1]
  }

  /**
   * 聚合查询
   */
  aggregate(name: string, options?: {
    tags?: Tags
    timeRange?: TimeRange
    groupBy?: string[]
  }): MetricAggregate | undefined {
    const metric = this.metrics.get(name)
    if (!metric) return undefined

    let values = metric.values

    // 时间过滤
    if (options?.timeRange) {
      const start = typeof options.timeRange.start === 'number'
        ? options.timeRange.start
        : options.timeRange.start.getTime()
      const end = typeof options.timeRange.end === 'number'
        ? options.timeRange.end
        : options.timeRange.end.getTime()
      values = values.filter(v => v.timestamp >= start && v.timestamp <= end)
    }

    // 标签过滤
    if (options?.tags) {
      values = values.filter(v => this.matchTags(v.tags, options.tags))
    }

    if (values.length === 0) return undefined

    const numbers = values.map(v => v.value)
    numbers.sort((a, b) => a - b)

    return {
      name,
      count: numbers.length,
      sum: numbers.reduce((a, b) => a + b, 0),
      min: numbers[0],
      max: numbers[numbers.length - 1],
      avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
      p50: this.percentile(numbers, 0.5),
      p95: this.percentile(numbers, 0.95),
      p99: this.percentile(numbers, 0.99),
      tags: options?.tags,
      timeRange: options?.timeRange || { start: values[0].timestamp, end: values[values.length - 1].timestamp },
    }
  }

  /**
   * 查询多个指标
   */
  query(filter: MetricFilter): MetricAggregate[] {
    const results: MetricAggregate[] = []

    const names = filter.names || Array.from(this.metrics.keys())

    for (const name of names) {
      const agg = this.aggregate(name, {
        tags: filter.tags,
        timeRange: filter.timeRange,
        groupBy: filter.groupBy,
      })
      if (agg) results.push(agg)
    }

    return results
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * 匹配标签
   */
  private matchTags(valueTags?: Tags, filterTags?: Tags): boolean {
    if (!filterTags) return true
    if (!valueTags) return false

    for (const [key, value] of Object.entries(filterTags)) {
      if (valueTags[key] !== value) return false
    }
    return true
  }

  /**
   * 计算百分位数
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0
    const idx = Math.ceil(p * sortedValues.length) - 1
    return sortedValues[Math.max(0, idx)]
  }

  /**
   * 清除指标值
   */
  clear(name?: string): void {
    if (name) {
      const metric = this.metrics.get(name)
      if (metric) metric.values = []
    } else {
      const metrics = Array.from(this.metrics.values())
      for (const metric of metrics) {
        metric.values = []
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    registeredCount: number
    collectedCount: number
    totalSize: number
  } {
    let totalSize = 0
    const metrics = Array.from(this.metrics.values())
    for (const metric of metrics) {
      totalSize += metric.values.length
    }

    return {
      registeredCount: this.metrics.size,
      collectedCount: totalSize,
      totalSize,
    }
  }
}

// ============================================
// Singleton
// ============================================

let defaultCollector: MetricCollector | undefined

export function getMetricCollector(): MetricCollector {
  if (!defaultCollector) {
    defaultCollector = new MetricCollector()
  }
  return defaultCollector
}

export function initMetricCollector(options?: { maxValuesPerMetric?: number }): MetricCollector {
  defaultCollector = new MetricCollector(options)
  return defaultCollector
}
