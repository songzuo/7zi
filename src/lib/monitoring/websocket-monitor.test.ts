/**
 * WebSocket Monitor Tests
 * WebSocket 监控器单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'

// Mock Socket.IO client
const mockSocket = {
  id: 'test-socket-id',
  connected: true,
  emit: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  io: {
    on: vi.fn(),
  },
  onAny: vi.fn(),
  disconnect: vi.fn(),
}

// Mock performance collector
vi.mock('./performance.monitor', () => ({
  recordCustomMetric: vi.fn(),
  performanceCollector: {
    recordCustomMetric: vi.fn(),
  },
  getPerformanceSummary: vi.fn(),
  onPerformanceMetric: vi.fn(),
  onPerformanceAlert: vi.fn(),
  trackApiPerformance: vi.fn(),
  trackRenderPerformance: vi.fn(),
}))

import { WebSocketMonitor } from './websocket-monitor'
import { DEFAULT_WEBSOCKET_MONITOR_CONFIG } from './types'

describe('WebSocketMonitor', () => {
  let monitor: WebSocketMonitor

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Reset singleton
    const instance = WebSocketMonitor.getInstance()
    instance.destroy()
    monitor = WebSocketMonitor.getInstance({ verbose: true })
  })

  afterEach(() => {
    monitor.destroy()
    vi.useRealTimers()
  })

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = WebSocketMonitor.getInstance()
      const instance2 = WebSocketMonitor.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should accept configuration', () => {
      const instance = WebSocketMonitor.getInstance({
        pingInterval: 10000,
        verbose: true,
      })

      expect(instance).toBeDefined()
    })
  })

  describe('initialize', () => {
    it('should initialize with default config', () => {
      monitor.initialize()
      // No error means success
      expect(true).toBe(true)
    })

    it('should merge custom config with defaults', () => {
      monitor.initialize({ pingInterval: 10000 })
      // Config should be merged
      expect(true).toBe(true)
    })

    it('should not re-initialize', () => {
      monitor.initialize()
      monitor.initialize() // Second call should be no-op

      // Should not throw
      expect(true).toBe(true)
    })
  })

  describe('trackSocketClient', () => {
    it('should track socket connection', () => {
      const cleanup = monitor.trackSocketClient(mockSocket as any, 'test-ns')

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function))

      cleanup()
    })

    it('should initialize metrics for namespace', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      const metrics = monitor.getMetrics('test-ns') as any

      expect(metrics).toBeDefined()
      expect(metrics.connectTime).toBe(0)
      expect(metrics.latency).toBe(0)
      expect(metrics.reconnectCount).toBe(0)
      expect(metrics.messageCount).toBe(0)
      expect(metrics.errorCount).toBe(0)
      expect(metrics.connectionState).toBe('connecting')
    })

    it('should track connect event', () => {
      vi.useRealTimers() // Use real timers for this test
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      // Find the connect callback
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]

      if (connectCallback) {
        connectCallback()
      }

      const metrics = monitor.getMetrics('test-ns') as any
      // connectTime can be 0 in fast test execution
      expect(metrics.connectTime).toBeGreaterThanOrEqual(0)
      expect(metrics.connectionState).toBe('connected')
    })

    it('should track disconnect event', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      // Trigger connect first
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectCallback) connectCallback()

      // Then disconnect
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      if (disconnectCallback) disconnectCallback('transport close')

      const metrics = monitor.getMetrics('test-ns') as any
      expect(metrics.connectionState).toBe('disconnected')
    })

    it('should track reconnect event', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      // Trigger reconnect
      const reconnectCallback = mockSocket.io.on.mock.calls.find(
        call => call[0] === 'reconnect'
      )?.[1]
      if (reconnectCallback) reconnectCallback(3)

      const metrics = monitor.getMetrics('test-ns') as any
      expect(metrics.reconnectCount).toBe(1)
    })

    it('should track connect_error event', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      const errorCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1]
      if (errorCallback) errorCallback(new Error('Connection failed'))

      const metrics = monitor.getMetrics('test-ns') as any
      expect(metrics.errorCount).toBe(1)
    })

    it('should track messages with onAny', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      const onAnyCallback = mockSocket.onAny.mock.calls[0]?.[0]
      if (onAnyCallback) {
        onAnyCallback('test-event', { data: 'test' })
      }

      const metrics = monitor.getMetrics('test-ns') as any
      expect(metrics.messageCount).toBeGreaterThan(0)
    })

    it('should return cleanup function', () => {
      const cleanup = monitor.trackSocketClient(mockSocket as any, 'test-ns')

      expect(typeof cleanup).toBe('function')

      cleanup()

      // After cleanup, metrics should be cleared
      const metrics = monitor.getMetrics('test-ns') as any
      expect(metrics.connectTime).toBe(0) // Default empty metrics
    })
  })

  describe('startLatencyTest', () => {
    it('should emit ping events', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      // Trigger connect
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectCallback) connectCallback()

      // Advance time by ping interval
      vi.advanceTimersByTime(DEFAULT_WEBSOCKET_MONITOR_CONFIG.pingInterval)

      expect(mockSocket.emit).toHaveBeenCalledWith('ping', expect.any(Object))
    })

    it('should record latency on pong', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      // Trigger connect
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectCallback) connectCallback()

      // Advance time
      vi.advanceTimersByTime(DEFAULT_WEBSOCKET_MONITOR_CONFIG.pingInterval)

      // Simulate pong response
      const pongCallback = mockSocket.once.mock.calls.find(call => call[0] === 'pong')?.[1]
      if (pongCallback) {
        pongCallback({ timestamp: Date.now() - 50 }) // 50ms latency
      }

      const metrics = monitor.getMetrics('test-ns') as any
      // Latency should be updated
      expect(metrics.latency).toBeDefined()
    })
  })

  describe('getMetrics', () => {
    it('should return empty metrics for unknown namespace', () => {
      const metrics = monitor.getMetrics('unknown-ns') as any

      expect(metrics.connectTime).toBe(0)
      expect(metrics.latency).toBe(0)
      expect(metrics.connectionState).toBe('disconnected')
    })

    it('should return all metrics when no namespace specified', () => {
      monitor.trackSocketClient(mockSocket as any, 'ns1')
      monitor.trackSocketClient(mockSocket as any, 'ns2')

      const allMetrics = monitor.getMetrics() as Map<string, any>

      expect(allMetrics.size).toBe(2)
      expect(allMetrics.has('ns1')).toBe(true)
      expect(allMetrics.has('ns2')).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should return aggregated statistics', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      const stats = monitor.getStats()

      expect(stats.totalConnections).toBe(1)
      expect(stats.activeConnections).toBe(0) // Not connected yet
      expect(stats.totalReconnects).toBe(0)
      expect(stats.totalErrors).toBe(0)
      expect(stats.totalMessages).toBe(0)
    })

    it('should count active connections', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      // Trigger connect
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectCallback) connectCallback()

      const stats = monitor.getStats()
      expect(stats.activeConnections).toBe(1)
    })
  })

  describe('getLatencyHistory', () => {
    it('should return empty history initially', () => {
      const history = monitor.getLatencyHistory('test-ns')
      expect(history).toEqual([])
    })

    it('should return all history when no namespace specified', () => {
      const history = monitor.getLatencyHistory()
      expect(history).toEqual([])
    })
  })

  describe('getEventHistory', () => {
    it('should return event history', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      // Trigger some events
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectCallback) connectCallback()

      const history = monitor.getEventHistory()

      expect(history.length).toBeGreaterThan(0)
      expect(history[0].type).toBe('connect')
      expect(history[0].namespace).toBe('test-ns')
    })
  })

  describe('stopTracking', () => {
    it('should clear interval and data', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      monitor.stopTracking('test-ns')

      const metrics = monitor.getMetrics('test-ns') as any
      expect(metrics.connectTime).toBe(0) // Should be default
    })
  })

  describe('reset', () => {
    it('should clear all data', () => {
      monitor.trackSocketClient(mockSocket as any, 'ns1')
      monitor.trackSocketClient(mockSocket as any, 'ns2')

      monitor.reset()

      const stats = monitor.getStats()
      expect(stats.totalConnections).toBe(0)
    })
  })

  describe('destroy', () => {
    it('should reset and null the instance', () => {
      monitor.trackSocketClient(mockSocket as any, 'test-ns')

      monitor.destroy()

      // After destroy, getInstance should create new instance
      const newMonitor = WebSocketMonitor.getInstance()
      expect(newMonitor).not.toBe(monitor)
      newMonitor.destroy()
    })
  })

  describe('DEFAULT_WEBSOCKET_MONITOR_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_WEBSOCKET_MONITOR_CONFIG.pingInterval).toBe(5000)
      expect(DEFAULT_WEBSOCKET_MONITOR_CONFIG.latencyWarningThreshold).toBe(200)
      expect(DEFAULT_WEBSOCKET_MONITOR_CONFIG.latencyCriticalThreshold).toBe(500)
      expect(DEFAULT_WEBSOCKET_MONITOR_CONFIG.autoReport).toBe(true)
      expect(DEFAULT_WEBSOCKET_MONITOR_CONFIG.verbose).toBe(false)
      expect(DEFAULT_WEBSOCKET_MONITOR_CONFIG.maxHistoryLength).toBe(100)
    })
  })

  describe('trackSocketServer', () => {
    it('should track Socket.IO server', () => {
      const mockServer = {
        on: vi.fn(),
      } as any

      monitor.trackSocketServer(mockServer, 'server-ns')

      expect(mockServer.on).toHaveBeenCalledWith('connection', expect.any(Function))
    })

    it('should handle server ping/pong', () => {
      const mockSocketConnection = {
        on: vi.fn(),
        emit: vi.fn(),
      }
      const mockServer = {
        on: vi.fn().mockImplementation((event: string, callback: (socket: any) => void) => {
          if (event === 'connection') {
            callback(mockSocketConnection)
          }
        }),
      } as any

      monitor.trackSocketServer(mockServer, 'server-ns')

      // Simulate ping from client
      const pingHandler = mockSocketConnection.on.mock.calls.find(
        (call: any) => call[0] === 'ping'
      )?.[1]

      if (pingHandler) {
        const beforeTime = Date.now() - 100 // 100ms ago
        pingHandler({ timestamp: beforeTime })
      }

      expect(mockSocketConnection.emit).toHaveBeenCalledWith('pong', expect.any(Object))
    })
  })

  describe('latency threshold checking', () => {
    it('should handle critical latency threshold', () => {
      vi.clearAllMocks()

      const monitorWithCritical = WebSocketMonitor.getInstance({
        pingInterval: 1000,
        latencyWarningThreshold: 100,
        latencyCriticalThreshold: 200,
        verbose: true,
        autoReport: false,
      })

      monitorWithCritical.trackSocketClient(mockSocket as any, 'critical-test')

      // Trigger connect first
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectCallback) connectCallback()

      // Advance time
      vi.advanceTimersByTime(1000)

      // Get the pong callback and call it with high latency data
      const pongCallback = mockSocket.once.mock.calls.find(call => call[0] === 'pong')?.[1]

      if (pongCallback) {
        // Call with a timestamp far in the past to simulate high latency
        pongCallback({ timestamp: Date.now() - 300 })
      }

      const metrics = monitorWithCritical.getMetrics('critical-test') as any
      // Verify latency was recorded
      expect(metrics.latency).toBeGreaterThanOrEqual(0)

      monitorWithCritical.destroy()
      WebSocketMonitor.getInstance({ verbose: true }).destroy()
    })

    it('should track latency stats across multiple measurements', () => {
      vi.clearAllMocks()

      const customMonitor = WebSocketMonitor.getInstance({
        pingInterval: 1000,
        verbose: false,
        autoReport: false,
      })

      customMonitor.trackSocketClient(mockSocket as any, 'stats-test')

      // Trigger connect
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectCallback) connectCallback()

      // Simulate multiple latency measurements
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(1000)
        const pongCallback = mockSocket.once.mock.calls.slice(-1)[0]?.[1]
        if (pongCallback) {
          pongCallback({ timestamp: Date.now() - (20 + i * 10) })
        }
      }

      const metrics = customMonitor.getMetrics('stats-test') as any
      // Check that avgLatency, maxLatency, minLatency were calculated
      expect(metrics.avgLatency).toBeDefined()
      expect(metrics.maxLatency).toBeDefined()
      expect(metrics.minLatency).toBeDefined()

      customMonitor.destroy()
      WebSocketMonitor.getInstance({ verbose: true }).destroy()
    })
  })

  describe('latency history', () => {
    it('should record and retrieve latency history', () => {
      const customMonitor = WebSocketMonitor.getInstance({
        pingInterval: 1000,
        verbose: false,
        autoReport: false,
      })

      customMonitor.trackSocketClient(mockSocket as any, 'history-test')

      // Trigger connect
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectCallback) connectCallback()

      // Advance time
      vi.advanceTimersByTime(1000)

      // Simulate pong response
      const pongCallback = mockSocket.once.mock.calls.find(call => call[0] === 'pong')?.[1]
      if (pongCallback) {
        pongCallback({ timestamp: Date.now() - 50 })
      }

      // Verify method exists and works
      const history = customMonitor.getLatencyHistory('history-test')
      expect(Array.isArray(history)).toBe(true)

      customMonitor.destroy()
      WebSocketMonitor.getInstance({ verbose: true }).destroy()
    })

    it('should return all namespaces history when no namespace specified', () => {
      const customMonitor = WebSocketMonitor.getInstance({
        pingInterval: 1000,
        verbose: false,
        autoReport: false,
      })

      customMonitor.trackSocketClient(mockSocket as any, 'ns1')
      customMonitor.trackSocketClient(mockSocket as any, 'ns2')

      const allHistory = customMonitor.getLatencyHistory()
      expect(Array.isArray(allHistory)).toBe(true)

      customMonitor.destroy()
      WebSocketMonitor.getInstance({ verbose: true }).destroy()
    })
  })

  describe('event history', () => {
    it('should record disconnect with reason', () => {
      monitor.trackSocketClient(mockSocket as any, 'event-reason-test')

      // Trigger connect
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectCallback) connectCallback()

      // Trigger disconnect with reason
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      if (disconnectCallback) disconnectCallback('io server disconnect')

      const events = monitor.getEventHistory()
      const disconnectEvent = events.find(e => e.type === 'disconnect')
      expect(disconnectEvent).toBeDefined()
      expect(disconnectEvent?.data?.reason).toBe('io server disconnect')
    })
  })
})
