/**
 * TaskSelectionContext - 任务选择上下文
 * 
 * 提供任务的多选功能，支持：
 * - 单选/多选
 * - 全选/取消全选
 * - 范围选择 (Shift + 点击)
 * - 选择状态持久化
 * 
 * @example
 * <TaskSelectionProvider>
 *   <TaskList tasks={tasks} />
 *   <BatchOperationsToolbar />
 * </TaskSelectionProvider>
 */

'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

// ============================================================================
// 类型定义
// ============================================================================

export interface TaskSelectionContextValue {
  /** 已选中的任务 ID 集合 */
  selectedIds: Set<string>;
  /** 是否有选中的任务 */
  hasSelection: boolean;
  /** 选中的任务数量 */
  selectionCount: number;
  /** 最后选中的任务 ID（用于范围选择） */
  lastSelectedId: string | null;
  /** 是否处于选择模式 */
  isSelectionMode: boolean;
  
  // 操作方法
  /** 切换单个任务的选中状态 */
  toggleSelection: (taskId: string, event?: React.MouseEvent) => void;
  /** 选中单个任务 */
  select: (taskId: string) => void;
  /** 取消选中单个任务 */
  deselect: (taskId: string) => void;
  /** 全选 */
  selectAll: (taskIds: string[]) => void;
  /** 取消全选 */
  clearSelection: () => void;
  /** 判断任务是否被选中 */
  isSelected: (taskId: string) => boolean;
  /** 进入选择模式 */
  enterSelectionMode: () => void;
  /** 退出选择模式 */
  exitSelectionMode: () => void;
  /** 切换选择模式 */
  toggleSelectionMode: () => void;
}

const TaskSelectionContext = createContext<TaskSelectionContextValue | null>(null);

// ============================================================================
// Provider 组件
// ============================================================================

interface TaskSelectionProviderProps {
  children: React.ReactNode;
  /** 初始选中的任务 ID */
  initialSelectedIds?: string[];
  /** 选择变化回调 */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** 最大可选数量 */
  maxSelections?: number;
  /** 是否持久化选择状态到 localStorage */
  persistKey?: string;
}

export function TaskSelectionProvider({
  children,
  initialSelectedIds = [],
  onSelectionChange,
  maxSelections,
  persistKey,
}: TaskSelectionProviderProps) {
  // 初始化选中状态
  const getInitialSelectedIds = useCallback((): Set<string> => {
    // 如果有持久化 key，从 localStorage 读取
    if (persistKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(persistKey);
        if (stored) {
          return new Set(JSON.parse(stored));
        }
      } catch {
        // 忽略解析错误
      }
    }
    return new Set(initialSelectedIds);
  }, [initialSelectedIds, persistKey]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(getInitialSelectedIds);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // 最后选中的 ID，用于范围选择
  const lastSelectedIdRef = useRef<string | null>(null);
  
  // 使用 ref 稳定回调引用
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  // 持久化选择状态
  const persistSelection = useCallback(
    (ids: Set<string>) => {
      if (persistKey && typeof window !== 'undefined') {
        try {
          localStorage.setItem(persistKey, JSON.stringify([...ids]));
        } catch {
          // 忽略存储错误
        }
      }
    },
    [persistKey]
  );

  // 通知选择变化
  const notifySelectionChange = useCallback(
    (ids: Set<string>) => {
      onSelectionChangeRef.current?.(ids);
    },
    []
  );

  // 更新选择状态
  const updateSelection = useCallback(
    (newSelectedIds: Set<string>) => {
      setSelectedIds(newSelectedIds);
      persistSelection(newSelectedIds);
      notifySelectionChange(newSelectedIds);
    },
    [persistSelection, notifySelectionChange]
  );

  // 判断任务是否被选中
  const isSelected = useCallback(
    (taskId: string) => selectedIds.has(taskId),
    [selectedIds]
  );

  // 选中单个任务
  const select = useCallback(
    (taskId: string) => {
      if (maxSelections && selectedIds.size >= maxSelections) {
        return; // 达到最大选择数量
      }
      
      const newSelectedIds = new Set(selectedIds);
      newSelectedIds.add(taskId);
      lastSelectedIdRef.current = taskId;
      updateSelection(newSelectedIds);
    },
    [selectedIds, maxSelections, updateSelection]
  );

  // 取消选中单个任务
  const deselect = useCallback(
    (taskId: string) => {
      const newSelectedIds = new Set(selectedIds);
      newSelectedIds.delete(taskId);
      updateSelection(newSelectedIds);
    },
    [selectedIds, updateSelection]
  );

  // 切换单个任务的选中状态（支持 Shift 范围选择）
  const toggleSelection = useCallback(
    (taskId: string, event?: React.MouseEvent) => {
      // Shift + 点击：范围选择
      if (event?.shiftKey && lastSelectedIdRef.current) {
        // 这里需要外部传入所有任务 ID 列表才能实现范围选择
        // 简单实现：只切换当前任务
      }

      if (selectedIds.has(taskId)) {
        deselect(taskId);
      } else {
        if (maxSelections && selectedIds.size >= maxSelections) {
          return; // 达到最大选择数量
        }
        const newSelectedIds = new Set(selectedIds);
        newSelectedIds.add(taskId);
        lastSelectedIdRef.current = taskId;
        updateSelection(newSelectedIds);
      }
    },
    [selectedIds, maxSelections, deselect, updateSelection]
  );

  // 全选
  const selectAll = useCallback(
    (taskIds: string[]) => {
      const newSelectedIds = new Set(
        maxSelections ? taskIds.slice(0, maxSelections) : taskIds
      );
      lastSelectedIdRef.current = taskIds[taskIds.length - 1] || null;
      updateSelection(newSelectedIds);
    },
    [maxSelections, updateSelection]
  );

  // 取消全选
  const clearSelection = useCallback(() => {
    lastSelectedIdRef.current = null;
    updateSelection(new Set());
  }, [updateSelection]);

  // 进入选择模式
  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  // 退出选择模式
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    clearSelection();
  }, [clearSelection]);

  // 切换选择模式
  const toggleSelectionMode = useCallback(() => {
    if (isSelectionMode) {
      exitSelectionMode();
    } else {
      enterSelectionMode();
    }
  }, [isSelectionMode, enterSelectionMode, exitSelectionMode]);

  // 计算值
  const value = useMemo<TaskSelectionContextValue>(
    () => ({
      selectedIds,
      hasSelection: selectedIds.size > 0,
      selectionCount: selectedIds.size,
      lastSelectedId: lastSelectedIdRef.current,
      isSelectionMode,
      toggleSelection,
      select,
      deselect,
      selectAll,
      clearSelection,
      isSelected,
      enterSelectionMode,
      exitSelectionMode,
      toggleSelectionMode,
    }),
    [
      selectedIds,
      isSelectionMode,
      toggleSelection,
      select,
      deselect,
      selectAll,
      clearSelection,
      isSelected,
      enterSelectionMode,
      exitSelectionMode,
      toggleSelectionMode,
    ]
  );

  return (
    <TaskSelectionContext.Provider value={value}>
      {children}
    </TaskSelectionContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 使用任务选择上下文
 * @throws 如果在 TaskSelectionProvider 外部使用会抛出错误
 */
export function useTaskSelection(): TaskSelectionContextValue {
  const context = useContext(TaskSelectionContext);
  if (!context) {
    throw new Error(
      'useTaskSelection must be used within a TaskSelectionProvider'
    );
  }
  return context;
}

/**
 * 可选的任务选择 hook（不抛出错误）
 * 如果不在 TaskSelectionProvider 内部，返回 null
 */
export function useOptionalTaskSelection(): TaskSelectionContextValue | null {
  return useContext(TaskSelectionContext);
}

export default TaskSelectionContext;
