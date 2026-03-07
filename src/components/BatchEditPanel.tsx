/**
 * @fileoverview 批量编辑面板组件
 * @description 提供批量操作 UI 和确认对话框
 */

'use client';

import React, { useState, memo } from 'react';

// ============================================================================
// 类型定义
// ============================================================================

export type BatchActionType = 
  | 'change-status'
  | 'assign-task'
  | 'delete'
  | 'export'
  | 'duplicate';

export interface BatchAction {
  id: BatchActionType;
  label: string;
  icon: string;
  variant: 'default' | 'danger' | 'success' | 'warning';
  confirmMessage?: string;
}

export interface BatchEditPanelProps {
  /** 选中数量 */
  selectionCount: number;
  /** 可用操作 */
  actions?: BatchAction[];
  /** 执行操作回调 */
  onAction: (actionId: BatchActionType) => Promise<void> | void;
  /** 全选回调 */
  onSelectAll?: () => void;
  /** 取消全选回调 */
  onDeselectAll?: () => void;
  /** 是否全选 */
  isAllSelected?: boolean;
  /** 取消选择回调 */
  onCancel?: () => void;
  /** 是否加载中 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// 默认操作配置
// ============================================================================

const DEFAULT_ACTIONS: BatchAction[] = [
  {
    id: 'change-status',
    label: '修改状态',
    icon: '🔄',
    variant: 'default',
  },
  {
    id: 'assign-task',
    label: '分配任务',
    icon: '📋',
    variant: 'default',
  },
  {
    id: 'export',
    label: '导出数据',
    icon: '📤',
    variant: 'success',
  },
  {
    id: 'duplicate',
    label: '复制',
    icon: '📑',
    variant: 'warning',
  },
  {
    id: 'delete',
    label: '删除',
    icon: '🗑️',
    variant: 'danger',
    confirmMessage: '确定要删除选中的项目吗？此操作不可撤销。',
  },
];

// ============================================================================
// 确认对话框组件
// ============================================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  variant = 'default',
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const confirmBtnClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* 对话框 */}
      <div className="relative bg-white dark:bg-zinc-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-700 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${confirmBtnClass}`}
          >
            {isLoading ? '处理中...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 批量编辑面板组件
// ============================================================================

function BatchEditPanelBase({
  selectionCount,
  actions = DEFAULT_ACTIONS,
  onAction,
  onSelectAll,
  onDeselectAll,
  isAllSelected = false,
  onCancel,
  isLoading = false,
  className = '',
}: BatchEditPanelProps) {
  const [pendingAction, setPendingAction] = useState<BatchAction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // 处理操作点击
  const handleActionClick = (action: BatchAction) => {
    if (action.confirmMessage) {
      setPendingAction(action);
    } else {
      executeAction(action);
    }
  };

  // 执行操作
  const executeAction = async (action: BatchAction) => {
    setIsExecuting(true);
    try {
      await onAction(action.id);
      setPendingAction(null);
    } catch (error) {
      console.error(`Action ${action.id} failed:`, error);
    } finally {
      setIsExecuting(false);
    }
  };

  // 获取按钮样式
  const getButtonVariant = (variant: BatchAction['variant']) => {
    const variants = {
      default:
        'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-600',
      danger:
        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50',
      success:
        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50',
      warning:
        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50',
    };
    return variants[variant];
  };

  if (selectionCount === 0) return null;

  return (
    <>
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}
      >
        {/* 进度指示条 */}
        <div className="h-1 bg-gray-200 dark:bg-zinc-700">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${Math.min(100, selectionCount * 10)}%` }}
          />
        </div>

        {/* 操作面板 */}
        <div className="bg-white dark:bg-zinc-800 border-t border-gray-200 dark:border-zinc-700 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* 左侧：选择信息 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-semibold text-sm">
                    {selectionCount}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    已选中
                  </span>
                </div>

                {/* 全选/取消全选 */}
                {onSelectAll && onDeselectAll && (
                  <button
                    onClick={isAllSelected ? onDeselectAll : onSelectAll}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {isAllSelected ? '取消全选' : '全选'}
                  </button>
                )}

                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    取消选择
                  </button>
                )}
              </div>

              {/* 右侧：操作按钮 */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    disabled={isLoading || isExecuting}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${getButtonVariant(
                      action.variant
                    )}`}
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={`确认${pendingAction?.label || '操作'}`}
        message={pendingAction?.confirmMessage || ''}
        confirmLabel={pendingAction?.label || '确认'}
        variant={pendingAction?.variant === 'danger' ? 'danger' : 'default'}
        onConfirm={() => pendingAction && executeAction(pendingAction)}
        onCancel={() => setPendingAction(null)}
        isLoading={isExecuting}
      />
    </>
  );
}

export const BatchEditPanel = memo(BatchEditPanelBase);

// ============================================================================
// 状态选择器组件
// ============================================================================

export interface StatusSelectorProps {
  currentStatus?: string;
  onStatusChange: (status: string) => void;
  options?: Array<{ value: string; label: string; emoji: string }>;
}

const DEFAULT_STATUS_OPTIONS = [
  { value: 'working', label: '工作中', emoji: '🔥' },
  { value: 'busy', label: '忙碌', emoji: '⚡' },
  { value: 'idle', label: '空闲', emoji: '😊' },
  { value: 'offline', label: '离线', emoji: '⚫' },
];

export function StatusSelector({
  currentStatus,
  onStatusChange,
  options = DEFAULT_STATUS_OPTIONS,
}: StatusSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onStatusChange(option.value)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            currentStatus === option.value
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-600'
          }`}
        >
          {option.emoji} {option.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// 任务分配对话框
// ============================================================================

export interface TaskAssignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (taskId: string) => Promise<void> | void;
  availableTasks?: Array<{ id: string; title: string }>;
  isLoading?: boolean;
}

export function TaskAssignDialog({
  isOpen,
  onClose,
  onAssign,
  availableTasks = [],
  isLoading,
}: TaskAssignDialogProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [customTask, setCustomTask] = useState('');

  if (!isOpen) return null;

  const handleAssign = async () => {
    const taskId = selectedTaskId || customTask;
    if (taskId) {
      await onAssign(taskId);
      setSelectedTaskId('');
      setCustomTask('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-zinc-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          分配任务
        </h3>

        {/* 任务选择 */}
        {availableTasks.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              选择任务
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- 选择任务 --</option>
              {availableTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 自定义任务输入 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            或输入新任务
          </label>
          <input
            type="text"
            value={customTask}
            onChange={(e) => setCustomTask(e.target.value)}
            placeholder="输入任务描述..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-700 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleAssign}
            disabled={isLoading || (!selectedTaskId && !customTask)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? '分配中...' : '确认分配'}
          </button>
        </div>
      </div>
    </div>
  );
}
