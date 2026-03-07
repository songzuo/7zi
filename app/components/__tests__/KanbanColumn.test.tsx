/**
 * KanbanColumn 组件测试
 * 测试看板列的渲染、拖放功能、任务列表展示
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { KanbanTask, KanbanStatus } from '@/lib/types/kanban';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../KanbanTaskCard', () => ({
  KanbanTaskCard: ({ task, onDragStart, onDragEnd, onClick }: {
    task: { id: string; title: string };
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onClick: () => void;
  }) => (
    <div 
      data-testid={`task-card-${task.id}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      role="article"
      tabIndex={0}
    >
      {task.title}
    </div>
  ),
}));

// 导入被测组件
import { KanbanColumn } from '../KanbanColumn';

// ============================================================================
// 测试数据
// ============================================================================

const createMockTask = (overrides: Partial<KanbanTask> = {}): KanbanTask => ({
  id: 'task-1',
  title: '测试任务',
  status: 'todo',
  priority: 'medium',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  ...overrides,
});

const mockHandlers = {
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onDragOver: vi.fn(),
  onDragLeave: vi.fn(),
  onDrop: vi.fn(),
  onEditTask: vi.fn(),
  onCreateTask: vi.fn(),
};

// ============================================================================
// 测试套件
// ============================================================================

describe('KanbanColumn', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // 渲染测试
  // ============================================================================

  describe('渲染', () => {
    it('应该正确渲染列标题', () => {
      render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[]}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('待办')).toBeInTheDocument();
    });

    it('应该显示任务计数', () => {
      const tasks = [
        createMockTask({ id: 'task-1' }),
        createMockTask({ id: 'task-2' }),
      ];

      render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={tasks}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('应该显示 WIP 限制', () => {
      render(
        <KanbanColumn
          id="in_progress"
          title="进行中"
          color="#F59E0B"
          tasks={[createMockTask()]}
          limit={3}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('1/3')).toBeInTheDocument();
    });

    it('应该在超出 WIP 限制时显示警告样式', () => {
      const tasks = [
        createMockTask({ id: 'task-1' }),
        createMockTask({ id: 'task-2' }),
        createMockTask({ id: 'task-3' }),
        createMockTask({ id: 'task-4' }),
      ];

      render(
        <KanbanColumn
          id="in_progress"
          title="进行中"
          color="#F59E0B"
          tasks={tasks}
          limit={3}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      // 检查超出限制的样式类
      const countBadge = screen.getByText('4/3');
      expect(countBadge).toHaveClass('bg-red-100');
    });

    it('应该渲染所有任务卡片', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: '任务1' }),
        createMockTask({ id: 'task-2', title: '任务2' }),
        createMockTask({ id: 'task-3', title: '任务3' }),
      ];

      render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={tasks}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      tasks.forEach(task => {
        expect(screen.getByText(task.title)).toBeInTheDocument();
      });
    });

    it('空列应该显示空状态提示', () => {
      render(
        <KanbanColumn
          id="backlog"
          title="积压"
          color="#6B7280"
          tasks={[]}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('暂无任务')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 拖放测试
  // ============================================================================

  describe('拖放功能', () => {
    it('拖拽悬停时应该显示高亮样式', () => {
      const { container } = render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[]}
          isDragOver={true}
          isDragging={false}
          {...mockHandlers}
        />
      );

      const column = container.firstChild;
      expect(column).toHaveClass('ring-2');
      expect(column).toHaveClass('ring-blue-400');
    });

    it('有拖拽进行中时应该变暗', () => {
      const { container } = render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[]}
          isDragOver={false}
          isDragging={true}
          {...mockHandlers}
        />
      );

      const column = container.firstChild;
      expect(column).toHaveClass('bg-gray-100');
    });

    it('拖拽悬停在空列时应该显示放置提示', () => {
      render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[]}
          isDragOver={true}
          isDragging={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('释放以放置任务')).toBeInTheDocument();
    });

    it('应该触发 onDragOver 事件', () => {
      const { container } = render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[]}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      const column = container.firstChild as HTMLElement;
      fireEvent.dragOver(column);

      expect(mockHandlers.onDragOver).toHaveBeenCalled();
    });

    it('应该触发 onDragLeave 事件', () => {
      const { container } = render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[]}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      const column = container.firstChild as HTMLElement;
      fireEvent.dragLeave(column);

      expect(mockHandlers.onDragLeave).toHaveBeenCalled();
    });

    it('应该触发 onDrop 事件', () => {
      const { container } = render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[]}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      const column = container.firstChild as HTMLElement;
      fireEvent.drop(column, {
        dataTransfer: {
          getData: vi.fn(() => 'task-1'),
        },
      });

      expect(mockHandlers.onDrop).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 交互测试
  // ============================================================================

  describe('交互', () => {
    it('点击添加按钮应该触发 onCreateTask', async () => {
      render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[]}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      const addButtons = screen.getAllByRole('button', { name: /添加任务/i });
      await user.click(addButtons[0]);

      expect(mockHandlers.onCreateTask).toHaveBeenCalled();
    });

    it('点击任务卡片应该触发 onEditTask', async () => {
      const task = createMockTask({ id: 'task-1', title: '测试任务' });

      render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[task]}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      const taskCard = screen.getByText('测试任务');
      await user.click(taskCard);

      expect(mockHandlers.onEditTask).toHaveBeenCalledWith(task);
    });

    it('任务卡片应该支持拖拽', () => {
      const task = createMockTask({ id: 'task-1' });

      render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[task]}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      const taskCard = screen.getByTestId('task-card-task-1');
      expect(taskCard).toHaveAttribute('draggable', 'true');
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('边界情况', () => {
    it('应该处理没有 limit 的情况', () => {
      render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[createMockTask()]}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      // 不应该显示 WIP 限制
      expect(screen.queryByText(/\/\d+/)).not.toBeInTheDocument();
    });

    it('应该处理空标题的任务', () => {
      const task = createMockTask({ title: '' });

      render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={[task]}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      // 应该正常渲染
      expect(screen.getByTestId('task-card-task-1')).toBeInTheDocument();
    });

    it('应该处理大量任务', () => {
      const tasks = Array.from({ length: 100 }, (_, i) => 
        createMockTask({ id: `task-${i}`, title: `任务${i}` })
      );

      render(
        <KanbanColumn
          id="todo"
          title="待办"
          color="#3B82F6"
          tasks={tasks}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 样式测试
  // ============================================================================

  describe('样式', () => {
    it('应该应用列颜色', () => {
      const { container } = render(
        <KanbanColumn
          id="done"
          title="完成"
          color="#10B981"
          tasks={[]}
          isDragOver={false}
          isDragging={false}
          {...mockHandlers}
        />
      );

      // 检查顶部边框颜色
      const header = container.querySelector('[style*="borderTopColor"]');
      expect(header).toHaveStyle({ borderTopColor: '#10B981' });
    });
  });
});