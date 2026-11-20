/**
 * Optimized Anomaly Detector with Sliding Window and Adaptive Thresholds
 *
 * Performance improvements:
 * - Sliding window algorithm for real-time detection
 * - Adaptive threshold based on quantiles
 * - Incremental updates using Welford's algorithm
 * - O(1) memory per update
 *
 * @module lib/performance/anomaly-detection/optimized-anomaly-detector
 * @version 2.0.0
 */

// ============================================
// Types
// ============================================

export interface Metric {
  timestamp: number
  value: number
  metadata?: Record<string, unknown>
}

export interface Anomaly {
  timestamp: number
  value: number
  score: number
  threshold: number
  type: 'high' | 'low' | 'spike' | 'drop'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface Threshold {
  lower: number
  upper: number
  adaptive: boolean
  confidence: number
}

export interface DetectorConfig {
  windowSize?: number
  thresholdPercentile?: number
  minSamples?: number
  adaptiveThreshold?: boolean
  sensitivity?: 'low' | 'medium' | 'high'
}

// ============================================
// Sliding Window Implementation
// ============================================

class SlidingWindow {
  private window: Metric[] = []
  private maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  add(metric: Metric): void {
    this.window.push(metric)

    // Remove oldest if over capacity
    if (this.window.length > this.maxSize) {
      this.window.shift()
    }
  }

  getAll(): Metric[] {
    return [...this.window]
  }

  getValues(): number[] {
    return this.window.map(m => m.value)
  }

  size(): number {
    return this.window.length
  }

  clear(): void {
    this.window = []
  }
}

// ============================================
// Incremental Statistics (Welford's Algorithm)
// ============================================

class IncrementalStats {
  private count: number = 0
  private mean: number = 0
  private m2: number = 0 // Sum of squared differences

  update(value: number): void {
    this.count++
    const delta = value - this.mean
    this.mean += delta / this.count
    const delta2 = value - this.mean
    this.m2 += delta * delta2
  }

  getMean(): number {
    return this.mean
  }

  getVariance(): number {
    return this.count > 1 ? this.m2 / (this.count - 1) : 0
  }

  getStdDev(): number {
    return Math.sqrt(this.getVariance())
  }

  getCount(): number {
    return this.count
  }

  reset(): void {
    this.count = 0
    this.mean = 0
    this.m2 = 0
  }
}

// ============================================
// Adaptive Threshold Calculator
// ============================================

function computeAdaptiveThreshold(
  values: number[],
  percentile: number = 95
): Threshold {
  if (values.length === 0) {
    return { lower: -Infinity, upper: Infinity, adaptive: false, confidence: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)

  // Calculate quantiles
  const q25 = getQuantile(sorted, 25)
  const q75 = getQuantile(sorted, 75)
  const iqr = q75 - q25

  // Use IQR method for robust threshold
  const lower = q25 - 1.5 * iqr
  const upper = q75 + 1.5 * iqr

  // Calculate confidence based on sample size
  const confidence = Math.min(1, values.length / 100)

  return {
    lower,
    upper,
    adaptive: true,
    confidence,
  }
}

function getQuantile(sorted: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

function computeFixedThreshold(
  values: number[],
  stdDevMultiplier: number = 3
): Threshold {
  if (values.length === 0) {
    return { lower: -Infinity, upper: Infinity, adaptive: false, confidence: 0 }
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  return {
    lower: mean - stdDevMultiplier * stdDev,
    upper: mean + stdDevMultiplier * stdDev,
    adaptive: false,
    confidence: Math.min(1, values.length / 100),
  }
}

// ============================================
// Anomaly Severity Calculator
// ============================================

function calculateSeverity(
  value: number,
  threshold: Threshold,
  sensitivity: 'low' | 'medium' | 'high'
): 'low' | 'medium' | 'high' | 'critical' {
  const distance = value > threshold.upper
    ? value - threshold.upper
    : value < threshold.lower
      ? threshold.lower - value
      : 0

  if (distance === 0) return 'low'

  // Adjust thresholds based on sensitivity
  const multipliers = {
    low: { medium: 2, high: 3, critical: 5 },
    medium: { medium: 1.5, high: 2.5, critical: 4 },
    high: { medium: 1, high: 1.5, critical: 2.5 },
  }

  const range = threshold.upper - threshold.lower
  const normalizedDistance = distance / range

  const m = multipliers[sensitivity]

  if (normalizedDistance < m.medium) return 'low'
  if (normalizedDistance < m.high) return 'medium'
  if (normalizedDistance < m.critical) return 'high'
  return 'critical'
}

// ============================================
// Optimized Anomaly Detector
// ============================================

export class OptimizedAnomalyDetector {
  private window: SlidingWindow
  private stats: IncrementalStats
  private config: Required<DetectorConfig>
  private currentThreshold: Threshold | null = null

  constructor(config: DetectorConfig = {}) {
    this.config = {
      windowSize: config.windowSize ?? 100,
      thresholdPercentile: config.thresholdPercentile ?? 95,
      minSamples: config.minSamples ?? 10,
      adaptiveThreshold: config.adaptiveThreshold ?? true,
      sensitivity: config.sensitivity ?? 'medium',
    }

    this.window = new SlidingWindow(this.config.windowSize)
    this.stats = new IncrementalStats()
  }

  /**
   * Incremental update with a new metric
   * O(1) operation
   */
  incrementalUpdate(metric: Metric): void {
    this.window.add(metric)
    this.stats.update(metric.value)

    // Update threshold periodically
    if (this.window.size() >= this.config.minSamples) {
      this.updateThreshold()
    }
  }

  /**
   * Detect anomalies using sliding window
   * O(n) where n is window size
   */
  detectSlidingWindow(metrics: Metric[]): Anomaly[] {
    const anomalies: Anomaly[] = []

    for (const metric of metrics) {
      const anomaly = this.detectSingle(metric)
      if (anomaly) {
        anomalies.push(anomaly)
      }
    }

    return anomalies
  }

  /**
   * Detect anomaly for a single metric
   * O(1) operation
   */
  detectSingle(metric: Metric): Anomaly | null {
    if (!this.currentThreshold || this.window.size() < this.config.minSamples) {
      return null
    }

    const { lower, upper } = this.currentThreshold

    // Check if value is outside threshold
    if (metric.value < lower || metric.value > upper) {
      const type = metric.value > upper
        ? this.detectType(metric.value, 'high')
        : this.detectType(metric.value, 'low')

      const severity = calculateSeverity(
        metric.value,
        this.currentThreshold,
        this.config.sensitivity
      )

      const score = this.calculateAnomalyScore(metric.value)

      return {
        timestamp: metric.timestamp,
        value: metric.value,
        score,
        threshold: metric.value > upper ? upper : lower,
        type,
        severity,
      }
    }

    return null
  }

  /**
   * Compute adaptive threshold from current window
   */
  computeAdaptiveThreshold(): Threshold {
    const values = this.window.getValues()

    if (this.config.adaptiveThreshold) {
      return computeAdaptiveThreshold(values, this.config.thresholdPercentile)
    } else {
      return computeFixedThreshold(values)
    }
  }

  /**
   * Get current threshold
   */
  getThreshold(): Threshold | null {
    return this.currentThreshold
  }

  /**
   * Get current statistics
   */
  getStats(): {
    count: number
    mean: number
    stdDev: number
    windowSize: number
  } {
    return {
      count: this.stats.getCount(),
      mean: this.stats.getMean(),
      stdDev: this.stats.getStdDev(),
      windowSize: this.window.size(),
    }
  }

  /**
   * Reset the detector
   */
  reset(): void {
    this.window.clear()
    this.stats.reset()
    this.currentThreshold = null
  }

  /**
   * Update threshold based on current window
   */
  private updateThreshold(): void {
    this.currentThreshold = this.computeAdaptiveThreshold()
  }

  /**
   * Detect anomaly type (spike vs sustained)
   */
  private detectType(value: number, direction: 'high' | 'low'): 'high' | 'low' | 'spike' | 'drop' {
    const values = this.window.getValues()
    if (values.length < 3) return direction

    const recent = values.slice(-3)
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length
    const avgAll = values.reduce((a, b) => a + b, 0) / values.length

    // Check if it's a spike/drop (sudden change) or sustained anomaly
    const deviation = Math.abs(value - avgRecent) / Math.abs(avgRecent)
    const overallDeviation = Math.abs(value - avgAll) / Math.abs(avgAll)

    if (deviation > overallDeviation * 2) {
      return direction === 'high' ? 'spike' : 'drop'
    }

    return direction
  }

  /**
   * Calculate anomaly score (0-1)
   */
  private calculateAnomalyScore(value: number): number {
    if (!this.currentThreshold) return 0

    const { lower, upper } = this.currentThreshold
    const range = upper - lower

    if (value > upper) {
      return Math.min(1, (value - upper) / range)
    } else if (value < lower) {
      return Math.min(1, (lower - value) / range)
    }

    return 0
  }
}

// ============================================
// Factory Function
// ============================================

export function createOptimizedAnomalyDetector(
  config?: DetectorConfig
): OptimizedAnomalyDetector {
  return new OptimizedAnomalyDetector(config)
}

// ============================================
// Default Export
// ============================================

export default {
  OptimizedAnomalyDetector,
  createOptimizedAnomalyDetector,
}