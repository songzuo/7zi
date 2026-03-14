/**
 * 任务管理 API
 * 提供任务的 CRUD 操作，支持认证和 CSRF 保护
 * 
 * @module api/tasks
 * @description 任务管理端点，支持创建、查询、更新和删除任务
 * 使用文件持久化存储，数据不会因服务器重启丢失
 * 
 * @example
 * // 获取任务列表
 * GET /api/tasks?status=pending&type=development
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
// 使用持久化存储
import { 
  getTasks, 
  getTaskById, 
  createTask as dataCreateTask, 
  updateTask as dataUpdateTask,
  deleteTask as dataDeleteTask
} from '@/lib/data/tasks';

// 模块级别创建 CSRF 中间件（复用实例）
const csrfMiddleware = createCsrfMiddleware();

/**
 * 任务查询参数
 * @typedef {Object} TaskQueryParams
 * @property {TaskStatus} [status] - 按状态过滤
 * @property {TaskType} [type] - 按类型过滤
 * @property {string} [assignee] - 按分配人过滤
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
// GET /api/tasks - 获取任务列表
// ============================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as TaskStatus | null;
  const type = searchParams.get('type') as TaskType | null;
  const assignee = searchParams.get('assignee');

  // 使用持久化存储获取任务
  let filteredTasks = getTasks();

  if (status) {
    filteredTasks = filteredTasks.filter(task => task.status === status);
  }

  if (type) {
    filteredTasks = filteredTasks.filter(task => task.type === type);
  }

  if (assignee) {
    filteredTasks = filteredTasks.filter(task => task.assignee === assignee);
  }

  return successResponse(filteredTasks);
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

  // 认证检查 (可选 - 根据需求决定是否要求登录)
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
  
  // 输入验证 - 使用统一错误处理
  if (!body.title || typeof body.title !== 'string') {
    return validationError('Task title is required and must be a string', 'title', request);
  }

  // 使用持久化存储创建任务
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

  // 使用持久化存储更新任务
  const updatedTask = dataUpdateTask(id, updates);

  if (!updatedTask) {
    return notFoundError('Task', id, request);
  }

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

  // 使用持久化存储删除任务
  const deletedTask = dataDeleteTask(taskId);

  if (!deletedTask) {
    return notFoundError('Task', taskId, request);
  }

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
