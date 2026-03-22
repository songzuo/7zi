/**
 * 离线数据存储
 * @module lib/offline/offline-store
 * @description 使用 IndexedDB 进行离线数据持久化
 */

import type { OfflineData, PendingOperation, SyncStatus, NetworkStatus, OfflineEntityType } from './types';

const DB_NAME = 'offline-storage';
const DB_VERSION = 1;

// 存储名称
const STORES = {
  DATA: 'offline-data',
  OPERATIONS: 'pending-operations',
  NETWORK: 'network-status',
} as const;

/**
 * IndexedDB 数据库连接
 */
class IndexedDBConnection {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 离线数据存储
        if (!db.objectStoreNames.contains(STORES.DATA)) {
          const dataStore = db.createObjectStore(STORES.DATA, { keyPath: ['entityType', 'id'] });
          dataStore.createIndex('entityType', 'entityType', { unique: false });
          dataStore.createIndex('synced', 'synced', { unique: false });
          dataStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 待同步操作存储
        if (!db.objectStoreNames.contains(STORES.OPERATIONS)) {
          const opStore = db.createObjectStore(STORES.OPERATIONS, { keyPath: 'id' });
          opStore.createIndex('entityType', 'entityType', { unique: false });
          opStore.createIndex('status', 'status', { unique: false });
          opStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 网络状态存储
        if (!db.objectStoreNames.contains(STORES.NETWORK)) {
          db.createObjectStore(STORES.NETWORK, { keyPath: 'id' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * 获取数据库实例
   */
  async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      return this.init();
    }
    return this.db;
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// 全局数据库实例
let dbConnection: IndexedDBConnection | null = null;

/**
 * 获取数据库连接
 */
function getDBConnection(): IndexedDBConnection {
  if (!dbConnection) {
    dbConnection = new IndexedDBConnection();
  }
  return dbConnection;
}

/**
 * 通用 IndexedDB 操作辅助函数
 */
async function dbOperation<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await getDBConnection().getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// 离线数据操作
// ============================================================================

/**
 * 保存离线数据
 */
export async function saveOfflineData<T>(
  entityType: OfflineEntityType,
  data: OfflineData<T>
): Promise<void> {
  await dbOperation(STORES.DATA, 'readwrite', (store) => store.put(data));
}

/**
 * 批量保存离线数据
 */
export async function batchSaveOfflineData<T>(
  entityType: OfflineEntityType,
  items: OfflineData<T>[]
): Promise<void> {
  const db = await getDBConnection().getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.DATA, 'readwrite');
    const store = transaction.objectStore(STORES.DATA);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    for (const item of items) {
      store.put(item);
    }
  });
}

/**
 * 获取离线数据
 */
export async function getOfflineData<T>(
  entityType: OfflineEntityType,
  id: string
): Promise<OfflineData<T> | null> {
  try {
    const result = await dbOperation(STORES.DATA, 'readonly', (store) =>
      store.get([entityType, id])
    );
    return result || null;
  } catch {
    return null;
  }
}

/**
 * 获取所有离线数据
 */
export async function getAllOfflineData<T>(
  entityType: OfflineEntityType
): Promise<OfflineData<T>[]> {
  const db = await getDBConnection().getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.DATA, 'readonly');
    const store = transaction.objectStore(STORES.DATA);
    const index = store.index('entityType');
    const request = index.getAll(entityType);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取未同步的数据
 */
export async function getUnsyncedData<T>(
  entityType: OfflineEntityType
): Promise<OfflineData<T>[]> {
  const db = await getDBConnection().getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.DATA, 'readonly');
    const store = transaction.objectStore(STORES.DATA);
    
    // 获取该实体类型的所有数据
    const index = store.index('entityType');
    const getAllRequest = index.getAll(entityType);

    getAllRequest.onsuccess = () => {
      const allData = getAllRequest.result || [];
      const unsynced = allData.filter((item: OfflineData<T>) => !item.synced);
      resolve(unsynced);
    };
    getAllRequest.onerror = () => reject(getAllRequest.error);
  });
}

/**
 * 删除离线数据
 */
export async function deleteOfflineData(
  entityType: OfflineEntityType,
  id: string
): Promise<void> {
  await dbOperation(STORES.DATA, 'readwrite', (store) => store.delete([entityType, id]));
}

/**
 * 清空实体的所有离线数据
 */
export async function clearOfflineData(entityType: OfflineEntityType): Promise<void> {
  const db = await getDBConnection().getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.DATA, 'readwrite');
    const store = transaction.objectStore(STORES.DATA);
    const index = store.index('entityType');
    const request = index.openCursor(entityType);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ============================================================================
// 待同步操作
// ============================================================================

/**
 * 添加待同步操作
 */
export async function addPendingOperation(operation: PendingOperation): Promise<void> {
  await dbOperation(STORES.OPERATIONS, 'readwrite', (store) => store.add(operation));
}

/**
 * 更新待同步操作
 */
export async function updatePendingOperation(operation: PendingOperation): Promise<void> {
  await dbOperation(STORES.OPERATIONS, 'readwrite', (store) => store.put(operation));
}

/**
 * 获取所有待同步操作
 */
export async function getPendingOperations(status?: SyncStatus): Promise<PendingOperation[]> {
  const db = await getDBConnection().getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.OPERATIONS, 'readonly');
    const store = transaction.objectStore(STORES.OPERATIONS);
    
    let request: IDBRequest<PendingOperation[]>;
    if (status) {
      const index = store.index('status');
      request = index.getAll(status);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 删除待同步操作
 */
export async function deletePendingOperation(id: string): Promise<void> {
  await dbOperation(STORES.OPERATIONS, 'readwrite', (store) => store.delete(id));
}

/**
 * 清空所有待同步操作
 */
export async function clearPendingOperations(): Promise<void> {
  const db = await getDBConnection().getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.OPERATIONS, 'readwrite');
    const store = transaction.objectStore(STORES.OPERATIONS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取待同步操作数量
 */
export async function getPendingOperationsCount(): Promise<number> {
  const db = await getDBConnection().getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.OPERATIONS, 'readonly');
    const store = transaction.objectStore(STORES.OPERATIONS);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// 网络状态
// ============================================================================

/**
 * 保存网络状态
 */
export async function saveNetworkStatus(status: NetworkStatus): Promise<void> {
  await dbOperation(STORES.NETWORK, 'readwrite', (store) =>
    store.put({ id: 'current', ...status })
  );
}

/**
 * 获取网络状态
 */
export async function getNetworkStatus(): Promise<NetworkStatus | null> {
  try {
    const result = await dbOperation(STORES.NETWORK, 'readonly', (store) =>
      store.get('current')
    );
    return result || null;
  } catch {
    return null;
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成离线操作唯一 ID (时间戳 + 随机数)
 * 注意：这不是 UUID，仅供离线操作追踪使用
 */
export function generateOfflineId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * @deprecated Use generateOfflineId() instead for clarity
 */
export function generateId(): string {
  return generateOfflineId();
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (dbConnection) {
    dbConnection.close();
    dbConnection = null;
  }
}

/**
 * 检查 IndexedDB 是否可用
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

export {
  getDBConnection,
  STORES,
};
