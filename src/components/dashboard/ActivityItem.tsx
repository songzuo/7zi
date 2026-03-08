'use client';

import type { ActivityLog } from './types';
import { getActivityColor } from './utils';

interface ActivityItemProps {
  activity: ActivityLog;
  index: number;
}

export function ActivityItem({ activity, index }: ActivityItemProps) {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getActivityColor(activity.type)}`}>
        {activity.emoji}
      </div>
      <div className="flex-1">
        <p className="text-zinc-800 dark:text-zinc-200">{activity.message}</p>
        <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          <span>{activity.user}</span>
          <span>•</span>
          <span>{activity.time}</span>
        </div>
      </div>
    </div>
  );
}