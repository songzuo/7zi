/**
 * WebSocket Manager - Connection Quality Tests
 *
 * Tests for connection quality metrics:
 * - Latency score calculation
 * - Stability score calculation
 * - Packet loss estimation
 * - Quality level determination
 *
 * Version: v1.12.2
 * Date: 2026-04-04
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

// Mock monitor
vi.mock('@/lib/monitoring', () => ({
  monitor: {
    trackCustomMetric: vi.fn(),
    trackError: vi.fn(),
  },
}))

describe('WebSocketManager - Connection Quality', () => {
  let mockSocket: Partial<Socket>
  let wsManager: WebSocketManager
  let eventHandlers: Map<string, Function>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    eventHandlers = new Map()

    // Create mock socket with proper event handling
    mockSocket = {
      connected: false,
      emit: vi.fn(),
      on: vi.fn((event: string, handler: Function) => {
        eventHandlers.set(event, handler)
      }),
      disconnect: vi.fn(),
    }
    ;(io as Mock).mockReturnValue(mockSocket as Socket)
  })

  afterEach(() => {
    vi.useRealTimers()
    if (wsManager) {
      wsManager.disconnect()
    }
  })

  describe('Initial Quality Metrics', () => {
    it('should initialize with excellent quality', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const stats = wsManager.getStats()
      expect(stats.connectionQuality).toBeDefined()
      expect(stats.connectionQuality?.qualityLevel).toBe('excellent')
      expect(stats.connectionQuality?.latencyScore).toBe(100)
      expect(stats.connectionQuality?.stabilityScore).toBe(100)
      expect(stats.connectionQuality?.packetLossEstimate).toBe(0)
    })

    it('should reset quality metrics on resetStats', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      // Simulate some activity
      wsManager.connect()
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) {
        connectHandler()
      }

      // Let some time pass
      vi.advanceTimersByTime(60000)

      // Reset
      wsManager.resetStats()

      const stats = wsManager.getStats()
      expect(stats.connectionQuality?.latencyScore).toBe(100)
      expect(stats.connectionQuality?.stabilityScore).toBe(100)
      expect(stats.connectionQuality?.packetLossEstimate).toBe(0)
    })
  })

  describe('Latency Score Calculation', () => {
    it('should calculate excellent latency score for very low latency', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.connect()
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) {
        connectHandler()
      }

      // Simulate 45ms latency by setting internal state
      ;(wsManager as any).stats.currentPingLatency = 45

      const stats = wsManager.getStats()

      // Score should be 100 for < 50ms
      expect(stats.connectionQuality?.latencyScore).toBe(100)
    })

    it('should calculate degraded latency score for high latency', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.connect()
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) {
        connectHandler()
      }

      // Manually set high latency for testing
      ;(wsManager as any).stats.currentPingLatency = 600

      const stats = wsManager.getStats()

      // Score should be low for > 500ms
      expect(stats.connectionQuality?.latencyScore).toBeLessThanOrEqual(40)
    })
  })

  describe('Stability Score Calculation', () => {
    it('should maintain high stability with successful heartbeats', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        heartbeatInterval: 10000,
      })

      wsManager.connect()
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) {
        connectHandler()
      }

      // Simulate successful heartbeats by incrementing counter
      ;(wsManager as any).consecutiveSuccessfulHeartbeats = 5
      vi.advanceTimersByTime(50000)

      const stats = wsManager.getStats()
      expect(stats.connectionQuality?.stabilityScore).toBeGreaterThanOrEqual(90)
    })

    it('should decrease stability with missed heartbeats', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        heartbeatInterval: 10000,
      })

      wsManager.connect()
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) {
        connectHandler()
      }

      // Advance time and simulate missed heartbeats
      vi.advanceTimersByTime(60000)

      // Add some failed attempts
      ;(wsManager as any).failedHeartbeatAttempts = 2
      ;(wsManager as any).consecutiveSuccessfulHeartbeats = 3

      const stats = wsManager.getStats()
      // Stability should be degraded
      expect(stats.connectionQuality?.stabilityScore).toBeLessThan(100)
    })
  })

  describe('Packet Loss Estimation', () => {
    it('should estimate low packet loss with stable connection', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        heartbeatInterval: 10000,
      })

      wsManager.connect()
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) {
        connectHandler()
      }

      // Simulate stable connection with successful heartbeats
      const pongHandler = eventHandlers.get('pong')
      for (let i = 0; i < 10; i++) {
        pongHandler!()
        vi.advanceTimersByTime(10000)
      }

      const stats = wsManager.getStats()

      // Packet loss should be very low
      expect(stats.connectionQuality?.packetLossEstimate).toBeLessThan(0.05)
    })

    it('should estimate higher packet loss with missed heartbeats', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        heartbeatInterval: 10000,
      })

      wsManager.connect()
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) {
        connectHandler()
      }

      // Advance time to create expected heartbeats
      vi.advanceTimersByTime(120000) // 2 minutes

      // Simulate missed heartbeats
      ;(wsManager as any).failedHeartbeatAttempts = 3

      const stats = wsManager.getStats()

      // Packet loss should be non-zero
      expect(stats.connectionQuality?.packetLossEstimate).toBeGreaterThan(0)
    })
  })

  describe('Quality Level Determination', () => {
    it('should report excellent quality for perfect connection', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.connect()
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) {
        connectHandler()
      }

      // Simulate perfect conditions
      const pongHandler = eventHandlers.get('pong')
      pongHandler!()
      pongHandler!()

      const stats = wsManager.getStats()
      expect(stats.connectionQuality?.qualityLevel).toBe('excellent')
    })

    it('should report poor quality for degraded connection', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.connect()
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) {
        connectHandler()
      }

      // Manually set degraded conditions
      ;(wsManager as any).stats.currentPingLatency = 600 // High latency
      ;(wsManager as any).failedHeartbeatAttempts = 5 // Missed heartbeats
      vi.advanceTimersByTime(120000) // Time has passed

      const stats = wsManager.getStats()

      // Quality should be degraded
      expect(['poor', 'critical']).toContain(stats.connectionQuality?.qualityLevel)
    })
  })

  describe('Quality Metrics Updates', () => {
    it('should update quality metrics over time', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      wsManager.connect()
      const connectHandler = eventHandlers.get('connect')
      if (connectHandler) {
        connectHandler()
      }

      const initialStats = wsManager.getStats()

      // Simulate activity
      const pongHandler = eventHandlers.get('pong')
      pongHandler!()
      vi.advanceTimersByTime(30000)

      const updatedStats = wsManager.getStats()

      // Metrics should be available
      expect(updatedStats.connectionQuality).toBeDefined()
      expect(updatedStats.connectionQuality?.latencyScore).toBeDefined()
      expect(updatedStats.connectionQuality?.stabilityScore).toBeDefined()
    })
  })
})
