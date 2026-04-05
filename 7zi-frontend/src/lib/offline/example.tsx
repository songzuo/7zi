/**
 * Offline Integration Example
 * Demonstrates how to use the offline modules in a React component
 */

import { useEffect, useState } from 'react';
import {
  initOfflineModules,
  getOfflineStorage,
  getSyncManager,
  getConflictResolver,
  type SyncState,
  type SyncStats,
} from '@/lib/offline';

export function OfflineManager() {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Initialize offline modules
    initOfflineModules().then(({ storage, syncManager }) => {
      console.log('Offline modules initialized');

      // Listen to sync state changes
      syncManager.addStateListener('main', setSyncState);

      // Get initial stats
      setSyncStats(syncManager.getStats());
    });

    // Listen to network changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    const syncManager = getSyncManager();
    const result = await syncManager.manualSync();
    setSyncStats(syncManager.getStats());
    console.log('Sync result:', result);
  };

  const handlePauseSync = () => {
    const syncManager = getSyncManager();
    syncManager.pause();
  };

  const handleResumeSync = () => {
    const syncManager = getSyncManager();
    syncManager.resume();
  };

  const handleClearCache = async () => {
    const storage = getOfflineStorage();
    await storage.clearAll();
    console.log('Cache cleared');
  };

  return (
    <div className="offline-manager">
      <h3>Offline Status</h3>
      
      <div className="status-indicators">
        <div className={`indicator ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
        <div className={`indicator sync-${syncState}`}>
          Sync: {syncState}
        </div>
      </div>

      {syncStats && (
        <div className="sync-stats">
          <h4>Sync Statistics</h4>
          <ul>
            <li>Last Sync: {syncStats.lastSync ? new Date(syncStats.lastSync).toLocaleString() : 'Never'}</li>
            <li>Total Syncs: {syncStats.totalSyncs}</li>
            <li>Successful: {syncStats.successfulSyncs}</li>
            <li>Failed: {syncStats.failedSyncs}</li>
            <li>Conflicts: {syncStats.totalConflicts}</li>
            <li>Resolved: {syncStats.resolvedConflicts}</li>
          </ul>
        </div>
      )}

      <div className="actions">
        <button onClick={handleManualSync} disabled={syncState === 'syncing'}>
          {syncState === 'syncing' ? 'Syncing...' : 'Sync Now'}
        </button>
        <button onClick={handlePauseSync} disabled={syncState === 'paused'}>
          Pause Sync
        </button>
        <button onClick={handleResumeSync} disabled={syncState !== 'paused'}>
          Resume Sync
        </button>
        <button onClick={handleClearCache}>
          Clear Cache
        </button>
      </div>
    </div>
  );
}

/**
 * Example: Storing data offline
 */
export async function storeDataOffline(collection: string, data: any) {
  const storage = getOfflineStorage();
  const id = await storage.storeData(collection, data, { isDirty: true });
  
  // Add to sync queue
  await storage.addToSyncQueue(collection, 'update', id, data, 1);
  
  return id;
}

/**
 * Example: Reading data offline
 */
export async function readDataOffline(collection: string, id: string) {
  const storage = getOfflineStorage();
  return await storage.getData(collection, id);
}

/**
 * Example: Handling conflicts
 */
export async function handleConflict(
  entryId: string,
  collection: string,
  localData: any,
  serverData: any
) {
  const conflictResolver = getConflictResolver();
  const storage = getOfflineStorage();

  // Detect conflicts
  const detection = conflictResolver.detectConflicts(
    {
      id: entryId,
      collection,
      data: localData,
      localVersion: localData._version || 1,
      updatedAt: localData._updatedAt || Date.now(),
    } as any,
    serverData
  );

  if (detection.hasConflict) {
    // Auto-resolve using default strategy
    const resolution = conflictResolver.resolveConflict(
      {
        id: entryId,
        collection,
        data: localData,
        localVersion: localData._version || 1,
        updatedAt: localData._updatedAt || Date.now(),
      } as any,
      serverData,
      conflictResolver.getDefaultStrategy(collection)
    );

    if (resolution.resolved) {
      // Store resolved data
      await storage.storeData(collection, resolution.data, {
        id: entryId,
        isDirty: false,
      });
    } else {
      // Manual resolution needed
      console.warn('Manual resolution required for:', resolution.manualFields);
    }
  }
}

/**
 * Example: Caching API responses
 */
export async function cacheApiResponse(url: string, response: Response) {
  const storage = getOfflineStorage();
  await storage.storeCache(url, response, { ttl: 5 * 60 * 1000 }); // 5 minutes
}

/**
 * Example: Getting cached API response
 */
export async function getCachedApiResponse(url: string): Promise<Response | null> {
  const storage = getOfflineStorage();
  return await storage.getCache(url);
}