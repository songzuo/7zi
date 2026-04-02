/**
 * In-Memory Rate Limit Store
 *
 * 内存限流存储实现，作为 Redis 不可用时的后备方案
 * - 使用 Map 数据结构存储限流状态
 * - 支持滑动窗口算法
 * - 定期清理过期数据
 */

import { logger } from '@/lib/logger'

interface MemoryEntry {
  count: number
  resetTime: number
  windowStart: number
  tokens?: number // 用于令牌桶算法
  lastRefill?: number // 用于令牌桶算法
}

interface TokenBucketState {
  tokens: number
  lastRefill: number
}

/**
 * 内存限流存储类
 */
export class MemoryRateLimitStore {
  private store: Map<string, MemoryEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly cleanupIntervalMs = 60 * 1000 // 每分钟清理一次

  constructor(autoCleanup = true) {
    if (autoCleanup) {
      this.startCleanup()
    }
  }

  /**
   * 滑动窗口算法：增加请求计数
   */
  incrementSlidingWindow(
    key: string,
    limit: number,
    window: number
  ): {
    allowed: boolean
    remaining: number
    resetTime: number
    currentCount: number
  } {
    const now = Date.now()
    const windowMs = window * 1000
    const existing = this.store.get(key)

    if (!existing) {
      // 创建新条目
      const newItem: MemoryEntry = {
        count: 1,
        resetTime: now + windowMs,
        windowStart: now,
      }
      this.store.set(key, newItem)

      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: newItem.resetTime,
        currentCount: 1,
      }
    }

    // 检查是否在时间窗口内
    if (now < existing.resetTime) {
      // 在窗口内，增加计数
      const newCount = existing.count + 1
      const allowed = newCount <= limit

      if (allowed) {
        existing.count = newCount
        this.store.set(key, existing)
      }

      return {
        allowed,
        remaining: Math.max(0, limit - newCount),
        resetTime: existing.resetTime,
        currentCount: newCount,
      }
    }

    // 窗口已过期，重置计数
    const newItem: MemoryEntry = {
      count: 1,
      resetTime: now + windowMs,
      windowStart: now,
    }
    this.store.set(key, newItem)

    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: newItem.resetTime,
      currentCount: 1,
    }
  }

  /**
   * 滑动窗口算法：获取当前状态
   */
  getSlidingWindowStatus(key: string): {
    count: number
    resetTime: number
    windowStart: number
  } | null {
    const item = this.store.get(key)
    if (!item) {
      return null
    }

    // 检查是否过期
    const now = Date.now()
    if (now >= item.resetTime) {
      this.store.delete(key)
      return null
    }

    return {
      count: item.count,
      resetTime: item.resetTime,
      windowStart: item.windowStart,
    }
  }

  /**
   * 令牌桶算法：检查并消耗令牌
   */
  checkTokenBucket(
    key: string,
    capacity: number,
    refillRate: number,
    window: number
  ): {
    allowed: boolean
    remaining: number
    resetTime: number
    tokensAvailable: number
  } {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing) {
      // 创建新条目（满令牌桶）
      const newItem: MemoryEntry = {
        count: capacity, // 使用 count 存储 tokens
        resetTime: now + window * 1000,
        windowStart: now,
        tokens: capacity - 1, // 消耗 1 个令牌
        lastRefill: now,
      }
      this.store.set(key, newItem)

      return {
        allowed: true,
        remaining: capacity - 1,
        resetTime: newItem.resetTime,
        tokensAvailable: capacity - 1, // 返回消耗后的值
      }
    }

    // 获取当前令牌状态
    let tokens = existing.tokens !== undefined ? existing.tokens : capacity
    let lastRefill = existing.lastRefill || now

    // 计算令牌补充
    const elapsed = (now - lastRefill) / 1000
    if (elapsed > 0 && refillRate > 0) {
      const tokensToAdd = Math.min(capacity - tokens, elapsed * refillRate)
      tokens = Math.min(capacity, tokens + tokensToAdd)
      lastRefill = now
    }

    // 检查是否有足够的令牌
    const allowed = tokens >= 1
    if (allowed) {
      tokens -= 1
    }

    // 更新状态
    const updatedItem: MemoryEntry = {
      ...existing,
      tokens,
      lastRefill,
    }
    this.store.set(key, updatedItem)

    return {
      allowed,
      remaining: Math.max(0, Math.floor(tokens)),
      resetTime: now + window * 1000,
      tokensAvailable: Math.max(0, Math.floor(tokens)),
    }
  }

  /**
   * 令牌桶算法：获取当前状态
   */
  getTokenBucketStatus(key: string): {
    tokens: number
    lastRefill: number | null
    capacity: number
  } | null {
    const item = this.store.get(key)
    if (!item) {
      return null
    }

    return {
      tokens: item.tokens || 0,
      lastRefill: item.lastRefill || null,
      capacity: item.count, // capacity 存储在 count 字段
    }
  }

  /**
   * 重置指定键
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * 清理过期数据
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, item] of this.store.entries()) {
      if (now >= item.resetTime) {
        this.store.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalEntries: number
    activeEntries: number
    expiredEntries: number
  } {
    const now = Date.now()
    let active = 0
    let expired = 0

    for (const item of this.store.values()) {
      if (now >= item.resetTime) {
        expired++
      } else {
        active++
      }
    }

    return {
      totalEntries: this.store.size,
      activeEntries: active,
      expiredEntries: expired,
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      const cleaned = this.cleanup()
      if (cleaned > 0) {
        logger.info(`Cleaned up ${cleaned} expired rate limit entries`)
      }
    }, this.cleanupIntervalMs)

    // 确保定时器不会阻止进程退出
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * 停止定期清理
   */
  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * 关闭存储
   */
  async close(): Promise<void> {
    this.stopCleanup()
    this.store.clear()
    logger.info('Memory rate limit store closed')
  }
}

// 单例实例
let memoryStoreInstance: MemoryRateLimitStore | null = null

/**
 * 获取内存存储单例
 */
export function getMemoryStore(): MemoryRateLimitStore {
  if (!memoryStoreInstance) {
    memoryStoreInstance = new MemoryRateLimitStore(true)

    // 注册清理钩子
    if (typeof process !== 'undefined') {
      process.on('beforeExit', async () => {
        await memoryStoreInstance?.close()
      })
    }
  }

  return memoryStoreInstance
}

/**
 * 关闭内存存储
 */
export async function closeMemoryStore(): Promise<void> {
  if (memoryStoreInstance) {
    await memoryStoreInstance.close()
    memoryStoreInstance = null
  }
}
