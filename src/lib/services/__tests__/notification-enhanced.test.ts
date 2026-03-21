/**
 * Enhanced Notification Service Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EnhancedNotificationService } from '../notification-enhanced';
import { NotificationType, NotificationPriority, type Notification } from '../notification';
import { notificationService as baseService } from '../notification';
import { emailService } from '../email';
import { notificationStorage } from '../notification-storage';

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

// Mock all external dependencies
vi.mock('../notification', () => ({
  notificationService: {
    notify: vi.fn(),
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    cleanupExpired: vi.fn(),
  },
  NotificationType: {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    TASK_ASSIGNED: 'task_assigned',
    TASK_COMPLETED: 'task_completed',
    TASK_UPDATED: 'task_updated',
    MESSAGE: 'message',
    SYSTEM: 'system',
  },
  NotificationPriority: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
  },
}));

vi.mock('../email', () => ({
  emailService: {
    initialize: vi.fn(),
    isEnabled: vi.fn(),
    sendNotificationEmail: vi.fn(),
  },
}));

vi.mock('../notification-storage', () => ({
  notificationStorage: {
    initialize: vi.fn(),
    insertNotification: vi.fn(),
    markEmailSent: vi.fn(),
    logDelivery: vi.fn(),
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    getUserPreferences: vi.fn(),
    setUserPreferences: vi.fn(),
    getStats: vi.fn(),
    cleanupExpired: vi.fn(),
  },
}));

describe('EnhancedNotificationService', () => {
  let service: EnhancedNotificationService;

  beforeEach(() => {
    // Set environment variable for URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://7zi.com';

    // Create fresh instance for each test
    service = new EnhancedNotificationService();

    // Clear all mocks before each test
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(notificationStorage.initialize).mockReturnValue(undefined);
    vi.mocked(notificationStorage.insertNotification).mockReturnValue(undefined);
    vi.mocked(notificationStorage.markEmailSent).mockReturnValue(undefined);
    vi.mocked(notificationStorage.logDelivery).mockReturnValue(undefined);
    vi.mocked(notificationStorage.getNotifications).mockReturnValue([]);
    vi.mocked(notificationStorage.getUnreadCount).mockReturnValue(0);
    vi.mocked(notificationStorage.markAsRead).mockReturnValue(undefined);
    vi.mocked(notificationStorage.markAllAsRead).mockReturnValue(undefined);
    vi.mocked(notificationStorage.deleteNotification).mockReturnValue(undefined);
    vi.mocked(notificationStorage.getUserPreferences).mockReturnValue(undefined);
    vi.mocked(notificationStorage.setUserPreferences).mockReturnValue(undefined);
    vi.mocked(notificationStorage.getStats).mockReturnValue({
      totalNotifications: 0,
      unreadCount: 0,
      readCount: 0,
    });
    vi.mocked(notificationStorage.cleanupExpired).mockReturnValue(0);

    vi.mocked(baseService.notify).mockResolvedValue(undefined);
    vi.mocked(baseService.getNotifications).mockReturnValue([]);
    vi.mocked(baseService.getUnreadCount).mockReturnValue(0);
    vi.mocked(baseService.markAsRead).mockReturnValue(undefined);
    vi.mocked(baseService.markAllAsRead).mockReturnValue(undefined);
    vi.mocked(baseService.deleteNotification).mockReturnValue(undefined);
    vi.mocked(baseService.cleanupExpired).mockReturnValue(0);

    vi.mocked(emailService.initialize).mockReturnValue(undefined);
    vi.mocked(emailService.isEnabled).mockReturnValue(true);
    vi.mocked(emailService.sendNotificationEmail).mockResolvedValue({
      success: true,
      messageId: 'msg_123',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      // Set environment variables
      process.env.RESEND_API_KEY = 'test-api-key';
      process.env.FROM_EMAIL = 'noreply@test.com';
      process.env.CONTACT_EMAIL = 'contact@test.com';

      await service.initialize();

      expect(notificationStorage.initialize).toHaveBeenCalled();
      expect(emailService.initialize).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        fromEmail: 'noreply@test.com',
        replyTo: 'contact@test.com',
      });
    });

    it('should initialize without email service when API key is missing', async () => {
      delete process.env.RESEND_API_KEY;

      await service.initialize();

      expect(notificationStorage.initialize).toHaveBeenCalled();
      expect(emailService.initialize).not.toHaveBeenCalled();
    });

    it('should handle initialization failure gracefully', async () => {
      vi.mocked(notificationStorage.initialize).mockImplementation(() => {
        throw new Error('Database initialization failed');
      });

      await expect(service.initialize()).rejects.toThrow('Database initialization failed');
    });

    it('should use default FROM_EMAIL when not set', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      delete process.env.FROM_EMAIL;
      delete process.env.CONTACT_EMAIL;

      await service.initialize();

      expect(emailService.initialize).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        fromEmail: 'noreply@7zi.studio',
        replyTo: undefined,
      });
    });
  });

  describe('Sending Notifications', () => {
    it('should send notification successfully with all channels', async () => {
      await service.initialize();

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeTruthy();
      expect(result.emailSent).toBe(true);

      // Verify storage was called
      expect(notificationStorage.insertNotification).toHaveBeenCalled();

      // Verify WebSocket was called
      expect(baseService.notify).toHaveBeenCalled();

      // Verify email was sent
      expect(emailService.sendNotificationEmail).toHaveBeenCalled();

      // Verify delivery logs were created
      expect(notificationStorage.logDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          status: 'sent',
        })
      );
      expect(notificationStorage.logDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'websocket',
          status: 'sent',
        })
      );
    });

    it('should skip storage when skipStorage option is true', async () => {
      await service.initialize();

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'Test message',
      };

      await service.notify(notification, { skipStorage: true });

      expect(notificationStorage.insertNotification).not.toHaveBeenCalled();
    });

    it('should skip push when skipPush option is true', async () => {
      await service.initialize();

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'Test message',
      };

      await service.notify(notification, { skipPush: true });

      expect(baseService.notify).not.toHaveBeenCalled();
    });

    it('should skip email when skipEmail option is true', async () => {
      await service.initialize();

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'Test message',
      };

      const result = await service.notify(notification, { skipEmail: true });

      expect(result.emailSent).toBe(false);
      expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('should handle notification errors gracefully', async () => {
      await service.initialize();

      vi.mocked(baseService.notify).mockRejectedValue(new Error('WebSocket error'));

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'Test message',
      };

      const result = await service.notify(notification);

      expect(result.success).toBe(false);
      expect(result.error).toBe('WebSocket error');
    });
  });

  describe('Email Notification with Preferences', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should send email when email is enabled in preferences', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: 1,
        emailThreshold: 'medium',
        pushEnabled: 1,
        pushThreshold: 'medium',
        digestEnabled: 0,
        digestFrequency: 'daily',
        timezone: 'UTC',
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(true);
      expect(emailService.sendNotificationEmail).toHaveBeenCalled();
    });

    it('should not send email when email is disabled in preferences', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: 0,
        emailThreshold: 'medium',
        pushEnabled: 1,
        pushThreshold: 'medium',
        digestEnabled: 0,
        digestFrequency: 'daily',
        timezone: 'UTC',
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(false);
      expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('should send email when forceEmail option is true', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: 0,
        emailThreshold: 'medium',
        pushEnabled: 1,
        pushThreshold: 'medium',
        digestEnabled: 0,
        digestFrequency: 'daily',
        timezone: 'UTC',
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification, { forceEmail: true });

      expect(result.emailSent).toBe(true);
      expect(emailService.sendNotificationEmail).toHaveBeenCalled();
    });

    it('should send email when emailRecipients are provided', async () => {
      const emailRecipients = [
        { email: 'user1@test.com', name: 'User 1' },
        { email: 'user2@test.com', name: 'User 2' },
      ];

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Test Notification',
        message: 'Test message',
      };

      const result = await service.notify(notification, { emailRecipients });

      expect(result.emailSent).toBe(true);
      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: emailRecipients,
        })
      );
    });

    it('should log failed email delivery', async () => {
      vi.mocked(emailService.sendNotificationEmail).mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.URGENT,
        title: 'Test Notification',
        message: 'Test message',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(false);

      // Verify failed delivery was logged
      expect(notificationStorage.logDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          status: 'failed',
          errorMessage: 'Email service unavailable',
        })
      );
    });
  });

  describe('Priority-based Email Threshold Filtering', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should send email when notification priority is higher than threshold', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: 1,
        emailThreshold: 'medium',
        pushEnabled: 1,
        pushThreshold: 'medium',
        digestEnabled: 0,
        digestFrequency: 'daily',
        timezone: 'UTC',
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(true);
    });

    it('should send email when notification priority equals threshold', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: 1,
        emailThreshold: 'high',
        pushEnabled: 1,
        pushThreshold: 'medium',
        digestEnabled: 0,
        digestFrequency: 'daily',
        timezone: 'UTC',
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(true);
    });

    it('should not send email when notification priority is lower than threshold', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: 1,
        emailThreshold: 'high',
        pushEnabled: 1,
        pushThreshold: 'medium',
        digestEnabled: 0,
        digestFrequency: 'daily',
        timezone: 'UTC',
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(false);
    });

    it('should send email for urgent priority by default when no preferences exist', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue(undefined);

      const notification = {
        type: NotificationType.ERROR,
        priority: NotificationPriority.URGENT,
        title: 'Critical Alert',
        message: 'Something went wrong',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(true);
    });

    it('should send email for high priority by default when no preferences exist', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue(undefined);

      const notification = {
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        title: 'Important Notice',
        message: 'Please review',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(true);
    });

    it('should not send email for medium/low priority by default when no preferences exist', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue(undefined);

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Info',
        message: 'Just an update',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(false);
    });

    it('should respect priority order: urgent > high > medium > low', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: 1,
        emailThreshold: 'medium',
        pushEnabled: 1,
        pushThreshold: 'medium',
        digestEnabled: 0,
        digestFrequency: 'daily',
        timezone: 'UTC',
      });

      // Urgent should be sent
      const urgentResult = await service.notify({
        type: NotificationType.ERROR,
        priority: NotificationPriority.URGENT,
        title: 'Urgent',
        message: 'Urgent message',
        userId: 'user-123',
      });
      expect(urgentResult.emailSent).toBe(true);

      // High should be sent
      const highResult = await service.notify({
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        title: 'High',
        message: 'High message',
        userId: 'user-123',
      });
      expect(highResult.emailSent).toBe(true);

      // Medium should be sent
      const mediumResult = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Medium',
        message: 'Medium message',
        userId: 'user-123',
      });
      expect(mediumResult.emailSent).toBe(true);

      // Low should not be sent
      const lowResult = await service.notify({
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Low',
        message: 'Low message',
        userId: 'user-123',
      });
      expect(lowResult.emailSent).toBe(false);
    });
  });

  describe('Quiet Hours Detection', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should suppress email during quiet hours', async () => {
      // Mock current time to be within quiet hours (e.g., 23:00)
      const mockDate = new Date();
      mockDate.setHours(23, 0, 0, 0);
      vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
      vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('23:00');

      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: 1,
        emailThreshold: 'low',
        pushEnabled: 1,
        pushThreshold: 'medium',
        digestEnabled: 0,
        digestFrequency: 'daily',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.URGENT,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(false);
    });

    it('should send email outside quiet hours', async () => {
      // Mock current time to be outside quiet hours (e.g., 10:00)
      const mockDate = new Date();
      mockDate.setHours(10, 0, 0, 0);
      vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
      vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('10:00');

      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: 1,
        emailThreshold: 'low',
        pushEnabled: 1,
        pushThreshold: 'medium',
        digestEnabled: 0,
        digestFrequency: 'daily',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(true);
    });

    it('should handle quiet hours that span midnight', async () => {
      // Test case: quiet hours from 22:00 to 06:00
      // Current time: 23:00 (should be quiet)
      const mockDate = new Date();
      mockDate.setHours(23, 30, 0, 0);
      vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
      vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('23:30');

      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: 1,
        emailThreshold: 'low',
        pushEnabled: 1,
        pushThreshold: 'medium',
        digestEnabled: 0,
        digestFrequency: 'daily',
        quietHoursStart: '22:00',
        quietHoursEnd: '06:00',
        timezone: 'UTC',
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(false);
    });

    it('should send email when quiet hours are not configured', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: true,
        emailThreshold: 'medium',
        pushEnabled: true,
        pushThreshold: 'medium',
        digestEnabled: false,
        digestFrequency: 'daily',
        timezone: 'UTC',
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(true);
    });

    it('should handle quiet hours errors gracefully', async () => {
      vi.mocked(notificationStorage.getUserPreferences).mockImplementation(() => {
        throw new Error('Failed to get preferences');
      });

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        title: 'Test Notification',
        message: 'Test message',
        userId: 'user-123',
      };

      // When getUserPreferences throws, the error is caught and the notification fails
      const result = await service.notify(notification);

      expect(result.success).toBe(false);
      expect(result.emailSent).toBe(false);
    });
  });

  describe('User Preferences', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should set user preferences', () => {
      const preferences = {
        userId: 'user-123',
        emailEnabled: true,
        emailThreshold: NotificationPriority.HIGH,
        pushEnabled: true,
        pushThreshold: NotificationPriority.MEDIUM,
        digestEnabled: false,
        digestFrequency: 'daily' as const,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'Europe/Berlin',
      };

      service.setUserPreferences(preferences);

      expect(notificationStorage.setUserPreferences).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          emailEnabled: true,
          emailThreshold: 'high',
          pushEnabled: true,
          pushThreshold: 'medium',
          digestEnabled: false,
          digestFrequency: 'daily',
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          timezone: 'Europe/Berlin',
        })
      );
    });

    it('should get user preferences', () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue({
        emailEnabled: 1,
        emailThreshold: 'high',
        pushEnabled: 1,
        pushThreshold: 'medium',
        digestEnabled: 0,
        digestFrequency: 'daily',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'Europe/Berlin',
      });

      const preferences = service.getUserPreferences('user-123');

      expect(preferences).not.toBeNull();
      expect(preferences?.userId).toBe('user-123');
      expect(preferences?.emailEnabled).toBe(true);
      expect(preferences?.emailThreshold).toBe(NotificationPriority.HIGH);
      expect(preferences?.pushEnabled).toBe(true);
      expect(preferences?.pushThreshold).toBe(NotificationPriority.MEDIUM);
      expect(preferences?.digestEnabled).toBe(false);
      expect(preferences?.digestFrequency).toBe('daily');
      expect(preferences?.quietHoursStart).toBe('22:00');
      expect(preferences?.quietHoursEnd).toBe('08:00');
      expect(preferences?.timezone).toBe('Europe/Berlin');
    });

    it('should return null when preferences not found', () => {
      vi.mocked(notificationStorage.getUserPreferences).mockReturnValue(undefined);

      const preferences = service.getUserPreferences('user-123');

      expect(preferences).toBeNull();
    });

    it('should throw error when setting preferences without initialization', () => {
      const uninitializedService = new EnhancedNotificationService();

      const preferences = {
        userId: 'user-123',
        emailEnabled: true,
        emailThreshold: NotificationPriority.HIGH,
        pushEnabled: true,
        pushThreshold: NotificationPriority.MEDIUM,
        digestEnabled: false,
        digestFrequency: 'daily' as const,
        timezone: 'UTC',
      };

      expect(() => {
        uninitializedService.setUserPreferences(preferences);
      }).toThrow('Storage not initialized');
    });
  });

  describe('Notification Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get notifications', () => {
      vi.mocked(notificationStorage.getNotifications).mockReturnValue([
        {
          id: 'notif-1',
          type: 'info',
          priority: 'medium',
          title: 'Test',
          message: 'Test message',
          userId: 'user-123',
          read: 0,
          createdAt: Date.now(),
          data: null,
        },
      ]);

      const notifications = service.getNotifications({ userId: 'user-123' });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe('notif-1');
      expect(notifications[0].read).toBe(false);
    });

    it('should get unread count', () => {
      vi.mocked(notificationStorage.getUnreadCount).mockReturnValue(5);

      const count = service.getUnreadCount('user-123');

      expect(count).toBe(5);
    });

    it('should mark notification as read', () => {
      service.markAsRead('notif-123');

      expect(baseService.markAsRead).toHaveBeenCalledWith('notif-123');
      expect(notificationStorage.markAsRead).toHaveBeenCalledWith('notif-123');
    });

    it('should mark all notifications as read', () => {
      service.markAllAsRead('user-123');

      expect(baseService.markAllAsRead).toHaveBeenCalledWith({ userId: 'user-123' });
      expect(notificationStorage.markAllAsRead).toHaveBeenCalledWith('user-123');
    });

    it('should delete notification', () => {
      service.deleteNotification('notif-123');

      expect(baseService.deleteNotification).toHaveBeenCalledWith('notif-123');
      expect(notificationStorage.deleteNotification).toHaveBeenCalledWith('notif-123');
    });

    it('should get stats', () => {
      vi.mocked(notificationStorage.getStats).mockReturnValue({
        totalNotifications: 100,
        unreadCount: 25,
        readCount: 75,
      });

      const stats = service.getStats();

      expect(stats.totalNotifications).toBe(100);
      expect(stats.unreadCount).toBe(25);
      expect(stats.readCount).toBe(75);
      expect(stats.emailEnabled).toBe(true);
    });

    it('should cleanup expired notifications', () => {
      vi.mocked(baseService.cleanupExpired).mockReturnValue(3);
      vi.mocked(notificationStorage.cleanupExpired).mockReturnValue(7);

      const count = service.cleanupExpired();

      expect(count).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle notifications without userId', async () => {
      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.URGENT,
        title: 'Broadcast',
        message: 'Broadcast message',
      };

      const result = await service.notify(notification);

      // Email should not be sent without userId or recipients
      expect(result.emailSent).toBe(false);
    });

    it('should handle email service being disabled', async () => {
      vi.mocked(emailService.isEnabled).mockReturnValue(false);

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.URGENT,
        title: 'Test',
        message: 'Test message',
        userId: 'user-123',
      };

      const result = await service.notify(notification);

      expect(result.emailSent).toBe(false);
      expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('should handle storage not initialized', async () => {
      const uninitializedService = new EnhancedNotificationService();

      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
      };

      // Should not crash, just skip storage operations
      const result = await uninitializedService.notify(notification);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeTruthy();
    });

    it('should handle notification with taskId', async () => {
      const notification = {
        type: NotificationType.TASK_COMPLETED,
        priority: NotificationPriority.HIGH,
        title: 'Task Complete',
        message: 'Your task is done',
        userId: 'user-123',
        taskId: 'task-456',
      };

      const result = await service.notify(notification, {
        emailRecipients: [{ email: 'user@test.com', name: 'User' }],
      });

      expect(result.emailSent).toBe(true);
      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          actionUrl: 'https://7zi.com/tasks/task-456',
          actionText: 'View Result',
        })
      );
    });

    it('should handle notification with teamId', async () => {
      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Team Update',
        message: 'Team updated',
        userId: 'user-123',
        teamId: 'team-789',
      };

      const result = await service.notify(notification, {
        emailRecipients: [{ email: 'user@test.com', name: 'User' }],
      });

      expect(result.emailSent).toBe(true);
      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          actionUrl: 'https://7zi.com/teams/team-789',
        })
      );
    });

    it('should handle notification with custom data', async () => {
      const notification = {
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test',
        message: 'Test message',
        userId: 'user-123',
        data: { customField: 'customValue', count: 42 },
      };

      const result = await service.notify(notification, {
        emailRecipients: [{ email: 'user@test.com', name: 'User' }],
      });

      expect(result.success).toBe(true);
      expect(notificationStorage.insertNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          data: JSON.stringify({ customField: 'customValue', count: 42 }),
        })
      );
    });
  });
});
