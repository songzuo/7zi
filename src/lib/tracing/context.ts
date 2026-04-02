/**
 * Tracing Context - 追踪上下文管理
 *
 * 提供追踪上下文的获取和注入功能
 */

import type { TraceContext } from './types'

/**
 * 存储当前线程/请求的追踪上下文
 */
const contextStorage = new Map<string, TraceContext>()

/**
 * 获取当前追踪上下文
 */
export function getCurrentTraceContext(): TraceContext | undefined {
  return contextStorage.get('current')
}

/**
 * 设置当前追踪上下文
 */
export function setCurrentTraceContext(context: TraceContext): void {
  contextStorage.set('current', context)
}

/**
 * 清除当前追踪上下文
 */
export function clearCurrentTraceContext(): void {
  contextStorage.delete('current')
}

/**
 * 将追踪上下文注入到响应头
 *
 * @param context 追踪上下文
 * @param format 格式 ("w3c" | "b3" | "sentry")
 * @returns 包含要注入到头部的键值对对象
 */
export function injectTraceContext(
  context: TraceContext | undefined,
  format: 'w3c' | 'b3' | 'sentry' = 'w3c'
): Record<string, string> {
  if (!context) return {}

  const headers: Record<string, string> = {}

  switch (format) {
    case 'w3c':
      if (context.traceId) {
        const traceId =
          typeof context.traceId === 'string' ? context.traceId : String(context.traceId)
        const spanId = context.spanId ? String(context.spanId) : '0000000000000000'
        headers['traceparent'] = `00-${traceId}-${spanId}-01`
      }
      break

    case 'sentry':
      if (context.traceId) {
        const traceId =
          typeof context.traceId === 'string' ? context.traceId : String(context.traceId)
        const spanId = context.spanId ? String(context.spanId) : '0000000000000000'
        const sampled = context.sampled !== false ? '1' : '0'
        headers['sentry-trace'] = `${traceId}-${spanId}-${sampled}`
      }
      break

    case 'b3':
      if (context.traceId) {
        const traceId =
          typeof context.traceId === 'string' ? context.traceId : String(context.traceId)
        const spanId = context.spanId ? String(context.spanId) : '0000000000000000'
        const sampled = context.sampled !== false ? '1' : '0'
        headers['b3'] = `${traceId}-${spanId}-${sampled}`
      }
      break
  }

  return headers
}

/**
 * 从请求头中提取追踪上下文
 */
export function extractTraceContext(
  headers: Record<string, string | undefined>
): TraceContext | undefined {
  // 尝试从 W3C traceparent 提取
  const traceparent = headers['traceparent'] || headers['Traceparent']
  if (traceparent) {
    const parts = traceparent.split('-')
    if (parts.length >= 3) {
      return {
        traceId: parts[1],
        spanId: parts[2],
        sampled: parts[3] === '01',
      }
    }
  }

  // 尝试从 Sentry trace 提取
  const sentryTrace = headers['sentry-trace'] || headers['Sentry-Trace']
  if (sentryTrace) {
    const parts = sentryTrace.split('-')
    if (parts.length >= 2) {
      return {
        traceId: parts[0],
        spanId: parts[1],
        sampled: parts[2] === '1',
      }
    }
  }

  // 尝试从 X-Trace-Id 提取
  const customTraceId = headers['x-trace-id'] || headers['X-Trace-Id']
  if (customTraceId) {
    return {
      traceId: customTraceId,
      spanId: headers['x-span-id'] as string | undefined,
    }
  }

  return undefined
}
