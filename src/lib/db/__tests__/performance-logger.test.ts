/**
// @ts-ignore - Mock type compatibility issues
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
import type { DatabaseConnection } from '../enhanced-db';

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
        email TEXT
      )
    `);
  });

  afterEach(() => {
    delete process.env.DATABASE_PATH;
  });

  describe('initialization', () => {
    it('should create performance logger', () => {
      expect(logger).toBeDefined();
      expect(logger).toHaveProperty('wrapDatabase');
      expect(logger).toHaveProperty('updateConfig');
      expect(logger).toHaveProperty('getConfig');
    });

    it('should have default configuration', () => {
      const config = logger.getConfig();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('slowQueryThreshold');
      expect(config).toHaveProperty('verySlowQueryThreshold');
      expect(config).toHaveProperty('enableNPlus1Detection');
      expect(config).toHaveProperty('enableStackTrace');
    });

    it('should be enabled by default in development', () => {
      const config = logger.getConfig();
      expect(config.enabled).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      const newConfig: Partial<PerformanceLoggerConfig> = {
        enabled: false,
        slowQueryThreshold: 50,
        verySlowQueryThreshold: 500,
      };

      logger.updateConfig(newConfig);

      const config = logger.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.slowQueryThreshold).toBe(50);
      expect(config.verySlowQueryThreshold).toBe(500);
    });

    it('should update slow query threshold', () => {
      logger.updateConfig({ slowQueryThreshold: 75 });

      const config = logger.getConfig();
      expect(config.slowQueryThreshold).toBe(75);
    });

    it('should update very slow query threshold', () => {
      logger.updateConfig({ verySlowQueryThreshold: 500 });

      const config = logger.getConfig();
      expect(config.verySlowQueryThreshold).toBe(500);
    });

    it('should enable/disable N+1 detection', () => {
      logger.updateConfig({ enableNPlus1Detection: false });

      const config = logger.getConfig();
      expect(config.enableNPlus1Detection).toBe(false);
    });

    it('should preserve other config when updating partial', () => {
      logger.updateConfig({ slowQueryThreshold: 150 });

      const config = logger.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.slowQueryThreshold).toBe(150);
      expect(config.enableNPlus1Detection).toBe(true);
    });
  });

  describe('wrapDatabase', () => {
    it('should wrap database connection', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db);

      expect(wrappedDb).toBeDefined();
      expect(wrappedDb).toHaveProperty('query');
      expect(wrappedDb).toHaveProperty('exec');
      expect(wrappedDb).toHaveProperty('prepare');
    });

    it('should execute queries through wrapper', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.query('SELECT * FROM users');

      expect(Array.isArray(await wrappedDb.query('SELECT * FROM users'))).toBe(true);
    });

    it('should execute INSERT queries', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      const result = await wrappedDb.exec('INSERT INTO users (name) VALUES (?)', ['Test User']);

      expect(result?.changes).toBe(1);
    });

    it('should execute UPDATE queries', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.exec('INSERT INTO users (name) VALUES (?)', ['User 1']);

      const result = await wrappedDb.exec('UPDATE users SET name = ? WHERE id = ?', ['Updated User', 1]);

      expect(result?.changes).toBe(1);
    });

    it('should execute DELETE queries', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.exec('INSERT INTO users (name) VALUES (?)', ['User 1']);

      const result = await wrappedDb.exec('DELETE FROM users WHERE id = ?', [1]);

      expect(result?.changes).toBe(1);
    });

    it('should use prepared statements', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      const stmt = wrappedDb.prepare('INSERT INTO users (name) VALUES (?)');
      const result = stmt.run('Test User');

      expect(result?.changes).toBe(1);
    });

    it('should support prepared statement get', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.exec('INSERT INTO users (name, id) VALUES (?, ?)', ['Test', 1]);

      const stmt = wrappedDb.prepare('SELECT * FROM users WHERE id = ?');
      const result = stmt.get(1);

      expect(result).toBeDefined();
      expect((result as any).name).toBe('Test');
    });

    it('should support prepared statement all', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.exec('INSERT INTO users (name) VALUES (?)', ['User 1']);
      await wrappedDb.exec('INSERT INTO users (name) VALUES (?)', ['User 2']);

      const stmt = wrappedDb.prepare('SELECT * FROM users');
      const result = stmt.all();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should support batch operations', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      const statements = [
        { sql: 'INSERT INTO users (name) VALUES (?)', params: ['User 1'] },
        { sql: 'INSERT INTO users (name) VALUES (?)', params: ['User 2'] },
        { sql: 'INSERT INTO users (name) VALUES (?)', params: ['User 3'] },
      ];

      const results = await wrappedDb.batch?.(statements);

      expect(results).toHaveLength(3);
      expect(results?.[0].changes).toBe(1);
    });
  });

  describe('getSummary', () => {
    it('should return performance summary', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.query('SELECT * FROM users');
      await wrappedDb.query('SELECT * FROM users');
      await wrappedDb.query('SELECT * FROM users');

      const summary = logger.getSummary();

      expect(summary).toHaveProperty('totalQueries');
      expect(summary).toHaveProperty('avgDuration');
      expect(summary).toHaveProperty('maxDuration');
      expect(summary).toHaveProperty('successRate');
      expect(summary).toHaveProperty('slowQueryCount');
      expect(summary).toHaveProperty('errorQueryCount');
      expect(summary).toHaveProperty('nPlus1Detections');
      expect(summary).toHaveProperty('insights');
      expect(summary).toHaveProperty('byOperation');
    });

    it('should track total queries', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.query('SELECT 1');
      await wrappedDb.query('SELECT 2');
      await wrappedDb.query('SELECT 3');

      const summary = logger.getSummary();
      expect(summary.totalQueries).toBe(3);
    });

    it('should track success rate', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.query('SELECT 1');
      await wrappedDb.query('SELECT 2');
      await wrappedDb.query('SELECT 3');

      const summary = logger.getSummary();
      expect(summary.successRate).toBe(1); // 100% success
    });

    it('should track errors', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      try {
        await wrappedDb.query('SELECT * FROM nonexistent_table');
      } catch {
        // Expected error
      }

      const summary = logger.getSummary();
      expect(summary.errorQueryCount).toBeGreaterThan(0);
    });

    it('should provide insights', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.query('SELECT * FROM users');

      const summary = logger.getSummary();
      expect(Array.isArray(summary.insights)).toBe(true);
    });

    it('should categorize by operation type', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.query('SELECT * FROM users');
      await wrappedDb.exec('INSERT INTO users (name) VALUES (?)', ['Test']);
      await wrappedDb.exec('UPDATE users SET name = ? WHERE id = ?', ['Updated', 1]);

      const summary = logger.getSummary();
      expect(summary.byOperation).toHaveProperty('SELECT');
      expect(summary.byOperation).toHaveProperty('INSERT');
      expect(summary.byOperation).toHaveProperty('UPDATE');
    });
  });

  describe('getSlowQueries', () => {
    it('should return slow queries', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.query('SELECT * FROM users');

      const slowQueries = logger.getSlowQueries();
      expect(Array.isArray(slowQueries)).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return query metrics', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.query('SELECT * FROM users');

      const metrics = logger.getMetrics();

      expect(metrics).toHaveProperty('totalQueries');
      expect(metrics).toHaveProperty('totalExecutionTime');
      expect(metrics).toHaveProperty('avgExecutionTime');
      expect(metrics).toHaveProperty('minExecutionTime');
      expect(metrics).toHaveProperty('maxExecutionTime');
    });
  });

  describe('startRequest/endRequest', () => {
    it('should track request context', () => {
      const requestId = 'test-request-1';

      trackRequestStart(requestId);

      expect(() => trackRequestStart(requestId)).not.toThrow();
    });

    it('should end request and return detection results', () => {
      const requestId = 'test-request-1';

      trackRequestStart(requestId);
      const result = trackRequestEnd(requestId);

      expect(result).toBeDefined();
      // Result may be NPlus1Detection or null
    });
  });

  describe('error handling', () => {
    it('should handle query errors gracefully', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await expect(wrappedDb.query('INVALID SQL')).rejects.toThrow();

      const summary = logger.getSummary();
      expect(summary.errorQueryCount).toBeGreaterThan(0);
    });

    it('should continue tracking after errors', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      try {
        await wrappedDb.query('INVALID SQL');
      } catch {
        // Expected error
      }

      await wrappedDb.query('SELECT 1');

      const summary = logger.getSummary();
      expect(summary.totalQueries).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle no queries', async () => {
      const summary = logger.getSummary();

      expect(summary.totalQueries).toBe(0);
      expect(summary.successRate).toBe(0);
    });

    it('should handle very fast queries', async () => {
      const db = await getDatabaseAsync();
      const wrappedDb = logger.wrapDatabase(db as DatabaseConnection);

      await wrappedDb.query('SELECT 1');

      const summary = logger.getSummary();
      expect(summary.totalQueries).toBeGreaterThan(0);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const logger1 = getPerformanceLogger();
      const logger2 = getPerformanceLogger();

      expect(logger1).toBe(logger2);
    });

    it('should maintain state across instances', () => {
      const logger1 = getPerformanceLogger();
      logger1.updateConfig({ enabled: false });

      const logger2 = getPerformanceLogger();
      const config = logger2.getConfig();

      expect(config.enabled).toBe(false);
    });
  });
});
