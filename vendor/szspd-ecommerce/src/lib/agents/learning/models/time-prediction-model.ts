/**
 * Time Prediction Model v1.9.0
 *
 * Advanced time prediction model with statistical analysis,
 * complexity adjustment, and confidence intervals.
 *
 * @module TimePredictionModel
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Input for time prediction
 */
export interface TimePredictionInput {
  /** Type of task being predicted */
  taskType: string
  /** Initial estimated duration in milliseconds */
  estimatedDuration: number
  /** Task complexity score (0-1, where 1 is most complex) */
  complexity: number
  /** Number of dependencies this task has */
  dependencies: number
  /** Current agent load (0-1, where 1 is fully loaded) */
  agentLoad: number
  /** Historical completion times in milliseconds (optional) */
  historicalData?: number[]
}

/**
 * Result of time prediction
 */
export interface TimePredictionResult {
  /** Predicted duration in milliseconds */
  predictedMs: number
  /** Confidence level (0-1) */
  confidence: number
  /** 75th percentile prediction in milliseconds */
  p75: number
  /** 95th percentile prediction in milliseconds */
  p95: number
  /** Strategy used for prediction */
  strategy: 'historical_avg' | 'weighted_avg' | 'complexity_adjusted'
}

/**
 * Configuration for the time prediction model
 */
export interface TimePredictionModelConfig {
  /** Minimum historical samples required for statistical prediction */
  minHistoricalSamples: number
  /** Weight for recent data in weighted average (0-1) */
  recencyWeight: number
  /** Complexity adjustment factor */
  complexityFactor: number
  /** Dependency time penalty per dependency (ms) */
  dependencyPenaltyMs: number
  /** Load multiplier cap */
  maxLoadMultiplier: number
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TimePredictionModelConfig = {
  minHistoricalSamples: 3,
  recencyWeight: 0.3,
  complexityFactor: 0.5,
  dependencyPenaltyMs: 100,
  maxLoadMultiplier: 3.0,
}

// ============================================================================
// Time Prediction Model Implementation
// ============================================================================

/**
 * Time Prediction Model
 *
 * Provides time predictions using multiple strategies:
 * - Historical average: Simple mean of historical data
 * - Weighted average: Recency-weighted historical average
 * - Complexity adjusted: Adjusts prediction based on task complexity
 */
export class TimePredictionModel {
  private config: TimePredictionModelConfig

  constructor(config: Partial<TimePredictionModelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Predict task completion time
   *
   * @param input - Prediction input parameters
   * @returns Prediction result with confidence intervals
   */
  predict(input: TimePredictionInput): TimePredictionResult {
    const { historicalData, complexity, dependencies, agentLoad, estimatedDuration } = input

    // Determine the best strategy based on available data
    const strategy = this.selectStrategy(input)

    let result: TimePredictionResult

    switch (strategy) {
      case 'historical_avg':
        result = this.historicalAveragePredict(input)
        break
      case 'weighted_avg':
        result = this.weightedAveragePredict(input)
        break
      case 'complexity_adjusted':
      default:
        result = this.complexityAdjustedPredict(input)
        break
    }

    // Apply dependency penalty
    const dependencyPenalty = dependencies * this.config.dependencyPenaltyMs
    result.predictedMs += dependencyPenalty
    result.p75 += dependencyPenalty
    result.p95 += dependencyPenalty

    // Apply agent load adjustment
    const loadMultiplier = 1 + agentLoad * (this.config.maxLoadMultiplier - 1)
    result.predictedMs *= loadMultiplier
    result.p75 *= loadMultiplier
    result.p95 *= loadMultiplier

    // Round to integers
    result.predictedMs = Math.round(result.predictedMs)
    result.p75 = Math.round(result.p75)
    result.p95 = Math.round(result.p95)

    return result
  }

  /**
   * Select the best prediction strategy based on input
   */
  private selectStrategy(input: TimePredictionInput): TimePredictionResult['strategy'] {
    const { historicalData } = input

    // Need minimum samples for historical strategies
    if (!historicalData || historicalData.length < this.config.minHistoricalSamples) {
      return 'complexity_adjusted'
    }

    // Use weighted average if we have enough data
    if (historicalData.length >= 5) {
      return 'weighted_avg'
    }

    return 'historical_avg'
  }

  /**
   * Historical average prediction strategy
   * Simple mean of historical completion times
   */
  private historicalAveragePredict(input: TimePredictionInput): TimePredictionResult {
    const { historicalData, estimatedDuration } = input

    if (!historicalData || historicalData.length === 0) {
      return this.complexityAdjustedPredict(input)
    }

    // Calculate simple average
    const avg = this.calculateMean(historicalData)

    // Calculate percentiles
    const p75 = this.calculatePercentile(historicalData, 75)
    const p95 = this.calculatePercentile(historicalData, 95)

    // Calculate confidence based on variance
    const variance = this.calculateVariance(historicalData, avg)
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / avg // Coefficient of variation

    // Lower CV = higher confidence (max 0.9 for historical avg)
    const confidence = Math.min(0.9, Math.max(0.5, 0.9 - cv))

    return {
      predictedMs: Math.round(avg),
      confidence,
      p75: Math.round(p75),
      p95: Math.round(p95),
      strategy: 'historical_avg',
    }
  }

  /**
   * Weighted average prediction strategy
   * More recent data has higher weight
   */
  private weightedAveragePredict(input: TimePredictionInput): TimePredictionResult {
    const { historicalData, estimatedDuration } = input

    if (!historicalData || historicalData.length === 0) {
      return this.complexityAdjustedPredict(input)
    }

    // Sort data to apply recency weights (assuming last is most recent)
    const sortedData = [...historicalData].sort((a, b) => a - b)
    const n = sortedData.length

    // Calculate weighted average with exponential decay
    let weightedSum = 0
    let totalWeight = 0
    const alpha = this.config.recencyWeight

    for (let i = 0; i < n; i++) {
      // More recent (higher index) gets higher weight
      const recency = (i + 1) / n
      const weight = Math.pow(alpha, 1 - recency)
      weightedSum += sortedData[i] * weight
      totalWeight += weight
    }

    const weightedAvg = weightedSum / totalWeight

    // Calculate weighted percentiles
    const p75 = this.calculateWeightedPercentile(sortedData, 75, alpha)
    const p95 = this.calculateWeightedPercentile(sortedData, 95, alpha)

    // Calculate confidence
    const variance = this.calculateVariance(sortedData, weightedAvg)
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / weightedAvg

    // Weighted average can have higher confidence with more data
    const sampleBonus = Math.min(0.1, n * 0.01)
    const confidence = Math.min(0.95, Math.max(0.5, 0.85 - cv + sampleBonus))

    return {
      predictedMs: Math.round(weightedAvg),
      confidence,
      p75: Math.round(p75),
      p95: Math.round(p95),
      strategy: 'weighted_avg',
    }
  }

  /**
   * Complexity adjusted prediction strategy
   * Uses estimated duration adjusted by complexity
   */
  private complexityAdjustedPredict(input: TimePredictionInput): TimePredictionResult {
    const { estimatedDuration, complexity, historicalData } = input

    // Base prediction from estimated duration
    let basePrediction = estimatedDuration

    // Adjust for complexity (0 = simple, 1 = complex)
    // Complex tasks tend to take longer than estimated
    const complexityAdjustment = 1 + complexity * this.config.complexityFactor
    basePrediction *= complexityAdjustment

    // Calculate percentiles based on complexity uncertainty
    // Higher complexity = wider confidence interval
    const uncertaintyFactor = 1 + complexity
    const p75 = basePrediction * (1 + 0.25 * uncertaintyFactor)
    const p95 = basePrediction * (1 + 0.5 * uncertaintyFactor)

    // Calculate confidence
    // Lower confidence for higher complexity and no historical data
    let confidence = 0.7 - complexity * 0.2

    // Boost confidence if we have some historical data
    if (historicalData && historicalData.length > 0) {
      const historicalAvg = this.calculateMean(historicalData)
      const ratio = estimatedDuration / historicalAvg

      // If estimate is close to historical average, boost confidence
      if (ratio > 0.5 && ratio < 2) {
        confidence += 0.1
      }
    }

    confidence = Math.max(0.3, Math.min(0.85, confidence))

    return {
      predictedMs: Math.round(basePrediction),
      confidence,
      p75: Math.round(p75),
      p95: Math.round(p95),
      strategy: 'complexity_adjusted',
    }
  }

  // ------------------------------------------------------------------------
  // Statistical Helper Methods
  // ------------------------------------------------------------------------

  /**
   * Calculate mean of an array of numbers
   */
  private calculateMean(data: number[]): number {
    if (data.length === 0) return 0
    return data.reduce((sum, val) => sum + val, 0) / data.length
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(data: number[], mean?: number): number {
    if (data.length === 0) return 0
    const m = mean ?? this.calculateMean(data)
    const squaredDiffs = data.map(val => Math.pow(val - m, 2))
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length
  }

  /**
   * Calculate percentile of an array
   */
  private calculatePercentile(data: number[], percentile: number): number {
    if (data.length === 0) return 0

    const sorted = [...data].sort((a, b) => a - b)
    const index = (percentile / 100) * (sorted.length - 1)

    if (Number.isInteger(index)) {
      return sorted[index]
    }

    // Linear interpolation
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const fraction = index - lower

    return sorted[lower] * (1 - fraction) + sorted[upper] * fraction
  }

  /**
   * Calculate weighted percentile
   */
  private calculateWeightedPercentile(data: number[], percentile: number, alpha: number): number {
    if (data.length === 0) return 0

    const sorted = [...data].sort((a, b) => a - b)
    const n = sorted.length

    // Calculate cumulative weights
    const weights: number[] = []
    let totalWeight = 0

    for (let i = 0; i < n; i++) {
      const recency = (i + 1) / n
      const weight = Math.pow(alpha, 1 - recency)
      weights.push(weight)
      totalWeight += weight
    }

    // Find the value at the percentile
    const targetWeight = (percentile / 100) * totalWeight
    let cumulativeWeight = 0

    for (let i = 0; i < n; i++) {
      cumulativeWeight += weights[i]
      if (cumulativeWeight >= targetWeight) {
        return sorted[i]
      }
    }

    return sorted[n - 1]
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TimePredictionModelConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): TimePredictionModelConfig {
    return { ...this.config }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a TimePredictionModel instance
 */
export function createTimePredictionModel(
  config?: Partial<TimePredictionModelConfig>
): TimePredictionModel {
  return new TimePredictionModel(config)
}

// ============================================================================
// Integration with TimePredictionEngine
// ============================================================================

/**
 * Adapter to integrate TimePredictionModel with existing TimePredictionEngine
 *
 * This function converts between the new model's interface and the existing engine's format.
 */
export function adaptToEngineFormat(result: TimePredictionResult): {
  estimatedMinutes: number
  confidence: number
  confidenceInterval: [number, number]
  factors: string[]
  basedOn: string
  strategy: 'rule-based' | 'statistical' | 'adaptive'
  basedOnTasks: string[]
} {
  // Convert ms to minutes
  const estimatedMinutes = Math.round(result.predictedMs / 60000)
  const p75Minutes = Math.round(result.p75 / 60000)
  const p95Minutes = Math.round(result.p95 / 60000)

  // Map strategy names
  const strategyMap: Record<string, 'rule-based' | 'statistical' | 'adaptive'> = {
    historical_avg: 'statistical',
    weighted_avg: 'statistical',
    complexity_adjusted: 'rule-based',
  }

  return {
    estimatedMinutes,
    confidence: result.confidence,
    confidenceInterval: [estimatedMinutes, p95Minutes],
    factors: [
      `Predicted: ${estimatedMinutes}min`,
      `P75: ${p75Minutes}min`,
      `P95: ${p95Minutes}min`,
      `Strategy: ${result.strategy}`,
    ],
    basedOn: `TimePredictionModel v1.9.0 (${result.strategy})`,
    strategy: strategyMap[result.strategy] || 'rule-based',
    basedOnTasks: [],
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default TimePredictionModel
