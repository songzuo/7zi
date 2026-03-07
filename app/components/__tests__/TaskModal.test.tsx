/**
 * TaskModal 组件测试
 * 测试任务模态框的表单验证、提交、删除等功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { KanbanTask } from '@/lib/types/kanban';

// ============================================================================
// Mocks
// ============================================================================

const mockStoreState = {
  tasks: {},
  columnOrder: ['backlog', 'todo', 'in_progress', 'review', 'done'] as const,
  draggingTaskId: null,
  dragSourceColumn: null,
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
}));

// Mock window.confirm
const originalConfirm = window.confirm;

// 导入被测组件
import { TaskModal } from '../TaskModal';

// ============================================================================
// 测试数据
// ============================================================================

const createMockTask = (overrides: Partial<KanbanTask> = {}): KanbanTask => ({
  id: 'task-1',
  title: '测试任务',
  description: '测试描述',
  status: 'todo',
  priority: 'medium',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  labels: ['前端'],
  assignee: { id: 'user-1', name: '张三' },
  dueDate: '2024-12-31',
  estimatedHours: 4,
  ...overrides,
});

// ============================================================================
// 测试套件
// ============================================================================

describe('TaskModal', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  // ============================================================================
  // 渲染测试
  // ============================================================================

  describe('渲染', () => {
    it('关闭时不应该渲染', () => {
      render(<TaskModal isOpen={false} onClose={mockOnClose} task={null} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('新建模式应该正确渲染', () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('新建任务')).toBeInTheDocument();
    });

    it('编辑模式应该正确渲染', () => {
      const task = createMockTask();

      render(<TaskModal isOpen={true} onClose={mockOnClose} task={task} />);

      expect(screen.getByText('编辑任务')).toBeInTheDocument();
    });

    it('应该渲染所有表单字段', () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      expect(screen.getByLabelText(/任务标题/)).toBeInTheDocument();
      expect(screen.getByLabelText(/描述/)).toBeInTheDocument();
      expect(screen.getByLabelText(/状态/)).toBeInTheDocument();
      expect(screen.getByLabelText(/优先级/)).toBeInTheDocument();
      expect(screen.getByLabelText(/负责人/)).toBeInTheDocument();
      expect(screen.getByLabelText(/标签/)).toBeInTheDocument();
      expect(screen.getByLabelText(/截止日期/)).toBeInTheDocument();
      expect(screen.getByLabelText(/预估工时/)).toBeInTheDocument();
    });

    it('编辑模式应该填充现有数据', () => {
      const task = createMockTask({
        title: '现有任务',
        description: '现有描述',
        assignee: { id: 'user-1', name: '李四' },
      });

      render(<TaskModal isOpen={true} onClose={mockOnClose} task={task} />);

      expect(screen.getByLabelText(/任务标题/)).toHaveValue('现有任务');
      expect(screen.getByLabelText(/描述/)).toHaveValue('现有描述');
      expect(screen.getByLabelText(/负责人/)).toHaveValue('李四');
    });

    it('编辑模式应该显示删除按钮', () => {
      const task = createMockTask();

      render(<TaskModal isOpen={true} onClose={mockOnClose} task={task} />);

      expect(screen.getByText('删除任务')).toBeInTheDocument();
    });

    it('新建模式不应该显示删除按钮', () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      expect(screen.queryByText('删除任务')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // 表单验证测试
  // ============================================================================

  describe('表单验证', () => {
    it('空标题应该显示错误', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const submitButton = screen.getByText('创建任务');
      await user.click(submitButton);

      expect(screen.getByText('请输入任务标题')).toBeInTheDocument();
    });

    it('只有空格的标题应该显示错误', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const titleInput = screen.getByLabelText(/任务标题/);
      await user.type(titleInput, '   ');

      const submitButton = screen.getByText('创建任务');
      await user.click(submitButton);

      expect(screen.getByText('请输入任务标题')).toBeInTheDocument();
    });

    it('输入内容后错误应该消失', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const submitButton = screen.getByText('创建任务');
      await user.click(submitButton);

      expect(screen.getByText('请输入任务标题')).toBeInTheDocument();

      const titleInput = screen.getByLabelText(/任务标题/);
      await user.type(titleInput, '有效标题');

      expect(screen.queryByText('请输入任务标题')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // 表单提交测试
  // ============================================================================

  describe('表单提交', () => {
    it('新建任务应该调用 addTask', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const titleInput = screen.getByLabelText(/任务标题/);
      await user.type(titleInput, '新任务');

      const submitButton = screen.getByText('创建任务');
      await user.click(submitButton);

      expect(mockStoreState.addTask).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('编辑任务应该调用 updateTask', async () => {
      const task = createMockTask();

      render(<TaskModal isOpen={true} onClose={mockOnClose} task={task} />);

      const titleInput = screen.getByLabelText(/任务标题/);
      await user.clear(titleInput);
      await user.type(titleInput, '更新后的标题');

      const submitButton = screen.getByText('保存修改');
      await user.click(submitButton);

      expect(mockStoreState.updateTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ title: '更新后的标题' })
      );
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('应该正确处理标签（逗号分隔）', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const titleInput = screen.getByLabelText(/任务标题/);
      await user.type(titleInput, '新任务');

      const labelsInput = screen.getByLabelText(/标签/);
      await user.type(labelsInput, '前端, Bug, 优化');

      const submitButton = screen.getByText('创建任务');
      await user.click(submitButton);

      expect(mockStoreState.addTask).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: ['前端', 'Bug', '优化'],
        })
      );
    });

    it('应该正确处理预估工时', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const titleInput = screen.getByLabelText(/任务标题/);
      await user.type(titleInput, '新任务');

      const hoursInput = screen.getByLabelText(/预估工时/);
      await user.type(hoursInput, '8');

      const submitButton = screen.getByText('创建任务');
      await user.click(submitButton);

      expect(mockStoreState.addTask).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedHours: 8,
        })
      );
    });
  });

  // ============================================================================
  // 关闭和取消测试
  // ============================================================================

  describe('关闭和取消', () => {
    it('点击关闭按钮应该关闭', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const closeButton = screen.getByLabelText('关闭');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('点击取消按钮应该关闭', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const cancelButton = screen.getByText('取消');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('点击背景遮罩应该关闭', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const overlay = screen.getByRole('dialog').parentElement?.parentElement;
      if (overlay) {
        await user.click(overlay);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 删除测试
  // ============================================================================

  describe('删除任务', () => {
    it('点击删除应该弹出确认框', async () => {
      const task = createMockTask();

      render(<TaskModal isOpen={true} onClose={mockOnClose} task={task} />);

      const deleteButton = screen.getByText('删除任务');
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
    });

    it('确认删除应该调用 deleteTask', async () => {
      const task = createMockTask();
      window.confirm = vi.fn(() => true);

      render(<TaskModal isOpen={true} onClose={mockOnClose} task={task} />);

      const deleteButton = screen.getByText('删除任务');
      await user.click(deleteButton);

      expect(mockStoreState.deleteTask).toHaveBeenCalledWith('task-1');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('取消删除不应该调用 deleteTask', async () => {
      const task = createMockTask();
      window.confirm = vi.fn(() => false);

      render(<TaskModal isOpen={true} onClose={mockOnClose} task={task} />);

      const deleteButton = screen.getByText('删除任务');
      await user.click(deleteButton);

      expect(mockStoreState.deleteTask).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('边界情况', () => {
    it('应该处理空标签', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const titleInput = screen.getByLabelText(/任务标题/);
      await user.type(titleInput, '新任务');

      const labelsInput = screen.getByLabelText(/标签/);
      await user.type(labelsInput, '  ,  ,  ');

      const submitButton = screen.getByText('创建任务');
      await user.click(submitButton);

      // 空标签应该被过滤掉
      expect(mockStoreState.addTask).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: undefined,
        })
      );
    });

    it('应该处理没有负责人的情况', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const titleInput = screen.getByLabelText(/任务标题/);
      await user.type(titleInput, '新任务');

      const submitButton = screen.getByText('创建任务');
      await user.click(submitButton);

      expect(mockStoreState.addTask).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: undefined,
        })
      );
    });

    it('应该处理负数工时', async () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const titleInput = screen.getByLabelText(/任务标题/);
      await user.type(titleInput, '新任务');

      const hoursInput = screen.getByLabelText(/预估工时/);
      await user.type(hoursInput, '-5');

      const submitButton = screen.getByText('创建任务');
      await user.click(submitButton);

      // 应该接受负数（HTML5 number input 会处理）
      expect(mockStoreState.addTask).toHaveBeenCalled();
    });

    it('切换任务时应该重置表单', async () => {
      const task1 = createMockTask({ id: 'task-1', title: '任务1' });
      const task2 = createMockTask({ id: 'task-2', title: '任务2' });

      const { rerender } = render(
        <TaskModal isOpen={true} onClose={mockOnClose} task={task1} />
      );

      expect(screen.getByLabelText(/任务标题/)).toHaveValue('任务1');

      rerender(<TaskModal isOpen={true} onClose={mockOnClose} task={task2} />);

      expect(screen.getByLabelText(/任务标题/)).toHaveValue('任务2');
    });

    it('从编辑切换到新建应该清空表单', async () => {
      const task = createMockTask({ title: '现有任务' });

      const { rerender } = render(
        <TaskModal isOpen={true} onClose={mockOnClose} task={task} />
      );

      expect(screen.getByLabelText(/任务标题/)).toHaveValue('现有任务');

      rerender(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      expect(screen.getByLabelText(/任务标题/)).toHaveValue('');
    });
  });

  // ============================================================================
  // 可访问性测试
  // ============================================================================

  describe('可访问性', () => {
    it('模态框应该有正确的 role', () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('模态框应该有 aria-modal 属性', () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('必填字段应该有标记', () => {
      render(<TaskModal isOpen={true} onClose={mockOnClose} task={null} />);

      const requiredMark = screen.getByText('*');
      expect(requiredMark).toBeInTheDocument();
    });
  });
});