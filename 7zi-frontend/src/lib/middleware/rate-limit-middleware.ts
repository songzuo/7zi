/**
 * Rate Limit Middleware
 *
 * 生产级别的 API 限流中间件
 * 支持 Token Bucket 和 Sliding Window Counter 两种算法
 */

import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, RateLimitResult, getClientIP, generateRateLimitKey, formatRateLimitHeaders } from '../rate-limit/limiter'
import { MemoryRateLimitStorage } from '../rate-limit/memory-storage'
import { RateLimitConfig } from '../rate-limit/config'

/**
 * 限流算法类型
 */
export enum RateLimitAlgorithm {
  /**
   * Token Bucket 算法
   * 适用于平滑流量控制，允许突发流量
   */
  TOKEN_BUCKET = 'token_bucket',

  /**
   * Sliding Window Counter 算法
   * 适用于精确的速率限制，防止突发流量
   */
  SLIDING_WINDOW = 'sliding_window',
}

/**
 * Token Bucket 算法实现
 *
 * 令牌桶算法特点：
 * - 桶中有固定数量的令牌
 * - 令牌以固定速率补充
 * - 请求消耗令牌
 * - 允许一定程度的突发流量
 *
 * 分布式扩展说明：
 * - 单机：使用内存存储
 * - 分布式：使用 Redis 存储，通过 Lua 脚本保证原子性
 * - Redis key: rate_limit:token_bucket:{key}
 * - Redis 数据结构: Hash { tokens, lastRefill }
 */
export class TokenBucketRateLimiter {
  private storage: Map<string, { tokens: number; lastRefill: number }> = new Map()
  private capacity: number
  private refillRate: number // tokens per millisecond
  private windowMs: number

  constructor(capacity: number, refillRate: number, windowMs: number) {
    this.capacity = capacity
    this.refillRate = refillRate / 1000 // 转换为每毫秒
    this.windowMs = windowMs
  }

  /**
   * 尝试消费令牌
   */
  async consume(key: string, tokens: number = 1): Promise<RateLimitResult> {
    const now = Date.now()
    const entry = this.storage.get(key)

    if (!entry) {
      // 新条目，桶满
      this.storage.set(key, {
        tokens: this.capacity - tokens,
        lastRefill: now,
      })
      return {
        allowed: true,
        remaining: this.capacity - tokens,
        resetTime: now + this.windowMs,
        resetAfter: Math.ceil(this.windowMs / 1000),
        limit: this.capacity,
        exceeded: false,
        count: tokens,
      }
    }

    // 计算自上次补充以来的令牌
    const timePassed = now - entry.lastRefill
    const tokensToAdd = Math.floor(timePassed * this.refillRate)

    // 补充令牌（不超过容量）
    entry.tokens = Math.min(this.capacity, entry.tokens + tokensToAdd)
    entry.lastRefill = now

    // 检查是否有足够的令牌
    if (entry.tokens >= tokens) {
      entry.tokens -= tokens
      this.storage.set(key, entry)
      return {
        allowed: true,
        remaining: entry.tokens,
        resetTime: now + this.windowMs,
        resetAfter: Math.ceil(this.windowMs / 1000),
        limit: this.capacity,
        exceeded: false,
        count: this.capacity - entry.tokens,
      }
    }

    // 令牌不足
    this.storage.set(key, entry)
    const waitTime = Math.ceil((tokens - entry.tokens) / this.refillRate / 1000)
    return {
      allowed: false,
      remaining: entry.tokens,
      resetTime: now + waitTime * 1000,
      resetAfter: waitTime,
      limit: this.capacity,
      exceeded: true,
      count: this.capacity - entry.tokens,
    }
  }

  /**
   * 重置令牌桶
   */
  reset(key: string): void {
    this.storage.delete(key)
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.storage.entries()) {
      // 如果超过 5 分钟没有访问，清理
      if (now - entry.lastRefill > 5 * 60 * 1000) {
        this.storage.delete(key)
        cleaned++
      }
    }

    return cleaned
  }
}

/**
 * Sliding Window Counter 算法实现
 *
 * 滑动窗口计数器算法特点：
 * - 将时间窗口分成多个小窗口
 * - 统计当前滑动窗口内的请求数
 * - 精确控制速率，防止突发流量
 *
 * 分布式扩展说明：
 * - 单机：使用内存存储
 * - 分布式：使用 Redis Sorted Set
 * - Redis key: rate_limit:sliding_window:{key}
 * - Redis 数据结构: Sorted Set (score = timestamp, member = request_id)
 * - 使用 ZREMRANGEBYSCORE 清理过期请求
 * - 使用 ZCARD 统计当前窗口请求数
 */
export class SlidingWindowRateLimiter {
  private storage: Map<string, number[]> = new Map()
  private maxRequests: number
  private windowMs: number
  private windowSize: number // 小窗口大小（毫秒）

  constructor(maxRequests: number, windowMs: number, windowSize: number = 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.windowSize = windowSize
  }

  /**
   * 尝试增加请求计数
   */
  async increment(key: string): Promise<RateLimitResult> {
    const now = Date.now()
    const timestamps = this.storage.get(key) || []

    // 清理过期的时间戳
    const validTimestamps = timestamps.filter(ts => ts > now - this.windowMs)

    // 检查是否超出限制
    if (validTimestamps.length >= this.maxRequests) {
      // 找到最早的过期时间
      const oldestTimestamp = validTimestamps[0]
      const resetAfter = Math.ceil((oldestTimestamp + this.windowMs - now) / 1000)

      return {
        allowed: false,
        remaining: 0,
        resetTime: oldestTimestamp + this.windowMs,
        resetAfter,
        limit: this.maxRequests,
        exceeded: true,
        count: validTimestamps.length,
      }
    }

    // 添加新的时间戳
    validTimestamps.push(now)
    this.storage.set(key, validTimestamps)

    return {
      allowed: true,
      remaining: this.maxRequests - validTimestamps.length,
      resetTime: now + this.windowMs,
      resetAfter: Math.ceil(this.windowMs / 1000),
      limit: this.maxRequests,
      exceeded: false,
      count: validTimestamps.length,
    }
  }

  /**
   * 重置计数器
   */
  reset(key: string): void {
    this.storage.delete(key)
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, timestamps] of this.storage.entries()) {
      // 如果所有时间戳都过期，清理
      const validTimestamps = timestamps.filter(ts => ts > now - this.windowMs)
      if (validTimestamps.length === 0) {
        this.storage.delete(key)
        cleaned++
      } else {
        this.storage.set(key, validTimestamps)
      }
    }

    return cleaned
  }
}

/**
 * 限流中间件配置
 */
export interface RateLimitMiddlewareConfig {
  /**
   * 限流算法
   */
  algorithm?: RateLimitAlgorithm

  /**
   * 时间窗口（毫秒）
   */
  windowMs?: number

  /**
   * 最大请求数
   */
  maxRequests?: number

  /**
   * 自定义键生成器
   */
  keyGenerator?: (request: NextRequest) => string

  /**
   * 跳过限流的条件
   */
  skip?: (request: NextRequest) => boolean

  /**
   * 成功请求是否计入限流
   */
  skipSuccessfulRequests?: boolean

  /**
   * 失败请求是否计入限流
   */
  skipFailedRequests?: boolean

  /**
   * 自定义限流响应
   */
  onLimitReached?: (request: NextRequest, result: RateLimitResult) => NextResponse

  /**
   * 限流响应消息
   */
  message?: string

  /**
   * 是否启用响应头
   */
  enableHeaders?: boolean

  /**
   * 是否启用日志
   */
  enableLogging?: boolean
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<RateLimitMiddlewareConfig> = {
  algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
  windowMs: 60 * 1000, // 1 分钟
  maxRequests: 100,
  keyGenerator: (request: NextRequest) => {
    const ip = getClientIP(request as unknown as Request)
    const pathname = request.nextUrl.pathname
    return `${ip}:${pathname}`
  },
  skip: () => false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  onLimitReached: (request: NextRequest, result: RateLimitResult) => {
    const headers = formatRateLimitHeaders(result)
    headers.set('Content-Type', 'application/json')

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: result.resetAfter,
      },
      { status: 429, headers }
    )
  },
  message: 'Too many requests',
  enableHeaders: true,
  enableLogging: true,
}

/**
 * 创建限流中间件
 */
export function createRateLimitMiddleware(config: RateLimitMiddlewareConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // 根据算法选择限流器
  let limiter: TokenBucketRateLimiter | SlidingWindowRateLimiter

  if (finalConfig.algorithm === RateLimitAlgorithm.TOKEN_BUCKET) {
    // Token Bucket: capacity = maxRequests, refillRate = maxRequests / windowMs
    limiter = new TokenBucketRateLimiter(
      finalConfig.maxRequests,
      finalConfig.maxRequests / finalConfig.windowMs * 1000,
      finalConfig.windowMs
    )
  } else {
    // Sliding Window Counter
    limiter = new SlidingWindowRateLimiter(
      finalConfig.maxRequests,
      finalConfig.windowMs
    )
  }

  // 启动定期清理
  const cleanupInterval = setInterval(() => {
    limiter.cleanup()
  }, 60 * 1000) // 每分钟清理一次

  // 返回中间件函数
  return async function rateLimitMiddleware(request: NextRequest) {
    // 检查是否跳过限流
    if (finalConfig.skip(request)) {
      return NextResponse.next()
    }

    // 生成限流键
    const key = finalConfig.keyGenerator(request)

    // 检查限流
    let result: RateLimitResult

    if (finalConfig.algorithm === RateLimitAlgorithm.TOKEN_BUCKET) {
      result = await (limiter as TokenBucketRateLimiter).consume(key)
    } else {
      result = await (limiter as SlidingWindowRateLimiter).increment(key)
    }

    // 记录日志
    if (finalConfig.enableLogging) {
      console.log(`[Rate Limit] ${key}: ${result.count}/${result.limit} (remaining: ${result.remaining})`)
    }

    // 检查是否超出限制
    if (!result.allowed) {
      return finalConfig.onLimitReached(request, result)
    }

    // 添加响应头
    if (finalConfig.enableHeaders) {
      const response = NextResponse.next()
      const headers = formatRateLimitHeaders(result)
      headers.forEach((value, name) => {
        response.headers.set(name, value)
      })
      return response
    }

    return NextResponse.next()
  }
}

/**
 * 预定义的限流中间件
 */
export const RateLimitMiddlewarePresets = {
  /**
   * Workflow API 限流：100 req/min
   */
  workflow: createRateLimitMiddleware({
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyGenerator: (request: NextRequest) => {
      const ip = getClientIP(request as unknown as Request)
      return `workflow:${ip}`
    },
  }),

  /**
   * Agent API 限流：200 req/min
   */
  agent: createRateLimitMiddleware({
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    windowMs: 60 * 1000,
    maxRequests: 200,
    keyGenerator: (request: NextRequest) => {
      const ip = getClientIP(request as unknown as Request)
      return `agent:${ip}`
    },
  }),

  /**
   * Search API 限流：50 req/min
   */
  search: createRateLimitMiddleware({
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    windowMs: 60 * 1000,
    maxRequests: 50,
    keyGenerator: (request: NextRequest) => {
      const ip = getClientIP(request as unknown as Request)
      return `search:${ip}`
    },
  }),

  /**
   * 认证 API 限流：5 req/min (Token Bucket 允许突发)
   */
  auth: createRateLimitMiddleware({
    algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyGenerator: (request: NextRequest) => {
      const ip = getClientIP(request as unknown as Request)
      return `auth:${ip}`
    },
  }),

  /**
   * 默认限流：100 req/min
   */
  default: createRateLimitMiddleware({
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
}

/**
 * 根据路径获取限流中间件
 */
export function getRateLimitMiddlewareForPath(pathname: string) {
  if (pathname.startsWith('/api/workflow/')) {
    return RateLimitMiddlewarePresets.workflow
  }

  if (pathname.startsWith('/api/agent/')) {
    return RateLimitMiddlewarePresets.agent
  }

  if (pathname.startsWith('/api/search/')) {
    return RateLimitMiddlewarePresets.search
  }

  if (pathname.startsWith('/api/auth/')) {
    return RateLimitMiddlewarePresets.auth
  }

  return RateLimitMiddlewarePresets.default
}

/**
 * 通用限流中间件（自动根据路径选择）
 */
export async function rateLimitMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 只对 API 路由应用限流
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const middleware = getRateLimitMiddlewareForPath(pathname)
  return middleware(request)
}