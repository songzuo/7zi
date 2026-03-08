/**
 * 任务管理 API
 * 带认证和 CSRF 保护
 */

import { NextRequest, NextResponse } from 'next/server';
import { Task, TaskStatus, TaskType } from '@/lib/types/task-types';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken, extractToken, isAdmin } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';

// In-memory storage for tasks (in production, this would be a database)
const tasks: Task[] = [
  {
    id: 'task-001',
    title: '分析市场趋势',
    description: '研究当前 AI 代理市场的趋势和竞争对手',
    type: 'research',
    priority: 'high',
    status: 'completed',
    assignee: 'agent-world-expert',
    createdBy: 'user',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-06T15:30:00Z',
    comments: [],
    history: [
      { timestamp: '2026-03-05T10:00:00Z', status: 'pending', changedBy: 'user' },
      { timestamp: '2026-03-05T10:15:00Z', status: 'assigned', changedBy: 'system', assignee: 'agent-world-expert' },
      { timestamp: '2026-03-05T10:20:00Z', status: 'in_progress', changedBy: 'agent-world-expert' },
      { timestamp: '2026-03-06T15:30:00Z', status: 'completed', changedBy: 'agent-world-expert' }
    ]
  },
  {
    id: 'task-002',
    title: '竞品调研报告',
    description: '分析主要竞争对手的产品功能和市场策略',
    type: 'research',
    priority: 'medium',
    status: 'in_progress',
    assignee: 'consultant',
    createdBy: 'user',
    createdAt: '2026-03-06T09:00:00Z',
    updatedAt: '2026-03-06T09:00:00Z',
    comments: [],
    history: [
      { timestamp: '2026-03-06T09:00:00Z', status: 'pending', changedBy: 'user' },
      { timestamp: '2026-03-06T09:05:00Z', status: 'assigned', changedBy: 'system', assignee: 'consultant' },
      { timestamp: '2026-03-06T09:10:00Z', status: 'in_progress', changedBy: 'consultant' }
    ]
  },
  {
    id: 'task-003',
    title: '系统架构评审',
    description: '评审当前系统的架构设计并提出改进建议',
    type: 'development',
    priority: 'high',
    status: 'in_progress',
    assignee: 'architect',
    createdBy: 'user',
    createdAt: '2026-03-06T11:00:00Z',
    updatedAt: '2026-03-06T11:00:00Z',
    comments: [],
    history: [
      { timestamp: '2026-03-06T11:00:00Z', status: 'pending', changedBy: 'user' },
      { timestamp: '2026-03-06T11:05:00Z', status: 'assigned', changedBy: 'system', assignee: 'architect' },
      { timestamp: '2026-03-06T11:10:00Z', status: 'in_progress', changedBy: 'architect' }
    ]
  }
];

// ============================================
// GET /api/tasks - 获取任务列表
// ============================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as TaskStatus | null;
  const type = searchParams.get('type') as TaskType | null;
  const assignee = searchParams.get('assignee');

  let filteredTasks = [...tasks];

  if (status) {
    filteredTasks = filteredTasks.filter(task => task.status === status);
  }

  if (type) {
    filteredTasks = filteredTasks.filter(task => task.type === type);
  }

  if (assignee) {
    filteredTasks = filteredTasks.filter(task => task.assignee === assignee);
  }

  return NextResponse.json(filteredTasks);
}

// ============================================
// POST /api/tasks - 创建任务
// ============================================

export async function POST(request: NextRequest) {
  try {
    // CSRF 保护检查
    const csrfMiddleware = createCsrfMiddleware();
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
    
    // 输入验证
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { error: 'Task title is required and must be a string' },
        { status: 400 }
      );
    }

    const newTask: Task = {
      id: `task-${uuidv4().split('-')[0]}`,
      title: body.title,
      description: body.description || '',
      type: body.type || 'other',
      priority: body.priority || 'medium',
      status: 'pending',
      assignee: body.assignee || undefined,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
      history: [{
        timestamp: new Date().toISOString(),
        status: 'pending',
        changedBy: userId
      }]
    };

    tasks.push(newTask);

    console.log('[Audit] Task created:', {
      taskId: newTask.id,
      createdBy: userId,
      userRole,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

// ============================================
// PUT /api/tasks - 更新任务
// ============================================

export async function PUT(request: NextRequest) {
  try {
    // CSRF 保护检查
    const csrfMiddleware = createCsrfMiddleware();
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
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
      userId = payload.sub;
      userRole = payload.role;
    }

    const body = await request.json();
    const { id, status, assignee, comment } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = tasks[taskIndex];
    const oldStatus = task.status;
    const oldAssignee = task.assignee;

    // 更新任务
    if (status) {
      task.status = status;
      task.history.push({
        timestamp: new Date().toISOString(),
        status: status,
        changedBy: userId,
        assignee: assignee
      });
    }

    if (assignee !== undefined) {
      task.assignee = assignee;
      if (!status) {
        task.history.push({
          timestamp: new Date().toISOString(),
          status: task.status,
          changedBy: userId,
          assignee: assignee
        });
      }
    }

    if (comment) {
      task.comments.push({
        id: `comment-${uuidv4().split('-')[0]}`,
        content: comment,
        author: userId,
        timestamp: new Date().toISOString()
      });
    }

    task.updatedAt = new Date().toISOString();

    tasks[taskIndex] = task;

    console.log('[Audit] Task updated:', {
      taskId: task.id,
      updatedBy: userId,
      userRole,
      changes: { status, assignee, comment: !!comment },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

// ============================================
// DELETE /api/tasks/:id - 删除任务 (需要管理员)
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    // CSRF 保护检查
    const csrfMiddleware = createCsrfMiddleware();
    const csrfResult = await csrfMiddleware(request);
    if (csrfResult) {
      return csrfResult;
    }

    // 认证检查
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // 管理员权限检查
    if (!isAdmin(payload)) {
      return NextResponse.json(
        { error: 'Admin access required to delete tasks' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const deletedTask = tasks[taskIndex];
    tasks.splice(taskIndex, 1);

    console.log('[Audit] Task deleted by admin:', {
      taskId: deletedTask.id,
      deletedBy: payload.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
      task: deletedTask,
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}
