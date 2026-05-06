# WebSocket 重构计划

**目标文件**: `src/lib/websocket/`
**当前规模**: 1586 行 (5个文件)
**状态**: 📋 规划完成，等待主人确认后执行
**日期**: 2026-05-04

---

## 一、当前问题分析

### 问题清单

| # | 问题 | 严重性 | 说明 |
|---|------|--------|------|
| 1 | `core.ts` 单文件 1230 行 | 🔴 高 | 难以维护，修改风险高 |
| 2 | 混合职责 | 🔴 高 | 事件处理、房间管理、消息编解码、连接状态全混在一起 |
| 3 | 类型定义分散 | 🟡 中 | types.ts 只有 168 行，大量类型散落在 core.ts 中 |
| 4 | 测试覆盖困难 | 🟡 中 | 大文件无法针对单个模块独立测试 |
| 5 | 无注释分区 | 🟡 中 | 代码块没有清晰的逻辑分区标记 |

### 当前文件结构

```
src/lib/websocket/
├── constants.ts   (104 行) ✅ 已独立
├── core.ts        (1230 行) ❌ 需要拆分
├── index.ts       (55 行)  ✅ 重新导出
├── manager.ts     (29 行)  ✅ 已独立
└── types.ts       (168 行) ⚠️ 需要扩展
```

---

## 二、重构方案

### 目标文件结构

```
src/lib/websocket/
├── types.ts           # 所有类型定义 (扩展到 ~250 行)
├── constants.ts       # 常量配置 (保持 104 行)
├── connection.ts      # 连接管理 (~300 行) - WebSocketClient 核心连接逻辑
├── heartbeat.ts       # 心跳机制 (~150 行)
├── rooms.ts           # 房间管理 (~200 行)
├── messages.ts        # 消息编解码 (~150 行)
├── queue.ts           # 消息队列 (~100 行)
├── quality.ts         # 连接质量检测 (~150 行)
├── reconnection.ts    # 重连逻辑 (~150 行)
├── manager.ts         # 管理者 (保持 29 行)
└── index.ts           # 重新导出 (扩展)
```

### 拆分原则

1. **单一职责**: 每个文件只负责一个功能领域
2. **接口稳定**: 文件间通过类型/接口通信，不暴露内部实现
3. **向后兼容**: `index.ts` 保持原有导出，外部引用无需修改
4. **可独立测试**: 每个模块可以单独测试

### 模块依赖关系

```
WebSocketClient (core)
├── connection.ts    - Socket 连接建立/断开
├── heartbeat.ts     - 心跳 ping/pong
├── rooms.ts         - 房间 CRUD
├── messages.ts      - 消息编码/解码
├── queue.ts         - 离线消息排队
├── quality.ts       - 质量评分计算
├── reconnection.ts  - 自动重连
├── types.ts         - 所有类型 (被所有模块引用)
├── constants.ts     - 所有常量
└── manager.ts      - 单例导出
```

---

## 三、拆分步骤 (分 3 阶段)

### 阶段 1: 类型和常量提取 (低风险)

**目标**: 不改变任何逻辑，只移动代码

1. 在 `types.ts` 中添加所有内联类型定义
2. 在 `constants.ts` 中确认所有常量
3. 更新 `core.ts` 从 `types.ts` / `constants.ts` 导入
4. 测试: `npm test -- --run websocket` 确保通过

**验证**: 所有现有测试通过 + 构建成功

### 阶段 2: 功能模块拆分 (中风险)

**目标**: 将 `core.ts` 按功能区域拆分到独立文件

1. 创建 `connection.ts` - 提取 Socket 建立/断开逻辑
2. 创建 `heartbeat.ts` - 提取心跳逻辑
3. 创建 `rooms.ts` - 提取房间管理逻辑
4. 创建 `messages.ts` - 提取消息编解码
5. 创建 `queue.ts` - 提取消息队列
6. 创建 `quality.ts` - 提取质量评分
7. 创建 `reconnection.ts` - 提取重连逻辑

每创建1个文件，运行测试验证。

### 阶段 3: index.ts 重新导出 (低风险)

**目标**: 保持外部 API 兼容

```typescript
// 新的 index.ts
export { WebSocketClient } from './connection'
export type { WebSocketMessage, RoomState, ... } from './types'
export { WEBSOCKET_EVENTS, QUALITY_LEVELS, ... } from './constants'
// ... 其他导出
```

---

## 四、风险点与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 拆分过程中破坏现有功能 | 🔴 高 | 每步都运行测试套件；Git commit 每步 |
| 循环依赖 | 🟡 中 | 先梳理依赖关系再拆分；Typescript 检查 |
| 外部引用路径变化 | 🟡 中 | 保持 index.ts 导出不变；更新需要时间的引用 |
| 性能下降 | 🟡 中 | 重构后运行 WebSocket 性能测试 |

---

## 五、测试策略

重构期间测试策略：

```
阶段 1 结束: 运行所有 websocket 相关测试
阶段 2 每步: 运行 websocket 测试 + e2e websocket 测试
阶段 3 结束: 完整测试 + 构建验证
```

测试文件确认：
- `src/lib/__tests__/websocket-*.test.ts` (8个文件)
- `src/stores/__tests__/websocket-store*.test.ts` (2个文件)
- `e2e/websocket.spec.ts`

---

## 六、预估工时

| 阶段 | 工作量 | 风险 |
|------|--------|------|
| 阶段 1 | 1-2 小时 | 低 |
| 阶段 2 | 3-5 小时 | 中 |
| 阶段 3 | 1 小时 | 低 |
| 测试验证 | 2 小时 | 中 |
| **总计** | **7-10 小时** | - |

---

## 七、后续收益

重构完成后预期收益：

- ✅ 单文件行数: 1230 → ~100 (connection.ts)
- ✅ 可独立测试每个模块
- ✅ 新成员容易上手
- ✅ 未来功能开发速度提升
- ✅ 为 React Compiler 准备条件