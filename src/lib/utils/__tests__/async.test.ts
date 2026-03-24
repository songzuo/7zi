/**
 * Tests for async utility functions
 */

// @ts-nocheck - Complex utility function testing with generic types

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  debounce,
  throttle,
  memoize,
  sleep,
} from '../async';

describe('async utilities', () => {
  describe('sleep', () => {
    it('should delay execution for specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(95);
      expect(end - start).toBeLessThan(150);
    });

    it('should resolve with void', async () => {
      const result = await sleep(10);
      expect(result).toBeUndefined();
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1');
      debounced('arg2');
      debounced('arg3');

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('arg3');
    });

    it('should cancel pending execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1');
      debounced.cancel();

      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();
    });

    it('should flush pending execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1');
      debounced.flush();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('arg1');
    });

    it('should report pending status correctly', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      expect(debounced.pending()).toBe(false);

      debounced('arg1');

      expect(debounced.pending()).toBe(true);

      vi.advanceTimersByTime(100);

      expect(debounced.pending()).toBe(false);
    });

    it('should call with latest arguments', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'extra1');
      debounced('arg2', 'extra2');

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg2', 'extra2');
    });

    it('should handle multiple debounces independently', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const debounced1 = debounce(fn1, 100);
      const debounced2 = debounce(fn2, 200);

      debounced1('fn1');
      debounced2('fn2');

      vi.advanceTimersByTime(100);

      expect(fn1).toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn2).toHaveBeenCalled();
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('arg1');
      expect(fn).toHaveBeenCalledTimes(1);

      throttled('arg2');
      expect(fn).toHaveBeenCalledTimes(1); // Not called yet

      vi.advanceTimersByTime(100);

      throttled('arg3');
      expect(fn).toHaveBeenCalledTimes(2);

      expect(fn).toHaveBeenNthCalledWith(1, 'arg1');
      expect(fn).toHaveBeenNthCalledWith(2, 'arg3');
    });

    it('should call with first arguments within throttle window', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('arg1');
      throttled('arg2');
      throttled('arg3');

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('arg1');
    });

    it('should call with trailing arguments after wait time', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('arg1');
      vi.advanceTimersByTime(50);
      throttled('arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenNthCalledWith(1, 'arg1');
      expect(fn).toHaveBeenNthCalledWith(2, 'arg2');
    });

    it('should handle multiple throttles independently', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const throttled1 = throttle(fn1, 100);
      const throttled2 = throttle(fn2, 200);

      throttled1('fn1');
      throttled2('fn2');

      throttled1('fn1-again');
      throttled2('fn2-again');

      vi.advanceTimersByTime(100);

      expect(fn1).toHaveBeenCalledTimes(2);
      expect(fn2).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);

      expect(fn2).toHaveBeenCalledTimes(2);
    });
  });

  describe('memoize', () => {
    it('should memoize function results', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple arguments', () => {
      const fn = vi.fn((a: number, b: number) => a + b);
      const memoized = memoize(fn);

      expect(memoized(3, 4)).toBe(7);
      expect(memoized(3, 4)).toBe(7);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cache different arguments separately', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(10)).toBe(20);
      expect(memoized(5)).toBe(10);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should support custom cache key function', () => {
      const fn = vi.fn((obj: { id: number }) => obj.id * 2);
      const memoized = memoize(fn, {
        key: (obj) => obj.id,
      });

      const obj1 = { id: 5 };
      const obj2 = { id: 5 };

      expect(memoized(obj1)).toBe(10);
      expect(memoized(obj2)).toBe(10);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should support custom cache', () => {
      const fn = vi.fn((x: number) => x * 2);
      const cache = new Map();
      const memoized = memoize(fn, { cache });

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);

      expect(cache.size).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should support TTL', () => {
      vi.useFakeTimers();

      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn, { ttl: 1000 });

      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(500);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1); // Still cached

      vi.advanceTimersByTime(600);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(2); // Cache expired

      vi.useRealTimers();
    });

    it('should support max cache size', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn, { maxSize: 3 });

      memoized(1);
      memoized(2);
      memoized(3);
      memoized(4);

      expect(fn).toHaveBeenCalledTimes(4);

      memoized(1);
      expect(fn).toHaveBeenCalledTimes(5); // Evicted
    });

    it('should handle errors', () => {
      const fn = vi.fn(() => {
        throw new Error('Function error');
      });
      const memoized = memoize(fn);

      expect(() => memoized(1)).toThrow('Function error');
      expect(() => memoized(1)).toThrow('Function error');

      expect(fn).toHaveBeenCalledTimes(2); // Errors are not cached by default
    });

    it('should support caching errors when enabled', () => {
      const fn = vi.fn(() => {
        throw new Error('Function error');
      });
      const memoized = memoize(fn, { cacheErrors: true });

      expect(() => memoized(1)).toThrow('Function error');
      expect(() => memoized(1)).toThrow('Function error');

      expect(fn).toHaveBeenCalledTimes(1); // Error is cached
    });

    it('should clear cache', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);

      memoized.clear();

      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should get cache size', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized.size).toBe(0);

      memoized(1);
      memoized(2);
      memoized(3);

      expect(memoized.size).toBe(3);
    });

    it('should check if value is cached', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized.has(5)).toBe(false);

      memoized(5);

      expect(memoized.has(5)).toBe(true);
    });

    it('should delete cached value', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      memoized(5);
      expect(memoized.has(5)).toBe(true);

      memoized.delete(5);
      expect(memoized.has(5)).toBe(false);

      memoized(5);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle async functions', async () => {
      const fn = vi.fn(async (x: number) => {
        await sleep(10);
        return x * 2;
      });
      const memoized = memoize(fn);

      const result1 = await memoized(5);
      const result2 = await memoized(5);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle functions with this context', function () {
      const obj = {
        multiplier: 3,
        multiply: function (x: number) {
          return x * this.multiplier;
        },
      };

      const memoized = memoize(obj.multiply.bind(obj));

      expect(memoized(5)).toBe(15);
      expect(memoized(5)).toBe(15);
    });
  });

  describe('integration tests', () => {
    it('should work with debounce and memoize together', () => {
      vi.useFakeTimers();

      const fn = vi.fn((x: string) => x.toUpperCase());
      const memoized = memoize(fn);
      const debounced = debounce(memoized, 100);

      debounced('hello');
      debounced('world');

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('world');

      vi.useRealTimers();
    });

    it('should work with throttle and memoize together', () => {
      vi.useFakeTimers();

      const fn = vi.fn((x: string) => x.toUpperCase());
      const memoized = memoize(fn);
      const throttled = throttle(memoized, 100);

      throttled('hello');
      expect(fn).toHaveBeenCalledTimes(1);

      throttled('hello');
      expect(fn).toHaveBeenCalledTimes(1); // Memoized

      vi.advanceTimersByTime(100);

      throttled('world');
      expect(fn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should handle rapid successive calls with debounce', () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      for (let i = 0; i < 100; i++) {
        debounced(i);
      }

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(99);

      vi.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined arguments', () => {
      const fn = vi.fn((x?: number) => x ?? 0);
      const memoized = memoize(fn);

      expect(memoized(undefined)).toBe(0);
      expect(memoized(undefined)).toBe(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle null arguments', () => {
      const fn = vi.fn((x: any) => x);
      const memoized = memoize(fn);

      expect(memoized(null)).toBe(null);
      expect(memoized(null)).toBe(null);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle function arguments', () => {
      const fn = vi.fn((func: () => string) => func());
      const memoized = memoize(fn);

      const func = () => 'hello';

      expect(memoized(func)).toBe('hello');
      expect(memoized(func)).toBe('hello');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle zero wait time for debounce', () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const debounced = debounce(fn, 0);

      debounced('arg');

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(0);

      expect(fn).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should handle zero wait time for throttle', () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const throttled = throttle(fn, 0);

      throttled('arg1');
      expect(fn).toHaveBeenCalledTimes(1);

      throttled('arg2');
      expect(fn).toHaveBeenCalledTimes(2); // No throttling with 0ms

      vi.useRealTimers();
    });
  });
});
