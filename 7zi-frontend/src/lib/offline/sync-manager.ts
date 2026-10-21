/**
 * Sync Manager Module
 * Implements intelligent background sync with multiple triggers and incremental updates
 */

import { OfflineStorage, SyncQueueItem, DataEntry, STORES } from './storage';
import { logger } from '@/lib/logger'
import { ConflictResolver, ResolutionStrategy, ConflictMeta } from './conflict-resolver';

// Sync state
export type SyncState = 'idle' | 'syncing' | 'error' | 'paused';

// Sync trigger types
export type SyncTrigger = 'manual' | 'network-online' | 'periodic' | 'app-focus' | 'data-change' | 'sw-ready';

// Sync result
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  duration: number;
  error?: string;
}

// Sync statistics
export interface SyncStats {
  lastSync: number | null;
  lastSyncSuccess: boolean;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalConflicts: number;
  resolvedConflicts: number;
}

// Sync configuration
export interface SyncConfig {
  enabled: boolean;
  interval: number;              // Sync interval in ms
  batchSize: number;             // Items per batch
  maxRetries: number;            // Max retry attempts
  retryDelay: number;            // Delay between retries in ms
  conflictResolution: ResolutionStrategy;
  triggers: SyncTrigger[];       // Enabled triggers
  autoResume: boolean;           // Auto-resume on network change
  throttlePeriod: number;        // Min time between syncs in ms
}

// Default config
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: true,
  interval: 5 * 60 * 1000,     // 5 minutes
  batchSize: 20,
  maxRetries: 3,
  retryDelay: 30 * 1000,       // 30 seconds
  conflictResolution: 'lww',
  triggers: ['network-online', 'periodic', 'app-focus', 'data-change', 'sw-ready'],
  autoResume: true,
  throttlePeriod: 10 * 1000,   // 10 seconds
};

/**
 * Sync Manager
 * Handles background synchronization with intelligent triggers
 */
export class SyncManager {
  private storage: OfflineStorage;
  private conflictResolver: ConflictResolver;
  private config: SyncConfig;
  
  // State
  private state: SyncState = 'idle';
  private lastSyncTime: number = 0;
  private stats: SyncStats = {
    lastSync: null,
    lastSyncSuccess: true,
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    totalConflicts: 0,
    resolvedConflicts: 0,
  };
  
  // Timers and listeners
  private periodicTimer: number | null = null;
  private syncPromise: Promise<SyncResult> | null = null;
  private listeners: Map<string, (state: SyncState) => void> = new Map();

  constructor(
    storage?: OfflineStorage,
    config?: Partial<SyncConfig>
  ) {
    this.storage = storage || new OfflineStorage();
    this.conflictResolver = new ConflictResolver();
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    
    this.setupTriggers();
  }

  /**
   * Setup sync triggers
   */
  private setupTriggers(): void {
    // Network online/offline
    if (this.config.triggers.includes('network-online')) {
      window.addEventListener('online', () => {
        if (this.config.autoResume) {
          this.triggerSync('network-online');
        }
      });
    }

    // App focus/visibility
    if (this.config.triggers.includes('app-focus')) {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.state === 'idle') {
          this.triggerSync('app-focus');
        }
      });
    }

    // Periodic sync
    if (this.config.triggers.includes('periodic')) {
      this.startPeriodicSync();
    }

    // Service worker ready
    if (this.config.triggers.includes('sw-ready')) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          this.triggerSync('sw-ready');
        });
      }
    }
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    this.stopPeriodicSync();
    this.periodicTimer = window.setInterval(() => {
      if (this.state === 'idle') {
        this.triggerSync('periodic');
      }
    }, this.config.interval);
  }

  /**
   * Stop periodic sync
   */
  private stopPeriodicSync(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  /**
   * Trigger sync from a specific trigger
   */
  async triggerSync(trigger: SyncTrigger): Promise<SyncResult> {
    // Check if sync is already in progress
    if (this.state === 'syncing') {
      // Return existing sync promise
      if (this.syncPromise) {
        return this.syncPromise;
      }
    }

    // Throttle syncs
    const now = Date.now();
    if (now - this.lastSyncTime < this.config.throttlePeriod) {
      logger.debug(`[SyncManager] Sync throttled, last sync ${now - this.lastSyncTime}ms ago`);
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        duration: 0,
        error: 'Throttled',
      };
    }

    // Check if enabled
    if (!this.config.enabled) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        duration: 0,
        error: 'Sync disabled',
      };
    }

    // Start sync
    this.setState('syncing');
    this.lastSyncTime = now;
    
    this.syncPromise = this.performSync(trigger);

    try {
      const result = await this.syncPromise;
      this.stats.totalSyncs++;
      this.stats.lastSync = now;
      
      if (result.success) {
        this.stats.successfulSyncs++;
        this.stats.lastSyncSuccess = true;
      } else {
        this.stats.failedSyncs++;
        this.stats.lastSyncSuccess = false;
      }

      this.stats.totalConflicts += result.conflicts;
      
      return result;
    } catch (error) {
      this.stats.failedSyncs++;
      this.stats.lastSyncSuccess = false;
      throw error;
    } finally {
      this.setState('idle');
      this.syncPromise = null;
    }
  }

  /**
   * Perform sync operation
   */
  private async performSync(trigger: SyncTrigger): Promise<SyncResult> {
    const startTime = Date.now();
    let synced = 0;
    let failed = 0;
    let conflicts = 0;
    let lastError: string | undefined;

    try {
      logger.debug(`[SyncManager] Starting sync (trigger: ${trigger})`);

      // Get pending sync items
      const items = await this.storage.getPendingSyncItems(this.config.batchSize);
      logger.debug(`[SyncManager] Found ${items.length} pending items`);

      // Process each batch
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        try {
          // Check retry limit
          if (item.retryCount >= this.config.maxRetries) {
            logger.warn(`[SyncManager] Item ${item.id} exceeded retry limit, skipping`);
            await this.storage.removeFromSyncQueue(item.id);
            failed++;
            continue;
          }

          // Sync item
          const result = await this.syncItem(item);
          
          if (result.success) {
            synced++;
            await this.storage.removeFromSyncQueue(item.id);
          } else {
            if (result.conflict) {
              conflicts++;
              this.stats.resolvedConflicts++;
            }
            failed++;
            await this.storage.updateSyncRetry(item.id, result.error || 'Unknown error');
            
            // Delay before next item
            if (this.config.retryDelay > 0) {
              await this.delay(this.config.retryDelay);
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          lastError = errorMsg;
          failed++;
          await this.storage.updateSyncRetry(item.id, errorMsg);
        }
      }

      // Fetch server updates (incremental sync)
      await this.fetchServerUpdates();

      const duration = Date.now() - startTime;
      logger.debug(`[SyncManager] Sync complete: ${synced} synced, ${failed} failed, ${conflicts} conflicts, ${duration}ms`);

      return {
        success: failed === 0,
        synced,
        failed,
        conflicts,
        duration,
        error: lastError,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[SyncManager] Sync failed:`, error);
      
      this.setState('error');
      
      return {
        success: false,
        synced,
        failed,
        conflicts,
        duration: Date.now() - startTime,
        error: errorMsg,
      };
    }
  }

  /**
   * Sync a single item
   */
  private async syncItem(item: SyncQueueItem): Promise<{
    success: boolean;
    conflict?: boolean;
    error?: string;
  }> {
    try {
      const localEntry = await this.storage.getData(item.collection, item.dataId);
      
      if (!localEntry) {
        // Item was deleted locally
        return { success: true };
      }

      // Convert to DataEntry format
      const entry = {
        id: item.dataId,
        data: localEntry,
        localVersion: localEntry._version || 1,
        serverVersion: localEntry._serverVersion,
        updatedAt: localEntry._updatedAt || Date.now(),
      } as DataEntry;

      // Send to server (simulated - replace with actual API call)
      const response = await this.sendToServer(item, localEntry);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const serverData = await response.json();

      // Check for conflicts
      if (serverData._conflict) {
        const detection = this.conflictResolver.detectConflicts(entry, serverData);
        
        if (detection.hasConflict) {
          // Record conflict
          const conflictMeta = this.conflictResolver.createConflictMeta(
            entry.id,
            item.collection,
            entry.data,
            serverData,
            entry.updatedAt,
            serverData._updatedAt || Date.now()
          );
          this.conflictResolver.recordConflict(conflictMeta);

          // Auto-resolve using configured strategy
          const resolution = this.conflictResolver.resolveConflict(
            entry,
            serverData,
            this.config.conflictResolution
          );

          if (!resolution.resolved) {
            // Manual resolution needed
            await this.storage.storeConflict(entry.id, serverData);
            return { success: false, conflict: true, error: 'Conflict requires manual resolution' };
          }

          // Update with resolved data
          await this.storage.markSynced(entry.id, serverData._version);
          return { success: true, conflict: true };
        }
      }

      // Mark as synced
      await this.storage.markSynced(entry.id, serverData._version);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send data to server (simulated - replace with actual API)
   */
  private async sendToServer(item: SyncQueueItem, data: any): Promise<Response> {
    // Simulate API call - replace with actual fetch
    const payload = {
      operation: item.operation,
      dataId: item.dataId,
      data: data,
      timestamp: item.timestamp,
    };

    // TODO: Replace with actual API endpoint
    return await fetch(`/api/sync/${item.collection}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Fetch server updates (incremental sync)
   */
  private async fetchServerUpdates(): Promise<void> {
    try {
      // Get last sync timestamp from metadata
      const lastSyncTimestamp = await this.storage.getMeta<number>('lastServerSync') || 0;

      // Fetch updates since last sync
      const response = await fetch(`/api/sync/updates?since=${lastSyncTimestamp}`);
      
      if (!response.ok) {
        logger.warn('[SyncManager] Failed to fetch server updates');
        return;
      }

      const updates = await response.json();
      
      // Process updates
      for (const update of updates) {
        try {
          await this.storage.storeData(
            update.collection,
            update.data,
            {
              id: update.dataId,
              serverVersion: update.version,
              isDirty: false,
            }
          );
        } catch (error) {
          logger.error('[SyncManager] Failed to store update:', error);
        }
      }

      // Update last sync timestamp
      await this.storage.setMeta('lastServerSync', Date.now());
    } catch (error) {
      logger.error('[SyncManager] Failed to fetch server updates:', error);
    }
  }

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<SyncResult> {
    return this.triggerSync('manual');
  }

  /**
   * Pause sync
   */
  pause(): void {
    this.config.enabled = false;
    this.stopPeriodicSync();
    this.setState('paused');
  }

  /**
   * Resume sync
   */
  resume(): void {
    this.config.enabled = true;
    this.startPeriodicSync();
    this.setState('idle');
    this.triggerSync('manual');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart periodic sync if interval changed
    if (config.interval !== undefined && this.config.triggers.includes('periodic')) {
      this.startPeriodicSync();
    }
  }

  /**
   * Get current state
   */
  getState(): SyncState {
    return this.state;
  }

  /**
   * Get sync statistics
   */
  getStats(): SyncStats {
    return { ...this.stats };
  }

  /**
   * Get configuration
   */
  getConfig(): SyncConfig {
    return { ...this.config };
  }

  /**
   * Add state change listener
   */
  addStateListener(id: string, callback: (state: SyncState) => void): void {
    this.listeners.set(id, callback);
  }

  /**
   * Remove state change listener
   */
  removeStateListener(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Get pending sync queue size
   */
  async getQueueSize(): Promise<number> {
    return this.storage.getSyncQueueSize();
  }

  /**
   * Clear sync queue
   */
  async clearQueue(): Promise<void> {
    // Get all items and remove them
    const items = await this.storage.getPendingSyncItems(1000);
    for (const item of items) {
      await this.storage.removeFromSyncQueue(item.id);
    }
  }

  /**
   * Set state and notify listeners
   */
  private setState(state: SyncState): void {
    this.state = state;
    this.listeners.forEach(callback => callback(state));
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopPeriodicSync();
    this.listeners.clear();
  }
}

// Singleton instance
let syncManagerInstance: SyncManager | null = null;

export function getSyncManager(config?: Partial<SyncConfig>): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager(undefined, config);
  }
  return syncManagerInstance;
}

export default SyncManager;
