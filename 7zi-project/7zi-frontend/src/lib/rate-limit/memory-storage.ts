/**
 * In-Memory Rate Limit Storage
 *
 * 基于内存的速率限制存储实现
 */

import { IRateLimitStorage, RateLimitEntry } from './storage';

/**
 * 内存存储项
 */
interface MemoryItem {
  count: number;
  resetTime: number;
  windowStart: number;
  lastAccess: number;
}

/**
 * 内存限流存储类
 */
export class MemoryRateLimitStorage implements IRateLimitStorage {
  private store: Map<string, MemoryItem> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly cleanupIntervalMs = 60 * 1000; // 每分钟清理一次

  constructor(autoCleanup = true) {
    if (autoCleanup) {
      this.startCleanup();
    }
  }

  /**
   * 增加请求计数
   */
  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing) {
      // 创建新条目
      const newItem: MemoryItem = {
        count: 1,
        resetTime: now + windowMs,
        windowStart: now,
        lastAccess: now,
      };
      this.store.set(key, newItem);
      return {
        count: 1,
        resetTime: newItem.resetTime,
        windowStart: newItem.windowStart,
      };
    }

    // 检查是否在时间窗口内
    if (now < existing.resetTime) {
      // 在窗口内，增加计数
      existing.count++;
      existing.lastAccess = now;
      this.store.set(key, existing);
      return {
        count: existing.count,
        resetTime: existing.resetTime,
        windowStart: existing.windowStart,
      };
    }

    // 窗口已过期，重置计数
    existing.count = 1;
    existing.resetTime = now + windowMs;
    existing.windowStart = now;
    existing.lastAccess = now;
    this.store.set(key, existing);
    return {
      count: 1,
      resetTime: existing.resetTime,
      windowStart: existing.windowStart,
    };
  }

  /**
   * 获取当前计数
   */
  async get(key: string): Promise<RateLimitEntry | null> {
    const item = this.store.get(key);
    if (!item) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now >= item.resetTime) {
      this.store.delete(key);
      return null;
    }

    return {
      count: item.count,
      resetTime: item.resetTime,
      windowStart: item.windowStart,
    };
  }

  /**
   * 重置计数
   */
  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * 清理过期数据
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.store.entries()) {
      if (now >= item.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
  } {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const item of this.store.values()) {
      if (now >= item.resetTime) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      totalEntries: this.store.size,
      activeEntries: active,
      expiredEntries: expired,
    };
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanup();
    }, this.cleanupIntervalMs);
  }

  /**
   * 停止定期清理
   */
  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    this.stopCleanup();
    this.store.clear();
  }
}
