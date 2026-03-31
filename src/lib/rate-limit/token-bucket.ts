/**
 * Token Bucket Rate Limiting Algorithm
 *
 * Uses Redis to implement token bucket algorithm for burst handling.
 *
 * Advantages:
 * - Handles burst traffic gracefully
 * - Configurable token refill rate
 * - Maximum bucket size (burst limit)
 * - Smooth traffic shaping
 */

import { getRedisClient, redisCommand } from '../redis/client';
import { getMemoryStore } from './memory-store';
import { shouldUseRedis, getCachedRedisAvailability } from './storage-factory';
import { logger } from '@/lib/logger';

export interface TokenBucketResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  tokensAvailable: number;
  storage: 'redis' | 'memory';
}

export interface TokenBucketConfig {
  key: string;
  capacity: number; // Maximum tokens in bucket (burst limit)
  refillRate: number; // Tokens to add per second
  window: number; // Time window in seconds (for reset time calculation)
  forceMemory?: boolean; // Force memory storage
}

/**
 * Token bucket state stored in Redis
 */
interface TokenBucketState {
  tokens: number;
  lastRefill: number;
}

/**
 * Check and update token bucket rate limit
 *
 * The token bucket algorithm:
 * 1. Refill tokens based on elapsed time
 * 2. If tokens available, consume one token and allow
 * 3. Otherwise, deny the request
 *
 * Uses Redis Lua script for atomic operations.
 */
export async function checkTokenBucket(
  config: TokenBucketConfig
): Promise<TokenBucketResult> {
  const { key, capacity, refillRate, window, forceMemory } = config;
  const now = Date.now();

  // 检查是否使用内存存储
  const useMemory = forceMemory || !shouldUseRedis();
  const redisAvailable = await getCachedRedisAvailability();

  // 如果应该使用 Redis 且 Redis 可用
  if (!useMemory && redisAvailable) {
    try {
      return await checkTokenBucketRedis(key, capacity, refillRate, window, now);
    } catch (_error) {
      logger.error('Redis token bucket check failed, falling back to memory', { error, key, capacity, refillRate });
      // Fall back to memory storage
      return checkTokenBucketMemory(key, capacity, refillRate, window, now);
    }
  }

  // 使用内存存储
  return checkTokenBucketMemory(key, capacity, refillRate, window, now);
}

/**
 * 使用 Redis 检查令牌桶
 */
async function checkTokenBucketRedis(
  key: string,
  capacity: number,
  refillRate: number,
  window: number,
  now: number
): Promise<TokenBucketResult> {
  const client = getRedisClient();

  if (!client) {
    throw new Error('Redis client not available');
  }

  // Lua script for atomic token bucket operations
  const luaScript = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local capacity = tonumber(ARGV[2])
    local refillRate = tonumber(ARGV[3])

    -- Get current state
    local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
    local tokens = tonumber(data[1])
    local lastRefill = tonumber(data[2])

    -- Initialize if first request
    if tokens == nil then
      tokens = capacity
      lastRefill = now
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

    -- Update state
    redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
    redis.call('EXPIRE', key, 3600)

    -- Return results
    return {allowed, tokens, lastRefill}
  `;

  // Execute Lua script
  const result = await client.eval(
    luaScript,
    1,
    key,
    now,
    capacity,
    refillRate
  );

  const [allowed, tokens, lastRefill] = result as [boolean, number, number];
  const remaining = Math.max(0, Math.floor(tokens));
  const resetTime = now + window * 1000;

  return {
    allowed,
    remaining,
    resetTime,
    tokensAvailable: remaining,
    storage: 'redis',
  };
}

/**
 * 使用内存检查令牌桶
 */
function checkTokenBucketMemory(
  key: string,
  capacity: number,
  refillRate: number,
  window: number,
  now: number
): TokenBucketResult {
  const memoryStore = getMemoryStore();
  const result = memoryStore.checkTokenBucket(key, capacity, refillRate, window);

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
    tokensAvailable: result.tokensAvailable,
    storage: 'memory',
  };
}

/**
 * Get current token bucket status
 */
export async function getTokenBucketStatus(
  key: string
): Promise<{ tokens: number; lastRefill: number | null; capacity: number; storage: 'redis' | 'memory' }> {
  const useMemory = !shouldUseRedis();
  const redisAvailable = await getCachedRedisAvailability();

  // 如果应该使用 Redis 且 Redis 可用
  if (!useMemory && redisAvailable) {
    try {
      return await getTokenBucketStatusRedis(key);
    } catch (_error) {
      logger.error('Redis token bucket status check failed, falling back to memory', { error, key });
      // Fall back to memory storage
      return getTokenBucketStatusMemory(key);
    }
  }

  // 使用内存存储
  return getTokenBucketStatusMemory(key);
}

/**
 * 使用 Redis 获取令牌桶状态
 */
async function getTokenBucketStatusRedis(
  key: string
): Promise<{ tokens: number; lastRefill: number | null; capacity: number; storage: 'redis' | 'memory' }> {
  const client = getRedisClient();

  if (!client) {
    throw new Error('Redis client not available');
  }

  const data = await client.hmget(key, 'tokens', 'lastRefill', 'capacity');
  const tokens = parseFloat(data[0] || '0');
  const lastRefill = data[1] ? parseInt(data[1]) : null;
  const capacity = parseInt(data[2] || '0');

  return { tokens, lastRefill, capacity, storage: 'redis' };
}

/**
 * 使用内存获取令牌桶状态
 */
function getTokenBucketStatusMemory(
  key: string
): { tokens: number; lastRefill: number | null; capacity: number; storage: 'redis' | 'memory' } {
  const memoryStore = getMemoryStore();
  const status = memoryStore.getTokenBucketStatus(key);

  if (!status) {
    return { tokens: 0, lastRefill: null, capacity: 0, storage: 'memory' };
  }

  return {
    tokens: status.tokens,
    lastRefill: status.lastRefill,
    capacity: status.capacity,
    storage: 'memory',
  };
}

/**
 * Reset token bucket for a key
 */
export async function resetTokenBucket(key: string, capacity: number): Promise<boolean> {
  return (await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return false;
      }

      const now = Date.now();
      await client.hmset(key, 'tokens', capacity, 'lastRefill', now);
      await client.expire(key, 3600);

      return true;
    },
    false
  )) ?? false;
}

/**
 * Set token bucket capacity (for dynamic adjustments)
 */
export async function setTokenBucketCapacity(
  key: string,
  capacity: number
): Promise<boolean> {
  return (await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return false;
      }

      await client.hset(key, 'capacity', capacity);
      return true;
    },
    false
  )) ?? false;
}

/**
 * Add tokens to bucket (for manual adjustments)
 */
export async function addTokensToBucket(
  key: string,
  tokensToAdd: number,
  maxCapacity: number
): Promise<{ success: boolean; newTokenCount: number }> {
  return (await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return { success: false, newTokenCount: 0 };
      }

      const luaScript = `
        local key = KEYS[1]
        local tokensToAdd = tonumber(ARGV[1])
        local maxCapacity = tonumber(ARGV[2])

        local tokens = tonumber(redis.call('HGET', key, 'tokens') or '0')
        local newTokens = math.min(maxCapacity, tokens + tokensToAdd)

        redis.call('HSET', key, 'tokens', newTokens)

        return newTokens
      `;

      const newTokens = await client.eval(luaScript, 1, key, tokensToAdd, maxCapacity) as number;

      return { success: true, newTokenCount: newTokens };
    },
    { success: false, newTokenCount: 0 }
  )) ?? { success: false, newTokenCount: 0 };
}

/**
 * Consume tokens from bucket (for batch operations)
 */
export async function consumeTokens(
  key: string,
  tokensToConsume: number,
  capacity: number
): Promise<{ allowed: boolean; remaining: number }> {
  return (await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return { allowed: true, remaining: capacity - tokensToConsume };
      }

      const luaScript = `
        local key = KEYS[1]
        local tokensToConsume = tonumber(ARGV[1])
        local capacity = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
        local tokens = tonumber(data[1] or capacity)
        local lastRefill = tonumber(data[2] or now)

        -- Refill tokens
        local elapsed = (now - lastRefill) / 1000
        if elapsed > 0 then
          local refillRate = capacity / 60  -- Default refill rate: capacity per minute
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
        redis.call('EXPIRE', key, 3600)

        return {allowed, tokens}
      `;

      const now = Date.now();
      const [allowed, remaining] = await client.eval(
        luaScript,
        1,
        key,
        tokensToConsume,
        capacity,
        now
      ) as [boolean, number];

      return { allowed, remaining };
    },
    { allowed: true, remaining: capacity - tokensToConsume }
  )) ?? { allowed: true, remaining: capacity - tokensToConsume };
}
