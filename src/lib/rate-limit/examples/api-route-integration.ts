/**
 * API 路由集成示例
 *
 * 展示如何在 Next.js API 路由中使用速率限制
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  DistributedRateLimiter,
  KeyGenerators,
  createRateLimitMiddleware,
  withRateLimit as withEnhancedRateLimit,
  PresetConfigs,
  RedisAdapter,
  type RateLimitResult,
} from '@/lib/rate-limit'

// ============================================================
// 示例 1: 基本使用 - 内存模式
// ============================================================

// 创建速率限制器实例
const loginLimiter = new DistributedRateLimiter({
  windowMs: 60000, // 1 分钟
  maxRequests: 5, // 5 请求/分钟
  algorithm: 'sliding-window',
  keyGenerator: KeyGenerators.byIP,
})

export async function POST_login_basic(req: NextRequest) {
  const result = await loginLimiter.check(req)

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Please try again in ${result.retryAfter} seconds`,
      },
      { status: 429 }
    )
  }

  // 处理登录逻辑
  return NextResponse.json({ success: true })
}

// ============================================================
// 示例 2: 使用 withRateLimit 包装器
// ============================================================

const registerLimiter = new DistributedRateLimiter({
  windowMs: 60000,
  maxRequests: 3,
  algorithm: 'sliding-window',
  keyGenerator: KeyGenerators.byIP,
})

export const POST_register = withEnhancedRateLimit(
  async (req: NextRequest) => {
    // 处理注册逻辑
    return NextResponse.json({ success: true })
  },
  {
    limiter: registerLimiter,
    onLimitReached: (req: NextRequest, result: RateLimitResult) => {
      console.warn(`Rate limit exceeded for IP: ${KeyGenerators.byIP(req)}`)
    },
  }
)

// ============================================================
// 示例 3: Redis 分布式模式
// ============================================================

// 创建 Redis 适配器
const redisAdapter = new RedisAdapter({
  keyPrefix: 'rate-limit',
  defaultTTL: 3600,
})

// 连接 Redis (通常在应用启动时调用)
async function initRedis() {
  await redisAdapter.connect({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  })
}

// 创建分布式速率限制器
const apiLimiter = new DistributedRateLimiter(
  {
    windowMs: 60000,
    maxRequests: 100,
    algorithm: 'token-bucket',
    keyGenerator: KeyGenerators.byUser,
  },
  redisAdapter
)

export async function GET_protected_api(req: NextRequest) {
  const result = await apiLimiter.check(req)

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
      },
      { status: 429 }
    )
  }

  // 处理 API 请求
  return NextResponse.json({ data: 'protected' })
}

// ============================================================
// 示例 4: 多级别限制（用户 + IP）
// ============================================================

const userLimiter = new DistributedRateLimiter({
  ...PresetConfigs.moderate,
  keyGenerator: KeyGenerators.byUser,
})

const ipLimiter = new DistributedRateLimiter({
  ...PresetConfigs.lenient,
  keyGenerator: KeyGenerators.byIP,
})

export async function POST_multi_level_limit(req: NextRequest) {
  // 先检查 IP 限制
  const ipResult = await ipLimiter.check(req)
  if (!ipResult.allowed) {
    return NextResponse.json(
      { error: 'IP rate limit exceeded', retryAfter: ipResult.retryAfter },
      { status: 429 }
    )
  }

  // 再检查用户限制
  const userResult = await userLimiter.check(req)
  if (!userResult.allowed) {
    return NextResponse.json(
      { error: 'User rate limit exceeded', retryAfter: userResult.retryAfter },
      { status: 429 }
    )
  }

  // 处理请求
  return NextResponse.json({ success: true })
}

// ============================================================
// 示例 5: 使用中间件模式
// ============================================================

const uploadLimiter = new DistributedRateLimiter({
  windowMs: 3600000, // 1 小时
  maxRequests: 10,
  algorithm: 'sliding-window',
  keyGenerator: KeyGenerators.byUser,
})

export async function POST_upload(req: NextRequest) {
  // 跳过管理员的速率限制
  if (req.headers.get('x-admin') === 'true') {
    return NextResponse.json({ success: true, message: 'File uploaded (admin bypass)' })
  }

  const result = await uploadLimiter.check(req)

  if (!result.allowed) {
    console.error('Upload rate limit exceeded', {
      user: KeyGenerators.byUser(req),
      remaining: result.remaining,
      resetTime: result.resetTime,
    })
    return NextResponse.json(
      {
        error: 'Upload limit exceeded',
        message: 'You can only upload 10 files per hour',
        retryAfter: result.retryAfter,
      },
      { status: 429 }
    )
  }

  // 处理文件上传
  return NextResponse.json({ success: true, message: 'File uploaded' })
}

// ============================================================
// 示例 6: 自定义键生成器
// ============================================================

// 基于用户角色和 API 路径的组合限制
const customKeyGenerator = (req: NextRequest): string => {
  const userId = req.headers.get('x-user-id') || 'anonymous'
  const role = req.headers.get('x-user-role') || 'guest'
  const path = new URL(req.url).pathname

  return `${role}:${userId}:${path}`
}

const customLimiter = new DistributedRateLimiter({
  windowMs: 60000,
  maxRequests: 50,
  algorithm: 'token-bucket',
  keyGenerator: customKeyGenerator,
})

export async function GET_custom_limit(req: NextRequest) {
  const result = await customLimiter.check(req)

  if (!result.allowed) {
    return NextResponse.json({ error: 'Custom rate limit exceeded' }, { status: 429 })
  }

  return NextResponse.json({ success: true })
}

// ============================================================
// 示例 7: 跳过成功/失败请求
// ============================================================

const paymentLimiter = new DistributedRateLimiter({
  windowMs: 60000,
  maxRequests: 10,
  algorithm: 'sliding-window',
  keyGenerator: KeyGenerators.byUser,
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // 失败请求不计入限制
})

export async function POST_payment(req: NextRequest) {
  const result = await paymentLimiter.check(req)

  if (!result.allowed) {
    return NextResponse.json({ error: 'Payment rate limit exceeded' }, { status: 429 })
  }

  try {
    // 处理支付逻辑
    const success = Math.random() > 0.5

    if (!success) {
      // 记录失败请求
      await paymentLimiter.recordFailure(req)
      return NextResponse.json({ error: 'Payment failed' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // 记录失败请求
    await paymentLimiter.recordFailure(req)
    throw error
  }
}

// ============================================================
// 示例 8: 完整的 API 路由配置
// ============================================================

// 创建不同场景的限制器
const limiters = {
  // 认证接口 - 严格限制
  auth: new DistributedRateLimiter({
    ...PresetConfigs.strict,
    keyGenerator: KeyGenerators.byIP,
  }),

  // 敏感操作 - 严格限制
  sensitive: new DistributedRateLimiter({
    ...PresetConfigs.strict,
    algorithm: 'token-bucket',
    keyGenerator: KeyGenerators.byUser,
  }),

  // 普通 API - 中等限制
  api: new DistributedRateLimiter({
    ...PresetConfigs.moderate,
    keyGenerator: KeyGenerators.byUser,
  }),

  // 公开 API - 每日限制
  public: new DistributedRateLimiter({
    ...PresetConfigs.daily,
    keyGenerator: KeyGenerators.byIP,
  }),
}

// 路由速率限制映射
const routeLimiters: Record<string, DistributedRateLimiter> = {
  '/api/auth/login': limiters.auth,
  '/api/auth/register': limiters.auth,
  '/api/auth/forgot-password': limiters.auth,
  '/api/payments/': limiters.sensitive,
  '/api/withdrawals/': limiters.sensitive,
  '/api/public/': limiters.public,
}

// 统一速率限制中间件
export async function rateLimitMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const path = new URL(req.url).pathname

  // 查找匹配的限制器
  let limiter: DistributedRateLimiter | null = null
  for (const [pattern, l] of Object.entries(routeLimiters)) {
    if (path.startsWith(pattern) || path === pattern) {
      limiter = l
      break
    }
  }

  // 没有匹配的限制器，使用默认
  if (!limiter) {
    limiter = limiters.api
  }

  const result = await limiter.check(req)

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
        resetTime: new Date(result.resetTime).toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': result.retryAfter?.toString() || '60',
        },
      }
    )
  }

  return null // 继续处理请求
}

// ============================================================
// 类型定义
// ============================================================

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REDIS_HOST?: string
      REDIS_PORT?: string
      REDIS_PASSWORD?: string
      REDIS_DB?: string
    }
  }
}
