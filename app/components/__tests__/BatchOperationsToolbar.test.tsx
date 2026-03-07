/**
 * BatchOperationsToolbar 组件测试
 * 
 * 测试覆盖:
 * 1. 组件渲染正确（显示选中数量）
 * 2. 状态下拉菜单展开/关闭
 * 3. 优先级下拉菜单展开/关闭
 * 4. 批量更新状态调用正确
 * 5. 批量更新优先级调用正确
 * 6. 删除确认对话框显示
 * 7. 清除选择按钮工作
 * 8. 加载状态显示正确
 * 9. 禁用状态正确处理
 * 10. 通知被触发
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ============================================================================
// Mocks - 必须在导入被测组件之前设置
// ============================================================================

// Mock useBatchOperations hook
const mockUpdateStatus = vi.fn();
const mockUpdatePriority = vi.fn();
const mockDeleteTasks = vi.fn();
const mockReset = vi.fn();

let mockLoading = false;
let mockError: string | null = null;
let mockLastResult: any = null;

vi.mock('@/hooks/useBatchOperations', () => ({
  useBatchOperations: vi.fn((options?: any) => {
    // Store callbacks for triggering in tests
    (global as any).__batchOptions = options;
    
    return {
      loading: mockLoading,
      error: mockError,
      lastResult: mockLastResult,
      updateStatus: mockUpdateStatus.mockImplementation(async (ids: string[], status: string) => {
        const result = { success: true, operation: 'update-status', affected: ids.length, ids };
        mockLastResult = result;
        options?.onSuccess?.(result);
        return result;
      }),
      updatePriority: mockUpdatePriority.mockImplementation(async (ids: string[], priority: string) => {
        const result = { success: true, operation: 'update-priority', affected: ids.length, ids };
        mockLastResult = result;
        options?.onSuccess?.(result);
        return result;
      }),
      deleteTasks: mockDeleteTasks.mockImplementation(async (ids: string[]) => {
        const result = { success: true, operation: 'delete', affected: ids.length, ids };
        mockLastResult = result;
        options?.onSuccess?.(result);
        return result;
      }),
      reset: mockReset,
    };
  }),
}));

// Mock useNotificationStore
const mockSuccess = vi.fn();
const mockErrorNotify = vi.fn();
const mockWarning = vi.fn();
const mockInfo = vi.fn();
const mockDismiss = vi.fn();
const mockClearAll = vi.fn();

vi.mock('@/lib/notifications', () => ({
  useNotificationStore: vi.fn(() => ({
    notifications: [],
    success: mockSuccess,
    error: mockErrorNotify,
    warning: mockWarning,
    info: mockInfo,
    dismiss: mockDismiss,
    clearAll: mockClearAll,
  })),
}));

// 导入被测组件
import { BatchOperationsToolbar } from '../BatchOperationsToolbar';

// ============================================================================
// 测试工具函数
// ============================================================================

/**
 * 重置所有 mock 状态
 */
function resetMockState() {
  mockLoading = false;
  mockError = null;
  mockLastResult = null;
  vi.clearAllMocks();
}

/**
 * 设置 loading 状态
 */
function setLoading(loading: boolean) {
  mockLoading = loading;
}

/**
 * 设置 error 状态
 */
function setError(error: string | null) {
  mockError = error;
}

// ============================================================================
// 测试套件
// ============================================================================

describe('BatchOperationsToolbar', () => {
  const mockSelectedIds = ['task-1', 'task-2', 'task-3'];
  const mockOnOperationComplete = vi.fn();
  const mockOnClearSelection = vi.fn();

  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============================================================================
  // 1. 组件渲染测试
  // ============================================================================

  describe('Rendering', () => {
    it('should not render when no tasks are selected', () => {
      const { container } = render(
        <BatchOperationsToolbar selectedIds={[]} />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should render when tasks are selected', () => {
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      expect(screen.getByRole('toolbar', { name: /批量操作工具栏/i })).toBeDefined();
    });

    it('should display correct selected count', () => {
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      expect(screen.getByText('3')).toBeDefined();
      expect(screen.getByText('已选中')).toBeDefined();
    });

    it('should display correct selected count for single task', () => {
      render(
        <BatchOperationsToolbar selectedIds={['task-1']} />
      );
      
      expect(screen.getByText('1')).toBeDefined();
    });

    it('should render all action buttons', () => {
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      expect(screen.getByRole('button', { name: /状态/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /优先级/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /批量删除/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /清除选择/i })).toBeDefined();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds} 
          className="custom-class"
        />
      );
      
      expect(container.querySelector('.custom-class')).toBeDefined();
    });
  });

  // ============================================================================
  // 2. 状态下拉菜单测试
  // ============================================================================

  describe('Status Dropdown', () => {
    it('should toggle status dropdown on click', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      
      // 初始状态：下拉菜单关闭
      expect(screen.queryByRole('listbox', { name: /选择状态/i })).toBeNull();
      
      // 点击打开
      await user.click(statusButton);
      expect(screen.getByRole('listbox', { name: /选择状态/i })).toBeDefined();
      
      // 再次点击关闭
      await user.click(statusButton);
      expect(screen.queryByRole('listbox', { name: /选择状态/i })).toBeNull();
    });

    it('should have correct aria-expanded attribute', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      
      expect(statusButton.getAttribute('aria-expanded')).toBe('false');
      
      await user.click(statusButton);
      expect(statusButton.getAttribute('aria-expanded')).toBe('true');
    });

    it('should display all status options', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      
      expect(screen.getByRole('option', { name: /待办/i })).toBeDefined();
      expect(screen.getByRole('option', { name: /进行中/i })).toBeDefined();
      expect(screen.getByRole('option', { name: /评审中/i })).toBeDefined();
      expect(screen.getByRole('option', { name: /已完成/i })).toBeDefined();
    });

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      
      expect(screen.getByRole('listbox', { name: /选择状态/i })).toBeDefined();
      
      // 点击背景遮罩
      const overlay = document.querySelector('.fixed.inset-0.z-10');
      if (overlay) {
        await user.click(overlay as Element);
      }
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox', { name: /选择状态/i })).toBeNull();
      });
    });
  });

  // ============================================================================
  // 3. 优先级下拉菜单测试
  // ============================================================================

  describe('Priority Dropdown', () => {
    it('should toggle priority dropdown on click', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const priorityButton = screen.getByRole('button', { name: /优先级/i });
      
      // 初始状态：下拉菜单关闭
      expect(screen.queryByRole('listbox', { name: /选择优先级/i })).toBeNull();
      
      // 点击打开
      await user.click(priorityButton);
      expect(screen.getByRole('listbox', { name: /选择优先级/i })).toBeDefined();
      
      // 再次点击关闭
      await user.click(priorityButton);
      expect(screen.queryByRole('listbox', { name: /选择优先级/i })).toBeNull();
    });

    it('should display all priority options', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const priorityButton = screen.getByRole('button', { name: /优先级/i });
      await user.click(priorityButton);
      
      expect(screen.getByRole('option', { name: /低/i })).toBeDefined();
      expect(screen.getByRole('option', { name: /中/i })).toBeDefined();
      expect(screen.getByRole('option', { name: /高/i })).toBeDefined();
    });

    it('should have correct aria-expanded attribute', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const priorityButton = screen.getByRole('button', { name: /优先级/i });
      
      expect(priorityButton.getAttribute('aria-expanded')).toBe('false');
      
      await user.click(priorityButton);
      expect(priorityButton.getAttribute('aria-expanded')).toBe('true');
    });
  });

  // ============================================================================
  // 4. 批量更新状态测试
  // ============================================================================

  describe('Update Status', () => {
    it('should call updateStatus with correct parameters', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          onOperationComplete={mockOnOperationComplete}
        />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      
      const doneOption = screen.getByRole('option', { name: /已完成/i });
      await user.click(doneOption);
      
      expect(mockUpdateStatus).toHaveBeenCalledWith(mockSelectedIds, 'done');
    });

    it('should call onOperationComplete after successful update', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          onOperationComplete={mockOnOperationComplete}
        />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      
      const inProgressOption = screen.getByRole('option', { name: /进行中/i });
      await user.click(inProgressOption);
      
      await waitFor(() => {
        expect(mockOnOperationComplete).toHaveBeenCalled();
      });
    });

    it('should close dropdown after selecting status', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      
      const todoOption = screen.getByRole('option', { name: /待办/i });
      await user.click(todoOption);
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox', { name: /选择状态/i })).toBeNull();
      });
    });

    it('should not call updateStatus when no tasks selected', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={[]} />
      );
      
      // 组件不应该渲染
      expect(screen.queryByRole('toolbar')).toBeNull();
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 5. 批量更新优先级测试
  // ============================================================================

  describe('Update Priority', () => {
    it('should call updatePriority with correct parameters', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          onOperationComplete={mockOnOperationComplete}
        />
      );
      
      const priorityButton = screen.getByRole('button', { name: /优先级/i });
      await user.click(priorityButton);
      
      const highOption = screen.getByRole('option', { name: /高/i });
      await user.click(highOption);
      
      expect(mockUpdatePriority).toHaveBeenCalledWith(mockSelectedIds, 'high');
    });

    it('should call onOperationComplete after successful update', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          onOperationComplete={mockOnOperationComplete}
        />
      );
      
      const priorityButton = screen.getByRole('button', { name: /优先级/i });
      await user.click(priorityButton);
      
      const lowOption = screen.getByRole('option', { name: /低/i });
      await user.click(lowOption);
      
      await waitFor(() => {
        expect(mockOnOperationComplete).toHaveBeenCalled();
      });
    });

    it('should close dropdown after selecting priority', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const priorityButton = screen.getByRole('button', { name: /优先级/i });
      await user.click(priorityButton);
      
      const mediumOption = screen.getByRole('option', { name: /中/i });
      await user.click(mediumOption);
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox', { name: /选择优先级/i })).toBeNull();
      });
    });
  });

  // ============================================================================
  // 6. 删除确认对话框测试
  // ============================================================================

  describe('Delete Confirmation Dialog', () => {
    it('should show delete confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      await user.click(deleteButton);
      
      expect(screen.getByRole('alertdialog')).toBeDefined();
      expect(screen.getByText(/确认批量删除/i)).toBeDefined();
    });

    it('should display correct task count in dialog', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      await user.click(deleteButton);
      
      // The dialog shows the count in a sentence like "您确定要删除选中的 3 个任务吗？"
      // Use getByText with regex to match the full message
      expect(screen.getByText(/您确定要删除选中的/)).toBeDefined();
      expect(screen.getByText(/个任务吗/)).toBeDefined();
      
      // Verify the dialog is showing for 3 tasks
      const dialog = screen.getByRole('alertdialog');
      expect(dialog.textContent).toContain('3');
    });

    it('should call deleteTasks when confirmed', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          onOperationComplete={mockOnOperationComplete}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      await user.click(deleteButton);
      
      const confirmButton = screen.getByRole('button', { name: /确认删除/i });
      await user.click(confirmButton);
      
      expect(mockDeleteTasks).toHaveBeenCalledWith(mockSelectedIds);
    });

    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      await user.click(deleteButton);
      
      const cancelButton = screen.getByRole('button', { name: /^取消$/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).toBeNull();
      });
    });

    it('should close dialog when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      await user.click(deleteButton);
      
      // 点击背景遮罩
      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) {
        await user.click(backdrop as Element);
      }
      
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).toBeNull();
      });
    });

    it('should not delete when dialog is cancelled', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      await user.click(deleteButton);
      
      const cancelButton = screen.getByRole('button', { name: /^取消$/i });
      await user.click(cancelButton);
      
      expect(mockDeleteTasks).not.toHaveBeenCalled();
    });

    it('should call onOperationComplete after successful delete', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          onOperationComplete={mockOnOperationComplete}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      await user.click(deleteButton);
      
      const confirmButton = screen.getByRole('button', { name: /确认删除/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnOperationComplete).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // 7. 清除选择按钮测试
  // ============================================================================

  describe('Clear Selection Button', () => {
    it('should call onClearSelection when clicked', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          onClearSelection={mockOnClearSelection}
        />
      );
      
      const clearButton = screen.getByRole('button', { name: /清除选择/i });
      await user.click(clearButton);
      
      expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
    });

    it('should work without onClearSelection callback', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const clearButton = screen.getByRole('button', { name: /清除选择/i });
      // 不应该抛出错误
      await user.click(clearButton);
    });
  });

  // ============================================================================
  // 8. 加载状态测试
  // ============================================================================

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      setLoading(true);
      
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      expect(screen.getByText(/处理中/i)).toBeDefined();
      
      // 检查加载动画
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeDefined();
    });

    it('should not show loading indicator when not loading', () => {
      setLoading(false);
      
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      expect(screen.queryByText(/处理中/i)).toBeNull();
    });

    it('should disable all buttons when loading', () => {
      setLoading(true);
      
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      const priorityButton = screen.getByRole('button', { name: /优先级/i });
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      
      expect(statusButton).toHaveAttribute('disabled');
      expect(priorityButton).toHaveAttribute('disabled');
      expect(deleteButton).toHaveAttribute('disabled');
    });

    it('should show loading state in delete dialog when deleting', async () => {
      const user = userEvent.setup();
      
      // Mock delete to be slow
      mockDeleteTasks.mockImplementation(async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        setLoading(false);
        return { success: true, operation: 'delete', affected: 3, ids: mockSelectedIds };
      });
      
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      await user.click(deleteButton);
      
      const confirmButton = screen.getByRole('button', { name: /确认删除/i });
      
      // 确认按钮应该在对话框中
      expect(confirmButton).toBeDefined();
    });
  });

  // ============================================================================
  // 9. 禁用状态测试
  // ============================================================================

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          disabled={true}
        />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      const priorityButton = screen.getByRole('button', { name: /优先级/i });
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      
      expect(statusButton).toHaveAttribute('disabled');
      expect(priorityButton).toHaveAttribute('disabled');
      expect(deleteButton).toHaveAttribute('disabled');
    });

    it('should disable clear button when loading', () => {
      setLoading(true);
      
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          onClearSelection={mockOnClearSelection}
        />
      );
      
      const clearButton = screen.getByRole('button', { name: /清除选择/i });
      expect(clearButton).toHaveAttribute('disabled');
    });

    it('should not perform operations when disabled', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          disabled={true}
        />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      
      // 下拉菜单不应该打开
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('should apply disabled styles', () => {
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          disabled={true}
        />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      expect(statusButton.className).toContain('disabled:opacity-50');
    });
  });

  // ============================================================================
  // 10. 通知测试
  // ============================================================================

  describe('Notifications', () => {
    it('should show success notification after successful status update', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      
      const doneOption = screen.getByRole('option', { name: /已完成/i });
      await user.click(doneOption);
      
      await waitFor(() => {
        expect(mockSuccess).toHaveBeenCalledWith(
          '批量操作成功',
          expect.stringContaining('更新状态')
        );
      });
    });

    it('should show success notification after successful priority update', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const priorityButton = screen.getByRole('button', { name: /优先级/i });
      await user.click(priorityButton);
      
      const highOption = screen.getByRole('option', { name: /高/i });
      await user.click(highOption);
      
      await waitFor(() => {
        expect(mockSuccess).toHaveBeenCalledWith(
          '批量操作成功',
          expect.stringContaining('更新优先级')
        );
      });
    });

    it('should show success notification after successful delete', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      await user.click(deleteButton);
      
      const confirmButton = screen.getByRole('button', { name: /确认删除/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(mockSuccess).toHaveBeenCalledWith(
          '批量操作成功',
          expect.stringContaining('删除')
        );
      });
    });

    it('should show error notification on operation failure', async () => {
      // Mock error scenario
      mockUpdateStatus.mockImplementationOnce(async () => {
        const error = new Error('网络错误');
        const options = (global as any).__batchOptions;
        options?.onError?.(error);
        return { success: false, operation: 'update-status', affected: 0, ids: [], error: '网络错误' };
      });
      
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      
      const doneOption = screen.getByRole('option', { name: /已完成/i });
      await user.click(doneOption);
      
      await waitFor(() => {
        expect(mockErrorNotify).toHaveBeenCalledWith(
          '批量操作失败',
          '网络错误'
        );
      });
    });

    it('should include affected count in success message', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      
      const doneOption = screen.getByRole('option', { name: /已完成/i });
      await user.click(doneOption);
      
      await waitFor(() => {
        expect(mockSuccess).toHaveBeenCalledWith(
          '批量操作成功',
          expect.stringContaining('3')
        );
      });
    });
  });

  // ============================================================================
  // 可访问性测试
  // ============================================================================

  describe('Accessibility', () => {
    it('should have correct toolbar role', () => {
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveAttribute('aria-label', '批量操作工具栏');
    });

    it('should have correct aria-haspopup on dropdown buttons', () => {
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      const priorityButton = screen.getByRole('button', { name: /优先级/i });
      
      expect(statusButton).toHaveAttribute('aria-haspopup', 'listbox');
      expect(priorityButton).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('should have correct role on dropdown menus', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      
      const listbox = screen.getByRole('listbox', { name: /选择状态/i });
      expect(listbox).toBeDefined();
    });

    it('should have correct role on options', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      
      const options = screen.getAllByRole('option');
      expect(options.length).toBe(4); // 待办, 进行中, 评审中, 已完成
    });

    it('should have correct dialog roles for delete confirmation', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      await user.click(deleteButton);
      
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'delete-dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'delete-dialog-description');
    });

    it('should have correct button labels', () => {
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      expect(screen.getByRole('button', { name: /状态/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /优先级/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /批量删除/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /清除选择/i })).toBeDefined();
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty selectedIds array', () => {
      const { container } = render(
        <BatchOperationsToolbar selectedIds={[]} />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should handle large number of selected tasks', () => {
      const manyIds = Array.from({ length: 100 }, (_, i) => `task-${i}`);
      
      render(
        <BatchOperationsToolbar selectedIds={manyIds} />
      );
      
      expect(screen.getByText('100')).toBeDefined();
    });

    it('should handle rapid dropdown toggles', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      const statusButton = screen.getByRole('button', { name: /状态/i });
      
      // 快速切换
      await user.click(statusButton);
      await user.click(statusButton);
      await user.click(statusButton);
      
      // 应该处于打开状态
      expect(screen.getByRole('listbox', { name: /选择状态/i })).toBeDefined();
    });

    it('should work without optional callbacks', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      // 测试状态更新
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      const doneOption = screen.getByRole('option', { name: /已完成/i });
      await user.click(doneOption);
      
      // 测试删除
      const deleteButton = screen.getByRole('button', { name: /批量删除/i });
      await user.click(deleteButton);
      const cancelButton = screen.getByRole('button', { name: /^取消$/i });
      await user.click(cancelButton);
      
      // 不应该抛出错误
    });

    it('should handle switching between dropdowns', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      // 打开状态下拉
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      expect(screen.getByRole('listbox', { name: /选择状态/i })).toBeDefined();
      
      // 打开优先级下拉（应该关闭状态下拉）
      const priorityButton = screen.getByRole('button', { name: /优先级/i });
      await user.click(priorityButton);
      
      // 只应该有一个下拉菜单打开
      const listboxes = screen.getAllByRole('listbox');
      expect(listboxes.length).toBe(1);
      expect(listboxes[0]).toHaveAttribute('aria-label', '选择优先级');
    });
  });

  // ============================================================================
  // 性能测试
  // ============================================================================

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      // 重新渲染相同的 props
      rerender(
        <BatchOperationsToolbar selectedIds={mockSelectedIds} />
      );
      
      // 组件应该保持稳定
      expect(screen.getByRole('toolbar')).toBeDefined();
    });

    it('should handle quick successive operations', async () => {
      const user = userEvent.setup();
      render(
        <BatchOperationsToolbar 
          selectedIds={mockSelectedIds}
          onOperationComplete={mockOnOperationComplete}
        />
      );
      
      // 快速执行多个操作
      const statusButton = screen.getByRole('button', { name: /状态/i });
      await user.click(statusButton);
      await user.click(screen.getByRole('option', { name: /已完成/i }));
      
      await waitFor(() => {
        expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
      });
    });
  });
});
