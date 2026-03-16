# 7zi 项目 API 代码审查报告

**审查日期**: 2026-03-15  
**审查范围**: `src/app/api/` 目录下所有 API 路由  
**审查人**: AI Code Reviewer

---

## 📊 审查概览

### API 模块统计

| 模块 | 端点数 | 状态 | 质量评分 |
|------|--------|------|----------|
| Tasks API | 5 | ✅ 良好 | 8.5/10 |
| Projects API | 6 | ✅ 良好 | 8/10 |
| Auth API | 10 | ✅ 良好 | 8.5/10 |
| Health API | 6 | ✅ 优秀 | 9/10 |
| Knowledge API | 10 | ✅ 良好 | 8/10 |
| Logs API | 3 | ✅ 良好 | 8.5/10 |
| Notifications API | 4 | ✅ 良好 | 8/10 |
| Comments API | 5 | ⚠️ 需改进 | 6/10 |
| Status API | 1 | ✅ 优秀 | 9/10 |
| Log-Error API | 2 | ✅ 优秀 | 9/10 |
| Examples API | 4 | ✅ 良好 | 8/10 |

**总体评分**: 8.2/10

---

## ✅ 优点

### 1. **统一错误处理系统**
- 使用 `@/lib/errors` 和 `@/lib/api-error` 提供一致的错误响应格式
- 支持 `withErrorHandler` 装饰器模式
- 用户友好的错误消息映射

### 2. **认证与安全**
- JWT Token 认证实现完善
- CSRF 保护使用双重 Cookie 提交模式
- 密码强度验证 (`validateJwtSecret`)
- 使用 `timingSafeEqual` 防止时序攻击

### 3. **性能优化**
- Tasks API 使用 `IndexedStore` 实现 O(1) 索引查询
- 缓存支持 (`cached-api.ts`)
- Knowledge API 使用缓存头 (`Cache-Control`)

### 4. **代码组织**
- 清晰的模块化结构
- 良好的 TypeScript 类型定义
- JSDoc 注释完善

### 5. **日志系统**
- 结构化日志 (`apiLogger`, `authLogger`)
- 审计日志记录敏感操作
- 数据库日志传输支持

---

## ⚠️ 问题与改进建议

### 高优先级

#### 1. **重复代码 - 认证检查模式**

**问题**: 多个 API 路由中重复相同的认证逻辑

**位置**: 
- `tasks/route.ts` (POST, PUT, DELETE)
- `projects/route.ts` (POST)
- `notifications/route.ts` (POST, PUT, DELETE)
- `logs/route.ts` (DELETE)

**示例**:
```typescript
// 重复出现多次
const token = extractToken(request);
if (!token) {
  return authError('Authentication required', request);
}
const payload = await verifyToken(token);
if (!payload) {
  return authError('Invalid or expired token', request);
}
```

**建议**: 创建统一的认证装饰器
```typescript
// lib/middleware/auth-decorator.ts
export function withAuth(
  handler: (request: NextRequest, user: TokenPayload) => Promise<Response>,
  options?: { requireAdmin?: boolean }
) {
  return async (request: NextRequest) => {
    const token = extractToken(request);
    if (!token) return authError('Authentication required', request);
    
    const payload = await verifyToken(token);
    if (!payload) return authError('Invalid or expired token', request);
    
    if (options?.requireAdmin && !isAdmin(payload)) {
      return forbiddenError('Admin access required', request);
    }
    
    return handler(request, payload);
  };
}

// 使用
export const POST = withAuth(async (request, user) => {
  // user 已验证，直接使用
  return successResponse({ userId: user.sub });
}, { requireAdmin: true });
```

---

#### 2. **Comments API - 文件系统存储**

**问题**: 使用同步文件系统操作，不适合生产环境

**位置**: `comments/route.ts`

```typescript
// 当前实现
function loadComments(): Comment[] {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf-8'); // 同步阻塞
    return JSON.parse(data);
  }
  return [];
}
```

**建议**: 
1. 迁移到数据库存储 (使用与其他模块相同的模式)
2. 或使用 `IndexedStore` 内存存储 + 持久化

---

#### 3. **Tasks Assign API - Mock 实现**

**问题**: `tasks/[id]/assign/route.ts` 使用硬编码的 mock 数据

**位置**: 第 74-126 行

```typescript
// 硬编码的 mock 数据
const mockTasks: Task[] = [
  { id: 'task-001', ... },
  { id: 'task-002', ... },
  { id: 'task-003', ... },
];
```

**建议**: 
```typescript
// 使用实际的 taskStore
import { getTaskById, updateTask } from '@/lib/data/tasks-indexed';

const task = getTaskById(taskId);
if (!task) {
  return NextResponse.json({ error: 'Task not found' }, { status: 404 });
}
```

---

### 中优先级

#### 4. **类型安全问题 - CSRF 中间件**

**问题**: 部分 API 直接调用 `createCsrfMiddleware()` 而没有类型化的响应

**位置**: 多个文件

**建议**: 创建类型化的 CSRF 响应
```typescript
interface CsrfErrorResponse {
  error: 'CSRF_TOKEN_MISSING' | 'CSRF_TOKEN_MISMATCH' | 'CSRF_TOKEN_INVALID';
  code: string;
  message: string;
}
```

---

#### 5. **输入验证不一致**

**问题**: 部分路由使用 Zod (log-error)，部分使用手动验证

**建议**: 统一使用 Zod 进行输入验证
```typescript
// 创建共享的验证 schema
// lib/validation/schemas.ts
export const TaskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(['development', 'design', 'research', 'marketing', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignee: z.string().optional(),
  projectId: z.string().optional(),
});

// 在 API 中使用
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = TaskCreateSchema.safeParse(body);
  
  if (!result.success) {
    return validationError(result.error.message, result.error.errors[0].path[0], request);
  }
  
  // result.data 已验证
}
```

---

#### 6. **缓存失效策略**

**问题**: `CacheInvalidator.invalidateTasks()` 在每次写入后调用，可能导致缓存抖动

**位置**: `tasks/route.ts`

**建议**: 
- 实现更精细的缓存失效 (只失效相关数据)
- 考虑使用 Redis 或其他分布式缓存

---

#### 7. **日志记录 - 敏感信息**

**问题**: 某些日志可能记录敏感信息

**位置**: `auth.ts` - Token 验证错误日志

**当前**: 已处理 (只记录 message，不记录 error 对象)

**建议**: 添加日志脱敏中间件
```typescript
function sanitizeLogData(data: unknown): unknown {
  // 移除 token, password, email 等敏感字段
}
```

---

### 低优先级

#### 8. **API 响应格式不一致**

**问题**: 部分返回 `{ success: true, data: ... }`，部分直接返回数据

**示例**:
```typescript
// tasks/route.ts - 包装格式
return successResponse(tasks); // { success: true, data: [...] }

// comments/route.ts - 不一致
return success({ comments, total }, request); // { success: true, data: { comments, total } }

// projects/route.ts
return successResponse(filteredProjects); // 直接数组
```

**建议**: 统一为包装格式
```typescript
// 标准
{ success: true, data: T, timestamp: string, requestId?: string }

// 分页
{ success: true, data: { items: T[], pagination: {...} }, ... }
```

---

#### 9. **缺少请求 ID 追踪**

**问题**: 部分路由未设置 `X-Request-Id` 响应头

**建议**: 在所有 API 响应中添加请求 ID
```typescript
response.headers.set('X-Request-Id', requestId);
```

---

#### 10. **错误代码不一致**

**问题**: 使用多种错误代码格式

```typescript
// 方式 1: lib/errors
ErrorCodes.VALIDATION_ERROR // 'VALIDATION_ERROR'

// 方式 2: api-error
'CSRF_MISSING', 'CSRF_MISMATCH'

// 方式 3: 直接字符串
{ error: 'Task not found' }
```

**建议**: 统一使用 `ErrorCodes` 枚举

---

## 🔧 可复用代码模式

### 1. **认证 + CSRF 组合模式**

```typescript
// 通用模式
export async function POST(request: NextRequest) {
  // 1. CSRF 检查
  const csrfResult = await csrfMiddleware(request);
  if (csrfResult) return csrfResult;

  // 2. 认证检查
  const token = extractToken(request);
  if (!token) return authError('Authentication required', request);
  
  const payload = await verifyToken(token);
  if (!payload) return authError('Invalid token', request);

  // 3. 业务逻辑
  // ...
}
```

### 2. **分页查询模式**

```typescript
// 统一分页参数解析
const page = parseInt(searchParams.get('page') || '1', 10);
const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

// 统一分页响应
return successResponse({
  data: result.data,
  pagination: {
    page,
    limit,
    total: result.total,
    totalPages: Math.ceil(result.total / limit),
  },
});
```

### 3. **审计日志模式**

```typescript
apiLogger.audit('Action performed', {
  action: 'TASK_CREATED',
  userId: payload.sub,
  userRole: payload.role,
  resourceId: newTask.id,
  timestamp: new Date().toISOString(),
});
```

### 4. **缓存控制模式**

```typescript
// GET 请求 - 可缓存
response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

// POST/PUT/DELETE - 不缓存
response.headers.set('Cache-Control', 'no-store');
```

---

## 📋 TODO 列表

### 高优先级 (本周完成)

- [ ] **创建统一认证装饰器** (`withAuth`, `requireAdmin`)
- [ ] **修复 Tasks Assign API mock 数据** - 使用真实 taskStore
- [ ] **重构 Comments API** - 迁移到 IndexedStore 或数据库
- [ ] **统一输入验证** - 所有 API 使用 Zod

### 中优先级 (本月完成)

- [ ] **统一 API 响应格式** - 所有返回 `{ success, data, timestamp }`
- [ ] **添加请求 ID 追踪** - 所有 API 设置 `X-Request-Id`
- [ ] **优化缓存失效策略** - 精细化失效而非全局清除
- [ ] **创建 API 文档** - OpenAPI/Swagger 规范
- [ ] **添加 API 速率限制** - 防止滥用

### 低优先级 (后续迭代)

- [ ] **日志脱敏中间件** - 自动移除敏感信息
- [ ] **统一错误代码** - 全部使用 ErrorCodes 枚举
- [ ] **API 版本控制** - 支持 `/api/v1/`, `/api/v2/`
- [ ] **健康检查增强** - 添加依赖服务检查
- [ ] **性能监控** - 集成 APM (如 Sentry Performance)

---

## 🎯 代码质量指标

### 安全性: 8/10
- ✅ CSRF 保护
- ✅ JWT 认证
- ✅ 密码强度验证
- ⚠️ 部分路由缺少速率限制
- ⚠️ Comments API 无认证

### 可维护性: 8/10
- ✅ 模块化结构
- ✅ 类型定义
- ⚠️ 部分重复代码
- ⚠️ 认证逻辑分散

### 性能: 8.5/10
- ✅ 索引优化
- ✅ 缓存支持
- ⚠️ Comments API 同步 I/O

### 错误处理: 8/10
- ✅ 统一错误格式
- ✅ 用户友好消息
- ⚠️ 部分路由不一致

### 文档: 7/10
- ✅ JSDoc 注释
- ✅ API 说明
- ⚠️ 缺少 OpenAPI 规范

---

## 📈 建议的重构顺序

1. **第一阶段**: 创建认证装饰器 + 统一错误处理
2. **第二阶段**: 重构 Comments API
3. **第三阶段**: 统一输入验证 (Zod)
4. **第四阶段**: 统一响应格式
5. **第五阶段**: 添加 API 文档

---

## 🔍 测试建议

### 单元测试
- [ ] 所有错误处理路径
- [ ] 认证/授权逻辑
- [ ] 输入验证
- [ ] 分页逻辑

### 集成测试
- [ ] 完整的请求-响应流程
- [ ] CSRF Token 流程
- [ ] Token 刷新流程
- [ ] 并发请求处理

### E2E 测试
- [ ] 用户登录 → 操作 → 登出
- [ ] 错误场景处理
- [ ] 权限控制

---

## 总结

7zi 项目的 API 整体设计良好，代码质量较高。主要优势在于：
1. 完善的认证与安全机制
2. 统一的错误处理系统
3. 良好的性能优化 (索引、缓存)

主要改进方向：
1. 减少重复代码 (认证装饰器)
2. 统一验证和响应格式
3. 修复 Comments API 和 Assign API 的 mock 数据

建议按照 TODO 列表的优先级逐步改进，预计 2-3 周可完成高优先级任务。

---

**审查人**: AI Code Reviewer  
**日期**: 2026-03-15  
**版本**: 1.0
