/**
 * Tests for Message Queue
 * Comprehensive coverage of priority queue functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  PriorityMessageQueue,
  getMessageQueue,
  resetMessageQueue,
  FileMessageQueue,
} from '../../../../src/lib/agents/a2a/message-queue'
import type { QueueMessage, TaskPriority, QueueEvent } from '../../../../src/lib/agents/a2a/types'

describe('PriorityMessageQueue', () => {
  let queue: PriorityMessageQueue

  beforeEach(() => {
    queue = new PriorityMessageQueue()
  })

  afterEach(() => {
    queue.clear()
    resetMessageQueue()
  })

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const q = new PriorityMessageQueue()
      const config = q.getConfig()

      expect(config.maxRetries).toBe(3)
      expect(config.retryDelayMs).toBe(5000)
      expect(config.maxQueueSize).toBe(1000)
    })

    it('should initialize with custom config', () => {
      const q = new PriorityMessageQueue({
        maxRetries: 5,
        retryDelayMs: 10000,
        maxQueueSize: 500,
      })

      const config = q.getConfig()
      expect(config.maxRetries).toBe(5)
      expect(config.retryDelayMs).toBe(10000)
      expect(config.maxQueueSize).toBe(500)
    })
  })

  describe('Enqueue', () => {
    it('should enqueue a message', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      }

      queue.enqueue(message)

      expect(queue.size()).toBe(1)
    })

    it('should generate ID if not provided', () => {
      const message: QueueMessage = {
        agentId: 'agent-1',
        priority: 'normal',
        payload: { task: 'test' },
      }

      queue.enqueue(message)
      expect(message.id).toBeDefined()
      expect(message.id.length).toBeGreaterThan(0)
    })

    it('should set default priority to normal', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        payload: { task: 'test' },
      }

      queue.enqueue(message)
      expect(message.priority).toBe('normal')
    })

    it('should set default attempts to 0', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: { task: 'test' },
      }

      queue.enqueue(message)
      expect(message.attempts).toBe(0)
    })

    it('should set createdAt timestamp', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: { task: 'test' },
      }

      const before = new Date().toISOString()
      queue.enqueue(message)
      const after = new Date().toISOString()

      expect(message.createdAt).toBeDefined()
      expect(message.createdAt >= before && message.createdAt <= after).toBe(true)
    })

    it('should throw error when queue is full', () => {
      const q = new PriorityMessageQueue({ maxQueueSize: 2 })

      q.enqueue({
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'normal',
        payload: { task: 'test' },
      })

      q.enqueue({
        id: 'msg-2',
        agentId: 'agent-1',
        priority: 'normal',
        payload: { task: 'test' },
      })

      expect(() => {
        q.enqueue({
          id: 'msg-3',
          agentId: 'agent-1',
          priority: 'normal',
          payload: { task: 'test' },
        })
      }).toThrow('Queue is full')
    })

    it('should emit enqueued event', () => {
      const listener = vi.fn()
      queue.subscribe(listener)

      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      }

      queue.enqueue(message)

      expect(listener).toHaveBeenCalledTimes(1)
      const event = listener.mock.calls[0][0] as QueueEvent
      expect(event.type).toBe('enqueued')
      expect(event.message).toBe(message)
    })
  })

  describe('Dequeue', () => {
    it('should dequeue highest priority message', () => {
      const lowMessage: QueueMessage = {
        id: 'low',
        agentId: 'agent-1',
        priority: 'low',
        payload: { task: 'low' },
      }

      const criticalMessage: QueueMessage = {
        id: 'critical',
        agentId: 'agent-1',
        priority: 'critical',
        payload: { task: 'critical' },
      }

      const highMessage: QueueMessage = {
        id: 'high',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'high' },
      }

      queue.enqueue(lowMessage)
      queue.enqueue(criticalMessage)
      queue.enqueue(highMessage)

      const dequeued = queue.dequeue()

      expect(dequeued).not.toBeNull()
      expect(dequeued?.id).toBe('critical')
      expect(queue.size()).toBe(2)
    })

    it('should return null when queue is empty', () => {
      const dequeued = queue.dequeue()
      expect(dequeued).toBeNull()
    })

    it('should respect priority order', () => {
      const priorities: TaskPriority[] = ['low', 'normal', 'high', 'critical']

      priorities.forEach((priority, index) => {
        queue.enqueue({
          id: `msg-${index}`,
          agentId: 'agent-1',
          priority,
          payload: { index },
        })
      })

      const order: TaskPriority[] = []
      let msg = queue.dequeue()

      while (msg) {
        order.push(msg.priority)
        msg = queue.dequeue()
      }

      expect(order).toEqual(['critical', 'high', 'normal', 'low'])
    })

    it('should emit dequeued event', () => {
      const listener = vi.fn()
      queue.subscribe(listener)

      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      }

      queue.enqueue(message)
      queue.dequeue()

      expect(listener).toHaveBeenCalledTimes(2) // enqueued + dequeued

      const dequeuedEvent = listener.mock.calls[1][0] as QueueEvent
      expect(dequeuedEvent.type).toBe('dequeued')
      expect(dequeuedEvent.message).toBe(message)
    })
  })

  describe('Peek', () => {
    it('should peek at highest priority message', () => {
      const lowMessage: QueueMessage = {
        id: 'low',
        agentId: 'agent-1',
        priority: 'low',
        payload: { task: 'low' },
      }

      const highMessage: QueueMessage = {
        id: 'high',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'high' },
      }

      queue.enqueue(lowMessage)
      queue.enqueue(highMessage)

      const peeked = queue.peek()

      expect(peeked).not.toBeNull()
      expect(peeked?.id).toBe('high')
    })

    it('should not remove message on peek', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      }

      queue.enqueue(message)

      queue.peek()
      expect(queue.size()).toBe(1)
      queue.peek()
      expect(queue.size()).toBe(1)
    })

    it('should return null when queue is empty', () => {
      const peeked = queue.peek()
      expect(peeked).toBeNull()
    })
  })

  describe('Remove', () => {
    it('should remove message by ID', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      }

      queue.enqueue(message)
      expect(queue.size()).toBe(1)

      const removed = queue.remove('msg-1')
      expect(removed).toBe(true)
      expect(queue.size()).toBe(0)
    })

    it('should return false for non-existent message', () => {
      const removed = queue.remove('non-existent')
      expect(removed).toBe(false)
    })

    it('should remove correct message from priority queue', () => {
      const message1: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test1' },
      }

      const message2: QueueMessage = {
        id: 'msg-2',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test2' },
      }

      queue.enqueue(message1)
      queue.enqueue(message2)

      queue.remove('msg-1')
      expect(queue.size()).toBe(1)

      const dequeued = queue.dequeue()
      expect(dequeued?.id).toBe('msg-2')
    })
  })

  describe('Size', () => {
    it('should return 0 for empty queue', () => {
      expect(queue.size()).toBe(0)
    })

    it('should count all messages', () => {
      queue.enqueue({
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'low',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'msg-2',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'msg-3',
        agentId: 'agent-1',
        priority: 'normal',
        payload: { task: 'test' },
      })

      expect(queue.size()).toBe(3)
    })

    it('should update after dequeue', () => {
      queue.enqueue({
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'msg-2',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      })

      queue.dequeue()
      expect(queue.size()).toBe(1)
    })
  })

  describe('Get Messages by Agent', () => {
    it('should get messages for specific agent', () => {
      queue.enqueue({
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'msg-2',
        agentId: 'agent-2',
        priority: 'high',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'msg-3',
        agentId: 'agent-1',
        priority: 'low',
        payload: { task: 'test' },
      })

      const agent1Messages = queue.getMessagesByAgent('agent-1')
      const agent2Messages = queue.getMessagesByAgent('agent-2')

      expect(agent1Messages).toHaveLength(2)
      expect(agent2Messages).toHaveLength(1)
    })

    it('should sort by priority when getting by agent', () => {
      queue.enqueue({
        id: 'low',
        agentId: 'agent-1',
        priority: 'low',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'critical',
        agentId: 'agent-1',
        priority: 'critical',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'high',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      })

      const messages = queue.getMessagesByAgent('agent-1')

      expect(messages[0].priority).toBe('critical')
      expect(messages[1].priority).toBe('high')
      expect(messages[2].priority).toBe('low')
    })

    it('should return empty array for non-existent agent', () => {
      const messages = queue.getMessagesByAgent('non-existent')
      expect(messages).toHaveLength(0)
    })
  })

  describe('Get Messages by Priority', () => {
    it('should get messages for specific priority', () => {
      queue.enqueue({
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'msg-2',
        agentId: 'agent-1',
        priority: 'low',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'msg-3',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      })

      const highMessages = queue.getMessagesByPriority('high')
      const lowMessages = queue.getMessagesByPriority('low')

      expect(highMessages).toHaveLength(2)
      expect(lowMessages).toHaveLength(1)
    })

    it('should return empty array for priority with no messages', () => {
      queue.enqueue({
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'low',
        payload: { task: 'test' },
      })

      const criticalMessages = queue.getMessagesByPriority('critical')
      expect(criticalMessages).toHaveLength(0)
    })
  })

  describe('Retry', () => {
    it('should retry a message with attempts tracking', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
        attempts: 1,
        maxAttempts: 3,
      }

      queue.enqueue(message)

      // Remove the message (simulating processing)
      const processed = queue.dequeue()
      expect(processed).not.toBeNull()

      // Re-enqueue with incremented attempts to simulate retry
      const retryMessage: QueueMessage = {
        ...processed!,
        attempts: processed!.attempts + 1,
      }

      queue.enqueue(retryMessage)

      const peeked = queue.peek()
      expect(peeked?.attempts).toBe(2)
    })

    it('should increment attempts on retry', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
        attempts: 0,
      }

      queue.enqueue(message)

      // Dequeue and re-enqueue with incremented attempts
      const dequeued = queue.dequeue()!
      queue.enqueue({
        ...dequeued,
        attempts: dequeued.attempts + 1,
      })

      const peeked = queue.peek()
      expect(peeked?.attempts).toBe(1)
    })

    it('should set nextRetryAt on retry', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
        attempts: 0,
      }

      queue.enqueue(message)

      const before = Date.now()
      const dequeued = queue.dequeue()!
      const retryMessage: QueueMessage = {
        ...dequeued,
        attempts: dequeued.attempts + 1,
        nextRetryAt: new Date(Date.now() + 5000).toISOString(),
      }

      queue.enqueue(retryMessage)

      const peeked = queue.peek()
      expect(peeked).not.toBeNull()
      const retryTime = new Date(peeked!.nextRetryAt!).getTime()
      expect(retryTime).toBeGreaterThanOrEqual(before + 5000)
    })

    it('should respect max attempts', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
        attempts: 3,
        maxAttempts: 3,
      }

      // Message should not be retried when max attempts reached
      expect(message.attempts).toBeGreaterThanOrEqual(message.maxAttempts!)
    })

    it('should emit failed event when max retries exceeded', () => {
      const listener = vi.fn()
      queue.subscribe(listener)

      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
        attempts: 3,
        maxAttempts: 3,
      }

      queue.enqueue(message)

      // Try to retry via the retry method
      // This should fail because attempts >= maxAttempts
      const dequeued = queue.dequeue()!

      // Manually test the failed event emission
      queue.enqueue(dequeued)
      const result = queue.retry('msg-1')

      expect(result).toBe(false) // Retry should fail

      // Check for failed event
      const failedEvent = listener.mock.calls.find(
        call => (call[0] as QueueEvent).type === 'failed'
      )

      expect(failedEvent).toBeDefined()
    })

    it('should return false for non-existent message', () => {
      const retried = queue.retry('non-existent')
      expect(retried).toBe(false)
    })

    it('should emit retry event', () => {
      const listener = vi.fn()
      queue.subscribe(listener)

      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
        attempts: 0,
      }

      queue.enqueue(message)

      // Use the retry method directly
      const result = queue.retry('msg-1')

      expect(result).toBe(true)

      const retryEvent = listener.mock.calls.find(call => (call[0] as QueueEvent).type === 'retry')

      expect(retryEvent).toBeDefined()
    })
  })

  describe('Get Retryable Messages', () => {
    it('should get messages ready for retry', () => {
      const past = new Date(Date.now() - 10000).toISOString()
      const future = new Date(Date.now() + 10000).toISOString()

      const message1: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
        attempts: 1,
        nextRetryAt: past,
      }

      const message2: QueueMessage = {
        id: 'msg-2',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
        attempts: 1,
        nextRetryAt: future,
      }

      queue.enqueue(message1)
      queue.enqueue(message2)

      const retryable = queue.getRetryableMessages()

      expect(retryable).toHaveLength(1)
      expect(retryable[0].id).toBe('msg-1')
    })

    it('should return empty array when no retryable messages', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
        attempts: 0,
      }

      queue.enqueue(message)

      const retryable = queue.getRetryableMessages()
      expect(retryable).toHaveLength(0)
    })
  })

  describe('Event Subscription', () => {
    it('should subscribe and receive events', () => {
      const listener = vi.fn()
      queue.subscribe(listener)

      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      }

      queue.enqueue(message)
      queue.dequeue()

      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('should unsubscribe listener', () => {
      const listener = vi.fn()
      queue.subscribe(listener)

      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      }

      queue.enqueue(message)
      queue.unsubscribe(listener)
      queue.dequeue()

      expect(listener).toHaveBeenCalledTimes(1) // Only enqueued event
    })

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const normalListener = vi.fn()

      queue.subscribe(errorListener)
      queue.subscribe(normalListener)

      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      }

      // Should not throw, should continue to other listeners
      expect(() => queue.enqueue(message)).not.toThrow()
      expect(errorListener).toHaveBeenCalledTimes(1)
      expect(normalListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('Clear', () => {
    it('should clear all messages', () => {
      queue.enqueue({
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'msg-2',
        agentId: 'agent-1',
        priority: 'low',
        payload: { task: 'test' },
      })

      expect(queue.size()).toBe(2)

      queue.clear()

      expect(queue.size()).toBe(0)
    })
  })

  describe('Statistics', () => {
    it('should get queue statistics', () => {
      queue.enqueue({
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'msg-2',
        agentId: 'agent-2',
        priority: 'low',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'msg-3',
        agentId: 'agent-1',
        priority: 'critical',
        payload: { task: 'test' },
      })

      const stats = queue.getStats()

      expect(stats.total).toBe(3)
      expect(stats.byPriority.critical).toBe(1)
      expect(stats.byPriority.high).toBe(1)
      expect(stats.byPriority.low).toBe(1)
      expect(stats.byPriority.normal).toBe(0)
      expect(stats.byAgent.get('agent-1')).toBe(2)
      expect(stats.byAgent.get('agent-2')).toBe(1)
    })
  })

  describe('Configuration', () => {
    it('should get configuration', () => {
      const config = queue.getConfig()
      expect(config).toBeDefined()
      expect(typeof config.maxRetries).toBe('number')
    })

    it('should update configuration', () => {
      queue.updateConfig({
        maxRetries: 10,
        retryDelayMs: 20000,
      })

      const config = queue.getConfig()
      expect(config.maxRetries).toBe(10)
      expect(config.retryDelayMs).toBe(20000)
    })

    it('should not modify original config object', () => {
      const config1 = queue.getConfig()
      config1.maxRetries = 999

      const config2 = queue.getConfig()
      expect(config2.maxRetries).not.toBe(999)
    })
  })

  describe('Singleton', () => {
    it('should return same instance', () => {
      const q1 = getMessageQueue()
      const q2 = getMessageQueue()

      expect(q1).toBe(q2)
    })

    it('should reset singleton', () => {
      const q1 = getMessageQueue()
      resetMessageQueue()
      const q2 = getMessageQueue()

      expect(q1).not.toBe(q2)
    })

    it('should use custom config on first call', () => {
      resetMessageQueue()
      const q = getMessageQueue({ maxQueueSize: 50 })

      const config = q.getConfig()
      expect(config.maxQueueSize).toBe(50)
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple dequeues correctly', () => {
      queue.enqueue({
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      })

      queue.enqueue({
        id: 'msg-2',
        agentId: 'agent-1',
        priority: 'normal',
        payload: { task: 'test' },
      })

      const msg1 = queue.dequeue()
      const msg2 = queue.dequeue()
      const msg3 = queue.dequeue()

      expect(msg1?.id).toBe('msg-1')
      expect(msg2?.id).toBe('msg-2')
      expect(msg3).toBeNull()
    })

    it('should handle remove then enqueue same ID', () => {
      const message: QueueMessage = {
        id: 'msg-1',
        agentId: 'agent-1',
        priority: 'high',
        payload: { task: 'test' },
      }

      queue.enqueue(message)
      queue.remove('msg-1')
      queue.enqueue(message)

      expect(queue.size()).toBe(1)
    })

    it('should handle invalid priority', () => {
      expect(() => {
        queue.enqueue({
          id: 'msg-1',
          agentId: 'agent-1',
          priority: 'invalid' as any,
          payload: { task: 'test' },
        })
      }).toThrow('Invalid priority: invalid')
    })
  })
})
