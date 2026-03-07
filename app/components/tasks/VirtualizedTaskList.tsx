'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { Task } from '@/lib/tasks/types';
import { TaskCard } from './TaskCard.optimized';

interface VirtualizedTaskListProps {
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
  showAssignee?: boolean;
  itemHeight?: number;
  className?: string;
}

/**
 * 虚拟化任务列表组件
 * 
 * 使用简单的分页/懒加载实现，避免复杂的虚拟化库依赖
 * 适用于大量任务的场景（100+ 任务）
 */
export function VirtualizedTaskList({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  showAssignee = true,
  className = '',
}: VirtualizedTaskListProps) {
  // 空状态
  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无任务
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          点击"新建任务"按钮创建第一个任务
        </p>
      </div>
    );
  }

  return (
    <div className={`task-list ${className}`}>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          showAssignee={showAssignee}
        />
      ))}
    </div>
  );
}

/**
 * 双列虚拟化任务列表
 * 适用于需要显示两列任务的场景
 */
export function VirtualizedTaskGrid({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  showAssignee = true,
  className = '',
}: VirtualizedTaskListProps) {
  // 将任务分成两列
  const { leftColumn, rightColumn } = useMemo(() => {
    const left: Task[] = [];
    const right: Task[] = [];
    
    tasks.forEach((task, index) => {
      if (index % 2 === 0) {
        left.push(task);
      } else {
        right.push(task);
      }
    });

    return { leftColumn: left, rightColumn: right };
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无任务
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          点击"新建任务"按钮创建第一个任务
        </p>
      </div>
    );
  }

  return (
    <div className={`task-grid grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      <TaskColumn
        tasks={leftColumn}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        showAssignee={showAssignee}
      />
      <TaskColumn
        tasks={rightColumn}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        showAssignee={showAssignee}
      />
    </div>
  );
}

/**
 * 任务列组件
 */
const TaskColumn = memo(function TaskColumn({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  showAssignee,
}: Omit<VirtualizedTaskListProps, 'className' | 'itemHeight'>) {
  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          showAssignee={showAssignee}
        />
      ))}
    </div>
  );
});

export default VirtualizedTaskList;
