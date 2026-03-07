'use client';

import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  UserActivity,
  ActivityTimelineItem,
  UserActivityType,
  USER_ACTIVITY_TYPE_CONFIG,
  ACTIVITY_SEVERITY_CONFIG,
} from '../lib/user-activity/types';

// ========== 类型定义 ==========

interface ActivityTimelineViewProps {
  activities: UserActivity[];
  variant?: 'vertical' | 'horizontal';
  showConnector?: boolean;
  showTime?: boolean;
  showDate?: boolean;
  compact?: boolean;
  limit?: number;
  onActivityClick?: (activity: UserActivity) => void;
}

type ViewMode = 'timeline' | 'calendar' | 'stats';

// ========== 主组件 ==========

export const ActivityTimelineView: React.FC<ActivityTimelineViewProps> = memo(function ActivityTimelineView({
  activities,
  variant = 'vertical',
  showConnector = true,
  showTime = true,
  showDate = true,
  compact = false,
  limit,
  onActivityClick,
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  // 限制活动数量
  const displayActivities = useMemo(() => {
    return limit ? activities.slice(0, limit) : activities;
  }, [activities, limit]);

  // 统计数据
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const byType: Partial<Record<UserActivityType, number>> = {};
    const byHour: number[] = new Array(24).fill(0);
    
    displayActivities.forEach((a) => {
      byType[a.type] = (byType[a.type] || 0) + 1;
      byHour[a.timestamp.getHours()]++;
    });

    const todayActivities = displayActivities.filter((a) => a.timestamp >= today);
    const errors = displayActivities.filter((a) => a.severity === 'error');

    return {
      total: displayActivities.length,
      today: todayActivities.length,
      errors: errors.length,
      byType,
      byHour,
    };
  }, [displayActivities]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 头部 */}
      <TimelineHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        stats={stats}
      />

      {/* 内容区域 */}
      <div className="p-6">
        {viewMode === 'timeline' && (
          <VerticalTimeline
            activities={displayActivities}
            showConnector={showConnector}
            showTime={showTime}
            showDate={showDate}
            compact={compact}
            onActivityClick={onActivityClick}
          />
        )}
        
        {viewMode === 'calendar' && (
          <CalendarView activities={displayActivities} />
        )}
        
        {viewMode === 'stats' && (
          <StatsView stats={stats} />
        )}
      </div>
    </div>
  );
});

// ========== 子组件 ==========

interface TimelineHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  stats: {
    total: number;
    today: number;
    errors: number;
  };
}

const TimelineHeader = memo(function TimelineHeader({
  viewMode,
  onViewModeChange,
  stats,
}: TimelineHeaderProps) {
  return (
    <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🕐</span> 活动时间线
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            可视化展示您的活动历史
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* 快速统计 */}
          <div className="flex gap-2 text-sm">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              今日 {stats.today}
            </span>
            {stats.errors > 0 && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                错误 {stats.errors}
              </span>
            )}
          </div>

          {/* 视图切换 */}
          <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            {(['timeline', 'calendar', 'stats'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === mode
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {mode === 'timeline' && '📋 时间线'}
                {mode === 'calendar' && '📅 日历'}
                {mode === 'stats' && '📊 统计'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
});

// ========== 垂直时间线 ==========

interface VerticalTimelineProps {
  activities: UserActivity[];
  showConnector: boolean;
  showTime: boolean;
  showDate: boolean;
  compact: boolean;
  onActivityClick?: (activity: UserActivity) => void;
}

const VerticalTimeline = memo(function VerticalTimeline({
  activities,
  showConnector,
  showTime,
  showDate,
  compact,
  onActivityClick,
}: VerticalTimelineProps) {
  // 按日期分组
  const groupedActivities = useMemo(() => {
    const groups: Map<string, UserActivity[]> = new Map();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    activities.forEach((activity) => {
      const activityDate = activity.timestamp.toDateString();
      let groupKey: string;

      if (activityDate === today) {
        groupKey = '今天';
      } else if (activityDate === yesterday) {
        groupKey = '昨天';
      } else {
        groupKey = activity.timestamp.toLocaleDateString('zh-CN', {
          month: 'long',
          day: 'numeric',
        });
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(activity);
    });

    return groups;
  }, [activities]);

  return (
    <div className="relative">
      {showConnector && (
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-pink-200 dark:from-blue-800 dark:via-purple-800 dark:to-pink-800" />
      )}

      {Array.from(groupedActivities.entries()).map(([date, items]) => (
        <div key={date} className="mb-8 last:mb-0">
          {/* 日期标签 */}
          {showDate && (
            <div className="relative flex items-center mb-4">
              <div className="absolute left-3 w-4 h-4 bg-blue-500 rounded-full border-4 border-white dark:border-gray-800 z-10" />
              <div className="ml-12 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                {date}
              </div>
            </div>
          )}

          {/* 活动项 */}
          <div className="space-y-3 ml-12">
            {items.map((activity, index) => (
              <TimelineItem
                key={activity.id}
                activity={activity}
                showTime={showTime}
                compact={compact}
                isLast={index === items.length - 1}
                onClick={() => onActivityClick?.(activity)}
              />
            ))}
          </div>
        </div>
      ))}

      {activities.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>暂无活动记录</p>
        </div>
      )}
    </div>
  );
});

interface TimelineItemProps {
  activity: UserActivity;
  showTime: boolean;
  compact: boolean;
  isLast: boolean;
  onClick?: () => void;
}

const TimelineItem = memo(function TimelineItem({
  activity,
  showTime,
  compact,
  isLast,
  onClick,
}: TimelineItemProps) {
  const typeConfig = USER_ACTIVITY_TYPE_CONFIG[activity.type];
  const severityConfig = ACTIVITY_SEVERITY_CONFIG[activity.severity];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
        onClick={onClick}
      >
        <span className="text-sm">{typeConfig.icon}</span>
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
          {activity.title}
        </span>
        {showTime && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(activity.timestamp)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative group ${isLast ? '' : 'pb-4'}`}
      onClick={onClick}
    >
      {/* 连接线 */}
      {!isLast && (
        <div className="absolute left-[-24px] top-6 w-0.5 h-full bg-gray-200 dark:bg-gray-700" />
      )}

      <div
        className="relative bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer
                   border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600"
      >
        {/* 图标 */}
        <div
          className={`absolute -left-8 top-4 w-6 h-6 rounded-full flex items-center justify-center text-xs ${typeConfig.bgColor} shadow-sm`}
        >
          {typeConfig.icon}
        </div>

        {/* 时间 */}
        {showTime && (
          <time
            className="absolute right-3 top-3 text-xs text-gray-500 dark:text-gray-400"
            dateTime={activity.timestamp.toISOString()}
          >
            {formatTime(activity.timestamp)}
          </time>
        )}

        {/* 标题和类型 */}
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
          <span className={`text-xs ${severityConfig.color}`}>
            {severityConfig.icon}
          </span>
        </div>

        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {activity.title}
        </p>

        {activity.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {activity.description}
          </p>
        )}

        {/* 悬停显示详细信息 */}
        <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-gray-900 dark:bg-gray-600 text-white text-xs px-2 py-1 rounded shadow-lg -translate-y-full -translate-x-1">
            点击查看详情
          </div>
        </div>
      </div>
    </div>
  );
});

// ========== 日历视图 ==========

interface CalendarViewProps {
  activities: UserActivity[];
}

const CalendarView = memo(function CalendarView({ activities }: CalendarViewProps) {
  // 获取当前周的活动
  const weekActivities = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now.getTime() - now.getDay() * 86400000);
    const days: { date: Date; activities: UserActivity[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek.getTime() + i * 86400000);
      const dayActivities = activities.filter((a) => {
        const aDate = a.timestamp;
        return (
          aDate.getFullYear() === date.getFullYear() &&
          aDate.getMonth() === date.getMonth() &&
          aDate.getDate() === date.getDate()
        );
      });
      days.push({ date, activities: dayActivities });
    }

    return days;
  }, [activities]);

  const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekActivities.map(({ date, activities: dayActivities }) => {
        const isToday = date.toDateString() === new Date().toDateString();

        return (
          <div
            key={date.toISOString()}
            className={`min-h-[120px] p-2 rounded-lg border ${
              isToday
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30'
            }`}
          >
            <div className={`text-xs font-medium mb-2 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
              {weekDayNames[date.getDay()]}
              <span className="ml-1">{date.getDate()}</span>
            </div>

            <div className="space-y-1">
              {dayActivities.slice(0, 3).map((activity) => {
                const config = USER_ACTIVITY_TYPE_CONFIG[activity.type];
                return (
                  <div
                    key={activity.id}
                    className={`text-xs px-1 py-0.5 rounded truncate ${config.bgColor} ${config.color}`}
                    title={activity.title}
                  >
                    {config.icon} {activity.title.substring(0, 10)}
                  </div>
                );
              })}
              {dayActivities.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  +{dayActivities.length - 3} 更多
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ========== 统计视图 ==========

interface StatsViewProps {
  stats: {
    total: number;
    today: number;
    errors: number;
    byType: Partial<Record<UserActivityType, number>>;
    byHour: number[];
  };
}

const StatsView = memo(function StatsView({ stats }: StatsViewProps) {
  const topTypes = useMemo(() => {
    return Object.entries(stats.byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [stats.byType]);

  const peakHours = useMemo(() => {
    return stats.byHour
      .map((count, hour) => ({ hour, count }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [stats.byHour]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 总览 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">总览</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="总活动" value={stats.total} icon="📊" color="blue" />
          <StatCard label="今日" value={stats.today} icon="📅" color="green" />
          <StatCard label="错误" value={stats.errors} icon="❌" color="red" />
        </div>
      </div>

      {/* 活动类型分布 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">活动类型分布</h3>
        <div className="space-y-2">
          {topTypes.map(([type, count]) => {
            const config = USER_ACTIVITY_TYPE_CONFIG[type as UserActivityType];
            const percentage = Math.round((count / stats.total) * 100);
            return (
              <div key={type} className="flex items-center gap-2">
                <span className="text-sm w-24 truncate">{config.icon} {config.label}</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${config.bgColor.replace('bg-', 'bg-')}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right">
                  {count} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 活跃时段 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">活跃时段</h3>
        <div className="flex items-end gap-1 h-20">
          {stats.byHour.map((count, hour) => {
            const maxCount = Math.max(...stats.byHour);
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const isPeak = peakHours.some((p) => p.hour === hour);
            return (
              <div
                key={hour}
                className={`flex-1 rounded-t transition-colors ${
                  isPeak
                    ? 'bg-blue-500'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-blue-300 dark:hover:bg-blue-600'
                }`}
                style={{ height: `${Math.max(height, 5)}%` }}
                title={`${hour}:00 - ${count} 次活动`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>0:00</span>
          <span>6:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>

      {/* 峰值时段 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">峰值时段</h3>
        <div className="space-y-2">
          {peakHours.map(({ hour, count }, index) => (
            <div
              key={hour}
              className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded"
            >
              <span className="text-sm">
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                <span className="ml-2">{hour}:00 - {hour + 1}:00</span>
              </span>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {count} 次活动
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'red';
}

const StatCard = memo(function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
});

export default ActivityTimelineView;