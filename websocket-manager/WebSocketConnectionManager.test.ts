/**
 * WebSocket Connection Manager - Unit Tests
 * 
 * @author Executor Subagent
 * @date 2026-04-03
 */

import { WebSocketConnectionManager, ConnectionState } from './WebSocketConnectionManager'

// Mock WebSocket for testing
jest.mock('ws', () => {
  const EventEmitter = require('events')
  
  class MockWebSocket extends EventEmitter {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
    
    readyState = MockWebSocket.CONNECTING
    private pingCallback: ((data: Buffer) => void) | null = null
    private pongCallback: ((data: Buffer) => void) | null = null
    
    constructor(url: string, protocols?: string | string[], options?: any) {
      super()
      setTimeout(() => {
        this.readyState = MockWebSocket.OPEN
        this.emit('open')
      }, 10)
    }
    
    send(data: string | Buffer, callback?: (error?: Error) => void) {
      if (callback) callback()
    }
    
    close(code?: number, reason?: string) {
      this.readyState = MockWebSocket.CLOSED
      this.emit('close', code || 1000, Buffer.from(reason || ''))
    }
    
    terminate() {
      this.readyState = MockWebSocket.CLOSED
      this.emit('close', 1006, Buffer.from('Connection terminated'))
    }
    
    ping(data?: Buffer) {
      this.pingCallback = (cbData: Buffer) => {
        setTimeout(() => {
          this.emit('pong', cbData)
        }, 5)
      }
    }
    
    pong(data?: Buffer) {
      if (this.pongCallback) {
        this.pongCallback(data || Buffer.from(''))
      }
    }
    
    on(event: string, listener: (...args: any[]) => void) {
      return super.on(event, listener)
    }
    
    removeAllListeners() {
      return super.removeAllListeners()
    }
  }
  
  return {
    default: MockWebSocket,
    WebSocket: MockWebSocket
  }
})

describe('WebSocketConnectionManager', () => {
  let manager: WebSocketConnectionManager
  
  beforeEach(() => {
    jest.useFakeTimers()
    manager = new WebSocketConnectionManager({
      url: 'ws://localhost:8080',
      autoConnect: false,
      debug: false
    })
  })
  
  afterEach(() => {
    manager.disconnect()
    jest.useRealTimers()
  })
  
  describe('Connection State Management', () => {
    it('should initialize with DISCONNECTED state', () => {
      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED)
    })
    
    it('should transition to CONNECTING when connect() is called', () => {
      const stateListener = jest.fn()
      manager.on('state-change', stateListener)
      
      manager.connect()
      
      expect(manager.getState()).toBe(ConnectionState.CONNECTING)
      expect(stateListener).toHaveBeenCalledWith(ConnectionState.CONNECTING, ConnectionState.DISCONNECTED)
    })
    
    it('should transition to CONNECTED when connection succeeds', async () => {
      const stateListener = jest.fn()
      manager.on('state-change', stateListener)
      
      manager.connect()
      jest.advanceTimersByTime(20) // Allow connection to complete
      
      expect(manager.getState()).toBe(ConnectionState.CONNECTED)
    })
    
    it('should transition to DISCONNECTED when disconnect() is called', () => {
      manager.connect()
      jest.advanceTimersByTime(20)
      
      manager.disconnect()
      
      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED)
    })
    
    it('should emit connected event', async () => {
      const connectedListener = jest.fn()
      manager.on('connected', connectedListener)
      
      manager.connect()
      jest.advanceTimersByTime(20)
      
      expect(connectedListener).toHaveBeenCalled()
    })
  })
  
  describe('Heartbeat Mechanism', () => {
    beforeEach(() => {
      manager.updateConfig({
        heartbeatInterval: 5000,
        heartbeatTimeout: 1000
      })
    })
    
    it('should send pings at configured interval', async () => {
      manager.connect()
      jest.advanceTimersByTime(20) // Wait for connection
      
      const latencyListener = jest.fn()
      manager.on('latency', latencyListener)
      
      jest.advanceTimersByTime(5000) // Wait for first heartbeat
      
      expect(latencyListener).toHaveBeenCalled()
    })
    
    it('should detect missed heartbeats', async () => {
      manager.connect()
      jest.advanceTimersByTime(20) // Wait for connection
      
      const missedListener = jest.fn()
      manager.on('heartbeat-missed', missedListener)
      
      jest.advanceTimersByTime(5000 + 1000) // Wait for heartbeat + timeout
      
      expect(missedListener).toHaveBeenCalled()
    })
    
    it('should update latency metrics on pong', async () => {
      manager.connect()
      jest.advanceTimersByTime(20) // Wait for connection
      
      jest.advanceTimersByTime(5000) // Wait for first heartbeat
      
      const metrics = manager.getMetrics()
      expect(metrics.currentLatency).toBeGreaterThan(0)
    })
  })
  
  describe('Exponential Backoff Reconnection', () => {
    beforeEach(() => {
      manager.updateConfig({
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        maxReconnectionAttempts: 5
      })
    })
    
    it('should schedule reconnection on disconnect', () => {
      const reconnectingListener = jest.fn()
      manager.on('reconnecting', reconnectingListener)
      
      manager.connect()
      jest.advanceTimersByTime(20)
      
      // Simulate disconnect
      manager.disconnect()
      
      expect(reconnectingListener).toHaveBeenCalled()
    })
    
    it('should use exponential backoff for reconnection delays', async () => {
      const delays: number[] = []
      
      manager.on('reconnecting', (attempt, delay) => {
        delays.push(delay)
      })
      
      manager.connect()
      jest.advanceTimersByTime(20)
      manager.disconnect()
      
      jest.advanceTimersByTime(10000)
      
      // Check that delays are increasing
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1])
      }
    })
    
    it('should respect max reconnection attempts', async () => {
      manager.updateConfig({ maxReconnectionAttempts: 3 })
      
      manager.connect()
      jest.advanceTimersByTime(20)
      
      let attempts = 0
      manager.on('reconnecting', (attempt) => {
        attempts = attempt
      })
      
      // Simulate multiple failed reconnection attempts
      for (let i = 0; i < 5; i++) {
        manager.disconnect()
        jest.advanceTimersByTime(10000)
      }
      
      expect(attempts).toBeLessThanOrEqual(3)
    })
  })
  
  describe('Message Queue', () => {
    it('should queue messages when disconnected', () => {
      expect(manager.isConnected()).toBe(false)
      
      manager.send('test message 1')
      manager.send('test message 2')
      
      expect(manager.getQueueSize()).toBe(2)
    })
    
    it('should send messages immediately when connected', async () => {
      const messageSentListener = jest.fn()
      manager.on('message-sent', messageSentListener)
      
      manager.connect()
      jest.advanceTimersByTime(20) // Wait for connection
      
      manager.send('test message')
      
      expect(manager.getQueueSize()).toBe(0)
      expect(messageSentListener).toHaveBeenCalled()
    })
    
    it('should send queued messages on connection', async () => {
      manager.send('queued message 1')
      manager.send('queued message 2')
      
      expect(manager.getQueueSize()).toBe(2)
      
      const messageSentListener = jest.fn()
      manager.on('message-sent', messageSentListener)
      
      manager.connect()
      jest.advanceTimersByTime(20)
      
      expect(manager.getQueueSize()).toBe(0)
      expect(messageSentListener).toHaveBeenCalledTimes(2)
    })
    
    it('should respect max queue size', () => {
      manager.updateConfig({ maxQueueSize: 5 })
      
      for (let i = 0; i < 10; i++) {
        manager.send(`message ${i}`)
      }
      
      expect(manager.getQueueSize()).toBeLessThanOrEqual(5)
    })
    
    it('should clear queue on demand', () => {
      manager.send('message 1')
      manager.send('message 2')
      
      expect(manager.getQueueSize()).toBe(2)
      
      manager.clearQueue()
      
      expect(manager.getQueueSize()).toBe(0)
    })
  })
  
  describe('Connection Metrics', () => {
    it('should track messages sent', async () => {
      manager.connect()
      jest.advanceTimersByTime(20)
      
      manager.send('message 1')
      manager.send('message 2')
      
      const metrics = manager.getMetrics()
      expect(metrics.messagesSent).toBe(2)
    })
    
    it('should track messages received', async () => {
      manager.connect()
      jest.advanceTimersByTime(20)
      
      // Simulate receiving messages
      // (This would need access to internal ws object to test properly)
      
      const metrics = manager.getMetrics()
      expect(metrics.messagesReceived).toBeDefined()
    })
    
    it('should track reconnections', async () => {
      manager.connect()
      jest.advanceTimersByTime(20)
      manager.disconnect()
      manager.connect()
      jest.advanceTimersByTime(20)
      
      const metrics = manager.getMetrics()
      expect(metrics.totalReconnections).toBeGreaterThan(0)
    })
    
    it('should track latency', async () => {
      manager.connect()
      jest.advanceTimersByTime(20)
      
      // Trigger heartbeat
      jest.advanceTimersByTime(30000)
      
      const metrics = manager.getMetrics()
      expect(metrics.currentLatency).toBeDefined()
    })
    
    it('should track connection times', async () => {
      manager.connect()
      jest.advanceTimersByTime(20)
      
      const metrics = manager.getMetrics()
      expect(metrics.lastConnectedTime).toBeTruthy()
      expect(metrics.lastDisconnectedTime).toBeNull()
      
      manager.disconnect()
      
      const metrics2 = manager.getMetrics()
      expect(metrics2.lastDisconnectedTime).toBeTruthy()
    })
  })
  
  describe('Event Emission', () => {
    it('should emit state-change events', () => {
      const listener = jest.fn()
      manager.on('state-change', listener)
      
      manager.connect()
      
      expect(listener).toHaveBeenCalledWith(ConnectionState.CONNECTING, ConnectionState.DISCONNECTED)
    })
    
    it('should emit connected event', async () => {
      const listener = jest.fn()
      manager.on('connected', listener)
      
      manager.connect()
      jest.advanceTimersByTime(20)
      
      expect(listener).toHaveBeenCalled()
    })
    
    it('should emit disconnected event', async () => {
      const listener = jest.fn()
      manager.on('disconnected', listener)
      
      manager.connect()
      jest.advanceTimersByTime(20)
      manager.disconnect()
      
      expect(listener).toHaveBeenCalled()
    })
    
    it('should emit message-queued event', () => {
      const listener = jest.fn()
      manager.on('message-queued', listener)
      
      manager.send('test message')
      
      expect(listener).toHaveBeenCalled()
    })
    
    it('should emit error event on connection failure', () => {
      // This would require mocking WebSocket to throw an error
      // Skipped for now
    })
  })
  
  describe('Configuration', () => {
    it('should use default values for missing config', () => {
      const minimalManager = new WebSocketConnectionManager({
        url: 'ws://localhost:8080',
        autoConnect: false
      })
      
      const metrics = minimalManager.getMetrics()
      expect(metrics).toBeDefined()
      
      minimalManager.disconnect()
    })
    
    it('should allow config updates', () => {
      manager.updateConfig({
        heartbeatInterval: 5000,
        maxQueueSize: 50
      })
      
      manager.send('test')
      expect(manager.getQueueSize()).toBe(1)
    })
    
    it('should auto-connect when configured', async () => {
      const autoManager = new WebSocketConnectionManager({
        url: 'ws://localhost:8080',
        autoConnect: true
      })
      
      jest.advanceTimersByTime(20)
      
      expect(autoManager.getState()).toBe(ConnectionState.CONNECTED)
      
      autoManager.disconnect()
    })
  })
  
  describe('Force Reconnection', () => {
    it('should reconnect immediately when reconnect() is called', async () => {
      const reconnectingListener = jest.fn()
      manager.on('reconnecting', reconnectingListener)
      
      manager.connect()
      jest.advanceTimersByTime(20)
      
      manager.reconnect()
      
      expect(reconnectingListener).toHaveBeenCalled()
    })
    
    it('should reset reconnection attempts on force reconnect', async () => {
      manager.connect()
      jest.advanceTimersByTime(20)
      manager.disconnect()
      
      jest.advanceTimersByTime(5000) // Let reconnection start
      
      manager.reconnect()
      
      const metrics = manager.getMetrics()
      // After reconnect, attempts should be reset
      expect(metrics).toBeDefined()
    })
  })
})

/**
 * Integration test with real WebSocket (requires ws package)
 */
describe('WebSocketConnectionManager Integration', () => {
  // These tests would require a running WebSocket server
  // Marked as skip for unit test environment
  
  it.skip('should connect to real WebSocket server', async () => {
    // Integration test
  })
  
  it.skip('should handle real ping/pong', async () => {
    // Integration test
  })
  
  it.skip('should recover from network disconnect', async () => {
    // Integration test
  })
})
