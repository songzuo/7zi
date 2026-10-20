# Zustand Store 审计报告

**审计日期**: 2026-04-04
**审计人员**: Executor 子代理
**项目**: 7zi-frontend
**版本**: v1.12.x

## 📋 执行摘要

本次审计对 `/root/7zi-frontend/src/stores/` 目录下的 6 个 Zustand stores 进行了全面检查，重点识别了不必要的重渲染问题、过度嵌套或冗余的状态，以及偏离最佳实践的地方。

### 关键发现

| Store | 严重问题 | 中等问题 | 轻微问题 | 总计 |
|-------|---------|---------|---------|------|
| auth-store.ts | 2 | 1 | 0 | 3 |
| app-store.ts | 1 | 2 | 1 | 4 |
| notification-store.ts | 1 | 2 | 1 | 4 |
| websocket-store.ts | 2 | 2 | 0 | 4 |
| permission-store.ts | 2 | 1 | 0 | 3 |
| room-store.ts | 2 | 2 | 0 | 4 |
| **总计** | **10** | **10** | **2** | **22** |

---

## 🔍 详细问题分析

### 1. auth-store.ts

#### 严重问题

**P1: 组件直接订阅整个 store 导致过度渲染**
- **位置**: `src/app/[locale]/login/page.tsx:13`
- **问题代码**:
  ```tsx
  const { login, isLoading, error, setError, clearError } = useAuthStore()
  ```
- **影响**: 每次 store 中任何状态变化（即使无关）都会触发组件重渲染
- **优先级**: 高

**P2: 缺少细粒度选择器的使用**
- **位置**: store 定义中虽然提供了选择器（`selectUser`, `selectIsAuthenticated` 等），但组件中没有使用
- **影响**: 无法利用 Zustand 的选择器优化
- **优先级**: 高

#### 中等问题

**P3: login 方法的错误处理不完整**
- **位置**: `auth-store.ts:65-83`
- **问题**: 异步错误处理后状态更新可能导致竞态条件
- **优先级**: 中

---

### 2. app-store.ts

#### 严重问题

**P4: 设置方法使用展开运算符频繁创建新对象**
- **位置**: 多个 setter 方法
- **问题代码**:
  ```typescript
  updateSettings: (newSettings: Partial<AppSettings>) => {
    set(state => ({
      settings: { ...state.settings, ...newSettings },
    }))
  },
  ```
- **影响**: 每次更新都会创建新的 settings 对象，所有订阅 settings 的组件都会重渲染
- **优先级**: 高

#### 中等问题

**P5: isGlobalLoading 状态可能被滥用**
- **位置**: 整个 store
- **问题**: 全局加载状态影响所有订阅组件，但只有部分组件真正需要这个状态
- **优先级**: 中

**P6: 设置方法过于细分**
- **位置**: `toggleSidebar`, `setSidebarOpen`, `setDarkMode` 等
- **问题**: 每个方法都是独立的，但功能重叠
- **优先级**: 中

#### 轻微问题

**P7: 缺少 TypeScript 严格类型检查**
- **位置**: 接口定义
- **问题**: 部分接口字段可能缺少严格的类型约束
- **优先级**: 低

---

### 3. notification-store.ts

#### 严重问题

**P8: getFilteredNotifications 方法每次创建新数组**
- **位置**: `notification-store.ts:132-157`
- **问题代码**:
  ```typescript
  getFilteredNotifications: (filter: UINotificationFilter) => {
    const { notifications } = get()
    let filtered = [...notifications]
    // ... 过滤逻辑
    return filtered
  },
  ```
- **影响**: 每次调用都创建新数组，无法使用 shallow 比较
- **优先级**: 高

#### 中等问题

**P9: setTimeout 自动删除通知可能导致内存泄漏**
- **位置**: `notification-store.ts:90-98`
- **问题代码**:
  ```typescript
  if (duration && duration > 0) {
    setTimeout(() => {
      get().removeNotification(id)
    }, duration)
  }
  ```
- **影响**: 如果组件在定时器触发前卸载，定时器仍在运行
- **优先级**: 中

**P10: notifications 数组可能增长过大**
- **位置**: 虽然有 `maxNotifications: 100`，但频繁操作仍可能导致性能问题
- **优先级**: 中

#### 轻微问题

**P11: UINotification 接口字段过多**
- **位置**: `notification-store.ts:31-44`
- **问题**: 接口字段过多可能导致状态复杂度增加
- **优先级**: 低

---

### 4. websocket-store.ts

#### 严重问题

**P12: messages 数组频繁更新导致重渲染**
- **位置**: `websocket-store.ts:194-198`
- **问题**: 每次 WebSocket 消息到达都会更新 messages 数组
- **影响**: 所有订阅 messages 的组件都会重渲染
- **优先级**: 高

**P13: socket 实例直接存储在状态中**
- **位置**: `websocket-store.ts:78`
- **问题**: Socket.IO 实例不应该存储在 Zustand 状态中
- **影响**: 不符合状态管理最佳实践
- **优先级**: 高

#### 中等问题

**P14: _addMessage 和 _updateStats 方法频繁调用**
- **位置**: `websocket-store.ts:184-198`
- **问题**: 每次消息到达都会触发多次状态更新
- **优先级**: 中

**P15: connect 方法动态导入可能失败**
- **位置**: `websocket-store.ts:100`
- **问题**: 动态导入缺少错误边界处理
- **优先级**: 中

---

### 5. permission-store.ts

#### 严重问题

**P16: checkAccess 方法每次返回新对象**
- **位置**: `permission-store.ts:183-217`
- **问题代码**:
  ```typescript
  checkAccess: (...)
    : PermissionCheckResult => {
    // ...
    return {
      allowed: true,
      requiredPermissions: [permission],
      missingPermissions: [],
    }
  }
  ```
- **影响**: 返回新对象导致无法使用 shallow 比较
- **优先级**: 高

**P17: 权限检查方法依赖整个 userPermissions 状态**
- **位置**: 多个权限检查方法
- **问题**: 任何权限变化都会触发所有检查方法的重渲染
- **优先级**: 高

#### 中等问题

**P18: initializePermissions 方法类型转换复杂**
- **位置**: `permission-store.ts:83-101`
- **问题**: User 类型转换逻辑复杂，容易出错
- **优先级**: 中

---

### 6. room-store.ts

#### 严重问题

**P19: messages 对象结构导致嵌套更新**
- **位置**: `room-store.ts:72`
- **问题代码**:
  ```typescript
  messages: Record<string, RoomMessage[]>
  ```
- **影响**: 更新某个房间的消息需要创建新的整个 messages 对象
- **优先级**: 高

**P20: getFilteredRooms 方法每次创建新数组**
- **位置**: `room-store.ts:149-166`
- **问题**: 类似 notification-store 的问题
- **优先级**: 高

#### 中等问题

**P21: updateMember 和 addMember 方法复杂度较高**
- **位置**: `room-store.ts:40-58`
- **问题**: 嵌套数组操作可能导致重渲染
- **优先级**: 中

**P22: unreadCounts 对象同样有嵌套更新问题**
- **位置**: `room-store.ts:74`
- **问题**: 类似 messages 对象的问题
- **优先级**: 中

---

## 💡 优化建议

### 优先级 P0 - 必须立即修复

1. **为所有 store 实现细粒度选择器**
   - 使用 `useShallow` 从 `zustand/shallow` 进行浅比较
   - 只订阅需要的状态片段

2. **修复方法返回新对象的问题**
   - 使用 Immer 中间件进行不可变更新
   - 或者缓存返回值

3. **移除不应该存储在状态中的对象**
   - 将 Socket.IO 实例移出 Zustand 状态

### 优先级 P1 - 应该尽快修复

4. **优化频繁更新的状态**
   - 将 messages 等频繁更新的数据分拆到单独的 store
   - 使用分页或虚拟滚动

5. **修复内存泄漏问题**
   - 使用 `useEffect` 清理定时器
   - 实现通知清理机制

### 优先级 P2 - 可以后续优化

6. **简化设置方法**
   - 合并功能相似的方法
   - 减少不必要的中间状态

7. **改进类型定义**
   - 添加更严格的类型约束
   - 使用工具类型减少重复

---

## 📊 性能影响评估

| 问题类型 | 预估性能影响 | 修复难度 | 推荐优先级 |
|---------|------------|---------|-----------|
| 过度重渲染 | 高 | 低 | P0 |
| 内存泄漏 | 中 | 中 | P1 |
| 不必要的对象创建 | 中 | 低 | P0 |
| 复杂的嵌套更新 | 高 | 中 | P1 |
| 状态管理不当 | 高 | 高 | P0 |

---

## 🎯 实施计划

### 第一阶段（本次实施）
- ✅ 为 auth-store 实现细粒度选择器
- ✅ 为 app-store 优化设置方法
- ✅ 为 notification-store 修复数组问题

### 第二阶段（后续）
- 优化 websocket-store 的 messages 管理
- 修复 permission-store 的对象创建问题
- 优化 room-store 的嵌套更新

### 第三阶段（长期）
- 考虑使用 Immer 中间件
- 实现状态持久化优化
- 添加性能监控

---

## 📚 参考资料

- [Zustand 最佳实践](https://github.com/pmndrs/zustand)
- [Zustand 选择器优化](https://docs.pmnd.rs/zustand/guides/performance)
- [React 渲染优化](https://react.dev/learn/render-and-commit)

---

## 📝 附录

### A. 已实施优化清单

- [x] 优化 auth-store 选择器使用
- [x] 优化 app-store 设置方法
- [x] 修复 notification-store 数组创建问题

### B. 待实施优化清单

- [ ] 优化 websocket-store messages 管理
- [ ] 修复 permission-store 对象创建
- [ ] 优化 room-store 嵌套更新
- [ ] 添加 Immer 中间件
- [ ] 实现性能监控

---

**审计完成时间**: 2026-04-04
**审核人员**: Executor 子代理
**报告版本**: v1.0
