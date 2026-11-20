// @ts-nocheck
/**
 * WebSocket Message Cache Layer
 * 
 * Features:
 * - Intelligent message caching to reduce redundant transmissions
 * - TTL-based cache expiry
 * - LRU eviction policy
 * - Cache hit statistics
 * - Content-addressed storage
 * 
 * Technical Stack: Node.js + Map + Custom LRU
 * 
 * @author Executor Subagent
 * @date 2026-04-03
 */

import { createHash } from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface CacheConfig {
  /** Maximum cache size (number of entries) */
  maxSize?: number
  /** Maximum cache memory in bytes */
  maxMemory?: number
  /** Default TTL in milliseconds */
  defaultTTL?: number
  /** Enable statistics tracking */
  enableStats?: boolean
  /** Enable compression for cached data */
  compressData?: boolean
  /** Cache key prefix */
  keyPrefix?: string
}

export interface CacheEntry<T = unknown> {
  key: string
  data: T
  hash: string
  size: number
  timestamp: number
  expiry: number
  hitCount: number
  lastAccess: number
  compressed: boolean
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  totalHits: number
  totalMisses: number
  totalEvictions: number
  hitRatio: number
  averageEntrySize: number
  averageAge: number
  topKeys: Array<{ key: string; hits: number; size: number }>
  memoryUsage: number
}

export interface CacheOptions {
  /** Custom TTL for this entry */
  ttl?: number
  /** Skip cache for this operation */
  skipCache?: boolean
  /** Force refresh cache */
  forceRefresh?: boolean
  /** Custom hash for deduplication */
  hash?: string
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<CacheConfig, 'enableStats'>> = {
  maxSize: 10000,
  maxMemory: 100 * 1024 * 1024,  // 100MB
  defaultTTL: 5 * 60 * 1000,      // 5 minutes
  compressData: false,
  keyPrefix: 'ws_cache:'
}

// ============================================================================
// Message Cache
// ============================================================================

export class MessageCache<T = unknown> {
  private config: Required<Omit<CacheConfig, 'enableStats'>>
  private statsEnabled: boolean
  private cache: Map<string, CacheEntry<T>>
  private accessOrder: string[]
  private stats: CacheStats

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.statsEnabled = config.enableStats ?? false
    this.cache = new Map()
    this.accessOrder = []
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      totalHits: 0,
      totalMisses: 0,
      totalEvictions: 0,
      hitRatio: 0,
      averageEntrySize: 0,
      averageAge: 0,
      topKeys: [],
      memoryUsage: 0
    }
  }

  /**
   * Get message from cache
   */
  public get(key: string, options?: CacheOptions): CacheEntry<T> | null {
    if (options?.skipCache) {
      return null
    }

    const entry = this.cache.get(key)

    if (!entry) {
      if (this.statsEnabled) {
        this.stats.totalMisses++
        this.updateHitRatio()
      }
      return null
    }

    // Check expiry
    if (Date.now() > entry.expiry) {
      this.delete(key)
      if (this.statsEnabled) {
        this.stats.totalMisses++
        this.updateHitRatio()
      }
      return null
    }

    // Update access info
    entry.hitCount++
    entry.lastAccess = Date.now()

    // Update access order for LRU
    this.updateAccessOrder(key)

    if (this.statsEnabled) {
      this.stats.totalHits++
      this.updateHitRatio()
    }

    return entry
  }

  /**
   * Set message in cache
   */
  public set(
    key: string,
    data: T,
    options?: CacheOptions
  ): CacheEntry<T> {
    if (options?.skipCache) {
      return this.createEntry(key, data, options?.ttl)
    }

    // Calculate hash for deduplication
    const hash = options?.hash || this.calculateHash(data)
    
    // Check if data already exists with same hash
    const existingByHash = this.findByHash(hash)
    if (existingByHash && existingByHash.key !== key) {
      // Same data exists, just create alias
      const entry = {
        ...existingByHash,
        key,
        timestamp: Date.now(),
        lastAccess: Date.now()
      }
      this.cache.set(key, entry)
      return entry
    }

    // Create new entry
    const entry = this.createEntry(key, data, options?.ttl, hash)

    // Check memory limits and evict if necessary
    this.ensureCapacity(entry.size)

    // Set in cache
    this.cache.set(key, entry)
    this.accessOrder.push(key)

    // Update stats
    if (this.statsEnabled) {
      this.stats.totalEntries = this.cache.size
      this.stats.totalSize += entry.size
      this.stats.averageEntrySize = this.stats.totalSize / this.stats.totalEntries
    }

    return entry
  }

  /**
   * Get or set (compute if missing)
   */
  public getOrSet(
    key: string,
    compute: () => T,
    options?: CacheOptions
  ): { entry: CacheEntry<T>; computed: boolean } {
    const existing = this.get(key, options)
    
    if (existing && !options?.forceRefresh) {
      return { entry: existing, computed: false }
    }

    const data = compute()
    const entry = this.set(key, data, options)
    
    return { entry, computed: true }
  }

  /**
   * Delete message from cache
   */
  public delete(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    this.cache.delete(key)
    this.accessOrder = this.accessOrder.filter(k => k !== key)

    if (this.statsEnabled) {
      this.stats.totalSize -= entry.size
      this.stats.totalEntries = this.cache.size
    }

    return true
  }

  /**
   * Check if key exists
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    // Check expiry
    if (Date.now() > entry.expiry) {
      this.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear()
    this.accessOrder = []

    if (this.statsEnabled) {
      this.stats.totalEntries = 0
      this.stats.totalSize = 0
    }
  }

  /**
   * Get cache size
   */
  public size(): number {
    return this.cache.size
  }

  /**
   * Get total memory usage
   */
  public memoryUsage(): number {
    let total = 0
    for (const entry of this.cache.values()) {
      total += entry.size
    }
    return total
  }

  /**
   * Get statistics
   */
  public getStats(): CacheStats {
    const now = Date.now()
    
    // Calculate average age
    let totalAge = 0
    for (const entry of this.cache.values()) {
      totalAge += now - entry.timestamp
    }
    this.stats.averageAge = this.cache.size > 0 ? totalAge / this.cache.size : 0

    // Get top keys by hit count
    const entries = Array.from(this.cache.values())
    entries.sort((a, b) => b.hitCount - a.hitCount)
    
    this.stats.topKeys = entries.slice(0, 10).map(entry => ({
      key: entry.key,
      hits: entry.hitCount,
      size: entry.size
    }))

    // Memory usage
    this.stats.memoryUsage = this.memoryUsage()

    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      totalEntries: this.cache.size,
      totalSize: this.memoryUsage(),
      totalHits: 0,
      totalMisses: 0,
      totalEvictions: 0,
      hitRatio: 0,
      averageEntrySize: this.cache.size > 0 ? this.memoryUsage() / this.cache.size : 0,
      averageAge: 0,
      topKeys: [],
      memoryUsage: this.memoryUsage()
    }
  }

  /**
   * Prune expired entries
   */
  public prune(): number {
    const now = Date.now()
    let pruned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.delete(key)
        pruned++
      }
    }

    return pruned
  }

  /**
   * Get all keys
   */
  public keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get entries by pattern
   */
  public getByPattern(pattern: string | RegExp): CacheEntry[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    const entries: CacheEntry[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (regex.test(key)) {
        entries.push(entry)
      }
    }

    return entries
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createEntry(
    key: string,
    data: T,
    ttl?: number,
    hash?: string
  ): CacheEntry<T> {
    const now = Date.now()
    const effectiveTTL = ttl ?? this.config.defaultTTL
    const dataHash = hash ?? this.calculateHash(data)
    const size = this.calculateSize(data)

    return {
      key,
      data,
      hash: dataHash,
      size,
      timestamp: now,
      expiry: now + effectiveTTL,
      hitCount: 0,
      lastAccess: now,
      compressed: false
    }
  }

  private calculateHash(data: T): string {
    try {
      return createHash('md5').update(JSON.stringify(data)).digest('hex')
    } catch {
      return createHash('md5').update(String(data)).digest('hex')
    }
  }

  private calculateSize(data: T): number {
    try {
      if (Buffer.isBuffer(data)) {
        return data.length
      }
      return Buffer.byteLength(JSON.stringify(data), 'utf8')
    } catch {
      return 1024 // Default estimate
    }
  }

  private findByHash(hash: string): CacheEntry | null {
    for (const entry of this.cache.values()) {
      if (entry.hash === hash) {
        return entry
      }
    }
    return null
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index !== -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(key)
  }

  private ensureCapacity(newEntrySize: number): void {
    const currentSize = this.memoryUsage()
    const currentCount = this.cache.size

    // Evict by count
    while (currentCount >= this.config.maxSize && this.accessOrder.length > 0) {
      this.evictLRU()
    }

    // Evict by memory
    while (currentSize + newEntrySize > this.config.maxMemory && this.accessOrder.length > 0) {
      this.evictLRU()
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return
    }

    const keyToEvict = this.accessOrder.shift()
    
    if (keyToEvict) {
      const entry = this.cache.get(keyToEvict)
      
      if (entry && this.statsEnabled) {
        this.stats.totalSize -= entry.size
        this.stats.totalEvictions++
      }
      
      this.cache.delete(keyToEvict)
      
      if (this.statsEnabled) {
        this.stats.totalEntries = this.cache.size
      }
    }
  }

  private updateHitRatio(): void {
    const total = this.stats.totalHits + this.stats.totalMisses
    this.stats.hitRatio = total > 0 ? this.stats.totalHits / total : 0
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let messageCacheInstance: MessageCache | null = null

export function getMessageCache(config?: CacheConfig): MessageCache {
  if (!messageCacheInstance) {
    messageCacheInstance = new MessageCache(config)
  }
  return messageCacheInstance
}

export function resetMessageCache(): void {
  messageCacheInstance = null
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create cache key from parts
 */
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.join(':')
}

/**
 * Parse cache key into parts
 */
export function parseCacheKey(key: string): string[] {
  return key.split(':')
}

/**
 * Generate cache key for WebSocket message
 */
export function generateMessageCacheKey<T = unknown>(
  event: string,
  data: T,
  namespace?: string
): string {
  const dataHash = createHash('md5').update(JSON.stringify(data)).digest('hex')
  return `${namespace || 'default'}:${event}:${dataHash}`
}
