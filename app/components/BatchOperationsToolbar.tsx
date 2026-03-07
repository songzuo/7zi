'use client';

import React, { useState, useCallback, memo, useRef, useMemo } from 'react';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { useNotificationStore } from '@/lib/notifications';
import { TaskStatus, TaskPriority, STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/tasks/types';

// ============================================================================
// 类型定义
// ============================================================================

interface BatchOperationsToolbarProps {
  /** 已选中的任务 ID 列表 */
  selectedIds: string[];
  /** 操作完成后回调 */
  onOperationComplete?: () => void;
  /** 清除选择回调 */
  onClearSelection?: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// 状态和优先级配置
// ============================================================================

const STATUS_OPTIONS: Array<{
  value: TaskStatus;
  label: string;
  icon: string;
  colorClass: string;
}> = [
  { value: 'todo', label: '待办', icon: '📋', colorClass: 'bg-gray-500 hover:bg-gray-600' },
  { value: 'in_progress', label: '进行中', icon: '🔄', colorClass: 'bg-blue-500 hover:bg-blue-600' },
  { value: 'review', label: '评审中', icon: '👀', colorClass: 'bg-purple-500 hover:bg-purple-600' },
  { value: 'done', label: '已完成', icon: '✅', colorClass: 'bg-green-500 hover:bg-green-600' },
];

const PRIORITY_OPTIONS: Array<{
  value: TaskPriority;
  label: string;
  icon: string;
  colorClass: string;
}> = [
  { value: 'low', label: '低', icon: '🟢', colorClass: 'bg-green-500 hover:bg-green-600' },
  { value: 'medium', label: '中', icon: '🟡', colorClass: 'bg-yellow-500 hover:bg-yellow-600' },
  { value: 'high', label: '高', icon: '🔴', colorClass: 'bg-red-500 hover:bg-red-600' },
];

// ============================================================================
// 主组件
// ============================================================================

/**
 * 批量操作工具栏组件
 * 
 * Features:
 * - 显示已选中任务数量
 * - 批量更新状态按钮（待办/进行中/评审中/已完成）
 * - 批量更新优先级按钮（低/中/高）
 * - 批量删除按钮（带确认对话框）
 * - 操作成功/失败提示
 * - 加载状态显示
 * - 响应式设计
 * 
 * @performance
 * - 使用 React.memo 避免不必要的重渲染
 * - 使用 useRef 稳定回调引用
 * - 使用 useMemo 缓存计算结果
 * - 状态和优先级选项提取为模块级常量
 */
export const BatchOperationsToolbar: React.FC<BatchOperationsToolbarProps> = memo(function BatchOperationsToolbar({
  selectedIds,
  onOperationComplete,
  onClearSelection,
  disabled = false,
  className = '',
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'priority' | null>(null);
  
  // 使用 ref 稳定回调引用，避免每次渲染创建新对象
  const callbacksRef = useRef({
    onOperationComplete,
    onClearSelection,
  });
  callbacksRef.current = { onOperationComplete, onClearSelection };
  
  // 获取 notification store
  const notification = useNotificationStore();
  const notificationRef = useRef(notification);
  notificationRef.current = notification;
  
  // 使用 useMemo 缓存回调对象，避免 useBatchOptions 每次创建新对象
  const batchOptions = useMemo(() => ({
    onSuccess: (result: { operation: string; affected: number }) => {
      const operationLabels: Record<string, string> = {
        'update-status': '更新状态',
        'update-priority': '更新优先级',
        'delete': '删除',
      };
      notificationRef.current.success(
        `批量操作成功`,
        `成功${operationLabels[result.operation] || '处理'}了 ${result.affected} 个任务`
      );
      callbacksRef.current.onOperationComplete?.();
    },
    onError: (err: Error) => {
      notificationRef.current.error('批量操作失败', err.message);
    },
  }), []); // 空依赖，使用 ref 替代

  const { loading, error, updateStatus, updatePriority, deleteTasks } = useBatchOperations(batchOptions);

  // 是否有选中任务
  const hasSelection = selectedIds.length > 0;
  const isDisabled = disabled || loading || !hasSelection;

  // 批量更新状态
  const handleStatusChange = useCallback(
    async (status: TaskStatus) => {
      if (!hasSelection) return;
      await updateStatus(selectedIds, status);
      setActiveDropdown(null);
    },
    [selectedIds, hasSelection, updateStatus]
  );

  // 批量更新优先级
  const handlePriorityChange = useCallback(
    async (priority: TaskPriority) => {
      if (!hasSelection) return;
      await updatePriority(selectedIds, priority);
      setActiveDropdown(null);
    },
    [selectedIds, hasSelection, updatePriority]
  );

  // 批量删除
  const handleDelete = useCallback(async () => {
    if (!hasSelection) return;
    await deleteTasks(selectedIds);
    setShowDeleteConfirm(false);
  }, [selectedIds, hasSelection, deleteTasks]);

  // 切换下拉菜单
  const toggleDropdown = useCallback(
    (dropdown: 'status' | 'priority') => {
      setActiveDropdown((current) => (current === dropdown ? null : dropdown));
    },
    []
  );

  // 关闭下拉菜单
  const closeDropdown = useCallback(() => setActiveDropdown(null), []);

  // 清除选择
  const handleClearSelection = useCallback(() => {
    onClearSelection?.();
  }, [onClearSelection]);

  if (!hasSelection) {
    return null;
  }

  return (
    <>
      {/* 背景遮罩（关闭下拉菜单） */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={closeDropdown}
          aria-hidden="true"
        />
      )}

      {/* 工具栏主体 */}
      <div
        className={`
          fixed bottom-6 left-1/2 -translate-x-1/2 z-20
          bg-white dark:bg-gray-800 
          rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700
          px-6 py-4
          flex items-center gap-4
          transition-all duration-300 ease-out
          animate-slide-up
          ${className}
        `}
        role="toolbar"
        aria-label="批量操作工具栏"
      >
        {/* 选中数量 */}
        <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {selectedIds.length}
            </span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            已选中
          </span>
        </div>

        {/* 状态更新下拉按钮 */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('status')}
            disabled={isDisabled}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg
              text-sm font-medium text-white
              bg-blue-500 hover:bg-blue-600 
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
              ${activeDropdown === 'status' ? 'ring-2 ring-blue-300' : ''}
            `}
            aria-haspopup="listbox"
            aria-expanded={activeDropdown === 'status'}
          >
            <span>状态</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 状态下拉菜单 */}
          {activeDropdown === 'status' && (
            <div
              className="absolute bottom-full mb-2 left-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-30"
              role="listbox"
              aria-label="选择状态"
            >
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  disabled={loading}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-left
                    text-sm text-gray-700 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  role="option"
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 优先级更新下拉按钮 */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('priority')}
            disabled={isDisabled}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg
              text-sm font-medium text-white
              bg-amber-500 hover:bg-amber-600 
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
              ${activeDropdown === 'priority' ? 'ring-2 ring-amber-300' : ''}
            `}
            aria-haspopup="listbox"
            aria-expanded={activeDropdown === 'priority'}
          >
            <span>优先级</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 优先级下拉菜单 */}
          {activeDropdown === 'priority' && (
            <div
              className="absolute bottom-full mb-2 left-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-30"
              role="listbox"
              aria-label="选择优先级"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePriorityChange(option.value)}
                  disabled={loading}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-left
                    text-sm text-gray-700 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  role="option"
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 删除按钮 */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDisabled}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg
            text-sm font-medium text-white
            bg-red-500 hover:bg-red-600 
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          `}
          aria-label="批量删除"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>删除</span>
        </button>

        {/* 清除选择按钮 */}
        <button
          onClick={handleClearSelection}
          disabled={loading}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg
            text-sm font-medium text-gray-600 dark:text-gray-400
            bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          `}
          aria-label="清除选择"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="hidden sm:inline">取消</span>
        </button>

        {/* 加载指示器 */}
        {loading && (
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-gray-700">
            <svg
              className="animate-spin w-5 h-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">处理中...</span>
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <DeleteConfirmDialog
          count={selectedIds.length}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={loading}
        />
      )}
    </>
  );
});

// ============================================================================
// 删除确认对话框
// ============================================================================

interface DeleteConfirmDialogProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

/**
 * 删除确认对话框
 * @performance 使用 React.memo 避免父组件状态变化时重渲染
 */
const DeleteConfirmDialog = memo(function DeleteConfirmDialog({
  count,
  onConfirm,
  onCancel,
  loading,
}: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* 对话框 */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full mx-4 animate-scale-in"
        role="alertdialog"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        {/* 警告图标 */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* 标题 */}
        <h3 id="delete-dialog-title" className="text-lg font-semibold text-center text-gray-900 dark:text-gray-100 mb-2">
          确认批量删除
        </h3>

        {/* 描述 */}
        <p id="delete-dialog-description" className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
          您确定要删除选中的 <span className="font-semibold text-red-600 dark:text-red-400">{count}</span> 个任务吗？此操作无法撤销。
        </p>

        {/* 按钮组 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? '删除中...' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// CSS 动画（需要添加到 globals.css）
// ============================================================================

export const BATCH_TOOLBAR_ANIMATIONS = `
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out forwards;
}
`;

export default BatchOperationsToolbar;
