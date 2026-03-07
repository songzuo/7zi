'use client';

/**
 * 用户统计卡片组件
 * 
 * 展示用户的关键统计数据：
 * - 总任务数
 * - 已完成任务
 * - 进行中任务
 * - 贡献积分
 * - 排名
 * - 连续天数
 */

import React, { memo } from 'react';
import type { UserStats } from '@/app/users/[userId]/dashboard/page';

interface UserStatsCardsProps {
  stats: UserStats;
}

// 统计项配置
const STATS_CONFIG = [
  {
    key: 'totalTasks',
    icon: '📋',
    label: '总任务',
    color: 'blue',
  },
  {
    key: 'completedTasks',
    icon: '✅',
    label: '已完成',
    color: 'green',
  },
  {
    key: 'inProgressTasks',
    icon: '🔄',
    label: '进行中',
    color: 'yellow',
  },
  {
    key: 'overdueTasks',
    icon: '⚠️',
    label: '已逾期',
    color: 'red',
  },
  {
    key: 'contributionScore',
    icon: '⭐',
    label: '贡献积分',
    color: 'purple',
  },
  {
    key: 'ranking',
    icon: '🏆',
    label: '排名',
    color: 'orange',
    format: (value: number, total?: number) => `#${value} / ${total}`,
  },
] as const;

// 颜色映射
const COLOR_CLASSES = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
} as const;

const TEXT_COLORS = {
  blue: 'text-blue-700 dark:text-blue-300',
  green: 'text-green-700 dark:text-green-300',
  yellow: 'text-yellow-700 dark:text-yellow-300',
  red: 'text-red-700 dark:text-red-300',
  purple: 'text-purple-700 dark:text-purple-300',
  orange: 'text-orange-700 dark:text-orange-300',
} as const;

// ============================================================================
// 单个统计卡片
// ============================================================================

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: keyof typeof COLOR_CLASSES;
}

const StatCard = memo(function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border-2 p-4 ${COLOR_CLASSES[color]} transition-all hover:shadow-md`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl" role="img" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium opacity-75 truncate">{label}</p>
          <p className={`text-xl font-bold ${TEXT_COLORS[color]}`}>{value}</p>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

const UserStatsCards = memo(function UserStatsCards({ stats }: UserStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {STATS_CONFIG.map((config) => {
        const value = stats[config.key as keyof UserStats];
        const displayValue = config.format
          ? config.format(value as number, stats.totalMembers)
          : value;

        return (
          <StatCard
            key={config.key}
            icon={config.icon}
            label={config.label}
            value={displayValue}
            color={config.color}
          />
        );
      })}

      {/* 连续天数 - 额外卡片 */}
      <StatCard
        icon="🔥"
        label="连续活跃"
        value={`${stats.streak} 天`}
        color="orange"
      />

      {/* 成就数量 */}
      <StatCard
        icon="🏅"
        label="成就"
        value={stats.achievements}
        color="purple"
      />
    </div>
  );
});

export default UserStatsCards;
