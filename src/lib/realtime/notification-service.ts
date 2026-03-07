/**
 * 实时通知服务
 * 
 * 统一的通知服务，整合 WebSocket 和本地通知
 */

import { notificationServer } from './server';
import { readStatusStore } from './read-status';
import type { WebSocketMessage, RealtimeNotification, RealtimeNotificationType } from './types';

// ============================================================================
// 类型定义
// ============================================================================

export interface NotificationEvent {
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
  avatar?: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface NotificationSubscription {
  id: string;
  userId: string;
  channels: string[];
  callback: (notification: NotificationEvent) => void;
}

export interface BroadcastOptions {
  channels?: string[];
  userIds?: string[];
  excludeUserIds?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  persistent?: boolean;
  ttl?: number; // Time to live in seconds
}

// ============================================================================
// 通知服务类
// ============================================================================

class NotificationService {
  private subscriptions: Map<string, NotificationSubscription> = new Map();
  private notificationHistory: Map<string, NotificationEvent[]> = new Map();
  private maxHistoryPerUser = 100;

  /**
   * 发送任务状态变更通知
   */
  notifyTaskStatusChange(options: {
    taskId: string;
    taskTitle: string;
    oldStatus: string;
    newStatus: string;
    changedBy: { id: string; name: string; avatar?: string };
    projectId?: string;
    projectName?: string;
    assigneeId?: string;
  }): void {
    const message: WebSocketMessage = {
      type: 'task:status_changed',
      id: `task-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      payload: {
        taskId: options.taskId,
        taskTitle: options.taskTitle,
        oldStatus: options.oldStatus,
        newStatus: options.newStatus,
        changedBy: options.changedBy,
        projectId: options.projectId,
        projectName: options.projectName,
      },
    };

    // 发送到项目频道
    if (options.projectId) {
      notificationServer.broadcastToChannel(`project:${options.projectId}`, message);
    }

    // 如果有分配者，单独发送
    if (options.assigneeId) {
      notificationServer.sendToUser(options.assigneeId, message);
    }

    // 广播到任务频道
    notificationServer.broadcastToChannel(`task:${options.taskId}`, message);

    // 记录历史
    this.addToHistory('task_status_changed', this.createEventFromMessage(message));
  }

  /**
   * 发送任务分配通知
   */
  notifyTaskAssignment(options: {
    taskId: string;
    taskTitle: string;
    assignedTo: { id: string; name: string };
    assignedBy: { id: string; name: string; avatar?: string };
    projectId?: string;
    projectName?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    dueDate?: string;
  }): void {
    const message: WebSocketMessage = {
      type: 'task:assigned',
      id: `task-assign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      payload: {
        taskId: options.taskId,
        taskTitle: options.taskTitle,
        assignedTo: options.assignedTo,
        assignedBy: options.assignedBy,
        projectId: options.projectId,
        projectName: options.projectName,
        priority: options.priority,
        dueDate: options.dueDate,
      },
    };

    // 发送给被分配的用户
    notificationServer.sendToUser(options.assignedTo.id, message);

    // 如果有项目，发送到项目频道
    if (options.projectId) {
      notificationServer.broadcastToChannel(`project:${options.projectId}`, message);
    }

    this.addToHistory('task_assigned', this.createEventFromMessage(message));
  }

  /**
   * 发送任务评论通知
   */
  notifyTaskComment(options: {
    taskId: string;
    taskTitle: string;
    commentId: string;
    content: string;
    author: { id: string; name: string; avatar?: string };
    mentions?: Array<{ id: string; name: string }>;
    projectId?: string;
  }): void {
    const message: WebSocketMessage = {
      type: 'task:comment',
      id: `task-comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      payload: {
        taskId: options.taskId,
        taskTitle: options.taskTitle,
        commentId: options.commentId,
        content: options.content,
        author: options.author,
        mentions: options.mentions,
        projectId: options.projectId,
      },
    };

    // 发送给所有被提及的用户
    if (options.mentions && options.mentions.length > 0) {
      options.mentions.forEach(user => {
        notificationServer.sendToUser(user.id, message);
      });
    }

    // 发送到任务频道
    notificationServer.broadcastToChannel(`task:${options.taskId}`, message);

    // 发送到项目频道
    if (options.projectId) {
      notificationServer.broadcastToChannel(`project:${options.projectId}`, message);
    }

    this.addToHistory('task_comment', this.createEventFromMessage(message));
  }

  /**
   * 发送成员状态通知
   */
  notifyMemberStatus(options: {
    userId: string;
    userName: string;
    avatar?: string;
    status: 'online' | 'offline' | 'away' | 'busy';
    previousStatus?: string;
  }): void {
    const isOnline = options.status === 'online';
    const isOffline = options.status === 'offline';

    const message: WebSocketMessage = {
      type: isOnline ? 'member:online' : isOffline ? 'member:offline' : 'member:status_changed',
      id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      payload: {
        userId: options.userId,
        userName: options.userName,
        avatar: options.avatar,
        ...(isOffline ? { lastOnline: new Date().toISOString() } : {}),
        ...(!isOnline && !isOffline ? { 
          oldStatus: options.previousStatus || 'offline',
          newStatus: options.status 
        } : {}),
      },
    };

    // 广播到团队频道
    notificationServer.broadcastToChannel('team', message);
    notificationServer.broadcast(message);

    this.addToHistory(isOnline ? 'member_online' : isOffline ? 'member_offline' : 'member_status_changed', 
      this.createEventFromMessage(message));
  }

  /**
   * 发送系统公告
   */
  broadcastSystemAnnouncement(options: {
    title: string;
    content: string;
    level: 'info' | 'warning' | 'critical' | 'maintenance';
    actionUrl?: string;
    actionText?: string;
    sender?: { id: string; name: string; role: string };
    targetUsers?: string[];
    expiresAt?: string;
  }): void {
    const message: WebSocketMessage = {
      type: 'system:announcement',
      id: `sys-announce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      payload: {
        title: options.title,
        content: options.content,
        level: options.level,
        actionUrl: options.actionUrl,
        actionText: options.actionText,
        sender: options.sender,
        expiresAt: options.expiresAt,
      },
    };

    if (options.targetUsers && options.targetUsers.length > 0) {
      // 发送给指定用户
      options.targetUsers.forEach(userId => {
        notificationServer.sendToUser(userId, message);
      });
    } else {
      // 广播给所有用户
      notificationServer.broadcast(message);
    }

    this.addToHistory('system_announcement', this.createEventFromMessage(message));
  }

  /**
   * 发送项目更新通知
   */
  notifyProjectUpdate(options: {
    projectId: string;
    projectName: string;
    changeType: 'created' | 'updated' | 'deleted' | 'archived' | 'restored';
    changedBy: { id: string; name: string; avatar?: string };
    details?: string;
    memberIds?: string[];
  }): void {
    const message: WebSocketMessage = {
      type: 'project:updated',
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      payload: {
        projectId: options.projectId,
        projectName: options.projectName,
        changeType: options.changeType,
        changedBy: options.changedBy,
        details: options.details,
      },
    };

    // 发送到项目频道
    notificationServer.broadcastToChannel(`project:${options.projectId}`, message);

    // 发送给项目成员
    if (options.memberIds && options.memberIds.length > 0) {
      options.memberIds.forEach(userId => {
        notificationServer.sendToUser(userId, message);
      });
    }

    this.addToHistory('project_updated', this.createEventFromMessage(message));
  }

  /**
   * 发送自定义通知
   */
  sendCustomNotification(options: {
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    actionUrl?: string;
    actionText?: string;
    icon?: string;
    target?: BroadcastOptions;
  }): void {
    const wsMessage: WebSocketMessage = {
      type: options.type as any,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      payload: {
        title: options.title,
        message: options.message,
        data: options.data,
        priority: options.priority || 'normal',
        actionUrl: options.actionUrl,
        actionText: options.actionText,
        icon: options.icon,
      },
    };

    if (options.target) {
      // 发送到指定频道
      if (options.target.channels) {
        options.target.channels.forEach(channel => {
          notificationServer.broadcastToChannel(channel, wsMessage);
        });
      }

      // 发送给指定用户
      if (options.target.userIds) {
        options.target.userIds.forEach(userId => {
          if (!options.target.excludeUserIds?.includes(userId)) {
            notificationServer.sendToUser(userId, wsMessage);
          }
        });
      }
    } else {
      // 广播给所有人
      notificationServer.broadcast(wsMessage);
    }
  }

  /**
   * 获取用户的通知历史
   */
  getNotificationHistory(userId: string, limit = 50): NotificationEvent[] {
    const history = this.notificationHistory.get(userId) || [];
    return history.slice(0, limit);
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationIds: string[], userId: string): Promise<void> {
    await readStatusStore.markMultipleAsRead(notificationIds, userId);
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return readStatusStore.getUnreadCount(userId);
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string): boolean {
    return notificationServer.isUserOnline(userId);
  }

  /**
   * 获取在线用户列表
   */
  getOnlineUsers(): string[] {
    return notificationServer.getOnlineUsers();
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private createEventFromMessage(message: WebSocketMessage): NotificationEvent {
    const payload = message.payload as Record<string, unknown>;
    
    return {
      id: message.id,
      type: this.mapMessageType(message.type),
      title: this.getTitleForType(message.type, payload),
      message: this.getMessageForType(message.type, payload),
      timestamp: message.timestamp,
      priority: this.getPriorityForType(message.type),
      data: payload,
      actionUrl: this.getActionUrl(message.type, payload),
      actionText: this.getActionText(message.type),
      icon: this.getIconForType(message.type),
    };
  }

  private mapMessageType(type: string): RealtimeNotificationType {
    const map: Record<string, RealtimeNotificationType> = {
      'task:status_changed': 'task_status_changed',
      'task:assigned': 'task_assigned',
      'task:comment': 'task_comment',
      'member:online': 'member_online',
      'member:offline': 'member_offline',
      'member:status_changed': 'member_status_changed',
      'system:announcement': 'system_announcement',
      'project:updated': 'project_updated',
    };
    return map[type] || 'system_announcement';
  }

  private getTitleForType(type: string, payload: Record<string, unknown>): string {
    switch (type) {
      case 'task:status_changed':
        return '任务状态更新';
      case 'task:assigned':
        return '新任务分配';
      case 'task:comment':
        return '任务新评论';
      case 'member:online':
        return '成员上线';
      case 'member:offline':
        return '成员离线';
      case 'member:status_changed':
        return '成员状态变更';
      case 'system:announcement':
        return (payload.title as string) || '系统公告';
      case 'project:updated':
        return '项目更新';
      default:
        return '新通知';
    }
  }

  private getMessageForType(type: string, payload: Record<string, unknown>): string {
    switch (type) {
      case 'task:status_changed': {
        const p = payload as any;
        return `${p.taskTitle} 从 ${p.oldStatus} 变更为 ${p.newStatus}`;
      }
      case 'task:assigned': {
        const p = payload as any;
        return `${p.assignedBy.name} 将 "${p.taskTitle}" 分配给了 ${p.assignedTo.name}`;
      }
      case 'task:comment': {
        const p = payload as any;
        return `${p.author.name}: ${p.content?.slice(0, 50)}${p.content?.length > 50 ? '...' : ''}`;
      }
      case 'member:online': {
        const p = payload as any;
        return `${p.userName} 已上线`;
      }
      case 'member:offline': {
        const p = payload as any;
        return `${p.userName} 已离线`;
      }
      case 'member:status_changed': {
        const p = payload as any;
        return `${p.userName} 状态变更为 ${p.newStatus}`;
      }
      case 'system:announcement':
        return (payload.content as string) || '';
      case 'project:updated': {
        const p = payload as any;
        const action = { created: '创建', updated: '更新', deleted: '删除', archived: '归档', restored: '恢复' };
        return `${p.changedBy.name} ${action[p.changeType] || '更新'}了项目 "${p.projectName}"`;
      }
      default:
        return '';
    }
  }

  private getPriorityForType(type: string): 'low' | 'normal' | 'high' | 'urgent' {
    switch (type) {
      case 'system:announcement':
        return 'high';
      case 'task:assigned':
        return 'high';
      case 'task:comment':
      case 'task:status_changed':
        return 'normal';
      case 'member:online':
      case 'member:offline':
      case 'member:status_changed':
        return 'low';
      default:
        return 'normal';
    }
  }

  private getActionUrl(type: string, payload: Record<string, unknown>): string | undefined {
    switch (type) {
      case 'task:status_changed':
      case 'task:assigned':
      case 'task:comment':
        return `/tasks/${(payload as any).taskId}`;
      case 'project:updated':
        return `/projects/${(payload as any).projectId}`;
      case 'system:announcement':
        return (payload as any).actionUrl;
      default:
        return undefined;
    }
  }

  private getActionText(type: string): string | undefined {
    switch (type) {
      case 'task:status_changed':
      case 'task:assigned':
        return '查看任务';
      case 'task:comment':
        return '查看评论';
      case 'project:updated':
        return '查看项目';
      case 'system:announcement':
        return '查看详情';
      default:
        return undefined;
    }
  }

  private getIconForType(type: string): string {
    switch (type) {
      case 'task:status_changed':
        return '📋';
      case 'task:assigned':
        return '📌';
      case 'task:comment':
        return '💬';
      case 'member:online':
        return '🟢';
      case 'member:offline':
        return '⚫';
      case 'member:status_changed':
        return '🔄';
      case 'system:announcement':
        return '📢';
      case 'project:updated':
        return '📁';
      default:
        return '🔔';
    }
  }

  private addToHistory(type: RealtimeNotificationType, event: NotificationEvent): void {
    // 这里可以添加到数据库或持久化存储
    // 目前只在内存中保存
  }
}

// 单例导出
export const notificationService = new NotificationService();

export default NotificationService;