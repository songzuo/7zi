/**
 * Redis Client Module
 *
 * Provides Redis connection management, health checks,
 * and error handling for L2 cache implementation.
 *
 * @module lib/redis
 */

export {
  getRedisClient,
  closeRedisClient,
  isRedisAvailable,
  redisCommand,
} from './client';
