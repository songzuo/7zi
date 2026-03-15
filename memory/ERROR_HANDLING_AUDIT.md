# 7zi 项目错误处理审计报告

**审计日期**: 2026-03-15  
**审计范围**: `src/app/api/` 目录  
**审计目标**: 识别错误处理问题，确保安全性和一致性

---

## 📊 审计总结

| 指标 | 数量 | 状态 |
|------|------|------|
| API 路由文件 | 37 | - |
| 使用 `withErrorHandler` | 4 | ⚠️ 需改进 |
| 原始 try-catch | 38 | ⚠️ 需统一 |
| 错误响应格式 | 多种 | ⚠️ 需统一 |

---

## 🔴 关键问题

### 1. 错误处理不一致

**问题描述**: 不同 API 端点使用不同的错误处理模式

**现状**:
```typescript
// ❌ 模式 1: 原始 try-catch (大多数文件)
// src/app/api/knowledge/nodes/route.ts
catch (error) {
  apiLogger.error('Error fetching nodes', { error });
  return NextResponse.json(
    { success: false, error: 'Failed to fetch nodes' },
    { status: 500 }
  );
}

// ❌ 模式 2: 带消息泄露
// src/app/api/notifications/route.ts
catch (error) {
  return NextResponse.json(
    { error: 'Failed to create notification', message: error instanceof Error ? error.message : 'Unknown error' },
    { status: 400 }
  );
}

// ✅ 模式 3: 正确使用 withErrorHandler (仅 auth, logs)
export const GET = withErrorHandler(async (request: NextRequest) => {
  // ... handler code
});
```

**风险**: 
- 错误响应格式不统一
- 缺少 requestId 跟踪
- 可能泄露内部错误详情

---

### 2. 敏感信息泄露风险

**问题位置**: `src/app/api/notifications/route.ts`

```typescript
// ❌ 泄露错误消息给客户端
return NextResponse.json(
  { error: 'Failed to create notification', 
    message: error instanceof Error ? error.message : 'Unknown error' }, // 危险!
  { status: 400 }
);
```

**风险**:
- 内部错误消息可能包含敏感路径、数据库结构
- 攻击者可利用错误信息进行探测

---

### 3. 认证错误处理不完整

**问题位置**: `src/app/api/auth/route.ts`

```typescript
// ❌ 登录失败时记录了邮箱
authLogger.warn('Login failed - invalid credentials', { email }); // 可接受
// 但错误消息过于通用
return unauthorized('邮箱或密码错误', request);

// ❌ 刷新令牌错误可能泄露信息
catch (error) {
  authLogger.error('Token refresh error', error);
  return serverError('Token refresh failed', request); // 生产环境不应暴露"Token refresh"
}
```

---

### 4. 数据库操作缺少错误转换

**问题位置**: 多处数据操作

```typescript
// ❌ src/app/api/tasks/route.ts
const existingTask = getTaskById(id);
// 如果数据层抛出异常，未被捕获

// ❌ src/app/api/knowledge/nodes/route.ts
const store = getKnowledgeStore();
// store.addNode() 可能抛出数据库错误，未被正确转换
```

---

### 5. 外部服务调用缺少超时和重试

**问题**: 外部 API 调用没有统一的超时处理

```typescript
// ❌ 缺少超时控制
const response = await fetch(externalUrl);
// 如果外部服务无响应，会阻塞请求
```

---

## 🟡 中等问题

### 6. 错误响应格式不统一

当前存在多种格式:

```typescript
// 格式 1: { success: false, error: string }
{ success: false, error: 'Failed to fetch nodes' }

// 格式 2: { error: string, message?: string }
{ error: 'Failed to create notification', message: '...' }

// 格式 3: ApiErrorResponse (正确)
{ error: 'VALIDATION_ERROR', code: 'VALIDATION_ERROR', message: '...', timestamp: '...', requestId: '...' }
```

---

### 7. 缺少请求 ID 传递

大多数错误响应缺少 `requestId`，导致:
- 无法追踪错误链路
- 难以关联日志和用户反馈

---

### 8. CSRF 中间件重复创建

```typescript
// ❌ 每次请求都创建新实例
export async function POST(request: NextRequest) {
  const csrfMiddleware = createCsrfMiddleware(); // 应在模块级别创建
  const csrfResult = await csrfMiddleware(request);
}
```

---

## 🟢 已实现的良好实践

### ✅ 1. 敏感数据过滤

`src/lib/logger/index.ts` 已实现自动过滤:
```typescript
const SENSITIVE_FIELDS = [
  'password', 'secret', 'token', 'apiKey', 'credential',
  'authorization', 'accessToken', 'refreshToken', 'privateKey', 'sessionId',
];
```

### ✅ 2. 统一错误类体系

`src/lib/errors/` 提供了完整的错误类型:
- `AppError` - 基类
- `ValidationError`, `AuthError`, `ForbiddenError` 等 - 特化类
- `ErrorCodes` - 错误码枚举
- `getUserFriendlyMessage()` - 用户友好消息

### ✅ 3. 错误处理中间件

`withErrorHandler` 提供了:
- 自动错误捕获
- 统一响应格式
- 请求 ID 生成
- 错误日志记录

---

## 📋 改进建议

### 优先级 P0 (立即修复)

1. **统一使用 `withErrorHandler`**
   - 所有 API 路由都应使用此中间件
   - 移除原始 try-catch

2. **移除错误消息泄露**
   - 禁止将 `error.message` 直接返回给客户端
   - 使用 `getUserFriendlyMessage()` 获取用户友好消息

3. **添加请求 ID 到所有响应**
   - 成功和失败响应都应包含 `requestId`

---

### 优先级 P1 (本周完成)

4. **创建 API 路由模板**
   - 统一错误处理模式
   - 规范认证和授权检查

5. **添加数据库错误转换**
   - 捕获数据库异常
   - 转换为 `DatabaseError`

6. **外部服务调用包装器**
   - 添加超时控制
   - 实现重试机制

---

### 优先级 P2 (下周完成)

7. **完善错误监控**
   - 集成 Sentry 或类似服务
   - 添加错误告警

8. **编写错误处理测试**
   - 单元测试: 错误转换
   - 集成测试: API 错误响应

---

## 🔧 实施计划

详见 `ERROR_HANDLING_FIXES.md`