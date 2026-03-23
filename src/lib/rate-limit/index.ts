/**
 * Rate Limiting Middleware for API Routes
 *
 * Features:
 * - Sliding window algorithm (precise control)
 * - Token bucket algorithm (burst handling)
 * - Configurable per-endpoint limits
 * - Support for IP-based and token-based limiting
 * - X-RateLimit-* response headers
 * - Event logging for rate limit hits
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { checkSlidingWindow, getSlidingWindowStatus, SlidingWindowConfig } from './sliding-window';
import { checkTokenBucket, getTokenBucketStatus, TokenBucketConfig } from './token-bucket';

/**
 * Rate limiting algorithm type
 */
export type RateLimitAlgorithm = 'sliding-window' | 'token-bucket' | 'hybrid';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  algorithm: RateLimitAlgorithm;
  limit: number; // Maximum requests per window
  window: number; // Time window in seconds

  // Token bucket specific
  burstCapacity?: number; // Maximum burst tokens (token bucket)
  refillRate?: number; // Tokens per second (token bucket)

  // Additional options
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  identifier?: string; // Custom identifier (e.g., user ID, API key)
  keyPrefix?: string; // Custom key prefix for Redis
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
  algorithm: RateLimitAlgorithm;
  currentCount?: number;
  tokensAvailable?: number;
}

/**
 * Rate limit event
 */
export interface RateLimitEvent {
  timestamp: number;
  path: string;
  identifier: string;
  algorithm: RateLimitAlgorithm;
  limit: number;
  window: number;
  exceeded: boolean;
  remaining: number;
  resetTime: number;
  ipAddress: string;
  userAgent?: string;
}

// ============================================
// Default Rate Limit Rules
// ============================================
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  // Health checks - high allowance
  '/api/health': {
    algorithm: 'sliding-window',
    limit: 100,
    window: 60,
  },
  '/api/health/live': {
    algorithm: 'sliding-window',
    limit: 100,
    window: 60,
  },
  '/api/health/ready': {
    algorithm: 'sliding-window',
    limit: 100,
    window: 60,
  },

  // Auth endpoints - moderate strict with token bucket for burst handling
  '/api/auth/login': {
    algorithm: 'token-bucket',
    limit: 10,
    window: 60,
    burstCapacity: 15,
    refillRate: 0.167, // 10 requests per minute = 0.167 per second
  },
  '/api/auth/register': {
    algorithm: 'token-bucket',
    limit: 5,
    window: 60,
    burstCapacity: 8,
    refillRate: 0.083, // 5 requests per minute
  },
  '/api/auth/logout': {
    algorithm: 'sliding-window',
    limit: 20,
    window: 60,
  },
  '/api/auth/refresh': {
    algorithm: 'sliding-window',
    limit: 30,
    window: 60,
  },
  '/api/auth/me': {
    algorithm: 'sliding-window',
    limit: 60,
    window: 60,
  },

  // Tasks API - moderate limits
  '/api/tasks': {
    algorithm: 'sliding-window',
    limit: 50,
    window: 60,
  },

  // Projects API - moderate limits
  '/api/projects': {
    algorithm: 'sliding-window',
    limit: 50,
    window: 60,
  },

  // Default fallback
  '/default': {
    algorithm: 'sliding-window',
    limit: 60,
    window: 60,
  },
};

/**
 * Get rate limit configuration for a path
 */
function getRateLimitConfig(path: string): RateLimitConfig {
  // Exact match first
  if (DEFAULT_LIMITS[path]) {
    return DEFAULT_LIMITS[path];
  }

  // Try prefix match for wildcard paths (e.g., /api/auth/*)
  const pathParts = path.split('/').filter(Boolean);
  for (const [key, config] of Object.entries(DEFAULT_LIMITS)) {
    const keyParts = key.split('/').filter(Boolean);

    // Check if this is a wildcard pattern
    const hasWildcard = keyParts.some(part => part === '*');
    if (!hasWildcard) continue;

    // Match prefix up to wildcard
    let matches = true;
    for (let i = 0; i < keyParts.length; i++) {
      if (keyParts[i] === '*') {
        break;
      }
      if (pathParts[i] !== keyParts[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return config;
    }
  }

  // Fallback to default
  return DEFAULT_LIMITS['/default'];
}

/**
 * Get client identifier
 */
function getClientIdentifier(request: NextRequest, customIdentifier?: string): string {
  if (customIdentifier) {
    return customIdentifier;
  }

  // Try to get from headers (for authenticated requests)
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return `apikey:${apiKey.substring(0, 8)}`;
  }

  // Fallback to IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    return `ip:${forwardedFor.split(',')[0].trim()}`;
  }

  if (realIp) {
    return `ip:${realIp}`;
  }

  return 'ip:unknown';
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Generate rate limit key
 */
function generateRateLimitKey(
  path: string,
  identifier: string,
  algorithm: RateLimitAlgorithm,
  keyPrefix?: string
): string {
  const prefix = keyPrefix || 'ratelimit';
  const algorithmPrefix = algorithm === 'sliding-window' ? 'sw' : 'tb';
  const safePath = path.replace(/\//g, ':');
  return `${prefix}:${algorithmPrefix}:${safePath}:${identifier}`;
}

/**
 * Log rate limit event
 */
function logRateLimitEvent(event: RateLimitEvent): void {
  logger.info('Rate limit event', {
    timestamp: new Date(event.timestamp).toISOString(),
    path: event.path,
    identifier: event.identifier,
    algorithm: event.algorithm,
    limit: event.limit,
    window: event.window,
    exceeded: event.exceeded,
    remaining: event.remaining,
    ipAddress: event.ipAddress,
  });
}

/**
 * Check rate limit using sliding window algorithm
 */
async function checkSlidingWindowLimit(
  key: string,
  limit: number,
  window: number
): Promise<RateLimitResult> {
  const result = await checkSlidingWindow({ key, limit, window });

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
    limit,
    algorithm: 'sliding-window',
    currentCount: result.currentCount,
  };
}

/**
 * Check rate limit using token bucket algorithm
 */
async function checkTokenBucketLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const result = await checkTokenBucket({
    key,
    capacity: config.burstCapacity || config.limit,
    refillRate: config.refillRate || config.limit / config.window,
    window: config.window,
  });

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
    limit: config.limit,
    algorithm: 'token-bucket',
    tokensAvailable: result.tokensAvailable,
  };
}

/**
 * Check rate limit using hybrid algorithm
 * Uses sliding window for steady state and token bucket for bursts
 */
async function checkHybridLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Check both algorithms
  const [swResult, tbResult] = await Promise.all([
    checkSlidingWindow({ key: `${key}:sw`, limit: config.limit, window: config.window }),
    checkTokenBucket({
      key: `${key}:tb`,
      capacity: config.burstCapacity || config.limit * 2,
      refillRate: config.refillRate || config.limit / config.window,
      window: config.window,
    }),
  ]);

  // Allow only if both algorithms allow
  const allowed = swResult.allowed && tbResult.allowed;
  const remaining = Math.min(swResult.remaining, tbResult.remaining);
  const resetTime = Math.max(swResult.resetTime, tbResult.resetTime);

  return {
    allowed,
    remaining,
    resetTime,
    limit: config.limit,
    algorithm: 'hybrid',
    currentCount: swResult.currentCount,
    tokensAvailable: tbResult.tokensAvailable,
  };
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): void {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
  response.headers.set('X-RateLimit-Algorithm', result.algorithm);

  // Add algorithm-specific headers
  if (result.currentCount !== undefined) {
    response.headers.set('X-RateLimit-Current', result.currentCount.toString());
  }

  if (result.tokensAvailable !== undefined) {
    response.headers.set('X-RateLimit-Tokens', result.tokensAvailable.toString());
  }

  // Add Retry-After header if rate limited
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    response.headers.set('Retry-After', retryAfter.toString());
  }
}

/**
 * Rate limiting middleware wrapper
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<RateLimitConfig>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const path = req.nextUrl.pathname;

    // Get rate limit configuration
    const defaultConfig = getRateLimitConfig(path);
    const finalConfig: RateLimitConfig = {
      ...defaultConfig,
      ...config,
    };

    // Generate rate limit key
    const identifier = getClientIdentifier(req, finalConfig.identifier);
    const key = generateRateLimitKey(
      path,
      identifier,
      finalConfig.algorithm,
      finalConfig.keyPrefix
    );

    // Check rate limit
    let result: RateLimitResult;

    switch (finalConfig.algorithm) {
      case 'sliding-window':
        result = await checkSlidingWindowLimit(key, finalConfig.limit, finalConfig.window);
        break;

      case 'token-bucket':
        result = await checkTokenBucketLimit(key, finalConfig);
        break;

      case 'hybrid':
        result = await checkHybridLimit(key, finalConfig);
        break;

      default:
        result = await checkSlidingWindowLimit(key, finalConfig.limit, finalConfig.window);
    }

    // Log rate limit event
    const event: RateLimitEvent = {
      timestamp: Date.now(),
      path,
      identifier,
      algorithm: finalConfig.algorithm,
      limit: finalConfig.limit,
      window: finalConfig.window,
      exceeded: !result.allowed,
      remaining: result.remaining,
      resetTime: result.resetTime,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('user-agent') || undefined,
    };

    logRateLimitEvent(event);

    // Execute handler
    const response = await handler(req);

    // Set rate limit headers
    setRateLimitHeaders(response, result);

    // Handle rate limit exceeded
    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        path,
        identifier,
        limit: finalConfig.limit,
        window: finalConfig.window,
        algorithm: finalConfig.algorithm,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'RATE_LIMIT_EXCEEDED' as const,
            message: 'Too many requests. Please try again later.',
            details: {
              limit: finalConfig.limit,
              windowMs: finalConfig.window * 1000,
              resetAt: new Date(result.resetTime).toISOString(),
              algorithm: finalConfig.algorithm,
            },
          },
        },
        { status: 429 }
      );
    }

    return response;
  };
}

/**
 * Get rate limit status for a path and identifier
 */
export async function getRateLimitStatus(
  path: string,
  identifier?: string,
  customConfig?: Partial<RateLimitConfig>
): Promise<RateLimitResult | null> {
  const config: RateLimitConfig = {
    ...getRateLimitConfig(path),
    ...customConfig,
  };

  const key = generateRateLimitKey(
    path,
    identifier || 'unknown',
    config.algorithm,
    config.keyPrefix
  );

  switch (config.algorithm) {
    case 'sliding-window':
      const swStatus = await getSlidingWindowStatus(key, config.window);
      return {
        allowed: swStatus.count < config.limit,
        remaining: Math.max(0, config.limit - swStatus.count),
        resetTime: swStatus.resetTime,
        limit: config.limit,
        algorithm: 'sliding-window',
        currentCount: swStatus.count,
      };

    case 'token-bucket':
      const tbStatus = await getTokenBucketStatus(key);
      return {
        allowed: (tbStatus.tokens || 0) >= 1,
        remaining: Math.floor(tbStatus.tokens || 0),
        resetTime: Date.now() + config.window * 1000,
        limit: config.limit,
        algorithm: 'token-bucket',
        tokensAvailable: tbStatus.tokens,
      };

    default:
      return null;
  }
}

/**
 * Export default limits for external configuration
 */
export { DEFAULT_LIMITS };
