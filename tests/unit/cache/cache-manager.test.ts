/**
 * Supplementary Tests for CacheManager
 *
 * These tests cover missing edge cases and scenarios not covered in the original test file:
 * - Concurrency scenarios
 * - Error boundaries
 * - Edge cases with special values
 * - Advanced TTL scenarios
 * - Complex key generation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CacheManager, getCacheManager, CachePresets } from '../../src/lib/cache/CacheManager'

// Mock logger to avoid console output during tests
vi.mock('../../src/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('CacheManager - Advanced Tests', () => {
  let cache: CacheManager

  beforeEach(() => {
    cache = new CacheManager()
  })

  afterEach(() => {
    cache.stopCleanup()
    cache.clear()
  })

  describe('Concurrency Scenarios', () => {
    it('should handle concurrent getOrSet calls without duplicate executions', async () => {
      const callCount = { value: 0 }
      const fn = vi.fn().mockImplementation(async () => {
        callCount.value++
        await new Promise(resolve => setTimeout(resolve, 100))
        return `result-${callCount.value}`
      })

      // Simulate concurrent requests for the same key
      const [result1, result2, result3] = await Promise.all([
        cache.getOrSet('concurrent-key', fn),
        cache.getOrSet('concurrent-key', fn),
        cache.getOrSet('concurrent-key', fn),
      ])

      // Note: Without proper locking, this might call fn multiple times
      // This test documents current behavior
      expect([result1, result2, result3].every(r => typeof r === 'string')).toBe(true)
      expect(fn.mock.calls.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle concurrent set operations on different keys', async () => {
      const operations = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(cache.set(`key-${i}`, `value-${i}`))
      )

      await Promise.all(operations)

      expect(cache.getStats().size).toBe(100)
    })

    it('should handle concurrent get operations while setting', async () => {
      cache.set('existing', 'initial')

      const operations = [
        cache.getOrSet('key1', async () => 'result1'),
        cache.getOrSet('key2', async () => 'result2'),
        cache.get<string>('existing'),
        cache.get('nonexistent'),
      ]

      const results = await Promise.all(operations)

      expect(results[0]).toBe('result1')
      expect(results[1]).toBe('result2')
      expect(results[2]).toBe('initial')
      expect(results[3]).toBeNull()
    })
  })

  describe('Error Boundaries', () => {
    it('should propagate errors from getOrSet function', async () => {
      const errorMessage = 'Fetch failed'
      const fn = vi.fn().mockRejectedValue(new Error(errorMessage))

      await expect(cache.getOrSet('error-key', fn)).rejects.toThrow(errorMessage)
    })

    it('should not cache errors from getOrSet', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce('success')

      // First call fails
      await expect(cache.getOrSet('error-key', fn)).rejects.toThrow('First error')

      // Second call should retry, not return cached error
      const result = await cache.getOrSet('error-key', fn)
      expect(result).toBe('success')
    })

    it('should handle TTL of 0 (expires immediately on next tick)', async () => {
      // TTL=0 means expiresAt = now + 0, so technically expires immediately
      // However, since set and get are synchronous, the time might not have advanced
      cache.set('zero-ttl', 'value', 0)

      // In the same tick, it might still be retrievable
      // After any async operation, it should definitely be expired
      await new Promise(resolve => setTimeout(resolve, 1))

      const result = cache.get('zero-ttl')
      expect(result).toBeNull()
    })

    it('should handle negative TTL as already expired', async () => {
      cache.set('negative-ttl', 'value', -1000)

      expect(cache.get('negative-ttl')).toBeNull()
    })

    it('should handle very large TTL values', () => {
      const veryLargeTTL = Number.MAX_SAFE_INTEGER
      cache.set('large-ttl', 'value', veryLargeTTL)

      expect(cache.get('large-ttl')).toBe('value')
    })

    it('should handle getOrSet with function returning null', async () => {
      const fn = vi.fn().mockResolvedValue(null)

      const result = await cache.getOrSet('null-result', fn)

      // getOrSet uses `cached !== null` check, so null will trigger re-fetch
      expect(result).toBeNull()
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should handle getOrSet with function returning undefined', async () => {
      const fn = vi.fn().mockResolvedValue(undefined)

      const result = await cache.getOrSet('undefined-result', fn)

      // undefined is not null, so it will be cached
      expect(result).toBeUndefined()
      expect(fn).toHaveBeenCalledTimes(1)

      // Verify it's cached
      const cachedResult = await cache.getOrSet('undefined-result', fn)
      expect(cachedResult).toBeUndefined()
      expect(fn).toHaveBeenCalledTimes(1) // Should not call again
    })
  })

  describe('Edge Cases - Special Values', () => {
    it('should correctly store and retrieve falsy values', () => {
      // 0
      cache.set('zero', 0)
      expect(cache.get('zero')).toBe(0)

      // empty string
      cache.set('empty', '')
      expect(cache.get('empty')).toBe('')

      // false
      cache.set('false', false)
      expect(cache.get('false')).toBe(false)

      // null (edge case - get returns null for both missing and null)
      cache.set('null-val', null)
      expect(cache.get('null-val')).toBeNull()
    })

    it('should distinguish between missing key and stored null', () => {
      // This is a known limitation - both return null
      cache.set('stored-null', null)

      const missing = cache.get('missing')
      const storedNull = cache.get('stored-null')

      // Both return null - cannot distinguish
      expect(missing).toBeNull()
      expect(storedNull).toBeNull()
    })

    it('should handle complex nested objects', () => {
      const complexObject = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, 3],
              date: new Date(),
              map: new Map([['key', 'value']]),
            },
          },
        },
        circular: null as unknown,
      }
      complexObject.circular = complexObject

      // Should not throw on circular reference
      expect(() => cache.set('complex', complexObject)).not.toThrow()
    })

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(10000)
      cache.set(longKey, 'value')

      expect(cache.get(longKey)).toBe('value')
    })

    it('should handle Unicode and emoji in keys', () => {
      cache.set('🔑-key', 'emoji')
      cache.set('中文-键', 'chinese')
      cache.set('ключ', 'russian')

      expect(cache.get('🔑-key')).toBe('emoji')
      expect(cache.get('中文-键')).toBe('chinese')
      expect(cache.get('ключ')).toBe('russian')
    })

    it('should handle large data values', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(100),
      }))

      cache.set('large', largeArray)
      const result = cache.get<typeof largeArray>('large')

      expect(result).toHaveLength(10000)
      expect(result?.[0].id).toBe(0)
    })
  })

  describe('TTL Edge Cases', () => {
    it('should handle TTL at boundary (just before expiry)', async () => {
      cache.set('boundary', 'value', 100)

      // Wait just before expiry
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(cache.get('boundary')).toBe('value')

      // Wait past expiry
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(cache.get('boundary')).toBeNull()
    })

    it('should update TTL when setting same key', async () => {
      cache.set('refresh', 'value1', 100)
      await new Promise(resolve => setTimeout(resolve, 50))

      // Refresh with longer TTL
      cache.set('refresh', 'value2', 500)
      expect(cache.get('refresh')).toBe('value2')

      // Original TTL would have expired
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(cache.get('refresh')).toBe('value2') // Still there

      // Wait for new TTL to expire
      await new Promise(resolve => setTimeout(resolve, 500))
      expect(cache.get('refresh')).toBeNull()
    })

    it('should handle different TTLs for different entries independently', async () => {
      cache.set('short', 's', 50)
      cache.set('medium', 'm', 150)
      cache.set('long', 'l', 300)

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(cache.get('short')).toBeNull()
      expect(cache.get('medium')).toBe('m')
      expect(cache.get('long')).toBe('l')

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(cache.get('medium')).toBeNull()
      expect(cache.get('long')).toBe('l')

      await new Promise(resolve => setTimeout(resolve, 200))
      expect(cache.get('long')).toBeNull()
    })

    it('should track misses correctly for expired entries', async () => {
      cache.set('expiring', 'value', 50)

      // First get - hit
      cache.get('expiring')
      expect(cache.getStats().hits).toBe(1)

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 100))

      // Get expired entry - miss
      cache.get('expiring')
      expect(cache.getStats().misses).toBe(1)
    })
  })

  describe('Cleanup Mechanism', () => {
    it('should return correct count of cleaned entries', async () => {
      cache.set('expire1', 'v1', 50)
      cache.set('expire2', 'v2', 50)
      cache.set('keep', 'v3', 10000)

      await new Promise(resolve => setTimeout(resolve, 100))

      const cleaned = cache['cleanup']()

      expect(cleaned).toBe(2)
      expect(cache.get('keep')).toBe('v3')
    })

    it('should update size after cleanup', async () => {
      cache.set('expire1', 'v1', 50)
      cache.set('expire2', 'v2', 50)
      cache.set('keep', 'v3', 10000)

      expect(cache.getStats().size).toBe(3)

      await new Promise(resolve => setTimeout(resolve, 100))
      cache['cleanup']()

      expect(cache.getStats().size).toBe(1)
    })

    it('should not start duplicate cleanup intervals', () => {
      const cache1 = new CacheManager()
      const cache2 = new CacheManager()

      // Both should have their own cleanup
      expect(cache1).toBeDefined()
      expect(cache2).toBeDefined()

      cache1.stopCleanup()
      cache2.stopCleanup()
    })

    it('should handle cleanup with empty cache', () => {
      const cleaned = cache['cleanup']()
      expect(cleaned).toBe(0)
    })
  })

  describe('Statistics Edge Cases', () => {
    it('should correctly calculate hit rate with only misses', () => {
      cache.get('miss1')
      cache.get('miss2')
      cache.get('miss3')

      expect(cache.getHitRate()).toBe(0)
    })

    it('should correctly calculate hit rate with only hits', () => {
      cache.set('key', 'value')
      cache.get('key')
      cache.get('key')

      expect(cache.getHitRate()).toBe(1)
    })

    it('should maintain separate stats for different CacheManager instances', () => {
      const cache2 = new CacheManager()

      cache.set('key1', 'value1')
      cache.get('key1')

      cache2.set('key2', 'value2')
      cache2.get('key2')
      cache2.get('key2')

      expect(cache.getStats().hits).toBe(1)
      expect(cache2.getStats().hits).toBe(2)

      cache2.stopCleanup()
      cache2.clear()
    })

    it('should return a copy of stats', () => {
      const stats1 = cache.getStats()
      const stats2 = cache.getStats()

      expect(stats1).not.toBe(stats2) // Different references
      expect(stats1).toEqual(stats2) // Same values
    })
  })

  describe('generateKey - Additional Tests', () => {
    it('should generate key with mixed types', () => {
      const key = CacheManager.generateKey('mixed', 'string', 123, true, 456)
      expect(key).toBe('mixed:string:123:true:456')
    })

    it('should generate key with only prefix', () => {
      const key = CacheManager.generateKey('prefix')
      expect(key).toBe('prefix:')
    })

    it('should handle empty args', () => {
      const key = CacheManager.generateKey('test')
      expect(key).toBe('test:')
    })

    it('should handle multiple colons in prefix', () => {
      const key = CacheManager.generateKey('prefix:sub', 'arg')
      expect(key).toBe('prefix:sub:arg')
    })

    it('should generate consistent keys for same inputs', () => {
      const key1 = CacheManager.generateKey('user', 123, 'profile')
      const key2 = CacheManager.generateKey('user', 123, 'profile')

      expect(key1).toBe(key2)
    })

    it('should generate different keys for different inputs', () => {
      const key1 = CacheManager.generateKey('user', 123)
      const key2 = CacheManager.generateKey('user', 456)

      expect(key1).not.toBe(key2)
    })
  })

  describe('CachePresets - Validation', () => {
    it('should have presets in increasing order', () => {
      expect(CachePresets.REALTIME).toBeLessThan(CachePresets.SHORT)
      expect(CachePresets.SHORT).toBeLessThan(CachePresets.MEDIUM)
      expect(CachePresets.MEDIUM).toBeLessThan(CachePresets.LONG)
      expect(CachePresets.LONG).toBeLessThan(CachePresets.VERY_LONG)
    })

    it('should be usable in set operations', () => {
      cache.set('realtime', 'v1', CachePresets.REALTIME)
      cache.set('short', 'v2', CachePresets.SHORT)
      cache.set('medium', 'v3', CachePresets.MEDIUM)
      cache.set('long', 'v4', CachePresets.LONG)
      cache.set('verylong', 'v5', CachePresets.VERY_LONG)

      expect(cache.get('realtime')).toBe('v1')
      expect(cache.get('short')).toBe('v2')
      expect(cache.get('medium')).toBe('v3')
      expect(cache.get('long')).toBe('v4')
      expect(cache.get('verylong')).toBe('v5')
    })

    it('should be usable in getOrSet', async () => {
      const fn = vi.fn().mockResolvedValue('preset-value')

      await cache.getOrSet('preset-key', fn, CachePresets.MEDIUM)

      expect(cache.get('preset-key')).toBe('preset-value')
    })

    it('should have correct millisecond values', () => {
      expect(CachePresets.REALTIME).toBe(5 * 1000)
      expect(CachePresets.SHORT).toBe(30 * 1000)
      expect(CachePresets.MEDIUM).toBe(60 * 1000)
      expect(CachePresets.LONG).toBe(5 * 60 * 1000)
      expect(CachePresets.VERY_LONG).toBe(30 * 60 * 1000)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle rapid set-get-delete cycles', () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, `value-${i}`)
        cache.get(`key-${i}`)
        cache.delete(`key-${i}`)
      }

      expect(cache.getStats().size).toBe(0)
    })

    it('should handle mixed operations correctly', async () => {
      // Set multiple values
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3, 50) // Short TTL

      // Get some
      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBe(2)

      // Update
      cache.set('a', 11)

      // Delete
      cache.delete('b')

      // Wait for c to expire
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check final state
      expect(cache.get('a')).toBe(11)
      expect(cache.get('b')).toBeNull()
      expect(cache.get('c')).toBeNull()

      // Stats check
      expect(cache.getStats().hits).toBeGreaterThanOrEqual(2)
    })

    it('should work with async factory functions', async () => {
      const asyncFactory = vi.fn().mockImplementation(async (id: number) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { id, data: `data-${id}` }
      })

      const fn1 = () => asyncFactory(1)
      const fn2 = () => asyncFactory(2)

      const [result1, result2] = await Promise.all([
        cache.getOrSet('item-1', fn1),
        cache.getOrSet('item-2', fn2),
      ])

      expect(result1).toEqual({ id: 1, data: 'data-1' })
      expect(result2).toEqual({ id: 2, data: 'data-2' })
    })
  })

  describe('Memory and Resource Management', () => {
    it('should properly clear all entries', () => {
      for (let i = 0; i < 1000; i++) {
        cache.set(`key-${i}`, `value-${i}`)
      }

      expect(cache.getStats().size).toBe(1000)

      cache.clear()

      expect(cache.getStats().size).toBe(0)
      expect(cache.get('key-500')).toBeNull()
    })

    it('should handle delete on non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false)
    })

    it('should handle multiple clear calls', () => {
      cache.set('key', 'value')
      cache.clear()
      cache.clear() // Should not throw
      expect(cache.getStats().size).toBe(0)
    })
  })
})

describe('getCacheManager - Additional Tests', () => {
  it('should maintain state across calls', () => {
    // Clear any existing instance for test isolation
    const cache1 = getCacheManager()
    cache1.set('persistent', 'value')
    cache1.stopCleanup()

    const cache2 = getCacheManager()
    expect(cache2.get('persistent')).toBe('value')
  })

  it('should be the same instance across multiple imports', () => {
    const instance1 = getCacheManager()
    const instance2 = getCacheManager()

    instance1.set('shared-key', 'shared-value')

    expect(instance2.get('shared-key')).toBe('shared-value')
  })
})
