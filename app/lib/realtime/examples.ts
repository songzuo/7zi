/**
 * @fileoverview 已读标记持久化使用示例
 * @description 演示如何使用已读标记存储和实时服务器
 */

import { getRealtimeServer, RealtimeServer } from './server';
import type { CreateReadReceiptParams } from './types';

/**
 * 示例：基本使用
 */
export function basicUsageExample(): void {
  // 获取服务器实例
  const server = getRealtimeServer('/path/to/database.db');

  // 标记消息为已读
  const receipt = server.markAsRead({
    messageId: 'msg-12345',
    userId: 'user-67890',
    conversationId: 'conv-abcde',
  });

  console.log('Created receipt:', receipt);

  // 检查用户是否已读消息
  const hasRead = server.hasRead('msg-12345', 'user-67890');
  console.log('Has read:', hasRead);

  // 获取消息的已读统计
  const stats = server.getMessageReadStats('msg-12345', 10);
  console.log('Read stats:', stats);
}

/**
 * 示例：批量标记已读
 */
export function batchMarkAsReadExample(): void {
  const server = getRealtimeServer();

  // 批量标记多条消息为已读
  const params: CreateReadReceiptParams[] = [
    { messageId: 'msg-1', userId: 'user-123' },
    { messageId: 'msg-2', userId: 'user-123' },
    { messageId: 'msg-3', userId: 'user-123' },
  ];

  const receipts = server.markMultipleAsRead(params);
  console.log(`Marked ${receipts.length} messages as read`);
}

/**
 * 示例：查询已读标记
 */
export function queryReceiptsExample(): void {
  const server = getRealtimeServer();

  // 查询用户的所有已读标记
  const userReceipts = server.queryReceipts({
    userId: 'user-123',
    limit: 20,
  });

  console.log('User receipts:', userReceipts);

  // 查询会话中的已读标记
  const conversationReceipts = server.queryReceipts({
    conversationId: 'conv-456',
    limit: 50,
  });

  console.log('Conversation receipts:', conversationReceipts);
}

/**
 * 示例：与 WebSocket 集成
 */
export function webSocketIntegrationExample(): void {
  const server = getRealtimeServer();

  // 模拟 WebSocket 连接
  const mockWebSocket = {
    send: (data: string) => console.log('Sending:', data),
    close: () => console.log('Connection closed'),
    readyState: 1, // OPEN
  } as unknown as WebSocket;

  // 添加客户端连接
  server.addClient('user-123', mockWebSocket);

  // 处理消息
  server.handleMessage(mockWebSocket, 'user-123', JSON.stringify({
    type: 'message:read',
    payload: {
      messageId: 'msg-789',
      userId: 'user-123',
    },
    timestamp: new Date(),
  }));

  // 发送消息给特定用户
  server.sendToUser('user-123', {
    type: 'receipt:update',
    payload: { messageId: 'msg-789', read: true },
    timestamp: new Date(),
  });

  // 清理
  server.removeClient('user-123', mockWebSocket);
}

/**
 * 示例：定期清理过期标记
 */
export function cleanupExample(): void {
  const server = getRealtimeServer();

  // 清理 30 天前的已读标记
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const deletedCount = server.cleanupExpiredReceipts(thirtyDaysMs);

  console.log(`Cleaned up ${deletedCount} expired receipts`);
}

/**
 * 示例：获取未读统计
 */
export function unreadCountExample(): void {
  const server = getRealtimeServer();

  // 获取用户的未读消息数
  const unreadCount = server.getUnreadCount('user-123');
  console.log('Unread count:', unreadCount);

  // 获取特定会话的未读数
  const conversationUnread = server.getUnreadCount('user-123', 'conv-456');
  console.log('Conversation unread:', conversationUnread);
}

/**
 * 示例：完整的实时消息流程
 */
export function completeFlowExample(): void {
  const server = getRealtimeServer();

  // 1. 用户发送消息
  console.log('User sends message...');

  // 2. 接收者阅读消息
  const receipt = server.markAsRead({
    messageId: 'msg-new',
    userId: 'recipient-123',
    conversationId: 'conv-group',
  });

  // 3. 广播已读状态更新
  server.broadcast({
    type: 'receipt:update',
    payload: receipt,
    timestamp: new Date(),
    senderId: 'recipient-123',
  });

  // 4. 发送者查看已读统计
  const stats = server.getMessageReadStats('msg-new', 5);
  console.log('Read stats:', stats);
}

// 导出所有示例
export const examples = {
  basicUsage: basicUsageExample,
  batchMarkAsRead: batchMarkAsReadExample,
  queryReceipts: queryReceiptsExample,
  webSocketIntegration: webSocketIntegrationExample,
  cleanup: cleanupExample,
  unreadCount: unreadCountExample,
  completeFlow: completeFlowExample,
};
