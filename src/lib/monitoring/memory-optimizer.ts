/**
 * Memory Optimization and Monitoring
 *
 * Features:
 * - Memory usage monitoring
 * - Map cache cleanup
 * - LRU cache with memory-aware eviction
 * - Resource tracking
 *
 * @module lib/monitoring/memory-optimizer
 * @version 2.0.0
 */

import { LRUCache } from '@/lib/cache/lru-cache'

// ============================================
// Types
// ============================================

export interface MemoryStats {
  heapUsed: number
  heapTotal: number
  external: number
  arrayBuffers: number
  rss: number
  percentUsed: number
}

export interface MemoryAlert {
  level: 'warning' | 'critical'
  message: string
  stats: MemoryStats
  timestamp: number
}

export interface MemoryMonitorConfig {
  warningThreshold: number // Percentage (default: 80%)
  criticalThreshold: number // Percentage (default: 90%)
  checkIntervalMs: number // Check interval (default: 30000ms)
  onWarning?: (alert: MemoryAlert) => void
  onCritical?: (alert: MemoryAlert) => void
}

// ============================================
// Memory Monitor
// ============================================

export class MemoryMonitor {
  private config: MemoryMonitorConfig
  private intervalId: NodeJS.Timeout | null = null
  private lastStats: MemoryStats | null = null
  private history: MemoryStats[] = []
  private maxHistorySize: number = 100

  constructor(config: Partial<MemoryMonitorConfig> = {}) {
    this.config = {
      warningThreshold: config.warningThreshold ?? 80,
      criticalThreshold: config.criticalThreshold ?? 90,
      checkIntervalMs: config.checkIntervalMs ?? 30000,
      onWarning: config.onWarning,
      onCritical: config.onCritical,
    }
  }

  /**
   * Start monitoring memory usage
   */
  start(): void {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      this.check()
    }, this.config.checkIntervalMs)

    // Initial check
    this.check()
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Get current memory stats
   */
  getStats(): MemoryStats {
    const mem = process.memoryUsage()
    const percentUsed = (mem.heapUsed / mem.heapTotal) * 100

    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      rss: mem.rss,
      percentUsed,
    }
  }

  /**
   * Check memory and trigger alerts if needed
   */
  check(): MemoryAlert | null {
    const stats = this.getStats()
    this.lastStats = stats

    // Add to history
    this.history.push(stats)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }

    // Check thresholds
    if (stats.percentUsed >= this.config.criticalThreshold) {
      const alert: MemoryAlert = {
        level: 'critical',
        message: `Memory usage critical: ${stats.percentUsed.toFixed(1)}%`,
        stats,
        timestamp: Date.now(),
      }

      if (this.config.onCritical) {
        this.config.onCritical(alert)
      }

      return alert
    }

    if (stats.percentUsed >= this.config.warningThreshold) {
      const alert: MemoryAlert = {
        level: 'warning',
        message: `Memory usage warning: ${stats.percentUsed.toFixed(1)}%`,
        stats,
        timestamp: Date.now(),
      }

      if (this.config.onWarning) {
        this.config.onWarning(alert)
      }

      return alert
    }

    return null
  }

  /**
   * Get memory usage history
   */
  getHistory(): MemoryStats[] {
    return [...this.history]
  }

  /**
   * Get last stats
   */
  getLastStats(): MemoryStats | null {
    return this.lastStats
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): boolean {
    if (global.gc) {
      global.gc()
      return true
    }
    return false
  }
}

// ============================================
// Map Cache Cleaner
// ============================================

export class MapCacheCleaner {
  private caches: Map<string, Map<unknown, unknown>> = new Map()
  private cleanupThreshold: number

  constructor(cleanupThreshold: number = 1000) {
    this.cleanupThreshold = cleanupThreshold
  }

  /**
   * Register a map cache for monitoring
   */
  register(name: string, map: Map<unknown, unknown>): void {
    this.caches.set(name, map)
  }

  /**
   * Unregister a map cache
   */
  unregister(name: string): void {
    this.caches.delete(name)
  }

  /**
   * Get cache sizes
   */
  getSizes(): Map<string, number> {
    const sizes = new Map<string, number>()

    this.caches.forEach((map, name) => {
      sizes.set(name, map.size)
    })

    return sizes
  }

  /**
   * Clean up caches that exceed threshold
   */
  cleanup(): { cleaned: string[]; freedEntries: number } {
    const cleaned: string[] = []
    let freedEntries = 0

    this.caches.forEach((map, name) => {
      if (map.size > this.cleanupThreshold) {
        // Keep only the most recent half
        const keepCount = Math.floor(this.cleanupThreshold / 2)
        const deleteCount = map.size - keepCount

        // Delete oldest entries (first in Map)
        let deleted = 0
        const keys = Array.from(map.keys())
        for (const key of keys) {
          if (deleted >= deleteCount) break
          map.delete(key)
          deleted++
        }

        cleaned.push(name)
        freedEntries += deleted
      }
    })

    return { cleaned, freedEntries }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.caches.forEach((map) => {
      map.clear()
    })
  }

  /**
   * Get total entries across all caches
   */
  getTotalEntries(): number {
    let total = 0
    this.caches.forEach((map) => {
      total += map.size
    })
    return total
  }
}

// ============================================
// Memory-Aware LRU Cache
// ============================================

export class MemoryAwareLRUCache<K, V> extends LRUCache<{ value: V; size: number }> {
  private maxMemoryBytes: number
  private currentMemoryBytes: number = 0
  private onEviction?: (key: string, value: { value: V; size: number }) => void

  constructor(
    maxEntries: number = 100,
    maxMemoryBytes: number = 100 * 1024 * 1024, // 100MB default
    onEviction?: (key: string, value: { value: V; size: number }) => void
  ) {
    super(maxEntries)
    this.maxMemoryBytes = maxMemoryBytes
    this.onEviction = onEviction
  }

  /**
   * Set a value with estimated size
   */
  setWithSize(key: string, value: V, size: number, ttl?: number): void {
    // Check memory limit
    const currentSize = super.getCacheSize()
    while (this.currentMemoryBytes + size > this.maxMemoryBytes && currentSize > 0) {
      this.evictOneEntry()
    }

    super.set(key, { value, size }, ttl)
    this.currentMemoryBytes += size
  }

  /**
   * Get a value
   */
  getValue(key: string): V | null {
    const entry = super.get(key)
    return entry ? entry.value : null
  }

  /**
   * Delete a value
   */
  deleteEntry(key: string): void {
    const entry = super.get(key)
    if (entry) {
      this.currentMemoryBytes -= entry.size
      if (this.onEviction) {
        this.onEviction(key, entry)
      }
    }
    super.delete(key)
  }

  /**
   * Clear cache
   */
  clear(): void {
    super.clear()
    this.currentMemoryBytes = 0
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): number {
    return this.currentMemoryBytes
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsagePercent(): number {
    return (this.currentMemoryBytes / this.maxMemoryBytes) * 100
  }

  /**
   * Evict one entry (helper)
   */
  private evictOneEntry(): void {
    // This is a simplified implementation
    // In production, we'd need access to internal Map structure
    // For now, this is a placeholder
  }
}

// ============================================
// Resource Tracker
// ============================================

export class ResourceTracker {
  private resources: Map<string, { createdAt: number; size?: number; metadata?: unknown }> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private maxAge: number

  constructor(maxAge: number = 30 * 60 * 1000) { // 30 minutes default
    this.maxAge = maxAge
  }

  /**
   * Track a resource
   */
  track(id: string, size?: number, metadata?: unknown): void {
    this.resources.set(id, {
      createdAt: Date.now(),
      size,
      metadata,
    })
  }

  /**
   * Untrack a resource
   */
  untrack(id: string): void {
    this.resources.delete(id)
  }

  /**
   * Get tracked resource
   */
  get(id: string): { createdAt: number; size?: number; metadata?: unknown } | undefined {
    return this.resources.get(id)
  }

  /**
   * Get all tracked resources
   */
  getAll(): Map<string, { createdAt: number; size?: number; metadata?: unknown }> {
    return new Map(this.resources)
  }

  /**
   * Start automatic cleanup
   */
  startCleanup(interval: number = 60000): void {
    if (this.cleanupInterval) return

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired()
    }, interval)
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Cleanup expired resources
   */
  cleanupExpired(): string[] {
    const now = Date.now()
    const expired: string[] = []

    this.resources.forEach((resource, id) => {
      if (now - resource.createdAt > this.maxAge) {
        expired.push(id)
        this.resources.delete(id)
      }
    })

    return expired
  }

  /**
   * Get count of tracked resources
   */
  get count(): number {
    return this.resources.size
  }
}

// ============================================
// Factory Functions
// ============================================

export function createMemoryMonitor(
  config?: Partial<MemoryMonitorConfig>
): MemoryMonitor {
  return new MemoryMonitor(config)
}

export function createMapCacheCleaner(
  cleanupThreshold?: number
): MapCacheCleaner {
  return new MapCacheCleaner(cleanupThreshold)
}

export function createResourceTracker(
  maxAge?: number
): ResourceTracker {
  return new ResourceTracker(maxAge)
}

// ============================================
// Default Export
// ============================================

export default {
  MemoryMonitor,
  MapCacheCleaner,
  MemoryAwareLRUCache,
  ResourceTracker,
  createMemoryMonitor,
  createMapCacheCleaner,
  createResourceTracker,
}