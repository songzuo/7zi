/**
 * Cache Eviction Strategies
 * 
 * Implements LRU, LFU, FIFO, and TTL eviction strategies.
 * 
 * @module lib/cache/strategies
 */

// ============================================
// Base Strategy Interface
// ============================================

import type { CacheEntry, EvictionStrategy, StrategyConfig } from '../types'

/**
 * Base eviction strategy interface
 */
export interface IEvictionStrategy {
  /** Strategy name */
  readonly name: EvictionStrategy
  
  /** Initialize the strategy */
  init(config: StrategyConfig): void
  
  /** Select keys to evict */
  selectForEviction(entries: Map<string, CacheEntry>, count: number): string[]
  
  /** Called when entry is accessed */
  onAccess?(entry: CacheEntry): void
  
  /** Called when entry is added */
  onAdd?(entry: CacheEntry): void
  
  /** Called when entry is removed */
  onRemove?(key: string): void
  
  /** Get strategy statistics */
  getStats?(): Record<string, unknown>
}

// ============================================
// LRU (Least Recently Used) Strategy
// ============================================

/**
 * LRU eviction strategy
 * Evicts the least recently accessed entries
 */
export class LRUStrategy implements IEvictionStrategy {
  readonly name: EvictionStrategy = 'lru'
  
  private config: StrategyConfig | null = null
  private accessOrder: string[] = []
  
  init(config: StrategyConfig): void {
    this.config = config
    this.accessOrder = []
  }
  
  selectForEviction(entries: Map<string, CacheEntry>, count: number): string[] {
    // Sort by last accessed time (oldest first)
    const sorted = Array.from(entries.values())
      .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)
    
    return sorted.slice(0, count).map(e => e.key)
  }
  
  onAccess(entry: CacheEntry): void {
    // Move to end of access order (most recent)
    const index = this.accessOrder.indexOf(entry.key)
    if (index !== -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(entry.key)
  }
  
  onAdd(entry: CacheEntry): void {
    if (!this.accessOrder.includes(entry.key)) {
      this.accessOrder.push(entry.key)
    }
  }
  
  onRemove(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index !== -1) {
      this.accessOrder.splice(index, 1)
    }
  }
  
  getStats(): Record<string, unknown> {
    return {
      accessOrderLength: this.accessOrder.length,
    }
  }
}

// ============================================
// LFU (Least Frequently Used) Strategy
// ============================================

/**
 * LFU eviction strategy
 * Evicts entries with the lowest access frequency
 */
export class LFUStrategy implements IEvictionStrategy {
  readonly name: EvictionStrategy = 'lfu'
  
  private config: StrategyConfig | null = null
  private accessCounts: Map<string, number> = new Map()
  private decayFactor: number = 0.95
  private lastDecay: number = Date.now()
  
  init(config: StrategyConfig): void {
    this.config = config
    this.accessCounts = new Map()
  }
  
  selectForEviction(entries: Map<string, CacheEntry>, count: number): string[] {
    // Apply decay before selection
    this.applyDecay()
    
    // Sort by access count (lowest first)
    const sorted = Array.from(entries.values())
      .sort((a, b) => a.accessCount - b.accessCount)
    
    return sorted.slice(0, count).map(e => e.key)
  }
  
  onAccess(entry: CacheEntry): void {
    const current = this.accessCounts.get(entry.key) || 0
    this.accessCounts.set(entry.key, current + 1)
    entry.accessCount = current + 1
  }
  
  onAdd(entry: CacheEntry): void {
    this.accessCounts.set(entry.key, 0)
    entry.accessCount = 0
  }
  
  onRemove(key: string): void {
    this.accessCounts.delete(key)
  }
  
  private applyDecay(): void {
    const now = Date.now()
    const timeSinceLastDecay = now - this.lastDecay
    
    // Apply decay every minute
    if (timeSinceLastDecay > 60000) {
      for (const [key, count] of Array.from(this.accessCounts.entries())) {
        const newCount = Math.floor(count * this.decayFactor)
        this.accessCounts.set(key, newCount)
      }
      this.lastDecay = now
    }
  }
  
  getStats(): Record<string, unknown> {
    return {
      totalEntries: this.accessCounts.size,
      decayFactor: this.decayFactor,
      lastDecay: this.lastDecay,
    }
  }
}

// ============================================
// FIFO (First In First Out) Strategy
// ============================================

/**
 * FIFO eviction strategy
 * Evicts the oldest entries regardless of access
 */
export class FIFOStrategy implements IEvictionStrategy {
  readonly name: EvictionStrategy = 'fifo'
  
  private config: StrategyConfig | null = null
  private insertionOrder: string[] = []
  
  init(config: StrategyConfig): void {
    this.config = config
    this.insertionOrder = []
  }
  
  selectForEviction(entries: Map<string, CacheEntry>, count: number): string[] {
    // Return oldest entries based on insertion order
    return this.insertionOrder.slice(0, count)
  }
  
  onAdd(entry: CacheEntry): void {
    if (!this.insertionOrder.includes(entry.key)) {
      this.insertionOrder.push(entry.key)
    }
  }
  
  onRemove(key: string): void {
    const index = this.insertionOrder.indexOf(key)
    if (index !== -1) {
      this.insertionOrder.splice(index, 1)
    }
  }
  
  getStats(): Record<string, unknown> {
    return {
      insertionOrderLength: this.insertionOrder.length,
    }
  }
}

// ============================================
// TTL-Only Strategy
// ============================================

/**
 * TTL-only eviction strategy
 * Only evicts entries based on expiration time
 */
export class TTLStrategy implements IEvictionStrategy {
  readonly name: EvictionStrategy = 'ttl'
  
  private config: StrategyConfig | null = null
  private cleanupInterval: NodeJS.Timeout | null = null
  
  init(config: StrategyConfig): void {
    this.config = config
    this.startCleanup(config)
  }
  
  selectForEviction(entries: Map<string, CacheEntry>, count: number): string[] {
    const now = Date.now()
    const expired: string[] = []
    
    for (const [key, entry] of Array.from(entries.entries())) {
      if (now > entry.expiresAt) {
        expired.push(key)
        if (expired.length >= count) break
      }
    }
    
    return expired
  }
  
  private startCleanup(config: StrategyConfig): void {
    const interval = (config as any).cleanupInterval || 60000
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.cleanupInterval = setInterval(() => {
      // Cleanup is handled by the cache manager
    }, interval)
  }
  
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// ============================================
// Strategy Factory
// ============================================

/**
 * Create an eviction strategy based on type
 */
export function createStrategy(type: EvictionStrategy): IEvictionStrategy {
  switch (type) {
    case 'lru':
      return new LRUStrategy()
    case 'lfu':
      return new LFUStrategy()
    case 'fifo':
      return new FIFOStrategy()
    case 'ttl':
      return new TTLStrategy()
    default:
      throw new Error(`Unknown eviction strategy: ${type}`)
  }
}

// Re-export types
export type { CacheEntry, EvictionStrategy, StrategyConfig }
