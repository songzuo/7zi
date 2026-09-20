/**
 * Rate Limiting Gateway Types
 * 
 * Enterprise-grade rate limiting types for API Gateway
 * @version 1.10.0
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Rate limiting algorithm types
 */
export type RateLimitAlgorithm = 'token-bucket' | 'sliding-window' | 'fixed-window' | 'leaky-bucket'

/**
 * Rate limiting layer types (in order of execution)
 */
export type RateLimitLayer = 'global' | 'ip' | 'api-key' | 'user'

/**
 * Storage backend types
 */
export type StorageBackend = 'redis' | 'memory' | 'redis-cluster'

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Maximum requests allowed in the window */
  limit: number
  /** Remaining requests in the current window */
  remaining: number
  /** Unix timestamp when the limit resets */
  resetTime: number
  /** Seconds until retry is allowed */
  retryAfter: number
  /** Current request count in the window */
  currentCount?: number
  /** Tokens available (for token bucket) */
  tokensAvailable?: number
  /** Which layer triggered the limit */
  layer?: RateLimitLayer
  /** Algorithm used */
  algorithm: RateLimitAlgorithm
  /** Storage backend used */
  storage: StorageBackend
}

// ============================================================================
// Token Bucket Types
// ============================================================================

/**
 * Token bucket configuration
 */
export interface TokenBucketConfig {
  /** Unique key for the bucket */
  key: string
  /** Maximum tokens (burst capacity) */
  capacity: number
  /** Tokens added per second */
  refillRate: number
  /** Initial tokens (defaults to capacity) */
  initialTokens?: number
  /** Time-to-live for the bucket in seconds */
  ttl?: number
}

/**
 * Token bucket state
 */
export interface TokenBucketState {
  /** Current token count */
  tokens: number
  /** Last refill timestamp (ms) */
  lastRefill: number
  /** Bucket capacity */
  capacity: number
}

// ============================================================================
// Sliding Window Types
// ============================================================================

/**
 * Sliding window configuration
 */
export interface SlidingWindowConfig {
  /** Unique key for the window */
  key: string
  /** Maximum requests in the window */
  limit: number
  /** Window duration in seconds */
  windowSeconds: number
  /** Precision of the window (number of sub-windows, default 10) */
  precision?: number
  /** Time-to-live for the window in seconds */
  ttl?: number
}

/**
 * Sliding window state
 */
export interface SlidingWindowState {
  /** Current count in the window */
  count: number
  /** Window start timestamp (ms) */
  windowStart: number
  /** Window end timestamp (ms) */
  windowEnd: number
  /** Request timestamps in the window */
  timestamps?: number[]
  /** Reset time timestamp (ms) */
  resetTime?: number
}

// ============================================================================
// Multi-Layer Configuration
// ============================================================================

/**
 * Tier configuration for API keys
 */
export interface TierConfig {
  /** Tier name */
  name: string
  /** Tokens per second */
  rate: number
  /** Burst capacity */
  burst: number
  /** Daily request limit */
  dailyLimit?: number
  /** Monthly request limit */
  monthlyLimit?: number
  /** Custom limits per endpoint */
  endpointLimits?: Record<string, { rate: number; burst: number }>
}

/**
 * IP-based rate limit configuration
 */
export interface IpRateLimitConfig {
  /** Enable IP rate limiting */
  enabled: boolean
  /** Algorithm to use */
  algorithm: RateLimitAlgorithm
  /** Window duration in milliseconds */
  windowMs: number
  /** Maximum requests per window */
  maxRequests: number
  /** Whitelisted IPs */
  whitelist?: string[]
  /** Blacklisted IPs */
  blacklist?: string[]
  /** Skip rate limiting for certain conditions */
  skipIf?: (ip: string) => boolean
}

/**
 * User-based rate limit configuration
 */
export interface UserRateLimitConfig {
  /** Enable user rate limiting */
  enabled: boolean
  /** Algorithm to use */
  algorithm: RateLimitAlgorithm
  /** Window duration in milliseconds */
  windowMs: number
  /** Maximum requests per window */
  maxRequests: number
  /** Tier-specific overrides */
  tiers?: Record<string, { windowMs: number; maxRequests: number }>
  /** Whitelisted user IDs */
  whitelist?: string[]
}

/**
 * API Key-based rate limit configuration
 */
export interface ApiKeyRateLimitConfig {
  /** Enable API key rate limiting */
  enabled: boolean
  /** Algorithm to use */
  algorithm: RateLimitAlgorithm
  /** Default tier for API keys without tier */
  defaultTier: string
  /** Tier configurations */
  tiers: Record<string, TierConfig>
  /** Whitelisted API keys */
  whitelist?: string[]
}

/**
 * Global rate limit configuration
 */
export interface GlobalRateLimitConfig {
  /** Enable global rate limiting */
  enabled: boolean
  /** Algorithm to use */
  algorithm: RateLimitAlgorithm
  /** Tokens per second */
  rate: number
  /** Burst capacity */
  burst: number
}

/**
 * Complete multi-layer rate limit configuration
 */
export interface MultiLayerRateLimitConfig {
  /** IP-based rate limiting */
  ip: IpRateLimitConfig
  /** User-based rate limiting */
  user: UserRateLimitConfig
  /** API Key-based rate limiting */
  apiKey: ApiKeyRateLimitConfig
  /** Global rate limiting */
  global: GlobalRateLimitConfig
  /** Custom key generator */
  keyGenerator?: (context: RateLimitContext) => string
  /** Custom error handler */
  onError?: (error: Error, context: RateLimitContext) => void
  /** Enable fail-open mode (allow on storage failure) */
  failOpen?: boolean
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Rate limit context passed through middleware
 */
export interface RateLimitContext {
  /** Client IP address */
  ip: string
  /** User ID (if authenticated) */
  userId?: string
  /** API key (if provided) */
  apiKey?: string
  /** API key tier */
  apiKeyTier?: string
  /** Request path */
  path: string
  /** Request method */
  method: string
  /** Request headers */
  headers: Record<string, string>
  /** Request timestamp */
  timestamp: number
  /** Custom data */
  data?: Record<string, unknown>
}

// ============================================================================
// Response Header Types
// ============================================================================

/**
 * Rate limit response headers following IETF draft standard
 * @see https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers
 */
export interface RateLimitHeaders extends Record<string, string | undefined> {
  /** Maximum requests allowed per window (X-RateLimit-Limit) */
  'X-RateLimit-Limit': string
  /** Remaining requests in current window (X-RateLimit-Remaining) */
  'X-RateLimit-Remaining': string
  /** Unix timestamp when limit resets (X-RateLimit-Reset) */
  'X-RateLimit-Reset': string
  /** Seconds until retry is allowed (Retry-After) - only when limited */
  'Retry-After'?: string
  /** Rate limit policy (X-RateLimit-Policy) */
  'X-RateLimit-Policy'?: string
  /** Which layer triggered the limit (X-RateLimit-Layer) - custom */
  'X-RateLimit-Layer'?: string
}

/**
 * Policy string format: "limit;window;algorithm"
 * Example: "100;60;sliding-window" = 100 requests per 60 seconds using sliding window
 */
export type RateLimitPolicy = string

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Storage adapter interface
 */
export interface IStorageAdapter {
  /** Get a value */
  get(key: string): Promise<string | null>
  /** Set a value with optional TTL */
  set(key: string, value: string, ttl?: number): Promise<void>
  /** Delete a key */
  delete(key: string): Promise<boolean>
  /** Increment a value */
  increment(key: string): Promise<number>
  /** Add to sorted set */
  zadd(key: string, score: number, member: string): Promise<number>
  /** Remove from sorted set by score range */
  zremrangebyscore(key: string, min: number, max: number): Promise<number>
  /** Get sorted set cardinality */
  zcard(key: string): Promise<number>
  /** Get sorted set range */
  zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>
  /** Execute Lua script */
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>
  /** Execute pipeline */
  pipeline(commands: PipelineCommand[]): Promise<unknown[]>
  /** Check if connected */
  isConnected(): Promise<boolean>
  /** Get storage type */
  getType(): StorageBackend
}

/**
 * Pipeline command
 */
export type PipelineCommand = {
  command: string
  args: (string | number)[]
}

// ============================================================================
// Management API Types
// ============================================================================

/**
 * Rate limit status for a key
 */
export interface RateLimitStatus {
  /** Key identifier */
  key: string
  /** Layer */
  layer: RateLimitLayer
  /** Current count */
  currentCount: number
  /** Limit */
  limit: number
  /** Remaining */
  remaining: number
  /** Reset time */
  resetTime: number
  /** Algorithm */
  algorithm: RateLimitAlgorithm
  /** Storage backend */
  storage: StorageBackend
}

/**
 * Rate limit adjustment request
 */
export interface RateLimitAdjustment {
  /** Key to adjust */
  key: string
  /** Layer */
  layer: RateLimitLayer
  /** New limit (optional) */
  newLimit?: number
  /** New window in ms (optional) */
  newWindowMs?: number
  /** Reset count */
  resetCount?: boolean
  /** Add tokens (for token bucket) */
  addTokens?: number
}

/**
 * Rate limit statistics
 */
export interface RateLimitStats {
  /** Total requests processed */
  totalRequests: number
  /** Allowed requests */
  allowedRequests: number
  /** Rejected requests */
  rejectedRequests: number
  /** Rejection rate */
  rejectionRate: number
  /** Requests by layer */
  byLayer: Record<RateLimitLayer, { allowed: number; rejected: number }>
  /** Requests by algorithm */
  byAlgorithm: Record<RateLimitAlgorithm, { allowed: number; rejected: number }>
  /** Average latency in ms */
  avgLatencyMs: number
  /** P99 latency in ms */
  p99LatencyMs: number
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly result: RateLimitResult,
    public readonly context: RateLimitContext
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

/**
 * Storage error
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'StorageError'
  }
}
