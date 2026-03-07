/**
 * 智能体数据 API
 * Agent Data API - 提供智能体访问平台数据的接口
 * 
 * @openapi
 * /agent/data/tasks:
 *   get:
 *     summary: 获取任务列表
 *     tags:
 *       - Agent Data
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 任务状态筛选
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: 优先级筛选
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *         description: 负责人筛选
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功返回任务列表
 * 
 * /agent/data/users:
 *   get:
 *     summary: 获取用户列表
 *     tags:
 *       - Agent Data
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回用户列表
 * 
 * /agent/data/activities:
 *   get:
 *     summary: 获取活动日志
 *     tags:
 *       - Agent Data
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回活动日志
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth, withPermission, AgentContext, createErrorResponse, generateRequestId } from '@/lib/agents/middleware';
import { AgentApiResponse, DataType, DataAction } from '@/lib/agent/types';
import { getAllTasks, getTasksByAssignee, getTasksByStatus } from '@/lib/tasks/repository';
import { getAllUsers } from '@/lib/users/repository';
import { getDatabaseAsync } from '@/lib/db';

/**
 * GET /api/agent/data/[type]
 * 获取数据
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  return withAgentAuth(request, (req, context) => handleDataRequest(req, context, type, 'GET'));
}

/**
 * POST /api/agent/data/[type]
 * 创建数据
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  return withAgentAuth(request, (req, context) => handleDataRequest(req, context, type, 'POST'));
}

/**
 * PUT /api/agent/data/[type]
 * 更新数据
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  return withPermission('write:tasks')(request, (req, context) => 
    handleDataRequest(req, context, type, 'PUT')
  );
}

/**
 * DELETE /api/agent/data/[type]
 * 删除数据
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  return withPermission('delete:tasks')(request, (req, context) => 
    handleDataRequest(req, context, type, 'DELETE')
  );
}

/**
 * 处理数据请求
 */
async function handleDataRequest(
  request: NextRequest,
  context: AgentContext,
  dataType: string,
  method: string
): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    switch (dataType) {
      case 'tasks':
        return handleTasksRequest(request, context, method, searchParams);
      
      case 'users':
        return handleUsersRequest(request, context, method);
      
      case 'activities':
        return handleActivitiesRequest(request, context, method, searchParams);
      
      case 'dashboard':
        return handleDashboardRequest(request, context, method);
      
      case 'metrics':
        return handleMetricsRequest(request, context, method, searchParams);
      
      default:
        return createErrorResponse(
          `Unknown data type: ${dataType}`,
          'UNKNOWN_DATA_TYPE',
          400,
          context.requestId
        );
    }
  } catch (error) {
    console.error('Data request error:', error);
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500,
      context.requestId
    );
  }
}

/**
 * 处理任务请求
 */
async function handleTasksRequest(
  request: NextRequest,
  context: AgentContext,
  method: string,
  searchParams: URLSearchParams
): Promise<NextResponse> {
  switch (method) {
    case 'GET': {
      const status = searchParams.get('status');
      const assignee = searchParams.get('assignee');
      const priority = searchParams.get('priority');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');

      let tasks;
      if (assignee) {
        tasks = await getTasksByAssignee(assignee);
      } else if (status) {
        tasks = await getTasksByStatus(status);
      } else {
        tasks = await getAllTasks();
      }

      // 应用筛选
      if (priority) {
        tasks = tasks.filter((t) => t.priority === priority);
      }

      // 分页
      const total = tasks.length;
      const offset = (page - 1) * limit;
      const paginatedTasks = tasks.slice(offset, offset + limit);

      const response: AgentApiResponse = {
        success: true,
        data: {
          tasks: paginatedTasks,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        },
      };

      return NextResponse.json(response);
    }

    case 'POST': {
      // 需要写权限
      if (!context.permissions.includes('write:tasks')) {
        return createErrorResponse('Insufficient permissions', 'FORBIDDEN', 403, context.requestId);
      }

      const body = await request.json();
      const { createTask } = await import('@/lib/tasks/repository');
      const task = await createTask({
        title: body.title,
        description: body.description,
        status: body.status || 'todo',
        priority: body.priority || 'medium',
        assignee: body.assignee,
        tags: body.tags || [],
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        createdBy: context.agentId,
      });

      const response: AgentApiResponse = {
        success: true,
        data: { task },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        },
      };

      return NextResponse.json(response, { status: 201 });
    }

    default:
      return createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405, context.requestId);
  }
}

/**
 * 处理用户请求
 */
async function handleUsersRequest(
  request: NextRequest,
  context: AgentContext,
  method: string
): Promise<NextResponse> {
  if (method !== 'GET') {
    return createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405, context.requestId);
  }

  const users = await getAllUsers();

  const response: AgentApiResponse = {
    success: true,
    data: { users },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
    },
  };

  return NextResponse.json(response);
}

/**
 * 处理活动日志请求
 */
async function handleActivitiesRequest(
  request: NextRequest,
  context: AgentContext,
  method: string,
  searchParams: URLSearchParams
): Promise<NextResponse> {
  if (method !== 'GET') {
    return createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405, context.requestId);
  }

  const limit = parseInt(searchParams.get('limit') || '100');
  const agentId = searchParams.get('agentId');

  const db = await getDatabaseAsync();
  let query = 'SELECT * FROM activities';
  const params: string[] = [];

  if (agentId) {
    query += ' WHERE agent_id = ?';
    params.push(agentId);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(String(limit));

  const stmt = db.prepare(query);
  const activities = stmt.all(...params);

  const response: AgentApiResponse = {
    success: true,
    data: { activities },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
    },
  };

  return NextResponse.json(response);
}

/**
 * 处理仪表板数据请求
 */
async function handleDashboardRequest(
  request: NextRequest,
  context: AgentContext,
  method: string
): Promise<NextResponse> {
  if (method !== 'GET') {
    return createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405, context.requestId);
  }

  const tasks = await getAllTasks();
  const users = await getAllUsers();

  const stats = {
    totalTasks: tasks.length,
    todoTasks: tasks.filter((t) => t.status === 'todo').length,
    inProgressTasks: tasks.filter((t) => t.status === 'in_progress').length,
    completedTasks: tasks.filter((t) => t.status === 'completed').length,
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.role !== 'guest').length,
  };

  const response: AgentApiResponse = {
    success: true,
    data: { dashboard: stats },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
    },
  };

  return NextResponse.json(response);
}

/**
 * 处理指标数据请求
 */
async function handleMetricsRequest(
  request: NextRequest,
  context: AgentContext,
  method: string,
  searchParams: URLSearchParams
): Promise<NextResponse> {
  if (method !== 'GET') {
    return createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405, context.requestId);
  }

  // 检查权限
  if (!context.permissions.includes('access:reports')) {
    return createErrorResponse('Insufficient permissions', 'FORBIDDEN', 403, context.requestId);
  }

  const period = searchParams.get('period') || '7d';

  // 简单的指标计算
  const tasks = await getAllTasks();
  const now = new Date();
  const periodMs: Record<string, number> = {
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  const cutoff = new Date(now.getTime() - (periodMs[period] || periodMs['7d']));
  const recentTasks = tasks.filter((t) => new Date(t.createdAt) >= cutoff);

  const metrics = {
    period,
    tasksCreated: recentTasks.length,
    tasksCompleted: recentTasks.filter((t) => t.status === 'completed').length,
    completionRate: recentTasks.length > 0 
      ? (recentTasks.filter((t) => t.status === 'completed').length / recentTasks.length * 100).toFixed(2)
      : 0,
    averageCompletionTime: 0, // TODO: 计算平均完成时间
  };

  const response: AgentApiResponse = {
    success: true,
    data: { metrics },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
    },
  };

  return NextResponse.json(response);
}