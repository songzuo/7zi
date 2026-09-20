/**
 * Metric Aggregator - Unified Metrics Aggregation Utilities
 * 统一指标聚合工具
 *
 * This module provides standardized metric aggregation functions
 * used across monitoring, performance, and alerting systems.
 *
 * @module lib/utils/metrics/aggregator
 */

// ============================================
// Types
// ============================================

export interface NumericArray {
  length: number
  [index: number]: number
}

export interface PercentileOptions {
  /** Whether to interpolate between values (default: false) */
  interpolate?: boolean
}

export interface StandardDeviationResult {
  /** Population standard deviation */
  population: number
  /** Sample standard deviation */
  sample: number
  /** Variance */
  variance: number
  /** Mean value */
  mean: number
}

export interface AggregationResult {
  count: number
  sum: number
  min: number
  max: number
  avg: number
  range: number
}

// ============================================
// Core Aggregation Functions
// ============================================

/**
 * Calculate the sum of an array of numbers
 * 计算数组的总和
 *
 * @param values - Array of numbers
 * @returns Sum of all values
 *
 * @example
 * ```ts
 * sum([1, 2, 3, 4, 5]) // => 15
 * sum([]) // => 0
 * ```
 */
export function sum(values: number[] | NumericArray): number {
  if (!values || values.length === 0) return 0

  let total = 0
  for (let i = 0; i < values.length; i++) {
    total += values[i]
  }
  return total
}

/**
 * Calculate the average (mean) of an array of numbers
 * 计算数组的平均值
 *
 * @param values - Array of numbers
 * @returns Average value, or 0 if empty
 *
 * @example
 * ```ts
 * average([1, 2, 3, 4, 5]) // => 3
 * average([]) // => 0
 * ```
 */
export function average(values: number[] | NumericArray): number {
  if (!values || values.length === 0) return 0
  return sum(values) / values.length
}

/**
 * Calculate the median of an array of numbers
 * 计算数组的中位数
 *
 * @param values - Array of numbers (will not be mutated)
 * @returns Median value, or 0 if empty
 *
 * @example
 * ```ts
 * median([1, 2, 3, 4, 5]) // => 3
 * median([1, 2, 3, 4]) // => 2.5
 * ```
 */
export function median(values: number[] | NumericArray): number {
  if (!values || values.length === 0) return 0

  const arr = Array.from(values)
  const sorted = arr.sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Calculate a specific percentile of an array of numbers
 * 计算数组的百分位数
 *
 * @param values - Array of numbers (will not be mutated)
 * @param p - Percentile to calculate (0-100)
 * @param options - Calculation options
 * @returns Percentile value, or 0 if empty
 *
 * @example
 * ```ts
 * percentile([1, 2, 3, 4, 5], 50) // => 3 (median)
 * percentile([1, 2, 3, 4, 5], 95) // => 5
 * percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90) // => 9
 * ```
 */
export function percentile(
  values: number[] | NumericArray,
  p: number,
  options: PercentileOptions = {}
): number {
  if (!values || values.length === 0) return 0

  // Clamp percentile to valid range
  const clampedP = Math.max(0, Math.min(100, p))

  const arr = Array.from(values)
  const sorted = arr.sort((a, b) => a - b)
  const n = sorted.length

  if (options.interpolate) {
    // Linear interpolation method
    const rank = (clampedP / 100) * (n - 1)
    const lower = Math.floor(rank)
    const upper = Math.ceil(rank)
    const fraction = rank - lower

    if (lower === upper) {
      return sorted[lower]
    }
    return sorted[lower] + fraction * (sorted[upper] - sorted[lower])
  }

  // Nearest rank method (commonly used in monitoring)
  const index = Math.ceil((clampedP / 100) * n) - 1
  return sorted[Math.max(0, Math.min(index, n - 1))]
}

/**
 * Calculate multiple percentiles at once
 * 一次性计算多个百分位数
 *
 * @param values - Array of numbers (will not be mutated)
 * @param percentiles - Array of percentiles to calculate (0-100)
 * @returns Map of percentile to value
 *
 * @example
 * ```ts
 * percentiles([1, 2, 3, 4, 5], [50, 90, 95, 99])
 * // => Map { 50 => 3, 90 => 5, 95 => 5, 99 => 5 }
 * ```
 */
export function percentiles(values: number[] | NumericArray, ps: number[]): Map<number, number> {
  const result = new Map<number, number>()

  if (!values || values.length === 0) {
    ps.forEach(p => result.set(p, 0))
    return result
  }

  // Sort once for all percentiles
  const arr = Array.from(values)
  const sorted = arr.sort((a, b) => a - b)
  const n = sorted.length

  for (const p of ps) {
    const clampedP = Math.max(0, Math.min(100, p))
    const index = Math.ceil((clampedP / 100) * n) - 1
    result.set(p, sorted[Math.max(0, Math.min(index, n - 1))])
  }

  return result
}

/**
 * Calculate standard deviation of an array of numbers
 * 计算数组的标准差
 *
 * Returns both population and sample standard deviation:
 * - Population: sqrt(sum((x - mean)^2) / n)
 * - Sample: sqrt(sum((x - mean)^2) / (n - 1))
 *
 * @param values - Array of numbers
 * @param meanValue - Optional pre-calculated mean (optimization)
 * @returns Standard deviation result with population, sample, variance, and mean
 *
 * @example
 * ```ts
 * standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])
 * // => { population: 2, sample: 2.138, variance: 4, mean: 5 }
 * ```
 */
export function standardDeviation(
  values: number[] | NumericArray,
  meanValue?: number
): StandardDeviationResult {
  if (!values || values.length === 0) {
    return { population: 0, sample: 0, variance: 0, mean: 0 }
  }

  const n = values.length
  const mean = meanValue !== undefined ? meanValue : average(values)

  // Calculate sum of squared differences
  let sumSquaredDiff = 0
  for (let i = 0; i < n; i++) {
    const diff = values[i] - mean
    sumSquaredDiff += diff * diff
  }

  const variance = sumSquaredDiff / n
  const population = Math.sqrt(variance)
  const sample = n > 1 ? Math.sqrt(sumSquaredDiff / (n - 1)) : 0

  return { population, sample, variance, mean }
}

/**
 * Calculate variance of an array of numbers
 * 计算数组的方差
 *
 * @param values - Array of numbers
 * @param meanValue - Optional pre-calculated mean (optimization)
 * @returns Variance value
 *
 * @example
 * ```ts
 * variance([2, 4, 4, 4, 5, 5, 7, 9]) // => 4
 * ```
 */
export function variance(values: number[] | NumericArray, meanValue?: number): number {
  return standardDeviation(values, meanValue).variance
}

/**
 * Calculate min, max, and range of an array of numbers
 * 计算数组的最小值、最大值和范围
 *
 * @param values - Array of numbers
 * @returns Object with min, max, and range
 *
 * @example
 * ```ts
 * minMaxRange([1, 5, 3, 9, 2])
 * // => { min: 1, max: 9, range: 8 }
 * ```
 */
export function minMaxRange(values: number[] | NumericArray): {
  min: number
  max: number
  range: number
} {
  if (!values || values.length === 0) {
    return { min: 0, max: 0, range: 0 }
  }

  let min = values[0]
  let max = values[0]

  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i]
    if (values[i] > max) max = values[i]
  }

  return { min, max, range: max - min }
}

/**
 * Perform complete aggregation on an array of numbers
 * 对数组执行完整的聚合计算
 *
 * Single-pass O(n) algorithm for computing all basic statistics.
 *
 * @param values - Array of numbers
 * @returns Complete aggregation result
 *
 * @example
 * ```ts
 * aggregate([1, 2, 3, 4, 5])
 * // => { count: 5, sum: 15, min: 1, max: 5, avg: 3, range: 4 }
 * ```
 */
export function aggregate(values: number[] | NumericArray): AggregationResult {
  if (!values || values.length === 0) {
    return { count: 0, sum: 0, min: 0, max: 0, avg: 0, range: 0 }
  }

  let total = 0
  let min = values[0]
  let max = values[0]

  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    total += v
    if (v < min) min = v
    if (v > max) max = v
  }

  const count = values.length
  return {
    count,
    sum: total,
    min,
    max,
    avg: total / count,
    range: max - min,
  }
}

// ============================================
// Z-Score and Anomaly Detection Helpers
// ============================================

/**
 * Calculate Z-Score (standard score)
 * 计算 Z-Score (标准分数)
 *
 * Z-Score indicates how many standard deviations a value is from the mean.
 *
 * @param value - The value to calculate z-score for
 * @param mean - The mean of the distribution
 * @param stdDev - The standard deviation of the distribution
 * @returns Z-Score value
 *
 * @example
 * ```ts
 * zScore(75, 70, 5) // => 1 (value is 1 std dev above mean)
 * zScore(65, 70, 5) // => -1 (value is 1 std dev below mean)
 * ```
 */
export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0
  return (value - mean) / stdDev
}

/**
 * Detect if a value is an anomaly based on Z-Score threshold
 * 基于 Z-Score 阈值检测异常值
 *
 * @param value - The value to check
 * @param mean - The mean of the distribution
 * @param stdDev - The standard deviation of the distribution
 * @param threshold - Z-Score threshold (default: 3)
 * @returns Whether the value is an anomaly and its z-score
 *
 * @example
 * ```ts
 * isAnomalyZScore(100, 50, 10, 3) // => { isAnomaly: true, zScore: 5 }
 * ```
 */
export function isAnomalyZScore(
  value: number,
  mean: number,
  stdDev: number,
  threshold: number = 3
): { isAnomaly: boolean; zScore: number; severity: 'normal' | 'warning' | 'critical' } {
  const score = zScore(value, mean, stdDev)
  const absZScore = Math.abs(score)

  let severity: 'normal' | 'warning' | 'critical' = 'normal'
  if (absZScore >= threshold * 2) {
    severity = 'critical'
  } else if (absZScore >= threshold) {
    severity = 'warning'
  }

  return {
    isAnomaly: absZScore >= threshold,
    zScore: score,
    severity,
  }
}

// ============================================
// Exports
// ============================================

export default {
  sum,
  average,
  median,
  percentile,
  percentiles,
  standardDeviation,
  variance,
  minMaxRange,
  aggregate,
  zScore,
  isAnomalyZScore,
}
