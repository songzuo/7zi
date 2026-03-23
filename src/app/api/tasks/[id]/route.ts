/**
 * Task Detail API Route
 * 单个任务的 API 端点 (PROTECTED)
 * 支持获取详情、更新和删除任务
 *
 * @module task-detail-api
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, authenticateRequest } from '@/middleware/auth';
import { getDatabase } from '@/lib/db';
import logger from '@/lib/logger';
import { ErrorCodes, formatErrorMessage,  } from '@/lib/errors';
import type { Task, UpdateTaskRequest } from '../route';

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * 确保 tasks 表存在
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
}

/**
 * 将数据库行转换为 Task 对象
 */
function rowToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
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
function isValidPriority(priority: string): boolean {
  return ['low', 'medium', 'high', 'urgent'].includes(priority);
}

/**
 * 验证任务状态
 */
function isValidStatus(status: string): boolean {
  return ['pending', 'in_progress', 'completed', 'cancelled'].includes(status);
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
// API Handlers
// ============================================================================

/**
 * GET /api/tasks/[id] - 获取任务详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async () => {
    try {
      const auth = await authenticateRequest(request);

      ensureTasksTable();

      const db = getDatabase();
      const { id } = await params;

      // 查询任务
      const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

      if (!row) {
        return NextResponse.json(
          {
            success: false,
            error: 'Task not found',
            code: ErrorCodes.NOT_FOUND,
          },
          { status: 404 }
        );
      }

      const task = rowToTask(row);

      return NextResponse.json({
        success: true,
        data: task,
      });
    } catch (error) {
      logger.error('Failed to fetch task', error);
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
 * PUT /api/tasks/[id] - 更新任务
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async () => {
    try {
      const auth = await authenticateRequest(request);
      if (!auth.success || !auth.userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const userId = auth.userId;

      ensureTasksTable();

      const db = getDatabase();
      const { id } = await params;

      // 检查任务是否存在
      const existingRow = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      if (!existingRow) {
        return NextResponse.json(
          {
            success: false,
            error: 'Task not found',
            code: ErrorCodes.NOT_FOUND,
          },
          { status: 404 }
        );
      }

      const body = await request.json() as UpdateTaskRequest;

      // 验证输入
      const validation = validateUpdateTaskRequest(body);
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

      const now = new Date().toISOString();

      // 构建更新语句
      const updateFields: string[] = ['updated_at = ?'];
      const updateValues: any[] = [now];

      if (body.title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(body.title.trim());
      }

      if (body.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(body.description?.trim() || null);
      }

      if (body.priority !== undefined) {
        updateFields.push('priority = ?');
        updateValues.push(body.priority);
      }

      if (body.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(body.status);
      }

      if (body.dueDate !== undefined) {
        updateFields.push('due_date = ?');
        updateValues.push(body.dueDate || null);
      }

      if (body.assignedTo !== undefined) {
        updateFields.push('assigned_to = ?');
        updateValues.push(body.assignedTo || null);
      }

      updateValues.push(id);

      // 执行更新
      const updateQuery = `
        UPDATE tasks
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      db.prepare(updateQuery).run(...updateValues);

      // 获取更新后的任务
      const task = rowToTask(
        db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
      );

      logger.info(`Task updated: ${id}`, { taskId: id, userId });

      return NextResponse.json({
        success: true,
        data: task,
      });
    } catch (error) {
      logger.error('Failed to update task', error);
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
 * DELETE /api/tasks/[id] - 删除任务
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async () => {
    try {
      const auth = await authenticateRequest(request);
      if (!auth.success || !auth.userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const userId = auth.userId;

      ensureTasksTable();

      const db = getDatabase();
      const { id } = await params;

      // 检查任务是否存在
      const existingRow = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      if (!existingRow) {
        return NextResponse.json(
          {
            success: false,
            error: 'Task not found',
            code: ErrorCodes.NOT_FOUND,
          },
          { status: 404 }
        );
      }

      // 删除任务
      db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

      logger.info(`Task deleted: ${id}`, { taskId: id, userId });

      return NextResponse.json(
        {
          success: true,
          data: {
            message: 'Task deleted successfully',
            id,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      logger.error('Failed to delete task', error);
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
