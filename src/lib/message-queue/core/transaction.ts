/**
 * Transaction - 事务类
 * 实现消息事务支持
 */

import {
  IMessage,
  IMessageOptions,
  ITransaction,
  TransactionStatus
} from '../types';
import { Broker } from './broker';

/**
 * 事务
 */
export class Transaction implements ITransaction {
  /** 事务ID */
  public id: string;

  /** 状态 */
  public status: TransactionStatus;

  /** 开始时间 */
  public startedAt: number;

  /** Broker */
  protected broker: Broker;

  /** 待发布消息 */
  protected pendingMessages: Array<{
    queueName: string;
    data: any;
    options?: IMessageOptions;
  }> = [];

  /** 已发布消息 */
  protected publishedMessages: string[] = [];

  constructor(broker: Broker) {
    this.id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.status = TransactionStatus.ACTIVE;
    this.startedAt = Date.now();
    this.broker = broker;
  }

  /**
   * 发布消息 (事务内)
   */
  public async publish<T>(
    queueName: string,
    data: T,
    options?: IMessageOptions
  ): Promise<void> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error(`Transaction is not active: ${this.status}`);
    }

    // 暂存消息
    this.pendingMessages.push({
      queueName,
      data,
      options
    });
  }

  /**
   * 提交事务
   */
  public async commit(): Promise<void> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error(`Transaction is not active: ${this.status}`);
    }

    try {
      // 发布所有待发布消息
      for (const { queueName, data, options } of this.pendingMessages) {
        const message = await this.broker.publish(queueName, data, options);
        this.publishedMessages.push(message.id);
      }

      this.status = TransactionStatus.COMMITTED;
      this.pendingMessages = [];

    } catch (error) {
      this.status = TransactionStatus.ROLLED_BACK;
      throw error;
    }
  }

  /**
   * 回滚事务
   */
  public async rollback(): Promise<void> {
    if (this.status !== TransactionStatus.ACTIVE) {
      throw new Error(`Transaction is not active: ${this.status}`);
    }

    // 清空待发布消息
    this.pendingMessages = [];

    // 尝试删除已发布的消息
    for (const messageId of this.publishedMessages) {
      try {
        // 注意: 实际实现需要从队列中删除消息
        // 这里简化处理
      } catch (error) {
        console.error(`Failed to rollback message ${messageId}:`, error);
      }
    }

    this.publishedMessages = [];
    this.status = TransactionStatus.ROLLED_BACK;
  }

  /**
   * 获取事务信息
   */
  public getInfo() {
    return {
      id: this.id,
      status: this.status,
      startedAt: this.startedAt,
      pendingMessages: this.pendingMessages.length,
      publishedMessages: this.publishedMessages.length
    };
  }
}