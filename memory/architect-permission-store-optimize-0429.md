# 架构师报告 - Permission Store 性能优化分析

**日期**: 2026-04-29 13:50 GMT+2  
**角色**: 🏗️ 架构师 (Architect Subagent)  
**任务**: 分析 permission-store.ts 性能问题并提出优化方案

---

## 📊 当前架构分析

### 1. 文件基本信息

| 文件 | 路径 | 行数 | 大小 |
|------|------|------|------|
| permission-store.ts | `7zi-frontend/src/stores/` | 547 | 14.8KB |
| permissions.ts | `7zi-frontend/src/lib/` | 812 | ~25KB |

### 2. 系统架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        权限系统架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐ │
│  │ permission-store │     │   lib/permissions │     │ Permission  │ │
│  │    (Zustand)     │ ──▶ │   (RBAC Core)     │     │  Context     │ │
│  │                  │     │                   │     │ (React)      │ │
│  │ - 状态管理        │     │ - 角色定义         │     │              │ │
│  │ - 持久化         │     │ - 权限检查         │     │ - 简单检查    │ │
│  │ - 缓存           │     │ - 中间件           │     │ - 无缓存      │ │
│  └─────────────────┘     └─────────────────┘     └──────────────┘ │
│           │                       │                     │          │
│           └───────────────────────┼─────────────────────┘          │
│                                   ▼                                │
│                    ┌────────────────────────┐                     │
│                    │   Auth Store (auth-store) │                   │
│                    └────────────────────────┘                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. 核心问题识别

#### 🚨 P0 优先级问题

##### 问题 1: 权限检查缓存未失效 (Bug!)

**位置**: `permission-store.ts` lines 250-300

**问题描述**:
```typescript
// grantPermission 和 revokePermission 没有清除缓存！
grantPermission: (permission: Permission) => {
  // ... 修改 permissions
  // ❌ 没有调用 clearPermissionCheckCache()
}

revokePermission: (permission: Permission) => {
  // ... 修改 permissions
  // ❌ 没有调用 clearPermissionCheckCache()
}
```

**影响**:
- 用户权限变更后，缓存仍返回旧数据
- UI 无法正确反映权限变更
- 权限安全漏洞

**修复**:
```typescript
grantPermission: (permission: Permission) => {
  // ... existing logic ...
  clearPermissionCheckCache()  // 添加！
  return true
}

revokePermission: (permission: Permission) => {
  // ... existing logic ...
  clearPermissionCheckCache()  // 添加！
  return true
}
```

##### 问题 2: 缓存无上限增长 (内存泄漏风险)

**位置**: `permission-store.ts` lines 85-100

**问题描述**:
```typescript
const permissionCheckCache = new Map<string, PermissionCheckResult>()
```

**问题**:
- 无 TTL (Time-To-Live)
- 无大小限制
- 只在 `initializePermissions` 和 `clearPermissions` 时清除
- 长期使用会持续增长

**影响**: 内存持续增长，UI 性能下降

**建议修复**:
```typescript
const MAX_CACHE_SIZE = 500

function addToCache(key: string, value: PermissionCheckResult) {
  if (permissionCheckCache.size >= MAX_CACHE_SIZE) {
    // 删除最老的 25% 条目
    const keysToDelete = Array.from(permissionCheckCache.keys()).slice(0, Math.floor(MAX_CACHE_SIZE * 0.25))
    keysToDelete.forEach(k => permissionCheckCache.delete(k))
  }
  permissionCheckCache.set(key, value)
}
```

#### ⚠️ P1 优先级问题

##### 问题 3: Helper Hook 函数性能问题

**位置**: `permission-store.ts` lines 470-498

**问题描述**:
```typescript
export const useHasPermission = (permission: Permission) => {
  return usePermissionStore(state => state.hasPermission(permission))
  //                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                          每次渲染都创建新函数引用！
}
```

**问题**:
- 每个组件实例创建新函数选择器
- `shallow` 比较无法优化
- 导致不必要的重渲染

**建议修复**:
```typescript
// 使用 stable selector
export const useHasPermission = (permission: Permission) => {
  return usePermissionStore(
    useCallback(state => state.hasPermission(permission), [permission])
  )
}
```

##### 问题 4: persist 存储完整 RoleDefinition

**位置**: `permission-store.ts` lines 510-530

**问题描述**:
```typescript
partialize: state => ({
  userPermissions: state.userPermissions,  // 存储完整 RoleDefinition[]
})
```

**问题**:
- 存储完整的 `roles: RoleDefinition[]`，包含所有权限数组
- 每次加载需要解析大量数据
- localStorage 大小增加

**建议修复**:
```typescript
partialize: state => ({
  userPermissions: state.userPermissions ? {
    userId: state.userPermissions.userId,
    roleIds: state.userPermissions.roleIds,
    // 不存储 roles，让 initializePermissions 重建
    permissions: state.userPermissions.permissions,
  } : null,
})
```

#### 📋 P2 优先级问题

##### 问题 5: 多重权限系统并存

**发现**:
- `lib/permissions.ts` - 完整 RBAC 系统 (roles, permissions)
- `contexts/PermissionContext/` - 简化系统 (仅 Role enum)
- `stores/permission-store.ts` - Zustand 封装

**问题**:
- 维护困难
- 逻辑不一致
- 开发者困惑

##### 问题 6: hasPermission 重复遍历

**位置**: `permission-store.ts` lines 195-205

```typescript
hasPermission: (permission: Permission) => {
  const { userPermissions } = get()
  if (!userPermissions) return false

  // 检查直接权限
  if (userPermissions.permissions.includes(permission)) {  // O(n)
    return true
  }

  // 检查角色权限 - 每次遍历所有角色
  return userPermissions.roles.some(role => 
    role.permissions.includes(permission)  // O(roles * permissions)
  )
}
```

**建议**: 使用 Set 进行权限检查
```typescript
// 在 initializePermissions 时构建 permission Set
const permissionSet = new Set([
  ...userPermissions.permissions,
  ...userPermissions.roles.flatMap(r => r.permissions)
])
```

---

## 🔧 优化建议 (按优先级)

### 🚨 P0 - 立即修复

| # | 优化项 | 影响 | 工作量 |
|---|--------|------|--------|
| 1 | grantPermission/revokePermission 添加缓存清除 | 安全 + UX | 5 分钟 |
| 2 | 添加缓存大小限制 | 内存泄漏 | 15 分钟 |

### 📋 P1 - 近期修复

| # | 优化项 | 影响 | 工作量 |
|---|--------|------|--------|
| 3 | Helper hooks 使用 useCallback | 重渲染减少 | 20 分钟 |
| 4 | persist 只存储 roleIds | 加载速度 | 30 分钟 |
| 5 | hasPermission 使用 Set | 检查速度 | 25 分钟 |

### 📅 P2 - 规划中

| # | 优化项 | 影响 | 工作量 |
|---|--------|------|--------|
| 6 | 统一权限系统 (3→1) | 可维护性 | 1-2 天 |
| 7 | 添加权限缓存 TTL | 长期稳定性 | 1 小时 |
| 8 | 测试覆盖 | 代码质量 | 2-3 小时 |

---

## 📈 预计改进效果

| 指标 | 当前 | 优化后 | 改进 |
|------|------|--------|------|
| 权限检查缓存内存 | 无上限增长 | 最大 500 条 | ~80% 减少 |
| 权限变更生效延迟 | 需重新登录 | 立即生效 | 100% 修复 |
| UI 重渲染次数 | 每次状态变更 | 仅依赖变更 | ~30% 减少 |
| localStorage 大小 | ~2-5KB/用户 | ~500B/用户 | ~80% 减少 |
| 权限检查时间 | O(roles) | O(1) | ~50% 提升 |

---

## 🛠️ 建议实施步骤

### Step 1: 紧急 Bug 修复 (5 分钟)
修复 `grantPermission` 和 `revokePermission` 不清除缓存的问题

### Step 2: 缓存大小限制 (15 分钟)
防止内存泄漏

### Step 3: Helper Hooks 优化 (30 分钟)
使用 `useCallback` 稳定选择器

### Step 4: Persist 优化 (30 分钟)
只存储 roleIds，减少 localStorage 大小

### Step 5: 统一权限系统 (1-2 天)
规划文档见下方

---

## 📝 架构决策建议

### 决策 1: 统一权限系统

**问题**: 当前有 3 套权限系统

**建议**: 保留 `lib/permissions.ts` (RBAC 完整版)，弃用或重构 `PermissionContext`

**理由**:
- `lib/permissions.ts` 功能更完整
- `permission-store.ts` 已正确集成
- `PermissionContext` 功能重复

### 决策 2: 权限缓存策略

**当前**: 无 TTL 的 Map
**建议**: LRU Cache 或带 TTL 的 Map

```typescript
interface CacheEntry {
  value: PermissionCheckResult
  timestamp: number
}

// TTL: 5 分钟
const TTL_MS = 5 * 60 * 1000
```

### 决策 3: 选择器模式

**当前**: inline selectors
**建议**: 
```typescript
// 在 store 外部定义 stable selectors
const selectUserId = (state: PermissionState) => state.userPermissions?.userId
const selectRoles = (state: PermissionState) => state.userPermissions?.roles
```

---

## 📋 相关文件

| 文件 | 用途 | 状态 |
|------|------|------|
| `7zi-frontend/src/stores/permission-store.ts` | Zustand 权限 Store | 需优化 |
| `7zi-frontend/src/lib/permissions.ts` | RBAC 核心库 | 稳定 |
| `7zi-frontend/src/contexts/PermissionContext/` | React Context | 建议重构 |

---

*报告生成: 2026-04-29 13:50 GMT+2*
*架构师 | 🏗️ Architect Subagent*