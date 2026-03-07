/**
 * 实时通知模块
 * 
 * 导出所有实时通知相关的类型、工具和 Hooks
 */

// 类型
export type {
  UserStatus,
  TaskStatus,
  Priority,
  BaseWebSocketMessage,
  TaskStatusChangedMessage,
  MemberOnlineMessage,
  MemberOfflineMessage,
  MemberStatusChangedMessage,
  SystemAnnouncementMessage,
  TaskAssignedMessage,
  TaskCommentMessage,
  ProjectUpdatedMessage,
  HeartbeatMessage,
  ConnectionConfirmedMessage,
  WebSocketMessage,
  RealtimeNotificationType,
  RealtimeNotification,
  RealtimeNotificationState,
  ClientSocketEvent,
  ServerSocketEvent,
  RealtimeConnectionOptions,
  NotificationHandler,
  NotificationFilter,
} from './types';

// Socket 客户端
export { socketManager, SocketManager } from './socket-client';
export type { ConnectionState, SocketManagerEvents } from './socket-client';

// 状态管理
export {
  useRealtimeNotificationStore,
  createNotificationFromMessage,
  useUnreadNotifications,
  useReadNotifications,
  useNotificationsByType,
  useHighPriorityNotifications,
} from './store';

// 工具函数
export {
  getTaskStatusLabel,
  getUserStatusLabel,
  formatRelativeTime,
  extractTaskStatusInfo,
  extractMemberOnlineInfo,
  extractMemberOfflineInfo,
  extractSystemAnnouncementInfo,
  shouldNotifyImmediately,
  getMessagePriority,
  toBrowserNotification,
  isValidMessage,
  createMessageSummary,
} from './utils';

// Hook
export {
  useRealtimeNotifications,
  type UseRealtimeNotificationsOptions,
  type UseRealtimeNotificationsReturn,
} from './useRealtimeNotifications';

// 服务端（仅在服务端使用）
export { NotificationServer, notificationServer } from './server';