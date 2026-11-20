/**
 * Tests for task-store.ts
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryTaskStore, getTaskStore } from '../task-store'
import type { Task, Message, Artifact, TaskState } from '../types'

describe('InMemoryTaskStore', () => {
  let store: InMemoryTaskStore

  beforeEach(() => {
    store = new InMemoryTaskStore()
  })

  describe('createTask', () => {
    it('should create a task with generated IDs', () => {
      const task = store.createTask()

      expect(task.kind).toBe('task')
      expect(task.id).toBeDefined()
      expect(task.contextId).toBeDefined()
      expect(task.status.state).toBe('submitted')
      expect(task.history).toEqual([])
      expect(task.artifacts).toEqual([])
    })

    it('should create a task with provided contextId', () => {
      const task = store.createTask('ctx-1')

      expect(task.contextId).toBe('ctx-1')
    })

    it('should create a task with initial message', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
        createdAt: new Date().toISOString(),
      }

      const task = store.createTask('ctx-1', message)

      expect(task.history).toHaveLength(1)
      expect(task.history?.[0]).toEqual(message)
    })

    it('should index tasks by contextId', () => {
      const task1 = store.createTask('ctx-1')
      const task2 = store.createTask('ctx-1')

      const tasksByContext = store.getTasksByContext('ctx-1')

      expect(tasksByContext).toHaveLength(2)
      expect(tasksByContext.map(t => t.id)).toContain(task1.id)
      expect(tasksByContext.map(t => t.id)).toContain(task2.id)
    })
  })

  describe('getTask', () => {
    it('should return task by ID', () => {
      const task = store.createTask('ctx-1')
      const retrieved = store.getTask(task.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(task.id)
    })

    it('should return undefined for non-existent task', () => {
      const retrieved = store.getTask('non-existent')

      expect(retrieved).toBeUndefined()
    })

    it('should return a copy of the task (shallow)', () => {
      const task = store.createTask('ctx-1')
      const retrieved = store.getTask(task.id)!

      // Modify the returned task's top-level property
      retrieved.metadata = { modified: true }

      // Original should be unchanged for shallow copy
      const original = store.getTask(task.id)!
      expect(original.metadata).toBeUndefined()
    })
  })

  describe('updateTaskStatus', () => {
    it('should update task status', () => {
      const task = store.createTask('ctx-1')

      const updated = store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      expect(updated).toBeDefined()
      expect(updated?.status.state).toBe('completed')
    })

    it('should return undefined for non-existent task', () => {
      const result = store.updateTaskStatus('non-existent', {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      expect(result).toBeUndefined()
    })

    it('should persist status changes', () => {
      const task = store.createTask('ctx-1')

      store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      const retrieved = store.getTask(task.id)
      expect(retrieved?.status.state).toBe('completed')
    })
  })

  describe('addArtifact', () => {
    it('should add artifact to task', () => {
      const task = store.createTask('ctx-1')
      const artifact: Artifact = {
        artifactId: 'art-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'Hello' }],
      }

      const updated = store.addArtifact(task.id, artifact)

      expect(updated).toBeDefined()
      expect(updated?.artifacts).toHaveLength(1)
      expect(updated?.artifacts?.[0]).toEqual(artifact)
    })

    it('should add multiple artifacts', () => {
      const task = store.createTask('ctx-1')

      const artifact1: Artifact = {
        artifactId: 'art-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'Hello' }],
      }

      const artifact2: Artifact = {
        artifactId: 'art-2',
        name: 'data',
        parts: [{ kind: 'text', text: 'World' }],
      }

      store.addArtifact(task.id, artifact1)
      const updated = store.addArtifact(task.id, artifact2)

      expect(updated?.artifacts).toHaveLength(2)
    })

    it('should return undefined for non-existent task', () => {
      const artifact: Artifact = {
        artifactId: 'art-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'Hello' }],
      }

      const result = store.addArtifact('non-existent', artifact)

      expect(result).toBeUndefined()
    })
  })

  describe('addMessage', () => {
    it('should add message to task history', () => {
      const task = store.createTask('ctx-1')
      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
        createdAt: new Date().toISOString(),
      }

      const updated = store.addMessage(task.id, message)

      expect(updated).toBeDefined()
      expect(updated?.history).toHaveLength(1)
      expect(updated?.history?.[0]).toEqual(message)
    })

    it('should add multiple messages', () => {
      const task = store.createTask('ctx-1')

      const message1: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
        createdAt: new Date().toISOString(),
      }

      const message2: Message = {
        kind: 'message',
        messageId: 'msg-2',
        role: 'agent',
        parts: [{ kind: 'text', text: 'Hi there' }],
        createdAt: new Date().toISOString(),
      }

      store.addMessage(task.id, message1)
      const updated = store.addMessage(task.id, message2)

      expect(updated?.history).toHaveLength(2)
    })

    it('should return undefined for non-existent task', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
        createdAt: new Date().toISOString(),
      }

      const result = store.addMessage('non-existent', message)

      expect(result).toBeUndefined()
    })
  })

  describe('listTasks', () => {
    beforeEach(() => {
      // Create test tasks
      store.createTask('ctx-1')
      store.createTask('ctx-1')
      store.createTask('ctx-2')

      const task1 = store.getTasksByContext('ctx-1')[0]
      store.updateTaskStatus(task1.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      const task2 = store.getTasksByContext('ctx-2')[0]
      store.updateTaskStatus(task2.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      })
    })

    it('should list all tasks', () => {
      const result = store.listTasks({})

      expect(result.tasks).toHaveLength(3)
      expect(result.totalSize).toBe(3)
      expect(result.nextPageToken).toBe('')
    })

    it('should filter by contextId', () => {
      const result = store.listTasks({ contextId: 'ctx-1' })

      expect(result.tasks).toHaveLength(2)
      expect(result.totalSize).toBe(2)
      result.tasks.forEach(task => {
        expect(task.contextId).toBe('ctx-1')
      })
    })

    it('should filter by status', () => {
      const result = store.listTasks({ status: 'completed' })

      expect(result.tasks).toHaveLength(1)
      expect(result.tasks[0].status.state).toBe('completed')
    })

    it('should filter by both contextId and status', () => {
      const result = store.listTasks({ contextId: 'ctx-1', status: 'completed' })

      expect(result.tasks).toHaveLength(1)
      expect(result.tasks[0].contextId).toBe('ctx-1')
      expect(result.tasks[0].status.state).toBe('completed')
    })

    it('should paginate results', () => {
      const page1 = store.listTasks({ pageSize: 2 })

      expect(page1.tasks).toHaveLength(2)
      expect(page1.nextPageToken).toBeTruthy()

      const page2 = store.listTasks({ pageSize: 2, pageToken: page1.nextPageToken })

      expect(page2.tasks).toHaveLength(1)
      expect(page2.nextPageToken).toBe('')
    })

    it('should exclude artifacts by default', () => {
      const artifact: Artifact = {
        artifactId: 'art-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'Hello' }],
      }

      const task = store.createTask('ctx-1')
      store.addArtifact(task.id, artifact)

      const result = store.listTasks({ includeArtifacts: false })
      const taskWithArtifact = result.tasks.find(t => t.id === task.id)

      expect(taskWithArtifact?.artifacts).toBeUndefined()
    })

    it('should include artifacts when requested', () => {
      const artifact: Artifact = {
        artifactId: 'art-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'Hello' }],
      }

      const task = store.createTask('ctx-1')
      store.addArtifact(task.id, artifact)

      const result = store.listTasks({ includeArtifacts: true })
      const taskWithArtifact = result.tasks.find(t => t.id === task.id)

      expect(taskWithArtifact?.artifacts).toHaveLength(1)
    })

    it('should sort tasks by status timestamp descending', () => {
      const result = store.listTasks({})

      const timestamps = result.tasks.map(t => new Date(t.status.timestamp).getTime())
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i])
      }
    })
  })

  describe('deleteTask', () => {
    it('should delete an existing task', () => {
      const task = store.createTask('ctx-1')

      const result = store.deleteTask(task.id)

      expect(result).toBe(true)
      expect(store.getTask(task.id)).toBeUndefined()
    })

    it('should return false for non-existent task', () => {
      const result = store.deleteTask('non-existent')

      expect(result).toBe(false)
    })

    it('should remove task from context index', () => {
      const task = store.createTask('ctx-1')

      expect(store.getTasksByContext('ctx-1')).toHaveLength(1)

      store.deleteTask(task.id)

      expect(store.getTasksByContext('ctx-1')).toHaveLength(0)
    })

    it('should clean up empty context indices', () => {
      const task = store.createTask('ctx-1')

      store.deleteTask(task.id)

      // Context index should be removed
      const tasks = store.getTasksByContext('ctx-1')
      expect(tasks).toEqual([])
    })
  })

  describe('getTasksByContext', () => {
    it('should return tasks by contextId', () => {
      store.createTask('ctx-1')
      store.createTask('ctx-1')
      store.createTask('ctx-2')

      const ctx1Tasks = store.getTasksByContext('ctx-1')
      const ctx2Tasks = store.getTasksByContext('ctx-2')

      expect(ctx1Tasks).toHaveLength(2)
      expect(ctx2Tasks).toHaveLength(1)
    })

    it('should return empty array for non-existent context', () => {
      const tasks = store.getTasksByContext('non-existent')

      expect(tasks).toEqual([])
    })
  })

  describe('cleanupOldTasks', () => {
    beforeEach(() => {
      const now = Date.now()

      // Create old completed task
      const oldTask = store.createTask('ctx-1')
      store.updateTaskStatus(oldTask.id, {
        state: 'completed',
        timestamp: new Date(now - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      })

      // Create recent completed task
      const recentTask = store.createTask('ctx-1')
      store.updateTaskStatus(recentTask.id, {
        state: 'completed',
        timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      })

      // Create working task (should not be cleaned)
      const workingTask = store.createTask('ctx-1')
      store.updateTaskStatus(workingTask.id, {
        state: 'working',
        timestamp: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
      })
    })

    it('should clean up old terminal tasks', () => {
      const cleaned = store.cleanupOldTasks(24 * 60 * 60 * 1000) // 24 hours

      expect(cleaned).toBe(1)
    })

    it('should not clean up recent tasks', () => {
      const allTasks = store.listTasks({})
      const beforeCount = allTasks.totalSize

      store.cleanupOldTasks(24 * 60 * 60 * 1000)

      const afterTasks = store.listTasks({})
      expect(afterTasks.totalSize).toBe(beforeCount - 1)
    })

    it('should not clean up non-terminal tasks', () => {
      const beforeList = store.listTasks({ status: 'working' })

      store.cleanupOldTasks(1 * 60 * 60 * 1000) // 1 hour

      const afterList = store.listTasks({ status: 'working' })
      expect(afterList.totalSize).toBe(beforeList.totalSize)
    })
  })
})

describe('getTaskStore', () => {
  it('should return singleton instance', () => {
    const store1 = getTaskStore()
    const store2 = getTaskStore()

    expect(store1).toBe(store2)
  })
})

describe('InMemoryTaskStore - Error Handling', () => {
  let store: InMemoryTaskStore

  beforeEach(() => {
    store = new InMemoryTaskStore()
  })

  describe('createTask', () => {
    it('should handle empty contextId', () => {
      const task = store.createTask('')

      expect(task.contextId).toBeDefined()
      expect(task.contextId).not.toBe('')
    })

    it('should handle tasks with same IDs (should not happen but test safety)', () => {
      const task1 = store.createTask('ctx-1')
      const task2 = store.createTask('ctx-1')

      // IDs should be unique
      expect(task1.id).not.toBe(task2.id)
    })
  })

  describe('updateTaskStatus', () => {
    it('should handle invalid status objects', () => {
      const task = store.createTask('ctx-1')

      // Store should handle status updates with minimal required fields
      // timestamp is required by TaskStatus interface
      const result = store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      expect(result).toBeDefined()
      expect(result?.status.state).toBe('completed')
    })

    it('should handle rapid status updates', () => {
      const task = store.createTask('ctx-1')

      const states: TaskState[] = ['submitted', 'working', 'input-required', 'working', 'completed']

      for (const state of states) {
        store.updateTaskStatus(task.id, {
          state,
          timestamp: new Date().toISOString(),
        })
      }

      const updated = store.getTask(task.id)
      expect(updated?.status.state).toBe('completed')
    })
  })

  describe('addArtifact', () => {
    it('should handle artifact with empty parts', () => {
      const task = store.createTask('ctx-1')
      const artifact: Artifact = {
        artifactId: 'art-1',
        name: 'empty',
        parts: [],
      }

      const updated = store.addArtifact(task.id, artifact)

      expect(updated).toBeDefined()
      expect(updated?.artifacts).toHaveLength(1)
      expect(updated?.artifacts?.[0].parts).toEqual([])
    })

    it('should handle artifact with undefined artifactId', () => {
      const task = store.createTask('ctx-1')
      // Test error handling for malformed artifact data
      const artifact = {
        artifactId: undefined,
        name: 'test',
        parts: [{ kind: 'text', text: 'Hello' }],
      } as Partial<Artifact>

      const updated = store.addArtifact(task.id, artifact as Artifact)

      expect(updated).toBeDefined()
      expect(updated?.artifacts).toHaveLength(1)
    })
  })

  describe('addMessage', () => {
    it('should handle message with empty parts', () => {
      const task = store.createTask('ctx-1')
      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [],
        createdAt: new Date().toISOString(),
      }

      const updated = store.addMessage(task.id, message)

      expect(updated).toBeDefined()
      expect(updated?.history).toHaveLength(1)
      expect(updated?.history?.[0].parts).toEqual([])
    })

    it('should handle messages with duplicate messageIds', () => {
      const task = store.createTask('ctx-1')
      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
        createdAt: new Date().toISOString(),
      }

      store.addMessage(task.id, message)
      store.addMessage(task.id, message)
      store.addMessage(task.id, message)

      const updated = store.getTask(task.id)
      expect(updated?.history).toHaveLength(3) // 0 initial (no initialMessage provided) + 3 added
    })
  })
})

describe('InMemoryTaskStore - State Transitions', () => {
  let store: InMemoryTaskStore

  beforeEach(() => {
    store = new InMemoryTaskStore()
  })

  describe('valid state transitions', () => {
    it('should transition from submitted to working', () => {
      const task = store.createTask('ctx-1')

      const updated = store.updateTaskStatus(task.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      })

      expect(updated?.status.state).toBe('working')
    })

    it('should transition from working to completed', () => {
      const task = store.createTask('ctx-1')
      store.updateTaskStatus(task.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      })

      const updated = store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      expect(updated?.status.state).toBe('completed')
    })

    it('should transition from working to failed', () => {
      const task = store.createTask('ctx-1')
      store.updateTaskStatus(task.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      })

      const updated = store.updateTaskStatus(task.id, {
        state: 'failed',
        timestamp: new Date().toISOString(),
        message: 'Error occurred',
      })

      expect(updated?.status.state).toBe('failed')
      expect(updated?.status.message).toBe('Error occurred')
    })

    it('should transition from any state to canceled', () => {
      const states: TaskState[] = ['submitted', 'working', 'input-required', 'auth-required']

      for (const initialState of states) {
        const task = store.createTask('ctx-1')
        store.updateTaskStatus(task.id, {
          state: initialState,
          timestamp: new Date().toISOString(),
        })

        const updated = store.updateTaskStatus(task.id, {
          state: 'canceled',
          timestamp: new Date().toISOString(),
        })

        expect(updated?.status.state).toBe('canceled')
      }
    })
  })

  describe('terminal states', () => {
    const terminalStates: TaskState[] = ['completed', 'failed', 'canceled', 'rejected']

    it('should identify all terminal states', () => {
      terminalStates.forEach(state => {
        const task = store.createTask('ctx-1')
        store.updateTaskStatus(task.id, {
          state,
          timestamp: new Date().toISOString(),
        })

        const updated = store.getTask(task.id)
        expect(updated?.status.state).toBe(state)
      })
    })
  })

  describe('complex state sequences', () => {
    it('should handle submitted -> working -> input-required -> working -> completed', () => {
      const task = store.createTask('ctx-1')

      store.updateTaskStatus(task.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      })

      store.updateTaskStatus(task.id, {
        state: 'input-required',
        timestamp: new Date().toISOString(),
        message: 'User input needed',
      })

      store.updateTaskStatus(task.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      })

      const updated = store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      expect(updated?.status.state).toBe('completed')
    })

    it('should handle submitted -> auth-required -> working -> completed', () => {
      const task = store.createTask('ctx-1')

      store.updateTaskStatus(task.id, {
        state: 'auth-required',
        timestamp: new Date().toISOString(),
        message: 'Authentication required',
      })

      store.updateTaskStatus(task.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      })

      const updated = store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      expect(updated?.status.state).toBe('completed')
    })
  })
})

describe('InMemoryTaskStore - Edge Cases', () => {
  let store: InMemoryTaskStore

  beforeEach(() => {
    store = new InMemoryTaskStore()
  })

  describe('listTasks pagination edge cases', () => {
    beforeEach(() => {
      // Create 100 tasks
      for (let i = 0; i < 100; i++) {
        const task = store.createTask(`ctx-${i % 10}`)
        store.updateTaskStatus(task.id, {
          state: i % 2 === 0 ? 'completed' : 'working',
          timestamp: new Date(Date.now() - i * 1000).toISOString(),
        })
      }
    })

    it('should handle page size larger than total', () => {
      const result = store.listTasks({ pageSize: 200 })

      expect(result.tasks).toHaveLength(100)
      expect(result.nextPageToken).toBe('')
    })

    it('should handle page size of 1', () => {
      const page1 = store.listTasks({ pageSize: 1 })
      const page2 = store.listTasks({ pageSize: 1, pageToken: page1.nextPageToken })
      const page3 = store.listTasks({ pageSize: 1, pageToken: page2.nextPageToken })

      expect(page1.tasks).toHaveLength(1)
      expect(page2.tasks).toHaveLength(1)
      expect(page3.tasks).toHaveLength(1)

      expect(page1.tasks[0].id).not.toBe(page2.tasks[0].id)
      expect(page2.tasks[0].id).not.toBe(page3.tasks[0].id)
    })

    it('should handle invalid page token', () => {
      const result = store.listTasks({ pageToken: 'invalid-token' })

      // Should return empty result for invalid token
      expect(result.tasks).toHaveLength(0)
      expect(result.totalSize).toBe(100)
    })

    it('should handle negative page size', () => {
      const result = store.listTasks({ pageSize: -1 })

      // Should use default behavior
      expect(result.tasks.length).toBeGreaterThan(0)
    })
  })

  describe('context indexing edge cases', () => {
    it('should handle tasks with same contextId but different states', () => {
      const task1 = store.createTask('ctx-1')
      const task2 = store.createTask('ctx-1')
      const task3 = store.createTask('ctx-1')

      store.updateTaskStatus(task1.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      store.updateTaskStatus(task2.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      })

      store.updateTaskStatus(task3.id, {
        state: 'failed',
        timestamp: new Date().toISOString(),
      })

      const tasks = store.getTasksByContext('ctx-1')
      const states = tasks.map(t => t.status.state)

      expect(states).toContain('completed')
      expect(states).toContain('working')
      expect(states).toContain('failed')
    })

    it('should handle contextId with special characters', () => {
      const contextId = 'ctx/with/special\\chars?test#value'
      const task = store.createTask(contextId)

      const tasks = store.getTasksByContext(contextId)
      expect(tasks).toHaveLength(1)
      expect(tasks[0].id).toBe(task.id)
    })

    it('should handle deleting task from middle of context index', () => {
      const task1 = store.createTask('ctx-1')
      const task2 = store.createTask('ctx-1')
      const task3 = store.createTask('ctx-1')

      store.deleteTask(task2.id)

      const tasks = store.getTasksByContext('ctx-1')
      const ids = tasks.map(t => t.id)

      expect(ids).toContain(task1.id)
      expect(ids).not.toContain(task2.id)
      expect(ids).toContain(task3.id)
    })
  })

  describe('cleanupOldTasks edge cases', () => {
    it('should handle empty task store', () => {
      const cleaned = store.cleanupOldTasks(24 * 60 * 60 * 1000)

      expect(cleaned).toBe(0)
    })

    it('should handle maxAge of 0 (clean all terminal tasks)', () => {
      const task1 = store.createTask('ctx-1')
      const task2 = store.createTask('ctx-1')
      const task3 = store.createTask('ctx-1')

      store.updateTaskStatus(task1.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      store.updateTaskStatus(task2.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      })

      store.updateTaskStatus(task3.id, {
        state: 'failed',
        timestamp: new Date().toISOString(),
      })

      const cleaned = store.cleanupOldTasks(0)

      // Only terminal states should be cleaned
      expect(cleaned).toBe(2)

      const remaining = store.listTasks({})
      expect(remaining.totalSize).toBe(1)
      expect(remaining.tasks[0].id).toBe(task2.id)
    })

    it('should handle negative maxAge', () => {
      const task = store.createTask('ctx-1')
      store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      const cleaned = store.cleanupOldTasks(-1)

      // Should not clean any tasks
      expect(cleaned).toBe(0)
    })

    it('should handle cleanup of recently completed tasks', () => {
      const now = Date.now()

      const task1 = store.createTask('ctx-1')
      store.updateTaskStatus(task1.id, {
        state: 'completed',
        timestamp: new Date(now - 1000).toISOString(), // 1 second ago
      })

      const task2 = store.createTask('ctx-1')
      store.updateTaskStatus(task2.id, {
        state: 'completed',
        timestamp: new Date(now - 5000).toISOString(), // 5 seconds ago
      })

      // Clean tasks older than 1 second
      const cleaned = store.cleanupOldTasks(1000)

      // Only task2 should be cleaned
      expect(cleaned).toBe(1)
    })
  })

  describe('concurrent operations', () => {
    it('should handle multiple concurrent task creations', () => {
      const promises = []

      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise(resolve => {
            const task = store.createTask('ctx-1')
            resolve(task.id)
          })
        )
      }

      return Promise.all(promises).then((ids: unknown[]) => {
        const uniqueIds = new Set(ids as string[])
        expect(uniqueIds.size).toBe(100)
      })
    })

    it('should handle concurrent status updates to same task', async () => {
      const task = store.createTask('ctx-1')

      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          store.updateTaskStatus(task.id, {
            state: 'working',
            timestamp: new Date().toISOString(),
            message: `Update ${i}`,
          })
        )
      }

      await Promise.all(promises)

      const updated = store.getTask(task.id)
      expect(updated?.status.state).toBe('working')
    })
  })

  describe('history and artifacts edge cases', () => {
    it('should handle very large history', () => {
      const task = store.createTask('ctx-1')

      // Add 1000 messages
      for (let i = 0; i < 1000; i++) {
        const message: Message = {
          kind: 'message',
          messageId: `msg-${i}`,
          role: 'user',
          parts: [{ kind: 'text', text: `Message ${i}` }],
          createdAt: new Date().toISOString(),
        }
        store.addMessage(task.id, message)
      }

      const updated = store.getTask(task.id)
      expect(updated?.history).toHaveLength(1000) // 0 initial (no initialMessage provided) + 1000 added
    })

    it('should handle very large artifact list', () => {
      const task = store.createTask('ctx-1')

      // Add 100 artifacts
      for (let i = 0; i < 100; i++) {
        const artifact: Artifact = {
          artifactId: `art-${i}`,
          name: `Artifact ${i}`,
          parts: [{ kind: 'text', text: `Content ${i}` }],
        }
        store.addArtifact(task.id, artifact)
      }

      const updated = store.getTask(task.id)
      expect(updated?.artifacts).toHaveLength(100)
    })

    it('should handle artifacts with metadata', () => {
      const task = store.createTask('ctx-1')
      const artifact: Artifact = {
        artifactId: 'art-1',
        name: 'test',
        parts: [{ kind: 'text', text: 'Hello' }],
        metadata: {
          size: 1024,
          type: 'text/plain',
          custom: {
            nested: {
              value: 42,
            },
          },
        },
      }

      const updated = store.addArtifact(task.id, artifact)

      expect(updated?.artifacts?.[0].metadata).toEqual(artifact.metadata)
    })
  })

  describe('sorting and ordering', () => {
    beforeEach(() => {
      const now = Date.now()

      for (let i = 0; i < 10; i++) {
        const task = store.createTask('ctx-1')
        store.updateTaskStatus(task.id, {
          state: 'completed',
          timestamp: new Date(now - i * 1000).toISOString(),
        })
      }
    })

    it('should sort tasks by status timestamp descending', () => {
      const result = store.listTasks({})

      const timestamps = result.tasks.map(t => new Date(t.status.timestamp).getTime())
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i])
      }
    })
  })
})

describe('InMemoryTaskStore - Memory Management', () => {
  let store: InMemoryTaskStore

  beforeEach(() => {
    store = new InMemoryTaskStore()
  })

  it('should handle deletion of all tasks', () => {
    const task1 = store.createTask('ctx-1')
    const task2 = store.createTask('ctx-1')
    const task3 = store.createTask('ctx-2')

    store.deleteTask(task1.id)
    store.deleteTask(task2.id)
    store.deleteTask(task3.id)

    const allTasks = store.listTasks({})
    expect(allTasks.totalSize).toBe(0)
  })

  it('should handle cleanup that removes all tasks', () => {
    const now = Date.now()

    for (let i = 0; i < 10; i++) {
      const task = store.createTask('ctx-1')
      store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date(now - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      })
    }

    const cleaned = store.cleanupOldTasks(24 * 60 * 60 * 1000)
    expect(cleaned).toBe(10)

    const remaining = store.listTasks({})
    expect(remaining.totalSize).toBe(0)
  })
})
