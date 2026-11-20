/**
 * RealtimeTeamEfficiency Component
 * 团队工作效率指标组件
 *
 * 实时显示代理状态、任务处理效率、吞吐量等指标
 */

'use client'

import React, { useMemo } from 'react'
import {
  Users,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react'
import type { TeamEfficiencyMetrics } from '@/lib/types/analytics/realtime'

// ============================================================================
// Type Definitions
// ============================================================================

export interface RealtimeTeamEfficiencyProps {
  metrics: TeamEfficiencyMetrics | null
  previousMetrics?: TeamEfficiencyMetrics | null
  showDetails?: boolean
  locale?: string
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const METRIC_CONFIG = {
  agentsOnline: {
    label: { en: 'Agents Online', zh: '在线代理' },
    icon: Users,
    color: 'blue',
    format: 'number',
    trendKey: 'agentsOnline',
  },
  agentsWorking: {
    label: { en: 'Agents Working', zh: '工作中代理' },
    icon: Activity,
    color: 'green',
    format: 'number',
    trendKey: 'agentsWorking',
  },
  tasksPerHour: {
    label: { en: 'Tasks/Hour', zh: '每小时任务' },
    icon: TrendingUp,
    color: 'purple',
    format: 'number',
    trendKey: 'tasksPerHour',
    decimals: 1,
  },
  averageTaskDuration: {
    label: { en: 'Avg Duration', zh: '平均任务时长' },
    icon: Clock,
    color: 'orange',
    format: 'duration',
    trendKey: 'averageTaskDuration',
  },
  taskSuccessRate: {
    label: { en: 'Success Rate', zh: '成功率' },
    icon: Zap,
    color: 'green',
    format: 'percentage',
    trendKey: 'taskSuccessRate',
    decimals: 1,
  },
  throughput: {
    label: { en: 'Throughput', zh: '吞吐量' },
    icon: BarChart3,
    color: 'blue',
    format: 'number',
    trendKey: 'throughput',
  },
} as const

const COLOR_MAP = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-500',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-500',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-500',
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatMetricValue(value: number, format: string, decimals = 0): string {
  switch (format) {
    case 'number':
      return value.toLocaleString(undefined, { maximumFractionDigits: decimals })
    case 'percentage':
      return `${value.toFixed(decimals)}%`
    case 'duration':
      if (value < 60) return `${value.toFixed(0)}s`
      if (value < 3600) return `${(value / 60).toFixed(1)}m`
      return `${(value / 3600).toFixed(1)}h`
    default:
      return value.toString()
  }
}

function calculateTrend(current: number, previous?: number): 'up' | 'down' | 'stable' | null {
  if (previous === undefined || previous === 0) return null
  const change = ((current - previous) / previous) * 100
  if (Math.abs(change) < 0.1) return 'stable'
  return change > 0 ? 'up' : 'down'
}

function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up':
      return <ArrowUp className="h-3 w-3" />
    case 'down':
      return <ArrowDown className="h-3 w-3" />
    case 'stable':
      return <Minus className="h-3 w-3" />
  }
}

// ============================================================================
// Sub-components
// ============================================================================

interface MetricCardProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: keyof typeof COLOR_MAP
  trend?: {
    direction: 'up' | 'down' | 'stable'
    value: number
    label: string
  }
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, color, trend }) => {
  const colors = COLOR_MAP[color]

  return (
    <div
      className={`${colors.bg} rounded-lg border border-transparent p-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-600`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-2 ${colors.iconBg}`}>
            {Icon && <Icon className="h-4 w-4 text-white" />}
          </div>
          <div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{label}</p>
            <p className={`text-lg font-bold ${colors.text} mt-1`}>{value}</p>
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs">
            <span
              className={
                trend.direction === 'up'
                  ? 'text-green-600 dark:text-green-400'
                  : trend.direction === 'down'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-zinc-500 dark:text-zinc-400'
              }
            >
              {getTrendIcon(trend.direction)}
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">{trend.value.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const RealtimeTeamEfficiency: React.FC<RealtimeTeamEfficiencyProps> = ({
  metrics,
  previousMetrics,
  showDetails = true,
  locale = 'en',
  className = '',
}) => {
  const t = {
    title: locale === 'zh' ? '团队工作效率' : 'Team Efficiency',
    loading: locale === 'zh' ? '加载中...' : 'Loading...',
    agentsIdle: locale === 'zh' ? '空闲代理' : 'Agents Idle',
    queueSize: locale === 'zh' ? '队列大小' : 'Queue Size',
    details: locale === 'zh' ? '详细信息' : 'Details',
    lastUpdated: locale === 'zh' ? '最后更新' : 'Last Updated',
  }

  // Calculate metrics cards data
  const metricsCards = useMemo(() => {
    if (!metrics) return []

    return Object.entries(METRIC_CONFIG).map(([key, config]) => {
      const value = metrics[key as keyof TeamEfficiencyMetrics] as number
      const previousValue = previousMetrics
        ? (previousMetrics[key as keyof TeamEfficiencyMetrics] as number)
        : undefined

      // Calculate trend
      let trend: MetricCardProps['trend'] = undefined
      if (previousValue !== undefined && previousValue !== 0) {
        const direction = calculateTrend(value, previousValue)
        if (direction) {
          const change = ((value - previousValue) / previousValue) * 100
          trend = {
            direction,
            value: Math.abs(change),
            label:
              direction === 'up'
                ? locale === 'zh'
                  ? '上升'
                  : 'increase'
                : direction === 'down'
                  ? locale === 'zh'
                    ? '下降'
                    : 'decrease'
                  : locale === 'zh'
                    ? '稳定'
                    : 'stable',
          }
        }
      }

      return {
        key,
        label: config.label[locale as 'en' | 'zh'],
        value: formatMetricValue(
          value,
          config.format,
          'decimals' in config ? config.decimals : undefined
        ),
        icon: config.icon,
        color: config.color,
        trend,
      }
    })
  }, [metrics, previousMetrics, locale])

  // Calculate derived metrics
  const efficiencyScore = useMemo(() => {
    if (!metrics) return null
    // Calculate overall efficiency score based on multiple factors
    const successRateScore = metrics.taskSuccessRate
    const agentUtilization =
      metrics.agentsOnline > 0 ? (metrics.agentsWorking / metrics.agentsOnline) * 100 : 0
    const throughputScore = Math.min((metrics.tasksPerHour / 100) * 100, 100)

    return (successRateScore * 0.4 + agentUtilization * 0.3 + throughputScore * 0.3).toFixed(1)
  }, [metrics])

  // Loading state
  if (!metrics) {
    return (
      <div
        className={`rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
      >
        <div className="flex h-64 items-center justify-center">
          <p className="text-zinc-500 dark:text-zinc-400">{t.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{t.title}</h3>
            {metrics.timestamp && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t.lastUpdated}: {new Date(metrics.timestamp).toLocaleString()}
              </p>
            )}
          </div>
          {efficiencyScore !== null && (
            <div className="text-right">
              <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                {locale === 'zh' ? '效率评分' : 'Efficiency Score'}
              </p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white">{efficiencyScore}</p>
            </div>
          )}
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {metricsCards.map(card => (
            <MetricCard
              key={card.key}
              label={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
              trend={card.trend}
            />
          ))}
        </div>

        {/* Efficiency Bar */}
        {efficiencyScore !== null && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {locale === 'zh' ? '整体效率' : 'Overall Efficiency'}
              </span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                {efficiencyScore}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  parseFloat(efficiencyScore) >= 80
                    ? 'bg-green-500'
                    : parseFloat(efficiencyScore) >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${efficiencyScore}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <h4 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">{t.details}</h4>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Agents Idle */}
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50">
              <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
                <Users className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.agentsIdle}</p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {metrics.agentsIdle}
                </p>
              </div>
            </div>

            {/* Queue Size */}
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.queueSize}</p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {metrics.queueSize}
                </p>
              </div>
            </div>

            {/* Utilization Rate */}
            {metrics.agentsOnline > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50">
                <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                  <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {locale === 'zh' ? '利用率' : 'Utilization'}
                  </p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {((metrics.agentsWorking / metrics.agentsOnline) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            {/* Tasks Per Agent */}
            {metrics.agentsWorking > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {locale === 'zh' ? '人均任务/小时' : 'Tasks/Agent/Hour'}
                  </p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {(metrics.tasksPerHour / metrics.agentsWorking).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RealtimeTeamEfficiency
