# 📊 监控组件文档

## 概述

监控组件库提供系统监控、性能监控仪表板，支持实时指标展示、WebSocket 实时更新、告警通知等功能。

## 组件列表

| 组件 | 文件 | 说明 |
|------|------|------|
| MetricsDashboard | `MetricsDashboard.tsx` | 监控指标仪表板 |
| PerformanceDashboard | `PerformanceDashboard.tsx` | 性能监控仪表板 |

---

## 1. MetricsDashboard 监控指标仪表板

### 用途说明

实时显示系统指标、API 性能监控、数据库健康状态、错误追踪和告警通知。

### 功能特性

- ✅ 系统运行时间监控
- ✅ 内存使用情况
- ✅ API 请求统计（总数、成功、失败）
- ✅ 平均响应时间
- ✅ 慢请求追踪
- ✅ 健康状态评分
- ✅ 自动刷新（30秒间隔）
- ✅ 健康状态可视化（OK/Degraded/Error）

### Props 接口

组件为受控组件，无需传入 props，自动获取数据。

```typescript
// 无需 props，内部自动处理数据获取
interface MetricsDashboardProps {}
```

### 使用示例

```tsx
import { MetricsDashboard } from '@/components/monitoring'

function MonitoringPage() {
  return (
    <div className="monitoring-container">
      <h1>系统监控</h1>
      <MetricsDashboard />
    </div>
  )
}
```

### 内部 API 调用

组件会自动调用以下 API：

```typescript
// 获取性能指标
GET /api/metrics/performance?category=all

// 获取健康状态
GET /api/health
```

### 注意事项

1. **自动刷新**：每 30 秒自动刷新一次数据
2. **API 要求**：需要后端实现对应的 API 端点
3. **错误处理**：网络错误时显示错误提示
4. **性能影响**：建议在生产环境配置合理的刷新间隔

### 数据结构

```typescript
interface DashboardData {
  system: SystemMetrics
  api: ApiMetrics
  health: HealthStatus
  lastUpdated: string
}

interface SystemMetrics {
  uptime: number
  memory: {
    used: string
    total: string
    percent: string
  }
  nodeVersion: string
}

interface ApiMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageDuration: number
  slowRequests: number
  maxDuration: number
}

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error'
  score: number
  timestamp: string
}
```

---

## 2. PerformanceDashboard 性能监控仪表板

### 用途说明

实时显示 Web 性能指标、性能趋势图表、告警列表，支持 WebSocket 实时更新。

### 功能特性

- ✅ Core Web Vitals 监控（LCP, FID, CLS, INP, FCP）
- ✅ 自定义指标（堆大小、长任务数、平均渲染时间）
- ✅ 性能评分（综合评分）
- ✅ 性能趋势分析（improving/stable/degrading）
- ✅ WebSocket 实时数据推送
- ✅ 告警通知（info/warning/critical）
- ✅ 自动重连机制
- ✅ 连接状态指示

### Props 接口

组件为受控组件，无需传入 props，内部自动处理 WebSocket 连接。

```typescript
// 无需 props，内部自动处理 WebSocket 连接
interface PerformanceDashboardProps {}
```

### 使用示例

```tsx
import PerformanceDashboard from '@/components/monitoring/PerformanceDashboard'

function PerformancePage() {
  return (
    <div className="performance-container">
      <h1>性能监控</h1>
      <PerformanceDashboard />
    </div>
  )
}
```

### WebSocket 连接

组件自动连接到以下 WebSocket 端点：

```typescript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const wsUrl = `${protocol}//${window.location.host}/api/monitoring/ws`
```

### WebSocket 消息协议

```typescript
// 订阅数据
{
  type: 'subscribe',
  data: {}
}

// 接收指标数据
{
  type: 'metrics',
  data: RealTimeMetrics
}

// 接收趋势数据
{
  type: 'trend',
  data: PerformanceTrend
}

// 接收告警
{
  type: 'alert',
  data: PerformanceAlert
}
```

### 注意事项

1. **WebSocket 支持**：需要后端实现 WebSocket 端点
2. **自动重连**：连接断开时自动尝试重连
3. **性能影响**：高频更新时注意性能开销
4. **告警阈值**：可根据业务需求自定义告警规则

### 数据结构

```typescript
interface RealTimeMetrics {
  current: {
    LCP?: number
    FID?: number
    CLS?: number
    TTFB?: number
    FCP?: number
    INP?: number
  }
  custom: {
    heapSize?: number
    longTaskCount?: number
    avgRenderTime?: number
  }
  score: {
    overall: number
    lcp: number
    fid: number
    cls: number
    inp: number
  }
  timestamp: number
}

interface PerformanceTrend {
  data: Array<{
    timestamp: number
    LCP?: number
    CLS?: number
    INP?: number
    FCP?: number
    score: number
  }>
  trend: 'improving' | 'stable' | 'degrading'
  changePercent: number
}

interface PerformanceAlert {
  id: string
  metricName: string
  value: number
  threshold: number
  level: 'info' | 'warning' | 'critical'
  message: string
  timestamp: number
  route?: string
}
```

---

## 样式定制

两个组件都使用 Tailwind CSS 和 Lucide 图标库，可以通过自定义 CSS 修改样式：

```css
/* 修改卡片样式 */
.metrics-card {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow;
}

/* 修改指标值样式 */
.metric-value {
  @apply text-2xl font-bold;
}

/* 修改状态颜色 */
.status-ok {
  @apply text-green-600;
}

.status-error {
  @apply text-red-600;
}
```

---

## 后端 API 要求

### MetricsDashboard 需要的 API

```typescript
// 1. 获取性能指标
GET /api/metrics/performance?category=all

Response:
{
  success: true,
  data: {
    system: SystemMetrics,
    api: ApiMetrics
  }
}

// 2. 获取健康状态
GET /api/health

Response:
{
  success: true,
  status: 'ok' | 'degraded' | 'error',
  score: number,
  timestamp: string
}
```

### PerformanceDashboard 需要的 WebSocket

```typescript
// WebSocket 端点
WS /api/monitoring/ws

// 消息类型
type WebSocketMessage =
  | { type: 'subscribe', data: {} }
  | { type: 'metrics', data: RealTimeMetrics }
  | { type: 'trend', data: PerformanceTrend }
  | { type: 'alert', data: PerformanceAlert }
  | { type: 'error', data: { message: string } }
```

---

## 集成示例

```tsx
import { MetricsDashboard } from '@/components/monitoring'
import PerformanceDashboard from '@/components/monitoring/PerformanceDashboard'

function MonitoringCenter() {
  return (
    <div className="monitoring-center">
      {/* 系统监控 */}
      <section>
        <h2>系统监控</h2>
        <MetricsDashboard />
      </section>

      {/* 性能监控 */}
      <section>
        <h2>性能监控</h2>
        <PerformanceDashboard />
      </section>
    </div>
  )
}
```

---

## 相关文档

- [API 文档](../../api/metrics/)
- [WebSocket 协议](../../api/monitoring/protocol.md)
- [性能优化指南](../../docs/performance/optimization.md)

---

**文档版本**: v1.13.0
**更新日期**: 2026-04-05
