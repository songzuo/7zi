# 7zi 项目测试覆盖审查报告

**审查日期**: 2026-10-20  
**审查人**: Testor (测试员)  
**工作目录**: /root/.openclaw/workspace

---

## 一、测试文件结构总览

### 1.1 目录结构

```
tests/
├── api/                     # API 路由单元测试
│   └── __tests__/          # 10 个路由测试文件
├── api-integration/        # API 集成测试 (27 个)
├── app/                    # App 层测试 (actions)
├── automation/             # 自动化引擎测试 (5 个)
├── collab/                 # 协作功能测试
├── collaboration/          # 协作组件测试
├── components/             # React 组件测试
│   ├── WorkflowEditor/
│   ├── __tests__/
│   ├── consistency/
│   └── workflow/
├── e2e/                    # E2E 测试 (Playwright, 10 个)
├── economy/                # 经济系统测试
├── health-diagnostic/      # 健康诊断测试
├── hooks/                  # React Hook 测试 (4 个)
├── i18n/                   # 国际化测试
├── integration/            # 集成测试 (10 个)
├── lib/                    # Lib 层单元测试
│   ├── ai/                # AI 相关 (路由、fallback、cost-tracker 等)
│   ├── collaboration/     # 协作工具
│   ├── performance/       # 性能/告警测试
│   ├── plugins/           # 插件测试
│   └── workflow/          # 工作流测试
├── mobile/                # 移动端测试
├── multi-agent/           # 多智能体测试
├── performance/           # 性能测试
├── search/                # 搜索功能测试
├── security/              # 安全测试
├── setup/                 # 测试工具和 mock
│   ├── mocks/
│   ├── node-setup.ts
│   ├── setup-db-mock.ts
│   ├── setup-react.tsx
│   ├── test-env.ts
│   ├── test-utils.tsx
│   └── vi-mocks.ts       # (1012 行) 全局 mock 配置
├── stores/                # Zustand Store 测试 (4 个)
├── trace/                 # 追踪测试
├── unit/                  # 单元测试
│   ├── agent-scheduler/  # Agent 调度器 (8 个测试文件)
│   ├── agents/
│   ├── cache/
│   ├── database/
│   ├── mcp/
│   ├── monitoring/
│   ├── performance/
│   ├── permissions/
│   ├── react-compiler/
│   ├── retry/
│   ├── timeout/
│   └── workflow/
├── websocket/             # WebSocket 测试 (6 个)
└── workflow/              # 工作流测试 (6 个)
```

**总计**:
- 测试文件总数: **194 个** (`.test.ts` + `.test.tsx` + `.spec.ts`)
- 其中 `.test.*`: 160 个
- `.spec.*`: 14 个
- 总代码行数 (测试文件): ~98,161 行

### 1.2 E2E 测试 (独立目录)

存在两套 E2E 测试:

| 位置 | 测试框架 | 文件数 |
|------|----------|--------|
| `/root/.openclaw/workspace/e2e/` | Playwright | 34 个 `.spec.ts` |
| `/root/.openclaw/workspace/tests/e2e/` | Playwright | 10 个 `.spec.ts` |

**问题**: 两个目录有重复但不完全相同的 E2E 测试集，造成维护负担。

---

## 二、测试覆盖范围分析

### 2.1 已覆盖领域 ✅

| 领域 | 测试文件数 | 状态 |
|------|------------|------|
| API 路由 (单元) | 10 | ✅ 覆盖 |
| API 集成 | 27 | ✅ 充分覆盖 |
| 工作流 (workflow) | 15+ | ✅ 充分覆盖 |
| Agent 调度器 | 8 | ✅ 覆盖 |
| AI/ML 模块 | 12+ | ✅ 覆盖 |
| WebSocket | 6+ | ✅ 充分覆盖 |
| React 组件 | 6+ | ✅ 覆盖 |
| Hooks | 4 | ✅ 基本覆盖 |
| Zustand Stores | 4 | ✅ 覆盖 |
| 自动化引擎 | 5 | ✅ 覆盖 |
| 搜索功能 | 2+ | ✅ 覆盖 |
| 安全/RBAC | 2+ | ✅ 基本覆盖 |
| E2E 测试 | 44 | ✅ 覆盖 |

### 2.2 缺失的关键功能测试 ⚠️

| 功能模块 | 状态 | 备注 |
|----------|------|------|
| **Auth 完整流程** | ⚠️ 部分缺失 | logout/refresh 只有集成测试，缺少深层单元测试 |
| **RBAC 权限系统** | ❌ 缺失 | 只有部分集成测试 |
| **数据库迁移** | ❌ 缺失 | 没有数据库迁移测试 |
| **缓存淘汰策略** | ⚠️ 部分缺失 | 只有基本测试 |
| **告警通知渠道** | ⚠️ 部分缺失 | Slack 等渠道测试不完整 |
| **i18n 翻译完整性** | ⚠️ 部分缺失 | 只有 E2E 测试 |
| **性能监控指标** | ⚠️ 部分缺失 | 只有集成测试 |
| **MCP (Model Context Protocol)** | ⚠️ 部分缺失 | 单元测试存在但覆盖有限 |
| **备份/恢复** | ⚠️ 部分缺失 | 只有 API 路由测试 |
| **计费/支付** | ❌ 缺失 | 没有相关测试 |

### 2.3 覆盖率阈值 (来自 vitest.config.ts)

```typescript
coverage: {
  thresholds: {
    lines: 50,      // 当前: ~50%
    functions: 50,  // 当前: ~50%
    branches: 40,   // 当前: ~40%
    statements: 50, // 当前: ~50%
  }
}
```

---

## 三、测试文件命名规范分析

### 3.1 命名规范现状

| 模式 | 用途 | 文件数 | 规范程度 |
|------|------|--------|----------|
| `*.test.ts` | 单元测试 | ~150 | ✅ 正确 |
| `*.test.tsx` | React 组件测试 | ~10 | ✅ 正确 |
| `*.spec.ts` | E2E/集成测试 | ~34 | ⚠️ 混用 |

**问题**: `.spec.ts` 文件在 `tests/e2e/` 和 `/e2e/` 中使用，但部分集成测试也使用 `.spec.ts` (如 `cache-api.spec.ts`)，命名不够统一。

### 3.2 目录层级命名

| 目录名 | 规范程度 | 备注 |
|--------|----------|------|
| `unit/` | ✅ 规范 | 单元测试目录 |
| `integration/` | ✅ 规范 | 集成测试目录 |
| `api-integration/` | ⚠️ 冗余 | 与 `integration/` 重复 |
| `e2e/` | ✅ 规范 | E2E 测试目录 |
| `lib/` | ⚠️ 含义模糊 | 应改为 `unit/lib/` 或 `components/` |

---

## 四、测试组织方式分析

### 4.1 测试组织结构

```
tests/
├── 按类型分: unit/, integration/, e2e/, api-integration/
├── 按功能分: lib/, components/, hooks/, stores/
└── 按模块分: workflow/, websocket/, automation/, search/
```

**评估**: 结构过于复杂，存在分类交叉 (如 `tests/lib/workflow/` vs `tests/workflow/`)

### 4.2 重复测试问题

根据历史文档 `TEST_STRUCTURE_OPTIMIZATION.md`，存在以下重复:

| 模块 | 重复文件数 | 位置 |
|------|------------|------|
| Load Balancer | 5 | 分布在 unit/, integration/, performance/ |
| Scheduler | 7 | 分布在 unit/, lib/, integration/ |
| Ranking | 3 | 多处重复 |
| WebSocket | 17 | 严重分散 |

**状态**: 根据文档，这些重复尚未完全清理。

---

## 五、测试辅助工具检查

### 5.1 测试工具文件

| 文件 | 行数 | 用途 | 状态 |
|------|------|------|------|
| `setup/vi-mocks.ts` | 1012 | 全局 mock (jose, db 等) | ✅ 核心工具 |
| `setup/setup-db-mock.ts` | 263 | 数据库 mock | ✅ 使用中 |
| `setup/setup-react.tsx` | 204 | React 测试配置 | ✅ 使用中 |
| `setup/test-utils.tsx` | 57 | 测试工具函数 | ✅ 使用中 |
| `setup/test-env.ts` | 64 | 测试环境变量 | ✅ 使用中 |
| `setup/node-setup.ts` | 22 | Node 环境配置 | ✅ 使用中 |
| `test/mocks/*` | - | NextRequest mock 等 | ⚠️ 可能冗余 |

### 5.2 未使用/冗余代码检查

**潜在冗余**:
1. `/test/mocks/` 目录 - 部分 mock 功能可能与 `tests/setup/mocks/` 重复
2. `tests/index.ts` - 导出了 mock 创建函数，但实际使用率不明
3. `tests/api-integration/mocks/` - 独立 mock 目录，可能与其他 mock 重复

**需要清理的辅助文件**:
- `test/mocks/next-request.ts` - 可考虑合并到 `tests/setup/mocks/`

### 5.3 Mock 使用统计

```bash
grep -r "vi\.mock\|vi\.fn\|vi\.spyOn" tests/setup/ --include="*.ts" | wc -l
# 结果: 160 处 mock 定义
```

---

## 六、测试配置分析

### 6.1 Vitest 配置

**主配置**: `vitest.config.ts`

关键配置:
- `pool: 'forks'` - 使用进程池执行测试
- `maxForks: 8` - 动态基于 CPU 核心数
- `maxConcurrency: 3` - 最大并发测试文件数
- `testTimeout: 60000` - 单测试超时 60s
- `fileTimeout: 120000` - 单文件超时 120s
- `isolate: true` - 测试隔离
- `maxMemoryUsage: 2048` - 每 worker 2GB 内存限制

### 6.2 额外配置文件

| 配置文件 | 用途 |
|----------|------|
| `vitest.config.integration.ts` | 集成测试专用配置 |
| `vitest.config.optimized.ts` | 优化后的配置 |
| `tests/api-integration/vitest.config.ts` | API 集成测试配置 |
| `playwright.config.ts` | E2E 测试配置 |

**问题**: 存在多个 vitest 配置，配置分散可能造成不一致。

---

## 七、关键发现与建议

### 7.1 高优先级问题

1. **E2E 测试重复**: `/e2e/` 和 `/tests/e2e/` 两套测试，部分用例重复
2. **测试目录结构混乱**: 分类维度不统一 (类型+功能+模块混用)
3. **RBAC/权限测试缺失**: 高优先级的安全测试覆盖不足
4. **计费模块无测试**: 财务相关功能完全没有测试覆盖

### 7.2 中优先级问题

1. **配置分散**: 多个 vitest 配置文件需要统一
2. **mock 目录重复**: `test/mocks/` 和 `tests/setup/mocks/` 可能冗余
3. **API 测试覆盖不均**: 部分 API 只有集成测试，缺少单元测试
4. **测试超时配置**: 部分慢测试可能需要优化或增加超时

### 7.3 建议改进

| 改进项 | 优先级 | 预估工作量 |
|--------|--------|------------|
| 统一 E2E 测试目录 | 高 | 1-2 天 |
| 清理重复测试文件 | 高 | 2-3 天 |
| 增加 RBAC 单元测试 | 高 | 2-3 天 |
| 增加计费模块测试 | 中 | 3-4 天 |
| 统一 vitest 配置 | 中 | 0.5 天 |
| 合并 mock 目录 | 低 | 0.5 天 |

---

## 八、总结

| 指标 | 数值 | 评价 |
|------|------|------|
| 测试文件总数 | 194 | 中等规模 |
| 代码行数 | ~98,161 | 较完整 |
| 覆盖率阈值 | 50/50/40/50 | 基本达标 |
| 目录层级深度 | 4-5 层 | 偏深 |
| 重复测试 | 存在 | 需要清理 |
| 测试工具冗余 | 存在 | 可优化 |

**整体评价**: 7zi 项目的测试覆盖较为全面，测试基础设施完善。主要问题在于测试组织结构略显混乱，存在一定的重复和冗余。建议优先清理重复测试，统一测试目录结构，并补充关键功能 (RBAC、计费) 的测试覆盖。

---

*审查完成 - Testor*
