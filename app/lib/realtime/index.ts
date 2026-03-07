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

// 导出更多类型
export type {
  WebSocketMessage,
  RealtimeNotification,
  RealtimeNotificationType,
  RealtimeNotificationState,
  NotificationHandler,
  NotificationFilter,
  RealtimeConnectionOptions,
  UserStatus,
  TaskStatus,
  Priority,
} from './types';

// 导出服务
export { NotificationServer, notificationServer } from './server';
export { notificationService, type NotificationEvent, type BroadcastOptions } from './notification-service';
export { readStatusStore } from './read-status';
export { socketManager, SocketManager } from './socket-client';

// 导出 Store
export {
  useRealtimeNotificationStore,
  createNotificationFromMessage,
  useUnreadNotifications,
  useReadNotifications,
  useNotificationsByType,
  useHighPriorityNotifications,
} from './store';

// 导出 Hooks
export { useRealtimeNotifications } from './use-realtime-notifications';
export type { UseRealtimeNotificationsOptions, UseRealtimeNotificationsReturn } from './use-realtime-notifications';
export { useEnhancedWebSocket } from './use-enhanced-websocket';
export type { UseEnhancedWebSocketReturn, WebSocketConfig, WebSocketStats, ConnectionState } from './use-enhanced-websocket';

// 导出 Provider
export { NotificationProvider, useNotificationContext } from './notification-provider';
export type { NotificationContextValue, NotificationProviderProps } from './notification-provider';

// 工具函数
export { formatRelativeTime, getNotificationPriority } from './utils'; from './types';

// 导出服务器
export {
  RealtimeServer,
  getRealtimeServer,
  resetRealtimeServer,
} from './server';

// 默认导出
export { RealtimeServer as default } from './server';
