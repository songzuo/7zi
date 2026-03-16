# 代码优化报告

**生成时间**: 2026-03-15  
**分析范围**: `/root/.openclaw/workspace/src/lib/utils/` 及相关工具函数

---

## 📊 概览

| 指标 | 数值 |
|------|------|
| 分析文件数 | 6 |
| 发现问题数 | 19 |
| 未使用导出函数 | 13 |
| 重复代码 | 2 处 |
| 废弃文件 | 1 个 |

---

## 🔴 未使用的导出函数

### 1. src/lib/utils/task-utils.ts

| 函数名 | 行号 | 状态 | 建议 |
|--------|------|------|------|
| `getRoleForTaskType` | 41 | 仅测试使用 | 考虑移除或标记为 `@internal` |
| `filterTasksByType` | 165 | 仅测试使用 | 合并到 `filterTasks` 或移除 |
| `filterTasksByStatus` | 185 | 仅测试使用 | 合并到 `filterTasks` 或移除 |
| `isValidTaskId` | 368 | **完全未使用** | 移除 |
| `getPriorityLevel` | 86 | 仅内部使用 | 标记为 `@internal` 或移除导出 |
| `getStatusOrder` | 106 | 仅内部使用 | 标记为 `@internal` 或移除导出 |

**详细说明**:
- `isValidTaskId` 定义了正则验证但从未在任何地方调用
- `filterTasksByType` 和 `filterTasksByStatus` 功能被更通用的 `filterTasks` 覆盖

### 2. src/lib/utils/dashboard-task-adapter.ts

| 函数名 | 行号 | 状态 | 建议 |
|--------|------|------|------|
| `taskToDashboardProject` | 137 | 仅重导出 | 考虑标记为 `@internal` |
| `taskToDashboardActivity` | 175 | 仅重导出 | 考虑标记为 `@internal` |
| `calculateAverageProgress` | 296 | 仅测试使用 | 移除或实际使用 |

### 3. src/lib/utils.ts

| 函数名 | 行号 | 状态 | 建议 |
|--------|------|------|------|
| `debounce` | 195 | 仅重导出 | 确认是否需要或移除 |
| `throttle` | 236 | 仅重导出 | 确认是否需要或移除 |
| `memoize` | 283 | 仅重导出 | 确认是否需要或移除 |
| `formatFileSize` | 306 | 仅重导出 | 确认是否需要或移除 |
| `optimizeImageUrl` | 339 | 仅重导出 | 确认是否需要或移除 |
| `preloadResources` | 361 | 仅重导出 | 确认是否需要或移除 |
| `lazyLoadComponent` | 391 | 仅重导出 | 确认是否需要或移除 |
| `createCache` | 114 | 仅测试使用 | 确认是否需要或移除 |
| `prefersReducedMotion` | 414 | 仅测试使用 | 确认是否需要或移除 |
| `prefersDarkMode` | 438 | 仅测试使用 | 确认是否需要或移除 |

---

## 🟠 重复代码

### 1. formatTimeAgo 重复定义

**位置**: 
- `src/lib/utils.ts:325-350`
- `src/lib/datetime.ts:106` (重导出)

**问题**: 
- `datetime.ts` 从 `utils.ts` 导入并重导出 `formatTimeAgo`
- `utils/index.ts` 也从 `utils.ts` 重导出
- 造成循环依赖风险

**建议**:
```
方案 A: 统一在 datetime.ts 中实现，utils.ts 改为导入
方案 B: 保留 utils.ts 中的实现，datetime.ts 直接重导出（当前状态）
方案 C: 只从一个入口导出，移除另一个
```

### 2. src/lib/date.ts 废弃文件

**位置**: `src/lib/date.ts` (37 行)

**问题**:
- 整个文件已标记为 `@deprecated`
- 所有函数都是对 `datetime.ts` 的简单包装
- 没有实际使用场景

**建议**: 
- 如果确认无外部依赖，直接删除此文件
- 或添加构建时警告提醒迁移

---

## 🟡 优化建议

### 高优先级

#### 1. 移除 `isValidTaskId` (task-utils.ts:368)
```typescript
// 当前代码 - 未使用
export const isValidTaskId = (taskId: string): boolean => {
  if (!taskId || typeof taskId !== 'string') return false;
  return /^task_\d+_[a-z0-9]+$/.test(taskId);
};
```
**操作**: 直接删除或移到需要的地方作为内部函数

#### 2. 清理 src/lib/date.ts
```bash
# 删除废弃文件
rm src/lib/date.ts
```
**操作**: 删除整个文件，更新任何导入引用

#### 3. 标记内部函数
```typescript
// task-utils.ts
/** @internal */
export const getPriorityLevel = (priority: TaskPriority): number => {
  return PRIORITY_LEVELS[priority] ?? 0;
};
```

### 中优先级

#### 4. 合并过滤函数
```typescript
// 移除单独的 filterTasksByType 和 filterTasksByStatus
// 保留通用的 filterTasks 函数
export const filterTasks = (tasks: Task[], options: TaskFilterOptions): Task[] => {
  // 已支持 type 和 status 过滤
};
```

#### 5. 清理未使用的工具函数 (utils.ts)
以下函数仅在测试中使用，考虑移除：
- `debounce`
- `throttle`
- `memoize`
- `formatFileSize`
- `optimizeImageUrl`
- `preloadResources`
- `lazyLoadComponent`
- `createCache`
- `prefersReducedMotion`
- `prefersDarkMode`

### 低优先级

#### 6. 统一日期时间导出入口
- 选择 `@/lib/datetime` 或 `@/lib/utils` 作为主入口
- 移除另一个入口的重复导出

---

## 📈 预期收益

| 优化项 | 减少代码行数 | 减少导出数 | 维护性提升 |
|--------|-------------|-----------|-----------|
| 移除未使用函数 | ~100 行 | 13 个 | ⬆️ 高 |
| 删除废弃文件 | ~37 行 | 5 个 | ⬆️ 高 |
| 合并重复导出 | ~20 行 | 3 个 | ⬆️ 中 |
| **总计** | **~157 行** | **21 个** | - |

---

## ✅ 执行清单

- [ ] 移除 `isValidTaskId` 函数
- [ ] 删除 `src/lib/date.ts` 废弃文件
- [ ] 标记 `getPriorityLevel` 和 `getStatusOrder` 为 `@internal`
- [ ] 移除或合并 `filterTasksByType` 和 `filterTasksByStatus`
- [ ] 清理 `utils.ts` 中未使用的函数（debounce, throttle, memoize 等）
- [ ] 统一 `formatTimeAgo` 的导出入口
- [ ] 更新相关测试文件

---

## 🔍 分析方法

1. **静态分析**: 使用 `grep` 搜索函数引用
2. **使用统计**: 统计每个导出函数的实际调用次数
3. **测试排除**: 排除 `.test.ts` 文件中的使用（测试使用不算实际使用）
4. **重导出识别**: 识别仅用于重导出的函数

---

*报告生成者: 代码优化专家子代理*
