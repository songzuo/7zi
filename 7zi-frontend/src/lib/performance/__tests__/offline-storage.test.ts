/**
 * Tests for offline-storage module
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock idb
vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

// Use fake timers to prevent setTimeout-based side effects from singleton
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

import { openDB } from 'idb';

const mockGet = vi.fn();
const mockGetAll = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockClear = vi.fn();
const mockClose = vi.fn();
const mockCount = vi.fn();

const mockObjectStoreNames = {
  contains: vi.fn().mockReturnValue(true),
};

const mockStore = {
  get: mockGet,
  getAll: mockGetAll,
  put: mockPut,
  delete: mockDelete,
  clear: mockClear,
  add: vi.fn(),
  count: mockCount,
  index: vi.fn().mockReturnValue({
    getAll: mockGetAll,
  }),
};

const mockTransaction = vi.fn().mockReturnValue({
  objectStore: vi.fn().mockReturnValue(mockStore),
  done: Promise.resolve(),
});

const mockDB = {
  get: mockGet,
  getAll: mockGetAll,
  put: mockPut,
  delete: mockDelete,
  clear: mockClear,
  count: mockCount,
  transaction: mockTransaction,
  objectStoreNames: mockObjectStoreNames,
  close: mockClose,
  add: vi.fn(),
};

describe('OfflineStorage', () => {
  let OfflineStorage: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockObjectStoreNames.contains.mockReturnValue(true);
    mockTransaction.mockReturnValue({
      objectStore: vi.fn().mockReturnValue(mockStore),
      done: Promise.resolve(),
    });
    
    // Default mock implementations that return safe values
    mockGet.mockResolvedValue(undefined);
    mockGetAll.mockResolvedValue([]);
    mockPut.mockResolvedValue('key');
    mockDelete.mockResolvedValue(undefined);
    mockClear.mockResolvedValue(undefined);
    mockClose.mockResolvedValue(undefined);
    mockCount.mockResolvedValue(0);
    mockStore.index.mockReturnValue({ getAll: mockGetAll });

    (openDB as any).mockResolvedValue(mockDB);

    vi.resetModules();
    const module = await import('../offline-storage');
    OfflineStorage = module.default;
  });

  describe('constructor', () => {
    it('should create instance with config', () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      expect(storage).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should not reinitialize if already initialized', async () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      
      await storage.initialize();
      await storage.initialize();
      
      expect(openDB).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('should return record data', async () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      
      await storage.initialize();
      
      const mockRecord = { id: '1', data: { name: 'test' }, syncStatus: 'synced' };
      mockStore.get.mockResolvedValue(mockRecord);
      
      const result = await storage.get('testStore', '1');
      
      expect(result).toEqual({ name: 'test' });
    });

    it('should return undefined for error records', async () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      
      await storage.initialize();
      
      const mockRecord = { id: '1', data: { name: 'test' }, syncStatus: 'error' };
      mockStore.get.mockResolvedValue(mockRecord);
      
      const result = await storage.get('testStore', '1');
      
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent records', async () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      
      await storage.initialize();
      mockStore.get.mockResolvedValue(undefined);
      
      const result = await storage.get('testStore', '999');
      
      expect(result).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all records', async () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      
      await storage.initialize();
      
      const mockRecords = [
        { id: '1', data: { name: 'test1' }, syncStatus: 'synced' },
        { id: '2', data: { name: 'test2' }, syncStatus: 'synced' },
      ];
      mockStore.getAll.mockResolvedValue(mockRecords);
      
      const result = await storage.getAll('testStore');
      
      expect(result).toEqual([{ name: 'test1' }, { name: 'test2' }]);
    });

    it('should filter out error records', async () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      
      await storage.initialize();
      
      const mockRecords = [
        { id: '1', data: { name: 'test1' }, syncStatus: 'synced' },
        { id: '2', data: { name: 'test2' }, syncStatus: 'error' },
      ];
      mockStore.getAll.mockResolvedValue(mockRecords);
      
      const result = await storage.getAll('testStore');
      
      expect(result).toEqual([{ name: 'test1' }]);
    });
  });

  describe('put', () => {
    it('should add record', async () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      
      await storage.initialize();
      mockStore.put.mockResolvedValue('1');
      
      await storage.put('testStore', { name: 'test' });
      
      expect(mockStore.put).toHaveBeenCalled();
    });

    it('should add record with pending sync when syncImmediately is true', async () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      
      await storage.initialize();
      mockStore.put.mockResolvedValue('1');
      
      await storage.put('testStore', { name: 'test' }, { syncImmediately: true });
      
      expect(mockStore.put).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete record', async () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      
      await storage.initialize();
      mockStore.delete.mockResolvedValue(undefined);
      
      await storage.delete('testStore', '1');
      
      expect(mockStore.delete).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all records in store', async () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      
      await storage.initialize();
      mockStore.clear.mockResolvedValue(undefined);
      
      await storage.clear('testStore');
      
      expect(mockStore.clear).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      const storage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: { testStore: { keyPath: 'id' } },
      });
      
      await storage.initialize();
      
      await storage.close();
      
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
