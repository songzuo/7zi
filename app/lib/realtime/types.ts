/**
 * 实时通知系统 - 类型定义
 * 
 * 定义 WebSocket 消息类型和通知数据结构
 */

// ========== 基础类型 ==========

/** 用户状态 */
export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

/** 任务状态 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';

/** 优先级 */
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// ========== WebSocket 消息类型 ==========

/** WebSocket 消息基础接口 */
export interface BaseWebSocketMessage {
  type: string;
  timestamp: string;
  id: string;
  payload?: Record<string, unknown>;
}

/** 任务状态变更通知 */
export interface TaskStatusChangedMessage extends BaseWebSocketMessage {
  type: 'task:status_changed';
  payload: {
    taskId: string;
    taskTitle: string;
    oldStatus: TaskStatus;
    newStatus: TaskStatus;
    changedBy: {
      id: string;
      name: string;
      avatar?: string;
    };
    projectId?: string;
    projectName?: string;
    priority?: Priority;
    dueDate?: string;
  };
}

/** 成员上线通知 */
export interface MemberOnlineMessage extends BaseWebSocketMessage {
  type: 'member:online';
  payload: {
    userId: string;
    userName: string;
    avatar?: string;
    role?: string;
    lastSeen?: string;
  };
}

/** 成员离线通知 */
export interface MemberOfflineMessage extends BaseWebSocketMessage {
  type: 'member:offline';
  payload: {
    userId: string;
    userName: string;
    avatar?: string;
    lastOnline: string;
    wasAway?: boolean;
  };
}

/** 成员状态变更通知 */
export interface MemberStatusChangedMessage extends BaseWebSocketMessage {
  type: 'member:status_changed';
  payload: {
    userId: string;
    userName: string;
    avatar?: string;
    oldStatus: UserStatus;
    newStatus: UserStatus;
  };
}

/** 系统公告推送 */
export interface SystemAnnouncementMessage extends BaseWebSocketMessage {
  type: 'system:announcement';
  payload: {
    title: string;
    content: string;
    level: 'info' | 'warning' | 'critical' | 'maintenance';
    actionUrl?: string;
    actionText?: string;
    expiresAt?: string;
    sender?: {
      id: string;
      name: string;
      role: string;
    };
  };
}

/** 任务分配通知 */
export interface TaskAssignedMessage extends BaseWebSocketMessage {
  type: 'task:assigned';
  payload: {
    taskId: string;
    taskTitle: string;
    assignedTo: {
      id: string;
      name: string;
    };
    assignedBy: {
      id: string;
      name: string;
    };
    projectId?: string;
    projectName?: string;
    priority?: Priority;
    dueDate?: string;
  };
}

/** 任务评论通知 */
export interface TaskCommentMessage extends BaseWebSocketMessage {
  type: 'task:comment';
  payload: {
    taskId: string;
    taskTitle: string;
    commentId: string;
    content: string;
    author: {
      id: string;
      name: string;
      avatar?: string;
    };
    mentions?: Array<{
      id: string;
      name: string;
    }>;
  };
}

/** 项目更新通知 */
export interface ProjectUpdatedMessage extends BaseWebSocketMessage {
  type: 'project:updated';
  payload: {
    projectId: string;
    projectName: string;
    changeType: 'created' | 'updated' | 'deleted' | 'archived';
    changedBy: {
      id: string;
      name: string;
    };
    details?: string;
  };
}

/** 心跳消息 */
export interface HeartbeatMessage extends BaseWebSocketMessage {
  type: 'heartbeat';
  payload: {
    serverTime: string;
  };
}

/** 连接确认消息 */
export interface ConnectionConfirmedMessage extends BaseWebSocketMessage {
  type: 'connection:confirmed';
  payload: {
    userId: string;
    sessionId: string;
    reconnectToken?: string;
  };
}

/** 所有 WebSocket 消息类型的联合 */
export type WebSocketMessage =
  | TaskStatusChangedMessage
  | MemberOnlineMessage
  | MemberOfflineMessage
  | MemberStatusChangedMessage
  | SystemAnnouncementMessage
  | TaskAssignedMessage
  | TaskCommentMessage
  | ProjectUpdatedMessage
  | HeartbeatMessage
  | ConnectionConfirmedMessage
  | BaseWebSocketMessage;

// ========== 通知数据类型 ==========

/** 实时通知类型 */
export type RealtimeNotificationType =
  | 'task_status_changed'
  | 'task_assigned'
  | 'task_comment'
  | 'member_online'
  | 'member_offline'
  | 'member_status_changed'
  | 'system_announcement'
  | 'project_updated';

/** 实时通知数据 */
export interface RealtimeNotification {
  id: string;
  type: RealtimeNotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
  actionUrl?: string;
  actionText?: string;
  priority?: 'low' | 'normal' | 'high';
  icon?: string;
  avatar?: string;
}

/** 实时通知状态 */
export interface RealtimeNotificationState {
  notifications: RealtimeNotification[];
  unreadCount: number;
  isConnected: boolean;
  lastHeartbeat: string | null;
  
  // Actions
  addNotification: (notification: RealtimeNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  setConnected: (connected: boolean) => void;
  updateHeartbeat: (timestamp: string) => void;
}

// ========== Socket 事件类型 ==========

/** 客户端发送的事件 */
export type ClientSocketEvent =
  | { type: 'authenticate'; token: string }
  | { type: 'subscribe'; channels: string[] }
  | { type: 'unsubscribe'; channels: string[] }
  | { type: 'heartbeat'; timestamp: string }
  | { type: 'mark_read'; notificationIds: string[] };

/** 服务端推送的事件 */
export type ServerSocketEvent = WebSocketMessage;

// ========== 工具函数类型 ==========

/** WebSocket 连接配置 */
export interface RealtimeConnectionOptions {
  url: string;
  token?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  channels?: string[];
}

/** 通知处理器 */
export type NotificationHandler<T extends WebSocketMessage = WebSocketMessage> = (
  message: T
) => void;

/** 通知过滤器 */
export type NotificationFilter = (
  notification: RealtimeNotification
) => boolean;
