/**
 * WebSocket Compression Performance Tests
 * 
 * Comprehensive performance benchmarking for compression optimization
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
// Test Data Generators
// ============================================================================

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateRandomObject(depth: number = 3, width: number = 5): any {
  if (depth === 0) {
    return Math.random() > 0.5 
      ? Math.random() * 1000 
      : generateRandomString(20)
  }

  const obj: Record<string, any> = {}
  for (let i = 0; i < width; i++) {
    const key = `key_${i}`
    if (Math.random() > 0.3) {
      obj[key] = generateRandomObject(depth - 1, width)
    } else {
      obj[key] = generateRandomString(50)
    }
  }
  return obj
}

function generateTypicalMessage(): any {
  return {
    type: 'data_update',
    timestamp: Date.now(),
    userId: Math.floor(Math.random() * 10000),
    roomId: `room_${Math.floor(Math.random() * 100)}`,
    data: {
      users: Array.from({ length: 10 }, (_, i) => ({
        id: i,
        name: generateRandomString(20),
        email: `${generateRandomString(8)}@example.com`,
        status: ['online', 'offline', 'busy'][Math.floor(Math.random() * 3)]
      })),
      messages: Array.from({ length: 20 }, (_, i) => ({
        id: i,
        content: generateRandomString(100),
        senderId: Math.floor(Math.random() * 10),
        timestamp: Date.now() - Math.random() * 86400000
      }))
    }
  }
}

// ============================================================================
// Performance Benchmarks
// ============================================================================

describe('WebSocket Compression Performance', () => {
  let compression: CompressionManager
  let batcher: BatchMessageProcessor
  let incremental: IncrementalUpdateManager
  let cache: MessageCache

  beforeEach(() => {
    resetCompressionManager()
    resetBatchProcessor()
    resetIncrementalUpdateManager()
    resetMessageCache()

    compression = getCompressionManager({ enableStats: true })
    batcher = getBatchProcessor()
    incremental = getIncrementalUpdateManager()
    cache = getMessageCache()
  })

  afterEach(() => {
    resetCompressionManager()
    resetBatchProcessor()
    resetIncrementalUpdateManager()
    resetMessageCache()
  })

  // ============================================================================
  // Compression Benchmarks
  // ============================================================================

  describe('Compression Performance', () => {
    it('should achieve 50-70% compression ratio on typical data', () => {
      const messages = Array.from({ length: 100 }, () => generateTypicalMessage())
      let totalOriginal = 0
      let totalCompressed = 0

      for (const msg of messages) {
        const result = compression.compress(JSON.stringify(msg), 'brotli') as any
        
        if (result.compressed) {
          totalOriginal += result.originalSize
          totalCompressed += result.compressedSize
        }
      }

      const ratio = totalCompressed / totalOriginal
      console.log(`Compression Ratio: ${(ratio * 100).toFixed(1)}%`)
      console.log(`Original: ${(totalOriginal / 1024).toFixed(1)}KB`)
      console.log(`Compressed: ${(totalCompressed / 1024).toFixed(1)}KB`)
      console.log(`Saved: ${((totalOriginal - totalCompressed) / 1024).toFixed(1)}KB`)

      // Target: 50-70% reduction (ratio = 0.30-0.50)
      expect(ratio).toBeLessThan(0.5)  // At least 50% reduction
    })

    it('should compress in < 5ms for typical messages', () => {
      const msg = generateTypicalMessage()
      const json = JSON.stringify(msg)

      const start = performance.now()
      const result = compression.compress(json, 'brotli')
      const end = performance.now()

      const duration = end - start
      console.log(`Compression time: ${duration.toFixed(2)}ms`)

      expect(duration).toBeLessThan(5)
    })

    it('should decompress in < 5ms', () => {
      const msg = generateTypicalMessage()
      const json = JSON.stringify(msg)
      const compressed = compression.compress(json, 'brotli') as any

      const start = performance.now()
      const decompressed = compression.decompress(compressed.compressed, 'brotli')
      const end = performance.now()

      const duration = end - start
      console.log(`Decompression time: ${duration.toFixed(2)}ms`)

      expect(duration).toBeLessThan(5)
      expect(decompressed.toString()).toBe(json)
    })

    it('should handle high throughput compression', () => {
      const messages = Array.from({ length: 1000 }, () => generateTypicalMessage())
      const start = performance.now()

      for (const msg of messages) {
        compression.compress(JSON.stringify(msg), 'brotli')
      }

      const end = performance.now()
      const throughput = messages.length / ((end - start) / 1000)
      
      console.log(`Throughput: ${throughput.toFixed(0)} messages/second`)
      console.log(`Average time per message: ${((end - start) / messages.length).toFixed(2)}ms`)

      // Should handle at least 100 messages per second
      expect(throughput).toBeGreaterThan(100)
    })

    it('should compare gzip vs brotli performance', () => {
      const msg = generateTypicalMessage()
      const json = JSON.stringify(msg)

      // Gzip benchmark
      const gzipStart = performance.now()
      const gzipResult = compression.compress(json, 'gzip') as any
      const gzipEnd = performance.now()

      // Brotli benchmark
      const brotliStart = performance.now()
      const brotliResult = compression.compress(json, 'brotli') as any
      const brotliEnd = performance.now()

      console.log('Gzip:')
      console.log(`  Time: ${(gzipEnd - gzipStart).toFixed(2)}ms`)
      console.log(`  Ratio: ${((gzipResult.compressedSize / gzipResult.originalSize) * 100).toFixed(1)}%`)

      console.log('Brotli:')
      console.log(`  Time: ${(brotliEnd - brotliStart).toFixed(2)}ms`)
      console.log(`  Ratio: ${((brotliResult.compressedSize / brotliResult.originalSize) * 100).toFixed(1)}%`)

      // Both should work
      expect(gzipResult.compressedSize).toBeLessThan(gzipResult.originalSize)
      expect(brotliResult.compressedSize).toBeLessThan(brotliResult.originalSize)
    })
  })

  // ============================================================================
  // Batching Benchmarks
  // ============================================================================

  describe('Batching Performance', () => {
    it('should batch messages efficiently', () => {
      const start = performance.now()

      for (let i = 0; i < 100; i++) {
        batcher.add('test', { data: i })
      }

      const batch = batcher.flush()
      const end = performance.now()

      console.log(`Batch time: ${(end - start).toFixed(2)}ms`)
      console.log(`Messages batched: ${batch?.messageCount}`)

      expect(batch?.messageCount).toBe(100)
      expect((end - start)).toBeLessThan(10)
    })

    it('should handle priority queue efficiently', () => {
      const start = performance.now()

      // Add messages with random priorities
      for (let i = 0; i < 1000; i++) {
        const priority = Math.floor(Math.random() * 4) as MessagePriority
        batcher.add('test', { data: i }, priority)
      }

      const stats = batcher.getStats()
      const end = performance.now()

      console.log(`Priority queue time: ${(end - start).toFixed(2)}ms`)
      console.log('Priority distribution:', stats.priorityDistribution)

      expect((end - start)).toBeLessThan(50)
    })

    it('should measure batch waiting time', () => {
      batcher.updateConfig({ batchWindow: 10 })

      batcher.add('test', { data: 1 })
      
      // Wait a bit
      const waitStart = Date.now()
      
      setTimeout(() => {
        batcher.add('test', { data: 2 })
      }, 5)

      return new Promise(resolve => {
        setTimeout(() => {
          const stats = batcher.getStats()
          console.log(`Average wait time: ${stats.averageWaitTime.toFixed(2)}ms`)
          resolve(null)
        }, 20)
      })
    })
  })

  // ============================================================================
  // Incremental Update Benchmarks
  // ============================================================================

  describe('Incremental Update Performance', () => {
    it('should detect small changes efficiently', () => {
      const data1 = generateTypicalMessage()
      const data2 = { ...data1 }
      data2.data.messages[0].content = 'changed'

      incremental.generateUpdate('test', data1)
      
      const start = performance.now()
      const update = incremental.generateUpdate('test', data2)
      const end = performance.now()

      console.log(`Diff time: ${(end - start).toFixed(2)}ms`)
      console.log(`Update type: ${update.type}`)
      console.log(`Change ratio: ${(update.changeRatio * 100).toFixed(1)}%`)

      expect(update.type).toBe('incremental')
      expect((end - start)).toBeLessThan(10)
    })

    it('should handle large objects efficiently', () => {
      const data1 = generateRandomObject(4, 10)
      const data2 = JSON.parse(JSON.stringify(data1))
      data2.key_0.key_1.key_2 = 'changed'

      incremental.generateUpdate('test', data1)
      
      const start = performance.now()
      const update = incremental.generateUpdate('test', data2)
      const end = performance.now()

      console.log(`Large object diff time: ${(end - start).toFixed(2)}ms`)
      console.log(`Diff operations: ${update.diff?.length || 0}`)

      expect((end - start)).toBeLessThan(50)
    })

    it('should calculate saved bytes accurately', () => {
      const data1 = generateTypicalMessage()
      const data2 = JSON.parse(JSON.stringify(data1))
      data2.data.messages[0].content = 'changed content here'

      incremental.generateUpdate('test', data1)
      const update = incremental.generateUpdate('test', data2)
      const stats = incremental.getStats()

      console.log(`Total saved bytes: ${stats.totalSavedBytes}`)
      console.log(`Incremental updates: ${stats.incrementalUpdates}`)

      expect(stats.totalSavedBytes).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Cache Benchmarks
  // ============================================================================

  describe('Cache Performance', () => {
    it('should provide fast cache access', () => {
      const data = generateTypicalMessage()
      
      // Warm up cache
      cache.set('test', data)
      
      // Benchmark get
      const start = performance.now()
      for (let i = 0; i < 10000; i++) {
        cache.get('test')
      }
      const end = performance.now()

      const avgTime = (end - start) / 10000
      console.log(`Average cache get time: ${avgTime.toFixed(4)}ms`)
      console.log(`Cache operations/second: ${(10000 / ((end - start) / 1000)).toFixed(0)}`)

      expect(avgTime).toBeLessThan(0.1)  // Sub-millisecond
    })

    it('should maintain high hit ratio', () => {
      const keys = Array.from({ length: 100 }, (_, i) => `key_${i}`)
      
      // Fill cache
      keys.forEach(key => cache.set(key, generateTypicalMessage()))

      // Access pattern: 80% hits on 20% of keys
      const hotKeys = keys.slice(0, 20)
      
      for (let i = 0; i < 1000; i++) {
        if (Math.random() < 0.8) {
          cache.get(hotKeys[Math.floor(Math.random() * hotKeys.length)])
        } else {
          cache.get(keys[Math.floor(Math.random() * keys.length)])
        }
      }

      const stats = cache.getStats()
      console.log(`Cache hit ratio: ${(stats.hitRatio * 100).toFixed(1)}%`)
      console.log(`Total hits: ${stats.totalHits}`)
      console.log(`Total misses: ${stats.totalMisses}`)

      expect(stats.hitRatio).toBeGreaterThan(0.7)
    })

    it('should handle cache eviction efficiently', () => {
      cache = getMessageCache({ maxSize: 1000 })
      
      const start = performance.now()
      
      // Add more entries than max size
      for (let i = 0; i < 2000; i++) {
        cache.set(`key_${i}`, { data: generateRandomString(100) })
      }
      
      const end = performance.now()

      console.log(`Cache eviction time for 2000 entries: ${(end - start).toFixed(2)}ms`)
      console.log(`Final cache size: ${cache.size()}`)

      expect(cache.size()).toBeLessThanOrEqual(1000)
      expect((end - start)).toBeLessThan(100)
    })
  })

  // ============================================================================
  // End-to-End Performance
  // ============================================================================

  describe('End-to-End Performance', () => {
    it('should meet overall performance targets', () => {
      const { getOptimizationManager } = require('../index')
      const manager = getOptimizationManager()

      const messages = Array.from({ length: 100 }, () => generateTypicalMessage())
      const start = performance.now()

      for (const msg of messages) {
        manager.processOutgoing('test', msg)
      }

      const end = performance.now()
      const stats = manager.getStats()

      console.log('\n=== Performance Summary ===')
      console.log(`Total processing time: ${(end - start).toFixed(2)}ms`)
      console.log(`Average per message: ${((end - start) / messages.length).toFixed(2)}ms`)
      console.log(`Overall compression ratio: ${(stats.overallCompressionRatio * 100).toFixed(1)}%`)
      console.log(`Total saved bytes: ${(stats.totalSavedBytes / 1024).toFixed(1)}KB`)

      // Verify performance targets
      expect((end - start) / messages.length).toBeLessThan(5)  // < 5ms per message
      expect(stats.overallCompressionRatio).toBeLessThan(0.5)  // 50%+ reduction
    })

    it('should maintain backward compatibility', () => {
      const { getOptimizationManager } = require('../index')
      const manager = getOptimizationManager()

      // Client without compression support
      const clientCaps = {
        supportsGzip: false,
        supportsBrotli: false,
        wantsCompression: false
      }

      const msg = generateTypicalMessage()
      const result = manager.processOutgoing('test', msg, {
        clientCaps
      })

      // Should still process without errors
      expect(result.processed).toBe(true)
    })
  })
})

// ============================================================================
// Run as standalone
// ============================================================================

if (require.main === module) {
  console.log('Running WebSocket Compression Performance Tests...\n')
}
