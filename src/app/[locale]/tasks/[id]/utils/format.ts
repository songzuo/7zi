/**
 * Task detail page formatting utilities
 */

import type { TaskStatus } from '@/lib/types/task-types';

export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - then.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return '刚刚';
  if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;
  return `${Math.floor(diffInMinutes / 1440)}天前`;
}

export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: '待分配',
    assigned: '已分配',
    in_progress: '进行中',
    completed: '已完成',
  };
  return labels[status] ?? status;
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[priority] ?? priority;
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    development: '开发',
    design: '设计',
    research: '研究',
    marketing: '推广',
    other: '其他',
  };
  return labels[type] ?? type;
}
