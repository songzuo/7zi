'use client'

/**
 * Dashboard.tsx
 * Main dashboard page for AI Agent Scheduler
 * Integrates AgentStatusPanel, TaskQueueView, and ScheduleHistory components
 */

import React, { useState, useCallback } from 'react'
import { useSchedulerStore } from '../stores/scheduler-store'
import { AgentStatusPanel } from './AgentStatusPanel'
import { TaskQueueView } from './TaskQueueView'
import { ScheduleHistory } from './ScheduleHistory'
import { ManualOverride } from './ManualOverride'

import {
  LayoutDashboard,
  Users,
  ListTodo,
  History,
  RefreshCw,
  Settings,
  Zap,
  Plus,
  AlertTriangle,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'

/**
 * Dashboard tab type
 */
export type DashboardTab = 'overview' | 'agents' | 'tasks' | 'history' | 'manual'

/**
 * Tab configuration
 */
const TABS: Array<{
  id: DashboardTab
  label: string
  labelEn: string
  icon: LucideIcon
  description: string
}> = [
  {
    id: 'overview',
    label: '总览',
    labelEn: 'Overview',
    icon: LayoutDashboard,
    description: '系统整体状态概览',
  },
  {
    id: 'agents',
    label: 'Agent 状态',
    labelEn: 'Agent Status',
    icon: Users,
    description: '查看所有 Agent 的运行状态',
  },
  {
    id: 'tasks',
    label: '任务队列',
    labelEn: 'Task Queue',
    icon: ListTodo,
    description: '管理和查看所有任务',
  },
  {
    id: 'history',
    label: '调度历史',
    labelEn: 'Schedule History',
    icon: History,
    description: '查看调度决策记录',
  },
  {
    id: 'manual',
    label: '手动调度',
    labelEn: 'Manual Override',
    icon: Zap,
    description: '手动分配任务到 Agent',
  },
]

/**
 * Tab button component
 */
function TabButton({
  tab,
  isActive,
  onClick,
  language,
}: {
  tab: (typeof TABS)[number]
  isActive: boolean
  onClick: () => void
  language: 'zh' | 'en'
}) {
  const Icon = tab.icon

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-3 font-medium transition-all ${
        isActive
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      } `}
    >
      <Icon className="h-5 w-5" />
      <span>{language === 'zh' ? tab.label : tab.labelEn}</span>
    </button>
  )
}

/**
 * Statistics summary component
 */
function StatsSummary() {
  const stats = useSchedulerStore(state => state.stats)
  const agents = useSchedulerStore(state => state.agents)
  const recentDecisions = useSchedulerStore(state => state.recentDecisions)

  const availableAgents = agents.filter(a => a.availability).length
  const busyAgents = agents.filter(a => a.availability && a.currentLoad > 70).length

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Tasks */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">总任务数</span>
          <ListTodo className="h-5 w-5 text-blue-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalTasks}</div>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-blue-600">{stats.pendingTasks} 待处理</span>
          <span>•</span>
          <span className="font-medium text-green-600">{stats.completedTasks} 已完成</span>
        </div>
      </div>

      {/* Agent Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Agent 状态</span>
          <Users className="h-5 w-5 text-purple-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {availableAgents}/{agents.length}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-green-600">{availableAgents} 可用</span>
          <span>•</span>
          <span className="font-medium text-yellow-600">{busyAgents} 忙碌</span>
        </div>
      </div>

      {/* Average Confidence */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">平均置信度</span>
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {(stats.averageConfidence * 100).toFixed(1)}%
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          最近 {recentDecisions.length} 次调度
        </div>
      </div>

      {/* Failed Tasks */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">失败任务</span>
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.failedTasks}</div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">需要重新调度</div>
      </div>
    </div>
  )
}

/**
 * Quick actions component
 */
function QuickActions({
  onManualSchedule,
  onRefresh,
  isRefreshing,
}: {
  onManualSchedule: () => void
  onRefresh: () => void
  isRefreshing: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onManualSchedule}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <Zap className="h-4 w-4" />
        手动调度
      </button>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        刷新
      </button>
    </div>
  )
}

/**
 * Main Dashboard component
 */
export function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [language, setLanguage] = useState<'zh' | 'en'>('zh')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { isLoading, error, refresh, scheduleNextBatch, clearError, pendingTasks } =
    useSchedulerStore()

  // Initialize store
  React.useEffect(() => {
    refresh()
  }, [refresh])

  // Handle manual schedule
  const handleManualSchedule = useCallback(async () => {
    setActiveTab('manual')
  }, [])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      refresh()
    } catch (err) {
      console.error('Refresh failed:', err)
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }, [refresh])

  // Handle batch schedule
  const handleScheduleBatch = useCallback(async () => {
    try {
      await scheduleNextBatch()
      refresh()
    } catch (err) {
      console.error('Schedule batch failed:', err)
    }
  }, [scheduleNextBatch, refresh])

  // Clear error
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Agent 调度器</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Agent Scheduler Dashboard
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Language toggle */}
              <button
                onClick={() => setLanguage(lang => (lang === 'zh' ? 'en' : 'zh'))}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {language === 'zh' ? 'EN' : '中文'}
              </button>

              <QuickActions
                onManualSchedule={handleManualSchedule}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing || isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-100 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">错误</span>
            </div>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 overflow-x-auto">
            {TABS.map(tab => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                language={language}
              />
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {activeTab === 'overview' && (
            <div className="p-6">
              <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
                {language === 'zh' ? '系统总览' : 'System Overview'}
              </h2>
              <StatsSummary />

              {/* Quick Actions Grid */}
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <button
                  onClick={handleScheduleBatch}
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700"
                >
                  <Zap className="mb-2 h-6 w-6" />
                  <div className="mb-1 font-semibold">批量调度</div>
                  <div className="text-xs opacity-90">调度下一个批次任务</div>
                </button>

                <button
                  onClick={() => setActiveTab('agents')}
                  className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white shadow-md transition-all hover:from-purple-600 hover:to-purple-700"
                >
                  <Users className="mb-2 h-6 w-6" />
                  <div className="mb-1 font-semibold">Agent 管理</div>
                  <div className="text-xs opacity-90">管理所有 AI Agent</div>
                </button>

                <button
                  onClick={() => setActiveTab('tasks')}
                  className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 p-4 text-white shadow-md transition-all hover:from-green-600 hover:to-green-700"
                >
                  <ListTodo className="mb-2 h-6 w-6" />
                  <div className="mb-1 font-semibold">任务管理</div>
                  <div className="text-xs opacity-90">查看和管理任务队列</div>
                </button>
              </div>

              {/* Recent Activity */}
              <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  {language === 'zh' ? '最近活动' : 'Recent Activity'}
                </h3>
                <div className="space-y-3">
                  <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">系统正常运行</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">刚刚</span>
                    </div>
                  </div>
                  {pendingTasks.length > 0 && (
                    <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-yellow-700 dark:text-yellow-400">
                          {pendingTasks.length} 个待处理任务
                        </span>
                        <button
                          onClick={handleScheduleBatch}
                          className="text-xs font-medium text-yellow-800 hover:underline dark:text-yellow-300"
                        >
                          立即调度
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="p-6">
              <AgentStatusPanel />
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="p-6">
              <TaskQueueView />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-6">
              <ScheduleHistory />
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="p-6">
              <ManualOverride />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>AI Agent Scheduler Dashboard • Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
