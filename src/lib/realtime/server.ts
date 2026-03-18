/**
 * 通知服务器 Mock
 * 
 * 用于测试和客户端模拟的通知服务器实现
 */

import type { WebSocketMessage } from './types';

// ============================================================================
// 类型定义
// ============================================================================

interface UserConnection {
  userId: string;
  channels: Set<string>;
  connectedAt: Date;
}

// ============================================================================
// 通知服务器类
// ============================================================================

class NotificationServer {
  private connections: Map<string, UserConnection> = new Map();
  private channelSubscriptions: Map<string, Set<string>> = new Map();

  /**
   * 广播消息到所有连接的用户
   */
  broadcast(message: WebSocketMessage): void {
    // Mock implementation - 在测试中不需要实际发送
  }

  /**
   * 广播消息到指定频道
   */
  broadcastToChannel(channel: string, message: WebSocketMessage): void {
    // Mock implementation
  }

  /**
   * 发送消息给指定用户
   */
  sendToUser(userId: string, message: WebSocketMessage): void {
    // Mock implementation
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string): boolean {
    return this.connections.has(userId);
  }

  /**
   * 获取在线用户列表
   */
  getOnlineUsers(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * 模拟用户连接（用于测试）
   */
  connectUser(userId: string): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, {
        userId,
        channels: new Set(),
        connectedAt: new Date(),
      });
    }
  }

  /**
   * 模拟用户断开连接（用于测试）
   */
  disconnectUser(userId: string): void {
    const connection = this.connections.get(userId);
    if (connection) {
      // 从所有频道中移除用户
      connection.channels.forEach(channel => {
        this.channelSubscriptions.get(channel)?.delete(userId);
      });
      this.connections.delete(userId);
    }
  }

  /**
   * 订阅频道
   */
  subscribeToChannel(userId: string, channel: string): void {
    const connection = this.connections.get(userId);
    if (connection) {
      connection.channels.add(channel);
      
      if (!this.channelSubscriptions.has(channel)) {
        this.channelSubscriptions.set(channel, new Set());
      }
      this.channelSubscriptions.get(channel)!.add(userId);
    }
  }

  /**
   * 取消订阅频道
   */
  unsubscribeFromChannel(userId: string, channel: string): void {
    const connection = this.connections.get(userId);
    if (connection) {
      connection.channels.delete(channel);
      this.channelSubscriptions.get(channel)?.delete(userId);
    }
  }

  /**
   * 获取频道订阅者数量
   */
  getChannelSubscriberCount(channel: string): number {
    return this.channelSubscriptions.get(channel)?.size || 0;
  }

  /**
   * 清除所有连接（用于测试清理）
   */
  clearAll(): void {
    this.connections.clear();
    this.channelSubscriptions.clear();
  }
}

// 单例导出
export const notificationServer = new NotificationServer();

export default NotificationServer;
