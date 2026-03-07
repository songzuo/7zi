/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import {
  required,
  email,
  minLength,
  maxLength,
  pattern,
  phone,
  url,
  numeric,
  integer,
  range,
  confirmPassword,
  compose,
} from './validators';

describe('validators', () => {
  describe('required', () => {
    it('应该验证非空字符串', () => {
      const validator = required();
      
      expect(validator.rule('hello')).toBe(true);
      expect(validator.rule('  hello  ')).toBe(true);
      expect(validator.rule('')).toBe(false);
      expect(validator.rule('   ')).toBe(false);
    });

    it('应该验证非空值', () => {
      const validator = required();
      
      expect(validator.rule(0)).toBe(true);
      expect(validator.rule(false)).toBe(true);
      expect(validator.rule(null)).toBe(false);
      expect(validator.rule(undefined)).toBe(false);
    });

    it('应该返回自定义错误消息', () => {
      const validator = required('请填写此字段');
      
      expect(validator.message).toBe('请填写此字段');
    });
  });

  describe('email', () => {
    it('应该验证有效的邮箱', () => {
      const validator = email();
      
      expect(validator.rule('test@example.com')).toBe(true);
      expect(validator.rule('user.name@domain.co.uk')).toBe(true);
      expect(validator.rule('user+tag@example.com')).toBe(true);
    });

    it('应该拒绝无效的邮箱', () => {
      const validator = email();
      
      expect(validator.rule('invalid')).toBe(false);
      expect(validator.rule('invalid@')).toBe(false);
      expect(validator.rule('@domain.com')).toBe(false);
      expect(validator.rule('user@domain')).toBe(false);
      expect(validator.rule('user@domain.c')).toBe(false);
    });

    it('空值应该返回 true（由 required 处理）', () => {
      const validator = email();
      
      expect(validator.rule('')).toBe(true);
      expect(validator.rule(null)).toBe(true);
      expect(validator.rule(undefined)).toBe(true);
    });
  });

  describe('minLength', () => {
    it('应该验证最小长度', () => {
      const validator = minLength(3);
      
      expect(validator.rule('abc')).toBe(true);
      expect(validator.rule('abcd')).toBe(true);
      expect(validator.rule('ab')).toBe(false);
    });

    it('空值应该返回 true', () => {
      const validator = minLength(3);
      
      expect(validator.rule('')).toBe(true);
    });

    it('应该返回自定义错误消息', () => {
      const validator = minLength(5, '至少需要5个字符');
      
      expect(validator.message).toBe('至少需要5个字符');
    });

    it('应该使用默认消息', () => {
      const validator = minLength(5);
      
      expect(validator.message).toBe('最少需要 5 个字符');
    });
  });

  describe('maxLength', () => {
    it('应该验证最大长度', () => {
      const validator = maxLength(5);
      
      expect(validator.rule('abc')).toBe(true);
      expect(validator.rule('abcde')).toBe(true);
      expect(validator.rule('abcdef')).toBe(false);
    });

    it('空值应该返回 true', () => {
      const validator = maxLength(5);
      
      expect(validator.rule('')).toBe(true);
    });

    it('应该返回自定义错误消息', () => {
      const validator = maxLength(10, '最多允许10个字符');
      
      expect(validator.message).toBe('最多允许10个字符');
    });
  });

  describe('pattern', () => {
    it('应该验证正则表达式', () => {
      const validator = pattern(/^\d{3}-\d{4}$/);
      
      expect(validator.rule('123-4567')).toBe(true);
      expect(validator.rule('123-45678')).toBe(false);
      expect(validator.rule('abc-defg')).toBe(false);
    });

    it('空值应该返回 true', () => {
      const validator = pattern(/^\d+$/);
      
      expect(validator.rule('')).toBe(true);
    });

    it('应该返回自定义错误消息', () => {
      const validator = pattern(/^\d+$/, '请输入数字');
      
      expect(validator.message).toBe('请输入数字');
    });
  });

  describe('phone', () => {
    it('应该验证中国手机号', () => {
      const validator = phone();
      
      expect(validator.rule('13812345678')).toBe(true);
      expect(validator.rule('15912345678')).toBe(true);
      expect(validator.rule('19812345678')).toBe(true);
    });

    it('应该拒绝无效手机号', () => {
      const validator = phone();
      
      expect(validator.rule('12345678901')).toBe(false);
      expect(validator.rule('1381234567')).toBe(false);
      expect(validator.rule('138123456789')).toBe(false);
      expect(validator.rule('01234567890')).toBe(false);
    });

    it('空值应该返回 true', () => {
      const validator = phone();
      
      expect(validator.rule('')).toBe(true);
    });
  });

  describe('url', () => {
    it('应该验证有效的 URL', () => {
      const validator = url();
      
      expect(validator.rule('https://example.com')).toBe(true);
      expect(validator.rule('http://www.domain.co.uk/path')).toBe(true);
      expect(validator.rule('https://example.com:8080/path?query=1')).toBe(true);
    });

    it('应该拒绝无效的 URL', () => {
      const validator = url();
      
      expect(validator.rule('not-a-url')).toBe(false);
      expect(validator.rule('htp://wrong.com')).toBe(false);
    });

    it('空值应该返回 true', () => {
      const validator = url();
      
      expect(validator.rule('')).toBe(true);
    });
  });

  describe('numeric', () => {
    it('应该验证数字', () => {
      const validator = numeric();
      
      expect(validator.rule('123')).toBe(true);
      expect(validator.rule('123.45')).toBe(true);
      expect(validator.rule('-123.45')).toBe(true);
      expect(validator.rule('0')).toBe(true);
    });

    it('应该拒绝非数字', () => {
      const validator = numeric();
      
      expect(validator.rule('abc')).toBe(false);
      expect(validator.rule('12a')).toBe(false);
      expect(validator.rule('')).toBe(true); // 空值
    });

    it('空值应该返回 true', () => {
      const validator = numeric();
      
      expect(validator.rule('')).toBe(true);
    });
  });

  describe('integer', () => {
    it('应该验证整数', () => {
      const validator = integer();
      
      expect(validator.rule('123')).toBe(true);
      expect(validator.rule('-456')).toBe(true);
      expect(validator.rule('0')).toBe(true);
    });

    it('应该拒绝小数', () => {
      const validator = integer();
      
      expect(validator.rule('123.45')).toBe(false);
      expect(validator.rule('-123.45')).toBe(false);
    });

    it('空值应该返回 true', () => {
      const validator = integer();
      
      expect(validator.rule('')).toBe(true);
    });
  });

  describe('range', () => {
    it('应该验证数字范围', () => {
      const validator = range(1, 100);
      
      expect(validator.rule('1')).toBe(true);
      expect(validator.rule('50')).toBe(true);
      expect(validator.rule('100')).toBe(true);
      expect(validator.rule('0')).toBe(false);
      expect(validator.rule('101')).toBe(false);
    });

    it('应该支持负数', () => {
      const validator = range(-10, 10);
      
      expect(validator.rule('-5')).toBe(true);
      expect(validator.rule('0')).toBe(true);
      expect(validator.rule('-11')).toBe(false);
    });

    it('空值应该返回 true', () => {
      const validator = range(1, 100);
      
      expect(validator.rule('')).toBe(true);
    });

    it('应该返回自定义错误消息', () => {
      const validator = range(0, 255, '请输入 0-255 之间的数值');
      
      expect(validator.message).toBe('请输入 0-255 之间的数值');
    });
  });

  describe('confirmPassword', () => {
    it('应该验证密码匹配', () => {
      const getPassword = () => 'password123';
      const validator = confirmPassword(getPassword);
      
      expect(validator.rule('password123')).toBe(true);
      expect(validator.rule('wrong')).toBe(false);
    });

    it('空值应该返回 true', () => {
      const getPassword = () => 'password123';
      const validator = confirmPassword(getPassword);
      
      expect(validator.rule('')).toBe(true);
    });
  });

  describe('compose', () => {
    it('应该组合多个验证规则', () => {
      const validate = compose(
        required(),
        minLength(3),
        maxLength(10)
      );
      
      expect(validate('ab')).toBe('最少需要 3 个字符');
      expect(validate('abcdefghijk')).toBe('最多允许 10 个字符');
      expect(validate('abc')).toBeNull();
    });

    it('应该按顺序验证并在第一个失败时停止', () => {
      const validate = compose(
        required('必须填写'),
        email('邮箱格式错误')
      );
      
      expect(validate('')).toBe('必须填写');
    });

    it('应该返回自定义错误消息', () => {
      const validate = compose(
        required('必填'),
        minLength(2, '太短')
      );
      
      expect(validate('')).toBe('必填');
      expect(validate('a')).toBe('太短');
      expect(validate('ab')).toBeNull();
    });
  });
});