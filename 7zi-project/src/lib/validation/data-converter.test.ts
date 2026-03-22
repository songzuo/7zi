/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import {
  cleanString,
  cleanNumber,
  cleanBoolean,
  cleanArray,
  cleanObject,
  renameFields,
  flattenObject,
  unflattenObject,
  convertToType,
  queryStringToObj,
  objToQueryString,
  objectToPairs,
  pairsToObject,
  objectToFormData,
  formDataToObject,
  convertAndValidate,
  type FieldMapping,
} from './data-converter';

describe('data-converter', () => {
  describe('cleanString', () => {
    it('should trim and clean valid strings', () => {
      expect(cleanString('  hello world  ')).toBe('hello world');
      expect(cleanString('hello')).toBe('hello');
    });

    it('should return null for empty strings with emptyToNull', () => {
      expect(cleanString('', { trim: true, emptyToNull: true })).toBeNull();
      expect(cleanString('   ', { trim: true, emptyToNull: true })).toBeNull();
    });

    it('should return empty string when emptyToNull is false', () => {
      expect(cleanString('', { emptyToNull: false })).toBe('');
    });

    it('should return null for null/undefined', () => {
      expect(cleanString(null)).toBeNull();
      expect(cleanString(undefined)).toBeNull();
    });

    it('should convert numbers to strings', () => {
      expect(cleanString(123)).toBe('123');
      expect(cleanString(45.67)).toBe('45.67');
    });
  });

  describe('cleanNumber', () => {
    it('should parse valid numbers from strings', () => {
      expect(cleanNumber('123')).toBe(123);
      expect(cleanNumber('45.67')).toBe(45.67);
      expect(cleanNumber('-10.5')).toBe(-10.5);
    });

    it('should handle number inputs', () => {
      expect(cleanNumber(123)).toBe(123);
      expect(cleanNumber(45.67)).toBe(45.67);
    });

    it('should return default value for invalid numbers', () => {
      expect(cleanNumber('abc', { default: 0 })).toBe(0);
      expect(cleanNumber('', { default: -1 })).toBe(-1);
    });

    it('should clamp values within min/max range', () => {
      expect(cleanNumber(150, { min: 0, max: 100 })).toBe(100);
      expect(cleanNumber(-10, { min: 0, max: 100 })).toBe(0);
      expect(cleanNumber(50, { min: 0, max: 100 })).toBe(50);
    });

    it('should return null for invalid inputs without default', () => {
      expect(cleanNumber('invalid')).toBeNull();
      expect(cleanNumber(null)).toBeNull();
    });
  });

  describe('cleanBoolean', () => {
    it('should convert truthy string values to true', () => {
      expect(cleanBoolean('true')).toBe(true);
      expect(cleanBoolean('TRUE')).toBe(true);
      expect(cleanBoolean('yes')).toBe(true);
      expect(cleanBoolean('1')).toBe(true);
      expect(cleanBoolean('on')).toBe(true);
    });

    it('should convert falsy string values to false', () => {
      expect(cleanBoolean('false')).toBe(false);
      expect(cleanBoolean('no')).toBe(false);
      expect(cleanBoolean('0')).toBe(false);
      expect(cleanBoolean('off')).toBe(false);
    });

    it('should handle boolean inputs', () => {
      expect(cleanBoolean(true)).toBe(true);
      expect(cleanBoolean(false)).toBe(false);
    });

    it('should convert numbers to boolean', () => {
      expect(cleanBoolean(1)).toBe(true);
      expect(cleanBoolean(0)).toBe(false);
      expect(cleanBoolean(-1)).toBe(true);
    });

    it('should return false for other types', () => {
      expect(cleanBoolean(null)).toBe(false);
      expect(cleanBoolean(undefined)).toBe(false);
      expect(cleanBoolean('')).toBe(false);
    });
  });

  describe('cleanArray', () => {
    it('should convert single values to arrays', () => {
      expect(cleanArray('hello')).toEqual(['hello']);
      expect(cleanArray(123)).toEqual([123]);
    });

    it('should keep arrays as-is', () => {
      expect(cleanArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(cleanArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should return empty array for null/undefined', () => {
      expect(cleanArray(null)).toEqual([]);
      expect(cleanArray(undefined)).toEqual([]);
    });

    it('should filter empty values when filterEmpty is true', () => {
      expect(cleanArray([1, null, 2, undefined, '', 3], { filterEmpty: true }))
        .toEqual([1, 2, 3]);
    });

    it('should remove duplicates when unique is true', () => {
      expect(cleanArray([1, 2, 2, 3, 1], { unique: true }))
        .toEqual([1, 2, 3]);
    });

    it('should combine unique and filterEmpty', () => {
      expect(cleanArray([1, 2, 2, null, 3, '', 1], { unique: true, filterEmpty: true }))
        .toEqual([1, 2, 3]);
    });
  });

  describe('cleanObject', () => {
    it('should clean object with default options', () => {
      const result = cleanObject({
        name: '  John  ',
        age: '30',
        email: '',
        empty: null,
      });

      expect(result).toEqual({
        name: 'John',
        age: '30',
      });
    });

    it('should keep empty values when configured', () => {
      const result = cleanObject(
        { name: '', age: '30' },
        { ignoreEmpty: false, ignoreNull: true, ignoreUndefined: true }
      );

      expect(result).toEqual({
        name: '',
        age: '30',
      });
    });

    it('should keep numbers and booleans as-is (they are not strings)', () => {
      const result = cleanObject(
        { active: true, admin: false, count: 42, name: 'John' },
        { trimStrings: true }
      );

      expect(result).toEqual({
        active: true,
        admin: false,
        count: 42,
        name: 'John',
      });
    });

    it('should deep clean nested objects when deep is true', () => {
      const result = cleanObject(
        {
          name: '  John  ',
          nested: {
            age: '  25  ',
            empty: '',
          },
        },
        { deep: true }
      );

      expect(result).toEqual({
        name: 'John',
        nested: {
          age: '25',
        },
      });
    });
  });

  describe('renameFields', () => {
    it('should rename fields according to mappings', () => {
      const obj = { firstName: 'John', lastName: 'Doe', age: 30 };
      const mappings = [
        { from: 'firstName', to: 'first_name' },
        { from: 'lastName', to: 'last_name' },
      ];

      const result = renameFields(obj, mappings);

      expect(result).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        age: 30,
      });
    });

    it('should apply transform function to renamed fields', () => {
      const obj = { firstName: 'john', lastName: 'doe' };
      const mappings: FieldMapping[] = [
        { from: 'firstName', to: 'firstName', transform: (v: unknown) => String(v).toUpperCase() },
        { from: 'lastName', to: 'lastName', transform: (v: unknown) => String(v).toUpperCase() },
      ];

      const result = renameFields(obj, mappings);

      expect(result).toEqual({
        firstName: 'JOHN',
        lastName: 'DOE',
      });
    });

    it('should keep unmapped fields', () => {
      const obj = { name: 'John', age: 30 };
      const mappings = [{ from: 'name', to: 'fullName' }];

      const result = renameFields(obj, mappings);

      expect(result).toEqual({
        fullName: 'John',
        age: 30,
      });
    });
  });

  describe('flattenObject', () => {
    it('should flatten nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          address: {
            city: 'NYC',
            zip: '10001',
          },
        },
        age: 30,
      };

      const result = flattenObject(obj);

      expect(result).toEqual({
        'user.name': 'John',
        'user.address.city': 'NYC',
        'user.address.zip': '10001',
        age: 30,
      });
    });

    it('should use custom separator', () => {
      const obj = { user: { name: 'John' } };
      const result = flattenObject(obj, '_');

      expect(result).toEqual({ 'user_name': 'John' });
    });

    it('should handle custom prefix', () => {
      const obj = { name: 'John', age: 30 };
      const result = flattenObject(obj, '.', 'data');

      expect(result).toEqual({
        'data.name': 'John',
        'data.age': 30,
      });
    });

    it('should handle flat objects', () => {
      const obj = { name: 'John', age: 30 };
      const result = flattenObject(obj);

      expect(result).toEqual({ name: 'John', age: 30 });
    });
  });

  describe('unflattenObject', () => {
    it('should unflatten flat objects', () => {
      const obj = {
        'user.name': 'John',
        'user.address.city': 'NYC',
        age: 30,
      };

      const result = unflattenObject(obj);

      expect(result).toEqual({
        user: {
          name: 'John',
          address: {
            city: 'NYC',
          },
        },
        age: 30,
      });
    });

    it('should use custom separator', () => {
      const obj = { 'user_name': 'John' };
      const result = unflattenObject(obj, '_');

      expect(result).toEqual({ user: { name: 'John' } });
    });

    it('should round-trip with flattenObject', () => {
      const original = {
        user: {
          name: 'John',
          address: {
            city: 'NYC',
            zip: '10001',
          },
        },
        age: 30,
      };

      const flattened = flattenObject(original);
      const unflattened = unflattenObject(flattened);

      expect(unflattened).toEqual(original);
    });
  });

  describe('convertToType', () => {
    it('should convert to string', () => {
      expect(convertToType<string>(123, 'string')).toBe('123');
      expect(convertToType<string>(true, 'string')).toBe('true');
    });

    it('should convert to number', () => {
      expect(convertToType<number>('123', 'number')).toBe(123);
      expect(convertToType<number>('45.67', 'number')).toBe(45.67);
    });

    it('should convert to boolean', () => {
      expect(convertToType<boolean>('true', 'boolean')).toBe(true);
      expect(convertToType<boolean>('false', 'boolean')).toBe(false);
    });

    it('should convert to date', () => {
      const date = convertToType<Date>('2024-01-01', 'date');
      expect(date).toBeInstanceOf(Date);
      expect(date?.toISOString().startsWith('2024-01-01')).toBe(true);
    });

    it('should convert to array', () => {
      expect(convertToType<string[]>('hello', 'array')).toEqual(['hello']);
      expect(convertToType<number[]>([1, 2, 3], 'array')).toEqual([1, 2, 3]);
    });

    it('should convert to object', () => {
      const obj = { name: 'John' };
      expect(convertToType<object>(obj, 'object')).toEqual(obj);
    });

    it('should return null for invalid conversions', () => {
      expect(convertToType<number>('invalid', 'number')).toBeNull();
      expect(convertToType<Date>('invalid', 'date')).toBeNull();
      expect(convertToType<object>('string', 'object')).toBeNull();
    });
  });

  describe('queryStringToObj', () => {
    it('should parse query string', () => {
      const result = queryStringToObj('name=John&age=30');
      expect(result).toEqual({ name: 'John', age: '30' });
    });

    it('should handle leading ?', () => {
      const result = queryStringToObj('?name=John&age=30');
      expect(result).toEqual({ name: 'John', age: '30' });
    });

    it('should handle empty string', () => {
      expect(queryStringToObj('')).toEqual({});
    });

    it('should handle multiple values for same key', () => {
      const result = queryStringToObj('tags=js&tags=ts&tags=react');
      expect(result).toEqual({ tags: ['js', 'ts', 'react'] });
    });

    it('should decode URL-encoded values', () => {
      const result = queryStringToObj('name=John%20Doe');
      expect(result).toEqual({ name: 'John Doe' });
    });

    it('should handle empty values', () => {
      const result = queryStringToObj('name=&age=30');
      expect(result).toEqual({ name: '', age: '30' });
    });
  });

  describe('objToQueryString', () => {
    it('should convert object to query string', () => {
      const result = objToQueryString({ name: 'John', age: 30 });
      expect(result).toBe('?name=John&age=30');
    });

    it('should handle empty object', () => {
      expect(objToQueryString({})).toBe('');
    });

    it('should handle arrays', () => {
      const result = objToQueryString({ tags: ['js', 'ts', 'react'] });
      expect(result).toBe('?tags=js&tags=ts&tags=react');
    });

    it('should skip null/undefined/empty values', () => {
      const result = objToQueryString({ name: 'John', age: null, empty: '' });
      expect(result).toBe('?name=John');
    });

    it('should URL-encode values', () => {
      const result = objToQueryString({ name: 'John Doe' });
      expect(result).toBe('?name=John%20Doe');
    });
  });

  describe('objectToPairs and pairsToObject', () => {
    it('should convert object to pairs', () => {
      const obj = { name: 'John', age: 30 };
      const result = objectToPairs(obj);

      expect(result).toEqual([
        { key: 'name', value: 'John' },
        { key: 'age', value: 30 },
      ]);
    });

    it('should convert pairs back to object', () => {
      const pairs = [
        { key: 'name', value: 'John' },
        { key: 'age', value: 30 },
      ];
      const result = pairsToObject(pairs);

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should round-trip correctly', () => {
      const original = { name: 'John', age: 30 };
      const pairs = objectToPairs(original);
      const result = pairsToObject(pairs);

      expect(result).toEqual(original);
    });
  });

  describe('objectToFormData and formDataToObject', () => {
    it('should convert object to FormData', () => {
      const obj = { name: 'John', age: 30 };
      const formData = objectToFormData(obj);

      expect(formData.get('name')).toBe('John');
      expect(formData.get('age')).toBe('30');
    });

    it('should convert FormData back to object', () => {
      const formData = new FormData();
      formData.append('name', 'John');
      formData.append('age', '30');

      const result = formDataToObject(formData);

      expect(result).toEqual({ name: 'John', age: '30' });
    });

    it('should handle arrays with brackets format', () => {
      const obj = { tags: ['js', 'ts', 'react'] };
      const formData = objectToFormData(obj, { arrayFormat: 'brackets' });

      expect(formData.getAll('tags[]')).toEqual(['js', 'ts', 'react']);
    });

    it('should handle arrays with indices format', () => {
      const obj = { tags: ['js', 'ts', 'react'] };
      const formData = objectToFormData(obj, { arrayFormat: 'indices' });

      expect(formData.get('tags[0]')).toBe('js');
      expect(formData.get('tags[1]')).toBe('ts');
      expect(formData.get('tags[2]')).toBe('react');
    });

    it('should round-trip correctly (note: FormData stores all values as strings)', () => {
      const original = { name: 'John', age: 30 };
      const formData = objectToFormData(original);
      const result = formDataToObject(formData);

      expect(result).toEqual({ name: 'John', age: '30' });
    });
  });

  describe('convertAndValidate', () => {
    it('should validate and convert data', () => {
      const data = { name: 'John', age: '30', email: 'john@example.com' };
      const schema = {
        name: { type: 'string' as const, required: true },
        age: { type: 'number' as const, required: true },
        email: { type: 'string' as const, required: true },
      };

      const result = convertAndValidate(data, schema);

      expect(result.data).toEqual({
        name: 'John',
        age: 30,
        email: 'john@example.com',
      });
      expect(result.errors).toEqual({});
    });

    it('should handle missing required fields', () => {
      const data = { name: 'John' };
      const schema = {
        name: { type: 'string' as const, required: true },
        age: { type: 'number' as const, required: true },
      };

      const result = convertAndValidate(data, schema);

      expect(result.errors.age).toBeDefined();
    });

    it('should use default values for optional fields', () => {
      const data = { name: 'John' };
      const schema = {
        name: { type: 'string' as const, required: true },
        age: { type: 'number' as const, required: false, default: 18 },
      };

      const result = convertAndValidate(data, schema);

      expect(result.data.age).toBe(18);
    });

    it('should apply custom transform function', () => {
      const data = { name: 'john' };
      const schema = {
        name: { type: 'string' as const, required: true, transform: (v: unknown) => String(v).toUpperCase() },
      };

      const result = convertAndValidate(data, schema);

      expect(result.data.name).toBe('JOHN');
    });

    it('should handle invalid conversions', () => {
      const data = { age: 'invalid' };
      const schema = {
        age: { type: 'number' as const, required: true },
      };

      const result = convertAndValidate(data, schema);

      expect(result.errors.age).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings in cleanString with options', () => {
      expect(cleanString('', { trim: false, emptyToNull: false })).toBe('');
      expect(cleanString('', { trim: true, emptyToNull: false })).toBe('');
    });

    it('should handle very large numbers in cleanNumber', () => {
      expect(cleanNumber('999999999999')).toBe(999999999999);
      expect(cleanNumber('-999999999999')).toBe(-999999999999);
    });

    it('should handle special characters in strings', () => {
      expect(cleanString('  hello@world.com  ')).toBe('hello@world.com');
      expect(cleanString('  test-123_456  ')).toBe('test-123_456');
    });

    it('should handle deeply nested objects in flatten/unflatten', () => {
      const deep = {
        a: {
          b: {
            c: {
              d: {
                value: 'deep',
              },
            },
          },
        },
      };

      const flattened = flattenObject(deep);
      const unflattened = unflattenObject(flattened);

      expect(unflattened).toEqual(deep);
    });
  });
});
