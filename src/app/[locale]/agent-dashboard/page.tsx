/**
 * Agent Dashboard - Main Page
 *
 * AI Agent Scheduling Dashboard with real-time monitoring
 */

'use client'

import { useEffect, useMemo } from 'react'
import { useDarkMode } from '@/stores/preferencesStore'
import {
  useSchedulerStore,
  selectAgents,
  selectTasks,
  selectStats,
  selectIsLoading,
  selectError,
} from '@/lib/agents/scheduler/stores/scheduler-store'
import StatsCard, { type TrendDirection } from '@/components/agent-dashboard/StatsCard'
import TaskList from '@/components/agent-dashboard/TaskList'
import TeamStatus from '@/components/agent-dashboard/TeamStatus'
import { useTranslations } from 'next-intl'

// ============================================================================
// Types
// ============================================================================

// ============================================================================
// Component
// ============================================================================

export default function AgentDashboardPage() {
  const isDark = useDarkMode()
  const t = useTranslations('agentDashboard')

  const initialize = useSchedulerStore(state => state.initialize)
  const refresh = useSchedulerStore(state => state.refresh)
  const agents = useSchedulerStore(selectAgents)
  const tasks = useSchedulerStore(selectTasks)
  const stats = useSchedulerStore(selectStats)
  const isLoading = useSchedulerStore(selectIsLoading)
  const error = useSchedulerStore(selectError)

  // Initialize scheduler on mount
  useEffect(() => {
    initialize()

    // Set up refresh interval for real-time updates
    const interval = setInterval(() => {
      refresh()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [initialize, refresh])

  // Calculate derived statistics
  const derivedStats = useMemo(() => {
    const activeTasks = tasks.filter(t => t.status === 'in_progress').length
    const _pendingTasks = tasks.filter(t => t.status === 'pending').length
    const completedToday = tasks.filter(
      t =>
        t.status === 'completed' &&
        t.createdAt &&
        new Date(t.createdAt).toDateString() === new Date().toDateString()
    ).length

    // Calculate average response time from agents
    const avgResponseTime =
      agents.length > 0
        ? Math.round(
            agents.reduce((sum, a) => sum + a.capabilities.avgResponseTime, 0) / agents.length
          )
        : 0

    // Calculate team efficiency
    const teamEfficiency =
      agents.length > 0
        ? Math.round(
            (agents.reduce((sum, a) => sum + a.capabilities.successRate, 0) / agents.length) * 100
          )
        : 0

    return {
      activeTasks,
      avgResponseTime,
      completedToday,
      teamEfficiency,
    }
  }, [tasks, agents])

  // Get trend direction for stats (simulated for demo)
  const getTrend = (key: string): TrendDirection => {
    // In a real app, this would compare with historical data
    const trends: Record<string, TrendDirection> = {
      activeTasks: 'stable',
      avgResponseTime: 'up', // Lower is better, but up means increased
      completedToday: 'up',
      teamEfficiency: 'stable',
    }
    return trends[key] || 'stable'
  }

  const getTrendValue = (key: string): string => {
    // Simulated trend values
    const values: Record<string, string> = {
      activeTasks: '+0',
      avgResponseTime: '+2.3%',
      completedToday: '+12',
      teamEfficiency: '-0.5%',
    }
    return values[key] || ''
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'} p-4 md:p-6`}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className={`mb-2 text-3xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {t('pageTitle')}
          </h1>
          <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
            实时监控和管理 AI 团队任务调度
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div
            className={`rounded-lg border p-8 text-center ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-white'}`}
          >
            <div className="mb-3 animate-bounce text-4xl">⏳</div>
            <div className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>正在初始化调度器...</div>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title={t('activeTasks')}
                value={derivedStats.activeTasks}
                unit="个任务"
                icon="🔥"
                variant="info"
                trend={getTrend('activeTasks')}
                trendValue={getTrendValue('activeTasks')}
              />
              <StatsCard
                title={t('avgResponse')}
                value={derivedStats.avgResponseTime}
                unit="秒"
                icon="⚡"
                variant="default"
                trend={getTrend('avgResponseTime')}
                trendValue={getTrendValue('avgResponseTime')}
              />
              <StatsCard
                title={t('completedToday')}
                value={derivedStats.completedToday}
                unit="个任务"
                icon="✓"
                variant="success"
                trend={getTrend('completedToday')}
                trendValue={getTrendValue('completedToday')}
              />
              <StatsCard
                title={t('teamEfficiency')}
                value={derivedStats.teamEfficiency}
                unit="%"
                icon="📊"
                variant="warning"
                trend={getTrend('teamEfficiency')}
                trendValue={getTrendValue('teamEfficiency')}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Task List (Left - 2 columns) */}
              <div className="lg:col-span-2">
                <TaskList tasks={tasks} />
              </div>

              {/* Team Status (Right - 1 column) */}
              <div className="lg:col-span-1">
                <TeamStatus agents={agents} />
              </div>
            </div>

            {/* Additional Info Footer */}
            <div
              className={`rounded-lg border p-4 ${isDark ? 'border-zinc-700/50 bg-zinc-800/50' : 'border-zinc-200/50 bg-white/50'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <div
                  className={`flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <span>实时更新中 (每 5 秒)</span>
                </div>
                <div className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                  总任务: {tasks.length} | 待处理:{' '}
                  {tasks.filter(t => t.status === 'pending').length} | 完成: {stats.completedTasks}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
