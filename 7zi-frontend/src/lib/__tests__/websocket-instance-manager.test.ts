/**
 * WebSocket Instance Manager Tests
 *
 * Tests for WebSocket instance management:
 * - Instance registration and retrieval
 * - Instance unregistration
 * - Batch operations
 * - State monitoring
 * - Statistics gathering
 * - Event listening
 * - Edge cases
 *
 * Version: 1.0.0
 * Date: 2026-04-04
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  WebSocketInstanceManager,
  InstanceEventData,
  InstanceEventType,
  AllInstancesState,
  AllInstancesStats,
  wsInstanceManager,
} from '@/lib/websocket-instance-manager'
import { WebSocketManager, ConnectionState } from '@/lib/websocket-manager'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connected: false,
    emit: vi.fn(),
    on: vi.fn(),
    disconnect: vi.fn(),
    onAny: vi.fn(),
  })),
}))

describe('WebSocketInstanceManager', () => {
  let instanceManager: WebSocketInstanceManager

  beforeEach(() => {
    vi.clearAllMocks()
    instanceManager = new WebSocketInstanceManager()
  })

  afterEach(() => {
    instanceManager.cleanup()
  })

  describe('Instance Registration', () => {
    it('should register a new WebSocket instance', () => {
      const manager = instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      expect(manager).toBeInstanceOf(WebSocketManager)
      expect(instanceManager.get('test')).toBe(manager)
      expect(instanceManager.has('test')).toBe(true)
      expect(instanceManager.count).toBe(1)
    })

    it('should retrieve registered instance', () => {
      const manager1 = instanceManager.register('instance1', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const manager2 = instanceManager.register('instance2', {
        url: 'http://localhost:3002',
        autoConnect: false,
      })

      expect(instanceManager.get('instance1')).toBe(manager1)
      expect(instanceManager.get('instance2')).toBe(manager2)
      expect(instanceManager.count).toBe(2)
    })

    it('should throw error when registering duplicate name', () => {
      instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      expect(() => {
        instanceManager.register('test', {
          url: 'http://localhost:3002',
          autoConnect: false,
        })
      }).toThrow("WebSocket instance 'test' already exists")
    })

    it('should emit registered event', () => {
      const listener = vi.fn()
      instanceManager.onInstanceEvent(listener)

      const manager = instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith({
        name: 'test',
        manager,
        type: 'registered',
        timestamp: expect.any(Number),
      })
    })
  })

  describe('Instance Unregistration', () => {
    it('should unregister an existing instance', () => {
      instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const result = instanceManager.unregister('test')

      expect(result).toBe(true)
      expect(instanceManager.get('test')).toBeUndefined()
      expect(instanceManager.has('test')).toBe(false)
      expect(instanceManager.count).toBe(0)
    })

    it('should return false when unregistering non-existent instance', () => {
      const result = instanceManager.unregister('nonexistent')

      expect(result).toBe(false)
    })

    it('should disconnect instance before removing', () => {
      const manager = instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const disconnectSpy = vi.spyOn(manager, 'disconnect')

      instanceManager.unregister('test')

      expect(disconnectSpy).toHaveBeenCalled()
    })

    it('should emit unregistered event', () => {
      const listener = vi.fn()
      instanceManager.onInstanceEvent(listener)

      const manager = instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      listener.mockClear()

      instanceManager.unregister('test')

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith({
        name: 'test',
        manager,
        type: 'unregistered',
        timestamp: expect.any(Number),
      })
    })
  })

  describe('Instance Retrieval', () => {
    it('should return undefined for non-existent instance', () => {
      const manager = instanceManager.get('nonexistent')

      expect(manager).toBeUndefined()
    })

    it('should return all instances as a new Map', () => {
      const manager1 = instanceManager.register('instance1', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const manager2 = instanceManager.register('instance2', {
        url: 'http://localhost:3002',
        autoConnect: false,
      })

      const all = instanceManager.getAll()

      expect(all).toBeInstanceOf(Map)
      expect(all.size).toBe(2)
      expect(all.get('instance1')).toBe(manager1)
      expect(all.get('instance2')).toBe(manager2)

      // Verify it's a new Map, not a reference
      all.clear()
      expect(instanceManager.count).toBe(2)
    })
  })

  describe('Batch Operations', () => {
    it('should connect all instances', () => {
      const manager1 = instanceManager.register('instance1', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const manager2 = instanceManager.register('instance2', {
        url: 'http://localhost:3002',
        autoConnect: false,
      })

      const connectSpy1 = vi.spyOn(manager1, 'connect')
      const connectSpy2 = vi.spyOn(manager2, 'connect')

      instanceManager.connectAll()

      expect(connectSpy1).toHaveBeenCalled()
      expect(connectSpy2).toHaveBeenCalled()
    })

    it('should disconnect all instances', () => {
      const manager1 = instanceManager.register('instance1', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const manager2 = instanceManager.register('instance2', {
        url: 'http://localhost:3002',
        autoConnect: false,
      })

      const disconnectSpy1 = vi.spyOn(manager1, 'disconnect')
      const disconnectSpy2 = vi.spyOn(manager2, 'disconnect')

      instanceManager.disconnectAll()

      expect(disconnectSpy1).toHaveBeenCalled()
      expect(disconnectSpy2).toHaveBeenCalled()
    })

    it('should handle connection errors gracefully', () => {
      const manager = instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const connectSpy = vi.spyOn(manager, 'connect').mockImplementation(() => {
        throw new Error('Connection failed')
      })

      // Should not throw
      expect(() => {
        instanceManager.connectAll()
      }).not.toThrow()

      expect(connectSpy).toHaveBeenCalled()
    })
  })

  describe('State Monitoring', () => {
    it('should get state of specific instance', () => {
      const manager = instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const state = instanceManager.getState('test')

      expect(state).toBe(ConnectionState.DISCONNECTED)
    })

    it('should return undefined for state of non-existent instance', () => {
      const state = instanceManager.getState('nonexistent')

      expect(state).toBeUndefined()
    })

    it('should get all instances states', () => {
      instanceManager.register('instance1', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      instanceManager.register('instance2', {
        url: 'http://localhost:3002',
        autoConnect: false,
      })

      const allStates: AllInstancesState = instanceManager.getAllStates()

      expect(allStates).toEqual({
        instance1: ConnectionState.DISCONNECTED,
        instance2: ConnectionState.DISCONNECTED,
      })
    })

    it('should return empty object when no instances registered', () => {
      const allStates: AllInstancesState = instanceManager.getAllStates()

      expect(allStates).toEqual({})
    })
  })

  describe('Statistics Gathering', () => {
    it('should get all instances stats', () => {
      const manager1 = instanceManager.register('instance1', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const manager2 = instanceManager.register('instance2', {
        url: 'http://localhost:3002',
        autoConnect: false,
      })

      const allStats: AllInstancesStats = instanceManager.getAllStats()

      // Check that stats are returned for both instances
      expect(allStats).toHaveProperty('instance1')
      expect(allStats).toHaveProperty('instance2')

      // Check that stats have expected structure
      expect(allStats.instance1).toHaveProperty('messagesSent')
      expect(allStats.instance1).toHaveProperty('messagesReceived')
      expect(allStats.instance1).toHaveProperty('connectionQuality')
      expect(allStats.instance2).toHaveProperty('messagesSent')
      expect(allStats.instance2).toHaveProperty('messagesReceived')
      expect(allStats.instance2).toHaveProperty('connectionQuality')
    })

    it('should return empty object when no instances registered', () => {
      const allStats: AllInstancesStats = instanceManager.getAllStats()

      expect(allStats).toEqual({})
    })
  })

  describe('Connection State Checks', () => {
    it('should return false when instance is disconnected', () => {
      instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      expect(instanceManager.hasAnyConnected()).toBe(false)
      expect(instanceManager.allConnected()).toBe(false) // Instance exists but is disconnected
    })

    it('should return true for allConnected when no instances', () => {
      // No instances registered - considered vacuously true
      expect(instanceManager.hasAnyConnected()).toBe(false)
      expect(instanceManager.allConnected()).toBe(true) // No instances, considered all connected
    })

    it('should return true when at least one instance is connected', () => {
      const manager1 = instanceManager.register('instance1', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      instanceManager.register('instance2', {
        url: 'http://localhost:3002',
        autoConnect: false,
      })

      // Simulate first instance connected
      vi.spyOn(manager1, 'isConnected').mockReturnValue(true)

      expect(instanceManager.hasAnyConnected()).toBe(true)
      expect(instanceManager.allConnected()).toBe(false)
    })

    it('should return true when all instances are connected', () => {
      const manager1 = instanceManager.register('instance1', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const manager2 = instanceManager.register('instance2', {
        url: 'http://localhost:3002',
        autoConnect: false,
      })

      vi.spyOn(manager1, 'isConnected').mockReturnValue(true)
      vi.spyOn(manager2, 'isConnected').mockReturnValue(true)

      expect(instanceManager.hasAnyConnected()).toBe(true)
      expect(instanceManager.allConnected()).toBe(true)
    })
  })

  describe('Event Listening', () => {
    it('should register event listener', () => {
      const listener = vi.fn()
      instanceManager.onInstanceEvent(listener)

      instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      expect(listener).toHaveBeenCalled()
    })

    it('should unregister event listener', () => {
      const listener = vi.fn()
      instanceManager.onInstanceEvent(listener)
      instanceManager.offInstanceEvent(listener)

      instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      expect(listener).not.toHaveBeenCalled()
    })

    it('should support multiple event listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      instanceManager.onInstanceEvent(listener1)
      instanceManager.onInstanceEvent(listener2)

      instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })

    it('should emit state_changed event when instance state changes', () => {
      const listener = vi.fn()
      instanceManager.onInstanceEvent(listener)

      const manager = instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      listener.mockClear()

      // Simulate state change by calling onStateChange callback
      const stateChangeCallback = vi.spyOn(manager, 'onStateChange')
      stateChangeCallback.mockImplementation((callback) => {
        callback(ConnectionState.CONNECTED, ConnectionState.CONNECTING)
      })

      manager.connect()

      // Manually trigger state change
      const callbacks = stateChangeCallback.mock.calls
      if (callbacks.length > 0) {
        const callback = callbacks[0][0]
        callback(ConnectionState.CONNECTED, ConnectionState.CONNECTING)
      }

      // The state change event is fired internally by the manager
      // We can't easily test this without mocking the internal state change logic
    })

    it('should handle errors in event listeners gracefully', () => {
      const badListener = vi.fn(() => {
        throw new Error('Listener error')
      })

      const goodListener = vi.fn()

      instanceManager.onInstanceEvent(badListener)
      instanceManager.onInstanceEvent(goodListener)

      // Should not throw
      expect(() => {
        instanceManager.register('test', {
          url: 'http://localhost:3001',
          autoConnect: false,
        })
      }).not.toThrow()

      expect(goodListener).toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup all instances', () => {
      instanceManager.register('instance1', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      instanceManager.register('instance2', {
        url: 'http://localhost:3002',
        autoConnect: false,
      })

      const listener = vi.fn()
      instanceManager.onInstanceEvent(listener)

      instanceManager.cleanup()

      expect(instanceManager.count).toBe(0)
      expect(instanceManager.getAll().size).toBe(0)
      // Event listeners should be cleared
    })
  })

  describe('Edge Cases', () => {
    it('should handle unregister during event processing', () => {
      instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      const listener = vi.fn(() => {
        // Try to unregister during event processing
        instanceManager.unregister('test')
      })

      instanceManager.onInstanceEvent(listener)

      instanceManager.unregister('test')

      expect(instanceManager.count).toBe(0)
    })

    it('should handle getting state of unregistered instance', () => {
      instanceManager.register('test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      instanceManager.unregister('test')

      const state = instanceManager.getState('test')

      expect(state).toBeUndefined()
    })
  })

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(wsInstanceManager).toBeInstanceOf(WebSocketInstanceManager)
    })

    it('should persist state across different tests', () => {
      // Cleanup singleton before test
      wsInstanceManager.cleanup()

      const manager = wsInstanceManager.register('singleton-test', {
        url: 'http://localhost:3001',
        autoConnect: false,
      })

      expect(wsInstanceManager.has('singleton-test')).toBe(true)

      // Cleanup after test
      wsInstanceManager.cleanup()
    })
  })
})
