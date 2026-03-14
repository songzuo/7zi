/**
 * 通知服务单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '@/lib/services/notification-service';
import type { Notification, NotificationType } from '@/lib/types/notification-types';

describe('NotificationService', () => {
  // 重置通知列表
  const originalNotifications = [
    {
      id: 'notif-001',
      type: 'task_assigned' as NotificationType,
      title: '新任务分配',
      message: '您被分配了新任务"系统架构评审"，请及时查看。',
      read: false,
      createdAt: '2026-03-13T08:00:00Z',
      userId: 'user-001',
      priority: 'high' as const,
      link: '/tasks/task-003',
    },
    {
      id: 'notif-002',
      type: 'project_update' as NotificationType,
      title: '项目进度更新',
      message: '项目"AI 助手平台"已更新至 v2.0 版本。',
      read: true,
      createdAt: '2026-03-12T15:30:00Z',
      userId: 'user-001',
      priority: 'medium' as const,
      link: '/projects/proj-001',
    },
    {
      id: 'notif-003',
      type: 'mention' as NotificationType,
      title: '被提及',
      message: 'architect 在评论中提到了您。',
      read: false,
      createdAt: '2026-03-13T10:15:00Z',
      userId: 'user-001',
      priority: 'medium' as const,
      link: '/tasks/task-003',
    },
  ];

  describe('getNotifications', () => {
    it('应该返回所有用户通知', () => {
      const result = NotificationService.getNotifications({ userId: 'user-001' });
      expect(result.notifications).toBeDefined();
      expect(Array.isArray(result.notifications)).toBe(true);
    });

    it('应该正确计算未读数量', () => {
      const result = NotificationService.getNotifications({ userId: 'user-001' });
      const unreadCount = result.notifications.filter(n => !n.read).length;
      expect(result.unreadCount).toBe(unreadCount);
    });

    it('应该按创建时间降序排序', () => {
      const result = NotificationService.getNotifications({});
      if (result.notifications.length > 1) {
        const dates = result.notifications.map(n => new Date(n.createdAt).getTime());
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });

    it('应该支持按类型过滤', () => {
      const result = NotificationService.getNotifications({
        type: 'task_assigned'
      });
      result.notifications.forEach(n => {
        expect(n.type).toBe('task_assigned');
      });
    });

    it('应该支持按已读状态过滤', () => {
      const result = NotificationService.getNotifications({
        read: false
      });
      result.notifications.forEach(n => {
        expect(n.read).toBe(false);
      });
    });

    it('应该支持分页', () => {
      const result = NotificationService.getNotifications({
        offset: 0,
        limit: 2
      });
      expect(result.notifications.length).toBeLessThanOrEqual(2);
    });

    it('应该支持按用户ID过滤', () => {
      const result = NotificationService.getNotifications({ userId: 'user-001' });
      result.notifications.forEach(n => {
        expect(n.userId).toBe('user-001');
      });
    });
  });

  describe('getNotification', () => {
    it('应该返回指定ID的通知', () => {
      const notification = NotificationService.getNotification('notif-001');
      expect(notification).not.toBeNull();
      expect(notification?.id).toBe('notif-001');
    });

    it('不存在的ID应返回null', () => {
      const notification = NotificationService.getNotification('non-existent');
      expect(notification).toBeNull();
    });
  });

  describe('createNotification', () => {
    it('应该创建新通知', () => {
      const initialCount = NotificationService.getNotifications({}).total;
      
      const newNotification = NotificationService.createNotification({
        type: 'task_assigned',
        title: '测试任务',
        message: '这是一条测试消息',
        userId: 'user-test',
        priority: 'high',
        link: '/tasks/test-123'
      });

      expect(newNotification).toBeDefined();
      expect(newNotification.id).toBeDefined();
      expect(newNotification.title).toBe('测试任务');
      expect(newNotification.read).toBe(false);
      expect(newNotification.createdAt).toBeDefined();
    });

    it('应该设置默认优先级', () => {
      const notification = NotificationService.createNotification({
        type: 'system_alert',
        title: '测试',
        message: '测试消息',
        userId: 'user-test'
      });

      expect(notification.priority).toBe('medium');
    });

    it('应该支持可选的link和metadata', () => {
      const notification = NotificationService.createNotification({
        type: 'task_assigned',
        title: '测试',
        message: '测试消息',
        userId: 'user-test',
        link: '/tasks/123',
        metadata: { taskId: 'task-123' }
      });

      expect(notification.link).toBe('/tasks/123');
      expect(notification.metadata).toEqual({ taskId: 'task-123' });
    });
  });

  describe('markAsRead', () => {
    it('应该标记指定通知为已读', () => {
      // 创建一个新通知
      const notification = NotificationService.createNotification({
        type: 'task_assigned',
        title: '待读通知',
        message: '需要标记为已读',
        userId: 'user-001',
        priority: 'medium'
      });

      // 标记为已读
      const updated = NotificationService.markAsRead(notification.id);
      
      expect(updated).not.toBeNull();
      expect(updated?.read).toBe(true);
    });

    it('不存在的通知应返回null', () => {
      const result = NotificationService.markAsRead('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('应该标记用户所有通知为已读', () => {
      // 创建一些未读通知
      NotificationService.createNotification({
        type: 'task_assigned',
        title: '测试1',
        message: '测试消息1',
        userId: 'user-mark-all',
        priority: 'high'
      });
      
      NotificationService.createNotification({
        type: 'task_assigned',
        title: '测试2',
        message: '测试消息2',
        userId: 'user-mark-all',
        priority: 'high'
      });

      // 标记全部为已读
      const count = NotificationService.markAllAsRead('user-mark-all');
      expect(count).toBeGreaterThan(0);

      // 验证所有通知都已读
      const result = NotificationService.getNotifications({ userId: 'user-mark-all' });
      const unread = result.notifications.filter(n => !n.read);
      expect(unread.length).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('应该删除指定通知', () => {
      // 创建一个通知
      const notification = NotificationService.createNotification({
        type: 'system_alert',
        title: '待删除',
        message: '将被删除',
        userId: 'user-delete'
      });

      const result = NotificationService.deleteNotification(notification.id);
      expect(result).toBe(true);

      // 验证已删除
      const deleted = NotificationService.getNotification(notification.id);
      expect(deleted).toBeNull();
    });

    it('不存在的通知应返回false', () => {
      const result = NotificationService.deleteNotification('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('deleteAllUserNotifications', () => {
    it('应该删除用户所有通知', () => {
      // 创建通知
      NotificationService.createNotification({
        type: 'task_assigned',
        title: '测试',
        message: '测试',
        userId: 'user-delete-all'
      });

      const deletedCount = NotificationService.deleteAllUserNotifications('user-delete-all');
      expect(deletedCount).toBeGreaterThan(0);

      // 验证已删除
      const result = NotificationService.getNotifications({ userId: 'user-delete-all' });
      expect(result.notifications.length).toBe(0);
    });
  });

  describe('getUnreadCount', () => {
    it('应该返回用户未读通知数量', () => {
      // 创建新通知（未读）
      NotificationService.createNotification({
        type: 'task_assigned',
        title: '未读测试',
        message: '测试未读数量',
        userId: 'user-unread'
      });

      const count = NotificationService.getUnreadCount('user-unread');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('便捷方法', () => {
    it('notifyTaskAssigned应该创建正确类型的通知', () => {
      const notification = NotificationService.notifyTaskAssigned(
        'user-001',
        '系统设计',
        'task-123'
      );

      expect(notification.type).toBe('task_assigned');
      expect(notification.priority).toBe('high');
      expect(notification.link).toBe('/tasks/task-123');
    });

    it('notifyProjectUpdate应该创建正确类型的通知', () => {
      const notification = NotificationService.notifyProjectUpdate(
        'user-001',
        'AI助手',
        '已更新至 v2.0'
      );

      expect(notification.type).toBe('project_update');
      expect(notification.message).toContain('AI助手');
    });

    it('notifyMention应该创建正确类型的通知', () => {
      const notification = NotificationService.notifyMention(
        'user-001',
        '张三',
        '任务评论'
      );

      expect(notification.type).toBe('mention');
      expect(notification.message).toContain('张三');
    });

    it('notifySystemAlert应该创建正确类型的通知', () => {
      const notification = NotificationService.notifySystemAlert(
        'user-001',
        '系统通知',
        '这是一条系统消息'
      );

      expect(notification.type).toBe('system_alert');
      expect(notification.title).toBe('系统通知');
      expect(notification.priority).toBe('low');
    });
  });
});
