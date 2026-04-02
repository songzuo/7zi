/**
 * Adaptive Scheduler
 * Self-adjusting task scheduler that uses learning to optimize assignments
 *
 * Features:
 * - Dynamic load balancing based on predicted completion times
 * - Agent weight adjustments based on historical performance
 * - Real-time adaptation to changing conditions
 * - Integration with TimePredictionEngine
 *
 * @module AdaptiveScheduler
 */

import type { TimePrediction } from './time-prediction-engine'
import { TimePredictionEngine, createTimePredictionEngine } from './time-prediction-engine'
import type { TaskType, AgentId } from './types'

// ============================================================================
// Types and Interfaces
// ============================================================================

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskComplexity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Agent score for scheduling decisions
 */
export interface AgentScore {
  total: number
  capability: number
  load: number
  reliability: number
  predictedTime: TimePrediction
  confidence: number
}

/**
 * Agent state for scheduling
 */
export interface AgentState {
  id: AgentId
  name: string
  currentLoad: number // 0-1 scale
  maxCapacity: number // max concurrent tasks
  activeTasks: string[] // current task IDs
  capabilities: TaskType[] // supported task types
  weight: number // scheduling weight (0-2)
  reliability: number // historical reliability (0-1)
  avgResponseTime: number // average response time in minutes
}

/**
 * Task to be scheduled
 */
export interface SchedulableTask {
  id: string
  type: TaskType
  priority: TaskPriority
  complexity: TaskComplexity
  inputSize?: number
  createdAt: number
  dependencies?: string[] // task IDs that must complete first
}

/**
 * Scheduling decision result
 */
export interface SchedulingDecision {
  taskId: string
  assignedAgent: AgentId
  predictedTime: TimePrediction
  confidence: number
  reasoning: string
  alternatives: Array<{
    agentId: AgentId
    score: number
    predictedTime: number
  }>
  decisionTime: number
  loadBalanced: boolean
}

/**
 * Agent weight adjustment
 */
export interface AgentWeightAdjustment {
  agentId: AgentId
  taskType: TaskType
  oldWeight: number
  newWeight: number
  reason: string
  adjustmentTime: number
}

/**
 * Load balancing configuration
 */
export interface LoadBalanceConfig {
  targetUtilization: number // 0-1, target load across agents
  maxImbalance: number // 0-1, max allowed load difference
  rebalanceThreshold: number // 0-1, trigger rebalance when exceeded
  minTasksBeforeRebalance: number
}

/**
 * Adaptive Scheduler configuration
 */
export interface AdaptiveSchedulerConfig {
  /** Time prediction engine config */
  predictionConfig?: Parameters<typeof createTimePredictionEngine>[0]
  /** Load balancing config */
  loadBalance: LoadBalanceConfig
  /** Weight adjustment config */
  weightAdjustment: {
    enabled: boolean
    minSamples: number
    adjustmentRate: number // 0-1, how aggressively to adjust
    maxAdjustment: number // max weight change per adjustment
  }
  /** Scheduling behavior */
  scheduling: {
    preferFasterAgent: boolean
    considerLoad: boolean
    considerReliability: boolean
    usePredictedTime: boolean
    decisionTimeoutMs: number // max time for decision
  }
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AdaptiveSchedulerConfig = {
  loadBalance: {
    targetUtilization: 0.7,
    maxImbalance: 0.3,
    rebalanceThreshold: 0.4,
    minTasksBeforeRebalance: 10,
  },
  weightAdjustment: {
    enabled: true,
    minSamples: 5,
    adjustmentRate: 0.1,
    maxAdjustment: 0.3,
  },
  scheduling: {
    preferFasterAgent: true,
    considerLoad: true,
    considerReliability: true,
    usePredictedTime: true,
    decisionTimeoutMs: 50,
  },
}

// ============================================================================
// Adaptive Scheduler Implementation
// ============================================================================

/**
 * Adaptive Scheduler
 *
 * Makes intelligent scheduling decisions using:
 * 1. Time predictions from TimePredictionEngine
 * 2. Dynamic agent weights based on performance
 * 3. Real-time load balancing
 */
export class AdaptiveScheduler {
  private config: AdaptiveSchedulerConfig
  private timePredictor: TimePredictionEngine
  private agentStates: Map<AgentId, AgentState> = new Map()
  private weightAdjustments: AgentWeightAdjustment[] = []
  private schedulingHistory: Array<{
    decision: SchedulingDecision
    actualTime?: number
    success?: boolean
    completedAt?: number
  }> = []

  constructor(config: Partial<AdaptiveSchedulerConfig> = {}) {
    this.config = this.mergeConfig(config)
    this.timePredictor = createTimePredictionEngine(this.config.predictionConfig)
  }

  /**
   * Schedule a task to the best available agent
   */
  async schedule(task: SchedulableTask): Promise<SchedulingDecision> {
    const startTime = Date.now()

    // Get candidate agents
    const candidates = this.getCandidateAgents(task)

    if (candidates.length === 0) {
      throw new Error(`No agents available for task type: ${task.type}`)
    }

    // Score each candidate
    const scores = await Promise.all(candidates.map(agent => this.scoreAgent(agent, task)))

    // Sort by score (higher is better)
    const ranked = candidates
      .map((agent, i) => ({ agent, score: scores[i] }))
      .sort((a, b) => b.score.total - a.score.total)

    // Select best agent
    const best = ranked[0]
    const alternatives = ranked.slice(1, 4).map(r => ({
      agentId: r.agent.id,
      score: r.score.total,
      predictedTime: r.score.predictedTime.estimatedMinutes,
    }))

    // Create decision
    const decision: SchedulingDecision = {
      taskId: task.id,
      assignedAgent: best.agent.id,
      predictedTime: best.score.predictedTime,
      confidence: best.score.confidence,
      reasoning: this.generateReasoning({ score: best.score }, alternatives),
      alternatives,
      decisionTime: Date.now(),
      loadBalanced: this.isLoadBalanced(ranked),
    }

    // Record decision
    this.schedulingHistory.push({ decision })

    // Update agent load
    this.updateAgentLoad(best.agent.id, 1)

    // Check if we need to adjust weights
    if (this.config.weightAdjustment.enabled) {
      this.checkWeightAdjustments()
    }

    return decision
  }

  /**
   * Record task completion outcome
   */
  recordOutcome(taskId: string, agentId: AgentId, actualTime: number, success: boolean): void {
    // Find the scheduling record
    const record = this.schedulingHistory.find(r => r.decision.taskId === taskId)

    if (record) {
      record.actualTime = actualTime
      record.success = success
      record.completedAt = Date.now()
    }

    // Update agent load
    this.updateAgentLoad(agentId, -1)

    // Update time predictor
    const task = record?.decision
    if (task) {
      this.timePredictor.updateHistory(
        agentId,
        taskId,
        actualTime,
        success,
        this.inferTaskType(taskId),
        this.inferComplexity(task.predictedTime.estimatedMinutes)
      )

      // Record prediction for accuracy tracking
      this.timePredictor['recordPrediction'](
        agentId,
        task.predictedTime.estimatedMinutes,
        actualTime
      )
    }

    // Update agent reliability
    this.updateAgentReliability(agentId, success)

    // Check for weight adjustments
    if (this.config.weightAdjustment.enabled) {
      this.adjustWeightBasedOnPerformance(agentId, success, actualTime)
    }
  }

  /**
   * Register or update an agent
   */
  registerAgent(agent: AgentState): void {
    const existing = this.agentStates.get(agent.id)

    if (existing) {
      // Preserve learned properties
      this.agentStates.set(agent.id, {
        ...agent,
        weight: existing.weight,
        reliability: existing.reliability,
        avgResponseTime: existing.avgResponseTime,
      })
    } else {
      // New agent with defaults
      this.agentStates.set(agent.id, {
        ...agent,
        weight: agent.weight ?? 1.0,
        reliability: agent.reliability ?? 0.8,
        avgResponseTime: agent.avgResponseTime ?? 15,
      })
    }
  }

  /**
   * Remove an agent
   */
  removeAgent(agentId: AgentId): void {
    this.agentStates.delete(agentId)
  }

  /**
   * Get current load balance status
   */
  getLoadBalance(): {
    agents: Array<{ id: AgentId; load: number; tasks: number }>
    average: number
    max: number
    min: number
    imbalance: number
    isBalanced: boolean
  } {
    const agents = Array.from(this.agentStates.values()).map(a => ({
      id: a.id,
      load: a.currentLoad,
      tasks: a.activeTasks.length,
    }))

    if (agents.length === 0) {
      return {
        agents: [],
        average: 0,
        max: 0,
        min: 0,
        imbalance: 0,
        isBalanced: true,
      }
    }

    const loads = agents.map(a => a.load)
    const average = loads.reduce((s, l) => s + l, 0) / loads.length
    const max = Math.max(...loads)
    const min = Math.min(...loads)
    const imbalance = average > 0 ? (max - min) / average : 0

    return {
      agents,
      average,
      max,
      min,
      imbalance,
      isBalanced: imbalance <= this.config.loadBalance.maxImbalance,
    }
  }

  /**
   * Get agent weight adjustments
   */
  getWeightAdjustments(): AgentWeightAdjustment[] {
    return [...this.weightAdjustments]
  }

  /**
   * Get scheduling statistics
   */
  getStats(): {
    totalScheduled: number
    successRate: number
    avgPredictedTime: number
    avgActualTime: number
    predictionAccuracy: number
    loadBalanceScore: number
    topAgents: Array<{ agentId: AgentId; tasks: number; successRate: number }>
  } {
    const completed = this.schedulingHistory.filter(r => r.success !== undefined)

    if (completed.length === 0) {
      return {
        totalScheduled: this.schedulingHistory.length,
        successRate: 0,
        avgPredictedTime: 0,
        avgActualTime: 0,
        predictionAccuracy: 0,
        loadBalanceScore: 1,
        topAgents: [],
      }
    }

    const successes = completed.filter(r => r.success)
    const avgPredicted =
      completed.reduce((s, r) => s + r.decision.predictedTime.estimatedMinutes, 0) /
      completed.length
    const avgActual = completed.reduce((s, r) => s + (r.actualTime ?? 0), 0) / completed.length

    // Calculate prediction accuracy (within 25% of actual)
    const accurate = completed.filter(r => {
      const predicted = r.decision.predictedTime.estimatedMinutes
      const actual = r.actualTime ?? 0
      if (actual === 0) return false
      return Math.abs(predicted - actual) / actual <= 0.25
    })
    const predictionAccuracy = accurate.length / completed.length

    // Load balance score
    const lb = this.getLoadBalance()
    const loadBalanceScore = 1 - Math.min(1, lb.imbalance)

    // Top agents by task count and success rate
    const agentStats = new Map<AgentId, { tasks: number; successes: number }>()
    for (const r of completed) {
      const agentId = r.decision.assignedAgent
      const stats = agentStats.get(agentId) ?? { tasks: 0, successes: 0 }
      stats.tasks++
      if (r.success) stats.successes++
      agentStats.set(agentId, stats)
    }

    const topAgents = Array.from(agentStats.entries())
      .map(([agentId, stats]) => ({
        agentId,
        tasks: stats.tasks,
        successRate: stats.successes / stats.tasks,
      }))
      .sort((a, b) => b.tasks - a.tasks)
      .slice(0, 5)

    return {
      totalScheduled: this.schedulingHistory.length,
      successRate: successes.length / completed.length,
      avgPredictedTime: avgPredicted,
      avgActualTime: avgActual,
      predictionAccuracy,
      loadBalanceScore,
      topAgents,
    }
  }

  /**
   * Get time prediction engine for direct access
   */
  getTimePredictor(): TimePredictionEngine {
    return this.timePredictor
  }

  // ------------------------------------------------------------------------
  // Private Methods - Scoring and Selection
  // ------------------------------------------------------------------------

  /**
   * Get candidate agents for a task
   */
  private getCandidateAgents(task: SchedulableTask): AgentState[] {
    return Array.from(this.agentStates.values()).filter(agent => {
      // Check capabilities
      if (!agent.capabilities.includes(task.type)) {
        return false
      }
      // Check capacity
      if (agent.activeTasks.length >= agent.maxCapacity) {
        return false
      }
      return true
    })
  }

  /**
   * Score an agent for a specific task
   */
  private async scoreAgent(agent: AgentState, task: SchedulableTask): Promise<AgentScore> {
    // Get time prediction
    const predictedTime = await this.timePredictor.predict({
      agentId: agent.id,
      taskType: task.type,
      taskComplexity: task.complexity,
      historicalData: {
        avgCompletionTime: agent.avgResponseTime,
        successRate: agent.reliability,
        agentReliability: agent.reliability,
      },
    })

    // Calculate scores (0-1 scale, higher is better)

    // Capability score (based on weight)
    const capability = Math.min(1, agent.weight)

    // Load score (inverse - lower load is better)
    const load = 1 - agent.currentLoad

    // Reliability score
    const reliability = agent.reliability

    // Time score (inverse - faster is better, normalized)
    const maxTime = 120 // 2 hours max expected
    const timeScore = Math.max(0, 1 - predictedTime.estimatedMinutes / maxTime)

    // Combined score with weights
    const capabilityScore = this.config.scheduling.preferFasterAgent
      ? capability * 0.3
      : capability * 0.4
    const loadScore = this.config.scheduling.considerLoad ? load * 0.3 : 0
    const reliabilityScore = this.config.scheduling.considerReliability ? reliability * 0.2 : 0
    const timeWeight = this.config.scheduling.usePredictedTime ? 0.2 : 0

    // Total score
    const total = capabilityScore + loadScore + reliabilityScore + timeScore * timeWeight

    return {
      capability: capabilityScore,
      load: loadScore,
      reliability: reliabilityScore,
      total,
      predictedTime,
      confidence: predictedTime.confidence,
    }
  }

  /**
   * Generate reasoning for the decision
   */
  private generateReasoning(
    best: { score: AgentScore },
    alternatives: SchedulingDecision['alternatives']
  ): string {
    const reasons: string[] = []

    if (best.score.capability > 0.8) {
      reasons.push('high capability match')
    }
    if (best.score.load > 0.7) {
      reasons.push('low current load')
    }
    if (best.score.reliability > 0.85) {
      reasons.push('excellent reliability')
    }
    if (best.score.predictedTime.confidence > 0.8) {
      reasons.push('high prediction confidence')
    }

    if (alternatives.length > 0) {
      const timeDiff = best.score.predictedTime.estimatedMinutes - alternatives[0].predictedTime
      if (timeDiff < -5) {
        reasons.push(`~${Math.abs(timeDiff).toFixed(0)} min faster than alternatives`)
      }
    }

    if (reasons.length === 0) {
      reasons.push('best available option')
    }

    return reasons.join(', ')
  }

  /**
   * Check if current distribution is load balanced
   */
  private isLoadBalanced(ranked: Array<{ agent: AgentState; score: { total: number } }>): boolean {
    if (ranked.length <= 1) return true

    const loads = ranked.map(r => r.agent.currentLoad)
    const max = Math.max(...loads)
    const min = Math.min(...loads)

    return max - min <= this.config.loadBalance.maxImbalance
  }

  // ------------------------------------------------------------------------
  // Private Methods - Load and Weight Management
  // ------------------------------------------------------------------------

  /**
   * Update agent load after assignment/completion
   */
  private updateAgentLoad(agentId: AgentId, delta: number): void {
    const agent = this.agentStates.get(agentId)
    if (!agent) return

    const taskCount = agent.activeTasks.length + delta
    agent.activeTasks =
      delta > 0
        ? [...agent.activeTasks, 'task-' + Date.now()] // placeholder
        : agent.activeTasks.slice(0, -1)

    agent.currentLoad = Math.max(0, Math.min(1, taskCount / agent.maxCapacity))
  }

  /**
   * Update agent reliability based on outcome
   */
  private updateAgentReliability(agentId: AgentId, success: boolean): void {
    const agent = this.agentStates.get(agentId)
    if (!agent) return

    // Exponential moving average
    const alpha = 0.1
    agent.reliability = agent.reliability * (1 - alpha) + (success ? 1 : 0) * alpha
  }

  /**
   * Adjust agent weight based on performance
   */
  private adjustWeightBasedOnPerformance(
    agentId: AgentId,
    success: boolean,
    actualTime: number
  ): void {
    const agent = this.agentStates.get(agentId)
    if (!agent) return

    const history = this.schedulingHistory
      .filter(r => r.decision.assignedAgent === agentId && r.success !== undefined)
      .slice(-this.config.weightAdjustment.minSamples)

    if (history.length < this.config.weightAdjustment.minSamples) {
      return
    }

    // Calculate recent success rate
    const recentSuccessRate = history.filter(h => h.success).length / history.length

    // Calculate recent time performance
    const avgPredicted =
      history.reduce((s, h) => s + h.decision.predictedTime.estimatedMinutes, 0) / history.length
    const avgActual = history.reduce((s, h) => s + (h.actualTime ?? 0), 0) / history.length
    const timeRatio = avgActual / avgPredicted

    // Determine weight adjustment
    let adjustment = 0
    let reason = ''

    if (recentSuccessRate < 0.7) {
      // Poor success rate - reduce weight
      adjustment = -this.config.weightAdjustment.adjustmentRate
      reason = `Low success rate: ${(recentSuccessRate * 100).toFixed(0)}%`
    } else if (timeRatio > 1.3) {
      // Consistently slower than predicted - reduce weight
      adjustment = -this.config.weightAdjustment.adjustmentRate * 0.5
      reason = `Slower than predicted: ${timeRatio.toFixed(1)}x`
    } else if (recentSuccessRate > 0.9 && timeRatio < 1.1) {
      // Excellent performance - increase weight
      adjustment = this.config.weightAdjustment.adjustmentRate
      reason = `Excellent performance: ${(recentSuccessRate * 100).toFixed(0)}% success, on-time`
    }

    if (adjustment !== 0) {
      const clampedAdjustment = Math.max(
        -this.config.weightAdjustment.maxAdjustment,
        Math.min(this.config.weightAdjustment.maxAdjustment, adjustment)
      )

      const oldWeight = agent.weight
      agent.weight = Math.max(0.1, Math.min(2.0, agent.weight + clampedAdjustment))

      this.weightAdjustments.push({
        agentId,
        taskType: 'general', // Would be task-specific in full implementation
        oldWeight,
        newWeight: agent.weight,
        reason,
        adjustmentTime: Date.now(),
      })

      // Trim history
      if (this.weightAdjustments.length > 100) {
        this.weightAdjustments = this.weightAdjustments.slice(-100)
      }
    }
  }

  /**
   * Check if weight adjustments are needed
   */
  private checkWeightAdjustments(): void {
    const lb = this.getLoadBalance()

    // If load is very imbalanced, we might need to adjust weights
    if (lb.imbalance > this.config.loadBalance.rebalanceThreshold) {
      // Find overloaded agents
      const overloaded = lb.agents.filter(a => a.load > this.config.loadBalance.targetUtilization)
      const underloaded = lb.agents.filter(
        a => a.load < this.config.loadBalance.targetUtilization * 0.5
      )

      // Slightly reduce weight of overloaded agents
      for (const agent of overloaded) {
        const state = this.agentStates.get(agent.id)
        if (state && state.weight > 0.5) {
          state.weight *= 0.95
        }
      }

      // Slightly increase weight of underloaded agents
      for (const agent of underloaded) {
        const state = this.agentStates.get(agent.id)
        if (state && state.weight < 1.5) {
          state.weight *= 1.05
        }
      }
    }
  }

  // ------------------------------------------------------------------------
  // Private Methods - Helpers
  // ------------------------------------------------------------------------

  /**
   * Merge provided config with defaults
   */
  private mergeConfig(config: Partial<AdaptiveSchedulerConfig>): AdaptiveSchedulerConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      loadBalance: {
        ...DEFAULT_CONFIG.loadBalance,
        ...config.loadBalance,
      },
      weightAdjustment: {
        ...DEFAULT_CONFIG.weightAdjustment,
        ...config.weightAdjustment,
      },
      scheduling: {
        ...DEFAULT_CONFIG.scheduling,
        ...config.scheduling,
      },
    }
  }

  /**
   * Infer task type from task ID (placeholder)
   */
  private inferTaskType(taskId: string): TaskType {
    // In real implementation, this would come from task metadata
    return 'general'
  }

  /**
   * Infer complexity from predicted time
   */
  private inferComplexity(minutes: number): TaskComplexity {
    if (minutes < 10) return 'low'
    if (minutes < 30) return 'medium'
    if (minutes < 60) return 'high'
    return 'critical'
  }

  /**
   * Clear all history (for testing)
   */
  clearHistory(): void {
    this.schedulingHistory = []
    this.weightAdjustments = []
    this.timePredictor.clearHistory()
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an AdaptiveScheduler instance
 */
export function createAdaptiveScheduler(
  config?: Partial<AdaptiveSchedulerConfig>
): AdaptiveScheduler {
  return new AdaptiveScheduler(config)
}

// ============================================================================
// Default Export
// ============================================================================

export default AdaptiveScheduler
