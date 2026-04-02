# API Performance Report

## 生成时间

2026-03-19 23:45:00 UTC

## 执行摘要

本报告提供了 7zi-project API 性能监控和优化的实施情况。

---

## 实施概览

### 1. 现有监控代码分析

已分析 `src/lib/monitoring/` 目录，发现以下现有监控功能：

- **Core Web Vitals 监控** (`web-vitals.ts`)
  - LCP (Largest Contentful Paint)
  - FID (First Input Delay)
  - CLS (Cumulative Layout Shift)
  - TTFB (Time to First Byte)
  - FCP (First Contentful Paint)
  - INP (Interaction to Next Paint)

- **性能监控配置** (`performance.config.ts`)
  - Core Web Vitals 阈值配置
  - 自定义指标配置
  - 告警配置
  - 上报配置

- **增强性能监控** (`performance.monitor.ts`)
  - 自定义性能指标收集
  - 长任务监控
  - 资源加载监控
  - 内存监控
  - 路由切换监控

- **告警管理** (`performance.alerts.ts`)
  - 告警规则配置
  - 告警记录管理

- **错误追踪** (`errors.ts`)
  - 错误分类和严重级别
  - Sentry 集成

### 2. API 响应时间追踪中间件

已创建 `src/lib/middleware/api-performance.ts`，包含以下功能：

#### 核心功能

1. **自动请求追踪**
   - 每个请求自动记录开始和结束时间
   - 生成唯一的 requestId
   - 记录请求方法、路径、状态码

2. **性能指标收集**
   - 响应时间统计
   - 成功/失败率统计
   - 慢请求追踪

3. **存储机制**
   - 内存中存储性能数据（每个路由最多 100 条记录）
   - 自动清理旧数据
   - 支持按路由查询

#### API 包装器

```typescript
export function withApiPerformanceTracking(handler: (request: NextRequest) => Promise<NextResponse>)
```

使用方式：

```typescript
import { withApiPerformanceTracking } from '@/lib/middleware/api-performance'

export const GET = withApiPerformanceTracking(async (request: NextRequest) => {
  // 你的 API 逻辑
  return NextResponse.json({ success: true })
})
```

#### 性能数据结构

```typescript
interface ApiPerformanceData {
  requestId: string
  method: string
  path: string
  statusCode: number
  duration: number
  timestamp: number
  success: boolean
  errorMessage?: string
}
```

### 3. 慢查询告警机制（>500ms）

已实现多级告警机制：

#### 告警阈值

- **警告阈值**: 500ms
- **严重阈值**: 2000ms

#### 告警方式

1. **日志记录**

   ```typescript
   // 慢查询警告
   logger.warn('[API Performance] Slow request detected', {
     requestId,
     path,
     method,
     statusCode,
     duration,
     timestamp,
   })

   // 严重性能问题错误
   logger.error('[API Performance] Critical slow request detected', {
     requestId,
     path,
     method,
     statusCode,
     duration,
     timestamp,
   })
   ```

2. **自定义指标记录**

   ```typescript
   recordCustomMetric(`api.${path}`, duration, 'api', {
     method,
     statusCode,
     success,
   })
   ```

3. **响应头**
   - `x-request-id`: 请求唯一标识符
   - `x-response-time`: 响应时间（毫秒）

#### 日志级别

- 🟢 **快速响应** (< 500ms): INFO 级别
- 🟡 **慢请求** (500ms - 2000ms): WARN 级别
- 🔴 **严重性能问题** (> 2000ms): ERROR 级别

### 4. 性能报告 API

已创建 `/api/performance/report` 端点：

#### 获取完整性能报告

```bash
GET /api/performance/report
```

响应示例：

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRequests": 1250,
      "successfulRequests": 1180,
      "failedRequests": 70,
      "averageDuration": 245.5,
      "maxDuration": 3450.0,
      "minDuration": 12.0,
      "slowRequests": 85,
      "errors": {
        "400": 25,
        "401": 30,
        "500": 15
      }
    },
    "slowRequests": [
      {
        "requestId": "req_123",
        "method": "POST",
        "path": "/api/auth/login",
        "statusCode": 200,
        "duration": 850.5,
        "timestamp": 1679287200000,
        "success": true
      }
    ],
    "routes": {
      "/api/auth/login": {
        "count": 150,
        "avgDuration": 320.5,
        "maxDuration": 850.0,
        "minDuration": 45.0,
        "errorRate": 5.33
      }
    }
  },
  "timestamp": "2026-03-19T23:45:00.000Z"
}
```

#### 获取慢请求列表

```bash
GET /api/performance/report?action=slow
```

响应示例：

```json
{
  "success": true,
  "data": {
    "slowRequests": [...],
    "count": 85,
    "threshold": 500
  }
}
```

#### 清除性能数据

```bash
DELETE /api/performance/report
```

---

## 实施文件清单

### 新增文件

1. **API 性能监控中间件**
   - `src/lib/middleware/api-performance.ts` (8.6 KB)
   - `src/lib/api/api-performance-logger.ts` (4.8 KB)

2. **性能报告端点**
   - `src/app/api/performance/report/route.ts` (2.3 KB)

3. **性能报告文档**
   - `docs/PERFORMANCE_REPORT.md` (本文档)

### 修改文件

1. **API 日志增强**
   - `src/lib/api/api-logger.ts`
     - 慢查询阈值从 1000ms 降低到 500ms
     - 添加严重慢查询检测 (> 2000ms)

---

## 使用指南

### 在 API 路由中启用性能追踪

#### 方式 1: 使用包装器（推荐）

```typescript
import { withApiPerformanceTracking } from '@/lib/middleware/api-performance'
import { NextRequest, NextResponse } from 'next/server'

export const POST = withApiPerformanceTracking(async (request: NextRequest) => {
  // 你的 API 逻辑
  return NextResponse.json({ success: true })
})
```

#### 方式 2: 手动记录

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { logRequestStart, logRequestComplete, logRequestError } from '@/lib/api/api-logger'
import { recordCustomMetric } from '@/lib/monitoring'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    // 你的 API 逻辑
    const response = NextResponse.json({ success: true })

    // 记录性能
    const duration = Date.now() - startTime
    recordCustomMetric(`api.${request.nextUrl.pathname}`, duration, 'api', {
      method: request.method,
      statusCode: response.status,
      success: true,
    })

    logRequestComplete(metadata, response, startTime)
    return response
  } catch (error) {
    logRequestError(metadata, error, startTime)
    throw error
  }
}
```

### 访问性能报告

#### 使用 curl

```bash
# 获取完整报告
curl http://localhost:3000/api/performance/report

# 获取慢请求列表
curl http://localhost:3000/api/performance/report?action=slow
```

#### 在浏览器中访问

```
http://localhost:3000/api/performance/report
http://localhost:3000/api/performance/report?action=slow
```

---

## 监控指标说明

### 核心指标

| 指标         | 说明             | 良好值  | 需关注    | 严重    |
| ------------ | ---------------- | ------- | --------- | ------- |
| **响应时间** | API 请求处理时间 | < 200ms | 200-500ms | > 500ms |
| **错误率**   | 失败请求占比     | < 1%    | 1-5%      | > 5%    |
| **慢查询率** | >500ms 请求占比  | < 5%    | 5-10%     | > 10%   |

### 路由级别指标

- **请求数量**: 该路由的总请求数
- **平均响应时间**: 所有请求的平均处理时间
- **最大响应时间**: 最慢的请求处理时间
- **最小响应时间**: 最快的请求处理时间
- **错误率**: 失败请求的百分比

---

## 优化建议

### 短期优化（1-2 周）

1. **分析慢请求**
   - 识别慢查询最多的路由
   - 优化数据库查询
   - 添加缓存层

2. **添加索引**
   - 根据慢查询日志分析数据库查询
   - 添加必要的索引

3. **API 响应优化**
   - 减少响应数据大小
   - 使用 gzip 压缩
   - 实现 API 分页

### 中期优化（1-2 个月）

1. **缓存策略**
   - 实现 Redis 缓存
   - 添加 CDN 缓存
   - 实现查询结果缓存

2. **数据库优化**
   - 实现读写分离
   - 优化复杂查询
   - 考虑使用连接池

3. **异步处理**
   - 将耗时操作异步化
   - 使用消息队列
   - 实现后台任务

### 长期优化（3-6 个月）

1. **微服务架构**
   - 拆分 API 服务
   - 实现服务间通信
   - 添加 API 网关

2. **性能监控平台**
   - 集成 APM 工具
   - 实现实时监控仪表板
   - 添加性能告警通知

3. **自动化优化**
   - 实现性能回归测试
   - 添加 CI/CD 性能检查
   - 实现自动扩缩容

---

## 注意事项

### 生产环境部署

1. **认证保护**
   - 性能报告端点应添加认证
   - 仅管理员可访问性能数据

2. **数据持久化**
   - 当前数据存储在内存中
   - 建议将数据持久化到数据库
   - 定期备份性能数据

3. **数据清理**
   - 定期清理旧数据
   - 避免内存占用过大
   - 实现数据归档策略

### 性能影响

1. **最小化开销**
   - 性能监控本身会消耗少量资源
   - 使用高效的日志记录
   - 避免在热路径中进行复杂计算

2. **采样率**
   - 考虑使用采样率
   - 高流量时降低采样
   - 保持足够的代表性

---

## 下一步计划

1. ✅ 实现基础性能监控
2. ⏳ 添加数据库查询监控
3. ⏳ 集成 APM 工具（Sentry, Datadog）
4. ⏳ 创建性能监控仪表板
5. ⏳ 实现性能告警通知
6. ⏳ 添加自动化性能测试

---

## 联系方式

如有问题或建议，请联系：

- 项目负责人: 7zi AI Team
- 技术支持: 通过项目 Issue 反馈

---

**最后更新**: 2026-03-19 23:45:00 UTC
