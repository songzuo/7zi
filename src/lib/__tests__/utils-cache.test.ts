/**
 * Cache Utility Tests
 * Tests for utils/cache.ts - caching utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LRUCache, createCache } from '../utils/cache';

describe('Cache Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('LRUCache', () => {
    it('should create a basic LRU cache', () => {
      const cache = new LRUCache<string>(100);

      expect(cache).toBeInstanceOf(LRUCache);
      expect(cache.size).toBe(0);
    });

    it('should set and get values', () => {
      const cache = new LRUCache<string>(100);

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.size).toBe(1);
    });

    it('should return null for non-existent keys', () => {
      const cache = new LRUCache<string>(100);

      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should check if key exists', () => {
      const cache = new LRUCache<string>(100);

      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete keys', () => {
      const cache = new LRUCache<string>(100);

      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBeNull();
    });

    it('should clear all keys', () => {
      const cache = new LRUCache<string>(100);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });

    it('should return cache size', () => {
      const cache = new LRUCache<string>(100);

      expect(cache.size).toBe(0);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);

      cache.delete('key1');
      expect(cache.size).toBe(1);
    });

    it('should evict least recently used item when at capacity', () => {
      const cache = new LRUCache<string>(3);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      expect(cache.size).toBe(3);

      // Access key1 to make it most recently used
      cache.get('key1');

      // Add key4, should evict key2 (least recently used)
      cache.set('key4', 'value4');
      expect(cache.size).toBe(3);
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should update access order on get', () => {
      const cache = new LRUCache<string>(3);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1
      cache.get('key1');

      // Add key4, key2 should be evicted
      cache.set('key4', 'value4');
      expect(cache.has('key2')).toBe(false);
    });

    it('should update access order on set for existing key', () => {
      const cache = new LRUCache<string>(3);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Update key1
      cache.set('key1', 'new-value1');

      // Add key4, key2 should be evicted
      cache.set('key4', 'value4');
      expect(cache.has('key2')).toBe(false);
      expect(cache.get('key1')).toBe('new-value1');
    });

    it('should handle maxSize of 0', () => {
      const cache = new LRUCache<string>(0);

      cache.set('key1', 'value1');
      expect(cache.size).toBe(0);
      expect(cache.has('key1')).toBe(false);
    });

    it('should handle maxSize of 1', () => {
      const cache = new LRUCache<string>(1);

      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size).toBe(1);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });

    it('should handle complex objects', () => {
      const cache = new LRUCache<{ id: number; name: string }>(10);

      const obj1 = { id: 1, name: 'Test' };
      cache.set('obj1', obj1);

      const retrieved = cache.get('obj1');
      expect(retrieved).toEqual(obj1);
    });

    it('should expire items after TTL', () => {
      const cache = new LRUCache<string>(100);

      cache.set('key1', 'value1', 1000); // 1 second
      expect(cache.has('key1')).toBe(true);

      vi.advanceTimersByTime(1500); // Advance 1.5 seconds
      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBeNull();
    });

    it('should not expire non-expired items', () => {
      const cache = new LRUCache<string>(100);

      cache.set('key1', 'value1', 1000); // 1 second

      vi.advanceTimersByTime(500); // Advance 0.5 seconds
      expect(cache.has('key1')).toBe(true);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should handle different TTL per key', () => {
      const cache = new LRUCache<string>(100);

      cache.set('key1', 'value1', 500); // 0.5 seconds
      cache.set('key2', 'value2', 2000); // 2 seconds

      vi.advanceTimersByTime(750);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });

    it('should use default TTL when not specified', () => {
      const cache = new LRUCache<string>(100);

      cache.set('key1', 'value1'); // Uses default 5 minute TTL

      // Should still be valid after 1 second
      vi.advanceTimersByTime(1000);
      expect(cache.has('key1')).toBe(true);
    });

    it('should clean up expired items when accessed', () => {
      const cache = new LRUCache<string>(100);

      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 1000);

      vi.advanceTimersByTime(1500);
      expect(cache.size).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });

    it('should handle TTL of 0', () => {
      const cache = new LRUCache<string>(100);

      cache.set('key1', 'value1', 0);

      // Should expire immediately
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('createCache', () => {
    it('should create a cache interface', () => {
      const cache = createCache<string>(60000);

      expect(cache).toHaveProperty('set');
      expect(cache).toHaveProperty('get');
      expect(cache).toHaveProperty('delete');
      expect(cache).toHaveProperty('has');
      expect(cache).toHaveProperty('clear');
      expect(cache).toHaveProperty('size');
    });

    it('should share global cache instance across multiple createCache calls', () => {
      const cache1 = createCache<string>(1000);
      const cache2 = createCache<number>(2000);

      cache1.set('key', 'value');
      cache2.set('number', 42);

      // Both should access the same underlying cache
      expect(cache1.has('key')).toBe(true);
      expect(cache1.has('number')).toBe(true);
      expect(cache2.has('key')).toBe(true);
      expect(cache2.has('number')).toBe(true);
    });

    it('should use default TTL when not specified', () => {
      const cache = createCache<string>();

      expect(cache).toHaveProperty('set');
      expect(cache).toHaveProperty('get');
    });

    it('should set and get values', () => {
      const cache = createCache<string>(60000);

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should check if key exists', () => {
      const cache = createCache<string>(60000);

      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete keys', () => {
      const cache = createCache<string>(60000);

      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all keys', () => {
      const cache = createCache<string>(60000);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();

      expect(cache.size).toBe(0);
    });

    it('should expire items after TTL', () => {
      const cache = createCache<string>(1000);

      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);

      vi.advanceTimersByTime(1500);
      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string keys', () => {
      const cache = new LRUCache<string>(10);

      cache.set('', 'empty-key-value');
      expect(cache.get('')).toBe('empty-key-value');
    });

    it('should handle special characters in keys', () => {
      const cache = new LRUCache<string>(10);

      const specialKeys = ['key:with:colons', 'key/with/slashes', 'key with spaces', 'key-with-dashes'];
      specialKeys.forEach(key => {
        cache.set(key, `value-for-${key}`);
      });

      specialKeys.forEach(key => {
        expect(cache.get(key)).toBe(`value-for-${key}`);
      });
    });

    it('should handle very large values', () => {
      const cache = new LRUCache<string>(10);

      const largeValue = 'x'.repeat(1000000);
      cache.set('large', largeValue);

      expect(cache.get('large')).toBe(largeValue);
    });

    it('should handle null and undefined values', () => {
      const cache = new LRUCache<string | null | undefined>(10);

      cache.set('null-key', null);
      cache.set('undefined-key', undefined);

      expect(cache.get('null-key')).toBeNull();
      expect(cache.get('undefined-key')).toBeNull(); // Both are stored and retrieved as null
    });
  });
});
