/**
 * Load Balancer
 * Distributes tasks evenly across agents based on capacity and performance
 */

import { AgentCapability } from '../models/agent-capability'
import { Task } from '../models/task-model'

/**
 * Load balancing configuration
 */
export interface LoadBalanceConfig {
  /** Maximum load percentage per agent */
  maxLoadThreshold: number

  /** Load threshold to consider agent busy */
  busyThreshold: number

  /** Prefer agents with lower current load */
  preferLowLoad: boolean

  /** Consider agent specialization */
  considerSpecialization: boolean
}

/**
 * Load balancing result
 */
export interface LoadBalanceResult {
  /** Recommended agents in order */
  recommendedAgents: string[]

  /** Agent load percentages */
  agentLoads: Map<string, number>

  /** Reasoning for recommendation */
  reasoning: string
}

/**
 * Default load balancing configuration
 */
const DEFAULT_CONFIG: LoadBalanceConfig = {
  maxLoadThreshold: 90,
  busyThreshold: 70,
  preferLowLoad: true,
  considerSpecialization: true,
}

/**
 * Load balancer for distributing work across agents
 */
export class LoadBalancer {
  private config: LoadBalanceConfig
  private agentHistory: Map<string, { completed: number; failed: number }>

  constructor(config?: Partial<LoadBalanceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.agentHistory = new Map()
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoadBalanceConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoadBalanceConfig {
    return { ...this.config }
  }

  /**
   * Calculate load percentage for an agent after accepting a task
   */
  calculateNewLoad(agent: AgentCapability, task: Task): number {
    const taskLoad = (task.estimatedDuration / 60) * 100
    return agent.currentLoad + taskLoad
  }

  /**
   * Check if agent is at capacity
   */
  isAgentAtCapacity(agent: AgentCapability, task: Task): boolean {
    const newLoad = this.calculateNewLoad(agent, task)
    return newLoad > this.config.maxLoadThreshold
  }

  /**
   * Check if agent is busy
   */
  isAgentBusy(agent: AgentCapability): boolean {
    return agent.currentLoad >= this.config.busyThreshold
  }

  /**
   * Get available agents (not at capacity)
   */
  getAvailableAgents(agents: Map<string, AgentCapability>, task: Task): AgentCapability[] {
    return Array.from(agents.values()).filter(
      agent => !this.isAgentAtCapacity(agent, task) && agent.availability
    )
  }

  /**
   * Get least loaded agent
   */
  getLeastLoadedAgent(agents: AgentCapability[]): AgentCapability | null {
    if (agents.length === 0) {
      return null
    }

    return agents.reduce((least, current) =>
      current.currentLoad < least.currentLoad ? current : least
    )
  }

  /**
   * Get least loaded agents (top N)
   */
  getLeastLoadedAgents(agents: AgentCapability[], count: number): AgentCapability[] {
    const sorted = [...agents].sort((a, b) => a.currentLoad - b.currentLoad)
    return sorted.slice(0, count)
  }

  /**
   * Balance load across agents
   */
  balanceLoad(
    agents: Map<string, AgentCapability>,
    task: Task,
    candidateIds?: string[]
  ): LoadBalanceResult {
    const candidates = candidateIds
      ? (candidateIds.map(id => agents.get(id)).filter(Boolean) as AgentCapability[])
      : this.getAvailableAgents(agents, task)

    if (candidates.length === 0) {
      return {
        recommendedAgents: [],
        agentLoads: new Map(),
        reasoning: 'No agents available with sufficient capacity',
      }
    }

    // Sort candidates by load
    const sortedByLoad = [...candidates].sort((a, b) => a.currentLoad - b.currentLoad)

    // Calculate new loads
    const agentLoads = new Map<string, number>()
    for (const agent of sortedByLoad) {
      const newLoad = this.calculateNewLoad(agent, task)
      agentLoads.set(agent.agentId, newLoad)
    }

    // Generate recommendation
    const recommendedAgents = sortedByLoad.map(agent => agent.agentId)

    // Generate reasoning
    const reasoning = this.generateLoadBalanceReasoning(sortedByLoad, task)

    return {
      recommendedAgents,
      agentLoads,
      reasoning,
    }
  }

  /**
   * Generate reasoning for load balance decision
   */
  private generateLoadBalanceReasoning(agents: AgentCapability[], task: Task): string {
    const topAgent = agents[0]
    const load = this.calculateNewLoad(topAgent, task)
    const loadPercent = load.toFixed(1)

    let reason = `Selected ${topAgent.name} with current load of ${topAgent.currentLoad.toFixed(1)}%`
    reason += ` (${loadPercent}% after task assignment).`

    if (this.config.preferLowLoad) {
      const minLoad = agents[0].currentLoad
      const maxLoad = agents[agents.length - 1].currentLoad
      reason += ` Preferencing low-load agent (${minLoad.toFixed(1)}% vs ${maxLoad.toFixed(1)}%).`
    }

    return reason
  }

  /**
   * Redistribute tasks from overloaded agent
   */
  redistributeTasks(
    overloadedAgentId: string,
    agents: Map<string, AgentCapability>,
    task: Task
  ): string[] {
    const overloadedAgent = agents.get(overloadedAgentId)
    if (!overloadedAgent) {
      return []
    }

    const otherAgents = Array.from(agents.entries())
      .filter(([id]) => id !== overloadedAgentId)
      .map(([, agent]) => agent)

    // Find agents that can take the task
    const capableAgents = otherAgents.filter(agent => !this.isAgentAtCapacity(agent, task))

    return capableAgents.map(agent => agent.agentId)
  }

  /**
   * Update agent load after task assignment
   */
  updateAgentLoad(agents: Map<string, AgentCapability>, agentId: string, loadDelta: number): void {
    const agent = agents.get(agentId)
    if (agent) {
      agent.currentLoad = Math.max(0, Math.min(100, agent.currentLoad + loadDelta))
    }
  }

  /**
   * Record task completion for an agent
   */
  recordTaskCompletion(agentId: string, success: boolean): void {
    const history = this.agentHistory.get(agentId) || { completed: 0, failed: 0 }

    if (success) {
      history.completed++
    } else {
      history.failed++
    }

    this.agentHistory.set(agentId, history)
  }

  /**
   * Get agent performance metrics
   */
  getAgentPerformance(agentId: string): {
    completed: number
    failed: number
    total: number
    successRate: number
  } | null {
    const history = this.agentHistory.get(agentId)
    if (!history) {
      return null
    }

    const total = history.completed + history.failed
    const successRate = total > 0 ? history.completed / total : 1.0

    return {
      completed: history.completed,
      failed: history.failed,
      total,
      successRate,
    }
  }

  /**
   * Get all agents sorted by availability
   */
  getAgentsByAvailability(agents: Map<string, AgentCapability>): AgentCapability[] {
    return Array.from(agents.values()).sort((a, b) => {
      // First by availability (available first)
      if (a.availability && !b.availability) return -1
      if (!a.availability && b.availability) return 1

      // Then by load (lower load first)
      return a.currentLoad - b.currentLoad
    })
  }

  /**
   * Get load distribution statistics
   */
  getLoadStats(agents: Map<string, AgentCapability>): {
    totalLoad: number
    averageLoad: number
    maxLoad: number
    minLoad: number
    overloadedAgents: string[]
    busyAgents: string[]
    idleAgents: string[]
  } {
    const agentArray = Array.from(agents.values())
    const loads = agentArray.map(a => a.currentLoad)

    const totalLoad = loads.reduce((sum, load) => sum + load, 0)
    const averageLoad = totalLoad / agentArray.length
    const maxLoad = Math.max(...loads)
    const minLoad = Math.min(...loads)

    const overloadedAgents = agentArray
      .filter(a => a.currentLoad >= this.config.maxLoadThreshold)
      .map(a => a.agentId)

    const busyAgents = agentArray
      .filter(a => a.currentLoad >= this.config.busyThreshold)
      .map(a => a.agentId)

    const idleAgents = agentArray.filter(a => a.currentLoad < 20).map(a => a.agentId)

    return {
      totalLoad,
      averageLoad,
      maxLoad,
      minLoad,
      overloadedAgents,
      busyAgents,
      idleAgents,
    }
  }

  /**
   * Check if system is overloaded
   */
  isSystemOverloaded(agents: Map<string, AgentCapability>): boolean {
    const stats = this.getLoadStats(agents)

    // System is overloaded if average load > 80% or >50% agents overloaded
    return stats.averageLoad > 80 || stats.overloadedAgents.length > agents.size / 2
  }

  /**
   * Suggest scale-up or scale-down
   */
  suggestScaling(agents: Map<string, AgentCapability>): {
    action: 'scale-up' | 'scale-down' | 'none'
    reason: string
    targetAgentCount?: number
  } {
    const stats = this.getLoadStats(agents)

    // Scale up if overloaded
    if (this.isSystemOverloaded(agents)) {
      const currentCount = agents.size
      const overloadedCount = stats.overloadedAgents.length

      return {
        action: 'scale-up',
        reason: `System overloaded: ${stats.averageLoad.toFixed(1)}% avg load, ${overloadedCount}/${currentCount} agents overloaded`,
        targetAgentCount: currentCount + Math.ceil(overloadedCount / 2),
      }
    }

    // Scale down if underutilized
    if (stats.averageLoad < 30 && agents.size > 3) {
      const idleCount = stats.idleAgents.length

      return {
        action: 'scale-down',
        reason: `System underutilized: ${stats.averageLoad.toFixed(1)}% avg load, ${idleCount} idle agents`,
        targetAgentCount: Math.max(3, agents.size - Math.floor(idleCount / 2)),
      }
    }

    return {
      action: 'none',
      reason: `System load is balanced: ${stats.averageLoad.toFixed(1)}% average`,
    }
  }

  /**
   * Reset load balancer state
   */
  reset(): void {
    this.agentHistory.clear()
  }
}
