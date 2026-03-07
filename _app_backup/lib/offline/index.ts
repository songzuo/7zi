/**
 * 离线同步模块入口
 * @module lib/offline
 * @description 提供离线数据同步功能
 */

// 类型导出
export type {
  SyncOperationType,
  SyncStatus,
  PendingOperation,
  SyncQueue,
  OfflineData,
  SyncResult,
  SyncError,
  NetworkStatus,
  SyncConfig,
  OfflineEntityType,
} from './types';

export {
  DEFAULT_SYNC_CONFIG,
  STORAGE_KEYS,
  OFFLINE_ENTITIES,
} from './types';

// 存储操作导出
export {
  saveOfflineData,
  batchSaveOfflineData,
  getOfflineData,
  getAllOfflineData,
  getUnsyncedData,
  deleteOfflineData,
  clearOfflineData,
  addPendingOperation,
  updatePendingOperation,
  getPendingOperations,
  deletePendingOperation,
  clearPendingOperations,
  getPendingOperationsCount,
  saveNetworkStatus,
  getNetworkStatus,
  generateId,
  closeDatabase,
  isIndexedDBAvailable,
} from './offline-store';

// 同步管理器导出
export {
  useSyncManager,
  initNetworkListener,
  getSyncSummary,
  createSyncOperation,
} from './sync-manager';

// Hooks 导出
export {
  useOfflineSync,
  useNetworkStatus,
  useOnline,
  usePendingCount,
  useOfflineData,
  useOfflineReady,
} from './useOfflineSync';