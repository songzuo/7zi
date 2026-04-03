/**
 * Message Queue System - v1.10.0
 * 企业级消息队列系统主入口
 */

import {
  IMessageQueueOptions,
  IMessage,
  IMessageOptions,
  IQueueConfig,
  IConsumerConfig,
  IMessageHandler,
  QueueType,
  ITransaction
} from './types';
import { Broker } from './core/broker';
import { Transaction } from './core/transaction';
import { Monitor } from './utils/monitor';
import { RestAPI } from './api/rest-api';
import { WebSocketAPI } from './api/websocket-api';
import { MemoryStorage } from './storage/memory-storage';
import { FileStorage } from './storage/file-storage';
import { ConsumerGroup } from './consumers/consumer-group';

/**
 * 消息队列系统
 */
export class MessageQueue {
  /** Broker */
  protected broker: Broker;

  /** Monitor */
  protected monitor: Monitor;

  /** REST API */
  protected restAPI?: RestAPI;

  /** WebSocket API */
  protected wsAPI?: WebSocketAPI;

  /** 配置 */
  protected options: IMessageQueueOptions;

  /** 是否已初始化 */
  protected initialized: boolean = false;

  constructor(options: IMessageQueueOptions) {
    this.options = options;
    this.broker = new Broker();
    this.monitor = new Monitor(this.broker, options.monitoring?.intervalMs ?? 5000);

    // 初始化 API
    if (options.api?.restEnabled) {
      this.restAPI = new RestAPI(
        this.broker,
        this.monitor,
        options.api.restPort
      );
    }

    if (options.api?.wsEnabled) {
      this.wsAPI = new WebSocketAPI(
        this.broker,
        this.monitor,
        options.api.wsPort
      );
    }
  }

  /**
   * 初始化消息队列
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // 初始化 Broker
    await this.broker.initialize();

    // 启动监控
    if (this.options.monitoring?.enabled) {
      this.monitor.start();
    }

    // 启动 REST API
    if (this.restAPI) {
      await this.restAPI.start();
    }

    // 启动 WebSocket API
    if (this.wsAPI) {
      await this.wsAPI.start();
    }

    this.initialized = true;
  }

  /**
   * 关闭消息队列
   */
  public async close(): Promise<void> {
    // 停止 WebSocket API
    if (this.wsAPI) {
      await this.wsAPI.stop();
    }

    // 停止 REST API
    if (this.restAPI) {
      await this.restAPI.stop();
    }

    // 停止监控
    this.monitor.stop();

    // 关闭 Broker
    await this.broker.close();

    this.initialized = false;
  }

  // ============================================================================
  // 队列管理
  // ============================================================================

  /**
   * 创建队列
   */
  public async createQueue(name: string, type: QueueType = QueueType.NORMAL): Promise<void> {
    const config: IQueueConfig = {
      name,
      type,
      deadLetterQueue: this.options.deadLetterQueue
    };

    await this.broker.createQueue(config);
  }

  /**
   * 删除队列
   */
  public async deleteQueue(name: string): Promise<void> {
    await this.broker.deleteQueue(name);
  }

  /**
   * 获取队列统计
   */
  public getQueueStats(name: string) {
    return this.broker.getQueueStats(name);
  }

  /**
   * 获取所有队列统计
   */
  public getAllQueueStats() {
    return this.broker.getAllQueueStats();
  }

  // ============================================================================
  // 消息发布
  // ============================================================================

  /**
   * 发布消息
   */
  public async publish<T>(
    queueName: string,
    data: T,
    options?: IMessageOptions
  ): Promise<IMessage<T>> {
    const message = await this.broker.publish(queueName, data, options);
    this.monitor.emitMessagePublished(message.id, queueName);
    return message;
  }

  /**
   * 消费消息
   */
  public async consume(queueName: string, consumerId?: string): Promise<IMessage | null> {
    return this.broker.consume(queueName, consumerId);
  }

  /**
   * 确认消息
   */
  public async acknowledge(queueName: string, messageId: string): Promise<void> {
    await this.broker.acknowledge(queueName, messageId);
  }

  /**
   * 拒绝消息
   */
  public async reject(
    queueName: string,
    messageId: string,
    requeue: boolean = false
  ): Promise<void> {
    await this.broker.reject(queueName, messageId, requeue);
  }

  // ============================================================================
  // 主题管理 (Pub/Sub)
  // ============================================================================

  /**
   * 创建主题
   */
  public async createTopic(name: string): Promise<void> {
    await this.broker.createTopic(name);
  }

  /**
   * 订阅主题
   */
  public async subscribe(
    topicName: string,
    subscriberName: string,
    handler: IMessageHandler
  ): Promise<string> {
    return this.broker.subscribe(topicName, subscriberName, handler);
  }

  /**
   * 取消订阅
   */
  public async unsubscribe(topicName: string, subscriberId: string): Promise<void> {
    await this.broker.unsubscribe(topicName, subscriberId);
  }

  /**
   * 发布到主题
   */
  public async publishToTopic<T>(topicName: string, data: T): Promise<void> {
    await this.broker.publishToTopic(topicName, data);
  }

  // ============================================================================
  // 消费者管理
  // ============================================================================

  /**
   * 创建消费者
   */
  public async createConsumer(
    queueName: string,
    handler: IMessageHandler,
    config?: Partial<IConsumerConfig>
  ): Promise<ConsumerGroup> {
    const fullConfig: IConsumerConfig = {
      groupId: config?.groupId ?? 'default',
      concurrency: config?.concurrency ?? 1,
      rateLimit: config?.rateLimit,
      prefetch: config?.prefetch,
      autoAck: config?.autoAck ?? false,
      retryPolicy: config?.retryPolicy ?? this.options.retryPolicy,
      healthCheckInterval: config?.healthCheckInterval
    };

    const group = await this.broker.createConsumerGroup(queueName, fullConfig);
    await group.addConsumer(handler);
    await group.start();

    return group;
  }

  /**
   * 获取消费者组
   */
  public getConsumerGroup(queueName: string, groupId: string) {
    return this.broker.getConsumerGroup(queueName, groupId);
  }

  /**
   * 删除消费者组
   */
  public async deleteConsumerGroup(queueName: string, groupId: string): Promise<void> {
    await this.broker.deleteConsumerGroup(queueName, groupId);
  }

  // ============================================================================
  // 事务支持
  // ============================================================================

  /**
   * 开始事务
   */
  public async beginTransaction(): Promise<ITransaction> {
    return new Transaction(this.broker);
  }

  // ============================================================================
  // 监控和统计
  // ============================================================================

  /**
   * 获取监控报告
   */
  public getMonitorReport() {
    return this.monitor.getReport();
  }

  /**
   * 获取 Broker 统计
   */
  public getBrokerStats() {
    return this.broker.getStats();
  }

  /**
   * 获取监控器
   */
  public getMonitor(): Monitor {
    return this.monitor;
  }

  /**
   * 获取 REST API
   */
  public getRestAPI(): RestAPI | undefined {
    return this.restAPI;
  }

  /**
   * 获取 WebSocket API
   */
  public getWebSocketAPI(): WebSocketAPI | undefined {
    return this.wsAPI;
  }
}

// ============================================================================
// 导出所有类型和类
// ============================================================================

export * from './types';
export { Broker } from './core/broker';
export { Transaction } from './core/transaction';
export { Monitor } from './utils/monitor';
export { RestAPI } from './api/rest-api';
export { WebSocketAPI } from './api/websocket-api';
export { MemoryStorage } from './storage/memory-storage';
export { FileStorage } from './storage/file-storage';
export { ConsumerGroup } from './consumers/consumer-group';
export { Queue } from './core/queue';
export { Message } from './core/message';
export { NormalQueue } from './queues/normal-queue';
export { PriorityQueue } from './queues/priority-queue';
export { DelayQueue } from './queues/delay-queue';
export { DeadLetterQueue } from './queues/dead-letter-queue';
export { Consumer } from './consumers/consumer';

// ============================================================================
// 默认导出
// ============================================================================

export default MessageQueue;