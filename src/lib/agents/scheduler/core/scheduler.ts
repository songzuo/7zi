/**
 * Agent Scheduler Core
 * Main orchestrator for AI agent task scheduling
 */

import { AgentCapability, initializeAgents } from '../models/agent-capability'
import { Task, TaskQueue, createTask } from '../models/task-model'
import {
  ScheduleDecision,
  ScheduleHistory,
  createScheduleDecision,
} from '../models/schedule-decision'
import { TaskMatcher } from './matching'
import { TaskRanker } from './ranking'
import { LoadBalancer, LoadBalanceConfig } from './load-balancer'
import { AdaptiveLearner, LearningConfig } from './adaptive-learner'

// Re-export types for convenience
export type { ScheduleDecision, ScheduleHistory } from '../models/schedule-decision'

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  /** Enable automatic scheduling */
  autoSchedule: boolean

  /** Enable manual override */
  allowManualOverride: boolean

  /** Maximum tasks to schedule per batch */
  maxBatchSize: number

  /** Scheduling interval in milliseconds */
  schedulingInterval: number

  /** Load balancing configuration */
  loadBalance: LoadBalanceConfig

  /** Weights for agent scoring */
  scoringWeights?: {
    capability?: number
    load?: number
    performance?: number
    response?: number
  }

  /** Learning system configuration */
  learning?: LearningConfig

  /** Enable adaptive learning */
  enableLearning?: boolean
}

/**
 * Default scheduler configuration
 */
const DEFAULT_CONFIG: SchedulerConfig = {
  autoSchedule: true,
  allowManualOverride: true,
  maxBatchSize: 10,
  schedulingInterval: 30000, // 30 seconds
  loadBalance: {
    maxLoadThreshold: 90,
    busyThreshold: 70,
    preferLowLoad: true,
    considerSpecialization: true,
  },
  enableLearning: true,
}

/**
 * Scheduling result
 */
export interface SchedulingResult {
  success: boolean
  scheduled: ScheduleDecision[]
  failed: Array<{ taskId: string; reason: string }>
  stats: {
    totalPending: number
    totalScheduled: number
    totalFailed: number
  }
}

/**
 * Main Agent Scheduler
 */
export class AgentScheduler {
  private agents: Map<string, AgentCapability>
  private taskQueue: TaskQueue
  private scheduleHistory: ScheduleHistory
  private taskMatcher: TaskMatcher
  private taskRanker: TaskRanker
  private loadBalancer: LoadBalancer
  private config: SchedulerConfig
  private schedulingIntervalId?: NodeJS.Timeout
  private learner: AdaptiveLearner

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.agents = initializeAgents()
    this.taskQueue = new TaskQueue()
    this.scheduleHistory = new ScheduleHistory()
    this.taskMatcher = new TaskMatcher()
    this.taskRanker = new TaskRanker()
    this.loadBalancer = new LoadBalancer(this.config.loadBalance)
    this.learner = new AdaptiveLearner(this.config.learning)
  }

  /**
   * Initialize the scheduler
   */
  initialize(): void {
    if (this.config.autoSchedule) {
      this.startAutoScheduling()
    }
  }

  /**
   * Shutdown the scheduler
   */
  shutdown(): void {
    this.stopAutoScheduling()
  }

  /**
   * Start automatic scheduling
   */
  private startAutoScheduling(): void {
    if (this.schedulingIntervalId) {
      clearInterval(this.schedulingIntervalId)
    }

    this.schedulingIntervalId = setInterval(() => {
      this.scheduleNextBatch()
    }, this.config.schedulingInterval)
  }

  /**
   * Stop automatic scheduling
   */
  private stopAutoScheduling(): void {
    if (this.schedulingIntervalId) {
      clearInterval(this.schedulingIntervalId)
      this.schedulingIntervalId = undefined
    }
  }

  /**
   * Add a task to the queue
   */
  addTask(task: Task): void {
    this.taskQueue.addTask(task)
  }

  /**
   * Add multiple tasks
   */
  addTasks(tasks: Task[]): void {
    tasks.forEach(task => this.addTask(task))
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.taskQueue.getTask(taskId)
  }

  /**
   * Schedule a single task
   */
  async scheduleTask(taskId: string): Promise<ScheduleDecision | null> {
    const task = this.taskQueue.getTask(taskId)
    if (!task) {
      return null
    }

    // Check if dependencies are satisfied
    if (!this.taskQueue.areDependenciesSatisfied(task)) {
      return null
    }

    // Get optimized weights from learner if enabled
    let weights = this.config.scoringWeights
    if (this.config.enableLearning) {
      const optimizedWeights = this.learner.getOptimizedWeights(task.type, this.agents)
      if (optimizedWeights) {
        weights = { ...weights, ...optimizedWeights }
      }
    }

    // Find best candidate
    const matchResult = this.taskMatcher.findBestCandidate(task, this.agents, weights)

    if (!matchResult) {
      return null
    }

    const agent = this.agents.get(matchResult.agentId)
    if (!agent) {
      return null
    }

    // Calculate scores for decision
    const scores = this.taskMatcher.calculateMatchScore(agent, task, weights)

    // Get alternative agents
    const candidates = this.taskMatcher.findCandidates(task, this.agents)
    const ranked = this.taskMatcher.rankCandidates(task, candidates, weights)
    const alternatives = this.taskMatcher.getAlternativeCandidates(ranked, 3)

    // Estimate completion time
    const estimatedCompletion = Date.now() + task.estimatedDuration * 60 * 1000

    // Create decision
    const decision = createScheduleDecision({
      taskId: task.id,
      assignedAgent: agent.agentId,
      confidence: matchResult.confidence,
      reasoning: matchResult.reasons.join('; '),
      alternativeAgents: alternatives,
      estimatedCompletion,
      scores: {
        capability: scores.capability / 100,
        load: scores.load / 100,
        performance: scores.performance / 100,
        response: scores.response / 100,
        total: scores.total / 100,
      },
    })

    // Record decision
    this.scheduleHistory.addDecision(decision)

    // Update task and agent
    this.taskQueue.updateTaskStatus(taskId, 'assigned', agent.agentId)
    this.updateAgentLoad(agent.agentId, task.estimatedDuration)

    return decision
  }

  /**
   * Schedule next batch of tasks
   */
  async scheduleNextBatch(): Promise<SchedulingResult> {
    const pendingTasks = this.taskQueue.getReadyTasks()

    if (pendingTasks.length === 0) {
      return {
        success: true,
        scheduled: [],
        failed: [],
        stats: {
          totalPending: 0,
          totalScheduled: 0,
          totalFailed: 0,
        },
      }
    }

    // Rank tasks by priority
    const rankedTasks = this.taskRanker.rankTasks(pendingTasks)

    // Take top N tasks
    const tasksToSchedule = rankedTasks.slice(0, this.config.maxBatchSize).map(r => r.task)

    const scheduled: ScheduleDecision[] = []
    const failed: Array<{ taskId: string; reason: string }> = []

    // Schedule each task
    for (const task of tasksToSchedule) {
      const decision = await this.scheduleTask(task.id)

      if (decision) {
        scheduled.push(decision)
      } else {
        failed.push({
          taskId: task.id,
          reason: 'No suitable agent available',
        })
      }
    }

    return {
      success: failed.length === 0,
      scheduled,
      failed,
      stats: {
        totalPending: pendingTasks.length,
        totalScheduled: scheduled.length,
        totalFailed: failed.length,
      },
    }
  }

  /**
   * Manually assign task to specific agent
   */
  manualAssign(taskId: string, agentId: string, userId: string): ScheduleDecision | null {
    if (!this.config.allowManualOverride) {
      throw new Error('Manual override is not allowed')
    }

    const task = this.taskQueue.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`)
    }

    if (!agent.availability) {
      throw new Error(`Agent ${agentId} is not available`)
    }

    // Check load capacity
    const newLoad = this.loadBalancer.calculateNewLoad(agent, task)
    if (newLoad > this.config.loadBalance.maxLoadThreshold) {
      throw new Error(`Agent ${agentId} does not have sufficient capacity`)
    }

    // Calculate scores
    const scores = this.taskMatcher.calculateMatchScore(agent, task, this.config.scoringWeights)

    // Estimate completion time
    const estimatedCompletion = Date.now() + task.estimatedDuration * 60 * 1000

    // Create decision
    const decision = createScheduleDecision({
      taskId: task.id,
      assignedAgent: agent.agentId,
      confidence: 1.0, // Manual assignment has full confidence
      reasoning: `Manual assignment by user ${userId}`,
      alternativeAgents: [],
      estimatedCompletion,
      scores: {
        capability: scores.capability / 100,
        load: scores.load / 100,
        performance: scores.performance / 100,
        response: scores.response / 100,
        total: scores.total / 100,
      },
      manualOverride: true,
      overrideBy: userId,
    })

    // Record decision
    this.scheduleHistory.addDecision(decision)

    // Update task and agent
    this.taskQueue.updateTaskStatus(taskId, 'assigned', agent.agentId)
    this.updateAgentLoad(agent.agentId, task.estimatedDuration)

    return decision
  }

  /**
   * Mark task as started
   */
  startTask(taskId: string): void {
    this.taskQueue.updateTaskStatus(taskId, 'in_progress')
  }

  /**
   * Mark task as completed
   */
  completeTask(taskId: string): void {
    const task = this.taskQueue.getTask(taskId)
    if (!task || !task.assignedAgent) {
      return
    }

    // Update task status
    this.taskQueue.updateTaskStatus(taskId, 'completed')

    // Update agent load
    this.updateAgentLoad(task.assignedAgent, -task.estimatedDuration)

    // Record completion
    this.scheduleHistory.recordCompletion(taskId, true, task.estimatedDuration)

    this.loadBalancer.recordTaskCompletion(task.assignedAgent, true)

    // Record in learner for adaptive learning
    if (this.config.enableLearning) {
      const decision = this.scheduleHistory.getDecision(taskId)
      if (decision) {
        this.learner.recordDecision(decision, true, task.estimatedDuration)
      }
    }
  }

  /**
   * Mark task as failed
   */
  failTask(taskId: string, error: string): void {
    const task = this.taskQueue.getTask(taskId)
    if (!task || !task.assignedAgent) {
      return
    }

    // Set error message on task
    task.error = error

    // Update task status
    this.taskQueue.updateTaskStatus(taskId, 'failed')

    // Update agent load
    this.updateAgentLoad(task.assignedAgent, -task.estimatedDuration)

    // Record failure
    this.scheduleHistory.recordCompletion(taskId, false, task.estimatedDuration)

    this.loadBalancer.recordTaskCompletion(task.assignedAgent, false)

    // Record in learner for adaptive learning
    if (this.config.enableLearning) {
      const decision = this.scheduleHistory.getDecision(taskId)
      if (decision) {
        this.learner.recordDecision(decision, false, task.estimatedDuration)
      }
    }
  }

  /**
   * Reassign failed task to another agent
   */
  async reassignTask(taskId: string): Promise<ScheduleDecision | null> {
    const task = this.taskQueue.getTask(taskId)
    if (!task) {
      return null
    }

    // Reset task status and clear assignment
    // Note: This directly modifies the task object to reset its state
    // The scheduleTask method will update the queue properly when it assigns the task
    task.status = 'pending'
    task.assignedAgent = undefined
    task.error = undefined

    // Re-add task to pending queue if not already there
    // This ensures the task is tracked in the pending queue for scheduling
    const pendingTasks = this.taskQueue.getPendingTasks()
    if (!pendingTasks.find(t => t.id === taskId)) {
      // Task needs to be re-added to pending queue
      // We use the taskQueue's internal method by updating status
      this.taskQueue.updateTaskStatus(taskId, 'pending')
    }

    // Try to reschedule
    return this.scheduleTask(taskId)
  }

  /**
   * Update agent load
   */
  private updateAgentLoad(agentId: string, durationMinutes: number): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      const loadDelta = (durationMinutes / 60) * 100
      agent.currentLoad = Math.max(0, Math.min(100, agent.currentLoad + loadDelta))
      agent.lastActiveTime = Date.now()
    }
  }

  /**
   * Update agent availability
   */
  setAgentAvailability(agentId: string, available: boolean): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.availability = available
      agent.lastActiveTime = Date.now()
    }
  }

  /**
   * Get all agents
   */
  getAgents(): Map<string, AgentCapability> {
    return new Map(this.agents)
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentCapability | undefined {
    return this.agents.get(agentId)
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return this.taskQueue.getAllTasks()
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): Task[] {
    return this.taskQueue.getPendingTasks()
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: Task['status']): Task[] {
    return this.taskQueue.getTasksByStatus(status)
  }

  /**
   * Get task statistics
   */
  getTaskStats() {
    return this.taskQueue.getStats()
  }

  /**
   * Get schedule history
   */
  getScheduleHistory(): ScheduleHistory {
    return this.scheduleHistory
  }

  /**
   * Get recent decisions
   */
  getRecentDecisions(count: number = 10): ScheduleDecision[] {
    return this.scheduleHistory.getRecentDecisions(count)
  }

  /**
   * Get scheduling metrics
   */
  getMetrics() {
    return this.scheduleHistory.getMetrics()
  }

  /**
   * Get load balance statistics
   */
  getLoadStats() {
    return this.loadBalancer.getLoadStats(this.agents)
  }

  /**
   * Get scaling suggestion
   */
  getScalingSuggestion() {
    return this.loadBalancer.suggestScaling(this.agents)
  }

  /**
   * Clear all tasks
   */
  clearTasks(): void {
    this.taskQueue.clear()
  }

  /**
   * Reset scheduler state
   */
  reset(): void {
    this.taskQueue.clear()
    this.agents = initializeAgents()
    this.scheduleHistory.clear()
    this.loadBalancer.reset()
    this.learner.clear()
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.loadBalance) {
      this.loadBalancer.updateConfig(config.loadBalance)
    }

    if (config.learning) {
      this.learner.updateConfig(config.learning)
    }

    // Restart auto scheduling if interval changed
    if (config.schedulingInterval !== undefined || config.autoSchedule !== undefined) {
      this.stopAutoScheduling()
      if (this.config.autoSchedule) {
        this.startAutoScheduling()
      }
    }
  }

  /**
   * Get learning summary
   */
  getLearningSummary(): ReturnType<AdaptiveLearner['getSummary']> {
    return this.learner.getSummary()
  }

  /**
   * Get weight adjustments from learner
   */
  getWeightAdjustments(): ReturnType<AdaptiveLearner['getWeightAdjustments']> {
    return this.learner.getWeightAdjustments(this.agents)
  }

  /**
   * Apply suggested weight adjustments
   */
  applyWeightAdjustments(): void {
    const adjustments = this.getWeightAdjustments()
    this.learner.applyWeightAdjustments(adjustments)
  }

  /**
   * Get adaptive learner instance
   */
  getLearner(): AdaptiveLearner {
    return this.learner
  }

  /**
   * Export scheduler state
   */
  export(): string {
    return JSON.stringify(
      {
        config: this.config,
        agents: Array.from(this.agents.entries()),
        tasks: this.taskQueue.getAllTasks(),
        history: this.scheduleHistory.export(),
        learning: this.learner.exportData(),
      },
      null,
      2
    )
  }
}
