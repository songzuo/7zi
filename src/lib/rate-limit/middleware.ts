/**
 * API Rate Limit Middleware
 *
 * API 路由专用的限流中间件
 * - 支持 IP 和用户 ID 两种限流维度
 * - 支持环境变量配置
 * - 集成滑动窗口和令牌桶算法
 * - 提供详细的限流响应头
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitEnvConfig, mergeRateLimitConfig, RateLimitEnvironmentConfig } from './config';
import { logger } from '@/lib/logger';
import { verifyJwtToken } from '@/lib/auth';

/**
 * 限流器缓存 - 存储 RateLimiter 实例
 */
const limiterCache = new Map<string, RateLimiter>();

/**
 * 滑动窗口请求缓存 - 存储请求时间戳
 */
const slidingWindowCache = new Map<string, number[]>();

/**
 * 令牌桶缓存 - 存储令牌桶状态
 */
const tokenBucketCache = new Map<string, { tokens: number; capacity: number; lastRefill: number }>();

/**
 * 限流器类
 */
class RateLimiter {
  private config: RateLimitEnvironmentConfig;
  private algorithm: 'sliding-window' | 'token-bucket';
  private path: string;

  constructor(path: string, config: RateLimitEnvironmentConfig) {
    this.path = path;
    this.config = config;

    // 根据路径选择算法
    this.algorithm = this.selectAlgorithm(path);
  }

  /**
   * 根据路径选择限流算法
   */
  private selectAlgorithm(path: string): 'sliding-window' | 'token-bucket' {
    // 认证相关端点使用令牌桶算法（更好的突发处理）
    if (path.includes('/auth/login') ||
        path.includes('/auth/register') ||
        path.includes('/auth/reset-password')) {
      return 'token-bucket';
    }

    // 其他端点使用滑动窗口算法（更精确的控制）
    return 'sliding-window';
  }

  /**
   * 从请求中提取用户 ID
   */
  private async extractUserId(request: NextRequest): Promise<string | null> {
    try {
      // 从 Authorization header 获取 token
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      const context = await verifyJwtToken(token);

      if (context && context.userId) {
        return String(context.userId);
      }

      return null;
    } catch (error) {
      logger.warn('Failed to extract user ID from token', { error });
      return null;
    }
  }

  /**
   * 获取存储的请求时间戳
   */
  private getStorage(key: string): number[] {
    const stored = slidingWindowCache.get(key);
    return stored || [];
  }

  /**
   * 保存存储的请求时间戳
   */
  private saveStorage(key: string, data: number[]): void {
    slidingWindowCache.set(key, data);
  }

  /**
   * 获取令牌桶
   */
  private getTokenBucket(key: string): { tokens: number; capacity: number; lastRefill: number } {
    const stored = tokenBucketCache.get(key);
    return stored || { tokens: 10, capacity: 10, lastRefill: Date.now() };
  }

  /**
   * 保存令牌桶
   */
  private saveTokenBucket(key: string, bucket: { tokens: number; capacity: number; lastRefill: number }): void {
    tokenBucketCache.set(key, bucket);
  }

  /**
   * 从请求中提取 IP 地址
   */
  private extractIP(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    if (realIP) {
      return realIP;
    }

    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    return 'unknown';
  }

  /**
   * 生成限流键
   */
  private async generateKey(request: NextRequest): Promise<string> {
    const ip = this.extractIP(request);
    const userId = await this.extractUserId(request);
    const limitBy = this.config.limitBy;
    const safePath = this.path.replace(/\//g, ':');
    const algorithmPrefix = this.algorithm === 'sliding-window' ? 'sw' : 'tb';

    let identifier: string;

    if (limitBy === 'both' && userId) {
      identifier = `user:${userId}`;
    } else if (limitBy === 'userId' && userId) {
      identifier = `user:${userId}`;
    } else {
      identifier = `ip:${ip}`;
    }

    return `ratelimit:${algorithmPrefix}:${safePath}:${identifier}`;
  }

  /**
   * 检查限流
   */
  async check(request: NextRequest): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter: number;
    algorithm: string;
  }> {
    const key = await this.generateKey(request);
    const now = Date.now();
    const windowMs = this.config.windowMs;
    const windowStart = now - windowMs;

    // 使用内存存储
    const storage = this.getStorage(key);
    const recentRequests = storage.filter((t: number) => t > windowStart);

    if (this.algorithm === 'sliding-window') {
      const allowed = recentRequests.length < this.config.maxRequests;

      if (allowed) {
        recentRequests.push(now);
      }

      this.saveStorage(key, recentRequests);

      const resetTime = recentRequests.length > 0
        ? recentRequests[0] + windowMs
        : now + windowMs;

      const retryAfter = Math.max(0, Math.ceil((resetTime - now) / 1000));

      return {
        allowed,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - recentRequests.length),
        resetTime,
        retryAfter,
        algorithm: 'sliding-window',
      };
    } else {
      // Token bucket 简化实现
      const storageKey = `${key}:bucket`;
      const bucket = this.getTokenBucket(storageKey);

      const refillRate = this.config.maxRequests / (this.config.windowMs / 1000);
      const timePassed = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refillRate * timePassed);
      bucket.lastRefill = now;

      const allowed = bucket.tokens >= 1;
      if (allowed) {
        bucket.tokens -= 1;
      }

      this.saveTokenBucket(storageKey, bucket);

      const resetTime = now + Math.ceil((1 - bucket.tokens) / refillRate * 1000);
      const retryAfter = Math.max(0, Math.ceil((resetTime - now) / 1000));

      return {
        allowed,
        limit: this.config.maxRequests,
        remaining: Math.floor(bucket.tokens),
        resetTime,
        retryAfter,
        algorithm: 'token-bucket',
      };
    }
  }
}

/**
 * 获取或创建限流器
 */
function getLimiter(path: string, config: RateLimitEnvironmentConfig): RateLimiter {
  const cacheKey = `${path}:${JSON.stringify(config)}`;
  let limiter = limiterCache.get(cacheKey);

  if (!limiter) {
    limiter = new RateLimiter(path, config);
    limiterCache.set(cacheKey, limiter);
  }

  return limiter;
}

/**
 * 需要限流的路径模式
 */
const RATE_LIMITED_PATHS = [
  '/api',
];

/**
 * 检查路径是否需要限流
 */
function shouldRateLimit(pathname: string): boolean {
  return RATE_LIMITED_PATHS.some(pattern => pathname.startsWith(pattern));
}

/**
 * 设置限流响应头
 */
function setRateLimitHeaders(
  response: NextResponse,
  result: {
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter: number;
    algorithm: string;
  }
): void {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
  response.headers.set('X-RateLimit-Algorithm', result.algorithm);

  if (!result.remaining) {
    response.headers.set('Retry-After', result.retryAfter.toString());
  }
}

/**
 * API 限流中间件包装器
 *
 * 使用方法:
 * ```ts
 * import { withRateLimit } from '@/lib/rate-limit/middleware';
 *
 * export const GET = withRateLimit(async (req: NextRequest) => {
 *   return NextResponse.json({ message: 'Hello' });
 * });
 * ```
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  customConfig?: Partial<RateLimitEnvironmentConfig>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const path = req.nextUrl.pathname;

    // 检查是否需要限流
    if (!shouldRateLimit(path)) {
      return handler(req);
    }

    // 合并配置
    const config = mergeRateLimitConfig(customConfig);

    // 获取限流器
    const limiter = getLimiter(path, config);

    // 检查限流
    const result = await limiter.check(req);

    // 记录限流事件
    logger.info('Rate limit check', {
      path,
      allowed: result.allowed,
      remaining: result.remaining,
      algorithm: result.algorithm,
      limit: result.limit,
    });

    // 如果超出限流，返回 429
    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        path,
        algorithm: result.algorithm,
        limit: result.limit,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            details: {
              limit: result.limit,
              windowMs: config.windowMs,
              resetAt: new Date(result.resetTime).toISOString(),
              retryAfter: result.retryAfter,
              algorithm: result.algorithm,
            },
          },
        },
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': result.retryAfter.toString(),
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            'X-RateLimit-Algorithm': result.algorithm,
          },
        }
      );
    }

    // 执行原始处理器
    const response = await handler(req);

    // 添加限流头
    setRateLimitHeaders(response, result);

    return response;
  };
}

/**
 * 中间件配置
 *
 * 使用在 Next.js middleware.ts 中
 */
export interface MiddlewareConfig {
  /**
   * 启用限流
   */
  enabled?: boolean;

  /**
   * 跳过的路径模式
   */
  skipPaths?: string[];

  /**
   * 自定义限流配置
   */
  rateLimitConfig?: Partial<RateLimitEnvironmentConfig>;
}

/**
 * Next.js 中间件函数
 *
 * 使用方法:
 * 在 middleware.ts 中:
 * ```ts
 * import { createRateLimitMiddleware } from '@/lib/rate-limit/middleware';
 *
 * export const middleware = createRateLimitMiddleware({
 *   enabled: true,
 *   skipPaths: ['/_next', '/static', '/favicon.ico'],
 * });
 *
 * export const config = {
 *   matcher: [
 *     '/((?!_next/static|_next/image|favicon.ico).*)',
 *   ],
 * };
 * ```
 */
export function createRateLimitMiddleware(middlewareConfig: MiddlewareConfig = {}) {
  const {
    enabled = true,
    skipPaths = ['/_next', '/static', '/favicon.ico', '/images'],
    rateLimitConfig,
  } = middlewareConfig;

  return async (req: NextRequest): Promise<NextResponse> => {
    const path = req.nextUrl.pathname;

    // 检查是否启用限流
    if (!enabled) {
      return NextResponse.next();
    }

    // 检查是否跳过路径
    if (skipPaths.some(pattern => path.startsWith(pattern))) {
      return NextResponse.next();
    }

    // 检查是否需要限流
    if (!shouldRateLimit(path)) {
      return NextResponse.next();
    }

    // 合并配置
    const config = mergeRateLimitConfig(rateLimitConfig);

    // 获取限流器
    const limiter = getLimiter(path, config);

    // 检查限流
    const result = await limiter.check(req);

    // 创建响应
    const response = NextResponse.next();

    // 添加限流头
    setRateLimitHeaders(response, result);

    // 如果超出限流，返回 429
    if (!result.allowed) {
      logger.warn('Rate limit exceeded in middleware', {
        path,
        algorithm: result.algorithm,
        limit: result.limit,
      });

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            type: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            details: {
              limit: result.limit,
              windowMs: config.windowMs,
              resetAt: new Date(result.resetTime).toISOString(),
              retryAfter: result.retryAfter,
              algorithm: result.algorithm,
            },
          },
        }),
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': result.retryAfter.toString(),
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            'X-RateLimit-Algorithm': result.algorithm,
          },
        }
      );
    }

    return response;
  };
}
