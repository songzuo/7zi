# PermissionContext → Zustand 状态管理迁移方案

**咨询师报告** | 日期: 2026-04-10

---

## 1. 现状分析

### 1.1 发现的问题

项目存在 **两套并行的权限系统**，存在架构混乱：

#### 系统 A: PermissionContext (React Context)
- 路径: `src/contexts/PermissionContext/`
- 架构: 纯 React Context + useState + useCallback
- 复杂度: 低
- 角色模型: 简单枚举 (ADMIN, USER, GUEST)
- 权限模型: 简单权限列表
- 用途: 前端组件权限检查

#### 系统 B: lib/permissions.ts (RBAC)
- 路径: `src/lib/permissions.ts` (22KB)
- 架构: Class-based PermissionManager + Zustand store
- 复杂度: 高
- 角色模型: RoleDefinition (6种系统角色, 支持自定义角色)
- 权限模型: ResourceType + ActionType 组合
- 用途: API中间件、装饰器、细粒度权限控制

#### 系统 C: permission-store.ts (Zustand)
- 路径: `src/stores/permission-store.ts` (15KB)
- 架构: Zustand store (已存在!)
- 集成: 使用 lib/permissions.ts 的 RBAC 模型
- 状态: **部分实现，不完整**

### 1.2 关键文件清单

| 文件 | 类型 | 职责 |
|------|------|------|
| `src/contexts/PermissionContext/index.tsx` | Context | React Context Provider + Hook |
| `src/contexts/PermissionContext/types.ts` | Types | Role, Permission, User 类型定义 |
| `src/contexts/PermissionContext/utils.ts` | Utils | 权限检查函数 |
| `src/contexts/PermissionContext/components.tsx` | Components | PermissionGuard, AdminGuard |
| `src/lib/permissions.ts` | Core | RBAC 核心逻辑 (PermissionManager) |
| `src/stores/permission-store.ts` | Store | Zustand 权限 Store (已存在) |
| `src/app/providers/PermissionProvider.tsx` | Provider | Provider 入口 |

### 1.3 使用统计

```bash
# PermissionContext 使用情况
grep -r "PermissionContext\|usePermission" src --include="*.tsx" | wc -l
# 结果: 约 10+ 个文件引用

# 主要消费者
- src/lib/auth.ts (re-exports)
- src/stores/index.ts
- src/contexts/PermissionContext/components.tsx
```

---

## 2. 迁移目标

### 2.1 统一状态管理
- 将 PermissionContext 的状态迁移到 Zustand
- 消除 React Context 的 prop drilling 和 re-render 问题
- 利用 Zustand 的 selector 优化实现细粒度订阅

### 2.2 架构整合
```
当前混乱状态:
┌─────────────────────────────────────────────────┐
│  PermissionContext (React Context)              │
│    ├── types.ts (ADMIN/USER/GUEST)              │
│    ├── utils.ts                                 │
│    └── components.tsx                            │
│                                                 │
│  lib/permissions.ts (RBAC Core)                 │
│    └── PermissionManager (Class)                 │
│                                                 │
│  permission-store.ts (Zustand)                  │
│    └── 嫁接在 lib/permissions.ts 上             │
└─────────────────────────────────────────────────┘

目标架构:
┌─────────────────────────────────────────────────┐
│  permission-store.ts (Zustand - 唯一真相源)     │
│    ├── 用户状态 (user, roles, permissions)       │
│    ├── 权限检查方法                              │
│    ├── RBAC 逻辑 (来自 lib/permissions.ts)      │
│    └── 持久化 (localStorage)                    │
│                                                 │
│  lib/permissions.ts (纯逻辑，无状态)            │
│    └── RBAC 算法、类型定义、装饰器               │
└─────────────────────────────────────────────────┘
```

---

## 3. 迁移步骤

### Phase 1: 审计和清理 (1-2天)

#### 步骤 1.1: 枚举所有使用者
```bash
# 列出所有使用 PermissionContext 的文件
grep -r "usePermission\|PermissionProvider\|PermissionGuard\|AdminGuard" \
  src --include="*.tsx" --include="*.ts" -l
```

#### 步骤 1.2: 统一 PermissionContext/types.ts 与 lib/permissions.ts
当前存在类型冲突:
- `PermissionContext/types.ts`: 定义 `Role { ADMIN, USER, GUEST }`
- `lib/permissions.ts`: 定义 `UserRole` 和 `RoleDefinition`

**决策**: 保留 `lib/permissions.ts` 的复杂模型作为核心，让 Context types 去引用它。

#### 步骤 1.3: 分析 permission-store.ts 覆盖率
检查 `permission-store.ts` 是否能完全替代 PermissionContext 的功能。

### Phase 2: Zustand Store 重构 (2-3天)

#### 步骤 2.1: 扩展 permission-store.ts

需要补充 PermissionContext 的功能:

```typescript
// src/stores/permission-store.ts 补充项

// 1. 添加 Auth 状态 (目前缺失)
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  clearUser: () => void
}

// 2. 添加简易权限检查 (兼容现有 Context API)
interface SimplePermissionState {
  hasPermission: (permission: string) => boolean
  hasRole: (role: Role) => boolean
  isAdmin: () => boolean
}

// 3. 添加初始化方法 (从 JWT/Cookie 加载)
interface PermissionState {
  initializeFromToken: (token: string) => Promise<void>
  initializeFromUser: (user: User) => void
}
```

#### 步骤 2.2: 创建 Store 入口
```typescript
// src/stores/index.ts 导出统一 Store
export { usePermissionStore } from './permission-store'
export { useAuthStore } from './auth-store' // 如果需要分离
```

#### 步骤 2.3: 实现向后兼容层

保留 `usePermission` hook 但内部使用 Zustand:

```typescript
// src/hooks/usePermission.ts (新文件)
import { usePermissionStore } from '@/stores/permission-store'
import { Permission, Role } from '@/lib/permissions'

export function usePermission() {
  const store = usePermissionStore()
  
  return {
    user: store.user,
    hasPermission: (permission: Permission) => store.hasPermission(permission),
    hasRole: (role: Role) => store.hasRole?.(role) ?? false,
    isAdmin: () => store.hasRoleLevel?.(100) ?? false,
    canAccessResource: store.canAccessResource,
    setUser: store.setUser,
    clearUser: store.clearUser,
  }
}
```

### Phase 3: 替换 Provider (1天)

#### 步骤 3.1: 修改 PermissionProvider
```typescript
// src/app/providers/PermissionProvider.tsx
// 修改为连接 Zustand Store 和 auth system
```

#### 步骤 3.2: 移除 Context
```typescript
// 不再需要 createContext，直接用 Zustand
```

### Phase 4: 迁移组件 (1-2天)

#### 步骤 4.1: PermissionGuard → Zustand selector
```typescript
// Before (Context)
function MyComponent() {
  const { hasPermission } = usePermission()
  if (!hasPermission(Permission.WRITE)) return null
  return <WriteButton />
}

// After (Zustand)
function WriteButton() {
  const hasWrite = usePermissionStore(state => 
    state.hasPermission?.('write') ?? false
  )
  if (!hasWrite) return null
  return <button />
}
```

#### 步骤 4.2: AdminGuard → Role Level Check
```typescript
// Before
function AdminPanel() {
  const { isAdmin } = usePermission()
  if (!isAdmin()) return <AccessDenied />
  return <AdminContent />
}

// After
function AdminPanel() {
  const isHighLevel = usePermissionStore(state => state.hasRoleLevel(80))
  if (!isHighLevel) return <AccessDenied />
  return <AdminContent />
}
```

### Phase 5: 清理 (1天)

#### 步骤 5.1: 删除旧文件
- `src/contexts/PermissionContext/` 目录 (迁移后删除)

#### 步骤 5.2: 更新 import 路径
```typescript
// 全局替换
import { usePermission } from '@/contexts/PermissionContext'
// → 
import { usePermission } from '@/hooks/usePermission' // 或直接 from '@/stores/permission-store'
```

---

## 4. 风险评估

### 4.1 风险矩阵

| 风险 | 等级 | 影响 | 缓解措施 |
|------|------|------|----------|
| **两套类型系统冲突** | 🔴 高 | 运行时错误 | Phase 1 统一类型定义 |
| **API 破坏性变更** | 🔴 高 | 编译失败 | 保留向后兼容层 |
| **权限检查逻辑不一致** | 🟡 中 | 安全漏洞 | 统一使用 lib/permissions.ts |
| **Context 重渲染优化丢失** | 🟡 中 | 性能下降 | 使用 Zustand selector |
| **测试覆盖不足** | 🟡 中 | 回归风险 | 补充单元测试 |
| **localStorage 迁移** | 🟢 低 | 用户需重新登录 | 提供平滑迁移 |

### 4.2 回滚计划

1. **保留旧文件备份**: 迁移前备份 `contexts/PermissionContext/` 到 `contexts/PermissionContext.bak/`
2. **Feature Flag**: 可通过 env var `USE_NEW_PERMISSION_STORE=true` 切换
3. **快速回滚**: 删除新文件，恢复备份

---

## 5. 详细实施时间线

```
Week 1:
├── Day 1-2: Phase 1 (审计)
├── Day 3-5: Phase 2 (Store 重构)

Week 2:
├── Day 1: Phase 3 (Provider 替换)
├── Day 2-3: Phase 4 (组件迁移)
├── Day 4: Phase 5 (清理)
└── Day 5: 集成测试 + 部署
```

**总工期**: 约 2 周

---

## 6. 关键决策点 (需主人确认)

### 决策 1: 是否保留简易角色模型?
当前 PermissionContext 有 ADMIN/USER/GUEST 三角色，lib/permissions.ts 有 6 种系统角色。

**选项 A**: 统一使用 6 种角色模型 (更强大但更复杂)
**选项 B**: 保留简单模型，仅迁移到 Zustand (快速但功能减少)

### 决策 2: 是否分离 Auth Store 和 Permission Store?
当前设计混合在一起。

**选项 A**: 分离为 auth-store + permission-store (推荐，更清晰)
**选项 B**: 保持单一 permission-store

### 决策 3: 迁移期间兼容层?
是否需要保持旧的 `usePermission` hook 兼容?

---

## 7. 推荐方案

### 方案: 分阶段渐进迁移

```
Phase 1: 创建新的 Zustand store (不修改现有代码)
Phase 2: 添加兼容层，让 PermissionContext 使用 Zustand
Phase 3: 逐步迁移消费者到直接使用 Store
Phase 4: 删除 Context
```

**优点**: 风险低，可回滚
**缺点**: 迁移周期长 (3-4周)

---

## 8. 附录

### A. 相关文档
- `src/lib/permissions.ts` - RBAC 核心文档
- `src/stores/permission-store.ts` - 现有 Zustand Store
- `src/contexts/PermissionContext/COMPLETION-REPORT.md` - 历史报告

### B. Zustand 最佳实践
- 使用 `selector` 避免不必要 re-render
- `persist` middleware 用于 localStorage 持久化
- 避免在 store 外部存储状态

### C. 状态结构建议

```typescript
interface PermissionStoreState {
  // 用户
  user: User | null
  
  // 角色
  roles: RoleDefinition[]
  
  // 直接权限
  directPermissions: Permission[]
  
  // 加载状态
  isLoading: boolean
  error: string | null
  
  // 方法
  initialize: (user: User, roleIds: string[]) => void
  clear: () => void
  hasPermission: (permission: Permission) => boolean
  hasRoleLevel: (level: number) => boolean
  // ...
}
```

---

**报告结束**

咨询师建议: 采用 **渐进迁移方案**，优先统一类型系统，再逐步替换消费者。这样可以最小化风险，确保项目稳定。
