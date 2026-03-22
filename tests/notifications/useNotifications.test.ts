/**
 * Tests for useNotifications Hook
 * Tests hook state management, persistence, and CRUD operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/components/NotificationCenter/types';

// Mock localStorage
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _store: store, // For testing
  };
};

describe('useNotifications Hook', () => {
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;

  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty notifications array', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.isLoaded).toBe(true);
    });

    it('should load notifications from localStorage on mount', async () => {
      const storedNotifications = [
        {
          id: 'notif-1',
          title: 'Stored Notification',
          message: 'This was stored',
          type: 'info' as const,
          priority: 'medium' as const,
          read: false,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedNotifications));

      const { result } = renderHook(() => useNotifications({ persist: true }));

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('7zi_notifications');
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Stored Notification');
    });

    it('should convert string dates to Date objects when loading from storage', async () => {
      const storedNotifications = [
        {
          id: 'notif-1',
          title: 'Test',
          message: 'Test',
          type: 'info' as const,
          priority: 'medium' as const,
          read: false,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedNotifications));

      const { result } = renderHook(() => useNotifications({ persist: true }));

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.notifications[0].createdAt).toBeInstanceOf(Date);
    });

    it('should handle empty localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useNotifications({ persist: true }));

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.notifications).toEqual([]);
    });

    it('should handle corrupted localStorage data', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => useNotifications({ persist: true }));

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.notifications).toEqual([]);
    });
  });

  describe('Add Notification', () => {
    it('should add a notification', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({
          title: 'Test Notification',
          message: 'This is a test',
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Test Notification');
      expect(result.current.notifications[0].message).toBe('This is a test');
    });

    it('should add notification with default properties', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({
          title: 'Test',
          message: 'Test',
        });
      });

      const notification = result.current.notifications[0];
      expect(notification.type).toBe('info');
      expect(notification.priority).toBe('medium');
      expect(notification.read).toBe(false);
    });

    it('should add notification with custom properties', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({
          title: 'Custom',
          message: 'Custom message',
          type: 'success',
          priority: 'high',
          link: '/dashboard',
          icon: '🎉',
        });
      });

      const notification = result.current.notifications[0];
      expect(notification.type).toBe('success');
      expect(notification.priority).toBe('high');
      expect(notification.link).toBe('/dashboard');
      expect(notification.icon).toBe('🎉');
    });

    it('should generate unique id for each notification', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test 1', message: 'Test 1' });
        result.current.addNotification({ title: 'Test 2', message: 'Test 2' });
      });

      const ids = result.current.notifications.map((n) => n.id);
      expect(new Set(ids).size).toBe(2);
      expect(ids[0]).toMatch(/^notif-/);
    });

    it('should add new notification at the beginning of the list', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'First', message: 'First' });
      });

      act(() => {
        result.current.addNotification({ title: 'Second', message: 'Second' });
      });

      expect(result.current.notifications[0].title).toBe('Second');
      expect(result.current.notifications[1].title).toBe('First');
    });

    it('should set createdAt timestamp', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      const beforeAdd = Date.now();

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      const afterAdd = Date.now();

      const createdAt = result.current.notifications[0].createdAt.getTime();
      expect(createdAt).toBeGreaterThanOrEqual(beforeAdd);
      expect(createdAt).toBeLessThanOrEqual(afterAdd);
    });

    it('should limit total notifications to maxNotifications', () => {
      const { result } = renderHook(() =>
        useNotifications({ persist: false, maxNotifications: 3 })
      );

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.addNotification({
            title: `Notification ${i}`,
            message: `Message ${i}`,
          });
        }
      });

      expect(result.current.notifications).toHaveLength(3);
      expect(result.current.notifications[0].title).toBe('Notification 4');
      expect(result.current.notifications[2].title).toBe('Notification 2');
    });
  });

  describe('Mark as Read', () => {
    it('should mark a notification as read by id', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      const id = result.current.notifications[0].id;

      act(() => {
        result.current.markAsRead(id);
      });

      expect(result.current.notifications[0].read).toBe(true);
    });

    it('should update unread count when marking as read', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test 1', message: 'Test 1' });
        result.current.addNotification({ title: 'Test 2', message: 'Test 2' });
      });

      expect(result.current.unreadCount).toBe(2);

      act(() => {
        result.current.markAsRead(result.current.notifications[0].id);
      });

      expect(result.current.unreadCount).toBe(1);
    });

    it('should handle marking non-existent notification as read', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      const beforeUnreadCount = result.current.unreadCount;

      act(() => {
        result.current.markAsRead('non-existent-id');
      });

      expect(result.current.unreadCount).toBe(beforeUnreadCount);
    });

    it('should not change unread count when marking already read notification', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      const id = result.current.notifications[0].id;

      act(() => {
        result.current.markAsRead(id);
      });

      expect(result.current.unreadCount).toBe(0);

      act(() => {
        result.current.markAsRead(id);
      });

      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('Mark All as Read', () => {
    it('should mark all notifications as read', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test 1', message: 'Test 1' });
        result.current.addNotification({ title: 'Test 2', message: 'Test 2' });
        result.current.addNotification({ title: 'Test 3', message: 'Test 3' });
      });

      act(() => {
        result.current.markAllAsRead();
      });

      expect(result.current.notifications.every((n) => n.read)).toBe(true);
    });

    it('should set unread count to 0', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.addNotification({
            title: `Test ${i}`,
            message: `Message ${i}`,
          });
        }
      });

      expect(result.current.unreadCount).toBe(5);

      act(() => {
        result.current.markAllAsRead();
      });

      expect(result.current.unreadCount).toBe(0);
    });

    it('should handle empty notification list', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.markAllAsRead();
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it('should handle already all read notifications', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      act(() => {
        result.current.markAsRead(result.current.notifications[0].id);
      });

      expect(result.current.unreadCount).toBe(0);

      act(() => {
        result.current.markAllAsRead();
      });

      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('Delete Notification', () => {
    it('should delete a notification by id', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test 1', message: 'Test 1' });
        result.current.addNotification({ title: 'Test 2', message: 'Test 2' });
      });

      const id = result.current.notifications[0].id;

      act(() => {
        result.current.deleteNotification(id);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Test 1');
    });

    it('should update unread count when deleting unread notification', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test 1', message: 'Test 1' });
        result.current.addNotification({ title: 'Test 2', message: 'Test 2' });
      });

      expect(result.current.unreadCount).toBe(2);

      act(() => {
        result.current.deleteNotification(result.current.notifications[0].id);
      });

      expect(result.current.unreadCount).toBe(1);
    });

    it('should not update unread count when deleting read notification', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test 1', message: 'Test 1' });
      });

      const id = result.current.notifications[0].id;

      act(() => {
        result.current.markAsRead(id);
      });

      expect(result.current.unreadCount).toBe(0);

      act(() => {
        result.current.deleteNotification(id);
      });

      expect(result.current.unreadCount).toBe(0);
    });

    it('should handle deleting non-existent notification', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      const beforeLength = result.current.notifications.length;

      act(() => {
        result.current.deleteNotification('non-existent-id');
      });

      expect(result.current.notifications.length).toBe(beforeLength);
    });

    it('should handle deleting last notification', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      const id = result.current.notifications[0].id;

      act(() => {
        result.current.deleteNotification(id);
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('Clear All', () => {
    it('should clear all notifications', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.addNotification({
            title: `Test ${i}`,
            message: `Message ${i}`,
          });
        }
      });

      expect(result.current.notifications).toHaveLength(5);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it('should handle clearing empty list', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toEqual([]);
    });
  });

  describe('Unread Count', () => {
    it('should calculate unread count correctly', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test 1', message: 'Test 1' });
      });

      expect(result.current.unreadCount).toBe(1);

      act(() => {
        result.current.addNotification({ title: 'Test 2', message: 'Test 2' });
      });

      expect(result.current.unreadCount).toBe(2);

      act(() => {
        result.current.markAsRead(result.current.notifications[0].id);
      });

      expect(result.current.unreadCount).toBe(1);
    });

    it('should count only unread notifications', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Unread 1', message: 'Unread 1' });
        result.current.addNotification({ title: 'Unread 2', message: 'Unread 2' });
      });

      act(() => {
        result.current.addNotification({
          title: 'Read',
          message: 'Read',
          type: 'info',
        });
      });

      act(() => {
        result.current.markAsRead(result.current.notifications[0].id);
      });

      expect(result.current.unreadCount).toBe(2);
    });

    it('should return 0 for empty list', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('Convenience Methods', () => {
    it('should provide success() method', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.success('Success Title', 'Success message');
      });

      expect(result.current.notifications[0].type).toBe('success');
      expect(result.current.notifications[0].title).toBe('Success Title');
      expect(result.current.notifications[0].message).toBe('Success message');
    });

    it('should provide error() method', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.error('Error Title', 'Error message');
      });

      expect(result.current.notifications[0].type).toBe('error');
      expect(result.current.notifications[0].title).toBe('Error Title');
    });

    it('should provide warning() method', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.warning('Warning Title', 'Warning message');
      });

      expect(result.current.notifications[0].type).toBe('warning');
      expect(result.current.notifications[0].title).toBe('Warning Title');
    });

    it('should provide info() method', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.info('Info Title', 'Info message');
      });

      expect(result.current.notifications[0].type).toBe('info');
      expect(result.current.notifications[0].title).toBe('Info Title');
    });

    it('should allow passing options to convenience methods', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.success('Success', 'Message', {
          priority: 'high',
          link: '/dashboard',
          icon: '✅',
        });
      });

      const notification = result.current.notifications[0];
      expect(notification.priority).toBe('high');
      expect(notification.link).toBe('/dashboard');
      expect(notification.icon).toBe('✅');
    });
  });

  describe('Persistence', () => {
    it('should save notifications to localStorage when persist is enabled', async () => {
      const { result } = renderHook(() => useNotifications({ persist: true }));

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          '7zi_notifications',
          expect.stringContaining('Test')
        );
      });
    });

    it('should not save to localStorage when persist is disabled', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should not save until loaded from storage', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useNotifications({ persist: true }));

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });
    });

    it('should handle localStorage write errors gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useNotifications({ persist: true }));

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      // Should still add notification even if storage fails
      expect(result.current.notifications).toHaveLength(1);
    });

    it('should persist notifications on subsequent updates', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useNotifications({ persist: true }));

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.addNotification({ title: 'Test 1', message: 'Test 1' });
      });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
      });

      act(() => {
        result.current.addNotification({ title: 'Test 2', message: 'Test 2' });
      });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('IsLoaded State', () => {
    it('should set isLoaded to false initially when persist is enabled', () => {
      mockLocalStorage.getItem.mockReturnValue(
        new Promise((resolve) => setTimeout(() => resolve('[]'), 100))
      );

      const { result } = renderHook(() => useNotifications({ persist: true }));

      expect(result.current.isLoaded).toBe(false);
    });

    it('should set isLoaded to true immediately when persist is disabled', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      expect(result.current.isLoaded).toBe(true);
    });

    it('should set isLoaded to true after loading from storage', async () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify([
          {
            id: 'notif-1',
            title: 'Test',
            message: 'Test',
            type: 'info' as const,
            priority: 'medium' as const,
            read: false,
            createdAt: '2024-01-15T10:00:00.000Z',
          },
        ])
      );

      const { result } = renderHook(() => useNotifications({ persist: true }));

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.notifications).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maxNotifications = 0', () => {
      const { result } = renderHook(() =>
        useNotifications({ persist: false, maxNotifications: 0 })
      );

      act(() => {
        result.current.addNotification({ title: 'Test', message: 'Test' });
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should handle large number of notifications efficiently', () => {
      const { result } = renderHook(() =>
        useNotifications({ persist: false, maxNotifications: 100 })
      );

      act(() => {
        for (let i = 0; i < 150; i++) {
          result.current.addNotification({
            title: `Notification ${i}`,
            message: `Message ${i}`,
          });
        }
      });

      expect(result.current.notifications).toHaveLength(100);
      expect(result.current.unreadCount).toBe(100);
    });

    it('should handle special characters in notification content', () => {
      const { result } = renderHook(() => useNotifications({ persist: false }));

      act(() => {
        result.current.addNotification({
          title: 'Special <>&"\'',
          message: 'Emoji 🎉 \n Newline \t Tab',
        });
      });

      expect(result.current.notifications[0].title).toBe('Special <>&"\'');
      expect(result.current.notifications[0].message).toBe('Emoji 🎉 \n Newline \t Tab');
    });
  });
});
