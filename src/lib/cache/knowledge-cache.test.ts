/**
 * @fileoverview Knowledge Cache 测试
 * @module src/lib/cache/knowledge-cache.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  KnowledgeQueryCache,
  getKnowledgeQueryCache,
  resetKnowledgeQueryCache,
} from './knowledge-cache';

describe('KnowledgeQueryCache', () => {
  let cache: KnowledgeQueryCache;

  beforeEach(() => {
    cache = new KnowledgeQueryCache({
      maxEntries: 100,
      maxMemoryMB: 1,
      defaultTTL: 1000,
      cleanupInterval: 100,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic operations', () => {
    it('should set and get values', () => {
      cache.set('test:key1', { data: 'value1' });
      const result = cache.get<{ data: string }>('test:key1');
      
      expect(result).toEqual({ data: 'value1' });
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for expired entry', async () => {
      cache.set('test:key1', { data: 'value1' }, 50);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = cache.get('test:key1');
      expect(result).toBeNull();
    });

    it('should delete entries', () => {
      cache.set('test:key1', { data: 'value1' });
      expect(cache.has('test:key1')).toBe(true);
      
      cache.delete('test:key1');
      expect(cache.has('test:key1')).toBe(false);
    });

    it('should check existence with has()', () => {
      cache.set('test:key1', { data: 'value1' });
      expect(cache.has('test:key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('test:key1', { data: 'value1' });
      cache.set('test:key2', { data: 'value2' });
      
      cache.clear();
      
      expect(cache.get('test:key1')).toBeNull();
      expect(cache.get('test:key2')).toBeNull();
    });
  });

  describe('Cache key generation', () => {
    it('should create stable keys', () => {
      const key1 = cache.createKey('query', { type: 'concept', limit: 10 });
      const key2 = cache.createKey('query', { type: 'concept', limit: 10 });
      
      expect(key1).toBe(key2);
    });

    it('should create different keys for different params', () => {
      const key1 = cache.createKey('query', { type: 'concept' });
      const key2 = cache.createKey('query', { type: 'fact' });
      
      expect(key1).not.toBe(key2);
    });

    it('should handle unordered params', () => {
      const key1 = cache.createKey('query', { a: '1', b: '2' });
      const key2 = cache.createKey('query', { b: '2', a: '1' });
      
      expect(key1).toBe(key2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when maxEntries reached', () => {
      const smallCache = new KnowledgeQueryCache({
        maxEntries: 3,
        defaultTTL: 60000,
      });

      smallCache.set('test:key1', { data: '1' });
      smallCache.set('test:key2', { data: '2' });
      smallCache.set('test:key3', { data: '3' });
      smallCache.set('test:key4', { data: '4' });

      // First entry should be evicted
      expect(smallCache.get('test:key1')).toBeNull();
      expect(smallCache.get('test:key4')).toEqual({ data: '4' });

      smallCache.destroy();
    });

    it('should update LRU order on access', () => {
      const smallCache = new KnowledgeQueryCache({
        maxEntries: 3,
        defaultTTL: 60000,
      });

      smallCache.set('test:key1', { data: '1' });
      smallCache.set('test:key2', { data: '2' });
      smallCache.set('test:key3', { data: '3' });

      // Access key1 to make it recently used
      smallCache.get('test:key1');

      // Add new entry - key2 should be evicted (oldest after key1 was accessed)
      smallCache.set('test:key4', { data: '4' });

      expect(smallCache.get('test:key1')).toEqual({ data: '1' });
      expect(smallCache.get('test:key2')).toBeNull();

      smallCache.destroy();
    });
  });

  describe('Prefix invalidation', () => {
    it('should invalidate all keys with matching prefix', () => {
      cache.set('query:type=a', { data: '1' });
      cache.set('query:type=b', { data: '2' });
      cache.set('other:key', { data: '3' });

      const count = cache.invalidatePrefix('query');

      expect(count).toBe(2);
      expect(cache.get('query:type=a')).toBeNull();
      expect(cache.get('query:type=b')).toBeNull();
      expect(cache.get('other:key')).toEqual({ data: '3' });
    });

    it('should return 0 for non-existent prefix', () => {
      cache.set('query:key', { data: '1' });
      
      const count = cache.invalidatePrefix('nonexistent');
      
      expect(count).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', () => {
      cache.set('test:key1', { data: '1' });
      
      cache.get('test:key1'); // hit
      cache.get('test:key1'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getStats();
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
    });

    it('should track memory usage', () => {
      cache.set('test:key1', { data: 'some data here' });
      
      const memInfo = cache.getMemoryInfo();
      
      expect(memInfo.maxMB).toBeGreaterThan(0);
      expect(memInfo.percentUsed).toBeGreaterThanOrEqual(0);
    });

    it('should track entry count', () => {
      cache.set('test:key1', { data: '1' });
      cache.set('test:key2', { data: '2' });

      const stats = cache.getStats();
      
      expect(stats.entries).toBe(2);
    });
  });

  describe('Custom TTL', () => {
    it('should use custom TTL when provided', async () => {
      cache.set('test:key1', { data: '1' }, 5000); // 5 seconds
      cache.set('test:key2', { data: '2' }, 50); // 50ms

      // Wait 100ms
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('test:key1')).toEqual({ data: '1' }); // Not expired
      expect(cache.get('test:key2')).toBeNull(); // Expired
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const cache1 = getKnowledgeQueryCache();
      const cache2 = getKnowledgeQueryCache();
      
      expect(cache1).toBe(cache2);
    });

    it('should reset singleton', () => {
      const cache1 = getKnowledgeQueryCache();
      resetKnowledgeQueryCache();
      const cache2 = getKnowledgeQueryCache();
      
      expect(cache1).not.toBe(cache2);
    });
  });
});
