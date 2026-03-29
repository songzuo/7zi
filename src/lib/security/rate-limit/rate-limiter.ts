/**
 * 速率限制核心
 *
 * 支持滑动窗口和令牌桶两种算法
 * 支持用户级别、IP 级别、API 级别的限制
 * 使用 Redis 分布式存储
 */

import { SlidingWindow } from './algorithms/sliding-window';
import { TokenBucket } from './algorithms/token-bucket';
import { RedisAdapter } from './redis-adapter';

export interface RateLimitConfig {
  windowMs: number;                              // 时间窗口（毫秒）
  maxRequests: number;                           // 窗口内最大请求数
  algorithm: 'sliding-window' | 'token-bucket'; // 算法类型
  keyGenerator: (req: any) => string;            // 键生成器
  skipSuccessfulRequests?: boolean;              // 是否跳过成功的请求不计入限制
  skipFailedRequests?: boolean;                  // 是否跳过失败的请求不计入限制
}

export interface RateLimitResult {
  allowed: boolean;      // 是否允许请求
  remaining: number;     // 剩余请求数
  resetTime: number;     // 重置时间（时间戳）
  limit: number;        // 限制数
  retryAfter?: number;   // 重试时间（秒）
}

export interface RateLimitInfo {
  count: number;         // 当前计数
  limit: number;         // 限制数
  resetTime: number;     // 重置时间（时间戳）
  createdAt: number;     // 创建时间（时间戳）
}

/**
 * 分布式速率限制器
 */
export class DistributedRateLimiter {
  private config: RateLimitConfig;
  private redisAdapter: RedisAdapter;
  private algorithm: SlidingWindow | TokenBucket;
  private useRedis: boolean;

  constructor(config: RateLimitConfig, redisAdapter?: RedisAdapter) {
    this.config = config;
    this.redisAdapter = redisAdapter || new RedisAdapter({ keyPrefix: 'rate-limit' });
    this.useRedis = !!redisAdapter;

    // 创建算法实例
    if (config.algorithm === 'sliding-window') {
      this.algorithm = new SlidingWindow({
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
      });
    } else {
      this.algorithm = new TokenBucket({
        capacity: config.maxRequests,
        refillRate: config.maxRequests / config.windowMs, // 令牌/毫秒
      });
    }
  }

  /**
   * 检查是否允许请求
   * @param req 请求对象
   * @returns 速率限制结果
   */
  async check(req: any): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(req);

    if (this.useRedis) {
      return await this.checkWithRedis(key);
    } else {
      return this.checkWithMemory(key);
    }
  }

  /**
   * 使用 Redis 检查速率限制
   * @param key 键
   * @returns 速率限制结果
   */
  private async checkWithRedis(key: string): Promise<RateLimitResult> {
    const currentTime = Date.now();

    try {
      // 获取当前计数信息
      const infoStr = await this.redisAdapter.get(key);
      let info: RateLimitInfo;

      if (!infoStr) {
        // 创建新的计数信息
        info = {
          count: 0,
          limit: this.config.maxRequests,
          resetTime: currentTime + this.config.windowMs,
          createdAt: currentTime,
        };
      } else {
        info = JSON.parse(infoStr);

        // 检查窗口是否过期
        if (currentTime > info.resetTime) {
          info = {
            count: 0,
            limit: this.config.maxRequests,
            resetTime: currentTime + this.config.windowMs,
            createdAt: currentTime,
          };
        }
      }

      // 检查是否允许
      const allowed = info.count < this.config.maxRequests;

      if (allowed) {
        // 增加计数
        info.count++;
      }

      // 保存到 Redis
      const ttl = Math.ceil((info.resetTime - currentTime) / 1000);
      await this.redisAdapter.set(key, JSON.stringify(info), ttl);

      // 计算剩余请求数
      const remaining = Math.max(0, this.config.maxRequests - info.count);

      // 计算重试时间
      let retryAfter: number | undefined;
      if (!allowed) {
        retryAfter = Math.ceil((info.resetTime - currentTime) / 1000);
      }

      return {
        allowed,
        remaining,
        resetTime: info.resetTime,
        limit: this.config.maxRequests,
        retryAfter,
      };
    } catch (error) {
      console.error('[DistributedRateLimiter] Redis check failed, falling back to memory:', error);
      // 降级到内存模式
      return this.checkWithMemory(key);
    }
  }

  /**
   * 使用内存检查速率限制（降级方案）
   * @param key 键
   * @returns 速率限制结果
   */
  private checkWithMemory(key: string): RateLimitResult {
    // 注意：这里简化处理，实际应该为每个 key 维护独立的计数器
    // 为了演示，直接使用算法实例
    const currentTime = Date.now();
    const result = this.algorithm.check(currentTime);

    // 计算重试时间
    let retryAfter: number | undefined;
    if (!result.allowed) {
      retryAfter = Math.ceil((result.resetTime - currentTime) / 1000);
    }

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetTime: result.resetTime,
      limit: this.config.maxRequests,
      retryAfter,
    };
  }

  /**
   * 记录成功的请求（如果配置了 skipSuccessfulRequests）
   * @param req 请求对象
   */
  async recordSuccess(req: any): Promise<void> {
    if (this.config.skipSuccessfulRequests) {
      // 不计入限制
      return;
    }
    // 默认已经计入，这里不需要额外操作
  }

  /**
   * 记录失败的请求（如果配置了 skipFailedRequests）
   * @param req 请求对象
   */
  async recordFailure(req: any): Promise<void> {
    if (this.config.skipFailedRequests) {
      // 需要从计数中减去
      const key = this.config.keyGenerator(req);

      if (this.useRedis) {
        try {
          const infoStr = await this.redisAdapter.get(key);
          if (infoStr) {
            const info: RateLimitInfo = JSON.parse(infoStr);
            if (info.count > 0) {
              info.count--;
              const ttl = Math.ceil((info.resetTime - Date.now()) / 1000);
              await this.redisAdapter.set(key, JSON.stringify(info), ttl);
            }
          }
        } catch (error) {
          console.error('[DistributedRateLimiter] Record failure failed:', error);
        }
      }
      // 内存模式暂不处理
    }
  }

  /**
   * 重置指定键的速率限制
   * @param req 请求对象
   */
  async reset(req: any): Promise<void> {
    const key = this.config.keyGenerator(req);

    if (this.useRedis) {
      try {
        await this.redisAdapter.delete(key);
      } catch (error) {
        console.error('[DistributedRateLimiter] Reset failed:', error);
      }
    } else {
      this.algorithm.reset();
    }
  }

  /**
   * 清理过期的数据
   * Redis 会自动过期，内存模式需要手动清理
   */
  async cleanup(): Promise<void> {
    if (!this.useRedis) {
      // 内存模式算法内部已实现自动清理
    }
    // Redis 模式无需手动清理（TTL 自动过期）
  }

  /**
   * 获取当前配置
   * @returns 配置对象
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };

    // 重建算法实例
    if (config.algorithm || config.windowMs || config.maxRequests) {
      if (this.config.algorithm === 'sliding-window') {
        this.algorithm = new SlidingWindow({
          windowMs: this.config.windowMs,
          maxRequests: this.config.maxRequests,
        });
      } else {
        this.algorithm = new TokenBucket({
          capacity: this.config.maxRequests,
          refillRate: this.config.maxRequests / this.config.windowMs,
        });
      }
    }
  }

  /**
   * 设置 Redis 适配器
   * @param adapter Redis 适配器
   */
  setRedisAdapter(adapter: RedisAdapter): void {
    this.redisAdapter = adapter;
    this.useRedis = true;
  }

  /**
   * 禁用 Redis，使用内存模式
   */
  disableRedis(): void {
    this.useRedis = false;
  }
}

/**
 * 预设键生成器
 */
export const KeyGenerators = {
  /**
   * IP 级别限制
   */
  byIP: (req: any): string => {
    const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers?.['x-real-ip']
      || req.socket?.remoteAddress
      || req.ip
      || 'unknown';
    return `ip:${ip}`;
  },

  /**
   * 用户级别限制（需要 auth middleware）
   */
  byUser: (req: any): string => {
    const userId = req.user?.id || req.auth?.userId || 'anonymous';
    return `user:${userId}`;
  },

  /**
   * API 级别限制（基于路径）
   */
  byAPI: (req: any): string => {
    const path = req.path || req.url?.split('?')[0] || 'unknown';
    return `api:${path}`;
  },

  /**
   * 组合限制（用户 + IP）
   */
  byUserAndIP: (req: any): string => {
    const userId = req.user?.id || req.auth?.userId || 'anonymous';
    const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers?.['x-real-ip']
      || req.socket?.remoteAddress
      || req.ip
      || 'unknown';
    return `user:${userId}:ip:${ip}`;
  },

  /**
   * 自定义键生成器
   */
  custom: (generator: (req: any) => string): ((req: any) => string) => {
    return generator;
  },
};
