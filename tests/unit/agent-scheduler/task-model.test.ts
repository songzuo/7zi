/**
 * Task Model Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  Task,
  TaskQueue,
  createTask,
  PRIORITY_WEIGHTS,
  TaskPriority,
} from '@/lib/agents/scheduler/models/task-model'

describe('Task Model', () => {
  describe('createTask', () => {
    it('should create task with default values', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test Task',
      })

      expect(task.id).toBe('task-1')
      expect(task.type).toBe('implementation')
      expect(task.title).toBe('Test Task')
      expect(task.priority).toBe('medium')
      expect(task.status).toBe('pending')
      expect(task.requiredCapabilities).toEqual([])
      expect(task.estimatedDuration).toBe(30)
      expect(task.dependencies).toEqual([])
    })

    it('should allow custom values', () => {
      const deadline = Date.now() + 3600000 // 1 hour from now

      const task = createTask({
        id: 'task-2',
        type: 'architecture',
        title: 'Design System',
        priority: 'high',
        requiredCapabilities: ['typescript', 'react'],
        estimatedDuration: 120,
        dependencies: ['task-1'],
        deadline,
        description: 'Design new architecture',
      })

      expect(task.priority).toBe('high')
      expect(task.requiredCapabilities).toEqual(['typescript', 'react'])
      expect(task.estimatedDuration).toBe(120)
      expect(task.dependencies).toEqual(['task-1'])
      expect(task.deadline).toBe(deadline)
      expect(task.description).toBe('Design new architecture')
    })

    it('should set creation time', () => {
      const before = Date.now()
      const task = createTask({
        id: 'task-3',
        type: 'testing',
        title: 'Test',
      })
      const after = Date.now()

      expect(task.createdAt).toBeGreaterThanOrEqual(before)
      expect(task.createdAt).toBeLessThanOrEqual(after)
    })
  })

  describe('PRIORITY_WEIGHTS', () => {
    it('should have correct priority order', () => {
      expect(PRIORITY_WEIGHTS.low).toBe(1)
      expect(PRIORITY_WEIGHTS.medium).toBe(2)
      expect(PRIORITY_WEIGHTS.high).toBe(3)
      expect(PRIORITY_WEIGHTS.urgent).toBe(4)
    })

    it('should have increasing weights', () => {
      expect(PRIORITY_WEIGHTS.low).toBeLessThan(PRIORITY_WEIGHTS.medium)
      expect(PRIORITY_WEIGHTS.medium).toBeLessThan(PRIORITY_WEIGHTS.high)
      expect(PRIORITY_WEIGHTS.high).toBeLessThan(PRIORITY_WEIGHTS.urgent)
    })
  })
})

describe('TaskQueue', () => {
  let queue: TaskQueue

  beforeEach(() => {
    queue = new TaskQueue()
  })

  describe('addTask', () => {
    it('should add task to queue', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test',
      })

      queue.addTask(task)

      expect(queue.getTask('task-1')).toEqual(task)
    })

    it('should add multiple tasks', () => {
      const tasks = [
        createTask({ id: 'task-1', type: 'implementation', title: 'A' }),
        createTask({ id: 'task-2', type: 'testing', title: 'B' }),
        createTask({ id: 'task-3', type: 'architecture', title: 'C' }),
      ]

      tasks.forEach(t => queue.addTask(t))

      expect(queue.getAllTasks()).toHaveLength(3)
    })
  })

  describe('getPendingTasks', () => {
    it('should return pending tasks in priority order', () => {
      const tasks = [
        createTask({ id: 'task-1', type: 'implementation', title: 'Low', priority: 'low' }),
        createTask({ id: 'task-2', type: 'testing', title: 'Urgent', priority: 'urgent' }),
        createTask({ id: 'task-3', type: 'architecture', title: 'High', priority: 'high' }),
      ]

      tasks.forEach(t => queue.addTask(t))

      const pending = queue.getPendingTasks()

      expect(pending[0].id).toBe('task-2') // Urgent
      expect(pending[1].id).toBe('task-3') // High
      expect(pending[2].id).toBe('task-1') // Low
    })

    it('should sort by deadline when priority is equal', () => {
      const now = Date.now()

      const tasks = [
        createTask({
          id: 'task-1',
          type: 'implementation',
          title: 'A',
          priority: 'medium',
          deadline: now + 7200000, // 2 hours
        }),
        createTask({
          id: 'task-2',
          type: 'testing',
          title: 'B',
          priority: 'medium',
          deadline: now + 3600000, // 1 hour
        }),
      ]

      tasks.forEach(t => queue.addTask(t))

      const pending = queue.getPendingTasks()

      expect(pending[0].id).toBe('task-2') // Earlier deadline
      expect(pending[1].id).toBe('task-1')
    })
  })

  describe('updateTaskStatus', () => {
    it('should update task status', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test',
      })

      queue.addTask(task)
      queue.updateTaskStatus('task-1', 'assigned', 'agent-1')

      const updated = queue.getTask('task-1')

      expect(updated?.status).toBe('assigned')
      expect(updated?.assignedAgent).toBe('agent-1')
    })

    it('should set startedAt when status is in_progress', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test',
      })

      queue.addTask(task)
      queue.updateTaskStatus('task-1', 'in_progress')

      const updated = queue.getTask('task-1')

      expect(updated?.startedAt).toBeDefined()
    })

    it('should set completedAt when task completes', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test',
      })

      queue.addTask(task)
      queue.updateTaskStatus('task-1', 'completed')

      const updated = queue.getTask('task-1')

      expect(updated?.completedAt).toBeDefined()
    })
  })

  describe('areDependenciesSatisfied', () => {
    it('should return true when no dependencies', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test',
      })

      queue.addTask(task)

      expect(queue.areDependenciesSatisfied(task)).toBe(true)
    })

    it('should return false when dependency not completed', () => {
      const dep = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Dep',
      })

      const task = createTask({
        id: 'task-2',
        type: 'testing',
        title: 'Main',
        dependencies: ['task-1'],
      })

      queue.addTask(dep)
      queue.addTask(task)

      expect(queue.areDependenciesSatisfied(task)).toBe(false)
    })

    it('should return true when dependency is completed', () => {
      const dep = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Dep',
      })

      const task = createTask({
        id: 'task-2',
        type: 'testing',
        title: 'Main',
        dependencies: ['task-1'],
      })

      queue.addTask(dep)
      queue.addTask(task)

      queue.updateTaskStatus('task-1', 'completed')

      expect(queue.areDependenciesSatisfied(task)).toBe(true)
    })
  })

  describe('getReadyTasks', () => {
    it('should return only tasks with satisfied dependencies', () => {
      const dep = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Dep',
      })

      const task2 = createTask({
        id: 'task-2',
        type: 'testing',
        title: 'Main',
        dependencies: ['task-1'],
      })

      const task3 = createTask({
        id: 'task-3',
        type: 'architecture',
        title: 'Independent',
      })

      queue.addTask(dep)
      queue.addTask(task2)
      queue.addTask(task3)

      const ready = queue.getReadyTasks()

      expect(ready).toHaveLength(2) // task-1 and task-3
      expect(ready.find(t => t.id === 'task-2')).toBeUndefined()
    })
  })

  describe('getOverdueTasks', () => {
    it('should return overdue tasks', () => {
      const overdue = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Overdue',
        deadline: Date.now() - 1000, // 1 second ago
      })

      const future = createTask({
        id: 'task-2',
        type: 'testing',
        title: 'Future',
        deadline: Date.now() + 3600000, // 1 hour from now
      })

      queue.addTask(overdue)
      queue.addTask(future)

      const overdueTasks = queue.getOverdueTasks()

      expect(overdueTasks).toHaveLength(1)
      expect(overdueTasks[0].id).toBe('task-1')
    })

    it('should not include completed tasks', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Overdue',
        deadline: Date.now() - 1000,
      })

      queue.addTask(task)
      queue.updateTaskStatus('task-1', 'completed')

      expect(queue.getOverdueTasks()).toHaveLength(0)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const tasks = [
        createTask({ id: 'task-1', type: 'implementation', title: 'A' }),
        createTask({ id: 'task-2', type: 'testing', title: 'B' }),
        createTask({ id: 'task-3', type: 'architecture', title: 'C' }),
      ]

      tasks.forEach(t => queue.addTask(t))

      queue.updateTaskStatus('task-1', 'completed')
      queue.updateTaskStatus('task-2', 'assigned', 'agent-1')

      const stats = queue.getStats()

      expect(stats.total).toBe(3)
      expect(stats.completed).toBe(1)
      expect(stats.pending).toBe(1)
      expect(stats.assigned).toBe(1)
    })
  })
})
