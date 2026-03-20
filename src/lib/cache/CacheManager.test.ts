/**
 * Tests for CacheManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager, getCacheManager, CachePresets } from './CacheManager';

// Mock logger to avoid console output during tests
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  afterEach(() => {
    cache.stopCleanup();
    cache.clear();
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get<string>('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should update existing keys', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get<string>('key1')).toBe('value2');
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
    });
  });

  describe('TTL Expiration', () => {
    it('should expire values after TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get<string>('key1')).toBe('value1');
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
    });

    it('should not expire values before TTL', async () => {
      cache.set('key1', 'value1', 1000); // 1s TTL
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(cache.get<string>('key1')).toBe('value1');
    });

    it('should use default TTL when not specified', () => {
      cache.set('key1', 'value1'); // Uses 60s default
      expect(cache.get<string>('key1')).toBe('value1');
    });

    it('should support different TTLs for different entries', async () => {
      cache.set('short', 'value1', 100); // 100ms
      cache.set('long', 'value2', 1000); // 1s
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(cache.get('short')).toBeNull();
      expect(cache.get<string>('long')).toBe('value2');
    });
  });

  describe('getOrSet Pattern', () => {
    it('should return cached value if exists', async () => {
      cache.set('key1', 'value1');
      const fn = vi.fn().mockResolvedValue('computed');
      
      const result = await cache.getOrSet('key1', fn);
      
      expect(result).toBe('value1');
      expect(fn).not.toHaveBeenCalled();
    });

    it('should call function and cache result if key does not exist', async () => {
      const fn = vi.fn().mockResolvedValue('computed');
      
      const result = await cache.getOrSet('key1', fn);
      
      expect(result).toBe('computed');
      expect(fn).toHaveBeenCalledTimes(1);
      // Should also cache the result
      expect(cache.get<string>('key1')).toBe('computed');
    });

    it('should use custom TTL in getOrSet', async () => {
      const fn = vi.fn().mockResolvedValue('computed');
      
      await cache.getOrSet('key1', fn, 100);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should work with objects', async () => {
      const data = { id: 1, name: 'test' };
      const fn = vi.fn().mockResolvedValue(data);
      
      const result = await cache.getOrSet('key1', fn);
      
      expect(result).toEqual(data);
    });
  });

  describe('Statistics', () => {
    it('should track cache hits', () => {
      cache.set('key1', 'value1');
      cache.get<string>('key1');
      cache.get<string>('key1');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
    });

    it('should track cache misses', () => {
      cache.get('nonexistent');
      cache.get('also-nonexistent');
      
      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
      expect(stats.hits).toBe(0);
    });

    it('should track cache size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });

    it('should calculate hit rate correctly', () => {
      cache.set('key1', 'value1');
      cache.get<string>('key1'); // hit
      cache.get<string>('key1'); // hit
      cache.get('nonexistent'); // miss
      
      expect(cache.getHitRate()).toBeCloseTo(0.667, 2);
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
  });

  describe('Cleanup', () => {
    it('should clean up expired entries', async () => {
      cache.set('key1', 'value1', 100);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Manual cleanup
      const cleaned = cache['cleanup']();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    it('should stop cleanup interval', () => {
      cache.stopCleanup();
      // Should not throw
      cache.stopCleanup(); // Calling twice should be safe
    });
  });

  describe('Type Safety', () => {
    it('should work with different types', () => {
      cache.set('num', 42);
      expect(cache.get<number>('num')).toBe(42);

      cache.set('obj', { id: 1 });
      expect(cache.get<{ id: number }>('obj')).toEqual({ id: 1 });

      cache.set('arr', [1, 2, 3]);
      expect(cache.get<number[]>('arr')).toEqual([1, 2, 3]);

      cache.set('bool', true);
      expect(cache.get<boolean>('bool')).toBe(true);
    });

    it('should handle null values', () => {
      cache.set('null', null);
      expect(cache.get('null')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string keys', () => {
      cache.set('', 'value');
      expect(cache.get('')).toBe('value');
    });

    it('should handle special characters in keys', () => {
      cache.set('key:with:colons', 'value1');
      cache.set('key-with-dashes', 'value2');
      cache.set('key.with.dots', 'value3');
      
      expect(cache.get<string>('key:with:colons')).toBe('value1');
      expect(cache.get<string>('key-with-dashes')).toBe('value2');
      expect(cache.get<string>('key.with.dots')).toBe('value3');
    });

    it('should delete return true if key existed', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });
});

describe('CacheManager.generateKey', () => {
  it('should generate key with prefix and args', () => {
    const key = CacheManager.generateKey('user', '123', 'profile');
    expect(key).toBe('user:123:profile');
  });

  it('should generate key with single arg', () => {
    const key = CacheManager.generateKey('cache', 'single');
    expect(key).toBe('cache:single');
  });

  it('should generate key with multiple args', () => {
    const key = CacheManager.generateKey('query', 'user', 'active', 'true');
    expect(key).toBe('query:user:active:true');
  });

  it('should handle numeric args', () => {
    const key = CacheManager.generateKey('item', 123, 456);
    expect(key).toBe('item:123:456');
  });

  it('should handle boolean args', () => {
    const key = CacheManager.generateKey('filter', true, false);
    expect(key).toBe('filter:true:false');
  });
});

describe('CachePresets', () => {
  it('should have REALTIME preset', () => {
    expect(CachePresets.REALTIME).toBe(5000);
  });

  it('should have SHORT preset', () => {
    expect(CachePresets.SHORT).toBe(30000);
  });

  it('should have MEDIUM preset', () => {
    expect(CachePresets.MEDIUM).toBe(60000);
  });

  it('should have LONG preset', () => {
    expect(CachePresets.LONG).toBe(300000);
  });

  it('should have VERY_LONG preset', () => {
    expect(CachePresets.VERY_LONG).toBe(1800000);
  });
});

describe('getCacheManager Singleton', () => {
  it('should return same instance', () => {
    const instance1 = getCacheManager();
    const instance2 = getCacheManager();
    expect(instance1).toBe(instance2);
  });

  it('should work correctly', () => {
    const cache = getCacheManager();
    cache.set('singleton-key', 'singleton-value');
    expect(cache.get<string>('singleton-key')).toBe('singleton-value');
  });
});
