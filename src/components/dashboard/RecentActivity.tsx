'use client'

/**
 * 最近活动列表组件
 *
 * 功能:
 * - 显示最近的任务创建、状态变更、成员加入等事件
 * - 支持多种活动类型
 * - 时间格式化显示
 * - 支持深色模式
 * - 响应式布局
 */

import React, { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  GitCommit,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  MessageSquare,
  FileText,
  Zap,
  Activity,
  type LucideIcon,
} from 'lucide-react'

// ============================================================================
// 类型定义
// ============================================================================

export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_assigned'
  | 'task_status_changed'
  | 'member_joined'
  | 'member_status_changed'
  | 'comment'
  | 'system'

export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  titleEn?: string
  description?: string
  descriptionEn?: string
  actor?: {
    name: string
    avatar?: string
  }
  target?: {
    type: 'task' | 'issue' | 'member'
    id: string
    title?: string
    url?: string
  }
  timestamp: string | Date
  metadata?: Record<string, unknown>
}

export interface RecentActivityProps {
  activities: ActivityItem[]
  locale?: string
  loading?: boolean
  maxItems?: number
  className?: ClassValue
  showEmpty?: boolean
  variant?: 'default' | 'compact' | 'minimal'
  onItemClick?: (activity: ActivityItem) => void
}

// ============================================================================
// 工具函数
// ============================================================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化时间显示
 */
function formatTime(date: string | Date, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return locale === 'zh' ? '刚刚' : 'Just now'
  if (minutes < 60) return locale === 'zh' ? `${minutes}分钟前` : `${minutes}m ago`
  if (hours < 24) return locale === 'zh' ? `${hours}小时前` : `${hours}h ago`
  if (days < 7) return locale === 'zh' ? `${days}天前` : `${days}d ago`

  return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ============================================================================
// 活动类型配置
// ============================================================================

const activityConfig: Record<
  ActivityType,
  { icon: LucideIcon; color: string; label: string; labelEn: string }
> = {
  task_created: {
    icon: FileText,
    color: 'text-blue-500',
    label: '创建任务',
    labelEn: 'Created task',
  },
  task_completed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    label: '完成任务',
    labelEn: 'Completed task',
  },
  task_assigned: {
    icon: UserPlus,
    color: 'text-purple-500',
    label: '分配任务',
    labelEn: 'Assigned task',
  },
  task_status_changed: {
    icon: Activity,
    color: 'text-yellow-500',
    label: '状态变更',
    labelEn: 'Status changed',
  },
  member_joined: {
    icon: UserPlus,
    color: 'text-emerald-500',
    label: '成员加入',
    labelEn: 'Member joined',
  },
  member_status_changed: {
    icon: Activity,
    color: 'text-orange-500',
    label: '成员状态变更',
    labelEn: 'Member status changed',
  },
  comment: {
    icon: MessageSquare,
    color: 'text-indigo-500',
    label: '评论',
    labelEn: 'Commented',
  },
  system: {
    icon: Zap,
    color: 'text-slate-500',
    label: '系统',
    labelEn: 'System',
  },
}

// ============================================================================
// 子组件
// ============================================================================

interface ActivityItemComponentProps {
  activity: ActivityItem
  locale: string
  variant: 'default' | 'compact' | 'minimal'
  onClick?: () => void
}

const ActivityItemComponent: React.FC<ActivityItemComponentProps> = React.memo(
  ({ activity, locale, variant, onClick }) => {
    const config = activityConfig[activity.type]
    const Icon = config.icon

    const displayTitle = locale === 'en' && activity.titleEn ? activity.titleEn : activity.title
    const displayDescription =
      locale === 'en' && activity.descriptionEn ? activity.descriptionEn : activity.description
    const timeLabel = formatTime(activity.timestamp, locale)

    if (variant === 'minimal') {
      return (
        <div
          className="flex cursor-pointer items-center gap-3 rounded-lg py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          onClick={onClick}
        >
          <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
          <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
            {displayTitle}
          </span>
          <span className="flex-shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
            {timeLabel}
          </span>
        </div>
      )
    }

    if (variant === 'compact') {
      return (
        <div
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
            'border-b border-zinc-100 last:border-0 dark:border-zinc-700'
          )}
          onClick={onClick}
        >
          <div className={cn('rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800', config.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
              {displayTitle}
            </p>
            {displayDescription && (
              <p className="mt-1 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                {displayDescription}
              </p>
            )}
          </div>
          <span className="flex-shrink-0 text-xs whitespace-nowrap text-zinc-400 dark:text-zinc-500">
            {timeLabel}
          </span>
        </div>
      )
    }

    // Default variant
    return (
      <div
        className={cn(
          'flex cursor-pointer items-start gap-4 rounded-lg p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
          'border-b border-zinc-100 last:border-0 dark:border-zinc-700'
        )}
        onClick={onClick}
      >
        <div className={cn('rounded-xl bg-zinc-100 p-2.5 dark:bg-zinc-800', config.color)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-white">{displayTitle}</p>

          {displayDescription && (
            <p className="mb-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
              {displayDescription}
            </p>
          )}

          <div className="flex items-center gap-2">
            {activity.actor?.avatar && (
              <img
                src={activity.actor.avatar}
                alt={activity.actor.name}
                className="h-5 w-5 rounded-full"
              />
            )}
            {activity.actor?.name && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {activity.actor.name}
              </span>
            )}
            <span className="text-xs text-zinc-400 dark:text-zinc-500">·</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{timeLabel}</span>
          </div>
        </div>
      </div>
    )
  }
)

ActivityItemComponent.displayName = 'ActivityItemComponent'

// ============================================================================
// 加载骨架屏
// ============================================================================

const ActivitySkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="flex animate-pulse items-start gap-4 p-4">
        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    ))}
  </div>
)

// ============================================================================
// 空状态
// ============================================================================

const EmptyState: React.FC<{ locale: string }> = ({ locale }) => (
  <div className="py-12 text-center">
    <Activity className="mx-auto mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      {locale === 'zh' ? '暂无活动记录' : 'No activity yet'}
    </p>
  </div>
)

// ============================================================================
// 主组件
// ============================================================================

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  locale = 'zh',
  loading = false,
  maxItems = 10,
  className,
  showEmpty = true,
  variant = 'default',
  onItemClick,
}) => {
  // 过滤和排序
  const filteredActivities = useMemo(() => {
    return activities
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime()
        const timeB = new Date(b.timestamp).getTime()
        return timeB - timeA
      })
      .slice(0, maxItems)
  }, [activities, maxItems])

  const headerText = locale === 'zh' ? '最近活动' : 'Recent Activity'
  const viewAllText = locale === 'zh' ? '查看全部' : 'View all'

  if (loading) {
    return (
      <Card className={typeof className === 'string' ? className : undefined}>
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{headerText}</h3>
        </div>
        <ActivitySkeleton count={5} />
      </Card>
    )
  }

  return (
    <Card className={typeof className === 'string' ? className : undefined}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
          <Activity className="h-4 w-4" />
          {headerText}
        </h3>
        {filteredActivities.length > maxItems && (
          <button className="text-xs text-blue-600 hover:underline dark:text-blue-400">
            {viewAllText}
          </button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {filteredActivities.length === 0 ? (
          showEmpty && <EmptyState locale={locale} />
        ) : (
          <div>
            {filteredActivities.map(activity => (
              <ActivityItemComponent
                key={activity.id}
                activity={activity}
                locale={locale}
                variant={variant}
                onClick={() => onItemClick?.(activity)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

RecentActivity.displayName = 'RecentActivity'

// ============================================================================
// Mock 数据生成器
// ============================================================================

/**
 * 创建 mock 活动数据
 */
export function createMockActivities(count: number = 10): ActivityItem[] {
  const types: ActivityType[] = [
    'task_created',
    'task_completed',
    'task_assigned',
    'task_status_changed',
    'member_joined',
    'comment',
  ]

  const actors = [
    { name: '智能体世界专家', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=expert' },
    { name: '架构师', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=architect' },
    { name: 'Executor', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=executor' },
  ]

  const now = new Date()

  return Array.from({ length: count }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)]
    const actor = actors[Math.floor(Math.random() * actors.length)]

    return {
      id: `activity-${i}`,
      type,
      title: `示例活动 ${i + 1}`,
      titleEn: `Sample Activity ${i + 1}`,
      description: '这是一条示例活动描述',
      descriptionEn: 'This is a sample activity description',
      actor,
      timestamp: new Date(now.getTime() - i * 3600000 * Math.random()).toISOString(),
    }
  })
}

export default RecentActivity
