/**
 * MemoryStorage - 内存存储实现
 * 消息存储在内存中
 */

import {
  IMessage,
  IQueueStats,
  IStorage,
  QueueType
} from '../types';

/**
 * 内存存储
 */
export class MemoryStorage implements IStorage {
  /** 消息存储 */
  protected messages: Map<string, IMessage> = new Map();

  /** 队列消息索引 */
  protected queueMessages: Map<string, Set<string>> = new Map();

  /** 是否已初始化 */
  protected initialized: boolean = false;

  /**
   * 初始化存储
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * 关闭存储
   */
  public async close(): Promise<void> {
    this.messages.clear();
    this.queueMessages.clear();
    this.initialized = false;
  }

  /**
   * 保存消息
   */
  public async saveMessage(message: IMessage): Promise<void> {
    this.messages.set(message.id, message);

    // 添加到队列索引
    if (!this.queueMessages.has(message.queueName)) {
      this.queueMessages.set(message.queueName, new Set());
    }
    this.queueMessages.get(message.queueName)!.add(message.id);
  }

  /**
   * 获取消息
   */
  public async getMessage(messageId: string): Promise<IMessage | null> {
    return this.messages.get(messageId) ?? null;
  }

  /**
   * 获取队列消息
   */
  public async getQueueMessages(queueName: string, limit?: number): Promise<IMessage[]> {
    const messageIds = this.queueMessages.get(queueName);
    if (!messageIds) return [];

    const messages: IMessage[] = [];
    
    for (const messageId of messageIds) {
      const message = this.messages.get(messageId);
      if (message) {
        messages.push(message);
        if (limit && messages.length >= limit) break;
      }
    }

    return messages;
  }

  /**
   * 更新消息
   */
  public async updateMessage(message: IMessage): Promise<void> {
    if (this.messages.has(message.id)) {
      this.messages.set(message.id, message);
    }
  }

  /**
   * 删除消息
   */
  public async deleteMessage(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      // 从队列索引移除
      const queueMsgSet = this.queueMessages.get(message.queueName);
      if (queueMsgSet) {
        queueMsgSet.delete(messageId);
      }
      
      // 删除消息
      this.messages.delete(messageId);
    }
  }

  /**
   * 清空队列
   */
  public async clearQueue(queueName: string): Promise<void> {
    const messageIds = this.queueMessages.get(queueName);
    if (!messageIds) return;

    // 删除队列中的所有消息
    for (const messageId of messageIds) {
      this.messages.delete(messageId);
    }

    // 清空队列索引
    messageIds.clear();
  }

  /**
   * 获取队列统计
   */
  public async getQueueStats(queueName: string): Promise<IQueueStats> {
    const messages = await this.getQueueMessages(queueName);
    
    return {
      name: queueName,
      type: QueueType.NORMAL,
      totalMessages: messages.length,
      pendingMessages: messages.filter(m => m.status === 'pending').length,
      processingMessages: messages.filter(m => m.status === 'processing').length,
      acknowledgedMessages: messages.filter(m => m.status === 'acknowledged').length,
      deadLetterMessages: messages.filter(m => m.status === 'dead-letter').length,
      consumeRate: 0,
      produceRate: 0,
      avgProcessingTime: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * 获取存储统计
   */
  public getStorageStats(): {
    totalMessages: number;
    totalQueues: number;
    memoryUsage: number;
  } {
    return {
      totalMessages: this.messages.size,
      totalQueues: this.queueMessages.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * 估算内存使用
   */
  protected estimateMemoryUsage(): number {
    // 粗略估算
    let usage = 0;
    
    for (const message of this.messages.values()) {
      usage += JSON.stringify(message).length;
    }
    
    return usage;
  }
}