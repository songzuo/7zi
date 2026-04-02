/**
 * Feature Engineer
 * Feature extraction and normalization system for Agent Learning System 2.0
 *
 * Features:
 * - Task feature extraction (complexity, dependencies, historical patterns)
 * - Agent feature extraction (capabilities, performance, load)
 * - Context feature extraction (time, system state)
 * - Feature normalization and importance analysis
 *
 * @module FeatureEngineer
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Task complexity levels
 */
export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'unknown'

/**
 * Task feature set for prediction models
 */
export interface TaskFeatures {
  // Task complexity features
  complexity: number // 1-10 complexity score
  estimatedDuration: number // Estimated duration in milliseconds
  dependencyCount: number // Number of dependencies

  // Task type features
  taskType: TaskComplexity
  requiresExternal: boolean // Whether external resources needed
  isIdempotent: boolean // Whether operation is idempotent

  // Historical features
  historicalAvgDuration: number // Historical average duration
  historicalSuccessRate: number // Historical success rate (0-1)
  recentFailureCount: number // Recent failure count
}

/**
 * Agent feature set for routing and load balancing
 */
export interface AgentFeatures {
  // Capability features
  capabilities: string[] // List of capabilities
  currentLoad: number // Current load (0-1)
  maxConcurrentTasks: number // Maximum concurrent tasks

  // Performance features
  avgExecutionTime: number // Average execution time in ms
  successRate: number // Success rate (0-1)
  reliability: number // Reliability score (0-1)

  // Historical performance
  totalTasksCompleted: number // Total completed tasks
  specializationScore: Record<string, number> // Specialization scores by task type
}

/**
 * Context feature set for environment-aware decisions
 */
export interface ContextFeatures {
  // Time features
  hourOfDay: number // Hour (0-23)
  dayOfWeek: number // Day of week (0-6)
  isWeekend: boolean // Is weekend

  // System features
  systemLoad: number // System load (0-1)
  availableMemory: number // Available memory in bytes
  activeConnections: number // Number of active connections
}

/**
 * Normalized feature vector
 */
export interface NormalizedFeatures {
  values: number[]
  labels: string[]
  timestamp: number
}

/**
 * Feature importance score
 */
export interface FeatureImportance {
  featureName: string
  importance: number // 0-1 importance score
  category: 'task' | 'agent' | 'context'
  description: string
}

/**
 * Feature store interface for persistence
 */
export interface FeatureStore {
  getTaskFeatures(taskId: string): Promise<TaskFeatures | null>
  getAgentFeatures(agentId: string): Promise<AgentFeatures | null>
  getContextFeatures(): ContextFeatures
  updateTaskFeatures(taskId: string, features: Partial<TaskFeatures>): Promise<void>
  updateAgentFeatures(agentId: string, features: Partial<AgentFeatures>): Promise<void>
  getHistoricalFeatures(taskType: string, lookbackDays: number): Promise<TaskFeatures>
}

/**
 * Task input for feature extraction
 */
export interface TaskInput {
  id: string
  type: string
  input?: unknown
  dependencies?: string[]
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  createdAt?: number
  metadata?: Record<string, unknown>
}

/**
 * Agent input for feature extraction
 */
export interface AgentInput {
  id: string
  name?: string
  capabilities?: string[]
  status?: 'idle' | 'busy' | 'offline'
  currentTasks?: number
  maxTasks?: number
  performance?: {
    avgTime?: number
    successRate?: number
    totalCompleted?: number
    totalFailed?: number
  }
}

/**
 * Feature Engineer configuration
 */
export interface FeatureEngineerConfig {
  /** Default values for missing features */
  defaults: {
    taskComplexity: number
    taskDuration: number
    agentReliability: number
    agentSuccessRate: number
  }
  /** Normalization method */
  normalizationMethod: 'minmax' | 'zscore' | 'robust'
  /** Enable feature importance caching */
  cacheImportance: boolean
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: FeatureEngineerConfig = {
  defaults: {
    taskComplexity: 5,
    taskDuration: 60000, // 1 minute
    agentReliability: 0.8,
    agentSuccessRate: 0.9,
  },
  normalizationMethod: 'minmax',
  cacheImportance: true,
}

// ============================================================================
// In-Memory Feature Store Implementation
// ============================================================================

/**
 * In-memory implementation of FeatureStore
 */
export class InMemoryFeatureStore implements FeatureStore {
  private taskFeatures: Map<string, TaskFeatures> = new Map()
  private agentFeatures: Map<string, AgentFeatures> = new Map()
  private contextCache: ContextFeatures

  constructor() {
    // Initialize with current context
    this.contextCache = this.extractCurrentContext()
  }

  async getTaskFeatures(taskId: string): Promise<TaskFeatures | null> {
    return this.taskFeatures.get(taskId) || null
  }

  async getAgentFeatures(agentId: string): Promise<AgentFeatures | null> {
    return this.agentFeatures.get(agentId) || null
  }

  getContextFeatures(): ContextFeatures {
    return this.contextCache
  }

  async updateTaskFeatures(taskId: string, features: Partial<TaskFeatures>): Promise<void> {
    const existing = this.taskFeatures.get(taskId)
    this.taskFeatures.set(taskId, {
      ...this.getDefaultTaskFeatures(),
      ...existing,
      ...features,
    })
  }

  async updateAgentFeatures(agentId: string, features: Partial<AgentFeatures>): Promise<void> {
    const existing = this.agentFeatures.get(agentId)
    this.agentFeatures.set(agentId, {
      ...this.getDefaultAgentFeatures(),
      ...existing,
      ...features,
    })
  }

  async getHistoricalFeatures(taskType: string, lookbackDays: number): Promise<TaskFeatures> {
    // In a real implementation, this would query historical data
    // For now, return default features with type-based adjustments
    const baseFeatures = this.getDefaultTaskFeatures()
    return {
      ...baseFeatures,
      taskType: taskType as TaskComplexity,
      historicalAvgDuration: baseFeatures.estimatedDuration * lookbackDays,
    }
  }

  /**
   * Update context features (call periodically)
   */
  updateContext(features: Partial<ContextFeatures>): void {
    this.contextCache = {
      ...this.contextCache,
      ...features,
    }
  }

  private getDefaultTaskFeatures(): TaskFeatures {
    return {
      complexity: 5,
      estimatedDuration: 60000,
      dependencyCount: 0,
      taskType: 'unknown',
      requiresExternal: false,
      isIdempotent: true,
      historicalAvgDuration: 60000,
      historicalSuccessRate: 0.9,
      recentFailureCount: 0,
    }
  }

  private getDefaultAgentFeatures(): AgentFeatures {
    return {
      capabilities: [],
      currentLoad: 0,
      maxConcurrentTasks: 5,
      avgExecutionTime: 30000,
      successRate: 0.9,
      reliability: 0.8,
      totalTasksCompleted: 0,
      specializationScore: {},
    }
  }

  private extractCurrentContext(): ContextFeatures {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()

    return {
      hourOfDay: hour,
      dayOfWeek: day,
      isWeekend: day === 0 || day === 6,
      systemLoad: 0,
      availableMemory: 0,
      activeConnections: 0,
    }
  }
}

// ============================================================================
// Feature Engineer Implementation
// ============================================================================

/**
 * Feature Engineer
 * Extracts, normalizes, and analyzes features for the learning system
 */
export class FeatureEngineer {
  private store: FeatureStore
  private config: FeatureEngineerConfig
  private importanceCache: FeatureImportance[] | null = null

  constructor(store: FeatureStore, config: Partial<FeatureEngineerConfig> = {}) {
    this.store = store
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ==========================================================================
  // Feature Extraction Methods
  // ==========================================================================

  /**
   * Extract features from a task
   */
  extractTaskFeatures(task: TaskInput): TaskFeatures {
    const complexity = this.calculateTaskComplexity(task)
    const taskType = this.classifyTaskType(complexity)
    const estimatedDuration = this.estimateTaskDuration(task, complexity)

    return {
      complexity,
      estimatedDuration,
      dependencyCount: task.dependencies?.length || 0,
      taskType,
      requiresExternal: this.requiresExternalResources(task),
      isIdempotent: this.isIdempotentTask(task),
      historicalAvgDuration: estimatedDuration,
      historicalSuccessRate: 0.9,
      recentFailureCount: 0,
    }
  }

  /**
   * Extract features from an agent
   */
  extractAgentFeatures(agent: AgentInput): AgentFeatures {
    const capabilities = agent.capabilities || []
    const performance = agent.performance || {}

    return {
      capabilities,
      currentLoad: this.calculateAgentLoad(agent),
      maxConcurrentTasks: agent.maxTasks || 5,
      avgExecutionTime: performance.avgTime || 30000,
      successRate: this.calculateSuccessRate(performance),
      reliability: this.calculateReliability(performance),
      totalTasksCompleted: performance.totalCompleted || 0,
      specializationScore: this.calculateSpecialization(agent),
    }
  }

  /**
   * Extract current context features
   */
  extractContextFeatures(): ContextFeatures {
    return this.store.getContextFeatures()
  }

  // ==========================================================================
  // Feature Normalization
  // ==========================================================================

  /**
   * Normalize features to a standard scale
   */
  normalizeFeatures(features: TaskFeatures | AgentFeatures): NormalizedFeatures {
    const values: number[] = []
    const labels: string[] = []

    if ('complexity' in features) {
      // TaskFeatures normalization
      const tf = features as TaskFeatures
      values.push(this.normalizeValue(tf.complexity, 1, 10))
      labels.push('complexity')
      values.push(this.normalizeValue(tf.estimatedDuration, 0, 300000))
      labels.push('estimatedDuration')
      values.push(this.normalizeValue(tf.dependencyCount, 0, 10))
      labels.push('dependencyCount')
      values.push(this.normalizeValue(tf.historicalAvgDuration, 0, 300000))
      labels.push('historicalAvgDuration')
      values.push(tf.historicalSuccessRate)
      labels.push('historicalSuccessRate')
      values.push(this.normalizeValue(tf.recentFailureCount, 0, 10))
      labels.push('recentFailureCount')
    } else {
      // AgentFeatures normalization
      const af = features as AgentFeatures
      values.push(this.normalizeValue(af.capabilities.length, 0, 20))
      labels.push('capabilities_count')
      values.push(af.currentLoad)
      labels.push('currentLoad')
      values.push(this.normalizeValue(af.maxConcurrentTasks, 1, 10))
      labels.push('maxConcurrentTasks')
      values.push(this.normalizeValue(af.avgExecutionTime, 0, 300000))
      labels.push('avgExecutionTime')
      values.push(af.successRate)
      labels.push('successRate')
      values.push(af.reliability)
      labels.push('reliability')
      values.push(this.normalizeValue(af.totalTasksCompleted, 0, 1000))
      labels.push('totalTasksCompleted')
    }

    return {
      values,
      labels,
      timestamp: Date.now(),
    }
  }

  // ==========================================================================
  // Feature Importance Analysis
  // ==========================================================================

  /**
   * Analyze feature importance for predictions
   */
  analyzeFeatureImportance(): FeatureImportance[] {
    if (this.config.cacheImportance && this.importanceCache) {
      return this.importanceCache
    }

    const importance: FeatureImportance[] = [
      // Task features
      {
        featureName: 'complexity',
        importance: 0.25,
        category: 'task',
        description: 'Task complexity score strongly correlates with execution time',
      },
      {
        featureName: 'dependencyCount',
        importance: 0.15,
        category: 'task',
        description: 'Number of dependencies affects task scheduling and completion time',
      },
      {
        featureName: 'historicalSuccessRate',
        importance: 0.2,
        category: 'task',
        description: 'Historical success rate indicates task difficulty and risk',
      },

      // Agent features
      {
        featureName: 'currentLoad',
        importance: 0.3,
        category: 'agent',
        description: 'Agent load directly impacts task execution and queue time',
      },
      {
        featureName: 'reliability',
        importance: 0.25,
        category: 'agent',
        description: 'Agent reliability affects task success probability',
      },
      {
        featureName: 'successRate',
        importance: 0.2,
        category: 'agent',
        description: 'Historical success rate indicates agent capability',
      },
      {
        featureName: 'specializationScore',
        importance: 0.15,
        category: 'agent',
        description: 'Task-specific specialization affects routing decisions',
      },

      // Context features
      {
        featureName: 'hourOfDay',
        importance: 0.1,
        category: 'context',
        description: 'Time of day affects system load and resource availability',
      },
      {
        featureName: 'systemLoad',
        importance: 0.2,
        category: 'context',
        description: 'System load impacts task execution performance',
      },
      {
        featureName: 'isWeekend',
        importance: 0.05,
        category: 'context',
        description: 'Weekend vs weekday affects typical usage patterns',
      },
    ]

    if (this.config.cacheImportance) {
      this.importanceCache = importance
    }

    return importance
  }

  // ==========================================================================
  // Store Operations
  // ==========================================================================

  /**
   * Store task features
   */
  async storeTaskFeatures(taskId: string, features: TaskFeatures): Promise<void> {
    await this.store.updateTaskFeatures(taskId, features)
  }

  /**
   * Store agent features
   */
  async storeAgentFeatures(agentId: string, features: AgentFeatures): Promise<void> {
    await this.store.updateAgentFeatures(agentId, features)
  }

  /**
   * Get stored task features
   */
  async getTaskFeatures(taskId: string): Promise<TaskFeatures | null> {
    return this.store.getTaskFeatures(taskId)
  }

  /**
   * Get stored agent features
   */
  async getAgentFeatures(agentId: string): Promise<AgentFeatures | null> {
    return this.store.getAgentFeatures(agentId)
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Calculate task complexity score (1-10)
   */
  private calculateTaskComplexity(task: TaskInput): number {
    let score = 5 // Base complexity

    // Adjust based on task type
    const complexTypes = ['analysis', 'generation', 'transformation', 'integration']
    const simpleTypes = ['read', 'write', 'delete', 'query']

    if (complexTypes.some(t => task.type.toLowerCase().includes(t))) {
      score += 2
    } else if (simpleTypes.some(t => task.type.toLowerCase().includes(t))) {
      score -= 2
    }

    // Adjust based on dependencies
    const depCount = task.dependencies?.length || 0
    score += Math.min(depCount, 3)

    // Adjust based on input size
    const inputSize = this.estimateInputSize(task.input)
    if (inputSize > 10000) {
      score += 1
    } else if (inputSize < 100) {
      score -= 1
    }

    // Clamp to 1-10
    return Math.max(1, Math.min(10, score))
  }

  /**
   * Classify task type based on complexity score
   */
  private classifyTaskType(complexity: number): TaskComplexity {
    if (complexity <= 3) return 'simple'
    if (complexity <= 6) return 'moderate'
    // complexity 7-10 is complex
    return 'complex'
  }

  /**
   * Estimate task duration based on complexity
   */
  private estimateTaskDuration(task: TaskInput, complexity: number): number {
    // Base duration: 30 seconds
    const baseDuration = 30000

    // Scale by complexity (1-10)
    const multiplier = 0.5 + complexity * 0.3

    // Adjust for dependencies
    const depPenalty = (task.dependencies?.length || 0) * 10000

    return Math.round(baseDuration * multiplier + depPenalty)
  }

  /**
   * Check if task requires external resources
   */
  private requiresExternalResources(task: TaskInput): boolean {
    const externalIndicators = ['http', 'api', 'fetch', 'remote', 'external', 'download', 'upload']

    // Safely stringify task, handling circular references
    let taskStr: string
    try {
      taskStr = JSON.stringify(task)
    } catch {
      // Handle circular references by using a simplified representation
      taskStr = JSON.stringify({
        id: task.id,
        type: task.type,
        dependencies: task.dependencies,
        priority: task.priority,
      })
    }

    return externalIndicators.some(ind => taskStr.toLowerCase().includes(ind))
  }

  /**
   * Check if task is idempotent
   */
  private isIdempotentTask(task: TaskInput): boolean {
    // Read operations are generally idempotent
    const idempotentTypes = ['read', 'query', 'get', 'fetch', 'list']
    const nonIdempotentTypes = ['create', 'update', 'delete', 'send', 'post']

    const typeLower = task.type.toLowerCase()

    if (idempotentTypes.some(t => typeLower.includes(t))) {
      return true
    }
    if (nonIdempotentTypes.some(t => typeLower.includes(t))) {
      return false
    }

    // Default to idempotent for safety
    return true
  }

  /**
   * Estimate input size
   */
  private estimateInputSize(input: unknown): number {
    if (!input) return 0
    if (typeof input === 'string') return input.length
    if (typeof input === 'object') {
      try {
        return JSON.stringify(input).length
      } catch {
        return 1000
      }
    }
    return 1
  }

  /**
   * Calculate agent load
   */
  private calculateAgentLoad(agent: AgentInput): number {
    if (agent.status === 'offline') return 1
    if (agent.status === 'idle') return 0

    const currentTasks = agent.currentTasks || 0
    const maxTasks = agent.maxTasks || 5

    return Math.min(1, currentTasks / maxTasks)
  }

  /**
   * Calculate agent success rate
   */
  private calculateSuccessRate(performance: {
    totalCompleted?: number
    totalFailed?: number
    successRate?: number
  }): number {
    if (performance.successRate !== undefined) {
      return performance.successRate
    }

    const completed = performance.totalCompleted || 0
    const failed = performance.totalFailed || 0
    const total = completed + failed

    if (total === 0) return 0.9 // Default for new agents
    return completed / total
  }

  /**
   * Calculate agent reliability
   */
  private calculateReliability(performance: {
    totalCompleted?: number
    totalFailed?: number
    avgTime?: number
    successRate?: number
  }): number {
    const successRate = this.calculateSuccessRate(performance)
    const avgTime = performance.avgTime || 30000

    // Reliability combines success rate and consistency
    const timeFactor = avgTime > 0 && avgTime < 60000 ? 0.1 : 0 // Bonus for fast execution

    return Math.min(1, successRate + timeFactor)
  }

  /**
   * Calculate specialization scores
   */
  private calculateSpecialization(agent: AgentInput): Record<string, number> {
    const scores: Record<string, number> = {}

    // Base specialization from capabilities
    const capabilities = agent.capabilities || []
    for (const cap of capabilities) {
      scores[cap] = 0.8 // High specialization for explicit capabilities
    }

    return scores
  }

  /**
   * Normalize a value to 0-1 range
   */
  private normalizeValue(value: number, min: number, max: number): number {
    if (max === min) return 0.5
    const normalized = (value - min) / (max - min)
    return Math.max(0, Math.min(1, normalized))
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a FeatureEngineer with in-memory store
 */
export function createFeatureEngineer(
  config: Partial<FeatureEngineerConfig> = {}
): FeatureEngineer {
  const store = new InMemoryFeatureStore()
  return new FeatureEngineer(store, config)
}

/**
 * Create a FeatureEngineer with custom store
 */
export function createFeatureEngineerWithStore(
  store: FeatureStore,
  config: Partial<FeatureEngineerConfig> = {}
): FeatureEngineer {
  return new FeatureEngineer(store, config)
}
