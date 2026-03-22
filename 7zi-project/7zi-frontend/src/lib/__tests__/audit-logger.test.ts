/**
 * Audit Logger Tests
 *
 * 审计日志记录器单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuditLogger, AuditEventType, AuditLogLevel } from '../audit/logger';

describe('AuditLogger', () => {
  beforeEach(() => {
    // 清理之前的审计日志（通过重新导入模块或使用测试数据库）
  });

  afterEach(async () => {
    // 清理测试数据
    await AuditLogger.cleanup(0); // 清理所有日志
  });

  describe('logAuthEvent', () => {
    it('should log successful login', async () => {
      const log = await AuditLogger.logAuthEvent('login.success', {
        userId: 'user-123',
        username: 'testuser',
        ipAddress: '192.168.1.1',
        success: true,
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.LOGIN_SUCCESS);
      expect(log.userId).toBe('user-123');
      expect(log.username).toBe('testuser');
      expect(log.ipAddress).toBe('192.168.1.1');
      expect(log.success).toBe(true);
      expect(log.level).toBe(AuditLogLevel.INFO);
    });

    it('should log failed login', async () => {
      const log = await AuditLogger.logAuthEvent('login.failed', {
        username: 'testuser',
        ipAddress: '192.168.1.1',
        success: false,
        error: 'Invalid credentials',
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.LOGIN_FAILED);
      expect(log.success).toBe(false);
      expect(log.error).toBe('Invalid credentials');
      expect(log.level).toBe(AuditLogLevel.WARN);
    });
  });

  describe('logRegistration', () => {
    it('should log user registration', async () => {
      const log = await AuditLogger.logRegistration({
        userId: 'user-456',
        username: 'newuser',
        ipAddress: '192.168.1.2',
        email: 'newuser@example.com',
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.REGISTER);
      expect(log.userId).toBe('user-456');
      expect(log.username).toBe('newuser');
      expect(log.email).toBe('newuser@example.com');
      expect(log.success).toBe(true);
      expect(log.level).toBe(AuditLogLevel.INFO);
    });
  });

  describe('logPasswordReset', () => {
    it('should log password reset request', async () => {
      const log = await AuditLogger.logPasswordReset('password.reset.request', {
        username: 'testuser',
        ipAddress: '192.168.1.3',
        success: true,
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.PASSWORD_RESET_REQUEST);
      expect(log.username).toBe('testuser');
      expect(log.success).toBe(true);
    });

    it('should log password reset success', async () => {
      const log = await AuditLogger.logPasswordReset('password.reset.success', {
        userId: 'user-123',
        ipAddress: '192.168.1.3',
        success: true,
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.PASSWORD_RESET_SUCCESS);
      expect(log.userId).toBe('user-123');
    });
  });

  describe('logPermissionChange', () => {
    it('should log permission grant', async () => {
      const log = await AuditLogger.logPermissionChange('permission.granted', {
        actorUserId: 'admin-1',
        actorUsername: 'admin',
        targetUserId: 'user-123',
        targetUsername: 'testuser',
        permission: 'admin',
        ipAddress: '192.168.1.4',
        success: true,
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.PERMISSION_GRANTED);
      expect(log.userId).toBe('admin-1');
      expect(log.username).toBe('admin');
      expect(log.resourceId).toBe('user-123');
      expect(log.success).toBe(true);
    });

    it('should log permission revoke', async () => {
      const log = await AuditLogger.logPermissionChange('permission.revoked', {
        actorUserId: 'admin-1',
        actorUsername: 'admin',
        targetUserId: 'user-123',
        targetUsername: 'testuser',
        permission: 'admin',
        ipAddress: '192.168.1.4',
        success: true,
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.PERMISSION_REVOKED);
      expect(log.userId).toBe('admin-1');
    });
  });

  describe('logDataAccess', () => {
    it('should log data read', async () => {
      const log = await AuditLogger.logDataAccess('data.read', {
        userId: 'user-123',
        username: 'testuser',
        ipAddress: '192.168.1.5',
        resourceType: 'project',
        resourceId: 'project-1',
        path: '/api/projects/project-1',
        method: 'GET',
        success: true,
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.DATA_READ);
      expect(log.resourceType).toBe('project');
      expect(log.resourceId).toBe('project-1');
      expect(log.path).toBe('/api/projects/project-1');
      expect(log.method).toBe('GET');
    });

    it('should log data creation', async () => {
      const log = await AuditLogger.logDataAccess('data.created', {
        userId: 'user-123',
        username: 'testuser',
        ipAddress: '192.168.1.5',
        resourceType: 'project',
        resourceId: 'project-2',
        path: '/api/projects',
        method: 'POST',
        success: true,
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.DATA_CREATED);
      expect(log.method).toBe('POST');
    });
  });

  describe('logApiAccess', () => {
    it('should log successful API access', async () => {
      const log = await AuditLogger.logApiAccess({
        userId: 'user-123',
        username: 'testuser',
        ipAddress: '192.168.1.6',
        path: '/api/test',
        method: 'GET',
        success: true,
        statusCode: 200,
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.API_ACCESS);
      expect(log.path).toBe('/api/test');
      expect(log.method).toBe('GET');
      expect(log.success).toBe(true);
      expect(log.level).toBe(AuditLogLevel.INFO);
    });

    it('should log failed API access', async () => {
      const log = await AuditLogger.logApiAccess({
        userId: 'user-123',
        username: 'testuser',
        ipAddress: '192.168.1.6',
        path: '/api/test',
        method: 'GET',
        success: false,
        statusCode: 500,
        error: 'Internal server error',
      });

      expect(log).toBeDefined();
      expect(log.success).toBe(false);
      expect(log.error).toBe('Internal server error');
      expect(log.level).toBe(AuditLogLevel.WARN);
    });
  });

  describe('logRateLimitExceeded', () => {
    it('should log rate limit exceeded', async () => {
      const log = await AuditLogger.logRateLimitExceeded({
        userId: 'user-123',
        username: 'testuser',
        ipAddress: '192.168.1.7',
        path: '/api/test',
        limit: 100,
        windowMs: 60000,
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.API_RATE_LIMIT_EXCEEDED);
      expect(log.path).toBe('/api/test');
      expect(log.success).toBe(false);
      expect(log.level).toBe(AuditLogLevel.WARN);
      expect(log.details?.limit).toBe(100);
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security violation', async () => {
      const log = await AuditLogger.logSecurityEvent('security.violation', {
        userId: 'user-123',
        username: 'testuser',
        ipAddress: '192.168.1.8',
        message: 'Multiple failed login attempts detected',
        details: { attempts: 5 },
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.SECURITY_VIOLATION);
      expect(log.message).toBe('Multiple failed login attempts detected');
      expect(log.details?.attempts).toBe(5);
      expect(log.success).toBe(false);
      expect(log.level).toBe(AuditLogLevel.WARN);
    });

    it('should log critical security alert', async () => {
      const log = await AuditLogger.logSecurityEvent('security.alert', {
        ipAddress: '192.168.1.8',
        message: 'SQL injection attempt detected',
        details: { payload: "' OR '1'='1" },
        level: AuditLogLevel.CRITICAL,
      });

      expect(log).toBeDefined();
      expect(log.eventType).toBe(AuditEventType.SECURITY_ALERT);
      expect(log.level).toBe(AuditLogLevel.CRITICAL);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // 创建一些测试日志
      await AuditLogger.logAuthEvent('login.success', {
        userId: 'user-1',
        username: 'user1',
        ipAddress: '192.168.1.10',
        success: true,
      });

      await AuditLogger.logAuthEvent('login.failed', {
        username: 'user2',
        ipAddress: '192.168.1.11',
        success: false,
        error: 'Invalid credentials',
      });

      await AuditLogger.logAuthEvent('login.success', {
        userId: 'user-1',
        username: 'user1',
        ipAddress: '192.168.1.10',
        success: true,
      });
    });

    it('should query logs by userId', async () => {
      const logs = await AuditLogger.query({ userId: 'user-1' });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every(log => log.userId === 'user-1')).toBe(true);
    });

    it('should query logs by eventType', async () => {
      const logs = await AuditLogger.query({ eventType: AuditEventType.LOGIN_SUCCESS });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every(log => log.eventType === AuditEventType.LOGIN_SUCCESS)).toBe(true);
    });

    it('should query logs by success status', async () => {
      const failedLogs = await AuditLogger.query({ success: false });

      expect(failedLogs.length).toBeGreaterThan(0);
      expect(failedLogs.every(log => log.success === false)).toBe(true);
    });

    it('should query logs by ipAddress', async () => {
      const logs = await AuditLogger.query({ ipAddress: '192.168.1.10' });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every(log => log.ipAddress === '192.168.1.10')).toBe(true);
    });

    it('should support pagination', async () => {
      const page1 = await AuditLogger.query({ offset: 0, limit: 1 });
      const page2 = await AuditLogger.query({ offset: 1, limit: 1 });

      expect(page1.length).toBe(1);
      expect(page2.length).toBe(1);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should support sorting', async () => {
      const logsAsc = await AuditLogger.query({ sortBy: 'timestamp', sortOrder: 'asc' });
      const logsDesc = await AuditLogger.query({ sortBy: 'timestamp', sortOrder: 'desc' });

      expect(logsAsc.length).toBeGreaterThan(0);
      expect(logsDesc.length).toBeGreaterThan(0);

      // 验证排序
      const firstAsc = logsAsc[0];
      const firstDesc = logsDesc[0];

      expect(firstAsc.timestamp).not.toBe(firstDesc.timestamp);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await AuditLogger.logAuthEvent('login.success', {
        userId: 'user-1',
        username: 'user1',
        ipAddress: '192.168.1.20',
        success: true,
      });

      await AuditLogger.logAuthEvent('login.failed', {
        username: 'user2',
        ipAddress: '192.168.1.21',
        success: false,
      });

      await AuditLogger.logRegistration({
        userId: 'user-3',
        username: 'user3',
        ipAddress: '192.168.1.22',
        email: 'user3@example.com',
      });
    });

    it('should return correct statistics', async () => {
      const stats = await AuditLogger.getStats();

      expect(stats.totalLogs).toBeGreaterThan(0);
      expect(stats.successCount).toBeGreaterThan(0);
      expect(stats.failureCount).toBeGreaterThanOrEqual(0);
      expect(stats.byEventType).toBeDefined();
      expect(stats.byLevel).toBeDefined();
      expect(stats.byUser).toBeDefined();
    });

    it('should count by event type', async () => {
      const stats = await AuditLogger.getStats();

      expect(stats.byEventType).toBeDefined();
      expect(stats.byEventType['login.success']).toBeGreaterThan(0);
    });

    it('should count by level', async () => {
      const stats = await AuditLogger.getStats();

      expect(stats.byLevel).toBeDefined();
      expect(stats.byLevel['info']).toBeGreaterThan(0);
    });

    it('should count by user', async () => {
      const stats = await AuditLogger.getStats();

      expect(stats.byUser).toBeDefined();
      expect(stats.byUser['user1']).toBeGreaterThan(0);
    });

    it('should respect date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = await AuditLogger.getStats(yesterday, now);

      expect(stats.totalLogs).toBeGreaterThan(0);
      expect(stats.dateRange.start).toBe(yesterday);
      expect(stats.dateRange.end).toBe(now);
    });
  });

  describe('cleanup', () => {
    it('should clean up old logs', async () => {
      // 创建一些日志
      await AuditLogger.logAuthEvent('login.success', {
        userId: 'user-1',
        username: 'user1',
        ipAddress: '192.168.1.30',
        success: true,
      });

      // 清理所有日志（保留 0 天）
      const cleaned = await AuditLogger.cleanup(0);

      expect(cleaned).toBeGreaterThanOrEqual(1);
    });
  });
});
