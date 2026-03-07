'use client';

import React, { memo, useCallback } from 'react';
import { Task } from '@/lib/tasks/types';
import { PriorityBadge } from './PriorityBadge';
import { TagBadge } from './TagBadge';
import { formatDueDate, isTaskOverdue, isTaskDueSoon } from '@/lib/tasks/utils';
import { STATUS_CONFIG } from '@/lib/tasks/types';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
  showAssignee?: boolean;
  className?: string;
}

/**
 * 任务卡片组件 - 性能优化版本
 * 
 * 优化措施:
 * 1. 使用 React.memo 防止不必要的重渲染
 * 2. 使用 useCallback 缓存事件处理函数
 * 3. 将状态配置移到组件外部
 */
const TaskCardComponent = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  showAssignee = true,
  className = '',
}: TaskCardProps) => {
  const isOverdue = isTaskOverdue(task);
  const isDueSoon = isTaskDueSoon(task);
  const statusConfig = STATUS_CONFIG[task.status];

  // 使用 useCallback 缓存事件处理函数
  const handleEdit = useCallback(() => {
    onEdit?.(task);
  }, [onEdit, task]);

  const handleDelete = useCallback(() => {
    onDelete?.(task.id);
  }, [onDelete, task.id]);

  const handleStatusChange = useCallback(
    (status: Task['status']) => () => {
      onStatusChange?.(task.id, status);
    },
    [onStatusChange, task.id]
  );

  return (
    <article
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700
        hover:shadow-lg transition-shadow p-4 sm:p-5
        ${isOverdue ? 'border-l-4 border-l-red-500' : ''}
        ${className}
      `}
      role="article"
      aria-label={`任务: ${task.title}`}
    >
      {/* 头部 */}
      <TaskCardHeader
        title={task.title}
        description={task.description}
        onEdit={handleEdit}
        onDelete={handleDelete}
        showEdit={!!onEdit}
        showDelete={!!onDelete}
      />

      {/* 标签 */}
      {task.tags.length > 0 && (
        <TaskCardTags tags={task.tags} />
      )}

      {/* 元信息 */}
      <TaskCardMeta
        priority={task.priority}
        statusConfig={statusConfig}
        dueDate={task.dueDate}
        isOverdue={isOverdue}
        isDueSoon={isDueSoon}
      />

      {/* 负责人 */}
      {showAssignee && task.assignee && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          负责人: {task.assignee}
        </div>
      )}

      {/* 状态切换 */}
      {onStatusChange && task.status !== 'done' && (
        <TaskCardStatusButtons
          currentStatus={task.status}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* 完成时间 */}
      {task.completedAt && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          ✅ 完成于 {new Date(task.completedAt).toLocaleDateString('zh-CN')}
        </div>
      )}
    </article>
  );
};

// ============================================================================
// 子组件 - 进一步拆分以优化渲染
// ============================================================================

interface TaskCardHeaderProps {
  title: string;
  description?: string;
  onEdit: () => void;
  onDelete: () => void;
  showEdit: boolean;
  showDelete: boolean;
}

const TaskCardHeader = memo(function TaskCardHeader({
  title,
  description,
  onEdit,
  onDelete,
  showEdit,
  showDelete,
}: TaskCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {description}
          </p>
        )}
      </div>

      <div className="flex gap-1.5 flex-shrink-0">
        {showEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400
              rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="编辑任务"
          >
            <EditIcon />
          </button>
        )}
        {showDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400
              rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="删除任务"
          >
            <DeleteIcon />
          </button>
        )}
      </div>
    </div>
  );
});

interface TaskCardTagsProps {
  tags: Task['tags'];
}

const TaskCardTags = memo(function TaskCardTags({ tags }: TaskCardTagsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} size="sm" />
      ))}
    </div>
  );
});

interface TaskCardMetaProps {
  priority: Task['priority'];
  statusConfig: { label: string; color: string };
  dueDate?: Date;
  isOverdue: boolean;
  isDueSoon: boolean;
}

const TaskCardMeta = memo(function TaskCardMeta({
  priority,
  statusConfig,
  dueDate,
  isOverdue,
  isDueSoon,
}: TaskCardMetaProps) {
  const statusColorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <PriorityBadge priority={priority} size="sm" />
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColorClasses[statusConfig.color]}`}
      >
        {statusConfig.label}
      </span>
      {dueDate && (
        <span
          className={`
            text-xs font-medium
            ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}
            ${isDueSoon ? 'text-orange-600 dark:text-orange-400' : ''}
            ${!isOverdue && !isDueSoon ? 'text-gray-600 dark:text-gray-400' : ''}
          `}
        >
          📅 {formatDueDate(dueDate)}
        </span>
      )}
    </div>
  );
});

interface TaskCardStatusButtonsProps {
  currentStatus: Task['status'];
  onStatusChange: (status: Task['status']) => () => void;
}

const TaskCardStatusButtons = memo(function TaskCardStatusButtons({
  currentStatus,
  onStatusChange,
}: TaskCardStatusButtonsProps) {
  const nextStatuses: Task['status'][] = ['in_progress', 'review', 'done'];

  return (
    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex gap-2 flex-wrap">
        {nextStatuses.map((status) => {
          const config = STATUS_CONFIG[status];
          const isActive = currentStatus === status;

          if (isActive) return null;

          return (
            <button
              key={status}
              onClick={onStatusChange(status)}
              className="px-3 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600
                hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              → {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ============================================================================
// 图标组件
// ============================================================================

const EditIcon = memo(function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
});

const DeleteIcon = memo(function DeleteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
});

// ============================================================================
// 导出
// ============================================================================

// 使用 React.memo 包装并自定义比较函数
export const TaskCard = memo(TaskCardComponent, (prevProps, nextProps) => {
  // 自定义比较：只在 task 相关属性变化时重新渲染
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.description === nextProps.task.description &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.updatedAt === nextProps.task.updatedAt &&
    prevProps.showAssignee === nextProps.showAssignee &&
    prevProps.className === nextProps.className
  );
});
