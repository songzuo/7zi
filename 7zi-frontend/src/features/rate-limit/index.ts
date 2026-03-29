/**
 * Rate-Limit Feature
 * 限流功能模块
 */

// Lib - selectively export to avoid duplicate type exports
export {
  RateLimiter,
  formatRateLimitHeaders,
} from './lib/limiter';

export type { RateLimitResult } from './lib/limiter';
export type { IRateLimitStorage, RateLimitEntry } from './lib/storage';
export { MemoryRateLimitStorage } from './lib/memory-storage';
export { RedisRateLimitStorage } from './lib/redis-storage';
export {
  RateLimitPresets,
  RouteRateLimits,
  getRateLimitForPath,
} from './lib/config';
export type { RateLimitConfig } from './lib/config';

// Additional types
export type { RateLimitStorage } from './types';
