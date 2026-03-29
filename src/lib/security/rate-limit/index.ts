/**
 * 速率限制系统 - 统一导出
 *
 * 提供完整的速率限制解决方案
 */

// 算法
export { SlidingWindow } from './algorithms/sliding-window';
export type { SlidingWindowOptions, SlidingWindowResult } from './algorithms/sliding-window';

export { TokenBucket } from './algorithms/token-bucket';
export type { TokenBucketOptions, TokenBucketResult } from './algorithms/token-bucket';

// 核心类
export {
  DistributedRateLimiter,
  KeyGenerators,
} from './rate-limiter';
export type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitInfo,
} from './rate-limiter';

// Redis 适配器
export { RedisAdapter } from './redis-adapter';
export type {
  RedisConfig,
  RedisAdapterOptions,
} from './redis-adapter';

// 中间件
export {
  createRateLimitMiddleware,
  setRateLimitHeaders,
  createRateLimitExceededResponse,
  createCustomRateLimitResponse,
  withRateLimit,
  expressRateLimitMiddleware,
  withRateLimitInfo,
} from './rate-limit-middleware';
export type { RateLimitMiddlewareOptions } from './rate-limit-middleware';

// 配置管理
export {
  RateLimitConfigManager,
  PresetConfigs,
  defaultConfigManager,
  CommonRouteConfigs,
} from './rate-limit-config';
export type {
  RouteConfig,
} from './rate-limit-config';
