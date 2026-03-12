/**
 * Status change action buttons component
 */

import type { TaskStatus } from '@/lib/types/task-types';

interface StatusActionsProps {
  currentStatus: TaskStatus;
  onStatusChange: (status: string) => Promise<void>;
}

const ALL_STATUSES: TaskStatus[] = ['pending', 'assigned', 'in_progress', 'completed'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '设为待分配',
  assigned: '设为已分配',
  in_progress: '设为进行中',
  completed: '设为已完成',
};

export function StatusActions({ currentStatus, onStatusChange }: StatusActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {ALL_STATUSES.filter(status => status !== currentStatus).map(status => (
        <button
          key={status}
          onClick={() => onStatusChange(status)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
        >
          {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}
