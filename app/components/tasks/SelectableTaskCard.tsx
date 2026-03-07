/**
 * SelectableTaskCard - 可选择的任务卡片组件
 * 
 * 功能：
 * - 长按进入选择模式
 * - 点击复选框切换选择状态
 * - 选中时显示高亮边框
 * - 支持键盘操作 (空格键切换选择)
 * 
 * @example
 * <SelectableTaskCard
 *   task={task}
 *   onEdit={(task) => console.log('edit', task)}
 * />
 */

'use client';

import React, { memo, useCallback, useState, useRef } from 'react';
import { Task } from '@/lib/tasks/types';
import { useTaskSelection } from '@/contexts/TaskSelectionContext';
import { TaskCard } from './TaskCard';

// ============================================================================
// 类型定义
// ============================================================================

interface SelectableTaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
  showAssignee?: boolean;
  className?: string;
  /** 长按进入选择模式的延迟时间 (ms) */
  longPressDelay?: number;
  /** 是否禁用选择功能 */
  disableSelection?: boolean;
}

// ============================================================================
// 复选框组件
// ============================================================================

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel: string;
}

const Checkbox = memo(function Checkbox({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`
        flex-shrink-0 w-5 h-5 rounded border-2
        flex items-center justify-center
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${checked
          ? 'bg-blue-500 border-blue-500 dark:bg-blue-600 dark:border-blue-600'
          : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-500'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {checked && (
        <svg
          className="w-3 h-3 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </button>
  );
});

// ============================================================================
// 主组件
// ============================================================================

export const SelectableTaskCard = memo(function SelectableTaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  showAssignee = true,
  className = '',
  longPressDelay = 500,
  disableSelection = false,
}: SelectableTaskCardProps) {
  const {
    isSelected,
    toggleSelection,
    isSelectionMode,
    enterSelectionMode,
  } = useTaskSelection();

  const selected = isSelected(task.id);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // 清除长按定时器
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  // 开始长按
  const handleLongPressStart = useCallback(() => {
    if (disableSelection || isSelectionMode) return;
    
    setIsLongPressing(true);
    longPressTimerRef.current = setTimeout(() => {
      enterSelectionMode();
      toggleSelection(task.id);
      setIsLongPressing(false);
    }, longPressDelay);
  }, [disableSelection, isSelectionMode, enterSelectionMode, toggleSelection, task.id, longPressDelay]);

  // 结束长按
  const handleLongPressEnd = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  // 处理卡片点击
  const handleCardClick = useCallback(() => {
    if (isSelectionMode && !disableSelection) {
      toggleSelection(task.id);
    }
  }, [isSelectionMode, disableSelection, toggleSelection, task.id]);

  // 处理复选框切换
  const handleCheckboxToggle = useCallback(() => {
    if (!disableSelection) {
      toggleSelection(task.id);
    }
  }, [disableSelection, toggleSelection, task.id]);

  // 处理键盘操作
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' && isSelectionMode && !disableSelection) {
        e.preventDefault();
        toggleSelection(task.id);
      }
    },
    [isSelectionMode, disableSelection, toggleSelection, task.id]
  );

  // 处理编辑
  const handleEdit = useCallback(
    (task: Task) => {
      if (isSelectionMode) {
        toggleSelection(task.id);
      } else {
        onEdit?.(task);
      }
    },
    [isSelectionMode, toggleSelection, task.id, onEdit]
  );

  // 处理删除
  const handleDelete = useCallback(
    (taskId: string) => {
      if (isSelectionMode) {
        toggleSelection(taskId);
      } else {
        onDelete?.(taskId);
      }
    },
    [isSelectionMode, toggleSelection, onDelete]
  );

  return (
    <div
      className={`
        relative transition-all duration-200
        ${selected ? 'ring-2 ring-blue-500 rounded-lg' : ''}
        ${isLongPressing ? 'scale-[0.98]' : ''}
      `}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={isSelectionMode ? 0 : -1}
      role={isSelectionMode ? 'option' : undefined}
      aria-selected={isSelectionMode ? selected : undefined}
    >
      {/* 选择模式下显示复选框 */}
      {isSelectionMode && !disableSelection && (
        <div className="absolute top-3 left-3 z-10">
          <Checkbox
            checked={selected}
            onChange={handleCheckboxToggle}
            ariaLabel={`选择任务: ${task.title}`}
          />
        </div>
      )}

      {/* 任务卡片 */}
      <div className={isSelectionMode ? 'pl-10' : ''}>
        <TaskCard
          task={task}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={onStatusChange}
          showAssignee={showAssignee}
          className={className}
        />
      </div>

      {/* 长按指示器 */}
      {isLongPressing && (
        <div
          className="absolute inset-0 bg-blue-500/10 rounded-lg pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
});

export default SelectableTaskCard;
