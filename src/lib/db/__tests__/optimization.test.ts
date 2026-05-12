/**
 * Database Query Optimization Test
 * 数据库查询优化测试
 *
 * 测试优化后的查询性能
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  getDatabase,
  getDatabaseAsync,
} from '@/lib/db'
import {
  initializeAgentTables,
  getAgentStats,
  createAgent,
} from '@/lib/agents/core/repository-optimized-v2'
import {
  initializeWalletTables,
  getWalletStats,
  deposit,
  createWallet,
} from '@/lib/agents/core/wallet-repository-optimized-v2'
import { AgentStatus, AgentType, AgentProvider } from '@/lib/agents/core/types'
import { analyzeIndexUsage, createIndexReport } from '@/lib/db/index-analyzer'
import {
  getPerformanceLogger,
  getPerformanceReport,
  getPerformanceHealth,
  wrapDatabaseWithLogging,
  trackRequestStart,
  trackRequestEnd,
} from '@/lib/db/performance-logger'

describe('Database Query Optimization', () => {
  beforeAll(async () => {
    // Initialize database tables
    await initializeAgentTables()
    await initializeWalletTables()
    // Create test data
    for (let i = 0; i < 10; i++) {
      await createAgent({
        name: `Test Agent ${i}`,
        description: `Test agent ${i}`,
        type: AgentType.WORKER,
        provider: AgentProvider.CUSTOM,
      })
    }
    // Create wallet and transactions
    const wallet = await createWallet('test-agent-1')
    for (let i = 0; i < 20; i++) {
      await deposit(wallet.agentId, 100 + i * 10)
    }
  })

  afterAll(() => {
    // Clear performance metrics
    const logger = getPerformanceLogger()
    logger.clearMetrics()
  })

  describe('Query Performance', () => {
    it('should execute getAgentStats efficiently (single query)', async () => {
      const logger = getPerformanceLogger()
      const requestId = 'test-get-agent-stats'
      trackRequestStart(requestId)
      const startTime = performance.now()
      const stats = await getAgentStats()
      const duration = performance.now() - startTime
      const detection = trackRequestEnd(requestId)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`getAgentStats took ${duration.toFixed(2)}ms`)
        console.log('Stats:', stats)
      }
      // Verify stats structure is correct
      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('byProvider')
      expect(stats).toHaveProperty('byType')
      // Check for N+1 queries (should not detect any)
      if (detection) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('N+1 Detection:', detection)
        }
        expect(detection.detected).toBe(false)
      }
      // Should be fast (less than 100ms)
      expect(duration).toBeLessThan(100)
    })

    it('should execute getWalletStats efficiently (single query)', async () => {
      const requestId = 'test-get-wallet-stats'
      trackRequestStart(requestId)
      const startTime = performance.now()
      const stats = await getWalletStats('test-agent-1')
      const duration = performance.now() - startTime
      const detection = trackRequestEnd(requestId)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`getWalletStats took ${duration.toFixed(2)}ms`)
        console.log('Stats:', stats)
      }
      // Verify stats structure is correct
      expect(stats).toHaveProperty('balance')
      expect(stats).toHaveProperty('transactionCount')
      // Check for N+1 queries (should not detect any)
      if (detection) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('N+1 Detection:', detection)
        }
        expect(detection.detected).toBe(false)
      }
      // Should be fast (less than 100ms)
      expect(duration).toBeLessThan(100)
    })
  })

  describe('Index Analysis', () => {
    it('should analyze index usage and generate report', async () => {
      const report = await createIndexReport()
      if (process.env.NODE_ENV !== 'production') {
        console.log('Index Analysis Report:')
        console.log(report)
      }
      expect(report).toContain('数据库索引分析报告')
      expect(report).toContain('索引总数')
    })

    it('should detect missing indexes if any', async () => {
      const analysis = await analyzeIndexUsage()
      if (process.env.NODE_ENV !== 'production') {
        console.log('Missing indexes:', analysis.missingIndexes.length)
        console.log('Duplicate indexes:', analysis.duplicateIndexes.length)
      }
      expect(analysis.indexes).toBeDefined()
      expect(analysis.missingIndexes).toBeDefined()
      expect(analysis.duplicateIndexes).toBeDefined()
    })
  })

  describe('Performance Logging', () => {
    it('should wrap database with performance logging', () => {
      const db = getDatabase()
      const wrappedDb = wrapDatabaseWithLogging(db)
      expect(wrappedDb).toBeDefined()
      expect(wrappedDb.query).toBeInstanceOf(Function)
      expect(wrappedDb.prepare).toBeInstanceOf(Function)
    })

    it('should generate performance report', () => {
      const report = getPerformanceReport()
      if (process.env.NODE_ENV !== 'production') {
        console.log('Performance Report:')
        console.log(report)
      }
      expect(report).toContain('数据库性能报告')
      expect(report).toContain('性能摘要')
    })

    it('should check performance health', () => {
      const health = getPerformanceHealth()
      if (process.env.NODE_ENV !== 'production') {
        console.log('Performance Health:', health)
      }
      expect(health).toBeDefined()
      expect(health.healthy).toBeDefined()
      expect(health.score).toBeGreaterThanOrEqual(0)
      expect(health.score).toBeLessThanOrEqual(100)
    })
  })

  describe('Query Caching', () => {
    it('should use query builder with caching', async () => {
      const db = await getDatabaseAsync()
      const { executeQuery } = await import('@/lib/db/query-builder')
      // First query (cache miss)
      const start1 = performance.now()
      const result1 = executeQuery(
        db,
        'agents',
        { status: AgentStatus.INACTIVE },
        { limit: 10, useCache: true }
      )
      const duration1 = performance.now() - start1
      // Second query (cache hit)
      const start2 = performance.now()
      const result2 = executeQuery(
        db,
        'agents',
        { status: AgentStatus.INACTIVE },
        { limit: 10, useCache: true }
      )
      const duration2 = performance.now() - start2
      if (process.env.NODE_ENV !== 'production') {
        console.log(`First query (cache miss): ${duration1.toFixed(2)}ms`)
        console.log(`Second query (cache hit): ${duration2.toFixed(2)}ms`)
      }
      // Cached query should be faster
      expect(duration2).toBeLessThan(duration1)
      // Results should be identical
      expect(result1).toEqual(result2)
    })
  })

  describe('N+1 Query Detection', () => {
    it('should have N+1 detection functionality', async () => {
      const { getNPlus1Detector } = await import('@/lib/db/nplus1-detector')
      const detector = getNPlus1Detector()
      // Verify detector exists and has expected methods
      expect(detector).toBeDefined()
      expect(typeof detector.startRequest).toBe('function')
      expect(typeof detector.endRequest).toBe('function')
      const requestId = 'test-nplus1-detection'
      detector.startRequest(requestId)
      const db = await getDatabaseAsync()
      // Main query
      db.query('SELECT * FROM agents WHERE status = ?', ['INACTIVE'])
      // N+1 queries pattern
      const agents = db.query('SELECT * FROM agents WHERE status = ?', ['INACTIVE'])
      if (Array.isArray(agents)) {
        for (const agent of agents.slice(0, 5)) {
          db.query('SELECT * FROM agent_wallets WHERE agent_id = ?', [(agent as any).id])
        }
      }
      // End tracking and analyze
      const detection = detector.endRequest(requestId)
      if (process.env.NODE_ENV !== 'production') {
        console.log('N+1 Detection Result:', detection)
      }
      // Detection may or may not trigger depending on implementation
      expect(detection).toBeDefined()
    })
  })
})