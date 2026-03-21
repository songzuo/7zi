/**
 * User-Based Rate Limiting (JWT Token)
 *
 * Features:
 * - Rate limiting by authenticated user ID
 * - Different limits for different user roles
 * - Support for API key and JWT token identification
 * - Per-user quota tracking
 * - Usage statistics per user
 */

import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

export interface UserRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  role?: string;
}

export interface UserRateLimitEntry {
  count: number;
  windowStart: number;
  role?: string;
  userId: string;
}

// ============================================
// Constants
// ============================================

// Role-based rate limits
const ROLE_BASED_LIMITS: Record<string, UserRateLimitConfig> = {
  admin: { windowMs: 60 * 1000, maxRequests: 1000 },
  moderator: { windowMs: 60 * 1000, maxRequests: 500 },
  user: { windowMs: 60 * 1000, maxRequests: 60 },
  guest: { windowMs: 60 * 1000, maxRequests: 30 },
  agent: { windowMs: 60 * 1000, maxRequests: 200 },
  worker: { windowMs: 60 * 1000, maxRequests: 100 },
  executor: { windowMs: 60 * 1000, maxRequests: 80 },
};

// In-memory store for user-based rate limiting
const userRateLimitStore = new Map<string, UserRateLimitEntry>();

// ============================================
// Utility Functions
// ============================================

/**
 * Extract user ID from JWT token
 */
export async function getUserIdFromToken(token: string): Promise<{ userId: string; role?: string } | null> {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || process.env.AGENT_ENCRYPTION_SECRET || 'fallback-secret'
    );

    const { payload } = await jwtVerify(token, secret);

    // Try different payload structures
    const userId = payload.userId || payload.sub || payload.id;
    const role = payload.role || payload.user?.role;

    if (!userId) {
      return null;
    }

    return { userId, role };
  } catch (error) {
    logger.debug('Failed to verify JWT token', { error });
    return null;
  }
}

/**
 * Extract user ID from API key header
 */
export function getUserIdFromApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  // Check for Bearer token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // Check if it's an API key format
    if (token.startsWith('sk_agent_')) {
      // For API keys, we'd need to look up the user ID
      // This is a simplified version - in production, query the database
      return token.substring(9); // Extract unique part for now
    }

    return null; // It's a JWT, handled separately
  }

  // Check for X-API-Key header
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && apiKey.startsWith('sk_agent_')) {
    return apiKey.substring(9);
  }

  return null;
}

/**
 * Get user identifier from request
 * Priority: JWT token > API key > null
 */
export async function getUserIdentifier(request: NextRequest): Promise<{
  userId: string | null;
  role?: string;
  source: 'jwt' | 'apikey' | 'none';
}> {
  // Try JWT token first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // Check if it's an API key
    if (token.startsWith('sk_agent_')) {
      return {
        userId: getUserIdFromApiKey(request),
        source: 'apikey',
      };
    }

    // It's a JWT token
    const jwtResult = await getUserIdFromToken(token);
    if (jwtResult) {
      return {
        userId: jwtResult.userId,
        role: jwtResult.role,
        source: 'jwt',
      };
    }
  }

  // Try X-API-Key header
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && apiKey.startsWith('sk_agent_')) {
    return {
      userId: getUserIdFromApiKey(request),
      source: 'apikey',
    };
  }

  // No user identifier found
  return { userId: null, source: 'none' };
}

/**
 * Get rate limit config for a user based on role
 */
export function getUserRateLimitConfig(role?: string): UserRateLimitConfig {
  if (role && ROLE_BASED_LIMITS[role]) {
    return ROLE_BASED_LIMITS[role];
  }

  // Default to 'user' role limits
  return ROLE_BASED_LIMITS.user;
}

/**
 * Check user rate limit
 */
export function checkUserRateLimit(
  userId: string,
  role?: string,
  customConfig?: Partial<UserRateLimitConfig>
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
} {
  const config = customConfig ? { ...getUserRateLimitConfig(role), ...customConfig } : getUserRateLimitConfig(role);
  const now = Date.now();
  const entry = userRateLimitStore.get(userId);

  if (!entry) {
    // First request in window
    const newEntry: UserRateLimitEntry = {
      count: 1,
      windowStart: now,
      role,
      userId,
    };
    userRateLimitStore.set(userId, newEntry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
      limit: config.maxRequests,
    };
  }

  // Check if window has expired
  if (now - entry.windowStart >= config.windowMs) {
    // Reset window
    entry.count = 1;
    entry.windowStart = now;
    entry.role = role;

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
      limit: config.maxRequests,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.windowStart + config.windowMs,
      limit: config.maxRequests,
    };
  }

  // Increment counter
  entry.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.windowStart + config.windowMs,
    limit: config.maxRequests,
  };
}

/**
 * Get user rate limit status
 */
export function getUserRateLimitStatus(userId: string): {
  count: number;
  remaining: number;
  resetTime: number | null;
  role?: string;
} | null {
  const entry = userRateLimitStore.get(userId);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  const elapsed = now - entry.windowStart;

  // Check if window has expired
  const config = getUserRateLimitConfig(entry.role);
  if (elapsed >= config.windowMs) {
    userRateLimitStore.delete(userId);
    return null;
  }

  return {
    count: entry.count,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.windowStart + config.windowMs,
    role: entry.role,
  };
}

/**
 * Clear user rate limit
 */
export function clearUserRateLimit(userId: string): void {
  userRateLimitStore.delete(userId);
}

/**
 * Clear all user rate limits
 */
export function clearAllUserRateLimits(): void {
  userRateLimitStore.clear();
}

/**
 * Get user rate limit statistics
 */
export function getUserRateLimitStats(): {
  totalUsers: number;
  totalRequests: number;
  roleBreakdown: Record<string, { count: number; requests: number }>;
} {
  const roleBreakdown: Record<string, { count: number; requests: number }> = {};
  let totalRequests = 0;

  for (const entry of userRateLimitStore.values()) {
    const role = entry.role || 'unknown';
    if (!roleBreakdown[role]) {
      roleBreakdown[role] = { count: 0, requests: 0 };
    }

    roleBreakdown[role].count++;
    roleBreakdown[role].requests += entry.count;
    totalRequests += entry.count;
  }

  return {
    totalUsers: userRateLimitStore.size,
    totalRequests,
    roleBreakdown,
  };
}

/**
 * Clean up expired user rate limit entries
 */
export function cleanupUserRateLimits(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [userId, entry] of userRateLimitStore.entries()) {
    const config = getUserRateLimitConfig(entry.role);
    if (now - entry.windowStart > config.windowMs) {
      keysToDelete.push(userId);
    }
  }

  for (const key of keysToDelete) {
    userRateLimitStore.delete(key);
  }

  if (keysToDelete.length > 0) {
    logger.debug(`Cleaned up ${keysToDelete.length} user rate limit entries`);
  }
}

// ============================================
// Periodic Cleanup
// ============================================

let cleanupIntervalId: NodeJS.Timeout | null = null;

export function startUserRateLimitCleanup(intervalMs: number = 5 * 60 * 1000): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
  }

  cleanupIntervalId = setInterval(() => {
    cleanupUserRateLimits();
  }, intervalMs);

  logger.info(`Started user rate limit cleanup (interval: ${intervalMs}ms)`);
}

export function stopUserRateLimitCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    logger.info('Stopped user rate limit cleanup');
  }
}

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  startUserRateLimitCleanup();
}
