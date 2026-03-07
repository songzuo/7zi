'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { MemberCard } from './MemberCard';
import { TaskBoard } from './TaskBoard';
import { ActivityLog } from './ActivityLog';
import ContributionChart from './ContributionChart';
import ProgressBar from './ProgressBar';
import Loading from './Loading';

// 类型定义 - 与 dashboard/page.tsx 保持一致
export interface AIMember {
  id: string;
  name: string;
  role: string;
  emoji: string;
  avatar: string;
  status: 'idle' | 'working' | 'busy' | 'offline';
  provider: string;
  currentTask?: string;
  completedTasks: number;
}

export interface ActivityItem {
  id: string;
  type: 'commit' | 'issue' | 'comment';
  title: string;
  author: string;
  avatar?: string;
  timestamp: string;
  url: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string; avatar_url: string } | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

// ContributionChart 需要的类型 (与 Dashboard.tsx 保持一致)
interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'offline';
  avatar?: string;
  currentTask?: string;
  completedTasks: number;
  contributionScore: number;
}

export interface DashboardData {
  members: AIMember[];
  issues: GitHubIssue[];
  activities: ActivityItem[];
  stats: {
    totalTasks: number;
    completedTasks: number;
    activeMembers: number;
    avgResponseTime: string;
  };
}

/**
 * Dashboard 组件 - 性能优化版本
 * 
 * 优化措施:
 * 1. 使用 useMemo 缓存计算结果
 * 2. 使用 useCallback 缓存事件处理函数
 * 3. 使用 React.memo 包装子组件
 * 4. 提取子组件减少父组件渲染影响
 */
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  // 使用 useCallback 缓存数据获取函数
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // 使用 useMemo 缓存完成率计算
  const completionRate = useMemo(() => {
    if (!data) return 0;
    return (data.stats.completedTasks / data.stats.totalTasks) * 100;
  }, [data?.stats.completedTasks, data?.stats.totalTasks]);

  // 自动刷新
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchDashboardData]);

  // ==================== 渲染 ====================

  if (loading) return <Loading />;
  
  if (error) {
    return <ErrorState error={error} onRetry={fetchDashboardData} />;
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <DashboardHeader
          refreshInterval={refreshInterval}
          onRefresh={fetchDashboardData}
        />

        {/* Stats Cards */}
        <StatsGrid stats={data.stats} />

        {/* Progress Overview */}
        <ProgressSection
          completedTasks={data.stats.completedTasks}
          totalTasks={data.stats.totalTasks}
          completionRate={completionRate}
        />

        {/* Main Grid */}
        <MainContentGrid
          members={data.members}
          activities={data.activities}
        />

        {/* Task Board */}
        <TaskBoardSection issues={data.issues} />

        {/* Contribution Chart */}
        <ContributionSection members={data.members} />
      </div>
    </div>
  );
}

// ============================================================================
// 子组件 - 使用 React.memo 防止不必要的重渲染
// ============================================================================

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ErrorState = memo(function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">加载失败</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  );
});

interface DashboardHeaderProps {
  refreshInterval: number;
  onRefresh: () => void;
}

const DashboardHeader = memo(function DashboardHeader({ refreshInterval, onRefresh }: DashboardHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📊 AI 团队仪表盘
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            实时监控团队状态和任务进度
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            自动刷新: {refreshInterval / 1000}秒
          </div>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            aria-label="刷新数据"
          >
            <span>🔄</span>
            <span>刷新</span>
          </button>
        </div>
      </div>
    </header>
  );
});

interface StatsGridProps {
  stats: DashboardData['stats'];
}

const StatsGrid = memo(function StatsGrid({ stats }: StatsGridProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" aria-label="统计概览">
      <StatsCard
        icon="📋"
        label="总任务数"
        value={stats.totalTasks}
        color="blue"
      />
      <StatsCard
        icon="✅"
        label="已完成"
        value={stats.completedTasks}
        color="green"
      />
      <StatsCard
        icon="👥"
        label="活跃成员"
        value={stats.activeMembers}
        color="purple"
      />
      <StatsCard
        icon="⚡"
        label="平均响应"
        value={stats.avgResponseTime}
        color="orange"
      />
    </section>
  );
});

interface ProgressSectionProps {
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
}

const ProgressSection = memo(function ProgressSection({ 
  completedTasks, 
  totalTasks, 
  completionRate 
}: ProgressSectionProps) {
  return (
    <section className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        任务完成进度
      </h2>
      <ProgressBar
        value={completionRate}
        max={100}
        label={`${completedTasks} / ${totalTasks}`}
        showPercentage
        color="blue"
      />
    </section>
  );
});

interface MainContentGridProps {
  members: AIMember[];
  activities: ActivityItem[];
}

const MainContentGrid = memo(function MainContentGrid({ members, activities }: MainContentGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Team Members */}
      <section className="lg:col-span-2" aria-labelledby="team-members-title">
        <h2 id="team-members-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>👥</span>
          <span>团队成员</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      </section>

      {/* Activity Log */}
      <section aria-labelledby="activity-title">
        <h2 id="activity-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>📜</span>
          <span>活动日志</span>
        </h2>
        <ActivityLog activities={activities} />
      </section>
    </div>
  );
});

interface TaskBoardSectionProps {
  issues: GitHubIssue[];
}

const TaskBoardSection = memo(function TaskBoardSection({ issues }: TaskBoardSectionProps) {
  return (
    <section className="mt-8" aria-labelledby="tasks-title">
      <h2 id="tasks-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>📋</span>
        <span>任务看板</span>
      </h2>
      <TaskBoard issues={issues} />
    </section>
  );
});

interface ContributionSectionProps {
  members: AIMember[];
}

const ContributionSection = memo(function ContributionSection({ members }: ContributionSectionProps) {
  // 将 AIMember 转换为 TeamMember 格式
  const teamMembers: TeamMember[] = useMemo(() => 
    members.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      status: m.status === 'working' ? 'active' : m.status === 'busy' ? 'idle' : m.status,
      avatar: m.avatar,
      currentTask: m.currentTask,
      completedTasks: m.completedTasks,
      contributionScore: m.completedTasks,
    })),
    [members]
  );

  return (
    <section className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors" aria-labelledby="contribution-title">
      <h2 id="contribution-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>📊</span>
        <span>贡献统计</span>
      </h2>
      <ContributionChart members={teamMembers} />
    </section>
  );
});

// ============================================================================
// StatsCard 组件
// ============================================================================

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const StatsCard = memo(function StatsCard({ icon, label, value, color }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClasses[color]} transition-colors`}>
      <div className="flex items-center gap-3">
        <div className="text-3xl" aria-hidden="true">{icon}</div>
        <div>
          <div className="text-sm font-medium opacity-75">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
});
