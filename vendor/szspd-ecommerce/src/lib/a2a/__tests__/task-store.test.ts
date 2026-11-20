/**
 * A2A Protocol v2 - Task Store Tests
 * 测试增强任务存储功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  InMemoryTaskStore,
  FileTaskStore,
  getTaskStore,
} from '../task-store'
import { TaskPriority } from '../types'
import * as fs from 'fs'

describe('InMemoryTaskStore', () => {
  let store: InMemoryTaskStore

  beforeEach(() => {
    store = new InMemoryTaskStore()
  })

  afterEach(() => {
    store.clear()
  })

  describe('createTaskWithPriority', () => {
    it('should create task with priority', () => {
      const task = store.createTaskWithPriority('context', { data: 'test' }, 'high')

      expect(task.id).toBeDefined()
      expect(task.name).toBe('context')
      expect(task.priority).toBe('high')
      expect(task.status).toBe('pending')
      expect(task.createdAt).toBeDefined()
    })

    it('should reject invalid priority', () => {
      expect(() => {
        store.createTaskWithPriority('context', {}, 'invalid' as TaskPriority)
      }).toThrow()
    })

    it('should initialize async status', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      const status = store.getAsyncTaskStatus(task.id)

      expect(status).toBeDefined()
      expect(status?.state).toBe('pending')
      expect(status?.progress).toBe(0)
    })

    it('should emit task:created event', () => {
      let eventEmitted = false

      store.on('task:created', () => {
        eventEmitted = true
      })

      store.createTaskWithPriority('context', {}, 'normal')

      expect(eventEmitted).toBe(true)
    })
  })

  describe('updateTaskPriority', () => {
    it('should update task priority', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      const result = store.updateTaskPriority(task.id, 'critical')

      expect(result).toBe(true)

      const updated = store.getTask(task.id)
      expect(updated?.priority).toBe('critical')
    })

    it('should return false for non-existent task', () => {
      const result = store.updateTaskPriority('non-existent', 'high')
      expect(result).toBe(false)
    })

    it('should reject invalid priority', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      const result = store.updateTaskPriority(task.id, 'invalid' as TaskPriority)
      expect(result).toBe(false)
    })

    it('should emit task:updated event', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      let eventEmitted = false

      store.on('task:updated', () => {
        eventEmitted = true
      })

      store.updateTaskPriority(task.id, 'high')

      expect(eventEmitted).toBe(true)
    })
  })

  describe('getTasksByPriority', () => {
    it('should return tasks for specific priority', () => {
      store.createTaskWithPriority('context1', {}, 'critical')
      store.createTaskWithPriority('context2', {}, 'high')
      store.createTaskWithPriority('context3', {}, 'critical')

      const tasks = store.getTasksByPriority('critical')

      expect(tasks.length).toBe(2)
      expect(tasks.every(t => t.priority === 'critical')).toBe(true)
    })

    it('should return empty array for invalid priority', () => {
      const tasks = store.getTasksByPriority('invalid' as TaskPriority)
      expect(tasks).toEqual([])
    })
  })

  describe('getHighestPriorityTasks', () => {
    it('should return tasks in priority order', () => {
      store.createTaskWithPriority('context1', {}, 'low')
      store.createTaskWithPriority('context2', {}, 'critical')
      store.createTaskWithPriority('context3', {}, 'high')
      store.createTaskWithPriority('context4', {}, 'normal')

      const tasks = store.getHighestPriorityTasks(3)

      expect(tasks.length).toBe(3)
      expect(tasks[0].priority).toBe('critical')
      expect(tasks[1].priority).toBe('high')
      expect(tasks[2].priority).toBe('normal')
    })

    it('should respect limit', () => {
      store.createTaskWithPriority('context1', {}, 'critical')
      store.createTaskWithPriority('context2', {}, 'critical')
      store.createTaskWithPriority('context3', {}, 'critical')

      const tasks = store.getHighestPriorityTasks(2)

      expect(tasks.length).toBe(2)
    })

    it('should only return pending tasks', () => {
      const task1 = store.createTaskWithPriority('context1', {}, 'critical')
      store.createTaskWithPriority('context2', {}, 'critical')

      store.markTaskCompleted(task1.id)

      const tasks = store.getHighestPriorityTasks(10)

      expect(tasks.length).toBe(1)
      expect(tasks[0].status).toBe('pending')
    })
  })

  describe('markTaskCompleted', () => {
    it('should mark task as completed', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      const result = store.markTaskCompleted(task.id)

      expect(result).toBe(true)

      const completed = store.getTask(task.id)
      expect(completed?.status).toBe('completed')
      expect(completed?.completedAt).toBeDefined()
    })

    it('should update async status', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.markTaskCompleted(task.id)

      const status = store.getAsyncTaskStatus(task.id)
      expect(status?.state).toBe('completed')
      expect(status?.progress).toBe(100)
    })

    it('should return false for non-existent task', () => {
      const result = store.markTaskCompleted('non-existent')
      expect(result).toBe(false)
    })

    it('should emit task:completed event', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      let eventEmitted = false

      store.on('task:completed', () => {
        eventEmitted = true
      })

      store.markTaskCompleted(task.id)

      expect(eventEmitted).toBe(true)
    })
  })

  describe('getAsyncTaskStatus', () => {
    it('should return null for non-existent task', () => {
      const status = store.getAsyncTaskStatus('non-existent')
      expect(status).toBeNull()
    })

    it('should return current async status', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.updateAsyncTaskProgress(task.id, 50, 'Processing')

      const status = store.getAsyncTaskStatus(task.id)

      expect(status?.state).toBe('running')
      expect(status?.progress).toBe(50)
      expect(status?.currentStep).toBe('Processing')
    })
  })

  describe('updateAsyncTaskProgress', () => {
    it('should update progress and step', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      const result = store.updateAsyncTaskProgress(task.id, 75, 'Almost done')

      expect(result).toBe(true)

      const status = store.getAsyncTaskStatus(task.id)
      expect(status?.progress).toBe(75)
      expect(status?.currentStep).toBe('Almost done')
    })

    it('should cap progress at 100', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.updateAsyncTaskProgress(task.id, 150)

      const status = store.getAsyncTaskStatus(task.id)
      expect(status?.progress).toBe(100)
    })

    it('should not allow negative progress', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.updateAsyncTaskProgress(task.id, -50)

      const status = store.getAsyncTaskStatus(task.id)
      expect(status?.progress).toBe(0)
    })

    it('should change task status to running', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      expect(task.status).toBe('pending')

      store.updateAsyncTaskProgress(task.id, 50)

      const updated = store.getTask(task.id)
      expect(updated?.status).toBe('running')
      expect(updated?.startedAt).toBeDefined()
    })

    it('should return false for non-existent task', () => {
      const result = store.updateAsyncTaskProgress('non-existent', 50)
      expect(result).toBe(false)
    })

    it('should emit task:progress event', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      let eventEmitted = false

      store.on('task:progress', () => {
        eventEmitted = true
      })

      store.updateAsyncTaskProgress(task.id, 50)

      expect(eventEmitted).toBe(true)
    })
  })

  describe('getTask', () => {
    it('should return task by ID', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      const result = store.getTask(task.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(task.id)
    })

    it('should return undefined for non-existent task', () => {
      const result = store.getTask('non-existent')
      expect(result).toBeUndefined()
    })
  })

  describe('getAllTasks', () => {
    it('should return all tasks', () => {
      store.createTaskWithPriority('context1', {}, 'normal')
      store.createTaskWithPriority('context2', {}, 'high')

      const tasks = store.getAllTasks()

      expect(tasks.length).toBe(2)
    })

    it('should return empty array when no tasks', () => {
      const tasks = store.getAllTasks()
      expect(tasks).toEqual([])
    })
  })

  describe('deleteTask', () => {
    it('should delete task', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      const result = store.deleteTask(task.id)

      expect(result).toBe(true)
      expect(store.getTask(task.id)).toBeUndefined()
    })

    it('should also delete async status', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.deleteTask(task.id)

      expect(store.getAsyncTaskStatus(task.id)).toBeNull()
    })

    it('should return false for non-existent task', () => {
      const result = store.deleteTask('non-existent')
      expect(result).toBe(false)
    })

    it('should emit task:deleted event', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      let eventEmitted = false

      store.on('task:deleted', () => {
        eventEmitted = true
      })

      store.deleteTask(task.id)

      expect(eventEmitted).toBe(true)
    })
  })

  describe('markTaskFailed', () => {
    it('should mark task as failed', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      const result = store.markTaskFailed(task.id, 'Something went wrong')

      expect(result).toBe(true)

      const failed = store.getTask(task.id)
      expect(failed?.status).toBe('failed')
      expect(failed?.error).toBe('Something went wrong')
    })

    it('should update async status', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.markTaskFailed(task.id, 'Error')

      const status = store.getAsyncTaskStatus(task.id)
      expect(status?.state).toBe('failed')
      expect(status?.error).toBe('Error')
    })

    it('should return false for non-existent task', () => {
      const result = store.markTaskFailed('non-existent', 'Error')
      expect(result).toBe(false)
    })

    it('should emit task:failed event', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      let eventEmitted = false

      store.on('task:failed', () => {
        eventEmitted = true
      })

      store.markTaskFailed(task.id, 'Error')

      expect(eventEmitted).toBe(true)
    })
  })

  describe('cancelTask', () => {
    it('should cancel task', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      const result = store.cancelTask(task.id)

      expect(result).toBe(true)

      const cancelled = store.getTask(task.id)
      expect(cancelled?.status).toBe('cancelled')
    })

    it('should update async status', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.cancelTask(task.id)

      const status = store.getAsyncTaskStatus(task.id)
      expect(status?.state).toBe('failed')
      expect(status?.error).toBe('Task cancelled')
    })

    it('should return false for non-existent task', () => {
      const result = store.cancelTask('non-existent')
      expect(result).toBe(false)
    })

    it('should emit task:cancelled event', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      let eventEmitted = false

      store.on('task:cancelled', () => {
        eventEmitted = true
      })

      store.cancelTask(task.id)

      expect(eventEmitted).toBe(true)
    })
  })

  describe('retryTask', () => {
    it('should retry failed task', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.markTaskFailed(task.id, 'Error')

      const result = store.retryTask(task.id)

      expect(result).toBe(true)

      const retried = store.getTask(task.id)
      expect(retried?.status).toBe('pending')
      expect(retried?.retryCount).toBe(1)
    })

    it('should retry cancelled task', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.cancelTask(task.id)

      const result = store.retryTask(task.id)

      expect(result).toBe(true)

      const retried = store.getTask(task.id)
      expect(retried?.status).toBe('pending')
    })

    it('should not retry running task', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.updateAsyncTaskProgress(task.id, 50)

      const result = store.retryTask(task.id)

      expect(result).toBe(false)
    })

    it('should return false for non-existent task', () => {
      const result = store.retryTask('non-existent')
      expect(result).toBe(false)
    })

    it('should reset async status', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.markTaskFailed(task.id, 'Error')
      store.retryTask(task.id)

      const status = store.getAsyncTaskStatus(task.id)
      expect(status?.state).toBe('pending')
      expect(status?.progress).toBe(0)
    })

    it('should emit task:retry event', () => {
      const task = store.createTaskWithPriority('context', {}, 'normal')

      store.markTaskFailed(task.id, 'Error')

      let eventEmitted = false

      store.on('task:retry', () => {
        eventEmitted = true
      })

      store.retryTask(task.id)

      expect(eventEmitted).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const task1 = store.createTaskWithPriority('context1', {}, 'critical')
      const task2 = store.createTaskWithPriority('context2', {}, 'high')
      store.createTaskWithPriority('context3', {}, 'normal')
      store.createTaskWithPriority('context4', {}, 'low')

      store.markTaskCompleted(task1.id)
      store.markTaskFailed(task2.id, 'Error')

      const stats = store.getStats()

      expect(stats.total).toBe(4)
      expect(stats.completed).toBe(1)
      expect(stats.failed).toBe(1)
      expect(stats.pending).toBe(2)
      expect(stats.byPriority.critical).toBe(1)
      expect(stats.byPriority.high).toBe(1)
      expect(stats.byPriority.normal).toBe(1)
      expect(stats.byPriority.low).toBe(1)
    })

    it('should return zero stats for empty store', () => {
      const stats = store.getStats()

      expect(stats.total).toBe(0)
      expect(stats.pending).toBe(0)
      expect(stats.running).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.cancelled).toBe(0)
    })
  })
})

describe('FileTaskStore', () => {
  const testFilePath = '/tmp/test-tasks.json'

  beforeEach(() => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }
  })

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }
  })

  it('should persist tasks to file', () => {
    const store = new FileTaskStore(testFilePath)

    store.createTaskWithPriority('context', { data: 'test' }, 'high')

    store.flush()

    // Load from file
    const data = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'))
    expect(data.tasks).toBeDefined()
    expect(data.tasks.length).toBe(1)

    store.close()
  })

  it('should restore tasks from file', () => {
    // Create and populate store
    const store1 = new FileTaskStore(testFilePath)

    const task = store1.createTaskWithPriority('context', { data: 'test' }, 'critical')

    store1.flush()
    store1.close()

    // Load store from file
    const store2 = new FileTaskStore(testFilePath)

    const restored = store2.getTask(task.id)

    expect(restored).toBeDefined()
    expect(restored?.name).toBe('context')
    expect(restored?.priority).toBe('critical')

    store2.close()
  })

  it('should persist updates to file', () => {
    const store = new FileTaskStore(testFilePath)

    const task = store.createTaskWithPriority('context', {}, 'normal')

    store.markTaskCompleted(task.id)
    store.flush()

    // Load from file
    const data = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'))
    const savedTask = data.tasks.find((t: any) => t.id === task.id)

    expect(savedTask.status).toBe('completed')

    store.close()
  })
})

describe('getTaskStore', () => {
  it('should return singleton instance', () => {
    const store1 = getTaskStore()
    const store2 = getTaskStore()

    expect(store1).toBe(store2)
  })
})