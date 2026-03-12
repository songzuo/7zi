/**
 * Task detail page style utilities
 */

import type { TaskStatus, TaskPriority, TaskType } from '@/lib/types/task-types';

export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
}

export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  };
  return colors[priority] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
}

export function getTypeColor(type: TaskType): string {
  const colors: Record<TaskType, string> = {
    development: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    design: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200',
    research: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
    marketing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };
  return colors[type] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
}
