/**
 * Rate Limiting Gateway
 * 
 * Enterprise-grade API Gateway rate limiting system.
 * 
 * Features:
 * - Token Bucket algorithm with burst support
 * - Sliding Window Counter with precise control
 * - Multi-layer rate limiting (Global/IP/API Key/User)
 * - Redis distributed support with cluster mode
 * - Standard X-RateLimit-* headers (IETF draft)
 * - Management API for monitoring and control
 * 
 * @version 1.10.0
 * @author API Gateway Team
 */

// ============================================================================
// Types
// ============================================================================

export type {
  RateLimitAlgorithm,
  RateLimitLayer,
  StorageBackend,
  RateLimitResult,
  TokenBucketConfig,
  TokenBucketState,
  SlidingWindowConfig,
  SlidingWindowState,
  TierConfig,
  IpRateLimitConfig,
  UserRateLimitConfig,
  ApiKeyRateLimitConfig,
  GlobalRateLimitConfig,
  MultiLayerRateLimitConfig,
  RateLimitContext,
  RateLimitHeaders,
  RateLimitPolicy,
  IStorageAdapter,
  PipelineCommand,
  RateLimitStatus,
  RateLimitAdjustment,
  RateLimitStats
} from './types'

export { RateLimitError, StorageError } from './types'

// ============================================================================
// Algorithms
// ============================================================================

export { 
  TokenBucket, 
  MemoryTokenBucket 
} from './algorithms/token-bucket'

export { 
  SlidingWindow, 
  MemorySlidingWindow,
  calculateOptimalPrecision 
} from './algorithms/sliding-window'

// ============================================================================
// Storage
// ============================================================================

export { 
  RedisAdapter, 
  createRedisAdapterFromEnv 
} from './storage/redis-adapter'

export { 
  MemoryAdapter, 
  getMemoryAdapter 
} from './storage/memory-adapter'

// ============================================================================
// Middleware
// ============================================================================

export {
  MultiLayerMiddleware,
  extractContext,
  DEFAULT_CONFIG,
  type MultiLayerResult,
  type LayerResult,
  type IMetricsCollector
} from './middleware/multi-layer'

export {
  createRateLimitMiddleware,
  createConditionalMiddleware,
  createRouteMiddleware,
  rateLimited,
  presets,
  type ExpressMiddlewareConfig
} from './middleware/express'

// ============================================================================
// Management API
// ============================================================================

export {
  createManagementApi,
  mountManagementApi,
  type ManagementApiConfig
} from './api/management'

// ============================================================================
// Factory Functions
// ============================================================================

import type { IStorageAdapter, MultiLayerRateLimitConfig, RateLimitContext } from './types'
import { RedisAdapter, createRedisAdapterFromEnv } from './storage/redis-adapter'
import { MemoryAdapter } from './storage/memory-adapter'
import { MultiLayerMiddleware, DEFAULT_CONFIG } from './middleware/multi-layer'
import { createRateLimitMiddleware } from './middleware/express'
import { TokenBucket } from './algorithms/token-bucket'
import { SlidingWindow } from './algorithms/sliding-window'

/**
 * Create a rate limiting gateway with all components
 */
export function createRateLimitingGateway(options: {
  storage?: IStorageAdapter
  redisUrl?: string
  redisClusterNodes?: Array<{ host: string; port: number }>
  keyPrefix?: string
  config?: Partial<MultiLayerRateLimitConfig>
  metrics?: {
    recordCheck: (layer: string, allowed: boolean, duration: number) => void
    recordError: (layer: string, error: Error) => void
  }
}): {
  storage: IStorageAdapter
  middleware: MultiLayerMiddleware
  expressMiddleware: ReturnType<typeof createRateLimitMiddleware>
} {
  // Create storage
  let storage: IStorageAdapter

  if (options.storage) {
    storage = options.storage
  } else if (options.redisClusterNodes && options.redisClusterNodes.length > 0) {
    storage = new RedisAdapter({
      clusterNodes: options.redisClusterNodes,
      keyPrefix: options.keyPrefix
    })
  } else if (options.redisUrl || process.env.REDIS_URL) {
    storage = new RedisAdapter({
      url: options.redisUrl ?? process.env.REDIS_URL,
      keyPrefix: options.keyPrefix
    })
  } else {
    storage = new MemoryAdapter()
  }

  // Create metrics collector if provided
  const metrics = options.metrics ? {
    recordCheck: (layer: 'global' | 'ip' | 'api-key' | 'user', allowed: boolean, duration: number) => {
      options.metrics?.recordCheck(layer, allowed, duration)
    },
    recordError: (layer: 'global' | 'ip' | 'api-key' | 'user', error: Error) => {
      options.metrics?.recordError(layer, error)
    }
  } : undefined

  // Create middleware
  const middleware = new MultiLayerMiddleware(storage, options.config, metrics)

  // Create Express middleware
  const expressMiddleware = createRateLimitMiddleware({
    storage,
    ...options.config
  })

  return {
    storage,
    middleware,
    expressMiddleware
  }
}

/**
 * Quick setup for common use cases
 */
export const quickSetup = {
  /**
   * Basic rate limiting with sensible defaults
   */
  basic: (redisUrl?: string) => 
    createRateLimitingGateway({
      redisUrl,
      config: {
        ip: { enabled: true, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 100 },
        user: { enabled: true, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 200 },
        global: { enabled: true, algorithm: 'token-bucket', rate: 1000, burst: 2000 }
      }
    }),

  /**
   * Strict rate limiting for authentication endpoints
   */
  strict: (redisUrl?: string) =>
    createRateLimitingGateway({
      redisUrl,
      config: {
        ip: { enabled: true, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 20 },
        user: { enabled: true, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 50 },
        global: { enabled: true, algorithm: 'token-bucket', rate: 100, burst: 200 }
      }
    }),

  /**
   * API-focused rate limiting with tiers
   */
  apiWithTiers: (redisUrl?: string) =>
    createRateLimitingGateway({
      redisUrl,
      config: {
        ip: { enabled: true, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 60 },
        apiKey: {
          enabled: true,
          algorithm: 'token-bucket',
          defaultTier: 'free',
          tiers: {
            free: { name: 'free', rate: 2, burst: 10, dailyLimit: 1000 },
            basic: { name: 'basic', rate: 10, burst: 30, dailyLimit: 10000 },
            pro: { name: 'pro', rate: 50, burst: 150, dailyLimit: 100000 },
            enterprise: { name: 'enterprise', rate: 200, burst: 500, dailyLimit: 1000000 }
          }
        },
        global: { enabled: true, algorithm: 'token-bucket', rate: 5000, burst: 10000 }
      }
    }),

  /**
   * Development mode with memory storage
   */
  development: () =>
    createRateLimitingGateway({
      config: {
        ip: { enabled: true, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 1000 },
        global: { enabled: false, algorithm: 'token-bucket', rate: 0, burst: 0 }
      }
    })
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse rate limit policy string
 * Format: "limit;windowSeconds;algorithm"
 */
export function parsePolicy(policy: string): {
  limit: number
  windowSeconds: number
  algorithm: 'token-bucket' | 'sliding-window' | 'fixed-window'
} | null {
  const parts = policy.split(';')
  
  if (parts.length !== 3) {
    return null
  }

  const [limitStr, windowStr, algorithm] = parts
  const limit = parseInt(limitStr, 10)
  const windowSeconds = parseInt(windowStr, 10)

  if (isNaN(limit) || isNaN(windowSeconds)) {
    return null
  }

  if (!['token-bucket', 'sliding-window', 'fixed-window'].includes(algorithm)) {
    return null
  }

  return { limit, windowSeconds, algorithm: algorithm as 'token-bucket' | 'sliding-window' | 'fixed-window' }
}

/**
 * Generate rate limit policy string
 */
export function generatePolicy(
  limit: number,
  windowSeconds: number,
  algorithm: 'token-bucket' | 'sliding-window' | 'fixed-window'
): string {
  return `${limit};${windowSeconds};${algorithm}`
}

/**
 * Calculate retry-after header value
 */
export function calculateRetryAfter(resetTime: number): number {
  return Math.max(0, Math.ceil((resetTime - Date.now()) / 1000))
}

/**
 * Check if IP is in CIDR range
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  // Simple implementation for IPv4
  const [range, bits = '32'] = cidr.split('/')
  const mask = parseInt(bits, 10)

  if (mask === 0) return true

  const ipNum = ipToNumber(ip)
  const rangeNum = ipToNumber(range)

  if (ipNum === null || rangeNum === null) return false

  const maskNum = ~((1 << (32 - mask)) - 1)
  return (ipNum & maskNum) === (rangeNum & maskNum)
}

/**
 * Convert IP to number
 */
function ipToNumber(ip: string): number | null {
  const parts = ip.split('.').map(p => parseInt(p, 10))
  
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return null
  }

  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
}

/**
 * Create a composite key for rate limiting
 */
export function createKey(
  prefix: string,
  ...parts: (string | number)[]
): string {
  return `${prefix}:${parts.join(':')}`
}

/**
 * Extract rate limit info from headers
 */
export function extractRateLimitInfo(headers: Record<string, string>): {
  limit: number | null
  remaining: number | null
  resetTime: Date | null
  retryAfter: number | null
} {
  return {
    limit: headers['x-ratelimit-limit'] ? parseInt(headers['x-ratelimit-limit'], 10) : null,
    remaining: headers['x-ratelimit-remaining'] ? parseInt(headers['x-ratelimit-remaining'], 10) : null,
    resetTime: headers['x-ratelimit-reset'] ? new Date(headers['x-ratelimit-reset']) : null,
    retryAfter: headers['retry-after'] ? parseInt(headers['retry-after'], 10) : null
  }
}

// Default export
export default {
  createRateLimitingGateway,
  quickSetup,
  createRateLimitMiddleware,
  MultiLayerMiddleware,
  TokenBucket,
  SlidingWindow,
  RedisAdapter,
  MemoryAdapter,
  parsePolicy,
  generatePolicy,
  calculateRetryAfter,
  isIpInCidr,
  createKey,
  extractRateLimitInfo
}
