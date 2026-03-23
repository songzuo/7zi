/**
 * Tasks API Route
 * 任务管理 API 端点 (PROTECTED)
 * 支持任务的 CRUD 操作、分页、筛选和排序
 *
 * @module tasks-api
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, authenticateRequest, RATE_LIMIT_CONFIG } from '@/middleware/auth';
import { getDatabase } from '@/lib/db';
import logger from '@/lib/logger';
import { createAppError, ErrorCodes, formatErrorMessage } from '@/lib/errors';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * 初始化 tasks 表
 */
function ensureTasksTable(): void {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      due_date TEXT,
      created_by TEXT NOT NULL,
      assigned_to TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  // 创建索引以提高查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
  `);
}

/**
 * 将数据库行转换为 Task 对象
 */
function rowToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    dueDate: row.due_date,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * 验证任务优先级
 */
function isValidPriority(priority: string): priority is TaskPriority {
  return ['low', 'medium', 'high', 'urgent'].includes(priority);
}

/**
 * 验证任务状态
 */
function isValidStatus(status: string): status is TaskStatus {
  return ['pending', 'in_progress', 'completed', 'cancelled'].includes(status);
}

/**
 * 验证创建任务请求
 */
function validateCreateTaskRequest(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }

  if (data.title && data.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }

  if (data.description && data.description.length > 5000) {
    errors.push('Description must be less than 5000 characters');
  }

  if (data.priority && !isValidPriority(data.priority)) {
    errors.push('Invalid priority value');
  }

  if (data.status && !isValidStatus(data.status)) {
    errors.push('Invalid status value');
  }

  if (data.dueDate && isNaN(Date.parse(data.dueDate))) {
    errors.push('Invalid dueDate format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证更新任务请求
 */
function validateUpdateTaskRequest(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title must be a non-empty string');
    } else if (data.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }
  }

  if (data.description !== undefined && data.description.length > 5000) {
    errors.push('Description must be less than 5000 characters');
  }

  if (data.priority !== undefined && !isValidPriority(data.priority)) {
    errors.push('Invalid priority value');
  }

  if (data.status !== undefined && !isValidStatus(data.status)) {
    errors.push('Invalid status value');
  }

  if (data.dueDate !== undefined && data.dueDate !== null && isNaN(Date.parse(data.dueDate))) {
    errors.push('Invalid dueDate format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Query Builders
// ============================================================================

/**
 * 构建查询条件和参数
 */
function buildQuery(params: TaskQueryParams): {
  where: string;
  orderBy: string;
  queryParams: any[];
} {
  const conditions: string[] = [];
  const queryParams: any[] = [];

  // 状态筛选
  if (params.status) {
    conditions.push('status = ?');
    queryParams.push(params.status);
  }

  // 优先级筛选
  if (params.priority) {
    conditions.push('priority = ?');
    queryParams.push(params.priority);
  }

  // 创建者筛选
  if (params.createdBy) {
    conditions.push('created_by = ?');
    queryParams.push(params.createdBy);
  }

  // 分配给筛选
  if (params.assignedTo) {
    conditions.push('assigned_to = ?');
    queryParams.push(params.assignedTo);
  }

  // 搜索关键词
  if (params.search) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm);
  }

  // 构建 WHERE 子句
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 排序字段映射
  const sortFieldMap = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    dueDate: 'due_date',
    priority: 'priority',
    title: 'title',
  };

  const sortField = sortFieldMap[params.sortBy || 'createdAt'];
  const sortOrder = params.sortOrder || 'desc';

  // 优先级的自定义排序（low < medium < high < urgent）
  let orderBy = '';
  if (params.sortBy === 'priority') {
    orderBy = `ORDER BY CASE priority
      WHEN 'low' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'high' THEN 3
      WHEN 'urgent' THEN 4
    END ${sortOrder}`;
  } else {
    orderBy = `ORDER BY ${sortField} ${sortOrder}`;
  }

  return { where, orderBy, queryParams };
}

// ============================================================================
// API Handlers
// ============================================================================

/**
 * GET /api/tasks - 获取任务列表（分页、筛选、排序）
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      // 获取用户信息（可选，用于权限控制）
      const auth = await authenticateRequest(request);
      const userId = auth.success ? auth.userId : undefined;

      ensureTasksTable();

      const db = getDatabase();
      const searchParams = request.nextUrl.searchParams;

      // 解析查询参数
      const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
      const offset = (page - 1) * limit;

      const params: TaskQueryParams = {
        page,
        limit,
        status: searchParams.get('status') as TaskStatus | undefined,
        priority: searchParams.get('priority') as TaskPriority | undefined,
        createdBy: searchParams.get('createdBy') || undefined,
        assignedTo: searchParams.get('assignedTo') || undefined,
        search: searchParams.get('search') || undefined,
        sortBy: searchParams.get('sortBy') as any || 'createdAt',
        sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc',
      };

      // 构建查询
      const { where, orderBy, queryParams } = buildQuery(params);

      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM tasks ${where}`;
      const countResult = db.prepare(countQuery).get(...queryParams) as { total: number };
      const total = countResult.total;

      // 获取数据
      const dataQuery = `
        SELECT * FROM tasks
        ${where}
        ${orderBy}
        LIMIT ? OFFSET ?
      `;
      const rows = db.prepare(dataQuery).all(...queryParams, limit, offset);

      const items = rows.map(rowToTask);
      const totalPages = Math.ceil(total / limit);

      return NextResponse.json({
        success: true,
        data: {
          items,
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        } as PaginatedResponse<Task>,
      });
    } catch (error) {
      logger.error('Failed to fetch tasks', error);
      return NextResponse.json(
        {
          success: false,
          error: formatErrorMessage(error),
          code: getErrorCode(error),
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/tasks - 创建新任务
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      // 获取用户信息
      const auth = await authenticateRequest(request);
      if (!auth.success || !auth.userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const userId = auth.userId;

      ensureTasksTable();

      const body = await request.json() as CreateTaskRequest;

      // 验证输入
      const validation = validateCreateTaskRequest(body);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            errors: validation.errors,
          },
          { status: 400 }
        );
      }

      const db = getDatabase();
      const now = new Date().toISOString();

      // 生成唯一 ID
      const id = crypto.randomUUID();

      // 插入任务
      const insertQuery = `
        INSERT INTO tasks (
          id, title, description, priority, status, due_date,
          created_by, assigned_to, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.prepare(insertQuery).run(
        id,
        body.title.trim(),
        body.description?.trim() || null,
        body.priority || 'medium',
        body.status || 'pending',
        body.dueDate || null,
        userId, // Use userId from authentication
        body.assignedTo || null,
        now,
        now
      );

      // 获取创建的任务
      const task = rowToTask(
        db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
      );

      logger.info(`Task created: ${id}`, { taskId: id, userId });

      return NextResponse.json(
        {
          success: true,
          data: task,
        },
        { status: 201 }
      );
    } catch (error) {
      logger.error('Failed to create task', error);
      return NextResponse.json(
        {
          success: false,
          error: formatErrorMessage(error),
          code: getErrorCode(error),
        },
        { status: 500 }
      );
    }
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 获取错误代码
 */
function getErrorCode(error: unknown): string {
  const appError = error as { code?: string };
  return appError.code || ErrorCodes.SERVER_ERROR;
}
