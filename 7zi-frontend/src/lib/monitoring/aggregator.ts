/**
 * Metrics Aggregator
 * 指标聚合器 - 提供高级聚合功能
 */

import type { PerformanceMetric } from './types'

/**
 * 时间窗口聚合结果
 */
export interface TimeWindowBucket {
  startTime: number
  endTime: number
  count: number
  sum: number
  avg: number
  min: number
  max: number
  metrics: PerformanceMetric[]
}

/**
 * 百分位数结果
 */
export interface PercentileResult {
  p50: number
  p90: number
  p95: number
  p99: number
  min: number
  max: number
  count: number
}

/**
 * 趋势分析结果
 */
export interface TrendResult {
  direction: 'increasing' | 'decreasing' | 'stable'
  slope: number
  confidence: number // 0-1，表示趋势的置信度
  changePercent: number // 变化百分比
}

/**
 * 聚合统计结果
 */
export interface AggregationStats {
  count: number
  sum: number
  avg: number
  min: number
  max: number
  stdDev: number
  median: number
}

/**
 * MetricsAggregator 类
 * 提供指标聚合功能
 */
export class MetricsAggregator {
  /**
   * 按时间窗口聚合数据
   * @param data 指标数据数组
   * @param windowMs 时间窗口大小（毫秒）
   * @returns 时间窗口桶数组
   */
  static aggregateByTimeWindow(data: PerformanceMetric[], windowMs: number): TimeWindowBucket[] {
    if (!data || data.length === 0) {
      return []
    }

    if (windowMs <= 0) {
      throw new Error('Window size must be positive')
    }

    // 按时间排序
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp)

    const minTime = sorted[0].timestamp
    const maxTime = sorted[sorted.length - 1].timestamp

    // 计算需要的桶数量
    const bucketCount = Math.ceil((maxTime - minTime + 1) / windowMs)
    const buckets: TimeWindowBucket[] = []

    for (let i = 0; i < bucketCount; i++) {
      const startTime = minTime + i * windowMs
      const endTime = startTime + windowMs

      // 筛选属于当前桶的数据
      const bucketMetrics = sorted.filter(
        m => m.timestamp >= startTime && m.timestamp < endTime
      )

      if (bucketMetrics.length > 0) {
        const values = bucketMetrics.map(m => m.value)
        buckets.push({
          startTime,
          endTime,
          count: bucketMetrics.length,
          sum: values.reduce((a, b) => a + b, 0),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          metrics: bucketMetrics,
        })
      }
    }

    return buckets
  }

  /**
   * 计算百分位数
   * @param data 指标数据数组
   * @param percentiles 要计算的百分位数数组，默认 [50, 90, 95, 99]
   * @returns 百分位数结果
   */
  static aggregatePercentiles(
    data: PerformanceMetric[],
    percentiles: number[] = [50, 90, 95, 99]
  ): PercentileResult {
    if (!data || data.length === 0) {
      return {
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        count: 0,
      }
    }

    const values = data.map(m => m.value).sort((a, b) => a - b)
    const count = values.length

    const getPercentile = (p: number): number => {
      if (count === 1) return values[0]
      
      // 使用线性插值计算百分位数
      const index = (p / 100) * (count - 1)
      const lower = Math.floor(index)
      const upper = Math.ceil(index)
      const weight = index - lower

      if (lower === upper) {
        return values[lower]
      }

      return values[lower] * (1 - weight) + values[upper] * weight
    }

    return {
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
      min: values[0],
      max: values[count - 1],
      count,
    }
  }

  /**
   * 计算趋势
   * @param data 指标数据数组
   * @returns 趋势分析结果
   */
  static aggregateTrend(data: PerformanceMetric[]): TrendResult {
    if (!data || data.length < 2) {
      return {
        direction: 'stable',
        slope: 0,
        confidence: 0,
        changePercent: 0,
      }
    }

    // 按时间排序
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp)
    const n = sorted.length

    // 使用简单线性回归计算趋势
    // x = 时间戳，y = 值
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0
    let sumY2 = 0

    // 使用相对时间（秒）以避免大数值问题
    const baseTime = sorted[0].timestamp

    for (const point of sorted) {
      const x = (point.timestamp - baseTime) / 1000 // 转换为秒
      const y = point.value

      sumX += x
      sumY += y
      sumXY += x * y
      sumX2 += x * x
      sumY2 += y * y
    }

    // 计算斜率
    const denominator = n * sumX2 - sumX * sumX
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0

    // 计算相关系数（R）作为置信度
    const meanX = sumX / n
    const meanY = sumY / n
    
    let numerator = 0
    let denomX = 0
    let denomY = 0
    
    for (const point of sorted) {
      const x = (point.timestamp - baseTime) / 1000
      const y = point.value
      
      numerator += (x - meanX) * (y - meanY)
      denomX += (x - meanX) ** 2
      denomY += (y - meanY) ** 2
    }
    
    const correlation = denomX > 0 && denomY > 0 
      ? Math.abs(numerator / Math.sqrt(denomX * denomY))
      : 0

    // 计算变化百分比（基于初始值）
    const firstValue = sorted[0].value
    const lastValue = sorted[n - 1].value
    const changePercent = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0

    // 判断趋势方向
    // 使用变化百分比来判断是否稳定（变化小于 5% 视为稳定）
    const stabilityThreshold = 5 // 5% 的阈值
    
    let direction: 'increasing' | 'decreasing' | 'stable'
    if (Math.abs(changePercent) < stabilityThreshold) {
      direction = 'stable'
    } else {
      direction = slope > 0 ? 'increasing' : 'decreasing'
    }

    return {
      direction,
      slope,
      confidence: Math.min(correlation, 1), // 确保不超过 1
      changePercent,
    }
  }

  /**
   * 计算完整的聚合统计
   * @param data 指标数据数组
   * @returns 聚合统计结果
   */
  static getStats(data: PerformanceMetric[]): AggregationStats {
    if (!data || data.length === 0) {
      return {
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        median: 0,
      }
    }

    const values = data.map(m => m.value)
    const count = values.length
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / count
    const min = Math.min(...values)
    const max = Math.max(...values)

    // 计算标准差
    const squaredDiffs = values.map(v => (v - avg) ** 2)
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count
    const stdDev = Math.sqrt(variance)

    // 计算中位数
    const sorted = [...values].sort((a, b) => a - b)
    const median = count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)]

    return {
      count,
      sum,
      avg,
      min,
      max,
      stdDev,
      median,
    }
  }

  /**
   * 分组聚合
   * @param data 指标数据数组
   * @param keySelector 分组键选择器
   * @returns 分组统计结果
   */
  static groupBy<K extends string | number>(
    data: PerformanceMetric[],
    keySelector: (metric: PerformanceMetric) => K
  ): Map<K, AggregationStats> {
    const groups = new Map<K, PerformanceMetric[]>()

    for (const metric of data) {
      const key = keySelector(metric)
      const group = groups.get(key) || []
      group.push(metric)
      groups.set(key, group)
    }

    const result = new Map<K, AggregationStats>()
    for (const [key, metrics] of groups) {
      result.set(key, this.getStats(metrics))
    }

    return result
  }

  /**
   * 滑动窗口聚合
   * @param data 指标数据数组
   * @param windowSize 窗口大小（数据点数量）
   * @returns 滑动窗口统计数组
   */
  static slidingWindow(data: PerformanceMetric[], windowSize: number): AggregationStats[] {
    if (!data || data.length === 0 || windowSize <= 0) {
      return []
    }

    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp)
    const results: AggregationStats[] = []

    for (let i = 0; i <= sorted.length - windowSize; i++) {
      const window = sorted.slice(i, i + windowSize)
      results.push(this.getStats(window))
    }

    return results
  }

  /**
   * 异常值检测（使用 IQR 方法）
   * @param data 指标数据数组
   * @param k IQR 倍数，默认 1.5
   * @returns 异常值指标数组
   */
  static detectOutliers(data: PerformanceMetric[], k: number = 1.5): PerformanceMetric[] {
    if (!data || data.length < 4) {
      return []
    }

    const values = data.map(m => m.value).sort((a, b) => a - b)
    const n = values.length

    // 计算 Q1 和 Q3
    const q1Index = Math.floor(n * 0.25)
    const q3Index = Math.floor(n * 0.75)
    const q1 = values[q1Index]
    const q3 = values[q3Index]
    const iqr = q3 - q1

    const lowerBound = q1 - k * iqr
    const upperBound = q3 + k * iqr

    return data.filter(m => m.value < lowerBound || m.value > upperBound)
  }
}

// 导出便捷函数
export const aggregateByTimeWindow = MetricsAggregator.aggregateByTimeWindow
export const aggregatePercentiles = MetricsAggregator.aggregatePercentiles
export const aggregateTrend = MetricsAggregator.aggregateTrend
