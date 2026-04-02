# PermissionContext 迁移计划

**创建时间**: 2026-03-30  
**状态**: 分析完成，待实施  
**版本**: v1.5.0

---

## 📋 概述

本文档描述将现有权限系统迁移到 React Context 架构的计划。目标是在 v1.5.0 开发周期内完成 PermissionContext 的设计与实现。

### 现状分析

| 组件                     | 位置                                                | 说明                                                           |
| ------------------------ | --------------------------------------------------- | -------------------------------------------------------------- |
| `PermissionContext` 接口 | `src/lib/permissions.ts`                            | 已定义，包含 userId, resourceOwnerId, resourceId, resourceType |
| 权限管理器               | `src/lib/permissions.ts`                            | PermissionManager 类，包含 hasPermission, canAccessResource 等 |
| WebSocket 权限           | `src/features/websocket/room/permission-manager.ts` | 独立的房间权限管理实现                                         |
| API 路由权限             | `src/app/api/*/route.ts`                            | 各 API 路由中内联权限检查                                      |

### 问题

1. **分散的权限逻辑** - 权限检查散布在 lib/permissions.ts、WebSocket 模块、API 路由中
2. **无 React Context** - 前端组件无法轻松访问权限状态
3. **重复实现** - WebSocket 的 permission-manager 与 lib/permissions.ts 功能重叠
4. **API 与前端不一致** - API 路由的权限检查与前端可能不同步

---

## 🎯 目标

1. 创建统一的 `PermissionContext` React Context
2. 提供 `usePermission` Hook 供前端组件使用
3. 统一权限检查逻辑，消除代码重复
4. 支持实时权限更新（WebSocket 事件）

---

## 🏗️ 设计方案

### 1. PermissionContext 接口

```typescript
// src/contexts/permission-context.tsx

interface PermissionState {
  userId: string
  userRole: UserRole
  permissions: Permission[]
  isLoading: boolean
}

interface PermissionContextValue extends PermissionState {
  // 权限检查
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  canAccess: (resourceType: ResourceType, action: ActionType) => boolean

  // 资源级别的权限
  canAccessResource: (resourceId: string, action: PermissionAction) => boolean
  isResourceOwner: (resourceId: string) => boolean

  // 角色检查
  hasRole: (roleId: string) => boolean
  hasMinLevel: (level: number) => boolean
}

interface PermissionProviderProps {
  children: React.ReactNode
  initialUser?: User
}
```

### 2. usePermission Hook

```typescript
// src/hooks/use-permission.ts

export function usePermission(): PermissionContextValue;
export function usePermission(resourceId: string): PermissionContextValue;

// 使用示例
function DeleteButton({ resourceId }: { resourceId: string }) {
  const { canAccessResource, isResourceOwner } = usePermission();

  if (!isResourceOwner(resourceId) && !canAccessResource(resourceId, 'delete')) {
    return null;
  }

  return <button>Delete</button>;
}
```

### 3. 与 WebSocket 权限集成

WebSocket 的 `permission-manager.ts` 需要重构为使用 PermissionContext：

```typescript
// 统一后
import { usePermission } from '@/hooks/use-permission'

class RoomManager {
  constructor(private permissionContext: PermissionContextValue) {}

  checkPermission(roomId: string, userId: string, action: PermissionAction): boolean {
    const { canAccessResource } = this.permissionContext
    return canAccessResource(roomId, `room:${action}`)
  }
}
```

---

## 📦 实施步骤

### Phase 1: 创建 PermissionContext (预计 2 小时)

1. 创建 `src/contexts/permission-context.tsx`
2. 实现基本的 Provider 和 Context
3. 实现权限检查方法
4. 创建 `src/hooks/use-permission.ts`

### Phase 2: 迁移现有权限逻辑 (预计 3 小时)

1. 更新 `src/lib/permissions.ts` 导出共享函数
2. 重构 WebSocket `permission-manager.ts` 使用 PermissionContext
3. 创建 API 路由权限中间件使用共享逻辑

### Phase 3: 前端组件迁移 (预计 2 小时)

1. 识别使用权限的前端组件
2. 替换内联权限检查为 usePermission Hook
3. 测试权限功能正常工作

### Phase 4: 测试和文档 (预计 1 小时)

1. 编写 PermissionContext 单元测试
2. 更新 API 文档
3. 编写迁移指南

---

## ⚠️ 风险和依赖

| 风险           | 影响 | 缓解措施                 |
| -------------- | ---- | ------------------------ |
| 现有代码依赖   | 高   | 保持向后兼容，创建过渡层 |
| WebSocket 集成 | 中   | 分阶段迁移，先独立测试   |
| 测试覆盖       | 中   | 添加端到端权限测试       |

---

## 📊 工时估算

| 阶段     | 工作量     | 累计   |
| -------- | ---------- | ------ |
| Phase 1  | 2 小时     | 2 小时 |
| Phase 2  | 3 小时     | 5 小时 |
| Phase 3  | 2 小时     | 7 小时 |
| Phase 4  | 1 小时     | 8 小时 |
| **总计** | **8 小时** | -      |

---

## ✅ 验收标准

1. `usePermission` Hook 在所有前端组件中正常工作
2. WebSocket 权限检查与 API 路由一致
3. 权限变更实时反映在 UI
4. 现有测试全部通过
5. 文档完整

---

## 📝 待决策事项

1. 是否需要支持细粒度的资源级别权限（如"只能编辑自己的任务"）？
2. 权限变更是否需要 audit log？
3. 是否需要权限缓存（减少 API 调用）？

---

**下一步**: 待产品确认后开始 Phase 1 实施。
