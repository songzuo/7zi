/**
 * WebSocket Compression Integration
 *
 * Integrates compression and optimization features with Socket.IO server
 *
 * @author Executor Subagent
 * @date 2026-04-03
 */

import { Server as SocketIOServer, Socket } from 'socket.io'
import { getOptimizationManager, type OptimizationConfig, type OptimizationStats } from './index'
import { logger } from '@/lib/logger'

// ============================================================================
// Types
// ============================================================================

export interface CompressionIntegrationConfig extends OptimizationConfig {
  /** Enable compression middleware */
  enableMiddleware?: boolean
  /** Enable client capability detection */
  detectCapabilities?: boolean
  /** Enable automatic optimization */
  autoOptimize?: boolean
  /** Log optimization statistics */
  logStats?: boolean
  /** Stats logging interval (ms) */
  statsInterval?: number
}

export interface OptimizedSocket extends Socket {
  clientCapabilities?: {
    supportsGzip: boolean
    supportsBrotli: boolean
    wantsCompression: boolean
  }
  optimizationEnabled?: boolean
}

// ============================================================================
// Integration Functions
// ============================================================================

/**
 * Initialize compression optimization for Socket.IO server
 */
export function initializeCompression(
  io: SocketIOServer,
  config: CompressionIntegrationConfig = {}
): void {
  const {
    enableMiddleware = true,
    detectCapabilities = true,
    autoOptimize = true,
    logStats = false,
    statsInterval = 60000,
    ...optimizationConfig
  } = config

  // Get optimization manager
  const optimizationManager = getOptimizationManager(optimizationConfig)

  logger.info('[WebSocket Compression] Initializing compression optimization')

  // Set up middleware
  if (enableMiddleware) {
    io.use((socket: OptimizedSocket, next) => {
      // Detect client capabilities
      if (detectCapabilities) {
        const handshake = socket.handshake
        const headers = handshake.headers || {}
        
        socket.clientCapabilities = {
          supportsGzip: headers['accept-encoding']?.includes('gzip') ?? false,
          supportsBrotli: headers['accept-encoding']?.includes('br') ?? false,
          wantsCompression: (headers['accept-encoding']?.length ?? 0) > 0
        }
        
        socket.optimizationEnabled = autoOptimize
        
        logger.debug('[WebSocket Compression] Client capabilities:', {
          id: socket.id,
          capabilities: socket.clientCapabilities,
          optimizationEnabled: socket.optimizationEnabled
        })
      }
      
      next()
    })
  }

  // Set up connection handler
  io.on('connection', (socket: OptimizedSocket) => {
    logger.debug('[WebSocket Compression] Client connected:', { socketId: socket.id })

    // Handle optimization requests
    socket.on('ws:optimize', (data: { enabled?: boolean }) => {
      if (typeof data.enabled === 'boolean') {
        socket.optimizationEnabled = data.enabled
        socket.emit('ws:optimized', { enabled: data.enabled })
        logger.debug('[WebSocket Compression] Optimization toggled:', {
          id: socket.id,
          enabled: data.enabled
        })
      }
    })

    // Handle stats request
    socket.on('ws:stats', () => {
      const stats = optimizationManager.getStats()
      socket.emit('ws:stats', stats)
    })

    // Handle cache clear request
    socket.on('ws:clear_cache', () => {
      optimizationManager.clearAllCaches()
      socket.emit('ws:cache_cleared')
      logger.debug('[WebSocket Compression] Cache cleared by client:', { socketId: socket.id })
    })

    // Override emit to apply optimizations
    const originalEmit = socket.emit.bind(socket)
    
    socket.emit = function(event: string, ...args: unknown[]): boolean {
      if (!socket.optimizationEnabled) {
        return originalEmit(event, ...args) as boolean
      }

      try {
        // Process outgoing message
        const result = optimizationManager.processOutgoing(event, args[0], {
          clientCaps: socket.clientCapabilities,
          priority: event.startsWith('urgent:') ? 3 : 1
        })

        // If batched, don't emit immediately
        if (result.messageId && !result.compressed && !result.incremental) {
          // Message was batched
          return true
        }

        // If compressed, send compressed data
        if (result.compressed) {
          return originalEmit(event, {
            type: 'compressed',
            method: result.compressed.method,
            data: result.compressed.compressed.toString('base64'),
            originalSize: result.compressed.originalSize,
            compressedSize: result.compressed.compressedSize
          }) as boolean
        }

        // If incremental, send diff
        if (result.incremental) {
          return originalEmit(event, {
            type: 'incremental',
            diff: result.incremental.diff,
            originalHash: result.incremental.originalHash,
            newHash: result.incremental.newHash
          }) as boolean
        }

        // Otherwise, send as-is
        return originalEmit(event, ...args) as boolean
      } catch (error) {
        logger.error('[WebSocket Compression] Error processing outgoing message:', error)
        return originalEmit(event, ...args) as boolean
      }
    }

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.debug('[WebSocket Compression] Client disconnected:', { socketId: socket.id })
    })
  })

  // Set up batch flush interval
  if (autoOptimize) {
    setInterval(() => {
      const batch = optimizationManager.flushBatch()
      if (batch) {
        logger.debug('[WebSocket Compression] Flushed batch:', {
          batchId: batch.batchId,
          messageCount: batch.messageCount,
          totalSize: batch.totalSize
        })
      }
    }, 10) // Flush every 10ms
  }

  // Set up stats logging
  if (logStats) {
    setInterval(() => {
      const stats = optimizationManager.getStats()
      logger.info('[WebSocket Compression] Statistics:', {
        totalMessages: stats.totalMessagesProcessed,
        totalSavedBytes: stats.totalSavedBytes,
        compressionRatio: stats.overallCompressionRatio,
        cacheHitRatio: stats.cache.hitRatio,
        averageBatchSize: stats.batching.averageBatchSize
      })
    }, statsInterval)
  }

  logger.info('[WebSocket Compression] Compression optimization initialized')
}

/**
 * Create optimized emit function for server-wide broadcasts
 */
export function createOptimizedEmit(
  io: SocketIOServer,
  event: string,
  data: unknown,
  options?: {
    room?: string
    namespace?: string
    skipCompression?: boolean
    skipCache?: boolean
  }
): void {
  const optimizationManager = getOptimizationManager()

  try {
    // Process message
    const result = optimizationManager.processOutgoing(event, data, {
      skipCompression: options?.skipCompression,
      skipCache: options?.skipCache
    })

    // Emit to target
    if (options?.room) {
      io.to(options.room).emit(event, data)
    } else if (options?.namespace) {
      io.of(options.namespace).emit(event, data)
    } else {
      io.emit(event, data)
    }
  } catch (error) {
    logger.error('[WebSocket Compression] Error in optimized emit:', error)
    // Fallback to normal emit
    if (options?.room) {
      io.to(options.room).emit(event, data)
    } else if (options?.namespace) {
      io.of(options.namespace).emit(event, data)
    } else {
      io.emit(event, data)
    }
  }
}

/**
 * Middleware for handling compressed messages from clients
 */
export function createCompressionMiddleware() {
  return (socket: OptimizedSocket, next: (err?: Error) => void) => {
    socket.on('message', (data: unknown) => {
      const optimizationManager = getOptimizationManager()

      // Check if message is compressed
      if (data && typeof data === 'object' && 'type' in data && data.type === 'compressed') {
        try {
          const compressedData = data as { type: string; data: string; method: string }
          const compressed = Buffer.from(compressedData.data, 'base64')
          const decompressed = optimizationManager.processIncoming(compressed, {
            decompress: true
          })
          
          // Emit decompressed message
          socket.emit('message', decompressed)
        } catch (error) {
          logger.error('[WebSocket Compression] Error decompressing message:', error)
        }
      } else if (data && typeof data === 'object' && 'type' in data && data.type === 'incremental') {
        // Handle incremental update
        // Application layer should handle this
        socket.emit('incremental_update', data)
      } else {
        // Normal message
        socket.emit('message', data)
      }
    })

    next()
  }
}

/**
 * Get optimization statistics for monitoring
 */
export function getCompressionStats(): OptimizationStats {
  const optimizationManager = getOptimizationManager()
  return optimizationManager.getStats()
}

/**
 * Reset optimization system
 */
export function resetCompressionSystem(): void {
  const optimizationManager = getOptimizationManager()
  optimizationManager.resetStats()
  optimizationManager.clearAllCaches()
  logger.info('[WebSocket Compression] System reset')
}

/**
 * Enable/disable optimizations globally
 */
export function setCompressionEnabled(enabled: boolean): void {
  const optimizationManager = getOptimizationManager()
  optimizationManager.setEnabled(enabled)
  logger.info('[WebSocket Compression] Optimizations', enabled ? 'enabled' : 'disabled')
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if client supports compression
 */
export function clientSupportsCompression(socket: OptimizedSocket): boolean {
  return socket.clientCapabilities?.wantsCompression ?? false
}

/**
 * Check if client supports specific compression method
 */
export function clientSupportsMethod(
  socket: OptimizedSocket,
  method: 'gzip' | 'brotli'
): boolean {
  if (method === 'gzip') {
    return socket.clientCapabilities?.supportsGzip ?? false
  }
  return socket.clientCapabilities?.supportsBrotli ?? false
}

/**
 * Get client capabilities
 */
export function getClientCapabilities(socket: OptimizedSocket): OptimizedSocket['clientCapabilities'] {
  return socket.clientCapabilities
}