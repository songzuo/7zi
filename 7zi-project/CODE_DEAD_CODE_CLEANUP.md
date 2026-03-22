# 代码死代码清理报告

**项目**: 7zi-project
**日期**: 2026-03-21
**审计范围**: src/ 目录
**工具**: ts-prune, grep, 手动分析

---

## 执行摘要

本报告识别了 7zi-project 中未使用的导出、函数、变量和潜在的死代码。共发现：

- **未使用的导出函数/组件**: 8 个
- **未使用的工具函数**: 12 个
- **完全未使用的文件**: 2 个
- **注释掉的代码**: 1 个文件

总计建议清理：**23 个项目**

---

## 1. 未导出的函数/变量

通过 `ts-prune` 工具分析，以下导出的函数/组件在项目中未被使用：

### 1.1 组件级别

| 文件 | 行号 | 导出名称 | 说明 |
|------|------|---------|------|
| `src/components/BottomNav.tsx` | 111 | `BottomNavWrapper` | 完全未使用，可以安全删除 |
| `src/components/ErrorBoundaryWrapper.tsx` | 182 | `AsyncErrorBoundary` | 完全未使用，可以安全删除 |
| `src/components/ExportPanel.tsx` | 362 | `QuickExportButton` | 导出但未在其他文件中使用 |
| `src/components/ExportPanel.tsx` | 350 | `QuickExportButtonProps` | QuickExportButton 的类型定义，随之一并删除 |

**建议操作**:
```typescript
// 删除 src/components/BottomNav.tsx 中的 BottomNavWrapper (行 111-134)
// 删除 src/components/ErrorBoundaryWrapper.tsx 中的 AsyncErrorBoundary (行 182-197)
// 删除 src/components/ExportPanel.tsx 中的 QuickExportButton 和 QuickExportButtonProps (行 350-380)
```

### 1.2 库级别

| 文件 | 行号 | 导出名称 | 说明 |
|------|------|---------|------|
| `src/lib/code-splitting.tsx` | 多处 | `ThreeJS`, `ReactThreeFiber`, `ReactThreeDrei`, `SheetJS`, `OptimizedKnowledgeLatticeScene` | 这些动态导入的组件从未被导入使用 |
| `src/lib/code-splitting.tsx` | 多处 | `preloadChunk`, `preloadThreeJS`, `useLazyLoad`, `getCodeSplittingBestPractices` | 工具函数未被调用 |
| `src/lib/theme-enhanced.ts` | 多处 | `isSystemDark`, `listenSystemThemeChange`, `getEffectiveTheme`, `applyTheme`, `enableThemeTransition`, `getImageFilter`, `getChartColors`, `preventThemeFlash` | 所有导出函数都未被使用（项目使用内联脚本实现主题） |
| `src/lib/timing.ts` | 多处 | `usePerformanceMark`, `useRenderTiming`, `useLongTaskObserver`, `useLayoutShiftObserver`, `useAsyncTiming`, `withTiming`, `createTimedFetch`, `getNavigationTiming`, `getResourceTiming`, `formatDuration` | 所有导出的 hooks 和工具函数都未被使用（仅在测试中使用） |

**注意**: `src/lib/timing.ts` 虽然函数未在业务代码中使用，但拥有完整的测试覆盖。建议保留以备未来使用，或移至 `src/lib/utils` 并标注为工具库。

---

## 2. 空的 useEffect 或未使用的 state

### 2.1 正常使用的 useEffect

检查了所有包含 `useEffect` 的文件，未发现空的 `useEffect` 钩子。所有 `useEffect` 都有适当的依赖数组或清理逻辑。

### 2.2 未使用的 state

#### src/app/global-error.tsx
```typescript
// 行 15-18: useEffect 用于记录错误，是正确使用
useEffect(() => {
  console.error('🚨 Global Error Boundary 捕获到错误:', error);
}, [error]);
```

**结论**: 未发现未使用的 state 或空的 useEffect。

---

## 3. src/lib 和 src/utils 未使用的工具函数

### 3.1 src/lib/code-splitting.tsx
**问题**: 整个文件定义的导出都未被使用

| 导出名称 | 类型 | 使用情况 |
|---------|------|---------|
| `ThreeJS` | 动态组件 | ❌ 未使用 |
| `ReactThreeFiber` | 动态组件 | ❌ 未使用 |
| `ReactThreeDrei` | 动态组件 | ❌ 未使用 |
| `SheetJS` | 动态组件 | ❌ 未使用 |
| `OptimizedKnowledgeLatticeScene` | 动态组件 | ❌ 未使用 |
| `preloadChunk` | 函数 | ❌ 未使用 |
| `preloadThreeJS` | 函数 | ❌ 未使用 |
| `useLazyLoad` | Hook | ❌ 未使用 |
| `getCodeSplittingBestPractices` | 函数 | ❌ 未使用 |

**建议**:
- **选项 A**: 如果项目不使用 Three.js，删除整个文件
- **选项 B**: 保留文件但注释掉未使用的导出，标注为"未来使用"

### 3.2 src/lib/theme-enhanced.ts
**问题**: 所有导出都未被使用（项目使用内联脚本）

| 导出名称 | 使用情况 | 替代方案 |
|---------|---------|---------|
| `isSystemDark()` | ❌ 未使用 | `theme-script-inline.ts` 内联实现 |
| `listenSystemThemeChange()` | ❌ 未使用 | `theme-script-inline.ts` 内联实现 |
| `getEffectiveTheme()` | ❌ 未使用 | `theme-script-inline.ts` 内联实现 |
| `applyTheme()` | ❌ 未使用 | `theme-script-inline.ts` 内联实现 |
| `enableThemeTransition()` | ❌ 未使用 | 内联 CSS |
| `getImageFilter()` | ❌ 未使用 | - |
| `getChartColors()` | ❌ 未使用 | - |
| `preventThemeFlash()` | ❌ 未使用 | `theme-script-inline.ts` 内联实现 |

**建议**: 删除整个文件，功能已被 `theme-script-inline.ts` 替代。

### 3.3 src/lib/timing.ts
**问题**: 所有导出仅在测试中使用，业务代码未使用

| 导出名称 | 业务使用 | 测试使用 |
|---------|---------|---------|
| `usePerformanceMark` | ❌ | ✅ |
| `useRenderTiming` | ❌ | ✅ |
| `useLongTaskObserver` | ❌ | ✅ |
| `useLayoutShiftObserver` | ❌ | ✅ |
| `useAsyncTiming` | ❌ | ✅ |
| `withTiming` | ❌ | ✅ |
| `createTimedFetch` | ❌ | ✅ |
| `getNavigationTiming` | ❌ | ✅ |
| `getResourceTiming` | ❌ | ✅ |
| `formatDuration` | ❌ (与 audio-utils.ts 的 formatDuration 冲突) | ✅ |

**建议**:
- 保留文件（作为性能工具库）
- 添加文件头注释标注为"性能工具库，暂未在业务中使用"

### 3.4 src/lib/lcp-optimization.ts
**问题**: 仅 `initLCPOptimizations` 被使用，其他函数未使用

| 导出名称 | 使用情况 |
|---------|---------|
| `preloadLCPImage` | ❌ 未使用 |
| `preloadCriticalFonts` | ❌ 未使用 |
| `preconnectToCDNs` | ❌ 未使用 |
| `optimizeLCPImage` | ❌ 未使用 |
| `generateSrcSet` | ❌ 未使用 |
| `generateSizes` | ❌ 未使用 |
| `optimizeFontDisplay` | ❌ 未使用 |
| `preloadAndUseCriticalFont` | ❌ 未使用 |
| `inlineCriticalCSS` | ❌ 未使用 |
| `loadCSSAsync` | ❌ 未使用 |
| `deferNonCriticalJS` | ❌ 未使用 |
| `loadJSWhenIdle` | ❌ 未使用 |
| `markLCPElement` | ❌ 未使用 |
| `initLCPOptimizations` | ✅ 被 Analytics.tsx 使用 |

**建议**:
- 保留 `initLCPOptimizations`
- 删除其他未使用的函数

### 3.5 src/lib/user-preferences.ts
**问题**: `useUserPreferences` 被 `src/hooks/usePerformance.ts` 中的同名 hook 遮蔽

- `src/lib/user-preferences.ts` 的 `useUserPreferences` 管理用户语言、主题等偏好
- `src/hooks/usePerformance.ts` 的 `useUserPreferences` 检测系统偏好（motion、dark mode、data saver）

**建议**: 重命名其中一个以避免命名冲突
- 选项 A: `src/lib/user-preferences.ts` 的 hook 保持不变（功能更重要）
- 选项 B: `src/hooks/usePerformance.ts` 的 hook 改名为 `useSystemPreferences`

### 3.6 src/lib/search-filter.ts
**状态**: ✅ 所有导出函数都在使用中

所有函数都在 `src/components/TaskBoardSearch.tsx` 中被使用，无需清理。

---

## 4. 注释掉的代码

### src/lib/code-splitting.tsx
```typescript
// 行 71-81: 注释掉的 ChartJS 导入
// export const ChartJS = dynamic<{ children?: React.ReactNode }>(
//   () => import('chart.js').then((mod) => mod.Chart) as any,
//   {
//     ssr: false,
//     loading: () => null,
//   }
// );

// 行 88-97: 注释掉的 MarkdownParser 导入
// export const MarkdownParser = dynamic(
//   () => import('marked'),
//   {
//     ssr: false,
//     loading: () => null,
//   }
// );
```

**建议**: 如果不打算使用这些库，删除注释掉的代码。

---

## 5. 完全未使用的文件

基于导入分析，以下文件可能完全未被使用（或仅有测试引用）：

| 文件 | 状态 | 建议 |
|------|------|------|
| `src/lib/code-splitting.tsx` | ❌ 完全未使用 | 删除或移至未使用目录 |
| `src/lib/theme-enhanced.ts` | ❌ 完全未使用 | 删除（已被 theme-script-inline.ts 替代） |

---

## 6. 优先级清理建议

### 🔴 高优先级（建议立即清理）

1. **删除 `src/lib/theme-enhanced.ts`**
   - 所有功能已被内联脚本替代
   - 节省约 130 行代码

2. **删除 `src/components/BottomNav.tsx` 中的 `BottomNavWrapper`**
   - 完全未使用
   - 节省约 25 行代码

3. **删除 `src/components/ErrorBoundaryWrapper.tsx` 中的 `AsyncErrorBoundary`**
   - 完全未使用
   - 节省约 16 行代码

4. **删除 `src/components/ExportPanel.tsx` 中的 `QuickExportButton` 和 `QuickExportButtonProps`**
   - 导出但未使用
   - 节省约 30 行代码

### 🟡 中优先级（建议评估后清理）

5. **清理 `src/lib/lcp-optimization.ts`**
   - 保留 `initLCPOptimizations`
   - 删除其他 12 个未使用的函数
   - 预计节省约 250 行代码

6. **删除 `src/lib/code-splitting.tsx`**
   - 整个文件未使用
   - 如果未来需要 Three.js 优化，可以从 git 恢复

7. **解决 `useUserPreferences` 命名冲突**
   - 重命名 `src/hooks/usePerformance.ts` 中的 hook 为 `useSystemPreferences`

### 🟢 低优先级（可选）

8. **删除注释掉的代码**
   - 删除 `src/lib/code-splitting.tsx` 中的 ChartJS 和 MarkdownParser 注释

9. **清理 `src/lib/timing.ts`**
   - 考虑移至 `src/lib/utils/` 并标注为工具库
   - 或添加文件头注释说明暂未使用

---

## 7. 清理执行计划

### 第一步：备份
```bash
git checkout -b cleanup/dead-code-2026-03-21
```

### 第二步：高优先级清理
```bash
# 1. 删除 theme-enhanced.ts
rm src/lib/theme-enhanced.ts

# 2. 清理 BottomNav.tsx
# 手动删除 BottomNavWrapper 导出和相关代码

# 3. 清理 ErrorBoundaryWrapper.tsx
# 手动删除 AsyncErrorBoundary 导出和相关代码

# 4. 清理 ExportPanel.tsx
# 手动删除 QuickExportButton 和 QuickExportButtonProps
```

### 第三步：中优先级清理
```bash
# 5. 清理 lcp-optimization.ts
# 手动保留 initLCPOptimizations，删除其他函数

# 6. 删除 code-splitting.tsx
rm src/lib/code-splitting.tsx

# 7. 重命名 hook
# 在 src/hooks/usePerformance.ts 中
# useUserPreferences -> useSystemPreferences
# 更新所有导入此 hook 的地方
```

### 第四步：低优先级清理
```bash
# 8. 删除注释代码
# 手动删除 code-splitting.tsx 中的注释（如果文件还存在）

# 9. timing.ts
# 添加注释说明暂未使用，或移至 utils/
```

### 第五步：验证
```bash
# 运行类型检查
npm run type-check

# 运行测试
npm run test

# 运行构建
npm run build
```

### 第六步：提交
```bash
git add .
git commit -m "chore: remove unused code and dead code

- Delete src/lib/theme-enhanced.ts (replaced by theme-script-inline.ts)
- Remove BottomNavWrapper from BottomNav.tsx
- Remove AsyncErrorBoundary from ErrorBoundaryWrapper.tsx
- Remove QuickExportButton from ExportPanel.tsx
- Clean up unused functions in lcp-optimization.ts
- Delete src/lib/code-splitting.tsx (unused)
- Rename useUserPreferences to useSystemPreferences in usePerformance.ts

See CODE_DEAD_CODE_CLEANUP.md for details"
```

---

## 8. 风险评估

| 清理项 | 风险等级 | 说明 |
|-------|---------|------|
| 删除 `theme-enhanced.ts` | 🟢 低 | 功能已被内联脚本完全替代 |
| 删除 `BottomNavWrapper` | 🟢 低 | 完全未使用 |
| 删除 `AsyncErrorBoundary` | 🟢 低 | 完全未使用 |
| 删除 `QuickExportButton` | 🟢 低 | 导出但未使用 |
| 清理 `lcp-optimization.ts` | 🟡 中 | 需要确保 `initLCPOptimizations` 仍然可用 |
| 删除 `code-splitting.tsx` | 🟡 中 | 如果未来需要 Three.js，需要重新实现 |
| 重命名 `useUserPreferences` | 🟡 中 | 需要更新所有导入点 |

---

## 9. 清理后预期收益

- **代码行数减少**: 约 550 行
- **文件数量减少**: 1-2 个文件
- **打包体积减少**: 预计减少约 5-10 KB（移除未使用的 Three.js 代码）
- **代码可维护性提升**: 减少混淆，降低理解成本
- **命名冲突解决**: `useUserPreferences` 不再有歧义

---

## 10. 附录：工具和方法

### 使用的工具
- `ts-prune`: 检测未使用的导出
- `grep`: 搜索导入和使用情况
- `find`: 查找相关文件
- 手动分析：验证工具结果

### 分析方法
1. 使用 `ts-prune` 获取所有未使用的导出
2. 使用 `grep -rn` 验证每个导出的实际使用情况
3. 检查 `.test.ts` 文件，区分测试使用和业务使用
4. 检查 `index.ts` 文件，确认是否是导出桶文件
5. 手动检查关键文件，避免误删

---

**报告生成时间**: 2026-03-21 19:20 CET
**审计人**: AI Code Quality Assistant
**下次审计建议**: 2026-04-21（一个月后）
