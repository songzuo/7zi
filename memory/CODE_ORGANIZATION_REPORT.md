# 7zi-frontend 代码组织优化报告

**分析日期**: 2026-03-30
**分析师**: 📚 咨询师 + 🏗️ 架构师
**项目**: 7zi-frontend
**代码行数**: ~31,410 行 (src/lib)

---

## 一、当前结构分析

### 1.1 目录结构概览

```
src/
├── app/              # Next.js App Router (16+ 子目录)
│   └── api/          # API 路由 (12+ 端点)
│       ├── a2a/
│       ├── auth/
│       ├── data/
│       ├── feedback/
│       ├── health/
│       ├── mcp/
│       ├── notifications/
│       ├── projects/
│       ├── search/
│       └── users/
├── components/       # React 组件
│   ├── ui/
│   ├── feedback/
│   ├── notifications/
│   ├── performance/
│   ├── rooms/
│   ├── seo/
│   ├── websocket/
│   └── knowledge-lattice/
├── features/         # 功能模块 (5 个)
│   ├── websocket/
│   ├── rate-limit/
│   ├── mcp/
│   ├── monitoring/
│   └── auth/
├── hooks/           # 自定义 Hook
├── lib/             # 工具库 (19 个子目录, ~97 个文件)
│   ├── api/
│   ├── auth/
│   ├── audit/
│   ├── db/
│   ├── i18n/
│   ├── mcp/
│   ├── performance/
│   ├── performance-monitoring/
│   ├── rate-limit/
│   ├── security/
│   ├── seo/
│   ├── services/
│   ├── tools/
│   ├── utils/
│   ├── websocket-manager.ts
│   ├── errors.ts
│   ├── logger.ts
│   └── validation*.ts
├── locales/         # 国际化 (4 个语言)
├── middleware/      # 中间件
├── shared/          # 共享代码
├── stores/          # Zustand 状态管理 (6 个 store)
│   ├── app-store.ts
│   ├── auth-store.ts
│   ├── notification-store.ts
│   ├── room-store.ts
│   └── websocket-store.ts
├── stories/         # Storybook
├── styles/          # 样式
├── test/            # 测试工具
└── types/           # TypeScript 类型
```

### 1.2 代码规模统计

| 模块 | 文件数 | 估算行数 | 说明 |
|------|--------|----------|------|
| src/lib | 97 | ~31,410 | 工具库（已统计） |
| src/components | 40+ | ~8,000+ | 组件 |
| src/stores | 6 | ~3,500 | 状态管理 |
| src/features | 30+ | ~5,000+ | 功能模块 |
| src/app/api | 30+ | ~4,000+ | API 路由 |
| **总计** | **200+** | **~52,000+** | 不包括测试 |

---

## 二、问题清单（按优先级）

### 🔴 P0 - 高优先级（立即处理）

#### 问题 1.1: 错误处理逻辑重复

**位置**:
- `src/lib/errors.ts` (470+ 行)
- `src/lib/api/error-handler.ts` (370+ 行)

**问题描述**:
- 两个文件都定义了错误类型、错误工厂函数、错误响应格式
- `AppError` 类和 `ApiError` 类功能完全重叠
- `ErrorCode` 枚举和 `ErrorType` 枚举定义重复
- 错误处理工厂函数在两处都有定义

**影响**:
- 代码冗余：维护两套相同的逻辑
- 不一致风险：可能导致 API 响应格式不统一
- 开发效率低：开发者需要知道应该使用哪个

**示例重复代码**:

```typescript
// src/lib/errors.ts
export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  // ...
}

export function createBadRequestError(
  message: string = 'Bad Request',
  details?: Record<string, unknown>
): AppError {
  return new AppError({
    code: ErrorCode.BAD_REQUEST,
    message,
    details,
  });
}

// src/lib/api/error-handler.ts
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  // ...
}

export function createBadRequestError(
  message: string = 'Bad request',
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const error = new ApiError(ErrorType.BAD_REQUEST, message, 400, details);
  return createErrorResponse(error);
}
```

---

#### 问题 1.2: 验证逻辑分散

**位置**:
- `src/lib/validation.ts` (200+ 行)
- `src/lib/validation-schemas.ts` (400+ 行)

**问题描述**:
- `validation.ts` 提供通用验证函数（如 `isValidEmail`, `isValidUrl`）
- `validation-schemas.ts` 使用 Zod 定义 schema 并提供 sanitize 函数
- `sanitizeHtml` 函数在两个文件中都有定义
- 验证和清理逻辑未统一

**影响**:
- 开发者困惑：不知道应该使用哪个验证方式
- 不一致风险：sanitize 实现可能不同
- 维护成本高：修改需要同步两处

**示例重复代码**:

```typescript
// src/lib/validation.ts
export function sanitizeHtml(html: string): string {
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}

// src/lib/validation-schemas.ts
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}
```

---

#### 问题 1.3: 组件组织混乱

**位置**:
- `src/components/` 根目录
- 子目录: `ui/`, `feedback/`, `notifications/`, `performance/`, `rooms/`, `seo/`, `websocket/`, `knowledge-lattice/`

**问题描述**:
- 大型组件直接放在根目录：`EnhancedPerformanceDashboard.tsx`, `ErrorBoundary.tsx`, `PerformanceDashboard.tsx`
- 缺少清晰的分类标准
- 性能相关组件分散在 `components/performance/` 和 `components/` 根目录

**影响**:
- 可读性差：组件职责不清晰
- 重用困难：难以找到需要的组件
- 维护困难：大型组件在根目录难以管理

**根目录组件列表**:
```
src/components/
├── EnhancedPerformanceDashboard.tsx (21772 字节)
├── ErrorBoundary.tsx (6676 字节)
├── OptimizedImage.tsx (7200 字节)
├── PerformanceDashboard.tsx (12399 字节)
├── SimplePerformanceDashboard.tsx (8184 字节)
└── websocket-stability-demo.tsx (10906 字节)
```

---

#### 问题 1.4: API 路由设计不一致

**位置**:
- `src/app/api/feedback/route.ts`
- `src/app/api/users/route.ts`

**问题描述**:
- `/api/feedback/route.ts` 直接在文件中定义多个方法处理函数
- `/api/users/route.ts` 使用类+装饰器模式
- 错误处理方式不一致
- 认证装饰器使用方式不同

**影响**:
- 开发体验差：开发者需要知道使用哪种模式
- 维护困难：不同路由有不同的模式
- 测试困难：需要针对不同模式编写测试

**示例对比**:

```typescript
// src/app/api/feedback/route.ts - 直接函数模式
export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
export const PATCH = withAdmin(handlePATCH);
export const DELETE = withAdmin(handleDELETE);

// src/app/api/users/route.ts - 类+装饰器模式
class UserController {
  @RequirePermission(ResourceType.USER, ActionType.LIST)
  async listUsers(ctx: ApiContext): Promise<NextResponse> { ... }
}
```

---

#### 问题 1.5: 功能模块重复

**位置**:
- `src/lib/websocket-manager.ts` (18555 字节)
- `src/features/websocket/` (15+ 文件)

**问题描述**:
- WebSocket 功能在两个位置重复实现
- `src/lib/services/notification.ts` 和 `src/components/notifications/` 都有通知相关代码
- 职责不清晰

**影响**:
- 代码冗余：相同功能在多处
- 不一致风险：不同实现可能有不同行为
- 维护困难：修改需要同步多处

---

### 🟡 P1 - 中优先级（计划处理）

#### 问题 2.1: 服务层职责不清晰

**位置**:
- `src/lib/services/` (5 个服务文件)

**问题描述**:
- 服务定义的边界不清晰
- 有些服务是数据访问层，有些是业务逻辑层
- 缺少统一的服务接口定义

**影响**:
- 代码理解困难：不知道服务的职责
- 测试困难：缺少清晰的依赖注入
- 重构困难：服务耦合严重

---

#### 问题 2.2: 中间件组织混乱

**位置**:
- `src/middleware.ts` (8378 字节)
- `src/middleware.i18n.ts` (2362 字节)

**问题描述**:
- 两个中间件文件，职责不清
- 可能存在功能重叠

**影响**:
- 维护困难：不知道应该修改哪个文件
- 功能重叠风险

---

#### 问题 2.3: 共享代码目录不规范

**位置**:
- `src/shared/` 目录

**问题描述**:
- `src/shared/` 目录存在但使用不规范
- 一些通用工具放在 `src/lib/utils/`
- 缺少清晰的共享代码组织规则

**影响**:
- 代码查找困难：不知道应该放在哪里
- 重复风险：可能在不同位置定义相同的工具

---

#### 问题 2.4: 测试文件分散

**位置**:
- `__tests__/` 目录分散在各模块中
- 一些测试文件与代码文件并列

**问题描述**:
- 测试文件组织不统一
- 缺少统一的测试配置

**影响**:
- 测试查找困难
- 运行测试困难

---

#### 问题 2.5: 性能监控代码重复

**位置**:
- `src/lib/performance/`
- `src/lib/performance-monitoring/` (7 个子目录)

**问题描述**:
- 两个目录都包含性能监控相关代码
- 职责不清晰

**影响**:
- 代码冗余
- 维护困难

---

### 🟢 P2 - 低优先级（优化处理）

#### 问题 3.1: 命名不一致

**位置**:
- `src/lib/logger.ts` (单数)
- `src/lib/utils/` (复数)

**问题描述**:
- 命名风格不一致

**影响**:
- 轻微影响代码可读性

---

## 三、优化建议

### 🔴 P0 优化方案

#### 优化 1.1: 统一错误处理

**目标**: 消除错误处理重复，统一 API 错误响应

**方案**:
1. 保留 `src/lib/errors.ts` 作为核心错误定义
2. 将 `src/lib/api/error-handler.ts` 迁移为使用 `src/lib/errors.ts`
3. 删除重复定义

**具体步骤**:

**步骤 1**: 更新 `src/lib/errors.ts`，添加 API 响应格式

```typescript
// src/lib/errors.ts

// 保留现有定义...

// 添加 API 响应相关类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
  timestamp: string;
}

// 添加 NextResponse 辅助函数
import { NextResponse } from 'next/server';

export function createApiResponse<T = unknown>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function createApiErrorResponse(
  error: AppError,
  status?: number
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp,
      },
      timestamp: new Date().toISOString(),
    },
    { status: status || error.statusCode }
  );
}
```

**步骤 2**: 创建 `src/lib/api/route-helpers.ts`

```typescript
// src/lib/api/route-helpers.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  createBadRequestError,
  createUnauthorizedError,
  createForbiddenError,
  createNotFoundError,
  createApiErrorResponse,
  createApiResponse,
  AppError,
} from '../errors';
import { logger } from '../logger';

/**
 * 统一的 API 路由错误处理
 */
export async function handleApiRoute(
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof AppError) {
      logger.error(`API Error [${error.code}]: ${error.message}`, error);
      return createApiErrorResponse(error);
    }

    logger.error('Unexpected API Error', error instanceof Error ? error : undefined);

    const appError = createInternalError(
      error instanceof Error ? error.message : 'Unknown error',
      error instanceof Error ? error : undefined
    );

    return createApiErrorResponse(appError);
  }
}

/**
 * 认证装饰器
 */
export function withAuth<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    // 从 request 中解析用户信息
    const user = await getUserFromRequest(request);

    if (!user) {
      return createApiErrorResponse(createUnauthorizedError());
    }

    // 将 user 信息附加到 request
    (request as any).user = user;

    return await handler(request, ...args);
  }) as unknown as T;
}

/**
 * 管理员认证装饰器
 */
export function withAdmin<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    const user = (request as any).user;

    if (!user || user.role !== 'admin') {
      return createApiErrorResponse(createForbiddenError());
    }

    return await handler(request, ...args);
  }) as unknown as T;
}

/**
 * 从 request 中获取用户信息（示例）
 */
async function getUserFromRequest(request: NextRequest): Promise<any> {
  // 实际实现应该从 JWT 或 session 中解析
  const token = request.headers.get('authorization');

  if (!token) {
    return null;
  }

  // 解析 token 并返回用户信息
  // ...
  return null;
}
```

**步骤 3**: 迁移现有 API 路由

```typescript
// src/app/api/feedback/route.ts (更新后)

import { NextRequest } from 'next/server';
import { feedbackStorage } from '@/lib/db/feedback-storage';
import { handleApiRoute, withAuth, withAdmin, createApiErrorResponse, createApiResponse } from '@/lib/api/route-helpers';
import { validateAndSanitizeBody, sanitizeHtml } from '@/lib/validation-schemas';
import { z } from 'zod';
import { createValidationError } from '@/lib/errors';

/**
 * GET /api/feedback
 */
export const GET = handleApiRoute(
  withAuth(async (request: NextRequest) => {
    const { user } = request as any;

    // 业务逻辑...
    return createApiResponse(data);
  })
);

/**
 * POST /api/feedback
 */
export const POST = handleApiRoute(
  withAuth(async (request: NextRequest) => {
    const { user } = request as any;
    const body = await request.json();

    // 验证
    const result = await validateAndSanitizeBody(body, feedbackSubmissionSchema, 'html');
    if (!result.success) {
      return createApiErrorResponse(createValidationError('Validation failed'));
    }

    // 业务逻辑...
    return createApiResponse(data, 201);
  })
);

/**
 * PATCH /api/feedback
 */
export const PATCH = handleApiRoute(
  withAdmin(async (request: NextRequest) => {
    // 业务逻辑...
    return createApiResponse(data);
  })
);

/**
 * DELETE /api/feedback
 */
export const DELETE = handleApiRoute(
  withAdmin(async (request: NextRequest) => {
    // 业务逻辑...
    return createApiResponse(data);
  })
);
```

**步骤 4**: 删除 `src/lib/api/error-handler.ts`

```bash
rm src/lib/api/error-handler.ts
```

**影响范围**:
- 需要更新所有使用 `error-handler.ts` 的 API 路由
- 预计影响 12+ 个 API 端点

---

#### 优化 1.2: 统一验证和清理逻辑

**目标**: 统一验证和清理逻辑，消除重复

**方案**:
1. 保留 `src/lib/validation-schemas.ts` 作为主要验证库
2. 将 `src/lib/validation.ts` 中的通用验证函数迁移到 `src/lib/validation-schemas.ts`
3. 统一 sanitize 函数实现
4. 删除 `src/lib/validation.ts`

**具体步骤**:

**步骤 1**: 更新 `src/lib/validation-schemas.ts`

```typescript
// src/lib/validation-schemas.ts (更新后)

import { z } from 'zod';

// ==================== Zod Schemas ====================

// ... 保留现有的所有 schema ...

// ==================== 通用验证函数 ====================

/**
 * 验证电子邮件地址
 */
export function isValidEmail(email: string): boolean {
  return emailString.safeParse(email).success;
}

/**
 * 验证 URL
 */
export function isValidUrl(url: string): boolean {
  return urlSchema.safeParse(url).success;
}

/**
 * 验证手机号码（中国大陆）
 */
export function isValidPhoneNumber(phone: string): boolean {
  return phoneNumberSchema.safeParse(phone).success;
}

/**
 * 验证密码强度
 */
export function isStrongPassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

/**
 * 验证用户名
 */
export function isValidUsername(username: string): boolean {
  return usernameSchema.safeParse(username).success;
}

/**
 * 验证 UUID
 */
export function isValidUuid(uuid: string): boolean {
  return uuidSchema.safeParse(uuid).success;
}

/**
 * 验证 IPv4 地址
 */
export function isValidIPv4(ip: string): boolean {
  return ipv4Schema.safeParse(ip).success;
}

/**
 * 验证 JSON 字符串
 */
export function isValidJson(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

// ==================== 安全清理函数 ====================

/**
 * 防止 XSS：清理 HTML 内容
 * 使用 DOMParser 进行更安全的清理
 */
export function sanitizeHtml(input: string): string {
  // 移除危险的 HTML 标签和属性
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * 防止 SQL 注入：清理字符串
 */
export function sanitizeSqlString(input: string): string {
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .trim();
}

/**
 * 防止 NoSQL 注入：清理字符串
 */
export function sanitizeNoSqlString(input: string): string {
  return input
    .replace(/\$\w+/g, '')
    .replace(/['";\\]/g, '')
    .trim();
}

/**
 * 防止命令注入：清理字符串
 */
export function sanitizeCommandString(input: string): string {
  return input
    .replace(/[;&|`$()]/g, '')
    .replace(/\$\([^)]*\)/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\$\{[^}]*\}/g, '')
    .trim();
}

/**
 * 通用清理函数
 */
export function sanitizeInput(
  input: unknown,
  type: 'sql' | 'nosql' | 'html' | 'command' | 'general' = 'general'
): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  switch (type) {
    case 'sql':
      return sanitizeSqlString(input);
    case 'nosql':
      return sanitizeNoSqlString(input);
    case 'html':
      return sanitizeHtml(input);
    case 'command':
      return sanitizeCommandString(input);
    case 'general':
    default:
      return input.trim();
  }
}

/**
 * 批量清理对象
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  type: 'sql' | 'nosql' | 'html' | 'command' | 'general' = 'general'
): T {
  const result = { ...obj };

  for (const key in result) {
    if (result[key] !== null && typeof result[key] === 'string') {
      result[key] = sanitizeInput(result[key], type) as T[Extract<keyof T, string>];
    }
  }

  return result;
}
```

**步骤 2**: 创建 `src/lib/validation/index.ts` 统一导出

```typescript
// src/lib/validation/index.ts

export * from '../validation-schemas';
export {
  isValidEmail,
  isValidUrl,
  isValidPhoneNumber,
  isStrongPassword,
  isValidUsername,
  isValidUuid,
  isValidIPv4,
  isValidJson,
  sanitizeHtml,
  sanitizeSqlString,
  sanitizeNoSqlString,
  sanitizeCommandString,
  sanitizeInput,
  sanitizeObject,
} from '../validation-schemas';
```

**步骤 3**: 更新所有引用

```bash
# 查找所有引用 validation.ts 的文件
grep -r "from '@/lib/validation'" src/

# 查找所有引用 validation-schemas.ts 的文件
grep -r "from '@/lib/validation-schemas'" src/

# 批量替换引用
# 从 '@/lib/validation' 改为 '@/lib/validation'
# 从 '@/lib/validation-schemas' 改为 '@/lib/validation'
```

**步骤 4**: 删除 `src/lib/validation.ts`

```bash
rm src/lib/validation.ts
```

**影响范围**:
- 需要更新所有引用 validation.ts 的文件
- 需要更新所有引用 validation-schemas.ts 的文件
- 预计影响 20+ 个文件

---

#### 优化 1.3: 重新组织组件结构

**目标**: 清晰的组件分类，提高可维护性

**方案**:
1. 将大型复杂组件移到专门的目录
2. 创建清晰的分类
3. 统一导出方式

**具体步骤**:

**步骤 1**: 创建新的组件结构

```
src/components/
├── layout/              # 布局组件
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── index.ts
├── feedback/            # 反馈相关
│   ├── FeedbackModal.tsx
│   ├── FeedbackAdminPanel.tsx
│   ├── EnhancedFeedbackModal.tsx
│   └── index.ts
├── notifications/       # 通知相关
│   ├── NotificationProvider.tsx
│   ├── NotificationToaster.tsx
│   ├── NotificationCenter.tsx
│   ├── NotificationToast.tsx
│   └── index.ts
├── performance/         # 性能监控组件
│   ├── PerformanceDashboard.tsx
│   ├── EnhancedPerformanceDashboard.tsx
│   ├── SimplePerformanceDashboard.tsx
│   └── index.ts
├── websocket/           # WebSocket 相关
│   ├── WebSocketStatusPanel.tsx
│   └── index.ts
├── rooms/               # 房间相关
│   ├── RoomList.tsx
│   ├── RoomDetail.tsx
│   ├── RoomStatusIndicator.tsx
│   ├── RoomInvite.tsx
│   └── index.ts
├── ui/                  # 通用 UI 组件
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Card.tsx
│   ├── Skeleton.tsx
│   ├── TaskCard.tsx
│   ├── ThemeSwitcher.tsx
│   ├── NavigationSkeleton.tsx
│   ├── EmptyState.tsx
│   ├── Loading.tsx
│   ├── LazyImage.tsx
│   └── index.ts
├── seo/                 # SEO 相关
│   ├── JsonLd.tsx
│   └── index.ts
├── knowledge-lattice/   # 知识图谱
│   ├── KnowledgeLattice3D.tsx
│   └── index.ts
├── error/               # 错误处理组件
│   ├── ErrorBoundary.tsx
│   └── index.ts
├── image/               # 图片相关
│   ├── OptimizedImage.tsx
│   └── index.ts
└── index.ts             # 统一导出
```

**步骤 2**: 移动文件

```bash
# 移动性能组件
mkdir -p src/components/performance
mv src/components/PerformanceDashboard.tsx src/components/performance/
mv src/components/EnhancedPerformanceDashboard.tsx src/components/performance/
mv src/components/SimplePerformanceDashboard.tsx src/components/performance/

# 移动错误处理组件
mkdir -p src/components/error
mv src/components/ErrorBoundary.tsx src/components/error/

# 移动图片组件
mkdir -p src/components/image
mv src/components/OptimizedImage.tsx src/components/image/
mv src/components/ui/LazyImage.tsx src/components/image/

# 创建 index.ts 文件
for dir in src/components/*/; do
  cat > "${dir}index.ts" << 'EOF'
export * from './';
EOF
done
```

**步骤 3**: 更新导入语句

```bash
# 更新所有导入
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  "s|from '@/components/PerformanceDashboard'|from '@/components/performance'|g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  "s|from '@/components/ErrorBoundary'|from '@/components/error'|g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  "s|from '@/components/OptimizedImage'|from '@/components/image'|g"
```

**步骤 4**: 创建统一的 index.ts

```typescript
// src/components/index.ts

// UI 组件
export * from './ui';

// 功能组件
export * from './feedback';
export * from './notifications';
export * from './performance';
export * from './websocket';
export * from './rooms';

// SEO 组件
export * from './seo';

// 其他
export * from './error';
export * from './image';
export * from './knowledge-lattice';
```

**影响范围**:
- 需要更新所有导入语句
- 预计影响 50+ 个文件

---

#### 优化 1.4: 统一 API 路由模式

**目标**: 统一 API 路由设计模式，提高开发体验

**方案**:
1. 选择函数模式作为主要模式（更简单，更适合 Next.js）
2. 提供统一的路由辅助函数
3. 更新现有路由使用统一模式

**具体步骤**:

**步骤 1**: 创建统一的路由模板

```typescript
// src/lib/api/route-template.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleApiRoute, withAuth, withAdmin, createApiErrorResponse, createApiResponse } from './route-helpers';
import { createValidationError } from '../errors';

/**
 * API 路由模板
 *
 * 使用说明：
 * 1. 定义 schema
 * 2. 实现处理函数
 * 3. 导出 HTTP 方法
 */

// 示例：POST 路由
export const POST = handleApiRoute(
  withAuth(async (request: NextRequest) => {
    const { user } = request as any;

    // 解析请求体
    const body = await request.json();

    // 验证输入
    const result = await validateAndSanitizeBody(body, yourSchema);
    if (!result.success) {
      return createApiErrorResponse(createValidationError('Validation failed'));
    }

    // 业务逻辑
    try {
      const data = await yourBusinessLogic(result.data, user);
      return createApiResponse(data, 201);
    } catch (error) {
      throw error; // 由 handleApiRoute 处理
    }
  })
);

// 示例：GET 路由
export const GET = handleApiRoute(
  withAuth(async (request: NextRequest) => {
    const { user } = request as any;

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 业务逻辑
    const data = await yourGetDataLogic(page, limit, user);
    return createApiResponse(data);
  })
);

// 示例：需要管理员权限的路由
export const PATCH = handleApiRoute(
  withAdmin(async (request: NextRequest) => {
    const { user } = request as any;

    const body = await request.json();

    // 业务逻辑
    const data = await yourUpdateLogic(body, user);
    return createApiResponse(data);
  })
);
```

**步骤 2**: 迁移 `/api/users/route.ts`

```typescript
// src/app/api/users/route.ts (迁移后)

import { NextRequest } from 'next/server';
import { handleApiRoute, withAuth, withAdmin, createApiErrorResponse, createApiResponse } from '@/lib/api/route-helpers';
import { createNotFoundError, createForbiddenError, createUnauthorizedError } from '@/lib/errors';
import { users } from './users-data'; // 假设有一个数据文件

/**
 * GET /api/users - 列出所有用户
 * 需要权限: user:list
 */
export const GET = handleApiRoute(
  withAuth(async (request: NextRequest) => {
    const { user } = request as any;

    // 检查权限
    if (!hasPermission(user, 'user:list')) {
      throw createForbiddenError('需要 user:list 权限');
    }

    const userList = Object.values(users).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      roles: u.roles.map(r => r.name),
    }));

    return createApiResponse(userList);
  })
);

/**
 * POST /api/users - 创建新用户
 * 需要权限: user:create
 */
export const POST = handleApiRoute(
  withAuth(async (request: NextRequest) => {
    const { user } = request as any;

    // 检查权限
    if (!hasPermission(user, 'user:create')) {
      throw createForbiddenError('需要 user:create 权限');
    }

    const body = await request.json();

    // 验证输入
    if (!body.username || !body.email) {
      throw createValidationError('用户名和邮箱不能为空');
    }

    // 创建用户
    const newUser = {
      id: `user-${Date.now()}`,
      username: body.username,
      email: body.email,
      createdAt: new Date(),
    };

    return createApiResponse(newUser,  }));
});

/**
 * 辅助函数：检查权限
 */
function hasPermission(user: any, permission: string): boolean {
  return user.permissions?.includes(permission) || user.role === 'admin';
}
```

**步骤 3**: 更新权限检查方式

将装饰器模式改为函数式权限检查：

```typescript
// 旧方式（装饰器）
@RequirePermission(ResourceType.USER, ActionType.LIST)
async listUsers(ctx: ApiContext): Promise<NextResponse> { ... }

// 新方式（函数式）
export const GET = handleApiRoute(
  withAuth(async (request: NextRequest) => {
    const { user } = request as any;
    
    if (!hasPermission(user, 'user:list')) {
      throw createForbiddenError('需要 user:list 权限');
    }
    
    // 业务逻辑...
  })
);
```

**影响范围**:
- 需要迁移 `/api/users/route.ts`
- 预计影响 2 个 API 端点

---

#### 优化 1.5: 整合功能模块

**目标**: 消除功能模块重复，清晰划分职责

**方案**:
1. 将 `src/lib/websocket-manager.ts` 迁移到 `src/features/websocket/`
2. 将 `src/lib/services/notification.ts` 迁移到 `src/features/notifications/`
3. 清理 `src/lib/services/`

**具体步骤**:

**步骤 1**: 整合 WebSocket 功能

```bash
# 迁移 WebSocket Manager
mkdir -p src/features/websocket/lib
mv src/lib/websocket-manager.ts src/features/websocket/lib/
mv src/lib/socket.ts src/features/websocket/lib/

# 更新导入
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from '@/lib/websocket-manager'|from '@/features/websocket'|g"
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from '@/lib/socket'|from '@/features/websocket'|g"
```

**步骤 2**: 创建通知功能模块

```bash
# 创建通知模块
mkdir -p src/features/notifications/lib
mv src/lib/services/notification*.ts src/features/notifications/lib/
mv src/lib/services/email.ts src/features/notifications/lib/

# 更新导入
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from '@/lib/services/notification'|from '@/features/notifications'|g"
```

**步骤 3**: 更新 `src/features/websocket/index.ts`

```typescript
// src/features/websocket/index.ts

// WebSocket Manager
export { WebSocketManager } from './lib/websocket-manager';
export type { WebSocketMessage, ConnectionStatus } from './lib/websocket-manager';

// Socket
export { socket } from './lib/socket';

// Room Management
export { RoomManager } from './room/room-manager';
export { PermissionManager } from './room/permission-manager';

// Components
export { WebSocketStatusPanel } from './components/WebSocketStatusPanel';

// Hooks
export { useWebSocketStatus } from './hooks/useWebSocketStatus';
```

**步骤 4**: 清理 `src/lib/services/`

```bash
# 检查是否还有文件
ls src/lib/services/

# 如果只有 __tests__ 目录，删除
rm -rf src/lib/services/
```

**影响范围**:
- 需要更新所有 WebSocket 相关导入
- 需要更新所有通知服务相关导入
- 预计影响 30+ 个文件

---

### 🟡 P1 优化方案

#### 优化 2.1: 清晰定义服务层职责

**目标**: 清晰定义服务层的职责和边界

**方案**:
1. 定义服务层接口规范
2. 区分数据访问层和业务逻辑层
3. 创建统一的服务基类

**建议的服务结构**:

```
src/services/
├── base/
│   ├── BaseService.ts          # 服务基类
│   ├── Repository.ts           # 数据访问基类
│   └── index.ts
├── feedback/
│   ├── FeedbackService.ts      # 业务逻辑
│   ├── FeedbackRepository.ts   # 数据访问
│   └── index.ts
├── user/
│   ├── UserService.ts
│   ├── UserRepository.ts
│   └── index.ts
└── index.ts
```

---

#### 优化 2.2: 整合中间件

**目标**: 统一中间件组织

**方案**:
1. 合并 `src/middleware.ts` 和 `src/middleware.i18n.ts`
2. 创建中间件链模式

```typescript
// src/middleware.ts (整合后)

import { NextRequest, NextResponse } from 'next/server';
import { i18nMiddleware } from './middleware/i18n';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rate-limit';

export async function middleware(request: NextRequest) {
  // 中间件链
  const middlewares = [
    i18nMiddleware,
    authMiddleware,
    rateLimitMiddleware,
  ];

  let response: NextResponse | null = null;

  for (const mw of middlewares) {
    response = await mw(request);
    if (response) {
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 排除静态资源
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

#### 优化 2.3: 规范共享代码目录

**目标**: 清晰定义 `src/shared/` 的用途

**方案**:
1. 定义共享代码的类型
2. 创建明确的目录结构

```
src/shared/
├── constants/        # 常量
│   ├── app.ts
│   ├── routes.ts
│   └── index.ts
├── types/            # 共享类型
│   ├── common.ts
│   ├── api.ts
│   └── index.ts
├── utils/            # 共享工具
│   ├── format.ts
│   ├── date.ts
│   └── index.ts
└── index.ts
```

---

#### 优化 2.4: 统一测试文件组织

**目标**: 统一测试文件组织

**方案**:
1. 选择一种测试文件组织方式
2. 创建测试配置

建议使用 `__tests__/` 目录方式：

```
src/
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx
├── lib/
│   ├── validation.ts
│   └── __tests__/
│       └── validation.test.ts
└── __tests__/
    ├── setup.ts
    └── helpers.ts
```

---

#### 优化 2.5: 整合性能监控代码

**目标**: 消除性能监控重复

**方案**:
1. 合并 `src/lib/performance/` 和 `src/lib/performance-monitoring/`
2. 创建清晰的功能划分

```
src/lib/performance/
├── core/
│   ├── monitor.ts
│   ├── metrics.ts
│   └── types.ts
├── anomaly-detection/
│   ├── algorithms/
│   └── detector.ts
├── alerting/
│   ├── alert-manager.ts
│   └── channels/
├── root-cause-analysis/
│   └── analyzer.ts
├── budget-control/
│   └── budget.ts
└── index.ts
```

---

### 🟢 P2 优化方案

#### 优化 3.1: 统一命名风格

**目标**: 统一代码命名风格

**方案**:
1. 制定命名规范文档
2. 使用 ESLint 规则强制执行

建议的命名规范：
- 文件名：kebab-case (例如：`error-handler.ts`)
- 组件名：PascalCase (例如：`ErrorBoundary.tsx`)
- 函数名：camelCase (例如：`createUser()`)
- 常量：UPPER_SNAKE_CASE (例如：`MAX_RETRY_COUNT`)
- 类名：PascalCase (例如：`UserService`)

---

## 四、实施计划

### 4.1 阶段一：P0 高优先级（预计 2-3 天）

| 任务 | 预计时间 | 风险 |
|------|----------|------|
| 统一错误处理 | 4 小时 | 中 - 需要更新多个 API |
| 统一验证逻辑 | 4 小时 | 低 |
| 重新组织组件 | 6 小时 | 中 - 需要更新导入 |
| 统一 API 路由模式 | 4 小时 | 中 - 需要重构 |
| 整合功能模块 | 4 小时 | 中 - 需要更新导入 |

**总计**: 约 22 小时（3 个工作日）

### 4.2 阶段二：P1 中优先级（预计 2 天）

| 任务 | 预计时间 | 风险 |
|------|----------|------|
| 清晰定义服务层 | 4 小时 | 低 |
| 整合中间件 | 2 小时 | 低 |
| 规范共享代码目录 | 2 小时 | 低 |
| 统一测试文件组织 | 4 小时 | 低 |
| 整合性能监控代码 | 4 小时 | 低 |

**总计**: 约 16 小时（2 个工作日）

### 4.3 阶段三：P2 低优先级（预计 0.5 天）

| 任务 | 预计时间 | 风险 |
|------|----------|------|
| 统一命名风格 | 2 小时 | 低 |

**总计**: 约 2 小时（0.5 个工作日）

---

## 五、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| API 路由重构可能破坏现有功能 | 高 | 编写完整的测试用例，逐步迁移 |
| 导入更新可能遗漏 | 中 | 使用 IDE 重构工具，运行测试验证 |
| 组件移动可能影响 Storybook | 低 | 更新 Storybook 配置 |

---

## 六、总结

### 6.1 主要问题

1. **错误处理重复** - 两个文件定义了相同的错误处理逻辑
2. **验证逻辑分散** - 验证和清理逻辑未统一
3. **组件组织混乱** - 大型组件放在根目录
4. **API 路由不一致** - 使用了两种不同的设计模式
5. **功能模块重复** - WebSocket 和通知功能在多处重复

### 6.2 预期收益

1. **减少代码冗余** - 消除重复定义，减少约 10% 的代码量
2. **提高开发效率** - 统一的模式，降低学习成本
3. **降低维护成本** - 清晰的职责划分，更容易定位问题
4. **提高代码质量** - 一致的代码风格，更好的可读性

### 6.3 下一步行动

1. **立即开始**：处理 P0 高优先级问题
2. **创建分支**：为每个优化创建独立的 Git 分支
3. **编写测试**：确保重构不破坏现有功能
4. **逐步迁移**：一次处理一个模块

---

**报告完成时间**: 2026-03-30
**预计总工时**: 40 小时（5 个工作日）
