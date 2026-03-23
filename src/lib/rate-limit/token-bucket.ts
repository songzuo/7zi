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
import { logger } from '@/lib/logger';

export interface TokenBucketResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  tokensAvailable: number;
}

export interface TokenBucketConfig {
  key: string;
  capacity: number; // Maximum tokens in bucket (burst limit)
  refillRate: number; // Tokens to add per second
  window: number; // Time window in seconds (for reset time calculation)
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
  const { key, capacity, refillRate, window } = config;
  const now = Date.now();

  try {
    const client = getRedisClient();

    if (!client) {
      logger.warn('Redis not available for token bucket check');
      return {
        allowed: true,
        remaining: capacity - 1,
        resetTime: now + window * 1000,
        tokensAvailable: capacity,
      };
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
    };
  } catch (error) {
    logger.error('Token bucket check failed', { error, key, capacity, refillRate });

    // Fail open - allow request if Redis fails
    return {
      allowed: true,
      remaining: capacity - 1,
      resetTime: now + window * 1000,
      tokensAvailable: capacity,
    };
  }
}

/**
 * Get current token bucket status
 */
export async function getTokenBucketStatus(
  key: string
): Promise<{ tokens: number; lastRefill: number | null; capacity: number }> {
  const defaultResult = { tokens: 0, lastRefill: null, capacity: 0 };

  const result = await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return defaultResult;
      }

      const data = await client.hmget(key, 'tokens', 'lastRefill', 'capacity');
      const tokens = parseFloat(data[0] || '0');
      const lastRefill = data[1] ? parseInt(data[1]) : null;
      const capacity = parseInt(data[2] || '0');

      return { tokens, lastRefill, capacity };
    },
    defaultResult
  );

  return result ?? defaultResult;
}

/**
 * Reset token bucket for a key
 */
export async function resetTokenBucket(key: string, capacity: number): Promise<boolean> {
  const result = await redisCommand(
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
  );

  return result ?? false;
}

/**
 * Set token bucket capacity (for dynamic adjustments)
 */
export async function setTokenBucketCapacity(
  key: string,
  capacity: number
): Promise<boolean> {
  const result = await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return false;
      }

      await client.hset(key, 'capacity', capacity);
      return true;
    },
    false
  );

  return result ?? false;
}

/**
 * Add tokens to bucket (for manual adjustments)
 */
export async function addTokensToBucket(
  key: string,
  tokensToAdd: number,
  maxCapacity: number
): Promise<{ success: boolean; newTokenCount: number }> {
  const defaultResult = { success: false, newTokenCount: 0 };

  const result = await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return defaultResult;
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
    defaultResult
  );

  return result ?? defaultResult;
}

/**
 * Consume tokens from bucket (for batch operations)
 */
export async function consumeTokens(
  key: string,
  tokensToConsume: number,
  capacity: number
): Promise<{ allowed: boolean; remaining: number }> {
  const defaultResult = { allowed: true, remaining: capacity - tokensToConsume };

  const result = await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return defaultResult;
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
    defaultResult
  );

  return result ?? defaultResult;
}
