/**
 * KPIDashboard - KPI 指标面板组件
 *
 * Displays key performance indicators in a responsive grid layout.
 */

'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Workflow,
} from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { formatDuration, formatPercentage } from '@/lib/analytics/metrics'
import type { OverviewMetrics } from '@/lib/analytics/types'

export interface KPIDashboardProps {
  metrics: OverviewMetrics
  className?: string
}

/**
 * KPI Card component
 */
function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: { value: number; positive: boolean }
  variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const variantStyles = {
    default: 'border-l-primary',
    success: 'border-l-green-500',
    warning: 'border-l-yellow-500',
    danger: 'border-l-red-500',
  }

  const iconStyles = {
    default: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
  }

  return (
    <Card className={cn('border-l-4', variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div
                className={cn(
                  'flex items-center text-xs font-medium',
                  trend.positive ? 'text-green-600' : 'text-red-600'
                )}
              >
                <TrendingUp
                  className={cn('w-3 h-3 mr-1', !trend.positive && 'rotate-180')}
                />
                {trend.value > 0 ? '+' : ''}
                {trend.value.toFixed(1)}%
              </div>
            )}
          </div>
          <div className={cn('p-2 rounded-lg bg-opacity-10', iconStyles[variant])}>
            <Icon className={cn('w-5 h-5', iconStyles[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * KPIDashboard main component
 */
export function KPIDashboard({ metrics, className }: KPIDashboardProps) {
  const kpis = useMemo(() => {
    return [
      {
        title: '总执行次数',
        value: formatNumber(metrics.totalExecutions),
        subtitle: `今日: ${metrics.todayExecutions}`,
        icon: Activity,
        variant: 'default' as const,
        trend: { value: 12.5, positive: true },
      },
      {
        title: '成功率',
        value: formatPercentage(metrics.successRate),
        subtitle: '过去 7 天',
        icon: CheckCircle2,
        variant: (metrics.successRate >= 90 ? 'success' : metrics.successRate >= 70 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger',
        trend: { value: 2.3, positive: true },
      },
      {
        title: '平均执行时间',
        value: formatDuration(metrics.avgExecutionTime),
        subtitle: '毫秒',
        icon: Clock,
        variant: (metrics.avgExecutionTime < 5000 ? 'success' : metrics.avgExecutionTime < 10000 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger',
        trend: { value: -5.2, positive: true }, // Negative is good for duration
      },
      {
        title: '失败次数',
        value: formatNumber(metrics.failedCount),
        subtitle: '需要关注',
        icon: AlertCircle,
        variant: (metrics.failedCount < 10 ? 'success' : metrics.failedCount < 30 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger',
        trend: { value: -8.1, positive: true },
      },
      {
        title: '活跃工作流',
        value: metrics.activeWorkflows,
        subtitle: '运行中',
        icon: Workflow,
        variant: 'default' as const,
        trend: { value: 3.2, positive: true },
      },
    ]
  }, [metrics])

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-5', className)}>
      {kpis.map((kpi) => (
        <KPICard key={kpi.title} {...kpi} />
      ))}
    </div>
  )
}

/**
 * Compact KPI card for smaller displays
 */
export function CompactKPICard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string | number
  icon: React.ElementType
}) {
  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg bg-card border">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  )
}

export default KPIDashboard
