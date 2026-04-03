/**
 * Root Cause Analysis Cache
 * 根因分析缓存机制
 */

import { RootCause, PerformanceContext } from './types'

interface CacheEntry {
  rootCause: RootCause
  timestamp: number
  accessCount: number
}

interface CacheKey {
  metric: string
  value: number
  contextHash: string
}

export class RootCauseCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly maxEntries: number
  private readonly ttl: number // Time to live in milliseconds

  constructor(maxEntries: number = 100, ttl: number = 5 * 60 * 1000) {
    this.maxEntries = maxEntries
    this.ttl = ttl
  }

  /**
   * Generate cache key from metric, value, and context
   */
  private generateKey(metric: string, value: number, context: PerformanceContext): string {
    // Create a hash from context data
    const contextHash = this.hashContext(context)
    return `${metric}:${value}:${contextHash}`
  }

  /**
   * Create a hash of the context for caching
   */
  private hashContext(context: PerformanceContext): string {
    // Use a simple hash of relevant context fields
    const relevantFields = {
      page: context.page,
      networkType: context.network?.type,
      slowQueryCount: context.slowQueries?.length,
      slowApiCount: context.slowApis?.length,
      longTaskCount: context.rendering?.longTasks,
    }

    const str = JSON.stringify(relevantFields)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Get cached root cause analysis
   */
  get(metric: string, value: number, context: PerformanceContext): RootCause | null {
    const key = this.generateKey(metric, value, context)
    const entry = this.cache.get(key)

    if (!entry) return null

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // Update access count
    entry.accessCount++

    return entry.rootCause
  }

  /**
   * Cache root cause analysis result
   */
  set(metric: string, value: number, context: PerformanceContext, rootCause: RootCause): void {
    const key = this.generateKey(metric, value, context)

    // Check if cache is full
    if (this.cache.size >= this.maxEntries) {
      this.evict()
    }

    this.cache.set(key, {
      rootCause,
      timestamp: Date.now(),
      accessCount: 1,
    })
  }

  /**
   * Evict least recently used or least accessed entries
   */
  private evict(): void {
    // Find the entry with lowest access count (or oldest if tied)
    let lruKey: string | null = null
    let minAccessCount = Infinity
    let oldestTimestamp = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < minAccessCount) {
        minAccessCount = entry.accessCount
        oldestTimestamp = entry.timestamp
        lruKey = key
      } else if (entry.accessCount === minAccessCount && entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxEntries: number
    ttl: number
    totalAccessCount: number
  } {
    let totalAccessCount = 0
    for (const entry of this.cache.values()) {
      totalAccessCount += entry.accessCount
    }

    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      ttl: this.ttl,
      totalAccessCount,
    }
  }
}
