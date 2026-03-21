/**
 * @fileoverview Tests for array utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { batch, shuffle, randomItem, unique, groupBy, pick, omit } from '../array';

describe('array', () => {
  describe('batch', () => {
    it('should batch array into chunks', () => {
      const array = [1, 2, 3, 4, 5];
      const result = batch(array, 2);

      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle batch size larger than array', () => {
      const array = [1, 2, 3];
      const result = batch(array, 10);

      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should handle empty array', () => {
      const result = batch([], 2);

      expect(result).toEqual([]);
    });

    it('should handle single item array', () => {
      const array = [1];
      const result = batch(array, 2);

      expect(result).toEqual([[1]]);
    });

    it('should handle batch size of 1', () => {
      const array = [1, 2, 3];
      const result = batch(array, 1);

      expect(result).toEqual([[1], [2], [3]]);
    });

    it('should handle batch size that evenly divides array', () => {
      const array = [1, 2, 3, 4, 5, 6];
      const result = batch(array, 2);

      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });
  });

  describe('shuffle', () => {
    it('should return array with same length', () => {
      const array = [1, 2, 3, 4, 5];
      const result = shuffle(array);

      expect(result).toHaveLength(array.length);
    });

    it('should not modify original array', () => {
      const array = [1, 2, 3, 4, 5];
      const original = [...array];
      shuffle(array);

      expect(array).toEqual(original);
    });

    it('should contain same elements', () => {
      const array = [1, 2, 3, 4, 5];
      const result = shuffle(array);

      expect(result.sort()).toEqual(array.sort());
    });

    it('should handle empty array', () => {
      const result = shuffle([]);

      expect(result).toEqual([]);
    });

    it('should handle single item array', () => {
      const array = [1];
      const result = shuffle(array);

      expect(result).toEqual([1]);
    });

    it('should handle strings', () => {
      const array = ['a', 'b', 'c', 'd', 'e'];
      const result = shuffle(array);

      expect(result).toHaveLength(array.length);
      expect(result.sort()).toEqual(array.sort());
    });
  });

  describe('randomItem', () => {
    it('should return an item from array', () => {
      const array = [1, 2, 3, 4, 5];
      const result = randomItem(array);

      expect(array).toContain(result);
    });

    it('should return undefined for empty array', () => {
      expect(randomItem([])).toBeUndefined();
    });

    it('should always return the only item in single-item array', () => {
      const array = [42];
      const result = randomItem(array);

      expect(result).toBe(42);
    });

    it('should handle strings', () => {
      const array = ['a', 'b', 'c'];
      const result = randomItem(array);

      expect(array).toContain(result);
    });
  });

  describe('unique', () => {
    it('should remove duplicates', () => {
      const array = [1, 2, 2, 3, 3, 3];
      const result = unique(array);

      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle arrays with no duplicates', () => {
      const array = [1, 2, 3, 4, 5];
      const result = unique(array);

      expect(result).toEqual(array);
    });

    it('should handle empty array', () => {
      const result = unique([]);

      expect(result).toEqual([]);
    });

    it('should handle strings', () => {
      const array = ['a', 'b', 'a', 'c', 'b'];
      const result = unique(array);

      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle objects by reference', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 1 };
      const obj3 = obj1;

      const array = [obj1, obj2, obj3];
      const result = unique(array);

      // obj1 and obj3 are the same reference
      expect(result).toHaveLength(2);
      expect(result).toContain(obj1);
      expect(result).toContain(obj2);
    });
  });

  describe('groupBy', () => {
    it('should group items by key function', () => {
      const array = [
        { id: 1, type: 'a' },
        { id: 2, type: 'b' },
        { id: 3, type: 'a' },
        { id: 4, type: 'c' },
        { id: 5, type: 'b' },
      ];

      const result = groupBy(array, item => item.type);

      expect(result.get('a')).toEqual([
        { id: 1, type: 'a' },
        { id: 3, type: 'a' },
      ]);
      expect(result.get('b')).toEqual([
        { id: 2, type: 'b' },
        { id: 5, type: 'b' },
      ]);
      expect(result.get('c')).toEqual([{ id: 4, type: 'c' }]);
    });

    it('should handle empty array', () => {
      const result = groupBy([], item => item);

      expect(result.size).toBe(0);
    });

    it('should group by numeric key', () => {
      const array = [
        { id: 1, value: 10 },
        { id: 2, value: 20 },
        { id: 3, value: 10 },
      ];

      const result = groupBy(array, item => item.value);

      expect(result.get(10)).toHaveLength(2);
      expect(result.get(20)).toHaveLength(1);
    });

    it('should handle string keys', () => {
      const array = [
        { name: 'Alice', category: 'admin' },
        { name: 'Bob', category: 'user' },
        { name: 'Charlie', category: 'admin' },
      ];

      const result = groupBy(array, item => item.category);

      expect(result.get('admin')).toHaveLength(2);
      expect(result.get('user')).toHaveLength(1);
    });
  });

  describe('pick', () => {
    it('should pick specified keys from object', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = pick(obj, ['a', 'c']);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should not include keys that do not exist', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, ['a', 'c', 'd']);

      expect(result).toEqual({ a: 1 });
    });

    it('should handle empty keys array', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, []);

      expect(result).toEqual({});
    });

    it('should handle all keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'b', 'c']);

      expect(result).toEqual(obj);
    });

    it('should handle null and undefined values', () => {
      const obj = { a: 1, b: null, c: undefined, d: 4 };
      const result = pick(obj, ['a', 'b', 'c']);

      expect(result).toEqual({ a: 1, b: null, c: undefined });
    });
  });

  describe('omit', () => {
    it('should omit specified keys from object', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = omit(obj, ['b', 'd']);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should return all keys if none to omit', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, []);

      expect(result).toEqual(obj);
    });

    it('should handle empty object', () => {
      const result = omit({}, ['a', 'b']);

      expect(result).toEqual({});
    });

    it('should handle keys that do not exist', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, ['c', 'd']);

      expect(result).toEqual(obj);
    });

    it('should not mutate original object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const original = { ...obj };
      omit(obj, ['b']);

      expect(obj).toEqual(original);
    });
  });
});
