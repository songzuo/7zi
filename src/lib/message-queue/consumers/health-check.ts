/**
 * Health Check - 消费者健康检查
 * 实现消费者健康状态监控
 */

import {
  ConsumerStatus,
  IConsumerStats
} from '../types';
import { Consumer } from './consumer';
import { ConsumerGroup } from './consumer-group';

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  /** 是否健康 */
  healthy: boolean;
  /** 检查时间 */
  timestamp: number;
  /** 详细信息 */
  details: {
    consumerId: string;
    status: ConsumerStatus;
    lastActiveAt: number;
    inactiveTime: number;
    message: string;
  }[];
  /** 摘要 */
  summary: {
    total: number;
    active: number;
    paused: number;
    error: number;
    offline: number;
  };
}

/**
 * 消费者健康检查器
 */
export class ConsumerHealthChecker {
  /** 健康检查间隔 (毫秒) */
  protected interval: number;

  /** 不活跃超时 (毫秒) */
  protected inactiveTimeout: number;

  /** 定时器 */
  protected timer?: NodeJS.Timeout;

  /** 是否正在运行 */
  protected running: boolean = false;

  /** 健康检查回调 */
  protected onHealthCheck?: (result: HealthCheckResult) => void;

  constructor(
    interval: number = 30000,
    inactiveTimeout: number = 60000
  ) {
    this.interval = interval;
    this.inactiveTimeout = inactiveTimeout;
  }

  /**
   * 设置健康检查回调
   */
  public setOnHealthCheck(callback: (result: HealthCheckResult) => void): void {
    this.onHealthCheck = callback;
  }

  /**
   * 启动健康检查
   */
  public start(): void {
    if (this.running) return;

    this.running = true;

    this.timer = setInterval(() => {
      this.performCheck();
    }, this.interval);
  }

  /**
   * 停止健康检查
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
   * 执行健康检查
   */
  protected performCheck(): void {
    // 注意: 实际实现需要传入消费者组列表
    // 这里简化处理
  }

  /**
   * 检查消费者组健康
   */
  public checkConsumerGroups(groups: ConsumerGroup[]): HealthCheckResult {
    const now = Date.now();
    const details: HealthCheckResult['details'] = [];
    const summary = {
      total: 0,
      active: 0,
      paused: 0,
      error: 0,
      offline: 0
    };

    for (const group of groups) {
      const consumers = group.getAllConsumers();

      for (const consumer of consumers) {
        const stats = consumer.getStats();
        const inactiveTime = now - stats.lastActiveAt;

        summary.total++;

        // 更新摘要统计
        switch (stats.status) {
          case ConsumerStatus.ACTIVE:
            summary.active++;
            break;
          case ConsumerStatus.PAUSED:
            summary.paused++;
            break;
          case ConsumerStatus.ERROR:
            summary.error++;
            break;
          case ConsumerStatus.OFFLINE:
            summary.offline++;
            break;
        }

        // 生成消息
        let message = 'Consumer is healthy';
        if (stats.status === ConsumerStatus.ERROR) {
          message = 'Consumer is in error state';
        } else if (inactiveTime > this.inactiveTimeout) {
          message = `Consumer has been inactive for ${Math.round(inactiveTime / 1000)} seconds`;
        }

        details.push({
          consumerId: stats.id,
          status: stats.status,
          lastActiveAt: stats.lastActiveAt,
          inactiveTime,
          message
        });
      }
    }

    const healthy = summary.active > 0 && summary.error === 0;

    const result: HealthCheckResult = {
      healthy,
      timestamp: now,
      details,
      summary
    };

    // 调用回调
    if (this.onHealthCheck) {
      this.onHealthCheck(result);
    }

    return result;
  }

  /**
   * 检查单个消费者
   */
  public checkConsumer(consumer: Consumer): {
    healthy: boolean;
    status: ConsumerStatus;
    lastActiveAt: number;
    inactiveTime: number;
    message: string;
  } {
    const now = Date.now();
    const stats = consumer.getStats();
    const inactiveTime = now - stats.lastActiveAt;

    let healthy = true;
    let message = 'Consumer is healthy';

    if (stats.status === ConsumerStatus.ERROR) {
      healthy = false;
      message = 'Consumer is in error state';
    } else if (stats.status === ConsumerStatus.OFFLINE) {
      healthy = false;
      message = 'Consumer is offline';
    } else if (inactiveTime > this.inactiveTimeout) {
      healthy = false;
      message = `Consumer has been inactive for ${Math.round(inactiveTime / 1000)} seconds`;
    }

    return {
      healthy,
      status: stats.status,
      lastActiveAt: stats.lastActiveAt,
      inactiveTime,
      message
    };
  }

  /**
   * 获取不健康的消费者
   */
  public getUnhealthyConsumers(groups: ConsumerGroup[]): {
    consumerId: string;
    status: ConsumerStatus;
    message: string;
  }[] {
    const result = this.checkConsumerGroups(groups);
    return result.details
      .filter(d => d.status !== ConsumerStatus.ACTIVE || d.inactiveTime > this.inactiveTimeout)
      .map(d => ({
        consumerId: d.consumerId,
        status: d.status,
        message: d.message
      }));
  }
}