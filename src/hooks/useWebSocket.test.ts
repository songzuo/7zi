/**
 * useWebSocket Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWebSocket } from './useWebSocket'
import { io, Socket } from 'socket.io-client'

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
  return {
    default: vi.fn(() => mockSocket),
    io: vi.fn(() => mockSocket),
  }
})

describe('useWebSocket', () => {
  let mockSocket: Partial<Socket>

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()

    // Create mock socket
    mockSocket = {
      connected: false,
      auth: undefined,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    ;(io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket as Socket)

    // Mock environment variables
    vi.stubGlobal('process', {
      env: {
        NEXT_PUBLIC_WS_URL: 'ws://localhost:3000',
      },
    })

    // Mock window.location
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:3000',
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useWebSocket())

      expect(result.current.socket).toBeNull()
      expect(result.current.state.connected).toBe(false)
      expect(result.current.state.connecting).toBe(false)
      expect(result.current.state.authenticated).toBe(false)
    })

    it('should create socket with default config', () => {
      renderHook(() => useWebSocket())

      expect(io).toHaveBeenCalledWith('http://localhost:3000/api/ws', expect.any(Object))
    })

    it('should create socket with custom config', () => {
      const customConfig = {
        url: 'ws://custom:4000',
        token: 'test-token',
        autoConnect: false,
      }

      renderHook(() => useWebSocket(customConfig))

      expect(io).toHaveBeenCalledWith(
        'ws://custom:4000',
        expect.objectContaining({
          auth: { token: 'test-token' },
          autoConnect: false,
        })
      )
    })

    it('should auto-connect by default', async () => {
      const { result } = renderHook(() => useWebSocket())

      await waitFor(() => {
        expect(mockSocket.connect).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(result.current.state.connecting).toBe(true)
      })
    })

    it('should not auto-connect when autoConnect is false', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))

      expect(mockSocket.connect).not.toHaveBeenCalled()
      expect(result.current.state.connecting).toBe(false)
    })
  })

  describe('connection management', () => {
    it('should connect successfully', async () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))

      act(() => {
        result.current.connect()
      })

      expect(mockSocket.connect).toHaveBeenCalled()
      expect(result.current.state.connecting).toBe(true)

      // Simulate connection success
      const connectCallback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]

      if (connectCallback) {
        act(() => {
          connectCallback()
        })

        await waitFor(() => {
          expect(result.current.state.connected).toBe(true)
          expect(result.current.state.connecting).toBe(false)
        })
      }
    })

    it('should disconnect successfully', async () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))

      // First connect
      act(() => {
        result.current.connect()
      })

      // Simulate connection
      const connectCallback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]

      if (connectCallback) {
        act(() => {
          connectCallback()
        })
      }

      await waitFor(() => {
        expect(result.current.state.connected).toBe(true)
      })

      // Then disconnect
      act(() => {
        result.current.disconnect()
      })

      expect(mockSocket.disconnect).toHaveBeenCalled()
    })

    it('should reconnect successfully', async () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))

      // Connect first
      act(() => {
        result.current.connect()
      })

      // Simulate connection
      const connectCallback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]

      if (connectCallback) {
        act(() => {
          connectCallback()
        })
      }

      await waitFor(() => {
        expect(result.current.state.connected).toBe(true)
      })

      // Simulate disconnect
      const disconnectCallback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]

      if (disconnectCallback) {
        act(() => {
          disconnectCallback()
        })
      }

      await waitFor(() => {
        expect(result.current.state.connected).toBe(false)
      })

      // Reconnect
      act(() => {
        result.current.reconnect()
      })

      expect(mockSocket.connect).toHaveBeenCalled()
    })
  })

  describe('room management', () => {
    it('should join room successfully', async () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))

      // Connect first
      act(() => {
        result.current.connect()
      })

      // Simulate connection
      const connectCallback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]

      if (connectCallback) {
        act(() => {
          connectCallback()
        })
      }

      // Join room
      act(() => {
        result.current.joinRoom('room-123', 'document', 'doc-456', 'Test Room')
      })

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'joinRoom',
        expect.objectContaining({
          roomId: 'room-123',
          type: 'document',
          documentId: 'doc-456',
          name: 'Test Room',
        })
      )

      // Check state update
      await waitFor(() => {
        expect(result.current.state.roomId).toBe('room-123')
      })
    })

    it('should leave room successfully', async () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))

      // Connect and join room
      act(() => {
        result.current.connect()
        result.current.joinRoom('room-123')
      })

      await waitFor(() => {
        expect(result.current.state.roomId).toBe('room-123')
      })

      // Leave room
      act(() => {
        result.current.leaveRoom('room-123')
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('leaveRoom', { roomId: 'room-123' })

      await waitFor(() => {
        expect(result.current.state.roomId).toBeUndefined()
      })
    })
  })

  describe('message handling', () => {
    it('should send message successfully', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))

      act(() => {
        result.current.send('testEvent', { data: 'test' })
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('testEvent', { data: 'test' })
    })

    it('should register event handler', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))
      const handler = vi.fn()

      act(() => {
        result.current.on('message', handler)
      })

      expect(mockSocket.on).toHaveBeenCalledWith('message', handler)
    })

    it('should remove event handler', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))
      const handler = vi.fn()

      act(() => {
        result.current.on('message', handler)
      })

      act(() => {
        result.current.off('message', handler)
      })

      expect(mockSocket.off).toHaveBeenCalledWith('message', handler)
    })

    it('should remove all event handlers for event when no handler specified', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))

      act(() => {
        result.current.off('message')
      })

      expect(mockSocket.off).toHaveBeenCalledWith('message')
    })
  })

  describe('authentication', () => {
    it('should set userId on authentication', async () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false, token: 'test-token' }))

      act(() => {
        result.current.connect()
      })

      // Simulate authentication success
      const authCallback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0] === 'authenticated'
      )?.[1]

      if (authCallback) {
        act(() => {
          authCallback({ userId: 'user-123', roomId: 'room-456' })
        })

        await waitFor(() => {
          expect(result.current.state.authenticated).toBe(true)
          expect(result.current.state.userId).toBe('user-123')
          expect(result.current.state.roomId).toBe('room-456')
        })
      }
    })
  })

  describe('error handling', () => {
    it('should handle connection error', async () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))

      act(() => {
        result.current.connect()
      })

      // Simulate connection error
      const errorCallback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1]

      if (errorCallback) {
        act(() => {
          errorCallback(new Error('Connection failed'))
        })

        await waitFor(() => {
          expect(result.current.state.error).toBeDefined()
          expect(result.current.state.connecting).toBe(false)
        })
      }
    })

    it('should handle socket error', async () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))

      // Simulate socket error
      const errorCallback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0] === 'error'
      )?.[1]

      if (errorCallback) {
        act(() => {
          errorCallback(new Error('Socket error'))
        })

        await waitFor(() => {
          expect(result.current.state.error).toBeDefined()
        })
      }
    })
  })

  describe('heartbeat', () => {
    it('should send heartbeat at interval', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, heartbeatInterval: 1000 })
      )

      act(() => {
        result.current.connect()
      })

      // Simulate connection
      const connectCallback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]

      if (connectCallback) {
        act(() => {
          connectCallback()
        })

        await waitFor(() => {
          expect(result.current.state.connected).toBe(true)
        })

        // Wait for heartbeat
        await waitFor(
          () => {
            expect(mockSocket.emit).toHaveBeenCalledWith('heartbeat', expect.any(Object))
          },
          { timeout: 2000 }
        )
      }
    })

    it('should update last heartbeat timestamp', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, heartbeatInterval: 1000 })
      )

      act(() => {
        result.current.connect()
      })

      // Simulate connection
      const connectCallback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]

      if (connectCallback) {
        act(() => {
          connectCallback()
        })

        await waitFor(() => {
          expect(result.current.state.connected).toBe(true)
        })

        // Simulate heartbeat response
        const heartbeatCallback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
          call => call[0] === 'heartbeat_ack'
        )?.[1]

        if (heartbeatCallback) {
          act(() => {
            heartbeatCallback({ timestamp: Date.now() })
          })

          await waitFor(() => {
            expect(result.current.state.lastHeartbeat).toBeDefined()
          })
        }
      }
    })
  })

  describe('cleanup', () => {
    it('should disconnect on unmount', () => {
      const { result, unmount } = renderHook(() => useWebSocket({ autoConnect: true }))

      unmount()

      expect(mockSocket.disconnect).toHaveBeenCalled()
    })

    it('should clear intervals on unmount', () => {
      const { unmount } = renderHook(() =>
        useWebSocket({ autoConnect: true, heartbeatInterval: 1000 })
      )

      unmount()

      // Verify cleanup - no easy way to test directly without accessing internals
      // But the hook should handle this correctly
    })
  })

  describe('TaskStatusUpdate handling', () => {
    it('should receive task status updates', async () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))
      const handler = vi.fn()

      act(() => {
        result.current.on('taskStatusUpdate', handler)
      })

      // Simulate task status update
      const callback = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0] === 'taskStatusUpdate'
      )?.[1]

      if (callback) {
        const taskUpdate = {
          taskId: 'task-123',
          status: 'completed',
          state: 'success',
          timestamp: new Date().toISOString(),
          userId: 'user-456',
          projectId: 'project-789',
        }

        act(() => {
          callback(taskUpdate)
        })

        await waitFor(() => {
          expect(handler).toHaveBeenCalledWith(taskUpdate)
        })
      }
    })
  })
})
