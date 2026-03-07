'use client';

import React from 'react';
import { Task } from '@/lib/tasks/types';
import { getTaskStats } from '@/lib/tasks/utils';

interface TaskStatsProps {
  tasks: Task[];
  className?: string;
}

/**
 * 任务统计面板组件
 */
export function TaskStats({ tasks, className = '' }: TaskStatsProps) {
  const stats = getTaskStats(tasks);

  const statItems = [
    { label: '总任务', value: stats.total, color: 'text-gray-900 dark:text-white', icon: '📋' },
    { label: '已完成', value: stats.done, color: 'text-green-600 dark:text-green-400', icon: '✅' },
    { label: '进行中', value: stats.inProgress, color: 'text-blue-600 dark:text-blue-400', icon: '⚡' },
    { label: '待办', value: stats.todo, color: 'text-gray-600 dark:text-gray-400', icon: '📝' },
    { label: '评审中', value: stats.review, color: 'text-purple-600 dark:text-purple-400', icon: '👀' },
    { label: '已过期', value: stats.overdue, color: 'text-red-600 dark:text-red-400', icon: '⚠️' },
    { label: '即将到期', value: stats.dueSoon, color: 'text-orange-600 dark:text-orange-400', icon: '⏰' },
  ];

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 ${className}`}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">任务统计</h3>

      {/* 完成率进度条 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">完成率</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {stats.completionRate}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${stats.completionRate}%` }}
            role="progressbar"
            aria-valuenow={stats.completionRate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="任务完成率"
          />
        </div>
      </div>

      {/* 统计网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="text-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
          >
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 优先级分布 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">优先级分布</h4>
        <div className="space-y-2">
          <PriorityBar
            label="高优先级"
            count={stats.byPriority.high}
            total={stats.total}
            color="bg-red-500"
          />
          <PriorityBar
            label="中优先级"
            count={stats.byPriority.medium}
            total={stats.total}
            color="bg-yellow-500"
          />
          <PriorityBar
            label="低优先级"
            count={stats.byPriority.low}
            total={stats.total}
            color="bg-green-500"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 优先级进度条子组件
 */
function PriorityBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-xs font-medium text-gray-900 dark:text-white">
          {count} ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
