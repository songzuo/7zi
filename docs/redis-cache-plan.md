# Redis 缓存集成方案

**文档版本:** 1.0
**创建日期:** 2026-03-29
**适用项目:** 7zi-frontend
**目标:** 优化 API 响应性能，降低数据库负载

---

## 📋 概述

### 当前状态
- Redis 已安装但未使用
- API 响应时间: ~300ms
- 数据库查询压力大

### 目标状态
- Redis 缓存命中率 > 80%
- API 响应时间: < 100ms (缓存命中)
- 数据库负载降低 70%+

---

## 🏗️ 架构设计

### 缓存层次结构

```
用户请求
    │
    ▼
┌─────────────────┐
│  Cloudflare CDN │ (静态资源、页面缓存)
│  TTL: 2h - 1y   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Nginx 缓存    │ (静态页面)
│   TTL: 5m - 1h  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Redis 缓存     │ (API 响应、会话)
│   TTL: 1m - 24h │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │ (持久化数据)
└─────────────────┘
```

### 数据流

```
读取流程:
1. 检查 Redis 缓存
2. 缓存命中 → 返回数据
3. 缓存未命中 → 查询数据库 → 写入缓存 → 返回数据

写入流程:
1. 写入数据库
2. 删除/更新相关缓存
```

---

## 📦 需要缓存的 API 端点

### 高优先级（频繁访问）

| 端点 | 缓存键模式 | TTL | 说明 |
|------|-----------|-----|------|
| `/api/projects` | `projects:user:{userId}` | 5m | 用户项目列表 |
| `/api/projects/{id}` | `project:{id}` | 10m | 单个项目详情 |
| `/api/users/me` | `user:{userId}` | 30m | 当前用户信息 |
| `/api/search` | `search:{query_hash}` | 2m | 搜索结果 |

### 中优先级（定期访问）

| 端点 | 缓存键模式 | TTL | 说明 |
|------|-----------|-----|------|
| `/api/ratings` | `ratings:project:{id}` | 15m | 项目评分 |
| `/api/notifications` | `notifications:user:{userId}` | 1m | 通知列表 |
| `/api/comments` | `comments:project:{id}` | 5m | 评论列表 |

### 低优先级（偶尔访问）

| 端点 | 缓存键模式 | TTL | 说明 |
|------|-----------|-----|------|
| `/api/settings` | `settings:user:{userId}` | 1h | 用户设置 |
| `/api/stats` | `stats:global` | 10m | 全局统计 |

### 不缓存的内容

| 端点 | 原因 |
|------|------|
| `/api/auth/*` | 安全敏感 |
| `/api/payment/*` | 实时性要求 |
| `/api/webhooks/*` | 外部回调 |
| WebSocket 消息 | 实时通信 |

---

## 🔑 缓存键命名规则

### 命名规范

```
格式: {namespace}:{entity}:{identifier}:{modifier}

示例:
  project:123                          # 项目 123
  projects:user:456                    # 用户 456 的项目列表
  search:md5(query)                    # 搜索结果
  session:abc123                       # 会话数据
  rate_limit:api:192.168.1.1           # API 限流
```

### 键前缀分类

| 前缀 | 用途 | 示例 |
|------|------|------|
| `project:` | 单个项目 | `project:123` |
| `projects:` | 项目列表 | `projects:user:456` |
| `user:` | 用户信息 | `user:123` |
| `search:` | 搜索缓存 | `search:a1b2c3` |
| `session:` | 会话数据 | `session:token123` |
| `rate_limit:` | 限流计数 | `rate_limit:api:ip` |
| `cache:` | 通用缓存 | `cache:feature:xyz` |

### 键过期策略

```typescript
// 缓存 TTL 配置
const CACHE_TTL = {
  // 短期缓存（频繁变化）
  SEARCH_RESULTS: 120,        // 2 分钟
  NOTIFICATIONS: 60,          // 1 分钟
  ONLINE_STATUS: 30,          // 30 秒

  // 中期缓存（适度变化）
  PROJECT_LIST: 300,          // 5 分钟
  PROJECT_DETAIL: 600,        // 10 分钟
  USER_PROFILE: 1800,         // 30 分钟
  COMMENTS: 300,              // 5 分钟

  // 长期缓存（很少变化）
  USER_SETTINGS: 3600,        // 1 小时
  STATIC_CONFIG: 86400,       // 24 小时
  FEATURE_FLAGS: 3600,        // 1 小时
} as const;
```

---

## 💻 实现代码

### Redis 连接配置

```typescript
// lib/redis.ts
import Redis from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// 连接事件处理
redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('error', (err) => {
  console.error('[Redis] Error:', err);
});

redis.on('close', () => {
  console.log('[Redis] Connection closed');
});
```

### 缓存工具函数

```typescript
// lib/cache/redis-cache.ts
import { redis } from '../redis';

export interface CacheOptions {
  ttl?: number;           // 过期时间（秒）
  prefix?: string;        // 键前缀
  compress?: boolean;     // 是否压缩
  skipCache?: boolean;    // 跳过缓存
}

/**
 * 获取缓存或执行函数
 */
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 300, prefix = '', skipCache = false } = options;
  const cacheKey = prefix ? `${prefix}:${key}` : key;

  // 跳过缓存（开发环境或强制刷新）
  if (skipCache || process.env.CACHE_DISABLED === 'true') {
    return fetchFn();
  }

  try {
    // 尝试从缓存获取
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    console.error(`[Cache] Get error for key ${cacheKey}:`, error);
  }

  // 从数据源获取
  const data = await fetchFn();

  // 写入缓存（异步，不阻塞响应）
  setCache(cacheKey, data, ttl).catch((err) => {
    console.error(`[Cache] Set error for key ${cacheKey}:`, err);
  });

  return data;
}

/**
 * 设置缓存
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttl: number = 300
): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error(`[Cache] Set error for key ${key}:`, error);
  }
}

/**
 * 删除缓存
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[Cache] Delete error for key ${key}:`, error);
  }
}

/**
 * 批量删除缓存（模式匹配）
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      return keys.length;
    }
    return 0;
  } catch (error) {
    console.error(`[Cache] Delete pattern error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * 缓存失效（数据更新时调用）
 */
export async function invalidateCache(
  patterns: string[]
): Promise<void> {
  await Promise.all(patterns.map((p) => deleteCachePattern(p)));
}

/**
 * 检查缓存是否存在
 */
export async function hasCache(key: string): Promise<boolean> {
  try {
    return (await redis.exists(key)) === 1;
  } catch {
    return false;
  }
}

/**
 * 获取缓存 TTL
 */
export async function getCacheTTL(key: string): Promise<number> {
  try {
    return await redis.ttl(key);
  } catch {
    return -1;
  }
}
```

### API 路由集成示例

```typescript
// app/api/projects/route.ts
import { getCached, invalidateCache } from '@/lib/cache/redis-cache';
import { CACHE_TTL } from '@/lib/cache/constants';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const projects = await getCached(
    `projects:user:${userId}`,
    () => fetchProjects(userId),
    {
      ttl: CACHE_TTL.PROJECT_LIST,
      prefix: 'api',
    }
  );

  return Response.json(projects);
}

export async function POST(request: Request) {
  const data = await request.json();
  const project = await createProject(data);

  // 失效相关缓存
  await invalidateCache([
    `api:projects:user:${data.userId}`,
    `api:project:*`,
  ]);

  return Response.json(project);
}
```

### 项目详情缓存

```typescript
// app/api/projects/[id]/route.ts
import { getCached, deleteCache } from '@/lib/cache/redis-cache';
import { CACHE_TTL } from '@/lib/cache/constants';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const project = await getCached(
    `project:${params.id}`,
    () => fetchProjectById(params.id),
    {
      ttl: CACHE_TTL.PROJECT_DETAIL,
      prefix: 'api',
    }
  );

  return Response.json(project);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const data = await request.json();
  const project = await updateProject(params.id, data);

  // 删除该项目缓存
  await deleteCache(`api:project:${params.id}`);

  return Response.json(project);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await deleteProject(params.id);

  // 删除相关缓存
  await deleteCache(`api:project:${params.id}`);

  return new Response(null, { status: 204 });
}
```

### 搜索结果缓存

```typescript
// app/api/search/route.ts
import crypto from 'crypto';
import { getCached } from '@/lib/cache/redis-cache';
import { CACHE_TTL } from '@/lib/cache/constants';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const page = searchParams.get('page') || '1';
  const filters = searchParams.get('filters') || '';

  // 生成缓存键（基于查询参数哈希）
  const queryHash = crypto
    .createHash('md5')
    .update(`${query}:${page}:${filters}`)
    .digest('hex');

  const results = await getCached(
    `search:${queryHash}`,
    () => performSearch(query, parseInt(page), filters),
    {
      ttl: CACHE_TTL.SEARCH_RESULTS,
      prefix: 'api',
    }
  );

  return Response.json(results);
}
```

---

## 🔄 缓存失效策略

### 主动失效

```typescript
// 数据更新时主动清除缓存

// 1. 创建项目后失效用户项目列表
await invalidateCache([`api:projects:user:${userId}`]);

// 2. 更新项目后失效项目详情
await deleteCache(`api:project:${projectId}`);

// 3. 用户修改资料后失效用户信息
await deleteCache(`api:user:${userId}`);
```

### 定时刷新

```typescript
// lib/cache/warmup.ts

/**
 * 预热缓存（启动时或定时执行）
 */
export async function warmupCache() {
  console.log('[Cache] Starting warmup...');

  // 预加载热门数据
  const hotProjects = await getHotProjectIds();
  await Promise.all(
    hotProjects.map((id) =>
      getCached(`project:${id}`, () => fetchProjectById(id))
    )
  );

  console.log('[Cache] Warmup complete');
}

/**
 * 定时刷新（每小时）
 */
export async function refreshStaleCache() {
  // 刷新即将过期的缓存
  // 实现需要记录缓存创建时间
}
```

---

## 📊 监控指标

### 关键指标

| 指标 | 计算方式 | 目标值 |
|------|---------|--------|
| 缓存命中率 | 命中次数 / 总请求 | > 80% |
| 平均响应时间 | 缓存命中时 | < 50ms |
| 内存使用量 | used_memory | < 500MB |
| 键数量 | keys count | < 100,000 |

### 监控实现

```typescript
// lib/cache/metrics.ts
import { redis } from '../redis';

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: string;
  keyCount: number;
}

export async function getCacheMetrics(): Promise<CacheMetrics> {
  const info = await redis.info('stats');
  const memoryInfo = await redis.info('memory');

  // 解析命中率
  const hits = parseInfoValue(info, 'keyspace_hits');
  const misses = parseInfoValue(info, 'keyspace_misses');
  const total = hits + misses;

  // 解析内存使用
  const usedMemory = parseInfoValue(memoryInfo, 'used_memory_human');

  // 获取键数量
  const dbSize = await redis.dbsize();

  return {
    hits,
    misses,
    hitRate: total > 0 ? (hits / total) * 100 : 0,
    memoryUsage: usedMemory,
    keyCount: dbSize,
  };
}

function parseInfoValue(info: string, key: string): number {
  const match = info.match(new RegExp(`${key}:(\\d+)`));
  return match ? parseInt(match[1], 10) : 0;
}
```

### 健康检查端点

```typescript
// app/api/health/cache/route.ts
import { getCacheMetrics } from '@/lib/cache/metrics';
import { redis } from '@/lib/redis';

export async function GET() {
  try {
    // 测试连接
    await redis.ping();

    // 获取指标
    const metrics = await getCacheMetrics();

    return Response.json({
      status: 'healthy',
      ...metrics,
    });
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        error: String(error),
      },
      { status: 503 }
    );
  }
}
```

---

## ⚙️ Docker Compose 配置

### 添加 Redis 服务

```yaml
# docker-compose.prod.yml (添加 Redis)

services:
  # ... 其他服务 ...

  redis:
    image: redis:7-alpine
    container_name: 7zi-redis
    restart: always

    command: >
      redis-server
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --save 60 1000
      --appendonly yes

    volumes:
      - redis-data:/data:rw

    # 资源限制
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 256M
        reservations:
          cpus: "0.1"
          memory: 128M

    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 5s
      retries: 3

    networks:
      - 7zi-network

    security_opt:
      - no-new-privileges:true

# 数据卷
volumes:
  redis-data:
    driver: local
```

### 环境变量

```bash
# .env.production
REDIS_URL=redis://redis:6379

# 可选：Redis 密码
# REDIS_URL=redis://:password@redis:6379
```

---

## 🔒 安全配置

### Redis 密码保护

```yaml
# docker-compose.prod.yml
redis:
  command: >
    redis-server
    --requirepass ${REDIS_PASSWORD}
    --maxmemory 256mb
```

```bash
# .env.production
REDIS_PASSWORD=your-secure-password
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
```

### 网络隔离

```yaml
# 只允许内部网络访问 Redis
networks:
  7zi-network:
    internal: true  # 不暴露到外部
```

---

## 📈 预期收益

| 指标 | 当前 | 优化后 | 改善 |
|------|------|--------|------|
| API 响应时间 | 300ms | 50ms (缓存命中) | -83% |
| 数据库查询数 | 1000/min | 200/min | -80% |
| 服务器 CPU | 60% | 40% | -33% |
| 并发能力 | 100 req/s | 500 req/s | +400% |

---

## ✅ 实施步骤

### 第一阶段：基础设施（1 天）

1. 添加 Redis 到 Docker Compose
2. 配置环境变量
3. 测试连接

### 第二阶段：核心 API 缓存（2 天）

1. 实现缓存工具函数
2. 集成到项目列表 API
3. 集成到项目详情 API

### 第三阶段：完整集成（2 天）

1. 搜索结果缓存
2. 用户信息缓存
3. 缓存失效逻辑

### 第四阶段：监控优化（1 天）

1. 添加监控指标
2. 配置告警
3. 性能调优

---

**文档维护者:** 🛡️ 系统管理员
**最后更新:** 2026-03-29
