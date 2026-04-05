/**
 * API Rate Limit Utility
 *
 * 简化在 API 路由中应用速率限制的工具函数
 */

import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, RateLimitResult, getClientIP, formatRateLimitHeaders } from './rate-limit/limiter'
import { MemoryRateLimitStorage } from './rate-limit/memory-storage'
import { RateLimitConfig as BaseRateLimitConfig } from './rate-limit/config'

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  /**
   * 时间窗口（毫秒）
   */
  windowMs: number

  /**
   * 最大请求数
   */
  maxRequests: number

  /**
   * 速率限制消息
   */
  message?: string

  /**
   * 是否启用日志
   */
  enableLogging?: boolean
}

/**
 * 预定义的速率限制策略
 */
export const RATE_LIMIT_PRESETS = {
  /**
   * 严格限制：用于认证端点
   * 5 请求/分钟
   */
  strict: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again later.',
  },

  /**
   * 中等限制：用于反馈提交、注册等
   * 10 请求/分钟
   */
  moderate: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 10,
    message: 'Too many requests. Please slow down.',
  },

  /**
   * 宽松限制：用于一般 API
   * 100 请求/分钟
   */
  relaxed: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 100,
    message: 'Rate limit exceeded.',
  },

  /**
   * 搜索限制：防止搜索滥用
   * 30 请求/分钟
   */
  search: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 30,
    message: 'Too many search requests. Please wait a moment.',
  },
}

/**
 * 速率限制器缓存
 * 使用 Map 存储不同配置的限流器实例
 */
const limitersCache = new Map<string, RateLimiter>()

/**
 * 获取或创建限流器
 */
function getLimiter(config: RateLimitConfig): RateLimiter {
  const cacheKey = `${config.windowMs}-${config.maxRequests}`

  if (!limitersCache.has(cacheKey)) {
    const storage = new MemoryRateLimitStorage()
    const baseConfig: BaseRateLimitConfig = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
    }
    limitersCache.set(cacheKey, new RateLimiter(storage, baseConfig))
  }

  return limitersCache.get(cacheKey)!
}

/**
 * 检查速率限制
 *
 * @param request - Next.js 请求对象
 * @param config - 速率限制配置
 * @returns 速率限制结果
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ result: RateLimitResult; response?: NextResponse }> {
  const limiter = getLimiter(config)
  const ip = getClientIP(request as unknown as Request)
  const pathname = request.nextUrl.pathname
  const key = `${ip}:${pathname}`

  const result = await limiter.check(key)

  // 记录日志
  if (config.enableLogging !== false) {
    console.log(
      `[Rate Limit] ${pathname} - ${ip}: ${result.count}/${result.limit} (remaining: ${result.remaining})`
    )
  }

  // 如果超出限制，返回错误响应
  if (!result.allowed) {
    const headers = formatRateLimitHeaders(result)
    headers.set('Content-Type', 'application/json')

    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: config.message || 'Too many requests. Please try again later.',
        retryAfter: result.resetAfter,
      },
      { status: 429, headers }
    )

    return { result, response }
  }

  return { result }
}

/**
 * 添加速率限制响应头
 *
 * @param response - Next.js 响应对象
 * @param result - 速率限制结果
 * @returns 带有速率限制头的响应对象
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  const headers = formatRateLimitHeaders(result)
  headers.forEach((value, name) => {
    response.headers.set(name, value)
  })
  return response
}

/**
 * 创建速率限制包装器
 *
 * 使用示例：
 * ```ts
 * export const POST = withRateLimit(RATE_LIMIT_PRESETS.strict, async (request) => {
 *   // API 处理逻辑
 *   return NextResponse.json({ success: true })
 * })
 * ```
 *
 * @param config - 速率限制配置
 * @param handler - API 处理函数
 * @returns 带有速率限制的 API 处理函数
 */
export function withRateLimit<T extends NextRequest>(
  config: RateLimitConfig,
  handler: (request: T, ...args: any[]) => Promise<Response> | Response
): (request: T, ...args: any[]) => Promise<Response> {
  return async (request: T, ...args: any[]): Promise<Response> => {
    // 检查速率限制
    const { result, response } = await checkRateLimit(request, config)

    // 如果超出限制，返回错误响应
    if (response) {
      return response
    }

    // 执行 API 处理函数
    const handlerResponse = await handler(request, ...args)

    // 添加速率限制响应头
    return addRateLimitHeaders(handlerResponse as NextResponse, result)
  }
}

/**
 * 清理限流器缓存
 *
 * 定期调用以释放内存
 */
export function cleanupRateLimiters(): void {
  // MemoryRateLimitStorage 会自动清理过期条目
  // 这里我们只需要清空缓存
  limitersCache.clear()
}

/**
 * 启动定期清理任务
 */
let cleanupInterval: NodeJS.Timeout | null = null

export function startRateLimitCleanup(intervalMs: number = 60 * 1000): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
  }

  cleanupInterval = setInterval(cleanupRateLimiters, intervalMs)
}

/**
 * 停止清理任务
 */
export function stopRateLimitCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

// 启动清理任务（在服务器启动时）
if (typeof window === 'undefined') {
  startRateLimitCleanup()
}