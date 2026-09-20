# Observability Hub - 可观测性中心

企业级可观测性系统，集成 **Metrics**、**Tracing**、**Logging** 三大支柱，提供完整的监控、追踪和日志分析能力。

## 功能特性

### 1. 统一指标 (Metrics)

- **四种指标类型**: Counter、Gauge、Histogram、Summary
- **OpenTelemetry 兼容**: 遵循 OpenTelemetry 指标规范
- **Prometheus 导出**: 原生支持 Prometheus 格式导出
- **指标聚合**: 支持求和、平均、最小、最大、分位数等聚合操作
- **标签支持**: 灵活的标签/维度系统

### 2. 分布式追踪 (Tracing)

- **OpenTelemetry 追踪**: 基于 OpenTelemetry 概念实现
- **Span 关联**: 支持嵌套 Span 和父子关系
- **上下文传播**: 支持 W3C、B3、Sentry 等多种格式
- **采样策略**: 支持始终采样、概率采样、速率限制等策略
- **链路可视化**: 提供完整的追踪数据用于可视化

### 3. 日志关联 (Logging)

- **结构化日志**: JSON 格式输出，易于解析和分析
- **自动注入**: 自动注入 `trace_id` 和 `span_id`
- **日志级别**: DEBUG、INFO、WARN、ERROR、FATAL
- **日志搜索**: 支持按级别、消息、追踪 ID 等条件查询
- **日志聚合**: 按级别聚合统计

### 4. 仪表板 (Dashboard)

- **实时指标展示**: 多种图表类型（折线图、柱状图、仪表盘、热力图等）
- **追踪查询**: 查看最近的追踪和慢追踪
- **日志列表**: 实时查看日志流
- **告警规则**: 配置告警规则，自动评估和通知
- **自定义视图**: 灵活配置仪表板布局

## 快速开始

### 基础使用

```typescript
import { ObservabilityHub } from './observability'

// 初始化
const hub = new ObservabilityHub({
  serviceName: 'my-service',
  environment: 'production',
})

// 记录指标
hub.recordMetric('http_requests_total', 1, { method: 'GET', path: '/api/users' })
hub.incrementCounter('errors_total', 1, { type: 'timeout' })
hub.setGauge('active_connections', 42)
hub.observeHistogram('request_duration_ms', 123)

// 创建追踪
const traceId = hub.startTrace('handle-request', {
  attributes: { userId: '123', requestId: 'abc' }
})

// 创建嵌套 Span
const dbSpan = hub.startSpan('database-query', { attributes: { query: 'SELECT * FROM users' } })
// ... 执行数据库操作
hub.endSpan(dbSpan)

const cacheSpan = hub.startSpan('cache-lookup')
// ... 执行缓存操作
hub.endSpan(cacheSpan)

// 结束追踪
hub.endTrace()

// 记录日志
hub.logInfo('Request processed successfully', { traceId, userId: '123' })
hub.logWarn('Cache miss', { traceId, key: 'user:123' })
hub.logError('Database connection failed', new Error('Connection timeout'), { traceId })
```

### 使用便捷方法

```typescript
// 自动处理追踪和日志
const result = await hub.traceFunction('process-payment', async (traceId) => {
  // 自动记录开始/结束日志
  // 自动创建追踪上下文
  
  const payment = await processPayment()
  return payment
}, {
  attributes: { orderId: '123' },
  logLevel: 'info'
})

// 创建完整的追踪上下文
const ctx = hub.createTraceContext('handle-request', { userId: '123' })
ctx.setLoggerContext() // 自动设置日志上下文

const span = ctx.startSpan('validate-input')
// ... 执行操作
ctx.endSpan(span)

hub.logInfo('Input validated', { userId: '123' })

ctx.endTrace()
ctx.clearLoggerContext()
```

### 查询数据

```typescript
// 查询指标
const metrics = hub.queryMetrics({
  names: ['http_requests_total', 'request_duration_ms'],
  tags: { method: 'GET' },
  timeRange: { start: Date.now() - 3600000, end: Date.now() },
  aggregation: 'avg',
})

// 查询追踪
const traces = hub.queryTraces({
  minDuration: 1000,
  hasErrors: true,
  limit: 20,
})

// 查询日志
const logs = hub.queryLogs({
  levels: [LogLevel.ERROR, LogLevel.FATAL],
  timeRange: { start: Date.now() - 3600000, end: Date.now() },
  limit: 100,
})

// 获取仪表板数据
const dashboardData = await hub.getDashboardMetrics({
  start: Date.now() - 3600000,
  end: Date.now(),
})
```

### Prometheus 集成

```typescript
// 导出 Prometheus 格式
const prometheusMetrics = hub.exportPrometheus()

// 获取 HTTP Handler (用于 Express/Fastify)
const handler = hub.getPrometheusHandler()

// Express 示例
app.get('/metrics', handler)

// Fastify 示例
fastify.get('/metrics', handler)
```

### 上下文传播

```typescript
// 注入追踪上下文到 HTTP Headers
const headers = hub.injectTraceContext({}, 'w3c')
// headers = { traceparent: '00-abc123-def456-01' }

// 从 Headers 提取追踪上下文
const context = hub.extractTraceContext(headers)
// context = { traceId: 'abc123', spanId: 'def456', sampled: true }

// 恢复追踪
hub.traceManager.restoreFromContext(context)
```

## 配置选项

```typescript
const hub = new ObservabilityHub({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  
  metrics: {
    enabled: true,
    collectInterval: 60000,      // 60秒
    exportInterval: 15000,       // 15秒
    prometheusEnabled: true,
    prometheusPort: 9090,
  },
  
  tracing: {
    enabled: true,
    samplingStrategy: {
      type: 'probabilistic',
      rate: 0.1,  // 10% 采样率
    },
    maxSpansPerTrace: 1000,
    exportEndpoint: 'https://otel-collector:4318',
  },
  
  logging: {
    enabled: true,
    minLevel: LogLevel.INFO,
    consoleEnabled: true,
    fileEnabled: false,
    filePath: '/var/log/app.log',
    jsonOutput: true,
  },
  
  dashboard: {
    enabled: true,
    refreshInterval: 30000,  // 30秒
  },
  
  alerts: {
    enabled: true,
    checkInterval: 60000,  // 60秒
  },
})
```

## 采样策略

### 始终采样

```typescript
samplingStrategy: { type: 'always' }
```

### 概率采样

```typescript
samplingStrategy: {
  type: 'probabilistic',
  rate: 0.1,  // 10% 采样率
}
```

### 速率限制

```typescript
samplingStrategy: {
  type: 'ratelimit',
  maxTracesPerSecond: 100,
}
```

## 告警规则

```typescript
// 创建告警规则
hub.createAlertRule({
  id: 'high-error-rate',
  name: 'High Error Rate',
  description: 'Alert when error rate exceeds 5%',
  severity: AlertSeverity.WARNING,
  enabled: true,
  condition: {
    type: 'metric',
    query: { names: ['error_rate'] },
    operator: 'gt',
    threshold: 0.05,
    aggregation: 'avg',
  },
  labels: { team: 'platform' },
  annotations: { summary: 'Error rate is above 5%' },
})

// 获取活跃告警
const alerts = hub.getActiveAlerts()

// 手动评估告警
const newAlerts = hub.evaluateAlerts()
```

## 仪表板

```typescript
// 创建自定义仪表板
hub.createDashboard({
  id: 'custom-dashboard',
  name: 'Custom Dashboard',
  description: 'My custom dashboard',
  widgets: [
    {
      id: 'request-rate',
      type: WidgetType.LINE_CHART,
      title: 'Request Rate',
      width: 6,
      height: 4,
      x: 0,
      y: 0,
      config: {},
      dataSource: {
        type: 'metric',
        query: { names: ['http_requests_total'] },
      },
    },
    // ... 更多小组件
  ],
})

// 获取仪表板数据
const data = await hub.dashboardManager.getDashboardData('custom-dashboard', {
  start: Date.now() - 3600000,
  end: Date.now(),
})
```

## API 参考

### 核心方法

| 方法 | 描述 |
|------|------|
| `recordMetric(name, value, tags)` | 记录指标值 |
| `incrementCounter(name, value, tags)` | 递增计数器 |
| `setGauge(name, value, tags)` | 设置仪表值 |
| `observeHistogram(name, value, tags)` | 观察直方图值 |
| `startTimer(name, tags)` | 创建计时器 |
| `startTrace(name, options)` | 开始追踪 |
| `endTrace(traceId)` | 结束追踪 |
| `startSpan(name, options)` | 开始 Span |
| `endSpan(span, status)` | 结束 Span |
| `withSpan(name, fn, options)` | 使用 Span 包装异步函数 |
| `logInfo(message, fields)` | 记录信息日志 |
| `logWarn(message, fields)` | 记录警告日志 |
| `logError(message, error, fields)` | 记录错误日志 |
| `queryMetrics(filter)` | 查询指标 |
| `queryTraces(filter)` | 查询追踪 |
| `queryLogs(filter)` | 查询日志 |
| `getDashboardMetrics(timeRange)` | 获取仪表板数据 |

### 便捷方法

| 方法 | 描述 |
|------|------|
| `traceFunction(name, fn, options)` | 自动处理追踪和日志 |
| `createTraceContext(name, attributes)` | 创建完整追踪上下文 |
| `injectTraceContext(headers, format)` | 注入追踪上下文 |
| `extractTraceContext(headers)` | 提取追踪上下文 |

## 类型定义

```typescript
// 指标类型
enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

// 日志级别
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// Span 类型
enum SpanKind {
  INTERNAL = 0,
  SERVER = 1,
  CLIENT = 2,
  PRODUCER = 3,
  CONSUMER = 4,
}

// 告警严重程度
enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// 小组件类型
enum WidgetType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  GAUGE = 'gauge',
  STAT = 'stat',
  TABLE = 'table',
  HEATMAP = 'heatmap',
  TRACE_LIST = 'trace_list',
  LOG_LIST = 'log_list',
}
```

## 最佳实践

### 1. 指标命名

- 使用 `snake_case` 命名
- Counter 使用 `_total` 后缀
- Gauge 使用当前状态
- Histogram/Summary 使用 `_ms` 或 `_seconds` 后缀表示单位

```typescript
// ✅ 好的命名
hub.recordMetric('http_requests_total', 1)
hub.recordMetric('request_duration_ms', 123)
hub.setGauge('active_connections', 42)

// ❌ 不好的命名
hub.recordMetric('HTTPRequests', 1)
hub.recordMetric('duration', 123)
```

### 2. 标签使用

- 标签基数不宜过高（避免高基数问题）
- 使用有意义的标签
- 避免使用用户 ID、请求 ID 等高基数标签

```typescript
// ✅ 好的标签
hub.recordMetric('http_requests_total', 1, {
  method: 'GET',
  path: '/api/users',
  status: '200',
})

// ❌ 不好的标签
hub.recordMetric('http_requests_total', 1, {
  userId: '123',  // 高基数
  requestId: 'abc',  // 高基数
})
```

### 3. 追踪粒度

- 合理控制 Span 数量
- 关键操作创建 Span
- 避免过细粒度的追踪

```typescript
// ✅ 合理的追踪
const traceId = hub.startTrace('handle-request')
const dbSpan = hub.startSpan('database-query')
// ... 执行操作
hub.endSpan(dbSpan)
hub.endTrace()

// ❌ 过细的追踪
const traceId = hub.startTrace('handle-request')
const span1 = hub.startSpan('parse-request')
hub.endSpan(span1)
const span2 = hub.startSpan('validate-input')
hub.endSpan(span2)
const span3 = hub.startSpan('check-auth')
hub.endSpan(span3)
// ... 太多 Span
```

### 4. 日志级别

- DEBUG: 详细调试信息
- INFO: 正常操作信息
- WARN: 警告信息（不影响功能）
- ERROR: 错误信息（影响功能）
- FATAL: 致命错误（需要立即处理）

```typescript
hub.logDebug('Processing request', { requestId: '123' })
hub.logInfo('Request completed', { requestId: '123', duration: 123 })
hub.logWarn('Cache miss', { key: 'user:123' })
hub.logError('Database connection failed', error, { requestId: '123' })
hub.logFatal('Out of memory', error)
```

## 性能考虑

1. **采样率**: 生产环境建议使用概率采样（10-20%）
2. **内存限制**: 合理设置 `maxSpansPerTrace` 和 `maxTracesInMemory`
3. **日志级别**: 生产环境使用 INFO 或 WARN
4. **指标基数**: 控制标签基数，避免内存爆炸

## 许可证

MIT

## 版本

v1.11.0