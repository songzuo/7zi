import { describe, it, expect, beforeEach } from 'vitest';
import {
  isValidEmail,
  isValidUrl,
  isValidPhoneNumber,
  isStrongPassword,
  isValidUsername,
  isValidFileExtension,
  isInRange,
  isValidLength,
  isEmpty,
  isValidDate,
  isValidJson,
  isValidUuid,
  isValidIPv4,
  isValidHexColor,
  isValidRegex,
  validateObject,
  truncateString,
  formatPhoneNumber,
} from '../validation';

describe('验证函数', () => {
  describe('isValidEmail', () => {
    it('应该接受有效的电子邮件地址', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('user123@test-domain.com')).toBe(true);
    });

    it('应该拒绝无效的电子邮件地址', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('应该接受有效的 URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path')).toBe(true);
      expect(isValidUrl('https://example.com?query=1')).toBe(true);
      expect(isValidUrl('https://example.com:8080')).toBe(true);
    });

    it('应该拒绝无效的 URL', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('应该接受有效的中国大陆手机号', () => {
      expect(isValidPhoneNumber('13812345678')).toBe(true);
      expect(isValidPhoneNumber('15098765432')).toBe(true);
      expect(isValidPhoneNumber('17655556666')).toBe(true);
      expect(isValidPhoneNumber('19988887777')).toBe(true);
    });

    it('应该拒绝无效的手机号', () => {
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('12345678901')).toBe(false);
      expect(isValidPhoneNumber('1381234567')).toBe(false);
      expect(isValidPhoneNumber('138123456789')).toBe(false);
      expect(isValidPhoneNumber('abcdefghijk')).toBe(false);
      expect(isValidPhoneNumber('10812345678')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('应该接受强密码', () => {
      expect(isStrongPassword('Password123')).toBe(true);
      expect(isStrongPassword('Test1234')).toBe(true);
      expect(isStrongPassword('abc123456')).toBe(true);
      expect(isStrongPassword('ABC123456')).toBe(true);
      expect(isStrongPassword('a1b2c3d4e5')).toBe(true);
    });

    it('应该拒绝弱密码', () => {
      expect(isStrongPassword('')).toBe(false);
      expect(isStrongPassword('short')).toBe(false);
      expect(isStrongPassword('onlyletters')).toBe(false);
      expect(isStrongPassword('onlynumbers123')).toBe(false);
      expect(isStrongPassword('ABCDEF')).toBe(false);
      expect(isStrongPassword('123456')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('应该接受有效的用户名', () => {
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('test_user')).toBe(true);
      expect(isValidUsername('User_123')).toBe(true);
      expect(isValidUsername('abc')).toBe(true);
      expect(isValidUsername('a'.repeat(20))).toBe(true);
    });

    it('应该拒绝无效的用户名', () => {
      expect(isValidUsername('')).toBe(false);
      expect(isValidUsername('ab')).toBe(false);
      expect(isValidUsername('a'.repeat(21))).toBe(false);
      expect(isValidUsername('user-name')).toBe(false);
      expect(isValidUsername('user.name')).toBe(false);
      expect(isValidUsername('user name')).toBe(false);
      expect(isValidUsername('用户名')).toBe(false);
    });
  });

  describe('isValidFileExtension', () => {
    it('应该接受允许的文件扩展名', () => {
      expect(isValidFileExtension('test.png', ['png', 'jpg', 'gif'])).toBe(true);
      expect(isValidFileExtension('document.PDF', ['pdf'])).toBe(true);
      expect(isValidFileExtension('data.json', ['json', 'xml'])).toBe(true);
    });

    it('应该拒绝不允许的文件扩展名', () => {
      expect(isValidFileExtension('test.png', ['jpg', 'gif'])).toBe(false);
      expect(isValidFileExtension('test.txt', ['jpg', 'pdf'])).toBe(false);
      expect(isValidFileExtension('noextension', ['png', 'jpg'])).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('应该接受范围内的数字', () => {
      expect(isInRange(5, 1, 10)).toBe(true);
      expect(isInRange(1, 1, 10)).toBe(true);
      expect(isInRange(10, 1, 10)).toBe(true);
      expect(isInRange(-5, -10, 0)).toBe(true);
    });

    it('应该拒绝范围外的数字', () => {
      expect(isInRange(0, 1, 10)).toBe(false);
      expect(isInRange(11, 1, 10)).toBe(false);
      expect(isInRange(0, -10, -1)).toBe(false);
    });
  });

  describe('isValidLength', () => {
    it('应该接受符合长度要求的字符串', () => {
      expect(isValidLength('test', 3, 10)).toBe(true);
      expect(isValidLength('abc', 3, 10)).toBe(true);
      expect(isValidLength('abcdefghij', 3, 10)).toBe(true);
    });

    it('应该拒绝不符合长度要求的字符串', () => {
      expect(isValidLength('ab', 3, 10)).toBe(false);
      expect(isValidLength('abcdefghijk', 3, 10)).toBe(false);
      expect(isValidLength('', 3, 10)).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('应该正确识别空值', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
    });

    it('应该正确识别非空值', () => {
      expect(isEmpty('test')).toBe(false);
      expect(isEmpty('  test  ')).toBe(false);
      expect(isEmpty([1, 2, 3])).toBe(false);
      expect(isEmpty({ key: 'value' })).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('应该接受有效的日期', () => {
      expect(isValidDate('2024-01-01')).toBe(true);
      expect(isValidDate('2024-12-31')).toBe(true);
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate('2024/01/01')).toBe(true);
    });

    it('应该拒绝无效的日期', () => {
      expect(isValidDate('')).toBe(false);
      expect(isValidDate('not-a-date')).toBe(false);
      expect(isValidDate('2024-13-01')).toBe(false);
      expect(isValidDate('2024-02-30')).toBe(false);
      expect(isValidDate(123456789 as unknown as string)).toBe(false);
    });
  });

  describe('isValidJson', () => {
    it('应该接受有效的 JSON 字符串', () => {
      expect(isValidJson('{}')).toBe(true);
      expect(isValidJson('[]')).toBe(true);
      expect(isValidJson('{"key": "value"}')).toBe(true);
      expect(isValidJson('[1, 2, 3]')).toBe(true);
      expect(isValidJson('null')).toBe(true);
      expect(isValidJson('true')).toBe(true);
      expect(isValidJson('false')).toBe(true);
    });

    it('应该拒绝无效的 JSON 字符串', () => {
      expect(isValidJson('')).toBe(false);
      expect(isValidJson('{')).toBe(false);
      expect(isValidJson('{key: value}')).toBe(false);
      expect(isValidJson("'single quoted'")).toBe(false);
      expect(isValidJson('undefined')).toBe(false);
    });
  });

  describe('isValidUuid', () => {
    it('应该接受有效的 UUID', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
      expect(isValidUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('应该拒绝无效的 UUID', () => {
      expect(isValidUuid('')).toBe(false);
      expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUuid('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
      expect(isValidUuid('550e8400_e29b-41d4-a716-446655440000')).toBe(false);
      expect(isValidUuid('not-a-uuid')).toBe(false);
    });
  });

  describe('isValidIPv4', () => {
    it('应该接受有效的 IPv4 地址', () => {
      expect(isValidIPv4('192.168.1.1')).toBe(true);
      expect(isValidIPv4('0.0.0.0')).toBe(true);
      expect(isValidIPv4('255.255.255.255')).toBe(true);
      expect(isValidIPv4('10.0.0.1')).toBe(true);
    });

    it('应该拒绝无效的 IPv4 地址', () => {
      expect(isValidIPv4('')).toBe(false);
      expect(isValidIPv4('256.0.0.1')).toBe(false);
      expect(isValidIPv4('192.168.1')).toBe(false);
      expect(isValidIPv4('192.168.1.1.1')).toBe(false);
      expect(isValidIPv4('192.168.1.a')).toBe(false);
      expect(isValidIPv4('not-an-ip')).toBe(false);
    });
  });

  describe('isValidHexColor', () => {
    it('应该接受有效的十六进制颜色代码', () => {
      expect(isValidHexColor('#ffffff')).toBe(true);
      expect(isValidHexColor('#000000')).toBe(true);
      expect(isValidHexColor('#ff5733')).toBe(true);
      expect(isValidHexColor('#ABC')).toBe(true);
      expect(isValidHexColor('#123')).toBe(true);
    });

    it('应该拒绝无效的十六进制颜色代码', () => {
      expect(isValidHexColor('')).toBe(false);
      expect(isValidHexColor('ffffff')).toBe(false);
      expect(isValidHexColor('#ff57')).toBe(false);
      expect(isValidHexColor('#ff573355')).toBe(false);
      expect(isValidHexColor('#gggggg')).toBe(false);
      expect(isValidHexColor('#AB')).toBe(false);
    });
  });

  describe('isValidRegex', () => {
    it('应该接受有效的正则表达式', () => {
      expect(isValidRegex('[a-z]+')).toBe(true);
      expect(isValidRegex('\\d+')).toBe(true);
      expect(isValidRegex('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$')).toBe(true);
    });

    it('应该拒绝无效的正则表达式', () => {
      expect(isValidRegex('')).toBe(false);
      expect(isValidRegex('[unclosed')).toBe(false);
      expect(isValidRegex('unclosed]')).toBe(false);
      expect(isValidRegex('*invalid')).toBe(false);
    });
  });

  describe('validateObject', () => {
    interface TestObject extends Record<string, unknown> {
      name: string;
      age: number;
      email: string;
    }

    it('应该验证有效的对象', () => {
      const obj: TestObject = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const rules: Record<string, (value: unknown) => boolean | string> = {
        name: (value) => typeof value === 'string' && value.length >= 3 || 'Name too short',
        age: (value) => typeof value === 'number' && value >= 18 || 'Age must be 18+',
        email: (value) => typeof value === 'string' && isValidEmail(value) || 'Invalid email',
      };

      const result = validateObject(obj as Record<string, unknown>, rules);

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('应该返回验证错误', () => {
      const obj: TestObject = {
        name: 'Jo',
        age: 15,
        email: 'invalid-email',
      };

      const rules: Record<string, (value: unknown) => boolean | string> = {
        name: (value) => typeof value === 'string' && value.length >= 3 || 'Name too short',
        age: (value) => typeof value === 'number' && value >= 18 || 'Age must be 18+',
        email: (value) => typeof value === 'string' && isValidEmail(value) || 'Invalid email',
      };

      const result = validateObject(obj as Record<string, unknown>, rules);

      expect(result.valid).toBe(false);
      expect(result.errors.name).toBe('Name too short');
      expect(result.errors.age).toBe('Age must be 18+');
      expect(result.errors.email).toBe('Invalid email');
    });

    it('应该支持部分验证', () => {
      const obj: TestObject = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
      };

      const rules: Record<string, (value: unknown) => boolean | string> = {
        name: (value) => typeof value === 'string' && value.length >= 3,
        // 不验证 age 和 email
      };

      const result = validateObject(obj as Record<string, unknown>, rules);

      expect(result.valid).toBe(true);
    });

    it('应该支持布尔值验证规则', () => {
      const obj: TestObject = {
        name: 'Test',
        age: 25,
        email: 'test@example.com',
      };

      const rules: Record<string, (value: unknown) => boolean | string> = {
        name: (value) => typeof value === 'string' && value.length > 0,
        age: (value) => typeof value === 'number' && value > 0,
      };

      const result = validateObject(obj, rules);

      expect(result.valid).toBe(true);
    });
  });

  describe('truncateString', () => {
    it('应该截断超过最大长度的字符串', () => {
      expect(truncateString('Hello World', 8)).toBe('Hello...');
      expect(truncateString('This is a long string', 10)).toBe('This is...');
    });

    it('应该保留不超过最大长度的字符串', () => {
      expect(truncateString('Hello', 10)).toBe('Hello');
      expect(truncateString('Hi', 2)).toBe('Hi');
    });

    it('应该支持自定义后缀', () => {
      expect(truncateString('Hello World', 8, ' >>')).toBe('Hello >>');
      expect(truncateString('Test', 10, '...')).toBe('Test');
    });
  });

  describe('formatPhoneNumber', () => {
    it('应该格式化有效的手机号', () => {
      expect(formatPhoneNumber('13812345678')).toBe('138-1234-5678');
      expect(formatPhoneNumber('15098765432')).toBe('150-9876-5432');
    });

    it('应该拒绝无效的手机号', () => {
      expect(formatPhoneNumber('1381234567')).toBe(null);
      expect(formatPhoneNumber('138123456789')).toBe(null);
      expect(formatPhoneNumber('abcdefghijk')).toBe(null);
      expect(formatPhoneNumber('')).toBe(null);
    });

    it('应该清理输入中的非数字字符', () => {
      expect(formatPhoneNumber('138-1234-5678')).toBe('138-1234-5678');
      expect(formatPhoneNumber('138 1234 5678')).toBe('138-1234-5678');
    });
  });

  describe('边界情况和组合测试', () => {
    it('应该处理空字符串', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidLength('', 0, 10)).toBe(true);
      expect(isValidLength('', 1, 10)).toBe(false);
    });

    it('应该处理特殊字符', () => {
      expect(isValidEmail('test+tag@example.com')).toBe(true);
      expect(isValidUsername('user_123')).toBe(true);
      expect(isValidUsername('user-name')).toBe(false);
    });

    it('应该处理极值', () => {
      expect(isInRange(1, 1, 1)).toBe(true);
      expect(isInRange(0, 1, 1)).toBe(false);
      expect(isValidLength('abc', 3, 3)).toBe(true);
      expect(isValidLength('ab', 3, 3)).toBe(false);
      expect(isValidLength('abcd', 3, 3)).toBe(false);
    });

    it('应该正确验证对象组合', () => {
      const obj = {
        username: 'test_user',
        email: 'test@example.com',
        age: 25,
      };

      const rules = {
        username: (value: string) => isValidUsername(value) || 'Invalid username',
        email: (value: string) => isValidEmail(value) || 'Invalid email',
        age: (value: number) => isInRange(value, 18, 100) || 'Invalid age',
      };

      const result = validateObject(obj, rules);
      expect(result.valid).toBe(true);
    });
  });
});
