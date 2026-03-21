// @ts-nocheck - Mock type compatibility issues
/**
 * Performance Logger Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPerformanceLogger,
  resetPerformanceLogger,
  type PerformanceLoggerConfig,
  type PerformanceSummary,
} from '../performance-logger';
import { getDatabaseAsync } from '../index';
import type { DatabaseConnection, DatabaseStatement, DatabaseResult } from '../types';

// Helper type for test database connection with performance tracking
type TestDatabaseConnection = DatabaseConnection & {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
  exec: (sql: string, params?: unknown[]) => Promise<DatabaseResult>;
  prepare: (sql: string) => DatabaseStatement;
};

describe('Performance Logger', () => {
  let logger: ReturnType<typeof getPerformanceLogger>;

  beforeEach(async () => {
    // Use in-memory database for tests
    process.env.DATABASE_PATH = ':memory:';
    resetPerformanceLogger();
    logger = getPerformanceLogger();

    // Initialize test database
    const db = await getDatabaseAsync();
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      logger = getPerformanceLogger();
      expect(logger).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const config: PerformanceLoggerConfig = {
        enabled: true,
        slowQueryThreshold: 100,
        maxHistorySize: 50,
      };

      logger = getPerformanceLogger(config);
      expect(logger).toBeDefined();
    });
  });

  describe('query tracking', () => {
    it('should track query execution time', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;
      const beforeStats = logger.getStats();

      await db.query('SELECT * FROM users');
      const afterStats = logger.getStats();

      expect(afterStats.totalQueries).toBe(beforeStats.totalQueries + 1);
    });

    it('should record slow queries', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;
      const config: PerformanceLoggerConfig = {
        enabled: true,
        slowQueryThreshold: 0, // All queries are slow
      };

      const slowLogger = getPerformanceLogger(config);

      await db.query('SELECT * FROM users');

      const slowQueries = slowLogger.getSlowQueries();
      expect(slowQueries.length).toBeGreaterThan(0);
    });

    it('should track query patterns', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      await db.query('SELECT * FROM users');
      await db.query('SELECT * FROM users WHERE status = ?', ['active']);
      await db.query('SELECT * FROM users WHERE email = ?', ['test@test.com']);

      const patterns = logger.getQueryPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('statistics', () => {
    it('should provide accurate statistics', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      for (let i = 0; i < 5; i++) {
        await db.query('SELECT * FROM users');
      }

      const stats = logger.getStats();
      expect(stats.totalQueries).toBe(5);
      expect(stats.avgExecutionTime).toBeGreaterThan(0);
    });

    it('should track average execution time', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      await db.query('SELECT * FROM users');
      await db.query('SELECT * FROM users');

      const stats = logger.getStats();
      expect(stats.avgExecutionTime).toBeGreaterThan(0);
      expect(stats.minExecutionTime).toBeGreaterThan(0);
      expect(stats.maxExecutionTime).toBeGreaterThan(0);
    });

    it('should track error count', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      try {
        await db.query('SELECT * FROM nonexistent_table');
      } catch (e) {
        // Expected error
      }

      const stats = logger.getStats();
      expect(stats.totalErrors).toBe(1);
    });
  });

  describe('slow query detection', () => {
    it('should identify queries exceeding threshold', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;
      const config: PerformanceLoggerConfig = {
        enabled: true,
        slowQueryThreshold: 0,
      };

      const slowLogger = getPerformanceLogger(config);

      await db.query('SELECT * FROM users');

      const slowQueries = slowLogger.getSlowQueries();
      expect(slowQueries.length).toBeGreaterThan(0);
      expect(slowQueries[0]).toHaveProperty('sql');
      expect(slowQueries[0]).toHaveProperty('executionTime');
      expect(slowQueries[0]).toHaveProperty('timestamp');
    });

    it('should maintain slow query history', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;
      const config: PerformanceLoggerConfig = {
        enabled: true,
        slowQueryThreshold: 0,
        maxHistorySize: 10,
      };

      const slowLogger = getPerformanceLogger(config);

      for (let i = 0; i < 15; i++) {
        await db.query('SELECT * FROM users');
      }

      const slowQueries = slowLogger.getSlowQueries();
      expect(slowQueries.length).toBe(10); // Should respect maxHistorySize
    });
  });

  describe('query patterns', () => {
    it('should identify query patterns', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      await db.query('SELECT * FROM users');
      await db.query('SELECT * FROM users WHERE id = ?', [1]);
      await db.query('SELECT * FROM users WHERE id = ?', [2]);

      const patterns = logger.getQueryPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should track pattern frequency', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      for (let i = 0; i < 5; i++) {
        await db.query('SELECT * FROM users');
      }

      const patterns = logger.getQueryPatterns();
      const selectUsersPattern = patterns.find(p => p.pattern.includes('SELECT * FROM users'));
      expect(selectUsersPattern).toBeDefined();
      expect(selectUsersPattern?.count).toBe(5);
    });

    it('should track average time per pattern', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      await db.query('SELECT * FROM users');
      await db.query('SELECT * FROM users');

      const patterns = logger.getQueryPatterns();
      const selectUsersPattern = patterns.find(p => p.pattern.includes('SELECT * FROM users'));
      expect(selectUsersPattern?.avgExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('summaries', () => {
    it('should generate performance summary', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      await db.query('SELECT * FROM users');

      const summary = logger.getSummary();
      expect(summary).toHaveProperty('totalQueries');
      expect(summary).toHaveProperty('avgExecutionTime');
      expect(summary).toHaveProperty('slowQueries');
      expect(summary).toHaveProperty('queryPatterns');
    });

    it('should include top slow queries', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;
      const config: PerformanceLoggerConfig = {
        enabled: true,
        slowQueryThreshold: 0,
      };

      const slowLogger = getPerformanceLogger(config);

      for (let i = 0; i < 10; i++) {
        await db.query('SELECT * FROM users');
      }

      const summary = slowLogger.getSummary();
      expect(summary.slowQueries.length).toBeGreaterThan(0);
    });

    it('should format summary as readable text', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      await db.query('SELECT * FROM users');

      const summary = logger.getSummary();
      const formatted = logger.formatSummary(summary);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should clear all statistics', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      await db.query('SELECT * FROM users');

      const beforeStats = logger.getStats();
      expect(beforeStats.totalQueries).toBeGreaterThan(0);

      resetPerformanceLogger();

      const afterStats = logger.getStats();
      expect(afterStats.totalQueries).toBe(0);
      expect(afterStats.avgExecutionTime).toBe(0);
    });

    it('should clear slow query history', async () => {
      const db = await getDatabaseAsync() as TestDatabaseConnection;
      const config: PerformanceLoggerConfig = {
        enabled: true,
        slowQueryThreshold: 0,
      };

      const slowLogger = getPerformanceLogger(config);

      await db.query('SELECT * FROM users');

      expect(slowLogger.getSlowQueries().length).toBeGreaterThan(0);

      resetPerformanceLogger();

      expect(slowLogger.getSlowQueries().length).toBe(0);
    });
  });

  describe('enable/disable', () => {
    it('should disable tracking when disabled', async () => {
      const config: PerformanceLoggerConfig = {
        enabled: false,
      };

      const disabledLogger = getPerformanceLogger(config);
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      await db.query('SELECT * FROM users');

      const stats = disabledLogger.getStats();
      expect(stats.totalQueries).toBe(0);
    });

    it('should enable tracking when enabled', async () => {
      const config: PerformanceLoggerConfig = {
        enabled: true,
      };

      const enabledLogger = getPerformanceLogger(config);
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      await db.query('SELECT * FROM users');

      const stats = enabledLogger.getStats();
      expect(stats.totalQueries).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('should respect slow query threshold', async () => {
      const config: PerformanceLoggerConfig = {
        enabled: true,
        slowQueryThreshold: 1000, // 1 second
      };

      const configLogger = getPerformanceLogger(config);
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      // Fast query - should not be marked as slow
      await db.query('SELECT * FROM users');

      const slowQueries = configLogger.getSlowQueries();
      expect(slowQueries.length).toBe(0);
    });

    it('should respect max history size', async () => {
      const config: PerformanceLoggerConfig = {
        enabled: true,
        slowQueryThreshold: 0,
        maxHistorySize: 5,
      };

      const configLogger = getPerformanceLogger(config);
      const db = await getDatabaseAsync() as TestDatabaseConnection;

      for (let i = 0; i < 10; i++) {
        await db.query('SELECT * FROM users');
      }

      const slowQueries = configLogger.getSlowQueries();
      expect(slowQueries.length).toBe(5);
    });
  });
});
