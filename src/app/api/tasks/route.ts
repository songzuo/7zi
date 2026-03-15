/**
 * 任务管理 API
 * 提供任务的 CRUD 操作，支持认证和 CSRF 保护
 * 
 * 优化特性：
 * - 使用 IndexedStore 进行 O(1) 索引查询
 * - 支持分页，减少大数据集传输
 * - 集成缓存，减少重复查询
 * - 缓存失效策略
 * 
 * @module api/tasks
 * @description 任务管理端点，支持创建、查询、更新和删除任务
 * 使用文件持久化存储，数据不会因服务器重启丢失
 * 
 * @example
 * // 获取任务列表
 * GET /api/tasks?status=pending&type=development
 * 
 * // 分页查询
 * GET /api/tasks?page=1&limit=20&sortBy=priority&sortOrder=desc
 * 
 * // 创建新任务
 * POST /api/tasks
 * {
 *   "title": "新任务",
 *   "description": "任务描述",
 *   "type": "development",
 *   "priority": "high"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { Task, TaskStatus, TaskType } from '@/lib/types/task-types';
import { verifyToken, extractToken, isAdmin } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';
import {
  validationError,
  notFoundError,
  authError,
  forbiddenError,
  successResponse,
} from '@/lib/middleware';
import { withPerformanceTracking } from '@/lib/middleware/performance-middleware';
// 使用索引优化存储
import {
  getTasks,
  getTaskById,
  createTask as dataCreateTask,
  updateTask as dataUpdateTask,
  deleteTask as dataDeleteTask,
  queryTasks,
  paginateTasks,
} from '@/lib/data/tasks-indexed';
import {
  cachedQuery,
  generateCacheKey,
  CacheInvalidator,
} from '@/lib/data/cached-api';

// 模块级别创建 CSRF 中间件（复用实例）
const csrfMiddleware = createCsrfMiddleware();

// 缓存配置
const TASKS_CACHE_TTL = '2m'; // 2 分钟缓存
const TASKS_CACHE_TAGS = ['tasks'];

/**
 * 任务查询参数
 * @typedef {Object} TaskQueryParams
 * @property {TaskStatus} [status] - 按状态过滤
 * @property {TaskType} [type] - 按类型过滤
 * @property {string} [assignee] - 按分配人过滤
 * @property {string} [projectId] - 按项目过滤
 * @property {'low'|'medium'|'high'} [priority] - 按优先级过滤
 * @property {number} [page] - 分页页码
 * @property {number} [limit] - 每页数量（最大100）
 * @property {'createdAt'|'updatedAt'|'priority'} [sortBy] - 排序字段
 * @property {'asc'|'desc'} [sortOrder] - 排序方向
 */

/**
 * 创建任务请求体
 * @typedef {Object} CreateTaskBody
 * @property {string} title - 任务标题（必填）
 * @property {string} [description] - 任务描述
 * @property {TaskType} [type='other'] - 任务类型
 * @property {'low'|'medium'|'high'} [priority='medium'] - 优先级
 * @property {string} [assignee] - 分配给的AI成员ID
 */

/**
 * 更新任务请求体
 * @typedef {Object} UpdateTaskBody
 * @property {string} id - 任务ID（必填）
 * @property {TaskStatus} [status] - 新状态
 * @property {string} [assignee] - 新分配人
 * @property {string} [comment] - 添加评论
 */

/**
 * 任务列表响应
 * @typedef {Task[]} TaskListResponse
 */

/**
 * 任务创建响应
 * @typedef {Task} TaskCreateResponse
 */

/**
 * 错误响应
 * @typedef {Object} ErrorResponse
 * @property {string} error - 错误类型
 * @property {string} [message] - 错误详情
 */

// ============================================
// GET /api/tasks - 获取任务列表（支持分页）
// ============================================

export async function GET(request: NextRequest) {
  apiLogger.info('GET handler called', { path: request.nextUrl.pathname });
  const { searchParams } = new URL(request.url);
  
  // 解析参数
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100); // 最大 100
  const status = searchParams.get('status') as TaskStatus | null;
  const type = searchParams.get('type') as TaskType | null;
  const assignee = searchParams.get('assignee');
  const projectId = searchParams.get('projectId');
  const priority = searchParams.get('priority') as 'low' | 'medium' | 'high' | null;
  const sortBy = (searchParams.get('sortBy') || 'createdAt') as 'createdAt' | 'updatedAt' | 'priority';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const useCache = searchParams.get('cache') !== 'false';

  // 检查是否需要分页
  const needsPagination = searchParams.has('page') || searchParams.has('limit');

  // 简单查询（无分页）- 兼容旧 API
  if (!needsPagination && !sortBy && !sortOrder) {
    const filters: Parameters<typeof queryTasks>[0] = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (assignee) filters.assignee = assignee;
    if (projectId) filters.projectId = projectId;
    if (priority) filters.priority = priority;

    // 如果没有任何过滤，返回全部
    if (Object.keys(filters).length === 0) {
      // 使用缓存
      if (useCache) {
        const cacheKey = generateCacheKey('tasks:all', { status, type, assignee });
        const cached = await cachedQuery(
          cacheKey,
          () => Promise.resolve(getTasks()),
          { ttl: TASKS_CACHE_TTL, tags: TASKS_CACHE_TAGS }
        );
        return successResponse(cached);
      }
      return successResponse(getTasks());
    }

    // 使用索引查询
    const tasks = queryTasks(filters);
    return successResponse(tasks);
  }

  // 分页查询
  const result = paginateTasks({
    page,
    limit,
    status: status || undefined,
    type: type || undefined,
    assignee: assignee || undefined,
    projectId: projectId || undefined,
    priority: priority || undefined,
    sortBy,
    sortOrder,
  });

  return successResponse({
    data: result.data,
    pagination: result.pagination,
  });
}

// ============================================
// POST /api/tasks - 创建任务
// ============================================

export async function POST(request: NextRequest) {
  // CSRF 保护检查
  const csrfResult = await csrfMiddleware(request);
  if (csrfResult) {
    return csrfResult;
  }

  // 认证检查 (可选)
  const token = extractToken(request);
  let userId = 'anonymous';
  let userRole = 'user';
  
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      userId = payload.sub;
      userRole = payload.role;
    }
  }

  const body = await request.json();
  
  // 输入验证
  if (!body.title || typeof body.title !== 'string') {
    return validationError('Task title is required and must be a string', 'title', request);
  }

  // 创建任务
  const newTask = dataCreateTask({
    title: body.title,
    description: body.description || '',
    type: body.type || 'other',
    priority: body.priority || 'medium',
    status: 'pending',
    assignee: body.assignee,
    createdBy: userId as 'user' | 'ai',
    projectId: body.projectId
  });

  // 失效缓存
  await CacheInvalidator.invalidateTasks();

  apiLogger.audit('Task created', {
    taskId: newTask.id,
    createdBy: userId,
    userRole,
  });

  return NextResponse.json(newTask, { status: 201 });
}

// ============================================
// PUT /api/tasks - 更新任务
// ============================================

export async function PUT(request: NextRequest) {
  // CSRF 保护检查
  const csrfResult = await csrfMiddleware(request);
  if (csrfResult) {
    return csrfResult;
  }

  // 认证检查
  const token = extractToken(request);
  let userId = 'anonymous';
  let userRole = 'user';
  
  if (token) {
    const payload = await verifyToken(token);
    if (!payload) {
      return authError('Invalid authentication token', request);
    }
    userId = payload.sub;
    userRole = payload.role;
  }

  const body = await request.json();
  const { id, status, assignee, comment } = body;

  if (!id) {
    return validationError('Task ID is required', 'id', request);
  }

  // 检查任务是否存在
  const existingTask = getTaskById(id);
  if (!existingTask) {
    return notFoundError('Task', id, request);
  }

  // 构建更新数据
  const updates: Partial<Task> = {};

  if (status) {
    updates.status = status;
    updates.history = [
      ...existingTask.history,
      {
        timestamp: new Date().toISOString(),
        status: status,
        changedBy: userId,
        assignee: assignee
      }
    ];
  }

  if (assignee !== undefined) {
    updates.assignee = assignee;
    if (!status) {
      updates.history = [
        ...existingTask.history,
        {
          timestamp: new Date().toISOString(),
          status: existingTask.status,
          changedBy: userId,
          assignee: assignee
        }
      ];
    }
  }

  if (comment) {
    updates.comments = [
      ...existingTask.comments,
      {
        id: `comment-${Date.now()}`,
        content: comment,
        author: userId,
        timestamp: new Date().toISOString()
      }
    ];
  }

  // 更新任务
  const updatedTask = dataUpdateTask(id, updates);

  if (!updatedTask) {
    return notFoundError('Task', id, request);
  }

  // 失效缓存
  await CacheInvalidator.invalidateTasks();

  apiLogger.audit('Task updated', {
    taskId: updatedTask.id,
    updatedBy: userId,
    userRole,
    changes: { status, assignee, comment: !!comment },
  });

  return successResponse(updatedTask);
}

// ============================================
// DELETE /api/tasks/:id - 删除任务 (需要管理员)
// ============================================

export async function DELETE(request: NextRequest) {
  // CSRF 保护检查
  const csrfResult = await csrfMiddleware(request);
  if (csrfResult) {
    return csrfResult;
  }

  // 认证检查
  const token = extractToken(request);
  if (!token) {
    return authError('Authentication required', request);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return authError('Invalid or expired token', request);
  }

  // 管理员权限检查
  if (!isAdmin(payload)) {
    return forbiddenError('Admin access required to delete tasks', request);
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('id');

  if (!taskId) {
    return validationError('Task ID is required', 'id', request);
  }

  // 检查任务是否存在
  const existingTask = getTaskById(taskId);
  if (!existingTask) {
    return notFoundError('Task', taskId, request);
  }

  // 删除任务
  const deletedTask = dataDeleteTask(taskId);

  if (!deletedTask) {
    return notFoundError('Task', taskId, request);
  }

  // 失效缓存
  await CacheInvalidator.invalidateTasks();

  apiLogger.audit('Task deleted by admin', {
    taskId: deletedTask.id,
    deletedBy: payload.email,
  });

  return successResponse({
    success: true,
    message: 'Task deleted successfully',
    task: deletedTask,
  });
}
