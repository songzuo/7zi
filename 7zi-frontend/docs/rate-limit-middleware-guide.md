# 限流中间件应用指南

本文档说明如何在 v1.12.0 版本中使用 API 限流中间件。

## 安装依赖

确保已安装必要的依赖：

```bash
npm install next
```

## 中间件位置

限流中间件位于：
- `src/lib/middleware/rate-limit-middleware.ts` - 限流中间件实现
- `src/lib/middleware/__tests__/rate-limit-middleware.test.ts` - 限流中间件测试

## 应用限流中间件

### 1. 在 Next.js App Router 中使用

#### 方式一：使用预定义的中间件

```typescript
// src/app/api/workflow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { RateLimitMiddlewarePresets } from '@/lib/middleware/rate-limit-middleware'

export async function GET(request: NextRequest) {
  // 应用 Workflow 限流 (100 req/min)
  const rateLimitResponse = await RateLimitMiddlewarePresets.workflow(request)
  
  if (rateLimitResponse.status === 429) {
    return rateLimitResponse
  }
  
  // 正常业务逻辑
  return NextResponse.json({ data: 'workflows' })
}

export async function POST(request: NextRequest) {
  // 应用 Workflow 限流 (100 req/min)
  const rateLimitResponse = await RateLimitMiddlewarePresets.workflow(request)
  
  if (rateLimitResponse.status === 429) {
    return rateLimitResponse
  }
  
  // 正常业务逻辑
  const body = await request.json()
  return NextResponse.json({ created: true })
}
```

#### 方式二：使用自定义限流配置

```typescript
// src/app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRateLimitMiddleware } from '@/lib/middleware/rate-limit-middleware'

// 创建自定义限流中间件
const rateLimit = createRateLimitMiddleware({
  algorithm: 'sliding_window' as any,
  windowMs: 60 * 1000, // 1 分钟
  maxRequests: 200,    // 200 req/min
  keyGenerator: (request) => {
    // 基于用户 ID 限流（如果已认证）
    const userId = request.headers.get('x-user-id') || 'anonymous'
    return `agent:${userId}`
  },
  skip: (request) => {
    // 跳过内部请求
    return request.headers.get('x-internal') === 'true'
  },
})

export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimit(request)
  
  if (rateLimitResponse.status === 429) {
    return rateLimitResponse
  }
  
  return NextResponse.json({ agents: [] })
}
```

### 2. 在 API 路由中使用

```typescript
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { RateLimitMiddlewarePresets } from '@/lib/middleware/rate-limit-middleware'

export async function GET(request: NextRequest) {
  // 应用 Search 限流 (50 req/min)
  const rateLimitResponse = await RateLimitMiddlewarePresets.search(request)
  
  if (rateLimitResponse.status === 429) {
    return rateLimitResponse
  }
  
  // 获取搜索参数
  const query = request.nextUrl.searchParams.get('q')
  
  // 执行搜索
  const results = await performSearch(query)
  
  return NextResponse.json({ results })
}
```

### 3. 在全局中间件中使用

```typescript
// src/middleware.ts
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit-middleware'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // 自动根据路径选择限流策略
  const rateLimitResponse = await rateLimitMiddleware(request)
  
  if (rateLimitResponse.status === 429) {
    return rateLimitResponse
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

## 预定义的限流策略

### Workflow API (100 req/min)
- 路径：`/api/workflow/*`
- 算法：Sliding Window Counter
- 用途：工作流管理 API

```typescript
import { RateLimitMiddlewarePresets } from '@/lib/middleware/rate-limit-middleware'
await RateLimitMiddlewarePresets.workflow(request)
```

### Agent API (200 req/min)
- 路径：`/api/agent/*`
- 算法：Sliding Window Counter
- 用途：智能体管理 API

```typescript
import { RateLimitMiddlewarePresets } from '@/lib/middleware/rate-limit-middleware'
await RateLimitMiddlewarePresets.agent(request)
```

### Search API (50 req/min)
- 路径：`/api/search/*`
- 算法：Sliding Window Counter
- 用途：搜索 API（计算密集型）

```typescript
import { RateLimitMiddlewarePresets } from '@/lib/middleware/rate-limit-middleware'
await RateLimitMiddlewarePresets.search(request)
```

### Auth API (5 req/min)
- 路径：`/api/auth/*`
- 算法：Token Bucket（允许一定突发流量）
- 用途：认证 API（登录、注册等）

```typescript
import { RateLimitMiddlewarePresets } from '@/lib/middleware/rate-limit-middleware'
await RateLimitMiddlewarePresets.auth(request)
```

## 响应头

限流中间件会在响应中添加以下头：

- `X-RateLimit-Limit`: 时间窗口内的最大请求数
- `X-RateLimit-Remaining`: 剩余请求数
- `X-RateLimit-Reset`: 限流重置时间（Unix 时间戳，秒）
- `Retry-After`: 建议重试的等待时间（秒）

示例：

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1712246400
```

当限流时：

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1712246400
Retry-After: 30
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 30
}
```

## 算法选择

### Token Bucket（令牌桶）
- **优点**：允许突发流量，平滑流量控制
- **适用场景**：认证 API、允许短时高并发的场景
- **特点**：令牌以固定速率补充，请求消耗令牌

```typescript
createRateLimitMiddleware({
  algorithm: 'token_bucket',
  maxRequests: 10,
  windowMs: 60 * 1000,
})
```

### Sliding Window Counter（滑动窗口计数器）
- **优点**：精确控制速率，防止突发流量
- **适用场景**：通用 API、需要严格限流的场景
- **特点**：统计时间窗口内的请求数，精确控制

```typescript
createRateLimitMiddleware({
  algorithm: 'sliding_window',
  maxRequests: 100,
  windowMs: 60 * 1000,
})
```

## 自定义配置

### 基于用户 ID 限流

```typescript
const rateLimit = createRateLimitMiddleware({
  keyGenerator: (request) => {
    const userId = request.headers.get('x-user-id') || 'anonymous'
    return `api:${userId}`
  },
})
```

### 基于 IP + 路径限流

```typescript
const rateLimit = createRateLimitMiddleware({
  keyGenerator: (request) => {
    const ip = getClientIP(request as unknown as Request)
    const path = request.nextUrl.pathname
    return `${ip}:${path}`
  },
})
```

### 跳过特定请求

```typescript
const rateLimit = createRateLimitMiddleware({
  skip: (request) => {
    // 跳过内部请求
    if (request.headers.get('x-internal') === 'true') {
      return true
    }
    
    // 跳过管理员请求
    if (request.headers.get('x-user-role') === 'admin') {
      return true
    }
    
    return false
  },
})
```

### 自定义限流响应

```typescript
const rateLimit = createRateLimitMiddleware({
  onLimitReached: (request, result) => {
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', result.limit.toString())
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
    headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
    headers.set('Retry-After', result.resetAfter.toString())
    headers.set('Content-Type', 'application/json')

    return NextResponse.json(
      {
        error: 'RATE_LIMIT_EXCEEDED',
        code: 429,
        message: '您请求过于频繁，请稍后再试',
        data: {
          limit: result.limit,
          remaining: result.remaining,
          resetAt: result.resetTime,
          retryAfter: result.resetAfter,
        },
      },
      { status: 429, headers }
    )
  },
})
```

## 测试

运行测试：

```bash
npm test src/lib/middleware/__tests__/rate-limit-middleware.test.ts
```

## 分布式部署

当前实现基于内存存储，适用于单机部署。如需支持分布式部署，可以：

1. **使用 Redis 存储**：
   - 将 `MemoryRateLimitStorage` 替换为 `RedisRateLimitStorage`
   - 使用 Redis Hash 存储限流状态
   - 使用 Lua 脚本保证原子性操作

2. **配置 Redis**：

```typescript
import { RedisRateLimitStorage } from '@/lib/rate-limit/redis-storage'

const redisStorage = new RedisRateLimitStorage({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
})

const limiter = new RateLimiter(redisStorage, config)
```

## 性能考虑

- **内存占用**：每个限流键约占用 100-200 字节
- **清理策略**：默认每 60 秒清理一次过期数据
- **并发安全**：使用 Map 原子操作，线程安全

## 最佳实践

1. **根据 API 类型选择合适的限流策略**
   - 计算密集型 API：使用较严格的限流（如 Search API）
   - 读取密集型 API：可以使用较宽松的限流
   - 认证 API：使用 Token Bucket 算法

2. **合理设置限流键**
   - 基于 IP：适合公开 API
   - 基于用户 ID：适合需要认证的 API
   - 基于 API Key：适合对外开放的 API

3. **监控和调整**
   - 定期检查限流日志
   - 根据实际使用情况调整限流参数
   - 监控限流触发频率

4. **用户体验**
   - 在前端显示限流状态
   - 使用响应头实现客户端限流
   - 提供清晰的限流错误信息

## 故障排查

### 限流过于严格

检查：
- 限流键是否正确生成
- 不同用户/请求是否使用了同一个键
- 时间窗口设置是否合理

### 限流不生效

检查：
- 中间件是否正确应用
- 是否有 skip 函数导致跳过
- 检查日志中的限流信息

### 性能问题

检查：
- 是否有内存泄漏
- 清理间隔是否合理
- 考虑使用 Redis 替代内存存储

## 升级指南

从旧版本升级：

1. 替换旧的限流实现
2. 调整限流参数以匹配新版本
3. 更新错误处理逻辑
4. 测试所有 API 路由

## 参考资料

- 限流中间件实现：`src/lib/middleware/rate-limit-middleware.ts`
- 限流器核心：`src/lib/rate-limit/limiter.ts`
- 存储接口：`src/lib/rate-limit/storage.ts`
- 配置定义：`src/lib/rate-limit/config.ts`
