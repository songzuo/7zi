/**
 * Memory Storage Adapter for Rate Limiting Gateway
 * 
 * High-performance in-memory storage adapter for single-instance deployments.
 * Implements the IStorageAdapter interface.
 * 
 * @version 1.10.0
 */

import type { IStorageAdapter, StorageBackend, PipelineCommand } from '../types'

/**
 * Sorted set entry
 */
interface SortedSetEntry {
  score: number
  member: string
}

/**
 * Memory Storage Adapter
 * 
 * Provides in-memory storage for rate limiting data.
 * Suitable for single-instance deployments or as a fallback.
 */
export class MemoryAdapter implements IStorageAdapter {
  private store = new Map<string, string>()
  private sortedSets = new Map<string, SortedSetEntry[]>()
  private expirations = new Map<string, number>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(cleanupIntervalMs = 60000) {
    // Start cleanup interval
    if (cleanupIntervalMs > 0) {
      this.cleanupInterval = setInterval(() => this.cleanupExpired(), cleanupIntervalMs)
    }
  }

  /**
   * Get a value from memory
   */
  async get(key: string): Promise<string | null> {
    this.checkExpiration(key)
    return this.store.get(key) ?? null
  }

  /**
   * Set a value in memory with optional TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.store.set(key, value)
    
    if (ttl) {
      this.expirations.set(key, Date.now() + ttl * 1000)
    } else {
      this.expirations.delete(key)
    }
  }

  /**
   * Delete a key from memory
   */
  async delete(key: string): Promise<boolean> {
    const existed = this.store.has(key)
    this.store.delete(key)
    this.expirations.delete(key)
    this.sortedSets.delete(key)
    return existed
  }

  /**
   * Increment a value in memory
   */
  async increment(key: string): Promise<number> {
    const current = parseInt(this.store.get(key) ?? '0', 10)
    const newValue = current + 1
    this.store.set(key, newValue.toString())
    return newValue
  }

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    let set = this.sortedSets.get(key)
    
    if (!set) {
      set = []
      this.sortedSets.set(key, set)
    }

    // Check if member already exists
    const existingIndex = set.findIndex(e => e.member === member)
    
    if (existingIndex >= 0) {
      set[existingIndex].score = score
      return 0 // Updated, not added
    }

    // Add new entry
    set.push({ score, member })
    
    // Sort by score
    set.sort((a, b) => a.score - b.score)
    
    return 1 // Added
  }

  /**
   * Remove from sorted set by score range
   */
  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const set = this.sortedSets.get(key)
    
    if (!set) {
      return 0
    }

    const originalLength = set.length
    
    // Filter out entries outside the range
    const filtered = set.filter(e => e.score < min || e.score > max)
    this.sortedSets.set(key, filtered)
    
    return originalLength - filtered.length
  }

  /**
   * Get sorted set cardinality
   */
  async zcard(key: string): Promise<number> {
    const set = this.sortedSets.get(key)
    return set?.length ?? 0
  }

  /**
   * Get sorted set range
   */
  async zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]> {
    const set = this.sortedSets.get(key)
    
    if (!set || set.length === 0) {
      return []
    }

    // Handle negative indices
    let startIndex = start < 0 ? set.length + start : start
    let stopIndex = stop < 0 ? set.length + stop : stop

    // Clamp indices
    startIndex = Math.max(0, startIndex)
    stopIndex = Math.min(set.length - 1, stopIndex)

    if (startIndex > stopIndex) {
      return []
    }

    const entries = set.slice(startIndex, stopIndex + 1)
    
    if (withScores) {
      const result: string[] = []
      for (const entry of entries) {
        result.push(entry.member)
        result.push(entry.score.toString())
      }
      return result
    }
    
    return entries.map(e => e.member)
  }

  /**
   * Execute Lua script (simplified - just returns success for memory adapter)
   * Note: Memory adapter doesn't support Lua scripts natively.
   * For rate limiting, use the algorithm classes directly.
   */
  async eval(_script: string, _keys: string[], _args: (string | number)[]): Promise<unknown> {
    // Memory adapter doesn't support Lua scripts
    // This should be handled by using the algorithm classes directly
    throw new Error('Memory adapter does not support Lua scripts. Use algorithm classes directly.')
  }

  /**
   * Execute pipeline commands
   */
  async pipeline(commands: PipelineCommand[]): Promise<unknown[]> {
    const results: unknown[] = []

    for (const { command, args } of commands) {
      const method = (this as Record<string, unknown>)[command]
      if (typeof method === 'function') {
        const result = await (method as (...a: unknown[]) => unknown)(...args)
        results.push(result)
      }
    }

    return results
  }

  /**
   * Check if adapter is connected (always true for memory)
   */
  async isConnected(): Promise<boolean> {
    return true
  }

  /**
   * Get storage type
   */
  getType(): StorageBackend {
    return 'memory'
  }

  /**
   * Check if key is expired
   */
  private checkExpiration(key: string): void {
    const expiration = this.expirations.get(key)
    
    if (expiration && Date.now() > expiration) {
      this.store.delete(key)
      this.expirations.delete(key)
      this.sortedSets.delete(key)
    }
  }

  /**
   * Clean up expired keys
   */
  private cleanupExpired(): void {
    const now = Date.now()
    
    for (const [key, expiration] of Array.from(this.expirations.entries())) {
      if (now > expiration) {
        this.store.delete(key)
        this.expirations.delete(key)
        this.sortedSets.delete(key)
      }
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.store.clear()
    this.sortedSets.clear()
    this.expirations.clear()
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    keys: number
    sortedSets: number
    expirations: number
    memoryUsage: number
  } {
    let memoryUsage = 0
    
    // Estimate memory usage
    for (const [key, value] of Array.from(this.store.entries())) {
      memoryUsage += key.length + value.length
    }
    
    for (const [key, entries] of Array.from(this.sortedSets.entries())) {
      memoryUsage += key.length
      for (const entry of entries) {
        memoryUsage += entry.member.length + 16 // score + member
      }
    }

    return {
      keys: this.store.size,
      sortedSets: this.sortedSets.size,
      expirations: this.expirations.size,
      memoryUsage
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

/**
 * Create a singleton memory adapter
 */
let memoryAdapterInstance: MemoryAdapter | null = null

export function getMemoryAdapter(cleanupIntervalMs?: number): MemoryAdapter {
  if (!memoryAdapterInstance) {
    memoryAdapterInstance = new MemoryAdapter(cleanupIntervalMs)
  }
  return memoryAdapterInstance
}

export default MemoryAdapter
