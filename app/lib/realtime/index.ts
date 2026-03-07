/**
 * @fileoverview 实时消息模块入口
 * @description 导出实时消息相关的类型和服务
 */

// 导出类型
export type {
  ReadReceipt,
  CreateReadReceiptParams,
  ReadReceiptQueryParams,
  ReadStats,
  RealtimeMessage,
  WebSocketEvent,
  WebSocketEventType,
  MessageId,
  UserId,
  ConversationId,
  MessageStatus,
  RealtimeServerConfig,
} from './types';

// 导出服务器
export {
  RealtimeServer,
  getRealtimeServer,
  resetRealtimeServer,
} from './server';

// 默认导出
export { RealtimeServer as default } from './server';
