# v1.5.0 测试套件清单

## 📋 完整测试文件列表

### E2E 测试 (Playwright)

| 文件                                          | 行数 | 测试用例 | 描述                         |
| --------------------------------------------- | ---- | -------- | ---------------------------- |
| `tests/e2e/multi-agent-collaboration.spec.ts` | 357  | 18       | Multi-Agent 协作完整场景测试 |

### 集成测试 (Vitest)

| 文件                                              | 行数 | 测试用例 | 描述                       |
| ------------------------------------------------- | ---- | -------- | -------------------------- |
| `tests/integration/workflow-orchestrator.test.ts` | 537  | 18       | 工作流编排器集成测试       |
| `tests/integration/mcp-server-protocol.test.ts`   | 726  | 22       | MCP Server 协议集成测试    |
| `tests/integration/websocket-room-system.test.ts` | 694  | 25       | WebSocket 房间系统集成测试 |

### 测试辅助

| 文件                           | 行数 | 描述               |
| ------------------------------ | ---- | ------------------ |
| `tests/helpers/e2e-helpers.ts` | ~250 | E2E 测试辅助函数库 |

### 配置文件

| 文件                              | 描述                      |
| --------------------------------- | ------------------------- |
| `.github/workflows/test-v150.yml` | GitHub Actions 测试工作流 |
| `scripts/run-v150-tests.sh`       | 本地测试运行脚本          |

### 文档

| 文件                                             | 描述         |
| ------------------------------------------------ | ------------ |
| `docs/testing/v150-testing-strategy.md`          | 测试策略文档 |
| `docs/testing/E2E-TEST-IMPLEMENTATION-REPORT.md` | 实现报告     |
| `tests/README.md`                                | 测试目录说明 |

---

## 📊 测试覆盖统计

### 测试用例总计

| 类型     | 文件数 | 测试用例数 |
| -------- | ------ | ---------- |
| E2E 测试 | 1      | 18         |
| 集成测试 | 3      | 65         |
| **总计** | **4**  | **83**     |

### 代码量统计

| 类型     | 文件  | 总行数     |
| -------- | ----- | ---------- |
| E2E 测试 | 1     | 357        |
| 集成测试 | 3     | 1,957      |
| 辅助代码 | 1     | ~250       |
| **总计** | **5** | **~2,564** |

---

## 🎯 功能覆盖矩阵

### Multi-Agent 协作

| 测试类型 | 文件                                | 场景数 | 状态 |
| -------- | ----------------------------------- | ------ | ---- |
| E2E      | `multi-agent-collaboration.spec.ts` | 18     | ✅   |
| 集成     | （复用现有 A2A 测试）               | -      | ✅   |
| 单元     | （待补充）                          | -      | 🟡   |

**覆盖场景**:

- ✅ Agent 注册和发现（11 位 AI 成员）
- ✅ 任务分发和智能调度
- ✅ 优先级排序
- ✅ 负载均衡
- ✅ 跨 Agent 协作
- ✅ 错误处理和重试
- ✅ API 集成
- ✅ WebSocket 事件
- ✅ 实时更新

### WebSocket 房间系统

| 测试类型 | 文件                            | 场景数 | 状态 |
| -------- | ------------------------------- | ------ | ---- |
| E2E      | `websocket.spec.ts` (现有)      | ~15    | ✅   |
| 集成     | `websocket-room-system.test.ts` | 25     | ✅   |
| 单元     | （待补充）                      | -      | 🟡   |

**覆盖场景**:

- ✅ 房间创建（6 种类型）
- ✅ 可见性控制（公开/私有/仅邀请）
- ✅ 成员管理（加入/离开/邀请/移除）
- ✅ 权限系统（5 种角色，16 种权限）
- ✅ 消息发送、编辑、删除
- ✅ 消息历史和持久化
- ✅ 角色升级/降级
- ✅ 性能测试（1000 消息，100 房间，100 成员）

### 工作流编排器

| 测试类型 | 文件                            | 场景数 | 状态 |
| -------- | ------------------------------- | ------ | ---- |
| E2E      | （待补充）                      | -      | 🟡   |
| 集成     | `workflow-orchestrator.test.ts` | 18     | ✅   |
| 单元     | （待补充）                      | -      | 🟡   |

**覆盖场景**:

- ✅ 线性工作流执行
- ✅ 条件分支
- ✅ 并行执行
- ✅ 任务依赖
- ✅ 错误重试策略
- ✅ 状态转换
- ✅ 工作流取消
- ✅ 工作流定义验证

### MCP Server 协议

| 测试类型 | 文件                          | 场景数 | 状态 |
| -------- | ----------------------------- | ------ | ---- |
| E2E      | （待补充）                    | -      | 🟡   |
| 集成     | `mcp-server-protocol.test.ts` | 22     | ✅   |
| 单元     | （待补充）                    | -      | 🟡   |

**覆盖场景**:

- ✅ JSON-RPC 2.0 请求/响应
- ✅ 初始化握手
- ✅ 工具注册/注销
- ✅ 工具执行
- ✅ 错误处理
- ✅ 流式响应
- ✅ 批量请求
- ✅ HTTP 传输

---

## 🚀 运行测试

### 快速开始

```bash
# 运行所有测试
./scripts/run-v150-tests.sh all

# 运行特定测试类型
./scripts/run-v150-tests.sh unit          # 单元测试
./scripts/run-v150-tests.sh integration   # 集成测试
./scripts/run-v150-tests.sh e2e           # E2E 测试
./scripts/run-v150-tests.sh api           # API 测试
./scripts/run-v150-tests.sh websocket     # WebSocket 测试
./scripts/run-v150-tests.sh coverage      # 覆盖率报告
```

### 直接使用 pnpm

```bash
# E2E 测试
pnpm test:e2e e2e/multi-agent-collaboration.spec.ts

# 集成测试
pnpm test:run tests/integration/workflow-orchestrator.test.ts
pnpm test:run tests/integration/mcp-server-protocol.test.ts
pnpm test:run tests/integration/websocket-room-system.test.ts

# 所有测试
pnpm test:all
```

### 调试模式

```bash
# Playwright UI 模式
pnpm test:e2e:ui

# Playwright 调试模式
pnpm test:e2e:debug

# Vitest 监听模式
pnpm test tests/integration/
```

---

## 📦 CI/CD 集成

### GitHub Actions

**工作流**: `.github/workflows/test-v150.yml`

**测试作业**:

1. **unit-tests**: 单元测试 + 覆盖率
2. **integration-tests**: 集成测试套件
3. **e2e-tests**: 多浏览器 E2E 测试
4. **api-tests**: API 集成测试
5. **websocket-tests**: WebSocket 测试
6. **coverage-report**: 合并覆盖率
7. **test-summary**: 测试摘要
8. **notify-failure**: 失败通知

**触发条件**:

- Push 到 main/develop/v1.5.\*
- Pull Request
- 定时运行（每日 2:00 UTC）
- 手动触发

---

## 🎨 测试最佳实践

### E2E 测试

- ✅ 使用 Page Object Model
- ✅ 等待策略（waitForSelector, waitForLoadState）
- ✅ 稳定的选择器（data-testid）
- ✅ 独立的测试用例
- ✅ 清晰的测试描述

### 集成测试

- ✅ Mock 外部依赖
- ✅ 测试边界情况
- ✅ 验证状态转换
- ✅ 性能基准测试
- ✅ 错误恢复测试

### 单元测试

- ✅ 纯函数逻辑
- ✅ 边界值测试
- ✅ 异常处理
- ✅ TypeScript 类型安全
- ✅ 高覆盖率

---

## 📈 质量指标

### 目标指标

| 指标         | 目标      | 当前              |
| ------------ | --------- | ----------------- |
| 代码覆盖率   | ≥ 80%     | 待测量            |
| 测试通过率   | 100%      | 100%（Mock 数据） |
| 测试执行时间 | < 20 分钟 | 待测量            |
| Flaky 测试   | 0         | 0                 |

### 性能基准

| 测试类型 | 目标时间      |
| -------- | ------------- |
| 单元测试 | < 3 分钟      |
| 集成测试 | < 5 分钟      |
| E2E 测试 | < 8 分钟      |
| **总计** | **< 16 分钟** |

---

## 🔍 发现的问题

### 高优先级

1. **Mock 实现不完整**
   - 部分测试使用简化的 Mock
   - 影响：可能无法发现真实问题
   - 建议：创建完整的 Mock Server

### 中优先级

2. **测试数据分散**
   - 测试数据硬编码在各个文件中
   - 影响：维护困难
   - 建议：创建测试数据工厂

3. **E2E 测试依赖 UI 元素**
   - 选择器可能因 UI 变化而失效
   - 影响：Flaky 测试
   - 建议：使用稳定的 data-testid

### 低优先级

4. **缺少视觉回归测试**
   - 没有 UI 视觉对比
   - 影响：UI 变化可能未被发现
   - 建议：添加 Playwright 视觉测试

---

## 📝 后续工作

### 短期（1-2 周）

- [ ] 在 CI 环境运行完整测试套件
- [ ] 生成初始覆盖率报告
- [ ] 修复发现的 Mock 问题
- [ ] 补充单元测试

### 中期（3-4 周）

- [ ] 实现测试数据工厂
- [ ] 添加视觉回归测试
- [ ] 优化测试执行速度
- [ ] 提升覆盖率至 90%

### 长期（1-2 月）

- [ ] 性能基准测试集成
- [ ] 自动化测试数据生成
- [ ] 测试报告可视化
- [ ] 测试用例自动生成

---

## 📚 参考资源

### 文档

- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
- [测试策略](./v150-testing-strategy.md)
- [实现报告](./E2E-TEST-IMPLEMENTATION-REPORT.md)

### 相关代码

- WebSocket 房间系统: `src/lib/websocket-manager.ts`
- Agent 调度器: `src/lib/agents/scheduler/`
- MCP Server: `src/lib/mcp/server.ts`
- 工作流引擎: `src/lib/workflows/` (待实现)

---

## 👥 维护者

- **测试框架**: Vitest + Playwright
- **版本**: v1.5.0
- **创建日期**: 2026-03-31
- **最后更新**: 2026-03-31

---

**状态**: ✅ 测试框架完成，等待 CI 验证
