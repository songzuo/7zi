# v1.7.0 测试策略文档

**文档版本**: 1.0
**创建日期**: 2026-04-01
**负责人**: 🧪 测试员（质量保障专家）
**版本**: v1.7.0

---

## 📋 目录

1. [概述](#概述)
2. [现有测试覆盖分析](#现有测试覆盖分析)
3. [v1.7.0 功能测试影响评估](#v170-功能测试影响评估)
4. [测试策略设计](#测试策略设计)
5. [测试工具和框架推荐](#测试工具和框架推荐)
6. [测试覆盖率目标](#测试覆盖率目标)
7. [关键测试场景列表](#关键测试场景列表)
8. [测试执行计划](#测试执行计划)
9. [持续集成配置](#持续集成配置)

---

## 概述

### 文档目的

本文档为 **7zi-frontend 项目 v1.7.0** 新功能制定完整的测试策略，包括：

- Multi-Agent 协作框架增强
- 可视化工作流编排器完善
- 告警渠道（邮件、Slack）
- 根因分析自动化

### v1.7.0 核心功能

| 功能模块 | 复杂度 | 测试优先级 | 风险等级 |
|---------|-------|----------|---------|
| Multi-Agent 协作框架 | 高 | P0 | 高 |
| 可视化工作流编排器 | 高 | P0 | 高 |
| 告警渠道（邮件、Slack） | 中 | P1 | 中 |
| 根因分析自动化 | 中 | P1 | 中 |

### 测试目标

- **单元测试覆盖率**: 95%+（核心模块）
- **集成测试覆盖率**: 85%+（关键路径）
- **E2E 测试覆盖率**: 80%+（用户场景）
- **测试执行时间**: <5 分钟（单元测试）< <10 分钟（E2E 测试）

---

## 现有测试覆盖分析

### 测试统计

**当前状态**（基于 vitest.config.ts 和项目扫描）：

| 指标 | 数值 | 说明 |
|-----|------|------|
| 测试文件数 | 343 | *.test.ts + *.spec.ts |
| 源代码文件数 | 589 | *.ts（不含测试） |
| 测试覆盖率目标 | 50%+ | 当前 vitest 配置阈值 |
| 实际覆盖率 | ~60-70% | 估算值 |

### 测试工具链

```mermaid
graph LR
    A[测试运行器] --> B[Vitest 4.1]
    C[E2E 框架] --> D[Playwright 1.58]
    E[断言库] --> F[@testing-library]
    G[覆盖率] --> H[@vitest/coverage-v8]
    I[Mock 工具] --> J[MSW 2.12]
```

**当前配置**:
- **Vitest 4.1**: 单元测试和集成测试
- **Playwright 1.58**: E2E 测试
- **@testing-library/react**: React 组件测试
- **MSW 2.12**: API Mock
- **jsdom**: 浏览器环境模拟

### 现有测试模块覆盖

#### ✅ 已充分覆盖的模块

| 模块 | 测试文件数 | 覆盖率 | 状态 |
|-----|----------|-------|------|
| Agent Registry | 28,027 行测试 | 100% | ✅ 优秀 |
| A2A Protocol v2.1 | 45,238 行测试 | 100% | ✅ 优秀 |
| WebSocket Rooms | 86 tests | 100% | ✅ 优秀 |
| Agent Scheduler | 122 tests | 100% | ✅ 优秀 |
| Performance Monitor | 76 tests | 98.91% | ✅ 优秀 |
| Auth | 15+ tests | 85%+ | ✅ 良好 |
| Database | 25+ tests | 80%+ | ✅ 良好 |

#### 🟡 部分覆盖的模块

| 模块 | 测试文件数 | 覆盖率 | 缺失 |
|-----|----------|-------|------|
| Monitoring Dashboard | 6 tests | 60% | 边界情况、错误处理 |
| Multi-Agent 基础 | 10+ tests | 70% | 复杂协作场景 |
| Notification Service | 8+ tests | 75% | 渠道集成测试 |

#### 🔴 需要加强的模块

| 模块 | 测试文件数 | 覆盖率 | 优先级 |
|-----|----------|-------|--------|
| 可视化工作流编排器 | 0 | 0% | **P0** |
| 告警渠道（邮件/Slack） | 0 | 0% | **P1** |
| 根因分析自动化 | 0 | 0% | **P1** |
| AI 对话式任务创建 | 0 | 0% | **P2** |

---

## v1.7.0 功能测试影响评估

### 1. Multi-Agent 协作框架增强

#### 功能描述

在现有 A2A Protocol v2.1 基础上，增强多 Agent 协作能力：

- 动态任务委派和负载均衡
- Agent 能力动态发现
- 协作会话管理
- 故障恢复和重试策略

#### 测试影响分析

**现有基础**:
- ✅ `src/lib/agents/a2a/__tests__/protocol-v2.1.test.ts` (1549+ 行)
- ✅ `src/lib/multi-agent/__tests__/message-bus.test.ts`
- ✅ `src/lib/multi-agent/__tests__/registry.test.ts`
- ✅ `src/lib/multi-agent/__tests__/protocol.test.ts`

**新增测试需求**:

| 测试类型 | 测试数量 | 优先级 | 复杂度 |
|---------|---------|-------|--------|
| 单元测试 | 30+ | P0 | 中 |
| 集成测试 | 15+ | P0 | 高 |
| E2E 测试 | 5+ | P1 | 高 |

**关键测试场景**:
1. ✅ 动态 Agent 发现和注册
2. ✅ 任务委派路由算法
3. ✅ 负载均衡策略验证
4. ✅ Agent 故障自动转移
5. ✅ 协作会话状态同步

#### 测试文件规划

```
src/lib/agents/collaboration/__tests__/
├── dynamic-discovery.test.ts          # 动态发现
├── load-balancer.test.ts               # 负载均衡
├── session-manager.test.ts             # 会话管理
├── fault-tolerance.test.ts            # 故障容错
└── integration/
    ├── full-collaboration.test.ts      # 完整协作流程
    └── multi-agent-scenarios.test.ts   # 多 Agent 场景
```

---

### 2. 可视化工作流编排器

#### 功能描述

提供可视化的工作流编排界面，支持：

- 节点拖拽和连接
- 工作流验证和执行
- 实时状态可视化
- 版本控制和回滚

#### 测试影响分析

**现有基础**:
- ❌ 无现有测试（新功能）
- ✅ 可复用：`src/lib/websocket/rooms.test.ts` (房间管理)
- ✅ 可复用：`src/lib/monitoring/__tests__/monitor.test.ts`

**新增测试需求**:

| 测试类型 | 测试数量 | 优先级 | 复杂度 |
|---------|---------|-------|--------|
| 单元测试 | 40+ | **P0** | 高 |
| 集成测试 | 20+ | **P0** | 高 |
| E2E 测试 | 10+ | **P0** | 高 |
| 视觉回归测试 | 15+ | **P1** | 中 |

**关键测试场景**:
1. 🔴 节点拖拽和连接交互
2. 🔴 工作流语法验证
3. 🔴 工作流执行引擎
4. 🔴 实时状态更新
5. 🔴 版本控制和回滚
6. 🔴 协作编辑冲突解决

#### 测试文件规划

```
src/components/workflow/__tests__/
├── WorkflowCanvas.test.tsx            # 画布组件
├── WorkflowNode.test.tsx               # 节点组件
├── WorkflowEdge.test.tsx               # 连接线组件
├── WorkflowValidator.test.ts           # 验证器
├── WorkflowExecutor.test.ts            # 执行引擎
├── WorkflowVersionControl.test.ts      # 版本控制
└── integration/
    ├── workflow-execution.test.ts     # 执行集成测试
    └── collaborative-editing.test.ts   # 协作编辑测试

e2e/workflow/
├── workflow-creation.spec.ts           # 创建工作流
├── workflow-execution.spec.ts          # 执行工作流
├── workflow-visualization.spec.ts      # 可视化验证
├── workflow-collaboration.spec.ts      # 协作编辑
└── workflow-visual-regression.spec.ts  # 视觉回归
```

---

### 3. 告警渠道（邮件、Slack）

#### 功能描述

集成邮件和 Slack 告警渠道：

- 邮件告警（Nodemailer）
- Slack Webhook 告警
- 告警规则和阈值配置
- 告警历史和统计

#### 测试影响分析

**现有基础**:
- ✅ `src/lib/services/__tests__/email.test.ts` (邮件服务测试)
- ✅ `src/lib/performance/alerting/__tests__/alerter.test.ts` (告警引擎)
- ❌ 无 Slack 测试

**新增测试需求**:

| 测试类型 | 测试数量 | 优先级 | 复杂度 |
|---------|---------|-------|--------|
| 单元测试 | 25+ | **P1** | 中 |
| 集成测试 | 10+ | **P1** | 高 |
| E2E 测试 | 5+ | **P2** | 中 |

**关键测试场景**:
1. 🔴 邮件告警发送（成功/失败）
2. 🔴 Slack Webhook 告警
3. 🔴 告警规则触发和过滤
4. 🔴 告警频率限制（防轰炸）
5. 🔴 告警历史记录查询
6. 🔴 多渠道并发告警

#### 测试文件规划

```
src/lib/alerting/__tests__/
├── email-channel.test.ts              # 邮件渠道
├── slack-channel.test.ts               # Slack 渠道
├── alert-rules.test.ts                 # 告警规则
├── rate-limiter.test.ts               # 频率限制
└── integration/
    ├── multi-channel.test.ts           # 多渠道集成
    └── alert-history.test.ts           # 告警历史

e2e/alerting/
├── email-alert.spec.ts                 # 邮件告警 E2E
├── slack-alert.spec.ts                 # Slack 告警 E2E
└── alert-dashboard.spec.ts            # 告警仪表盘
```

---

### 4. 根因分析自动化

#### 功能描述

自动分析性能问题根因：

- 慢请求追踪
- 数据库查询分析
- API 响应时间分解
- 根因推荐和修复建议

#### 测试影响分析

**现有基础**:
- ✅ `src/lib/monitoring/root-cause/` (根因分析模块)
- ✅ `src/lib/performance/root-cause-analysis/__tests__/` (部分测试)

**新增测试需求**:

| 测试类型 | 测试数量 | 优先级 | 复杂度 |
|---------|---------|-------|--------|
| 单元测试 | 20+ | **P1** | 中 |
| 集成测试 | 10+ | **P1** | 高 |
| E2E 测试 | 5+ | **P2** | 中 |

**关键测试场景**:
1. 🔴 慢请求自动检测
2. 🔴 N+1 查询识别
3. 🔴 性能瓶颈定位
4. 🔴 根因推荐算法
5. 🔴 修复建议生成

#### 测试文件规划

```
src/lib/monitoring/root-cause/__tests__/
├── slow-request-detector.test.ts      # 慢请求检测
├── nplus1-detector.test.ts             # N+1 检测
├── bottleneck-analyzer.test.ts         # 瓶颈分析
├── root-cause-recommender.test.ts      # 根因推荐
└── integration/
    └── automated-analysis.test.ts      # 自动化分析流程

e2e/root-cause/
├── slow-request-analysis.spec.ts      # 慢请求分析 E2E
└── root-cause-dashboard.spec.ts        # 根因分析仪表盘
```

---

## 测试策略设计

### 测试金字塔

```
         /\
        /  \
       /E2E \        10%  (40 tests)
      /------\
     / Integration\   30% (120 tests)
    /--------------\
   /   Unit Tests   \  60% (240 tests)
  /------------------\
```

### 单元测试策略

#### 测试优先级

| 优先级 | 模块 | 测试数量 | 覆盖率目标 |
|-------|------|---------|----------|
| **P0** | Multi-Agent 协作 | 30+ | 95%+ |
| **P0** | 可视化工作流编排器 | 40+ | 95%+ |
| **P1** | 告警渠道 | 25+ | 90%+ |
| **P1** | 根因分析 | 20+ | 90%+ |
| **P2** | UI 组件优化 | 15+ | 85%+ |

#### 测试原则

1. **独立隔离**: 每个测试独立运行，不依赖其他测试
2. **快速执行**: 单个测试执行时间 <100ms
3. **Mock 外部依赖**: Mock 所有 API、数据库、第三方服务
4. **边界测试**: 测试边界值、空值、异常情况
5. **快照测试**: 对 UI 组件使用快照测试

#### 测试工具配置优化

```typescript
// vitest.config.ts 优化建议

export default defineConfig({
  test: {
    // 并发配置
    maxConcurrency: 8, // 提升并发度
    minThreads: 2,
    maxThreads: 8,

    // 超时配置
    testTimeout: 30000,  // 单个测试 30 秒
    fileTimeout: 60000, // 单个文件 60 秒

    // 覆盖率阈值（v1.7.0 目标）
    coverage: {
      thresholds: {
        lines: 70,      // 提升 20%
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
});
```

---

### 集成测试策略

#### 测试重点

1. **Multi-Agent 协作集成**
   - Agent 发现 → 任务委派 → 结果聚合 → 故障恢复
   - 多 Agent 并发协作场景
   - 长时间运行任务的状态同步

2. **工作流编排集成**
   - 工作流创建 → 验证 → 执行 → 监控 → 完成
   - 多节点并行/串行执行
   - 失败节点重试和补偿

3. **告警系统集成**
   - 监控指标采集 → 告警规则匹配 → 多渠道发送 → 历史记录
   - 告警抑制和去重
   - 告警升级和降级

4. **根因分析集成**
   - 性能数据收集 → 异常检测 → 根因定位 → 推荐生成
   - 端到端的慢请求分析流程

#### 测试环境配置

```typescript
// tests/integration/setup.ts
import { setupServer } from 'msw/node';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

export async function setupIntegrationTest() {
  // 1. 清理测试数据库
  await db.clear();
  await redis.flushall();

  // 2. 启动 MSW server
  const server = setupServer(...handlers);
  server.listen();

  // 3. 创建测试用户
  const testUser = await db.user.create({
    email: 'test@example.com',
    role: 'admin',
  });

  return { server, testUser };
}

export async function teardownIntegrationTest(server: any) {
  server.close();
  await db.clear();
}
```

---

### E2E 测试策略

#### 测试场景设计

**用户旅程 1: Multi-Agent 协作任务**

```typescript
// e2e/multi-agent/collaboration.spec.ts
test('完整的多 Agent 协作流程', async ({ page }) => {
  // 1. 用户登录
  await login(page);

  // 2. 创建协作任务
  await page.goto('/agents/tasks/new');
  await page.fill('[name="description"]', '分析销售数据');
  await page.selectOption('[name="agents"]', ['analyst', 'visualizer']);

  // 3. 提交任务并监控执行
  await page.click('[type="submit"]');
  await expect(page.locator('.task-status')).toHaveText('执行中');

  // 4. 验证结果聚合
  await page.waitForSelector('.result-aggregated');
  await expect(page.locator('.agent-result')).toHaveCount(2);
});
```

**用户旅程 2: 可视化工作流创建和执行**

```typescript
// e2e/workflow/workflow-execution.spec.ts
test('创建并执行可视化工作流', async ({ page }) => {
  await login(page);
  await page.goto('/workflow/new');

  // 1. 添加数据源节点
  await page.dragAndDrop(
    '[data-node-type="datasource"]',
    '#workflow-canvas'
  );

  // 2. 添加处理节点
  await page.dragAndDrop(
    '[data-node-type="processor"]',
    '#workflow-canvas'
  );

  // 3. 连接节点
  await page.mouse.down(
    await page.locator('.node-handle.output').first().boundingBox()
  );
  await page.mouse.move(
    await page.locator('.node-handle.input').boundingBox()
  );
  await page.mouse.up();

  // 4. 验证和执行工作流
  await page.click('[data-action="validate"]');
  await expect(page.locator('.validation-status')).toHaveText('有效');

  await page.click('[data-action="execute"]');
  await expect(page.locator('.execution-status')).toHaveText('完成');
});
```

**用户旅程 3: 告警接收和处理**

```typescript
// e2e/alerting/email-alert.spec.ts
test('性能告警邮件发送', async ({ page, context }) => {
  // 1. 设置 Mock SMTP
  const smtpServer = await startMockSMTP();

  // 2. 触发性能告警
  await simulateSlowAPI('/api/analytics', 5000);

  // 3. 验证邮件发送
  const emails = await smtpServer.getEmails();
  expect(emails).toHaveLength(1);
  expect(emails[0].subject).toContain('性能告警');
  expect(emails[0].to).toBe('admin@example.com');
});
```

#### 视觉回归测试

```typescript
// e2e/workflow/workflow-visual-regression.spec.ts
test('工作流画布视觉回归', async ({ page }) => {
  await login(page);
  await page.goto('/workflow/complex-workflow');

  // 等待渲染完成
  await page.waitForSelector('#workflow-canvas');

  // 截图对比
  await expect(page.locator('#workflow-canvas'))
    .toHaveScreenshot('workflow-canvas.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
});
```

---

## 测试工具和框架推荐

### 单元测试工具

| 工具 | 用途 | 版本 | 推荐理由 |
|-----|------|------|---------|
| **Vitest** | 测试运行器 | 4.1+ | ✓ 快速、轻量<br>✓ Vite 生态集成<br>✓ TypeScript 原生支持 |
| **@testing-library/react** | React 组件测试 | 16.3+ | ✓ 最佳实践<br>✓ 用户行为模拟 |
| **MSW** | API Mock | 2.12+ | ✓ 拦截 HTTP 请求<br>✓ 服务端/客户端统一 API |
| **@vitest/coverage-v8** | 覆盖率统计 | 4.1+ | ✓ V8 引擎<br>✓ 低性能开销 |

### E2E 测试工具

| 工具 | 用途 | 版本 | 推荐理由 |
|-----|------|------|---------|
| **Playwright** | E2E 框架 | 1.58+ | ✓ 跨浏览器支持<br>✓ 快速稳定<br>✓ 强大的自动等待 |
| **@playwright/test** | 断言库 | 1.58+ | ✓ 集成度高<br>✓ 类型安全 |

### 辅助工具

| 工具 | 用途 | 推荐场景 |
|-----|------|---------|
| **faker.js** | 生成测试数据 | 随机用户、任务数据 |
| **nock** | HTTP Mock（备选） | 简单的 API Mock |
| **wait-for-expect** | 异步等待 | 复杂条件等待 |
| **axe-playwright** | 无障碍测试 | WCAG 合规检查 |

---

## 测试覆盖率目标

### 整体覆盖率目标

| 指标 | 当前值 | v1.7.0 目标 | 提升 |
|-----|-------|------------|------|
| **Lines** | 50% | **70%** | +20% |
| **Functions** | 50% | **70%** | +20% |
| **Branches** | 40% | **65%** | +25% |
| **Statements** | 50% | **70%** | +20% |

### 模块级覆盖率目标

| 模块 | 单元测试 | 集成测试 | E2E 测试 | 综合覆盖率 |
|-----|---------|---------|---------|----------|
| Multi-Agent 协作 | 95% | 85% | 80% | **90%+** |
| 可视化工作流 | 95% | 85% | 80% | **90%+** |
| 告警渠道 | 90% | 80% | 70% | **85%+** |
| 根因分析 | 90% | 80% | 70% | **85%+** |
| WebSocket | 90% | 85% | 80% | **88%+** |
| Agent Registry | 95% | 90% | 85% | **92%+** |

### 覆盖率监控

```bash
# 生成覆盖率报告
npm run test:coverage

# 查看覆盖率详情
open coverage/index.html

# CI 中检查覆盖率阈值
npm run test:coverage -- --reporter=json --outputFile=coverage/coverage.json
```

---

## 关键测试场景列表

### Multi-Agent 协作框架（45 场景）

#### 单元测试（30 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| MA-001 | 动态 Agent 注册 | P0 |
| MA-002 | Agent 心跳超时检测 | P0 |
| MA-003 | 任务委派路由算法 | P0 |
| MA-004 | 负载均衡策略验证 | P0 |
| MA-005 | Agent 故障转移 | P0 |
| MA-006 | 结果聚合（8 种策略） | P0 |
| MA-007 | 协作会话创建 | P1 |
| MA-008 | 会话状态同步 | P1 |
| MA-009 | 任务依赖解析 | P1 |
| MA-010 | 优先级队列管理 | P1 |
| MA-011 | 重试策略执行 | P1 |
| MA-012 | 超时控制 | P1 |
| MA-013 | 错误处理和恢复 | P1 |
| MA-014 | Agent 能力匹配 | P0 |
| MA-015 | 多 Agent 并发协作 | P0 |
| ... | ... | ... |

#### 集成测试（10 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| MA-I01 | 完整协作流程（发现 → 委派 → 聚合） | P0 |
| MA-I02 | Agent 故障恢复流程 | P0 |
| MA-I03 | 多用户并发协作 | P1 |
| MA-I04 | 长时间任务状态同步 | P1 |
| MA-I05 | 网络分区场景 | P1 |
| ... | ... | ... |

#### E2E 测试（5 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| MA-E01 | 创建多 Agent 协作任务 | P1 |
| MA-E02 | 监控协作任务执行 | P1 |
| MA-E03 | 查看 Agent 状态仪表盘 | P2 |
| MA-E04 | 手动干预失败任务 | P2 |
| MA-E05 | 导出协作报告 | P2 |

---

### 可视化工作流编排器（70 场景）

#### 单元测试（40 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| WF-001 | 节点拖拽 | P0 |
| WF-002 | 节点连接 | P0 |
| WF-003 | 节点删除 | P0 |
| WF-004 | 连接线绘制 | P0 |
| WF-005 | 工作流语法验证 | P0 |
| WF-006 | 循环依赖检测 | P0 |
| WF-007 | 空节点处理 | P1 |
| WF-008 | 无效连接检测 | P1 |
| WF-009 | 工作流执行引擎 | P0 |
| WF-010 | 串行节点执行 | P0 |
| WF-011 | 并行节点执行 | P0 |
| WF-012 | 条件分支执行 | P0 |
| WF-013 | 失败节点重试 | P0 |
| WF-014 | 补偿事务执行 | P1 |
| WF-015 | 实时状态更新 | P0 |
| ... | ... | ... |

#### 集成测试（20 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| WF-I01 | 工作流创建 → 验证 → 执行 → 完成 | P0 |
| WF-I02 | 复杂工作流（多分支、并行） | P0 |
| WF-I03 | 工作流版本切换 | P1 |
| WF-I04 | 协作编辑冲突解决 | P0 |
| WF-I05 | 工作流导出/导入 | P1 |
| ... | ... | ... |

#### E2E 测试（10 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| WF-E01 | 创建简单工作流 | P0 |
| WF-E02 | 创建复杂工作流 | P0 |
| WF-E03 | 执行工作流并监控 | P0 |
| WF-E04 | 多人协作编辑工作流 | P1 |
| WF-E05 | 工作流版本管理 | P1 |
| WF-E06 | 视觉回归测试 | P1 |
| WF-E07 | 移动端工作流编辑 | P2 |
| WF-E08 | 无障碍测试 | P2 |
| WF-E09 | 性能测试（大型工作流） | P2 |
| WF-E10 | 错误处理和提示 | P1 |

---

### 告警渠道（40 场景）

#### 单元测试（25 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| AL-001 | 邮件告警发送成功 | P1 |
| AL-002 | 邮件告警发送失败 | P1 |
| AL-003 | Slack Webhook 发送 | P1 |
| AL-004 | 告警规则触发 | P1 |
| AL-005 | 告警规则过滤 | P1 |
| AL-006 | 告警频率限制 | P1 |
| AL-007 | 告警去重 | P1 |
| AL-008 | 多渠道并发发送 | P1 |
| AL-009 | 告警历史记录 | P2 |
| AL-010 | 告警统计查询 | P2 |
| ... | ... | ... |

#### 集成测试（10 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| AL-I01 | 监控 → 规则匹配 → 告警发送 | P1 |
| AL-I02 | 多告警源并发 | P1 |
| AL-I03 | 告警抑制和升级 | P2 |
| AL-I04 | 告警恢复通知 | P2 |
| AL-I05 | 告警聚合发送 | P2 |
| ... | ... | ... |

#### E2E 测试（5 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| AL-E01 | 配置邮件告警 | P2 |
| AL-E02 | 配置 Slack 告警 | P2 |
| AL-E03 | 查看告警历史 | P2 |
| AL-E04 | 查看告警仪表盘 | P2 |
| AL-E05 | 测试告警发送 | P2 |

---

### 根因分析（35 场景）

#### 单元测试（20 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| RC-001 | 慢请求检测 | P1 |
| RC-002 | N+1 查询识别 | P1 |
| RC-003 | 数据库瓶颈分析 | P1 |
| RC-004 | API 响应时间分解 | P1 |
| RC-005 | 根因推荐算法 | P1 |
| RC-006 | 修复建议生成 | P1 |
| RC-007 | 性能趋势分析 | P1 |
| RC-008 | 异常关联分析 | P2 |
| RC-009 | 根因置信度计算 | P2 |
| RC-010 | 历史根因对比 | P2 |
| ... | ... | ... |

#### 集成测试（10 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| RC-I01 | 性能数据收集 → 分析 → 推荐 | P1 |
| RC-I02 | 端到端慢请求分析 | P1 |
| RC-I03 | 多维度根因关联 | P2 |
| RC-I04 | 根因历史追踪 | P2 |
| RC-I05 | 自动修复建议验证 | P2 |
| ... | ... | ... |

#### E2E 测试（5 场景）

| ID | 场景 | 优先级 |
|----|------|-------|
| RC-E01 | 查看根因分析报告 | P2 |
| RC-E02 | 查看性能趋势图表 | P2 |
| RC-E03 | 应用修复建议 | P2 |
| RC-E04 | 导出根因分析数据 | P2 |
| RC-E05 | 查看历史根因记录 | P2 |

---

## 测试执行计划

### 测试阶段划分

```
┌─────────────────────────────────────────────────────┐
│ Phase 1: 单元测试 (Week 1-2)                        │
├─────────────────────────────────────────────────────┤
│ • Multi-Agent 协作单元测试 (30 tests)               │
│ • 可视化工作流单元测试 (40 tests)                   │
│ • 告警渠道单元测试 (25 tests)                       │
│ • 根因分析单元测试 (20 tests)                       │
│                                                      │
│ 目标: 95%+ 覆盖率 (核心模块)                        │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Phase 2: 集成测试 (Week 2-3)                        │
├─────────────────────────────────────────────────────┤
│ • Multi-Agent 协作集成测试 (10 tests)               │
│ • 可视化工作流集成测试 (20 tests)                   │
│ • 告警系统集成测试 (10 tests)                       │
│ • 根因分析集成测试 (10 tests)                       │
│                                                      │
│ 目标: 85%+ 覆盖率 (关键路径)                        │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Phase 3: E2E 测试 (Week 3-4)                        │
├─────────────────────────────────────────────────────┤
│ • Multi-Agent 协作 E2E (5 tests)                    │
│ • 可视化工作流 E2E (10 tests)                       │
│ • 告警系统 E2E (5 tests)                           │
│ • 根因分析 E2E (5 tests)                           │
│                                                      │
│ 目标: 80%+ 覆盖率 (用户场景)                        │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Phase 4: 回归测试和优化 (Week 4)                    │
├─────────────────────────────────────────────────────┤
│ • 视觉回归测试                                       │
│ • 性能测试                                           │
│ • 无障碍测试                                         │
│ • 测试优化和重构                                     │
└─────────────────────────────────────────────────────┘
```

### 测试执行命令

```bash
# Phase 1: 单元测试
npm run test:run                  # 运行所有单元测试
npm run test:coverage             # 生成覆盖率报告

# Phase 2: 集成测试
npm run test:run tests/integration

# Phase 3: E2E 测试
npm run test:e2e                  # 运行所有 E2E 测试
npm run test:e2e:ui               # UI 模式运行
npm run test:e2e:debug            # 调试模式

# Phase 4: 回归测试
npm run test:e2e:chromium         # Chromium 回归测试
npm run test:e2e -- --update-snapshots  # 更新视觉回归基线

# 全量测试
npm run test:all                  # 单元测试 + E2E 测试
```

---

## 持续集成配置

### GitHub Actions 工作流

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
      
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% is below threshold 70%"
            exit 1
          fi
          echo "✅ Coverage $COVERAGE% meets threshold"

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  integration-tests:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
        ports:
          - 6379:6379
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run integration tests
        run: npm run test:run tests/integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
```

### 测试质量门禁

```yaml
# 测试必须满足的条件
quality_gates:
  - name: Unit Test Pass Rate
    threshold: 100%
    critical: true
  
  - name: Unit Test Coverage
    threshold: 70%
    critical: true
  
  - name: E2E Test Pass Rate
    threshold: 100%
    critical: true
  
  - name: Integration Test Pass Rate
    threshold: 100%
    critical: true
  
  - name: Test Execution Time
    threshold: 10 minutes
    critical: false
  
  - name: No Skipped Tests
    threshold: 0 skipped
    critical: true
```

---

## 测试最佳实践

### 1. 测试命名规范

```typescript
// ✅ 好的命名
describe('TaskDelegationManager', () => {
  describe('delegateTask', () => {
    it('should delegate task to agent with matching capabilities', () => {
      // ...
    });

    it('should throw error when no capable agent found', () => {
      // ...
    });

    it('should retry delegation on transient failure', () => {
      // ...
    });
  });
});

// ❌ 不好的命名
describe('Test delegation', () => {
  it('works', () => {
    // ...
  });
});
```

### 2. 测试隔离

```typescript
// ✅ 好的实践：每个测试独立准备数据
beforeEach(() => {
  // 重置状态
  vi.clearAllMocks();
  store.reset();
});

afterEach(() => {
  // 清理资源
  cleanup();
});

// ❌ 不好的实践：测试之间共享状态
let sharedData;
test('test1', () => {
  sharedData = { value: 1 };
});
test('test2', () => {
  // 依赖 test1 的状态
  expect(sharedData.value).toBe(1);
});
```

### 3. Mock 使用

```typescript
// ✅ 好的实践：Mock 外部依赖
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// ✅ 使用 MSW Mock API
const server = setupServer(
  rest.get('/api/agents', (req, res, ctx) => {
    return res(ctx.json({ agents: [] }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 4. 异步测试

```typescript
// ✅ 好的实践：使用 findBy 等待异步
await screen.findByText('任务已完成');

// ✅ 使用 waitFor 等待条件
await waitFor(() => {
  expect(screen.getByText('执行中')).toBeInTheDocument();
});

// ❌ 不好的实践：使用 setTimeout
setTimeout(() => {
  expect(screen.getByText('完成')).toBeInTheDocument();
}, 1000);
```

### 5. 测试数据管理

```typescript
// ✅ 好的实践：使用工厂函数
function createTestAgent(overrides = {}) {
  return {
    id: 'agent-1',
    name: 'Test Agent',
    capabilities: ['data-processing'],
    status: 'online',
    ...overrides,
  };
}

// 使用
const agent = createTestAgent({ status: 'offline' });

// ❌ 不好的实践：硬编码测试数据
const agent = {
  id: 'agent-1',
  name: 'Test Agent',
  // ... 重复定义
};
```

---

## 测试报告和监控

### 测试报告生成

```bash
# 生成 HTML 测试报告
npm run test:coverage

# 生成 E2E 测试报告
npm run test:e2e:report

# 生成 JUnit XML 报告（CI 使用）
npm run test:run -- --reporter=junit --outputFile=test-results/junit.xml
```

### 测试指标监控

| 指标 | 目标值 | 告警阈值 |
|-----|-------|---------|
| 测试通过率 | 100% | < 100% |
| 覆盖率 | 70%+ | < 65% |
| 测试执行时间 | < 5 分钟 | > 8 分钟 |
| 失败测试数量 | 0 | > 0 |
| 跳过测试数量 | 0 | > 0 |

### 测试失败处理流程

```
测试失败 → 查看错误日志 → 定位失败原因
    ↓
是代码问题？
    ↓ 是
修复代码 → 重新运行测试 → 通过
    ↓ 否
是测试问题？
    ↓ 是
修复测试 → 重新运行测试 → 通过
    ↓ 否
是环境问题？
    ↓ 是
修复环境配置 → 重新运行测试 → 通过
```

---

## 测试资源需求

### 人员配置

| 角色 | 职责 | 工作量 |
|-----|------|-------|
| 🧪 测试工程师 | 编写和维护测试 | 全职 4 周 |
| 👨‍💻 开发工程师 | 协助编写单元测试 | 兼职 2 周 |
| 🏗️ 架构师 | 设计测试架构 | 兼职 1 周 |
| 🛡️ DevOps | CI/CD 配置 | 兼职 1 周 |

### 环境需求

| 资源 | 用途 | 配置 |
|-----|------|------|
| CI Runner | 运行测试 | 4 核 16GB |
| 测试数据库 | 集成测试 | PostgreSQL 16 |
| 测试缓存 | 集成测试 | Redis 7 |
| Mock 服务 | API Mock | MSW Server |

---

## 风险和缓解措施

### 测试风险

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| 测试执行时间过长 | 影响 CI 效率 | 中 | 并行执行、优化测试、增量测试 |
| 测试数据管理复杂 | 维护成本高 | 高 | 使用工厂函数、数据生成器 |
| E2E 测试不稳定 | 误报率高 | 中 | 重试机制、自动等待、超时优化 |
| Mock 与实际不符 | 测试无效 | 低 | 定期验证 Mock、使用真实环境集成测试 |
| 测试覆盖率不足 | 质量风险 | 中 | 覆盖率门禁、定期审查 |

### 缓解策略

1. **测试执行时间优化**
   - 使用并行执行
   - 优化慢测试
   - 实施增量测试

2. **测试稳定性提升**
   - 自动等待和重试
   - 隔离测试环境
   - 定期清理测试数据

3. **测试数据管理**
   - 使用工厂函数
   - 实施数据快照
   - 自动生成测试数据

---

## 附录

### A. 测试文件模板

#### 单元测试模板

```typescript
/**
 * Tests for [ModuleName]
 * 
 * @module [ModuleName]
 * @description [Description]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FunctionToTest } from '../module';

describe('FunctionToTest', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('success cases', () => {
    it('should return expected result for valid input', () => {
      // Arrange
      const input = { data: 'test' };
      
      // Act
      const result = FunctionToTest(input);
      
      // Assert
      expect(result).toEqual({ success: true });
    });
  });

  describe('error cases', () => {
    it('should throw error for invalid input', () => {
      // Arrange
      const invalidInput = null;
      
      // Act & Assert
      expect(() => FunctionToTest(invalidInput)).toThrow();
    });
  });
});
```

#### 集成测试模板

```typescript
/**
 * Integration tests for [Feature]
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTest, teardownIntegrationTest } from '../helpers';

describe('[Feature] Integration', () => {
  let server: any;
  let testUser: any;

  beforeAll(async () => {
    const setup = await setupIntegrationTest();
    server = setup.server;
    testUser = setup.testUser;
  });

  afterAll(async () => {
    await teardownIntegrationTest(server);
  });

  it('should complete full workflow', async () => {
    // 1. 创建资源
    // 2. 执行操作
    // 3. 验证结果
  });
});
```

#### E2E 测试模板

```typescript
/**
 * E2E tests for [User Journey]
 */

import { test, expect } from '@playwright/test';

test.describe('[Feature] E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');
    await page.waitForURL('/');
  });

  test('should complete [user journey]', async ({ page }) => {
    // 1. 导航到页面
    await page.goto('/feature');

    // 2. 执行操作
    await page.click('[data-action="create"]');

    // 3. 验证结果
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

### B. 测试工具配置参考

#### Vitest 配置优化

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // 性能优化
    pool: 'forks',
    maxConcurrency: 8,
    minThreads: 2,
    maxThreads: 8,

    // 超时配置
    testTimeout: 30000,
    fileTimeout: 60000,

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
});
```

#### Playwright 配置优化

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

---

## 总结

本测试策略文档为 v1.7.0 版本制定了完整的测试方案，包括：

1. **测试覆盖分析**: 当前 343 个测试文件，覆盖率约 50%，目标提升至 70%+
2. **功能测试评估**: 针对 4 个核心功能模块，规划 190+ 测试场景
3. **测试策略设计**: 单元测试 60%、集成测试 30%、E2E 测试 10%
4. **工具推荐**: Vitest + Playwright + MSW + @testing-library
5. **执行计划**: 4 阶段实施，总计 4 周完成

通过本策略的实施，预期达成：

- ✅ 测试覆盖率从 50% 提升至 70%+
- ✅ 核心模块覆盖率达到 90%+
- ✅ 测试执行时间控制在 5 分钟内
- ✅ CI/CD 测试质量门禁完善
- ✅ 测试稳定性达到 99%+

---

**文档维护**: 本文档将在开发过程中持续更新，确保与实际进展同步。

**下次审查**: v1.7.0 开发完成后（预计 2026-04-28）