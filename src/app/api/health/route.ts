import { NextRequest, NextResponse } from 'next/server'
/**
 * Health Check API Routes
 *
 * Provides health check endpoints for monitoring and load balancers
 */

import { getCacheManager } from '@/lib/cache/CacheManager'
import { createErrorResponse } from '@/lib/api/error-handler'
import { logger } from '@/lib/logger'

/**
 * Health check data structure
 */
interface HealthCheckData {
  /** Overall health status */
  status: 'healthy' | 'unhealthy'
  /** Timestamp */
  timestamp: string
  /** Uptime in seconds */
  uptime: number
  /** Version */
  version: string
  /** Service checks */
  checks: {
    memory: {
      status: 'ok' | 'warning'
      used: number
      limit: number
    }
    node: {
      status: 'ok'
      version: string
    }
  }
}

/**
 * API response wrapper - matches test expectations
 */
interface ApiResponse<T> {
  success: boolean
  data: T
}

/**
 * Collect actual health metrics
 */
function collectHealthMetrics(): HealthCheckData {
  // Get memory usage in MB
  const usedMemory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  const memoryLimit = 512 // Default memory limit in MB

  // Determine memory status
  const memoryStatus = usedMemory > memoryLimit * 0.9 ? 'warning' : 'ok'

  // Get uptime in seconds
  const uptime = process.uptime()

  // Get version from package.json or use fallback
  const version = process.env.npm_package_version || process.env.APP_VERSION || '1.0.6'

  // Get Node.js version
  const nodeVersion = process.version

  return {
    status: memoryStatus === 'warning' ? 'unhealthy' : 'healthy',
    timestamp: new Date().toISOString(),
    uptime,
    version,
    checks: {
      memory: {
        status: memoryStatus,
        used: usedMemory,
        limit: memoryLimit,
      },
      node: {
        status: 'ok',
        version: nodeVersion,
      },
    },
  }
}

/**
 * GET /api/health
 * Basic health check endpoint
 */
export async function GET(_request: NextRequest) {
  try {
    const cacheManager = getCacheManager()

    // Use cache with 30 second TTL to avoid frequent health checks
    const cacheKey = `health:status:${process.pid}`

    const healthData = await cacheManager.getOrSet<HealthCheckData>(
      cacheKey,
      async () => collectHealthMetrics(),
      30000 // 30 seconds
    )

    // Wrap response in API format expected by tests
    const response: ApiResponse<HealthCheckData> = {
      success: true,
      data: healthData,
    }

    return NextResponse.json(response, {
      status: healthData.status === 'unhealthy' ? 503 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    logger.error('Health check failed', err as Error)
    return createErrorResponse(err as Error, 503)
  }
}

/**
 * HEAD /api/health
 * Lightweight health check (returns status code only)
 */
export async function HEAD() {
  try {
    const response = await GET(
      new NextRequest('http://localhost/api/health', {
        method: 'GET',
      })
    )

    return response
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}
