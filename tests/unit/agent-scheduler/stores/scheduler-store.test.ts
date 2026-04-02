/**
 * Scheduler Store Unit Tests
 * Tests for useSchedulerStore Zustand store
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useSchedulerStore } from '@/lib/agents/scheduler/stores/scheduler-store'
import { Task, createTask } from '@/lib/agents/scheduler/models/task-model'

// Note: Zustand stores are designed for React and require React context
// These tests verify the store structure and synchronous methods
// Integration with React components would require testing-library

describe('SchedulerStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useSchedulerStore.getState()
    if (store.scheduler) {
      store.reset?.()
    }
  })

  describe('initial state', () => {
    it('should have correct initial state structure', () => {
      const state = useSchedulerStore.getState()

      expect(state).toHaveProperty('scheduler')
      expect(state).toHaveProperty('agents')
      expect(state).toHaveProperty('tasks')
      expect(state).toHaveProperty('pendingTasks')
      expect(state).toHaveProperty('recentDecisions')
      expect(state).toHaveProperty('selectedTaskId')
      expect(state).toHaveProperty('selectedAgentId')
      expect(state).toHaveProperty('isLoading')
      expect(state).toHaveProperty('error')
      expect(state).toHaveProperty('stats')
    })

    it('should have correct initial values', () => {
      const state = useSchedulerStore.getState()

      expect(state.scheduler).toBeNull()
      expect(state.agents).toEqual([])
      expect(state.tasks).toEqual([])
      expect(state.pendingTasks).toEqual([])
      expect(state.recentDecisions).toEqual([])
      expect(state.selectedTaskId).toBeNull()
      expect(state.selectedAgentId).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should have correct stats structure', () => {
      const state = useSchedulerStore.getState()

      expect(state.stats).toHaveProperty('totalTasks')
      expect(state.stats).toHaveProperty('pendingTasks')
      expect(state.stats).toHaveProperty('completedTasks')
      expect(state.stats).toHaveProperty('failedTasks')
      expect(state.stats).toHaveProperty('averageConfidence')
    })
  })

  describe('selectors', () => {
    it('should have all required selectors', () => {
      expect(typeof useSchedulerStore.getState().initialize).toBe('function')
      expect(typeof useSchedulerStore.getState().addTask).toBe('function')
      expect(typeof useSchedulerStore.getState().addTasks).toBe('function')
      expect(typeof useSchedulerStore.getState().selectTask).toBe('function')
      expect(typeof useSchedulerStore.getState().selectAgent).toBe('function')
      expect(typeof useSchedulerStore.getState().completeTask).toBe('function')
      expect(typeof useSchedulerStore.getState().failTask).toBe('function')
      expect(typeof useSchedulerStore.getState().scheduleTask).toBe('function')
      expect(typeof useSchedulerStore.getState().scheduleNextBatch).toBe('function')
      expect(typeof useSchedulerStore.getState().manualAssign).toBe('function')
      expect(typeof useSchedulerStore.getState().setAgentAvailability).toBe('function')
      expect(typeof useSchedulerStore.getState().refresh).toBe('function')
      expect(typeof useSchedulerStore.getState().clearError).toBe('function')
      expect(typeof useSchedulerStore.getState().updateConfig).toBe('function')
    })
  })

  describe('selection actions', () => {
    it('should update selectedTaskId', () => {
      const { selectTask } = useSchedulerStore.getState()

      selectTask('task123')

      expect(useSchedulerStore.getState().selectedTaskId).toBe('task123')
    })

    it('should update selectedAgentId', () => {
      const { selectAgent } = useSchedulerStore.getState()

      selectAgent('agent456')

      expect(useSchedulerStore.getState().selectedAgentId).toBe('agent456')
    })

    it('should clear selected task', () => {
      const { selectTask } = useSchedulerStore.getState()

      selectTask('task123')
      selectTask(null)

      expect(useSchedulerStore.getState().selectedTaskId).toBeNull()
    })

    it('should clear selected agent', () => {
      const { selectAgent } = useSchedulerStore.getState()

      selectAgent('agent456')
      selectAgent(null)

      expect(useSchedulerStore.getState().selectedAgentId).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should have clearError action', () => {
      const { clearError } = useSchedulerStore.getState()

      clearError()

      expect(useSchedulerStore.getState().error).toBeNull()
    })
  })

  describe('computed selectors', () => {
    // Test computed selector exports
    it('should export selectScheduler', async () => {
      const { selectScheduler } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectScheduler).toBe('function')
    })

    it('should export selectAgents', async () => {
      const { selectAgents } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectAgents).toBe('function')
    })

    it('should export selectTasks', async () => {
      const { selectTasks } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectTasks).toBe('function')
    })

    it('should export selectPendingTasks', async () => {
      const { selectPendingTasks } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectPendingTasks).toBe('function')
    })

    it('should export selectRecentDecisions', async () => {
      const { selectRecentDecisions } =
        await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectRecentDecisions).toBe('function')
    })

    it('should export selectStats', async () => {
      const { selectStats } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectStats).toBe('function')
    })

    it('should export selectIsLoading', async () => {
      const { selectIsLoading } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectIsLoading).toBe('function')
    })

    it('should export selectError', async () => {
      const { selectError } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectError).toBe('function')
    })

    it('should export selectAgentAvailability', async () => {
      const { selectAgentAvailability } =
        await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectAgentAvailability).toBe('function')
    })

    it('should export selectUrgentTasks', async () => {
      const { selectUrgentTasks } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectUrgentTasks).toBe('function')
    })

    it('should export selectOverdueTasks', async () => {
      const { selectOverdueTasks } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectOverdueTasks).toBe('function')
    })

    it('should export selectAgentUtilization', async () => {
      const { selectAgentUtilization } =
        await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectAgentUtilization).toBe('function')
    })

    it('should export selectTaskByStatus', async () => {
      const { selectTaskByStatus } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectTaskByStatus).toBe('function')
    })

    it('should export selectTasksByAgent', async () => {
      const { selectTasksByAgent } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectTasksByAgent).toBe('function')
    })

    it('should export selectSelectedTask', async () => {
      const { selectSelectedTask } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectSelectedTask).toBe('function')
    })

    it('should export selectSelectedAgent', async () => {
      const { selectSelectedAgent } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      expect(typeof selectSelectedAgent).toBe('function')
    })
  })

  describe('selectTaskByStatus', () => {
    it('should return a selector function', async () => {
      const { selectTaskByStatus } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      const selector = selectTaskByStatus('pending')
      expect(typeof selector).toBe('function')
    })
  })

  describe('selectTasksByAgent', () => {
    it('should return a selector function', async () => {
      const { selectTasksByAgent } = await import('@/lib/agents/scheduler/stores/scheduler-store')
      const selector = selectTasksByAgent('agent1')
      expect(typeof selector).toBe('function')
    })
  })
})
