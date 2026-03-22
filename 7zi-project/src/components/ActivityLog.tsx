'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface Activity {
  id: string;
  action: string;
  user: string;
  timestamp: Date;
  details?: string;
}

interface ActivityLogProps {
  activities: Activity[];
  height?: number;
  itemHeight?: number;
  className?: string;
}

/**
 * ActivityItem - 单个活动项组件
 */
function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <div
      className="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      data-testid={`activity-${activity.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {activity.action}
          </h4>
          {activity.details && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {activity.details}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {activity.user}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <time className="text-xs text-gray-500 dark:text-gray-500">
            {formatTime(activity.timestamp)}
          </time>
        </div>
      </div>
    </div>
  );
}

/**
 * formatTime - 格式化时间显示
 */
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * ActivityLog - 虚拟化的活动日志组件
 *
 * 使用 @tanstack/react-virtual 实现高性能的长列表渲染
 * 支持数千条记录流畅滚动
 */
export function ActivityLog({
  activities = [],
  height = 600,
  itemHeight = 120,
  className = ''
}: ActivityLogProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // 使用 @tanstack/react-virtual 进行虚拟化
  const virtualizer = useVirtualizer({
    count: activities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5 // 预渲染 5 个项目以提升滚动流畅度
  });

  if (activities.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full text-gray-500 dark:text-gray-400 ${className}`}
        data-testid="activity-log-empty"
      >
        <p className="text-sm">暂无活动记录</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`h-full overflow-auto ${className}`}
      data-testid="activity-log"
      style={{ height: `${height}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const activity = activities[virtualRow.index];
          return (
            <div
              key={activity.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <ActivityItem activity={activity} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ActivityLog.Static - 非虚拟化版本（用于少量数据）
 */
export function ActivityLogStatic({
  activities = [],
  className = ''
}: {
  activities: Activity[];
  className?: string;
}) {
  if (activities.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full text-gray-500 dark:text-gray-400 ${className}`}
        data-testid="activity-log-empty"
      >
        <p className="text-sm">暂无活动记录</p>
      </div>
    );
  }

  return (
    <div className={className} data-testid="activity-log-static">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
