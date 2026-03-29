/**
 * Notification Service Edge Cases Tests
 * 
 * Edge cases covered:
 * - Empty/null/undefined inputs
 * - Invalid data types
 * - Extremely long strings
 * - Special characters and Unicode
 * - Concurrent operations
 * - Memory limits
 * - Error recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NotificationService,
  NotificationType,
  NotificationPriority,
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

// Mock Socket.IO
vi.mock('socket.io', () => ({
  Server: vi.fn(() => ({
    on: vi.fn(),
    to: vi.fn(() => ({ emit: vi.fn() })),
    emit: vi.fn(),
  })),
}));

describe('NotificationService Edge Cases', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Null/Undefined Input Handling', () => {
    it('should handle null title gracefully', async () => {
      await expect(
        service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: null as any,
          message: 'Test message',
        })
      ).resolves.toBeDefined();
    });

    it('should handle undefined message gracefully', async () => {
      await expect(
        service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: 'Test',
          message: undefined as any,
        })
      ).resolves.toBeDefined();
    });

    it('should handle null data field', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
        data: null as any,
      });

      expect(notificationId).toBeDefined();
      const notifications = service.getNotifications();
      expect(notifications[0].data).toBeNull();
    });

    it('should handle undefined userId', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
        userId: undefined as any,
      });

      expect(notificationId).toBeDefined();
    });

    it('should handle empty string title', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: '',
        message: 'Message',
      });

      expect(notificationId).toBeDefined();
      const notifications = service.getNotifications();
      expect(notifications[0].title).toBe('');
    });
  });

  describe('Extremely Long Strings', () => {
    it('should handle very long title (10000+ chars)', async () => {
      const longTitle = 'A'.repeat(10000);
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: longTitle,
        message: 'Message',
      });

      expect(notificationId).toBeDefined();
      const notifications = service.getNotifications();
      expect(notifications[0].title).toBe(longTitle);
    });

    it('should handle very long message (50000+ chars)', async () => {
      const longMessage = 'B'.repeat(50000);
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: longMessage,
      });

      expect(notificationId).toBeDefined();
      const notifications = service.getNotifications();
      expect(notifications[0].message).toBe(longMessage);
    });

    it('should handle long userId string', async () => {
      const longUserId = 'user-'.repeat(1000);
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
        userId: longUserId,
      });

      expect(notificationId).toBeDefined();
    });
  });

  describe('Special Characters and Unicode', () => {
    it('should handle emojis in title and message', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 🎉🎊🎁',
        message: 'Message with emojis 🚀💻✨',
      });

      expect(notificationId).toBeDefined();
      const notifications = service.getNotifications();
      expect(notifications[0].title).toContain('🎉');
      expect(notifications[0].message).toContain('🚀');
    });

    it('should handle Chinese characters', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: '测试通知',
        message: '这是一条测试消息',
      });

      expect(notificationId).toBeDefined();
      const notifications = service.getNotifications();
      expect(notifications[0].title).toBe('测试通知');
    });

    it('should handle RTL text (Arabic/Hebrew)', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'مرحبا بالعالم',
        message: 'שלום עולם',
      });

      expect(notificationId).toBeDefined();
    });

    it('should handle HTML-like content', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: '<script>alert("xss")</script>',
        message: '<div onclick="evil()">Click me</div>',
      });

      expect(notificationId).toBeDefined();
      const notifications = service.getNotifications();
      expect(notifications[0].title).toContain('<script>');
    });

    it('should handle SQL injection-like content', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: "'; DROP TABLE notifications; --",
        message: "1' OR '1'='1",
      });

      expect(notificationId).toBeDefined();
    });

    it('should handle null bytes and control characters', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test\x00Null\x01Byte',
        message: 'Message\twith\ttabs\nand\nnewlines',
      });

      expect(notificationId).toBeDefined();
    });
  });

  describe('Invalid Data Types', () => {
    it('should handle numeric title', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 12345 as any,
        message: 'Message',
      });

      expect(notificationId).toBeDefined();
    });

    it('should handle object as title', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: { nested: 'object' } as any,
        message: 'Message',
      });

      expect(notificationId).toBeDefined();
    });

    it('should handle array as message', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: ['item1', 'item2'] as any,
      });

      expect(notificationId).toBeDefined();
    });

    it('should handle invalid notification type', async () => {
      const notificationId = await service.notify({
        type: 'INVALID_TYPE' as any,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
      });

      expect(notificationId).toBeDefined();
    });

    it('should handle invalid priority', async () => {
      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: 'ULTRA_HIGH' as any,
        title: 'Test',
        message: 'Message',
      });

      expect(notificationId).toBeDefined();
    });

    it('should handle circular reference in data', async () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
        data: circularData,
      });

      // Should either handle gracefully or throw
      expect(notificationId).toBeDefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent notification creation', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: `Concurrent ${i}`,
          message: `Message ${i}`,
        })
      );

      const ids = await Promise.all(promises);
      expect(ids).toHaveLength(100);
      expect(new Set(ids).size).toBe(100); // All unique IDs
    });

    it('should handle concurrent mark as read operations', async () => {
      // Create multiple notifications
      const ids = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          service.notify({
            type: NotificationType.INFO,
            priority: NotificationPriority.LOW,
            title: `Test ${i}`,
            message: `Message ${i}`,
          })
        )
      );

      // Mark all as read concurrently
      ids.forEach((id) => service.markAsRead(id));

      const unread = service.getNotifications({ read: false });
      expect(unread).toHaveLength(0);
    });

    it('should handle concurrent read and write operations', async () => {
      const operations = [];

      // Start multiple read and write operations
      for (let i = 0; i < 50; i++) {
        operations.push(
          service.notify({
            type: NotificationType.INFO,
            priority: NotificationPriority.LOW,
            title: `Test ${i}`,
            message: `Message ${i}`,
          })
        );
        operations.push(
          new Promise((resolve) => {
            service.getNotifications();
            resolve(null);
          })
        );
      }

      await Promise.all(operations);
      // Should complete without errors
    });
  });

  describe('Memory Limits', () => {
    it('should handle large number of notifications', async () => {
      const count = 1000;
      for (let i = 0; i < count; i++) {
        await service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: `Notification ${i}`,
          message: `Message ${i}`,
        });
      }

      const notifications = service.getNotifications();
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should handle large data payload', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          nested: {
            level1: {
              level2: {
                level3: Array.from({ length: 100 }, (_, j) => `deep-${j}`),
              },
            },
          },
        })),
      };

      const notificationId = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Large Data',
        message: 'Message',
        data: largeData,
      });

      expect(notificationId).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from markAsRead on non-existent notification', () => {
      expect(() => {
        service.markAsRead('non-existent-id');
      }).not.toThrow();
    });

    it('should recover from delete on non-existent notification', () => {
      expect(() => {
        service.deleteNotification('non-existent-id');
      }).not.toThrow();
    });

    it('should handle multiple delete of same notification', async () => {
      const id = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
      });

      service.deleteNotification(id);
      expect(() => {
        service.deleteNotification(id);
      }).not.toThrow();
    });
  });

  describe('Filtering Edge Cases', () => {
    it('should filter with empty filter object', async () => {
      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
      });

      const notifications = service.getNotifications({});
      expect(notifications).toHaveLength(1);
    });

    it('should filter with conflicting conditions', async () => {
      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
        // Note: 'read' is set automatically by notify(), cannot be passed
      });

      // Conflicting: read: true AND read: false (if array)
      const notifications = service.getNotifications({
        read: true,
        userId: 'non-existent',
      });

      expect(notifications).toHaveLength(0);
    });

    it('should handle filter with null values', async () => {
      await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
      });

      const notifications = service.getNotifications({
        userId: null as any,
        taskId: null as any,
      });

      expect(notifications).toBeDefined();
    });
  });

  describe('ExpiresAt Edge Cases', () => {
    it('should handle notification with past expiry', async () => {
      const id = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
        expiresAt: Date.now() - 10000, // 10 seconds ago
      });

      // Should be created but expired
      const cleaned = service.cleanupExpired();
      expect(cleaned).toBeGreaterThan(0);
    });

    it('should handle very far future expiry', async () => {
      const farFuture = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
      const id = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
        expiresAt: farFuture,
      });

      expect(id).toBeDefined();
      const cleaned = service.cleanupExpired();
      expect(cleaned).toBe(0);
    });

    it('should handle zero expiry', async () => {
      const id = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
        expiresAt: 0,
      });

      expect(id).toBeDefined();
    });

    it('should handle negative expiry', async () => {
      const id = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test',
        message: 'Message',
        expiresAt: -1000,
      });

      expect(id).toBeDefined();
    });
  });
});
