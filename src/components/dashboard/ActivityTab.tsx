'use client';

import { ActivityItem } from './ActivityItem';
import type { ActivityLog } from './types';

interface ActivityTabProps {
  activities: ActivityLog[];
}

export function ActivityTab({ activities }: ActivityTabProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg animate-in fade-in duration-300">
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">团队活动日志</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <ActivityItem key={activity.id} activity={activity} index={index} />
        ))}
      </div>
    </div>
  );
}