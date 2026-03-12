/**
 * Task metadata sidebar section component
 */

import type { Task } from '@/lib/types/task-types';
import { formatTimeAgo } from '../utils/format';

interface TaskMetadataProps {
  task: Task;
}

export function TaskMetadata({ task }: TaskMetadataProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">任务信息</h3>
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">创建时间:</span>{' '}
          <span className="text-gray-900 dark:text-white">{formatTimeAgo(task.createdAt)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">最后更新:</span>{' '}
          <span className="text-gray-900 dark:text-white">{formatTimeAgo(task.updatedAt)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">创建者:</span>{' '}
          <span className="text-gray-900 dark:text-white">
            {task.createdBy === 'user' ? '用户' : 'AI'}
          </span>
        </div>
      </div>
    </div>
  );
}
