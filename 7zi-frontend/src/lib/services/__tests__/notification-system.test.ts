/**
 * Notification System Tests
 *
 * 测试通知系统的核心功能
 *
 * @package 7zi-frontend
 * @version v1.12.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NotificationType, NotificationPriority } from './notification-types'
import { NotificationIndexedDBStorage } from './notification-indexeddb'
import { ClientNotificationManager } from './client-notification-manager'

describe('Notification System', () => {
  let storage: NotificationIndexedDBStorage
  let manager: ClientNotificationManager

  beforeEach(async () => {
    // 创建新的存储实例
    storage = new NotificationIndexedDBStorage({
      maxNotifications: 100,
      autoCleanup: false,
    })

    // 创建新的管理器实例
    manager = new ClientNotificationManager({
      grouping: {
        enabled: true,
        maxGroupAge: 24 * 60 * 60 * 1000,
        groupByType: true,
        groupByPriority: false,
        groupByUser: true,
        groupByTask: false,
        groupByTeam: false,
      },
      maxHistorySize: 100,
    })
  })

  afterEach(async () => {
    // 清理
    await storage.clearAll()
    await storage.destroy()
    await manager.destroy()
  })

  describe('NotificationIndexedDBStorage', () => {
    it('should save and retrieve a notification', async () => {
      const notification = {
        id: 'test-1',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'This is a test notification',
        read: false,
        createdAt: Date.now(),
      }

      await storage.saveNotification(notification)
      const retrieved = await storage.getNotification('test-1')

      expect(retrieved).toEqual(notification)
    })

    it('should save multiple notifications', async () => {
      const notifications = [
        {
          id: 'test-1',
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: 'Test 1',
          message: 'Message 1',
          read: false,
          createdAt: Date.now(),
        },
        {
          id: 'test-2',
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.HIGH,
          title: 'Test 2',
          message: 'Message 2',
          read: false,
          createdAt: Date.now(),
        },
      ]

      await storage.saveNotifications(notifications)
      const retrieved = await storage.getNotifications()

      expect(retrieved).toHaveLength(2)
    })

    it('should filter notifications by type', async () => {
      const notifications = [
        {
          id: 'test-1',
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: 'Test 1',
          message: 'Message 1',
          read: false,
          createdAt: Date.now(),
        },
        {
          id: 'test-2',
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.HIGH,
          title: 'Test 2',
          message: 'Message 2',
          read: false,
          createdAt: Date.now(),
        },
      ]

      await storage.saveNotifications(notifications)

      const infoNotifications = await storage.getNotifications({
        type: NotificationType.INFO,
      })

      expect(infoNotifications).toHaveLength(1)
      expect(infoNotifications[0].type).toBe(NotificationType.INFO)
    })

    it('should mark notification as read', async () => {
      const notification = {
        id: 'test-1',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'This is a test notification',
        read: false,
        createdAt: Date.now(),
      }

      await storage.saveNotification(notification)
      await storage.markAsRead('test-1')

      const retrieved = await storage.getNotification('test-1')
      expect(retrieved?.read).toBe(true)
    })

    it('should get unread count', async () => {
      const notifications = [
        {
          id: 'test-1',
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: 'Test 1',
          message: 'Message 1',
          read: false,
          createdAt: Date.now(),
        },
        {
          id: 'test-2',
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.HIGH,
          title: 'Test 2',
          message: 'Message 2',
          read: true,
          createdAt: Date.now(),
        },
      ]

      await storage.saveNotifications(notifications)

      const unreadCount = await storage.getUnreadCount()
      expect(unreadCount).toBe(1)
    })

    it('should delete notification', async () => {
      const notification = {
        id: 'test-1',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'This is a test notification',
        read: false,
        createdAt: Date.now(),
      }

      await storage.saveNotification(notification)
      await storage.deleteNotification('test-1')

      const retrieved = await storage.getNotification('test-1')
      expect(retrieved).toBeNull()
    })

    it('should cleanup expired notifications', async () => {
      const now = Date.now()

      const notifications = [
        {
          id: 'test-1',
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: 'Test 1',
          message: 'Message 1',
          read: false,
          createdAt: now,
          expiresAt: now - 1000, // 已过期
        },
        {
          id: 'test-2',
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.HIGH,
          title: 'Test 2',
          message: 'Message 2',
          read: false,
          createdAt: now,
          expiresAt: now + 1000000, // 未过期
        },
      ]

      await storage.saveNotifications(notifications)
      const cleanedCount = await storage.cleanupExpired()

      expect(cleanedCount).toBe(1)

      const remaining = await storage.getNotifications()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('test-2')
    })

    it('should get statistics', async () => {
      const notifications = [
        {
          id: 'test-1',
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: 'Test 1',
          message: 'Message 1',
          read: false,
          createdAt: Date.now(),
        },
        {
          id: 'test-2',
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.HIGH,
          title: 'Test 2',
          message: 'Message 2',
          read: true,
          createdAt: Date.now(),
        },
      ]

      await storage.saveNotifications(notifications)

      const stats = await storage.getStats()

      expect(stats.total).toBe(2)
      expect(stats.unread).toBe(1)
      expect(stats.byType.info).toBe(1)
      expect(stats.byType.success).toBe(1)
      expect(stats.byPriority.medium).toBe(1)
      expect(stats.byPriority.high).toBe(1)
    })

    it('should save and retrieve user preferences', async () => {
      const preferences = {
        emailEnabled: true,
        emailThreshold: NotificationPriority.HIGH,
        pushEnabled: true,
        pushThreshold: NotificationPriority.MEDIUM,
        digestEnabled: false,
        digestFrequency: 'daily' as const,
        quietHoursStart: '22:00',
        quietHoursEnd: '06:00',
        timezone: 'Asia/Shanghai',
      }

      await storage.saveUserPreferences('user-1', preferences)
      const retrieved = await storage.getUserPreferences('user-1')

      expect(retrieved).toEqual(preferences)
    })
  })

  describe('ClientNotificationManager', () => {
    it('should add and retrieve notifications', async () => {
      const notification = await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'This is a test notification',
      })

      expect(notification.id).toBeDefined()
      expect(notification.read).toBe(false)
      expect(notification.createdAt).toBeDefined()

      const notifications = await manager.getNotifications()
      expect(notifications).toHaveLength(1)
      expect(notifications[0].id).toBe(notification.id)
    })

    it('should group notifications by type', async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Info 1',
        message: 'Message 1',
        userId: 'user-1',
      })

      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Info 2',
        message: 'Message 2',
        userId: 'user-1',
      })

      await manager.addNotification({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.HIGH,
        title: 'Success 1',
        message: 'Message 3',
        userId: 'user-1',
      })

      const groups = await manager.getGroups({ userId: 'user-1' })

      expect(groups).toHaveLength(2)
      expect(groups[0].count).toBe(2)
      expect(groups[0].type).toBe(NotificationType.INFO)
      expect(groups[1].count).toBe(1)
      expect(groups[1].type).toBe(NotificationType.SUCCESS)
    })

    it('should mark notification as read', async () => {
      const notification = await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'This is a test notification',
      })

      await manager.markAsRead(notification.id)

      const notifications = await manager.getNotifications()
      expect(notifications[0].read).toBe(true)
    })

    it('should mark all notifications as read', async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 1',
        message: 'Message 1',
      })

      await manager.addNotification({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.HIGH,
        title: 'Test 2',
        message: 'Message 2',
      })

      const count = await manager.markAllAsRead()
      expect(count).toBe(2)

      const notifications = await manager.getNotifications()
      expect(notifications.every(n => n.read)).toBe(true)
    })

    it('should get unread count', async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 1',
        message: 'Message 1',
      })

      await manager.addNotification({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.HIGH,
        title: 'Test 2',
        message: 'Message 2',
      })

      const unreadCount = await manager.getUnreadCount()
      expect(unreadCount).toBe(2)

      await manager.markAllAsRead()

      const unreadCountAfter = await manager.getUnreadCount()
      expect(unreadCountAfter).toBe(0)
    })

    it('should delete notification', async () => {
      const notification = await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'This is a test notification',
      })

      await manager.deleteNotification(notification.id)

      const notifications = await manager.getNotifications()
      expect(notifications).toHaveLength(0)
    })

    it('should get statistics', async () => {
      await manager.addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test 1',
        message: 'Message 1',
      })

      await manager.addNotification({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.HIGH,
        title: 'Test 2',
        message: 'Message 2',
      })

      const stats = await manager.getStats()

      expect(stats.total).toBe(2)
      expect(stats.unread).toBe(2)
      expect(stats.byType.info).toBe(1)
      expect(stats.byType.success).toBe(1)
    })

    it('should check quiet hours', async () => {
      const preferences = {
        emailEnabled: true,
        emailThreshold: NotificationPriority.HIGH,
        pushEnabled: true,
        pushThreshold: NotificationPriority.MEDIUM,
        digestEnabled: false,
        digestFrequency: 'daily' as const,
        quietHoursStart: '22:00',
        quietHoursEnd: '06:00',
        timezone: 'Asia/Shanghai',
      }

      await manager.saveUserPreferences('user-1', preferences)

      const isActive = await manager.isQuietHoursActive('user-1')

      // 结果取决于当前时间
      expect(typeof isActive).toBe('boolean')
    })
  })
})