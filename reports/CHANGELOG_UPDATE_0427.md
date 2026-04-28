# CHANGELOG 更新报告 - CHANGELOG_UPDATE_0427

**更新完成时间**: 2026-04-27 20:06 GMT+2
**更新内容**: 补充 4 个高优先级缺失提交记录

---

## 已补充的缺失条目

### 1. ec2782b80 - WebSocket 管理器模块化重构

**内容**:
- `src/lib/websocket-manager.ts` → 模块化架构：拆分为 6 个新模块（core.ts 1230行）
- 新增 `src/lib/websocket/auth.ts`: JWT 认证中间件
- 新增 `src/lib/websocket/broadcast.ts`: 消息广播工具函数
- 新增 `src/lib/websocket/task-status.ts`: 任务状态广播功能
- 新增 `src/lib/websocket/handlers/room-handlers.ts`: 房间事件处理
- 新增 `src/lib/websocket/handlers/message-handlers.ts`: 消息事件处理
- 新增 `src/lib/websocket/handlers/doc-handlers.ts`: 文档/光标事件处理
- feedback API priority 默认值修复
- PWA service worker 更新

### 2. 64c0b20dd - auth 管理员权限 403 修复

**内容**:
- `withAdminAuth` 正确返回 403 Forbidden
- 新增 `condition-evaluator.test.ts` (29 tests)
- batch-request 类型修复: any → unknown

### 3. 8fd59ef25 - WebSocket 协作基础设施

**内容**:
- JWT 认证中间件 (`src/lib/websocket/auth.ts`)
- 广播工具函数 (`src/lib/websocket/broadcast.ts`)
- 任务状态广播 (`src/lib/websocket/task-status.ts`)
- 文档/消息/房间 handlers (1432 行新增)

### 4. f5b057cc2 - AI providers/xlsx-wrapper/plugin types 更新

**内容**:
- `src/lib/ai/providers/SiliconFlowProvider.ts`: calculateCost 访问修饰符修复
- `src/lib/export/xlsx-wrapper.ts`: Column 类型断言修复
- `src/lib/plugins/types.ts`: 移除 @ts-nocheck，修复 debounce/throttle 泛型
- `src/lib/workflow/triggers.ts`: 触发器更新

---

## 补充位置

所有 4 个条目均添加至 `[Unreleased] - 2026-04-27` 部分，在原有代码优化条目之前。

---

## 状态

✅ 全部完成 - 4 个高优先级缺失条目已全部补充至 CHANGELOG.md

---

*报告生成时间: 2026-04-27 20:06 GMT+2*