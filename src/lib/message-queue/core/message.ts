/**
 * Message - 消息核心类
 * 实现消息的创建、状态管理和生命周期控制
 */

import {
  IMessage,
  IMessageOptions,
  MessageStatus
} from '../types';

/**
 * 消息类
 */
export class Message<T = any> implements IMessage<T> {
  /** 消息唯一ID */
  public id: string;

  /** 队列名称 */
  public queueName: string;

  /** 消息数据 */
  public data: T;

  /** 消息状态 */
  public status: MessageStatus;

  /** 优先级 (1-10) */
  public priority?: number;

  /** 延迟执行时间 (毫秒) */
  public delay?: number;

  /** 创建时间 */
  public createdAt: number;

  /** 过期时间 */
  public expiresAt?: number;

  /** 重试次数 */
  public retryCount: number;

  /** 最大重试次数 */
  public maxRetries: number;

  /** 消费者ID */
  public consumerId?: string;

  /** 开始处理时间 */
  public processingStartedAt?: number;

  /** 元数据 */
  public metadata?: Record<string, any>;

  constructor(
    queueName: string,
    data: T,
    options: IMessageOptions = {}
  ) {
    this.id = this.generateId();
    this.queueName = queueName;
    this.data = data;
    this.status = MessageStatus.PENDING;
    this.priority = options.priority;
    this.delay = options.delay;
    this.createdAt = Date.now();
    this.retryCount = 0;
    this.maxRetries = options.maxRetries ?? 3;
    this.metadata = options.metadata;

    // 设置过期时间
    if (options.ttl) {
      this.expiresAt = this.createdAt + options.ttl;
    }
  }

  /**
   * 生成唯一消息ID
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `msg_${timestamp}_${random}`;
  }

  /**
   * 检查消息是否过期
   */
  public isExpired(): boolean {
    if (!this.expiresAt) return false;
    return Date.now() > this.expiresAt;
  }

  /**
   * 检查消息是否需要延迟处理
   */
  public needsDelay(): boolean {
    if (!this.delay) return false;
    return Date.now() < this.createdAt + this.delay;
  }

  /**
   * 获取延迟剩余时间 (毫秒)
   */
  public getDelayRemaining(): number {
    if (!this.delay) return 0;
    const elapsed = Date.now() - this.createdAt;
    return Math.max(0, this.delay - elapsed);
  }

  /**
   * 检查是否可以重试
   */
  public canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  /**
   * 标记为处理中
   */
  public markProcessing(consumerId?: string): void {
    this.status = MessageStatus.PROCESSING;
    this.consumerId = consumerId;
    this.processingStartedAt = Date.now();
  }

  /**
   * 标记为已确认
   */
  public markAcknowledged(): void {
    this.status = MessageStatus.ACKNOWLEDGED;
    this.consumerId = undefined;
    this.processingStartedAt = undefined;
  }

  /**
   * 标记为已拒绝
   */
  public markRejected(): void {
    this.status = MessageStatus.REJECTED;
    this.consumerId = undefined;
    this.processingStartedAt = undefined;
  }

  /**
   * 标记为重试中
   */
  public markRetrying(): void {
    this.status = MessageStatus.RETRYING;
    this.retryCount++;
    this.consumerId = undefined;
    this.processingStartedAt = undefined;
  }

  /**
   * 标记为死信
   */
  public markDeadLetter(): void {
    this.status = MessageStatus.DEAD_LETTER;
    this.consumerId = undefined;
    this.processingStartedAt = undefined;
  }

  /**
   * 获取处理时长 (毫秒)
   */
  public getProcessingDuration(): number | null {
    if (!this.processingStartedAt) return null;
    return Date.now() - this.processingStartedAt;
  }

  /**
   * 转换为JSON
   */
  public toJSON(): IMessage<T> {
    return {
      id: this.id,
      queueName: this.queueName,
      data: this.data,
      status: this.status,
      priority: this.priority,
      delay: this.delay,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      consumerId: this.consumerId,
      processingStartedAt: this.processingStartedAt,
      metadata: this.metadata
    };
  }

  /**
   * 从JSON创建消息
   */
  public static fromJSON<T>(json: IMessage<T>): Message<T> {
    const message = new Message<T>(json.queueName, json.data, {
      priority: json.priority,
      delay: json.delay,
      ttl: json.expiresAt ? json.expiresAt - json.createdAt : undefined,
      maxRetries: json.maxRetries,
      metadata: json.metadata
    });

    message.id = json.id;
    message.status = json.status;
    message.createdAt = json.createdAt;
    message.expiresAt = json.expiresAt;
    message.retryCount = json.retryCount;
    message.consumerId = json.consumerId;
    message.processingStartedAt = json.processingStartedAt;

    return message;
  }
}