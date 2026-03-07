'use client';

/**
 * 最近任务组件
 */

import React, { memo, useMemo } from 'react';
import type { RecentTask } from '@/app/users/[userId]/dashboard/page';

interface RecentTasksProps {
  tasks: RecentTask[];
  maxItems?: number;
}

// 状态配置
const STATUS_CONFIG = {
  todo: {
    label: '待办',
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
  in_progress: {
    label: '进行中',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  completed: {
    label: '已完成',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
  },
  blocked: {
    label: '阻塞',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
} as const;

// 优先级配置
const PRIORITY_CONFIG = {
  low: { label: '低', color: 'text-gray-500' },
  medium: { label: '中', color: 'text-yellow-500' },
  high: { label: '高', color: 'text-orange-500' },
  urgent: { label: '紧急', color: 'text-red-500' },
} as const;

// ============================================================================
// 单个任务项
// ============================================================================

interface TaskItemProps {
  task: RecentTask;
}

const TaskItem = memo(function TaskItem({ task }: TaskItemProps) {
  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  // 格式化截止日期
  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 86400000);

    if (diffDays < 0) return { text: '已逾期', color: 'text-red-500' };
    if (diffDays === 0) return { text: '今天', color: 'text-orange-500' };
    if (diffDays === 1) return { text: '明天', color: 'text-yellow-500' };
    if (diffDays <= 7) return { text: `${diffDays} 天后`, color: 'text-gray-500' };
    return { text: date.toLocaleDateString('zh-CN'), color: 'text-gray-400' };
  };

  const dueDate = formatDueDate(task.dueDate);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
      {/* 状态点 */}
      <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
          <span className={`text-xs ${priorityConfig.color}`}>
            {priorityConfig.label}优先级
          </span>
          {task.labels.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {task.labels.slice(0, 2).join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* 截止日期 */}
      {dueDate && (
        <span className={`text-xs ${dueDate.color} whitespace-nowrap`}>
          {dueDate.text}
        </span>
      )}

      {/* 查看按钮 */}
      <a
        href={`/tasks/${task.id}`}
        className="text-blue-600 dark:text-blue-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
      >
        查看 →
      </a>
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

const RecentTasks = memo(function RecentTasks({
  tasks,
  maxItems = 5,
}: RecentTasksProps) {
  // 按优先级排序
  const sortedTasks = useMemo(() => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...tasks]
      .sort((a, b) => {
        // 首先按状态排序（进行中 > 待办 > 已完成）
        const statusOrder = { in_progress: 0, todo: 1, blocked: 2, completed: 3 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        // 然后按优先级排序
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, maxItems);
  }, [tasks, maxItems]);

  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          📋 最近任务
        </h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="mb-4">暂无任务</p>
          <a
            href="/tasks/new"
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            创建第一个任务
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          📋 最近任务
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {tasks.length} 个
          </span>
        </h3>
        <a
          href="/tasks"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          查看全部 →
        </a>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {sortedTasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
});

export default RecentTasks;
