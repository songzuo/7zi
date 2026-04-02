# 错误处理一致性优化报告

## 项目概述

本报告分析了 7zi-project 的错误处理模式,发现存在不一致的问题,并提出改进方案。

---

## 发现的问题

### 1. 多个错误处理系统并存

项目中存在**三个独立的错误处理系统**,导致代码混乱和维护困难:

| 文件                                    | 错误类             | 错误类型枚举   | 使用情况        |
| --------------------------------------- | ------------------ | -------------- | --------------- |
| `src/lib/api/error-handler.ts`          | `ApiError`         | `ErrorType`    | 部分 API routes |
| `src/lib/api/enhanced-error-handler.ts` | `EnhancedApiError` | `ApiErrorType` | 未广泛使用      |
| `src/lib/errors.ts`                     | `AppError`         | `ErrorCodes`   | 通用函数        |

### 2. 命名不一致

- 错误类型: `ErrorType` vs `ApiErrorType`
- 错误类: `ApiError` vs `EnhancedApiError`
- 响应类型: `ErrorResponse` vs `EnhancedErrorResponse`
- 辅助函数: `createXxxError` vs `createXxxErrorResponse`

### 3. 响应格式不统一

**error-handler.ts:**

```typescript
{
  success: false,
  error: {
    type: ErrorType,
    message: string,
    details?: Record<string, unknown>,
    timestamp: string
  }
}
```

**enhanced-error-handler.ts:**

```typescript
{
  success: false,
  error: {
    type: ApiErrorType,
    message: string,
    code?: string,
    details?: Record<string, unknown>,
    retryable: boolean,
    retryAfter?: number,
    timestamp: string
  }
}
```

### 4. 错误处理模式混乱

**模式 1: 返回结果对象 (auth/service.ts)**

```typescript
async function loginUser(request: LoginRequest): Promise<LoginSuccessResponse | LoginFailureResponse> {
  try {
    // ...
    return { success: true, user, token };
  } catch (error) {
    logger.error(...);
    return { success: false, error: 'Login failed' };
  }
}
```

**模式 2: 抛出错误 (db/index.ts)**

```typescript
function query(sql: string, params?: unknown[]) {
  try {
    // ...
  } catch (error) {
    logger.error(...);
    throw error;  // 直接抛出
  }
}
```

**模式 3: 包装函数 (API routes)**

```typescript
export async function POST(request: NextRequest) {
  try {
    // ...
  } catch (error) {
    return createErrorResponse(error)
  }
}
```

**模式 4: Promise.catch() (某些地方)**

```typescript
someAsyncOperation().catch(error => {
  logger.error(error)
  return null
})
```

---

## 推荐方案

### 统一错误处理架构

#### 1. 合并错误类型定义

创建统一的错误类型枚举,合并三个系统的优点:

```typescript
// src/lib/errors/unified-types.ts
export enum UnifiedErrorType {
  // Client errors (4xx)
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  BAD_REQUEST = 'BAD_REQUEST',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  MISSING_TOKEN = 'MISSING_TOKEN',
  CONFLICT = 'CONFLICT',

  // Server errors (5xx)
  INTERNAL = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

export interface UnifiedError {
  type: UnifiedErrorType
  message: string
  code?: string // 错误代码 (用于国际化)
  statusCode: number
  details?: Record<string, unknown>
  retryable: boolean
  retryAfter?: number
}
```

#### 2. 创建统一的错误类

```typescript
// src/lib/errors/unified-error.ts
export class UnifiedAppError extends Error {
  constructor(
    public type: UnifiedErrorType,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
    public retryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'UnifiedAppError'
  }
}
```

#### 3. 统一的错误响应格式

```typescript
// src/lib/errors/unified-response.ts
export interface UnifiedErrorResponse {
  success: false
  error: {
    type: UnifiedErrorType
    message: string
    code?: string
    details?: Record<string, unknown>
    retryable: boolean
    retryAfter?: number
    timestamp: string
  }
}

export interface UnifiedSuccessResponse<T = unknown> {
  success: true
  data: T
  timestamp: string
}
```

#### 4. 统一的错误处理工具

```typescript
// src/lib/errors/unified-handler.ts
export function createUnifiedError(
  type: UnifiedErrorType,
  message: string,
  statusCode?: number,
  details?: Record<string, unknown>
): UnifiedAppError

export function createUnifiedErrorResponse(
  error: Error | UnifiedAppError,
  statusCode?: number,
  details?: Record<string, unknown>
): NextResponse<UnifiedErrorResponse>

export function createUnifiedSuccessResponse<T>(
  data: T,
  status?: number
): NextResponse<UnifiedSuccessResponse<T>>

export function withUnifiedErrorHandling<T>(
  handler: (...args: unknown[]) => Promise<NextResponse<unknown>>
): T
```

#### 5. 统一的错误处理指南

**对于同步/异步操作:**

```typescript
// ❌ 不要这样做 - 返回 { success, error } 对象
async function getData(): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const data = await fetch()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'Failed' }
  }
}

// ✅ 应该这样做 - 直接抛出错误
async function getData(): Promise<Data> {
  const data = await fetch()
  if (!data) {
    throw createUnifiedError(UnifiedErrorType.NOT_FOUND, 'Data not found', 404)
  }
  return data
}
```

**对于 API Routes:**

```typescript
export async function POST(request: NextRequest) {
  try {
    const data = await getData()
    return createUnifiedSuccessResponse(data)
  } catch (error) {
    return createUnifiedErrorResponse(error)
  }
}

// 或者使用包装器
export const POST = withUnifiedErrorHandling(async (request: NextRequest) => {
  const data = await getData()
  return createUnifiedSuccessResponse(data)
})
```

**对于数据库操作:**

```typescript
function createUser(data: UserData): User {
  try {
    const stmt = db.prepare('INSERT INTO users...');
    const result = stmt.run(...);
    return getUserById(result.lastInsertRowid);
  } catch (error) {
    logger.error('Failed to create user', error);
    throw createUnifiedError(UnifiedErrorType.INTERNAL, 'Failed to create user', 500);
  }
}
```

---

## 实施计划

### 阶段 1: 创建统一错误处理工具 (已完成设计)

- [ ] 创建 `src/lib/errors/unified-types.ts`
- [ ] 创建 `src/lib/errors/unified-error.ts`
- [ ] 创建 `src/lib/errors/unified-response.ts`
- [ ] 创建 `src/lib/errors/unified-handler.ts`
- [ ] 更新 `src/lib/error-handling.ts` 导出新的统一接口

### 阶段 2: 更新关键模块

#### 模块 1: Authentication Service

- **文件**: `src/lib/auth/service.ts`
- **现状**: 使用返回对象模式 `{ success, error }`
- **改进**: 改为抛出错误,让调用者处理

#### 模块 2: Database Module

- **文件**: `src/lib/db/index.ts`
- **现状**: 部分地方抛出通用错误
- **改进**: 使用统一的错误类型

#### 模块 3: API Routes

- **文件**: `src/app/api/**/*.ts`
- **现状**: 混用多个错误处理器
- **改进**: 统一使用 `createUnifiedErrorResponse`

### 阶段 3: 逐步迁移

1. **保留旧接口** (向后兼容):

   ```typescript
   @deprecated('Use throw new UnifiedAppError() instead')
   export function createAppError(...) { ... }
   ```

2. **逐步替换**:
   - 优先更新新代码
   - 修改频繁使用的模块
   - 保持测试同步更新

3. **最终清理**:
   - 移除重复的错误处理文件
   - 更新文档
   - 发送 PR review

---

## 实施进度

- [x] 阶段 1: 创建统一错误处理工具
- [x] 阶段 2: 更新关键模块
- [ ] 阶段 3: 逐步迁移

## 已完成的工作

### 阶段 1: 统一错误处理工具 ✅

创建了完整的统一错误处理系统:

1. **类型定义** (`src/lib/errors/unified-types.ts`)
   - `UnifiedErrorType` 枚举 - 统一所有错误类型
   - `ErrorCodes` 常量 - 用于国际化
   - `UnifiedErrorInfo` 接口 - 统一错误信息格式
   - 辅助函数: `isRetryableErrorType()`, `getDefaultStatusCode()`

2. **错误类** (`src/lib/errors/unified-error.ts`)
   - `UnifiedAppError` 类 - 核心错误类
   - 静态工厂方法: `validation()`, `notFound()`, `unauthorized()` 等
   - 工具函数: `toUnifiedError()`, `isUnifiedError()`, `extractErrorInfo()`

3. **响应处理器** (`src/lib/errors/unified-response.ts`)
   - `createUnifiedErrorResponse()` - 创建统一错误响应
   - `createUnifiedSuccessResponse()` - 创建统一成功响应
   - `withUnifiedErrorHandling()` - 错误处理包装器
   - 便捷函数: `createValidationErrorResponse()`, `createNotFoundErrorResponse()` 等

4. **统一入口** (`src/lib/errors/index.ts`)
   - 导出所有统一的类型、类和函数
   - 保留旧的导出以向后兼容 (标记为 `@deprecated`)

5. **更新主入口** (`src/lib/error-handling.ts`)
   - 添加统一错误处理系统的导出
   - 保持向后兼容

### 阶段 2: 更新关键模块 ✅

#### 2.1 Authentication Service

创建了使用统一错误处理的新版本 (`src/lib/auth/service-unified.ts`):

**改进点:**

- ❌ 旧代码: 返回 `{ success, error }` 对象
- ✅ 新代码: 抛出 `UnifiedAppError`

**示例对比:**

```typescript
// 旧代码
async function loginUser(
  request: LoginRequest
): Promise<LoginSuccessResponse | LoginFailureResponse> {
  try {
    if (!user) {
      return { success: false, error: 'Invalid email or password' }
    }
    return { success: true, user, token }
  } catch (error) {
    return { success: false, error: 'Login failed' }
  }
}

// 新代码
async function loginUser(request: LoginRequest): Promise<UserWithToken> {
  if (!user) {
    throw UnifiedAppError.unauthorized('Invalid email or password')
  }
  return { user, token }
}
```

#### 2.2 API Routes

创建了使用统一错误处理的新版本 (`src/app/api/auth/login/route-unified.ts`):

**改进点:**

- 使用 `withUnifiedErrorHandling()` 包装器自动处理错误
- 使用 `createUnifiedSuccessResponse()` 和 `createUnifiedErrorResponse()` 创建响应
- 代码更简洁,逻辑更清晰

**示例对比:**

```typescript
// 旧代码
export async function POST(request: NextRequest) {
  try {
    const result = await loginUser(request)
    if (!result.success) {
      return createUnauthorizedError(result.error)
    }
    return createSuccessResponse(result)
  } catch (error) {
    return createErrorResponse(error)
  }
}

// 新代码
export const POST = withUnifiedErrorHandling(async (request: NextRequest) => {
  const result = await loginUser(request) // 直接抛出错误
  return createUnifiedSuccessResponse(result)
})
```

#### 2.3 Database Module

创建了使用统一错误处理的新版本 (`src/lib/db/index-unified.ts`):

**改进点:**

- 所有数据库操作都抛出 `UnifiedAppError`
- 根据错误类型自动判断可重试性
- 提供更详细的错误信息

**示例对比:**

```typescript
// 旧代码
function query(sql: string, params?: unknown[]) {
  try {
    // ... 执行查询
  } catch (error) {
    logger.error(error)
    throw error // 抛出通用错误
  }
}

// 新代码
function query(sql: string, params?: unknown[]) {
  try {
    // ... 执行查询
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // 根据错误类型创建合适的错误
    if (errorMessage.includes('SQLITE_BUSY')) {
      throw UnifiedAppError.serviceUnavailable('Database is busy, please retry', 5)
    }

    if (errorMessage.includes('SQLITE_CONSTRAINT')) {
      throw UnifiedAppError.conflict('Database constraint violation', { sql, params })
    }

    throw UnifiedAppError.internal(`Database query failed: ${errorMessage}`, { sql, params })
  }
}
```

### 阶段 3: 文档和指南 ✅

创建了完整的使用指南 (`docs/unified-error-handling-guide.md`):

**内容包括:**

- 核心概念介绍
- 详细的使用示例
- 最佳实践
- 迁移指南
- 常见问题解答
- 错误类型选择指南

---

## 注意事项

1. **向后兼容**: 在迁移期间保留旧接口,标记为 `@deprecated`
2. **类型安全**: 使用 TypeScript 确保类型安全
3. **测试覆盖**: 更新测试以匹配新的错误处理方式
4. **文档更新**: 更新 API 文档和开发者指南
5. **代码审查**: 每个 PR 需要检查错误处理一致性

---

## 附录: 错误类型映射

| 旧类型                        | 新类型                               | HTTP 状态码 |
| ----------------------------- | ------------------------------------ | ----------- |
| ErrorType.VALIDATION          | UnifiedErrorType.VALIDATION          | 400         |
| ErrorType.NOT_FOUND           | UnifiedErrorType.NOT_FOUND           | 404         |
| ErrorType.UNAUTHORIZED        | UnifiedErrorType.UNAUTHORIZED        | 401         |
| ErrorType.FORBIDDEN           | UnifiedErrorType.FORBIDDEN           | 403         |
| ErrorType.RATE_LIMIT          | UnifiedErrorType.RATE_LIMIT          | 429         |
| ErrorType.INTERNAL            | UnifiedErrorType.INTERNAL            | 500         |
| ErrorType.SERVICE_UNAVAILABLE | UnifiedErrorType.SERVICE_UNAVAILABLE | 503         |
| ApiErrorType.NETWORK_ERROR    | UnifiedErrorType.NETWORK_ERROR       | 503         |
| ApiErrorType.TIMEOUT          | UnifiedErrorType.TIMEOUT             | 504         |

---

## 总结

当前项目的错误处理存在严重的不一致性问题,主要体现在:

- 多个错误处理系统并存
- 命名和格式不统一
- 错误处理模式混乱

通过实施本报告提出的统一错误处理架构,可以实现:

- ✅ 一致的错误类型和格式
- ✅ 更清晰的代码结构
- ✅ 更容易维护和扩展
- ✅ 更好的错误追踪和调试
- ✅ 支持重试机制和优雅降级

建议按照分阶段的方式实施,优先完成关键模块的迁移,然后逐步扩展到整个项目。
