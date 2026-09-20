'use client'

/**
 * Dashboard 统计卡片组件
 *
 * 功能:
 * - 显示活跃任务数、已完成任务、团队成员在线数、Agent 调度效率
 * - 使用 Card 基础组件
 * - 支持深色模式
 * - 响应式布局
 */

import React from 'react'
import { Card } from '@/components/ui/Card'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  Activity,
  CheckCircle2,
  Users,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from 'lucide-react'

// ============================================================================
// 类型定义
// ============================================================================

export interface StatItem {
  id: string
  label: string
  labelEn?: string
  value: number
  unit?: string
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'cyan' | 'orange' | 'slate'
  description?: string
}

export interface DashboardStatsProps {
  stats: StatItem[]
  locale?: string
  loading?: boolean
  className?: ClassValue
  columns?: 2 | 3 | 4
  variant?: 'default' | 'compact' | 'detailed'
}

// ============================================================================
// 工具函数
// ============================================================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// 颜色配置
// ============================================================================

const colorConfig = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500 dark:text-blue-400',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-500 dark:text-green-400',
  },
  yellow: {
    bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500 dark:text-yellow-400',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-500 dark:text-purple-400',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/20',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
    icon: 'text-cyan-500 dark:text-cyan-400',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-500 dark:text-orange-400',
  },
  slate: {
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/30',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    icon: 'text-slate-500 dark:text-slate-400',
  },
}

const defaultIcons: Record<string, LucideIcon> = {
  tasks: Activity,
  completed: CheckCircle2,
  members: Users,
  efficiency: Zap,
}

// ============================================================================
// 子组件
// ============================================================================

interface StatCardProps {
  stat: StatItem
  locale: string
  variant: 'default' | 'compact' | 'detailed'
}

const StatCard: React.FC<StatCardProps> = React.memo(({ stat, locale, variant }) => {
  const color = stat.color || 'blue'
  const config = colorConfig[color]
  const Icon = stat.icon || defaultIcons[stat.id] || Activity

  const displayLabel = locale === 'en' && stat.labelEn ? stat.labelEn : stat.label

  const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus

  const trendColor =
    stat.trend === 'up'
      ? 'text-green-500'
      : stat.trend === 'down'
        ? 'text-red-500'
        : 'text-zinc-400'

  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          config.bg,
          config.border,
          'border transition-all duration-300 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]',
          'group cursor-default'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('rounded-lg bg-white/50 p-2 dark:bg-black/20', config.icon)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {displayLabel}
            </p>
            <p className={cn('text-lg font-bold', config.text)}>
              {stat.value.toLocaleString()}
              {stat.unit}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (variant === 'detailed') {
    return (
      <Card
        className={cn(
          config.bg,
          config.border,
          'border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
          'group cursor-default'
        )}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={cn('rounded-xl bg-white/60 p-2.5 dark:bg-black/30', config.icon)}>
              <Icon className="h-5 w-5" />
            </div>
            {stat.trend && (
              <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
                <TrendIcon className="h-3.5 w-3.5" />
                <span>{stat.trendValue}</span>
              </div>
            )}
          </div>

          <div>
            <p className="truncate text-xs font-medium text-zinc-600 sm:text-sm dark:text-zinc-400">
              {displayLabel}
            </p>
            <p
              className={cn(
                'mt-1 origin-left text-2xl font-bold transition-transform group-hover:scale-105 sm:text-3xl',
                config.text
              )}
            >
              {stat.value.toLocaleString()}
              {stat.unit}
            </p>
          </div>

          {stat.description && (
            <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
              {stat.description}
            </p>
          )}
        </div>
      </Card>
    )
  }

  // Default variant
  return (
    <Card
      className={cn(
        config.bg,
        config.border,
        'border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
        'group cursor-default'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className={cn('rounded-lg bg-white/50 p-2 dark:bg-black/20', config.icon)}>
          <Icon className="h-4 w-4" />
        </div>
        {stat.trend && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span>{stat.trendValue}</span>
          </div>
        )}
      </div>
      <p className="truncate text-xs font-medium text-zinc-600 opacity-80 transition-opacity group-hover:opacity-100 sm:text-sm dark:text-zinc-400">
        {displayLabel}
      </p>
      <p
        className={cn(
          'mt-1 origin-left text-xl font-bold transition-transform group-hover:scale-110 sm:text-2xl',
          config.text
        )}
      >
        {stat.value.toLocaleString()}
        {stat.unit}
      </p>
    </Card>
  )
})

StatCard.displayName = 'StatCard'

// ============================================================================
// 加载骨架屏
// ============================================================================

const StatSkeleton: React.FC = () => (
  <Card className="animate-pulse border border-zinc-200 dark:border-zinc-700">
    <div className="mb-2 flex items-center justify-between">
      <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-4 w-12 rounded bg-zinc-200 dark:bg-zinc-700" />
    </div>
    <div className="mb-2 h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
    <div className="h-6 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
  </Card>
)

// ============================================================================
// 主组件
// ============================================================================

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  stats,
  locale = 'zh',
  loading = false,
  className,
  columns = 4,
  variant = 'default',
}) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  }

  if (loading) {
    return (
      <div className={cn('grid gap-3 md:gap-4', gridCols[columns], className)}>
        {[...Array(columns)].map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-3 md:gap-4', gridCols[columns], className)}>
      {stats.map(stat => (
        <StatCard key={stat.id} stat={stat} locale={locale} variant={variant} />
      ))}
    </div>
  )
}

DashboardStats.displayName = 'DashboardStats'

// ============================================================================
// 预设配置
// ============================================================================

/**
 * 创建默认的 Dashboard 统计数据
 */
export function createDefaultStats(
  data: {
    activeTasks?: number
    completedTasks?: number
    onlineMembers?: number
    efficiency?: number
  } = {}
): StatItem[] {
  return [
    {
      id: 'tasks',
      label: '活跃任务',
      labelEn: 'Active Tasks',
      value: data.activeTasks ?? 0,
      icon: Activity,
      color: 'blue',
      trend: 'neutral',
    },
    {
      id: 'completed',
      label: '已完成任务',
      labelEn: 'Completed',
      value: data.completedTasks ?? 0,
      icon: CheckCircle2,
      color: 'green',
      trend: 'up',
      trendValue: '+12%',
    },
    {
      id: 'members',
      label: '在线成员',
      labelEn: 'Online Members',
      value: data.onlineMembers ?? 0,
      icon: Users,
      color: 'purple',
    },
    {
      id: 'efficiency',
      label: '调度效率',
      labelEn: 'Efficiency',
      value: data.efficiency ?? 0,
      unit: '%',
      icon: Zap,
      color: 'cyan',
      trend: 'up',
      trendValue: '+5%',
    },
  ]
}

export default DashboardStats
