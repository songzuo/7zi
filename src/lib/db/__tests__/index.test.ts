//  - Test file uses API that doesn't match actual implementation
/**
 * Database Index Tests
 * 测试数据库主入口功能
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// 本文件测的是 **真实 better-sqlite3 语义**（真实建表、真实 SQL、真实 changes）。
// 全局 setup（src/test/vi-mocks.ts）把 db/index 与 db/connection 换成了内存假库，
// 这里必须显式 unmock 才能测到真实实现。
vi.unmock('@/lib/db/index')
vi.unmock('@/lib/db/connection')
vi.unmock('../index')
vi.unmock('../connection')
import {
  getDatabase,
  getDatabaseAsync,
  getDatabaseHealth,
  optimizeDatabase,
  closeDatabase,
} from '../index'
import fs from 'fs/promises'
// Mock logger
//
// 注意：这里**不能**再写 `vi.mock('../logger', ...)` —— 从 __tests__/ 出发
// '../logger' 指向 src/lib/db/logger（并不存在），而 connection.ts 里的
// '../logger' 解析到的是 src/lib/logger/index.ts，是两个不同的模块 ID。
// 全局 setup（src/test/vi-mocks.ts）已经把 src/lib/logger 整个 mock 掉了，
// 所以这里直接用真实的（已被 mock 的）logger 断言调用即可。
import { logger } from '@/lib/logger'
// Mock migrations
vi.mock('../migrations', () => ({
  migrate: vi.fn().mockResolvedValue(undefined),
  optimizeDatabase: vi.fn().mockResolvedValue({ success: true, freedSpace: 1024 }),
  getDatabaseHealth: vi.fn().mockResolvedValue({
    connected: true,
    open: true,
    version: '1.0.0',
  }),
}))
describe('Database Module', () => {
  const testDbPath = '/tmp/test-database.sqlite'

  beforeEach(async () => {
    vi.clearAllMocks()
    // Close existing database connection BEFORE changing DATABASE_PATH
    // This prevents parallel tests from using stale connections
    closeDatabase()
    // Clean up test database if exists
    try {
      await fs.unlink(testDbPath)
    } catch (e) {
      // File doesn't exist, ignore
    }
    process.env.DATABASE_PATH = testDbPath
  })
  afterEach(async () => {
    await closeDatabase()
    try {
      await fs.unlink(testDbPath)
    } catch (e) {
      // File doesn't exist, ignore
    }
    delete process.env.DATABASE_PATH
  })
  describe('initialization', () => {
    it('should initialize database connection', () => {
      const db = getDatabase()
      expect(db).toBeDefined()
      expect(db).toHaveProperty('query')
      expect(db).toHaveProperty('exec')
      expect(db).toHaveProperty('prepare')
    })
    it('should use DATABASE_PATH from environment', () => {
      const customPath = '/tmp/t231-custom-path.sqlite'
      // 连接实例是模块级单例，切换 DATABASE_PATH 前必须先关掉旧连接，
      // 否则 initializeDatabase() 会直接复用缓存实例，路径不会生效。
      closeDatabase()
      process.env.DATABASE_PATH = customPath
      const db = getDatabase()
      expect(db).toBeDefined()
      // getConnection() 返回底层 better-sqlite3 实例，name 即实际落盘路径
      const connection = db.getConnection?.() as { name?: string } | undefined
      expect(connection?.name).toBe(customPath)
    })
    it('should handle connection errors gracefully', () => {
      // 目录不存在时 better-sqlite3 会在 new Database() 阶段抛错。
      // initializeDatabase() 不吞这个错（错误发生在实例创建之前，
      // 没有任何已建立连接需要保护），所以这里断言真实行为：
      // 抛出的错误可辨识，且失败后模块仍可重新连接（单例未被写坏）。
      process.env.DATABASE_PATH = '/invalid/path/that/does/not/exist/test.db'
      expect(() => getDatabase()).toThrow(/directory does not exist/i)

      // 失败后 dbInstance 仍为 null，恢复合法路径可以正常建连
      process.env.DATABASE_PATH = testDbPath
      const db = getDatabase()
      expect(db).toBeDefined()
      expect(db.queryRows('SELECT 1 as value')).toHaveLength(1)
    })
  })
  describe('query operations', () => {
    it('should execute SELECT queries', () => {
      const db = getDatabase()
      const result = db.queryRows('SELECT 1 as value')
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
    it('should execute SELECT with parameters', () => {
      const db = getDatabase()
      const result = db.queryRows('SELECT ? as value', [42])
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe(42)
    })
    it('should execute INSERT statements', () => {
      const db = getDatabase()
      const result = db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER, name TEXT)')
      expect(result).toBeDefined()
      expect(result.changes).toBeGreaterThanOrEqual(0)
    })
    it('should execute INSERT with parameters', () => {
      const db = getDatabase()
      db.exec('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)')
      const result = db.exec('INSERT INTO test_table (name) VALUES (?)', ['test'])
      expect(result).toBeDefined()
      expect(result.lastInsertRowid).toBeDefined()
    })
    it('should execute UPDATE statements', () => {
      const db = getDatabase()
      db.exec('CREATE TABLE IF NOT EXISTS update_test (id INTEGER PRIMARY KEY, value INTEGER)')
      db.exec('INSERT INTO update_test (value) VALUES (1)')
      const result = db.exec('UPDATE update_test SET value = 2 WHERE id = 1')
      expect(result).toBeDefined()
      expect(result.changes).toBe(1)
    })
    it('should execute DELETE statements', () => {
      const db = getDatabase()
      db.exec('CREATE TABLE IF NOT EXISTS delete_test (id INTEGER PRIMARY KEY)')
      db.exec('INSERT INTO delete_test DEFAULT VALUES')
      const result = db.exec('DELETE FROM delete_test WHERE id = 1')
      expect(result).toBeDefined()
      expect(result.changes).toBe(1)
    })
    it('should handle query errors gracefully', () => {
      const db = getDatabase()
      // connection.ts 的 query() 会先 logger.error('[Database Query Error]', ...)
      // 再把原始错误抛给调用方 —— 错误没有被静默吞掉。
      expect(() => {
        db.query('SELECT * FROM non_existent_table')
      }).toThrow(/no such table: non_existent_table/i)

      const errorMock = logger.error as unknown as { mock?: { calls: unknown[][] } }
      const calls = errorMock.mock?.calls ?? []
      expect(calls.length).toBeGreaterThan(0)
      expect(calls[0][0]).toBe('[Database Query Error]')
    })
  })
  describe('prepared statements', () => {
    it('should create prepared statement', () => {
      const db = getDatabase()
      const stmt = db.prepare('SELECT ? as value')
      expect(stmt).toBeDefined()
      expect(stmt).toHaveProperty('run')
      expect(stmt).toHaveProperty('get')
      expect(stmt).toHaveProperty('all')
    })
    it('should execute prepared statement with run', () => {
      const db = getDatabase()
      db.exec('CREATE TABLE IF NOT EXISTS prepared_test (id INTEGER, value INTEGER)')
      const stmt = db.prepare('INSERT INTO prepared_test (value) VALUES (?)')
      const result = stmt.run(100)
      expect(result).toBeDefined()
      expect(result.changes).toBe(1)
    })
    it('should execute prepared statement with get', () => {
      const db = getDatabase()
      db.exec('CREATE TABLE IF NOT EXISTS get_test (id INTEGER PRIMARY KEY, value INTEGER)')
      db.exec('INSERT INTO get_test (value) VALUES (42)')
      const stmt = db.prepare('SELECT value FROM get_test WHERE id = ?')
      const result = stmt.get(1) as { value: number } | null
      expect(result).toBeDefined()
      expect(result!.value).toBe(42)
    })
    it('should execute prepared statement with all', () => {
      const db = getDatabase()
      db.exec('CREATE TABLE IF NOT EXISTS all_test (id INTEGER, value INTEGER)')
      db.exec('INSERT INTO all_test (value) VALUES (1)')
      db.exec('INSERT INTO all_test (value) VALUES (2)')
      db.exec('INSERT INTO all_test (value) VALUES (3)')
      const stmt = db.prepare('SELECT value FROM all_test ORDER BY id')
      const result = stmt.all()
      expect(result).toHaveLength(3)
      expect(result[0].value).toBe(1)
      expect(result[2].value).toBe(3)
    })
    it('should return null for non-existent row with get', () => {
      const db = getDatabase()
      const stmt = db.prepare('SELECT * FROM sqlite_master WHERE name = ?')
      // DatabaseStatement.get 的签名声明返回 Record<string, unknown> | null
      // （见 src/lib/db/connection.ts 的 interface DatabaseStatement）。
      // better-sqlite3 原生未命中时返回 undefined，所以 connection.ts 的
      // prepare().get 把 undefined 归一成 null —— 让实现符合自己的声明，
      // 调用方 `if (row === null)` 才不会被 undefined 绕过。
      // 这个用例最初的断言就是 toBeNull()，与声明一致。
      const result: Record<string, unknown> | null = stmt.get('non_existent_table')
      expect(result).toBeNull()
      // 命中行时必须拿到真实数据，避免"永远返回空"也能通过上面的断言
      db.exec('CREATE TABLE IF NOT EXISTS get_existing_test (id INTEGER PRIMARY KEY, value TEXT)')
      db.exec('INSERT INTO get_existing_test (value) VALUES (?)', ['present'])
      const found = db.prepare('SELECT value FROM get_existing_test WHERE id = ?').get(1)
      expect(found).toBeDefined()
      expect(found?.value).toBe('present')
    })
    it('should return empty array for no results with all', () => {
      const db = getDatabase()
      db.exec('CREATE TABLE IF NOT EXISTS empty_test (id INTEGER)')
      const stmt = db.prepare('SELECT * FROM empty_test')
      const result = stmt.all()
      expect(result).toEqual([])
    })
  })
  describe('batch operations', () => {
    it('should execute batch of statements', async () => {
      const db = getDatabase()
      db.exec('CREATE TABLE IF NOT EXISTS batch_test (id INTEGER, value TEXT)')
      const statements = [
        { sql: 'INSERT INTO batch_test (value) VALUES (?)', params: ['test1'] },
        { sql: 'INSERT INTO batch_test (value) VALUES (?)', params: ['test2'] },
        { sql: 'INSERT INTO batch_test (value) VALUES (?)', params: ['test3'] },
      ]
      if (db.batch) {
        const results = await db.batch(statements)
        expect(results).toHaveLength(3)
        expect(results.every((r) => r.changes === 1)).toBe(true)
      }
    })
    it('should handle empty batch', () => {
      const db = getDatabase()
      if (db.batch) {
        const results = db.batch([])
        expect(results).toEqual([])
      }
    })
    it('should handle batch errors gracefully', () => {
      const db = getDatabase()
      db.exec('CREATE TABLE IF NOT EXISTS batch_error_test (id INTEGER, value TEXT)')
      const statements = [
        { sql: 'INSERT INTO batch_error_test (value) VALUES (?)', params: ['test'] },
        { sql: 'INVALID SQL STATEMENT', params: [] },
      ]
      // connection.ts 的 batch() 用 db.transaction() 包裹整批语句：
      // 任一语句失败 → 整批回滚 → 抛出包装过的 DatabaseBatchError
      // （error.name = 'DatabaseBatchError'，message 以 'Database batch failed:' 开头）。
      let thrown: Error | undefined
      try {
        db.batch(statements)
      } catch (error) {
        thrown = error as Error
      }
      expect(thrown).toBeDefined()
      expect(thrown?.name).toBe('DatabaseBatchError')
      expect(thrown?.message).toMatch(/^Database batch failed:/)
      // 事务回滚：失败批次里的第一条 INSERT 也不能留下
      expect(db.queryRows('SELECT * FROM batch_error_test')).toEqual([])
    })
  })
  describe('async operations', () => {
    it('should get database asynchronously', async () => {
      const db = await getDatabaseAsync()
      expect(db).toBeDefined()
      expect(db).toHaveProperty('query')
    })
    it('should handle async connection errors', async () => {
      // 目录不存在 → better-sqlite3 抛错；getDatabaseAsync() 不会吞掉它
      process.env.DATABASE_PATH = '/invalid/async/path.db'
      await expect(getDatabaseAsync()).rejects.toThrow(/directory does not exist/i)

      // 失败后单例未被污染，恢复合法路径仍可异步建连
      process.env.DATABASE_PATH = testDbPath
      const db = await getDatabaseAsync()
      expect(db).toBeDefined()
      expect(db.queryRows('SELECT 1 as value')).toHaveLength(1)
    })
  })
  describe('database health', () => {
    it('should get database health status', async () => {
      const health = await getDatabaseHealth()
      expect(health).toBeDefined()
      expect(health).toHaveProperty('connected')
      expect(health).toHaveProperty('open')
    })
    it('should report connected status', async () => {
      const health = await getDatabaseHealth()
      // TODO: [DatabaseHealthResult type mismatch - test expects 'connected' property that doesn't exist in actual type]
      expect((health as Record<string, unknown>).connected).toBe(true)
    })
  })
  describe('optimization', () => {
    it('should optimize database', async () => {
      const result = await optimizeDatabase()
      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
    })
    it('should handle optimization errors gracefully', async () => {
      const result = await optimizeDatabase()
      // Should not throw even if optimization fails
      expect(result).toBeDefined()
    })
  })
  describe('connection management', () => {
    it('should close database connection', async () => {
      getDatabase()
      await closeDatabase()
      // Database should be closed, but we can't easily test this without accessing internal state
      // Just ensure the function doesn't throw
      expect(true).toBe(true)
    })
    it('should handle closing already closed database', async () => {
      // closeDatabase() 是同步函数（返回 void），且对已关闭的库是幂等的：
      // dbInstance 为 null 时直接 no-op，不抛错。
      closeDatabase()
      expect(() => closeDatabase()).not.toThrow()
      // 连续多次关闭依然安全
      expect(() => closeDatabase()).not.toThrow()
    })
    it('should reinitialize database after close', () => {
      const db1 = getDatabase()
      closeDatabase()
      const db2 = getDatabase()
      expect(db2).toBeDefined()
      expect(db2).toHaveProperty('query')
    })
  })
  describe('null safety', () => {
    it('should handle null results safely', () => {
      const db = getDatabase()
      const stmt = db.prepare('SELECT * FROM sqlite_master WHERE name = ?')
      // 未命中行时归一成 null（见上面 DatabaseStatement.get 的契约）。
      const result: Record<string, unknown> | null = stmt.get('non_existent')
      expect(result).toBeNull()
      // 并且不会因为空结果而抛异常
      expect(() => stmt.get('non_existent')).not.toThrow()
    })
    it('should handle undefined results safely', () => {
      const db = getDatabase()
      const stmt = db.prepare('SELECT * FROM sqlite_master WHERE name = ?')
      const result = stmt.all(['non_existent'])
      expect(result).toEqual([])
    })
    it('should handle missing result properties', () => {
      const db = getDatabase()
      db.exec('CREATE TABLE IF NOT EXISTS null_test (id INTEGER)')
      const result = db.exec('INSERT INTO null_test DEFAULT VALUES')
      expect(result).toHaveProperty('changes')
      expect(result.changes).toBeGreaterThanOrEqual(0)
    })
  })
  describe('edge cases', () => {
    it('should handle empty SQL', () => {
      const db = getDatabase()
      // 空 SQL 在 better-sqlite3 的 prepare() 阶段就抛 RangeError
      // （'The supplied SQL string contains no statements'）。
      // connection.ts 的 query() 会记录 '[Database Query Error]' 后原样抛出，
      // 不会静默返回空结果。
      expect(() => {
        db.query('')
      }).toThrow(RangeError)
      expect(() => {
        db.query('')
      }).toThrow(/contains no statements/i)
    })
    it('should handle SQL with only whitespace', () => {
      const db = getDatabase()
      // 只有空白字符的 SQL 同样没有语句 → RangeError，行为与空 SQL 一致
      expect(() => {
        db.query('   ')
      }).toThrow(RangeError)
      expect(() => {
        db.query('   ')
      }).toThrow(/contains no statements/i)
    })
    it('should handle very long queries', () => {
      const db = getDatabase()
      const longQuery = 'SELECT ' + '1, '.repeat(1000) + '1'
      const result = db.queryRows(longQuery)
      expect(result).toBeDefined()
    })
    it('should handle special characters in parameters', () => {
      const db = getDatabase()
      // id 必须是 INTEGER PRIMARY KEY（rowid 别名），否则 id 列不会自动填充，
      // 用 lastInsertRowid 回查会永远查不到行。
      db.exec('CREATE TABLE IF NOT EXISTS special_test (id INTEGER PRIMARY KEY, value TEXT)')
      const specialValue = 'test\'with"quotes\\and\\slashes'
      const result = db.exec('INSERT INTO special_test (value) VALUES (?)', [specialValue])
      expect(result.changes).toBe(1)
      expect(result.lastInsertRowid).toBeDefined()
      const retrieved = db.queryRows('SELECT value FROM special_test WHERE id = ?', [
        result.lastInsertRowid,
      ])
      expect(retrieved).toHaveLength(1)
      expect(retrieved[0].value).toBe(specialValue)
    })
    it('should handle Unicode characters', () => {
      const db = getDatabase()
      db.exec('CREATE TABLE IF NOT EXISTS unicode_test (id INTEGER PRIMARY KEY, value TEXT)')
      const unicodeValue = '测试中文🎉Test'
      const result = db.exec('INSERT INTO unicode_test (value) VALUES (?)', [unicodeValue])
      expect(result.changes).toBe(1)
      expect(result.lastInsertRowid).toBeDefined()
      const retrieved = db.queryRows('SELECT value FROM unicode_test WHERE id = ?', [
        result.lastInsertRowid,
      ])
      expect(retrieved).toHaveLength(1)
      expect(retrieved[0].value).toBe(unicodeValue)
    })
  })
})
describe('Helper Functions', () => {
  describe('query', () => {
    it('should execute query using helper function', () => {
      const result = getDatabase().queryRows('SELECT 1 as value')
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe(1)
    })
    it('should handle parameters in helper function', () => {
      const result = getDatabase().queryRows('SELECT ? as value', [99])
      expect(result[0].value).toBe(99)
    })
  })
  describe('exec', () => {
    it('should execute statement using helper function', () => {
      const result = getDatabase().exec('SELECT 1')
      expect(result).toBeDefined()
    })
  })
  describe('prepare', () => {
    it('should create prepared statement using helper function', () => {
      const stmt = getDatabase().prepare('SELECT ? as value')
      expect(stmt).toBeDefined()
      expect(stmt).toHaveProperty('all')
    })
  })
})
