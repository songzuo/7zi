/**
 * Notification Manager - Centralized notification management
 *
 * Provides a unified interface for notification management with:
 * - Grouping and aggregation of similar notifications
 * - Priority-based ordering
 * - Quiet hours enforcement
 * - Integration with enhanced notification service
 *
 * @module notification-manager
 */

import { NotificationType, NotificationPriority } from './notification-types'
import type { Notification, NotificationFilter } from './notification-types'
import { enhancedNotificationService } from './notification-enhanced'
import { generateSecureId } from '@/lib/utils'
import { logger } from '@/lib/logger'

// Re-export types for convenience
export { NotificationType, NotificationPriority } from './notification-types'
export type { Notification, NotificationFilter } from './notification-types'

/**
 * Notification group - aggregation of similar notifications
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
 * Grouping strategy configuration
 */
export interface GroupingConfig {
  enabled: boolean
  maxGroupAge: number // Maximum age of a group in milliseconds
  groupByType: boolean // Group notifications by type
  groupByPriority: boolean // Group notifications by priority
  groupByUser: boolean // Group notifications by user
  groupByTask: boolean // Group notifications by task
  groupByTeam: boolean // Group notifications by team
}

/**
 * Notification manager configuration
 */
export interface NotificationManagerConfig {
  grouping: GroupingConfig
  maxHistorySize: number
  enableQuietHours: boolean
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: NotificationManagerConfig = {
  grouping: {
    enabled: true,
    maxGroupAge: 24 * 60 * 60 * 1000, // 24 hours
    groupByType: true,
    groupByPriority: false,
    groupByUser: true,
    groupByTask: false,
    groupByTeam: false,
  },
  maxHistorySize: 1000,
  enableQuietHours: true,
}

/**
 * Notification Manager Class
 */
export class NotificationManager {
  private config: NotificationManagerConfig
  private groups: Map<string, NotificationGroup> = new Map()
  private notifications: Map<string, Notification> = new Map()

  constructor(config: Partial<NotificationManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    logger.info('[NotificationManager] Initialized with config:', { config: this.config })
  }

  /**
   * Generate a unique group ID for a notification
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
   * Add a notification to the manager
   */
  async addNotification(
    notification: Omit<Notification, 'id' | 'read' | 'createdAt'>,
    options: {
      skipDelivery?: boolean
      deliveryOptions?: Parameters<typeof enhancedNotificationService.notify>[1]
    } = {}
  ): Promise<Notification> {
    // Create full notification
    const fullNotification: Notification = {
      ...notification,
      id: generateSecureId('notif'),
      read: false,
      createdAt: Date.now(),
    }

    // Store in memory
    this.notifications.set(fullNotification.id, fullNotification)

    // Add to grouping
    this.addToGrouping(fullNotification)

    // Enforce max history size
    this.enforceMaxHistorySize()

    // Deliver notification via enhanced service
    if (!options.skipDelivery) {
      await enhancedNotificationService.notify(fullNotification, options.deliveryOptions || {})
    }

    logger.info('[NotificationManager] Notification added:', {
      id: fullNotification.id,
      type: fullNotification.type,
      priority: fullNotification.priority,
    })

    return fullNotification
  }

  /**
   * Add notification to grouping
   */
  private addToGrouping(notification: Notification): void {
    if (!this.config.grouping.enabled) {
      return
    }

    const groupId = this.generateGroupId(notification)
    const existingGroup = this.groups.get(groupId)

    if (existingGroup) {
      // Update existing group
      existingGroup.count++
      existingGroup.notifications.push(notification)
      existingGroup.updatedAt = notification.createdAt

      // Update message to reflect count
      if (existingGroup.count > 1) {
        existingGroup.message = `${existingGroup.notifications[0].message} (${existingGroup.count} notifications)`
      }

      logger.debug('[NotificationManager] Added to existing group:', { groupId, count: existingGroup.count })
    } else {
      // Create new group
      const group: NotificationGroup = {
        id: groupId,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        count: 1,
        notifications: [notification],
        createdAt: notification.createdAt,
        updatedAt: notification.createdAt,
        expiresAt: notification.expiresAt,
        userId: notification.userId,
        teamId: notification.teamId,
        taskId: notification.taskId,
      }

      this.groups.set(groupId, group)
      logger.debug('[NotificationManager] Created new group:', { groupId, type: group.type })
    }

    // Clean up old groups
    this.cleanupOldGroups()
  }

  /**
   * Clean up old groups
   */
  private cleanupOldGroups(): void {
    const now = Date.now()
    const maxAge = this.config.grouping.maxGroupAge

    for (const [id, group] of this.groups.entries()) {
      const age = now - group.updatedAt

      if (age > maxAge) {
        this.groups.delete(id)
        logger.debug('[NotificationManager] Removed old group:', { id, age })
      }
    }

    // Also clean up expired groups
    for (const [id, group] of this.groups.entries()) {
      if (group.expiresAt && group.expiresAt < now) {
        this.groups.delete(id)
        logger.debug('[NotificationManager] Removed expired group:', { id })
      }
    }
  }

  /**
   * Enforce maximum history size
   */
  private enforceMaxHistorySize(): void {
    if (this.notifications.size <= this.config.maxHistorySize) {
      return
    }

    // Get sorted notifications by createdAt
    const sortedNotifications = Array.from(this.notifications.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    )

    // Remove oldest notifications
    const toRemove = sortedNotifications.slice(0, this.notifications.size - this.config.maxHistorySize)

    for (const notification of toRemove) {
      this.notifications.delete(notification.id)

      // Also remove from groups
      for (const [groupId, group] of this.groups.entries()) {
        const index = group.notifications.findIndex(n => n.id === notification.id)

        if (index !== -1) {
          group.notifications.splice(index, 1)
          group.count--

          if (group.count === 0) {
            this.groups.delete(groupId)
          }
        }
      }
    }

    logger.debug('[NotificationManager] Enforced max history size:', {
      removed: toRemove.length,
      size: this.notifications.size,
    })
  }

  /**
   * Get notifications with optional grouping
   */
  getNotifications(filters?: NotificationFilter & { grouped?: boolean }): {
    notifications: Notification[]
    groups?: NotificationGroup[]
  } {
    let notifications = Array.from(this.notifications.values())

    // Apply filters
    if (filters?.read !== undefined) {
      notifications = notifications.filter(n => n.read === filters.read)
    }

    if (filters?.userId) {
      notifications = notifications.filter(n => n.userId === filters.userId)
    }

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

    if (filters?.since !== undefined) {
      notifications = notifications.filter(n => n.createdAt >= filters.since!)
    }

    if (filters?.startTime !== undefined) {
      notifications = notifications.filter(n => n.createdAt >= filters.startTime!)
    }

    if (filters?.endTime !== undefined) {
      notifications = notifications.filter(n => n.createdAt <= filters.endTime!)
    }

    // Sort by created time descending
    notifications = notifications.sort((a, b) => b.createdAt - a.createdAt)

    // Apply pagination
    const offset = filters?.offset || 0
    const limit = filters?.limit

    if (limit !== undefined) {
      notifications = notifications.slice(offset, offset + limit)
    } else if (offset > 0) {
      notifications = notifications.slice(offset)
    }

    // Return grouped results if requested
    if (filters?.grouped && this.config.grouping.enabled) {
      let groups = Array.from(this.groups.values())

      // Apply filters to groups
      if (filters?.userId) {
        groups = groups.filter(g => g.userId === filters.userId)
      }

      if (filters?.teamId) {
        groups = groups.filter(g => g.teamId === filters.teamId)
      }

      if (filters?.taskId) {
        groups = groups.filter(g => g.taskId === filters.taskId)
      }

      if (filters?.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type]
        groups = groups.filter(g => types.includes(g.type))
      }

      if (filters?.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
        groups = groups.filter(g => priorities.includes(g.priority))
      }

      // Sort by updated time descending
      groups = groups.sort((a, b) => b.updatedAt - a.updatedAt)

      // Apply pagination to groups
      if (limit !== undefined) {
        groups = groups.slice(offset, offset + limit)
      } else if (offset > 0) {
        groups = groups.slice(offset)
      }

      return { notifications, groups }
    }

    return { notifications }
  }

  /**
   * Get notification groups
   */
  getGroups(filters?: {
    userId?: string
    teamId?: string
    taskId?: string
    type?: NotificationType | NotificationType[]
    priority?: NotificationPriority | NotificationPriority[]
    limit?: number
    offset?: number
  }): NotificationGroup[] {
    let groups = Array.from(this.groups.values())

    // Apply filters
    if (filters?.userId) {
      groups = groups.filter(g => g.userId === filters.userId)
    }

    if (filters?.teamId) {
      groups = groups.filter(g => g.teamId === filters.teamId)
    }

    if (filters?.taskId) {
      groups = groups.filter(g => g.taskId === filters.taskId)
    }

    if (filters?.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type]
      groups = groups.filter(g => types.includes(g.type))
    }

    if (filters?.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
      groups = groups.filter(g => priorities.includes(g.priority))
    }

    // Sort by updated time descending
    groups = groups.sort((a, b) => b.updatedAt - a.updatedAt)

    // Apply pagination
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
   * Get unread count
   */
  getUnreadCount(userId?: string): number {
    const unreadNotifications = Array.from(this.notifications.values()).filter(n => !n.read)

    if (userId) {
      return unreadNotifications.filter(n => n.userId === userId).length
    }

    return unreadNotifications.length
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId)

    if (notification) {
      notification.read = true
      enhancedNotificationService.markAsRead(notificationId)
      return true
    }

    return false
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId?: string): number {
    let count = 0

    for (const notification of this.notifications.values()) {
      if (!notification.read && (!userId || notification.userId === userId)) {
        notification.read = true
        enhancedNotificationService.markAsRead(notification.id)
        count++
      }
    }

    if (userId) {
      enhancedNotificationService.markAllAsRead(userId)
    }

    return count
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId)

    if (notification) {
      this.notifications.delete(notificationId)

      // Remove from groups
      for (const [groupId, group] of this.groups.entries()) {
        const index = group.notifications.findIndex(n => n.id === notificationId)

        if (index !== -1) {
          group.notifications.splice(index, 1)
          group.count--

          if (group.count === 0) {
            this.groups.delete(groupId)
          }
        }
      }

      enhancedNotificationService.deleteNotification(notificationId)
      return true
    }

    return false
  }

  /**
   * Check if quiet hours are active for a user
   */
  isQuietHoursActive(userId?: string): boolean {
    if (!this.config.enableQuietHours) {
      return false
    }

    if (!userId) {
      return false
    }

    const preferences = enhancedNotificationService.getUserPreferences(userId)

    if (!preferences || !preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false
    }

    // Use the enhanced service's quiet hours check
    const quietHours = this.checkQuietHours(
      preferences.quietHoursStart,
      preferences.quietHoursEnd,
      preferences.timezone
    )

    return quietHours
  }

  /**
   * Check if current time is within quiet hours
   */
  private checkQuietHours(start: string, end: string, timezone: string = 'UTC'): boolean {
    try {
      const now = new Date(Date.now())

      // Validate timezone
      try {
        now.toLocaleTimeString('en-US', { timeZone: timezone })
      } catch (tzError) {
        logger.warn(`[NotificationManager] Invalid timezone "${timezone}", falling back to UTC`)
        timezone = 'UTC'
      }

      // Get current time in user's timezone
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }

      const currentTimeStr = now.toLocaleTimeString('en-US', options)

      if (!currentTimeStr || !currentTimeStr.includes(':')) {
        logger.error('[NotificationManager] Failed to get current time string')
        return false
      }

      const currentMinutes = this.timeToMinutes(currentTimeStr)
      const startMinutes = this.timeToMinutes(start)
      const endMinutes = this.timeToMinutes(end)

      // Check if current time is between start and end
      if (startMinutes < endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes
      } else {
        // Over midnight: e.g., 22:00 - 06:00
        return currentMinutes >= startMinutes || currentMinutes < endMinutes
      }
    } catch (error) {
      logger.error('[NotificationManager] Failed to check quiet hours:', error instanceof Error ? error : undefined)
      return false
    }
  }

  /**
   * Convert "HH:mm" to minutes from midnight
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalNotifications: number
    unreadNotifications: number
    totalGroups: number
    activeGroups: number
  } {
    const totalNotifications = this.notifications.size
    const unreadNotifications = Array.from(this.notifications.values()).filter(n => !n.read).length
    const totalGroups = this.groups.size
    const activeGroups = Array.from(this.groups.values()).filter(g => g.count > 1).length

    return {
      totalNotifications,
      unreadNotifications,
      totalGroups,
      activeGroups,
    }
  }

  /**
   * Clear all notifications (for testing)
   */
  clear(): void {
    this.notifications.clear()
    this.groups.clear()
    logger.debug('[NotificationManager] Cleared all notifications')
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotificationManagerConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('[NotificationManager] Updated config:', { config: this.config })
  }

  /**
   * Get current configuration
   */
  getConfig(): NotificationManagerConfig {
    return { ...this.config }
  }
}

// Singleton instance
export const notificationManager = new NotificationManager()
