'use client';

import React from 'react';
import Image from 'next/image';

export interface ActivityItem {
  id: string;
  type: 'commit' | 'issue' | 'comment';
  title: string;
  author: string;
  avatar?: string;
  timestamp: string;
  url: string;
}

interface ActivityLogProps {
  activities: ActivityItem[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ activities }) => {
  const typeIcons = {
    commit: '💻',
    issue: '📋',
    comment: '💬'
  };

  const typeColors = {
    commit: 'bg-blue-50 text-blue-700 border-blue-200',
    issue: 'bg-green-50 text-green-700 border-green-200',
    comment: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  const typeLabels = {
    commit: '提交',
    issue: '任务',
    comment: '评论'
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-800 dark:to-zinc-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="animate-pulse">⚡</span> 实时活动日志
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          最近 {activities.length} 条活动
        </p>
      </div>

      {/* 活动列表 */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-700 max-h-[600px] overflow-y-auto scrollbar-thin">
        {activities.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">📭</p>
            <p>暂无活动记录</p>
            <p className="text-sm mt-1">GitHub 活动将显示在这里</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <ActivityItemCard
              key={activity.id || index}
              activity={activity}
              icon={typeIcons[activity.type]}
              colorClass={typeColors[activity.type]}
              label={typeLabels[activity.type]}
            />
          ))
        )}
      </div>

      {/* 底部 */}
      {activities.length > 0 && (
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          🕐 自动刷新 · 30 秒间隔
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 活动项卡片
// ============================================================================

interface ActivityItemCardProps {
  activity: ActivityItem;
  icon: string;
  colorClass: string;
  label: string;
}

function ActivityItemCard({ activity, icon, colorClass, label }: ActivityItemCardProps) {
  return (
    <div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-all duration-200 group border-l-2 border-transparent hover:border-cyan-500 hover:translate-x-1">
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-sm">
          {icon}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass} transition-transform group-hover:scale-105`}>
              {label}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500" title={new Date(activity.timestamp).toLocaleString()}>
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>

          <p className="text-sm text-gray-900 dark:text-white truncate mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            {activity.title}
          </p>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {activity.avatar && (
              <Image
                src={activity.avatar}
                alt={activity.author}
                width={16}
                height={16}
                className="rounded-full ring-1 ring-transparent group-hover:ring-cyan-500/50 transition-all"
                unoptimized
              />
            )}
            <span>{activity.author}</span>
          </div>
        </div>

        {/* 链接 */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={activity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-cyan-400 hover:text-blue-800 dark:hover:text-cyan-300 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-cyan-900/20"
          >
            🔗
          </a>
        </div>
      </div>
    </div>
  );
}

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
