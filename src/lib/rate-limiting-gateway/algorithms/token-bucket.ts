/**
 * Token Bucket Rate Limiting Algorithm
 * 
 * High-performance token bucket implementation with Redis support.
 * Supports burst traffic handling with configurable refill rates.
 * 
 * @version 1.10.0
 */

import type {
  TokenBucketConfig,
  TokenBucketState,
  RateLimitResult,
  IStorageAdapter,
  StorageBackend
} from '../types'
import { StorageError } from '../types'

/**
 * Lua script for atomic token bucket operations
 * 
 * This script performs the following atomically:
 * 1. Get or initialize bucket state
 * 2. Refill tokens based on elapsed time
 * 3. Check if request can be allowed
 * 4. Consume token if allowed
 * 5. Update state and return result
 */
const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refillRate = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

-- Get current state
local data = redis.call('HMGET', key, 'tokens', 'lastRefill', 'capacity')
local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])
local storedCapacity = tonumber(data[3])

-- Initialize if first request or capacity changed
if tokens == nil then
  tokens = capacity
  lastRefill = now
  storedCapacity = capacity
elseif storedCapacity ~= capacity then
  -- Capacity was updated, scale tokens proportionally
  tokens = math.min(capacity, tokens * capacity / storedCapacity)
  storedCapacity = capacity
end

-- Refill tokens based on elapsed time
local elapsed = (now - lastRefill) / 1000
if elapsed > 0 then
  local newTokens = math.min(capacity, tokens + elapsed * refillRate)
  tokens = newTokens
  lastRefill = now
end

-- Check if we have tokens available
local allowed = false
if tokens >= 1 then
  tokens = tokens - 1
  allowed = true
end

-- Calculate reset time (when next token will be available)
local resetTime = now
if tokens < 1 then
  local timeToNextToken = (1 - tokens) / refillRate
  resetTime = now + math.ceil(timeToNextToken * 1000)
end

-- Update state
redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill, 'capacity', storedCapacity)
if ttl > 0 then
  redis.call('EXPIRE', key, ttl)
end

-- Return results: [allowed, tokens, resetTime]
return {allowed and 1 or 0, tokens, resetTime}
`

/**
 * Lua script for batch token consumption
 */
const CONSUME_TOKENS_LUA = `
local key = KEYS[1]
local tokensToConsume = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local capacity = tonumber(ARGV[3])
local refillRate = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

-- Get current state
local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(data[1]) or capacity
local lastRefill = tonumber(data[2]) or now

-- Refill tokens
local elapsed = (now - lastRefill) / 1000
if elapsed > 0 then
  tokens = math.min(capacity, tokens + elapsed * refillRate)
  lastRefill = now
end

-- Check if we have enough tokens
local allowed = false
if tokens >= tokensToConsume then
  tokens = tokens - tokensToConsume
  allowed = true
end

-- Update state
redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
if ttl > 0 then
  redis.call('EXPIRE', key, ttl)
end

-- Calculate reset time
local resetTime = now
if tokens < 1 then
  local timeToNextToken = (1 - tokens) / refillRate
  resetTime = now + math.ceil(timeToNextToken * 1000)
end

return {allowed and 1 or 0, tokens, resetTime}
`

/**
 * Token Bucket Algorithm Implementation
 */
export class TokenBucket {
  private storage: IStorageAdapter
  private defaultTtl: number

  constructor(storage: IStorageAdapter, defaultTtl = 3600) {
    this.storage = storage
    this.defaultTtl = defaultTtl
  }

  /**
   * Check rate limit using token bucket algorithm
   * 
   * @param config Token bucket configuration
   * @returns Rate limit result
   */
  async check(config: TokenBucketConfig): Promise<RateLimitResult> {
    const now = Date.now()
    const ttl = config.ttl ?? this.defaultTtl

    try {
      const result = await this.storage.eval(TOKEN_BUCKET_LUA, [config.key], [
        now,
        config.capacity,
        config.refillRate,
        ttl
      ])

      const [allowed, tokens, resetTime] = result as [number, number, number]

      return {
        allowed: allowed === 1,
        limit: config.capacity,
        remaining: Math.max(0, Math.floor(tokens)),
        resetTime,
        retryAfter: allowed === 1 ? 0 : Math.max(0, Math.ceil((resetTime - now) / 1000)),
        tokensAvailable: tokens,
        algorithm: 'token-bucket',
        storage: this.storage.getType()
      }
    } catch (error) {
      throw new StorageError('Token bucket check failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Consume multiple tokens at once
   * 
   * @param key Bucket key
   * @param tokensToConsume Number of tokens to consume
   * @param config Bucket configuration
   * @returns Rate limit result
   */
  async consume(
    key: string,
    tokensToConsume: number,
    config: Omit<TokenBucketConfig, 'key'>
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const ttl = config.ttl ?? this.defaultTtl

    try {
      const result = await this.storage.eval(CONSUME_TOKENS_LUA, [key], [
        tokensToConsume,
        now,
        config.capacity,
        config.refillRate,
        ttl
      ])

      const [allowed, tokens, resetTime] = result as [number, number, number]

      return {
        allowed: allowed === 1,
        limit: config.capacity,
        remaining: Math.max(0, Math.floor(tokens)),
        resetTime,
        retryAfter: allowed === 1 ? 0 : Math.max(0, Math.ceil((resetTime - now) / 1000)),
        tokensAvailable: tokens,
        algorithm: 'token-bucket',
        storage: this.storage.getType()
      }
    } catch (error) {
      throw new StorageError('Token bucket consume failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Get current bucket state
   * 
   * @param key Bucket key
   * @returns Bucket state or null if not exists
   */
  async getState(key: string): Promise<TokenBucketState | null> {
    try {
      const data = await this.storage.pipeline([
        { command: 'HGET', args: [key, 'tokens'] },
        { command: 'HGET', args: [key, 'lastRefill'] },
        { command: 'HGET', args: [key, 'capacity'] }
      ])

      if (!data[0]) {
        return null
      }

      return {
        tokens: parseFloat(data[0] as string),
        lastRefill: parseInt(data[1] as string, 10),
        capacity: parseInt(data[2] as string, 10)
      }
    } catch {
      return null
    }
  }

  /**
   * Add tokens to a bucket (for manual adjustments)
   * 
   * @param key Bucket key
   * @param tokensToAdd Tokens to add
   * @param maxCapacity Maximum capacity
   * @returns New token count
   */
  async addTokens(key: string, tokensToAdd: number, maxCapacity: number): Promise<number> {
    const state = await this.getState(key)
    
    if (!state) {
      // Bucket doesn't exist, create it
      const newTokens = Math.min(maxCapacity, tokensToAdd)
      await this.storage.set(
        key,
        JSON.stringify({ tokens: newTokens, lastRefill: Date.now(), capacity: maxCapacity }),
        this.defaultTtl
      )
      return newTokens
    }

    const newTokens = Math.min(maxCapacity, state.tokens + tokensToAdd)
    
    // Update tokens atomically
    const addTokensLua = `
local key = KEYS[1]
local tokensToAdd = tonumber(ARGV[1])
local maxCapacity = tonumber(ARGV[2])

local tokens = tonumber(redis.call('HGET', key, 'tokens') or 0)
local newTokens = math.min(maxCapacity, tokens + tokensToAdd)

redis.call('HSET', key, 'tokens', newTokens)
return newTokens
`
    
    const result = await this.storage.eval(addTokensLua, [key], [tokensToAdd, maxCapacity])
    return result as number
  }

  /**
   * Set bucket capacity (for dynamic adjustments)
   * 
   * @param key Bucket key
   * @param newCapacity New capacity
   */
  async setCapacity(key: string, newCapacity: number): Promise<void> {
    await this.storage.eval(
      `redis.call('HSET', KEYS[1], 'capacity', ARGV[1])`,
      [key],
      [newCapacity]
    )
  }

  /**
   * Reset bucket to full capacity
   * 
   * @param key Bucket key
   * @param capacity Bucket capacity
   */
  async reset(key: string, capacity: number): Promise<void> {
    const now = Date.now()
    await this.storage.pipeline([
      { command: 'HSET', args: [key, 'tokens', capacity] },
      { command: 'HSET', args: [key, 'lastRefill', now] },
      { command: 'HSET', args: [key, 'capacity', capacity] }
    ])
  }

  /**
   * Delete a bucket
   * 
   * @param key Bucket key
   */
  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key)
  }

  /**
   * Calculate time until next token is available
   * 
   * @param tokens Current token count
   * @param refillRate Refill rate (tokens/second)
   * @returns Milliseconds until next token
   */
  static timeToNextToken(tokens: number, refillRate: number): number {
    if (tokens >= 1) return 0
    return Math.ceil((1 - tokens) / refillRate * 1000)
  }

  /**
   * Calculate burst allowance
   * 
   * @param capacity Bucket capacity
   * @param refillRate Refill rate
   * @param duration Duration in seconds
   * @returns Maximum requests allowed in duration
   */
  static calculateBurstAllowance(capacity: number, refillRate: number, duration: number): number {
    // Initial burst + refilled tokens over duration
    return Math.floor(capacity + refillRate * duration)
  }
}

/**
 * In-memory token bucket implementation
 * Used as fallback when Redis is not available
 */
export class MemoryTokenBucket {
  private buckets = new Map<string, TokenBucketState>()

  /**
   * Check rate limit using in-memory token bucket
   */
  check(config: TokenBucketConfig): RateLimitResult {
    const now = Date.now()
    let state = this.buckets.get(config.key)

    if (!state) {
      state = {
        tokens: config.initialTokens ?? config.capacity,
        lastRefill: now,
        capacity: config.capacity
      }
      this.buckets.set(config.key, state)
    }

    // Refill tokens
    const elapsed = (now - state.lastRefill) / 1000
    if (elapsed > 0) {
      state.tokens = Math.min(config.capacity, state.tokens + elapsed * config.refillRate)
      state.lastRefill = now
    }

    // Check and consume
    const allowed = state.tokens >= 1
    if (allowed) {
      state.tokens -= 1
    }

    // Calculate reset time
    let resetTime = now
    if (state.tokens < 1) {
      resetTime = now + Math.ceil((1 - state.tokens) / config.refillRate * 1000)
    }

    return {
      allowed,
      limit: config.capacity,
      remaining: Math.max(0, Math.floor(state.tokens)),
      resetTime,
      retryAfter: allowed ? 0 : Math.max(0, Math.ceil((resetTime - now) / 1000)),
      tokensAvailable: state.tokens,
      algorithm: 'token-bucket',
      storage: 'memory'
    }
  }

  /**
   * Get bucket state
   */
  getState(key: string): TokenBucketState | null {
    return this.buckets.get(key) ?? null
  }

  /**
   * Reset bucket
   */
  reset(key: string, capacity: number): void {
    this.buckets.set(key, {
      tokens: capacity,
      lastRefill: Date.now(),
      capacity
    })
  }

  /**
   * Delete bucket
   */
  delete(key: string): boolean {
    return this.buckets.delete(key)
  }

  /**
   * Clear all buckets
   */
  clear(): void {
    this.buckets.clear()
  }
}

export default TokenBucket
