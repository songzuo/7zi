'use client';

/**
 * Dashboard 主页面
 * 
 * 功能:
 * - 整合统计卡片、最近活动、快捷操作等组件
 * - 使用 next-intl 的 useTranslations
 * - 响应式布局（移动端/桌面端）
 * - 加载状态和错误处理
 * - 支持深色模式
 */

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { DashboardStats, createDefaultStats } from '@/components/dashboard/DashboardStats';
import { RecentActivity, createMockActivities } from '@/components/dashboard/RecentActivity';
import { QuickActions, minimalActions } from '@/components/dashboard/QuickActions';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useMembers } from '@/stores/dashboardStore';
import type { StatItem, ActivityItem } from '@/components/dashboard';

// ============================================================================
// 类型定义
// ============================================================================

interface DashboardPageProps {
  locale: string;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 从 dashboardStore 转换为统计卡片数据
 */
function convertToStats(members: any[], locale: string): StatItem[] {
  const workingCount = members.filter(m => m.status === 'working').length;
  const busyCount = members.filter(m => m.status === 'busy').length;
  const idleCount = members.filter(m => m.status === 'idle').length;
  const onlineCount = members.filter(m => m.status !== 'offline').length;
  const totalTasks = members.reduce((sum, m) => sum + (m.completedTasks || 0), 0);
  
  // 计算调度效率（基于在线成员比例）
  const efficiency = members.length > 0 
    ? Math.round((onlineCount / members.length) * 100) 
    : 0;

  return [
    {
      id: 'tasks',
      label: '活跃任务',
      labelEn: 'Active Tasks',
      value: workingCount,
      icon: null, // 使用默认图标
      color: 'blue',
      description: locale === 'zh' 
        ? `${workingCount} 个任务正在进行中` 
        : `${workingCount} tasks in progress`,
    },
    {
      id: 'completed',
      label: '已完成任务',
      labelEn: 'Completed',
      value: totalTasks,
      icon: null,
      color: 'green',
      trend: 'up',
      trendValue: '+12%',
    },
    {
      id: 'members',
      label: '在线成员',
      labelEn: 'Online Members',
      value: onlineCount,
      icon: null,
      color: 'purple',
      description: locale === 'zh'
        ? `${onlineCount} / ${members.length} 成员在线`
        : `${onlineCount} / ${members.length} members online`,
    },
    {
      id: 'efficiency',
      label: '调度效率',
      labelEn: 'Efficiency',
      value: efficiency,
      unit: '%',
      icon: null,
      color: 'cyan',
      trend: 'up',
      trendValue: '+5%',
    },
  ];
}

/**
 * 从 dashboardStore 的 activities 转换为最近活动数据
 */
function convertToActivities(activities: any[], locale: string): ActivityItem[] {
  return activities.slice(0, 10).map((activity, index) => ({
    id: activity.id || `activity-${index}`,
    type: activity.type || 'system',
    title: activity.title || locale === 'zh' ? '活动记录' : 'Activity',
    titleEn: activity.titleEn || 'Activity',
    description: activity.description,
    descriptionEn: activity.descriptionEn,
    actor: activity.actor,
    target: activity.target,
    timestamp: activity.timestamp || new Date().toISOString(),
  }));
}

// ============================================================================
// 加载组件
// ============================================================================

const DashboardLoading: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
    <div className="text-center space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Loading Dashboard...
      </p>
    </div>
  </div>
);

const SectionLoading: React.FC<{ title: string }> = ({ title }) => (
  <Card className="border border-zinc-200 dark:border-zinc-700">
    <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
      <div className="w-24 h-5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
    </div>
    <div className="p-4 space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
      ))}
    </div>
  </Card>
);

// ============================================================================
// 主页面组件
// ============================================================================

export default function DashboardPage({ locale }: DashboardPageProps) {
  const t = useTranslations('dashboard');
  
  // 使用现有的 dashboardData hook
  const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'songzhuo';
  const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'openclaw-workspace';
  
  const {
    issues,
    activities,
    isLoading,
    error,
    lastUpdated,
    refreshData,
  } = useDashboardData(GITHUB_OWNER, GITHUB_REPO);
  
  // 从 store 获取成员数据
  const members = useMembers();
  
  // 状态管理
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 自动刷新（30秒）
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshData]);

  // 手动刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  // 加载状态
  if (isLoading && !issues.length) {
    return <DashboardLoading />;
  }

  // 转换数据
  const stats = convertToStats(members, locale);
  const convertedActivities = convertToActivities(activities, locale);
  
  // 如果没有活动数据，使用 mock 数据
  const displayActivities = convertedActivities.length > 0 
    ? convertedActivities 
    : createMockActivities(5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800">
      {/* 顶部导航栏 */}
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>📊</span>
                <span className="hidden sm:inline">{t('title', { defaultValue: 'Dashboard' })}</span>
                <span className="sm:hidden">{t('titleShort', { defaultValue: 'Dashboard' })}</span>
              </h1>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
              {/* 自动刷新开关 */}
              <label className="flex items-center gap-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="hidden sm:inline">
                  {t('autoRefresh', { defaultValue: 'Auto Refresh' })}
                </span>
              </label>
              
              {/* 最后更新时间 */}
              <span className="hidden lg:block text-xs text-zinc-400 dark:text-zinc-500">
                {t('updated', { defaultValue: 'Updated' })}: {lastUpdated?.toLocaleTimeString() || '-'}
              </span>
              
              {/* 刷新按钮 */}
              <button
                onClick={handleRefresh}
                disabled={isLoading || refreshing}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
                <span className="hidden sm:inline">
                  {t('refresh', { defaultValue: 'Refresh' })}
                </span>
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
            <p className="text-red-800 dark:text-red-200 text-sm">
              ⚠️ {error}
            </p>
          </div>
        )}

        {/* 统计卡片 */}
        <section className="mb-6">
          <Suspense fallback={<SectionLoading title={t('stats', { defaultValue: 'Statistics' })} />}>
            <DashboardStats
              stats={stats}
              locale={locale}
              loading={isLoading}
              columns={4}
              variant="detailed"
            />
          </Suspense>
        </section>

        {/* 快捷操作 */}
        <section className="mb-6">
          <Suspense fallback={<SectionLoading title={t('quickActions', { defaultValue: 'Quick Actions' })} />}>
            <QuickActions
              actions={minimalActions}
              locale={locale}
              loading={isLoading}
              columns={4}
              variant="default"
              size="md"
            />
          </Suspense>
        </section>

        {/* 两栏布局：最近活动 + 其他内容 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* 最近活动 */}
          <div>
            <Suspense fallback={<SectionLoading title={t('recentActivity', { defaultValue: 'Recent Activity' })} />}>
              <RecentActivity
                activities={displayActivities}
                locale={locale}
                loading={isLoading}
                maxItems={10}
                showEmpty={true}
                variant="default"
                onItemClick={(activity) => {
                  console.log('Activity clicked:', activity);
                }}
              />
            </Suspense>
          </div>

          {/* 成员状态概览（简化版） */}
          <div>
            <Card>
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>👥</span>
                  {t('members', { defaultValue: 'Team Members' })}
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {members.filter(m => m.status === 'working').length}
                    </div>
                    <div className="text-xs text-green-800 dark:text-green-300 mt-1">
                      {t('working', { defaultValue: 'Working' })}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {members.filter(m => m.status === 'busy').length}
                    </div>
                    <div className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
                      {t('busy', { defaultValue: 'Busy' })}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {members.filter(m => m.status === 'idle').length}
                    </div>
                    <div className="text-xs text-gray-800 dark:text-gray-300 mt-1">
                      {t('idle', { defaultValue: 'Idle' })}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                      {members.filter(m => m.status === 'offline').length}
                    </div>
                    <div className="text-xs text-slate-800 dark:text-slate-300 mt-1">
                      {t('offline', { defaultValue: 'Offline' })}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 底部信息 */}
        <footer className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <p>
            {t('footer', { defaultValue: 'Dashboard powered by 7zi Studio' })}
          </p>
        </footer>
      </main>
    </div>
  );
}
