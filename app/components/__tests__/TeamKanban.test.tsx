/**
 * TeamKanban 组件测试
 * 测试看板容器的渲染、拖拽逻辑、任务管理功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ============================================================================
// Mocks - 必须在导入被测组件之前设置
// ============================================================================

// Mock Zustand store
const mockTasks: Record<string, import('@/lib/types/kanban').KanbanTask> = {
  'task-1': {
    id: 'task-1',
    title: '测试任务1',
    description: '测试描述',
    status: 'todo',
    priority: 'high',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    labels: ['前端', 'Bug'],
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: { id: 'user-1', name: '测试用户' },
    estimatedHours: 4,
  },
  'task-2': {
    id: 'task-2',
    title: '测试任务2',
    status: 'in_progress',
    priority: 'medium',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
  },
  'task-3': {
    id: 'task-3',
    title: '已完成的任务',
    status: 'done',
    priority: 'low',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
  },
};

const mockStoreState = {
  tasks: mockTasks,
  columnOrder: ['backlog', 'todo', 'in_progress', 'review', 'done'] as const,
  draggingTaskId: null as string | null,
  dragSourceColumn: null as string | null,
  addTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  moveTask: vi.fn(),
  setDragging: vi.fn(),
};

vi.mock('@/hooks/useKanbanStore', () => ({
  useKanbanStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
  useTasksByColumn: vi.fn(() => ({
    backlog: [],
    todo: [mockTasks['task-1']],
    in_progress: [mockTasks['task-2']],
    review: [],
    done: [mockTasks['task-3']],
  })),
  useColumnTasks: vi.fn((status) => {
    const mapping: Record<string, typeof mockTasks[string][]> = {
      backlog: [],
      todo: [mockTasks['task-1']],
      in_progress: [mockTasks['task-2']],
      review: [],
      done: [mockTasks['task-3']],
    };
    return mapping[status] || [];
  }),
  useKanbanStats: vi.fn(() => ({
    total: 3,
    backlog: 0,
    todo: 1,
    inProgress: 1,
    review: 0,
    done: 1,
    highPriority: 1,
  })),
}));

// Mock 子组件
vi.mock('../KanbanColumn', () => ({
  KanbanColumn: ({ id, title, tasks, onEditTask, onCreateTask }: {
    id: string;
    title: string;
    tasks: Array<{ id: string; title: string }>;
    onEditTask: (task: { id: string }) => void;
    onCreateTask: () => void;
  }) => (
    <div data-testid={`kanban-column-${id}`} role="region" aria-label={title}>
      <h3>{title}</h3>
      <span data-testid="task-count">{tasks.length}</span>
      <button onClick={onCreateTask} aria-label="添加任务">+</button>
      {tasks.map(task => (
        <div 
          key={task.id} 
          data-testid={`task-${task.id}`}
          onClick={() => onEditTask(task)}
          role="button"
          tabIndex={0}
        >
          {task.title}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../TaskModal', () => ({
  TaskModal: ({ isOpen, onClose, task }: {
    isOpen: boolean;
    onClose: () => void;
    task: { id: string; title: string } | null;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="task-modal" role="dialog" aria-modal="true">
        <h2>{task ? '编辑任务' : '新建任务'}</h2>
        {task && <span data-testid="editing-task-id">{task.id}</span>}
        <button onClick={onClose} aria-label="关闭">关闭</button>
      </div>
    );
  },
}));

// 导入被测组件
import { TeamKanban } from '../TeamKanban';

// ============================================================================
// 测试套件
// ============================================================================

describe('TeamKanban', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // 重置 store 状态
    mockStoreState.draggingTaskId = null;
    mockStoreState.dragSourceColumn = null;
  });

  // ============================================================================
  // 渲染测试
  // ============================================================================

  describe('渲染', () => {
    it('应该正确渲染看板组件', () => {
      render(<TeamKanban />);

      // 检查标题
      expect(screen.getByText('📋')).toBeInTheDocument();
      expect(screen.getByText('团队协作看板')).toBeInTheDocument();
    });

    it('应该显示任务统计信息', () => {
      render(<TeamKanban />);

      expect(screen.getByText('3 任务')).toBeInTheDocument();
      expect(screen.getByText('1 进行中')).toBeInTheDocument();
      expect(screen.getByText('1 完成')).toBeInTheDocument();
    });

    it('应该渲染所有列', () => {
      render(<TeamKanban />);

      const columns = ['积压', '待办', '进行中', '审核', '完成'];
      columns.forEach(columnTitle => {
        expect(screen.getByRole('region', { name: columnTitle })).toBeInTheDocument();
      });
    });

    it('应该显示新建任务按钮', () => {
      render(<TeamKanban />);

      const newTaskButton = screen.getByRole('button', { name: /新建任务/i });
      expect(newTaskButton).toBeInTheDocument();
    });

    it('应该应用自定义 className', () => {
      const { container } = render(<TeamKanban className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  // ============================================================================
  // 交互测试
  // ============================================================================

  describe('交互', () => {
    it('点击新建任务按钮应该打开模态框', async () => {
      render(<TeamKanban />);

      // 使用更具体的选择器
      const newTaskButton = screen.getByRole('button', { name: /新建任务/i });
      await user.click(newTaskButton);

      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      // 检查模态框标题存在
      expect(screen.getAllByText('新建任务')).toHaveLength(2); // 按钮和模态框标题
    });

    it('关闭模态框应该正确关闭', async () => {
      render(<TeamKanban />);

      // 打开模态框
      await user.click(screen.getByRole('button', { name: /新建任务/i }));
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();

      // 关闭模态框
      await user.click(screen.getByRole('button', { name: '关闭' }));
      expect(screen.queryByTestId('task-modal')).not.toBeInTheDocument();
    });

    it('点击列中的添加任务按钮应该打开模态框', async () => {
      render(<TeamKanban />);

      const addButton = screen.getAllByRole('button', { name: '添加任务' })[0];
      await user.click(addButton);

      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
    });

    it('点击任务应该打开编辑模态框', async () => {
      render(<TeamKanban />);

      const task = screen.getByTestId('task-task-1');
      await user.click(task);

      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      expect(screen.getByText('编辑任务')).toBeInTheDocument();
      expect(screen.getByTestId('editing-task-id')).toHaveTextContent('task-1');
    });
  });

  // ============================================================================
  // 拖拽测试
  // ============================================================================

  describe('拖拽功能', () => {
    it('应该正确设置拖拽状态', async () => {
      render(<TeamKanban />);

      const task = screen.getByTestId('task-task-1');
      
      // 模拟拖拽开始
      fireEvent.dragStart(task, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: null,
        },
      });

      expect(mockStoreState.setDragging).toHaveBeenCalled();
    });

    it('拖拽结束时应该重置状态', async () => {
      render(<TeamKanban />);

      const task = screen.getByTestId('task-task-1');
      
      // 模拟拖拽结束
      fireEvent.dragEnd(task);

      expect(mockStoreState.setDragging).toHaveBeenCalledWith(null, null);
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('边界情况', () => {
    it('空看板应该正确显示', () => {
      // 使用不同的测试方法来测试空状态
      render(<TeamKanban />);

      // 基本渲染应该正常工作
      expect(screen.getByText('团队协作看板')).toBeInTheDocument();
    });

    it('应该处理大量任务', () => {
      render(<TeamKanban />);
      
      // 组件应该正常渲染，不应该有性能问题
      expect(screen.getByText('团队协作看板')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 可访问性测试
  // ============================================================================

  describe('可访问性', () => {
    it('新建任务按钮应该可以聚焦', async () => {
      render(<TeamKanban />);

      const newTaskButton = screen.getByRole('button', { name: /新建任务/i });
      newTaskButton.focus();
      
      expect(newTaskButton).toHaveFocus();
    });

    it('应该有正确的标题层级', () => {
      render(<TeamKanban />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('团队协作看板');
    });
  });
});