/**
 * 🚀 增强型 WebSocket Mock
 * 
 * 支持 connected/disconnected 状态管理
 * 提供事件触发机制
 * 支持连接状态变化回调
 */

import { vi } from 'vitest'

// ============================================================
// WebSocket 连接状态
// ============================================================

export type WebSocketState = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error'

export interface WebSocketEventCallbacks {
  connect: Array<() => void>
  disconnect: Array<(reason?: string) => void>
  connect_error: Array<(error: Error) => void>
  reconnect: Array<(attempt: number) => void>
  reconnect_attempt: Array<(attempt: number) => void>
  reconnect_failed: Array<() => void>
  [key: string]: Array<Function>
}

// ============================================================
// 增强型 WebSocket Mock 实例
// ============================================================

export interface EnhancedWebSocketMock {
  // 连接状态
  connected: boolean
  state: WebSocketState
  
  // 事件回调存储
  _callbacks: WebSocketEventCallbacks
  
  // Socket.IO 基本方法
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  
  // 增强方法：状态管理
  _setState: (state: WebSocketState) => void
  _trigger: (event: string, ...args: unknown[]) => void
  
  // 增强方法：便捷连接模拟
  _simulateConnect: () => void
  _simulateDisconnect: (reason?: string) => void
  _simulateError: (error: Error) => void
  _simulateReconnect: (attempt?: number) => void
  
  // 便捷方法：注册事件（返回取消注册函数）
  _on: (event: string, callback: Function) => () => void
  _once: (event: string, callback: Function) => void
}

// 创建增强型 WebSocket Mock
export const createWebSocketMock = (): EnhancedWebSocketMock => {
  const callbacks: WebSocketEventCallbacks = {
    connect: [],
    disconnect: [],
    connect_error: [],
    reconnect: [],
    reconnect_attempt: [],
    reconnect_failed: [],
  }

  const instance: EnhancedWebSocketMock = {
    // 初始状态
    connected: false,
    state: 'disconnected',
    _callbacks: callbacks,

    // 基本 Socket.IO 方法
    on: vi.fn((event: string, callback: Function) => {
      if (!callbacks[event]) {
        callbacks[event] = []
      }
      callbacks[event].push(callback)
      return instance
    }),

    off: vi.fn((event: string, callback?: Function) => {
      if (callback) {
        const index = callbacks[event]?.indexOf(callback)
        if (index > -1) callbacks[event].splice(index, 1)
      } else {
        callbacks[event] = []
      }
      return instance
    }),

    emit: vi.fn((event: string, ...args: unknown[]) => {
      // 实际触发已注册的事件处理器
      const handlers = callbacks[event] || []
      handlers.forEach(handler => {
        try {
          handler(...args)
        } catch (e) {
          console.error(`Error in WebSocket emit handler for '${event}':`, e)
        }
      })
      return instance
    }),

    connect: vi.fn(() => {
      instance._setState('connecting')
      // 模拟异步连接成功
      setTimeout(() => {
        instance._simulateConnect()
      }, 0)
      return instance
    }),

    disconnect: vi.fn((reason?: string) => {
      instance._simulateDisconnect(reason)
      return instance
    }),

    // 内部状态管理
    _setState: (state: WebSocketState) => {
      instance.state = state
      instance.connected = state === 'connected'
    },

    // 内部触发器
    _trigger: (event: string, ...args: unknown[]) => {
      const handlers = callbacks[event] || []
      handlers.forEach(handler => {
        try {
          handler(...args)
        } catch (e) {
          console.error(`Error triggering WebSocket event '${event}':`, e)
        }
      })
    },

    // 便捷方法
    _simulateConnect: () => {
      instance._setState('connected')
      instance._trigger('connect')
    },

    _simulateDisconnect: (reason?: string) => {
      instance._setState('disconnected')
      instance._trigger('disconnect', reason)
    },

    _simulateError: (error: Error) => {
      instance._setState('error')
      instance._trigger('connect_error', error)
    },

    _simulateReconnect: (attempt = 1) => {
      instance._setState('reconnecting')
      instance._trigger('reconnect_attempt', attempt)
      setTimeout(() => {
        instance._setState('connected')
        instance._trigger('reconnect', attempt)
      }, 0)
    },

    // 便捷注册方法（返回取消注册函数）
    _on: (event: string, callback: Function) => {
      if (!callbacks[event]) {
        callbacks[event] = []
      }
      callbacks[event].push(callback)
      return () => {
        const index = callbacks[event].indexOf(callback)
        if (index > -1) callbacks[event].splice(index, 1)
      }
    },

    // 注册一次性事件
    _once: (event: string, callback: Function) => {
      const unsubscribe = instance._on(event, (...args: unknown[]) => {
        unsubscribe()
        callback(...args)
      })
    },
  }

  return instance
}

// ============================================================
// 全局 WebSocket Mock 池
// ============================================================

const globalSocketMocks = new Map<string, EnhancedWebSocketMock>()

export const getWebSocketMock = (namespace = 'default'): EnhancedWebSocketMock => {
  if (!globalSocketMocks.has(namespace)) {
    globalSocketMocks.set(namespace, createWebSocketMock())
  }
  return globalSocketMocks.get(namespace)!
}

export const resetWebSocketMock = (namespace?: string) => {
  if (namespace) {
    globalSocketMocks.delete(namespace)
  } else {
    globalSocketMocks.clear()
  }
}

export const resetAllWebSocketMocks = () => {
  globalSocketMocks.clear()
}

// ============================================================
// Socket.IO Mock 工厂（用于 vi.mock）
// ============================================================

export const createSocketIOExportMock = () => {
  const mockInstance = createWebSocketMock()

  return {
    // Socket.IO 导出
    io: vi.fn(() => mockInstance),
    default: vi.fn(() => mockInstance),
    __esModule: true,
    
    // 导出的实例（方便测试访问）
    _mockInstance: mockInstance,
    
    // 便捷方法
    _getLastInstance: () => mockInstance,
    _reset: () => {
      vi.clearAllMocks()
    },
  }
}

// ============================================================
// Vitest Mock 预设
// ============================================================

export const createVitestWebSocketMock = () => {
  const mockInstance = createWebSocketMock()
  
  // 预设一些常用配置
  mockInstance._setState('disconnected')
  
  return {
    default: vi.fn(() => mockInstance),
    io: vi.fn(() => mockInstance),
    __esModule: true,
    
    // 便捷方法
    mockInstance,
    getMock: () => mockInstance,
    resetMock: () => {
      mockInstance._setState('disconnected')
      mockInstance._callbacks = {
        connect: [],
        disconnect: [],
        connect_error: [],
        reconnect: [],
        reconnect_attempt: [],
        reconnect_failed: [],
      }
      vi.clearAllMocks()
    },
    
    // 模拟方法
    simulateConnected: () => mockInstance._simulateConnect(),
    simulateDisconnected: (reason?: string) => mockInstance._simulateDisconnect(reason),
    simulateError: (error?: Error) => mockInstance._simulateError(error || new Error('Connection failed')),
    simulateReconnect: (attempt?: number) => mockInstance._simulateReconnect(attempt),
  }
}
