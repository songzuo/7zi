/**
 * Scheduler Store (Zustand)
 * State management for AI Agent Scheduler
 */

import { create } from 'zustand'
import { AgentCapability, AgentProvider } from '../models/agent-capability'
import { Task, TaskPriority, TaskStatus } from '../models/task-model'
import { ScheduleDecision } from '../models/schedule-decision'
import { AgentScheduler } from '../core/scheduler'

/**
 * Scheduler store state
 */
interface SchedulerState {
  /** Main scheduler instance */
  scheduler: AgentScheduler | null

  /** All agents */
  agents: AgentCapability[]

  /** All tasks */
  tasks: Task[]

  /** Pending tasks */
  pendingTasks: Task[]

  /** Recent decisions */
  recentDecisions: ScheduleDecision[]

  /** Selected task ID */
  selectedTaskId: string | null

  /** Selected agent ID */
  selectedAgentId: string | null

  /** Is loading */
  isLoading: boolean

  /** Error message */
  error: string | null

  /** Statistics */
  stats: {
    totalTasks: number
    pendingTasks: number
    completedTasks: number
    failedTasks: number
    averageConfidence: number
  }

  /** Actions */
  initialize: () => void
  addTask: (task: Task) => void
  addTasks: (tasks: Task[]) => void
  selectTask: (taskId: string | null) => void
  selectAgent: (agentId: string | null) => void
  completeTask: (taskId: string) => void
  failTask: (taskId: string, error: string) => void
  scheduleTask: (taskId: string) => Promise<ScheduleDecision | null>
  scheduleNextBatch: () => Promise<void>
  manualAssign: (taskId: string, agentId: string, userId: string) => ScheduleDecision | null
  setAgentAvailability: (agentId: string, available: boolean) => void
  refresh: () => void
  clearError: () => void
  updateConfig: (config: unknown) => void
}

/**
 * Create scheduler store
 */
export const useSchedulerStore = create<SchedulerState>((set, get) => ({
  scheduler: null,
  agents: [],
  tasks: [],
  pendingTasks: [],
  recentDecisions: [],
  selectedTaskId: null,
  selectedAgentId: null,
  isLoading: false,
  error: null,
  stats: {
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageConfidence: 0,
  },

  /**
   * Initialize scheduler
   */
  initialize: () => {
    try {
      set({ isLoading: true, error: null })

      const scheduler = new AgentScheduler({
        autoSchedule: true,
        allowManualOverride: true,
        maxBatchSize: 10,
        schedulingInterval: 30000,
      })

      scheduler.initialize()

      const agents = Array.from(scheduler.getAgents().values())
      const stats = scheduler.getTaskStats()
      const metrics = scheduler.getMetrics()

      set({
        scheduler,
        agents,
        tasks: scheduler.getAllTasks(),
        pendingTasks: scheduler.getPendingTasks(),
        recentDecisions: scheduler.getRecentDecisions(10),
        isLoading: false,
        stats: {
          totalTasks: stats.total,
          pendingTasks: stats.pending,
          completedTasks: stats.completed,
          failedTasks: stats.failed,
          averageConfidence: metrics.averageConfidence,
        },
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to initialize scheduler'
      set({
        isLoading: false,
        error: message,
      })
    }
  },

  /**
   * Add a task
   */
  addTask: (task: Task) => {
    const { scheduler } = get()
    if (!scheduler) return

    scheduler.addTask(task)
    get().refresh()
  },

  /**
   * Add multiple tasks
   */
  addTasks: (tasks: Task[]) => {
    const { scheduler } = get()
    if (!scheduler) return

    scheduler.addTasks(tasks)
    get().refresh()
  },

  /**
   * Select a task
   */
  selectTask: (taskId: string | null) => {
    set({ selectedTaskId: taskId })
  },

  /**
   * Select an agent
   */
  selectAgent: (agentId: string | null) => {
    set({ selectedAgentId: agentId })
  },

  /**
   * Mark task as completed
   */
  completeTask: (taskId: string) => {
    const { scheduler } = get()
    if (!scheduler) return

    scheduler.completeTask(taskId)
    get().refresh()
  },

  /**
   * Mark task as failed
   */
  failTask: (taskId: string, error: string) => {
    const { scheduler } = get()
    if (!scheduler) return

    scheduler.failTask(taskId, error)
    get().refresh()
  },

  /**
   * Schedule a single task
   */
  scheduleTask: async (taskId: string) => {
    const { scheduler } = get()
    if (!scheduler) return null

    set({ isLoading: true, error: null })

    try {
      const decision = await scheduler.scheduleTask(taskId)
      get().refresh()
      return decision
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to schedule task'
      set({
        isLoading: false,
        error: message,
      })
      return null
    }
  },

  /**
   * Schedule next batch of tasks
   */
  scheduleNextBatch: async () => {
    const { scheduler } = get()
    if (!scheduler) return

    set({ isLoading: true, error: null })

    try {
      await scheduler.scheduleNextBatch()
      get().refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to schedule batch'
      set({
        isLoading: false,
        error: message,
      })
    }
  },

  /**
   * Manually assign task to agent
   */
  manualAssign: (taskId: string, agentId: string, userId: string) => {
    const { scheduler } = get()
    if (!scheduler) {
      throw new Error('Scheduler not initialized')
    }

    const decision = scheduler.manualAssign(taskId, agentId, userId)
    get().refresh()
    return decision
  },

  /**
   * Set agent availability
   */
  setAgentAvailability: (agentId: string, available: boolean) => {
    const { scheduler } = get()
    if (!scheduler) return

    scheduler.setAgentAvailability(agentId, available)
    get().refresh()
  },

  /**
   * Refresh all data
   */
  refresh: () => {
    const { scheduler } = get()
    if (!scheduler) return

    const agents = Array.from(scheduler.getAgents().values())
    const tasks = scheduler.getAllTasks()
    const pendingTasks = scheduler.getPendingTasks()
    const recentDecisions = scheduler.getRecentDecisions(10)
    const stats = scheduler.getTaskStats()
    const metrics = scheduler.getMetrics()

    set({
      agents,
      tasks,
      pendingTasks,
      recentDecisions,
      stats: {
        totalTasks: stats.total,
        pendingTasks: stats.pending,
        completedTasks: stats.completed,
        failedTasks: stats.failed,
        averageConfidence: metrics.averageConfidence,
      },
      isLoading: false,
    })
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null })
  },

  /**
   * Update scheduler configuration
   */
  updateConfig: (config: unknown) => {
    const { scheduler } = get()
    if (!scheduler) return
    if (typeof config === 'object' && config !== null) {
      scheduler.updateConfig(config as Record<string, unknown>)
    }
    get().refresh()
  },
}))

/**
 * Selectors
 */
export const selectScheduler = (state: SchedulerState) => state.scheduler
export const selectAgents = (state: SchedulerState) => state.agents
export const selectTasks = (state: SchedulerState) => state.tasks
export const selectPendingTasks = (state: SchedulerState) => state.pendingTasks
export const selectRecentDecisions = (state: SchedulerState) => state.recentDecisions
export const selectSelectedTask = (state: SchedulerState) => {
  if (!state.selectedTaskId) return null
  return state.tasks.find(t => t.id === state.selectedTaskId) || null
}
export const selectSelectedAgent = (state: SchedulerState) => {
  if (!state.selectedAgentId) return null
  return state.agents.find(a => a.agentId === state.selectedAgentId) || null
}
export const selectStats = (state: SchedulerState) => state.stats
export const selectIsLoading = (state: SchedulerState) => state.isLoading
export const selectError = (state: SchedulerState) => state.error

/**
 * Computed selectors
 */
export const selectAgentAvailability = (state: SchedulerState) => {
  const available = state.agents.filter(a => a.availability).length
  const total = state.agents.length
  return {
    available,
    total,
    percentage: total > 0 ? (available / total) * 100 : 0,
  }
}

export const selectTaskByStatus = (status: TaskStatus) => (state: SchedulerState) => {
  return state.tasks.filter(t => t.status === status)
}

export const selectTasksByAgent = (agentId: string) => (state: SchedulerState) => {
  return state.tasks.filter(t => t.assignedAgent === agentId)
}

export const selectUrgentTasks = (state: SchedulerState) => {
  return state.tasks.filter(t => t.priority === 'urgent' || t.priority === 'high')
}

export const selectOverdueTasks = (state: SchedulerState) => {
  const now = Date.now()
  return state.tasks.filter(
    t => t.deadline && t.deadline < now && t.status !== 'completed' && t.status !== 'cancelled'
  )
}

export const selectAgentUtilization = (state: SchedulerState) => {
  return state.agents.map(agent => ({
    agentId: agent.agentId,
    name: agent.name,
    currentLoad: agent.currentLoad,
    taskCount: state.tasks.filter(t => t.assignedAgent === agent.agentId).length,
  }))
}
