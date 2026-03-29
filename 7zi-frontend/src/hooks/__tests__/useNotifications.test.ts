/**
 * useNotifications Hook Tests
 *
 * 测试通知管理 React Hook 的功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from '../useNotifications';

// Mock Socket.IO client
vi.mock('socket.io-client', () => ({
  default: vi.fn(() => {
    const mockSocket = {
      connected: false,
      on: vi.fn((event: string, callback: any) => {
        // Store callbacks for later invocation
        if (!mockSocket.callbacks) mockSocket.callbacks = {};
        mockSocket.callbacks[event] = callback;
        return mockSocket;
      }),
      emit: vi.fn(),
      disconnect: vi.fn(() => {
        mockSocket.connected = false;
      }),
      callbacks: {} as Record<string, any>,
    };

    // Simulate immediate connection
    setTimeout(() => {
      mockSocket.connected = true;
      if (mockSocket.callbacks.connect) {
        mockSocket.callbacks.connect();
      }
    }, 10);

    return mockSocket;
  }),
}));

// Mock global Notification API
const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: vi.fn(() => Promise.resolve('granted')),
};

global.Notification = mockNotification as any;

describe('useNotifications Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotification.permission = 'default';
    // Reset fetch mock
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: [], meta: { unreadCount: 0 } }),
      })
    ) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty notifications', () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it('should start in disconnected status', () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.status).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
    });

    it('should auto-connect by default', async () => {
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });
    });

    it('should not auto-connect when autoConnect is false', () => {
      const { result } = renderHook(() =>
        useNotifications({ autoConnect: false })
      );

      expect(result.current.status).toBe('disconnected');
    });
  });

  describe('Connection Management', () => {
    it('should connect when connect is called', async () => {
      const { result } = renderHook(() =>
        useNotifications({ autoConnect: false })
      );

      act(() => {
        result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });
    });

    it('should disconnect when disconnect is called', async () => {
      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should request browser notification permission', async () => {
      renderHook(() => useNotifications());

      await waitFor(() => {
        expect(mockNotification.requestPermission).toHaveBeenCalled();
      });
    });
  });

  describe('Notification Reception', () => {
    it('should receive and display notifications', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockNotification = {
        id: 'notif-1',
        type: 'info',
        priority: 'medium',
        title: 'Test Notification',
        message: 'This is a test',
        read: false,
        createdAt: Date.now(),
      };

      act(() => {
        mockSocket.callbacks.notification(mockNotification);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe('notif-1');
      expect(result.current.unreadCount).toBe(1);
    });

    it('should receive initial notifications', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      const initialNotifications = [
        { id: 'notif-1', type: 'info', priority: 'medium', title: 'Test 1', message: 'Message 1', read: true, createdAt: Date.now() },
        { id: 'notif-2', type: 'warning', priority: 'high', title: 'Test 2', message: 'Message 2', read: false, createdAt: Date.now() },
      ];

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        mockSocket.callbacks.initial_notifications(initialNotifications);
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.unreadCount).toBe(1);
    });

    it('should handle multiple notifications', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const notifications = Array.from({ length: 5 }, (_, i) => ({
        id: `notif-${i}`,
        type: 'info',
        priority: 'medium',
        title: `Notification ${i}`,
        message: `Message ${i}`,
        read: false,
        createdAt: Date.now(),
      }));

      act(() => {
        notifications.forEach(n => mockSocket.callbacks.notification(n));
      });

      expect(result.current.notifications).toHaveLength(5);
      expect(result.current.unreadCount).toBe(5);
    });
  });

  describe('Notification Read Status', () => {
    it('should mark notification as read', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockNotification = {
        id: 'notif-1',
        type: 'info',
        priority: 'medium',
        title: 'Test',
        message: 'Test message',
        read: false,
        createdAt: Date.now(),
      };

      act(() => {
        mockSocket.callbacks.notification(mockNotification);
      });

      expect(result.current.unreadCount).toBe(1);

      act(() => {
        result.current.markAsRead('notif-1');
      });

      expect(result.current.notifications[0].read).toBe(true);
      expect(result.current.unreadCount).toBe(0);
    });

    it('should mark all notifications as read', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const notifications = Array.from({ length: 5 }, (_, i) => ({
        id: `notif-${i}`,
        type: 'info',
        priority: 'medium',
        title: `Test ${i}`,
        message: `Message ${i}`,
        read: false,
        createdAt: Date.now(),
      }));

      act(() => {
        notifications.forEach(n => mockSocket.callbacks.notification(n));
      });

      expect(result.current.unreadCount).toBe(5);

      act(() => {
        result.current.markAllAsRead();
      });

      expect(result.current.notifications.every(n => n.read)).toBe(true);
      expect(result.current.unreadCount).toBe(0);
    });

    it('should handle read status from socket', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const notifications = Array.from({ length: 3 }, (_, i) => ({
        id: `notif-${i}`,
        type: 'info',
        priority: 'medium',
        title: `Test ${i}`,
        message: `Message ${i}`,
        read: false,
        createdAt: Date.now(),
      }));

      act(() => {
        notifications.forEach(n => mockSocket.callbacks.notification(n));
      });

      expect(result.current.unreadCount).toBe(3);

      act(() => {
        mockSocket.callbacks.notification_read('notif-1');
      });

      expect(result.current.notifications[0].read).toBe(true);
      expect(result.current.unreadCount).toBe(2);
    });
  });

  describe('Notification Deletion', () => {
    it('should delete notification', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const notifications = Array.from({ length: 3 }, (_, i) => ({
        id: `notif-${i}`,
        type: 'info',
        priority: 'medium',
        title: `Test ${i}`,
        message: `Message ${i}`,
        read: false,
        createdAt: Date.now(),
      }));

      act(() => {
        notifications.forEach(n => mockSocket.callbacks.notification(n));
      });

      expect(result.current.notifications).toHaveLength(3);

      act(() => {
        result.current.deleteNotification('notif-1');
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications.find(n => n.id === 'notif-1')).toBeUndefined();
    });

    it('should handle deletion from socket', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const notifications = Array.from({ length: 3 }, (_, i) => ({
        id: `notif-${i}`,
        type: 'info',
        priority: 'medium',
        title: `Test ${i}`,
        message: `Message ${i}`,
        read: false,
        createdAt: Date.now(),
      }));

      act(() => {
        notifications.forEach(n => mockSocket.callbacks.notification(n));
      });

      act(() => {
        mockSocket.callbacks.notification_deleted('notif-1');
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications.find(n => n.id === 'notif-1')).toBeUndefined();
    });
  });

  describe('Refresh Notifications', () => {
    it('should refresh notifications via API', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: [
              { id: 'notif-1', type: 'info', priority: 'medium', title: 'Test', message: 'Test', read: false, createdAt: Date.now() },
            ],
            meta: { unreadCount: 1 },
          }),
        })
      );
      global.fetch = mockFetch as any;

      const { result } = renderHook(() =>
        useNotifications({
          userId: 'user-1',
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.refreshNotifications();
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.unreadCount).toBe(1);
    });

    it('should handle refresh errors gracefully', async () => {
      const mockFetch = vi.fn(() => Promise.reject(new Error('Network error')));
      global.fetch = mockFetch as any;

      const { result } = renderHook(() =>
        useNotifications({
          userId: 'user-1',
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.refreshNotifications();
      });

      expect(mockFetch).toHaveBeenCalled();
      // Should not crash
    });
  });

  describe('Unread Count Management', () => {
    it('should calculate unread count correctly', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const notifications = [
        { id: 'notif-1', type: 'info', priority: 'medium', title: 'Test 1', message: 'Message 1', read: true, createdAt: Date.now() },
        { id: 'notif-2', type: 'info', priority: 'medium', title: 'Test 2', message: 'Message 2', read: false, createdAt: Date.now() },
        { id: 'notif-3', type: 'info', priority: 'medium', title: 'Test 3', message: 'Message 3', read: false, createdAt: Date.now() },
      ];

      act(() => {
        notifications.forEach(n => mockSocket.callbacks.notification(n));
      });

      expect(result.current.unreadCount).toBe(2);
    });

    it('should update unread count from socket', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        mockSocket.callbacks.unread_count(5);
      });

      expect(result.current.unreadCount).toBe(5);
    });
  });

  describe('Options and Configuration', () => {
    it('should use custom socket URL', async () => {
      const socketUrl = 'http://custom-server:3002';
      renderHook(() => useNotifications({ socketUrl }));

      await new Promise(resolve => setTimeout(resolve, 20));

      const io = require('socket.io-client').default;
      expect(io).toHaveBeenCalledWith(socketUrl, expect.any(Object));
    });

    it('should subscribe to user channel', async () => {
      const { result } = renderHook(() =>
        useNotifications({ userId: 'user-1' })
      );

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', expect.objectContaining({
        userId: 'user-1',
      }));
    });

    it('should subscribe to team channel', async () => {
      const { result } = renderHook(() =>
        useNotifications({ teamId: 'team-1' })
      );

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', expect.objectContaining({
        teamId: 'team-1',
      }));
    });
  });

  describe('Connection Status', () => {
    it('should transition from connecting to connected', async () => {
      const { result } = renderHook(() =>
        useNotifications({ autoConnect: false })
      );

      expect(result.current.status).toBe('disconnected');

      act(() => {
        result.current.connect();
      });

      expect(result.current.status).toBe('connecting');

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });
    });

    it('should handle disconnect event', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        mockSocket.callbacks.disconnect('client namespace disconnect');
      });

      expect(result.current.status).toBe('disconnected');
    });

    it('should handle connection error', async () => {
      const { result } = renderHook(() => useNotifications());

      const mockSocket = (require('socket.io-client').default as any).mock.results[0].value;

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        mockSocket.callbacks.connect_error(new Error('Connection failed'));
      });

      expect(result.current.status).toBe('error');
    });
  });
});
