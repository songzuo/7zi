# Tests Directory - v1.5.0

本目录包含 7zi v1.5.0 版本的完整测试套件。

## 📁 目录结构

```
tests/
├── e2e/                           # E2E Tests (Playwright)
│   ├── multi-agent-collaboration.spec.ts    # Multi-Agent 协作测试
│   ├── workflow-orchestrator.spec.ts       # 工作流编排器测试
│   ├── mcp-server.spec.ts                  # MCP Server 协议测试
│   └── websocket-room-system.spec.ts        # WebSocket 房间系统测试
├── integration/                   # Integration Tests (Vitest)
│   ├── workflow-orchestrator.test.ts       # 工作流编排器集成测试
│   ├── mcp-server-protocol.test.ts        # MCP 协议集成测试
│   └── websocket-room-system.test.ts       # WebSocket 房间集成测试
├── api/                           # API Tests
│   └── error-handling.test.ts             # 错误处理测试
├── api-integration/               # API Integration Tests
│   ├── a2a-jsonrpc.test.ts                # A2A JSON-RPC 测试
│   ├── a2a-queue.test.ts                  # A2A 队列测试
│   ├── a2a-registry.test.ts               # A2A 注册测试
│   └── notifications.test.ts               # 通知系统测试
├── websocket/                     # WebSocket Tests
│   └── room-integration.test.ts           # 房间集成测试
└── helpers/                       # Test Helpers
    └── e2e-helpers.ts                     # E2E 测试辅助函数
```

## 🚀 快速开始

### 运行所有测试

```bash
# 单元测试
pnpm test:run

# 集成测试
pnpm test:run tests/integration/

# E2E 测试
pnpm test:e2e

# API 集成测试
pnpm test:api

# 所有测试
pnpm test:all
```

### 运行特定测试

```bash
# Multi-Agent 协作测试
pnpm test:e2e e2e/multi-agent-collaboration.spec.ts

# 工作流编排器测试
pnpm test:run tests/integration/workflow-orchestrator.test.ts

# MCP Server 测试
pnpm test:run tests/integration/mcp-server-protocol.test.ts
```

### 覆盖率报告

```bash
# 生成覆盖率报告
pnpm test:coverage

# 查看 HTML 报告
open coverage/index.html
```

## 📊 测试覆盖范围

### v1.5.0 核心功能测试

| 功能模块             | 单元测试 | 集成测试 | E2E 测试 | 覆盖率 |
| -------------------- | -------- | -------- | -------- | ------ |
| **Multi-Agent 协作** | ✅       | ✅       | ✅       | 85%    |
| **WebSocket 房间**   | ✅       | ✅       | ✅       | 90%    |
| **工作流编排器**     | ✅       | ✅       | ✅       | 80%    |
| **MCP Server 协议**  | ✅       | ✅       | ✅       | 85%    |

### 测试用例统计

- **总测试用例**: 250+
- **E2E 测试**: 80+
- **集成测试**: 120+
- **单元测试**: 50+

## 🎯 测试策略

### 单元测试

**范围**:

- 纯函数逻辑
- 工具函数
- 数据模型验证
- 单个类/模块

**工具**: Vitest

**目标**: ≥ 80% 代码覆盖率

### 集成测试

**范围**:

- 模块间协作
- API 端点测试
- WebSocket 通信
- 数据库集成

**工具**: Vitest + MSW

**目标**: 核心流程 100% 覆盖

### E2E 测试

**范围**:

- 完整用户场景
- 跨页面流程
- 真实浏览器交互
- 移动端适配

**工具**: Playwright

**目标**: 关键用户路径 100% 覆盖

## 🔧 配置文件

### Vitest 配置

`vitest.config.ts`:

- 环境配置
- 测试超时
- 并行执行
- 覆盖率设置

### Playwright 配置

`playwright.config.ts`:

- 浏览器配置
- 测试目录
- 超时设置
- Web Server

## 📝 测试最佳实践

1. **测试独立性**: 每个测试应该独立运行
2. **清晰的命名**: 测试名称应该描述测试内容
3. **使用 Helpers**: 避免重复代码
4. **快速失败**: 重要的断言优先
5. **避免 Flaky**: 使用稳定的选择器和等待策略

## 🐛 调试测试

### Playwright 调试

```bash
# 调试模式
pnpm test:e2e:debug

# UI 模式
pnpm test:e2e:ui

# 仅运行失败的测试
pnpm test:e2e --grep @only
```

### Vitest 调试

```bash
# 监听模式
pnpm test

# 仅运行匹配的测试
pnpm test --grep "Agent Scheduler"

# 调试单个文件
pnpm test tests/integration/workflow-orchestrator.test.ts
```

## 📈 CI/CD 集成

测试在 GitHub Actions 中自动运行：

- **Pull Request**: 运行所有测试
- **Main Branch**: 完整测试套件 + 覆盖率
- **Nightly**: 完整测试套件 + 性能回归

详见: `.github/workflows/test-v150.yml`

## 📚 相关文档

- [测试策略](../docs/testing/v150-testing-strategy.md)
- [Playwright 文档](https://playwright.dev/)
- [Vitest 文档](https://vitest.dev/)
- [WebSocket API 文档](../docs/api/websocket.md)
- [Agent Scheduler 文档](../docs/api/agent-scheduler.md)

## 🤝 贡献指南

添加新测试时，请遵循以下规则：

1. 确保测试遵循现有的结构和命名约定
2. 添加必要的类型定义
3. 更新测试统计
4. 确保测试不会 Flaky
5. 添加文档说明

## 📧 支持

如有问题，请查看：

1. 测试日志输出
2. 覆盖率报告
3. CI/CD 失败日志
4. GitHub Issues

---

**最后更新**: 2026-03-31
**测试框架**: Vitest 4.1.2 + Playwright 1.58.2
**覆盖率目标**: ≥ 80%
