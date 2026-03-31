# Agent Scheduler 完整使用指南

本文档提供 7zi 项目 Agent Scheduler 系统的完整使用指南，包括调度算法说明、Agent 能力配置、任务分配流程和 Dashboard 使用说明。

## 目录

- [概述](#概述)
- [调度算法说明](#调度算法说明)
- [Agent 能力配置](#agent-能力配置)
- [任务分配流程](#任务分配流程)
- [Dashboard 使用说明](#dashboard-使用说明)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

---

## 概述

Agent Scheduler 是 7zi 平台的核心调度引擎，负责智能地将任务分配给合适的 Agent 执行。系统采用多因素加权算法，确保任务分配的高效性、公平性和可靠性。

### 核心特性

- **智能调度**：基于能力匹配、负载均衡、优先级等多因素动态分配任务
- **弹性扩展**：支持动态添加/移除 Agent，自动重新平衡负载
- **故障恢复**：任务失败自动重试，支持检查点续传
- **实时监控**：完整的 Dashboard 展示调度状态、Agent 健康、任务进度

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Task Queue (任务队列)                      │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│   │Task1│ │Task2│ │Task3│ │Task4│ │Task5│ │Task6│ ...      │
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Agent Scheduler (调度器)                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ 能力匹配引擎   │  │ 负载均衡器     │  │ 优先级调度器   │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ 健康检查器     │  │ 重试管理器     │  │ 监控报告器     │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     ┌──────────┐    ┌──────────┐    ┌──────────┐
     │ Agent 1  │    │ Agent 2  │    │ Agent N  │
     │ (活跃)    │    │ (活跃)    │    │ (离线)    │
     └──────────┘    └──────────┘    └──────────┘
```

---

## 调度算法说明

### 多因素加权调度算法

Agent Scheduler 采用多因素加权算法进行任务分配，核心公式如下：

```
Score(Agent, Task) = 
  W_capability × CapabilityScore +
  W_load × LoadScore +
  W_priority × PriorityScore +
  W_history × HistoryScore +
  W_affinity × AffinityScore
```

#### 权重配置

| 因素 | 默认权重 | 说明 |
|------|----------|------|
| `W_capability` | 0.35 | Agent 能力匹配度 |
| `W_load` | 0.25 | 当前负载因子 |
| `W_priority` | 0.15 | 任务优先级加权 |
| `W_history` | 0.15 | 历史执行成功率 |
| `W_affinity` | 0.10 | 任务亲和性 |

### 各因素详解

#### 1. 能力匹配度 (CapabilityScore)

评估 Agent 是否具备执行任务所需的全部能力。

```typescript
interface CapabilityMatch {
  required: string[];    // 任务所需能力列表
  provided: string[];    // Agent 具备的能力列表
  score: number;         // 0.0 - 1.0
}

// 计算方式
CapabilityScore = (匹配的能力数 / 所需能力数) × 能力深度权重
```

**示例**：
- 任务需要：`['chat', 'code', 'analysis']`
- Agent A 具备：`['chat', 'code', 'analysis', 'web_search']`
- 匹配度：3/3 = 1.0

#### 2. 负载因子 (LoadScore)

基于 Agent 当前负载计算可用容量。

```typescript
interface LoadMetrics {
  currentTasks: number;      // 当前任务数
  maxCapacity: number;       // 最大容量
  cpuUsage: number;          // CPU 使用率 (0-100)
  memoryUsage: number;       // 内存使用率 (0-100)
  avgResponseTime: number;   // 平均响应时间 (ms)
}

// 计算方式
LoadScore = (1 - currentTasks/maxCapacity) × 
            (1 - cpuUsage/100) × 
            (1 - memoryUsage/100)
```

#### 3. 优先级加权 (PriorityScore)

根据任务优先级调整调度权重。

| 优先级 | 分数 | 说明 |
|--------|------|------|
| `critical` | 1.0 | 关键任务，立即执行 |
| `high` | 0.8 | 高优先级 |
| `normal` | 0.5 | 普通优先级 |
| `low` | 0.3 | 低优先级 |
| `background` | 0.1 | 后台任务 |

#### 4. 历史成功率 (HistoryScore)

基于 Agent 执行类似任务的历史表现。

```typescript
interface HistoryMetrics {
  totalTasks: number;        // 总任务数
  successRate: number;       // 成功率 (0-1)
  avgCompletionTime: number; // 平均完成时间
  lastFailure?: Date;        // 上次失败时间
}

// 计算方式
HistoryScore = successRate × (1 - timeDecayFactor)
```

#### 5. 任务亲和性 (AffinityScore)

支持将相关任务分配给同一 Agent，优化缓存利用和上下文保持。

```typescript
interface AffinityConfig {
  enabled: boolean;
  sessionAffinity: boolean;   // 会话亲和性
  dataAffinity: boolean;      // 数据亲和性
  cacheAffinity: boolean;     // 缓存亲和性
}
```

### 调度策略

系统支持多种调度策略，可通过配置切换：

#### 1. 轮询调度 (Round-Robin)

```yaml
scheduler:
  strategy: round-robin
  config:
    weightByCapacity: true
```

适用于负载均匀、能力相近的 Agent 集群。

#### 2. 最小负载优先 (Least-Loaded)

```yaml
scheduler:
  strategy: least-loaded
  config:
    checkInterval: 5000  # 负载检查间隔 (ms)
    threshold: 0.8       # 负载阈值
```

优先选择当前负载最低的 Agent。

#### 3. 能力优先 (Capability-First)

```yaml
scheduler:
  strategy: capability-first
  config:
    strictMatch: true    # 严格匹配模式
    fallbackEnabled: true
```

优先考虑能力匹配，适用于异构 Agent 集群。

#### 4. 加权随机 (Weighted-Random)

```yaml
scheduler:
  strategy: weighted-random
  config:
    minWeight: 0.1
    maxWeight: 1.0
```

基于权重的随机选择，适用于负载分散。

### 任务队列管理

#### 优先级队列

```typescript
interface TaskQueue {
  critical: Task[];    // 关键队列 - 立即处理
  high: Task[];        // 高优先级队列
  normal: Task[];      // 普通队列
  low: Task[];         // 低优先级队列
  background: Task[];  // 后台队列
}
```

#### 队列策略配置

```yaml
queue:
  maxSize: 10000
  overflowStrategy: reject  # reject | drop-oldest | prioritize
  
  priorityAging:
    enabled: true
    interval: 60000         # 老化间隔 (ms)
    boostAmount: 0.1        # 每次提升量
  
  deadlock:
    detection: true
    timeout: 300000         # 死锁超时 (ms)
```

---

## Agent 能力配置

### 能力定义

Agent 能力通过结构化配置声明：

```typescript
interface AgentCapability {
  id: string;              // 能力唯一标识
  name: string;            // 显示名称
  version: string;         // 版本号
  category: CapabilityCategory;
  description: string;     // 描述
  parameters: Parameter[]; // 参数定义
  dependencies: string[];  // 依赖的其他能力
  resourceRequirements: ResourceRequirements;
}

type CapabilityCategory = 
  | 'communication'  // 通信能力
  | 'analysis'       // 分析能力
  | 'action'         // 执行能力
  | 'integration'    // 集成能力
  | 'specialized';   // 专业能力
```

### 配置文件格式

Agent 能力配置使用 YAML 格式：

```yaml
# /config/agents/capabilities.yaml

agent:
  id: "agent-code-assistant"
  name: "代码助手 Agent"
  version: "1.5.0"
  
  # 基础信息
  metadata:
    provider: "minimax"
    model: "MiniMax-M2.7"
    description: "专业代码分析和生成助手"
    
  # 能力声明
  capabilities:
    - id: "code-generation"
      name: "代码生成"
      category: "action"
      version: "2.0"
      description: "根据需求生成高质量代码"
      parameters:
        - name: "language"
          type: "string"
          required: true
          enum: ["typescript", "python", "go", "rust"]
        - name: "framework"
          type: "string"
          required: false
        - name: "style"
          type: "string"
          default: "clean"
      resourceRequirements:
        cpu: 2
        memory: "4Gi"
        timeout: 60000
        
    - id: "code-review"
      name: "代码审查"
      category: "analysis"
      version: "1.5"
      description: "分析代码质量并提供改进建议"
      parameters:
        - name: "severity"
          type: "string"
          enum: ["strict", "normal", "relaxed"]
          default: "normal"
      dependencies:
        - "static-analysis"
        
    - id: "refactoring"
      name: "重构建议"
      category: "analysis"
      version: "1.0"
      description: "提供代码重构建议"
      dependencies:
        - "code-review"
        
  # 资源限制
  resources:
    maxConcurrentTasks: 5
    maxMemory: "8Gi"
    maxCpu: 4
    timeout: 300000
    
  # 调度配置
  scheduling:
    priority: "normal"
    loadFactor: 0.8
    retryPolicy:
      maxRetries: 3
      backoff: "exponential"
      initialDelay: 1000
      
  # 健康检查
  healthCheck:
    endpoint: "/health"
    interval: 30000
    timeout: 5000
    unhealthyThreshold: 3
```

### 能力注册

Agent 启动时向 Scheduler 注册能力：

```typescript
// 示例：Agent 注册代码
import { AgentClient } from '@7zi/agent-sdk';

const client = new AgentClient({
  schedulerUrl: process.env.SCHEDULER_URL,
  agentId: 'agent-code-assistant',
});

// 注册能力
await client.registerCapabilities({
  capabilities: [
    {
      id: 'code-generation',
      version: '2.0',
      handler: handleCodeGeneration,
    },
    {
      id: 'code-review',
      version: '1.5',
      handler: handleCodeReview,
    },
  ],
  
  // 声明资源
  resources: {
    maxConcurrent: 5,
    memoryLimit: '8Gi',
  },
  
  // 心跳配置
  heartbeat: {
    interval: 10000,
    metadata: () => ({
      currentLoad: getCurrentLoad(),
      queueLength: getQueueLength(),
    }),
  },
});

// 处理函数示例
async function handleCodeGeneration(task: Task) {
  const { language, framework, style } = task.parameters;
  
  // 执行代码生成逻辑
  const result = await generateCode({ language, framework, style });
  
  return {
    success: true,
    data: result,
    metrics: {
      executionTime: Date.now() - task.startTime,
      tokensUsed: result.tokens,
    },
  };
}
```

### 能力更新

支持热更新能力配置：

```yaml
# 更新能力版本
updates:
  - capabilityId: "code-generation"
    action: "update"
    version: "2.1"
    changes:
      - parameterAdded: "maxLines"
      - performanceImproved: "30%"
      
  - capabilityId: "legacy-analysis"
    action: "deprecate"
    reason: "已被 code-review 替代"
    sunsetDate: "2026-06-01"
```

---

## 任务分配流程

### 完整流程图

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          任务分配完整流程                                   │
└──────────────────────────────────────────────────────────────────────────┘

用户请求
    │
    ▼
┌─────────────────┐
│ 1. 任务创建      │
│ - 验证参数       │
│ - 设置优先级     │
│ - 分配任务ID     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 2. 能力解析      │────▶│ 能力不存在/无效  │───▶ 拒绝任务
│ - 提取所需能力   │     └─────────────────┘
│ - 验证能力定义   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 3. 入队等待      │────▶│ 队列已满        │───▶ 排队或拒绝
│ - 优先级队列     │     └─────────────────┘
│ - 任务去重       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Agent 筛选                                           │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ 能力匹配    │ │ 负载检查    │ │ 健康检查    │        │
│ │ 过滤       │ │ 过滤       │ │ 过滤       │        │
│ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘        │
│        └────────────────┼────────────────┘              │
│                         ▼                               │
│              ┌─────────────────┐                        │
│              │ 候选 Agent 列表  │                        │
│              └────────┬────────┘                        │
└───────────────────────┼─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 5. 调度决策                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ 计算得分    │ │ 排序选择    │ │ 应用亲和性  │        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────┐     ┌─────────────────┐
│ 6. 分配任务     │────▶│ 无可用 Agent    │───▶ 继续等待
│ - 锁定 Agent    │     └─────────────────┘
│ - 更新负载      │
│ - 发送任务      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 7. 执行监控     │────▶│ 超时/失败       │───▶ 重试或失败
│ - 进度跟踪      │     └─────────────────┘
│ - 心跳检测      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. 结果处理     │
│ - 收集结果      │
│ - 更新统计      │
│ - 释放资源      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 9. 完成/回调    │
│ - 返回结果      │
│ - 触发回调      │
└─────────────────┘
```

### 详细步骤说明

#### 步骤 1: 任务创建

```typescript
interface TaskCreationRequest {
  type: string;                    // 任务类型
  capabilities: string[];          // 所需能力
  parameters: Record<string, any>; // 任务参数
  priority?: 'critical' | 'high' | 'normal' | 'low' | 'background';
  timeout?: number;                // 超时时间 (ms)
  callback?: string;               // 回调 URL
  metadata?: Record<string, any>;  // 元数据
}

// 创建任务
const task = await scheduler.createTask({
  type: 'code-generation',
  capabilities: ['code-generation', 'typescript'],
  parameters: {
    language: 'typescript',
    framework: 'next.js',
    prompt: '创建一个用户认证组件',
  },
  priority: 'normal',
  timeout: 60000,
});
```

#### 步骤 2-3: 验证与入队

```typescript
// 任务验证
async function validateTask(task: Task): Promise<ValidationResult> {
  // 检查能力是否存在
  const capabilities = await capabilityRegistry.get(task.requiredCapabilities);
  if (capabilities.missing.length > 0) {
    return { valid: false, error: `缺少能力: ${capabilities.missing.join(', ')}` };
  }
  
  // 检查参数有效性
  const paramValidation = validateParameters(task);
  if (!paramValidation.valid) {
    return { valid: false, error: paramValidation.errors };
  }
  
  return { valid: true };
}

// 入队
async function enqueueTask(task: Task): Promise<QueueResult> {
  const queue = getQueueByPriority(task.priority);
  
  if (queue.size >= queue.maxSize) {
    if (task.priority === 'critical') {
      // 关键任务强制入队，移除最低优先级任务
      return queue.forceEnqueue(task);
    }
    return { success: false, reason: 'queue_full' };
  }
  
  return queue.enqueue(task);
}
```

#### 步骤 4-5: Agent 筛选与调度

```typescript
async function selectAgent(task: Task): Promise<Agent | null> {
  // 1. 获取所有活跃 Agent
  const activeAgents = await agentRegistry.getActive();
  
  // 2. 能力匹配过滤
  const capableAgents = activeAgents.filter(agent => 
    task.requiredCapabilities.every(cap => agent.capabilities.includes(cap))
  );
  
  if (capableAgents.length === 0) {
    return null;
  }
  
  // 3. 负载检查
  const availableAgents = capableAgents.filter(agent => 
    agent.currentLoad < agent.maxCapacity * loadThreshold
  );
  
  if (availableAgents.length === 0) {
    // 所有 Agent 都满载，选择负载最低的
    return capableAgents.reduce((min, agent) => 
      agent.currentLoad < min.currentLoad ? agent : min
    );
  }
  
  // 4. 计算得分并排序
  const scoredAgents = availableAgents.map(agent => ({
    agent,
    score: calculateScore(agent, task),
  }));
  
  scoredAgents.sort((a, b) => b.score - a.score);
  
  // 5. 应用亲和性
  if (task.sessionId) {
    const affinityAgent = scoredAgents.find(s => 
      s.agent.activeSessions.includes(task.sessionId)
    );
    if (affinityAgent && affinityAgent.score > affinityThreshold) {
      return affinityAgent.agent;
    }
  }
  
  return scoredAgents[0].agent;
}

function calculateScore(agent: Agent, task: Task): number {
  const weights = config.scheduler.weights;
  
  // 能力匹配度
  const capabilityScore = calculateCapabilityScore(agent, task);
  
  // 负载因子
  const loadScore = 1 - (agent.currentLoad / agent.maxCapacity);
  
  // 优先级权重
  const priorityScore = priorityWeights[task.priority];
  
  // 历史成功率
  const historyScore = agent.successRate;
  
  return (
    weights.capability * capabilityScore +
    weights.load * loadScore +
    weights.priority * priorityScore +
    weights.history * historyScore
  );
}
```

#### 步骤 6-8: 执行与监控

```typescript
async function executeTask(agent: Agent, task: Task): Promise<TaskResult> {
  // 锁定 Agent
  await agentRegistry.lock(agent.id, task.id);
  
  try {
    // 发送任务到 Agent
    const response = await agentClient.execute(agent.endpoint, {
      taskId: task.id,
      type: task.type,
      parameters: task.parameters,
      timeout: task.timeout,
    });
    
    // 监控执行
    const monitor = startMonitoring(agent, task);
    
    // 等待完成
    const result = await waitForCompletion(response, task.timeout);
    
    // 停止监控
    monitor.stop();
    
    // 更新统计
    await updateStats(agent, task, result);
    
    return result;
    
  } catch (error) {
    // 处理失败
    await handleFailure(agent, task, error);
    throw error;
    
  } finally {
    // 释放 Agent
    await agentRegistry.unlock(agent.id);
  }
}
```

### 重试机制

```yaml
retry:
  # 重试策略
  strategy: exponential-backoff
  
  # 最大重试次数
  maxRetries: 3
  
  # 初始延迟
  initialDelay: 1000
  
  # 最大延迟
  maxDelay: 60000
  
  # 退避乘数
  multiplier: 2
  
  # 可重试的错误
  retryableErrors:
    - "TIMEOUT"
    - "AGENT_UNAVAILABLE"
    - "RATE_LIMIT"
    - "TEMPORARY_FAILURE"
```

---

## Dashboard 使用说明

### 访问 Dashboard

Dashboard 默认运行在 `http://localhost:3000/dashboard/scheduler`

### 主要功能模块

#### 1. 概览面板

```
┌────────────────────────────────────────────────────────────┐
│                     Scheduler Dashboard                     │
├────────────────────────────────────────────────────────────┤
│  活跃 Agents: 12    │  排队任务: 45     │  完成/小时: 1.2k │
│  平均延迟: 234ms    │  成功率: 99.7%    │  错误率: 0.3%   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  任务吞吐量 (过去 1 小时)                                    │
│  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇                     │
│                                                            │
│  Agent 负载分布                                             │
│  Agent-1  ████████████░░░░ 75%                             │
│  Agent-2  ████████████████ 100%                            │
│  Agent-3  ██████░░░░░░░░░░ 38%                             │
│  Agent-4  ███████████████░ 94%                             │
│  ...                                                       │
└────────────────────────────────────────────────────────────┘
```

#### 2. Agent 管理页面

**Agent 列表视图**

| Agent ID | 状态 | 能力数 | 当前任务 | 负载 | 健康度 | 操作 |
|----------|------|--------|----------|------|--------|------|
| agent-code-1 | 🟢 活跃 | 8 | 4 | 80% | 99.9% | [详情] [禁用] |
| agent-code-2 | 🟡 忙碌 | 8 | 5 | 100% | 99.5% | [详情] |
| agent-chat-1 | 🟢 活跃 | 5 | 2 | 40% | 99.8% | [详情] [禁用] |
| agent-chat-2 | 🔴 离线 | 5 | 0 | 0% | - | [详情] [重启] |

**Agent 详情页面**

```
Agent: agent-code-assistant-1
├── 基础信息
│   ├── ID: agent-code-assistant-1
│   ├── 类型: Code Assistant
│   ├── 版本: 1.5.0
│   └── 提供商: MiniMax
│
├── 能力列表
│   ├── code-generation (v2.0)
│   ├── code-review (v1.5)
│   ├── refactoring (v1.0)
│   └── debug-assist (v1.2)
│
├── 资源使用
│   ├── CPU: 65%
│   ├── 内存: 4.2GB / 8GB
│   └── 当前任务: 3 / 5
│
├── 性能指标
│   ├── 平均响应时间: 1.2s
│   ├── 成功率: 99.7%
│   └── 任务完成数: 15,234
│
└── 最近任务
    ├── task-12345 - 代码生成 - 完成 - 2.3s
    ├── task-12344 - 代码审查 - 完成 - 1.1s
    └── task-12343 - 重构建议 - 进行中...
```

#### 3. 任务监控页面

**实时任务流**

```
时间线                    任务                     Agent              状态
─────────────────────────────────────────────────────────────────────────
03:45:23  task-12345  代码生成          agent-code-1     ✅ 完成 (2.3s)
03:45:21  task-12344  代码审查          agent-code-2     ✅ 完成 (1.1s)
03:45:18  task-12343  重构建议          agent-code-1     ⏳ 执行中 (2.1s)
03:45:15  task-12342  聊天回复          agent-chat-1     ✅ 完成 (0.8s)
03:45:12  task-12341  数据分析          agent-analysis   ❌ 失败 (超时)
03:45:10  task-12340  代码生成          agent-code-3     🔄 重试中
```

**队列状态**

```
优先级队列状态:

🔴 Critical  ████████████████████ 8/10 (80%)
🟠 High      ██████████████       14/50 (28%)
🟢 Normal    ████████████████████ 45/100 (45%)
🔵 Low       ████                  5/200 (2.5%)
⚪ Background                       0/500 (0%)
```

#### 4. 配置管理页面

**调度器配置**

```yaml
# 可视化配置编辑器
scheduler:
  strategy: weighted-score
  
  weights:
    capability: 0.35    # [滑块调节]
    load: 0.25          # [滑块调节]
    priority: 0.15      # [滑块调节]
    history: 0.15       # [滑块调节]
    affinity: 0.10      # [滑块调节]
    
  queue:
    maxSize: 10000
    overflowStrategy: reject
    
  retry:
    maxRetries: 3
    strategy: exponential-backoff
```

### API 端点

Dashboard 提供以下 API 端点：

```typescript
// Agent 管理
GET    /api/scheduler/agents              // 列出所有 Agent
GET    /api/scheduler/agents/:id          // 获取 Agent 详情
POST   /api/scheduler/agents/:id/disable  // 禁用 Agent
POST   /api/scheduler/agents/:id/enable   // 启用 Agent

// 任务管理
GET    /api/scheduler/tasks               // 列出任务
GET    /api/scheduler/tasks/:id           // 获取任务详情
DELETE /api/scheduler/tasks/:id           // 取消任务
POST   /api/scheduler/tasks/:id/retry     // 重试任务

// 队列管理
GET    /api/scheduler/queues              // 获取队列状态
POST   /api/scheduler/queues/clear        // 清空队列

// 监控指标
GET    /api/scheduler/metrics             // 获取指标
GET    /api/scheduler/metrics/history     // 历史指标
```

---

## 最佳实践

### 1. 能力设计原则

- **单一职责**：每个能力专注于一个明确的任务
- **版本化**：使用语义版本号管理能力变更
- **向后兼容**：新版本应保持向后兼容或提供迁移路径
- **文档化**：为每个能力提供清晰的文档和示例

### 2. 负载管理建议

```yaml
# 推荐配置
agent:
  maxConcurrentTasks: 5      # 根据资源调整
  loadThreshold: 0.8         # 80% 容量告警
  healthCheckInterval: 30s   # 定期健康检查
  
scheduler:
  loadBalanceStrategy: least-loaded
  overflowStrategy: prioritize
```

### 3. 错误处理策略

- 区分可重试和不可重试错误
- 实现合理的重试退避策略
- 设置合理的超时时间
- 记录详细的错误日志

### 4. 监控与告警

```yaml
alerts:
  - name: agent-unhealthy
    condition: healthCheck.failed > 3
    severity: warning
    
  - name: queue-backup
    condition: queue.size > maxCapacity * 0.8
    severity: warning
    
  - name: high-error-rate
    condition: errorRate > 0.05
    severity: critical
    
  - name: agent-overload
    condition: agent.load > 0.9 for 5m
    severity: warning
```

---

## 故障排除

### 常见问题

#### 1. 任务长时间排队

**症状**：任务在队列中等待时间过长

**原因**：
- Agent 数量不足
- Agent 负载过高
- 能力匹配失败

**解决方案**：
```bash
# 检查队列状态
curl http://localhost:3000/api/scheduler/queues

# 检查 Agent 状态
curl http://localhost:3000/api/scheduler/agents

# 增加 Agent 容量
kubectl scale deployment agent-code --replicas=5
```

#### 2. 任务执行失败

**症状**：任务频繁失败

**诊断步骤**：
```bash
# 查看任务详情
curl http://localhost:3000/api/scheduler/tasks/{taskId}

# 查看错误日志
kubectl logs -l app=agent-code --tail=100

# 检查 Agent 健康
curl http://localhost:3000/api/scheduler/agents/{agentId}/health
```

#### 3. Agent 无响应

**症状**：Agent 心跳丢失

**解决方案**：
```bash
# 检查 Agent 进程
kubectl get pods -l app=agent-code

# 重启 Agent
kubectl rollout restart deployment agent-code

# 检查网络连接
kubectl exec -it agent-code-pod -- curl http://scheduler:3000/health
```

### 日志分析

```bash
# 查看调度器日志
kubectl logs -l app=scheduler --tail=500 | grep ERROR

# 查看特定任务日志
kubectl logs -l app=scheduler | grep "taskId=12345"

# 导出诊断信息
curl http://localhost:3000/api/scheduler/diagnostics > diagnostics.json
```

---

## 参考资料

- [WebSocket 房间系统教程](./WEBSOCKET_ROOMS_GUIDE.md)
- [性能监控最佳实践](./PERFORMANCE_MONITORING.md)
- [API 参考文档](../API.md)
- [部署指南](../DEPLOYMENT.md)

---

*最后更新: 2026-03-31*
*版本: 1.5.0*
