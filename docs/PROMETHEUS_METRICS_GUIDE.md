# ============================================
# 7zi-frontend 应用指标采集
# Prometheus Client for Next.js
# ============================================

## 安装依赖

```bash
npm install prom-client
```

## 创建指标注册表

```typescript
// lib/metrics/index.ts
import client from 'prom-client';

// 创建注册表
export const register = new client.Registry();

// 添加默认指标
client.collectDefaultMetrics({ register });

// 自定义指标

// HTTP 请求总数
export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

// HTTP 请求耗时
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// 活跃请求数
export const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [register],
});

// 错误总数
export const errorsTotal = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'source'],
  registers: [register],
});

// 缓存命中率
export const cacheHitRate = new client.Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type'],
  registers: [register],
});

// 数据库连接池
export const dbPoolSize = new client.Gauge({
  name: 'database_pool_size',
  help: 'Database connection pool size',
  registers: [register],
});

// 导出所有指标
export const metrics = {
  httpRequestTotal,
  httpRequestDuration,
  httpRequestsInFlight,
  errorsTotal,
  cacheHitRate,
  dbPoolSize,
};
```

## 创建 API 端点

```typescript
// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { register } from '@/lib/metrics';

export async function GET() {
  try {
    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': register.contentType,
      },
    });
  } catch (error) {
    console.error('Error collecting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}
```

## 中间件集成

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { httpRequestTotal, httpRequestDuration, httpRequestsInFlight } from '@/lib/metrics';

export function middleware(request: NextRequest) {
  const start = Date.now();
  
  // 增加活跃请求数
  httpRequestsInFlight.inc();
  
  const response = NextResponse.next();
  
  // 记录请求完成
  response.headers.set('X-Request-Start', start.toString());
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

## API 路由包装器

```typescript
// lib/metrics/api-wrapper.ts
import { httpRequestTotal, httpRequestDuration, errorsTotal } from './index';

export function withMetrics(handler: Function) {
  return async (request: Request, context: any) => {
    const start = Date.now();
    const method = request.method;
    const path = new URL(request.url).pathname;
    
    try {
      const response = await handler(request, context);
      
      // 记录成功请求
      httpRequestTotal.labels({ method, path, status: response.status }).inc();
      httpRequestDuration.labels({ method, path }).observe((Date.now() - start) / 1000);
      
      return response;
    } catch (error) {
      // 记录错误
      httpRequestTotal.labels({ method, path, status: 500 }).inc();
      httpRequestDuration.labels({ method, path }).observe((Date.now() - start) / 1000);
      errorsTotal.labels({ type: 'api_error', source: path }).inc();
      
      throw error;
    }
  };
}
```

## 使用示例

```typescript
// app/api/tasks/route.ts
import { NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics/api-wrapper';

export const GET = withMetrics(async (request: Request) => {
  // 你的业务逻辑
  const tasks = await getTasks();
  return NextResponse.json(tasks);
});

export const POST = withMetrics(async (request: Request) => {
  // 你的业务逻辑
  const body = await request.json();
  const task = await createTask(body);
  return NextResponse.json(task, { status: 201 });
});
```

## 健康检查端点

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { register } from '@/lib/metrics';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_SENTRY_RELEASE || 'unknown',
    uptime: process.uptime(),
    metrics: {
      collectors: register.getCollectorsAsArray().length,
    },
  };

  return NextResponse.json(health, { status: 200 });
}
```

## Prometheus 配置

在 `prometheus.yml` 中添加:

```yaml
scrape_configs:
  - job_name: '7zi-frontend'
    static_configs:
      - targets: ['7zi-frontend:3000']
    metrics_path: /api/metrics
    scheme: http
    scrape_interval: 10s
```

## 仪表盘查询示例

```promql
# 请求速率 (按状态码)
sum(rate(http_requests_total{job="7zi-frontend"}[5m])) by (status)

# 错误率
sum(rate(http_requests_total{job="7zi-frontend",status=~"5.."}[5m])) 
/ sum(rate(http_requests_total{job="7zi-frontend"}[5m])) * 100

# P95 响应时间
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket{job="7zi-frontend"}[5m])) by (le)
)

# 最慢的 API 端点
topk(5, 
  avg(rate(http_request_duration_seconds_sum{job="7zi-frontend"}[5m])) 
  by (path)
)

# 错误类型分布
sum(rate(errors_total{job="7zi-frontend"}[1h])) by (type)
```

---

*文档版本：1.0*
*创建日期：2026-03-08*
