/**
 * Trace Module - 分布式追踪模块
 *
 * @version v1.7.0
 * @module lib/trace
 * @description 提供分布式追踪核心功能
 *
 * 使用示例:
 * ```typescript
 * import { TraceManager, StructuredLogger } from '@/lib/trace';
 *
 * // 创建 TraceManager
 * const traceManager = new TraceManager({
 *   serviceName: 'agent-executor',
 *   environment: 'production'
 * });
 *
 * // 创建 Logger
 * const logger = new StructuredLogger({
 *   serviceName: 'agent-executor',
 *   environment: 'production'
 * });
 *
 * // 开始追踪
 * const traceId = traceManager.startTrace('process-task');
 *
 * // 设置 Logger 的追踪上下文
 * const span = traceManager.startSpan('validate');
 * logger.setTraceContext(traceManager.getTraceId()!, traceManager.getSpanId());
 *
 * // 记录日志 (自动包含 traceId)
 * logger.info('Validating input', { input: { ... } });
 *
 * // 结束 Span
 * traceManager.endSpan(span);
 * traceManager.endTrace();
 * ```
 */

// ============================================
// TraceManager
// ============================================

export {
  TraceManager,
  initTraceManager,
  getTraceManager,
  generateTraceId,
  generateSpanId,
  generateUUIDv4,
  type TraceManagerOptions,
} from "./TraceManager";

// ============================================
// StructuredLogger
// ============================================

export {
  StructuredLogger,
  LogLevel,
  LogLevelNames,
  createAppLogger,
  createAgentLogger,
  type StructuredLoggerOptions,
  type LogEntry,
  type TraceContextFields,
  type LogError,
} from "./StructuredLogger";

// ============================================
// Middleware
// ============================================

export {
  withTrace,
  withAuthTrace,
  withAgentTrace,
  withRoomTrace,
  extractTraceIdFromRequest,
  injectTraceIdToResponse,
  getTraceContextFromRequest,
  type TraceMiddlewareOptions,
} from "./middleware";

// ============================================
// Shared Types
// ============================================

export type {
  TraceId,
  SpanId,
  Span,
  SpanOptions,
  SpanStatus,
  TraceContext,
  TraceMetadata,
} from "../tracing/types";

export {
  SpanStatusCode,
  SpanKind,
  OperationType,
} from "../tracing/types";
