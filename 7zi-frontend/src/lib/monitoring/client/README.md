# Client Performance Monitoring SDK

前端性能监控 SDK - 浏览器端性能数据收集和上报。

## 功能特性

### ✅ Core Web Vitals 监控

- **LCP (Largest Contentful Paint)** - 最大内容绘制时间
- **INP (Interaction to Next Paint)** - 交互到下一次绘制时间
- **CLS (Cumulative Layout Shift)** - 累积布局偏移
- **FCP (First Contentful Paint)** - 首次内容绘制时间
- **TTFB (Time to First Byte)** - 首字节时间

### ✅ JS 错误收集

- 自动捕获未处理的 Promise rejection
- 自动捕获 JavaScript 错误
- 错误堆栈追踪
- 错误上下文信息

### ✅ API 请求监控

- 自动拦截 `fetch` 请求
- 自动拦截 `XMLHttpRequest` 请求
- 记录请求耗时
- 记录请求状态

### ✅ 自定义事件上报

- 支持自定义性能指标
- 支持自定义事件追踪
- 支持页面加载时间追踪

### ✅ Sentry 集成

- 自动检测 Sentry 是否可用
- Web Vitals 数据作为 breadcrumb 上报
- 错误数据直接上报到 Sentry
- 可配置是否上报到 Sentry

## 快速开始

### 1. 基础使用

```typescript
import { initClientMonitoring } from '@/lib/monitoring/client'

// 在应用入口初始化
initClientMonitoring({
  endpoint: '/api/metrics', // 上报 endpoint
  debug: process.env.NODE_ENV === 'development',
  reportToSentry: true,
  sampleRate: 1, // 100% 采样
})
```

### 2. 使用 React Hook

```tsx
import { usePerformanceMonitor } from '@/lib/monitoring/client'

function MyComponent() {
  const { trackEvent, metrics } = usePerformanceMonitor({
    autoInit: true,
    pageName: 'my-page',
    endpoint: '/api/metrics',
  })

  const handleClick = () => {
    trackEvent('button_click', 0, { buttonId: 'my-button' })
  }

  return (
    <div>
      <p>LCP: {metrics.lcp}ms</p>
      <p>CLS: {metrics.cls}</p>
      <button onClick={handleClick}>Click me</button>
    </div>
  )
}
```

### 3. 带错误边界的 Hook

```tsx
import { usePerformanceMonitorWithErrorBoundary } from '@/lib/monitoring/client'

function MyComponent() {
  const monitor = usePerformanceMonitorWithErrorBoundary({
    autoInit: true,
  })

  // 组件错误会自动上报
  return <div>My Component</div>
}
```

### 4. 自定义事件上报

```typescript
import { trackCustomEvent } from '@/lib/monitoring/client'

// 上报自定义事件
trackCustomEvent('user_action', 0, {
  action: 'click',
  target: 'button',
})

// 上报页面加载时间
trackPageLoad('dashboard')
```

## 配置选项

### ClientMonitoringConfig

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `endpoint` | `string` | - | 上报 endpoint URL |
| `debug` | `boolean` | `false` | 是否启用调试模式 |
| `reportToSentry` | `boolean` | `true` | 是否上报到 Sentry |
| `beforeReport` | `function` | - | 上报前过滤回调 |
| `reporter` | `function` | - | 自定义 reporter |
| `sampleRate` | `number` | `1` | 采样率 (0-1) |
| `thresholds` | `object` | - | Core Web Vitals 阈值配置 |

### 阈值配置

```typescript
{
  lcp: 2500,   // Good: <= 2500ms
  fid: 100,    // Good: <= 100ms
  cls: 0.1,    // Good: <= 0.1
  fcp: 1800,   // Good: <= 1800ms
  ttfb: 800,   // Good: <= 800ms
  inp: 200,    // Good: <= 200ms
}
```

## API 参考

### initClientMonitoring

初始化客户端性能监控。

```typescript
initClientMonitoring(config?: ClientMonitoringConfig): Promise<void>
```

### trackCustomEvent

上报自定义事件。

```typescript
trackCustomEvent(
  eventName: string,
  value?: number,
  metadata?: Record<string, unknown>
): void
```

### trackPageLoad

上报页面加载时间。

```typescript
trackPageLoad(pageName: string): void
```

### usePerformanceMonitor

React Hook - 组件性能监控。

```typescript
usePerformanceMonitor(options?: UsePerformanceMonitorOptions): UsePerformanceMonitorReturn
```

### usePerformanceMonitorWithErrorBoundary

React Hook - 带错误边界的性能监控。

```typescript
usePerformanceMonitorWithErrorBoundary(options?: UsePerformanceMonitorOptions): UsePerformanceMonitorReturn
```

## 数据格式

### PerformanceEventData

```typescript
{
  type: 'web-vitals' | 'error' | 'api' | 'custom',
  name: string,
  value: number,
  timestamp: number,
  metadata?: Record<string, unknown>
}
```

### Web Vitals 数据示例

```typescript
{
  type: 'web-vitals',
  name: 'LCP',
  value: 2450.5,
  timestamp: 1712265600000,
  metadata: {
    id: 'v3-1234567890',
    delta: 100.2,
    rating: 'good'
  }
}
```

### API 请求数据示例

```typescript
{
  type: 'api',
  name: 'fetch',
  value: 245.5,
  timestamp: 1712265600000,
  metadata: {
    url: '/api/users',
    method: 'GET',
    status: 200,
    ok: true
  }
}
```

### 错误数据示例

```typescript
{
  type: 'error',
  name: 'javascript-error',
  value: 0,
  timestamp: 1712265600000,
  metadata: {
    message: 'Uncaught TypeError: ...',
    filename: 'app.js',
    lineno: 123,
    colno: 45,
    error: 'Error stack trace...'
  }
}
```

## 与现有监控系统集成

### 与 Analytics Dashboard 集成

```typescript
import { initClientMonitoring } from '@/lib/monitoring/client'
import { monitor } from '@/lib/monitoring'

// 初始化客户端监控
initClientMonitoring({
  reporter: (data) => {
    // 将数据上报到现有的监控系统
    if (data.type === 'api') {
      monitor.recordMetric({
        type: 'api',
        name: data.name,
        value: data.value,
        metadata: data.metadata,
      })
    }
  },
})
```

### 与 Sentry 集成

SDK 会自动检测并集成到 Sentry：

- Web Vitals 数据作为 breadcrumb 上报
- 错误数据直接上报到 Sentry
- 可通过 `reportToSentry: false` 禁用

## 性能影响

- **CPU 开销**: < 1%
- **内存开销**: 每个指标约 200-500 字节
- **网络开销**: 可通过采样率控制
- **不影响主线程**: 使用 `sendBeacon` 和 `keepalive` 上报

## 最佳实践

### 1. 在应用入口初始化

```typescript
// app/layout.tsx 或 pages/_app.tsx
import { useEffect } from 'react'
import { initClientMonitoring } from '@/lib/monitoring/client'

export default function RootLayout({ children }) {
  useEffect(() => {
    initClientMonitoring({
      endpoint: '/api/metrics',
      debug: process.env.NODE_ENV === 'development',
    })
  }, [])

  return <html>{children}</html>
}
```

### 2. 使用采样率控制开销

```typescript
// 生产环境使用 10% 采样
initClientMonitoring({
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
})
```

### 3. 过滤敏感数据

```typescript
initClientMonitoring({
  beforeReport: (data) => {
    // 过滤掉包含敏感数据的请求
    if (data.metadata?.url?.includes('/api/auth')) {
      return false
    }
    return true
  },
})
```

### 4. 自定义上报逻辑

```typescript
initClientMonitoring({
  reporter: (data) => {
    // 自定义上报逻辑
    if (data.type === 'web-vitals' && data.value > 3000) {
      // 只上报性能差的指标
      sendToAnalytics(data)
    }
  },
})
```

## 测试

```typescript
import { renderHook } from '@testing-library/react'
import { usePerformanceMonitor } from '@/lib/monitoring/client'

test('should initialize monitoring', () => {
  const { result } = renderHook(() => usePerformanceMonitor({ autoInit: true }))
  expect(result.current.isInitialized).toBe(true)
})
```

## 故障排查

### Sentry 未检测到

确保 Sentry 在 SDK 初始化前加载：

```typescript
// 先加载 Sentry
import * as Sentry from '@sentry/nextjs'

// 再初始化监控 SDK
import { initClientMonitoring } from '@/lib/monitoring/client'

initClientMonitoring({ reportToSentry: true })
```

### 数据未上报

检查：

1. `endpoint` 是否正确配置
2. 网络请求是否成功（查看 Network 面板）
3. `sampleRate` 是否过低
4. `beforeReport` 是否过滤了数据

### 调试模式

启用调试模式查看详细日志：

```typescript
initClientMonitoring({
  debug: true,
})
```

## 依赖

- `web-vitals` - Core Web Vitals 收集
- `@sentry/nextjs` - Sentry 集成（可选）

## 许可证

MIT