/**
 * 批量操作 API - 增强版
 * 支持多种批量操作：状态更新、优先级更新、分配、删除、标签管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseAsync } from '@/lib/db/index';
import { TaskPriority, TaskStatus } from '@/lib/tasks/types';

// 批量操作类型
type BatchOperation =
  | 'update-status'
  | 'update-priority'
  | 'assign'
  | 'delete'
  | 'add-tags'
  | 'remove-tags'
  | 'set-due-date';

interface BatchRequest {
  ids: string[];
  operation: BatchOperation;
  payload: unknown;
}

/**
 * 批量更新任务状态
 */
async function batchUpdateStatus(ids: string[], status: TaskStatus): Promise<number> {
  const db = await getDatabaseAsync();
  const now = new Date().toISOString();
  const completedAt = status === 'done' ? now : null;

  const stmt = db.prepare(`
    UPDATE tasks 
    SET status = ?, updated_at = ?, completed_at = COALESCE(?, completed_at)
    WHERE id = ?
  `);

  let count = 0;
  const transaction = db.transaction(() => {
    for (const id of ids) {
      const result = stmt.run(status, now, completedAt, id);
      count += result.changes;
    }
  });
  transaction();

  return count;
}

/**
 * 批量更新任务优先级
 */
async function batchUpdatePriority(ids: string[], priority: TaskPriority): Promise<number> {
  const db = await getDatabaseAsync();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE tasks 
    SET priority = ?, updated_at = ?
    WHERE id = ?
  `);

  let count = 0;
  const transaction = db.transaction(() => {
    for (const id of ids) {
      const result = stmt.run(priority, now, id);
      count += result.changes;
    }
  });
  transaction();

  return count;
}

/**
 * 批量分配任务
 */
async function batchAssign(ids: string[], assignee: string | null): Promise<number> {
  const db = await getDatabaseAsync();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE tasks 
    SET assignee = ?, updated_at = ?
    WHERE id = ?
  `);

  let count = 0;
  const transaction = db.transaction(() => {
    for (const id of ids) {
      const result = stmt.run(assignee, now, id);
      count += result.changes;
    }
  });
  transaction();

  return count;
}

/**
 * 批量删除任务
 */
async function batchDelete(ids: string[]): Promise<number> {
  const db = await getDatabaseAsync();

  let count = 0;
  const transaction = db.transaction(() => {
    // 删除标签关联
    const deleteTagsStmt = db.prepare('DELETE FROM task_tags WHERE task_id = ?');
    const deleteTaskStmt = db.prepare('DELETE FROM tasks WHERE id = ?');

    for (const id of ids) {
      deleteTagsStmt.run(id);
      const result = deleteTaskStmt.run(id);
      count += result.changes;
    }
  });
  transaction();

  return count;
}

/**
 * 批量添加标签
 */
async function batchAddTags(ids: string[], tagIds: string[]): Promise<number> {
  const db = await getDatabaseAsync();

  let count = 0;
  const transaction = db.transaction(() => {
    const stmt = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)');

    for (const taskId of ids) {
      for (const tagId of tagIds) {
        stmt.run(taskId, tagId);
      }
      count++;
    }
  });
  transaction();

  return count;
}

/**
 * 批量移除标签
 */
async function batchRemoveTags(ids: string[], tagIds: string[]): Promise<number> {
  const db = await getDatabaseAsync();

  let count = 0;
  const transaction = db.transaction(() => {
    const placeholders = tagIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      DELETE FROM task_tags 
      WHERE task_id = ? AND tag_id IN (${placeholders})
    `);

    for (const taskId of ids) {
      stmt.run(taskId, ...tagIds);
      count++;
    }
  });
  transaction();

  return count;
}

/**
 * 批量设置截止日期
 */
async function batchSetDueDate(ids: string[], dueDate: string | null): Promise<number> {
  const db = await getDatabaseAsync();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE tasks 
    SET due_date = ?, updated_at = ?
    WHERE id = ?
  `);

  let count = 0;
  const transaction = db.transaction(() => {
    for (const id of ids) {
      const result = stmt.run(dueDate, now, id);
      count += result.changes;
    }
  });
  transaction();

  return count;
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchRequest = await request.json();

    // 验证请求
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: 'Task IDs are required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!body.operation) {
      return NextResponse.json(
        { error: 'Operation is required' },
        { status: 400 }
      );
    }

    let count = 0;

    switch (body.operation) {
      case 'update-status': {
        const { status } = body.payload as { status: TaskStatus };
        if (!status || !['todo', 'in_progress', 'review', 'done'].includes(status)) {
          return NextResponse.json(
            { error: 'Invalid status value' },
            { status: 400 }
          );
        }
        count = await batchUpdateStatus(body.ids, status);
        break;
      }

      case 'update-priority': {
        const { priority } = body.payload as { priority: TaskPriority };
        if (!priority || !['high', 'medium', 'low'].includes(priority)) {
          return NextResponse.json(
            { error: 'Invalid priority value' },
            { status: 400 }
          );
        }
        count = await batchUpdatePriority(body.ids, priority);
        break;
      }

      case 'assign': {
        const { assignee } = body.payload as { assignee: string | null };
        count = await batchAssign(body.ids, assignee);
        break;
      }

      case 'delete': {
        count = await batchDelete(body.ids);
        break;
      }

      case 'add-tags': {
        const { tagIds } = body.payload as { tagIds: string[] };
        if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
          return NextResponse.json(
            { error: 'Tag IDs are required for add-tags operation' },
            { status: 400 }
          );
        }
        count = await batchAddTags(body.ids, tagIds);
        break;
      }

      case 'remove-tags': {
        const { tagIds } = body.payload as { tagIds: string[] };
        if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
          return NextResponse.json(
            { error: 'Tag IDs are required for remove-tags operation' },
            { status: 400 }
          );
        }
        count = await batchRemoveTags(body.ids, tagIds);
        break;
      }

      case 'set-due-date': {
        const { dueDate } = body.payload as { dueDate: string | null };
        count = await batchSetDueDate(body.ids, dueDate);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown operation: ${body.operation}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      operation: body.operation,
      affected: count,
      ids: body.ids,
    });
  } catch (error) {
    console.error('Batch operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform batch operation' },
      { status: 500 }
    );
  }
}

/**
 * GET: 获取支持的批量操作列表
 */
export async function GET() {
  return NextResponse.json({
    operations: [
      {
        name: 'update-status',
        description: '批量更新任务状态',
        payload: { status: 'todo | in_progress | review | done' },
      },
      {
        name: 'update-priority',
        description: '批量更新任务优先级',
        payload: { priority: 'high | medium | low' },
      },
      {
        name: 'assign',
        description: '批量分配任务',
        payload: { assignee: 'string | null' },
      },
      {
        name: 'delete',
        description: '批量删除任务',
        payload: {},
      },
      {
        name: 'add-tags',
        description: '批量添加标签',
        payload: { tagIds: 'string[]' },
      },
      {
        name: 'remove-tags',
        description: '批量移除标签',
        payload: { tagIds: 'string[]' },
      },
      {
        name: 'set-due-date',
        description: '批量设置截止日期',
        payload: { dueDate: 'ISO date string | null' },
      },
    ],
  });
}
