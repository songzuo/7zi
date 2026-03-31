# API 统一响应格式规范

## 版本
- 创建日期: 2026-03-31
- 版本: 1.0.0
- 状态: 实施中

## 背景
根据 2026-03-31 站会报告，项目中存在多种 API 响应格式，需要统一为 `{success, error, data}` 格式。

## 统一响应格式定义

### 成功响应
```typescript
interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp?: string;      // 可选：ISO 8601 时间戳
  requestId?: string;      // 可选：请求追踪 ID
  meta?: {                 // 可选：分页元数据
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}
```

### 错误响应
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    type: ErrorType;       // 错误类型枚举
    message: string;       // 开发环境详细消息
    userMessage?: string;  // 用户友好消息
    code?: string;         // 错误代码
    details?: Record<string, unknown>;  // 额外详情
    timestamp: string;
  };
  requestId?: string;
}
```

### ErrorType 枚举
```typescript
enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  MISSING_TOKEN = 'MISSING_TOKEN',
}
```

## 使用指南

### 推荐导入
```typescript
// 推荐：使用 error-handler.ts 提供的工具函数
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  createUnauthorizedError,
  createNotFoundError,
  withErrorHandling,
} from '@/lib/api/error-handler';
```

### 成功响应示例
```typescript
// 简单成功响应
return createSuccessResponse({ user });

// 带状态码的成功响应
return createSuccessResponse({ user }, 201);

// 使用 withApiHandler 包装
export const GET = withApiHandler(async (request) => {
  const data = await someOperation();
  return createSuccessResponse(data);
});
```

### 错误响应示例
```typescript
// 验证错误
return createValidationError('Invalid email format', { field: 'email' });

// 未授权错误
return createUnauthorizedError('Session expired');

// 未找到错误
return createNotFoundError('User not found');

// 使用 withErrorHandling 自动捕获
export const GET = withErrorHandling(async (request) => {
  // 错误会自动转换为统一格式
  throw new Error('Something went wrong');
});
```

## 待迁移 API 列表

| # | API 路径 | 当前状态 | 优先级 |
|---|---------|---------|--------|
| 1 | /api/workflow | 使用旧格式 | P0 |
| 2 | /api/workflow/[id] | 使用旧格式 | P0 |
| 3 | /api/workflow/[id]/run | 使用旧格式 | P0 |
| 4 | /api/a2a/registry | 使用旧格式 | P0 |
| 5 | /api/a2a/registry/[id] | 使用旧格式 | P0 |
| 6 | /api/revalidate | 使用旧格式 | P1 |
| 7 | /api/projects | 部分统一 | P1 |
| 8 | /api/csp-violation | 使用旧格式 | P1 |

## 已迁移 API 列表

| # | API 路径 | 迁移日期 | 状态 |
|---|---------|---------|------|
| 1 | /api/auth/login | 已完成 | ✅ |
| 2 | /api/auth/register | 已完成 | ✅ |
| 3 | /api/auth/me | 已完成 | ✅ |
| 4 | /api/tasks | 已完成 | ✅ |
| 5 | /api/status | 已完成 | ✅ |

## 测试验证

### 单元测试
- 所有 API 响应应包含 `success` 字段
- 成功响应必须有 `data` 字段
- 错误响应必须有 `error` 对象

### 集成测试
- 测试各种错误场景返回正确格式
- 验证 HTTP 状态码与错误类型匹配

## 迁移完成标准
1. 所有 API 返回 `{success, error?, data?}` 格式
2. 错误响应包含 `success: false` 和 `error` 对象
3. 成功响应包含 `success: true` 和 `data` 对象
4. 所有测试通过

---

*文档维护：⚡ Executor*
