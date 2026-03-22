/**
 * Tests for Notification Store (Zustand)
 * Tests core state management and persistence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNotificationStore } from '@/lib/notifications/store';
import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '@/types/notifications';

describe('Notification Store - State Management', () => {
  let store: ReturnType<typeof useNotificationStore.getState>;

  beforeEach(() => {
    // Reset store state before each test
    store = useNotificationStore.getState();
    act(() => {
      store.clearAll();
      store.resetPreferences();
      store.setError(null);
    });
  });

  afterEach(() => {
    act(() => {
      store.clearAll();
    });
  });

  describe('Initialization', () => {
    it('should initialize with empty notifications', () => {
      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });

    it('should initialize with default preferences', () => {
      const state = useNotificationStore.getState();
      expect(state.preferences.enabled).toBe(true);
      expect(state.preferences.email_enabled).toBe(true);
      expect(state.preferences.sound_enabled).toBe(true);
      expect(state.preferences.enabled_types).toContain(NotificationType.TASK_ASSIGNED);
    });

    it('should initialize with no loading state', () => {
      const state = useNotificationStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Add Notification', () => {
    it('should add a single notification', () => {
      const notification = {
        id: 'test-1',
        user_id: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test Notification',
        content: 'Test content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        store.addNotification(notification);
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].id).toBe('test-1');
      expect(state.unreadCount).toBe(1);
    });

    it('should add multiple notifications in order', () => {
      const notifications = [
        {
          id: 'test-1',
          user_id: 'user-1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Notification 1',
          content: 'Content 1',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-2',
          user_id: 'user-1',
          type: NotificationType.MEETING_REMINDER,
          title: 'Notification 2',
          content: 'Content 2',
          priority: NotificationPriority.HIGH,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications.forEach((n) => store.addNotification(n));
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(2);
      expect(state.notifications[0].id).toBe('test-1'); // First added is first
      expect(state.unreadCount).toBe(2);
    });

    it('should calculate unread count correctly with mixed states', () => {
      const notifications = [
        {
          id: 'test-1',
          user_id: 'user-1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Unread',
          content: 'Content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-2',
          user_id: 'user-1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Read',
          content: 'Content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.READ,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications.forEach((n) => store.addNotification(n));
      });

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(1);
    });
  });

  describe('Update Notification', () => {
    it('should update notification status', () => {
      const notification = {
        id: 'test-1',
        user_id: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test',
        content: 'Content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        store.addNotification(notification);
      });

      act(() => {
        store.updateNotification('test-1', {
          status: NotificationStatus.READ,
        });
      });

      const state = useNotificationStore.getState();
      expect(state.notifications[0].status).toBe(NotificationStatus.READ);
      expect(state.unreadCount).toBe(0);
    });

    it('should update notification title and content', () => {
      const notification = {
        id: 'test-1',
        user_id: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Original Title',
        content: 'Original Content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        store.addNotification(notification);
      });

      act(() => {
        store.updateNotification('test-1', {
          title: 'Updated Title',
          content: 'Updated Content',
        });
      });

      const state = useNotificationStore.getState();
      expect(state.notifications[0].title).toBe('Updated Title');
      expect(state.notifications[0].content).toBe('Updated Content');
    });

    it('should not affect other notifications when updating one', () => {
      const notifications = [
        {
          id: 'test-1',
          user_id: 'user-1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Notification 1',
          content: 'Content 1',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-2',
          user_id: 'user-1',
          type: NotificationType.MEETING_REMINDER,
          title: 'Notification 2',
          content: 'Content 2',
          priority: NotificationPriority.HIGH,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications.forEach((n) => store.addNotification(n));
      });

      act(() => {
        store.updateNotification('test-1', {
          status: NotificationStatus.READ,
        });
      });

      const state = useNotificationStore.getState();
      expect(state.notifications[0].status).toBe(NotificationStatus.READ);
      expect(state.notifications[1].status).toBe(NotificationStatus.UNREAD);
    });

    it('should handle updating non-existent notification', () => {
      const notification = {
        id: 'test-1',
        user_id: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test',
        content: 'Content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        store.addNotification(notification);
      });

      act(() => {
        store.updateNotification('non-existent', {
          status: NotificationStatus.READ,
        });
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].status).toBe(NotificationStatus.UNREAD);
    });
  });

  describe('Remove Notification', () => {
    it('should remove a notification by id', () => {
      const notification = {
        id: 'test-1',
        user_id: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test',
        content: 'Content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        store.addNotification(notification);
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      act(() => {
        store.removeNotification('test-1');
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(0);
      expect(state.unreadCount).toBe(0);
    });

    it('should update unread count when removing unread notification', () => {
      const notification = {
        id: 'test-1',
        user_id: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test',
        content: 'Content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        store.addNotification(notification);
      });

      expect(useNotificationStore.getState().unreadCount).toBe(1);

      act(() => {
        store.removeNotification('test-1');
      });

      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it('should not update unread count when removing read notification', () => {
      const notification = {
        id: 'test-1',
        user_id: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test',
        content: 'Content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.READ,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        store.addNotification(notification);
      });

      expect(useNotificationStore.getState().unreadCount).toBe(0);

      act(() => {
        store.removeNotification('test-1');
      });

      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it('should handle removing non-existent notification', () => {
      const notification = {
        id: 'test-1',
        user_id: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test',
        content: 'Content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        store.addNotification(notification);
      });

      act(() => {
        store.removeNotification('non-existent');
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });
  });

  describe('Mark as Read', () => {
    it('should mark a notification as read', () => {
      const notification = {
        id: 'test-1',
        user_id: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test',
        content: 'Content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        store.addNotification(notification);
      });

      act(() => {
        store.markAsRead('test-1');
      });

      const state = useNotificationStore.getState();
      expect(state.notifications[0].status).toBe(NotificationStatus.READ);
      expect(state.notifications[0].read_at).toBeDefined();
      expect(state.unreadCount).toBe(0);
    });

    it('should set read_at timestamp when marking as read', () => {
      const notification = {
        id: 'test-1',
        user_id: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test',
        content: 'Content',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        store.addNotification(notification);
      });

      const beforeMark = Date.now();

      act(() => {
        store.markAsRead('test-1');
      });

      const state = useNotificationStore.getState();
      const readAt = new Date(state.notifications[0].read_at!).getTime();
      expect(readAt).toBeGreaterThanOrEqual(beforeMark);
    });
  });

  describe('Mark All as Read', () => {
    it('should mark all notifications as read', () => {
      const notifications = [
        {
          id: 'test-1',
          user_id: 'user-1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Notification 1',
          content: 'Content 1',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-2',
          user_id: 'user-1',
          type: NotificationType.MEETING_REMINDER,
          title: 'Notification 2',
          content: 'Content 2',
          priority: NotificationPriority.HIGH,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-3',
          user_id: 'user-1',
          type: NotificationType.USER_MENTION,
          title: 'Notification 3',
          content: 'Content 3',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.READ,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications.forEach((n) => store.addNotification(n));
      });

      expect(useNotificationStore.getState().unreadCount).toBe(2);

      act(() => {
        store.markAllAsRead();
      });

      const state = useNotificationStore.getState();
      expect(state.notifications.every((n) => n.status === NotificationStatus.READ)).toBe(
        true
      );
      expect(state.unreadCount).toBe(0);
    });

    it('should do nothing when there are no notifications', () => {
      act(() => {
        store.markAllAsRead();
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(0);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('Clear All', () => {
    it('should clear all notifications', () => {
      const notifications = [
        {
          id: 'test-1',
          user_id: 'user-1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Notification 1',
          content: 'Content 1',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-2',
          user_id: 'user-1',
          type: NotificationType.MEETING_REMINDER,
          title: 'Notification 2',
          content: 'Content 2',
          priority: NotificationPriority.HIGH,
          status: NotificationStatus.READ,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications.forEach((n) => store.addNotification(n));
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(2);

      act(() => {
        store.clearAll();
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(0);
      expect(state.unreadCount).toBe(0);
    });

    it('should do nothing when already empty', () => {
      act(() => {
        store.clearAll();
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(0);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      const notifications = [
        {
          id: 'test-1',
          user_id: 'user-1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Task',
          content: 'Task content',
          priority: NotificationPriority.URGENT,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-2',
          user_id: 'user-1',
          type: NotificationType.MEETING_REMINDER,
          title: 'Meeting',
          content: 'Meeting content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-3',
          user_id: 'user-1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Another Task',
          content: 'Another task content',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.READ,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications.forEach((n) => store.addNotification(n));
      });
    });

    it('should filter notifications by type', () => {
      const filtered = store.filterByType(NotificationType.TASK_ASSIGNED);
      expect(filtered).toHaveLength(2);
      expect(filtered.every((n) => n.type === NotificationType.TASK_ASSIGNED)).toBe(
        true
      );
    });

    it('should filter notifications by priority', () => {
      const filtered = store.filterByPriority(NotificationPriority.URGENT);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].priority).toBe(NotificationPriority.URGENT);
    });

    it('should get unread notifications', () => {
      const unread = store.getUnreadNotifications();
      expect(unread).toHaveLength(2);
      expect(unread.every((n) => n.status === NotificationStatus.UNREAD)).toBe(true);
    });

    it('should return empty array when filtering with no matches', () => {
      const filtered = store.filterByType(NotificationType.SYSTEM_ANNOUNCEMENT);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Preferences', () => {
    it('should update preferences', () => {
      act(() => {
        store.updatePreferences({
          sound_enabled: false,
          email_enabled: false,
        });
      });

      const state = useNotificationStore.getState();
      expect(state.preferences.sound_enabled).toBe(false);
      expect(state.preferences.email_enabled).toBe(false);
    });

    it('should update enabled types', () => {
      act(() => {
        store.updatePreferences({
          enabled_types: [NotificationType.TASK_ASSIGNED],
        });
      });

      const state = useNotificationStore.getState();
      expect(state.preferences.enabled_types).toHaveLength(1);
      expect(state.preferences.enabled_types[0]).toBe(NotificationType.TASK_ASSIGNED);
    });

    it('should reset preferences to defaults', () => {
      act(() => {
        store.updatePreferences({
          enabled: false,
          email_enabled: false,
          sound_enabled: false,
          enabled_types: [],
        });
      });

      act(() => {
        store.resetPreferences();
      });

      const state = useNotificationStore.getState();
      expect(state.preferences.enabled).toBe(true);
      expect(state.preferences.email_enabled).toBe(true);
      expect(state.preferences.sound_enabled).toBe(true);
      expect(state.preferences.enabled_types.length).toBeGreaterThan(0);
    });
  });

  describe('Loading and Error States', () => {
    it('should manage loading state', () => {
      expect(store.isLoading).toBe(false);

      act(() => {
        store.setLoading(true);
      });

      expect(store.isLoading).toBe(true);

      act(() => {
        store.setLoading(false);
      });

      expect(store.isLoading).toBe(false);
    });

    it('should manage error state', () => {
      expect(store.error).toBeNull();

      act(() => {
        store.setError('Test error');
      });

      expect(store.error).toBe('Test error');

      act(() => {
        store.setError(null);
      });

      expect(store.error).toBeNull();
    });

    it('should clear error on new error', () => {
      act(() => {
        store.setError('First error');
      });

      act(() => {
        store.setError('Second error');
      });

      expect(store.error).toBe('Second error');
    });
  });

  describe('Set Notifications', () => {
    it('should replace all notifications', () => {
      const notifications1 = [
        {
          id: 'test-1',
          user_id: 'user-1',
          type: NotificationType.TASK_ASSIGNED,
          title: 'Notification 1',
          content: 'Content 1',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        notifications1.forEach((n) => store.addNotification(n));
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      const notifications2 = [
        {
          id: 'test-2',
          user_id: 'user-1',
          type: NotificationType.MEETING_REMINDER,
          title: 'Notification 2',
          content: 'Content 2',
          priority: NotificationPriority.HIGH,
          status: NotificationStatus.UNREAD,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-3',
          user_id: 'user-1',
          type: NotificationType.USER_MENTION,
          title: 'Notification 3',
          content: 'Content 3',
          priority: NotificationPriority.NORMAL,
          status: NotificationStatus.READ,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        store.setNotifications(notifications2);
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(2);
      expect(state.notifications[0].id).toBe('test-2');
      expect(state.unreadCount).toBe(1);
    });
  });
});
