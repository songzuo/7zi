/**
 * API 限流中间件
 * 支持基于 IP 和用户 ID 的限流
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
  keyGenerator?: (request: NextRequest) => string; // 自定义键生成器
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// 内存存储（生产环境应使用 Redis）
const rateLimitStore = new Map<string, RateLimitStore>();

/**
 * 清理存储（测试用）
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

// 清理过期记录的定时器
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // 每分钟清理一次
}

/**
 * 默认键生成器：使用 IP 地址
 */
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}

/**
 * 创建限流中间件
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyGenerator = defaultKeyGenerator } = config;

  return async function rateLimiter(
    request: NextRequest
  ): Promise<NextResponse | null> {
    const key = keyGenerator(request);
    const now = Date.now();

    // 获取或创建限流记录
    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // 增加请求计数
    record.count++;
    rateLimitStore.set(key, record);

    // 计算剩余请求
    const remaining = Math.max(0, maxRequests - record.count);
    const resetTimeSeconds = Math.ceil((record.resetTime - now) / 1000);

    // 设置响应头
    const headers = {
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTimeSeconds.toString(),
    };

    // 超过限制
    if (record.count > maxRequests) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            retryAfter: resetTimeSeconds,
          },
        },
        { status: 429, headers }
      );
    }

    // 返回 null 表示通过限流检查
    return null;
  };
}

/**
 * 预设配置
 */
export const rateLimitPresets = {
  // 严格：每分钟 10 次
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // 标准：每分钟 60 次
  standard: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
  // 宽松：每分钟 120 次
  relaxed: {
    windowMs: 60 * 1000,
    maxRequests: 120,
  },
  // 认证端点：每分钟 5 次
  auth: {
    windowMs: 60 * 1000,
    maxRequests: 5,
  },
};

/**
 * 应用于 API 路由的限流装饰器
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  preset: keyof typeof rateLimitPresets = 'standard'
) {
  const limiter = createRateLimiter(rateLimitPresets[preset]);

  return async function (request: NextRequest): Promise<NextResponse> {
    const rateLimitResponse = await limiter(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(request);
  };
}
