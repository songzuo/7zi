/**
 * 审计日志 - 查询服务单元测试
 * @module lib/audit-log/__tests__/query-service.test
 *
 * 覆盖 AuditQueryService 的各类快捷查询、QueryBuilder 链式构造，
 * 以及「方法自带过滤条件不能被调用方 options 覆盖」这一回归。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditQueryService, QueryBuilder } from '../query-service.js';
import { AuditEventBuilder } from '../event-builder.js';
import { MemoryAuditStorage } from '../storage/memory-storage.js';
import type { AuditEvent, AuditLogStorage } from '../types.js';

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  const builder = new AuditEventBuilder()
    .withId(overrides.id ?? `evt-${Math.random().toString(36).slice(2)}`)
    .withTimestamp(overrides.timestamp ?? new Date('2026-01-01T00:00:00.000Z'))
    .withLevel(overrides.level ?? 'info')
    .withCategory(overrides.category ?? 'user')
    .withAction(overrides.action ?? 'create')
    .withStatus(overrides.status ?? 'success')
    .withSeverity(overrides.severity ?? 'low')
    .withMessage(overrides.message ?? 'Test event');

  if (overrides.user) builder.withUser(overrides.user);
  if (overrides.request) builder.withRequest(overrides.request);
  if (overrides.resource) builder.withResource(overrides.resource);
  if (overrides.correlationId) builder.withCorrelationId(overrides.correlationId);

  return builder.build();
}

/** 记录最后一次 query 调用参数的假存储 */
function createSpyStorage(): AuditLogStorage & {
  lastOptions: unknown;
} {
  const spy = {
    lastOptions: {} as unknown,
    query: vi.fn(async (options: unknown) => {
      spy.lastOptions = options;
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
        duration: 0,
      };
    }),
    write: vi.fn(),
    writeBatch: vi.fn(),
    getById: vi.fn(),
    delete: vi.fn(),
    deleteByFilter: vi.fn(),
    getStats: vi.fn(),
    cleanup: vi.fn(),
    close: vi.fn(),
  };
  return spy as unknown as AuditLogStorage & { lastOptions: unknown };
}

describe('AuditQueryService', () => {
  let storage: MemoryAuditStorage;
  let service: AuditQueryService;

  beforeEach(async () => {
    storage = new MemoryAuditStorage();
    service = new AuditQueryService(storage);

    await storage.write(
      makeEvent({
        id: 'e1',
        category: 'user',
        action: 'create',
        status: 'success',
        message: 'created document',
        user: { userId: 'u1', username: 'john', sessionId: 's1' },
        request: { clientIp: '1.1.1.1', path: '/api/doc' },
        resource: { type: 'document', id: 'd1' },
        correlationId: 'corr-1',
      })
    );
    await storage.write(
      makeEvent({
        id: 'e2',
        category: 'security',
        action: 'login_failed',
        status: 'failure',
        level: 'warn',
        severity: 'high',
        message: 'brute force attempt',
        user: { userId: 'u2', username: 'jane', sessionId: 's2' },
        request: { clientIp: '2.2.2.2', path: '/api/login' },
        resource: { type: 'session', id: 's2' },
        correlationId: 'corr-2',
      })
    );
    await storage.write(
      makeEvent({
        id: 'e3',
        category: 'admin',
        action: 'config_change',
        status: 'success',
        message: 'config updated',
        user: { userId: 'u1', username: 'john', sessionId: 's1' },
        request: { clientIp: '1.1.1.1', path: '/api/admin' },
        resource: { type: 'config', id: 'c1' },
        correlationId: 'corr-1',
      })
    );
  });

  describe('query()', () => {
    it('应直接透传给存储层', async () => {
      const spy = createSpyStorage();
      const spyService = new AuditQueryService(spy);

      await spyService.query({
        filter: { categories: ['user'] },
        pagination: { page: 1, pageSize: 10 },
      });

      expect(spy.query).toHaveBeenCalledTimes(1);
      expect(spy.lastOptions).toEqual({
        filter: { categories: ['user'] },
        pagination: { page: 1, pageSize: 10 },
      });
    });
  });

  describe('getByUserId()', () => {
    it('应只返回该用户的事件', async () => {
      const result = await service.getByUserId('u1');

      expect(result.total).toBe(2);
      expect(result.data.every((e) => e.user?.userId === 'u1')).toBe(true);
    });

    it('调用方传入 filter 时不应把主过滤条件丢掉', async () => {
      // 回归：原实现是 `{ filter: { userIds: [userId] }, ...options }`，
      // options 里的 filter 会整体替换掉 userIds。
      const spy = createSpyStorage();
      const spyService = new AuditQueryService(spy);

      await spyService.getByUserId('u1', {
        filter: { categories: ['user'] },
      });

      expect(spy.lastOptions).toMatchObject({
        filter: {
          userIds: ['u1'],
          categories: ['user'],
        },
      });
    });

    it('调用方传入相同键的 filter 时以调用方为准', async () => {
      const spy = createSpyStorage();
      const spyService = new AuditQueryService(spy);

      await spyService.getByUserId('u1', {
        filter: { userIds: ['u-other'] },
      });

      expect(spy.lastOptions).toMatchObject({
        filter: { userIds: ['u-other'] },
      });
    });

    it('pagination 与 sort 应保留调用方的值', async () => {
      const spy = createSpyStorage();
      const spyService = new AuditQueryService(spy);

      await spyService.getByUserId('u1', {
        pagination: { page: 2, pageSize: 5 },
        sort: { field: 'timestamp', order: 'asc' },
      });

      expect(spy.lastOptions).toMatchObject({
        pagination: { page: 2, pageSize: 5 },
        sort: { field: 'timestamp', order: 'asc' },
      });
    });
  });

  describe('getByTimeRange()', () => {
    it('应按时间范围过滤', async () => {
      const result = await service.getByTimeRange(
        new Date('2025-12-31'),
        new Date('2026-01-02')
      );

      expect(result.total).toBe(3);
    });

    it('时间范围之外应返回空结果', async () => {
      const result = await service.getByTimeRange(
        new Date('2019-01-01'),
        new Date('2019-01-02')
      );

      expect(result.total).toBe(0);
    });
  });

  describe('getByCategory()', () => {
    it('应按类别过滤', async () => {
      const result = await service.getByCategory('security');

      expect(result.total).toBe(1);
      expect(result.data[0].category).toBe('security');
    });
  });

  describe('getByAction()', () => {
    it('应按操作过滤', async () => {
      const result = await service.getByAction('config_change');

      expect(result.total).toBe(1);
      expect(result.data[0].action).toBe('config_change');
    });
  });

  describe('getByResource()', () => {
    it('应按资源类型过滤', async () => {
      const result = await service.getByResource('document');

      expect(result.total).toBe(1);
      expect(result.data[0].resource?.type).toBe('document');
    });

    it('带 resourceId 时应同时按 ID 过滤', async () => {
      const result = await service.getByResource('document', 'd1');

      expect(result.total).toBe(1);
      expect(result.data[0].resource?.id).toBe('d1');
    });

    it('resourceId 不匹配时应返回空结果', async () => {
      const result = await service.getByResource('document', 'does-not-exist');

      expect(result.total).toBe(0);
    });
  });

  describe('search()', () => {
    it('应按关键词搜索消息内容', async () => {
      const result = await service.search('brute force');

      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('e2');
    });

    it('无匹配关键词时应返回空结果', async () => {
      const result = await service.search('zzzz-not-present');

      expect(result.total).toBe(0);
    });
  });

  describe('getBySessionId()', () => {
    it('应按会话过滤', async () => {
      const result = await service.getBySessionId('s1');

      expect(result.total).toBe(2);
    });
  });

  describe('getByCorrelationId()', () => {
    it('应按关联 ID 过滤', async () => {
      const result = await service.getByCorrelationId('corr-1');

      expect(result.total).toBe(2);
    });
  });

  describe('getByClientIp()', () => {
    it('应按客户端 IP 过滤', async () => {
      const result = await service.getByClientIp('2.2.2.2');

      expect(result.total).toBe(1);
      expect(result.data[0].request?.clientIp).toBe('2.2.2.2');
    });
  });

  describe('getFailedOperations()', () => {
    it('应只返回失败的操作', async () => {
      const result = await service.getFailedOperations();

      expect(result.total).toBe(1);
      expect(result.data[0].status).toBe('failure');
    });

    it('默认应按 timestamp 倒序', async () => {
      const spy = createSpyStorage();
      const spyService = new AuditQueryService(spy);

      await spyService.getFailedOperations();

      expect(spy.lastOptions).toMatchObject({
        sort: { field: 'timestamp', order: 'desc' },
      });
    });
  });

  describe('getSecurityEvents()', () => {
    it('应只返回 security 类别的事件', async () => {
      const result = await service.getSecurityEvents();

      expect(result.total).toBe(1);
      expect(result.data[0].category).toBe('security');
    });
  });

  describe('getAdminOperations()', () => {
    it('应只返回 admin 类别的事件', async () => {
      const result = await service.getAdminOperations();

      expect(result.total).toBe(1);
      expect(result.data[0].category).toBe('admin');
    });
  });

  describe('buildQuery()', () => {
    it('应返回 QueryBuilder 实例', () => {
      expect(service.buildQuery()).toBeInstanceOf(QueryBuilder);
    });
  });
});

describe('QueryBuilder', () => {
  let storage: MemoryAuditStorage;
  let builder: QueryBuilder;

  beforeEach(async () => {
    storage = new MemoryAuditStorage();
    builder = new QueryBuilder(storage);

    await storage.write(
      makeEvent({
        id: 'e1',
        category: 'user',
        action: 'create',
        status: 'success',
        user: { userId: 'u1', username: 'john' },
        resource: { type: 'document', id: 'd1' },
        correlationId: 'corr-1',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
      })
    );
    await storage.write(
      makeEvent({
        id: 'e2',
        category: 'security',
        action: 'login_failed',
        status: 'failure',
        level: 'warn',
        severity: 'high',
        message: 'brute force attempt',
        user: { userId: 'u2', username: 'jane' },
        resource: { type: 'session', id: 's2' },
        correlationId: 'corr-2',
        timestamp: new Date('2026-02-01T00:00:00.000Z'),
      })
    );
  });

  it('链式调用应返回同一个实例', () => {
    expect(builder.categories('user')).toBe(builder);
    expect(builder.userIds('u1')).toBe(builder);
  });

  it('execute() 应应用所有过滤条件', async () => {
    const result = await builder
      .categories('user')
      .userIds('u1')
      .execute();

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('e1');
  });

  it('应支持时间范围过滤', async () => {
    const result = await builder
      .timeRange(new Date('2026-01-15'), new Date('2026-03-01'))
      .execute();

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('e2');
  });

  it('应支持状态 / 严重程度 / 级别过滤', async () => {
    const result = await builder
      .statuses('failure')
      .severities('high')
      .execute();

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('e2');
  });

  it('应支持资源类型 / 资源 ID 过滤', async () => {
    const result = await builder.resourceTypes('document').resourceIds('d1').execute();

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('e1');
  });

  it('应支持关联 ID / 标签 / 会话 / 客户端 IP 过滤', async () => {
    const byCorr = await builder.correlationId('corr-1').execute();
    expect(byCorr.total).toBe(1);

    const byTag = await new QueryBuilder(storage).tags('none').execute();
    expect(byTag.total).toBe(0);
  });

  it('search() 应能搜索消息', async () => {
    const result = await builder.search('brute force').execute();

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('e2');
  });

  it('sortBy 应生效', async () => {
    const result = await builder
      .sortBy('timestamp', 'asc')
      .paginate(1, 10)
      .execute();

    expect(result.data[0].id).toBe('e1');
  });

  it('paginate 应分页', async () => {
    const result = await builder
      .sortBy('timestamp', 'asc')
      .paginate(2, 1)
      .execute();

    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('e2');
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(1);
  });

  it('count() 应返回总数', async () => {
    const count = await builder.count();
    expect(count).toBe(2);
  });

  it('exists() 应反映是否有匹配事件', async () => {
    expect(await builder.categories('user').exists()).toBe(true);
    expect(await builder.categories('nonexistent').exists()).toBe(false);
  });

  it('first() 应返回第一条匹配事件', async () => {
    const event = await builder.categories('user').first();

    expect(event?.id).toBe('e1');
  });

  it('first() 无匹配时应返回 null', async () => {
    const event = await builder.categories('nonexistent').first();

    expect(event).toBeNull();
  });

  it('all() 应返回全部匹配事件', async () => {
    const events = await builder.all();

    expect(events.length).toBe(2);
  });

  it('include* 开关应透传给存储层', async () => {
    const spy = createSpyStorage();
    const spyBuilder = new QueryBuilder(spy);

    await spyBuilder
      .includeDetailsField(false)
      .includeChangesField(false)
      .includeMetadataField(false)
      .execute();

    expect(spy.lastOptions).toMatchObject({
      includeDetails: false,
      includeChanges: false,
      includeMetadata: false,
    });
  });
});
