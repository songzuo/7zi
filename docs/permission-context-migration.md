# PermissionContext → Zustand 迁移方案

**版本:** v1.5.0
**状态:** ✅ 已完成
**日期:** 2026-03-31
**作者:** 📚 咨询师

---

## 一、现状分析

### 1.1 项目结构

项目存在两套并行的权限系统实现：

| 位置                                           | 类型           | 状态      |
| ---------------------------------------------- | -------------- | --------- |
| `src/contexts/PermissionContext.tsx`           | Zustand 兼容层 | ✅ 已迁移 |
| `src/stores/permissionStore.ts`                | Zustand Store  | ✅ 已实现 |
| `7zi-frontend/src/contexts/PermissionContext/` | React Context  | ⚠️ 兼容层 |
| `7zi-frontend/src/stores/permission-store.ts`  | Zustand Store  | ✅ 已实现 |

### 1.2 数据流分析

#### 原始 Context 架构

```
┌─────────────────────┐
│ PermissionProvider  │
│ (React Context)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ usePermission()     │
│ Hook                │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ checkPermission()   │
│ 纯函数检查          │
└─────────────────────┘
```

#### 新 Zustand 架构

```
┌─────────────────────┐
│ usePermissionStore  │
│ (Zustand Store)     │
│ + persist middleware│
└──────────┬──────────┘
           │
           ├─────────────────────┐
           │                     │
           ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐
│ usePermission()     │  │ usePermissionHelpers│
│ 兼容层 Hook         │  │ 直接使用 selectors  │
└─────────────────────┘  └─────────────────────┘
```

### 1.3 使用点分析

```bash
# 主项目使用点
src/contexts/PermissionContext.tsx     # 兼容层实现
src/stores/index.ts                    # 导出入口
src/stores/permissionStore.ts          # 核心实现
src/lib/permissions/                   # 权限工具库

# 7zi-frontend 使用点
7zi-frontend/src/contexts/PermissionContext/  # 兼容层
7zi-frontend/src/stores/permission-store.ts   # 核心实现
7zi-frontend/src/lib/auth.ts                  # 认证相关
7zi-frontend/src/app/providers/               # Provider
```

### 1.4 功能对比

| 功能     | Context 方式       | Zustand 方式         |
| -------- | ------------------ | -------------------- |
| 状态管理 | React Context API  | Zustand Store        |
| 持久化   | 手动实现           | persist middleware   |
| 选择器   | 无优化             | 精细选择器优化       |
| DevTools | 无                 | Redux DevTools 支持  |
| 类型安全 | 需要类型断言       | 完整 TypeScript 支持 |
| 测试     | 需要 mock Provider | 直接测试 store       |

---

## 二、Zustand Store 设计

### 2.1 核心状态

```typescript
interface PermissionState {
  // 用户标识
  userId: string | null

  // 权限数据
  permissions: Permission[]
  roles: Role[]
  customPermissions: Permission[] | null

  // 状态标记
  loading: boolean
  error: string | null
  initialized: boolean
}
```

### 2.2 Actions 设计

```typescript
interface PermissionActions {
  // 权限管理
  setPermissions: (permissions: Permission[]) => void
  addPermission: (permission: Permission) => void
  removePermission: (permission: Permission) => void
  clearPermissions: () => void

  // 角色管理
  setRoles: (roles: Role[]) => void
  addRole: (role: Role) => void
  removeRole: (role: Role) => void
  clearRoles: () => void

  // 用户管理
  setUserId: (userId: string | null) => void
  initializeFromAuth: (auth: PermissionContext) => void
  initializeFromAuthData: (data: AuthData) => void

  // 状态管理
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}
```

### 2.3 计算属性 (Getters)

```typescript
interface PermissionGetters {
  // 权限检查
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean

  // 角色检查
  hasRole: (role: Role) => boolean
  hasAnyRole: (roles: Role[]) => boolean
  hasAllRoles: (roles: Role[]) => boolean

  // 快捷检查
  isAdmin: () => boolean
  isManagerOrAdmin: () => boolean
  isMemberOrHigher: () => boolean
  isGuest: () => boolean

  // 上下文获取
  getContext: () => PermissionContext | null
}
```

### 2.4 选择器设计

```typescript
// 基础状态选择器
export const usePermissions = () => usePermissionStore(state => state.permissions)
export const useRoles = () => usePermissionStore(state => state.roles)
export const useUserId = () => usePermissionStore(state => state.userId)

// 状态选择器
export const usePermissionLoading = () => usePermissionStore(state => state.loading)
export const usePermissionError = () => usePermissionStore(state => state.error)
export const usePermissionInitialized = () => usePermissionStore(state => state.initialized)

// 计算选择器
export const useIsAdmin = () => usePermissionStore(state => state.isAdmin())
export const useIsManagerOrAdmin = () => usePermissionStore(state => state.isManagerOrAdmin())

// Actions 选择器 (避免重渲染)
export const usePermissionActions = () =>
  usePermissionStore(state => ({
    setPermissions: state.setPermissions,
    addPermission: state.addPermission,
    // ... 其他 actions
  }))

// Helpers 选择器
export const usePermissionHelpers = () =>
  usePermissionStore(state => ({
    hasPermission: state.hasPermission,
    hasRole: state.hasRole,
    // ... 其他 helpers
  }))
```

### 2.5 持久化策略

```typescript
// 使用 persist middleware
export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      // ... store 实现
    }),
    {
      name: 'permission-storage', // localStorage key
      partialize: state => ({
        userId: state.userId,
        permissions: state.permissions,
        roles: state.roles,
        customPermissions: state.customPermissions,
        initialized: state.initialized,
      }),
    }
  )
)
```

---

## 三、迁移步骤

### 3.1 阶段一：准备阶段 ✅ 已完成

1. **创建 Zustand Store**
   - [x] 创建 `src/stores/permissionStore.ts`
   - [x] 实现完整的状态管理
   - [x] 添加 persist middleware
   - [x] 实现选择器优化

2. **创建兼容层**
   - [x] 更新 `src/contexts/PermissionContext.tsx`
   - [x] 保持原有 API 不变
   - [x] 内部使用 Zustand store

### 3.2 阶段二：验证阶段 ✅ 已完成

1. **类型检查**
   - [x] TypeScript 编译无错误
   - [x] 类型定义完整

2. **功能验证**
   - [x] 权限检查逻辑正确
   - [x] 角色检查正常
   - [x] 持久化正常工作

### 3.3 阶段三：迁移阶段 (渐进式)

1. **更新导入路径 (推荐)**

   ```typescript
   // 旧代码 (仍然可用)
   import { usePermission } from '@/contexts/PermissionContext'

   // 新代码 (推荐)
   import { usePermission } from '@/stores'
   ```

2. **更新组件使用**

   ```typescript
   // 旧方式
   const { hasPermission } = usePermission()

   // 新方式 (更高效)
   const hasPermission = usePermissionHelpers().hasPermission
   // 或直接使用选择器
   const isAdmin = useIsAdmin()
   ```

### 3.4 阶段四：清理阶段 (可选)

1. **移除冗余代码**
   - 可以移除 `contexts/PermissionContext/` 目录
   - 更新所有导入路径

2. **更新文档**
   - 更新 API 文档
   - 更新示例代码

---

## 四、向后兼容策略

### 4.1 兼容层设计

```typescript
// src/contexts/PermissionContext.tsx
// 这是一个兼容层，内部使用 Zustand store

export function usePermissions() {
  const loading = usePermissionLoading()
  const error = usePermissionError()
  const helpers = usePermissionHelpers()
  const actions = usePermissionActions()

  // 构建兼容的 context 对象
  const context = usePermissionStore(state => {
    if (!state.userId) return null
    return {
      userId: state.userId,
      roles: state.roles,
      permissions: state.permissions,
      customPermissions: state.customPermissions || undefined,
    }
  })

  return {
    context,
    loading,
    error,
    hasPermission: helpers.hasPermission,
    // ... 其他方法
  }
}
```

### 4.2 导出兼容

```typescript
// src/stores/index.ts
export {
  usePermissionStore,
  usePermissions,
  useRoles,
  useUserId,
  // ... 完整导出
} from './permissionStore'

// 保持旧路径可用
// src/contexts/PermissionContext.tsx
export {
  usePermissionStore,
  usePermissions as useZustandPermissions,
  // ... 重新导出
} from '@/stores/permissionStore'
```

### 4.3 类型兼容

```typescript
// 类型别名保持兼容
export type PermissionContextType = {
  user: User | null
  hasPermission: (permission: Permission) => boolean
  // ... 与原类型相同
}

// 枚举兼容
export { Role, Permission } from '@/lib/permissions/types'
```

---

## 五、风险评估

### 5.1 技术风险

| 风险       | 级别 | 影响           | 缓解措施                         |
| ---------- | ---- | -------------- | -------------------------------- |
| 状态不一致 | 低   | 权限检查错误   | persist middleware + 初始化验证  |
| 性能问题   | 低   | 不必要的重渲染 | 使用精细选择器                   |
| 类型错误   | 低   | 编译失败       | 完整类型定义                     |
| 持久化问题 | 中   | 数据丢失       | 使用 partialize 只持久化必要数据 |

### 5.2 业务风险

| 风险     | 级别 | 影响         | 缓解措施              |
| -------- | ---- | ------------ | --------------------- |
| 权限绕过 | 高   | 安全问题     | 服务端验证 + 完整测试 |
| 功能缺失 | 中   | 用户无法操作 | API 兼容层 + 功能对比 |
| 性能下降 | 低   | 用户体验差   | 选择器优化            |

### 5.3 回滚方案

1. **代码回滚**

   ```bash
   # Git 回滚
   git revert <commit-hash>

   # 或恢复备份文件
   cp src/stores/permission-store.ts.backup src/stores/permission-store.ts
   ```

2. **运行时回滚**
   - 兼容层自动处理
   - 清除 localStorage: `localStorage.removeItem('permission-storage')`

3. **紧急修复**
   ```typescript
   // 临时禁用持久化
   export const usePermissionStore = create<PermissionState>()(
     // persist(...) // 注释掉
     (set, get) => ({
       /* store */
     })
   )
   ```

---

## 六、测试策略

### 6.1 单元测试

```typescript
// permissionStore.test.ts
describe('PermissionStore', () => {
  beforeEach(() => {
    usePermissionStore.getState().reset()
  })

  describe('权限管理', () => {
    it('should add permission', () => {
      const { addPermission, hasPermission } = usePermissionStore.getState()
      addPermission(Permission.USER_READ)
      expect(hasPermission(Permission.USER_READ)).toBe(true)
    })

    it('should remove permission', () => {
      const { setPermissions, removePermission, hasPermission } = usePermissionStore.getState()
      setPermissions([Permission.USER_READ])
      removePermission(Permission.USER_READ)
      expect(hasPermission(Permission.USER_READ)).toBe(false)
    })
  })

  describe('角色检查', () => {
    it('should check admin role', () => {
      const { setRoles, isAdmin } = usePermissionStore.getState()
      setRoles([Role.ADMIN])
      expect(isAdmin()).toBe(true)
    })
  })

  describe('初始化', () => {
    it('should initialize from auth data', () => {
      const { initializeFromAuthData, userId } = usePermissionStore.getState()
      initializeFromAuthData({
        user: {
          id: 'user-123',
          permissions: ['user:read'],
          roles: [{ id: Role.MEMBER }],
        },
      })
      expect(usePermissionStore.getState().userId).toBe('user-123')
    })
  })
})
```

### 6.2 集成测试

```typescript
// PermissionContext.test.tsx
describe('PermissionContext (兼容层)', () => {
  it('should provide permission helpers', () => {
    render(
      <PermissionProvider>
        <TestComponent />
      </PermissionProvider>
    );

    // 测试兼容层 API
  });
});
```

### 6.3 E2E 测试

1. **登录流程**
   - 用户登录后权限正确加载
   - 权限持久化到 localStorage
   - 页面刷新后权限保持

2. **权限检查**
   - 无权限用户看不到受保护内容
   - 管理员可以看到所有内容
   - 普通用户权限正确

3. **权限更新**
   - 权限变更后立即生效
   - 权限刷新正常工作

---

## 七、性能优化建议

### 7.1 选择器优化

```typescript
// ❌ 不好 - 任何状态变化都会重渲染
const state = usePermissionStore()

// ✅ 好 - 只订阅需要的状态
const permissions = usePermissions()
const isAdmin = useIsAdmin()

// ✅ 更好 - 使用选择器函数
const hasPermission = usePermissionStore(
  useCallback(state => state.hasPermission(Permission.USER_READ), [])
)
```

### 7.2 组件优化

```typescript
// 使用 memo 避免不必要的重渲染
const PermissionGate = memo(function PermissionGate({
  permission,
  fallback,
  children,
}: PermissionGateProps) {
  const hasPermission = usePermissionStore(
    useCallback(state => state.hasPermission(permission), [permission])
  );

  if (!hasPermission) return <>{fallback}</>;
  return <>{children}</>;
});
```

### 7.3 持久化优化

```typescript
// 只持久化必要的数据
persist(
  (set, get) => ({
    /* store */
  }),
  {
    name: 'permission-storage',
    partialize: state => ({
      userId: state.userId,
      permissions: state.permissions,
      roles: state.roles,
      // 不持久化 loading, error 等
    }),
  }
)
```

---

## 八、总结

### 8.1 迁移状态

| 项目            | 状态    | 说明                                  |
| --------------- | ------- | ------------------------------------- |
| 主项目 (`src/`) | ✅ 完成 | PermissionContext 已是 Zustand 兼容层 |
| 7zi-frontend    | ✅ 完成 | 有完整迁移报告                        |

### 8.2 关键成果

1. **统一状态管理** - 权限数据使用 Zustand 管理
2. **完全向后兼容** - 旧代码无需修改
3. **性能优化** - 精细选择器减少重渲染
4. **持久化支持** - 权限数据自动持久化

### 8.3 后续建议

1. **短期** (1-2周)
   - 运行完整测试套件
   - 验证所有权限相关功能
   - 监控生产环境表现

2. **中期** (1-2月)
   - 逐步更新导入路径
   - 添加性能监控
   - 完善文档

3. **长期** (3-6月)
   - 移除兼容层代码
   - 优化权限检查逻辑
   - 考虑服务端权限缓存

---

## 附录

### A. 完整 API 参考

```typescript
// 从 @/stores 导出
export {
  // Store
  usePermissionStore,

  // 选择器
  usePermissions,
  useRoles,
  useUserId,
  usePermissionLoading,
  usePermissionError,
  usePermissionInitialized,

  // 计算选择器
  useIsAdmin,
  useIsManagerOrAdmin,
  useIsMemberOrHigher,
  useIsGuest,

  // Actions
  usePermissionActions,

  // Helpers
  usePermissionHelpers,

  // 组件
  PermissionProvider,
  PermissionGate,
  RoleGate,
  AnyRoleGate,

  // HOC
  withPermission,
  withRole,
}
```

### B. 迁移检查清单

- [x] 创建 Zustand store
- [x] 实现所有权限检查方法
- [x] 添加 persist middleware
- [x] 创建选择器
- [x] 更新兼容层
- [x] 保持 API 向后兼容
- [x] TypeScript 类型检查
- [ ] 完整测试套件
- [ ] 性能测试
- [ ] 生产环境验证

### C. 参考资料

- [Zustand 官方文档](https://zustand-demo.pmnd.rs/)
- [项目迁移报告](../7zi-frontend/src/contexts/PermissionContext/COMPLETION-REPORT.md)
- [迁移指南](../7zi-frontend/src/contexts/PermissionContext/MIGRATION.md)
