// @ts-nocheck - Test file with complex type issues
/**
 * Notification Service Unit Tests
 *
 * Tests for the base NotificationService class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NotificationService,
  NotificationType,
  NotificationPriority,
  notificationService,
  type Notification,
  type NotificationFilter,
  type NotificationSubscription,
} from '../notification';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import the mocked logger for use in tests
const { logger } = await import('@/lib/logger');

// Mock Socket.IO
vi.mock('socket.io', () => {
  const mockSocket = {
    id: 'socket-123',
    join: vi.fn(),
    leave: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
  };

  const mockServer = {
    on: vi.fn(),
    to: vi.fn(() => ({
      emit: vi.fn(),
    })),
    emit: vi.fn(),
  };

  return {
    Server: vi.fn(() => mockServer),
  };
});

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    // Create fresh instance for each test
    service = new NotificationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should export a singleton instance', () => {
      expect(notificationService).toBeInstanceOf(NotificationService);
      expect(notificationService.getIO()).toBeNull();
    });

    it('should create consistent instances across multiple imports', () => {
      // Since ES modules maintain single instance per module,
      // importing the same module multiple times returns the same singleton
      expect(notificationService).toBeInstanceOf(NotificationService);
      expect(notificationService.getIO()).toBeNull();
    });
  });

  describe('Initialization', () => {
    it('should initialize with HTTP server', () => {
      const { Server } = require('socket.io');
      const mockHttpServer = { test: 'server' };

      service.initialize(mockHttpServer);

      expect(Server).toHaveBeenCalledWith(mockHttpServer, expect.objectContaining({
        cors: expect.objectContaining({
          origin: '*',
          methods: ['GET', 'POST'],
        }),
        transports: ['websocket', 'polling'],
      }));

      expect(service.getIO()).not.toBeNull();
    });

    it('should not initialize twice', () => {
      const mockHttpServer = { test: 'server' };
      const { logger } = require('@/lib/logger');

      service.initialize(mockHttpServer);
      service.initialize(mockHttpServer);

      expect(logger.warn).toHaveBeenCalledWith('[NotificationService] Already initialized');
    });
  });

  describe('Notification Creation', () => {
    it('should create notification with minimal required fields', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
      });

      expect(notificationId).toMatch(/^notif_\d+_[a-z0-9]+$/);

      const notifications = service.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe(notificationId);
      expect(notifications[0].read).toBe(false);
      expect(notifications[0].createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('should create notification with all fields', async () => {
      const notificationId = await service.notify({
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.HIGH,
        title: 'Task Assigned',
        message: 'You have been assigned a new task',
        userId: 'user-123',
        teamId: 'team-456',
        taskId: 'task-789',
        data: { assignee: 'John Doe', dueDate: '2024-12-31' },
        expiresAt: Date.now() + 3600000, // 1 hour
      });

      const notifications = service.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId).toBe('user-123');
      expect(notifications[0].teamId).toBe('team-456');
      expect(notifications[0].taskId).toBe('task-789');
      expect(notifications[0].data).toEqual({ assignee: 'John Doe', dueDate: '2024-12-31' });
      expect(notifications[0].expiresAt).toBeGreaterThan(Date.now());
    });

    it('should generate unique IDs for multiple notifications', async () => {
      const id1 = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test 1',
        message: 'Message 1',
      });

      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay

      const id2 = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test 2',
        message: 'Message 2',
      });

      expect(id1).not.toBe(id2);
    });
  });

  describe('Notification Filtering', () => {
    beforeEach(async () => {
      // Create test notifications
      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Info 1',
        message: 'Info message',
        userId: 'user-1',
        read: false,
      });

      await service.notify({
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        title: 'Warning 1',
        message: 'Warning message',
        userId: 'user-1',
        read: true,
      });

      await service.notify({
        type: NotificationType.ERROR,
        priority: NotificationPriority.URGENT,
        title: 'Error 1',
        message: 'Error message',
        userId: 'user-2',
        read: false,
        taskId: 'task-1',
      });
    });

    it('should filter by type', () => {
      const notifications = service.getNotifications({
        type: NotificationType.WARNING,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe(NotificationType.WARNING);
    });

    it('should filter by multiple types', () => {
      const notifications = service.getNotifications({
        type: [NotificationType.INFO, NotificationType.ERROR],
      });

      expect(notifications).toHaveLength(2);
      expect(notifications.every(n => n.type === NotificationType.INFO || n.type === NotificationType.ERROR)).toBe(true);
    });

    it('should filter by priority', () => {
      const notifications = service.getNotifications({
        priority: NotificationPriority.HIGH,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].priority).toBe(NotificationPriority.HIGH);
    });

    it('should filter by user ID', () => {
      const notifications = service.getNotifications({
        userId: 'user-1',
      });

      expect(notifications).toHaveLength(2);
      expect(notifications.every(n => n.userId === 'user-1')).toBe(true);
    });

    it('should filter by read status', () => {
      const unread = service.getNotifications({ read: false });
      const read = service.getNotifications({ read: true });

      expect(unread).toHaveLength(2);
      expect(read).toHaveLength(1);
    });

    it('should filter by task ID', () => {
      const notifications = service.getNotifications({
        taskId: 'task-1',
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].taskId).toBe('task-1');
    });

    it('should filter by time since', () => {
      const since = Date.now();
      const notifications = service.getNotifications({ since });

      // All notifications created after 'since' timestamp
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should apply multiple filters', () => {
      const notifications = service.getNotifications({
        userId: 'user-1',
        read: false,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId).toBe('user-1');
      expect(notifications[0].read).toBe(false);
    });

    it('should sort notifications by createdAt descending', async () => {
      const notifications = service.getNotifications();

      for (let i = 0; i < notifications.length - 1; i++) {
        expect(notifications[i].createdAt).toBeGreaterThanOrEqual(notifications[i + 1].createdAt);
      }
    });
  });

  describe('Notification History', () => {
    it('should maintain notification history', async () => {
      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
      });

      const history = service.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit history size', async () => {
      const limit = 5;
      for (let i = 0; i < 10; i++) {
        await service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: `Test ${i}`,
          message: `Message ${i}`,
        });
      }

      const history = service.getHistory(limit);
      expect(history.length).toBeLessThanOrEqual(limit);
    });

    it('should return history in reverse chronological order', async () => {
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const id = await service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: `Test ${i}`,
          message: `Message ${i}`,
        });
        const notification = service.getNotifications().find(n => n.id === id);
        if (notification) times.push(notification.createdAt);
      }

      const history = service.getHistory(5);
      for (let i = 0; i < history.length - 1; i++) {
        expect(history[i].createdAt).toBeGreaterThanOrEqual(history[i + 1].createdAt);
      }
    });

    it('should respect maxHistorySize', () => {
      // Create a service with smaller history
      const smallService = new NotificationService();
      // Access private property for testing
      const history = (smallService as any).notificationHistory;

      // Fill beyond limit
      for (let i = 0; i < 1100; i++) {
        (smallService as any).addToHistory({
          id: `notif-${i}`,
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: `Test ${i}`,
          message: `Message ${i}`,
          read: false,
          createdAt: Date.now() - i * 1000,
        });
      }

      expect(history.length).toBe(1000);
    });
  });

  describe('Mark as Read', () => {
    it('should mark notification as read', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
      });

      let notifications = service.getNotifications({ read: false });
      expect(notifications).toHaveLength(1);

      service.markAsRead(notificationId);

      notifications = service.getNotifications({ read: false });
      expect(notifications).toHaveLength(0);

      notifications = service.getNotifications({ read: true });
      expect(notifications).toHaveLength(1);
    });

    it('should handle marking non-existent notification', () => {
      expect(() => {
        service.markAsRead('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('Mark All as Read', () => {
    beforeEach(async () => {
      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test 1',
        message: 'Message 1',
        userId: 'user-1',
      });

      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test 2',
        message: 'Message 2',
        userId: 'user-1',
      });

      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test 3',
        message: 'Message 3',
        userId: 'user-2',
      });
    });

    it('should mark all notifications as read', () => {
      service.markAllAsRead();

      const unread = service.getNotifications({ read: false });
      expect(unread).toHaveLength(0);
    });

    it('should mark notifications for specific user as read', () => {
      service.markAllAsRead({ userId: 'user-1' });

      const unread = service.getNotifications({ read: false });
      expect(unread).toHaveLength(1);
      expect(unread[0].userId).toBe('user-2');
    });
  });

  describe('Unread Count', () => {
    beforeEach(async () => {
      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test 1',
        message: 'Message 1',
        userId: 'user-1',
      });

      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test 2',
        message: 'Message 2',
        userId: 'user-1',
      });

      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test 3',
        message: 'Message 3',
        userId: 'user-2',
      });
    });

    it('should count all unread notifications', () => {
      const count = service.getUnreadCount();
      expect(count).toBe(3);
    });

    it('should count unread notifications for specific user', () => {
      const count = service.getUnreadCount({ userId: 'user-1' });
      expect(count).toBe(2);
    });

    it('should update count after marking as read', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'New',
        message: 'New message',
      });

      let count = service.getUnreadCount();
      expect(count).toBe(4);

      service.markAsRead(notificationId);

      count = service.getUnreadCount();
      expect(count).toBe(3);
    });
  });

  describe('Delete Notification', () => {
    it('should delete notification', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
      });

      let notifications = service.getNotifications();
      expect(notifications).toHaveLength(1);

      service.deleteNotification(notificationId);

      notifications = service.getNotifications();
      expect(notifications).toHaveLength(0);
    });

    it('should handle deleting non-existent notification', () => {
      expect(() => {
        service.deleteNotification('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('Expired Notifications', () => {
    it('should not clean up non-expired notifications', async () => {
      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      });

      const cleaned = service.cleanupExpired();
      expect(cleaned).toBe(0);

      const notifications = service.getNotifications();
      expect(notifications).toHaveLength(1);
    });

    it('should clean up expired notifications', async () => {
      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      });

      const cleaned = service.cleanupExpired();
      expect(cleaned).toBe(1);

      const notifications = service.getNotifications();
      expect(notifications).toHaveLength(0);
    });

    it('should clean up multiple expired notifications', async () => {
      for (let i = 0; i < 5; i++) {
        await service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: `Test ${i}`,
          message: `Message ${i}`,
          expiresAt: Date.now() - 1000,
        });
      }

      for (let i = 0; i < 3; i++) {
        await service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: `Active ${i}`,
          message: `Active message ${i}`,
          expiresAt: Date.now() + 3600000,
        });
      }

      const cleaned = service.cleanupExpired();
      expect(cleaned).toBe(5);

      const notifications = service.getNotifications();
      expect(notifications).toHaveLength(3);
    });

    it('should handle notifications without expiry', async () => {
      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
      });

      const cleaned = service.cleanupExpired();
      expect(cleaned).toBe(0);

      const notifications = service.getNotifications();
      expect(notifications).toHaveLength(1);
    });
  });

  describe('Notification Formatting', () => {
    it('should properly format notification data', async () => {
      const complexData = {
        user: { id: '123', name: 'John' },
        items: ['item1', 'item2', 'item3'],
        count: 42,
        nested: { a: { b: { c: 'deep' } } },
      };

      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Complex Data',
        message: 'Notification with complex data',
        data: complexData,
      });

      const notifications = service.getNotifications();
      expect(notifications[0].data).toEqual(complexData);
    });

    it('should handle empty data', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'No Data',
        message: 'Notification without data',
      });

      const notifications = service.getNotifications();
      expect(notifications[0].data).toBeUndefined();
    });

    it('should handle special characters in title and message', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test <>&"\'',
        message: 'Message with émojis 🎉 and 特殊字符',
      });

      const notifications = service.getNotifications();
      expect(notifications[0].title).toBe('Test <>&"\'');
      expect(notifications[0].message).toBe('Message with émojis 🎉 and 特殊字符');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty notifications array', () => {
      const notifications = service.getNotifications();
      expect(notifications).toEqual([]);
    });

    it('should handle filter with no matches', async () => {
      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
        userId: 'user-1',
      });

      const notifications = service.getNotifications({
        userId: 'user-non-existent',
      });

      expect(notifications).toEqual([]);
    });
  });
});
