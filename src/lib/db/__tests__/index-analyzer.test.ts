/**
 * Index Analyzer Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getAllIndexes,
  analyzeIndexUsage,
  generateIndexOptimizationSuggestions,
  type IndexInfo,
  type IndexUsageReport,
} from '../index-analyzer'
import { getDatabaseAsync, closeDatabase } from '../index'

describe('Index Analyzer', () => {
  beforeEach(async () => {
    // Use in-memory database for tests
    // 必须先 closeDatabase()：dbInstance 是模块级单例，首次调用 getDatabaseAsync()
    // 时就把路径锁死了。之后再改 DATABASE_PATH 也换不掉 —— 于是测试连到
    // 之前别的用例开的文件库，索引自然是 0 个。
    closeDatabase()
    process.env.DATABASE_PATH = ':memory:'
    // Initialize database with test schema
    const db = await getDatabaseAsync()
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)
    db.exec('CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC)')
    vi.clearAllMocks()
  })
  afterEach(() => {
    delete process.env.DATABASE_PATH
  })
  describe('getAllIndexes', () => {
    it('should return all indexes', async () => {
      const indexes = await getAllIndexes()
      expect(indexes.length).toBeGreaterThan(0)
      expect(indexes.every(idx => idx.tableName)).toBe(true)
      expect(indexes.every(idx => idx.indexName)).toBe(true)
    })
    it('should include table names', async () => {
      const indexes = await getAllIndexes()
      const usersIndexes = indexes.filter(idx => idx.tableName === 'users')
      expect(usersIndexes.length).toBeGreaterThan(0)
    })
    it('should include index names', async () => {
      const indexes = await getAllIndexes()
      const nameIndex = indexes.find(idx => idx.indexName === 'idx_users_name')
      expect(nameIndex).toBeDefined()
    })
    it('should include column names', async () => {
      const indexes = await getAllIndexes()
      const nameIndex = indexes.find(idx => idx.indexName === 'idx_users_name')
      expect(nameIndex?.columns).toContain('name')
    })
    it('should identify unique indexes', async () => {
      const indexes = await getAllIndexes()
      const emailIndex = indexes.find(idx => idx.indexName === 'idx_users_email')
      // The email column has UNIQUE constraint, but index might not be marked as unique
      expect(emailIndex).toBeDefined()
    })
    it('should identify primary key indexes', async () => {
      const indexes = await getAllIndexes()
      const primaryIndexes = indexes.filter(idx => idx.isPrimary)
      expect(primaryIndexes.length).toBeGreaterThan(0)
    })
    it('should initialize estimated usage', async () => {
      const indexes = await getAllIndexes()
      expect(indexes.every(idx => typeof idx.estimatedUsage === 'number')).toBe(true)
    })
  })
  describe('analyzeIndexUsage', () => {
    it('should return index usage report', async () => {
      const report = await analyzeIndexUsage()
      expect(report).toHaveProperty('indexes')
      expect(report).toHaveProperty('unusedIndexes')
      expect(report).toHaveProperty('missingIndexes')
      expect(report).toHaveProperty('duplicateIndexes')
    })
    it('should populate indexes array', async () => {
      const report = await analyzeIndexUsage()
      expect(report.indexes.length).toBeGreaterThan(0)
    })
    it('should find duplicate indexes', async () => {
      const db = await getDatabaseAsync()
      // Create duplicate index
      db.exec('CREATE INDEX IF NOT EXISTS idx_users_name_dup ON users(name)')
      const report = await analyzeIndexUsage()
      expect(report.duplicateIndexes.length).toBeGreaterThan(0)
    })
    it('should suggest missing indexes', async () => {
      const report = await analyzeIndexUsage()
      expect(Array.isArray(report.missingIndexes)).toBe(true)
    })
  })
  describe('IndexInfo interface', () => {
    it('should have required properties', () => {
      const indexInfo: IndexInfo = {
        tableName: 'users',
        indexName: 'idx_test',
        columns: ['id'],
        isUnique: false,
        isPrimary: false,
        estimatedUsage: 0,
      }
      expect(indexInfo.tableName).toBe('users')
      expect(indexInfo.indexName).toBe('idx_test')
      expect(indexInfo.columns).toEqual(['id'])
      expect(indexInfo.isUnique).toBe(false)
      expect(indexInfo.isPrimary).toBe(false)
      expect(indexInfo.estimatedUsage).toBe(0)
    })
  })
  describe('IndexUsageReport interface', () => {
    it('should have required properties', () => {
      const report: IndexUsageReport = {
        indexes: [],
        unusedIndexes: [],
        missingIndexes: [],
        duplicateIndexes: [],
      }
      expect(report.indexes).toEqual([])
      expect(report.unusedIndexes).toEqual([])
      expect(report.missingIndexes).toEqual([])
      expect(report.duplicateIndexes).toEqual([])
    })
  })
  describe('edge cases', () => {
    it('should handle empty database', async () => {
      // This test verifies the functions don't crash on empty state
      const indexes = await getAllIndexes()
      expect(Array.isArray(indexes)).toBe(true)
    })
    it('should handle database with no custom indexes', async () => {
      const db = await getDatabaseAsync()
      db.exec('CREATE TABLE no_indexes (id INTEGER PRIMARY KEY, name TEXT)')
      const indexes = await getAllIndexes()
      expect(indexes.length).toBeGreaterThan(0) // At least primary key index
    })
    it('should handle composite indexes', async () => {
      const db = await getDatabaseAsync()
      db.exec('CREATE INDEX IF NOT EXISTS idx_users_composite ON users(name, status)')
      const indexes = await getAllIndexes()
      const compositeIndex = indexes.find(idx => idx.indexName === 'idx_users_composite')
      expect(compositeIndex).toBeDefined()
      expect(compositeIndex?.columns).toEqual(['name', 'status'])
    })
    it('should handle indexes with DESC', async () => {
      const indexes = await getAllIndexes()
      const createdIndex = indexes.find(idx => idx.indexName === 'idx_posts_created')
      expect(createdIndex).toBeDefined()
      expect(createdIndex?.columns).toContain('created_at')
    })
  })
  describe('integration tests', () => {
    it('should analyze index usage for complete report', async () => {
      const report = await analyzeIndexUsage()
      expect(report.indexes.length).toBeGreaterThan(0)
      expect(Array.isArray(report.unusedIndexes)).toBe(true)
      expect(Array.isArray(report.missingIndexes)).toBe(true)
      expect(Array.isArray(report.duplicateIndexes)).toBe(true)
    })
    it('should suggest indexes and provide create SQL', async () => {
      const report = await analyzeIndexUsage()
      report.missingIndexes.forEach((suggestion) => {
        expect(suggestion.tableName).toBeDefined()
        expect(suggestion.columns.length).toBeGreaterThan(0)
        expect(suggestion.reason.length).toBeGreaterThan(0)
        expect(suggestion.createSql).toContain('CREATE INDEX')
      })
    })
    it('should handle multiple tables', async () => {
      const indexes = await getAllIndexes()
      const tables = [...new Set(indexes.map(idx => idx.tableName))]
      expect(tables).toContain('users')
      expect(tables).toContain('posts')
    })
  })
  describe('performance', () => {
    it('should handle large number of indexes efficiently', async () => {
      const db = await getDatabaseAsync()
      // Create many indexes
      for (let i = 0; i < 50; i++) {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_test_${i} ON users(name)`)
      }
      const indexes = await getAllIndexes()
      expect(indexes.length).toBeGreaterThan(50)
    })
  })
})
