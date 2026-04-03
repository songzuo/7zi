/**
 * Agent Dashboard - Task List Component
 *
 * Displays tasks with filtering and expansion capabilities
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { useDarkMode } from '@/stores/preferencesStore'
import { Task, TaskStatus } from '@/lib/agents/scheduler/models/task-model'

// ============================================================================
// Types
// ============================================================================

export type TaskFilter = 'all' | 'in_progress' | 'pending' | 'completed'

export interface TaskListProps {
  /** Tasks to display */
  tasks: Task[]
  /** Optional callback when a task is clicked */
  onTaskClick?: (task: Task) => void
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function TaskList({ tasks, onTaskClick, className = '' }: TaskListProps) {
  const isDark = useDarkMode()
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  // Update current time every minute for progress calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'in_progress':
        return tasks.filter(t => t.status === 'in_progress')
      case 'pending':
        return tasks.filter(t => t.status === 'pending')
      case 'completed':
        return tasks.filter(t => t.status === 'completed')
      default:
        return tasks
    }
  }, [tasks, filter])

  // Get status badge styles
  const getStatusBadge = (status: TaskStatus) => {
    const styles = {
      pending: {
        bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
        text: isDark ? 'text-amber-400' : 'text-amber-700',
        icon: '⏳',
      },
      assigned: {
        bg: isDark ? 'bg-purple-500/20' : 'bg-purple-100',
        text: isDark ? 'text-purple-400' : 'text-purple-700',
        icon: '📋',
      },
      in_progress: {
        bg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
        text: isDark ? 'text-blue-400' : 'text-blue-700',
        icon: '🔄',
      },
      completed: {
        bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
        text: isDark ? 'text-emerald-400' : 'text-emerald-700',
        icon: '✓',
      },
      failed: {
        bg: isDark ? 'bg-red-500/20' : 'bg-red-100',
        text: isDark ? 'text-red-400' : 'text-red-700',
        icon: '✗',
      },
      cancelled: {
        bg: isDark ? 'bg-zinc-500/20' : 'bg-zinc-100',
        text: isDark ? 'text-zinc-400' : 'text-zinc-700',
        icon: '⊘',
      },
    }
    return styles[status] || styles['pending']
  }

  // Get status label
  const getStatusLabel = (status: TaskStatus): string => {
    const labels: Record<TaskStatus, string> = {
      pending: '等待中',
      assigned: '已分配',
      in_progress: '进行中',
      completed: '完成',
      failed: '失败',
      cancelled: '取消',
    }
    return labels[status]
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: isDark ? 'text-red-400' : 'text-red-600',
      high: isDark ? 'text-orange-400' : 'text-orange-600',
      medium: isDark ? 'text-amber-400' : 'text-amber-600',
      low: isDark ? 'text-zinc-400' : 'text-zinc-600',
    }
    return colors[priority as keyof typeof colors] || colors['low']
  }

  // Get progress bar color
  const getProgressColor = (progress: number) => {
    if (progress < 30) return isDark ? 'bg-amber-500' : 'bg-amber-500'
    if (progress < 70) return isDark ? 'bg-blue-500' : 'bg-blue-500'
    return isDark ? 'bg-emerald-500' : 'bg-emerald-500'
  }

  // Format estimated time
  const formatEstimatedTime = (ms?: number): string => {
    if (!ms) return '--'
    const minutes = Math.floor(ms / 60000)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  // Calculate progress percentage
  const getProgressPercentage = (task: Task): number => {
    if (task.status === 'completed') return 100
    if (task.status === 'pending') return 0
    // For in-progress, use a heuristic based on time elapsed
    if (task.createdAt && task.estimatedDuration) {
      const elapsed = currentTime - task.createdAt
      const estimatedMs = task.estimatedDuration * 60 * 1000 // Convert minutes to ms
      return Math.min(Math.floor((elapsed / estimatedMs) * 100), 95)
    }
    return 50 // Default for in-progress without time data
  }

  return (
    <div
      className={`rounded-xl border backdrop-blur-sm ${isDark ? 'border-zinc-700/50 bg-zinc-800/80' : 'border-zinc-200/50 bg-white/90'} ${className}`}
    >
      {/* Header */}
      <div className="border-b border-zinc-200/50 p-5 dark:border-zinc-700/50">
        <h2 className={`mb-4 text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          任务列表
          <span
            className={`ml-2 text-sm font-normal ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}
          >
            ({filteredTasks.length})
          </span>
        </h2>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'in-progress', 'pending', 'completed'] as TaskFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                filter === f
                  ? isDark
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : isDark
                    ? 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              } `}
            >
              {f === 'all' && '全部'}
              {f === 'in_progress' && '进行中'}
              {f === 'pending' && '等待中'}
              {f === 'completed' && '完成'}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="max-h-[600px] divide-y divide-zinc-200/50 overflow-y-auto dark:divide-zinc-700/50">
        {filteredTasks.length === 0 ? (
          <div className={`p-8 text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <div className="mb-2 text-4xl">📋</div>
            <div>暂无任务</div>
          </div>
        ) : (
          filteredTasks.map(task => {
            const statusBadge = getStatusBadge(task.status)
            const progress = getProgressPercentage(task)
            const isExpanded = expandedTaskId === task.id

            return (
              <div
                key={task.id}
                className={`transition-all duration-200 ${isExpanded ? 'bg-zinc-50/50 dark:bg-zinc-700/30' : 'hover:bg-zinc-50/30 dark:hover:bg-zinc-700/20'} `}
              >
                {/* Task Summary */}
                <div
                  className="cursor-pointer p-4"
                  onClick={() => {
                    setExpandedTaskId(isExpanded ? null : task.id)
                    onTaskClick?.(task)
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Expand Icon */}
                    <span className="mt-1 text-zinc-400 transition-transform duration-200">
                      {isExpanded ? '▼' : '▶'}
                    </span>

                    {/* Main Content */}
                    <div className="min-w-0 flex-1">
                      {/* Title + Status */}
                      <div className="mb-2 flex items-center gap-2">
                        <h3
                          className={`truncate font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}
                        >
                          {task.title}
                        </h3>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.bg} ${statusBadge.text} `}
                        >
                          <span>{statusBadge.icon}</span>
                          {getStatusLabel(task.status)}
                        </span>
                      </div>

                      {/* Assignee + Priority */}
                      <div className="mb-2 flex items-center gap-3 text-xs">
                        <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                          负责人: {task.assignedAgent || '未分配'}
                        </span>
                        <span className={getPriorityColor(task.priority)}>
                          优先级: {task.priority}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          <div
                            className={`h-full transition-all duration-300 ${getProgressColor(progress)}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          {progress}%
                        </span>
                        <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          剩余: {formatEstimatedTime(task.estimatedDuration)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className={`px-4 pb-4 pl-10 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    <div className="mb-2 text-sm">
                      <span className="font-medium">描述:</span> {task.description}
                    </div>
                    {task.createdAt && (
                      <div className="text-xs text-zinc-500">
                        创建于: {new Date(task.createdAt).toLocaleString('zh-CN')}
                      </div>
                    )}
                    {task.deadline && (
                      <div className="text-xs text-zinc-500">
                        截止时间: {new Date(task.deadline).toLocaleString('zh-CN')}
                      </div>
                    )}
                    {(() => {
                      const tags = task.metadata?.tags
                      if (Array.isArray(tags) && tags.length > 0) {
                        return (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(tags as string[]).map((tag: string) => (
                              <span
                                key={tag}
                                className={`rounded px-2 py-0.5 text-xs ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-700'} `}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default TaskList
