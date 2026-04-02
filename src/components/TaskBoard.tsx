'use client'

import React, { useState, memo, useDeferredValue, useMemo } from 'react'
import Image from 'next/image'
import { GitHubIssue } from '@/types'
import { formatTimeAgo } from '@/lib/date'
import { ProgressBar, Card, EmptyState } from '@/components/shared'

interface TaskBoardProps {
  issues: GitHubIssue[]
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ issues }) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open')

  // 使用 useDeferredValue 优化筛选操作（React 19 优化）
  const deferredFilter = useDeferredValue(filter)

  // 使用 useMemo 优化筛选结果
  const filteredIssues = useMemo(
    () =>
      issues.filter(issue => {
        if (deferredFilter === 'all') return true
        return issue.state === deferredFilter
      }),
    [issues, deferredFilter]
  )

  const openIssues = issues.filter(i => i.state === 'open')
  const closedIssues = issues.filter(i => i.state === 'closed')

  // 计算进度
  const progress = issues.length > 0 ? Math.round((closedIssues.length / issues.length) * 100) : 0

  return (
    <Card padding="none">
      {/* 看板头部 */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <span>📋</span> GitHub 任务
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as 'open' | 'closed' | 'all')}
              className="rounded-lg border-zinc-300 bg-white text-sm text-zinc-900 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="open">进行中</option>
              <option value="closed">已完成</option>
              <option value="all">全部</option>
            </select>
          </div>
        </div>

        {/* 进度条 */}
        <div className="space-y-2">
          <ProgressBar progress={progress} showLabel />
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>🟢 {openIssues.length} 进行中</span>
            <span>✅ {closedIssues.length} 已完成</span>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="max-h-[600px] divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-700">
        {filteredIssues.length === 0 ? (
          <EmptyState
            icon="📭"
            title="暂无任务"
            description={filter === 'open' ? '所有任务都已完成！' : '还没有 GitHub Issues'}
          />
        ) : (
          filteredIssues.map(issue => <TaskCard key={issue.number} issue={issue} />)
        )}
      </div>

      {/* 底部统计 */}
      {filteredIssues.length > 0 && (
        <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
          显示 {filteredIssues.length} / {issues.length} 个任务
        </div>
      )}
    </Card>
  )
}

// ============================================================================
// 任务卡片组件 - 使用 React.memo 优化
// ============================================================================

interface TaskCardProps {
  issue: GitHubIssue
}

const TaskCardBase: React.FC<TaskCardProps> = ({ issue }) => {
  const stateConfig = {
    open: {
      color:
        'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
      label: '🟢 进行中',
    },
    closed: {
      color:
        'text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-700',
      label: '✅ 已完成',
    },
  }

  const config = stateConfig[issue.state]

  return (
    <div className="group border-l-2 border-transparent px-6 py-4 transition-all duration-200 hover:translate-x-1 hover:border-cyan-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <div className="flex items-start gap-3">
        {/* 状态图标 */}
        <div className="mt-1 flex-shrink-0">
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${config.color} transition-transform group-hover:scale-105`}
          >
            {config.label}
          </span>
        </div>

        {/* 内容区 */}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-cyan-600 transition-colors hover:text-cyan-800 hover:underline dark:text-cyan-400"
            >
              #{issue.number}
            </a>
            <h3 className="truncate text-sm font-medium text-zinc-900 transition-colors group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
              {issue.title}
            </h3>
          </div>

          {/* 标签 */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-1">
              {issue.labels.slice(0, 5).map((label, idx) => (
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
              {issue.labels.length > 5 && (
                <span className="text-xs text-zinc-400">+{issue.labels.length - 5}</span>
              )}
            </div>
          )}

          {/* 元信息 */}
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            {issue.assignee && (
              <div className="flex items-center gap-1">
                <Image
                  src={issue.assignee.avatar_url}
                  alt={issue.assignee.login}
                  width={16}
                  height={16}
                  sizes="16px"
                  className="rounded-full"
                  unoptimized
                />
                <span>{issue.assignee.login}</span>
              </div>
            )}
            <span>·</span>
            <span title={new Date(issue.updated_at).toLocaleString()}>
              更新于 {formatTimeAgo(issue.updated_at)}
            </span>
          </div>
        </div>

        {/* 外部链接 */}
        <div className="flex-shrink-0">
          <a
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cyan-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-cyan-800 dark:text-cyan-400"
          >
            查看 →
          </a>
        </div>
      </div>
    </div>
  )
}

// 使用 React.memo 优化 TaskCard，避免不必要的重渲染
const TaskCard = memo(TaskCardBase, (prevProps, nextProps) => {
  // 只在 issue 的关键字段变化时才重新渲染
  return (
    prevProps.issue.number === nextProps.issue.number &&
    prevProps.issue.state === nextProps.issue.state &&
    prevProps.issue.title === nextProps.issue.title &&
    prevProps.issue.updated_at === nextProps.issue.updated_at
  )
})
