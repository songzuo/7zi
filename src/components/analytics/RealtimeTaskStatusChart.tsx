/**
 * RealtimeTaskStatusChart Component
 * 实时任务状态分布图表组件
 *
 * 实时显示任务状态分布，使用环形图或堆叠柱状图展示
 */

'use client';

import React, { useMemo } from 'react';
import { CheckCircle, Clock, XCircle, PauseCircle, AlertCircle } from 'lucide-react';
import type { TaskStatusDistribution, TaskStatusHistoryPoint } from '@/lib/types/analytics/realtime';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RealtimeTaskStatusChartProps {
  distribution: TaskStatusDistribution | null;
  history?: TaskStatusHistoryPoint[];
  showHistory?: boolean;
  showChanges?: boolean;
  locale?: string;
  height?: number;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG = {
  completed: {
    label: { en: 'Completed', zh: '已完成' },
    color: '#10b981',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600 dark:text-green-400',
    icon: CheckCircle
  },
  running: {
    label: { en: 'Running', zh: '进行中' },
    color: '#3b82f6',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400',
    icon: Clock
  },
  pending: {
    label: { en: 'Pending', zh: '待处理' },
    color: '#f59e0b',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    icon: PauseCircle
  },
  failed: {
    label: { en: 'Failed', zh: '失败' },
    color: '#ef4444',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600 dark:text-red-400',
    icon: XCircle
  },
  cancelled: {
    label: { en: 'Cancelled', zh: '已取消' },
    color: '#8b5cf6',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-600 dark:text-purple-400',
    icon: PauseCircle
  },
  submitted: {
    label: { en: 'Submitted', zh: '已提交' },
    color: '#06b6d4',
    bgColor: 'bg-cyan-500',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    icon: AlertCircle
  }
} as const;

const STATUS_ORDER = ['completed', 'running', 'pending', 'failed', 'cancelled', 'submitted'] as const;

// ============================================================================
// Helper Components
// ============================================================================

interface DonutSegmentProps {
  percentage: number;
  color: string;
  startAngle: number;
}

const DonutSegment: React.FC<DonutSegmentProps> = ({ percentage, color, startAngle }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  const strokeDashoffset = -((startAngle / 100) * circumference);

  return (
    <circle
      cx="100"
      cy="100"
      r={radius}
      fill="none"
      stroke={color}
      strokeWidth="20"
      strokeDasharray={strokeDasharray}
      strokeDashoffset={strokeDashoffset}
      transform="rotate(-90 100 100)"
      className="transition-all duration-300"
    />
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const RealtimeTaskStatusChart: React.FC<RealtimeTaskStatusChartProps> = ({
  distribution,
  history = [],
  showHistory = true,
  showChanges = true,
  locale = 'en',
  height = 300,
  className = ''
}) => {
  const t = {
    title: locale === 'zh' ? '任务状态分布' : 'Task Status Distribution',
    total: locale === 'zh' ? '总任务' : 'Total Tasks',
    history: locale === 'zh' ? '历史趋势' : 'History Trend',
    change: locale === 'zh' ? '变化' : 'Change',
    loading: locale === 'zh' ? '加载中...' : 'Loading...'
  };

  // Calculate total and percentages
  const { total, percentages } = useMemo(() => {
    if (!distribution) {
      return { total: 0, percentages: {} as Record<string, number> };
    }

    const total = Object.values(distribution.statuses).reduce((sum, count) => sum + count, 0);
    const percentages: Record<string, number> = {};

    STATUS_ORDER.forEach(status => {
      percentages[status] = total > 0 ? (distribution.statuses[status] / total) * 100 : 0;
    });

    return { total, percentages };
  }, [distribution]);

  // Calculate donut chart segments
  const donutSegments = useMemo(() => {
    if (!distribution) return [];

    let startAngle = 0;
    return STATUS_ORDER.map(status => {
      const percentage = percentages[status];
      const segment = {
        status,
        percentage,
        startAngle,
        color: STATUS_CONFIG[status].color
      };
      startAngle += percentage;
      return segment;
    });
  }, [distribution, percentages]);

  // Check if there are significant changes
  const hasSignificantChanges = useMemo(() => {
    if (!distribution?.changes) return false;
    return distribution.changes.some(change => Math.abs(change.delta) > 0);
  }, [distribution]);

  // Loading state
  if (!distribution) {
    return (
      <div
        className={`bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full">
          <p className="text-zinc-500 dark:text-zinc-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {t.total}: <span className="font-semibold text-zinc-900 dark:text-white">{total.toLocaleString()}</span>
        </p>
      </div>

      {/* Chart Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Donut Chart */}
          <div className="flex items-center justify-center">
            <div className="relative" style={{ width: '200px', height: '200px' }}>
              <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  className="text-zinc-200 dark:text-zinc-700"
                />
                {/* Segments */}
                {donutSegments
                  .filter(segment => segment.percentage > 0)
                  .map((segment, index) => (
                    <DonutSegment
                      key={segment.status}
                      percentage={segment.percentage}
                      color={segment.color}
                      startAngle={segment.startAngle}
                    />
                  ))}
              </svg>
              {/* Center Text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-zinc-900 dark:text-white">{total}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.total}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legend with Percentages */}
          <div className="space-y-2">
            {STATUS_ORDER.filter(status => distribution.statuses[status] > 0).map(status => {
              const config = STATUS_CONFIG[status];
              const count = distribution.statuses[status];
              const percentage = percentages[status];
              const Icon = config.icon;
              const change = distribution.changes?.find(c => c.status === status);

              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${config.bgColor.replace('500', '100 dark:bg-opacity-20')}`}>
                      <Icon className={`w-4 h-4 ${config.textColor}`} />
                    </div>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {config.label[locale as 'en' | 'zh']}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {showChanges && change && (
                      <span className={`text-xs font-medium ${
                        change.delta > 0 ? 'text-red-600 dark:text-red-400' : 
                        change.delta < 0 ? 'text-green-600 dark:text-green-400' : 
                        'text-zinc-500 dark:text-zinc-400'
                      }`}>
                        {change.delta > 0 ? '+' : ''}{change.delta}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {count}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6">
          <div className="flex h-4 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
            {donutSegments
              .filter(segment => segment.percentage > 0)
              .map(segment => (
                <div
                  key={segment.status}
                  className="transition-all duration-300"
                  style={{
                    width: `${segment.percentage}%`,
                    backgroundColor: segment.color
                  }}
                  title={`${STATUS_CONFIG[segment.status].label[locale as 'en' | 'zh']}: ${distribution.statuses[segment.status]} (${segment.percentage.toFixed(1)}%)`}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeTaskStatusChart;
