# 🏗️ 架构师代码审查报告

**项目**: 7zi 前端 (Next.js)  
**审查日期**: 2026-04-25  
**审查者**: 架构师子代理  
**模型**: minimax/MiniMax-M2.7

---

## 📋 执行摘要

7zi 前端是一个功能丰富的 Next.js 应用(v1.14.1)，采用 App Router + Zustand + TypeScript 技术栈。代码库规模约 **1300+ 文件**，存在以下主要架构问题需要关注：

| 优先级 | 问题 | 影响 |
|--------|------|------|
| 🔴 高 | 大文件单点实现 | `permissions.ts` (945行)、`search-filter.ts` (886行)、`uiStore.ts` (732行) |
| 🔴 高 | 异步store混用同步接口 | `dashboardStore.ts` 直接 `await` 在 Zustand action 中 |
| 🟡 中 | 42处 `as any` / `@ts-ignore` | 类型安全问题 |
| 🟡 中 | 30+ TODO 未完成 | 遗留技术债务 |
| 🟢 低 | 部分组件过重 | `AnimatedProgressBar.tsx` 666行、TeamActivityTracker 601行 |

---

## 1. 关键问题详解

### 1.1 问题：超大文件单点实现

#### `permissions.ts` (945 行)
```typescript
// 问题：单一文件包含 RBAC 全部逻辑
// - 系统权限定义 (SYSTEM_PERMISSIONS)
// - 角色定义 (ROLE_DEFINITIONS)
// - 权限检查函数 (checkPermission, hasPermission, requirePermission)
// - 资源访问规则 (RESOURCE_ACCESS_RULES)
// - 中间件装饰器 (@RequirePermission)
// - 数据库操作 (getUserPermissions, getRolePermissions)
```

**建议拆分方案**:
```
src/lib/auth/permissions/
├── types.ts              # Permission, RoleDefinition, ResourceType 等类型
├── system-permissions.ts  # SYSTEM_PERMISSIONS 常量
├── role-definitions.ts   # ROLE_DEFINITIONS
├── checker.ts             # checkPermission, hasPermission 函数
├── decorators.ts          # @RequirePermission 装饰器
├── resource-rules.ts     # RESOURCE_ACCESS_RULES
└── index.ts              # 统一导出
```

#### `search-filter.ts` (886 行)
**问题**: 搜索/过滤/排序/选项提取全部堆在一个文件

**建议拆分**:
```
src/lib/search-filter/
├── config.ts              # SearchConfig, FilterConfig 类型
├── cache.ts               # 缓存键生成函数
├── search.ts              # searchItems, fuzzySearch, pinyinSearch
├── filter.ts              # applyFilters, buildFilterTree
├── sort.ts                # sortItems, multiSort
├── options.ts             # extractOptions 工具函数
└── index.ts
```

---

### 1.2 问题：Zustand Store 中混用 async

`dashboardStore.ts` 第322-374行：
```typescript
// ❌ 不推荐：在 store action 中直接 await
fetchAllData: async () => {
  const [issuesData, commitsData] = await Promise.all([
    fetchIssues(owner, repo, token),
    fetchCommits(owner, repo, token)
  ])
  set({ issues: issuesData, commits: commitsData })
}

// ✅ 推荐：分离同步 state 更新和异步数据获取
fetchAllData: () => {
  set({ isLoading: true, error: null })
  return async (dispatch) => {
    const [issuesData, commitsData] = await Promise.all([...])
    dispatch({ issues: issuesData, commits: commitsData, isLoading: false })
  }
}
```

**更严重问题**：这类混合导致：
- TypeScript 类型推断失败
- SSR 时行为不确定
- 测试 mock 复杂度上升

**建议**: 引入 `zustand/middleware/persist` AsyncStorage 适配，或使用 TanStack Query 管理服务端状态。

---

### 1.3 问题：类型安全问题 (42处)

主要集中在：
```typescript
// auth/service.ts - JWT 验证绕过
// @ts-ignore - JWT verification not implemented yet

// lib/utils - 泛型类型不精确
const unifiedCache = new LRUCache<unknown>(100)  // 避免 any 但 unknown 也过于宽泛

// stores/uiStore.ts:544
// @ts-ignore - Map.entries() type doesn't perfectly match Array<[string, FormDraft]>
```

**建议**: 逐步为 `LRUCache<T>` 及其他泛型工具添加更精确的类型约束，减少 `as any`。

---

### 1.4 问题：30+ 未完成的 TODO

关键 TODO 分类：

**安全类 (需立即处理)**:
```typescript
// src/lib/audit-log/export-service.ts:124
// TODO: 实际的签名验证  ← 安全漏洞

// src/app/api/admin/rate-limit/rules/route.ts:70
// TODO: Implement proper JWT verification  ← 管理 API 未鉴权
```

**功能缺失类**:
```typescript
// src/lib/workflow/triggers.ts:808
// TODO(P2): 实现完整的 Cron 表达式解析  ← 工作流调度核心功能

// src/lib/economy/pricing.ts:286
// TODO: 集成真实会员系统后，从用户档案获取会员等级  ← 计费系统不完整
```

---

## 2. 代码组织问题

### 2.1 组件目录结构问题

```
src/components/
├── AnimatedProgressBar.tsx    (666行) ← 过大
├── TeamActivityTracker.tsx    (601行) ← 过大
├── LazyLoadImage.tsx          (541行)
├── SearchFilter.tsx           (512行)
├── ErrorDisplay.tsx           (467行)
└── LazyComponents.tsx         (463行)
```

**建议**: 对于超过 400 行的组件，考虑：
1. 提取子组件 (`AnimatedProgressBar/` 目录)
2. 提取 hooks (`useAnimatedProgress.ts`)
3. 提取样式 (`AnimatedProgressBar.styles.ts`)

### 2.2 重复的 Export Panel

```
src/components/ExportPanel.tsx      (417行)
src/components/DataExportPanel.tsx  (381行)
```

**建议**: 合并为单一组件，通过 props 控制导出类型。

---

## 3. 中间件层问题

`src/middleware/` 目录存在职责混淆：
```
auth.middleware.ts (71行)
auth.ts           (141行)  ← 与 auth.middleware.ts 职责重叠
cors.ts           (351行)
index.ts          (180行)
```

**建议**: 统一为单一 `auth.ts` 中间件，使用策略模式区分不同场景。

---

## 4. 具体改进建议

### 4.1 立即可做 (1-2天)

| 文件 | 操作 | 收益 |
|------|------|------|
| `permissions.ts` | 拆分为 5+ 个文件 | 可维护性 ↑ |
| `auth.ts` 中间件 | 合并重复逻辑 | 减少维护成本 |
| `@ts-ignore` 清理 | 替换为精确类型 | 类型安全 |

### 4.2 短期改进 (1周)

| 操作 | 描述 |
|------|------|
| Zustand 异步模式标准化 | 统一 dashboardStore/walletStore 的 async 处理 |
| TODO 优先级排序 | 将 P1 TODO 转为 Issue 追踪 |
| 组件拆分 | AnimatedProgressBar、TeamActivityTracker |

### 4.3 中期重构 (1月)

| 模块 | 目标 |
|------|------|
| 权限系统 | 完成 JWT 验证签名、清理 TODO |
| 工作流引擎 | 完成 Cron 解析、触发器重构 |
| 搜索模块 | 拆分 search-filter.ts，重构统一搜索 |

---

## 5. 正面发现 (值得保持)

✅ **良好的测试覆盖**: `__tests__` 目录结构完整  
✅ **类型使用**: 大部分代码使用 TypeScript 严格模式  
✅ **性能监控**: `performance-optimization.ts` 等监控基础设施完善  
✅ **错误处理**: `ErrorBoundary.tsx` 组件级错误处理良好  
✅ **LRU 缓存**: `lib/cache/lru-cache.ts` 基础设施可用

---

## 6. 架构健康度评分

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| 代码组织 | 6 | 大文件问题突出 |
| 类型安全 | 7 | 整体良好，少量 any |
| 测试覆盖 | 7 | 测试文件齐全 |
| 错误处理 | 8 | ErrorBoundary 完善 |
| 性能监控 | 8 | 监控基础设施好 |
| **总体** | **7/10** | 中等偏上，需关注大文件 |

---

## 附录：关键文件行数统计

| 文件 | 行数 | 建议 |
|------|------|------|
| `permissions.ts` | 945 | 立即拆分 |
| `search-filter.ts` | 886 | 立即拆分 |
| `uiStore.ts` | 732 | 中期拆分 |
| `AnimatedProgressBar.tsx` | 666 | 中期拆分 |
| `enhanced-permissions.ts` | 548 | 审查必要性 |
| `useWebRTCMeeting.ts` | 637 | 关注复杂度 |

---

**报告生成时间**: 2026-04-25T23:40 GMT+2  
**模型**: minimax/MiniMax-M2.7