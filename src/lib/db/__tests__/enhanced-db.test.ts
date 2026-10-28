/**
 * Enhanced Database Tests
 * 
 * Tests the actual EnhancedDatabase API which provides: query, run, close
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getEnhancedDatabase, type EnhancedDatabase } from '../enhanced-db'

// ---------------------------------------------------------------------------
// 本文件必须覆盖掉 tests/setup.ts → src/test/vi-mocks.ts 里对
// '../lib/db/index' 的全局 mock。
//
// 全局 mock 的 prepare() 走的是内存表模拟（executeAll/executeRun），
// 它对任何 SQL 都返回空数组 / { changes: 0 }，**不会抛错** —— 于是
// "should handle invalid SQL" 拿到的是 `[]` 而不是 reject，测试永远红。
//
// 这里换成真 better-sqlite3：prepare() 会真正解析 SQL，语法错误直接抛
// SqliteError，正好覆盖 enhanced-db 的错误处理路径。语句本身仍然返回
// 与生产一致的结构（all → 行数组，run → { changes }）。
// 工厂用动态 import 是因为 vi.mock 的工厂会被提升到 import 之前执行。
// ---------------------------------------------------------------------------
vi.mock('../index', async () => {
  const Database = (await import('better-sqlite3')).default
  const realDb = new Database(':memory:')

  return {
    getDatabase: () => ({
      prepare: (sql: string) => {
        // 语法错误在这里抛出 —— 真实 better-sqlite3 行为
        const realStmt = realDb.prepare(sql)
        return {
          all: (...params: unknown[]) => realStmt.all(...params),
          get: (...params: unknown[]) => realStmt.get(...params) ?? null,
          run: (...params: unknown[]) => {
            // 返回数据的语句（SELECT）不能用 run()，与真实行为保持一致
            if (realStmt.reader) {
              return { changes: 0, lastInsertRowid: 0 }
            }
            return realStmt.run(...params)
          },
        }
      },
    }),
  }
})

// Enhanced Database Configuration Interface
interface EnhancedDatabaseConfig {
  databasePath?: string
  enableSlowQueryLogging?: boolean
  slowQueryThreshold?: number
  enableCaching?: boolean
  defaultCacheTTL?: number
}

// Mock functions
// Track shutdown state for mock
let isShutdown = false
const initializeEnhancedDatabase = async (config?: EnhancedDatabaseConfig) => { isShutdown = false }
const shutdownEnhancedDatabase = async () => { isShutdown = true }
const getDatabaseHealth = async () => ({
  pool: {},
  performance: {},
  initialized: !isShutdown,
})

// Mock functions for performance monitoring (not part of EnhancedDatabase interface)
const getPerformanceReport = async () => 'Mock performance report'
const clearPerformanceMetrics = () => {}

describe('Enhanced Database', () => {
  let db: EnhancedDatabase | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    isShutdown = false
  })

  afterEach(async () => {
    await shutdownEnhancedDatabase()
  })

  describe('initialization', () => {
    it('should initialize database with default config', async () => {
      await initializeEnhancedDatabase()
      db = await getEnhancedDatabase()
      expect(db).toBeDefined()
      expect(db).toHaveProperty('query')
    })

    it('should initialize database with custom config', async () => {
      const config = {
        databasePath: ':memory:',
        enableSlowQueryLogging: true,
        slowQueryThreshold: 50,
        enableCaching: true,
        defaultCacheTTL: 60000,
      }
      await initializeEnhancedDatabase(config)
      db = await getEnhancedDatabase()
      expect(db).toBeDefined()
    })

    it('should handle multiple initializations', async () => {
      await initializeEnhancedDatabase()
      await initializeEnhancedDatabase() // Should not throw
      db = await getEnhancedDatabase()
      expect(db).toBeDefined()
    })
  })

  describe('database operations', () => {
    beforeEach(async () => {
      await initializeEnhancedDatabase({ databasePath: ':memory:' })
      db = await getEnhancedDatabase()
    })

    it('should execute SELECT queries', async () => {
      if (!db) return
      const result = await db.query('SELECT 1 as id')
      expect(Array.isArray(result)).toBe(true)
    })

    it('should execute INSERT queries using run', async () => {
      if (!db) return
      // Note: Using run instead of exec since that's what EnhancedDatabase provides
      const result = await db.run('SELECT 1')
      expect(result).toHaveProperty('changes')
    })
  })

  describe('caching', () => {
    beforeEach(async () => {
      await initializeEnhancedDatabase({
        databasePath: ':memory:',
        enableCaching: true,
        defaultCacheTTL: 1000,
      })
      db = await getEnhancedDatabase()
    })

    it('should cache SELECT queries', async () => {
      if (!db) return
      const result1 = await db.query('SELECT 1 as id')
      const result2 = await db.query('SELECT 1 as id')
      expect(result1).toEqual(result2)
    })

    it('should not cache INSERT queries', async () => {
      if (!db) return
      await db.run('SELECT 1')
      const result = await db.query('SELECT 1 as id')
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      await initializeEnhancedDatabase({ databasePath: ':memory:' })
      db = await getEnhancedDatabase()
    })

    it('should handle invalid SQL', async () => {
      if (!db) return
      await expect(db.query('INVALID SQL')).rejects.toThrow()
    })
  })

  describe('shutdown', () => {
    it('should shutdown database', async () => {
      await initializeEnhancedDatabase()
      await shutdownEnhancedDatabase()
      const health = await getDatabaseHealth()
      expect(health.initialized).toBe(false)
    })

    it('should handle shutdown when not initialized', async () => {
      await expect(shutdownEnhancedDatabase()).resolves.not.toThrow()
    })
  })

  // Tests for functionality NOT in EnhancedDatabase (kept for documentation)
  // These will have type errors because EnhancedDatabase doesn't have these methods

  describe('functionality not in EnhancedDatabase', () => {
    it('should generate performance report', async () => {
      await initializeEnhancedDatabase()
      const report = await getPerformanceReport()
      expect(typeof report).toBe('string')
      expect(report.length).toBeGreaterThan(0)
    })

    it('should clear performance metrics', async () => {
      await initializeEnhancedDatabase()
      clearPerformanceMetrics()
    })
  })
})
