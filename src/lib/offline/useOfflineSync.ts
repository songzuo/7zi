/**
 * 离线同步 Hook
 * @module lib/offline/useOfflineSync
 * @description React Hook 用于组件中使用离线同步功能
 */

import { useCallback, useEffect, useState } from 'react';
import { useSyncManager, createSyncOperation, initNetworkListener } from './sync-manager';
import { getPendingOperationsCount } from './offline-store';
import type { OfflineEntityType, PendingOperation, SyncResult, NetworkStatus } from './types';

/**
 * 离线同步 Hook 返回值
 */
interface UseOfflineSyncReturn {
  /** 是否在线 */
  isOnline: boolean;
  /** 是否正在同步 */
  isSyncing: boolean;
  /** 待同步数量 */
  pendingCount: number;
  /** 最后同步时间 */
  lastSyncAt: Date | null;
  /** 最后同步结果 */
  lastSyncResult: SyncResult | null;
  /** 手动触发同步 */
  syncNow: () => Promise<SyncResult>;
  /** 添加待同步操作 */
  queueOperation: (
    type: PendingOperation['type'],
    entityType: OfflineEntityType,
    entityId: string,
    data: Record<string, unknown>
  ) => Promise<string>;
  /** 重试失败的操作 */
  retryFailed: () => Promise<void>;
  /** 清空队列 */
  clearQueue: () => Promise<void>;
  /** 网络状态 */
  networkStatus: NetworkStatus;
}

/**
 * 离线同步 Hook
 */
export function useOfflineSync(): UseOfflineSyncReturn {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    lastSyncResult,
    startSync,
    addToQueue,
    retryFailed,
    clearQueue,
    networkStatus,
    refreshPendingCount,
  } = useSyncManager();

  const syncNow = useCallback(async () => {
    return startSync();
  }, [startSync]);

  const queueOperation = useCallback(
    async (
      type: PendingOperation['type'],
      entityType: OfflineEntityType,
      entityId: string,
      data: Record<string, unknown>
    ) => {
      return createSyncOperation(type, entityType, entityId, data);
    },
    []
  );

  // 初始化网络监听
  useEffect(() => {
    const cleanup = initNetworkListener();
    return cleanup;
  }, []);

  // 定期刷新待处理数量
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPendingCount();
    }, 60000); // 每分钟刷新一次

    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    lastSyncResult,
    syncNow,
    queueOperation,
    retryFailed,
    clearQueue,
    networkStatus,
  };
}

/**
 * 网络状态 Hook
 */
export function useNetworkStatus(): NetworkStatus {
  const { networkStatus } = useSyncManager();
  return networkStatus;
}

/**
 * 在线状态 Hook（简化版）
 */
export function useOnline(): boolean {
  const { isOnline } = useSyncManager();
  return isOnline;
}

/**
 * 待同步操作数量 Hook
 */
export function usePendingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 初始化
    getPendingOperationsCount().then(setCount).catch(() => {
      // Silently ignore errors
    });

    // 定期更新
    const interval = setInterval(() => {
      getPendingOperationsCount().then(setCount).catch(() => {
        // Silently ignore errors
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return count;
}

/**
 * 离线数据操作 Hook
 */
export function useOfflineData<T>(
  entityType: OfflineEntityType,
  entityId: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isOnline, queueOperation } = useOfflineSync();

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { getOfflineData } = await import('./offline-store');
        const result = await getOfflineData<T>(entityType, entityId);
        setData(result?.data ?? null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load data'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [entityType, entityId]);

  // 保存数据
  const saveData = useCallback(
    async (newData: T, operationType: PendingOperation['type'] = 'update') => {
      try {
        const { saveOfflineData } = await import('./offline-store');
        
        const offlineData = {
          id: entityId,
          entityType,
          data: newData,
          localVersion: Date.now(),
          updatedAt: new Date(),
          synced: false,
        };

        await saveOfflineData(entityType, offlineData);
        setData(newData);

        // 添加到同步队列
        if (isOnline) {
          await queueOperation(operationType, entityType, entityId, newData as Record<string, unknown>);
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to save data'));
        return false;
      }
    },
    [entityType, entityId, isOnline, queueOperation]
  );

  // 删除数据
  const deleteData = useCallback(async () => {
    try {
      const { deleteOfflineData } = await import('./offline-store');
      await deleteOfflineData(entityType, entityId);
      setData(null);

      // 添加删除操作到队列
      if (isOnline) {
        await queueOperation('delete', entityType, entityId, {});
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete data'));
      return false;
    }
  }, [entityType, entityId, isOnline, queueOperation]);

  return {
    data,
    loading,
    error,
    saveData,
    deleteData,
    isOnline,
  };
}

/**
 * 离线就绪 Hook
 * 检查应用是否准备好离线工作
 */
export function useOfflineReady(): {
  isReady: boolean;
  hasData: boolean;
  pendingOperations: number;
} {
  const [isReady, setIsReady] = useState(false);
  const [hasData, setHasData] = useState(false);
  const pendingOperations = usePendingCount();

  useEffect(() => {
    const checkReadiness = async () => {
      try {
        const { isIndexedDBAvailable, getAllOfflineData } = await import('./offline-store');
        
        const idbAvailable = isIndexedDBAvailable();
        
        if (idbAvailable) {
          // 检查是否有缓存的数据
          const tasks = await getAllOfflineData('tasks');
          const hasCachedData = tasks.length > 0;
          
          setHasData(hasCachedData);
          setIsReady(true);
        } else {
          setIsReady(false);
        }
      } catch {
        setIsReady(false);
      }
    };

    checkReadiness();
  }, []);

  return { isReady, hasData, pendingOperations };
}

export default useOfflineSync;