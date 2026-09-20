/**
 * Database Connection Module
 * Provides database connection and query functionality
 *
 * This module is separated from index.ts to avoid circular dependencies.
 * Import from here instead of './index' when you need database connection
 * without causing circular dependencies.
 */

import Database from 'better-sqlite3'
import { logger } from '../logger'

// Connection pool for better performance
let dbInstance: Database.Database | null = null
let connectionCount = 0

export interface DatabaseResult {
  changes: number
  lastInsertRowid?: number
}

export interface DatabaseStatement {
  run: (...params: unknown[]) => DatabaseResult
  get: (...params: unknown[]) => Record<string, unknown> | null
  all: (...params: unknown[]) => Record<string, unknown>[]
}

export interface DatabaseConnection {
  query: (sql: string, params?: unknown[]) => unknown
  queryRows: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => T[]
  get: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => T | null
  exec: (sql: string, params?: unknown[]) => DatabaseResult
  prepare: (sql: string) => DatabaseStatement
  pragma: (name: string, options?: { simple: boolean }) => unknown
  getConnection?: () => unknown
  batch: (statements: Array<{ sql: string; params?: unknown[] }>) => Promise<DatabaseResult[]>
  paginate?: (sql: string, pagination: unknown, params?: unknown[]) => Promise<unknown>
  // Transaction support
  beginTransaction: () => void
  commit: () => void
  rollback: () => void
  isInTransaction: () => boolean
}

/**
 * Initialize database connection with optimizations
 */
function initializeDatabase(): Database.Database {
  if (dbInstance) {
    connectionCount++
    return dbInstance
  }

  const dbPath = process.env.DATABASE_PATH || '/tmp/7zi-database.sqlite'
  const isMemoryDatabase = dbPath === ':memory:'

  // better-sqlite3 verbose callback type: (message?: unknown, ...additionalArgs: unknown[]) => void
  const verboseCallback =
    process.env.NODE_ENV === 'development'
      ? (((sql: unknown, ..._args: unknown[]) => {
          if (typeof sql === 'string') {
            logger.debug(sql, { category: 'db' })
          }
        }) as (message?: unknown, ...additionalArgs: unknown[]) => void)
      : undefined

  dbInstance = new Database(dbPath, {
    verbose: verboseCallback,
  })

  // Enable performance optimizations (skip for memory databases and test environment)
  if (!isMemoryDatabase && process.env.NODE_ENV !== 'test') {
    dbInstance.pragma('journal_mode = WAL') // Write-Ahead Logging for better concurrency
    dbInstance.pragma('synchronous = NORMAL') // Faster writes with reasonable safety
    dbInstance.pragma('cache_size = -64000') // 64MB cache
    dbInstance.pragma('temp_store = MEMORY') // Store temp tables in memory
    dbInstance.pragma('mmap_size = 30000000000') // Use memory-mapped I/O for 30GB
  }

  connectionCount = 1

  return dbInstance
}

/**
 * Get database connection from pool
 */
export async function getDatabaseAsync(): Promise<DatabaseConnection> {
  return getDatabase()
}

/**
 * Get database connection with connection pooling and transaction support
 */
export function getDatabase(): DatabaseConnection {
  const db = initializeDatabase()

  // Transaction state tracking
  let transactionDepth = 0

  const baseConnection = {
    query: (sql: string, params?: unknown[]) => {
      try {
        if (sql.trim().toLowerCase().startsWith('select')) {
          const stmt = db.prepare(sql)
          const result = params ? stmt.all(...params) : stmt.all()
          return Array.isArray(result) ? result : []
        } else {
          const stmt = db.prepare(sql)
          const result = stmt.run(...(params || []))
          return {
            changes: result?.changes ?? 0,
            lastInsertRowid:
              result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined,
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('[Database Query Error]', error, {
          category: 'db',
          sql,
          params,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        })
        throw error
      }
    },

    queryRows: <T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] => {
      try {
        const stmt = db.prepare(sql)
        const result = params && params.length > 0 ? stmt.all(...params) : stmt.all()
        return Array.isArray(result) ? (result as T[]) : []
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('[Database QueryRows Error]', error, {
          category: 'db',
          sql,
          params,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        })
        throw error
      }
    },

    get: <T = Record<string, unknown>>(sql: string, params?: unknown[]): T | null => {
      try {
        const stmt = db.prepare(sql)
        const result = params && params.length > 0 ? stmt.get(...params) : stmt.get()
        return result as T | null
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('[Database Get Error]', error, {
          category: 'db',
          sql,
          params,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        })
        throw error
      }
    },

    exec: (sql: string, params?: unknown[]) => {
      try {
        const stmt = db.prepare(sql)
        const result = stmt.run(...(params || []))
        return {
          changes: result?.changes ?? 0,
          lastInsertRowid:
            result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('[Database Exec Error]', error, {
          category: 'db',
          sql,
          params,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        })
        const enhancedError = new Error(`Database exec failed: ${errorMessage}`)
        enhancedError.name = 'DatabaseExecError'
        throw enhancedError
      }
    },

    prepare: (sql: string) => {
      const stmt = db.prepare(sql)
      return {
        run: (...params: unknown[]) => {
          try {
            const result = stmt.run(...params)
            return {
              changes: result?.changes ?? 0,
              lastInsertRowid:
                result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined,
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error('[Database Prepare.Run Error]', error, {
              category: 'db',
              sql,
              params,
              error: errorMessage,
              timestamp: new Date().toISOString(),
            })
            const enhancedError = new Error(`Database prepare.run failed: ${errorMessage}`)
            enhancedError.name = 'DatabasePrepareRunError'
            throw enhancedError
          }
        },
        get: (...params: unknown[]) => {
          try {
            return stmt.get(...params) as Record<string, unknown> | null
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error('[Database Prepare.Get Error]', error, {
              category: 'db',
              sql,
              params,
              error: errorMessage,
              timestamp: new Date().toISOString(),
            })
            const enhancedError = new Error(`Database prepare.get failed: ${errorMessage}`)
            enhancedError.name = 'DatabasePrepareGetError'
            throw enhancedError
          }
        },
        all: (...params: unknown[]) => {
          try {
            const result = stmt.all(...params)
            return Array.isArray(result) ? (result as Record<string, unknown>[]) : []
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error('[Database Prepare.All Error]', error, {
              category: 'db',
              sql,
              params,
              error: errorMessage,
              timestamp: new Date().toISOString(),
            })
            const enhancedError = new Error(`Database prepare.all failed: ${errorMessage}`)
            enhancedError.name = 'DatabasePrepareAllError'
            throw enhancedError
          }
        },
      }
    },

    pragma: (name: string, options?: { simple: boolean }) => {
      return db.pragma(name, options)
    },

    getConnection: () => db,

    batch: (statements: Array<{ sql: string; params?: unknown[] }>) => {
      try {
        const results: DatabaseResult[] = []
        const transaction = db.transaction(() => {
          for (const { sql, params } of statements) {
            const stmt = db.prepare(sql)
            const result = stmt.run(...(params || []))
            results.push({
              changes: result?.changes ?? 0,
              lastInsertRowid:
                result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined,
            })
          }
        })
        transaction()
        return results
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('[Database Batch Error]', error, {
          category: 'db',
          statementCount: statements.length,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        })
        const enhancedError = new Error(`Database batch failed: ${errorMessage}`)
        enhancedError.name = 'DatabaseBatchError'
        throw enhancedError
      }
    },

    // Transaction support methods
    beginTransaction: () => {
      try {
        if (transactionDepth === 0) {
          db.exec('BEGIN TRANSACTION')
          logger.debug('[Database] Transaction started', { category: 'db' })
        }
        transactionDepth++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('[Database BeginTransaction Error]', error, {
          category: 'db',
          error: errorMessage,
          timestamp: new Date().toISOString(),
        })
        throw new Error(`Failed to begin transaction: ${errorMessage}`)
      }
    },

    commit: () => {
      try {
        if (transactionDepth === 0) {
          logger.warn('[Database] Attempted to commit with no active transaction', { category: 'db' })
          return
        }
        transactionDepth--
        if (transactionDepth === 0) {
          db.exec('COMMIT')
          logger.debug('[Database] Transaction committed', { category: 'db' })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('[Database Commit Error]', error, {
          category: 'db',
          error: errorMessage,
          timestamp: new Date().toISOString(),
        })
        transactionDepth = 0 // Reset depth on error
        throw new Error(`Failed to commit transaction: ${errorMessage}`)
      }
    },

    rollback: () => {
      try {
        if (transactionDepth === 0) {
          logger.warn('[Database] Attempted to rollback with no active transaction', { category: 'db' })
          return
        }
        transactionDepth = 0 // Reset depth immediately
        db.exec('ROLLBACK')
        logger.debug('[Database] Transaction rolled back', { category: 'db' })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('[Database Rollback Error]', error, {
          category: 'db',
          error: errorMessage,
          timestamp: new Date().toISOString(),
        })
        throw new Error(`Failed to rollback transaction: ${errorMessage}`)
      }
    },

    isInTransaction: () => {
      return transactionDepth > 0
    },
  }

  // Wrap with performance logging if enabled
  if (
    process.env.ENABLE_DB_PERFORMANCE_LOGGING === 'true' ||
    process.env.NODE_ENV === 'development'
  ) {
    try {
      const { withPerformanceLogging } = require('@/lib/middleware/db-performance')
      return withPerformanceLogging(baseConnection)
    } catch (error) {
      return baseConnection as unknown as DatabaseConnection
    }
  }

  return baseConnection as unknown as DatabaseConnection
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    connectionCount = 0
  }
}

/**
 * Get database statistics for monitoring
 */
export function getDatabaseStats(): {
  connectionCount: number
  isOpen: boolean
  isMemoryDatabase: boolean
} {
  return {
    connectionCount,
    isOpen: dbInstance !== null && dbInstance.open,
    isMemoryDatabase: process.env.DATABASE_PATH === ':memory:',
  }
}

/**
 * Execute VACUUM to optimize database
 */
export function vacuumDatabase(): void {
  if (dbInstance) {
    dbInstance.exec('VACUUM')
  }
}

/**
 * Analyze database tables for query optimization
 */
export function analyzeDatabase(): void {
  if (dbInstance) {
    dbInstance.exec('ANALYZE')
  }
}

/**
 * Get database size and statistics
 */
export function getDatabaseSize(): {
  pageSize: number
  pageCount: number
  freePages: number
  sizeInBytes: number
  sizeInMB: number
} | null {
  if (!dbInstance) return null

  try {
    const pageSize = dbInstance.pragma('page_size', { simple: true }) as number
    const pageCount = dbInstance.pragma('page_count', { simple: true }) as number
    const freePages = dbInstance.pragma('freelist_count', { simple: true }) as number
    const sizeInBytes = pageSize * pageCount

    return {
      pageSize,
      pageCount,
      freePages,
      sizeInBytes,
      sizeInMB: sizeInBytes / (1024 * 1024),
    }
  } catch (error) {
    return null
  }
}
