/**
 * Sliding Window Rate Limiting Algorithm
 * 
 * Precise sliding window implementation using Redis sorted sets.
 * Avoids boundary effects of fixed window algorithms.
 * 
 * @version 1.10.0
 */

import type {
  SlidingWindowConfig,
  SlidingWindowState,
  RateLimitResult,
  IStorageAdapter,
  StorageBackend
} from '../types'
import { StorageError } from '../types'

/**
 * Lua script for atomic sliding window operations
 * 
 * This script performs the following atomically:
 * 1. Remove entries outside the time window
 * 2. Count remaining entries
 * 3. Check if request can be allowed
 * 4. Add current request if allowed
 * 5. Return result
 */
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local windowStart = now - windowMs

-- Remove entries outside the time window
redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

-- Count current entries in the window
local count = redis.call('ZCARD', key)

-- Check if limit exceeded
local allowed = count < limit

-- If allowed, add current request to the window
if allowed then
  redis.call('ZADD', key, now, now .. ':' .. math.random())
end

-- Set expiration for cleanup
if ttl > 0 then
  redis.call('EXPIRE', key, ttl)
end

-- Calculate reset time (oldest entry + window duration)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local resetTime = now + windowMs
if #oldest > 0 then
  resetTime = tonumber(oldest[2]) + windowMs
end

-- Return results: [allowed, count, resetTime]
return {allowed and 1 or 0, count, resetTime}
`

/**
 * Lua script for getting sliding window status
 */
const SLIDING_WINDOW_STATUS_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])

local windowStart = now - windowMs

-- Remove entries outside the time window
redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

-- Get count and oldest entry
local count = redis.call('ZCARD', key)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')

local resetTime = now + windowMs
if #oldest > 0 then
  resetTime = tonumber(oldest[2]) + windowMs
end

return {count, resetTime}
`

/**
 * Sliding Window Algorithm Implementation
 */
export class SlidingWindow {
  private storage: IStorageAdapter
  private defaultTtl: number

  constructor(storage: IStorageAdapter, defaultTtl = 3600) {
    this.storage = storage
    this.defaultTtl = defaultTtl
  }

  /**
   * Check rate limit using sliding window algorithm
   * 
   * @param config Sliding window configuration
   * @returns Rate limit result
   */
  async check(config: SlidingWindowConfig): Promise<RateLimitResult> {
    const now = Date.now()
    const windowMs = config.windowSeconds * 1000
    const ttl = config.ttl ?? this.defaultTtl

    try {
      const result = await this.storage.eval(SLIDING_WINDOW_LUA, [config.key], [
        now,
        windowMs,
        config.limit,
        ttl
      ])

      const [allowed, count, resetTime] = result as [number, number, number]

      return {
        allowed: allowed === 1,
        limit: config.limit,
        remaining: Math.max(0, config.limit - count - (allowed === 1 ? 1 : 0)),
        resetTime,
        retryAfter: allowed === 1 ? 0 : Math.max(0, Math.ceil((resetTime - now) / 1000)),
        currentCount: count,
        algorithm: 'sliding-window',
        storage: this.storage.getType()
      }
    } catch (error) {
      throw new StorageError('Sliding window check failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Get current window status
   * 
   * @param key Window key
   * @param windowSeconds Window duration in seconds
   * @returns Window state
   */
  async getStatus(key: string, windowSeconds: number): Promise<SlidingWindowState> {
    const now = Date.now()
    const windowMs = windowSeconds * 1000

    try {
      const result = await this.storage.eval(SLIDING_WINDOW_STATUS_LUA, [key], [now, windowMs])
      const [count, resetTime] = result as [number, number]

      return {
        count,
        windowStart: now - windowMs,
        windowEnd: now,
        resetTime
      }
    } catch {
      return {
        count: 0,
        windowStart: now - windowMs,
        windowEnd: now,
        resetTime: now + windowMs
      }
    }
  }

  /**
   * Get all request timestamps in the current window
   * 
   * @param key Window key
   * @param windowSeconds Window duration in seconds
   * @returns Array of timestamps
   */
  async getTimestamps(key: string, windowSeconds: number): Promise<number[]> {
    const now = Date.now()
    const windowStart = now - windowSeconds * 1000

    try {
      // Clean up old entries first
      await this.storage.zremrangebyscore(key, 0, windowStart)
      
      // Get all entries
      const entries = await this.storage.zrange(key, 0, -1, true)
      
      // Extract timestamps (entries are in format "timestamp:random")
      return entries
        .map(entry => {
          const parts = entry.split(':')
          return parseInt(parts[0], 10)
        })
        .filter(ts => !isNaN(ts))
    } catch {
      return []
    }
  }

  /**
   * Reset the sliding window
   * 
   * @param key Window key
   */
  async reset(key: string): Promise<boolean> {
    return this.storage.delete(key)
  }

  /**
   * Clean up expired windows
   * 
   * @param pattern Key pattern to match
   * @returns Number of keys deleted
   */
  async cleanup(pattern: string): Promise<number> {
    // This is a simplified implementation
    // In production, you'd use SCAN for better performance
    try {
      const keys = await this.storage.eval(
        `local keys = redis.call('KEYS', ARGV[1])
         local deleted = 0
         for i = 1, #keys do
           local ttl = redis.call('TTL', keys[i])
           if ttl == -2 or ttl < 0 then
             redis.call('DEL', keys[i])
             deleted = deleted + 1
           end
         end
         return deleted`,
        [],
        [pattern]
      )
      return keys as number
    } catch {
      return 0
    }
  }

  /**
   * Get statistics for a window
   * 
   * @param key Window key
   * @param windowSeconds Window duration in seconds
   * @returns Statistics object
   */
  async getStats(key: string, windowSeconds: number): Promise<{
    count: number
    oldestTimestamp: number | null
    newestTimestamp: number | null
    resetTime: number
  }> {
    const now = Date.now()
    const windowStart = now - windowSeconds * 1000

    try {
      const result = await this.storage.pipeline([
        { command: 'ZREMRANGEBYSCORE', args: [key, 0, windowStart] },
        { command: 'ZCARD', args: [key] },
        { command: 'ZRANGE', args: [key, 0, 0, 'WITHSCORES'] },
        { command: 'ZRANGE', args: [key, -1, -1, 'WITHSCORES'] }
      ])

      const count = result[1] as number
      const oldest = result[2] as string[]
      const newest = result[3] as string[]

      const oldestTimestamp = oldest.length > 0 ? parseInt(oldest[1], 10) : null
      const newestTimestamp = newest.length > 0 ? parseInt(newest[1], 10) : null
      const resetTime = oldestTimestamp ? oldestTimestamp + windowSeconds * 1000 : now + windowSeconds * 1000

      return {
        count,
        oldestTimestamp,
        newestTimestamp,
        resetTime
      }
    } catch {
      return {
        count: 0,
        oldestTimestamp: null,
        newestTimestamp: null,
        resetTime: now + windowSeconds * 1000
      }
    }
  }
}

/**
 * In-memory sliding window implementation
 * Used as fallback when Redis is not available
 */
export class MemorySlidingWindow {
  private windows = new Map<string, number[]>()

  /**
   * Check rate limit using in-memory sliding window
   */
  check(config: SlidingWindowConfig): RateLimitResult {
    const now = Date.now()
    const windowMs = config.windowSeconds * 1000
    const windowStart = now - windowMs

    let timestamps = this.windows.get(config.key) ?? []

    // Remove entries outside the time window
    timestamps = timestamps.filter(ts => ts > windowStart)

    // Check if limit exceeded
    const allowed = timestamps.length < config.limit

    // If allowed, add current request
    if (allowed) {
      timestamps.push(now)
    }

    // Store updated timestamps
    this.windows.set(config.key, timestamps)

    // Calculate reset time
    const resetTime = timestamps.length > 0 
      ? timestamps[0] + windowMs 
      : now + windowMs

    return {
      allowed,
      limit: config.limit,
      remaining: Math.max(0, config.limit - timestamps.length),
      resetTime,
      retryAfter: allowed ? 0 : Math.max(0, Math.ceil((resetTime - now) / 1000)),
      currentCount: timestamps.length,
      algorithm: 'sliding-window',
      storage: 'memory'
    }
  }

  /**
   * Get window status
   */
  getStatus(key: string, windowSeconds: number): SlidingWindowState {
    const now = Date.now()
    const windowMs = windowSeconds * 1000
    const windowStart = now - windowMs

    let timestamps = this.windows.get(key) ?? []
    timestamps = timestamps.filter(ts => ts > windowStart)

    return {
      count: timestamps.length,
      windowStart,
      windowEnd: now,
      resetTime: timestamps.length > 0 ? timestamps[0] + windowMs : now + windowMs
    }
  }

  /**
   * Get all timestamps
   */
  getTimestamps(key: string, windowSeconds: number): number[] {
    const now = Date.now()
    const windowStart = now - windowSeconds * 1000

    let timestamps = this.windows.get(key) ?? []
    return timestamps.filter(ts => ts > windowStart)
  }

  /**
   * Reset window
   */
  reset(key: string): boolean {
    return this.windows.delete(key)
  }

  /**
   * Clear all windows
   */
  clear(): void {
    this.windows.clear()
  }

  /**
   * Get statistics
   */
  getStats(key: string, windowSeconds: number): {
    count: number
    oldestTimestamp: number | null
    newestTimestamp: number | null
    resetTime: number
  } {
    const now = Date.now()
    const windowMs = windowSeconds * 1000
    const windowStart = now - windowMs

    let timestamps = this.windows.get(key) ?? []
    timestamps = timestamps.filter(ts => ts > windowStart)

    const oldestTimestamp = timestamps.length > 0 ? timestamps[0] : null
    const newestTimestamp = timestamps.length > 0 ? timestamps[timestamps.length - 1] : null
    const resetTime = oldestTimestamp ? oldestTimestamp + windowMs : now + windowMs

    return {
      count: timestamps.length,
      oldestTimestamp,
      newestTimestamp,
      resetTime
    }
  }
}

/**
 * Calculate optimal precision for sliding window
 * 
 * @param windowSeconds Window duration in seconds
 * @param limit Maximum requests
 * @returns Recommended precision (number of sub-windows)
 */
export function calculateOptimalPrecision(windowSeconds: number, limit: number): number {
  // More precision for higher limits and shorter windows
  const basePrecision = 10
  const limitFactor = Math.ceil(limit / 100)
  const windowFactor = Math.ceil(60 / windowSeconds)
  
  return Math.min(100, Math.max(5, basePrecision + limitFactor + windowFactor))
}

export default SlidingWindow