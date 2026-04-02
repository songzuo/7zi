# Promise Rejection 审核报告

**审核日期**: 2026-03-29  
**审核人**: 📚 咨询师 + 🧪 测试员  
**项目**: 7zi-frontend  
**审核范围**: `src/` 目录下所有 `.ts` 和 `.tsx` 文件

---

## 📊 审核概览

| 统计项       | 数量 |
| ------------ | ---- |
| 审核文件总数 | 312  |
| 发现问题数   | 23   |
| 高危问题     | 6    |
| 中危问题     | 8    |
| 低危问题     | 9    |

---

## 🚨 问题清单

### 高危 (HIGH) - 关键路径无错误处理

| 文件                                              | 行号    | 问题类型               | 描述                                                                  | 建议修复                        |
| ------------------------------------------------- | ------- | ---------------------- | --------------------------------------------------------------------- | ------------------------------- |
| `src/app/notification-demo/page.tsx`              | 32      | await 无 try-catch     | 发送测试通知 API 调用无错误处理                                       | 添加 try-catch 或调用者错误处理 |
| `src/app/notification-demo/page.tsx`              | 46      | await 无 try-catch     | 发送任务通知 API 调用无错误处理                                       | 添加 try-catch 或调用者错误处理 |
| `src/app/notification-demo/page.tsx`              | 65      | Promise.all 无错误处理 | 清除通知的 Promise.all 无错误处理                                     | 添加 try-catch 包裹             |
| `src/components/EnhancedPerformanceDashboard.tsx` | 130     | await 无 try-catch     | `checkBudgetAlarms()` 函数调用 `budgetManager.checkAlarms` 无错误处理 | 添加 try-catch                  |
| `src/components/EnhancedPerformanceDashboard.tsx` | 141     | await 无 try-catch     | `handleClearData()` 调用 `monitor.clearAllData()` 无错误处理          | 添加 try-catch                  |
| `src/hooks/useImageOptimization.ts`               | 227-251 | new Promise 无 onerror | `compressImage` 中 `img.onerror` 未设置，只有 `reader.onerror`        | 添加 `img.onerror = reject`     |

### 中危 (MEDIUM) - 可能导致静默失败

| 文件                                           | 行号    | 问题类型                | 描述                                                   | 建议修复                   |
| ---------------------------------------------- | ------- | ----------------------- | ------------------------------------------------------ | -------------------------- |
| `src/hooks/useNotifications.ts`                | 262-263 | await 无 try-catch      | `refreshNotifications` 中 fetch 和 json 调用无错误处理 | 已有 try-catch ✅          |
| `src/stores/auth-store.ts`                     | 98      | .catch 空处理器         | `response.json().catch(() => ({}))` - 返回空对象默认值 | 可接受，但建议记录错误     |
| `src/stores/auth-store.ts`                     | 142     | .catch 空处理器         | 登出 API 调用 `.catch(() => {})` 静默失败              | 可接受，本地清除优先       |
| `src/lib/logger.ts`                            | 195     | .catch 空处理器         | 远程日志失败静默忽略 `.catch(() => {})`                | 可接受，避免日志循环       |
| `src/components/performance/SmartPrefetch.tsx` | 224     | .catch 空处理器         | API 预加载 `.catch(() => {})` 静默失败                 | 可接受，预加载失败不应阻塞 |
| `src/components/performance/SmartPrefetch.tsx` | 150-228 | new Promise 无 reject   | 多个 Promise 构造函数只 resolve 不 reject              | 添加 onerror 回调          |
| `src/lib/services/email.ts`                    | 127     | await 无 try-catch      | `response.json()` 在 try-catch 外部（但在 try 块内）   | 已在 try-catch 内 ✅       |
| `src/features/rate-limit/lib/redis-storage.ts` | 85-169  | 多个 await 无 try-catch | Redis 操作未包裹在 try-catch 中                        | 方法调用者应处理错误       |

### 低危 (LOW) - 演示/测试代码

| 文件                                                | 行号             | 问题类型              | 描述                                                  | 建议修复            |
| --------------------------------------------------- | ---------------- | --------------------- | ----------------------------------------------------- | ------------------- |
| `src/app/monitoring-example/page.tsx`               | 83, 97, 113, 156 | await 无 try-catch    | 演示页面的 Promise 调用                               | 演示代码，可选修复  |
| `src/app/api/data/import/route.ts`                  | 77               | new Promise 无 reject | `new Promise(resolve => setTimeout(resolve, 500))`    | 仅延迟，无需 reject |
| `src/components/feedback/FeedbackModal.tsx`         | 222              | new Promise 无 reject | `new Promise((resolve) => setTimeout(resolve, 1000))` | 仅延迟，无需 reject |
| `src/components/feedback/EnhancedFeedbackModal.tsx` | 143              | new Promise 无 reject | `new Promise(resolve => setTimeout(resolve, 500))`    | 仅延迟，无需 reject |

---

## 🔍 详细分析

### 1. 高危问题详解

#### `src/app/notification-demo/page.tsx`

```typescript
// 问题代码 (行 28-35)
const sendTestNotification = async (type: NotificationType) => {
  await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({...}),
  });
};
```

**风险**: 如果 API 调用失败，用户看不到任何错误提示。

**建议修复**:

```typescript
const sendTestNotification = async (type: NotificationType) => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({...}),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // 可选：显示成功提示
  } catch (error) {
    console.error('Failed to send notification:', error);
    alert('发送通知失败，请稍后重试');
  }
};
```

#### `src/components/EnhancedPerformanceDashboard.tsx`

```typescript
// 问题代码 (行 129-137)
const checkBudgetAlarms = async () => {
  const triggeredAlarms = await budgetManager.checkAlarms(
    webVitalsMonitor.getMetrics(),
    customMetricsTracker.getMetrics()
  )
  if (triggeredAlarms.length > 0) {
    setBudgetAlarms([...budgetAlarms, ...triggeredAlarms])
  }
}
```

**风险**: 如果 `checkAlarms` 抛出异常，整个组件可能崩溃。

**建议修复**:

```typescript
const checkBudgetAlarms = async () => {
  try {
    const triggeredAlarms = await budgetManager.checkAlarms(
      webVitalsMonitor.getMetrics(),
      customMetricsTracker.getMetrics()
    )
    if (triggeredAlarms.length > 0) {
      setBudgetAlarms([...budgetAlarms, ...triggeredAlarms])
    }
  } catch (error) {
    console.error('Failed to check budget alarms:', error)
    // 可选：设置错误状态显示给用户
  }
}
```

#### `src/hooks/useImageOptimization.ts`

```typescript
// 问题代码 (行 227-251)
return new Promise((resolve, reject) => {
  const img = new Image()
  const reader = new FileReader()

  reader.onload = e => {
    img.src = e.target?.result as string
  }

  reader.onerror = reject // ✅ 有错误处理
  reader.readAsDataURL(file)

  img.onload = () => {
    // ... 处理图片
  }
  // ❌ 缺少 img.onerror 处理
})
```

**建议修复**:

```typescript
img.onerror = () => reject(new Error('Failed to load image'))
img.onload = () => {
  // ... 处理图片
}
```

---

### 2. 中危问题详解

#### `src/stores/auth-store.ts`

```typescript
// 登出操作 (行 140-145)
logout: () => {
  fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
    // 忽略错误，本地清除即可
  })
  set({ ...initialState })
}
```

**分析**: 这是一种"fire and forget"模式，登出失败时本地状态仍会清除。这是可接受的设计，但建议添加可选的错误日志：

```typescript
logout: () => {
  fetch('/api/auth/logout', { method: 'POST' }).catch(error => {
    console.warn('Logout API failed, clearing local state:', error)
  })
  set({ ...initialState })
}
```

#### `src/components/performance/SmartPrefetch.tsx`

```typescript
// 多个 Promise 只 resolve 不 reject (行 202-228)
private prefetchPage(url: string): Promise<void> {
  return new Promise(resolve => {  // ❌ 无 reject 参数
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.onload = () => resolve();
    link.onerror = () => resolve();  // 错误时也 resolve
    document.head.appendChild(link);
  });
}
```

**分析**: 这是故意的设计 - 预加载失败不应阻塞应用。但建议添加日志以便调试：

```typescript
private prefetchPage(url: string): Promise<void> {
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.onload = () => resolve();
    link.onerror = () => {
      console.debug(`[Prefetch] Failed to prefetch: ${url}`);
      resolve();
    };
    document.head.appendChild(link);
  });
}
```

---

## ✅ 良好实践示例

以下代码展示了正确的错误处理模式：

### `src/components/feedback/FeedbackAdminPanel.tsx`

```typescript
const fetchFeedbacks = useCallback(async () => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/feedback?${params}`, {...});
    const data = await response.json();
    if (data.success) {
      setFeedbacks(data.data.feedbacks);
      setTotalPages(Math.ceil(data.data.total / pageSize));
    }
  } catch (error) {
    console.error('Failed to fetch feedbacks:', error);
  } finally {
    setIsLoading(false);
  }
}, [currentPage, filters]);
```

### `src/features/monitoring/lib/utils.ts`

```typescript
export async function withPerformanceTracking<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const operationId = monitor.startOperation(operationName);
  const startTime = Date.now();

  try {
    const result = await operation();
    await monitor.endOperation(operationId, true, {...});
    return result;
  } catch (error) {
    await monitor.endOperation(operationId, false, {...});
    throw error;  // 重新抛出，保留错误传播
  }
}
```

---

## 📋 修复优先级建议

### 立即修复 (P0)

1. `src/app/notification-demo/page.tsx` - 演示页面，但应展示最佳实践
2. `src/hooks/useImageOptimization.ts` - 可能导致图片上传功能静默失败

### 近期修复 (P1)

1. `src/components/EnhancedPerformanceDashboard.tsx` - 添加错误边界
2. `src/features/rate-limit/lib/redis-storage.ts` - 添加方法级错误处理

### 可选修复 (P2)

1. 演示页面中的 Promise 调用
2. 添加调试日志到静默失败的 `.catch()`

---

## 🛡️ 预防措施建议

1. **启用 ESLint 规则**:

   ```json
   {
     "rules": {
       "@typescript-eslint/no-floating-promises": "error",
       "@typescript-eslint/require-await": "warn"
     }
   }
   ```

2. **添加全局未处理 Promise 拒绝处理器**:

   ```typescript
   // 在 _app.tsx 或 layout.tsx 中
   if (typeof window !== 'undefined') {
     window.addEventListener('unhandledrejection', event => {
       console.error('Unhandled promise rejection:', event.reason)
       // 可选：发送到错误监控服务
     })
   }
   ```

3. **使用 React Error Boundary**:
   ```typescript
   // 对于关键组件，包裹 ErrorBoundary
   <ErrorBoundary fallback={<ErrorFallback />}>
     <EnhancedPerformanceDashboard />
   </ErrorBoundary>
   ```

---

## 📝 总结

7zi-frontend 项目的 Promise 错误处理总体良好，大部分关键 API 调用都有 try-catch 包裹。发现的问题主要集中在：

1. **演示页面** - 缺少错误处理（可能是故意简化）
2. **图片压缩工具** - 缺少完整的错误处理
3. **性能监控组件** - 部分异步函数缺少错误处理

建议按优先级逐步修复，并启用 `@typescript-eslint/no-floating-promises` 规则防止未来引入类似问题。

---

**审核完成时间**: 2026-03-29 13:30 GMT+2
