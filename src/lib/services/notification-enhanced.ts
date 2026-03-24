/**
 * Enhanced Notification Service
 *
 * Integrates WebSocket real-time notifications, email notifications, and persistent storage
 */

import { notificationService as baseService, Notification, NotificationType, NotificationPriority } from '@/lib/services/notification';
import { emailService, EmailRecipient } from '@/lib/services/email';
import { notificationStorage } from '@/lib/services/notification-storage';
import { logger } from '@/lib/logger';

/**
 * Priority order (lower number = higher priority)
 */
const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * User notification preferences
 */
export interface UserNotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  emailThreshold: NotificationPriority;
  pushEnabled: boolean;
  pushThreshold: NotificationPriority;
  digestEnabled: boolean;
  digestFrequency: 'hourly' | 'daily' | 'weekly';
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;   // HH:mm format
  timezone: string;
}

/**
 * Notification delivery options
 */
export interface NotificationDeliveryOptions {
  skipEmail?: boolean;
  skipPush?: boolean;
  skipStorage?: boolean;
  forceEmail?: boolean;
  emailRecipients?: EmailRecipient[];
}

/**
 * Enhanced Notification Service class
 */
export class EnhancedNotificationService {
  private storageInitialized = false;

  /**
   * Initialize the enhanced notification service
   */
  async initialize(dbPath?: string): Promise<void> {
    try {
      // Initialize storage
      notificationStorage.initialize();
      this.storageInitialized = true;

      // Initialize email service if configured
      const apiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.FROM_EMAIL || process.env.CONTACT_EMAIL || 'noreply@7zi.studio';
      const contactEmail = process.env.CONTACT_EMAIL;

      if (apiKey) {
        emailService.initialize({
          apiKey,
          fromEmail,
          replyTo: contactEmail,
        });
      }

      logger.info('[EnhancedNotificationService] Initialized');
    } catch (error) {
      logger.error('[EnhancedNotificationService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Send a notification with all delivery channels
   */
  async notify(
    notification: Omit<Notification, 'id' | 'read' | 'createdAt'>,
    options: NotificationDeliveryOptions = {}
  ): Promise<{ success: boolean; notificationId: string; emailSent: boolean; error?: string }> {
    try {
      // Generate ID
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fullNotification: Notification = {
        ...notification,
        id,
        read: false,
        createdAt: Date.now(),
      };

      let emailSent = false;
      let emailError: string | undefined;

      // 1. Store in database
      if (!options.skipStorage && this.storageInitialized) {
        notificationStorage.insertNotification({
          id: fullNotification.id,
          type: fullNotification.type,
          priority: fullNotification.priority,
          title: fullNotification.title,
          message: fullNotification.message,
          data: fullNotification.data ? JSON.stringify(fullNotification.data) : undefined,
          userId: fullNotification.userId,
          teamId: fullNotification.teamId,
          taskId: fullNotification.taskId,
          expiresAt: fullNotification.expiresAt,
        });
      }

      // 2. Send real-time WebSocket notification
      if (!options.skipPush) {
        await baseService.notify(fullNotification);
      }

      // 3. Send email notification (if enabled and threshold met)
      if (!options.skipEmail && emailService.isEnabled()) {
        const shouldSendEmail = await this.shouldSendEmail(fullNotification, options);

        if (shouldSendEmail) {
          const emailResult = await this.sendEmailNotification(fullNotification, options);

          if (emailResult.success) {
            emailSent = true;

            // Mark email as sent in storage
            if (this.storageInitialized) {
              notificationStorage.markEmailSent(id, emailResult.messageId);
            }

            // Log delivery
            notificationStorage.logDelivery({
              notificationId: id,
              channel: 'email',
              recipient: (options.emailRecipients && Array.isArray(options.emailRecipients))
                ? options.emailRecipients.map(r => r.email).join(', ')
                : (fullNotification.userId || 'unknown'),
              status: 'sent',
              sentAt: Date.now(),
              deliveryMetadata: JSON.stringify({ messageId: emailResult.messageId }),
            });
          } else {
            emailError = emailResult.error;

            // Log failed delivery
            notificationStorage.logDelivery({
              notificationId: id,
              channel: 'email',
              recipient: 'unknown',
              status: 'failed',
              errorMessage: emailError,
              sentAt: Date.now(),
            });
          }
        }
      }

      // Log WebSocket delivery
      notificationStorage.logDelivery({
        notificationId: id,
        channel: 'websocket',
        recipient: fullNotification.userId || fullNotification.teamId || 'broadcast',
        status: 'sent',
        sentAt: Date.now(),
      });

      logger.info(`[EnhancedNotificationService] Notification sent: ${id}`, {
        type: notification.type,
        priority: notification.priority,
        emailSent,
      });

      return {
        success: true,
        notificationId: id,
        emailSent,
      };
    } catch (error) {
      logger.error('[EnhancedNotificationService] Failed to send notification:', error);
      return {
        success: false,
        notificationId: '',
        emailSent: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Determine if email should be sent
   */
  private async shouldSendEmail(
    notification: Notification,
    options: NotificationDeliveryOptions
  ): Promise<boolean> {
    // Force send if requested
    if (options.forceEmail) {
      return true;
    }

    // Check if user has provided email recipients
    if (options.emailRecipients) {
      return true;
    }

    // Need user ID to check preferences
    if (!notification.userId) {
      return false;
    }

    // Get user preferences
    const preferences = notificationStorage.getUserPreferences(notification.userId);

    if (!preferences) {
      // Default: send only urgent and high priority
      return notification.priority === NotificationPriority.URGENT ||
             notification.priority === NotificationPriority.HIGH;
    }

    // Check if email is enabled
    if (!preferences.emailEnabled) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHoursStart && preferences.quietHoursEnd) {
      if (this.isInQuietHours(preferences.quietHoursStart, preferences.quietHoursEnd, preferences.timezone)) {
        return false;
      }
    }

    // Check priority threshold
    const notificationPriorityLevel = PRIORITY_ORDER[notification.priority];
    const thresholdPriorityLevel = PRIORITY_ORDER[preferences.emailThreshold as NotificationPriority];

    return notificationPriorityLevel <= thresholdPriorityLevel;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(start: string, end: string, timezone: string = 'UTC'): boolean {
    try {
      const now = new Date();

      // Get current time in user's timezone
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };

      const currentTimeStr = now.toLocaleTimeString('en-US', options); // "HH:mm"

      const currentMinutes = this.timeToMinutes(currentTimeStr);
      const startMinutes = this.timeToMinutes(start);
      const endMinutes = this.timeToMinutes(end);

      // Check if current time is between start and end
      if (startMinutes < endMinutes) {
        // Normal case: 22:00 - 08:00 (overnight)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      } else {
        // Over midnight: 22:00 - 06:00
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch (error) {
      logger.error('[EnhancedNotificationService] Failed to check quiet hours:', error);
      return false;
    }
  }

  /**
   * Convert "HH:mm" to minutes from midnight
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    notification: Notification,
    options: NotificationDeliveryOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Determine email type
      const emailType = this.notificationTypeToEmailType(notification.type);

      // Build action URL
      const actionUrl = this.buildActionUrl(notification);

      // Get recipients
      const recipients = options.emailRecipients || this.getNotificationRecipients(notification);

      if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
        return {
          success: false,
          error: 'No email recipients',
        };
      }

      // Send email
      const result = await emailService.sendNotificationEmail({
        to: recipients,
        title: notification.title,
        message: notification.message,
        type: emailType,
        actionUrl,
        actionText: this.getActionText(notification),
        metadata: notification.data,
      });

      return result;
    } catch (error) {
      logger.error('[EnhancedNotificationService] Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert notification type to email type
   */
  private notificationTypeToEmailType(type: NotificationType): 'info' | 'success' | 'warning' | 'error' {
    switch (type) {
      case NotificationType.SUCCESS:
      case NotificationType.TASK_COMPLETED:
        return 'success';
      case NotificationType.WARNING:
        return 'warning';
      case NotificationType.ERROR:
        return 'error';
      default:
        return 'info';
    }
  }

  /**
   * Build action URL for notification
   */
  private buildActionUrl(notification: Notification): string | undefined {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://7zi.com';

    if (notification.taskId) {
      return `${baseUrl}/tasks/${notification.taskId}`;
    }

    if (notification.teamId) {
      return `${baseUrl}/teams/${notification.teamId}`;
    }

    if (notification.userId) {
      return `${baseUrl}/dashboard`;
    }

    return undefined;
  }

  /**
   * Get action text for notification
   */
  private getActionText(notification: Notification): string {
    switch (notification.type) {
      case NotificationType.TASK_ASSIGNED:
        return 'View Task';
      case NotificationType.TASK_COMPLETED:
        return 'View Result';
      case NotificationType.TASK_UPDATED:
        return 'See Changes';
      case NotificationType.MESSAGE:
        return 'Reply';
      default:
        return 'View Details';
    }
  }

  /**
   * Get email recipients for notification
   */
  private getNotificationRecipients(notification: Notification): EmailRecipient | EmailRecipient[] | undefined {
    // If notification has user ID, we would normally fetch user's email from user service
    // For now, return undefined (should be provided via options)
    return undefined;
  }

  /**
   * Get notifications from storage
   */
  getNotifications(filters?: {
    userId?: string;
    teamId?: string;
    taskId?: string;
    type?: NotificationType;
    priority?: NotificationPriority;
    read?: boolean;
    since?: number;
    limit?: number;
    offset?: number;
  }): Notification[] {
    if (!this.storageInitialized) {
      return baseService.getNotifications(filters);
    }

    const storageNotifications = notificationStorage.getNotifications({
      userId: filters?.userId,
      teamId: filters?.teamId,
      taskId: filters?.taskId,
      type: filters?.type,
      priority: filters?.priority,
      read: filters?.read,
      since: filters?.since,
      limit: filters?.limit,
      offset: filters?.offset,
    });

    // Convert storage format to Notification interface
    return storageNotifications.map(n => ({
      id: n.id,
      type: n.type as NotificationType,
      priority: n.priority as NotificationPriority,
      title: n.title,
      message: n.message,
      data: n.data ? JSON.parse(n.data) : undefined,
      userId: n.userId || undefined,
      teamId: n.teamId || undefined,
      taskId: n.taskId || undefined,
      read: n.read === 1,
      createdAt: n.createdAt,
      expiresAt: n.expiresAt || undefined,
    }));
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId?: string): number {
    if (!this.storageInitialized) {
      return baseService.getUnreadCount(userId ? { userId } : undefined);
    }

    if (userId) {
      return notificationStorage.getUnreadCount(userId);
    }

    // Get all unread count
    const notifications = notificationStorage.getNotifications({ read: false });
    return notifications.length;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    baseService.markAsRead(notificationId);

    if (this.storageInitialized) {
      notificationStorage.markAsRead(notificationId);
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId?: string): void {
    baseService.markAllAsRead(userId ? { userId } : undefined);

    if (this.storageInitialized && userId) {
      notificationStorage.markAllAsRead(userId);
    }
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): void {
    baseService.deleteNotification(notificationId);

    if (this.storageInitialized) {
      notificationStorage.deleteNotification(notificationId);
    }
  }

  /**
   * Set user notification preferences
   */
  setUserPreferences(preferences: UserNotificationPreferences): void {
    if (!this.storageInitialized) {
      throw new Error('Storage not initialized');
    }

    notificationStorage.setUserPreferences(preferences.userId, {
      emailEnabled: preferences.emailEnabled,
      emailThreshold: preferences.emailThreshold,
      pushEnabled: preferences.pushEnabled,
      pushThreshold: preferences.pushThreshold,
      digestEnabled: preferences.digestEnabled,
      digestFrequency: preferences.digestFrequency,
      quietHoursStart: preferences.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd,
      timezone: preferences.timezone,
    });
  }

  /**
   * Get user notification preferences
   */
  getUserPreferences(userId: string): UserNotificationPreferences | null {
    if (!this.storageInitialized) {
      return null;
    }

    const prefs = notificationStorage.getUserPreferences(userId);

    if (!prefs) {
      return null;
    }

    return {
      userId,
      emailEnabled: prefs.emailEnabled === 1,
      emailThreshold: prefs.emailThreshold as NotificationPriority,
      pushEnabled: prefs.pushEnabled === 1,
      pushThreshold: prefs.pushThreshold as NotificationPriority,
      digestEnabled: prefs.digestEnabled === 1,
      digestFrequency: prefs.digestFrequency as 'hourly' | 'daily' | 'weekly',
      quietHoursStart: prefs.quietHoursStart || undefined,
      quietHoursEnd: prefs.quietHoursEnd || undefined,
      timezone: prefs.timezone,
    };
  }

  /**
   * Get notification statistics
   */
  getStats() {
    const storageStats = this.storageInitialized ? notificationStorage.getStats() : null;

    return {
      ...storageStats,
      emailEnabled: emailService.isEnabled(),
    };
  }

  /**
   * Clean up expired notifications
   */
  cleanupExpired(): number {
    let count = baseService.cleanupExpired();

    if (this.storageInitialized) {
      count += notificationStorage.cleanupExpired();
    }

    return count;
  }
}

// Singleton instance
export const enhancedNotificationService = new EnhancedNotificationService();
