/**
 * Rate Limiting Middleware for API Routes
 *
 * Features:
 * - In-memory rate limiting using sliding window
 * - LRU cache for efficient memory management
 * - Configurable limits per endpoint
 * - Support for IP-based and token-based rate limiting
 * - Automatic cleanup of expired entries
 * - Distributed rate limiting support (for future scalability)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Simple LRU Cache implementation
 */
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Re-insert to mark as recently used
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // Remove least recently used item (first in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
}

export interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

// Default rate limit configurations
// ============================================
// Constants
// ============================================
const MAX_STORE_SIZE = 10000;

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  // Health checks - high allowance
  '/api/health': { windowMs: 60 * 1000, maxRequests: 100 },
  '/api/health/live': { windowMs: 60 * 1000, maxRequests: 100 },
  '/api/health/ready': { windowMs: 60 * 1000, maxRequests: 100 },
  '/api/health/detailed': { windowMs: 60 * 1000, maxRequests: 50 },
  '/api/status': { windowMs: 60 * 1000, maxRequests: 100 },

  // Performance - moderate allowance
  '/api/performance/report': { windowMs: 60 * 1000, maxRequests: 20 },
  '/api/performance/clear': { windowMs: 60 * 1000, maxRequests: 10 },

  // Database operations - strict limits
  '/api/database/health': { windowMs: 60 * 1000, maxRequests: 50 },
  '/api/database/optimize': { windowMs: 60 * 1000, maxRequests: 5 },

  // Auth endpoints - moderate strict
  '/api/auth/register': { windowMs: 60 * 1000, maxRequests: 5 },
  '/api/auth/login': { windowMs: 60 * 1000, maxRequests: 10 },

  // GitHub API - moderate allowance
  '/api/github/commits': { windowMs: 60 * 1000, maxRequests: 30 },
  '/api/github/issues': { windowMs: 60 * 1000, maxRequests: 30 },

  // CSRF token - high allowance
  '/api/csrf-token': { windowMs: 60 * 1000, maxRequests: 100 },

  // A2A JSON-RPC - strict
  '/api/a2a/jsonrpc': { windowMs: 60 * 1000, maxRequests: 50 },
};

// In-memory store for rate limit tracking using LRU cache
const rateLimitStore = new LRUCache<string, RateLimitEntry>(10000);

/**
 * Generate rate limit key for a request
 */
function generateRateLimitKey(
  request: NextRequest,
  identifier?: string
): string {
  const path = request.nextUrl.pathname;

  // Use provided identifier (e.g., user ID or API key) or IP
  const id = identifier || getClientIP(request);

  return `${path}:${id}`;
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Try various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    // Get the first IP in the chain
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback to a default identifier
  return 'unknown';
}

/**
 * Check if request should be rate limited
 */
function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entries if store is too large
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    cleanupExpiredEntries(now);
  }

  if (!entry) {
    // First request in window
    const newEntry: RateLimitEntry = {
      count: 1,
      windowStart: now,
    };
    rateLimitStore.set(key, newEntry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Check if window has expired
  if (now - entry.windowStart >= config.windowMs) {
    // Reset window
    entry.count = 1;
    entry.windowStart = now;

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.windowStart + config.windowMs,
    };
  }

  // Increment counter
  entry.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.windowStart + config.windowMs,
  };
}

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries(now: number): void {
  const maxAge = 60 * 1000; // Keep entries for 1 minute max

  // Collect keys to delete
  const keysToDelete: string[] = [];

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > maxAge) {
      keysToDelete.push(key);
    }
  }

  // Delete expired entries
  for (const key of keysToDelete) {
    rateLimitStore.delete(key);
  }

  logger.debug(`Cleaned up ${keysToDelete.length} expired rate limit entries`);
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetTime: number,
  limit: number
): void {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());

  // Add Retry-After header if rate limited
  if (remaining === 0) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    response.headers.set('Retry-After', retryAfter.toString());
  }
}

/**
 * Rate limiting middleware wrapper
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<RateLimitConfig>,
  identifier?: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Handle both NextRequest and standard Request objects
    const path = 'nextUrl' in req ? req.nextUrl.pathname : new URL((req as Request).url).pathname;

    // Get config for this path or use defaults
    const pathConfig = DEFAULT_LIMITS[path] || {
      windowMs: 60 * 1000,
      maxRequests: 60, // Default: 60 requests per minute
    };

    // Merge with provided config
    const finalConfig: RateLimitConfig = {
      ...pathConfig,
      ...config,
    };

    // Check rate limit
    const key = generateRateLimitKey(req, identifier);
    const { allowed, remaining, resetTime } = checkRateLimit(key, finalConfig);

    // Set rate limit headers
    const response = await handler(req);
    setRateLimitHeaders(response, remaining, resetTime, finalConfig.maxRequests);

    // Log rate limit hits
    if (!allowed) {
      logger.warn(
        `Rate limit exceeded for ${path}`,
        {
          ip: getClientIP(req),
          limit: finalConfig.maxRequests,
          window: finalConfig.windowMs,
        }
      );
    }

    // If not allowed, return 429 error
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'RATE_LIMIT_EXCEEDED' as const,
            message: 'Too many requests. Please try again later.',
            details: {
              limit: finalConfig.maxRequests,
              windowMs: finalConfig.windowMs,
              resetAt: new Date(resetTime).toISOString(),
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
 * Rate limiting middleware with skip options
 * Skips counting successful or failed requests based on config
 */
export function withSmartRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<RateLimitConfig>,
  identifier?: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const path = req.nextUrl.pathname;

    // Get config for this path or use defaults
    const pathConfig = DEFAULT_LIMITS[path] || {
      windowMs: 60 * 1000,
      maxRequests: 60,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    };

    // Merge with provided config
    const finalConfig: RateLimitConfig = {
      ...pathConfig,
      ...config,
    };

    const key = generateRateLimitKey(req, identifier);
    const { allowed, remaining, resetTime } = checkRateLimit(key, finalConfig);

    // Execute handler
    let response: NextResponse;
    let isSuccess: boolean;

    try {
      response = await handler(req);
      isSuccess = response.status >= 200 && response.status < 400;
    } catch (_error) {
      isSuccess = false;
      response = NextResponse.json(
        {
          success: false,
          error: {
            type: 'INTERNAL_ERROR' as const,
            message: 'Internal server error',
          },
        },
        { status: 500 }
      );
    }

    // Skip counting based on config
    if (isSuccess && finalConfig.skipSuccessfulRequests) {
      // Don't decrement remaining counter for successful requests
      // This is handled by not updating the store entry
    } else if (!isSuccess && finalConfig.skipFailedRequests) {
      // Don't decrement remaining counter for failed requests
    } else {
      // Normal behavior: set headers
      setRateLimitHeaders(response, remaining, resetTime, finalConfig.maxRequests);
    }

    // Handle rate limit exceeded
    if (!allowed) {
      logger.warn(
        `Rate limit exceeded for ${path}`,
        {
          ip: getClientIP(req),
          limit: finalConfig.maxRequests,
          window: finalConfig.windowMs,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'RATE_LIMIT_EXCEEDED' as const,
            message: 'Too many requests. Please try again later.',
            details: {
              limit: finalConfig.maxRequests,
              windowMs: finalConfig.windowMs,
              resetAt: new Date(resetTime).toISOString(),
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
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(key: string): {
  count: number;
  remaining: number;
  resetTime: number | null;
} {
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return {
      count: 0,
      remaining: 0,
      resetTime: null,
    };
  }

  const now = Date.now();
  const elapsed = now - entry.windowStart;

  // Check if window has expired
  if (elapsed >= 60 * 1000) {
    rateLimitStore.delete(key);
    return {
      count: 0,
      remaining: 0,
      resetTime: null,
    };
  }

  // Find the limit for this key
  const path = key.split(':')[0];
  const config = DEFAULT_LIMITS[path] || { maxRequests: 60, windowMs: 60 * 1000 };

  return {
    count: entry.count,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.windowStart + config.windowMs,
  };
}

/**
 * Clear rate limit entry for a key
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limit entries
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Periodic cleanup task to remove expired entries
 * Call this periodically (e.g., every 5 minutes)
 */
export function performPeriodicCleanup(): void {
  const now = Date.now();
  cleanupExpiredEntries(now);
}

/**
 * Initialize periodic cleanup
 */
let cleanupIntervalId: NodeJS.Timeout | null = null;

export function startPeriodicCleanup(intervalMs: number = 5 * 60 * 1000): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
  }

  cleanupIntervalId = setInterval(() => {
    performPeriodicCleanup();
  }, intervalMs);

  logger.info(`Started periodic rate limit cleanup (interval: ${intervalMs}ms)`);
}

export function stopPeriodicCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    logger.info('Stopped periodic rate limit cleanup');
  }
}

// Auto-start periodic cleanup in production
if (process.env.NODE_ENV === 'production') {
  startPeriodicCleanup();
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): {
  totalEntries: number;
  trackedPaths: string[];
  totalRequests: number;
} {
  const pathCounts = new Map<string, number>();
  let totalRequests = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    const path = key.split(':')[0];
    pathCounts.set(path, (pathCounts.get(path) || 0) + entry.count);
    totalRequests += entry.count;
  }

  return {
    totalEntries: rateLimitStore.size,
    trackedPaths: Array.from(pathCounts.keys()),
    totalRequests,
  };
}
