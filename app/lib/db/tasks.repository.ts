/**
 * 任务数据仓库
 * 处理任务的 CRUD 操作
 * 所有函数都是异步的，因为数据库操作需要初始化
 */

import { getDatabaseAsync } from './index';
import { Task, TaskTag, TaskFilter, TaskPriority, TaskStatus, DEFAULT_TAGS } from '../tasks/types';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignee: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface TagRow {
  id: string;
  name: string;
  color: string;
}

/**
 * 将数据库行转换为 Task 对象
 */
function rowToTask(row: TaskRow, tags: TaskTag[]): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    priority: row.priority,
    status: row.status,
    tags,
    assignee: row.assignee || undefined,
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  };
}

/**
 * 获取任务的所有标签
 */
async function getTaskTags(taskId: string): Promise<TaskTag[]> {
  const db = await getDatabaseAsync();
  
  const rows = db.prepare(`
    SELECT t.id, t.name, t.color
    FROM tags t
    JOIN task_tags tt ON t.id = tt.tag_id
    WHERE tt.task_id = ?
  `).all(taskId) as TagRow[];
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    color: row.color,
  }));
}

/**
 * 获取所有任务
 */
export async function getAllTasks(): Promise<Task[]> {
  const db = await getDatabaseAsync();
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as TaskRow[];
  
  const tasks: Task[] = [];
  for (const row of rows) {
    const tags = await getTaskTags(row.id);
    tasks.push(rowToTask(row, tags));
  }
  
  return tasks;
}

/**
 * 根据 ID 获取任务
 */
export async function getTaskById(id: string): Promise<Task | null> {
  const db = await getDatabaseAsync();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  
  if (!row) return null;
  
  const tags = await getTaskTags(row.id);
  return rowToTask(row, tags);
}

/**
 * 根据条件筛选任务（支持高级筛选）
 */
export async function filterTasks(filter: TaskFilter): Promise<Task[]> {
  const db = await getDatabaseAsync();
  
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params: (string | number)[] = [];
  
  if (filter.priority) {
    sql += ' AND priority = ?';
    params.push(filter.priority);
  }
  
  if (filter.status) {
    sql += ' AND status = ?';
    params.push(filter.status);
  }
  
  if (filter.assignee) {
    sql += ' AND assignee = ?';
    params.push(filter.assignee);
  }
  
  if (filter.search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    const searchPattern = `%${filter.search}%`;
    params.push(searchPattern, searchPattern);
  }

  // 高级筛选 - 日期范围
  if (filter.dueDateFrom) {
    sql += ' AND due_date >= ?';
    params.push(filter.dueDateFrom);
  }
  
  if (filter.dueDateTo) {
    sql += ' AND due_date <= ?';
    params.push(filter.dueDateTo);
  }
  
  if (filter.createdFrom) {
    sql += ' AND created_at >= ?';
    params.push(filter.createdFrom);
  }
  
  if (filter.createdTo) {
    sql += ' AND created_at <= ?';
    params.push(filter.createdTo);
  }
  
  if (filter.completedFrom) {
    sql += ' AND completed_at >= ?';
    params.push(filter.completedFrom);
  }
  
  if (filter.completedTo) {
    sql += ' AND completed_at <= ?';
    params.push(filter.completedTo);
  }

  // 排序
  const sortBy = filter.sortBy || 'created_at';
  const sortOrder = filter.sortOrder || 'desc';
  sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
  
  const rows = db.prepare(sql).all(...params) as TaskRow[];
  
  const tasks: Task[] = [];
  for (const row of rows) {
    const tags = await getTaskTags(row.id);
    tasks.push(rowToTask(row, tags));
  }
  
  // 标签过滤需要在内存中进行（因为标签存储在关联表中）
  if (filter.tags && filter.tags.length > 0) {
    return tasks.filter(task =>
      filter.tags!.every(tagId => task.tags.some(tag => tag.id === tagId))
    );
  }
  
  return tasks;
}

/**
 * 创建任务
 */
export async function createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const db = await getDatabaseAsync();
  
  const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, description, priority, status, assignee, due_date, created_at, updated_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    taskData.title,
    taskData.description || null,
    taskData.priority,
    taskData.status,
    taskData.assignee || null,
    taskData.dueDate ? taskData.dueDate.toISOString() : null,
    now,
    now,
    taskData.completedAt ? taskData.completedAt.toISOString() : null
  );
  
  // 插入标签关联
  if (taskData.tags.length > 0) {
    const tagStmt = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)');
    for (const tag of taskData.tags) {
      tagStmt.run(id, tag.id);
    }
  }
  
  return (await getTaskById(id))!;
}

/**
 * 更新任务
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const db = await getDatabaseAsync();
  
  const existingTask = await getTaskById(id);
  if (!existingTask) return null;
  
  const now = new Date().toISOString();
  
  // 构建更新语句
  const fields: string[] = ['updated_at = ?'];
  const values: (string | null)[] = [now];
  
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description || null);
  }
  
  if (updates.priority !== undefined) {
    fields.push('priority = ?');
    values.push(updates.priority);
  }
  
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
    
    // 如果状态变为 done，设置完成时间
    if (updates.status === 'done') {
      fields.push('completed_at = ?');
      values.push(now);
    }
  }
  
  if (updates.assignee !== undefined) {
    fields.push('assignee = ?');
    values.push(updates.assignee || null);
  }
  
  if (updates.dueDate !== undefined) {
    fields.push('due_date = ?');
    values.push(updates.dueDate ? updates.dueDate.toISOString() : null);
  }
  
  values.push(id);
  
  const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...values);
  
  // 更新标签
  if (updates.tags !== undefined) {
    // 删除旧的标签关联
    db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id);
    
    // 插入新的标签关联
    if (updates.tags.length > 0) {
      const tagStmt = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)');
      for (const tag of updates.tags) {
        tagStmt.run(id, tag.id);
      }
    }
  }
  
  return getTaskById(id);
}

/**
 * 删除任务
 */
export async function deleteTask(id: string): Promise<boolean> {
  const db = await getDatabaseAsync();
  
  // 先删除标签关联
  db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id);
  
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * 批量更新任务状态
 */
export async function batchUpdateStatus(ids: string[], status: TaskStatus): Promise<number> {
  const db = await getDatabaseAsync();
  const now = new Date().toISOString();
  
  const completedAt = status === 'done' ? now : null;
  
  const stmt = db.prepare(`
    UPDATE tasks 
    SET status = ?, updated_at = ?, completed_at = COALESCE(?, completed_at)
    WHERE id = ?
  `);
  
  let count = 0;
  for (const id of ids) {
    const result = stmt.run(status, now, completedAt, id);
    count += result.changes;
  }
  
  return count;
}

/**
 * 获取任务统计信息
 */
export async function getTaskStats(): Promise<{
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  review: number;
  completionRate: number;
  byPriority: Record<TaskPriority, number>;
}> {
  const db = await getDatabaseAsync();
  
  const total = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
  const done = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = ?').get('done') as { count: number };
  const inProgress = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = ?').get('in_progress') as { count: number };
  const todo = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = ?').get('todo') as { count: number };
  const review = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = ?').get('review') as { count: number };
  
  const high = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE priority = ?').get('high') as { count: number };
  const medium = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE priority = ?').get('medium') as { count: number };
  const low = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE priority = ?').get('low') as { count: number };
  
  const totalNum = total.count;
  const doneNum = done.count;
  
  return {
    total: totalNum,
    done: doneNum,
    inProgress: inProgress.count,
    todo: todo.count,
    review: review.count,
    completionRate: totalNum > 0 ? Math.round((doneNum / totalNum) * 100) : 0,
    byPriority: {
      high: high.count,
      medium: medium.count,
      low: low.count,
    },
  };
}