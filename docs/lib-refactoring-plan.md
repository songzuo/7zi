# lib/ 层重构设计方案

**版本**: v1.5.0  
**日期**: 2026-03-31  
**作者**: 🏗️ 架构师  
**状态**: 草案

---

## 目录

1. [背景与动机](#背景与动机)
2. [当前结构分析](#当前结构分析)
3. [问题识别](#问题识别)
4. [重构目标](#重构目标)
5. [新目录结构设计](#新目录结构设计)
6. [分阶段迁移计划](#分阶段迁移计划)
7. [循环依赖风险分析](#循环依赖风险分析)
8. [向后兼容策略](#向后兼容策略)
9. [测试策略](#测试策略)
10. [风险评估](#风险评估)

---

## 背景与动机

v1.5.0 Sprint 3 的目标是清理技术债务。`src/lib/` 目录中与 Agent 相关的代码结构混乱，存在以下目录：

- `agents/` - 主 Agent 模块目录
- `multi-agent/` - 多 Agent 协作模块

这两个目录职责边界模糊，通信功能分散在多个位置，导致维护困难和新人理解成本高。

---

## 当前结构分析

### 3.1 完整目录树

```
src/lib/
├── agents/                          # 主 Agent 模块
│   ├── agent/                       # 核心智能体操作
│   │   ├── auth-service.ts          # 认证服务
│   │   ├── repository.ts            # 数据仓库
│   │   ├── wallet-repository.ts     # 钱包仓库
│   │   ├── middleware.ts            # 中间件
│   │   ├── types.ts                 # 类型定义
│   │   ├── communication/           # ⚠️ 通信模块（位置不合理）
│   │   │   ├── index.ts
│   │   │   ├── message-builder.ts   # 消息构建器
│   │   │   └── types.ts             # 通信类型
│   │   └── index.ts
│   │
│   ├── a2a/                         # Agent-to-Agent 协议
│   │   ├── agent-card.ts            # Agent 卡片
│   │   ├── agent-registry.ts        # Agent 注册表
│   │   ├── executor.ts              # 执行器
│   │   ├── jsonrpc-handler.ts       # JSON-RPC 处理
│   │   ├── message-queue.ts         # 消息队列
│   │   ├── task-store.ts            # 任务存储
│   │   ├── types.ts                 # A2A 类型
│   │   ├── index.ts
│   │   └── __tests__/
│   │
│   ├── scheduler/                   # 任务调度器
│   │   ├── core/                    # 核心调度逻辑
│   │   ├── config/                  # 配置
│   │   ├── models/                  # 数据模型
│   │   ├── strategies/              # 调度策略
│   │   ├── monitoring/              # 监控
│   │   └── __tests__/
│   │
│   ├── learning/                    # 学习模块
│   │
│   ├── tools/                       # 工具函数
│   │
│   └── index.ts                     # 主入口
│
├── multi-agent/                     # ⚠️ 多智能体协作
│   ├── message-bus.ts               # 消息总线（与 a2a 重叠）
│   ├── protocol.ts                  # 协议（与 a2a 重叠）
│   ├── registry.ts                  # 注册表（与 a2a 重叠）
│   ├── task-decomposer.ts           # 任务分解
│   ├── types.ts
│   ├── index.ts
│   └── __tests__/
│
└── ... (其他模块)
```

### 3.2 模块职责分析

| 模块                          | 当前职责                 | 问题                            |
| ----------------------------- | ------------------------ | ------------------------------- |
| `agents/agent/`               | 认证、仓库、钱包、中间件 | 职责清晰                        |
| `agents/agent/communication/` | 消息构建                 | ❌ 位置不合理，应在 a2a/ 下     |
| `agents/a2a/`                 | Agent-to-Agent 通信协议  | 职责清晰，但与 multi-agent 重叠 |
| `agents/scheduler/`           | 任务调度和负载均衡       | 职责清晰                        |
| `agents/learning/`            | 学习模块                 | 需确认是否有使用                |
| `agents/tools/`               | 工具函数                 | 职责清晰                        |
| `multi-agent/`                | 多智能体协作             | ❌ 与 a2a 功能重叠              |

### 3.3 依赖分析

**API 路由直接依赖**:

- `@/lib/agents/a2a/agent-registry`
- `@/lib/agents/a2a/types`
- `@/lib/agents/a2a/jsonrpc-handler`
- `@/lib/agents/a2a/task-store`
- `@/lib/agents/a2a/executor`
- `@/lib/agents/a2a/agent-card`
- `@/lib/agents/a2a/message-queue`

**测试文件**: 52 个测试文件涉及 agent 相关模块

---

## 问题识别

### 4.1 功能重叠问题

```
agents/a2a/                    vs    multi-agent/
├── message-queue.ts                 ├── message-bus.ts      # 消息处理
├── agent-registry.ts                ├── registry.ts         # 注册表
├── types.ts (协议类型)               ├── protocol.ts         # 协议定义
└── executor.ts                      └── task-decomposer.ts  # 任务处理
```

**重叠点**:

1. **消息处理**: `message-queue.ts` vs `message-bus.ts`
2. **注册表**: `agent-registry.ts` vs `registry.ts`
3. **协议定义**: `a2a/types.ts` vs `multi-agent/protocol.ts`
4. **任务处理**: `task-store.ts` vs `task-decomposer.ts`

### 4.2 目录层级问题

```
agents/
├── agent/                    # agent 的子目录
│   └── communication/        # ❌ 应该与 a2a 同级或合并
└── a2a/                      # Agent-to-Agent 通信
```

`agents/agent/communication/` 应该在 `agents/a2a/` 下或者与之合并。

### 4.3 命名一致性问题

- `agents/` vs `multi-agent/` 命名风格不一致
- `agent/` 作为 `agents/` 的子目录，但 `a2a/` 也包含 agent 功能

---

## 重构目标

### 5.1 主要目标

1. **统一 Agent 模块结构** - 所有 Agent 相关代码归入 `lib/agents/`
2. **消除功能重叠** - 合并重复的通信、注册表、协议代码
3. **清晰的职责边界** - 每个子目录职责单一
4. **保持向后兼容** - 现有 import 路径继续工作

### 5.2 不变目标

- 不改变 API 路由
- 不改变业务逻辑
- 不破坏现有测试

---

## 新目录结构设计

### 6.1 重构后结构

```
src/lib/agents/
├── core/                           # 核心智能体操作（原 agent/）
│   ├── auth/
│   │   ├── auth-service.ts         # 认证服务
│   │   └── types.ts
│   ├── repository/
│   │   ├── agent-repository.ts      # 智能体仓库
│   │   ├── wallet-repository.ts     # 钱包仓库
│   │   └── types.ts
│   ├── middleware/
│   │   ├── agent-middleware.ts      # 中间件
│   │   └── types.ts
│   └── index.ts
│
├── communication/                  # 通信模块（合并 a2a + agent/communication + multi-agent）
│   ├── a2a/                        # Agent-to-Agent 协议
│   │   ├── agent-card.ts
│   │   ├── agent-registry.ts
│   │   ├── executor.ts
│   │   ├── jsonrpc-handler.ts
│   │   ├── task-store.ts
│   │   ├── message-queue.ts        # 保留
│   │   └── types.ts
│   │
│   ├── multi-agent/                # 多智能体协作（合并自 lib/multi-agent）
│   │   ├── message-bus.ts
│   │   ├── task-decomposer.ts
│   │   └── types.ts
│   │
│   ├── message-builder/            # 原来自 agent/communication
│   │   ├── builder.ts              # message-builder.ts
│   │   └── types.ts
│   │
│   ├── shared/                     # 共享通信基础设施
│   │   ├── protocol.ts             # 协议定义
│   │   ├── registry-base.ts        # 注册表基类
│   │   └── types.ts
│   │
│   └── index.ts
│
├── scheduler/                      # 任务调度器（保持不变）
│   ├── core/
│   ├── config/
│   ├── models/
│   ├── strategies/
│   ├── monitoring/
│   └── __tests__/
│
├── learning/                       # 学习模块（保持不变）
│
├── tools/                          # 工具函数（保持不变）
│
└── index.ts                        # 主入口
```

### 6.2 变更说明

| 原路径                        | 新路径                                  | 说明             |
| ----------------------------- | --------------------------------------- | ---------------- |
| `agents/agent/`               | `agents/core/`                          | 更清晰的命名     |
| `agents/agent/communication/` | `agents/communication/message-builder/` | 移到通信模块下   |
| `agents/a2a/`                 | `agents/communication/a2a/`             | 归入通信模块     |
| `multi-agent/`                | `agents/communication/multi-agent/`     | 归入通信模块     |
| -                             | `agents/communication/shared/`          | 新增共享基础设施 |

---

## 分阶段迁移计划

### 阶段 1: 准备工作（第1周）

**目标**: 梳理依赖，创建迁移基础设施

**步骤**:

1. 创建详细的导入路径映射文档
2. 识别所有依赖点（API 路由、测试文件、其他模块）
3. 创建测试覆盖率报告
4. 设置迁移脚本

**产出**:

- `/docs/migration/import-mapping.md` - 导入路径映射
- `/docs/migration/dependency-analysis.md` - 依赖分析报告

**风险**: 无

---

### 阶段 2: 创建新目录结构（第2周）

**目标**: 创建新目录，不删除旧代码

**步骤**:

1. 创建新目录结构
2. 复制文件到新位置（不移动）
3. 更新新文件的导入路径
4. 创建 index.ts 导出

**产出**:

- 新目录结构就位
- 新文件可单独导入

**命令示例**:

```bash
# 创建目录
mkdir -p src/lib/agents/core/{auth,repository,middleware}
mkdir -p src/lib/agents/communication/{a2a,multi-agent,message-builder,shared}

# 复制文件
cp src/lib/agents/agent/auth-service.ts src/lib/agents/core/auth/
cp src/lib/agents/agent/repository.ts src/lib/agents/core/repository/agent-repository.ts
```

**风险**: 低 - 旧代码仍存在

---

### 阶段 3: 添加兼容层（第3周）

**目标**: 提供向后兼容的导入路径

**步骤**:

1. 在旧路径创建 re-export 文件
2. 使用 TypeScript path mapping
3. 更新 tsconfig.json

**兼容层示例**:

```typescript
// src/lib/agents/agent/index.ts (保留，作为兼容层)
/**
 * @deprecated Use '@/lib/agents/core' instead
 */
export * from '../core'

// src/lib/agents/agent/communication/index.ts
/**
 * @deprecated Use '@/lib/agents/communication/message-builder' instead
 */
export * from '../../communication/message-builder'
```

**tsconfig.json 配置**:

```json
{
  "compilerOptions": {
    "paths": {
      "@/lib/agents/agent/*": ["src/lib/agents/core/*"],
      "@/lib/agents/a2a/*": ["src/lib/agents/communication/a2a/*"],
      "@/lib/multi-agent/*": ["src/lib/agents/communication/multi-agent/*"]
    }
  }
}
```

**风险**: 低 - 现有代码继续工作

---

### 阶段 4: 更新测试（第4周）

**目标**: 确保所有测试通过

**步骤**:

1. 更新测试文件的导入路径
2. 运行所有测试
3. 修复失败的测试
4. 添加新的集成测试

**测试更新脚本**:

```bash
# 查找需要更新的测试文件
grep -r "from.*@/lib/agents/agent" src --include="*.test.ts" -l

# 批量更新导入路径
find src -name "*.test.ts" -exec sed -i 's|@/lib/agents/agent/|@/lib/agents/core/|g' {} \;
```

**产出**:

- 所有测试通过
- 测试覆盖率保持或提高

**风险**: 中 - 可能需要调试

---

### 阶段 5: 逐步迁移 API 路由（第5-6周）

**目标**: 更新 API 路由使用新路径

**步骤**:

1. 更新 `src/app/api/a2a/` 下的路由
2. 每次迁移一个路由文件
3. 测试 API 功能
4. 记录变更

**示例更新**:

```typescript
// src/app/api/a2a/registry/route.ts
// 之前
import { getAgentRegistry } from '@/lib/agents/a2a/agent-registry'

// 之后
import { getAgentRegistry } from '@/lib/agents/communication/a2a/agent-registry'
```

**风险**: 中 - 需要逐个测试

---

### 阶段 6: 合并重复代码（第7-8周）

**目标**: 消除 `a2a/` 和 `multi-agent/` 之间的重复

**步骤**:

1. 分析 `message-queue.ts` vs `message-bus.ts`
2. 提取共享接口到 `communication/shared/`
3. 实现统一的通信接口
4. 更新依赖模块

**共享基础设施示例**:

```typescript
// src/lib/agents/communication/shared/registry-base.ts
export interface IAgentRegistry {
  register(agent: AgentRegistration): Promise<void>
  unregister(agentId: string): Promise<void>
  getAgent(agentId: string): Promise<AgentCard | null>
  listAgents(): Promise<AgentCard[]>
}

// a2a 和 multi-agent 都实现这个接口
```

**风险**: 高 - 需要仔细合并

---

### 阶段 7: 清理和文档（第9周）

**目标**: 移除旧代码，更新文档

**步骤**:

1. 移除旧的兼容层（如果不再需要）
2. 更新 README 文档
3. 更新 API 文档
4. 创建迁移指南

**产出**:

- `/docs/lib-agents-migration-guide.md`
- 更新的 README

**风险**: 低

---

## 循环依赖风险分析

### 8.1 已识别的循环依赖风险

| 风险                          | 描述                     | 缓解措施                       |
| ----------------------------- | ------------------------ | ------------------------------ |
| `core` ↔ `communication`      | 核心模块可能需要通信类型 | 使用 `types.ts` 作为共享类型层 |
| `a2a` ↔ `multi-agent`         | 两个通信模块可能相互依赖 | 通过 `shared/` 层解耦          |
| `scheduler` → `communication` | 调度器依赖消息队列       | 单向依赖，通过接口解耦         |

### 8.2 依赖规则

```
┌─────────────────────────────────────────────────────┐
│                    依赖方向                          │
│                                                     │
│   tools ← learning ← scheduler                     │
│      ↑         ↑          ↑                        │
│      │         │          │                        │
│      └─────────┼──────────┘                        │
│                │                                   │
│   communication → core                             │
│        ↑                ↑                          │
│        │                │                          │
│        └──── shared ────┘                          │
│                                                     │
│   规则：                                           │
│   1. core 不依赖其他模块                            │
│   2. shared 不依赖任何模块                          │
│   3. communication 只依赖 core 和 shared           │
│   4. scheduler/learning/tools 可依赖任意模块        │
└─────────────────────────────────────────────────────┘
```

### 8.3 检测方法

```bash
# 使用 madge 检测循环依赖
npx madge --circular src/lib/agents/

# 输出示例
# ✖ Found 2 circular dependencies:
# 1) core/auth/auth-service.ts → communication/a2a/types.ts → core/auth/auth-service.ts
```

---

## 向后兼容策略

### 9.1 三层兼容策略

**Layer 1: 文件系统层**

- 保留旧文件作为 re-export
- 使用 `@deprecated` JSDoc 注释

**Layer 2: TypeScript 层**

- 使用 path mapping
- 在 tsconfig.json 中配置别名

**Layer 3: 运行时层**

- 提供 deprecation warning
- 使用 `console.warn` 提示迁移

### 9.2 兼容层代码模板

```typescript
// src/lib/agents/agent/index.ts
/**
 * @deprecated This module has been moved to '@/lib/agents/core'.
 * This file will be removed in v2.0.0.
 * @see {@link https://docs.7zi.com/migration/lib-agents}
 */
import * as CoreModule from '../core'

// 运行时警告（仅开发环境）
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '[Deprecation] Import from @/lib/agents/agent is deprecated. ' +
      'Use @/lib/agents/core instead.'
  )
}

export * from '../core'
```

### 9.3 迁移时间线

| 版本   | 状态                           |
| ------ | ------------------------------ |
| v1.5.0 | 添加新结构 + 兼容层            |
| v1.6.0 | 默认使用新路径，兼容层弃用警告 |
| v2.0.0 | 移除兼容层                     |

---

## 测试策略

### 10.1 测试覆盖计划

| 模块                        | 当前测试数 | 目标覆盖率 |
| --------------------------- | ---------- | ---------- |
| `core/auth`                 | ~5         | 90%        |
| `core/repository`           | ~8         | 85%        |
| `communication/a2a`         | ~10        | 85%        |
| `communication/multi-agent` | ~4         | 80%        |
| `scheduler`                 | ~15        | 85%        |

### 10.2 测试类型

1. **单元测试**: 每个模块独立测试
2. **集成测试**: 模块间交互测试
3. **回归测试**: 确保旧 API 继续工作
4. **迁移测试**: 验证导入路径迁移正确

### 10.3 测试命令

```bash
# 运行所有 agent 相关测试
npm test -- --testPathPattern="agents"

# 运行覆盖率报告
npm test -- --coverage --testPathPattern="agents"

# 检查迁移后的导入路径
npm run test:imports
```

---

## 风险评估

### 11.1 风险矩阵

| 风险         | 可能性 | 影响 | 等级  | 缓解措施                   |
| ------------ | ------ | ---- | ----- | -------------------------- |
| 循环依赖     | 中     | 高   | 🔴 高 | 详细依赖分析，分模块迁移   |
| 测试失败     | 高     | 中   | 🟡 中 | 分阶段迁移，每阶段运行测试 |
| API 破坏     | 低     | 高   | 🟡 中 | 兼容层 + 集成测试          |
| 迁移时间超期 | 中     | 中   | 🟡 中 | 预留 20% 缓冲时间          |

### 11.2 回滚计划

每个阶段完成后创建 Git 分支标记：

```bash
git tag -a lib-refactor-phase-1 -m "Phase 1: Preparation"
git tag -a lib-refactor-phase-2 -m "Phase 2: New structure created"
# ...
```

如遇严重问题，可回滚到上一个阶段标记。

---

## 附录

### A. 导入路径映射表

| 旧路径                             | 新路径                                          |
| ---------------------------------- | ----------------------------------------------- |
| `@/lib/agents/agent/auth-service`  | `@/lib/agents/core/auth/auth-service`           |
| `@/lib/agents/agent/repository`    | `@/lib/agents/core/repository/agent-repository` |
| `@/lib/agents/agent/communication` | `@/lib/agents/communication/message-builder`    |
| `@/lib/agents/a2a/*`               | `@/lib/agents/communication/a2a/*`              |
| `@/lib/multi-agent/*`              | `@/lib/agents/communication/multi-agent/*`      |

### B. 相关文档

- [Agent 模块文档](../src/lib/agents/README.md)
- [A2A 协议规范](../src/lib/agents/a2a/README.md)
- [多智能体协作指南](../src/lib/multi-agent/README.md)

### C. 参考资料

- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [Node.js Subpath Exports](https://nodejs.org/api/packages.html#subpath-exports)

---

**文档版本历史**:

- v1.0 (2026-03-31) - 初始草案
