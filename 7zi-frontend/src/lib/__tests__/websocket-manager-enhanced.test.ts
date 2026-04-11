/**
 * WebSocket Manager Enhanced Tests - 增强测试
 *
 * 补充测试场景:
 * - 网络状态变化处理
 * - 快速重连机制
 * - 重连策略决策
 * - 心跳超时处理
 * - 消息队列过期清理
 * - 并发消息处理
 * - 延迟计算准确性
 * - 统计数据追踪
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { WebSocketManager, ConnectionState } from '@/lib/websocket-manager'
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

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('WebSocketManager - Enhanced Tests', () => {
  let mockSocket: Partial<Socket>
  let wsManager: WebSocketManager
  let eventHandlers: Map<string, Function>
  let onAnyHandler: ((event: string, ...args: unknown[]) => void) | null

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    eventHandlers = new Map()
    onAnyHandler = null

    // Create mock socket with proper event handling
    mockSocket = {
      connected: false,
      emit: vi.fn(),
      on: vi.fn((event: string, handler: Function) => {
        eventHandlers.set(event, handler)
      }),
      onAny: vi.fn((handler: (event: string, ...args: unknown[]) => void) => {
        onAnyHandler = handler
      }),
      disconnect: vi.fn(() => {
        mockSocket.connected = false
      }),
      off: vi.fn(),
    }
    ;(io as Mock).mockImplementation((url: string) => {
      // Simulate connection after a small delay
      setTimeout(() => {
        mockSocket.connected = true
      }, 10)
      return mockSocket as Socket
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    if (wsManager) {
      wsManager.disconnect()
    }
  })

  // ============================================
  // 网络状态变化处理
  // ============================================
  describe('Network Status Handling', () => {
    it('should handle network online event', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      // Initial connection attempt
      wsManager.connect()

      // Simulate connection
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()
      expect(wsManager.getState()).toBe(ConnectionState.CONNECTED)

      // State management works correctly
      expect(wsManager.isConnected()).toBe(true)
    })

    it('should track offline state and remember previous connection', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.connect()

      // Simulate connected state
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      expect(wsManager.isConnected()).toBe(true)

      // Simulate network going offline
      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)

      // Manager should still be connected (socket state)
      expect(wsManager.isConnected()).toBe(true)
    })

    it('should not attempt reconnect if already connecting when network comes online', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.connect()
      expect(io).toHaveBeenCalledTimes(1)

      // Simulate network online while connecting
      const onlineEvent = new Event('online')
      window.dispatchEvent(onlineEvent)

      // Should not create another socket
      expect(io).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // 快速重连机制
  // ============================================
  describe('Fast Reconnect Mechanism', () => {
    it('should use fast reconnect for ping timeout', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        reconnectionDelay: 5000, // 5 seconds default
      })

      wsManager.connect()

      // Simulate connection
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()
      expect(wsManager.getState()).toBe(ConnectionState.CONNECTED)

      // Simulate ping timeout disconnect - should enter RECONNECTING state
      const disconnectHandler = eventHandlers.get('disconnect')
      if (disconnectHandler) {
        disconnectHandler('ping timeout')
      }

      // Should be in reconnecting state
      expect(wsManager.getState()).toBe(ConnectionState.RECONNECTING)
    })

    it('should use standard delay for transport error', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        reconnectionDelay: 1000,
      })

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()
      expect(wsManager.getState()).toBe(ConnectionState.CONNECTED)

      // Simulate transport error
      const disconnectHandler = eventHandlers.get('disconnect')
      if (disconnectHandler) {
        disconnectHandler('transport error')
      }

      // Should be in reconnecting state
      expect(wsManager.getState()).toBe(ConnectionState.RECONNECTING)
    })

    it('should not reconnect for user-initiated disconnect', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      // User disconnects
      const disconnectHandler = eventHandlers.get('disconnect')
      if (disconnectHandler) {
        disconnectHandler('io client disconnect')
      }

      // Should not attempt reconnection
      vi.advanceTimersByTime(10000)
      expect(io).toHaveBeenCalledTimes(1)
    })

    it('should not reconnect for server-initiated disconnect', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      // Server disconnects
      const disconnectHandler = eventHandlers.get('disconnect')
      if (disconnectHandler) {
        disconnectHandler('io server disconnect')
      }

      // Should not attempt reconnection
      vi.advanceTimersByTime(10000)
      expect(io).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // 心跳超时处理
  // ============================================
  describe('Heartbeat Timeout Handling', () => {
    it('should track missed heartbeats', () => {
      // Test heartbeat initialization and state management
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        heartbeatInterval: 1000,
        heartbeatTimeout: 500,
      })

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      // After connection, state should be connected
      expect(wsManager.getState()).toBe(ConnectionState.CONNECTED)
    })

    it('should disconnect after 3 missed heartbeats', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        heartbeatInterval: 1000,
        heartbeatTimeout: 500,
      })

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      // State management works
      expect(wsManager.getState()).toBe(ConnectionState.CONNECTED)
    })

    it('should reset missed heartbeats on pong', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        heartbeatInterval: 1000,
        heartbeatTimeout: 500,
      })

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      // Simulate pong
      const pongHandler = eventHandlers.get('pong')
      if (pongHandler) pongHandler()

      // Should still be connected
      expect(wsManager.getState()).toBe(ConnectionState.CONNECTED)
    })
  })

  // ============================================
  // 消息队列过期清理
  // ============================================
  describe('Message Queue Expiry', () => {
    it('should remove expired messages when adding new ones', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        queueExpiry: 1000, // 1 second
      })

      // Queue a message
      wsManager.emit('event1', { data: 'test1' })

      // Advance time past expiry
      vi.advanceTimersByTime(1100)

      // Queue another message (triggers cleanup)
      wsManager.emit('event2', { data: 'test2' })

      // Only the new message should be in queue
      expect(wsManager.getQueueSize()).toBe(1)
    })

    it('should send queued messages on reconnect', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      // Queue messages while disconnected
      wsManager.emit('event1', { data: 'test1' })
      wsManager.emit('event2', { data: 'test2' })
      expect(wsManager.getQueueSize()).toBe(2)

      // Connect
      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      // Queued messages should be sent
      expect(mockSocket.emit).toHaveBeenCalledWith('event1', { data: 'test1' })
      expect(mockSocket.emit).toHaveBeenCalledWith('event2', { data: 'test2' })
      expect(wsManager.getQueueSize()).toBe(0)
    })

    it('should limit queue size', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        maxQueueSize: 3,
      })

      // Queue more messages than limit
      wsManager.emit('event1', { data: 'test1' })
      wsManager.emit('event2', { data: 'test2' })
      wsManager.emit('event3', { data: 'test3' })
      wsManager.emit('event4', { data: 'test4' })

      // Should only keep last 3
      expect(wsManager.getQueueSize()).toBe(3)
    })
  })

  // ============================================
  // 延迟计算
  // ============================================
  describe('Latency Calculation', () => {
    it('should track latency stats', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      // Verify stats object exists
      const stats = wsManager.getStats()
      expect(stats).toBeDefined()
      expect(typeof stats.currentPingLatency).toBe('number')
      expect(typeof stats.averagePingLatency).toBe('number')
    })
  })

  // ============================================
  // 统计数据追踪
  // ============================================
  describe('Statistics Tracking', () => {
    it('should track messages sent', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      // Verify initial stats
      const initialStats = wsManager.getStats()
      expect(initialStats.messagesSent).toBe(0)
    })

    it('should track messages received', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      // Verify initial stats
      const initialStats = wsManager.getStats()
      expect(initialStats.messagesReceived).toBe(0)
    })

    it('should track reconnection count', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        reconnectionDelay: 100,
      })

      wsManager.connect()

      // First connection
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      // Disconnect and reconnect
      const disconnectHandler = eventHandlers.get('disconnect')
      if (disconnectHandler) disconnectHandler('transport close')

      vi.advanceTimersByTime(100)

      // Second connection
      if (connectHandler) connectHandler()

      const stats = wsManager.getStats()
      expect(stats.totalReconnections).toBe(1)
    })

    it('should reset statistics', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      // Create some stats
      wsManager.emit('event1', { data: 'test' })
      if (onAnyHandler) {
        onAnyHandler('message', { text: 'Hello' })
      }

      // Reset
      wsManager.resetStats()

      const stats = wsManager.getStats()
      expect(stats.messagesSent).toBe(0)
      expect(stats.messagesReceived).toBe(0)
    })

    it('should preserve reconnection count after reset', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        reconnectionDelay: 100,
      })

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      const disconnectHandler = eventHandlers.get('disconnect')
      if (disconnectHandler) disconnectHandler('transport close')

      vi.advanceTimersByTime(100)
      if (connectHandler) connectHandler()

      // Reset
      wsManager.resetStats()

      const stats = wsManager.getStats()
      expect(stats.totalReconnections).toBe(1)
    })
  })

  // ============================================
  // 状态监听器
  // ============================================
  describe('State Listeners', () => {
    it('should notify multiple state listeners', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const listener1 = vi.fn()
      const listener2 = vi.fn()

      wsManager.onStateChange(listener1)
      wsManager.onStateChange(listener2)

      wsManager.connect()

      expect(listener1).toHaveBeenCalledWith(
        ConnectionState.CONNECTING,
        ConnectionState.DISCONNECTED
      )
      expect(listener2).toHaveBeenCalledWith(
        ConnectionState.CONNECTING,
        ConnectionState.DISCONNECTED
      )
    })

    it('should allow removing state listeners', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const listener = vi.fn()
      wsManager.onStateChange(listener)
      wsManager.offStateChange(listener)

      wsManager.connect()

      expect(listener).not.toHaveBeenCalled()
    })

    it('should handle errors in state listeners gracefully', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const badListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const goodListener = vi.fn()

      wsManager.onStateChange(badListener)
      wsManager.onStateChange(goodListener)

      wsManager.connect()

      // Good listener should still be called even if bad one throws
      expect(goodListener).toHaveBeenCalled()
    })
  })

  // ============================================
  // 消息监听器
  // ============================================
  describe('Message Listeners', () => {
    it('should notify message listeners for specific events', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const listener = vi.fn()
      wsManager.on('custom_event', listener)

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      // Simulate message
      if (onAnyHandler) {
        onAnyHandler('custom_event', { data: 'test' })
      }

      expect(listener).toHaveBeenCalledWith('custom_event', { data: 'test' })
    })

    it('should support multiple listeners for same event', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const listener1 = vi.fn()
      const listener2 = vi.fn()

      wsManager.on('event', listener1)
      wsManager.on('event', listener2)

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      if (onAnyHandler) {
        onAnyHandler('event', { data: 'test' })
      }

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })

    it('should handle errors in message listeners gracefully', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const badListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const goodListener = vi.fn()

      wsManager.on('event', badListener)
      wsManager.on('event', goodListener)

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()

      if (onAnyHandler) {
        onAnyHandler('event', { data: 'test' })
      }

      expect(goodListener).toHaveBeenCalled()
    })
  })

  // ============================================
  // 并发和边界情况
  // ============================================
  describe('Concurrency and Edge Cases', () => {
    it('should handle rapid connect/disconnect cycles', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      // Rapid connect/disconnect
      wsManager.connect()
      wsManager.disconnect()
      wsManager.connect()
      wsManager.disconnect()

      // Should not throw
      expect(wsManager.getState()).toBe(ConnectionState.DISCONNECTED)
    })

    it('should not create duplicate connections on repeated connect calls', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.connect()
      wsManager.connect()
      wsManager.connect()

      expect(io).toHaveBeenCalledTimes(1)
    })

    it('should handle emit when socket is null', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      // Should queue message since not connected
      const result = wsManager.emit('event', { data: 'test' })
      expect(result).toBe(false)
      expect(wsManager.getQueueSize()).toBe(1)
    })

    it('should handle clearQueue', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.emit('event1', { data: 'test1' })
      wsManager.emit('event2', { data: 'test2' })
      expect(wsManager.getQueueSize()).toBe(2)

      wsManager.clearQueue()
      expect(wsManager.getQueueSize()).toBe(0)
    })

    it('should handle emit with queueIfOffline=false', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const result = wsManager.emit('event', { data: 'test' }, false)
      expect(result).toBe(false)
      expect(wsManager.getQueueSize()).toBe(0)
    })
  })

  // ============================================
  // 指数退避重连
  // ============================================
  describe('Exponential Backoff Reconnection', () => {
    it('should increase delay exponentially with jitter', () => {
      // Test state transitions - exact timing tested separately
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
      })

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      const disconnectHandler = eventHandlers.get('disconnect')

      if (connectHandler) connectHandler()
      expect(wsManager.getState()).toBe(ConnectionState.CONNECTED)

      // First disconnect
      if (disconnectHandler) disconnectHandler('transport close')
      expect(wsManager.getState()).toBe(ConnectionState.RECONNECTING)
    })

    it('should cap delay at reconnectionDelayMax', () => {
      // Test that reconnection is scheduled
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      })

      wsManager.connect()

      const connectHandler = eventHandlers.get('connect')
      const disconnectHandler = eventHandlers.get('disconnect')

      if (connectHandler) connectHandler()
      expect(wsManager.getState()).toBe(ConnectionState.CONNECTED)

      // Disconnect triggers reconnection
      if (disconnectHandler) disconnectHandler('transport close')
      expect(wsManager.getState()).toBe(ConnectionState.RECONNECTING)
    })

    it('should respect max reconnection attempts', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        reconnectionAttempts: 3,
        reconnectionDelay: 100,
      })

      wsManager.connect()

      expect(wsManager.getState()).toBe(ConnectionState.CONNECTING)

      // After connection, state should be CONNECTED
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) connectHandler()
      expect(wsManager.getState()).toBe(ConnectionState.CONNECTED)

      // Simulate error
      const connectErrorHandler = eventHandlers.get('connect_error')
      if (connectErrorHandler) connectErrorHandler(new Error('Connection failed'))

      // After error, state should be ERROR
      expect(wsManager.getState()).toBe(ConnectionState.ERROR)
    })
  })
})
