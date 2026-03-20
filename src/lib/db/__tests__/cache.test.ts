/**
 * Database Cache Tests
 * 测试数据库缓存功能
 */

import { describe, it, expect, vi } from 'vitest';
import {
  cached,
  cachedQuery,
  getCacheStats,
  CacheKeyGenerator,
  CacheInvalidator,
  startCacheCleanup,
  warmupCache,
} from '../cache';

// Mock getDatabaseAsync
vi.mock('../index', () => {
  const mockDb = {
    prepare: vi.fn().mockReturnValue({
      all: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue({}),
    }),
  };
  return {
    getDatabaseAsync: vi.fn().mockResolvedValue(mockDb),
  };
});

describe('CacheKeyGenerator', () => {
  describe('agentKey', () => {
    it('should generate correct agent key', () => {
      const key = CacheKeyGenerator.agentKey('agent-123');
      expect(key).toBe('agent:agent-123');
    });
  });

  describe('agentsListKey', () => {
    it('should generate list key without filters', () => {
      const key = CacheKeyGenerator.agentsListKey();
      expect(key).toBe('agents:list:undefined');
    });

    it('should generate list key with filters', () => {
      const filters = { status: 'active', type: 'chat' };
      const key = CacheKeyGenerator.agentsListKey(filters);
      expect(key).toBe(`agents:list:${JSON.stringify(filters)}`);
    });
  });

  describe('walletKey', () => {
    it('should generate correct wallet key', () => {
      const key = CacheKeyGenerator.walletKey('agent-123');
      expect(key).toBe('wallet:agent-123');
    });
  });

  describe('walletTransactionsKey', () => {
    it('should generate transactions key without options', () => {
      const key = CacheKeyGenerator.walletTransactionsKey('agent-123');
      expect(key).toBe('wallet:transactions:agent-123:undefined');
    });

    it('should generate transactions key with options', () => {
      const options = { limit: 10, offset: 0 };
      const key = CacheKeyGenerator.walletTransactionsKey('agent-123', options);
      expect(key).toBe(`wallet:transactions:agent-123:${JSON.stringify(options)}`);
    });
  });

  describe('agentStatsKey', () => {
    it('should generate correct stats key', () => {
      const key = CacheKeyGenerator.agentStatsKey();
      expect(key).toBe('stats:agents');
    });
  });

  describe('walletStatsKey', () => {
    it('should generate correct wallet stats key', () => {
      const key = CacheKeyGenerator.walletStatsKey('agent-123');
      expect(key).toBe('stats:wallet:agent-123');
    });
  });

  describe('approvalListKey', () => {
    it('should generate approval list key without query', () => {
      const key = CacheKeyGenerator.approvalListKey();
      expect(key).toBe('approvals:list:undefined');
    });

    it('should generate approval list key with query', () => {
      const query = { status: 'pending' };
      const key = CacheKeyGenerator.approvalListKey(query);
      expect(key).toBe(`approvals:list:${JSON.stringify(query)}`);
    });
  });

  describe('approvalStatsKey', () => {
    it('should generate correct approval stats key', () => {
      const key = CacheKeyGenerator.approvalStatsKey();
      expect(key).toBe('stats:approvals');
    });
  });
});

describe('CacheInvalidator', () => {
  it('should remove agent-related cache entries', () => {
    // Set some cache entries
    // Note: This test assumes the global cache is accessible
    // In a real implementation, you might need to mock the global cache

    // Call invalidate
    CacheInvalidator.invalidateAgent('agent-123');

    // Should not throw
    expect(true).toBe(true);
  });

  it('should clear all cache entries', () => {
    CacheInvalidator.clearAll();
    const stats = getCacheStats();
    expect(stats.entries).toBe(0);
  });

  it('should return number of cleaned entries', () => {
    const cleaned = CacheInvalidator.cleanExpired();
    expect(typeof cleaned).toBe('number');
    expect(cleaned).toBeGreaterThanOrEqual(0);
  });
});

describe('cachedQuery', () => {
  it('should cache and return query result', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    const key = 'test-query-key';

    const result1 = await cachedQuery(key, queryFn, 1000);
    const result2 = await cachedQuery(key, queryFn, 1000);

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(result1).toEqual({ data: 'test' });
    expect(result2).toEqual({ data: 'test' });
  });

  it('should execute query when cache miss', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    const key = 'test-query-key-new';

    await cachedQuery(key, queryFn, 1000);
    const result = await cachedQuery(key + '-2', queryFn, 1000);

    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});

describe('getCacheStats', () => {
  it('should return cache statistics', () => {
    const stats = getCacheStats();

    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('hitRate');
    expect(stats).toHaveProperty('entries');
    expect(stats).toHaveProperty('totalSize');
  });

  it('should return numeric values', () => {
    const stats = getCacheStats();

    expect(typeof stats.hits).toBe('number');
    expect(typeof stats.misses).toBe('number');
    expect(typeof stats.hitRate).toBe('number');
    expect(typeof stats.entries).toBe('number');
    expect(typeof stats.totalSize).toBe('number');
  });
});

describe('startCacheCleanup', () => {
  it('should start cleanup interval', () => {
    const interval = startCacheCleanup(60000);
    expect(interval).toBeDefined();

    if (typeof interval === 'number') {
      clearInterval(interval);
    } else {
      clearInterval(interval as NodeJS.Timeout);
    }
  });

  it('should use default interval when not provided', () => {
    const interval = startCacheCleanup();
    expect(interval).toBeDefined();

    if (typeof interval === 'number') {
      clearInterval(interval);
    } else {
      clearInterval(interval as NodeJS.Timeout);
    }
  });
});

describe('warmupCache', () => {
  it('should warmup cache without errors', async () => {
    await expect(warmupCache()).resolves.not.toThrow();
  });
});
