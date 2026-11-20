/**
 * APM 追踪中间件 - 自动为 API 请求添加分布式追踪
 *
 * 功能：
 * - 自动从请求头提取或创建 traceId
 * - 创建 span 追踪请求处理过程
 * - 将 traceId 注入到响应头
 * - 集成 Sentry 性能监控
 *
 * @version v1.7.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { TraceManager, getTraceManager } from '@/lib/trace/TraceManager'
import type { TraceId, SpanId, TraceContext, Span } from '@/lib/tracing/types'
import { SpanStatusCode, SpanKind } from '@/lib/tracing/types'

// Re-export types for convenience
export type { TraceContext } from '@/lib/tracing/types'

// 获取或初始化 TraceManager
let traceManager: TraceManager

function getOrCreateTraceManager(): TraceManager {
  if (!traceManager) {
    traceManager = getTraceManager({
      serviceName: 'api-server',
      serviceVersion: '1.7.0',
      environment: process.env.NODE_ENV || 'development',
      samplingRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
    })
  }
  return traceManager
}

/**
 * 追踪中间件选项
 */
export interface TraceMiddlewareOptions {
  /** Span 名称 */
  spanName?: string
  /** 额外的属性 */
  attributes?: Record<string, string | number | boolean>
  /** 是否忽略错误 */
  ignoreErrors?: boolean
  /** 自定义标签 */
  tags?: Record<string, string>
}

/**
 * API 请求追踪包装器
 *
 * @param handler API 处理函数
 * @param options 追踪选项
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return withTrace(request, async (context) => {
 *     // context 包含 traceManager, span, traceId
 *     const { traceManager, span, traceId } = context;
 *
 *     // 记录业务指标
 *     traceManager.setAttribute(span, "user.id", userId);
 *
 *     // 正常处理请求
 *     return NextResponse.json({ success: true });
 *   }, {
 *     spanName: "api.auth.login",
 *     attributes: { "http.method": "POST" }
 *   });
 * }
 * ```
 */
export async function withTrace<T>(
  request: NextRequest,
  handler: (
    context: TraceContext & {
      traceManager: TraceManager
      span: Span
      request: NextRequest
    }
  ) => Promise<NextResponse<unknown>>,
  options: TraceMiddlewareOptions = {}
): Promise<NextResponse> {
  const tm = getOrCreateTraceManager()

  // 1. 从请求头提取追踪上下文
  const headers: Record<string, string | undefined> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  const existingContext = tm.extractContext(headers)

  // 2. 开始或恢复 Trace
  let traceId: import('@/lib/tracing/types').TraceId
  if (existingContext) {
    // 恢复现有 trace
    const restored = tm.restoreFromContext(existingContext)
    if (!restored) {
      throw new Error('Failed to restore trace from context')
    }
    traceId = restored
  } else {
    // 创建新 trace
    const newTraceId = tm.startTrace(options.spanName || 'api.request', {
      attributes: {
        'http.method': request.method,
        'http.url': request.url,
        'http.scheme': 'https',
        'http.host': request.headers.get('host') || 'unknown',
        'http.user_agent': request.headers.get('user-agent') || 'unknown',
        ...options.attributes,
      },
    })
    traceId = newTraceId
  }

  // 3. 创建 Span
  const spanName = options.spanName || `${request.method} ${request.url}`
  const span = tm.startSpan(spanName, {
    kind: SpanKind.SERVER,
    attributes: options.attributes,
  })

  if (!span) {
    // 如果 span 创建失败（超过最大数量），直接执行处理函数
    return handler({
      ...tm.getContext()!,
      traceManager: tm,
      span: {
        spanId: 'unknown',
        name: 'no-span',
        traceId: 'unknown',
        status: { code: SpanStatusCode.OK },
        startTime: Date.now(),
        attributes: {},
        events: [],
        kind: SpanKind.INTERNAL,
      },
      request,
    })
  }

  try {
    // 4. 执行处理函数
    const response = await handler({
      ...tm.getContext()!,
      traceManager: tm,
      span,
      request,
    })

    // 5. 将 traceId 注入到响应头
    response.headers.set('X-Trace-Id', traceId)
    response.headers.set('X-Span-Id', span.spanId)

    // 6. 记录响应状态
    tm.setAttribute(span, 'http.status_code', response.status)

    // 7. 结束 Span
    tm.endSpan(span, { code: 1 }) // OK

    return response
  } catch (error) {
    // 8. 记录错误
    tm.recordException(span, error)
    tm.setAttribute(span, 'http.status_code', 500)

    // 9. 结束 Span（错误状态）
    tm.endSpan(span, {
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    })

    // 10. 如果不忽略错误，重新抛出
    if (!options.ignoreErrors) {
      throw error
    }

    // 11. 返回错误响应
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        traceId,
      },
      { status: 500 }
    )

    errorResponse.headers.set('X-Trace-Id', traceId)
    return errorResponse
  } finally {
    // 12. 结束 Trace
    tm.endTrace(traceId)
  }
}

/**
 * 快捷包装器：认证 API 追踪
 */
export function withAuthTrace<T>(
  handler: (
    context: TraceContext & {
      traceManager: TraceManager
      span: Span
      request: NextRequest
    }
  ) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTrace(request, handler, {
      spanName: 'api.auth',
      attributes: { 'api.category': 'auth' },
    })
}

/**
 * 快捷包装器：Agent API 追踪
 */
export function withAgentTrace<T>(
  handler: (
    context: TraceContext & {
      traceManager: TraceManager
      span: Span
      request: NextRequest
    }
  ) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTrace(request, handler, {
      spanName: 'api.agents',
      attributes: { 'api.category': 'agents' },
    })
}

/**
 * 快捷包装器：Room API 追踪
 */
export function withRoomTrace<T>(
  handler: (
    context: TraceContext & {
      traceManager: TraceManager
      span: Span
      request: NextRequest
    }
  ) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTrace(request, handler, {
      spanName: 'api.rooms',
      attributes: { 'api.category': 'rooms' },
    })
}

/**
 * 从请求中提取 traceId
 */
export function extractTraceIdFromRequest(request: NextRequest): string | undefined {
  // 优先从自定义头读取
  const customTraceId = request.headers.get('X-Trace-Id')
  if (customTraceId) return customTraceId

  // 从 W3C traceparent 提取
  const traceparent = request.headers.get('traceparent')
  if (traceparent) {
    const parts = traceparent.split('-')
    if (parts.length >= 2) return parts[1]
  }

  // 从 sentry-trace 提取
  const sentryTrace = request.headers.get('sentry-trace')
  if (sentryTrace) {
    const parts = sentryTrace.split('-')
    if (parts.length >= 1) return parts[0]
  }

  return undefined
}

/**
 * 将 traceId 注入到响应头
 */
export function injectTraceIdToResponse(response: NextResponse, traceId: string): NextResponse {
  response.headers.set('X-Trace-Id', traceId)
  return response
}

/**
 * 获取当前请求的追踪上下文
 */
export function getTraceContextFromRequest(request: NextRequest): TraceContext | undefined {
  const tm = getOrCreateTraceManager()
  const headers: Record<string, string | undefined> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  return tm.extractContext(headers)
}
