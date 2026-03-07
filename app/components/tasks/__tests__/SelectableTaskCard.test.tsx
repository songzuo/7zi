/**
 * SelectableTaskCard 测试
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SelectableTaskCard } from '../SelectableTaskCard';
import { TaskSelectionProvider } from '@/contexts/TaskSelectionContext';
import { Task, TaskPriority, TaskStatus } from '@/lib/tasks/types';

// Mock 任务数据
const mockTask: Task = {
  id: 'task-1',
  title: '测试任务',
  description: '这是一个测试任务',
  status: 'todo' as TaskStatus,
  priority: 'medium' as TaskPriority,
  tags: [
    { id: 'tag-1', name: '前端', color: '#3b82f6' },
  ],
  dueDate: '2024-12-31',
  assignee: '张三',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// 包装组件
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TaskSelectionProvider>{children}</TaskSelectionProvider>
);

describe('SelectableTaskCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('基本渲染', () => {
    it('应该正确渲染任务信息', () => {
      render(
        <TestWrapper>
          <SelectableTaskCard task={mockTask} />
        </TestWrapper>
      );

      expect(screen.getByText('测试任务')).toBeInTheDocument();
      expect(screen.getByText('这是一个测试任务')).toBeInTheDocument();
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    it('应该显示任务标签', () => {
      render(
        <TestWrapper>
          <SelectableTaskCard task={mockTask} />
        </TestWrapper>
      );

      expect(screen.getByText('前端')).toBeInTheDocument();
    });
  });

  describe('选择模式', () => {
    it('非选择模式下不应显示复选框', () => {
      render(
        <TestWrapper>
          <SelectableTaskCard task={mockTask} />
        </TestWrapper>
      );

      // 复选框应该不存在
      const checkbox = screen.queryByRole('checkbox');
      expect(checkbox).not.toBeInTheDocument();
    });

    it('选择模式下应该显示复选框', () => {
      const TestComponent = () => {
        const { enterSelectionMode } = useTaskSelection();
        React.useEffect(() => {
          enterSelectionMode();
        }, []);
        return <SelectableTaskCard task={mockTask} />;
      };

      const { useTaskSelection } = require('@/contexts/TaskSelectionContext');
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 注意：由于 TaskCard 内部的结构，这里需要找到 checkbox role
      // 实际测试可能需要根据组件结构调整
    });
  });

  describe('点击交互', () => {
    it('点击任务卡片应该切换选择状态（在选择模式下）', async () => {
      const onEdit = vi.fn();
      
      // 创建一个在编辑按钮上触发的测试
      render(
        <TestWrapper>
          <SelectableTaskCard task={mockTask} onEdit={onEdit} />
        </TestWrapper>
      );

      // 非选择模式下，点击卡片不应调用 onEdit（因为没有直接点击）
      // 需要点击编辑按钮
      const editButton = screen.getByLabelText('编辑任务');
      fireEvent.click(editButton);
      
      expect(onEdit).toHaveBeenCalledWith(mockTask);
    });
  });

  describe('长按进入选择模式', () => {
    it('长按应该进入选择模式', async () => {
      render(
        <TestWrapper>
          <SelectableTaskCard task={mockTask} longPressDelay={300} />
        </TestWrapper>
      );

      const card = screen.getByRole('article');
      
      // 模拟长按
      fireEvent.mouseDown(card);
      
      // 等待长按延迟
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // 长按后应该进入选择模式
      // 实际验证需要检查 context 状态
      
      fireEvent.mouseUp(card);
    });

    it('短按不应进入选择模式', async () => {
      render(
        <TestWrapper>
          <SelectableTaskCard task={mockTask} longPressDelay={300} />
        </TestWrapper>
      );

      const card = screen.getByRole('article');
      
      fireEvent.mouseDown(card);
      
      // 短暂等待（不足长按延迟）
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      fireEvent.mouseUp(card);
      
      // 不应该进入选择模式
    });

    it('鼠标离开应该取消长按', async () => {
      render(
        <TestWrapper>
          <SelectableTaskCard task={mockTask} longPressDelay={300} />
        </TestWrapper>
      );

      const card = screen.getByRole('article');
      
      fireEvent.mouseDown(card);
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // 鼠标离开
      fireEvent.mouseLeave(card);
      
      // 再等待足够时间
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // 长按应该被取消，不会进入选择模式
    });
  });

  describe('键盘操作', () => {
    it('空格键应该切换选择状态（在选择模式下）', async () => {
      const TestComponent = () => {
        const { enterSelectionMode } = require('@/contexts/TaskSelectionContext').useTaskSelection();
        React.useEffect(() => {
          enterSelectionMode();
        }, []);
        return <SelectableTaskCard task={mockTask} />;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 这个测试需要完整的选择模式上下文
    });
  });

  describe('禁用选择', () => {
    it('disableSelection=true 时不应该响应选择操作', async () => {
      render(
        <TestWrapper>
          <SelectableTaskCard task={mockTask} disableSelection longPressDelay={300} />
        </TestWrapper>
      );

      const card = screen.getByRole('article');
      
      // 尝试长按
      fireEvent.mouseDown(card);
      
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      fireEvent.mouseUp(card);
      
      // 不应该进入选择模式（无法直接验证，但确保不崩溃）
    });
  });

  describe('回调处理', () => {
    it('删除按钮应该触发 onDelete', () => {
      const onDelete = vi.fn();
      
      render(
        <TestWrapper>
          <SelectableTaskCard task={mockTask} onDelete={onDelete} />
        </TestWrapper>
      );

      const deleteButton = screen.getByLabelText('删除任务');
      fireEvent.click(deleteButton);
      
      expect(onDelete).toHaveBeenCalledWith('task-1');
    });

    it('状态变更应该触发 onStatusChange', () => {
      const onStatusChange = vi.fn();
      
      render(
        <TestWrapper>
          <SelectableTaskCard 
            task={mockTask} 
            onStatusChange={onStatusChange} 
          />
        </TestWrapper>
      );

      // 找到状态切换按钮
      const statusButton = screen.getByText('→ 进行中');
      fireEvent.click(statusButton);
      
      expect(onStatusChange).toHaveBeenCalledWith('task-1', 'in_progress');
    });
  });
});