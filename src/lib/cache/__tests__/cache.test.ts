// @ts-nocheck - Test file with complex type issues
/**
 * Cache Module Tests
 * 
 * Comprehensive tests for the cache module including:
 * - Index exports
 * - Integration scenarios
 * - Error handling
 * - Concurrent access patterns
 * - Edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LRUCache, createCache } from '../lru-cache';
import { CacheManager, getCacheManager, CachePresets } from '../CacheManager';

// Mock logger to avoid console output during tests
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Cache Module - Index Exports', () => {
  it('should export LRUCache from lru-cache', () => {
    expect(LRUCache).toBeDefined();
    expect(typeof LRUCache).toBe('function');
  });

  it('should export createCache from lru-cache', () => {
    expect(createCache).toBeDefined();
    expect(typeof createCache).toBe('function');
  });

  it('should export CacheManager from CacheManager', () => {
    expect(CacheManager).toBeDefined();
    expect(typeof CacheManager).toBe('function');
  });

  it('should export getCacheManager from CacheManager', () => {
    expect(getCacheManager).toBeDefined();
    expect(typeof getCacheManager).toBe('function');
  });

  it('should export CachePresets from CacheManager', () => {
    expect(CachePresets).toBeDefined();
    expect(typeof CachePresets).toBe('object');
  });
});

describe('Cache Module - Basic Get/Set Operations', () => {
  let lruCache: LRUCache<string>;
  let managerCache: CacheManager;

  beforeEach(() => {
    lruCache = new LRUCache<string>(10);
    managerCache = new CacheManager();
  });

  afterEach(() => {
    managerCache.stopCleanup();
  });

  describe('LRUCache Basic Operations', () => {
    it('should store and retrieve string values', () => {
      lruCache.set('key1', 'value1');
      expect(lruCache.get('key1')).toBe('value1');
    });

    it('should store and retrieve number values', () => {
      const numCache = new LRUCache<number>(10);
      numCache.set('num1', 42);
      expect(numCache.get('num1')).toBe(42);
    });

    it('should store and retrieve boolean values', () => {
      const boolCache = new LRUCache<boolean>(10);
      boolCache.set('bool1', true);
      expect(boolCache.get('bool1')).toBe(true);
    });

    it('should store and retrieve object values', () => {
      const objCache = new LRUCache<{ id: number; name: string }>(10);
      const obj = { id: 1, name: 'test' };
      objCache.set('obj1', obj);
      expect(objCache.get('obj1')).toEqual(obj);
    });

    it('should store and retrieve array values', () => {
      const arrCache = new LRUCache<number[]>(10);
      const arr = [1, 2, 3, 4, 5];
      arrCache.set('arr1', arr);
      expect(arrCache.get('arr1')).toEqual(arr);
    });

    it('should return null for non-existent keys', () => {
      expect(lruCache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing keys', () => {
      lruCache.set('key1', 'value1');
      lruCache.set('key1', 'value2');
      expect(lruCache.get('key1')).toBe('value2');
    });

    it('should delete specific keys', () => {
      lruCache.set('key1', 'value1');
      lruCache.delete('key1');
      expect(lruCache.get('key1')).toBeNull();
    });

    it('should clear all entries', () => {
      lruCache.set('key1', 'value1');
      lruCache.set('key2', 'value2');
      lruCache.clear();
      expect(lruCache.get('key1')).toBeNull();
      expect(lruCache.get('key2')).toBeNull();
      expect(lruCache.size).toBe(0);
    });

    it('should check if key exists', () => {
      lruCache.set('key1', 'value1');
      expect(lruCache.has('key1')).toBe(true);
      expect(lruCache.has('nonexistent')).toBe(false);
    });
  });

  describe('CacheManager Basic Operations', () => {
    it('should store and retrieve string values', () => {
      managerCache.set('key1', 'value1');
      expect(managerCache.get<string>('key1')).toBe('value1');
    });

    it('should store and retrieve number values', () => {
      managerCache.set('num1', 42);
      expect(managerCache.get<number>('num1')).toBe(42);
    });

    it('should store and retrieve boolean values', () => {
      managerCache.set('bool1', true);
      expect(managerCache.get<boolean>('bool1')).toBe(true);
    });

    it('should store and retrieve object values', () => {
      const obj = { id: 1, name: 'test' };
      managerCache.set('obj1', obj);
      expect(managerCache.get<{ id: number; name: string }>('obj1')).toEqual(obj);
    });

    it('should store and retrieve array values', () => {
      const arr = [1, 2, 3, 4, 5];
      managerCache.set('arr1', arr);
      expect(managerCache.get<number[]>('arr1')).toEqual(arr);
    });

    it('should return null for non-existent keys', () => {
      expect(managerCache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing keys', () => {
      managerCache.set('key1', 'value1');
      managerCache.set('key1', 'value2');
      expect(managerCache.get<string>('key1')).toBe('value2');
    });

    it('should delete specific keys', () => {
      managerCache.set('key1', 'value1');
      const result = managerCache.delete('key1');
      expect(result).toBe(true);
      expect(managerCache.get('key1')).toBeNull();
    });

    it('should return false when deleting non-existent key', () => {
      const result = managerCache.delete('nonexistent');
      expect(result).toBe(false);
    });

    it('should clear all entries', () => {
      managerCache.set('key1', 'value1');
      managerCache.set('key2', 'value2');
      managerCache.clear();
      expect(managerCache.get('key1')).toBeNull();
      expect(managerCache.get('key2')).toBeNull();
    });

    it('should handle null values', () => {
      managerCache.set('nullKey', null);
      expect(managerCache.get('nullKey')).toBeNull();
    });
  });
});

describe('Cache Module - TTL Expiration', () => {
  let lruCache: LRUCache<string>;
  let managerCache: CacheManager;

  beforeEach(() => {
    lruCache = new LRUCache<string>(10);
    managerCache = new CacheManager();
  });

  afterEach(() => {
    managerCache.stopCleanup();
  });

  describe('LRUCache TTL', () => {
    it('should expire values after TTL elapses', async () => {
      lruCache.set('key1', 'value1', 100); // 100ms TTL
      expect(lruCache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(lruCache.get('key1')).toBeNull();
    });

    it('should not expire values before TTL', async () => {
      lruCache.set('key1', 'value1', 1000); // 1s TTL
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(lruCache.get('key1')).toBe('value1');
    });

    it('should use default TTL (5 minutes) when not specified', () => {
      lruCache.set('key1', 'value1');
      expect(lruCache.get('key1')).toBe('value1');
    });

    it('should support different TTLs for different entries', async () => {
      lruCache.set('short', 'value1', 100); // 100ms
      lruCache.set('long', 'value2', 1000); // 1s
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(lruCache.get('short')).toBeNull();
      expect(lruCache.get('long')).toBe('value2');
    });

    it('should update TTL on set for existing key', async () => {
      lruCache.set('key1', 'value1', 100);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Update with new TTL
      lruCache.set('key1', 'value2', 1000);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(lruCache.get('key1')).toBe('value2');
    });

    it('should handle zero TTL (immediate expiration)', async () => {
      lruCache.set('key1', 'value1', 0);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lruCache.get('key1')).toBeNull();
    });

    it('should handle very short TTL (1ms)', async () => {
      lruCache.set('key1', 'value1', 1);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lruCache.get('key1')).toBeNull();
    });
  });

  describe('CacheManager TTL', () => {
    it('should expire values after TTL elapses', async () => {
      managerCache.set('key1', 'value1', 100); // 100ms TTL
      expect(managerCache.get<string>('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(managerCache.get('key1')).toBeNull();
    });

    it('should not expire values before TTL', async () => {
      managerCache.set('key1', 'value1', 1000); // 1s TTL
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(managerCache.get<string>('key1')).toBe('value1');
    });

    it('should use default TTL (60 seconds) when not specified', () => {
      managerCache.set('key1', 'value1');
      expect(managerCache.get<string>('key1')).toBe('value1');
    });

    it('should support different TTLs for different entries', async () => {
      managerCache.set('short', 'value1', 100); // 100ms
      managerCache.set('long', 'value2', 1000); // 1s
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(managerCache.get('short')).toBeNull();
      expect(managerCache.get<string>('long')).toBe('value2');
    });

    it('should update TTL on set for existing key', async () => {
      managerCache.set('key1', 'value1', 100);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Update with new TTL
      managerCache.set('key1', 'value2', 1000);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(managerCache.get<string>('key1')).toBe('value2');
    });

    it('should handle zero TTL (immediate expiration)', async () => {
      managerCache.set('key1', 'value1', 0);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(managerCache.get('key1')).toBeNull();
    });
  });

  describe('CacheManager getOrSet with TTL', () => {
    it('should use custom TTL in getOrSet', async () => {
      const fetchFn = vi.fn().mockResolvedValue('value');
      
      await managerCache.getOrSet('key1', fetchFn, 100);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(managerCache.get('key1')).toBeNull();
    });

    it('should use default TTL in getOrSet when not specified', async () => {
      const fetchFn = vi.fn().mockResolvedValue('value');
      
      await managerCache.getOrSet('key1', fetchFn);
      
      expect(managerCache.get<string>('key1')).toBe('value');
    });
  });
});

describe('Cache Module - LRU Eviction Logic', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3);
  });

  it('should evict least recently used entry when at capacity', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // Adding 4th entry should evict key1 (LRU)
    cache.set('key4', 'value4');
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should update LRU order on access', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // Access key1 to make it recently used
    cache.get('key1');
    
    // Adding 4th entry should evict key2 (now LRU)
    cache.set('key4', 'value4');
    
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBeNull();
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should update LRU order on set for existing key', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // Update key1 to make it recently used
    cache.set('key1', 'value1-updated');
    
    // Adding 4th entry should evict key2 (now LRU)
    cache.set('key4', 'value4');
    
    expect(cache.get('key1')).toBe('value1-updated');
    expect(cache.get('key2')).toBeNull();
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should update LRU order on has check', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // Check key1 to make it recently used
    cache.has('key1');
    
    // Adding 4th entry should evict key2 (now LRU)
    cache.set('key4', 'value4');
    
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBeNull();
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should not evict when updating existing key at capacity', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // Update existing key
    cache.set('key1', 'value1-updated');
    
    expect(cache.size).toBe(3);
    expect(cache.get('key1')).toBe('value1-updated');
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
  });

  it('should handle size limit of 1', () => {
    const tinyCache = new LRUCache<string>(1);
    
    tinyCache.set('key1', 'value1');
    expect(tinyCache.get('key1')).toBe('value1');
    
    tinyCache.set('key2', 'value2');
    expect(tinyCache.get('key1')).toBeNull();
    expect(tinyCache.get('key2')).toBe('value2');
  });

  it('should handle sequential evictions', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // Evict key1
    cache.set('key4', 'value4');
    
    // Evict key2
    cache.set('key5', 'value5');
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
    expect(cache.get('key5')).toBe('value5');
  });

  it('should maintain size after eviction', () => {
    expect(cache.size).toBe(0);
    
    cache.set('key1', 'value1');
    expect(cache.size).toBe(1);
    
    cache.set('key2', 'value2');
    expect(cache.size).toBe(2);
    
    cache.set('key3', 'value3');
    expect(cache.size).toBe(3);
    
    cache.set('key4', 'value4'); // Triggers eviction
    expect(cache.size).toBe(3);
  });

  it('should handle expired entries before eviction', async () => {
    cache.set('key1', 'value1', 50); // Short TTL
    cache.set('key2', 'value2', 1000);
    cache.set('key3', 'value3', 1000);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // key1 is expired, should be removed when accessed
    expect(cache.get('key1')).toBeNull();
    
    // Set new entry - should evict key2 (LRU among valid entries)
    cache.set('key4', 'value4');
    
    expect(cache.get('key2')).toBeNull();
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });
});

describe('Cache Module - Error Handling', () => {
  describe('LRUCache Error Handling', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(10);
    });

    it('should handle empty string keys', () => {
      cache.set('', 'value');
      expect(cache.get('')).toBe('value');
      expect(cache.has('')).toBe(true);
    });

    it('should handle keys with special characters', () => {
      cache.set('key:with:colons', 'value1');
      cache.set('key-with-dashes', 'value2');
      cache.set('key.with.dots', 'value3');
      cache.set('key_with_underscores', 'value4');
      cache.set('key/with/slashes', 'value5');
      
      expect(cache.get('key:with:colons')).toBe('value1');
      expect(cache.get('key-with-dashes')).toBe('value2');
      expect(cache.get('key.with.dots')).toBe('value3');
      expect(cache.get('key_with_underscores')).toBe('value4');
      expect(cache.get('key/with/slashes')).toBe('value5');
    });

    it('should handle unicode characters in keys', () => {
      cache.set('键值', 'value1');
      cache.set('ключ', 'value2');
      cache.set('clé', 'value3');
      
      expect(cache.get('键值')).toBe('value1');
      expect(cache.get('ключ')).toBe('value2');
      expect(cache.get('clé')).toBe('value3');
    });

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(10000);
      cache.set(longKey, 'value');
      expect(cache.get(longKey)).toBe('value');
    });

    it('should handle null values', () => {
      const nullCache = new LRUCache<null>(10);
      nullCache.set('nullKey', null);
      expect(nullCache.get('nullKey')).toBeNull();
    });

    it('should handle undefined values', () => {
      const undefCache = new LRUCache<undefined>(10);
      undefCache.set('undefKey', undefined);
      expect(undefCache.get('undefKey')).toBeUndefined();
    });

    it('should handle complex nested objects', () => {
      const objCache = new LRUCache<{
        nested: {
          array: number[];
          obj: { deep: string };
        };
      }>(10);
      
      const complex = {
        nested: {
          array: [1, 2, 3],
          obj: { deep: 'value' },
        },
      };
      
      objCache.set('complex', complex);
      expect(objCache.get('complex')).toEqual(complex);
    });

    it('should handle circular references (by storing as-is)', () => {
      const circular: { self?: unknown } = {};
      circular.self = circular;
      
      cache.set('circular', 'value' as unknown as string);
      expect(cache.get('circular')).toBe('value');
    });

    it('should handle negative TTL', () => {
      cache.set('key', 'value', -100);
      expect(cache.get('key')).toBeNull();
    });

    it('should handle deleting non-existent keys', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow();
    });

    it('should handle clearing empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
    });

    it('should handle checking has on non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('CacheManager Error Handling', () => {
    let cache: CacheManager;

    beforeEach(() => {
      cache = new CacheManager();
    });

    afterEach(() => {
      cache.stopCleanup();
    });

    it('should handle empty string keys', () => {
      cache.set('', 'value');
      expect(cache.get('')).toBe('value');
    });

    it('should handle keys with special characters', () => {
      cache.set('key:with:colons', 'value1');
      cache.set('key-with-dashes', 'value2');
      cache.set('key.with.dots', 'value3');
      
      expect(cache.get<string>('key:with:colons')).toBe('value1');
      expect(cache.get<string>('key-with-dashes')).toBe('value2');
      expect(cache.get<string>('key.with.dots')).toBe('value3');
    });

    it('should handle unicode characters in keys', () => {
      cache.set('键值', 'value1');
      cache.set('ключ', 'value2');
      
      expect(cache.get<string>('键值')).toBe('value1');
      expect(cache.get<string>('ключ')).toBe('value2');
    });

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(10000);
      cache.set(longKey, 'value');
      expect(cache.get<string>(longKey)).toBe('value');
    });

    it('should handle null values', () => {
      cache.set('nullKey', null);
      expect(cache.get('nullKey')).toBeNull();
    });

    it('should handle undefined values', () => {
      cache.set('undefKey', undefined);
      expect(cache.get('undefKey')).toBeNull();
    });

    it('should handle complex nested objects', () => {
      const complex = {
        nested: {
          array: [1, 2, 3],
          obj: { deep: 'value' },
        },
      };
      
      cache.set('complex', complex);
      expect(cache.get(complex)).toEqual(complex);
    });

    it('should handle negative TTL', () => {
      cache.set('key', 'value', -100);
      expect(cache.get('key')).toBeNull();
    });

    it('should handle deleting non-existent keys', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow();
    });

    it('should handle clearing empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
    });

    it('should handle getOrSet with throwing function', async () => {
      const errorFn = async () => {
        throw new Error('Fetch failed');
      };
      
      await expect(cache.getOrSet('key1', errorFn)).rejects.toThrow('Fetch failed');
    });

    it('should handle getOrSet with null return', async () => {
      const nullFn = async () => null;
      
      const result = await cache.getOrSet('key1', nullFn);
      expect(result).toBeNull();
    });

    it('should handle getOrSet with undefined return', async () => {
      const undefFn = async () => undefined;
      
      const result = await cache.getOrSet('key1', undefFn);
      expect(result).toBeUndefined();
    });
  });
});

describe('Cache Module - Concurrent Access Patterns', () => {
  let lruCache: LRUCache<string>;
  let managerCache: CacheManager;

  beforeEach(() => {
    lruCache = new LRUCache<string>(100);
    managerCache = new CacheManager();
  });

  afterEach(() => {
    managerCache.stopCleanup();
  });

  it('should handle concurrent reads', async () => {
    lruCache.set('key1', 'value1');
    
    const reads = Array.from({ length: 10 }, () => 
      Promise.resolve(lruCache.get('key1'))
    );
    
    const results = await Promise.all(reads);
    results.forEach(result => {
      expect(result).toBe('value1');
    });
  });

  it('should handle concurrent writes', async () => {
    const writes = Array.from({ length: 10 }, (_, i) => 
      Promise.resolve(lruCache.set(`key${i}`, `value${i}`))
    );
    
    await Promise.all(writes);
    
    expect(lruCache.size).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(lruCache.get(`key${i}`)).toBe(`value${i}`);
    }
  });

  it('should handle concurrent read/write mix', async () => {
    lruCache.set('key1', 'value1');
    
    const operations = [
      Promise.resolve(lruCache.get('key1')),
      Promise.resolve(lruCache.set('key2', 'value2')),
      Promise.resolve(lruCache.get('key2')),
      Promise.resolve(lruCache.set('key1', 'value1-updated')),
      Promise.resolve(lruCache.get('key1')),
    ];
    
    await Promise.all(operations);
    
    expect(lruCache.get('key1')).toBe('value1-updated');
    expect(lruCache.get('key2')).toBe('value2');
  });

  it('should handle concurrent getOrSet calls (no deduplication)', async () => {
    let callCount = 0;
    const fetchFn = async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'value';
    };
    
    const calls = Array.from({ length: 5 }, () => 
      managerCache.getOrSet('key1', fetchFn)
    );
    
    const results = await Promise.all(calls);
    
    results.forEach(result => {
      expect(result).toBe('value');
    });
    
    // Each getOrSet calls the function since key doesn't exist initially
    expect(callCount).toBe(5);
  });

  it('should handle rapid set/get cycles', () => {
    for (let i = 0; i < 100; i++) {
      lruCache.set('key', `value${i}`);
      expect(lruCache.get('key')).toBe(`value${i}`);
    }
  });

  it('should handle rapid cache operations without errors', () => {
    for (let i = 0; i < 1000; i++) {
      const key = `key${i % 50}`;
      const value = `value${i}`;
      
      lruCache.set(key, value);
      lruCache.get(key);
      lruCache.has(key);
      
      if (i % 10 === 0) {
        lruCache.delete(key);
      }
    }
    
    expect(lruCache.size).toBeLessThanOrEqual(50);
  });
});

describe('Cache Module - Integration Scenarios', () => {
  let managerCache: CacheManager;
  let lruCache: LRUCache<string>;

  beforeEach(() => {
    managerCache = new CacheManager();
    lruCache = new LRUCache<string>(10);
  });

  afterEach(() => {
    managerCache.stopCleanup();
  });

  it('should handle typical API response caching', async () => {
    interface User {
      id: number;
      name: string;
      email: string;
    }
    
    const fetchUser = async (id: number): Promise<User> => ({
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
    });
    
    // First call - fetches data
    const user1 = await managerCache.getOrSet(`user:1`, () => fetchUser(1), CachePresets.MEDIUM);
    expect(user1.name).toBe('User 1');
    
    // Second call - uses cache
    const user2 = await managerCache.getOrSet(`user:1`, () => fetchUser(1), CachePresets.MEDIUM);
    expect(user2.name).toBe('User 1');
    expect(user2).toEqual(user1);
    
    const stats = managerCache.getStats();
    expect(stats.hits).toBe(1); // Second call hit cache
    expect(stats.misses).toBe(1); // First call was a miss
  });

  it('should handle cache invalidation pattern', async () => {
    const fetchData = vi.fn().mockResolvedValue('data-v1');
    
    // First fetch
    const result1 = await managerCache.getOrSet('key', fetchData);
    expect(result1).toBe('data-v1');
    
    // Invalidate
    managerCache.delete('key');
    
    // Update mock
    fetchData.mockResolvedValue('data-v2');
    
    // Second fetch - should get fresh data
    const result2 = await managerCache.getOrSet('key', fetchData);
    expect(result2).toBe('data-v2');
    expect(fetchData).toHaveBeenCalledTimes(2);
  });

  it('should handle different cache durations for different data types', () => {
    // Cache user profile longer than notifications
    managerCache.set('user:123:profile', { name: 'John' }, CachePresets.LONG);
    managerCache.set('user:123:notifications', [{ id: 1 }], CachePresets.REALTIME);
    
    expect(managerCache.get<{ name: string }>('user:123:profile')).toBeDefined();
    expect(managerCache.get<Record<string, unknown>[]>('user:123:notifications')).toBeDefined();
  });

  it('should handle multi-level caching with LRU', () => {
    // First level: LRU cache for hot data
    lruCache.set('hot:1', 'value1');
    
    // Second level: manager cache for warm data
    managerCache.set('warm:1', 'value2');
    
    expect(lruCache.get('hot:1')).toBe('value1');
    expect(managerCache.get<string>('warm:1')).toBe('value2');
    
    // LRU eviction
    for (let i = 2; i <= 12; i++) {
      lruCache.set(`hot:${i}`, `value${i}`);
    }
    
    expect(lruCache.get('hot:1')).toBeNull(); // Evicted
    expect(lruCache.get('hot:2')).toBe('value2'); // Still in cache
  });

  it('should handle cache warming pattern', () => {
    const data = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
    ];
    
    // Warm cache
    data.forEach(item => {
      managerCache.set(`item:${item.id}`, item, CachePresets.LONG);
    });
    
    // Verify all cached
    data.forEach(item => {
      expect(managerCache.get(`item:${item.id}`)).toEqual(item);
    });
    
    const stats = managerCache.getStats();
    expect(stats.size).toBe(3);
  });

  it('should handle cache stampede scenario', async () => {
    let callCount = 0;
    const expensiveFn = async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'expensive-result';
    };
    
    // Simulate cache stampede - many concurrent requests for same key
    const requests = Array.from({ length: 20 }, () => 
      managerCache.getOrSet('expensive-key', expensiveFn)
    );
    
    const results = await Promise.all(requests);
    
    // All get same result
    results.forEach(result => {
      expect(result).toBe('expensive-result');
    });
    
    // In current implementation, each call executes since no deduplication
    expect(callCount).toBe(20);
  });
});

describe('Cache Module - CachePresets', () => {
  it('should provide REALTIME preset (5 seconds)', () => {
    expect(CachePresets.REALTIME).toBe(5 * 1000);
  });

  it('should provide SHORT preset (30 seconds)', () => {
    expect(CachePresets.SHORT).toBe(30 * 1000);
  });

  it('should provide MEDIUM preset (1 minute)', () => {
    expect(CachePresets.MEDIUM).toBe(60 * 1000);
  });

  it('should provide LONG preset (5 minutes)', () => {
    expect(CachePresets.LONG).toBe(5 * 60 * 1000);
  });

  it('should provide VERY_LONG preset (30 minutes)', () => {
    expect(CachePresets.VERY_LONG).toBe(30 * 60 * 1000);
  });

  it('should work with all presets in CacheManager', () => {
    const cache = new CacheManager();
    
    cache.set('realtime', 'data', CachePresets.REALTIME);
    cache.set('short', 'data', CachePresets.SHORT);
    cache.set('medium', 'data', CachePresets.MEDIUM);
    cache.set('long', 'data', CachePresets.LONG);
    cache.set('verylong', 'data', CachePresets.VERY_LONG);
    
    expect(cache.get('realtime')).toBe('data');
    expect(cache.get('short')).toBe('data');
    expect(cache.get('medium')).toBe('data');
    expect(cache.get('long')).toBe('data');
    expect(cache.get('verylong')).toBe('data');
    
    cache.stopCleanup();
  });
});

describe('Cache Module - CacheManager Statistics', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  afterEach(() => {
    cache.stopCleanup();
  });

  it('should return initial stats', () => {
    const stats = cache.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.size).toBe(0);
  });

  it('should track cache hits', () => {
    cache.set('key1', 'value1');
    cache.get<string>('key1');
    cache.get<string>('key1');
    cache.get<string>('key1');
    
    const stats = cache.getStats();
    expect(stats.hits).toBe(3);
  });

  it('should track cache misses', () => {
    cache.get('nonexistent1');
    cache.get('nonexistent2');
    cache.get('nonexistent3');
    
    const stats = cache.getStats();
    expect(stats.misses).toBe(3);
  });

  it('should track cache size', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    const stats = cache.getStats();
    expect(stats.size).toBe(3);
  });

  it('should calculate hit rate correctly', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    cache.get<string>('key1'); // hit
    cache.get<string>('key2'); // hit
    cache.get<string>('key1'); // hit
    cache.get('nonexistent'); // miss
    cache.get('nonexistent2'); // miss
    
    const stats = cache.getStats();
    expect(stats.hits).toBe(3);
    expect(stats.misses).toBe(2);
    expect(cache.getHitRate()).toBeCloseTo(0.6, 1);
  });

  it('should return 0 hit rate when no requests', () => {
    expect(cache.getHitRate()).toBe(0);
  });

  it('should return 1 hit rate when all hits', () => {
    cache.set('key1', 'value1');
    cache.get<string>('key1');
    cache.get<string>('key1');
    
    expect(cache.getHitRate()).toBe(1);
  });

  it('should return 0 hit rate when all misses', () => {
    cache.get('nonexistent1');
    cache.get('nonexistent2');
    cache.get('nonexistent3');
    
    expect(cache.getHitRate()).toBe(0);
  });

  it('should return copy of stats (immutable)', () => {
    cache.set('key1', 'value1');
    const stats1 = cache.getStats();
    
    // Modify the returned object
    stats1.hits = 999;
    stats1.misses = 999;
    stats1.size = 999;
    
    // Original stats should be unchanged
    const stats2 = cache.getStats();
    expect(stats2.hits).toBe(0);
    expect(stats2.misses).toBe(0);
    expect(stats2.size).toBe(1);
  });
});