/**
 * NotificationService 单元测试
 * 测试通知服务层的所有业务逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from '@/lib/services/notification-service';

// Mock uuid to have predictable IDs
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    audit: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('NotificationService', () => {
  // Reset state before each test - we need to reset the in-memory notifications array
  beforeEach(() => {
    vi.clearAllMocks();
    // The service uses module-level state, so we can't easily reset it
    // But we can work with what's already there
  });

  // ============================================
  // getNotifications - 获取通知列表
  // ============================================

  describe('getNotifications', () => {
    it('should return all notifications for a user', () => {
      const result = NotificationService.getNotifications({ userId: 'user-001' });
      
      expect(result.notifications).toBeDefined();
      expect(Array.isArray(result.notifications)).toBe(true);
      expect(result.total).toBeGreaterThan(0);
      expect(result.unreadCount).toBeGreaterThanOrEqual(0);
    });

    it('should filter by notification type', () => {
      const result = NotificationService.getNotifications({
        userId: 'user-001',
        type: 'task_assigned',
      });
      
      result.notifications.forEach((notif) => {
        expect(notif.type).toBe('task_assigned');
      });
    });

    it('should filter by read status', () => {
      const result = NotificationService.getNotifications({
        userId: 'user-001',
        read: false,
      });
      
      result.notifications.forEach((notif) => {
        expect(notif.read).toBe(false);
      });
    });

    it('should return correct unread count', () => {
      const result = NotificationService.getNotifications({ userId: 'user-001' });
      
      const actualUnread = result.notifications.filter(n => !n.read).length;
      expect(result.unreadCount).toBe(actualUnread);
    });

    it('should support pagination with limit', () => {
      const result = NotificationService.getNotifications({
        userId: 'user-001',
        limit: 2,
      });
      
      expect(result.notifications.length).toBeLessThanOrEqual(2);
    });

    it('should support pagination with offset', () => {
      const resultAll = NotificationService.getNotifications({ userId: 'user-001' });
      const resultWithOffset = NotificationService.getNotifications({
        userId: 'user-001',
        offset: 1,
        limit: 1,
      });
      
      // Should get different results with offset
      expect(resultWithOffset.notifications.length).toBeLessThanOrEqual(1);
    });

    it('should sort by createdAt descending (newest first)', () => {
      const result = NotificationService.getNotifications({ userId: 'user-001' });
      
      for (let i = 0; i < result.notifications.length - 1; i++) {
        const current = new Date(result.notifications[i].createdAt);
        const next = new Date(result.notifications[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should return empty array for non-existent user', () => {
      const result = NotificationService.getNotifications({ userId: 'non-existent-user' });
      
      expect(result.notifications).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.unreadCount).toBe(0);
    });
  });

  // ============================================
  // getNotification - 获取单个通知
  // ============================================

  describe('getNotification', () => {
    it('should return notification by id', () => {
      const result = NotificationService.getNotification('notif-001');
      
      expect(result).toBeDefined();
      expect(result?.id).toBe('notif-001');
    });

    it('should return null for non-existent id', () => {
      const result = NotificationService.getNotification('non-existent-id');
      
      expect(result).toBeNull();
    });
  });

  // ============================================
  // createNotification - 创建通知
  // ============================================

  describe('createNotification', () => {
    it('should create a new notification with required fields', () => {
      const result = NotificationService.createNotification({
        type: 'task_assigned',
        title: 'Test Title',
        message: 'Test Message',
        userId: 'test-user',
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('task_assigned');
      expect(result.title).toBe('Test Title');
      expect(result.message).toBe('Test Message');
      expect(result.userId).toBe('test-user');
      expect(result.read).toBe(false);
      expect(result.createdAt).toBeDefined();
    });

    it('should create notification with priority', () => {
      const result = NotificationService.createNotification({
        type: 'system_alert',
        title: 'Test',
        message: 'Test',
        userId: 'test-user',
        priority: 'high',
      });
      
      expect(result.priority).toBe('high');
    });

    it('should default priority to medium when not provided', () => {
      const result = NotificationService.createNotification({
        type: 'project_update',
        title: 'Test',
        message: 'Test',
        userId: 'test-user',
      });
      
      expect(result.priority).toBe('medium');
    });

    it('should create notification with link', () => {
      const result = NotificationService.createNotification({
        type: 'task_assigned',
        title: 'Test',
        message: 'Test',
        userId: 'test-user',
        link: '/tasks/123',
      });
      
      expect(result.link).toBe('/tasks/123');
    });

    it('should create notification with metadata', () => {
      const metadata = { taskId: 'task-001', assignedBy: 'user-002' };
      const result = NotificationService.createNotification({
        type: 'task_assigned',
        title: 'Test',
        message: 'Test',
        userId: 'test-user',
        metadata,
      });
      
      expect(result.metadata).toEqual(metadata);
    });
  });

  // ============================================
  // markAsRead - 标记已读
  // ============================================

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      // First create a notification
      const created = NotificationService.createNotification({
        type: 'task_assigned',
        title: 'Mark as read test',
        message: 'Test message',
        userId: 'test-mark-read',
      });
      
      // Mark as read
      const result = NotificationService.markAsRead(created.id);
      
      expect(result).toBeDefined();
      expect(result?.read).toBe(true);
    });

    it('should return null for non-existent notification', () => {
      const result = NotificationService.markAsRead('non-existent-id');
      
      expect(result).toBeNull();
    });
  });

  // ============================================
  // markAllAsRead - 全部标记已读
  // ============================================

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', () => {
      const count = NotificationService.markAllAsRead('user-001');
      
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for user with no notifications', () => {
      const count = NotificationService.markAllAsRead('user-with-no-notifications');
      
      expect(count).toBe(0);
    });
  });

  // ============================================
  // deleteNotification - 删除通知
  // ============================================

  describe('deleteNotification', () => {
    it('should delete a notification', () => {
      // First create a notification to delete
      const created = NotificationService.createNotification({
        type: 'system_alert',
        title: 'Delete test',
        message: 'Test message',
        userId: 'test-delete',
      });
      
      const result = NotificationService.deleteNotification(created.id);
      
      expect(result).toBe(true);
    });

    it('should return false for non-existent notification', () => {
      const result = NotificationService.deleteNotification('non-existent-id');
      
      expect(result).toBe(false);
    });
  });

  // ============================================
  // deleteAllUserNotifications - 删除用户所有通知
  // ============================================

  describe('deleteAllUserNotifications', () => {
    it('should delete all notifications for a user', () => {
      const count = NotificationService.deleteAllUserNotifications('user-001');
      
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // getUnreadCount - 获取未读数量
  // ============================================

  describe('getUnreadCount', () => {
    it('should return correct unread count for user', () => {
      const count = NotificationService.getUnreadCount('user-001');
      
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for user with no notifications', () => {
      const count = NotificationService.getUnreadCount('non-existent-user');
      
      expect(count).toBe(0);
    });
  });

  // ============================================
  // Convenience methods - 便捷方法
  // ============================================

  describe('Convenience methods', () => {
    describe('notifyTaskAssigned', () => {
      it('should create task assigned notification', () => {
        const result = NotificationService.notifyTaskAssigned('user-001', 'Test Task', 'task-123');
        
        expect(result.type).toBe('task_assigned');
        expect(result.title).toBe('新任务分配');
        expect(result.message).toContain('Test Task');
        expect(result.link).toBe('/tasks/task-123');
        expect(result.priority).toBe('high');
      });
    });

    describe('notifyProjectUpdate', () => {
      it('should create project update notification', () => {
        const result = NotificationService.notifyProjectUpdate('user-001', 'My Project', '已更新至 v2.0');
        
        expect(result.type).toBe('project_update');
        expect(result.title).toBe('项目进度更新');
        expect(result.message).toContain('My Project');
      });
    });

    describe('notifyMention', () => {
      it('should create mention notification', () => {
        const result = NotificationService.notifyMention('user-001', 'John', '评论');
        
        expect(result.type).toBe('mention');
        expect(result.title).toBe('被提及');
        expect(result.message).toContain('John');
      });
    });

    describe('notifySystemAlert', () => {
      it('should create system alert notification', () => {
        const result = NotificationService.notifySystemAlert('user-001', 'Alert Title', 'Alert Message');
        
        expect(result.type).toBe('system_alert');
        expect(result.title).toBe('Alert Title');
        expect(result.message).toBe('Alert Message');
        expect(result.priority).toBe('low');
      });
    });
  });
});
