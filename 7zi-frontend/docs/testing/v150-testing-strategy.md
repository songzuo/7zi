# v1.5.0 测试策略文档

## 📋 概述

本文档定义 7zi v1.5.0 版本的测试策略，覆盖 Multi-Agent 协作、WebSocket 房间系统、工作流编排器、MCP Server 协议等核心功能。

## 🎯 测试目标

- **单元测试覆盖率**: ≥ 80%
- **集成测试覆盖**: 核心流程 100% 覆盖
- **E2E 测试**: 关键用户路径 100% 覆盖
- **测试执行时间**: < 5 分钟（单元测试），< 10 分钟（E2E 测试）

## 🏗️ 测试分层架构

```
┌─────────────────────────────────────────┐
│          E2E Tests (Playwright)          │
│  - 完整用户场景                          │
│  - 跨模块集成                            │
│  - 真实浏览器模拟                        │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│       Integration Tests (Vitest)        │
│  - 模块间协作                            │
│  - WebSocket 房间                        │
│  - Multi-Agent 协作                      │
│  - MCP 协议                              │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│         Unit Tests (Vitest)             │
│  - 纯函数逻辑                            │
│  - 工具函数                              │
│  - 数据模型验证                          │
└─────────────────────────────────────────┘
```

## 📦 测试框架组合

| 测试类型 | 框架 | 理由 |
|---------|------|------|
| 单元测试 | Vitest | 快速、兼容 Jest、TypeScript 原生支持 |
| 集成测试 | Vitest + MSW | 统一配置，支持 Mock Service Worker |
| E2E 测试 | Playwright | 跨浏览器、速度快、API 稳定 |

## 🧪 核心测试用例

### 1. Multi-Agent 协作测试

#### 单元测试
- [ ] AgentScheduler 任务分配算法
- [ ] AgentCapability 能力匹配
- [ ] LoadBalancer 负载均衡
- [ ] TimePrediction 时间预测

#### 集成测试
- [ ] A2A 消息队列
- [ ] A2A JSON-RPC 协议
- [ ] A2A Registry 注册
- [ ] Multi-Agent 协作流程

#### E2E 测试
- [ ] 完整任务分发流程
- [ ] 多 Agent 并发协作
- [ ] 任务失败重试

### 2. WebSocket 房间系统测试

#### 单元测试
- [ ] RoomManager 房间创建/销毁
- [ ] PermissionManager 权限检查
- [ ] MessageStorage 消息存储
- [ ] WebSocketManager 连接管理

#### 集成测试
- [ ] 房间权限系统集成
- [ ] 多用户房间交互
- [ ] 消息持久化
- [ ] 离线消息队列

#### E2E 测试
- [ ] 完整房间生命周期
- [ ] 多用户实时协作
- [ ] 权限控制UI

### 3. 工作流编排器测试

#### 单元测试
- [ ] WorkflowEngine 状态机
- [ ] TaskExecutor 任务执行
- [ ] ConditionEvaluator 条件判断
- [ ] ParallelExecutor 并行执行

#### 集成测试
- [ ] 工作流定义加载
- [ ] 多步骤工作流
- [ ] 条件分支工作流
- [ ] 并行任务工作流

#### E2E 测试
- [ ] 工作流创建和执行
- [ ] 可视化工作流编辑器
- [ ] 工作流执行监控

### 4. MCP Server 协议测试

#### 单元测试
- [ ] MCPServer 请求处理
- [ ] ToolExecutor 工具执行
- [ ] JSON-RPC 2.0 协议
- [ ] 错误处理

#### 集成测试
- [ ] MCP 工具注册
- [ ] 多工具调用
- [ ] 流式响应
- [ ] 认证集成

#### E2E 测试
- [ ] 完整 MCP 通信流程
- [ ] 工具链调用
- [ ] 错误恢复

## 🔧 测试配置

### Vitest 配置

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 2,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
});
```

### Playwright 配置

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium' },
    process.env.CI ? { name: 'firefox' } : null,
    process.env.CI ? { name: 'webkit' } : null,
  ].filter(Boolean),
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
  },
});
```

## 🚀 CI/CD 集成

### GitHub Actions 工作流

1. **Pull Request Checks**
   - 单元测试（所有浏览器）
   - 类型检查
   - Lint 检查

2. **Main Branch Deploy**
   - 完整测试套件
   - E2E 测试（Chrome + Firefox + Safari）
   - 覆盖率报告上传

3. **Scheduled Nightly**
   - 完整测试套件
   - 性能回归测试
   - 可视化回归测试

## 📊 测试报告

### 覆盖率指标

- **Statements**: ≥ 80%
- **Branches**: ≥ 75%
- **Functions**: ≥ 80%
- **Lines**: ≥ 80%

### 测试执行指标

- **单元测试**: < 5 分钟
- **集成测试**: < 8 分钟
- **E2E 测试**: < 10 分钟
- **总测试时间**: < 23 分钟

### 质量门禁

- 所有测试必须通过才能合并
- 覆盖率必须达标
- 无类型错误
- 无 Lint 错误

## 🔄 测试数据管理

### Fixtures

- **测试用户**: 固定测试账号
- **测试数据**: 可重复的测试数据
- **Mock 服务**: MSW Mock Service Worker

### 环境变量

```bash
# .env.test
BASE_URL=http://localhost:3000
TEST_MODE=true
TEST_DB_URL=sqlite::memory:
TEST_REDIS_URL=redis://localhost:6379/15
```

## 📝 测试最佳实践

1. **测试独立性**: 每个测试应该独立运行
2. **可读性**: 测试名称应该清晰描述测试内容
3. **可维护性**: 使用 helper 函数减少重复
4. **快速失败**: 重要的断言优先
5. **避免 Flaky**: 使用 stable 的选择器和等待策略

## 🎯 当前状态

| 功能模块 | 单元测试 | 集成测试 | E2E 测试 | 状态 |
|---------|---------|---------|---------|------|
| Multi-Agent 协作 | 0% | 0% | 0% | ⏳ 待实现 |
| WebSocket 房间 | 50% | 80% | 60% | 🟡 部分完成 |
| 工作流编排器 | 0% | 0% | 0% | ⏳ 待实现 |
| MCP Server 协议 | 0% | 0% | 0% | ⏳ 待实现 |

## 📅 实施计划

### Phase 1: 基础设施 (Day 1-2)
- [x] 测试策略文档
- [ ] 测试工具和配置优化
- [ ] 测试数据准备

### Phase 2: Multi-Agent 测试 (Day 3-4)
- [ ] 单元测试实现
- [ ] 集成测试实现
- [ ] E2E 测试实现

### Phase 3: WebSocket 房间测试 (Day 5-6)
- [ ] 补充单元测试
- [ ] 完善集成测试
- [ ] 补充 E2E 测试

### Phase 4: 工作流编排器测试 (Day 7-8)
- [ ] 单元测试实现
- [ ] 集成测试实现
- [ ] E2E 测试实现

### Phase 5: MCP Server 测试 (Day 9-10)
- [ ] 单元测试实现
- [ ] 集成测试实现
- [ ] E2E 测试实现

### Phase 6: CI/CD 集成 (Day 11-12)
- [ ] GitHub Actions 优化
- [ ] 覆盖率报告配置
- [ ] 测试结果通知

## 🔗 相关文档

- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
- [测试最佳实践](./testing-best-practices.md)
- [测试覆盖率报告](../coverage/)
