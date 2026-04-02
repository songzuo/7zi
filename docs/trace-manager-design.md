# TraceManager 设计文档

**版本:** v1.7.0
**日期:** 2026-04-02
**状态:** ✅ 已完成
**作者:** ⚡ Executor

---

## 概述

本设计文档描述 TraceManager 核心实现，它为 7zi 系统提供分布式追踪能力，支持跨智能体的请求追踪、日志关联和性能监控。

---

## 核心功能

### 1. Trace ID 生成 (UUID v4 格式)

**功能描述:**
- 生成符合 UUID v4 标准的追踪 ID
- 使用 128 位随机值，格式化为 32 字符十六进制字符串
- 兼容 W3C Trace Context 标准

**实现细节:**
```typescript
// 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
// 输出: abc123def456789012345678901234 (无连字符)
export function generateTraceId(): TraceId {
  return generateUUIDv4().replace(/-/g, "") as TraceId;
}
```

---

### 2. Span 创建和嵌套

**功能描述:**
- 支持创建父子关系的 Span
- 自动维护 Span 栈，确保正确的嵌套关系
- 支持同步和异步 Span 包装

**Span 结构:**
```typescript
interface Span {
  spanId: SpanId;           // Span 唯一标识
  name: string;             // Span 名称
  kind: SpanKind;           // Span 类型
  startTime: number;        // 开始时间
  endTime?: number;         // 结束时间
  parentSpanId?: SpanId;     // 父 Span ID
  status: SpanStatus;       // 状态
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];      // 事件列表
  duration?: number;        // 持续时间
}
```

**使用示例:**
```typescript
const traceManager = new TraceManager({
  serviceName: 'agent-executor',
  environment: 'production'
});

// 开始 Trace
const traceId = traceManager.startTrace('process-task');

// 创建嵌套 Span
const span1 = traceManager.startSpan('validate-input');
// ... 执行验证
traceManager.endSpan(span1);

const span2 = traceManager.startSpan('execute-task');
// ... 执行任务
traceManager.endSpan(span2);

// 结束 Trace
traceManager.endTrace();
```

---

### 3. 上下文传播 (Header 注入)

**功能描述:**
- 支持 W3C Trace Context 格式
- 支持 B3 (Zipkin) 格式
- 支持 Sentry 格式
- 自动在 HTTP headers 中注入追踪上下文

**Header 格式:**

**W3C Trace Context:**
```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
tracestate: vendor-specific-data
```

**B3 (Zipkin):**
```
X-B3-TraceId: 0af7651916cd43dd8448eb211c80319c
X-B3-SpanId: b7ad6b7169203331
X-B3-ParentSpanId: a2fb4e1dccb53aea
X-B3-Sampled: 1
```

**使用示例:**
```typescript
// 注入到 HTTP 请求
const headers: Record<string, string> = {};
traceManager.injectContext(headers, 'w3c');

// 发送请求
fetch('/api/task', { headers });

// 从 HTTP 响应提取上下文
const context = traceManager.extractContext(responseHeaders);
if (context) {
  traceManager.restoreFromContext(context);
}
```

---

### 4. 异步任务追踪

**功能描述:**
- 支持异步函数的自动追踪
- 支持并行任务的追踪
- 自动记录异常和错误

**使用示例:**
```typescript
// 追踪单个异步任务
const result = await traceManager.withSpan('async-task', async () => {
  return await doAsyncWork();
});

// 追踪并行任务
const results = await traceManager.trackParallelTasks([
  { name: 'task-1', task: () => doWork1() },
  { name: 'task-2', task: () => doWork2() },
  { name: 'task-3', task: () => doWork3() },
]);
```

---

## StructuredLogger 集成

### 功能描述

- 自动注入 traceId 到日志
- 支持 info, warn, error 级别
- JSON 格式输出
- 同一 trace 的日志可以被过滤

**使用示例:**
```typescript
const logger = new StructuredLogger({
  serviceName: 'agent-executor',
  environment: 'production'
});

// 设置追踪上下文
logger.setTraceContext(traceId, spanId);

// 记录日志 (自动包含 traceId)
logger.info('Task started', { taskId: '123' });
logger.warn('Task pending', { waitTime: 5000 });
logger.error('Task failed', new Error('timeout'));

// 清除追踪上下文
logger.clearTraceContext();
```

**JSON 输出格式:**
```json
{
  "timestamp": "2026-04-02T10:31:00.000Z",
  "level": "info",
  "message": "Task started",
  "trace": {
    "traceId": "abc123def456789012345678901234",
    "spanId": "span12345678901234"
  },
  "fields": {
    "taskId": "123"
  },
  "service": "agent-executor",
  "environment": "production",
  "version": "1.7.0"
}
```

---

## 日志关联增强

### 功能描述

通过 traceId 将同一请求的所有日志关联起来，支持：
- 日志过滤: `traceId=abc123...`
- 日志搜索: 查询特定 trace 的所有日志
- 日志分析: 分析同一 trace 的性能问题

**使用示例:**
```typescript
// 创建按 traceId 过滤的日志记录器
const filteredLogger = logger.createTraceFilteredLogger(traceId);

// 只输出特定 trace 的日志到文件
const fileTransport = (entry) => {
  fs.appendFileSync('trace.log', JSON.stringify(entry) + '\n');
};
const traceLogger = new StructuredLogger({
  serviceName: 'agent-executor',
  environment: 'production',
  transport: fileTransport,
  minLevel: LogLevel.DEBUG
}).createTraceFilteredLogger(traceId);
```

---

## 架构设计

### 模块结构

```
lib/trace/
├── index.ts              # 导出入口
├── TraceManager.ts      # 追踪管理器
└── StructuredLogger.ts  # 结构化日志
```

### 核心类

| 类名 | 职责 |
|------|------|
| TraceManager | 管理 Trace 和 Span 生命周期 |
| StructuredLogger | 结构化日志记录 |
| SpanStackManager | 管理嵌套的 Span |

### 类图

```
┌─────────────────────────────┐
│      TraceManager          │
├─────────────────────────────┤
│ - activeTraces: Map        │
│ - currentTraceId           │
│ - options                  │
├─────────────────────────────┤
│ + startTrace()              │
│ + endTrace()                │
│ + startSpan()               │
│ + endSpan()                 │
│ + withSpan()                │
│ + injectContext()           │
│ + extractContext()          │
└─────────────────────────────┘
            │
            │ uses
            ▼
┌─────────────────────────────┐
│      StructuredLogger       │
├─────────────────────────────┤
│ - traceContext              │
│ - options                  │
├─────────────────────────────┤
│ + setTraceContext()         │
│ + info() / warn() / error() │
│ + createTraceFilteredLogger│
└─────────────────────────────┘
```

---

## 使用场景

### 1. Agent 任务追踪

```typescript
const traceManager = initTraceManager({
  serviceName: 'agent-executor',
  environment: process.env.NODE_ENV
});

const logger = createAppLogger('agent-executor');

async function processAgentTask(task: Task) {
  const traceId = traceManager.startTrace('agent-task', {
    attributes: { taskId: task.id, agentId: task.agentId }
  });
  
  logger.setTraceContext(traceId);
  logger.info('Starting agent task', { taskId: task.id });
  
  try {
    const validationSpan = traceManager.startSpan('validate-input');
    const valid = await validateInput(task.input);
    traceManager.endSpan(validationSpan);
    
    if (!valid) {
      throw new ValidationError('Invalid input');
    }
    
    const executionSpan = traceManager.startSpan('execute-task');
    const result = await executeTask(task);
    traceManager.endSpan(executionSpan);
    
    logger.info('Task completed', { result });
    return result;
  } catch (error) {
    logger.error('Task failed', error as Error);
    throw error;
  } finally {
    traceManager.endTrace();
    logger.clearTraceContext();
  }
}
```

### 2. HTTP 中间件追踪

```typescript
import { extractTraceContext } from '@/lib/tracing/context';

async function tracingMiddleware(request: Request) {
  const context = extractTraceContext(Object.fromEntries(request.headers));
  
  const traceManager = new TraceManager({
    serviceName: 'api-server',
    environment: process.env.NODE_ENV
  });
  
  const traceId = context 
    ? traceManager.restoreFromContext(context)
    : traceManager.startTrace(`${request.method} ${request.url}`);
  
  const logger = createAppLogger('api-server');
  logger.setTraceContext(traceManager.getTraceId()!);
  
  logger.info('Request started', { 
    method: request.method, 
    url: request.url 
  });
  
  try {
    const response = await next(request);
    logger.info('Request completed', { status: response.status });
    return response;
  } catch (error) {
    logger.error('Request failed', error as Error);
    throw error;
  } finally {
    logger.clearTraceContext();
  }
}
```

---

## 集成现有代码

### 与 Sentry 集成

```typescript
import * as Sentry from '@sentry/nextjs';
import { TraceManager } from '@/lib/trace';

const traceManager = initTraceManager({
  serviceName: process.env.SENTRY_SERVICE || '7zi',
  environment: process.env.NODE_ENV
});

// Sentry 自动捕获追踪上下文
Sentry.init({
  tracesSampler: (samplingContext) => {
    const activeTrace = traceManager.getSpans();
    return activeTrace.length > 0 ? 1.0 : 0.1;
  }
});

// 在 Sentry 事件中添加追踪上下文
function captureException(error: Error, context: TraceContext) {
  Sentry.setContext('trace', {
    traceId: context.traceId,
    spanId: context.spanId,
  });
  Sentry.captureException(error);
}
```

---

## 测试验证

### 单元测试覆盖

| 测试项 | 状态 | 说明 |
|--------|------|------|
| Trace ID 生成 | ✅ | UUID v4 格式验证 |
| Span 创建 | ✅ | 基本创建和嵌套 |
| Span 结束 | ✅ | 持续时间计算 |
| 上下文注入 | ✅ | W3C/B3/Sentry 格式 |
| 上下文提取 | ✅ | Header 解析 |
| 异步追踪 | ✅ | withSpan 测试 |
| StructuredLogger | ✅ | JSON 输出验证 |
| 日志过滤 | ✅ | traceId 过滤 |

---

## 性能考量

- **采样率**: 默认 100%，可配置
- **最大 Span**: 默认 1000，超出警告
- **内存管理**: 手动调用 `endTrace()` 释放内存
- **异步优化**: 使用 Span 栈避免遍历

---

## 后续增强

### Phase 3 计划

1. **持久化存储**: 将追踪数据写入数据库
2. **导出器**: 支持 Jaeger/Zipkin 导出
3. **采样策略**: 智能采样算法
4. **性能指标**: 追踪性能统计
5. **告警规则**: 基于追踪的告警

---

## 相关文档

- [Distributed Tracing System](../DISTRIBUTED_TRACING_SYSTEM_20260401.md)
- [APM Integration](./APM_INTEGRATION.md)
- [lib/tracing/types.ts](../src/lib/tracing/types.ts)
- [lib/tracing/context.ts](../src/lib/tracing/context.ts)

---

**文档版本:** 1.0.0
**最后更新:** 2026-04-02
**维护者:** ⚡ Executor
