/**
 * Multi-Agent Orchestrator - v1.9.0
 * Enhanced Multi-Agent Collaboration Framework
 * 
 * Provides:
 * - Parallel execution (Promise.all style)
 * - Sequential execution (async/await chain)
 * - Conditional routing (based on intermediate results)
 * - Result aggregation strategies
 * - Conflict detection
 * - Task delegation optimization
 */

import { v4 as uuidv4 } from 'uuid'
import { AgentRegistration, AgentRegistry, Task, TaskState, Message, Artifact, AgentExecutor, RequestContext, SimpleEventBus } from './a2a'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Agent capabilities for task matching
 */
export interface AgentCapabilities {
  id: string
  name: string
  type: 'architect' | 'tester' | 'security' | 'sysadmin' | 'consultant' | 'executor' | 'designer' | 'media' | 'marketer'
  skills: string[]
  maxConcurrentTasks: number
  currentLoad: number
  averageExecutionTime: number // in ms
}

/**
 * Task to be executed by agents
 */
export interface OrchestratorTask {
  id: string
  type: string
  description: string
  input: Record<string, unknown>
  requiredCapabilities?: string[]
  requiredSkills?: string[]
  priority: TaskPriority
  timeout?: number
  retryCount?: number
  aggregationStrategy?: AggregationStrategy
  context?: Record<string, unknown>
}

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

/**
 * Result from a single agent execution
 */
export interface AgentResult {
  agentId: string
  agentName: string
  success: boolean
  output: unknown
  error?: string
  executionTime: number
  timestamp: string
  artifacts?: Artifact[]
  context?: Record<string, unknown>
}

/**
 * Aggregated result from multiple agents
 */
export interface AggregatedResult {
  strategy: AggregationStrategy
  results: AgentResult[]
  combinedOutput?: unknown
  conflicts?: Conflict[]
  executionTime: number
  timestamp: string
  summary?: ResultSummary
}

/**
 * Result summary for aggregation
 */
export interface ResultSummary {
  total: number
  successful: number
  failed: number
  averageExecutionTime: number
  bestResult?: AgentResult
}

/**
 * Aggregation strategies
 */
export type AggregationStrategy = 'all' | 'first' | 'majority' | 'weighted' | 'best'

/**
 * Conflict detected between agent results
 */
export interface Conflict {
  id: string
  type: 'data_inconsistency' | 'contradiction' | 'different_conclusions'
  agents: string[]
  description: string
  severity: 'low' | 'medium' | 'high'
  resolution?: ConflictResolution
}

/**
 * Conflict resolution
 */
export interface ConflictResolution {
  strategy: 'manual' | 'auto_majority' | 'auto_weighted' | 'auto_best'
  resolvedBy?: string
  resolution?: string
}

/**
 * Workflow step for sequential execution
 */
export interface WorkflowStep {
  id: string
  agentId: string
  agentName: string
  task: OrchestratorTask
  dependsOn?: string[] // Step IDs that must complete first
  condition?: Condition
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  workflowId: string
  steps: WorkflowStepResult[]
  finalContext: Record<string, unknown>
  status: 'completed' | 'failed' | 'partial'
  totalExecutionTime: number
  timestamp: string
}

/**
 * Individual workflow step result
 */
export interface WorkflowStepResult {
  stepId: string
  agentId: string
  status: 'success' | 'failed' | 'skipped'
  result?: AgentResult
  error?: string
  executionTime: number
}

/**
 * Condition for conditional routing
 */
export interface Condition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'exists' | 'regex'
  value: unknown
}

/**
 * Branch for conditional routing
 */
export interface Branch {
  id: string
  name: string
  condition: Condition
  agents: AgentWithTask[]
}

/**
 * Branch execution result
 */
export interface BranchResult {
  branchId: string
  branchName: string
  executed: boolean
  result?: AgentResult
  executionTime: number
  timestamp: string
}

/**
 * Agent with task for execution
 */
export interface AgentWithTask {
  agent: AgentCapabilities
  task: OrchestratorTask
}

/**
 * Load balancing options
 */
export interface LoadBalancingOptions {
  strategy: 'least_load' | 'fastest' | 'round_robin' | 'capability_match'
  maxLoad?: number
  timeout?: number
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number
  backoff: 'fixed' | 'exponential'
  baseDelay: number
  maxDelay: number
  retryableErrors?: string[]
}

// ============================================================================
// Multi-Agent Orchestrator Implementation
// ============================================================================

/**
 * Multi-Agent Orchestrator - Core class for coordinating multiple agents
 */
export class MultiAgentOrchestrator {
  private registry: AgentRegistry
  private executor: AgentExecutor
  private retryConfig: RetryConfig
  private loadBalancingOptions: LoadBalancingOptions
  private executionHistory: Map<string, AgentResult[]> = new Map()

  constructor(
    registry: AgentRegistry,
    executor: AgentExecutor,
    options?: {
      retryConfig?: Partial<RetryConfig>
      loadBalancingOptions?: Partial<LoadBalancingOptions>
    }
  ) {
    this.registry = registry
    this.executor = executor
    this.retryConfig = {
      maxRetries: 3,
      backoff: 'exponential',
      baseDelay: 1000,
      maxDelay: 30000,
      retryableErrors: ['timeout', 'network_error', 'agent_unavailable'],
      ...options?.retryConfig,
    }
    this.loadBalancingOptions = {
      strategy: 'least_load',
      maxLoad: 10,
      timeout: 30000,
      ...options?.loadBalancingOptions,
    }
  }

  // ==========================================================================
  // Parallel Execution
  // ==========================================================================

  /**
   * Execute multiple agents in parallel (Promise.all style)
   */
  async executeParallel(
    agents: AgentWithTask[],
    task: OrchestratorTask
  ): Promise<AggregatedResult> {
    const startTime = Date.now()
    const strategy = task.aggregationStrategy || 'all'

    // Execute all agents in parallel
    const results = await Promise.allSettled(
      agents.map(async (agentWithTask) => {
        return this.executeAgentWithRetry(agentWithTask.agent, agentWithTask.task)
      })
    )

    // Transform results
    const agentResults: AgentResult[] = agents.map((agentWithTask, index) => {
      const result = results[index]
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          agentId: agentWithTask.agent.id,
          agentName: agentWithTask.agent.name,
          success: false,
          output: null,
          error: result.reason?.message || 'Unknown error',
          executionTime: 0,
          timestamp: new Date().toISOString(),
        }
      }
    })

    // Aggregate results based on strategy
    const aggregated = this.aggregateResults(agentResults, strategy)

    // Detect conflicts
    const conflicts = this.detectConflicts(agentResults)
    aggregated.conflicts = conflicts

    aggregated.executionTime = Date.now() - startTime

    // Store execution history
    this.executionHistory.set(task.id, agentResults)

    return aggregated
  }

  // ==========================================================================
  // Sequential Execution
  // ==========================================================================

  /**
   * Execute workflow steps sequentially (async/await chain)
   */
  async executeSequential(workflow: WorkflowStep[]): Promise<WorkflowResult> {
    const startTime = Date.now()
    const workflowId = uuidv4()
    const stepResults: WorkflowStepResult[] = []
    let finalContext: Record<string, unknown> = {}

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(workflow)
    const completedSteps = new Set<string>()

    // Execute steps in order respecting dependencies
    for (const step of workflow) {
      // Check if dependencies are met
      if (step.dependsOn && step.dependsOn.length > 0) {
        const depsSatisfied = step.dependsOn.every(depId => completedSteps.has(depId))
        if (!depsSatisfied) {
          // Skip this step if dependencies not met
          stepResults.push({
            stepId: step.id,
            agentId: step.agentId,
            status: 'skipped',
            error: 'Dependencies not satisfied',
            executionTime: 0,
          })
          continue
        }
      }

      // Execute the step
      try {
        // Merge previous context into task input
        const taskWithContext: OrchestratorTask = {
          ...step.task,
          input: {
            ...step.task.input,
            previousContext: finalContext,
          },
          context: finalContext,
        }

        const agent = this.findAgentById(step.agentId)
        if (!agent) {
          throw new Error(`Agent not found: ${step.agentId}`)
        }

        const result = await this.executeAgentWithRetry(agent, taskWithContext)

        stepResults.push({
          stepId: step.id,
          agentId: step.agentId,
          status: result.success ? 'success' : 'failed',
          result,
          error: result.error,
          executionTime: result.executionTime,
        })

        // Update context with result
        if (result.success && result.context) {
          finalContext = { ...finalContext, ...result.context }
        }

        if (!result.success && result.error) {
          // Continue execution even if step fails, but mark it
          console.warn(`Step ${step.id} failed: ${result.error}`)
        }

        completedSteps.add(step.id)
      } catch (error) {
        stepResults.push({
          stepId: step.id,
          agentId: step.agentId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: 0,
        })
        completedSteps.add(step.id)
      }
    }

    // Determine overall status
    const hasFailures = stepResults.some(r => r.status === 'failed')
    const hasSkipped = stepResults.some(r => r.status === 'skipped')

    let status: 'completed' | 'failed' | 'partial'
    if (hasFailures) {
      status = hasSkipped ? 'partial' : 'failed'
    } else {
      status = 'completed'
    }

    return {
      workflowId,
      steps: stepResults,
      finalContext,
      status,
      totalExecutionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }

  // ==========================================================================
  // Conditional Routing
  // ==========================================================================

  /**
   * Execute conditional routing based on intermediate results
   */
  async executeConditional(
    initialAgent: AgentWithTask,
    branches: Branch[],
    context?: Record<string, unknown>
  ): Promise<BranchResult> {
    const startTime = Date.now()

    // First execute the initial agent to get context
    const initialResult = await this.executeAgentWithRetry(
      initialAgent.agent,
      {
        ...initialAgent.task,
        context,
      }
    )

    if (!initialResult.success) {
      throw new Error(`Initial agent execution failed: ${initialResult.error}`)
    }

    // Evaluate conditions and find matching branch
    const mergedContext = { ...context, ...initialResult.context }
    const matchedBranch = this.findMatchingBranch(branches, mergedContext)

    if (!matchedBranch) {
      return {
        branchId: 'none',
        branchName: 'no_match',
        executed: false,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    }

    // Execute the matched branch
    const branchResult = await this.executeAgentWithRetry(
      matchedBranch.agents[0].agent,
      {
        ...matchedBranch.agents[0].task,
        context: mergedContext,
      }
    )

    return {
      branchId: matchedBranch.id,
      branchName: matchedBranch.name,
      executed: true,
      result: branchResult,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }

  // ==========================================================================
  // Result Aggregation
  // ==========================================================================

  /**
   * Aggregate results based on the specified strategy
   */
  aggregateResults(results: AgentResult[], strategy: AggregationStrategy): AggregatedResult {
    const timestamp = new Date().toISOString()
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const avgExecutionTime = results.length > 0
      ? results.reduce((sum, r) => sum + r.executionTime, 0) / results.length
      : 0

    let combinedOutput: unknown

    switch (strategy) {
      case 'all':
        combinedOutput = {
          successful: successful.map(r => r.output),
          failed: failed.map(r => ({ agentId: r.agentId, error: r.error })),
        }
        break

      case 'first':
        combinedOutput = results[0]?.output ?? null
        break

      case 'majority':
        combinedOutput = this.computeMajorityOutput(successful)
        break

      case 'weighted':
        combinedOutput = this.computeWeightedOutput(successful)
        break

      case 'best':
        combinedOutput = this.getBestResult(successful)?.output ?? null
        break

      default:
        combinedOutput = results.map(r => r.output)
    }

    return {
      strategy,
      results,
      combinedOutput,
      executionTime: 0, // Will be set by caller
      timestamp,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        averageExecutionTime: avgExecutionTime,
        bestResult: this.getBestResult(successful),
      },
    }
  }

  // ==========================================================================
  // Conflict Detection
  // ==========================================================================

  /**
   * Detect conflicts between agent results
   */
  detectConflicts(results: AgentResult[]): Conflict[] {
    const conflicts: Conflict[] = []
    const successfulResults = results.filter(r => r.success)

    if (successfulResults.length < 2) {
      return conflicts
    }

    // Check for data inconsistencies
    for (let i = 0; i < successfulResults.length; i++) {
      for (let j = i + 1; j < successfulResults.length; j++) {
        const conflict = this.compareResults(
          successfulResults[i],
          successfulResults[j]
        )
        if (conflict) {
          conflicts.push(conflict)
        }
      }
    }

    return conflicts
  }

  // ==========================================================================
  // Task Delegation & Load Balancing
  // ==========================================================================

  /**
   * Assign task to the best available agent based on capabilities and load
   */
  async assignTask(task: OrchestratorTask): Promise<AgentCapabilities> {
    const candidates = this.findMatchingAgents(task)

    if (candidates.length === 0) {
      throw new Error(`No suitable agents found for task: ${task.type}`)
    }

    return this.selectBestAgent(candidates, task)
  }

  /**
   * Find agents matching task requirements
   */
  findMatchingAgents(task: OrchestratorTask): AgentCapabilities[] {
    const allAgents = this.registry.getAvailable()
    
    return allAgents
      .map(registration => this.mapToAgentCapabilities(registration))
      .filter(agent => {
        // Check required capabilities
        if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
          const hasCapabilities = task.requiredCapabilities.every(
            cap => agent.skills.includes(cap) || agent.skills.some(s => s.includes(cap))
          )
          if (!hasCapabilities) return false
        }

        // Check required skills
        if (task.requiredSkills && task.requiredSkills.length > 0) {
          const hasSkills = task.requiredSkills.every(
            skill => agent.skills.includes(skill)
          )
          if (!hasSkills) return false
        }

        // Check load
        if (this.loadBalancingOptions.maxLoad) {
          if (agent.currentLoad >= this.loadBalancingOptions.maxLoad) {
            return false
          }
        }

        return true
      })
  }

  /**
   * Select best agent based on load balancing strategy
   */
  selectBestAgent(candidates: AgentCapabilities[], task: OrchestratorTask): AgentCapabilities {
    switch (this.loadBalancingOptions.strategy) {
      case 'least_load':
        return candidates.sort((a, b) => a.currentLoad - b.currentLoad)[0]

      case 'fastest':
        return candidates.sort((a, b) => a.averageExecutionTime - b.averageExecutionTime)[0]

      case 'capability_match':
        // Score by how many capabilities match
        return candidates.sort((a, b) => {
          const aScore = this.calculateCapabilityScore(a, task)
          const bScore = this.calculateCapabilityScore(b, task)
          return bScore - aScore
        })[0]

      case 'round_robin':
      default:
        return candidates[Math.floor(Math.random() * candidates.length)]
    }
  }

  // ==========================================================================
  // Collaboration Scenarios
  // ==========================================================================

  /**
   * Code Review Collaboration: Architect + Tester + Security Expert
   */
  async executeCodeReview(
    code: string,
    options?: { priority?: TaskPriority; timeout?: number }
  ): Promise<AggregatedResult> {
    const agents: AgentWithTask[] = [
      {
        agent: this.createMockAgent('architect', '架构师', ['code_review', 'architecture', 'best_practices']),
        task: {
          id: uuidv4(),
          type: 'code_review',
          description: 'Architecture Review',
          input: { code, focus: 'architecture' },
          priority: options?.priority || 'high',
          timeout: options?.timeout,
        },
      },
      {
        agent: this.createMockAgent('tester', '测试员', ['test_coverage', 'testing', 'quality']),
        task: {
          id: uuidv4(),
          type: 'code_review',
          description: 'Test Coverage Review',
          input: { code, focus: 'test_coverage' },
          priority: options?.priority || 'high',
          timeout: options?.timeout,
        },
      },
      {
        agent: this.createMockAgent('security', '安全专家', ['security', 'vulnerability', 'safe_coding']),
        task: {
          id: uuidv4(),
          type: 'code_review',
          description: 'Security Review',
          input: { code, focus: 'security' },
          priority: options?.priority || 'high',
          timeout: options?.timeout,
        },
      },
    ]

    return this.executeParallel(agents, {
      id: uuidv4(),
      type: 'code_review',
      description: 'Code Review Collaboration',
      input: { code },
      priority: options?.priority || 'high',
      aggregationStrategy: 'all',
    })
  }

  /**
   * Fault Diagnosis Collaboration: SysAdmin + Consultant + Executor
   */
  async executeFaultDiagnosis(
    symptom: string,
    context?: Record<string, unknown>
  ): Promise<WorkflowResult> {
    const workflow: WorkflowStep[] = [
      {
        id: 'step-1',
        agentId: 'sysadmin',
        agentName: '系统管理员',
        task: {
          id: uuidv4(),
          type: 'diagnosis',
          description: 'Initial Diagnosis',
          input: { symptom, phase: 'initial_diagnosis' },
          priority: 'critical',
        },
      },
      {
        id: 'step-2',
        agentId: 'consultant',
        agentName: '咨询师',
        task: {
          id: uuidv4(),
          type: 'diagnosis',
          description: 'Root Cause Analysis',
          input: { symptom, phase: 'root_cause_analysis' },
          priority: 'critical',
        },
        dependsOn: ['step-1'],
      },
      {
        id: 'step-3',
        agentId: 'executor',
        agentName: 'Executor',
        task: {
          id: uuidv4(),
          type: 'fix',
          description: 'Execute Fix',
          input: { symptom, phase: 'execute_fix' },
          priority: 'critical',
        },
        dependsOn: ['step-2'],
      },
    ]

    return this.executeSequential(workflow)
  }

  /**
   * Content Creation Collaboration: Designer + Media + Marketer
   */
  async executeContentCreation(
    topic: string,
    options?: { priority?: TaskPriority }
  ): Promise<WorkflowResult> {
    const workflow: WorkflowStep[] = [
      {
        id: 'design',
        agentId: 'designer',
        agentName: '设计师',
        task: {
          id: uuidv4(),
          type: 'content_creation',
          description: 'Visual Design',
          input: { topic, phase: 'visual_design' },
          priority: options?.priority || 'normal',
        },
      },
      {
        id: 'media',
        agentId: 'media',
        agentName: '媒体',
        task: {
          id: uuidv4(),
          type: 'content_creation',
          description: 'Content Writing',
          input: { topic, phase: 'content_writing' },
          priority: options?.priority || 'normal',
        },
        dependsOn: ['design'],
      },
      {
        id: 'marketing',
        agentId: 'marketer',
        agentName: '推广专员',
        task: {
          id: uuidv4(),
          type: 'content_creation',
          description: 'Promotion Planning',
          input: { topic, phase: 'promotion_planning' },
          priority: options?.priority || 'normal',
        },
        dependsOn: ['media'],
      },
    ]

    return this.executeSequential(workflow)
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Execute agent with retry logic
   */
  private async executeAgentWithRetry(
    agent: AgentCapabilities,
    task: OrchestratorTask
  ): Promise<AgentResult> {
    const startTime = Date.now()
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.executeAgent(agent, task, attempt)
        return {
          ...result,
          executionTime: Date.now() - startTime,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Check if error is retryable
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateRetryDelay(attempt)
          console.log(`Retry ${attempt + 1}/${this.retryConfig.maxRetries} for ${agent.name} after ${delay}ms`)
          await this.sleep(delay)
        }
      }
    }

    return {
      agentId: agent.id,
      agentName: agent.name,
      success: false,
      output: null,
      error: lastError?.message || 'Max retries exceeded',
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Execute a single agent
   */
  private async executeAgent(
    agent: AgentCapabilities,
    task: OrchestratorTask,
    attempt: number
  ): Promise<Omit<AgentResult, 'executionTime'>> {
    // Simulate agent execution
    // In real implementation, this would call the actual agent executor
    await this.sleep(Math.min(agent.averageExecutionTime, 1000))

    // For demo purposes, return mock success
    return {
      agentId: agent.id,
      agentName: agent.name,
      success: true,
      output: {
        taskId: task.id,
        type: task.type,
        result: `Processed by ${agent.name}`,
        attempt,
      },
      timestamp: new Date().toISOString(),
      context: {
        agentId: agent.id,
        taskType: task.type,
      },
    }
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(attempt: number): number {
    if (this.retryConfig.backoff === 'exponential') {
      const delay = this.retryConfig.baseDelay * Math.pow(2, attempt)
      return Math.min(delay, this.retryConfig.maxDelay)
    }
    return this.retryConfig.baseDelay
  }

  /**
   * Build dependency graph from workflow steps
   */
  private buildDependencyGraph(workflow: WorkflowStep[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>()

    for (const step of workflow) {
      if (!graph.has(step.id)) {
        graph.set(step.id, new Set())
      }

      if (step.dependsOn) {
        for (const depId of step.dependsBy || []) {
          graph.get(step.id)!.add(depId)
        }
      }
    }

    return graph
  }

  /**
   * Find agent by ID
   */
  private findAgentById(agentId: string): AgentCapabilities | undefined {
    const registration = this.registry.get(agentId)
    if (!registration) {
      // Return mock agent for testing
      return this.createMockAgent(agentId, agentId, [])
    }
    return this.mapToAgentCapabilities(registration)
  }

  /**
   * Map registry agent to agent capabilities
   */
  private mapToAgentCapabilities(registration: AgentRegistration): AgentCapabilities {
    return {
      id: registration.id,
      name: registration.name,
      type: 'executor' as AgentCapabilities['type'],
      skills: registration.skills,
      maxConcurrentTasks: 5,
      currentLoad: registration.load || 0,
      averageExecutionTime: 1000,
    }
  }

  /**
   * Create mock agent for testing
   */
  private createMockAgent(id: string, name: string, skills: string[]): AgentCapabilities {
    return {
      id,
      name,
      type: 'executor',
      skills,
      maxConcurrentTasks: 5,
      currentLoad: 0,
      averageExecutionTime: 500,
    }
  }

  /**
   * Find matching branch based on context
   */
  private findMatchingBranch(
    branches: Branch[],
    context: Record<string, unknown>
  ): Branch | undefined {
    for (const branch of branches) {
      if (this.evaluateCondition(branch.condition, context)) {
        return branch
      }
    }
    return undefined
  }

  /**
   * Evaluate condition against context
   */
  private evaluateCondition(condition: Condition, context: Record<string, unknown>): boolean {
    const value = context[condition.field]
    const targetValue = condition.value

    switch (condition.operator) {
      case 'eq':
        return value === targetValue
      case 'ne':
        return value !== targetValue
      case 'gt':
        return typeof value === 'number' && value > (targetValue as number)
      case 'gte':
        return typeof value === 'number' && value >= (targetValue as number)
      case 'lt':
        return typeof value === 'number' && value < (targetValue as number)
      case 'lte':
        return typeof value === 'number' && value <= (targetValue as number)
      case 'contains':
        return typeof value === 'string' && value.includes(targetValue as string)
      case 'exists':
        return targetValue ? value !== undefined : value === undefined
      case 'regex':
        return typeof value === 'string' && new RegExp(targetValue as string).test(value)
      default:
        return false
    }
  }

  /**
   * Compare two results and detect conflicts
   */
  private compareResults(a: AgentResult, b: AgentResult): Conflict | null {
    // Simple comparison - in production, this would be more sophisticated
    if (JSON.stringify(a.output) !== JSON.stringify(b.output)) {
      return {
        id: uuidv4(),
        type: 'different_conclusions',
        agents: [a.agentId, b.agentId],
        description: `Agents ${a.agentName} and ${b.agentName} produced different outputs`,
        severity: 'medium',
      }
    }
    return null
  }

  /**
   * Compute majority output
   */
  private computeMajorityOutput(results: AgentResult[]): unknown {
    if (results.length === 0) return null

    // Count occurrences of each output
    const outputCounts = new Map<string, { count: number; output: unknown }>()

    for (const result of results) {
      const key = JSON.stringify(result.output)
      const existing = outputCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        outputCounts.set(key, { count: 1, output: result.output })
      }
    }

    // Find most common
    let maxCount = 0
    let majorityOutput: unknown = null

    for (const { count, output } of outputCounts.values()) {
      if (count > maxCount) {
        maxCount = count
        majorityOutput = output
      }
    }

    return majorityOutput
  }

  /**
   * Compute weighted output (by inverse execution time)
   */
  private computeWeightedOutput(results: AgentResult[]): unknown {
    if (results.length === 0) return null
    if (results.length === 1) return results[0].output

    // Weight by inverse of execution time (faster = higher weight)
    const weights = results.map(r => ({
      weight: r.executionTime > 0 ? 1 / r.executionTime : 1,
      output: r.output,
    }))

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)

    // For text outputs, return the one with highest weight
    // For numeric outputs, could compute weighted average
    const best = weights.sort((a, b) => b.weight - a.weight)[0]
    return best.output
  }

  /**
   * Get best result (fastest successful)
   */
  private getBestResult(results: AgentResult[]): AgentResult | undefined {
    if (results.length === 0) return undefined
    return results.sort((a, b) => a.executionTime - b.executionTime)[0]
  }

  /**
   * Calculate capability score for agent-task matching
   */
  private calculateCapabilityScore(agent: AgentCapabilities, task: OrchestratorTask): number {
    let score = 0

    if (task.requiredCapabilities) {
      for (const cap of task.requiredCapabilities) {
        if (agent.skills.includes(cap)) {
          score += 10
        }
      }
    }

    if (task.requiredSkills) {
      for (const skill of task.requiredSkills) {
        if (agent.skills.includes(skill)) {
          score += 15
        }
      }
    }

    // Lower load = higher score
    score += Math.max(0, 10 - agent.currentLoad)

    return score
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get execution history
   */
  getExecutionHistory(taskId: string): AgentResult[] | undefined {
    return this.executionHistory.get(taskId)
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory.clear()
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a multi-agent orchestrator with default configuration
 */
export function createMultiAgentOrchestrator(
  registry: AgentRegistry,
  executor: AgentExecutor
): MultiAgentOrchestrator {
  return new MultiAgentOrchestrator(registry, executor)
}

// ============================================================================
// Predefined Collaboration Templates
// ============================================================================

/**
 * Predefined collaboration scenarios
 */
export const CollaborationScenarios = {
  /**
   * Code Review: 3 agents in parallel
   */
  CODE_REVIEW: 'code_review',

  /**
   * Fault Diagnosis: 3 agents in sequence with conditional routing
   */
  FAULT_DIAGNOSIS: 'fault_diagnosis',

  /**
   * Content Creation: 3 agents in sequence workflow
   */
  CONTENT_CREATION: 'content_creation',
} as const

// ============================================================================
// Export Types
// ============================================================================

export type {
  AgentRegistration,
  AgentRegistry,
  Task,
  TaskState,
  Message,
  Artifact,
  AgentExecutor,
  RequestContext,
}
