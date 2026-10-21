/**
 * Rate Limit Proxy
 *
 * Next.js Proxy 层，用于 API 速率限制
 *
 * 注意: JWT 验证已移至 API 路由层面处理，以避免 Edge Runtime 兼容性问题
 * 注意: 安全头已在 next.config.ts 中统一配置，此处无需重复添加
 *
 * @version 1.3.0
 * @date 2026-04-04
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  RateLimiter,
  getClientIP,
  generateRateLimitKey,
  formatRateLimitHeaders,
} from './lib/rate-limit/limiter'
import { MemoryRateLimitStorage } from './lib/rate-limit/memory-storage'
import { getRateLimitForPath, RateLimitConfig } from './lib/rate-limit/config'

/**
 * 存储实例缓存
 * Note: Proxy runs on Edge, so we always use MemoryStorage here
 */
let storageInstance: MemoryRateLimitStorage | null = null

/**
 * 获取或创建存储实例
 */
function getStorage(config: RateLimitConfig): MemoryRateLimitStorage {
  if (!storageInstance) {
    // Proxy runs on Edge, so always use MemoryStorage
    storageInstance = new MemoryRateLimitStorage()
  }

  return storageInstance
}

/**
 * 限流器缓存
 */
const limiterCache = new Map<string, RateLimiter>()

/**
 * 获取或创建限流器
 */
function getLimiter(config: RateLimitConfig): RateLimiter {
  const cacheKey = JSON.stringify(config)
  let limiter = limiterCache.get(cacheKey)

  if (!limiter) {
    const storage = getStorage(config)
    limiter = new RateLimiter(storage, config)
    limiterCache.set(cacheKey, limiter)
  }

  return limiter
}

/**
 * 需要限流的路径模式
 */
const RATE_LIMITED_PATHS = ['/api', '/auth']

/**
 * 需要跳过的路径模式（用于静态资源等）
 */
const SKIP_RATE_LIMIT_PATHS = ['/_next', '/static', '/favicon', '/images']

/**
 * 检查路径是否需要限流
 */
function shouldRateLimit(pathname: string): boolean {
  // 跳过特定路径
  for (const skipPath of SKIP_RATE_LIMIT_PATHS) {
    if (pathname.startsWith(skipPath)) {
      return false
    }
  }

  // 检查是否匹配限流路径
  for (const limitPath of RATE_LIMITED_PATHS) {
    if (pathname.startsWith(limitPath)) {
      return true
    }
  }

  return false
}

/**
 * 主 Proxy 函数
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // 速率限制（仅对 API 路径）
  if (shouldRateLimit(pathname)) {
    const config = getRateLimitForPath(pathname)
    const limiter = getLimiter(config)

    // 生成限流键
    const key = generateRateLimitKey(request, config.keyGenerator)

    // 检查限流
    const result = await limiter.check(key)

    // 如果超出限流，返回 429
    if (!result.allowed) {
      const rateLimitHeaders = formatRateLimitHeaders(result)
      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.resetAfter,
        }),
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(rateLimitHeaders),
          },
        }
      )
    }

    // 添加限流头到响应
    const response = NextResponse.next()
    const rateLimitHeaders = formatRateLimitHeaders(result)
    rateLimitHeaders.forEach((value, header) => {
      response.headers.set(header, value)
    })

    return response
  }

  // 不需要限流的请求，直接放行
  return NextResponse.next()
}

/**
 * Proxy 配置
 */
export const config = {
  // 匹配所有路径，除了静态资源
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (favicon 文件)
     * - public 文件夹中的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
