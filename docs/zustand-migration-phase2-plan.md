# Phase 2 第二部分 - Zustand 迁移计划

**创建日期**: 2026-03-29
**创建者**: 🏗️ 架构师
**项目路径**: /root/.openclaw/workspace
**Phase**: 状态迁移 (Phase 2) - 第二部分

---

## 📋 执行摘要

本文档详细说明了 7zi 项目从 React Context 和自定义 Hooks 迁移到 Zustand Store 的完整计划。Phase 2 第一部分已完成 4 个新 Store 的实现和测试，本计划将指导剩余的迁移工作。

### 关键发现

1. **存在重复实现**: `SettingsContext` 与 `preferencesStore` 功能完全重复
2. **存在重复实现**: `useGlobalLoading` hook 与 `uiStore` 的加载状态功能重复
3. **已有迁移基础**: `preferencesStore`、`uiStore`、`dashboardStore` 等 Zustand Store 已稳定运行
4. **Phase 2 第一部分成果**: 4 个新 Store 已创建但未实际使用

---

## 🎯 迁移目标

### 总体目标
- 消除重复的状态管理实现
- 将所有 React Context 迁移到 Zustand Store
- 统一状态管理架构，提升可维护性

### 成功标准
- ✅ 所有 React Context 被 Zustand Store 替代
- ✅ 所有测试通过
- ✅ 无性能退化
- ✅ 代码简化，减少冗余

---

## 📊 当前状态分析

### 已存在的 Zustand Stores (`src/stores/`)

| Store | 文件 | 功能 | 状态 |
|-------|------|------|------|
| `preferencesStore` | `preferencesStore.ts` | 用户偏好（主题、语言、通知） | ✅ 稳定 |
| `uiStore` | `uiStore.ts` | UI 状态（sidebar、modal、toast、loading） | ✅ 稳定 |
| `dashboardStore` | `dashboardStore.ts` | Dashboard 数据（成员、Issues、活动） | ✅ 稳定 |
| `filterStore` | `filterStore.ts` | 过滤、排序、分页状态 | ✅ 稳定 |
| `walletStore` | `walletStore.ts` | 钱包状态管理 | ✅ 稳定 |

### Phase 2 第一部分创建的 Stores

根据 `docs/phase2-part1-completion-report.md`，以下 Store 已创建：

| Store | 文件位置 | 功能 | 测试状态 |
|-------|---------|------|---------|
| `auth-store` | 7zi-frontend/src/stores/ | 认证状态管理 | ✅ 72.7% 通过 |
| `notification-store` | 7zi-frontend/src/stores/ | 通知状态管理 | ✅ 100% 通过 |
| `websocket-store` | 7zi-frontend/src/stores/ | WebSocket 状态 | ✅ 100% 通过 |
| `app-store` | 7zi-frontend/src/stores/ | 应用全局设置 | ✅ 85.7% 通过 |

**注意**: 这些 Store 在独立项目目录创建，需要集成到主项目。

### 需要迁移的 React Context 和 Hooks

| 名称 | 类型 | 文件位置 | 功能 | 迁移目标 | 优先级 |
|------|------|---------|------|---------|--------|
| `SettingsContext` | Context | `src/contexts/SettingsContext.tsx` | 用户设置 | 删除（已由 preferencesStore 实现） | P0 |
| `useGlobalLoading` | Hook/Context | `src/hooks/useGlobalLoading.tsx` | 全局加载 | 删除（已由 uiStore 实现） | P0 |
| `useNotifications` | Hook | `src/hooks/useNotifications.ts` | 通知管理 | 迁移到 notification-store | P0 |
| `ChatContext` | Context | `src/contexts/ChatContext.tsx` | 聊天状态 | 创建 chat-store | P1 |
| `PermissionContext` | Context | `src/contexts/PermissionContext.tsx` | 权限管理 | 创建 permission-store | P1 |
| `useWebSocket` | Hook | `src/hooks/useWebSocket.ts` | WebSocket | 迁移到 websocket-store | P1 |

---

## 🔄 迁移计划

### 阶段一: 消除重复实现 (P0 - 高优先级)

#### 1.1 删除 SettingsContext

**问题分析**:
- `SettingsContext.tsx` 提供的功能与 `preferencesStore.ts` 完全重复
- 两个实现都提供主题、语言、通知偏好管理
- `preferencesStore` 更简洁，性能更好（使用 Zustand 选择器）

**迁移步骤**:

```markdown
1. 识别所有使用 SettingsContext 的文件
   - src/hooks/useThemeEnhanced.ts
   - src/contexts/SettingsContext.test.tsx
   - 其他引用

2. 更新导入语句
   // 旧代码
   import { useSettings, useTheme } from '@/contexts/SettingsContext';
   
   // 新代码
   import { useSettings, useTheme } from '@/stores';

3. 删除 SettingsContext.tsx 文件

4. 更新 Provider 配置
   - 从 ClientProviders.tsx 移除 SettingsProvider
   - preferencesStore 使用 persist 中间件，无需 Provider

5. 运行测试验证
```

**影响范围**:
- 文件数: ~5-10 个
- 风险: 低（功能完全等价）

#### 1.2 删除 useGlobalLoading Hook

**问题分析**:
- `useGlobalLoading.tsx` 提供的全局加载功能在 `uiStore.ts` 中已实现
- `uiStore` 提供 `setGlobalLoading` 和 `useGlobalLoading` 选择器

**迁移步骤**:

```markdown
1. 识别所有使用 useGlobalLoading 的文件
   - src/components/GlobalLoader.tsx
   - src/components/ClientProviders.tsx
   - src/hooks/index.ts
   - 其他引用

2. 更新导入语句
   // 旧代码
   import { useGlobalLoading } from '@/hooks/useGlobalLoading';
   
   // 新代码
   import { useGlobalLoading } from '@/stores';

3. 删除 useGlobalLoading.tsx 文件

4. 更新 ClientProviders.tsx
   - 移除 GlobalLoadingProvider 包裹
   - uiStore 不需要 Provider

5. 运行测试验证
```

**影响范围**:
- 文件数: ~5-8 个
- 风险: 低（功能完全等价）

---

### 阶段二: 迁移现有功能 (P0-P1)

#### 2.1 迁移 useNotifications (P0)

**当前状态分析**:
- `useNotifications.ts` 提供通知管理功能
- Phase 2 第一部分已创建 `notification-store.ts`（100% 测试通过）
- 需要将 hook 迁移到 Store 使用

**迁移步骤**:

```markdown
1. 确认 notification-store 功能完整性
   - 添加通知: addNotification ✅
   - 标记已读: markAsRead, markAllAsRead ✅
   - 删除通知: deleteNotification, clearAll ✅
   - 未读计数: unreadCount ✅
   - 持久化: 需要验证

2. 更新使用 useNotifications 的组件
   - 找到所有引用文件
   - 更新导入语句
   
   // 旧代码
   import { useNotifications } from '@/hooks/useNotifications';
   
   // 新代码
   import { useNotificationStore } from '@/stores';

3. 添加过渡层（可选）
   // 在 hooks/useNotifications.ts 中重新导出 Store
   export { useNotificationStore as useNotifications } from '@/stores';

4. 更新测试文件
   - 更新 useNotifications.test.ts

5. 验证功能
   - 运行测试
   - 手动测试通知功能

6. 删除旧 hook 文件（在确认无问题后）
```

**影响范围**:
- 文件数: ~10-15 个
- 风险: 中（需要验证持久化功能）

#### 2.2 迁移 useWebSocket (P1)

**当前状态分析**:
- `useWebSocket.ts` 提供完整的 WebSocket 连接管理
- Phase 2 第一部分已创建 `websocket-store.ts`（100% 测试通过）
- WebSocket 连接有外部依赖，需要谨慎处理

**迁移步骤**:

```markdown
1. 对比功能差异
   - useWebSocket: 连接管理、心跳、重连、事件监听
   - websocket-store: 基本状态管理、消息队列

2. 增强 websocket-store 功能
   - 添加自动重连逻辑
   - 添加心跳检测
   - 添加事件订阅管理
   - 保持与 socket.io 的兼容

3. 创建迁移层
   // 保持 API 兼容
   export function useWebSocket(config: WebSocketConfig) {
     const store = useWebSocketStore();
     // ... 连接逻辑
     return { socket, state, ... };
   }

4. 更新使用方
   - useTaskStatusUpdates hook
   - Dashboard 实时更新
   - 其他实时功能

5. 完整测试
   - 连接/断开
   - 重连逻辑
   - 消息收发
   - 错误处理

6. 逐步迁移，保留旧 hook 作为备份
```

**影响范围**:
- 文件数: ~10-20 个
- 风险: 高（外部依赖，需要充分测试）

---

### 阶段三: 创建新 Store (P1-P2)

#### 3.1 创建 Chat Store (P1)

**需求分析**:
- `ChatContext.tsx` 管理聊天相关状态
- 状态包括: 团队成员、消息、输入值、选中成员
- 需要创建新的 Zustand Store

**Store 设计**:

```typescript
// src/stores/chatStore.ts

interface ChatState {
  // 团队成员
  teamMembers: UnifiedTeamMember[];
  selectedMemberId: string;
  
  // 消息
  messages: Message[];
  inputValue: string;
  isTyping: boolean;
  
  // 操作
  setTeamMembers: (members: UnifiedTeamMember[]) => void;
  selectMember: (memberId: string) => void;
  setInputValue: (value: string) => void;
  sendMessage: () => void;
  addMessage: (message: Message) => void;
  setTyping: (isTyping: boolean) => void;
  
  // 计算属性
  getOnlineMembers: () => UnifiedTeamMember[];
  getMemberById: (id: string) => UnifiedTeamMember | undefined;
}
```

**迁移步骤**:

```markdown
1. 创建 chatStore.ts
   - 定义状态和操作
   - 实现选择器 hooks

2. 创建测试文件
   - 状态初始化
   - 操作方法
   - 计算属性

3. 更新 AIChat 组件
   - 移除 ChatProvider 包裹
   - 直接使用 chatStore

4. 删除 ChatContext.tsx
```

#### 3.2 创建 Permission Store (P1)

**需求分析**:
- `PermissionContext.tsx` 管理权限和角色
- 依赖 API 获取用户权限
- 需要缓存和刷新机制

**Store 设计**:

```typescript
// src/stores/permissionStore.ts

interface PermissionState {
  // 权限数据
  context: PermissionContext | null;
  loading: boolean;
  error: string | null;
  
  // 操作
  fetchPermissions: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // 权限检查
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  
  // 角色检查
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  isAdmin: () => boolean;
  isManagerOrAdmin: () => boolean;
}
```

**迁移步骤**:

```markdown
1. 创建 permissionStore.ts
   - 迁移 PermissionContext 逻辑
   - 添加 API 调用

2. 创建测试文件

3. 更新使用方
   - PermissionGate 组件
   - RoleGate 组件
   - withPermission HOC

4. 删除 PermissionContext.tsx
```

---

## 📅 执行时间表

### Week 1: 阶段一 - 消除重复

| 任务 | 预计时间 | 负责人 | 状态 |
|------|---------|--------|------|
| 1.1 删除 SettingsContext | 2 小时 | Executor | ⏳ 待执行 |
| 1.2 删除 useGlobalLoading | 2 小时 | Executor | ⏳ 待执行 |
| 运行完整测试 | 1 小时 | 测试员 | ⏳ 待执行 |
| 代码审查 | 1 小时 | 架构师 | ⏳ 待执行 |

### Week 2: 阶段二 - 功能迁移

| 任务 | 预计时间 | 负责人 | 状态 |
|------|---------|--------|------|
| 2.1 迁移 useNotifications | 4 小时 | Executor | ⏳ 待执行 |
| 测试通知功能 | 2 小时 | 测试员 | ⏳ 待执行 |
| 2.2 迁移 useWebSocket | 6 小时 | Executor | ⏳ 待执行 |
| WebSocket 集成测试 | 3 小时 | 测试员 | ⏳ 待执行 |

### Week 3: 阶段三 - 新 Store

| 任务 | 预计时间 | 负责人 | 状态 |
|------|---------|--------|------|
| 3.1 创建 Chat Store | 4 小时 | 架构师 | ⏳ 待执行 |
| 迁移 ChatContext | 2 小时 | Executor | ⏳ 待执行 |
| 3.2 创建 Permission Store | 4 小时 | 架构师 | ⏳ 待执行 |
| 迁移 PermissionContext | 2 小时 | Executor | ⏳ 待执行 |
| 完整回归测试 | 4 小时 | 测试员 | ⏳ 待执行 |

---

## 🔧 技术细节

### 迁移模式

#### 模式 1: 直接替换

当新 Store 完全兼容旧 API 时：

```typescript
// 旧代码
import { useSettings } from '@/contexts/SettingsContext';

// 新代码
import { useSettings } from '@/stores';
```

#### 模式 2: 适配器模式

当 API 有差异时：

```typescript
// hooks/useSettings.ts (过渡文件)
import { usePreferencesStore } from '@/stores';

// 提供兼容的 API
export function useSettings() {
  const store = usePreferencesStore();
  return {
    settings: store.settings,
    setTheme: store.setTheme,
    // ... 其他适配
  };
}
```

#### 模式 3: 渐进迁移

保留旧实现，添加新导入：

```typescript
// 保留旧 hook，内部使用新 Store
export { useNotifications } from '@/stores/notification-store';
```

### 测试策略

1. **单元测试**: 每个 Store 都有对应的测试文件
2. **集成测试**: 验证 Store 与组件的交互
3. **E2E 测试**: 完整用户流程验证
4. **性能测试**: 对比迁移前后的性能

### 回滚策略

1. 每个阶段完成后创建 Git tag
2. 保留旧文件直到确认无问题
3. 使用特性开关控制新旧实现

---

## 📋 迁移检查清单

### 阶段一检查清单

- [ ] SettingsContext 已删除
- [ ] 所有 useSettings 导入已更新
- [ ] useGlobalLoading hook 已删除
- [ ] 所有全局加载相关导入已更新
- [ ] ClientProviders.tsx 已更新
- [ ] 测试全部通过
- [ ] 手动测试通过

### 阶段二检查清单

- [ ] notification-store 功能完整
- [ ] useNotifications 迁移完成
- [ ] 通知持久化正常工作
- [ ] websocket-store 功能增强
- [ ] useWebSocket 迁移完成
- [ ] WebSocket 连接稳定
- [ ] 测试全部通过

### 阶段三检查清单

- [ ] chatStore 已创建
- [ ] ChatContext 已删除
- [ ] AIChat 组件正常工作
- [ ] permissionStore 已创建
- [ ] PermissionContext 已删除
- [ ] 权限检查正常工作
- [ ] 完整回归测试通过

---

## 🚨 风险和注意事项

### 高风险项

1. **WebSocket 迁移** (风险: 高)
   - 原因: 外部依赖，连接状态管理复杂
   - 缓解: 充分测试，保留旧实现作为备份
   - 回滚: 使用 Git tag 快速回滚

2. **权限系统迁移** (风险: 中高)
   - 原因: 安全关键功能
   - 缓解: 详细测试权限检查逻辑
   - 回滚: 保留 PermissionContext 代码

### 中风险项

1. **通知系统迁移** (风险: 中)
   - 原因: 持久化功能
   - 缓解: 验证 localStorage 集成
   - 回滚: 保留 useNotifications hook

### 低风险项

1. **SettingsContext 删除** (风险: 低)
   - 原因: preferencesStore 功能完全等价
   - 缓解: 统一的导入路径
   - 回滚: 简单文件恢复

2. **useGlobalLoading 删除** (风险: 低)
   - 原因: uiStore 功能完全等价
   - 缓解: 统一的 API
   - 回滚: 简单文件恢复

---

## 📚 参考资料

### 相关文档
- `docs/ARCHITECTURE.md` - 系统架构文档
- `docs/phase2-part1-completion-report.md` - Phase 2 第一部分完成报告
- `docs/zustand-stores-usage.md` - Zustand Store 使用指南

### 相关文件
- `src/stores/` - Zustand Store 目录
- `src/contexts/` - React Context 目录
- `src/hooks/` - 自定义 Hooks 目录

---

## 📝 更新日志

| 日期 | 版本 | 更新内容 | 作者 |
|------|------|---------|------|
| 2026-03-29 | 1.0 | 初始版本 | 🏗️ 架构师 |

---

**文档状态**: ✅ 完成
**下一步行动**: 开始阶段一迁移，删除重复实现
