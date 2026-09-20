/**
 * APM Status API Endpoint
 *
 * Returns comprehensive APM status including:
 * - Sentry configuration and status
 * - Distributed tracing information
 * - Performance metrics
 * - Agent task statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { sentryClient, agentTracker } from '@/lib/monitoring'
import { getCurrentTraceContext, injectTraceContext } from '@/lib/tracing'
import { createErrorResponse } from '@/lib/api/error-handler'
import { logger } from '@/lib/logger'

/**
 * APM Status Response
 */
interface APMStatusResponse {
  apm: {
    status: 'enabled' | 'disabled'
    sentry: {
      initialized: boolean
      dsn: boolean
      environment: string
      release?: string
      tracesSampleRate: number
      profilesSampleRate: number
      debug: boolean
    }
    tracing: {
      traceId?: string
      spanId?: string
      activeSpans?: number
    }
  }
  performance: {
    memory: {
      used: number
      limit: number
      percentage: number
    }
    uptime: number
    responseTime?: number
  }
  agentTasks: {
    totalAgents: number
    totalTasks: number
    completedTasks: number
    failedTasks: number
    activeTasks: number
    avgTaskDuration: number
    totalTokens: number
  }
}

/**
 * GET /api/monitoring/apm
 * Returns APM status and metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Extract trace context from incoming headers
    const traceContext = getCurrentTraceContext()

    // Start a span for this operation
    const span = sentryClient.startSpan({
      op: 'http.server',
      description: 'GET /api/monitoring/apm',
      data: {
        path: request.nextUrl.pathname,
        method: request.method,
      },
    })

    // Get Sentry status
    const sentryStatus = sentryClient.getStatus()

    // Get active spans count
    const { getGlobalContextStorage } = await import('@/lib/tracing')
    const globalStorage = getGlobalContextStorage()
    const activeSpans = globalStorage.getActiveSpans().length

    // Get agent task statistics
    const agentStats = agentTracker.getGlobalStats()

    // Get memory usage
    const usedMemory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    const memoryLimit = 512 // Default memory limit in MB

    // Prepare response
    const data: APMStatusResponse = {
      apm: {
        status: sentryStatus.isInitialized ? 'enabled' : 'disabled',
        sentry: {
          initialized: sentryStatus.isInitialized,
          dsn: sentryStatus.hasDsn,
          environment: sentryStatus.environment,
          release: sentryStatus.release,
          tracesSampleRate: sentryStatus.tracesSampleRate,
          profilesSampleRate: sentryStatus.profilesSampleRate,
          debug: sentryStatus.debug,
        },
        tracing: {
          traceId: traceContext?.traceId,
          spanId: traceContext?.spanId,
          activeSpans,
        },
      },
      performance: {
        memory: {
          used: usedMemory,
          limit: memoryLimit,
          percentage: Math.round((usedMemory / memoryLimit) * 100),
        },
        uptime: Math.floor(process.uptime()),
        responseTime: Date.now() - startTime,
      },
      agentTasks: {
        totalAgents: agentStats.totalAgents,
        totalTasks: agentStats.totalTasks,
        completedTasks: agentStats.completedTasks,
        failedTasks: agentStats.failedTasks,
        activeTasks: agentStats.activeTasks,
        avgTaskDuration: agentStats.avgTaskDuration,
        totalTokens: agentStats.totalTokens,
      },
    }

    // Prepare response headers with trace context
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=10', // 10 second cache
      'X-Response-Time': `${Date.now() - startTime}ms`,
    }

    // Inject trace context into response headers for propagation
    if (traceContext) {
      const traceHeadersOut = injectTraceContext(traceContext, 'w3c')
      Object.entries(traceHeadersOut).forEach(([key, value]) => {
        if (value) responseHeaders[key] = String(value)
      })

      // Also add Sentry trace header
      const sentryTraceHeader = `${traceContext.traceId}-${traceContext.spanId}-${traceContext.sampled ? 1 : 0}`
      responseHeaders['sentry-trace'] = sentryTraceHeader
    }

    span?.end()

    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
      { headers: responseHeaders }
    )
  } catch (err) {
    logger.error('APM status endpoint failed', err as Error)
    sentryClient.captureException(err as Error, {
      tags: { endpoint: 'api/monitoring/apm' },
    })
    return createErrorResponse(err as Error, 500)
  }
}

/**
 * HEAD /api/monitoring/apm
 * Lightweight check for APM endpoint availability
 */
export async function HEAD() {
  return NextResponse.json(null, { status: 200 })
}
