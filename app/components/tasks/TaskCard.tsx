'use client';

import React from 'react';
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
 * 任务卡片组件
 */
export function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  showAssignee = true,
  className = '',
}: TaskCardProps) {
  const isOverdue = isTaskOverdue(task);
  const isDueSoon = isTaskDueSoon(task);
  const statusConfig = STATUS_CONFIG[task.status];

  const statusColorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };

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
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-1.5 flex-shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400
                rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="编辑任务"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400
                rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="删除任务"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 标签 */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {task.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} size="sm" />
          ))}
        </div>
      )}

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* 优先级 */}
        <PriorityBadge priority={task.priority} size="sm" />

        {/* 状态 */}
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColorClasses[statusConfig.color]}`}
        >
          {statusConfig.label}
        </span>

        {/* 截止日期 */}
        {task.dueDate && (
          <span
            className={`
              text-xs font-medium
              ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}
              ${isDueSoon ? 'text-orange-600 dark:text-orange-400' : ''}
              ${!isOverdue && !isDueSoon ? 'text-gray-600 dark:text-gray-400' : ''}
            `}
          >
            📅 {formatDueDate(task.dueDate)}
          </span>
        )}
      </div>

      {/* 负责人 */}
      {showAssignee && task.assignee && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          负责人: {task.assignee}
        </div>
      )}

      {/* 状态切换 */}
      {onStatusChange && task.status !== 'done' && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 flex-wrap">
            {(['in_progress', 'review', 'done'] as const).map((status) => {
              const config = STATUS_CONFIG[status];
              const isActive = task.status === status;

              if (isActive) return null;

              return (
                <button
                  key={status}
                  onClick={() => onStatusChange(task.id, status)}
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
      )}

      {/* 完成时间 */}
      {task.completedAt && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          ✅ 完成于 {new Date(task.completedAt).toLocaleDateString('zh-CN')}
        </div>
      )}
    </article>
  );
}
