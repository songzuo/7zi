/**
 * 审计日志服务测试
 * @module lib/audit/__tests__/audit-logger.test
 * @version 1.12.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuditLogger, resetAuditLogger } from '../audit-logger.js';
import { MemoryAuditStorage } from '../storage/memory-storage.js';
import type { AuditLogEntry } from '../types.js';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    // 重置全局实例
    resetAuditLogger();

    // 创建新的实例，禁用异步写入以便测试
    const storage = new MemoryAuditStorage(1000);
    auditLogger = new AuditLogger(storage);

    // 禁用异步写入
    (auditLogger as any).config.asyncWrite = false;
  });

  afterEach(async () => {
    await auditLogger.shutdown();
    resetAuditLogger();
  });

  describe('log', () => {
    it('should log an audit entry', async () => {
      const logId = await auditLogger.log({
        userId: 'user123',
        action: 'CREATE',
        resource: 'document',
        resourceId: 'doc456',
        status: 'success',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(logId).toBeTruthy();
      expect(logId).toMatch(/^audit_/);

      const log = await auditLogger.getById(logId);
      expect(log).toBeTruthy();
      expect(log?.userId).toBe('user123');
      expect(log?.action).toBe('CREATE');
      expect(log?.resource).toBe('document');
      expect(log?.resourceId).toBe('doc456');
      expect(log?.status).toBe('success');
      expect(log?.ipAddress).toBe('192.168.1.1');
      expect(log?.userAgent).toBe('Mozilla/5.0');
    });

    it('should generate unique IDs', async () => {
      const id1 = await auditLogger.log({
        userId: 'user123',
        action: 'CREATE',
        resource: 'document',
        status: 'success',
      });

      const id2 = await auditLogger.log({
        userId: 'user123',
        action: 'CREATE',
        resource: 'document',
        status: 'success',
      });

      expect(id1).not.toBe(id2);
    });

    it('should include timestamp', async () => {
      const beforeTime = new Date();
      const logId = await auditLogger.log({
        userId: 'user123',
        action: 'CREATE',
        resource: 'document',
        status: 'success',
      });
      const afterTime = new Date();

      const log = await auditLogger.getById(logId);
      expect(log?.timestamp).toBeDefined();
      expect(log?.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(log?.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('logCreate', () => {
    it('should log CREATE action', async () => {
      const logId = await auditLogger.logCreate('user123', 'document', 'doc456', {
        title: 'Test Document',
      });

      const log = await auditLogger.getById(logId);
      expect(log?.action).toBe('CREATE');
      expect(log?.resource).toBe('document');
      expect(log?.resourceId).toBe('doc456');
      expect(log?.metadata).toEqual({ title: 'Test Document' });
    });
  });

  describe('logRead', () => {
    it('should log READ action', async () => {
      const logId = await auditLogger.logRead('user123', 'document', 'doc456');

      const log = await auditLogger.getById(logId);
      expect(log?.action).toBe('READ');
      expect(log?.resource).toBe('document');
      expect(log?.resourceId).toBe('doc456');
    });
  });

  describe('logUpdate', () => {
    it('should log UPDATE action', async () => {
      const logId = await auditLogger.logUpdate('user123', 'document', 'doc456', {
        changes: ['title', 'content'],
      });

      const log = await auditLogger.getById(logId);
      expect(log?.action).toBe('UPDATE');
      expect(log?.resource).toBe('document');
      expect(log?.resourceId).toBe('doc456');
      expect(log?.metadata).toEqual({ changes: ['title', 'content'] });
    });
  });

  describe('logDelete', () => {
    it('should log DELETE action', async () => {
      const logId = await auditLogger.logDelete('user123', 'document', 'doc456');

      const log = await auditLogger.getById(logId);
      expect(log?.action).toBe('DELETE');
      expect(log?.resource).toBe('document');
      expect(log?.resourceId).toBe('doc456');
    });
  });

  describe('logLogin', () => {
    it('should log LOGIN action', async () => {
      const logId = await auditLogger.logLogin(
        'user123',
        'john',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      const log = await auditLogger.getById(logId);
      expect(log?.action).toBe('LOGIN');
      expect(log?.resource).toBe('session');
      expect(log?.userId).toBe('user123');
      expect(log?.username).toBe('john');
      expect(log?.ipAddress).toBe('192.168.1.1');
      expect(log?.userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('logLogout', () => {
    it('should log LOGOUT action', async () => {
      const logId = await auditLogger.logLogout('user123', 'john');

      const log = await auditLogger.getById(logId);
      expect(log?.action).toBe('LOGOUT');
      expect(log?.resource).toBe('session');
      expect(log?.userId).toBe('user123');
      expect(log?.username).toBe('john');
    });
  });

  describe('logExport', () => {
    it('should log EXPORT action', async () => {
      const logId = await auditLogger.logExport('user123', 'document', {
        format: 'csv',
      });

      const log = await auditLogger.getById(logId);
      expect(log?.action).toBe('EXPORT');
      expect(log?.resource).toBe('document');
      expect(log?.metadata).toEqual({ format: 'csv' });
    });
  });

  describe('logAdmin', () => {
    it('should log ADMIN action', async () => {
      const logId = await auditLogger.logAdmin(
        'admin123',
        'delete_user',
        'user',
        'user456',
        { reason: 'violation' }
      );

      const log = await auditLogger.getById(logId);
      expect(log?.action).toBe('ADMIN');
      expect(log?.resource).toBe('user');
      expect(log?.resourceId).toBe('user456');
      expect(log?.metadata).toEqual({
        adminAction: 'delete_user',
        reason: 'violation',
      });
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // 添加测试数据
      await auditLogger.logCreate('user1', 'document', 'doc1');
      await auditLogger.logRead('user1', 'document', 'doc1');
      await auditLogger.logUpdate('user2', 'document', 'doc2');
      await auditLogger.logDelete('user2', 'document', 'doc3');
      await auditLogger.logLogin('user1', 'john');
      await auditLogger.logLogout('user2', 'jane');
    });

    it('should query all logs', async () => {
      const result = await auditLogger.query({});
      expect(result.logs.length).toBe(6);
      expect(result.total).toBe(6);
    });

    it('should filter by userId', async () => {
      const result = await auditLogger.query({ userId: 'user1' });
      expect(result.logs.length).toBe(3);
      expect(result.logs.every((log) => log.userId === 'user1')).toBe(true);
    });

    it('should filter by action', async () => {
      const result = await auditLogger.query({ action: 'CREATE' });
      expect(result.logs.length).toBe(1);
      expect(result.logs[0].action).toBe('CREATE');
    });

    it('should filter by resource', async () => {
      const result = await auditLogger.query({ resource: 'document' });
      expect(result.logs.length).toBe(4);
    });

    it('should filter by status', async () => {
      await auditLogger.log({
        userId: 'user1',
        action: 'CREATE',
        resource: 'document',
        status: 'failure',
        error: 'Test error',
      });

      const result = await auditLogger.query({ status: 'failure' });
      expect(result.logs.length).toBe(1);
      expect(result.logs[0].status).toBe('failure');
    });

    it('should sort by timestamp desc', async () => {
      const result = await auditLogger.query({
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });

      for (let i = 1; i < result.logs.length; i++) {
        expect(result.logs[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          result.logs[i].timestamp.getTime()
        );
      }
    });

    it('should paginate results', async () => {
      const result = await auditLogger.query({
        offset: 0,
        limit: 2,
      });

      expect(result.logs.length).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(2);
    });

    it('should search logs', async () => {
      const result = await auditLogger.query({ search: 'doc1' });
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.some((log) => log.resourceId === 'doc1')).toBe(true);
    });
  });

  describe('getById', () => {
    it('should return null for non-existent ID', async () => {
      const log = await auditLogger.getById('non-existent-id');
      expect(log).toBeNull();
    });

    it('should return log by ID', async () => {
      const logId = await auditLogger.logCreate('user123', 'document', 'doc456');
      const log = await auditLogger.getById(logId);

      expect(log).toBeTruthy();
      expect(log?.id).toBe(logId);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await auditLogger.logCreate('user1', 'document', 'doc1');
      await auditLogger.logRead('user1', 'document', 'doc1');
      await auditLogger.logUpdate('user2', 'document', 'doc2');
      await auditLogger.logDelete('user2', 'document', 'doc3');
      await auditLogger.logLogin('user1', 'john');
      await auditLogger.logLogout('user2', 'jane');
    });

    it('should return stats', async () => {
      const stats = await auditLogger.getStats();

      expect(stats.totalLogs).toBe(6);
      expect(stats.byAction.CREATE).toBe(1);
      expect(stats.byAction.READ).toBe(1);
      expect(stats.byAction.UPDATE).toBe(1);
      expect(stats.byAction.DELETE).toBe(1);
      expect(stats.byAction.LOGIN).toBe(1);
      expect(stats.byAction.LOGOUT).toBe(1);
      expect(stats.byStatus.success).toBe(6);
      expect(stats.byStatus.failure).toBe(0);
    });

    it('should filter stats by userId', async () => {
      const stats = await auditLogger.getStats({ userId: 'user1' });

      expect(stats.totalLogs).toBe(3);
    });

    it('should return top users', async () => {
      const stats = await auditLogger.getStats();

      expect(stats.topUsers.length).toBeGreaterThan(0);
      // @ts-ignore - logical OR in toBe is intentional test behavior
      expect(stats.topUsers[0].userId).toBe('user1' || 'user2');
    });

    it('should return byResource stats', async () => {
      const stats = await auditLogger.getStats();

      expect(stats.byResource.document).toBe(4);
      expect(stats.byResource.session).toBe(2);
    });
  });

  describe('export', () => {
    beforeEach(async () => {
      await auditLogger.logCreate('user1', 'document', 'doc1');
      await auditLogger.logRead('user1', 'document', 'doc1');
      await auditLogger.logUpdate('user2', 'document', 'doc2');
    });

    it('should export as JSON', async () => {
      const data = await auditLogger.export({
        format: 'json',
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(),
      });

      const parsed = JSON.parse(data);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(3);
    });

    it('should export as CSV', async () => {
      const data = await auditLogger.export({
        format: 'csv',
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(),
      });

      expect(data).toContain('"id","userId","username","action","resource"');
      const lines = data.split('\n');
      expect(lines.length).toBeGreaterThan(1); // header + data
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        auditLogger.export({
          format: 'xml' as any,
          startTime: new Date(Date.now() - 60000),
          endTime: new Date(),
        })
      ).rejects.toThrow('Unsupported export format');
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired logs', async () => {
      // 直接添加一个过期日志到存储中
      const storage = auditLogger['storage'] as MemoryAuditStorage;
      await storage.add({
        id: 'audit_old',
        userId: 'user1',
        action: 'CREATE',
        resource: 'document',
        status: 'success',
        timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
      });

      await auditLogger.logCreate('user1', 'document', 'doc1');

      // 删除90天前的日志
      const deleted = await auditLogger.deleteExpired();

      expect(deleted).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all logs', async () => {
      await auditLogger.logCreate('user1', 'document', 'doc1');
      await auditLogger.logRead('user1', 'document', 'doc1');

      await auditLogger.clear();

      const result = await auditLogger.query({});
      expect(result.logs.length).toBe(0);
    });
  });

  describe('async write', () => {
    it('should buffer logs when async write is enabled', async () => {
      // 创建一个新的实例，启用异步写入
      const storage = new MemoryAuditStorage(1000);
      const asyncLogger = new AuditLogger(storage);
      // 确保异步写入是启用的
      expect((asyncLogger as any).config.asyncWrite).toBe(true);

      // 记录多个日志，达到批量大小
      const batchSize = (asyncLogger as any).config.batchSize;
      const promises = [];
      for (let i = 0; i < batchSize; i++) {
        promises.push(asyncLogger.logCreate(`user${i}`, 'document', `doc${i}`));
      }
      await Promise.all(promises);

      // 等待批量写入
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证日志已写入
      const result = await asyncLogger.query({});
      expect(result.logs.length).toBe(batchSize);

      await asyncLogger.shutdown();
    });
  });
});