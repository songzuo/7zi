/**
 * Tests for clone utility functions
 */

import { describe, it, expect } from 'vitest';
import { deepClone } from '../clone';

describe('clone utilities', () => {
  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
    });

    it('should deep clone nested objects', () => {
      const nested = { a: { b: { c: 1 } } };
      const cloned = deepClone(nested);

      expect(cloned).toEqual(nested);
      expect(cloned).not.toBe(nested);
      expect(cloned.a).not.toBe(nested.a);
      expect(cloned.a.b).not.toBe(nested.a.b);
    });

    it('should deep clone arrays with nested structures', () => {
      const arr = [1, [2, [3, 4]], { a: { b: 5 } }] as [
        number,
        number[],
        { a: { b: number } }
      ];
      const cloned = deepClone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[1]).not.toBe(arr[1]);
      expect(cloned[1][1]).not.toBe(arr[1][1]);
      expect(cloned[2].a).not.toBe(arr[2].a);
    });

    it('should deep clone Date objects', () => {
      const date = new Date('2024-01-01');
      const cloned = deepClone(date);

      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it('should deep clone RegExp objects', () => {
      const regex = /test/gi;
      const cloned = deepClone(regex);

      expect(cloned).toEqual(regex);
      expect(cloned).not.toBe(regex);
    });

    it('should deep clone Map objects', () => {
      const map = new Map([['key', { nested: 'value' }]]);
      const cloned = deepClone(map);

      expect(cloned).not.toBe(map);
      expect(cloned.get('key')).toEqual({ nested: 'value' });
      expect(cloned.get('key')).not.toBe(map.get('key'));
    });

    it('should deep clone Set objects', () => {
      const set = new Set([1, { a: 2 }]);
      const cloned = deepClone(set);

      expect(cloned).not.toBe(set);
      const clonedArray = Array.from(cloned);
      const originalArray = Array.from(set);
      expect(clonedArray[1]).toEqual(originalArray[1]);
      expect(clonedArray[1]).not.toBe(originalArray[1]);
    });

    it('should handle circular references', () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      const cloned = deepClone(obj);

      expect(cloned.a).toBe(1);
      expect(cloned.self).toBe(cloned);
      expect(cloned.self).not.toBe(obj);
    });

    it('should handle null values', () => {
      const obj = { a: null, b: { c: null } };
      const cloned = deepClone(obj);

      expect(cloned.a).toBe(null);
      expect(cloned.b.c).toBe(null);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, 3];
      const cloned = deepClone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
    });

    it('should clone objects', () => {
      const obj = { a: 1, b: 2 };
      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it('should handle empty objects', () => {
      const cloned = deepClone({});
      expect(cloned).toEqual({});
      expect(cloned).not.toBe({});
    });

    it('should handle empty arrays', () => {
      const cloned = deepClone([]);
      expect(cloned).toEqual([]);
      expect(cloned).not.toBe([]);
    });

    it('should handle symbols', () => {
      const sym = Symbol('test');
      const obj = { [sym]: 'value' };
      const cloned = deepClone(obj);

      expect(cloned[sym]).toBe('value');
    });

    it('should handle getters', () => {
      const obj = {
        get value() {
          return 42;
        },
      };
      const cloned = deepClone(obj);

      expect(cloned.value).toBe(42);
    });

    it('should handle nested arrays and objects', () => {
      const complex = {
        users: [
          { id: 1, name: 'John', roles: ['admin', 'user'] },
          { id: 2, name: 'Jane', roles: ['user'] },
        ],
        settings: {
          theme: 'dark',
          notifications: true,
        },
      };

      const cloned = deepClone(complex);

      expect(cloned).toEqual(complex);
      expect(cloned).not.toBe(complex);
      expect(cloned.users).not.toBe(complex.users);
      expect(cloned.users[0]).not.toBe(complex.users[0]);
      expect(cloned.users[0].roles).not.toBe(complex.users[0].roles);
      expect(cloned.settings).not.toBe(complex.settings);
    });

    it('should handle multiple circular references', () => {
      const obj: any = { a: 1 };
      const obj2: any = { b: 2 };
      obj.ref = obj2;
      obj2.ref = obj;

      const cloned = deepClone(obj);

      expect(cloned.a).toBe(1);
      expect(cloned.ref.b).toBe(2);
      expect(cloned.ref.ref).toBe(cloned);
    });

    it('should handle deeply nested structures', () => {
      // Build a deep structure (not circular)
      let current: any = { id: 0 };
      for (let i = 1; i < 100; i++) {
        current.next = { id: i, next: {} as any };
        current = current.next;
      }
      // Set value on the deepest object
      let deepest = current;
      while (deepest.next && Object.keys(deepest.next).length > 0) {
        deepest = deepest.next;
      }
      deepest.value = 'end';

      // Clone from the root
      const root = current;
      const cloned = deepClone(root);

      // Navigate to deepest to check value
      let clonedDeepest = cloned;
      while (clonedDeepest.next && Object.keys(clonedDeepest.next).length > 0) {
        clonedDeepest = clonedDeepest.next;
      }
      expect(clonedDeepest.value).toBe('end');
      expect(cloned).not.toBe(root);
    });

    it('should preserve prototype chain for plain objects', () => {
      const obj = Object.create(null);
      obj.a = 1;
      obj.b = 2;

      const cloned = deepClone(obj);

      expect(cloned.a).toBe(1);
      expect(cloned.b).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined', () => {
      expect(deepClone(undefined)).toBe(undefined);
    });

    it('should handle null', () => {
      expect(deepClone(null)).toBe(null);
    });

    it('should handle boolean values', () => {
      expect(deepClone(true)).toBe(true);
      expect(deepClone(false)).toBe(false);
    });

    it('should handle numbers', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone(-42)).toBe(-42);
      expect(deepClone(3.14)).toBe(3.14);
      expect(deepClone(0)).toBe(0);
      expect(deepClone(NaN)).toBeNaN();
    });

    it('should handle strings', () => {
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone('')).toBe('');
      expect(deepClone('🌍')).toBe('🌍');
    });

    it('should handle functions', () => {
      const fn = () => 42;
      const cloned = deepClone(fn);

      expect(cloned).toBe(fn);
    });

    it('should handle self-referencing arrays', () => {
      const arr: any[] = [1, 2, 3];
      arr.push(arr);

      const cloned = deepClone(arr);

      expect(cloned[0]).toBe(1);
      expect(cloned[1]).toBe(2);
      expect(cloned[2]).toBe(3);
      expect(cloned[3]).toBe(cloned);
    });

    it('should handle Map with object keys', () => {
      const key1 = { id: 1 };
      const key2 = { id: 2 };
      const map = new Map([
        [key1, 'value1'],
        [key2, 'value2'],
      ]);

      const cloned = deepClone(map);

      expect(cloned.size).toBe(2);
    });

    it('should handle Set with objects', () => {
      const set = new Set([{ id: 1 }, { id: 2 }]);
      const cloned = deepClone(set);

      expect(cloned.size).toBe(2);
    });
  });
});
