'use client';

import React, { memo, useMemo, useCallback, useState } from 'react';
import {
  UserActivityType,
  ActivityTimelineItem,
  UserActivity,
  USER_ACTIVITY_TYPE_CONFIG,
  ACTIVITY_SEVERITY_CONFIG,
} from '../lib/user-activity/types';

// ========== 类型定义 ==========

interface UserActivityLogProps {
  activities: UserActivity[];
  userId?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  showStats?: boolean;
  limit?: number;
  onActivityClick?: (activity: UserActivity) => void;
  onDeleteActivity?: (id: string) => void;
}

interface FilterState {
  type: UserActivityType | 'all';
  severity: 'all' | 'info' | 'warning' | 'error' | 'success';
  dateRange: 'all' | 'today' | 'week' | 'month';
  search: string;
}

// ========== 主组件 ==========

export const UserActivityLog: React.FC<UserActivityLogProps> = memo(function UserActivityLog({
  activities,
  showFilters = true,
  showSearch = true,
  showStats = true,
  limit,
  onActivityClick,
  onDeleteActivity,
}) {
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    severity: 'all',
    dateRange: 'all',
    search: '',
  });

  // 过滤活动
  const filteredActivities = useMemo(() => {
    let result = [...activities];

    // 类型过滤
    if (filters.type !== 'all') {
      result = result.filter((a) => a.type === filters.type);
    }

    // 严重程度过滤
    if (filters.severity !== 'all') {
      result = result.filter((a) => a.severity === filters.severity);
    }

    // 日期范围过滤
    const now = new Date();
    if (filters.dateRange === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter((a) => a.timestamp >= today);
    } else if (filters.dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter((a) => a.timestamp >= weekAgo);
    } else if (filters.dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter((a) => a.timestamp >= monthAgo);
    }

    // 搜索过滤
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(searchLower) ||
          a.description?.toLowerCase().includes(searchLower)
      );
    }

    // 限制数量
    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }, [activities, filters, limit]);

  // 统计数据
  const stats = useMemo(() => {
    const total = activities.length;
    const today = activities.filter((a) => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return a.timestamp >= todayStart;
    }).length;
    const errors = activities.filter((a) => a.severity === 'error').length;
    return { total, today, errors };
  }, [activities]);

  // 处理过滤器变化
  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 清除过滤器
  const clearFilters = useCallback(() => {
    setFilters({
      type: 'all',
      severity: 'all',
      dateRange: 'all',
      search: '',
    });
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 头部 */}
      <ActivityLogHeader stats={stats} showStats={showStats} />

      {/* 过滤器和搜索 */}
      {showFilters && (
        <ActivityFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          showSearch={showSearch}
        />
      )}

      {/* 活动列表 */}
      <div className="max-h-[600px] overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <EmptyState />
        ) : (
          <ActivityList
            activities={filteredActivities}
            onActivityClick={onActivityClick}
            onDeleteActivity={onDeleteActivity}
          />
        )}
      </div>

      {/* 底部统计 */}
      <ActivityLogFooter
        total={filteredActivities.length}
        originalTotal={activities.length}
      />
    </div>
  );
});

// ========== 子组件 ==========

interface ActivityLogHeaderProps {
  stats: { total: number; today: number; errors: number };
  showStats: boolean;
}

const ActivityLogHeader = memo(function ActivityLogHeader({ stats, showStats }: ActivityLogHeaderProps) {
  return (
    <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📋</span> 用户活动日志
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            记录用户的所有操作和活动
          </p>
        </div>
        {showStats && (
          <div className="flex gap-4">
            <StatBadge label="总计" value={stats.total} color="blue" />
            <StatBadge label="今日" value={stats.today} color="green" />
            {stats.errors > 0 && (
              <StatBadge label="错误" value={stats.errors} color="red" />
            )}
          </div>
        )}
      </div>
    </header>
  );
});

interface StatBadgeProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red';
}

const StatBadge = memo(function StatBadge({ label, value, color }: StatBadgeProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium ${colorClasses[color]}`}>
      {label}: {value}
    </div>
  );
});

interface ActivityFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onClearFilters: () => void;
  showSearch: boolean;
}

const ActivityFilters = memo(function ActivityFilters({
  filters,
  onFilterChange,
  onClearFilters,
  showSearch,
}: ActivityFiltersProps) {
  const hasActiveFilters = 
    filters.type !== 'all' || 
    filters.severity !== 'all' || 
    filters.dateRange !== 'all' || 
    filters.search !== '';

  return (
    <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
      <div className="flex flex-wrap gap-3 items-center">
        {/* 搜索框 */}
        {showSearch && (
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索活动..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        )}

        {/* 类型过滤 */}
        <select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">所有类型</option>
          <option value="login">登录/登出</option>
          <option value="task_create">任务创建</option>
          <option value="task_update">任务更新</option>
          <option value="task_complete">任务完成</option>
          <option value="page_view">页面浏览</option>
          <option value="file_upload">文件操作</option>
          <option value="error">错误</option>
        </select>

        {/* 严重程度过滤 */}
        <select
          value={filters.severity}
          onChange={(e) => onFilterChange('severity', e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">所有级别</option>
          <option value="info">信息</option>
          <option value="success">成功</option>
          <option value="warning">警告</option>
          <option value="error">错误</option>
        </select>

        {/* 日期范围过滤 */}
        <select
          value={filters.dateRange}
          onChange={(e) => onFilterChange('dateRange', e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">所有时间</option>
          <option value="today">今天</option>
          <option value="week">最近一周</option>
          <option value="month">最近一月</option>
        </select>

        {/* 清除过滤器按钮 */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
});

interface ActivityListProps {
  activities: UserActivity[];
  onActivityClick?: (activity: UserActivity) => void;
  onDeleteActivity?: (id: string) => void;
}

const ActivityList = memo(function ActivityList({
  activities,
  onActivityClick,
  onDeleteActivity,
}: ActivityListProps) {
  // 按日期分组
  const groupedActivities = useMemo(() => {
    const groups: { date: string; items: UserActivity[] }[] = [];
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    activities.forEach((activity) => {
      const activityDate = activity.timestamp.toDateString();
      let groupLabel: string;

      if (activityDate === today) {
        groupLabel = '今天';
      } else if (activityDate === yesterday) {
        groupLabel = '昨天';
      } else {
        groupLabel = activity.timestamp.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }

      let group = groups.find((g) => g.date === groupLabel);
      if (!group) {
        group = { date: groupLabel, items: [] };
        groups.push(group);
      }
      group.items.push(activity);
    });

    return groups;
  }, [activities]);

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {groupedActivities.map((group) => (
        <div key={group.date}>
          {/* 日期分组标题 */}
          <div className="px-6 py-2 bg-gray-100 dark:bg-gray-700/50 text-sm font-medium text-gray-600 dark:text-gray-400 sticky top-0">
            {group.date}
          </div>
          
          {/* 活动项 */}
          {group.items.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onClick={() => onActivityClick?.(activity)}
              onDelete={() => onDeleteActivity?.(activity.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

interface ActivityItemProps {
  activity: UserActivity;
  onClick?: () => void;
  onDelete?: () => void;
}

const ActivityItem = memo(function ActivityItem({
  activity,
  onClick,
  onDelete,
}: ActivityItemProps) {
  const typeConfig = USER_ACTIVITY_TYPE_CONFIG[activity.type];
  const severityConfig = ACTIVITY_SEVERITY_CONFIG[activity.severity];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <article
      className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer
                 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`活动：${activity.title}`}
    >
      <div className="flex items-start gap-4">
        {/* 图标 */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${typeConfig.bgColor}`}
          aria-hidden="true"
        >
          {typeConfig.icon}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeConfig.color}`}
            >
              {typeConfig.label}
            </span>
            <span className={`text-xs ${severityConfig.color}`}>
              {severityConfig.icon}
            </span>
            <time
              className="text-xs text-gray-500 dark:text-gray-400"
              dateTime={activity.timestamp.toISOString()}
            >
              {formatTime(activity.timestamp)}
            </time>
          </div>

          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {activity.title}
          </p>

          {activity.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {activity.description}
            </p>
          )}

          {/* 元数据 */}
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(activity.metadata).slice(0, 3).map(([key, value]) => (
                <span
                  key={key}
                  className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
                >
                  {key}: {String(value).substring(0, 20)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
            aria-label="删除此活动记录"
          >
            🗑️
          </button>
        )}
      </div>
    </article>
  );
});

interface EmptyStateProps {}

const EmptyState = memo(function EmptyState() {
  return (
    <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
      <p className="text-4xl mb-3">📭</p>
      <p className="text-lg font-medium">暂无活动记录</p>
      <p className="text-sm mt-1">开始使用系统后，您的活动将显示在这里</p>
    </div>
  );
});

interface ActivityLogFooterProps {
  total: number;
  originalTotal: number;
}

const ActivityLogFooter = memo(function ActivityLogFooter({ total, originalTotal }: ActivityLogFooterProps) {
  return (
    <footer className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
      <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
        显示 {total} 条活动
        {total !== originalTotal && ` (共 ${originalTotal} 条)`}
      </p>
    </footer>
  );
});

export default UserActivityLog;