/**
 * useNotifications Hook Tests
 *
 * 测试通知管理 React Hook 的功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useNotifications } from '../useNotifications'

// Mock Socket.IO client - must export both default and io named export
const { mockSocketInstance, getMockSocket } = vi.hoisted(() => {
  const callbacks: Record<string, any> = {}

  const mockSocket = {
    connected: false,
    on: vi.fn((event: string, callback: any) => {
      callbacks[event] = callback
      return mockSocket
    }),
    off: vi.fn((event: string) => {
      delete callbacks[event]
    }),
    emit: vi.fn(),
    disconnect: vi.fn(() => {
      mockSocket.connected = false
      if (callbacks.disconnect) callbacks.disconnect()
    }),
    connect: vi.fn(() => {
      if (!mockSocket.connected) {
        mockSocket.connected = true
        // Simulate async connection
        setTimeout(() => {
          if (callbacks.connect) callbacks.connect()
        }, 10)
      }
    }),
    callbacks,
  }

  return { mockSocketInstance: mockSocket, getMockSocket: () => mockSocket }
})

vi.mock('socket.io-client', () => {
  const ioFn = vi.fn(() => {
    // Auto-connect when io() is called
    setTimeout(() => {
      mockSocketInstance.connect()
    }, 10)
    return mockSocketInstance
  })
  return {
    default: ioFn,
    io: ioFn,
    __mockInstance: mockSocketInstance,
  }
})

// Export helper to get mock socket in tests
export { getMockSocket }

// Mock global Notification API
const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: vi.fn(() => Promise.resolve('granted')),
}

global.Notification = mockNotification as any

describe('useNotifications Hook', () => {
  beforeEach(() => {
    // Only clear call history, not mock implementations
    mockSocketInstance.on.mockClear()
    mockSocketInstance.emit.mockClear()
    mockSocketInstance.disconnect.mockClear()
    mockSocketInstance.connect.mockClear()
    mockNotification.permission = 'default'
    // Reset mock socket state but NOT callbacks (they're set by the hook)
    mockSocketInstance.connected = false
    // Reset fetch mock
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: [], meta: { unreadCount: 0 } }),
      })
    ) as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should start in disconnected status', () => {
      const { result } = renderHook(() => useNotifications())
      expect(result.current.status).toBe('disconnected')
      expect(result.current.isConnected).toBe(false)
    })

    it('should auto-connect by default', async () => {
      const { result } = renderHook(() => useNotifications())

      // Wait for connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      })
      expect(result.current.isConnected).toBe(true)
    })
  })

  describe('Connection Management', () => {
    it('should connect when connect is called', async () => {
      const { result } = renderHook(() => useNotifications({ autoConnect: false }))

      act(() => {
        result.current.connect()
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      })
    })

    it('should disconnect when disconnect is called', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        result.current.disconnect()
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.status).toBe('disconnected')
    })
  })

  describe('Notification Reception', () => {
    it('should receive and display notifications', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const testNotification = {
        id: '1',
        type: 'info' as const,
        title: 'Test',
        message: 'Test message',
        read: false,
        priority: 'medium' as const,
        createdAt: new Date().toISOString(),
      }

      act(() => {
        mockSocketInstance.callbacks.notification(testNotification)
      })

      expect(result.current.notifications).toContainEqual(testNotification)
    })

    it('should receive initial notifications', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const initialNotifs = [
        {
          id: '1',
          type: 'info' as const,
          title: 'Test 1',
          message: 'Message 1',
          read: false,
          priority: 'medium' as const,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'info' as const,
          title: 'Test 2',
          message: 'Message 2',
          read: true,
          priority: 'low' as const,
          createdAt: new Date().toISOString(),
        },
      ]

      act(() => {
        mockSocketInstance.callbacks.initial_notifications(initialNotifs)
      })

      expect(result.current.notifications).toHaveLength(2)
      expect(result.current.unreadCount).toBe(1)
    })

    it('should handle multiple notifications', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const notif1 = {
        id: '1',
        type: 'info' as const,
        title: 'Test 1',
        message: 'Message 1',
        read: false,
        priority: 'medium' as const,
        createdAt: new Date().toISOString(),
      }
      const notif2 = {
        id: '2',
        type: 'info' as const,
        title: 'Test 2',
        message: 'Message 2',
        read: false,
        priority: 'high' as const,
        createdAt: new Date().toISOString(),
      }

      act(() => {
        mockSocketInstance.callbacks.notification(notif1)
        mockSocketInstance.callbacks.notification(notif2)
      })

      expect(result.current.notifications).toHaveLength(2)
      expect(result.current.unreadCount).toBe(2)
    })
  })

  describe('Notification Read Status', () => {
    it('should mark notification as read', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const testNotification = {
        id: '1',
        type: 'info' as const,
        title: 'Test',
        message: 'Test message',
        read: false,
        priority: 'medium' as const,
        createdAt: new Date().toISOString(),
      }

      act(() => {
        mockSocketInstance.callbacks.notification(testNotification)
      })

      expect(result.current.unreadCount).toBe(1)

      act(() => {
        result.current.markAsRead('1')
      })

      expect(result.current.unreadCount).toBe(0)
    })

    it('should mark all notifications as read', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        mockSocketInstance.callbacks.initial_notifications([
          {
            id: '1',
            type: 'info' as const,
            title: 'Test 1',
            message: 'Message 1',
            read: false,
            priority: 'medium' as const,
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            type: 'info' as const,
            title: 'Test 2',
            message: 'Message 2',
            read: false,
            priority: 'low' as const,
            createdAt: new Date().toISOString(),
          },
        ])
      })

      expect(result.current.unreadCount).toBe(2)

      act(() => {
        result.current.markAllAsRead()
      })

      expect(result.current.unreadCount).toBe(0)
    })

    it('should handle read status from socket', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        mockSocketInstance.callbacks.notification({
          id: '1',
          type: 'info' as const,
          title: 'Test',
          message: 'Test message',
          read: false,
          priority: 'medium' as const,
          createdAt: new Date().toISOString(),
        })
      })

      expect(result.current.unreadCount).toBe(1)

      act(() => {
        mockSocketInstance.callbacks.notification_read('1')
      })

      expect(result.current.unreadCount).toBe(0)
    })
  })

  describe('Notification Deletion', () => {
    it('should delete notification', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        mockSocketInstance.callbacks.notification({
          id: '1',
          type: 'info' as const,
          title: 'Test',
          message: 'Test message',
          read: false,
          priority: 'medium' as const,
          createdAt: new Date().toISOString(),
        })
      })

      expect(result.current.notifications).toHaveLength(1)

      act(() => {
        result.current.deleteNotification('1')
      })

      expect(result.current.notifications).toHaveLength(0)
    })

    it('should handle deletion from socket', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        mockSocketInstance.callbacks.notification({
          id: '1',
          type: 'info' as const,
          title: 'Test',
          message: 'Test message',
          read: false,
          priority: 'medium' as const,
          createdAt: new Date().toISOString(),
        })
      })

      expect(result.current.notifications).toHaveLength(1)

      act(() => {
        mockSocketInstance.callbacks.notification_deleted('1')
      })

      expect(result.current.notifications).toHaveLength(0)
    })
  })

  describe('Refresh Notifications', () => {
    it('should refresh notifications via API', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      await act(async () => {
        await result.current.refreshNotifications()
      })

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle refresh errors gracefully', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      // Should not throw
      await act(async () => {
        await result.current.refreshNotifications()
      })
    })
  })

  describe('Unread Count Management', () => {
    it('should calculate unread count correctly', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        mockSocketInstance.callbacks.initial_notifications([
          {
            id: '1',
            type: 'info' as const,
            title: 'Test 1',
            message: 'Message 1',
            read: false,
            priority: 'medium' as const,
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            type: 'info' as const,
            title: 'Test 2',
            message: 'Message 2',
            read: true,
            priority: 'low' as const,
            createdAt: new Date().toISOString(),
          },
          {
            id: '3',
            type: 'info' as const,
            title: 'Test 3',
            message: 'Message 3',
            read: false,
            priority: 'high' as const,
            createdAt: new Date().toISOString(),
          },
        ])
      })

      expect(result.current.unreadCount).toBe(2)
    })

    it('should update unread count from socket', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        mockSocketInstance.callbacks.unread_count(5)
      })

      expect(result.current.unreadCount).toBe(5)
    })
  })

  describe('Options and Configuration', () => {
    it('should use custom socket URL', () => {
      const socketUrl = 'http://custom-server:3002'
      renderHook(() => useNotifications({ socketUrl }))

      const { io } = require('socket.io-client')
      expect(io).toHaveBeenCalledWith(socketUrl, expect.any(Object))
    })

    it('should subscribe to user channel', async () => {
      const { result } = renderHook(() => useNotifications({ userId: 'user-1' }))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      expect(mockSocketInstance.emit).toHaveBeenCalledWith(
        'subscribe',
        expect.objectContaining({
          userId: 'user-1',
        })
      )
    })

    it('should subscribe to team channel', async () => {
      const { result } = renderHook(() => useNotifications({ teamId: 'team-1' }))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      expect(mockSocketInstance.emit).toHaveBeenCalledWith(
        'subscribe',
        expect.objectContaining({
          teamId: 'team-1',
        })
      )
    })
  })

  describe('Connection Status', () => {
    it('should transition from connecting to connected', async () => {
      const { result } = renderHook(() => useNotifications({ autoConnect: false }))

      expect(result.current.status).toBe('disconnected')

      act(() => {
        result.current.connect()
      })

      expect(result.current.status).toBe('connecting')

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      })
    })

    it('should handle disconnect event', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        mockSocketInstance.callbacks.disconnect('client namespace disconnect')
      })

      expect(result.current.status).toBe('disconnected')
    })

    it('should handle connection error', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        mockSocketInstance.callbacks.connect_error(new Error('Connection failed'))
      })

      expect(result.current.status).toBe('error')
    })
  })
})
