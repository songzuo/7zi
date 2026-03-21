/**
 * 数据库模块 - Database Module
 * Provides database connection and query functionality with optimizations
 */

import Database from 'better-sqlite3';
import {
  migrate as runMigrations,
  optimizeDatabase as runOptimizeDatabase,
  getDatabaseHealth as runGetDatabaseHealth,
} from './migrations';
import { logger } from '../logger';

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
 */
function initializeDatabase(): Database.Database {
  if (dbInstance) {
    connectionCount++;
    return dbInstance;
  }

  const dbPath = process.env.DATABASE_PATH || '/tmp/7zi-database.sqlite';

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
}

/**
 * Get database connection from pool
 */
export async function getDatabaseAsync(): Promise<DatabaseConnection> {
  return getDatabase();
}

/**
 * Get database connection with connection pooling
 */
export function getDatabase(): DatabaseConnection {
  const db = initializeDatabase();

  const baseConnection = {
    query: (sql: string, params?: unknown[]) => {
      try {
        if (sql.trim().toLowerCase().startsWith('select')) {
          const stmt = db.prepare(sql);
          const result = params ? stmt.all(...params) : stmt.all();
          // Add null safety for array results
          return Array.isArray(result) ? result : [];
        } else {
          const stmt = db.prepare(sql);
          const result = stmt.run(...(params || []));
          // Add null safety for result properties and convert bigint to number
          return {
            changes: result?.changes ?? 0,
            lastInsertRowid: result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[Database Query Error]', error, { category: 'db', sql, params, error: errorMessage, timestamp: new Date().toISOString() });
        throw error;
      }
    },

    queryRows: (sql: string, params?: unknown[]) => {
      try {
        const stmt = db.prepare(sql);
        const result = params ? stmt.all(...params) : stmt.all();
        return Array.isArray(result) ? result as Record<string, unknown>[] : [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[Database QueryRows Error]', error, { category: 'db', sql, params, error: errorMessage, timestamp: new Date().toISOString() });
        throw error;
      }
    },
    
    exec: (sql: string, params?: unknown[]) => {
      try {
        const stmt = db.prepare(sql);
        const result = stmt.run(...(params || []));
        // Add null safety for result properties and convert bigint to number
        return {
          changes: result?.changes ?? 0,
          lastInsertRowid: result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[Database Exec Error]', error, { category: 'db', sql, params, error: errorMessage, timestamp: new Date().toISOString() });
        // Create a more informative error
        const enhancedError = new Error(`Database exec failed: ${errorMessage}`);
        enhancedError.name = 'DatabaseExecError';
        throw enhancedError;
      }
    },
    
    prepare: (sql: string) => {
      const stmt = db.prepare(sql);
      return {
        run: (...params: unknown[]) => {
          try {
            const result = stmt.run(...params);
            // Add null safety for result properties and convert bigint to number
            return {
              changes: result?.changes ?? 0,
              lastInsertRowid: result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[Database Prepare.Run Error]', error, { category: 'db', sql, params, error: errorMessage, timestamp: new Date().toISOString() });
            const enhancedError = new Error(`Database prepare.run failed: ${errorMessage}`);
            enhancedError.name = 'DatabasePrepareRunError';
            throw enhancedError;
          }
        },
        get: (...params: unknown[]) => {
          try {
            return stmt.get(...params) as Record<string, unknown> | null;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[Database Prepare.Get Error]', error, { category: 'db', sql, params, error: errorMessage, timestamp: new Date().toISOString() });
            const enhancedError = new Error(`Database prepare.get failed: ${errorMessage}`);
            enhancedError.name = 'DatabasePrepareGetError';
            throw enhancedError;
          }
        },
        all: (...params: unknown[]) => {
          try {
            const result = stmt.all(...params);
            // Add null safety for array results and proper type casting
            return Array.isArray(result) ? result as Record<string, unknown>[] : [];
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[Database Prepare.All Error]', error, { category: 'db', sql, params, error: errorMessage, timestamp: new Date().toISOString() });
            const enhancedError = new Error(`Database prepare.all failed: ${errorMessage}`);
            enhancedError.name = 'DatabasePrepareAllError';
            throw enhancedError;
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
            // Add null safety for result properties and convert bigint to number
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
        logger.error('[Database Batch Error]', error, { category: 'db', statementCount: statements.length, error: errorMessage, timestamp: new Date().toISOString() });
        const enhancedError = new Error(`Database batch failed: ${errorMessage}`);
        enhancedError.name = 'DatabaseBatchError';
        throw enhancedError;
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
    dbInstance.close();
    dbInstance = null;
    connectionCount = 0;
  }
}

/**
 * Get database statistics for monitoring
 */
export function getDatabaseStats(): {
  connectionCount: number;
  isOpen: boolean;
  isMemoryDatabase: boolean;
} {
  return {
    connectionCount,
    isOpen: dbInstance !== null && dbInstance.open,
    isMemoryDatabase: process.env.DATABASE_PATH === ':memory:',
  };
}

/**
 * Execute VACUUM to optimize database
 */
export function vacuumDatabase(): void {
  if (dbInstance) {
    dbInstance.exec('VACUUM');
  }
}

/**
 * Analyze database tables for query optimization
 */
export function analyzeDatabase(): void {
  if (dbInstance) {
    dbInstance.exec('ANALYZE');
  }
}

/**
 * Get database size and statistics
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
  } catch {
    return null;
  }
}

/**
 * Run database migrations
 */
export async function migrate(): Promise<void> {
  return runMigrations();
}

/**
 * Optimize database (vacuum, analyze, cleanup)
 */
export async function optimizeDatabase(): Promise<ReturnType<typeof runOptimizeDatabase>> {
  return runOptimizeDatabase();
}

/**
 * Get database health report
 */
export async function getDatabaseHealth(): Promise<ReturnType<typeof runGetDatabaseHealth>> {
  return runGetDatabaseHealth();
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
