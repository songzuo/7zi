'use client'

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

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/Card'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentActivity, createMockActivities } from '@/components/dashboard/RecentActivity'
import { QuickActions, minimalActions } from '@/components/dashboard/QuickActions'
import { useDashboardData } from '@/hooks/useDashboardData'
import type { ActivityItem as GitHubActivityItem } from '@/hooks/useDashboardData'
import { useMembers } from '@/stores/dashboardStore'
import type { StatItem, ActivityItem, ActivityType } from '@/components/dashboard'
import { TaskQueueView } from '@/components/dashboard/TaskQueueView'
import { AgentStatusPanel } from '@/components/dashboard/AgentStatusPanel'
import { ManualOverride } from '@/components/dashboard/ManualOverride'
import { ScheduleHistory } from '@/components/dashboard/ScheduleHistory'
import {
  Skeleton,
  SkeletonCard,
  SkeletonStatCard,
  SkeletonList,
} from '@/components/ui/Skeleton'

// ============================================================================
// 类型定义
// ============================================================================

interface DashboardPageProps {
  locale: string
}

interface MemberItem {
  status: 'online' | 'working' | 'busy' | 'idle' | 'offline'
  completedTasks?: number
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 从 dashboardStore 转换为统计卡片数据
 */
function convertToStats(members: MemberItem[], locale: string): StatItem[] {
  const workingCount = members.filter(m => m.status === 'working').length
  const _busyCount = members.filter(m => m.status === 'busy').length
  const _idleCount = members.filter(m => m.status === 'idle').length
  const onlineCount = members.filter(m => m.status !== 'offline').length
  const totalTasks = members.reduce((sum, m) => sum + (m.completedTasks || 0), 0)

  // 计算调度效率（基于在线成员比例）
  const efficiency = members.length > 0 ? Math.round((onlineCount / members.length) * 100) : 0

  return [
    {
      id: 'tasks',
      label: '活跃任务',
      labelEn: 'Active Tasks',
      value: workingCount,
      color: 'blue',
      description:
        locale === 'zh' ? `${workingCount} 个任务正在进行中` : `${workingCount} tasks in progress`,
    },
    {
      id: 'completed',
      label: '已完成任务',
      labelEn: 'Completed',
      value: totalTasks,
      color: 'green',
      trend: 'up',
      trendValue: '+12%',
    },
    {
      id: 'members',
      label: '在线成员',
      labelEn: 'Online Members',
      value: onlineCount,
      color: 'purple',
      description:
        locale === 'zh'
          ? `${onlineCount} / ${members.length} 成员在线`
          : `${onlineCount} / ${members.length} members online`,
    },
    {
      id: 'efficiency',
      label: '调度效率',
      labelEn: 'Efficiency',
      value: efficiency,
      unit: '%',
      color: 'cyan',
      trend: 'up',
      trendValue: '+5%',
    },
  ]
}

/**
 * 从 GitHub activities 转换为最近活动数据
 * useDashboardData 返回的 activities 是 GitHub 格式，需要转换为 RecentActivity 格式
 */
function convertToActivities(activities: GitHubActivityItem[], locale: string): ActivityItem[] {
  return activities.slice(0, 10).map(activity => ({
    id: activity.id,
    type: mapActivityType(activity.type),
    title: activity.title || (locale === 'zh' ? '活动记录' : 'Activity'),
    titleEn: activity.title,
    actor: activity.author ? { name: activity.author, avatar: activity.avatar } : undefined,
    timestamp: activity.timestamp,
  }))
}

/**
 * 映射 GitHub 活动类型到系统活动类型
 */
function mapActivityType(type: 'commit' | 'issue' | 'comment'): ActivityType {
  switch (type) {
    case 'commit':
      return 'task_completed'
    case 'issue':
      return 'task_created'
    case 'comment':
      return 'comment'
    default:
      return 'system'
  }
}

// ============================================================================
// 加载组件
// ============================================================================

const DashboardLoading: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800">
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton variant="text" className="h-8 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton variant="rounded" className="h-6 w-24" />
          <Skeleton variant="rounded" className="h-10 w-24" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" className="h-10 w-10" />
              <div className="flex-1">
                <Skeleton variant="text" className="mb-2 h-4 w-20" />
                <Skeleton variant="text" className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <SkeletonCard hasImage={false} hasAvatar lines={3} hasActions={false} />
        <SkeletonCard hasImage={false} hasAvatar lines={3} hasActions={false} />
      </div>
    </div>
  </div>
)

const SectionLoading: React.FC<{ title: string }> = () => (
  <Card className="border border-zinc-200 dark:border-zinc-700">
    <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
      <Skeleton variant="text" className="h-5 w-24" />
    </div>
    <div className="space-y-3 p-4">
      <SkeletonList items={3} hasAvatar />
    </div>
  </Card>
)

// ============================================================================
// 主页面组件
// ============================================================================

export default function DashboardPage({ locale }: DashboardPageProps) {
  const t = useTranslations('dashboard')

  // 使用现有的 dashboardData hook
  const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'songzhuo'
  const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'openclaw-workspace'

  const { issues, activities, isLoading, error, lastUpdated, refreshData } = useDashboardData(
    GITHUB_OWNER,
    GITHUB_REPO
  )

  // 从 store 获取成员数据
  const members = useMembers()

  // 状态管理
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // 调度器组件的 Tab 状态
  const [activeSchedulerTab, setActiveSchedulerTab] = useState<
    'tasks' | 'agents' | 'manual' | 'history'
  >('tasks')

  // 自动刷新（30秒）
  useEffect(() => {
    if (!autoRefresh) return

    const timer = setInterval(() => {
      refreshData()
    }, 30000)

    return () => clearInterval(timer)
  }, [autoRefresh, refreshData])

  // 手动刷新
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshData()
    } finally {
      setRefreshing(false)
    }
  }

  // 加载状态
  if (isLoading && !issues.length) {
    return <DashboardLoading />
  }

  // 转换数据
  const stats = convertToStats(members, locale)
  const convertedActivities = convertToActivities(activities, locale)

  // 如果没有活动数据，使用 mock 数据
  const displayActivities =
    convertedActivities.length > 0 ? convertedActivities : createMockActivities(5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <div className="mx-auto max-w-[1800px] px-4 py-3 md:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 md:text-3xl dark:text-white">
                <span>📊</span>
                <span className="hidden sm:inline">
                  {t('title', { defaultValue: 'Dashboard' })}
                </span>
                <span className="sm:hidden">{t('titleShort', { defaultValue: 'Dashboard' })}</span>
              </h1>
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-3">
              {/* 自动刷新开关 */}
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
                />
                <span className="hidden sm:inline">
                  {t('autoRefresh', { defaultValue: 'Auto Refresh' })}
                </span>
              </label>

              {/* 最后更新时间 */}
              <span className="hidden text-xs text-zinc-400 lg:block dark:text-zinc-500">
                {t('updated', { defaultValue: 'Updated' })}:{' '}
                {lastUpdated?.toLocaleTimeString() || '-'}
              </span>

              {/* 刷新按钮 */}
              <button
                onClick={handleRefresh}
                disabled={isLoading || refreshing}
                className="flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
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
      <main className="mx-auto max-w-[1800px] px-3 py-4 sm:px-4 sm:py-6">
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 sm:mb-6 sm:p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">⚠️ {error}</p>
          </div>
        )}

        {/* 统计卡片 */}
        <section className="mb-6">
          <Suspense
            fallback={<SectionLoading title={t('stats', { defaultValue: 'Statistics' })} />}
          >
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
          <Suspense
            fallback={
              <SectionLoading title={t('quickActions', { defaultValue: 'Quick Actions' })} />
            }
          >
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

        {/* 调度中心 - 集成的 Sprint 3 组件 */}
        <section className="mb-6">
          <Card>
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                  <span>🎛️</span>
                  {locale === 'zh' ? '调度中心' : 'Scheduler Center'}
                </h3>

                {/* Tab 切换 */}
                <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
                  <button
                    onClick={() => setActiveSchedulerTab('tasks')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeSchedulerTab === 'tasks'
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    {locale === 'zh' ? '任务队列' : 'Task Queue'}
                  </button>
                  <button
                    onClick={() => setActiveSchedulerTab('agents')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeSchedulerTab === 'agents'
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    {locale === 'zh' ? '智能体状态' : 'Agent Status'}
                  </button>
                  <button
                    onClick={() => setActiveSchedulerTab('manual')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeSchedulerTab === 'manual'
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    {locale === 'zh' ? '手动调度' : 'Manual Override'}
                  </button>
                  <button
                    onClick={() => setActiveSchedulerTab('history')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeSchedulerTab === 'history'
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    {locale === 'zh' ? '执行历史' : 'History'}
                  </button>
                </div>
              </div>
            </div>

            {/* Tab 内容 */}
            <div className="p-4">
              {activeSchedulerTab === 'tasks' && (
                <TaskQueueView
                  showFilters={true}
                  showSort={true}
                  autoRefresh={true}
                  refreshInterval={30000}
                  maxDisplay={10}
                  onTaskClick={task => {
                    console.debug('Task clicked:', task.id)
                  }}
                />
              )}

              {activeSchedulerTab === 'agents' && (
                <AgentStatusPanel
                  showRefresh={true}
                  showMetrics={true}
                  autoRefresh={true}
                  refreshInterval={10000}
                  maxDisplay={8}
                  onAgentClick={agent => {
                    console.debug('Agent clicked:', agent.agentId)
                  }}
                />
              )}

              {activeSchedulerTab === 'manual' && (
                <ManualOverride
                  maxPendingDisplay={5}
                  onTaskCreated={task => {
                    console.debug('Task created:', task.id)
                  }}
                  onTaskCancelled={taskId => {
                    console.debug('Task cancelled:', taskId)
                  }}
                />
              )}

              {activeSchedulerTab === 'history' && (
                <ScheduleHistory
                  showFilters={true}
                  autoRefresh={true}
                  refreshInterval={30000}
                  pageSize={10}
                  maxDisplay={20}
                  onEntryClick={entry => {
                    console.debug('History entry clicked:', entry.taskId)
                  }}
                />
              )}
            </div>
          </Card>
        </section>

        {/* 两栏布局：最近活动 + 其他内容 */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {/* 最近活动 */}
          <div>
            <Suspense
              fallback={
                <SectionLoading title={t('recentActivity', { defaultValue: 'Recent Activity' })} />
              }
            >
              <RecentActivity
                activities={displayActivities}
                locale={locale}
                loading={isLoading}
                maxItems={10}
                showEmpty={true}
                variant="default"
                onItemClick={activity => {
                  console.debug('Activity clicked:', activity.id)
                }}
              />
            </Suspense>
          </div>

          {/* 成员状态概览（简化版） */}
          <div>
            <Card>
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
                  <span>👥</span>
                  {t('members', { defaultValue: 'Team Members' })}
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {members.filter(m => m.status === 'working').length}
                    </div>
                    <div className="mt-1 text-xs text-green-800 dark:text-green-300">
                      {t('working', { defaultValue: 'Working' })}
                    </div>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-3 text-center dark:bg-yellow-900/20">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {members.filter(m => m.status === 'busy').length}
                    </div>
                    <div className="mt-1 text-xs text-yellow-800 dark:text-yellow-300">
                      {t('busy', { defaultValue: 'Busy' })}
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-900/20">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {members.filter(m => m.status === 'idle').length}
                    </div>
                    <div className="mt-1 text-xs text-gray-800 dark:text-gray-300">
                      {t('idle', { defaultValue: 'Idle' })}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-900/20">
                    <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                      {members.filter(m => m.status === 'offline').length}
                    </div>
                    <div className="mt-1 text-xs text-slate-800 dark:text-slate-300">
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
          <p>{t('footer', { defaultValue: 'Dashboard powered by 7zi Studio' })}</p>
        </footer>
      </main>
    </div>
  )
}
