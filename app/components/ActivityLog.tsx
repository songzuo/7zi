'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { ActivityItem } from '../dashboard/page';

interface ActivityLogProps {
  activities: ActivityItem[];
}

// 类型配置 - 移到组件外部避免重复创建
const TYPE_CONFIG = {
  icons: {
    commit: '💻',
    issue: '📋',
    comment: '💬'
  },
  colors: {
    commit: 'bg-blue-50 text-blue-700 border-blue-200',
    issue: 'bg-green-50 text-green-700 border-green-200',
    comment: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  labels: {
    commit: '提交',
    issue: '任务',
    comment: '评论'
  }
} as const;

/**
 * 活动日志组件 - 性能优化版本
 * 
 * 优化措施:
 * 1. 使用 React.memo 防止不必要的重渲染
 * 2. 配置移到组件外部
 * 3. 使用 useMemo 缓存配置
 */
export const ActivityLog: React.FC<ActivityLogProps> = memo(function ActivityLog({ activities }) {
  const typeIcons = TYPE_CONFIG.icons;
  const typeColors = TYPE_CONFIG.colors;
  const typeLabels = TYPE_CONFIG.labels;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
      {/* 头部 */}
      <ActivityLogHeader count={activities.length} />

      {/* 活动列表 */}
      <div 
        className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] sm:max-h-[600px] overflow-y-auto"
        role="feed"
        aria-label="活动日志"
        aria-busy={false}
      >
        {activities.length === 0 ? (
          <EmptyState />
        ) : (
          activities.map((activity, index) => (
            <ActivityItemCard
              key={activity.id || index}
              activity={activity}
              icon={typeIcons[activity.type]}
              colorClass={typeColors[activity.type]}
              label={typeLabels[activity.type]}
              index={index}
            />
          ))
        )}
      </div>

      {/* 底部 */}
      {activities.length > 0 && (
        <footer className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400 transition-colors">
          🕐 自动刷新 · 30 秒间隔
        </footer>
      )}
    </div>
  );
});

// ============================================================================
// 子组件
// ============================================================================

const ActivityLogHeader = memo(function ActivityLogHeader({ count }: { count: number }) {
  return (
    <header className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 transition-colors">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <span aria-hidden="true">⚡</span> 实时活动日志
      </h2>
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1" id="activity-count">
        最近 {count} 条活动
      </p>
    </header>
  );
});

const EmptyState = memo(function EmptyState() {
  return (
    <div className="px-4 sm:px-6 py-10 sm:py-12 text-center text-gray-500 dark:text-gray-400" role="status">
      <p className="text-base sm:text-lg mb-2" aria-hidden="true">📭</p>
      <p>暂无活动记录</p>
      <p className="text-xs sm:text-sm mt-1">GitHub 活动将显示在这里</p>
    </div>
  );
});

// ============================================================================
// 活动项卡片
// ============================================================================

interface ActivityItemCardProps {
  activity: ActivityItem;
  icon: string;
  colorClass: string;
  label: string;
  index: number;
}

const ActivityItemCard = memo(function ActivityItemCard({ 
  activity, 
  icon, 
  colorClass, 
  label, 
  index 
}: ActivityItemCardProps) {
  // 使用 useCallback 缓存键盘事件处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.open(activity.url, '_blank', 'noopener,noreferrer');
    }
  }, [activity.url]);

  // 使用 useCallback 缓存图片错误处理
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=' + activity.author;
  }, [activity.author]);

  return (
    <article 
      className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus-within:bg-gray-50 dark:focus-within:bg-gray-700/50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 active:bg-gray-100 dark:active:bg-gray-700"
      aria-posinset={index + 1}
      aria-setsize={-1}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* 图标 */}
        <div 
          className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-base sm:text-lg"
          aria-hidden="true"
        >
          {icon}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
            <span 
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}
              aria-label={`类型：${label}`}
            >
              {label}
            </span>
            <time 
              className="text-xs text-gray-500 dark:text-gray-400" 
              dateTime={activity.timestamp}
              title={new Date(activity.timestamp).toLocaleString()}
            >
              {formatTimeAgo(activity.timestamp)}
            </time>
          </div>

          <p className="text-sm text-gray-900 dark:text-gray-100 truncate mb-1">
            {activity.title}
          </p>

          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            {activity.avatar && (
              <img
                src={activity.avatar}
                alt=""
                className="w-4 h-4 rounded-full"
                onError={handleImageError}
              />
            )}
            <span aria-label={`作者：${activity.author}`}>{activity.author}</span>
          </div>
        </div>

        {/* 链接 */}
        <div className="flex-shrink-0 self-center">
          <a
            href={activity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded p-1"
            aria-label={`查看 ${activity.title} 的详细内容`}
          >
            <span aria-hidden="true">🔗</span>
          </a>
        </div>
      </div>
    </article>
  );
});

// ============================================================================
// 工具函数
// ============================================================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString();
}
