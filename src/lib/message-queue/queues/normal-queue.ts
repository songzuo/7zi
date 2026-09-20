/**
 * NormalQueue - 普通队列 (FIFO)
 * 先进先出队列实现
 */

import { Queue } from '../core/queue';
import { Message } from '../core/message';
import { IMessageOptions } from '../types';

/**
 * 普通队列
 */
export class NormalQueue extends Queue {
  /**
   * 发布消息
   */
  protected async onPublish(message: Message): Promise<void> {
    // FIFO队列不需要特殊处理
  }

  /**
   * 消费消息 (FIFO)
   */
  protected async onConsume(consumerId?: string): Promise<Message | null> {
    // 查找第一条待处理的消息
    for (const messageId of this.messageOrder) {
      const message = this.messages.get(messageId);
      
      if (!message) continue;
      
      // 跳过已过期消息
      if (message.isExpired()) {
        this.removeMessage(messageId);
        continue;
      }
      
      // 跳过需要延迟的消息
      if (message.needsDelay()) {
        continue;
      }
      
      // 标记为处理中
      message.markProcessing(consumerId);
      return message;
    }
    
    return null;
  }
}