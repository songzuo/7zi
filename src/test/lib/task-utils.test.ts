import { describe, it, expect } from 'vitest'
import {
  getRoleForTaskType,
  getPriorityLevel,
  getStatusOrder,
  sortTasks,
  filterTasksByType,
  filterTasksByStatus,
  getTaskStats,
  validateTaskData,
} from '@/lib/utils/task-utils'
import { Task, AI_MEMBER_ROLES } from '@/lib/types/task-types'

// Helper to create mock tasks
const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'test-id',
  title: 'Test Task',
  description: 'Test description',
  type: 'development',
  priority: 'medium',
  status: 'pending',
  createdBy: 'user',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  comments: [],
  history: [],
  ...overrides,
})

describe('task-utils', () => {
  describe('getRoleForTaskType', () => {
    it('returns EXECUTOR for development tasks', () => {
      expect(getRoleForTaskType('development')).toBe(AI_MEMBER_ROLES.EXECUTOR)
    })

    it('returns DESIGNER for design tasks', () => {
      expect(getRoleForTaskType('design')).toBe(AI_MEMBER_ROLES.DESIGNER)
    })

    it('returns CONSULTANT for research tasks', () => {
      expect(getRoleForTaskType('research')).toBe(AI_MEMBER_ROLES.CONSULTANT)
    })

    it('returns PROMOTER for marketing tasks', () => {
      expect(getRoleForTaskType('marketing')).toBe(AI_MEMBER_ROLES.PROMOTER)
    })

    it('returns GENERAL for other tasks', () => {
      expect(getRoleForTaskType('other')).toBe(AI_MEMBER_ROLES.GENERAL)
    })
  })

  describe('getPriorityLevel', () => {
    it('returns 4 for urgent priority', () => {
      expect(getPriorityLevel('urgent')).toBe(4)
    })

    it('returns 3 for high priority', () => {
      expect(getPriorityLevel('high')).toBe(3)
    })

    it('returns 2 for medium priority', () => {
      expect(getPriorityLevel('medium')).toBe(2)
    })

    it('returns 1 for low priority', () => {
      expect(getPriorityLevel('low')).toBe(1)
    })

    it('returns 0 for unknown priority (default)', () => {
      expect(getPriorityLevel('unknown' as Task['priority'])).toBe(0)
    })
  })

  describe('getStatusOrder', () => {
    it('returns 1 for pending status', () => {
      expect(getStatusOrder('pending')).toBe(1)
    })

    it('returns 2 for assigned status', () => {
      expect(getStatusOrder('assigned')).toBe(2)
    })

    it('returns 3 for in_progress status', () => {
      expect(getStatusOrder('in_progress')).toBe(3)
    })

    it('returns 4 for completed status', () => {
      expect(getStatusOrder('completed')).toBe(4)
    })

    it('returns 0 for unknown status (default)', () => {
      expect(getStatusOrder('unknown' as Task['status'])).toBe(0)
    })
  })

  describe('sortTasks', () => {
    it('sorts tasks by status first (pending comes first)', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'completed' }),
        createMockTask({ id: '2', status: 'pending' }),
        createMockTask({ id: '3', status: 'in_progress' }),
      ]

      const sorted = sortTasks(tasks)
      expect(sorted[0].status).toBe('pending')
      expect(sorted[1].status).toBe('in_progress')
      expect(sorted[2].status).toBe('completed')
    })

    it('sorts by priority within same status (urgent first)', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending', priority: 'low' }),
        createMockTask({ id: '2', status: 'pending', priority: 'urgent' }),
        createMockTask({ id: '3', status: 'pending', priority: 'high' }),
      ]

      const sorted = sortTasks(tasks)
      expect(sorted[0].priority).toBe('urgent')
      expect(sorted[1].priority).toBe('high')
      expect(sorted[2].priority).toBe('low')
    })

    it('sorts by creation date when status and priority are equal (newest first)', () => {
      const tasks = [
        createMockTask({ id: '1', createdAt: '2024-01-01T00:00:00.000Z' }),
        createMockTask({ id: '2', createdAt: '2024-01-03T00:00:00.000Z' }),
        createMockTask({ id: '3', createdAt: '2024-01-02T00:00:00.000Z' }),
      ]

      const sorted = sortTasks(tasks)
      expect(sorted[0].id).toBe('2') // newest
      expect(sorted[1].id).toBe('3')
      expect(sorted[2].id).toBe('1') // oldest
    })

    it('does not mutate the original array', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'completed' }),
        createMockTask({ id: '2', status: 'pending' }),
      ]

      sortTasks(tasks)
      expect(tasks[0].id).toBe('1') // Original order preserved
    })

    it('handles empty array', () => {
      expect(sortTasks([])).toEqual([])
    })

    it('handles single task', () => {
      const tasks = [createMockTask()]
      expect(sortTasks(tasks)).toHaveLength(1)
    })
  })

  describe('filterTasksByType', () => {
    it('filters tasks by development type', () => {
      const tasks = [
        createMockTask({ id: '1', type: 'development' }),
        createMockTask({ id: '2', type: 'design' }),
        createMockTask({ id: '3', type: 'development' }),
      ]

      const filtered = filterTasksByType(tasks, 'development')
      expect(filtered).toHaveLength(2)
      expect(filtered.every(t => t.type === 'development')).toBe(true)
    })

    it('filters tasks by design type', () => {
      const tasks = [
        createMockTask({ id: '1', type: 'development' }),
        createMockTask({ id: '2', type: 'design' }),
      ]

      const filtered = filterTasksByType(tasks, 'design')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].type).toBe('design')
    })

    it('returns all tasks when type is "all"', () => {
      const tasks = [
        createMockTask({ id: '1', type: 'development' }),
        createMockTask({ id: '2', type: 'design' }),
        createMockTask({ id: '3', type: 'research' }),
      ]

      const filtered = filterTasksByType(tasks, 'all')
      expect(filtered).toHaveLength(3)
    })

    it('returns empty array when no tasks match type', () => {
      const tasks = [
        createMockTask({ type: 'development' }),
        createMockTask({ type: 'design' }),
      ]

      const filtered = filterTasksByType(tasks, 'marketing')
      expect(filtered).toHaveLength(0)
    })

    it('handles empty array', () => {
      expect(filterTasksByType([], 'development')).toEqual([])
    })
  })

  describe('filterTasksByStatus', () => {
    it('filters tasks by pending status', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending' }),
        createMockTask({ id: '2', status: 'completed' }),
        createMockTask({ id: '3', status: 'pending' }),
      ]

      const filtered = filterTasksByStatus(tasks, 'pending')
      expect(filtered).toHaveLength(2)
      expect(filtered.every(t => t.status === 'pending')).toBe(true)
    })

    it('filters tasks by completed status', () => {
      const tasks = [
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'completed' }),
      ]

      const filtered = filterTasksByStatus(tasks, 'completed')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].status).toBe('completed')
    })

    it('returns all tasks when status is "all"', () => {
      const tasks = [
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'in_progress' }),
      ]

      const filtered = filterTasksByStatus(tasks, 'all')
      expect(filtered).toHaveLength(3)
    })

    it('returns empty array when no tasks match status', () => {
      const tasks = [
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'completed' }),
      ]

      const filtered = filterTasksByStatus(tasks, 'assigned')
      expect(filtered).toHaveLength(0)
    })

    it('handles empty array', () => {
      expect(filterTasksByStatus([], 'pending')).toEqual([])
    })
  })

  describe('getTaskStats', () => {
    it('calculates correct stats for mixed tasks', () => {
      const tasks = [
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'assigned' }),
        createMockTask({ status: 'in_progress' }),
        createMockTask({ status: 'in_progress' }),
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'completed' }),
      ]

      const stats = getTaskStats(tasks)
      expect(stats.total).toBe(10)
      expect(stats.pending).toBe(2)
      expect(stats.assigned).toBe(1)
      expect(stats.inProgress).toBe(2)
      expect(stats.completed).toBe(5)
      expect(stats.completionRate).toBe(50) // 5/10 = 50%
    })

    it('returns zero stats for empty array', () => {
      const stats = getTaskStats([])
      expect(stats.total).toBe(0)
      expect(stats.pending).toBe(0)
      expect(stats.assigned).toBe(0)
      expect(stats.inProgress).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.completionRate).toBe(0)
    })

    it('calculates 100% completion rate when all completed', () => {
      const tasks = [
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'completed' }),
      ]

      const stats = getTaskStats(tasks)
      expect(stats.completionRate).toBe(100)
    })

    it('calculates 0% completion rate when none completed', () => {
      const tasks = [
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'in_progress' }),
      ]

      const stats = getTaskStats(tasks)
      expect(stats.completionRate).toBe(0)
    })

    it('rounds completion rate correctly', () => {
      const tasks = [
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'pending' }),
      ]

      const stats = getTaskStats(tasks)
      expect(stats.completionRate).toBe(33) // 1/3 = 33.33% -> rounds to 33
    })
  })

  describe('validateTaskData', () => {
    it('returns valid for complete task data', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Test description',
        type: 'development',
        priority: 'high',
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error for missing title', () => {
      const result = validateTaskData({
        description: 'Test description',
        type: 'development',
        priority: 'high',
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Title is required')
    })

    it('returns error for empty title', () => {
      const result = validateTaskData({
        title: '',
        description: 'Test description',
        type: 'development',
        priority: 'high',
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Title is required')
    })

    it('returns error for whitespace-only title', () => {
      const result = validateTaskData({
        title: '   ',
        description: 'Test description',
        type: 'development',
        priority: 'high',
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Title is required')
    })

    it('returns error for missing description', () => {
      const result = validateTaskData({
        title: 'Test Task',
        type: 'development',
        priority: 'high',
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Description is required')
    })

    it('returns error for empty description', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: '',
        type: 'development',
        priority: 'high',
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Description is required')
    })

    it('returns error for missing type', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Test description',
        priority: 'high',
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Task type is required')
    })

    it('returns error for missing priority', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Test description',
        type: 'development',
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Priority is required')
    })

    it('returns multiple errors for multiple missing fields', () => {
      const result = validateTaskData({})

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(4)
      expect(result.errors).toContain('Title is required')
      expect(result.errors).toContain('Description is required')
      expect(result.errors).toContain('Task type is required')
      expect(result.errors).toContain('Priority is required')
    })

    it('handles undefined values', () => {
      const result = validateTaskData({
        title: undefined,
        description: undefined,
        type: undefined,
        priority: undefined,
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(4)
    })
  })
})