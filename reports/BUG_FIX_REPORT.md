# Bug Fix Report - 7zi Project

**生成时间**: 2026-03-18 11:56 CET  
**分析范围**: 7zi-project  
**分析方法**: 测试失败分析 + 代码审查

---

## 1. 测试失败分析

### 1.1 超时测试 (Timeout Failures)

以下测试存在超时问题:

| 测试名称 | 超时时间 | 重试次数 |
|---------|---------|---------|
| `TeamActivityTracker - 应该显示标题` | 20032ms | retry x1 |
| `TeamActivityTracker - 应该显示过滤按钮` | 20031ms | retry x1 |
| `TeamActivityTracker - 应该显示导出按钮` | 20015ms | retry x1 |
| `RealtimeDashboard - 应该显示标题` | 20025ms | retry x1 |
| `RealtimeDashboard - 应该显示连接状态` | 20030ms | retry x1 |
| `RealtimeDashboard - 应该显示性能指标` | 20020ms | retry x1 |
| `useFetch - 处理 revalidateInterval = 0` | 20036ms | retry x1 |
| `useFetch - 处理极小的 revalidateInterval` | 20020ms | retry x1 |

**根本原因分析**:
- `revalidateInterval = 0` 时，`setInterval` 以 0ms 间隔执行，导致无限循环
- 组件测试中的异步数据加载没有正确的 mock，导致测试挂起

---

## 2. 已识别的 Bug 列表

### 2.1 高优先级 (High Priority)

#### Bug #1: useFetch revalidateInterval 边界条件处理

**文件**: `src/hooks/useFetch.ts`

**问题描述**:
```typescript
// 当 revalidateInterval = 0 时，应该禁用轮询，但当前逻辑会导致无限循环
useEffect(() => {
  if (!revalidateInterval) return;  // 0 会触发 return，这是正确的
  const interval = setInterval(fetchData, revalidateInterval);  // 但测试用例传入 0 后仍然有问题
  return () => clearInterval(interval);
}, [fetchData, revalidateInterval]);
```

**影响**: 测试超时，系统资源消耗

**修复建议**:
```typescript
useEffect(() => {
  if (!revalidateInterval || revalidateInterval < 1000) return;  // 添加最小间隔限制
  const interval = setInterval(fetchData, revalidateInterval);
  return () => clearInterval(interval);
}, [fetchData, revalidateInterval]);
```

---

#### Bug #2: 重复的 AppError 定义

**文件**: 
- `src/lib/errors.ts`
- `src/lib/monitoring/errors.ts`

**问题描述**:
两个文件都定义了 `AppError`，但实现完全不同：
- `src/lib/errors.ts`: 使用简单的接口扩展
- `src/lib/monitoring/errors.ts`: 使用完整的类实现

这会导致类型冲突和意外行为。

**修复建议**: 
合并为一个统一的 AppError 类，并在一个文件中导出。

---

#### Bug #3: NetworkErrorBoundary 内存泄漏

**文件**: `src/components/NetworkErrorBoundary.tsx`

**问题描述**:
```typescript
// 事件监听器没有在组件卸载时清理
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {  // 每次渲染都添加新监听器
    setStatus((prev) => ({ ...prev, isOnline: true }));
  });
  // 缺少 cleanup 函数
}
```

**影响**: 内存泄漏，重复的状态更新

**修复建议**:
```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;
  
  const handleOnline = () => setStatus((prev) => ({ ...prev, isOnline: true }));
  const handleOffline = () => {
    setStatus((prev) => ({ ...prev, isOnline: false }));
    setHasError(true);
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

---

### 2.2 中优先级 (Medium Priority)

#### Bug #4: GitHub API 路由缺少输入验证

**文件**: 
- `src/app/api/github/commits/route.ts`
- `src/app/api/github/issues/route.ts`

**问题描述**:
```typescript
// 没有验证 owner 和 repo 参数
const owner = searchParams.get('owner') || process.env.NEXT_PUBLIC_GITHUB_OWNER || 'songzhuo';
const repo = searchParams.get('repo') || process.env.NEXT_PUBLIC_GITHUB_REPO || 'openclaw-workspace';

// 没有验证 perPage 参数，可以传入极端值
const perPage = searchParams.get('per_page') || '30';
```

**影响**: 可能导致 API 滥用或意外行为

**修复建议**: 添加参数验证
```typescript
const perPage = Math.min(Math.max(parseInt(searchParams.get('per_page') || '30', 10), 100);
```

---

#### Bug #5: useGitHub Hook 未使用的 rateLimit 状态

**文件**: `src/hooks/useFetch.ts`

**问题描述**:
```typescript
const [rateLimit] = useState<{...} | null>(null);  // 永远为 null，从未被更新
```

**影响**: 代码冗余，误导开发者

**修复建议**: 移除未使用的状态，或实现真正的 rate limit 提取逻辑。

---

#### Bug #6: ContactForm 缺少 message 长度上限验证

**文件**: `src/components/ContactForm.tsx`

**问题描述**:
```typescript
} else if (formData.message.trim().length < 10) {
  newErrors.message = ...;
}
// 缺少最大长度验证，可能导致数据库问题
```

**修复建议**:
```typescript
} else if (formData.message.trim().length > 5000) {
  newErrors.message = '消息内容不能超过 5000 个字符';
}
```

---

#### Bug #7: LazyImage blurDataURL 生成可能在 SSR 时出错

**文件**: `src/components/LazyImage.tsx`

**问题描述**:
```typescript
const blurDataURL = useMemo(() => {
  if (typeof window === 'undefined' || !priority) return null;
  // SSR 时 window 不存在，但 useMemo 可能在 SSR 期间执行
  ...
}, [priority, bgColor]);
```

**修复建议**: 确保 useMemo 在客户端才执行。

---

### 2.3 低优先级 (Low Priority)

#### Bug #8: 测试中的 act() 警告

**文件**: `src/components/__tests__/RealtimeDashboard.test.tsx`

**问题描述**:
```
An update to RealtimeDashboard inside a test was not wrapped in act(...).
```

**修复建议**: 使用 `waitFor` 或 `act()` 包装异步状态更新。

---

#### Bug #9: API 错误响应不一致

**文件**: 多个 API 路由

**问题描述**:
- 有些返回 `{ error: string }`
- 有些返回 `{ message: string }`
- 缺少统一的错误响应格式

**修复建议**: 创建统一的错误响应类型。

---

#### Bug #10: Status API 使用硬编码数据

**文件**: `src/app/api/status/route.ts`

**问题描述**:
```typescript
const uptime30Days = 99.98;  // 硬编码
```

**影响**: 不能反映真实系统状态

**修复建议**: 实现真正的状态检查逻辑。

---

## 3. 总结

| 优先级 | 数量 |
|-------|-----|
| 高 (High) | 3 |
| 中 (Medium) | 4 |
| 低 (Low) | 3 |

### 建议修复顺序:
1. **Bug #1**: useFetch revalidateInterval - 导致测试超时
2. **Bug #3**: NetworkErrorBoundary - 内存泄漏
3. **Bug #2**: 重复 AppError - 代码冲突
4. **Bug #4**: API 输入验证 - 安全风险
5. 其他 Bug

---

*报告生成工具: 自动代码分析*
