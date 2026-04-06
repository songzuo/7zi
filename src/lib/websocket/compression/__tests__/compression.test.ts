// @ts-nocheck
/**
 * WebSocket Compression Tests
 * 
 * Tests for compression, batching, incremental updates, and caching
 * 
 * @author Executor Subagent
 * @date 2026-04-03
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  CompressionManager,
  BatchMessageProcessor,
  IncrementalUpdateManager,
  MessageCache,
  getCompressionManager,
  getBatchProcessor,
  getIncrementalUpdateManager,
  getMessageCache,
  resetCompressionManager,
  resetBatchProcessor,
  resetIncrementalUpdateManager,
  resetMessageCache,
  MessagePriority
} from '../index'

// ============================================================================
// Compression Manager Tests
// ============================================================================

describe('CompressionManager', () => {
  let manager: CompressionManager

  beforeEach(() => {
    resetCompressionManager()
    manager = getCompressionManager({
      enableStats: true,
      enableCache: true
    })
  })

  afterEach(() => {
    resetCompressionManager()
  })

  it('should compress large messages with brotli', () => {
    const largeData = 'x'.repeat(10000)
    const result = manager.compress(largeData, 'brotli')

    expect(result).toHaveProperty('compressed')
    expect(result).toHaveProperty('method', 'brotli')
    expect(result.compressedSize).toBeLessThan(result.originalSize)
    expect(result.compressionRatio).toBeLessThan(1)
  })

  it('should compress large messages with gzip', () => {
    const largeData = 'x'.repeat(10000)
    const result = manager.compress(largeData, 'gzip')

    expect(result).toHaveProperty('compressed')
    expect(result).toHaveProperty('method', 'gzip')
    expect(result.compressedSize).toBeLessThan(result.originalSize)
  })

  it('should not compress small messages', () => {
    const smallData = 'hello'
    const result = manager.compress(smallData)

    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('should decompress brotli data', () => {
    const data = 'x'.repeat(10000)
    const compressed = manager.compress(data, 'brotli') as any
    const decompressed = manager.decompress(compressed.compressed, 'brotli')

    expect(decompressed.toString()).toBe(data)
  })

  it('should decompress gzip data', () => {
    const data = 'x'.repeat(10000)
    const compressed = manager.compress(data, 'gzip') as any
    const decompressed = manager.decompress(compressed.compressed, 'gzip')

    expect(decompressed.toString()).toBe(data)
  })

  it('should track compression statistics', () => {
    const data = 'x'.repeat(10000)
    manager.compress(data, 'brotli')
    manager.compress(data, 'gzip')

    const stats = manager.getStats()
    expect(stats.totalMessages).toBe(2)
    expect(stats.compressedMessages).toBe(2)
    expect(stats.methodCounts.brotli).toBe(1)
    expect(stats.methodCounts.gzip).toBe(1)
  })

  it('should cache compressed messages', () => {
    const data = 'x'.repeat(10000)
    
    // First compression
    const result1 = manager.compress(data, 'brotli') as any
    expect(result1).toHaveProperty('compressed')

    // Second compression (should hit cache)
    const result2 = manager.compress(data, 'brotli') as any
    expect(result2).toHaveProperty('compressed')

    const stats = manager.getStats()
    expect(stats.cacheHits).toBeGreaterThan(0)
  })

  it('should respect client capabilities', () => {
    const data = 'x'.repeat(10000)
    const clientCaps = {
      supportsGzip: true,
      supportsBrotli: false,
      wantsCompression: true
    }

    const result = manager.compress(data, 'brotli', clientCaps) as any
    expect(result.method).toBe('gzip')
  })
})

// ============================================================================
// Batch Message Processor Tests
// ============================================================================

describe('BatchMessageProcessor', () => {
  let processor: BatchMessageProcessor

  beforeEach(() => {
    resetBatchProcessor()
    processor = getBatchProcessor({
      maxBatchSize: 5,
      batchWindow: 10
    })
  })

  afterEach(() => {
    resetBatchProcessor()
  })

  it('should add messages to queue', () => {
    const id = processor.add('test', { data: 'test' })
    expect(id).toBeDefined()
    expect(processor.getQueueSize()).toBe(1)
  })

  it('should flush when batch is full', () => {
    for (let i = 0; i < 5; i++) {
      processor.add('test', { data: i })
    }

    expect(processor.getQueueSize()).toBe(0)
  })

  it('should respect message priority', () => {
    processor.add('low', { data: 'low' }, MessagePriority.LOW)
    processor.add('urgent', { data: 'urgent' }, MessagePriority.URGENT)
    processor.add('normal', { data: 'normal' }, MessagePriority.NORMAL)

    const batch = processor.flush()
    expect(batch).toBeDefined()
    expect(batch?.events[0]).toBe('urgent')
  })

  it('should flush urgent messages immediately', () => {
    processor.add('normal', { data: 'normal' }, MessagePriority.NORMAL)
    processor.add('urgent', { data: 'urgent' }, MessagePriority.URGENT)

    expect(processor.getQueueSize()).toBe(0)
  })

  it('should track batch statistics', () => {
    processor.add('test', { data: 'test' })
    processor.add('test', { data: 'test' })
    processor.flush()

    const stats = processor.getStats()
    expect(stats.totalMessages).toBe(2)
    expect(stats.totalBatches).toBe(1)
  })

  it('should create batch payload', () => {
    processor.add('event1', { data: 'test1' })
    processor.add('event2', { data: 'test2' })

    const batch = processor.createBatch([
      { id: '1', event: 'event1', data: { data: 'test1' }, priority: 1, timestamp: Date.now(), size: 100 },
      { id: '2', event: 'event2', data: { data: 'test2' }, priority: 1, timestamp: Date.now(), size: 100 }
    ])

    expect(batch.batchId).toBeDefined()
    expect(batch.events).toHaveLength(2)
    expect(batch.totalSize).toBeGreaterThan(0)
  })
})

// ============================================================================
// Incremental Update Manager Tests
// ============================================================================

describe('IncrementalUpdateManager', () => {
  let manager: IncrementalUpdateManager

  beforeEach(() => {
    resetIncrementalUpdateManager()
    manager = getIncrementalUpdateManager({
      enableCache: true
    })
  })

  afterEach(() => {
    resetIncrementalUpdateManager()
  })

  it('should send full update for first message', () => {
    const data = { name: 'test', value: 123 }
    const update = manager.generateUpdate('key1', data)

    expect(update.type).toBe('full')
    expect(update.data).toEqual(data)
  })

  it('should send incremental update for small changes', () => {
    const data1 = { name: 'test', value: 123, items: [1, 2, 3] }
    const data2 = { name: 'test', value: 124, items: [1, 2, 3] }

    manager.generateUpdate('key1', data1)
    const update = manager.generateUpdate('key1', data2)

    expect(update.type).toBe('incremental')
    expect(update.diff).toBeDefined()
    expect(update.diff?.length).toBeGreaterThan(0)
  })

  it('should send full update for large changes', () => {
    const data1 = { name: 'test', value: 123 }
    const data2 = { name: 'different', value: 456 }

    manager.generateUpdate('key1', data1)
    const update = manager.generateUpdate('key1', data2)

    expect(update.type).toBe('full')
  })

  it('should apply diff correctly', () => {
    const oldData = { name: 'test', value: 123 }
    const newData = { name: 'test', value: 456 }

    manager.generateUpdate('key1', oldData)
    const update = manager.generateUpdate('key1', newData) as any

    const result = manager.applyDiff(oldData, update.diff)
    expect(result).toEqual(newData)
  })

  it('should validate and apply update', () => {
    const data1 = { name: 'test', value: 123 }
    const data2 = { name: 'test', value: 456 }

    manager.generateUpdate('key1', data1)
    const update = manager.generateUpdate('key1', data2)

    const result = manager.validateAndApply(data1, update)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(data2)
  })

  it('should reject invalid update', () => {
    const data1 = { name: 'test', value: 123 }
    const data2 = { name: 'test', value: 456 }

    manager.generateUpdate('key1', data1)
    const update = manager.generateUpdate('key1', data2)

    const result = manager.validateAndApply({ name: 'wrong', value: 999 }, update)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should track statistics', () => {
    const data1 = { name: 'test', value: 123 }
    const data2 = { name: 'test', value: 456 }

    manager.generateUpdate('key1', data1)
    manager.generateUpdate('key1', data2)

    const stats = manager.getStats()
    expect(stats.totalUpdates).toBe(2)
    expect(stats.incrementalUpdates).toBe(1)
    expect(stats.fullUpdates).toBe(1)
  })
})

// ============================================================================
// Message Cache Tests
// ============================================================================

describe('MessageCache', () => {
  let cache: MessageCache

  beforeEach(() => {
    resetMessageCache()
    cache = getMessageCache({
      maxSize: 100,
      enableStats: true
    })
  })

  afterEach(() => {
    resetMessageCache()
  })

  it('should store and retrieve messages', () => {
    const data = { test: 'data' }
    const entry = cache.set('key1', data)

    expect(entry).toBeDefined()
    expect(entry.data).toEqual(data)

    const retrieved = cache.get('key1')
    expect(retrieved).toBeDefined()
    expect(retrieved?.data).toEqual(data)
  })

  it('should return null for missing keys', () => {
    const result = cache.get('nonexistent')
    expect(result).toBeNull()
  })

  it('should expire entries after TTL', () => {
    const data = { test: 'data' }
    cache.set('key1', data, { ttl: 100 })

    // Should be available immediately
    expect(cache.get('key1')).toBeDefined()

    // Wait for expiry
    return new Promise(resolve => {
      setTimeout(() => {
        expect(cache.get('key1')).toBeNull()
        resolve(null)
      }, 150)
    })
  })

  it('should track cache statistics', () => {
    const data = { test: 'data' }
    
    cache.set('key1', data)
    cache.get('key1')
    cache.get('key1')
    cache.get('nonexistent')

    const stats = cache.getStats()
    expect(stats.totalHits).toBe(2)
    expect(stats.totalMisses).toBe(1)
    expect(stats.hitRatio).toBeCloseTo(0.667, 2)
  })

  it('should evict old entries when full', () => {
    const maxSize = 10
    cache = getMessageCache({ maxSize })

    // Fill cache
    for (let i = 0; i < maxSize + 5; i++) {
      cache.set(`key${i}`, { data: i })
    }

    // Should have evicted some entries
    expect(cache.size()).toBeLessThanOrEqual(maxSize)
  })

  it('should support getOrSet pattern', () => {
    let computeCount = 0

    const result1 = cache.getOrSet('key1', () => {
      computeCount++
      return { data: 'computed' }
    })

    expect(result1.computed).toBe(true)
    expect(computeCount).toBe(1)

    const result2 = cache.getOrSet('key1', () => {
      computeCount++
      return { data: 'computed' }
    })

    expect(result2.computed).toBe(false)
    expect(computeCount).toBe(1)
  })

  it('should find entries by pattern', () => {
    cache.set('user:1', { name: 'Alice' })
    cache.set('user:2', { name: 'Bob' })
    cache.set('post:1', { title: 'Test' })

    const userEntries = cache.getByPattern(/^user:/)
    expect(userEntries).toHaveLength(2)
  })

  it('should prune expired entries', () => {
    cache.set('key1', { data: 1 }, { ttl: 100 })
    cache.set('key2', { data: 2 }, { ttl: 10000 })

    return new Promise(resolve => {
      setTimeout(() => {
        const pruned = cache.prune()
        expect(pruned).toBe(1)
        expect(cache.has('key1')).toBe(false)
        expect(cache.has('key2')).toBe(true)
        resolve(null)
      }, 150)
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('WebSocket Optimization Integration', () => {
  beforeEach(() => {
    resetCompressionManager()
    resetBatchProcessor()
    resetIncrementalUpdateManager()
    resetMessageCache()
  })

  afterEach(() => {
    resetCompressionManager()
    resetBatchProcessor()
    resetIncrementalUpdateManager()
    resetMessageCache()
  })

  it('should process outgoing message with all optimizations', () => {
    const { getOptimizationManager } = require('../index')
    const manager = getOptimizationManager()

    const result = manager.processOutgoing('test', { data: 'test' })
    expect(result.processed).toBe(true)
  })

  it('should skip optimizations when disabled', () => {
    const { getOptimizationManager } = require('../index')
    const manager = getOptimizationManager({ enableAll: false })

    const result = manager.processOutgoing('test', { data: 'test' })
    expect(result.processed).toBe(false)
  })

  it('should get combined statistics', () => {
    const { getOptimizationManager } = require('../index')
    const manager = getOptimizationManager()

    manager.processOutgoing('test', { data: 'test' })
    const stats = manager.getStats()

    expect(stats).toHaveProperty('compression')
    expect(stats).toHaveProperty('batching')
    expect(stats).toHaveProperty('incremental')
    expect(stats).toHaveProperty('cache')
  })
})