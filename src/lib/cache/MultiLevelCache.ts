/**
 * Multi-Level Cache Architecture
 * 
 * Implements L1 (memory) / L2 (disk) / L3 (distributed) caching.
 * 
 * @module lib/cache/MultiLevelCache
 */

import type {
  CacheEntry,
  CacheLevel,
  CacheSetOptions,
  CacheGetOptions,
  MultiLevelCacheConfig,
  LevelStats,
  CacheStats,
  CacheEventListener,
  CacheEvent,
  ICache,
  WarmupConfig,
} from './types'
import { DEFAULT_L1_CONFIG, DEFAULT_L2_CONFIG, DEFAULT_L3_CONFIG, LEVEL_PRIORITY } from './types'
import { createStrategy, IEvictionStrategy } from './strategies'
import { logger } from '../logger'

// ============================================
// L1 Cache (In-Memory)
// ============================================

/**
 * L1 Cache - Fast in-memory cache
 */
class L1Cache implements ICache {
  private entries: Map<string, CacheEntry> = new Map()
  private strategy: IEvictionStrategy
  private config: typeof DEFAULT_L1_CONFIG
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    entries: 0,
    memoryUsage: 0,
    avgAccessTime: 0,
    evictions: 0,
    expired: 0,
    errors: 0,
    lastReset: Date.now(),
  }
  
  constructor(config: Partial<typeof DEFAULT_L1_CONFIG> = {}) {
    this.config = { ...DEFAULT_L1_CONFIG, ...config }
    this.strategy = createStrategy(this.config.strategy)
    this.strategy.init({
      type: this.config.strategy,
      maxSize: this.config.maxSize,
      defaultTTL: this.config.defaultTTL,
      enableStats: true,
    })
  }
  
  async get<T>(key: string, options?: CacheGetOptions): Promise<T | null> {
    const startTime = Date.now()
    const entry = this.entries.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key)
      this.stats.misses++
      this.stats.expired++
      return null
    }
    
    // Update access
    if (options?.updateAccess !== false) {
      entry.lastAccessedAt = Date.now()
      entry.accessCount++
      this.strategy.onAccess?.(entry)
    }
    
    this.stats.hits++
    this.updateHitRate()
    this.updateAccessTime(startTime)
    
    return this.config.cloneOnGet 
      ? this.clone(entry.value as T)
      : entry.value as T
  }
  
  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<boolean> {
    const now = Date.now()
    const ttl = options?.ttl || this.config.defaultTTL
    const size = this.estimateSize(value)
    
    // Check memory limit
    if (this.shouldEvict(size)) {
      await this.evict(size)
    }
    
    const entry: CacheEntry = {
      key,
      value,
      createdAt: now,
      expiresAt: now + ttl,
      lastAccessedAt: now,
      accessCount: 0,
      status: 'active',
      level: 'L1',
      size,
      tags: options?.tags,
      metadata: options?.metadata,
    }
    
    this.entries.set(key, entry)
    this.strategy.onAdd?.(entry)
    this.stats.entries = this.entries.size
    this.stats.memoryUsage += size
    
    return true
  }
  
  async delete(key: string): Promise<boolean> {
    const entry = this.entries.get(key)
    if (entry) {
      this.stats.memoryUsage -= entry.size
      this.entries.delete(key)
      this.strategy.onRemove?.(key)
      this.stats.entries = this.entries.size
      return true
    }
    return false
  }
  
  async has(key: string): Promise<boolean> {
    const entry = this.entries.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      await this.delete(key)
      return false
    }
    return true
  }
  
  async clear(): Promise<void> {
    this.entries.clear()
    this.stats.entries = 0
    this.stats.memoryUsage = 0
  }
  
  async getEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.entries.get(key)
    if (!entry || Date.now() > entry.expiresAt) {
      return null
    }
    return entry as CacheEntry<T>
  }
  
  getStats(): CacheStats {
    return { ...this.stats }
  }
  
  async keys(): Promise<string[]> {
    return Array.from(this.entries.keys())
  }
  
  async size(): Promise<number> {
    return this.entries.size
  }
  
  private shouldEvict(newSize: number): boolean {
    const memoryLimit = this.config.maxMemoryMB * 1024 * 1024
    const currentMemory = this.stats.memoryUsage
    return currentMemory + newSize > memoryLimit || this.entries.size >= this.config.maxSize
  }
  
  private async evict(requiredSize: number): Promise<void> {
    const keysToEvict = this.strategy.selectForEviction(this.entries, 10)
    
    for (const key of keysToEvict) {
      await this.delete(key)
      this.stats.evictions++
    }
  }
  
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }
  
  private updateAccessTime(startTime: number): void {
    const duration = Date.now() - startTime
    const total = this.stats.hits + this.stats.misses
    this.stats.avgAccessTime = 
      (this.stats.avgAccessTime * (total - 1) + duration) / total
  }
  
  private estimateSize(value: unknown): number {
    // Rough estimation
    if (value === null || value === undefined) return 8
    if (typeof value === 'string') return value.length * 2
    if (typeof value === 'number') return 8
    if (typeof value === 'boolean') return 4
    return JSON.stringify(value).length * 2
  }
  
  private clone<T>(value: T): T {
    if (typeof value === 'object' && value !== null) {
      return JSON.parse(JSON.stringify(value))
    }
    return value
  }
}

// ============================================
// Multi-Level Cache Manager
// ============================================

/**
 * Multi-Level Cache Manager
 * Coordinates L1/L2/L3 cache levels
 */
export class MultiLevelCache implements ICache {
  private l1: L1Cache
  // L2 and L3 will be implemented with distributed cache
  private l2Enabled: boolean
  private l3Enabled: boolean
  protected config: MultiLevelCacheConfig
  private listeners: Set<CacheEventListener> = new Set()
  private stats: Map<CacheLevel, CacheStats> = new Map()
  
  constructor(config: Partial<MultiLevelCacheConfig> = {}) {
    this.config = {
      l1: { ...DEFAULT_L1_CONFIG, ...config.l1 },
      l2: { ...DEFAULT_L2_CONFIG, ...config.l2 },
      l3: { ...DEFAULT_L3_CONFIG, ...config.l3 },
      warmupEnabled: config.warmupEnabled ?? false,
      readThrough: config.readThrough ?? true,
      writeThrough: config.writeThrough ?? true,
      writeBehind: config.writeBehind ?? false,
      writeBehindDelay: config.writeBehindDelay ?? 1000,
    }
    
    this.l1 = new L1Cache(this.config.l1)
    this.l2Enabled = this.config.l2.enabled
    this.l3Enabled = this.config.l3.enabled
  }
  
  async get<T>(key: string, options?: CacheGetOptions): Promise<T | null> {
    const startTime = Date.now()
    
    // Try L1 first
    const value = await this.l1.get<T>(key, options)
    if (value !== null) {
      this.emit({ type: 'hit', key, level: 'L1', timestamp: startTime })
      return value
    }
    
    // Try L2 if enabled
    if (this.l2Enabled && options?.level !== 'L1') {
      // L2 would be implemented with disk cache
      logger.debug(`[MultiLevelCache] L2 not implemented yet`, { category: 'cache' })
    }
    
    // Try L3 if enabled
    if (this.l3Enabled && options?.level !== 'L1' && options?.level !== 'L2') {
      // L3 would be implemented with Redis
      logger.debug(`[MultiLevelCache] L3 not implemented yet`, { category: 'cache' })
    }
    
    this.emit({ type: 'miss', key, timestamp: startTime })
    return null
  }
  
  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<boolean> {
    const startTime = Date.now()
    
    // Set in L1 unless skipped
    if (!options?.skipL1) {
      await this.l1.set(key, value, options)
    }
    
    // Write-through to lower levels
    if (this.config.writeThrough) {
      if (this.l2Enabled) {
        // L2 set would go here
      }
      if (this.l3Enabled) {
        // L3 set would go here
      }
    }
    
    this.emit({ type: 'set', key, level: options?.level || 'L1', timestamp: startTime })
    return true
  }
  
  async delete(key: string): Promise<boolean> {
    const startTime = Date.now()
    
    const deleted = await this.l1.delete(key)
    
    // Delete from lower levels
    if (this.l2Enabled) {
      // L2 delete
    }
    if (this.l3Enabled) {
      // L3 delete
    }
    
    this.emit({ type: 'delete', key, timestamp: startTime })
    return deleted
  }
  
  async has(key: string): Promise<boolean> {
    return this.l1.has(key)
  }
  
  async clear(): Promise<void> {
    await this.l1.clear()
    this.emit({ type: 'clear', timestamp: Date.now() })
  }
  
  async getEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    return this.l1.getEntry<T>(key)
  }
  
  getStats(): CacheStats {
    return this.l1.getStats()
  }
  
  async keys(): Promise<string[]> {
    return this.l1.keys()
  }
  
  async size(): Promise<number> {
    return this.l1.size()
  }
  
  // ============================================
  // Multi-Level Specific Methods
  // ============================================
  
  async getFromLevel<T>(key: string, level: CacheLevel): Promise<T | null> {
    if (level === 'L1') {
      return this.l1.get<T>(key)
    }
    // L2/L3 implementation would go here
    return null
  }
  
  async setToLevel<T>(key: string, value: T, level: CacheLevel, options?: CacheSetOptions): Promise<boolean> {
    if (level === 'L1') {
      return this.l1.set(key, value, options)
    }
    // L2/L3 implementation would go here
    return false
  }
  
  async invalidate(key: string): Promise<void> {
    await this.delete(key)
  }
  
  async invalidateByTag(tag: string): Promise<void> {
    const keys = await this.l1.keys()
    for (const key of keys) {
      const entry = await this.l1.getEntry(key)
      if (entry?.tags?.includes(tag)) {
        await this.delete(key)
      }
    }
  }
  
  async promote(key: string): Promise<boolean> {
    // Promote from lower level to higher
    // This would fetch from L2/L3 and set in L1
    logger.debug(`[MultiLevelCache] Promoting key: ${key}`, { category: 'cache' })
    return false
  }
  
  async demote(key: string): Promise<boolean> {
    // Demote from higher level to lower
    // This would move from L1 to L2/L3
    logger.debug(`[MultiLevelCache] Demoting key: ${key}`, { category: 'cache' })
    return false
  }
  
  getLevelStats(level: CacheLevel): LevelStats {
    if (level === 'L1') {
      return {
        ...this.l1.getStats(),
        level: 'L1',
        levelMetrics: {
          memoryPressure: this.calculateMemoryPressure(),
        },
      }
    }
    
    return {
      level,
      hits: 0,
      misses: 0,
      hitRate: 0,
      entries: 0,
      memoryUsage: 0,
      avgAccessTime: 0,
      evictions: 0,
      expired: 0,
      errors: 0,
      lastReset: Date.now(),
      levelMetrics: {},
    }
  }
  
  async warmup(config: WarmupConfig): Promise<void> {
    const { keys, batchSize = 100, concurrency = 10, fetchFn, onProgress } = config
    
    logger.info(`[MultiLevelCache] Starting warmup for ${keys.length} keys`, { category: 'cache' })
    
    const batches = this.chunk(keys, batchSize)
    let loaded = 0
    
    for (const batch of batches) {
      await Promise.all(
        batch.slice(0, concurrency).map(async (key) => {
          if (fetchFn) {
            const value = await fetchFn(key)
            if (value !== null && value !== undefined) {
              await this.set(key, value)
            }
          }
          loaded++
          onProgress?.(loaded, keys.length)
        })
      )
    }
    
    logger.info(`[MultiLevelCache] Warmup complete: ${loaded}/${keys.length}`, { category: 'cache' })
  }
  
  subscribe(listener: CacheEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  
  private emit(event: CacheEvent): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event)
      } catch (error) {
        logger.error('[MultiLevelCache] Event listener error', { 
          category: 'cache', 
          data: { error: String(error) } 
        })
      }
    }
  }
  
  private calculateMemoryPressure(): number {
    const stats = this.l1.getStats()
    const maxMemory = this.config.l1.maxMemoryMB * 1024 * 1024
    return Math.min(stats.memoryUsage / maxMemory, 1)
  }
  
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

// Singleton instance
let multiLevelCacheInstance: MultiLevelCache | null = null

export function getMultiLevelCache(config?: Partial<MultiLevelCacheConfig>): MultiLevelCache {
  if (!multiLevelCacheInstance) {
    multiLevelCacheInstance = new MultiLevelCache(config)
  }
  return multiLevelCacheInstance
}
