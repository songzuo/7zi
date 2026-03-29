/**
 * Rate Limit Storage Tests
 *
 * 速率限制存储单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRateLimitStorage } from '../memory-storage';
import { RateLimitEntry } from '../storage';

describe('MemoryRateLimitStorage', () => {
  let storage: MemoryRateLimitStorage;

  beforeEach(() => {
    storage = new MemoryRateLimitStorage(false); // 禁用自动清理
  });

  afterEach(async () => {
    await storage.close();
  });

  describe('increment', () => {
    it('should create new entry on first increment', async () => {
      const windowMs = 60000;
      const result = await storage.increment('test-key', windowMs);

      expect(result).toBeDefined();
      expect(result.count).toBe(1);
      expect(result.windowStart).toBeGreaterThan(0);
      expect(result.resetTime).toBeGreaterThan(result.windowStart);
    });

    it('should increment count for existing key within window', async () => {
      const windowMs = 60000;

      await storage.increment('test-key', windowMs);
      const result2 = await storage.increment('test-key', windowMs);

      expect(result2.count).toBe(2);
      expect(result2.windowStart).toBeGreaterThan(0);
    });

    it('should reset count after window expires', async () => {
      const windowMs = 100; // 100ms 窗口

      await storage.increment('test-key', windowMs);
      await new Promise(resolve => setTimeout(resolve, 150)); // 等待窗口过期

      const result = await storage.increment('test-key', windowMs);

      expect(result.count).toBe(1);
    });

    it('should handle multiple keys independently', async () => {
      const windowMs = 60000;

      const result1 = await storage.increment('key-1', windowMs);
      const result2 = await storage.increment('key-2', windowMs);

      expect(result1.count).toBe(1);
      expect(result2.count).toBe(1);

      const result1b = await storage.increment('key-1', windowMs);

      expect(result1b.count).toBe(2);
      expect(await storage.get('key-2')).toBeTruthy();
      const entry2 = await storage.get('key-2');
      expect(entry2?.count).toBe(1);
    });
  });

  describe('get', () => {
    it('should return null for non-existent key', async () => {
      const result = await storage.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return entry for existing key', async () => {
      const windowMs = 60000;
      await storage.increment('test-key', windowMs);

      const result = await storage.get('test-key');

      expect(result).toBeDefined();
      expect(result?.count).toBe(1);
    });

    it('should return null for expired entry', async () => {
      const windowMs = 100;
      await storage.increment('test-key', windowMs);

      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await storage.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('reset', () => {
    it('should delete existing key', async () => {
      const windowMs = 60000;
      await storage.increment('test-key', windowMs);

      await storage.reset('test-key');

      const result = await storage.get('test-key');
      expect(result).toBeNull();
    });

    it('should not throw error for non-existent key', async () => {
      await expect(storage.reset('non-existent')).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      const windowMs = 100;

      await storage.increment('key-1', windowMs);
      await storage.increment('key-2', windowMs);
      await storage.increment('key-3', 60000); // 不会过期

      await new Promise(resolve => setTimeout(resolve, 150));

      const cleaned = await storage.cleanup();

      expect(cleaned).toBeGreaterThanOrEqual(2); // 至少清理 2 个

      const result1 = await storage.get('key-1');
      const result2 = await storage.get('key-2');
      const result3 = await storage.get('key-3');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).not.toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const windowMs = 60000;

      await storage.increment('key-1', windowMs);
      await storage.increment('key-2', windowMs);
      await storage.increment('key-3', 100); // 短期窗口

      const stats = storage.getStats();

      expect(stats.totalEntries).toBeGreaterThanOrEqual(3);
      expect(stats.activeEntries).toBeGreaterThanOrEqual(2);
    });
  });

  describe('close', () => {
    it('should clear all entries and stop cleanup', async () => {
      const windowMs = 60000;
      await storage.increment('key-1', windowMs);
      await storage.increment('key-2', windowMs);

      await storage.close();

      const stats = storage.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });
});
