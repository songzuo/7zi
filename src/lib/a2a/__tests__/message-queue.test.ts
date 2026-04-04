/**
 * A2A Protocol v2 - Message Queue Tests
 * 测试优先级消息队列功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  PriorityMessageQueue,
  FileMessageQueue,
  getMessageQueue,
} from '../message-queue'
import { TaskPriority, QueueMessage } from '../types'
import { A2AErrorType } from '../types'
import * as fs from 'fs'

describe('PriorityMessageQueue', () => {
  let queue: PriorityMessageQueue

  beforeEach(() => {
    queue = new PriorityMessageQueue({
      maxRetries: 3,
      retryDelayMs: 100,
      maxQueueSize: 100,
    })
  })

  describe('enqueue', () => {
    it('should add message to queue and return message ID', () => {
      const id = queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { data: 'test' },
      })

      expect(id).toBeDefined()
      expect(id).toMatch(/^msg-/)
      expect(queue.size()).toBe(1)
    })

    it('should create message with correct metadata', () => {
      const id = queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'critical',
        payload: { data: 'test' },
      })

      const stats = queue.getStats()
      expect(stats.byPriority.critical).toBe(1)
    })

    it('should enforce queue size limit', () => {
      const smallQueue = new PriorityMessageQueue({
        maxQueueSize: 2,
      })

      smallQueue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
      })

      smallQueue.enqueue({
        taskId: 'task-2',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
      })

      expect(() => {
        smallQueue.enqueue({
          taskId: 'task-3',
          agentId: 'agent-1',
          priority: 'normal',
          payload: {},
        })
      }).toThrow()
    })

    it('should reject invalid priority', () => {
      expect(() => {
        queue.enqueue({
          taskId: 'task-1',
          agentId: 'agent-1',
          priority: 'invalid' as TaskPriority,
          payload: {},
        })
      }).toThrow()
    })
  })

  describe('dequeue', () => {
    it('should return null for empty queue', () => {
      expect(queue.dequeue()).toBeNull()
    })

    it('should return messages in priority order', () => {
      queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'low',
        payload: {},
      })

      queue.enqueue({
        taskId: 'task-2',
        agentId: 'agent-1',
        priority: 'critical',
        payload: {},
      })

      queue.enqueue({
        taskId: 'task-3',
        agentId: 'agent-1',
        priority: 'high',
        payload: {},
      })

      const first = queue.dequeue()
      expect(first?.priority).toBe('critical')

      const second = queue.dequeue()
      expect(second?.priority).toBe('high')

      const third = queue.dequeue()
      expect(third?.priority).toBe('low')
    })

    it('should decrease queue size', () => {
      queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
      })

      expect(queue.size()).toBe(1)

      queue.dequeue()

      expect(queue.size()).toBe(0)
    })
  })

  describe('peek', () => {
    it('should return null for empty queue', () => {
      expect(queue.peek()).toBeNull()
    })

    it('should return first message without removing it', () => {
      queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: {},
      })

      queue.enqueue({
        taskId: 'task-2',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
      })

      const message = queue.peek()
      expect(message?.priority).toBe('high')
      expect(message?.taskId).toBe('task-1')

      // Size should not change
      expect(queue.size()).toBe(2)
    })
  })

  describe('remove', () => {
    it('should remove message by ID', () => {
      const id = queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
      })

      expect(queue.size()).toBe(1)

      const result = queue.remove(id)

      expect(result).toBe(true)
      expect(queue.size()).toBe(0)
    })

    it('should return false for non-existent message', () => {
      const result = queue.remove('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('getMessagesByAgent', () => {
    it('should return messages for specific agent', () => {
      queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
      })

      queue.enqueue({
        taskId: 'task-2',
        agentId: 'agent-2',
        priority: 'normal',
        payload: {},
      })

      queue.enqueue({
        taskId: 'task-3',
        agentId: 'agent-1',
        priority: 'high',
        payload: {},
      })

      const messages = queue.getMessagesByAgent('agent-1')

      expect(messages.length).toBe(2)
      expect(messages.every(m => m.agentId === 'agent-1')).toBe(true)
    })

    it('should return empty array for agent with no messages', () => {
      const messages = queue.getMessagesByAgent('non-existent')
      expect(messages).toEqual([])
    })
  })

  describe('getMessagesByPriority', () => {
    it('should return messages for specific priority', () => {
      queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'critical',
        payload: {},
      })

      queue.enqueue({
        taskId: 'task-2',
        agentId: 'agent-1',
        priority: 'high',
        payload: {},
      })

      queue.enqueue({
        taskId: 'task-3',
        agentId: 'agent-1',
        priority: 'critical',
        payload: {},
      })

      const messages = queue.getMessagesByPriority('critical')

      expect(messages.length).toBe(2)
      expect(messages.every(m => m.priority === 'critical')).toBe(true)
    })

    it('should return empty array for invalid priority', () => {
      const messages = queue.getMessagesByPriority('invalid' as TaskPriority)
      expect(messages).toEqual([])
    })
  })

  describe('retry', () => {
    it('should increment attempt count and set nextRetryAt', () => {
      const id = queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
      })

      const result = queue.retry(id)

      expect(result).toBe(true)

      const message = queue.getMessagesByAgent('agent-1')[0]
      expect(message.attempts).toBe(1)
      expect(message.nextRetryAt).toBeDefined()
    })

    it('should fail when max attempts exceeded', () => {
      const id = queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
        maxAttempts: 1,
      })

      // First retry should succeed
      queue.retry(id)

      // Second retry should fail and remove message
      const result = queue.retry(id)

      expect(result).toBe(false)
      expect(queue.getMessagesByAgent('agent-1').length).toBe(0)
    })

    it('should return false for non-existent message', () => {
      const result = queue.retry('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'critical',
        payload: {},
      })

      queue.enqueue({
        taskId: 'task-2',
        agentId: 'agent-1',
        priority: 'high',
        payload: {},
      })

      queue.enqueue({
        taskId: 'task-3',
        agentId: 'agent-2',
        priority: 'normal',
        payload: {},
      })

      const stats = queue.getStats()

      expect(stats.total).toBe(3)
      expect(stats.byPriority.critical).toBe(1)
      expect(stats.byPriority.high).toBe(1)
      expect(stats.byPriority.normal).toBe(1)
      expect(stats.byAgent['agent-1']).toBe(2)
      expect(stats.byAgent['agent-2']).toBe(1)
    })

    it('should return zero stats for empty queue', () => {
      const stats = queue.getStats()

      expect(stats.total).toBe(0)
      expect(stats.byPriority.critical).toBe(0)
      expect(stats.byPriority.high).toBe(0)
      expect(stats.byPriority.normal).toBe(0)
      expect(stats.byPriority.low).toBe(0)
    })
  })

  describe('subscribe', () => {
    it('should emit events', () => {
      const events: string[] = []

      const unsubscribe = queue.subscribe(event => {
        events.push(event.type)
      })

      queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
      })

      queue.dequeue()

      expect(events).toContain('enqueued')
      expect(events).toContain('dequeued')

      unsubscribe()
    })

    it('should allow unsubscribing', () => {
      const events: string[] = []

      const unsubscribe = queue.subscribe(event => {
        events.push(event.type)
      })

      unsubscribe()

      queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
      })

      expect(events.length).toBe(0)
    })
  })

  describe('complete', () => {
    it('should mark message as completed and remove it', () => {
      const id = queue.enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
      })

      const result = queue.complete(id)

      expect(result).toBe(true)
      expect(queue.size()).toBe(0)
    })

    it('should return false for non-existent message', () => {
      const result = queue.complete('non-existent')
      expect(result).toBe(false)
    })
  })
})

describe('FileMessageQueue', () => {
  const testFilePath = '/tmp/test-queue.json'

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

  it('should persist queue to file', () => {
    const queue = new FileMessageQueue(testFilePath)

    queue.enqueue({
      taskId: 'task-1',
      agentId: 'agent-1',
      priority: 'normal',
      payload: { data: 'test' },
    })

    queue.flush()

    // Load from file
    const data = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'))
    expect(data.messages).toBeDefined()
    expect(data.messages.length).toBe(1)

    queue.close()
  })

  it('should restore queue from file', () => {
    // Create and populate queue
    const queue1 = new FileMessageQueue(testFilePath)

    queue1.enqueue({
      taskId: 'task-1',
      agentId: 'agent-1',
      priority: 'critical',
      payload: {},
    })

    queue1.flush()
    queue1.close()

    // Load queue from file
    const queue2 = new FileMessageQueue(testFilePath)

    expect(queue2.size()).toBe(1)

    const message = queue2.dequeue()
    expect(message?.taskId).toBe('task-1')
    expect(message?.priority).toBe('critical')

    queue2.close()
  })
})

describe('getMessageQueue', () => {
  it('should allow custom config', () => {
    // Create a fresh instance directly instead of using singleton
    const queue = new PriorityMessageQueue({
      maxQueueSize: 500,
    })

    const config = queue.getConfig()
    expect(config.maxQueueSize).toBe(500)
  })
})