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
import { getNotificationsStore } from '@/lib/store/notifications-indexed-store';
import { apiLogger } from '@/lib/logger';

/**
 * 通知服务类
 */
export class NotificationService {
  /**
   * 获取通知存储实例
   */
  private static getStore() {
    return getNotificationsStore();
  }

  /**
   * 获取用户通知列表
   */
  static getNotifications(params: NotificationQueryParams): NotificationListResponse {
    const store = this.getStore();
    let filtered = [...store.getAll()];

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
    const store = this.getStore();
    return store.find(n => n.id === id) || null;
  }

  /**
   * 创建新通知
   */
  static createNotification(body: CreateNotificationBody): Notification {
    const store = this.getStore();
    
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

    store.add(newNotification);

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
    const store = this.getStore();
    const notification = store.find(n => n.id === id);
    
    if (!notification) {
      return null;
    }

    store.update(n => n.id === id, n => ({ ...n, read: true }));

    apiLogger.audit('Notification marked as read', {
      notificationId: id,
    });

    return { ...notification, read: true };
  }

  /**
   * 标记所有通知为已读
   */
  static markAllAsRead(userId: string): number {
    const store = this.getStore();
    const userNotifications = store.filter(n => n.userId === userId && !n.read);
    
    userNotifications.forEach(n => {
      store.update(notif => notif.id === n.id, notif => ({ ...notif, read: true }));
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
    const store = this.getStore();
    const before = store.count();
    const deleted = store.delete(n => n.id === id);
    const after = store.count();

    if (deleted) {
      apiLogger.audit('Notification deleted', {
        notificationId: id,
      });
    }

    return before > after;
  }

  /**
   * 删除用户的所有通知
   */
  static deleteAllUserNotifications(userId: string): number {
    const store = this.getStore();
    const userNotifications = store.filter(n => n.userId === userId);
    
    userNotifications.forEach(n => {
      store.delete(notif => notif.id === n.id);
    });

    const deletedCount = userNotifications.length;

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
    const store = this.getStore();
    return store.filter(n => n.userId === userId && !n.read).length;
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
