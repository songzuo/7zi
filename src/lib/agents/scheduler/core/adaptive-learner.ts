/**
 * Adaptive Learner System
 * Self-improving scheduler that learns from historical performance
 */

import { AgentCapability } from '../models/agent-capability';
import { Task, TaskType, TaskPriority } from '../models/task-model';
import { ScheduleDecision } from '../models/schedule-decision';

/**
 * Learning metrics for tracking agent performance over time
 */
export interface AgentLearningMetrics {
  /** Agent ID */
  agentId: string;

  /** Total tasks assigned */
  totalAssigned: number;

  /** Total tasks completed */
  totalCompleted: number;

  /** Total tasks failed */
  totalFailed: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Average completion time in minutes */
  avgCompletionTime: number;

  /** Performance by task type */
  byTaskType: Record<TaskType, {
    assigned: number;
    completed: number;
    failed: number;
    avgTime: number;
    successRate: number;
  }>;

  /** Performance by priority */
  byPriority: Record<TaskPriority, {
    assigned: number;
    completed: number;
    failed: number;
    avgTime: number;
    successRate: number;
  }>;

  /** Confidence score based on historical performance (0-1) */
  confidence: number;

  /** Learning trend (improving, stable, declining) */
  trend: 'improving' | 'stable' | 'declining';

  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Weight adjustment suggestion
 */
export interface WeightAdjustment {
  /** Agent ID */
  agentId: string;

  /** Task type this adjustment applies to */
  taskType: TaskType;

  /** Current weight */
  currentWeight: number;

  /** Suggested weight */
  suggestedWeight: number;

  /** Reason for adjustment */
  reason: string;

  /** Confidence in this suggestion (0-1) */
  confidence: number;
}

/**
 * Learning configuration
 */
export interface LearningConfig {
  /** Minimum tasks required before learning starts */
  minTasksForLearning: number;

  /** Weight adjustment factor (0-1, how aggressively to adjust) */
  adjustmentFactor: number;

  /** Trend window size (number of recent tasks to analyze) */
  trendWindow: number;

  /** Enable automatic weight updates */
  autoUpdateWeights: boolean;

  /** Enable persistent storage */
  enablePersistence: boolean;

  /** Persistence file path */
  persistencePath?: string;
}

/**
 * Default learning configuration
 */
const DEFAULT_CONFIG: LearningConfig = {
  minTasksForLearning: 5,
  adjustmentFactor: 0.3,
  trendWindow: 10,
  autoUpdateWeights: true,
  enablePersistence: true,
  persistencePath: '/tmp/scheduler-learning.json'
};

/**
 * Adaptive Learner for self-improving scheduler
 */
export class AdaptiveLearner {
  private metrics: Map<string, AgentLearningMetrics>;
  private decisionHistory: Array<{
    decision: ScheduleDecision;
    success: boolean;
    completionTime: number;
    timestamp: number;
  }>;
  private config: LearningConfig;
  private weightCache: Map<string, Map<TaskType, number>>;

  constructor(config?: Partial<LearningConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = new Map();
    this.decisionHistory = [];
    this.weightCache = new Map();

    // Load persistent data if enabled
    if (this.config.enablePersistence && this.config.persistencePath) {
      this.loadFromDisk();
    }
  }

  /**
   * Record a scheduling decision outcome
   */
  recordDecision(
    decision: ScheduleDecision,
    success: boolean,
    completionTime: number
  ): void {
    const record = {
      decision,
      success,
      completionTime,
      timestamp: Date.now()
    };

    this.decisionHistory.push(record);

    // Update agent metrics
    this.updateAgentMetrics(decision.assignedAgent, decision, success, completionTime);

    // Trim history if too large
    if (this.decisionHistory.length > 1000) {
      this.decisionHistory = this.decisionHistory.slice(-1000);
    }

    // Persist if enabled
    if (this.config.enablePersistence) {
      this.saveToDisk();
    }
  }

  /**
   * Update metrics for an agent
   */
  private updateAgentMetrics(
    agentId: string,
    decision: ScheduleDecision,
    success: boolean,
    completionTime: number
  ): void {
    let metrics = this.metrics.get(agentId);

    if (!metrics) {
      metrics = this.initializeMetrics(agentId);
      this.metrics.set(agentId, metrics);
    }

    // Update totals
    metrics.totalAssigned++;
    if (success) {
      metrics.totalCompleted++;
    } else {
      metrics.totalFailed++;
    }

    // Update average completion time
    const completedCount = metrics.totalCompleted + metrics.totalFailed;
    const totalTime = metrics.avgCompletionTime * (completedCount - 1) + completionTime;
    metrics.avgCompletionTime = totalTime / completedCount;

    // Update success rate
    metrics.successRate = metrics.totalCompleted / metrics.totalAssigned;

    // Update by task type
    const taskType = this.inferTaskType(decision.taskId);

    if (!metrics.byTaskType[taskType]) {
      metrics.byTaskType[taskType] = {
        assigned: 0,
        completed: 0,
        failed: 0,
        avgTime: 0,
        successRate: 0
      };
    }

    const typeMetrics = metrics.byTaskType[taskType];
    typeMetrics.assigned++;
    if (success) {
      typeMetrics.completed++;
    } else {
      typeMetrics.failed++;
    }

    const typeCompleted = typeMetrics.completed + typeMetrics.failed;
    typeMetrics.avgTime = (typeMetrics.avgTime * (typeCompleted - 1) + completionTime) / typeCompleted;
    typeMetrics.successRate = typeMetrics.completed / typeMetrics.assigned;

    // Update by priority
    // Note: Priority would need to be tracked separately in the decision
    // For now, we'll skip priority-specific metrics

    // Update trend
    metrics.trend = this.calculateTrend(agentId);

    // Update confidence
    metrics.confidence = this.calculateConfidence(metrics);

    metrics.lastUpdated = Date.now();
  }

  /**
   * Initialize metrics for a new agent
   */
  private initializeMetrics(agentId: string): AgentLearningMetrics {
    return {
      agentId,
      totalAssigned: 0,
      totalCompleted: 0,
      totalFailed: 0,
      successRate: 0,
      avgCompletionTime: 0,
      byTaskType: {} as Record<TaskType, {
        assigned: number;
        completed: number;
        failed: number;
        avgTime: number;
        successRate: number;
      }>,
      byPriority: {
        low: { assigned: 0, completed: 0, failed: 0, avgTime: 0, successRate: 0 },
        medium: { assigned: 0, completed: 0, failed: 0, avgTime: 0, successRate: 0 },
        high: { assigned: 0, completed: 0, failed: 0, avgTime: 0, successRate: 0 },
        urgent: { assigned: 0, completed: 0, failed: 0, avgTime: 0, successRate: 0 }
      },
      confidence: 0.5, // Start neutral
      trend: 'stable',
      lastUpdated: Date.now()
    };
  }

  /**
   * Infer task type from task ID (heuristic)
   */
  private inferTaskType(taskId: string): TaskType {
    // Check if decision contains task type info (would need to be passed separately)
    // For now, try to infer from task ID patterns
    const typeMap: Record<string, TaskType> = {
      'arch': 'architecture',
      'architect': 'architecture',
      'impl': 'implementation',
      'test': 'testing',
      'design': 'design',
      'devops': 'devops',
      'research': 'research',
      'finance': 'finance',
      'media': 'media',
      'marketing': 'marketing',
      'sales': 'sales'
    };

    for (const [prefix, type] of Object.entries(typeMap)) {
      if (taskId.toLowerCase().includes(prefix)) {
        return type;
      }
    }

    return 'general';
  }

  /**
   * Calculate performance trend
   */
  private calculateTrend(agentId: string): 'improving' | 'stable' | 'declining' {
    const recent = this.decisionHistory
      .filter(r => r.decision.assignedAgent === agentId)
      .slice(-this.config.trendWindow);

    if (recent.length < 3) {
      return 'stable';
    }

    // Calculate success rate in first half vs second half
    const mid = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(0, mid);
    const secondHalf = recent.slice(mid);

    const firstSuccessRate = firstHalf.filter(r => r.success).length / firstHalf.length;
    const secondSuccessRate = secondHalf.filter(r => r.success).length / secondHalf.length;

    const diff = secondSuccessRate - firstSuccessRate;

    if (diff > 0.1) {
      return 'improving';
    } else if (diff < -0.1) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate confidence based on metrics
   */
  private calculateConfidence(metrics: AgentLearningMetrics): number {
    // Base confidence on number of completed tasks
    const volumeFactor = Math.min(1, metrics.totalAssigned / this.config.minTasksForLearning);

    // Adjust based on success rate
    const successFactor = metrics.successRate;

    // Adjust based on trend
    const trendFactor = {
      'improving': 1.1,
      'stable': 1.0,
      'declining': 0.9
    }[metrics.trend];

    // Combine factors
    let confidence = volumeFactor * successFactor * trendFactor;
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get suggested weight adjustments
   */
  getWeightAdjustments(
    agents: Map<string, AgentCapability>
  ): WeightAdjustment[] {
    const adjustments: WeightAdjustment[] = [];

    for (const [agentId, agent] of agents.entries()) {
      const metrics = this.metrics.get(agentId);

      if (!metrics || metrics.totalAssigned < this.config.minTasksForLearning) {
        continue;
      }

      // Check each task type
      for (const taskType of agent.capabilities.taskTypes) {
        const typeMetrics = metrics.byTaskType[taskType];

        if (!typeMetrics || typeMetrics.assigned < 3) {
          continue;
        }

        // Calculate suggested weight
        const suggestedWeight = this.calculateSuggestedWeight(
          agentId,
          taskType,
          metrics,
          typeMetrics
        );

        // Only suggest if significant difference
        const currentWeight = 1.0; // Default weight
        if (Math.abs(suggestedWeight - currentWeight) > 0.1) {
          adjustments.push({
            agentId,
            taskType,
            currentWeight,
            suggestedWeight,
            reason: this.generateAdjustmentReason(metrics, typeMetrics, suggestedWeight),
            confidence: metrics.confidence
          });
        }
      }
    }

    return adjustments.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate suggested weight for agent-task combination
   */
  private calculateSuggestedWeight(
    agentId: string,
    taskType: TaskType,
    metrics: AgentLearningMetrics,
    typeMetrics: {
      assigned: number;
      completed: number;
      failed: number;
      avgTime: number;
      successRate: number;
    }
  ): number {
    // Base weight on success rate
    let weight = typeMetrics.successRate;

    // Boost for good trend
    if (metrics.trend === 'improving') {
      weight *= 1.2;
    } else if (metrics.trend === 'declining') {
      weight *= 0.8;
    }

    // Consider confidence
    weight *= (0.5 + metrics.confidence * 0.5);

    // Apply adjustment factor (make changes gradual)
    weight = 1.0 + (weight - 1.0) * this.config.adjustmentFactor;

    return Math.max(0.1, Math.min(2.0, weight));
  }

  /**
   * Generate reason for weight adjustment
   */
  private generateAdjustmentReason(
    metrics: AgentLearningMetrics,
    typeMetrics: any,
    suggestedWeight: number
  ): string {
    const reasons: string[] = [];

    if (typeMetrics.successRate > 0.9) {
      reasons.push('Excellent success rate');
    } else if (typeMetrics.successRate < 0.7) {
      reasons.push('Below-average success rate');
    }

    if (metrics.trend === 'improving') {
      reasons.push('Performance trending up');
    } else if (metrics.trend === 'declining') {
      reasons.push('Performance trending down');
    }

    if (typeMetrics.assigned > 10) {
      reasons.push('Good sample size');
    }

    if (suggestedWeight > 1.0) {
      reasons.push('Recommend increasing priority');
    } else {
      reasons.push('Recommend decreasing priority');
    }

    return reasons.join('; ');
  }

  /**
   * Get optimized scoring weights for matching
   */
  getOptimizedWeights(
    taskType: TaskType,
    agents: Map<string, AgentCapability>
  ): {
    capability: number;
    load: number;
    performance: number;
    response: number;
  } | null {
    // Collect all agents that can handle this task type
    const relevantAgents = Array.from(agents.values())
      .filter(a => a.capabilities.taskTypes.includes(taskType));

    if (relevantAgents.length === 0) {
      return null;
    }

    // Calculate average performance for this task type
    let totalSuccessRate = 0;
    let totalConfidence = 0;
    let count = 0;

    for (const agent of relevantAgents) {
      const metrics = this.metrics.get(agent.agentId);
      if (metrics && metrics.totalAssigned >= this.config.minTasksForLearning) {
        const typeMetrics = metrics.byTaskType[taskType];
        if (typeMetrics && typeMetrics.assigned >= 3) {
          totalSuccessRate += typeMetrics.successRate;
          totalConfidence += metrics.confidence;
          count++;
        }
      }
    }

    if (count === 0) {
      return null; // Not enough data
    }

    const avgSuccessRate = totalSuccessRate / count;
    const avgConfidence = totalConfidence / count;

    // Adjust weights based on learned patterns
    // If success rates are generally high, trust capability matching more
    // If success rates vary, prioritize proven performance

    const baseWeights = {
      capability: 0.4,
      load: 0.3,
      performance: 0.2,
      response: 0.1
    };

    if (avgSuccessRate > 0.9 && avgConfidence > 0.8) {
      // High performance scenario: trust capabilities
      return {
        capability: 0.5,
        load: 0.25,
        performance: 0.15,
        response: 0.1
      };
    } else if (avgSuccessRate < 0.7 || avgConfidence < 0.6) {
      // Low confidence scenario: prioritize proven performance
      return {
        capability: 0.25,
        load: 0.25,
        performance: 0.4,
        response: 0.1
      };
    } else {
      // Mixed scenario: balanced approach
      return baseWeights;
    }
  }

  /**
   * Get metrics for an agent
   */
  getAgentMetrics(agentId: string): AgentLearningMetrics | undefined {
    return this.metrics.get(agentId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, AgentLearningMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get learning summary
   */
  getSummary(): {
    totalAgents: number;
    totalDecisions: number;
    averageSuccessRate: number;
    agentsWithLearningData: number;
    topPerformers: Array<{ agentId: string; score: number }>;
    learningEnabled: boolean;
  } {
    let totalSuccessRate = 0;
    let agentsWithData = 0;
    const agentScores: Array<{ agentId: string; score: number }> = [];

    for (const [agentId, metrics] of this.metrics.entries()) {
      if (metrics.totalAssigned >= this.config.minTasksForLearning) {
        totalSuccessRate += metrics.successRate;
        agentsWithData++;

        agentScores.push({
          agentId,
          score: metrics.successRate * metrics.confidence
        });
      }
    }

    agentScores.sort((a, b) => b.score - a.score);

    return {
      totalAgents: this.metrics.size,
      totalDecisions: this.decisionHistory.length,
      averageSuccessRate: agentsWithData > 0 ? totalSuccessRate / agentsWithData : 0,
      agentsWithLearningData: agentsWithData,
      topPerformers: agentScores.slice(0, 5),
      learningEnabled: this.config.autoUpdateWeights
    };
  }

  /**
   * Apply weight adjustments to the cache
   */
  applyWeightAdjustments(adjustments: WeightAdjustment[]): void {
    for (const adj of adjustments) {
      let agentWeights = this.weightCache.get(adj.agentId);
      if (!agentWeights) {
        agentWeights = new Map();
        this.weightCache.set(adj.agentId, agentWeights);
      }
      agentWeights.set(adj.taskType, adj.suggestedWeight);
    }
  }

  /**
   * Get cached weight for agent-task combination
   */
  getCachedWeight(agentId: string, taskType: TaskType): number | undefined {
    const agentWeights = this.weightCache.get(agentId);
    return agentWeights?.get(taskType);
  }

  /**
   * Clear all learning data
   */
  clear(): void {
    this.metrics.clear();
    this.decisionHistory = [];
    this.weightCache.clear();

    if (this.config.enablePersistence) {
      this.saveToDisk();
    }
  }

  /**
   * Save learning data to disk
   */
  private saveToDisk(): void {
    if (!this.config.persistencePath) {
      return;
    }

    try {
      const data = {
        metrics: Array.from(this.metrics.entries()),
        decisionHistory: this.decisionHistory.slice(-500), // Keep last 500
        weightCache: Array.from(this.weightCache.entries()).map(([agentId, weights]) => [
          agentId,
          Array.from(weights.entries())
        ]),
        savedAt: Date.now()
      };

      // In a real implementation, this would write to file
      // For now, we'll just log
      console.log('[AdaptiveLearner] Data ready for persistence');
    } catch (error) {
      console.error('[AdaptiveLearner] Failed to save data:', error);
    }
  }

  /**
   * Load learning data from disk
   */
  private loadFromDisk(): void {
    if (!this.config.persistencePath) {
      return;
    }

    try {
      // In a real implementation, this would read from file
      // For now, we'll just log
      console.log('[AdaptiveLearner] Ready to load from disk');
    } catch (error) {
      console.error('[AdaptiveLearner] Failed to load data:', error);
    }
  }

  /**
   * Export learning data as JSON
   */
  exportData(): string {
    return JSON.stringify({
      metrics: Array.from(this.metrics.entries()),
      decisionHistory: this.decisionHistory,
      weightCache: Array.from(this.weightCache.entries()).map(([agentId, weights]) => [
        agentId,
        Array.from(weights.entries())
      ]),
      exportTime: Date.now()
    }, null, 2);
  }

  /**
   * Update learning configuration
   */
  updateConfig(config: Partial<LearningConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LearningConfig {
    return { ...this.config };
  }
}
