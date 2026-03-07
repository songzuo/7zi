# 错误处理指南

**最后更新**: 2026-03-06  
**难度**: ⭐⭐ 中等  
**时间**: 10-15 分钟阅读

---

## 🎯 概述

7zi Studio 采用多层错误处理策略，确保应用稳定性和良好的用户体验。本文档介绍错误处理的架构、使用方法和最佳实践。

---

## 📋 目录

- [错误处理架构](#错误处理架构)
- [ErrorBoundary 组件](#errorboundary-组件)
- [error-reporter API](#error-reporter-api)
- [错误上报流程](#错误上报流程)
- [Sentry 集成](#sentry-集成)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 🏗️ 错误处理架构

### 多层错误捕获

```
┌─────────────────────────────────────────────────────────┐
│                    全局错误处理器                          │
│  (window.onerror / unhandledrejection)                  │
├─────────────────────────────────────────────────────────┤
│                  根级 ErrorBoundary                       │
│  (app/error.tsx - 捕获整个应用错误)                       │
├─────────────────────────────────────────────────────────┤
│                页面级 ErrorBoundary                       │
│  (dashboard/error.tsx, tasks/error.tsx, etc.)           │
├─────────────────────────────────────────────────────────┤
│                组件级 ErrorBoundary                       │
│  (包装关键组件，提供细粒度错误隔离)                        │
├─────────────────────────────────────────────────────────┤
│                    业务逻辑层                             │
│  (try/catch + reportApiError/reportNetworkError)        │
└─────────────────────────────────────────────────────────┘
```

### 错误类型分类

| 类型 | 说明 | 分类标识 |
|------|------|----------|
| React 渲染错误 | 组件渲染时抛出的错误 | `react-error` |
| JavaScript 错误 | 未捕获的 JS 异常 | `js-error` |
| API 错误 | API 请求失败 | `api-error` |
| 网络错误 | 网络连接问题 | `network-error` |
| 资源加载错误 | 静态资源加载失败 | `resource-error` |

---

## 🛡️ ErrorBoundary 组件

### 基本使用

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

// 最基本的使用
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// 带名称标识（推荐）
<ErrorBoundary name="Dashboard">
  <Dashboard />
</ErrorBoundary>

// 自定义错误界面
<ErrorBoundary fallback={<div>出错了</div>}>
  <MyComponent />
</ErrorBoundary>
```

### 完整 Props

```tsx
interface ErrorBoundaryProps {
  /** 子组件 */
  children: ReactNode;
  
  /** 自定义错误界面 */
  fallback?: ReactNode;
  
  /** 错误回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  
  /** 错误边界名称（用于日志标识） */
  name?: string;
  
  /** 是否显示详细错误信息（开发模式自动开启） */
  showDetails?: boolean;
  
  /** 自定义重试处理 */
  onRetry?: () => void;
  
  /** 最大重试次数（默认 3） */
  maxRetries?: number;
}
```

### 使用示例

#### 1. 页面级错误边界

```tsx
// app/dashboard/page.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardPage() {
  return (
    <ErrorBoundary 
      name="DashboardPage"
      maxRetries={3}
      onRetry={() => {
        // 可选：重试时刷新数据
        console.log('Retrying dashboard...');
      }}
    >
      <Dashboard />
    </ErrorBoundary>
  );
}
```

#### 2. 组件级错误边界

```tsx
// 包装关键组件
<ErrorBoundary 
  name="MemberCard"
  showDetails={process.env.NODE_ENV === 'development'}
>
  <MemberCard member={member} />
</ErrorBoundary>

// 使用 fallback 提供降级 UI
<ErrorBoundary 
  name="Charts"
  fallback={<div className="text-gray-500">图表加载失败</div>}
>
  <Charts data={data} />
</ErrorBoundary>
```

#### 3. 使用高阶组件

```tsx
import { withErrorBoundary } from '@/components/ErrorBoundary';

// 自动包装组件
const SafeDashboard = withErrorBoundary(Dashboard, {
  name: 'SafeDashboard',
  maxRetries: 3,
});

export default SafeDashboard;
```

### 错误分类

ErrorBoundary 会自动分类错误并提供相应的 UI：

```tsx
enum ErrorType {
  NETWORK = 'NETWORK_ERROR',   // 网络错误 - 显示"网络连接问题"
  RENDER = 'RENDER_ERROR',     // 渲染错误 - 显示"页面加载出错"
  ASYNC = 'ASYNC_ERROR',       // 异步错误
  UNKNOWN = 'UNKNOWN_ERROR',   // 未知错误
}
```

---

## 📡 error-reporter API

### 核心函数

#### reportError()

上报任意错误：

```tsx
import { reportError } from '@/lib/error-reporter';

// 基本使用
await reportError(new Error('Something went wrong'));

// 带分类
await reportError(error, 'api-error');

// 带元数据
await reportError(error, 'custom', {
  component: 'Dashboard',
  action: 'fetchData',
  userId: '123',
});
```

#### reportApiError()

上报 API 错误：

```tsx
import { reportApiError } from '@/lib/error-reporter';

try {
  const response = await fetch('/api/data');
  if (!response.ok) {
    await reportApiError('/api/data', response.status, 'Failed to fetch');
  }
} catch (error) {
  await reportApiError('/api/data', 0, error.message);
}
```

#### reportNetworkError()

上报网络错误：

```tsx
import { reportNetworkError } from '@/lib/error-reporter';

try {
  await fetch('https://external-api.com/data');
} catch (error) {
  await reportNetworkError('https://external-api.com/data', error);
}
```

### Sentry 集成函数

#### 用户上下文

```tsx
import { 
  setSentryUser, 
  clearSentryUser 
} from '@/lib/error-reporter';

// 用户登录时
setSentryUser({
  id: 'user-123',
  email: 'user@example.com',
  username: 'john_doe',
});

// 用户登出时
clearSentryUser();
```

#### 自定义上下文

```tsx
import { 
  setSentryContext, 
  setSentryTag,
  setSentryExtra 
} from '@/lib/error-reporter';

// 设置上下文
setSentryContext('subscription', {
  plan: 'pro',
  expiresAt: '2024-12-31',
});

// 设置标签（用于分组）
setSentryTag('feature', 'dashboard');
setSentryTag('version', '2.0.0');

// 设置额外数据
setSentryExtra('debug_info', { requestId: 'abc-123' });
```

#### 面包屑（Breadcrumbs）

```tsx
import { addSentryBreadcrumb } from '@/lib/error-reporter';

// 跟踪用户操作
addSentryBreadcrumb('User clicked submit button', 'ui');
addSentryBreadcrumb('API request started', 'http', 'info');
addSentryBreadcrumb('Payment processed', 'transaction', 'info');
```

### 全局错误处理器

```tsx
import { setupGlobalErrorHandler } from '@/lib/error-reporter';

// 在应用入口调用一次
setupGlobalErrorHandler();
```

这会自动捕获：
- `unhandledrejection` - 未处理的 Promise 拒绝
- `window.onerror` - 全局 JavaScript 错误
- 资源加载错误（使用事件捕获）

---

## 🔄 错误上报流程

### 上报路径

```
┌─────────────────┐
│   错误发生       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ErrorBoundary   │  ← React 组件错误
│ 或              │
│ reportError()   │  ← 手动上报
└────────┬────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌─────────────────┐  ┌─────────────────┐
│ Sentry          │  │ /api/errors     │
│ (SaaS 监控)     │  │ (本地存储)      │
└─────────────────┘  └─────────────────┘
```

### 错误负载格式

```typescript
interface ErrorReportPayload {
  type: ErrorCategory;        // 错误类型
  message: string;            // 错误消息
  stack?: string;             // 堆栈信息
  url?: string;               // 发生页面
  timestamp?: string;         // 时间戳
  userAgent?: string;         // 浏览器信息
  metadata?: Record<string, unknown>;  // 自定义元数据
}
```

### 上报机制

1. **优先使用 sendBeacon** - 保证页面关闭时也能上报
2. **降级使用 fetch** - 兼容性更好
3. **keepalive: true** - 确保请求完成

```typescript
// 优先使用 sendBeacon
if (window.navigator.sendBeacon) {
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  return window.navigator.sendBeacon('/api/errors', blob);
}

// 降级使用 fetch
await fetch('/api/errors', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
  keepalive: true,
});
```

---

## 🔍 Sentry 集成

### 配置

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
```

### 初始化（已在项目中配置）

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### 最佳实践

#### 1. 设置用户上下文

```typescript
// 用户登录后
setSentryUser({
  id: user.id,
  email: user.email,
  username: user.name,
});
```

#### 2. 添加有意义的标签

```typescript
setSentryTag('page', 'dashboard');
setSentryTag('feature', 'member-management');
```

#### 3. 使用面包屑跟踪用户路径

```typescript
addSentryBreadcrumb('User opened member list', 'navigation');
addSentryBreadcrumb('User filtered by status: active', 'filter');
addSentryBreadcrumb('User clicked member card', 'ui');
```

#### 4. 添加上下文信息

```typescript
setSentryContext('task', {
  id: task.id,
  status: task.status,
  assignee: task.assignee,
});
```

---

## ✅ 最佳实践

### 1. 分层使用 ErrorBoundary

```tsx
// ❌ 不好：没有错误边界
<Dashboard />

// ✅ 好：页面级错误边界
<ErrorBoundary name="DashboardPage">
  <Dashboard />
</ErrorBoundary>

// ✅ 更好：分层错误边界
<ErrorBoundary name="DashboardPage">
  <Header />
  <ErrorBoundary name="DashboardContent" fallback={<LoadingError />}>
    <DashboardContent />
  </ErrorBoundary>
  <Footer />
</ErrorBoundary>
```

### 2. 提供有意义的错误上下文

```tsx
// ❌ 不好
reportError(error);

// ✅ 好
reportError(error, 'api-error', {
  endpoint: '/api/tasks',
  method: 'POST',
  payload: { taskId: '123' },
});
```

### 3. 错误恢复策略

```tsx
<ErrorBoundary 
  name="DataList"
  maxRetries={3}
  onRetry={() => {
    // 重试时刷新数据
    queryClient.invalidateQueries(['tasks']);
  }}
  onError={(error) => {
    // 记录错误到分析平台
    analytics.track('error_boundary_triggered', {
      boundary: 'DataList',
      error: error.message,
    });
  }}
>
  <DataList />
</ErrorBoundary>
```

### 4. 优雅降级

```tsx
// 关键功能 - 显示完整错误界面
<ErrorBoundary name="PaymentForm">
  <PaymentForm />
</ErrorBoundary>

// 非关键功能 - 降级显示
<ErrorBoundary 
  name="Recommendations"
  fallback={<div>推荐内容暂时不可用</div>}
>
  <Recommendations />
</ErrorBoundary>
```

### 5. API 错误处理

```tsx
async function fetchTasks() {
  try {
    const response = await fetch('/api/tasks');
    
    if (!response.ok) {
      await reportApiError('/api/tasks', response.status, response.statusText);
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      // 网络错误
      await reportNetworkError('/api/tasks', error);
    }
    throw error;
  }
}
```

---

## ❓ 常见问题

### Q: ErrorBoundary 捕获不到错误？

**A:** ErrorBoundary 只捕获渲染错误，不捕获：
- 事件处理器中的错误
- 异步代码（setTimeout, Promise）
- 服务端渲染错误

解决方案：

```tsx
// 事件处理器
<button onClick={() => {
  try {
    doSomething();
  } catch (error) {
    reportError(error);
  }
}}>
  Click
</button>

// 异步代码
useEffect(() => {
  async function fetchData() {
    try {
      const data = await fetch('/api/data');
    } catch (error) {
      reportError(error);
    }
  }
  fetchData();
}, []);
```

### Q: 如何测试 ErrorBoundary？

**A:** 参考 `app/__tests__/ErrorBoundary.test.tsx`：

```tsx
const ThrowError = ({ error }) => {
  if (error) throw error;
  return <div>Normal</div>;
};

it('catches errors', () => {
  render(
    <ErrorBoundary>
      <ThrowError error={new Error('Test')} />
    </ErrorBoundary>
  );
  
  expect(screen.getByText('页面加载出错')).toBeDefined();
});
```

### Q: 生产环境看不到错误详情？

**A:** 这是预期行为。生产环境默认隐藏错误详情：
- 安全考虑：避免泄露敏感信息
- 用户体验：显示友好错误界面

开发时可以强制显示：

```tsx
<ErrorBoundary showDetails={true}>
  <MyComponent />
</ErrorBoundary>
```

### Q: 如何禁用 Sentry？

**A:** 不设置 `NEXT_PUBLIC_SENTRY_DSN` 环境变量即可。

---

## 📚 相关文档

- [API 参考](./API-REFERENCE.md) - 完整 API 文档
- [组件参考](./COMPONENTS.md) - 组件 Props 和用法
- [开发指南](./DEVELOPMENT.md) - 开发环境配置
- [测试指南](./TESTING.md) - 测试最佳实践

---

## 📞 获取帮助

遇到问题？

- **查看文档**: [docs/INDEX.md](./INDEX.md)
- **提交 Issue**: https://github.com/songzuo/7zi/issues
- **邮件支持**: support@7zi.com

---

*文档由 7zi Studio AI 团队维护 🤖*
