# 性能监控系统设计文档

## 概述

7zi-frontend 项目的完整性能监控方案，涵盖 Core Web Vitals、自定义指标、告警机制和上报系统。

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                     性能监控系统架构                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────┐ │
│  │  Web Vitals     │    │  Custom Metrics │    │  User API   │ │
│  │  - LCP          │    │  - API 响应时间  │    │  - Hooks   │ │
│  │  - INP          │    │  - 长任务监控    │    │  - Utils   │ │
│  │  - CLS          │    │  - 内存使用      │    └────────────┘ │
│  │  - FCP/TTFB     │    │  - 路由切换      │                    │
│  └────────┬────────┘    └────────┬────────┘                    │
│           │                      │                              │
│           └──────────┬───────────┘                              │
│                      ▼                                          │
│           ┌─────────────────────┐                              │
│           │  Performance Monitor │                              │
│           │  (Collector)          │                              │
│           └──────────┬────────────┘                              │
│                      │                                          │
│          ┌───────────┼───────────┐                              │
│          ▼           ▼           ▼                              │
│  ┌────────────┐ ┌───────────┐ ┌───────────┐                    │
│  │  Console   │ │  Sentry   │ │   Alert   │                    │
│  │  (Dev)     │ │  (Prod)   │ │  Manager  │                    │
│  └────────────┘ └───────────┘ └─────┬─────┘                    │
│                                    │                            │
│                      ┌─────────────┼─────────────┐              │
│                      ▼             ▼             ▼              │
│               ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│               │  Slack   │ │  Email   │ │  Custom │           │
│               └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Web Vitals 配置

### 阈值定义

| 指标 | 优秀 (≤) | 需改进 (≤) | 差 (>) | 单位 | 说明 |
|------|----------|------------|--------|------|------|
| **LCP** | 2500ms | 4000ms | 4000ms | ms | 最大内容绘制时间 |
| **INP** | 200ms | 500ms | 500ms | ms | 交互到下一次绘制 |
| **CLS** | 0.1 | 0.25 | 0.25 | score | 累积布局偏移 |
| **FCP** | 1800ms | 3000ms | 3000ms | ms | 首次内容绘制 |
| **TTFB** | 800ms | 1800ms | 1800ms | ms | 首字节时间 |

### 使用示例

```typescript
import { 
  initPerformanceMonitoring, 
  getPerformanceSummary 
} from '@/lib/monitoring';

// 初始化（在 app/layout.tsx）
initPerformanceMonitoring();

// 获取性能摘要
const summary = getPerformanceSummary();
// { LCP: { value: 1200, rating: 'good', count: 5 }, ... }
```

---

## 自定义指标

### 资源加载监控

```typescript
// 自动监控所有资源加载
// - JS 资源: warning: 3s, critical: 5s
// - CSS 资源: warning: 2s, critical: 3s
// - 图片资源: warning: 3s, critical: 5s
// - 字体资源: warning: 2s, critical: 3s
```

### API 性能追踪

```typescript
import { trackApiPerformance } from '@/lib/monitoring';

class ApiService {
  @trackApiPerformance('fetchUser')
  async fetchUser(id: string) {
    return fetch(`/api/users/${id}`);
  }
}

// 或使用 Hook
function useUserService() {
  const { trackRequest, stats } = useApiPerformance({ apiName: 'userService' });
  
  const fetchUser = (id: string) => trackRequest(
    fetch(`/api/users/${id}`).then(r => r.json())
  );
  
  return { fetchUser, stats };
}
```

### 组件渲染追踪

```typescript
import { useRenderPerformance } from '@/lib/monitoring';

function MyComponent() {
  const { renderTime, isSlowRender } = useRenderPerformance('MyComponent');
  
  if (isSlowRender) {
    console.warn(`Slow render: ${renderTime}ms`);
  }
  
  return <div>...</div>;
}
```

---

## 告警系统

### 告警级别

| 级别 | 图标 | 颜色 | 触发条件 |
|------|------|------|----------|
| **Info** | ℹ️ | 绿色 | 一般信息 |
| **Warning** | ⚠️ | 橙色 | needs-improvement |
| **Critical** | 🚨 | 红色 | poor 或严重超阈值 |

### 告警规则

```typescript
// 1. 单次超阈值告警
LCP > 4000ms → Critical Alert

// 2. 持续性问题告警（5分钟内连续3次）
连续 3 次 needs-improvement → Warning Alert

// 3. 聚合告警（1小时采样）
1小时内 10% 请求超阈值 → Aggregated Alert
```

### 静默期配置

```typescript
const ALERT_CONFIG = {
  rules: {
    silencePeriod: {
      warning: 300000,  // 警告: 5分钟静默
      critical: 60000,  // 严重: 1分钟静默
    },
  },
};
```

### 告警渠道

```typescript
// 控制台（开发环境）
channels.console.enabled = true;

// Sentry（生产环境）
channels.sentry.enabled = true;
channels.sentry.level = 'warning';

// Slack（严重告警）
channels.slack.enabled = true;
channels.slack.webhookUrl = process.env.SLACK_WEBHOOK_URL;

// 邮件（严重告警）
channels.email.enabled = true;
channels.email.recipients = ['ops@example.com'];
```

---

## 上报配置

### Sentry 集成

```typescript
// sentry.client.config.ts
Sentry.init({
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,  // 10%
});
```

### 采样策略

| 环境 | Traces | Web Vitals | Custom |
|------|--------|------------|--------|
| **Development** | 100% | 100% | 100% |
| **Staging** | 50% | 100% | 50% |
| **Production** | 10% | 50% | 10% |

### 批量上报

```typescript
const REPORTING_CONFIG = {
  batch: {
    enabled: true,
    maxSize: 10,        // 最多 10 条
    maxWaitMs: 30000,   // 最长等待 30s
  },
};
```

---

## React Hooks

### usePerformanceMonitor

完整的性能监控 Hook：

```typescript
function PerformanceDashboard() {
  const { 
    summary,     // 性能摘要
    alerts,      // 最新告警
    metrics,     // 最近指标
    isInitialized,
    recordMetric,
    getScore,    // 获取评分 (0-100)
  } = usePerformanceMonitor({
    autoInit: true,
    listenAlerts: true,
    listenMetrics: true,
  });

  const score = getScore(); // 0-100

  return (
    <div>
      <PerformanceScore score={score} />
      <ul>
        {Object.entries(summary).map(([name, data]) => (
          <li key={name}>
            {name}: {data.value} ({data.rating})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### useApiPerformance

API 性能追踪：

```typescript
function UserList() {
  const { trackRequest, stats } = useApiPerformance({ 
    apiName: 'userList' 
  });

  const loadUsers = () => trackRequest(
    fetch('/api/users').then(r => r.json())
  );

  return (
    <div>
      <button onClick={loadUsers}>Load</button>
      <div>Avg: {stats.avgDuration.toFixed(0)}ms</div>
      <div>Success: {stats.successCount}</div>
    </div>
  );
}
```

### useMemoryUsage

内存使用监控：

```typescript
function MemoryIndicator() {
  const { 
    usedJSHeapSize, 
    totalJSHeapSize, 
    usagePercentage,
    isHighMemory 
  } = useMemoryUsage();

  if (isHighMemory) {
    return <Warning>High memory usage: {usedJSHeapSize?.toFixed(0)}MB</Warning>;
  }

  return <div>{usedJSHeapSize?.toFixed(0)}MB / {totalJSHeapSize?.toFixed(0)}MB</div>;
}
```

---

## 开发者工具

### 全局 API

开发环境下，可通过控制台访问：

```javascript
// 查看所有指标
window.__PERF__.getMetrics()

// 查看性能摘要
window.__PERF__.getSummary()

// 查看自定义指标
window.__PERF__.getCustomMetrics()
```

### 控制台输出示例

```
[Performance] Monitoring initialized
[Web Vitals] LCP: 1234 (good)
[Web Vitals] INP: 56 (good)
⚠️ [Web Vitals] Needs improvement: FCP: 2100ms
🚨 Performance Alert: Poor LCP: 4500ms
```

---

## 部署检查清单

### 环境变量

```bash
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Slack（可选）
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

### 初始化位置

```typescript
// app/layout.tsx 或 app/providers.tsx
import { initPerformanceMonitoring } from '@/lib/monitoring';

// 在客户端初始化
if (typeof window !== 'undefined') {
  initPerformanceMonitoring();
}
```

---

## 文件结构

```
src/lib/monitoring/
├── index.ts                    # 统一导出
├── performance.config.ts       # 配置文件
├── performance.monitor.ts      # 核心监控器
├── performance.alerts.ts       # 告警管理
├── use-performance.ts          # React Hooks
├── web-vitals.ts              # Web Vitals（兼容）
├── errors.ts                  # 错误追踪
├── alerts.ts                  # 告警通知
└── health.ts                  # 健康检查
```

---

## 最佳实践

1. **尽早初始化** - 在应用入口处初始化监控
2. **合理采样** - 生产环境使用适当采样率避免数据过多
3. **关注趋势** - 关注长期趋势而非单次数据点
4. **设置告警** - 配置 Slack/Email 告警及时发现问题
5. **定期审查** - 定期审查性能数据和告警配置

---

## 监控指标总结

| 类别 | 指标 | 来源 | 采样率 |
|------|------|------|--------|
| Core Web Vitals | LCP, INP, CLS, FCP, TTFB | web-vitals | 100% |
| 资源加载 | JS/CSS/Image/Font 加载时间 | PerformanceObserver | 10% |
| 长任务 | >50ms 任务 | PerformanceObserver | 100% |
| 内存使用 | JS Heap Size | performance.memory | 定期 |
| API 性能 | 响应时间、错误率 | 装饰器/Hook | 10% |
| 路由切换 | 页面切换时间 | PerformanceObserver | 10% |
| 渲染性能 | 组件渲染时间 | Hook | 开发环境 |