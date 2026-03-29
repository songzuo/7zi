'use client';

/**
 * Dashboard.tsx
 * Main dashboard page for AI Agent Scheduler
 * Integrates AgentStatusPanel, TaskQueueView, and ScheduleHistory components
 */

import React, { useState, useCallback } from 'react';
import { useSchedulerStore } from '../stores/scheduler-store';
import { AgentStatusPanel } from './AgentStatusPanel';
import { TaskQueueView } from './TaskQueueView';
import { ScheduleHistory } from './ScheduleHistory';
import { ManualOverride } from './ManualOverride';

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
} from 'lucide-react';

/**
 * Dashboard tab type
 */
export type DashboardTab = 'overview' | 'agents' | 'tasks' | 'history' | 'manual';

/**
 * Tab configuration
 */
const TABS: Array<{
  id: DashboardTab;
  label: string;
  labelEn: string;
  icon: any;
  description: string;
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
];

/**
 * Tab button component
 */
function TabButton({
  tab,
  isActive,
  onClick,
  language,
}: {
  tab: typeof TABS[number];
  isActive: boolean;
  onClick: () => void;
  language: 'zh' | 'en';
}) {
  const Icon = tab.icon;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
        ${isActive
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        }
      `}
    >
      <Icon className="w-5 h-5" />
      <span>{language === 'zh' ? tab.label : tab.labelEn}</span>
    </button>
  );
}

/**
 * Statistics summary component
 */
function StatsSummary() {
  const stats = useSchedulerStore(state => state.stats);
  const agents = useSchedulerStore(state => state.agents);
  const recentDecisions = useSchedulerStore(state => state.recentDecisions);

  const availableAgents = agents.filter(a => a.availability).length;
  const busyAgents = agents.filter(a => a.availability && a.currentLoad > 70).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            总任务数
          </span>
          <ListTodo className="w-5 h-5 text-blue-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {stats.totalTasks}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="text-blue-600 font-medium">{stats.pendingTasks} 待处理</span>
          <span>•</span>
          <span className="text-green-600 font-medium">{stats.completedTasks} 已完成</span>
        </div>
      </div>

      {/* Agent Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Agent 状态
          </span>
          <Users className="w-5 h-5 text-purple-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {availableAgents}/{agents.length}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="text-green-600 font-medium">{availableAgents} 可用</span>
          <span>•</span>
          <span className="text-yellow-600 font-medium">{busyAgents} 忙碌</span>
        </div>
      </div>

      {/* Average Confidence */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            平均置信度
          </span>
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {(stats.averageConfidence * 100).toFixed(1)}%
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          最近 {recentDecisions.length} 次调度
        </div>
      </div>

      {/* Failed Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            失败任务
          </span>
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {stats.failedTasks}
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          需要重新调度
        </div>
      </div>
    </div>
  );
}

/**
 * Quick actions component
 */
function QuickActions({
  onManualSchedule,
  onRefresh,
  isRefreshing,
}: {
  onManualSchedule: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onManualSchedule}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
      >
        <Zap className="w-4 h-4" />
        手动调度
      </button>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium border border-gray-300 dark:border-gray-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        刷新
      </button>
    </div>
  );
}

/**
 * Main Dashboard component
 */
export function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    isLoading,
    error,
    refresh,
    scheduleNextBatch,
    clearError,
    pendingTasks,
  } = useSchedulerStore();

  // Initialize store
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Handle manual schedule
  const handleManualSchedule = useCallback(async () => {
    setActiveTab('manual');
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      refresh();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [refresh]);

  // Handle batch schedule
  const handleScheduleBatch = useCallback(async () => {
    try {
      await scheduleNextBatch();
      refresh();
    } catch (err) {
      console.error('Schedule batch failed:', err);
    }
  }, [scheduleNextBatch, refresh]);

  // Clear error
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  AI Agent 调度器
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Agent Scheduler Dashboard
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Language toggle */}
              <button
                onClick={() => setLanguage(lang => lang === 'zh' ? 'en' : 'zh')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">错误</span>
            </div>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-2 mb-6 border border-gray-200 dark:border-gray-700">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          {activeTab === 'overview' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {language === 'zh' ? '系统总览' : 'System Overview'}
              </h2>
              <StatsSummary />

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <button
                  onClick={handleScheduleBatch}
                  className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                >
                  <Zap className="w-6 h-6 mb-2" />
                  <div className="font-semibold mb-1">批量调度</div>
                  <div className="text-xs opacity-90">调度下一个批次任务</div>
                </button>

                <button
                  onClick={() => setActiveTab('agents')}
                  className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md"
                >
                  <Users className="w-6 h-6 mb-2" />
                  <div className="font-semibold mb-1">Agent 管理</div>
                  <div className="text-xs opacity-90">管理所有 AI Agent</div>
                </button>

                <button
                  onClick={() => setActiveTab('tasks')}
                  className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md"
                >
                  <ListTodo className="w-6 h-6 mb-2" />
                  <div className="font-semibold mb-1">任务管理</div>
                  <div className="text-xs opacity-90">查看和管理任务队列</div>
                </button>
              </div>

              {/* Recent Activity */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {language === 'zh' ? '最近活动' : 'Recent Activity'}
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        系统正常运行
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        刚刚
                      </span>
                    </div>
                  </div>
                  {pendingTasks.length > 0 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-yellow-700 dark:text-yellow-400">
                          {pendingTasks.length} 个待处理任务
                        </span>
                        <button
                          onClick={handleScheduleBatch}
                          className="text-xs text-yellow-800 dark:text-yellow-300 font-medium hover:underline"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            AI Agent Scheduler Dashboard • Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
