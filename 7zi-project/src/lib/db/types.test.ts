/**
 * Tests for Database Type Definitions
 */

import { describe, it, expect } from 'vitest';
import type {
  DatabaseHealth,
  PerformanceReport,
  SlowQuery,
  TableAnalysis,
  TableIndex,
  DatabaseSizeInfo,
  MissingIndex,
  CacheStatistics,
} from './types';

describe('Database Types', () => {
  describe('DatabaseHealth', () => {
    it('should create valid database health object', () => {
      const health: DatabaseHealth = {
        size: {
          sizeInMB: 256.5,
          fragmentationPercent: 15.3,
        },
        migrationVersion: 5,
        latestMigration: 5,
        needsMigration: false,
      };

      expect(health.size.sizeInMB).toBe(256.5);
      expect(health.size.fragmentationPercent).toBe(15.3);
      expect(health.migrationVersion).toBe(5);
      expect(health.latestMigration).toBe(5);
      expect(health.needsMigration).toBe(false);
    });

    it('should indicate when migration is needed', () => {
      const health: DatabaseHealth = {
        size: {
          sizeInMB: 100,
          fragmentationPercent: 5,
        },
        migrationVersion: 3,
        latestMigration: 5,
        needsMigration: true,
      };

      expect(health.needsMigration).toBe(true);
      expect(health.migrationVersion).toBeLessThan(health.latestMigration);
    });
  });

  describe('SlowQuery', () => {
    it('should create slow query without suggestion', () => {
      const query: SlowQuery = {
        sql: 'SELECT * FROM users WHERE email = ?',
        executionTime: 1500,
        threshold: 1000,
      };

      expect(query.sql).toBe('SELECT * FROM users WHERE email = ?');
      expect(query.executionTime).toBe(1500);
      expect(query.threshold).toBe(1000);
      expect(query.suggestedIndex).toBeUndefined();
      expect(query.tableName).toBeUndefined();
    });

    it('should create slow query with suggestion', () => {
      const query: SlowQuery = {
        sql: 'SELECT * FROM orders WHERE user_id = ? AND status = ?',
        executionTime: 2500,
        threshold: 1000,
        suggestedIndex: 'CREATE INDEX idx_orders_user_status ON orders(user_id, status)',
        tableName: 'orders',
      };

      expect(query.suggestedIndex).toBe('CREATE INDEX idx_orders_user_status ON orders(user_id, status)');
      expect(query.tableName).toBe('orders');
    });
  });

  describe('TableIndex', () => {
    it('should create table index', () => {
      const index: TableIndex = {
        name: 'idx_users_email',
        columns: ['email'],
        unique: true,
      };

      expect(index.name).toBe('idx_users_email');
      expect(index.columns).toEqual(['email']);
      expect(index.unique).toBe(true);
    });

    it('should create composite index', () => {
      const index: TableIndex = {
        name: 'idx_orders_user_status',
        columns: ['user_id', 'status', 'created_at'],
        unique: false,
      };

      expect(index.columns.length).toBe(3);
      expect(index.unique).toBe(false);
    });
  });

  describe('TableAnalysis', () => {
    it('should create table analysis', () => {
      const analysis: TableAnalysis = {
        name: 'users',
        rowCount: 10000,
        indexes: [
          {
            name: 'idx_users_email',
            columns: ['email'],
            unique: true,
          },
        ],
        size: 15.5,
        suggestions: ['Consider partitioning by date'],
      };

      expect(analysis.name).toBe('users');
      expect(analysis.rowCount).toBe(10000);
      expect(analysis.indexes.length).toBe(1);
      expect(analysis.size).toBe(15.5);
      expect(analysis.suggestions.length).toBe(1);
    });

    it('should create table analysis without indexes', () => {
      const analysis: TableAnalysis = {
        name: 'logs',
        rowCount: 1000000,
        indexes: [],
        size: 512.75,
        suggestions: ['Add indexes for frequently queried columns'],
      };

      expect(analysis.indexes.length).toBe(0);
      expect(analysis.suggestions[0]).toContain('indexes');
    });
  });

  describe('DatabaseSizeInfo', () => {
    it('should create database size info', () => {
      const sizeInfo: DatabaseSizeInfo = {
        pageSize: 4096,
        pageCount: 65536,
        freePages: 10240,
        sizeInMB: 256,
      };

      expect(sizeInfo.pageSize).toBe(4096);
      expect(sizeInfo.pageCount).toBe(65536);
      expect(sizeInfo.freePages).toBe(10240);
      expect(sizeInfo.sizeInMB).toBe(256);
    });

    it('should calculate used pages correctly', () => {
      const sizeInfo: DatabaseSizeInfo = {
        pageSize: 4096,
        pageCount: 65536,
        freePages: 10240,
        sizeInMB: 256,
      };

      const usedPages = sizeInfo.pageCount - sizeInfo.freePages;
      expect(usedPages).toBe(55296);
    });
  });

  describe('MissingIndex', () => {
    it('should create missing index', () => {
      const missing: MissingIndex = {
        table: 'orders',
        columns: ['user_id', 'status'],
        reason: 'High-frequency query pattern detected',
      };

      expect(missing.table).toBe('orders');
      expect(missing.columns).toEqual(['user_id', 'status']);
      expect(missing.reason).toBe('High-frequency query pattern detected');
    });

    it('should create missing index for single column', () => {
      const missing: MissingIndex = {
        table: 'users',
        columns: ['email'],
        reason: 'Unique constraint not indexed',
      };

      expect(missing.columns.length).toBe(1);
    });
  });

  describe('CacheStatistics', () => {
    it('should create cache statistics', () => {
      const stats: CacheStatistics = {
        hits: 950,
        misses: 50,
        hitRate: 0.95,
        entries: 150,
        totalSize: 1024000,
        evictions: 10,
      };

      expect(stats.hits).toBe(950);
      expect(stats.misses).toBe(50);
      expect(stats.hitRate).toBe(0.95);
      expect(stats.entries).toBe(150);
      expect(stats.totalSize).toBe(1024000);
      expect(stats.evictions).toBe(10);
    });

    it('should calculate hit rate from hits and misses', () => {
      const stats: CacheStatistics = {
        hits: 800,
        misses: 200,
        hitRate: 0,
        entries: 100,
        totalSize: 0,
        evictions: 0,
      };

      const calculatedRate = stats.hits / (stats.hits + stats.misses);
      expect(calculatedRate).toBe(0.8);
    });

    it('should handle zero requests', () => {
      const stats: CacheStatistics = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        entries: 0,
        totalSize: 0,
        evictions: 0,
      };

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('PerformanceReport', () => {
    it('should create comprehensive performance report', () => {
      const report: PerformanceReport = {
        timestamp: '2024-01-15T10:30:00Z',
        slowQueries: [
          {
            sql: 'SELECT * FROM large_table',
            executionTime: 2000,
            threshold: 1000,
          },
        ],
        tableAnalyses: [
          {
            name: 'users',
            rowCount: 50000,
            indexes: [],
            size: 25.5,
            suggestions: [],
          },
        ],
        recommendations: [
          'Add index on frequently queried column',
          'Consider archiving old data',
        ],
        databaseSize: {
          pageSize: 4096,
          pageCount: 10000,
          freePages: 2000,
          sizeInMB: 31.25,
        },
        missingIndexes: [
          {
            table: 'orders',
            columns: ['user_id'],
            reason: 'Missing index for foreign key',
          },
        ],
      };

      expect(report.timestamp).toBe('2024-01-15T10:30:00Z');
      expect(report.slowQueries.length).toBe(1);
      expect(report.tableAnalyses.length).toBe(1);
      expect(report.recommendations.length).toBe(2);
      expect(report.databaseSize.sizeInMB).toBe(31.25);
      expect(report.missingIndexes.length).toBe(1);
    });

    it('should create empty performance report', () => {
      const report: PerformanceReport = {
        timestamp: new Date().toISOString(),
        slowQueries: [],
        tableAnalyses: [],
        recommendations: [],
        databaseSize: {
          pageSize: 4096,
          pageCount: 0,
          freePages: 0,
          sizeInMB: 0,
        },
        missingIndexes: [],
      };

      expect(report.slowQueries.length).toBe(0);
      expect(report.tableAnalyses.length).toBe(0);
      expect(report.missingIndexes.length).toBe(0);
    });
  });
});
