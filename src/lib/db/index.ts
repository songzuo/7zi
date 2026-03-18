/**
 * 数据库模块 - Database Module
 * Provides database connection and query functionality
 */

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
  query: (sql: string, params?: unknown[]) => unknown;
  exec: (sql: string, params?: unknown[]) => DatabaseResult;
  prepare: (sql: string) => DatabaseStatement;
  getConnection?: () => unknown;
}

/**
 * 获取数据库连接
 */
export async function getDatabaseAsync(): Promise<DatabaseConnection> {
  return getDatabase();
}

/**
 * 获取同步数据库连接
 */
export function getDatabase(): DatabaseConnection {
  return {
    query: (sql: string, params?: unknown[]) => {
      console.warn('Database query called without implementation:', sql, params);
      return [];
    },
    exec: (sql: string, params?: unknown[]) => {
      console.warn('Database exec called without implementation:', sql, params);
      return { changes: 0 };
    },
    prepare: (sql: string) => ({
      run: (...params: unknown[]) => {
        console.warn('Database prepare.run called without implementation:', sql, params);
        return { changes: 0 };
      },
      get: (...params: unknown[]) => {
        console.warn('Database prepare.get called without implementation:', sql, params);
        return null;
      },
      all: (...params: unknown[]) => {
        console.warn('Database prepare.all called without implementation:', sql, params);
        return [];
      },
    }),
  };
}

export default {
  getDatabase,
  getDatabaseAsync,
};
