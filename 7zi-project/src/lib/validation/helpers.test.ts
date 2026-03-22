/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import {
  getRequiredErrorMessage,
  getMinLengthErrorMessage,
  getMaxLengthErrorMessage,
  getRangeErrorMessage,
  getPatternErrorMessage,
  getEmailErrorMessage,
  getPhoneErrorMessage,
  getUrlErrorMessage,
  getNumericErrorMessage,
  getIntegerErrorMessage,
  getConfirmPasswordErrorMessage,
} from './helpers';

describe('validation helpers', () => {
  describe('getRequiredErrorMessage', () => {
    it('should return default error message', () => {
      expect(getRequiredErrorMessage()).toBe('此字段为必填项');
    });

    it('should return custom error message', () => {
      expect(getRequiredErrorMessage('请输入用户名')).toBe('请输入用户名');
    });

    it('should return default error message for empty string custom message', () => {
      expect(getRequiredErrorMessage('')).toBe('此字段为必填项');
    });
  });

  describe('getMinLengthErrorMessage', () => {
    it('should return default error message with min value', () => {
      expect(getMinLengthErrorMessage(5)).toBe('最少需要 5 个字符');
      expect(getMinLengthErrorMessage(10)).toBe('最少需要 10 个字符');
    });

    it('should return custom error message', () => {
      expect(getMinLengthErrorMessage(5, '密码长度不能少于5位')).toBe('密码长度不能少于5位');
    });

    it('should handle zero', () => {
      expect(getMinLengthErrorMessage(0)).toBe('最少需要 0 个字符');
    });
  });

  describe('getMaxLengthErrorMessage', () => {
    it('should return default error message with max value', () => {
      expect(getMaxLengthErrorMessage(50)).toBe('最多允许 50 个字符');
      expect(getMaxLengthErrorMessage(100)).toBe('最多允许 100 个字符');
    });

    it('should return custom error message', () => {
      expect(getMaxLengthErrorMessage(50, '用户名不能超过50个字符')).toBe('用户名不能超过50个字符');
    });

    it('should handle large values', () => {
      expect(getMaxLengthErrorMessage(1000)).toBe('最多允许 1000 个字符');
    });
  });

  describe('getRangeErrorMessage', () => {
    it('should return default error message with min and max values', () => {
      expect(getRangeErrorMessage(1, 100)).toBe('数值必须在 1 到 100 之间');
      expect(getRangeErrorMessage(0, 10)).toBe('数值必须在 0 到 10 之间');
    });

    it('should handle negative values', () => {
      expect(getRangeErrorMessage(-10, 10)).toBe('数值必须在 -10 到 10 之间');
    });

    it('should return custom error message', () => {
      expect(getRangeErrorMessage(1, 100, '年龄必须在1-100岁之间')).toBe('年龄必须在1-100岁之间');
    });

    it('should handle same min and max', () => {
      expect(getRangeErrorMessage(18, 18)).toBe('数值必须在 18 到 18 之间');
    });
  });

  describe('getPatternErrorMessage', () => {
    it('should return default error message', () => {
      expect(getPatternErrorMessage()).toBe('格式不正确');
    });

    it('should return custom error message', () => {
      expect(getPatternErrorMessage('手机号格式不正确')).toBe('手机号格式不正确');
    });

    it('should return default error message for empty string custom message', () => {
      expect(getPatternErrorMessage('')).toBe('格式不正确');
    });
  });

  describe('getEmailErrorMessage', () => {
    it('should return default error message', () => {
      expect(getEmailErrorMessage()).toBe('请输入有效的邮箱地址');
    });

    it('should return custom error message', () => {
      expect(getEmailErrorMessage('邮箱格式错误，请检查')).toBe('邮箱格式错误，请检查');
    });
  });

  describe('getPhoneErrorMessage', () => {
    it('should return default error message', () => {
      expect(getPhoneErrorMessage()).toBe('请输入有效的手机号码');
    });

    it('should return custom error message', () => {
      expect(getPhoneErrorMessage('手机号必须是11位数字')).toBe('手机号必须是11位数字');
    });
  });

  describe('getUrlErrorMessage', () => {
    it('should return default error message', () => {
      expect(getUrlErrorMessage()).toBe('请输入有效的 URL');
    });

    it('should return custom error message', () => {
      expect(getUrlErrorMessage('请输入以http://开头的网址')).toBe('请输入以http://开头的网址');
    });
  });

  describe('getNumericErrorMessage', () => {
    it('should return default error message', () => {
      expect(getNumericErrorMessage()).toBe('请输入有效的数字');
    });

    it('should return custom error message', () => {
      expect(getNumericErrorMessage('请输入正数')).toBe('请输入正数');
    });
  });

  describe('getIntegerErrorMessage', () => {
    it('should return default error message', () => {
      expect(getIntegerErrorMessage()).toBe('请输入整数');
    });

    it('should return custom error message', () => {
      expect(getIntegerErrorMessage('请输入正整数')).toBe('请输入正整数');
    });
  });

  describe('getConfirmPasswordErrorMessage', () => {
    it('should return default error message', () => {
      expect(getConfirmPasswordErrorMessage()).toBe('两次输入的密码不一致');
    });

    it('should return custom error message', () => {
      expect(getConfirmPasswordErrorMessage('密码确认失败')).toBe('密码确认失败');
    });
  });

  describe('edge cases and special scenarios', () => {
    it('should handle very large numbers in range', () => {
      expect(getRangeErrorMessage(0, Number.MAX_SAFE_INTEGER))
        .toContain('数值必须在 0 到');
    });

    it('should handle very small numbers in range', () => {
      expect(getRangeErrorMessage(-Number.MAX_SAFE_INTEGER, 0))
        .toContain('数值必须在');
    });

    it('should handle large values in length messages', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      expect(getMinLengthErrorMessage(largeValue)).toContain(largeValue.toString());
      expect(getMaxLengthErrorMessage(largeValue)).toContain(largeValue.toString());
    });

    it('should handle unicode in custom messages', () => {
      expect(getRequiredErrorMessage('🚫 必填项')).toBe('🚫 必填项');
      expect(getEmailErrorMessage('📧 请输入邮箱')).toBe('📧 请输入邮箱');
    });

    it('should handle very long custom messages', () => {
      const longMessage = '这是一个非常长的错误消息'.repeat(10);
      expect(getRequiredErrorMessage(longMessage)).toBe(longMessage);
    });
  });

  describe('message consistency', () => {
    it('should return consistent default messages', () => {
      const default1 = getRequiredErrorMessage();
      const default2 = getRequiredErrorMessage();
      expect(default1).toBe(default2);
    });

    it('should handle undefined as empty string', () => {
      expect(getRequiredErrorMessage(undefined as unknown as string)).toBe('此字段为必填项');
    });

    it('should handle null as empty string', () => {
      expect(getRequiredErrorMessage(null as unknown as string)).toBe('此字段为必填项');
    });
  });

  describe('localization support', () => {
    it('should support Chinese characters in all messages', () => {
      expect(getRequiredErrorMessage()).toContain('必填');
      expect(getMinLengthErrorMessage(5)).toContain('最少');
      expect(getMaxLengthErrorMessage(100)).toContain('最多');
      expect(getRangeErrorMessage(1, 100)).toContain('之间');
      expect(getEmailErrorMessage()).toContain('邮箱');
      expect(getPhoneErrorMessage()).toContain('手机');
      expect(getUrlErrorMessage()).toContain('URL');
      expect(getNumericErrorMessage()).toContain('数字');
      expect(getIntegerErrorMessage()).toContain('整数');
    });
  });

  describe('message format validation', () => {
    it('should return strings', () => {
      expect(typeof getRequiredErrorMessage()).toBe('string');
      expect(typeof getMinLengthErrorMessage(5)).toBe('string');
      expect(typeof getMaxLengthErrorMessage(100)).toBe('string');
    });

    it('should not return undefined or null', () => {
      expect(getRequiredErrorMessage()).not.toBeUndefined();
      expect(getRequiredErrorMessage()).not.toBeNull();
      expect(getEmailErrorMessage()).not.toBeUndefined();
      expect(getEmailErrorMessage()).not.toBeNull();
    });

    it('should handle special characters in values', () => {
      expect(getMinLengthErrorMessage(0)).toBe('最少需要 0 个字符');
      expect(getRangeErrorMessage(0, 0)).toBe('数值必须在 0 到 0 之间');
    });
  });
});
