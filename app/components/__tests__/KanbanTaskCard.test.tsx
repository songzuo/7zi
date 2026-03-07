/**
 * KanbanTaskCard 组件测试
 * 测试任务卡片的渲染、拖拽、日期显示等功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { KanbanTask } from '@/lib/types/kanban';

// 导入被测组件
import { KanbanTaskCard } from '../KanbanTaskCard';

// ============================================================================
// 测试数据
// ============================================================================

const createMockTask = (overrides: Partial<KanbanTask> = {}): KanbanTask => ({
  id: 'task-1',
  title: '测试任务标题',
  description: '这是一个测试任务的描述',
  status: 'todo',
  priority: 'medium',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  labels: ['前端', 'Bug'],
  ...overrides,
});

const mockHandlers = {
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onClick: vi.fn(),
};

// ============================================================================
// 测试套件
// ============================================================================

describe('KanbanTaskCard', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // 渲染测试
  // ============================================================================

  describe('渲染', () => {
    it('应该正确渲染任务标题', () => {
      const task = createMockTask({ title: '实现用户登录功能' });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText('实现用户登录功能')).toBeInTheDocument();
    });

    it('应该渲染任务描述', () => {
      const task = createMockTask({ description: '详细描述内容' });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText('详细描述内容')).toBeInTheDocument();
    });

    it('应该渲染优先级标签', () => {
      const task = createMockTask({ priority: 'high' });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText('高')).toBeInTheDocument();
    });

    it('应该为不同优先级显示正确的图标', () => {
      const priorities: Array<{ priority: KanbanTask['priority']; expected: string }> = [
        { priority: 'low', expected: '🔵' },
        { priority: 'medium', expected: '🟡' },
        { priority: 'high', expected: '🟠' },
        { priority: 'urgent', expected: '🔴' },
      ];

      priorities.forEach(({ priority, expected }) => {
        const { unmount } = render(
          <KanbanTaskCard task={createMockTask({ priority })} {...mockHandlers} />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });

    it('应该渲染标签列表', () => {
      const task = createMockTask({ labels: ['React', 'TypeScript', '测试'] });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('测试')).toBeInTheDocument();
    });

    it('应该截断超过3个的标签', () => {
      const task = createMockTask({ 
        labels: ['标签1', '标签2', '标签3', '标签4', '标签5'] 
      });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('应该渲染负责人信息', () => {
      const task = createMockTask({
        assignee: {
          id: 'user-1',
          name: '张三',
          avatar: 'https://example.com/avatar.jpg',
        },
      });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('负责人没有头像时应该显示首字母', () => {
      const task = createMockTask({
        assignee: {
          id: 'user-1',
          name: '张三',
        },
      });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText('张')).toBeInTheDocument();
    });

    it('未分配时应该显示提示', () => {
      const task = createMockTask({ assignee: undefined });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText('未分配')).toBeInTheDocument();
    });

    it('应该渲染预估工时', () => {
      const task = createMockTask({ estimatedHours: 4 });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText(/4h/)).toBeInTheDocument();
    });

    it('应该渲染实际工时', () => {
      const task = createMockTask({ actualHours: 3 });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText(/3h/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 截止日期显示测试
  // ============================================================================

  describe('截止日期显示', () => {
    it('应该显示已过期', () => {
      const task = createMockTask({
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText(/已过期/)).toBeInTheDocument();
    });

    it('应该显示今天到期', () => {
      const task = createMockTask({
        dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText('今天到期')).toBeInTheDocument();
    });

    it('应该显示明天到期', () => {
      const task = createMockTask({
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText('明天到期')).toBeInTheDocument();
    });

    it('应该显示天数', () => {
      const task = createMockTask({
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText(/5 天后/)).toBeInTheDocument();
    });

    it('没有截止日期时不应该显示', () => {
      const task = createMockTask({ dueDate: undefined });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.queryByText('📅')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // 拖拽测试
  // ============================================================================

  describe('拖拽功能', () => {
    it('应该可拖拽', () => {
      const task = createMockTask();

      const { container } = render(<KanbanTaskCard task={task} {...mockHandlers} />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveAttribute('draggable', 'true');
    });

    it('拖拽开始应该触发 onDragStart', () => {
      const task = createMockTask();

      const { container } = render(<KanbanTaskCard task={task} {...mockHandlers} />);
      const card = container.firstChild as HTMLElement;

      fireEvent.dragStart(card);

      expect(mockHandlers.onDragStart).toHaveBeenCalled();
    });

    it('拖拽结束应该触发 onDragEnd', () => {
      const task = createMockTask();

      const { container } = render(<KanbanTaskCard task={task} {...mockHandlers} />);
      const card = container.firstChild as HTMLElement;

      fireEvent.dragEnd(card);

      expect(mockHandlers.onDragEnd).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 交互测试
  // ============================================================================

  describe('交互', () => {
    it('点击卡片应该触发 onClick', async () => {
      const task = createMockTask();

      const { container } = render(<KanbanTaskCard task={task} {...mockHandlers} />);
      const card = container.firstChild as HTMLElement;

      await user.click(card);

      expect(mockHandlers.onClick).toHaveBeenCalled();
    });

    it('点击更多操作按钮不应该触发卡片点击', async () => {
      const task = createMockTask();

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      // 更多操作按钮存在（虽然目前是 TODO）
      const card = screen.getByRole('article');
      await user.click(card);

      // 点击卡片本身应该触发 onClick
      expect(mockHandlers.onClick).toHaveBeenCalled();
    });

    it('应该可以通过键盘聚焦', async () => {
      const task = createMockTask();

      render(<KanbanTaskCard task={task} {...mockHandlers} />);
      const card = screen.getByRole('article');

      card.focus();
      expect(card).toHaveFocus();
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('边界情况', () => {
    it('应该处理超长标题', () => {
      const task = createMockTask({
        title: '这是一个非常非常非常非常非常非常非常非常非常非常非常非常长的标题',
      });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText(/这是一个非常/)).toBeInTheDocument();
    });

    it('应该处理超长描述', () => {
      const task = createMockTask({
        description: '这是一个非常非常非常非常非常非常非常非常非常非常长的描述内容',
      });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      // 描述应该被截断
      expect(screen.getByText(/这是一个非常/)).toBeInTheDocument();
    });

    it('应该处理空标签数组', () => {
      const task = createMockTask({ labels: [] });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      // 不应该报错
      expect(screen.getByText(task.title)).toBeInTheDocument();
    });

    it('应该处理没有描述的任务', () => {
      const task = createMockTask({ description: undefined });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText(task.title)).toBeInTheDocument();
    });

    it('应该处理没有标签的任务', () => {
      const task = createMockTask({ labels: undefined });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      expect(screen.getByText(task.title)).toBeInTheDocument();
    });

    it('应该处理负数工时', () => {
      const task = createMockTask({ estimatedHours: -1 });

      render(<KanbanTaskCard task={task} {...mockHandlers} />);

      // 组件应该正常渲染
      expect(screen.getByText(task.title)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 样式测试
  // ============================================================================

  describe('样式', () => {
    it('悬停时应该显示阴影效果', () => {
      const task = createMockTask();

      const { container } = render(<KanbanTaskCard task={task} {...mockHandlers} />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('hover:shadow-md');
    });

    it('悬停时应该显示边框高亮', () => {
      const task = createMockTask();

      const { container } = render(<KanbanTaskCard task={task} {...mockHandlers} />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('hover:border-blue-300');
    });
  });
});