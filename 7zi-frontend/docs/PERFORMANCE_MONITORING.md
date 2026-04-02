# Performance Monitoring Guide

# 性能监控使用指南

## Overview 概述

The 7zi-frontend project includes a comprehensive performance monitoring system that tracks both Core Web Vitals and custom metrics, provides real-time dashboards, and supports performance budgeting with automated alarms.

7zi-frontend 项目包含一个全面的性能监控系统，可追踪 Core Web Vitals 和自定义指标，提供实时仪表板，并支持性能预算和自动告警。

## Features 功能特性

### 1. Core Web Vitals Monitoring

The system tracks all Core Web Vitals as defined by Google:

- **LCP** (Largest Contentful Paint) - 最大内容绘制时间
- **FID** (First Input Delay) - 首次输入延迟
- **CLS** (Cumulative Layout Shift) - 累积布局偏移
- **INP** (Interaction to Next Paint) - 交互到下一次绘制的延迟

Additional metrics tracked:

- **FCP** (First Contentful Paint) - 首次内容绘制
- **TTFB** (Time to First Byte) - 首字节时间

### 2. Custom Metrics 自定义指标

#### Page Performance

- `pageLoadTime` - Page load time 页面完全加载时间
- `domContentLoaded` - DOM content loaded event DOM 内容加载完成时间
- `firstPaint` - First paint event 首次绘制时间
- `firstContentfulPaint` - First contentful paint event 首次内容绘制时间

#### Network Metrics

- `dnsLookup` - DNS query time DNS 查询时间
- `tcpConnection` - TCP connection time TCP 连接时间
- `tlsHandshake` - TLS handshake time TLS 握手时间
- `serverResponse` - Server response time 服务器响应时间

#### WebSocket Metrics

- `wsConnectTime` - WebSocket connection time WebSocket 连接时间
- `wsLatency` - WebSocket latency (ping-pong) WebSocket 延迟
- `wsMessagesPerSecond` - Messages per second 每秒消息数
- `wsReconnectCount` - Reconnection count 重连次数

#### API Metrics

- `apiAverageResponseTime` - Average API response time API 平均响应时间
- `apiSuccessRate` - API success rate API 成功率
- `apiErrorRate` - API error rate API 错误率

#### Error Metrics

- `errorCount` - Total error count 错误总数
- `errorRate` - Error rate (errors/requests) 错误率

#### Memory Metrics

- `memoryUsage` - Memory usage (MB) 内存使用量
- `memoryUsagePercent` - Memory usage percentage 内存使用百分比

### 3. Performance Budget & Alarms 性能预算和告警

The system includes a comprehensive performance budget manager that:

- Defines performance thresholds for all metrics 为所有指标定义性能阈值
- Automatically triggers alarms when thresholds are exceeded 当超过阈值时自动触发告警
- Provides severity levels (low, medium, high, critical) 提供严重性级别
- Supports cooldown periods to prevent alarm spam 支持冷却期以防止告警轰炸
- Generates optimization recommendations 生成优化建议

### 4. Real-time Dashboard 实时仪表板

Two dashboard components are available:

- `SimplePerformanceDashboard` - Basic metrics view 基础指标视图
- `EnhancedPerformanceDashboard` - Full-featured view with Web Vitals and budget 全功能视图，包含 Web Vitals 和预算

## Installation & Setup 安装和配置

### Dependencies

The system requires the `web-vitals` package:

```bash
npm install web-vitals --legacy-peer-deps
```

### Basic Setup 基础配置

Import and initialize the monitoring system in your app:

```tsx
import { initWebVitalsMonitoring, initCustomMetricsTracking } from '@/lib/performance'

// Initialize monitoring on app startup
initWebVitalsMonitoring()
initCustomMetricsTracking()
```

### Next.js Integration

For Next.js applications, initialize in a client component:

```tsx
// app/layout.tsx or app/_app.tsx
'use client'

import { useEffect } from 'react'
import { initWebVitalsMonitoring, initCustomMetricsTracking } from '@/lib/performance'

export default function RootLayout({ children }) {
  useEffect(() => {
    initWebVitalsMonitoring()
    initCustomMetricsTracking()
  }, [])

  return <html>{children}</html>
}
```

## Usage Guide 使用指南

### 1. Monitoring API Performance 监控 API 性能

Use the `monitoredFetch` wrapper to automatically track API requests:

```tsx
import { monitoredFetch } from '@/lib/monitoring'

async function fetchUsers() {
  const response = await monitoredFetch('/api/users', {
    method: 'GET',
    metadata: {
      operation: 'load_users',
      source: 'user_list_page',
    },
  })

  const data = await response.json()
  return data
}
```

### 2. Tracking Operations 追踪操作

Use `withPerformanceTracking` for async operations:

```tsx
import { withPerformanceTracking } from '@/lib/monitoring'

async function processData(userId: string) {
  return withPerformanceTracking(
    'process_user_data',
    async () => {
      // Your operation logic here
      const result = await someAsyncOperation(userId)
      return result
    },
    {
      userId,
      customField: 'value',
    }
  )
}
```

Manual operation tracking:

```tsx
import { monitor } from '@/lib/monitoring'

function startProcessing() {
  const opId = monitor.startOperation('data_processing')

  // ... perform operation ...

  monitor.endOperation(opId, true, {
    success: true,
    processedItems: 10,
  })
}
```

### 3. Tracking Errors 追踪错误

Manual error tracking:

```tsx
import { monitor } from '@/lib/monitoring'

try {
  // Some operation
} catch (error) {
  await monitor.trackError('OperationError', error.message, error.stack, {
    operation: 'data_processing',
    userId: '123',
  })
}
```

### 4. Tracking Custom Metrics 追踪自定义指标

```tsx
import { monitor } from '@/lib/monitoring'

// Track any custom metric
await monitor.trackCustomMetric('cache_hit_rate', 85, '%', {
  cacheType: 'redis',
  endpoint: '/api/users',
})

await monitor.trackCustomMetric('queue_length', 42, 'count')
await monitor.trackCustomMetric('processing_time', 1250, 'ms')
```

### 5. Monitoring WebSocket Performance 监控 WebSocket 性能

```tsx
import { customMetricsTracker } from '@/lib/performance'

const ws = new WebSocket('wss://example.com/ws')

// Track WebSocket metrics
customMetricsTracker.trackWebSocketLatency(ws)
```

### 6. Using Performance Budget 使用性能预算

```tsx
import { budgetManager } from '@/lib/performance'
import { webVitalsMonitor, customMetricsTracker } from '@/lib/performance'

// Check for budget violations
const triggeredAlarms = await budgetManager.checkAlarms(
  webVitalsMonitor.getMetrics(),
  customMetricsTracker.getMetrics()
)

// Get budget report
const report = budgetManager.calculateBudgetReport(
  webVitalsMonitor.getMetrics(),
  customMetricsTracker.getMetrics()
)

console.log('Overall Score:', report.overallScore)
console.log('Status:', report.status)
console.log('Violations:', report.violations)
console.log('Recommendations:', report.recommendations)
```

Custom budget configuration:

```tsx
import { initPerformanceBudget } from '@/lib/performance'

initPerformanceBudget({
  webVitals: {
    LCP: { threshold: 2000, weight: 1.5 }, // Stricter threshold
    FID: { threshold: 50, weight: 1.0 },
    CLS: { threshold: 0.05, weight: 2.0 }, // Higher weight
    INP: { threshold: 100, weight: 1.0 },
  },
  customMetrics: {
    pageLoadTime: { threshold: 2000, weight: 1.0 },
    apiAverageResponseTime: { threshold: 500, weight: 1.5 },
    apiErrorRate: { threshold: 0.02, weight: 2.0 }, // 2% error rate
    memoryUsagePercent: { threshold: 80, weight: 1.0 },
    wsLatency: { threshold: 50, weight: 1.0 },
  },
})
```

### 7. Adding Custom Alarm Rules 添加自定义告警规则

```tsx
import { budgetManager } from '@/lib/performance'

// Add a custom alarm rule
budgetManager.addAlarmRule({
  id: 'high-api-latency',
  name: 'High API Latency',
  description: 'API response time exceeded threshold',
  metric: 'apiAverageResponseTime',
  condition: 'greater',
  threshold: 1000,
  windowMs: 300000, // 5 minutes
  severity: 'high',
  enabled: true,
  cooldownMs: 600000, // 10 minutes cooldown
})

// Toggle alarm rule
budgetManager.toggleAlarmRule('high-api-latency', false) // Disable
budgetManager.toggleAlarmRule('high-api-latency', true) // Enable

// Remove alarm rule
budgetManager.removeAlarmRule('high-api-latency')
```

## Dashboard Components 仪表板组件

### SimplePerformanceDashboard

Basic dashboard with essential metrics:

```tsx
import { SimplePerformanceDashboard } from '@/components/SimplePerformanceDashboard'

export default function DashboardPage() {
  return (
    <div>
      <h1>Performance Monitor</h1>
      <SimplePerformanceDashboard refreshInterval={5000} showAlarms={true} className="mb-6" />
    </div>
  )
}
```

Props:

- `refreshInterval?: number` - Refresh interval in ms (default: 5000)
- `showAlarms?: boolean` - Show active alarms (default: true)
- `className?: string` - Additional CSS classes

### EnhancedPerformanceDashboard

Full-featured dashboard with Web Vitals, custom metrics, and budget:

```tsx
import { EnhancedPerformanceDashboard } from '@/components/EnhancedPerformanceDashboard'

export default function DashboardPage() {
  return (
    <div>
      <h1>Performance Monitor</h1>
      <EnhancedPerformanceDashboard
        refreshInterval={5000}
        showAlarms={true}
        showBudget={true}
        showWebVitals={true}
        className="mb-6"
      />
    </div>
  )
}
```

Props:

- `refreshInterval?: number` - Refresh interval in ms (default: 5000)
- `showAlarms?: boolean` - Show active alarms (default: true)
- `showBudget?: boolean` - Show budget violations and recommendations (default: true)
- `showWebVitals?: boolean` - Show Core Web Vitals (default: true)
- `className?: string` - Additional CSS classes

## Configuration 配置

### Monitoring Config

Modify the default monitoring configuration in `src/lib/monitoring/config.ts`:

```typescript
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  sampleRate: 1.0, // 100% sampling (reduce in production)
  retentionPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
  alarms: {
    errorRate: { threshold: 0.05, windowMs: 5 * 60 * 1000, enabled: true },
    responseTime: { threshold: 2000, windowMs: 5 * 60 * 1000, enabled: true },
    operationDuration: { threshold: 3000, windowMs: 5 * 60 * 1000, enabled: true },
  },
  storageType: 'memory', // or 'localStorage'
}
```

### Environment-Specific Config

```typescript
export const ENV_SPECIFIC_CONFIG: Partial<MonitoringConfig> = {
  production: {
    enabled: true,
    sampleRate: 0.1, // 10% sampling to reduce overhead
    retentionPeriodMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    alarms: {
      errorRate: { threshold: 0.02 }, // 2% error rate
      responseTime: { threshold: 1000 }, // 1 second
      operationDuration: { threshold: 2000 }, // 2 seconds
    },
  },
  development: {
    enabled: true,
    sampleRate: 1.0, // 100% sampling
    retentionPeriodMs: 60 * 60 * 1000, // 1 hour
  },
  test: {
    enabled: false, // Disable in tests
  },
}
```

### Web Vitals Config

```typescript
import { initWebVitalsMonitoring } from '@/lib/performance'

initWebVitalsMonitoring({
  enabled: true,
  reportThresholds: {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    INP: 200,
  },
  trackAllMetrics: true,
  sendToAnalytics: metric => {
    // Send to your analytics service
    console.log('Web Vital:', metric)
  },
})
```

### Custom Metrics Config

```typescript
import { initCustomMetricsTracking } from '@/lib/performance'

initCustomMetricsTracking({
  trackMemory: true,
  memoryCheckInterval: 5000,
  trackNetwork: true,
  trackResources: true,
  resourceTypes: ['script', 'stylesheet', 'image', 'font', 'fetch', 'xhr'],
})
```

## API Reference API 参考

### Performance Monitor

```typescript
import { monitor } from '@/lib/monitoring'

// Track API request
await monitor.trackAPIRequest(method, endpoint, statusCode, responseTime, metadata)

// Track error
await monitor.trackError(errorType, errorMessage, stackTrace, context)

// Start operation
const opId = monitor.startOperation(operationName)

// End operation
await monitor.endOperation(opId, success, metadata)

// Track custom metric
await monitor.trackCustomMetric(name, value, unit, metadata)

// Get aggregated metrics
const metrics = await monitor.getAggregatedMetrics(timeWindowMs)

// Get alarms
const alarms = await monitor.getAlarms(startTime)

// Clear all data
await monitor.clearAllData()
```

### Web Vitals Monitor

```typescript
import { webVitalsMonitor } from '@/lib/performance'

// Initialize
webVitalsMonitor.init()

// Get all metrics
const metrics = webVitalsMonitor.getMetrics()

// Get single metric
const lcp = webVitalsMonitor.getMetric('LCP')

// Check if metric is good
const isGood = webVitalsMonitor.isMetricGood('LCP')

// Get overall score
const scores = webVitalsMonitor.getOverallScore()
```

### Custom Metrics Tracker

```typescript
import { customMetricsTracker } from '@/lib/performance'

// Initialize
customMetricsTracker.init()

// Track WebSocket latency
customMetricsTracker.trackWebSocketLatency(ws)

// Update API metrics
await customMetricsTracker.updateAPIMetrics()

// Update error metrics
await customMetricsTracker.updateErrorMetrics()

// Get all metrics
const metrics = customMetricsTracker.getMetrics()

// Get single metric
const memory = customMetricsTracker.getMetric('memoryUsage')
```

### Performance Budget Manager

```typescript
import { budgetManager } from '@/lib/performance'

// Check alarms
const alarms = await budgetManager.checkAlarms(webVitals, customMetrics)

// Calculate budget report
const report = budgetManager.calculateBudgetReport(webVitals, customMetrics)

// Add alarm rule
budgetManager.addAlarmRule(rule)

// Get active notifications
const notifications = budgetManager.getActiveNotifications()

// Acknowledge alarm
budgetManager.acknowledgeAlarm(notificationId)

// Resolve alarm
budgetManager.resolveAlarm(notificationId)

// Update budget config
budgetManager.updateBudget(partialBudget)

// Clear all notifications
budgetManager.clearAllNotifications()
```

## Best Practices 最佳实践

### 1. Production Sampling 生产环境采样

Reduce sampling in production to minimize performance impact:

```typescript
// config.ts
production: {
  sampleRate: 0.1, // Only sample 10% of requests
}
```

### 2. Set Appropriate Thresholds 设置适当的阈值

Adjust thresholds based on your application's requirements:

```typescript
initPerformanceBudget({
  webVitals: {
    LCP: { threshold: 2500, weight: 1.0 }, // Good: < 2.5s
    FID: { threshold: 100, weight: 1.0 }, // Good: < 100ms
    CLS: { threshold: 0.1, weight: 1.0 }, // Good: < 0.1
    INP: { threshold: 200, weight: 1.0 }, // Good: < 200ms
  },
})
```

### 3. Use Cooldown Periods 使用冷却期

Prevent alarm spam with cooldown periods:

```typescript
budgetManager.addAlarmRule({
  id: 'high-latency',
  name: 'High Latency',
  metric: 'apiAverageResponseTime',
  condition: 'greater',
  threshold: 1000,
  windowMs: 300000,
  severity: 'high',
  enabled: true,
  cooldownMs: 600000, // Wait 10 minutes before triggering again
})
```

### 4. Set Retention Periods 设置保留期

Configure data retention based on storage constraints:

```typescript
DEFAULT_MONITORING_CONFIG: {
  retentionPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
}

ENV_SPECIFIC_CONFIG: {
  production: {
    retentionPeriodMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}
```

### 5. Monitor Resource Usage 监控资源使用

Track memory and CPU to detect performance issues:

```typescript
initCustomMetricsTracking({
  trackMemory: true,
  memoryCheckInterval: 5000, // Check every 5 seconds
})

// Set up alarm for high memory usage
budgetManager.addAlarmRule({
  id: 'high-memory',
  name: 'High Memory Usage',
  metric: 'memoryUsagePercent',
  condition: 'greater',
  threshold: 85,
  windowMs: 30000,
  severity: 'high',
  enabled: true,
  cooldownMs: 120000,
})
```

### 6. Test in Different Environments 在不同环境中测试

Test your monitoring configuration in different environments:

```typescript
// Development: Full sampling, short retention
development: {
  sampleRate: 1.0,
  retentionPeriodMs: 60 * 60 * 1000, // 1 hour
}

// Production: Reduced sampling, longer retention
production: {
  sampleRate: 0.1,
  retentionPeriodMs: 7 * 24 * 60 * 60 * 1000, // 7 days
}
```

## Troubleshooting 故障排除

### No Metrics Showing

**Problem**: Dashboard shows no metrics or all zeros.

**Solutions**:

1. Ensure monitoring is initialized: `initWebVitalsMonitoring()`
2. Check if monitoring is enabled in config
3. Verify sampling rate is not 0
4. Clear browser cache and localStorage

### Web Vitals Not Tracking

**Problem**: Web Vitals metrics are not updating.

**Solutions**:

1. Ensure you're running in a browser environment (not SSR)
2. Check that `web-vitals` package is installed
3. Wait for page to fully load before checking metrics
4. Verify browser supports the Performance API

### High Memory Usage

**Problem**: Monitoring system using too much memory.

**Solutions**:

1. Reduce sample rate in production: `sampleRate: 0.1`
2. Shorten retention period: `retentionPeriodMs: 60 * 60 * 1000`
3. Disable resource tracking: `trackResources: false`
4. Clear old data periodically: `monitor.clearAllData()`

### Alarms Not Triggering

**Problem**: Alarms are not triggering when thresholds are exceeded.

**Solutions**:

1. Check that alarm rules are enabled: `enabled: true`
2. Verify cooldown period has elapsed
3. Ensure metric names match exactly
4. Check condition operator (greater/less/etc.)

## Example: Full Setup 示例：完整配置

```tsx
// app/layout.tsx
'use client'

import { useEffect } from 'react'
import {
  initWebVitalsMonitoring,
  initCustomMetricsTracking,
  initPerformanceBudget,
} from '@/lib/performance'
import { EnhancedPerformanceDashboard } from '@/components/EnhancedPerformanceDashboard'

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize performance monitoring
    initWebVitalsMonitoring({
      enabled: true,
      trackAllMetrics: true,
    })

    initCustomMetricsTracking({
      trackMemory: true,
      trackNetwork: true,
      trackResources: true,
    })

    // Set up performance budget
    initPerformanceBudget({
      webVitals: {
        LCP: { threshold: 2500, weight: 1.0 },
        FID: { threshold: 100, weight: 1.0 },
        CLS: { threshold: 0.1, weight: 1.0 },
        INP: { threshold: 200, weight: 1.0 },
      },
      customMetrics: {
        pageLoadTime: { threshold: 3000, weight: 1.0 },
        apiAverageResponseTime: { threshold: 1000, weight: 1.0 },
        apiErrorRate: { threshold: 0.05, weight: 1.0 },
        memoryUsagePercent: { threshold: 85, weight: 1.0 },
        wsLatency: { threshold: 100, weight: 1.0 },
      },
    })
  }, [])

  return (
    <html>
      <head />
      <body>
        {children}
        <EnhancedPerformanceDashboard />
      </body>
    </html>
  )
}
```

## Resources 资源

- [Web Vitals](https://web.dev/vitals/) - Core Web Vitals documentation
- [web-vitals library](https://github.com/GoogleChrome/web-vitals) - Official web-vitals library
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance) - MDN Performance API
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance auditing tool

## Support 支持

For issues or questions about the performance monitoring system, please refer to the project documentation or contact the development team.
