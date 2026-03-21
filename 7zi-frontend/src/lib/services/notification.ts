/**
 * Real-time Notification Service
 *
 * Provides real-time notification functionality using WebSocket (Socket.IO)
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '@/lib/logger';

/**
 * Notification types
 */
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_UPDATED = 'task_updated',
  MESSAGE = 'message',
  SYSTEM = 'system',
}

/**
 * Priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  teamId?: string;
  taskId?: string;
  read: boolean;
  createdAt: number;
  expiresAt?: number;
}

/**
 * Notification subscription options
 */
export interface NotificationSubscription {
  userId?: string;
  teamId?: string;
  channels: string[];
}

/**
 * Notification filter options
 */
export interface NotificationFilter {
  type?: NotificationType | NotificationType[];
  priority?: NotificationPriority | NotificationPriority[];
  userId?: string;
  teamId?: string;
  taskId?: string;
  read?: boolean;
  since?: number;
}

/**
 * Notification Service class
 */
export class NotificationService {
  private io: SocketIOServer | null = null;
  private subscriptions: Map<string, NotificationSubscription> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private notificationHistory: Notification[] = [];
  private maxHistorySize = 1000;

  constructor() {
    // Initialize with placeholder
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: unknown): void {
    if (this.io) {
      logger.warn('[NotificationService] Already initialized');
      return;
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket: Socket) => {
      logger.log(`[NotificationService] Client connected: ${socket.id}`);

      // Handle subscription
      socket.on('subscribe', (subscription: NotificationSubscription) => {
        this.handleSubscribe(socket, subscription);
      });

      // Handle unsubscribe
      socket.on('unsubscribe', () => {
        this.handleUnsubscribe(socket);
      });

      // Mark notification as read
      socket.on('mark_read', (notificationId: string) => {
        this.markAsRead(notificationId);
      });

      // Mark all as read
      socket.on('mark_all_read', (filter: NotificationFilter) => {
        this.markAllAsRead(filter);
      });

      // Get unread count
      socket.on('unread_count', (filter: NotificationFilter) => {
        const count = this.getUnreadCount(filter);
        socket.emit('unread_count', count);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleUnsubscribe(socket);
        logger.log(`[NotificationService] Client disconnected: ${socket.id}`);
      });
    });

    logger.log('[NotificationService] Socket.IO server initialized');
  }

  /**
   * Handle subscription
   */
  private handleSubscribe(socket: Socket, subscription: NotificationSubscription): void {
    this.subscriptions.set(socket.id, subscription);

    // Join rooms based on channels
    subscription.channels.forEach(channel => {
      socket.join(channel);
    });

    // Send pending notifications
    const pendingNotifications = this.getNotifications({
      userId: subscription.userId,
      teamId: subscription.teamId,
      read: false,
    });

    socket.emit('initial_notifications', pendingNotifications);
    socket.emit('subscribed', { channels: subscription.channels });

    logger.log(`[NotificationService] Client ${socket.id} subscribed to channels:`, subscription.channels);
  }

  /**
   * Handle unsubscribe
   */
  private handleUnsubscribe(socket: Socket): void {
    const subscription = this.subscriptions.get(socket.id);
    if (subscription) {
      subscription.channels.forEach(channel => {
        socket.leave(channel);
      });
      this.subscriptions.delete(socket.id);
      logger.log(`[NotificationService] Client ${socket.id} unsubscribed`);
    }
  }

  /**
   * Create and send a notification
   */
  async notify(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<string> {
    const id = this.generateId();
    const fullNotification: Notification = {
      ...notification,
      id,
      read: false,
      createdAt: Date.now(),
    };

    // Store notification
    this.notifications.set(id, fullNotification);
    this.addToHistory(fullNotification);

    // Determine target channels
    const channels: string[] = [];
    if (notification.userId) {
      channels.push(`user:${notification.userId}`);
    }
    if (notification.teamId) {
      channels.push(`team:${notification.teamId}`);
    }

    // Broadcast to relevant channels
    if (this.io) {
      channels.forEach(channel => {
        this.io!.to(channel).emit('notification', fullNotification);
      });

      // Also broadcast to 'all' channel for system-wide notifications
      if (notification.type === NotificationType.SYSTEM) {
        this.io.to('all').emit('notification', fullNotification);
      }
    }

    logger.log(`[NotificationService] Notification sent: ${id}`, {
      type: notification.type,
      channels,
    });

    return id;
  }

  /**
   * Get notifications with optional filter
   */
  getNotifications(filter?: NotificationFilter): Notification[] {
    let result = Array.from(this.notifications.values());

    if (filter) {
      result = this.applyFilter(result, filter);
    }

    // Sort by createdAt descending
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get notification history
   */
  getHistory(limit = 50): Notification[] {
    return this.notificationHistory.slice(0, limit);
  }

  /**
   * Get unread count
   */
  getUnreadCount(filter?: NotificationFilter): number {
    const fullFilter: NotificationFilter = {
      ...filter,
      read: false,
    };
    return this.getNotifications(fullFilter).length;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;

      // Notify subscribed clients
      if (this.io) {
        const channels = this.getNotificationChannels(notification);
        channels.forEach(channel => {
          this.io!.to(channel).emit('notification_read', notificationId);
        });
      }
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(filter?: NotificationFilter): void {
    const notifications = this.getNotifications(filter);
    notifications.forEach(notification => {
      notification.read = true;
    });

    if (this.io) {
      this.io.emit('notifications_cleared', filter || {});
    }
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      this.notifications.delete(notificationId);

      // Notify subscribed clients
      if (this.io) {
        const channels = this.getNotificationChannels(notification);
        channels.forEach(channel => {
          this.io!.to(channel).emit('notification_deleted', notificationId);
        });
      }
    }
  }

  /**
   * Clean up expired notifications
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.expiresAt && notification.expiresAt < now) {
        this.notifications.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.log(`[NotificationService] Cleaned up ${cleaned} expired notifications`);
    }

    return cleaned;
  }

  /**
   * Apply filter to notifications
   */
  private applyFilter(notifications: Notification[], filter: NotificationFilter): Notification[] {
    return notifications.filter(notification => {
      // Type filter
      if (filter.type) {
        if (Array.isArray(filter.type)) {
          if (!filter.type.includes(notification.type)) return false;
        } else if (notification.type !== filter.type) {
          return false;
        }
      }

      // Priority filter
      if (filter.priority) {
        if (Array.isArray(filter.priority)) {
          if (!filter.priority.includes(notification.priority)) return false;
        } else if (notification.priority !== filter.priority) {
          return false;
        }
      }

      // User filter
      if (filter.userId && notification.userId !== filter.userId) {
        return false;
      }

      // Team filter
      if (filter.teamId && notification.teamId !== filter.teamId) {
        return false;
      }

      // Task filter
      if (filter.taskId && notification.taskId !== filter.taskId) {
        return false;
      }

      // Read status filter
      if (filter.read !== undefined && notification.read !== filter.read) {
        return false;
      }

      // Time filter
      if (filter.since && notification.createdAt < filter.since) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get channels for a notification
   */
  private getNotificationChannels(notification: Notification): string[] {
    const channels: string[] = [];
    if (notification.userId) {
      channels.push(`user:${notification.userId}`);
    }
    if (notification.teamId) {
      channels.push(`team:${notification.teamId}`);
    }
    return channels;
  }

  /**
   * Add notification to history
   */
  private addToHistory(notification: Notification): void {
    this.notificationHistory.unshift(notification);

    // Maintain history size
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory.pop();
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get Socket.IO server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

// Singleton instance
export const notificationService = new NotificationService();
