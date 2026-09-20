/**
 * Queue - 队列基类
 * 实现队列的基本操作和管理
 */

import {
  IMessage,
  IMessageOptions,
  IQueueConfig,
  IQueueStats,
  QueueType,
  MessageStatus
} from '../types';
import { Message } from './message';

/**
 * 队列抽象基类
 */
export abstract class Queue {
  /** 队列配置 */
  protected config: IQueueConfig;

  /** 消息存储 */
  protected messages: Map<string, Message> = new Map();

  /** 消息顺序 */
  protected messageOrder: string[] = [];

  /** 统计信息 */
  protected stats: IQueueStats;

  /** 是否已初始化 */
  protected initialized: boolean = false;

  constructor(config: IQueueConfig) {
    this.config = config;
    this.stats = this.initStats();
  }

  /**
   * 获取队列名称
   */
  public get name(): string {
    return this.config.name;
  }

  /**
   * 获取队列类型
   */
  public get type(): QueueType {
    return this.config.type;
  }

  /**
   * 初始化队列
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.onInitialize();
    this.initialized = true;
  }

  /**
   * 关闭队列
   */
  public async close(): Promise<void> {
    await this.onClose();
    this.messages.clear();
    this.messageOrder = [];
    this.initialized = false;
  }

  /**
   * 发布消息
   */
  public async publish<T>(data: T, options?: IMessageOptions): Promise<IMessage<T>> {
    this.ensureInitialized();

    // 检查队列大小限制
    if (this.config.maxSize && this.messages.size >= this.config.maxSize) {
      throw new Error(`Queue ${this.name} is full (max: ${this.config.maxSize})`);
    }

    const message = new Message<T>(this.name, data, options);
    
    await this.onPublish(message);
    
    this.messages.set(message.id, message);
    this.messageOrder.push(message.id);
    
    this.updateStats('produce');
    
    return message.toJSON();
  }

  /**
   * 获取下一条消息
   */
  public async consume(consumerId?: string): Promise<IMessage | null> {
    this.ensureInitialized();

    const message = await this.onConsume(consumerId);
    
    if (message) {
      this.updateStats('consume');
    }
    
    return message?.toJSON() ?? null;
  }

  /**
   * 确认消息
   */
  public async acknowledge(messageId: string): Promise<void> {
    this.ensureInitialized();

    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    await this.onAcknowledge(message);
    
    message.markAcknowledged();
    
    // 从队列中移除已确认的消息
    this.removeMessage(messageId);
  }

  /**
   * 拒绝消息
   */
  public async reject(messageId: string, requeue: boolean = false): Promise<void> {
    this.ensureInitialized();

    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    await this.onReject(message);

    if (requeue && message.canRetry()) {
      message.markRetrying();
      await this.onRequeue(message);
    } else {
      message.markRejected();
      this.removeMessage(messageId);
    }
  }

  /**
   * 获取消息
   */
  public getMessage(messageId: string): IMessage | null {
    const message = this.messages.get(messageId);
    return message?.toJSON() ?? null;
  }

  /**
   * 获取所有消息
   */
  public getAllMessages(): IMessage[] {
    return Array.from(this.messages.values()).map(m => m.toJSON());
  }

  /**
   * 获取队列大小
   */
  public size(): number {
    return this.messages.size;
  }

  /**
   * 清空队列
   */
  public async clear(): Promise<void> {
    this.messages.clear();
    this.messageOrder = [];
    this.stats.totalMessages = 0;
    this.stats.pendingMessages = 0;
    this.stats.processingMessages = 0;
    await this.onClear();
  }

  /**
   * 获取统计信息
   */
  public getStats(): IQueueStats {
    this.stats.lastUpdated = Date.now();
    return { ...this.stats };
  }

  /**
   * 更新统计信息
   */
  protected updateStats(type: 'produce' | 'consume'): void {
    const now = Date.now();
    
    if (type === 'produce') {
      this.stats.totalMessages++;
      this.stats.pendingMessages = this.messageOrder.length;
      this.stats.produceRate = this.calculateRate('produce');
    } else {
      this.stats.acknowledgedMessages++;
      this.stats.consumeRate = this.calculateRate('consume');
    }
    
    this.stats.lastUpdated = now;
  }

  /**
   * 计算速率
   */
  protected calculateRate(type: 'produce' | 'consume'): number {
    // 简化实现，实际应使用时间窗口
    return type === 'produce' ? this.stats.produceRate : this.stats.consumeRate;
  }

  /**
   * 移除消息
   */
  protected removeMessage(messageId: string): void {
    this.messages.delete(messageId);
    const index = this.messageOrder.indexOf(messageId);
    if (index > -1) {
      this.messageOrder.splice(index, 1);
    }
    this.stats.pendingMessages = this.messageOrder.length;
  }

  /**
   * 确保已初始化
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Queue ${this.name} is not initialized`);
    }
  }

  /**
   * 初始化统计信息
   */
  protected initStats(): IQueueStats {
    return {
      name: this.config.name,
      type: this.config.type,
      totalMessages: 0,
      pendingMessages: 0,
      processingMessages: 0,
      acknowledgedMessages: 0,
      deadLetterMessages: 0,
      consumeRate: 0,
      produceRate: 0,
      avgProcessingTime: 0,
      lastUpdated: Date.now()
    };
  }

  // 子类可重写的钩子方法
  protected async onInitialize(): Promise<void> {}
  protected async onClose(): Promise<void> {}
  protected abstract onPublish(message: Message): Promise<void>;
  protected abstract onConsume(consumerId?: string): Promise<Message | null>;
  protected async onAcknowledge(message: Message): Promise<void> {}
  protected async onReject(message: Message): Promise<void> {}
  protected async onRequeue(message: Message): Promise<void> {}
  protected async onClear(): Promise<void> {}
}