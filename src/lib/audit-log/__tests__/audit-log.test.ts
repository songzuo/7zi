/**
 * 审计日志系统 - 测试
 * @module lib/audit-log/__tests__/audit-log.test
 * @version 1.10.0
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  AuditLogService,
  AuditEventBuilder,
  AuditStorageFactory,
  AuditSensitiveDataHandler,
  AuditSignatureHandler,
  QueryBuilder,
} from '../index.js';

describe('AuditLogSystem', () => {
  let auditLog: AuditLogService;

  beforeEach(() => {
    // 使用内存存储进行测试
    const storage = AuditStorageFactory.createMemoryStorage(1000);
    auditLog = new AuditLogService(storage);
  });

  afterEach(async () => {
    await auditLog.shutdown();
  });

  describe('AuditEventBuilder', () => {
    it('should build a valid audit event', () => {
      const event = new AuditEventBuilder()
        .withId('test-123')
        .withTimestamp(new Date())
        .withLevel('info')
        .withCategory('user')
        .withAction('create')
        .withStatus('success')
        .withSeverity('low')
        .withMessage('Test event')
        .withUser({ userId: 'user123', username: 'john' })
        .withResource({ type: 'document', id: 'doc456' })
        .build();

      expect(event.id).toBe('test-123');
      expect(event.level).toBe('info');
      expect(event.category).toBe('user');
      expect(event.action).toBe('create');
      expect(event.user?.userId).toBe('user123');
      expect(event.resource?.type).toBe('document');
    });

    it('should throw error for missing required fields', () => {
      expect(() => {
        new AuditEventBuilder().build();
      }).toThrow('Missing required audit event fields');
    });

    it('should support fluent API', () => {
      const event = new AuditEventBuilder()
        .withId('test-123')
        .withTimestamp(new Date())
        .withLevel('info')
        .withCategory('user')
        .withAction('create')
        .withStatus('success')
        .withSeverity('low')
        .withMessage('Test event')
        .success()
        .lowSeverity()
        .build();

      expect(event.status).toBe('success');
      expect(event.severity).toBe('low');
    });
  });

  describe('AuditSensitiveDataHandler', () => {
    it('should mask sensitive fields', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
        { path: 'email', mask: 'partial' },
      ]);

      const event = {
        id: 'test-123',
        timestamp: new Date(),
        level: 'info' as const,
        category: 'user' as const,
        action: 'create' as const,
        status: 'success' as const,
        severity: 'low' as const,
        message: 'Test event',
        user: {
          userId: 'user123',
          username: 'john',
          email: 'john@example.com',
        },
        password: 'secret123', // password is at event level, not user level
      };

      const masked = handler.maskSensitiveData(event as any) as any;

      expect(masked.password).toBe('***');
      expect(masked.user?.email).toBe('jo***om');
    });

    it('should hash sensitive fields', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'token', mask: 'hash' },
      ]);

      const event = {
        id: 'test-123',
        timestamp: new Date(),
        level: 'info' as const,
        category: 'user' as const,
        action: 'create' as const,
        status: 'success' as const,
        severity: 'low' as const,
        message: 'Test event',
        details: {
          token: 'secret-token-123',
        },
      };

      const masked = handler.maskSensitiveData(event);

      expect(masked.details?.token).toMatch(/^[a-f0-9]{16}$/);
      expect(masked.details?.token).not.toBe('secret-token-123');
    });
  });

  describe('AuditSignatureHandler', () => {
    it('should sign and verify events', () => {
      const handler = new AuditSignatureHandler(true, 'test-secret-key');

      const event = {
        id: 'test-123',
        timestamp: new Date(),
        level: 'info' as const,
        category: 'user' as const,
        action: 'create' as const,
        status: 'success' as const,
        severity: 'low' as const,
        message: 'Test event',
      };

      const signed = handler.sign(event);
      expect(signed.signature).toBeDefined();

      const isValid = handler.verify(signed);
      expect(isValid).toBe(true);
    });

    it('should detect tampered events', () => {
      const handler = new AuditSignatureHandler(true, 'test-secret-key');

      const event = {
        id: 'test-123',
        timestamp: new Date(),
        level: 'info' as const,
        category: 'user' as const,
        action: 'create' as const,
        status: 'success' as const,
        severity: 'low' as const,
        message: 'Test event',
      };

      const signed = handler.sign(event);

      // 篡改事件
      signed.message = 'Tampered message';

      const isValid = handler.verify(signed);
      expect(isValid).toBe(false);
    });
  });

  describe('AuditLogService', () => {
    it('should log and retrieve events', async () => {
      await auditLog.initialize();

      const eventId = await auditLog.log({
        level: 'info',
        category: 'user',
        action: 'create',
        status: 'success',
        severity: 'low',
        message: 'Test event',
        user: { userId: 'user123', username: 'john' },
      });

      expect(eventId).toBeDefined();

      const retrieved = await auditLog.getById(eventId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.message).toBe('Test event');
    });

    it('should query events with filters', async () => {
      await auditLog.initialize();

      await auditLog.log({
        level: 'info',
        category: 'user',
        action: 'create',
        status: 'success',
        severity: 'low',
        message: 'User event',
        user: { userId: 'user123', username: 'john' },
      });

      await auditLog.log({
        level: 'warn',
        category: 'security',
        action: 'login_failed',
        status: 'failure',
        severity: 'medium',
        message: 'Security event',
        user: { userId: 'user456', username: 'jane' },
      });

      const result = await auditLog.query({
        filter: {
          categories: ['user'],
        },
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0].category).toBe('user');
    });

    it('should log user actions', async () => {
      await auditLog.initialize();

      const eventId = await auditLog.logUserAction(
        'create',
        { userId: 'user123', username: 'john' },
        { type: 'document', id: 'doc456' },
        { title: 'New document' }
      );

      const event = await auditLog.getById(eventId);
      expect(event?.action).toBe('create');
      expect(event?.category).toBe('user');
      expect(event?.resource?.type).toBe('document');
    });

    it('should log login events', async () => {
      await auditLog.initialize();

      const eventId = await auditLog.logLogin(
        { userId: 'user123', username: 'john' },
        { clientIp: '192.168.1.1', userAgent: 'Mozilla/5.0' },
        true
      );

      const event = await auditLog.getById(eventId);
      expect(event?.action).toBe('login');
      expect(event?.status).toBe('success');
      expect(event?.request?.clientIp).toBe('192.168.1.1');
    });

    it('should log permission changes', async () => {
      await auditLog.initialize();

      const eventId = await auditLog.logPermissionChange(
        'role_assign',
        { userId: 'admin123', username: 'admin' },
        { userId: 'user123', username: 'john' },
        { role: 'editor' }
      );

      const event = await auditLog.getById(eventId);
      expect(event?.action).toBe('role_assign');
      expect(event?.category).toBe('security');
      expect(event?.severity).toBe('high');
    });

    it('should log data operations', async () => {
      await auditLog.initialize();

      const eventId = await auditLog.logDataOperation(
        'update',
        { userId: 'user123', username: 'john' },
        { type: 'document', id: 'doc456' },
        [
          { field: 'title', oldValue: 'Old title', newValue: 'New title' },
          { field: 'status', oldValue: 'draft', newValue: 'published' },
        ]
      );

      const event = await auditLog.getById(eventId);
      expect(event?.action).toBe('update');
      expect(event?.category).toBe('data');
      expect(event?.changes).toHaveLength(2);
    });
  });

  describe('QueryBuilder', () => {
    it('should build complex queries', async () => {
      await auditLog.initialize();

      await auditLog.log({
        level: 'info',
        category: 'user',
        action: 'create',
        status: 'success',
        severity: 'low',
        message: 'User event',
        user: { userId: 'user123', username: 'john' },
      });

      await auditLog.log({
        level: 'warn',
        category: 'security',
        action: 'login_failed',
        status: 'failure',
        severity: 'medium',
        message: 'Security event',
        user: { userId: 'user456', username: 'jane' },
      });

      const queryBuilder = new QueryBuilder(
        (auditLog as any).storage
      );

      const result = await queryBuilder
        .categories('user')
        .userIds('user123')
        .sortBy('timestamp', 'desc')
        .paginate(1, 10)
        .execute();

      expect(result.data.length).toBe(1);
      expect(result.data[0].category).toBe('user');
    });
  });

  describe('Aggregation and Analytics', () => {
    it('should aggregate events by action', async () => {
      await auditLog.initialize();

      await auditLog.log({
        level: 'info',
        category: 'user',
        action: 'create',
        status: 'success',
        severity: 'low',
        message: 'Create event',
        user: { userId: 'user123' },
      });

      await auditLog.log({
        level: 'info',
        category: 'user',
        action: 'create',
        status: 'success',
        severity: 'low',
        message: 'Create event',
        user: { userId: 'user456' },
      });

      await auditLog.log({
        level: 'info',
        category: 'user',
        action: 'update',
        status: 'success',
        severity: 'low',
        message: 'Update event',
        user: { userId: 'user123' },
      });

      const aggregation = await auditLog.aggregate({
        field: 'action',
        timeRange: {
          start: new Date(Date.now() - 86400000),
          end: new Date(),
        },
      });

      expect(aggregation.items.length).toBeGreaterThan(0);
      const createItem = aggregation.items.find((item) => item.key === 'create');
      expect(createItem?.count).toBe(2);
    });

    it('should get user activity stats', async () => {
      await auditLog.initialize();

      await auditLog.log({
        level: 'info',
        category: 'user',
        action: 'create',
        status: 'success',
        severity: 'low',
        message: 'Create event',
        user: { userId: 'user123', username: 'john' },
      });

      await auditLog.log({
        level: 'info',
        category: 'user',
        action: 'update',
        status: 'success',
        severity: 'low',
        message: 'Update event',
        user: { userId: 'user123', username: 'john' },
      });

      const stats = await auditLog.getUserActivityStats('user123');

      expect(stats.userId).toBe('user123');
      expect(stats.username).toBe('john');
      expect(stats.totalActions).toBe(2);
      expect(stats.successActions).toBe(2);
    });

    it('should get resource access stats', async () => {
      await auditLog.initialize();

      await auditLog.log({
        level: 'info',
        category: 'data',
        action: 'read',
        status: 'success',
        severity: 'low',
        message: 'Read event',
        user: { userId: 'user123' },
        resource: { type: 'document', id: 'doc456' },
      });

      await auditLog.log({
        level: 'info',
        category: 'data',
        action: 'update',
        status: 'success',
        severity: 'low',
        message: 'Update event',
        user: { userId: 'user456' },
        resource: { type: 'document', id: 'doc456' },
      });

      const stats = await auditLog.getResourceAccessStats('document', 'doc456');

      expect(stats.resourceType).toBe('document');
      expect(stats.resourceId).toBe('doc456');
      expect(stats.totalAccess).toBe(2);
      expect(stats.readCount).toBe(1);
      expect(stats.writeCount).toBe(1);
      expect(stats.uniqueUsers).toBe(2);
    });
  });
});