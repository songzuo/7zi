/**
 * 速率限制中间件
 *
 * 集成到 Next.js API 路由
 * 返回标准的 Rate Limit headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { DistributedRateLimiter, RateLimitResult } from './distributed-rate-limiter';

export interface RateLimitMiddlewareOptions {
  limiter: DistributedRateLimiter;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  skip?: (req: NextRequest) => boolean;
  onLimitReached?: (req: NextRequest, result: RateLimitResult) => void | Promise<void>;
  handler?: (req: NextRequest, result: RateLimitResult) => NextResponse;
}

/**
 * 创建速率限制中间件
 * @param options 选项
 * @returns 中间件函数
 */
export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  return async function rateLimitMiddleware(req: NextRequest) {
    // 检查是否跳过
    if (options.skip && options.skip(req)) {
      return NextResponse.next();
    }

    // 检查速率限制
    const result = await options.limiter.check(req);

    // 创建响应
    let response: NextResponse;

    if (result.allowed) {
      response = NextResponse.next();
    } else {
      // 触发回调
      if (options.onLimitReached) {
        await options.onLimitReached(req, result);
      }

      // 使用自定义处理器或默认错误响应
      if (options.handler) {
        response = options.handler(req, result);
      } else {
        response = createRateLimitExceededResponse(result);
      }

      // 记录失败（如果配置了）
      if (options.skipFailedRequests) {
        await options.limiter.recordFailure(req);
      }
    }

    // 设置 Rate Limit headers
    setRateLimitHeaders(response, result);

    return response;
  };
}

/**
 * 设置 Rate Limit headers
 * @param response NextResponse
 * @param result 速率限制结果
 */
export function setRateLimitHeaders(response: NextResponse, result: RateLimitResult): void {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

  if (!result.allowed && result.retryAfter) {
    response.headers.set('Retry-After', result.retryAfter.toString());
  }
}

/**
 * 创建速率限制超限响应
 * @param result 速率限制结果
 * @returns NextResponse
 */
export function createRateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const data = {
    error: 'Rate limit exceeded',
    message: `Too many requests. Please try again in ${result.retryAfter || 60} seconds.`,
    retryAfter: result.retryAfter,
    resetTime: new Date(result.resetTime).toISOString(),
  };

  return NextResponse.json(data, { status: 429 });
}

/**
 * 创建自定义速率限制超限响应
 * @param message 自定义消息
 * @param statusCode HTTP 状态码（默认 429）
 * @returns 响应生成器
 */
export function createCustomRateLimitResponse(message: string, statusCode: number = 429) {
  return function (req: NextRequest, result: RateLimitResult): NextResponse {
    const data = {
      error: 'Rate limit exceeded',
      message,
      retryAfter: result.retryAfter,
      resetTime: new Date(result.resetTime).toISOString(),
    };

    return NextResponse.json(data, { status: statusCode });
  };
}

/**
 * Next.js API Route 包装器
 * @param handler API 处理函数
 * @param options 速率限制选项
 * @returns 包装后的处理函数
 */
export function withRateLimit<T = any>(
  handler: (req: NextRequest) => Promise<NextResponse<T>> | NextResponse<T>,
  options: RateLimitMiddlewareOptions
) {
  return async function rateLimitedHandler(req: NextRequest): Promise<NextResponse<T>> {
    // 检查是否跳过
    if (options.skip && options.skip(req)) {
      return handler(req);
    }

    // 检查速率限制
    const result = await options.limiter.check(req);

    if (!result.allowed) {
      // 触发回调
      if (options.onLimitReached) {
        await options.onLimitReached(req, result);
      }

      // 创建错误响应
      let response: NextResponse<T>;
      if (options.handler) {
        response = options.handler(req, result) as NextResponse<T>;
      } else {
        response = createRateLimitExceededResponse(result) as NextResponse<T>;
      }

      // 设置 headers
      setRateLimitHeaders(response, result);

      return response;
    }

    try {
      // 执行原始处理函数
      const response = await handler(req);

      // 设置 Rate Limit headers
      setRateLimitHeaders(response, result);

      // 记录成功（如果配置了）
      if (!options.skipSuccessfulRequests) {
        await options.limiter.recordSuccess(req);
      }

      return response;
    } catch (_error) {
      // 记录失败（如果配置了）
      if (options.skipFailedRequests) {
        await options.limiter.recordFailure(req);
      }

      throw error;
    }
  };
}

/**
 * Express.js 中间件适配器
 * @param options 速率限制选项
 * @returns Express 中间件函数
 */
export function expressRateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  return async function (req: any, res: any, next: any) {
    // 检查是否跳过
    if (options.skip && options.skip(req)) {
      return next();
    }

    // 检查速率限制
    const result = await options.limiter.check(req);

    // 设置 Rate Limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      // 触发回调
      if (options.onLimitReached) {
        await options.onLimitReached(req, result);
      }

      // 设置 Retry-After header
      if (result.retryAfter) {
        res.setHeader('Retry-After', result.retryAfter);
      }

      // 返回 429 错误
      const data = {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.retryAfter || 60} seconds.`,
        retryAfter: result.retryAfter,
        resetTime: new Date(result.resetTime).toISOString(),
      };

      return res.status(429).json(data);
    }

    next();
  };
}

/**
 * 速率限制信息装饰器
 * 用于将速率限制信息添加到响应对象
 */
export function withRateLimitInfo(req: NextRequest, result: RateLimitResult) {
  return {
    rateLimit: {
      limit: result.limit,
      remaining: result.remaining,
      reset: result.resetTime,
      allowed: result.allowed,
    },
  };
}
