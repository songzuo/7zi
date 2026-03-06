'use client';

/**
 * 团队分析仪表板组件
 * 
 * 展示团队综合分析数据：
 * - 团队效率趋势
 * - 任务分布
 * - 成员贡献对比
 * - 关键指标卡片
 */

import React, { useMemo, memo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// 动态导入图表组件，避免 SSR 问题
const EfficiencyChart = dynamic(() => import('./charts/EfficiencyChart'), { ssr: false });
const TaskDistributionChart = dynamic(() => import('./charts/TaskDistributionChart'), { ssr: false });
const MemberContributionChart = dynamic(() => import('./charts/MemberContributionChart'), { ssr: false });

// ============================================================================
// 类型定义
// ============================================================================

export interface TeamMetrics {
  efficiency: number;
  taskCompletionRate: number;
  avgResponseTime: number;
  activeProjects: number;
  pendingTasks: number;
  completedThisWeek: number;
  overdueTasks: number;
  teamUtilization: number;
}

export interface EfficiencyDataPoint {
  date: string;
  efficiency: number;
  tasksCompleted: number;
  avgTime: number;
}

export interface TaskDistribution {
  category: string;
  count: number;
  color: string;
}

export interface MemberContribution {
  id: string;
  name: string;
  avatar?: string;
  tasksCompleted: number;
  contribution: number;
  efficiency: number;
  role: string;
}

export interface TeamAnalyticsData {
  metrics: TeamMetrics;
  efficiencyTrend: EfficiencyDataPoint[];
  taskDistribution: TaskDistribution[];
  memberContributions: MemberContribution[];
  period: 'week' | 'month' | 'quarter';
}

interface TeamAnalyticsProps {
  data: TeamAnalyticsData;
  onPeriodChange?: (period: 'week' | 'month' | 'quarter') => void;
}

// ============================================================================
// 指标卡片组件
// ============================================================================

interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: number;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
}

const METRIC_COLORS = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
  red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
  orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
} as const;

const MetricCard = memo(function MetricCard({ icon, label, value, trend, color }: MetricCardProps) {
  return (
    <div className={`rounded-xl border-2 p-4 ${METRIC_COLORS[color]} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-hidden="true">{icon}</span>
          <div>
            <p className="text-xs font-medium opacity-75">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
        {trend !== undefined && (
          <div className={`text-sm font-medium flex items-center gap-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

const TeamAnalytics = memo(function TeamAnalytics({ data, onPeriodChange }: TeamAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>(data.period);

  const handlePeriodChange = useCallback((period: 'week' | 'month' | 'quarter') => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  }, [onPeriodChange]);

  // 计算汇总数据
  const summary = useMemo(() => {
    const totalTasks = data.taskDistribution.reduce((sum, d) => sum + d.count, 0);
    const totalContribution = data.memberContributions.reduce((sum, m) => sum + m.contribution, 0);
    const avgEfficiency = data.efficiencyTrend.reduce((sum, e) => sum + e.efficiency, 0) / (data.efficiencyTrend.length || 1);
    
    return {
      totalTasks,
      totalContribution,
      avgEfficiency: avgEfficiency.toFixed(1),
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📊 团队分析
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            实时团队效能分析与洞察
          </p>
        </div>

        {/* 周期选择器 */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['week', 'month', 'quarter'] as const).map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {period === 'week' ? '本周' : period === 'month' ? '本月' : '本季度'}
            </button>
          ))}
        </div>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <MetricCard
          icon="⚡"
          label="团队效率"
          value={`${data.metrics.efficiency}%`}
          trend={12}
          color="blue"
        />
        <MetricCard
          icon="✅"
          label="任务完成率"
          value={`${data.metrics.taskCompletionRate}%`}
          trend={5}
          color="green"
        />
        <MetricCard
          icon="⏱️"
          label="平均响应"
          value={`${data.metrics.avgResponseTime}h`}
          trend={-8}
          color="purple"
        />
        <MetricCard
          icon="📁"
          label="活跃项目"
          value={data.metrics.activeProjects}
          color="orange"
        />
        <MetricCard
          icon="📋"
          label="待处理任务"
          value={data.metrics.pendingTasks}
          color="yellow"
        />
        <MetricCard
          icon="🎯"
          label="本周完成"
          value={data.metrics.completedThisWeek}
          trend={15}
          color="green"
        />
        <MetricCard
          icon="⚠️"
          label="逾期任务"
          value={data.metrics.overdueTasks}
          trend={-3}
          color="red"
        />
        <MetricCard
          icon="📈"
          label="资源利用率"
          value={`${data.metrics.teamUtilization}%`}
          trend={7}
          color="blue"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 效率趋势图 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            📈 效率趋势
          </h3>
          <EfficiencyChart data={data.efficiencyTrend} />
        </div>

        {/* 任务分布图 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            🥧 任务分布
          </h3>
          <TaskDistributionChart data={data.taskDistribution} />
        </div>
      </div>

      {/* 成员贡献排行 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          🏆 成员贡献排行
        </h3>
        <MemberContributionChart data={data.memberContributions} />
      </div>

      {/* 底部统计 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold">{summary.totalTasks}</p>
            <p className="text-sm opacity-80">总任务数</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{summary.totalContribution}</p>
            <p className="text-sm opacity-80">总贡献值</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{summary.avgEfficiency}%</p>
            <p className="text-sm opacity-80">平均效率</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default TeamAnalytics;