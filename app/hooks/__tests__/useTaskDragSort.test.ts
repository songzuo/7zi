/**
 * useTaskDragSort Hook 测试
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTaskDragSort, SortableTask } from '../useTaskDragSort';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

interface TestTask extends SortableTask {
  title: string;
  status: string;
}

describe('useTaskDragSort', () => {
  const mockTasks: TestTask[] = [
    { id: '1', title: 'Task 1', status: 'open' },
    { id: '2', title: 'Task 2', status: 'open' },
    { id: '3', title: 'Task 3', status: 'closed' },
  ];

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should initialize with tasks in original order', () => {
    const { result } = renderHook(() => useTaskDragSort(mockTasks));

    expect(result.current.tasks).toEqual(mockTasks);
    expect(result.current.isSorted).toBe(false);
  });

  it('should handle drag end and reorder tasks', () => {
    const { result } = renderHook(() => useTaskDragSort(mockTasks));

    act(() => {
      result.current.handleDragEnd('1', '3');
    });

    // Task 1 should now be after Task 3
    expect(result.current.tasks[0].id).toBe('2');
    expect(result.current.tasks[1].id).toBe('3');
    expect(result.current.tasks[2].id).toBe('1');
    expect(result.current.isSorted).toBe(true);
  });

  it('should not reorder when dragging to same position', () => {
    const { result } = renderHook(() => useTaskDragSort(mockTasks));

    act(() => {
      result.current.handleDragEnd('1', '1');
    });

    expect(result.current.tasks).toEqual(mockTasks);
  });

  it('should save order to localStorage after drag', () => {
    const { result } = renderHook(() => useTaskDragSort(mockTasks));

    act(() => {
      result.current.handleDragEnd('1', '2');
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
    const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(savedData.taskOrder).toEqual(['2', '1', '3']);
  });

  it('should reset sort to original order', () => {
    const { result } = renderHook(() => useTaskDragSort(mockTasks));

    act(() => {
      result.current.handleDragEnd('1', '3');
    });

    expect(result.current.isSorted).toBe(true);

    act(() => {
      result.current.resetSort();
    });

    expect(result.current.tasks).toEqual(mockTasks);
    expect(result.current.isSorted).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalled();
  });

  it('should move task programmatically', () => {
    const { result } = renderHook(() => useTaskDragSort(mockTasks));

    act(() => {
      result.current.moveTask(0, 2);
    });

    expect(result.current.tasks[0].id).toBe('2');
    expect(result.current.tasks[1].id).toBe('3');
    expect(result.current.tasks[2].id).toBe('1');
    expect(result.current.isSorted).toBe(true);
  });

  it('should not move task with invalid indices', () => {
    const { result } = renderHook(() => useTaskDragSort(mockTasks));

    act(() => {
      result.current.moveTask(-1, 5);
    });

    expect(result.current.tasks).toEqual(mockTasks);
  });

  it('should load saved order from localStorage', () => {
    // Pre-populate localStorage
    const savedOrder = ['3', '1', '2'];
    localStorageMock.getItem.mockReturnValueOnce(
      JSON.stringify({
        taskOrder: savedOrder,
        lastUpdated: Date.now(),
      })
    );

    const { result } = renderHook(() => useTaskDragSort(mockTasks));

    expect(result.current.tasks[0].id).toBe('3');
    expect(result.current.tasks[1].id).toBe('1');
    expect(result.current.tasks[2].id).toBe('2');
    expect(result.current.isSorted).toBe(true);
  });

  it('should ignore expired localStorage data', () => {
    // Pre-populate with expired data (8 days old)
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorageMock.getItem.mockReturnValueOnce(
      JSON.stringify({
        taskOrder: ['3', '1', '2'],
        lastUpdated: eightDaysAgo,
      })
    );

    const { result } = renderHook(() => useTaskDragSort(mockTasks));

    expect(result.current.tasks).toEqual(mockTasks);
    expect(result.current.isSorted).toBe(false);
  });

  it('should set active id', () => {
    const { result } = renderHook(() => useTaskDragSort(mockTasks));

    act(() => {
      result.current.setActiveId('1');
    });

    expect(result.current.activeId).toBe('1');

    act(() => {
      result.current.setActiveId(null);
    });

    expect(result.current.activeId).toBeNull();
  });
});