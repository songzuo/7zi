'use client';

/**
 * AI 团队实时看板 Dashboard (客户端组件)
 * 
 * 功能:
 * - 显示 11 位 AI 成员状态
 * - 任务进度展示 (GitHub Issues)
 * - 实时活动日志 (GitHub Commits)
 * - 实时仪表盘 (新增)
 * - 团队活动追踪 (新增)
 * - 自动刷新 (30 秒)
 */

import React, { useEffect, useState, Suspense } from 'react';
import { MemberCard } from '@/components/MemberCard';
import {
  LazyTaskBoard,
  LazyActivityLog,
  LazyRealtimeDashboard,
  LazyTeamActivityTracker,
  LoadingFallback,
} from '@/components/LazyComponents';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Link } from '@/i18n/routing';

// ============================================================================
// 类型定义 - 使用 MemberCard 的 AIMember 类型
// ============================================================================

import type { AIMember } from '@/components/MemberCard';

// ============================================================================
// Props
// ============================================================================

interface DashboardClientProps {
  locale: string;
}

// ============================================================================
// AI 团队成员配置 (11 人)
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
  },
  {
    id: 'tester',
    name: locale === 'zh' ? '测试员' : 'Tester',
    role: locale === 'zh' ? '测试/调试' : 'Testing/Debugging',
    emoji: '🧪',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tester',
    status: 'working',
    provider: 'minimax',
    currentTask: '#49 ' + (locale === 'zh' ? '单元测试编写' : 'Unit Tests'),
    completedTasks: 267
  },
  {
    id: 'designer',
    name: locale === 'zh' ? '设计师' : 'Designer',
    role: locale === 'zh' ? 'UI 设计' : 'UI Design',
    emoji: '🎨',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=designer',
    status: 'busy',
    provider: 'self-claude',
    currentTask: '#47 ' + (locale === 'zh' ? '界面优化' : 'UI Optimization'),
    completedTasks: 189
  },
  {
    id: 'marketing',
    name: locale === 'zh' ? '推广专员' : 'Marketing',
    role: locale === 'zh' ? '推广/SEO' : 'Promotion/SEO',
    emoji: '📣',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=marketing',
    status: 'idle',
    provider: 'volcengine',
    currentTask: undefined,
    completedTasks: 134
  },
  {
    id: 'sales',
    name: locale === 'zh' ? '销售客服' : 'Sales',
    role: locale === 'zh' ? '销售/客服' : 'Sales/Support',
    emoji: '💼',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sales',
    status: 'offline',
    provider: 'bailian',
    currentTask: undefined,
    completedTasks: 98
  },
  {
    id: 'finance',
    name: locale === 'zh' ? '财务' : 'Finance',
    role: locale === 'zh' ? '会计/审计' : 'Accounting/Audit',
    emoji: '💰',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=finance',
    status: 'idle',
    provider: 'minimax',
    currentTask: undefined,
    completedTasks: 76
  },
  {
    id: 'media',
    name: locale === 'zh' ? '媒体' : 'Media',
    role: locale === 'zh' ? '媒体/宣传' : 'Media/Publicity',
    emoji: '📺',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=media',
    status: 'working',
    provider: 'self-claude',
    currentTask: '#44 ' + (locale === 'zh' ? '宣传文案撰写' : 'Content Writing'),
    completedTasks: 112
  }
];

const REFRESH_INTERVAL = 30000; // 30 秒

// ============================================================================
// 主页面组件
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
  
  // 多语言文本 - 使用 useMemo 优化
  const t = React.useMemo(() => ({
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
    noMembersWorking: locale === 'zh' ? '暂无成员工作中' : 'No members working',
    noMembersBusy: locale === 'zh' ? '暂无成员忙碌中' : 'No members busy',
    noMembersIdle: locale === 'zh' ? '暂无成员空闲' : 'No members idle',
    noMembersOffline: locale === 'zh' ? '无离线成员' : 'No offline members',
  }), [locale]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      refreshData();
    }, REFRESH_INTERVAL);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshData]);

  // 统计信息 - 使用 useMemo 优化
  const stats = React.useMemo(() => ({
    totalMembers: AI_MEMBERS.length,
    working: AI_MEMBERS.filter(m => m.status === 'working').length,
    busy: AI_MEMBERS.filter(m => m.status === 'busy').length,
    idle: AI_MEMBERS.filter(m => m.status === 'idle').length,
    offline: AI_MEMBERS.filter(m => m.status === 'offline').length,
    openIssues: issues.filter(i => i.state === 'open').length,
    closedIssues: issues.filter(i => i.state === 'closed').length
  }), [AI_MEMBERS, issues]);

  if (isLoading && !issues.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-zinc-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 顶部导航栏 */}
      <header className="bg-white dark:bg-zinc-900 shadow-sm border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white">
                7zi<span className="text-cyan-500">Studio</span>
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  🤖 {t.title}
                </h1>
                <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {stats.totalMembers} {t.subtitle} · {stats.openIssues} {t.tasksInProgress}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
              {/* 自动刷新开关 */}
              <label className="flex items-center gap-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer touch-active py-2 px-1">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="hidden sm:inline">{t.autoRefresh}</span>
                <span className="sm:hidden">{t.autoRefresh.slice(0, 2)}</span>
              </label>
              
              {/* 最后更新时间 - 仅桌面端 */}
              <span className="hidden lg:block text-xs text-zinc-400 dark:text-zinc-500">
                {t.updated}: {lastUpdated?.toLocaleTimeString() || '-'}
              </span>
              
              {/* 手动刷新按钮 */}
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 touch-active min-h-[44px]"
              >
                <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
                <span className="hidden sm:inline">{t.refresh}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-[1800px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">⚠️ {error}</p>
          </div>
        )}

        {/* 统计卡片 - 响应式网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          <StatCard label={t.totalMembers} value={stats.totalMembers} color="blue" />
          <StatCard label={t.working} value={stats.working} color="green" />
          <StatCard label={t.busy} value={stats.busy} color="yellow" />
          <StatCard label={t.idle} value={stats.idle} color="gray" />
          <StatCard label={t.offline} value={stats.offline} color="slate" />
          <StatCard label={t.inProgress} value={stats.openIssues} color="indigo" />
          <StatCard label={t.completed} value={stats.closedIssues} color="emerald" />
        </div>

        {/* 三栏布局 - 响应式 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* 左侧：成员状态 */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <MemberStatus members={AI_MEMBERS} t={t} />
          </div>

          {/* 中间：任务看板 */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <Suspense fallback={<LoadingFallback message="加载任务看板..." className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700" />}>
              <LazyTaskBoard issues={issues} />
            </Suspense>
          </div>

          {/* 右侧：活动日志 */}
          <div className="lg:col-span-1 order-3">
            <Suspense fallback={<LoadingFallback message="加载活动日志..." className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700" />}>
              <LazyActivityLog activities={activities} />
            </Suspense>
          </div>
        </div>

        {/* 新增：实时仪表盘和团队活动追踪 */}
        <div className="mt-6 sm:mt-8 space-y-6">
          {/* 实时仪表盘 */}
          <Suspense fallback={<LoadingFallback message="加载实时仪表盘..." className="bg-zinc-900 rounded-xl" />}>
            <LazyRealtimeDashboard locale={locale} />
          </Suspense>

          {/* 团队活动追踪 */}
          <Suspense fallback={<LoadingFallback message="加载团队活动追踪..." className="bg-white dark:bg-zinc-800 rounded-xl" />}>
            <LazyTeamActivityTracker
              locale={locale}
              maxItems={50}
              showFilters={true}
              showStats={true}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// 统计卡片组件 - 使用 React.memo 优化
// ============================================================================

interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'gray' | 'slate' | 'indigo' | 'emerald';
}

const StatCardBase: React.FC<StatCardProps> = ({ label, value, color }) => {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    green: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    gray: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    slate: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/30 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    indigo: 'bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    emerald: 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  };

  return (
    <div className={`p-3 sm:p-4 rounded-xl border ${colorClasses[color]} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg group cursor-default`}>
      <p className="text-xs sm:text-sm font-medium opacity-80 truncate group-hover:opacity-100 transition-opacity">{label}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1 group-hover:scale-110 transition-transform origin-left">{value}</p>
    </div>
  );
};

// 使用 React.memo 优化 StatCard，只在 value 或 label 变化时重新渲染
const StatCard = React.memo(StatCardBase, (prevProps, nextProps) => {
  return (
    prevProps.label === nextProps.label &&
    prevProps.value === nextProps.value &&
    prevProps.color === nextProps.color
  );
});

StatCard.displayName = 'StatCard';

// ============================================================================
// 成员状态组件 - 使用 React.memo 优化
// ============================================================================

interface MemberStatusProps {
  members: AIMember[];
  t: Record<string, string>;
}

const MemberStatusBase: React.FC<MemberStatusProps> = ({ members, t }) => {
  const workingMembers = React.useMemo(() => members.filter(m => m.status === 'working'), [members]);
  const busyMembers = React.useMemo(() => members.filter(m => m.status === 'busy'), [members]);
  const idleMembers = React.useMemo(() => members.filter(m => m.status === 'idle'), [members]);
  const offlineMembers = React.useMemo(() => members.filter(m => m.status === 'offline'), [members]);

  return (
    <div className="space-y-4">
      {/* 工作中 */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
            <span className="animate-pulse">🔥</span> {t.working} ({workingMembers.length})
          </h3>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-700 max-h-96 overflow-y-auto scrollbar-thin">
          {workingMembers.map(member => (
            <MemberCard key={member.id} member={member} compact />
          ))}
          {workingMembers.length === 0 && (
            <div className="px-4 py-8 text-center text-zinc-400 text-sm">
              {t.noMembersWorking}
            </div>
          )}
        </div>
      </div>

      {/* 忙碌中 */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
            <span className="animate-bounce">⚡</span> {t.busy} ({busyMembers.length})
          </h3>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-700 max-h-96 overflow-y-auto scrollbar-thin">
          {busyMembers.map(member => (
            <MemberCard key={member.id} member={member} compact />
          ))}
          {busyMembers.length === 0 && (
            <div className="px-4 py-8 text-center text-zinc-400 text-sm">
              {t.noMembersBusy}
            </div>
          )}
        </div>
      </div>

      {/* 空闲中 */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-gradient-to-r from-gray-50 to-zinc-50 dark:from-zinc-700/30 dark:to-zinc-600/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <span>😊</span> {t.idle} ({idleMembers.length})
          </h3>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-700 max-h-96 overflow-y-auto scrollbar-thin">
          {idleMembers.map(member => (
            <MemberCard key={member.id} member={member} compact />
          ))}
          {idleMembers.length === 0 && (
            <div className="px-4 py-8 text-center text-zinc-400 text-sm">
              {t.noMembersIdle}
            </div>
          )}
        </div>
      </div>

      {/* 离线 */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-gradient-to-r from-slate-50 to-zinc-50 dark:from-slate-800/30 dark:to-zinc-700/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <span>⚫</span> {t.offline} ({offlineMembers.length})
          </h3>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-700 max-h-96 overflow-y-auto scrollbar-thin">
          {offlineMembers.map(member => (
            <MemberCard key={member.id} member={member} compact />
          ))}
          {offlineMembers.length === 0 && (
            <div className="px-4 py-8 text-center text-zinc-400 text-sm">
              {t.noMembersOffline}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 使用 React.memo 优化 MemberStatus，只在 members 数组内容变化时重新渲染
const MemberStatus = React.memo(MemberStatusBase, (prevProps, nextProps) => {
  // 比较 members 数组的长度和每个成员的关键状态
  if (prevProps.members.length !== nextProps.members.length) {
    return false;
  }
  
  // 检查每个成员的关键状态
  for (let i = 0; i < prevProps.members.length; i++) {
    const prev = prevProps.members[i];
    const next = nextProps.members[i];
    
    if (
      prev.id !== next.id ||
      prev.status !== next.status ||
      prev.currentTask !== next.currentTask
    ) {
      return false;
    }
  }
  
  // t 对象通常稳定，但可以比较引用
  return prevProps.t === nextProps.t;
});

MemberStatus.displayName = 'MemberStatus';