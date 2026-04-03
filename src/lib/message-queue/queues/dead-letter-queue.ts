/**
 * DeadLetterQueue - 死信队列
 * 存储处理失败的消息
 */

import { Queue } from '../core/queue';
import { Message } from '../core/message';
import { IMessage, IMessageOptions, IQueueStats } from '../types';

/**
 * 死信队列
 */
export class DeadLetterQueue extends Queue {
  /** 原始队列映射 */
  protected originalQueues: Map<string, string> = new Map();

  /** 失败原因映射 */
  protected failureReasons: Map<string, string> = new Map();

  /** 失败时间映射 */
  protected failureTimes: Map<string, number> = new Map();

  /**
   * 添加死信消息
   */
  public async addDeadLetter(
    message: Message,
    originalQueue: string,
    reason: string
  ): Promise<void> {
    // 标记为死信
    message.markDeadLetter();
    
    // 添加到队列
    this.messages.set(message.id, message);
    this.messageOrder.push(message.id);
    
    // 记录元数据
    this.originalQueues.set(message.id, originalQueue);
    this.failureReasons.set(message.id, reason);
    this.failureTimes.set(message.id, Date.now());
    
    // 更新统计
    this.stats.deadLetterMessages++;
    this.stats.totalMessages++;
  }

  /**
   * 发布消息 (不推荐直接发布到死信队列)
   */
  protected async onPublish(message: Message): Promise<void> {
    // 死信队列通常由系统自动添加，不建议手动发布
    throw new Error('Direct publishing to dead letter queue is not recommended');
  }

  /**
   * 消费消息
   */
  protected async onConsume(consumerId?: string): Promise<Message | null> {
    // 死信队列的消息通常需要手动处理
    for (const messageId of this.messageOrder) {
      const message = this.messages.get(messageId);
      
      if (!message) continue;
      
      // 标记为处理中
      message.markProcessing(consumerId);
      return message;
    }
    
    return null;
  }

  /**
   * 重试死信消息
   */
  public async retryMessage(
    messageId: string,
    targetQueue: string
  ): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    // 清理元数据
    this.originalQueues.delete(messageId);
    this.failureReasons.delete(messageId);
    this.failureTimes.delete(messageId);
    
    // 从死信队列移除
    this.removeMessage(messageId);
    
    // 返回到原始队列或指定队列
    // 注意: 实际重试逻辑由外部队列管理器处理
    return;
  }

  /**
   * 获取消息失败原因
   */
  public getFailureReason(messageId: string): string | undefined {
    return this.failureReasons.get(messageId);
  }

  /**
   * 获取消息失败时间
   */
  public getFailureTime(messageId: string): number | undefined {
    return this.failureTimes.get(messageId);
  }

  /**
   * 获取原始队列名
   */
  public getOriginalQueue(messageId: string): string | undefined {
    return this.originalQueues.get(messageId);
  }

  /**
   * 获取死信消息详情
   */
  public getDeadLetterDetails(messageId: string): {
    message: IMessage | null;
    originalQueue: string | undefined;
    reason: string | undefined;
    failedAt: number | undefined;
  } {
    return {
      message: this.getMessage(messageId),
      originalQueue: this.getOriginalQueue(messageId),
      reason: this.getFailureReason(messageId),
      failedAt: this.getFailureTime(messageId)
    };
  }

  /**
   * 获取统计信息
   */
  public getStats(): IQueueStats {
    const stats = super.getStats();
    stats.deadLetterMessages = this.messages.size;
    return stats;
  }

  /**
   * 清空队列
   */
  protected async onClear(): Promise<void> {
    this.originalQueues.clear();
    this.failureReasons.clear();
    this.failureTimes.clear();
  }
}