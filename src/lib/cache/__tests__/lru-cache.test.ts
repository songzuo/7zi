/**
// @ts-ignore - Mock type compatibility issues
 * LRU Cache Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LRUCache, createCache } from '../lru-cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3);
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should update existing keys', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should delete specific keys', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeNull();
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.size).toBe(0);
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire values after TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get('key1')).toBe('value1');
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
    });

    it('should not expire values before TTL', async () => {
      cache.set('key1', 'value1', 1000); // 1s TTL
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(cache.get('key1')).toBe('value1');
    });

    it('should use default TTL when not specified', async () => {
      const longCache = new LRUCache<string>(10);
      longCache.set('key1', 'value1'); // Uses 5 min default
      expect(longCache.get('key1')).toBe('value1');
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entry when full', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update LRU on access', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.get('key1'); // Access key1 to make it recently used
      cache.set('key4', 'value4'); // Should evict key2
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should not evict when updating existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key1', 'value1-updated'); // Update existing
      expect(cache.get('key1')).toBe('value1-updated');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.size).toBe(3);
    });
  });

  describe('Size Management', () => {
    it('should return correct size', () => {
      expect(cache.size).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
      cache.delete('key1');
      expect(cache.size).toBe(1);
    });

    it('should handle size limit correctly', () => {
      const smallCache = new LRUCache<string>(2);
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      expect(smallCache.size).toBe(2);
      smallCache.set('key3', 'value3');
      expect(smallCache.size).toBe(2);
    });

    it('should use default maxSize', () => {
      const defaultCache = new LRUCache<string>();
      expect(defaultCache.size).toBe(0);
      // Add 101 items to verify default maxSize of 100
      for (let i = 0; i < 101; i++) {
        defaultCache.set(`key${i}`, `value${i}`);
      }
      expect(defaultCache.size).toBe(100);
    });
  });

  describe('Type Safety', () => {
    it('should work with different types', () => {
      const numberCache = new LRUCache<number>(3);
      numberCache.set('num1', 42);
      expect(numberCache.get('num1')).toBe(42);

      const objectCache = new LRUCache<{ id: number; name: string }>(3);
      objectCache.set('obj1', { id: 1, name: 'test' });
      expect(objectCache.get('obj1')).toEqual({ id: 1, name: 'test' });

      const arrayCache = new LRUCache<number[]>(3);
      arrayCache.set('arr1', [1, 2, 3]);
      expect(arrayCache.get('arr1')).toEqual([1, 2, 3]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string keys', () => {
      cache.set('', 'value');
      expect(cache.get('')).toBe('value');
    });

    it('should handle null and undefined values', () => {
      cache.set('null', null);
      expect(cache.get('null')).toBeNull();

      const unknownCache = new LRUCache<unknown>(3);
      unknownCache.set('undefined', undefined);
      expect(unknownCache.get('undefined')).toBeUndefined();
    });

    it('should handle very short TTL', async () => {
      cache.set('key1', 'value1', 1); // 1ms TTL
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(cache.get('key1')).toBeNull();
    });
  });
});

describe('createCache', () => {
  it('should create a cache instance', () => {
    const cache = createCache<string>(60000);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should use specified TTL', async () => {
    const cache = createCache<string>(100);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('key1')).toBeNull();
  });

  it('should support delete operation', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    cache.delete('key1');
    expect(cache.get('key1')).toBeNull();
  });

  it('should support has operation', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should support clear operation', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('should return correct size', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.size).toBe(2);
  });

  it('should share global cache across instances', () => {
    const cache1 = createCache<string>();
    const cache2 = createCache<string>();
    
    cache1.set('key1', 'value1');
    expect(cache2.get('key1')).toBe('value1');
  });

  it('should use default TTL when not specified', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });
});
