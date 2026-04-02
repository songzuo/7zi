/**
 * Schedule Decision Model
 * Defines the structure of scheduling decisions made by the system
 */

import { TaskPriority, TaskType } from './task-model'

/**
 * Schedule decision with detailed reasoning
 */
export interface ScheduleDecision {
  /** Task being scheduled */
  taskId: string

  /** Agent assigned to task */
  assignedAgent: string

  /** Confidence in this decision (0-1) */
  confidence: number

  /** Reasoning for the decision */
  reasoning: string

  /** Alternative agents in order of preference */
  alternativeAgents: string[]

  /** Estimated completion timestamp */
  estimatedCompletion: number

  /** Decision timestamp */
  decisionTime: number

  /** Scores used in decision */
  scores: {
    capability: number
    load: number
    performance: number
    response: number
    total: number
  }

  /** Whether this was a manual override */
  manualOverride?: boolean

  /** User who made manual override */
  overrideBy?: string
}

/**
 * Scheduling metrics for tracking performance
 */
export interface SchedulingMetrics {
  /** Total decisions made */
  totalDecisions: number

  /** Automatic decisions */
  automaticDecisions: number

  /** Manual overrides */
  manualOverrides: number

  /** Average confidence */
  averageConfidence: number

  /** Distribution by task type */
  byTaskType: Record<TaskType, number>

  /** Distribution by priority */
  byPriority: Record<TaskPriority, number>

  /** Agent utilization */
  agentUtilization: Record<
    string,
    {
      assigned: number
      completed: number
      failed: number
      averageCompletionTime: number
    }
  >
}

/**
 * Scheduling history for analysis
 */
export class ScheduleHistory {
  private decisions: ScheduleDecision[] = []
  private metrics: SchedulingMetrics

  constructor() {
    this.metrics = this.initializeMetrics()
  }

  /**
   * Add a decision to history
   */
  addDecision(decision: ScheduleDecision): void {
    this.decisions.push(decision)
    this.updateMetrics(decision)
  }

  /**
   * Get decision for a specific task
   */
  getDecision(taskId: string): ScheduleDecision | undefined {
    return this.decisions.find(d => d.taskId === taskId)
  }

  /**
   * Get all decisions
   */
  getAllDecisions(): ScheduleDecision[] {
    return [...this.decisions]
  }

  /**
   * Get decisions by agent
   */
  getAgentDecisions(agentId: string): ScheduleDecision[] {
    return this.decisions.filter(d => d.assignedAgent === agentId)
  }

  /**
   * Get decisions in time range
   */
  getDecisionsInRange(startTime: number, endTime: number): ScheduleDecision[] {
    return this.decisions.filter(d => d.decisionTime >= startTime && d.decisionTime <= endTime)
  }

  /**
   * Get recent decisions
   */
  getRecentDecisions(count: number = 10): ScheduleDecision[] {
    return this.decisions.slice(-count)
  }

  /**
   * Get scheduling metrics
   */
  getMetrics(): SchedulingMetrics {
    return { ...this.metrics }
  }

  /**
   * Update metrics based on new decision
   */
  private updateMetrics(decision: ScheduleDecision): void {
    this.metrics.totalDecisions++

    if (decision.manualOverride) {
      this.metrics.manualOverrides++
    } else {
      this.metrics.automaticDecisions++
    }

    // Update average confidence
    const totalConfidence =
      this.metrics.averageConfidence * (this.decisions.length - 1) + decision.confidence
    this.metrics.averageConfidence = totalConfidence / this.decisions.length

    // Initialize agent metrics if needed
    if (!this.metrics.agentUtilization[decision.assignedAgent]) {
      this.metrics.agentUtilization[decision.assignedAgent] = {
        assigned: 0,
        completed: 0,
        failed: 0,
        averageCompletionTime: 0,
      }
    }

    this.metrics.agentUtilization[decision.assignedAgent].assigned++
  }

  /**
   * Record task completion
   */
  recordCompletion(taskId: string, success: boolean, completionTime: number): void {
    const decision = this.getDecision(taskId)
    if (!decision) return

    const agentMetrics = this.metrics.agentUtilization[decision.assignedAgent]
    if (!agentMetrics) return

    if (success) {
      agentMetrics.completed++
    } else {
      agentMetrics.failed++
    }

    // Update average completion time
    const totalCompleted = agentMetrics.completed + agentMetrics.failed
    const totalTime = agentMetrics.averageCompletionTime * (totalCompleted - 1) + completionTime
    agentMetrics.averageCompletionTime = totalTime / totalCompleted
  }

  /**
   * Clear history
   */
  clear(): void {
    this.decisions = []
    this.metrics = this.initializeMetrics()
  }

  /**
   * Initialize metrics with defaults
   */
  private initializeMetrics(): SchedulingMetrics {
    return {
      totalDecisions: 0,
      automaticDecisions: 0,
      manualOverrides: 0,
      averageConfidence: 0,
      byTaskType: {
        architecture: 0,
        research: 0,
        implementation: 0,
        testing: 0,
        devops: 0,
        design: 0,
        marketing: 0,
        sales: 0,
        finance: 0,
        media: 0,
        general: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
      agentUtilization: {},
    }
  }

  /**
   * Get decision accuracy (decisions where top choice agent completed successfully)
   */
  getAccuracy(): number {
    const completed = this.decisions.filter(d => d.manualOverride !== true)
    if (completed.length === 0) return 0

    // This would need to be tracked separately in a real implementation
    // For now, return the average confidence as a proxy
    return this.metrics.averageConfidence
  }

  /**
   * Get top performing agents
   */
  getTopAgents(count: number = 5): Array<{ agentId: string; score: number }> {
    const agents = Object.entries(this.metrics.agentUtilization)
      .map(([agentId, metrics]) => ({
        agentId,
        score: metrics.completed * 10 - metrics.failed * 20,
      }))
      .sort((a, b) => b.score - a.score)

    return agents.slice(0, count)
  }

  /**
   * Export history to JSON
   */
  export(): string {
    return JSON.stringify(
      {
        decisions: this.decisions,
        metrics: this.metrics,
        exportTime: Date.now(),
      },
      null,
      2
    )
  }

  /**
   * Import history from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json)
      this.decisions = data.decisions || []
      this.metrics = data.metrics || this.initializeMetrics()
    } catch (error) {
      throw new Error('Invalid history data format')
    }
  }
}

/**
 * Create a schedule decision
 */
export function createScheduleDecision(params: {
  taskId: string
  assignedAgent: string
  confidence: number
  reasoning: string
  alternativeAgents: string[]
  estimatedCompletion: number
  scores: {
    capability: number
    load: number
    performance: number
    response: number
    total: number
  }
  manualOverride?: boolean
  overrideBy?: string
}): ScheduleDecision {
  return {
    taskId: params.taskId,
    assignedAgent: params.assignedAgent,
    confidence: params.confidence,
    reasoning: params.reasoning,
    alternativeAgents: params.alternativeAgents,
    estimatedCompletion: params.estimatedCompletion,
    decisionTime: Date.now(),
    scores: params.scores,
    manualOverride: params.manualOverride,
    overrideBy: params.overrideBy,
  }
}
