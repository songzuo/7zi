/**
 * TaskSelectionContext 测试
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TaskSelectionProvider,
  useTaskSelection,
  useOptionalTaskSelection,
} from '../TaskSelectionContext';

// 测试组件
const TestComponent = ({
  onSelectionChange,
  initialSelectedIds,
  maxSelections,
  persistKey,
}: {
  onSelectionChange?: (selectedIds: Set<string>) => void;
  initialSelectedIds?: string[];
  maxSelections?: number;
  persistKey?: string;
} = {}) => {
  const {
    selectedIds,
    hasSelection,
    selectionCount,
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
  } = useTaskSelection();

  return (
    <div>
      <span data-testid="count">{selectionCount}</span>
      <span data-testid="hasSelection">{hasSelection.toString()}</span>
      <span data-testid="isSelectionMode">{isSelectionMode.toString()}</span>
      <span data-testid="selectedIds">{Array.from(selectedIds).join(',')}</span>
      
      <button
        data-testid="select-1"
        onClick={() => select('task-1')}
      >
        Select Task 1
      </button>
      <button
        data-testid="deselect-1"
        onClick={() => deselect('task-1')}
      >
        Deselect Task 1
      </button>
      <button
        data-testid="toggle-2"
        onClick={() => toggleSelection('task-2')}
      >
        Toggle Task 2
      </button>
      <button
        data-testid="select-all"
        onClick={() => selectAll(['task-1', 'task-2', 'task-3'])}
      >
        Select All
      </button>
      <button
        data-testid="clear"
        onClick={clearSelection}
      >
        Clear Selection
      </button>
      <button
        data-testid="enter-mode"
        onClick={enterSelectionMode}
      >
        Enter Selection Mode
      </button>
      <button
        data-testid="exit-mode"
        onClick={exitSelectionMode}
      >
        Exit Selection Mode
      </button>
      <button
        data-testid="toggle-mode"
        onClick={toggleSelectionMode}
      >
        Toggle Selection Mode
      </button>
      <span data-testid="is-selected-1">{isSelected('task-1').toString()}</span>
    </div>
  );
};

describe('TaskSelectionContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      render(
        <TaskSelectionProvider>
          <TestComponent />
        </TaskSelectionProvider>
      );

      expect(screen.getByTestId('count').textContent).toBe('0');
      expect(screen.getByTestId('hasSelection').textContent).toBe('false');
      expect(screen.getByTestId('isSelectionMode').textContent).toBe('false');
    });

    it('应该支持初始选中状态', () => {
      render(
        <TaskSelectionProvider initialSelectedIds={['task-1', 'task-2']}>
          <TestComponent />
        </TaskSelectionProvider>
      );

      expect(screen.getByTestId('count').textContent).toBe('2');
      expect(screen.getByTestId('hasSelection').textContent).toBe('true');
      expect(screen.getByTestId('selectedIds').textContent).toBe('task-1,task-2');
    });

    it('应该支持选中任务', () => {
      render(
        <TaskSelectionProvider>
          <TestComponent />
        </TaskSelectionProvider>
      );

      fireEvent.click(screen.getByTestId('select-1'));
      
      expect(screen.getByTestId('count').textContent).toBe('1');
      expect(screen.getByTestId('is-selected-1').textContent).toBe('true');
    });

    it('应该支持取消选中任务', () => {
      render(
        <TaskSelectionProvider initialSelectedIds={['task-1']}>
          <TestComponent />
        </TaskSelectionProvider>
      );

      fireEvent.click(screen.getByTestId('deselect-1'));
      
      expect(screen.getByTestId('count').textContent).toBe('0');
      expect(screen.getByTestId('is-selected-1').textContent).toBe('false');
    });

    it('应该支持切换选中状态', () => {
      render(
        <TaskSelectionProvider>
          <TestComponent />
        </TaskSelectionProvider>
      );

      // 首次点击选中
      fireEvent.click(screen.getByTestId('toggle-2'));
      expect(screen.getByTestId('count').textContent).toBe('1');
      
      // 再次点击取消选中
      fireEvent.click(screen.getByTestId('toggle-2'));
      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('应该支持全选', () => {
      render(
        <TaskSelectionProvider>
          <TestComponent />
        </TaskSelectionProvider>
      );

      fireEvent.click(screen.getByTestId('select-all'));
      
      expect(screen.getByTestId('count').textContent).toBe('3');
      expect(screen.getByTestId('selectedIds').textContent).toBe('task-1,task-2,task-3');
    });

    it('应该支持清除选择', () => {
      render(
        <TaskSelectionProvider initialSelectedIds={['task-1', 'task-2']}>
          <TestComponent />
        </TaskSelectionProvider>
      );

      fireEvent.click(screen.getByTestId('clear'));
      
      expect(screen.getByTestId('count').textContent).toBe('0');
      expect(screen.getByTestId('hasSelection').textContent).toBe('false');
    });
  });

  describe('选择模式', () => {
    it('应该支持进入选择模式', () => {
      render(
        <TaskSelectionProvider>
          <TestComponent />
        </TaskSelectionProvider>
      );

      fireEvent.click(screen.getByTestId('enter-mode'));
      
      expect(screen.getByTestId('isSelectionMode').textContent).toBe('true');
    });

    it('应该支持退出选择模式并清除选择', () => {
      render(
        <TaskSelectionProvider initialSelectedIds={['task-1']}>
          <TestComponent />
        </TaskSelectionProvider>
      );

      fireEvent.click(screen.getByTestId('enter-mode'));
      fireEvent.click(screen.getByTestId('exit-mode'));
      
      expect(screen.getByTestId('isSelectionMode').textContent).toBe('false');
      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('应该支持切换选择模式', () => {
      render(
        <TaskSelectionProvider>
          <TestComponent />
        </TaskSelectionProvider>
      );

      fireEvent.click(screen.getByTestId('toggle-mode'));
      expect(screen.getByTestId('isSelectionMode').textContent).toBe('true');
      
      fireEvent.click(screen.getByTestId('toggle-mode'));
      expect(screen.getByTestId('isSelectionMode').textContent).toBe('false');
    });
  });

  describe('最大选择数量限制', () => {
    it('应该限制最大选择数量', () => {
      render(
        <TaskSelectionProvider maxSelections={2}>
          <TestComponent />
        </TaskSelectionProvider>
      );

      // 选择前两个任务
      fireEvent.click(screen.getByTestId('select-1'));
      fireEvent.click(screen.getByTestId('toggle-2'));
      
      expect(screen.getByTestId('count').textContent).toBe('2');
      
      // 尝试选择第三个任务（应该被忽略）
      fireEvent.click(screen.getByTestId('select-all'));
      
      // 由于全选也受 maxSelections 限制，只会选中前两个
      expect(screen.getByTestId('count').textContent).toBe('2');
    });
  });

  describe('选择变化回调', () => {
    it('应该在选择变化时调用回调', () => {
      const onSelectionChange = vi.fn();
      
      render(
        <TaskSelectionProvider onSelectionChange={onSelectionChange}>
          <TestComponent />
        </TaskSelectionProvider>
      );

      fireEvent.click(screen.getByTestId('select-1'));
      
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith(expect.any(Set));
    });
  });

  describe('持久化', () => {
    it('应该将选择状态持久化到 localStorage', () => {
      render(
        <TaskSelectionProvider persistKey="test-selection">
          <TestComponent />
        </TaskSelectionProvider>
      );

      fireEvent.click(screen.getByTestId('select-1'));
      
      const stored = localStorage.getItem('test-selection');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toContain('task-1');
    });
  });

  describe('useOptionalTaskSelection', () => {
    it('在 Provider 外部应该返回 null', () => {
      const OptionalTestComponent = () => {
        const context = useOptionalTaskSelection();
        return <span data-testid="context">{context === null ? 'null' : 'not-null'}</span>;
      };

      render(<OptionalTestComponent />);
      
      expect(screen.getByTestId('context').textContent).toBe('null');
    });

    it('在 Provider 内部应该返回 context value', () => {
      const OptionalTestComponent = () => {
        const context = useOptionalTaskSelection();
        return <span data-testid="context">{context ? 'has-context' : 'null'}</span>;
      };

      render(
        <TaskSelectionProvider>
          <OptionalTestComponent />
        </TaskSelectionProvider>
      );
      
      expect(screen.getByTestId('context').textContent).toBe('has-context');
    });
  });

  describe('错误处理', () => {
    it('在 Provider 外部使用 useTaskSelection 应该抛出错误', () => {
      // 抑制 console.error
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const ErrorTestComponent = () => {
        useTaskSelection();
        return null;
      };

      expect(() => render(<ErrorTestComponent />)).toThrow(
        'useTaskSelection must be used within a TaskSelectionProvider'
      );
      
      spy.mockRestore();
    });
  });
});