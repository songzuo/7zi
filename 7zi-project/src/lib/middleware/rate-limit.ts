/**
 * Rate Limiting Middleware
 * 限流中间件，防止 API 滥用
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitOptions {
  windowMs: number;      // 时间窗口 (毫秒)
  maxRequests: number;    // 最大请求数
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// ============================================================================
// In-Memory Store
// ============================================================================

interface RateLimitStoreItem {
  count: number;
  resetAt: number;
}

class InMemoryRateLimitStore {
  private store = new Map<string, RateLimitStoreItem>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  get(key: string): RateLimitStoreItem | undefined {
    return this.store.get(key);
  }

  set(key: string, item: RateLimitStoreItem): void {
    this.store.set(key, item);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// ============================================================================
// Default Store
// ============================================================================

const defaultStore = new InMemoryRateLimitStore();

// ============================================================================
// Rate Limit Middleware
// ============================================================================

/**
 * 创建限流中间件
 */
export function withRateLimit<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options: RateLimitOptions
): (...args: T) => Promise<NextResponse> {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
  } = options;

  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    const key = keyGenerator(request);
    const now = Date.now();

    // Get current rate limit info
    let item = defaultStore.get(key);

    // Reset if window expired
    if (!item || item.resetAt < now) {
      item = {
        count: 0,
        resetAt: now + windowMs,
      };
      defaultStore.set(key, item);
    }

    // Check if limit exceeded
    if (item.count >= maxRequests) {
      const resetIn = Math.ceil((item.resetAt - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please try again in ${resetIn} seconds.`,
          },
          retryAfter: resetIn,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(item.resetAt).toISOString(),
            'Retry-After': resetIn.toString(),
          },
        }
      );
    }

    // Increment counter
    item.count++;
    defaultStore.set(key, item);

    // Call handler
    const response = await handler(...args);

    // Add rate limit headers
    const remaining = maxRequests - item.count;
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(item.resetAt).toISOString());

    return response;
  };
}

/**
 * 默认 key 生成器：使用 IP 地址
 */
function defaultKeyGenerator(request: NextRequest): string {
  // Try X-Forwarded-For header first (for proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Fall back to CF-Connecting-IP (Cloudflare)
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  // Fall back to remote address (not available in Edge)
  return 'unknown';
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 检查速率限制状态
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const item = defaultStore.get(key);

  // Reset if window expired
  if (!item || item.resetAt < now) {
    return {
      success: true,
      limit: options.maxRequests,
      remaining: options.maxRequests,
      reset: new Date(now + options.windowMs),
    };
  }

  const remaining = Math.max(0, options.maxRequests - item.count);

  return {
    success: item.count < options.maxRequests,
    limit: options.maxRequests,
    remaining,
    reset: new Date(item.resetAt),
    retryAfter: remaining === 0 ? Math.ceil((item.resetAt - now) / 1000) : undefined,
  };
}

/**
 * 重置速率限制
 */
export function resetRateLimit(key: string): void {
  defaultStore.delete(key);
}

/**
 * 获取存储统计
 */
export function getStoreStats(): { size: number } {
  return {
    size: defaultStore.size(),
  };
}

/**
 * 清空存储
 */
export function clearStore(): void {
  defaultStore.clear();
}
