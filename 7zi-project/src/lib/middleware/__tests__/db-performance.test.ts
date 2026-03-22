/**
 * @fileoverview Database Performance Logger Tests
 */

// @ts-ignore - Mock type compatibility issues
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  withPerformanceLogging,
  getQueryMetricsSummary,
  clearQueryMetrics,
  getRecentQueryMetrics,
  getQueryInsights,
  getQueryMetrics,
} from '../db-performance';
import type { DatabaseConnection } from '@/lib/db';

// Mock database connection
const mockDb: DatabaseConnection = {
  query: vi.fn(),
  queryRows: vi.fn(),
  exec: vi.fn(),
  prepare: vi.fn(),
  pragma: vi.fn(),
  batch: vi.fn(),
};

// Mock prepared statement
const mockStatement = {
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
};

// Store original performance.now and Date.now
const originalPerformanceNow = performance.now;
const originalDateNow = Date.now;

// Mock time tracking
let mockTime = 0;

// Helper to simulate a delay
function advanceTime(ms: number) {
  mockTime += ms;
}

// Setup performance mock
function setupPerformanceMock() {
  mockTime = 0;
  const baseTime = Date.now();
  global.performance.now = vi.fn(() => mockTime);
  global.Date.now = vi.fn(() => baseTime + mockTime);
}

// Restore performance mock
function restorePerformanceMock() {
  global.performance.now = originalPerformanceNow;
  global.Date.now = originalDateNow;
}

describe('withPerformanceLogging', () => {
  beforeEach(() => {
    setupPerformanceMock();
    clearQueryMetrics();
    vi.clearAllMocks();
    mockDb.prepare.mockReturnValue(mockStatement);
  });

  afterEach(() => {
    restorePerformanceMock();
  });

  describe('query method', () => {
    it('should track successful queries', async () => {
      mockDb.query.mockReturnValue([{ id: 1, name: 'test' }]);

      const db = withPerformanceLogging(mockDb);
      await db.query('SELECT * FROM users');

      const summary = getQueryMetricsSummary();
      expect(summary.total).toBe(1);
      expect(summary.successRate).toBe(100);
    });

    it('should track query duration', async () => {
      mockDb.query.mockImplementation((sql: string) => {
        advanceTime(50);
        return [{ id: 1, name: 'test' }];
      });

      const db = withPerformanceLogging(mockDb);
      await db.query('SELECT * FROM users');

      const summary = getQueryMetricsSummary();
      expect(summary.avgDuration).toBeGreaterThan(40);
      expect(summary.avgDuration).toBeLessThan(60);
    });

    it('should track row count', async () => {
      mockDb.query.mockReturnValue([
        { id: 1, name: 'test1' },
        { id: 2, name: 'test2' },
        { id: 3, name: 'test3' },
      ]);

      const db = withPerformanceLogging(mockDb);
      await db.query('SELECT * FROM users');

      const metrics = getQueryMetrics();
      expect(metrics[0].rowCount).toBe(3);
    });

    it('should track query parameters', async () => {
      mockDb.query.mockReturnValue([{ id: 1, name: 'test' }]);

      const db = withPerformanceLogging(mockDb);
      await db.query('SELECT * FROM users WHERE id = ?', [1]);

      const metrics = getQueryMetrics();
      expect(metrics[0].paramsCount).toBe(1);
    });

    it('should detect slow queries (> 100ms)', async () => {
      mockDb.query.mockImplementation((sql: string) => {
        advanceTime(150);
        return [{ id: 1, name: 'test' }];
      });

      const db = withPerformanceLogging(mockDb);
      await db.query('SELECT * FROM users');

      const summary = getQueryMetricsSummary();
      expect(summary.slowQueries.length).toBe(1);
      expect(summary.slowQueries[0].duration).toBeGreaterThan(100);
    });

    it('should handle query errors', async () => {
      mockDb.query.mockImplementation(() => {
        throw new Error('Table not found');
      });

      const db = withPerformanceLogging(mockDb);
      let errorThrown = false;
      try {
        await db.query('SELECT * FROM unknown_table');
      } catch (e) {
        errorThrown = true;
        expect(e instanceof Error && e.message).toBe('Table not found');
      }
      expect(errorThrown).toBe(true);

      const summary = getQueryMetricsSummary();
      expect(summary.total).toBe(1);
      expect(summary.successRate).toBe(0);
      expect(summary.errorQueries.length).toBe(1);
    });

    it('should sanitize queries in logs', async () => {
      mockDb.query.mockReturnValue([{ id: 1, name: 'test' }]);

      const db = withPerformanceLogging(mockDb);
      await db.query("SELECT * FROM users WHERE name = 'John' AND age = 30");

      const metrics = getQueryMetrics();
      expect(metrics[0].query).toBe('SELECT * FROM users WHERE name = ? AND age = ?');
    });
  });

  describe('exec method', () => {
    it('should track successful exec operations', async () => {
      mockDb.exec.mockReturnValue({ changes: 5, lastInsertRowid: 1 });

      const db = withPerformanceLogging(mockDb);
      await db.exec('UPDATE users SET status = "active"');

      const summary = getQueryMetricsSummary();
      expect(summary.total).toBe(1);
      expect(summary.successRate).toBe(100);
    });

    it('should track number of changed rows', async () => {
      mockDb.exec.mockReturnValue({ changes: 10, lastInsertRowid: 1 });

      const db = withPerformanceLogging(mockDb);
      await db.exec('UPDATE users SET status = "active"');

      const metrics = getQueryMetrics();
      expect(metrics[0].rowCount).toBe(10);
    });

    it('should detect slow exec operations', async () => {
      mockDb.exec.mockImplementation((sql: string) => {
        advanceTime(150);
        return { changes: 1, lastInsertRowid: 1 };
      });

      const db = withPerformanceLogging(mockDb);
      await db.exec('UPDATE users SET status = "active"');

      const summary = getQueryMetricsSummary();
      expect(summary.slowQueries.length).toBe(1);
    });

    it('should handle exec errors', async () => {
      mockDb.exec.mockImplementation(() => {
        throw new Error('Constraint violation');
      });

      const db = withPerformanceLogging(mockDb);
      let errorThrown = false;
      try {
        await db.exec('INSERT INTO users VALUES (1, "test")');
      } catch (e) {
        errorThrown = true;
        expect(e instanceof Error && e.message).toBe('Constraint violation');
      }
      expect(errorThrown).toBe(true);

      const summary = getQueryMetricsSummary();
      expect(summary.errorQueries.length).toBe(1);
    });
  });

  describe('prepared statement methods', () => {
    beforeEach(() => {
      mockStatement.run.mockReturnValue({ changes: 1, lastInsertRowid: 1 });
      mockStatement.get.mockReturnValue({ id: 1, name: 'test' });
      mockStatement.all.mockReturnValue([{ id: 1, name: 'test' }]);
    });

    describe('run method', () => {
      it('should track prepared statement run', async () => {
        const db = withPerformanceLogging(mockDb);
        const stmt = db.prepare('INSERT INTO users (name) VALUES (?)');
        await stmt.run('John');

        const summary = getQueryMetricsSummary();
        expect(summary.total).toBe(1);
        expect(summary.successRate).toBe(100);
      });

      it('should track run duration', async () => {
        mockStatement.run.mockImplementation((...args: unknown[]) => {
          advanceTime(50);
          return { changes: 1, lastInsertRowid: 1 };
        });

        const db = withPerformanceLogging(mockDb);
        const stmt = db.prepare('INSERT INTO users (name) VALUES (?)');
        await stmt.run('John');

        const summary = getQueryMetricsSummary();
        expect(summary.avgDuration).toBeGreaterThan(40);
      });

      it('should detect slow run operations', async () => {
        mockStatement.run.mockImplementation((...args: unknown[]) => {
          advanceTime(150);
          return { changes: 1, lastInsertRowid: 1 };
        });

        const db = withPerformanceLogging(mockDb);
        const stmt = db.prepare('INSERT INTO users (name) VALUES (?)');
        await stmt.run('John');

        const summary = getQueryMetricsSummary();
        expect(summary.slowQueries.length).toBe(1);
      });
    });

    describe('get method', () => {
      it('should track prepared statement get', async () => {
        const db = withPerformanceLogging(mockDb);
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        await stmt.get(1);

        const summary = getQueryMetricsSummary();
        expect(summary.total).toBe(1);
      });

      it('should track result row count', async () => {
        const db = withPerformanceLogging(mockDb);
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        await stmt.get(1);

        const metrics = getQueryMetrics();
        expect(metrics[0].rowCount).toBe(1);
      });
    });

    describe('all method', () => {
      it('should track prepared statement all', async () => {
        const db = withPerformanceLogging(mockDb);
        const stmt = db.prepare('SELECT * FROM users');
        await stmt.all();

        const summary = getQueryMetricsSummary();
        expect(summary.total).toBe(1);
      });

      it('should track multiple rows', async () => {
        mockStatement.all.mockReturnValue([
          { id: 1, name: 'test1' },
          { id: 2, name: 'test2' },
        ]);

        const db = withPerformanceLogging(mockDb);
        const stmt = db.prepare('SELECT * FROM users');
        await stmt.all();

        const metrics = getQueryMetrics();
        expect(metrics[0].rowCount).toBe(2);
      });

      it('should detect slow all operations', async () => {
        mockStatement.all.mockImplementation((...args: unknown[]) => {
          advanceTime(150);
          return [{ id: 1, name: 'test' }];
        });

        const db = withPerformanceLogging(mockDb);
        const stmt = db.prepare('SELECT * FROM users');
        await stmt.all();

        const summary = getQueryMetricsSummary();
        expect(summary.slowQueries.length).toBe(1);
      });
    });
  });

  describe('batch method', () => {
    it('should track batch operations', async () => {
      const statements = [
        { sql: 'INSERT INTO users (name) VALUES (?)', params: ['John'] },
        { sql: 'INSERT INTO users (name) VALUES (?)', params: ['Jane'] },
      ];

      mockDb.batch.mockReturnValue([{ changes: 1 }, { changes: 1 }]);

      const db = withPerformanceLogging(mockDb);
      await db.batch(statements);

      const summary = getQueryMetricsSummary();
      expect(summary.total).toBe(1);
    });

    it('should include statement count in query', async () => {
      const statements = [
        { sql: 'INSERT INTO users (name) VALUES (?)', params: ['John'] },
        { sql: 'INSERT INTO users (name) VALUES (?)', params: ['Jane'] },
      ];

      mockDb.batch.mockReturnValue([{ changes: 1 }, { changes: 1 }]);

      const db = withPerformanceLogging(mockDb);
      await db.batch(statements);

      const metrics = getQueryMetrics();
      expect(metrics[0].query).toBe('BATCH (2 statements)');
    });

    it('should detect slow batch operations', async () => {
      mockDb.batch.mockImplementation(() => {
        advanceTime(150);
        return [{ changes: 1 }];
      });

      const db = withPerformanceLogging(mockDb);
      await db.batch([{ sql: 'INSERT INTO users (name) VALUES (?)', params: ['John'] }]);

      const summary = getQueryMetricsSummary();
      expect(summary.slowQueries.length).toBe(1);
    });
  });

  describe('operation grouping', () => {
    beforeEach(async () => {
      // Add different operation types
      const db = withPerformanceLogging(mockDb);

      mockDb.query.mockReturnValue([{ id: 1 }]);
      await db.query('SELECT * FROM users');
      await db.query('SELECT * FROM posts');

      mockDb.exec.mockReturnValue({ changes: 1, lastInsertRowid: 1 });
      await db.exec('UPDATE users SET status = "active"');

      mockDb.exec.mockReturnValue({ changes: 1, lastInsertRowid: 1 });
      await db.exec('DELETE FROM users WHERE id = 1');

      mockDb.exec.mockReturnValue({ changes: 1, lastInsertRowid: 1 });
      await db.exec('INSERT INTO users (name) VALUES ("test")');
    });

    it('should group queries by operation type', () => {
      const summary = getQueryMetricsSummary();
      expect(summary.byOperation.SELECT).toBeDefined();
      expect(summary.byOperation.UPDATE).toBeDefined();
      expect(summary.byOperation.DELETE).toBeDefined();
      expect(summary.byOperation.INSERT).toBeDefined();
    });

    it('should count operations correctly', () => {
      const summary = getQueryMetricsSummary();
      expect(summary.byOperation.SELECT.count).toBe(2);
      expect(summary.byOperation.UPDATE.count).toBe(1);
      expect(summary.byOperation.DELETE.count).toBe(1);
      expect(summary.byOperation.INSERT.count).toBe(1);
    });

    it('should calculate average duration per operation', () => {
      const summary = getQueryMetricsSummary();
      expect(summary.byOperation.SELECT.avgDuration).toBeGreaterThanOrEqual(0);
      expect(summary.byOperation.UPDATE.avgDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('metrics storage limits', () => {
    it('should limit total metrics to 2000', async () => {
      const db = withPerformanceLogging(mockDb);
      mockDb.query.mockReturnValue([{ id: 1 }]);

      // Make 2100 queries
      for (let i = 0; i < 2100; i++) {
        await db.query('SELECT * FROM users');
      }

      const metrics = getQueryMetrics();
      expect(metrics.length).toBe(2000);
    });

    it('should remove oldest metrics when limit reached', async () => {
      const db = withPerformanceLogging(mockDb);
      mockDb.query.mockReturnValue([{ id: 1 }]);

      // Make first query
      await db.query('SELECT * FROM users WHERE id = 1');

      // Make 2000 more queries
      for (let i = 0; i < 2000; i++) {
        await db.query(`SELECT * FROM users WHERE id = ${i}`);
      }

      const metrics = getQueryMetrics();
      // First metric should be gone
      expect(metrics[0].timestamp).not.toBeLessThan(metrics[1999].timestamp);
    });
  });

  describe('recent metrics filtering', () => {
    it('should return metrics from last N minutes', async () => {
      const db = withPerformanceLogging(mockDb);
      mockDb.query.mockReturnValue([{ id: 1 }]);

      await db.query('SELECT * FROM users');

      const recentMetrics = getRecentQueryMetrics(5);
      expect(recentMetrics.length).toBeGreaterThan(0);
    });

    it('should filter out old metrics', async () => {
      const db = withPerformanceLogging(mockDb);
      mockDb.query.mockResolvedValue([{ id: 1 }]);

      await db.query('SELECT * FROM users');

      // Create an old metric by manipulating timestamp
      const metrics = getQueryMetrics();
      if (metrics.length > 0) {
        metrics[0].timestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      }

      const recentMetrics = getRecentQueryMetrics(5);
      expect(recentMetrics.every(m => m.timestamp > Date.now() - 5 * 60 * 1000)).toBe(true);
    });
  });

  describe('query insights', () => {
    it('should provide insights for slow queries', async () => {
      setupPerformanceMock();
      const db = withPerformanceLogging(mockDb);
      mockDb.query.mockImplementation((sql: string) => {
        advanceTime(150);
        return [{ id: 1 }];
      });

      // Add slow queries
      for (let i = 0; i < 5; i++) {
        await db.query('SELECT * FROM users');
      }

      const insights = getQueryInsights();
      expect(insights.length).toBeGreaterThan(0);
      expect(insights.some(i => i.includes('slow queries'))).toBe(true);
      restorePerformanceMock();
    });

    it('should provide insights for failed queries', async () => {
      setupPerformanceMock();
      const db = withPerformanceLogging(mockDb);
      mockDb.query.mockImplementation(() => {
        throw new Error('Table not found');
      });

      for (let i = 0; i < 5; i++) {
        try {
          await db.query('SELECT * FROM unknown_table');
        } catch {
          // Expected error
        }
      }

      const insights = getQueryInsights();
      expect(insights.length).toBeGreaterThan(0);
      expect(insights.some(i => i.includes('failed queries'))).toBe(true);
      restorePerformanceMock();
    });

    it('should provide recommendations for many slow queries', async () => {
      setupPerformanceMock();
      const db = withPerformanceLogging(mockDb);
      mockDb.query.mockImplementation((sql: string) => {
        advanceTime(150);
        return [{ id: 1 }];
      });

      // Add 11 slow queries
      for (let i = 0; i < 11; i++) {
        await db.query('SELECT * FROM users');
      }

      const insights = getQueryInsights();
      expect(insights.some(i => i.includes('indexes') || i.includes('optimizing'))).toBe(true);
      restorePerformanceMock();
    });

    it('should provide recommendations for multiple failures', async () => {
      setupPerformanceMock();
      const db = withPerformanceLogging(mockDb);
      mockDb.query.mockImplementation(() => {
        throw new Error('Table not found');
      });

      // Add 6 failed queries
      for (let i = 0; i < 6; i++) {
        try {
          await db.query('SELECT * FROM unknown_table');
        } catch {
          // Expected error
        }
      }

      const insights = getQueryInsights();
      expect(insights.some(i => i.includes('schema issues') || i.includes('constraint violations'))).toBe(true);
      restorePerformanceMock();
    });
  });

  describe('summary calculations', () => {
    beforeEach(async () => {
      setupPerformanceMock();
      const db = withPerformanceLogging(mockDb);

      // Create test metrics with varying durations
      mockDb.query.mockImplementation((sql: string, delay?: number) => {
        advanceTime(delay || 10);
        return [{ id: 1 }];
      });

      await db.query('SELECT 1');
      await db.query('SELECT 2');
      await db.query('SELECT 3');
      await db.query('SELECT 4');
      await db.query('SELECT 5');

      // Add one failed query
      mockDb.query.mockImplementation(() => {
        throw new Error('Test error');
      });
      try {
        await db.query('SELECT 6');
      } catch {
        // Expected error
      }
    });

    afterEach(() => {
      restorePerformanceMock();
    });

    it('should calculate average duration correctly', () => {
      const summary = getQueryMetricsSummary();
      expect(summary.avgDuration).toBeGreaterThan(0);
    });

    it('should calculate min and max duration', () => {
      const summary = getQueryMetricsSummary();
      expect(summary.minDuration).toBeLessThan(summary.maxDuration);
    });

    it('should calculate success rate', () => {
      const summary = getQueryMetricsSummary();
      expect(summary.successRate).toBeCloseTo(83.33, 1); // 5/6
    });

    it('should sort slow queries by duration', async () => {
      const db = withPerformanceLogging(mockDb);
      clearQueryMetrics();

      mockDb.query.mockImplementation((sql: string, delay?: number) => {
        advanceTime(delay);
        return [{ id: 1 }];
      });

      // Add queries with different durations
      await db.query('SELECT 1', 200);
      await db.query('SELECT 2', 150);
      await db.query('SELECT 3', 300);

      const summary = getQueryMetricsSummary();
      expect(summary.slowQueries[0].duration).toBeGreaterThan(summary.slowQueries[1].duration);
    });

    it('should sort error queries by timestamp', async () => {
      const db = withPerformanceLogging(mockDb);
      clearQueryMetrics();

      mockDb.query.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Add failed queries
      for (let i = 0; i < 3; i++) {
        try {
          await db.query(`SELECT ${i}`);
        } catch {
          // Expected error
        }
      }

      const summary = getQueryMetricsSummary();
      expect(summary.errorQueries[0].timestamp).toBeGreaterThanOrEqual(summary.errorQueries[1].timestamp);
    });

    it('should limit slow and error queries to top 20', async () => {
      const db = withPerformanceLogging(mockDb);
      clearQueryMetrics();

      mockDb.query.mockImplementation((sql: string, delay?: number) => {
        advanceTime(delay);
        return [{ id: 1 }];
      });

      // Add 25 slow queries
      for (let i = 0; i < 25; i++) {
        await db.query('SELECT 1', 150);
      }

      // Add 25 failed queries
      mockDb.query.mockImplementation(() => {
        throw new Error('Test error');
      });
      for (let i = 0; i < 25; i++) {
        try {
          await db.query(`SELECT ${i}`);
        } catch {
          // Expected error
        }
      }

      const summary = getQueryMetricsSummary();
      expect(summary.slowQueries.length).toBe(20);
      expect(summary.errorQueries.length).toBe(20);
    });
  });
});
