import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  validateConfirmPassword,
  validateUsername,
  validateEmail,
  validateDisplayName,
  validateNickname,
  validateBio
} from '@/components/UserSettings/validation';

describe('UserSettings Validation Functions', () => {
  describe('validatePassword', () => {
    it('returns empty string for valid password', () => {
      const validPassword = 'ValidPass123';
      expect(validatePassword(validPassword)).toBe('');
    });

    it('returns error for empty password', () => {
      expect(validatePassword('')).toBe('请输入密码');
    });

    it('returns error for short password', () => {
      const shortPassword = 'abc';
      expect(validatePassword(shortPassword)).toBe('密码至少需要 8 个字符');
    });

    it('returns error for password without lowercase', () => {
      const noLowercase = 'ABC12345';
      expect(validatePassword(noLowercase)).toBe('密码需要包含至少一个小写字母');
    });

    it('returns error for password without uppercase', () => {
      const noUppercase = 'abc12345';
      expect(validatePassword(noUppercase)).toBe('密码需要包含至少一个大写字母');
    });

    it('returns error for password without number', () => {
      const noNumber = 'Abcdefgh';
      expect(validatePassword(noNumber)).toBe('密码需要包含至少一个数字');
    });
  });

  describe('validateConfirmPassword', () => {
    it('returns empty string for matching passwords', () => {
      const password = 'ValidPass123';
      const confirmPassword = 'ValidPass123';
      expect(validateConfirmPassword(password, confirmPassword)).toBe('');
    });

    it('returns error for empty confirm password', () => {
      const password = 'ValidPass123';
      expect(validateConfirmPassword(password, '')).toBe('请确认密码');
    });

    it('returns error for non - matching passwords', () => {
      const password = 'ValidPass123';
      const confirmPassword = 'DifferentPass';
      expect(validateConfirmPassword(password, confirmPassword)).toBe('两次输入的密码不一致');
    });
  });

  describe('validateUsername', () => {
    it('returns empty string for valid username', () => {
      const validUsername = 'valid_user';
      expect(validateUsername(validUsername)).toBe('');
    });

    it('returns error for empty username', () => {
      expect(validateUsername('')).toBe('请输入用户名');
    });

    it('returns error for short username', () => {
      const shortUsername = 'ab';
      expect(validateUsername(shortUsername)).toBe('用户名至少需要 3 个字符');
    });

    it('returns error for long username', () => {
      const longUsername = 'a'.repeat(21);
      expect(validateUsername(longUsername)).toBe('用户名不能超过 20 个字符');
    });

    it('returns error for invalid characters in username', () => {
      const invalidUsername = 'user@name';
      expect(validateUsername(invalidUsername)).toBe('用户名只能包含字母、数字、下划线和中文');
    });
  });

  describe('validateEmail', () => {
    it('returns empty string for valid email', () => {
      const validEmail = 'test@example.com';
      expect(validateEmail(validEmail)).toBe('');
    });

    it('returns error for empty email', () => {
      expect(validateEmail('')).toBe('请输入邮箱');
    });

    it('returns error for invalid email', () => {
      const invalidEmail = 'testexample.com';
      expect(validateEmail(invalidEmail)).toBe('请输入有效的邮箱地址');
    });
  });

  describe('validateDisplayName', () => {
    it('returns empty string for valid display name', () => {
      const validDisplayName = 'John Doe';
      expect(validateDisplayName(validDisplayName)).toBe('');
    });

    it('returns error for empty display name', () => {
      expect(validateDisplayName('')).toBe('请输入显示名称');
    });

    it('returns error for short display name', () => {
      const shortDisplayName = 'J';
      expect(validateDisplayName(shortDisplayName)).toBe('显示名称至少需要 2 个字符');
    });

    it('returns error for long display name', () => {
      const longDisplayName = 'a'.repeat(51);
      expect(validateDisplayName(longDisplayName)).toBe('显示名称不能超过 50 个字符');
    });
  });

  describe('validateNickname', () => {
    it('returns empty string for valid nickname', () => {
      const validNickname = 'Nick';
      expect(validateNickname(validNickname)).toBe('');
    });

    it('returns error for empty nickname', () => {
      expect(validateNickname('')).toBe('请输入昵称');
    });

    it('returns error for short nickname', () => {
      const shortNickname = 'A';
      expect(validateNickname(shortNickname)).toBe('昵称至少需要 2 个字符');
    });

    it('returns error for long nickname', () => {
      const longNickname = 'a'.repeat(31);
      expect(validateNickname(longNickname)).toBe('昵称不能超过 30 个字符');
    });
  });

  describe('validateBio', () => {
    it('returns empty string for valid bio', () => {
      const validBio = 'This is a valid bio.';
      expect(validateBio(validBio)).toBe('');
    });

    it('returns error for long bio', () => {
      const longBio = 'a'.repeat(501);
      expect(validateBio(longBio)).toBe('个人简介不能超过 500 个字符');
    });
  });
});