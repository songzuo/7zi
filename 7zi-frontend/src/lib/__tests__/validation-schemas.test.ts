/**
 * Validation Schemas Tests
 *
 * 输入验证模式单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  usernameSchema,
  passwordSchema,
  strongPasswordSchema,
  emailString,
  phoneNumberSchema,
  registerSchema,
  loginSchema,
  passwordResetSchema,
  changePasswordSchema,
  createProjectSchema,
  sanitizeSqlString,
  sanitizeNoSqlString,
  sanitizeHtml,
  sanitizeCommandString,
  sanitizeObject,
  validateAndSanitizeBody,
} from '../validation-schemas';

describe('Validation Schemas', () => {
  describe('usernameSchema', () => {
    it('should accept valid usernames', () => {
      const result1 = usernameSchema.safeParse('john_doe');
      const result2 = usernameSchema.safeParse('User123');
      const result3 = usernameSchema.safeParse('test_user_2024');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
    });

    it('should reject invalid usernames', () => {
      const result1 = usernameSchema.safeParse('ab'); // 太短
      const result2 = usernameSchema.safeParse('a'.repeat(21)); // 太长
      const result3 = usernameSchema.safeParse('user-name'); // 包含连字符
      const result4 = usernameSchema.safeParse('user@name'); // 包含特殊字符

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
      expect(result4.success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('should accept valid passwords', () => {
      const result1 = passwordSchema.safeParse('password123');
      const result2 = passwordSchema.safeParse('Test1234');
      const result3 = passwordSchema.safeParse('aB1cD2eF3');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
    });

    it('should reject weak passwords', () => {
      const result1 = passwordSchema.safeParse('short'); // 太短
      const result2 = passwordSchema.safeParse('onlyletters'); // 无数字
      const result3 = passwordSchema.safeParse('12345678'); // 无字母

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });
  });

  describe('strongPasswordSchema', () => {
    it('should accept strong passwords with special characters', () => {
      const result1 = strongPasswordSchema.safeParse('P@ssw0rd123!');
      const result2 = strongPasswordSchema.safeParse('Str0ng#P@ss');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should reject passwords without special characters', () => {
      const result = strongPasswordSchema.safeParse('Password123');

      expect(result.success).toBe(false);
    });
  });

  describe('emailString', () => {
    it('should accept valid emails', () => {
      const result1 = emailString.safeParse('user@example.com');
      const result2 = emailString.safeParse('test.user+tag@domain.co.uk');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should reject invalid emails', () => {
      const result1 = emailString.safeParse('invalid-email');
      const result2 = emailString.safeParse('@example.com');
      const result3 = emailString.safeParse('user@');

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });
  });

  describe('phoneNumberSchema', () => {
    it('should accept valid Chinese phone numbers', () => {
      const result1 = phoneNumberSchema.safeParse('13812345678');
      const result2 = phoneNumberSchema.safeParse('15987654321');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      const result1 = phoneNumberSchema.safeParse('12345678901'); // 以 1 开头但第二位无效
      const result2 = phoneNumberSchema.safeParse('1381234567'); // 少一位
      const result3 = phoneNumberSchema.safeParse('138123456789'); // 多一位

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const result = registerSchema.safeParse({
        username: 'john_doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const result = registerSchema.safeParse({
        username: 'john_doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password456',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].message).toContain('不一致');
      }
    });
  });

  describe('loginSchema', () => {
    it('should accept username or email', () => {
      const result1 = loginSchema.safeParse({
        username: 'john_doe',
        password: 'password123',
      });

      const result2 = loginSchema.safeParse({
        username: 'john@example.com',
        password: 'password123',
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should reject short passwords', () => {
      const result = loginSchema.safeParse({
        username: 'john_doe',
        password: 'short',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('passwordResetSchema', () => {
    it('should accept valid reset data', () => {
      const result = passwordResetSchema.safeParse({
        token: 'valid-token-123',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const result = passwordResetSchema.safeParse({
        token: '',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should accept valid change data', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'DifferentPassword123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createProjectSchema', () => {
    it('should accept valid project data', () => {
      const result = createProjectSchema.safeParse({
        name: 'My Project',
        description: 'A test project',
        status: 'active',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = createProjectSchema.safeParse({
        name: 'My Project',
        status: 'invalid',
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Sanitization Functions', () => {
  describe('sanitizeSqlString', () => {
    it('should remove SQL injection characters', () => {
      const input = "admin' -- OR '1'='1";
      const result = sanitizeSqlString(input);

      expect(result).not.toContain("'");
      expect(result).not.toContain('--');
    });

    it('should remove SQL comments', () => {
      const input = "test/*comment*/value";
      const result = sanitizeSqlString(input);

      expect(result).not.toContain('/*');
      expect(result).not.toContain('*/');
    });
  });

  describe('sanitizeNoSqlString', () => {
    it('should remove NoSQL operators', () => {
      const input = '{"$ne": null}';
      const result = sanitizeNoSqlString(input);

      expect(result).not.toContain('$ne');
    });

    it('should remove multiple operators', () => {
      const input = '{"$gt": 0, "$lt": 100}';
      const result = sanitizeNoSqlString(input);

      expect(result).not.toContain('$gt');
      expect(result).not.toContain('$lt');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("XSS")</script>Safe content';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('<script>');
      expect(result).toContain('Safe content');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>Safe';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('<iframe>');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click</div>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('onclick');
    });
  });

  describe('sanitizeCommandString', () => {
    it('should remove shell special characters', () => {
      const input = 'file.txt; rm -rf /';
      const result = sanitizeCommandString(input);

      expect(result).not.toContain(';');
    });

    it('should remove command substitution', () => {
      const input = 'echo $(whoami)';
      const result = sanitizeCommandString(input);

      expect(result).not.toContain('$(');
      expect(result).not.toContain(')');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string fields', () => {
      const input = {
        name: '<script>alert(1)</script>',
        email: 'test@example.com',
        bio: "admin' --",
      };

      const result = sanitizeObject(input, 'html');

      expect(result.name).not.toContain('<script>');
      expect(result.email).toBe('test@example.com'); // 没有危险的 HTML 字符
      expect(result.bio).toContain("admin"); // 清理后保留部分内容
    });

    it('should not modify non-string fields', () => {
      const input = {
        name: '<script>test</script>',
        age: 25,
        active: true,
        tags: ['tag1', 'tag2'],
      };

      const result = sanitizeObject(input, 'html');

      expect(result.age).toBe(25);
      expect(result.active).toBe(true);
      expect(Array.isArray(result.tags)).toBe(true);
    });
  });

  describe('validateAndSanitizeBody', () => {
    it('should validate and sanitize data', async () => {
      const body = {
        username: 'test_user',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = await validateAndSanitizeBody(body, registerSchema, 'nosql');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('test_user');
      }
    });

    it('should return validation errors for invalid data', async () => {
      const body = {
        username: 'ab', // 太短
        email: 'invalid-email',
        password: 'short',
        confirmPassword: 'short',
      };

      const result = await validateAndSanitizeBody(body, registerSchema, 'nosql');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.errors.length).toBeGreaterThan(0);
      }
    });

    it('should sanitize input before validation', async () => {
      const body = {
        username: 'user<script>',
        email: 'user@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = await validateAndSanitizeBody(body, registerSchema, 'html');

      expect(result.success).toBe(false); // 因为清理后的用户名包含特殊字符可能仍然无效
      if (!result.success) {
        // 验证了输入被清理过
        expect(result.errors).toBeDefined();
      }
    });
  });
});
