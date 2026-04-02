'use client'

/**
 * 实时仪表盘组件
 *
 * 功能:
 * - WebSocket 实时数据推送
 * - 性能监控指标
 * - 实时图表
 * - 团队效率分析
 * - 实时统计数据
 */

import React, { useEffect, useState, useCallback, memo } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// ============================================================================
// 类型定义
// ============================================================================

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  change: number
  target?: number
}

export interface TeamEfficiency {
  overall: number
  tasksCompleted: number
  averageCompletionTime: number
  activeMembers: number
  weeklyTrend: number[]
}

export interface RealtimeStats {
  activeConnections: number
  lastPing: Date | null
  dataLatency: number
  updateFrequency: number
}

interface RealtimeDashboardProps {
  locale?: string
  className?: string
}

// ============================================================================
// 模拟数据生成器
// ============================================================================

const generatePerformanceMetrics = (): PerformanceMetric[] => [
  {
    name: 'CPU 使用率',
    value: Math.floor(Math.random() * 30) + 40,
    unit: '%',
    trend: Math.random() > 0.5 ? 'up' : 'down',
    change: Math.random() * 10 - 5,
  },
  {
    name: '内存使用',
    value: Math.floor(Math.random() * 20) + 60,
    unit: '%',
    trend: 'stable',
    change: 0,
    target: 80,
  },
  {
    name: '响应时间',
    value: Math.floor(Math.random() * 50) + 100,
    unit: 'ms',
    trend: Math.random() > 0.5 ? 'down' : 'up',
    change: Math.random() * 20 - 10,
    target: 200,
  },
  {
    name: '任务完成率',
    value: Math.floor(Math.random() * 15) + 80,
    unit: '%',
    trend: 'up',
    change: Math.random() * 5,
    target: 95,
  },
]

const generateTeamEfficiency = (): TeamEfficiency => ({
  overall: Math.floor(Math.random() * 20) + 75,
  tasksCompleted: Math.floor(Math.random() * 50) + 150,
  averageCompletionTime: Math.floor(Math.random() * 30) + 20,
  activeMembers: Math.floor(Math.random() * 3) + 7,
  weeklyTrend: Array.from({ length: 7 }, () => Math.floor(Math.random() * 40) + 60),
})

// ============================================================================
// 主组件
// ============================================================================

export const RealtimeDashboard = memo(
  ({ locale = 'en', className = '' }: RealtimeDashboardProps) => {
    const [metrics, setMetrics] = useState<PerformanceMetric[]>(generatePerformanceMetrics())
    const [efficiency, setEfficiency] = useState<TeamEfficiency>(generateTeamEfficiency())
    const [stats, setStats] = useState<RealtimeStats>({
      activeConnections: 0,
      lastPing: null,
      dataLatency: 0,
      updateFrequency: 2000,
    })
    const [isLoading, setIsLoading] = useState(false)

    // 模拟实时数据更新
    useEffect(() => {
      const interval = setInterval(() => {
        setMetrics(generatePerformanceMetrics())
        setEfficiency(generateTeamEfficiency())
        setStats(prev => ({
          ...prev,
          activeConnections: Math.floor(Math.random() * 50) + 100,
          lastPing: new Date(),
          dataLatency: Math.floor(Math.random() * 100) + 20,
        }))
      }, stats.updateFrequency)

      return () => clearInterval(interval)
    }, [stats.updateFrequency])

    // 趋势图标
    const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
      switch (trend) {
        case 'up':
          return '📈'
        case 'down':
          return '📉'
        case 'stable':
          return '➡️'
      }
    }

    // 趋势颜色
    const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
      switch (trend) {
        case 'up':
          return 'text-green-600 dark:text-green-400'
        case 'down':
          return 'text-red-600 dark:text-red-400'
        case 'stable':
          return 'text-zinc-600 dark:text-zinc-400'
      }
    }

    if (isLoading) {
      return (
        <div className={className}>
          <div className="flex min-h-[400px] items-center justify-center rounded-xl bg-zinc-900">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      )
    }

    return (
      <div className={`space-y-6 ${className}`}>
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">实时监控仪表盘</h2>
            <p className="mt-1 text-zinc-400">
              {locale === 'zh'
                ? '实时性能监控和团队效率分析'
                : 'Real-time performance monitoring and team efficiency analysis'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="animate-pulse">🟢</span>
            <span>
              {stats.activeConnections} {locale === 'zh' ? '连接' : 'connections'}
            </span>
          </div>
        </div>

        {/* 性能指标卡片 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 transition-colors hover:border-zinc-600"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-zinc-400">{metric.name}</span>
                <span className={getTrendColor(metric.trend)}>{getTrendIcon(metric.trend)}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{metric.value}</span>
                <span className="text-zinc-500">{metric.unit}</span>
              </div>
              {metric.target && (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        metric.value >= metric.target
                          ? 'bg-green-500'
                          : metric.value >= metric.target * 0.8
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {locale === 'zh' ? '目标' : 'Target'}: {metric.target}
                    {metric.unit}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 团队效率 */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">
            {locale === 'zh' ? '团队效率分析' : 'Team Efficiency'}
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-1 text-sm text-zinc-400">
                {locale === 'zh' ? '整体效率' : 'Overall'}
              </div>
              <div className="text-3xl font-bold text-white">{efficiency.overall}%</div>
            </div>
            <div>
              <div className="mb-1 text-sm text-zinc-400">
                {locale === 'zh' ? '完成任务' : 'Completed'}
              </div>
              <div className="text-3xl font-bold text-white">{efficiency.tasksCompleted}</div>
            </div>
            <div>
              <div className="mb-1 text-sm text-zinc-400">
                {locale === 'zh' ? '平均用时' : 'Avg Time'}
              </div>
              <div className="text-3xl font-bold text-white">
                {efficiency.averageCompletionTime}m
              </div>
            </div>
            <div>
              <div className="mb-1 text-sm text-zinc-400">
                {locale === 'zh' ? '活跃成员' : 'Active'}
              </div>
              <div className="text-3xl font-bold text-white">{efficiency.activeMembers}</div>
            </div>
          </div>

          {/* 每周趋势 */}
          <div className="mt-6">
            <div className="mb-3 text-sm text-zinc-400">
              {locale === 'zh' ? '每周趋势' : 'Weekly Trend'}
            </div>
            <div className="flex h-24 items-end gap-2">
              {efficiency.weeklyTrend.map((value, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-500"
                    style={{ height: `${value}%` }}
                  />
                  <div className="text-xs text-zinc-500">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 连接状态 */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="text-zinc-400">
                {locale === 'zh' ? '延迟' : 'Latency'}: {stats.dataLatency}ms
              </div>
              <div className="text-zinc-400">
                {locale === 'zh' ? '更新频率' : 'Update'}: {stats.updateFrequency}ms
              </div>
            </div>
            {stats.lastPing && (
              <div className="text-zinc-500">
                {locale === 'zh' ? '最后更新' : 'Last update'}:{' '}
                {stats.lastPing.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)

RealtimeDashboard.displayName = 'RealtimeDashboard'

export default RealtimeDashboard
