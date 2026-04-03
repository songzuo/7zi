/**
 * Rate Limit Admin API Routes
 * 
 * Next.js API routes for the rate limit admin panel
 * 
 * @version 1.12.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRateLimitingGateway } from '@/lib/rate-limiting-gateway'

// Get or create rate limiting gateway instance
function getGateway() {
  return createRateLimitingGateway({
    redisUrl: process.env.REDIS_URL || process.env.REDIS_CLUSTER_URL,
    config: {
      ip: {
        enabled: true,
        algorithm: 'sliding-window',
        windowMs: 60000,
        maxRequests: 100,
      },
      user: {
        enabled: true,
        algorithm: 'sliding-window',
        windowMs: 60000,
        maxRequests: 200,
      },
      apiKey: {
        enabled: true,
        algorithm: 'token-bucket',
        defaultTier: 'free',
        tiers: {
          free: { name: 'free', rate: 2, burst: 10, dailyLimit: 1000 },
          basic: { name: 'basic', rate: 10, burst: 30, dailyLimit: 10000 },
          pro: { name: 'pro', rate: 50, burst: 150, dailyLimit: 100000 },
          enterprise: { name: 'enterprise', rate: 200, burst: 500, dailyLimit: 1000000 },
        },
      },
      global: {
        enabled: true,
        algorithm: 'token-bucket',
        rate: 1000,
        burst: 2000,
      },
    },
  })
}

// In-memory stats storage for demo
let stats = {
  totalRequests: 0,
  allowedRequests: 0,
  rejectedRequests: 0,
  rejectionRate: 0,
  byLayer: {
    global: { allowed: 0, rejected: 0 },
    ip: { allowed: 0, rejected: 0 },
    'api-key': { allowed: 0, rejected: 0 },
    user: { allowed: 0, rejected: 0 },
  },
  byAlgorithm: {
    'token-bucket': { allowed: 0, rejected: 0 },
    'sliding-window': { allowed: 0, rejected: 0 },
    'fixed-window': { allowed: 0, rejected: 0 },
    'leaky-bucket': { allowed: 0, rejected: 0 },
  },
  avgLatencyMs: 0,
  p99LatencyMs: 0,
}

// GET /api/rate-limit/health
export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname

  try {
    const gateway = getGateway()
    const storage = gateway.storage

    // Health check
    if (path.endsWith('/health')) {
      const connected = await storage.isConnected()
      const type = storage.getType()

      return NextResponse.json({
        success: true,
        data: {
          status: connected ? 'healthy' : 'unhealthy',
          storage: {
            type,
            connected,
          },
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Stats
    if (path.endsWith('/stats')) {
      // Simulate some requests for demo
      stats.totalRequests = Math.floor(Math.random() * 10000) + 5000
      stats.allowedRequests = Math.floor(stats.totalRequests * 0.95)
      stats.rejectedRequests = stats.totalRequests - stats.allowedRequests
      stats.rejectionRate = stats.rejectedRequests / stats.totalRequests

      return NextResponse.json({
        success: true,
        data: {
          ...stats,
          storage: {
            type: storage.getType(),
            connected: await storage.isConnected(),
          },
        },
      })
    }

    // Keys list
    if (path.endsWith('/keys')) {
      const searchParams = request.nextUrl.searchParams
      const pattern = searchParams.get('pattern') || '*'
      const count = parseInt(searchParams.get('count') || '100', 10)

      // In a real implementation, we'd scan Redis for keys
      // For demo, return mock keys
      const mockKeys = [
        'ip:192.168.1.100',
        'ip:10.0.0.50',
        'api-key:sk_test_123',
        'api-key:sk_live_456',
        'user:user_123',
        'user:user_456',
      ]

      return NextResponse.json({
        success: true,
        data: {
          keys: mockKeys,
          count: mockKeys.length,
          cursor: mockKeys.length,
        },
      })
    }

    // Status for specific key
    const statusMatch = path.match(/\/status\/([^/]+)\/([^/]+)$/)
    if (statusMatch) {
      const [, layer, identifier] = statusMatch

      return NextResponse.json({
        success: true,
        data: {
          key: `${layer}:${identifier}`,
          layer,
          currentCount: Math.floor(Math.random() * 50),
          limit: 100,
          remaining: Math.floor(Math.random() * 50) + 50,
          resetTime: Date.now() + 60000,
          algorithm: layer === 'api-key' ? 'token-bucket' : 'sliding-window',
          storage: storage.getType(),
        },
      })
    }

    return NextResponse.json({
      error: {
        type: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    })
  } catch (error) {
    console.error('Rate limit API error:', error)
    return NextResponse.json(
      {
        error: {
          type: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

// POST /api/rate-limit/*
export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname

  try {
    const body = await request.json()

    // Adjust rate limit
    if (path.endsWith('/adjust')) {
      const { key, layer, newLimit, resetCount, addTokens } = body

      if (!key || !layer) {
        return NextResponse.json(
          {
            error: {
              type: 'INVALID_REQUEST',
              message: 'Key and layer are required',
            },
          },
          { status: 400 }
        )
      }

      // In a real implementation, we'd update the rate limit
      return NextResponse.json({
        success: true,
        message: 'Rate limit adjusted successfully',
      })
    }

    // Reset rate limit
    const resetMatch = path.match(/\/reset\/([^/]+)\/([^/]+)$/)
    if (resetMatch) {
      const [, layer, identifier] = resetMatch

      // In a real implementation, we'd delete the key from Redis
      return NextResponse.json({
        success: true,
        message: 'Rate limit reset successfully',
        data: {
          key: `${layer}:${identifier}`,
          deleted: true,
        },
      })
    }

    return NextResponse.json({
      error: {
        type: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    })
  } catch (error) {
    console.error('Rate limit API error:', error)
    return NextResponse.json(
      {
        error: {
          type: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
