# 代码优化检查清单

## 🔥 立即行动项（High Priority）

### 1. 拆分 utils.ts 文件

**当前状态**: `src/lib/utils.ts` (40KB+，包含太多功能)

**行动步骤**:
```bash
# 创建新的模块目录
mkdir -p src/lib/utils/{cache,async,clone,format,id}

# 移动相关代码
mv src/lib/utils.ts:LRUCache → src/lib/utils/cache/lru-cache.ts
mv src/lib/utils.ts:debounce,throttle,memoize → src/lib/utils/async/timing.ts
mv src/lib/utils.ts:deepClone → src/lib/utils/clone/index.ts
mv src/lib/utils.ts:formatFileSize,formatNumber → src/lib/utils/format/number.ts
mv src/lib/utils.ts:generateId,generateUUID → src/lib/utils/id/index.ts

# 创建统一的导出文件
touch src/lib/utils/index.ts
```

**预期收益**:
- ✅ 提高代码可维护性
- ✅ 减少编译时间
- ✅ 更好的 tree-shaking

---

### 2. 统一 LRU Cache 实现

**当前状态**:
- `src/lib/utils.ts` 有 `LRUCache` 实现
- `src/lib/search-filter.ts` 有 `LRUCache` 实现

**行动步骤**:
```typescript
// 1. 创建统一模块: src/lib/cache/lru-cache.ts
export class LRUCache<T> {
  // 统一实现，包含 utils.ts 和 search-filter.ts 的所有功能
}

// 2. 更新 utils.ts
import { LRUCache } from '@/lib/cache/lru-cache';

// 3. 更新 search-filter.ts
import { LRUCache } from '@/lib/cache/lru-cache';
```

**预期收益**:
- ✅ 消除代码重复
- ✅ 统一行为和接口
- ✅ 易于维护和测试

---

### 3. 修复 retry-manager.ts 重复声明

**当前状态**: 第 57 行和第 85 行都声明了 `private timer`

**行动步骤**:
```typescript
// 删除重复声明，保留统一的类型定义
private timer: ReturnType<typeof setTimeout> | null = null;
```

**预期收益**:
- ✅ 消除混淆
- ✅ 符合 TypeScript 严格模式

---

### 4. 在 useDashboardData 中复用 useFetch

**当前状态**: `useDashboardData` 手动实现数据获取

**行动步骤**:
```typescript
// 替换手动的 fetch 逻辑为 useFetch
import { useFetch } from './useFetch';

export function useDashboardData(owner: string, repo: string) {
  const { data: issues, refetch: refetchIssues, loading, error } =
    useFetch<GitHubIssue[]>(
      `/api/github/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
    );

  const { data: commits, refetch: refetchCommits, loading: loadingCommits, error: errorCommits } =
    useFetch<GitHubCommit[]>(
      `/api/github/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
    );

  // ... 其余逻辑保持不变
}
```

**预期收益**:
- ✅ 减少代码重复
- ✅ 统一错误处理
- ✅ 自动支持重新验证逻辑

---

## 📋 中期改进项（Medium Priority）

### 5. 迁移 deprecated 的 seo.ts

**当前状态**: `src/lib/seo.ts` 标记为 `@deprecated`

**行动步骤**:
```bash
# 1. 查找所有引用
grep -r "from '@/lib/seo'" src/

# 2. 逐个迁移到 @/lib/seo-metadata
# 3. 删除 seo.ts 文件
```

**预期收益**:
- ✅ 减少技术债务
- ✅ 统一 SEO 实现

---

### 6. 优化 useLocalStorage 依赖

**当前状态**: `setValue` 依赖 `storedValue` 导致频繁重创建

**行动步骤**:
```typescript
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(/* ... */);
  const storedValueRef = useRef(storedValue);

  // 保持 ref 同步
  useEffect(() => {
    storedValueRef.current = storedValue;
  }, [storedValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const valueToStore = value instanceof Function
        ? value(storedValueRef.current)
        : value;
      // ...
    },
    [key, serialize]  // 移除 storedValue 依赖
  );

  return [storedValue, setValue];
}
```

**预期收益**:
- ✅ 减少回调函数重创建
- ✅ 避免不必要的重渲染

---

### 7. 修复 useThrottle 实现

**当前状态**: 节流实现与标准行为不一致

**行动步骤**:
```typescript
export function useThrottle<T>(value: T, limit: number = 100): T {
  const [throttledValue, setThrottledValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setThrottledValue(value);
    }, limit);

    return () => clearTimeout(handler);
  }, [value, limit]);

  return throttledValue;
}
```

**预期收益**:
- ✅ 确保节流行为符合预期
- ✅ 避免意外的更新频率

---

### 8. 减少 any 类型使用

**当前状态**: 多处使用 `any` 类型

**行动步骤**:
```typescript
// 替换
const globalCache = new LRUCache<any>(200);

// 为
interface CacheValue {
  [key: string]: unknown;
}
const globalCache = new LRUCache<CacheValue>(200);

// 或者使用 unknown + 类型守卫
const globalCache = new LRUCache<unknown>(200);
```

**预期收益**:
- ✅ 提高类型安全
- ✅ 减少运行时错误

---

## 🎯 长期优化项（Low Priority）

### 9. 添加错误边界组件

**行动步骤**:
```typescript
// 创建 src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  // 标准错误边界实现
}

// 在关键位置使用
<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```

---

### 10. 补充 JSDoc 注释

**行动步骤**:
- 检查所有公共 API
- 补充缺失的 JSDoc 注释
- 添加使用示例

---

### 11. 性能分析和优化

**行动步骤**:
```bash
# 使用 React Profiler
npm run build -- --profile

# 分析 bundle 大小
npm run build -- --analyze
```

---

## 📊 进度追踪

| 任务 | 状态 | 负责人 | 预计完成时间 |
|------|------|--------|--------------|
| 拆分 utils.ts | ⏳ 待开始 | - | - |
| 统一 LRU Cache | ⏳ 待开始 | - | - |
| 修复 retry-manager | ⏳ 待开始 | - | - |
| 复用 useFetch | ⏳ 待开始 | - | - |
| 迁移 seo.ts | ⏳ 待开始 | - | - |
| 优化 useLocalStorage | ⏳ 待开始 | - | - |
| 修复 useThrottle | ⏳ 待开始 | - | - |
| 减少 any 类型 | ⏳ 待开始 | - | - |
| 添加错误边界 | ⏳ 待开始 | - | - |
| 补充 JSDoc | ⏳ 待开始 | - | - |
| 性能分析 | ⏳ 待开始 | - | - |

---

## 🔗 相关文档

- [完整审查报告](./CODE_QUALITY_REVIEW_2026-03-19.md)
- [TypeScript 最佳实践](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React Hooks 规则](https://react.dev/reference/react)
- [代码审查清单](https://github.com/7zi-studio/7zi-project/blob/main/CONTRIBUTING.md)

---

**最后更新**: 2026-03-19
