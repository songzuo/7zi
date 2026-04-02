# 7zi-Frontend 架构改进计划

**生成日期**: 2026-03-28
**架构师**: 🏗️ 架构师
**项目版本**: v1.2.0
**状态**: 待执行

---

## 📋 执行摘要

基于对现有架构审查（ARCHITECTURE_REVIEW.md 和 ARCHITECTURE_REVIEW_20260328.md）的分析，本项目架构整体健康（评分 7.3/10），但存在若干需要优化的关键问题。

### 关键发现

| 问题类别           | 严重程度 | 影响范围               | 优先级 |
| ------------------ | -------- | ---------------------- | ------ |
| **lib/ 层碎片化**  | 🔴 高    | 35+ 子模块，职责重叠   | P0     |
| **状态管理不一致** | 🟡 中    | Zustand + Context 混用 | P0     |
| **组件目录混乱**   | 🟡 中    | 19+ 子目录，边界模糊   | P1     |
| **依赖关系未审查** | 🟡 中    | 可能存在循环依赖       | P0     |
| **API 路由设计**   | 🟢 低    | 整体良好，可微调       | P2     |

---

## 🎯 Top 5 架构改进建议

### 1. 🔴 重构 lib/ 层模块结构（P0）

#### 问题描述

`src/lib/` 目录包含 35+ 个子模块，存在严重的碎片化和职责重叠问题：

```
lib/
├── agent/              # Agent 类型定义
├── agents/             # Agent 服务层（auth, repository, wallet）
├── agent-communication/  # Agent 通信
├── api/                # API 客户端
├── services/           # 业务服务层
└── ... (30+ 其他模块)
```

**问题**:

- `agent/`, `agents/`, `agent-communication/` 三个目录职责重叠
- `api/` 和 `services/` 边界不清晰
- 潜在循环依赖风险
- 新开发者难以定位功能

#### 改进方案

**目标结构**:

```
lib/
├── agent/              # 统一的 Agent 模块
│   ├── types.ts
│   ├── auth-service.ts
│   ├── repository.ts
│   ├── wallet-repository.ts
│   └── communication/  # 从 agent-communication/ 迁移
│       ├── message-builder.ts
│       └── types.ts
├── api/                # API 客户端层
│   ├── client.ts
│   ├── endpoints/
│   └── handlers/
├── services/           # 业务服务层（非 Agent）
│   ├── analytics/
│   ├── backup/
│   └── ...
├── db/                 # 数据库层（保持）
├── auth/               # 认证授权（保持）
├── permissions/        # 权限管理（保持）
└── ...
```

**执行步骤**:

```bash
# 1. 合并 Agent 相关模块
mkdir -p src/lib/agent/communication

# 2. 迁移文件
mv src/lib/agent-communication/message-builder.ts src/lib/agent/communication/
mv src/lib/agent-communication/types.ts src/lib/agent/communication/
mv src/lib/agents/* src/lib/agent/
mv src/lib/agent/types.ts src/lib/agent/communication/types.ts

# 3. 删除旧目录（确认无引用后）
rm -rf src/lib/agent-communication
rm -rf src/lib/agents

# 4. 更新导入路径（使用 ast-grep 或 ts-migrate）
# @/lib/agents/repository → @/lib/agent/repository
# @/lib/agent-communication/message-builder → @/lib/agent/communication/message-builder
```

**预期收益**:

- 减少 3 个重复目录
- 明确 Agent 模块职责边界
- 降低循环依赖风险
- 提升代码可读性

**风险评估**: 🟡 中风险

- 大量导入路径需要更新
- 需要全面测试
- 建议分阶段迁移

---

### 2. 🔴 统一状态管理策略（P0）

#### 问题描述

项目同时使用 Zustand stores 和 React Context，缺乏统一规范：

```
stores/                      # Zustand
├── dashboardStore.ts
├── walletStore.ts
├── preferencesStore.ts
├── uiStore.ts
└── filterStore.ts

contexts/                    # React Context
├── PermissionContext.tsx   # 权限管理
├── ChatContext.tsx         # 聊天状态
└── SettingsContext.tsx     # 设置状态
```

**问题**:

- 状态管理方式不统一
- 可能存在状态重复
- Context 性能不如 Zustand
- 学习成本增加

#### 改进方案

**状态管理原则**:

| 场景                              | 推荐方案       | 理由                 |
| --------------------------------- | -------------- | -------------------- |
| **全局状态**（用户、权限）        | Zustand        | 跨组件共享，性能好   |
| **UI 状态**（modal, sidebar）     | Zustand        | 简单高效，支持持久化 |
| **服务端状态**（数据）            | TanStack Query | 自动缓存、重新验证   |
| **Provider 模式**（主题、国际化） | React Context  | 全局配置，树形传递   |

**迁移计划**:

**阶段 1: 迁移 PermissionContext → Zustand**

```typescript
// src/stores/permissionStore.ts (新建)
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface PermissionState {
  context: PermissionContextType | null
  loading: boolean
  error: string | null
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  hasRole: (role: Role) => boolean
  hasAnyRole: (roles: Role[]) => boolean
  refresh: () => Promise<void>
}

export const usePermissionStore = create<PermissionState>()(
  devtools(
    (set, get) => ({
      context: null,
      loading: true,
      error: null,

      hasPermission: permission => {
        return get().context?.permissions.includes(permission) ?? false
      },

      hasAnyPermission: permissions => {
        return permissions.some(p => get().context?.permissions.includes(p))
      },

      // ... 其他方法
    }),
    { name: 'permissionStore' }
  )
)
```

```typescript
// 更新组件使用
// 旧方式:
const { hasPermission } = usePermissions()

// 新方式:
const { hasPermission } = usePermissionStore()
```

**阶段 2: 评估是否迁移 ChatContext 和 SettingsContext**

- **ChatContext** → 保留（如果涉及 WebSocket 连接）
- **SettingsContext** → 迁移到 `preferencesStore.ts`（已有）

**执行步骤**:

```bash
# 1. 创建 permissionStore.ts
# 2. 逐步替换组件中的 usePermissions() → usePermissionStore()
# 3. 删除 PermissionContext.tsx（确认无引用）
# 4. 更新根布局，移除 PermissionProvider
```

**预期收益**:

- 统一状态管理方式
- 减少重复状态
- 提升性能（Zustand > Context）
- 降低学习成本

**风险评估**: 🟢 低风险

- Zustand 成熟稳定
- 迁移可逐步进行
- 不影响现有功能

---

### 3. 🔴 运行循环依赖检测（P0）

#### 问题描述

项目未进行循环依赖分析，可能存在隐藏的循环依赖问题。

**影响**:

- 导致运行时错误
- 模块加载顺序问题
- 难以追踪的 bug

#### 改进方案

**工具选择**: `madge` 或 `dependency-cruiser`

```bash
# 1. 安装依赖分析工具
npm install -D madge
# 或
npm install -D dependency-cruiser

# 2. 运行循环依赖检测
npx madge --circular src/

# 3. 生成依赖图（可选）
npx madge --image dep-graph.png src/

# 4. 使用 dependency-cruiser（更详细）
npx depcruise src/ --output-type err-long --prefix "src/"
```

**CI/CD 集成**:

```yaml
# .github/workflows/dependency-check.yml
name: Dependency Check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - name: Check for circular dependencies
        run: |
          npx madge --circular src/ --extensions ts,tsx
          if [ $? -ne 0 ]; then
            echo "❌ Circular dependencies detected!"
            exit 1
          fi
```

**处理循环依赖**:

**常见模式**:

```typescript
// ❌ 循环依赖
// moduleA.ts
import { funcB } from './moduleB'
export function funcA() {
  /* ... */
}

// moduleB.ts
import { funcA } from './moduleA'
export function funcB() {
  /* ... */
}

// ✅ 解决方案 1: 提取公共模块
// shared/types.ts
export interface CommonType {
  /* ... */
}

// moduleA.ts
import { CommonType } from './shared/types'

// moduleB.ts
import { CommonType } from './shared/types'

// ✅ 解决方案 2: 使用依赖注入
// moduleB.ts
export function funcB(callback: () => void) {
  // 使用回调而不是直接导入
  callback()
}

// moduleA.ts
import { funcB } from './moduleB'
export function funcA() {
  funcB(() => {
    // 在这里调用 funcA 的逻辑
  })
}

// ✅ 解决方案 3: 重构模块结构
// moduleA.ts (高层模块)
import { funcB } from './moduleB'

// moduleB.ts (低层模块)
// 不依赖 moduleA
```

**预期收益**:

- 发现并修复隐藏的循环依赖
- 改善模块架构
- 提高构建稳定性
- 防止未来引入循环依赖

**风险评估**: 🟢 低风险

- 纯检测，不修改代码
- 修复按优先级进行

---

### 4. 🟡 重构组件目录结构（P1）

#### 问题描述

`src/components/` 目录包含 19+ 个子目录，职责边界不清晰：

```
components/
├── shared/      # 通用组件？
├── ui/         # UI 基础组件？
├── fallbacks/  # 错误降级？
├── errors/     # 错误处理？
├── examples/   # 示例代码？
└── ...
```

**问题**:

- `shared/` vs `ui/` 职责重叠
- `errors/` vs `fallbacks/` 边界模糊
- `examples/` 不应出现在生产代码中
- 开发者难以定位组件

#### 改进方案

**目标结构**:

```
components/
├── ui/                    # 基础 UI 组件（可复用）
│   ├── button/
│   ├── input/
│   ├── select/
│   ├── modal/
│   └── ...
├── layouts/               # 布局组件
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Footer.tsx
│   └── ...
├── features/              # 业务功能组件
│   ├── meeting/
│   │   ├── MeetingList.tsx
│   │   ├── MeetingCard.tsx
│   │   └── MeetingDetail.tsx
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageList.tsx
│   │   └── MessageInput.tsx
│   ├── analytics/
│   ├── dashboard/
│   └── ...
├── error-handling/        # 错误处理组件
│   ├── ErrorBoundary.tsx
│   ├── ErrorPage.tsx
│   ├── FallbackUI.tsx
│   └── NotFound.tsx
└── shared/                # 跨功能的共享组件
    ├── UserAvatar.tsx
    ├── LoadingSpinner.tsx
    └── DateRangePicker.tsx
```

**迁移策略**:

```bash
# 1. 创建新的目录结构
mkdir -p src/components/layouts
mkdir -p src/components/features
mkdir -p src/components/error-handling

# 2. 迁移组件
# layouts/
mv src/components/header/* src/components/layouts/ 2>/dev/null || true
mv src/components/footer/* src/components/layouts/ 2>/dev/null || true

# error-handling/
mv src/components/errors/* src/components/error-handling/ 2>/dev/null || true
mv src/components/fallbacks/* src/components/error-handling/ 2>/dev/null || true

# features/ (按业务领域组织)
# meeting/
mv src/components/meeting/* src/components/features/meeting/ 2>/dev/null || true
# chat/
mv src/components/chat/* src/components/features/chat/ 2>/dev/null || true
# ...
```

**组件命名规范**:

```
# ✅ 好的命名
components/features/meeting/MeetingList.tsx
components/ui/button/Button.tsx
components/error-handling/ErrorBoundary.tsx

# ❌ 避免
components/MeetingList.tsx  # 应放在 features/
components/Button.tsx        # 应放在 ui/
components/Error.tsx         # 应放在 error-handling/
```

**预期收益**:

- 清晰的组件层次结构
- 降低组件查找成本
- 提升代码复用性
- 便于新开发者理解

**风险评估**: 🟡 中风险

- 大量文件移动
- 需要更新导入路径
- 建议使用自动化工具

---

### 5. 🟢 简化 Webpack 配置（P2）

#### 问题描述

Next.js Webpack 配置过于复杂，包含 9 个自定义 cacheGroups：

```typescript
// next.config.ts
cacheGroups: {
  'three-libs': { priority: 60, maxSize: 300000 },
  'chart-libs': { priority: 50, maxSize: 200000 },
  'react-libs': { priority: 40, maxSize: 250000 },
  'ui-libs': { priority: 30, maxSize: 200000 },
  'analytics-libs': { priority: 20, maxSize: 150000 },
  'editor-libs': { priority: 15, maxSize: 200000 },
  'markdown-libs': { priority: 10, maxSize: 150000 },
  'common-libs': { priority: 5, maxSize: 150000 },
  'default': { minChunks: 2, priority: 0 },
}
```

**问题**:

- 过度优化（可能是 micro-optimization）
- 维护困难
- 构建时间增加
- 可能导致过多的 HTTP 请求

#### 改进方案

**简化为 3 个核心分组**:

```typescript
// next.config.ts
cacheGroups: {
  // 1. 核心框架（React, Next.js）
  framework: {
    test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
    name: 'framework',
    priority: 20,
    reuseExistingChunk: true,
  },

  // 2. 第三方库（Three.js, Chart.js, etc.）
  vendor: {
    test: /[\\/]node_modules[\\/]/,
    name: 'vendors',
    priority: 10,
    reuseExistingChunk: true,
  },

  // 3. 共享代码
  common: {
    minChunks: 2,
    priority: 5,
    reuseExistingChunk: true,
  },
}
```

**验证步骤**:

```bash
# 1. 构建并分析包大小
npm run build
npm run analyze

# 2. 对比优化前后的包大小和加载性能
# 3. 使用 Lighthouse 测试性能
# 4. 监控真实用户数据（如果可用）
```

**回滚方案**:

```bash
# 如果性能下降，可以回滚到之前的配置
git checkout HEAD~1 next.config.ts
```

**预期收益**:

- 减少构建时间 10-15%
- 简化配置维护
- 减少 HTTP 请求数量
- 让 Webpack 自动优化

**风险评估**: 🟢 低风险

- 可以先在测试环境验证
- 性能影响可测量
- 易于回滚

---

## 📊 其他发现和建议

### 6. API 层架构

**现状**: 整体设计良好，路由组织清晰

**优点**:

- ✅ 统一的错误处理 (`@/lib/api/error-handler`)
- ✅ 参数验证 (`@/lib/api/validation`)
- ✅ OpenAPI 文档注释
- ✅ RBAC 权限控制

**建议**:

- 🟢 考虑引入 tRPC 或类似工具，消除类型转换开销
- 🟢 为 API 路由添加集成测试
- 🟢 统一 SSE 流处理逻辑

### 7. 类型定义

**现状**: 类型定义分散在 `src/types/` 和各模块内部

**建议**:

- 🟢 集中管理共享类型到 `src/types/`
- 🟢 使用命名空间避免冲突
- 🟡 考虑生成 API 类型（从 OpenAPI schema）

### 8. 测试架构

**现状**: 测试覆盖良好，`__tests__/` 目录结构合理

**建议**:

- 🟢 提高集成测试覆盖率
- 🟢 添加快照测试（用于 UI 组件）
- 🟢 使用 MSW (Mock Service Worker) 模拟 API

---

## 🗓️ 实施时间表

### 第一周（P0 优先）

| 任务                             | 预计时间 | 负责人 | 状态      |
| -------------------------------- | -------- | ------ | --------- |
| 运行循环依赖检测                 | 0.5天    | 架构师 | ⏳ 待开始 |
| 合并 lib/agent\* 模块            | 2天      | 架构师 | ⏳ 待开始 |
| 迁移 PermissionContext → Zustand | 1.5天    | 架构师 | ⏳ 待开始 |
| 测试和验证                       | 1天      | 测试员 | ⏳ 待开始 |

**里程碑**: P0 问题全部解决 ✅

### 第二周（P1 优先）

| 任务             | 预计时间 | 负责人          | 状态      |
| ---------------- | -------- | --------------- | --------- |
| 重构组件目录结构 | 3天      | 设计师 + 架构师 | ⏳ 待开始 |
| 更新导入路径     | 1天      | 架构师          | ⏳ 待开始 |
| 全面测试         | 1天      | 测试员          | ⏳ 待开始 |

**里程碑**: P1 问题全部解决 ✅

### 第三周（P2 优化 + 文档）

| 任务              | 预计时间 | 负责人 | 状态      |
| ----------------- | -------- | ------ | --------- |
| 简化 Webpack 配置 | 0.5天    | 架构师 | ⏳ 待开始 |
| 性能验证          | 0.5天    | 测试员 | ⏳ 待开始 |
| 编写架构文档      | 2天      | 架构师 | ⏳ 待开始 |
| 更新开发者指南    | 1天      | 架构师 | ⏳ 待开始 |

**里程碑**: 所有优化完成，文档更新 ✅

---

## 📈 预期收益总结

### 代码质量

| 指标         | 优化前 | 优化后 | 改善   |
| ------------ | ------ | ------ | ------ |
| lib/ 目录数  | 35+    | ~30    | 15% ↓  |
| 组件目录数   | 19+    | 5      | 74% ↓  |
| 循环依赖数   | 未知   | 0      | 100% ↓ |
| 状态管理方式 | 2种    | 1种    | 50% ↓  |

### 性能指标

| 指标               | 优化前   | 优化后   | 改善   |
| ------------------ | -------- | -------- | ------ |
| 构建时间           | ~45s     | ~40s     | 11% ↓  |
| Webpack 配置复杂度 | 9 groups | 3 groups | 67% ↓  |
| 包请求数           | ~15      | ~5       | 67% ↓  |
| 状态管理性能       | 中等     | 优秀     | ~20% ↑ |

### 开发效率

| 指标             | 优化前 | 优化后 | 改善   |
| ---------------- | ------ | ------ | ------ |
| 组件查找时间     | 长     | 短     | ~50% ↓ |
| 新开发者理解时间 | 长     | 短     | ~40% ↓ |
| 重构风险         | 高     | 低     | ~60% ↓ |
| 代码可维护性     | 中     | 高     | 显著 ↑ |

---

## 🛡️ 风险管理

### 高风险操作

| 操作             | 风险         | 缓解措施                         |
| ---------------- | ------------ | -------------------------------- |
| 合并 lib/agent\* | 导入路径断裂 | 使用 ast-grep 自动更新，全面测试 |
| 重构组件目录     | 导入路径断裂 | 分阶段迁移，每次迁移后测试       |
| 迁移状态管理     | 状态丢失     | 保留旧实现作为备份，逐步替换     |

### 回滚计划

```bash
# 为每个阶段创建备份点
git commit -m "backup: before architecture refactoring - phase 1"

# 如果出现问题，快速回滚
git reset --hard HEAD~1
```

---

## 📝 后续建议

### 长期改进方向

1. **引入 Feature-based 目录结构**（可选）

   ```
   src/
   ├── features/
   │   ├── meeting/
   │   │   ├── components/
   │   │   ├── hooks/
   │   │   ├── store.ts
   │   │   └── types.ts
   │   └── chat/
   │       └── ...
   └── shared/
   ```

2. **建立架构决策记录 (ADR)**
   - 创建 `docs/architecture/adr-001-zustand-vs-context.md`
   - 记录每个架构决策的原因和权衡

3. **定期架构审查**
   - 每季度进行一次架构审查
   - 更新架构文档
   - 记录技术债务

4. **CI/CD 集成架构检查**
   - 自动检测循环依赖
   - 检查目录深度限制
   - 验证导入路径规范

### 技术栈演进

**短期（3-6个月）**:

- ✅ 完成上述重构
- 🟢 考虑引入 tRPC 或类似的类型安全的 API 层
- 🟢 提升 TypeScript 严格性

**中期（6-12个月）**:

- 🟡 考虑迁移到 Feature-based 目录结构
- 🟡 引入 Monorepo（如果项目规模扩大）
- 🟡 评估 Server Components 的深度使用

**长期（1-2年）**:

- 🟡 探索微前端架构（如果适用）
- 🟡 评估其他框架迁移（如果必要）

---

## ✅ 检查清单

### 立即执行（本周）

- [ ] 安装依赖分析工具（madge 或 dependency-cruiser）
- [ ] 运行循环依赖检测
- [ ] 记录发现的循环依赖
- [ ] 创建架构改进的备份点

### 第一周（P0）

- [ ] 合并 lib/agent\* 模块
- [ ] 迁移 PermissionContext → Zustand
- [ ] 修复所有循环依赖
- [ ] 全面测试

### 第二周（P1）

- [ ] 重构组件目录结构
- [ ] 更新所有导入路径
- [ ] 验证功能完整性

### 第三周（P2 + 文档）

- [ ] 简化 Webpack 配置
- [ ] 性能测试和验证
- [ ] 编写架构文档
- [ ] 更新开发者指南

---

## 📚 参考资料

### 工具

- [madge](https://github.com/pahen/madge) - 循环依赖检测
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) - 依赖分析
- [ast-grep](https://ast-grep.github.io/) - AST 重构
- [ts-migrate](https://github.com/airbnb/ts-migrate) - TypeScript 迁移

### 架构模式

- [Feature-based Slicing](https://feature-sliced.design/)
- [DDD (Domain-Driven Design)](https://martinfowler.com/tags/domain%20driven%20design.html)
- [ADR (Architecture Decision Records)](https://adr.github.io/)

### Next.js 最佳实践

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Performance Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Turbopack](https://turbo.build/pack)

---

**报告完成时间**: 2026-03-28 15:39
**架构师**: 🏗️ 架构师
**审核人**: 待定
**下次审查**: 2026-04-28（P0 完成后）
**状态**: ✅ 已完成，待执行
