'use client'

/**
 * 任务看板页面
 * 显示 GitHub Issues 作为任务看板，支持列表和看板两种视图模式
 * 移动端自动切换到卡片视图
 */

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { TaskBoardSearch } from '@/components/TaskBoardSearch'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Card } from '@/components/shared'
import { TaskCardMobile } from '@/components/mobile/TaskCardMobile'
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
} from '@/components/ui/Skeleton'
import type { GitHubIssue } from '@/types'
import { logger } from '@/lib/logger'
import { isBelowBreakpoint } from '@/lib/utils/breakpoints'

type ViewMode = 'list' | 'kanban' | 'mobile'

export default function TasksPage() {
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size (using unified breakpoints)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isBelowBreakpoint('md'))
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-switch to mobile view on small screens
  useEffect(() => {
    if (isMobile && viewMode === 'kanban') {
      setViewMode('mobile')
    } else if (!isMobile && viewMode === 'mobile') {
      setViewMode('list')
    }
  }, [isMobile, viewMode])

  useEffect(() => {
    async function fetchIssues() {
      try {
        const res = await fetch('/api/github/issues')
        if (res.ok) {
          const data = await res.json()
          setIssues(data.issues || [])
        }
      } catch (e) {
        logger.error('Failed to fetch issues', e, { category: 'api' })
      } finally {
        setLoading(false)
      }
    }
    fetchIssues()
  }, [])

  // 统计信息
  const stats = {
    total: issues.length,
    open: issues.filter(i => i.state === 'open').length,
    closed: issues.filter(i => i.state === 'closed').length,
    progress:
      issues.length > 0
        ? Math.round((issues.filter(i => i.state === 'closed').length / issues.length) * 100)
        : 0,
  }

  // Task handlers
  const handleComplete = async (issue: GitHubIssue) => {
    logger.info(`Complete task: ${issue.number}`, { category: 'user', issueNumber: issue.number })
    try {
      const response = await fetch(`/api/issues/${issue.number}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: issue.state === 'open' ? 'closed' : 'open' }),
      })

      if (!response.ok) throw new Error('Failed to update task state')

      // Refresh issues list
      window.location.reload()
    } catch (error) {
      logger.error('Failed to update task state', { error, issueNumber: issue.number })
      alert('Failed to update task state')
    }
  }

  const handleAssign = async (issue: GitHubIssue) => {
    logger.info(`Assign task: ${issue.number}`, { category: 'user', issueNumber: issue.number })
    try {
      const assignee = prompt('Enter GitHub username to assign:')
      if (!assignee) return

      const response = await fetch(`/api/issues/${issue.number}/assignees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignees: [assignee] }),
      })

      if (!response.ok) throw new Error('Failed to assign task')

      // Refresh issues list
      window.location.reload()
    } catch (error) {
      logger.error('Failed to assign task', { error, issueNumber: issue.number })
      alert('Failed to assign task')
    }
  }

  const handleArchive = async (issue: GitHubIssue) => {
    logger.info(`Archive task: ${issue.number}`, { category: 'user', issueNumber: issue.number })
    try {
      // Archiving is implemented as closing with an "archived" label
      const response = await fetch(`/api/issues/${issue.number}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: ['archived'] }),
      })

      if (!response.ok) throw new Error('Failed to archive task')

      // Refresh issues list
      window.location.reload()
    } catch (error) {
      logger.error('Failed to archive task', { error, issueNumber: issue.number })
      alert('Failed to archive task')
    }
  }

  const handleDelete = async (issue: GitHubIssue) => {
    logger.info(`Delete task: ${issue.number}`, { category: 'user', issueNumber: issue.number })
    try {
      const confirmed = confirm(`Are you sure you want to delete task #${issue.number}?`)
      if (!confirmed) return

      const response = await fetch(`/api/issues/${issue.number}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete task')

      // Refresh issues list
      window.location.reload()
    } catch (error) {
      logger.error('Failed to delete task', { error, issueNumber: issue.number })
      alert('Failed to delete task')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        {/* 页面头部 skeleton */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-4">
            <Skeleton variant="text" className="h-8 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton variant="rounded" className="h-8 w-24" />
              <Skeleton variant="rounded" className="h-8 w-24" />
            </div>
          </div>
          <Skeleton variant="text" className="h-4 w-64" />
        </div>

        {/* 统计卡片 skeleton */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
              <Skeleton variant="text" className="mb-2 h-7 w-16" />
              <Skeleton variant="text" className="h-4 w-20" />
            </div>
          ))}
        </div>

        {/* 任务列表 skeleton */}
        <div className="space-y-4">
          {/* Filter tabs skeleton */}
          <div className="flex gap-2 pb-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" className="h-9 w-20" />
            ))}
          </div>

          {/* Task cards skeleton */}
          <SkeletonList items={5} hasAvatar />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 md:text-3xl dark:text-white">
            <span>📋</span>
            <span className="hidden sm:inline">任务看板</span>
            <span className="sm:hidden">任务</span>
          </h1>
          <div className="flex flex-shrink-0 items-center gap-2">
            {/* 视图切换按钮 - Desktop only */}
            {!isMobile && (
              <div className="flex items-center rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                  title="列表视图"
                >
                  📄 列表
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                  title="看板视图"
                >
                  📊 看板
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          管理和追踪 GitHub Issues，支持搜索、过滤和排序
        </p>
      </div>

      {/* 统计卡片 */}
      {issues.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Card hover className="!p-4">
            <div className="text-xl font-bold text-zinc-900 md:text-2xl dark:text-white">
              {stats.total}
            </div>
            <div className="text-xs text-zinc-600 md:text-sm dark:text-zinc-400">全部任务</div>
          </Card>
          <Card hover className="!p-4">
            <div className="text-xl font-bold text-green-600 md:text-2xl dark:text-green-400">
              {stats.open}
            </div>
            <div className="text-xs text-zinc-600 md:text-sm dark:text-zinc-400">进行中</div>
          </Card>
          <Card hover className="!p-4">
            <div className="text-xl font-bold text-zinc-600 md:text-2xl dark:text-zinc-400">
              {stats.closed}
            </div>
            <div className="text-xs text-zinc-600 md:text-sm dark:text-zinc-400">已完成</div>
          </Card>
          <Card hover className="!p-4">
            <div className="text-xl font-bold text-cyan-600 md:text-2xl dark:text-cyan-400">
              {stats.progress}%
            </div>
            <div className="text-xs text-zinc-600 md:text-sm dark:text-zinc-400">完成率</div>
          </Card>
        </div>
      )}

      {/* 任务看板 */}
      {viewMode === 'mobile' ? (
        <MobileView
          issues={issues}
          onComplete={handleComplete}
          onAssign={handleAssign}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      ) : viewMode === 'list' ? (
        <TaskBoardSearch issues={issues} defaultStatus="all" showStats={false} />
      ) : (
        <KanbanView issues={issues} />
      )}
    </div>
  )
}

// ============================================================================
// 移动端卡片视图组件
// ============================================================================

interface MobileViewProps {
  issues: GitHubIssue[]
  onComplete: (issue: GitHubIssue) => void
  onAssign: (issue: GitHubIssue) => void
  onArchive: (issue: GitHubIssue) => void
  onDelete: (issue: GitHubIssue) => void
}

function MobileView({ issues, onComplete, onAssign, onArchive, onDelete }: MobileViewProps) {
  // Sort issues: open first, then by updated date
  const sortedIssues = useMemo(() => {
    return [...issues].sort((a, b) => {
      if (a.state !== b.state) {
        return a.state === 'open' ? -1 : 1
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [issues])

  return (
    <div className="pb-safe space-y-3">
      {/* Filter tabs */}
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
        <button className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-medium whitespace-nowrap text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
          全部 ({issues.length})
        </button>
        <button className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium whitespace-nowrap text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          进行中 ({sortedIssues.filter(i => i.state === 'open').length})
        </button>
        <button className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium whitespace-nowrap text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          已完成 ({sortedIssues.filter(i => i.state === 'closed').length})
        </button>
      </div>

      {/* Task cards */}
      <div className="space-y-3">
        {sortedIssues.map(issue => (
          <TaskCardMobile
            key={issue.number}
            issue={issue}
            onComplete={onComplete}
            onAssign={onAssign}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        ))}

        {sortedIssues.length === 0 && (
          <div className="py-12 text-center">
            <div className="mb-4 text-4xl">📭</div>
            <p className="text-zinc-600 dark:text-zinc-400">暂无任务</p>
          </div>
        )}
      </div>

      {/* Swipe hint */}
      {sortedIssues.length > 0 && (
        <div className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
          <div className="flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <span className="text-lg">→</span> 滑动完成
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">←</span> 滑动归档
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">⎋</span> 长按菜单
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 看板视图组件
// ============================================================================

interface KanbanViewProps {
  issues: GitHubIssue[]
}

function KanbanView({ issues }: KanbanViewProps) {
  const columns = [
    { id: 'open', title: '🟢 进行中', color: 'border-green-500' },
    { id: 'closed', title: '✅ 已完成', color: 'border-zinc-500' },
  ] as const

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {columns.map(column => {
        const columnIssues = issues.filter(issue => issue.state === column.id)

        return (
          <div
            key={column.id}
            className={`rounded-2xl border-t-4 bg-zinc-50 dark:bg-zinc-800/50 ${column.color}`}
          >
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <h3 className="font-semibold text-zinc-900 dark:text-white">{column.title}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {columnIssues.length} 个任务
              </p>
            </div>
            <div className="max-h-[600px] space-y-3 overflow-y-auto p-4">
              {columnIssues.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                  <p className="mb-2 text-2xl">📭</p>
                  <p className="text-sm">暂无任务</p>
                </div>
              ) : (
                columnIssues.map(issue => <KanbanCard key={issue.number} issue={issue} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// 看板卡片组件
// ============================================================================

interface KanbanCardProps {
  issue: GitHubIssue
}

function KanbanCard({ issue }: KanbanCardProps) {
  return (
    <div className="group cursor-pointer rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-800">
      <a href={issue.html_url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            #{issue.number}
          </span>
        </div>
        <h4 className="mb-3 line-clamp-2 text-sm font-medium text-zinc-900 transition-colors group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
          {issue.title}
        </h4>
        {issue.labels && issue.labels.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {issue.labels.slice(0, 3).map((label, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `#${label.color}20`,
                  color: `#${label.color}`,
                }}
              >
                {label.name}
              </span>
            ))}
            {issue.labels.length > 3 && (
              <span className="text-xs text-zinc-400">+{issue.labels.length - 3}</span>
            )}
          </div>
        )}
        {issue.assignee && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="h-5 w-5 overflow-hidden rounded-full">
              <img
                src={issue.assignee.avatar_url}
                alt={issue.assignee.login}
                className="h-full w-full object-cover"
              />
            </div>
            <span>{issue.assignee.login}</span>
          </div>
        )}
      </a>
    </div>
  )
}
