/**
 * 数据库模块 (Unified Error Handling)
 * Database Module with Unified Error Handling
 *
 * Provides database connection and query functionality with unified error handling.
 *
 * @example
 * // 所有操作都会在出错时抛出 UnifiedAppError
 * try {
 *   const db = getDatabase();
 *   const users = db.queryRows('SELECT * FROM users');
 *   // 处理结果
 * } catch (error) {
 *   if (isUnifiedError(error)) {
 *     // 处理统一错误
 *   }
 * }
 */

import Database from 'better-sqlite3';
import {
  migrate as runMigrations,
  optimizeDatabase as runOptimizeDatabase,
  getDatabaseHealth as runGetDatabaseHealth,
} from './migrations';
import { logger } from '../logger';
import {
  UnifiedAppError,
  isUnifiedError,
} from '../errors/unified-error';
import { ErrorCodes, UnifiedErrorType } from '../errors/unified-types';

// Connection pool for better performance
let dbInstance: Database.Database | null = null;
let connectionCount = 0;
const MAX_CONNECTIONS = 10;

export interface DatabaseResult {
  changes: number;
  lastInsertRowid?: number;
}

export interface DatabaseStatement {
  run: (...params: unknown[]) => DatabaseResult;
  get: (...params: unknown[]) => Record<string, unknown> | null;
  all: (...params: unknown[]) => Record<string, unknown>[];
}

export interface DatabaseConnection {
  query: (sql: string, params?: unknown[]) => unknown;
  queryRows: (sql: string, params?: unknown[]) => Record<string, unknown>[];
  exec: (sql: string, params?: unknown[]) => DatabaseResult;
  prepare: (sql: string) => DatabaseStatement;
  pragma: (name: string, options?: { simple: boolean }) => unknown;
  getConnection?: () => unknown;
  batch: (statements: Array<{ sql: string; params?: unknown[] }>) => Promise<DatabaseResult[]>;
  paginate?: (sql: string, pagination: unknown, params?: unknown[]) => Promise<unknown>;
}

/**
 * Initialize database connection with optimizations
 * @throws {UnifiedAppError} If database initialization fails
 */
function initializeDatabase(): Database.Database {
  if (dbInstance) {
    connectionCount++;
    return dbInstance;
  }

  const dbPath = process.env.DATABASE_PATH || '/tmp/7zi-database.sqlite';

  try {
    // better-sqlite3 verbose callback type: (message?: unknown, ...additionalArgs: unknown[]) => void
    const verboseCallback = process.env.NODE_ENV === 'development'
      ? ((sql: unknown, ..._args: unknown[]) => {
          if (typeof sql === 'string') {
            logger.debug(sql, { category: 'db' });
          }
        }) as ((message?: unknown, ...additionalArgs: unknown[]) => void)
      : undefined;

    dbInstance = new Database(dbPath, {
      verbose: verboseCallback,
    });

    // Enable performance optimizations
    dbInstance.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    dbInstance.pragma('synchronous = NORMAL'); // Faster writes with reasonable safety
    dbInstance.pragma('cache_size = -64000'); // 64MB cache
    dbInstance.pragma('temp_store = MEMORY'); // Store temp tables in memory
    dbInstance.pragma('mmap_size = 30000000000'); // Use memory-mapped I/O for 30GB

    connectionCount = 1;

    return dbInstance;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to initialize database', error, { category: 'db', dbPath });
    throw UnifiedAppError.internal(`Failed to initialize database: ${errorMessage}`);
  }
}

/**
 * Get database connection from pool
 * @throws {UnifiedAppError} If database access fails
 */
export async function getDatabaseAsync(): Promise<DatabaseConnection> {
  return getDatabase();
}

/**
 * Get database connection with connection pooling and unified error handling
 * @throws {UnifiedAppError} If database operations fail
 */
export function getDatabase(): DatabaseConnection {
  const db = initializeDatabase();

  const baseConnection = {
    query: (sql: string, params?: unknown[]) => {
      try {
        if (sql.trim().toLowerCase().startsWith('select')) {
          const stmt = db.prepare(sql);
          const result = params ? stmt.all(...params) : stmt.all();
          return Array.isArray(result) ? result : [];
        } else {
          const stmt = db.prepare(sql);
          const result = stmt.run(...(params || []));
          return {
            changes: result?.changes ?? 0,
            lastInsertRowid: result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[Database Query Error]', error, {
          category: 'db',
          sql,
          params,
          error: errorMessage,
          timestamp: new Date().toISOString()
        });

        // 判断错误类型
        if (errorMessage.includes('SQLITE_BUSY') || errorMessage.includes('database is locked')) {
          throw UnifiedAppError.serviceUnavailable('Database is busy, please retry', 5);
        }

        if (errorMessage.includes('SQLITE_CONSTRAINT')) {
          throw UnifiedAppError.conflict('Database constraint violation', { sql, params });
        }

        if (errorMessage.includes('SQLITE_NOTFOUND') || errorMessage.includes('no such table')) {
          throw UnifiedAppError.internal(`Database schema error: ${errorMessage}`);
        }

        throw UnifiedAppError.internal(`Database query failed: ${errorMessage}`, { sql, params });
      }
    },

    queryRows: (sql: string, params?: unknown[]) => {
      try {
        const stmt = db.prepare(sql);
        const result = params ? stmt.all(...params) : stmt.all();
        return Array.isArray(result) ? result as Record<string, unknown>[] : [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[Database QueryRows Error]', error, {
          category: 'db',
          sql,
          params,
          error: errorMessage,
          timestamp: new Date().toISOString()
        });

        if (errorMessage.includes('SQLITE_BUSY') || errorMessage.includes('database is locked')) {
          throw UnifiedAppError.serviceUnavailable('Database is busy, please retry', 5);
        }

        if (errorMessage.includes('SQLITE_CONSTRAINT')) {
          throw UnifiedAppError.conflict('Database constraint violation', { sql, params });
        }

        throw UnifiedAppError.internal(`Database query failed: ${errorMessage}`, { sql, params });
      }
    },

    exec: (sql: string, params?: unknown[]) => {
      try {
        const stmt = db.prepare(sql);
        const result = stmt.run(...(params || []));
        return {
          changes: result?.changes ?? 0,
          lastInsertRowid: result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[Database Exec Error]', error, {
          category: 'db',
          sql,
          params,
          error: errorMessage,
          timestamp: new Date().toISOString()
        });

        if (errorMessage.includes('SQLITE_BUSY') || errorMessage.includes('database is locked')) {
          throw UnifiedAppError.serviceUnavailable('Database is busy, please retry', 5);
        }

        if (errorMessage.includes('SQLITE_CONSTRAINT')) {
          throw UnifiedAppError.conflict('Database constraint violation', { sql, params });
        }

        throw UnifiedAppError.internal(`Database exec failed: ${errorMessage}`, { sql, params });
      }
    },

    prepare: (sql: string) => {
      const stmt = db.prepare(sql);
      return {
        run: (...params: unknown[]) => {
          try {
            const result = stmt.run(...params);
            return {
              changes: result?.changes ?? 0,
              lastInsertRowid: result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[Database Prepare.Run Error]', error, {
              category: 'db',
              sql,
              params,
              error: errorMessage,
              timestamp: new Date().toISOString()
            });

            if (errorMessage.includes('SQLITE_BUSY') || errorMessage.includes('database is locked')) {
              throw UnifiedAppError.serviceUnavailable('Database is busy, please retry', 5);
            }

            if (errorMessage.includes('SQLITE_CONSTRAINT')) {
              throw UnifiedAppError.conflict('Database constraint violation', { sql, params });
            }

            throw UnifiedAppError.internal(`Database prepare.run failed: ${errorMessage}`, { sql, params });
          }
        },
        get: (...params: unknown[]) => {
          try {
            return stmt.get(...params) as Record<string, unknown> | null;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[Database Prepare.Get Error]', error, {
              category: 'db',
              sql,
              params,
              error: errorMessage,
              timestamp: new Date().toISOString()
            });

            if (errorMessage.includes('SQLITE_BUSY') || errorMessage.includes('database is locked')) {
              throw UnifiedAppError.serviceUnavailable('Database is busy, please retry', 5);
            }

            throw UnifiedAppError.internal(`Database prepare.get failed: ${errorMessage}`, { sql, params });
          }
        },
        all: (...params: unknown[]) => {
          try {
            const result = stmt.all(...params);
            return Array.isArray(result) ? result as Record<string, unknown>[] : [];
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[Database Prepare.All Error]', error, {
              category: 'db',
              sql,
              params,
              error: errorMessage,
              timestamp: new Date().toISOString()
            });

            if (errorMessage.includes('SQLITE_BUSY') || errorMessage.includes('database is locked')) {
              throw UnifiedAppError.serviceUnavailable('Database is busy, please retry', 5);
            }

            throw UnifiedAppError.internal(`Database prepare.all failed: ${errorMessage}`, { sql, params });
          }
        },
      };
    },

    pragma: (name: string, options?: { simple: boolean }) => {
      return db.pragma(name, options);
    },

    getConnection: () => db,

    batch: (statements: Array<{ sql: string; params?: unknown[] }>) => {
      try {
        const results: DatabaseResult[] = [];
        const transaction = db.transaction(() => {
          for (const { sql, params } of statements) {
            const stmt = db.prepare(sql);
            const result = stmt.run(...(params || []));
            results.push({
              changes: result?.changes ?? 0,
              lastInsertRowid: result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined
            });
          }
        });
        transaction();
        return results;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[Database Batch Error]', error, {
          category: 'db',
          statementCount: statements.length,
          error: errorMessage,
          timestamp: new Date().toISOString()
        });

        if (errorMessage.includes('SQLITE_BUSY') || errorMessage.includes('database is locked')) {
          throw UnifiedAppError.serviceUnavailable('Database is busy, please retry', 5);
        }

        if (errorMessage.includes('SQLITE_CONSTRAINT')) {
          throw UnifiedAppError.conflict('Database constraint violation');
        }

        throw UnifiedAppError.internal(`Database batch failed: ${errorMessage}`);
      }
    },
  };

  // Wrap with performance logging if enabled
  if (process.env.ENABLE_DB_PERFORMANCE_LOGGING === 'true' || process.env.NODE_ENV === 'development') {
    try {
      const { withPerformanceLogging } = require('@/lib/middleware/db-performance');
      return withPerformanceLogging(baseConnection);
    } catch {
      // Performance logging module not available, return base connection
      return baseConnection as unknown as DatabaseConnection;
    }
  }

  return baseConnection as unknown as DatabaseConnection;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (error) {
      logger.error('Failed to close database', error, { category: 'db' });
    }
    dbInstance = null;
    connectionCount = 0;
  }
}

/**
 * Get database statistics for monitoring
 * @throws {UnifiedAppError} If statistics retrieval fails
 */
export function getDatabaseStats(): {
  connectionCount: number;
  isOpen: boolean;
  isMemoryDatabase: boolean;
} {
  try {
    return {
      connectionCount,
      isOpen: dbInstance !== null && dbInstance.open,
      isMemoryDatabase: process.env.DATABASE_PATH === ':memory:',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get database stats', error, { category: 'db' });
    throw UnifiedAppError.internal(`Failed to get database stats: ${errorMessage}`);
  }
}

/**
 * Execute VACUUM to optimize database
 * @throws {UnifiedAppError} If vacuum fails
 */
export function vacuumDatabase(): void {
  if (!dbInstance) {
    throw UnifiedAppError.internal('Database not initialized');
  }

  try {
    dbInstance.exec('VACUUM');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to vacuum database', error, { category: 'db' });
    throw UnifiedAppError.internal(`Failed to vacuum database: ${errorMessage}`);
  }
}

/**
 * Analyze database tables for query optimization
 * @throws {UnifiedAppError} If analyze fails
 */
export function analyzeDatabase(): void {
  if (!dbInstance) {
    throw UnifiedAppError.internal('Database not initialized');
  }

  try {
    dbInstance.exec('ANALYZE');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to analyze database', error, { category: 'db' });
    throw UnifiedAppError.internal(`Failed to analyze database: ${errorMessage}`);
  }
}

/**
 * Get database size and statistics
 * @throws {UnifiedAppError} If size retrieval fails
 */
export function getDatabaseSize(): {
  pageSize: number;
  pageCount: number;
  freePages: number;
  sizeInBytes: number;
  sizeInMB: number;
} | null {
  if (!dbInstance) return null;

  try {
    const pageSize = dbInstance.pragma('page_size', { simple: true }) as number;
    const pageCount = dbInstance.pragma('page_count', { simple: true }) as number;
    const freePages = dbInstance.pragma('freelist_count', { simple: true }) as number;
    const sizeInBytes = pageSize * pageCount;

    return {
      pageSize,
      pageCount,
      freePages,
      sizeInBytes,
      sizeInMB: sizeInBytes / (1024 * 1024),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get database size', error, { category: 'db' });
    throw UnifiedAppError.internal(`Failed to get database size: ${errorMessage}`);
  }
}

/**
 * Run database migrations
 * @throws {UnifiedAppError} If migration fails
 */
export async function migrate(): Promise<void> {
  try {
    return await runMigrations();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to run database migrations', error, { category: 'db' });
    throw UnifiedAppError.internal(`Database migration failed: ${errorMessage}`);
  }
}

/**
 * Optimize database (vacuum, analyze, cleanup)
 * @throws {UnifiedAppError} If optimization fails
 */
export async function optimizeDatabase(): Promise<ReturnType<typeof runOptimizeDatabase>> {
  try {
    return await runOptimizeDatabase();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to optimize database', error, { category: 'db' });
    throw UnifiedAppError.internal(`Database optimization failed: ${errorMessage}`);
  }
}

/**
 * Get database health report
 * @throws {UnifiedAppError} If health check fails
 */
export async function getDatabaseHealth(): Promise<ReturnType<typeof runGetDatabaseHealth>> {
  try {
    return await runGetDatabaseHealth();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get database health', error, { category: 'db' });
    throw UnifiedAppError.internal(`Database health check failed: ${errorMessage}`);
  }
}

// Export batch operations for convenience
export * from './batch-operations';
// Export query optimizations
export * from './query-optimizations';

export default {
  getDatabase,
  getDatabaseAsync,
  closeDatabase,
  getDatabaseStats,
  vacuumDatabase,
  analyzeDatabase,
  getDatabaseSize,
  migrate,
  optimizeDatabase,
  getDatabaseHealth,
};
