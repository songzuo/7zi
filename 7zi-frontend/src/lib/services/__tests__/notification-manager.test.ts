/**
 * Notification Manager Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationManager } from '../notification-manager'
import { NotificationType, NotificationPriority } from '../notification-types'
import type { Notification } from '../notification-types'

// Mock the enhanced notification service
vi.mock('../notification-enhanced', () => ({
  enhancedNotificationService: {
    notify: vi.fn().mockResolvedValue({
      success: true,
      notificationId: 'mock-id',
      emailSent: false,
    }),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    getUserPreferences: vi.fn(),
  },
}))

describe('NotificationManager', () => {
  let manager: NotificationManager

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    manager = new NotificationManager()
    manager.clear()
  })

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const config = manager.getConfig()
      expect(config.grouping.enabled).toBe(true)
      expect(config.maxHistorySize).toBe(1000)
      expect(config.enableQuietHours).toBe(true)
    })

    it('should initialize with custom config', () => {
      const customManager = new NotificationManager({
        grouping: {
          enabled: false,
          maxGroupAge: 12 * 60 * 60 * 1000,
          groupByType: false,
          groupByPriority: false,
          groupByUser: false,
          groupByTask: false,
          groupByTeam: false,
        },
        maxHistorySize: 500,
        enableQuietHours: false,
      })

      const config = customManager.getConfig()
      expect(config.grouping.enabled).toBe(false)
      expect(config.maxHistorySize).toBe(500)
      expect(config.enableQuietHours).toBe(false)
    })
  })

  describe('Adding Notifications', () => {
    it('should add a notification successfully', async () => {
      const notification = await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'This is a test',
        userId: 'user1',
      })

      expect(notification.id).toBeDefined()
      expect(notification.type).toBe(NotificationType.INFO)
      expect(notification.priority).toBe(NotificationPriority.MEDIUM)
      expect(notification.read).toBe(false)
      expect(notification.createdAt).toBeDefined()
    })

    it('should add multiple notifications', async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 1',
        message: 'Message 1',
        userId: 'user1',
      })

      await manager.addNotification({
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        title: 'Test 2',
        message: 'Message 2',
        userId: 'user1',
      })

      const { notifications } = manager.getNotifications()
      expect(notifications).toHaveLength(2)
    })

    it('should skip delivery when requested', async () => {
      const { enhancedNotificationService } = await import('../notification-enhanced')

      await manager.addNotification(
        {
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: 'Test',
          message: 'Message',
          userId: 'user1',
        },
        { skipDelivery: true }
      )

      expect(enhancedNotificationService.notify).not.toHaveBeenCalled()
    })
  })

  describe('Notification Grouping', () => {
    it('should group notifications by type', async () => {
      const groupingManager = new NotificationManager({
        grouping: {
          enabled: true,
          maxGroupAge: 24 * 60 * 60 * 1000,
          groupByType: true,
          groupByPriority: false,
          groupByUser: false,
          groupByTask: false,
          groupByTeam: false,
        },
        maxHistorySize: 1000,
        enableQuietHours: false,
      })

      await groupingManager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Info 1',
        message: 'Message 1',
        userId: 'user1',
      })

      await groupingManager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        title: 'Info 2',
        message: 'Message 2',
        userId: 'user1',
      })

      const groups = groupingManager.getGroups()
      expect(groups).toHaveLength(1)
      expect(groups[0].count).toBe(2)
      expect(groups[0].type).toBe(NotificationType.INFO)
    })

    it('should group notifications by user', async () => {
      const groupingManager = new NotificationManager({
        grouping: {
          enabled: true,
          maxGroupAge: 24 * 60 * 60 * 1000,
          groupByType: false,
          groupByPriority: false,
          groupByUser: true,
          groupByTask: false,
          groupByTeam: false,
        },
        maxHistorySize: 1000,
        enableQuietHours: false,
      })

      await groupingManager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Info 1',
        message: 'Message 1',
        userId: 'user1',
      })

      await groupingManager.addNotification({
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        title: 'Warning 1',
        message: 'Message 2',
        userId: 'user1',
      })

      const groups = groupingManager.getGroups()
      expect(groups).toHaveLength(1)
      expect(groups[0].count).toBe(2)
      expect(groups[0].userId).toBe('user1')
    })

    it('should create separate groups for different users', async () => {
      const groupingManager = new NotificationManager({
        grouping: {
          enabled: true,
          maxGroupAge: 24 * 60 * 60 * 1000,
          groupByType: false,
          groupByPriority: false,
          groupByUser: true,
          groupByTask: false,
          groupByTeam: false,
        },
        maxHistorySize: 1000,
        enableQuietHours: false,
      })

      await groupingManager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Info 1',
        message: 'Message 1',
        userId: 'user1',
      })

      await groupingManager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Info 2',
        message: 'Message 2',
        userId: 'user2',
      })

      const groups = groupingManager.getGroups()
      expect(groups).toHaveLength(2)
    })

    it('should not group when grouping is disabled', async () => {
      const noGroupingManager = new NotificationManager({
        grouping: {
          enabled: false,
          maxGroupAge: 24 * 60 * 60 * 1000,
          groupByType: true,
          groupByPriority: false,
          groupByUser: true,
          groupByTask: false,
          groupByTeam: false,
        },
        maxHistorySize: 1000,
        enableQuietHours: false,
      })

      await noGroupingManager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Info 1',
        message: 'Message 1',
        userId: 'user1',
      })

      await noGroupingManager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Info 2',
        message: 'Message 2',
        userId: 'user1',
      })

      const groups = noGroupingManager.getGroups()
      expect(groups).toHaveLength(0)
    })
  })

  describe('Getting Notifications', () => {
    beforeEach(async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Info 1',
        message: 'Message 1',
        userId: 'user1',
      })

      await manager.addNotification({
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        title: 'Warning 1',
        message: 'Message 2',
        userId: 'user1',
      })

      await manager.addNotification({
        type: NotificationType.ERROR,
        priority: NotificationPriority.URGENT,
        title: 'Error 1',
        message: 'Message 3',
        userId: 'user2',
      })
    })

    it('should get all notifications', () => {
      const { notifications } = manager.getNotifications()
      expect(notifications).toHaveLength(3)
    })

    it('should filter by user ID', () => {
      const { notifications } = manager.getNotifications({ userId: 'user1' })
      expect(notifications).toHaveLength(2)
      expect(notifications.every(n => n.userId === 'user1')).toBe(true)
    })

    it('should filter by type', () => {
      const { notifications } = manager.getNotifications({ type: NotificationType.INFO })
      expect(notifications).toHaveLength(1)
      expect(notifications[0].type).toBe(NotificationType.INFO)
    })

    it('should filter by priority', () => {
      const { notifications } = manager.getNotifications({ priority: NotificationPriority.HIGH })
      expect(notifications).toHaveLength(1)
      expect(notifications[0].priority).toBe(NotificationPriority.HIGH)
    })

    it('should filter by read status', () => {
      manager.markAsRead(manager.getNotifications().notifications[0].id)
      const { notifications } = manager.getNotifications({ read: false })
      expect(notifications).toHaveLength(2)
      expect(notifications.every(n => !n.read)).toBe(true)
    })

    it('should filter by multiple types', () => {
      const { notifications } = manager.getNotifications({
        type: [NotificationType.INFO, NotificationType.WARNING],
      })
      expect(notifications).toHaveLength(2)
    })

    it('should apply limit', () => {
      const { notifications } = manager.getNotifications({ limit: 2 })
      expect(notifications).toHaveLength(2)
    })

    it('should apply offset', () => {
      const { notifications } = manager.getNotifications({ offset: 1 })
      expect(notifications).toHaveLength(2)
    })

    it('should return grouped notifications when requested', () => {
      const { notifications, groups } = manager.getNotifications({ grouped: true })
      expect(notifications).toHaveLength(3)
      expect(groups).toBeDefined()
    })
  })

  describe('Getting Groups', () => {
    beforeEach(async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Info 1',
        message: 'Message 1',
        userId: 'user1',
      })

      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        title: 'Info 2',
        message: 'Message 2',
        userId: 'user1',
      })

      await manager.addNotification({
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        title: 'Warning 1',
        message: 'Message 3',
        userId: 'user2',
      })
    })

    it('should get all groups', () => {
      const groups = manager.getGroups()
      expect(groups.length).toBeGreaterThan(0)
    })

    it('should filter groups by user ID', () => {
      const groups = manager.getGroups({ userId: 'user1' })
      expect(groups.every(g => g.userId === 'user1')).toBe(true)
    })

    it('should filter groups by type', () => {
      const groups = manager.getGroups({ type: NotificationType.INFO })
      expect(groups.every(g => g.type === NotificationType.INFO)).toBe(true)
    })

    it('should apply limit to groups', () => {
      const groups = manager.getGroups({ limit: 1 })
      expect(groups.length).toBeLessThanOrEqual(1)
    })
  })

  describe('Unread Count', () => {
    it('should return 0 when no notifications', () => {
      const count = manager.getUnreadCount()
      expect(count).toBe(0)
    })

    it('should return correct unread count', async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
        userId: 'user1',
      })

      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
        userId: 'user1',
      })

      const count = manager.getUnreadCount('user1')
      expect(count).toBe(2)
    })

    it('should update unread count after marking as read', async () => {
      const notification = await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
        userId: 'user1',
      })

      expect(manager.getUnreadCount('user1')).toBe(1)

      manager.markAsRead(notification.id)
      expect(manager.getUnreadCount('user1')).toBe(0)
    })
  })

  describe('Marking as Read', () => {
    it('should mark notification as read', async () => {
      const notification = await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
        userId: 'user1',
      })

      const result = manager.markAsRead(notification.id)
      expect(result).toBe(true)

      const { notifications } = manager.getNotifications({ userId: 'user1' })
      expect(notifications[0].read).toBe(true)
    })

    it('should return false for non-existent notification', () => {
      const result = manager.markAsRead('non-existent-id')
      expect(result).toBe(false)
    })

    it('should mark all notifications as read for a user', async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 1',
        message: 'Message 1',
        userId: 'user1',
      })

      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 2',
        message: 'Message 2',
        userId: 'user1',
      })

      const count = manager.markAllAsRead('user1')
      expect(count).toBe(2)

      const { notifications } = manager.getNotifications({ userId: 'user1' })
      expect(notifications.every(n => n.read)).toBe(true)
    })

    it('should mark all notifications as read when no user specified', async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 1',
        message: 'Message 1',
        userId: 'user1',
      })

      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 2',
        message: 'Message 2',
        userId: 'user2',
      })

      const count = manager.markAllAsRead()
      expect(count).toBe(2)

      const { notifications } = manager.getNotifications()
      expect(notifications.every(n => n.read)).toBe(true)
    })
  })

  describe('Deleting Notifications', () => {
    it('should delete notification', async () => {
      const notification = await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
        userId: 'user1',
      })

      const result = manager.deleteNotification(notification.id)
      expect(result).toBe(true)

      const { notifications } = manager.getNotifications()
      expect(notifications).toHaveLength(0)
    })

    it('should return false for non-existent notification', () => {
      const result = manager.deleteNotification('non-existent-id')
      expect(result).toBe(false)
    })

    it('should remove notification from groups when deleted', async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 1',
        message: 'Message 1',
        userId: 'user1',
      })

      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 2',
        message: 'Message 2',
        userId: 'user1',
      })

      const groups = manager.getGroups()
      expect(groups[0].count).toBe(2)

      const { notifications } = manager.getNotifications()
      manager.deleteNotification(notifications[0].id)

      const updatedGroups = manager.getGroups()
      expect(updatedGroups[0].count).toBe(1)
    })
  })

  describe('Quiet Hours', () => {
    it('should check quiet hours for user', async () => {
      const { enhancedNotificationService } = await import('../notification-enhanced')

      enhancedNotificationService.getUserPreferences = vi.fn().mockReturnValue({
        userId: 'user1',
        emailEnabled: true,
        emailThreshold: NotificationPriority.HIGH,
        pushEnabled: true,
        pushThreshold: NotificationPriority.MEDIUM,
        digestEnabled: false,
        digestFrequency: 'daily',
        quietHoursStart: '22:00',
        quietHoursEnd: '06:00',
        timezone: 'UTC',
      })

      const isActive = manager.isQuietHoursActive('user1')
      expect(typeof isActive).toBe('boolean')
    })

    it('should return false when quiet hours are disabled', async () => {
      const quietHoursDisabledManager = new NotificationManager({
        grouping: {
          enabled: true,
          maxGroupAge: 24 * 60 * 60 * 1000,
          groupByType: true,
          groupByPriority: false,
          groupByUser: true,
          groupByTask: false,
          groupByTeam: false,
        },
        maxHistorySize: 1000,
        enableQuietHours: false,
      })

      const isActive = quietHoursDisabledManager.isQuietHoursActive('user1')
      expect(isActive).toBe(false)
    })

    it('should return false when no user ID provided', () => {
      const isActive = manager.isQuietHoursActive()
      expect(isActive).toBe(false)
    })
  })

  describe('Statistics', () => {
    it('should return correct statistics', async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 1',
        message: 'Message 1',
        userId: 'user1',
      })

      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 2',
        message: 'Message 2',
        userId: 'user1',
      })

      const stats = manager.getStats()
      expect(stats.totalNotifications).toBe(2)
      expect(stats.unreadNotifications).toBe(2)
      expect(stats.totalGroups).toBeGreaterThan(0)
    })

    it('should update statistics after marking as read', async () => {
      const notification = await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Message',
        userId: 'user1',
      })

      manager.markAsRead(notification.id)

      const stats = manager.getStats()
      expect(stats.unreadNotifications).toBe(0)
    })
  })

  describe('History Size Enforcement', () => {
    it('should enforce max history size', async () => {
      const smallHistoryManager = new NotificationManager({
        grouping: {
          enabled: true,
          maxGroupAge: 24 * 60 * 60 * 1000,
          groupByType: true,
          groupByPriority: false,
          groupByUser: true,
          groupByTask: false,
          groupByTeam: false,
        },
        maxHistorySize: 3,
        enableQuietHours: false,
      })

      // Add 5 notifications
      for (let i = 0; i < 5; i++) {
        await smallHistoryManager.addNotification({
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: `Test ${i}`,
          message: `Message ${i}`,
          userId: 'user1',
        })
      }

      const { notifications } = smallHistoryManager.getNotifications()
      expect(notifications.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      manager.updateConfig({
        maxHistorySize: 500,
        enableQuietHours: false,
      })

      const config = manager.getConfig()
      expect(config.maxHistorySize).toBe(500)
      expect(config.enableQuietHours).toBe(false)
    })

    it('should update grouping configuration', () => {
      manager.updateConfig({
        grouping: {
          enabled: false,
          maxGroupAge: 12 * 60 * 60 * 1000,
          groupByType: false,
          groupByPriority: false,
          groupByUser: false,
          groupByTask: false,
          groupByTeam: false,
        },
      })

      const config = manager.getConfig()
      expect(config.grouping.enabled).toBe(false)
      expect(config.grouping.maxGroupAge).toBe(12 * 60 * 60 * 1000)
    })
  })

  describe('Priority Ordering', () => {
    it('should respect priority in grouping', async () => {
      const priorityGroupingManager = new NotificationManager({
        grouping: {
          enabled: true,
          maxGroupAge: 24 * 60 * 60 * 1000,
          groupByType: true,
          groupByPriority: true,
          groupByUser: true,
          groupByTask: false,
          groupByTeam: false,
        },
        maxHistorySize: 1000,
        enableQuietHours: false,
      })

      await priorityGroupingManager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        title: 'High Priority',
        message: 'Message 1',
        userId: 'user1',
      })

      await priorityGroupingManager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Medium Priority',
        message: 'Message 2',
        userId: 'user1',
      })

      const groups = priorityGroupingManager.getGroups()
      expect(groups.length).toBe(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty filters', () => {
      const { notifications } = manager.getNotifications({})
      expect(notifications).toHaveLength(0)
    })

    it('should handle notification with no user ID', async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Broadcast',
        message: 'Broadcast message',
      })

      const { notifications } = manager.getNotifications()
      expect(notifications).toHaveLength(1)
      expect(notifications[0].userId).toBeUndefined()
    })

    it('should handle expired notifications', async () => {
      const expiresAt = Date.now() - 1000 // Already expired

      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Expired',
        message: 'Expired message',
        userId: 'user1',
        expiresAt,
      })

      // The notification should still be in memory
      const { notifications } = manager.getNotifications()
      expect(notifications).toHaveLength(1)
    })
  })
})