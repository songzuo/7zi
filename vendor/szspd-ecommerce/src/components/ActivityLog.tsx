'use client'

import React from 'react'
import Image from 'next/image'
import type { FC, ReactNode, MouseEvent } from 'react'

export interface ActivityItem {
  id: string
  type: 'commit' | 'issue' | 'comment'
  title: string
  author: string
  avatar?: string
  timestamp: string
  url: string
}

interface ActivityLogProps {
  activities: ActivityItem[]
}

export const ActivityLog: FC<ActivityLogProps> = ({ activities }) => {
  const typeIcons = {
    commit: '💻',
    issue: '📋',
    comment: '💬',
  }

  const typeColors = {
    commit: 'bg-blue-50 text-blue-700 border-blue-200',
    issue: 'bg-green-50 text-green-700 border-green-200',
    comment: 'bg-purple-50 text-purple-700 border-purple-200',
  }

  const typeLabels = {
    commit: '提交',
    issue: '任务',
    comment: '评论',
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      {/* 头部 */}
      <div className="border-b border-zinc-200 bg-gradient-to-r from-zinc-50 to-white px-6 py-4 dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-800">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
          <span className="animate-pulse">⚡</span> 实时活动日志
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          最近 {activities.length} 条活动
        </p>
      </div>

      {/* 活动列表 */}
      <div className="scrollbar-thin max-h-[600px] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-700">
        {activities.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
            <p className="mb-2 text-lg">📭</p>
            <p>暂无活动记录</p>
            <p className="mt-1 text-sm">GitHub 活动将显示在这里</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <ActivityItemCard
              key={activity.id || index}
              activity={activity}
              icon={typeIcons[activity.type]}
              colorClass={typeColors[activity.type]}
              label={typeLabels[activity.type]}
            />
          ))
        )}
      </div>

      {/* 底部 */}
      {activities.length > 0 && (
        <div className="flex items-center gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          🕐 自动刷新 · 30 秒间隔
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 活动项卡片 - 使用 React.memo 优化
// ============================================================================

interface ActivityItemCardProps {
  activity: ActivityItem
  icon: string
  colorClass: string
  label: string
}

const ActivityItemCardBase: React.FC<ActivityItemCardProps> = ({
  activity,
  icon,
  colorClass,
  label,
}) => {
  return (
    <div className="group border-l-2 border-transparent px-6 py-4 transition-all duration-200 hover:translate-x-1 hover:border-cyan-500 hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 text-lg shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 dark:from-zinc-700 dark:to-zinc-600">
          {icon}
        </div>

        {/* 内容 */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${colorClass} transition-transform group-hover:scale-105`}
            >
              {label}
            </span>
            <span
              className="text-xs text-zinc-400 dark:text-zinc-500"
              title={new Date(activity.timestamp).toLocaleString()}
            >
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>

          <p className="mb-1 truncate text-sm text-zinc-900 transition-colors group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
            {activity.title}
          </p>

          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            {activity.avatar && (
              <Image
                src={activity.avatar}
                alt={activity.author}
                width={16}
                height={16}
                sizes="16px"
                className="rounded-full ring-1 ring-transparent transition-all group-hover:ring-cyan-500/50"
                unoptimized
              />
            )}
            <span>{activity.author}</span>
          </div>
        </div>

        {/* 链接 */}
        <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          <a
            href={activity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800 dark:text-cyan-400 dark:hover:bg-cyan-900/20 dark:hover:text-cyan-300"
          >
            🔗
          </a>
        </div>
      </div>
    </div>
  )
}

// 使用 React.memo 优化 ActivityItemCard
const ActivityItemCard = React.memo(ActivityItemCardBase, (prevProps, nextProps) => {
  return (
    prevProps.activity.id === nextProps.activity.id &&
    prevProps.activity.title === nextProps.activity.title &&
    prevProps.activity.timestamp === nextProps.activity.timestamp
  )
})

ActivityItemCard.displayName = 'ActivityItemCard'

// ============================================================================
// 工具函数
// ============================================================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString()
}
