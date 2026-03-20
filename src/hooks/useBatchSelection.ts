/**
 * @fileoverview 批量选择 Hook
 * @description 管理多选状态的核心 Hook
 * 
 * 功能:
 * - 选中/取消选中项目
 * - 全选/取消全选
 * - 范围选择 (Shift+Click)
 * - 批量操作回调
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

export interface UseBatchSelectionOptions<T> {
  /** 可选项目列表 */
  items: T[];
  /** 获取项目唯一标识的函数 */
  getItemId: (item: T) => string;
  /** 最大可选数量 */
  maxSelections?: number;
  /** 选择变化回调 */
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export interface UseBatchSelectionReturn<T> {
  /** 当前选中的 ID 集合 */
  selectedIds: Set<string>;
  /** 选中的项目列表 */
  selectedItems: T[];
  /** 是否处于选择模式 */
  isSelectionMode: boolean;
  /** 是否全选 */
  isAllSelected: boolean;
  /** 是否部分选中 */
  isIndeterminate: boolean;
  /** 选中数量 */
  selectionCount: number;
  /** 切换选择模式 */
  toggleSelectionMode: () => void;
  /** 进入选择模式 */
  enterSelectionMode: () => void;
  /** 退出选择模式 */
  exitSelectionMode: () => void;
  /** 切换单个项目选中状态 */
  toggleItem: (itemId: string, event?: React.MouseEvent) => void;
  /** 选中单个项目 */
  selectItem: (itemId: string) => void;
  /** 取消选中单个项目 */
  deselectItem: (itemId: string) => void;
  /** 全选 */
  selectAll: () => void;
  /** 取消全选 */
  deselectAll: () => void;
  /** 切换全选 */
  toggleSelectAll: () => void;
  /** 检查项目是否选中 */
  isSelected: (itemId: string) => boolean;
  /** 清空选择并退出选择模式 */
  clearSelection: () => void;
  /** 执行批量操作 */
  performBatchAction: (action: (items: T[]) => Promise<void> | void) => Promise<void>;
}

export function useBatchSelection<T>({
  items,
  getItemId,
  maxSelections,
  onSelectionChange,
}: UseBatchSelectionOptions<T>): UseBatchSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [firstSelectedId, setFirstSelectedId] = useState<string | null>(null);

  // Use a ref to track firstSelectedId to avoid stale closure issues
  const firstSelectedIdRef = useRef<string | null>(null);

  // Sync ref with state
  useEffect(() => {
    firstSelectedIdRef.current = firstSelectedId;
  }, [firstSelectedId]);

  // 获取选中的项目列表
  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(getItemId(item)));
  }, [items, selectedIds, getItemId]);

  // 计算选择状态
  const selectionCount = selectedIds.size;
  const isAllSelected = items.length > 0 && selectionCount === items.length;
  const isIndeterminate = selectionCount > 0 && selectionCount < items.length;

  // 通知选择变化
  const notifyChange = useCallback(
    (newIds: Set<string>) => {
      onSelectionChange?.(newIds);
    },
    [onSelectionChange]
  );

  // 切换选择模式
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        // 退出选择模式时清空选择
        setSelectedIds(new Set());
        notifyChange(new Set());
      }
      return !prev;
    });
  }, [notifyChange]);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setLastSelectedId(null);
    setFirstSelectedId(null);
    notifyChange(new Set());
  }, [notifyChange]);

  // 切换单个项目
  const toggleItem = useCallback(
    (itemId: string, event?: React.MouseEvent) => {
      // Shift+Click 范围选择
      if (event?.shiftKey && firstSelectedIdRef.current && firstSelectedIdRef.current !== itemId) {
        const itemIds = items.map(getItemId);
        const firstIndex = itemIds.indexOf(firstSelectedIdRef.current);
        const currentIndex = itemIds.indexOf(itemId);

        if (firstIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(firstIndex, currentIndex);
          const end = Math.max(firstIndex, currentIndex);
          const rangeIds = itemIds.slice(start, end + 1);

          setSelectedIds((prev) => {
            const newIds = new Set(prev);
            // 检查范围内的所有项是否都已选中
            const allInRangeSelected = rangeIds.every(id => prev.has(id));

            // 如果范围内所有项都已选中，取消选中；否则，选中范围
            if (allInRangeSelected) {
              rangeIds.forEach((id) => newIds.delete(id));
            } else {
              // 检查最大选择数
              if (!maxSelections || prev.size + (rangeIds.length - rangeIds.filter(id => prev.has(id)).length) <= maxSelections) {
                rangeIds.forEach((id) => newIds.add(id));
              }
            }

            // 如果取消选中范围且 firstSelectedId 在范围内，重置它
            if (allInRangeSelected && rangeIds.includes(firstSelectedIdRef.current!)) {
              setFirstSelectedId(null);
              firstSelectedIdRef.current = null;
            }

            setLastSelectedId(itemId);
            notifyChange(newIds);
            return newIds;
          });

          return;
        }
      }

      // 普通切换
      setSelectedIds((prev) => {
        const newIds = new Set(prev);

        if (newIds.has(itemId)) {
          newIds.delete(itemId);
          // 如果删除的是第一个选中的项目，需要更新 firstSelectedId
          if (itemId === firstSelectedIdRef.current) {
            setFirstSelectedId(null);
            firstSelectedIdRef.current = null;
          }
        } else {
          // 检查最大选择数
          if (!maxSelections || newIds.size < maxSelections) {
            newIds.add(itemId);
            // 如果这是第一个选中的项目，记录它
            if (!firstSelectedIdRef.current) {
              setFirstSelectedId(itemId);
              firstSelectedIdRef.current = itemId;
            }
          }
        }

        setLastSelectedId(itemId);
        notifyChange(newIds);
        return newIds;
      });
    },
    [items, getItemId, maxSelections, notifyChange]
  );

  const selectItem = useCallback(
    (itemId: string) => {
      setSelectedIds((prev) => {
        if (prev.has(itemId)) return prev;

        if (maxSelections && prev.size >= maxSelections) return prev;

        const newIds = new Set(prev);
        newIds.add(itemId);
        setLastSelectedId(itemId);

        // Update firstSelectedId based on the actual previous state
        setFirstSelectedId((prevFirst) => prevFirst || itemId);

        notifyChange(newIds);
        return newIds;
      });
    },
    [maxSelections, notifyChange]
  );

  const deselectItem = useCallback(
    (itemId: string) => {
      setSelectedIds((prev) => {
        if (!prev.has(itemId)) return prev;

        const newIds = new Set(prev);
        newIds.delete(itemId);
        notifyChange(newIds);
        return newIds;
      });
    },
    [notifyChange]
  );

  // 全选
  const selectAll = useCallback(() => {
    const allIds = new Set<string>();
    const limit = maxSelections ?? items.length;

    items.slice(0, limit).forEach((item) => {
      allIds.add(getItemId(item));
    });

    setFirstSelectedId(items.length > 0 ? getItemId(items[0]) : null);
    setSelectedIds(allIds);
    notifyChange(allIds);
  }, [items, getItemId, maxSelections, notifyChange]);

  // 取消全选
  const deselectAll = useCallback(() => {
    setFirstSelectedId(null);
    setSelectedIds(new Set());
    notifyChange(new Set());
  }, [notifyChange]);

  // 切换全选
  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [isAllSelected, selectAll, deselectAll]);

  // 检查是否选中
  const isSelected = useCallback(
    (itemId: string) => selectedIds.has(itemId),
    [selectedIds]
  );

  // 清空选择
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setLastSelectedId(null);
    setFirstSelectedId(null);
    notifyChange(new Set());
  }, [notifyChange]);

  // 执行批量操作
  const performBatchAction = useCallback(
    async (action: (items: T[]) => Promise<void> | void) => {
      if (selectedItems.length === 0) return;

      try {
        await action(selectedItems);
        // 操作成功后清空选择
        clearSelection();
      } catch (error) {
        console.error('Batch action failed:', error);
        throw error;
      }
    },
    [selectedItems, clearSelection]
  );

  return {
    selectedIds,
    selectedItems,
    isSelectionMode,
    isAllSelected,
    isIndeterminate,
    selectionCount,
    toggleSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
    toggleItem,
    selectItem,
    deselectItem,
    selectAll,
    deselectAll,
    toggleSelectAll,
    isSelected,
    clearSelection,
    performBatchAction,
  };
}
