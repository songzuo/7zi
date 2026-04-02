/**
 * Vitest 测试设置文件
 *
 * 🚀 优化版本：减少重复初始化，提升测试性能
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// 🚀 全局缓存标志，避免重复初始化
let localStorageInitialized = false
let matchMediaInitialized = false
let fetchInitialized = false
let cryptoInitialized = false

// 真实 localStorage (用于 Zustand persist 测试) - 只初始化一次
if (!localStorageInitialized) {
  const localStorageImpl = {
    store: new Map<string, string>(),

    getItem(key: string): string | null {
      return this.store.get(key) || null
    },

    setItem(key: string, value: string): void {
      this.store.set(key, value)
    },

    removeItem(key: string): void {
      this.store.delete(key)
    },

    clear(): void {
      this.store.clear()
    },
  }

  Object.defineProperty(window, 'localStorage', {
    value: localStorageImpl,
    configurable: true, // 🚀 允许重新配置
  })
  localStorageInitialized = true
}

// Mock matchMedia - 只初始化一次
if (!matchMediaInitialized) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true, // 🚀 允许重新配置
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  matchMediaInitialized = true
}

// Mock fetch - 只初始化一次
if (!fetchInitialized) {
  global.fetch = vi.fn()
  fetchInitialized = true
}

// Mock crypto.randomUUID - 只初始化一次
if (!cryptoInitialized) {
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
    },
    configurable: true, // 🚀 允许重新配置
  })
  cryptoInitialized = true
}

// Mock socket.io-client - 支持 named export 'io'

const createMockSocket = (): Record<string, any> => {
  const callbacks: Record<string, any> = {}
  const socket: Record<string, any> = {
    connected: false,
    on: vi.fn((event: string, callback: any) => {
      callbacks[event] = callback
      return socket
    }),
    off: vi.fn((event: string) => {
      delete callbacks[event]
    }),
    emit: vi.fn(),
    disconnect: vi.fn(() => {
      socket.connected = false
    }),
    connect: vi.fn(() => {
      socket.connected = true
      if (callbacks.connect) callbacks.connect()
    }),
    callbacks,
  }
  return socket
}

const mockSocket = createMockSocket()

vi.mock('socket.io-client', () => {
  const callbacks: Record<string, any> = {}
  const socketInstance: Record<string, any> = {
    connected: false,
    on: vi.fn((event: string, callback: any) => {
      callbacks[event] = callback
      return socketInstance
    }),
    off: vi.fn((event: string) => {
      delete callbacks[event]
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(() => {
      socketInstance.connected = true
      if (callbacks.connect) callbacks.connect()
    }),
    callbacks,
  }

  return {
    io: vi.fn(() => socketInstance),
    default: vi.fn(() => socketInstance),
  }
})
