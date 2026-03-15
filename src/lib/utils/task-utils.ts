/**
 * @fileoverview 任务相关工具函数
 * @module lib/utils/task-utils
 * 
 * @description
 * 提供任务管理系统的核心工具函数，包括：
 * - 任务类型与角色映射
 * - 优先级和状态排序
 * - 任务过滤和统计
 * - 任务数据验证
 * 
 * @example
 * ```typescript
 * import { sortTasks, getTaskStats, validateTaskData } from '@/lib/utils/task-utils';
 * 
 * // 排序任务
 * const sortedTasks = sortTasks(tasks);
 * 
 * // 获取统计
 * const stats = getTaskStats(tasks);
 * 
 * // 验证任务数据
 * const { isValid, errors } = validateTaskData(taskData);
 * ```
 */

import { Task, TaskType, TaskPriority, TaskStatus, AI_MEMBER_ROLES } from '@/lib/types/task-types';

// ============================================
// 类型映射工具
// ============================================

/**
 * 任务类型到 AI 角色的映射
 * 
 * @description
 * 根据任务类型返回最适合处理的 AI 成员角色。
 * 用于自动分配任务时的角色匹配。
 * 
 * @param taskType - 任务类型
 * @returns 对应的 AI 成员角色
 * 
 * @example
 * ```typescript
 * getRoleForTaskType('development'); // AI_MEMBER_ROLES.EXECUTOR
 * getRoleForTaskType('design');      // AI_MEMBER_ROLES.DESIGNER
 * getRoleForTaskType('research');    // AI_MEMBER_ROLES.CONSULTANT
 * ```
 */
export const getRoleForTaskType = (taskType: TaskType): AI_MEMBER_ROLES => {
  const roleMap: Record<TaskType, AI_MEMBER_ROLES> = {
    development: AI_MEMBER_ROLES.EXECUTOR,
    design: AI_MEMBER_ROLES.DESIGNER,
    research: AI_MEMBER_ROLES.CONSULTANT,
    marketing: AI_MEMBER_ROLES.PROMOTER,
    other: AI_MEMBER_ROLES.GENERAL,
  };
  
  return roleMap[taskType] ?? AI_MEMBER_ROLES.GENERAL;
};

// ============================================
// 排序工具
// ============================================

/**
 * 优先级数值映射
 * 用于排序比较
 */
const PRIORITY_LEVELS: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * 状态排序数值映射
 * 用于排序比较
 */
const STATUS_ORDERS: Record<TaskStatus, number> = {
  pending: 1,
  assigned: 2,
  in_progress: 3,
  completed: 4,
};

/**
 * 获取优先级数值
 * 
 * @description
 * 将优先级转换为数值，便于排序比较。
 * 数值越高，优先级越高。
 * 
 * @param priority - 任务优先级
 * @returns 优先级数值 (1-4)
 * 
 * @example
 * ```typescript
 * getPriorityLevel('urgent'); // 4
 * getPriorityLevel('low');    // 1
 * ```
 */
export const getPriorityLevel = (priority: TaskPriority): number => {
  return PRIORITY_LEVELS[priority] ?? 0;
};

/**
 * 获取状态排序数值
 * 
 * @description
 * 将状态转换为排序数值，便于按工作流顺序排序。
 * 数值越小，越需要处理。
 * 
 * @param status - 任务状态
 * @returns 状态排序数值 (1-4)
 * 
 * @example
 * ```typescript
 * getStatusOrder('pending');   // 1
 * getStatusOrder('completed'); // 4
 * ```
 */
export const getStatusOrder = (status: TaskStatus): number => {
  return STATUS_ORDERS[status] ?? 0;
};

/**
 * 任务排序配置
 */
export interface TaskSortOptions {
  /** 排序字段: 'status' | 'priority' | 'createdAt' */
  sortBy?: 'status' | 'priority' | 'createdAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 对任务列表进行排序
 * 
 * @description
 * 默认排序规则：
 * 1. 按状态排序（pending > assigned > in_progress > completed）
 * 2. 同状态按优先级排序（urgent > high > medium > low）
 * 3. 同优先级按创建时间排序（新的在前）
 * 
 * @param tasks - 任务列表
 * @param options - 排序选项（可选）
 * @returns 排序后的任务列表（新数组）
 * 
 * @example
 * ```typescript
 * // 默认排序
 * const sorted = sortTasks(tasks);
 * 
 * // 按优先级降序
 * const sorted = sortTasks(tasks, { sortBy: 'priority', sortOrder: 'desc' });
 * ```
 */
export const sortTasks = (tasks: Task[], options?: TaskSortOptions): Task[] => {
  if (!tasks || tasks.length === 0) return [];
  
  // 默认排序：状态 > 优先级 > 创建时间
  if (!options || options.sortBy === 'status') {
    return [...tasks].sort((a, b) => {
      // 1. 按状态排序（pending 优先）
      const statusDiff = getStatusOrder(a.status) - getStatusOrder(b.status);
      if (statusDiff !== 0) return statusDiff;
      
      // 2. 按优先级排序（urgent 优先）
      const priorityDiff = getPriorityLevel(b.priority) - getPriorityLevel(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      
      // 3. 按创建时间排序（新的在前）
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  
  // 自定义排序
  const { sortBy, sortOrder = 'desc' } = options;
  const multiplier = sortOrder === 'desc' ? -1 : 1;
  
  return [...tasks].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        return (getPriorityLevel(b.priority) - getPriorityLevel(a.priority)) * multiplier;
      case 'createdAt':
        return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * multiplier;
      default:
        return 0;
    }
  });
};

// ============================================
// 过滤工具
// ============================================

/**
 * 按类型过滤任务
 * 
 * @param tasks - 任务列表
 * @param type - 任务类型或 'all'
 * @returns 过滤后的任务列表
 * 
 * @example
 * ```typescript
 * const devTasks = filterTasksByType(tasks, 'development');
 * const allTasks = filterTasksByType(tasks, 'all');
 * ```
 */
export const filterTasksByType = (tasks: Task[], type: TaskType | 'all'): Task[] => {
  if (!tasks || tasks.length === 0) return [];
  if (type === 'all') return tasks;
  return tasks.filter(task => task.type === type);
};

/**
 * 按状态过滤任务
 * 
 * @param tasks - 任务列表
 * @param status - 任务状态或 'all'
 * @returns 过滤后的任务列表
 * 
 * @example
 * ```typescript
 * const pendingTasks = filterTasksByStatus(tasks, 'pending');
 * const allTasks = filterTasksByStatus(tasks, 'all');
 * ```
 */
export const filterTasksByStatus = (tasks: Task[], status: TaskStatus | 'all'): Task[] => {
  if (!tasks || tasks.length === 0) return [];
  if (status === 'all') return tasks;
  return tasks.filter(task => task.status === status);
};

/**
 * 任务过滤配置
 */
export interface TaskFilterOptions {
  /** 任务类型过滤 */
  type?: TaskType | 'all';
  /** 任务状态过滤 */
  status?: TaskStatus | 'all';
  /** 优先级过滤 */
  priority?: TaskPriority | 'all';
  /** 分配者过滤 */
  assignee?: string;
  /** 搜索关键词 */
  search?: string;
}

/**
 * 多条件过滤任务
 * 
 * @description
 * 支持同时按多个条件过滤任务列表。
 * 
 * @param tasks - 任务列表
 * @param options - 过滤选项
 * @returns 过滤后的任务列表
 * 
 * @example
 * ```typescript
 * const filtered = filterTasks(tasks, {
 *   type: 'development',
 *   status: 'pending',
 *   priority: 'high'
 * });
 * ```
 */
export const filterTasks = (tasks: Task[], options: TaskFilterOptions): Task[] => {
  if (!tasks || tasks.length === 0) return [];
  
  let result = tasks;
  
  if (options.type && options.type !== 'all') {
    result = result.filter(t => t.type === options.type);
  }
  
  if (options.status && options.status !== 'all') {
    result = result.filter(t => t.status === options.status);
  }
  
  if (options.priority && options.priority !== 'all') {
    result = result.filter(t => t.priority === options.priority);
  }
  
  if (options.assignee) {
    result = result.filter(t => t.assignee === options.assignee);
  }
  
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    result = result.filter(t => 
      t.title.toLowerCase().includes(searchLower) ||
      t.description.toLowerCase().includes(searchLower)
    );
  }
  
  return result;
};

// ============================================
// 统计工具
// ============================================

/**
 * 任务统计数据
 */
export interface TaskStats {
  /** 总任务数 */
  total: number;
  /** 待处理任务数 */
  pending: number;
  /** 已分配任务数 */
  assigned: number;
  /** 进行中任务数 */
  inProgress: number;
  /** 已完成任务数 */
  completed: number;
  /** 完成率 (0-100) */
  completionRate: number;
}

/**
 * 获取任务统计信息
 * 
 * @description
 * 计算任务列表的各项统计数据，包括总数、各状态数量和完成率。
 * 
 * @param tasks - 任务列表
 * @returns 任务统计数据
 * 
 * @example
 * ```typescript
 * const stats = getTaskStats(tasks);
 * console.log(`完成率: ${stats.completionRate}%`);
 * ```
 */
export const getTaskStats = (tasks: Task[]): TaskStats => {
  if (!tasks || tasks.length === 0) {
    return {
      total: 0,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      completionRate: 0,
    };
  }
  
  const counts = {
    pending: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
  };
  
  // 单次遍历统计
  tasks.forEach(t => {
    if (t.status in counts) {
      counts[t.status as keyof typeof counts]++;
    }
  });
  
  const total = tasks.length;
  const completed = counts.completed;
  
  return {
    total,
    pending: counts.pending,
    assigned: counts.assigned,
    inProgress: counts.in_progress,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

// ============================================
// 验证工具
// ============================================

/**
 * 任务验证结果
 */
export interface TaskValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误消息列表 */
  errors: string[];
}

/**
 * 验证任务数据
 * 
 * @description
 * 检查任务数据是否符合要求。
 * 必填字段：title, description, type, priority
 * 
 * @param data - 任务数据（部分字段）
 * @returns 验证结果
 * 
 * @example
 * ```typescript
 * const { isValid, errors } = validateTaskData({ title: '新任务' });
 * if (!isValid) {
 *   console.error('验证失败:', errors.join(', '));
 * }
 * ```
 */
export const validateTaskData = (data: Partial<Task> | null | undefined): TaskValidationResult => {
  const errors: string[] = [];
  
  if (!data) {
    return { isValid: false, errors: ['任务数据不能为空'] };
  }
  
  // 标题验证
  if (!data.title || data.title.trim().length === 0) {
    errors.push('任务标题不能为空');
  } else if (data.title.length > 200) {
    errors.push('任务标题不能超过200个字符');
  }
  
  // 描述验证
  if (!data.description || data.description.trim().length === 0) {
    errors.push('任务描述不能为空');
  }
  
  // 类型验证
  if (!data.type) {
    errors.push('任务类型不能为空');
  }
  
  // 优先级验证
  if (!data.priority) {
    errors.push('任务优先级不能为空');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 验证任务 ID 格式
 * 
 * @param taskId - 任务 ID
 * @returns 是否有效
 */
export const isValidTaskId = (taskId: string): boolean => {
  if (!taskId || typeof taskId !== 'string') return false;
  // 任务 ID 格式: task_{timestamp}_{random}
  return /^task_\d+_[a-z0-9]+$/.test(taskId);
};

// ============================================
// 导出默认对象
// ============================================

export default {
  // 类型映射
  getRoleForTaskType,
  
  // 排序
  getPriorityLevel,
  getStatusOrder,
  sortTasks,
  
  // 过滤
  filterTasksByType,
  filterTasksByStatus,
  filterTasks,
  
  // 统计
  getTaskStats,
  
  // 验证
  validateTaskData,
  isValidTaskId,
  
  // 类型导出
  TaskSortOptions: {} as TaskSortOptions,
  TaskFilterOptions: {} as TaskFilterOptions,
  TaskStats: {} as TaskStats,
  TaskValidationResult: {} as TaskValidationResult,
};