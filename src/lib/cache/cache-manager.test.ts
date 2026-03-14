/**
 * CacheManager 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from './cache-manager';

// Mock logger
vi.mock('../logger', () => ({
  cacheLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({
      provider: 'memory',
      defaultTTL: 60,
      maxEntries: 100,
    });
  });

  describe('constructor', () => {
    it('应该使用 memory 作为默认 provider', () => {
      const manager = new CacheManager();
      expect(manager.getProvider()).toBe('memory');
    });

    it('应该正确初始化 memory provider', () => {
      const manager = new CacheManager({ provider: 'memory' });
      expect(manager.getProvider()).toBe('memory');
    });

    it('应该正确初始化 layered provider', () => {
      const manager = new CacheManager({ 
        provider: 'layered',
        memory: { maxEntries: 100, defaultTTL: 60 },
      });
      expect(manager.getProvider()).toBe('layered');
    });

    it('应该接受自定义配置', () => {
      const manager = new CacheManager({
        defaultTTL: 300,
        maxEntries: 500,
        prefix: 'test-prefix',
      });
      expect(manager.getProvider()).toBe('memory');
    });
  });

  describe('initialize', () => {
    it('应该成功初始化 memory cache', async () => {
      const result = await cacheManager.initialize();
      expect(result).toBe(true);
    });

    it('应该对于已初始化的缓存返回 true', async () => {
      await cacheManager.initialize();
      const result = await cacheManager.initialize();
      expect(result).toBe(true);
    });
  });

  describe('get/set', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该设置并获取缓存值', async () => {
      await cacheManager.set('key1', 'value1');
      const result = await cacheManager.get('key1');
      expect(result).toBe('value1');
    });

    it('应该返回 null 对于不存在的键', async () => {
      const result = await cacheManager.get('nonexistent');
      expect(result).toBeNull();
    });

    it('应该支持设置自定义 TTL', async () => {
      await cacheManager.set('key-ttl', 'value', 120);
      const result = await cacheManager.get('key-ttl');
      expect(result).toBe('value');
    });

    it('应该支持设置缓存标签', async () => {
      await cacheManager.set('key-tags', 'value', 60, ['tag1', 'tag2']);
      const result = await cacheManager.get('key-tags');
      expect(result).toBe('value');
    });

    it('应该存储和检索复杂对象', async () => {
      const complexObj = {
        id: 1,
        name: 'test',
        nested: { key: 'value' },
        array: [1, 2, 3],
      };
      await cacheManager.set('complex', complexObj);
      const result = await cacheManager.get('complex');
      expect(result).toEqual(complexObj);
    });

    it('应该支持泛型类型', async () => {
      interface User {
        id: string;
        name: string;
      }
      const user: User = { id: '1', name: 'Test User' };
      await cacheManager.set<User>('user', user);
      const result = await cacheManager.get<User>('user');
      expect(result?.name).toBe('Test User');
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该删除已存在的键', async () => {
      await cacheManager.set('key-delete', 'value');
      const deleted = await cacheManager.delete('key-delete');
      expect(deleted).toBe(true);
      
      const result = await cacheManager.get('key-delete');
      expect(result).toBeNull();
    });

    it('应该返回 false 对于不存在的键 (幂等操作)', async () => {
      const deleted = await cacheManager.delete('nonexistent');
      // 删除不存在的键返回 false (幂等操作)
      expect(deleted).toBe(false);
    });
  });

  describe('has', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该返回 true 对于已存在的键', async () => {
      await cacheManager.set('key-exists', 'value');
      const exists = await cacheManager.has('key-exists');
      expect(exists).toBe(true);
    });

    it('应该返回 false 对于不存在的键', async () => {
      const exists = await cacheManager.has('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('getOrSet', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该返回已缓存的值', async () => {
      await cacheManager.set('factory-key', 'cached-value');
      const result = await cacheManager.getOrSet(
        'factory-key',
        async () => 'factory-value'
      );
      expect(result).toBe('cached-value');
    });

    it('应该缓存工厂函数的返回值', async () => {
      let factoryCallCount = 0;
      const result = await cacheManager.getOrSet(
        'new-key',
        async () => {
          factoryCallCount++;
          return 'factory-result';
        }
      );
      expect(result).toBe('factory-result');
      expect(factoryCallCount).toBe(1);

      // 再次获取应该使用缓存
      const cached = await cacheManager.getOrSet(
        'new-key',
        async () => {
          factoryCallCount++;
          return 'factory-result';
        }
      );
      expect(cached).toBe('factory-result');
      expect(factoryCallCount).toBe(1); // 不应再调用工厂
    });
  });

  describe('mget/mset', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该批量获取多个键', async () => {
      await cacheManager.set('batch-1', 'value1');
      await cacheManager.set('batch-2', 'value2');
      
      const results = await cacheManager.mget(['batch-1', 'batch-2', 'batch-3']);
      expect(results.get('batch-1')).toBe('value1');
      expect(results.get('batch-2')).toBe('value2');
      expect(results.get('batch-3')).toBeNull();
    });

    it('应该批量设置多个键', async () => {
      await cacheManager.mset([
        { key: 'mset-1', value: 'value1' },
        { key: 'mset-2', value: 'value2' },
      ]);
      
      const results = await cacheManager.mget(['mset-1', 'mset-2']);
      expect(results.get('mset-1')).toBe('value1');
      expect(results.get('mset-2')).toBe('value2');
    });
  });

  describe('invalidate', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该按标签失效缓存', async () => {
      await cacheManager.set('tag-key-1', 'value1', 60, ['tag-a']);
      await cacheManager.set('tag-key-2', 'value2', 60, ['tag-a']);
      await cacheManager.set('tag-key-3', 'value3', 60, ['tag-b']);
      
      const count = await cacheManager.invalidate({ tags: ['tag-a'] });
      expect(count).toBe(2);
      
      expect(await cacheManager.get('tag-key-1')).toBeNull();
      expect(await cacheManager.get('tag-key-2')).toBeNull();
      expect(await cacheManager.get('tag-key-3')).toBe('value3');
    });

    it('应该按模式失效缓存', async () => {
      await cacheManager.set('pattern-test-1', 'value1');
      await cacheManager.set('pattern-test-2', 'value2');
      await cacheManager.set('pattern-other', 'value3');
      
      const count = await cacheManager.invalidate({ pattern: 'pattern-test-*' });
      expect(count).toBe(2);
      
      expect(await cacheManager.get('pattern-test-1')).toBeNull();
      expect(await cacheManager.get('pattern-test-2')).toBeNull();
      expect(await cacheManager.get('pattern-other')).toBe('value3');
    });

    it('应该清空所有缓存', async () => {
      await cacheManager.set('clear-1', 'value1');
      await cacheManager.set('clear-2', 'value2');
      
      const count = await cacheManager.invalidate({ all: true });
      expect(count).toBe(2);
      
      expect(await cacheManager.get('clear-1')).toBeNull();
      expect(await cacheManager.get('clear-2')).toBeNull();
    });
  });

  describe('touch', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该更新键的 TTL', async () => {
      await cacheManager.set('touch-key', 'value', 60);
      const updated = await cacheManager.touch('touch-key', 120);
      expect(updated).toBe(true);
    });

    it('应该返回 false 对于不存在的键', async () => {
      const updated = await cacheManager.touch('nonexistent', 60);
      expect(updated).toBe(false);
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该清空所有缓存', async () => {
      await cacheManager.set('clear1', 'value1');
      await cacheManager.set('clear2', 'value2');
      
      await cacheManager.clear();
      
      expect(await cacheManager.get('clear1')).toBeNull();
      expect(await cacheManager.get('clear2')).toBeNull();
    });
  });

  describe('stats', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该返回缓存统计', async () => {
      await cacheManager.set('stats-key', 'value');
      await cacheManager.get('stats-key');
      await cacheManager.get('nonexistent');
      
      const stats = cacheManager.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });

    it('应该重置统计', async () => {
      await cacheManager.set('stats-key', 'value');
      await cacheManager.get('stats-key');
      
      cacheManager.resetStats();
      
      const stats = cacheManager.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('getCache', () => {
    it('应该返回底层缓存实例', () => {
      const cache = cacheManager.getCache();
      expect(cache).toBeDefined();
    });
  });
});
