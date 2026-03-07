/**
 * 消息转换工具
 * 
 * 将 WebSocket 消息转换为不同格式
 */

import type {
  WebSocketMessage,
  RealtimeNotification,
  TaskStatusChangedMessage,
  MemberOnlineMessage,
  MemberOfflineMessage,
  SystemAnnouncementMessage,
} from './types';

/**
 * 获取任务状态的中文名称
 */
export function getTaskStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    blocked: '已阻塞',
  };
  return labels[status] || status;
}

/**
 * 获取用户状态的中文名称
 */
export function getUserStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    online: '在线',
    offline: '离线',
    away: '离开',
    busy: '忙碌',
  };
  return labels[status] || status;
}

/**
 * 格式化时间戳为相对时间
 */
export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes} 分钟前`;
  } else if (hours < 24) {
    return `${hours} 小时前`;
  } else if (days < 7) {
    return `${days} 天前`;
  } else {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  }
}

/**
 * 提取任务状态变更通知的关键信息
 */
export function extractTaskStatusInfo(
  message: TaskStatusChangedMessage
): {
  taskId: string;
  taskTitle: string;
  statusChange: string;
  changedBy: string;
} {
  const { taskId, taskTitle, oldStatus, newStatus, changedBy } = message.payload;
  return {
    taskId,
    taskTitle,
    statusChange: `${getTaskStatusLabel(oldStatus)} → ${getTaskStatusLabel(newStatus)}`,
    changedBy: changedBy.name,
  };
}

/**
 * 提取成员上线通知的关键信息
 */
export function extractMemberOnlineInfo(
  message: MemberOnlineMessage
): {
  userId: string;
  userName: string;
  role?: string;
} {
  const { userId, userName, role } = message.payload;
  return { userId, userName, role };
}

/**
 * 提取成员离线通知的关键信息
 */
export function extractMemberOfflineInfo(
  message: MemberOfflineMessage
): {
  userId: string;
  userName: string;
  lastOnline: string;
} {
  const { userId, userName, lastOnline } = message.payload;
  return {
    userId,
    userName,
    lastOnline: formatRelativeTime(lastOnline),
  };
}

/**
 * 提取系统公告的关键信息
 */
export function extractSystemAnnouncementInfo(
  message: SystemAnnouncementMessage
): {
  title: string;
  content: string;
  level: string;
  hasAction: boolean;
  actionUrl?: string;
  actionText?: string;
} {
  const { title, content, level, actionUrl, actionText } = message.payload;
  return {
    title,
    content,
    level,
    hasAction: !!actionUrl,
    actionUrl,
    actionText,
  };
}

/**
 * 判断消息是否需要立即通知用户
 */
export function shouldNotifyImmediately(
  message: WebSocketMessage,
  currentUserId?: string
): boolean {
  switch (message.type) {
    case 'system:announcement': {
      const level = (message.payload as { level?: string }).level;
      return level === 'critical' || level === 'warning';
    }
    case 'task:assigned': {
      const assignedTo = (message.payload as { assignedTo?: { id?: string } }).assignedTo;
      return assignedTo?.id === currentUserId;
    }
    case 'task:comment': {
      const mentions = (message.payload as { mentions?: Array<{ id: string }> }).mentions;
      return mentions?.some((m) => m.id === currentUserId) ?? false;
    }
    case 'task:status_changed':
    case 'member:online':
    case 'member:offline':
    case 'member:status_changed':
    case 'project:updated':
      return false;
    default:
      return false;
  }
}

/**
 * 获取消息的优先级分数（用于排序）
 */
export function getMessagePriority(message: WebSocketMessage): number {
  switch (message.type) {
    case 'system:announcement': {
      const level = (message.payload as { level?: string }).level;
      if (level === 'critical') return 100;
      if (level === 'warning') return 80;
      return 50;
    }
    case 'task:assigned':
      return 70;
    case 'task:comment':
      return 60;
    case 'task:status_changed':
      return 40;
    case 'project:updated':
      return 30;
    case 'member:online':
    case 'member:offline':
    case 'member:status_changed':
      return 10;
    default:
      return 0;
  }
}

/**
 * 将通知转换为浏览器推送通知格式
 */
export function toBrowserNotification(notification: RealtimeNotification): {
  title: string;
  options: NotificationOptions;
} {
  return {
    title: notification.title,
    options: {
      body: notification.message,
      icon: notification.avatar || '/favicon.ico',
      tag: notification.id,
      data: {
        url: notification.actionUrl,
        id: notification.id,
      },
      requireInteraction: notification.priority === 'high',
    },
  };
}

/**
 * 验证 WebSocket 消息格式
 */
export function isValidMessage(message: unknown): message is WebSocketMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const msg = message as Record<string, unknown>;
  
  // 检查必需字段
  if (typeof msg.type !== 'string') {
    return false;
  }

  // 检查 payload 是否存在
  if (typeof msg.payload !== 'object' || msg.payload === null) {
    return false;
  }

  return true;
}

/**
 * 创建消息摘要（用于日志或预览）
 */
export function createMessageSummary(message: WebSocketMessage): string {
  const typeLabels: Record<string, string> = {
    'task:status_changed': '任务状态',
    'task:assigned': '任务分配',
    'task:comment': '任务评论',
    'member:online': '成员上线',
    'member:offline': '成员离线',
    'member:status_changed': '状态变更',
    'system:announcement': '系统公告',
    'project:updated': '项目更新',
    'heartbeat': '心跳',
    'connection:confirmed': '连接确认',
  };

  const label = typeLabels[message.type] || message.type;
  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString()
    : '';

  return `[${label}] ${timestamp}`;
}