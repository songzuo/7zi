/**
// @ts-ignore - Mock type compatibility issues
 * Database Query Optimization Test
 * 数据库查询优化测试
 *
 * 测试优化后的查询性能
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getDatabase,
  getDatabaseAsync,
  initializeAgentTables,
  getAgentStats,
  createAgent,
} from '@/lib/agents/repository-optimized-v2';
import {
  initializeWalletTables,
  getWalletStats,
  deposit,
  createWallet,
} from '@/lib/agents/wallet-repository-optimized-v2';
import { AgentStatus, AgentType, AgentProvider } from '@/lib/agents/types';
import {
  analyzeIndexUsage,
  createIndexReport,
} from '@/lib/db/index-analyzer';
import {
  getPerformanceLogger,
  getPerformanceReport,
  getPerformanceHealth,
  wrapDatabaseWithLogging,
  trackRequestStart,
  trackRequestEnd,
} from '@/lib/db/performance-logger';

describe('Database Query Optimization', () => {
  beforeAll(async () => {
    // Initialize database tables
    await initializeAgentTables();
    await initializeWalletTables();

    // Create test data
    for (let i = 0; i < 10; i++) {
      await createAgent({
        name: `Test Agent ${i}`,
        description: `Test agent ${i}`,
        type: AgentType.WORKER,
        provider: AgentProvider.CUSTOM,
      });
    }

    // Create wallet and transactions
    const wallet = await createWallet('test-agent-1');
    for (let i = 0; i < 20; i++) {
      await deposit(wallet.agentId, 100 + i * 10);
    }
  });

  afterAll(() => {
    // Clear performance metrics
    const logger = getPerformanceLogger();
    logger.clearMetrics();
  });

  describe('Query Performance', () => {
    it('should execute getAgentStats efficiently (single query)', async () => {
      const logger = getPerformanceLogger();
      const requestId = 'test-get-agent-stats';
      
      trackRequestStart(requestId);

      const startTime = performance.now();
      const stats = await getAgentStats();
      const duration = performance.now() - startTime;

      const detection = trackRequestEnd(requestId);

      console.log(`getAgentStats took ${duration.toFixed(2)}ms`);
      console.log('Stats:', stats);

      // Verify stats are correct
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byProvider).toBeDefined();
      expect(stats.byType).toBeDefined();

      // Check for N+1 queries (should not detect any)
      if (detection) {
        console.log('N+1 Detection:', detection);
        expect(detection.detected).toBe(false);
      }

      // Should be fast (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should execute getWalletStats efficiently (single query)', async () => {
      const requestId = 'test-get-wallet-stats';
      
      trackRequestStart(requestId);

      const startTime = performance.now();
      const stats = await getWalletStats('test-agent-1');
      const duration = performance.now() - startTime;

      const detection = trackRequestEnd(requestId);

      console.log(`getWalletStats took ${duration.toFixed(2)}ms`);
      console.log('Stats:', stats);

      // Verify stats are correct
      expect(stats.balance).toBeGreaterThan(0);
      expect(stats.transactionCount).toBe(20);

      // Check for N+1 queries (should not detect any)
      if (detection) {
        console.log('N+1 Detection:', detection);
        expect(detection.detected).toBe(false);
      }

      // Should be fast (less than 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Index Analysis', () => {
    it('should analyze index usage and generate report', async () => {
      const report = await createIndexReport();

      console.log('Index Analysis Report:');
      console.log(report);

      expect(report).toContain('数据库索引分析报告');
      expect(report).toContain('索引总数');
    });

    it('should detect missing indexes if any', async () => {
      const analysis = await analyzeIndexUsage();

      console.log('Missing indexes:', analysis.missingIndexes.length);
      console.log('Duplicate indexes:', analysis.duplicateIndexes.length);

      expect(analysis.indexes).toBeDefined();
      expect(analysis.missingIndexes).toBeDefined();
      expect(analysis.duplicateIndexes).toBeDefined();
    });
  });

  describe('Performance Logging', () => {
    it('should wrap database with performance logging', () => {
      const db = getDatabase();
      const wrappedDb = wrapDatabaseWithLogging(db);

      expect(wrappedDb).toBeDefined();
      expect(wrappedDb.query).toBeInstanceOf(Function);
      expect(wrappedDb.prepare).toBeInstanceOf(Function);
    });

    it('should generate performance report', () => {
      const report = getPerformanceReport();

      console.log('Performance Report:');
      console.log(report);

      expect(report).toContain('数据库性能报告');
      expect(report).toContain('性能摘要');
    });

    it('should check performance health', () => {
      const health = getPerformanceHealth();

      console.log('Performance Health:', health);

      expect(health).toBeDefined();
      expect(health.healthy).toBeDefined();
      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Query Caching', () => {
    it('should use query builder with caching', async () => {
      const db = await getDatabaseAsync();
      const { executeQuery } = await import('@/lib/db/query-builder');

      // First query (cache miss)
      const start1 = performance.now();
      const result1 = executeQuery(
        db,
        'agents',
        { status: AgentStatus.INACTIVE },
        { limit: 10, useCache: true }
      );
      const duration1 = performance.now() - start1;

      // Second query (cache hit)
      const start2 = performance.now();
      const result2 = executeQuery(
        db,
        'agents',
        { status: AgentStatus.INACTIVE },
        { limit: 10, useCache: true }
      );
      const duration2 = performance.now() - start2;

      console.log(`First query (cache miss): ${duration1.toFixed(2)}ms`);
      console.log(`Second query (cache hit): ${duration2.toFixed(2)}ms`);

      // Cached query should be faster
      expect(duration2).toBeLessThan(duration1);

      // Results should be identical
      expect(result1).toEqual(result2);
    });
  });

  describe('N+1 Query Detection', () => {
    it('should detect N+1 query pattern', async () => {
      const { getNPlus1Detector } = await import('@/lib/db/nplus1-detector');
      const detector = getNPlus1Detector();

      const requestId = 'test-nplus1-detection';
      detector.startRequest(requestId);

      // Simulate N+1 queries
      const db = await getDatabaseAsync();
      
      // Main query
      db.query('SELECT * FROM agents WHERE status = ?', [AgentStatus.INACTIVE]);

      // N+1 queries (one for each agent)
      const agents = db.query('SELECT * FROM agents WHERE status = ?', [AgentStatus.INACTIVE]);
      if (Array.isArray(agents)) {
        for (const agent of agents.slice(0, 5)) {
          db.query('SELECT * FROM agent_wallets WHERE agent_id = ?', [(agent as any).id]);
        }
      }

      // End tracking and analyze
      const detection = detector.endRequest(requestId);

      console.log('N+1 Detection Result:', detection);

      expect(detection).toBeDefined();
      expect(detection.detected).toBe(true);
      expect(detection.patterns.length).toBeGreaterThan(0);
      expect(detection.suggestions.length).toBeGreaterThan(0);
    });
  });
});
