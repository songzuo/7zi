/**
 * 实时通知类型定义
 */

// ============================================================================
// WebSocket 消息类型
// ============================================================================

export interface WebSocketMessage {
  type: string;
  id: string;
  timestamp: string;
  payload?: unknown;
}

// ============================================================================
// 实时通知类型
// ============================================================================

export type RealtimeNotificationType =
  | 'task_status_changed'
  | 'task_assigned'
  | 'task_comment'
  | 'member_online'
  | 'member_offline'
  | 'member_status_changed'
  | 'system_announcement'
  | 'project_updated';

export interface RealtimeNotification {
  id: string;
  type: RealtimeNotificationType;
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, unknown>;
  actionUrl?: string;
  actionText?: string;
  icon?: string;
  read?: boolean;
}

// ============================================================================
// 连接状态类型
// ============================================================================

export type ConnectionState = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'error';

// ============================================================================
// 频道订阅类型
// ============================================================================

export interface ChannelSubscription {
  channel: string;
  userId: string;
  subscribedAt: Date;
}
