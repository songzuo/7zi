/**
 * 批量操作 Hook
 * 提供任务的批量操作功能
 * 
 * @performance
 * - 使用 useRef 稳定回调引用，避免不必要的重渲染
 * - 支持 AbortController 取消请求
 * - 内置请求去重
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { TaskPriority, TaskStatus } from '@/lib/tasks/types';

// 批量操作类型
export type BatchOperationType =
  | 'update-status'
  | 'update-priority'
  | 'assign'
  | 'delete'
  | 'add-tags'
  | 'remove-tags'
  | 'set-due-date';

// 批量操作结果
export interface BatchOperationResult {
  success: boolean;
  operation: BatchOperationType;
  affected: number;
  ids: string[];
  error?: string;
}

// 批量操作选项
interface BatchOperationOptions {
  onSuccess?: (result: BatchOperationResult) => void;
  onError?: (error: Error) => void;
}

// Hook 返回类型
interface UseBatchOperationsReturn {
  // 状态
  loading: boolean;
  error: string | null;
  lastResult: BatchOperationResult | null;

  // 操作方法
  updateStatus: (ids: string[], status: TaskStatus) => Promise<BatchOperationResult>;
  updatePriority: (ids: string[], priority: TaskPriority) => Promise<BatchOperationResult>;
  assign: (ids: string[], assignee: string | null) => Promise<BatchOperationResult>;
  deleteTasks: (ids: string[]) => Promise<BatchOperationResult>;
  addTags: (ids: string[], tagIds: string[]) => Promise<BatchOperationResult>;
  removeTags: (ids: string[], tagIds: string[]) => Promise<BatchOperationResult>;
  setDueDate: (ids: string[], dueDate: string | null) => Promise<BatchOperationResult>;

  // 通用操作方法
  executeOperation: (
    ids: string[],
    operation: BatchOperationType,
    payload: unknown
  ) => Promise<BatchOperationResult>;

  // 重置状态
  reset: () => void;
  
  // 取消当前请求
  cancel: () => void;
}

/**
 * 批量操作 Hook
 */
export function useBatchOperations(
  options: BatchOperationOptions = {}
): UseBatchOperationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<BatchOperationResult | null>(null);
  
  // 使用 ref 稳定回调引用，避免 options 变化导致 useCallback 失效
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  // 请求去重：跟踪正在进行的请求
  const pendingRequestsRef = useRef<Map<string, Promise<BatchOperationResult>>>(new Map());
  
  // AbortController 用于取消请求
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 组件卸载时取消所有请求
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // 生成请求唯一键（用于去重）
  const getRequestKey = (ids: string[], operation: BatchOperationType): string => {
    const sortedIds = [...ids].sort().join(',');
    return `${operation}:${sortedIds}`;
  };

  // 通用操作方法
  const executeOperation = useCallback(
    async (
      ids: string[],
      operation: BatchOperationType,
      payload: unknown
    ): Promise<BatchOperationResult> => {
      // 请求去重：如果相同请求正在进行中，返回该 Promise
      const requestKey = getRequestKey(ids, operation);
      const pendingRequest = pendingRequestsRef.current.get(requestKey);
      if (pendingRequest) {
        return pendingRequest;
      }
      
      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      setLoading(true);
      setError(null);

      const requestPromise = (async (): Promise<BatchOperationResult> => {
        try {
          const response = await fetch('/api/tasks/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, operation, payload }),
            signal,
          });

          // 请求被取消
          if (signal.aborted) {
            const cancelledResult: BatchOperationResult = {
              success: false,
              operation,
              affected: 0,
              ids,
              error: 'Request cancelled',
            };
            return cancelledResult;
          }

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Operation failed');
          }

          setLastResult(result);
          optionsRef.current.onSuccess?.(result);
          return result;
        } catch (err) {
          // 忽略取消错误
          if (err instanceof Error && err.name === 'AbortError') {
            const cancelledResult: BatchOperationResult = {
              success: false,
              operation,
              affected: 0,
              ids,
              error: 'Request cancelled',
            };
            return cancelledResult;
          }
          
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          const errorResult: BatchOperationResult = {
            success: false,
            operation,
            affected: 0,
            ids,
            error: errorMessage,
          };
          setLastResult(errorResult);
          optionsRef.current.onError?.(err instanceof Error ? err : new Error(errorMessage));
          return errorResult;
        } finally {
          setLoading(false);
          // 请求完成后从 pending 列表移除
          pendingRequestsRef.current.delete(requestKey);
        }
      })();

      // 将请求添加到 pending 列表
      pendingRequestsRef.current.set(requestKey, requestPromise);
      
      return requestPromise;
    },
    [] // 移除 options 依赖，使用 ref 替代
  );

  // 更新状态
  const updateStatus = useCallback(
    (ids: string[], status: TaskStatus) =>
      executeOperation(ids, 'update-status', { status }),
    [executeOperation]
  );

  // 更新优先级
  const updatePriority = useCallback(
    (ids: string[], priority: TaskPriority) =>
      executeOperation(ids, 'update-priority', { priority }),
    [executeOperation]
  );

  // 分配任务
  const assign = useCallback(
    (ids: string[], assignee: string | null) =>
      executeOperation(ids, 'assign', { assignee }),
    [executeOperation]
  );

  // 删除任务
  const deleteTasks = useCallback(
    (ids: string[]) => executeOperation(ids, 'delete', {}),
    [executeOperation]
  );

  // 添加标签
  const addTags = useCallback(
    (ids: string[], tagIds: string[]) =>
      executeOperation(ids, 'add-tags', { tagIds }),
    [executeOperation]
  );

  // 移除标签
  const removeTags = useCallback(
    (ids: string[], tagIds: string[]) =>
      executeOperation(ids, 'remove-tags', { tagIds }),
    [executeOperation]
  );

  // 设置截止日期
  const setDueDate = useCallback(
    (ids: string[], dueDate: string | null) =>
      executeOperation(ids, 'set-due-date', { dueDate }),
    [executeOperation]
  );

  // 重置状态
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setLastResult(null);
  }, []);

  // 取消当前请求
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    pendingRequestsRef.current.clear();
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    lastResult,
    updateStatus,
    updatePriority,
    assign,
    deleteTasks,
    addTags,
    removeTags,
    setDueDate,
    executeOperation,
    reset,
    cancel,
  };
}

export default useBatchOperations;
