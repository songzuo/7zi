# Analytics 和 HealthDashboard 优化实施指南

本文档提供了审计报告中提到的关键优化的具体实施步骤和代码示例。

---

## 目录

1. [API 路由缓存](#1-api-路由缓存)
2. [性能指标持久化](#2-性能指标持久化)
3. [分页支持](#3-分页支持)
4. [Server-Sent Events 实现](#4-server-sent-events-实现)
5. [HealthDashboard 性能优化](#5-healthdashboard-性能优化)
6. [数据压缩配置](#6-数据压缩配置)
7. [速率限制实现](#7-速率限制实现)

---

## 1. API 路由缓存

### 问题描述
`/api/performance/report` 端点每次请求都重新计算所有指标，没有使用缓存。

### 解决方案

#### 步骤 1: 修改 `/api/performance/report/route.ts`

```typescript
import { getCacheManager, CachePresets } from '@/lib/cache/CacheManager';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';
  const minutes = parseInt(searchParams.get('minutes') || '5', 10);

  // 生成缓存键（包含查询参数）
  const cacheKey = CacheManager.generateKey(
    'perf-report',
    detailed ? 'detailed' : 'summary',
    minutes
  );

  const cacheManager = getCacheManager();

  // 使用 getOrSet 模式
  try {
    const report = await cacheManager.getOrSet(
      cacheKey,
      async () => {
        // 原有的性能报告生成逻辑
        return await generatePerformanceReport(searchParams);
      },
      CachePresets.SHORT // 30秒缓存
    );

    return NextResponse.json(report, {
      status: report.summary.status === 'healthy' ? 200 : 503,
    });
  } catch (error) {
    logger.error('Failed to generate performance report', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate performance report',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// 辅助函数：将原有逻辑提取出来
async function generatePerformanceReport(searchParams: URLSearchParams) {
  const detailed = searchParams.get('detailed') === 'true';
  const minutes = parseInt(searchParams.get('minutes') || '5', 10);

  // ... 原有的报告生成逻辑 ...
  return report;
}
```

#### 步骤 2: 添加缓存失效机制

当新的性能数据到达时，使缓存失效：

```typescript
// 在 api-performance.ts 中添加
import { getCacheManager } from '@/lib/cache/CacheManager';

export function addMetric(metric: ApiMetrics) {
  metricsStore.push(metric);

  // 限制存储大小
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.shift();
  }

  // 使性能报告缓存失效
  const cacheManager = getCacheManager();
  cacheManager.delete('perf-report:detailed:5');
  cacheManager.delete('perf-report:summary:5');
}
```

---

## 2. 性能指标持久化

### 问题描述
性能指标存储在内存中，重启后会丢失，无法进行长期分析。

### 解决方案

#### 步骤 1: 创建数据库表

创建迁移文件 `src/lib/db/migrations/20240319_add_performance_metrics.sql`:

```sql
-- API 性能指标表
CREATE TABLE IF NOT EXISTS performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('api', 'db')),
  path_or_query TEXT NOT NULL,
  duration REAL NOT NULL,
  status INTEGER,
  success BOOLEAN NOT NULL,
  error TEXT,
  timestamp INTEGER NOT NULL,
  metadata TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_timestamp
  ON performance_metrics(type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp
  ON performance_metrics(timestamp DESC);

-- 定期清理旧的性能指标（保留30天）
CREATE TRIGGER IF NOT EXISTS cleanup_old_performance_metrics
AFTER INSERT ON performance_metrics
WHEN NEW.timestamp < strftime('%s', 'now') - 30 * 24 * 60 * 60
BEGIN
  DELETE FROM performance_metrics
  WHERE timestamp < strftime('%s', 'now') - 30 * 24 * 60 * 60
  LIMIT 1000;
END;
```

#### 步骤 2: 创建持久化存储服务

```typescript
// src/lib/monitoring/performance-storage.ts
import { DatabaseConnection } from '@/lib/db';
import { ApiMetrics, QueryMetrics } from '@/lib/middleware/api-performance';

export interface PerformanceStorageOptions {
  batchSize?: number;
  flushInterval?: number; // 毫秒
}

export class PerformanceStorage {
  private db: DatabaseConnection;
  private pendingApiMetrics: ApiMetrics[] = [];
  private pendingDbMetrics: QueryMetrics[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private options: Required<PerformanceStorageOptions>;

  constructor(db: DatabaseConnection, options: PerformanceStorageOptions = {}) {
    this.db = db;
    this.options = {
      batchSize: options.batchSize || 100,
      flushInterval: options.flushInterval || 10000, // 10秒
    };
    this.startFlushTimer();
  }

  /**
   * 添加 API 指标
   */
  addApiMetric(metric: ApiMetrics) {
    this.pendingApiMetrics.push(metric);

    if (this.pendingApiMetrics.length >= this.options.batchSize) {
      this.flushApiMetrics();
    }
  }

  /**
   * 添加数据库指标
   */
  addDbMetric(metric: QueryMetrics) {
    this.pendingDbMetrics.push(metric);

    if (this.pendingDbMetrics.length >= this.options.batchSize) {
      this.flushDbMetrics();
    }
  }

  /**
   * 刷新待处理的 API 指标
   */
  private async flushApiMetrics() {
    if (this.pendingApiMetrics.length === 0) return;

    const metrics = [...this.pendingApiMetrics];
    this.pendingApiMetrics = [];

    try {
      const stmt = this.db.prepare(
        `INSERT INTO performance_metrics
         (type, path_or_query, duration, status, success, error, timestamp, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const stmts = metrics.map((m) => ({
        sql: stmt.sql,
        params: [
          'api',
          m.path,
          m.duration,
          m.status,
          m.success,
          m.error || null,
          m.timestamp,
          JSON.stringify({ method: m.method }),
        ],
      }));

      this.db.batch(stmts);
    } catch (error) {
      console.error('[PerformanceStorage] Failed to flush API metrics:', error);
      // 失败的指标重新加入队列
      this.pendingApiMetrics.unshift(...metrics);
    }
  }

  /**
   * 刷新待处理的数据库指标
   */
  private async flushDbMetrics() {
    if (this.pendingDbMetrics.length === 0) return;

    const metrics = [...this.pendingDbMetrics];
    this.pendingDbMetrics = [];

    try {
      const stmt = this.db.prepare(
        `INSERT INTO performance_metrics
         (type, path_or_query, duration, success, error, timestamp, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      const stmts = metrics.map((m) => ({
        sql: stmt.sql,
        params: [
          'db',
          m.query,
          m.duration,
          m.success,
          m.error || null,
          m.timestamp,
          JSON.stringify({
            rowCount: m.rowCount,
            paramsCount: m.paramsCount,
          }),
        ],
      }));

      this.db.batch(stmts);
    } catch (error) {
      console.error('[PerformanceStorage] Failed to flush DB metrics:', error);
      // 失败的指标重新加入队列
      this.pendingDbMetrics.unshift(...metrics);
    }
  }

  /**
   * 启动定时刷新
   */
  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushApiMetrics();
      this.flushDbMetrics();
    }, this.options.flushInterval);
  }

  /**
   * 从数据库读取性能指标
   */
  async getMetrics(
    type: 'api' | 'db',
    minutes: number = 5
  ): Promise<ApiMetrics[] | QueryMetrics[]> {
    const cutoff = Date.now() - minutes * 60 * 1000;

    const rows = this.db.prepare(
      `SELECT * FROM performance_metrics
       WHERE type = ? AND timestamp >= ?
       ORDER BY timestamp DESC`
    ).all(type, Math.floor(cutoff / 1000));

    if (type === 'api') {
      return rows.map((row: any) => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}'),
      }));
    } else {
      return rows.map((row: any) => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}'),
      }));
    }
  }

  /**
   * 清理所有待处理的指标
   */
  async destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushApiMetrics();
    await this.flushDbMetrics();
  }
}
```

#### 步骤 3: 集成到中间件

```typescript
// 在 api-performance.ts 中
import { performanceStorage } from '@/lib/monitoring/performance-storage';

function addMetric(metric: ApiMetrics) {
  metricsStore.push(metric);

  // 限制存储大小
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.shift();
  }

  // 持久化到数据库
  if (performanceStorage) {
    performanceStorage.addApiMetric(metric);
  }
}
```

---

## 3. 分页支持

### 问题描述
API 返回完整的数据集，没有分页支持，可能导致性能问题。

### 解决方案

#### 步骤 1: 修改 API 中间件以支持分页

```typescript
// src/lib/middleware/api-performance.ts
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function getApiMetrics(options?: PaginationOptions): ApiMetrics[] {
  const { page = 1, pageSize = 50 } = options || {};

  // 如果没有分页要求，返回所有数据（向后兼容）
  if (!options) {
    return [...metricsStore];
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return metricsStore.slice(start, end);
}

export function getApiMetricsPaginated(options?: PaginationOptions): PaginatedResult<ApiMetrics> {
  const { page = 1, pageSize = 50 } = options || {};
  const total = metricsStore.length;
  const totalPages = Math.ceil(total / pageSize);

  const data = getApiMetrics({ page, pageSize });

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
```

#### 步骤 2: 更新 API 端点

```typescript
// src/app/api/performance/report/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';
  const minutes = parseInt(searchParams.get('minutes') || '5', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

  // ... 其他逻辑 ...

  // 如果使用分页
  const paginatedMetrics = getApiMetricsPaginated({ page, pageSize });

  return NextResponse.json({
    ...report,
    api: {
      ...report.api,
      recent: paginatedMetrics,
      pagination: paginatedMetrics.pagination,
    },
  });
}
```

---

## 4. Server-Sent Events 实现

### 问题描述
当前使用轮询（setInterval）获取实时数据，效率不高。

### 解决方案

#### 步骤 1: 创建 SSE 端点

```typescript
// src/app/api/health/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { performanceCollector } from '@/lib/monitoring/performance.monitor';
import { useRealtimeNotificationStore } from '@/lib/realtime/store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const send = (event: string, data: unknown) => {
        if (isClosed) return;
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const metrics = performanceCollector.getMetrics();
      const ttfbMetrics = metrics.get('TTFB');

      // 发送初始数据
      send('initial', {
        metrics: {
          apiLatency: ttfbMetrics?.[ttfbMetrics.length - 1]?.value || 0,
          memory: getMemoryUsage(),
          timestamp: Date.now(),
        },
      });

      // 定期更新
      const interval = setInterval(() => {
        try {
          const metrics = performanceCollector.getMetrics();
          const ttfbMetrics = metrics.get('TTFB');

          send('update', {
            metrics: {
              apiLatency: ttfbMetrics?.[ttfbMetrics.length - 1]?.value || 0,
              memory: getMemoryUsage(),
              timestamp: Date.now(),
            },
          });
        } catch (error) {
          console.error('[SSE] Error sending update:', error);
        }
      }, 5000);

      // 清理
      const cleanup = () => {
        isClosed = true;
        clearInterval(interval);
        controller.close();
      };

      request.signal.addEventListener('abort', cleanup);

      // 超时后自动关闭
      setTimeout(cleanup, 5 * 60 * 1000); // 5分钟
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  });
}

function getMemoryUsage(): number {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as Performance & {
      memory?: { usedJSHeapSize: number };
    }).memory;
    if (memory) {
      return memory.usedJSHeapSize / (1024 * 1024); // MB
    }
  }
  return 0;
}
```

#### 步骤 2: 更新 HealthDashboard 组件

```typescript
// src/components/HealthDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/SettingsContext';
import { useRealtimeNotificationStore } from '@/lib/realtime/store';

export function HealthDashboard({ className = '' }: HealthDashboardProps) {
  const { isDark } = useTheme();
  const { isConnected } = useRealtimeNotificationStore();

  const [apiLatency, setApiLatency] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/health/stream');
        setIsStreaming(true);

        eventSource.addEventListener('initial', (event) => {
          const data = JSON.parse(event.data);
          setApiLatency(data.metrics.apiLatency);
          setMemoryUsage(data.metrics.memory);
          setLastUpdate(new Date(data.metrics.timestamp));
        });

        eventSource.addEventListener('update', (event) => {
          const data = JSON.parse(event.data);
          setApiLatency(data.metrics.apiLatency);
          setMemoryUsage(data.metrics.memory);
          setLastUpdate(new Date(data.metrics.timestamp));
        });

        eventSource.onerror = () => {
          console.error('[HealthDashboard] SSE connection error');
          eventSource?.close();
          setIsStreaming(false);

          // 重新连接（使用指数退避）
          setTimeout(connectSSE, 5000);
        };
      } catch (error) {
        console.error('[HealthDashboard] Failed to connect SSE:', error);
        setIsStreaming(false);
      }
    };

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, []);

  // ... 其余组件逻辑 ...
}
```

---

## 5. HealthDashboard 性能优化

### 问题描述
MetricCard 组件每次渲染都会重新创建 `statusConfig` 对象，可能导致不必要的重新渲染。

### 解决方案

#### 步骤 1: 优化 MetricCard 组件

```typescript
// 将 statusConfig 提取到组件外部
const STATUS_CONFIGS = {
  healthy: {
    color: 'bg-emerald-500',
    lightBg: 'bg-emerald-500/10',
    darkBg: 'bg-emerald-500/10',
    lightText: 'text-emerald-600',
    darkText: 'text-emerald-400',
    icon: '✓',
  },
  warning: {
    color: 'bg-amber-500',
    lightBg: 'bg-amber-500/10',
    darkBg: 'bg-amber-500/10',
    lightText: 'text-amber-600',
    darkText: 'text-amber-400',
    icon: '⚠',
  },
  critical: {
    color: 'bg-red-500',
    lightBg: 'bg-red-500/10',
    darkBg: 'bg-red-500/10',
    lightText: 'text-red-600',
    darkText: 'text-red-400',
    icon: '✗',
  },
} as const;

function MetricCard({ metric, isDark }: MetricCardProps) {
  const config = STATUS_CONFIGS[metric.status];
  const bgColor = isDark ? config.darkBg : config.lightBg;
  const textColor = isDark ? config.darkText : config.lightText;

  // 使用 CSS 动画替代 Tailwind 的 animate-pulse
  const pulseStyle = {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  };

  return (
    <div className={`rounded-lg p-4 ${bgColor} border border-zinc-200 dark:border-zinc-700`}>
      {/* Status Indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${textColor} uppercase tracking-wider`}>
          {metric.status}
        </span>
        <div
          className={`w-2 h-2 rounded-full ${config.color}`}
          style={pulseStyle}
        />
      </div>

      {/* Value */}
      <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
        {metric.value}
      </div>

      {/* Label */}
      <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'} mt-1`}>
        {metric.label}
      </div>

      {/* Trend */}
      {metric.trend && (
        <div className="mt-2 text-xs text-zinc-500">
          {metric.trend === 'up' && '↑ Increasing'}
          {metric.trend === 'down' && '↓ Decreasing'}
          {metric.trend === 'stable' && '→ Stable'}
        </div>
      )}
    </div>
  );
}
```

#### 步骤 2: 添加全局 CSS 动画

```css
/* src/app/globals.css */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

#### 步骤 3: 使用 React.memo 优化子组件

```typescript
export const MetricCard = React.memo(function MetricCard({ metric, isDark }: MetricCardProps) {
  // ... 组件逻辑 ...
});

export const OverallStatus = React.memo(function OverallStatus({ metrics, isDark }: OverallStatusProps) {
  // ... 组件逻辑 ...
});
```

---

## 6. 数据压缩配置

### 问题描述
API 响应没有使用压缩，导致数据传输量大。

### 解决方案

#### 步骤 1: 在 Next.js 配置中启用压缩

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compress: true, // 启用 gzip 压缩

  // 配置压缩选项
  experimental: {
    serverComponentsExternalPackages: ['compression'],
  },

  // 自定义压缩头
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Accept-Encoding',
            value: 'gzip, deflate, br',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

#### 步骤 2: 创建自定义中间件

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 为 API 响应添加压缩头
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Accept-Encoding', 'gzip, deflate, br');
    response.headers.set('Vary', 'Accept-Encoding');
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## 7. 速率限制实现

### 问题描述
`/api/performance/report` 端点没有速率限制，可能被滥用。

### 解决方案

#### 步骤 1: 创建速率限制中间件

```typescript
// src/lib/middleware/rate-limit.ts
import { LRUCache } from 'lru-cache';

export interface RateLimitOptions {
  interval?: number; // 时间窗口（毫秒）
  uniqueTokenPerInterval?: number; // 每个时间窗口内每个令牌的请求次数
}

export class RateLimit {
  private cache: LRUCache<string, { count: number; resetTime: number }>;

  constructor(options: RateLimitOptions = {}) {
    this.cache = new LRUCache({
      max: options.uniqueTokenPerInterval || 500,
      ttl: options.interval || 60000, // 默认 1 分钟
    });
  }

  /**
   * 检查是否超过速率限制
   */
  async check(identifier: string, limit: number): Promise<boolean> {
    const now = Date.now();
    const item = this.cache.get(identifier);

    if (!item || now > item.resetTime) {
      // 重置计数器
      this.cache.set(identifier, {
        count: 1,
        resetTime: now + this.cache.ttl!,
      });
      return true;
    }

    if (item.count >= limit) {
      return false;
    }

    // 增加计数器
    item.count++;
    this.cache.set(identifier, item);
    return true;
  }

  /**
   * 获取剩余请求次数
   */
  getRemaining(identifier: string, limit: number): number {
    const item = this.cache.get(identifier);
    if (!item) return limit;
    return Math.max(0, limit - item.count);
  }

  /**
   * 获取重置时间
   */
  getResetTime(identifier: string): number | undefined {
    const item = this.cache.get(identifier);
    return item?.resetTime;
  }
}

// 单例实例
const rateLimiter = new RateLimit({
  interval: 60000, // 1 分钟
  uniqueTokenPerInterval: 500, // 最多 500 个唯一令牌
});

export { rateLimiter };
```

#### 步骤 2: 在 API 端点中使用

```typescript
// src/app/api/performance/report/route.ts
import { rateLimiter } from '@/lib/middleware/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 获取客户端标识符
  const identifier = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'anonymous';

  // 检查速率限制（每分钟最多 60 次请求）
  const allowed = await rateLimiter.check(identifier, 60);

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
        retryAfter: rateLimiter.getResetTime(identifier),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            ((rateLimiter.getResetTime(identifier) || 0) - Date.now()) / 1000
          ).toString(),
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': rateLimiter.getRemaining(identifier, 60).toString(),
          'X-RateLimit-Reset': (rateLimiter.getResetTime(identifier) || 0).toString(),
        },
      }
    );
  }

  // ... 原有的 API 逻辑 ...
}
```

---

## 实施优先级

### 第一阶段（立即实施）🔴

1. **API 路由缓存** - 预计影响：高
2. **数据压缩配置** - 预计影响：中
3. **速率限制实现** - 预计影响：高

### 第二阶段（短期实施）🟡

4. **HealthDashboard 性能优化** - 预计影响：中
5. **分页支持** - 预计影响：高
6. **SSE 实现** - 预计影响：中

### 第三阶段（中期实施）🟢

7. **性能指标持久化** - 预计影响：高（但需要更多工作）

---

## 测试建议

每个优化实施后，都应该进行以下测试：

1. **性能测试**: 使用 `performance.now()` 测量响应时间
2. **负载测试**: 使用 Apache Bench 或 k6 模拟高并发
3. **内存测试**: 检查内存使用是否在合理范围内
4. **集成测试**: 确保优化不会破坏现有功能

```bash
# 示例：使用 Apache Bench 测试性能
ab -n 1000 -c 10 http://localhost:3000/api/performance/report

# 示例：使用 k6 进行负载测试
k6 run --vus 100 --duration 30s performance-test.js
```

---

**文档结束**
