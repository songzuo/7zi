'use client'

/**
 * 快捷操作面板组件
 *
 * 功能:
 * - 创建任务、邀请成员、快速开始 Agent、学习资源
 * - 网格布局，支持响应式
 * - 支持深色模式
 * - 支持自定义操作项
 */

import React from 'react'
import { Card } from '@/components/ui/Card'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  Plus,
  UserPlus,
  Zap,
  BookOpen,
  ChevronRight,
  Settings,
  BarChart3,
  Bell,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'

// ============================================================================
// 类型定义
// ============================================================================

export interface QuickAction {
  id: string
  label: string
  labelEn?: string
  description?: string
  descriptionEn?: string
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'red' | 'slate'
  onClick?: () => void
  href?: string
  disabled?: boolean
  badge?: string | number
  external?: boolean
}

export interface QuickActionsProps {
  actions?: QuickAction[]
  locale?: string
  loading?: boolean
  className?: ClassValue
  columns?: 2 | 3 | 4
  variant?: 'default' | 'compact' | 'icon-only'
  size?: 'sm' | 'md' | 'lg'
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
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    hover: 'hover:bg-green-100 dark:hover:bg-green-900/40',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/40',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/40',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/30',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800',
    hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/40',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    hover: 'hover:bg-red-100 dark:hover:bg-red-900/40',
  },
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-900/30',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-800',
    hover: 'hover:bg-slate-100 dark:hover:bg-slate-900/40',
  },
}

// ============================================================================
// 默认操作配置
// ============================================================================

export const defaultActions: QuickAction[] = [
  {
    id: 'create-task',
    label: '创建任务',
    labelEn: 'Create Task',
    description: '创建新的待办任务',
    descriptionEn: 'Create a new task',
    icon: Plus,
    color: 'blue',
    onClick: () => console.log('Create task clicked'),
  },
  {
    id: 'invite-member',
    label: '邀请成员',
    labelEn: 'Invite Member',
    description: '邀请新成员加入团队',
    descriptionEn: 'Invite a new member',
    icon: UserPlus,
    color: 'purple',
    onClick: () => console.log('Invite member clicked'),
  },
  {
    id: 'start-agent',
    label: '启动 Agent',
    labelEn: 'Start Agent',
    description: '快速启动 AI Agent',
    descriptionEn: 'Start an AI agent',
    icon: Zap,
    color: 'cyan',
    onClick: () => console.log('Start agent clicked'),
  },
  {
    id: 'learning-resources',
    label: '学习资源',
    labelEn: 'Resources',
    description: '查看学习文档和教程',
    descriptionEn: 'View docs and tutorials',
    icon: BookOpen,
    color: 'green',
    onClick: () => console.log('Learning resources clicked'),
  },
  {
    id: 'analytics',
    label: '数据分析',
    labelEn: 'Analytics',
    description: '查看团队数据统计',
    descriptionEn: 'View team analytics',
    icon: BarChart3,
    color: 'orange',
    onClick: () => console.log('Analytics clicked'),
  },
  {
    id: 'notifications',
    label: '通知中心',
    labelEn: 'Notifications',
    description: '查看最新通知',
    descriptionEn: 'View notifications',
    icon: Bell,
    color: 'red',
    badge: 3,
    onClick: () => console.log('Notifications clicked'),
  },
  {
    id: 'settings',
    label: '设置',
    labelEn: 'Settings',
    description: '配置系统选项',
    descriptionEn: 'Configure settings',
    icon: Settings,
    color: 'slate',
    onClick: () => console.log('Settings clicked'),
  },
  {
    id: 'help',
    label: '帮助中心',
    labelEn: 'Help',
    description: '获取帮助和支持',
    descriptionEn: 'Get help and support',
    icon: HelpCircle,
    color: 'slate',
    onClick: () => console.debug('QuickAction: Help'),
  },
]

// ============================================================================
// 子组件
// ============================================================================

interface QuickActionButtonProps {
  action: QuickAction
  locale: string
  variant: 'default' | 'compact' | 'icon-only'
  size: 'sm' | 'md' | 'lg'
}

const QuickActionButton: React.FC<QuickActionButtonProps> = React.memo(
  ({ action, locale, variant, size }) => {
    const config = colorConfig[action.color]
    const Icon = action.icon
    const disabled = action.disabled

    const displayLabel = locale === 'en' && action.labelEn ? action.labelEn : action.label
    const displayDescription =
      locale === 'en' && action.descriptionEn ? action.descriptionEn : action.description

    const sizeClasses = {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
    }

    const iconSizes = {
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-7 h-7',
    }

    const textSizes = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    }

    const baseClasses = cn(
      'rounded-xl border transition-all duration-200',
      'flex flex-col gap-2',
      disabled
        ? 'opacity-50 cursor-not-allowed'
        : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
      config.bg,
      config.border,
      !disabled && config.hover,
      sizeClasses[size]
    )

    if (variant === 'icon-only') {
      return (
        <button
          className={cn(baseClasses, 'aspect-square items-center justify-center')}
          onClick={action.onClick}
          disabled={disabled}
        >
          <div className={cn('relative', config.text)}>
            <Icon className={iconSizes[size]} />
            {action.badge && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {action.badge}
              </span>
            )}
          </div>
        </button>
      )
    }

    if (variant === 'compact') {
      return (
        <button
          className={cn(baseClasses, 'group flex-row items-center justify-between')}
          onClick={action.onClick}
          disabled={disabled}
        >
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg bg-white/50 p-2 dark:bg-black/20', config.text)}>
              <Icon className={iconSizes[size]} />
            </div>
            <div className="text-left">
              <p className={cn('font-medium text-zinc-900 dark:text-white', textSizes[size])}>
                {displayLabel}
              </p>
            </div>
          </div>
          <ChevronRight
            className={cn('h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-1')}
          />
        </button>
      )
    }

    // Default variant
    return (
      <button
        className={cn(baseClasses, 'relative overflow-hidden')}
        onClick={action.onClick}
        disabled={disabled}
      >
        <div className="absolute top-2 right-2">
          {action.badge && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {action.badge}
            </span>
          )}
        </div>

        <div className={cn('w-fit rounded-xl bg-white/60 p-2.5 dark:bg-black/30', config.text)}>
          <Icon className={iconSizes[size]} />
        </div>

        <div className="flex-1 text-left">
          <p className={cn('font-semibold text-zinc-900 dark:text-white', textSizes[size])}>
            {displayLabel}
          </p>
          {displayDescription && (
            <p
              className={cn('mt-1 line-clamp-2 text-zinc-600 dark:text-zinc-400', textSizes[size])}
            >
              {displayDescription}
            </p>
          )}
        </div>

        {action.external && (
          <ChevronRight
            className={cn(
              'absolute right-3 bottom-3 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100',
              iconSizes[size]
            )}
          />
        )}
      </button>
    )
  }
)

QuickActionButton.displayName = 'QuickActionButton'

// ============================================================================
// 加载骨架屏
// ============================================================================

const QuickActionsSkeleton: React.FC<{ columns: number; size: 'sm' | 'md' | 'lg' }> = ({
  columns,
  size,
}) => {
  const gridCols: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  }

  const height = {
    sm: 'h-20',
    md: 'h-24',
    lg: 'h-28',
  }

  return (
    <div className={cn('grid gap-3', gridCols[columns])}>
      {[...Array(columns)].map((_, i) => (
        <div key={i} className={cn('animate-pulse rounded-lg border', height[size])} />
      ))}
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions = defaultActions,
  locale = 'zh',
  loading = false,
  className,
  columns = 4,
  variant = 'default',
  size = 'md',
}) => {
  const headerText = locale === 'zh' ? '快捷操作' : 'Quick Actions'
  const gridCols: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  }

  if (loading) {
    return (
      <Card className={typeof className === 'string' ? className : undefined}>
        <QuickActionsSkeleton columns={columns} size={size} />
      </Card>
    )
  }

  return (
    <Card className={typeof className === 'string' ? className : undefined}>
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
          <Zap className="h-4 w-4" />
          {headerText}
        </h3>
      </div>

      <div className="p-3 sm:p-4">
        <div className={cn('grid gap-3', gridCols[columns])}>
          {actions.map(action => (
            <QuickActionButton
              key={action.id}
              action={action}
              locale={locale}
              variant={variant}
              size={size}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

QuickActions.displayName = 'QuickActions'

// ============================================================================
// 预设配置
// ============================================================================

/**
 * 精简版快捷操作（4项）
 */
export const minimalActions: QuickAction[] = [
  defaultActions[0], // create-task
  defaultActions[1], // invite-member
  defaultActions[2], // start-agent
  defaultActions[3], // learning-resources
]

/**
 * 分析面板快捷操作
 */
export const analyticsActions: QuickAction[] = [
  defaultActions[4], // analytics
  defaultActions[5], // notifications
  defaultActions[6], // settings
  defaultActions[7], // help
]

export default QuickActions
