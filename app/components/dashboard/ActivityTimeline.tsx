'use client';

/**
 * 活动时间线组件
 * 
 * 展示用户最近的活动记录
 */

import React, { useMemo, memo } from 'react';
import type { UserActivity } from '@/app/users/[userId]/dashboard/page';

interface ActivityTimelineProps {
  activities: UserActivity[];
  maxItems?: number;
}

// 活动类型配置
const ACTIVITY_CONFIG = {
  task_complete: {
    icon: '✅',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    label: '完成任务',
  },
  task_create: {
    icon: '📝',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    label: '创建任务',
  },
  comment: {
    icon: '💬',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    label: '发表评论',
  },
  commit: {
    icon: '💾',
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    label: '提交代码',
  },
  review: {
    icon: '👀',
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    label: '代码审查',
  },
} as const;

// ============================================================================
// 单个活动项
// ============================================================================

interface ActivityItemProps {
  activity: UserActivity;
  isLast: boolean;
}

const ActivityItem = memo(function ActivityItem({ activity, isLast }: ActivityItemProps) {
  const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.task_complete;

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="flex gap-3">
      {/* 时间线 */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${config.color}`}
        >
          {config.icon}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 my-1" />
        )}
      </div>

      {/* 内容 */}
      <div className={`flex-1 pb-4 ${isLast ? '' : 'border-b border-gray-100 dark:border-gray-700'}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {activity.title}
            </p>
            {activity.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {activity.description}
              </p>
            )}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {formatTime(activity.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

const ActivityTimeline = memo(function ActivityTimeline({
  activities,
  maxItems = 10,
}: ActivityTimelineProps) {
  // 限制显示数量
  const displayActivities = useMemo(
    () => activities.slice(0, maxItems),
    [activities, maxItems]
  );

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 transition-colors">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          📜 活动记录
        </h3>
        <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
          暂无活动记录
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 transition-colors">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        📜 活动记录
        <span className="text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {activities.length} 条
        </span>
      </h3>

      <div className="space-y-0">
        {displayActivities.map((activity, index) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            isLast={index === displayActivities.length - 1}
          />
        ))}
      </div>

      {activities.length > maxItems && (
        <button className="w-full mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
          查看全部 {activities.length} 条记录 →
        </button>
      )}
    </div>
  );
});

export default ActivityTimeline;
