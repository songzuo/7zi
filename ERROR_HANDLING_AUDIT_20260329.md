# 前端错误处理审核报告

**审核日期:** 2026-03-29
**项目:** 7zi-frontend
**审核范围:** `src/` 目录下的错误处理机制

---

## 1. 当前错误处理机制概述

### 1.1 已有的错误处理组件和工具

| 组件/工具         | 位置                                               | 状态      |
| ----------------- | -------------------------------------------------- | --------- |
| AppError 类       | `lib/errors.ts`                                    | ✅ 完善   |
| ApiError 类       | `lib/api/error-handler.ts`                         | ✅ 完善   |
| EmptyError 组件   | `components/ui/EmptyState.tsx`                     | ✅ 存在   |
| EmptyNetwork 组件 | `components/ui/EmptyState.tsx`                     | ✅ 存在   |
| 错误消息本地化    | `locales/en/errors.json`, `locales/zh/errors.json` | ✅ 完善   |
| API 错误响应格式  | `lib/api/error-handler.ts`                         | ✅ 标准化 |

### 1.2 现有错误处理架构

```
服务端:
├── lib/errors.ts - AppError 类, 错误工厂函数, 错误聚合器
├── lib/api/error-handler.ts - ApiError 类, 标准化响应格式
└── app/api/*/route.ts - 各 API 端点的 try-catch 处理

客户端:
├── components/ui/EmptyState.tsx - 空状态/错误展示组件
├── hooks/useNotifications.ts - 有基础 try-catch
└── locales/*/errors.json - 错误消息本地化
```

---

## 2. 发现的问题

### P0 - 严重问题 (影响用户体验和稳定性)

#### 2.1 缺少 React ErrorBoundary 组件

**问题:** 整个应用没有 ErrorBoundary 组件来捕获 React 渲染错误。

**影响:**

- 组件渲染错误会导致整个应用白屏
- 用户无法恢复到正常状态
- 错误信息对用户不友好

**当前状态:**

```bash
$ grep -rn "ErrorBoundary" src/
# 无结果
```

**建议:**

```tsx
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // 上报错误到监控系统
    logger.error('React Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

---

#### 2.2 缺少 Next.js error.tsx 页面

**问题:** 没有遵循 Next.js App Router 的错误处理模式，缺少 `error.tsx` 文件。

**影响:**

- 路由级别的错误无法优雅处理
- 无法提供错误恢复选项

**当前状态:**

```bash
$ find src -name "error.tsx"
# 无结果
```

**建议:**

```tsx
// app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="error-container">
      <h2>出错了!</h2>
      <button onClick={() => reset()}>重试</button>
    </div>
  )
}
```

---

#### 2.3 缺少全局 JavaScript 错误处理

**问题:** 没有监听 `window.onerror` 和 `unhandledrejection` 事件。

**影响:**

- 未捕获的 Promise 错误会静默失败
- 无法统一收集运行时错误
- 用户体验差

**当前状态:**

```bash
$ grep -rn "onerror\|unhandledrejection" src/
# 无结果
```

**建议:**

```tsx
// 在 app/layout.tsx 或专门的错误处理模块中
if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    logger.error('Global error:', { message, source, lineno, colno, error })
    // 可选: 显示友好的错误提示
  }

  window.addEventListener('unhandledrejection', event => {
    logger.error('Unhandled promise rejection:', event.reason)
  })
}
```

---

### P1 - 重要问题 (影响错误处理体验)

#### 2.4 缺少 Toast/Snackbar 通知系统

**问题:** 没有临时的、非阻塞的错误提示组件。

**影响:**

- API 调用失败没有即时反馈
- 用户可能不知道操作是否成功
- 需要刷新页面才能清除错误状态

**建议:**

- 创建 `components/ui/Toast.tsx` 组件
- 集成 toast 上下文用于全局调用
- 支持不同类型 (success, error, warning, info)

---

#### 2.5 客户端 API 错误处理不一致

**问题:** 各 hooks 和组件中的 fetch 错误处理方式不统一。

**示例:**

```tsx
// hooks/useNotifications.ts (第 253-273 行)
const refreshNotifications = useCallback(async () => {
  try {
    const response = await fetch(`/api/notifications?${params}`)
    const result = await response.json()
    if (result.success && result.data) {
      setNotifications(result.data)
    }
    // ❌ 没有处理 response.ok === false 的情况
    // ❌ 没有向用户显示错误
  } catch (error) {
    console.error('[useNotifications] Failed to refresh:', error)
    // ❌ 只是 console.error, 用户看不到
  }
}, [userId, teamId])
```

**建议:**

```tsx
// 创建统一的 API 客户端
// lib/api/client.ts
export async function apiClient<T>(
  url: string,
  options?: RequestInit
): Promise<{
  data: T | null
  error: AppError | null
}> {
  try {
    const response = await fetch(url, options)
    const result = await response.json()

    if (!response.ok) {
      return { data: null, error: new AppError(result) }
    }

    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: new AppError(error) }
  }
}
```

---

#### 2.6 没有错误上报机制集成

**问题:** 虽然有 `ErrorAggregator` 类，但没有集成 Sentry 或其他监控服务。

**影响:**

- 生产环境错误无法追踪
- 无法分析错误趋势

**建议:**

- 集成 Sentry 或 LogRocket
- 配置 source map 上传
- 添加用户上下文信息

---

### P2 - 优化建议 (提升代码质量)

#### 2.7 错误消息有时不友好

**问题:** 部分 API 错误直接返回技术性消息。

**示例:**

```tsx
// app/api/feedback/route.ts (第 142-148 行)
return NextResponse.json({
  success: false,
  error: 'Failed to fetch feedbacks',
  message: '获取反馈列表失败', // ✅ 有中文消息
})
```

**改进建议:**

- 所有错误消息使用本地化
- 提供错误代码供用户查询
- 区分开发环境和生产环境的错误详情

---

#### 2.8 缺少表单验证错误的字段级提示

**问题:** 表单验证错误需要更精确的字段级提示。

**当前状态:** 有 `validation-schemas.ts`，但前端没有统一的错误展示机制。

**建议:**

- 创建 `useFormError` hook
- 集成 zod 错误到 UI 组件

---

## 3. 改进建议汇总

### 优先级排序

| 优先级 | 问题               | 影响               | 建议措施                               |
| ------ | ------------------ | ------------------ | -------------------------------------- |
| **P0** | 缺少 ErrorBoundary | 组件错误导致白屏   | 创建 ErrorBoundary 组件，包裹关键路由  |
| **P0** | 缺少 error.tsx     | 路由错误无法恢复   | 添加 app/error.tsx 和子路由错误页面    |
| **P0** | 无全局错误监听     | 运行时错误静默失败 | 添加 window.onerror/unhandledrejection |
| **P1** | 缺少 Toast 组件    | 操作反馈不明显     | 创建 Toast 上下文和组件                |
| **P1** | API 错误处理不一致 | 错误体验参差       | 创建统一 API 客户端                    |
| **P1** | 无错误上报         | 无法追踪生产错误   | 集成 Sentry 或类似服务                 |
| **P2** | 错误消息不够友好   | 用户体验不佳       | 统一使用本地化错误消息                 |
| **P2** | 表单验证提示不完善 | 用户难以定位问题   | 创建表单错误处理 hook                  |

---

## 4. 推荐实施计划

### 第一阶段 (1-2 天) - P0 问题

1. **创建 ErrorBoundary 组件**
   - 文件: `src/components/ErrorBoundary.tsx`
   - 包含错误回退 UI 和重试功能
   - 在 `layout.tsx` 中包裹应用

2. **添加 Next.js 错误页面**
   - 文件: `src/app/error.tsx`
   - 文件: `src/app/[locale]/error.tsx`
   - 文件: `src/app/admin/error.tsx`

3. **实现全局错误监听**
   - 文件: `src/lib/client-error-handler.ts`
   - 在 `layout.tsx` 中初始化

### 第二阶段 (2-3 天) - P1 问题

4. **创建 Toast 通知系统**
   - 文件: `src/components/ui/Toast.tsx`
   - 文件: `src/contexts/ToastContext.tsx`
   - 支持多种类型和自动消失

5. **统一 API 客户端**
   - 文件: `src/lib/api/client.ts`
   - 统一错误处理和重试逻辑
   - 与 Toast 系统集成

6. **集成错误监控**
   - 配置 Sentry SDK
   - 添加 source map 上传

### 第三阶段 (1 天) - P2 优化

7. **完善错误消息本地化**
8. **创建表单错误处理工具**

---

## 5. 已有的优势

尽管有上述问题，项目在错误处理方面也有一些良好实践：

✅ **错误类型标准化** - AppError 和 ApiError 提供了清晰的错误分类
✅ **空状态组件** - EmptyError、EmptyNetwork 等组件设计良好
✅ **错误本地化** - 支持中英文错误消息
✅ **API 响应格式** - 标准化的 `{ success, data, error }` 格式
✅ **错误聚合器** - ErrorAggregator 类为批量错误上报提供了基础

---

## 6. 结论

当前项目的错误处理在**服务端 API 层面较为完善**，但在**客户端 React 层面存在明显缺失**。最紧迫的问题是缺少 ErrorBoundary 和全局错误监听，这会导致组件渲染错误时整个应用崩溃而无法恢复。

建议优先处理 P0 级别问题，确保应用的基本稳定性，然后再逐步完善用户反馈机制和错误监控。

---

_审核人: AI 咨询师 + 媒体团队_
_审核时间: 2026-03-29 13:21 GMT+2_
