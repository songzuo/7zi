/**
 * 限流控制
 * 支持 RPM (Requests Per Minute) 和 TPM (Tokens Per Minute)
 */

import { RateLimitConfig } from './types'

/**
 * 滑动窗口限流器
 */
interface TokenBucket {
  tokens: number
  lastRefill: number
  capacity: number
  refillRate: number // 每毫秒补充的 token 数
}

/**
 * 速率限制器配置
 */
interface RateLimiterConfig {
  defaultRpm: number // 默认每分钟请求数
  defaultTpm: number // 默认每分钟 token 数
  burstMultiplier: number // 突发倍率
}

/**
 * 速率限制结果
 */
export interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  remainingTokens: number
  resetAt: number // 下一个时间窗口重置时间 (ms)
  retryAfter?: number // 需要等待的毫秒数
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  defaultRpm: 60,
  defaultTpm: 100000,
  burstMultiplier: 1.5,
}

/**
 * 速率限制器类
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket> // 模型级别
  private requestBuckets: Map<string, { count: number; windowStart: number }>
  private config: RateLimiterConfig
  private windowSizeMs: number // 时间窗口大小

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.buckets = new Map()
    this.requestBuckets = new Map()
    this.windowSizeMs = 60000 // 1 分钟窗口
  }

  /**
   * 令牌桶补充
   */
  private refill(bucket: TokenBucket): void {
    const now = Date.now()
    const elapsed = now - bucket.lastRefill

    // 补充 tokens
    const newTokens = elapsed * bucket.refillRate
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + newTokens)
    bucket.lastRefill = now
  }

  /**
   * 检查并消耗 token
   */
  private tryConsumeTokens(bucket: TokenBucket, tokens: number): boolean {
    this.refill(bucket)

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens
      return true
    }

    return false
  }

  /**
   * 检查速率限制
   */
  check(
    modelId: string,
    tokens: number = 1000
  ): RateLimitResult {
    // 检查请求级别限流
    const requestResult = this.checkRequestLimit(modelId)
    if (!requestResult.allowed) {
      return requestResult
    }

    // 检查 token 级别限流
    const bucket = this.buckets.get(modelId)
    if (!bucket) {
      // 初始化 bucket
      this.buckets.set(modelId, {
        tokens: this.config.defaultTpm * this.config.burstMultiplier,
        lastRefill: Date.now(),
        capacity: this.config.defaultTpm * this.config.burstMultiplier,
        refillRate: this.config.defaultTpm / this.windowSizeMs,
      })
      return {
        allowed: true,
        remainingRequests: this.getRemainingRequests(modelId),
        remainingTokens: this.config.defaultTpm,
        resetAt: Date.now() + this.windowSizeMs,
      }
    }

    const allowed = this.tryConsumeTokens(bucket, tokens)

    return {
      allowed,
      remainingRequests: this.getRemainingRequests(modelId),
      remainingTokens: Math.floor(bucket.tokens),
      resetAt: Date.now() + this.windowSizeMs,
      retryAfter: allowed
        ? undefined
        : Math.ceil((tokens - bucket.tokens) / bucket.refillRate),
    }
  }

  /**
   * 检查请求级别限流
   */
  private checkRequestLimit(modelId: string): RateLimitResult {
    const now = Date.now()
    let bucket = this.requestBuckets.get(modelId)

    if (!bucket) {
      bucket = { count: 0, windowStart: now }
      this.requestBuckets.set(modelId, bucket)
    }

    // 检查窗口是否需要重置
    if (now - bucket.windowStart >= this.windowSizeMs) {
      bucket.count = 0
      bucket.windowStart = now
    }

    const allowed = bucket.count < this.config.defaultRpm
    const remaining = this.config.defaultRpm - bucket.count

    if (allowed) {
      bucket.count++
    }

    return {
      allowed,
      remainingRequests: remaining,
      remainingTokens: 0,
      resetAt: bucket.windowStart + this.windowSizeMs,
      retryAfter: allowed ? undefined : this.windowSizeMs - (now - bucket.windowStart),
    }
  }

  /**
   * 获取剩余请求数
   */
  private getRemainingRequests(modelId: string): number {
    const bucket = this.requestBuckets.get(modelId)
    if (!bucket) return this.config.defaultRpm

    const now = Date.now()
    if (now - bucket.windowStart >= this.windowSizeMs) {
      return this.config.defaultRpm
    }

    return Math.max(0, this.config.defaultRpm - bucket.count)
  }

  /**
   * 设置自定义限流配置
   */
  setRateLimit(modelId: string, config: RateLimitConfig): void {
    const capacity = config.tokensPerMinute * this.config.burstMultiplier

    this.buckets.set(modelId, {
      tokens: capacity,
      lastRefill: Date.now(),
      capacity,
      refillRate: config.tokensPerMinute / this.windowSizeMs,
    })
  }

  /**
   * 重置限流器
   */
  reset(modelId?: string): void {
    if (modelId) {
      this.buckets.delete(modelId)
      this.requestBuckets.delete(modelId)
    } else {
      this.buckets.clear()
      this.requestBuckets.clear()
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(modelId: string): {
    rpm: number
    tpm: number
    windowResetAt: number
  } {
    const requestBucket = this.requestBuckets.get(modelId)
    const tokenBucket = this.buckets.get(modelId)

    const now = Date.now()
    const windowStart = requestBucket?.windowStart || now

    return {
      rpm: requestBucket?.count || 0,
      tpm: tokenBucket ? Math.floor(tokenBucket.capacity - tokenBucket.tokens) : 0,
      windowResetAt: windowStart + this.windowSizeMs,
    }
  }

  /**
   * 批量检查多个模型
   */
  checkMultiple(
    modelIds: string[],
    tokens: number = 1000
  ): Map<string, RateLimitResult> {
    const results = new Map<string, RateLimitResult>()

    for (const modelId of modelIds) {
      results.set(modelId, this.check(modelId, tokens))
    }

    return results
  }

  /**
   * 找到可用的模型
   */
  findAvailableModel(modelIds: string[], tokens: number = 1000): string | null {
    for (const modelId of modelIds) {
      const result = this.check(modelId, tokens)
      if (result.allowed) {
        return modelId
      }
    }
    return null
  }
}

/**
 * 全局限流器
 */
export const globalRateLimiter = new RateLimiter()

/**
 * 便捷检查函数
 */
export function checkRateLimit(
  modelId: string,
  tokens?: number
): RateLimitResult {
  return globalRateLimiter.check(modelId, tokens)
}