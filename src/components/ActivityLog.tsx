'use client';

import React from 'react';

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
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* 头部 */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>⚡</span> 实时活动日志
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          最近 {activities.length} 条活动
        </p>
      </div>

      {/* 活动列表 */}
      <div className="divide-y max-h-[600px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
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
        <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-500">
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
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
          {icon}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
              {label}
            </span>
            <span className="text-xs text-gray-400" title={new Date(activity.timestamp).toLocaleString()}>
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>

          <p className="text-sm text-gray-900 truncate mb-1">
            {activity.title}
          </p>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            {activity.avatar && (
              <img
                src={activity.avatar}
                alt={activity.author}
                className="w-4 h-4 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=' + activity.author;
                }}
              />
            )}
            <span>{activity.author}</span>
          </div>
        </div>

        {/* 链接 */}
        <div className="flex-shrink-0">
          <a
            href={activity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800"
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
