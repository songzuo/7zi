/**
 * Optimized Anomaly Detection System
 * 优化版异常检测系统
 *
 * 性能优化：
 * - 使用环形缓冲区存储历史数据
 * - 增量计算统计量（避免重复遍历）
 * - 相关性分析使用采样和缓存
 * - 减少不必要的数组拷贝
 * - 批量处理优化
 */

import { EventEmitter } from 'events'
import { LRUCache } from '@/lib/cache/lru-cache'

// ========================================
// Types
// ========================================

export interface MetricBaseline {
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
  trend?: 'increasing' | 'decreasing' | 'stable'
  growthRate?: number
  volatility?: number
}

export interface AnomalyDetection {
  id: string
  isAnomaly: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  metric: string
  value: number
  baseline: MetricBaseline
  zScore: number
  confidence: number
  reason: string
  detectedAt: number
  algorithm:
    | 'z-score'
    | 'threshold'
    | 'isolation-forest'
    | 'composite'
    | 'trend'
    | 'correlation'
    | 'sudden-change'
  acknowledged: boolean
  resolvedAt?: number
  correlationInfo?: CorrelationInfo
  trendInfo?: TrendAnomalyInfo
}

export interface TrendAnomalyInfo {
  type: 'growth-rate' | 'sudden-change' | 'sustained-increase' | 'sustained-decrease'
  growthRate: number
  previousValue: number
  currentValue: number
  changePercent: number
  windowSize: number
}

export interface CorrelationInfo {
  correlatedMetrics: string[]
  correlationCoefficient: number
  jointAnomaly: boolean
  description: string
}

export interface AnomalyEvent {
  id: string
  detection: AnomalyDetection
  acknowledged: boolean
  acknowledgedAt?: number
  acknowledgedBy?: string
  resolved: boolean
  resolvedAt?: number
  notes?: string
  falsePositive: boolean
}

export interface AnomalyDetectorConfig {
  enabled: boolean
  zScoreThreshold: number
  criticalZScoreThreshold: number
  minSampleSize: number
  windowSize: number
  maxHistorySize: number
  updateBaselineIntervalMs: number
  alertConfig: {
    enabled: boolean
    channels: ('console' | 'webhook' | 'sentry' | 'slack')[]
    webhookUrl?: string
    cooldownMs: number
    minSeverity: 'low' | 'medium' | 'high' | 'critical'
  }
  autoThreshold: {
    enabled: boolean
    adjustmentIntervalMs: number
    learningRate: number
    minSampleSize: number
    maxAdjustmentPercent: number
    sensitivityDecay: number
    historicalWeight: number
  }
  trendDetection: {
    enabled: boolean
    growthRateThreshold: number
    suddenChangeThreshold: number
    sustainedPeriodMs: number
    minTrendSamples: number
    volatilityThreshold: number
  }
  correlation: {
    enabled: boolean
    minCorrelation: number
    maxMetrics: number
    analysisWindowMs: number
    jointAnomalyThreshold: number
    sampleSize: number // 新增：相关性分析采样大小
  }
  metrics: {
    responseTime: { enabled: boolean; warningThreshold: number; criticalThreshold: number }
    memoryUsage: { enabled: boolean; warningThreshold: number; criticalThreshold: number }
    errorRate: { enabled: boolean; warningThreshold: number; criticalThreshold: number }
    cpuUsage: { enabled: boolean; warningThreshold: number; criticalThreshold: number }
  }
}

export interface MetricDataPoint {
  timestamp: number
  value: number
  metadata?: Record<string, unknown>
}

export interface ThresholdAdjustment {
  metric: string
  oldThreshold: number
  newThreshold: number
  adjustmentReason: string
  adjustedAt: number
  dataPoints: number
  confidence: number
}

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  enabled: true,
  zScoreThreshold: 2,
  criticalZScoreThreshold: 3,
  minSampleSize: 10,
  windowSize: 100,
  maxHistorySize: 1000,
  updateBaselineIntervalMs: 60000,
  alertConfig: {
    enabled: true,
    channels: ['console'],
    cooldownMs: 300000,
    minSeverity: 'medium',
  },
  autoThreshold: {
    enabled: true,
    adjustmentIntervalMs: 300000,
    learningRate: 0.1,
    minSampleSize: 50,
    maxAdjustmentPercent: 20,
    sensitivityDecay: 0.05,
    historicalWeight: 0.7,
  },
  trendDetection: {
    enabled: true,
    growthRateThreshold: 50,
    suddenChangeThreshold: 3,
    sustainedPeriodMs: 300000,
    minTrendSamples: 5,
    volatilityThreshold: 0.3,
  },
  correlation: {
    enabled: true,
    minCorrelation: 0.7,
    maxMetrics: 10,
    analysisWindowMs: 3600000,
    jointAnomalyThreshold: 0.8,
    sampleSize: 100, // 采样大小
  },
  metrics: {
    responseTime: { enabled: true, warningThreshold: 1000, criticalThreshold: 3000 },
    memoryUsage: { enabled: true, warningThreshold: 80, criticalThreshold: 95 },
    errorRate: { enabled: true, warningThreshold: 5, criticalThreshold: 15 },
    cpuUsage: { enabled: true, warningThreshold: 70, criticalThreshold: 90 },
  },
}

// ========================================
// Circular Buffer for Metric History
// ========================================

class MetricHistoryBuffer {
  private buffer: (MetricDataPoint | null)[]
  private capacity: number
  private head: number = 0
  private size: number = 0

  constructor(capacity: number) {
    this.capacity = capacity
    this.buffer = new Array(capacity).fill(null) as (MetricDataPoint | null)[]
  }

  push(point: MetricDataPoint): void {
    if (this.size === this.capacity) {
      // Overwrite oldest
      this.head = (this.head + 1) % this.capacity
    } else {
      this.size++
    }

    const tail = (this.head + this.size - 1) % this.capacity
    this.buffer[tail] = point
  }

  toArray(): MetricDataPoint[] {
    const result: MetricDataPoint[] = []
    for (let i = 0; i < this.size; i++) {
      const index = (this.head + i) % this.capacity
      const point = this.buffer[index]
      if (point) {
        result.push(point)
      }
    }
    return result
  }

  get length(): number {
    return this.size
  }

  clear(): void {
    this.head = 0
    this.size = 0
    this.buffer.fill(null)
  }
}

// ========================================
// Incremental Statistics Calculator
// ========================================

export class IncrementalStats {
  private count: number = 0
  private sum: number = 0
  private sumSquares: number = 0
  private min: number = Infinity
  private max: number = -Infinity
  private values: number[] = [] // For percentiles (with sampling)

  constructor(private maxValues: number = 1000) {}

  add(value: number): void {
    this.count++
    this.sum += value
    this.sumSquares += value * value

    if (value < this.min) this.min = value
    if (value > this.max) this.max = value

    // Adaptive sampling for percentiles
    if (this.values.length < this.maxValues) {
      this.values.push(value)
    } else if (this.count % 10 === 0) {
      // Keep every 10th value after reaching max
      this.values.push(value)
    }
  }

  getMean(): number {
    return this.count > 0 ? this.sum / this.count : 0
  }

  getStdDev(): number {
    if (this.count < 2) return 0
    const mean = this.getMean()
    const variance = (this.sumSquares / this.count) - (mean * mean)
    return Math.sqrt(Math.max(0, variance))
  }

  getMin(): number {
    return this.min === Infinity ? 0 : this.min
  }

  getMax(): number {
    return this.max === -Infinity ? 0 : this.max
  }

  getPercentile(p: number): number {
    if (this.values.length === 0) return 0

    // Sort only when needed
    this.values.sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * this.values.length) - 1
    return this.values[Math.max(0, Math.min(index, this.values.length - 1))]
  }

  getCount(): number {
    return this.count
  }

  reset(): void {
    this.count = 0
    this.sum = 0
    this.sumSquares = 0
    this.min = Infinity
    this.max = -Infinity
    this.values = []
  }
}

// ========================================
// Severity Level Helper
// ========================================

const SEVERITY_LEVELS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

function getSeverityLevel(severity: string): number {
  return SEVERITY_LEVELS[severity] || 0
}

// ========================================
// Statistical Helper Functions
// ========================================

function calculateCorrelationCoefficient(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0

  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    numerator += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }

  const denominator = Math.sqrt(denomX * denomY)
  return denominator === 0 ? 0 : numerator / denominator
}

function calculateGrowthRate(values: number[]): number {
  if (values.length < 2) return 0

  const recentCount = Math.max(1, Math.floor(values.length * 0.2))
  const recentValues = values.slice(-recentCount)
  const olderValues = values.slice(0, -recentCount)

  if (olderValues.length === 0) return 0

  const recentMean = recentValues.reduce((a, b) => a + b, 0) / recentCount
  const olderMean = olderValues.reduce((a, b) => a + b, 0) / olderValues.length

  if (olderMean === 0) return recentMean > 0 ? 100 : 0

  return ((recentMean - olderMean) / olderMean) * 100
}

function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  return mean === 0 ? 0 : stdDev / Math.abs(mean)
}

function detectSuddenChange(
  values: number[],
  threshold: number
): { isSuddenChange: boolean; changeMagnitude: number; index: number } {
  if (values.length < 3) return { isSuddenChange: false, changeMagnitude: 0, index: -1 }

  const mean = values.slice(0, -1).reduce((a, b) => a + b, 0) / (values.length - 1)
  const variance =
    values.slice(0, -1).reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1)
  const stdDev = Math.sqrt(variance) || 1

  const lastValue = values[values.length - 1]
  const changeMagnitude = Math.abs(lastValue - mean) / stdDev

  return {
    isSuddenChange: changeMagnitude > threshold,
    changeMagnitude,
    index: values.length - 1,
  }
}

// ========================================
// Optimized Anomaly Detector Class
// ========================================

export class OptimizedAnomalyDetector extends EventEmitter {
  private config: AnomalyDetectorConfig
  private dataHistory: Map<string, MetricHistoryBuffer> = new Map()
  private baselines: Map<string, MetricBaseline> = new Map()
  private anomalyEvents: AnomalyEvent[] = []
  private lastAlertTime: Map<string, number> = new Map()
  private lastBaselineUpdate: number = 0
  private lastThresholdAdjustment: Map<string, number> = new Map()
  private thresholdAdjustments: ThresholdAdjustment[] = []
  private dynamicThresholds: Map<string, { warning: number; critical: number }> = new Map()

  // LRU cache for correlation results
  private correlationCache: LRUCache<Array<{ metric: string; correlation: number }>>
  private correlationCacheTTL: number = 60000 // 1 minute

  constructor(config: Partial<AnomalyDetectorConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.correlationCache = new LRUCache(50)
  }

  /**
   * Track a metric value
   */
  trackMetric(metric: string, value: number, metadata?: Record<string, unknown>): void {
    if (!this.config.enabled) return

    const dataPoint: MetricDataPoint = {
      timestamp: Date.now(),
      value,
      metadata,
    }

    let history = this.dataHistory.get(metric)
    if (!history) {
      history = new MetricHistoryBuffer(this.config.maxHistorySize)
      this.dataHistory.set(metric, history)
    }

    history.push(dataPoint)

    const detection = this.performComprehensiveDetection(metric, value)
    if (detection && detection.isAnomaly) {
      this.handleAnomalyDetection(detection)
    }

    this.checkAndAdjustThresholds(metric)
  }

  /**
   * Perform comprehensive anomaly detection
   */
  private performComprehensiveDetection(metric: string, value: number): AnomalyDetection | null {
    const statisticalAnomaly = this.detectStatisticalAnomaly(metric, value)
    const trendAnomaly = this.detectTrendAnomaly(metric, value)
    const suddenChangeAnomaly = this.detectSuddenChangeAnomaly(metric, value)
    const correlationAnomaly = this.detectCorrelationAnomaly(metric, value)

    const anomalies = [
      statisticalAnomaly,
      trendAnomaly,
      suddenChangeAnomaly,
      correlationAnomaly,
    ].filter(Boolean) as AnomalyDetection[]

    if (anomalies.length === 0) return null

    anomalies.sort((a, b) => getSeverityLevel(b.severity) - getSeverityLevel(a.severity))

    if (correlationAnomaly) {
      anomalies[0].correlationInfo = correlationAnomaly.correlationInfo
    }

    if (trendAnomaly) {
      anomalies[0].trendInfo = trendAnomaly.trendInfo
    }

    return anomalies[0]
  }

  /**
   * Detect statistical anomaly using Z-Score
   */
  private detectStatisticalAnomaly(metric: string, value: number): AnomalyDetection | null {
    const history = this.dataHistory.get(metric)
    if (!history || history.length < this.config.minSampleSize) return null

    let baseline = this.baselines.get(metric)
    if (!baseline || Date.now() - baseline.lastUpdated > this.config.updateBaselineIntervalMs) {
      baseline = this.calculateBaseline(metric)
      if (!baseline) return null
    }

    const zScore = (value - baseline.mean) / baseline.stdDev
    const absZScore = Math.abs(zScore)

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let isAnomaly = false
    let reason = 'Value within normal range'

    if (absZScore >= this.config.criticalZScoreThreshold) {
      severity = 'critical'
      isAnomaly = true
      reason = `Critical: Z-score ${zScore.toFixed(2)} exceeds ${this.config.criticalZScoreThreshold} standard deviations`
    } else if (absZScore >= this.config.zScoreThreshold) {
      severity = 'high'
      isAnomaly = true
      reason = `Warning: Z-score ${zScore.toFixed(2)} exceeds ${this.config.zScoreThreshold} standard deviations`
    }

    const metricSpecificResult = this.detectMetricSpecificAnomaly(metric, value, baseline)
    if (metricSpecificResult) return metricSpecificResult

    return {
      id: `${metric}-${Date.now()}`,
      isAnomaly,
      severity,
      metric,
      value,
      baseline,
      zScore,
      confidence: Math.min(absZScore / this.config.criticalZScoreThreshold, 1),
      reason,
      detectedAt: Date.now(),
      algorithm: 'z-score',
      acknowledged: false,
    }
  }

  /**
   * Detect trend-based anomaly
   */
  private detectTrendAnomaly(metric: string, value: number): AnomalyDetection | null {
    if (!this.config.trendDetection.enabled) return null

    const history = this.dataHistory.get(metric)
    if (!history || history.length < this.config.trendDetection.minTrendSamples) return null

    const values = history.toArray().map(d => d.value)
    const growthRate = calculateGrowthRate(values)
    const volatility = calculateVolatility(values)

    let isAnomaly = false
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let reason = ''
    let trendType: TrendAnomalyInfo['type'] = 'growth-rate'

    if (Math.abs(growthRate) >= this.config.trendDetection.growthRateThreshold) {
      isAnomaly = true
      severity =
        Math.abs(growthRate) >= this.config.trendDetection.growthRateThreshold * 2
          ? 'critical'
          : 'high'
      reason = `High growth rate detected: ${growthRate.toFixed(1)}% change`
      trendType = growthRate > 0 ? 'sustained-increase' : 'sustained-decrease'
    }

    if (volatility > this.config.trendDetection.volatilityThreshold) {
      if (severity === 'low') {
        isAnomaly = true
        severity = 'medium'
        reason = `High volatility detected: ${(volatility * 100).toFixed(1)}%`
        trendType = 'growth-rate'
      }
    }

    if (!isAnomaly) return null

    const baseline = this.baselines.get(metric) || this.calculateBaseline(metric)
    if (!baseline) return null

    const previousValue = values.length > 1 ? values[values.length - 2] : value
    const changePercent = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0

    const trendInfo: TrendAnomalyInfo = {
      type: trendType,
      growthRate,
      previousValue,
      currentValue: value,
      changePercent,
      windowSize: values.length,
    }

    return {
      id: `${metric}-trend-${Date.now()}`,
      isAnomaly,
      severity,
      metric,
      value,
      baseline,
      zScore: (value - baseline.mean) / baseline.stdDev,
      confidence: Math.min(
        Math.abs(growthRate) / this.config.trendDetection.growthRateThreshold,
        1
      ),
      reason,
      detectedAt: Date.now(),
      algorithm: 'trend',
      acknowledged: false,
      trendInfo,
    }
  }

  /**
   * Detect sudden change anomaly
   */
  private detectSuddenChangeAnomaly(metric: string, value: number): AnomalyDetection | null {
    if (!this.config.trendDetection.enabled) return null

    const history = this.dataHistory.get(metric)
    if (!history || history.length < 3) return null

    const values = history.toArray().map(d => d.value)
    const suddenChange = detectSuddenChange(
      values,
      this.config.trendDetection.suddenChangeThreshold
    )

    if (!suddenChange.isSuddenChange) return null

    const baseline = this.baselines.get(metric) || this.calculateBaseline(metric)
    if (!baseline) return null

    const previousValue = values.length > 1 ? values[values.length - 2] : value
    const changePercent = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'high'
    if (suddenChange.changeMagnitude >= this.config.trendDetection.suddenChangeThreshold * 2) {
      severity = 'critical'
    }

    const trendInfo: TrendAnomalyInfo = {
      type: 'sudden-change',
      growthRate: changePercent,
      previousValue,
      currentValue: value,
      changePercent,
      windowSize: values.length,
    }

    return {
      id: `${metric}-sudden-${Date.now()}`,
      isAnomaly: true,
      severity,
      metric,
      value,
      baseline,
      zScore: suddenChange.changeMagnitude,
      confidence: Math.min(
        suddenChange.changeMagnitude / (this.config.trendDetection.suddenChangeThreshold * 2),
        1
      ),
      reason: `Sudden change detected: ${suddenChange.changeMagnitude.toFixed(1)} std devs from mean`,
      detectedAt: Date.now(),
      algorithm: 'sudden-change',
      acknowledged: false,
      trendInfo,
    }
  }

  /**
   * Detect correlation-based anomaly - OPTIMIZED with sampling and caching
   */
  private detectCorrelationAnomaly(metric: string, value: number): AnomalyDetection | null {
    if (!this.config.correlation.enabled) return null

    const history = this.dataHistory.get(metric)
    if (!history || history.length < this.config.minSampleSize) return null

    // Use cached correlation results
    const cacheKey = `corr-${metric}`
    const cached = this.correlationCache.get(cacheKey)
    let correlatedMetrics: Array<{ metric: string; correlation: number }>

    if (cached) {
      correlatedMetrics = cached
    } else {
      correlatedMetrics = this.findCorrelatedMetrics(metric)
      this.correlationCache.set(cacheKey, correlatedMetrics, this.correlationCacheTTL)
    }

    if (correlatedMetrics.length === 0) return null

    const jointAnomalies: string[] = []

    for (const { metric: otherMetric } of correlatedMetrics) {
      const otherHistory = this.dataHistory.get(otherMetric)
      if (!otherHistory || otherHistory.length < this.config.minSampleSize) continue

      const otherValue = otherHistory.toArray()[otherHistory.length - 1].value
      const otherBaseline = this.baselines.get(otherMetric)
      if (!otherBaseline) continue

      const otherZScore = Math.abs((otherValue - otherBaseline.mean) / otherBaseline.stdDev)
      if (otherZScore >= this.config.zScoreThreshold) {
        jointAnomalies.push(otherMetric)
      }
    }

    if (jointAnomalies.length > 0) {
      const baseline = this.baselines.get(metric) || this.calculateBaseline(metric)
      if (!baseline) return null

      const correlationInfo: CorrelationInfo = {
        correlatedMetrics: jointAnomalies,
        correlationCoefficient:
          correlatedMetrics.find(m => m.metric === jointAnomalies[0])?.correlation || 0,
        jointAnomaly: true,
        description: `Joint anomaly detected with ${jointAnomalies.length} correlated metrics: ${jointAnomalies.join(', ')}`,
      }

      return {
        id: `${metric}-correlation-${Date.now()}`,
        isAnomaly: true,
        severity: jointAnomalies.length >= 2 ? 'critical' : 'high',
        metric,
        value,
        baseline,
        zScore: (value - baseline.mean) / baseline.stdDev,
        confidence: Math.min(jointAnomalies.length / this.config.correlation.maxMetrics, 1),
        reason: correlationInfo.description,
        detectedAt: Date.now(),
        algorithm: 'correlation',
        acknowledged: false,
        correlationInfo,
      }
    }

    return null
  }

  /**
   * Find correlated metrics - OPTIMIZED with sampling
   */
  private findCorrelatedMetrics(metric: string): Array<{ metric: string; correlation: number }> {
    const correlations: Array<{ metric: string; correlation: number }> = []
    const history = this.dataHistory.get(metric)
    if (!history) return correlations

    const values = history.toArray().map(d => d.value)

    // Sample values if too many
    const sampledValues = this.sampleArray(values, this.config.correlation.sampleSize)

    this.dataHistory.forEach((otherHistory, otherMetric) => {
      if (otherMetric === metric) return
      if (otherHistory.length < this.config.minSampleSize) return

      const otherValues = otherHistory.toArray().map(d => d.value)
      const sampledOtherValues = this.sampleArray(otherValues, this.config.correlation.sampleSize)

      const correlation = calculateCorrelationCoefficient(sampledValues, sampledOtherValues)

      if (Math.abs(correlation) >= this.config.correlation.minCorrelation) {
        correlations.push({ metric: otherMetric, correlation })
      }
    })

    return correlations
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, this.config.correlation.maxMetrics)
  }

  /**
   * Sample array to reduce size
   */
  private sampleArray<T>(arr: T[], maxSize: number): T[] {
    if (arr.length <= maxSize) return arr

    const step = Math.ceil(arr.length / maxSize)
    const sampled: T[] = []

    for (let i = 0; i < arr.length; i += step) {
      sampled.push(arr[i])
      if (sampled.length >= maxSize) break
    }

    return sampled
  }

  /**
   * Calculate baseline statistics for a metric - OPTIMIZED with incremental stats
   */
  calculateBaseline(metric: string): MetricBaseline | undefined {
    const history = this.dataHistory.get(metric)
    if (!history || history.length < this.config.minSampleSize) return undefined

    const values = history.toArray().map(d => d.value)
    const n = values.length

    // Use incremental stats for efficiency
    const stats = new IncrementalStats(1000)
    for (const v of values) {
      stats.add(v)
    }

    const mean = stats.getMean()
    const stdDev = stats.getStdDev() || 1

    const p50 = stats.getPercentile(50)
    const p95 = stats.getPercentile(95)
    const p99 = stats.getPercentile(99)

    const trend = this.detectTrend(values)
    const growthRate = calculateGrowthRate(values)
    const volatility = calculateVolatility(values)

    const baseline: MetricBaseline = {
      metric,
      mean,
      stdDev,
      min: stats.getMin(),
      max: stats.getMax(),
      p50,
      p95,
      p99,
      sampleSize: n,
      lastUpdated: Date.now(),
      trend,
      growthRate,
      volatility,
    }

    this.baselines.set(metric, baseline)
    return baseline
  }

  /**
   * Detect trend in values
   */
  private detectTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 10) return 'stable'

    const recentValues = values.slice(-20)
    const olderValues = values.slice(-40, -20)

    if (olderValues.length === 0) return 'stable'

    const recentMean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length
    const olderMean = olderValues.reduce((a, b) => a + b, 0) / olderValues.length

    const changePercent = olderMean !== 0 ? ((recentMean - olderMean) / olderMean) * 100 : 0

    if (changePercent > 10) return 'increasing'
    if (changePercent < -10) return 'decreasing'
    return 'stable'
  }

  /**
   * Get baseline for a metric
   */
  getBaseline(metric: string): MetricBaseline | null {
    return this.baselines.get(metric) || null
  }

  /**
   * Detect anomaly using Z-Score (public method)
   */
  detectAnomaly(metric: string, value: number): AnomalyDetection | null {
    return this.performComprehensiveDetection(metric, value)
  }

  /**
   * Detect metric-specific anomalies
   */
  private detectMetricSpecificAnomaly(
    metric: string,
    value: number,
    baseline: MetricBaseline
  ): AnomalyDetection | null {
    if (metric.includes('response') || metric.includes('latency') || metric.includes('duration')) {
      return this.detectResponseTimeAnomaly(metric, value, baseline)
    }
    if (metric.includes('memory') || metric.includes('heap')) {
      return this.detectMemoryAnomaly(metric, value, baseline)
    }
    if (metric.includes('error') || metric.includes('failure')) {
      return this.detectErrorRateAnomaly(metric, value, baseline)
    }
    if (metric.includes('cpu')) {
      return this.detectCpuAnomaly(metric, value, baseline)
    }
    return null
  }

  private detectResponseTimeAnomaly(
    metric: string,
    value: number,
    baseline: MetricBaseline
  ): AnomalyDetection | null {
    const config = this.config.metrics.responseTime
    if (!config.enabled) return null

    const dynamicThreshold = this.dynamicThresholds.get('responseTime')
    const warningThreshold = dynamicThreshold?.warning ?? config.warningThreshold
    const criticalThreshold = dynamicThreshold?.critical ?? config.criticalThreshold

    const zScore = (value - baseline.mean) / baseline.stdDev
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let isAnomaly = false
    let reason = ''

    if (value >= criticalThreshold) {
      severity = 'critical'
      isAnomaly = true
      reason = `Critical response time: ${value}ms exceeds threshold ${criticalThreshold}ms`
    } else if (value >= warningThreshold) {
      severity = 'high'
      isAnomaly = true
      reason = `High response time: ${value}ms exceeds threshold ${warningThreshold}ms`
    } else if (Math.abs(zScore) >= this.config.zScoreThreshold) {
      severity = 'high'
      isAnomaly = true
      reason = `Response time anomaly: Z-score ${zScore.toFixed(2)}`
    }

    if (!isAnomaly) return null

    return {
      id: `${metric}-${Date.now()}`,
      isAnomaly,
      severity,
      metric,
      value,
      baseline,
      zScore,
      confidence: Math.min(Math.abs(zScore) / this.config.criticalZScoreThreshold, 1),
      reason,
      detectedAt: Date.now(),
      algorithm: 'composite',
      acknowledged: false,
    }
  }

  private detectMemoryAnomaly(
    metric: string,
    value: number,
    baseline: MetricBaseline
  ): AnomalyDetection | null {
    const config = this.config.metrics.memoryUsage
    if (!config.enabled) return null

    const dynamicThreshold = this.dynamicThresholds.get('memoryUsage')
    const warningThreshold = dynamicThreshold?.warning ?? config.warningThreshold
    const criticalThreshold = dynamicThreshold?.critical ?? config.criticalThreshold

    const zScore = (value - baseline.mean) / baseline.stdDev
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let isAnomaly = false
    let reason = ''

    if (value >= criticalThreshold) {
      severity = 'critical'
      isAnomaly = true
      reason = `Critical memory usage: ${value.toFixed(1)}% exceeds threshold ${criticalThreshold}%`
    } else if (value >= warningThreshold) {
      severity = 'high'
      isAnomaly = true
      reason = `High memory usage: ${value.toFixed(1)}% exceeds threshold ${warningThreshold}%`
    } else if (Math.abs(zScore) >= this.config.zScoreThreshold) {
      severity = 'medium'
      isAnomaly = true
      reason = `Memory anomaly: Z-score ${zScore.toFixed(2)}`
    }

    if (baseline.trend === 'increasing') {
      reason += ' (trend: increasing)'
      if (severity === 'low') {
        severity = 'medium'
        isAnomaly = true
      }
    }

    if (!isAnomaly) return null

    return {
      id: `${metric}-${Date.now()}`,
      isAnomaly,
      severity,
      metric,
      value,
      baseline,
      zScore,
      confidence: Math.min(Math.abs(zScore) / this.config.criticalZScoreThreshold, 1),
      reason,
      detectedAt: Date.now(),
      algorithm: 'composite',
      acknowledged: false,
    }
  }

  private detectErrorRateAnomaly(
    metric: string,
    value: number,
    baseline: MetricBaseline
  ): AnomalyDetection | null {
    const config = this.config.metrics.errorRate
    if (!config.enabled) return null

    const dynamicThreshold = this.dynamicThresholds.get('errorRate')
    const warningThreshold = dynamicThreshold?.warning ?? config.warningThreshold
    const criticalThreshold = dynamicThreshold?.critical ?? config.criticalThreshold

    const zScore = (value - baseline.mean) / baseline.stdDev
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let isAnomaly = false
    let reason = ''

    if (value >= criticalThreshold) {
      severity = 'critical'
      isAnomaly = true
      reason = `Critical error rate: ${value.toFixed(2)}% exceeds threshold ${criticalThreshold}%`
    } else if (value >= warningThreshold) {
      severity = 'high'
      isAnomaly = true
      reason = `Elevated error rate: ${value.toFixed(2)}% exceeds threshold ${warningThreshold}%`
    } else if (Math.abs(zScore) >= this.config.zScoreThreshold) {
      severity = 'medium'
      isAnomaly = true
      reason = `Error rate anomaly: Z-score ${zScore.toFixed(2)}`
    }

    if (!isAnomaly) return null

    return {
      id: `${metric}-${Date.now()}`,
      isAnomaly,
      severity,
      metric,
      value,
      baseline,
      zScore,
      confidence: Math.min(Math.abs(zScore) / this.config.criticalZScoreThreshold, 1),
      reason,
      detectedAt: Date.now(),
      algorithm: 'composite',
      acknowledged: false,
    }
  }

  private detectCpuAnomaly(
    metric: string,
    value: number,
    baseline: MetricBaseline
  ): AnomalyDetection | null {
    const config = this.config.metrics.cpuUsage
    if (!config.enabled) return null

    const dynamicThreshold = this.dynamicThresholds.get('cpuUsage')
    const warningThreshold = dynamicThreshold?.warning ?? config.warningThreshold
    const criticalThreshold = dynamicThreshold?.critical ?? config.criticalThreshold

    const zScore = (value - baseline.mean) / baseline.stdDev
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let isAnomaly = false
    let reason = ''

    if (value >= criticalThreshold) {
      severity = 'critical'
      isAnomaly = true
      reason = `Critical CPU usage: ${value.toFixed(1)}% exceeds threshold ${criticalThreshold}%`
    } else if (value >= warningThreshold) {
      severity = 'high'
      isAnomaly = true
      reason = `High CPU usage: ${value.toFixed(1)}% exceeds threshold ${warningThreshold}%`
    } else if (Math.abs(zScore) >= this.config.zScoreThreshold) {
      severity = 'medium'
      isAnomaly = true
      reason = `CPU anomaly: Z-score ${zScore.toFixed(2)}`
    }

    if (!isAnomaly) return null

    return {
      id: `${metric}-${Date.now()}`,
      isAnomaly,
      severity,
      metric,
      value,
      baseline,
      zScore,
      confidence: Math.min(Math.abs(zScore) / this.config.criticalZScoreThreshold, 1),
      reason,
      detectedAt: Date.now(),
      algorithm: 'composite',
      acknowledged: false,
    }
  }

  /**
   * Check and adjust thresholds automatically
   */
  private checkAndAdjustThresholds(metric: string): void {
    if (!this.config.autoThreshold.enabled) return

    const lastAdjustment = this.lastThresholdAdjustment.get(metric) || 0
    if (Date.now() - lastAdjustment < this.config.autoThreshold.adjustmentIntervalMs) return

    const history = this.dataHistory.get(metric)
    if (!history || history.length < this.config.autoThreshold.minSampleSize) return

    const baseline = this.baselines.get(metric)
    if (!baseline) return

    let metricType: string | null = null
    if (metric.includes('response') || metric.includes('latency')) metricType = 'responseTime'
    else if (metric.includes('memory') || metric.includes('heap')) metricType = 'memoryUsage'
    else if (metric.includes('error')) metricType = 'errorRate'
    else if (metric.includes('cpu')) metricType = 'cpuUsage'

    if (!metricType) return

    const config = this.config.metrics[metricType as keyof typeof this.config.metrics]
    const currentThreshold = this.dynamicThresholds.get(metricType) || {
      warning: config.warningThreshold,
      critical: config.criticalThreshold,
    }

    const suggestedWarning = baseline.p95
    const suggestedCritical = baseline.p99

    const newWarning =
      currentThreshold.warning * this.config.autoThreshold.historicalWeight +
      suggestedWarning * (1 - this.config.autoThreshold.historicalWeight)
    const newCritical =
      currentThreshold.critical * this.config.autoThreshold.historicalWeight +
      suggestedCritical * (1 - this.config.autoThreshold.historicalWeight)

    const maxAdjustment =
      config.warningThreshold * (this.config.autoThreshold.maxAdjustmentPercent / 100)
    const clampedWarning = Math.max(
      config.warningThreshold - maxAdjustment,
      Math.min(config.warningThreshold + maxAdjustment, newWarning)
    )
    const clampedCritical = Math.max(
      config.criticalThreshold - maxAdjustment,
      Math.min(config.criticalThreshold + maxAdjustment, newCritical)
    )

    const warningChange =
      Math.abs(clampedWarning - currentThreshold.warning) / currentThreshold.warning
    if (warningChange > 0.05) {
      this.dynamicThresholds.set(metricType, {
        warning: clampedWarning,
        critical: clampedCritical,
      })

      this.lastThresholdAdjustment.set(metric, Date.now())

      const adjustment: ThresholdAdjustment = {
        metric: metricType,
        oldThreshold: currentThreshold.warning,
        newThreshold: clampedWarning,
        adjustmentReason: `Baseline updated based on ${history.length} samples`,
        adjustedAt: Date.now(),
        dataPoints: history.length,
        confidence: Math.min(history.length / 100, 1),
      }

      this.thresholdAdjustments.push(adjustment)
      this.emit('thresholdAdjusted', adjustment)
    }
  }

  /**
   * Get threshold adjustments history
   */
  getThresholdAdjustments(): ThresholdAdjustment[] {
    return [...this.thresholdAdjustments]
  }

  /**
   * Get current dynamic thresholds
   */
  getDynamicThresholds(): Map<string, { warning: number; critical: number }> {
    return new Map(this.dynamicThresholds)
  }

  /**
   * Handle anomaly detection
   */
  private handleAnomalyDetection(detection: AnomalyDetection): void {
    const lastAlert = this.lastAlertTime.get(detection.metric) || 0
    if (Date.now() - lastAlert < this.config.alertConfig.cooldownMs) return

    const currentLevel = getSeverityLevel(detection.severity)
    const minLevel = getSeverityLevel(this.config.alertConfig.minSeverity)
    if (currentLevel < minLevel) return

    const event: AnomalyEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      detection,
      acknowledged: false,
      resolved: false,
      falsePositive: false,
    }

    this.anomalyEvents.push(event)
    this.lastAlertTime.set(detection.metric, Date.now())

    this.triggerAlert(detection)
    this.emit('anomaly', detection)
    this.emit('anomalyEvent', event)
  }

  /**
   * Trigger alert
   */
  private triggerAlert(detection: AnomalyDetection): void {
    if (!this.config.alertConfig.enabled) return

    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
    const minLevel = severityLevels[this.config.alertConfig.minSeverity]
    const currentLevel = severityLevels[detection.severity]

    if (currentLevel < minLevel) return

    if (this.config.alertConfig.channels.includes('console')) {
      const emoji =
        detection.severity === 'critical'
          ? '🚨'
          : detection.severity === 'high'
            ? '⚠️'
            : detection.severity === 'medium'
              ? '📊'
              : 'ℹ️'

      const logMethod =
        detection.severity === 'critical'
          ? console.error
          : detection.severity === 'high'
            ? console.warn
            : console.log

      logMethod(`${emoji} [Anomaly] ${detection.metric}: ${detection.reason}`, {
        value: detection.value,
        zScore: detection.zScore.toFixed(2),
        algorithm: detection.algorithm,
        baseline: {
          mean: detection.baseline.mean.toFixed(2),
          stdDev: detection.baseline.stdDev.toFixed(2),
        },
      })
    }

    if (
      this.config.alertConfig.channels.includes('webhook') &&
      this.config.alertConfig.webhookUrl
    ) {
      this.sendWebhookAlert(detection).catch(err => {
        console.error('[Anomaly] Failed to send webhook alert:', err)
      })
    }

    if (this.config.alertConfig.channels.includes('sentry')) {
      this.sendSentryAlert(detection)
    }
  }

  private async sendWebhookAlert(detection: AnomalyDetection): Promise<void> {
    const webhookUrl = this.config.alertConfig.webhookUrl
    if (!webhookUrl) return

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'anomaly_alert',
          severity: detection.severity,
          metric: detection.metric,
          value: detection.value,
          zScore: detection.zScore,
          reason: detection.reason,
          algorithm: detection.algorithm,
          baseline: {
            mean: detection.baseline.mean,
            stdDev: detection.baseline.stdDev,
            sampleSize: detection.baseline.sampleSize,
          },
          timestamp: detection.detectedAt,
        }),
      })
    } catch (error) {
      throw error
    }
  }

  private sendSentryAlert(detection: AnomalyDetection): void {
    import('@sentry/nextjs')
      .then(Sentry => {
        Sentry.captureMessage(detection.reason, {
          level:
            detection.severity === 'critical'
              ? 'error'
              : detection.severity === 'high'
                ? 'warning'
                : 'info',
          tags: {
            anomaly_metric: detection.metric,
            anomaly_severity: detection.severity,
            anomaly_algorithm: detection.algorithm,
          },
          extra: {
            value: detection.value,
            zScore: detection.zScore,
            baseline: detection.baseline,
          },
        })
      })
      .catch(() => {
        // Sentry not available
      })
  }

  trackResponseTime(operation: string, durationMs: number): AnomalyDetection | null {
    const metric = `response_time_${operation}`
    this.trackMetric(metric, durationMs, { operation })
    return this.detectAnomaly(metric, durationMs)
  }

  trackMemoryUsage(
    usedPercent: number,
    totalMB?: number,
    usedMB?: number
  ): AnomalyDetection | null {
    const metric = 'memory_usage_percent'
    this.trackMetric(metric, usedPercent, { totalMB, usedMB })
    return this.detectAnomaly(metric, usedPercent)
  }

  trackErrorRate(
    rate: number,
    totalRequests?: number,
    errorCount?: number
  ): AnomalyDetection | null {
    const metric = 'error_rate_percent'
    this.trackMetric(metric, rate, { totalRequests, errorCount })
    return this.detectAnomaly(metric, rate)
  }

  trackCpuUsage(percent: number): AnomalyDetection | null {
    const metric = 'cpu_usage_percent'
    this.trackMetric(metric, percent)
    return this.detectAnomaly(metric, percent)
  }

  getAnomalyEvents(startTime?: number, limit: number = 100): AnomalyEvent[] {
    let events = [...this.anomalyEvents]

    if (startTime) {
      events = events.filter(e => e.detection.detectedAt >= startTime)
    }

    return events.slice(-limit)
  }

  acknowledgeEvent(eventId: string, acknowledgedBy?: string): boolean {
    const event = this.anomalyEvents.find(e => e.id === eventId)
    if (event) {
      event.acknowledged = true
      event.acknowledgedAt = Date.now()
      event.acknowledgedBy = acknowledgedBy
      this.emit('acknowledged', event)
      return true
    }
    return false
  }

  resolveEvent(eventId: string, notes?: string): boolean {
    const event = this.anomalyEvents.find(e => e.id === eventId)
    if (event) {
      event.resolved = true
      event.resolvedAt = Date.now()
      event.notes = notes
      event.detection.resolvedAt = Date.now()
      this.emit('resolved', event)
      return true
    }
    return false
  }

  markAsFalsePositive(eventId: string, notes?: string): boolean {
    const event = this.anomalyEvents.find(e => e.id === eventId)
    if (event) {
      event.falsePositive = true
      event.notes = notes
      this.emit('falsePositive', event)
      return true
    }
    return false
  }

  getStatistics(): {
    metricsTracked: number
    totalDataPoints: number
    baselines: number
    anomalyEvents: number
    unacknowledgedEvents: number
    unresolvedEvents: number
    falsePositiveRate: number
    bySeverity: Record<string, number>
    byMetric: Record<string, number>
    byAlgorithm: Record<string, number>
  } {
    let totalDataPoints = 0
    this.dataHistory.forEach(history => {
      totalDataPoints += history.length
    })

    const unacknowledgedEvents = this.anomalyEvents.filter(e => !e.acknowledged).length
    const unresolvedEvents = this.anomalyEvents.filter(e => !e.resolved && !e.falsePositive).length
    const falsePositiveCount = this.anomalyEvents.filter(e => e.falsePositive).length
    const falsePositiveRate =
      this.anomalyEvents.length > 0 ? falsePositiveCount / this.anomalyEvents.length : 0

    const bySeverity: Record<string, number> = {}
    const byMetric: Record<string, number> = {}
    const byAlgorithm: Record<string, number> = {}

    this.anomalyEvents.forEach(event => {
      const severity = event.detection.severity
      bySeverity[severity] = (bySeverity[severity] || 0) + 1

      const metric = event.detection.metric
      byMetric[metric] = (byMetric[metric] || 0) + 1

      const algorithm = event.detection.algorithm
      byAlgorithm[algorithm] = (byAlgorithm[algorithm] || 0) + 1
    })

    return {
      metricsTracked: this.dataHistory.size,
      totalDataPoints,
      baselines: this.baselines.size,
      anomalyEvents: this.anomalyEvents.length,
      unacknowledgedEvents,
      unresolvedEvents,
      falsePositiveRate,
      bySeverity,
      byMetric,
      byAlgorithm,
    }
  }

  updateConfig(partialConfig: Partial<AnomalyDetectorConfig>): void {
    this.config = { ...this.config, ...partialConfig }
  }

  clearMetric(metric: string): void {
    this.dataHistory.delete(metric)
    this.baselines.delete(metric)
    this.lastAlertTime.delete(metric)
    this.lastThresholdAdjustment.delete(metric)
  }

  clearAll(): void {
    this.dataHistory.forEach(history => history.clear())
    this.dataHistory.clear()
    this.baselines.clear()
    this.anomalyEvents = []
    this.lastAlertTime.clear()
    this.lastThresholdAdjustment.clear()
    this.thresholdAdjustments = []
    this.dynamicThresholds.clear()
    this.correlationCache.clear()
  }

  exportState(): {
    baselines: MetricBaseline[]
    events: AnomalyEvent[]
    dynamicThresholds: Record<string, { warning: number; critical: number }>
  } {
    const thresholds: Record<string, { warning: number; critical: number }> = {}
    this.dynamicThresholds.forEach((value, key) => {
      thresholds[key] = value
    })

    return {
      baselines: Array.from(this.baselines.values()),
      events: this.anomalyEvents.slice(-100),
      dynamicThresholds: thresholds,
    }
  }

  importState(state: {
    baselines: MetricBaseline[]
    events: AnomalyEvent[]
    dynamicThresholds?: Record<string, { warning: number; critical: number }>
  }): void {
    state.baselines.forEach(baseline => {
      this.baselines.set(baseline.metric, baseline)
    })
    this.anomalyEvents = state.events

    if (state.dynamicThresholds) {
      Object.entries(state.dynamicThresholds).forEach(([key, value]) => {
        this.dynamicThresholds.set(key, value)
      })
    }
  }
}

// ========================================
// Singleton Instance
// ========================================

export const optimizedAnomalyDetector = new OptimizedAnomalyDetector()

// ========================================
// Utility Functions
// ========================================

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function calculateStdDev(values: number[], mean?: number): number {
  if (values.length === 0) return 0
  const m = mean ?? calculateMean(values)
  const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length
  return Math.sqrt(variance)
}

export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0
  return (value - mean) / stdDev
}

export function isAnomaly(
  value: number,
  mean: number,
  stdDev: number,
  threshold: number = 2
): boolean {
  const zScore = Math.abs(calculateZScore(value, mean, stdDev))
  return zScore >= threshold
}

export default OptimizedAnomalyDetector