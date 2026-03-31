/**
 * RBAC Cache - Permission Caching Optimization
 *
 * 提供用户权限的高性能缓存，支持：
 * - Redis 分布式缓存（如可用）
 * - 内存缓存 Fallback
 * - 缓存失效策略
 * - 缓存命中率统计
 *
 * 预期收益：
 * - 权限缓存命中率 >80%
 * - 权限检查性能提升 50%
 */

import { Permission } from '@/lib/permissions/types';
import { logger } from '@/lib/logger';
import { getRedisClient, isRedisAvailable } from '@/lib/redis/client';

/**
 * 缓存配置
 */
/**
 * 缓存配置
 */
export interface CacheConfig {
  ttl?: number; // 默认 TTL (秒)
  maxSize?: number; // 内存缓存最大条目数
  enabled?: boolean; // 是否启用缓存
}

/**
 * 缓存统计
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number; // 命中率 (0-1)
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 权限缓存类
 */
export class RBACCache<T = Permission[]> {
  private memoryCache: Map<string, CacheEntry<T>>;
  private stats: CacheStats;
  private config: Required<CacheConfig>;
  private useRedis: boolean = false;
  private keyPrefix: string;

  constructor(
    keyPrefix: string = 'rbac',
    config: CacheConfig = {}
  ) {
    this.keyPrefix = keyPrefix;
    this.memoryCache = new Map();
    this.config = {
      ttl: config.ttl ?? 3600, // 默认 1 小时
      maxSize: config.maxSize ?? 10000, // 默认最多 10,000 条
      enabled: config.enabled ?? true,
    };
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };

    // 尝试初始化 Redis
    this.initRedis();
  }

  /**
   * 初始化 Redis
   */
  private async initRedis(): Promise<void> {
    try {
      this.useRedis = await isRedisAvailable();
      if (this.useRedis) {
        logger.info('[RBACCache] Redis caching enabled');
      } else {
        logger.info('[RBACCache] Using in-memory caching (Redis unavailable)');
      }
    } catch (_error) {
      logger.warn('[RBACCache] Redis initialization failed, using in-memory cache', { error });
      this.useRedis = false;
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(identifier: string): string {
    return `${this.keyPrefix}:${identifier}`;
  }

  /**
   * 检查缓存条目是否过期
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // 转换为秒
    return age > entry.ttl;
  }

  /**
   * 清理过期的内存缓存
   */
  private cleanupExpiredEntries(): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.memoryCache.delete(key);
    }

    // 如果缓存超过最大大小，清理最老的条目
    if (this.memoryCache.size > this.config.maxSize) {
      const sortedEntries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const entriesToDelete = sortedEntries.slice(0, this.memoryCache.size - this.config.maxSize);
      for (const [key] of entriesToDelete) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * 从 Redis 获取缓存
   */
  private async getFromRedis(key: string): Promise<T | null> {
    if (!this.useRedis) {
      return null;
    }

    try {
      const client = getRedisClient();
      if (!client) {
        return null;
      }

      const value = await client.get(key);
      if (!value) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(value);

      // 检查是否过期
      if (this.isExpired(entry)) {
        await client.del(key);
        return null;
      }

      return entry.data;
    } catch (_error) {
      logger.error('[RBACCache] Redis get failed', { error, key });
      return null;
    }
  }

  /**
   * 设置 Redis 缓存
   */
  private async setToRedis(key: string, data: T, ttl: number): Promise<void> {
    if (!this.useRedis) {
      return;
    }

    try {
      const client = getRedisClient();
      if (!client) {
        return;
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      await client.set(key, JSON.stringify(entry), 'EX', ttl);
    } catch (_error) {
      logger.error('[RBACCache] Redis set failed', { error, key });
    }
  }

  /**
   * 从 Redis 删除缓存
   */
  private async deleteFromRedis(key: string): Promise<void> {
    if (!this.useRedis) {
      return;
    }

    try {
      const client = getRedisClient();
      if (!client) {
        return;
      }

      await client.del(key);
    } catch (_error) {
      logger.error('[RBACCache] Redis delete failed', { error, key });
    }
  }

  /**
   * 批量从 Redis 删除缓存（基于模式）
   */
  private async deleteFromRedisByPattern(pattern: string): Promise<void> {
    if (!this.useRedis) {
      return;
    }

    try {
      const client = getRedisClient();
      if (!client) {
        return;
      }

      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (_error) {
      logger.error('[RBACCache] Redis pattern delete failed', { error, pattern });
    }
  }

  /**
   * 缓存用户权限
   */
  async cacheUserPermissions(userId: string, permissions: Permission[]): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const key = this.generateKey(`user:${userId}`);

    // 更新内存缓存
    this.memoryCache.set(key, {
      data: permissions as unknown as T,
      timestamp: Date.now(),
      ttl: this.config.ttl,
    });

    // 更新 Redis
    await this.setToRedis(key, permissions as unknown as T, this.config.ttl);

    this.stats.sets++;

    // 定期清理过期条目
    this.cleanupExpiredEntries();
  }

  /**
   * 获取缓存权限
   */
  async getCachedPermissions(userId: string): Promise<Permission[] | null> {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.generateKey(`user:${userId}`);

    // 先检查 Redis
    let data: T | null = await this.getFromRedis(key);

    // 如果 Redis 没有或失败，检查内存缓存
    if (!data) {
      const entry = this.memoryCache.get(key);
      if (entry && !this.isExpired(entry)) {
        data = entry.data;
      }
    }

    if (data) {
      this.stats.hits++;
      this.updateHitRate();
    } else {
      this.stats.misses++;
      this.updateHitRate();
    }
    return data as Permission[] | null;
  }

  /**
   * 失效缓存
   */
  async invalidateCache(userId: string): Promise<void> {
    const key = this.generateKey(`user:${userId}`);

    // 从内存缓存删除
    this.memoryCache.delete(key);

    // 从 Redis 删除
    await this.deleteFromRedis(key);

    this.stats.deletes++;
  }

  /**
   * 批量失效（基于角色）
   * 注意：这需要额外存储用户-角色映射
   */
  async invalidateByRole(roleId: string): Promise<void> {
    // 删除所有与该角色相关的缓存
    const pattern = this.generateKey(`user:*`);

    // 从内存缓存删除
    const keysToDelete: string[] = [];
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(this.generateKey('user:'))) {
        // 在实际应用中，这里需要检查用户是否拥有该角色
        // 简化版本：删除所有用户缓存
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.memoryCache.delete(key);
    }

    // 从 Redis 删除（使用模糊匹配）
    await this.deleteFromRedisByPattern(pattern);

    this.stats.deletes += keysToDelete.length;
  }

  /**
   * 通用缓存设置
   */
  async set(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const fullKey = this.generateKey(key);
    const actualTtl = ttl ?? this.config.ttl;

    // 更新内存缓存
    this.memoryCache.set(fullKey, {
      data,
      timestamp: Date.now(),
      ttl: actualTtl,
    });

    // 更新 Redis
    await this.setToRedis(fullKey, data, actualTtl);

    this.stats.sets++;

    // 定期清理过期条目
    this.cleanupExpiredEntries();
  }

  /**
   * 通用缓存获取
   */
  async get(key: string): Promise<T | null> {
    if (!this.config.enabled) {
      return null;
    }

    const fullKey = this.generateKey(key);

    // 先检查 Redis
    let data: T | null = await this.getFromRedis(fullKey);

    // 如果 Redis 没有或失败，检查内存缓存
    if (!data) {
      const entry = this.memoryCache.get(fullKey);
      if (entry && !this.isExpired(entry)) {
        data = entry.data;
      }
    }

    if (data) {
      this.stats.hits++;
      this.updateHitRate();
    } else {
      this.stats.misses++;
      this.updateHitRate();
    }
    return data;
  }

  /**
   * 通用缓存删除
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.generateKey(key);

    // 从内存缓存删除
    this.memoryCache.delete(fullKey);

    // 从 Redis 删除
    await this.deleteFromRedis(fullKey);

    this.stats.deletes++;
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    // 清空内存缓存
    this.memoryCache.clear();

    // 清空 Redis 缓存（基于前缀）
    if (this.useRedis) {
      try {
        const client = getRedisClient();
        if (client) {
          const pattern = this.generateKey('*');
          const keys = await client.keys(pattern);
          if (keys.length > 0) {
            await client.del(...keys);
          }
        }
      } catch (_error) {
        logger.error('[RBACCache] Clear failed', { error });
      }
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 重置缓存统计
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * 获取内存缓存大小
   */
  getMemoryCacheSize(): number {
    return this.memoryCache.size;
  }
}

/**
 * 创建默认的 RBAC 权限缓存实例
 */
export const rbacCache = new RBACCache<Permission[]>('rbac:permissions', {
  ttl: 3600, // 1 小时
  maxSize: 10000,
  enabled: true,
});

/**
 * 便捷函数：缓存用户权限
 */
export async function cacheUserPermissions(userId: string, permissions: Permission[]): Promise<void> {
  await rbacCache.cacheUserPermissions(userId, permissions);
}

/**
 * 便捷函数：获取缓存权限
 */
export async function getCachedPermissions(userId: string): Promise<Permission[] | null> {
  return await rbacCache.getCachedPermissions(userId);
}

/**
 * 便捷函数：失效缓存
 */
export async function invalidatePermissionCache(userId: string): Promise<void> {
  await rbacCache.invalidateCache(userId);
}

/**
 * 便捷函数：批量失效缓存
 */
export async function invalidatePermissionCacheByRole(roleId: string): Promise<void> {
  await rbacCache.invalidateByRole(roleId);
}

/**
 * 便捷函数：获取缓存统计
 */
export function getCacheStats(): CacheStats {
  return rbacCache.getStats();
}
