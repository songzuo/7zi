/**
 * 任务管理系统类型定义
 * @module lib/tasks/types
 * @description 定义任务优先级、状态、标签和任务实体的核心类型
 */

/**
 * 任务优先级类型
 * @typedef {'high' | 'medium' | 'low'} TaskPriority
 */
export type TaskPriority = 'high' | 'medium' | 'low';

/**
 * 任务状态类型
 * @typedef {'todo' | 'in_progress' | 'review' | 'done'} TaskStatus
 */
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

// 优先级常量（用于测试和比较）
export const TaskPriority = {
  HIGH: 'high' as const,
  MEDIUM: 'medium' as const,
  LOW: 'low' as const,
};

// 状态常量（用于测试和比较）
export const TaskStatus = {
  TODO: 'todo' as const,
  IN_PROGRESS: 'in_progress' as const,
  REVIEW: 'review' as const,
  DONE: 'done' as const,
};

/**
 * 任务标签接口
 * @interface TaskTag
 * @property {string} id - 标签唯一标识
 * @property {string} name - 标签名称
 * @property {string} color - Tailwind 颜色类名（如 'blue', 'red', 'green'）
 */
export interface TaskTag {
  id: string;
  name: string;
  color: string; // Tailwind color class, e.g., 'blue', 'red', 'green'
}

/**
 * 任务实体接口
 * @interface Task
 * @property {string} id - 任务唯一标识
 * @property {string} title - 任务标题
 * @property {string} [description] - 任务描述
 * @property {TaskPriority} priority - 任务优先级
 * @property {TaskStatus} status - 任务状态
 * @property {TaskTag[]} tags - 任务标签列表
 * @property {string} [assignee] - 负责人（子代理 ID）
 * @property {Date} [dueDate] - 截止日期
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 * @property {Date} [completedAt] - 完成时间
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  tags: TaskTag[];
  assignee?: string; // 子代理 ID
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * 任务筛选条件接口
 * @interface TaskFilter
 * @property {TaskPriority} [priority] - 按优先级筛选
 * @property {TaskStatus} [status] - 按状态筛选
 * @property {string[]} [tags] - 按标签 ID 筛选
 * @property {string} [assignee] - 按负责人筛选
 * @property {string} [search] - 搜索关键词
 * @property {string} [dueDateFrom] - 截止日期起始（ISO string）
 * @property {string} [dueDateTo] - 截止日期结束（ISO string）
 * @property {string} [createdFrom] - 创建日期起始（ISO string）
 * @property {string} [createdTo] - 创建日期结束（ISO string）
 * @property {string} [completedFrom] - 完成日期起始（ISO string）
 * @property {string} [completedTo] - 完成日期结束（ISO string）
 * @property {string} [sortBy] - 排序字段
 * @property {'asc' | 'desc'} [sortOrder] - 排序方向
 */
export interface TaskFilter {
  priority?: TaskPriority;
  status?: TaskStatus;
  tags?: string[]; // Tag IDs
  assignee?: string;
  search?: string;
  // 高级筛选 - 日期范围
  dueDateFrom?: string;
  dueDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  completedFrom?: string;
  completedTo?: string;
  // 排序
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 任务统计信息接口
 * @interface TaskStats
 * @property {number} total - 总任务数
 * @property {number} done - 已完成任务数
 * @property {number} inProgress - 进行中任务数
 * @property {number} todo - 待办任务数
 * @property {number} review - 评审中任务数
 * @property {number} overdue - 逾期任务数
 * @property {number} dueSoon - 即将到期任务数
 * @property {number} completionRate - 完成率（0-100）
 * @property {Object} byPriority - 按优先级分组统计
 */
export interface TaskStats {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  review: number;
  overdue: number;
  dueSoon: number;
  completionRate: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

// 预定义标签
export const DEFAULT_TAGS: TaskTag[] = [
  { id: 'bug', name: 'Bug', color: 'red' },
  { id: 'feature', name: 'Feature', color: 'blue' },
  { id: 'enhancement', name: 'Enhancement', color: 'purple' },
  { id: 'documentation', name: 'Docs', color: 'green' },
  { id: 'urgent', name: 'Urgent', color: 'orange' },
  { id: 'ai-agent', name: 'AI Agent', color: 'pink' },
];

// 优先级配置
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  high: { label: '高优先级', color: 'red', icon: '🔴' },
  medium: { label: '中优先级', color: 'yellow', icon: '🟡' },
  low: { label: '低优先级', color: 'green', icon: '🟢' },
};

// 状态配置
export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: '待办', color: 'gray' },
  in_progress: { label: '进行中', color: 'blue' },
  review: { label: '评审中', color: 'purple' },
  done: { label: '已完成', color: 'green' },
};
