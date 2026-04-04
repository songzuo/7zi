/**
 * WebSocket Compression & Optimization System
 * 
 * Integrated optimization system for WebSocket communications:
 * - Message compression (gzip/brotli)
 * - Batch message processing
 * - Incremental updates
 * - Message caching
 * 
 * @author Executor Subagent
 * @date 2026-04-03
 */

export { CompressionManager, getCompressionManager, resetCompressionManager } from './compression-manager'
export { BatchMessageProcessor, getBatchProcessor, resetBatchProcessor, MessagePriority } from './batch-message-processor'
export { IncrementalUpdateManager, getIncrementalUpdateManager, resetIncrementalUpdateManager } from './incremental-update'
export { MessageCache, getMessageCache, resetMessageCache, createCacheKey, parseCacheKey, generateMessageCacheKey } from './message-cache'

export type {
  CompressionConfig,
  CompressedMessage,
  CompressionStats,
  ClientCapabilities
} from './compression-manager'

export type {
  BatchConfig,
  QueuedMessage,
  BatchResult,
  BatchStats
} from './batch-message-processor'

export type {
  DiffConfig,
  DiffResult,
  DiffOperation,
  StateSnapshot,
  IncrementalUpdateStats
} from './incremental-update'

export type {
  CacheConfig,
  CacheEntry,
  CacheStats,
  CacheOptions
} from './message-cache'

// ============================================================================
// Integrated Optimization Manager
// ============================================================================

import { CompressionManager, type CompressionConfig } from './compression-manager'
import { BatchMessageProcessor, type BatchConfig, MessagePriority } from './batch-message-processor'
import { IncrementalUpdateManager, type DiffConfig } from './incremental-update'
import { MessageCache, type CacheConfig } from './message-cache'

export interface OptimizationConfig {
  compression?: CompressionConfig
  batching?: BatchConfig
  incremental?: DiffConfig
  cache?: CacheConfig
  /** Enable all optimizations */
  enableAll?: boolean
}

export interface OptimizationStats {
  compression: CompressionStats
  batching: BatchStats
  incremental: IncrementalUpdateStats
  cache: CacheStats
  totalSavedBytes: number
  totalMessagesProcessed: number
  overallCompressionRatio: number
}

export interface ProcessOutgoingOptions {
  priority?: MessagePriority
  target?: string | string[]
  skipCache?: boolean
  skipCompression?: boolean
  skipBatching?: boolean
  skipIncremental?: boolean
  clientCaps?: ClientCapabilities
}

export interface ProcessOutgoingResult {
  processed: boolean
  messageId?: string
  batchId?: string
  compressed?: CompressedMessage
  incremental?: DiffResult
  cached?: boolean
}

/**
 * Integrated WebSocket Optimization Manager
 * 
 * Combines all optimization techniques into a single interface
 */
export class WebSocketOptimizationManager {
  private compression: CompressionManager
  private batching: BatchMessageProcessor
  private incremental: IncrementalUpdateManager
  private cache: MessageCache
  private enabled: boolean

  constructor(config: OptimizationConfig = {}) {
    this.compression = getCompressionManager(config.compression)
    this.batching = getBatchProcessor(config.batching)
    this.incremental = getIncrementalUpdateManager(config.incremental)
    this.cache = getMessageCache(config.cache)
    this.enabled = config.enableAll !== false
  }

  /**
   * Process outgoing message with all optimizations
   */
  public processOutgoing(
    event: string,
    data: unknown,
    options: ProcessOutgoingOptions = {}
  ): ProcessOutgoingResult {
    if (!this.enabled) {
      return { processed: false }
    }

    const result: ProcessOutgoingResult = { processed: false }

    // 1. Check cache first
    if (!options.skipCache) {
      const cacheKey = generateMessageCacheKey(event, data)
      const cached = this.cache.get(cacheKey)
      
      if (cached) {
        result.cached = true
        result.processed = true
        return result
      }
    }

    // 2. Incremental update
    if (!options.skipIncremental) {
      const update = this.incremental.generateUpdate(event, data)
      
      if (update.type === 'incremental') {
        result.incremental = update
        result.processed = true
      }
    }

    // 3. Compression
    if (!options.skipCompression) {
      const compressed = this.compression.compress(data, undefined, options.clientCaps)
      
      if (compressed && typeof compressed === 'object' && 'compressed' in compressed) {
        result.compressed = compressed
        result.processed = true
      }
    }

    // 4. Batching
    if (!options.skipBatching) {
      const messageId = this.batching.add(
        event,
        data,
        options.priority ?? MessagePriority.NORMAL,
        options.target
      )
      
      result.messageId = messageId
      result.processed = true
    }

    // Cache the result
    if (!options.skipCache && result.processed) {
      const cacheKey = generateMessageCacheKey(event, data)
      this.cache.set(cacheKey, data)
    }

    return result
  }

  /**
   * Process incoming message
   */
  public processIncoming(
    data: unknown,
    options: {
      decompress?: boolean
      applyDiff?: boolean
      checkCache?: boolean
    } = {}
  ): unknown {
    if (!this.enabled) {
      return data
    }

    let result = data

    // 1. Check cache
    if (options.checkCache) {
      const cacheKey = generateMessageCacheKey('incoming', data)
      const cached = this.cache.get(cacheKey)
      
      if (cached) {
        return cached.data
      }
    }

    // 2. Decompress
    if (options.decompress && Buffer.isBuffer(data)) {
      try {
        // Try gzip first
        result = this.compression.decompress(data, 'gzip')
      } catch {
        try {
          // Try brotli
          result = this.compression.decompress(data, 'brotli')
        } catch {
          // Not compressed, use as-is
          result = data
        }
      }
    }

    // 3. Apply diff
    if (options.applyDiff && result && typeof result === 'object') {
      if (result.type === 'incremental' && result.diff) {
        // Need previous state to apply diff
        // This would be handled by the application layer
        result.diff = result.diff
      }
    }

    return result
  }

  /**
   * Flush batched messages
   */
  public flushBatch(): BatchResult | null {
    return this.batching.flush()
  }

  /**
   * Get combined statistics
   */
  public getStats(): OptimizationStats {
    const compressionStats = this.compression.getStats()
    const batchingStats = this.batching.getStats()
    const incrementalStats = this.incremental.getStats()
    const cacheStats = this.cache.getStats()

    const totalSavedBytes = 
      (compressionStats.totalOriginalSize - compressionStats.totalCompressedSize) +
      incrementalStats.totalSavedBytes

    const totalMessagesProcessed = compressionStats.totalMessages

    const overallCompressionRatio = 
      compressionStats.totalOriginalSize > 0
        ? compressionStats.totalCompressedSize / compressionStats.totalOriginalSize
        : 1

    return {
      compression: compressionStats,
      batching: batchingStats,
      incremental: incrementalStats,
      cache: cacheStats,
      totalSavedBytes,
      totalMessagesProcessed,
      overallCompressionRatio
    }
  }

  /**
   * Reset all statistics
   */
  public resetStats(): void {
    this.compression.resetStats()
    this.batching.getStats() // Reset via new instance if needed
    this.incremental.resetStats()
    this.cache.resetStats()
  }

  /**
   * Clear all caches
   */
  public clearAllCaches(): void {
    this.compression.clearCache()
    this.batching.clearQueue()
    this.incremental.clearAllStates()
    this.cache.clear()
  }

  /**
   * Enable/disable optimizations
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Check if optimizations are enabled
   */
  public isEnabled(): boolean {
    return this.enabled
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let optimizationManagerInstance: WebSocketOptimizationManager | null = null

export function getOptimizationManager(config?: OptimizationConfig): WebSocketOptimizationManager {
  if (!optimizationManagerInstance) {
    optimizationManagerInstance = new WebSocketOptimizationManager(config)
  }
  return optimizationManagerInstance
}

export function resetOptimizationManager(): void {
  optimizationManagerInstance = null
}