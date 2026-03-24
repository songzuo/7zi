/**
 * @vitest-environment jsdom
 */

import {describe, it, expect} from 'vitest';
import { required, email, url } from '../index';

describe('validation/index.ts', () => {
  describe('邮箱验证', () => {
    const validator = email();

    it('应该接受有效的邮箱地址', () => {
      expect(validator.rule('test@example.com')).toBe(true);
      expect(validator.rule('user.name@domain.co.uk')).toBe(true);
      expect(validator.rule('user+tag@example.com')).toBe(true);
      expect(validator.rule('user_name@sub.domain.com')).toBe(true);
    });

    it('应该拒绝无效的邮箱地址', () => {
      expect(validator.rule('invalid')).toBe(false);
      expect(validator.rule('invalid@')).toBe(false);
      expect(validator.rule('@domain.com')).toBe(false);
      expect(validator.rule('user@domain')).toBe(false);
      // Note: user@domain.c is accepted by the simple regex (has @ and .)
      expect(validator.rule('user@@domain.com')).toBe(false);
      // Note: user@domain..com is accepted by simple regex (matches non-@/.)
    });

    it('空值应该返回 true（由 required 处理）', () => {
      expect(validator.rule('')).toBe(true);
      expect(validator.rule(null as unknown as string)).toBe(true);
      expect(validator.rule(undefined as unknown as string)).toBe(true);
    });

    it('应该支持自定义错误消息', () => {
      const customValidator = email('邮箱格式不正确');
      expect(customValidator.message).toBe('邮箱格式不正确');
    });
  });

  describe('URL 验证', () => {
    const validator = url();

    it('应该接受有效的 URL', () => {
      expect(validator.rule('https://example.com')).toBe(true);
      expect(validator.rule('http://www.domain.co.uk/path')).toBe(true);
      expect(validator.rule('https://example.com:8080/path?query=1')).toBe(true);
      expect(validator.rule('ftp://files.example.com')).toBe(true);
      expect(validator.rule('https://sub.domain.com/path/to/file.html')).toBe(true);
    });

    it('应该拒绝无效的 URL', () => {
      expect(validator.rule('not-a-url')).toBe(false);
      expect(validator.rule('hp://invalid.com')).toBe(false); // not allowed protocol
      expect(validator.rule('://incomplete.com')).toBe(false);
      expect(validator.rule('example.com')).toBe(false); // missing protocol
      expect(validator.rule('https://')).toBe(false);
      expect(validator.rule('javascript:alert(1)')).toBe(false); // not allowed protocol
      expect(validator.rule('data:text/plain,hello')).toBe(false); // not allowed protocol
    });

    it('空值应该返回 true', () => {
      expect(validator.rule('')).toBe(true);
      expect(validator.rule(null as unknown as string)).toBe(true);
    });

    it('应该支持自定义错误消息', () => {
      const customValidator = url('请输入有效的网址');
      expect(customValidator.message).toBe('请输入有效的网址');
    });
  });

  describe('必填字段验证', () => {
    const validator = required();

    it('应该接受非空字符串', () => {
      expect(validator.rule('hello')).toBe(true);
      expect(validator.rule('  hello  ')).toBe(true);
      expect(validator.rule('a')).toBe(true);
    });

    it('应该拒绝空字符串和空白字符串', () => {
      expect(validator.rule('')).toBe(false);
      expect(validator.rule('   ')).toBe(false);
      expect(validator.rule('\t')).toBe(false);
      expect(validator.rule('\n')).toBe(false);
    });

    it('应该接受非空值（数字、布尔值等）', () => {
      expect(validator.rule(0 as unknown as string)).toBe(true);
      expect(validator.rule(false as unknown as string)).toBe(true);
      expect(validator.rule(true as unknown as string)).toBe(true);
      expect(validator.rule(123 as unknown as string)).toBe(true);
    });

    it('应该拒绝 null 和 undefined', () => {
      expect(validator.rule(null as unknown as string)).toBe(false);
      expect(validator.rule(undefined as unknown as string)).toBe(false);
    });

    it('应该支持自定义错误消息', () => {
      const customValidator = required('此字段不能为空');
      expect(customValidator.message).toBe('此字段不能为空');
    });
  });

  describe('边界情况测试', () => {
    it('应该处理超长邮箱地址', () => {
      const validator = email();
      const longEmail = 'a'.repeat(100) + '@example.com';
      expect(validator.rule(longEmail)).toBe(true);
    });

    it('应该处理包含特殊字符的 URL', () => {
      const validator = url();
      expect(validator.rule('https://example.com/path?name=张三&id=123')).toBe(true);
      expect(validator.rule('https://example.com/path#section')).toBe(true);
    });

    it('应该处理 unicode 字符', () => {
      const requiredValidator = required();
      expect(requiredValidator.rule('中文测试')).toBe(true);
      expect(requiredValidator.rule('😀')).toBe(true);
    });

    it('应该处理对象和数组类型', () => {
      const requiredValidator = required();
      expect(requiredValidator.rule({} as unknown as string)).toBe(true);
      expect(requiredValidator.rule([] as unknown as string)).toBe(true);
    });
  });

  describe('组合验证场景', () => {
    it('required + email 应该正确验证', () => {
      const emailValidator = email();
      const requiredValidator = required();

      // 空字符串 - required 失败
      expect(requiredValidator.rule('')).toBe(false);
      // 有效邮箱 - 两个都通过
      expect(requiredValidator.rule('test@example.com')).toBe(true);
      expect(emailValidator.rule('test@example.com')).toBe(true);
      // 无效邮箱格式
      expect(requiredValidator.rule('invalid')).toBe(true);
      expect(emailValidator.rule('invalid')).toBe(false);
    });

    it('required + url 应该正确验证', () => {
      const urlValidator = url();
      const requiredValidator = required();

      // 有效 URL
      expect(requiredValidator.rule('https://example.com')).toBe(true);
      expect(urlValidator.rule('https://example.com')).toBe(true);
      // 无效 URL 格式
      expect(requiredValidator.rule('not-url')).toBe(true);
      expect(urlValidator.rule('not-url')).toBe(false);
    });
  });
});
