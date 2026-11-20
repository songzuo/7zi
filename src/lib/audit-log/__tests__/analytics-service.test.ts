/**
 * 审计日志 - 分析服务单元测试
 * @module lib/audit-log/__tests__/analytics-service.test
 *
 * 使用内存存储 + 真实事件，覆盖聚合、趋势、用户活动、资源访问、活跃用户/资源、错误率。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuditAnalyticsService } from '../analytics-service.js';
import { AuditEventBuilder } from '../event-builder.js';
import { MemoryAuditStorage } from '../storage/memory-storage.js';
import type { AuditEvent } from '../types.js';

const OLD = new Date('2020-01-01T00:00:00.000Z');
const RECENT = new Date('2026-01-01T00:00:00.000Z');

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  const builder = new AuditEventBuilder()
    .withId(overrides.id ?? `evt-${Math.random().toString(36).slice(2)}`)
    .withTimestamp(overrides.timestamp ?? RECENT)
    .withLevel(overrides.level ?? 'info')
    .withCategory(overrides.category ?? 'user')
    .withAction(overrides.action ?? 'create')
    .withStatus(overrides.status ?? 'success')
    .withSeverity(overrides.severity ?? 'low')
    .withMessage(overrides.message ?? 'Test event');

  if (overrides.user) builder.withUser(overrides.user);
  if (overrides.resource) builder.withResource(overrides.resource);
  if (overrides.request) builder.withRequest(overrides.request);
  if (overrides.details) builder.withDetails(overrides.details);

  return builder.build();
}

describe('AuditAnalyticsService', () => {
  let storage: MemoryAuditStorage;
  let analytics: AuditAnalyticsService;

  beforeEach(async () => {
    storage = new MemoryAuditStorage();
    analytics = new AuditAnalyticsService(storage);

    // 历史事件（在很多时间范围之外）
    await storage.write(
      makeEvent({
        id: 'old-event',
        timestamp: OLD,
        category: 'security',
        action: 'login_failed',
        status: 'failure',
        severity: 'high',
        level: 'warn',
        user: { userId: 'u-old', username: 'olduser' },
        resource: { type: 'session', id: 's-old' },
      })
    );

    // 近期事件
    await storage.write(
      makeEvent({
        id: 'create-1',
        category: 'user',
        action: 'create',
        status: 'success',
        user: { userId: 'u1', username: 'john' },
        resource: { type: 'document', id: 'd1' },
      })
    );
    await storage.write(
      makeEvent({
        id: 'create-2',
        category: 'user',
        action: 'create',
        status: 'success',
        user: { userId: 'u1', username: 'john' },
        resource: { type: 'document', id: 'd2' },
      })
    );
    await storage.write(
      makeEvent({
        id: 'update-1',
        category: 'data',
        action: 'update',
        status: 'failure',
        level: 'error',
        severity: 'medium',
        user: { userId: 'u2', username: 'jane' },
        resource: { type: 'document', id: 'd1' },
      })
    );
    await storage.write(
      makeEvent({
        id: 'read-1',
        category: 'data',
        action: 'read',
        status: 'success',
        user: { userId: 'u2', username: 'jane' },
        resource: { type: 'document', id: 'd1' },
      })
    );
    await storage.write(
      makeEvent({
        id: 'delete-1',
        category: 'data',
        action: 'delete',
        status: 'success',
        user: { userId: 'u3', username: 'bob' },
        resource: { type: 'folder', id: 'f1' },
      })
    );
  });

  describe('aggregate()', () => {
    it('应按 action 聚合并按数量降序排列', async () => {
      const result = await analytics.aggregate({ field: 'action' });

      expect(result.field).toBe('action');
      expect(result.total).toBe(6);
      expect(result.items[0].key).toBe('create');
      expect(result.items[0].count).toBe(2);
    });

    it('每个 item 的 percentage 应基于 total 计算', async () => {
      const result = await analytics.aggregate({ field: 'action' });
      const create = result.items.find((i) => i.key === 'create');

      expect(create?.percentage).toBeCloseTo((2 / 6) * 100, 5);
    });

    it('应支持按 category 聚合', async () => {
      const result = await analytics.aggregate({ field: 'category' });
      const keys = result.items.map((i) => i.key);

      expect(keys).toContain('user');
      expect(keys).toContain('data');
      expect(keys).toContain('security');
    });

    it('应支持按 status 聚合', async () => {
      const result = await analytics.aggregate({ field: 'status' });
      const success = result.items.find((i) => i.key === 'success');

      expect(success?.count).toBe(4);
    });

    it('应支持按 user 聚合', async () => {
      const result = await analytics.aggregate({ field: 'user' });
      const u1 = result.items.find((i) => i.key === 'u1');

      expect(u1?.count).toBe(2);
    });

    it('limit 应限制返回的 item 数量', async () => {
      const result = await analytics.aggregate({ field: 'action', limit: 2 });
      expect(result.items.length).toBeLessThanOrEqual(2);
    });

    it('只有 filter.timeRange 而没有 options.timeRange 时应仍然按时间过滤', async () => {
      // 回归：原实现写死 `timeRange: options.timeRange`，
      // 会把 filter 里已经带好的 timeRange 覆盖成 undefined，
      // 时间过滤被静默丢弃。
      const result = await analytics.aggregate({
        field: 'action',
        filter: {
          timeRange: { start: new Date('2019-01-01'), end: new Date('2021-01-01') },
        },
      });

      expect(result.total).toBe(1);
      expect(result.items[0].key).toBe('login_failed');
    });

    it('返回的 timeRange 应是实际生效的时间范围', async () => {
      const timeRange = {
        start: new Date('2019-01-01'),
        end: new Date('2021-01-01'),
      };
      const result = await analytics.aggregate({
        field: 'action',
        filter: { timeRange },
      });

      expect(result.timeRange.start).toEqual(timeRange.start);
      expect(result.timeRange.end).toEqual(timeRange.end);
    });

    it('options.timeRange 优先于 filter.timeRange', async () => {
      const result = await analytics.aggregate({
        field: 'action',
        timeRange: { start: new Date('2019-01-01'), end: new Date('2021-01-01') },
        filter: {
          timeRange: { start: new Date('2025-01-01'), end: new Date('2027-01-01') },
        },
      });

      expect(result.total).toBe(1);
    });

    it('应支持按 hour / day / month 维度聚合', async () => {
      const hour = await analytics.aggregate({ field: 'hour' });
      const day = await analytics.aggregate({ field: 'day' });
      const month = await analytics.aggregate({ field: 'month' });

      expect(hour.total).toBe(6);
      expect(day.total).toBe(6);
      expect(month.total).toBe(6);
      expect(hour.items[0].key).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/);
      expect(day.items[0].key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(month.items[0].key).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('getTrends()', () => {
    it('应按天生成趋势点并把事件分配进去', async () => {
      const result = await analytics.getTrends(
        { start: new Date('2025-12-31'), end: new Date('2026-01-03') },
        'day'
      );

      expect(result.interval).toBe('day');
      expect(result.points.length).toBeGreaterThan(0);

      const totalCount = result.points.reduce((sum, p) => sum + p.count, 0);
      expect(totalCount).toBe(5); // 5 个近期事件
    });

    it('趋势点应区分成功与失败', async () => {
      const result = await analytics.getTrends(
        { start: new Date('2025-12-31'), end: new Date('2026-01-03') },
        'day'
      );

      const success = result.points.reduce((s, p) => s + p.successCount, 0);
      const failure = result.points.reduce((s, p) => s + p.failureCount, 0);

      expect(success).toBe(4);
      expect(failure).toBe(1);
    });

    it('应支持按小时聚合', async () => {
      const result = await analytics.getTrends(
        { start: new Date('2026-01-01T00:00:00Z'), end: new Date('2026-01-01T03:00:00Z') },
        'hour'
      );

      expect(result.interval).toBe('hour');
      expect(result.points.length).toBe(3);
    });
  });

  describe('getUserActivityStats()', () => {
    it('应统计用户的操作总数与成功/失败数', async () => {
      const stats = await analytics.getUserActivityStats('u1');

      expect(stats.userId).toBe('u1');
      expect(stats.username).toBe('john');
      expect(stats.totalActions).toBe(2);
      expect(stats.successActions).toBe(2);
      expect(stats.failedActions).toBe(0);
    });

    it('应统计失败的操作数', async () => {
      const stats = await analytics.getUserActivityStats('u2');

      expect(stats.totalActions).toBe(2);
      expect(stats.successActions).toBe(1);
      expect(stats.failedActions).toBe(1);
    });

    it('topActions 应按数量降序且最多 5 条', async () => {
      const stats = await analytics.getUserActivityStats('u2');

      expect(stats.topActions.length).toBe(2);
      expect(stats.topActions.map((a) => a.action).sort()).toEqual([
        'read',
        'update',
      ]);
    });

    it('topResources 应包含资源类型统计', async () => {
      const stats = await analytics.getUserActivityStats('u2');

      expect(stats.topResources[0].type).toBe('document');
      expect(stats.topResources[0].count).toBe(2);
    });

    it('lastActivity 应为最新事件时间', async () => {
      const stats = await analytics.getUserActivityStats('u1');
      expect(stats.lastActivity).toEqual(RECENT);
    });

    it('不存在的用户应返回全零统计', async () => {
      const stats = await analytics.getUserActivityStats('nobody');

      expect(stats.totalActions).toBe(0);
      expect(stats.username).toBeUndefined();
    });
  });

  describe('getResourceAccessStats()', () => {
    it('应统计读写删次数与唯一用户数', async () => {
      const stats = await analytics.getResourceAccessStats('document');

      expect(stats.resourceType).toBe('document');
      expect(stats.totalAccess).toBe(4);
      expect(stats.readCount).toBe(1);
      // create + create + update 都算写操作
      expect(stats.writeCount).toBe(3);
      expect(stats.deleteCount).toBe(0);
      expect(stats.uniqueUsers).toBe(2);
    });

    it('指定 resourceId 时应只统计该资源', async () => {
      const stats = await analytics.getResourceAccessStats('document', 'd1');

      expect(stats.resourceId).toBe('d1');
      expect(stats.totalAccess).toBe(3);
      expect(stats.readCount).toBe(1);
      // d1 上有 create + update 两次写
      expect(stats.writeCount).toBe(2);
    });

    it('不存在的资源应返回全零统计', async () => {
      const stats = await analytics.getResourceAccessStats('nonexistent');

      expect(stats.totalAccess).toBe(0);
      expect(stats.uniqueUsers).toBe(0);
    });
  });

  describe('getActiveUsers()', () => {
    it('应按操作数降序返回活跃用户', async () => {
      const users = await analytics.getActiveUsers();

      expect(users.length).toBe(4);
      expect(users[0].count).toBe(2);
      expect(users[0].username).toBeDefined();
    });

    it('limit 应限制返回数量', async () => {
      const users = await analytics.getActiveUsers(undefined, 2);
      expect(users.length).toBe(2);
    });

    it('应能按时间范围过滤', async () => {
      const users = await analytics.getActiveUsers({
        start: new Date('2019-01-01'),
        end: new Date('2021-01-01'),
      });

      expect(users.length).toBe(1);
      expect(users[0].userId).toBe('u-old');
    });
  });

  describe('getActiveResources()', () => {
    it('应按访问数返回活跃资源类型', async () => {
      const resources = await analytics.getActiveResources();

      expect(resources[0].resourceType).toBe('document');
      expect(resources[0].count).toBe(4);
    });

    it('limit 应限制返回数量', async () => {
      const resources = await analytics.getActiveResources(undefined, 1);
      expect(resources.length).toBe(1);
    });
  });

  describe('getErrorRate()', () => {
    it('应计算错误率与各级别计数', async () => {
      const result = await analytics.getErrorRate();

      expect(result.totalOperations).toBe(6);
      // login_failed(status=failure) + update(status=failure, level=error) = 2
      expect(result.errorCount).toBe(2);
      expect(result.errorRate).toBeCloseTo((2 / 6) * 100, 5);
      expect(result.byLevel.info).toBe(4);
      expect(result.byLevel.warn).toBe(1);
      expect(result.byLevel.error).toBe(1);
    });

    it('没有事件时错误率应为 0', async () => {
      const empty = new AuditAnalyticsService(new MemoryAuditStorage());
      const result = await empty.getErrorRate();

      expect(result.totalOperations).toBe(0);
      expect(result.errorRate).toBe(0);
    });
  });
});
