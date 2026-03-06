/**
 * API 请求验证测试
 */

import { describe, it, expect } from 'vitest';
import { validateBody, validateQuery, commonSchemas } from './validation';

describe('validateBody', () => {
  it('should validate required fields', () => {
    const schema = {
      name: { type: 'string', required: true },
    };

    const result = validateBody({}, schema);

    expect(result.success).toBe(false);
    expect(result.errors?.name).toContain('name is required');
  });

  it('should validate string length', () => {
    const schema = {
      name: { type: 'string', minLength: 3, maxLength: 10 },
    };

    let result = validateBody({ name: 'ab' }, schema);
    expect(result.success).toBe(false);

    result = validateBody({ name: 'abcdefghijk' }, schema);
    expect(result.success).toBe(false);

    result = validateBody({ name: 'abc' }, schema);
    expect(result.success).toBe(true);
  });

  it('should validate number range', () => {
    const schema = {
      age: { type: 'number', min: 0, max: 120 },
    };

    let result = validateBody({ age: -1 }, schema);
    expect(result.success).toBe(false);

    result = validateBody({ age: 150 }, schema);
    expect(result.success).toBe(false);

    result = validateBody({ age: 25 }, schema);
    expect(result.success).toBe(true);
  });

  it('should validate email format', () => {
    const schema = {
      email: { type: 'email' },
    };

    let result = validateBody({ email: 'invalid-email' }, schema);
    expect(result.success).toBe(false);

    result = validateBody({ email: 'test@example.com' }, schema);
    expect(result.success).toBe(true);
  });

  it('should validate enum values', () => {
    const schema = {
      status: { type: 'string', enum: ['active', 'inactive'] as string[] },
    };

    let result = validateBody({ status: 'unknown' }, schema);
    expect(result.success).toBe(false);

    result = validateBody({ status: 'active' }, schema);
    expect(result.success).toBe(true);
  });

  it('should apply default values', () => {
    const schema = {
      role: { type: 'string', default: 'user' },
    };

    const result = validateBody({}, schema);

    expect(result.success).toBe(true);
    expect(result.data?.role).toBe('user');
  });

  it('should transform values', () => {
    const schema = {
      count: {
        type: 'number',
        transform: (v) => Number(v),
      },
    };

    // 传入数字类型时，类型检查通过，transform 仍会应用
    const result = validateBody({ count: '42' }, schema);

    expect(result.success).toBe(true);
    // transform 把字符串转成数字
    expect(result.data?.count).toBe(42);
  });

  it('should validate with custom validator', () => {
    const schema = {
      password: {
        type: 'string',
        custom: (v) => {
          const str = String(v);
          if (str.length < 8) return 'Password must be at least 8 characters';
          if (!/[A-Z]/.test(str)) return 'Password must contain uppercase letter';
          return true;
        },
      },
    };

    let result = validateBody({ password: 'weak' }, schema);
    expect(result.success).toBe(false);

    result = validateBody({ password: 'StrongPass123' }, schema);
    expect(result.success).toBe(true);
  });

  it('should validate multiple types', () => {
    const schema = {
      id: { type: ['string', 'number'] },
    };

    let result = validateBody({ id: 'abc' }, schema);
    expect(result.success).toBe(true);

    result = validateBody({ id: 123 }, schema);
    expect(result.success).toBe(true);

    result = validateBody({ id: true }, schema);
    expect(result.success).toBe(false);
  });
});

describe('validateQuery', () => {
  function createSearchParams(params: Record<string, string>): URLSearchParams {
    return new URLSearchParams(params);
  }

  it('should parse string to number', () => {
    const schema = {
      page: { type: 'number' },
    };

    const result = validateQuery(createSearchParams({ page: '2' }), schema);

    expect(result.success).toBe(true);
    expect(result.data?.page).toBe(2);
  });

  it('should parse string to boolean', () => {
    const schema = {
      active: { type: 'boolean' },
    };

    let result = validateQuery(createSearchParams({ active: 'true' }), schema);
    expect(result.data?.active).toBe(true);

    result = validateQuery(createSearchParams({ active: 'false' }), schema);
    expect(result.data?.active).toBe(false);
  });

  it('should parse comma-separated array', () => {
    const schema = {
      tags: { type: 'array' },
    };

    const result = validateQuery(
      createSearchParams({ tags: 'tag1,tag2,tag3' }),
      schema
    );

    expect(result.success).toBe(true);
    expect(result.data?.tags).toEqual(['tag1', 'tag2', 'tag3']);
  });
});

describe('commonSchemas', () => {
  it('should validate pagination with defaults', () => {
    const result = validateBody({}, commonSchemas.pagination);

    expect(result.success).toBe(true);
    expect(result.data?.page).toBe(1);
    expect(result.data?.limit).toBe(20);
  });

  it('should validate user creation', () => {
    const validUser = {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'member',
    };

    const result = validateBody(validUser, commonSchemas.userCreate);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidUser = {
      name: 'John',
      email: 'not-an-email',
    };

    const result = validateBody(invalidUser, commonSchemas.userCreate);
    expect(result.success).toBe(false);
    expect(result.errors?.email).toBeDefined();
  });

  it('should validate task creation', () => {
    const validTask = {
      title: 'Test Task',
      priority: 'high',
      tags: ['urgent', 'bug'],
    };

    const result = validateBody(validTask, commonSchemas.taskCreate);
    expect(result.success).toBe(true);
  });
});