/**
 * API Route Tests - Rate Limiting and Anti-Crawler Protection
 *
 * This file demonstrates how to use the middleware together in API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withRateLimit,
  withCrawlerDetection,
  getUserIdentifier,
  checkUserRateLimit,
  clearUserRateLimit,
} from '@/lib/middleware';
import { logger } from '@/lib/logger';

// ============================================
// Example API Route 1: Public Endpoint with IP-based Rate Limiting
// ============================================

export async function GET_publicEndpoint(request: NextRequest) {
  // Simple IP-based rate limiting
  const handler = withRateLimit(
    async (req: NextRequest) => {
      return NextResponse.json({
        success: true,
        message: 'Public endpoint accessed',
        data: { timestamp: new Date().toISOString() },
      });
    },
    {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 requests per minute
    }
  );

  return handler(request);
}

// ============================================
// Example API Route 2: Protected Endpoint with User-based Rate Limiting
// ============================================

export async function GET_protectedEndpoint(request: NextRequest) {
  // Get user identifier from JWT or API key
  const { userId, source } = await getUserIdentifier(request);

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
      { status: 401 }
    );
  }

  // Check user-based rate limit
  const rateLimitCheck = checkUserRateLimit(userId, 'user', {
    windowMs: 60 * 1000,
    maxRequests: 100, // Higher limit for authenticated users
  });

  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          details: {
            resetAt: new Date(rateLimitCheck.resetTime).toISOString(),
            limit: rateLimitCheck.limit,
          },
        },
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitCheck.limit.toString(),
          'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitCheck.resetTime).toISOString(),
          'Retry-After': Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Process the request
  return NextResponse.json(
    {
      success: true,
      message: 'Protected endpoint accessed',
      data: {
        userId,
        authSource: source,
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: {
        'X-RateLimit-Limit': rateLimitCheck.limit.toString(),
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitCheck.resetTime).toISOString(),
      },
    }
  );
}

// ============================================
// Example API Route 3: Admin Endpoint with Combined Protection
// ============================================

export async function POST_adminEndpoint(request: NextRequest) {
  // Combine crawler detection with rate limiting
  const protectedHandler = withCrawlerDetection(
    async (req: NextRequest) => {
      // Get user identifier
      const { userId, role } = await getUserIdentifier(req);

      if (!userId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              type: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          },
          { status: 401 }
        );
      }

      // Check admin role
      if (role !== 'admin') {
        return NextResponse.json(
          {
            success: false,
            error: {
              type: 'FORBIDDEN',
              message: 'Admin access required',
            },
          },
          { status: 403 }
        );
      }

      // Admin rate limit check
      const rateLimitCheck = checkUserRateLimit(userId, 'admin', {
        windowMs: 60 * 1000,
        maxRequests: 1000, // Very high limit for admins
      });

      if (!rateLimitCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              type: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded',
            },
          },
          { status: 429 }
        );
      }

      // Process the request
      try {
        const body = await req.json();
        // ... admin logic here ...

        return NextResponse.json({
          success: true,
          message: 'Admin operation completed',
          data: {
            userId,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: {
              type: 'INVALID_REQUEST',
              message: 'Invalid request body',
            },
          },
          { status: 400 }
        );
      }
    },
    {
      mode: 'block', // Block suspicious requests
      checkUserAgent: true,
      checkFrequency: true,
      checkIpReputation: true,
      maxRequestsPerMinute: 100,
      maxRequestsPerSecond: 10,
    }
  );

  return protectedHandler(request);
}

// ============================================
// Example API Route 4: Sensitive Data with Strict Protection
// ============================================

export async function GET_sensitiveData(request: NextRequest) {
  // Multi-layered protection
  const withAllProtection = async (req: NextRequest) => {
    // Layer 1: Crawler detection
    const crawlerProtected = withCrawlerDetection(
      async (req) => {
        // Layer 2: IP-based rate limiting
        const rateLimited = withRateLimit(
          async (req) => {
            // Layer 3: User authentication and rate limiting
            const { userId } = await getUserIdentifier(req);

            if (!userId) {
              return NextResponse.json(
                {
                  success: false,
                  error: {
                    type: 'UNAUTHORIZED',
                    message: 'Authentication required',
                  },
                },
                { status: 401 }
              );
            }

            // Strict user rate limit
            const userRateLimitCheck = checkUserRateLimit(userId, 'user', {
              windowMs: 60 * 1000,
              maxRequests: 10, // Very strict limit for sensitive data
            });

            if (!userRateLimitCheck.allowed) {
              logger.warn(`Sensitive data rate limit exceeded for user ${userId}`, {
                userId,
                resetTime: userRateLimitCheck.resetTime,
              });

              return NextResponse.json(
                {
                  success: false,
                  error: {
                    type: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests to sensitive endpoint',
                  },
                },
                { status: 429 }
              );
            }

            // Return sensitive data
            return NextResponse.json({
              success: true,
              data: {
                userId,
                sensitiveInfo: 'This is sensitive data',
                timestamp: new Date().toISOString(),
              },
            });
          },
          {
            windowMs: 60 * 1000,
            maxRequests: 20, // Additional IP-based limit
          }
        );

        return rateLimited(req);
      },
      {
        mode: 'block',
        checkUserAgent: true,
        blockUnknownBots: true,
        checkFrequency: true,
        maxRequestsPerMinute: 30,
      }
    );

    return crawlerProtected(req);
  };

  return withAllProtection(request);
}

// ============================================
// Example API Route 5: Batch Operations with Quota Management
// ============================================

export async function POST_batchOperations(request: NextRequest) {
  // Batch operations might need different rate limiting strategy
  const { userId } = await getUserIdentifier(request);

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { operations } = body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'INVALID_REQUEST',
            message: 'Operations array required',
          },
        },
        { status: 400 }
      );
    }

    // Rate limit based on number of operations, not requests
    const operationsCount = operations.length;

    // Check if user has quota for this many operations
    const rateLimitCheck = checkUserRateLimit(userId, 'user', {
      windowMs: 60 * 1000,
      maxRequests: 1000, // Allow up to 1000 operations per minute
    });

    // Calculate actual quota used
    const remainingQuota = Math.max(0, rateLimitCheck.remaining - operationsCount);

    if (remainingQuota < 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'QUOTA_EXCEEDED',
            message: `Insufficient quota. Requested: ${operationsCount}, Available: ${rateLimitCheck.remaining}`,
          },
        },
        { status: 429 }
      );
    }

    // Deduct quota by updating the rate limit store
    // Note: This is a simplified version - in production, you'd want to properly
    // update the count to reflect the operations used
    const userRateLimitCheck = checkUserRateLimit(userId, 'user', {
      windowMs: 60 * 1000,
      maxRequests: rateLimitCheck.limit,
    });

    // Process batch operations
    const results = operations.map((op: Record<string, unknown>, index: number) => ({
      index,
      status: 'processed',
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        processed: operationsCount,
        remainingQuota,
        results,
      },
      headers: {
        'X-RateLimit-Remaining': remainingQuota.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to process batch operations',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// Example API Route 6: Rate Limit Status Endpoint
// ============================================

export async function GET_rateLimitStatus(request: NextRequest) {
  const { userId } = await getUserIdentifier(request);

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
      { status: 401 }
    );
  }

  // Return rate limit status for the user
  const status = {
    userId,
    timestamp: new Date().toISOString(),
    limits: {
      public: { windowMs: 60 * 1000, maxRequests: 30 },
      protected: { windowMs: 60 * 1000, maxRequests: 100 },
      admin: { windowMs: 60 * 1000, maxRequests: 1000 },
      sensitive: { windowMs: 60 * 1000, maxRequests: 10 },
    },
  };

  return NextResponse.json({
    success: true,
    data: status,
  });
}

// ============================================
// Example API Route 7: Emergency Rate Limit Override
// ============================================

export async function POST_overrideRateLimit(request: NextRequest) {
  // This endpoint should only be accessible by admins
  const { userId, role } = await getUserIdentifier(request);

  if (!userId || role !== 'admin') {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'FORBIDDEN',
          message: 'Admin access required',
        },
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { targetUserId, action } = body;

    if (!targetUserId || !action) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'INVALID_REQUEST',
            message: 'targetUserId and action required',
          },
        },
        { status: 400 }
      );
    }

    if (action === 'clear') {
      clearUserRateLimit(targetUserId);
      logger.info(`Rate limit cleared for user ${targetUserId} by admin ${userId}`);

      return NextResponse.json({
        success: true,
        message: `Rate limit cleared for user ${targetUserId}`,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'INVALID_ACTION',
          message: `Unknown action: ${action}`,
        },
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to process override request',
        },
      },
      { status: 500 }
    );
  }
}
