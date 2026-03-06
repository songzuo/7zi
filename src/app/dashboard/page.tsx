'use client';

/**
 * AI 团队实时看板 Dashboard
 * 
 * 功能:
 * - 显示 11 位 AI 成员状态
 * - 任务进度展示 (GitHub Issues)
 * - 实时活动日志 (GitHub Commits)
 * - 自动刷新 (30 秒)
 */

import React, { useEffect, useState } from 'react';
import { MemberCard } from '@/components/MemberCard';
import { TaskBoard } from '@/components/TaskBoard';
import { ActivityLog } from '@/components/ActivityLog';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// ============================================================================
// 类型定义
// ============================================================================

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

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
  author?: { avatar_url: string } | null;
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

// ============================================================================
// AI 团队成员配置 (11 人)
// ============================================================================

const AI_MEMBERS: AIMember[] = [
  {
    id: 'agent-world-expert',
    name: '智能体世界专家',
    role: '视角转换/未来布局',
    emoji: '🌟',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=expert',
    status: 'working',
    provider: 'minimax',
    currentTask: '#42 分析市场趋势',
    completedTasks: 156
  },
  {
    id: 'consultant',
    name: '咨询师',
    role: '研究/分析',
    emoji: '📚',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=consultant',
    status: 'working',
    provider: 'minimax',
    currentTask: '#38 竞品调研报告',
    completedTasks: 203
  },
  {
    id: 'architect',
    name: '架构师',
    role: '设计/规划',
    emoji: '🏗️',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=architect',
    status: 'busy',
    provider: 'self-claude',
    currentTask: '#45 系统架构评审',
    completedTasks: 178
  },
  {
    id: 'executor',
    name: 'Executor',
    role: '执行/实现',
    emoji: '⚡',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=executor',
    status: 'working',
    provider: 'volcengine',
    currentTask: '#51 实现看板功能',
    completedTasks: 312
  },
  {
    id: 'sysadmin',
    name: '系统管理员',
    role: '运维/部署',
    emoji: '🛡️',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sysadmin',
    status: 'idle',
    provider: 'bailian',
    currentTask: undefined,
    completedTasks: 145
  },
  {
    id: 'tester',
    name: '测试员',
    role: '测试/调试',
    emoji: '🧪',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tester',
    status: 'working',
    provider: 'minimax',
    currentTask: '#49 单元测试编写',
    completedTasks: 267
  },
  {
    id: 'designer',
    name: '设计师',
    role: 'UI 设计',
    emoji: '🎨',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=designer',
    status: 'busy',
    provider: 'self-claude',
    currentTask: '#47 界面优化',
    completedTasks: 189
  },
  {
    id: 'marketing',
    name: '推广专员',
    role: '推广/SEO',
    emoji: '📣',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=marketing',
    status: 'idle',
    provider: 'volcengine',
    currentTask: undefined,
    completedTasks: 134
  },
  {
    id: 'sales',
    name: '销售客服',
    role: '销售/客服',
    emoji: '💼',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sales',
    status: 'offline',
    provider: 'bailian',
    currentTask: undefined,
    completedTasks: 98
  },
  {
    id: 'finance',
    name: '财务',
    role: '会计/审计',
    emoji: '💰',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=finance',
    status: 'idle',
    provider: 'minimax',
    currentTask: undefined,
    completedTasks: 76
  },
  {
    id: 'media',
    name: '媒体',
    role: '媒体/宣传',
    emoji: '📺',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=media',
    status: 'working',
    provider: 'self-claude',
    currentTask: '#44 宣传文案撰写',
    completedTasks: 112
  }
];

// ============================================================================
// GitHub API 配置
// ============================================================================

const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'songzhuo';
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'openclaw-workspace';
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
const REFRESH_INTERVAL = 30000; // 30 秒

// ============================================================================
// 主页面组件
// ============================================================================

export default function DashboardPage() {
  const {
    issues,
    activities,
    isLoading,
    error,
    lastUpdated,
    refreshData
  } = useDashboardData(GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN);

  const [autoRefresh, setAutoRefresh] = useState(true);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      refreshData();
    }, REFRESH_INTERVAL);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshData]);

  // 统计信息
  const stats = {
    totalMembers: AI_MEMBERS.length,
    working: AI_MEMBERS.filter(m => m.status === 'working').length,
    busy: AI_MEMBERS.filter(m => m.status === 'busy').length,
    idle: AI_MEMBERS.filter(m => m.status === 'idle').length,
    offline: AI_MEMBERS.filter(m => m.status === 'offline').length,
    openIssues: issues.filter(i => i.state === 'open').length,
    closedIssues: issues.filter(i => i.state === 'closed').length
  };

  if (isLoading && !issues.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">加载看板数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 顶部导航栏 */}
      <header className="bg-white dark:bg-zinc-900 shadow-sm border-b border-gray-200 dark:border-zinc-700 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  🤖 AI 团队实时看板
                </h1>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {stats.totalMembers} 位成员 · {stats.openIssues} 个进行中任务
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
              {/* 自动刷新开关 */}
              <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 cursor-pointer touch-active py-2 px-1">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="hidden sm:inline">自动刷新</span>
                <span className="sm:hidden">自动</span>
              </label>
              
              {/* 最后更新时间 - 仅桌面端 */}
              <span className="hidden lg:block text-xs text-gray-400 dark:text-gray-500">
                更新: {lastUpdated?.toLocaleTimeString() || '-'}
              </span>
              
              {/* 手动刷新按钮 */}
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 touch-active min-h-[44px]"
              >
                <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
                <span className="hidden sm:inline">刷新</span>
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
          <StatCard label="总成员" value={stats.totalMembers} color="blue" />
          <StatCard label="工作中" value={stats.working} color="green" />
          <StatCard label="忙碌" value={stats.busy} color="yellow" />
          <StatCard label="空闲" value={stats.idle} color="gray" />
          <StatCard label="离线" value={stats.offline} color="slate" />
          <StatCard label="进行中" value={stats.openIssues} color="indigo" />
          <StatCard label="已完成" value={stats.closedIssues} color="emerald" />
        </div>

        {/* 三栏布局 - 响应式 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* 左侧：成员状态 */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <MemberStatus members={AI_MEMBERS} />
          </div>

          {/* 中间：任务看板 */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <TaskBoard issues={issues} />
          </div>

          {/* 右侧：活动日志 */}
          <div className="lg:col-span-1 order-3">
            <ActivityLog activities={activities} />
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// 统计卡片组件
// ============================================================================

interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'gray' | 'slate' | 'indigo' | 'emerald';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    gray: 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    slate: 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  };

  return (
    <div className={`p-3 sm:p-4 rounded-xl border ${colorClasses[color]} transition-transform hover:scale-[1.02] active:scale-[0.98]`}>
      <p className="text-xs sm:text-sm font-medium opacity-80 truncate">{label}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

// ============================================================================
// 成员状态组件
// ============================================================================

interface MemberStatusProps {
  members: AIMember[];
}

function MemberStatus({ members }: MemberStatusProps) {
  const workingMembers = members.filter(m => m.status === 'working');
  const busyMembers = members.filter(m => m.status === 'busy');
  const idleMembers = members.filter(m => m.status === 'idle');
  const offlineMembers = members.filter(m => m.status === 'offline');

  return (
    <div className="space-y-4">
      {/* 工作中 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-green-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-green-800 flex items-center gap-2">
            <span>🔥</span> 工作中 ({workingMembers.length})
          </h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {workingMembers.map(member => (
            <MemberCard key={member.id} member={member} compact />
          ))}
          {workingMembers.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              暂无成员工作中
            </div>
          )}
        </div>
      </div>

      {/* 忙碌中 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-yellow-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
            <span>⚡</span> 忙碌中 ({busyMembers.length})
          </h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {busyMembers.map(member => (
            <MemberCard key={member.id} member={member} compact />
          ))}
          {busyMembers.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              暂无成员忙碌中
            </div>
          )}
        </div>
      </div>

      {/* 空闲中 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span>😊</span> 空闲中 ({idleMembers.length})
          </h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {idleMembers.map(member => (
            <MemberCard key={member.id} member={member} compact />
          ))}
          {idleMembers.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              暂无成员空闲
            </div>
          )}
        </div>
      </div>

      {/* 离线 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
            <span>⚫</span> 离线 ({offlineMembers.length})
          </h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {offlineMembers.map(member => (
            <MemberCard key={member.id} member={member} compact />
          ))}
          {offlineMembers.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              无离线成员
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
