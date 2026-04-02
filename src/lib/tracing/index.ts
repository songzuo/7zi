/**
 * Tracing Module - 追踪上下文管理
 *
 * 这个模块提供了追踪上下文的获取和注入功能，
 * 兼容之前的 @/lib/tracing 导入路径。
 */

// Re-export functions from context
export {
  getCurrentTraceContext,
  setCurrentTraceContext,
  clearCurrentTraceContext,
  injectTraceContext,
  extractTraceContext,
} from './context'

// Simple global storage for tracking active spans (for APM compatibility)
const activeSpans = new Set<unknown>()

export function getGlobalContextStorage() {
  return {
    getActiveSpans: () => Array.from(activeSpans),
    addSpan: (span: unknown) => activeSpans.add(span),
    removeSpan: (span: unknown) => activeSpans.delete(span),
  }
}

// Re-export all types
export type {
  TraceId,
  SpanId,
  TraceContext,
  Span,
  SpanStatus,
  SpanEvent,
  SpanOptions,
  OperationType,
  TraceMetadata,
} from './types'

// SpanStatusCode and SpanKind are enums - need special handling
// Export type-only for type usage
export type { SpanStatusCode, SpanKind } from './types'
