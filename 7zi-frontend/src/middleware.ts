/**
 * Rate Limit Middleware
 *
 * Next.js 中间件，用于速率限制和安全头
 *
 * 注意: JWT 验证已移至 API 路由层面处理，以避免 Edge Runtime 兼容性问题
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
 * Note: Middleware runs on Edge, so we always use MemoryStorage here
 */
let storageInstance: MemoryRateLimitStorage | null = null

/**
 * 获取或创建存储实例
 */
function getStorage(config: RateLimitConfig): MemoryRateLimitStorage {
  if (!storageInstance) {
    // Middleware runs on Edge, so always use MemoryStorage
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
 * 公开路径（跳过认证）
 * Note: JWT 验证已移至 API 路由层面处理
 */
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/mcp/rpc', // Uses API Key auth at route level
  '/api/health',
]

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
 * 添加安全响应头
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  // 根据实际需求调整 CSP 策略
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  // 其他安全头
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  // HSTS (仅在 HTTPS 环境中启用)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}

/**
 * 主中间件函数
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // 1. 添加安全头（对所有请求）
  const response = NextResponse.next()
  addSecurityHeaders(response)

  // 2. 速率限制（仅对 API 路径）
  if (shouldRateLimit(pathname)) {
    const config = getRateLimitForPath(pathname)
    const limiter = getLimiter(config)

    // 生成限流键
    const key = generateRateLimitKey(request, config.keyGenerator)

    // 检查限流
    const result = await limiter.check(key)

    // 添加限流头
    const rateLimitHeaders = formatRateLimitHeaders(result)
    rateLimitHeaders.forEach((value, header) => {
      response.headers.set(header, value)
    })

    // 如果超出限流，返回 429
    if (!result.allowed) {
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
  }

  return response
}

/**
 * 中间件配置
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
