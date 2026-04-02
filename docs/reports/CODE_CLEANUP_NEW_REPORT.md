# 7zi 项目代码清理报告

生成时间: 2026-03-22
分析范围: src/ 目录下的组件、hooks、lib

## 概述

本报告识别了 7zi 项目中的未使用代码、死代码和可优化的代码块，旨在减少项目体积、提高代码质量和可维护性。

---

## 一、未使用的导出（建议删除）

### 1.1 Hooks 目录 - 未使用的导出

#### 1.1.1 `useBatchSelection`

- **文件**: `src/hooks/useBatchSelection.ts`
- **状态**: ✗ 完全未使用
- **原因**: 只有测试文件导入，实际代码中无引用
- **建议**: 删除 `src/hooks/useBatchSelection.ts` 及其测试文件
- **行号**: 全文件
- **影响**: 减少约 9KB 代码

#### 1.1.2 `useGitHubData` 中的辅助函数

- **文件**: `src/hooks/useGitHubData.ts`
- **未使用导出**: `getMockCommits`, `getMockStats`, `getMockIssues`
- **状态**: ✗ 完全未使用
- **原因**: 这些函数仅在 `index.ts` 中导出，但实际代码中未使用
- **建议**: 从 `src/hooks/useGitHubData.ts` 中移除这些函数，或将其移至 `__tests__` 目录
- **行号**: 约 250-350 行
- **影响**: 减少约 2KB 代码

#### 1.1.3 `usePerformance` 中的多个 Hooks

- **文件**: `src/hooks/usePerformance.ts`
- **未使用导出**:
  - `useInView` - 视口检测
  - `useAnimateOnView` - 动画触发（从 useIntersectionObserver 导入但未使用）
  - `useCountUp` - 数字计数动画（从 useIntersectionObserver 导入但未使用）
  - `usePreload` - 组件预加载
  - `useThrottle` - 节流
  - `useUserPreferences` - 用户偏好检测
  - `useMounted` - 挂载状态
  - `useWindowSize` - 窗口尺寸
  - `useScrollPosition` - 滚动位置
- **状态**: ✗ 完全未使用
- **原因**: 这些 hooks 在 `index.ts` 中导出，但项目中没有任何组件使用它们
- **建议**:
  - 将这些 hooks 移至 `src/hooks/usePerformance.ts` 但不在 index.ts 中导出
  - 或者创建 `src/hooks/performance-utils.ts` 单独存放
  - 保留 `useDebounce` 和 `useDevicePerformance`，这两个有实际用途
- **行号**: 全文件（多个函数）
- **影响**: 减少约 15KB 代码

#### 1.1.4 `useIntersectionObserver` 中的辅助函数

- **文件**: `src/hooks/useIntersectionObserver.ts`
- **未使用导出**: `useAnimateOnView`, `useCountUp`
- **状态**: ✗ 完全未使用
- **原因**: 这些函数被 `index.ts` 导出，但实际代码中未使用
- **建议**:
  - 保留核心的 `useIntersectionObserver` hook
  - 删除 `useAnimateOnView` 和 `useCountUp` 或移至 `__tests__` 目录
- **行号**: 约 50-150 行
- **影响**: 减少约 3KB 代码

#### 1.1.5 `useLocalStorage` 中的 `useSessionStorage`

- **文件**: `src/hooks/useLocalStorage.ts`
- **状态**: ✗ 完全未使用（生产代码中）
- **原因**: 只有测试文件使用，实际组件中无引用
- **建议**:
  - 如果不需要 session storage，删除此函数
  - 如果将来可能需要，保留但从 index.ts 中移除导出
- **行号**: 约 50-70 行
- **影响**: 减少约 1KB 代码

#### 1.1.6 `useFetch` 和 `useGitHub`

- **文件**: `src/hooks/useFetch.ts`
- **状态**: ✗ 完全未使用
- **原因**: 只有测试文件使用，实际代码中无引用
- **建议**: 删除 `src/hooks/useFetch.ts` 及其测试文件
- **行号**: 全文件
- **影响**: 减少约 3KB 代码

#### 1.1.7 `useNotifications`

- **文件**: `src/hooks/useNotifications.ts`
- **状态**: ⚠️ 可疑未使用
- **原因**: 在 `index.ts` 中未导出，搜索结果显示无使用
- **建议**: 验证是否真的未使用，如果是则删除
- **行号**: 全文件
- **影响**: 减少约 5KB 代码

#### 1.1.8 `useLongPress`

- **文件**: `src/hooks/useLongPress.ts`
- **状态**: ⚠️ 可疑未使用
- **原因**: 在 `index.ts` 中未导出，搜索结果显示无使用
- **建议**: 验证是否真的未使用，如果是则删除
- **行号**: 全文件
- **影响**: 减少约 3KB 代码

#### 1.1.9 `useSwipeGestures`

- **文件**: `src/hooks/useSwipeGestures.ts`
- **状态**: ⚠️ 可疑未使用
- **原因**: 在 `index.ts` 中未导出，搜索结果显示无使用
- **建议**: 验证是否真的未使用，如果是则删除
- **行号**: 全文件
- **影响**: 减少约 5KB 代码

#### 1.1.10 `useThemeEnhanced`

- **文件**: `src/hooks/useThemeEnhanced.ts`
- **状态**: ⚠️ 可疑未使用
- **原因**: 在 `index.ts` 中未导出，搜索结果显示无使用
- **建议**: 验证是否真的未使用，如果是则删除
- **行号**: 全文件
- **影响**: 减少约 3KB 代码

---

### 1.2 Components 目录 - 未使用的导出

#### 1.2.1 `ActivityLog`

- **文件**: `src/components/ActivityLog.tsx`
- **状态**: ✗ 完全未使用
- **原因**: 在 `index.ts` 中导出，但实际代码中无引用
- **建议**: 删除 `src/components/ActivityLog.tsx` 及其相关测试
- **行号**: 全文件
- **影响**: 减少约 6KB 代码

#### 1.2.2 `BugReportForm`

- **文件**: `src/components/BugReportForm.tsx`
- **状态**: ✗ 完全未使用
- **原因**: 在 `index.ts` 中导出，但实际代码中无引用
- **建议**: 删除 `src/components/BugReportForm.tsx` 及其相关测试
- **行号**: 全文件
- **影响**: 减少约 9KB 代码

#### 1.2.3 `EnhancedFeedbackModal`

- **文件**: `src/components/EnhancedFeedbackModal.tsx`
- **状态**: ✗ 完全未使用
- **原因**: 在 `index.ts` 中导出，但实际代码中无引用
- **注意**: `FeedbackWidget.tsx` 内部使用了 `FeedbackModal`（不是 EnhancedFeedbackModal）
- **建议**: 删除 `src/components/EnhancedFeedbackModal.tsx` 及其相关测试
- **行号**: 全文件
- **影响**: 减少约 15KB 代码

#### 1.2.4 `FeedbackWidget`

- **文件**: `src/components/FeedbackWidget.tsx`
- **状态**: ✗ 完全未使用
- **原因**: 在 `index.ts` 中导出，但实际代码中无引用
- **建议**: 删除 `src/components/FeedbackWidget.tsx` 及其相关测试
- **行号**: 全文件
- **影响**: 减少约 7KB 代码

#### 1.2.5 `GitHubActivity`

- **文件**: `src/components/GitHubActivity.tsx`
- **状态**: ✗ 完全未使用（直接使用）
- **原因**: 只在 `LazyComponents` 中作为 `LazyGitHubActivity` 使用，直接导入的 `GitHubActivity` 未使用
- **建议**:
  - 从 `src/components/index.ts` 中删除直接导出
  - 保留懒加载版本
  - 如果不需要直接访问，可以删除非懒加载版本
- **行号**: 全文件
- **影响**: 减少约 6KB 代码（如果删除直接版本）

#### 1.2.6 `Hero3D`

- **文件**: `src/components/Hero3D.tsx`
- **状态**: ✗ 完全未使用（直接使用）
- **原因**: 只在 `LazyComponents` 中作为 `LazyHero3D` 使用，直接导入的 `Hero3D` 未使用
- **建议**:
  - 从 `src/components/index.ts` 中删除直接导出
  - 保留懒加载版本
  - 如果不需要直接访问，可以删除非懒加载版本
- **行号**: 全文件
- **影响**: 减少约 8KB 代码（如果删除直接版本）

#### 1.2.7 `ExportPanel`

- **文件**: `src/components/ExportPanel.tsx`
- **状态**: ✗ 完全未使用
- **原因**: 在 `index.ts` 中导出，但实际代码中无引用
- **注意**: `DataExportPanel.tsx` 是另一个组件，正在使用中
- **建议**:
  - 删除 `src/components/ExportPanel.tsx` 及其相关测试
  - 保留 `DataExportPanel.tsx`
- **行号**: 全文件
- **影响**: 减少约 14KB 代码

#### 1.2.8 `AnimatedProgressBar` 的多个变体

- **文件**: `src/components/AnimatedProgressBar.tsx`
- **未使用导出**: `WaveProgress`, `SegmentedProgress`, `GradientProgress`, `StepProgress`
- **状态**: ✗ 完全未使用
- **原因**: 只有 `AnimatedProgressBar` 默认导出被使用，这些变体从未被导入
- **建议**:
  - 如果未来可能需要，保留代码但不导出
  - 如果确定不需要，删除这些变体组件
- **行号**: 约 100-400 行
- **影响**: 减少约 10KB 代码（如果删除变体）

---

### 1.3 Lib 目录 - 未使用的模块

#### 1.3.1 `emailjs.ts`

- **文件**: `src/lib/emailjs.ts`
- **状态**: ✗ 完全未使用
- **原因**: 只有测试文件引用，实际代码中无使用
- **建议**:
  - 如果项目中不需要 EmailJS 集成，删除此文件
  - 如果将来可能需要，保留但从公共 API 中移除
- **行号**: 全文件
- **影响**: 减少约 2KB 代码

#### 1.3.2 `crypto/` 目录

- **目录**: `src/lib/crypto/`
- **状态**: ✗ 完全未使用
- **原因**: 整个目录未被任何代码引用
- **建议**:
  - 删除 `src/lib/crypto/` 目录
  - 如果将来需要加密功能，使用成熟的库（如 `crypto-js`）
- **行号**: 全目录
- **影响**: 减少约 3KB 代码

#### 1.3.3 `fallback/` 目录

- **目录**: `src/lib/fallback/`
- **状态**: ✗ 完全未使用
- **原因**: 整个目录未被任何代码引用
- **包含文件**: `circuit-breaker.ts`, `graceful-degradation.ts`
- **建议**:
  - 如果不需要熔断器和优雅降级功能，删除此目录
  - 如果是未来功能，考虑移至 `libs/external` 或文档化其用途
- **行号**: 全目录
- **影响**: 减少约 20KB 代码

#### 1.3.4 `code-splitting.tsx`

- **文件**: `src/lib/code-splitting.tsx`
- **状态**: ✗ 完全未使用
- **原因**: 无任何代码引用此文件
- **建议**: 删除此文件，使用 Next.js 内置的动态导入
- **行号**: 全文件
- **影响**: 减少约 6KB 代码

#### 1.3.5 `agents/` 目录（部分文件）

- **目录**: `src/lib/agents/`
- **问题**: 存在多个版本的同名文件
- **重复文件**:
  - `auth-service.ts` 和 `auth-service-optimized.ts`
  - `repository.ts`, `repository-optimized.ts`, `repository-optimized-v2.ts`
  - `wallet-repository.ts`, `wallet-repository-optimized.ts`, `wallet-repository-optimized-v2.ts`
  - `index.ts` 和 `index-optimized.ts`
- **状态**: ⚠️ 未被外部使用，且存在版本冗余
- **建议**:
  - 选择一个最新版本（如 `*-optimized-v2.ts`）
  - 删除其他版本
  - 重命名为不带后缀的文件名
  - 从 `index.ts` 中导出选定的版本
- **行号**: 整个目录
- **影响**: 减少约 100KB 代码

#### 1.3.6 `agent/` 目录

- **目录**: `src/lib/agent/`
- **包含文件**: `TaskPriorityAnalyzer.ts`, `types.ts`
- **状态**: ✗ 完全未使用
- **原因**: 无任何代码引用此目录
- **建议**:
  - 如果任务优先级分析功能不需要，删除此目录
  - 如果是未来功能，添加 TODO 注释或文档
- **行号**: 全目录
- **影响**: 减少约 16KB 代码

#### 1.3.7 `voice-meeting/` 目录

- **目录**: `src/lib/voice-meeting/`
- **包含文件**: `signaling.ts`
- **状态**: ⚠️ 仅被一个文件引用
- **引用**: `src/lib/websocket/server.ts` 引用了 `setupVoiceMeetingHandlers`
- **建议**:
  - 验证 WebSocket 服务器是否实际运行
  - 如果未使用，删除此目录和 WebSocket 中的相关代码
  - 如果使用中，保留
- **行号**: 全目录
- **影响**: 减少约 16KB 代码（如果删除）

#### 1.3.8 `offline/` 目录

- **目录**: `src/lib/offline/`
- **状态**: ✗ 完全未使用
- **原因**: 无任何代码引用此目录
- **包含文件**: `offline-store.ts`, `sync-manager.ts`, `types.ts`, `useOfflineSync.ts`
- **建议**:
  - 如果离线功能不需要，删除此目录
  - 如果是未来功能，添加 TODO 注释
- **行号**: 全目录
- **影响**: 减少约 32KB 代码

#### 1.3.9 `mcp/` 目录

- **目录**: `src/lib/mcp/`
- **状态**: ✗ 完全未使用
- **原因**: 无任何代码引用此目录
- **包含文件**: `cli.ts`, `http-transport.ts`, `index.ts`, `server.ts`, `tools.ts`
- **建议**:
  - 如果 MCP (Model Context Protocol) 集成不需要，删除此目录
  - 如果是未来功能，添加 TODO 注释
- **行号**: 全目录
- **影响**: 减少约 32KB 代码

---

## 二、可优化的代码块

### 2.1 重复的代码逻辑

#### 2.1.1 多个版本的 Repository 类

- **位置**: `src/lib/agents/`
- **问题**: `repository.ts`, `repository-optimized.ts`, `repository-optimized-v2.ts` 存在大量重复代码
- **建议**:
  - 提取公共接口和基类
  - 合并为一个实现
  - 使用配置参数控制优化级别
- **影响**: 减少约 60KB 重复代码

#### 2.1.2 防抖和节流的多个实现

- **位置**:
  - `src/hooks/usePerformance.ts` - `useDebounce`, `useThrottle`
  - `src/hooks/useDebounce.ts` - 独立的 `useDebounce` hook
- **问题**: 存在两套防抖实现
- **建议**:
  - 统一使用 `usePerformance.ts` 中的实现
  - 删除独立的 `useDebounce.ts`
  - 确保导出正确
- **影响**: 减少约 2KB 代码，提高一致性

### 2.2 可合并的相似函数

#### 2.2.1 反馈表单组件

- **位置**:
  - `src/components/FeedbackModal.tsx`
  - `src/components/EnhancedFeedbackModal.tsx`
- **问题**: 两个组件功能相似，存在大量重复代码
- **建议**:
  - 合并为一个可配置的组件
  - 使用 props 控制增强功能（如截图、附件等）
  - 删除 `EnhancedFeedbackModal`（已经确定未使用）
- **影响**: 减少约 15KB 代码

#### 2.2.2 导出面板组件

- **位置**:
  - `src/components/ExportPanel.tsx`
  - `src/components/DataExportPanel.tsx`
- **问题**: 两个组件功能相似
- **建议**:
  - 验证 `ExportPanel` 是否真的未使用
  - 如果未使用，删除
  - 如果需要，合并为一个组件，使用 props 控制功能
- **影响**: 减少约 14KB 代码

### 2.3 未使用的类型和接口

#### 2.3.1 类型定义文件中的未使用导出

- **位置**: `src/types/`
- **建议**: 使用 TypeScript 工具检查未使用的类型导出
- **命令**:
  ```bash
  npx ts-prune -e
  ```
- **影响**: 预计可减少 5-10KB 类型定义代码

---

## 三、具体修复建议

### 3.1 立即执行（高优先级）

#### 步骤 1: 删除确认未使用的 Hooks

```bash
# 删除未使用的 hooks
rm src/hooks/useBatchSelection.ts
rm src/hooks/useBatchSelection.test.ts
rm src/hooks/useFetch.ts
rm src/hooks/useFetch.test.ts
```

#### 步骤 2: 从 index.ts 中移除未使用的导出

编辑 `src/hooks/index.ts`:

```typescript
// 删除这些行
export { useBatchSelection } from './useBatchSelection'
export { useFetch, useGitHub } from './useFetch'
export { useGitHubData, getMockCommits, getMockStats, getMockIssues } from './useGitHubData'
export { useInView, useAnimateOnView, useCountUp } from './useIntersectionObserver'
export { useLocalStorage, useSessionStorage } from './useLocalStorage'
export {
  useInView,
  usePreload,
  useDebounce,
  useThrottle,
  useUserPreferences,
  useMounted,
  useWindowSize,
  useScrollPosition,
} from './usePerformance'
```

#### 步骤 3: 删除未使用的组件

```bash
# 删除未使用的组件
rm src/components/ActivityLog.tsx
rm src/components/BugReportForm.tsx
rm src/components/EnhancedFeedbackModal.tsx
rm src/components/FeedbackWidget.tsx
rm src/components/ExportPanel.tsx
```

#### 步骤 4: 从 components/index.ts 中移除未使用的导出

编辑 `src/components/index.ts`，删除这些行的导出:

```typescript
export { ActivityLog } from './ActivityLog'
export { BugReportForm } from './BugReportForm'
export { EnhancedFeedbackModal } from './EnhancedFeedbackModal'
export { FeedbackWidget } from './FeedbackWidget'
export { ExportPanel } from './ExportPanel'
export {
  WaveProgress,
  SegmentedProgress,
  GradientProgress,
  StepProgress,
} from './AnimatedProgressBar'
```

#### 步骤 5: 删除未使用的 lib 目录

```bash
# 删除完全未使用的 lib 目录
rm -rf src/lib/crypto
rm -rf src/lib/fallback
rm -rf src/lib/agent
rm -rf src/lib/offline
rm -rf src/lib/mcp
rm src/lib/emailjs.ts
rm src/lib/code-splitting.tsx
```

### 3.2 中期执行（需要验证）

#### 步骤 6: 清理 agents/ 目录的版本冗余

```bash
# 进入 agents 目录
cd src/lib/agents

# 备份（可选）
# cp repository-optimized-v2.ts repository.ts.backup

# 重命名选定版本
mv repository-optimized-v2.ts repository.ts
mv wallet-repository-optimized-v2.ts wallet-repository.ts
mv auth-service-optimized.ts auth-service.ts
mv index-optimized.ts index.ts

# 删除旧版本
rm repository-optimized.ts
rm wallet-repository-optimized.ts
rm wallet-repository.ts

# 更新 index.ts 以导出正确版本
```

编辑 `src/lib/agents/index.ts`:

```typescript
export { AuthService } from './auth-service'
export { Repository } from './repository'
export { WalletRepository } from './wallet-repository'
```

### 3.3 长期执行（架构优化）

#### 步骤 7: 合并相似组件

- 将 `FeedbackModal` 和 `EnhancedFeedbackModal` 合并
- 将 `ExportPanel` 和 `DataExportPanel` 合并
- 提取公共逻辑到独立的 utility 函数

#### 步骤 8: 统一工具函数

- 统一防抖/节流实现
- 统一 localStorage/sessionStorage 处理
- 统一错误处理逻辑

#### 步骤 9: 建立代码审查机制

- 添加 ESLint 规则禁止未使用的导出
- 使用 `ts-prune` 定期检查未使用的类型
- 添加 pre-commit hook 检查新代码

---

## 四、预期收益

### 4.1 代码体积减少

- **Hooks**: 约 35KB
- **Components**: 约 60KB
- **Lib**: 约 220KB
- **总计**: 约 **315KB** 未使用代码可删除

### 4.2 构建优化

- 减少 TypeScript 编译时间
- 减少 Webpack 打包体积
- 加快热更新速度

### 4.3 代码质量提升

- 减少维护负担
- 提高代码可读性
- 降低新人上手难度

---

## 五、风险提示

### 5.1 可能的隐藏依赖

某些导出可能被动态导入（如 `import()`）使用，这些不会被静态分析检测到。建议：

1. 在删除前，运行完整的应用测试套件
2. 检查是否有路由配置中的动态导入
3. 检查是否有配置文件中的组件引用

### 5.2 未来功能需求

某些未使用的代码可能是预留的未来功能：

1. 与产品团队确认这些功能的需求状态
2. 如果需要，添加 TODO 注释说明未来用途
3. 考虑将代码移至 `libs/external/` 或 `docs/reference/` 作为参考

### 5.3 测试覆盖率影响

删除代码会降低测试覆盖率：

1. 删除未使用的测试文件
2. 更新测试覆盖率目标
3. 确保剩余测试仍然覆盖核心功能

---

## 六、验证清单

在执行删除操作前，请完成以下验证：

- [ ] 运行 `npm run test` 确保所有测试通过
- [ ] 运行 `npm run build` 确保构建成功
- [ ] 检查 `src/app/[locale]/page.tsx` 等主要页面的导入
- [ ] 检查路由配置中的动态导入
- [ ] 与产品团队确认未来功能需求
- [ ] 备份当前代码分支
- [ ] 创建新分支进行清理：`git checkout -b cleanup/dead-code`

---

## 七、执行建议

### 阶段 1: 快速清理（1-2小时）

1. 删除确认未使用的 hooks（3.1 步骤 1-2）
2. 删除确认未使用的组件（3.1 步骤 3-4）
3. 删除确认未使用的 lib 目录（3.1 步骤 5）

### 阶段 2: 深度清理（2-4小时）

1. 清理 agents/ 目录版本冗余（3.2 步骤 6）
2. 合并相似组件（3.3 步骤 7）
3. 统一工具函数（3.3 步骤 8）

### 阶段 3: 长期优化（持续）

1. 建立代码审查机制（3.3 步骤 9）
2. 定期运行未使用代码分析
3. 更新开发文档

---

## 八、附录

### 8.1 未使用的文件完整清单

```
src/hooks/useBatchSelection.ts
src/hooks/useBatchSelection.test.ts
src/hooks/useFetch.ts
src/hooks/useFetch.test.ts
src/components/ActivityLog.tsx
src/components/BugReportForm.tsx
src/components/EnhancedFeedbackModal.tsx
src/components/FeedbackWidget.tsx
src/components/ExportPanel.tsx
src/lib/emailjs.ts
src/lib/code-splitting.tsx
src/lib/crypto/
src/lib/fallback/
src/lib/agent/
src/lib/offline/
src/lib/mcp/
```

### 8.2 版本冗余文件清单

```
src/lib/agents/repository-optimized.ts
src/lib/agents/repository.ts
src/lib/agents/wallet-repository-optimized.ts
src/lib/agents/wallet-repository.ts
src/lib/agents/index-optimized.ts
```

### 8.3 需要验证的文件

```
src/lib/voice-meeting/signaling.ts
src/hooks/useNotifications.ts
src/hooks/useLongPress.ts
src/hooks/useSwipeGestures.ts
src/hooks/useThemeEnhanced.ts
```

---

**报告结束**

如有疑问或需要进一步分析，请联系代码审计团队。
