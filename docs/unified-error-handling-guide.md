# 统一错误处理系统使用指南

## 概述

统一错误处理系统提供了一种一致的方式来处理项目中的所有错误。它将多个错误处理系统合并为一个统一的框架,提高了代码的可维护性和可读性。

## 核心概念

### 1. UnifiedAppError

所有应用错误都应该使用 `UnifiedAppError` 类或其静态方法创建:

```typescript
import { UnifiedAppError } from '@/lib/errors';

// 创建验证错误
throw UnifiedAppError.validation('Email is required');

// 创建未找到错误
throw UnifiedAppError.notFound('User not found');

// 创建未授权错误
throw UnifiedAppError.unauthorized('Access denied');

// 创建内部错误
throw UnifiedAppError.internal('Something went wrong');

// 创建自定义错误
throw new UnifiedAppError(
  UnifiedErrorType.CUSTOM,
  'Custom error message',
  500,
  { customField: 'value' },
  false
);
```

### 2. 错误类型枚举

所有错误类型都定义在 `UnifiedErrorType` 枚举中:

```typescript
enum UnifiedErrorType {
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
  INTERNAL = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}
```

### 3. 统一响应格式

所有 API 响应都遵循统一的格式:

**成功响应:**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**错误响应:**
```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Email is required",
    "code": "VALIDATION_ERROR",
    "details": { ... },
    "retryable": false,
    "retryAfter": null,
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## 使用指南

### 在 Service 层

**❌ 不要这样做 - 返回结果对象:**
```typescript
async function login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const user = await getUser(email);
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }
    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Login failed' };
  }
}
```

**✅ 应该这样做 - 抛出错误:**
```typescript
async function login(email: string, password: string): Promise<User> {
  const user = await getUser(email);
  if (!user) {
    throw UnifiedAppError.unauthorized('Invalid credentials');
  }
  return user;
}
```

### 在 API Routes

**方式 1: 使用 try-catch:**
```typescript
import { NextRequest } from 'next/server';
import { createUnifiedSuccessResponse, createUnifiedErrorResponse } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const user = await login(email, password);
    return createUnifiedSuccessResponse(user);
  } catch (error) {
    return createUnifiedErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
```

**方式 2: 使用包装器 (推荐):**
```typescript
import { withUnifiedErrorHandling, createUnifiedSuccessResponse } from '@/lib/errors';

export const POST = withUnifiedErrorHandling(async (request: NextRequest) => {
  const user = await login(email, password);
  return createUnifiedSuccessResponse(user);
});
```

### 在数据库层

```typescript
import { getDatabase } from '@/lib/db';
import { UnifiedAppError } from '@/lib/errors';

function createUser(data: UserData): User {
  const db = getDatabase();

  try {
    const stmt = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
    const result = stmt.run(data.email, data.password);
    return getUserById(result.lastInsertRowid);
  } catch (error) {
    // 判断错误类型
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('UNIQUE constraint')) {
      throw UnifiedAppError.conflict('Email already exists', { email: data.email });
    }

    throw UnifiedAppError.internal('Failed to create user', { error: errorMessage });
  }
}
```

### 在前端

```typescript
import { createUnifiedErrorResponse, isUnifiedError } from '@/lib/errors';

async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();

    if (!data.success) {
      // 处理错误
      console.error('Error:', data.error.message);
      // 显示用户友好的错误消息
      showError(data.error.message);
      return;
    }

    // 处理成功数据
    return data.data;
  } catch (error) {
    console.error('Network error:', error);
    showError('Failed to fetch data');
  }
}
```

## 错误处理最佳实践

### 1. 选择正确的错误类型

| 场景 | 错误类型 | HTTP 状态码 |
|------|----------|-------------|
| 输入验证失败 | `UnifiedErrorType.VALIDATION` | 400 |
| 资源不存在 | `UnifiedErrorType.NOT_FOUND` | 404 |
| 未登录 | `UnifiedErrorType.UNAUTHORIZED` | 401 |
| 无权限 | `UnifiedErrorType.FORBIDDEN` | 403 |
| 请求过于频繁 | `UnifiedErrorType.RATE_LIMIT` | 429 |
| 冲突 (如重复注册) | `UnifiedErrorType.CONFLICT` | 409 |
| 内部错误 | `UnifiedErrorType.INTERNAL` | 500 |
| 网络错误 | `UnifiedErrorType.NETWORK_ERROR` | 503 |
| 超时 | `UnifiedErrorType.TIMEOUT` | 504 |

### 2. 提供有用的错误详情

```typescript
// ✅ 好的做法
throw UnifiedAppError.validation('Password is too weak', {
  minLength: 8,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresNumber: true,
});

// ❌ 不好的做法
throw UnifiedAppError.validation('Invalid password');
```

### 3. 处理可重试错误

```typescript
try {
  const data = await fetchData();
} catch (error) {
  if (isUnifiedError(error) && error.retryable) {
    // 可重试错误,使用指数退避重试
    await retry(() => fetchData(), { maxAttempts: 3, delay: 1000 });
  } else {
    // 不可重试错误,直接显示错误
    showError(error.message);
  }
}
```

### 4. 在日志中记录错误

```typescript
import { logger } from '@/lib/logger';

try {
  await someOperation();
} catch (error) {
  logger.error('Operation failed', error, {
    category: 'operation',
    userId: getCurrentUserId(),
    // 不要记录敏感信息
  });

  throw error; // 重新抛出以让上层处理
}
```

## 迁移指南

### 从旧的错误处理迁移

**旧代码 (使用返回对象):**
```typescript
async function oldFunction(): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const result = await doSomething();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
}

// 使用
const result = await oldFunction();
if (result.success) {
  // 处理结果
} else {
  // 处理错误
}
```

**新代码 (抛出错误):**
```typescript
async function newFunction(): Promise<unknown> {
  const result = await doSomething();
  if (!result) {
    throw UnifiedAppError.notFound('Resource not found');
  }
  return result;
}

// 使用
try {
  const data = await newFunction();
  // 处理结果
} catch (error) {
  // 处理错误
}
```

### 向后兼容

在迁移期间,可以保留旧的接口:

```typescript
/**
 * @deprecated Use newFunction() instead - throws UnifiedAppError
 */
async function oldFunction(): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const data = await newFunction();
    return { success: true, data };
  } catch (error) {
    if (isUnifiedError(error)) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error' };
  }
}
```

## 常见问题

### Q: 为什么要抛出错误而不是返回结果对象?

A: 抛出错误的好处:
1. 代码更清晰: 成功路径和错误路径分离
2. 强制处理错误: 调用者必须处理错误
3. 更好的堆栈跟踪: 错误堆栈更有用
4. 更容易使用 async/await: 不需要检查 `success` 标志

### Q: 如何处理不可预见的错误?

A: 使用 `toUnifiedError()` 将任何错误转换为统一错误:

```typescript
try {
  await someThirdPartyLibrary();
} catch (error) {
  const unifiedError = toUnifiedError(error);
  throw unifiedError; // 或直接抛出
}
```

### Q: 如何添加自定义错误类型?

A: 扩展 `UnifiedErrorType` 枚举和 `getDefaultStatusCode()` 函数:

```typescript
// 在 src/lib/errors/unified-types.ts 中
export enum UnifiedErrorType {
  // ... 现有类型
  CUSTOM_ERROR = 'CUSTOM_ERROR',
}

// 在 getDefaultStatusCode() 中添加
const typeToStatus: Record<UnifiedErrorType, number> = {
  // ... 现有映射
  [UnifiedErrorType.CUSTOM_ERROR]: 418, // I'm a teapot
};
```

### Q: 如何在测试中模拟错误?

A: 使用 `UnifiedAppError` 的构造函数或静态方法:

```typescript
import { UnifiedAppError } from '@/lib/errors';

describe('myFunction', () => {
  it('should handle errors', async () => {
    jest.spyOn(dependency, 'method').mockRejectedValue(
      UnifiedAppError.validation('Invalid input')
    );

    await expect(myFunction()).rejects.toThrow('Invalid input');
  });
});
```

## 总结

统一错误处理系统的关键原则:

1. ✅ **抛出错误**而不是返回 `{ success, error }` 对象
2. ✅ 使用 **UnifiedAppError** 创建错误
3. ✅ 选择正确的 **UnifiedErrorType**
4. ✅ 使用 **createUnifiedErrorResponse** 创建 API 响应
5. ✅ 在 **API Routes** 中使用 **withUnifiedErrorHandling** 包装器
6. ✅ 提供 **有用的错误详情** 和 **用户友好的消息**

遵循这些原则,你将创建出一致、易于维护的错误处理代码。
