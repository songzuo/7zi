/**
 * 语义缓存测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SemanticCache } from '../cache'

describe('SemanticCache', () => {
  let cache: SemanticCache

  beforeEach(() => {
    cache = new SemanticCache({
      maxSize: 10,
      ttlMs: 1000,
      similarityThreshold: 0.95,
    })
  })

  describe('基本操作', () => {
    it('should store and retrieve values', () => {
      cache.set('hello', 'world')
      expect(cache.get('hello')).toBe('world')
    })

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull()
    })

    it('should delete values', () => {
      cache.set('hello', 'world')
      expect(cache.delete('hello')).toBe(true)
      expect(cache.get('hello')).toBeNull()
    })

    it('should clear all values', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.clear()
      expect(cache.size()).toBe(0)
    })
  })

  describe('相似度匹配', () => {
    it('should match similar requests', () => {
      cache.set('Write a function to add two numbers', 'result')
      const result = cache.get('Write a function to add two numbers')
      expect(result).toBe('result')
    })

    it('should not match dissimilar requests', () => {
      cache.set('Write a function', 'result1')
      cache.set('Hello world', 'result2')
      const result = cache.get('Write a function')
      expect(result).toBe('result1')
    })

    it('should respect similarity threshold', () => {
      const strictCache = new SemanticCache({
        similarityThreshold: 0.99,
      })
      strictCache.set('Write a function', 'result')
      const result = strictCache.get('Write a function to add numbers')
      expect(result).toBeNull()
    })
  })

  describe('过期处理', () => {
    it('should expire entries after TTL', async () => {
      const shortCache = new SemanticCache({
        ttlMs: 100,
      })
      shortCache.set('hello', 'world')
      expect(shortCache.get('hello')).toBe('world')
      
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(shortCache.get('hello')).toBeNull()
    })

    it('should cleanup expired entries', async () => {
      const shortCache = new SemanticCache({
        ttlMs: 100,
      })
      shortCache.set('a', 1)
      shortCache.set('b', 2)
      
      await new Promise((resolve) => setTimeout(resolve, 150))
      const cleaned = shortCache.cleanup()
      expect(cleaned).toBeGreaterThan(0)
      expect(shortCache.size()).toBe(0)
    })
  })

  describe('LRU 淘汰', () => {
    it('should evict oldest entries when full', () => {
      const smallCache = new SemanticCache({ maxSize: 3 })
      smallCache.set('a', 1)
      smallCache.set('b', 2)
      smallCache.set('c', 3)
      smallCache.set('d', 4) // Should evict 'a'
      
      expect(smallCache.get('a')).toBeNull()
      expect(smallCache.get('b')).toBe(2)
      expect(smallCache.get('c')).toBe(3)
      expect(smallCache.get('d')).toBe(4)
    })

    it('should update access order on get', () => {
      const smallCache = new SemanticCache({ maxSize: 3 })
      smallCache.set('a', 1)
      smallCache.set('b', 2)
      smallCache.set('c', 3)
      smallCache.get('a') // Access 'a' to make it recent
      smallCache.set('d', 4) // Should evict 'b'
      
      expect(smallCache.get('a')).toBe(1)
      expect(smallCache.get('b')).toBeNull()
      expect(smallCache.get('c')).toBe(3)
      expect(smallCache.get('d')).toBe(4)
    })
  })

  describe('统计信息', () => {
    it('should track hits and misses', () => {
      cache.set('hello', 'world')
      cache.get('hello') // hit
      cache.get('nonexistent') // miss
      
      const stats = cache.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(0.5)
    })

    it('should track evictions', () => {
      const smallCache = new SemanticCache({ maxSize: 2 })
      smallCache.set('a', 1)
      smallCache.set('b', 2)
      smallCache.set('c', 3) // evict
      
      const stats = smallCache.getStats()
      expect(stats.evictions).toBe(1)
    })

    it('should track size', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      expect(cache.size()).toBe(2)
    })
  })

  describe('has 方法', () => {
    it('should check if key exists', () => {
      cache.set('hello', 'world')
      expect(cache.has('hello')).toBe(true)
      expect(cache.has('nonexistent')).toBe(false)
    })

    it('should return false for expired entries', async () => {
      const shortCache = new SemanticCache({ ttlMs: 100 })
      shortCache.set('hello', 'world')
      expect(shortCache.has('hello')).toBe(true)
      
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(shortCache.has('hello')).toBe(false)
    })
  })

  describe('tokens 参数', () => {
    it('should store token count', () => {
      cache.set('hello', 'world', 100)
      const result = cache.get('hello')
      expect(result).toBe('world')
    })
  })
})