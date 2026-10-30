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
} from '../types';
import { Message } from './message';

/** 默认可见性超时 (毫秒): 已被消费但未确认的消息在此窗口内不会重复投递 */
const DEFAULT_VISIBILITY_TIMEOUT = 30000;

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

  /** 可见性超时 (毫秒): 消费中消息在此时长内不会重复投递 */
  protected visibilityTimeout: number;

  /** 消费中 (in-flight) 的消息: messageId -> 重新可见的时间戳 */
  protected inFlight: Map<string, number> = new Map();

  /** 是否已初始化 */
  protected initialized: boolean = false;

  constructor(config: IQueueConfig) {
    this.config = config;
    this.visibilityTimeout = config.visibilityTimeout ?? DEFAULT_VISIBILITY_TIMEOUT;
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

    // 释放可见性超时的消息, 允许重新投递
    this.releaseExpiredInFlight();

    const message = await this.onConsume(consumerId);
    
    if (message) {
      this.updateStats('consume');
    }
    
    return message?.toJSON() ?? null;
  }

  /**
   * 选定一条待投递消息: 标记消费中并进入处理状态
   *
   * 该方法必须在子类选取消息时同步调用, 以保证并发消费时
   * 同一条消息不会被同时投递给多个消费者
   */
  protected deliver(message: Message, consumerId?: string): Message {
    // 标记为消费中: 在可见性超时窗口内不会重复投递给其他消费者
    this.markInFlight(message.id);
    message.markProcessing(consumerId);
    return message;
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
    this.clearInFlight(messageId);
    this.updateStats('acknowledge');
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
      // 重新入队: 解除消费中标记, 使消息可以再次被投递
      this.clearInFlight(messageId);
      await this.onRequeue(message);
    } else {
      message.markRejected();
      this.removeMessage(messageId);
      this.clearInFlight(messageId);
    }
  }

  /**
   * 标记消息为消费中
   */
  protected markInFlight(messageId: string): void {
    this.inFlight.set(messageId, Date.now() + this.visibilityTimeout);
  }

  /**
   * 解除消费中标记
   */
  protected clearInFlight(messageId: string): void {
    this.inFlight.delete(messageId);
  }

  /**
   * 检查消息是否仍在消费中 (未超过可见性超时)
   */
  protected isInFlight(messageId: string): boolean {
    const deadline = this.inFlight.get(messageId);
    if (deadline === undefined) return false;
    return Date.now() < deadline;
  }

  /**
   * 释放可见性超时的消息, 使其可以重新被投递
   */
  protected releaseExpiredInFlight(): void {
    const now = Date.now();
    for (const [messageId, deadline] of this.inFlight) {
      if (now >= deadline) {
        this.inFlight.delete(messageId);
      }
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
  protected updateStats(type: 'produce' | 'consume' | 'acknowledge'): void {
    const now = Date.now();
    
    if (type === 'produce') {
      this.stats.totalMessages++;
      this.stats.pendingMessages = this.messageOrder.length;
      this.stats.produceRate = this.calculateRate('produce');
    } else if (type === 'consume') {
      // 已投递但尚未确认: 计入处理中
      this.stats.processingMessages = this.inFlight.size;
      this.stats.consumeRate = this.calculateRate('consume');
    } else {
      // 确认后才计入已确认数
      this.stats.acknowledgedMessages++;
      this.stats.processingMessages = this.inFlight.size;
      this.stats.pendingMessages = this.messageOrder.length;
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
  protected async onAcknowledge(_message: Message): Promise<void> {}
  protected async onReject(_message: Message): Promise<void> {}
  protected async onRequeue(_message: Message): Promise<void> {}
  protected async onClear(): Promise<void> {}
}