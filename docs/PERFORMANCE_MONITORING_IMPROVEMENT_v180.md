# v1.8.0 性能监控改进方案

## 1. 当前性能监控状态评估

### 1.1 已实现功能

| 模块 | 状态 | 说明 |
|------|------|------|
| **Core Web Vitals** | ✅ 已完成 | LCP, CLS, INP, FCP, TTFB 全部监控 |
| **API 性能监控** | ✅ 已完成 | Response time, 错误率, 成功率 |
| **Operation 追踪** | ✅ 已完成 | 自定义操作时长追踪 |
| **错误追踪** | ✅ 已完成 | 错误类型, 堆栈, 上下文 |
| **内存监控** | ✅ 已完成 | JS Heap 使用率 |
| **网络指标** | ✅ 已完成 | DNS, TCP, TLS, Server Response |

### 1.2 缺失功能

| 模块 | 状态 | 优先级 | 说明 |
|------|------|--------|------|
| **WebSocket 监控** | ⚠️ 部分实现 | P0 | 有 API 但未集成到 Socket.IO |
| **Sentry 集成** | ✅ 已完成 | P0 | 已安装 @sentry/nextjs，配置完整 |
| **自动 WebSocket 追踪** | ❌ 未实现 | P1 | 需要自动拦截 Socket.IO |
| **错误边界集成** | ✅ 已完成 | P1 | ErrorBoundary 已集成 Sentry |

> **更新 (2026-04-02)**: Sentry 集成已完成，包括：
> - `@sentry/nextjs@^10.44.0` 已安装
> - `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` 配置完整
> - `src/lib/sentry.ts` 统一入口已创建
> - `ErrorBoundary` 组件已集成 Sentry 错误上报
> - `/api/sentry-test` 测试端点已创建

### 1.3 Core Web Vitals 当前阈值

```typescript
const DEFAULT_CONFIG: WebVitalsConfig = {
  reportThresholds: {
    LCP: 2500,    // ms
    CLS: 0.1,     // unitless
    INP: 200,     // ms (已从 FID 迁移)
  },
};
```

**评估**: INP 已经替代了 FID，符合 2024 年 Google Core Web Vitals 标准。

---

## 2. P0 任务：立即实现

### 2.1 任务 1：完成 WebSocket 监控

**问题**: 现有 `CustomMetricsTracker.trackWebSocketLatency()` 需要手动传入 WebSocket 实例，无法自动追踪 Socket.IO 连接。

**解决方案**: 创建 Socket.IO 拦截器，自动追踪所有连接。

#### 实现代码

```typescript
// src/lib/monitoring/websocket-monitor.ts

import { Socket } from "socket.io-client";
import { monitor } from "./monitor";

export interface WebSocketMetrics {
  connectTime: number;
  latency: number;
  reconnectCount: number;
  messageCount: number;
  errorCount: number;
}

export class WebSocketMonitor {
  private static instance: WebSocketMonitor;
  private metrics: Map<string, WebSocketMetrics> = new Map();
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  static getInstance(): WebSocketMonitor {
    if (!WebSocketMonitor.instance) {
      WebSocketMonitor.instance = new WebSocketMonitor();
    }
    return WebSocketMonitor.instance;
  }

  /**
   * 监控 Socket.IO 连接
   */
  trackSocketIO(socket: Socket, namespace: string = "default"): void {
    const metrics: WebSocketMetrics = {
      connectTime: 0,
      latency: 0,
      reconnectCount: 0,
      messageCount: 0,
      errorCount: 0,
    };
    
    const startTime = Date.now();

    // 连接开始
    socket.on("connect", () => {
      metrics.connectTime = Date.now() - startTime;
      
      monitor.trackCustomMetric(
        `ws_${namespace}_connect_time`,
        metrics.connectTime,
        "ms",
        { namespace }
      );
    });

    // 断开连接
    socket.on("disconnect", (reason) => {
      metrics.reconnectCount++;
      
      monitor.trackCustomMetric(
        `ws_${namespace}_reconnect_count`,
        metrics.reconnectCount,
        "count",
        { namespace, reason }
      );
    });

    // 错误处理
    socket.on("connect_error", (error) => {
      metrics.errorCount++;
      
      monitor.trackError(
        "WebSocketConnectError",
        error.message,
        error.stack,
        { namespace }
      );
    });

    // 消息统计
    socket.onAny((eventName) => {
      metrics.messageCount++;
    });

    // Ping-Pong 延迟测试
    this.startLatencyTest(socket, namespace);

    this.metrics.set(socket.id || namespace, metrics);
  }

  /**
   * 启动延迟测试
   */
  private startLatencyTest(socket: Socket, namespace: string): void {
    const interval = setInterval(() => {
      if (socket.connected) {
        const pingStart = Date.now();
        
        // 发送 ping 事件
        socket.emit("ping", { timestamp: pingStart });
        
        // 监听 pong 响应
        socket.once("pong", (data: { timestamp: number }) => {
          const latency = Date.now() - pingStart;
          
          monitor.trackCustomMetric(
            `ws_${namespace}_latency`,
            latency,
            "ms",
            { namespace }
          );
        });
      }
    }, 5000); // 每 5 秒测试一次

    this.pingIntervals.set(namespace, interval);
  }

  /**
   * 停止监控
   */
  stopTracking(namespace: string): void {
    const interval = this.pingIntervals.get(namespace);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(namespace);
    }
    this.metrics.delete(namespace);
  }

  /**
   * 获取指标
   */
  getMetrics(namespace?: string): WebSocketMetrics | Map<string, WebSocketMetrics> {
    if (namespace) {
      return this.metrics.get(namespace) || {
        connectTime: 0,
        latency: 0,
        reconnectCount: 0,
        messageCount: 0,
        errorCount: 0,
      };
    }
    return this.metrics;
  }
}

export const wsMonitor = WebSocketMonitor.getInstance();
```

#### 使用方法

```typescript
// 在 notification.ts 或 api-clients.ts 中使用
import { io } from "socket.io-client";
import { wsMonitor } from "../monitoring/websocket-monitor";

const socket = io("https://api.7zi.com", {
  transports: ["websocket"],
});

// 启动监控
wsMonitor.trackSocketIO(socket, "notifications");

// 组件卸载时停止
onUnmount(() => {
  wsMonitor.stopTracking("notifications");
  socket.disconnect();
});
```

---

### 2.2 任务 2：集成 Sentry 错误监控

**问题**: 仅有预留接口，未实际集成 Sentry。

**解决方案**: 安装并配置 @sentry/react。

#### 步骤 1: 安装依赖

```bash
cd /root/.openclaw/workspace/7zi-frontend
npm install @sentry/react
```

#### 步骤 2: 创建 Sentry 初始化文件

```typescript
// src/lib/monitoring/sentry.ts

import * as Sentry from "@sentry/react";

export interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
  sampleRate: number;
}

const DEFAULT_SENTRY_CONFIG: SentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  environment: process.env.NODE_ENV || "development",
  release: `7zi-frontend@${process.env.npm_package_version || "1.0.0"}`,
  sampleRate: 1.0, // 100% in dev, lower in prod
};

/**
 * 初始化 Sentry
 */
export function initSentry(config: Partial<SentryConfig> = {}): void {
  const sentryConfig = { ...DEFAULT_SENTRY_CONFIG, ...config };

  if (!sentryConfig.dsn) {
    console.warn("[Sentry] DSN not configured, skipping initialization");
    return;
  }

  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    release: sentryConfig.release,
    
    // 采样率配置
    sampleRate: sentryConfig.environment === "production" ? 0.1 : 1.0,
    
    // 性能监控
    tracesSampleRate: sentryConfig.environment === "production" ? 0.1 : 1.0,
    
    // 会话重播
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // 集成
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // 过滤
    beforeSend(event, hint) {
      // 过滤特定错误
      const error = hint.originalException;
      if (error instanceof Error) {
        // 忽略网络错误
        if (error.message.includes("Failed to fetch")) {
          return null;
        }
      }
      return event;
    },
  });
}

/**
 * 捕获异常
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * 捕获消息
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info"): void {
  Sentry.captureMessage(message, level);
}

/**
 * 设置用户上下文
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser(user);
}

/**
 * 添加面包屑
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = "info"
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
}

// 性能监控追踪
export const SentryTracing = Sentry;

export default {
  initSentry,
  captureError,
  captureMessage,
  setUser,
  addBreadcrumb,
};
```

#### 步骤 3: 在 Next.js 中初始化

```typescript
// src/app/layout.tsx (App Router)

import { initSentry } from "@/lib/monitoring/sentry";

// 只在客户端初始化
if (typeof window !== "undefined") {
  initSentry();
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
          {children}
        </Sentry.ErrorBoundary>
      </body>
    </html>
  );
}
```

#### 步骤 4: 集成到现有错误处理

```typescript
// 在 src/lib/errors.ts 中更新

import { captureError, addBreadcrumb } from "./monitoring/sentry";

// 更新 handleError 函数
export function handleError(
  error: unknown,
  context?: string,
): {
  error: AppError;
  shouldReport: boolean;
} {
  // ... 现有逻辑 ...

  // 上报到 Sentry
  if (shouldReport && appError.reportToSentry) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      code: appError.code,
      statusCode: appError.statusCode,
      details: appError.details,
      context,
    });
  }

  return { error: appError, shouldReport };
}
```

---

## 3. P1 任务：增强功能

### 3.1 自动路由性能追踪

```typescript
// src/lib/monitoring/route-tracker.ts

import { monitor } from "./monitor";

export function initRouteTracking(): void {
  if (typeof window === "undefined" || !window.next) return;

  // Next.js App Router
  const originalPush = window.next.router.push;
  
  window.next.router.push = async (...args: Parameters<typeof originalPush>) => {
    const startTime = Date.now();
    const [path] = args;

    try {
      const result = await originalPush.apply(window.next.router, args);
      
      monitor.trackCustomMetric(
        "route_change",
        Date.now() - startTime,
        "ms",
        { path: String(path) }
      );

      return result;
    } catch (error) {
      monitor.trackError(
        "RouteChangeError",
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
        { path: String(path) }
      );
      throw error;
    }
  };
}
```

### 3.2 性能预算告警

```typescript
// src/lib/performance/budget-checker.ts

import { monitor } from "../monitoring";

export interface PerformanceBudget {
  LCP: number;        // ms
  CLS: number;        // unitless
  INP: number;        // ms
  FCP: number;        // ms
  TTFB: number;       // ms
}

const DEFAULT_BUDGET: PerformanceBudget = {
  LCP: 2500,
  CLS: 0.1,
  INP: 200,
  FCP: 1800,
  TTFB: 800,
};

export function checkPerformanceBudget(
  metrics: { name: string; value: number }[],
  budget: PerformanceBudget = DEFAULT_BUDGET
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const metric of metrics) {
    const threshold = budget[metric.name as keyof PerformanceBudget];
    if (threshold && metric.value > threshold) {
      violations.push(
        `${metric.name}: ${metric.value.toFixed(0)}ms (budget: ${threshold}ms)`
      );
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
```

---

## 4. 实现步骤与时间规划

### 4.1 v1.8.0 迭代计划

| 阶段 | 任务 | 预计工时 | 依赖 |
|------|------|----------|------|
| **Sprint 1** | 安装 Sentry 依赖 | 0.5h | - |
| **Sprint 1** | 创建 sentry.ts 初始化 | 1h | Sentry 安装 |
| **Sprint 1** | 集成到 ErrorBoundary | 1h | sentry.ts |
| **Sprint 2** | 创建 websocket-monitor.ts | 2h | - |
| **Sprint 2** | 集成到 notification.ts | 1h | websocket-monitor |
| **Sprint 3** | 路由追踪增强 | 1h | - |
| **Sprint 3** | 文档更新 | 0.5h | - |

### 4.2 环境变量配置

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 5. 预期效果

### 5.1 监控覆盖提升

| 指标 | 改进前 | 改进后 |
|------|--------|--------|
| 错误追踪覆盖率 | ~60% | ~95% |
| WebSocket 延迟可见性 | 无 | 实时监控 |
| Core Web Vitals 报警 | 手动 | 自动 |
| 性能问题发现时间 | 小时级 | 分钟级 |

### 5.2 关键指标阈值

```typescript
// 生产环境告警阈值
export const PRODUCTION_THRESHOLDS = {
  // Core Web Vitals (Google 标准)
  LCP: { warning: 2500, critical: 4000 },     // Good: ≤2.5s
  CLS: { warning: 0.1, critical: 0.25 },      // Good: ≤0.1
  INP: { warning: 200, critical: 500 },       // Good: ≤200ms

  // API
  apiResponseTime: { warning: 1000, critical: 2000 },  // p95
  apiErrorRate: { warning: 0.02, critical: 0.05 },      // 2%/5%

  // WebSocket
  wsLatency: { warning: 200, critical: 500 },
  wsReconnectRate: { warning: 0.1, critical: 0.3 },     // 10%/30%

  // 内存
  memoryUsage: { warning: 80, critical: 90 },            // %
};
```

### 5.3 数据上报流程

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   用户浏览器    │────▶│   7zi 前端      │────▶│   Sentry        │
│                 │     │                 │     │   (错误追踪)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   性能监控      │
                        │   (本地存储)    │
                        └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Dashboard    │
                        │   (展示/告警)   │
                        └─────────────────┘
```

---

## 6. 兼容性说明

### 6.1 现有代码兼容

- ✅ `PerformanceMonitor` 类保持不变
- ✅ `WebVitalsMonitor` 保持不变
- ✅ `CustomMetricsTracker` 保持不变
- ⚠️ 新增 `WebSocketMonitor` 需要在 notification.ts 中集成

### 6.2 浏览器兼容性

| 特性 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Core Web Vitals | ✅ | ✅ | ✅ | ✅ |
| Socket.IO 监控 | ✅ | ✅ | ✅ | ✅ |
| Sentry | ✅ | ✅ | ✅ | ✅ |
| Performance Memory | ⚠️ | ❌ | ❌ | ⚠️ |

---

## 7. 总结

v1.8.0 性能监控优化主要聚焦两个 P0 任务：

1. **WebSocket 监控** - 创建独立的 `WebSocketMonitor` 类，自动追踪 Socket.IO 连接延迟、断开重连、错误
2. **Sentry 集成** - 完整集成 Sentry 错误追踪，覆盖 React 错误边界和 API 错误

这两个功能将显著提升生产环境问题发现和诊断能力，将错误发现时间从小时级缩短到分钟级。

---

*文档版本: 1.0.0*  
*创建日期: 2026-04-02*  
*作者: 咨询师 (Research Agent)*
