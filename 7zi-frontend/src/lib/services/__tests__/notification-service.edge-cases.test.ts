/**
 * Notification Service Edge Cases Tests
 *
 * 边缘用例测试：
 * - 空值处理（null, undefined）
 * - 超长字符串（10000+字符）
 * - 特殊字符和Unicode
 * - 并发操作测试
 * - 错误恢复测试
 * - 内存限制测试
 * - 过期时间边缘用例
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NotificationService, NotificationType, NotificationPriority } from '../notification'
import type { Notification } from '../notification-types'

describe('Notification Service Edge Cases', () => {
  let service: NotificationService

  beforeEach(() => {
    service = new NotificationService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================
  // 1. 空值处理（Null/Undefined Input Handling）
  // ===========================================
  describe('Null/Undefined Input Handling', () => {
    it('should handle null title gracefully', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: null as unknown as string,
        message: 'Test message',
      })

      expect(notification).toBeDefined()
      expect(notification.id).toBeDefined()
      // Title should be null (we accept it as-is)
      expect(notification.title).toBeNull()
    })

    it('should handle undefined title gracefully', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: undefined as unknown as string,
        message: 'Test message',
      })

      expect(notification).toBeDefined()
      expect(notification.id).toBeDefined()
    })

    it('should handle null message gracefully', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test title',
        message: null as unknown as string,
      })

      expect(notification).toBeDefined()
      expect(notification.message).toBeNull()
    })

    it('should handle undefined message gracefully', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test title',
        message: undefined as unknown as string,
      })

      expect(notification).toBeDefined()
    })

    it('should handle null data field', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        data: null as unknown as Record<string, unknown>,
      })

      expect(notification).toBeDefined()
      expect(notification.data).toBeNull()
    })

    it('should handle undefined userId', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        userId: undefined,
      })

      expect(notification).toBeDefined()
      expect(notification.userId).toBeUndefined()
    })

    it('should handle null userId', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        userId: null as unknown as string,
      })

      expect(notification).toBeDefined()
      expect(notification.userId).toBeNull()
    })

    it('should handle empty string title', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: '',
        message: 'Test message',
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe('')
    })

    it('should handle empty string message', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test title',
        message: '',
      })

      expect(notification).toBeDefined()
      expect(notification.message).toBe('')
    })

    it('should handle both title and message as empty strings', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: '',
        message: '',
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe('')
      expect(notification.message).toBe('')
    })

    it('should handle null teamId', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        teamId: null as unknown as string,
      })

      expect(notification).toBeDefined()
    })

    it('should handle null taskId', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        taskId: null as unknown as string,
      })

      expect(notification).toBeDefined()
    })
  })

  // ===========================================
  // 2. 超长字符串（Very Long Strings）
  // ===========================================
  describe('Very Long Strings', () => {
    it('should handle very long title (10000+ characters)', () => {
      const longTitle = 'A'.repeat(10000)
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: longTitle,
        message: 'Test message',
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe(longTitle)
      expect(notification.title.length).toBe(10000)
    })

    it('should handle very long message (50000+ characters)', () => {
      const longMessage = 'B'.repeat(50000)
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test title',
        message: longMessage,
      })

      expect(notification).toBeDefined()
      expect(notification.message).toBe(longMessage)
      expect(notification.message.length).toBe(50000)
    })

    it('should handle very long userId (~6000 characters)', () => {
      const longUserId = 'user_'.repeat(1000)
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        userId: longUserId,
      })

      expect(notification).toBeDefined()
      expect(notification.userId).toBe(longUserId)
    })

    it('should handle very long teamId', () => {
      const longTeamId = 'team_'.repeat(1000)
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        teamId: longTeamId,
      })

      expect(notification).toBeDefined()
      expect(notification.teamId).toBe(longTeamId)
    })

    it('should handle very long taskId', () => {
      const longTaskId = 'task_'.repeat(1000)
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        taskId: longTaskId,
      })

      expect(notification).toBeDefined()
      expect(notification.taskId).toBe(longTaskId)
    })

    it('should handle both title and message being very long', () => {
      const longTitle = 'X'.repeat(10000)
      const longMessage = 'Y'.repeat(20000)
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: longTitle,
        message: longMessage,
      })

      expect(notification).toBeDefined()
      expect(notification.title.length).toBe(10000)
      expect(notification.message.length).toBe(20000)
    })
  })

  // ===========================================
  // 3. 特殊字符和 Unicode（Special Characters & Unicode）
  // ===========================================
  describe('Special Characters & Unicode', () => {
    it('should handle emoji in title and message', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 🎉🎊🎁 Emoji',
        message: 'Message with emoji 🚀💡🔥',
      })

      expect(notification).toBeDefined()
      expect(notification.title).toContain('🎉')
      expect(notification.message).toContain('🚀')
    })

    it('should handle Chinese characters', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: '测试通知标题',
        message: '这是一条中文测试消息',
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe('测试通知标题')
      expect(notification.message).toBe('这是一条中文测试消息')
    })

    it('should handle RTL text (Arabic)', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'مرحبا بالعالم',
        message: 'هذا اختبار للنص العربي',
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe('مرحبا بالعالم')
    })

    it('should handle RTL text (Hebrew)', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'שלום עולם',
        message: 'זהו מבחן לטקסט בעברית',
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe('שלום עולם')
    })

    it('should handle HTML-like content safely (not executed)', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: '<script>alert("xss")</script>',
        message: '<div onclick="alert(1)">Click me</div>',
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe('<script>alert("xss")</script>')
      expect(notification.message).toBe('<div onclick="alert(1)">Click me</div>')
    })

    it('should handle SQL injection attempts safely', () => {
      const sqlInjection = "'; DROP TABLE notifications; --"
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: sqlInjection,
        message: sqlInjection,
        userId: sqlInjection,
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe(sqlInjection)
      expect(notification.message).toBe(sqlInjection)
      expect(notification.userId).toBe(sqlInjection)
    })

    it('should handle null bytes and control characters', () => {
      const controlChars = '\x00\x01\x02\x03\t\n\r'
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: `Title${controlChars}End`,
        message: `Message${controlChars}End`,
      })

      expect(notification).toBeDefined()
      expect(notification.title).toContain('\x00')
      expect(notification.title).toContain('\t')
      expect(notification.title).toContain('\n')
    })

    it('should handle mixed Unicode characters', () => {
      const mixedUnicode = 'Hello 你好 مرحبا שלום 🌍🎉'
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: mixedUnicode,
        message: mixedUnicode,
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe(mixedUnicode)
    })

    it('should handle special JSON characters', () => {
      const jsonChars = '{"key": "value", "array": [1, 2, 3]}'
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: jsonChars,
        message: jsonChars,
        data: { jsonChars },
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe(jsonChars)
    })

    it('should handle URL-encoded strings', () => {
      const urlEncoded = 'hello%20world%3F%26%3D'
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: urlEncoded,
        message: urlEncoded,
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe(urlEncoded)
    })

    it('should handle base64-like strings', () => {
      const base64 = 'SGVsbG8gV29ybGQh'
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: base64,
        message: base64,
      })

      expect(notification).toBeDefined()
      expect(notification.title).toBe(base64)
    })

    it('should handle special characters in userId, teamId, taskId', () => {
      const specialId = 'id/with<>special&chars'
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        userId: specialId,
        teamId: specialId,
        taskId: specialId,
      })

      expect(notification).toBeDefined()
      expect(notification.userId).toBe(specialId)
      expect(notification.teamId).toBe(specialId)
      expect(notification.taskId).toBe(specialId)
    })
  })

  // ===========================================
  // 4. 非法数据类型（Invalid Data Types）
  // ===========================================
  describe('Invalid Data Types', () => {
    it('should handle numeric title', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 12345 as unknown as string,
        message: 'Test message',
      })

      expect(notification).toBeDefined()
    })

    it('should handle object as title', () => {
      const obj = { nested: 'object' }
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: obj as unknown as string,
        message: 'Test message',
      })

      expect(notification).toBeDefined()
    })

    it('should handle array as message', () => {
      const arr = ['item1', 'item2']
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: arr as unknown as string,
      })

      expect(notification).toBeDefined()
    })

    it('should handle boolean as title', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: true as unknown as string,
        message: 'Test message',
      })

      expect(notification).toBeDefined()
    })

    it('should handle data with circular reference', () => {
      const circularData: Record<string, unknown> = { name: 'test' }
      circularData.self = circularData

      // This should not throw
      expect(() => {
        service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: 'Test',
          message: 'Test message',
          data: circularData,
        })
      }).not.toThrow()
    })

    it('should handle deeply nested data', () => {
      const deepData = { level1: { level2: { level3: { level4: { level5: 'deep' } } } } }
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        data: deepData,
      })

      expect(notification).toBeDefined()
      expect(notification.data?.level1?.level2?.level3?.level4?.level5).toBe('deep')
    })

    it('should handle array in data field', () => {
      const arrayData = [1, 2, 3, 'four', { five: 5 }]
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        data: { array: arrayData },
      })

      expect(notification).toBeDefined()
      expect(Array.isArray(notification.data?.array)).toBe(true)
    })
  })

  // ===========================================
  // 5. 并发操作测试（Concurrent Operations）
  // ===========================================
  describe('Concurrent Operations', () => {
    it('should handle concurrent notification creation', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(
          service.notify({
            type: NotificationType.INFO,
            priority: NotificationPriority.MEDIUM,
            title: `Concurrent Notification ${i}`,
            message: `Message ${i}`,
            userId: 'user-1',
          })
        )
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(100)
      results.forEach((notification, i) => {
        expect(notification.title).toBe(`Concurrent Notification ${i}`)
      })

      // Verify all notifications are stored
      const allNotifications = service.getNotifications({ userId: 'user-1' })
      expect(allNotifications.length).toBe(100)
    })

    it('should handle concurrent mark as read operations', async () => {
      // Create notifications
      const notifications = Array.from({ length: 10 }, (_, i) =>
        service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: `Test ${i}`,
          message: `Message ${i}`,
        })
      )

      // Concurrent mark as read
      const promises = notifications.map(n => Promise.resolve(service.markAsRead(n.id)))
      await Promise.all(promises)

      // All should be read
      notifications.forEach(n => {
        const stored = service.getNotifications().find(stored => stored.id === n.id)
        expect(stored?.read).toBe(true)
      })
    })

    it('should handle concurrent read and write operations', async () => {
      const operations: Promise<Notification | Notification[] | number | boolean>[] = []

      // Mix of operations
      for (let i = 0; i < 50; i++) {
        operations.push(
          Promise.resolve(
            service.notify({
              type: NotificationType.INFO,
              priority: NotificationPriority.MEDIUM,
              title: `Notification ${i}`,
              message: `Message ${i}`,
              userId: 'user-1',
            })
          )
        )
      }

      for (let i = 0; i < 25; i++) {
        operations.push(Promise.resolve(service.getNotifications({ userId: 'user-1' })))
      }

      for (let i = 0; i < 25; i++) {
        operations.push(Promise.resolve(service.getUnreadCount({ userId: 'user-1' })))
      }

      // Should not throw
      const results = await Promise.all(operations)
      expect(results).toHaveLength(100)
    })

    it('should handle concurrent create and delete operations', async () => {
      const createPromises = Array.from({ length: 50 }, (_, i) =>
        Promise.resolve(
          service.notify({
            type: NotificationType.INFO,
            priority: NotificationPriority.MEDIUM,
            title: `Notification ${i}`,
            message: `Message ${i}`,
          })
        )
      )

      const notifications = await Promise.all(createPromises)

      // Delete half of them concurrently
      const deletePromises = notifications
        .slice(0, 25)
        .map(n => Promise.resolve(service.deleteNotification(n.id)))

      const deleteResults = await Promise.all(deletePromises)
      expect(deleteResults.every(r => r === true)).toBe(true)

      // Verify remaining count
      const remaining = service.getNotifications()
      expect(remaining.length).toBe(25)
    })

    it('should handle concurrent markAllAsRead operations', async () => {
      // Create 50 notifications
      Array.from({ length: 50 }, (_, i) =>
        service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: `Notification ${i}`,
          message: `Message ${i}`,
          userId: 'user-1',
        })
      )

      // Run multiple markAllAsRead concurrently
      const promises = Array.from({ length: 5 }, () =>
        Promise.resolve(service.markAllAsRead({ userId: 'user-1' }))
      )

      const results = await Promise.all(promises)

      // At least one should return 50, others may return 0
      expect(results.some(r => r === 50)).toBe(true)

      // All should be read
      const unreadCount = service.getUnreadCount({ userId: 'user-1' })
      expect(unreadCount).toBe(0)
    })
  })

  // ===========================================
  // 6. 内存限制测试（Memory Limits）
  // ===========================================
  describe('Memory Limits', () => {
    it('should handle large number of notifications (1000)', () => {
      for (let i = 0; i < 1000; i++) {
        service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: `Notification ${i}`,
          message: `Message ${i}`,
        })
      }

      const notifications = service.getNotifications()
      expect(notifications.length).toBe(1000)
    })

    it('should handle large data payload', () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: 'x'.repeat(100),
        })),
      }

      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Large Data Notification',
        message: 'This has large data',
        data: largeData,
      })

      expect(notification).toBeDefined()
      expect(notification.data?.items).toHaveLength(1000)
    })

    it('should handle multiple notifications with large data', () => {
      for (let i = 0; i < 100; i++) {
        service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: `Notification ${i}`,
          message: 'x'.repeat(1000),
          data: {
            largeArray: Array.from({ length: 100 }, (_, j) => `item-${i}-${j}`),
          },
        })
      }

      const notifications = service.getNotifications()
      expect(notifications.length).toBe(100)
      notifications.forEach(n => {
        expect(n.data?.largeArray).toHaveLength(100)
      })
    })

    it('should efficiently retrieve notifications with filters', () => {
      // Create notifications for different users
      for (let i = 0; i < 500; i++) {
        service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: `Notification ${i}`,
          message: `Message ${i}`,
          userId: `user-${i % 10}`,
        })
      }

      // Filter by specific user
      const user0Notifications = service.getNotifications({ userId: 'user-0' })
      expect(user0Notifications.length).toBe(50) // 500 / 10

      // Filter by read status
      service.markAsRead(user0Notifications[0].id)
      const readNotifications = service.getNotifications({ userId: 'user-0', read: true })
      expect(readNotifications.length).toBe(1)
    })
  })

  // ===========================================
  // 7. 过期时间边缘用例（Expiration Edge Cases）
  // ===========================================
  describe('Expiration Edge Cases', () => {
    it('should handle past expiry date', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Already Expired',
        message: 'This notification is already expired',
        expiresAt: Date.now() - 10000, // 10 seconds in the past
      })

      expect(notification).toBeDefined()
      expect(notification.expiresAt).toBeLessThan(Date.now())
    })

    it('should handle far future expiry date', () => {
      const farFuture = Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Long Living',
        message: 'This notification will last a year',
        expiresAt: farFuture,
      })

      expect(notification).toBeDefined()
      expect(notification.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should handle zero expiry timestamp', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Zero Expiry',
        message: 'Expires at zero',
        expiresAt: 0,
      })

      expect(notification).toBeDefined()
      expect(notification.expiresAt).toBe(0)
    })

    it('should handle negative expiry timestamp', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Negative Expiry',
        message: 'Expires at negative',
        expiresAt: -1000,
      })

      expect(notification).toBeDefined()
      expect(notification.expiresAt).toBe(-1000)
    })

    it('should cleanup expired notifications correctly', () => {
      // Create mixed notifications
      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Expired 1',
        message: 'Already expired',
        expiresAt: Date.now() - 1000,
      })

      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Expired 2',
        message: 'Already expired',
        expiresAt: Date.now() - 5000,
      })

      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Active',
        message: 'Still active',
        expiresAt: Date.now() + 10000,
      })

      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'No Expiry',
        message: 'No expiry set',
      })

      const cleanedCount = service.cleanupExpired()
      expect(cleanedCount).toBe(2)

      const remaining = service.getNotifications()
      expect(remaining.length).toBe(2)
    })

    it('should handle very large expiry timestamp', () => {
      const veryLargeTimestamp = Number.MAX_SAFE_INTEGER / 2
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Large Expiry',
        message: 'Very large expiry timestamp',
        expiresAt: veryLargeTimestamp,
      })

      expect(notification).toBeDefined()
      expect(notification.expiresAt).toBe(veryLargeTimestamp)
    })
  })

  // ===========================================
  // 8. 错误恢复测试（Error Recovery）
  // ===========================================
  describe('Error Recovery', () => {
    it('should handle operations on non-existent notification', () => {
      const result = service.markAsRead('non-existent-id')
      expect(result).toBe(false)
    })

    it('should handle delete of non-existent notification', () => {
      const result = service.deleteNotification('non-existent-id')
      expect(result).toBe(false)
    })

    it('should handle getNotifications with no notifications', () => {
      const notifications = service.getNotifications()
      expect(notifications).toEqual([])
    })

    it('should handle getUnreadCount with no notifications', () => {
      const count = service.getUnreadCount()
      expect(count).toBe(0)
    })

    it('should handle markAllAsRead with no notifications', () => {
      const count = service.markAllAsRead()
      expect(count).toBe(0)
    })

    it('should handle cleanupExpired with no expired notifications', () => {
      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Active',
        message: 'Still active',
        expiresAt: Date.now() + 10000,
      })

      const cleaned = service.cleanupExpired()
      expect(cleaned).toBe(0)
    })

    it('should recover from concurrent access issues', async () => {
      // Create initial notification
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Initial',
        message: 'Initial message',
      })

      // Simulate concurrent operations
      const operations = [
        () => service.markAsRead(notification.id),
        () => service.markAsRead(notification.id),
        () => service.markAsRead(notification.id),
        () => service.deleteNotification(notification.id),
        () => service.markAsRead(notification.id), // This should return false
      ]

      const results = operations.map(op => op())
      expect(results[0]).toBe(true) // First markAsRead
      expect(results[1]).toBe(true) // Second markAsRead (already read but still returns true)
      expect(results[2]).toBe(true) // Third markAsRead
      expect(results[3]).toBe(true) // Delete
      expect(results[4]).toBe(false) // MarkAsRead after delete
    })

    it('should handle filter with non-existent userId', () => {
      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
        userId: 'user-1',
      })

      const notifications = service.getNotifications({ userId: 'non-existent-user' })
      expect(notifications).toEqual([])
    })

    it('should handle filter with non-existent teamId', () => {
      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
        teamId: 'team-1',
      })

      const notifications = service.getNotifications({ teamId: 'non-existent-team' })
      expect(notifications).toEqual([])
    })
  })

  // ===========================================
  // 9. ID 生成测试（ID Generation）
  // ===========================================
  describe('ID Generation', () => {
    it('should generate unique IDs for notifications', () => {
      const ids = new Set<string>()

      for (let i = 0; i < 1000; i++) {
        const notification = service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: `Notification ${i}`,
          message: `Message ${i}`,
        })
        ids.add(notification.id)
      }

      expect(ids.size).toBe(1000)
    })

    it('should generate IDs with expected format', () => {
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
      })

      expect(notification.id).toMatch(/^notif_\d+_[a-z0-9]+$/)
    })
  })

  // ===========================================
  // 10. 通知类型和优先级完整性（Type and Priority Integrity）
  // ===========================================
  describe('Type and Priority Integrity', () => {
    it('should accept all defined notification types', () => {
      const types = Object.values(NotificationType)

      types.forEach(type => {
        const notification = service.notify({
          type,
          priority: NotificationPriority.MEDIUM,
          title: `Type: ${type}`,
          message: 'Test message',
        })

        expect(notification.type).toBe(type)
      })
    })

    it('should accept all defined priority levels', () => {
      const priorities = Object.values(NotificationPriority)

      priorities.forEach(priority => {
        const notification = service.notify({
          type: NotificationType.INFO,
          priority,
          title: `Priority: ${priority}`,
          message: 'Test message',
        })

        expect(notification.priority).toBe(priority)
      })
    })

    it('should filter by type correctly', () => {
      // Create notifications of different types
      Object.values(NotificationType).forEach(type => {
        service.notify({
          type,
          priority: NotificationPriority.MEDIUM,
          title: `${type} notification`,
          message: 'Test',
        })
      })

      const errorNotifications = service.getNotifications({ type: NotificationType.ERROR })
      expect(errorNotifications.length).toBe(1)
      expect(errorNotifications[0].type).toBe(NotificationType.ERROR)
    })

    it('should filter by priority correctly', () => {
      // Create notifications of different priorities
      Object.values(NotificationPriority).forEach(priority => {
        service.notify({
          type: NotificationType.INFO,
          priority,
          title: `${priority} notification`,
          message: 'Test',
        })
      })

      const urgentNotifications = service.getNotifications()
      const urgent = urgentNotifications.filter(n => n.priority === NotificationPriority.URGENT)
      expect(urgent.length).toBe(1)
    })
  })

  // ===========================================
  // 11. 时间戳测试（Timestamp Tests）
  // ===========================================
  describe('Timestamp Tests', () => {
    it('should set createdAt to current time', () => {
      const before = Date.now()
      const notification = service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
      })
      const after = Date.now()

      expect(notification.createdAt).toBeGreaterThanOrEqual(before)
      expect(notification.createdAt).toBeLessThanOrEqual(after)
    })

    it('should maintain chronological order', () => {
      const notifications: Notification[] = []

      for (let i = 0; i < 10; i++) {
        notifications.push(
          service.notify({
            type: NotificationType.INFO,
            priority: NotificationPriority.MEDIUM,
            title: `Notification ${i}`,
            message: 'Message',
          })
        )
      }

      // getNotifications returns sorted by createdAt desc
      const retrieved = service.getNotifications()

      for (let i = 0; i < retrieved.length - 1; i++) {
        expect(retrieved[i].createdAt).toBeGreaterThanOrEqual(retrieved[i + 1].createdAt)
      }
    })

    it('should handle notifications created at same millisecond', () => {
      // Create multiple notifications in tight loop
      const notifications: Notification[] = []
      for (let i = 0; i < 10; i++) {
        notifications.push(
          service.notify({
            type: NotificationType.INFO,
            priority: NotificationPriority.MEDIUM,
            title: `Notification ${i}`,
            message: 'Message',
          })
        )
      }

      // All should have unique IDs
      const ids = notifications.map(n => n.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(10)
    })
  })

  // ===========================================
  // 12. 用户隔离测试（User Isolation）
  // ===========================================
  describe('User Isolation', () => {
    it('should isolate notifications by userId', () => {
      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'User 1 Notification',
        message: 'For user 1',
        userId: 'user-1',
      })

      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'User 2 Notification',
        message: 'For user 2',
        userId: 'user-2',
      })

      const user1Notifications = service.getNotifications({ userId: 'user-1' })
      const user2Notifications = service.getNotifications({ userId: 'user-2' })

      expect(user1Notifications.length).toBe(1)
      expect(user1Notifications[0].title).toBe('User 1 Notification')

      expect(user2Notifications.length).toBe(1)
      expect(user2Notifications[0].title).toBe('User 2 Notification')
    })

    it('should isolate markAllAsRead by userId', () => {
      // Create notifications for multiple users
      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'User 1 - 1',
        message: 'Message',
        userId: 'user-1',
      })

      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'User 1 - 2',
        message: 'Message',
        userId: 'user-1',
      })

      service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'User 2 - 1',
        message: 'Message',
        userId: 'user-2',
      })

      // Mark all as read for user-1
      const count = service.markAllAsRead({ userId: 'user-1' })
      expect(count).toBe(2)

      // user-1 should have no unread
      expect(service.getUnreadCount({ userId: 'user-1' })).toBe(0)

      // user-2 should still have unread
      expect(service.getUnreadCount({ userId: 'user-2' })).toBe(1)
    })

    it('should count unread correctly per user', () => {
      for (let i = 0; i < 5; i++) {
        service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: `User 1 - ${i}`,
          message: 'Message',
          userId: 'user-1',
        })
      }

      for (let i = 0; i < 3; i++) {
        service.notify({
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: `User 2 - ${i}`,
          message: 'Message',
          userId: 'user-2',
        })
      }

      expect(service.getUnreadCount({ userId: 'user-1' })).toBe(5)
      expect(service.getUnreadCount({ userId: 'user-2' })).toBe(3)
    })
  })
})
