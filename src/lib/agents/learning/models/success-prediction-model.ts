/**
 * Success Prediction Model v1.9.0
 *
 * Predicts task success probability based on multiple factors:
 * - Agent reliability
 * - Current load
 * - Task complexity
 * - Dependencies
 * - Historical performance
 * - Time pressure
 */

/**
 * Input parameters for success prediction
 */
export interface SuccessPredictionInput {
  /** Type of task being executed */
  taskType: string
  /** ID of the agent executing the task */
  agentId: string
  /** Agent reliability score (0-1) */
  agentReliability: number
  /** Current load on the agent (0-1) */
  agentCurrentLoad: number
  /** Complexity of the task (0-1) */
  taskComplexity: number
  /** Historical success rate for this agent/task type (0-1) */
  historicalSuccessRate?: number
  /** Number of dependencies this task has */
  dependenciesCount: number
  /** Time pressure factor (0-1, higher = more pressure) */
  timePressure?: number
}

/**
 * Result of success prediction
 */
export interface SuccessPredictionResult {
  /** Predicted success probability (0-1) */
  successProbability: number
  /** Risk level classification */
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  /** List of identified risk factors */
  riskFactors: string[]
  /** Confidence in the prediction (0-1) */
  confidence: number
  /** Recommendations to improve success probability */
  recommendations: string[]
}

/**
 * Configuration for the success prediction model
 */
export interface SuccessPredictionConfig {
  /** Weight for agent reliability factor */
  reliabilityWeight?: number
  /** Weight for load factor */
  loadWeight?: number
  /** Weight for complexity factor */
  complexityWeight?: number
  /** Weight for dependencies factor */
  dependenciesWeight?: number
  /** Weight for historical performance factor */
  historicalWeight?: number
  /** Weight for time pressure factor */
  timePressureWeight?: number
  /** Thresholds for risk level classification */
  riskThresholds?: {
    low: number
    medium: number
    high: number
  }
}

/**
 * Success Prediction Model
 *
 * Uses weighted scoring to predict task success probability
 */
export class SuccessPredictionModel {
  private config: Required<SuccessPredictionConfig>

  constructor(config: SuccessPredictionConfig = {}) {
    this.config = {
      reliabilityWeight: config.reliabilityWeight ?? 0.3,
      loadWeight: config.loadWeight ?? 0.2,
      complexityWeight: config.complexityWeight ?? 0.2,
      dependenciesWeight: config.dependenciesWeight ?? 0.15,
      historicalWeight: config.historicalWeight ?? 0.1,
      timePressureWeight: config.timePressureWeight ?? 0.05,
      riskThresholds: config.riskThresholds ?? {
        low: 0.8,
        medium: 0.6,
        high: 0.4,
      },
    }
  }

  /**
   * Predict success probability for a task
   */
  predict(input: SuccessPredictionInput): SuccessPredictionResult {
    // Validate input
    this.validateInput(input)

    // Calculate individual factor scores
    const reliabilityScore = this.calculateReliabilityScore(input.agentReliability)
    const loadScore = this.calculateLoadScore(input.agentCurrentLoad)
    const complexityScore = this.calculateComplexityScore(input.taskComplexity)
    const dependenciesScore = this.calculateDependenciesScore(input.dependenciesCount)
    const historicalScore = this.calculateHistoricalScore(input.historicalSuccessRate)
    const timePressureScore = this.calculateTimePressureScore(input.timePressure)

    // Calculate weighted success probability
    const successProbability = this.calculateWeightedScore({
      reliabilityScore,
      loadScore,
      complexityScore,
      dependenciesScore,
      historicalScore,
      timePressureScore,
    })

    // Determine risk level
    const riskLevel = this.determineRiskLevel(successProbability)

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(input, {
      reliabilityScore,
      loadScore,
      complexityScore,
      dependenciesScore,
      historicalScore,
      timePressureScore,
    })

    // Generate recommendations
    const recommendations = this.generateRecommendations(input, riskFactors)

    // Calculate confidence
    const confidence = this.calculateConfidence(input)

    return {
      successProbability,
      riskLevel,
      riskFactors,
      confidence,
      recommendations,
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(input: SuccessPredictionInput): void {
    if (input.agentReliability < 0 || input.agentReliability > 1) {
      throw new Error('agentReliability must be between 0 and 1')
    }
    if (input.agentCurrentLoad < 0 || input.agentCurrentLoad > 1) {
      throw new Error('agentCurrentLoad must be between 0 and 1')
    }
    if (input.taskComplexity < 0 || input.taskComplexity > 1) {
      throw new Error('taskComplexity must be between 0 and 1')
    }
    if (input.dependenciesCount < 0) {
      throw new Error('dependenciesCount must be non-negative')
    }
    if (
      input.historicalSuccessRate !== undefined &&
      (input.historicalSuccessRate < 0 || input.historicalSuccessRate > 1)
    ) {
      throw new Error('historicalSuccessRate must be between 0 and 1')
    }
    if (input.timePressure !== undefined && (input.timePressure < 0 || input.timePressure > 1)) {
      throw new Error('timePressure must be between 0 and 1')
    }
  }

  /**
   * Calculate reliability score (higher is better)
   */
  private calculateReliabilityScore(reliability: number): number {
    // Direct mapping: reliability 0-1 maps to score 0-1
    return reliability
  }

  /**
   * Calculate load score (lower load is better)
   */
  private calculateLoadScore(load: number): number {
    // Inverse mapping: load 0-1 maps to score 1-0
    return 1 - load
  }

  /**
   * Calculate complexity score (lower complexity is better)
   */
  private calculateComplexityScore(complexity: number): number {
    // Inverse mapping with exponential decay for high complexity
    return Math.pow(1 - complexity, 1.5)
  }

  /**
   * Calculate dependencies score (fewer dependencies is better)
   */
  private calculateDependenciesScore(count: number): number {
    // Exponential decay: 0 deps = 1.0, 1 dep = 0.9, 2 deps = 0.81, etc.
    return Math.pow(0.9, count)
  }

  /**
   * Calculate historical performance score
   */
  private calculateHistoricalScore(historical?: number): number {
    if (historical === undefined) {
      // Default to neutral if no historical data
      return 0.5
    }
    return historical
  }

  /**
   * Calculate time pressure score (lower pressure is better)
   */
  private calculateTimePressureScore(pressure?: number): number {
    if (pressure === undefined) {
      // Default to neutral if no time pressure data
      return 0.5
    }
    // Inverse mapping with stronger penalty for high pressure
    return 1 - Math.pow(pressure, 1.2)
  }

  /**
   * Calculate weighted score from individual factors
   */
  private calculateWeightedScore(scores: {
    reliabilityScore: number
    loadScore: number
    complexityScore: number
    dependenciesScore: number
    historicalScore: number
    timePressureScore: number
  }): number {
    const totalWeight =
      this.config.reliabilityWeight +
      this.config.loadWeight +
      this.config.complexityWeight +
      this.config.dependenciesWeight +
      this.config.historicalWeight +
      this.config.timePressureWeight

    const weightedSum =
      scores.reliabilityScore * this.config.reliabilityWeight +
      scores.loadScore * this.config.loadWeight +
      scores.complexityScore * this.config.complexityWeight +
      scores.dependenciesScore * this.config.dependenciesWeight +
      scores.historicalScore * this.config.historicalWeight +
      scores.timePressureScore * this.config.timePressureWeight

    return weightedSum / totalWeight
  }

  /**
   * Determine risk level based on success probability
   */
  private determineRiskLevel(probability: number): 'low' | 'medium' | 'high' | 'critical' {
    if (probability >= this.config.riskThresholds.low) {
      return 'low'
    } else if (probability >= this.config.riskThresholds.medium) {
      return 'medium'
    } else if (probability >= this.config.riskThresholds.high) {
      return 'high'
    } else {
      return 'critical'
    }
  }

  /**
   * Identify risk factors based on scores
   */
  private identifyRiskFactors(
    input: SuccessPredictionInput,
    scores: {
      reliabilityScore: number
      loadScore: number
      complexityScore: number
      dependenciesScore: number
      historicalScore: number
      timePressureScore: number
    }
  ): string[] {
    const factors: string[] = []

    // Check reliability
    if (scores.reliabilityScore < 0.6) {
      factors.push(`Low agent reliability (${(input.agentReliability * 100).toFixed(0)}%)`)
    }

    // Check load
    if (scores.loadScore < 0.5) {
      factors.push(`High agent load (${(input.agentCurrentLoad * 100).toFixed(0)}%)`)
    }

    // Check complexity
    if (scores.complexityScore < 0.5) {
      factors.push(`High task complexity (${(input.taskComplexity * 100).toFixed(0)}%)`)
    }

    // Check dependencies
    if (scores.dependenciesScore < 0.7) {
      factors.push(`Many dependencies (${input.dependenciesCount})`)
    }

    // Check historical performance
    if (input.historicalSuccessRate !== undefined && scores.historicalScore < 0.6) {
      factors.push(
        `Poor historical success rate (${(input.historicalSuccessRate * 100).toFixed(0)}%)`
      )
    }

    // Check time pressure
    if (input.timePressure !== undefined && scores.timePressureScore < 0.5) {
      factors.push(`High time pressure (${(input.timePressure * 100).toFixed(0)}%)`)
    }

    return factors
  }

  /**
   * Generate recommendations based on risk factors
   */
  private generateRecommendations(input: SuccessPredictionInput, riskFactors: string[]): string[] {
    const recommendations: string[] = []

    // Reliability recommendations
    if (input.agentReliability < 0.6) {
      recommendations.push('Consider assigning to a more reliable agent')
      recommendations.push('Add retry logic for this task')
    }

    // Load recommendations
    if (input.agentCurrentLoad > 0.7) {
      recommendations.push('Wait for agent load to decrease')
      recommendations.push('Consider load balancing across agents')
    }

    // Complexity recommendations
    if (input.taskComplexity > 0.7) {
      recommendations.push('Break down task into smaller subtasks')
      recommendations.push('Provide additional context or resources')
    }

    // Dependencies recommendations
    if (input.dependenciesCount > 3) {
      recommendations.push('Reduce dependencies if possible')
      recommendations.push('Ensure dependencies are completed before starting')
    }

    // Historical performance recommendations
    if (input.historicalSuccessRate !== undefined && input.historicalSuccessRate < 0.6) {
      recommendations.push('Review past failures for this agent/task type')
      recommendations.push('Consider additional training or guidance')
    }

    // Time pressure recommendations
    if (input.timePressure !== undefined && input.timePressure > 0.7) {
      recommendations.push('Extend deadline if possible')
      recommendations.push('Prioritize this task over others')
    }

    // General recommendations for critical risk
    if (riskFactors.length >= 3) {
      recommendations.push('Multiple risk factors detected - consider alternative approach')
    }

    return recommendations
  }

  /**
   * Calculate confidence in the prediction
   */
  private calculateConfidence(input: SuccessPredictionInput): number {
    let confidence = 0.5 // Base confidence

    // Increase confidence if we have historical data
    if (input.historicalSuccessRate !== undefined) {
      confidence += 0.2
    }

    // Increase confidence if we have time pressure data
    if (input.timePressure !== undefined) {
      confidence += 0.1
    }

    // Decrease confidence for extreme values (less data)
    if (input.agentReliability < 0.2 || input.agentReliability > 0.9) {
      confidence -= 0.1
    }
    if (input.agentCurrentLoad < 0.1 || input.agentCurrentLoad > 0.9) {
      confidence -= 0.1
    }

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Batch predict for multiple inputs
   */
  batchPredict(inputs: SuccessPredictionInput[]): SuccessPredictionResult[] {
    return inputs.map(input => this.predict(input))
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<SuccessPredictionConfig>> {
    return this.config
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SuccessPredictionConfig>): void {
    Object.assign(this.config, config)
  }
}

/**
 * Create a success prediction model with default configuration
 */
export function createSuccessPredictionModel(
  config?: SuccessPredictionConfig
): SuccessPredictionModel {
  return new SuccessPredictionModel(config)
}

/**
 * Quick prediction function using default model
 */
export function predictSuccess(
  input: SuccessPredictionInput,
  config?: SuccessPredictionConfig
): SuccessPredictionResult {
  const model = new SuccessPredictionModel(config)
  return model.predict(input)
}
