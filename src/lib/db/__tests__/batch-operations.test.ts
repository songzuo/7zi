/**
 * Batch Operations Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  batchInsert,
  batchUpdate,
  batchDelete,
  batchExecute,
  calculateOptimalBatchSize,
  analyzeBatchPerformance,
} from '../batch-operations'
import { getDatabase } from '../index'

// 本文件测试的是 **真实 better-sqlite3 实现**（真实表、真实事务、真实 changes）。
// 全局 setup（src/test/vi-mocks.ts）把 '@/lib/db/index' 与 '@/lib/db/connection'
// 整体替换成了内存假库 —— 假库的 SQL 解析器不认 INSERT INTO ... VALUES (?)，
// 于是批量插入恒为 0 行。这里必须显式 unmock，mock 路径覆盖被测实现真正依赖的
// 模块：batch-operations.ts import 自 './connection'，index.ts 亦然。
vi.unmock('@/lib/db/index')
vi.unmock('@/lib/db/connection')
vi.unmock('../index')
vi.unmock('../connection')

describe('Batch Operations', () => {
  let db: ReturnType<typeof getDatabase>

  beforeEach(() => {
    db = getDatabase()
    // Create test table
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `)
  })

  afterEach(() => {
    // Cleanup test table
    db.exec('DROP TABLE IF EXISTS test_agents')
  })

  describe('batchInsert', () => {
    it('should insert records in batches', async () => {
      const records = Array.from({ length: 100 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        status: i % 2 === 0 ? 'active' : 'inactive',
      }))

      const result = await batchInsert('test_agents', records, {
        batchSize: 50,
        useTransaction: true,
      })

      expect(result.success).toBe(100)
      expect(result.failed).toBe(0)
      expect(result.batches).toBe(2)
      expect(result.errors).toHaveLength(0)
      expect(result.executionTimeMs).toBeGreaterThan(0)
    })

    it('should handle onConflict = ignore', async () => {
      const records = [
        { id: 'agent-1', name: 'Agent 1', status: 'active' },
        { id: 'agent-1', name: 'Agent 1 Updated', status: 'inactive' },
      ]

      const result = await batchInsert('test_agents', records, {
        onConflict: 'ignore',
      })

      expect(result.success).toBeGreaterThan(0)

      // Verify only one record was inserted
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM test_agents')
      const { count } = countStmt.get() as { count: number }
      expect(count).toBe(1)
    })

    it('should handle onConflict = replace', async () => {
      const records = [
        { id: 'agent-1', name: 'Agent 1', status: 'active' },
        { id: 'agent-1', name: 'Agent 1 Updated', status: 'inactive' },
      ]

      const result = await batchInsert('test_agents', records, {
        onConflict: 'replace',
      })

      expect(result.success).toBeGreaterThan(0)

      // Verify the record was replaced
      const stmt = db.prepare('SELECT * FROM test_agents WHERE id = ?')
      const record = stmt.get('agent-1') as { name: string; status: string }
      expect(record.name).toBe('Agent 1 Updated')
      expect(record.status).toBe('inactive')
    })

    it('should call onProgress callback', async () => {
      const records = Array.from({ length: 250 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        status: 'active',
      }))

      const progressCalls: Array<[number, number, number]> = []

      await batchInsert('test_agents', records, {
        batchSize: 100,
        onProgress: (processed, total, batch) => {
          progressCalls.push([processed, total, batch])
        },
      })

      expect(progressCalls).toHaveLength(3)
      expect(progressCalls[0]).toEqual([100, 250, 1])
      expect(progressCalls[1]).toEqual([200, 250, 2])
      expect(progressCalls[2]).toEqual([250, 250, 3])
    })

    it('should handle empty records', async () => {
      const result = await batchInsert('test_agents', [])

      expect(result.success).toBe(0)
      expect(result.total).toBe(0)
      expect(result.batches).toBe(0)
    })
  })

  describe('batchUpdate', () => {
    beforeEach(() => {
      // Insert initial records
      const records = Array.from({ length: 50 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        status: 'active',
      }))

      // 真实 better-sqlite3 的 prepare().run() 要求参数个数与占位符个数严格一致，
      // 不能一次拍平 50×3 个参数（内存假库宽松，所以以前没暴露）。
      // 逐条插入。
      const stmt = db.prepare('INSERT INTO test_agents (id, name, status) VALUES (?, ?, ?)')
      for (const r of records) {
        stmt.run(r.id, r.name, r.status)
      }
    })

    it('should update records in batches', async () => {
      const updates = Array.from({ length: 50 }, (_, i) => ({
        id: `agent-${i}`,
        status: i % 2 === 0 ? 'inactive' : 'active',
      }))

      const result = await batchUpdate('test_agents', 'id', updates, {
        batchSize: 25,
      })

      expect(result.success).toBeGreaterThan(0)
      expect(result.batches).toBe(2)

      // Verify updates
      const stmt = db.prepare('SELECT status FROM test_agents WHERE id = ?')
      const status0 = stmt.get('agent-0') as { status: string }
      const status1 = stmt.get('agent-1') as { status: string }
      expect(status0.status).toBe('inactive')
      expect(status1.status).toBe('active')
    })

    it('should update multiple columns', async () => {
      const updates = [
        { id: 'agent-0', status: 'inactive', name: 'Updated Agent 0' },
        { id: 'agent-1', status: 'active', name: 'Updated Agent 1' },
      ]

      const result = await batchUpdate('test_agents', 'id', updates)

      expect(result.success).toBeGreaterThan(0)

      // Verify both columns were updated
      const stmt = db.prepare('SELECT * FROM test_agents WHERE id = ?')
      const agent0 = stmt.get('agent-0') as { name: string; status: string }
      expect(agent0.name).toBe('Updated Agent 0')
      expect(agent0.status).toBe('inactive')
    })

    it('should handle empty updates', async () => {
      const result = await batchUpdate('test_agents', 'id', [])

      expect(result.success).toBe(0)
      expect(result.total).toBe(0)
      expect(result.batches).toBe(0)
    })
  })

  describe('batchDelete', () => {
    beforeEach(() => {
      // Insert initial records
      const records = Array.from({ length: 100 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        status: 'active',
      }))

      // 真实 better-sqlite3 的 prepare().run() 要求参数个数与占位符个数严格一致，
      // 不能一次拍平 50×3 个参数（内存假库宽松，所以以前没暴露）。
      // 逐条插入。
      const stmt = db.prepare('INSERT INTO test_agents (id, name, status) VALUES (?, ?, ?)')
      for (const r of records) {
        stmt.run(r.id, r.name, r.status)
      }
    })

    it('should delete records in batches', async () => {
      const ids = Array.from({ length: 50 }, (_, i) => `agent-${i}`)

      const deleted = await batchDelete('test_agents', ids, 'id', 25)

      expect(deleted).toBe(50)

      // Verify deletions
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM test_agents')
      const { count } = countStmt.get() as { count: number }
      expect(count).toBe(50)
    })

    it('should handle empty ids', async () => {
      const deleted = await batchDelete('test_agents', [], 'id')

      expect(deleted).toBe(0)
    })

    it('should handle non-existent ids', async () => {
      const deleted = await batchDelete('test_agents', ['non-existent-1', 'non-existent-2'], 'id')

      expect(deleted).toBe(0)
    })
  })

  describe('batchExecute', () => {
    beforeEach(() => {
      // Insert initial records
      const records = Array.from({ length: 10 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        status: 'active',
      }))

      // 真实 better-sqlite3 的 prepare().run() 要求参数个数与占位符个数严格一致，
      // 不能一次拍平 50×3 个参数（内存假库宽松，所以以前没暴露）。
      // 逐条插入。
      const stmt = db.prepare('INSERT INTO test_agents (id, name, status) VALUES (?, ?, ?)')
      for (const r of records) {
        stmt.run(r.id, r.name, r.status)
      }
    })

    it('should execute multiple statements in transaction', async () => {
      const statements = [
        { sql: 'UPDATE test_agents SET status = ? WHERE id = ?', params: ['inactive', 'agent-0'] },
        { sql: 'UPDATE test_agents SET status = ? WHERE id = ?', params: ['inactive', 'agent-1'] },
        {
          sql: 'UPDATE test_agents SET name = ? WHERE id = ?',
          params: ['Updated Agent 2', 'agent-2'],
        },
      ]

      const results = await batchExecute(statements, true)

      expect(results).toHaveLength(3)
      expect(results[0].changes).toBeGreaterThan(0)
      expect(results[1].changes).toBeGreaterThan(0)
      expect(results[2].changes).toBeGreaterThan(0)

      // Verify updates
      const stmt = db.prepare('SELECT * FROM test_agents WHERE id = ?')
      const agent0 = stmt.get('agent-0') as { status: string }
      const agent2 = stmt.get('agent-2') as { name: string }
      expect(agent0.status).toBe('inactive')
      expect(agent2.name).toBe('Updated Agent 2')
    })

    it('should execute statements without transaction', async () => {
      const statements = [
        { sql: 'UPDATE test_agents SET status = ? WHERE id = ?', params: ['inactive', 'agent-0'] },
        { sql: 'UPDATE test_agents SET status = ? WHERE id = ?', params: ['inactive', 'agent-1'] },
      ]

      const results = await batchExecute(statements, false)

      expect(results).toHaveLength(2)
      expect(results.every(r => r.changes > 0)).toBe(true)
    })
  })

  describe('calculateOptimalBatchSize', () => {
    it('should calculate optimal batch size', () => {
      const batchSize = calculateOptimalBatchSize(10000, 1024, 10)

      expect(batchSize).toBeGreaterThanOrEqual(100)
      expect(batchSize).toBeLessThanOrEqual(5000)
    })

    it('should limit to minimum batch size', () => {
      const batchSize = calculateOptimalBatchSize(100, 100000, 1)

      expect(batchSize).toBe(100)
    })

    it('should limit to maximum batch size', () => {
      const batchSize = calculateOptimalBatchSize(10000, 10, 1000)

      expect(batchSize).toBe(5000)
    })
  })

  describe('analyzeBatchPerformance', () => {
    it('should analyze batch performance', () => {
      const startTime = Date.now() - 1000 // 1 second ago

      const result = {
        success: 1000,
        failed: 0,
        total: 1000,
        batches: 10,
        errors: [],
        executionTimeMs: 1000,
      }

      const metrics = analyzeBatchPerformance(result, startTime)

      expect(metrics.operation).toBe('insert')
      expect(metrics.recordCount).toBe(1000)
      expect(metrics.batchCount).toBe(10)
      expect(metrics.executionTimeMs).toBeGreaterThan(0)
      expect(metrics.recordsPerSecond).toBeGreaterThan(0)
      expect(metrics.avgTimePerBatchMs).toBeGreaterThan(0)
    })
  })
})
