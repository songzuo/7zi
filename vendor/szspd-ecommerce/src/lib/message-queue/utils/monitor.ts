/**
 * Monitor - 监控系统
 * 实现队列和消费者监控
 */

import {
  IMonitorEvent,
  MonitorEventType,
  MonitorEventHandler,
  IQueueStats,
  IConsumerStats
} from '../types';
import { Broker } from '../core/broker';
import { EventEmitter } from 'events';

/**
 * 监控器
 */
export class Monitor extends EventEmitter {
  /** Broker */
  protected broker: Broker;

  /** 监控间隔 (毫秒) */
  protected interval: number;

  /** 定时器 */
  protected timer?: NodeJS.Timeout;

  /** 是否正在运行 */
  protected running: boolean = false;

  /** 统计历史 */
  protected statsHistory: {
    queues: Map<string, IQueueStats[]>;
    consumers: Map<string, IConsumerStats[]>;
  };

  /** 最大历史记录数 */
  protected maxHistorySize: number = 100;

  constructor(broker: Broker, interval: number = 5000) {
    super();
    this.broker = broker;
    this.interval = interval;
    this.statsHistory = {
      queues: new Map(),
      consumers: new Map()
    };
  }

  /**
   * 启动监控
   */
  public start(): void {
    if (this.running) return;

    this.running = true;

    // 立即收集一次
    this.collect();

    // 定时收集
    this.timer = setInterval(() => {
      this.collect();
    }, this.interval);
  }

  /**
   * 停止监控
   */
  public stop(): void {
    if (!this.running) return;

    this.running = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * 收集统计信息
   */
  protected async collect(): Promise<void> {
    // 收集队列统计
    const queueStats = this.broker.getAllQueueStats();
    for (const stats of queueStats) {
      this.addQueueStats(stats);
      this.emitEvent(MonitorEventType.QUEUE_STATS, stats);
    }

    // 收集消费者统计
    const consumerGroups = this.broker.getAllConsumerGroups();
    for (const group of consumerGroups) {
      const groupStats = group.getStats();
      for (const consumerStats of groupStats.consumers) {
        this.addConsumerStats(consumerStats);
        this.emitEvent(MonitorEventType.CONSUMER_STATS, consumerStats);
      }
    }
  }

  /**
   * 添加队列统计历史
   */
  protected addQueueStats(stats: IQueueStats): void {
    if (!this.statsHistory.queues.has(stats.name)) {
      this.statsHistory.queues.set(stats.name, []);
    }

    const history = this.statsHistory.queues.get(stats.name)!;
    history.push(stats);

    // 限制历史记录数
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * 添加消费者统计历史
   */
  protected addConsumerStats(stats: IConsumerStats): void {
    if (!this.statsHistory.consumers.has(stats.id)) {
      this.statsHistory.consumers.set(stats.id, []);
    }

    const history = this.statsHistory.consumers.get(stats.id)!;
    history.push(stats);

    // 限制历史记录数
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * 发送监控事件
   */
  public emitEvent(type: MonitorEventType, data: unknown): void {
    const event: IMonitorEvent = {
      type,
      timestamp: Date.now(),
      data
    };

    this.emit('event', event);
    this.emit(type, event);
  }

  /**
   * 发送消息发布事件
   */
  public emitMessagePublished(messageId: string, queueName: string): void {
    this.emitEvent(MonitorEventType.MESSAGE_PUBLISHED, {
      messageId,
      queueName
    });
  }

  /**
   * 发送消息消费事件
   */
  public emitMessageConsumed(messageId: string, queueName: string, consumerId: string): void {
    this.emitEvent(MonitorEventType.MESSAGE_CONSUMED, {
      messageId,
      queueName,
      consumerId
    });
  }

  /**
   * 发送消息失败事件
   */
  public emitMessageFailed(messageId: string, queueName: string, error: string): void {
    this.emitEvent(MonitorEventType.MESSAGE_FAILED, {
      messageId,
      queueName,
      error
    });
  }

  /**
   * 发送消费者状态变化事件
   */
  public emitConsumerStatus(consumerId: string, status: string): void {
    this.emitEvent(MonitorEventType.CONSUMER_STATUS, {
      consumerId,
      status
    });
  }

  /**
   * 发送队列创建事件
   */
  public emitQueueCreated(queueName: string, queueType: string): void {
    this.emitEvent(MonitorEventType.QUEUE_CREATED, {
      queueName,
      queueType
    });
  }

  /**
   * 发送队列删除事件
   */
  public emitQueueDeleted(queueName: string): void {
    this.emitEvent(MonitorEventType.QUEUE_DELETED, {
      queueName
    });
  }

  /**
   * 获取队列统计历史
   */
  public getQueueStatsHistory(queueName: string): IQueueStats[] {
    return this.statsHistory.queues.get(queueName) ?? [];
  }

  /**
   * 获取消费者统计历史
   */
  public getConsumerStatsHistory(consumerId: string): IConsumerStats[] {
    return this.statsHistory.consumers.get(consumerId) ?? [];
  }

  /**
   * 获取所有队列统计
   */
  public getAllQueueStats(): Map<string, IQueueStats[]> {
    return this.statsHistory.queues;
  }

  /**
   * 获取所有消费者统计
   */
  public getAllConsumerStats(): Map<string, IConsumerStats[]> {
    return this.statsHistory.consumers;
  }

  /**
   * 清空历史记录
   */
  public clearHistory(): void {
    this.statsHistory.queues.clear();
    this.statsHistory.consumers.clear();
  }

  /**
   * 获取监控报告
   */
  public getReport(): {
    timestamp: number;
    queues: IQueueStats[];
    summary: {
      totalQueues: number;
      totalMessages: number;
      totalConsumers: number;
      avgConsumeRate: number;
      avgProduceRate: number;
    };
  } {
    const queueStats = this.broker.getAllQueueStats();
    const consumerGroups = this.broker.getAllConsumerGroups();

    let totalConsumers = 0;
    for (const group of consumerGroups) {
      totalConsumers += group.getConsumerCount();
    }

    return {
      timestamp: Date.now(),
      queues: queueStats,
      summary: {
        totalQueues: queueStats.length,
        totalMessages: queueStats.reduce((sum, q) => sum + q.totalMessages, 0),
        totalConsumers,
        avgConsumeRate: queueStats.reduce((sum, q) => sum + q.consumeRate, 0) / queueStats.length || 0,
        avgProduceRate: queueStats.reduce((sum, q) => sum + q.produceRate, 0) / queueStats.length || 0
      }
    };
  }
}