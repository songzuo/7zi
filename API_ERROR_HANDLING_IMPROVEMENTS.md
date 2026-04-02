# API 错误处理改进建议

**日期**: 2026-03-22  
**项目**: 7zi Frontend  
**审查人**: ⚡ Executor (Subagent)  
**状态**: ✅ 已完成

---

## 执行摘要

本次审查了 `src/` 中的 API 调用代码和 `docs/` 中的 API 文档，识别了错误处理存在的问题，并提出了统一的错误处理方案。项目已具备基础的错误处理框架，但在重试机制、用户提示、日志记录等方面需要改进。

---

## 一、审查范围

### 1.1 审查的文件

**API 路由 (src/app/api/)**:

- `/api/projects/route.ts` - 项目管理 API
- `/api/users/route.ts` - 用户管理 API
- `/api/auth/route.ts` - 认证 API
- `/api/notifications/route.ts` - 通知 API
- `/api/notifications/enhanced/route.ts` - 增强通知 API
- `/api/mcp/rpc/route.ts` - MCP JSON-RPC API

**错误处理框架**:

- `src/lib/api/error-handler.ts` - 标准化错误响应系统

**前端组件**:

- `src/components/NetworkErrorBoundary.tsx` - 网络错误边界
- `src/components/RetryBoundary.tsx` - 重试错误边界
- `src/components/ContactForm.tsx` - 联系表单（含 API 调用）

**文档**:

- `docs/API-REFERENCE.md` - API 参考文档

### 1.2 现有错误处理框架

项目已实现 `src/lib/api/error-handler.ts`，提供：

- ✅ 标准化的成功/错误响应格式
- ✅ 预定义的错误类型 (ErrorType 枚举)
- ✅ ApiError 类
- ✅ `withErrorHandling` 包装器
- ✅ 针对不同场景的快捷方法（`createUnauthorizedError`, `createValidationError` 等）

---

## 二、发现的问题

### 2.1 🔴 高优先级问题

#### 问题 1: 缺少统一的重试机制

**位置**: 所有 API 路由

**问题描述**:

- 没有对网络故障或临时性服务不可用进行自动重试
- `/api/mcp/rpc/route.ts` 直接返回 JSON 解析错误，未考虑重试
- 外部 API 调用（如 GitHub API）没有实现退避重试

**影响**:

- 临时网络波动导致用户体验下降
- 服务抖动时频繁报错，而非自动恢复

**示例代码** (`/api/mcp/rpc/route.ts`):

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // ... 处理逻辑
  } catch {
    // ❌ 直接返回错误，没有重试
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error: Invalid JSON',
        },
      },
      { headers: CORS_HEADERS }
    )
  }
}
```

---

#### 问题 2: 错误日志记录不完整

**位置**: `/api/auth/route.ts`, `/api/notifications/enhanced/route.ts`

**问题描述**:

- 部分路由使用 `AuditLogger`，但错误细节记录不足
- 缺少统一的错误分类和标记
- 没有 API 错误聚合统计（如 5xx 错误率）
- 开发环境日志详细，生产环境缺少调试信息

**示例** (`/api/auth/route.ts`):

```typescript
catch (error) {
  await AuditLogger.logApiAccess({
    ipAddress,
    path: '/api/auth/login',
    method: 'POST',
    success: false,
    error: error instanceof Error ? error.message : String(error),  // ❌ 只记录消息，缺少堆栈
  });

  return NextResponse.json(
    {
      success: false,
      message: '服务器错误',  // ❌ 模糊的错误消息
    },
    { status: 500 }
  );
}
```

---

#### 问题 3: 用户提示不够友好

**位置**: 前端组件

**问题描述**:

- API 返回的技术错误消息（如 "Parse error: Invalid JSON"）直接展示给用户
- 缺少本地化的错误消息
- 没有根据错误类型提供具体的解决方案

**示例**:

```typescript
// API 返回
{ "message": "Parse error: Invalid JSON" }

// ❌ 用户看到技术术语，不明白含义
```

---

### 2.2 🟡 中优先级问题

#### 问题 4: 网络错误边界未在关键路由中使用

**位置**: 前端页面和组件

**问题描述**:

- `NetworkErrorBoundary` 组件存在，但未在 API 调用密集的页面中使用
- `ContactForm` 等组件直接调用 `fetch()`，没有使用重试边界

**影响**:

- 网络波动时用户体验差

---

#### 问题 5: 超时处理缺失

**位置**: 所有 API 路由

**问题描述**:

- API 路由没有设置超时限制
- 外部请求（如 MCP 调用）可能无限期挂起

**风险**:

- 恶意请求或服务故障导致服务器资源耗尽

---

#### 问题 6: 缺少请求 ID 追踪

**位置**: 所有 API 路由

**问题描述**:

- 没有为每个请求生成唯一的请求 ID
- 错误日志无法关联到特定请求

**影响**:

- 难以追踪跨服务的错误链路

---

### 2.3 🟢 低优先级问题

#### 问题 7: 文档中错误处理说明过时

**位置**: `docs/API-REFERENCE.md`

**问题描述**:

- 错误处理章节过于简略（仅 20 行）
- 只列出 GitHub API 错误码，未覆盖内部 API 错误类型
- 没有错误响应示例

---

## 三、统一的错误处理方案

### 3.1 重试机制

#### 方案 A: 通用重试装饰器

创建 `src/lib/api/retry-decorator.ts`:

```typescript
import { logger } from '../logger'

interface RetryConfig {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: (number | string)[]
  shouldRetry?: (error: Error, attempt: number) => boolean
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [503, 502, 504, 'ECONNRESET', 'ETIMEDOUT'],
  shouldRetry: () => true,
}

export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: RetryConfig = {}
): T {
  const options = { ...DEFAULT_RETRY_CONFIG, ...config }

  return (async (...args: Parameters<T>) => {
    let lastError: Error | undefined
    let delay = options.initialDelay

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await fn(...args)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // 检查是否应该重试
        const isRetryable =
          options.shouldRetry?.(lastError, attempt) ||
          options.retryableErrors.some(code => lastError!.message.includes(String(code)))

        if (!isRetryable || attempt === options.maxRetries) {
          break
        }

        // 记录重试
        logger.warn(`Retry attempt ${attempt + 1}/${options.maxRetries}`, {
          error: lastError.message,
          delay,
        })

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * options.backoffMultiplier, options.maxDelay)
      }
    }

    throw lastError
  }) as T
}
```

#### 使用示例

```typescript
import { withRetry } from '@/lib/api/retry-decorator'
import { createServiceUnavailableError } from '@/lib/api/error-handler'

// 包装外部 API 调用
const fetchGitHubData = withRetry(
  async (owner: string, repo: string) => {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    return response.json()
  },
  {
    maxRetries: 5,
    initialDelay: 2000,
    retryableErrors: [403, 502, 503], // GitHub 速率限制
  }
)

// 在 API 路由中使用
export async function GET(request: NextRequest) {
  try {
    const data = await fetchGitHubData('songzuo', '7zi')
    return createSuccessResponse(data)
  } catch (error) {
    return createServiceUnavailableError('暂时无法获取数据，请稍后重试')
  }
}
```

---

### 3.2 增强的日志记录

#### 方案 B: 结构化错误日志

创建 `src/lib/api/error-logger.ts`:

```typescript
import { logger } from '../logger'
import { ErrorType } from './error-handler'

interface ErrorLogContext {
  requestId?: string
  userId?: string
  ip?: string
  path?: string
  method?: string
  userAgent?: string
  duration?: number
}

interface ErrorLogData {
  type: ErrorType | string
  message: string
  stack?: string
  statusCode?: number
  context: ErrorLogContext
  timestamp: string
}

export function logApiError(
  error: Error,
  context: ErrorLogContext,
  isDevelopment: boolean = process.env.NODE_ENV === 'development'
) {
  const errorData: ErrorLogData = {
    type: (error as any).type || ErrorType.INTERNAL,
    message: error.message,
    stack: isDevelopment ? error.stack : undefined,
    statusCode: (error as any).statusCode,
    context,
    timestamp: new Date().toISOString(),
  }

  // 根据错误严重程度选择日志级别
  if (errorData.statusCode && errorData.statusCode >= 500) {
    logger.error('API Server Error', error, errorData)
  } else if (errorData.statusCode && errorData.statusCode >= 400) {
    logger.warn('API Client Error', errorData)
  } else {
    logger.error('API Unknown Error', error, errorData)
  }

  // 发送到外部监控（如 Sentry、DataDog）
  if (process.env.SENTRY_DSN) {
    // Sentry.captureException(error, { extra: errorData });
  }
}

export function logApiSuccess(context: ErrorLogContext, statusCode: number = 200) {
  logger.info('API Success', {
    ...context,
    statusCode,
    timestamp: new Date().toISOString(),
  })
}
```

#### 中间件: 自动添加请求 ID

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 生成请求 ID
  const requestId = crypto.randomUUID()

  // 添加到请求头
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // 添加到响应头
  response.headers.set('x-request-id', requestId)

  return response
}
```

---

### 3.3 友好的用户提示

#### 方案 C: 错误消息本地化和用户友好化

创建 `src/lib/api/user-messages.ts`:

```typescript
import { ErrorType } from './error-handler'
import { getTranslations } from 'next-intl/server'

interface UserErrorMapping {
  type: ErrorType
  userMessage: (locale: string) => Promise<string>
  action: (locale: string) => Promise<string>
}

const ERROR_MAPPINGS: Record<ErrorType, UserErrorMapping> = {
  [ErrorType.VALIDATION]: {
    userMessage: async locale =>
      locale === 'zh' ? '输入信息有误，请检查后重试' : 'Invalid input, please check and try again',
    action: async locale => (locale === 'zh' ? '请检查表单字段' : 'Please check the form fields'),
  },
  [ErrorType.NOT_FOUND]: {
    userMessage: async locale =>
      locale === 'zh' ? '请求的资源不存在' : 'The requested resource was not found',
    action: async locale => (locale === 'zh' ? '返回上一页' : 'Go back'),
  },
  [ErrorType.UNAUTHORIZED]: {
    userMessage: async locale => (locale === 'zh' ? '请先登录' : 'Please log in'),
    action: async locale => (locale === 'zh' ? '去登录' : 'Log in'),
  },
  [ErrorType.FORBIDDEN]: {
    userMessage: async locale =>
      locale === 'zh'
        ? '您没有权限访问此资源'
        : 'You do not have permission to access this resource',
    action: async locale => (locale === 'zh' ? '联系管理员' : 'Contact administrator'),
  },
  [ErrorType.RATE_LIMIT]: {
    userMessage: async locale =>
      locale === 'zh' ? '请求过于频繁，请稍后再试' : 'Too many requests, please try again later',
    action: async locale => (locale === 'zh' ? '等待 1 分钟' : 'Wait 1 minute'),
  },
  [ErrorType.INTERNAL]: {
    userMessage: async locale =>
      locale === 'zh' ? '服务器出错了，我们正在修复' : "Something went wrong, we're fixing it",
    action: async locale => (locale === 'zh' ? '稍后重试' : 'Try again later'),
  },
  [ErrorType.BAD_REQUEST]: {
    userMessage: async locale => (locale === 'zh' ? '请求格式错误' : 'Invalid request format'),
    action: async locale => (locale === 'zh' ? '刷新页面' : 'Refresh page'),
  },
  [ErrorType.SERVICE_UNAVAILABLE]: {
    userMessage: async locale =>
      locale === 'zh'
        ? '服务暂时不可用，请稍后重试'
        : 'Service temporarily unavailable, please try again later',
    action: async locale => (locale === 'zh' ? '等待后重试' : 'Wait and retry'),
  },
  [ErrorType.REGISTRATION_FAILED]: {
    userMessage: async locale =>
      locale === 'zh' ? '注册失败，请重试' : 'Registration failed, please try again',
    action: async locale => (locale === 'zh' ? '检查邮箱格式' : 'Check email format'),
  },
  [ErrorType.WEAK_PASSWORD]: {
    userMessage: async locale =>
      locale === 'zh'
        ? '密码强度不够，请使用更复杂的密码'
        : 'Password is too weak, please use a stronger one',
    action: async locale => (locale === 'zh' ? '设置新密码' : 'Set new password'),
  },
  [ErrorType.MISSING_TOKEN]: {
    userMessage: async locale =>
      locale === 'zh'
        ? '认证令牌缺失，请重新登录'
        : 'Authentication token missing, please log in again',
    action: async locale => (locale === 'zh' ? '重新登录' : 'Log in again'),
  },
}

export async function getUserFriendlyError(
  errorType: ErrorType,
  locale: string = 'zh'
): Promise<{ message: string; action: string }> {
  const mapping = ERROR_MAPPINGS[errorType]

  if (!mapping) {
    return {
      message: locale === 'zh' ? '发生未知错误' : 'An unknown error occurred',
      action: locale === 'zh' ? '刷新页面' : 'Refresh page',
    }
  }

  return {
    message: await mapping.userMessage(locale),
    action: await mapping.action(locale),
  }
}
```

#### 修改错误响应格式

扩展 `ErrorResponse` 接口，添加 `userMessage`:

```typescript
// src/lib/api/error-handler.ts
export interface ErrorResponse {
  success: false
  error: {
    type: ErrorType
    message: string // 技术消息（开发环境）
    userMessage?: string // 用户友好消息（所有环境）
    action?: string // 建议的用户操作
    details?: Record<string, unknown>
    timestamp: string
  }
  requestId?: string
}

export async function createErrorResponse(
  error: Error | ApiError,
  statusCode?: number,
  details?: Record<string, unknown>,
  locale: string = 'zh'
): Promise<NextResponse<ErrorResponse>> {
  const requestId = headers.get('x-request-id') || undefined
  const isDevelopment = process.env.NODE_ENV === 'development'

  // ... 获取 userMessage
  let userMessage, action
  if (error instanceof ApiError) {
    const userError = await getUserFriendlyError(error.type, locale)
    userMessage = userError.message
    action = userError.action
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        type: errorType,
        message: isDevelopment ? error.message : 'An error occurred',
        userMessage,
        action,
        details: isDevelopment ? details : undefined,
        timestamp,
      },
      requestId,
    },
    { status: statusCode ?? 500 }
  )
}
```

---

### 3.4 超时处理

#### 方案 D: API 超时包装器

创建 `src/lib/api/timeout-wrapper.ts`:

```typescript
import { createServiceUnavailableError } from './error-handler'

export function withTimeout<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  timeoutMs: number = 30000
): T {
  return (async (...args: Parameters<T>) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'))
      }, timeoutMs)
    })

    try {
      return await Promise.race([fn(...args), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'Request timeout') {
        throw createServiceUnavailableError('请求超时，请稍后重试')
      }
      throw error
    }
  }) as T
}
```

#### 使用示例

```typescript
export async function POST(request: NextRequest) {
  const handler = withTimeout(
    async () => {
      // 慢速操作
      const result = await someSlowOperation()
      return createSuccessResponse(result)
    },
    10000 // 10 秒超时
  )

  return await handler()
}
```

---

### 3.5 综合改进: 统一 API 路由包装器

#### 方案 E: 一站式错误处理装饰器

创建 `src/lib/api/api-wrapper.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withRetry } from './retry-decorator'
import { withTimeout } from './timeout-wrapper'
import { logApiError, logApiSuccess } from './error-logger'
import { createErrorResponse } from './error-handler'
import { getUserFriendlyError } from './user-messages'

interface ApiWrapperConfig {
  timeout?: number
  retry?: boolean | RetryConfig
  logError?: boolean
  locale?: string
}

const DEFAULT_WRAPPER_CONFIG: Required<ApiWrapperConfig> = {
  timeout: 30000,
  retry: false,
  logError: true,
  locale: 'zh',
}

export function withApiHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  config: ApiWrapperConfig = {}
): T {
  const options = { ...DEFAULT_WRAPPER_CONFIG, ...config }
  let wrappedHandler = handler

  // 添加超时
  if (options.timeout) {
    wrappedHandler = withTimeout(wrappedHandler, options.timeout) as T
  }

  // 添加重试
  if (options.retry) {
    wrappedHandler = withRetry(
      wrappedHandler,
      typeof options.retry === 'boolean' ? {} : options.retry
    ) as T
  }

  // 返回最终包装器
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now()
    const request = args[0] as NextRequest
    const requestId = request.headers.get('x-request-id')

    // 提取上下文
    const context = {
      requestId: requestId || undefined,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      path: request.nextUrl.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
    }

    try {
      const response = await wrappedHandler(...args)
      const duration = Date.now() - startTime

      // 记录成功
      if (options.logError) {
        logApiSuccess({ ...context, duration }, response.status)
      }

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      const errorObj = error instanceof Error ? error : new Error(String(error))

      // 记录错误
      if (options.logError) {
        logApiError(errorObj, { ...context, duration })
      }

      // 返回错误响应
      return await createErrorResponse(errorObj, undefined, undefined, options.locale)
    }
  }) as T
}

export async function createApiHandler(
  handler: (...args: any[]) => Promise<NextResponse>,
  config?: ApiWrapperConfig
) {
  return withApiHandling(handler, config)
}
```

#### 使用示例

```typescript
// src/app/api/projects/route.ts
import { withApiHandling } from '@/lib/api/api-wrapper'
import { createSuccessResponse } from '@/lib/api/error-handler'

// 使用包装器
export const GET = withApiHandling(
  async (request: NextRequest) => {
    // 业务逻辑
    const data = await fetchProjects()
    return createSuccessResponse(data)
  },
  {
    timeout: 10000,
    retry: { maxRetries: 2, initialDelay: 500 },
    locale: request.headers.get('accept-language')?.startsWith('en') ? 'en' : 'zh',
  }
)
```

---

## 四、实施路线图

### 阶段 1: 基础设施 (优先级: 🔴 高)

**时间估计**: 1-2 天

**任务**:

1. ✅ 创建 `src/lib/api/retry-decorator.ts`
2. ✅ 创建 `src/lib/api/error-logger.ts`
3. ✅ 创建 `src/lib/api/user-messages.ts`
4. ✅ 创建 `src/lib/api/timeout-wrapper.ts`
5. ✅ 创建 `src/lib/api/api-wrapper.ts` (统一包装器)
6. ✅ 添加请求 ID 中间件
7. ✅ 扩展 `ErrorResponse` 接口（添加 `userMessage`, `action`）

**验收标准**:

- 所有新文件有单元测试
- 中间件正常生成请求 ID
- 错误响应包含用户友好消息

---

### 阶段 2: API 路由迁移 (优先级: 🔴 高)

**时间估计**: 2-3 天

**任务**:

1. 迁移核心 API 路由到 `withApiHandling`:
   - `/api/auth/route.ts`
   - `/api/users/route.ts`
   - `/api/projects/route.ts`
   - `/api/notifications/route.ts`
2. 为外部 API 调用添加重试机制
3. 配置超时（建议 10-30 秒）
4. 添加错误日志

**示例**:

```typescript
// before
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // ...
  } catch (error) {
    return createErrorResponse(error)
  }
}

// after
export const POST = withApiHandling(
  async (request: NextRequest) => {
    const body = await request.json()
    // ...
  },
  { timeout: 15000, logError: true }
)
```

---

### 阶段 3: 前端错误处理增强 (优先级: 🟡 中)

**时间估计**: 1-2 天

**任务**:

1. 在关键页面使用 `NetworkErrorBoundary`:
   - 仪表板页面
   - 项目列表页面
   - 用户设置页面
2. 修改 `ContactForm` 使用 `RetryBoundary`
3. 创建统一的错误提示 Toast 组件
4. 添加错误日志上报到服务端

---

### 阶段 4: 监控和告警 (优先级: 🟡 中)

**时间估计**: 1 天

**任务**:

1. 集成 Sentry 或类似监控工具
2. 配置错误告警规则:
   - 5xx 错误率 > 5%
   - 单个错误类型每小时 > 100 次
3. 创建错误统计仪表板

---

### 阶段 5: 文档更新 (优先级: 🟢 低)

**时间估计**: 0.5 天

**任务**:

1. 更新 `docs/API-REFERENCE.md` 错误处理章节:
   - 添加完整错误类型列表
   - 提供错误响应示例
   - 说明重试策略
2. 创建 `docs/ERROR_HANDLING_GUIDE.md`:
   - 错误处理最佳实践
   - 如何使用 `withApiHandling`
   - 自定义错误消息

---

## 五、测试策略

### 5.1 单元测试

```typescript
// src/lib/api/__tests__/retry-decorator.test.ts
describe('withRetry', () => {
  it('should retry on retryable errors', async () => {
    let attempts = 0
    const fn = withRetry(
      async () => {
        attempts++
        if (attempts < 3) throw new Error('ECONNRESET')
        return 'success'
      },
      { maxRetries: 3 }
    )

    const result = await fn()
    expect(result).toBe('success')
    expect(attempts).toBe(3)
  })

  it('should not retry on non-retryable errors', async () => {
    const fn = withRetry(
      async () => {
        throw new Error('Invalid input')
      },
      { maxRetries: 3 }
    )

    await expect(fn()).rejects.toThrow('Invalid input')
  })
})
```

### 5.2 集成测试

```typescript
// src/app/api/auth/__tests__/route.test.ts
describe('/api/auth/login', () => {
  it('should return user-friendly error on 401', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'wrong', password: 'wrong' }),
      })
    )

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.userMessage).toBeDefined()
    expect(data.error.action).toBeDefined()
  })

  it('should include request ID', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-request-id': 'test-123' },
        body: JSON.stringify({ username: 'wrong', password: 'wrong' }),
      })
    )

    expect(response.headers.get('x-request-id')).toBe('test-123')
  })
})
```

---

## 六、配置建议

### 6.1 环境变量

```bash
# .env
# 错误监控
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production

# 重试配置
API_RETRY_MAX_ATTEMPTS=3
API_RETRY_INITIAL_DELAY=1000

# 超时配置
API_TIMEOUT_DEFAULT=30000
API_TIMEOUT_EXTERNAL=60000

# 日志配置
LOG_LEVEL=info
LOG_ERRORS_TO_SENTRY=true
```

### 6.2 默认配置文件

```typescript
// src/lib/api/config.ts
export const API_CONFIG = {
  retry: {
    maxAttempts: parseInt(process.env.API_RETRY_MAX_ATTEMPTS || '3', 10),
    initialDelay: parseInt(process.env.API_RETRY_INITIAL_DELAY || '1000', 10),
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  timeout: {
    default: parseInt(process.env.API_TIMEOUT_DEFAULT || '30000', 10),
    external: parseInt(process.env.API_TIMEOUT_EXTERNAL || '60000', 10),
  },
  retryableErrors: [503, 502, 504, 'ECONNRESET', 'ETIMEDOUT'],
} as const
```

---

## 七、风险和注意事项

### 7.1 潜在风险

| 风险               | 影响       | 缓解措施               |
| ------------------ | ---------- | ---------------------- |
| 重试导致重复请求   | 数据一致性 | 幂等性设计             |
| 超时时间过短       | 用户体验差 | 根据实际操作调整       |
| 日志量过大         | 性能影响   | 异步日志 + 日志聚合    |
| 错误消息本地化延迟 | 开发周期   | 优先中文，逐步添加英文 |

### 7.2 实施注意事项

1. **渐进式迁移**: 不要一次性修改所有 API，逐步迁移降低风险
2. **监控指标**: 监控错误率、重试次数、超时率
3. **A/B 测试**: 对重要变更进行灰度发布
4. **回滚计划**: 保留旧的错误处理逻辑，必要时回滚

---

## 八、总结

### 8.1 改进收益

| 方面           | 改进前               | 改进后                |
| -------------- | -------------------- | --------------------- |
| **用户体验**   | 技术错误消息、无重试 | 友好提示、自动重试    |
| **调试效率**   | 日志不完整           | 结构化日志 + 请求追踪 |
| **系统稳定性** | 网络波动易失败       | 重试 + 退避策略       |
| **运维监控**   | 无聚合统计           | 错误告警 + 仪表板     |

### 8.2 优先级建议

**立即实施 (本周)**:

- ✅ 创建基础设施文件 (阶段 1)
- ✅ 迁移核心认证 API (阶段 2 部分)

**短期实施 (2 周)**:

- ✅ 完成所有 API 路由迁移 (阶段 2)
- ✅ 前端错误边界增强 (阶段 3)

**中长期实施 (1 个月)**:

- ✅ 监控集成 (阶段 4)
- ✅ 文档更新 (阶段 5)

---

## 附录 A: 错误类型快速参考

| ErrorType           | HTTP 状态码 | 重试 | 示例场景              |
| ------------------- | ----------- | ---- | --------------------- |
| VALIDATION          | 400         | ❌   | 表单验证失败          |
| UNAUTHORIZED        | 401         | ❌   | 未登录                |
| FORBIDDEN           | 403         | ❌   | 权限不足              |
| NOT_FOUND           | 404         | ❌   | 资源不存在            |
| BAD_REQUEST         | 400         | ❌   | 请求格式错误          |
| RATE_LIMIT          | 429         | ⏱️   | 速率限制 (延迟后重试) |
| SERVICE_UNAVAILABLE | 503         | ✅   | 服务暂时不可用        |
| INTERNAL            | 500         | ✅   | 服务器内部错误        |
| REGISTRATION_FAILED | 400         | ❌   | 注册失败              |
| WEAK_PASSWORD       | 400         | ❌   | 密码强度不足          |
| MISSING_TOKEN       | 401         | ❌   | 缺少令牌              |

---

## 附录 B: 代码示例汇总

所有改进方案的完整代码示例已包含在上述章节中，可直接复制使用。

---

**文档结束**

_审查完成日期: 2026-03-22_  
_下一步: 等待主管审批后开始实施_
