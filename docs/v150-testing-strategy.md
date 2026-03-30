# 7zi 项目 v1.5.0 测试策略与质量保障方案

**文档版本**: 1.0
**创建日期**: 2026-03-30
**创建者**: 🧪 测试员
**状态**: ✅ 已完成

---

## 📋 执行摘要

本文档为 7zi 项目 v1.5.0 版本制定全面的测试策略和质量保障方案。v1.5.0 包含 AI Agent Dashboard、权限系统重构（PermissionContext → Zustand）、lib/ 层重构等核心功能，需要确保新功能有足够的测试覆盖，同时维护现有功能的稳定性。

---

## 🎯 v1.5.0 核心功能模块分析

### P0 功能模块（必须测试）

#### 1. AI Agent 调度 Dashboard UI

| 组件 | 文件位置 | 功能描述 | 测试优先级 |
|------|----------|----------|------------|
| `AgentStatusPanel` | `src/components/dashboard/AgentStatusPanel.tsx` | 11 位 Agent 实时状态显示、负载可视化、响应时间趋势 | 🔴 P0 |
| `TaskQueueView` | `src/components/dashboard/TaskQueueView.tsx` | 待处理任务列表、优先级排序、拖拽重排、批量操作 | 🔴 P0 |
| `ScheduleHistory` | `src/components/dashboard/ScheduleHistory.tsx` | 调度决策历史、置信度分布图、异常标记 | 🔴 P0 |
| `ManualOverride` | `src/components/dashboard/ManualOverride.tsx` | 手动干预、强制分配、优先级调整、审计日志 | 🔴 P0 |

**关键测试点**：
- Agent 状态实时更新（WebSocket 连接）
- 任务队列 CRUD 操作
- 拖拽排序功能
- 调度决策记录和回放
- 权限控制（仅管理员可手动干预）

#### 2. 权限系统重构 (PermissionContext → Zustand)

| 模块 | 文件位置 | 功能描述 | 测试优先级 |
|------|----------|----------|------------|
| `permissionStore` | `src/stores/permissionStore.ts` | Zustand 状态管理、权限持久化 | 🔴 P0 |
| `PermissionContext` | `src/contexts/PermissionContext.tsx` | 废弃的 Context（需验证迁移） | 🟡 P1 |
| `permission-migration` | `src/lib/auth/permission-migration.ts` | 迁移工具函数 | 🔴 P0 |

**关键测试点**：
- 权限状态正确初始化
- 权限检查函数（hasPermission、hasAnyPermission）
- 角色层级验证
- localStorage 持久化
- 迁移后的向后兼容性

#### 3. lib/ 层重构

| 模块 | 变更内容 | 测试优先级 |
|------|----------|------------|
| `src/lib/agent/` | 合并至 `src/lib/agents/` | 🔴 P0 |
| `src/lib/agent-communication/` | 合并至 `src/lib/agents/communication/` | 🔴 P0 |
| 所有导入引用 | 更新导入路径 | 🔴 P0 |

**关键测试点**：
- 所有模块导入正确
- 无循环依赖
- 功能无回归

### P1 功能模块（重要测试）

#### 4. Agent 学习优化系统

| 功能 | 描述 | 测试优先级 |
|------|------|------------|
| 任务完成时间预测 | 基于历史数据预测 | 🟡 P1 |
| Agent 能力评估 | 自动更新能力值 | 🟡 P1 |
| 调度策略优化 | 自动调优参数 | 🟡 P1 |

#### 5. WebSocket 房间系统 UI

| 组件 | 功能 | 测试优先级 |
|------|------|------------|
| 房间创建/加入 | 房间管理操作 | 🟡 P1 |
| 参与者列表 | 实时状态显示 | 🟡 P1 |
| 权限管理 UI | 角色分配界面 | 🟡 P1 |

#### 6. 循环依赖检测

| 功能 | 描述 | 测试优先级 |
|------|------|------------|
| dependency-cruiser 集成 | CI/CD 自动检测 | 🟢 P2 |

---

## 🧪 测试策略分层

### 测试金字塔

```
                    ┌───────────┐
                    │   E2E     │  5-10%
                    │  Tests    │  (Playwright)
                    └─────┬─────┘
                          │
              ┌───────────┴───────────┐
              │    Integration Tests  │  20-30%
              │       (Vitest)        │
              └───────────┬───────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │         Unit Tests                │  60-75%
        │          (Vitest)                 │
        └───────────────────────────────────┘
```

---

## 📦 单元测试策略

### 测试框架配置

**主框架**: Vitest 4.x
**已配置特性**：
- Forks 线程池（支持 better-sqlite3）
- 并行测试（maxThreads: 6）
- 覆盖率报告（V8 provider）
- 全局测试环境

### 单元测试覆盖率目标

| 模块类型 | 行覆盖率 | 分支覆盖率 | 函数覆盖率 | 语句覆盖率 |
|----------|----------|------------|------------|------------|
| 核心 Store | ≥ 95% | ≥ 90% | ≥ 95% | ≥ 95% |
| 工具函数 | ≥ 90% | ≥ 85% | ≥ 90% | ≥ 90% |
| React Hooks | ≥ 85% | ≥ 80% | ≥ 85% | ≥ 85% |
| 组件 | ≥ 80% | ≥ 75% | ≥ 80% | ≥ 80% |
| **总体目标** | **≥ 90%** | **≥ 85%** | **≥ 90%** | **≥ 90%** |

### 关键单元测试用例

#### 1. permissionStore 单元测试

```typescript
// tests/stores/permissionStore.test.ts

describe('PermissionStore', () => {
  describe('权限初始化', () => {
    it('应该正确初始化默认状态')
    it('应该从 Auth 数据初始化权限')
    it('应该处理旧版 PermissionContext 数据')
    it('应该正确规范化权限字符串')
  })

  describe('权限检查', () => {
    it('hasPermission 应返回正确的布尔值')
    it('hasAnyPermission 应检查任意权限')
    it('hasAllPermissions 应检查全部权限')
    it('自定义权限应被正确检查')
  })

  describe('角色管理', () => {
    it('hasRole 应正确识别角色')
    it('isAdmin 应仅对管理员返回 true')
    it('isManagerOrAdmin 应正确处理层级')
  })

  describe('持久化', () => {
    it('权限数据应持久化到 localStorage')
    it('页面刷新后应恢复权限状态')
    it('reset 应清除持久化数据')
  })

  describe('迁移兼容性', () => {
    it('应支持旧版权限字符串映射')
    it('应处理混合格式权限数据')
  })
})
```

#### 2. Dashboard 组件单元测试

```typescript
// tests/components/dashboard/AgentStatusPanel.test.tsx

describe('AgentStatusPanel', () => {
  describe('渲染', () => {
    it('应渲染所有 11 个 Agent 状态')
    it('应显示正确的负载进度条')
    it('应显示响应时间趋势图')
    it('空状态时应显示占位符')
  })

  describe('交互', () => {
    it('点击 Agent 应显示详情')
    it('应支持筛选 Agent 状态')
    it('应实时更新状态（WebSocket）')
  })

  describe('边界情况', () => {
    it('应处理 WebSocket 断开')
    it('应处理无效 Agent 数据')
    it('应处理长时间无响应')
  })
})

// tests/components/dashboard/TaskQueueView.test.tsx

describe('TaskQueueView', () => {
  describe('任务显示', () => {
    it('应正确显示任务列表')
    it('应按优先级排序')
    it('应显示任务依赖关系')
  })

  describe('拖拽操作', () => {
    it('应支持拖拽重新排序')
    it('拖拽后应更新优先级')
    it('应禁止无效的拖拽操作')
  })

  describe('批量操作', () => {
    it('应支持多选任务')
    it('批量删除应确认')
    it('批量修改优先级')
  })
})
```

#### 3. WebSocket 模块单元测试

```typescript
// tests/lib/websocket/rooms.test.ts

describe('RoomManager', () => {
  describe('房间创建', () => {
    it('应创建公开房间')
    it('应创建私有房间（带邀请码）')
    it('应拒绝重复房间 ID')
    it('应设置房间配置选项')
  })

  describe('参与者管理', () => {
    it('用户应能加入公开房间')
    it('私有房间应验证邀请码')
    it('应正确踢出用户')
    it('封禁用户应无法重新加入')
  })

  describe('权限控制', () => {
    it('所有者应有全部权限')
    it('管理员应有管理权限')
    it('访客权限应受限')
    it('权限继承应正确')
  })
})
```

---

## 🔗 集成测试策略

### 集成测试覆盖范围

| 集成场景 | 测试重点 | 工具 |
|----------|----------|------|
| Store + Component | 状态管理集成 | Vitest + Testing Library |
| API + Store | 数据流集成 | Vitest + MSW |
| WebSocket + UI | 实时更新集成 | Vitest + Mock WebSocket |
| Auth + Permission | 权限验证集成 | Vitest |

### 关键集成测试用例

#### 1. 权限系统集成测试

```typescript
// tests/integration/permission-flow.test.tsx

describe('权限系统集成测试', () => {
  describe('用户登录到权限加载', () => {
    it('登录后应自动加载权限')
    it('权限应持久化并在刷新后恢复')
    it('权限变更应实时反映到 UI')
  })

  describe('权限迁移完整性', () => {
    it('PermissionContext 用户应无缝迁移')
    it('旧权限数据应正确转换')
    it('迁移后功能无回归')
  })

  describe('跨组件权限检查', () => {
    it('导航菜单应根据权限显示')
    it('操作按钮应根据权限启用/禁用')
    it('API 请求应包含正确权限头')
  })
})
```

#### 2. Dashboard 集成测试

```typescript
// tests/integration/dashboard-flow.test.tsx

describe('Dashboard 集成测试', () => {
  describe('Agent 状态同步', () => {
    it('WebSocket 连接后应接收状态更新')
    it('状态变更应反映到所有面板')
    it('断线重连应恢复状态')
  })

  describe('任务调度流程', () => {
    it('创建任务应添加到队列')
    it('手动分配应触发调度')
    it('调度结果应记录到历史')
  })

  describe('手动干预流程', () => {
    it('强制分配应验证管理员权限')
    it('干预操作应记录审计日志')
    it('优先级调整应生效')
  })
})
```

#### 3. WebSocket 房间系统集成测试

```typescript
// tests/integration/websocket-rooms.test.ts

describe('WebSocket 房间系统集成', () => {
  describe('房间生命周期', () => {
    it('创建 → 加入 → 离开 → 销毁')
    it('所有者离开应转移所有权')
    it('空房间应自动清理')
  })

  describe('权限继承', () => {
    it('创建者应为所有者')
    it('角色变更应更新权限')
    it('权限检查应在消息发送前验证')
  })
})
```

---

## 🖥️ E2E 测试策略

### 测试框架配置

**主框架**: Playwright
**已配置特性**：
- Chromium 主浏览器
- Mobile Chrome 移动端测试
- 视觉回归测试项目
- 失败时截图和视频录制
- HTML 报告生成

### E2E 测试覆盖范围

| 用户流程 | 测试场景 | 优先级 |
|----------|----------|--------|
| 权限验证流程 | 登录 → 权限加载 → 功能访问 | 🔴 P0 |
| Dashboard 操作 | 状态查看 → 任务调度 → 手动干预 | 🔴 P0 |
| 房间协作流程 | 创建房间 → 邀请成员 → 协作操作 | 🟡 P1 |
| 错误处理流程 | 断网重连 → 权限错误 → 错误恢复 | 🟡 P1 |

### 关键 E2E 测试用例

#### 1. 权限系统 E2E 测试

```typescript
// e2e/permission-flow.spec.ts

test.describe('权限系统 E2E', () => {
  test('管理员应能访问 Dashboard 手动干预', async ({ page }) => {
    // 登录管理员账户
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@7zi.com');
    await page.fill('[name="password"]', 'admin-password');
    await page.click('button[type="submit"]');
    
    // 验证权限加载
    await expect(page.locator('[data-testid="dashboard-link"]')).toBeVisible();
    
    // 访问 Dashboard
    await page.click('[data-testid="dashboard-link"]');
    await expect(page.locator('[data-testid="manual-override"]')).toBeVisible();
  });

  test('普通用户不应看到管理员功能', async ({ page }) => {
    // 登录普通用户
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@7zi.com');
    await page.fill('[name="password"]', 'user-password');
    await page.click('button[type="submit"]');
    
    // 验证管理员功能不可见
    await expect(page.locator('[data-testid="manual-override"]')).not.toBeVisible();
  });

  test('权限应在刷新后保持', async ({ page }) => {
    // 登录并刷新
    await loginAsUser(page, 'manager@7zi.com');
    await page.goto('/dashboard');
    
    // 刷新页面
    await page.reload();
    
    // 验证权限保持
    await expect(page.locator('[data-testid="task-queue"]')).toBeVisible();
  });
});
```

#### 2. Dashboard E2E 测试

```typescript
// e2e/dashboard.spec.ts

test.describe('Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
  });

  test('应显示所有 Agent 状态', async ({ page }) => {
    const agentCards = page.locator('[data-testid="agent-card"]');
    await expect(agentCards).toHaveCount(11);
  });

  test('任务拖拽重排应生效', async ({ page }) => {
    const firstTask = page.locator('[data-testid="task-item"]').first();
    const secondTask = page.locator('[data-testid="task-item"]').nth(1);
    
    await firstTask.dragTo(secondTask);
    
    // 验证排序变更
    await expect(page.locator('[data-testid="task-item"]').first()).toContainText('Task 2');
  });

  test('手动干预应记录审计日志', async ({ page }) => {
    // 打开手动干预面板
    await page.click('[data-testid="manual-override"]');
    
    // 强制分配任务
    await page.selectOption('[data-testid="agent-select"]', 'agent-1');
    await page.click('[data-testid="assign-button"]');
    
    // 验证审计日志
    await page.click('[data-testid="audit-log-tab"]');
    await expect(page.locator('[data-testid="audit-entry"]').last()).toContainText('强制分配');
  });
});
```

#### 3. WebSocket 房间 E2E 测试

```typescript
// e2e/websocket-rooms.spec.ts

test.describe('WebSocket 房间协作', () => {
  test('多人房间应实时同步', async ({ browser }) => {
    // 创建两个浏览器上下文
    const user1 = await browser.newContext();
    const user2 = await browser.newContext();
    
    const page1 = await user1.newPage();
    const page2 = await user2.newPage();
    
    // 用户1 创建房间
    await loginAsUser(page1, 'user1@7zi.com');
    await page1.goto('/rooms');
    await page1.click('[data-testid="create-room"]');
    await page1.fill('[name="room-name"]', 'Test Room');
    await page1.click('button[type="submit"]');
    
    // 获取房间邀请链接
    const inviteLink = await page1.locator('[data-testid="invite-link"]').inputValue();
    
    // 用户2 加入房间
    await loginAsUser(page2, 'user2@7zi.com');
    await page2.goto(inviteLink);
    
    // 验证用户2 在用户1 的列表中显示
    await expect(page1.locator('[data-testid="participant-list"]')).toContainText('user2');
    
    // 清理
    await user1.close();
    await user2.close();
  });
});
```

---

## 🛠️ 测试工具和框架推荐

### 已配置工具

| 工具 | 版本 | 用途 | 配置文件 |
|------|------|------|----------|
| Vitest | 4.x | 单元/集成测试 | `vitest.config.ts` |
| Playwright | 最新 | E2E 测试 | `playwright.config.ts` |
| @testing-library/react | 最新 | React 组件测试 | 已集成 |
| MSW | 最新 | API Mock | `src/test/mocks/` |

### 推荐新增工具

| 工具 | 用途 | 安装命令 |
|------|------|----------|
| `@vitest/coverage-v8` | 覆盖率报告 | 已配置 |
| `@testing-library/user-event` | 用户交互模拟 | `pnpm add -D @testing-library/user-event` |
| `dependency-cruiser` | 循环依赖检测 | `pnpm add -D dependency-cruiser` |
| `faker` | 测试数据生成 | `pnpm add -D @faker-js/faker` |

### CI/CD 集成建议

```yaml
# .github/workflows/test.yml

name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm exec depcruise src --config .dependency-cruiser.js
```

---

## 📊 测试覆盖率目标

### 模块级覆盖率目标

| 模块 | 当前覆盖率 | v1.5.0 目标 | 关键关注点 |
|------|------------|-------------|------------|
| `src/stores/` | ~94% | ≥ 95% | permissionStore 新增测试 |
| `src/lib/websocket/` | ~98% | ≥ 98% | 保持现有覆盖 |
| `src/lib/agents/` | ~95% | ≥ 95% | 重构后验证 |
| `src/components/dashboard/` | 新模块 | ≥ 90% | 新组件全面测试 |
| `src/contexts/` | ~90% | ≥ 85% | 迁移后回归测试 |
| **总体** | **~94%** | **≥ 95%** | **提升 1%+** |

### 功能级测试覆盖矩阵

| 功能 | 单元测试 | 集成测试 | E2E 测试 | 状态 |
|------|----------|----------|----------|------|
| AgentStatusPanel | ✅ 计划 | ✅ 计划 | ✅ 计划 | 待开发 |
| TaskQueueView | ✅ 计划 | ✅ 计划 | ✅ 计划 | 待开发 |
| ScheduleHistory | ✅ 计划 | ✅ 计划 | ✅ 计划 | 待开发 |
| ManualOverride | ✅ 计划 | ✅ 计划 | ✅ 计划 | 待开发 |
| permissionStore | ✅ 已有 | ✅ 计划 | ✅ 计划 | 部分完成 |
| PermissionContext 迁移 | ✅ 计划 | ✅ 计划 | ✅ 计划 | 待开发 |
| lib/ 重构 | ✅ 计划 | ✅ 计划 | - | 待开发 |

---

## 🚨 风险与缓解措施

### 测试风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Dashboard UI 变更频繁 | 中 | 测试维护成本高 | 使用稳定的 data-testid，组件测试优先 |
| WebSocket 测试不稳定 | 中 | CI 失败率高 | Mock WebSocket，增加重试机制 |
| 权限迁移遗漏 | 中 | 功能回归 | 全局搜索引用，E2E 回归测试 |
| lib/ 重构破坏导入 | 低 | 编译失败 | TypeScript 严格模式，自动化测试 |

### 质量门禁

```yaml
# 测试通过标准
quality_gates:
  - name: 单元测试通过率
    threshold: 100%
    action: 阻止合并
  
  - name: 单元测试覆盖率
    threshold: 95%
    action: 警告
  
  - name: E2E 测试通过率
    threshold: 100%
    action: 阻止合并
  
  - name: TypeScript 编译
    threshold: 0 errors
    action: 阻止合并
  
  - name: 循环依赖检测
    threshold: 0 循环
    action: 阻止合并
```

---

## 📅 测试执行计划

### 开发阶段测试

| 阶段 | 测试活动 | 时间安排 |
|------|----------|----------|
| 开发前 | 编写测试用例设计 | 每个 Sprint 第 1 天 |
| 开发中 | 单元测试编写（TDD） | 持续进行 |
| 功能完成 | 集成测试编写 | 功能完成后 1 天内 |
| 合并前 | 代码审查 + 测试审查 | PR 提交时 |

### 发布前测试

| 阶段 | 测试活动 | 时间安排 |
|------|----------|----------|
| Beta 测试 | E2E 完整回归 | 发布前 3 天 |
| 性能测试 | 负载测试、内存泄漏检测 | 发布前 2 天 |
| 安全测试 | 权限穿透测试、SQL 注入测试 | 发布前 2 天 |
| 最终验证 | 全量测试通过 | 发布前 1 天 |

---

## 📝 测试文档和报告

### 必需文档

| 文档 | 位置 | 更新频率 |
|------|------|----------|
| 测试策略 | `docs/v150-testing-strategy.md` | 版本发布时 |
| 测试用例 | `tests/` 目录 | 功能变更时 |
| 测试报告 | `test-results/` | 每次测试执行 |
| 覆盖率报告 | `coverage/` | 每次测试执行 |

### 测试报告模板

```markdown
## 测试执行报告 - [日期]

### 执行摘要
- 总测试数: XXX
- 通过: XXX
- 失败: XXX
- 跳过: XXX

### 覆盖率
- 行覆盖率: XX%
- 分支覆盖率: XX%
- 函数覆盖率: XX%

### 失败测试分析
[失败测试详情]

### 建议改进
[改进建议]
```

---

## ✅ 验收标准

### 功能验收

- [ ] 所有 P0 功能有完整单元测试
- [ ] 所有 P0 功能有集成测试
- [ ] 关键用户流程有 E2E 测试
- [ ] 测试覆盖率 ≥ 95%

### 质量验收

- [ ] 所有测试 100% 通过
- [ ] 无 TypeScript 编译错误
- [ ] 无 ESLint 错误
- [ ] 无循环依赖

### 文档验收

- [ ] 测试策略文档完成
- [ ] 测试用例文档更新
- [ ] 覆盖率报告生成

---

## 📚 参考资料

- [Vitest 官方文档](https://vitest.dev/)
- [Playwright 官方文档](https://playwright.dev/)
- [Testing Library 最佳实践](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW 官方文档](https://mswjs.io/)
- [7zi 项目 CHANGELOG](../CHANGELOG.md)
- [v1.5.0 路线图](../ROADMAP_v1.5.0.md)

---

**文档维护者**: 🧪 测试员
**最后更新**: 2026-03-30
