/**
 * RBAC Cache Unit Tests
 *
 * 测试覆盖：
 * - 缓存读写
 * - 缓存失效
 * - Redis 和内存缓存切换
 * - 缓存统计
 * - TTL 过期
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RBACCache, CacheConfig } from '../rbac-cache'
import { Permission } from '@/lib/permissions/types'

// Mock Redis client
vi.mock('@/lib/redis/client', () => ({
  getRedisClient: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    ping: vi.fn(),
  })),
  isRedisAvailable: vi.fn(async () => false), // 默认使用内存缓存
}))

import { getRedisClient, isRedisAvailable } from '@/lib/redis/client'

describe('RBACCache', () => {
  let cache: RBACCache<Permission[]>

  beforeEach(() => {
    cache = new RBACCache<Permission[]>('test:rbac', {
      ttl: 60, // 1 分钟
      maxSize: 100,
      enabled: true,
    })

    vi.clearAllMocks()
  })

  describe('基础缓存操作', () => {
    it('应该能够缓存用户权限', async () => {
      const userId = 'user123'
      const permissions: Permission[] = [Permission.USER_READ, Permission.USER_UPDATE]

      await cache.cacheUserPermissions(userId, permissions)

      const cached = await cache.getCachedPermissions(userId)
      expect(cached).toEqual(permissions)
    })

    it('应该能够获取缓存权限', async () => {
      const userId = 'user456'
      const permissions: Permission[] = [Permission.TASK_READ, Permission.TASK_CREATE]

      await cache.cacheUserPermissions(userId, permissions)
      const cached = await cache.getCachedPermissions(userId)

      expect(cached).not.toBeNull()
      expect(cached).toEqual(permissions)
    })

    it('缓存不存在时应该返回 null', async () => {
      const cached = await cache.getCachedPermissions('nonexistent')
      expect(cached).toBeNull()
    })

    it('应该能够失效缓存', async () => {
      const userId = 'user789'
      const permissions: Permission[] = [Permission.TEAM_READ]

      await cache.cacheUserPermissions(userId, permissions)
      await cache.invalidateCache(userId)

      const cached = await cache.getCachedPermissions(userId)
      expect(cached).toBeNull()
    })
  })

  describe('缓存统计', () => {
    it('应该正确统计缓存命中', async () => {
      const userId = 'user-stats'
      const permissions: Permission[] = [Permission.USER_READ]

      await cache.cacheUserPermissions(userId, permissions)

      // 第一次访问应该命中
      await cache.getCachedPermissions(userId)
      const stats1 = cache.getStats()
      expect(stats1.hits).toBe(1)
      expect(stats1.misses).toBe(0)

      // 访问不存在的缓存
      await cache.getCachedPermissions('nonexistent')
      const stats2 = cache.getStats()
      expect(stats2.hits).toBe(1)
      expect(stats2.misses).toBe(1)
    })

    it('应该正确计算命中率', async () => {
      const userId = 'user-hitrate'
      const permissions: Permission[] = [Permission.USER_READ]

      await cache.cacheUserPermissions(userId, permissions)

      // 3 次命中
      await cache.getCachedPermissions(userId)
      await cache.getCachedPermissions(userId)
      await cache.getCachedPermissions(userId)

      // 1 次未命中
      await cache.getCachedPermissions('nonexistent')

      const stats = cache.getStats()
      expect(stats.hitRate).toBeCloseTo(0.75, 2) // 3/4 = 0.75
    })

    it('应该能够重置统计', async () => {
      const userId = 'user-reset'
      const permissions: Permission[] = [Permission.USER_READ]

      await cache.cacheUserPermissions(userId, permissions)
      await cache.getCachedPermissions(userId)

      cache.resetStats()
      const stats = cache.getStats()

      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.sets).toBe(0)
      expect(stats.hitRate).toBe(0)
    })
  })

  describe('缓存失效策略', () => {
    it('应该能够按角色批量失效', async () => {
      const users = ['user1', 'user2', 'user3']
      const permissions: Permission[] = [Permission.USER_READ]

      for (const userId of users) {
        await cache.cacheUserPermissions(userId, permissions)
      }

      await cache.invalidateByRole('admin')

      // 检查缓存是否被清理
      for (const userId of users) {
        const cached = await cache.getCachedPermissions(userId)
        // 注意：当前实现中，invalidateByRole 会删除所有用户缓存
        // 实际应用中应该只删除拥有该角色的用户
        expect(cached).toBeNull()
      }
    })

    it('应该能够清空所有缓存', async () => {
      const users = ['user1', 'user2', 'user3']
      const permissions: Permission[] = [Permission.USER_READ]

      for (const userId of users) {
        await cache.cacheUserPermissions(userId, permissions)
      }

      await cache.clear()

      for (const userId of users) {
        const cached = await cache.getCachedPermissions(userId)
        expect(cached).toBeNull()
      }
    })
  })

  describe('TTL 过期', () => {
    it('过期的缓存应该返回 null', async () => {
      const userId = 'user-expired'
      const permissions: Permission[] = [Permission.USER_READ]

      // 创建一个很短 TTL 的缓存
      const shortCache = new RBACCache<Permission[]>('test:exp', {
        ttl: 0.001, // 1 毫秒
        maxSize: 100,
        enabled: true,
      })

      await shortCache.cacheUserPermissions(userId, permissions)

      // 等待 TTL 过期
      await new Promise(resolve => setTimeout(resolve, 10))

      const cached = await shortCache.getCachedPermissions(userId)
      expect(cached).toBeNull()
    })
  })

  describe('通用缓存操作', () => {
    it('应该支持通用 set/get 操作', async () => {
      await cache.set('custom-key', { data: 'test', value: 123 } as unknown as Permission[])

      const cached = await cache.get('custom-key')
      expect(cached).toEqual({ data: 'test', value: 123 })
    })

    it('应该支持通用 delete 操作', async () => {
      await cache.set('delete-key', { data: 'test' } as unknown as Permission[])
      await cache.delete('delete-key')

      const cached = await cache.get('delete-key')
      expect(cached).toBeNull()
    })
  })

  describe('缓存大小限制', () => {
    it('超过最大大小时应该清理最老的条目', async () => {
      const smallCache = new RBACCache<Permission[]>('test:small', {
        ttl: 60,
        maxSize: 5, // 最多 5 条
        enabled: true,
      })

      const permissions: Permission[] = [Permission.USER_READ]

      // 添加 10 个条目
      for (let i = 0; i < 10; i++) {
        await smallCache.cacheUserPermissions(`user${i}`, permissions)
      }

      // 缓存大小应该不超过最大值
      const size = smallCache.getMemoryCacheSize()
      expect(size).toBeLessThanOrEqual(5)
    })
  })

  describe('Redis 集成', () => {
    it('Redis 不可用时不应该报错', async () => {
      vi.mocked(isRedisAvailable).mockResolvedValue(false)

      const redisCache = new RBACCache<Permission[]>('test:redis-fallback')

      const userId = 'redis-fallback'
      const permissions: Permission[] = [Permission.USER_READ]

      await redisCache.cacheUserPermissions(userId, permissions)

      const cached = await redisCache.getCachedPermissions(userId)
      expect(cached).toEqual(permissions)
    })
  })

  describe('禁用缓存', () => {
    it('禁用时不应该缓存数据', async () => {
      const disabledCache = new RBACCache<Permission[]>('test:disabled', {
        enabled: false,
      })

      const userId = 'disabled-user'
      const permissions: Permission[] = [Permission.USER_READ]

      await disabledCache.cacheUserPermissions(userId, permissions)

      const cached = await disabledCache.getCachedPermissions(userId)
      expect(cached).toBeNull()
    })

    it('禁用时应该不影响统计', async () => {
      const disabledCache = new RBACCache<Permission[]>('test:disabled2', {
        enabled: false,
      })

      await disabledCache.cacheUserPermissions('user', [Permission.USER_READ])
      await disabledCache.getCachedPermissions('user')

      const stats = disabledCache.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.sets).toBe(0)
    })
  })

  describe('批量失效（更多场景）', () => {
    it('invalidateByRole 应该能正确处理空缓存', async () => {
      await cache.invalidateByRole('nonexistent')
      const stats = cache.getStats()
      expect(stats.deletes).toBeGreaterThanOrEqual(0)
    })

    it('invalidateCache 应该能正确处理不存在的用户', async () => {
      await cache.invalidateCache('truly-nonexistent')
      // 不应该报错
    })
  })

  describe('Redis Fallback（更多场景）', () => {
    it('当 Redis get 抛出异常时应该回退到内存', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue(new Error('Redis error')),
        set: vi.fn().mockRejectedValue(new Error('Redis error')),
        del: vi.fn().mockRejectedValue(new Error('Redis error')),
        keys: vi.fn().mockRejectedValue(new Error('Redis error')),
        ping: vi.fn().mockResolvedValue('PONG'),
      }

      vi.mocked(getRedisClient).mockReturnValue(mockClient as any)

      const fallbackCache = new RBACCache<Permission[]>('test:fallback')

      // 应该能够正常工作（回退到内存）
      await fallbackCache.cacheUserPermissions('user1', [Permission.USER_READ])
      const cached = await fallbackCache.getCachedPermissions('user1')

      expect(cached).toEqual([Permission.USER_READ])
    })

    it('当 Redis set 抛出异常时不应该抛出', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockRejectedValue(new Error('Redis error')),
        del: vi.fn().mockRejectedValue(new Error('Redis error')),
        keys: vi.fn().mockResolvedValue([]),
        ping: vi.fn().mockResolvedValue('PONG'),
      }

      vi.mocked(getRedisClient).mockReturnValue(mockClient as any)

      const fallbackCache = new RBACCache<Permission[]>('test:fallback2')

      // 不应该抛出异常
      await expect(
        fallbackCache.cacheUserPermissions('user1', [Permission.USER_READ])
      ).resolves.not.toThrow()
    })

    it('当 Redis keys 抛出异常时 clear 应该处理', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockRejectedValue(new Error('Redis error')),
        keys: vi.fn().mockRejectedValue(new Error('Redis error')),
        ping: vi.fn().mockResolvedValue('PONG'),
      }

      vi.mocked(getRedisClient).mockReturnValue(mockClient as any)

      const fallbackCache = new RBACCache<Permission[]>('test:fallback3')

      // clear 应该处理异常而不抛出
      await expect(fallbackCache.clear()).resolves.not.toThrow()
    })
  })

  describe('缓存键生成和 TTL', () => {
    it('getMemoryCacheSize 应该返回正确的缓存大小', async () => {
      const userId = 'user-size'
      const permissions: Permission[] = [Permission.USER_READ]

      await cache.cacheUserPermissions(userId, permissions)

      const size = cache.getMemoryCacheSize()
      expect(size).toBeGreaterThan(0)
    })

    it('cleanupExpiredEntries 应该清理过期条目', async () => {
      // 创建一个缓存
      const shortCache = new RBACCache<Permission[]>('test:cleanup', {
        ttl: 1, // 1 秒
        maxSize: 100,
        enabled: true,
      })

      // 手动添加过期条目到内存缓存（模拟）
      await shortCache.cacheUserPermissions('user1', [Permission.USER_READ])

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 1100))

      // 触发清理
      await shortCache.getCachedPermissions('user1')

      // 缓存应该已过期
      const cached = await shortCache.getCachedPermissions('user1')
      expect(cached).toBeNull()
    })
  })
})
