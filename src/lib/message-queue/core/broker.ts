/**
 * Broker - 消息代理核心类
 * 管理队列、主题和消息路由
 */

import {
  IMessage,
  IMessageOptions,
  IQueueConfig,
  IQueueStats,
  ITopicSubscriber,
  ITopicStats,
  IConsumerConfig,
  IConsumerStats,
  QueueType,
  MessageStatus
} from '../types';
import { Queue } from './queue';
import { NormalQueue } from '../queues/normal-queue';
import { PriorityQueue } from '../queues/priority-queue';
import { DelayQueue } from '../queues/delay-queue';
import { DeadLetterQueue } from '../queues/dead-letter-queue';
import { ConsumerGroup } from '../consumers/consumer-group';

/**
 * 消息代理
 */
export class Broker {
  /** Broker ID */
  public id: string;

  /** Broker 名称 */
  public name: string;

  /** 队列映射 */
  protected queues: Map<string, Queue> = new Map();

  /** 主题映射 */
  protected topics: Map<string, ITopicSubscriber[]> = new Map();

  /** 消费者组映射 */
  protected consumerGroups: Map<string, ConsumerGroup> = new Map();

  /** 死信队列 */
  protected deadLetterQueue: DeadLetterQueue;

  /** 是否已初始化 */
  protected initialized: boolean = false;

  constructor(id: string = 'default', name: string = 'Default Broker') {
    this.id = id;
    this.name = name;
    this.deadLetterQueue = new DeadLetterQueue({
      name: 'dead-letter-queue',
      type: QueueType.DEAD_LETTER
    });
  }

  /**
   * 初始化 Broker
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // 初始化死信队列
    await this.deadLetterQueue.initialize();

    this.initialized = true;
  }

  /**
   * 关闭 Broker
   */
  public async close(): Promise<void> {
    // 关闭所有消费者组
    for (const group of this.consumerGroups.values()) {
      await group.stop();
    }

    // 关闭所有队列
    for (const queue of this.queues.values()) {
      await queue.close();
    }

    // 关闭死信队列
    await this.deadLetterQueue.close();

    this.initialized = false;
  }

  // ============================================================================
  // 队列管理
  // ============================================================================

  /**
   * 创建队列
   */
  public async createQueue(config: IQueueConfig): Promise<void> {
    if (this.queues.has(config.name)) {
      throw new Error(`Queue already exists: ${config.name}`);
    }

    const queue = this.createQueueInstance(config);
    await queue.initialize();
    this.queues.set(config.name, queue);
  }

  /**
   * 创建队列实例
   */
  protected createQueueInstance(config: IQueueConfig): Queue {
    switch (config.type) {
      case QueueType.NORMAL:
        return new NormalQueue(config);
      case QueueType.PRIORITY:
        return new PriorityQueue(config);
      case QueueType.DELAY:
        return new DelayQueue(config);
      case QueueType.DEAD_LETTER:
        return new DeadLetterQueue(config);
      default:
        throw new Error(`Unknown queue type: ${config.type}`);
    }
  }

  /**
   * 删除队列
   */
  public async deleteQueue(name: string): Promise<void> {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue not found: ${name}`);
    }

    await queue.close();
    this.queues.delete(name);
  }

  /**
   * 获取队列
   */
  public getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  /**
   * 获取所有队列
   */
  public getAllQueues(): Queue[] {
    return Array.from(this.queues.values());
  }

  /**
   * 检查队列是否存在
   */
  public hasQueue(name: string): boolean {
    return this.queues.has(name);
  }

  // ============================================================================
  // 消息发布
  // ============================================================================

  /**
   * 发布消息到队列
   */
  public async publish<T>(
    queueName: string,
    data: T,
    options?: IMessageOptions
  ): Promise<IMessage<T>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    return queue.publish(data, options);
  }

  /**
   * 消费消息
   */
  public async consume(queueName: string, consumerId?: string): Promise<IMessage | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    return queue.consume(consumerId);
  }

  /**
   * 确认消息
   */
  public async acknowledge(queueName: string, messageId: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.acknowledge(messageId);
  }

  /**
   * 拒绝消息
   */
  public async reject(
    queueName: string,
    messageId: string,
    requeue: boolean = false
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.reject(messageId, requeue);

    // 如果不重试且启用死信队列，添加到死信队列
    if (!requeue) {
      const message = queue.getMessage(messageId);
      if (message) {
        await this.deadLetterQueue.addDeadLetter(
          message,
          queueName,
          'Message rejected'
        );
      }
    }
  }

  // ============================================================================
  // 主题管理 (Pub/Sub)
  // ============================================================================

  /**
   * 创建主题
   */
  public async createTopic(name: string): Promise<void> {
    if (this.topics.has(name)) {
      throw new Error(`Topic already exists: ${name}`);
    }

    this.topics.set(name, []);
  }

  /**
   * 删除主题
   */
  public async deleteTopic(name: string): Promise<void> {
    this.topics.delete(name);
  }

  /**
   * 订阅主题
   */
  public async subscribe(
    topicName: string,
    subscriberName: string,
    handler: (message: IMessage) => Promise<boolean>
  ): Promise<string> {
    const subscribers = this.topics.get(topicName);
    if (!subscribers) {
      throw new Error(`Topic not found: ${topicName}`);
    }

    const subscriberId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    subscribers.push({
      id: subscriberId,
      name: subscriberName,
      handler,
      subscribedAt: Date.now()
    });

    return subscriberId;
  }

  /**
   * 取消订阅
   */
  public async unsubscribe(topicName: string, subscriberId: string): Promise<void> {
    const subscribers = this.topics.get(topicName);
    if (!subscribers) return;

    const index = subscribers.findIndex(s => s.id === subscriberId);
    if (index > -1) {
      subscribers.splice(index, 1);
    }
  }

  /**
   * 发布到主题
   */
  public async publishToTopic<T>(topicName: string, data: T): Promise<void> {
    const subscribers = this.topics.get(topicName);
    if (!subscribers) {
      throw new Error(`Topic not found: ${topicName}`);
    }

    const message: IMessage<T> = {
      id: `topic_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      queueName: topicName,
      data,
      status: MessageStatus.PENDING,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    // 广播给所有订阅者
    await Promise.all(
      subscribers.map(async (subscriber) => {
        try {
          await subscriber.handler(message);
        } catch (error) {
          console.error(`Subscriber ${subscriber.name} failed:`, error);
        }
      })
    );
  }

  /**
   * 获取主题统计
   */
  public getTopicStats(): ITopicStats[] {
    const stats: ITopicStats[] = [];

    for (const [name, subscribers] of this.topics) {
      stats.push({
        name,
        subscriberCount: subscribers.length,
        publishedMessages: 0, // 需要额外追踪
        publishRate: 0,
        lastUpdated: Date.now()
      });
    }

    return stats;
  }

  // ============================================================================
  // 消费者管理
  // ============================================================================

  /**
   * 创建消费者组
   */
  public async createConsumerGroup(
    queueName: string,
    config: IConsumerConfig
  ): Promise<ConsumerGroup> {
    const groupKey = `${queueName}:${config.groupId}`;
    
    if (this.consumerGroups.has(groupKey)) {
      throw new Error(`Consumer group already exists: ${config.groupId}`);
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const group = new ConsumerGroup(config, queue, this.deadLetterQueue);
    this.consumerGroups.set(groupKey, group);

    return group;
  }

  /**
   * 获取消费者组
   */
  public getConsumerGroup(queueName: string, groupId: string): ConsumerGroup | undefined {
    const groupKey = `${queueName}:${groupId}`;
    return this.consumerGroups.get(groupKey);
  }

  /**
   * 删除消费者组
   */
  public async deleteConsumerGroup(queueName: string, groupId: string): Promise<void> {
    const groupKey = `${queueName}:${groupId}`;
    const group = this.consumerGroups.get(groupKey);
    
    if (group) {
      await group.stop();
      this.consumerGroups.delete(groupKey);
    }
  }

  /**
   * 获取所有消费者组
   */
  public getAllConsumerGroups(): ConsumerGroup[] {
    return Array.from(this.consumerGroups.values());
  }

  // ============================================================================
  // 统计信息
  // ============================================================================

  /**
   * 获取队列统计
   */
  public getQueueStats(queueName: string): IQueueStats | null {
    const queue = this.queues.get(queueName);
    return queue?.getStats() ?? null;
  }

  /**
   * 获取所有队列统计
   */
  public getAllQueueStats(): IQueueStats[] {
    return this.getAllQueues().map(q => q.getStats());
  }

  /**
   * 获取 Broker 统计
   */
  public getStats() {
    return {
      id: this.id,
      name: this.name,
      queueCount: this.queues.size,
      topicCount: this.topics.size,
      consumerCount: this.consumerGroups.size,
      totalMessages: this.getAllQueues().reduce((sum, q) => sum + q.size(), 0)
    };
  }
}