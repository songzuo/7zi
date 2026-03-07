/**
 * useTaskSelectionActions - 任务选择操作 Hook
 * 
 * 提供选择操作的快捷方法，简化选择功能的集成
 * 
 * @example
 * const { selectedArray, handleSelectAll, handleClearSelection } = useTaskSelectionActions(tasks);
 */

import { useMemo, useCallback } from 'react';
import { useTaskSelection } from '@/contexts/TaskSelectionContext';
import { Task } from '@/lib/tasks/types';

interface UseTaskSelectionActionsReturn {
  /** 已选中的任务 ID 数组 */
  selectedArray: string[];
  /** 是否有选中的任务 */
  hasSelection: boolean;
  /** 选中的任务数量 */
  selectionCount: number;
  /** 是否处于选择模式 */
  isSelectionMode: boolean;
  
  // 操作方法
  /** 全选所有任务 */
  handleSelectAll: (tasks: Task[]) => void;
  /** 清除所有选择 */
  handleClearSelection: () => void;
  /** 切换选择模式 */
  handleToggleSelectionMode: () => void;
  /** 进入选择模式 */
  handleEnterSelectionMode: () => void;
  /** 退出选择模式 */
  handleExitSelectionMode: () => void;
  /** 批量操作完成后的回调 */
  handleBatchOperationComplete: () => void;
}

export function useTaskSelectionActions(): UseTaskSelectionActionsReturn {
  const {
    selectedIds,
    hasSelection,
    selectionCount,
    isSelectionMode,
    selectAll,
    clearSelection,
    toggleSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
  } = useTaskSelection();

  // 将 Set 转换为数组
  const selectedArray = useMemo(
    () => Array.from(selectedIds),
    [selectedIds]
  );

  // 全选所有任务
  const handleSelectAll = useCallback(
    (tasks: Task[]) => {
      const taskIds = tasks.map((t) => t.id);
      selectAll(taskIds);
    },
    [selectAll]
  );

  // 清除所有选择
  const handleClearSelection = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // 切换选择模式
  const handleToggleSelectionMode = useCallback(() => {
    toggleSelectionMode();
  }, [toggleSelectionMode]);

  // 进入选择模式
  const handleEnterSelectionMode = useCallback(() => {
    enterSelectionMode();
  }, [enterSelectionMode]);

  // 退出选择模式
  const handleExitSelectionMode = useCallback(() => {
    exitSelectionMode();
  }, [exitSelectionMode]);

  // 批量操作完成后的回调
  const handleBatchOperationComplete = useCallback(() => {
    // 操作完成后可以选择是否退出选择模式
    // 这里我们只清除选择，保持选择模式
    clearSelection();
  }, [clearSelection]);

  return {
    selectedArray,
    hasSelection,
    selectionCount,
    isSelectionMode,
    handleSelectAll,
    handleClearSelection,
    handleToggleSelectionMode,
    handleEnterSelectionMode,
    handleExitSelectionMode,
    handleBatchOperationComplete,
  };
}

export default useTaskSelectionActions;