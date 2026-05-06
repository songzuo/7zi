/**
 * Client Notification Manager - 客户端通知管理器
 *
 * 集成 IndexedDB 持久化存储和 WebSocket 实时推送，提供：
 * - 通知分组与聚合
 * - 优先级排序
 * - 免打扰时段管理
 * - 实时推送集成
 *
 * @package 7zi-frontend
 * @version v1.12.2
 */

import type { Notification, NotificationType, NotificationPriority } from './notification-types'
import { notificationIndexedDB } from './notification-indexeddb'
import { logger } from '@/lib/logger'
import { websocketManager, ConnectionState } from '@/lib/websocket-manager'
import { generateSecureId } from '@/lib/utils'

/**
 * 通知分组
 */
export interface NotificationGroup {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  count: number
  notifications: Notification[]
  createdAt: number
  updatedAt: number
  expiresAt?: number
  userId?: string
  teamId?: string
  taskId?: string
}

/**
 * 分组配置
 */
export interface GroupingConfig {
  enabled: boolean
  maxGroupAge: number // 毫秒
  groupByType: boolean
  groupByPriority: boolean
  groupByUser: boolean
  groupByTask: boolean
  groupByTeam: boolean
}

/**
 * 通知统计
 */
export interface NotificationStats {
  total: number
  unread: number
  byType: Record<NotificationType, number>
  byPriority: Record<NotificationPriority, number>
  totalGroups: number
  activeGroups: number
}

/**
 * 通知事件类型
 */
export type NotificationEvent =
  | 'notification:received'
  | 'notification:read'
  | 'notification:deleted'
  | 'group:created'
  | 'group:updated'
  | 'stats:changed'

/**
 * 事件监听器
 */
export type NotificationEventListener = (event: NotificationEvent, data: unknown) => void

/**
 * 客户端通知管理器类
 */
export class ClientNotificationManager {
  private config: {
    grouping: GroupingConfig
    maxHistorySize: number
  }

  private eventListeners: Map<NotificationEvent, Set<NotificationEventListener>> = new Map()
  private stats: NotificationStats | null = null
  private wsConnected = false

  constructor(config?: {
    grouping?: Partial<GroupingConfig>
    maxHistorySize?: number
  }) {
    this.config = {
      grouping: {
        enabled: true,
        maxGroupAge: 24 * 60 * 60 * 1000, // 24小时
        groupByType: true,
        groupByPriority: false,
        groupByUser: true,
        groupByTask: false,
        groupByTeam: false,
        ...config?.grouping,
      },
      maxHistorySize: config?.maxHistorySize ?? 1000,
    }

    this.initialize()
  }

  /**
   * 初始化
   */
  private async initialize(): Promise<void> {
    try {
      // 监听 WebSocket 连接状态
      this.setupWebSocketListeners()

      // 监听 WebSocket 通知消息
      this.setupNotificationListeners()

      logger.info('[ClientNotificationManager] 初始化完成')
    } catch (error) {
      logger.error('[ClientNotificationManager] 初始化失败:', error instanceof Error ? error : undefined)
    }
  }

  /**
   * 设置 WebSocket 监听器
   */
  private setupWebSocketListeners(): void {
    websocketManager.onStateChange((state, previousState) => {
      this.wsConnected = state === ConnectionState.CONNECTED

      if (state === ConnectionState.CONNECTED) {
        logger.info('[ClientNotificationManager] WebSocket 已连接')
      }
    })
  }

  /**
   * 设置通知监听器
   */
  private setupNotificationListeners(): void {
    // 监听实时通知
    websocketManager.on('notification', (data: unknown) => {
      try {
        const notification = data as Notification
        this.handleIncomingNotification(notification)
      } catch (error) {
        logger.error('[ClientNotificationManager] 处理通知失败:', error instanceof Error ? error : undefined)
      }
    })
  }

  /**
   * 处理接收到的通知
   */
  private async handleIncomingNotification(notification: Notification): Promise<void> {
    try {
      // 保存到 IndexedDB
      await notificationIndexedDB.saveNotification(notification)

      // 触发事件
      this.emit('notification:received', notification)

      // 更新统计
      await this.updateStats()

      logger.debug('[ClientNotificationManager] 收到通知:', { id: notification.id, type: notification.type })
    } catch (error) {
      logger.error('[ClientNotificationManager] 处理通知失败:', error instanceof Error ? error : undefined)
    }
  }

  /**
   * 添加通知
   */
  async addNotification(
    notification: Omit<Notification, 'id' | 'read' | 'createdAt'>
  ): Promise<Notification> {
    const fullNotification: Notification = {
      ...notification,
      id: generateSecureId('client'),
      read: false,
      createdAt: Date.now(),
    }

    await notificationIndexedDB.saveNotification(fullNotification)
    this.emit('notification:received', fullNotification)
    await this.updateStats()

    return fullNotification
  }

  /**
   * 获取通知列表
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
    return await notificationIndexedDB.getNotifications(filters)
  }

  /**
   * 获取通知分组
   */
  async getGroups(filters?: {
    userId?: string
    teamId?: string
    taskId?: string
    type?: NotificationType | NotificationType[]
    priority?: NotificationPriority | NotificationPriority[]
    limit?: number
    offset?: number
  }): Promise<NotificationGroup[]> {
    const notifications = await this.getNotifications({
      ...filters,
      since: Date.now() - this.config.grouping.maxGroupAge,
    })

    const groupsMap = new Map<string, NotificationGroup>()

    for (const notification of notifications) {
      const groupId = this.generateGroupId(notification)
      let group = groupsMap.get(groupId)

      if (!group) {
        group = {
          id: groupId,
          type: notification.type,
          priority: notification.priority,
          title: notification.title,
          message: notification.message,
          count: 0,
          notifications: [],
          createdAt: notification.createdAt,
          updatedAt: notification.createdAt,
          expiresAt: notification.expiresAt,
          userId: notification.userId,
          teamId: notification.teamId,
          taskId: notification.taskId,
        }

        groupsMap.set(groupId, group)
      }

      group.count++
      group.notifications.push(notification)
      group.updatedAt = Math.max(group.updatedAt, notification.createdAt)

      // 更新消息显示
      if (group.count > 1) {
        group.message = `${group.notifications[0].message} (${group.count} 条通知)`
      }
    }

    let groups = Array.from(groupsMap.values())

    // 应用过滤
    if (filters?.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type]
      groups = groups.filter(g => types.includes(g.type))
    }

    if (filters?.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
      groups = groups.filter(g => priorities.includes(g.priority))
    }

    // 按更新时间倒序
    groups.sort((a, b) => b.updatedAt - a.updatedAt)

    // 分页
    const offset = filters?.offset || 0
    const limit = filters?.limit

    if (limit !== undefined) {
      groups = groups.slice(offset, offset + limit)
    } else if (offset > 0) {
      groups = groups.slice(offset)
    }

    return groups
  }

  /**
   * 生成分组 ID
   */
  private generateGroupId(notification: Notification): string {
    if (!this.config.grouping.enabled) {
      return notification.id
    }

    const parts: string[] = []

    if (this.config.grouping.groupByType) {
      parts.push(`type:${notification.type}`)
    }

    if (this.config.grouping.groupByPriority) {
      parts.push(`priority:${notification.priority}`)
    }

    if (this.config.grouping.groupByUser && notification.userId) {
      parts.push(`user:${notification.userId}`)
    }

    if (this.config.grouping.groupByTask && notification.taskId) {
      parts.push(`task:${notification.taskId}`)
    }

    if (this.config.grouping.groupByTeam && notification.teamId) {
      parts.push(`team:${notification.teamId}`)
    }

    return parts.length > 0 ? parts.join('|') : notification.id
  }

  /**
   * 获取未读数量
   */
  async getUnreadCount(userId?: string): Promise<number> {
    return await notificationIndexedDB.getUnreadCount(userId)
  }

  /**
   * 标记为已读
   */
  async markAsRead(id: string): Promise<boolean> {
    const success = await notificationIndexedDB.markAsRead(id)

    if (success) {
      this.emit('notification:read', { id })
      await this.updateStats()
    }

    return success
  }

  /**
   * 标记所有为已读
   */
  async markAllAsRead(userId?: string): Promise<number> {
    const count = await notificationIndexedDB.markAllAsRead(userId)

    if (count > 0) {
      this.emit('notification:read', { userId, count })
      await this.updateStats()
    }

    return count
  }

  /**
   * 删除通知
   */
  async deleteNotification(id: string): Promise<boolean> {
    const success = await notificationIndexedDB.deleteNotification(id)

    if (success) {
      this.emit('notification:deleted', { id })
      await this.updateStats()
    }

    return success
  }

  /**
   * 批量删除通知
   */
  async deleteNotifications(ids: string[]): Promise<number> {
    const count = await notificationIndexedDB.deleteNotifications(ids)

    if (count > 0) {
      this.emit('notification:deleted', { ids, count })
      await this.updateStats()
    }

    return count
  }

  /**
   * 清理过期通知
   */
  async cleanupExpired(): Promise<number> {
    return await notificationIndexedDB.cleanupExpired()
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<NotificationStats> {
    if (!this.stats) {
      await this.updateStats()
    }

    return this.stats!
  }

  /**
   * 更新统计信息
   */
  private async updateStats(): Promise<void> {
    const dbStats = await notificationIndexedDB.getStats()
    const groups = await this.getGroups()

    const stats: NotificationStats = {
      ...dbStats,
      totalGroups: groups.length,
      activeGroups: groups.filter(g => g.count > 1).length,
    }

    this.stats = stats
    this.emit('stats:changed', stats)
  }

  /**
   * 检查免打扰时段
   */
  async isQuietHoursActive(userId: string): Promise<boolean> {
    try {
      const preferences = await notificationIndexedDB.getUserPreferences(userId)

      if (!preferences || !preferences.quietHoursStart || !preferences.quietHoursEnd) {
        return false
      }

      return this.checkQuietHours(preferences.quietHoursStart, preferences.quietHoursEnd, preferences.timezone)
    } catch (error) {
      logger.error('[ClientNotificationManager] 检查免打扰时段失败:', error instanceof Error ? error : undefined)
      return false
    }
  }

  /**
   * 检查当前时间是否在免打扰时段
   */
  private checkQuietHours(start: string, end: string, timezone: string = 'UTC'): boolean {
    try {
      const now = new Date()

      // 验证时区
      try {
        now.toLocaleTimeString('en-US', { timeZone: timezone })
      } catch {
        timezone = 'UTC'
      }

      // 获取当前时间（用户时区）
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }

      const currentTimeStr = now.toLocaleTimeString('en-US', options)

      if (!currentTimeStr || !currentTimeStr.includes(':')) {
        return false
      }

      const currentMinutes = this.timeToMinutes(currentTimeStr)
      const startMinutes = this.timeToMinutes(start)
      const endMinutes = this.timeToMinutes(end)

      // 判断是否在时段内
      if (startMinutes < endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes
      } else {
        // 跨午夜：如 22:00 - 06:00
        return currentMinutes >= startMinutes || currentMinutes < endMinutes
      }
    } catch (error) {
      logger.error('[ClientNotificationManager] 检查免打扰时段失败:', error instanceof Error ? error : undefined)
      return false
    }
  }

  /**
   * 时间字符串转分钟数
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * 注册事件监听器
   */
  on(event: NotificationEvent, listener: NotificationEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }

    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * 取消事件监听器
   */
  off(event: NotificationEvent, listener: NotificationEventListener): void {
    const listeners = this.eventListeners.get(event)

    if (listeners) {
      listeners.delete(listener)

      if (listeners.size === 0) {
        this.eventListeners.delete(event)
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: NotificationEvent, data: unknown): void {
    const listeners = this.eventListeners.get(event)

    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event, data)
        } catch (error) {
          logger.error('[ClientNotificationManager] 事件监听器错误:', error instanceof Error ? error : undefined)
        }
      }
    }
  }

  /**
   * 获取用户偏好设置
   */
  async getUserPreferences(userId: string) {
    return await notificationIndexedDB.getUserPreferences(userId)
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
    await notificationIndexedDB.saveUserPreferences(userId, preferences)
  }

  /**
   * 获取配置
   */
  getConfig() {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(config: {
    grouping?: Partial<GroupingConfig>
    maxHistorySize?: number
  }): void {
    if (config.grouping) {
      this.config.grouping = { ...this.config.grouping, ...config.grouping }
    }

    if (config.maxHistorySize !== undefined) {
      this.config.maxHistorySize = config.maxHistorySize
    }

    logger.info('[ClientNotificationManager] 配置已更新')
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    this.eventListeners.clear()
    this.stats = null

    logger.info('[ClientNotificationManager] 已销毁')
  }
}

/**
 * 单例实例
 */
export const clientNotificationManager = new ClientNotificationManager()

/**
 * 导出类型
 */
export type { NotificationEvent, NotificationEventListener, NotificationStats }
