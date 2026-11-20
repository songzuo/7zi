'use client'

/**
 * TaskQueueView - 任务队列视图组件
 *
 * 显示任务队列的实时状态
 * 支持显示任务优先级、状态、估计时间
 * 使用 Zustand store 获取数据
 * 支持排序和筛选功能
 * 支持任务操作（暂停/取消/重新调度）
 * 支持虚拟滚动处理大量任务
 * 响应式布局，支持不同屏幕尺寸
 */

import { FC, useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  ListTodo,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Filter,
  ArrowUpDown,
  Calendar,
  User,
  ChevronDown,
  RefreshCw,
  MoreVertical,
  RotateCcw,
  Search,
  GripVertical,
  Loader2,
} from 'lucide-react'
import {
  useSchedulerStore,
  selectTasks,
  selectStats,
  selectUrgentTasks,
  selectOverdueTasks,
  selectAgents,
} from '@/lib/agents/scheduler/stores/scheduler-store'
import type { Task, TaskPriority, TaskStatus } from '@/lib/agents/scheduler/models/task-model'

// ============================================================================
// 类型定义
// ============================================================================

export type SortField = 'priority' | 'status' | 'createdAt' | 'deadline' | 'estimatedDuration'
export type SortOrder = 'asc' | 'desc'

export type TaskAction = 'pause' | 'resume' | 'cancel' | 'reschedule' | 'retry'

export interface FilterState {
  status: TaskStatus | 'all'
  priority: TaskPriority | 'all'
  agentId: string | 'all'
  searchQuery: string
}

export interface TaskQueueViewProps {
  /** 是否显示筛选器 */
  showFilters?: boolean
  /** 是否显示排序选项 */
  showSort?: boolean
  /** 是否显示搜索框 */
  showSearch?: boolean
  /** 是否自动刷新 */
  autoRefresh?: boolean
  /** 自动刷新间隔（毫秒） */
  refreshInterval?: number
  /** 自定义类名 */
  className?: string
  /** 点击任务卡片的回调 */
  onTaskClick?: (task: Task) => void
  /** 最大显示数量 */
  maxDisplay?: number
  /** 默认排序字段 */
  defaultSortField?: SortField
  /** 默认排序顺序 */
  defaultSortOrder?: SortOrder
  /** 是否启用虚拟滚动 */
  enableVirtualScroll?: boolean
  /** 虚拟滚动阈值 */
  virtualScrollThreshold?: number
  /** 是否启用拖拽排序 */
  enableDragSort?: boolean
  /** 拖拽排序回调 */
  onDragSort?: (tasks: Task[]) => void
}

interface TaskCardProps {
  task: Task
  onClick?: () => void
  onAction?: (action: TaskAction) => void
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

// ============================================================================
// 虚拟滚动配置
// ============================================================================

const ITEM_HEIGHT = 140 // 任务卡片的大致高度
const OVERSCAN = 5 // 上下额外渲染的项目数

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取优先级配置
 */
function getPriorityConfig(priority: TaskPriority) {
  const configs = {
    urgent: {
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/30',
      label: '紧急',
      badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    },
    high: {
      bg: 'bg-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800/30',
      label: '高',
      badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    },
    medium: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800/30',
      label: '中',
      badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    },
    low: {
      bg: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/30',
      label: '低',
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    },
  }
  return configs[priority]
}

/**
 * 获取状态配置
 */
function getStatusConfig(status: TaskStatus) {
  const configs = {
    pending: {
      icon: Pause,
      indicator: 'bg-zinc-400',
      text: 'text-zinc-600 dark:text-zinc-400',
      label: '待处理',
      badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
    },
    assigned: {
      icon: User,
      indicator: 'bg-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
      label: '已分配',
      badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    },
    in_progress: {
      icon: Play,
      indicator: 'bg-blue-500 animate-pulse',
      text: 'text-blue-600 dark:text-blue-400',
      label: '进行中',
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    },
    completed: {
      icon: CheckCircle2,
      indicator: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      label: '已完成',
      badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    },
    failed: {
      icon: XCircle,
      indicator: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      label: '失败',
      badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    },
    cancelled: {
      icon: XCircle,
      indicator: 'bg-zinc-500',
      text: 'text-zinc-600 dark:text-zinc-400',
      label: '已取消',
      badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    },
  }
  return configs[status]
}

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  } else {
    const days = Math.floor(diff / 86400000)
    return `${days}天前`
  }
}

/**
 * 格式化截止时间
 */
function formatDeadline(timestamp: number): { text: string; isOverdue: boolean } {
  const now = Date.now()
  const diff = timestamp - now

  if (diff < 0) {
    const absDiff = Math.abs(diff)
    if (absDiff < 3600000) {
      return { text: `超时 ${Math.floor(absDiff / 60000)} 分钟`, isOverdue: true }
    } else if (absDiff < 86400000) {
      return { text: `超时 ${Math.floor(absDiff / 3600000)} 小时`, isOverdue: true }
    } else {
      return { text: `超时 ${Math.floor(absDiff / 86400000)} 天`, isOverdue: true }
    }
  } else if (diff < 3600000) {
    return { text: `${Math.floor(diff / 60000)} 分钟后`, isOverdue: false }
  } else if (diff < 86400000) {
    return { text: `${Math.floor(diff / 3600000)} 小时后`, isOverdue: false }
  } else {
    return { text: `${Math.floor(diff / 86400000)} 天后`, isOverdue: false }
  }
}

/**
 * 格式化持续时间
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`
  } else {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
  }
}

/**
 * 任务优先级权重（用于排序）
 */
const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

/**
 * 任务状态权重（用于排序）
 */
const STATUS_WEIGHTS: Record<TaskStatus, number> = {
  in_progress: 5,
  assigned: 4,
  pending: 3,
  failed: 2,
  cancelled: 1,
  completed: 0,
}

// ============================================================================
// 子组件：任务操作菜单
// ============================================================================

interface TaskActionMenuProps {
  task: Task
  onAction: (action: TaskAction) => void
  onClose: () => void
}

const TaskActionMenu: FC<TaskActionMenuProps> = ({ task, onAction, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const actions: {
    action: TaskAction
    label: string
    icon: FC<{ className?: string }>
    show: boolean
  }[] = [
    { action: 'pause', label: '暂停任务', icon: Pause, show: task.status === 'in_progress' },
    {
      action: 'resume',
      label: '恢复任务',
      icon: Play,
      show: task.status === 'pending' && task.assignedAgent !== undefined,
    },
    {
      action: 'reschedule',
      label: '重新调度',
      icon: RotateCcw,
      show: ['pending', 'assigned', 'failed'].includes(task.status),
    },
    { action: 'retry', label: '重试', icon: RefreshCw, show: task.status === 'failed' },
    {
      action: 'cancel',
      label: '取消任务',
      icon: XCircle,
      show: ['pending', 'assigned', 'in_progress'].includes(task.status),
    },
  ]

  const visibleActions = actions.filter(a => a.show)

  if (visibleActions.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="absolute top-8 right-0 z-20 w-40 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
    >
      {visibleActions.map(({ action, label, icon: Icon }) => (
        <button
          key={action}
          onClick={() => {
            onAction(action)
            onClose()
          }}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700 ${action === 'cancel' ? 'text-red-600 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300'} `}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// 子组件：单个任务卡片
// ============================================================================

const TaskCard: FC<TaskCardProps> = ({ task, onClick, onAction, isDragging, dragHandleProps }) => {
  const priorityConfig = getPriorityConfig(task.priority)
  const statusConfig = getStatusConfig(task.status)
  const StatusIcon = statusConfig.icon
  const [showMenu, setShowMenu] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const deadlineDisplay = task.deadline ? formatDeadline(task.deadline) : null

  const handleAction = useCallback(
    async (action: TaskAction) => {
      if (!onAction) return
      setIsProcessing(true)
      try {
        await onAction(action)
      } finally {
        setIsProcessing(false)
      }
    },
    [onAction]
  )

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-white p-4 dark:bg-zinc-800/50 ${priorityConfig.border} transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${onClick ? 'cursor-pointer' : 'cursor-default'} ${isDragging ? 'opacity-50 shadow-xl' : ''} ${isProcessing ? 'pointer-events-none opacity-60' : ''} `}
    >
      {/* 优先级指示条 */}
      <div className={`absolute top-0 right-0 left-0 h-1 ${priorityConfig.bg}`} />

      {/* 拖拽手柄 */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="absolute top-1/2 left-0 -translate-y-1/2 cursor-grab p-1 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-zinc-400" />
        </div>
      )}

      {/* 头部：标题和状态 */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="mb-1 truncate font-semibold text-zinc-900 dark:text-zinc-100">
            {task.title}
          </h4>
          {task.description && (
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{task.description}</p>
          )}
        </div>

        {/* 状态徽章和操作菜单 */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${statusConfig.badge}`}
          >
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </div>

          {/* 操作按钮 */}
          {onAction && !['completed', 'cancelled'].includes(task.status) && (
            <div className="relative">
              <button
                onClick={e => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                disabled={isProcessing}
                className="rounded p-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                ) : (
                  <MoreVertical className="h-4 w-4 text-zinc-400" />
                )}
              </button>

              {showMenu && (
                <TaskActionMenu
                  task={task}
                  onAction={handleAction}
                  onClose={() => setShowMenu(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* 元数据区域 */}
      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        {/* 优先级 */}
        <div className={`flex items-center gap-1 ${priorityConfig.text}`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{priorityConfig.label}优先级</span>
        </div>

        {/* 估计时间 */}
        {task.estimatedDuration && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>约 {formatDuration(task.estimatedDuration)}</span>
          </div>
        )}

        {/* 创建时间 */}
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatTime(task.createdAt)}</span>
        </div>
      </div>

      {/* 截止时间 */}
      {deadlineDisplay && (
        <div
          className={`mt-3 flex items-center gap-1 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-700/50 ${deadlineDisplay.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'} `}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>
            {deadlineDisplay.isOverdue ? '⚠️ ' : ''}
            截止时间：{deadlineDisplay.text}
          </span>
        </div>
      )}

      {/* 分配的 Agent */}
      {task.assignedAgent && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <User className="h-3.5 w-3.5" />
          <span>分配给：{task.assignedAgent}</span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 主组件：任务队列视图
// ============================================================================

export const TaskQueueView: FC<TaskQueueViewProps> = ({
  showFilters = true,
  showSort = true,
  showSearch = true,
  autoRefresh = true,
  refreshInterval = 30000,
  className = '',
  onTaskClick,
  maxDisplay,
  defaultSortField = 'priority',
  defaultSortOrder = 'desc',
  enableVirtualScroll = true,
  virtualScrollThreshold = 100,
  enableDragSort = false,
  onDragSort,
}) => {
  const tasks = useSchedulerStore(selectTasks)
  const stats = useSchedulerStore(selectStats)
  const urgentTasks = useSchedulerStore(selectUrgentTasks)
  const overdueTasks = useSchedulerStore(selectOverdueTasks)
  const agents = useSchedulerStore(selectAgents)
  const refresh = useSchedulerStore(state => state.refresh)
  const failTask = useSchedulerStore(state => state.failTask)
  const completeTask = useSchedulerStore(state => state.completeTask)
  const scheduleTask = useSchedulerStore(state => state.scheduleTask)
  const isLoading = useSchedulerStore(state => state.isLoading)
  const error = useSchedulerStore(state => state.error)
  const clearError = useSchedulerStore(state => state.clearError)

  // 本地状态
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    agentId: 'all',
    searchQuery: '',
  })
  const [sortField, setSortField] = useState<SortField>(defaultSortField)
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  // 虚拟滚动状态
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)

  // 拖拽状态
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refresh()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refresh])

  // 监听容器高度变化
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // 过滤和排序任务
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks]

    // 应用搜索
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      result = result.filter(
        t =>
          t.title.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query))
      )
    }

    // 应用过滤器
    if (filters.status !== 'all') {
      result = result.filter(t => t.status === filters.status)
    }
    if (filters.priority !== 'all') {
      result = result.filter(t => t.priority === filters.priority)
    }
    if (filters.agentId !== 'all') {
      result = result.filter(t => t.assignedAgent === filters.agentId)
    }

    // 应用排序
    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'priority':
          comparison = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority]
          break
        case 'status':
          comparison = STATUS_WEIGHTS[a.status] - STATUS_WEIGHTS[b.status]
          break
        case 'createdAt':
          comparison = a.createdAt - b.createdAt
          break
        case 'deadline':
          if (a.deadline && b.deadline) {
            comparison = a.deadline - b.deadline
          } else if (a.deadline) {
            comparison = -1
          } else if (b.deadline) {
            comparison = 1
          }
          break
        case 'estimatedDuration':
          comparison = a.estimatedDuration - b.estimatedDuration
          break
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })

    // 限制显示数量
    if (maxDisplay && result.length > maxDisplay) {
      result = result.slice(0, maxDisplay)
    }

    return result
  }, [tasks, filters, sortField, sortOrder, maxDisplay])

  // 虚拟滚动计算
  const shouldUseVirtualScroll =
    enableVirtualScroll && filteredAndSortedTasks.length > virtualScrollThreshold

  const virtualScrollData = useMemo(() => {
    if (!shouldUseVirtualScroll) return null

    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN)
    const endIndex = Math.min(
      filteredAndSortedTasks.length,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN
    )

    return {
      startIndex,
      endIndex,
      offsetY: startIndex * ITEM_HEIGHT,
      totalHeight: filteredAndSortedTasks.length * ITEM_HEIGHT,
    }
  }, [shouldUseVirtualScroll, scrollTop, containerHeight, filteredAndSortedTasks.length])

  const visibleTasks =
    shouldUseVirtualScroll && virtualScrollData
      ? filteredAndSortedTasks.slice(virtualScrollData.startIndex, virtualScrollData.endIndex)
      : filteredAndSortedTasks

  // 处理滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // 切换排序顺序
  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
  }

  // 任务操作处理
  const handleTaskAction = useCallback(
    async (taskId: string, action: TaskAction) => {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return

      switch (action) {
        case 'pause':
          // 将任务状态设为 pending，移除分配
          failTask(taskId, '用户暂停')
          break
        case 'resume':
          // 重新调度任务
          await scheduleTask(taskId)
          break
        case 'cancel':
          // 取消任务
          failTask(taskId, '用户取消')
          break
        case 'reschedule':
          // 重新调度
          await scheduleTask(taskId)
          break
        case 'retry':
          // 重试失败的任务
          await scheduleTask(taskId)
          break
      }
    },
    [tasks, failTask, scheduleTask]
  )

  // 拖拽处理
  const handleDragStart = useCallback(
    (taskId: string) => {
      if (!enableDragSort) return
      setDraggedTaskId(taskId)
    },
    [enableDragSort]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, taskId: string) => {
      e.preventDefault()
      if (!enableDragSort) return
      setDragOverTaskId(taskId)
    },
    [enableDragSort]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, targetTaskId: string) => {
      e.preventDefault()
      if (!enableDragSort || !draggedTaskId || draggedTaskId === targetTaskId) {
        setDraggedTaskId(null)
        setDragOverTaskId(null)
        return
      }

      const sourceIndex = filteredAndSortedTasks.findIndex(t => t.id === draggedTaskId)
      const targetIndex = filteredAndSortedTasks.findIndex(t => t.id === targetTaskId)

      if (sourceIndex !== -1 && targetIndex !== -1 && onDragSort) {
        const newTasks = [...filteredAndSortedTasks]
        const [removed] = newTasks.splice(sourceIndex, 1)
        newTasks.splice(targetIndex, 0, removed)
        onDragSort(newTasks)
      }

      setDraggedTaskId(null)
      setDragOverTaskId(null)
    },
    [enableDragSort, draggedTaskId, filteredAndSortedTasks, onDragSort]
  )

  return (
    <div className={`${className}`}>
      {/* 头部 */}
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">任务队列</h3>

          {/* 统计信息 */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-zinc-600 dark:text-zinc-400">{stats.pendingTasks} 待处理</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-zinc-600 dark:text-zinc-400">{urgentTasks.length} 紧急</span>
            </div>
            {overdueTasks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="text-red-600 dark:text-red-400">{overdueTasks.length} 超时</span>
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 搜索框 */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="搜索任务..."
                value={filters.searchQuery}
                onChange={e => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="w-48 rounded-lg border border-transparent bg-zinc-100 py-2 pr-3 pl-9 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-300 dark:hover:bg-zinc-600/50"
              />
            </div>
          )}

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
                  {/* 状态筛选 */}
                  <div className="mb-3">
                    <label className="mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      任务状态
                    </label>
                    <select
                      value={filters.status}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          status: e.target.value as TaskStatus | 'all',
                        }))
                      }
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    >
                      <option value="all">全部状态</option>
                      <option value="pending">待处理</option>
                      <option value="assigned">已分配</option>
                      <option value="in_progress">进行中</option>
                      <option value="completed">已完成</option>
                      <option value="failed">失败</option>
                      <option value="cancelled">已取消</option>
                    </select>
                  </div>

                  {/* 优先级筛选 */}
                  <div className="mb-3">
                    <label className="mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      优先级
                    </label>
                    <select
                      value={filters.priority}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          priority: e.target.value as TaskPriority | 'all',
                        }))
                      }
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    >
                      <option value="all">全部优先级</option>
                      <option value="urgent">紧急</option>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>

                  {/* Agent 筛选 */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      执行 Agent
                    </label>
                    <select
                      value={filters.agentId}
                      onChange={e => setFilters(prev => ({ ...prev, agentId: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    >
                      <option value="all">全部 Agent</option>
                      {agents.map(agent => (
                        <option key={agent.agentId} value={agent.agentId}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 清除筛选 */}
                  {(filters.status !== 'all' ||
                    filters.priority !== 'all' ||
                    filters.agentId !== 'all') && (
                    <button
                      onClick={() =>
                        setFilters({
                          status: 'all',
                          priority: 'all',
                          agentId: 'all',
                          searchQuery: '',
                        })
                      }
                      className="mt-3 w-full py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                    >
                      清除所有筛选
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 排序 */}
          {showSort && (
            <div className="flex items-center gap-2">
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as SortField)}
                className="rounded-lg border border-transparent bg-zinc-100 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-300 dark:hover:bg-zinc-600/50"
              >
                <option value="priority">优先级</option>
                <option value="status">状态</option>
                <option value="createdAt">创建时间</option>
                <option value="deadline">截止时间</option>
                <option value="estimatedDuration">估计时长</option>
              </select>

              <button
                onClick={toggleSortOrder}
                className={`rounded-lg bg-zinc-100 p-2 transition-colors duration-200 hover:bg-zinc-200 dark:bg-zinc-700/50 dark:hover:bg-zinc-600/50`}
                title={sortOrder === 'asc' ? '升序' : '降序'}
              >
                <ArrowUpDown
                  className={`h-4 w-4 text-zinc-600 dark:text-zinc-400 ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                />
              </button>
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

      {/* 任务列表 */}
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={shouldUseVirtualScroll ? handleScroll : undefined}
        className={shouldUseVirtualScroll ? 'max-h-[600px] overflow-y-auto' : ''}
      >
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ListTodo className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="text-zinc-500 dark:text-zinc-400">暂无任务</p>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">任务将在这里显示</p>
          </div>
        ) : filteredAndSortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Filter className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="text-zinc-500 dark:text-zinc-400">无匹配的任务</p>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">尝试调整筛选条件</p>
          </div>
        ) : shouldUseVirtualScroll && virtualScrollData ? (
          // 虚拟滚动渲染
          <div style={{ height: virtualScrollData.totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${virtualScrollData.offsetY}px)` }}>
              {visibleTasks.map(task => (
                <div
                  key={task.id}
                  style={{ height: ITEM_HEIGHT }}
                  className="pb-3"
                  draggable={enableDragSort}
                  onDragStart={() => handleDragStart(task.id)}
                  onDragOver={e => handleDragOver(e, task.id)}
                  onDrop={e => handleDrop(e, task.id)}
                >
                  <TaskCard
                    task={task}
                    onClick={onTaskClick ? () => onTaskClick(task) : undefined}
                    onAction={onDragSort ? undefined : action => handleTaskAction(task.id, action)}
                    isDragging={draggedTaskId === task.id}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          // 普通渲染
          <div className="space-y-3">
            {visibleTasks.map(task => (
              <div
                key={task.id}
                draggable={enableDragSort}
                onDragStart={() => handleDragStart(task.id)}
                onDragOver={e => handleDragOver(e, task.id)}
                onDrop={e => handleDrop(e, task.id)}
                className={dragOverTaskId === task.id ? 'rounded-xl ring-2 ring-blue-500' : ''}
              >
                <TaskCard
                  task={task}
                  onClick={onTaskClick ? () => onTaskClick(task) : undefined}
                  onAction={action => handleTaskAction(task.id, action)}
                  isDragging={draggedTaskId === task.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 显示更多提示 */}
      {maxDisplay && tasks.length > maxDisplay && (
        <div className="mt-4 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            显示前 {maxDisplay} 个任务，共 {tasks.length} 个
          </p>
        </div>
      )}

      {/* 底部统计 */}
      {tasks.length > 0 && (
        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-700/50">
          <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
            <div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {stats.totalTasks}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">总任务</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.pendingTasks}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">待处理</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.completedTasks}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">已完成</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.failedTasks}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">失败</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 紧凑版本组件
// ============================================================================

export interface TaskQueueCompactProps {
  className?: string
}

/**
 * 紧凑版的任务队列显示，适合侧边栏或小空间使用
 */
export const TaskQueueCompact: FC<TaskQueueCompactProps> = ({ className = '' }) => {
  const stats = useSchedulerStore(selectStats)
  const urgentTasks = useSchedulerStore(selectUrgentTasks)
  const overdueTasks = useSchedulerStore(selectOverdueTasks)

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <ListTodo className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {stats.totalTasks} 任务
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats.pendingTasks}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats.completedTasks}</span>
        </div>
        {(urgentTasks.length > 0 || overdueTasks.length > 0) && (
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-red-600 dark:text-red-400">
              {urgentTasks.length + overdueTasks.length}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 默认导出
// ============================================================================

export default TaskQueueView
