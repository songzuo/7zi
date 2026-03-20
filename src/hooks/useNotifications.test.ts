/**
 * @fileoverview Tests for useNotifications hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import type { Notification } from '../components/NotificationCenter/types';

describe('useNotifications', () => {
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    // Mock localStorage
    global.localStorage = mockLocalStorage as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty notifications array', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useNotifications({ persist: false }));

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isLoaded).toBe(true);
  });

  it('should load notifications from localStorage on mount', async () => {
    const storedNotifications = [
      {
        id: 'notif-1',
        title: 'Test',
        message: 'Test message',
        type: 'info' as const,
        priority: 'medium' as const,
        read: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedNotifications));

    const { result } = renderHook(() => useNotifications({ persist: true }));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('7zi_notifications');
  });

  it('should add notification', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useNotifications({ persist: false }));

    act(() => {
      result.current.addNotification({
        title: 'Test Title',
        message: 'Test message',
        type: 'success',
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].title).toBe('Test Title');
    expect(result.current.notifications[0].message).toBe('Test message');
    expect(result.current.notifications[0].type).toBe('success');
    expect(result.current.notifications[0].read).toBe(false);
    expect(result.current.notifications[0].id).toMatch(/^notif-/);
  });

  it('should add notification with custom properties', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useNotifications({ persist: false }));

    act(() => {
      result.current.addNotification({
        title: 'Custom',
        message: 'Custom message',
        type: 'error',
        priority: 'high',
        link: '/link',
        icon: 'icon',
      });
    });

    const notification = result.current.notifications[0];
    expect(notification.priority).toBe('high');
    expect(notification.link).toBe('/link');
    expect(notification.icon).toBe('icon');
  });

  it('should mark notification as read', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useNotifications({ persist: false }));

    act(() => {
      result.current.addNotification({
        title: 'Test',
        message: 'Test',
      });
    });

    const id = result.current.notifications[0].id;

    act(() => {
      result.current.markAsRead(id);
    });

    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should mark all notifications as read', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useNotifications({ persist: false }));

    act(() => {
      result.current.addNotification({ title: 'Test 1', message: 'Test 1' });
      result.current.addNotification({ title: 'Test 2', message: 'Test 2' });
    });

    expect(result.current.unreadCount).toBe(2);

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.notifications.every(n => n.read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should delete notification', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

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
    // After deleting the first (newest) notification, Test 2 should remain
    expect(result.current.notifications[0].title).toBe('Test 1');
  });

  it('should clear all notifications', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useNotifications({ persist: false }));

    act(() => {
      result.current.addNotification({ title: 'Test 1', message: 'Test 1' });
      result.current.addNotification({ title: 'Test 2', message: 'Test 2' });
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should limit number of notifications', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useNotifications({ persist: false, maxNotifications: 3 }));

    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.addNotification({ title: `Test ${i}`, message: `Test ${i}` });
      }
    });

    expect(result.current.notifications).toHaveLength(3);
  });

  it('should calculate unread count correctly', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useNotifications({ persist: false }));

    act(() => {
      result.current.addNotification({ title: 'Test 1', message: 'Test 1' });
      result.current.addNotification({ title: 'Test 2', message: 'Test 2' });
      result.current.addNotification({ title: 'Test 3', message: 'Test 3' });
    });

    expect(result.current.unreadCount).toBe(3);

    act(() => {
      result.current.markAsRead(result.current.notifications[0].id);
    });

    expect(result.current.unreadCount).toBe(2);
  });

  it('should provide convenience methods for notification types', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useNotifications({ persist: false }));

    act(() => {
      result.current.success('Success Title', 'Success message');
    });

    expect(result.current.notifications[0].type).toBe('success');

    act(() => {
      result.current.error('Error Title', 'Error message');
    });

    expect(result.current.notifications[0].type).toBe('error');

    act(() => {
      result.current.warning('Warning Title', 'Warning message');
    });

    expect(result.current.notifications[0].type).toBe('warning');

    act(() => {
      result.current.info('Info Title', 'Info message');
    });

    expect(result.current.notifications[0].type).toBe('info');
  });

  it('should save notifications to localStorage when persist is enabled', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

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
        expect.any(String)
      );
    });
  });

  it('should not save to localStorage when persist is disabled', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useNotifications({ persist: false }));

    act(() => {
      result.current.addNotification({ title: 'Test', message: 'Test' });
    });

    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it('should handle localStorage read errors gracefully', async () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('Storage error');
    });

    const { result } = renderHook(() => useNotifications({ persist: true }));

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    // Should still initialize with empty notifications
    expect(result.current.notifications).toEqual([]);
  });

  it('should handle localStorage write errors gracefully', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage error');
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
});
