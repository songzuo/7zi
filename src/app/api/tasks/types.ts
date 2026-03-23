/**
 * Tasks API Types
 * 任务管理 API 的类型定义
 */

/**
 * 任务优先级
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * 任务模型
 */
export interface Task {
  /** 任务唯一标识符 */
  id: string;
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description?: string;
  /** 任务优先级 */
  priority: TaskPriority;
  /** 任务状态 */
  status: TaskStatus;
  /** 截止日期（可选） */
  dueDate?: string;
  /** 创建者用户 ID */
  createdBy: string;
  /** 分配给的用户 ID（可选） */
  assignedTo?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 创建任务请求体
 */
export interface CreateTaskRequest {
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description?: string;
  /** 任务优先级 */
  priority?: TaskPriority;
  /** 任务状态 */
  status?: TaskStatus;
  /** 截止日期（ISO 8601） */
  dueDate?: string;
  /** 分配给的用户 ID */
  assignedTo?: string;
}

/**
 * 更新任务请求体
 */
export interface UpdateTaskRequest {
  /** 任务标题 */
  title?: string;
  /** 任务描述 */
  description?: string;
  /** 任务优先级 */
  priority?: TaskPriority;
  /** 任务状态 */
  status?: TaskStatus;
  /** 截止日期（ISO 8601） */
  dueDate?: string;
  /** 分配给的用户 ID */
  assignedTo?: string;
}

/**
 * 分页查询参数
 */
export interface TaskQueryParams {
  /** 页码（从 1 开始） */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 按状态筛选 */
  status?: TaskStatus;
  /** 按优先级筛选 */
  priority?: TaskPriority;
  /** 按创建者筛选 */
  createdBy?: string;
  /** 按分配给的用户筛选 */
  assignedTo?: string;
  /** 搜索关键词（匹配标题和描述） */
  search?: string;
  /** 排序字段 */
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 总数量 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNextPage: boolean;
  /** 是否有上一页 */
  hasPreviousPage: boolean;
}

/**
 * API 响应基础类型
 */
export interface ApiResponse<T = unknown> {
  /** 请求是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  code?: string;
  /** 验证错误详情 */
  errors?: string[];
}
