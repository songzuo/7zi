/**
 * Test file for Notification Store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotificationStore, useFetchNotifications, useCreateNotification } from '../store';
import { NotificationType, NotificationPriority, NotificationStatus } from '@/types/notifications';

describe('Notification Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useNotificationStore.getState();
    store.setNotifications([]);
    store.clearAll();
    store.resetPreferences();
    // Clear localStorage to ensure clean state
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Basic State Management', () => {
    it('should initialize with default state', () => {
      const { notifications, unreadCount, preferences } = useNotificationStore.getState();

      expect(notifications).toHaveLength(0);
      expect(unreadCount).toBe(0);
      expect(preferences.enabled).toBe(true);
      expect(preferences.email_enabled).toBe(true);
      expect(preferences.sound_enabled).toBe(true);
    });

    it('should add a notification', () => {
      const notification = {
        id: '1',
        user_id: 'user1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test Notification',
        content: 'Test content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        useNotificationStore.getState().addNotification(notification);
      });

      const { notifications, unreadCount } = useNotificationStore.getState();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe('1');
      expect(unreadCount).toBe(1);
    });

    it('should update a notification', () => {
      const notification = {
        id: '1',
        user_id: 'user1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test Notification',
        content: 'Test content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        useNotificationStore.getState().addNotification(notification);
      });

      act(() => {
        useNotificationStore.getState().updateNotification('1', {
          status: NotificationStatus.READ,
        });
      });

      const { notifications, unreadCount } = useNotificationStore.getState();

      expect(notifications[0].status).toBe(NotificationStatus.READ);
      expect(unreadCount).toBe(0);
    });

    it('should remove a notification', () => {
      const notification = {
        id: '1',
        user_id: 'user1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test Notification',
        content: 'Test content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        useNotificationStore.getState().addNotification(notification);
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      act(() => {
        useNotificationStore.getState().removeNotification('1');
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });

    it('should mark a notification as read', () => {
      const notification = {
        id: '1',
        user_id: 'user1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test Notification',
        content: 'Test content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        useNotificationStore.getState().addNotification(notification);
      });

      act(() => {
        useNotificationStore.getState().markAsRead('1');
      });

      const { notifications, unreadCount } = useNotificationStore.getState();

      expect(notifications[0].status).toBe(NotificationStatus.READ);
      expect(notifications[0].read_at).toBeDefined();
      expect(unreadCount).toBe(0);
    });

    it('should mark all notifications as read', () => {
      const notifications = [
        {
          id: '1',
          user_id: 'user1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Test Notification 1',
          content: 'Test content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: 'user1',
          type: NotificationType.MEETING_REMINDER,
          title: 'Test Notification 2',
          content: 'Test content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications.forEach((n) => useNotificationStore.getState().addNotification(n));
      });

      expect(useNotificationStore.getState().unreadCount).toBe(2);

      act(() => {
        useNotificationStore.getState().markAllAsRead();
      });

      const { unreadCount } = useNotificationStore.getState();
      expect(unreadCount).toBe(0);
    });

    it('should clear all notifications', () => {
      const notifications = [
        {
          id: '1',
          user_id: 'user1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Test Notification 1',
          content: 'Test content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: 'user1',
          type: NotificationType.MEETING_REMINDER,
          title: 'Test Notification 2',
          content: 'Test content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.READ,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications.forEach((n) => useNotificationStore.getState().addNotification(n));
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(2);

      act(() => {
        useNotificationStore.getState().clearAll();
      });

      const { notifications: allNotifications, unreadCount } = useNotificationStore.getState();
      expect(allNotifications).toHaveLength(0);
      expect(unreadCount).toBe(0);
    });
  });

  describe('Preferences Management', () => {
    it('should update preferences', () => {
      act(() => {
        useNotificationStore.getState().updatePreferences({
          sound_enabled: false,
          email_enabled: false,
        });
      });

      const { preferences } = useNotificationStore.getState();

      expect(preferences.sound_enabled).toBe(false);
      expect(preferences.email_enabled).toBe(false);
    });

    it('should reset preferences to defaults', () => {
      act(() => {
        useNotificationStore.getState().updatePreferences({
          enabled: false,
          email_enabled: false,
          sound_enabled: false,
          enabled_types: [],
        });
      });

      act(() => {
        useNotificationStore.getState().resetPreferences();
      });

      const { preferences } = useNotificationStore.getState();

      expect(preferences.enabled).toBe(true);
      expect(preferences.email_enabled).toBe(true);
      expect(preferences.sound_enabled).toBe(true);
      expect(preferences.enabled_types.length).toBeGreaterThan(0);
    });

    it('should toggle enabled_types', () => {
      act(() => {
        useNotificationStore.getState().updatePreferences({
          enabled_types: [NotificationType.TASK_ASSIGNED],
        });
      });

      let { preferences } = useNotificationStore.getState();
      expect(preferences.enabled_types).toHaveLength(1);
      expect(preferences.enabled_types[0]).toBe(NotificationType.TASK_ASSIGNED);

      act(() => {
        useNotificationStore.getState().updatePreferences({
          enabled_types: [
            NotificationType.TASK_ASSIGNED,
            NotificationType.MEETING_REMINDER,
          ],
        });
      });

      preferences = useNotificationStore.getState().preferences;
      expect(preferences.enabled_types).toHaveLength(2);
    });
  });

  describe('Filtering', () => {
    it('should filter notifications by type', () => {
      const notifications = [
        {
          id: '1',
          user_id: 'user1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Test Notification 1',
          content: 'Test content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: 'user1',
          type: NotificationType.MEETING_REMINDER,
          title: 'Test Notification 2',
          content: 'Test content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications.forEach((n) => useNotificationStore.getState().addNotification(n));
      });

      const filtered = useNotificationStore.getState().filterByType(NotificationType.TASK_ASSIGNED);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe(NotificationType.TASK_ASSIGNED);
    });

    it('should filter notifications by priority', () => {
      const notifications = [
        {
          id: '1',
          user_id: 'user1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Test Notification 1',
          content: 'Test content',
          priority: NotificationPriority.URGENT,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: 'user1',
          type: NotificationType.MEETING_REMINDER,
          title: 'Test Notification 2',
          content: 'Test content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications.forEach((n) => useNotificationStore.getState().addNotification(n));
      });

      const filtered = useNotificationStore.getState().filterByPriority(NotificationPriority.URGENT);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].priority).toBe(NotificationPriority.URGENT);
    });

    it('should get unread notifications', () => {
      const notifications = [
        {
          id: '1',
          user_id: 'user1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Test Notification 1',
          content: 'Test content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: 'user1',
          type: NotificationType.MEETING_REMINDER,
          title: 'Test Notification 2',
          content: 'Test content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.READ,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications.forEach((n) => useNotificationStore.getState().addNotification(n));
      });

      const unread = useNotificationStore.getState().getUnreadNotifications();

      expect(unread).toHaveLength(1);
      expect(unread[0].status).toBe(NotificationStatus.UNREAD);
    });
  });

  describe('Loading State', () => {
    it('should manage loading state', () => {
      expect(useNotificationStore.getState().isLoading).toBe(false);

      act(() => {
        useNotificationStore.getState().setLoading(true);
      });

      expect(useNotificationStore.getState().isLoading).toBe(true);

      act(() => {
        useNotificationStore.getState().setLoading(false);
      });

      expect(useNotificationStore.getState().isLoading).toBe(false);
    });

    it('should manage error state', () => {
      expect(useNotificationStore.getState().error).toBeNull();

      act(() => {
        useNotificationStore.getState().setError('Test error');
      });

      expect(useNotificationStore.getState().error).toBe('Test error');

      act(() => {
        useNotificationStore.getState().setError(null);
      });

      expect(useNotificationStore.getState().error).toBeNull();
    });
  });

  describe('Notification Limit', () => {
    it('should limit notifications to 100', () => {
      // Create 105 notifications
      const notifications = Array.from({ length: 105 }, (_, i) => ({
        id: `notif-${i}`,
        user_id: 'user1',
        type: NotificationType.TASK_ASSIGNED,
        title: `Test Notification ${i}`,
        content: 'Test content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      act(() => {
        notifications.forEach((n) => useNotificationStore.getState().addNotification(n));
      });

      const { notifications: storedNotifications } = useNotificationStore.getState();

      // Should only have 100 notifications (most recent first)
      expect(storedNotifications).toHaveLength(100);
      // First notification should be the last one added (newest)
      expect(storedNotifications[0].id).toBe('notif-104');
    });

    it('should maintain limit when adding notifications', () => {
      // Add 100 notifications
      const notifications = Array.from({ length: 100 }, (_, i) => ({
        id: `notif-${i}`,
        user_id: 'user1',
        type: NotificationType.TASK_ASSIGNED,
        title: `Test Notification ${i}`,
        content: 'Test content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      act(() => {
        notifications.forEach((n) => useNotificationStore.getState().addNotification(n));
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(100);

      // Add one more
      const newNotification = {
        id: 'notif-100',
        user_id: 'user1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Notification',
        content: 'Test content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        useNotificationStore.getState().addNotification(newNotification);
      });

      // Should still be 100
      expect(useNotificationStore.getState().notifications).toHaveLength(100);
      // Newest should be first
      expect(useNotificationStore.getState().notifications[0].id).toBe('notif-100');
    });
  });
});
