/**
 * OfflineStorage - IndexedDB wrapper for offline data persistence
 * Provides robust offline storage with automatic sync
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { logger } from '@/lib/logger'
import { generateSecureId } from '@/lib/utils'

export interface OfflineStorageConfig {
  dbName: string;
  version: number;
  stores: Record<string, { keyPath: string; indexes?: string[] }>;
}

export interface OfflineRecord<T = any> {
  id: string;
  data: T;
  timestamp: number;
  syncStatus: 'pending' | 'synced' | 'error';
  metadata?: Record<string, any>;
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineStorage {
  private db: IDBPDatabase<any> | null = null;
  private config: OfflineStorageConfig;
  private syncInProgress = false;

  constructor(config: OfflineStorageConfig) {
    this.config = config;
  }

  /**
   * Initialize IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(this.config.dbName, this.config.version, {
      upgrade(db) {
        // Create object stores based on config
        Object.entries(config.stores).forEach(([name, schema]) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, {
              keyPath: schema.keyPath,
              autoIncrement: true,
            });

            // Create indexes
            schema.indexes?.forEach(indexName => {
              store.createIndex(indexName, indexName);
            });
          }
        });

        // Create sync queue store if not exists
        if (!db.objectStoreNames.contains('_syncQueue')) {
          const syncQueue = db.createObjectStore('_syncQueue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncQueue.createIndex('timestamp', 'timestamp');
          syncQueue.createIndex('collection', 'collection');
        }

        // Create metadata store if not exists
        if (!db.objectStoreNames.contains('_metadata')) {
          db.createObjectStore('_metadata', { keyPath: 'key' });
        }
      },
    });

    // Check for pending sync items
    this.checkPendingSync();
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  /**
   * Get record by ID
   */
  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    await this.ensureInitialized();

    const record = await this.db!.get(storeName, id);

    // If record has syncStatus 'error', return undefined
    if (record?.syncStatus === 'error') {
      return undefined;
    }

    return record?.data;
  }

  /**
   * Get all records from store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    await this.ensureInitialized();

    const records = await this.db!.getAll(storeName);
    return records
      .filter(r => r.syncStatus !== 'error')
      .map(r => r.data);
  }

  /**
   * Query records by index
   */
  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    await this.ensureInitialized();

    const index = this.db!.transaction(storeName).store.index(indexName);
    const records = await index.getAll(value);

    return records
      .filter(r => r.syncStatus !== 'error')
      .map(r => r.data);
  }

  /**
   * Add or update record
   */
  async put<T>(
    storeName: string,
    data: T,
    id?: string,
    syncImmediately = false
  ): Promise<string> {
    await this.ensureInitialized();

    const recordId = id || this.generateId();
    const record: OfflineRecord<T> = {
      id: recordId,
      data,
      timestamp: Date.now(),
      syncStatus: syncImmediately ? 'pending' : 'synced',
      metadata: {},
    };

    await this.db!.put(storeName, record);

    if (syncImmediately) {
      await this.addToSyncQueue('update', storeName, data);
    }

    return recordId;
  }

  /**
   * Delete record
   */
  async delete(storeName: string, id: string, syncImmediately = false): Promise<void> {
    await this.ensureInitialized();

    await this.db!.delete(storeName, id);

    if (syncImmediately) {
      await this.addToSyncQueue('delete', storeName, { id });
    }
  }

  /**
   * Clear all records in store
   */
  async clear(storeName: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.clear(storeName);
  }

  /**
   * Bulk import records
   */
  async bulkImport<T>(
    storeName: string,
    records: Array<{ data: T; id?: string }>,
    syncImmediately = false
  ): Promise<void> {
    await this.ensureInitialized();

    const tx = this.db!.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    await Promise.all(
      records.map(({ data, id }) =>
        store.put({
          id: id || this.generateId(),
          data,
          timestamp: Date.now(),
          syncStatus: syncImmediately ? 'pending' : 'synced',
        })
      )
    );

    if (syncImmediately) {
      await Promise.all(
        records.map(({ data }) =>
          this.addToSyncQueue('create', storeName, data)
        )
      );
    }
  }

  /**
   * Add item to sync queue
   */
  private async addToSyncQueue(
    action: 'create' | 'update' | 'delete',
    collection: string,
    data: any
  ): Promise<void> {
    const item: SyncQueueItem = {
      id: this.generateId(),
      action,
      collection,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    await this.db!.add('_syncQueue', item);
  }

  /**
   * Get pending sync items
   */
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    await this.ensureInitialized();

    const items = await this.db!.getAll('_syncQueue');
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear sync queue item
   */
  async clearSyncQueueItem(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.delete('_syncQueue', id);
  }

  /**
   * Increment retry count for sync item
   */
  async incrementSyncRetry(id: string): Promise<void> {
    await this.ensureInitialized();

    const item = await this.db!.get('_syncQueue', id);
    if (item) {
      item.retries++;
      await this.db!.put('_syncQueue', item);
    }
  }

  /**
   * Check for pending sync and trigger if online
   */
  private async checkPendingSync(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (navigator.onLine) {
      await this.syncPendingItems();
    }

    // Listen for online events
    window.addEventListener('online', () => {
      this.syncPendingItems();
    });
  }

  /**
   * Sync pending items with server
   */
  async syncPendingItems(): Promise<void> {
    if (this.syncInProgress || typeof window === 'undefined') {
      return;
    }

    this.syncInProgress = true;

    try {
      const items = await this.getPendingSyncItems();

      for (const item of items) {
        try {
          // Sync item with server (implement your sync logic)
          await this.syncItem(item);

          // Remove from queue on success
          await this.clearSyncQueueItem(item.id);
        } catch (error) {
          // Increment retry count
          await this.incrementSyncRetry(item.id);

          // Remove from queue if max retries exceeded
          if (item.retries >= 3) {
            await this.clearSyncQueueItem(item.id);
          }

          logger.error('Sync failed for item:', item, error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync single item with server (implement your sync logic)
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    // Implement your sync logic here
    // This is a placeholder - integrate with your API
    logger.debug('Syncing item:', item);

    switch (item.action) {
      case 'create':
        // Example: await api.post(`/api/${item.collection}`, item.data);
        break;
      case 'update':
        // Example: await api.put(`/api/${item.collection}/${item.data.id}`, item.data);
        break;
      case 'delete':
        // Example: await api.delete(`/api/${item.collection}/${item.data.id}`);
        break;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    used: number;
    available: number;
    percentage: number;
    byStore: Record<string, number>;
  }> {
    await this.ensureInitialized();

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;

      const byStore: Record<string, number> = {};

      // Get size for each store
      for (const storeName of this.db!.objectStoreNames) {
        const count = await this.db!.count(storeName);
        byStore[storeName] = count;
      }

      return {
        used,
        available: quota - used,
        percentage: quota > 0 ? (used / quota) * 100 : 0,
        byStore,
      };
    }

    return {
      used: 0,
      available: 0,
      percentage: 0,
      byStore: {},
    };
  }

  /**
   * Clear old records to free space
   */
  async cleanupOldRecords(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    await this.ensureInitialized();

    let deletedCount = 0;
    const cutoffTime = Date.now() - maxAge;

    for (const storeName of this.db!.objectStoreNames) {
      if (storeName.startsWith('_')) continue; // Skip internal stores

      const tx = this.db!.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const index = store.index('timestamp');

      let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      while (cursor) {
        await cursor.delete();
        deletedCount++;
        cursor = await cursor.continue();
      }
    }

    return deletedCount;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return generateSecureId();
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Delete entire database
   */
  async deleteDatabase(): Promise<void> {
    if (this.db) {
      await this.close();
    }
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Preconfigured instance for common use cases
export const offlineStorage = new OfflineStorage({
  dbName: '7zi-offline-storage',
  version: 1,
  stores: {
    draftStorage: { keyPath: 'id', indexes: ['timestamp', 'syncStatus'] },
    cacheData: { keyPath: 'id', indexes: ['timestamp'] },
    userPreferences: { keyPath: 'id', indexes: ['timestamp'] },
    notifications: { keyPath: 'id', indexes: ['timestamp', 'read'] },
  },
});

export default OfflineStorage;
