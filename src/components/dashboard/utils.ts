import type { TaskStatus, TaskType } from '@/lib/types/task-types';
import type { ActivityLog } from './types';

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN');
}

export function getTaskEmoji(type: TaskType, status: TaskStatus): string {
  if (status === 'completed') return '✅';
  switch (type) {
    case 'development': return '💻';
    case 'design': return '🎨';
    case 'research': return '📚';
    case 'marketing': return '📣';
    default: return '📋';
  }
}

export function getActivityColor(type: ActivityLog['type']) {
  switch (type) {
    case 'commit':
      return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400';
    case 'deploy':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
    case 'issue':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
    case 'meeting':
      return 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400';
    case 'task':
      return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
  }
}