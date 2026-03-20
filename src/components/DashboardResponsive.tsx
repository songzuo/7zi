'use client';

import React, { useEffect, useState } from 'react';
import { MemberCard } from '@/components/MemberCard';
import { TaskBoard } from '@/components/TaskBoard';
import { ActivityLog } from '@/components/ActivityLog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BottomNavWrapper } from '@/components/BottomNav';
import {
  ResponsiveGrid,
  ResponsiveCard,
  ResponsiveContainer,
  ResponsiveText,
  ResponsiveButton
} from '@/components/ResponsiveComponents';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Link } from '@/i18n/routing';
import type { AIMember } from '@/components/MemberCard';

interface DashboardClientProps {
  locale: string;
}

// ============================================================================
// AI Team Members Configuration
// ============================================================================

const getAIMembers = (locale: string): AIMember[] => [
  {
    id: 'agent-world-expert',
    name: locale === 'zh' ? '智能体世界专家' : 'AI World Expert',
    role: locale === 'zh' ? '视角转换/未来布局' : 'Perspective/Future',
    emoji: '🌟',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=expert',
    status: 'working',
    provider: 'minimax',
    currentTask: '#42 ' + (locale === 'zh' ? '分析市场趋势' : 'Market Analysis'),
    completedTasks: 156
  },
  {
    id: 'consultant',
    name: locale === 'zh' ? '咨询师' : 'Consultant',
    role: locale === 'zh' ? '研究/分析' : 'Research/Analysis',
    emoji: '📚',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=consultant',
    status: 'working',
    provider: 'minimax',
    currentTask: '#38 ' + (locale === 'zh' ? '竞品调研报告' : 'Competitive Analysis'),
    completedTasks: 203
  },
  {
    id: 'architect',
    name: locale === 'zh' ? '架构师' : 'Architect',
    role: locale === 'zh' ? '设计/规划' : 'Design/Planning',
    emoji: '🏗️',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=architect',
    status: 'busy',
    provider: 'self-claude',
    currentTask: '#45 ' + (locale === 'zh' ? '系统架构评审' : 'Architecture Review'),
    completedTasks: 178
  },
  {
    id: 'executor',
    name: 'Executor',
    role: locale === 'zh' ? '执行/实现' : 'Execution/Implementation',
    emoji: '⚡',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=executor',
    status: 'working',
    provider: 'volcengine',
    currentTask: '#51 ' + (locale === 'zh' ? '实现看板功能' : 'Dashboard Implementation'),
    completedTasks: 312
  },
  {
    id: 'sysadmin',
    name: locale === 'zh' ? '系统管理员' : 'SysAdmin',
    role: locale === 'zh' ? '运维/部署' : 'DevOps/Deployment',
    emoji: '🛡️',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sysadmin',
    status: 'idle',
    provider: 'bailian',
    currentTask: undefined,
    completedTasks: 145
  }
];

const REFRESH_INTERVAL = 30000;

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function DashboardClient({ locale }: DashboardClientProps) {
  const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'songzhuo';
  const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'openclaw-workspace';

  const {
    issues,
    activities,
    isLoading,
    error,
    lastUpdated,
    refreshData
  } = useDashboardData(GITHUB_OWNER, GITHUB_REPO);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const AI_MEMBERS = getAIMembers(locale);

  const t = {
    title: locale === 'zh' ? 'AI 团队实时看板' : 'AI Team Dashboard',
    subtitle: locale === 'zh' ? '位成员' : 'members',
    tasksInProgress: locale === 'zh' ? '个进行中任务' : 'tasks in progress',
    autoRefresh: locale === 'zh' ? '自动刷新' : 'Auto Refresh',
    refresh: locale === 'zh' ? '刷新' : 'Refresh',
    updated: locale === 'zh' ? '更新' : 'Updated',
    loading: locale === 'zh' ? '加载看板数据中...' : 'Loading dashboard...',
    totalMembers: locale === 'zh' ? '总成员' : 'Total Members',
    working: locale === 'zh' ? '工作中' : 'Working',
    busy: locale === 'zh' ? '忙碌' : 'Busy',
    idle: locale === 'zh' ? '空闲' : 'Idle',
    offline: locale === 'zh' ? '离线' : 'Offline',
    inProgress: locale === 'zh' ? '进行中' : 'In Progress',
    completed: locale === 'zh' ? '已完成' : 'Completed',
  };

  const stats = {
    totalMembers: AI_MEMBERS.length,
    working: AI_MEMBERS.filter(m => m.status === 'working').length,
    busy: AI_MEMBERS.filter(m => m.status === 'busy').length,
    idle: AI_MEMBERS.filter(m => m.status === 'idle').length,
    offline: AI_MEMBERS.filter(m => m.status === 'offline').length,
    openIssues: issues.filter(i => i.state === 'open').length,
    closedIssues: issues.filter(i => i.state === 'closed').length
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      refreshData();
    }, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [autoRefresh, refreshData]);

  if (isLoading && !issues.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 text-sm sm:text-base">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <BottomNavWrapper locale={locale}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-16 md:pb-0">
        {/* Header */}
        <header className="bg-white dark:bg-zinc-900 shadow-sm border-b border-gray-200 dark:border-zinc-700 sticky top-0 z-40">
          <ResponsiveContainer maxWidth="xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/" className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                  7zi<span className="text-cyan-500">Studio</span>
                </Link>
                <div>
                  <ResponsiveText variant="h3" className="flex items-center gap-1 sm:gap-2">
                    🤖 {t.title}
                  </ResponsiveText>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                    {stats.totalMembers} {t.subtitle} · {stats.openIssues} {t.tasksInProgress}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer touch-active py-2 px-2">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    aria-label={t.autoRefresh}
                  />
                  <span className="hidden sm:inline">{t.autoRefresh}</span>
                </label>

                <span className="hidden lg:block text-xs text-gray-400 dark:text-gray-500">
                  {t.updated}: {lastUpdated?.toLocaleTimeString() || '-'}
                </span>

                <ResponsiveButton
                  variant="primary"
                  size="md"
                  onClick={refreshData}
                  disabled={isLoading}
                  className="min-h-[40px] sm:min-h-[44px]"
                >
                  <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
                  <span className="hidden sm:inline">{t.refresh}</span>
                </ResponsiveButton>
              </div>
            </div>
          </ResponsiveContainer>
        </header>

        {/* Main Content */}
        <main className="py-4 sm:py-6">
          <ResponsiveContainer maxWidth="xl">
            {/* Error Message */}
            {error && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200 text-sm">⚠️ {error}</p>
              </div>
            )}

            {/* Stats Grid - Mobile Optimized */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
              <ResponsiveCard compact hover>
                <StatCard label={t.totalMembers} value={stats.totalMembers} color="blue" />
              </ResponsiveCard>
              <ResponsiveCard compact hover>
                <StatCard label={t.working} value={stats.working} color="green" />
              </ResponsiveCard>
              <ResponsiveCard compact hover>
                <StatCard label={t.busy} value={stats.busy} color="yellow" />
              </ResponsiveCard>
              <ResponsiveCard compact hover>
                <StatCard label={t.idle} value={stats.idle} color="gray" />
              </ResponsiveCard>
              <ResponsiveCard compact hover>
                <StatCard label={t.offline} value={stats.offline} color="slate" />
              </ResponsiveCard>
              <ResponsiveCard compact hover>
                <StatCard label={t.inProgress} value={stats.openIssues} color="indigo" />
              </ResponsiveCard>
              <ResponsiveCard compact hover>
                <StatCard label={t.completed} value={stats.closedIssues} color="emerald" />
              </ResponsiveCard>
            </div>

            {/* Responsive Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {/* Members - Full width on mobile, 1 col on desktop */}
              <div className="lg:col-span-1 xl:col-span-1 order-2 lg:order-1">
                <ResponsiveCard>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    🤖 {locale === 'zh' ? '成员状态' : 'Member Status'}
                  </h3>
                  <div className="space-y-2">
                    {AI_MEMBERS.map(member => (
                      <MemberCard key={member.id} member={member} />
                    ))}
                  </div>
                </ResponsiveCard>
              </div>

              {/* Tasks - Full width on mobile, 1 col on desktop */}
              <div className="lg:col-span-1 xl:col-span-1 order-1 lg:order-2">
                <ResponsiveCard>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📋 {locale === 'zh' ? '任务看板' : 'Task Board'}
                  </h3>
                  <TaskBoard issues={issues} />
                </ResponsiveCard>
              </div>

              {/* Activity - Full width on mobile, 1 col on desktop */}
              <div className="lg:col-span-2 xl:col-span-1 order-3">
                <ResponsiveCard>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📝 {locale === 'zh' ? '活动日志' : 'Activity Log'}
                  </h3>
                  <ActivityLog activities={activities} />
                </ResponsiveCard>
              </div>
            </div>
          </ResponsiveContainer>
        </main>
      </div>
    </BottomNavWrapper>
  );
}

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'gray' | 'slate' | 'indigo' | 'emerald';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 text-blue-700 dark:text-blue-300',
    green: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 text-green-700 dark:text-green-300',
    yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 text-yellow-700 dark:text-yellow-300',
    gray: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 text-gray-700 dark:text-gray-300',
    slate: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/30 text-slate-700 dark:text-slate-300',
    indigo: 'bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 text-indigo-700 dark:text-indigo-300',
    emerald: 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 text-emerald-700 dark:text-emerald-300'
  };

  return (
    <div>
      <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-bold">{value}</p>
    </div>
  );
}
