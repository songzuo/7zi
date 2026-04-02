/**
 * WebSocket Message Compression and Optimization
 *
 * Performance improvements:
 * - Message compression (gzip)
 * - Batch message merging
 * - Delta updates for efficient synchronization
 *
 * @module lib/websocket/optimized-message
 * @version 2.0.0
 */

import { createGzip, createUnzip, gzipSync, unzipSync } from 'zlib'

// ============================================
// Types
// ============================================

export interface WebSocketMessage {
  type: string
  payload: unknown
  timestamp: number
  roomId?: string
  userId?: string
}

export interface OptimizedMessage {
  // Delta update identifier
  delta?: boolean
  // Previous message hash for delta computation
  deltaHash?: string
  // Batch messages
  batch?: WebSocketMessage[]
  // Compressed data
  compressed?: Buffer
  // Original message (for compressed)
  originalSize?: number
}

export interface MessageBatch {
  messages: WebSocketMessage[]
  timestamp: number
  roomId?: string
}

export interface CompressionConfig {
  enabled: boolean
  thresholdBytes: number // Only compress if > this size
  batchSize: number // Max messages in a batch
  batchTimeoutMs: number // Max time to wait for batching
}

// ============================================
// Message Compression
// ============================================

const defaultCompressionConfig: CompressionConfig = {
  enabled: true,
  thresholdBytes: 1024, // 1KB
  batchSize: 10,
  batchTimeoutMs: 50,
}

/**
 * Compress a message using gzip
 * Returns the original message if compression is not beneficial
 */
export function compressMessage(
  message: WebSocketMessage,
  config: CompressionConfig = defaultCompressionConfig
): OptimizedMessage {
  if (!config.enabled) {
    return { batch: [message] }
  }

  const serialized = JSON.stringify(message)
  const originalSize = Buffer.byteLength(serialized, 'utf8')

  // Don't compress small messages
  if (originalSize < config.thresholdBytes) {
    return { batch: [message], originalSize }
  }

  try {
    const compressed = gzipSync(serialized)
    const compressedSize = compressed.length

    // Only use compression if it actually reduces size
    if (compressedSize < originalSize) {
      return {
        compressed,
        originalSize,
      }
    }
  } catch (error) {
    console.warn('Compression failed:', error)
  }

  // Fallback to original
  return { batch: [message], originalSize }
}

/**
 * Decompress a message
 */
export function decompressMessage(optimized: OptimizedMessage): WebSocketMessage | null {
  if (optimized.compressed) {
    try {
      const decompressed = unzipSync(optimized.compressed)
      return JSON.parse(decompressed.toString('utf8'))
    } catch (error) {
      console.warn('Decompression failed:', error)
      return null
    }
  }

  if (optimized.batch && optimized.batch.length > 0) {
    return optimized.batch[0]
  }

  return null
}

// ============================================
// Message Batching
// ============================================

export class MessageBatcher {
  private config: CompressionConfig
  private pending: WebSocketMessage[] = []
  private timeoutId: NodeJS.Timeout | null = null
  private flushCallback: ((batch: MessageBatch) => void) | null = null
  private roomId?: string

  constructor(config: CompressionConfig = defaultCompressionConfig) {
    this.config = config
  }

  /**
   * Add a message to the batch
   */
  add(message: WebSocketMessage): void {
    this.pending.push(message)

    // Flush if batch is full
    if (this.pending.length >= this.config.batchSize) {
      this.flush()
    } else if (!this.timeoutId) {
      // Start timeout for partial batch
      this.timeoutId = setTimeout(() => {
        this.flush()
      }, this.config.batchTimeoutMs)
    }
  }

  /**
   * Set the flush callback
   */
  onFlush(callback: (batch: MessageBatch) => void): void {
    this.flushCallback = callback
  }

  /**
   * Set room context
   */
  setRoom(roomId: string): void {
    this.roomId = roomId
  }

  /**
   * Flush the batch immediately
   */
  flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    if (this.pending.length === 0) {
      return
    }

    const batch: MessageBatch = {
      messages: [...this.pending],
      timestamp: Date.now(),
      roomId: this.roomId,
    }

    this.pending = []

    if (this.flushCallback) {
      this.flushCallback(batch)
    }
  }

  /**
   * Get current batch size
   */
  get size(): number {
    return this.pending.length
  }

  /**
   * Destroy the batcher
   */
  destroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.pending = []
  }
}

// ============================================
// Delta Update System
// ============================================

interface DeltaState {
  key: string
  value: unknown
  version: number
}

/**
 * Calculate delta between two states
 */
export function computeDelta(
  oldState: Record<string, unknown>,
  newState: Record<string, unknown>
): Record<string, unknown> {
  const delta: Record<string, unknown> = {}

  for (const key in newState) {
    if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
      delta[key] = newState[key]
    }
  }

  return delta
}

/**
 * Apply delta to old state
 */
export function applyDelta(
  oldState: Record<string, unknown>,
  delta: Record<string, unknown>
): Record<string, unknown> {
  return { ...oldState, ...delta }
}

/**
 * Simple hash function for delta tracking
 */
export function hashMessage(message: WebSocketMessage): string {
  const str = JSON.stringify(message)
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  return hash.toString(16)
}

// ============================================
// Optimized Message Handler
// ============================================

export class OptimizedMessageHandler {
  private batcher: MessageBatcher
  private compressionConfig: CompressionConfig
  private useCompression: boolean = true

  constructor(compressionConfig: CompressionConfig = defaultCompressionConfig) {
    this.compressionConfig = compressionConfig
    this.batcher = new MessageBatcher(compressionConfig)

    this.batcher.onFlush((batch) => {
      this.processBatch(batch)
    })
  }

  /**
   * Send a message (potentially compressed/batched)
   */
  send(message: WebSocketMessage): void {
    // For now, just send directly
    // In production, this would integrate with Socket.IO
    const optimized = this.compressMessage(message)
    // TODO: Send to WebSocket
  }

  /**
   * Send a message immediately (bypass batching)
   */
  sendImmediate(message: WebSocketMessage): void {
    const optimized = this.compressMessage(message)
    // TODO: Send to WebSocket
  }

  /**
   * Get optimized message
   */
  private compressMessage(message: WebSocketMessage): OptimizedMessage {
    return compressMessage(message, this.compressionConfig)
  }

  /**
   * Process a batch of messages
   */
  private processBatch(batch: MessageBatch): void {
    // TODO: Send batch to WebSocket
  }

  /**
   * Enable/disable compression
   */
  setCompression(enabled: boolean): void {
    this.useCompression = enabled
  }

  /**
   * Get current batch size
   */
  getPendingCount(): number {
    return this.batcher.size
  }

  /**
   * Flush pending messages
   */
  flush(): void {
    this.batcher.flush()
  }

  /**
   * Destroy the handler
   */
  destroy(): void {
    this.batcher.destroy()
  }
}

// ============================================
// Factory Functions
// ============================================

export function createMessageBatcher(
  config?: CompressionConfig
): MessageBatcher {
  return new MessageBatcher(config)
}

export function createOptimizedMessageHandler(
  config?: CompressionConfig
): OptimizedMessageHandler {
  return new OptimizedMessageHandler(config)
}

// ============================================
// Default Export
// ============================================

export default {
  compressMessage,
  decompressMessage,
  computeDelta,
  applyDelta,
  hashMessage,
  MessageBatcher,
  OptimizedMessageHandler,
  createMessageBatcher,
  createOptimizedMessageHandler,
}