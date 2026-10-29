/**
 * 审计日志 - 事件构建器单元测试
 * @module lib/audit-log/__tests__/event-builder.test
 *
 * 覆盖 AuditEventBuilder 的必填校验、引用隔离（build/clone/fromEvent）、
 * 以及各 with* / add* / 状态快捷方法的语义。
 */

import { describe, it, expect } from 'vitest';
import {
  AuditEventBuilder,
  createAuditEvent,
  quickAuditEvent,
} from '../event-builder.js';
import type { AuditEvent } from '../types.js';

/** 构造一个字段齐全的 builder，便于只测单个方法 */
function baseBuilder(): AuditEventBuilder {
  return new AuditEventBuilder()
    .withId('evt-1')
    .withTimestamp(new Date('2026-01-01T00:00:00.000Z'))
    .withLevel('info')
    .withCategory('user')
    .withAction('create')
    .withStatus('success')
    .withSeverity('low')
    .withMessage('Test event');
}

describe('AuditEventBuilder', () => {
  describe('build() 必填字段校验', () => {
    it('字段齐全时应能构建出事件', () => {
      const event = baseBuilder().build();

      expect(event.id).toBe('evt-1');
      expect(event.level).toBe('info');
      expect(event.category).toBe('user');
      expect(event.action).toBe('create');
      expect(event.status).toBe('success');
      expect(event.severity).toBe('low');
      expect(event.message).toBe('Test event');
    });

    it('缺少必填字段时应抛错并列出字段名', () => {
      expect(() => new AuditEventBuilder().build()).toThrow(
        'Missing required audit event fields'
      );
    });

    it('错误信息里应包含所有缺失字段名', () => {
      let message = '';
      try {
        new AuditEventBuilder().withId('evt-1').build();
      } catch (error) {
        message = (error as Error).message;
      }

      expect(message).toContain('timestamp');
      expect(message).toContain('level');
      expect(message).toContain('category');
      expect(message).toContain('action');
      expect(message).toContain('status');
      expect(message).toContain('severity');
      expect(message).toContain('message');
      // id 已设置，不应出现在缺失列表里
      expect(message).not.toContain('id,');
    });

    it('空字符串视为缺失字段', () => {
      expect(() => baseBuilder().withMessage('').build()).toThrow(
        'Missing required audit event fields'
      );
    });
  });

  describe('build() 返回值与构建器的引用隔离', () => {
    it('build() 之后再 addDetail() 不应改写已构建的事件', () => {
      // 回归：原实现 build() 直接返回 this.event，
      // 之后继续 addDetail() 会就地改写已经 build 出来的事件。
      const builder = baseBuilder();
      const event = builder.build();

      builder.addDetail('late', 'value');

      expect(event.details).toBeUndefined();
      expect(builder.peek().details).toEqual({ late: 'value' });
    });

    it('build() 之后再 addTag() / addMetadata() 不应改写已构建的事件', () => {
      const builder = baseBuilder();
      const event = builder.build();

      builder.addTag('late-tag');
      builder.addMetadata('late-meta', 1);

      expect(event.tags).toBeUndefined();
      expect(event.metadata).toBeUndefined();
    });

    it('build() 返回的事件与构建器不共享 details 引用', () => {
      const builder = baseBuilder().withDetails({ a: 1 });
      const event = builder.build();

      (event.details as Record<string, unknown>).a = 999;

      expect(builder.peek().details).toEqual({ a: 1 });
    });
  });

  describe('clone()', () => {
    it('clone 出的构建器 addMetadata 不应写回原构建器', () => {
      // 回归：原实现 clone() 没有拷贝 metadata，
      // 两个构建器共享同一个 metadata 对象引用。
      const original = baseBuilder().withMetadata({ shared: true });
      const cloned = original.clone();

      cloned.addMetadata('only-clone', 1);

      expect(original.peek().metadata).toEqual({ shared: true });
      expect(cloned.peek().metadata).toEqual({ shared: true, 'only-clone': 1 });
    });

    it('clone 出的构建器 addDetail / addTag 不应写回原构建器', () => {
      const original = baseBuilder().withDetails({ a: 1 }).withTags(['t1']);
      const cloned = original.clone();

      cloned.addDetail('b', 2);
      cloned.addTag('t2');

      expect(original.peek().details).toEqual({ a: 1 });
      expect(original.peek().tags).toEqual(['t1']);
      expect(cloned.peek().details).toEqual({ a: 1, b: 2 });
      expect(cloned.peek().tags).toEqual(['t1', 't2']);
    });

    it('clone 不应共享 changes 数组元素', () => {
      const original = baseBuilder().withChanges([
        { field: 'title', oldValue: 'a', newValue: 'b' },
      ]);
      const cloned = original.clone();

      cloned.addChange({ field: 'status', oldValue: 'x', newValue: 'y' });

      expect(original.peek().changes).toHaveLength(1);
      expect(cloned.peek().changes).toHaveLength(2);
    });

    it('clone 出来的构建器能独立构建出等价事件', () => {
      const original = baseBuilder().withDetails({ a: 1 });
      const cloned = original.clone();

      const event = cloned.build();
      expect(event.id).toBe('evt-1');
      expect(event.details).toEqual({ a: 1 });
    });
  });

  describe('fromEvent()', () => {
    it('fromEvent 应拷贝嵌套对象而不是共享引用', () => {
      const source: Partial<AuditEvent> = {
        id: 'evt-src',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
        level: 'info',
        category: 'user',
        action: 'create',
        status: 'success',
        severity: 'low',
        message: 'source',
        details: { a: 1 },
        tags: ['t1'],
        metadata: { m: 1 },
      };

      const builder = new AuditEventBuilder().fromEvent(source);
      builder.addDetail('b', 2);

      expect(source.details).toEqual({ a: 1 });
      expect(builder.peek().details).toEqual({ a: 1, b: 2 });
    });
  });

  describe('with* 字段设置', () => {
    it('withActionName 应写入 actionName', () => {
      expect(baseBuilder().withActionName('customOp').peek().actionName).toBe(
        'customOp'
      );
    });

    it('withUser 应拷贝用户对象', () => {
      const user = { userId: 'u1', username: 'john' };
      const builder = baseBuilder().withUser(user);

      user.username = 'changed';

      expect(builder.peek().user?.username).toBe('john');
    });

    it('withRequest / withResource / withChanges / withTags 应拷贝传入的引用', () => {
      const builder = baseBuilder()
        .withRequest({ clientIp: '1.1.1.1', path: '/a' })
        .withResource({ type: 'document', id: 'd1' })
        .withChanges([{ field: 'f', oldValue: 'o', newValue: 'n' }])
        .withTags(['t1']);

      const peeked = builder.peek();
      expect(peeked.request?.clientIp).toBe('1.1.1.1');
      expect(peeked.resource?.type).toBe('document');
      expect(peeked.changes).toHaveLength(1);
      expect(peeked.tags).toEqual(['t1']);
    });

    it('withMetadata 应与已有 metadata 合并', () => {
      const builder = baseBuilder()
        .withMetadata({ a: 1 })
        .withMetadata({ b: 2 });

      expect(builder.peek().metadata).toEqual({ a: 1, b: 2 });
    });

    it('传入 undefined 的 with* 方法不应覆盖已有值', () => {
      const builder = baseBuilder().withUser({ userId: 'u1' });
      builder.withUser(undefined);
      builder.withDetails(undefined);
      builder.withCorrelationId(undefined);

      expect(builder.peek().user?.userId).toBe('u1');
      expect(builder.peek().details).toBeUndefined();
      expect(builder.peek().correlationId).toBeUndefined();
    });

    it('withError 应拷贝错误对象', () => {
      const error = { code: 'E1', message: 'boom', stack: 'stack' };
      const builder = baseBuilder().withError(error);

      error.message = 'changed';

      expect(builder.peek().error?.message).toBe('boom');
    });

    it('withSignature 应写入 signature', () => {
      expect(baseBuilder().withSignature('sig').peek().signature).toBe('sig');
    });
  });

  describe('状态快捷方法', () => {
    it('success() 应设置 status 且不覆盖已有 level', () => {
      const builder = baseBuilder().withLevel('error').success();
      expect(builder.peek().status).toBe('success');
      expect(builder.peek().level).toBe('error');
    });

    it('failure() 应设置 status 为 failure 且 level 默认为 warn', () => {
      const builder = new AuditEventBuilder()
        .withId('e')
        .withTimestamp(new Date())
        .withCategory('user')
        .withAction('create')
        .withSeverity('low')
        .withMessage('m')
        .failure();

      expect(builder.peek().status).toBe('failure');
      expect(builder.peek().level).toBe('warn');
    });

    it('partial() 应设置 status 为 partial 且 level 默认为 warn', () => {
      const builder = new AuditEventBuilder()
        .withId('e')
        .withTimestamp(new Date())
        .withCategory('user')
        .withAction('create')
        .withSeverity('low')
        .withMessage('m')
        .partial();

      expect(builder.peek().status).toBe('partial');
      expect(builder.peek().level).toBe('warn');
    });

    it('严重程度快捷方法应写入 severity', () => {
      expect(baseBuilder().lowSeverity().peek().severity).toBe('low');
      expect(baseBuilder().mediumSeverity().peek().severity).toBe('medium');
      expect(baseBuilder().highSeverity().peek().severity).toBe('high');
    });

    it('criticalSeverity() 应同时把 level 提升为 critical', () => {
      const builder = baseBuilder().criticalSeverity();
      expect(builder.peek().severity).toBe('critical');
      expect(builder.peek().level).toBe('critical');
    });
  });

  describe('peek() / reset()', () => {
    it('peek() 应返回当前状态的浅拷贝', () => {
      const builder = baseBuilder().withMetadata({ m: 1 });
      const peeked = builder.peek();

      expect(peeked.id).toBe('evt-1');
      expect(peeked.metadata).toEqual({ m: 1 });
    });

    it('reset() 应清空所有已设置字段', () => {
      const builder = baseBuilder();
      builder.reset();

      expect(builder.peek()).toEqual({});
      expect(() => builder.build()).toThrow(
        'Missing required audit event fields'
      );
    });
  });

  describe('便捷函数', () => {
    it('createAuditEvent() 应返回新的构建器实例', () => {
      const a = createAuditEvent();
      const b = createAuditEvent();

      expect(a).toBeInstanceOf(AuditEventBuilder);
      expect(a).not.toBe(b);
    });

    it('quickAuditEvent() 应生成带默认值的完整事件', () => {
      const event = quickAuditEvent('user', 'create', 'Quick message');

      expect(event.id).toMatch(/^audit_/);
      expect(event.level).toBe('info');
      expect(event.status).toBe('success');
      expect(event.severity).toBe('low');
      expect(event.category).toBe('user');
      expect(event.action).toBe('create');
      expect(event.message).toBe('Quick message');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('quickAuditEvent() 应覆盖传入的 options', () => {
      const event = quickAuditEvent('security', 'login_failed', 'Failed', {
        level: 'error',
        status: 'failure',
        severity: 'high',
        userId: 'u9',
        resourceType: 'session',
        resourceId: 's1',
      });

      expect(event.level).toBe('error');
      expect(event.status).toBe('failure');
      expect(event.severity).toBe('high');
      expect(event.user?.userId).toBe('u9');
      expect(event.resource?.type).toBe('session');
      expect(event.resource?.id).toBe('s1');
    });
  });
});
