'use client';

/**
 * TaskQueueView - 任务队列视图组件
 *
 * 显示任务队列的实时状态
 * 支持显示任务优先级、状态、估计时间
 * 使用 Zustand store 获取数据
 * 支持排序和筛选功能
 * 响应式布局，支持不同屏幕尺寸
 */

import { FC, useState, useEffect, useMemo } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { 
  useSchedulerStore, 
  selectTasks,
  selectStats,
  selectUrgentTasks,
  selectOverdueTasks 
} from '@/lib/agents/scheduler/stores/scheduler-store';
import type { Task, TaskPriority, TaskStatus } from '@/lib/agents/scheduler/models/task-model';

// ============================================================================
// 类型定义
// ============================================================================

export type SortField = 'priority' | 'status' | 'createdAt' | 'deadline' | 'estimatedDuration';
export type SortOrder = 'asc' | 'desc';

export interface TaskQueueViewProps {
  /** 是否显示筛选器 */
  showFilters?: boolean;
  /** 是否显示排序选项 */
  showSort?: boolean;
  /** 是否自动刷新 */
  autoRefresh?: boolean;
  /** 自动刷新间隔（毫秒） */
  refreshInterval?: number;
  /** 自定义类名 */
  className?: string;
  /** 点击任务卡片的回调 */
  onTaskClick?: (task: Task) => void;
  /** 最大显示数量 */
  maxDisplay?: number;
  /** 默认排序字段 */
  defaultSortField?: SortField;
  /** 默认排序顺序 */
  defaultSortOrder?: SortOrder;
}

interface FilterState {
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
}

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

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
      badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    },
    high: {
      bg: 'bg-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800/30',
      label: '高',
      badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
    },
    medium: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800/30',
      label: '中',
      badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
    },
    low: {
      bg: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/30',
      label: '低',
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    }
  };
  return configs[priority];
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
      badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
    },
    assigned: {
      icon: User,
      indicator: 'bg-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
      label: '已分配',
      badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
    },
    in_progress: {
      icon: Play,
      indicator: 'bg-blue-500 animate-pulse',
      text: 'text-blue-600 dark:text-blue-400',
      label: '进行中',
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    },
    completed: {
      icon: CheckCircle2,
      indicator: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      label: '已完成',
      badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    },
    failed: {
      icon: XCircle,
      indicator: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      label: '失败',
      badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    },
    cancelled: {
      icon: XCircle,
      indicator: 'bg-zinc-500',
      text: 'text-zinc-600 dark:text-zinc-400',
      label: '已取消',
      badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
    }
  };
  return configs[status];
}

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分钟前`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}小时前`;
  } else {
    const days = Math.floor(diff / 86400000);
    return `${days}天前`;
  }
}

/**
 * 格式化截止时间
 */
function formatDeadline(timestamp: number): { text: string; isOverdue: boolean } {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    if (absDiff < 3600000) {
      return { text: `超时 ${Math.floor(absDiff / 60000)} 分钟`, isOverdue: true };
    } else if (absDiff < 86400000) {
      return { text: `超时 ${Math.floor(absDiff / 3600000)} 小时`, isOverdue: true };
    } else {
      return { text: `超时 ${Math.floor(absDiff / 86400000)} 天`, isOverdue: true };
    }
  } else if (diff < 3600000) {
    return { text: `${Math.floor(diff / 60000)} 分钟后`, isOverdue: false };
  } else if (diff < 86400000) {
    return { text: `${Math.floor(diff / 3600000)} 小时后`, isOverdue: false };
  } else {
    return { text: `${Math.floor(diff / 86400000)} 天后`, isOverdue: false };
  }
}

/**
 * 格式化持续时间
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  }
}

/**
 * 任务优先级权重（用于排序）
 */
const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1
};

/**
 * 任务状态权重（用于排序）
 */
const STATUS_WEIGHTS: Record<TaskStatus, number> = {
  in_progress: 5,
  assigned: 4,
  pending: 3,
  failed: 2,
  cancelled: 1,
  completed: 0
};

// ============================================================================
// 子组件：单个任务卡片
// ============================================================================

const TaskCard: FC<TaskCardProps> = ({ task, onClick }) => {
  const priorityConfig = getPriorityConfig(task.priority);
  const statusConfig = getStatusConfig(task.status);
  const StatusIcon = statusConfig.icon;
  
  const deadlineDisplay = task.deadline ? formatDeadline(task.deadline) : null;
  
  return (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden
        p-4 bg-white dark:bg-zinc-800/50
        rounded-xl border ${priorityConfig.border}
        transition-all duration-300
        hover:scale-[1.01] hover:shadow-lg
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {/* 优先级指示条 */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${priorityConfig.bg}`} />
      
      {/* 头部：标题和状态 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate mb-1">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {task.description}
            </p>
          )}
        </div>
        
        {/* 状态徽章 */}
        <div className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${statusConfig.badge}`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </div>
      </div>
      
      {/* 元数据区域 */}
      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        {/* 优先级 */}
        <div className={`flex items-center gap-1 ${priorityConfig.text}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{priorityConfig.label}优先级</span>
        </div>
        
        {/* 估计时间 */}
        {task.estimatedDuration && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>约 {formatDuration(task.estimatedDuration)}</span>
          </div>
        )}
        
        {/* 创建时间 */}
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatTime(task.createdAt)}</span>
        </div>
      </div>
      
      {/* 截止时间 */}
      {deadlineDisplay && (
        <div className={`
          mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700/50
          flex items-center gap-1 text-xs
          ${deadlineDisplay.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}
        `}>
          <Clock className="w-3.5 h-3.5" />
          <span>
            {deadlineDisplay.isOverdue ? '⚠️ ' : ''}
            截止时间：{deadlineDisplay.text}
          </span>
        </div>
      )}
      
      {/* 分配的 Agent */}
      {task.assignedAgent && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <User className="w-3.5 h-3.5" />
          <span>分配给：{task.assignedAgent}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 主组件：任务队列视图
// ============================================================================

export const TaskQueueView: FC<TaskQueueViewProps> = ({
  showFilters = true,
  showSort = true,
  autoRefresh = true,
  refreshInterval = 30000,
  className = '',
  onTaskClick,
  maxDisplay,
  defaultSortField = 'priority',
  defaultSortOrder = 'desc'
}) => {
  const tasks = useSchedulerStore(selectTasks);
  const stats = useSchedulerStore(selectStats);
  const urgentTasks = useSchedulerStore(selectUrgentTasks);
  const overdueTasks = useSchedulerStore(selectOverdueTasks);
  const refresh = useSchedulerStore(state => state.refresh);
  const isLoading = useSchedulerStore(state => state.isLoading);
  
  // 本地状态
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all'
  });
  const [sortField, setSortField] = useState<SortField>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);
  
  // 过滤和排序任务
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];
    
    // 应用过滤器
    if (filters.status !== 'all') {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.priority !== 'all') {
      result = result.filter(t => t.priority === filters.priority);
    }
    
    // 应用排序
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'priority':
          comparison = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
          break;
        case 'status':
          comparison = STATUS_WEIGHTS[a.status] - STATUS_WEIGHTS[b.status];
          break;
        case 'createdAt':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'deadline':
          if (a.deadline && b.deadline) {
            comparison = a.deadline - b.deadline;
          } else if (a.deadline) {
            comparison = -1;
          } else if (b.deadline) {
            comparison = 1;
          }
          break;
        case 'estimatedDuration':
          comparison = a.estimatedDuration - b.estimatedDuration;
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    // 限制显示数量
    if (maxDisplay && result.length > maxDisplay) {
      result = result.slice(0, maxDisplay);
    }
    
    return result;
  }, [tasks, filters, sortField, sortOrder, maxDisplay]);
  
  // 切换排序顺序
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  return (
    <div className={`${className}`}>
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            任务队列
          </h3>
          
          {/* 统计信息 */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-zinc-600 dark:text-zinc-400">
                {stats.pendingTasks} 待处理
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-zinc-600 dark:text-zinc-400">
                {urgentTasks.length} 紧急
              </span>
            </div>
            {overdueTasks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-600 dark:text-red-400">
                  {overdueTasks.length} 超时
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 筛选器 */}
          {showFilters && (
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg
                  bg-zinc-100 dark:bg-zinc-700/50
                  hover:bg-zinc-200 dark:hover:bg-zinc-600/50
                  transition-colors duration-200
                  text-sm text-zinc-700 dark:text-zinc-300
                `}
              >
                <Filter className="w-4 h-4" />
                <span>筛选</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {/* 下拉菜单 */}
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-4 z-10">
                  {/* 状态筛选 */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      任务状态
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as TaskStatus | 'all' }))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-900 dark:text-zinc-100"
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
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      优先级
                    </label>
                    <select
                      value={filters.priority}
                      onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as TaskPriority | 'all' }))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="all">全部优先级</option>
                      <option value="urgent">紧急</option>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 排序 */}
          {showSort && (
            <div className="flex items-center gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700/50 border border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-600/50 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <option value="priority">优先级</option>
                <option value="status">状态</option>
                <option value="createdAt">创建时间</option>
                <option value="deadline">截止时间</option>
                <option value="estimatedDuration">估计时长</option>
              </select>
              
              <button
                onClick={toggleSortOrder}
                className={`
                  p-2 rounded-lg
                  bg-zinc-100 dark:bg-zinc-700/50
                  hover:bg-zinc-200 dark:hover:bg-zinc-600/50
                  transition-colors duration-200
                `}
                title={sortOrder === 'asc' ? '升序' : '降序'}
              >
                <ArrowUpDown className={`w-4 h-4 text-zinc-600 dark:text-zinc-400 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
          
          {/* 刷新按钮 */}
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className={`
              p-2 rounded-lg
              bg-zinc-100 dark:bg-zinc-700/50
              hover:bg-zinc-200 dark:hover:bg-zinc-600/50
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-600 dark:text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ListTodo className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400">暂无任务</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
            任务将在这里显示
          </p>
        </div>
      ) : filteredAndSortedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Filter className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400">无匹配的任务</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
            尝试调整筛选条件
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick ? () => onTaskClick(task) : undefined}
            />
          ))}
        </div>
      )}
      
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
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-700/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
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
  );
};

// ============================================================================
// 紧凑版本组件
// ============================================================================

export interface TaskQueueCompactProps {
  className?: string;
}

/**
 * 紧凑版的任务队列显示，适合侧边栏或小空间使用
 */
export const TaskQueueCompact: FC<TaskQueueCompactProps> = ({ className = '' }) => {
  const stats = useSchedulerStore(selectStats);
  const urgentTasks = useSchedulerStore(selectUrgentTasks);
  const overdueTasks = useSchedulerStore(selectOverdueTasks);
  
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <ListTodo className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {stats.totalTasks} 任务
        </span>
      </div>
      
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats.pendingTasks}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats.completedTasks}</span>
        </div>
        {(urgentTasks.length > 0 || overdueTasks.length > 0) && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-600 dark:text-red-400">{urgentTasks.length + overdueTasks.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 默认导出
// ============================================================================

export default TaskQueueView;
