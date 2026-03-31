/**
 * Brute Force Protection Middleware
 *
 * Provides comprehensive protection against brute force attacks on authentication endpoints:
 * - IP-based rate limiting with exponential backoff
 * - Account lockout after multiple failed attempts
 * - Failed attempt tracking with time-based decay
 * - CAPTCHA requirement after threshold
 * - Logging and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Failed attempt record
 */
interface FailedAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil: number | null;
  requireCaptcha: boolean;
}

/**
 * Brute force protection configuration
 */
export interface BruteForceConfig {
  // Maximum failed attempts before lockout
  maxAttempts: number;

  // Lockout duration in milliseconds (multiplied by attempt count)
  baseLockoutDuration: number;

  // Time window to track attempts (in milliseconds)
  attemptWindow: number;

  // Threshold after which to require CAPTCHA
  captchaThreshold: number;

  // Whether to track by IP only or also by account
  trackByAccount?: boolean;
}

/**
 * Default configurations for different endpoints
 */
const DEFAULT_CONFIGS: Record<string, BruteForceConfig> = {
  '/api/auth/login': {
    maxAttempts: 5,
    baseLockoutDuration: 5 * 60 * 1000, // 5 minutes
    attemptWindow: 15 * 60 * 1000, // 15 minutes
    captchaThreshold: 3,
    trackByAccount: true,
  },
  '/api/auth/register': {
    maxAttempts: 10,
    baseLockoutDuration: 10 * 60 * 1000, // 10 minutes
    attemptWindow: 60 * 60 * 1000, // 1 hour
    captchaThreshold: 5,
    trackByAccount: false, // Only track by IP for registration
  },
  '/api/auth/refresh': {
    maxAttempts: 10,
    baseLockoutDuration: 5 * 60 * 1000, // 5 minutes
    attemptWindow: 60 * 60 * 1000, // 1 hour
    captchaThreshold: 7,
    trackByAccount: false,
  },
  '/api/auth/reset-password': {
    maxAttempts: 5,
    baseLockoutDuration: 30 * 60 * 1000, // 30 minutes
    attemptWindow: 60 * 60 * 1000, // 1 hour
    captchaThreshold: 3,
    trackByAccount: true,
  },
};

// In-memory store for failed attempts
// In production, this should be replaced with Redis or similar
const failedAttemptsStore = new Map<string, FailedAttempt>();

/**
 * Get client IP address from request
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
 * Generate a key for tracking attempts
 */
function generateKey(
  request: NextRequest,
  identifier?: string,
  trackByAccount?: boolean
): string {
  const ip = getClientIP(request);
  const path = request.nextUrl.pathname;

  if (trackByAccount && identifier) {
    return `${path}:account:${identifier}`;
  }

  return `${path}:ip:${ip}`;
}

/**
 * Get current timestamp
 */
function now(): number {
  return Date.now();
}

/**
 * Check if attempts should be reset based on time window
 */
function shouldResetAttempts(attempt: FailedAttempt, config: BruteForceConfig): boolean {
  return now() - attempt.lastAttempt > config.attemptWindow;
}

/**
 * Get lockout duration based on attempt count
 */
function getLockoutDuration(count: number, config: BruteForceConfig): number {
  // Exponential backoff: 2^(count-1) * baseLockoutDuration
  return Math.min(
    Math.pow(2, count - 1) * config.baseLockoutDuration,
    24 * 60 * 60 * 1000 // Max 24 hours
  );
}

/**
 * Check if request is blocked by brute force protection
 */
export function checkBruteForceProtection(
  request: NextRequest,
  config: BruteForceConfig,
  identifier?: string
): {
  blocked: boolean;
  attempt: FailedAttempt | null;
  reason?: string;
  retryAfter?: number;
  requireCaptcha: boolean;
} {
  const key = generateKey(request, identifier, config.trackByAccount);
  const attempt = failedAttemptsStore.get(key);

  // No previous attempts
  if (!attempt) {
    return {
      blocked: false,
      attempt: null,
      requireCaptcha: false,
    };
  }

  // Reset if window expired
  if (shouldResetAttempts(attempt, config)) {
    failedAttemptsStore.delete(key);
    return {
      blocked: false,
      attempt: null,
      requireCaptcha: false,
    };
  }

  // Check if currently locked out
  if (attempt.lockedUntil && attempt.lockedUntil > now()) {
    const retryAfter = Math.ceil((attempt.lockedUntil - now()) / 1000);
    return {
      blocked: true,
      attempt,
      reason: 'Account locked due to too many failed attempts',
      retryAfter,
      requireCaptcha: true,
    };
  }

  // Check if lockout has expired
  if (attempt.lockedUntil && attempt.lockedUntil <= now()) {
    attempt.lockedUntil = null;
    attempt.count = 0; // Reset count after lockout expires
  }

  // Check if CAPTCHA is required
  const requireCaptcha = attempt.count >= config.captchaThreshold;

  return {
    blocked: false,
    attempt,
    requireCaptcha,
  };
}

/**
 * Record a failed attempt
 */
export function recordFailedAttempt(
  request: NextRequest,
  config: BruteForceConfig,
  identifier?: string
): {
  blocked: boolean;
  lockoutUntil?: number;
  retryAfter?: number;
  attemptCount: number;
} {
  const key = generateKey(request, identifier, config.trackByAccount);
  let attempt = failedAttemptsStore.get(key);

  if (!attempt) {
    attempt = {
      count: 0,
      firstAttempt: now(),
      lastAttempt: now(),
      lockedUntil: null,
      requireCaptcha: false,
    };
    failedAttemptsStore.set(key, attempt);
  }

  // Increment attempt count
  attempt.count++;
  attempt.lastAttempt = now();

  // Check if should lock out
  if (attempt.count >= config.maxAttempts) {
    const lockoutDuration = getLockoutDuration(attempt.count, config);
    attempt.lockedUntil = now() + lockoutDuration;

    logger.warn('Brute force protection: Account locked', {
      ip: getClientIP(request),
      identifier,
      path: request.nextUrl.pathname,
      attemptCount: attempt.count,
      lockoutDuration,
      lockoutUntil: new Date(attempt.lockedUntil).toISOString(),
    });

    return {
      blocked: true,
      lockoutUntil: attempt.lockedUntil,
      retryAfter: Math.ceil(lockoutDuration / 1000),
      attemptCount: attempt.count,
    };
  }

  // Check if CAPTCHA should be required
  if (attempt.count >= config.captchaThreshold) {
    attempt.requireCaptcha = true;

    logger.info('Brute force protection: CAPTCHA required', {
      ip: getClientIP(request),
      identifier,
      path: request.nextUrl.pathname,
      attemptCount: attempt.count,
    });
  }

  return {
    blocked: false,
    attemptCount: attempt.count,
  };
}

/**
 * Clear failed attempts after successful authentication
 */
export function clearFailedAttempts(
  request: NextRequest,
  config: BruteForceConfig,
  identifier?: string
): void {
  const key = generateKey(request, identifier, config.trackByAccount);
  failedAttemptsStore.delete(key);
}

/**
 * Get current status of brute force protection
 */
export function getBruteForceStatus(
  request: NextRequest,
  config: BruteForceConfig,
  identifier?: string
): {
  attemptCount: number;
  remainingAttempts: number;
  lockedUntil: number | null;
  requireCaptcha: boolean;
} {
  const key = generateKey(request, identifier, config.trackByAccount);
  const attempt = failedAttemptsStore.get(key);

  if (!attempt || shouldResetAttempts(attempt, config)) {
    return {
      attemptCount: 0,
      remainingAttempts: config.maxAttempts,
      lockedUntil: null,
      requireCaptcha: false,
    };
  }

  return {
    attemptCount: attempt.count,
    remainingAttempts: Math.max(0, config.maxAttempts - attempt.count),
    lockedUntil: attempt.lockedUntil,
    requireCaptcha: attempt.requireCaptcha,
  };
}

/**
 * Middleware wrapper for brute force protection
 */
export function withBruteForceProtection<T = unknown>(
  handler: (
    request: NextRequest,
    context: {
      config: BruteForceConfig;
      identifier?: string;
      requireCaptcha: boolean;
    }
  ) => Promise<NextResponse>,
  config?: Partial<BruteForceConfig>,
  extractIdentifier?: (request: NextRequest) => Promise<string | undefined>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const path = request.nextUrl.pathname;
    const baseConfig = DEFAULT_CONFIGS[path] || {
      maxAttempts: 10,
      baseLockoutDuration: 10 * 60 * 1000,
      attemptWindow: 60 * 60 * 1000,
      captchaThreshold: 5,
      trackByAccount: false,
    };

    const finalConfig: BruteForceConfig = {
      ...baseConfig,
      ...config,
    };

    // Extract identifier (e.g., email, username) from request
    const identifier = extractIdentifier
      ? await extractIdentifier(request)
      : undefined;

    // Check if blocked
    const check = checkBruteForceProtection(request, finalConfig, identifier);

    if (check.blocked) {
      logger.warn('Brute force protection: Request blocked', {
        ip: getClientIP(request),
        path,
        identifier,
        reason: check.reason,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'TOO_MANY_ATTEMPTS',
            message: 'Too many failed attempts. Please try again later.',
            details: {
              retryAfter: check.retryAfter,
              lockedUntil: check.attempt?.lockedUntil
                ? new Date(check.attempt.lockedUntil).toISOString()
                : undefined,
            },
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': check.retryAfter?.toString() || '3600',
            'X-RateLimit-Limit': finalConfig.maxAttempts.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Execute handler
    let response: NextResponse;
    let isSuccess: boolean;

    try {
      response = await handler(request, {
        config: finalConfig,
        identifier,
        requireCaptcha: check.requireCaptcha,
      });
      isSuccess = response.status >= 200 && response.status < 400;
    } catch (_error) {
      isSuccess = false;
      response = NextResponse.json(
        {
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'Internal server error',
          },
        },
        { status: 500 }
      );
    }

    // Record failed attempt or clear on success
    if (!isSuccess) {
      const result = recordFailedAttempt(request, finalConfig, identifier);
      if (result.blocked) {
        return NextResponse.json(
          {
            success: false,
            error: {
              type: 'TOO_MANY_ATTEMPTS',
              message: 'Too many failed attempts. Account has been temporarily locked.',
              details: {
                retryAfter: result.retryAfter,
                lockoutDuration: result.lockoutUntil
                  ? Math.ceil((result.lockoutUntil - now()) / 1000)
                  : undefined,
              },
            },
          },
          {
            status: 429,
            headers: {
              'Retry-After': result.retryAfter?.toString() || '3600',
              'X-RateLimit-Limit': finalConfig.maxAttempts.toString(),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }
    } else if (identifier && finalConfig.trackByAccount) {
      // Clear attempts on successful authentication
      clearFailedAttempts(request, finalConfig, identifier);
    }

    // Add brute force status headers
    const status = getBruteForceStatus(request, finalConfig, identifier);
    response.headers.set('X-Auth-Attempts-Remaining', status.remainingAttempts.toString());
    response.headers.set('X-Auth-Require-Captcha', status.requireCaptcha.toString());

    return response;
  };
}

/**
 * Cleanup function to remove expired entries
 * Call this periodically (e.g., every 5 minutes)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, attempt] of failedAttemptsStore.entries()) {
    // Check if lockout has expired
    if (attempt.lockedUntil && attempt.lockedUntil <= now) {
      attempt.lockedUntil = null;
    }

    // Check if attempt window has expired
    if (now - attempt.lastAttempt > 24 * 60 * 60 * 1000) {
      // Remove entries older than 24 hours
      failedAttemptsStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired brute force protection entries`);
  }
}

/**
 * Get statistics
 */
export function getBruteForceStats(): {
  totalTracked: number;
  lockedCount: number;
  captchaRequiredCount: number;
  entriesByPath: Record<string, number>;
} {
  let lockedCount = 0;
  let captchaRequiredCount = 0;
  const entriesByPath: Record<string, number> = {};

  for (const [key, attempt] of failedAttemptsStore.entries()) {
    const path = key.split(':')[0];
    entriesByPath[path] = (entriesByPath[path] || 0) + 1;

    if (attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
      lockedCount++;
    }

    if (attempt.requireCaptcha) {
      captchaRequiredCount++;
    }
  }

  return {
    totalTracked: failedAttemptsStore.size,
    lockedCount,
    captchaRequiredCount,
    entriesByPath,
  };
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
