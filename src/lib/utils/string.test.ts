/**
 * @fileoverview 字符串工具测试
 */
import { describe, it, expect } from 'vitest';
import {
  matchesSearchIgnoreCase,
  matchesAnyField,
  prepareSearchTerm,
  safeTrim,
  isEmptyString,
  isNotEmptyString,
  safeLowerCase,
  safeUpperCase,
  truncate,
  capitalize,
  isString,
  isStringLike,
} from './string';

describe('isString / isStringLike (type guards)', () => {
  it('should narrow types correctly', () => {
    const emptyStr: unknown = '';
    const nonEmptyStr: unknown = 'hello';
    const whitespaceStr: unknown = '   ';
    const notString: unknown = 123;
    const nullVal: unknown = null;

    expect(isString(emptyStr)).toBe(false);
    expect(isString(nonEmptyStr)).toBe(true);
    expect(isString(whitespaceStr)).toBe(false);
    expect(isString(notString)).toBe(false);
    expect(isString(nullVal)).toBe(false);
  });

  it('isStringLike should include empty strings', () => {
    expect(isStringLike('')).toBe(true);
    expect(isStringLike('hello')).toBe(true);
    expect(isStringLike(123)).toBe(false);
    expect(isStringLike(null)).toBe(false);
  });
});

describe('matchesSearchIgnoreCase', () => {
  it('should match case-insensitively', () => {
    expect(matchesSearchIgnoreCase('Hello World', 'hello')).toBe(true);
    expect(matchesSearchIgnoreCase('HELLO', 'hello')).toBe(true);
    expect(matchesSearchIgnoreCase('hello', 'HELLO')).toBe(true);
  });

  it('should return false for no match', () => {
    expect(matchesSearchIgnoreCase('Hello', 'world')).toBe(false);
  });

  it('should handle empty inputs', () => {
    expect(matchesSearchIgnoreCase('', 'test')).toBe(false);
    expect(matchesSearchIgnoreCase('test', '')).toBe(false);
    expect(matchesSearchIgnoreCase('', '')).toBe(false);
  });
});

describe('matchesAnyField', () => {
  it('should return true if any field matches', () => {
    const searchLower = prepareSearchTerm('test');
    expect(matchesAnyField(['Hello', 'Test Title', 'World'], searchLower)).toBe(true);
  });

  it('should return false if no field matches', () => {
    const searchLower = prepareSearchTerm('xyz');
    expect(matchesAnyField(['Hello', 'World'], searchLower)).toBe(false);
  });

  it('should handle null/undefined fields', () => {
    const searchLower = prepareSearchTerm('test');
    expect(matchesAnyField([null, 'Test', undefined], searchLower)).toBe(true);
  });
});

describe('prepareSearchTerm', () => {
  it('should convert to lowercase', () => {
    expect(prepareSearchTerm('TEST')).toBe('test');
    expect(prepareSearchTerm('TeSt')).toBe('test');
  });

  it('should handle empty input', () => {
    expect(prepareSearchTerm('')).toBe('');
    expect(prepareSearchTerm(null as any)).toBe('');
    expect(prepareSearchTerm(undefined as any)).toBe('');
  });
});

describe('safeTrim', () => {
  it('should trim whitespace', () => {
    expect(safeTrim('  hello  ')).toBe('hello');
  });

  it('should handle null/undefined', () => {
    expect(safeTrim(null)).toBe('');
    expect(safeTrim(undefined)).toBe('');
  });
});

describe('isEmptyString', () => {
  it('should return true for empty strings', () => {
    expect(isEmptyString('')).toBe(true);
    expect(isEmptyString('  ')).toBe(true);
    expect(isEmptyString(null)).toBe(true);
    expect(isEmptyString(undefined)).toBe(true);
  });

  it('should return false for non-empty strings', () => {
    expect(isEmptyString('hello')).toBe(false);
    expect(isEmptyString('  hello  ')).toBe(false);
  });
});

describe('isNotEmptyString', () => {
  it('should be opposite of isEmptyString', () => {
    expect(isNotEmptyString('hello')).toBe(true);
    expect(isNotEmptyString('')).toBe(false);
    expect(isNotEmptyString(null)).toBe(false);
  });
});

describe('safeLowerCase / safeUpperCase', () => {
  it('should convert case safely', () => {
    expect(safeLowerCase('HELLO')).toBe('hello');
    expect(safeUpperCase('hello')).toBe('HELLO');
  });

  it('should handle null/undefined', () => {
    expect(safeLowerCase(null)).toBe('');
    expect(safeUpperCase(undefined)).toBe('');
  });
});

describe('truncate', () => {
  it('should truncate long strings', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
    expect(truncate('Hello World', 5, '…')).toBe('Hell…');
  });

  it('should not truncate short strings', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('should handle empty input', () => {
    expect(truncate('', 5)).toBe('');
  });
});

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('HELLO')).toBe('Hello');
    expect(capitalize('hELLO')).toBe('Hello');
  });

  it('should handle empty string', () => {
    expect(capitalize('')).toBe('');
  });
});