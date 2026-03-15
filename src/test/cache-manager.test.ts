/**
 * 缓存管理器单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCacheManager, resetCacheManager, cache } from '@/lib/cache/cache-manager';

describe('CacheManager', () => {
  beforeEach(() => {
    resetCacheManager();
  });

  describe('基本 get/set 操作', () => {
    it('should set and get a value', async () => {
      const cacheManager = getCacheManager();
      await cacheManager.set('test-key', 'test-value');
      const value = await cacheManager.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent key', async () => {
      const cacheManager = getCacheManager();
      const value = await cacheManager.get('non-existent');
      expect(value).toBeNull();
    });

    it('should overwrite existing value', async () => {
      const cacheManager = getCacheManager();
      await cacheManager.set('key', 'value1');
      await cacheManager.set('key', 'value2');
      const value = await cacheManager.get('key');
      expect(value).toBe('value2');
    });
  });

  describe('TTL 过期', () => {
    it('should return value within TTL', async () => {
      const cacheManager = getCacheManager();
      await cacheManager.set('expiring-key', 'value', 100); // 100ms
      
      const valueBefore = await cacheManager.get('expiring-key');
      expect(valueBefore).toBe('value');
    });
  });

  describe('缓存失效', () => {
    it('should delete single key', async () => {
      const cacheManager = getCacheManager();
      await cacheManager.set('delete-me', 'value');
      
      await cacheManager.delete('delete-me');
      
      const value = await cacheManager.get('delete-me');
      expect(value).toBeFalsy();
    });

    it('should check key existence', async () => {
      const cacheManager = getCacheManager();
      await cacheManager.set('exists-key', 'value');
      
      const exists = await cacheManager.has('exists-key');
      expect(exists).toBe(true);
      
      const notExists = await cacheManager.has('not-exists');
      expect(notExists).toBe(false);
    });

    it('should clear all cache', async () => {
      const cacheManager = getCacheManager();
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      await cacheManager.clear();
      
      expect(await cacheManager.get('key1')).toBeFalsy();
      expect(await cacheManager.get('key2')).toBeFalsy();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const cacheManager = getCacheManager();
      const factory = vi.fn().mockResolvedValue('factory-value');
      
      await cacheManager.set('factory-key', 'cached-value');
      const value = await cacheManager.getOrSet('factory-key', factory, 1000);
      
      expect(value).toBe('cached-value');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory if key does not exist', async () => {
      const cacheManager = getCacheManager();
      const factory = vi.fn().mockResolvedValue('factory-value');
      
      const value = await cacheManager.getOrSet('new-key', factory, 1000);
      
      expect(value).toBe('factory-value');
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('便捷方法', () => {
    it('should use cache便捷方法', async () => {
      await cache.set('便捷-key', '便捷-value');
      const value = await cache.get('便捷-key');
      expect(value).toBe('便捷-value');
    });

    it('should use cache.has', async () => {
      await cache.set('has-key', 'value');
      const exists = await cache.has('has-key');
      expect(exists).toBe(true);
    });

    it('should use cache.delete', async () => {
      await cache.set('delete-key', 'value');
      await cache.delete('delete-key');
      const exists = await cache.has('delete-key');
      expect(exists).toBe(false);
    });
  });

  describe('单例模式', () => {
    it('should return same instance', () => {
      const manager1 = getCacheManager();
      const manager2 = getCacheManager();
      expect(manager1).toBe(manager2);
    });

    it('should recreate instance on config change', async () => {
      const manager1 = getCacheManager({ maxSize: 100 });
      await manager1.set('key', 'value');
      
      const manager2 = getCacheManager({ maxSize: 200 });
      
      // Should be different instance
      expect(manager1).not.toBe(manager2);
    });
  });
});
