/**
 * 🚀 FakeIndexedDB 配置和工具
 * 
 * 为 IndexedDB 操作提供测试支持
 * 支持数据库隔离和清理
 */

import { vi } from 'vitest'

// ============================================================
// IndexedDB Mock 配置
// ============================================================

export interface IndexedDBConfig {
  /** 数据库名 */
  name: string
  /** 版本号 */
  version: number
  /** 存储区定义 */
  stores?: Record<string, {
    keyPath: string
    indexes?: Array<{ name: string; keyPath: string; unique?: boolean }>
  }>
}

// 数据库隔离存储
const isolatedDatabases = new Map<string, IDBDatabase>()

// ============================================================
// 创建测试数据库
// ============================================================

export const createTestDatabase = (config: IndexedDBConfig): IDBDatabase => {
  const { name } = config
  
  // 如果已存在，先删除
  if (isolatedDatabases.has(name)) {
    const existing = isolatedDatabases.get(name)!
    existing.close()
    isolatedDatabases.delete(name)
  }
  
  // 创建内存数据库
  const databases: Record<string, Record<string, unknown>> = {}
  const request = {
    result: {
      name,
      version: config.version,
      objectStoreNames: Object.keys(config.stores || {}),
      createObjectStore: (storeName: string, options?: { keyPath: string }) => {
        databases[storeName] = {}
        return {
          createIndex: vi.fn(),
          add: vi.fn(),
          put: vi.fn(),
          get: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          getAll: vi.fn(),
        }
      },
      transaction: vi.fn(() => ({
        objectStore: (name: string) => ({
          add: vi.fn(),
          put: vi.fn(),
          get: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          getAll: vi.fn(),
        }),
      })),
      close: vi.fn(),
    },
    onsuccess: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
  }
  
  // 模拟 open 请求成功
  setTimeout(() => {
    if (request.onsuccess) {
      request.onsuccess(new Event('success'))
    }
  }, 0)
  
  isolatedDatabases.set(name, request.result as unknown as IDBDatabase)
  return request.result as unknown as IDBDatabase
}

// ============================================================
// 清理测试数据库
// ============================================================

export const cleanupTestDatabases = () => {
  isolatedDatabases.forEach((db, name) => {
    try {
      db.close()
    } catch {
      // 忽略关闭错误
    }
  })
  isolatedDatabases.clear()
}

// ============================================================
// IndexedDB Mock 工厂
// ============================================================

export const createIndexedDBMock = () => {
  const databases = new Map<string, Record<string, unknown>>()
  
  return {
    open: vi.fn((name: string, version?: number) => {
      const store: Record<string, unknown> = {}
      databases.set(name, store)
      
      return {
        result: databases.get(name),
        onsuccess: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
      }
    }),
    
    deleteDatabase: vi.fn((name: string) => {
      databases.delete(name)
      return {
        onsuccess: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
      }
    }),
    
    databases: vi.fn(async () => {
      return Array.from(databases.keys()).map(name => ({ name }))
    }),
  }
}

// ============================================================
// 预设测试存储区
// ============================================================

export const testStoreConfigs: Record<string, IndexedDBConfig> = {
  drafts: {
    name: 'drafts-db',
    version: 1,
    stores: {
      drafts: {
        keyPath: 'id',
        indexes: [
          { name: 'by-room', keyPath: 'roomId' },
          { name: 'by-updated', keyPath: 'updatedAt' },
        ],
      },
    },
  },
  
  cache: {
    name: 'cache-db',
    version: 1,
    stores: {
      cache: {
        keyPath: 'key',
        indexes: [
          { name: 'by-expiry', keyPath: 'expiresAt' },
        ],
      },
    },
  },
  
  messages: {
    name: 'messages-db',
    version: 1,
    stores: {
      messages: {
        keyPath: 'id',
        indexes: [
          { name: 'by-room', keyPath: 'roomId' },
          { name: 'by-sender', keyPath: 'senderId' },
          { name: 'by-timestamp', keyPath: 'timestamp' },
        ],
      },
    },
  },
}

// ============================================================
// 创建 Vitest Mock 导出
// ============================================================

export const createVitestIndexedDBMock = () => {
  const mock = createIndexedDBMock()
  
  return {
    default: mock,
    indexedDB: mock,
    IDBFactory: vi.fn(() => mock),
    
    // 便捷方法
    mockInstance: mock,
    getMock: () => mock,
    resetMock: () => {
      vi.clearAllMocks()
    },
    
    // 预设存储区
    createStore: (name: keyof typeof testStoreConfigs) => {
      const config = testStoreConfigs[name]
      return createTestDatabase(config)
    },
    
    // 清理
    cleanup: cleanupTestDatabases,
  }
}

// ============================================================
// 使用 fake-indexeddb 的自动 Mock
// ============================================================

// 导入 fake-indexeddb 并自动初始化
export const setupFakeIndexedDB = () => {
  // 已经在 src/test/setup.ts 中通过 'fake-indexeddb/auto' 导入
  // 这里提供额外的配置
  
  return {
    // 提供清理函数
    cleanup: cleanupTestDatabases,
    
    // 创建隔离数据库
    createIsolatedDB: createTestDatabase,
    
    // 测试存储配置
    configs: testStoreConfigs,
  }
}
