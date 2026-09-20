/**
 * TraceManager - 分布式追踪管理器
 * 
 * 基于 OpenTelemetry 概念的追踪实现
 * 
 * @version v1.11.0
 */

import {
  TraceId,
  SpanId,
  Span,
  SpanContext,
  SpanStatus,
  SpanStatusCode,
  SpanKind,
  SpanEvent,
  SpanLink,
  Trace,
  TraceFilter,
  TraceMetadata,
  SamplingStrategy,
  Tags,
  generateTraceId,
  generateSpanId,
} from '../types'

// ============================================
// Active Trace
// ============================================

interface ActiveTrace {
  traceId: TraceId
  rootSpanId: SpanId
  spans: Map<SpanId, Span>
  metadata: TraceMetadata
  startTime: number
  spanStack: Span[]
}

// ============================================
// TraceManager Options
// ============================================

export interface TraceManagerOptions {
  serviceName: string
  serviceVersion?: string
  environment?: string
  samplingStrategy?: SamplingStrategy
  maxSpansPerTrace?: number
  maxTracesInMemory?: number
}

// ============================================
// TraceManager Class
// ============================================

export class TraceManager {
  private options: Required<Omit<TraceManagerOptions, 'samplingStrategy'>> & {
    samplingStrategy: SamplingStrategy
  }
  private activeTraces: Map<TraceId, ActiveTrace> = new Map()
  private completedTraces: Map<TraceId, Trace> = new Map()
  private currentTraceId: TraceId | undefined
  private rateLimiter: Map<string, number[]> = new Map()

  constructor(options: TraceManagerOptions) {
    this.options = {
      serviceName: options.serviceName,
      serviceVersion: options.serviceVersion ?? '1.0.0',
      environment: options.environment ?? 'development',
      samplingStrategy: options.samplingStrategy ?? { type: 'always' },
      maxSpansPerTrace: options.maxSpansPerTrace ?? 1000,
      maxTracesInMemory: options.maxTracesInMemory ?? 1000,
    }
  }

  // ============================================
  // Trace Lifecycle
  // ============================================

  /**
   * 开始一个新的追踪
   */
  startTrace(
    name: string,
    options?: {
      traceId?: TraceId
      attributes?: Tags
      kind?: SpanKind
    }
  ): TraceId {
    const traceId = options?.traceId ?? generateTraceId()

    // 检查采样
    if (!this.shouldSample(traceId)) {
      return traceId
    }

    const rootSpanId = generateSpanId()

    // 创建根 Span
    const rootSpan: Span = {
      spanId: rootSpanId,
      traceId,
      name,
      kind: options?.kind ?? SpanKind.INTERNAL,
      startTime: Date.now(),
      status: { code: SpanStatusCode.UNSET },
      attributes: {
        'service.name': this.options.serviceName,
        'service.version': this.options.serviceVersion,
        ...options?.attributes,
      },
      events: [],
      links: [],
    }

    // 创建元数据
    const metadata: TraceMetadata = {
      traceId,
      spanId: rootSpanId,
      serviceName: this.options.serviceName,
      serviceVersion: this.options.serviceVersion,
      environment: this.options.environment,
      operationType: name,
      timestamp: Date.now(),
    }

    // 创建活跃追踪
    const activeTrace: ActiveTrace = {
      traceId,
      rootSpanId,
      spans: new Map([[rootSpanId, rootSpan]]),
      metadata,
      startTime: Date.now(),
      spanStack: [rootSpan],
    }

    this.activeTraces.set(traceId, activeTrace)
    this.currentTraceId = traceId

    return traceId
  }

  /**
   * 结束当前追踪
   */
  endTrace(traceId?: TraceId): Trace | undefined {
    const id = traceId ?? this.currentTraceId
    if (!id) return undefined

    const activeTrace = this.activeTraces.get(id)
    if (!activeTrace) return undefined

    // 结束所有未关闭的 Span
    const now = Date.now()
    const allSpans = Array.from(activeTrace.spans.values())
    for (const span of allSpans) {
      if (span.endTime === undefined) {
        span.endTime = now
        span.duration = now - span.startTime
      }
    }

    // 构建完整的追踪
    const spans = Array.from(activeTrace.spans.values())
    const rootSpan = activeTrace.spans.get(activeTrace.rootSpanId)
    
    const trace: Trace = {
      traceId: activeTrace.traceId,
      rootSpanName: rootSpan?.name || 'unknown',
      rootSpanId: activeTrace.rootSpanId,
      spans,
      duration: now - activeTrace.startTime,
      startTime: activeTrace.startTime,
      endTime: now,
      status: this.getTraceStatus(spans),
      serviceCount: this.countServices(spans),
      spanCount: spans.length,
      hasErrors: this.hasErrors(spans),
    }

    // 移动到已完成追踪
    this.completedTraces.set(id, trace)
    this.activeTraces.delete(id)

    // 限制内存中的追踪数量
    if (this.completedTraces.size > this.options.maxTracesInMemory) {
      const oldestKey = this.completedTraces.keys().next().value
      if (oldestKey) {
        this.completedTraces.delete(oldestKey)
      }
    }

    if (this.currentTraceId === id) {
      this.currentTraceId = undefined
    }

    return trace
  }

  // ============================================
  // Span Lifecycle
  // ============================================

  /**
   * 开始一个新的 Span
   */
  startSpan(
    name: string,
    options?: {
      kind?: SpanKind
      attributes?: Tags
      links?: SpanLink[]
    }
  ): Span | undefined {
    const activeTrace = this.getActiveTrace()
    if (!activeTrace) return undefined

    // 检查 Span 数量限制
    if (activeTrace.spans.size >= this.options.maxSpansPerTrace) {
      console.warn(`Max spans (${this.options.maxSpansPerTrace}) reached for trace ${activeTrace.traceId}`)
      return undefined
    }

    const spanId = generateSpanId()
    const parentSpan = activeTrace.spanStack[activeTrace.spanStack.length - 1]

    const span: Span = {
      spanId,
      traceId: activeTrace.traceId,
      name,
      kind: options?.kind ?? SpanKind.INTERNAL,
      startTime: Date.now(),
      parentSpanId: parentSpan?.spanId,
      status: { code: SpanStatusCode.UNSET },
      attributes: options?.attributes ?? {},
      events: [],
      links: options?.links ?? [],
    }

    activeTrace.spans.set(spanId, span)
    activeTrace.spanStack.push(span)

    return span
  }

  /**
   * 结束 Span
   */
  endSpan(span: Span | SpanId, status?: SpanStatus): void {
    const activeTrace = this.getActiveTrace()
    if (!activeTrace) return

    let spanObj: Span | undefined
    if (typeof span === 'string') {
      spanObj = activeTrace.spans.get(span as SpanId)
    } else {
      spanObj = span
    }

    if (!spanObj) return

    spanObj.endTime = Date.now()
    spanObj.duration = spanObj.endTime - spanObj.startTime

    if (status) {
      spanObj.status = status
    }

    // 从栈中弹出
    const currentSpan = activeTrace.spanStack[activeTrace.spanStack.length - 1]
    if (currentSpan?.spanId === spanObj.spanId) {
      activeTrace.spanStack.pop()
    }
  }

  /**
   * 使用 Span 包装异步函数
   */
  async withSpan<T>(
    name: string,
    fn: () => Promise<T>,
    options?: {
      kind?: SpanKind
      attributes?: Tags
    }
  ): Promise<T> {
    const span = this.startSpan(name, options)
    if (!span) {
      return fn()
    }

    try {
      const result = await fn()
      this.endSpan(span, { code: SpanStatusCode.OK })
      return result
    } catch (error) {
      this.endSpan(span, {
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      })
      this.recordException(span, error)
      throw error
    }
  }

  /**
   * 使用 Span 包装同步函数
   */
  withSpanSync<T>(
    name: string,
    fn: () => T,
    options?: {
      kind?: SpanKind
      attributes?: Tags
    }
  ): T {
    const span = this.startSpan(name, options)
    if (!span) {
      return fn()
    }

    try {
      const result = fn()
      this.endSpan(span, { code: SpanStatusCode.OK })
      return result
    } catch (error) {
      this.endSpan(span, {
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      })
      this.recordException(span, error)
      throw error
    }
  }

  // ============================================
  // Span Operations
  // ============================================

  /**
   * 添加 Span 事件
   */
  addEvent(span: Span, name: string, attributes?: Tags): void {
    const event: SpanEvent = {
      name,
      timestamp: Date.now(),
      attributes,
    }
    span.events.push(event)
  }

  /**
   * 设置 Span 属性
   */
  setAttribute(span: Span, key: string, value: string | number | boolean): void {
    span.attributes[key] = value
  }

  /**
   * 设置 Span 状态
   */
  setStatus(span: Span, status: SpanStatus): void {
    span.status = status
  }

  /**
   * 记录异常
   */
  recordException(span: Span, error: Error | unknown): void {
    this.setStatus(span, {
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    })

    this.addEvent(span, 'exception', {
      'exception.type': error instanceof Error ? error.constructor.name : 'Unknown',
      'exception.message': error instanceof Error ? error.message : String(error),
      'exception.stacktrace': error instanceof Error ? (error.stack ?? '') : '',
    })
  }

  // ============================================
  // Context Propagation
  // ============================================

  /**
   * 获取当前 Span 上下文
   */
  getContext(): SpanContext | undefined {
    const activeTrace = this.getActiveTrace()
    if (!activeTrace) return undefined

    const currentSpan = activeTrace.spanStack[activeTrace.spanStack.length - 1]
    return {
      traceId: activeTrace.traceId,
      spanId: currentSpan?.spanId ?? activeTrace.rootSpanId,
      parentSpanId: currentSpan?.parentSpanId,
      sampled: true,
      traceFlags: 1,
    }
  }

  /**
   * 注入追踪上下文到 Headers
   */
  injectContext(
    headers: Record<string, string>,
    format: 'w3c' | 'b3' | 'sentry' = 'w3c'
  ): Record<string, string> {
    const context = this.getContext()
    if (!context || !context.spanId) return headers

    switch (format) {
      case 'w3c':
        headers['traceparent'] = `00-${context.traceId}-${context.spanId}-01`
        if (context.baggage) {
          headers['tracestate'] = Object.entries(context.baggage)
            .map(([k, v]) => `${k}=${v}`)
            .join(',')
        }
        break

      case 'b3':
        headers['X-B3-TraceId'] = context.traceId
        headers['X-B3-SpanId'] = context.spanId
        if (context.parentSpanId) {
          headers['X-B3-ParentSpanId'] = context.parentSpanId
        }
        headers['X-B3-Sampled'] = '1'
        break

      case 'sentry':
        headers['sentry-trace'] = `${context.traceId}-${context.spanId}-1`
        break
    }

    return headers
  }

  /**
   * 从 Headers 提取追踪上下文
   */
  extractContext(headers: Record<string, string | undefined>): SpanContext | undefined {
    // W3C 格式
    const traceparent = headers['traceparent'] || headers['Traceparent']
    if (traceparent) {
      const parts = traceparent.split('-')
      if (parts.length >= 3) {
        return {
          traceId: parts[1] as TraceId,
          spanId: parts[2] as SpanId,
          sampled: parts[3] === '01',
          traceFlags: parts[3] ? parseInt(parts[3], 16) : 1,
        }
      }
    }

    // B3 格式
    const b3TraceId = headers['X-B3-TraceId'] || headers['x-b3-traceid']
    const b3SpanId = headers['X-B3-SpanId'] || headers['x-b3-spanid']
    if (b3TraceId && b3SpanId) {
      return {
        traceId: b3TraceId as TraceId,
        spanId: b3SpanId as SpanId,
        parentSpanId: (headers['X-B3-ParentSpanId'] || headers['x-b3-parentspanid']) as SpanId | undefined,
        sampled: (headers['X-B3-Sampled'] || headers['x-b3-sampled']) === '1',
      }
    }

    // Sentry 格式
    const sentryTrace = headers['sentry-trace'] || headers['Sentry-Trace']
    if (sentryTrace) {
      const parts = sentryTrace.split('-')
      if (parts.length >= 2) {
        return {
          traceId: parts[0] as TraceId,
          spanId: parts[1] as SpanId,
          sampled: parts[2] === '1',
        }
      }
    }

    return undefined
  }

  /**
   * 从外部上下文恢复追踪
   */
  restoreFromContext(context: SpanContext): TraceId | undefined {
    return this.startTrace('restored-trace', {
      traceId: context.traceId,
    })
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * 查询追踪
   */
  queryTraces(filter: TraceFilter): Trace[] {
    let traces = Array.from(this.completedTraces.values())

    // 按 traceId 过滤
    if (filter.traceId) {
      traces = traces.filter(t => t.traceId === filter.traceId)
    }
    if (filter.traceIds && filter.traceIds.length > 0) {
      traces = traces.filter(t => filter.traceIds!.includes(t.traceId))
    }

    // 按服务名过滤
    if (filter.serviceName) {
      traces = traces.filter(t => 
        t.spans.some(s => s.attributes['service.name'] === filter.serviceName)
      )
    }

    // 按操作名过滤
    if (filter.operationName) {
      traces = traces.filter(t => t.rootSpanName === filter.operationName)
    }

    // 按持续时间过滤
    if (filter.minDuration !== undefined) {
      traces = traces.filter(t => t.duration >= filter.minDuration!)
    }
    if (filter.maxDuration !== undefined) {
      traces = traces.filter(t => t.duration <= filter.maxDuration!)
    }

    // 按状态过滤
    if (filter.status !== undefined) {
      traces = traces.filter(t => t.status === filter.status)
    }

    // 按错误过滤
    if (filter.hasErrors !== undefined) {
      traces = traces.filter(t => t.hasErrors === filter.hasErrors)
    }

    // 按时间范围过滤
    if (filter.timeRange) {
      const start = typeof filter.timeRange.start === 'number'
        ? filter.timeRange.start
        : filter.timeRange.start.getTime()
      const end = typeof filter.timeRange.end === 'number'
        ? filter.timeRange.end
        : filter.timeRange.end.getTime()
      traces = traces.filter(t => t.startTime >= start && t.endTime <= end)
    }

    // 分页
    if (filter.offset !== undefined) {
      traces = traces.slice(filter.offset)
    }
    if (filter.limit !== undefined) {
      traces = traces.slice(0, filter.limit)
    }

    return traces
  }

  /**
   * 获取追踪详情
   */
  getTrace(traceId: TraceId): Trace | undefined {
    return this.completedTraces.get(traceId)
  }

  /**
   * 获取当前活跃的 Span
   */
  getActiveSpan(): Span | undefined {
    const activeTrace = this.getActiveTrace()
    return activeTrace?.spanStack[activeTrace.spanStack.length - 1]
  }

  /**
   * 获取当前 Trace ID
   */
  getTraceId(): TraceId | undefined {
    return this.currentTraceId
  }

  /**
   * 获取当前 Span ID
   */
  getSpanId(): SpanId | undefined {
    return this.getActiveSpan()?.spanId
  }

  // ============================================
  // Sampling
  // ============================================

  /**
   * 判断是否应该采样
   */
  private shouldSample(traceId: TraceId): boolean {
    const strategy = this.options.samplingStrategy

    switch (strategy.type) {
      case 'always':
        return true

      case 'never':
        return false

      case 'probabilistic':
        if (!strategy.rate) return true
        const hash = this.hashString(traceId)
        return hash % 100 < strategy.rate * 100

      case 'ratelimit':
        if (!strategy.maxTracesPerSecond) return true
        const now = Date.now()
        const key = `${Math.floor(now / 1000)}`
        const timestamps = this.rateLimiter.get(key) || []
        if (timestamps.length < strategy.maxTracesPerSecond) {
          timestamps.push(now)
          this.rateLimiter.set(key, timestamps)
          return true
        }
        return false

      default:
        return true
    }
  }

  /**
   * 字符串哈希
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * 获取活跃追踪
   */
  private getActiveTrace(): ActiveTrace | undefined {
    if (!this.currentTraceId) return undefined
    return this.activeTraces.get(this.currentTraceId)
  }

  /**
   * 获取追踪状态
   */
  private getTraceStatus(spans: Span[]): SpanStatusCode {
    for (const span of spans) {
      if (span.status.code === SpanStatusCode.ERROR) {
        return SpanStatusCode.ERROR
      }
    }
    return SpanStatusCode.OK
  }

  /**
   * 统计服务数量
   */
  private countServices(spans: Span[]): number {
    const services = new Set<string>()
    for (const span of spans) {
      const serviceName = span.attributes['service.name']
      if (serviceName) {
        services.add(String(serviceName))
      }
    }
    return services.size
  }

  /**
   * 检查是否有错误
   */
  private hasErrors(spans: Span[]): boolean {
    return spans.some(s => s.status.code === SpanStatusCode.ERROR)
  }

  /**
   * 清理所有追踪数据
   */
  clear(): void {
    this.activeTraces.clear()
    this.completedTraces.clear()
    this.currentTraceId = undefined
    this.rateLimiter.clear()
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    activeTraces: number
    activeSpans: number
    completedTraces: number
  } {
    let activeSpans = 0
    const traces = Array.from(this.activeTraces.values())
    for (const trace of traces) {
      activeSpans += trace.spans.size
    }

    return {
      activeTraces: this.activeTraces.size,
      activeSpans,
      completedTraces: this.completedTraces.size,
    }
  }
}

// ============================================
// Singleton
// ============================================

let defaultManager: TraceManager | undefined

export function getTraceManager(): TraceManager {
  if (!defaultManager) {
    throw new Error('TraceManager not initialized. Call initTraceManager first.')
  }
  return defaultManager
}

export function initTraceManager(options: TraceManagerOptions): TraceManager {
  defaultManager = new TraceManager(options)
  return defaultManager
}