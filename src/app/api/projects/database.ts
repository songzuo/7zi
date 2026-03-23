/**
 * Project Database Operations
 * 项目数据库操作
 */

import { getDatabase } from '@/lib/db';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ListProjectsQuery,
  ProjectStatus,
  ProjectPriority,
} from './types';
import { createAppError, ErrorCodes } from '@/lib/errors';

// ============================================================================
// Database Schema
// ============================================================================

/**
 * 初始化项目表
 */
export function initializeProjectTable(): void {
  const db = getDatabase();

  // 创建项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      priority TEXT NOT NULL DEFAULT 'medium',
      progress INTEGER NOT NULL DEFAULT 0,
      owner_id TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 创建索引（每个索引单独执行）
  db.exec('CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);');
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * 将数据库行转换为 Project 对象
 */
function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as number,
    name: row.name as string,
    description: row.description as string,
    status: row.status as ProjectStatus,
    priority: row.priority as ProjectPriority,
    progress: row.progress as number,
    ownerId: row.owner_id as string,
    startDate: row.start_date as string | null,
    endDate: row.end_date as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * 创建项目
 */
export function createProject(
  request: CreateProjectRequest,
  ownerId: string
): Project {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO projects (name, description, status, priority, progress, owner_id, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    request.name,
    request.description,
    request.status,
    request.priority,
    request.progress,
    ownerId,
    request.startDate,
    request.endDate
  );

  const project = getProjectById(result.lastInsertRowid as number);
  if (!project) {
    throw createAppError('Failed to create project', ErrorCodes.SERVER_ERROR);
  }

  return project;
}

/**
 * 获取项目详情
 */
export function getProjectById(id: number): Project | null {
  const db = getDatabase();

  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | null;

  if (!row) {
    return null;
  }

  return rowToProject(row);
}

/**
 * 获取项目列表
 */
export function listProjects(
  query: ListProjectsQuery,
  currentUserId: string
): {
  projects: Project[];
  total: number;
} {
  const db = getDatabase();

  const page = query.page || 1;
  const limit = query.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  const conditions: string[] = [];
  const params: unknown[] = [];

  // 如果不是管理员，只能看到自己的项目（这里简化为所有用户都可以看到所有项目）
  // TODO: 根据实际需求添加权限过滤

  if (query.status) {
    conditions.push('status = ?');
    params.push(query.status);
  }

  if (query.priority) {
    conditions.push('priority = ?');
    params.push(query.priority);
  }

  if (query.ownerId) {
    conditions.push('owner_id = ?');
    params.push(query.ownerId);
  }

  if (query.search) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    const searchTerm = `%${query.search}%`;
    params.push(searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 获取总数
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM projects ${whereClause}`);
  const countResult = countStmt.get(...params) as { count: number };

  // 排序
  const validSortBy = ['createdAt', 'updatedAt', 'name', 'priority', 'progress'];
  const sortByMap: Record<string, string> = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    name: 'name',
    priority: 'priority',
    progress: 'progress',
  };
  const dbSortBy = sortByMap[query.sortBy || 'createdAt'] || 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  // 获取项目列表
  const listStmt = db.prepare(`
    SELECT * FROM projects
    ${whereClause}
    ORDER BY ${dbSortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `);

  const rows = listStmt.all(...params, limit, offset) as Record<string, unknown>[];
  const projects = rows.map(rowToProject);

  return {
    projects,
    total: countResult.count,
  };
}

/**
 * 更新项目
 */
export function updateProject(id: number, request: UpdateProjectRequest): Project | null {
  const db = getDatabase();

  // 检查项目是否存在
  const existing = getProjectById(id);
  if (!existing) {
    throw createAppError('Project not found', ErrorCodes.NOT_FOUND);
  }

  // 构建更新语句
  const updates: string[] = [];
  const params: unknown[] = [];

  if (request.name !== undefined) {
    updates.push('name = ?');
    params.push(request.name);
  }

  if (request.description !== undefined) {
    updates.push('description = ?');
    params.push(request.description);
  }

  if (request.status !== undefined) {
    updates.push('status = ?');
    params.push(request.status);
  }

  if (request.priority !== undefined) {
    updates.push('priority = ?');
    params.push(request.priority);
  }

  if (request.progress !== undefined) {
    updates.push('progress = ?');
    params.push(request.progress);
  }

  if (request.startDate !== undefined) {
    updates.push('start_date = ?');
    params.push(request.startDate);
  }

  if (request.endDate !== undefined) {
    updates.push('end_date = ?');
    params.push(request.endDate);
  }

  if (updates.length === 0) {
    return existing; // 没有更新
  }

  updates.push('updated_at = datetime("now")');
  params.push(id);

  const stmt = db.prepare(`
    UPDATE projects
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  const result = stmt.run(...params);

  if (result.changes === 0) {
    throw createAppError('Failed to update project', ErrorCodes.SERVER_ERROR);
  }

  return getProjectById(id);
}

/**
 * 删除项目
 */
export function deleteProject(id: number): void {
  const db = getDatabase();

  // 检查项目是否存在
  const existing = getProjectById(id);
  if (!existing) {
    throw createAppError('Project not found', ErrorCodes.NOT_FOUND);
  }

  const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes === 0) {
    throw createAppError('Failed to delete project', ErrorCodes.SERVER_ERROR);
  }
}

/**
 * 获取项目统计信息
 */
export function getProjectStats(currentUserId?: string): {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  archivedProjects: number;
} {
  const db = getDatabase();

  const baseQuery = 'SELECT status, COUNT(*) as count FROM projects';
  const groupBy = ' GROUP BY status';

  const userIdFilter = currentUserId ? ' WHERE owner_id = ?' : '';

  const stmt = db.prepare(`${baseQuery}${userIdFilter}${groupBy}`);
  const rows = stmt.get(currentUserId) as Record<string, unknown>;

  // 简化统计：查询总数和各状态数量
  const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM projects${userIdFilter}`);
  const totalResult = totalStmt.get(currentUserId) as { count: number };

  const activeStmt = db.prepare(
    `SELECT COUNT(*) as count FROM projects${userIdFilter} WHERE status = ?`
  );
  const activeResult = activeStmt.get(currentUserId, ProjectStatus.ACTIVE) as { count: number };

  const completedResult = activeStmt.get(
    currentUserId,
    ProjectStatus.COMPLETED
  ) as { count: number };

  const onHoldResult = activeStmt.get(
    currentUserId,
    ProjectStatus.ON_HOLD
  ) as { count: number };

  const archivedResult = activeStmt.get(
    currentUserId,
    ProjectStatus.ARCHIVED
  ) as { count: number };

  return {
    totalProjects: totalResult.count,
    activeProjects: activeResult.count,
    completedProjects: completedResult.count,
    onHoldProjects: onHoldResult.count,
    archivedProjects: archivedResult.count,
  };
}
