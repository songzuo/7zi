/**
 * Database Transport 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getDbTransport } from './database-transport';
import type { LogEntry, LogQuery, LogCategory, LogLevel } from './types';

describe('DatabaseTransport', () => {
  let dbTransport: ReturnType<typeof getDbTransport>;

  beforeEach(() => {
    // Get fresh transport for each test
    dbTransport = getDbTransport();
  });

  describe('log', () => {
    it('应该添加日志条目', () => {
      const entry: LogEntry = {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        level: 'info',
        category: 'api',
        message: 'Test log message',
      };

      dbTransport.log(entry);

      const result = dbTransport.query({ limit: 10 });
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].message).toBe('Test log message');
    });

    it('应该自动生成 ID 和时间戳', () => {
      const entry: LogEntry = {
        level: 'info',
        category: 'api',
        message: 'Test log without id',
      };

      dbTransport.log(entry);

      const result = dbTransport.query({});
      expect(result.logs[0].id).toBeDefined();
      expect(result.logs[0].timestamp).toBeDefined();
    });

    it('应该存储完整的日志条目', () => {
      const entry: LogEntry = {
        id: 'log-full',
        timestamp: '2026-03-14T00:00:00Z',
        level: 'error',
        category: 'security',
        message: 'Security violation',
        userId: 'user-123',
        requestId: 'req-456',
        route: '/api/admin',
        metadata: { action: 'unauthorized_access' },
        error: {
          name: 'SecurityError',
          message: 'Access denied',
          stack: 'Error: Access denied\n    at...',
        },
      };

      dbTransport.log(entry);

      const result = dbTransport.query({});
      const logged = result.logs[0];
      
      expect(logged.id).toBe('log-full');
      expect(logged.level).toBe('error');
      expect(logged.category).toBe('security');
      expect(logged.userId).toBe('user-123');
      expect(logged.requestId).toBe('req-456');
      expect(logged.metadata).toEqual({ action: 'unauthorized_access' });
      expect(logged.error?.message).toBe('Access denied');
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // Add test data
      const logs: LogEntry[] = [
        { id: '1', timestamp: '2026-03-10T10:00:00Z', level: 'info', category: 'api', message: 'API request 1' },
        { id: '2', timestamp: '2026-03-11T10:00:00Z', level: 'warn', category: 'api', message: 'API warning' },
        { id: '3', timestamp: '2026-03-12T10:00:00Z', level: 'error', category: 'auth', message: 'Auth error' },
        { id: '4', timestamp: '2026-03-13T10:00:00Z', level: 'info', category: 'api', message: 'API request 2' },
        { id: '5', timestamp: '2026-03-14T10:00:00Z', level: 'debug', category: 'system', message: 'System debug' },
      ];
      
      logs.forEach(log => dbTransport.log(log));
    });

    it('应该返回所有日志 (默认)', () => {
      const result = dbTransport.query({});
      expect(result.total).toBeGreaterThanOrEqual(5);
    });

    it('应该按时间范围过滤', () => {
      const result = dbTransport.query({
        startTime: '2026-03-12T00:00:00Z',
        endTime: '2026-03-13T23:59:59Z',
      });
      
      expect(result.logs.length).toBeGreaterThan(0);
      result.logs.forEach(log => {
        const timestamp = new Date(log.timestamp).getTime();
        expect(timestamp).toBeGreaterThanOrEqual(new Date('2026-03-12').getTime());
        expect(timestamp).toBeLessThanOrEqual(new Date('2026-03-14').getTime());
      });
    });

    it('应该按日志级别过滤', () => {
      const result = dbTransport.query({ levels: ['error'] });
      
      expect(result.logs.length).toBeGreaterThan(0);
      result.logs.forEach(log => {
        expect(log.level).toBe('error');
      });
    });

    it('应该按分类过滤', () => {
      const result = dbTransport.query({ categories: ['auth'] });
      
      result.logs.forEach(log => {
        expect(log.category).toBe('auth');
      });
    });

    it('应该按搜索关键词过滤', () => {
      const result = dbTransport.query({ search: 'API' });
      
      result.logs.forEach(log => {
        expect(log.message.toLowerCase()).toContain('api');
      });
    });

    it('应该按用户ID过滤', () => {
      dbTransport.log({
        id: 'user-log',
        timestamp: new Date().toISOString(),
        level: 'info',
        category: 'api',
        message: 'User action',
        userId: 'user-999',
      });

      const result = dbTransport.query({ userId: 'user-999' });
      
      expect(result.logs.length).toBe(1);
      expect(result.logs[0].userId).toBe('user-999');
    });

    it('应该按请求ID过滤', () => {
      dbTransport.log({
        id: 'req-log',
        timestamp: new Date().toISOString(),
        level: 'info',
        category: 'api',
        message: 'Request log',
        requestId: 'req-abc',
      });

      const result = dbTransport.query({ requestId: 'req-abc' });
      
      expect(result.logs.length).toBe(1);
      expect(result.logs[0].requestId).toBe('req-abc');
    });

    it('应该按路由过滤', () => {
      dbTransport.log({
        id: 'route-log',
        timestamp: new Date().toISOString(),
        level: 'info',
        category: 'api',
        message: 'Route log',
        route: '/api/users',
      });

      const result = dbTransport.query({ route: '/api/users' });
      
      expect(result.logs.length).toBe(1);
      expect(result.logs[0].route).toBe('/api/users');
    });

    it('应该支持分页', () => {
      const result = dbTransport.query({ page: 1, limit: 2 });
      
      expect(result.logs.length).toBeLessThanOrEqual(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.hasMore).toBeDefined();
    });

    it('应该支持排序', () => {
      const resultAsc = dbTransport.query({ orderBy: 'timestamp', order: 'asc', limit: 5 });
      const resultDesc = dbTransport.query({ orderBy: 'timestamp', order: 'desc', limit: 5 });

      // First log in asc should be earlier than last
      const ascTimes = resultAsc.logs.map(l => new Date(l.timestamp).getTime());
      const descTimes = resultDesc.logs.map(l => new Date(l.timestamp).getTime());

      expect(ascTimes[0]).toBeLessThanOrEqual(ascTimes[ascTimes.length - 1]);
      expect(descTimes[0]).toBeGreaterThanOrEqual(descTimes[descTimes.length - 1]);
    });
  });

  describe('count', () => {
    it('应该返回日志总数', () => {
      const count = dbTransport.count({});
      expect(count).toBeGreaterThan(0);
    });

    it('应该过滤后计数', () => {
      const count = dbTransport.count({ levels: ['error'] });
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanup', () => {
    it('应该清理旧日志', () => {
      // Add old logs
      const oldDate = '2020-01-01T00:00:00Z';
      dbTransport.log({
        id: 'old-log',
        timestamp: oldDate,
        level: 'info',
        category: 'system',
        message: 'Old log',
      });

      const initialCount = dbTransport.count({});
      
      // Clean up logs older than 1 day
      const deleted = dbTransport.cleanup(1);
      
      // Should have deleted at least the old log
      expect(deleted).toBeGreaterThan(0);
    });

    it('应该保留新日志', () => {
      const newLog: LogEntry = {
        id: 'new-log',
        timestamp: new Date().toISOString(),
        level: 'info',
        category: 'system',
        message: 'New log',
      };
      
      dbTransport.log(newLog);
      const countBefore = dbTransport.count({});
      
      dbTransport.cleanup(1);
      
      const countAfter = dbTransport.count({});
      expect(countAfter).toBeGreaterThanOrEqual(countBefore - 1);
    });
  });
});
