'use client';

import type { Task } from '@/lib/types/task-types';
import { STATUS_LABELS, STATUS_COLORS } from './types';
import { formatDate } from './utils';

interface TaskCardProps {
  task: Task;
  assigneeName: string;
}

export function TaskCard({ task, assigneeName }: TaskCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{task.title}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">
            {task.description}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`inline-block px-2 py-1 rounded-full text-xs ${STATUS_COLORS[task.status]}`}>
              {STATUS_LABELS[task.status]}
            </span>
            <span className="inline-block px-2 py-1 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              {task.type === 'development' ? '开发' : 
               task.type === 'design' ? '设计' : 
               task.type === 'research' ? '研究' : 
               task.type === 'marketing' ? '营销' : '其他'}
            </span>
            {task.priority === 'high' && (
              <span className="inline-block px-2 py-1 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                高优先级
              </span>
            )}
          </div>
        </div>
        <div className="ml-4 text-right">
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{assigneeName}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {formatDate(task.createdAt)}
          </div>
        </div>
      </div>
      
      {task.comments && task.comments.length > 0 && (
        <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">最新评论:</div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {task.comments[task.comments.length - 1].content}
          </p>
        </div>
      )}
    </div>
  );
}