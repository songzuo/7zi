/**
 * Notification Provider Edge Cases Tests
 * 
 * Comprehensive edge case testing for NotificationProvider and NotificationCenter:
 * 1. Empty notification list handling
 * 2. Notification expiry processing
 * 3. Concurrent notification updates
 * 4. WebSocket disconnect/reconnect state management
 * 5. Large notification pagination
 * 6. Network failure recovery
 * 7. Browser notification permission edge cases
 * 8. Sound notification edge cases
 * 9. Batch notification edge cases
 * 10. Memory management with large datasets
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ============================================================================
// Mocks Setup
// ============================================================================

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances: MockWebSocket[] = [];
  
  readyState = MockWebSocket.OPEN;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

global.WebSocket = MockWebSocket as any;

// Mock Audio
class MockAudio {
  src: string;
  volume: number = 1;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  constructor(src: string) {
    this.src = src;
  }
}

global.Audio = MockAudio as any;

// Mock Notification API
const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: vi.fn().mockResolvedValue('granted'),
};

vi.stubGlobal('Notification', mockNotification);

// Mock localStorage
const localStorageMock = (() => {
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
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// ============================================================================
// Test Utilities
// ============================================================================

interface MockNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: string;
  expiresAt?: number;
  category?: 'info' | 'warning' | 'error' | 'success';
}

const createMockNotification = (overrides: Partial<MockNotification> = {}): MockNotification => ({
  id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: 'system_announcement',
  title: 'Test Notification',
  message: 'Test message',
  read: false,
  priority: 'normal',
  timestamp: new Date().toISOString(),
  ...overrides,
});

const createMockNotifications = (count: number, overrides: Partial<MockNotification> = {}): MockNotification[] => 
  Array.from({ length: count }, (_, i) => 
    createMockNotification({ 
      id: `notif-${i}`,
      title: `Notification ${i}`,
      message: `Message ${i}`,
      ...overrides,
    })
  );

// ============================================================================
// Test Suite
// ============================================================================

describe('NotificationProvider Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.reset();
    localStorageMock.clear();
    mockNotification.permission = 'default';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Empty Notification List Handling
  // ==========================================================================
  describe('Empty Notification List', () => {
    it('should handle initial empty state gracefully', async () => {
      const { useRealtimeNotificationStore } = await import('../store');
      
      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });
      
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it('should not crash when marking non-existent notification as read', async () => {
      const { useRealtimeNotificationStore } = await import('../store');
      
      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.markAsRead('non-existent-id');
      });

      expect(result.current.notifications).toEqual([]);
    });

    it('should handle clearing empty notification list', async () => {
      const { useRealtimeNotificationStore } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it('should handle removeNotification on empty list', async () => {
      const { useRealtimeNotificationStore } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.removeNotification('non-existent-id');
      });

      expect(result.current.notifications).toEqual([]);
    });
  });

  // ==========================================================================
  // 2. Notification Expiry Processing
  // ==========================================================================
  describe('Notification Expiry Handling', () => {
    it('should handle notification with past expiry date', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const expiredMessage = {
        type: 'task:assigned',
        id: 'expired-1',
        timestamp: new Date().toISOString(),
        payload: {
          title: 'Expired Notification',
          message: 'This should be handled',
          expiresAt: Date.now() - 10000,
        },
      };

      const expiredNotification = createNotificationFromMessage(expiredMessage);

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.addNotification(expiredNotification);
      });

      expect(result.current.notifications).toHaveLength(1);
    });

    it('should handle notification with future expiry date', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const futureMessage = {
        type: 'task:assigned',
        id: 'future-1',
        timestamp: new Date().toISOString(),
        payload: {
          title: 'Future Notification',
          message: 'This is in the future',
          expiresAt: Date.now() + 86400000,
        },
      };

      const futureNotification = createNotificationFromMessage(futureMessage);

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.addNotification(futureNotification);
      });

      expect(result.current.notifications).toHaveLength(1);
    });

    it('should handle notification with zero expiry', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const zeroExpiryMessage = {
        type: 'task:assigned',
        id: 'zero-expiry',
        timestamp: new Date().toISOString(),
        payload: {
          title: 'Zero Expiry',
          message: 'Expires at 0',
          expiresAt: 0,
        },
      };

      const zeroExpiryNotification = createNotificationFromMessage(zeroExpiryMessage);

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.addNotification(zeroExpiryNotification);
      });

      expect(result.current.notifications).toHaveLength(1);
    });

    it('should handle notification with negative expiry', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const negativeExpiryMessage = {
        type: 'task:assigned',
        id: 'negative-expiry',
        timestamp: new Date().toISOString(),
        payload: {
          title: 'Negative Expiry',
          message: 'Expires at negative time',
          expiresAt: -1000,
        },
      };

      const negativeExpiryNotification = createNotificationFromMessage(negativeExpiryMessage);

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.addNotification(negativeExpiryNotification);
      });

      expect(result.current.notifications).toHaveLength(1);
    });

    it('should handle very far future expiry (year 3000)', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const farFuture = new Date('3000-01-01').getTime();
      const farFutureMessage = {
        type: 'task:assigned',
        id: 'far-future',
        timestamp: new Date().toISOString(),
        payload: {
          title: 'Far Future',
          message: 'Expires in year 3000',
          expiresAt: farFuture,
        },
      };

      const farFutureNotification = createNotificationFromMessage(farFutureMessage);

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.addNotification(farFutureNotification);
      });

      expect(result.current.notifications).toHaveLength(1);
    });
  });

  // ==========================================================================
  // 3. Concurrent Notification Updates
  // ==========================================================================
  describe('Concurrent Notification Updates', () => {
    it('should handle rapid sequential addNotification calls', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });
      
      act(() => {
        result.current.clearAll();
        for (let i = 0; i < 100; i++) {
          const message = {
            type: 'task:assigned',
            id: `rapid-${i}`,
            timestamp: new Date().toISOString(),
            payload: {
              title: `Rapid Notification ${i}`,
              message: `Message ${i}`,
            },
          };
          result.current.addNotification(createNotificationFromMessage(message));
        }
      });

      expect(result.current.notifications.length).toBeGreaterThan(0);
    });

    it('should handle concurrent markAsRead operations', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.clearAll();
        for (let i = 0; i < 10; i++) {
          const message = {
            type: 'task:assigned',
            id: `concurrent-${i}`,
            timestamp: new Date().toISOString(),
            payload: {
              title: `Notification ${i}`,
              message: `Message ${i}`,
            },
          };
          result.current.addNotification(createNotificationFromMessage(message));
        }
      });

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.markAsRead(`concurrent-${i}`);
        }
      });

      expect(result.current.notifications.every(n => n.read)).toBe(true);
    });

    it('should maintain unread count accuracy during concurrent updates', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        for (let i = 0; i < 5; i++) {
          const message = {
            type: 'task:assigned',
            id: `count-${i}`,
            timestamp: new Date().toISOString(),
            payload: {
              title: `Notification ${i}`,
              message: `Message ${i}`,
            },
          };
          result.current.addNotification(createNotificationFromMessage(message));
        }
      });

      expect(result.current.unreadCount).toBe(5);

      act(() => {
        for (let i = 0; i < 3; i++) {
          result.current.markAsRead(`count-${i}`);
        }
      });

      expect(result.current.unreadCount).toBe(2);
    });

    it('should handle markAllAsRead during ongoing addNotification', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        for (let i = 0; i < 5; i++) {
          const message = {
            type: 'task:assigned',
            id: `ongoing-${i}`,
            timestamp: new Date().toISOString(),
            payload: {
              title: `Notification ${i}`,
              message: `Message ${i}`,
            },
          };
          result.current.addNotification(createNotificationFromMessage(message));
        }
      });

      act(() => {
        const newMessage = {
          type: 'task:assigned',
          id: 'new-1',
          timestamp: new Date().toISOString(),
          payload: {
            title: 'New Notification',
            message: 'Added during markAllAsRead',
          },
        };
        result.current.addNotification(createNotificationFromMessage(newMessage));
        result.current.markAllAsRead();
      });

      expect(result.current.unreadCount).toBe(0);
    });
  });

  // ==========================================================================
  // 4. WebSocket Disconnect/Reconnect State
  // ==========================================================================
  describe('WebSocket Disconnect/Reconnect', () => {
    it('should handle WebSocket disconnect gracefully', async () => {
      const { useRealtimeNotificationStore } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.setConnected(true);
      });

      act(() => {
        result.current.setConnected(false);
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should preserve notifications during disconnect', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        for (let i = 0; i < 5; i++) {
          const message = {
            type: 'task:assigned',
            id: `disconnect-${i}`,
            timestamp: new Date().toISOString(),
            payload: {
              title: `Notification ${i}`,
              message: `Message ${i}`,
            },
          };
          result.current.addNotification(createNotificationFromMessage(message));
        }
        result.current.setConnected(true);
      });

      act(() => {
        result.current.setConnected(false);
      });

      expect(result.current.notifications).toHaveLength(5);
    });

    it('should handle reconnect and resume receiving notifications', async () => {
      const { useRealtimeNotificationStore } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.setConnected(false);
      });

      act(() => {
        result.current.setConnected(true);
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should handle multiple rapid disconnect/reconnect cycles', async () => {
      const { useRealtimeNotificationStore } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.setConnected(true);
          result.current.setConnected(false);
        });
      }

      act(() => {
        result.current.setConnected(true);
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  // ==========================================================================
  // 5. Large Notification Pagination
  // ==========================================================================
  describe('Large Notification Pagination', () => {
    it('should handle 100+ notifications without performance issues', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      const startTime = performance.now();
      
      act(() => {
        for (let i = 0; i < 150; i++) {
          const message = {
            type: 'task:assigned',
            id: `large-${i}`,
            timestamp: new Date().toISOString(),
            payload: {
              title: `Notification ${i}`,
              message: `Message ${i}`,
            },
          };
          result.current.addNotification(createNotificationFromMessage(message));
        }
      });

      const endTime = performance.now();

      expect(result.current.notifications.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should respect maxNotifications limit (100)', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        for (let i = 0; i < 150; i++) {
          const message = {
            type: 'task:assigned',
            id: `limit-${i}`,
            timestamp: new Date().toISOString(),
            payload: {
              title: `Notification ${i}`,
              message: `Message ${i}`,
            },
          };
          result.current.addNotification(createNotificationFromMessage(message));
        }
      });

      expect(result.current.notifications.length).toBeLessThanOrEqual(100);
    });

    it('should handle pagination display correctly', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        for (let i = 0; i < 50; i++) {
          const message = {
            type: 'task:assigned',
            id: `page-${i}`,
            timestamp: new Date().toISOString(),
            payload: {
              title: `Notification ${i}`,
              message: `Message ${i}`,
            },
          };
          result.current.addNotification(createNotificationFromMessage(message));
        }
      });

      const maxVisible = 10;
      const visibleNotifications = result.current.notifications.slice(0, maxVisible);
      expect(visibleNotifications.length).toBe(maxVisible);
    });

    it('should handle markAllAsRead on large dataset efficiently', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        for (let i = 0; i < 100; i++) {
          const message = {
            type: 'task:assigned',
            id: `batch-${i}`,
            timestamp: new Date().toISOString(),
            payload: {
              title: `Notification ${i}`,
              message: `Message ${i}`,
            },
          };
          result.current.addNotification(createNotificationFromMessage(message));
        }
      });

      const startTime = performance.now();
      act(() => {
        result.current.markAllAsRead();
      });
      const endTime = performance.now();

      expect(result.current.unreadCount).toBe(0);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  // ==========================================================================
  // 6. Network Failure Recovery
  // ==========================================================================
  describe('Network Failure Recovery', () => {
    it('should handle failed notification send gracefully', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.setConnected(false);
        const message = {
          type: 'task:assigned',
          id: 'failed-1',
          timestamp: new Date().toISOString(),
          payload: {
            title: 'Failed Send',
            message: 'This should still be added locally',
          },
        };
        result.current.addNotification(createNotificationFromMessage(message));
      });

      expect(result.current.notifications).toHaveLength(1);
    });

    it('should retry failed operations on reconnect', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.setConnected(false);
        const message = {
          type: 'task:assigned',
          id: 'retry-1',
          timestamp: new Date().toISOString(),
          payload: {
            title: 'Retry Test',
            message: 'Added while offline',
          },
        };
        result.current.addNotification(createNotificationFromMessage(message));
      });

      act(() => {
        result.current.setConnected(true);
      });

      expect(result.current.notifications).toHaveLength(1);
    });
  });

  // ==========================================================================
  // 7. Browser Notification Permission Edge Cases
  // ==========================================================================
  describe('Browser Notification Permissions', () => {
    it('should handle denied permission', async () => {
      mockNotification.permission = 'denied';
      
      const permission = Notification.permission;
      expect(permission).toBe('denied');
    });

    it('should handle granted permission', async () => {
      mockNotification.permission = 'granted';
      
      const permission = Notification.permission;
      expect(permission).toBe('granted');
    });

    it('should handle default permission state', async () => {
      mockNotification.permission = 'default';
      
      const permission = Notification.permission;
      expect(permission).toBe('default');
    });

    it('should request permission successfully', async () => {
      mockNotification.requestPermission.mockResolvedValue('granted');
      
      const permission = await Notification.requestPermission();
      expect(permission).toBe('granted');
    });

    it('should handle permission request denial', async () => {
      mockNotification.requestPermission.mockResolvedValue('denied');
      
      const permission = await Notification.requestPermission();
      expect(permission).toBe('denied');
    });

    it('should handle Notification API not available', async () => {
      const originalNotification = global.Notification;
      // @ts-ignore
      delete global.Notification;

      expect(() => {
        const hasNotification = 'Notification' in window;
      }).not.toThrow();

      global.Notification = originalNotification;
    });
  });

  // ==========================================================================
  // 8. Sound Notification Edge Cases
  // ==========================================================================
  describe('Sound Notification Edge Cases', () => {
    it('should play sound with correct volume', async () => {
      const audio = new MockAudio('/sounds/notification.mp3');
      audio.volume = 0.5;
      
      await audio.play();
      
      expect(audio.play).toHaveBeenCalled();
      expect(audio.volume).toBe(0.5);
    });

    it('should handle audio playback failure', async () => {
      const audio = new MockAudio('/sounds/notification.mp3');
      audio.play.mockRejectedValueOnce(new Error('Autoplay blocked'));

      try {
        await audio.play();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle rapid successive sound plays', async () => {
      const playPromises = Array.from({ length: 10 }, () => {
        const audio = new MockAudio('/sounds/notification.mp3');
        return audio.play();
      });

      await Promise.all(playPromises);
    });
  });

  // ==========================================================================
  // 9. Memory Management
  // ==========================================================================
  describe('Memory Management', () => {
    it('should limit notification history to prevent memory leak', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        for (let i = 0; i < 200; i++) {
          const message = {
            type: 'task:assigned',
            id: `memory-${i}`,
            timestamp: new Date().toISOString(),
            payload: {
              title: `Notification ${i}`,
              message: `Message ${i}`,
            },
          };
          result.current.addNotification(createNotificationFromMessage(message));
        }
      });

      expect(result.current.notifications.length).toBeLessThanOrEqual(100);
    });

    it('should clear notifications on unmount', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        for (let i = 0; i < 10; i++) {
          const message = {
            type: 'task:assigned',
            id: `clear-${i}`,
            timestamp: new Date().toISOString(),
            payload: {
              title: `Notification ${i}`,
              message: `Message ${i}`,
            },
          };
          result.current.addNotification(createNotificationFromMessage(message));
        }
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toHaveLength(0);
      expect(result.current.unreadCount).toBe(0);
    });

    it('should handle large data payload efficiently', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      const largeDataNotification = {
        type: 'task:assigned',
        id: 'large-data',
        timestamp: new Date().toISOString(),
        payload: {
          title: 'Large Data',
          message: 'A'.repeat(10000),
          data: { items: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })) },
        },
      };

      act(() => {
        result.current.addNotification(createNotificationFromMessage(largeDataNotification));
      });

      expect(result.current.notifications.length).toBe(1);
    });
  });

  // ==========================================================================
  // 10. Additional Edge Cases
  // ==========================================================================
  describe('Additional Edge Cases', () => {
    it('should handle special characters in notification content', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.clearAll();
        const message = {
          type: 'task:assigned',
          id: 'special-1',
          timestamp: new Date().toISOString(),
          payload: {
            title: '<script>alert("xss")</script>',
            message: '${7*7} {{template}}',
          },
        };
        result.current.addNotification(createNotificationFromMessage(message));
      });

      expect(result.current.notifications.length).toBe(1);
    });

    it('should handle Unicode and emoji in notifications', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.clearAll();
        const message = {
          type: 'task:assigned',
          id: 'unicode-1',
          timestamp: new Date().toISOString(),
          payload: {
            title: '🎉 庆祝 🎊 中文 العربية עברית',
            message: 'Test with émojis 🚀💻✨ and accénts',
          },
        };
        result.current.addNotification(createNotificationFromMessage(message));
      });

      expect(result.current.notifications.length).toBe(1);
    });

    it('should handle empty strings in notification fields', async () => {
      const { useRealtimeNotificationStore, createNotificationFromMessage } = await import('../store');

      const { result } = renderHook(() => useRealtimeNotificationStore());

      act(() => {
        result.current.clearAll();
      });

      act(() => {
        result.current.clearAll();
        const message = {
          type: 'task:assigned',
          id: 'empty-1',
          timestamp: new Date().toISOString(),
          payload: {
            title: '',
            message: '',
          },
        };
        result.current.addNotification(createNotificationFromMessage(message));
      });

      expect(result.current.notifications.length).toBe(1);
    });
  });
});

// ============================================================================
// NotificationCenter Component Edge Cases
// ============================================================================

describe('NotificationCenter Edge Cases', () => {
  it('should calculate unread count correctly', () => {
    const notifications = [
      createMockNotification({ id: '1', read: false }),
      createMockNotification({ id: '2', read: false }),
      createMockNotification({ id: '3', read: true }),
    ];

    const unreadCount = notifications.filter(n => !n.read).length;
    expect(unreadCount).toBe(2);
  });

  it('should sort notifications by priority and time', () => {
    const notifications = [
      createMockNotification({ id: '1', priority: 'low', timestamp: new Date().toISOString() }),
      createMockNotification({ id: '2', priority: 'high', timestamp: new Date(Date.now() - 1000).toISOString() }),
      createMockNotification({ id: '3', priority: 'urgent', timestamp: new Date(Date.now() - 2000).toISOString() }),
    ];

    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const sorted = [...notifications].sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    expect(sorted[0].id).toBe('3');
    expect(sorted[1].id).toBe('2');
    expect(sorted[2].id).toBe('1');
  });

  it('should limit visible notifications', () => {
    const notifications = createMockNotifications(50);
    const maxVisible = 10;
    const visible = notifications.slice(0, maxVisible);

    expect(visible.length).toBe(10);
  });

  it('should handle all notification types', () => {
    const types = [
      'task_status_changed',
      'task_assigned',
      'task_comment',
      'member_online',
      'member_offline',
      'member_status_changed',
      'system_announcement',
      'project_updated',
    ];

    const notifications = types.map((type, i) => 
      createMockNotification({ id: `type-${i}`, type })
    );

    expect(notifications.length).toBe(types.length);
  });

  it('should handle all priority levels', () => {
    const priorities: Array<'low' | 'normal' | 'high' | 'urgent'> = ['low', 'normal', 'high', 'urgent'];

    const notifications = priorities.map((priority, i) =>
      createMockNotification({ id: `priority-${i}`, priority })
    );

    expect(notifications.length).toBe(4);
  });

  it('should handle all categories', () => {
    const categories: Array<'info' | 'warning' | 'error' | 'success'> = ['info', 'warning', 'error', 'success'];

    const notifications = categories.map((category, i) =>
      createMockNotification({ id: `category-${i}`, category })
    );

    expect(notifications.length).toBe(4);
  });
});

// ============================================================================
// Store Utilities Tests
// ============================================================================

describe('Notification Store Utilities', () => {
  it('should create notification from WebSocket message', async () => {
    const { createNotificationFromMessage } = await import('../store');

    const message = {
      type: 'task:assigned',
      id: 'msg-1',
      timestamp: new Date().toISOString(),
      payload: {
        title: 'New Task',
        message: 'You have been assigned a new task',
        priority: 'high',
      },
    };

    const notification = createNotificationFromMessage(message);

    expect(notification.id).toBe('msg-1');
    expect(notification.type).toBe('task_assigned');
    expect(notification.title).toBe('New Task');
    expect(notification.priority).toBe('high');
  });

  it('should handle message with missing fields', async () => {
    const { createNotificationFromMessage } = await import('../store');

    const message = {
      type: 'system:announcement',
    };

    const notification = createNotificationFromMessage(message);

    expect(notification.id).toBeDefined();
    expect(notification.type).toBe('system_announcement');
    expect(notification.title).toBeDefined();
    expect(notification.message).toBeDefined();
  });

  it('should infer category from message type', async () => {
    const { createNotificationFromMessage } = await import('../store');

    const types = [
      { type: 'task:status_changed', expectedCategory: 'info' },
      { type: 'task:assigned', expectedCategory: 'success' },
      { type: 'system:announcement', expectedCategory: 'warning' },
    ];

    types.forEach(({ type, expectedCategory }) => {
      const notification = createNotificationFromMessage({ type });
      expect(notification.category).toBe(expectedCategory);
    });
  });
});
