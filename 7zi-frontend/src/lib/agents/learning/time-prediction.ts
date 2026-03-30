/**
 * Task Completion Time Prediction Model
 *
 * Implements weighted moving average + Bayesian estimation for accurate time prediction
 *
 * @module time-prediction
 */

import type {
  TaskType,
  AgentId,
  PredictionResult,
  TaskFeatures,
} from './types';

/**
 * Historical time record for a specific agent and task type
 */
export interface TimeRecord {
  timestamp: number;
  executionTime: number;
  inputSize?: number;
  agentLoad?: number;
  timeOfDay?: number;
  priority?: string;
}

/**
 * Feature weights for time prediction
 */
export interface FeatureWeights {
  inputSizeWeight: number;    // Input size factor (0-1)
  agentLoadWeight: number;     // Agent load factor (0-1)
  timeOfDayWeight: number;     // Time of day factor (0-1)
  priorityWeight: number;      // Priority factor (0-1)
  queueDepthWeight: number;    // Queue depth factor (0-1)
}

/**
 * Prior knowledge for Bayesian estimation
 */
export interface PriorKnowledge {
  taskType: TaskType;
  meanTime: number;
  variance: number;
  sampleSize: number;
}

/**
 * Configuration for time prediction model
 */
export interface TimePredictionConfig {
  /**
   * Maximum history size per agent/task type
   */
  maxHistorySize: number;

  /**
   * Minimum samples for weighted moving average
   */
  minSamplesForWeightedAvg: number;

  /**
   * Weight decay factor for moving average (0-1)
   * Higher values give more weight to recent data
   */
  weightDecay: number;

  /**
   * Minimum samples for prediction
   */
  minSamplesForPrediction: number;

  /**
   * Default time estimate (ms) when no history available
   */
  defaultEstimate: number;

  /**
   * Feature weights
   */
  featureWeights: FeatureWeights;

  /**
   * Enable Bayesian estimation
   */
  enableBayesian: boolean;
}

/**
 * Task Time Prediction Model
 *
 * Uses weighted moving average and Bayesian estimation to predict
 * task completion time with confidence intervals.
 */
export class TaskTimePredictor {
  private historicalTimes: Map<string, TimeRecord[]> = new Map();
  private priors: Map<TaskType, PriorKnowledge> = new Map();
  private config: TimePredictionConfig;

  constructor(config?: Partial<TimePredictionConfig>) {
    this.config = {
      maxHistorySize: 100,
      minSamplesForWeightedAvg: 3,
      weightDecay: 0.9,
      minSamplesForPrediction: 5,
      defaultEstimate: 5000,
      featureWeights: {
        inputSizeWeight: 0.3,
        agentLoadWeight: 0.25,
        timeOfDayWeight: 0.15,
        priorityWeight: 0.2,
        queueDepthWeight: 0.1,
      },
      enableBayesian: true,
      ...config,
    };
  }

  /**
   * Predict task completion time
   *
   * @param taskFeatures Task features (type, input size, priority, etc.)
   * @param agentId Target agent ID
   * @returns Prediction result with estimated time, confidence, and contributing factors
   */
  predict(taskFeatures: TaskFeatures, agentId: AgentId): PredictionResult {
    const factors: string[] = [];
    let estimatedTime = this.config.defaultEstimate;
    let confidence = 0.2;

    // Key for history lookup
    const key = `${agentId}:${taskFeatures.taskType}`;
    const history = this.historicalTimes.get(key) || [];

    if (history.length >= this.config.minSamplesForPrediction) {
      // Use weighted moving average
      const baseEstimate = this.weightedMovingAverage(history);
      factors.push('weighted_moving_average');
      estimatedTime = baseEstimate;

      // Calculate confidence based on sample size and variance
      confidence = Math.min(0.95, 0.5 + Math.min(1, history.length / 10));

      // Feature adjustment
      const featureAdjustment = this.calculateFeatureAdjustment(taskFeatures, history);
      factors.push(...featureAdjustment.factors);
      estimatedTime *= featureAdjustment.adjustment;

      // Bayesian estimation
      if (this.config.enableBayesian) {
        const prior = this.getPriorKnowledge(taskFeatures.taskType);
        if (prior) {
          const bayesianEstimate = this.bayesianEstimate(estimatedTime, prior);
          factors.push('bayesian_estimation');
          estimatedTime = bayesianEstimate;
        }
      }
    } else if (history.length > 0) {
      // Limited history - use simple average
      const avgTime = this.simpleAverage(history);
      factors.push('simple_average');
      estimatedTime = avgTime;
      confidence = 0.3 + history.length * 0.1;

      // Still apply feature adjustments
      const featureAdjustment = this.calculateFeatureAdjustment(taskFeatures, history);
      factors.push(...featureAdjustment.factors);
      estimatedTime *= featureAdjustment.adjustment;
    } else {
      // No history - use task type prior
      const prior = this.getPriorKnowledge(taskFeatures.taskType);
      if (prior) {
        factors.push('task_type_prior');
        estimatedTime = prior.meanTime;
        confidence = 0.3;
      } else {
        factors.push('default_estimate');
        confidence = 0.1;
      }

      // Apply feature adjustments
      const featureAdjustment = this.calculateFeatureAdjustment(taskFeatures, []);
      factors.push(...featureAdjustment.factors);
      estimatedTime *= featureAdjustment.adjustment;
    }

    return {
      estimatedTime: Math.round(Math.max(100, Math.min(3600000, estimatedTime))),
      confidence: Math.round(confidence * 100) / 100,
      factors,
    };
  }

  /**
   * Update model with completed task
   *
   * @param taskFeatures Task features
   * @param agentId Agent ID
   * @param actualTime Actual execution time (ms)
   * @param inputSize Input size (optional)
   * @param agentLoad Agent load at start (optional)
   */
  update(
    taskFeatures: TaskFeatures,
    agentId: AgentId,
    actualTime: number,
    inputSize?: number,
    agentLoad?: number
  ): void {
    const key = `${agentId}:${taskFeatures.taskType}`;
    let history = this.historicalTimes.get(key) || [];

    const record: TimeRecord = {
      timestamp: Date.now(),
      executionTime: actualTime,
      inputSize,
      agentLoad,
      timeOfDay: taskFeatures.timeOfDay,
      priority: taskFeatures.priority,
    };

    history.push(record);

    // Trim history if too large
    if (history.length > this.config.maxHistorySize) {
      history = history.slice(-this.config.maxHistorySize);
    }

    this.historicalTimes.set(key, history);

    // Update prior knowledge if this is the first record
    if (history.length === 1) {
      this.updatePriorKnowledge(taskFeatures.taskType, actualTime);
    }
  }

  /**
   * Get prediction accuracy
   *
   * Calculates the mean absolute percentage error (MAPE) for recent predictions
   */
  getAccuracy(agentId?: AgentId, taskType?: TaskType): number {
    let totalError = 0;
    let count = 0;

    for (const [key, history] of this.historicalTimes.entries()) {
      if (agentId && !key.startsWith(agentId + ':')) continue;
      if (taskType && !key.endsWith(':' + taskType)) continue;

      if (history.length < 2) continue;

      // Calculate error for recent records
      const recent = history.slice(-10);
      for (let i = 1; i < recent.length; i++) {
        const previousHistory = history.slice(0, i);
        const predicted = this.weightedMovingAverage(previousHistory);
        const actual = recent[i].executionTime;

        const error = Math.abs((actual - predicted) / actual);
        totalError += error;
        count++;
      }
    }

    return count > 0 ? 1 - (totalError / count) : 0;
  }

  /**
   * Set prior knowledge for a task type
   */
  setPriorKnowledge(taskType: TaskType, prior: PriorKnowledge): void {
    this.priors.set(taskType, prior);
  }

  /**
   * Get historical records for an agent and task type
   */
  getHistory(agentId: AgentId, taskType: TaskType): TimeRecord[] {
    const key = `${agentId}:${taskType}`;
    return this.historicalTimes.get(key) || [];
  }

  /**
   * Clear all historical data
   */
  clear(): void {
    this.historicalTimes.clear();
    this.priors.clear();
  }

  /**
   * Weighted moving average calculation
   *
   * More recent records get higher weights using exponential decay
   */
  private weightedMovingAverage(history: TimeRecord[]): number {
    if (history.length === 0) return this.config.defaultEstimate;

    if (history.length < this.config.minSamplesForWeightedAvg) {
      return this.simpleAverage(history);
    }

    // Calculate exponential weights
    const weights: number[] = [];
    for (let i = 0; i < history.length; i++) {
      // Older records get exponentially smaller weights
      const weight = Math.pow(this.config.weightDecay, history.length - 1 - i);
      weights.push(weight);
    }

    // Calculate weighted average
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const weightedSum = history.reduce((sum, record, i) => sum + record.executionTime * weights[i], 0);

    return weightedSum / totalWeight;
  }

  /**
   * Simple arithmetic average
   */
  private simpleAverage(history: TimeRecord[]): number {
    if (history.length === 0) return this.config.defaultEstimate;

    const sum = history.reduce((total, record) => total + record.executionTime, 0);
    return sum / history.length;
  }

  /**
   * Calculate feature-based adjustment factor
   */
  private calculateFeatureAdjustment(
    taskFeatures: TaskFeatures,
    history: TimeRecord[]
  ): { adjustment: number; factors: string[] } {
    const factors: string[] = [];
    let adjustment = 1.0;

    const { featureWeights } = this.config;

    // Input size factor
    if (taskFeatures.inputSize > 0) {
      // Estimate input size impact (assuming baseline is 1M characters)
      const inputFactor = this.estimateInputSizeFactor(taskFeatures.inputSize);
      adjustment = adjustment * (1 + featureWeights.inputSizeWeight * (inputFactor - 1));
      factors.push('input_size_adjustment');
    }

    // Agent load factor
    if (taskFeatures.agentLoad > 0) {
      // Higher load -> longer time
      const loadFactor = 1 + taskFeatures.agentLoad / 2; // 0% load -> 1x, 100% load -> 1.5x
      adjustment = adjustment * (1 + featureWeights.agentLoadWeight * (loadFactor - 1));
      factors.push('agent_load_adjustment');
    }

    // Time of day factor
    if (taskFeatures.timeOfDay >= 0 && taskFeatures.timeOfDay <= 23) {
      const timeFactor = this.getTimeOfDayFactor(taskFeatures.timeOfDay, history);
      adjustment = adjustment * (1 + featureWeights.timeOfDayWeight * (timeFactor - 1));
      factors.push('time_of_day_adjustment');
    }

    // Priority factor
    if (taskFeatures.priority === 'high' || taskFeatures.priority === 'urgent') {
      // High priority tasks might be faster due to resource priority
      // Or slower if they're more complex
      const priorityFactor = 0.9; // Assume 10% faster
      adjustment = adjustment * (1 + featureWeights.priorityWeight * (priorityFactor - 1));
      factors.push('priority_adjustment');
    }

    // Queue depth factor
    if (taskFeatures.queueDepth > 0) {
      const queueFactor = 1 + taskFeatures.queueDepth * 0.05; // Each queued task adds 5%
      adjustment = adjustment * (1 + featureWeights.queueDepthWeight * (queueFactor - 1));
      factors.push('queue_depth_adjustment');
    }

    return { adjustment, factors };
  }

  /**
   * Estimate input size impact factor
   */
  private estimateInputSizeFactor(inputSize: number): number {
    // Baseline: 1M characters
    const baseline = 1000000;

    // Scale factor: log scale to handle wide range
    const scaleFactor = Math.log10(inputSize / baseline + 1) + 1;

    return Math.max(0.1, Math.min(5, scaleFactor)); // Clamp between 0.1x and 5x
  }

  /**
   * Estimate time of day impact factor
   */
  private getTimeOfDayFactor(timeOfDay: number, history: TimeRecord[]): number {
    if (history.length === 0) return 1.0;

    // Calculate average time by time of day from history
    const timeBuckets: Record<number, { total: number; count: number }> = {};

    for (const record of history) {
      if (record.timeOfDay === undefined) continue;

      const hour = Math.floor(record.timeOfDay);
      if (!timeBuckets[hour]) {
        timeBuckets[hour] = { total: 0, count: 0 };
      }
      timeBuckets[hour].total += record.executionTime;
      timeBuckets[hour].count++;
    }

    const currentHour = Math.floor(timeOfDay);
    const bucket = timeBuckets[currentHour];

    if (bucket && bucket.count > 0) {
      const avgTimeInBucket = bucket.total / bucket.count;
      const overallAvg = this.simpleAverage(history);

      // If current hour is slower than average, factor > 1
      return avgTimeInBucket / overallAvg;
    }

    return 1.0;
  }

  /**
   * Get prior knowledge for a task type
   */
  private getPriorKnowledge(taskType: TaskType): PriorKnowledge | null {
    return this.priors.get(taskType) || null;
  }

  /**
   * Update prior knowledge with new data point
   */
  private updatePriorKnowledge(taskType: TaskType, executionTime: number): void {
    let prior = this.priors.get(taskType);

    if (!prior) {
      prior = {
        taskType,
        meanTime: executionTime,
        variance: Math.pow(executionTime * 0.5, 2), // Assume 50% variance
        sampleSize: 1,
      };
    } else {
      // Update prior using Bayesian conjugate (Normal-Inverse Gamma)
      const newMean = (prior.meanTime * prior.sampleSize + executionTime) / (prior.sampleSize + 1);
      const newVariance = (prior.variance * prior.sampleSize + Math.pow(executionTime - prior.meanTime, 2)) / (prior.sampleSize + 1);
      const newSampleSize = prior.sampleSize + 1;

      prior.meanTime = newMean;
      prior.variance = newVariance;
      prior.sampleSize = newSampleSize;
    }

    this.priors.set(taskType, prior);
  }

  /**
   * Bayesian estimation combining likelihood and prior
   */
  private bayesianEstimate(estimate: number, prior: PriorKnowledge): number {
    // Weighted average of estimate and prior
    // More weight to estimate as sample size increases

    // Estimate has implicit weight from history size (not tracked here, using 5 as baseline)
    const estimateWeight = 5;
    const priorWeight = prior.sampleSize;

    const totalWeight = estimateWeight + priorWeight;
    const weightedSum = estimate * estimateWeight + prior.meanTime * priorWeight;

    return weightedSum / totalWeight;
  }

  /**
   * Export model data
   */
  exportData() {
    return {
      historicalTimes: Object.fromEntries(this.historicalTimes),
      priors: Object.fromEntries(this.priors),
      config: this.config,
    };
  }

  /**
   * Import model data
   */
  importData(data: any): void {
    if (data.historicalTimes) {
      this.historicalTimes = new Map(
        Object.entries(data.historicalTimes).map(([k, v]) => [k, Array.from(v as TimeRecord[])])
      );
    }
    if (data.priors) {
      this.priors = new Map(Object.entries(data.priors) as [TaskType, PriorKnowledge][]);
    }
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }
  }
}

/**
 * Singleton instance
 */
export const taskTimePredictor = new TaskTimePredictor();

/**
 * Convenience function to predict task time
 */
export function predictCompletionTime(
  taskFeatures: TaskFeatures,
  agentId: AgentId
): PredictionResult {
  return taskTimePredictor.predict(taskFeatures, agentId);
}

/**
 * Convenience function to update prediction model
 */
export function updatePredictionModel(
  taskFeatures: TaskFeatures,
  agentId: AgentId,
  actualTime: number,
  inputSize?: number,
  agentLoad?: number
): void {
  taskTimePredictor.update(taskFeatures, agentId, actualTime, inputSize, agentLoad);
}
