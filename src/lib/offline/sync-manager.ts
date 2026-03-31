/**
 * 离线同步管理器
 * @module lib/offline/sync-manager
 * @description 管理离线数据同步的核心逻辑
 */

import { create } from 'zustand';
import {
  type PendingOperation,
  type SyncResult,
  type SyncError,
  type SyncConfig,
  type NetworkStatus,
  type OfflineEntityType,
  DEFAULT_SYNC_CONFIG,
  OFFLINE_ENTITIES,
} from './types';
import {
  getPendingOperations,
  deletePendingOperation,
  updatePendingOperation,
  getPendingOperationsCount,
  saveNetworkStatus,
  getNetworkStatus,
  generateId,
} from './offline-store';

/**
 * 同步管理器状态
 */
interface SyncManagerState {
  /** 是否在线 */
  isOnline: boolean;
  /** 是否正在同步 */
  isSyncing: boolean;
  /** 待同步操作数量 */
  pendingCount: number;
  /** 最后同步时间 */
  lastSyncAt: Date | null;
  /** 最后同步结果 */
  lastSyncResult: SyncResult | null;
  /** 同步配置 */
  config: SyncConfig;
  /** 同步间隔定时器 */
  syncInterval: NodeJS.Timeout | null;
  /** 网络状态 */
  networkStatus: NetworkStatus;

  // Actions
  /** 设置在线状态 */
  setOnline: (isOnline: boolean) => void;
  /** 开始同步 */
  startSync: () => Promise<SyncResult>;
  /** 添加操作到队列 */
  addToQueue: (operation: Omit<PendingOperation, 'id' | 'createdAt' | 'retryCount' | 'status'>) => Promise<string>;
  /** 处理操作 */
  processOperation: (operation: PendingOperation) => Promise<boolean>;
  /** 重试失败的操作 */
  retryFailed: () => Promise<void>;
  /** 清空队列 */
  clearQueue: () => Promise<void>;
  /** 更新配置 */
  updateConfig: (config: Partial<SyncConfig>) => void;
  /** 启动自动同步 */
  startAutoSync: () => void;
  /** 停止自动同步 */
  stopAutoSync: () => void;
  /** 刷新待处理数量 */
  refreshPendingCount: () => Promise<void>;
}

/**
 * 模拟 API 调用（实际项目中替换为真实 API）
 */
async function syncWithServer(operation: PendingOperation): Promise<{ success: boolean; error?: string }> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  // 模拟 90% 成功率
  if (Math.random() > 0.1) {
    return { success: true };
  }
  
  return { success: false, error: 'Network error' };
}

/**
 * 同步管理器 Store
 */
export const useSyncManager = create<SyncManagerState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  lastSyncResult: null,
  config: DEFAULT_SYNC_CONFIG,
  syncInterval: null,
  networkStatus: {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  },

  setOnline: (isOnline) => {
    const wasOffline = !get().isOnline && isOnline;
    
    set((state) => ({
      isOnline,
      networkStatus: {
        ...state.networkStatus,
        isOnline,
        lastOnlineAt: isOnline ? new Date() : state.networkStatus.lastOnlineAt,
        lastOfflineAt: !isOnline ? new Date() : state.networkStatus.lastOfflineAt,
      },
    }));

    // 保存网络状态（忽略错误，例如 IndexedDB 不可用时）
    saveNetworkStatus(get().networkStatus).catch(() => {});

    // 如果从离线恢复到在线，自动开始同步
    if (wasOffline && get().config.offlineEnabled) {
      get().startSync();
    }
  },

  startSync: async () => {
    const { isOnline, isSyncing, config } = get();
    
    if (!isOnline || isSyncing) {
      return {
        successCount: 0,
        failedCount: 0,
        conflictCount: 0,
        errors: [],
        duration: 0,
      };
    }

    set({ isSyncing: true });
    const startTime = Date.now();

    const result: SyncResult = {
      successCount: 0,
      failedCount: 0,
      conflictCount: 0,
      errors: [],
      duration: 0,
    };

    try {
      // 获取待同步操作
      const operations = await getPendingOperations('pending');
      
      // 批量处理
      for (let i = 0; i < operations.length; i += config.batchSize) {
        const batch = operations.slice(i, i + config.batchSize);
        
        for (const operation of batch) {
          try {
            // 更新状态为 syncing
            await updatePendingOperation({ ...operation, status: 'syncing' });
            
            const success = await get().processOperation(operation);
            
            if (success) {
              result.successCount++;
              await deletePendingOperation(operation.id);
            } else {
              result.failedCount++;
              
              // 检查是否需要重试
              if (operation.retryCount < config.maxRetryCount) {
                await updatePendingOperation({
                  ...operation,
                  status: 'pending',
                  retryCount: operation.retryCount + 1,
                });
              } else {
                await updatePendingOperation({
                  ...operation,
                  status: 'failed',
                  lastError: 'Max retry count exceeded',
                });
              }
            }
          } catch (_error) {
            result.failedCount++;
            result.errors.push({
              operationId: operation.id,
              type: 'unknown',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
            });
          }
        }
      }

      result.duration = Date.now() - startTime;
      
      set({
        isSyncing: false,
        lastSyncAt: new Date(),
        lastSyncResult: result,
      });

      // 刷新待处理数量
      await get().refreshPendingCount();

      return result;
    } catch (_error) {
      result.errors.push({
        operationId: '',
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Sync failed',
        timestamp: new Date(),
      });

      set({ isSyncing: false, lastSyncResult: result });
      return result;
    }
  },

  addToQueue: async (operationData) => {
    const operation: PendingOperation = {
      id: generateId(),
      ...operationData,
      createdAt: new Date(),
      retryCount: 0,
      status: 'pending',
    };

    await (await import('./offline-store')).addPendingOperation(operation);
    
    set((state) => ({ pendingCount: state.pendingCount + 1 }));

    // 如果在线，尝试立即同步
    if (get().isOnline && get().config.offlineEnabled) {
      // 延迟同步，等待更多操作积累
      setTimeout(() => {
        if (!get().isSyncing) {
          get().startSync();
        }
      }, 1000);
    }

    return operation.id;
  },

  processOperation: async (operation) => {
    const { config } = get();

    try {
      const result = await syncWithServer(operation);
      
      if (result.success) {
        return true;
      }

      // 处理冲突
      if (result.error === 'Conflict') {
        if (config.conflictResolution === 'server-wins') {
          // 放弃本地更改
          return false;
        } else if (config.conflictResolution === 'client-wins') {
          // 强制覆盖服务器
          const forceResult = await syncWithServer({ ...operation, data: { ...operation.data, _force: true } });
          return forceResult.success;
        }
        // manual 需要手动处理
        return false;
      }

      return false;
    } catch {
      return false;
    }
  },

  retryFailed: async () => {
    const failedOps = await getPendingOperations('failed');
    
    for (const op of failedOps) {
      await updatePendingOperation({
        ...op,
        status: 'pending',
        retryCount: 0,
        lastError: undefined,
      });
    }

    // 开始同步
    if (get().isOnline) {
      await get().startSync();
    }
  },

  clearQueue: async () => {
    const { clearPendingOperations } = await import('./offline-store');
    await clearPendingOperations();
    set({ pendingCount: 0 });
  },

  updateConfig: (newConfig) => {
    set((state) => ({
      config: { ...state.config, ...newConfig },
    }));

    // 如果改变了自动同步间隔，重启定时器
    if (newConfig.autoSyncInterval !== undefined) {
      get().stopAutoSync();
      get().startAutoSync();
    }
  },

  startAutoSync: () => {
    const { config, syncInterval } = get();
    
    // 先清除旧的定时器
    if (syncInterval) {
      clearInterval(syncInterval);
    }

    // 设置新的定时器
    const interval = setInterval(() => {
      if (get().isOnline && !get().isSyncing) {
        get().startSync();
      }
    }, config.autoSyncInterval);

    set({ syncInterval: interval });
  },

  stopAutoSync: () => {
    const { syncInterval } = get();
    if (syncInterval) {
      clearInterval(syncInterval);
      set({ syncInterval: null });
    }
  },

  refreshPendingCount: async () => {
    const count = await getPendingOperationsCount();
    set({ pendingCount: count });
  },
}));

// ============================================================================
// 初始化网络监听
// ============================================================================

/**
 * 初始化网络状态监听
 */
export function initNetworkListener(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => {
    useSyncManager.getState().setOnline(true);
  };

  const handleOffline = () => {
    useSyncManager.getState().setOnline(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // 初始化网络状态
  useSyncManager.getState().setOnline(navigator.onLine);

  // 恢复网络状态（忽略错误）
  getNetworkStatus().then((status) => {
    if (status) {
      useSyncManager.setState({ networkStatus: status });
    }
  }).catch(() => {});

  // 刷新待处理数量（忽略错误）
  useSyncManager.getState().refreshPendingCount().catch(() => {});

  // 返回清理函数
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * 获取同步状态摘要
 */
export function getSyncSummary(): {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
} {
  const state = useSyncManager.getState();
  return {
    isOnline: state.isOnline,
    isSyncing: state.isSyncing,
    pendingCount: state.pendingCount,
    lastSyncAt: state.lastSyncAt,
  };
}

/**
 * 创建待同步操作
 */
export async function createSyncOperation(
  type: PendingOperation['type'],
  entityType: OfflineEntityType,
  entityId: string,
  data: Record<string, unknown>
): Promise<string> {
  return useSyncManager.getState().addToQueue({
    type,
    entityType,
    entityId,
    data,
  });
}

export default useSyncManager;
