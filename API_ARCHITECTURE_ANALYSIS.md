# 7zi-Frontend API 层架构分析报告

**分析日期**: 2026-03-30
**分析范围**: 7zi-frontend 项目的 API 路由、核心库、WebSocket 实现
**版本**: v1.3.0 (WebSocket v1.4.0)

---

## 📋 执行摘要

7zi-frontend 项目拥有一个**功能完善但架构不一致**的 API 层。虽然实现了认证、授权、错误处理等核心功能，但存在以下关键问题：

1. **双错误处理系统共存**，导致响应格式不统一
2. **中间件应用不一致**，缺乏统一的拦截器链
3. **类型定义分散**，没有统一的 API 类型安全方案
4. **缺少 API 版本控制策略**，未来扩展困难
5. **项目结构混乱**，`/root/.openclaw/workspace/7zi-frontend/` 和 `/root/.openclaw/workspace/src/` 两套代码并存

**总体评估**: ⚠️ **中等风险** - 需要重构以支持长期扩展

---

## 🔍 发现的问题列表

### 🔴 严重问题（P0）

#### 1. 双错误处理系统并存

**问题描述**:
项目中存在两套完全不同的错误处理系统，导致 API 响应格式不一致：

**系统 A**: `/lib/api/error-handler.ts`

```typescript
{
  success: false,
  error: {
    type: ErrorType,  // enum: VALIDATION, NOT_FOUND, UNAUTHORIZED, etc.
    message: string,
    details?: Record<string, unknown>,
    timestamp: string
  }
}
```

**系统 B**: `/lib/api/api-response-wrapper.ts`

```typescript
{
  code: ApiErrorCode,  // enum: BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, etc.
  message: string,
  detail?: string,
  errors?: Record<string, string[]>,
  timestamp: string,
  requestId: string
}
```

**影响**:

- 前端无法用统一方式处理错误
- 测试覆盖困难（需要覆盖两种格式）
- 新开发者容易混淆使用哪个系统

**涉及文件**:

- `/lib/api/error-handler.ts` (ErrorType 枚举，ApiError 类)
- `/lib/api/api-response-wrapper.ts` (ApiErrorCode 枚举，不同的响应格式)
- `/lib/api/api-error.ts` (又一套错误类型！)

---

#### 2. 缺少全局 API 版本控制策略

**问题描述**:
所有 API 路由都在 `/api/*` 路径下，没有版本前缀：

- 当前: `/api/users`, `/api/feedback`, `/api/a2a/jsonrpc`
- 问题: 未来做破坏性变更时无法保持向后兼容

**影响**:

- 无法在不破坏现有客户端的情况下进行重大变更
- 无法并行运行多个 API 版本
- 增加技术债务累积风险

**建议方案**:

- 引入 `/api/v1/*` 版本化路由
- 保留 `/api/*` 作为当前版本的别名（指向 v1）
- 新版本使用 `/api/v2/*`

---

#### 3. 项目结构混乱 - 两套代码并存

**问题描述**:
分析发现存在两个不同的项目根目录结构：

**位置 A**: `/root/.openclaw/workspace/src/app/api/`
**位置 B**: `/root/.openclaw/workspace/7zi-frontend/src/app/api/`

两者都包含完整的 API 实现，但代码略有不同：

- A 位置的代码更完整（包含 `api-response-wrapper.ts`, `error-middleware.ts`）
- B 位置的代码是实际部署的（包含更多测试文件）

**影响**:

- 开发混淆：不知道应该修改哪个位置的代码
- 测试可能运行在错误的代码上
- CI/CD 可能使用错误的构建路径

**根本原因**: 可能是迁移或复制导致的代码不同步

---

### 🟠 中等问题（P1）

#### 4. 中间件应用不一致

**问题描述**:
虽然项目有完善的中间件系统，但应用方式不统一：

| 路由                   | 认证方式                 | 错误处理               | 日志             |
| ---------------------- | ------------------------ | ---------------------- | ---------------- |
| `/api/feedback/*`      | `withAuth` / `withAdmin` | 手动 try-catch         | 手动 console.log |
| `/api/auth/*`          | 手动验证                 | 手 try-catch           | 手动 console.log |
| `/api/notifications/*` | `authenticateJWT` 手动   | `createErrorResponse`  | 无               |
| `/api/mcp/rpc`         | `authenticateAPIKey`     | 手动 JSON-RPC 错误格式 | 无               |
| `/api/a2a/jsonrpc`     | 无                       | JSON-RPC 2.0 标准      | `logger.error`   |

**问题**:

- 没有统一的中间件链
- 部分路由缺少必要的中间件（如日志）
- 手动代码重复，维护成本高

**现有中间件**（未被充分利用）:

- `/lib/api/error-middleware.ts` - `withApiErrorMiddleware`
- `/lib/api/api-logger.ts` - `withApiLogging`
- `/lib/auth/api-auth.ts` - `withAuth`, `withAdmin`

---

#### 5. 缺少统一的 API 类型定义层

**问题描述**:
API 请求/响应类型分散在各个文件中：

| 文件位置                       | 内容            |
| ------------------------------ | --------------- |
| `/lib/api/validation.ts`       | Zod 验证 schema |
| `/lib/permissions.ts`          | 权限相关类型    |
| `/features/mcp/lib/types.ts`   | MCP 特定类型    |
| `/features/websocket/types.ts` | WebSocket 类型  |
| `/app/api/*/route.ts`          | 内联类型定义    |

**缺失**:

- 没有 `types/api/` 目录集中管理所有 API 类型
- 没有自动生成 OpenAPI/Swagger 文档
- 前端类型导入路径不一致

**影响**:

- 类型定义重复
- 难以保证前后端类型同步
- API 变更时难以追踪影响范围

---

#### 6. CORS 配置不一致

**问题描述**:
不同路由的 CORS 实现方式不同：

**方式 1**: MCP 路由使用专门的 `getMCPCORSHeaders()`

```typescript
function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
```

**方式 2**: A2A 路由使用类似的硬编码
**方式 3**: 其他路由没有 CORS 配置

**问题**:

- 没有统一的 CORS 策略
- 每个路由手动添加 CORS 头，容易遗漏
- 缺少 CORS 预检请求（OPTIONS）的全局处理

---

#### 7. WebSocket 与 REST API 认证隔离

**问题描述**:
WebSocket (v1.4.0) 和 REST API 使用独立的认证系统：

**REST API**: 使用 JWT 或 API Key

```typescript
// /lib/auth/api-auth.ts
export async function authenticateJWT(request: NextRequest): Promise<AuthResult>
export function authenticateAPIKey(request: NextRequest): AuthResult
```

**WebSocket**: 使用独立的权限系统

```typescript
// /features/websocket/room/permission-manager.ts
// 完全不同的 PermissionManager 实现
```

**问题**:

- 用户需要在 WebSocket 中重新认证
- 权限检查逻辑重复
- 会话状态无法共享

---

### 🟡 轻微问题（P2）

#### 8. 缺少请求 ID 跟踪

**问题描述**:

- `api-response-wrapper.ts` 支持 requestId
- `error-handler.ts` 不支持 requestId
- 只有部分路由实际使用 requestId
- 没有全局的请求上下文传递机制

**影响**:

- 难以追踪跨服务的请求链路
- 日志分析困难
- 调试分布式问题困难

---

#### 9. 缺少 API 文档生成

**问题描述**:
虽然部分文件包含 OpenAPI 注释（如 `/api/mcp/rpc/route.ts`），但：

- 没有自动生成 Swagger/OpenAPI 文档的流程
- 没有公开的 API 文档页面
- 缺少 Postman/Insomnia 集合

---

#### 10. 部分路由功能不完整

**问题描述**:
一些 API 路由只是占位符：

```typescript
// /app/api/projects/route.ts
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: [],
    message: 'Projects API - GET endpoint',
  })
}
```

**影响**:

- 前端可能依赖未实现的功能
- 容易出现运行时错误

---

## 💡 改进建议

### 优先级 P0（立即执行）

#### 建议 1: 统一错误处理系统

**方案**:
选择 `api-response-wrapper.ts` 作为唯一标准，因为它：

- 支持 requestId（便于链路追踪）
- 错误信息更详细（`errors` 数组）
- 包含 `detail` 字段用于附加信息

**迁移计划**:

1. [ ] 创建 `lib/api/v2/` 迁移目录
2. [ ] 将所有 `createErrorResponse` 调用替换为 `error()`
3. [ ] 统一 `ErrorType` → `ApiErrorCode` 映射
4. [ ] 更新所有 API 路由使用新的错误格式
5. [ ] 更新前端错误处理逻辑
6. [ ] 添加迁移期间的兼容层（可选）

**代码示例**:

```typescript
// 旧方式（删除）
import { createErrorResponse, ErrorType } from '@/lib/api/error-handler'

// 新方式（统一）
import { error, ApiErrorCode } from '@/lib/api/api-response-wrapper'

// 使用
return error(new Error('User not found'), { status: 404 })
// 或
return notFound('User not found') // 便捷方法
```

---

#### 建议 2: 引入 API 版本控制

**方案 A: URL 路径版本化（推荐）**

```
/api/v1/users          -> 当前实现
/api/v1/feedback       -> 当前实现
/api/v2/users          -> 新版本（未来）
/api/v1/legacy/route   -> 旧版本（可选）
```

**实施方案**:

1. 创建 `/app/api/v1/` 目录
2. 将现有路由迁移到 `/app/api/v1/`
3. 创建 `/app/api/v1/[...catchall]/route.ts` 捕获未版本化的请求
4. 配置路由别名（如果需要）

**代码示例**:

```typescript
// app/api/v1/users/route.ts
export { GET, POST } from '@/app/api/users/route'

// app/api/[...catchall]/route.ts
export const GET = handleVersionRedirect
export const POST = handleVersionRedirect

function handleVersionRedirect(request: NextRequest) {
  // 重定向到 /api/v1/...
  // 或返回 301 永久重定向
}
```

**方案 B: Header 版本控制（备选）**

```
Accept: application/vnd.api+json; version=1
```

---

#### 建议 3: 解决项目结构混乱

**调查和清理**:

1. [ ] 确定哪个位置是"真实"源代码
2. [ ] 删除或同步重复的文件
3. [ ] 更新 CI/CD 配置使用正确的路径
4. [ ] 更新文档说明正确的项目结构

**建议命令**:

```bash
# 检查差异
diff -r /root/.openclaw/workspace/src/app/api/ \
         /root/.openclaw/workspace/7zi-frontend/src/app/api/

# 确认正确位置后，删除重复
# rm -rf /root/.openclaw/workspace/src/app/api/
```

---

### 优先级 P1（近期执行）

#### 建议 4: 创建统一中间件层

**创建文件**: `src/lib/api/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withApiLogging } from './api-logger'
import { withApiErrorMiddleware } from './error-middleware'
import { withAuth, AuthResult } from '@/lib/auth/api-auth'

/**
 * 组合所有中间件的标准包装器
 */
export function withApiHandler<T>(
  handler: (request: NextRequest, context: { user?: AuthResult }) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean
    requireAdmin?: boolean
    rateLimit?: { max: number; windowMs: number }
    tags?: Record<string, string>
  } = {}
) {
  let wrapped = handler as any

  // 1. 认证中间件
  if (options.requireAuth) {
    const authMiddleware = options.requireAdmin ? withAdmin : withAuth
    wrapped = authMiddleware(wrapped)
  }

  // 2. 错误处理中间件
  wrapped = withApiErrorMiddleware(wrapped, {
    tags: options.tags,
  })

  // 3. 日志中间件（最外层）
  wrapped = withApiLogging(wrapped)

  return wrapped
}

/**
 * 便捷方法：公开 API（无需认证）
 */
export function withPublicApi(
  handler: (request: NextRequest) => Promise<NextResponse>,
  tags?: Record<string, string>
) {
  return withApiHandler(handler, { tags })
}

/**
 * 便捷方法：认证用户 API
 */
export function withUserApi(
  handler: (request: NextRequest, context: { user: AuthResult }) => Promise<NextResponse>,
  tags?: Record<string, string>
) {
  return withApiHandler(handler, { requireAuth: true, tags })
}

/**
 * 便捷方法：管理员 API
 */
export function withAdminApi(
  handler: (request: NextRequest, context: { user: AuthResult }) => Promise<NextResponse>,
  tags?: Record<string, string>
) {
  return withApiHandler(handler, { requireAuth: true, requireAdmin: true, tags })
}
```

**使用示例**:

```typescript
// app/api/users/route.ts
import { withUserApi, withAdminApi } from '@/lib/api/middleware'
import { success } from '@/lib/api/api-response-wrapper'

// 公开端点
export const GET = withPublicApi(
  async request => {
    return success({ users: [] })
  },
  { route: '/api/users' }
)

// 需要认证
export const POST = withUserApi(async (request, { user }) => {
  return success({ userId: user.userId })
})

// 需要管理员权限
export const DELETE = withAdminApi(async (request, { user }) => {
  return success({ deleted: true })
})
```

---

#### 建议 5: 创建统一的 API 类型定义层

**创建目录结构**:

```
src/types/api/
├── index.ts              # 导出所有类型
├── common.ts             # 通用类型（分页、排序等）
├── auth.ts               # 认证相关类型
├── users.ts              # 用户 API 类型
├── feedback.ts           # 反馈 API 类型
├── notifications.ts      # 通知 API 类型
└── openapi.ts           # OpenAPI 规范生成
```

**文件示例**: `src/types/api/common.ts`

```typescript
/**
 * 通用 API 类型
 */

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * 排序参数
 */
export interface SortParams {
  field: string
  order: 'asc' | 'desc'
}

/**
 * 查询过滤器基类
 */
export interface QueryFilter {
  [key: string]: string | number | boolean | undefined
}
```

**自动化 OpenAPI 文档**:

```typescript
// src/types/api/openapi.ts
import { createOpenAPI } from 'openapi-typescript'

export const openapiSchema = createOpenAPI({
  openapi: '3.1.0',
  info: {
    title: '7zi API',
    version: '1.0.0',
  },
  paths: {
    '/api/v1/users': {
      get: {
        summary: 'List users',
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserListResponse' },
              },
            },
          },
        },
      },
    },
  },
})
```

---

#### 建议 6: 统一 CORS 配置

**创建文件**: `src/lib/api/cors.ts`

```typescript
/**
 * 统一的 CORS 配置
 */

const CORS_CONFIG = {
  // 允许的源（从环境变量读取，支持逗号分隔）
  allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()),
  // 允许的方法
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // 允许的请求头
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  // 预检请求缓存时间（秒）
  maxAge: 86400, // 24 小时
  // 是否允许凭据
  credentials: true,
} as const

/**
 * 获取 CORS 头
 */
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || ''

  // 检查源是否允许
  const allowedOrigin = CORS_CONFIG.allowedOrigins.includes('*')
    ? '*'
    : CORS_CONFIG.allowedOrigins.includes(origin)
      ? origin
      : CORS_CONFIG.allowedOrigins[0] || '*'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': CORS_CONFIG.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': CORS_CONFIG.allowedHeaders.join(', '),
    'Access-Control-Max-Age': CORS_CONFIG.maxAge.toString(),
    'Access-Control-Allow-Credentials': CORS_CONFIG.credentials.toString(),
  }
}

/**
 * 处理 CORS 预检请求
 */
export function handleCorsPreflight(request: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  })
}

/**
 * 为响应添加 CORS 头
 */
export function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const corsHeaders = getCorsHeaders(request)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}
```

**在全局中间件中使用**: `middleware.ts` (Next.js App Router)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCorsHeaders } from '@/lib/api/cors'

export function middleware(request: NextRequest) {
  // 只处理 API 请求
  if (request.nextUrl.pathname.startsWith('/api')) {
    // CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(request),
      })
    }

    // 添加请求 ID
    const requestId = crypto.randomUUID()
    const response = NextResponse.next()
    response.headers.set('X-Request-ID', requestId)
    response.headers.set(
      'Access-Control-Allow-Origin',
      getCorsHeaders(request)['Access-Control-Allow-Origin']
    )

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

---

#### 建议 7: 统一 WebSocket 和 REST 认证

**方案**:

1. WebSocket 连接时，客户端发送包含 JWT token 的初始消息
2. WebSocket 服务器验证 token 并建立用户会话
3. 后续消息使用会话上下文进行权限检查

**代码示例**:

```typescript
// features/websocket/lib/socket.ts
import { verifyJWT } from '@/lib/auth/jwt'

// WebSocket 连接时的认证
socket.on('authenticate', async (data: { token: string }) => {
  try {
    const payload = await verifyJWT(data.token)
    socket.data.userId = payload.userId
    socket.data.user = payload

    socket.emit('authenticated', { userId: payload.userId })
  } catch (error) {
    socket.emit('error', { message: 'Authentication failed' })
    socket.disconnect()
  }
})

// 权限检查复用 REST API 的权限系统
import { hasPermission } from '@/lib/permissions'

socket.on('join-room', async (roomId: string) => {
  if (!socket.data.user) {
    return socket.emit('error', { message: 'Not authenticated' })
  }

  const canJoin = await hasPermission(socket.data.user, {
    resourceType: 'room',
    action: 'join',
    resourceId: roomId,
  })

  if (canJoin) {
    socket.join(roomId)
    socket.emit('joined-room', { roomId })
  } else {
    socket.emit('error', { message: 'Permission denied' })
  }
})
```

---

### 优先级 P2（长期规划）

#### 建议 8: 实现请求 ID 全链路追踪

**实施方案**:

1. 在全局中间件中生成 X-Request-ID
2. 传递到所有下游服务（包括 WebSocket）
3. 记录到所有日志
4. 在响应头中返回

**代码示例**:

```typescript
// middleware.ts
import { AsyncLocalStorage } from 'async_hooks'

export const requestIdContext = new AsyncLocalStorage<string>()

export function middleware(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()

  return requestIdContext.run(requestId, () => {
    const response = NextResponse.next()
    response.headers.set('X-Request-ID', requestId)
    return response
  })
}

// 在任何地方获取请求 ID
import { requestIdContext } from '@/lib/middleware'

function logSomething() {
  const requestId = requestIdContext.getStore()
  console.log(`Request ID: ${requestId}`)
}
```

---

#### 建议 9: 自动生成 API 文档

**工具选择**:

- **OpenAPI/Swagger**: 使用 `openapi-typescript` + `swagger-ui-react`
- **tRPC**: 类型安全的 API，自动生成文档
- **API Platform**: 框架自动生成 OpenAPI 规范

**实施方案**:

```bash
npm install openapi-typescript swagger-ui-react
```

```typescript
// src/lib/api/openapi-generator.ts
import fs from 'fs'
import path from 'path'

export function generateOpenAPISpec() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: '7zi API',
      version: '1.0.0',
      description: '7zi Platform API Documentation',
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    paths: {
      // 自动从路由文件生成
    },
  }

  // 保存到 public/api/openapi.json
  const outputPath = path.join(process.cwd(), 'public', 'api', 'openapi.json')
  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2))

  return spec
}
```

**访问文档**: `https://7zi.studio/api/docs`

---

#### 建议 10: 完善 API 路由实现

**待完善的路由清单**:

- [ ] `/api/projects/*` - 完整的 CRUD 操作
- [ ] `/api/search/*` - 实现搜索逻辑
- [ ] `/api/data/import/*` - 数据导入功能
- [ ] `/api/users/*` - 添加 PUT, DELETE 等方法

**建议**:
在完成每个端点后，添加：

1. 完整的请求/响应类型定义
2. 集成测试
3. OpenAPI 文档注释
4. 性能监控

---

## 🏗️ 架构优化示意图

### 当前架构（简化版）

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App Router                   │
│                    /app/api/.../route.ts                   │
└─────────────┬───────────────────────────────┬─────────────┘
              │                               │
              ├─► Auth Routes                 ├─► Business Routes
              │  - /api/auth/login            │  - /api/feedback
              │  - /api/auth/register        │  - /api/projects
              │                               │  - /api/notifications
              ├─→ 手动验证 JWT                │
              ├─→ 手动 try-catch              │
              └─→ 手动 console.error          ├─→ 手动验证 JWT
                                              ├─→ 手动 try-catch
                                              └─→ 手动 console.error

┌─────────────────────────────────────────────────────────────┐
│                    Library Layer (分散)                     │
│  /lib/api/error-handler.ts    ──► 系统 A 错误处理          │
│  /lib/api/api-response-wrapper.ts ──► 系统 B 错误处理       │
│  /lib/api/error-middleware.ts   ──► 未被使用               │
│  /lib/api/api-logger.ts         ──► 未被使用               │
│  /lib/auth/api-auth.ts          ──► withAuth, withAdmin   │
└─────────────────────────────────────────────────────────────┘
```

### 推荐架构（统一化）

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                       │
│              /app/api/v1/.../route.ts                       │
└─────────────┬───────────────────────────────────────────────┘
              │
              ├─► 所有路由使用统一中间件
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Middleware Layer (统一)                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. 全局 middleware.ts (Next.js)                   │   │
│  │     - CORS                                          │   │
│  │     - Request ID                                    │   │
│  │     - 预检请求处理                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  2. withApiHandler (lib/api/middleware.ts)          │   │
│  │     - 认证 (JWT / API Key)                           │   │
│  │     - 授权 (RBAC)                                    │   │
│  │     - 速率限制                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  3. Error Handling (lib/api/error-handler.ts)       │   │
│  │     - 统一错误格式                                   │   │
│  │     - Sentry 集成                                    │   │
│  │     - 结构化日志                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  4. Logging (lib/api/api-logger.ts)                 │   │
│  │     - 请求开始/结束                                   │   │
│  │     - 性能指标                                       │   │
│  │     - 慢查询告警                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Handler Function                         │
│  - 业务逻辑                                               │
│  - 数据访问                                               │
│  - 外部服务调用                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Response Wrapper                         │
│  lib/api/api-response-wrapper.ts (统一标准)                │
│  - success(data)                                          │
│  - error(error)                                           │
│  - notFound(message)                                      │
│  - unauthorized(message)                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Supporting Systems                       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  认证授权     │  │  类型定义     │  │  OpenAPI     │   │
│  │  - JWT       │  │  /types/api  │  │  文档生成    │   │
│  │  - RBAC      │  │  - Zod       │  │  - Swagger    │   │
│  │  - API Key   │  │  - TS Types  │  │  - Postman   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  WebSocket   │  │  速率限制     │  │  监控        │   │
│  │  v1.4.0     │  │  - Redis     │  │  - Sentry    │   │
│  │  - 共享认证  │  │  - Memory    │  │  - Metrics   │   │
│  │  - 权限复用  │  │  - 分布式    │  │  - APM       │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 API 路由清单

### 已完成的路由

| 路径                        | 方法                  | 认证    | 状态    | 说明           |
| --------------------------- | --------------------- | ------- | ------- | -------------- |
| `/api/auth/login`           | POST                  | 无      | ✅ 完成 | 用户登录       |
| `/api/auth/register`        | PUT                   | 无      | ✅ 完成 | 用户注册       |
| `/api/auth/reset-password`  | PATCH                 | 无      | ✅ 完成 | 重置密码       |
| `/api/feedback`             | GET/POST/PATCH/DELETE | JWT     | ✅ 完成 | 反馈 CRUD      |
| `/api/feedback/stats`       | GET                   | Admin   | ✅ 完成 | 统计信息       |
| `/api/feedback/response`    | POST                  | Admin   | ✅ 完成 | 管理员回复     |
| `/api/feedback/export`      | GET                   | Admin   | ✅ 完成 | CSV 导出       |
| `/api/health`               | GET/HEAD              | 无      | ✅ 完成 | 健康检查       |
| `/api/mcp/rpc`              | POST/OPTIONS          | API Key | ✅ 完成 | MCP JSON-RPC   |
| `/api/notifications`        | GET/POST              | JWT     | ✅ 完成 | 通知 CRUD      |
| `/api/notifications/[id]`   | GET/DELETE            | JWT     | ✅ 完成 | 单个通知       |
| `/api/notifications/stats`  | GET                   | Admin   | ✅ 完成 | 通知统计       |
| `/api/notifications/socket` | -                     | JWT     | ✅ 完成 | WebSocket 接入 |
| `/api/users`                | GET/POST              | JWT     | ✅ 完成 | 用户列表/创建  |
| `/api/a2a/jsonrpc`          | POST                  | 无      | ✅ 完成 | A2A 协议       |
| `/api/a2a/registry`         | GET                   | 无      | ✅ 完成 | 注册信息       |
| `/api/a2a/queue`            | GET/POST              | 无      | ✅ 完成 | 任务队列       |

### 待完善的路由

| 路径                 | 方法           | 状态      | 说明     |
| -------------------- | -------------- | --------- | -------- |
| `/api/projects`      | GET/POST       | ⚠️ 占位符 | 需要实现 |
| `/api/projects/[id]` | GET/PUT/DELETE | ❌ 缺失   | 需要实现 |
| `/api/search`        | POST           | ⚠️ 占位符 | 需要实现 |
| `/api/data/import`   | POST           | ⚠️ 占位符 | 需要实现 |

---

## 🔧 实施路线图

### 阶段 1: 基础重构（2-3 周）

**Week 1**:

- [x] 完成 API 架构分析
- [ ] 统一错误处理系统（建议 1）
- [ ] 创建统一中间件层（建议 4）
- [ ] 统一 CORS 配置（建议 6）

**Week 2**:

- [ ] 引入 API 版本控制（建议 2）
- [ ] 解决项目结构混乱（建议 3）
- [ ] 创建统一的 API 类型定义（建议 5）
- [ ] 更新前端错误处理逻辑

**Week 3**:

- [ ] 添加 OpenAPI 文档生成（建议 9）
- [ ] 实现请求 ID 全链路追踪（建议 8）
- [ ] 统一 WebSocket 和 REST 认证（建议 7）
- [ ] 编写迁移文档

---

### 阶段 2: 功能完善（3-4 周）

**Week 4-5**:

- [ ] 完成 `/api/projects/*` 路由
- [ ] 完成 `/api/search` 路由
- [ ] 完成 `/api/data/import` 路由
- [ ] 添加完善的 API 测试

**Week 6-7**:

- [ ] 性能优化（缓存、批量操作）
- [ ] 安全审计（SQL 注入、XSS 防护）
- [ ] 压力测试和优化
- [ ] 文档完善

---

### 阶段 3: 持续改进（长期）

- [ ] API 监控和告警
- [ ] 性能指标收集
- [ ] 自动化测试覆盖
- [ ] API 使用统计
- [ ] GraphQL 支持（可选）
- [ ] API 网关集成（可选）

---

## 📝 总结

### 关键发现

1. **架构不一致**: 两套错误处理系统共存，中间件应用不统一
2. **扩展性风险**: 缺少 API 版本控制，未来变更困难
3. **代码重复**: 多个位置存在类似代码，维护成本高
4. **文档缺失**: 没有自动化的 API 文档生成

### 推荐优先级

| 优先级 | 建议                | 工作量  | 影响 |
| ------ | ------------------- | ------- | ---- |
| P0     | 统一错误处理系统    | 3-5 天  | 高   |
| P0     | 解决项目结构混乱    | 1 天    | 高   |
| P0     | 引入 API 版本控制   | 2-3 天  | 高   |
| P1     | 创建统一中间件层    | 3-5 天  | 高   |
| P1     | 统一 CORS 配置      | 1 天    | 中   |
| P1     | 创建 API 类型定义层 | 5-7 天  | 高   |
| P1     | 统一 WebSocket 认证 | 3-5 天  | 中   |
| P2     | 请求 ID 全链路追踪  | 2-3 天  | 中   |
| P2     | OpenAPI 文档生成    | 3-5 天  | 中   |
| P2     | 完善路由实现        | 5-10 天 | 高   |

### 风险评估

| 风险                | 等级 | 缓解措施                     |
| ------------------- | ---- | ---------------------------- |
| 迁移期间 API 不兼容 | 高   | 提供迁移指南，保持向后兼容层 |
| 前端代码需要更新    | 中   | 统一错误处理层，逐步迁移     |
| 测试覆盖不足        | 中   | 添加集成测试，确保迁移正确   |
| 性能影响            | 低   | 中间件开销极小，可忽略       |

---

## 📚 参考资料

### 项目文件

- `/lib/api/error-handler.ts` - 错误处理系统 A
- `/lib/api/api-response-wrapper.ts` - 错误处理系统 B
- `/lib/api/error-middleware.ts` - 错误中间件
- `/lib/api/api-logger.ts` - 日志中间件
- `/lib/auth/api-auth.ts` - 认证中间件
- `/lib/permissions.ts` - RBAC 权限系统
- `/features/websocket/` - WebSocket v1.4.0 实现

### 相关文档

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [OpenAPI Specification](https://swagger.io/specification/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

### 最佳实践

- [API Design Guide](https://cloud.google.com/apis/design)
- [RESTful API Best Practices](https://restfulapi.net/)
- [Error Handling Best Practices](https://blog.postman.com/error-handling-api-design/)
- [API Versioning Best Practices](https://www.postman.com/api-platform/api-versioning/)

---

**报告完成时间**: 2026-03-30 02:43 UTC+2
**分析者**: 🏗️ 架构师 (AI Subagent)
**下次审查**: 2026-04-15
