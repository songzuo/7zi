'use client';

/**
 * 任务卡片组件 - 展示增强的交互反馈
 * 
 * @version 1.0.0
 * @date 2026-03-29
 */

import React, { useState, useCallback, memo } from 'react';
import clsx from 'clsx';
import { Card, CardHeader, CardBody, CardActions, CardBadge, CardMeta } from '../ui/Card';
import { Button } from '../ui/Button';
import { SkeletonCard } from '../ui/Skeleton';

// ============================================
// 类型定义
// ============================================

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  createdAt: string;
  dueDate?: string;
}

export interface TaskCardProps {
  /** 任务数据 */
  task: Task;
  /** 是否加载中 */
  loading?: boolean;
  /** 编辑回调 */
  onEdit?: (task: Task) => void;
  /** 删除回调 */
  onDelete?: (taskId: string) => void;
  /** 状态变更回调 */
  onStatusChange?: (taskId: string, status: Task['status']) => void;
}

// ============================================
// 状态映射
// ============================================

const STATUS_CONFIG: Record<Task['status'], { label: string; color: 'blue' | 'yellow' | 'purple' | 'green' }> = {
  'todo': { label: '待办', color: 'blue' },
  'in-progress': { label: '进行中', color: 'yellow' },
  'review': { label: '审核中', color: 'purple' },
  'done': { label: '已完成', color: 'green' },
};

const PRIORITY_CONFIG: Record<Task['priority'], { label: string; color: 'gray' | 'blue' | 'orange' | 'red' }> = {
  'low': { label: '低', color: 'gray' },
  'medium': { label: '中', color: 'blue' },
  'high': { label: '高', color: 'orange' },
  'urgent': { label: '紧急', color: 'red' },
};

// ============================================
// TaskCard 组件
// ============================================

const TaskCardBase = ({ task, loading, onEdit, onDelete, onStatusChange }: TaskCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleEdit = useCallback(() => {
    onEdit?.(task);
  }, [task, onEdit]);

  const handleDelete = useCallback(() => {
    if (confirm(`确定要删除任务"${task.title}"吗？`)) {
      onDelete?.(task.id);
    }
  }, [task, onDelete]);

  const handleStatusChange = useCallback((status: Task['status']) => {
    onStatusChange?.(task.id, status);
  }, [task.id, onStatusChange]);

  // 加载状态
  if (loading) {
    return <SkeletonCard />;
  }

  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <Card
      hoverable
      clickable={false}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 状态指示条 */}
      <div
        className={clsx(
          'absolute left-0 top-4 bottom-4 w-1 rounded-full transition-all duration-300',
          {
            'bg-blue-500': task.status === 'todo',
            'bg-yellow-500': task.status === 'in-progress',
            'bg-purple-500': task.status === 'review',
            'bg-green-500': task.status === 'done',
          }
        )}
      />

      <CardHeader bordered={false} className="pl-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardBadge
              color={statusConfig.color}
              variant="soft"
              className="mb-2"
            >
              {statusConfig.label}
            </CardBadge>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
              {task.title}
            </h3>
          </div>
          <CardBadge
            color={priorityConfig.color}
            variant="outline"
            size="sm"
          >
            {priorityConfig.label}
          </CardBadge>
        </div>
      </CardHeader>

      <CardBody padding="sm" className="pl-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
          {task.description}
        </p>

        <CardMeta>
          {task.assignee && (
            <>
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                {task.assignee}
              </span>
            </>
          )}
          {task.dueDate && (
            <>
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            </>
          )}
        </CardMeta>
      </CardBody>

      <CardActions align="right">
        {task.status !== 'done' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('done')}
          >
            标记完成
          </Button>
        )}
        {task.status === 'done' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('in-progress')}
          >
            重新打开
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
        >
          编辑
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
        >
          删除
        </Button>
      </CardActions>
    </Card>
  );
};

// 使用 React.memo 优化性能
export const TaskCard = React.memo(TaskCardBase);
TaskCard.displayName = 'TaskCard';

// ============================================
// 任务列表组件
// ============================================

export interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
}

const TaskListBase = ({ tasks, loading, onEdit, onDelete, onStatusChange }: TaskListProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          暂无任务
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          创建第一个任务开始吧！
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}

// ============================================
// 任务状态切换器
// ============================================

export interface TaskStatusToggleProps {
  currentStatus: Task['status'];
  onStatusChange: (status: Task['status']) => void;
  disabled?: boolean;
}

export const TaskStatusToggle = memo(function TaskStatusToggle({ currentStatus, onStatusChange, disabled }: TaskStatusToggleProps) {
  const handleStatusClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const status = e.currentTarget.dataset.status as Task['status'];
    onStatusChange(status);
  }, [onStatusChange]);

  return (
    <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {(Object.keys(STATUS_CONFIG) as Task['status'][]).map(status => {
        const config = STATUS_CONFIG[status];
        const isActive = status === currentStatus;

        return (
          <button
            key={status}
            data-status={status}
            onClick={handleStatusClick}
            disabled={disabled}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isActive
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
});
TaskStatusToggle.displayName = 'TaskStatusToggle';

// ============================================
// 导出
// ============================================

export const TaskList = React.memo(TaskListBase);
TaskList.displayName = 'TaskList';

export default TaskCard;
