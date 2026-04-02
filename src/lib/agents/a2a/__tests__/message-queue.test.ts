/**
 * Unit tests for Message Queue
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  PriorityMessageQueue,
  FileMessageQueue,
  getMessageQueue,
  resetMessageQueue,
} from '../message-queue'
import { QueueMessage, TaskPriority, QueueConfig } from '../types'

describe('PriorityMessageQueue', () => {
  let queue: PriorityMessageQueue

  beforeEach(() => {
    queue = new PriorityMessageQueue()
  })

  afterEach(() => {
    resetMessageQueue()
  })

  describe('enqueue and dequeue', () => {
    it('should enqueue and dequeue messages in priority order', () => {
      const priorities: TaskPriority[] = ['low', 'critical', 'normal', 'high']

      priorities.forEach((priority, index) => {
        queue.enqueue({
          id: `msg-${index}`,
          taskId: `task-${index}`,
          agentId: 'agent-1',
          priority,
          payload: {},
          createdAt: new Date().toISOString(),
          attempts: 0,
          maxAttempts: 3,
        })
      })

      expect(queue.size()).toBe(4)

      // Should dequeue in priority order: critical, high, normal, low
      const order: TaskPriority[] = []
      let msg: QueueMessage | null
      while ((msg = queue.dequeue())) {
        order.push(msg.priority)
      }

      expect(order).toEqual(['critical', 'high', 'normal', 'low'])
    })

    it('should handle queue size limit', () => {
      const smallQueue = new PriorityMessageQueue({ maxQueueSize: 2 })

      smallQueue.enqueue({
        id: 'msg-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      smallQueue.enqueue({
        id: 'msg-2',
        taskId: 'task-2',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      expect(() => {
        smallQueue.enqueue({
          id: 'msg-3',
          taskId: 'task-3',
          agentId: 'agent-1',
          priority: 'normal',
          payload: {},
          createdAt: new Date().toISOString(),
          attempts: 0,
          maxAttempts: 3,
        })
      }).toThrow('Queue is full')
    })
  })

  describe('getMessagesByAgent', () => {
    it('should return messages for a specific agent', () => {
      queue.enqueue({
        id: 'msg-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      queue.enqueue({
        id: 'msg-2',
        taskId: 'task-2',
        agentId: 'agent-2',
        priority: 'low',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      const agent1Messages = queue.getMessagesByAgent('agent-1')
      expect(agent1Messages).toHaveLength(1)
      expect(agent1Messages[0].agentId).toBe('agent-1')
    })
  })

  describe('getMessagesByPriority', () => {
    it('should return messages with a specific priority', () => {
      queue.enqueue({
        id: 'msg-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      queue.enqueue({
        id: 'msg-2',
        taskId: 'task-2',
        agentId: 'agent-2',
        priority: 'low',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      queue.enqueue({
        id: 'msg-3',
        taskId: 'task-3',
        agentId: 'agent-3',
        priority: 'high',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      const highPriorityMessages = queue.getMessagesByPriority('high')
      expect(highPriorityMessages).toHaveLength(2)
      expect(highPriorityMessages.every(m => m.priority === 'high')).toBe(true)
    })
  })

  describe('retry', () => {
    it('should retry a failed message', () => {
      queue.enqueue({
        id: 'msg-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      const retried = queue.retry('msg-1')
      expect(retried).toBe(true)

      const message = queue.getMessagesByAgent('agent-1')[0]
      expect(message.attempts).toBe(1)
      expect(message.nextRetryAt).toBeDefined()
    })

    it('should not retry after max attempts', () => {
      queue.enqueue({
        id: 'msg-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 3,
        maxAttempts: 3,
      })

      const retried = queue.retry('msg-1')
      expect(retried).toBe(false)

      // Message should be removed from queue
      const messages = queue.getMessagesByAgent('agent-1')
      expect(messages).toHaveLength(0)
    })
  })

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      queue.enqueue({
        id: 'msg-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      queue.enqueue({
        id: 'msg-2',
        taskId: 'task-2',
        agentId: 'agent-1',
        priority: 'high',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      queue.enqueue({
        id: 'msg-3',
        taskId: 'task-3',
        agentId: 'agent-2',
        priority: 'normal',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      const stats = queue.getStats()

      expect(stats.total).toBe(3)
      expect(stats.byPriority.high).toBe(2)
      expect(stats.byPriority.normal).toBe(1)
      expect(stats.byAgent.get('agent-1')).toBe(2)
      expect(stats.byAgent.get('agent-2')).toBe(1)
    })
  })

  describe('queue events', () => {
    it('should emit enqueued events', () => {
      const events: any[] = []

      queue.subscribe(event => events.push(event))

      queue.enqueue({
        id: 'msg-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('enqueued')
    })

    it('should emit dequeued events', () => {
      const events: any[] = []

      queue.subscribe(event => events.push(event))

      queue.enqueue({
        id: 'msg-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      })

      queue.dequeue()

      expect(events).toHaveLength(2)
      expect(events[1].type).toBe('dequeued')
    })
  })
})

describe('Singleton Pattern', () => {
  afterEach(() => {
    resetMessageQueue()
  })

  it('should return the same instance across calls', () => {
    const queue1 = getMessageQueue()
    const queue2 = getMessageQueue()

    expect(queue1).toBe(queue2)
  })

  it('should reset the instance', () => {
    const queue1 = getMessageQueue()
    resetMessageQueue()
    const queue2 = getMessageQueue()

    expect(queue1).not.toBe(queue2)
  })
})
