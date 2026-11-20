/**
 * ConsumerGroup - 消费者组类
 * 实现消费者组管理和负载均衡
 */

import {
  IConsumerConfig,
  IConsumerStats,
  IMessageHandler,
  ConsumerStatus
} from '../types';
import { Queue } from '../core/queue';
import { DeadLetterQueue } from '../queues/dead-letter-queue';
import { Consumer } from './consumer';

/**
 * 消费者组
 */
export class ConsumerGroup {
  /** 消费者组ID */
  public groupId: string;

  /** 队列 */
  protected queue: Queue;

  /** 死信队列 */
  protected deadLetterQueue: DeadLetterQueue;

  /** 配置 */
  protected config: IConsumerConfig;

  /** 消费者映射 */
  protected consumers: Map<string, Consumer> = new Map();

  /** 是否正在运行 */
  protected running: boolean = false;

  constructor(
    config: IConsumerConfig,
    queue: Queue,
    deadLetterQueue: DeadLetterQueue
  ) {
    this.groupId = config.groupId;
    this.queue = queue;
    this.deadLetterQueue = deadLetterQueue;
    this.config = config;
  }

  /**
   * 添加消费者
   */
  public async addConsumer(handler: IMessageHandler): Promise<string> {
    const consumer = new Consumer(
      this.config,
      this.queue,
      this.deadLetterQueue,
      handler
    );

    this.consumers.set(consumer.id, consumer);

    // 如果组正在运行，启动消费者
    if (this.running) {
      await consumer.start();
    }

    return consumer.id;
  }

  /**
   * 移除消费者
   */
  public async removeConsumer(consumerId: string): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      await consumer.stop();
      this.consumers.delete(consumerId);
    }
  }

  /**
   * 启动消费者组
   */
  public async start(): Promise<void> {
    if (this.running) return;

    this.running = true;

    // 启动所有消费者
    for (const consumer of this.consumers.values()) {
      await consumer.start();
    }
  }

  /**
   * 停止消费者组
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    // 停止所有消费者
    for (const consumer of this.consumers.values()) {
      await consumer.stop();
    }
  }

  /**
   * 暂停消费者组
   */
  public async pause(): Promise<void> {
    for (const consumer of this.consumers.values()) {
      await consumer.pause();
    }
  }

  /**
   * 恢复消费者组
   */
  public async resume(): Promise<void> {
    for (const consumer of this.consumers.values()) {
      await consumer.resume();
    }
  }

  /**
   * 获取消费者
   */
  public getConsumer(consumerId: string): Consumer | undefined {
    return this.consumers.get(consumerId);
  }

  /**
   * 获取所有消费者
   */
  public getAllConsumers(): Consumer[] {
    return Array.from(this.consumers.values());
  }

  /**
   * 获取消费者数量
   */
  public getConsumerCount(): number {
    return this.consumers.size;
  }

  /**
   * 获取消费者组统计
   */
  public getStats(): {
    groupId: string;
    queueName: string;
    consumerCount: number;
    activeConsumers: number;
    totalProcessed: number;
    totalFailed: number;
    avgProcessingTime: number;
    consumers: IConsumerStats[];
  } {
    const consumers = this.getAllConsumers();
    const stats = consumers.map(c => c.getStats());

    return {
      groupId: this.groupId,
      queueName: this.queue.name,
      consumerCount: consumers.length,
      activeConsumers: stats.filter(s => s.status === ConsumerStatus.ACTIVE).length,
      totalProcessed: stats.reduce((sum, s) => sum + s.processedMessages, 0),
      totalFailed: stats.reduce((sum, s) => sum + s.failedMessages, 0),
      avgProcessingTime: stats.reduce((sum, s) => sum + s.avgProcessingTime, 0) / stats.length || 0,
      consumers: stats
    };
  }

  /**
   * 负载均衡 - 选择最空闲的消费者
   */
  public selectConsumer(): Consumer | null {
    const consumers = this.getAllConsumers();
    
    if (consumers.length === 0) return null;

    // 选择处理中消息最少的消费者
    return consumers.reduce((min, consumer) => {
      const stats = consumer.getStats();
      const minStats = min.getStats();
      
      return stats.processingMessages < minStats.processingMessages ? consumer : min;
    });
  }

  /**
   * 健康检查
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      consumerId: string;
      status: ConsumerStatus;
      lastActiveAt: number;
    }[];
  }> {
    const consumers = this.getAllConsumers();
    const details = consumers.map(c => {
      const stats = c.getStats();
      return {
        consumerId: c.id,
        status: stats.status,
        lastActiveAt: stats.lastActiveAt
      };
    });

    // 检查是否有活跃消费者
    const healthy = details.some(d => d.status === ConsumerStatus.ACTIVE);

    return { healthy, details };
  }
}