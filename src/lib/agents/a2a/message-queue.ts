/**
 * A2A Message Queue - Priority-based message queuing system
 */

import { v4 as uuidv4 } from 'uuid'
import { QueueMessage, MessageQueue, TaskPriority, QueueConfig, QueueEvent } from './types'

export interface QueueListener {
  (event: QueueEvent): void
}

/**
 * Priority-based message queue implementation
 */
export class PriorityMessageQueue implements MessageQueue {
  private queues: Map<TaskPriority, QueueMessage[]> = new Map()
  private messages: Map<string, QueueMessage> = new Map()
  private config: QueueConfig
  private listeners: QueueListener[] = []

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 5000,
      maxQueueSize: 1000,
      ...config,
    }

    // Initialize priority queues
    const priorities: TaskPriority[] = ['low', 'normal', 'high', 'critical']
    priorities.forEach(priority => {
      this.queues.set(priority, [])
    })
  }

  /**
   * Add a message to the queue
   */
  enqueue(message: QueueMessage): void {
    // Check queue size limit
    if (this.size() >= this.config.maxQueueSize) {
      throw new Error('Queue is full')
    }

    // Validate message
    if (!message.id) message.id = uuidv4()
    if (!message.priority) message.priority = 'normal'
    if (!message.createdAt) message.createdAt = new Date().toISOString()
    if (message.attempts === undefined) message.attempts = 0
    if (message.maxAttempts === undefined) message.maxAttempts = this.config.maxRetries

    // Store message
    this.messages.set(message.id, message)

    // Add to priority queue
    const queue = this.queues.get(message.priority)
    if (!queue) {
      throw new Error(`Invalid priority: ${message.priority}`)
    }
    queue.push(message)

    // Emit event
    this.emitEvent({
      type: 'enqueued',
      message,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Remove and return the highest priority message
   */
  dequeue(): QueueMessage | null {
    const priorities: TaskPriority[] = ['critical', 'high', 'normal', 'low']

    for (const priority of priorities) {
      const queue = this.queues.get(priority)
      if (queue && queue.length > 0) {
        const message = queue.shift()!
        this.messages.delete(message.id)

        this.emitEvent({
          type: 'dequeued',
          message,
          timestamp: new Date().toISOString(),
        })

        return message
      }
    }

    return null
  }

  /**
   * Look at the highest priority message without removing it
   */
  peek(): QueueMessage | null {
    const priorities: TaskPriority[] = ['critical', 'high', 'normal', 'low']

    for (const priority of priorities) {
      const queue = this.queues.get(priority)
      if (queue && queue.length > 0) {
        return queue[0]
      }
    }

    return null
  }

  /**
   * Remove a specific message from the queue
   */
  remove(messageId: string): boolean {
    const message = this.messages.get(messageId)
    if (!message) return false

    const queue = this.queues.get(message.priority)
    if (!queue) return false

    const index = queue.findIndex(m => m.id === messageId)
    if (index === -1) return false

    queue.splice(index, 1)
    this.messages.delete(messageId)

    return true
  }

  /**
   * Get total queue size
   */
  size(): number {
    return Array.from(this.queues.values()).reduce((sum, queue) => sum + queue.length, 0)
  }

  /**
   * Get all messages for a specific agent
   */
  getMessagesByAgent(agentId: string): QueueMessage[] {
    return Array.from(this.messages.values())
      .filter(m => m.agentId === agentId)
      .sort((a, b) => this.comparePriority(a.priority, b.priority))
  }

  /**
   * Get all messages with a specific priority
   */
  getMessagesByPriority(priority: TaskPriority): QueueMessage[] {
    const queue = this.queues.get(priority)
    return queue ? [...queue] : []
  }

  /**
   * Retry a failed message
   */
  retry(messageId: string): boolean {
    const originalMessage = this.messages.get(messageId)
    if (!originalMessage) return false

    // Remove from current queue
    this.remove(messageId)

    // Check retry limit
    if (originalMessage.attempts >= originalMessage.maxAttempts) {
      this.emitEvent({
        type: 'failed',
        message: originalMessage,
        timestamp: new Date().toISOString(),
        error: 'Max retries exceeded',
      })
      return false
    }

    // Create retry message
    const retryMessage: QueueMessage = {
      ...originalMessage,
      attempts: originalMessage.attempts + 1,
      nextRetryAt: new Date(Date.now() + this.config.retryDelayMs).toISOString(),
    }

    this.enqueue(retryMessage)

    this.emitEvent({
      type: 'retry',
      message: retryMessage,
      timestamp: new Date().toISOString(),
    })

    return true
  }

  /**
   * Get messages ready for retry
   */
  getRetryableMessages(): QueueMessage[] {
    const now = new Date().toISOString()
    return Array.from(this.messages.values()).filter(
      m => m.nextRetryAt !== undefined && m.nextRetryAt <= now
    )
  }

  /**
   * Subscribe to queue events
   */
  subscribe(listener: QueueListener): void {
    this.listeners.push(listener)
  }

  /**
   * Unsubscribe from queue events
   */
  unsubscribe(listener: QueueListener): void {
    this.listeners = this.listeners.filter(l => l !== listener)
  }

  /**
   * Clear all messages from the queue
   */
  clear(): void {
    this.queues.forEach(queue => (queue.length = 0))
    this.messages.clear()
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number
    byPriority: Record<TaskPriority, number>
    byAgent: Map<string, number>
  } {
    const byPriority: Record<TaskPriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
    }

    const byAgent = new Map<string, number>()

    for (const message of this.messages.values()) {
      byPriority[message.priority]++
      byAgent.set(message.agentId, (byAgent.get(message.agentId) || 0) + 1)
    }

    return {
      total: this.size(),
      byPriority,
      byAgent,
    }
  }

  /**
   * Get queue configuration
   */
  getConfig(): QueueConfig {
    return { ...this.config }
  }

  /**
   * Update queue configuration
   */
  updateConfig(updates: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Compare two priorities (higher priority returns negative number)
   */
  private comparePriority(a: TaskPriority, b: TaskPriority): number {
    const priorityOrder: TaskPriority[] = ['critical', 'high', 'normal', 'low']
    const aIndex = priorityOrder.indexOf(a)
    const bIndex = priorityOrder.indexOf(b)
    return aIndex - bIndex
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: QueueEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Queue listener error:', error)
      }
    })
  }
}

/**
 * File-based message queue for persistence
 */
export class FileMessageQueue implements MessageQueue {
  private queue: PriorityMessageQueue
  private filePath: string
  private flushInterval: NodeJS.Timeout | null = null

  constructor(filePath: string, config?: Partial<QueueConfig>) {
    this.queue = new PriorityMessageQueue(config)
    this.filePath = filePath

    // Auto-flush every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 5000)
  }

  enqueue(message: QueueMessage): void {
    this.queue.enqueue(message)
    this.flush()
  }

  dequeue(): QueueMessage | null {
    const message = this.queue.dequeue()
    if (message) this.flush()
    return message
  }

  peek(): QueueMessage | null {
    return this.queue.peek()
  }

  remove(messageId: string): boolean {
    const removed = this.queue.remove(messageId)
    if (removed) this.flush()
    return removed
  }

  size(): number {
    return this.queue.size()
  }

  getMessagesByAgent(agentId: string): QueueMessage[] {
    return this.queue.getMessagesByAgent(agentId)
  }

  getMessagesByPriority(priority: TaskPriority): QueueMessage[] {
    return this.queue.getMessagesByPriority(priority)
  }

  retry(messageId: string): boolean {
    const retried = this.queue.retry(messageId)
    if (retried) this.flush()
    return retried
  }

  /**
   * Flush queue state to disk
   */
  flush(): void {
    // Implementation depends on environment (Node.js vs Edge)
    // For now, this is a placeholder
    // In production, use fs.writeFileSync or similar
  }

  /**
   * Load queue state from disk
   */
  load(): void {
    // Implementation depends on environment
    // For now, this is a placeholder
  }

  /**
   * Stop auto-flushing
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    this.flush()
  }

  // Forward other methods
  subscribe(listener: QueueListener): void {
    this.queue.subscribe(listener)
  }

  unsubscribe(listener: QueueListener): void {
    this.queue.unsubscribe(listener)
  }

  clear(): void {
    this.queue.clear()
    this.flush()
  }

  getStats() {
    return this.queue.getStats()
  }

  getConfig(): QueueConfig {
    return this.queue.getConfig()
  }

  updateConfig(updates: Partial<QueueConfig>): void {
    this.queue.updateConfig(updates)
  }
}

// Singleton instance
let queueInstance: PriorityMessageQueue | null = null

export function getMessageQueue(config?: Partial<QueueConfig>): PriorityMessageQueue {
  if (!queueInstance) {
    queueInstance = new PriorityMessageQueue(config)
  }
  return queueInstance
}

export function resetMessageQueue(): void {
  queueInstance = null
}
