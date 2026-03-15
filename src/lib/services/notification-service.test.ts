/**
 * 通知服务测试
 * @module services/notification-service.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from './notification-service';
import { resetNotificationsStore, getNotificationsStore } from '@/lib/store/notifications-store';
import type { Notification, CreateNotificationBody } from '@/lib/types/notification-types';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    audit: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('NotificationService', () => {
  const testUserId = 'user-test-001';
  const otherUserId = 'user-test-002';

  beforeEach(() => {
    // Reset store before each test
    resetNotificationsStore();
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a new notification with required fields', () => {
      const body: CreateNotificationBody = {
        type: 'task_assigned',
        title: 'Test Notification',
        message: 'This is a test notification',
        userId: testUserId,
      };

      const notification = NotificationService.createNotification(body);

      expect(notification).toBeDefined();
      expect(notification.id).toMatch(/^notif-/);
      expect(notification.type).toBe('task_assigned');
      expect(notification.title).toBe('Test Notification');
      expect(notification.message).toBe('This is a test notification');
      expect(notification.userId).toBe(testUserId);
      expect(notification.read).toBe(false);
      expect(notification.createdAt).toBeDefined();
      expect(notification.priority).toBe('medium'); // default priority
    });

    it('should create a notification with optional fields', () => {
      const body: CreateNotificationBody = {
        type: 'project_update',
        title: 'Project Update',
        message: 'Project status changed',
        userId: testUserId,
        priority: 'high',
        link: '/projects/proj-001',
        metadata: { projectId: 'proj-001', status: 'completed' },
      };

      const notification = NotificationService.createNotification(body);

      expect(notification.priority).toBe('high');
      expect(notification.link).toBe('/projects/proj-001');
      expect(notification.metadata).toEqual({ projectId: 'proj-001', status: 'completed' });
    });

    it('should create notification with different types', () => {
      const types: Array<CreateNotificationBody['type']> = [
        'task_assigned',
        'project_update',
        'mention',
        'system_alert',
      ];

      types.forEach(type => {
        const notification = NotificationService.createNotification({
          type,
          title: `${type} notification`,
          message: `Message for ${type}`,
          userId: testUserId,
        });
        expect(notification.type).toBe(type);
      });
    });
  });

  describe('getNotifications', () => {
    beforeEach(() => {
      // Create some test notifications
      NotificationService.createNotification({
        type: 'task_assigned',
        title: 'Task 1',
        message: 'Task 1 message',
        userId: testUserId,
        priority: 'high',
      });
      NotificationService.createNotification({
        type: 'project_update',
        title: 'Project 1',
        message: 'Project 1 message',
        userId: testUserId,
        priority: 'medium',
      });
      NotificationService.createNotification({
        type: 'system_alert',
        title: 'System Alert',
        message: 'System alert message',
        userId: otherUserId,
        priority: 'low',
      });
    });

    it('should get all notifications for a user', () => {
      const result = NotificationService.getNotifications({ userId: testUserId });

      expect(result.notifications).toBeDefined();
      expect(result.total).toBe(2);
      expect(result.notifications.every(n => n.userId === testUserId)).toBe(true);
    });

    it('should filter by notification type', () => {
      const result = NotificationService.getNotifications({
        userId: testUserId,
        type: 'task_assigned',
      });

      expect(result.total).toBe(1);
      expect(result.notifications[0].type).toBe('task_assigned');
    });

    it('should filter by read status', () => {
      // Mark one as read
      const all = NotificationService.getNotifications({ userId: testUserId });
      NotificationService.markAsRead(all.notifications[0].id);

      const unreadResult = NotificationService.getNotifications({
        userId: testUserId,
        read: false,
      });

      expect(unreadResult.total).toBe(1);
      expect(unreadResult.notifications[0].read).toBe(false);
    });

    it('should return unread count correctly', () => {
      const result = NotificationService.getNotifications({ userId: testUserId });

      expect(result.unreadCount).toBe(2);

      // Mark one as read
      NotificationService.markAsRead(result.notifications[0].id);

      const updatedResult = NotificationService.getNotifications({ userId: testUserId });
      expect(updatedResult.unreadCount).toBe(1);
    });

    it('should support pagination with offset and limit', () => {
      // Create more notifications
      for (let i = 0; i < 5; i++) {
        NotificationService.createNotification({
          type: 'system_alert',
          title: `Alert ${i}`,
          message: `Message ${i}`,
          userId: testUserId,
        });
      }

      const page1 = NotificationService.getNotifications({
        userId: testUserId,
        limit: 3,
        offset: 0,
      });

      const page2 = NotificationService.getNotifications({
        userId: testUserId,
        limit: 3,
        offset: 3,
      });

      expect(page1.notifications.length).toBe(3);
      expect(page2.notifications.length).toBeGreaterThanOrEqual(1);
      expect(page1.notifications[0].id).not.toBe(page2.notifications[0]?.id);
    });

    it('should return notifications sorted by createdAt (newest first)', () => {
      const result = NotificationService.getNotifications({ userId: testUserId });

      for (let i = 0; i < result.notifications.length - 1; i++) {
        const current = new Date(result.notifications[i].createdAt).getTime();
        const next = new Date(result.notifications[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('getNotification', () => {
    it('should return notification by id', () => {
      const created = NotificationService.createNotification({
        type: 'task_assigned',
        title: 'Test Task',
        message: 'Test message',
        userId: testUserId,
      });

      const found = NotificationService.getNotification(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Test Task');
    });

    it('should return null for non-existent notification', () => {
      const found = NotificationService.getNotification('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      const notification = NotificationService.createNotification({
        type: 'task_assigned',
        title: 'Test',
        message: 'Test message',
        userId: testUserId,
      });

      expect(notification.read).toBe(false);

      const updated = NotificationService.markAsRead(notification.id);

      expect(updated).toBeDefined();
      expect(updated?.read).toBe(true);
    });

    it('should return null for non-existent notification', () => {
      const result = NotificationService.markAsRead('non-existent-id');

      expect(result).toBeNull();
    });

    it('should persist read status', () => {
      const notification = NotificationService.createNotification({
        type: 'task_assigned',
        title: 'Test',
        message: 'Test message',
        userId: testUserId,
      });

      NotificationService.markAsRead(notification.id);

      const found = NotificationService.getNotification(notification.id);
      expect(found?.read).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', () => {
      // Create multiple notifications
      for (let i = 0; i < 3; i++) {
        NotificationService.createNotification({
          type: 'system_alert',
          title: `Alert ${i}`,
          message: `Message ${i}`,
          userId: testUserId,
        });
      }

      const count = NotificationService.markAllAsRead(testUserId);

      expect(count).toBe(3);

      const result = NotificationService.getNotifications({ userId: testUserId });
      expect(result.unreadCount).toBe(0);
      expect(result.notifications.every(n => n.read === true)).toBe(true);
    });

    it('should only affect specified user notifications', () => {
      // Create notifications for both users
      NotificationService.createNotification({
        type: 'task_assigned',
        title: 'Task for user 1',
        message: 'Message',
        userId: testUserId,
      });
      NotificationService.createNotification({
        type: 'task_assigned',
        title: 'Task for user 2',
        message: 'Message',
        userId: otherUserId,
      });

      NotificationService.markAllAsRead(testUserId);

      const user1Result = NotificationService.getNotifications({ userId: testUserId });
      const user2Result = NotificationService.getNotifications({ userId: otherUserId });

      expect(user1Result.unreadCount).toBe(0);
      expect(user2Result.unreadCount).toBe(1);
    });

    it('should return 0 if no unread notifications', () => {
      const count = NotificationService.markAllAsRead('user-without-notifications');
      expect(count).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification by id', () => {
      const notification = NotificationService.createNotification({
        type: 'task_assigned',
        title: 'To Delete',
        message: 'This will be deleted',
        userId: testUserId,
      });

      const deleted = NotificationService.deleteNotification(notification.id);

      expect(deleted).toBe(true);

      const found = NotificationService.getNotification(notification.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent notification', () => {
      const deleted = NotificationService.deleteNotification('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('deleteAllUserNotifications', () => {
    it('should delete all notifications for a user', () => {
      // Create notifications for user
      for (let i = 0; i < 3; i++) {
        NotificationService.createNotification({
          type: 'system_alert',
          title: `Alert ${i}`,
          message: `Message ${i}`,
          userId: testUserId,
        });
      }
      // Create one for other user
      NotificationService.createNotification({
        type: 'system_alert',
        title: 'Other user alert',
        message: 'Message',
        userId: otherUserId,
      });

      const deletedCount = NotificationService.deleteAllUserNotifications(testUserId);

      expect(deletedCount).toBe(3);

      const result = NotificationService.getNotifications({ userId: testUserId });
      expect(result.total).toBe(0);

      const otherResult = NotificationService.getNotifications({ userId: otherUserId });
      expect(otherResult.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', () => {
      // Create notifications
      for (let i = 0; i < 3; i++) {
        NotificationService.createNotification({
          type: 'system_alert',
          title: `Alert ${i}`,
          message: `Message ${i}`,
          userId: testUserId,
        });
      }

      const count = NotificationService.getUnreadCount(testUserId);
      expect(count).toBe(3);

      // Mark one as read
      const result = NotificationService.getNotifications({ userId: testUserId });
      NotificationService.markAsRead(result.notifications[0].id);

      const updatedCount = NotificationService.getUnreadCount(testUserId);
      expect(updatedCount).toBe(2);
    });

    it('should return 0 for user with no notifications', () => {
      const count = NotificationService.getUnreadCount('user-without-notifications');
      expect(count).toBe(0);
    });
  });

  describe('Convenience methods', () => {
    describe('notifyTaskAssigned', () => {
      it('should create task_assigned notification', () => {
        const notification = NotificationService.notifyTaskAssigned(
          testUserId,
          'New Task Title',
          'task-123'
        );

        expect(notification.type).toBe('task_assigned');
        expect(notification.title).toBe('新任务分配');
        expect(notification.message).toContain('New Task Title');
        expect(notification.priority).toBe('high');
        expect(notification.link).toBe('/tasks/task-123');
        expect(notification.userId).toBe(testUserId);
      });
    });

    describe('notifyProjectUpdate', () => {
      it('should create project_update notification', () => {
        const notification = NotificationService.notifyProjectUpdate(
          testUserId,
          'Project Alpha',
          '已完成里程碑 1'
        );

        expect(notification.type).toBe('project_update');
        expect(notification.title).toBe('项目进度更新');
        expect(notification.message).toContain('Project Alpha');
        expect(notification.message).toContain('已完成里程碑 1');
        expect(notification.priority).toBe('medium');
      });
    });

    describe('notifyMention', () => {
      it('should create mention notification', () => {
        const notification = NotificationService.notifyMention(
          testUserId,
          'John Doe',
          '任务评论'
        );

        expect(notification.type).toBe('mention');
        expect(notification.title).toBe('被提及');
        expect(notification.message).toContain('John Doe');
        expect(notification.message).toContain('任务评论');
        expect(notification.priority).toBe('medium');
      });
    });

    describe('notifySystemAlert', () => {
      it('should create system_alert notification', () => {
        const notification = NotificationService.notifySystemAlert(
          testUserId,
          '系统维护',
          '系统将于今晚维护'
        );

        expect(notification.type).toBe('system_alert');
        expect(notification.title).toBe('系统维护');
        expect(notification.message).toBe('系统将于今晚维护');
        expect(notification.priority).toBe('low');
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty notification list', () => {
      // Clear all notifications first
      getNotificationsStore().clear();

      const result = NotificationService.getNotifications({ userId: testUserId });

      expect(result.notifications).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.unreadCount).toBe(0);
    });

    it('should handle long title and message', () => {
      const longTitle = 'A'.repeat(200);
      const longMessage = 'B'.repeat(1000);

      const notification = NotificationService.createNotification({
        type: 'system_alert',
        title: longTitle,
        message: longMessage,
        userId: testUserId,
      });

      expect(notification.title).toBe(longTitle);
      expect(notification.message).toBe(longMessage);
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Special chars: <script>alert("xss")</script> & "quotes" \'apostrophe\'';

      const notification = NotificationService.createNotification({
        type: 'system_alert',
        title: 'Special Chars Test',
        message: specialMessage,
        userId: testUserId,
      });

      expect(notification.message).toBe(specialMessage);
    });

    it('should handle concurrent reads and writes', () => {
      // Create multiple notifications concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(
          NotificationService.createNotification({
            type: 'system_alert',
            title: `Concurrent ${i}`,
            message: `Message ${i}`,
            userId: testUserId,
          })
        )
      );

      return Promise.all(promises).then(notifications => {
        expect(notifications).toHaveLength(10);
        expect(new Set(notifications.map(n => n.id)).size).toBe(10);
      });
    });
  });
});
