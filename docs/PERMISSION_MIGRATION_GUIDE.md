# 权限系统迁移指南（Context → Zustand）

**最后更新**: 2026-03-31  
**版本**: v1.5.0-dev  
**难度**: ⭐⭐ 中等  
**时间**: 15-30 分钟

---

## 📋 迁移概述

### 目标

将 React Context-based 权限系统迁移到 Zustand store，提升性能和可维护性。

### 迁移状态

| 项目               | 状态    |
| ------------------ | ------- |
| Zustand store 实现 | ✅ 完成 |
| 兼容层实现         | ✅ 完成 |
| TypeScript 编译    | ✅ 通过 |
| 向后兼容性         | ✅ 保持 |

---

## 🎯 迁移优势

### 性能提升

| 指标          | Context (旧)         | Zustand (新)   |
| ------------- | -------------------- | -------------- |
| 重渲染        | 全局订阅者           | 精确订阅       |
| Provider 嵌套 | 需要                 | 不需要         |
| 状态持久化    | 需额外配置           | 内置           |
| 包大小        | React Context (内置) | zustand (~1KB) |

### 开发体验

- ✅ 更简洁的 API
- ✅ 更好的 TypeScript 支持
- ✅ 内置 DevTools
- ✅ 易于测试

---

## 📦 新架构

### 文件结构

```
src/
├── stores/
│   └── permissionStore.ts    # Zustand Store (核心实现)
└── contexts/
    └── PermissionContext.tsx # 兼容层 (向后兼容)
```

### Zustand Store 核心接口

```typescript
interface PermissionState {
  // 状态
  userId: string | null
  permissions: Permission[]
  roles: Role[]
  customPermissions: Permission[] | null
  loading: boolean
  error: string | null
  initialized: boolean

  // Actions
  initializeFromAuth(auth: AuthData): void
  initializeFromAuthData(data: AuthResponse): void
  reset(): void
  setLoading(loading: boolean): void
  setError(error: string | null): void

  // Getters
  hasPermission(perm: Permission): boolean
  hasAnyPermission(perms: Permission[]): boolean
  hasAllPermissions(perms: Permission[]): boolean
  hasRole(role: Role): boolean
  hasAnyRole(roles: Role[]): boolean
  hasAllRoles(roles: Role[]): boolean
  isAdmin(): boolean
  isManagerOrAdmin(): boolean
  isMemberOrHigher(): boolean
  isGuest(): boolean
  getContext(): PermissionContext | null
}

// Selector Hooks (优化重渲染)
export const usePermissionLoading = () => usePermissionStore(s => s.loading)
export const usePermissionError = () => usePermissionStore(s => s.error)
export const usePermissions = () => usePermissionStore(s => s.permissions)
export const useRoles = () => usePermissionStore(s => s.roles)
export const useIsAdmin = () => usePermissionStore(s => s.isAdmin())
export const useIsManagerOrAdmin = () => usePermissionStore(s => s.isManagerOrAdmin())
export const useIsMemberOrHigher = () => usePermissionStore(s => s.isMemberOrHigher())
export const useIsGuest = () => usePermissionStore(s => s.isGuest())
export const usePermissionActions = () =>
  usePermissionStore(s => ({
    initializeFromAuth: s.initializeFromAuth,
    initializeFromAuthData: s.initializeFromAuthData,
    reset: s.reset,
    setLoading: s.setLoading,
    setError: s.setError,
    refresh: s.refresh,
  }))
export const usePermissionHelpers = () =>
  usePermissionStore(s => ({
    hasPermission: s.hasPermission,
    hasAnyPermission: s.hasAnyPermission,
    hasAllPermissions: s.hasAllPermissions,
    hasRole: s.hasRole,
    hasAnyRole: s.hasAnyRole,
    hasAllRoles: s.hasAllRoles,
    isAdmin: s.isAdmin,
    isManagerOrAdmin: s.isManagerOrAdmin,
    isMemberOrHigher: s.isMemberOrHigher,
    isGuest: s.isGuest,
    getContext: s.getContext,
  }))
```

---

## 🔄 迁移步骤

### Step 1: 更新导入（推荐）

```typescript
// 旧方式
import { usePermissions } from '@/contexts/PermissionContext'

// 新方式（推荐）
import { usePermissionStore, useIsAdmin, usePermissionLoading } from '@/stores'
```

### Step 2: 更新 Hook 使用

#### 旧代码

```typescript
import { usePermissions } from '@/contexts/PermissionContext';

function MyComponent() {
  const { hasPermission, isAdmin, loading } = usePermissions();

  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  if (!hasPermission('task:create')) {
    return <div>No permission</div>;
  }

  return <div>Content</div>;
}
```

#### 新代码（推荐）

```typescript
import {
  usePermissionStore,
  useIsAdmin,
  usePermissionLoading
} from '@/stores';

function MyComponent() {
  const loading = usePermissionLoading();
  const isAdmin = useIsAdmin();
  const hasPermission = usePermissionStore(state =>
    state.hasPermission('task:create')
  );

  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  if (!hasPermission) {
    return <div>No permission</div>;
  }

  return <div>Content</div>;
}
```

#### 或者（使用 Selector Hooks）

```typescript
import { usePermissionStore } from '@/stores';

function MyComponent() {
  const loading = usePermissionStore(state => state.loading);
  const isAdmin = usePermissionStore(state => state.isAdmin());
  const hasPermission = usePermissionStore(state =>
    state.hasPermission('task:create')
  );

  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  if (!hasPermission) {
    return <div>No permission</div>;
  }

  return <div>Content</div>;
}
```

### Step 3: 更新 Gate 组件（无需修改）

```typescript
// Gate 组件仍然可用，无需修改
import { PermissionGate, RoleGate } from '@/contexts/PermissionContext';

function MyPage() {
  return (
    <div>
      <PermissionGate permission="task:create">
        <button>Create Task</button>
      </PermissionGate>

      <RoleGate role="admin">
        <AdminPanel />
      </RoleGate>
    </div>
  );
}
```

### Step 4: 更新 HOCs（无需修改）

```typescript
// HOCs 仍然可用，无需修改
import { withPermission, withRole } from '@/contexts/PermissionContext'

const ProtectedComponent = withPermission('task:create')(MyComponent)
const RoleProtectedComponent = withRole('admin')(MyComponent)
```

### Step 5: 更新 Provider（可选）

```typescript
// 旧方式（仍然可用）
<PermissionProvider>
  <App />
</PermissionProvider>

// 新方式（不需要 Provider）
// Zustand store 可以直接使用，无需 Provider 包裹
// 如果需要初始化逻辑，可以保留 PermissionProvider
<PermissionProvider>
  <App />
</PermissionProvider>
```

---

## 🎨 使用示例

### 示例 1: 简单权限检查

```typescript
import { usePermissionStore } from '@/stores';

function TaskButton() {
  const hasPermission = usePermissionStore(state =>
    state.hasPermission('task:create')
  );

  if (!hasPermission) return null;

  return <button>Create Task</button>;
}
```

### 示例 2: 管理员检查

```typescript
import { useIsAdmin, usePermissionLoading } from '@/stores';

function AdminPanel() {
  const isAdmin = useIsAdmin();
  const loading = usePermissionLoading();

  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  return <div>Admin content</div>;
}
```

### 示例 3: 多权限检查

```typescript
import { usePermissionStore } from '@/stores';

function MultiPermissionCheck() {
  const store = usePermissionStore();

  // 检查任意权限
  if (store.hasAnyPermission(['task:create', 'task:update'])) {
    return <button>Edit Tasks</button>;
  }

  // 检查所有权限
  if (store.hasAllPermissions(['task:create', 'task:read'])) {
    return <div>Full access</div>;
  }

  return <div>Limited access</div>;
}
```

### 示例 4: 角色检查

```typescript
import { usePermissionStore } from '@/stores';

function RoleBasedContent() {
  const store = usePermissionStore();

  if (store.isAdmin()) {
    return <AdminContent />;
  }

  if (store.isManagerOrAdmin()) {
    return <ManagerContent />;
  }

  if (store.isMemberOrHigher()) {
    return <MemberContent />;
  }

  return <GuestContent />;
}
```

### 示例 5: 使用 Helpers

```typescript
import { usePermissionHelpers } from '@/stores';

function PermissionCheck() {
  const helpers = usePermissionHelpers();

  const checkPermissions = () => {
    console.log('Has admin permission:', helpers.isAdmin());
    console.log('Has manager or higher:', helpers.isManagerOrAdmin());
    console.log('Has create permission:', helpers.hasPermission('task:create'));
    console.log('Has any permission:', helpers.hasAnyPermission(['task:create', 'task:update']));
    console.log('Has all permissions:', helpers.hasAllPermissions(['task:create', 'task:read']));
  };

  return <button onClick={checkPermissions}>Check Permissions</button>;
}
```

---

## 🧪 测试迁移

### 测试 Hook

```typescript
import { renderHook, act } from '@testing-library/react'
import { usePermissionStore } from '@/stores'

describe('Permission Tests', () => {
  beforeEach(() => {
    // 重置 store 状态
    usePermissionStore.getState().reset()
  })

  it('should check admin permission', () => {
    usePermissionStore.getState().initializeFromAuthData({
      user: { id: '1', name: 'Admin', email: 'admin@test.com', roles: ['admin'] },
      permissions: ['all'],
      roles: ['admin'],
    })

    const isAdmin = usePermissionStore.getState().isAdmin()
    expect(isAdmin).toBe(true)
  })

  it('should check specific permission', () => {
    usePermissionStore.getState().initializeFromAuthData({
      user: { id: '1', name: 'User', email: 'user@test.com', roles: ['member'] },
      permissions: ['task:create', 'task:read'],
      roles: ['member'],
    })

    const hasPermission = usePermissionStore.getState().hasPermission('task:create')
    expect(hasPermission).toBe(true)

    const noPermission = usePermissionStore.getState().hasPermission('task:delete')
    expect(noPermission).toBe(false)
  })
})
```

### 测试组件

```typescript
import { render, screen } from '@testing-library/react';
import { usePermissionStore } from '@/stores';

function TestComponent() {
  const isAdmin = usePermissionStore(state => state.isAdmin());

  return isAdmin ? <div>Admin</div> : <div>Not Admin</div>;
}

describe('Permission Component', () => {
  beforeEach(() => {
    usePermissionStore.getState().reset();
  });

  it('should show admin content', () => {
    usePermissionStore.getState().initializeFromAuthData({
      user: { id: '1', name: 'Admin', email: 'admin@test.com', roles: ['admin'] },
      permissions: ['all'],
      roles: ['admin'],
    });

    render(<TestComponent />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should show guest content', () => {
    render(<TestComponent />);
    expect(screen.getByText('Not Admin')).toBeInTheDocument();
  });
});
```

---

## 📊 迁移检查清单

### 代码检查

- [ ] 更新所有 `usePermissions` 导入
- [ ] 使用 Selector Hooks 优化重渲染
- [ ] 验证所有权限检查功能正常
- [ ] 验证 Gate 组件正常工作
- [ ] 验证 HOCs 正常工作

### 测试检查

- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] E2E 测试通过
- [ ] 手动测试验证

### 性能检查

- [ ] 重渲染次数减少
- [ ] DevTools 正常工作
- [ ] 控制台无错误
- [ ] 性能指标改善

---

## 🚨 常见问题

### Q: 必须迁移吗？

A: 不是。旧的 `usePermissions()` hook 和 `PermissionProvider` 仍然可用，内部已切换到 Zustand。可以逐步迁移。

### Q: 迁移后性能会有明显提升吗？

A: 对于大型应用或权限检查频繁的场景，性能提升会很明显。对于小型应用，差异可能不太明显。

### Q: 兼容层会一直保留吗？

A: 短期内会保留。长期来看，建议新代码直接使用 Zustand API。

### Q: 如何选择使用 Zustand 还是兼容层？

A:

- **新代码**: 直接使用 Zustand（性能更好，API 更简洁）
- **旧代码**: 继续使用 `usePermissions()`（无需修改）

### Q: Provider 还需要吗？

A: 不需要。Zustand store 可以直接使用，无需 Provider 包裹。`PermissionProvider` 现在只是用于初始化逻辑。

### Q: 如何在组件外部使用权限检查？

A: 使用 store 的 `getState` 方法：

```typescript
import { usePermissionStore } from '@/stores'

// 在组件外部
const authStore = usePermissionStore.getState()
if (authStore.isAdmin()) {
  console.log('Is admin')
}
```

---

## 📚 相关文档

- [用户使用指南](./USER_GUIDE.md) - 完整使用指南
- [Zustand Stores 使用示例](./zustand-stores-usage.md)
- [PermissionContext 迁移报告](./permission-context-migration-report.md)
- [API 文档](./API.md)
- [开发指南](./DEVELOPMENT.md)

---

## 🎉 下一步

完成迁移后，你可以：

1. **监控性能**: 使用 React DevTools Profiler 检查重渲染次数
2. **优化代码**: 使用 Selector Hooks 进一步优化
3. **清理旧代码**: 逐步移除不再需要的兼容代码
4. **编写测试**: 为新的权限检查逻辑添加测试

---

**需要帮助？** 查看 [permission-context-migration-report.md](./permission-context-migration-report.md) 获取详细技术报告。
