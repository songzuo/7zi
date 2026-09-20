// @ts-nocheck
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
import type { Server as SocketIOServer, Socket } from 'socket.io'

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

/**
 * Send callback type for WebSocket message delivery
 */
export type SendCallback = (message: WebSocketMessage | OptimizedMessage) => void

/**
 * Batch send callback type for batched WebSocket message delivery
 */
export type BatchSendCallback = (batch: MessageBatch) => void

/**
 * Configuration for the optimized message handler
 */
export interface OptimizedMessageHandlerConfig {
  compression?: CompressionConfig
  sendCallback?: SendCallback
  batchSendCallback?: BatchSendCallback
  roomId?: string
  socket?: Socket
  /**
   * Socket.IO server instance for direct access
   * Note: Use setServer() method to set this after initialization
   */
  server?: SocketIOServer
}

// ============================================
// Message Compression
// ============================================

export const defaultCompressionConfig: CompressionConfig = {
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
  private sendCallback: SendCallback | null = null
  private batchSendCallback: BatchSendCallback | null = null
  private socket: Socket | null = null
  private server: SocketIOServer | null = null
  private roomId?: string

  constructor(config: OptimizedMessageHandlerConfig = {}) {
    this.compressionConfig = config.compression ?? defaultCompressionConfig
    this.sendCallback = config.sendCallback ?? null
    this.batchSendCallback = config.batchSendCallback ?? null
    this.socket = config.socket ?? null
    this.server = config.server ?? null
    this.roomId = config.roomId

    this.batcher = new MessageBatcher(this.compressionConfig)

    this.batcher.onFlush((batch) => {
      this.processBatch(batch)
    })
  }

  /**
   * Set the send callback for single message delivery
   */
  onSend(callback: SendCallback): void {
    this.sendCallback = callback
  }

  /**
   * Set the batch send callback for batched message delivery
   */
  onBatchSend(callback: BatchSendCallback): void {
    this.batchSendCallback = callback
  }

  /**
   * Set the socket instance for direct sending
   */
  setSocket(socket: Socket): void {
    this.socket = socket
  }

  /**
   * Set the Socket.IO server instance for broadcasting
   */
  setServer(server: SocketIOServer): void {
    this.server = server
  }

  /**
   * Set the room ID for room-scoped messages
   */
  setRoomId(roomId: string): void {
    this.roomId = roomId
    this.batcher.setRoom(roomId)
  }

  /**
   * Send a message (potentially compressed/batched)
   */
  send(message: WebSocketMessage): void {
    const optimized = this.compressMessage(message)
    this.deliverMessage(optimized, message)
  }

  /**
   * Send a message immediately (bypass batching)
   */
  sendImmediate(message: WebSocketMessage): void {
    const optimized = this.compressMessage(message)
    this.deliverImmediate(optimized, message)
  }

  /**
   * Deliver a message through available channels
   * Priority: callback > socket > server instance
   */
  private deliverMessage(optimized: OptimizedMessage, original: WebSocketMessage): void {
    // Use custom send callback if provided
    if (this.sendCallback) {
      this.sendCallback(optimized)
      return
    }

    // Use socket instance if available
    if (this.socket) {
      if (optimized.compressed) {
        this.socket.emit('message:compressed', {
          compressed: optimized.compressed.toString('base64'),
          originalSize: optimized.originalSize,
          roomId: this.roomId,
        })
      } else if (optimized.batch && optimized.batch.length > 0) {
        this.socket.emit('message', {
          ...optimized.batch[0],
          roomId: this.roomId ?? optimized.batch[0].roomId,
        })
      }
      return
    }

    // Use server instance if available
    if (this.server) {
      if (optimized.compressed) {
        // Broadcast compressed message to room or globally
        if (this.roomId) {
          this.server.to(this.roomId).emit('message:compressed', {
            compressed: optimized.compressed.toString('base64'),
            originalSize: optimized.originalSize,
          })
        } else {
          this.server.emit('message:compressed', {
            compressed: optimized.compressed.toString('base64'),
            originalSize: optimized.originalSize,
          })
        }
      } else if (optimized.batch && optimized.batch.length > 0) {
        const msg = optimized.batch[0]
        if (this.roomId || msg.roomId) {
          this.server.to(this.roomId ?? msg.roomId!).emit('message', msg)
        } else {
          this.server.emit('message', msg)
        }
      }
    }
  }

  /**
   * Deliver a message immediately (no batching, direct send)
   */
  private deliverImmediate(optimized: OptimizedMessage, original: WebSocketMessage): void {
    this.deliverMessage(optimized, original)
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
    // Use custom batch send callback if provided
    if (this.batchSendCallback) {
      this.batchSendCallback(batch)
      return
    }

    // Compress the batch if beneficial
    const serialized = JSON.stringify(batch.messages)
    const originalSize = Buffer.byteLength(serialized, 'utf8')

    // Try compression for large batches
    if (originalSize > this.compressionConfig.thresholdBytes) {
      try {
        const compressed = gzipSync(serialized)
        if (compressed.length < originalSize) {
          this.deliverBatchCompressed(compressed, originalSize, batch)
          return
        }
      } catch (error) {
        console.warn('Batch compression failed:', error)
      }
    }

    // Deliver uncompressed batch
    this.deliverBatchUncompressed(batch)
  }

  /**
   * Deliver a compressed batch
   */
  private deliverBatchCompressed(
    compressed: Buffer,
    originalSize: number,
    batch: MessageBatch
  ): void {
    // Use socket instance if available
    if (this.socket) {
      this.socket.emit('message:batch:compressed', {
        compressed: compressed.toString('base64'),
        originalSize,
        count: batch.messages.length,
        roomId: batch.roomId ?? this.roomId,
        timestamp: batch.timestamp,
      })
      return
    }

    // Use server instance if available
    if (this.server) {
      const targetRoom = batch.roomId ?? this.roomId
      const payload = {
        compressed: compressed.toString('base64'),
        originalSize,
        count: batch.messages.length,
        timestamp: batch.timestamp,
      }
      if (targetRoom) {
        this.server.to(targetRoom).emit('message:batch:compressed', payload)
      } else {
        this.server.emit('message:batch:compressed', payload)
      }
    }
  }

  /**
   * Deliver an uncompressed batch
   */
  private deliverBatchUncompressed(batch: MessageBatch): void {
    // Use socket instance if available
    if (this.socket) {
      this.socket.emit('message:batch', {
        messages: batch.messages,
        count: batch.messages.length,
        roomId: batch.roomId ?? this.roomId,
        timestamp: batch.timestamp,
      })
      return
    }

    // Use server instance if available
    if (this.server) {
      const targetRoom = batch.roomId ?? this.roomId
      const payload = {
        messages: batch.messages,
        count: batch.messages.length,
        timestamp: batch.timestamp,
      }
      if (targetRoom) {
        this.server.to(targetRoom).emit('message:batch', payload)
      } else {
        this.server.emit('message:batch', payload)
      }
    }
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
  config?: OptimizedMessageHandlerConfig
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
  defaultCompressionConfig,
}