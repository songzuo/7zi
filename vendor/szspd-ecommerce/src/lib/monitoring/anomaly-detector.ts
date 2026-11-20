// @ts-nocheck
/**
 * Anomaly Detector
 * Simple statistical anomaly detection based on standard deviation (Z-Score)
 */

import {
  average,
  percentile,
  standardDeviation,
  zScore as calcZScore,
  isAnomalyZScore as checkAnomalyZScore,
} from '@/lib/utils/metrics'

// Re-export for backward compatibility
export { checkAnomalyZScore as detectAnomalyZScore }

// ========================================
// Types
// ========================================

export interface Baseline {
  metric: string
  mean: number
  stdDev: number
  min: number
  max: number
  p50: number
  p95: number
  p99: number
  sampleSize: number
  lastUpdated: number
}

export interface AnomalyResult {
  isAnomaly: boolean
  value: number
  zScore: number
  severity: 'normal' | 'warning' | 'critical'
  algorithm: 'zscore' | 'threshold'
  timestamp: number
}

export interface AnomalyDetectorConfig {
  enabled: boolean
  zScoreThreshold: number // Default: 3
  minSampleSize: number // Default: 10
  windowSize: number // Max samples to keep
}

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  enabled: true,
  zScoreThreshold: 3,
  minSampleSize: 10,
  windowSize: 100,
}

// ========================================
// Anomaly Detector Class
// ========================================

export class AnomalyDetector {
  private config: AnomalyDetectorConfig
  private dataHistory: Map<string, number[]> = new Map()
  private baselines: Map<string, Baseline> = new Map()

  constructor(config: Partial<AnomalyDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Add a data point for a metric
   */
  addDataPoint(metric: string, value: number): void {
    if (!this.config.enabled) return

    const history = this.dataHistory.get(metric) || []
    history.push(value)

    // Keep only the last windowSize samples
    if (history.length > this.config.windowSize) {
      history.shift()
    }

    this.dataHistory.set(metric, history)
  }

  /**
   * Calculate baseline statistics for a metric
   */
  calculateBaseline(metric: string): Baseline | undefined {
    const history = this.dataHistory.get(metric)
    if (!history || history.length < this.config.minSampleSize) {
      return undefined
    }

    const sorted = [...history].sort((a, b) => a - b)
    const n = sorted.length

    // Calculate mean using shared utility
    const mean = average(sorted)

    // Calculate standard deviation using shared utility
    const { population: stdDev } = standardDeviation(sorted, mean)

    // Calculate percentiles using shared utility
    const p50 = percentile(sorted, 50)
    const p95 = percentile(sorted, 95)
    const p99 = percentile(sorted, 99)

    const baseline: Baseline = {
      metric,
      mean,
      stdDev: stdDev || 1, // Prevent division by zero
      min: sorted[0],
      max: sorted[n - 1],
      p50,
      p95,
      p99,
      sampleSize: n,
      lastUpdated: Date.now(),
    }

    this.baselines.set(metric, baseline)
    return baseline
  }

  /**
   * Get baseline for a metric
   */
  getBaseline(metric: string): Baseline | null {
    return this.baselines.get(metric) || null
  }

  /**
   * Calculate Z-Score for a value
   */
  calculateZScore(value: number, baseline: Baseline): number {
    return calcZScore(value, baseline.mean, baseline.stdDev)
  }

  /**
   * Detect anomaly using Z-Score
   */
  detectAnomaly(metric: string, value: number): AnomalyResult | null {
    if (!this.config.enabled) {
      return null
    }

    // First check if we have enough data
    const history = this.dataHistory.get(metric)
    if (!history || history.length < this.config.minSampleSize) {
      // Not enough data, just track it
      this.addDataPoint(metric, value)
      return null
    }

    // Get or calculate baseline
    let baseline = this.baselines.get(metric)
    if (!baseline) {
      baseline = this.calculateBaseline(metric)
      if (!baseline) return null
    }

    // Use shared utility for anomaly detection
    const anomalyResult = checkAnomalyZScore(
      value,
      baseline.mean,
      baseline.stdDev,
      this.config.zScoreThreshold
    )

    // Add the value to history for future analysis
    this.addDataPoint(metric, value)

    return {
      isAnomaly: anomalyResult.isAnomaly,
      value,
      zScore: anomalyResult.zScore,
      severity: anomalyResult.severity,
      algorithm: 'zscore',
      timestamp: Date.now(),
    }
  }

  /**
   * Check if a value exceeds a simple threshold
   */
  detectThresholdAnomaly(metric: string, value: number, threshold: number): AnomalyResult {
    const isAnomaly = value > threshold
    let severity: 'normal' | 'warning' | 'critical' = 'normal'

    if (isAnomaly) {
      if (value >= threshold * 1.5) {
        severity = 'critical'
      } else {
        severity = 'warning'
      }
    }

    return {
      isAnomaly,
      value,
      zScore: 0,
      severity,
      algorithm: 'threshold',
      timestamp: Date.now(),
    }
  }

  /**
   * Clear all data for a specific metric
   */
  clearMetric(metric: string): void {
    this.dataHistory.delete(metric)
    this.baselines.delete(metric)
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.dataHistory.clear()
    this.baselines.clear()
  }

  /**
   * Get statistics for all metrics
   */
  getStats(): { metric: string; sampleSize: number; mean: number; stdDev: number }[] {
    const stats: { metric: string; sampleSize: number; mean: number; stdDev: number }[] = []

    this.baselines.forEach((baseline, metric) => {
      stats.push({
        metric,
        sampleSize: baseline.sampleSize,
        mean: baseline.mean,
        stdDev: baseline.stdDev,
      })
    })

    return stats
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Calculate mean of an array
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values: number[], mean?: number): number {
  if (values.length === 0) return 0

  const m = mean ?? calculateMean(values)
  const squaredDiffs = values.map(v => Math.pow(v - m, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
}

/**
 * Calculate Z-Score
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0
  return (value - mean) / stdDev
}

// ========================================
// Export singleton instance
// ========================================

export const anomalyDetector = new AnomalyDetector()

export default AnomalyDetector
