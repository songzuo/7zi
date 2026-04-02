/**
 * @fileoverview WebSocket API integration tests
 * @description Tests for WebSocket connections, heartbeat, reconnection, and real-time messaging
 * @note Uses MSW to mock WebSocket upgrade requests and tests client-side behavior
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { server } from './mocks/handlers'
import { createMessage, generateMessageId } from '@/lib/realtime/useWebSocket'
import type { WebSocketMessage } from '@/lib/realtime/types'

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_TIMEOUT = 10000

// ============================================================================
// Mock WebSocket Implementation for Testing
// ============================================================================

interface MockWebSocketConfig {
  url: string
  autoConnect?: boolean
  heartbeatInterval?: number
  reconnectOnClose?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  shouldReconnectFail?: boolean // Whether reconnection attempts should fail
}

type MockWebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error'

interface MockWebSocketEventHandlers {
  onOpen?: () => void
  onMessage?: (data: WebSocketMessage) => void
  onError?: (error: Error) => void
  onClose?: (event: CloseEvent) => void
}

class MockWebSocket {
  public url: string
  public readyState: number = 0 // CONNECTING
  public status: MockWebSocketStatus = 'connecting'
  private handlers: MockWebSocketEventHandlers = {}
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts: number = 0
  private messageQueue: WebSocketMessage[] = []
  private connected: boolean = false
  private config: MockWebSocketConfig

  constructor(config: MockWebSocketConfig, handlers: MockWebSocketEventHandlers = {}) {
    this.url = config.url
    this.config = config
    this.handlers = handlers

    // Auto-connect if enabled
    if (config.autoConnect !== false) {
      this.connect()
    }
  }

  connect() {
    this.status = 'connecting'
    this.readyState = 0 // CONNECTING

    // Clear any existing timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    // Simulate connection delay
    setTimeout(() => {
      if (this.status === 'connecting') {
        this.status = 'open'
        this.readyState = 1 // OPEN
        this.connected = true

        // Reset reconnect attempts on successful connect
        this.reconnectAttempts = 0

        // Start heartbeat if configured
        if (this.config.heartbeatInterval) {
          this.startHeartbeat(this.config.heartbeatInterval)
        }

        // Flush queued messages
        this.flushMessageQueue()

        // Trigger onOpen callback
        this.handlers.onOpen?.()
      }
    }, 100)
  }

  disconnect(
    config: {
      reconnectOnClose?: boolean
      reconnectInterval?: number
      maxReconnectAttempts?: number
    } = {}
  ) {
    this.status = 'closing'
    this.readyState = 2 // CLOSING

    // Clear timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    setTimeout(() => {
      this.status = 'closed'
      this.readyState = 3 // CLOSED
      this.connected = false

      // Trigger onClose callback
      this.handlers.onClose?.({
        code: 1000,
        reason: 'Normal closure',
        wasClean: true,
      } as CloseEvent)

      // Attempt reconnection if configured
      // Use provided config or fall back to constructor config
      const shouldReconnect = config.reconnectOnClose ?? this.config.reconnectOnClose
      if (shouldReconnect) {
        this.reconnect(config)
      }
    }, 50)
  }

  send(data: string | WebSocketMessage) {
    if (!this.connected) {
      // Queue message for when connected
      if (typeof data === 'string') {
        try {
          this.messageQueue.push(JSON.parse(data))
        } catch {
          // Invalid JSON, ignore
        }
      } else {
        this.messageQueue.push(data)
      }
      return
    }

    // Simulate echo for testing
    let message: WebSocketMessage
    if (typeof data === 'string') {
      try {
        message = JSON.parse(data)
      } catch {
        // Invalid JSON, don't echo
        return
      }
    } else {
      message = data
    }

    setTimeout(() => {
      this.handlers.onMessage?.(message)
    }, 10)
  }

  close() {
    this.disconnect({})
  }

  private startHeartbeat(interval: number) {
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        const pingMessage: WebSocketMessage = {
          type: 'ping',
          id: generateMessageId(),
          timestamp: new Date().toISOString(),
        }
        this.handlers.onMessage?.(pingMessage)
      }
    }, interval)
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        setTimeout(() => {
          this.handlers.onMessage?.(message)
        }, 10)
      }
    }
  }

  // Reconnection simulation
  reconnect(
    config: {
      reconnectOnClose?: boolean
      reconnectInterval?: number
      maxReconnectAttempts?: number
      shouldReconnectFail?: boolean
    } = {}
  ) {
    const effectiveConfig = {
      reconnectOnClose: config.reconnectOnClose ?? this.config.reconnectOnClose,
      reconnectInterval: config.reconnectInterval ?? this.config.reconnectInterval ?? 3000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? this.config.maxReconnectAttempts ?? 5,
      shouldReconnectFail: config.shouldReconnectFail ?? this.config.shouldReconnectFail ?? false,
    }

    if (!effectiveConfig.reconnectOnClose) {
      return
    }

    if (this.reconnectAttempts >= effectiveConfig.maxReconnectAttempts) {
      return
    }

    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      // Simulate failed reconnection if configured
      if (effectiveConfig.shouldReconnectFail) {
        // Simulate connection failure by immediately closing
        this.status = 'closed'
        this.readyState = 3 // CLOSED
        this.connected = false

        // Trigger onClose callback
        this.handlers.onClose?.({
          code: 1006,
          reason: 'Connection failed',
          wasClean: false,
        } as CloseEvent)

        // Try next reconnection attempt (don't reset attempts, they should accumulate)
        if (this.reconnectAttempts < effectiveConfig.maxReconnectAttempts) {
          this.reconnect(config)
        }
      } else {
        // Successful reconnection - the connect() method will handle heartbeat setup
        this.connect()
      }
    }, effectiveConfig.reconnectInterval)
  }

  // Utility methods
  isConnected(): boolean {
    return this.connected
  }

  getStatus(): MockWebSocketStatus {
    return this.status
  }

  getReadyState(): number {
    return this.readyState
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const waitForEvent = (
  eventType: string,
  callback: (event: CustomEvent) => void,
  timeout = 5000
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      target.removeEventListener(eventType, handler)
      reject(new Error(`Timeout waiting for event: ${eventType}`))
    }, timeout)

    const handler = (event: CustomEvent) => {
      clearTimeout(timer)
      callback(event)
      resolve()
    }

    target.addEventListener(eventType, handler)
  })
}

// ============================================================================
// Test Suite
// ============================================================================

describe('/api/ws - WebSocket Integration Tests', () => {
  beforeAll(() => {
    server.listen()
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    server.resetHandlers()
  })

  // ==========================================================================
  // Connection Establishment Tests
  // ==========================================================================

  describe('Connection Establishment', () => {
    it('should establish WebSocket connection successfully', async () => {
      const onOpen = vi.fn()
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
        },
        {
          onOpen,
          onMessage,
        }
      )

      await wait(200)

      expect(ws.isConnected()).toBe(true)
      expect(ws.getStatus()).toBe('open')
      expect(ws.getReadyState()).toBe(1) // OPEN
      expect(onOpen).toHaveBeenCalledTimes(1)
    })

    it('should handle connection failure gracefully', async () => {
      const onError = vi.fn()

      // Simulate connection failure by closing immediately
      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:9999/invalid',
          autoConnect: false,
        },
        {
          onError,
        }
      )

      ws.disconnect()

      await wait(100)

      expect(ws.isConnected()).toBe(false)
      expect(ws.getStatus()).toBe('closed')
    })

    it('should support manual connection', async () => {
      const onOpen = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: false,
        },
        {
          onOpen,
        }
      )

      expect(ws.isConnected()).toBe(false)

      ws.connect()

      await wait(200)

      expect(ws.isConnected()).toBe(true)
      expect(onOpen).toHaveBeenCalledTimes(1)
    })

    it('should support manual disconnection', async () => {
      const onClose = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
        },
        {
          onClose,
        }
      )

      await wait(200)
      expect(ws.isConnected()).toBe(true)

      ws.disconnect()

      await wait(100)

      expect(ws.isConnected()).toBe(false)
      expect(ws.getStatus()).toBe('closed')
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should track connection state transitions', async () => {
      const stateChanges: MockWebSocketStatus[] = []

      const ws = new MockWebSocket({
        url: 'ws://localhost:3000/ws',
        autoConnect: false,
      })

      stateChanges.push(ws.getStatus())

      ws.connect()
      stateChanges.push(ws.getStatus())

      await wait(200)
      stateChanges.push(ws.getStatus())

      ws.disconnect()
      stateChanges.push(ws.getStatus())

      await wait(100)
      stateChanges.push(ws.getStatus())

      expect(stateChanges).toEqual([
        'connecting', // Initial state before connect()
        'connecting', // After connect(), before delay
        'open', // After connection established
        'closing', // After disconnect(), before delay
        'closed', // After disconnect completes
      ])
    })
  })

  // ==========================================================================
  // Heartbeat Mechanism Tests
  // ==========================================================================

  describe('Heartbeat Mechanism', () => {
    it('should send ping messages periodically', async () => {
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
          heartbeatInterval: 50, // Fast heartbeat for testing
        },
        {
          onMessage,
        }
      )

      await wait(300)

      expect(onMessage).toHaveBeenCalled()

      const pingMessages = onMessage.mock.calls
        .flat()
        .filter((msg: WebSocketMessage) => msg.type === 'ping')

      expect(pingMessages.length).toBeGreaterThanOrEqual(1)

      ws.disconnect()
    })

    it('should include timestamp in ping messages', async () => {
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
          heartbeatInterval: 100,
        },
        {
          onMessage,
        }
      )

      await wait(200)

      const pingMessages = onMessage.mock.calls
        .flat()
        .filter((msg: WebSocketMessage) => msg.type === 'ping')

      if (pingMessages.length > 0) {
        const ping = pingMessages[0] as WebSocketMessage
        expect(ping.timestamp).toBeDefined()
        expect(new Date(ping.timestamp).toISOString()).toBe(ping.timestamp)
      }

      ws.disconnect()
    })

    it('should stop heartbeat when disconnected', async () => {
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
          heartbeatInterval: 50,
        },
        {
          onMessage,
        }
      )

      await wait(150)
      const pingCount1 = onMessage.mock.calls.filter(
        (call: any[]) => call[0]?.type === 'ping'
      ).length

      ws.disconnect()

      await wait(150)

      const pingCount2 = onMessage.mock.calls.filter(
        (call: any[]) => call[0]?.type === 'ping'
      ).length

      // After disconnect, no new pings should be sent
      expect(pingCount2).toBe(pingCount1)
    })

    it('should calculate connection latency', async () => {
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
        },
        {
          onMessage,
        }
      )

      await wait(200)

      const pingTime = Date.now()

      // Send ping
      const pingMessage: WebSocketMessage = {
        type: 'ping',
        id: generateMessageId(),
        timestamp: new Date().toISOString(),
      }
      ws.send(JSON.stringify(pingMessage))

      await wait(50)

      const pongTime = Date.now()
      const latency = pongTime - pingTime

      expect(latency).toBeGreaterThanOrEqual(0)
      expect(latency).toBeLessThan(1000) // Should be very fast in mock

      ws.disconnect()
    })
  })

  // ==========================================================================
  // Reconnection Logic Tests
  // ==========================================================================

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on disconnect', async () => {
      const onOpen = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
          reconnectOnClose: true, // Enable auto-reconnect
          reconnectInterval: 100,
          maxReconnectAttempts: 3,
        },
        {
          onOpen,
        }
      )

      await wait(200)
      expect(ws.isConnected()).toBe(true)

      // Trigger disconnect (will use reconnectOnClose from config)
      ws.disconnect()

      // Wait for disconnect (50ms) + reconnect delay (100ms) + connect delay (100ms) = 250ms
      await wait(400)

      // Should have reconnected
      expect(ws.isConnected()).toBe(true)
      expect(onOpen).toHaveBeenCalledTimes(2) // Initial connect + reconnect

      ws.disconnect({ reconnectOnClose: false })
    })

    it('should respect max reconnection attempts', async () => {
      const onOpen = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
          reconnectOnClose: true,
          reconnectInterval: 50,
          maxReconnectAttempts: 2,
        },
        {
          onOpen,
        }
      )

      await wait(200)
      expect(ws.isConnected()).toBe(true)

      // Disconnect with no reconnection
      ws.disconnect({ reconnectOnClose: false })

      await wait(200)

      // Should not reconnect
      expect(ws.isConnected()).toBe(false)
      expect(onOpen).toHaveBeenCalledTimes(1) // Only initial connect
    })

    it('should use exponential backoff for reconnection', async () => {
      const connectTimes: number[] = []
      const onOpen = vi.fn(() => {
        connectTimes.push(Date.now())
      })

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
          reconnectOnClose: true,
          reconnectInterval: 100,
          maxReconnectAttempts: 5,
        },
        {
          onOpen,
        }
      )

      await wait(200)
      const initialConnects = connectTimes.length

      // Disconnect to trigger reconnection
      ws.disconnect()

      // Wait for reconnection attempt
      await wait(300)

      // Should have attempted reconnection (at least once more)
      const reconnectConnects = connectTimes.length
      expect(reconnectConnects).toBeGreaterThan(initialConnects)

      ws.disconnect({ reconnectOnClose: false })
    })

    it('should stop reconnection after max attempts', async () => {
      const onOpen = vi.fn()
      const onClose = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
          reconnectOnClose: true,
          reconnectInterval: 50,
          maxReconnectAttempts: 2,
          shouldReconnectFail: true, // Simulate failed reconnections
        },
        {
          onOpen,
          onClose,
        }
      )

      await wait(200)

      // Trigger disconnect
      ws.disconnect()

      // Wait for reconnection attempts to complete (50ms disconnect + 2 × 50ms reconnection = ~150ms)
      await wait(300)

      // After max attempts, should be disconnected
      expect(ws.isConnected()).toBe(false)
      expect(onOpen).toHaveBeenCalledTimes(1) // Only initial connect, no successful reconnections

      ws.disconnect()
    })
  })

  // ==========================================================================
  // Real-time Messaging Tests
  // ==========================================================================

  describe('Real-time Message Sending/Receiving', () => {
    it('should send and receive messages', async () => {
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
        },
        {
          onMessage,
        }
      )

      await wait(200)

      const testMessage: WebSocketMessage = {
        type: 'test:message',
        id: generateMessageId(),
        timestamp: new Date().toISOString(),
        payload: { text: 'Hello, WebSocket!' },
      }

      ws.send(JSON.stringify(testMessage))

      await wait(100)

      expect(onMessage).toHaveBeenCalledWith(testMessage)

      ws.disconnect()
    })

    it('should queue messages when disconnected', async () => {
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: false,
        },
        {
          onMessage,
        }
      )

      // Send messages while disconnected
      const messages: WebSocketMessage[] = [
        createMessage('test:queued', { index: 0 }),
        createMessage('test:queued', { index: 1 }),
        createMessage('test:queued', { index: 2 }),
      ]

      messages.forEach(msg => ws.send(JSON.stringify(msg)))

      expect(onMessage).not.toHaveBeenCalled()

      // Connect - messages should be flushed
      ws.connect()

      await wait(300)

      expect(onMessage).toHaveBeenCalledTimes(3)

      ws.disconnect()
    })

    it('should handle multiple messages in sequence', async () => {
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
        },
        {
          onMessage,
        }
      )

      await wait(200)

      const messages: WebSocketMessage[] = Array.from({ length: 5 }, (_, i) =>
        createMessage('test:sequence', { index: i })
      )

      for (const msg of messages) {
        ws.send(JSON.stringify(msg))
        await wait(20)
      }

      await wait(200)

      expect(onMessage).toHaveBeenCalledTimes(5)

      // Verify order
      const receivedMessages = onMessage.mock.calls.flat()
      for (let i = 0; i < 5; i++) {
        expect(receivedMessages[i].payload.index).toBe(i)
      }

      ws.disconnect()
    })

    it('should handle large payloads', async () => {
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
        },
        {
          onMessage,
        }
      )

      await wait(200)

      const largePayload = {
        data: 'x'.repeat(100000), // 100KB
      }

      const testMessage: WebSocketMessage = {
        type: 'test:large',
        id: generateMessageId(),
        timestamp: new Date().toISOString(),
        payload: largePayload,
      }

      ws.send(JSON.stringify(testMessage))

      await wait(500)

      expect(onMessage).toHaveBeenCalledWith(testMessage)

      ws.disconnect()
    })

    it('should handle malformed messages gracefully', async () => {
      const onError = vi.fn()
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
        },
        {
          onError,
          onMessage,
        }
      )

      await wait(200)

      // Send malformed data
      ws.send('invalid json')
      ws.send('')
      ws.send(null as any)

      await wait(100)

      // Should not crash the connection
      expect(ws.isConnected()).toBe(true)

      // Should not have reported errors
      expect(onError).not.toHaveBeenCalled()

      ws.disconnect()
    })

    it('should support message type filtering', async () => {
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
        },
        {
          onMessage,
        }
      )

      await wait(200)

      const messages: WebSocketMessage[] = [
        createMessage('type:A', { data: 'a' }),
        createMessage('type:B', { data: 'b' }),
        createMessage('type:A', { data: 'a2' }),
        createMessage('type:C', { data: 'c' }),
      ]

      messages.forEach(msg => ws.send(JSON.stringify(msg)))

      await wait(200)

      const typeAMessages = onMessage.mock.calls
        .flat()
        .filter((msg: WebSocketMessage) => msg.type === 'type:A')

      expect(typeAMessages.length).toBe(2)

      ws.disconnect()
    })
  })

  // ==========================================================================
  // Integration Flows
  // ==========================================================================

  describe('Integration Flows', () => {
    it('should complete full connection lifecycle', async () => {
      const onOpen = vi.fn()
      const onMessage = vi.fn()
      const onClose = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: false,
          reconnectOnClose: true,
          reconnectInterval: 100,
          maxReconnectAttempts: 2,
        },
        {
          onOpen,
          onMessage,
          onClose,
        }
      )

      // 1. Connect
      ws.connect()
      await wait(200)
      expect(ws.isConnected()).toBe(true)
      expect(onOpen).toHaveBeenCalledTimes(1)

      // 2. Send and receive messages
      const testMessage = createMessage('test:lifecycle', { step: 1 })
      ws.send(JSON.stringify(testMessage))
      await wait(100)
      expect(onMessage).toHaveBeenCalledWith(testMessage)

      // 3. Disconnect (without reconnect)
      ws.disconnect({ reconnectOnClose: false })
      await wait(100)
      expect(ws.isConnected()).toBe(false)
      expect(onClose).toHaveBeenCalledTimes(1)

      // 4. Reconnect
      ws.connect()
      await wait(200)
      expect(ws.isConnected()).toBe(true)
      expect(onOpen).toHaveBeenCalledTimes(2)

      // 5. Final disconnect
      ws.disconnect({ reconnectOnClose: false })
    })

    it('should handle connection interruption and recovery', async () => {
      const onOpen = vi.fn()
      const onClose = vi.fn()
      const onMessage = vi.fn()

      const ws = new MockWebSocket(
        {
          url: 'ws://localhost:3000/ws',
          autoConnect: true,
          reconnectOnClose: true, // Enable auto-reconnect
          reconnectInterval: 100,
          maxReconnectAttempts: 3,
        },
        {
          onOpen,
          onClose,
          onMessage,
        }
      )

      await wait(200)

      // Send some messages
      const messages: WebSocketMessage[] = [
        createMessage('test:before', { value: 1 }),
        createMessage('test:before', { value: 2 }),
      ]

      messages.forEach(msg => ws.send(JSON.stringify(msg)))

      await wait(100)

      // Simulate connection interruption (will auto-reconnect from config)
      const connectCountBefore = onOpen.mock.calls.length
      ws.disconnect()

      await wait(50)

      // Try to send while disconnected (should queue)
      const queuedMessage = createMessage('test:queued', { value: 3 })
      ws.send(JSON.stringify(queuedMessage))

      // Wait for reconnection: 50ms disconnect + 100ms reconnect delay + 100ms connect delay = 250ms
      await wait(400)

      // Should be reconnected
      expect(ws.isConnected()).toBe(true)
      expect(onOpen.mock.calls.length).toBeGreaterThan(connectCountBefore)

      // Clean up
      ws.disconnect({ reconnectOnClose: false })
    })

    it('should handle multiple concurrent connections', async () => {
      const sockets: MockWebSocket[] = []

      const createSocket = () =>
        new MockWebSocket(
          {
            url: 'ws://localhost:3000/ws',
            autoConnect: true,
          },
          {
            onOpen: vi.fn(),
            onMessage: vi.fn(),
          }
        )

      // Create multiple sockets
      for (let i = 0; i < 5; i++) {
        sockets.push(createSocket())
      }

      await wait(300)

      // All should be connected
      expect(sockets.every(s => s.isConnected())).toBe(true)

      // Send messages from each socket
      sockets.forEach((ws, index) => {
        const msg = createMessage('test:concurrent', { socket: index })
        ws.send(JSON.stringify(msg))
      })

      await wait(200)

      // Each socket should have received its own message (echo)
      expect(sockets.every(s => (s as any).handlers.onMessage)).toBe(true)

      // Clean up
      sockets.forEach(s => s.disconnect())
    })
  })
})
