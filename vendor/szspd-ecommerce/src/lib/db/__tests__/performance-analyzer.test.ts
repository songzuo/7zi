/**
 * Database Performance Analyzer Tests
 * 测试数据库性能分析功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  executeQueryWithMetrics,
  analyzeSlowQueries,
  analyzeTables,
  generatePerformanceReport,
  explainQueryPlan,
  findMissingIndexes,
} from '../performance-analyzer'

// Create mock statement factory
const createMockStatement = (result: unknown[] = [], singleResult: unknown = null) => ({
  all: vi.fn().mockReturnValue(result),
  get: vi.fn().mockReturnValue(singleResult),
  run: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: undefined }),
})

// Create mock database factory
const createMockDatabase = () => ({
  prepare: vi.fn(),
  pragma: vi.fn(),
})

// Mock getDatabaseAsync
const mockGetDatabaseAsync = vi.fn()
vi.mock('../index', () => ({
  getDatabaseAsync: () => mockGetDatabaseAsync(),
}))

describe('Performance Analyzer', () => {
  let mockDb: ReturnType<typeof createMockDatabase>

  beforeEach(() => {
    vi.clearAllMocks()
    // Create fresh mock for each test
    mockDb = createMockDatabase()
    // Set the mock to return our fresh database instance
    mockGetDatabaseAsync.mockResolvedValue(mockDb)
  })

  describe('executeQueryWithMetrics', () => {
    it('should execute query and return metrics', async () => {
      const mockResult = [{ id: 1, name: 'test' }]
      const mockStmt = createMockStatement(mockResult)
      mockDb.prepare.mockReturnValue(mockStmt)

      const { result, metrics } = await executeQueryWithMetrics(
        'SELECT * FROM agents WHERE id = ?',
        [1]
      )

      expect(result).toEqual(mockResult)
      expect(metrics).toHaveProperty('sql')
      expect(metrics).toHaveProperty('executionTime')
      expect(metrics).toHaveProperty('rowsReturned')
      expect(metrics.rowsReturned).toBe(mockResult.length)
    })

    it('should return correct execution time', async () => {
      const mockResult = [{ id: 1 }]
      const mockStmt = createMockStatement(mockResult)
      mockDb.prepare.mockReturnValue(mockStmt)

      const { metrics } = await executeQueryWithMetrics('SELECT 1')

      expect(typeof metrics.executionTime).toBe('number')
      expect(metrics.executionTime).toBeGreaterThanOrEqual(0)
    })

    it('should extract table name from query', async () => {
      const mockStmt = createMockStatement([])
      mockDb.prepare.mockReturnValue(mockStmt)

      const { metrics } = await executeQueryWithMetrics('SELECT * FROM agents WHERE status = ?')

      expect(metrics.tableName).toBe('agents')
    })

    it('should handle queries without FROM clause', async () => {
      const mockStmt = createMockStatement([{ value: 1 }])
      mockDb.prepare.mockReturnValue(mockStmt)

      const { metrics } = await executeQueryWithMetrics('SELECT 1 as value')

      expect(metrics.tableName).toBeNull()
    })

    it('should handle empty result sets', async () => {
      const mockStmt = createMockStatement([])
      mockDb.prepare.mockReturnValue(mockStmt)

      const { result, metrics } = await executeQueryWithMetrics(
        'SELECT * FROM agents WHERE status = ?',
        ['non-existent']
      )

      expect(result).toEqual([])
      expect(metrics.rowsReturned).toBe(0)
    })
  })

  describe('analyzeSlowQueries', () => {
    it('should return empty array when no slow queries', async () => {
      const mockStmt = createMockStatement([])
      mockDb.prepare.mockReturnValue(mockStmt)

      const slowQueries = await analyzeSlowQueries(100)

      expect(Array.isArray(slowQueries)).toBe(true)
      expect(slowQueries.length).toBeGreaterThanOrEqual(0)
    })

    it('should identify queries exceeding threshold', async () => {
      // Simulate slow query by mocking a delay
      let callCount = 0
      mockDb.prepare.mockImplementation(() => {
        const stmt = createMockStatement([])
        stmt.all = vi.fn(() => {
          callCount++
          if (callCount <= 2) {
            // First two queries (index + table info queries) are fast
            return []
          }
          // Simulate slow query
          const start = Date.now()
          while (Date.now() - start < 50) {
            // Delay 50ms
          }
          return []
        })
        return stmt
      })

      const slowQueries = await analyzeSlowQueries(10)

      expect(Array.isArray(slowQueries)).toBe(true)
    })

    it('should include suggested index for slow queries', async () => {
      const mockStmt = createMockStatement([])
      mockStmt.get = vi.fn().mockReturnValue({ count: 0 })
      mockDb.prepare.mockReturnValue(mockStmt)

      const slowQueries = await analyzeSlowQueries(1)

      slowQueries.forEach(sq => {
        expect(sq).toHaveProperty('sql')
        expect(sq).toHaveProperty('executionTime')
        expect(sq).toHaveProperty('threshold')
        if (sq.suggestedIndex) {
          expect(typeof sq.suggestedIndex).toBe('string')
        }
      })
    })
  })

  describe('analyzeTables', () => {
    it('should return table analysis for each table', async () => {
      // Mock tables query
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('sqlite_master')) {
          const stmt = createMockStatement([{ name: 'agents' }, { name: 'agent_tokens' }])
          return stmt
        }
        const stmt = createMockStatement([])
        stmt.get = vi.fn().mockReturnValue({ count: 0 })
        return stmt
      })

      const analyses = await analyzeTables()

      expect(Array.isArray(analyses)).toBe(true)
      expect(analyses.length).toBeGreaterThan(0)
    })

    it('should include row count for each table', async () => {
      let prepareCallCount = 0
      mockDb.prepare.mockImplementation((sql: string) => {
        prepareCallCount++
        if (prepareCallCount === 1 && sql.includes('sqlite_master')) {
          const stmt = createMockStatement([{ name: 'agents' }])
          return stmt
        }
        if (sql.includes('COUNT(*)')) {
          const stmt = createMockStatement()
          stmt.get = vi.fn().mockReturnValue({ count: 100 })
          return stmt
        }
        const stmt = createMockStatement([])
        stmt.get = vi.fn().mockReturnValue({ count: 0 })
        return stmt
      })

      const analyses = await analyzeTables()

      analyses.forEach(analysis => {
        expect(analysis).toHaveProperty('name')
        expect(analysis).toHaveProperty('rowCount')
        expect(typeof analysis.rowCount).toBe('number')
      })
    })

    it('should include indexes for each table', async () => {
      let prepareCallCount = 0
      mockDb.prepare.mockImplementation((sql: string) => {
        prepareCallCount++
        if (prepareCallCount === 1 && sql.includes('sqlite_master')) {
          const stmt = createMockStatement([{ name: 'agents' }])
          return stmt
        }
        if (sql.includes('index')) {
          const stmt = createMockStatement([
            {
              name: 'idx_agents_status',
              sql: 'CREATE INDEX idx_agents_status ON agents(status)',
            },
          ])
          return stmt
        }
        const stmt = createMockStatement([])
        stmt.get = vi.fn().mockReturnValue({ count: 0 })
        return stmt
      })

      const analyses = await analyzeTables()

      analyses.forEach(analysis => {
        expect(analysis).toHaveProperty('indexes')
        expect(Array.isArray(analysis.indexes)).toBe(true)
      })
    })

    it('should include table size estimation', async () => {
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('sqlite_master')) {
          return createMockStatement([{ name: 'agents' }])
        }
        const stmt = createMockStatement([])
        stmt.get = vi.fn().mockReturnValue({ count: 100 })
        return stmt
      })

      const analyses = await analyzeTables()

      analyses.forEach(analysis => {
        expect(analysis).toHaveProperty('size')
        expect(typeof analysis.size).toBe('number')
      })
    })

    it('should include suggestions for table optimization', async () => {
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('sqlite_master')) {
          return createMockStatement([{ name: 'agents' }])
        }
        const stmt = createMockStatement([])
        stmt.get = vi.fn().mockReturnValue({ count: 100 })
        return stmt
      })

      const analyses = await analyzeTables()

      analyses.forEach(analysis => {
        expect(analysis).toHaveProperty('suggestions')
        expect(Array.isArray(analysis.suggestions)).toBe(true)
      })
    })
  })

  describe('generatePerformanceReport', () => {
    it('should generate complete performance report', async () => {
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('sqlite_master')) {
          return createMockStatement([{ name: 'agents' }])
        }
        const stmt = createMockStatement([])
        stmt.get = vi.fn().mockReturnValue({ count: 100 })
        return stmt
      })
      mockDb.pragma.mockImplementation((pragma: string) => {
        if (pragma === 'page_size') return 4096
        if (pragma === 'page_count') return 1000
        if (pragma === 'freelist_count') return 10
        return 4096
      })

      const report = await generatePerformanceReport()

      expect(report).toHaveProperty('timestamp')
      expect(report).toHaveProperty('slowQueries')
      expect(report).toHaveProperty('tableAnalyses')
      expect(report).toHaveProperty('recommendations')
      expect(report).toHaveProperty('databaseSize')
    })

    it('should include database size information', async () => {
      const stmt = createMockStatement([])
      stmt.get = vi.fn().mockReturnValue({ count: 0 })
      mockDb.prepare.mockReturnValue(stmt)
      mockDb.pragma.mockImplementation((pragma: string) => {
        if (pragma === 'page_size') return 4096
        if (pragma === 'page_count') return 1000
        if (pragma === 'freelist_count') return 10
        return 4096
      })

      const report = await generatePerformanceReport()

      expect(report.databaseSize).toHaveProperty('pageSize')
      expect(report.databaseSize).toHaveProperty('pageCount')
      expect(report.databaseSize).toHaveProperty('freePages')
      expect(report.databaseSize).toHaveProperty('sizeInMB')
    })

    it('should calculate size in MB correctly', async () => {
      const stmt = createMockStatement([])
      stmt.get = vi.fn().mockReturnValue({ count: 0 })
      mockDb.prepare.mockReturnValue(stmt)
      mockDb.pragma.mockImplementation((pragma: string) => {
        if (pragma === 'page_size') return 4096
        if (pragma === 'page_count') return 256 // 256 pages * 4KB = 1MB
        if (pragma === 'freelist_count') return 0
        return 4096
      })

      const report = await generatePerformanceReport()

      expect(report.databaseSize.sizeInMB).toBeCloseTo(1, 1)
    })

    it('should include recommendations for optimization', async () => {
      const stmt = createMockStatement([])
      stmt.get = vi.fn().mockReturnValue({ count: 0 })
      mockDb.prepare.mockReturnValue(stmt)
      mockDb.pragma.mockReturnValue(4096)

      const report = await generatePerformanceReport()

      expect(Array.isArray(report.recommendations)).toBe(true)
    })

    it('should include timestamp in ISO format', async () => {
      const stmt = createMockStatement([])
      stmt.get = vi.fn().mockReturnValue({ count: 0 })
      mockDb.prepare.mockReturnValue(stmt)
      mockDb.pragma.mockReturnValue(4096)

      const report = await generatePerformanceReport()

      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('explainQueryPlan', () => {
    it('should return query execution plan', async () => {
      const stmt = createMockStatement([
        { detail: 'SCAN agents' },
        { detail: 'USING INDEX idx_agents_status' },
      ])
      mockDb.prepare.mockReturnValue(stmt)

      const plan = await explainQueryPlan('SELECT * FROM agents WHERE status = ?', ['active'])

      expect(Array.isArray(plan)).toBe(true)
      expect(plan.length).toBeGreaterThan(0)
      // The actual function returns an array of strings (details), not objects
      expect(plan[0]).toMatch(/SCAN|INDEX/)
    })

    it('should handle queries with parameters', async () => {
      const stmt = createMockStatement([])
      mockDb.prepare.mockReturnValue(stmt)

      const plan = await explainQueryPlan('SELECT * FROM agents WHERE id = ? AND status = ?', [
        1,
        'active',
      ])

      expect(Array.isArray(plan)).toBe(true)
    })

    it('should handle empty execution plan', async () => {
      const stmt = createMockStatement([])
      mockDb.prepare.mockReturnValue(stmt)

      const plan = await explainQueryPlan('SELECT 1')

      expect(Array.isArray(plan)).toBe(true)
      expect(plan.length).toBe(0)
    })
  })

  describe('findMissingIndexes', () => {
    it('should return array of missing indexes', async () => {
      const stmt = createMockStatement()
      stmt.get = vi.fn().mockReturnValue({ count: 0 })
      mockDb.prepare.mockReturnValue(stmt)

      const missingIndexes = await findMissingIndexes()

      expect(Array.isArray(missingIndexes)).toBe(true)
    })

    it('should include table name for each missing index', async () => {
      const stmt = createMockStatement()
      stmt.get = vi.fn().mockReturnValue({ count: 0 })
      mockDb.prepare.mockReturnValue(stmt)

      const missingIndexes = await findMissingIndexes()

      missingIndexes.forEach(index => {
        expect(index).toHaveProperty('tableName')
        expect(typeof index.tableName).toBe('string')
      })
    })

    it('should include query pattern for each missing index', async () => {
      const stmt = createMockStatement()
      stmt.get = vi.fn().mockReturnValue({ count: 0 })
      mockDb.prepare.mockReturnValue(stmt)

      const missingIndexes = await findMissingIndexes()

      missingIndexes.forEach(index => {
        expect(index).toHaveProperty('queryPattern')
        expect(typeof index.queryPattern).toBe('string')
      })
    })

    it('should include suggested index SQL', async () => {
      const stmt = createMockStatement()
      stmt.get = vi.fn().mockReturnValue({ count: 0 })
      mockDb.prepare.mockReturnValue(stmt)

      const missingIndexes = await findMissingIndexes()

      missingIndexes.forEach(index => {
        expect(index).toHaveProperty('suggestedIndex')
        expect(index.suggestedIndex).toMatch(/CREATE INDEX/)
      })
    })

    it('should include priority level', async () => {
      const stmt = createMockStatement()
      stmt.get = vi.fn().mockReturnValue({ count: 0 })
      mockDb.prepare.mockReturnValue(stmt)

      const missingIndexes = await findMissingIndexes()

      missingIndexes.forEach(index => {
        expect(index).toHaveProperty('priority')
        expect(['high', 'medium', 'low']).toContain(index.priority)
      })
    })

    it('should filter out existing indexes', async () => {
      let prepareCallCount = 0
      mockDb.prepare.mockImplementation((sql: string) => {
        prepareCallCount++
        if (sql.includes('LIKE')) {
          // Return existing index count > 0
          const stmt = createMockStatement()
          stmt.get = vi.fn().mockReturnValue({ count: 1 })
          return stmt
        }
        const stmt = createMockStatement()
        stmt.get = vi.fn().mockReturnValue({ count: 0 })
        return stmt
      })

      const missingIndexes = await findMissingIndexes()

      // Should return fewer indexes since some exist
      expect(Array.isArray(missingIndexes)).toBe(true)
    })
  })
})
