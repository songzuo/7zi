// @ts-nocheck
/**
 * WebSocket Compression Manager
 * 
 * Features:
 * - Gzip and Brotli compression for large messages
 * - Adaptive compression based on message size
 * - Backward compatible (supports uncompressed clients)
 * - Compression statistics tracking
 * 
 * Technical Stack: Node.js zlib + Socket.IO
 * 
 * @author Executor Subagent
 * @date 2026-04-03
 */

import zlib from 'zlib'
import { createHash } from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface CompressionConfig {
  /** Minimum message size to compress (bytes) */
  minCompressSize?: number
  /** Maximum message size to compress (bytes) */
  maxCompressSize?: number
  /** Default compression method */
  defaultMethod?: 'gzip' | 'brotli'
  /** Compression level (0-9) */
  compressionLevel?: number
  /** Enable adaptive compression */
  adaptive?: boolean
  /** Cache compressed messages */
  enableCache?: boolean
  /** Maximum cache size */
  maxCacheSize?: number
  /** Cache TTL in milliseconds */
  cacheTTL?: number
  /** Enable statistics */
  enableStats?: boolean
}

export interface CompressedMessage {
  original: Buffer
  compressed: Buffer
  method: 'gzip' | 'brotli'
  originalSize: number
  compressedSize: number
  compressionRatio: number
  hash: string
  timestamp: number
}

export interface CompressionStats {
  totalMessages: number
  compressedMessages: number
  totalOriginalSize: number
  totalCompressedSize: number
  averageCompressionRatio: number
  methodCounts: {
    gzip: number
    brotli: number
  }
  compressionTime: number
  decompressionTime: number
  cacheHits: number
  cacheMisses: number
}

export interface ClientCapabilities {
  /** Client supports gzip */
  supportsGzip: boolean
  /** Client supports brotli */
  supportsBrotli: boolean
  /** Client wants compression */
  wantsCompression: boolean
}

// ============================================================================
// Cache Entry
// ============================================================================

interface CacheEntry {
  compressed: Buffer
  method: 'gzip' | 'brotli'
  compressedSize: number
  timestamp: number
  hitCount: number
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<CompressionConfig, 'enableStats'>> = {
  minCompressSize: 1024,        // 1KB
  maxCompressSize: 1024 * 1024,  // 1MB
  defaultMethod: 'brotli',
  compressionLevel: 6,
  adaptive: true,
  enableCache: true,
  maxCacheSize: 1000,
  cacheTTL: 5 * 60 * 1000      // 5 minutes
}

// ============================================================================
// Compression Manager
// ============================================================================

export class CompressionManager {
  private config: Required<Omit<CompressionConfig, 'enableStats'>>
  private statsEnabled: boolean
  private cache: Map<string, CacheEntry>
  private stats: CompressionStats
  
  constructor(config: CompressionConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    }
    this.statsEnabled = config.enableStats ?? false
    this.cache = new Map()
    this.stats = {
      totalMessages: 0,
      compressedMessages: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      averageCompressionRatio: 0,
      methodCounts: {
        gzip: 0,
        brotli: 0
      },
      compressionTime: 0,
      decompressionTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
  }

  /**
   * Compress message data
   */
  public compress(
    data: string | Buffer,
    method?: 'gzip' | 'brotli',
    clientCaps?: ClientCapabilities
  ): CompressedMessage | Buffer {
    const startTime = Date.now()
    
    // Convert to buffer if needed
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
    const originalSize = buffer.length
    
    // Update stats
    if (this.statsEnabled) {
      this.stats.totalMessages++
      this.stats.totalOriginalSize += originalSize
    }
    
    // Check if message is within compression range
    if (originalSize < this.config.minCompressSize || originalSize > this.config.maxCompressSize) {
      return buffer
    }
    
    // Determine compression method
    let compressionMethod = method ?? this.config.defaultMethod
    
    // Check client capabilities
    if (clientCaps) {
      if (compressionMethod === 'brotli' && !clientCaps.supportsBrotli && clientCaps.supportsGzip) {
        compressionMethod = 'gzip'
      } else if (compressionMethod === 'gzip' && !clientCaps.supportsGzip && clientCaps.supportsBrotli) {
        compressionMethod = 'brotli'
      }
      
      // Check if client wants compression
      if (!clientCaps.wantsCompression) {
        return buffer
      }
    }
    
    // Adaptive compression: try both methods and pick best
    if (this.config.adaptive && !method) {
      compressionMethod = this.getBestCompressionMethod(buffer)
    }
    
    // Check cache
    if (this.config.enableCache) {
      const hash = this.calculateHash(buffer)
      const cached = this.cache.get(hash)
      
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        // Cache hit
        if (this.statsEnabled) {
          this.stats.cacheHits++
        }
        
        cached.hitCount++
        
        return {
          original: buffer,
          compressed: cached.compressed,
          method: cached.method,
          originalSize,
          compressedSize: cached.compressedSize,
          compressionRatio: cached.compressedSize / originalSize,
          hash,
          timestamp: cached.timestamp
        }
      } else if (cached) {
        // Cache expired, remove it
        this.cache.delete(hash)
      }
      
      if (this.statsEnabled) {
        this.stats.cacheMisses++
      }
    }
    
    // Compress the data
    let compressed: Buffer
    try {
      compressed = this.performCompression(buffer, compressionMethod)
    } catch (error) {
      console.error('[CompressionManager] Compression failed:', error)
      return buffer
    }
    
    // Calculate compression ratio
    const compressionRatio = compressed.length / originalSize
    
    // Check if compression was effective (should reduce size by at least 10%)
    if (compressionRatio > 0.9) {
      // Compression not effective, return original
      return buffer
    }
    
    const result: CompressedMessage = {
      original: buffer,
      compressed,
      method: compressionMethod,
      originalSize,
      compressedSize: compressed.length,
      compressionRatio,
      hash: this.calculateHash(buffer),
      timestamp: Date.now()
    }
    
    // Update stats
    if (this.statsEnabled) {
      this.stats.compressedMessages++
      this.stats.totalCompressedSize += compressed.length
      this.stats.methodCounts[compressionMethod]++
      this.stats.compressionTime += Date.now() - startTime
      
      // Update average ratio
      this.stats.averageCompressionRatio = 
        (this.stats.averageCompressionRatio * (this.stats.compressedMessages - 1) + compressionRatio) /
        this.stats.compressedMessages
    }
    
    // Cache the result
    if (this.config.enableCache) {
      this.cacheResult(result)
    }
    
    return result
  }

  /**
   * Decompress message data
   */
  public decompress(data: Buffer, method: 'gzip' | 'brotli'): Buffer {
    const startTime = Date.now()
    
    try {
      let decompressed: Buffer
      
      if (method === 'gzip') {
        decompressed = zlib.gunzipSync(data)
      } else {
        decompressed = zlib.brotliDecompressSync(data)
      }
      
      // Update stats
      if (this.statsEnabled) {
        this.stats.decompressionTime += Date.now() - startTime
      }
      
      return decompressed
    } catch (error) {
      console.error('[CompressionManager] Decompression failed:', error)
      throw error
    }
  }

  /**
   * Check if message is compressed
   */
  public isCompressed(data: Buffer): boolean {
    // Gzip magic number: 1f 8b
    if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
      return true
    }
    
    // Brotli magic number (not reliable, but common patterns)
    // Brotli doesn't have a fixed magic number, so we'll try to decompress
    return false
  }

  /**
   * Get compression statistics
   */
  public getStats(): CompressionStats {
    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      totalMessages: 0,
      compressedMessages: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      averageCompressionRatio: 0,
      methodCounts: {
        gzip: 0,
        brotli: 0
      },
      compressionTime: 0,
      decompressionTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  public getCacheSize(): number {
    return this.cache.size
  }

  /**
   * Parse client capabilities from headers
   */
  public parseClientCapabilities(headers: Record<string, string | string[] | undefined>): ClientCapabilities {
    const acceptEncoding = headers['accept-encoding'] || headers['Accept-Encoding'] || ''
    
    return {
      supportsGzip: acceptEncoding.includes('gzip'),
      supportsBrotli: acceptEncoding.includes('br'),
      wantsCompression: acceptEncoding.length > 0
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private performCompression(buffer: Buffer, method: 'gzip' | 'brotli'): Buffer {
    if (method === 'gzip') {
      return zlib.gzipSync(buffer, { level: this.config.compressionLevel })
    } else {
      return zlib.brotliCompressSync(buffer, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: this.config.compressionLevel
        }
      })
    }
  }

  private getBestCompressionMethod(buffer: Buffer): 'gzip' | 'brotli' {
    // For small messages, gzip is usually faster
    if (buffer.length < 4096) {
      return 'gzip'
    }
    
    // For larger messages, brotli usually has better compression
    return 'brotli'
  }

  private calculateHash(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex')
  }

  private cacheResult(result: CompressedMessage): void {
    // Clean old entries if cache is full
    if (this.cache.size >= this.config.maxCacheSize) {
      this.cleanOldCacheEntries()
    }
    
    this.cache.set(result.hash, {
      compressed: result.compressed,
      method: result.method,
      compressedSize: result.compressedSize,
      timestamp: result.timestamp,
      hitCount: 0
    })
  }

  private cleanOldCacheEntries(): void {
    // Remove expired entries
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.cacheTTL) {
        this.cache.delete(key)
      }
    }
    
    // If still full, remove least frequently accessed
    if (this.cache.size >= this.config.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].hitCount - b[1].hitCount)
      
      const toRemove = entries.slice(0, entries.length - this.config.maxCacheSize + 1)
      for (const [key] of toRemove) {
        this.cache.delete(key)
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let compressionManagerInstance: CompressionManager | null = null

export function getCompressionManager(config?: CompressionConfig): CompressionManager {
  if (!compressionManagerInstance) {
    compressionManagerInstance = new CompressionManager(config)
  }
  return compressionManagerInstance
}

export function resetCompressionManager(): void {
  compressionManagerInstance = null
}
