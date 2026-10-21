/**
 * Sliding Window Rate Limiter
 *
 * 滑动窗口速率限制器实现
 */

import { IRateLimitStorage, RateLimitEntry } from './storage'
import { RateLimitConfig } from './config'

/**
 * 限流结果接口
 */
export interface RateLimitResult {
  /**
   * 是否允许请求
   */
  allowed: boolean

  /**
   * 剩余请求数
   */
  remaining: number

  /**
   * 重置时间（Unix 时间戳，毫秒）
   */
  resetTime: number

  /**
   * 重置时间（秒）
   */
  resetAfter: number

  /**
   * 当前窗口内的请求数
   */
  limit: number

  /**
   * 是否超出限流
   */
  exceeded: boolean
}

/**
 * 速率限制器类
 */
export class RateLimiter {
  private storage: IRateLimitStorage
  private config: RateLimitConfig

  constructor(storage: IRateLimitStorage, config: RateLimitConfig) {
    this.storage = storage
    this.config = config
  }

  /**
   * 检查并更新限流状态
   */
  async check(key: string): Promise<RateLimitResult> {
    const entry = await this.storage.increment(key, this.config.windowMs)
    const now = Date.now()

    // 计算剩余请求数
    const remaining = Math.max(0, this.config.maxRequests - entry.count)
    const exceeded = entry.count > this.config.maxRequests
    const resetAfter = Math.max(0, Math.ceil((entry.resetTime - now) / 1000))

    return {
      allowed: !exceeded,
      remaining,
      resetTime: entry.resetTime,
      resetAfter,
      limit: this.config.maxRequests,
      exceeded,
    }
  }

  /**
   * 仅检查限流状态（不增加计数）
   */
  async peek(key: string): Promise<RateLimitResult> {
    const entry = await this.storage.get(key)
    const now = Date.now()

    if (!entry) {
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        resetAfter: Math.ceil(this.config.windowMs / 1000),
        limit: this.config.maxRequests,
        exceeded: false,
      }
    }

    const remaining = Math.max(0, this.config.maxRequests - entry.count)
    const exceeded = entry.count > this.config.maxRequests
    const resetAfter = Math.max(0, Math.ceil((entry.resetTime - now) / 1000))

    return {
      allowed: !exceeded,
      remaining,
      resetTime: entry.resetTime,
      resetAfter,
      limit: this.config.maxRequests,
      exceeded,
    }
  }

  /**
   * 重置限流状态
   */
  async reset(key: string): Promise<void> {
    await this.storage.reset(key)
  }

  /**
   * 获取限流配置
   */
  getConfig(): RateLimitConfig {
    return this.config
  }

  /**
   * 更新限流配置
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

/**
 * 从请求中提取 IP 地址
 */
export function getClientIP(request: Request): string {
  // 从 headers 中获取 IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for 可能包含多个 IP，取第一个
    const ips = forwardedFor.split(',').map(ip => ip.trim())
    return ips[0]
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Next.js API 路由中可能有其他 header
  // 这里返回默认值，实际应用中需要根据部署环境调整
  return 'unknown'
}

/**
 * 生成限流键
 */
export function generateRateLimitKey(
  request: Request,
  keyGenerator?: (request: Request) => string
): string {
  if (keyGenerator) {
    return keyGenerator(request)
  }

  const ip = getClientIP(request)
  const url = new URL(request.url)
  const pathname = url.pathname

  return `${ip}:${pathname}`
}

/**
 * 格式化限流响应头
 */
export function formatRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers()

  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
  headers.set('Retry-After', result.resetAfter.toString())

  return headers
}
