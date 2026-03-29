/**
 * Message Persistence - 消息持久化服务
 * 使用内存存储实现消息历史、搜索、离线同步
 */

import { Message, MessageContent, MessageType, MessageSearchOptions } from './message-model';
import { logger } from '@/lib/logger';

export class MessagePersistence {
  private messages: Map<string, Message[]> = new Map();
  private maxMessagesPerRoom: number = 1000;
  private maxMessageAge: number = 30 * 24 * 60 * 60 * 1000; // 30 天

  /**
   * 保存消息
   */
  async saveMessage(message: Message): Promise<void> {
    const roomId = message.roomId;

    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, []);
    }

    const messages = this.messages.get(roomId)!;
    messages.push(message);

    // 清理旧消息
    await this.cleanupOldMessages(roomId);

    logger.info(`[MessagePersistence] Message saved: ${message.id} in room ${roomId}`);
  }

  /**
   * 获取消息
   */
  async getMessages(roomId: string, options: {
    limit?: number;
    before?: number;
    after?: number;
  } = {}): Promise<Message[]> {
    const messages = this.messages.get(roomId) || [];
    let result = [...messages];

    // 时间范围过滤
    if (options.after !== undefined) {
      result = result.filter(m => m.createdAt > options.after!);
    }

    if (options.before !== undefined) {
      result = result.filter(m => m.createdAt < options.before!);
    }

    // 排序（时间倒序）
    result.sort((a, b) => b.createdAt - a.createdAt);

    // 限制数量
    if (options.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /**
   * 获取单条消息
   */
  async getMessage(messageId: string): Promise<Message | undefined> {
    for (const messages of this.messages.values()) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        return message;
      }
    }
    return undefined;
  }

  /**
   * 搜索消息
   */
  async searchMessages(options: MessageSearchOptions): Promise<Message[]> {
    let results: Message[] = [];

    // 确定搜索范围
    let roomIds: string[];
    if (options.roomId) {
      roomIds = [options.roomId];
    } else {
      roomIds = Array.from(this.messages.keys());
    }

    // 遍历所有房间的消息
    for (const roomId of roomIds) {
      const messages = this.messages.get(roomId) || [];

      for (const message of messages) {
        // 跳过已删除的消息
        if (message.deletedAt) {
          continue;
        }

        // 房间过滤
        if (options.roomId && message.roomId !== options.roomId) {
          continue;
        }

        // 发送者过滤
        if (options.senderId && message.senderId !== options.senderId) {
          continue;
        }

        // 类型过滤
        if (options.type && message.type !== options.type) {
          continue;
        }

        // 时间范围过滤
        if (options.startDate && message.createdAt < options.startDate) {
          continue;
        }

        if (options.endDate && message.createdAt > options.endDate) {
          continue;
        }

        // 文本搜索
        if (options.query) {
          if (message.type === 'text' && message.content.text) {
            if (!message.content.text.toLowerCase().includes(options.query.toLowerCase())) {
              continue;
            }
          } else {
            // 非文本消息不参与文本搜索
            continue;
          }
        }

        results.push(message);
      }
    }

    // 按时间倒序排序
    results.sort((a, b) => b.createdAt - a.createdAt);

    // 限制结果数量
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    logger.info(`[MessagePersistence] Search completed: ${results.length} results`);
    return results;
  }

  /**
   * 编辑消息
   */
  async editMessage(messageId: string, newContent: MessageContent, editorId: string): Promise<{ success: boolean; message?: string }> {
    for (const messages of this.messages.values()) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        // 检查是否是发送者
        if (message.senderId !== editorId) {
          return { success: false, message: 'Only sender can edit message' };
        }

        // 检查是否已删除
        if (message.deletedAt) {
          return { success: false, message: 'Cannot edit deleted message' };
        }

        // 更新消息
        message.content = newContent;
        message.editedAt = Date.now();
        message.editedCount = (message.editedCount || 0) + 1;

        logger.info(`[MessagePersistence] Message edited: ${messageId}`);
        return { success: true };
      }
    }

    return { success: false, message: 'Message not found' };
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId: string, deleterId: string, isModerator: boolean = false): Promise<{ success: boolean; message?: string }> {
    for (const messages of this.messages.values()) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        // 检查权限
        if (!isModerator && message.senderId !== deleterId) {
          return { success: false, message: 'No permission to delete message' };
        }

        // 软删除
        message.deletedAt = Date.now();
        message.deletedBy = deleterId;

        logger.info(`[MessagePersistence] Message deleted: ${messageId}`);
        return { success: true };
      }
    }

    return { success: false, message: 'Message not found' };
  }

  /**
   * 标记为已读
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    for (const messages of this.messages.values()) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        // 添加已读用户（避免重复）
        if (!message.readBy.includes(userId)) {
          message.readBy.push(userId);
        }
        return;
      }
    }
  }

  /**
   * 标记房间所有消息为已读
   */
  async markRoomAsRead(roomId: string, userId: string): Promise<void> {
    const messages = this.messages.get(roomId);
    if (!messages) {
      return;
    }

    for (const message of messages) {
      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
      }
    }

    logger.info(`[MessagePersistence] Room ${roomId} marked as read by user ${userId}`);
  }

  /**
   * 同步离线消息
   */
  async syncOfflineMessages(
    userId: string,
    lastOnlineTime: number,
    roomIds: string[]
  ): Promise<Message[]> {
    const offlineMessages: Message[] = [];

    for (const roomId of roomIds) {
      const messages = this.messages.get(roomId) || [];

      for (const message of messages) {
        // 只获取离线期间的新消息
        if (message.createdAt > lastOnlineTime) {
          offlineMessages.push(message);
        }
      }
    }

    // 按时间排序
    offlineMessages.sort((a, b) => a.createdAt - b.createdAt);

    logger.info(`[MessagePersistence] Synced ${offlineMessages.length} offline messages for user ${userId}`);
    return offlineMessages;
  }

  /**
   * 清理旧消息
   */
  private async cleanupOldMessages(roomId: string): Promise<void> {
    const messages = this.messages.get(roomId);
    if (!messages) {
      return;
    }

    const now = Date.now();
    const originalSize = messages.length;

    // 移除过期的消息
    const filtered = messages.filter(m => {
      const age = now - m.createdAt;
      return age < this.maxMessageAge;
    });

    // 如果超过最大数量，移除最旧的消息
    if (filtered.length > this.maxMessagesPerRoom) {
      filtered.splice(0, filtered.length - this.maxMessagesPerRoom);
    }

    this.messages.set(roomId, filtered);

    if (filtered.length !== originalSize) {
      logger.info(`[MessagePersistence] Cleaned up ${originalSize - filtered.length} old messages in room ${roomId}`);
    }
  }

  /**
   * 获取房间未读消息数
   */
  async getUnreadCount(roomId: string, userId: string, since: number): Promise<number> {
    const messages = this.messages.get(roomId) || [];

    return messages.filter(m =>
      m.createdAt > since &&
      !m.readBy.includes(userId) &&
      !m.deletedAt
    ).length;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    let totalMessages = 0;
    const roomCounts: Record<string, number> = {};

    for (const [roomId, messages] of this.messages.entries()) {
      totalMessages += messages.length;
      roomCounts[roomId] = messages.length;
    }

    return {
      totalMessages,
      totalRooms: this.messages.size,
      roomCounts,
      maxMessagesPerRoom: this.maxMessagesPerRoom,
    };
  }
}
