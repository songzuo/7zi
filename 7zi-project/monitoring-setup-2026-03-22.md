# 日志和监控方案实施报告

**项目**: 7zi Frontend
**日期**: 2026-03-22
**执行者**: ⚡ Executor (Subagent)
**状态**: ✅ 已完成

---

## 执行摘要

本报告基于对 `/root/.openclaw/workspace/7zi-project` 的全面评估，提供了日志和监控系统的实施方案。项目已具备基础的错误处理和日志框架，但在错误边界、APM 集成和错误上报方面需要补充。

---

## 一、当前错误处理机制评估

### 1.1 现有错误处理组件

| 组件 | 路径 | 状态 | 评分 |
|------|------|------|------|
| 错误类型定义 | `src/lib/errors.ts` | ✅ 已实现 | 8/10 |
| API 错误处理器 | `src/lib/api/error-handler.ts` | ✅ 已实现 | 9/10 |
| 结构化日志记录器 | `src/lib/logger.ts` | ✅ 已实现 | 8/10 |
| API 错误日志 | `src/lib/api/error-logger.ts` | ✅ 已实现 | 9/10 |
| 基础监控模块 | `src/lib/monitoring.ts` | ✅ 已实现 | 7/10 |
| Web Vitals 监控 | `src/lib/monitoring/web-vitals.ts` | ✅ 已实现 | 8/10 |
| Error Boundary | `src/components/ErrorBoundary.tsx` | ❌ 空壳 | 2/10 |
| Sentry 集成 | `package.json` | ⚠️ 已安装但未配置 | 0/10 |

### 1.2 优势

✅ **结构化错误处理**
- 统一的错误类型枚举 (`ErrorCodes`)
- 标准化的 API 响应格式
- 预定义的错误工厂方法

✅ **完善的日志系统**
- 结构化日志格式
- 多级别日志支持 (debug, info, warn, error, fatal)
- 上下文感知日志记录
- 分类日志 (api, auth, perf, user, security, business)

✅ **错误统计**
- `ErrorStatistics` 类用于追踪错误频率
- 高频错误检测机制

### 1.3 问题和不足

❌ **错误边界未实现**
```typescript
// 当前 ErrorBoundary.tsx 只是空壳
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

❌ **Sentry 未配置**
- `@sentry/nextjs` 已安装但未初始化
- `.env.production` 中有占位符但无实际配置
- 没有错误上报机制

❌ **日志持久化缺失**
- 日志仅输出到控制台
- 无远程日志聚合
- 生产环境日志不持久化

❌ **APM 工具缺失**
- 无分布式追踪
- 无性能分析
- 无数据库查询监控

---

## 二、错误处理改进建议

### 2.1 完善错误边界实现

#### 建议 1: 实现完整的 React Error Boundary

**目标**: 捕获 React 组件树中的错误，防止白屏

**实现位置**: `src/components/ErrorBoundary.tsx`

```typescript
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logApiError } from '@/lib/api/error-logger';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // 记录错误到日志系统
    logApiError(error, {
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    // 调用自定义错误处理器
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 发送到 Sentry（如果配置）
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } },
      });
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 使用自定义 fallback 或默认 UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
              出错了
            </h2>

            <p className="text-gray-600 text-center mb-6">
              抱歉，应用程序遇到了意外错误。您可以尝试刷新页面或联系支持团队。
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  错误详情（仅开发环境显示）
                </summary>
                <div className="bg-gray-100 rounded p-3 text-xs overflow-auto max-h-40">
                  <p className="font-mono text-red-600 mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="font-mono text-gray-700 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-2 inline" />
                重试
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 建议 2: 在根组件中添加 Error Boundary

**位置**: 在应用的根组件包裹

```typescript
// 7zi-frontend/src/app/page.tsx 或适当的入口文件
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Application Error:', error, errorInfo);
      }}
    >
      {/* 应用内容 */}
      <App />
    </ErrorBoundary>
  );
}
```

### 2.2 增强 API 错误处理

#### 建议 3: 添加全局 API 错误处理中间件

**实现位置**: `src/middleware/api-error-handler.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logApiError, createApiContext } from '@/lib/api/error-logger';
import { createErrorResponseJson } from '@/lib/api/error-handler';

export async function apiErrorHandler(
  handler: (request: NextRequest) => Promise<NextResponse>,
  request: NextRequest
): Promise<NextResponse> {
  const startTime = Date.now();
  const context = createApiContext(request);

  try {
    const response = await handler(request);

    // 记录成功响应
    logApiSuccess({
      ...context,
      duration: Date.now() - startTime,
    }, response.status);

    return response;
  } catch (error) {
    // 记录错误
    logApiError(error as Error, {
      ...context,
      duration: Date.now() - startTime,
    });

    // 返回标准化错误响应
    return createErrorResponseJson(error);
  }
}
```

#### 建议 4: 添加客户端 API 错误拦截器

**实现位置**: `src/lib/api/client-interceptor.ts`

```typescript
import { logApiError } from '@/lib/api/error-logger';
import { getUserFriendlyMessage } from '@/lib/errors';

export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).statusCode = response.status;

      logApiError(error, {
        path: url,
        method: options?.method || 'GET',
      });

      throw error;
    }

    return response;
  } catch (error) {
    // 网络错误或其他错误
    if (!(error as any).statusCode) {
      logApiError(error as Error, {
        path: url,
        method: options?.method || 'GET',
      });
    }

    throw error;
  }
}

export function getFriendlyErrorMessage(error: unknown): string {
  return getUserFriendlyMessage(error);
}
```

---

## 三、日志记录最佳实践

### 3.1 日志分级使用指南

| 级别 | 使用场景 | 示例 |
|------|----------|------|
| **debug** | 调试信息，开发环境 | `logger.debug('Cache miss for key', { key: 'user:123' })` |
| **info** | 常规操作，业务事件 | `logger.api('User login successful', { userId: '123' })` |
| **warn** | 警告，潜在问题 | `logger.warn('Rate limit approaching', { remaining: 5 })` |
| **error** | 错误，需要关注 | `logger.error('Database connection failed', error)` |
| **fatal** | 严重错误，服务不可用 | `logger.fatal('Server out of memory', { memUsage: '99%' })` |

### 3.2 日志分类使用

```typescript
// API 请求日志
logger.api('GET /api/users', { userId: '123', duration: 45 });

// 认证相关
logger.auth('Login attempt', { userId: '123', success: true });

// 性能指标
logger.perf('Query execution time', { query: 'SELECT *', time: 120 });

// 用户行为
logger.user('Export data', { userId: '123', format: 'xlsx' });

// 安全事件
logger.security('Suspicious login attempt', { ip: '1.2.3.4', attempts: 5 });

// 业务事件
logger.business('Subscription renewed', { userId: '123', plan: 'premium' });
```

### 3.3 结构化日志示例

```typescript
import logger from '@/lib/logger';

// ✅ 推荐：结构化日志
logger.info('User completed checkout', {
  userId: 'user-123',
  orderId: 'order-456',
  amount: 99.99,
  paymentMethod: 'credit_card',
  duration: 2340,
});

// ❌ 避免：字符串拼接
logger.info(`User ${userId} completed checkout for order ${orderId}`);
```

### 3.4 敏感数据处理

```typescript
// 使用 sanitizeSensitiveData 工具
import { sanitizeSensitiveData } from '@/lib/api/error-logger';

logger.info('User registration', {
  email: 'user@example.com',
  password: 'secret123', // 将被自动替换为 [REDACTED]
  apiToken: 'abc123xyz',
});
```

### 3.5 日志持久化建议

#### 选项 1: 使用 Winston + 日志文件（适合自托管）

```bash
npm install winston winston-daily-rotate-file
```

**配置**: `src/lib/logger/winston.ts`

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // 错误日志（每天轮转）
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),

    // 所有日志
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
    }),
  ],
});

// 开发环境同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export default logger;
```

#### 选项 2: 使用外部日志服务（推荐生产环境）

**推荐服务**:

1. **Logflare** - 免费层 500MB/月，与 Vercel 集成良好
2. **Logtail** - 简单易用，免费 1GB/月
3. **Datadog** - 企业级，功能完整
4. **Loki** - 开源，适合自托管

**Logflare 集成示例**:

```bash
npm install @logflare/node
```

```typescript
import { logflare } from '@logflare/node';

logflare.init({
  apiKey: process.env.LOGFLARE_API_KEY,
  sourceToken: process.env.LOGFLARE_SOURCE_TOKEN,
});

// 替换 logger 的实现以发送到 Logflare
```

---

## 四、推荐的监控工具和配置

### 4.1 APM 工具对比

| 工具 | 免费层 | 优势 | 劣势 | 推荐度 |
|------|--------|------|------|--------|
| **Sentry** | 5,000 事件/月 | 错误追踪强大，React 友好 | 性能监控需付费 | ⭐⭐⭐⭐⭐ |
| **Vercel Analytics** | 免费包含 | 零配置，与 Vercel 集成 | 功能有限 | ⭐⭐⭐⭐ |
| **New Relic** | 100 GB 数据/月 | 全栈监控 | 配置复杂 | ⭐⭐⭐ |
| **Datadog** | 5 主机/月 | 功能完整，告警强大 | 价格较高 | ⭐⭐⭐⭐ |

### 4.2 推荐：Sentry 集成

#### 为什么选择 Sentry？

1. ✅ 已安装 `@sentry/nextjs` 依赖
2. ✅ Next.js 官方推荐
3. ✅ 免费层足够中小项目使用
4. ✅ 错误追踪、性能监控、用户会话回放
5. ✅ 与 Vercel 集成良好

#### 配置步骤

**步骤 1: 创建 Sentry 项目**

1. 访问 https://sentry.io
2. 注册账号
3. 创建新项目 → 选择 "Next.js"
4. 获取 DSN 和 Auth Token

**步骤 2: 初始化 Sentry**

```bash
npx @sentry/wizard@latest -i nextjs
```

**步骤 3: 配置环境变量**

在 `.env.production` 中添加：

```bash
# Sentry 配置
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
SENTRY_ORG=your-org-name
SENTRY_PROJECT=7zi-frontend
```

**步骤 4: 配置 Sentry**

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 环境配置
  environment: process.env.NODE_ENV,

  // 采样率
  tracesSampleRate: 0.1, // 10% 性能追踪采样
  replaysSessionSampleRate: 0.1, // 10% 会话回放采样
  replaysOnErrorSampleRate: 1.0, // 错误时 100% 回放

  // 整合
  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],

  // 过滤敏感数据
  beforeSend(event) {
    // 移除敏感信息
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },

  // 上下文信息
  initialScope: {
    tags: {
      project: '7zi-frontend',
    },
  },
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,

  // 服务器端特定配置
  integrations: [
    Sentry.httpIntegration({
      tracing: true,
    }),
  ],

  // 性能监控
  tracesSampler: (samplingContext) => {
    // 重要 API 端点更高采样率
    if (samplingContext.transaction?.includes('/api/')) {
      return 0.2; // 20%
    }
    return 0.05; // 5%
  },
});
```

**步骤 5: 在代码中手动上报错误**

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // 可能失败的代码
  await riskyOperation();
} catch (error) {
  // 发送到 Sentry
  Sentry.captureException(error);

  // 添加上下文
  Sentry.withScope((scope) => {
    scope.setTag('page', 'dashboard');
    scope.setContext('user_data', { userId: '123' });
    Sentry.captureException(error);
  });
}

// 发送自定义消息
Sentry.captureMessage('User exceeded quota', 'warning');

// 添加面包屑
Sentry.addBreadcrumb({
  category: 'user',
  message: 'User clicked export button',
  level: 'info',
});
```

### 4.3 Vercel Analytics（补充）

#### 启用 Vercel Analytics

```bash
npm install @vercel/analytics
```

在 `src/app/layout.tsx` 中添加：

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

在 `.env.production` 中：

```bash
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_vercel_analytics_id
```

### 4.4 Web Vitals 集成

项目已安装 `web-vitals`，需要在 `src/app/layout.tsx` 中启用：

```typescript
import { initWebVitalsMonitoring } from '@/lib/monitoring/web-vitals';

// 初始化 Web Vitals
useEffect(() => {
  initWebVitalsMonitoring({
    reportWebVitals: (metric) => {
      // 发送到 Plausible
      if (window.plausible) {
        window.plausible('web-vital', {
          props: {
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
          },
        });
      }

      // 或发送到 Google Analytics
      if (window.gtag) {
        window.gtag('event', metric.name, {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(metric.value),
          non_interaction: true,
        });
      }
    },
  });
}, []);
```

---

## 五、错误上报机制

### 5.1 多层错误上报架构

```
应用错误
    │
    ├───→ 控制台日志（开发环境）
    │
    ├───→ 结构化日志系统
    │     │
    │     └───→ 本地日志文件（自托管）
    │     └───→ 外部日志服务（Logflare/Logtail）
    │
    ├───→ Sentry（错误追踪）
    │     ├── 错误堆栈
    │     ├── 用户会话回放
    │     └── 性能追踪
    │
    └───→ 通知（生产环境）
          ├── Email（关键错误）
          ├── Slack/钉钉（团队通知）
          └── SMS（严重故障）
```

### 5.2 错误通知配置

#### Slack 通知集成

```typescript
// src/lib/notifications/slack.ts

const SLACK_WEBHOOK_URL = process.env.SLACK_ERROR_WEBHOOK_URL;

interface SlackMessage {
  text: string;
  attachments: Array<{
    color: string;
    title: string;
    text: string;
    fields?: Array<{ title: string; value: string; short: boolean }>;
  }>;
}

export async function sendSlackErrorNotification(
  error: Error,
  context: Record<string, unknown>
): Promise<void> {
  if (!SLACK_WEBHOOK_URL) return;

  const message: SlackMessage = {
    text: '🚨 Production Error Detected',
    attachments: [
      {
        color: 'danger',
        title: error.name,
        text: error.message,
        fields: [
          { title: 'Environment', value: process.env.NODE_ENV || 'unknown', short: true },
          { title: 'Timestamp', value: new Date().toISOString(), short: true },
          { title: 'Path', value: String(context.path || 'N/A'), short: true },
          { title: 'User ID', value: String(context.userId || 'N/A'), short: true },
        ],
      },
    ],
  };

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch (err) {
    console.error('Failed to send Slack notification:', err);
  }
}
```

#### 在 Sentry 中配置 Slack 通知

1. 进入 Sentry 项目设置
2. Integrations → Slack
3. 配置 Alert Rules
4. 设置触发条件（如：错误率 > 5%）

### 5.3 错误严重等级和通知策略

| 等级 | 条件 | 通知方式 | 响应时间 |
|------|------|----------|----------|
| **Critical** | 5xx 错误率 > 10% | Slack + Email + SMS | 15 分钟 |
| **High** | 5xx 错误率 > 5% | Slack + Email | 30 分钟 |
| **Medium** | 4xx 错误率 > 20% | Slack | 1 小时 |
| **Low** | 4xx 错误率 > 10% | 仅记录 | 不通知 |

---

## 六、实施步骤

### 阶段 1: 基础设置（1-2 小时）

- [ ] **1.1** 实现 Error Boundary 组件
  - 文件: `src/components/ErrorBoundary.tsx`
  - 在根组件中包裹

- [ ] **1.2** 配置 Sentry
  - 运行初始化向导
  - 配置环境变量
  - 测试错误上报

- [ ] **1.3** 启用 Web Vitals
  - 在 layout.tsx 中集成
  - 配置上报到 Plausible

### 阶段 2: 日志增强（1-2 小时）

- [ ] **2.1** 添加日志持久化
  - 选择: Winston 或外部服务
  - 配置日志轮转

- [ ] **2.2** 创建 API 错误处理中间件
  - 文件: `src/middleware/api-error-handler.ts`
  - 在所有 API 路由中使用

- [ ] **2.3** 添加客户端错误拦截器
  - 文件: `src/lib/api/client-interceptor.ts`
  - 包装 fetch 调用

### 阶段 3: 通知和告警（1 小时）

- [ ] **3.1** 配置 Slack 通知
  - 文件: `src/lib/notifications/slack.ts`
  - 添加 Webhook URL

- [ ] **3.2** 设置 Sentry 告警
  - 配置 Alert Rules
  - 设置通知渠道

- [ ] **3.3** 测试告警流程
  - 触发测试错误
  - 验证通知到达

### 阶段 4: 验证和优化（1 小时）

- [ ] **4.1** 测试 Error Boundary
  - 在开发环境触发错误
  - 验证回退 UI 显示

- [ ] **4.2** 验证日志记录
  - 检查日志输出格式
  - 确认敏感数据过滤

- [ ] **4.3** 性能测试
  - 确认监控对性能的影响 < 5%
  - 调整采样率

### 阶段 5: 文档和培训（30 分钟）

- [ ] **5.1** 更新开发文档
  - 添加日志使用指南
  - 记录错误上报流程

- [ ] **5.2** 团队培训
  - 说明监控系统的使用
  - 演示告警处理流程

---

## 七、配置文件示例

### 7.1 完整的 .env.production

```bash
# ========================================
# 监控和日志配置
# ========================================

# Sentry 错误追踪
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
SENTRY_ORG=your-org
SENTRY_PROJECT=7zi-frontend

# 日志服务
LOG_LEVEL=info
LOGFLARE_API_KEY=your_logflare_api_key
LOGFLARE_SOURCE_TOKEN=your_source_token

# Web Vitals
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.com

# Vercel Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_vercel_analytics_id

# 通知
SLACK_ERROR_WEBHOOK_URL=https://hooks.slack.com/services/xxx
SLACK_INFO_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# ========================================
# 应用配置
# ========================================

NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

### 7.2 next.config.ts 更新

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // Sentry 集成（自动注入）
  sentry: {
    hideSourceMaps: true,
    tunnelRoute: '/monitoring',
    clientModulePath: './sentry.client.config.ts',
    serverModulePath: './sentry.server.config.ts',
  },

  // 图片优化
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    formats: ['image/avif', 'image/webp'],
  },

  // 压缩
  compress: true,

  // 生产环境 source map
  productionBrowserSourceMaps: false,

  // 头部配置
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## 八、监控仪表板建议

### 8.1 关键指标 (KPIs)

**错误相关**:
- 错误率（5xx, 4xx）
- 错误趋势（7 天）
- 最频繁的错误类型

**性能相关**:
- P50, P95, P99 响应时间
- Web Vitals (LCP, FID, CLS)
- API 端点性能

**用户体验**:
- 错误影响用户数
- 错误回放（Sentry）
- 用户投诉率

### 8.2 仪表板布局

```
┌─────────────────────────────────────────────────┐
│              错误监控仪表板                      │
├─────────────────────────────────────────────────┤
│  📊 错误率趋势       🔥 高频错误   ⚠️ 未解决问题 │
│  [图表: 7天趋势]     [TOP 5]        [计数: 12]   │
├─────────────────────────────────────────────────┤
│  ⚡ 性能指标         👥 受影响用户   📱 Web Vitals│
│  [P50/P95/P99]      [用户数/分布]  [LCP/FID/CLS]│
├─────────────────────────────────────────────────┤
│  🐛 最近错误         📈 错误分类     🔔 告警状态 │
│  [错误列表]         [饼图]          [状态]      │
└─────────────────────────────────────────────────┘
```

### 8.3 告警规则示例

**Sentry 告警规则**:

```yaml
# 高 5xx 错误率告警
- name: High 5xx Error Rate
  condition:
    query: 'transaction.status:5'
    threshold: 5
    timeWindow: 5m
  actions:
    - slack
    - email

# 新错误告警
- name: New Error Introduced
  condition:
    query: 'firstSeen:>=1h'
    threshold: 1
  actions:
    - slack

# 性能降级告警
- name: Slow Response Time
  condition:
    query: 'transaction.duration:>2000'
    threshold: 10
    timeWindow: 5m
  actions:
    - slack
```

---

## 九、成本估算

### 9.1 监控工具成本

| 工具 | 免费层 | 付费层 | 推荐配置 | 月成本 |
|------|--------|--------|----------|--------|
| **Sentry** | 5,000 事件/月 | $26/月 (50,000) | 开发用免费，生产 $26 | $26 |
| **Logflare** | 500 MB/月 | $50/月 (10 GB) | 免费层足够 | $0 |
| **Slack** | 10,000 消息/月 | - | 免费层足够 | $0 |
| **Plausible** | 免费（自托管） | $9/月 (10K 页面) | 免费层 | $0 |
| **Vercel Analytics** | 免费包含 | - | 免费 | $0 |
| **总计** | - | - | - | **$26/月** |

### 9.2 备选方案（全免费）

如果预算有限，可以使用以下免费方案：

- **错误追踪**: Sentry 免费层 + Logflare
- **性能监控**: Vercel Analytics + Web Vitals
- **日志**: Winston 本地文件（自托管）
- **通知**: Slack 免费层
- **成本**: $0/月

---

## 十、总结和建议

### 10.1 当前状态

✅ **已具备**:
- 结构化错误处理框架
- 完善的日志系统
- 基础监控模块
- Sentry 依赖已安装

❌ **需要补充**:
- Error Boundary 实现
- Sentry 配置和初始化
- 日志持久化
- 错误上报和通知
- APM 工具集成

### 10.2 优先级建议

**P0 (必须)**:
1. 实现 Error Boundary
2. 配置 Sentry
3. 启用 Web Vitals 监控

**P1 (重要)**:
4. 添加日志持久化
5. 配置错误通知
6. 创建 API 错误处理中间件

**P2 (优化)**:
7. 集成 Vercel Analytics
8. 添加性能监控
9. 创建监控仪表板

### 10.3 预期收益

实施本方案后，预期可以：

- 🚨 **提高问题发现速度**: 5-10 分钟内发现关键错误
- 📊 **减少故障恢复时间**: 通过回放功能快速定位问题
- 💡 **改善用户体验**: 错误边界防止白屏，友好错误提示
- 📈 **提升代码质量**: 通过错误趋势分析识别系统性问题
- 🔄 **自动化监控**: 减少手动巡检工作

### 10.4 下一步行动

1. 立即开始实施阶段 1（基础设置）
2. 在开发环境测试所有监控功能
3. 部署到生产环境并验证
4. 定期审查监控数据和告警规则
5. 根据实际使用情况优化配置

---

## 附录

### A. 参考链接

- [Sentry Next.js 文档](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Next.js 错误处理](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Web Vitals](https://web.dev/vitals/)
- [Winston 文档](https://github.com/winstonjs/winston)

### B. 监控检查清单

- [ ] Error Boundary 已实现并测试
- [ ] Sentry 已配置并能接收错误
- [ ] Web Vitals 已启用
- [ ] 日志持久化已配置
- [ ] 错误通知已测试
- [ ] API 错误处理中间件已部署
- [ ] 监控仪表板已创建
- [ ] 团队已培训
- [ ] 告警规则已配置
- [ ] 定期审查计划已制定

---

**报告完成时间**: 2026-03-22
