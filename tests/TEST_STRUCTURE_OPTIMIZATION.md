# 测试文件结构优化报告

## 一、当前状态分析

### 测试文件分布（共 540 个测试文件）

| 位置 | 数量 | 问题 |
|------|------|------|
| `tests/` 根目录 | 98 | 与 src 下的测试重复 |
| `src/**/__tests__/` | 235 | 分散在源码各处 |
| `src/` 内联测试（与源码同级）| 146 | 混乱，难以管理 |
| `src/test/` | 61 | 与 tests/ 目录重复 |

### 重复测试问题

#### 1. Load Balancer 测试（5 个重复文件）
- `tests/lib/agent-scheduler/load-balancer.test.ts`
- `tests/lib/agents/scheduler/load-balancer.test.ts`
- `tests/integration/load-balancer.test.ts`
- `tests/unit/agent-scheduler/core/load-balancer.test.ts`
- `tests/unit/agent-scheduler/load-balancer.test.ts`

#### 2. Scheduler 测试（7 个重复文件）
- `tests/lib/agents/scheduler/scheduler.test.ts`
- `tests/lib/agent-scheduler/scheduler.test.ts`
- `tests/unit/agent-scheduler/core/scheduler.test.ts`
- `tests/unit/agent-scheduler/scheduler.test.ts`
- `src/lib/agents/scheduler/__tests__/scheduler.test.ts` (7zi-frontend)

#### 3. Ranking 测试（3 个重复文件）
- `tests/lib/agents/scheduler/ranking.test.ts`
- `tests/lib/agent-scheduler/ranking.test.ts`
- `tests/unit/agent-scheduler/core/ranking.test.ts`

#### 4. Matching 测试（2 个重复文件）
- `tests/lib/agent-scheduler/matching.test.ts`
- `tests/unit/agent-scheduler/core/matching.test.ts`

#### 5. WebSocket 测试（大量分散）
- 17 个不同位置的 WebSocket 测试文件

#### 6. Permissions 测试（多处重复）
- 多个位置的权限测试文件

### 命名不一致问题

1. **文件后缀不统一**：
   - `.test.ts` - 单元测试
   - `.spec.ts` - E2E/集成测试
   - 混用导致混乱

2. **目录结构不一致**：
   - `__tests__/` 目录
   - 内联测试（与源码同级）
   - `tests/` 根目录
   - `src/test/` 目录

## 二、优化方案

### 目标结构

```
tests/
├── unit/                    # 单元测试（.test.ts）
│   ├── lib/
│   │   ├── agents/
│   │   │   ├── scheduler/   # 合并后的 scheduler 测试
│   │   │   │   ├── load-balancer.test.ts
│   │   │   │   ├── scheduler.test.ts
│   │   │   │   ├── ranking.test.ts
│   │   │   │   └── matching.test.ts
│   │   │   └── a2a/
│   │   ├── db/
│   │   ├── websocket/
│   │   └── ...
│   └── ...
├── integration/             # 集成测试（.test.ts）
│   ├── api/
│   ├── websocket/
│   └── ...
├── e2e/                     # E2E 测试（.spec.ts）
│   └── ...
└── setup/                   # 测试工具和配置
    ├── setup.ts
    ├── test-utils.tsx
    └── mocks/
```

### 优化步骤

1. **合并重复测试文件**
   - 保留最完整/最新的版本
   - 合并不同版本的测试用例

2. **统一命名规范**
   - 单元测试：`.test.ts`
   - E2E/集成测试：`.spec.ts`
   - 测试目录：`tests/`

3. **清理 src/ 下的测试文件**
   - 移动 `src/test/` 中的工具文件到 `tests/setup/`
   - 删除 `src/**/__tests__/` 中的重复测试
   - 删除内联测试文件

4. **保留 `src/test/` 目录**
   - 仅保留测试工具、mock、setup 文件
   - 删除测试用例文件

## 三、执行计划

### 阶段 1：合并 agent-scheduler 测试（高优先级）

合并以下测试文件：
- Load Balancer: 5 → 1
- Scheduler: 7 → 1
- Ranking: 3 → 1
- Matching: 2 → 1

### 阶段 2：清理 src/test/ 目录

移动测试工具到 `tests/setup/`，删除测试用例。

### 阶段 3：清理内联测试

删除 `src/` 下与源码同级的测试文件。

### 阶段 4：运行测试验证

确保优化后测试 100% 通过。

## 四、预期成果

- 测试文件数量：540 → ~400（减少 ~26%）
- 重复测试：消除
- 目录结构：清晰
- 命名规范：统一
