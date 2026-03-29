/**
 * Database Tracker Tests
 * 数据库追踪器单元测试（修复版）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseTracker, DEFAULT_DATABASE_TRACKER_CONFIG, QueryIssue } from '../database-tracker';
import { SlowQuery } from '../types';

describe('DatabaseTracker', () => {
  let tracker: DatabaseTracker;

  beforeEach(() => {
    tracker = new DatabaseTracker();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      expect(tracker).toBeDefined();
    });

    it('should accept custom config', () => {
      const customTracker = new DatabaseTracker({ threshold: 500 });
      expect(customTracker).toBeDefined();
    });
  });

  describe('trackQuery', () => {
    it('should track slow queries above threshold', () => {
      tracker.trackQuery('SELECT * FROM users', 1500, 100);
      
      const slowQueries = tracker.getSlowQueries();
      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].duration).toBe(1500);
    });

    it('should not track fast queries below threshold', () => {
      tracker.trackQuery('SELECT * FROM users', 500, 100);
      
      const slowQueries = tracker.getSlowQueries();
      expect(slowQueries.length).toBe(0);
    });

    it('should extract query type correctly', () => {
      tracker.trackQuery('SELECT * FROM users', 1500, 100);
      tracker.trackQuery('INSERT INTO users VALUES (1)', 1500, 1);
      tracker.trackQuery('UPDATE users SET name = ?', 1500, 1);
      tracker.trackQuery('DELETE FROM users WHERE id = ?', 1500, 1);

      const slowQueries = tracker.getSlowQueries();
      // 按时长排序（降序），所有查询时长相同，所以顺序可能变化
      expect(slowQueries.some(q => q.type === 'SELECT')).toBe(true);
      expect(slowQueries.some(q => q.type === 'INSERT')).toBe(true);
      expect(slowQueries.some(q => q.type === 'UPDATE')).toBe(true);
      expect(slowQueries.some(q => q.type === 'DELETE')).toBe(true);
    });

    it('should sanitize sensitive data in queries', () => {
      tracker.trackQuery("SELECT * FROM users WHERE password = 'secret123'", 1500, 100);
      
      const slowQueries = tracker.getSlowQueries();
      expect(slowQueries[0].query).not.toContain('secret123');
      expect(slowQueries[0].query).toContain('?');
    });

    it('should track queries when disabled', () => {
      const disabledTracker = new DatabaseTracker({ enabled: false });
      disabledTracker.trackQuery('SELECT * FROM users', 1500, 100);
      
      const slowQueries = disabledTracker.getSlowQueries();
      expect(slowQueries.length).toBe(0);
    });
  });

  describe('identifyQueryIssues', () => {
    it('should detect full scan (SELECT *)', () => {
      const queries: SlowQuery[] = [{
        query: 'SELECT * FROM users',
        duration: 2000,
        rowCount: 1000,
        timestamp: Date.now(),
        type: 'SELECT',
      }];

      const issues = tracker.identifyQueryIssues(queries);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('full-scan');
      expect(issues[0].severity).toBe('high');
    });

    it('should detect large result set', () => {
      const queries: SlowQuery[] = [{
        query: 'SELECT id, name FROM users',
        duration: 6000,
        rowCount: 15000,
        timestamp: Date.now(),
        type: 'SELECT',
      }];

      const issues = tracker.identifyQueryIssues(queries);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('large-result');
      expect(issues[0].severity).toBe('critical');
    });

    it('should detect missing index (slow JOIN)', () => {
      const queries: SlowQuery[] = [{
        query: 'SELECT id, name FROM users JOIN orders ON users.id = orders.user_id',
        duration: 3000,
        rowCount: 500,
        timestamp: Date.now(),
        type: 'SELECT',
      }];

      const issues = tracker.identifyQueryIssues(queries);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.type === 'missing-index' || i.type === 'slow-join')).toBe(true);
    });

    it('should detect inefficient WHERE (LIKE with leading wildcard)', () => {
      const queries: SlowQuery[] = [{
        query: "SELECT id, name FROM users WHERE name LIKE '%john%'",
        duration: 2500,
        rowCount: 100,
        timestamp: Date.now(),
        type: 'SELECT',
      }];

      const issues = tracker.identifyQueryIssues(queries);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.type === 'inefficient-where')).toBe(true);
    });

    it('should detect potential N+1 pattern', () => {
      const queries: SlowQuery[] = [{
        query: 'SELECT id, name FROM users WHERE id IN (SELECT user_id FROM orders)',
        duration: 2500,
        rowCount: 100,
        timestamp: Date.now(),
        type: 'SELECT',
      }];

      const issues = tracker.identifyQueryIssues(queries);
      expect(issues.some(i => i.type === 'n-plus-1')).toBe(true);
    });

    it('should return empty array for efficient queries', () => {
      const queries: SlowQuery[] = [{
        query: 'SELECT id, name FROM users WHERE id = ?',
        duration: 100,
        rowCount: 1,
        timestamp: Date.now(),
        type: 'SELECT',
      }];

      const issues = tracker.identifyQueryIssues(queries);
      expect(issues.length).toBe(0);
    });
  });

  describe('getSlowQueries', () => {
    it('should return all slow queries', () => {
      tracker.trackQuery('SELECT * FROM users', 1500, 100);
      tracker.trackQuery('SELECT * FROM orders', 2000, 50);

      const slowQueries = tracker.getSlowQueries();
      expect(slowQueries.length).toBe(2);
    });

    it('should return limited number of queries', () => {
      for (let i = 0; i < 20; i++) {
        tracker.trackQuery(`SELECT * FROM table${i}`, 1500 + i * 100, 100);
      }

      const slowQueries = tracker.getSlowQueries(5);
      expect(slowQueries.length).toBe(5);
    });

    it('should return queries sorted by duration (descending)', () => {
      tracker.trackQuery('SELECT * FROM users', 1500, 100);
      tracker.trackQuery('SELECT * FROM orders', 3000, 50);
      tracker.trackQuery('SELECT * FROM products', 2000, 30);

      const slowQueries = tracker.getSlowQueries();
      expect(slowQueries[0].duration).toBe(3000);
      expect(slowQueries[1].duration).toBe(2000);
      expect(slowQueries[2].duration).toBe(1500);
    });
  });

  describe('getSlowestQueries', () => {
    it('should return top N slowest queries', () => {
      for (let i = 0; i < 15; i++) {
        tracker.trackQuery(`SELECT * FROM table${i}`, 1000 + i * 100, 100);
      }

      const slowest = tracker.getSlowestQueries(5);
      expect(slowest.length).toBe(5);
      expect(slowest[0].duration).toBe(2400);
    });
  });

  describe('getQueriesByType', () => {
    it('should count queries by type', () => {
      tracker.trackQuery('SELECT * FROM users', 1500, 100);
      tracker.trackQuery('SELECT * FROM orders', 2000, 50);
      tracker.trackQuery('INSERT INTO users VALUES (?)', 1200, 1);
      tracker.trackQuery('UPDATE users SET name = ?', 1500, 1);

      const counts = tracker.getQueriesByType();
      expect(counts.SELECT).toBe(2);
      expect(counts.INSERT).toBe(1);
      expect(counts.UPDATE).toBe(1);
      expect(counts.DELETE).toBe(0);
    });
  });

  describe('getQueriesByTable', () => {
    it('should count queries by table', () => {
      tracker.trackQuery('SELECT * FROM users', 1500, 100);
      tracker.trackQuery('SELECT * FROM users', 2000, 50);
      tracker.trackQuery('SELECT * FROM orders', 1200, 1);

      const counts = tracker.getQueriesByTable();
      expect(counts.users).toBe(2);
      expect(counts.orders).toBe(1);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      tracker.trackQuery('SELECT * FROM users', 1500, 100);
      tracker.trackQuery('SELECT * FROM orders', 2000, 50);

      tracker.clearHistory();

      const slowQueries = tracker.getSlowQueries();
      expect(slowQueries.length).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      tracker.updateConfig({ threshold: 500 });

      tracker.trackQuery('SELECT * FROM users', 800, 100);
      const slowQueries = tracker.getSlowQueries();

      expect(slowQueries.length).toBe(1);
    });
  });

  describe('exportData', () => {
    it('should export tracker data', () => {
      tracker.trackQuery('SELECT * FROM users', 1500, 100);
      tracker.trackQuery('SELECT * FROM orders', 2000, 50);

      const data = tracker.exportData();

      expect(data.slowQueries.length).toBe(2);
      expect(data.config).toBeDefined();
    });
  });

  describe('maxHistorySize', () => {
    it('should respect max history size', () => {
      const limitedTracker = new DatabaseTracker({ maxHistorySize: 5 });

      for (let i = 0; i < 10; i++) {
        limitedTracker.trackQuery(`SELECT * FROM table${i}`, 1500, 100);
      }

      const slowQueries = limitedTracker.getSlowQueries();
      expect(slowQueries.length).toBe(5);
    });
  });

  describe('Query Suggestions', () => {
    it('should provide appropriate suggestions for SELECT *', () => {
      const queries: SlowQuery[] = [{
        query: 'SELECT * FROM users',
        duration: 2000,
        rowCount: 1000,
        timestamp: Date.now(),
        type: 'SELECT',
      }];

      const issues = tracker.identifyQueryIssues(queries);
      expect(issues[0].suggestion).toContain('specify only required columns');
    });

    it('should provide appropriate suggestions for large result', () => {
      const queries: SlowQuery[] = [{
        query: 'SELECT id, name FROM large_table',
        duration: 8000,
        rowCount: 25000,
        timestamp: Date.now(),
        type: 'SELECT',
      }];

      const issues = tracker.identifyQueryIssues(queries);
      expect(issues[0].type).toBe('large-result');
      expect(issues[0].severity).toBe('critical');
    });
  });
});

describe('DatabaseTracker Integration', () => {
  it('should handle multiple queries and provide comprehensive analysis', () => {
    const tracker = new DatabaseTracker();

    // Track various queries
    tracker.trackQuery('SELECT * FROM users', 1500, 1000);
    tracker.trackQuery('SELECT * FROM orders', 3000, 500);
    tracker.trackQuery('SELECT id, name FROM products', 200, 50);
    tracker.trackQuery('INSERT INTO logs VALUES (?)', 100, 1);

    const slowQueries = tracker.getSlowQueries();
    const byType = tracker.getQueriesByType();

    expect(slowQueries.length).toBe(2); // Only slow queries
    expect(byType.SELECT).toBe(2);
    expect(byType.INSERT).toBe(0); // INSERT was not slow
  });

  it('should provide actionable insights', () => {
    const tracker = new DatabaseTracker();

    // Track problematic query
    tracker.trackQuery('SELECT id, name FROM large_table', 6000, 15000);
    
    const slowQueries = tracker.getSlowQueries();
    const issues = tracker.identifyQueryIssues(slowQueries);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].type).toBe('large-result');
    expect(issues[0].suggestion.length).toBeGreaterThan(10);
  });
});
