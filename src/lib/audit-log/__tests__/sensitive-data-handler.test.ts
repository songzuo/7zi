/**
 * 审计日志 - 敏感数据处理器单元测试
 * @module lib/audit-log/__tests__/sensitive-data-handler.test
 *
 * 重点覆盖：脱敏（顶层/嵌套/通配符/数组）、敏感值提取、掩码校验。
 */

import { describe, it, expect } from 'vitest';
import { AuditSensitiveDataHandler } from '../sensitive-data-handler.js';
import type { AuditEvent } from '../types.js';

function createEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 'evt-1',
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
    level: 'info',
    category: 'user',
    action: 'create',
    status: 'success',
    severity: 'low',
    message: 'Test event',
    ...overrides,
  } as AuditEvent;
}

describe('AuditSensitiveDataHandler', () => {
  describe('maskSensitiveData()', () => {
    it('应脱敏顶层敏感字段', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
      ]);

      const masked = handler.maskSensitiveData(
        createEvent({ password: 'plaintext' } as Partial<AuditEvent>)
      );

      expect((masked as unknown as Record<string, unknown>).password).toBe('***');
    });

    it('应脱敏 user 对象里的敏感字段', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'user.password', mask: 'full' },
        { path: 'email', mask: 'partial' },
      ]);

      // AuditUserContext 本身没有 password 字段，
      // 这里用扩展类型验证「user.password」这条精确路径配置确实生效。
      const masked = handler.maskSensitiveData(
        createEvent({
          user: {
            userId: 'u1',
            username: 'john',
            email: 'john@example.com',
            password: 'secret',
          },
        } as Partial<AuditEvent> as AuditEvent)
      );

      expect(
        (masked.user as unknown as Record<string, unknown>).password
      ).toBe('***');
      expect(masked.user?.email).toBe('jo***om');
      // 非敏感字段保持不变
      expect(masked.user?.userId).toBe('u1');
      expect(masked.user?.username).toBe('john');
    });

    it('裸字段名配置应命中所有层级同名字段', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
      ]);

      const masked = handler.maskSensitiveData(
        createEvent({ details: { password: 'secret' } })
      );

      expect(masked.details?.password).toBe('***');
    });

    it('应脱敏 details 里的敏感字段', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'token', mask: 'full' },
      ]);

      const masked = handler.maskSensitiveData(
        createEvent({ details: { token: 'abc', keep: 'visible' } })
      );

      expect(masked.details?.token).toBe('***');
      expect(masked.details?.keep).toBe('visible');
    });

    it('应脱敏 changes 里的 oldValue / newValue', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
      ]);

      const masked = handler.maskSensitiveData(
        createEvent({
          changes: [
            { field: 'password', oldValue: 'old-secret', newValue: 'new-secret' },
            { field: 'title', oldValue: 'old', newValue: 'new' },
          ],
        })
      );

      expect(masked.changes?.[0].oldValue).toBe('***');
      expect(masked.changes?.[0].newValue).toBe('***');
      expect(masked.changes?.[1].oldValue).toBe('old');
    });

    it('应脱敏 metadata 里的敏感字段', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'metadata.apiKey', mask: 'full' },
      ]);

      const masked = handler.maskSensitiveData(
        createEvent({ metadata: { apiKey: 'k-123', other: 1 } })
      );

      expect(masked.metadata?.apiKey).toBe('***');
      expect(masked.metadata?.other).toBe(1);
    });

    it('应脱敏 error.message', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
      ]);

      const masked = handler.maskSensitiveData(
        createEvent({
          error: { message: 'failed for password=supersecret', stack: 'at foo' },
        })
      );

      expect(masked.error?.message).not.toContain('supersecret');
      // 堆栈不应被脱敏
      expect(masked.error?.stack).toBe('at foo');
    });

    it('通配符配置应能命中嵌套对象里的字段', () => {
      // 回归：原实现 maskObject 只查精确路径和裸字段名，
      // 通配符（'secret*'）在嵌套对象里完全失效。
      const handler = new AuditSensitiveDataHandler([
        { path: 'secret*', mask: 'full' },
      ]);

      const masked = handler.maskSensitiveData(
        createEvent({
          details: { secretKey: 'abcdef', secretToken: 'xyz', normal: 'ok' },
        })
      );

      expect(masked.details?.secretKey).toBe('***');
      expect(masked.details?.secretToken).toBe('***');
      expect(masked.details?.normal).toBe('ok');
    });

    it('不应改写原始事件对象', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
      ]);

      const event = createEvent({
        details: { password: 'plain' },
      });
      handler.maskSensitiveData(event);

      expect(event.details?.password).toBe('plain');
    });
  });

  describe('脱敏策略', () => {
    it("mask 'full' 应整体替换为 ***", () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'f', mask: 'full' },
      ]);
      const masked = handler.maskSensitiveData(
        createEvent({ details: { f: 'anything' } })
      );
      expect(masked.details?.f).toBe('***');
    });

    it("mask 'partial' 应保留首尾各两个字符", () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'f', mask: 'partial' },
      ]);
      const masked = handler.maskSensitiveData(
        createEvent({ details: { f: 'abcdefghij' } })
      );
      expect(masked.details?.f).toBe('ab***ij');
    });

    it("mask 'partial' 对长度不超过 4 的字符串返回 ***", () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'f', mask: 'partial' },
      ]);
      const masked = handler.maskSensitiveData(
        createEvent({ details: { f: 'abcd' } })
      );
      expect(masked.details?.f).toBe('***');
    });

    it("mask 'partial' 不应泄漏原始长度", () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'f', mask: 'partial' },
      ]);
      const short = handler.maskSensitiveData(
        createEvent({ details: { f: 'abcdefgh' } })
      );
      const long = handler.maskSensitiveData(
        createEvent({ details: { f: 'abcdefghijklmnop' } })
      );

      expect(short.details?.f).toBe('ab***gh');
      expect(long.details?.f).toBe('ab***op');
      expect(String(short.details?.f)).toHaveLength(
        String(long.details?.f).length
      );
    });

    it("mask 'hash' 应产生 16 位十六进制摘要", () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'f', mask: 'hash' },
      ]);
      const masked = handler.maskSensitiveData(
        createEvent({ details: { f: 'secret-token-123' } })
      );

      expect(masked.details?.f).toMatch(/^[a-f0-9]{16}$/);
      expect(masked.details?.f).not.toBe('secret-token-123');
    });

    it('数字字段按 full 脱敏为 0', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'f', mask: 'full' },
      ]);
      const masked = handler.maskSensitiveData(
        createEvent({ details: { f: 123456 } })
      );
      expect(masked.details?.f).toBe(0);
    });

    it('布尔值不脱敏', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'f', mask: 'full' },
      ]);
      const masked = handler.maskSensitiveData(
        createEvent({ details: { f: true } })
      );
      expect(masked.details?.f).toBe(true);
    });
  });

  describe('extractSensitiveValues()', () => {
    it('应提取顶层的敏感字段', () => {
      // 回归：原实现路径拼接多了一个前导点（'.password'），
      // 导致 extractSensitiveValues 恒返回空 Map。
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
      ]);

      const values = handler.extractSensitiveValues({
        password: 'plain',
        keep: 'value',
      });

      expect(values.size).toBe(1);
      expect(values.get('password')).toBe('plain');
    });

    it('应提取嵌套对象的敏感字段并带上点号路径', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'user.password', mask: 'full' },
      ]);

      const values = handler.extractSensitiveValues({
        user: { password: 'nested-secret', username: 'john' },
      });

      expect(values.get('user.password')).toBe('nested-secret');
      expect(values.has('user.username')).toBe(false);
    });

    it('应识别通配符敏感字段', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'secret*', mask: 'full' },
      ]);

      const values = handler.extractSensitiveValues({
        secretKey: 'k',
        normal: 'v',
      });

      expect(values.get('secretKey')).toBe('k');
      expect(values.size).toBe(1);
    });

    it('非敏感字段不应被提取', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
      ]);

      const values = handler.extractSensitiveValues({
        username: 'john',
        age: 30,
      });

      expect(values.size).toBe(0);
    });
  });

  describe('validateMaskedData()', () => {
    it('未脱敏的敏感字段应被报告为问题', () => {
      // 回归：原实现路径同样多前导点，导致永远检测不到问题。
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
      ]);

      const result = handler.validateMaskedData(
        createEvent({ details: { password: 'plaintext-value' } })
      );

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('password');
    });

    it('已脱敏的事件应通过校验', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
      ]);

      const result = handler.validateMaskedData(
        createEvent({ details: { password: '***' } })
      );

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('嵌套的敏感字段也应被检测', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'user.password', mask: 'full' },
      ]);

      const result = handler.validateMaskedData(
        createEvent({
          user: {
            userId: 'u1',
            password: 'plaintext-value',
          },
        } as Partial<AuditEvent> as AuditEvent)
      );

      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain('user.password');
    });
  });

  describe('配置管理', () => {
    it('addSensitiveField 应注册新字段', () => {
      const handler = new AuditSensitiveDataHandler();
      handler.addSensitiveField({ path: 'password', mask: 'full' });

      expect(handler.isSensitiveField('password')).toBe(true);
      expect(handler.getSensitiveFieldPaths()).toEqual(['password']);
    });

    it('removeSensitiveField 应注销字段', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
      ]);
      handler.removeSensitiveField('password');

      expect(handler.isSensitiveField('password')).toBe(false);
    });

    it('clearSensitiveFields 应清空全部配置', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'password', mask: 'full' },
        { path: 'token', mask: 'full' },
      ]);
      handler.clearSensitiveFields();

      expect(handler.getSensitiveFieldPaths()).toEqual([]);
      expect(handler.isSensitiveField('password')).toBe(false);
    });

    it('isSensitiveField 应支持通配符', () => {
      const handler = new AuditSensitiveDataHandler([
        { path: 'secret*', mask: 'full' },
      ]);

      expect(handler.isSensitiveField('secretKey')).toBe(true);
      expect(handler.isSensitiveField('secretToken')).toBe(true);
      expect(handler.isSensitiveField('publicKey')).toBe(false);
    });
  });
});
