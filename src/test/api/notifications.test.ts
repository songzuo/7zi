/**
 * 通知系统测试
 * @module test/api/notifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from '@/lib/services/notification-service';

// Mock data
const mockNotification = {
  id: 'notif-test-001',
  type: 'task_assigned' as const,
  title: '测试通知',
  message: '这是一条测试通知',
  userId: 'user-001',
  read: false,
  priority: 'normal',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('NotificationService', () => {
  beforeEach(() => {
    // 每个测试前清理通知
    const result = NotificationService.getNotifications({ userId: 'user-001' });
    const notifications = result.notifications;
    notifications.forEach(n => {
      try {
        NotificationService.deleteNotification(n.id);
      } catch (e) {
        // 忽略删除错误
      }
    });
  });

  describe('createNotification', () => {
    it('应该成功创建通知', () => {
      const notification = NotificationService.createNotification({
        type: 'task_assigned',
        title: '新任务分配',
        message: '您被分配了新任务',
        userId: 'user-001'
      });

      expect(notification).toBeDefined();
      expect(notification.id).toBeDefined();
      expect(notification.type).toBe('task_assigned');
      expect(notification.title).toBe('新任务分配');
      expect(notification.userId).toBe('user-001');
      expect(notification.read).toBe(false);
    });

    it('应该支持设置优先级', () => {
      const notification = NotificationService.createNotification({
        type: 'system_alert',
        title: '高优先级通知',
        message: '这是一个高优先级通知',
        userId: 'user-001',
        priority: 'high'
      });

      expect(notification.priority).toBe('high');
    });

    it('应该支持添加链接', () => {
      const notification = NotificationService.createNotification({
        type: 'mention',
        title: '被提及',
        message: '您在评论中被提及',
        userId: 'user-001',
        link: '/tasks/task-001'
      });

      expect(notification.link).toBe('/tasks/task-001');
    });
  });

  describe('getNotifications', () => {
    it('应该获取用户的所有通知', () => {
      NotificationService.createNotification({
        type: 'task_assigned',
        title: '任务1',
        message: '消息1',
        userId: 'user-001'
      });
      NotificationService.createNotification({
        type: 'project_update',
        title: '任务2',
        message: '消息2',
        userId: 'user-001'
      });

      const result = NotificationService.getNotifications({ userId: 'user-001' });

      expect(result.notifications.length).toBeGreaterThanOrEqual(2);
      expect(result.notifications.every(n => n.userId === 'user-001')).toBe(true);
    });

    it('应该支持按类型筛选', () => {
      NotificationService.createNotification({
        type: 'task_assigned',
        title: '任务通知',
        message: '消息',
        userId: 'user-002'
      });
      NotificationService.createNotification({
        type: 'system_alert',
        title: '系统通知',
        message: '消息',
        userId: 'user-002'
      });

      const result = NotificationService.getNotifications({
        userId: 'user-002',
        type: 'task_assigned'
      });

      expect(result.notifications.every(n => n.type === 'task_assigned')).toBe(true);
    });

    it('应该支持按已读状态筛选', () => {
      const notification = NotificationService.createNotification({
        type: 'mention',
        title: '提及通知',
        message: '消息',
        userId: 'user-003'
      });

      NotificationService.markAsRead(notification.id);

      const result = NotificationService.getNotifications({
        userId: 'user-003',
        read: false
      });

      expect(result.notifications.every(n => n.read === false)).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('应该成功标记通知为已读', () => {
      const notification = NotificationService.createNotification({
        type: 'task_assigned',
        title: '测试',
        message: '消息',
        userId: 'user-004'
      });

      expect(notification.read).toBe(false);

      const updated = NotificationService.markAsRead(notification.id);

      expect(updated.read).toBe(true);
    });

    it('应该返回 null 当通知不存在', () => {
      const result = NotificationService.markAsRead('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('deleteNotification', () => {
    it('应该成功删除通知', () => {
      const notification = NotificationService.createNotification({
        type: 'project_update',
        title: '待删除',
        message: '消息',
        userId: 'user-005'
      });

      const deleted = NotificationService.deleteNotification(notification.id);

      expect(deleted).toBe(true);

      const found = NotificationService.getNotification(notification.id);
      expect(found).toBeNull();
    });

    it('应该返回 false 当通知不存在', () => {
      const result = NotificationService.deleteNotification('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('应该标记用户所有通知为已读', () => {
      // 创建多条未读通知
      NotificationService.createNotification({
        type: 'task_assigned',
        title: '任务1',
        message: '消息1',
        userId: 'user-006'
      });
      NotificationService.createNotification({
        type: 'task_assigned',
        title: '任务2',
        message: '消息2',
        userId: 'user-006'
      });

      const count = NotificationService.markAllAsRead('user-006');

      expect(count).toBeGreaterThanOrEqual(2);

      const notifications = NotificationService.getNotifications({
        userId: 'user-006',
        read: false
      });
      
      expect(notifications.notifications.length).toBe(0);
    });
  });
});
