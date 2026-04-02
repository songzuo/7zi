/**
 * Tracing Types - 追踪类型定义
 *
 * @version v1.7.0
 */

export type TraceId = string
export type SpanId = string

export interface TraceContext {
  traceId: TraceId
  spanId?: SpanId
  parentSpanId?: SpanId
  sampled?: boolean
  baggage?: Record<string, string>
  traceFlags?: number
}

export interface Span {
  spanId: SpanId
  traceId: TraceId
  name: string
  status: SpanStatus
  startTime: number
  endTime?: number
  duration?: number
  attributes: Record<string, string | number | boolean>
  events: SpanEvent[]
  kind: SpanKind
  parentSpanId?: SpanId
  links?: SpanLink[]
}

export enum SpanStatusCode {
  /** Span completed successfully */
  OK = 0,
  /** Span encountered an error */
  ERROR = 1,
  /** Span status is unknown */
  UNSET = -1,
}

export type SpanStatus =
  | { code: SpanStatusCode.OK }
  | { code: SpanStatusCode.ERROR; message?: string }
  | { code: SpanStatusCode.UNSET }

export enum SpanKind {
  /** Internal span, not a shared connection */
  INTERNAL = 0,
  /** Server-side request/response */
  SERVER = 1,
  /** Client-side request/response */
  CLIENT = 2,
  /** Producer created span */
  PRODUCER = 3,
  /** Consumer created span */
  CONSUMER = 4,
}

export interface SpanEvent {
  name: string
  timestamp: number
  attributes?: Record<string, string | number | boolean>
}

export interface SpanLink {
  traceId: TraceId
  spanId: SpanId
  attributes?: Record<string, string | number | boolean>
}

export type OperationType = 'internal' | 'server' | 'client' | 'producer' | 'consumer'

export interface SpanOptions {
  name?: string
  kind?: SpanKind
  attributes?: Record<string, string | number | boolean>
  startTime?: number
  parentSpanId?: SpanId
}

export interface TraceMetadata {
  serviceName: string
  serviceVersion?: string
  environment?: string
  traceId: TraceId
  spanId: SpanId
  parentSpanId?: SpanId
  timestamp: number
  duration?: number
  attributes?: Record<string, string | number | boolean>
  operationType?: OperationType
}

/**
 * Generate a new trace ID
 */
export function generateTraceId(): TraceId {
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Generate a new span ID
 */
export function generateSpanId(): SpanId {
  return `span-${Math.random().toString(36).substring(2, 15)}`
}
