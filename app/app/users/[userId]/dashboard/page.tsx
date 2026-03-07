'use client';

/**
 * 用户仪表板页面
 * 
 * 功能:
 * - 用户个人统计概览
 * - 任务完成趋势图表
 * - 近期活动时间线
 * - 贡献度排行榜
 * - 快捷操作面板
 */

import React, { useState, useEffect, useMemo, useCallback, memo, Suspense } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner, LoadingContent } from '../../components/Loading';
import UserStatsCards from '../../components/dashboard/UserStatsCards';
import TaskTrendChart from '../../components/dashboard/TaskTrendChart';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import ContributionRanking from '../../components/dashboard/ContributionRanking';
import QuickActionsPanel from '../../components/dashboard/QuickActionsPanel';
import AchievementBadges from '../../components/dashboard/AchievementBadges';
import RecentTasks from '../../components/dashboard/RecentTasks';

// ============================================================================
// 类型定义
// ============================================================================

export interface UserStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  contributionScore: number;
  ranking: number;
  totalMembers: number;
  streak: number;
  achievements: number;
}

export interface TaskTrend {
  date: string;
  completed: number;
  created: number;
}

export interface UserActivity {
  id: string;
  type: 'task_complete' | 'task_create' | 'comment' | 'commit' | 'review';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
  progress?: number;
  total?: number;
}

export interface RecentTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignee?: string;
  labels: string[];
}

export interface UserDashboardData {
  stats: UserStats;
  taskTrend: TaskTrend[];
  activities: UserActivity[];
  achievements: Achievement[];
  recentTasks: RecentTask[];
  lastUpdated: string;
}

// ============================================================================
// API 数据获取
// ============================================================================

async function fetchUserDashboard(userId: string): Promise<UserDashboardData> {
  const response = await fetch(`/api/users/${userId}/dashboard`);
  if (!response.ok) {
    throw new Error('Failed to fetch user dashboard data');
  }
  return response.json();
}

// ============================================================================
// 主页面组件
// ============================================================================

interface UserDashboardPageProps {
  params: Promise<{ userId: string }>;
}

export default function UserDashboardPage({ params }: UserDashboardPageProps) {
  const [userId, setUserId] = useState<string>('');
  const [refreshInterval, setRefreshInterval] = useState(60000);

  // 解析 params
  useEffect(() => {
    params.then((p) => setUserId(p.userId));
  }, [params]);

  // 使用 React Query 获取数据
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['userDashboard', userId],
    queryFn: () => fetchUserDashboard(userId),
    staleTime: 60 * 1000,
    enabled: !!userId,
    refetchInterval: refreshInterval,
  });

  // 事件处理
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleIntervalChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshInterval(Number(e.target.value));
  }, []);

  // 加载状态
  if (isLoading || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <LoadingContent type="stats" count={6} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2">
              <LoadingContent type="card" count={1} />
            </div>
            <LoadingContent type="card" count={1} />
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">加载失败</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : '未知错误'}
          </p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 头部 */}
        <header className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                📊 我的仪表板
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                查看您的工作进度和统计数据
                {isFetching && (
                  <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={refreshInterval}
                onChange={handleIntervalChange}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>关闭自动刷新</option>
                <option value={30000}>30 秒</option>
                <option value={60000}>60 秒</option>
                <option value={300000}>5 分钟</option>
              </select>

              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <span className={isFetching ? 'animate-spin' : ''}>🔄</span>
                刷新
              </button>
            </div>
          </div>
        </header>

        {/* 统计卡片 */}
        <section className="mb-6">
          <UserStatsCards stats={data.stats} />
        </section>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：趋势图 + 最近任务 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 任务趋势图 */}
            <TaskTrendChart data={data.taskTrend} />

            {/* 最近任务 */}
            <RecentTasks tasks={data.recentTasks} />
          </div>

          {/* 右侧：活动 + 贡献 */}
          <div className="space-y-6">
            {/* 快捷操作 */}
            <QuickActionsPanel />

            {/* 活动时间线 */}
            <ActivityTimeline activities={data.activities} />

            {/* 成就徽章 */}
            <AchievementBadges achievements={data.achievements} />

            {/* 贡献排行 */}
            <ContributionRanking 
              currentUserId={userId}
              stats={{
                score: data.stats.contributionScore,
                ranking: data.stats.ranking,
                totalMembers: data.stats.totalMembers,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}