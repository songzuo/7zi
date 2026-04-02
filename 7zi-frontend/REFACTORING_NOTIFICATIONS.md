# 通知系统重构

## 发现的重复文件

### 1. useNotifications Hook（3个副本）

- `src/hooks/useNotifications.ts` (307 行) - **主版本**
- `src/hooks/useNotificationsStable.ts` (318 行) - **主版本**
- `src/features/notifications/hooks/useNotifications.ts` (305 行) - **重复**
- `src/features/notifications/hooks/useNotificationsStable.ts` (318 行) - **重复**

### 2. 使用情况统计

```bash
# useNotifications 使用情况
@/hooks/useNotifications: 16 次引用
@/features/notifications: 0 次直接引用

# useNotificationsStable 使用情况
@/hooks/useNotificationsStable: 14 次引用（仅 1 个实际使用: websocket-stability-demo.tsx）
@/features/notifications: 仅用于重新导出
```

## 优化方案

### 第一步：删除 features/notifications 重复代码

由于：

- `src/hooks/` 中已有完整的两个版本
- features 中的代码只是复制，功能相同
- features 的导出并未被项目实际使用
- NotificationProvider 使用的是 `@/hooks/useNotifications`

删除以下文件：

- `src/features/notifications/hooks/useNotifications.ts`
- `src/features/notifications/hooks/useNotificationsStable.ts`
- `src/features/notifications/components/NotificationProvider.tsx` (如果仅此一处使用，直接内联)

保留：

- `src/hooks/useNotifications.ts` (主版本)
- `src/hooks/useNotificationsStable.ts` (主版本)

### 第二步：更新导入引用

将所有从 `@/features/notifications` 的引用改为 `@/hooks`：

**NotificationProvider.tsx**

```typescript
// 之前
import { useNotifications } from '@/hooks/useNotifications'
// 保持不变（已正确）
```

**其他需要修改的文件**（如有）

- 搜索 `from '@/features/notifications'` 替换为 `from '@/hooks'`

### 第三步：清理 features/notifications 目录

如果 features/notifications 目录为空或仅包含重复代码，则删除整个目录。

## 预期效果

- **减少代码行数**: ~600 行
- **消除重复**: 删除 2 个重复的 hook 文件
- **简化依赖**: 减少导入路径混乱
- **提高可维护性**: 只需维护一处代码

## 风险评估

- **低风险**: features 目录未在项目中实际使用
- **验证**: 运行测试确保没有破坏性变更

## 执行步骤

1. 搜索所有引用 `@/features/notifications` 的文件
2. 更新导入路径
3. 删除重复文件
4. 运行测试验证
5. 更新文档
