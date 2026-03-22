/**
 * 数据库模块 - Database Module
 * Provides database connection and query functionality
 */

import Database from 'better-sqlite3';
import { join } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface DatabaseResult {
  changes?: number;
  lastInsertRowid?: number;
}

export interface DatabaseStatement {
  run: (...params: unknown[]) => DatabaseResult;
  get: (...params: unknown[]) => Record<string, unknown> | null;
  all: (...params: unknown[]) => Record<string, unknown>[];
}

export interface DatabaseConnection {
  prepare: (sql: string) => DatabaseStatement;
  exec: (sql: string) => void;
  close: () => void;
  pragma: (name: string) => unknown;
  query?: (sql: string, params?: unknown[]) => unknown[];
  queryRows?: (sql: string, params?: unknown[]) => Record<string, unknown>[];
  batch?: (statements: unknown[]) => unknown[];
  rollback?: () => void;
}

// Extend Database with query methods (will be added at runtime)
export interface ExtendedDatabase extends Database.Database {
  query(sql: string, params?: unknown[]): unknown[];
  queryRows(sql: string, params?: unknown[]): Record<string, unknown>[];
}

// ============================================================================
// Database Connection
// ============================================================================

let dbInstance: Database.Database | null = null;
const DB_PATH = join(process.cwd(), 'data', 'app.db');

/**
 * 获取数据库连接 (同步)
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }

  // Add query method for convenience
  const db = dbInstance;
  if (!(db as any).query) {
    (db as any).query = function(sql: string, params: unknown[] = []) {
      const statement = this.prepare(sql);
      return statement.all(...params);
    };
    (db as any).queryRows = function(sql: string, params: unknown[] = []) {
      const statement = this.prepare(sql);
      return statement.all(...params);
    };
  }

  return dbInstance;
}

/**
 * 获取数据库连接 (异步兼容)
 */
export async function getDatabaseAsync(): Promise<Database.Database> {
  return getDatabase();
}

/**
 * 获取数据库大小信息
 */
export function getDatabaseSize(): { sizeInBytes: number; sizeInMB: number } | null {
  try {
    const fs = require('fs');
    const stats = fs.statSync(DB_PATH);
    return {
      sizeInBytes: stats.size,
      sizeInMB: stats.size / (1024 * 1024),
    };
  } catch {
    return null;
  }
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export default {
  getDatabase,
  getDatabaseAsync,
  getDatabaseSize,
  closeDatabase,
};
