# Architecture Report - 7zi Multi-Agent System

**Version:** v1.0.0 → v1.10.0 Roadmap  
**Date:** 2026-04-03  
**Author:** 架构师 (Architect)

---

## 1. 项目整体架构分析

### 1.1 目录结构

```
src/
├── index.ts                      # 主入口文件
└── lib/
    ├── agents/                  # 智能体注册表
    │   ├── AgentRegistry.ts
    │   └── AgentRegistry.test.ts
    ├── a2a/                     # Agent-to-Agent 通信协议
    │   ├── A2ATypes.ts
    │   ├── A2AProtocol.ts        # 基础协议层
    │   ├── A2AClient.ts          # 客户端实现
    │   ├── A2AServer.ts          # 服务器实现
    │   ├── A2AProtocol.test.ts
    │   ├── ARCHITECTURE.md
    │   ├── README.md
    │   ├── demo.js
    │   └── examples/
    ├── multi-agent/              # 多智能体编排器
    │   ├── MultiAgentOrchestrator.ts  # 主编排器
    │   ├── MultiAgentOrchestrator.test.ts
    │   ├── MultiAgentOrchestrator.edge-cases.test.ts
    │   └── README.md
    ├── ai/                       # AI 代码生成模块
    │   ├── CodeGenerator.ts      # 主生成器
    │   ├── types.ts
    │   ├── index.ts
    │   ├── __tests__/
    │   └── providers/
    │       ├── BaseProvider.ts
    │       ├── OpenAIProvider.ts
    │       └── ClaudeProvider.ts
    ├── monitoring/               # 性能监控
    │   ├── monitor.ts
    │   └── monitor.test.ts
    ├── performance/              # 性能优化
    │   ├── incremental-anomaly-detector.ts  # 增量异常检测
    │   ├── README.md
    │   └── alerting/
    │       └── channels/
    │           └── slack-enhanced.ts        # Slack 告警
    ├── utils/                    # 工具模块
    │   ├── AutoCleanMap.ts      # TTL Map (防内存泄漏)
    │   ├── AutoCleanMap.test.ts
    │   ├── ResourceManager.ts    # 统一资源管理
    │   └── ResourceManager.test.ts
    └── websocket-manager.ts     # WebSocket 管理器
```

### 1.2 核心模块说明

| 模块 | 职责 | 依赖关系 |
|------|------|---------|
| **MultiAgentOrchestrator** | 多智能体任务编排（并行/串行动态分配） | AgentRegistry, A2AProtocol |
| **A2AProtocol** | 智能体间消息传递（request/response/notify/error） | EventEmitter |
| **AgentRegistry** | 智能体注册、状态管理、负载追踪 | EventEmitter |
| **CodeGenerator** | AI 代码/测试生成 | BaseProvider (OpenAI/Claude) |
| **PerformanceMonitor** | 操作性能跟踪、指标收集 | AutoCleanMap, ResourceManager |
| **IncrementalAnomalyDetector** | Welford's 算法增量式异常检测 | - |
| **WebSocketManager** | WebSocket 连接管理 | ResourceManager |
| **AutoCleanMap** | TTL Map，防止内存泄漏 | - |
| **ResourceManager** | 统一资源生命周期管理 | - |

### 1.3 数据流架构

```
用户请求
    │
    ▼
MultiAgentOrchestrator
    │
    ├─► AgentRegistry.filter()  ─────► 选择具备能力的智能体
    │
    ├─► A2AProtocol.request()  ─────► 发送任务到目标智能体
    │
    ▼
结果聚合 (first/all/best/vote/custom)
    │
    ▼
返回 AggregatedResult
```

---

## 2. 当前架构优缺点分析

### ✅ 优点

1. **模块化设计清晰**
   - 各模块职责单一，易于理解和测试
   - 模块间通过接口/类型交互，低耦合

2. **A2A 协议设计完善**
   - 支持 request/response/notification/error 五种消息类型
   - 基于 correlationId 的请求-响应对应机制
   - 支持心跳检测和超时管理
   - 28 个测试用例全部通过

3. **内存安全机制**
   - `AutoCleanMap` 实现 TTL 自动清理，防止内存泄漏
   - `ResourceManager` 统一管理资源释放
   - 在监控和性能模块中正确使用

4. **增量计算算法**
   - Welford's Online Algorithm 实现 O(1) 均值/方差更新
   - 配合流式 Isolation Forest 提供鲁棒异常检测
   - 性能目标明确（从 ~50ms 降到 <10ms）

5. **多聚合策略支持**
   - first/all/best/vote/custom 五种结果聚合方式
   - 灵活应对不同业务场景

6. **编排器支持多种执行模式**
   - `executeParallel`: 并行执行，多 Agent 协作
   - `executeSequential`: 串行工作流，支持依赖管理
   - `assignDynamically`: 基于能力和负载的动态分配

7. **完整的类型定义**
   - 所有模块都有完整的 TypeScript 类型
   - 错误类型层次清晰（AIGenerationError 等）

---

### ❌ 缺点

1. **依赖注入缺失**
   - `MultiAgentOrchestrator` 构造函数中直接 `new AgentRegistry()` 和 `new A2AProtocol()`
   - 难以替换实现或注入测试 mock
   - 违背 SOLID 依赖倒置原则

2. **无持久化存储**
   - `AgentRegistry` 使用纯内存 Map 存储
   - 服务重启后所有注册信息丢失
   - 无法支持分布式多节点部署

3. **A2A 协议无传输层抽象**
   - 当前是纯内存实现，无法跨进程/跨机器通信
   - `WebSocketManager` 存在但未实际集成到 A2A 协议
   - 无加密和认证机制

4. **Provider 容错能力弱**
   - `CodeGenerator` 只支持 OpenAI 和 Claude
   - API Key 未配置时直接报错，无优雅降级
   - 无请求重试、熔断、背压机制

5. **无插件/扩展机制**
   - 新增 Agent 类型需要修改代码
   - 无法动态加载扩展功能
   - aggregationStrategy 为 'custom' 时需要修改源码

6. **性能监控与编排解耦**
   - `PerformanceMonitor` 是独立模块，未集成到 `MultiAgentOrchestrator`
   - 无法自动追踪任务执行的性能指标
   - 告警与业务逻辑分离，不够灵活

7. **缺少消息中间件**
   - A2A 消息无法拦截、转换、过滤
   - 无日志、监控、追踪（tracing）等横切关注点
   - 无法实现消息路由规则

8. **单一的错误处理策略**
   - 任务失败只记录错误信息
   - 无重试策略、死信队列、告警机制
   - `retryOnFailure` 选项存在但未实现

---

## 3. v1.10.0 架构改进建议

### 建议 1: 引入依赖注入容器 (DI Container)

**目标:** 解耦组件依赖，支持测试和扩展

**实现方案:**
```typescript
// 引入一个轻量级 DI 容器（如 TypeDI 或 Inversify）
// 或自己实现一个简单的 ServiceLocator

interface ServiceContainer {
  register<T>(token: string, factory: () => T, scope: 'singleton' | 'transient'): void;
  resolve<T>(token: string): T;
}

// MultiAgentOrchestrator 改为接收容器
class MultiAgentOrchestrator {
  constructor(private container: ServiceContainer) {}
  
  async assignDynamically(task: Task) {
    const registry = this.container.resolve<AgentRegistry>('AgentRegistry');
    const protocol = this.container.resolve<A2AProtocol>('A2AProtocol');
    // ...
  }
}
```

**收益:**
- 便于单元测试时注入 mock
- 支持不同实现的切换（如内存/Redis Registry）
- 符合 SOLID 原则

---

### 建议 2: A2A 消息中间件管道 (Middleware Pipeline)

**目标:** 支持日志、监控、追踪、过滤、转换等横切关注点

**实现方案:**
```typescript
interface A2AMiddleware {
  name: string;
  process(
    ctx: MessageContext,
    next: () => Promise<unknown>
  ): Promise<unknown>;
}

interface MessageContext {
  message: A2AMessage;
  from: string;
  to: string;
  metadata: Record<string, unknown>;
}

class A2AProtocol {
  private middlewares: A2AMiddleware[] = [];
  
  use(middleware: A2AMiddleware) {
    this.middlewares.push(middleware);
  }
  
  async request(from: string, to: string, payload: unknown, options?: A2ARequestOptions) {
    const ctx: MessageContext = { message: {...}, from, to, metadata: {} };
    
    const pipeline = this.middlewares.reduce(
      (next, mw) => () => mw.process(ctx, next),
      () => this.doRequest(ctx)
    );
    
    return pipeline();
  }
}

// 内置中间件示例
const loggingMiddleware: A2AMiddleware = {
  name: 'logger',
  async process(ctx, next) {
    console.log(`[A2A] ${ctx.from} -> ${ctx.to}:`, ctx.message.type);
    return next();
  }
};

const tracingMiddleware: A2AMiddleware = {
  name: 'tracing',
  async process(ctx, next) {
    ctx.metadata.traceId = generateTraceId();
    return next();
  }
};
```

**收益:**
- 无需修改核心协议代码即可添加功能
- 支持追踪、限流、认证等横切关注点
- 便于第三方扩展

---

### 建议 3: 插件化 Agent 注册表 (Plugin-Based Registry)

**目标:** 支持动态注册新 Agent 类型和能力，无需修改核心代码

**实现方案:**
```typescript
interface AgentPlugin {
  name: string;
  version: string;
  capabilities: string[];  // 声明提供的 capabilities
  createAgent(config: unknown): AgentInstance;
}

interface AgentInstance {
  id: string;
  execute(task: Task): Promise<unknown>;
  healthCheck(): Promise<boolean>;
  shutdown(): Promise<void>;
}

// Registry 支持插件注册
class AgentRegistry {
  private plugins: Map<string, AgentPlugin> = new Map();
  
  registerPlugin(plugin: AgentPlugin) {
    this.plugins.set(plugin.name, plugin);
    // 自动注册 plugin 提供的 capabilities
  }
  
  // AgentFilter 支持插件特定过滤
  filter(filter: AgentFilter): Agent[] {
    // 现有逻辑 + 支持插件提供的虚拟 Agent
  }
}

// 使用示例
registry.registerPlugin({
  name: 'code-review',
  version: '1.0.0',
  capabilities: ['code-review', 'static-analysis'],
  createAgent: (config) => new CodeReviewAgent(config)
});
```

**收益:**
- 业务逻辑插件化，热插拔
- 支持第三方 Agent 实现
- 扩展 `requiredCapabilities` 无需修改 AgentRegistry 源码

---

### 建议 4: 可插拔传输层 (Transport Abstraction)

**目标:** 解耦 A2A 协议与具体传输方式，支持 WebSocket、HTTP long-polling、gRPC 等

**实现方案:**
```typescript
interface A2ATransport {
  send(message: A2AMessage): Promise<void>;
  onMessage(handler: (msg: A2AMessage) => void): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

// 内存传输（当前实现）
class InMemoryTransport implements A2ATransport {
  private handlers: Set<(msg: A2AMessage) => void> = new Set();
  
  send(message: A2AMessage) {
    this.handlers.forEach(h => h(message));
    return Promise.resolve();
  }
  
  onMessage(handler) { this.handlers.add(handler); }
  connect() { return Promise.resolve(); }
  disconnect() { return Promise.resolve(); }
}

// WebSocket 传输（待实现）
class WebSocketTransport implements A2ATransport {
  constructor(private ws: WebSocketManager) {}
  
  async send(message: A2AMessage) {
    this.ws.send(JSON.stringify(message));
  }
  
  onMessage(handler) {
    this.ws.onMessage(data => handler(JSON.parse(data)));
  }
}

// A2AClient 和 A2AServer 通过 Transport 通信
class A2AProtocol {
  constructor(private transport: A2ATransport) {}
}
```

**收益:**
- 同一协议支持多种传输方式
- 便于从进程内通信迁移到分布式部署
- WebSocketManager 可以真正被使用起来

---

### 建议 5: 内置任务重试与死信队列 (Retry + DLQ)

**目标:** 提升任务执行的可靠性，处理暂时性故障

**实现方案:**
```typescript
interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: Error) => boolean;
}

interface DeadLetterQueue {
  enqueue(taskId: string, error: Error, attempts: number): Promise<void>;
  getFailedTasks(): Promise<FailedTask[]>;
  retry(taskId: string): Promise<void>;
}

class MultiAgentOrchestrator {
  private dlq: DeadLetterQueue;
  
  async executeWithRetry(
    agents: Agent[],
    task: Task,
    options: ExecutionOptions
  ): Promise<AggregatedResult> {
    const retryPolicy = options.retryPolicy || defaultRetryPolicy;
    let lastError: Error;
    
    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        return await this.executeParallel(agents, task, options);
      } catch (error) {
        lastError = error as Error;
        
        if (!retryPolicy.retryableErrors(lastError)) {
          throw error; // 非可重试错误直接抛出
        }
        
        if (attempt < retryPolicy.maxAttempts) {
          const delay = this.calculateBackoff(retryPolicy, attempt);
          await this.sleep(delay);
        }
      }
    }
    
    // 达到最大重试次数，进入 DLQ
    await this.dlq.enqueue(task.id, lastError!, retryPolicy.maxAttempts);
    throw lastError!;
  }
}
```

**收益:**
- 提升任务成功率（网络抖动、临时故障可自动恢复）
- 失败任务有据可查（DLQ 可审计）
- `retryOnFailure` 选项从空实现变为真正可用

---

## 4. 实施优先级建议

| 优先级 | 改进项 | 复杂度 | 影响力 | 建议版本 |
|--------|--------|--------|--------|----------|
| P0 | 依赖注入容器 | 中 | 高 | v1.10.0 |
| P0 | 任务重试 + DLQ | 中 | 高 | v1.10.0 |
| P1 | 消息中间件管道 | 中 | 高 | v1.11.0 |
| P1 | 传输层抽象 | 高 | 高 | v1.11.0 |
| P2 | 插件化 Registry | 高 | 中 | v1.12.0 |

---

## 5. 总结

当前架构整体设计合理，模块边界清晰，核心功能（A2A 协议、多 Agent 编排、性能监控）已经过良好设计和测试。主要改进方向集中在：

1. **降低耦合** — 通过 DI 容器和传输抽象减少硬依赖
2. **提升可靠性** — 重试机制、死信队列
3. **增强可扩展性** — 中间件管道、插件化
4. **生产就绪** — 持久化、分布式支持

建议 v1.10.0 聚焦 **DI 容器 + 重试机制** 两个高影响力改进，为后续扩展打好基础。

---

*Report generated by 架构师 on 2026-04-03*
