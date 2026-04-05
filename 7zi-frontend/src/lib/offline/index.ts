/**
 * Offline Module Index
 * Exports all offline functionality for PWA v1.13.0
 */

// Re-export storage module
export {
  OfflineStorage,
  getOfflineStorage,
  STORES,
  DEFAULT_CONFIG,
  type CacheEntry,
  type DataEntry,
  type SyncQueueItem,
  type MetaEntry,
  type StoreName,
  type StorageConfig,
} from './storage';

// Re-export conflict resolver module
export {
  ConflictResolver,
  getConflictResolver,
  type ConflictDetection,
  type FieldConflict,
  type ResolutionStrategy,
  type ResolutionResult,
  type ManualResolutionRequest,
  type ConflictMeta,
} from './conflict-resolver';

// Re-export sync manager module
export {
  SyncManager,
  getSyncManager,
  type SyncState,
  type SyncTrigger,
  type SyncResult,
  type SyncStats,
  type SyncConfig,
  DEFAULT_SYNC_CONFIG,
} from './sync-manager';

// Convenience function to initialize all offline modules
// Import this function separately to avoid circular dependencies
export async function initOfflineModules(): Promise<{
  storage: import('./storage').OfflineStorage;
  syncManager: import('./sync-manager').SyncManager;
  conflictResolver: import('./conflict-resolver').ConflictResolver;
}> {
  const { getOfflineStorage } = await import('./storage');
  const { getSyncManager } = await import('./sync-manager');
  const { getConflictResolver } = await import('./conflict-resolver');
  
  const storage = getOfflineStorage();
  await storage.init();

  const syncManager = getSyncManager();
  
  console.log('[Offline] All modules initialized');
  return {
    storage,
    syncManager,
    conflictResolver: getConflictResolver(),
  };
}