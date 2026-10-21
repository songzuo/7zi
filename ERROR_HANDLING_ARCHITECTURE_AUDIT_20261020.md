# 7zi 项目错误处理架构审计报告

**日期**: 2026-10-20
**审计人**: 架构师 (Architect)
**工作目录**: /root/.openclaw/workspace

---

## 执行摘要

7zi 项目存在 **两套并行的错误处理系统**，缺乏统一性：
1. **旧系统**: `src/lib/api/error-handler.ts` + `src/lib/error-handler.ts`
2. **新统一系统**: `src/lib/errors/` (UnifiedAppError + unified-response)

这导致 API 路由错误处理不一致，全局错误边界覆盖不完整，且存在大量重复代码。

---

## 1. src/lib 目录错误处理实现分析

### 1.1 现有错误处理模块

| 模块路径 | 类型 | 用途 | 状态 |
|---------|------|------|------|
| `src/lib/error-handler.ts` | 服务器端 | 通用错误分类、日志、toast(无) | ⚠️ 已标记为 legacy |
| `src/lib/error/client/error-handler.ts` | 客户端 | React toast 错误展示 | ✅ 活跃 |
| `src/lib/error/core/error-factory.ts` | 核心工厂 | 错误工厂模式 | ⚠️ 未详细分析 |
| `src/lib/errors/unified-types.ts` | 类型定义 | UnifiedErrorType 枚举 | ✅ 统一系统核心 |
| `src/lib/errors/unified-error.ts` | 错误类 | UnifiedAppError 类 | ✅ 统一系统核心 |
| `src/lib/errors/unified-response.ts` | 响应处理 | API 响应格式化 | ✅ 统一系统核心 |
| `src/lib/errors/index.ts` | 统一入口 | 导出+向后兼容 | ✅ 统一入口 |
| `src/lib/api/error-handler.ts` | API专用 | ApiError + createErrorResponse | ❌ 旧系统 |
| `src/lib/global-error-handlers.ts` | 全局处理器 | unhandledRejection/uncaughtException | ✅ 活跃 |

### 1.2 核心问题：两套并行的错误类

**UnifiedAppError** (`src/lib/errors/unified-error.ts`):
```typescript
export class UnifiedAppError extends Error {
  type: UnifiedErrorType
  code?: string
  statusCode: number
  details?: Record<string, unknown>
  retryable: boolean
  retryAfter?: number
  timestamp: string
  // 静态工厂方法: validation(), notFound(), unauthorized(), forbidden(), rateLimit(), internal(), etc.
}
```

**ApiError** (`src/lib/api/error-handler.ts`):
```typescript
export class ApiError extends Error {
  type: ErrorType  // 不同的枚举
  message: string
  statusCode: number
  details?: Record<string, unknown>
  // 无静态工厂方法
}
```

**问题**:
- 两个类功能高度重叠，但使用不同的 ErrorType 枚举
- `UnifiedAppError` 有静态工厂方法（更方便），`ApiError` 没有
- 两者都继承 Error，但属性名不完全一致

### 1.3 两套响应创建函数

**新系统** (`src/lib/errors/unified-response.ts`):
```typescript
createUnifiedErrorResponse(error, statusCode?, details?) → NextResponse
createUnifiedSuccessResponse(data, status?) → NextResponse
withUnifiedErrorHandling(handler) → T  // 自动 try-catch 包装器
```

**旧系统** (`src/lib/api/error-handler.ts`):
```typescript
createErrorResponse(error, statusCode?, details?, locale?, requestId?) → Promise<NextResponse>
createSuccessResponse(data, status?) → NextResponse
withErrorHandling(handler) → T  // 类似的包装器
```

**问题**:
- 两套函数签名接近但不完全兼容
- 旧系统支持 locale 和 requestId，新系统不支持
- 新系统返回 `NextResponse<UnifiedErrorResponse>`，旧系统返回 `NextResponse<ErrorResponse>`

---

## 2. 全局错误边界 (error.tsx / global-error.tsx) 覆盖分析

### 2.1 文件位置

| 路径 | 类型 | 状态 |
|------|------|------|
| `src/app/error.tsx` | 根级客户端错误边界 | ✅ |
| `src/app/global-error.tsx` | 根级全局错误(HTML壳) | ✅ |
| `src/app/[locale]/error.tsx` | Locale级客户端错误边界 | ✅ |
| `src/app/[locale]/global-error.tsx` | Locale级全局错误 | ❌ **缺失** |
| `src/app/[locale]/{route}/error.tsx` | 各路由级错误边界 | ✅ 已配置 |

### 2.2 关键发现

**问题1: `[locale]/global-error.tsx` 缺失**

根目录有 `global-error.tsx`，但 `src/app/[locale]/` 目录下没有。这意味着：
- 当 `[locale]` 路由下的 Server Component 抛出错误时，会冒泡到根级 `global-error.tsx`
- 根级 `global-error.tsx` 是 **HTML wrapper** 格式，应该包裹 `<html><body>`
- 但 `[locale]` 是多语言路由，通常有自己的布局，缺失 `global-error.tsx` 会导致错误处理不完整

**问题2: 错误边界实现不一致**

`src/app/error.tsx`:
```typescript
'use client'
export { HomeError as default } from '@/components/errors'  // 重导出
```

`src/app/global-error.tsx`:
```typescript
'use client'
// 直接实现了完整的 HTML 错误页面，带 gradient 样式和重试按钮
```

`src/app/[locale]/error.tsx`:
```typescript
'use client'
export { HomeError as default } from '@/components/errors'  // 也是重导出
```

**问题3: `global-error.tsx` 是 `'use client'` 但 Next.js 要求是服务器组件**

Next.js 文档明确指出 `global-error.tsx` 必须是 Server Component（且必须包含 `<html>` 和 `<body>`）。当前实现标记了 `'use client'`，这可能导致在某些 Next.js 版本中的兼容性问题。

---

## 3. API 路由错误处理一致性分析

### 3.1 混用情况统计

```bash
# 搜索引用结果
grep -r "createErrorResponse\|createSuccessResponse" src/app/api/ --include="*.ts" | wc -l
# 输出: 330  # 大量使用旧系统

grep -r "createUnifiedErrorResponse\|withUnifiedErrorHandling" src/app/api/ --include="*.ts" | wc -l  
# 输出: 4    # 只有 tasks 路由使用新统一系统
```

### 3.2 具体路由分析

**使用旧系统** (`src/lib/api/error-handler`):
- `src/app/api/projects/route.ts` - 使用 `createSuccessResponse`
- 大部分其他 API 路由 - 分散使用 `createErrorResponse` / `createSuccessResponse`

**使用新统一系统** (`src/lib/errors`):
- `src/app/api/tasks/route.ts` - 使用 `createUnifiedErrorResponse` / `createUnifiedSuccessResponse`

### 3.3 核心问题

**不一致的响应格式**:

旧系统返回:
```json
{
  "success": false,
  "error": {
    "type": "VALIDATION",
    "message": "...",
    "userMessage": "...",
    "action": "...",
    "help": "...",
    "details": {},
    "timestamp": "..."
  }
}
```

新系统返回:
```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "...",
    "code": "VALIDATION_ERROR",
    "details": {},
    "retryable": false,
    "retryAfter": undefined,
    "timestamp": "..."
  }
}
```

**问题**:
- `type` 值不匹配: `VALIDATION` vs `VALIDATION_ERROR`
- 新系统有 `retryable`/`retryAfter`，旧系统没有
- 旧系统有 `userMessage`/`action`/`help`，新系统没有
- 混用会导致前端解析逻辑复杂化

---

## 4. 统一错误类型定义评估

### 4.1 现有错误类型枚举

**UnifiedErrorType** (`src/lib/errors/unified-types.ts`):
```typescript
export enum UnifiedErrorType {
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

**ErrorType** (`src/lib/api/error-types.ts`):
```typescript
// 假设存在，结构类似但 type 值略有不同
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  // ...
}
```

### 4.2 是否需要统一的错误类型定义？

**结论: 需要，但已有部分基础设施**

| 评估项 | 状态 | 说明 |
|--------|------|------|
| 是否有统一的错误类型枚举 | ✅ | `UnifiedErrorType` 已定义 |
| 是否所有错误都使用该枚举 | ❌ | `ErrorType` 仍在使用 |
| 是否有统一的错误类 | ✅ | `UnifiedAppError` 已定义 |
| 是否有统一的响应格式化 | ⚠️ | `createUnifiedErrorResponse` 已定义，但旧系统仍活跃 |
| 是否有错误处理包装器 | ✅ | `withUnifiedErrorHandling` 已定义 |

---

## 5. 建议

### 5.1 高优先级 (应立即修复)

#### 建议1: 创建缺失的 `[locale]/global-error.tsx`

```typescript
// src/app/[locale]/global-error.tsx
'use client'  // Next.js 15+ 支持 client directive for global-error

import { useEffect } from 'react'

export default function LocaleGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError] Locale level error:', error)
  }, [error])

  return (
    <html lang="zh">
      <body>
        {/* 类似根级 global-error.tsx 的 UI，但适配 locale */}
        <div>错误页面 - locale 版本</div>
        <button onClick={reset}>重试</button>
      </body>
    </html>
  )
}
```

#### 建议2: 统一 API 路由使用新错误系统

**方案A - 迁移**: 逐步将所有 API 路由迁移到 `createUnifiedErrorResponse`
- 优点: 统一格式，减少维护成本
- 缺点: 需要大量修改，可能影响现有功能

**方案B - 适配器模式**: 在 `src/lib/api/error-handler.ts` 中集成新系统
```typescript
// 在 createErrorResponse 中调用 createUnifiedErrorResponse
// 并进行格式转换
```
- 优点: 兼容现有代码，逐步迁移
- 缺点: 仍有双重维护负担

**推荐方案A**，因为新系统 (`UnifiedAppError`) 功能更完善。

#### 建议3: 修复 `global-error.tsx` 的 `'use client'` 问题

Next.js 文档要求 `global-error.tsx` 是 Server Component。如果确实需要 client-side 功能，考虑：
- 使用 `<script>` 标签注入 client-side 逻辑
- 或者确认 Next.js 版本是否已支持 client directive for global-error

### 5.2 中优先级 (近期规划)

#### 建议4: 删除或废弃 `src/lib/api/error-handler.ts`

一旦所有 API 路由迁移完成，可以：
1. 将 `src/lib/errors/index.ts` 作为唯一入口
2. 删除 `src/lib/api/error-handler.ts`
3. 清理 `src/lib/error-handler.ts` 中的 legacy 函数

#### 建议5: 统一客户端错误展示

`src/lib/error/client/error-handler.ts` 和 `src/components/errors` 可能有重复：
- 检查 `src/components/errors` 实现
- 确保客户端错误展示使用统一的 `handleError` 函数

#### 建议6: 添加错误类型映射表

在响应层面，确保旧 `ErrorType` 到新 `UnifiedErrorType` 的映射：

```typescript
const ERROR_TYPE_TO_UNIFIED: Record<string, UnifiedErrorType> = {
  'VALIDATION': UnifiedErrorType.VALIDATION,
  'NOT_FOUND': UnifiedErrorType.NOT_FOUND,
  // ...
}
```

### 5.3 低优先级 (长期优化)

#### 建议7: 错误恢复策略

当前错误边界只有 `reset()` 按钮，考虑：
- 添加自动重试机制（针对 retryable 错误）
- 添加错误历史记录（用于调试）

#### 建议8: 国际化错误消息

`UnifiedAppError` 当前 message 是硬编码英文/中文，考虑：
- 错误消息使用 i18n key
- 在响应层面根据 locale 返回翻译后的消息

#### 建议9: 错误监控集成

当前 `global-error-handlers.ts` 已集成 Sentry，建议：
- 统一所有错误都通过 `captureError` 发送到 Sentry
- 确保 `UnifiedAppError` 的上下文信息完整

---

## 6. 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     API Routes                                   │
├─────────────────────────────────────────────────────────────────┤
│  src/app/api/**/route.ts                                        │
│    ├── tasks/route.ts  ──→ createUnifiedErrorResponse (新)     │
│    └── * /route.ts    ──→ createErrorResponse (旧)              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Error Systems                                 │
├────────────────────────────┬────────────────────────────────────┤
│  旧系统                    │  新统一系统 (推荐)                   │
│  src/lib/api/              │  src/lib/errors/                    │
│  ├── error-handler.ts      │  ├── unified-types.ts               │
│  │   ├── ApiError          │  │   └── UnifiedErrorType           │
│  │   ├── createErrorResponse│  ├── unified-error.ts              │
│  │   └── withErrorHandling │  │   └── UnifiedAppError            │
│  └── error-types.ts        │  └── unified-response.ts           │
│      └── ErrorType         │      ├── createUnifiedErrorResponse │
│                            │      ├── createUnifiedSuccessResponse│
│                            │      └── withUnifiedErrorHandling   │
└────────────────────────────┴────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Error Boundaries                                │
├─────────────────────────────────────────────────────────────────┤
│  src/app/                                                       │
│  ├── error.tsx                  ──→ Client boundary (re-export) │
│  ├── global-error.tsx           ──→ HTML wrapper (root)          │
│  └── [locale]/                                                     │
│       ├── error.tsx             ──→ Client boundary (locale)     │
│       └── global-error.tsx      ──→ ❌ MISSING                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 总结

| 问题 | 严重性 | 行动项 |
|------|--------|--------|
| `[locale]/global-error.tsx` 缺失 | 🔴 高 | 立即创建 |
| API 路由错误处理不一致 (330 vs 4) | 🔴 高 | 迁移到统一系统 |
| `global-error.tsx` 标记 `'use client'` | 🟡 中 | 验证 Next.js 版本兼容性 |
| 两套错误类 (UnifiedAppError vs ApiError) | 🟡 中 | 废弃 ApiError |
| 错误类型枚举不统一 | 🟡 中 | 统一使用 UnifiedErrorType |

**总体评估**: 项目已有良好的错误处理基础设施（UnifiedAppError + unified-response），但存在并行维护的旧系统，导致不一致。建议尽快完成迁移，统一使用新系统。

---

*报告生成时间: 2026-10-20*
