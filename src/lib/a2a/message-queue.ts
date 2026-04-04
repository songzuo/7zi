/**
 * A2A Protocol v2 - Message Queue System
 * 优先级消息队列，支持重试、事件订阅、统计
 */

import { EventEmitter } from 'events'
import {
  QueueMessage,
  QueueConfig,
  QueueStats,
  QueueEvent,
  MessageQueue,
  TaskPriority,
  PRIORITY_WEIGHTS,
  A2AError,
  A2AErrorType,
  generateId,
  isValidPriority,
} from './types'

/**
 * 内存优先级消息队列
 */
export class PriorityMessageQueue implements MessageQueue {
  private queues: Map<TaskPriority, QueueMessage[]> = new Map()
  private messages: Map<string, QueueMessage> = new Map()
  private config: QueueConfig
  private eventEmitter = new EventEmitter()

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      retryDelayMs: config?.retryDelayMs ?? 5000,
      maxQueueSize: config?.maxQueueSize ?? 1000,
    }

    // 初始化优先级队列
    this.queues.set('critical', [])
    this.queues.set('high', [])
    this.queues.set('normal', [])
    this.queues.set('low', [])
  }

  /**
   * 将消息加入队列
   */
  enqueue(message: Omit<QueueMessage, 'id' | 'createdAt' | 'attempts'>): string {
    // 检查队列大小限制
    if (this.size() >= this.config.maxQueueSize) {
      throw new A2AError(A2AErrorType.QUEUE_FULL, 'Queue has reached maximum size', {
        maxSize: this.config.maxQueueSize,
      })
    }

    // 验证优先级
    if (!isValidPriority(message.priority)) {
      throw new A2AError(A2AErrorType.INVALID_PRIORITY, `Invalid priority: ${message.priority}`)
    }

    // 创建完整消息
    const fullMessage: QueueMessage = {
      id: generateId('msg'),
      taskId: message.taskId,
      agentId: message.agentId,
      priority: message.priority,
      payload: message.payload,
      createdAt: new Date().toISOString(),
      attempts: message.attempts ?? 0,
      maxAttempts: message.maxAttempts ?? this.config.maxRetries,
    }

    // 添加到队列
    this.queues.get(message.priority)!.push(fullMessage)
    this.messages.set(fullMessage.id, fullMessage)

    // 发出事件
    this.emitEvent('enqueued', fullMessage)

    return fullMessage.id
  }

  /**
   * 从队列中取出最高优先级的消息
   */
  dequeue(): QueueMessage | null {
    // 按优先级顺序检查
    const priorities: TaskPriority[] = ['critical', 'high', 'normal', 'low']

    for (const priority of priorities) {
      const queue = this.queues.get(priority)!
      if (queue.length > 0) {
        const message = queue.shift()!
        this.messages.delete(message.id)
        this.emitEvent('dequeued', message)
        return message
      }
    }

    return null
  }

  /**
   * 查看队列头部消息但不移除
   */
  peek(): QueueMessage | null {
    const priorities: TaskPriority[] = ['critical', 'high', 'normal', 'low']

    for (const priority of priorities) {
      const queue = this.queues.get(priority)!
      if (queue.length > 0) {
        return queue[0]
      }
    }

    return null
  }

  /**
   * 移除指定消息
   */
  remove(messageId: string): boolean {
    const message = this.messages.get(messageId)
    if (!message) {
      return false
    }

    // 从优先级队列中移除
    const queue = this.queues.get(message.priority)!
    const index = queue.findIndex(m => m.id === messageId)
    if (index !== -1) {
      queue.splice(index, 1)
    }

    // 从消息映射中移除
    this.messages.delete(messageId)

    return true
  }

  /**
   * 获取队列大小
   */
  size(): number {
    return this.messages.size
  }

  /**
   * 获取指定 Agent 的所有消息
   */
  getMessagesByAgent(agentId: string): QueueMessage[] {
    return Array.from(this.messages.values()).filter(m => m.agentId === agentId)
  }

  /**
   * 获取指定优先级的所有消息
   */
  getMessagesByPriority(priority: TaskPriority): QueueMessage[] {
    if (!isValidPriority(priority)) {
      return []
    }
    return [...this.queues.get(priority)!]
  }

  /**
   * 重试消息
   */
  retry(messageId: string): boolean {
    const message = this.messages.get(messageId)
    if (!message) {
      return false
    }

    // 检查重试次数
    if (message.attempts >= message.maxAttempts) {
      this.remove(messageId)
      this.emitEvent('failed', message, 'Max retries exceeded')
      return false
    }

    // 增加重试次数
    message.attempts += 1
    message.nextRetryAt = new Date(Date.now() + this.config.retryDelayMs).toISOString()

    // 发出重试事件
    this.emitEvent('retry', message)

    return true
  }

  /**
   * 获取队列统计信息
   */
  getStats(): QueueStats {
    const byPriority: Record<TaskPriority, number> = {
      critical: this.queues.get('critical')!.length,
      high: this.queues.get('high')!.length,
      normal: this.queues.get('normal')!.length,
      low: this.queues.get('low')!.length,
    }

    const byAgent: Record<string, number> = {}
    for (const message of this.messages.values()) {
      byAgent[message.agentId] = (byAgent[message.agentId] || 0) + 1
    }

    return {
      total: this.messages.size,
      byPriority,
      byAgent,
    }
  }

  /**
   * 订阅队列事件
   */
  subscribe(listener: (event: QueueEvent) => void): () => void {
    this.eventEmitter.on('event', listener)
    return () => this.eventEmitter.off('event', listener)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<QueueConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    }
  }

  /**
   * 获取配置
   */
  getConfig(): QueueConfig {
    return { ...this.config }
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queues.set('critical', [])
    this.queues.set('high', [])
    this.queues.set('normal', [])
    this.queues.set('low', [])
    this.messages.clear()
  }

  /**
   * 标记消息为已完成
   */
  complete(messageId: string): boolean {
    const message = this.messages.get(messageId)
    if (!message) {
      return false
    }

    this.remove(messageId)
    this.emitEvent('completed', message)
    return true
  }

  /**
   * 发出事件
   */
  private emitEvent(
    type: QueueEvent['type'],
    message: QueueMessage,
    error?: string
  ): void {
    const event: QueueEvent = {
      type,
      message,
      timestamp: new Date().toISOString(),
      error,
    }
    this.eventEmitter.emit('event', event)
  }
}

/**
 * 文件持久化消息队列
 */
export class FileMessageQueue extends PriorityMessageQueue {
  private filePath: string
  private flushInterval: NodeJS.Timeout | null = null
  private dirty = false

  constructor(filePath: string, config?: Partial<QueueConfig>) {
    super(config)
    this.filePath = filePath
    this.load()
    this.startAutoFlush()
  }

  /**
   * 从文件加载队列
   */
  private load(): void {
    try {
      const fs = require('fs')
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
        // 恢复队列状态
        for (const message of data.messages || []) {
          super.enqueue(message)
        }
      }
    } catch {
      // 文件不存在或解析失败，忽略
    }
  }

  /**
   * 保存队列到文件
   */
  private save(): void {
    try {
      const fs = require('fs')
      const data = {
        messages: Array.from(this.getMessages()),
        config: this.getConfig(),
      }
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2))
      this.dirty = false
    } catch (error) {
      console.error('Failed to save queue:', error)
    }
  }

  /**
   * 开始自动刷新
   */
  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      if (this.dirty) {
        this.save()
      }
    }, 30000) // 每30秒刷新一次
  }

  /**
   * 标记需要保存
   */
  override enqueue(
    message: Omit<QueueMessage, 'id' | 'createdAt' | 'attempts'>
  ): string {
    const id = super.enqueue(message)
    this.dirty = true
    return id
  }

  /**
   * 标记需要保存
   */
  override dequeue(): QueueMessage | null {
    const message = super.dequeue()
    if (message) {
      this.dirty = true
    }
    return message
  }

  /**
   * 获取所有消息
   */
  private getMessages(): QueueMessage[] {
    return [
      ...this.getMessagesByPriority('critical'),
      ...this.getMessagesByPriority('high'),
      ...this.getMessagesByPriority('normal'),
      ...this.getMessagesByPriority('low'),
    ]
  }

  /**
   * 手动刷新
   */
  flush(): void {
    if (this.dirty) {
      this.save()
    }
  }

  /**
   * 关闭队列
   */
  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
  }
}

// 单例实例
let defaultQueue: PriorityMessageQueue | null = null

/**
 * 获取默认消息队列实例
 */
export function getMessageQueue(config?: Partial<QueueConfig>): PriorityMessageQueue {
  if (!defaultQueue) {
    defaultQueue = new PriorityMessageQueue(config)
  }
  return defaultQueue
}

/**
 * 获取文件持久化消息队列实例
 */
export function getFileMessageQueue(
  filePath: string,
  config?: Partial<QueueConfig>
): FileMessageQueue {
  return new FileMessageQueue(filePath, config)
}
