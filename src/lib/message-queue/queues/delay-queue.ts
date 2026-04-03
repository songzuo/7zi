/**
 * DelayQueue - 延迟队列
 * 消息延迟到指定时间后才能被消费
 */

import { Queue } from '../core/queue';
import { Message } from '../core/message';
import { IMessage, IMessageOptions } from '../types';

/**
 * 延迟队列
 */
export class DelayQueue extends Queue {
  /** 定时器映射 */
  protected timers: Map<string, NodeJS.Timeout> = new Map();

  /** 延迟消息索引 */
  protected delayedMessages: Map<string, number> = new Map();

  /**
   * 发布消息
   */
  protected async onPublish(message: Message): Promise<void> {
    if (message.delay && message.delay > 0) {
      // 设置定时器，延迟后通知
      const executeAt = message.createdAt + message.delay;
      this.delayedMessages.set(message.id, executeAt);
      
      // 设置定时器检查
      this.scheduleDelayCheck(message);
    }
  }

  /**
   * 消费消息
   */
  protected async onConsume(consumerId?: string): Promise<Message | null> {
    // 查找第一条可消费的消息
    for (const messageId of this.messageOrder) {
      const message = this.messages.get(messageId);
      
      if (!message) continue;
      
      // 跳过已过期消息
      if (message.isExpired()) {
        this.removeMessage(messageId);
        continue;
      }
      
      // 检查延迟是否到期
      if (message.delay && message.needsDelay()) {
        continue;
      }
      
      // 标记为处理中
      message.markProcessing(consumerId);
      
      // 清理定时器
      this.clearTimer(messageId);
      
      return message;
    }
    
    return null;
  }

  /**
   * 调度延迟检查
   */
  protected scheduleDelayCheck(message: Message): void {
    if (!message.delay) return;
    
    const delayMs = message.getDelayRemaining();
    
    if (delayMs > 0) {
      const timer = setTimeout(() => {
        this.onDelayExpired(message.id);
      }, delayMs);
      
      this.timers.set(message.id, timer);
    }
  }

  /**
   * 延迟到期处理
   */
  protected onDelayExpired(messageId: string): void {
    this.timers.delete(messageId);
    this.delayedMessages.delete(messageId);
    
    // 触发事件或回调
    this.onDelayMessageReady(messageId);
  }

  /**
   * 延迟消息就绪回调
   */
  protected onDelayMessageReady(messageId: string): void {
    // 子类可重写此方法触发事件
  }

  /**
   * 清理定时器
   */
  protected clearTimer(messageId: string): void {
    const timer = this.timers.get(messageId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(messageId);
    }
    this.delayedMessages.delete(messageId);
  }

  /**
   * 关闭队列
   */
  protected async onClose(): Promise<void> {
    // 清理所有定时器
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.delayedMessages.clear();
  }

  /**
   * 清空队列
   */
  protected async onClear(): Promise<void> {
    // 清理所有定时器
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.delayedMessages.clear();
  }

  /**
   * 移除消息
   */
  protected removeMessage(messageId: string): void {
    this.clearTimer(messageId);
    super.removeMessage(messageId);
  }

  /**
   * 获取延迟消息数量
   */
  public getDelayedCount(): number {
    let count = 0;
    
    for (const [messageId, executeAt] of this.delayedMessages) {
      if (Date.now() < executeAt) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * 获取就绪消息数量
   */
  public getReadyCount(): number {
    let count = 0;
    
    for (const messageId of this.messageOrder) {
      const message = this.messages.get(messageId);
      if (message && !message.needsDelay()) {
        count++;
      }
    }
    
    return count;
  }
}