/**
 * 文件数据仓库
 * 处理文件的 CRUD 操作和元数据管理
 */

import { getDatabaseAsync } from './index';
import { randomUUID } from 'crypto';

export interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  hash: string;
  uploadedBy: string | null;
  taskId: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileFilter {
  mimeType?: string;
  uploadedBy?: string;
  taskId?: string;
  search?: string;
  maxSize?: number;
  minSize?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface FileStats {
  total: number;
  totalSize: number;
  byType: Record<string, { count: number; size: number }>;
  recentUploads: number;
}

interface FileRow {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  hash: string;
  uploaded_by: string | null;
  task_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function rowToFile(row: FileRow): FileRecord {
  return {
    id: row.id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    path: row.path,
    hash: row.hash,
    uploadedBy: row.uploaded_by,
    taskId: row.task_id,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * 创建 files 表（如果不存在）
 */
export async function initializeFilesTable(): Promise<void> {
  const db = await getDatabaseAsync();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      path TEXT NOT NULL,
      hash TEXT NOT NULL,
      uploaded_by TEXT,
      task_id TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);
    CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_files_task_id ON files(task_id);
    CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
    CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
  `);
}

/**
 * 创建文件记录
 */
export async function createFile(data: {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  hash: string;
  uploadedBy?: string;
  taskId?: string;
  description?: string;
}): Promise<FileRecord> {
  const db = await getDatabaseAsync();
  
  const id = `file_${randomUUID()}`;
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO files (id, filename, original_name, mime_type, size, path, hash, uploaded_by, task_id, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    data.filename,
    data.originalName,
    data.mimeType,
    data.size,
    data.path,
    data.hash,
    data.uploadedBy || null,
    data.taskId || null,
    data.description || null,
    now,
    now
  );
  
  return (await getFileById(id))!;
}

/**
 * 根据 ID 获取文件
 */
export async function getFileById(id: string): Promise<FileRecord | null> {
  const db = await getDatabaseAsync();
  const row = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as FileRow | undefined;
  return row ? rowToFile(row) : null;
}

/**
 * 根据哈希获取文件（用于去重）
 */
export async function getFileByHash(hash: string): Promise<FileRecord | null> {
  const db = await getDatabaseAsync();
  const row = db.prepare('SELECT * FROM files WHERE hash = ?').get(hash) as FileRow | undefined;
  return row ? rowToFile(row) : null;
}

/**
 * 获取所有文件
 */
export async function getAllFiles(limit = 100, offset = 0): Promise<FileRecord[]> {
  const db = await getDatabaseAsync();
  const rows = db.prepare('SELECT * FROM files ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as FileRow[];
  return rows.map(rowToFile);
}

/**
 * 根据条件筛选文件
 */
export async function filterFiles(filter: FileFilter): Promise<FileRecord[]> {
  const db = await getDatabaseAsync();
  
  let sql = 'SELECT * FROM files WHERE 1=1';
  const params: (string | number)[] = [];
  
  if (filter.mimeType) {
    sql += ' AND mime_type LIKE ?';
    params.push(`${filter.mimeType}%`);
  }
  
  if (filter.uploadedBy) {
    sql += ' AND uploaded_by = ?';
    params.push(filter.uploadedBy);
  }
  
  if (filter.taskId) {
    sql += ' AND task_id = ?';
    params.push(filter.taskId);
  }
  
  if (filter.search) {
    sql += ' AND (original_name LIKE ? OR description LIKE ?)';
    const searchPattern = `%${filter.search}%`;
    params.push(searchPattern, searchPattern);
  }
  
  if (filter.minSize !== undefined) {
    sql += ' AND size >= ?';
    params.push(filter.minSize);
  }
  
  if (filter.maxSize !== undefined) {
    sql += ' AND size <= ?';
    params.push(filter.maxSize);
  }
  
  if (filter.startDate) {
    sql += ' AND created_at >= ?';
    params.push(filter.startDate.toISOString());
  }
  
  if (filter.endDate) {
    sql += ' AND created_at <= ?';
    params.push(filter.endDate.toISOString());
  }
  
  sql += ' ORDER BY created_at DESC';
  
  const rows = db.prepare(sql).all(...params) as FileRow[];
  return rows.map(rowToFile);
}

/**
 * 更新文件
 */
export async function updateFile(id: string, updates: Partial<FileRecord>): Promise<FileRecord | null> {
  const db = await getDatabaseAsync();
  
  const existing = await getFileById(id);
  if (!existing) return null;
  
  const fields: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [new Date().toISOString()];
  
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  
  if (updates.taskId !== undefined) {
    fields.push('task_id = ?');
    values.push(updates.taskId);
  }
  
  values.push(id);
  
  const sql = `UPDATE files SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...values);
  
  return getFileById(id);
}

/**
 * 删除文件
 */
export async function deleteFile(id: string): Promise<boolean> {
  const db = await getDatabaseAsync();
  const result = db.prepare('DELETE FROM files WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * 批量删除文件
 */
export async function deleteFiles(ids: string[]): Promise<number> {
  const db = await getDatabaseAsync();
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM files WHERE id IN (${placeholders})`).run(...ids);
  return result.changes;
}

/**
 * 获取文件统计
 */
export async function getFileStats(): Promise<FileStats> {
  const db = await getDatabaseAsync();
  
  const total = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM files').get() as { count: number; total_size: number };
  
  const byType = db.prepare(`
    SELECT mime_type, COUNT(*) as count, SUM(size) as size 
    FROM files 
    GROUP BY mime_type
  `).all() as { mime_type: string; count: number; size: number }[];
  
  const recentUploads = db.prepare(`
    SELECT COUNT(*) as count 
    FROM files 
    WHERE created_at >= datetime('now', '-7 days')
  `).get() as { count: number };
  
  const byTypeMap: Record<string, { count: number; size: number }> = {};
  for (const row of byType) {
    byTypeMap[row.mime_type] = { count: row.count, size: row.size };
  }
  
  return {
    total: total.count,
    totalSize: total.total_size,
    byType: byTypeMap,
    recentUploads: recentUploads.count,
  };
}

/**
 * 获取与任务关联的文件
 */
export async function getFilesByTaskId(taskId: string): Promise<FileRecord[]> {
  const db = await getDatabaseAsync();
  const rows = db.prepare('SELECT * FROM files WHERE task_id = ? ORDER BY created_at DESC').all(taskId) as FileRow[];
  return rows.map(rowToFile);
}

/**
 * 获取用户上传的文件
 */
export async function getFilesByUser(userId: string): Promise<FileRecord[]> {
  const db = await getDatabaseAsync();
  const rows = db.prepare('SELECT * FROM files WHERE uploaded_by = ? ORDER BY created_at DESC').all(userId) as FileRow[];
  return rows.map(rowToFile);
}