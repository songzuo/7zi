'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { MemberCard } from './MemberCard';
import { TaskBoard } from './TaskBoard';
import { ActivityLog } from './ActivityLog';
import ContributionChart from './ContributionChart';
import ProgressBar from './ProgressBar';
import Loading from './Loading';
import ErrorBoundary from './ErrorBoundary';
import { useDashboardQuery, useDashboardRefresh } from '@/lib/query';

// 导入正确的类型定义
import type { AIMember, GitHubIssue, ActivityItem } from '@/app/dashboard/page';

// ContributionChart 需要的 TeamMember 类型（保持向后兼容）
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'offline';
  avatar?: string;
  currentTask?: string;
  completedTasks: number;
  contributionScore: number;
}

// ============================================================================
// StatsCard 组件 - 优化: 移到 Dashboard 外部并用 React.memo 包装
// ============================================================================

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

// 颜色配置 - 移到组件外部
const STATS_CARD_COLORS = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
} as const;

// 优化: 用 React.memo 包装 StatsCard 避免不必要的重渲染
const StatsCard = memo(function StatsCard({ icon, label, value, color }: StatsCardProps) {
  const colorClasses = STATS_CARD_COLORS[color];

  return (
    <div className={`rounded-lg border-2 p-3 sm:p-4 ${colorClasses} transition-colors`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-2xl sm:text-3xl flex-shrink-0" aria-hidden="true">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-medium opacity-75 truncate">{label}</div>
          <div className="text-lg sm:text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Dashboard 组件
// ============================================================================

export default function Dashboard() {
  const [refreshInterval, setRefreshInterval] = useState(60000); // 默认 60 秒

  // 使用 React Query 获取仪表盘数据
  const { data, isLoading, isFetching, error, refetch } = useDashboardQuery({
    refetchInterval: refreshInterval,
    enabled: true,
  });

  // 手动刷新 Hook
  const { refresh: manualRefresh } = useDashboardRefresh();

  // 使用 useCallback 缓存事件处理
  const handleRefresh = useCallback(() => {
    manualRefresh();
  }, [manualRefresh]);

  const handleIntervalChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshInterval(Number(e.target.value));
  }, []);

  // 使用 useCallback 缓存重试处理
  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // 将 AIMember 转换为 TeamMember 格式（用于 ContributionChart）
  const teamMembers = useMemo(() => {
    if (!data?.members) return [];
    return data.members.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      status: member.status === 'working' ? 'active' : member.status === 'busy' ? 'idle' : (member.status as 'active' | 'idle' | 'offline'),
      avatar: member.avatar,
      currentTask: member.currentTask,
      completedTasks: member.completedTasks,
      contributionScore: member.completedTasks,
    }));
  }, [data?.members]);

  // 加载中状态
  if (isLoading && !data) {
    return <Loading />;
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">加载失败</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // 优化: 使用 useMemo 缓存计算结果
  const completionRate = useMemo(
    () => (data.stats.completedTasks / data.stats.totalTasks) * 100,
    [data.stats.completedTasks, data.stats.totalTasks]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                📊 AI 团队仪表盘
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                实时监控团队状态和任务进度
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <span>自动刷新: {refreshInterval / 1000}秒</span>
                {isFetching && (
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="正在刷新..."></span>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={refreshInterval}
                  onChange={handleIntervalChange}
                  className="flex-1 sm:flex-none text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 sm:px-3 py-2
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="选择刷新间隔"
                >
                  <option value={0}>关闭自动刷新</option>
                  <option value={30000}>30秒</option>
                  <option value={60000}>60秒</option>
                  <option value={120000}>120秒</option>
                  <option value={300000}>5分钟</option>
                </select>
                <button
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  aria-label="刷新数据"
                >
                  <span className={`text-sm ${isFetching ? 'animate-spin' : ''}`}>🔄</span>
                  <span className="hidden xs:inline">刷新</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8" aria-label="统计概览">
          <StatsCard
            icon="📋"
            label="总任务数"
            value={data.stats.totalTasks}
            color="blue"
          />
          <StatsCard
            icon="✅"
            label="已完成"
            value={data.stats.completedTasks}
            color="green"
          />
          <StatsCard
            icon="👥"
            label="活跃成员"
            value={data.stats.activeMembers}
            color="purple"
          />
          <StatsCard
            icon="⚡"
            label="平均响应"
            value={data.stats.avgResponseTime}
            color="orange"
          />
        </section>

        {/* Progress Overview */}
        <section className="mb-6 sm:mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 transition-colors">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
            任务完成进度
          </h2>
          <ProgressBar
            value={completionRate}
            max={100}
            label={`${data.stats.completedTasks} / ${data.stats.totalTasks}`}
            showPercentage
            color="blue"
          />
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Team Members */}
          <section className="lg:col-span-2" aria-labelledby="team-members-title">
            <h2 id="team-members-title" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>👥</span>
              <span>团队成员</span>
            </h2>
            <ErrorBoundary name="TeamMembers">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {data.members.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </ErrorBoundary>
          </section>

          {/* Activity Log */}
          <section aria-labelledby="activity-title">
            <h2 id="activity-title" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>📜</span>
              <span>活动日志</span>
            </h2>
            <ErrorBoundary name="ActivityLog">
              <ActivityLog activities={data.activities} />
            </ErrorBoundary>
          </section>
        </div>

        {/* Task Board */}
        <section className="mt-6 sm:mt-8" aria-labelledby="tasks-title">
          <h2 id="tasks-title" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>📋</span>
            <span>任务看板</span>
          </h2>
          <ErrorBoundary name="TaskBoard">
            <TaskBoard issues={data.issues} />
          </ErrorBoundary>
        </section>

        {/* Contribution Chart */}
        <section className="mt-6 sm:mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 transition-colors" aria-labelledby="contribution-title">
          <h2 id="contribution-title" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>📊</span>
            <span>贡献统计</span>
          </h2>
          <ErrorBoundary name="ContributionChart">
            <ContributionChart members={teamMembers} />
          </ErrorBoundary>
        </section>
      </div>
    </div>
  );
}