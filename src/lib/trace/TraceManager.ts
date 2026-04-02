/**
 * TraceManager - 分布式追踪核心管理器
 * 
 * 功能：
 * - Trace ID 生成 (UUID v4 格式)
 * - Span 创建和嵌套
 * - 上下文传播 (header 注入)
 * - 异步任务追踪
 * 
 * @version v1.7.0
 * @author AI Executor
 */

import {
  type TraceId,
  type SpanId,
  type Span,
  type SpanOptions,
  type SpanStatus,
  type TraceContext,
  type TraceMetadata,
  SpanStatusCode,
  SpanKind,
  generateTraceId as generateTraceIdBase,
  generateSpanId as generateSpanIdBase,
} from "../tracing/types";

// ============================================
// UUID v4 Generation
// ============================================

/**
 * 生成 UUID v4 格式的 Trace ID
 * 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUIDv4(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for environments without crypto.randomUUID
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Node.js fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("crypto").randomFillSync(bytes);
  }
  
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * 生成 Trace ID (UUID v4 格式，去掉连字符)
 */
export function generateTraceId(): TraceId {
  return generateUUIDv4().replace(/-/g, "") as TraceId;
}

/**
 * 生成 Span ID
 */
export function generateSpanId(): SpanId {
  return generateSpanIdBase();
}

// ============================================
// Span Stack Manager
// ============================================

/**
 * Span 栈管理器
 * 用于管理嵌套的 Span
 */
class SpanStackManager {
  private stack: Span[] = [];

  /**
   * 推入 Span
   */
  push(span: Span): void {
    this.stack.push(span);
  }

  /**
   * 弹出 Span
   */
  pop(): Span | undefined {
    return this.stack.pop();
  }

  /**
   * 获取当前 Span
   */
  current(): Span | undefined {
    return this.stack[this.stack.length - 1];
  }

  /**
   * 获取栈深度
   */
  depth(): number {
    return this.stack.length;
  }

  /**
   * 获取所有活跃 Span
   */
  all(): Span[] {
    return [...this.stack];
  }

  /**
   * 清空栈
   */
  clear(): void {
    this.stack = [];
  }
}

// ============================================
// TraceManager Options
// ============================================

export interface TraceManagerOptions {
  /** 服务名称 */
  serviceName: string;
  /** 服务版本 */
  serviceVersion?: string;
  /** 环境标识 */
  environment?: string;
  /** 是否启用采样 */
  samplingEnabled?: boolean;
  /** 采样率 (0-1) */
  samplingRate?: number;
  /** 自动记录异常 */
  recordExceptions?: boolean;
  /** 最大 Span 数量 */
  maxSpans?: number;
}

// ============================================
// Active Trace
// ============================================

interface ActiveTrace {
  traceId: TraceId;
  rootSpanId: SpanId;
  spans: Map<SpanId, Span>;
  metadata: TraceMetadata;
  startTime: number;
  spanStack: SpanStackManager;
}

// ============================================
// TraceManager Core Class
// ============================================

/**
 * TraceManager - 分布式追踪核心管理器
 * 
 * 使用示例:
 * ```typescript
 * const traceManager = new TraceManager({
 *   serviceName: 'agent-executor',
 *   environment: 'production'
 * });
 * 
 * // 开始一个新的 Trace
 * const traceId = traceManager.startTrace('process-task', {
 *   attributes: { taskId: '123' }
 * });
 * 
 * // 创建嵌套 Span
 * const span1 = traceManager.startSpan('validate-input');
 * // ... do work
 * traceManager.endSpan(span1);
 * 
 * // 结束 Trace
 * traceManager.endTrace();
 * ```
 */
export class TraceManager {
  private options: Required<TraceManagerOptions>;
  private activeTraces: Map<TraceId, ActiveTrace> = new Map();
  private currentTraceId: TraceId | undefined;

  constructor(options: TraceManagerOptions) {
    this.options = {
      serviceName: options.serviceName,
      serviceVersion: options.serviceVersion ?? "1.0.0",
      environment: options.environment ?? "development",
      samplingEnabled: options.samplingEnabled ?? true,
      samplingRate: options.samplingRate ?? 1.0,
      recordExceptions: options.recordExceptions ?? true,
      maxSpans: options.maxSpans ?? 1000,
    };
  }

  // ============================================
  // Trace Lifecycle
  // ============================================

  /**
   * 开始一个新的 Trace
   * @param name Trace 名称
   * @param options 可选配置
   * @returns Trace ID
   */
  startTrace(
    name: string,
    options?: {
      traceId?: TraceId;
      attributes?: Record<string, string | number | boolean>;
      metadata?: Partial<TraceMetadata>;
    }
  ): TraceId {
    const traceId = options?.traceId ?? generateTraceId();
    const rootSpanId = generateSpanId();
    
    // 检查采样
    if (!this.shouldSample(traceId)) {
      return traceId;
    }

    const metadata: TraceMetadata = {
      serviceName: this.options.serviceName,
      serviceVersion: this.options.serviceVersion,
      environment: this.options.environment,
      operationType: options?.metadata?.operationType ?? "custom" as any,
      ...options?.metadata,
    };

    // 创建根 Span
    const rootSpan: Span = {
      spanId: rootSpanId,
      name,
      kind: SpanKind.INTERNAL,
      startTime: Date.now(),
      status: { code: SpanStatusCode.UNSET },
      attributes: {
        "service.name": this.options.serviceName,
        "service.version": this.options.serviceVersion,
        ...options?.attributes,
      },
      events: [],
      links: [],
    };

    // 创建活跃追踪记录
    const activeTrace: ActiveTrace = {
      traceId,
      rootSpanId,
      spans: new Map([[rootSpanId, rootSpan]]),
      metadata,
      startTime: Date.now(),
      spanStack: new SpanStackManager(),
    };

    activeTrace.spanStack.push(rootSpan);
    this.activeTraces.set(traceId, activeTrace);
    this.currentTraceId = traceId;

    return traceId;
  }

  /**
   * 结束当前 Trace
   * @param traceId 可选，不传则使用当前 Trace
   */
  endTrace(traceId?: TraceId): Span[] | undefined {
    const id = traceId ?? this.currentTraceId;
    if (!id) return undefined;

    const activeTrace = this.activeTraces.get(id);
    if (!activeTrace) return undefined;

    // 结束所有未关闭的 Span
    const spans = Array.from(activeTrace.spans.values());
    const now = Date.now();

    for (const span of spans) {
      if (span.endTime === undefined) {
        span.endTime = now;
        span.duration = now - span.startTime;
      }
    }

    // 设置根 Span 的结束时间
    const rootSpan = activeTrace.spans.get(activeTrace.rootSpanId);
    if (rootSpan && rootSpan.endTime === undefined) {
      rootSpan.endTime = now;
      rootSpan.duration = now - rootSpan.startTime;
    }

    // 清理
    this.activeTraces.delete(id);
    activeTrace.spanStack.clear();

    if (this.currentTraceId === id) {
      this.currentTraceId = undefined;
    }

    return spans;
  }

  // ============================================
  // Span Lifecycle
  // ============================================

  /**
   * 开始一个新的 Span
   * @param name Span 名称
   * @param options 可选配置
   * @returns Span 对象
   */
  startSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    }
  ): Span | undefined {
    const activeTrace = this.getActiveTrace();
    if (!activeTrace) return undefined;

    // 检查 Span 数量限制
    if (activeTrace.spans.size >= this.options.maxSpans) {
      console.warn(`TraceManager: Max spans (${this.options.maxSpans}) reached for trace ${activeTrace.traceId}`);
      return undefined;
    }

    const spanId = generateSpanId();
    const parentSpan = activeTrace.spanStack.current();
    
    const span: Span = {
      spanId,
      name,
      kind: options?.kind ?? SpanKind.INTERNAL,
      startTime: Date.now(),
      parentSpanId: parentSpan?.spanId,
      status: { code: SpanStatusCode.UNSET },
      attributes: options?.attributes ?? {},
      events: [],
      links: [],
    };

    activeTrace.spans.set(spanId, span);
    activeTrace.spanStack.push(span);

    return span;
  }

  /**
   * 结束 Span
   * @param span Span 对象或 Span ID
   * @param status 可选状态
   */
  endSpan(span: Span | SpanId, status?: SpanStatus): void {
    const activeTrace = this.getActiveTrace();
    if (!activeTrace) return;

    let spanObj: Span | undefined;
    if (typeof span === "string") {
      spanObj = activeTrace.spans.get(span as SpanId);
    } else {
      spanObj = span;
    }

    if (!spanObj) return;

    spanObj.endTime = Date.now();
    spanObj.duration = spanObj.endTime - spanObj.startTime;

    if (status) {
      spanObj.status = status;
    }

    // 从栈中弹出
    const currentSpan = activeTrace.spanStack.current();
    if (currentSpan?.spanId === spanObj.spanId) {
      activeTrace.spanStack.pop();
    }
  }

  /**
   * 使用 Span 包装异步函数
   * @param name Span 名称
   * @param fn 要执行的函数
   * @param options 可选配置
   */
  async withSpan<T>(
    name: string,
    fn: () => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    }
  ): Promise<T> {
    const span = this.startSpan(name, options);
    if (!span) {
      return fn();
    }

    try {
      const result = await fn();
      this.endSpan(span, { code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      this.endSpan(span, {
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      
      if (this.options.recordExceptions) {
        this.addEvent(span, "exception", {
          "exception.type": error instanceof Error ? error.constructor.name : "Unknown",
          "exception.message": error instanceof Error ? error.message : String(error),
          "exception.stacktrace": error instanceof Error ? error.stack ?? "" : "",
        });
      }
      
      throw error;
    }
  }

  /**
   * 使用 Span 包装同步函数
   */
  withSpanSync<T>(
    name: string,
    fn: () => T,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    }
  ): T {
    const span = this.startSpan(name, options);
    if (!span) {
      return fn();
    }

    try {
      const result = fn();
      this.endSpan(span, { code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      this.endSpan(span, {
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================
  // Span Operations
  // ============================================

  /**
   * 添加 Span 事件
   */
  addEvent(
    span: Span,
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): void {
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  /**
   * 设置 Span 属性
   */
  setAttribute(
    span: Span,
    key: string,
    value: string | number | boolean
  ): void {
    span.attributes[key] = value;
  }

  /**
   * 设置 Span 状态
   */
  setStatus(span: Span, status: SpanStatus): void {
    span.status = status;
  }

  /**
   * 记录异常
   */
  recordException(span: Span, error: Error | unknown): void {
    this.setStatus(span, {
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });

    this.addEvent(span, "exception", {
      "exception.type": error instanceof Error ? error.constructor.name : "Unknown",
      "exception.message": error instanceof Error ? error.message : String(error),
      "exception.stacktrace": error instanceof Error ? error.stack ?? "" : "",
    });
  }

  // ============================================
  // Context Propagation
  // ============================================

  /**
   * 获取当前 Trace ID
   */
  getTraceId(): TraceId | undefined {
    return this.currentTraceId;
  }

  /**
   * 获取当前 Span ID
   */
  getSpanId(): SpanId | undefined {
    const activeTrace = this.getActiveTrace();
    return activeTrace?.spanStack.current()?.spanId;
  }

  /**
   * 获取当前 Trace Context
   */
  getContext(): TraceContext | undefined {
    const activeTrace = this.getActiveTrace();
    if (!activeTrace) return undefined;

    const currentSpan = activeTrace.spanStack.current();
    return {
      traceId: activeTrace.traceId,
      spanId: currentSpan?.spanId ?? activeTrace.rootSpanId,
      parentSpanId: currentSpan?.parentSpanId,
      sampled: true,
      traceFlags: 1,
    };
  }

  /**
   * 注入追踪上下文到 Headers
   * @param headers 目标 Headers 对象
   * @param format 格式类型
   */
  injectContext(
    headers: Record<string, string>,
    format: "w3c" | "b3" | "sentry" = "w3c"
  ): Record<string, string> {
    const context = this.getContext();
    if (!context) return headers;

    switch (format) {
      case "w3c":
        headers["traceparent"] = `00-${context.traceId}-${context.spanId}-01`;
        if (context.baggage) {
          headers["tracestate"] = Object.entries(context.baggage)
            .map(([k, v]) => `${k}=${v}`)
            .join(",");
        }
        break;

      case "b3":
        headers["X-B3-TraceId"] = context.traceId;
        headers["X-B3-SpanId"] = context.spanId;
        if (context.parentSpanId) {
          headers["X-B3-ParentSpanId"] = context.parentSpanId;
        }
        headers["X-B3-Sampled"] = "1";
        break;

      case "sentry":
        headers["sentry-trace"] = `${context.traceId}-${context.spanId}-1`;
        break;
    }

    return headers;
  }

  /**
   * 从 Headers 提取追踪上下文
   */
  extractContext(
    headers: Record<string, string | undefined>
  ): TraceContext | undefined {
    // 尝试 W3C 格式
    const traceparent = headers["traceparent"] || headers["Traceparent"];
    if (traceparent) {
      const parts = traceparent.split("-");
      if (parts.length >= 3) {
        return {
          traceId: parts[1] as TraceId,
          spanId: parts[2] as SpanId,
          sampled: parts[3] === "01",
          traceFlags: parts[3] ? parseInt(parts[3], 16) : 1,
        };
      }
    }

    // 尝试 B3 格式
    const b3TraceId = headers["X-B3-TraceId"] || headers["x-b3-traceid"];
    const b3SpanId = headers["X-B3-SpanId"] || headers["x-b3-spanid"];
    if (b3TraceId && b3SpanId) {
      return {
        traceId: b3TraceId as TraceId,
        spanId: b3SpanId as SpanId,
        parentSpanId: (headers["X-B3-ParentSpanId"] || headers["x-b3-parentspanid"]) as SpanId | undefined,
        sampled: (headers["X-B3-Sampled"] || headers["x-b3-sampled"]) === "1",
      };
    }

    // 尝试 Sentry 格式
    const sentryTrace = headers["sentry-trace"] || headers["Sentry-Trace"];
    if (sentryTrace) {
      const parts = sentryTrace.split("-");
      if (parts.length >= 2) {
        return {
          traceId: parts[0] as TraceId,
          spanId: parts[1] as SpanId,
          sampled: parts[2] === "1",
        };
      }
    }

    return undefined;
  }

  /**
   * 从外部上下文恢复追踪
   */
  restoreFromContext(context: TraceContext): TraceId | undefined {
    // 创建一个新的 trace，使用现有的 traceId
    return this.startTrace("restored-trace", {
      traceId: context.traceId,
    });
  }

  // ============================================
  // Async Task Tracking
  // ============================================

  /**
   * 追踪异步任务
   * @param taskName 任务名称
   * @param task 异步任务函数
   * @param options 可选配置
   */
  async trackAsyncTask<T>(
    taskName: string,
    task: (span: Span) => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    }
  ): Promise<T> {
    return this.withSpan(taskName, () => {
      const span = this.getActiveSpan();
      if (!span) throw new Error("No active span");
      return task(span);
    }, options);
  }

  /**
   * 并行追踪多个异步任务
   */
  async trackParallelTasks<T>(
    tasks: Array<{
      name: string;
      task: () => Promise<T>;
      attributes?: Record<string, string | number | boolean>;
    }>
  ): Promise<T[]> {
    return Promise.all(
      tasks.map(({ name, task, attributes }) =>
        this.withSpan(name, task, { attributes })
      )
    );
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * 获取活跃的 Trace
   */
  private getActiveTrace(): ActiveTrace | undefined {
    if (!this.currentTraceId) return undefined;
    return this.activeTraces.get(this.currentTraceId);
  }

  /**
   * 获取当前活跃的 Span
   */
  getActiveSpan(): Span | undefined {
    const activeTrace = this.getActiveTrace();
    return activeTrace?.spanStack.current();
  }

  /**
   * 获取所有 Span
   */
  getSpans(traceId?: TraceId): Span[] {
    const id = traceId ?? this.currentTraceId;
    if (!id) return [];

    const activeTrace = this.activeTraces.get(id);
    return activeTrace ? Array.from(activeTrace.spans.values()) : [];
  }

  /**
   * 获取 Span 数量
   */
  getSpanCount(traceId?: TraceId): number {
    return this.getSpans(traceId).length;
  }

  /**
   * 获取 Span 栈深度
   */
  getStackDepth(): number {
    const activeTrace = this.getActiveTrace();
    return activeTrace?.spanStack.depth() ?? 0;
  }

  // ============================================
  // Sampling
  // ============================================

  /**
   * 判断是否应该采样
   */
  private shouldSample(traceId: TraceId): boolean {
    if (!this.options.samplingEnabled) return true;
    if (this.options.samplingRate >= 1) return true;
    if (this.options.samplingRate <= 0) return false;

    // 使用 traceId 的哈希值进行确定性采样
    const hash = this.hashString(traceId);
    return (hash % 100) < this.options.samplingRate * 100;
  }

  /**
   * 简单字符串哈希
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ============================================
  // Export
  // ============================================

  /**
   * 导出追踪数据 (JSON 格式)
   */
  exportTrace(traceId?: TraceId): object | undefined {
    const id = traceId ?? this.currentTraceId;
    if (!id) return undefined;

    const activeTrace = this.activeTraces.get(id);
    if (!activeTrace) return undefined;

    return {
      traceId: activeTrace.traceId,
      rootSpanId: activeTrace.rootSpanId,
      metadata: activeTrace.metadata,
      startTime: activeTrace.startTime,
      spans: Array.from(activeTrace.spans.values()).map(span => ({
        ...span,
        duration: span.endTime ? span.endTime - span.startTime : undefined,
      })),
    };
  }

  /**
   * 清理所有追踪数据
   */
  clear(): void {
    this.activeTraces.clear();
    this.currentTraceId = undefined;
  }
}

// ============================================
// Singleton Instance
// ============================================

let defaultInstance: TraceManager | undefined;

/**
 * 获取默认 TraceManager 实例
 */
export function getTraceManager(options?: TraceManagerOptions): TraceManager {
  if (!defaultInstance && options) {
    defaultInstance = new TraceManager(options);
  }
  if (!defaultInstance) {
    throw new Error("TraceManager not initialized. Call getTraceManager with options first.");
  }
  return defaultInstance;
}

/**
 * 初始化默认 TraceManager
 */
export function initTraceManager(options: TraceManagerOptions): TraceManager {
  defaultInstance = new TraceManager(options);
  return defaultInstance;
}

// ============================================
// Re-exports
// ============================================

export { SpanStatusCode, SpanKind };
export type { Span, SpanStatus, SpanOptions, TraceContext, TraceMetadata };
