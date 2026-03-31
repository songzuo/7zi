/**
 * Rate Limit Storage Factory
 *
 * 存储工厂，自动选择 Redis 或内存存储
 * - Redis 可用时使用 Redis
 * - Redis 不可用时使用内存存储
 * - 支持运行时动态切换
 */

import { getRedisClient, isRedisAvailable } from '@/lib/redis/client';
import { getMemoryStore, MemoryRateLimitStore } from './memory-store';
import { logger } from '@/lib/logger';

export interface StorageConfig {
  /**
   * 是否强制使用内存存储
   */
  forceMemory?: boolean;

  /**
   * 失败时是否放行（fail-open）
   */
  failOpen?: boolean;
}

/**
 * 存储类型
 */
export type StorageType = 'redis' | 'memory';

/**
 * 存储状态
 */
export interface StorageStatus {
  type: StorageType;
  redisAvailable: boolean;
  failOpen: boolean;
}

/**
 * 获取存储类型
 */
export async function getStorageType(config: StorageConfig = {}): Promise<StorageType> {
  // 强制使用内存存储
  if (config.forceMemory) {
    return 'memory';
  }

  // 检查 Redis 可用性
  const redisAvailable = await isRedisAvailable();

  if (redisAvailable) {
    return 'redis';
  }

  // Redis 不可用，使用内存存储
  logger.warn('Redis not available, using memory storage for rate limiting');
  return 'memory';
}

/**
 * 获取存储状态
 */
export async function getStorageStatus(config: StorageConfig = {}): Promise<StorageStatus> {
  const redisAvailable = await isRedisAvailable();
  const type = await getStorageType(config);

  return {
    type,
    redisAvailable,
    failOpen: config.failOpen !== false,
  };
}

/**
 * 检查是否应该使用 Redis
 */
export function shouldUseRedis(config: StorageConfig = {}): boolean {
  // 强制使用内存存储
  if (config.forceMemory) {
    return false;
  }

  // 检查环境变量
  const enableRedis = process.env.ENABLE_REDIS_RATE_LIMIT === 'true';
  if (!enableRedis) {
    return false;
  }

  // 检查 Redis URL
  const hasRedisConfig = !!(process.env.REDIS_URL || process.env.REDIS_HOST);
  if (!hasRedisConfig) {
    return false;
  }

  return true;
}

/**
 * 获取内存存储实例
 */
export function getMemoryStorage(): MemoryRateLimitStore {
  return getMemoryStore();
}

/**
 * 辅助函数：在 Redis 不可用时使用内存存储
 */
export async function withFallback<T>(
  redisOperation: () => Promise<T>,
  memoryOperation: () => Promise<T>,
  config: StorageConfig = {}
): Promise<T> {
  const useRedis = shouldUseRedis(config);

  if (useRedis) {
    const redisAvailable = await isRedisAvailable();

    if (redisAvailable) {
      try {
        return await redisOperation();
      } catch (_error) {
        logger.error('Redis operation failed, falling back to memory', { error });

        if (config.failOpen !== false) {
          return await memoryOperation();
        }

        throw error;
      }
    }
  }

  // 使用内存存储
  return await memoryOperation();
}

/**
 * 辅助函数：异步检查 Redis 可用性（带缓存）
 */
let redisAvailabilityCache: { available: boolean; timestamp: number } | null = null;
const REDIS_AVAILABILITY_CACHE_TTL = 5000; // 5 秒缓存

export async function getCachedRedisAvailability(): Promise<boolean> {
  const now = Date.now();

  // 检查缓存
  if (redisAvailabilityCache && now - redisAvailabilityCache.timestamp < REDIS_AVAILABILITY_CACHE_TTL) {
    return redisAvailabilityCache.available;
  }

  // 检查 Redis 可用性
  const available = await isRedisAvailable();

  // 更新缓存
  redisAvailabilityCache = {
    available,
    timestamp: now,
  };

  return available;
}

/**
 * 清除缓存
 */
export function clearRedisAvailabilityCache(): void {
  redisAvailabilityCache = null;
}
