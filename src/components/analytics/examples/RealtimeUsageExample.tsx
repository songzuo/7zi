/**
 * Example Usage of Real-time Analytics Components
 * 实时分析组件使用示例
 */

'use client'

import { RealtimeMetricsDashboard } from '@/components/analytics'
import { useRealtimeAnalytics } from '@/lib/hooks/useRealtimeAnalytics'

// ============================================================================
// Example 1: Basic Usage - Full Dashboard
// ============================================================================

export function ExampleBasicDashboard() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-900">
      <RealtimeMetricsDashboard
        enabled={true}
        locale="zh"
        showConnectionStatus={true}
        showTaskStatus={true}
        showTeamEfficiency={true}
        wsConfig={{
          url: 'ws://localhost:3001',
          reconnectInterval: 5000,
          maxReconnectAttempts: 10,
          heartbeatInterval: 30000,
        }}
      />
    </div>
  )
}

// ============================================================================
// Example 2: Custom Dashboard with Individual Components
// ============================================================================

import {
  RealtimeConnectionStatus,
  RealtimeTaskStatusChart,
  RealtimeTeamEfficiency,
} from '@/components/analytics'

export function ExampleCustomDashboard() {
  const { connection, taskDistribution, teamEfficiency, refresh, connect } = useRealtimeAnalytics({
    url: 'ws://localhost:3001',
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-800">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">实时监控系统</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">通过 WebSocket 实时推送系统状态</p>
      </div>

      {/* Connection Status */}
      <RealtimeConnectionStatus
        connection={connection}
        onRefresh={refresh}
        onReconnect={connect}
        showDetails={true}
        locale="zh"
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Task Status Chart */}
        <RealtimeTaskStatusChart
          distribution={taskDistribution}
          showHistory={true}
          showChanges={true}
          locale="zh"
          height={400}
        />

        {/* Team Efficiency */}
        <RealtimeTeamEfficiency metrics={teamEfficiency} showDetails={true} locale="zh" />
      </div>
    </div>
  )
}

// ============================================================================
// Example 3: English Language
// ============================================================================

export function ExampleEnglishDashboard() {
  return (
    <div className="p-6">
      <RealtimeMetricsDashboard
        enabled={true}
        locale="en"
        wsConfig={{
          url: 'ws://localhost:3001',
        }}
      />
    </div>
  )
}

// ============================================================================
// Example 4: Minimal Dashboard (No Connection Status)
// ============================================================================

export function ExampleMinimalDashboard() {
  return (
    <div className="p-6">
      <RealtimeMetricsDashboard
        enabled={true}
        locale="zh"
        showConnectionStatus={false}
        showTaskStatus={true}
        showTeamEfficiency={true}
      />
    </div>
  )
}

// ============================================================================
// Example 5: with Error Handling and Loading States
// ============================================================================

export function ExampleWithErrorHandling() {
  const { connection, taskDistribution, teamEfficiency, isConnected, hasError, connect } =
    useRealtimeAnalytics({
      url: 'ws://localhost:3001',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
    })

  // Show error state
  if (hasError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-300 bg-red-100 p-6 dark:border-red-700 dark:bg-red-900/30">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">连接错误</h2>
          <p className="mt-2 text-red-700 dark:text-red-300">无法连接到 WebSocket 服务器</p>
          <button
            onClick={connect}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            重新连接
          </button>
        </div>
      </div>
    )
  }

  // Show loading state
  if (!isConnected && connection.status === 'connecting') {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-zinc-600 dark:text-zinc-400">正在连接到 WebSocket 服务器...</p>
        </div>
      </div>
    )
  }

  // Show dashboard
  return (
    <div className="p-6">
      <RealtimeMetricsDashboard
        enabled={true}
        locale="zh"
        showConnectionStatus={false}
        showTaskStatus={true}
        showTeamEfficiency={true}
      />
    </div>
  )
}

// ============================================================================
// Example 6: Integration with Page Component
// ============================================================================

export default function AnalyticsRealtimePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">实时性能指标</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            实时监控系统性能、任务状态和团队效率
          </p>
        </div>

        <RealtimeMetricsDashboard
          enabled={true}
          locale="zh"
          wsConfig={{
            url: process.env.NEXT_PUBLIC_REALTIME_WS_URL || 'ws://localhost:3001',
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            heartbeatInterval: 30000,
          }}
        />
      </div>
    </div>
  )
}
