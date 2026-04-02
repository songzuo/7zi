/**
 * Optimized Metrics Aggregator with Web Worker Support
 *
 * Performance improvements:
 * - Web Worker for background computation
 * - Incremental update algorithm
 * - Data sampling strategy
 * - LRU cache for aggregated results
 *
 * @module lib/monitoring/optimized-metrics-aggregator
 * @version 2.0.0
 */

import { LRUCache } from '@/lib/cache/lru-cache'

// ============================================
// Types
// ============================================

export interface AggregatorMetric {
  timestamp: number
  value: number
  metadata?: Record<string, unknown>
}

export interface TimeWindow {
  startTime: number
  endTime: number
}

export interface AggregatedMetrics {
  count: number
  sum: number
  min: number
  max: number
  avg: number
  first: number
  last: number
  firstTimestamp: number
  lastTimestamp: number
  change: number
  changePercent: number
  p50?: number
  p90?: number
  p95?: number
  p99?: number
}

export interface WorkerResult {
  metrics: AggregatedMetrics
  processingTime: number
}

export interface SamplingConfig {
  enabled: boolean
  maxSamples: number
  strategy: 'random' | 'time-based' | 'adaptive'
}

export interface AggregatorConfig {
  enableWorker?: boolean
  enableSampling?: boolean
  samplingConfig?: SamplingConfig
  cacheSize?: number
  cacheTTL?: number
}

// ============================================
// Incremental Accumulator
// ============================================

interface IncrementalAccumulator {
  count: number
  sum: number
  min: number
  max: number
  first: number | null
  last: number
  firstTimestamp: number | null
  lastTimestamp: number
  values: number[] // For percentile calculation
}

function createAccumulator(): IncrementalAccumulator {
  return {
    count: 0,
    sum: 0,
    min: Infinity,
    max: -Infinity,
    first: null,
    last: 0,
    firstTimestamp: null,
    lastTimestamp: 0,
    values: [],
  }
}

function updateAccumulator(acc: IncrementalAccumulator, metric: AggregatorMetric): void {
  acc.count++
  acc.sum += metric.value

  if (metric.value < acc.min) acc.min = metric.value
  if (metric.value > acc.max) acc.max = metric.value

  if (acc.firstTimestamp === null || metric.timestamp < acc.firstTimestamp) {
    acc.firstTimestamp = metric.timestamp
    acc.first = metric.value
  }

  if (metric.timestamp > acc.lastTimestamp) {
    acc.lastTimestamp = metric.timestamp
    acc.last = metric.value
  }

  // Store values for percentile calculation (with sampling)
  if (acc.values.length < 10000) {
    acc.values.push(metric.value)
  } else {
    // Adaptive sampling: keep every 10th value
    if (acc.count % 10 === 0) {
      acc.values.push(metric.value)
    }
  }
}

function accumulatorToMetrics(acc: IncrementalAccumulator): AggregatedMetrics {
  const first = acc.first ?? 0
  const avg = acc.count > 0 ? acc.sum / acc.count : 0
  const change = acc.last - first
  const changePercent = first !== 0 ? (change / first) * 100 : acc.last !== 0 ? 100 : 0

  // Calculate percentiles
  const percentiles = calculatePercentiles(acc.values)

  return {
    count: acc.count,
    sum: acc.sum,
    min: acc.min === Infinity ? 0 : acc.min,
    max: acc.max === -Infinity ? 0 : acc.max,
    avg,
    first,
    last: acc.last,
    firstTimestamp: acc.firstTimestamp ?? 0,
    lastTimestamp: acc.lastTimestamp,
    change,
    changePercent,
    ...percentiles,
  }
}

function calculatePercentiles(values: number[]): { p50?: number; p90?: number; p95?: number; p99?: number } {
  if (values.length === 0) {
    return {}
  }

  const sorted = [...values].sort((a, b) => a - b)

  const getPercentile = (p: number): number => {
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  return {
    p50: getPercentile(50),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99),
  }
}

// ============================================
// Sampling Strategies
// ============================================

function applySampling(
  metrics: AggregatorMetric[],
  config: SamplingConfig
): AggregatorMetric[] {
  if (!config.enabled || metrics.length <= config.maxSamples) {
    return metrics
  }

  switch (config.strategy) {
    case 'random':
      return randomSample(metrics, config.maxSamples)
    case 'time-based':
      return timeBasedSample(metrics, config.maxSamples)
    case 'adaptive':
      return adaptiveSample(metrics, config.maxSamples)
    default:
      return metrics
  }
}

function randomSample(metrics: AggregatorMetric[], maxSamples: number): AggregatorMetric[] {
  const shuffled = [...metrics].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, maxSamples)
}

function timeBasedSample(metrics: AggregatorMetric[], maxSamples: number): AggregatorMetric[] {
  const sorted = [...metrics].sort((a, b) => a.timestamp - b.timestamp)
  const step = Math.floor(sorted.length / maxSamples)
  const sampled: AggregatorMetric[] = []

  for (let i = 0; i < sorted.length; i += step) {
    sampled.push(sorted[i])
    if (sampled.length >= maxSamples) break
  }

  return sampled
}

function adaptiveSample(metrics: AggregatorMetric[], maxSamples: number): AggregatorMetric[] {
  // Sort by timestamp
  const sorted = [...metrics].sort((a, b) => a.timestamp - b.timestamp)

  // Calculate value variance to determine sampling density
  const values = sorted.map(m => m.value)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  // Higher variance = more samples from outliers
  const sampled: AggregatorMetric[] = []
  const outlierThreshold = mean + 2 * stdDev
  const outlierCount = values.filter(v => v > outlierThreshold).length

  // Reserve slots for outliers
  const outlierSlots = Math.min(outlierCount, Math.floor(maxSamples * 0.3))
  const regularSlots = maxSamples - outlierSlots

  // Sample outliers
  const outliers = sorted.filter(m => m.value > outlierThreshold)
  for (let i = 0; i < outlierSlots && i < outliers.length; i++) {
    sampled.push(outliers[i])
  }

  // Sample regular data
  const regular = sorted.filter(m => m.value <= outlierThreshold)
  const step = Math.floor(regular.length / regularSlots)
  for (let i = 0; i < regular.length; i += step) {
    sampled.push(regular[i])
    if (sampled.length >= maxSamples) break
  }

  return sampled
}

// ============================================
// Web Worker Code
// ============================================

const workerCode = `
self.onmessage = function(e) {
  const { metrics, timeWindow } = e.data
  const startTime = performance.now()

  let count = 0
  let sum = 0
  let min = Infinity
  let max = -Infinity
  let first = null
  let firstTimestamp = null
  let last = 0
  let lastTimestamp = 0
  const values = []

  for (const metric of metrics) {
    if (metric.timestamp < timeWindow.startTime) continue
    if (metric.timestamp > timeWindow.endTime) continue

    count++
    sum += metric.value

    if (metric.value < min) min = metric.value
    if (metric.value > max) max = metric.value

    if (firstTimestamp === null || metric.timestamp < firstTimestamp) {
      firstTimestamp = metric.timestamp
      first = metric.value
    }

    if (metric.timestamp > lastTimestamp) {
      lastTimestamp = metric.timestamp
      last = metric.value
    }

    if (values.length < 10000) {
      values.push(metric.value)
    } else if (count % 10 === 0) {
      values.push(metric.value)
    }
  }

  const avg = count > 0 ? sum / count : 0
  const safeFirst = first ?? 0
  const change = last - safeFirst
  const changePercent = safeFirst !== 0 ? (change / safeFirst) * 100 : last !== 0 ? 100 : 0

  // Calculate percentiles
  const sorted = values.sort((a, b) => a - b)
  const getPercentile = (p) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  const result = {
    count,
    sum,
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
    avg,
    first: safeFirst,
    last,
    firstTimestamp: firstTimestamp ?? 0,
    lastTimestamp,
    change,
    changePercent,
    p50: sorted.length > 0 ? getPercentile(50) : undefined,
    p90: sorted.length > 0 ? getPercentile(90) : undefined,
    p95: sorted.length > 0 ? getPercentile(95) : undefined,
    p99: sorted.length > 0 ? getPercentile(99) : undefined,
  }

  const processingTime = performance.now() - startTime

  self.postMessage({ metrics: result, processingTime })
}
`

// ============================================
// Optimized Metrics Aggregator
// ============================================

export class OptimizedMetricsAggregator {
  private accumulator: IncrementalAccumulator
  private cache: LRUCache<AggregatedMetrics>
  private worker: Worker | null = null
  private config: Required<AggregatorConfig>
  private pendingMetrics: AggregatorMetric[] = []

  constructor(config: AggregatorConfig = {}) {
    this.config = {
      enableWorker: config.enableWorker ?? true,
      enableSampling: config.enableSampling ?? true,
      samplingConfig: config.samplingConfig ?? {
        enabled: true,
        maxSamples: 10000,
        strategy: 'adaptive',
      },
      cacheSize: config.cacheSize ?? 100,
      cacheTTL: config.cacheTTL ?? 60000,
    }

    this.accumulator = createAccumulator()
    this.cache = new LRUCache<AggregatedMetrics>(this.config.cacheSize)

    // Initialize worker if enabled and available
    if (this.config.enableWorker && typeof Worker !== 'undefined') {
      try {
        const blob = new Blob([workerCode], { type: 'application/javascript' })
        const url = URL.createObjectURL(blob)
        this.worker = new Worker(url)
      } catch (error) {
        console.warn('Failed to initialize Web Worker:', error)
        this.worker = null
      }
    }
  }

  /**
   * Add a metric incrementally
   * O(1) operation
   */
  addMetric(metric: AggregatorMetric): void {
    updateAccumulator(this.accumulator, metric)
    this.pendingMetrics.push(metric)

    // Invalidate cache when new data arrives
    this.cache.clear()
  }

  /**
   * Get aggregated metrics for a time window
   * Uses cache if available
   */
  getAggregated(window: TimeWindow): AggregatedMetrics | null {
    const cacheKey = `${window.startTime}-${window.endTime}`

    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return cached
    }

    // Filter metrics by time window
    const filtered = this.pendingMetrics.filter(
      m => m.timestamp >= window.startTime && m.timestamp <= window.endTime
    )

    if (filtered.length === 0) {
      return null
    }

    // Apply sampling if enabled
    const sampled = this.config.enableSampling
      ? applySampling(filtered, this.config.samplingConfig)
      : filtered

    // Calculate metrics
    const acc = createAccumulator()
    for (const metric of sampled) {
      updateAccumulator(acc, metric)
    }

    const result = accumulatorToMetrics(acc)

    // Cache the result
    this.cache.set(cacheKey, result, this.config.cacheTTL)

    return result
  }

  /**
   * Compute metrics in Web Worker
   * Returns a promise that resolves with the result
   */
  async computeInWorker(window: TimeWindow): Promise<WorkerResult> {
    if (!this.worker) {
      throw new Error('Web Worker not available')
    }

    const filtered = this.pendingMetrics.filter(
      m => m.timestamp >= window.startTime && m.timestamp <= window.endTime
    )

    // Apply sampling if enabled
    const sampled = this.config.enableSampling
      ? applySampling(filtered, this.config.samplingConfig)
      : filtered

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker computation timeout'))
      }, 5000)

      this.worker!.onmessage = (e) => {
        clearTimeout(timeout)
        resolve(e.data)
      }

      this.worker!.onerror = (error) => {
        clearTimeout(timeout)
        reject(error)
      }

      this.worker!.postMessage({
        metrics: sampled,
        timeWindow: window,
      })
    })
  }

  /**
   * Get current statistics from the accumulator
   */
  getCurrentStats(): AggregatedMetrics | null {
    if (this.accumulator.count === 0) {
      return null
    }
    return accumulatorToMetrics(this.accumulator)
  }

  /**
   * Reset the aggregator
   */
  reset(): void {
    this.accumulator = createAccumulator()
    this.pendingMetrics = []
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.cacheSize,
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.cache.clear()
  }
}

// ============================================
// Factory Function
// ============================================

export function createOptimizedAggregator(
  config?: AggregatorConfig
): OptimizedMetricsAggregator {
  return new OptimizedMetricsAggregator(config)
}

// ============================================
// Default Export
// ============================================

export default {
  OptimizedMetricsAggregator,
  createOptimizedAggregator,
}