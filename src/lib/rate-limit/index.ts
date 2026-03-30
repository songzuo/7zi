/**
 * Rate Limiting System - Unified Export
 * 速率限制系统 - 统一导出
 *
 * Combines the original rate-limit and security/rate-limit modules
 * 合并原有的 rate-limit 和 security/rate-limit 模块
 */

// Core algorithms
export { checkSlidingWindow, getSlidingWindowStatus } from './sliding-window';
export type { SlidingWindowConfig, SlidingWindowResult } from './sliding-window';

export { checkTokenBucket, getTokenBucketStatus } from './token-bucket';
export type { TokenBucketConfig, TokenBucketResult } from './token-bucket';

// Middleware
export { withRateLimit, createRateLimitMiddleware } from './middleware';
export type { MiddlewareConfig } from './middleware';

// Status
export { getRateLimitStatus } from './status';

// Memory store
export { getMemoryStore } from './memory-store';
export type { MemoryRateLimitStore } from './memory-store';

// Storage factory
export {
  getStorageType,
  getStorageStatus,
  shouldUseRedis,
  getMemoryStorage,
  withFallback,
} from './storage-factory';
export type { StorageConfig, StorageType, StorageStatus } from './storage-factory';

// Enhanced algorithms from security/rate-limit
export { SlidingWindow } from './algorithms/sliding-window';
export type { SlidingWindowOptions, SlidingWindowResult as SWResult } from './algorithms/sliding-window';

export { TokenBucket as TokenBucketEnhanced } from './algorithms/token-bucket';
export type { TokenBucketOptions, TokenBucketResult as TBResult } from './algorithms/token-bucket';

// Distributed rate limiter
export {
  DistributedRateLimiter,
  KeyGenerators,
} from './distributed-rate-limiter';
export type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitInfo,
} from './distributed-rate-limiter';

// Redis adapter
export { RedisAdapter } from './redis-adapter';
export type {
  RedisConfig,
  RedisAdapterOptions,
} from './redis-adapter';

// Enhanced middleware
export {
  createRateLimitMiddleware as createEnhancedRateLimitMiddleware,
  setRateLimitHeaders,
  createRateLimitExceededResponse,
  createCustomRateLimitResponse,
  withRateLimit as withEnhancedRateLimit,
  expressRateLimitMiddleware,
  withRateLimitInfo,
} from './middleware-enhanced';
export type { RateLimitMiddlewareOptions } from './middleware-enhanced';

// Config manager
export {
  RateLimitConfigManager,
  PresetConfigs,
  defaultConfigManager,
  CommonRouteConfigs,
} from './config-manager';
export type {
  RouteConfig,
} from './config-manager';
