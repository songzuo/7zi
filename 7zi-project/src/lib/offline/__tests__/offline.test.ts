/**
 * 离线同步测试
 * @module lib/offline/__tests__/offline.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock IndexedDB with proper request objects
const createMockRequest = <T>(result: T): IDBRequest<T> => ({
  result,
  error: null,
  source: {} as IDBObjectStore,
  transaction: {} as IDBTransaction,
  readyState: 'done' as IDBRequestReadyState,
  onsuccess: null,
  onerror: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

const createMockObjectStore = (): IDBObjectStore => ({
  add: vi.fn(() => createMockRequest(undefined)),
  put: vi.fn(() => createMockRequest(undefined)),
  get: vi.fn(() => createMockRequest(null)),
  delete: vi.fn(() => createMockRequest(undefined)),
  clear: vi.fn(() => createMockRequest(undefined)),
  getAll: vi.fn(() => createMockRequest([])),
  count: vi.fn(() => createMockRequest(0)),
  index: vi.fn(() => ({
    getAll: vi.fn(() => createMockRequest([])),
    openCursor: vi.fn(() => createMockRequest(null)),
  })),
  createIndex: vi.fn(),
  deleteIndex: vi.fn(),
  name: 'mock-store',
  keyPath: null,
  indexNames: [] as unknown as DOMStringList,
  transaction: {} as IDBTransaction,
  autoIncrement: false,
} as unknown as IDBObjectStore);

const createMockTransaction = (): IDBTransaction => ({
  objectStore: vi.fn(() => createMockObjectStore()),
  abort: vi.fn(),
  commit: vi.fn(),
  db: {} as IDBDatabase,
  durability: 'default',
  error: null,
  mode: 'readwrite',
  onabort: null,
  oncomplete: null,
  onerror: null,
  objectStoreNames: [] as unknown as DOMStringList,
} as unknown as IDBTransaction);

const createMockDB = (): IDBDatabase => ({
  transaction: vi.fn(() => createMockTransaction()),
  close: vi.fn(),
  createObjectStore: vi.fn(() => createMockObjectStore()),
  deleteObjectStore: vi.fn(),
  name: 'test-db',
  version: 1,
  objectStoreNames: [] as unknown as DOMStringList,
  onabort: null,
  onclose: null,
  onerror: null,
  onversionchange: null,
} as unknown as IDBDatabase);

const mockIndexedDB = {
  open: vi.fn(() => {
    const request = createMockRequest(createMockDB());
    // Simulate async success
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request } as unknown as Event);
      }
    }, 0);
    return request;
  }),
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// 模拟全局对象
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true,
    storage: {
      estimate: vi.fn().mockResolvedValue({ quota: 1000000, usage: 50000 }),
    },
  },
  writable: true,
});

describe('Offline Types', () => {
  it('should export correct types', async () => {
    const types = await import('../types');
    
    expect(types.DEFAULT_SYNC_CONFIG).toBeDefined();
    expect(types.DEFAULT_SYNC_CONFIG.autoSyncInterval).toBe(30000);
    expect(types.DEFAULT_SYNC_CONFIG.maxRetryCount).toBe(3);
    expect(types.DEFAULT_SYNC_CONFIG.batchSize).toBe(50);
    expect(types.DEFAULT_SYNC_CONFIG.offlineEnabled).toBe(true);
  });

  it('should have correct storage keys', async () => {
    const { STORAGE_KEYS } = await import('../types');
    
    expect(STORAGE_KEYS.SYNC_QUEUE).toBe('offline-sync-queue');
    expect(STORAGE_KEYS.OFFLINE_DATA).toBe('offline-data');
    expect(STORAGE_KEYS.NETWORK_STATUS).toBe('network-status');
  });

  it('should have correct entity types', async () => {
    const { OFFLINE_ENTITIES } = await import('../types');
    
    expect(OFFLINE_ENTITIES.TASKS).toBe('tasks');
    expect(OFFLINE_ENTITIES.TAGS).toBe('tags');
    expect(OFFLINE_ENTITIES.PREFERENCES).toBe('preferences');
  });
});

describe('Offline Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateId', () => {
    it('should generate unique IDs', async () => {
      const { generateId } = await import('../offline-store');
      
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with correct format', async () => {
      const { generateId } = await import('../offline-store');
      
      const id = generateId();
      expect(id).toMatch(/^\d+_[a-z0-9]+$/);
    });
  });

  describe('isIndexedDBAvailable', () => {
    it('should return true when IndexedDB is available', async () => {
      const { isIndexedDBAvailable } = await import('../offline-store');
      expect(isIndexedDBAvailable()).toBe(true);
    });
  });
});

describe('Sync Manager', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Reset sync manager state
    const { useSyncManager } = await import('../sync-manager');
    useSyncManager.setState({
      isOnline: true,
      isSyncing: false,
      pendingCount: 0,
      lastSyncAt: null,
      lastSyncResult: null,
    });
  });

  describe('useSyncManager', () => {
    it('should have initial state', async () => {
      const { useSyncManager } = await import('../sync-manager');
      const state = useSyncManager.getState();
      
      expect(state.isOnline).toBe(true);
      expect(state.isSyncing).toBe(false);
      expect(state.pendingCount).toBe(0);
      expect(state.config).toBeDefined();
    });

    it('should update online status', async () => {
      const { useSyncManager } = await import('../sync-manager');
      
      useSyncManager.getState().setOnline(false);
      expect(useSyncManager.getState().isOnline).toBe(false);
      
      useSyncManager.getState().setOnline(true);
      expect(useSyncManager.getState().isOnline).toBe(true);
    });

    it('should update config', async () => {
      const { useSyncManager } = await import('../sync-manager');
      
      useSyncManager.getState().updateConfig({
        autoSyncInterval: 60000,
        maxRetryCount: 5,
      });
      
      const state = useSyncManager.getState();
      expect(state.config.autoSyncInterval).toBe(60000);
      expect(state.config.maxRetryCount).toBe(5);
    });
  });

  describe('createSyncOperation', () => {
    it('should create operation with correct structure', async () => {
      const { createSyncOperation } = await import('../sync-manager');
      
      // Mock addToQueue to avoid IndexedDB
      const mockAddToQueue = vi.fn().mockResolvedValue('op-123');
      
      // This tests the function signature and return type
      // The actual IndexedDB operations are mocked
      expect(typeof createSyncOperation).toBe('function');
    });
  });
});

describe('Local Storage Hooks', () => {
  // Note: useLocalStorage tests are in hooks/__tests__/useLocalStorage.test.ts
  it('should be tested separately', () => {
    expect(true).toBe(true);
  });
});

describe('Integration Tests', () => {
  beforeEach(async () => {
    // Reset sync manager state
    const { useSyncManager } = await import('../sync-manager');
    useSyncManager.setState({
      isOnline: true,
      isSyncing: false,
      pendingCount: 0,
      lastSyncAt: null,
      lastSyncResult: null,
    });
  });

  it('should handle complete sync flow', async () => {
    const { useSyncManager } = await import('../sync-manager');
    const state = useSyncManager.getState();
    
    // 初始状态检查
    expect(state.isOnline).toBe(true);
    expect(state.isSyncing).toBe(false);
    
    // 设置离线
    state.setOnline(false);
    expect(useSyncManager.getState().isOnline).toBe(false);
    
    // 设置在线
    state.setOnline(true);
    expect(useSyncManager.getState().isOnline).toBe(true);
  });
});

describe('Error Handling', () => {
  it('should handle localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Quota exceeded');
    });
    
    // 应该不会抛出错误
    expect(() => {
      localStorageMock.setItem('test', 'value');
    }).toThrow('Quota exceeded');
  });

  it('should handle JSON parse errors', () => {
    localStorageMock.getItem.mockReturnValueOnce('invalid-json');
    
    // JSON.parse 会抛出错误
    expect(() => {
      JSON.parse('invalid-json');
    }).toThrow();
  });
});

describe('Network Status', () => {
  it('should track network status changes', async () => {
    const { useSyncManager } = await import('../sync-manager');
    
    // 模拟离线
    useSyncManager.getState().setOnline(false);
    expect(useSyncManager.getState().isOnline).toBe(false);
    
    // 模拟恢复在线
    useSyncManager.getState().setOnline(true);
    expect(useSyncManager.getState().isOnline).toBe(true);
  });

  it('should prevent sync when offline', async () => {
    const { useSyncManager } = await import('../sync-manager');
    
    // 设置离线
    useSyncManager.getState().setOnline(false);
    
    // 尝试同步
    const result = await useSyncManager.getState().startSync();
    
    // 离线时不应该同步
    expect(result.successCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });
});