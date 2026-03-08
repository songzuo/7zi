import type { TaskStatus } from '@/lib/types/task-types';

export interface Project {
  id: string;
  name: string;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  tasks: {
    total: number;
    completed: number;
  };
  team: string[];
  deadline: string;
}

export interface ActivityLog {
  id: string;
  type: 'commit' | 'deploy' | 'issue' | 'meeting' | 'task';
  message: string;
  user: string;
  time: string;
  emoji: string;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '待处理',
  assigned: '已分配',
  in_progress: '进行中',
  completed: '已完成',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  assigned: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  in_progress: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  completed: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
};