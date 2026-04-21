/**
 * Offline Storage Module
 * IndexedDB-based layered storage with sync queue management
 */

import { v4 as uuidv4 } from 'uuid';

// Database configuration
const DB_NAME = '7zi-offline-db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  CACHE: 'cache',           // Static/dynamic cache
  DATA: 'data',             // App data (IndexedDB)
  SYNC_QUEUE: 'sync-queue', // Pending sync operations
  META: 'meta',             // Metadata and version info
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

// Data layer types
export interface CacheEntry {
  id: string;
  url: string;
  response: Blob;
  headers: Record<string, string>;
  timestamp: number;
  expiresAt?: number;
  accessCount: number;
  lastAccessed: number;
}

export interface DataEntry {
  id: string;
  collection: string;
  data: any;
  localVersion: number;
  serverVersion?: number;
  createdAt: number;
  updatedAt: number;
  isDirty: boolean;
  conflictData?: any;
}

export interface SyncQueueItem {
  id: string;
  collection: string;
  operation: 'create' | 'update' | 'delete';
  dataId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  priority: number;
}

export interface MetaEntry {
  key: string;
  value: any;
  updatedAt: number;
}

// Storage config
export interface StorageConfig {
  maxCacheSize: number;        // Max cache size in bytes
  maxDataSize: number;         // Max data store size in bytes
  maxEntries: number;         // Max number of entries per store
  cacheTTL: number;           // Cache time-to-live in ms
  enableCompression: boolean;  // Enable data compression
}

// Default config
export const DEFAULT_CONFIG: StorageConfig = {
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  maxDataSize: 20 * 1024 * 1024, // 20MB
  maxEntries: 1000,
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  enableCompression: false,
};

/**
 * IndexedDB Wrapper with layered storage
 */
export class OfflineStorage {
  private db: IDBDatabase | null = null;
  private config: StorageConfig;
  private initialized = false;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        this.setupAutoCleanup();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        this.handleUpgrade(event.target as IDBOpenDBRequest);
      };
    });
  }

  /**
   * Handle database upgrade
   */
  private handleUpgrade(request: IDBOpenDBRequest): void {
    const db = request.result;

    // Create object stores if they don't exist
    if (!db.objectStoreNames.contains(STORES.CACHE)) {
      const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'id' });
      cacheStore.createIndex('url', 'url', { unique: false });
      cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      cacheStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
    }

    if (!db.objectStoreNames.contains(STORES.DATA)) {
      const dataStore = db.createObjectStore(STORES.DATA, { keyPath: 'id' });
      dataStore.createIndex('collection', 'collection', { unique: false });
      dataStore.createIndex('isDirty', 'isDirty', { unique: false });
      dataStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    }

    if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
      const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
      syncStore.createIndex('collection', 'collection', { unique: false });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('priority', 'priority', { unique: false });
    }

    if (!db.objectStoreNames.contains(STORES.META)) {
      db.createObjectStore(STORES.META, { keyPath: 'key' });
    }
  }

  /**
   * Setup automatic cleanup
   */
  private setupAutoCleanup(): void {
    // Run cleanup every 5 minutes
    setInterval(() => this.performLRUCleanup(), 5 * 60 * 1000);
  }

  // ==================== Cache Operations ====================

  /**
   * Store a cache entry
   */
  async storeCache(
    url: string,
    response: Response,
    options: { ttl?: number; maxAge?: number } = {}
  ): Promise<string> {
    await this.init();
    const id = uuidv4();
    const timestamp = Date.now();
    const ttl = options.ttl || this.config.cacheTTL;

    const entry: CacheEntry = {
      id,
      url,
      response: await response.clone().blob(),
      headers: Object.fromEntries(response.headers.entries()),
      timestamp,
      expiresAt: timestamp + ttl,
      accessCount: 0,
      lastAccessed: timestamp,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CACHE], 'readwrite');
      const store = transaction.objectStore(STORES.CACHE);
      const request = store.add(entry);

      request.onsuccess = () => {
        this.checkStorageLimit(STORES.CACHE).then(() => resolve(id)).catch(reject);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a cache entry
   */
  async getCache(url: string): Promise<Response | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CACHE], 'readonly');
      const store = transaction.objectStore(STORES.CACHE);
      const index = store.index('url');
      const request = index.get(url);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        // Check expiration
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          this.deleteCache(entry.id);
          resolve(null);
          return;
        }

        // Update access count
        this.updateCacheAccess(entry.id);

        const headers = new Headers(entry.headers);
        const response = new Response(entry.response, {
          status: 200,
          statusText: 'OK',
          headers,
        });

        resolve(response);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update cache access stats
   */
  private async updateCacheAccess(id: string): Promise<void> {
    const transaction = this.db!.transaction([STORES.CACHE], 'readwrite');
    const store = transaction.objectStore(STORES.CACHE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const entry = getRequest.result as CacheEntry;
      if (entry) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        store.put(entry);
      }
    };
  }

  /**
   * Delete a cache entry
   */
  async deleteCache(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CACHE], 'readwrite');
      const store = transaction.objectStore(STORES.CACHE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== Data Operations ====================

  /**
   * Store app data
   */
  async storeData(
    collection: string,
    data: any,
    options: { id?: string; isDirty?: boolean; serverVersion?: number } = {}
  ): Promise<string> {
    await this.init();
    const id = options.id || uuidv4();
    const timestamp = Date.now();

    const entry: DataEntry = {
      id,
      collection,
      data,
      localVersion: 1,
      serverVersion: options.serverVersion,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDirty: options.isDirty ?? false,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.DATA], 'readwrite');
      const store = transaction.objectStore(STORES.DATA);
      
      // Check if exists
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          // Update existing
          const existing = getRequest.result as DataEntry;
          entry.localVersion = existing.localVersion + 1;
          entry.createdAt = existing.createdAt;
        }
        
        const putRequest = store.put(entry);
        putRequest.onsuccess = () => {
          this.checkStorageLimit(STORES.DATA).then(() => resolve(id)).catch(reject);
        };
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Get data by ID
   */
  async getData(collection: string, id: string): Promise<any | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.DATA], 'readonly');
      const store = transaction.objectStore(STORES.DATA);
      const request = store.get(id);

      request.onsuccess = () => {
        const entry = request.result as DataEntry | undefined;
        if (!entry || entry.collection !== collection) {
          resolve(null);
          return;
        }
        resolve(entry.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all data in a collection
   */
  async getCollectionData(collection: string): Promise<any[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.DATA], 'readonly');
      const store = transaction.objectStore(STORES.DATA);
      const index = store.index('collection');
      const request = index.getAll(collection);

      request.onsuccess = () => {
        const entries = request.result as DataEntry[];
        resolve(entries.map(e => ({ ...e.data, _id: e.id, _version: e.localVersion })));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get dirty items that need sync
   */
  async getDirtyItems(collection?: string): Promise<DataEntry[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.DATA], 'readonly');
      const store = transaction.objectStore(STORES.DATA);
      const index = store.index('isDirty');
      const request = index.getAll(IDBKeyRange.only(true));

      request.onsuccess = () => {
        let entries = request.result as DataEntry[];
        if (collection) {
          entries = entries.filter(e => e.collection === collection);
        }
        resolve(entries);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark data as synced
   */
  async markSynced(id: string, serverVersion: number): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.DATA], 'readwrite');
      const store = transaction.objectStore(STORES.DATA);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const entry = getRequest.result as DataEntry;
        if (entry) {
          entry.isDirty = false;
          entry.serverVersion = serverVersion;
          entry.updatedAt = Date.now();
          store.put(entry);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Store conflict data
   */
  async storeConflict(id: string, serverData: any): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.DATA], 'readwrite');
      const store = transaction.objectStore(STORES.DATA);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const entry = getRequest.result as DataEntry;
        if (entry) {
          entry.conflictData = serverData;
          entry.isDirty = true;
          store.put(entry);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Delete data
   */
  async deleteData(collection: string, id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.DATA], 'readwrite');
      const store = transaction.objectStore(STORES.DATA);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== Sync Queue Operations ====================

  /**
   * Add to sync queue
   */
  async addToSyncQueue(
    collection: string,
    operation: 'create' | 'update' | 'delete',
    dataId: string,
    data: any,
    priority: number = 0
  ): Promise<string> {
    await this.init();
    const id = uuidv4();

    const item: SyncQueueItem = {
      id,
      collection,
      operation,
      dataId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      priority,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.add(item);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get pending sync items
   */
  async getPendingSyncItems(limit: number = 50): Promise<SyncQueueItem[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as SyncQueueItem[];
        // Sort by priority (desc) then timestamp (asc)
        items.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return a.timestamp - b.timestamp;
        });
        resolve(items.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove from sync queue
   */
  async removeFromSyncQueue(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update sync item retry count
   */
  async updateSyncRetry(id: string, error: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result as SyncQueueItem;
        if (item) {
          item.retryCount++;
          item.lastError = error;
          store.put(item);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Get sync queue size
   */
  async getSyncQueueSize(): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== Meta Operations ====================

  /**
   * Set metadata
   */
  async setMeta(key: string, value: any): Promise<void> {
    await this.init();

    const entry: MetaEntry = {
      key,
      value,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.META], 'readwrite');
      const store = transaction.objectStore(STORES.META);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get metadata
   */
  async getMeta<T>(key: string): Promise<T | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.META], 'readonly');
      const store = transaction.objectStore(STORES.META);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as MetaEntry | undefined;
        resolve(entry?.value ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== Storage Management ====================

  /**
   * Check storage limit and cleanup if needed
   */
  private async checkStorageLimit(storeName: StoreName): Promise<void> {
    const transaction = this.db!.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      if (countRequest.result > this.config.maxEntries) {
        this.performLRUCleanup(storeName);
      }
    };
  }

  /**
   * Perform LRU cleanup
   */
  async performLRUCleanup(storeName?: StoreName): Promise<void> {
    await this.init();
    const stores = storeName ? [storeName] : [STORES.CACHE, STORES.DATA];

    for (const sn of stores) {
      const transaction = this.db!.transaction([sn], 'readwrite');
      const store = transaction.objectStore(sn);
      
      // Get all entries sorted by lastAccessed
      const request = store.index(sn === STORES.CACHE ? 'lastAccessed' : 'updatedAt').getAll();

      request.onsuccess = () => {
        const entries = request.result;
        const toDelete = entries.slice(this.config.maxEntries * 0.8); // Keep 80%
        
        toDelete.forEach((entry: any) => {
          store.delete(entry.id);
        });
      };
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    await this.init();

    const stores = [STORES.CACHE, STORES.DATA, STORES.SYNC_QUEUE];
    
    for (const sn of stores) {
      const transaction = this.db!.transaction([sn], 'readwrite');
      const store = transaction.objectStore(sn);
      store.clear();
    }
  }

  /**
   * Get storage stats
   */
  async getStats(): Promise<{
    cacheCount: number;
    dataCount: number;
    syncQueueSize: number;
  }> {
    await this.init();

    return new Promise((resolve, reject) => {
      const stats = { cacheCount: 0, dataCount: 0, syncQueueSize: 0 };
      const transaction = this.db!.transaction(
        [STORES.CACHE, STORES.DATA, STORES.SYNC_QUEUE],
        'readonly'
      );

      let completed = 0;
      const checkDone = () => {
        completed++;
        if (completed === 3) resolve(stats);
      };

      const cacheStore = transaction.objectStore(STORES.CACHE);
      cacheStore.count().onsuccess = () => {
        stats.cacheCount = cacheStore.count().result;
        checkDone();
      };

      const dataStore = transaction.objectStore(STORES.DATA);
      dataStore.count().onsuccess = () => {
        stats.dataCount = dataStore.count().result;
        checkDone();
      };

      const syncStore = transaction.objectStore(STORES.SYNC_QUEUE);
      syncStore.count().onsuccess = () => {
        stats.syncQueueSize = syncStore.count().result;
        checkDone();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton instance
let storageInstance: OfflineStorage | null = null;

export function getOfflineStorage(config?: Partial<StorageConfig>): OfflineStorage {
  if (!storageInstance) {
    storageInstance = new OfflineStorage(config);
  }
  return storageInstance;
}

export default OfflineStorage;
