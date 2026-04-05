/**
 * Notification IndexedDB Storage - 客户端持久化存储
 *
 * 用于浏览器端通知的持久化存储，支持：
 * - 通知CRUD操作
 * - 已读/未读状态管理
 * - 按用户/类型/优先级过滤
 * - 过期通知自动清理
 *
 * @package 7zi-frontend
 * @version v1.12.2
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Notification, NotificationType, NotificationPriority } from './notification-types'
import { logger } from '@/lib/logger'

/**
 * 数据库 Schema 定义
 */
interface NotificationDB extends DBSchema {
  notifications: {
    key: string
    value: Notification
    indexes: {
      'by-user': string
      'by-team': string
      'by-task': string
      'by-type': string
      'by-priority': string
      'by-read': number
      'by-created': number
      'by-expires': number
    }
  }
  preferences: {
    key: string
    value: {
      userId: string
      emailEnabled: boolean
      emailThreshold: NotificationPriority
      pushEnabled: boolean
      pushThreshold: NotificationPriority
      digestEnabled: boolean
      digestFrequency: 'hourly' | 'daily' | 'weekly'
      quietHoursStart?: string
      quietHoursEnd?: string
      timezone: string
      updatedAt: number
    }
    indexes: {
      'by-user': string
    }
  }
}

/**
 * 数据库名称和版本
 */
const DB_NAME = '7zi-notifications'
const DB_VERSION = 1

/**
 * 数据库实例
 */
let dbPromise: Promise<IDBPDatabase<NotificationDB>> | null = null

/**
 * 获取数据库实例
 */
async function getDB(): Promise<IDBPDatabase<NotificationDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NotificationDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 创建通知存储区
        if (!db.objectStoreNames.contains('notifications')) {
          const store = db.createObjectStore('notifications', { keyPath: 'id' })

          // 创建索引
          store.createIndex('by-user', 'userId', { unique: false })
          store.createIndex('by-team', 'teamId', { unique: false })
          store.createIndex('by-task', 'taskId', { unique: false })
          store.createIndex('by-type', 'type', { unique: false })
          store.createIndex('by-priority', 'priority', { unique: false })
          store.createIndex('by-read', 'read', { unique: false })
          store.createIndex('by-created', 'createdAt', { unique: false })
          store.createIndex('by-expires', 'expiresAt', { unique: false })
        }

        // 创建用户偏好设置存储区
        if (!db.objectStoreNames.contains('preferences')) {
          const prefStore = db.createObjectStore('preferences', { keyPath: 'userId' })
          prefStore.createIndex('by-user', 'userId', { unique: true })
        }
      },
    })
  }
  return dbPromise
}

/**
 * 通知存储配置
 */
export interface NotificationStorageConfig {
  /** 最大存储数量 */
  maxNotifications?: number
  /** 自动清理过期通知 */
  autoCleanup?: boolean
  /** 清理间隔（毫秒） */
  cleanupInterval?: number
}

/**
 * 通知存储类
 */
export class NotificationIndexedDBStorage {
  private config: Required<NotificationStorageConfig>
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: NotificationStorageConfig = {}) {
    this.config = {
      maxNotifications: config.maxNotifications ?? 1000,
      autoCleanup: config.autoCleanup ?? true,
      cleanupInterval: config.cleanupInterval ?? 5 * 60 * 1000, // 5分钟
    }

    if (this.config.autoCleanup && typeof window !== 'undefined') {
      this.startAutoCleanup()
    }
  }

  /**
   * 保存通知
   */
  async saveNotification(notification: Notification): Promise<void> {
    try {
      const db = await getDB()
      await db.put('notifications', notification)

      // 检查是否超过最大数量
      await this.enforceMaxSize()

      logger.debug('[NotificationIndexedDB] 通知已保存:', { id: notification.id })
    } catch (error) {
      logger.error('[NotificationIndexedDB] 保存通知失败:', error instanceof Error ? error : undefined)
      throw error
    }
  }

  /**
   * 批量保存通知
   */
  async saveNotifications(notifications: Notification[]): Promise<void> {
    try {
      const db = await getDB()
      const tx = db.transaction('notifications', 'readwrite')

      for (const notification of notifications) {
        await tx.store.put(notification)
      }

      await tx.done

      // 检查是否超过最大数量
      await this.enforceMaxSize()

      logger.debug('[NotificationIndexedDB] 批量保存通知:', { count: notifications.length })
    } catch (error) {
      logger.error('[NotificationIndexedDB] 批量保存通知失败:', error instanceof Error ? error : undefined)
      throw error
    }
  }

  /**
   * 获取通知
   */
  async getNotification(id: string): Promise<Notification | null> {
    try {
      const db = await getDB()
      const notification = await db.get('notifications', id)
      return notification ?? null
    } catch (error) {
      logger.error('[NotificationIndexedDB] 获取通知失败:', error instanceof Error ? error : undefined)
      return null
    }
  }

  /**
   * 获取通知列表（带过滤）
   */
  async getNotifications(filters?: {
    userId?: string
    teamId?: string
    taskId?: string
    type?: NotificationType | NotificationType[]
    priority?: NotificationPriority | NotificationPriority[]
    read?: boolean
    since?: number
    limit?: number
    offset?: number
  }): Promise<Notification[]> {
    try {
      const db = await getDB()
      let notifications: Notification[]

      // 如果有userId过滤，使用索引
      if (filters?.userId) {
        notifications = await db.getAllFromIndex('notifications', 'by-user', filters.userId)
      } else {
        notifications = await db.getAll('notifications')
      }

      // 应用其他过滤条件
      if (filters?.teamId) {
        notifications = notifications.filter(n => n.teamId === filters.teamId)
      }

      if (filters?.taskId) {
        notifications = notifications.filter(n => n.taskId === filters.taskId)
      }

      if (filters?.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type]
        notifications = notifications.filter(n => types.includes(n.type))
      }

      if (filters?.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
        notifications = notifications.filter(n => priorities.includes(n.priority))
      }

      if (filters?.read !== undefined) {
        notifications = notifications.filter(n => n.read === filters.read)
      }

      if (filters?.since !== undefined) {
        notifications = notifications.filter(n => n.createdAt >= filters.since!)
      }

      // 过滤已过期的通知
      const now = Date.now()
      notifications = notifications.filter(n => !n.expiresAt || n.expiresAt > now)

      // 按创建时间倒序排序
      notifications.sort((a, b) => b.createdAt - a.createdAt)

      // 分页
      const offset = filters?.offset || 0
      const limit = filters?.limit

      if (limit !== undefined) {
        notifications = notifications.slice(offset, offset + limit)
      } else if (offset > 0) {
        notifications = notifications.slice(offset)
      }

      return notifications
    } catch (error) {
      logger.error('[NotificationIndexedDB] 获取通知列表失败:', error instanceof Error ? error : undefined)
      return []
    }
  }

  /**
   * 获取未读数量
   */
  async getUnreadCount(userId?: string): Promise<number> {
    try {
      const db = await getDB()
      let notifications: Notification[]

      if (userId) {
        notifications = await db.getAllFromIndex('notifications', 'by-user', userId)
      } else {
        notifications = await db.getAll('notifications')
      }

      // 过滤未读且未过期的通知
      const now = Date.now()
      return notifications.filter(n => !n.read && (!n.expiresAt || n.expiresAt > now)).length
    } catch (error) {
      logger.error('[NotificationIndexedDB] 获取未读数量失败:', error instanceof Error ? error : undefined)
      return 0
    }
  }

  /**
   * 标记为已读
   */
  async markAsRead(id: string): Promise<boolean> {
    try {
      const db = await getDB()
      const notification = await db.get('notifications', id)

      if (notification) {
        notification.read = true
        await db.put('notifications', notification)
        logger.debug('[NotificationIndexedDB] 通知已标记为已读:', { id })
        return true
      }

      return false
    } catch (error) {
      logger.error('[NotificationIndexedDB] 标记已读失败:', error instanceof Error ? error : undefined)
      return false
    }
  }

  /**
   * 标记所有为已读
   */
  async markAllAsRead(userId?: string): Promise<number> {
    try {
      const db = await getDB()
      let notifications: Notification[]

      if (userId) {
        notifications = await db.getAllFromIndex('notifications', 'by-user', userId)
      } else {
        notifications = await db.getAll('notifications')
      }

      const tx = db.transaction('notifications', 'readwrite')
      let count = 0

      for (const notification of notifications) {
        if (!notification.read) {
          notification.read = true
          await tx.store.put(notification)
          count++
        }
      }

      await tx.done

      logger.debug('[NotificationIndexedDB] 批量标记已读:', { count })
      return count
    } catch (error) {
      logger.error('[NotificationIndexedDB] 批量标记已读失败:', error instanceof Error ? error : undefined)
      return 0
    }
  }

  /**
   * 删除通知
   */
  async deleteNotification(id: string): Promise<boolean> {
    try {
      const db = await getDB()
      await db.delete('notifications', id)
      logger.debug('[NotificationIndexedDB] 通知已删除:', { id })
      return true
    } catch (error) {
      logger.error('[NotificationIndexedDB] 删除通知失败:', error instanceof Error ? error : undefined)
      return false
    }
  }

  /**
   * 批量删除通知
   */
  async deleteNotifications(ids: string[]): Promise<number> {
    try {
      const db = await getDB()
      const tx = db.transaction('notifications', 'readwrite')

      for (const id of ids) {
        await tx.store.delete(id)
      }

      await tx.done

      logger.debug('[NotificationIndexedDB] 批量删除通知:', { count: ids.length })
      return ids.length
    } catch (error) {
      logger.error('[NotificationIndexedDB] 批量删除通知失败:', error instanceof Error ? error : undefined)
      return 0
    }
  }

  /**
   * 清理过期通知
   */
  async cleanupExpired(): Promise<number> {
    try {
      const db = await getDB()
      const notifications = await db.getAll('notifications')
      const now = Date.now()

      const expiredIds = notifications
        .filter(n => n.expiresAt && n.expiresAt < now)
        .map(n => n.id)

      if (expiredIds.length > 0) {
        await this.deleteNotifications(expiredIds)
        logger.info('[NotificationIndexedDB] 清理过期通知:', { count: expiredIds.length })
      }

      return expiredIds.length
    } catch (error) {
      logger.error('[NotificationIndexedDB] 清理过期通知失败:', error instanceof Error ? error : undefined)
      return 0
    }
  }

  /**
   * 强制执行最大数量限制
   */
  private async enforceMaxSize(): Promise<void> {
    try {
      const db = await getDB()
      const notifications = await db.getAll('notifications')

      if (notifications.length <= this.config.maxNotifications) {
        return
      }

      // 按创建时间排序，删除最旧的
      notifications.sort((a, b) => a.createdAt - b.createdAt)

      const toDelete = notifications.slice(0, notifications.length - this.config.maxNotifications)
      const idsToDelete = toDelete.map(n => n.id)

      await this.deleteNotifications(idsToDelete)

      logger.debug('[NotificationIndexedDB] 强制清理旧通知:', { count: idsToDelete.length })
    } catch (error) {
      logger.error('[NotificationIndexedDB] 强制清理失败:', error instanceof Error ? error : undefined)
    }
  }

  /**
   * 启动自动清理
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpired()
    }, this.config.cleanupInterval)

    logger.debug('[NotificationIndexedDB] 自动清理已启动')
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
      logger.debug('[NotificationIndexedDB] 自动清理已停止')
    }
  }

  /**
   * 清空所有通知
   */
  async clearAll(): Promise<number> {
    try {
      const db = await getDB()
      const notifications = await db.getAll('notifications')
      const tx = db.transaction('notifications', 'readwrite')

      for (const notification of notifications) {
        await tx.store.delete(notification.id)
      }

      await tx.done

      logger.info('[NotificationIndexedDB] 已清空所有通知:', { count: notifications.length })
      return notifications.length
    } catch (error) {
      logger.error('[NotificationIndexedDB] 清空所有通知失败:', error instanceof Error ? error : undefined)
      return 0
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    total: number
    unread: number
    byType: Record<NotificationType, number>
    byPriority: Record<NotificationPriority, number>
  }> {
    try {
      const db = await getDB()
      const notifications = await db.getAll('notifications')
      const now = Date.now()

      // 过滤未过期的通知
      const validNotifications = notifications.filter(n => !n.expiresAt || n.expiresAt > now)

      const unread = validNotifications.filter(n => !n.read).length

      const byType: Record<NotificationType, number> = {
        info: 0,
        success: 0,
        warning: 0,
        error: 0,
        task_assigned: 0,
        task_completed: 0,
        task_updated: 0,
        message: 0,
        system: 0,
      }

      const byPriority: Record<NotificationPriority, number> = {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      }

      for (const notification of validNotifications) {
        byType[notification.type]++
        byPriority[notification.priority]++
      }

      return {
        total: validNotifications.length,
        unread,
        byType,
        byPriority,
      }
    } catch (error) {
      logger.error('[NotificationIndexedDB] 获取统计信息失败:', error instanceof Error ? error : undefined)
      return {
        total: 0,
        unread: 0,
        byType: {
          info: 0,
          success: 0,
          warning: 0,
          error: 0,
          task_assigned: 0,
          task_completed: 0,
          task_updated: 0,
          message: 0,
          system: 0,
        },
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0,
        },
      }
    }
  }

  /**
   * 保存用户偏好设置
   */
  async saveUserPreferences(
    userId: string,
    preferences: {
      emailEnabled?: boolean
      emailThreshold?: NotificationPriority
      pushEnabled?: boolean
      pushThreshold?: NotificationPriority
      digestEnabled?: boolean
      digestFrequency?: 'hourly' | 'daily' | 'weekly'
      quietHoursStart?: string
      quietHoursEnd?: string
      timezone?: string
    }
  ): Promise<void> {
    try {
      const db = await getDB()

      const existing = await db.get('preferences', userId)

      const pref = {
        userId,
        emailEnabled: preferences.emailEnabled ?? existing?.emailEnabled ?? true,
        emailThreshold: preferences.emailThreshold ?? existing?.emailThreshold ?? 'high',
        pushEnabled: preferences.pushEnabled ?? existing?.pushEnabled ?? true,
        pushThreshold: preferences.pushThreshold ?? existing?.pushThreshold ?? 'medium',
        digestEnabled: preferences.digestEnabled ?? existing?.digestEnabled ?? false,
        digestFrequency: preferences.digestFrequency ?? existing?.digestFrequency ?? 'daily',
        quietHoursStart: preferences.quietHoursStart ?? existing?.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd ?? existing?.quietHoursEnd,
        timezone: preferences.timezone ?? existing?.timezone ?? 'UTC',
        updatedAt: Date.now(),
      }

      await db.put('preferences', pref)

      logger.debug('[NotificationIndexedDB] 用户偏好已保存:', { userId })
    } catch (error) {
      logger.error('[NotificationIndexedDB] 保存用户偏好失败:', error instanceof Error ? error : undefined)
      throw error
    }
  }

  /**
   * 获取用户偏好设置
   */
  async getUserPreferences(userId: string): Promise<{
    emailEnabled: boolean
    emailThreshold: NotificationPriority
    pushEnabled: boolean
    pushThreshold: NotificationPriority
    digestEnabled: boolean
    digestFrequency: 'hourly' | 'daily' | 'weekly'
    quietHoursStart?: string
    quietHoursEnd?: string
    timezone: string
  } | null> {
    try {
      const db = await getDB()
      const pref = await db.get('preferences', userId)

      if (!pref) {
        return null
      }

      return {
        emailEnabled: pref.emailEnabled,
        emailThreshold: pref.emailThreshold,
        pushEnabled: pref.pushEnabled,
        pushThreshold: pref.pushThreshold,
        digestEnabled: pref.digestEnabled,
        digestFrequency: pref.digestFrequency,
        quietHoursStart: pref.quietHoursStart,
        quietHoursEnd: pref.quietHoursEnd,
        timezone: pref.timezone,
      }
    } catch (error) {
      logger.error('[NotificationIndexedDB] 获取用户偏好失败:', error instanceof Error ? error : undefined)
      return null
    }
  }

  /**
   * 销毁存储实例
   */
  async destroy(): Promise<void> {
    this.stopAutoCleanup()

    if (dbPromise) {
      const db = await dbPromise
      db.close()
      dbPromise = null
      logger.info('[NotificationIndexedDB] 数据库连接已关闭')
    }
  }
}

/**
 * 单例实例
 */
export const notificationIndexedDB = new NotificationIndexedDBStorage()

/**
 * 导出类型
 */
export type { NotificationDB }