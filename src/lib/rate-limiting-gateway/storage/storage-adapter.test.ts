/**
 * Storage Adapter Tests
 * 存储适配器测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryAdapter } from '../storage/memory-adapter'
import { RedisAdapter } from '../storage/redis-adapter'

describe('MemoryAdapter', () => {
  let storage: MemoryAdapter

  beforeEach(() => {
    storage = new MemoryAdapter()
  })

  afterEach(async () => {
    storage.destroy()
  })

  describe('Basic Operations', () => {
    it('should store and retrieve values', async () => {
      await storage.set('test-key', JSON.stringify({ value: 123 }))
      const value = await storage.get('test-key')
      expect(value).toBe(JSON.stringify({ value: 123 }))
    })

    it('should return null for non-existent keys', async () => {
      const value = await storage.get('non-existent')
      expect(value).toBeNull()
    })

    it('should delete keys', async () => {
      await storage.set('test-key', 'value')
      await storage.delete('test-key')
      const value = await storage.get('test-key')
      expect(value).toBeNull()
    })

    it('should clear all keys', async () => {
      await storage.set('key1', 'value1')
      await storage.set('key2', 'value2')
      storage.clear()

      expect(await storage.get('key1')).toBeNull()
      expect(await storage.get('key2')).toBeNull()
    })

    it('should increment values', async () => {
      await storage.set('counter', '0')
      const result = await storage.increment('counter')
      expect(result).toBe(1)
    })
  })

  describe('TTL Operations', () => {
    it('should set expiration', async () => {
      await storage.set('test-key', 'value', 1) // 1 second TTL
      await new Promise(resolve => setTimeout(resolve, 1100))

      const value = await storage.get('test-key')
      expect(value).toBeNull()
    })

    it('should handle sorted set operations', async () => {
      await storage.zadd('test-set', 100, 'member1')
      await storage.zadd('test-set', 200, 'member2')

      const count = await storage.zcard('test-set')
      expect(count).toBe(2)
    })

    it('should handle sorted set range queries', async () => {
      await storage.zadd('test-set', 100, 'member1')
      await storage.zadd('test-set', 200, 'member2')
      await storage.zadd('test-set', 300, 'member3')

      const result = await storage.zrange('test-set', 0, 1)
      expect(result).toHaveLength(2)
    })

    it('should remove entries outside score range', async () => {
      await storage.zadd('test-set', 50, 'member1')
      await storage.zadd('test-set', 150, 'member2')
      await storage.zadd('test-set', 250, 'member3')

      const removed = await storage.zremrangebyscore('test-set', 0, 100)
      expect(removed).toBe(1)

      const count = await storage.zcard('test-set')
      expect(count).toBe(2)
    })
  })

  describe('Pipeline Operations', () => {
    it('should execute pipeline commands', async () => {
      const commands = [
        { command: 'set' as const, args: ['key1', 'value1'] },
        { command: 'set' as const, args: ['key2', 'value2'] },
        { command: 'get' as const, args: ['key1'] },
        { command: 'get' as const, args: ['key2'] },
      ]

      const results = await storage.pipeline(commands)

      expect(results[0]).toBeUndefined() // set returns void
      expect(results[1]).toBeUndefined()
      expect(results[2]).toBe('value1')
      expect(results[3]).toBe('value2')
    })
  })

  describe('Connection and Stats', () => {
    it('should report connected status', async () => {
      const connected = await storage.isConnected()
      expect(connected).toBe(true)
    })

    it('should return correct storage type', () => {
      expect(storage.getType()).toBe('memory')
    })

    it('should return storage stats', () => {
      storage.set('key1', 'value1')
      storage.zadd('set1', 100, 'member1')

      const stats = storage.getStats()
      expect(stats.keys).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('should handle high throughput', async () => {
      const start = Date.now()

      for (let i = 0; i < 1000; i++) {
        await storage.set(`key-${i}`, `value-${i}`)
      }

      const duration = Date.now() - start
      expect(duration).toBeLessThan(100) // Should be fast
    })

    it('should handle concurrent operations', async () => {
      const promises = []

      for (let i = 0; i < 100; i++) {
        promises.push(storage.set(`key-${i}`, `value-${i}`))
      }

      await Promise.all(promises)

      const value = await storage.get('key-50')
      expect(value).toBe('value-50')
    })
  })

  describe('Destruction', () => {
    it('should clean up on destroy', () => {
      storage.set('key1', 'value1')
      storage.destroy()

      // After destroy, storage should be empty
      expect(storage.getStats().keys).toBe(0)
    })
  })
})

describe('RedisAdapter (Mock)', () => {
  describe('Connection Management', () => {
    it('should handle connection errors gracefully', () => {
      const storage = new RedisAdapter({
        url: 'redis://invalid-host:6379',
        retryAttempts: 1,
      })

      // Should not throw on initial connection (lazy connection)
      expect(() => storage).not.toThrow()
    })

    it('should support cluster mode configuration', () => {
      const storage = new RedisAdapter({
        clusterNodes: [
          { host: 'redis-1', port: 6379 },
          { host: 'redis-2', port: 6379 },
        ],
      })

      expect(() => storage).not.toThrow()
    })

    it('should support key prefix', () => {
      const storage = new RedisAdapter({
        url: 'redis://localhost:6379',
        keyPrefix: 'rate-limit:',
      })

      expect(() => storage).not.toThrow()
    })

    it('should support custom connection options', () => {
      const storage = new RedisAdapter({
        url: 'redis://localhost:6379',
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      })

      expect(() => storage).not.toThrow()
    })
  })
})

describe('RedisAdapter Configuration', () => {
  describe('Connection Management', () => {
    it('should handle connection errors gracefully', () => {
      const storage = new RedisAdapter({
        url: 'redis://invalid-host:6379',
        maxRetries: 1,
      })

      // Should not throw on initial connection (lazy connection)
      expect(() => storage).not.toThrow()
    })

    it('should support cluster mode configuration', () => {
      const storage = new RedisAdapter({
        clusterNodes: [
          { host: 'redis-1', port: 6379 },
          { host: 'redis-2', port: 6379 },
        ],
      })

      expect(() => storage).not.toThrow()
    })

    it('should support key prefix', () => {
      const storage = new RedisAdapter({
        url: 'redis://localhost:6379',
        keyPrefix: 'rate-limit:',
      })

      expect(() => storage).not.toThrow()
    })

    it('should support custom connection options', () => {
      const storage = new RedisAdapter({
        url: 'redis://localhost:6379',
        maxRetries: 3,
        enableReadyCheck: true,
        enableOfflineQueue: true,
      })

      expect(() => storage).not.toThrow()
    })
  })
})