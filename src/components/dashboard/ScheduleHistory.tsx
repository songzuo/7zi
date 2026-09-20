'use client'

/**
 * ScheduleHistory - 调度历史视图组件
 *
 * 显示 Agent 调度计划的执行历史记录
 * 支持时间范围筛选、状态筛选、分页加载
 * 使用 Zustand store 获取数据
 * 响应式布局，支持不同屏幕尺寸
 */

import { FC, useState, useEffect, useMemo } from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  FileText,
  User,
  Timer,
  ChevronUp,
} from 'lucide-react'
import { useSchedulerStore, selectTasks } from '@/lib/agents/scheduler/stores/scheduler-store'
import type { Task } from '@/lib/agents/scheduler/models/task-model'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 执行历史条目（从 Task 数据派生）
 */
export interface HistoryEntry {
  /** 任务 ID */
  taskId: string
  /** 执行时间戳 */
  timestamp: number
  /** Agent ID */
  agentId?: string
  /** 任务类型 */
  taskType: string
  /** 执行状态 */
  status: 'success' | 'failed' | 'skipped'
  /** 耗时（毫秒） */
  duration?: number
  /** 错误信息 */
  error?: string
  /** 任务标题 */
  title: string
  /** 任务描述 */
  description?: string
  /** 是否为手动分配 */
  manualOverride?: boolean
}

/**
 * 时间范围筛选选项
 */
export type TimeRange = 'today' | 'last7days' | 'last30days' | 'custom'

/**
 * 状态筛选选项
 */
export type StatusFilter = 'all' | 'success' | 'failed' | 'skipped'

export interface ScheduleHistoryProps {
  /** 是否显示筛选器 */
  showFilters?: boolean
  /** 是否自动刷新 */
  autoRefresh?: boolean
  /** 自动刷新间隔（毫秒） */
  refreshInterval?: number
  /** 自定义类名 */
  className?: string
  /** 每页显示数量 */
  pageSize?: number
  /** 点击历史条目的回调 */
  onEntryClick?: (entry: HistoryEntry) => void
  /** 最大显示数量 */
  maxDisplay?: number
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 将 Task 转换为 HistoryEntry
 */
function taskToHistoryEntry(task: Task): HistoryEntry | null {
  // 只显示已完成的任务（成功或失败）
  if (task.status !== 'completed' && task.status !== 'failed') {
    return null
  }

  const status: HistoryEntry['status'] = task.status === 'completed' ? 'success' : 'failed'

  // 计算耗时
  let duration: number | undefined
  if (task.startedAt && task.completedAt) {
    duration = task.completedAt - task.startedAt
  }

  return {
    taskId: task.id,
    timestamp: task.completedAt || task.createdAt,
    agentId: task.assignedAgent,
    taskType: task.type,
    status,
    duration,
    error: task.error,
    title: task.title,
    description: task.description,
  }
}

/**
 * 获取状态配置
 */
function getStatusConfig(status: HistoryEntry['status']) {
  const configs = {
    success: {
      icon: CheckCircle2,
      indicator: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      label: '成功',
      badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800/30',
    },
    failed: {
      icon: XCircle,
      indicator: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      label: '失败',
      badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800/30',
    },
    skipped: {
      icon: AlertCircle,
      indicator: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      label: '跳过',
      badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800/30',
    },
  }
  return configs[status]
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)

  // 获取当前日期和目标日期
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  // 计算天数差异
  const dayDiff = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (dayDiff === 0) {
    // 今天 - 显示时间
    return `今天 ${date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } else if (dayDiff === -1) {
    // 昨天
    return `昨天 ${date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } else if (dayDiff > -7) {
    // 本周 - 显示星期几
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${weekdays[date.getDay()]} ${date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } else {
    // 更早 - 显示日期
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

/**
 * 格式化耗时
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  } else if (ms < 60000) {
    const seconds = Math.floor(ms / 1000)
    return `${seconds}秒`
  } else if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return seconds > 0 ? `${minutes}分${seconds}秒` : `${minutes}分钟`
  } else {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
  }
}

/**
 * 根据时间范围筛选
 */
function filterByTimeRange(
  entries: HistoryEntry[],
  timeRange: TimeRange,
  startTime?: number,
  endTime?: number
): HistoryEntry[] {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  switch (timeRange) {
    case 'today':
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      return entries.filter(e => e.timestamp >= todayStart.getTime())
    case 'last7days':
      const sevenDaysAgo = now - 7 * oneDay
      return entries.filter(e => e.timestamp >= sevenDaysAgo)
    case 'last30days':
      const thirtyDaysAgo = now - 30 * oneDay
      return entries.filter(e => e.timestamp >= thirtyDaysAgo)
    case 'custom':
      if (startTime && endTime) {
        return entries.filter(e => e.timestamp >= startTime && e.timestamp <= endTime)
      }
      return entries
    default:
      return entries
  }
}

/**
 * 根据状态筛选
 */
function filterByStatus(entries: HistoryEntry[], status: StatusFilter): HistoryEntry[] {
  if (status === 'all') {
    return entries
  }
  return entries.filter(e => e.status === status)
}

/**
 * 搜索历史条目
 */
function searchEntries(entries: HistoryEntry[], query: string): HistoryEntry[] {
  if (!query.trim()) {
    return entries
  }

  const lowerQuery = query.toLowerCase()
  return entries.filter(
    e =>
      e.title.toLowerCase().includes(lowerQuery) ||
      e.description?.toLowerCase().includes(lowerQuery) ||
      e.agentId?.toLowerCase().includes(lowerQuery) ||
      e.taskType.toLowerCase().includes(lowerQuery)
  )
}

// ============================================================================
// 子组件：单个历史条目卡片
// ============================================================================

interface HistoryEntryCardProps {
  entry: HistoryEntry
  onClick?: () => void
}

const HistoryEntryCard: FC<HistoryEntryCardProps> = ({ entry, onClick }) => {
  const statusConfig = getStatusConfig(entry.status)
  const StatusIcon = statusConfig.icon

  const [expanded, setExpanded] = useState(false)

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-white dark:bg-zinc-800/50 ${statusConfig.border} transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${onClick ? 'cursor-pointer' : 'cursor-default'} `}
    >
      {/* 主内容 */}
      <div className="p-4">
        {/* 头部：时间戳和状态 */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {formatTimestamp(entry.timestamp)}
            </span>
          </div>

          {/* 状态徽章 */}
          <div
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${statusConfig.badge}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{statusConfig.label}</span>
          </div>
        </div>

        {/* 任务标题 */}
        <h4 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">{entry.title}</h4>

        {/* 任务描述 */}
        {entry.description && !expanded && (
          <p className="mb-3 truncate text-sm text-zinc-600 dark:text-zinc-400">
            {entry.description}
          </p>
        )}

        {/* 元数据区域 */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          {/* Agent */}
          {entry.agentId && (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span className="font-mono">{entry.agentId}</span>
            </div>
          )}

          {/* 任务类型 */}
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>{entry.taskType}</span>
          </div>

          {/* 耗时 */}
          {entry.duration && (
            <div className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" />
              <span>{formatDuration(entry.duration)}</span>
            </div>
          )}
        </div>

        {/* 错误信息 */}
        {entry.error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800/30 dark:bg-red-900/20">
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" />
              <p className="font-mono text-xs break-all text-red-700 dark:text-red-300">
                {entry.error}
              </p>
            </div>
          </div>
        )}

        {/* 展开/收起按钮 */}
        {entry.description && entry.description.length > 100 && (
          <button
            onClick={e => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                <span>收起</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                <span>展开</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 任务 ID */}
      <div className="border-t border-zinc-100 px-4 pt-0 pb-3 dark:border-zinc-700/50">
        <div className="flex items-center gap-1 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          <span>ID:</span>
          <span>{entry.taskId}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 主组件：调度历史视图
// ============================================================================

export const ScheduleHistory: FC<ScheduleHistoryProps> = ({
  showFilters = true,
  autoRefresh = true,
  refreshInterval = 30000,
  className = '',
  pageSize = 20,
  onEntryClick,
  maxDisplay,
}) => {
  const tasks = useSchedulerStore(selectTasks)
  const refresh = useSchedulerStore(state => state.refresh)
  const isLoading = useSchedulerStore(state => state.isLoading)

  // 本地状态
  const [timeRange, setTimeRange] = useState<TimeRange>('last7days')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  // 自定义时间范围
  const [customStartTime, setCustomStartTime] = useState<number | undefined>(undefined)
  const [customEndTime, setCustomEndTime] = useState<number | undefined>(undefined)

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refresh()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refresh])

  // 将任务转换为历史条目
  const historyEntries = useMemo(() => {
    return tasks
      .map(taskToHistoryEntry)
      .filter((entry): entry is HistoryEntry => entry !== null)
      .sort((a, b) => b.timestamp - a.timestamp) // 按时间倒序排列
  }, [tasks])

  // 应用筛选
  const filteredEntries = useMemo(() => {
    let result = historyEntries

    // 时间范围筛选
    result = filterByTimeRange(result, timeRange, customStartTime, customEndTime)

    // 状态筛选
    result = filterByStatus(result, statusFilter)

    // 搜索筛选
    result = searchEntries(result, searchQuery)

    return result
  }, [historyEntries, timeRange, statusFilter, searchQuery, customStartTime, customEndTime])

  // 分页
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize))
  const paginatedEntries = useMemo(() => {
    // 确保当前页码在有效范围内
    const validCurrentPage = Math.min(currentPage, totalPages)

    const start = (validCurrentPage - 1) * pageSize
    const end = start + pageSize
    let result = filteredEntries.slice(start, end)

    // 限制最大显示数量
    if (maxDisplay && result.length > maxDisplay) {
      result = result.slice(0, maxDisplay)
    }

    return result
  }, [filteredEntries, currentPage, pageSize, maxDisplay, totalPages])

  // 安全地设置页码（确保在有效范围内）
  const handleSetCurrentPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages))
  }

  // 统计信息
  const statsInfo = useMemo(() => {
    const total = filteredEntries.length
    const success = filteredEntries.filter(e => e.status === 'success').length
    const failed = filteredEntries.filter(e => e.status === 'failed').length

    const avgDuration =
      filteredEntries.filter(e => e.duration).reduce((sum, e) => sum + (e.duration || 0), 0) /
      (filteredEntries.filter(e => e.duration).length || 1)

    return { total, success, failed, avgDuration }
  }, [filteredEntries])

  return (
    <div className={`${className}`}>
      {/* 头部 */}
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">执行历史</h3>

          {/* 统计信息 */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-zinc-500" />
              <span className="text-zinc-600 dark:text-zinc-400">{statsInfo.total} 总计</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-zinc-600 dark:text-zinc-400">{statsInfo.success} 成功</span>
            </div>
            {statsInfo.failed > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-red-600 dark:text-red-400">{statsInfo.failed} 失败</span>
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                handleSetCurrentPage(1)
              }}
              className="w-40 rounded-lg border border-transparent bg-zinc-100 py-2 pr-3 pl-9 text-sm text-zinc-900 placeholder-zinc-400 hover:bg-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:w-56 dark:bg-zinc-700/50 dark:text-zinc-100 dark:placeholder-zinc-500 dark:hover:bg-zinc-600/50"
            />
          </div>

          {/* 筛选器 */}
          {showFilters && (
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-300 dark:hover:bg-zinc-600/50`}
              >
                <Filter className="h-4 w-4" />
                <span>筛选</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* 下拉菜单 */}
              {showFilterDropdown && (
                <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  {/* 时间范围筛选 */}
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      时间范围
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setTimeRange('today')
                          setCustomStartTime(undefined)
                          setCustomEndTime(undefined)
                          handleSetCurrentPage(1)
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          timeRange === 'today'
                            ? 'bg-blue-500 text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                        }`}
                      >
                        今天
                      </button>
                      <button
                        onClick={() => {
                          setTimeRange('last7days')
                          setCustomStartTime(undefined)
                          setCustomEndTime(undefined)
                          handleSetCurrentPage(1)
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          timeRange === 'last7days'
                            ? 'bg-blue-500 text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                        }`}
                      >
                        最近7天
                      </button>
                      <button
                        onClick={() => {
                          setTimeRange('last30days')
                          setCustomStartTime(undefined)
                          setCustomEndTime(undefined)
                          handleSetCurrentPage(1)
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          timeRange === 'last30days'
                            ? 'bg-blue-500 text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                        }`}
                      >
                        最近30天
                      </button>
                    </div>
                  </div>

                  {/* 状态筛选 */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      执行状态
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setStatusFilter('all')
                          handleSetCurrentPage(1)
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          statusFilter === 'all'
                            ? 'bg-blue-500 text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                        }`}
                      >
                        全部
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter('success')
                          handleSetCurrentPage(1)
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          statusFilter === 'success'
                            ? 'bg-green-500 text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                        }`}
                      >
                        成功
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter('failed')
                          handleSetCurrentPage(1)
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          statusFilter === 'failed'
                            ? 'bg-red-500 text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                        }`}
                      >
                        失败
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter('skipped')
                          handleSetCurrentPage(1)
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          statusFilter === 'skipped'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                        }`}
                      >
                        跳过
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 刷新按钮 */}
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className={`rounded-lg bg-zinc-100 p-2 transition-colors duration-200 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700/50 dark:hover:bg-zinc-600/50`}
            title="刷新"
          >
            <RefreshCw
              className={`h-4 w-4 text-zinc-600 dark:text-zinc-400 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* 历史条目列表 */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <p className="text-zinc-500 dark:text-zinc-400">暂无历史记录</p>
          <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">完成的任务将在这里显示</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedEntries.map(entry => (
            <HistoryEntryCard
              key={entry.taskId}
              entry={entry}
              onClick={onEntryClick ? () => onEntryClick(entry) : undefined}
            />
          ))}
        </div>
      )}

      {/* 分页控件 */}
      {filteredEntries.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            显示 {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, filteredEntries.length)} 条，共{' '}
            {filteredEntries.length} 条
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSetCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`rounded-lg bg-zinc-100 p-2 transition-colors duration-200 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700/50 dark:hover:bg-zinc-600/50`}
              title="上一页"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handleSetCurrentPage(pageNum)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-500 text-white'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                    } `}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => handleSetCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`rounded-lg bg-zinc-100 p-2 transition-colors duration-200 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700/50 dark:hover:bg-zinc-600/50`}
              title="下一页"
            >
              <ChevronRight className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>
      )}

      {/* 显示更多提示 */}
      {maxDisplay && filteredEntries.length > maxDisplay && (
        <div className="mt-4 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            显示前 {maxDisplay} 条记录，共 {filteredEntries.length} 条
          </p>
        </div>
      )}

      {/* 底部统计 */}
      {filteredEntries.length > 0 && (
        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-700/50">
          <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
            <div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {statsInfo.total}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">总执行</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {statsInfo.success}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">成功</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {statsInfo.failed}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">失败</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatDuration(statsInfo.avgDuration)}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">平均耗时</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 默认导出
// ============================================================================

export default ScheduleHistory
