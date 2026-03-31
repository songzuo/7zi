/**
 * Time Prediction Engine
 * Predicts task completion time based on historical data
 * 
 * Supports three prediction strategies:
 * 1. Rule-Based: Heuristic predictions based on task type and complexity
 * 2. Statistical: Weighted average using historical data
 * 3. Adaptive: Self-adjusting based on prediction accuracy
 * 
 * @module TimePredictionEngine
 */

import type { TaskType, AgentId } from './types';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type TaskId = string;
export type TaskComplexity = 'low' | 'medium' | 'high' | 'critical';
export type PredictionStrategy = 'rule-based' | 'statistical' | 'adaptive';

/**
 * Time prediction result
 */
export interface TimePrediction {
  /** Estimated time in minutes */
  estimatedMinutes: number;
  /** Confidence level (0-1) */
  confidence: number;
  /** Confidence interval [lower, upper] in minutes */
  confidenceInterval: [number, number];
  /** Factors that influenced the prediction */
  factors: string[];
  /** What data the prediction is based on */
  basedOn: string;
  /** Strategy used for prediction */
  strategy: PredictionStrategy;
  /** Historical task IDs used (if any) */
  basedOnTasks: TaskId[];
}

/**
 * Input for prediction
 */
export interface PredictionInput {
  agentId: AgentId;
  taskType: TaskType;
  taskComplexity: TaskComplexity;
  historicalData?: {
    avgCompletionTime: number;
    successRate: number;
    agentReliability: number;
  };
}

/**
 * Agent's prediction accuracy tracking
 */
interface AgentAccuracyRecord {
  agentId: AgentId;
  totalPredictions: number;
  accuratePredictions: number; // Within 25% of actual
  totalError: number;
  predictions: Array<{
    predicted: number;
    actual: number;
    timestamp: number;
  }>;
}

/**
 * Task completion history for an agent
 */
interface AgentTaskHistory {
  agentId: AgentId;
  tasks: Array<{
    taskId: TaskId;
    taskType: TaskType;
    complexity: TaskComplexity;
    actualTime: number; // minutes
    success: boolean;
    timestamp: number;
  }>;
}

/**
 * Time Prediction Engine configuration
 */
export interface TimePredictionConfig {
  /** Minimum samples required for statistical prediction */
  minSampleSize: number;
  /** Confidence threshold for switching strategies */
  confidenceThreshold: number;
  /** Accuracy window for tracking (number of predictions) */
  accuracyWindowSize: number;
  /** Maximum history entries per agent */
  maxHistoryPerAgent: number;
  /** Default time estimates by complexity (minutes) */
  defaultTimesByComplexity: Record<TaskComplexity, number>;
  /** Complexity multipliers */
  complexityMultipliers: Record<TaskComplexity, number>;
  /** Strategy to use */
  strategy: PredictionStrategy;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TimePredictionConfig = {
  minSampleSize: 5,
  confidenceThreshold: 0.7,
  accuracyWindowSize: 20,
  maxHistoryPerAgent: 100,
  defaultTimesByComplexity: {
    low: 5,
    medium: 15,
    high: 45,
    critical: 120
  },
  complexityMultipliers: {
    low: 0.8,
    medium: 1.0,
    high: 1.5,
    critical: 2.0
  },
  strategy: 'adaptive'
};

// ============================================================================
// Time Prediction Engine Implementation
// ============================================================================

/**
 * Time Prediction Engine
 * 
 * Predicts task completion time using multiple strategies:
 * - Rule-Based: Uses task type and complexity heuristics
 * - Statistical: Uses historical weighted averages
 * - Adaptive: Self-adjusts based on prediction accuracy
 */
export class TimePredictionEngine {
  private config: TimePredictionConfig;
  private agentHistories: Map<AgentId, AgentTaskHistory> = new Map();
  private agentAccuracies: Map<AgentId, AgentAccuracyRecord> = new Map();
  private taskTypeAverages: Map<TaskType, { avgTime: number; sampleCount: number }> = new Map();

  constructor(config: Partial<TimePredictionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Predict task completion time
   */
  async predict(input: PredictionInput): Promise<TimePrediction> {
    const strategy = this.selectStrategy(input);
    
    switch (strategy) {
      case 'statistical':
        return this.statisticalPredict(input);
      case 'adaptive':
        return this.adaptivePredict(input);
      case 'rule-based':
      default:
        return this.ruleBasedPredict(input);
    }
  }

  /**
   * Update history with actual completion data
   */
  updateHistory(
    agentId: AgentId,
    taskId: TaskId,
    actualTime: number,
    success: boolean,
    taskType: TaskType = 'general',
    complexity: TaskComplexity = 'medium'
  ): void {
    // Update agent history
    let history = this.agentHistories.get(agentId);
    if (!history) {
      history = { agentId, tasks: [] };
      this.agentHistories.set(agentId, history);
    }

    // Add new entry
    history.tasks.push({
      taskId,
      taskType,
      complexity,
      actualTime,
      success,
      timestamp: Date.now()
    });

    // Trim to max size
    if (history.tasks.length > this.config.maxHistoryPerAgent) {
      history.tasks = history.tasks.slice(-this.config.maxHistoryPerAgent);
    }

    // Update task type averages
    this.updateTaskTypeAverage(taskType, actualTime);
  }

  /**
   * Get prediction accuracy for an agent
   */
  getAgentAccuracy(agentId: AgentId): number {
    const record = this.agentAccuracies.get(agentId);
    if (!record || record.totalPredictions === 0) {
      return 0;
    }
    return record.accuratePredictions / record.totalPredictions;
  }

  /**
   * Get overall prediction accuracy across all agents
   */
  getOverallAccuracy(): number {
    let totalPredictions = 0;
    let accuratePredictions = 0;

    const records = Array.from(this.agentAccuracies.values());
    for (const record of records) {
      totalPredictions += record.totalPredictions;
      accuratePredictions += record.accuratePredictions;
    }

    if (totalPredictions === 0) {
      return 0;
    }

    return accuratePredictions / totalPredictions;
  }

  /**
   * Get accuracy statistics by task type
   */
  getAccuracyByTaskType(): Map<TaskType, { accuracy: number; count: number }> {
    const stats = new Map<TaskType, { accurate: number; total: number }>();

    const histories = Array.from(this.agentHistories.values());
    for (const history of histories) {
      for (const task of history.tasks) {
        const current = stats.get(task.taskType) || { accurate: 0, total: 0 };
        current.total++;
        if (task.success) {
          current.accurate++;
        }
        stats.set(task.taskType, current);
      }
    }

    const result = new Map<TaskType, { accuracy: number; count: number }>();
    const entries = Array.from(stats.entries());
    for (const [taskType, data] of entries) {
      result.set(taskType, {
        accuracy: data.total > 0 ? data.accurate / data.total : 0,
        count: data.total
      });
    }

    return result;
  }

  // ------------------------------------------------------------------------
  // Private Methods - Strategy Selection
  // ------------------------------------------------------------------------

  /**
   * Select the best prediction strategy based on available data
   */
  private selectStrategy(input: PredictionInput): PredictionStrategy {
    // Check if we have enough historical data
    const history = this.agentHistories.get(input.agentId);
    const sampleCount = history?.tasks.length ?? 0;

    // If configured to use a specific strategy, respect it (unless adaptive)
    if (this.config.strategy !== 'adaptive') {
      // For statistical, need minimum samples
      if (this.config.strategy === 'statistical' && sampleCount < this.config.minSampleSize) {
        return 'rule-based';
      }
      return this.config.strategy;
    }

    // Adaptive strategy selection
    if (sampleCount < this.config.minSampleSize) {
      return 'rule-based';
    }

    // Check prediction accuracy
    const accuracy = this.getAgentAccuracy(input.agentId);
    if (accuracy < this.config.confidenceThreshold) {
      return 'statistical';
    }

    return 'adaptive';
  }

  // ------------------------------------------------------------------------
  // Private Methods - Prediction Strategies
  // ------------------------------------------------------------------------

  /**
   * Rule-based prediction using heuristics
   */
  private ruleBasedPredict(input: PredictionInput): TimePrediction {
    const { taskType, taskComplexity, historicalData } = input;

    // Start with base time for complexity
    const baseTime = this.config.defaultTimesByComplexity[taskComplexity];
    const factors: string[] = [`Base time for ${taskComplexity} complexity: ${baseTime}min`];

    // Apply complexity multiplier
    const multiplier = this.config.complexityMultipliers[taskComplexity];
    let estimatedTime = baseTime * multiplier;
    factors.push(`Complexity multiplier: ${multiplier}x`);

    // Adjust based on task type averages if available
    const typeAverage = this.taskTypeAverages.get(taskType);
    if (typeAverage && typeAverage.sampleCount >= 3) {
      const typeAdjustment = typeAverage.avgTime * 0.3;
      estimatedTime = estimatedTime * 0.7 + typeAdjustment;
      factors.push(`Task type average adjustment: ${typeAverage.avgTime.toFixed(1)}min`);
    }

    // Adjust based on agent reliability if available
    let confidence = 0.6; // Base confidence for rule-based
    if (historicalData) {
      const reliabilityAdjustment = historicalData.agentReliability;
      estimatedTime *= (2 - reliabilityAdjustment); // Lower reliability = longer time
      confidence = 0.5 + (historicalData.successRate * 0.3);
      factors.push(`Agent reliability: ${(historicalData.agentReliability * 100).toFixed(0)}%`);
    }

    // Calculate confidence interval (±30% for rule-based)
    const interval: [number, number] = [
      Math.max(1, estimatedTime * 0.7),
      estimatedTime * 1.3
    ];

    return {
      estimatedMinutes: Math.round(estimatedTime),
      confidence,
      confidenceInterval: [Math.round(interval[0]), Math.round(interval[1])],
      factors,
      basedOn: 'heuristic rules and task complexity',
      strategy: 'rule-based',
      basedOnTasks: []
    };
  }

  /**
   * Statistical prediction using weighted historical averages
   */
  private statisticalPredict(input: PredictionInput): TimePrediction {
    const { agentId, taskType, taskComplexity } = input;
    const history = this.agentHistories.get(agentId);

    if (!history || history.tasks.length < this.config.minSampleSize) {
      // Fall back to rule-based if not enough data
      return this.ruleBasedPredict(input);
    }

    const factors: string[] = [];
    let totalWeight = 0;
    let weightedSum = 0;

    // Filter relevant tasks (same task type preferred)
    const relevantTasks = history.tasks.filter(t => t.success);
    
    if (relevantTasks.length === 0) {
      return this.ruleBasedPredict(input);
    }

    // Calculate weighted average with recency bias
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

    for (const task of relevantTasks) {
      // Weight by recency and task type similarity
      const age = now - task.timestamp;
      const recencyWeight = Math.max(0.1, 1 - (age / maxAge));
      const typeWeight = task.taskType === taskType ? 1.5 : 1.0;
      const complexityWeight = task.complexity === taskComplexity ? 1.3 : 1.0;
      
      const weight = recencyWeight * typeWeight * complexityWeight;
      weightedSum += task.actualTime * weight;
      totalWeight += weight;
    }

    const avgTime = weightedSum / totalWeight;
    factors.push(`Weighted average from ${relevantTasks.length} historical tasks`);

    // Calculate standard deviation for confidence interval
    let variance = 0;
    for (const task of relevantTasks) {
      variance += Math.pow(task.actualTime - avgTime, 2);
    }
    const stdDev = Math.sqrt(variance / relevantTasks.length);
    
    // Confidence based on sample size and variance
    const sampleSizeBonus = Math.min(0.2, relevantTasks.length * 0.02);
    const variancePenalty = Math.min(0.3, (stdDev / avgTime) * 0.3);
    const confidence = Math.min(0.95, 0.7 + sampleSizeBonus - variancePenalty);

    factors.push(`Standard deviation: ${stdDev.toFixed(1)}min`);
    factors.push(`Sample size: ${relevantTasks.length} tasks`);

    // Confidence interval based on standard deviation
    const interval: [number, number] = [
      Math.max(1, avgTime - stdDev),
      avgTime + stdDev
    ];

    return {
      estimatedMinutes: Math.round(avgTime),
      confidence,
      confidenceInterval: [Math.round(interval[0]), Math.round(interval[1])],
      factors,
      basedOn: `${relevantTasks.length} historical tasks`,
      strategy: 'statistical',
      basedOnTasks: relevantTasks.slice(-5).map(t => t.taskId)
    };
  }

  /**
   * Adaptive prediction that adjusts based on past accuracy
   */
  private async adaptivePredict(input: PredictionInput): Promise<TimePrediction> {
    const { agentId } = input;
    const accuracy = this.getAgentAccuracy(agentId);

    // Get statistical prediction as base
    const statisticalResult = this.statisticalPredict(input);

    // If we have good accuracy, trust the statistical prediction
    if (accuracy >= this.config.confidenceThreshold) {
      return {
        ...statisticalResult,
        strategy: 'adaptive',
        confidence: Math.min(0.95, statisticalResult.confidence * (0.9 + accuracy * 0.1)),
        basedOn: `adaptive model with ${(accuracy * 100).toFixed(0)}% historical accuracy`
      };
    }

    // Otherwise, blend with rule-based prediction
    const ruleBasedResult = this.ruleBasedPredict(input);
    
    // Weight based on accuracy (lower accuracy = more rule-based)
    const blendWeight = accuracy;
    const blendedTime = 
      statisticalResult.estimatedMinutes * blendWeight + 
      ruleBasedResult.estimatedMinutes * (1 - blendWeight);

    const factors = [
      ...statisticalResult.factors,
      `Blended with rule-based (accuracy: ${(accuracy * 100).toFixed(0)}%)`
    ];

    return {
      estimatedMinutes: Math.round(blendedTime),
      confidence: Math.max(statisticalResult.confidence, ruleBasedResult.confidence) * 0.9,
      confidenceInterval: [
        Math.round(Math.min(statisticalResult.confidenceInterval[0], ruleBasedResult.confidenceInterval[0])),
        Math.round(Math.max(statisticalResult.confidenceInterval[1], ruleBasedResult.confidenceInterval[1]))
      ],
      factors,
      basedOn: `adaptive blend of statistical and rule-based`,
      strategy: 'adaptive',
      basedOnTasks: statisticalResult.basedOnTasks
    };
  }

  // ------------------------------------------------------------------------
  // Private Methods - Helper Functions
  // ------------------------------------------------------------------------

  /**
   * Update task type running average
   */
  private updateTaskTypeAverage(taskType: TaskType, time: number): void {
    const current = this.taskTypeAverages.get(taskType);
    
    if (!current) {
      this.taskTypeAverages.set(taskType, { avgTime: time, sampleCount: 1 });
      return;
    }

    // Running average formula: new_avg = old_avg + (new_value - old_avg) / (n + 1)
    const newAvg = current.avgTime + (time - current.avgTime) / (current.sampleCount + 1);
    this.taskTypeAverages.set(taskType, {
      avgTime: newAvg,
      sampleCount: current.sampleCount + 1
    });
  }

  /**
   * Record a prediction for accuracy tracking
   */
  recordPrediction(
    agentId: AgentId,
    predictedTime: number,
    actualTime: number
  ): void {
    let record = this.agentAccuracies.get(agentId);
    
    if (!record) {
      record = {
        agentId,
        totalPredictions: 0,
        accuratePredictions: 0,
        totalError: 0,
        predictions: []
      };
      this.agentAccuracies.set(agentId, record);
    }

    // Add prediction
    record.predictions.push({
      predicted: predictedTime,
      actual: actualTime,
      timestamp: Date.now()
    });

    // Trim to window size
    if (record.predictions.length > this.config.accuracyWindowSize) {
      record.predictions = record.predictions.slice(-this.config.accuracyWindowSize);
    }

    // Update stats
    record.totalPredictions++;
    record.totalError += Math.abs(predictedTime - actualTime);

    // Check if accurate (within 25% of actual)
    const errorRatio = Math.abs(predictedTime - actualTime) / actualTime;
    if (errorRatio <= 0.25) {
      record.accuratePredictions++;
    }
  }

  /**
   * Get statistics for debugging/monitoring
   */
  getStats(): {
    totalAgents: number;
    totalHistories: number;
    overallAccuracy: number;
    taskTypesTracked: number;
  } {
    return {
      totalAgents: this.agentHistories.size,
      totalHistories: Array.from(this.agentHistories.values())
        .reduce((sum, h) => sum + h.tasks.length, 0),
      overallAccuracy: this.getOverallAccuracy(),
      taskTypesTracked: this.taskTypeAverages.size
    };
  }

  /**
   * Clear all history (useful for testing)
   */
  clearHistory(): void {
    this.agentHistories.clear();
    this.agentAccuracies.clear();
    this.taskTypeAverages.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a TimePredictionEngine instance
 */
export function createTimePredictionEngine(
  config?: Partial<TimePredictionConfig>
): TimePredictionEngine {
  return new TimePredictionEngine(config);
}

// ============================================================================
// Default Export
// ============================================================================

export default TimePredictionEngine;
