/**
 * SQLite 数据库连接模块
 * 使用 better-sqlite3 进行同步操作
 * 
 * 注意：此模块只能在服务端使用（API 路由、getServerSideProps 等）
 */

import type { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 数据库文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'dashboard.db');

// 数据库实例
let db: DatabaseType | null = null;

// 动态导入 better-sqlite3（避免在客户端报错）
async function loadBetterSqlite3(): Promise<(filename: string) => DatabaseType> {
  const module = await import('better-sqlite3');
  return module.default || module;
}

/**
 * 获取数据库连接 (异步版本)
 */
export async function getDatabaseAsync(): Promise<DatabaseType> {
  if (!db) {
    const createDatabase = await loadBetterSqlite3();
    
    // 确保数据目录存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    db = createDatabase(DB_PATH) as DatabaseType;
    
    // 启用 WAL 模式以提高并发性能
    db.pragma('journal_mode = WAL');
    
    // 初始化表结构
    await initializeDatabase(db);
  }
  
  return db;
}

/**
 * 获取数据库连接 (同步版本 - 需要先调用 getDatabaseAsync 初始化)
 */
export function getDatabase(): DatabaseType {
  if (!db) {
    throw new Error('Database not initialized. Call getDatabaseAsync() first.');
  }
  return db;
}

/**
 * 初始化数据库表结构
 */
async function initializeDatabase(database: DatabaseType): Promise<void> {
  const schema = `
    -- 任务表
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'todo',
      assignee TEXT,
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );

    -- 标签表
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'blue',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 任务-标签关联表
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- 默认标签
    INSERT OR IGNORE INTO tags (id, name, color) VALUES
      ('bug', 'Bug', 'red'),
      ('feature', 'Feature', 'blue'),
      ('enhancement', 'Enhancement', 'purple'),
      ('documentation', 'Docs', 'green'),
      ('urgent', 'Urgent', 'orange'),
      ('ai-agent', 'AI Agent', 'pink');

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
  `;
  
  try {
    database.exec(schema);
  } catch (error) {
    // 忽略已存在的错误
    if (!(error instanceof Error && error.message.includes('already exists'))) {
      throw error;
    }
  }
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 健康检查
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; path: string; error?: string }> {
  try {
    const database = await getDatabaseAsync();
    const result = database.prepare('SELECT 1 as test').get() as { test: number };
    return {
      healthy: result.test === 1,
      path: DB_PATH,
    };
  } catch (error) {
    return {
      healthy: false,
      path: DB_PATH,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}