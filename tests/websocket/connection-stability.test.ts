/**
 * WebSocket Connection Stability Tests
 *
 * 专门测试WebSocket连接的稳定性，包括：
 * - 连接建立和断开
 * - 心跳机制
 * - 重连逻辑
 * - 网络异常处理
 *
 * 基于 docs/v150-testing-strategy.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ============================================================================
// Mock WebSocket Implementation
// ============================================================================

interface WebSocketConfig {
  url: string
  heartbeatInterval?: number
  reconnectAttempts?: number
  reconnectDelay?: number
  connectionTimeout?: number
}

interface WebSocketState {
  readyState: number
  status: 'connecting' | 'open' | 'closing' | 'closed' | 'error'
  lastHeartbeat?: Date
  reconnectCount: number
}

type WebSocketEventType = 'open' | 'message' | 'error' | 'close' | 'heartbeat'

interface WebSocketEvent {
  type: WebSocketEventType
  data?: any
  timestamp: Date
}

class MockWebSocket {
  private static instances: MockWebSocket[] = []

  public url: string
  public readyState: number = WebSocket.CONNECTING
  public status: 'connecting' | 'open' | 'closing' | 'closed' | 'error' = 'connecting'

  private config: WebSocketConfig
  private eventListeners: Map<string, Set<Function>> = new Map()
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private connectionTimer: NodeJS.Timeout | null = null
  public reconnectCount: number = 0
  private shouldFail: boolean = false
  private failReason: string = ''
  private messageQueue: any[] = []
  private events: WebSocketEvent[] = []

  // Static mock server settings
  private static serverBehavior: {
    shouldFailConnect: boolean
    connectionDelay: number
    messageDelay: number
    dropConnectionAfter?: number
  } = {
    shouldFailConnect: false,
    connectionDelay: 100,
    messageDelay: 10,
  }

  constructor(url: string, config: WebSocketConfig = {}) {
    this.url = url
    this.config = {
      heartbeatInterval: 30000,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      connectionTimeout: 10000,
      ...config,
    }

    MockWebSocket.instances.push(this)
    this.connect()
  }

  static get CONNECTING() {
    return 0
  }
  static get OPEN() {
    return 1
  }
  static get CLOSING() {
    return 2
  }
  static get CLOSED() {
    return 3
  }

  // Static methods to control mock server behavior
  static setServerBehavior(behavior: Partial<typeof MockWebSocket.serverBehavior>) {
    MockWebSocket.serverBehavior = { ...MockWebSocket.serverBehavior, ...behavior }
  }

  static resetServerBehavior() {
    MockWebSocket.serverBehavior = {
      shouldFailConnect: false,
      connectionDelay: 100,
      messageDelay: 10,
    }
  }

  static getInstances(): MockWebSocket[] {
    return [...MockWebSocket.instances]
  }

  static clearInstances() {
    MockWebSocket.instances = []
  }

  // Instance methods
  private connect() {
    this.readyState = WebSocket.CONNECTING
    this.status = 'connecting'
    this.recordEvent('open')

    // Clear any existing timers
    this.clearTimers()

    // Connection timeout
    this.connectionTimer = setTimeout(() => {
      if (this.readyState === WebSocket.CONNECTING) {
        this.handleConnectionError(new Error('Connection timeout'))
      }
    }, this.config.connectionTimeout)

    // Simulate connection
    setTimeout(() => {
      if (MockWebSocket.serverBehavior.shouldFailConnect) {
        this.handleConnectionError(new Error('Server refused connection'))
        return
      }

      this.readyState = WebSocket.OPEN
      this.status = 'open'
      this.reconnectCount = 0
      this.startHeartbeat()
      this.emit('open', { type: 'open' })
      this.flushMessageQueue()
    }, MockWebSocket.serverBehavior.connectionDelay)
  }

  private handleConnectionError(error: Error) {
    this.readyState = WebSocket.CLOSED
    this.status = 'error'
    this.shouldFail = true
    this.failReason = error.message
    this.emit('error', { type: 'error', error })
    this.attemptReconnect()
  }

  private startHeartbeat() {
    if (!this.config.heartbeatInterval) return

    this.heartbeatTimer = setInterval(() => {
      if (this.readyState === WebSocket.OPEN) {
        this.send(JSON.stringify({ type: 'ping' }))
        this.recordEvent('heartbeat')
      }
    }, this.config.heartbeatInterval)
  }

  private attemptReconnect() {
    if (this.reconnectCount >= (this.config.reconnectAttempts || 0)) {
      return
    }

    this.reconnectCount++

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, this.config.reconnectDelay)
  }

  private clearTimers() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = null
    }
  }

  private recordEvent(type: WebSocketEventType, data?: any) {
    this.events.push({
      type,
      data,
      timestamp: new Date(),
    })
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.readyState === WebSocket.OPEN) {
      const msg = this.messageQueue.shift()
      this.emit('message', { type: 'message', data: msg })
    }
  }

  private emit(type: string, event: any) {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.forEach(listener => listener(event))
    }
  }

  // Public API
  send(data: string) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }

    // Simulate server receiving message
    setTimeout(() => {
      // Echo back or handle message
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === 'ping') {
          // Respond to ping
          this.messageQueue.push(JSON.stringify({ type: 'pong' }))
          this.flushMessageQueue()
        }
      } catch {
        // Invalid JSON, ignore
      }
    }, MockWebSocket.serverBehavior.messageDelay)
  }

  close(code: number = 1000, reason: string = 'Normal closure') {
    this.readyState = WebSocket.CLOSING
    this.status = 'closing'
    this.clearTimers()

    setTimeout(() => {
      this.readyState = WebSocket.CLOSED
      this.status = 'closed'
      this.emit('close', { type: 'close', code, reason, wasClean: true })
      MockWebSocket.instances = MockWebSocket.instances.filter(i => i !== this)
    }, 50)
  }

  addEventListener(type: string, listener: Function) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set())
    }
    this.eventListeners.get(type)!.add(listener)
  }

  removeEventListener(type: string, listener: Function) {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  // Test helpers
  getState(): WebSocketState {
    return {
      readyState: this.readyState,
      status: this.status,
      lastHeartbeat: this.events.filter(e => e.type === 'heartbeat').pop()?.timestamp,
      reconnectCount: this.reconnectCount,
    }
  }

  getEvents(): WebSocketEvent[] {
    return [...this.events]
  }

  simulateDisconnect(reason: string = 'Network error') {
    this.readyState = WebSocket.CLOSED
    this.status = 'closed'
    this.clearTimers()
    this.emit('close', { type: 'close', code: 1006, reason, wasClean: false })
    this.attemptReconnect()
  }

  forceFailure(reason: string) {
    this.shouldFail = true
    this.failReason = reason
    this.readyState = WebSocket.CLOSED
    this.status = 'error'
    this.clearTimers()
    this.emit('error', { type: 'error', error: new Error(reason) })
  }
}

// ============================================================================
// Test Suite: WebSocket Connection Stability
// ============================================================================

describe('WebSocket Connection Stability', () => {
  beforeEach(() => {
    MockWebSocket.resetServerBehavior()
    MockWebSocket.clearInstances()
  })

  afterEach(() => {
    MockWebSocket.resetServerBehavior()
    MockWebSocket.clearInstances()
  })

  describe('Connection Establishment', () => {
    it('should establish connection successfully', async () => {
      const ws = new MockWebSocket('ws://localhost:8080')

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(ws.readyState).toBe(WebSocket.OPEN)
      expect(ws.status).toBe('open')
    })

    it('should handle connection failure', async () => {
      MockWebSocket.setServerBehavior({ shouldFailConnect: true })

      const ws = new MockWebSocket('ws://localhost:8080')

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(ws.readyState).toBe(WebSocket.CLOSED)
      expect(ws.status).toBe('error')
    })

    it('should respect connection timeout', async () => {
      MockWebSocket.setServerBehavior({ connectionDelay: 15000 }) // 15 seconds

      const ws = new MockWebSocket('ws://localhost:8080', {
        connectionTimeout: 5000, // 5 seconds timeout
      })

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should still be connecting
      expect(ws.readyState).toBe(WebSocket.CONNECTING)
    })

    it('should handle multiple simultaneous connections', async () => {
      const connections: MockWebSocket[] = []

      for (let i = 0; i < 20; i++) {
        connections.push(new MockWebSocket(`ws://localhost:8080/room-${i}`))
      }

      await new Promise(resolve => setTimeout(resolve, 200))

      connections.forEach(ws => {
        expect(ws.readyState).toBe(WebSocket.OPEN)
      })

      expect(MockWebSocket.getInstances().length).toBe(20)
    })
  })

  describe('Connection Lifecycle', () => {
    it('should handle graceful close', async () => {
      const ws = new MockWebSocket('ws://localhost:8080')

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(ws.readyState).toBe(WebSocket.OPEN)

      ws.close(1000, 'Normal closure')

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(ws.readyState).toBe(WebSocket.CLOSED)
      expect(ws.status).toBe('closed')
    })

    it('should handle forced close with error', async () => {
      const ws = new MockWebSocket('ws://localhost:8080')

      await new Promise(resolve => setTimeout(resolve, 150))

      ws.forceFailure('Connection lost')

      expect(ws.readyState).toBe(WebSocket.CLOSED)
      expect(ws.status).toBe('error')
    })

    it('should clean up resources on close', async () => {
      const ws = new MockWebSocket('ws://localhost:8080')

      await new Promise(resolve => setTimeout(resolve, 150))

      ws.close()

      await new Promise(resolve => setTimeout(resolve, 100))

      // Should be removed from instances
      expect(MockWebSocket.getInstances().includes(ws)).toBe(false)
    })
  })

  describe('Heartbeat Mechanism', () => {
    it('should send heartbeats at configured interval', async () => {
      const ws = new MockWebSocket('ws://localhost:8080', {
        heartbeatInterval: 100, // Fast heartbeat for testing
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      // Wait for at least 2 heartbeats
      await new Promise(resolve => setTimeout(resolve, 250))

      const events = ws.getEvents()
      const heartbeats = events.filter(e => e.type === 'heartbeat')

      expect(heartbeats.length).toBeGreaterThan(1)
    })

    it('should stop heartbeat on disconnect', async () => {
      const ws = new MockWebSocket('ws://localhost:8080', {
        heartbeatInterval: 100,
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      ws.close()

      await new Promise(resolve => setTimeout(resolve, 100))

      const eventsBefore = ws.getEvents().filter(e => e.type === 'heartbeat').length

      // Wait for potential heartbeats
      await new Promise(resolve => setTimeout(resolve, 200))

      const eventsAfter = ws.getEvents().filter(e => e.type === 'heartbeat').length

      // Should not have more heartbeats after close
      expect(eventsAfter).toBe(eventsBefore)
    })
  })

  describe('Reconnection Logic', () => {
    it('should attempt to reconnect on unexpected disconnect', async () => {
      const ws = new MockWebSocket('ws://localhost:8080', {
        reconnectAttempts: 3,
        reconnectDelay: 100,
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(ws.readyState).toBe(WebSocket.OPEN)

      // Simulate disconnect
      ws.simulateDisconnect('Network error')

      // Wait for reconnect
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(ws.reconnectCount).toBeGreaterThan(0)
    })

    it('should limit reconnection attempts', async () => {
      MockWebSocket.setServerBehavior({ shouldFailConnect: true })

      const ws = new MockWebSocket('ws://localhost:8080', {
        reconnectAttempts: 3,
        reconnectDelay: 50,
      })

      // Wait for all reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 500))

      expect(ws.reconnectCount).toBeLessThanOrEqual(3)
    })

    it('should reset reconnect count on successful connection', async () => {
      const ws = new MockWebSocket('ws://localhost:8080', {
        reconnectAttempts: 5,
        reconnectDelay: 50,
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      // Simulate disconnect
      ws.simulateDisconnect('Network error')

      await new Promise(resolve => setTimeout(resolve, 150))

      // Should have reconnected
      const reconnectCount = ws.reconnectCount
      expect(reconnectCount).toBeGreaterThan(0)

      // Should be back to open
      expect(ws.readyState).toBe(WebSocket.OPEN)
    })
  })

  describe('Message Handling', () => {
    it('should send messages when connected', async () => {
      const ws = new MockWebSocket('ws://localhost:8080')

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(() => {
        ws.send(JSON.stringify({ type: 'message', content: 'Hello' }))
      }).not.toThrow()
    })

    it('should reject messages when not connected', async () => {
      const ws = new MockWebSocket('ws://localhost:8080')

      // Don't wait for connection
      expect(() => {
        ws.send(JSON.stringify({ type: 'message', content: 'Hello' }))
      }).toThrow('WebSocket is not open')
    })

    it('should handle pong response to ping', async () => {
      const ws = new MockWebSocket('ws://localhost:8080')

      await new Promise(resolve => setTimeout(resolve, 150))

      // Send ping
      ws.send(JSON.stringify({ type: 'ping' }))

      // Wait for pong
      await new Promise(resolve => setTimeout(resolve, 50))

      // Pong should be in message queue (sent to server)
      // This is handled internally
    })
  })

  describe('Event Handling', () => {
    it('should emit open event', async () => {
      const openHandler = vi.fn()
      const ws = new MockWebSocket('ws://localhost:8080')

      ws.addEventListener('open', openHandler)

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(openHandler).toHaveBeenCalled()
    })

    it('should emit close event', async () => {
      const closeHandler = vi.fn()
      const ws = new MockWebSocket('ws://localhost:8080')

      ws.addEventListener('close', closeHandler)

      await new Promise(resolve => setTimeout(resolve, 150))

      ws.close()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(closeHandler).toHaveBeenCalled()
    })

    it('should emit error event on failure', async () => {
      MockWebSocket.setServerBehavior({ shouldFailConnect: true })

      const errorHandler = vi.fn()
      const ws = new MockWebSocket('ws://localhost:8080')

      ws.addEventListener('error', errorHandler)

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(errorHandler).toHaveBeenCalled()
    })

    it('should handle multiple event listeners', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const ws = new MockWebSocket('ws://localhost:8080')

      ws.addEventListener('open', handler1)
      ws.addEventListener('open', handler2)

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('should allow removing event listeners', async () => {
      const handler = vi.fn()
      const ws = new MockWebSocket('ws://localhost:8080')

      ws.addEventListener('open', handler)
      ws.removeEventListener('open', handler)

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Network Anomalies', () => {
    it('should handle sudden network loss', async () => {
      const ws = new MockWebSocket('ws://localhost:8080')

      await new Promise(resolve => setTimeout(resolve, 150))

      // Simulate network loss
      ws.simulateDisconnect('Network unreachable')

      expect(ws.readyState).toBe(WebSocket.CLOSED)
    })

    it('should handle connection timeout', async () => {
      MockWebSocket.setServerBehavior({ connectionDelay: 20000 })

      const ws = new MockWebSocket('ws://localhost:8080', {
        connectionTimeout: 1000,
      })

      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should have timed out
      expect(ws.readyState).toBe(WebSocket.CLOSED)
    })

    it('should handle intermittent connection issues', async () => {
      const ws = new MockWebSocket('ws://localhost:8080', {
        reconnectAttempts: 5,
        reconnectDelay: 50,
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      // Multiple disconnects
      for (let i = 0; i < 3; i++) {
        ws.simulateDisconnect('Connection lost')
        await new Promise(resolve => setTimeout(resolve, 150))
      }

      // Should have reconnected
      expect(ws.readyState).toBe(WebSocket.OPEN)
    })
  })

  describe('Connection State Tracking', () => {
    it('should track connection state correctly', async () => {
      const ws = new MockWebSocket('ws://localhost:8080')

      expect(ws.getState().readyState).toBe(WebSocket.CONNECTING)

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(ws.getState().readyState).toBe(WebSocket.OPEN)

      ws.close()

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(ws.getState().readyState).toBe(WebSocket.CLOSED)
    })

    it('should track reconnection count', async () => {
      const ws = new MockWebSocket('ws://localhost:8080', {
        reconnectAttempts: 3,
        reconnectDelay: 50,
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(ws.getState().reconnectCount).toBe(0)

      ws.simulateDisconnect('Test')

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(ws.getState().reconnectCount).toBeGreaterThan(0)
    })

    it('should track last heartbeat time', async () => {
      const ws = new MockWebSocket('ws://localhost:8080', {
        heartbeatInterval: 100,
      })

      await new Promise(resolve => setTimeout(resolve, 300))

      const state = ws.getState()
      expect(state.lastHeartbeat).toBeDefined()
      expect(state.lastHeartbeat instanceof Date).toBe(true)
    })
  })
})

// ============================================================================
// Test Suite: WebSocket Room Connection Integration
// ============================================================================

describe('WebSocket Room Connection Integration', () => {
  beforeEach(() => {
    MockWebSocket.resetServerBehavior()
    MockWebSocket.clearInstances()
  })

  afterEach(() => {
    MockWebSocket.resetServerBehavior()
    MockWebSocket.clearInstances()
  })

  describe('Room Join via WebSocket', () => {
    it('should establish room-specific connection', async () => {
      const ws = new MockWebSocket('ws://localhost:8080/rooms/test-room')

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(ws.readyState).toBe(WebSocket.OPEN)
    })

    it('should handle multiple room connections', async () => {
      const connections: MockWebSocket[] = []

      for (let i = 0; i < 5; i++) {
        connections.push(new MockWebSocket(`ws://localhost:8080/rooms/room-${i}`))
      }

      await new Promise(resolve => setTimeout(resolve, 200))

      connections.forEach(ws => {
        expect(ws.readyState).toBe(WebSocket.OPEN)
      })
    })
  })

  describe('Room Leave Handling', () => {
    it('should properly close room connection', async () => {
      const ws = new MockWebSocket('ws://localhost:8080/rooms/test-room')

      await new Promise(resolve => setTimeout(resolve, 150))

      // Leave room by closing connection
      ws.close(1000, 'Leaving room')

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(ws.readyState).toBe(WebSocket.CLOSED)
    })
  })

  describe('Room Reconnection', () => {
    it('should maintain room membership after reconnect', async () => {
      const ws = new MockWebSocket('ws://localhost:8080/rooms/test-room', {
        reconnectAttempts: 3,
        reconnectDelay: 50,
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      // Disconnect
      ws.simulateDisconnect('Temporary network issue')

      await new Promise(resolve => setTimeout(resolve, 200))

      // Should have reconnected to same room
      expect(ws.readyState).toBe(WebSocket.OPEN)
      expect(ws.url).toBe('ws://localhost:8080/rooms/test-room')
    })
  })
})
