# lib/ 层重构计划

## 当前文件清单及依赖关系

### 1. agent/ 模块 (src/lib/agent/)
- `index.ts` - 主入口
- `types.ts` - 类型定义
- `auth-service.ts`, `auth-service-optimized.ts` - 认证服务
- `repository.ts`, `repository-optimized.ts`, `repository-optimized-v2.ts` - 数据仓库
- `wallet-repository.ts`, `wallet-repository-optimized.ts`, `wallet-repository-optimized-v2.ts` - 钱包仓库
- `middleware.ts` - 中间件
- `communication/index.ts`, `communication/message-builder.ts`, `communication/types.ts` - 通信模块

**依赖关系：**
- 被 `src/lib/db/__tests__/optimization.test.ts` 引用

### 2. agent-scheduler/ 模块 (src/lib/agent-scheduler/)
- `config/environment.ts` - 环境配置
- `core/load-balancer.ts` - 负载均衡
- `core/matching.ts` - 任务匹配
- `core/ranking.ts` - 任务排序
- `core/scheduler.ts` - 调度器核心
- `dashboard/index.ts` - 仪表板
- `models/agent-capability.ts` - Agent 能力模型
- `models/schedule-decision.ts` - 调度决策模型
- `models/task-model.ts` - 任务模型
- `stores/scheduler-store.ts` - 调度器存储

**依赖关系：**
- 被 `src/app/[locale]/scheduler/SchedulerClient.tsx` 引用
- 基本独立，仅内部模块相互依赖

### 3. a2a/ 模块 (src/lib/a2a/)
- `agent-card.ts` - Agent 卡片
- `agent-registry.ts` - Agent 注册表
- `executor.ts` - 执行器
- `jsonrpc-handler.ts` - JSON-RPC 处理器
- `message-queue.ts` - 消息队列
- `task-store.ts` - 任务存储
- `types.ts` - 类型定义

**依赖关系：**
- 基本独立，仅在模块内部引用

## 建议的新目录结构

```
src/lib/agents/                           # 统一 AI 智能体模块
├── index.ts                             # 主入口，导出所有子模块
├── agent/                              # 原 agent/ 模块
│   ├── index.ts                        # 导出认证、仓库、中间件
│   ├── types.ts                        # 类型定义
│   ├── auth-service.ts
│   ├── auth-service-optimized.ts
│   ├── repository.ts
│   ├── repository-optimized.ts
│   ├── repository-optimized-v2.ts
│   ├── wallet-repository.ts
│   ├── wallet-repository-optimized.ts
│   ├── wallet-repository-optimized-v2.ts
│   └── middleware.ts
│   └── communication/                   # 通信模块
│       ├── index.ts
│       ├── message-builder.ts
│       └── types.ts
├── scheduler/                          # 原 agent-scheduler/ 模块
│   ├── index.ts                        # 导出调度器核心
│   ├── config/
│   │   └── environment.ts
│   ├── core/
│   │   ├── load-balancer.ts
│   │   ├── matching.ts
│   │   ├── ranking.ts
│   │   └── scheduler.ts
│   ├── dashboard/
│   │   └── index.ts
│   ├── models/
│   │   ├── agent-capability.ts
│   │   ├── schedule-decision.ts
│   │   └── task-model.ts
│   └── stores/
│       └── scheduler-store.ts
├── a2a/                               # 原 a2a/ 模块
│   ├── index.ts                        # 导出 A2A 通信
│   ├── agent-card.ts
│   ├── agent-registry.ts
│   ├── executor.ts
│   ├── jsonrpc-handler.ts
│   ├── message-queue.ts
│   ├── task-store.ts
│   └── types.ts
└── tools/                             # 工具函数（如果有）
    └── index.ts
```

## 迁移顺序（避免破坏依赖）

### 阶段 1：创建新结构
1. 创建 `src/lib/agents/` 目录
2. 创建 `src/lib/agents/agent/`, `src/lib/agents/scheduler/`, `src/lib/agents/a2a/` 子目录

### 阶段 2：移动内部独立模块（无外部依赖）
1. 移动 `a2a/` 到 `agents/a2a/`
2. 创建 `agents/a2a/index.ts` 导出
3. 更新所有 a2a 模块的内部 import 路径

### 阶段 3：移动 scheduler 模块
1. 移动 `agent-scheduler/` 到 `agents/scheduler/`
2. 创建 `agents/scheduler/index.ts` 导出
3. 更新所有 scheduler 模块的内部 import 路径
4. 更新外部引用 `src/app/[locale]/scheduler/SchedulerClient.tsx`

### 阶段 4：移动 agent 核心模块
1. 移动 `agent/` 到 `agents/agent/`
2. 创建 `agents/agent/index.ts` 导出
3. 更新所有 agent 模块的内部 import 路径
4. 更新外部引用 `src/lib/db/__tests__/optimization.test.ts`

### 阶段 5：创建统一导出
1. 创建 `src/lib/agents/index.ts` 统一导出所有子模块
2. 确保向后兼容（可选：保留旧的 `src/lib/agent`、`src/lib/agent-scheduler`、`src/lib/a2a` 作为重导出）

### 阶段 6：验证
1. 运行 `pnpm build` 确保无编译错误
2. 运行 `pnpm lint` 确保无警告
3. 检查是否有未更新的 import 路径

## 关键规则

1. **不要删除任何功能**，只移动文件
2. 更新所有 `import` 路径（内部和外部）
3. 确保 `pnpm build` 通过
4. 保持向后兼容（如果其他模块依赖这些文件）

## 预期问题

1. **绝对路径导入**：需要将 `@/lib/agent` 更新为 `@/lib/agents/agent`
2. **测试文件**：测试文件可能需要更新 import 路径
3. **向后兼容**：为了安全，可以暂时保留旧路径的重导出

## 执行时间估算

- 阶段 1-2：5 分钟
- 阶段 3：10 分钟（需要仔细检查外部引用）
- 阶段 4：10 分钟（最核心的模块，需谨慎）
- 阶段 5-6：10 分钟
- **总计约 35 分钟**
