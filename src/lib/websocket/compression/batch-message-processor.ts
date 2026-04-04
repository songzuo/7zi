/**
 * WebSocket Batch Message Processor
 * 
 * Features:
 * - Batches multiple messages into single transmission
 * - Configurable batch window and size limits
 * - Priority queue for important messages
 * - Real-time flush for urgent messages
 * 
 * Technical Stack: Node.js + Socket.IO
 * 
 * @author Executor Subagent
 * @date 2026-04-03
 */

import EventEmitter from 'events'

// ============================================================================
// Types
// ============================================================================

export interface BatchConfig {
  /** Maximum messages per batch */
  maxBatchSize?: number
  /** Maximum time to wait before flushing (ms) */
  batchWindow?: number
  /** Maximum batch payload size in bytes */
  maxPayloadSize?: number
  /** Enable priority queue */
  enablePriority?: boolean
  /** Auto-flush on batch window */
  autoFlush?: boolean
  /** Flush immediately for high priority messages */
  flushOnHighPriority?: boolean
}

export interface QueuedMessage<T = unknown> {
  id: string
  event: string
  data: T
  priority: MessagePriority
  timestamp: number
  size: number
  target?: string | string[]
}

export interface BatchResult {
  batchId: string
  messageCount: number
  totalSize: number
  events: string[]
  timestamp: number
  flushReason: 'size' | 'window' | 'priority' | 'manual'
}

export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}

export interface BatchStats {
  totalMessages: number
  totalBatches: number
  averageBatchSize: number
  averageWaitTime: number
  priorityDistribution: Record<MessagePriority, number>
  flushReasons: {
    size: number
    window: number
    priority: number
    manual: number
  }
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: Required<BatchConfig> = {
  maxBatchSize: 50,
  batchWindow: 10,         // 10ms
  maxPayloadSize: 1024 * 64, // 64KB
  enablePriority: true,
  autoFlush: true,
  flushOnHighPriority: true
}

// ============================================================================
// Batch Message Processor
// ============================================================================

export class BatchMessageProcessor extends EventEmitter {
  private config: Required<BatchConfig>
  private queue: QueuedMessage[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private stats: BatchStats
  private isFlushing: boolean = false
  private batchCounter: number = 0

  constructor(config: BatchConfig = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.stats = {
      totalMessages: 0,
      totalBatches: 0,
      averageBatchSize: 0,
      averageWaitTime: 0,
      priorityDistribution: {
        [MessagePriority.LOW]: 0,
        [MessagePriority.NORMAL]: 0,
        [MessagePriority.HIGH]: 0,
        [MessagePriority.URGENT]: 0
      },
      flushReasons: {
        size: 0,
        window: 0,
        priority: 0,
        manual: 0
      }
    }
  }

  /**
   * Add message to batch queue
   */
  public add<T = unknown>(
    event: string,
    data: T,
    priority: MessagePriority = MessagePriority.NORMAL,
    target?: string | string[]
  ): string {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const size = this.calculateSize(data)
    
    const message: QueuedMessage = {
      id,
      event,
      data,
      priority,
      timestamp: Date.now(),
      size,
      target
    }
    
    // Update stats
    this.stats.totalMessages++
    this.stats.priorityDistribution[priority]++
    
    // Insert into queue (priority order if enabled)
    if (this.config.enablePriority) {
      this.insertByPriority(message)
    } else {
      this.queue.push(message)
    }
    
    // Emit for monitoring
    this.emit('message-queued', message)
    
    // Check if we should flush
    this.checkFlush(priority)
    
    return id
  }

  /**
   * Manually flush the queue
   */
  public flush(): BatchResult | null {
    if (this.queue.length === 0 || this.isFlushing) {
      return null
    }
    
    this.clearFlushTimer()
    return this.performFlush('manual')
  }

  /**
   * Flush immediately for urgent messages
   */
  public flushImmediate(): BatchResult | null {
    if (this.queue.length === 0) {
      return null
    }
    
    this.clearFlushTimer()
    return this.performFlush('priority')
  }

  /**
   * Get current queue size
   */
  public getQueueSize(): number {
    return this.queue.length
  }

  /**
   * Get current queue payload size
   */
  public getQueuePayloadSize(): number {
    return this.queue.reduce((sum, msg) => sum + msg.size, 0)
  }

  /**
   * Get statistics
   */
  public getStats(): BatchStats {
    return { ...this.stats }
  }

  /**
   * Clear the queue
   */
  public clearQueue(): void {
    this.queue = []
    this.clearFlushTimer()
    this.emit('queue-cleared')
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Process a batch of messages
   * Returns the messages ready for transmission
   */
  public createBatch<T = unknown>(messages: QueuedMessage<T>[]): {
    batchId: string
    events: Array<{ event: string; data: T; target?: string | string[] }>
    totalSize: number
  } {
    const batchId = `batch_${Date.now()}_${++this.batchCounter}`
    
    const events = messages.map(msg => ({
      event: msg.event,
      data: msg.data,
      target: msg.target
    }))
    
    const totalSize = messages.reduce((sum, msg) => sum + msg.size, 0)
    
    return { batchId, events, totalSize }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private insertByPriority(message: QueuedMessage): void {
    // Find insertion point based on priority
    let insertIndex = this.queue.length
    
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < message.priority) {
        insertIndex = i
        break
      }
    }
    
    this.queue.splice(insertIndex, 0, message)
  }

  private checkFlush(priority: MessagePriority): void {
    // Immediate flush for urgent messages
    if (priority === MessagePriority.URGENT && this.config.flushOnHighPriority) {
      this.flushImmediate()
      return
    }
    
    // Check if batch is full
    if (this.queue.length >= this.config.maxBatchSize) {
      this.clearFlushTimer()
      this.performFlush('size')
      return
    }
    
    // Check payload size
    if (this.getQueuePayloadSize() >= this.config.maxPayloadSize) {
      this.clearFlushTimer()
      this.performFlush('size')
      return
    }
    
    // Start batch window timer
    if (this.config.autoFlush && !this.flushTimer && priority !== MessagePriority.URGENT) {
      this.startFlushTimer()
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      if (this.queue.length > 0) {
        this.performFlush('window')
      }
    }, this.config.batchWindow)
  }

  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }

  private performFlush(reason: BatchResult['flushReason']): BatchResult {
    if (this.isFlushing || this.queue.length === 0) {
      return {
        batchId: `empty_${Date.now()}`,
        messageCount: 0,
        totalSize: 0,
        events: [],
        timestamp: Date.now(),
        flushReason: reason
      }
    }
    
    this.isFlushing = true
    
    // Get messages to flush
    const messages = [...this.queue]
    this.queue = []
    
    // Calculate wait time
    const now = Date.now()
    const avgWaitTime = messages.reduce((sum, msg) => sum + (now - msg.timestamp), 0) / messages.length
    
    // Create batch
    const batchId = `batch_${Date.now()}_${++this.batchCounter}`
    const events = messages.map(msg => ({
      event: msg.event,
      data: msg.data,
      target: msg.target
    }))
    const totalSize = messages.reduce((sum, msg) => sum + msg.size, 0)
    
    // Update stats
    this.stats.totalBatches++
    this.stats.flushReasons[reason]++
    
    // Calculate running average
    const prevAvg = this.stats.averageBatchSize
    const prevCount = this.stats.totalBatches - 1
    this.stats.averageBatchSize = (prevAvg * prevCount + messages.length) / this.stats.totalBatches
    
    // Average wait time
    const prevWaitAvg = this.stats.averageWaitTime
    this.stats.averageWaitTime = (prevWaitAvg * prevCount + avgWaitTime) / this.stats.totalBatches
    
    const result: BatchResult = {
      batchId,
      messageCount: messages.length,
      totalSize,
      events: events.map(e => e.event),
      timestamp: now,
      flushReason: reason
    }
    
    this.isFlushing = false
    
    // Emit batch ready event
    this.emit('batch-ready', {
      batchId,
      events,
      messages
    })
    
    return result
  }

  private calculateSize(data: unknown): number {
    try {
      if (Buffer.isBuffer(data)) {
        return data.length
      }
      return Buffer.byteLength(JSON.stringify(data), 'utf8')
    } catch {
      return 1024 // Default size estimate
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let batchProcessorInstance: BatchMessageProcessor | null = null

export function getBatchProcessor(config?: BatchConfig): BatchMessageProcessor {
  if (!batchProcessorInstance) {
    batchProcessorInstance = new BatchMessageProcessor(config)
  }
  return batchProcessorInstance
}

export function resetBatchProcessor(): void {
  batchProcessorInstance = null
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a batched message payload
 */
export function createBatchPayload<T = unknown>(events: Array<{ event: string; data: T }>): {
  type: 'batch'
  events: Array<{ event: string; data: T }>
  count: number
} {
  return {
    type: 'batch',
    events,
    count: events.length
  }
}

/**
 * Parse batched message payload
 */
export function parseBatchPayload<T = unknown>(payload: unknown): Array<{ event: string; data: T }> | null {
  if (!payload || typeof payload !== 'object' || (payload as Record<string, unknown>).type !== 'batch' || !Array.isArray((payload as Record<string, unknown>).events)) {
    return null
  }
  
  return (payload as { events: Array<{ event: string; data: T }> }).events
}
