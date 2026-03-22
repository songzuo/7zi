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

export type NotificationCategory = 'info' | 'warning' | 'error' | 'success';

export interface RealtimeNotification {
  id: string;
  type: RealtimeNotificationType;
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: NotificationCategory;
  data?: Record<string, unknown>;
  actionUrl?: string;
  actionText?: string;
  icon?: string;
  read?: boolean;
  batchId?: string; // 用于批量通知
  soundEnabled?: boolean;
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

// ============================================================================
// 通知 Payload 类型
// ============================================================================

export interface TaskStatusChangedPayload {
  taskId: string;
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
}

export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assignedBy: { id: string; name: string; avatar?: string };
  assignedTo: { id: string; name: string; avatar?: string };
}

export interface TaskCommentPayload {
  taskId: string;
  commentId: string;
  author: { id: string; name: string; avatar?: string };
  content: string;
}

export interface TaskDeletedPayload {
  taskId: string;
  taskTitle: string;
  deletedBy: { id: string; name: string; avatar?: string };
}

export interface TaskUpdatedPayload {
  taskId: string;
  taskTitle: string;
  updatedBy: { id: string; name: string; avatar?: string };
  changes: Record<string, { old: unknown; new: unknown }>;
}

export interface MemberOnlinePayload {
  userId: string;
  userName: string;
}

export interface MemberOfflinePayload {
  userId: string;
  userName: string;
}

export interface MemberStatusChangedPayload {
  userId: string;
  userName: string;
  newStatus: string;
}

export interface SystemAnnouncementPayload {
  announcementId: string;
  content: string;
  actionUrl?: string;
}

export interface ProjectUpdatedPayload {
  projectId: string;
  projectName: string;
  changeType: 'created' | 'updated' | 'deleted' | 'archived' | 'restored';
  changedBy: { id: string; name: string; avatar?: string };
}

export type NotificationPayload =
  | TaskStatusChangedPayload
  | TaskAssignedPayload
  | TaskCommentPayload
  | TaskDeletedPayload
  | TaskUpdatedPayload
  | MemberOnlinePayload
  | MemberOfflinePayload
  | MemberStatusChangedPayload
  | SystemAnnouncementPayload
  | ProjectUpdatedPayload;
