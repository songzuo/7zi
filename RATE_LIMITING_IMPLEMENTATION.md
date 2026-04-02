# API 限流中间件实现报告

## 实现概览

本次任务为 7zi-project 项目实现了完整的 API 限流中间件，支持分布式和本地两种部署模式。所有核心功能已完成并经过全面测试。

## 测试结果

```
✓ 2 个测试文件全部通过
✓ 30 个测试用例全部通过
- 滑动窗口算法测试
- 令牌桶算法测试
- 内存存储测试
- 并发请求测试
- 存储降级测试
- 配置验证测试
```

## 实现的功能

### 1. 核心算法

#### 滑动窗口算法 (Sliding Window)

- **文件**: `src/lib/rate-limit/sliding-window.ts`
- **特点**:
  - 使用 Redis Sorted Sets 实现
  - 精确的时间窗口控制
  - 自动清理过期数据
  - 支持高并发场景
- **适用场景**:
  - 需要精确控制请求速率的 API
  - 常规 API 端点
- **已测试**: ✅ 通过

#### 令牌桶算法 (Token Bucket)

- **文件**: `src/lib/rate-limit/token-bucket.ts`
- **特点**:
  - 使用 Redis Hash + Lua 脚本实现
  - 支持突发流量处理
  - 可配置令牌补充速率
  - 平滑流量整形
- **适用场景**:
  - 需要处理突发流量的端点
  - 登录、注册等认证相关接口
- **已测试**: ✅ 通过

### 2. 存储后端

#### Redis 存储

- **文件**: `src/lib/redis/client.ts`
- **配置**:

  ```bash
  # 使用 URL
  REDIS_URL=redis://:password@host:port/db

  # 或使用单独配置
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD=
  REDIS_DB=0
  ```

#### 内存存储

- **文件**: `src/lib/rate-limit/memory-store.ts`
- **特点**:
  - 使用 Map 数据结构
  - 定期清理过期数据（每分钟）
  - 适合单机部署
  - 作为 Redis 不可用时的后备方案
- **已测试**: ✅ 16 个测试全部通过

#### 存储工厂

- **文件**: `src/lib/rate-limit/storage-factory.ts`
- **功能**:
  - 自动选择存储后端
  - Redis 不可用时自动降级到内存存储
  - 支持运行时动态切换
  - 缓存 Redis 可用性状态（5 秒）
- **已测试**: ✅ 通过

### 3. 配置系统

#### 环境变量配置

- **文件**: `src/lib/rate-limit/config.ts`

| 环境变量                  | 默认值  | 说明                       |
| ------------------------- | ------- | -------------------------- |
| `RATE_LIMIT_WINDOW_MS`    | `60000` | 时间窗口（毫秒）           |
| `RATE_LIMIT_MAX_REQUESTS` | `100`   | 最大请求数                 |
| `RATE_LIMIT_BY`           | `ip`    | 限流维度（ip/userId/both） |
| `ENABLE_REDIS_RATE_LIMIT` | `false` | 启用 Redis 分布式限流      |
| `RATE_LIMIT_FAIL_OPEN`    | `true`  | 失败时是否放行             |
| `RATE_LIMIT_CACHE_TTL`    | `3600`  | 限流器缓存 TTL（秒）       |

#### 限流维度

**按 IP 限流** (`RATE_LIMIT_BY=ip`)

- 根据客户端 IP 地址限流
- 适合公开 API

**按用户 ID 限流** (`RATE_LIMIT_BY=userId`)

- 根据认证用户 ID 限流
- 适合需要登录的 API

**双重限流** (`RATE_LIMIT_BY=both`)

- 同时支持 IP 和用户 ID
- 优先使用用户 ID，未认证时使用 IP

### 4. 中间件集成

#### API 路由中间件

- **文件**: `src/lib/rate-limit/middleware.ts`
- **使用方法**:

```typescript
import { withRateLimit } from '@/lib/rate-limit/middleware'

export const GET = withRateLimit(async (req: NextRequest) => {
  return NextResponse.json({ message: 'Hello' })
})
```

**自定义配置**:

```typescript
export const POST = withRateLimit(
  async (req: NextRequest) => {
    return NextResponse.json({ success: true })
  },
  {
    maxRequests: 5, // 5 次请求
    windowMs: 60000, // 60 秒窗口
    limitBy: 'userId', // 按用户 ID 限流
  }
)
```

#### Next.js 中间件

- **使用方法**:

```typescript
// middleware.ts
import { createRateLimitMiddleware } from '@/lib/rate-limit/middleware'

export const middleware = createRateLimitMiddleware({
  enabled: true,
  skipPaths: ['/_next', '/static', '/favicon.ico'],
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### 5. 响应头

所有限流请求都会包含以下响应头：

| 响应头                  | 说明                         |
| ----------------------- | ---------------------------- |
| `X-RateLimit-Limit`     | 限流阈值                     |
| `X-RateLimit-Remaining` | 剩余请求数                   |
| `X-RateLimit-Reset`     | 重置时间（ISO 8601）         |
| `X-RateLimit-Algorithm` | 使用的算法                   |
| `Retry-After`           | 重试等待时间（秒，仅限流时） |

### 6. 错误响应

当超出限流时，返回 429 状态码：

```json
{
  "success": false,
  "error": {
    "type": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 100,
      "windowMs": 60000,
      "resetAt": "2026-03-24T06:00:00.000Z",
      "retryAfter": 30,
      "algorithm": "sliding-window"
    }
  }
}
```

## 使用示例

### 示例 1: 基本 API 限流

```typescript
// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/rate-limit/middleware'

export const GET = withRateLimit(async (req: NextRequest) => {
  // 你的业务逻辑
  const tasks = await getTasks()

  return NextResponse.json({ tasks })
})

export const POST = withRateLimit(async (req: NextRequest) => {
  const body = await req.json()
  const task = await createTask(body)

  return NextResponse.json({ task }, { status: 201 })
})
```

### 示例 2: 严格限流（登录端点）

```typescript
// src/app/api/auth/login/route.ts
import { withRateLimit } from '@/lib/rate-limit/middleware'

export const POST = withRateLimit(
  async (req: NextRequest) => {
    const body = await req.json()
    const result = await authenticate(body)

    return NextResponse.json({ success: true, token: result.token })
  },
  {
    maxRequests: 5, // 5 次尝试
    windowMs: 60000, // 1 分钟窗口
    limitBy: 'ip', // 按 IP 限流
  }
)
```

### 示例 3: 用户级别限流

```typescript
// src/app/api/projects/route.ts
import { withRateLimit } from '@/lib/rate-limit/middleware'

export const POST = withRateLimit(
  async (req: NextRequest) => {
    const body = await req.json()
    const project = await createProject(body)

    return NextResponse.json({ project }, { status: 201 })
  },
  {
    maxRequests: 20, // 20 次请求
    windowMs: 60000, // 1 分钟窗口
    limitBy: 'userId', // 按用户 ID 限流
  }
)
```

## 测试

### 运行测试

```bash
# 运行所有限流测试
npm test -- src/lib/rate-limit

# 运行内存存储测试
npm test -- src/lib/rate-limit/__tests__/memory-store.test.ts

# 运行限流集成测试
npm test -- src/lib/rate-limit/__tests__/rate-limit.test.ts
```

### 测试覆盖

- [x] 滑动窗口算法测试
- [x] 令牌桶算法测试
- [x] 内存存储测试
- [x] 并发请求测试
- [x] 存储降级测试
- [x] 配置验证测试

**测试结果**: 30/30 通过 ✅

## 性能优化

### 1. Redis 连接池

- 使用单个 Redis 连接实例
- 支持连接复用
- 自动重连机制

### 2. 管道操作

- 使用 Redis Pipeline 减少网络往返
- 原子性操作保证一致性

### 3. 缓存机制

- 限流器实例缓存
- Redis 可用性状态缓存（5 秒）
- 减少重复计算

### 4. 内存管理

- 定期清理过期数据
- 使用 Map 高效存储
- 防止内存泄漏

## 部署建议

### 开发环境

```bash
# .env.development
ENABLE_REDIS_RATE_LIMIT=false
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_BY=ip
```

### 生产环境（单机）

```bash
# .env.production
ENABLE_REDIS_RATE_LIMIT=false
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_BY=ip
```

### 生产环境（分布式）

```bash
# .env.production
ENABLE_REDIS_RATE_LIMIT=true
REDIS_URL=redis://:password@redis-host:6379/0
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_BY=both
RATE_LIMIT_FAIL_OPEN=true
```

## 监控和日志

限流中间件会记录以下事件：

```typescript
logger.info('Rate limit check', {
  path: '/api/tasks',
  allowed: true,
  remaining: 99,
  algorithm: 'sliding-window',
  limit: 100,
})

logger.warn('Rate limit exceeded', {
  path: '/api/auth/login',
  algorithm: 'token-bucket',
  limit: 5,
})
```

建议在生产环境中：

1. 监控限流事件频率
2. 跟踪被拒绝的请求
3. 分析限流模式
4. 根据实际情况调整阈值

## 最佳实践

1. **为不同端点设置不同的限流策略**
   - 认证端点：严格限流
   - 公开 API：中等限流
   - 内部 API：宽松限流

2. **选择合适的算法**
   - 精确控制：滑动窗口
   - 突发流量：令牌桶

3. **配置合理的阈值**
   - 避免误伤正常用户
   - 防止 DDoS 攻击
   - 考虑业务需求

4. **启用 Redis 分布式限流**
   - 多实例部署时必须
   - 保证一致性
   - 提高可靠性

5. **监控和调优**
   - 定期检查限流日志
   - 根据实际情况调整
   - 持续优化

## 故障处理

### Redis 不可用

系统会自动降级到内存存储：

- 配置 `RATE_LIMIT_FAIL_OPEN=true` 时，继续允许请求
- 配置 `RATE_LIMIT_FAIL_OPEN=false` 时，拒绝所有请求

### 高并发场景

- 使用 Redis 处理高并发
- 使用 Pipeline 减少延迟
- 监控 Redis 性能

### 内存不足

- 定期清理过期数据
- 减少缓存时间
- 启用 Redis 存储

## 已知限制

1. **时间精度**
   - 滑动窗口算法的精度受限于系统时钟
   - 分布式环境下需要注意时钟同步

2. **内存使用**
   - 内存存储在大量唯一 IP 时会占用较多内存
   - 建议生产环境使用 Redis

3. **令牌桶补充**
   - 令牌补充速率是近似值
   - 高并发时可能有轻微偏差

## 后续优化建议

1. **高级功能**
   - 动态调整限流阈值
   - 基于用户等级的限流
   - IP 白名单/黑名单
   - 限流事件聚合分析

2. **性能优化**
   - 使用 Redis Cluster
   - 实现更高效的清理算法
   - 优化内存使用

3. **可观测性**
   - Prometheus 指标导出
   - Grafana 仪表板
   - 实时限流监控

## 总结

本次实现了一个功能完整、生产就绪的 API 限流中间件，具有以下特点：

✅ 支持分布式和本地两种部署模式
✅ 提供滑动窗口和令牌桶两种算法
✅ 支持 IP 和用户 ID 两种限流维度
✅ 完整的环境变量配置
✅ 自动降级机制
✅ 详细的响应头和错误信息
✅ 全面的单元测试覆盖（30/30 通过）
✅ 高并发性能优化
✅ 生产环境监控支持

该实现可以立即在生产环境中使用，为 API 提供可靠的限流保护。

---

## 文件清单

### 核心实现文件

1. `src/lib/rate-limit/config.ts` - 配置管理
2. `src/lib/rate-limit/middleware.ts` - 中间件包装器
3. `src/lib/rate-limit/memory-store.ts` - 内存存储实现
4. `src/lib/rate-limit/storage-factory.ts` - 存储工厂
5. `src/lib/rate-limit/sliding-window.ts` - 滑动窗口算法（已更新）
6. `src/lib/rate-limit/token-bucket.ts` - 令牌桶算法（已更新）

### 测试文件

1. `src/lib/rate-limit/__tests__/memory-store.test.ts` - 内存存储测试
2. `src/lib/rate-limit/__tests__/rate-limit.test.ts` - 限流集成测试

### 文档文件

1. `RATE_LIMITING_IMPLEMENTATION.md` - 本实现报告
2. `.env.example` - 环境变量示例（已更新）
