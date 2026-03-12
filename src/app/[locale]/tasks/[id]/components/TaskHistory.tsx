/**
 * Task history section component
 */

import type { StatusChange } from '@/lib/types/task-types';
import { formatTimeAgo, getStatusLabel } from '../utils/format';

interface TaskHistoryProps {
  history: StatusChange[];
}

export function TaskHistory({ history }: TaskHistoryProps) {
  if (!history || history.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        📜 历史记录
      </h3>
      <div className="space-y-3">
        {history.map((entry, index) => (
          <div key={index} className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">{entry.changedBy}</span> 将状态改为{' '}
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {getStatusLabel(entry.status)}
              </span>
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              {formatTimeAgo(entry.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
