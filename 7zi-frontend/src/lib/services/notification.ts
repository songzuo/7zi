/**
 * Notification Service
 *
 * Provides notification functionality for both client and server
 * Server-side Socket.IO initialization happens lazily
 */

import { logger } from '@/lib/logger'
import { generateSecureId } from '@/lib/utils'
import type { Notification, NotificationFilter } from './notification-types'

// Re-export everything from notification-types (both values and types)
export {
  NotificationType,
  NotificationPriority,
  type Notification,
  type NotificationFilter,
  type NotificationSubscription,
} from './notification-types'

/**
 * Type for Socket.IO server (dynamically imported)
 */
type SocketIOServer = {
  on(event: string, listener: (...args: unknown[]) => void): void
  emit(event: string, data: unknown): void
  to(room: string): SocketIOServer
  close(): void
}

/**
 * Notification Service class
 * Socket.IO initialization happens lazily when needed
 */
export class NotificationService {
  private io: SocketIOServer | null = null
  private notifications: Map<string, Notification> = new Map()
  private notificationHistory: Notification[] = []
  private maxHistorySize = 1000

  constructor(io?: SocketIOServer) {
    // If a mock socket is provided (for testing), use it
    if (io) {
      this.io = io
    }
  }

  /**
   * Initialize Socket.IO server (server-side only, lazy loaded)
   */
  async initialize(httpServer: unknown): Promise<void> {
    if (this.io) return

    if (typeof window !== 'undefined') {
      logger.warn('[NotificationService] Cannot initialize server in browser')
      return
    }

    // Lazy load socket.io - this code path only runs on the server at runtime
    // Use eval to prevent bundler from analyzing the import
    try {
      // @ts-ignore - Dynamic server-only import
      const { Server } = await (0, eval)('import("socket.io")')
      this.io = new Server(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        transports: ['websocket', 'polling'],
      })
      logger.debug('[NotificationService] Socket.IO initialized')
    } catch (e) {
      logger.warn('[NotificationService] Socket.IO not available')
    }
  }

  /**
   * Create a notification
   */
  private create(data: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
    return {
      ...data,
      id: generateSecureId('notif'),
      read: false,
      createdAt: Date.now(),
    }
  }

  /**
   * Notify a specific user
   */
  notifyUser(userId: string, data: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
    const notification = this.create(data)
    notification.userId = userId
    this.notifications.set(notification.id, notification)
    if (this.io) this.io.to(`user:${userId}`).emit('notification', notification)
    return notification
  }

  /**
   * Broadcast to all
   */
  broadcast(data: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
    const notification = this.create(data)
    this.notifications.set(notification.id, notification)
    if (this.io) this.io.emit('notification', notification)
    return notification
  }

  /**
   * Notify - routes to notifyUser or broadcast based on userId presence
   */
  notify(data: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
    if (data.userId) {
      return this.notifyUser(data.userId, data)
    }
    return this.broadcast(data)
  }

  /**
   * Get notifications
   */
  getNotifications(filter?: NotificationFilter): Notification[] {
    let result = Array.from(this.notifications.values())
    if (filter?.read !== undefined) result = result.filter(n => n.read === filter.read)
    if (filter?.userId) result = result.filter(n => n.userId === filter.userId)
    if (filter?.teamId) result = result.filter(n => n.teamId === filter.teamId)
    if (filter?.taskId) result = result.filter(n => n.taskId === filter.taskId)
    if (filter?.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type]
      result = result.filter(n => types.includes(n.type))
    }
    if (filter?.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority]
      result = result.filter(n => priorities.includes(n.priority))
    }
    if (filter?.since !== undefined) {
      const since = filter.since
      result = result.filter(n => n.createdAt >= since)
    }
    if (filter?.startTime !== undefined) {
      const startTime = filter.startTime
      result = result.filter(n => n.createdAt >= startTime)
    }
    if (filter?.endTime !== undefined) {
      const endTime = filter.endTime
      result = result.filter(n => n.createdAt <= endTime)
    }

    // Sort by created time descending
    result = result.sort((a, b) => b.createdAt - a.createdAt)

    // Apply pagination
    const offset = filter?.offset || 0
    const limit = filter?.limit
    if (limit !== undefined) {
      result = result.slice(offset, offset + limit)
    } else if (offset > 0) {
      result = result.slice(offset)
    }

    return result
  }

  /**
   * Get unread count
   */
  getUnreadCount(filter?: NotificationFilter): number {
    return this.getNotifications({ ...filter, read: false }).length
  }

  /**
   * Mark as read
   */
  markAsRead(id: string): boolean {
    const n = this.notifications.get(id)
    if (n) {
      n.read = true
      return true
    }
    return false
  }

  /**
   * Mark all as read
   */
  markAllAsRead(filter?: NotificationFilter): number {
    const notifications = this.getNotifications({ ...filter, read: false })
    notifications.forEach(n => (n.read = true))
    return notifications.length
  }

  /**
   * Delete notification by ID
   */
  deleteNotification(id: string): boolean {
    if (this.notifications.has(id)) {
      this.notifications.delete(id)
      return true
    }
    return false
  }

  /**
   * Clean up expired notifications
   */
  cleanupExpired(): number {
    let count = 0
    const now = Date.now()

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.expiresAt && notification.expiresAt < now) {
        this.notifications.delete(id)
        count++
      }
    }

    return count
  }

  getIO(): SocketIOServer | null {
    return this.io
  }
}

// Singleton instance
export const notificationService = new NotificationService()
