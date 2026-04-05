/**
 * Tests for offline-storage module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineStorage, offlineStorage } from '../offline-storage';

// Mock idb
vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

import { openDB } from 'idb';

const mockDB = {
  get: vi.fn(),
  getAll: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  count: vi.fn(),
  transaction: vi.fn(),
  objectStoreNames: {
    contains: vi.fn(),
    forEach: vi.fn(),
  },
};

const mockTransaction = {
  store: {
    index: vi.fn(),
    put: vi.fn(),
    add: vi.fn(),
    delete: vi.fn(),
  },
};

const mockIndex = {
  getAll: vi.fn(),
  openCursor: vi.fn(),
};

describe('OfflineStorage', () => {
  let storage: OfflineStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new OfflineStorage({
      dbName: 'test-db',
      version: 1,
      stores: {
        testStore: { keyPath: 'id', indexes: ['timestamp'] },
      },
    });

    (openDB as any).mockResolvedValue(mockDB);
    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.store.index.mockReturnValue(mockIndex);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialize', () => {
    it('initializes database', async () => {
      await storage.initialize();

      expect(openDB).toHaveBeenCalledWith('test-db', 1, expect.any(Function));
    });

    it('does not reinitialize if already initialized', async () => {
      await storage.initialize();
      await storage.initialize();

      expect(openDB).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('returns record data', async () => {
      const mockRecord = { id: '1', data: { name: 'test' }, syncStatus: 'synced' };
      mockDB.get.mockResolvedValue(mockRecord);

      const result = await storage.get('testStore', '1');

      expect(result).toEqual({ name: 'test' });
    });

    it('returns undefined for error records', async () => {
      const mockRecord = { id: '1', data: { name: 'test' }, syncStatus: 'error' };
      mockDB.get.mockResolvedValue(mockRecord);

      const result = await storage.get('testStore', '1');

      expect(result).toBeUndefined();
    });

    it('returns undefined for non-existent records', async () => {
      mockDB.get.mockResolvedValue(undefined);

      const result = await storage.get('testStore', '1');

      expect(result).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns all records', async () => {
      const mockRecords = [
        { id: '1', data: { name: 'test1' }, syncStatus: 'synced' },
        { id: '2', data: { name: 'test2' }, syncStatus: 'synced' },
      ];
      mockDB.getAll.mockResolvedValue(mockRecords);

      const result = await storage.getAll('testStore');

      expect(result).toEqual([{ name: 'test1' }, { name: 'test2' }]);
    });

    it('filters out error records', async () => {
      const mockRecords = [
        { id: '1', data: { name: 'test1' }, syncStatus: 'synced' },
        { id: '2', data: { name: 'test2' }, syncStatus: 'error' },
      ];
      mockDB.getAll.mockResolvedValue(mockRecords);

      const result = await storage.getAll('testStore');

      expect(result).toEqual([{ name: 'test1' }]);
    });
  });

  describe('put', () => {
    it('adds record with sync status', async () => {
      mockDB.put.mockResolvedValue('1');

      const id = await storage.put('testStore', { name: 'test' });

      expect(id).toBeDefined();
      expect(mockDB.put).toHaveBeenCalledWith(
        'testStore',
        expect.objectContaining({
          data: { name: 'test' },
          syncStatus: 'synced',
        })
      );
    });

    it('adds record with pending sync status when syncImmediately is true', async () => {
      mockDB.put.mockResolvedValue('1');

      const id = await storage.put('testStore', { name: 'test' }, undefined, true);

      expect(id).toBeDefined();
      expect(mockDB.put).toHaveBeenCalledWith(
        'testStore',
        expect.objectContaining({
          data: { name: 'test' },
          syncStatus: 'pending',
        })
      );
    });
  });

  describe('delete', () => {
    it('deletes record', async () => {
      mockDB.delete.mockResolvedValue(undefined);

      await storage.delete('testStore', '1');

      expect(mockDB.delete).toHaveBeenCalledWith('testStore', '1');
    });
  });

  describe('clear', () => {
    it('clears all records in store', async () => {
      mockDB.clear.mockResolvedValue(undefined);

      await storage.clear('testStore');

      expect(mockDB.clear).toHaveBeenCalledWith('testStore');
    });
  });

  describe('bulkImport', () => {
    it('imports multiple records', async () => {
      mockDB.put.mockResolvedValue('1');

      const records = [
        { data: { name: 'test1' } },
        { data: { name: 'test2' } },
      ];

      await storage.bulkImport('testStore', records);

      expect(mockDB.put).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPendingSyncItems', () => {
    it('returns pending sync items sorted by timestamp', async () => {
      const mockItems = [
        { id: '2', timestamp: 2000 },
        { id: '1', timestamp: 1000 },
      ];
      mockDB.getAll.mockResolvedValue(mockItems);

      const result = await storage.getPendingSyncItems();

      expect(result).toEqual([
        { id: '1', timestamp: 1000 },
        { id: '2', timestamp: 2000 },
      ]);
    });
  });

  describe('clearSyncQueueItem', () => {
    it('clears sync queue item', async () => {
      mockDB.delete.mockResolvedValue(undefined);

      await storage.clearSyncQueueItem('1');

      expect(mockDB.delete).toHaveBeenCalledWith('_syncQueue', '1');
    });
  });

  describe('incrementSyncRetry', () => {
    it('increments retry count', async () => {
      const mockItem = { id: '1', retries: 0 };
      mockDB.get.mockResolvedValue(mockItem);
      mockDB.put.mockResolvedValue(undefined);

      await storage.incrementSyncRetry('1');

      expect(mockDB.put).toHaveBeenCalledWith(
        '_syncQueue',
        expect.objectContaining({
          retries: 1,
        })
      );
    });
  });

  describe('close', () => {
    it('closes database connection', async () => {
      mockDB.close = vi.fn();

      await storage.initialize();
      await storage.close();

      expect(mockDB.close).toHaveBeenCalled();
    });
  });

  describe('deleteDatabase', () => {
    it('deletes entire database', async () => {
      const mockRequest = {
        onsuccess: vi.fn(),
        onerror: vi.fn(),
      };

      (indexedDB as any).deleteDatabase = vi.fn().mockReturnValue(mockRequest);

      await storage.deleteDatabase();

      expect(indexedDB.deleteDatabase).toHaveBeenCalledWith('test-db');
    });
  });
});

describe('offlineStorage', () => {
  it('exports preconfigured instance', () => {
    expect(offlineStorage).toBeInstanceOf(OfflineStorage);
  });
});