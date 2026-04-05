/**
 * WorkflowStatsCard - 工作流统计卡片组件
 * 显示工作流的关键指标：总执行次数、成功率、平均执行时间
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Activity, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WorkflowStatsProps {
  totalExecutions: number
  successRate: number
  avgDuration: number
  timeRange?: string
  loading?: boolean
  className?: string
}

/**
 * 格式化数字
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * 格式化持续时间
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/**
 * 统计指标项组件
 */
function StatItem({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  trendUp,
  loading
}: {
  icon: React.ElementType
  label: string
  value: number | string
  unit?: string
  trend?: number
  trendUp?: boolean
  loading?: boolean
}) {
  return (
    <div className="flex items-center space-x-3">
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg",
        "bg-primary/10 text-primary"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex items-baseline space-x-1">
          <p className="text-2xl font-bold">
            {loading ? '-' : value}
          </p>
          {unit && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
          {trend !== undefined && !loading && (
            <span className={cn(
              "text-xs font-medium",
              trendUp ? "text-green-600" : "text-red-600"
            )}>
              {trendUp ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * WorkflowStatsCard 主组件
 */
export function WorkflowStatsCard({
  totalExecutions,
  successRate,
  avgDuration,
  timeRange,
  loading = false,
  className
}: WorkflowStatsProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          工作流统计
        </CardTitle>
        {timeRange && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-1 h-4 w-4" />
            {timeRange}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 总执行次数 */}
        <StatItem
          icon={Activity}
          label="总执行次数"
          value={loading ? 0 : formatNumber(totalExecutions)}
          loading={loading}
        />

        {/* 成功率 */}
        <StatItem
          icon={CheckCircle}
          label="成功率"
          value={loading ? 0 : successRate.toFixed(1)}
          unit="%"
          trend={loading ? undefined : successRate >= 90 ? 5 : -3}
          trendUp={loading ? undefined : successRate >= 90}
          loading={loading}
        />

        {/* 平均执行时间 */}
        <StatItem
          icon={TrendingUp}
          label="平均执行时间"
          value={loading ? 0 : formatDuration(avgDuration)}
          loading={loading}
        />
      </CardContent>
    </Card>
  )
}

/**
 * 简化版统计卡片（用于仪表板）
 */
export function WorkflowStatsMiniCard({
  totalExecutions,
  successRate,
  avgDuration,
  loading = false,
  className
}: Omit<WorkflowStatsProps, 'timeRange'>) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">执行次数</p>
          <p className="text-lg font-bold">
            {loading ? '-' : formatNumber(totalExecutions)}
          </p>
        </div>
        <div className="text-center border-l border-r">
          <p className="text-xs text-muted-foreground mb-1">成功率</p>
          <p className="text-lg font-bold">
            {loading ? '-' : `${successRate.toFixed(0)}%`}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">平均耗时</p>
          <p className="text-lg font-bold">
            {loading ? '-' : formatDuration(avgDuration)}
          </p>
        </div>
      </div>
    </Card>
  )
}