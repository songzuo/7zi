/**
 * 速率限制核心
 *
 * 支持滑动窗口和令牌桶两种算法
 * 支持用户级别、IP 级别、API 级别的限制
 * 使用 Redis 分布式存储
 */

import { SlidingWindow } from './algorithms/sliding-window'
import { TokenBucket } from './algorithms/token-bucket'
import { RedisAdapter } from './redis-adapter'

// Request object type for rate limiting
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RateLimitRequest = any

export interface RateLimitConfig {
  windowMs: number // 时间窗口（毫秒）
  maxRequests: number // 窗口内最大请求数
  algorithm: 'sliding-window' | 'token-bucket' // 算法类型
  keyGenerator: (req: RateLimitRequest) => string // 键生成器
  skipSuccessfulRequests?: boolean // 是否跳过成功的请求不计入限制
  skipFailedRequests?: boolean // 是否跳过失败的请求不计入限制
}

export interface RateLimitResult {
  allowed: boolean // 是否允许请求
  remaining: number // 剩余请求数
  resetTime: number // 重置时间（时间戳）
  limit: number // 限制数
  retryAfter?: number // 重试时间（秒）
}

export interface RateLimitInfo {
  count: number // 当前计数
  limit: number // 限制数
  resetTime: number // 重置时间（时间戳）
  createdAt: number // 创建时间（时间戳）
}

/**
 * 分布式速率限制器
 */
export class DistributedRateLimiter {
  private config: RateLimitConfig
  private redisAdapter: RedisAdapter
  private algorithm: SlidingWindow | TokenBucket
  private useRedis: boolean
  /**
   * 内存模式下按 key 隔离的限流状态。
   * 注意：内存模式只在没有注入 Redis adapter 时启用（当前就是这种），
   * 且每个 key 必须持有**自己的**算法实例，否则所有 IP 共用一个桶。
   */
  private memoryState = new Map<
    string,
    { bucket?: TokenBucket; window?: SlidingWindow; lastSeen: number }
  >()
  private memorySweepAt = 0

  constructor(config: RateLimitConfig, redisAdapter?: RedisAdapter) {
    this.config = config
    this.redisAdapter = redisAdapter || new RedisAdapter({ keyPrefix: 'rate-limit' })
    this.useRedis = !!redisAdapter

    // 创建算法实例
    if (config.algorithm === 'sliding-window') {
      this.algorithm = new SlidingWindow({
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
      })
    } else {
      this.algorithm = new TokenBucket({
        capacity: config.maxRequests,
        refillRate: config.maxRequests / config.windowMs, // 令牌/毫秒
      })
    }
  }

  /**
   * 检查是否允许请求
   * @param req 请求对象
   * @returns 速率限制结果
   */
  async check(req: RateLimitRequest): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(req)

    if (this.useRedis) {
      return await this.checkWithRedis(key)
    } else {
      return this.checkWithMemory(key)
    }
  }

  /**
   * 使用 Redis 检查速率限制
   * @param key 键
   * @returns 速率限制结果
   */
  private async checkWithRedis(key: string): Promise<RateLimitResult> {
    const currentTime = Date.now()

    try {
      // 获取当前计数信息
      const infoStr = await this.redisAdapter.get(key)
      let info: RateLimitInfo

      if (!infoStr) {
        // 创建新的计数信息
        info = {
          count: 0,
          limit: this.config.maxRequests,
          resetTime: currentTime + this.config.windowMs,
          createdAt: currentTime,
        }
      } else {
        info = JSON.parse(infoStr)

        // 检查窗口是否过期
        if (currentTime > info.resetTime) {
          info = {
            count: 0,
            limit: this.config.maxRequests,
            resetTime: currentTime + this.config.windowMs,
            createdAt: currentTime,
          }
        }
      }

      // 检查是否允许
      const allowed = info.count < this.config.maxRequests

      if (allowed) {
        // 增加计数
        info.count++
      }

      // 保存到 Redis
      const ttl = Math.ceil((info.resetTime - currentTime) / 1000)
      await this.redisAdapter.set(key, JSON.stringify(info), ttl)

      // 计算剩余请求数
      const remaining = Math.max(0, this.config.maxRequests - info.count)

      // 计算重试时间
      let retryAfter: number | undefined
      if (!allowed) {
        retryAfter = Math.ceil((info.resetTime - currentTime) / 1000)
      }

      return {
        allowed,
        remaining,
        resetTime: info.resetTime,
        limit: this.config.maxRequests,
        retryAfter,
      }
    } catch (error) {
      console.error('[DistributedRateLimiter] Redis check failed, falling back to memory:', error)
      // 降级到内存模式
      return this.checkWithMemory(key)
    }
  }

  /**
   * 使用内存检查速率限制（未注入 Redis adapter 时的实际执行路径）
   *
   * 修复两个历史缺陷：
   *   1) 旧实现调用 `this.algorithm.check(currentTime)`。SlidingWindow.check 的形参
   *      确实是时间戳，但 TokenBucket.check 的形参是「需要的令牌数」。把毫秒时间戳
   *      当令牌数传进去后 `allowed = tokens >= 1.7e12` 恒为 false，
   *      于是所有 token-bucket 限流器（general 100/min）无条件 429 —— 下单接口直接废掉。
   *      现在按算法分别传参：token-bucket → check(1)，sliding-window → check(currentTime)。
   *   2) 旧实现所有 key 共用同一个算法实例，等价于全站共用一个桶，
   *      正常客户会被其他 IP 的流量挤到 429。现在每个 key 持有独立实例。
   *
   * @param key 限流键（例如 `ip:1.2.3.4`）
   */
  private checkWithMemory(key: string): RateLimitResult {
    const currentTime = Date.now()

    let state = this.memoryState.get(key)
    if (!state) {
      state = { lastSeen: currentTime }
      this.memoryState.set(key, state)
    }
    state.lastSeen = currentTime

    let allowed: boolean
    let remaining: number
    let resetTime: number

    if (this.config.algorithm === 'token-bucket') {
      if (!state.bucket) {
        state.bucket = new TokenBucket({
          capacity: this.config.maxRequests,
          refillRate: this.config.maxRequests / this.config.windowMs, // 令牌/毫秒
        })
      }
      const r = state.bucket.check(1) // 消耗 1 个令牌（不是时间戳！）
      allowed = r.allowed
      remaining = r.remaining
      resetTime = r.resetTime
    } else {
      if (!state.window) {
        state.window = new SlidingWindow({
          windowMs: this.config.windowMs,
          maxRequests: this.config.maxRequests,
        })
      }
      const r = state.window.check(currentTime)
      allowed = r.allowed
      remaining = r.remaining
      resetTime = r.resetTime
    }

    // 惰性回收：公网上的扫描器 IP 极多，不清会一直堆积
    if (currentTime - this.memorySweepAt > this.config.windowMs) {
      this.memorySweepAt = currentTime
      const idleLimit = this.config.windowMs * 2
      for (const [k, v] of this.memoryState) {
        if (currentTime - v.lastSeen > idleLimit) this.memoryState.delete(k)
      }
    }

    return {
      allowed,
      remaining,
      resetTime,
      limit: this.config.maxRequests,
      retryAfter: allowed
        ? undefined
        : Math.max(1, Math.ceil((resetTime - currentTime) / 1000)),
    }
  }


  /**
   * 记录成功的请求（如果配置了 skipSuccessfulRequests）
   * @param req 请求对象
   */
  async recordSuccess(req: RateLimitRequest): Promise<void> {
    if (this.config.skipSuccessfulRequests) {
      // 不计入限制
      return
    }
    // 默认已经计入，这里不需要额外操作
  }

  /**
   * 记录失败的请求（如果配置了 skipFailedRequests）
   * @param req 请求对象
   */
  async recordFailure(req: RateLimitRequest): Promise<void> {
    if (this.config.skipFailedRequests) {
      // 需要从计数中减去
      const key = this.config.keyGenerator(req)

      if (this.useRedis) {
        try {
          const infoStr = await this.redisAdapter.get(key)
          if (infoStr) {
            const info: RateLimitInfo = JSON.parse(infoStr)
            if (info.count > 0) {
              info.count--
              const ttl = Math.ceil((info.resetTime - Date.now()) / 1000)
              await this.redisAdapter.set(key, JSON.stringify(info), ttl)
            }
          }
        } catch (error) {
          console.error('[DistributedRateLimiter] Record failure failed:', error)
        }
      }
      // 内存模式暂不处理
    }
  }

  /**
   * 重置指定键的速率限制
   * @param req 请求对象
   */
  async reset(req: RateLimitRequest): Promise<void> {
    const key = this.config.keyGenerator(req)

    if (this.useRedis) {
      try {
        await this.redisAdapter.delete(key)
      } catch (error) {
        console.error('[DistributedRateLimiter] Reset failed:', error)
      }
    } else {
      this.algorithm.reset()
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
    return { ...this.config }
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config }

    // 重建算法实例
    if (config.algorithm || config.windowMs || config.maxRequests) {
      if (this.config.algorithm === 'sliding-window') {
        this.algorithm = new SlidingWindow({
          windowMs: this.config.windowMs,
          maxRequests: this.config.maxRequests,
        })
      } else {
        this.algorithm = new TokenBucket({
          capacity: this.config.maxRequests,
          refillRate: this.config.maxRequests / this.config.windowMs,
        })
      }
    }
  }

  /**
   * 设置 Redis 适配器
   * @param adapter Redis 适配器
   */
  setRedisAdapter(adapter: RedisAdapter): void {
    this.redisAdapter = adapter
    this.useRedis = true
  }

  /**
   * 禁用 Redis，使用内存模式
   */
  disableRedis(): void {
    this.useRedis = false
  }
}

/**
 * 预设键生成器
 */
export const KeyGenerators = {
  /**
   * IP 级别限制
   */
  byIP: (req: RateLimitRequest): string => {
    // 注意：Next 的 NextRequest.headers 是 Headers 实例，只能用 get() 取值。
    // 之前用 obj['x-forwarded-for'] 永远得到 undefined，于是所有请求都落到 'unknown'，
    // 全站共用一个限流桶 —— 正常客户会被其他流量的 429 误伤。
    const h = (req.headers || {}) as unknown as {
      get?: (k: string) => string | null
      [k: string]: unknown
    }
    const pick = (name: string): string => {
      const raw = typeof h.get === 'function' ? h.get(name) : h[name]
      return typeof raw === 'string' ? raw : ''
    }
    const ip =
      pick('x-forwarded-for').split(',')[0].trim() ||
      pick('x-real-ip') ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    return `ip:${ip}`
  },

  /**
   * 用户级别限制（需要 auth middleware）
   */
  byUser: (req: RateLimitRequest): string => {
    const userId = req.user?.id || req.auth?.userId || 'anonymous'
    return `user:${userId}`
  },

  /**
   * API 级别限制（基于路径）
   */
  byAPI: (req: RateLimitRequest): string => {
    const path = req.path || req.url?.split('?')[0] || 'unknown'
    return `api:${path}`
  },

  /**
   * 组合限制（用户 + IP）
   */
  byUserAndIP: (req: RateLimitRequest): string => {
    const userId = req.user?.id || req.auth?.userId || 'anonymous'
    const ip =
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers?.['x-real-ip'] ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    return `user:${userId}:ip:${ip}`
  },

  /**
   * 自定义键生成器
   */
  custom: (generator: (req: RateLimitRequest) => string): ((req: RateLimitRequest) => string) => {
    return generator
  },
}
