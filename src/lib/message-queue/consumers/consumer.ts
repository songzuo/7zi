/**
 * Consumer - 消费者类
 * 实现消息消费、确认和重试逻辑
 */

import {
  IMessage,
  IMessageHandler,
  IConsumerConfig,
  IConsumerStats,
  ConsumerStatus,
  MessageStatus
} from '../types';
import { Queue } from '../core/queue';
import { DeadLetterQueue } from '../queues/dead-letter-queue';

/**
 * 消费者
 */
export class Consumer {
  /** 消费者ID */
  public id: string;

  /** 消费者组ID */
  public groupId: string;

  /** 队列 */
  protected queue: Queue;

  /** 死信队列 */
  protected deadLetterQueue: DeadLetterQueue;

  /** 配置 */
  protected config: IConsumerConfig;

  /** 处理器 */
  protected handler: IMessageHandler;

  /** 状态 */
  protected status: ConsumerStatus = ConsumerStatus.IDLE;

  /** 统计信息 */
  protected stats: IConsumerStats;

  /** 当前处理的消息 */
  protected currentMessage: IMessage | null = null;

  /** 是否正在运行 */
  protected running: boolean = false;

  /** 是否暂停 */
  protected paused: boolean = false;

  /** 健康检查定时器 */
  protected healthCheckTimer?: NodeJS.Timeout;

  constructor(
    config: IConsumerConfig,
    queue: Queue,
    deadLetterQueue: DeadLetterQueue,
    handler: IMessageHandler
  ) {
    this.id = `consumer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.groupId = config.groupId;
    this.queue = queue;
    this.deadLetterQueue = deadLetterQueue;
    this.config = config;
    this.handler = handler;
    this.stats = this.initStats();
  }

  /**
   * 启动消费者
   */
  public async start(): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.paused = false;
    this.status = ConsumerStatus.ACTIVE;

    // 启动健康检查
    this.startHealthCheck();

    // 开始消费循环
    this.consumeLoop();
  }

  /**
   * 停止消费者
   */
  public async stop(): Promise<void> {
    this.running = false;
    this.paused = false;
    this.status = ConsumerStatus.OFFLINE;

    // 停止健康检查
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * 暂停消费者
   */
  public async pause(): Promise<void> {
    this.paused = true;
    this.status = ConsumerStatus.PAUSED;
  }

  /**
   * 恢复消费者
   */
  public async resume(): Promise<void> {
    this.paused = false;
    this.status = ConsumerStatus.ACTIVE;
    this.consumeLoop();
  }

  /**
   * 消费循环
   */
  protected async consumeLoop(): Promise<void> {
    while (this.running && !this.paused) {
      try {
        // 检查并发限制
        if (this.stats.processingMessages >= (this.config.concurrency || 1)) {
          await this.sleep(100);
          continue;
        }

        // 检查限流
        if (this.config.rateLimit && this.isRateLimited()) {
          await this.sleep(100);
          continue;
        }

        // 获取消息
        const message = await this.queue.consume(this.id);
        
        if (!message) {
          await this.sleep(100);
          continue;
        }

        // 处理消息
        await this.processMessage(message);

      } catch (error) {
        console.error(`Consumer ${this.id} error:`, error);
        this.status = ConsumerStatus.ERROR;
        await this.sleep(1000);
      }
    }
  }

  /**
   * 处理消息
   */
  protected async processMessage(message: IMessage): Promise<void> {
    this.currentMessage = message;
    this.stats.processingMessages++;
    this.stats.lastActiveAt = Date.now();

    const startTime = Date.now();

    try {
      // 调用处理器
      const success = await this.handler(message);

      if (success) {
        // 确认消息
        await this.queue.acknowledge(message.id);
        this.stats.processedMessages++;
      } else {
        // 处理失败，重试或拒绝
        await this.handleFailure(message, 'Handler returned false');
      }

    } catch (error) {
      // 处理异常
      await this.handleFailure(message, error instanceof Error ? error.message : String(error));
    } finally {
      // 更新统计
      const duration = Date.now() - startTime;
      this.updateAvgProcessingTime(duration);
      this.stats.processingMessages--;
      this.currentMessage = null;
    }
  }

  /**
   * 处理失败
   */
  protected async handleFailure(message: IMessage, reason: string): Promise<void> {
    this.stats.failedMessages++;

    // 检查是否可以重试
    const maxRetries = this.config.retryPolicy?.maxRetries ?? 3;
    
    if (message.retryCount < maxRetries) {
      // 重试
      await this.queue.reject(message.id, true);
      
      // 计算退避时间
      const backoffMs = this.calculateBackoff(message.retryCount);
      await this.sleep(backoffMs);
      
    } else {
      // 添加到死信队列
      await this.deadLetterQueue.addDeadLetter(
        message as any,
        this.queue.name,
        reason
      );
      
      // 拒绝消息
      await this.queue.reject(message.id, false);
    }
  }

  /**
   * 计算退避时间
   */
  protected calculateBackoff(retryCount: number): number {
    const policy = this.config.retryPolicy;
    if (!policy) return 1000;

    const baseMs = policy.backoffMs;
    const multiplier = policy.backoffMultiplier;
    
    return baseMs * Math.pow(multiplier, retryCount);
  }

  /**
   * 检查是否限流
   */
  protected isRateLimited(): boolean {
    if (!this.config.rateLimit) return false;

    // 简化实现，实际应使用时间窗口
    const rateLimit = this.config.rateLimit;
    const processedPerSecond = this.stats.processedMessages / 60; // 粗略估算
    
    return processedPerSecond >= rateLimit;
  }

  /**
   * 启动健康检查
   */
  protected startHealthCheck(): void {
    const interval = this.config.healthCheckInterval ?? 30000;

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, interval);
  }

  /**
   * 执行健康检查
   */
  protected performHealthCheck(): void {
    const now = Date.now();
    const inactiveTime = now - this.stats.lastActiveAt;

    // 如果超过5分钟没有活动，标记为离线
    if (inactiveTime > 5 * 60 * 1000 && this.status === ConsumerStatus.ACTIVE) {
      this.status = ConsumerStatus.OFFLINE;
    }
  }

  /**
   * 更新平均处理时间
   */
  protected updateAvgProcessingTime(duration: number): void {
    const total = this.stats.avgProcessingTime * this.stats.processedMessages;
    this.stats.avgProcessingTime = (total + duration) / (this.stats.processedMessages + 1);
  }

  /**
   * 初始化统计信息
   */
  protected initStats(): IConsumerStats {
    return {
      id: this.id,
      groupId: this.groupId,
      queueName: this.queue.name,
      status: this.status,
      processedMessages: 0,
      failedMessages: 0,
      processingMessages: 0,
      avgProcessingTime: 0,
      lastActiveAt: Date.now(),
      lastUpdated: Date.now()
    };
  }

  /**
   * 获取统计信息
   */
  public getStats(): IConsumerStats {
    this.stats.lastUpdated = Date.now();
    return { ...this.stats };
  }

  /**
   * 睡眠
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}