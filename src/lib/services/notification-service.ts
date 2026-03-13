/**
 * 通知服务
 * 处理通知的业务逻辑
 * 
 * @module services/notification-service
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Notification,
  NotificationType,
  CreateNotificationBody,
  NotificationQueryParams,
  NotificationListResponse,
} from '@/lib/types/notification-types';
import { apiLogger } from '@/lib/logger';

// 内存存储 (生产环境应使用数据库)
const notifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'task_assigned',
    title: '新任务分配',
    message: '您被分配了新任务"系统架构评审"，请及时查看。',
    read: false,
    createdAt: '2026-03-13T08:00:00Z',
    userId: 'user-001',
    priority: 'high',
    link: '/tasks/task-003',
  },
  {
    id: 'notif-002',
    type: 'project_update',
    title: '项目进度更新',
    message: '项目"AI 助手平台"已更新至 v2.0 版本。',
    read: true,
    createdAt: '2026-03-12T15:30:00Z',
    userId: 'user-001',
    priority: 'medium',
    link: '/projects/proj-001',
  },
  {
    id: 'notif-003',
    type: 'mention',
    title: '被提及',
    message: 'architect 在评论中提到了您。',
    read: false,
    createdAt: '2026-03-13T10:15:00Z',
    userId: 'user-001',
    priority: 'medium',
    link: '/tasks/task-003',
  },
  {
    id: 'notif-004',
    type: 'system_alert',
    title: '系统维护通知',
    message: '系统将于 2026-03-14 02:00 进行维护，预计持续 30 分钟。',
    read: true,
    createdAt: '2026-03-13T09:00:00Z',
    userId: 'user-001',
    priority: 'low',
  },
];

/**
 * 通知服务类
 */
export class NotificationService {
  /**
   * 获取用户通知列表
   */
  static getNotifications(params: NotificationQueryParams): NotificationListResponse {
    let filtered = [...notifications];

    // 按用户ID过滤
    if (params.userId) {
      filtered = filtered.filter(n => n.userId === params.userId);
    }

    // 按类型过滤
    if (params.type) {
      filtered = filtered.filter(n => n.type === params.type);
    }

    // 按已读状态过滤
    if (params.read !== undefined) {
      filtered = filtered.filter(n => n.read === params.read);
    }

    // 按创建时间排序 (最新的在前)
    filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 计算未读数量
    const unreadCount = filtered.filter(n => !n.read).length;

    // 分页
    const offset = params.offset || 0;
    const limit = params.limit || 50;
    const paginatedNotifications = filtered.slice(offset, offset + limit);

    return {
      notifications: paginatedNotifications,
      total: filtered.length,
      unreadCount,
    };
  }

  /**
   * 获取单个通知
   */
  static getNotification(id: string): Notification | null {
    return notifications.find(n => n.id === id) || null;
  }

  /**
   * 创建新通知
   */
  static createNotification(body: CreateNotificationBody): Notification {
    const newNotification: Notification = {
      id: `notif-${uuidv4().split('-')[0]}`,
      type: body.type,
      title: body.title,
      message: body.message,
      read: false,
      createdAt: new Date().toISOString(),
      userId: body.userId,
      priority: body.priority || 'medium',
      link: body.link,
      metadata: body.metadata,
    };

    notifications.push(newNotification);

    apiLogger.audit('Notification created', {
      notificationId: newNotification.id,
      type: newNotification.type,
      userId: newNotification.userId,
    });

    return newNotification;
  }

  /**
   * 标记通知为已读
   */
  static markAsRead(id: string): Notification | null {
    const notification = notifications.find(n => n.id === id);
    
    if (!notification) {
      return null;
    }

    notification.read = true;

    apiLogger.audit('Notification marked as read', {
      notificationId: id,
    });

    return notification;
  }

  /**
   * 标记所有通知为已读
   */
  static markAllAsRead(userId: string): number {
    const userNotifications = notifications.filter(n => n.userId === userId && !n.read);
    userNotifications.forEach(n => {
      n.read = true;
    });

    apiLogger.audit('All notifications marked as read', {
      userId,
      count: userNotifications.length,
    });

    return userNotifications.length;
  }

  /**
   * 删除通知
   */
  static deleteNotification(id: string): boolean {
    const index = notifications.findIndex(n => n.id === id);
    
    if (index === -1) {
      return false;
    }

    notifications.splice(index, 1);

    apiLogger.audit('Notification deleted', {
      notificationId: id,
    });

    return true;
  }

  /**
   * 删除用户的所有通知
   */
  static deleteAllUserNotifications(userId: string): number {
    const initialLength = notifications.length;
    const userNotifications = notifications.filter(n => n.userId === userId);
    
    userNotifications.forEach(n => {
      const index = notifications.findIndex(notif => notif.id === n.id);
      if (index !== -1) {
        notifications.splice(index, 1);
      }
    });

    const deletedCount = initialLength - notifications.length;

    apiLogger.audit('All user notifications deleted', {
      userId,
      count: deletedCount,
    });

    return deletedCount;
  }

  /**
   * 获取用户未读通知数量
   */
  static getUnreadCount(userId: string): number {
    return notifications.filter(n => n.userId === userId && !n.read).length;
  }

  /**
   * 根据类型创建通知的便捷方法
   */
  static notifyTaskAssigned(userId: string, taskTitle: string, taskId: string): Notification {
    return this.createNotification({
      type: 'task_assigned',
      title: '新任务分配',
      message: `您被分配了新任务"${taskTitle}"，请及时查看。`,
      userId,
      priority: 'high',
      link: `/tasks/${taskId}`,
    });
  }

  static notifyProjectUpdate(userId: string, projectName: string, updateInfo: string): Notification {
    return this.createNotification({
      type: 'project_update',
      title: '项目进度更新',
      message: `项目"${projectName}"${updateInfo}。`,
      userId,
      priority: 'medium',
    });
  }

  static notifyMention(userId: string, mentionedBy: string, context: string): Notification {
    return this.createNotification({
      type: 'mention',
      title: '被提及',
      message: `${mentionedBy} 在${context}中提到了您。`,
      userId,
      priority: 'medium',
    });
  }

  static notifySystemAlert(userId: string, title: string, message: string): Notification {
    return this.createNotification({
      type: 'system_alert',
      title,
      message,
      userId,
      priority: 'low',
    });
  }
}

export default NotificationService;
