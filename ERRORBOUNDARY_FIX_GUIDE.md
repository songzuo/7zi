# ErrorBoundary 优化方案 - 具体修复代码

本文档提供了 ErrorBoundary 审查中发现问题的具体修复代码和实施步骤。

---

## 🔴 高优先级修复

### 修复 1: handleCopyError 敏感信息泄露

**文件**: `src/components/ErrorDisplay.tsx`

**位置**: 第 217-233 行

**当前代码**:
```typescript
const handleCopyError = useCallback(async () => {
  const errorInfo = {
    title,
    message,
    digest: errorDigest,
    type: errorType,
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: new Date().toISOString(),
  };

  try {
    await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch {
    // 静默失败
  }
}, [title, message, errorDigest, errorType]);
```

**修复后代码**:
```typescript
const handleCopyError = useCallback(async () => {
  // 清理 URL 中的敏感信息
  let safeUrl = '';
  if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV === 'development') {
      safeUrl = window.location.href;
    } else {
      // 生产环境只暴露路径和错误类型，不暴露查询参数
      const url = new URL(window.location.href);
      url.search = ''; // 移除查询参数
      url.hash = '';   // 移除 hash
      safeUrl = url.toString();
    }
  }

  const errorInfo = {
    title,
    message: process.env.NODE_ENV === 'development' ? message : getUserFriendlyMessage(errorType),
    digest: errorDigest,
    type: errorType,
    url: safeUrl,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  };

  try {
    await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch {
    // 静默失败
  }
}, [title, message, errorDigest, errorType]);
```

---

### 修复 2: ErrorBoundary 生产环境过滤错误消息

**文件**: `src/components/ErrorBoundary.tsx`

**位置**: 第 46-66 行

**当前代码**:
```typescript
function getErrorMessage(errorType: ErrorType, defaultMessage: string): string {
  switch (errorType) {
    case 'network':
      return '请检查您的网络连接，然后重试';
    case 'not-found':
      return '您访问的页面不存在或已被移除';
    case 'unauthorized':
      return '请登录后继续访问此页面';
    case 'forbidden':
      return '您没有权限访问此页面';
    case 'server':
      return '服务器暂时无法处理请求，请稍后重试';
    default:
      return defaultMessage; // ❌ 生产环境可能泄露敏感信息
  }
}
```

**修复后代码**:
```typescript
function getErrorMessage(errorType: ErrorType, defaultMessage: string): string {
  // 生产环境不使用默认消息，避免泄露技术细节
  if (process.env.NODE_ENV === 'production') {
    switch (errorType) {
      case 'network':
        return '请检查您的网络连接，然后重试';
      case 'not-found':
        return '您访问的页面不存在或已被移除';
      case 'unauthorized':
        return '请登录后继续访问此页面';
      case 'forbidden':
        return '您没有权限访问此页面';
      case 'server':
        return '服务器暂时无法处理请求，请稍后重试';
      default:
        return '发生了意外错误，请稍后重试';
    }
  }

  // 开发环境可以显示详细消息
  switch (errorType) {
    case 'network':
      return '请检查您的网络连接，然后重试';
    case 'not-found':
      return '您访问的页面不存在或已被移除';
    case 'unauthorized':
      return '请登录后继续访问此页面';
    case 'forbidden':
      return '您没有权限访问此页面';
    case 'server':
      return '服务器暂时无法处理请求，请稍后重试';
    default:
      return defaultMessage;
  }
}
```

**或者更简洁的实现**:
```typescript
function getErrorMessage(errorType: ErrorType, defaultMessage: string): string {
  const messages: Record<ErrorType, string> = {
    network: '请检查您的网络连接，然后重试',
    'not-found': '您访问的页面不存在或已被移除',
    unauthorized: '请登录后继续访问此页面',
    forbidden: '您没有权限访问此页面',
    server: '服务器暂时无法处理请求，请稍后重试',
    generic: process.env.NODE_ENV === 'production'
      ? '发生了意外错误，请稍后重试'
      : defaultMessage,
  };

  return messages[errorType] || messages.generic;
}
```

---

### 修复 3: NetworkErrorBoundary 网络检测逻辑优化

**文件**: `src/components/NetworkErrorBoundary.tsx`

**位置**: 第 72-95 行

**当前代码**:
```typescript
const checkNetwork = useCallback(async () => {
  setStatus((prev) => ({ ...prev, isChecking: true }));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(pingUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const isOnline = response.ok;
    setStatus({
      isOnline,
      isChecking: false,
      lastChecked: new Date(),
    });

    if (isOnline && hasError) {
      setHasError(false);
      await onRetry?.();
    }

    return isOnline;
  } catch {
    setStatus({
      isOnline: false,
      isChecking: false,
      lastChecked: new Date(),
    });
    return false;
  }
}, [pingUrl, hasError, onRetry]);
```

**修复后代码**:
```typescript
const checkNetwork = useCallback(async () => {
  setStatus((prev) => ({ ...prev, isChecking: true }));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(pingUrl, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache', // 避免缓存影响
    });

    clearTimeout(timeoutId);

    // 改进的在线判断：2xx-4xx 都视为在线，只有 5xx 视为离线
    const isOnline = response.status < 500;

    setStatus({
      isOnline,
      isChecking: false,
      lastChecked: new Date(),
    });

    if (isOnline && hasError) {
      setHasError(false);
      await onRetry?.();
    }

    return isOnline;
  } catch (error) {
    // 区分不同类型的错误
    const isAbortError = error instanceof Error && error.name === 'AbortError';

    setStatus({
      isOnline: false,
      isChecking: false,
      lastChecked: new Date(),
    });

    // 如果是超时错误，可以触发重试
    if (isAbortError && hasError) {
      // 可以在这里添加自动重试逻辑
    }

    return false;
  }
}, [pingUrl, hasError, onRetry]);
```

---

## 🟡 中优先级修复

### 修复 4: NetworkErrorBoundary 内存泄漏

**文件**: `src/components/NetworkErrorBoundary.tsx`

**位置**: 第 108-119 行

**当前代码**:
```typescript
// 监听网络状态变化
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setStatus((prev) => ({ ...prev, isOnline: true }));
  });

  window.addEventListener('offline', () => {
    setStatus((prev) => ({ ...prev, isOnline: false }));
    setHasError(true);
  });
}
```

**修复后代码**:
```typescript
import { useEffect, useRef } from 'react';

// ... 在组件内部

const cleanupRef = useRef<(() => void)[]>([]);

useEffect(() => {
  const handleOnline = () => {
    setStatus((prev) => ({ ...prev, isOnline: true }));
  };

  const handleOffline = () => {
    setStatus((prev) => ({ ...prev, isOnline: false }));
    setHasError(true);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    cleanupRef.current.push(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });
  }

  return () => {
    cleanupRef.current.forEach(cleanup => cleanup());
    cleanupRef.current = [];
  };
}, []);
```

---

### 修复 5: ErrorBoundaryWrapper 添加错误恢复回调

**文件**: `src/components/ErrorBoundaryWrapper.tsx`

**位置**: 第 14-19 行和第 87-95 行

**当前接口**:
```typescript
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  title?: string;
  showReset?: boolean;
  variant?: 'default' | 'compact' | 'fullscreen';
  logError?: boolean;
  showReportLink?: boolean;
}
```

**修复后接口**:
```typescript
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRecovery?: () => void; // ✅ 新增
  title?: string;
  showReset?: boolean;
  variant?: 'default' | 'compact' | 'fullscreen';
  logError?: boolean;
  showReportLink?: boolean;
}
```

**修复后的重置方法**:
```typescript
private handleReset = () => {
  this.setState({ hasError: false, error: null, errorInfo: null });
  this.props.onRecovery?.(); // ✅ 调用恢复回调
};
```

**使用示例**:
```typescript
<ErrorBoundaryWrapper
  title="组件加载失败"
  onRecovery={() => {
    // 执行恢复后的操作
    console.log('组件已恢复');
    // 重新加载数据等
  }}
>
  <MyComponent />
</ErrorBoundaryWrapper>
```

---

### 修复 6: 统一 Sentry 错误上报格式

**创建新文件**: `src/lib/monitoring/sentry-utils.ts`

```typescript
/**
 * Sentry 统一上报工具
 */

import * as Sentry from '@sentry/nextjs';
import { ErrorCategory, ErrorSeverity } from './errors';

export interface SentryContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  level?: ErrorSeverity;
}

/**
 * 获取用户上下文（从 window 或 localStorage）
 */
function getUserContext() {
  if (typeof window === 'undefined') return undefined;

  try {
    // 尝试从全局获取用户信息
    const userContext = (window as any).__USER_CONTEXT__;
    if (userContext) {
      return userContext;
    }

    // 尝试从 localStorage 获取
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      return JSON.parse(userInfo);
    }
  } catch {
    // 静默失败
  }

  return undefined;
}

/**
 * 捕获错误到 Sentry（统一格式）
 */
export function captureToSentry(
  error: Error | unknown,
  context?: SentryContext
) {
  Sentry.withScope((scope) => {
    // 设置用户上下文
    const user = context?.user ?? getUserContext();
    if (user) {
      scope.setUser(user);
    }

    // 设置标签
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // 设置额外信息
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    // 设置严重级别
    if (context?.level) {
      scope.setLevel(context.level);
    }

    // 设置 URL（生产环境清理敏感信息）
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (process.env.NODE_ENV === 'production') {
        url.search = '';
        url.hash = '';
      }
      scope.setTag('url', url.toString());
    }

    // 捕获错误
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error));
    }
  });
}

/**
 * 添加面包屑日志
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}
```

**在 ErrorBoundary 中使用**:

```typescript
import { captureToSentry, addBreadcrumb } from '@/lib/monitoring/sentry-utils';

// 在错误边界中
useEffect(() => {
  if (hasRecovered) return;

  addBreadcrumb('ErrorBoundary 捕获到错误', 'error', 'error', {
    errorType,
    retryCount,
  });

  captureToSentry(error, {
    tags: {
      component: 'ErrorBoundary',
      error_type: errorType,
    },
    level: ErrorSeverity.ERROR,
  });
}, [error, errorType, retryCount, hasRecovered]);
```

---

## 🟢 低优先级修复

### 修复 7: 添加 ErrorBoundary 组件单元测试

**创建文件**: `src/components/__tests__/ErrorBoundary.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  withScope: (callback: (scope: any) => void) => callback({
    setTag: vi.fn(),
    setExtra: vi.fn(),
    setUser: vi.fn(),
    captureException: vi.fn(),
  }),
}));

describe('ErrorBoundary', () => {
  it('应该渲染错误显示', () => {
    const error = new Error('Test error');
    error.digest = 'test-digest-123';

    render(
      <ErrorBoundary
        error={error}
        reset={() => {}}
        title="测试错误"
      />
    );

    expect(screen.getByText('测试错误')).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
  });

  it('应该根据错误类型显示不同的图标', () => {
    const networkError = new Error('network failed');

    render(
      <ErrorBoundary
        error={networkError}
        reset={() => {}}
      />
    );

    // 检查网络错误特定的消息
    expect(screen.getByText('网络连接失败')).toBeInTheDocument();
  });

  it('点击重试应该调用 reset', async () => {
    const mockReset = vi.fn();
    const error = new Error('Test error');

    render(
      <ErrorBoundary
        error={error}
        reset={mockReset}
      />
    );

    const resetButton = screen.getByText('重试');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
    });
  });

  it('应该复制错误信息', async () => {
    const error = new Error('Test error');
    error.digest = 'test-digest';

    // Mock clipboard API
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(
      <ErrorBoundary
        error={error}
        reset={() => {}}
        showCopyError
      />
    );

    const copyButton = screen.getByText('复制错误信息');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
      expect(screen.getByText('已复制')).toBeInTheDocument();
    });
  });

  it('生产环境不应该显示敏感的 URL', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Test error');
    error.digest = 'test-digest';

    // Mock clipboard API
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(
      <ErrorBoundary
        error={error}
        reset={() => {}}
        showCopyError
      />
    );

    const copyButton = screen.getByText('复制错误信息');
    fireEvent.click(copyButton);

    const copiedData = JSON.parse(mockWriteText.mock.calls[0][0]);
    expect(copiedData.url).not.toContain('?'); // 不应该包含查询参数

    process.env.NODE_ENV = originalEnv;
  });
});
```

---

### 修复 8: ErrorDisplay 紧凑变体使用 CSS 变量

**创建文件**: `src/components/ErrorDisplay.module.css`

```css
.errorDisplayCompact {
  --error-bg: 254 242 242; /* red-50 */
  --error-border: 254 226 226; /* red-200 */
  --error-text: 185 28 28; /* red-700 */

  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background-color: rgb(var(--error-bg));
  border: 1px solid rgb(var(--error-border));
  border-radius: 0.5rem;
}

.errorDisplayCompact.dark {
  --error-bg: 127 29 29 / 0.2; /* red-900/20 */
  --error-border: 153 27 27; /* red-800 */
  --error-text: 248 113 113; /* red-300 */
}
```

**在组件中使用**:
```typescript
import styles from './ErrorDisplay.module.css';

// 在紧凑变体中
if (variant === 'compact') {
  return (
    <div className={`${styles.errorDisplayCompact} dark:${styles.errorDisplayCompactDark}`}>
      {/* ... 内容 */}
    </div>
  );
}
```

---

## 📋 实施步骤

### 第一阶段（立即执行）
1. ✅ 修复 `handleCopyError` 敏感信息泄露
2. ✅ 修复 ErrorBoundary 生产环境错误消息
3. ✅ 修复 NetworkErrorBoundary 内存泄漏
4. ✅ 优化 NetworkErrorBoundary 网络检测逻辑

### 第二阶段（本周完成）
5. ✅ 创建统一 Sentry 上报工具
6. ✅ 在所有 ErrorBoundary 组件中使用统一工具
7. ✅ 添加 ErrorBoundaryWrapper 恢复回调

### 第三阶段（下个迭代）
8. ✅ 添加 ErrorBoundary 组件单元测试
9. ✅ 优化 ErrorDisplay 样式（使用 CSS 变量）
10. ✅ 添加面包屑日志到关键操作

---

## 🧪 验证清单

### 安全性验证
- [ ] 生产环境错误信息不泄露敏感 URL 参数
- [ ] 生产环境不显示技术细节（堆栈、文件路径等）
- [ ] 复制的错误信息经过清理

### 功能验证
- [ ] 所有错误类型都能正确识别和显示
- [ ] 网络检测在各种网络状态下正常工作
- [ ] 错误恢复机制正常（重试、返回首页、刷新）
- [ ] 错误上报到 Sentry 格式一致

### 性能验证
- [ ] 没有内存泄漏（事件监听器正确清理）
- [ ] 错误检测不会导致性能问题
- [ ] 面包屑日志不会影响性能

### 测试验证
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 测试覆盖率 > 80%

---

**文档版本**: 1.0
**最后更新**: 2026-03-19
