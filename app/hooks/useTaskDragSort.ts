/**
 * useTaskDragSort - 任务拖拽排序 Hook
 * 
 * 功能：
 * - 拖拽排序任务列表
 * - 本地存储持久化排序
 * - 支持重置排序
 * 
 * @example
 * const { tasks, handleDragEnd, resetSort, isSorted } = useTaskDragSort(initialTasks);
 */

import { useState, useCallback, useEffect, useMemo } from 'react';

export interface SortableTask {
  id: string | number;
  [key: string]: unknown;
}

interface TaskSortState {
  taskOrder: (string | number)[];
  lastUpdated: number;
}

const STORAGE_KEY = 'task-sort-order';
const STORAGE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天过期

/**
 * 从 localStorage 加载排序状态
 */
function loadSortState(): TaskSortState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const state: TaskSortState = JSON.parse(stored);
    
    // 检查是否过期
    if (Date.now() - state.lastUpdated > STORAGE_EXPIRY) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return state;
  } catch {
    return null;
  }
}

/**
 * 保存排序状态到 localStorage
 */
function saveSortState(taskOrder: (string | number)[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const state: TaskSortState = {
      taskOrder,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage 不可用时静默失败
  }
}

/**
 * 任务拖拽排序 Hook
 */
export function useTaskDragSort<T extends SortableTask>(
  initialTasks: T[]
): {
  tasks: T[];
  activeId: string | number | null;
  setActiveId: (id: string | number | null) => void;
  handleDragEnd: (activeId: string | number, overId: string | number) => void;
  resetSort: () => void;
  isSorted: boolean;
  moveTask: (fromIndex: number, toIndex: number) => void;
} {
  // 加载保存的排序
  const savedOrder = useMemo(() => loadSortState()?.taskOrder ?? null, []);
  
  // 根据 savedOrder 排序初始任务
  const sortedInitialTasks = useMemo(() => {
    if (!savedOrder || savedOrder.length === 0) {
      return initialTasks;
    }
    
    const orderMap = new Map(savedOrder.map((id, index) => [id, index]));
    
    return [...initialTasks].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? Infinity;
      const orderB = orderMap.get(b.id) ?? Infinity;
      return orderA - orderB;
    });
  }, [initialTasks, savedOrder]);
  
  const [tasks, setTasks] = useState<T[]>(sortedInitialTasks);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [isSorted, setIsSorted] = useState<boolean>(savedOrder !== null);
  
  // 当初始任务变化时更新（保持排序）
  useEffect(() => {
    if (savedOrder && savedOrder.length > 0) {
      const orderMap = new Map(savedOrder.map((id, index) => [id, index]));
      const sorted = [...initialTasks].sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Infinity;
        const orderB = orderMap.get(b.id) ?? Infinity;
        return orderA - orderB;
      });
      setTasks(sorted);
    } else {
      setTasks(initialTasks);
    }
  }, [initialTasks, savedOrder]);
  
  // 处理拖拽结束
  const handleDragEnd = useCallback((draggedId: string | number, overId: string | number) => {
    if (draggedId === overId) {
      setActiveId(null);
      return;
    }
    
    setTasks((prevTasks) => {
      const oldIndex = prevTasks.findIndex((t) => t.id === draggedId);
      const newIndex = prevTasks.findIndex((t) => t.id === overId);
      
      if (oldIndex === -1 || newIndex === -1) return prevTasks;
      
      const newTasks = [...prevTasks];
      const [movedTask] = newTasks.splice(oldIndex, 1);
      newTasks.splice(newIndex, 0, movedTask);
      
      // 保存新排序
      const newOrder = newTasks.map((t) => t.id);
      saveSortState(newOrder);
      setIsSorted(true);
      
      return newTasks;
    });
    
    setActiveId(null);
  }, []);
  
  // 移动任务（编程方式）
  const moveTask = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setTasks((prevTasks) => {
      if (fromIndex < 0 || fromIndex >= prevTasks.length || 
          toIndex < 0 || toIndex >= prevTasks.length) {
        return prevTasks;
      }
      
      const newTasks = [...prevTasks];
      const [movedTask] = newTasks.splice(fromIndex, 1);
      newTasks.splice(toIndex, 0, movedTask);
      
      // 保存新排序
      const newOrder = newTasks.map((t) => t.id);
      saveSortState(newOrder);
      setIsSorted(true);
      
      return newTasks;
    });
  }, []);
  
  // 重置排序
  const resetSort = useCallback(() => {
    setTasks(initialTasks);
    setIsSorted(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [initialTasks]);
  
  return {
    tasks,
    activeId,
    setActiveId,
    handleDragEnd,
    resetSort,
    isSorted,
    moveTask,
  };
}

export default useTaskDragSort;
