# v1.8.0 系统架构升级方案

**版本**: v1.8.0
**创建日期**: 2026-04-01
**状态**: 设计阶段
**作者**: 🏗️ 架构师 (AI团队)

---

## 文档概述

本文档定义了 v1.8.0 的系统架构升级方案，在 v1.7.0 可视化工作流编排器的基础上，新增三大核心能力：

1. **长期记忆系统** - Agent 持久化经验学习
2. **跨 Agent 协作的消息路由优化** - 高效的协作通信
3. **性能监控和告警机制** - 实时监控和智能告警

### 核心目标

| 目标 | 描述 | KPI |
|------|------|-----|
| 经验复用 | Agent 能从历史经验中学习，避免重复犯错 | 任务成功率提升 15% |
| 高效协作 | 跨 Agent 消息传递延迟 <50ms | 协作效率提升 30% |
| 智能监控 | 问题发现时间 <5分钟，自动告警准确率 >90% | 故障恢复时间减少 40% |

### 架构演进路线

```
v1.6.1 ────> v1.7.0 ──────────────> v1.8.0
  │            │                      │
  │            │                      │
  ▼            ▼                      ▼
调度器      可视化工作流           长期记忆
Dashboard   Agent集成             消息路由优化
                                 性能监控告警
```

---

## 目录

1. [架构总览](#1-架构总览)
2. [长期记忆系统](#2-长期记忆系统)
3. [跨 Agent 协作消息路由优化](#3-跨-agent-协作消息路由优化)
4. [性能监控和告警机制](#4-性能监控和告警机制)
5. [数据库设计](#5-数据库设计)
6. [API 变更](#6-api-变更)
7. [实施计划](#7-实施计划)
8. [风险评估](#8-风险评估)

---

## 1. 架构总览

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端层 (Frontend)                                │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ 工作流编辑器 │  │ 执行监控器   │  │ 记忆浏览器   │  │ 监控告警面板 │        │
│  │  (v1.7.0)   │  │  (v1.7.0)   │  │  (NEW)      │  │  (NEW)      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ REST API + WebSocket + gRPC
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API 网关层                                       │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Workflow API│  │ Memory API  │  │ Router API  │  │ Monitor API │        │
│  │  (v1.7.0)   │  │  (NEW)      │  │  (NEW)      │  │  (NEW)      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
        ▼                               ▼                               ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────────┐
│  WorkflowEngine   │  │  MemorySystem     │  │  MessageRouter            │
│  (v1.7.0)         │  │  (NEW)            │  │  (NEW)                    │
│                   │  │                   │  │                           │
│  - 节点执行       │  │  - 经验存储       │  │  - 消息路由                │
│  - 状态管理       │  │  - 向量化索引     │  │  - 广播优化                │
│  - Agent集成      │  │  - 智能检索       │  │  - 订阅管理                │
└───────────────────┘  └───────────────────┘  └───────────────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           服务层 (Services)                                   │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │AgentScheduler│ │AgentRegistry│  │EventService │  │MetricsService│       │
│  │  (v1.6.1)   │  │  (v1.6.1)   │  │  (v1.7.0)   │  │  (NEW)      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │AlertService │  │HealthChecker│  │TraceService │                         │
│  │  (NEW)      │  │  (NEW)      │  │  (NEW)      │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           数据层 (Data Layer)                                 │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │PostgreSQL   │  │  Redis      │  │  Milvus     │  │ClickHouse   │        │
│  │  (主数据库)  │  │  (缓存/队列) │  │(向量数据库) │  │(时序数据)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 新增组件清单

| 组件名称 | 类型 | 依赖 | 描述 |
|---------|------|------|------|
| **MemorySystem** | 服务 | Milvus, PostgreSQL | Agent 长期记忆和经验学习 |
| **MessageRouter** | 服务 | Redis | 高效的跨 Agent 消息路由 |
| **MetricsService** | 服务 | ClickHouse | 性能指标采集和存储 |
| **AlertService** | 服务 | Redis, Slack | 智能告警和通知 |
| **HealthChecker** | 服务 | Redis | 系统健康检查 |
| **TraceService** | 服务 | ClickHouse | 分布式追踪 |
| **MemoryBrowser** | 前端 | Memory API | 记忆可视化和查询界面 |
| **MonitorDashboard** | 前端 | Monitor API | 监控告警面板 |

---

## 2. 长期记忆系统

### 2.1 设计目标

- **持久化存储**: Agent 的经验、知识、决策历史永久保存
- **智能检索**: 基于语义相似度快速检索相关经验
- **经验学习**: 从历史成功/失败案例中学习，优化未来决策
- **知识共享**: 支持跨 Agent 知识传递和共享

### 2.2 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                    MemorySystem 架构                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Memory API Layer                        │ │
│  │                                                            │ │
│  │  POST   /api/memories          # 存储记忆                  │ │
│  │  GET    /api/memories/:id      # 获取记忆                  │ │
│  │  POST   /api/memories/search   # 语义搜索                  │ │
│  │  GET    /api/memories/agent/:id # Agent 记忆列表            │ │
│  │  POST   /api/memories/learn    # 从经验学习                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Memory Core                              │ │
│  │                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │MemoryStore  │  │VectorIndex  │  │Experience   │       │ │
│  │  │             │  │             │  │Learner      │       │ │
│  │  │- CRUD操作   │  │- 向量化     │  │- 模式识别   │       │ │
│  │  │- 元数据管理 │  │- 索引构建   │  │- 决策优化   │       │ │
│  │  │- 关联查询   │  │- 相似搜索   │  │- 建议生成   │       │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Storage Layer                            │ │
│  │                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │PostgreSQL   │  │  Milvus     │  │   Redis     │       │ │
│  │  │             │  │             │  │             │       │ │
│  │  │- 记忆元数据 │  │- 向量索引   │  │- 热点缓存   │       │ │
│  │  │- 关系数据   │  │- 语义搜索   │  │- 会话记忆   │       │ │
│  │  │- 全文索引   │  │- 聚类分析   │  │- 临时存储   │       │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 数据模型

#### 2.3.1 Memory (记忆)

```typescript
interface Memory {
  // 基本信息
  id: string;
  agentId: string;
  type: MemoryType;
  
  // 内容
  title: string;
  content: string;
  summary?: string;
  
  // 向量
  embedding?: number[];        // 1536维向量 (OpenAI ada-002)
  embeddingModel?: string;
  
  // 关联
  taskId?: string;
  workflowId?: string;
  instanceId?: string;
  relatedMemories?: string[];
  
  // 元数据
  tags: string[];
  importance: number;          // 0-1 重要性评分
  accessCount: number;         // 访问次数
  lastAccessedAt?: string;
  
  // 学习
  learningOutcome?: {
    type: 'success' | 'failure' | 'insight';
    lessons: string[];
    applicableScenarios: string[];
  };
  
  // 时间
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;          // TTL
}

enum MemoryType {
  EPISODIC = 'episodic',       // 事件记忆（具体经历）
  SEMANTIC = 'semantic',       // 语义记忆（知识事实）
  PROCEDURAL = 'procedural',   // 程序记忆（技能方法）
  EXPERIENCE = 'experience',   // 经验教训
  INSIGHT = 'insight',         // 洞察发现
  DECISION = 'decision',       // 决策记录
}
```

#### 2.3.2 Experience (经验)

```typescript
interface Experience {
  id: string;
  agentId: string;
  
  // 场景
  scenario: {
    taskType: string;
    context: Record<string, any>;
    constraints: string[];
  };
  
  // 行动
  action: {
    type: string;
    parameters: Record<string, any>;
    reasoning?: string;
  };
  
  // 结果
  outcome: {
    success: boolean;
    result?: any;
    error?: string;
    metrics: {
      duration: number;
      resourceUsage?: number;
      qualityScore?: number;
    };
  };
  
  // 反思
  reflection?: {
    whatWorked: string[];
    whatDidntWork: string[];
    alternatives: string[];
    improvements: string[];
  };
  
  // 向量
  scenarioEmbedding: number[];
  
  // 时间
  timestamp: string;
}
```

### 2.4 核心功能

#### 2.4.1 记忆存储流程

```
Agent 完成任务
     │
     ▼
┌─────────────────┐
│ 生成记忆内容     │
│ - 任务摘要       │
│ - 决策过程       │
│ - 结果数据       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 向量化处理       │
│ - 文本嵌入       │
│ - 降维压缩       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 重要性评分       │
│ - 成功/失败权重   │
│ - 复用价值       │
│ - 时间衰减       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 存储到数据库     │
│ - PostgreSQL    │
│ - Milvus        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 更新知识图谱     │
│ - 关联分析       │
│ - 聚类更新       │
└─────────────────┘
```

#### 2.4.2 智能检索流程

```
新任务到达
     │
     ▼
┌─────────────────┐
│ 任务向量化       │
│ - 任务描述嵌入   │
│ - 上下文提取     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 向量相似搜索     │
│ - Milvus 查询   │
│ - Top-K 检索    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 相关性重排序     │
│ - 任务类型匹配   │
│ - 时间衰减       │
│ - 重要性加权     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 返回相关记忆     │
│ - 经验建议       │
│ - 成功模式       │
│ - 失败警告       │
└─────────────────┘
```

#### 2.4.3 经验学习机制

```typescript
class ExperienceLearner {
  /**
   * 从成功经验学习
   */
  async learnFromSuccess(experience: Experience): Promise<LearningResult> {
    // 1. 提取成功模式
    const pattern = await this.extractPattern(experience);
    
    // 2. 更新知识库
    await this.updateKnowledgeBase(pattern);
    
    // 3. 生成建议规则
    const rules = await this.generateRules(pattern);
    
    // 4. 更新 Agent 决策模型
    await this.updateAgentModel(experience.agentId, rules);
    
    return {
      pattern,
      rules,
      confidence: this.calculateConfidence(experience),
    };
  }

  /**
   * 从失败经验学习
   */
  async learnFromFailure(experience: Experience): Promise<LearningResult> {
    // 1. 分析失败原因
    const rootCause = await this.analyzeFailure(experience);
    
    // 2. 生成避坑指南
    const guidelines = await this.generateGuidelines(rootCause);
    
    // 3. 创建警示规则
    const warnings = await this.createWarnings(rootCause);
    
    // 4. 更新风险评估模型
    await this.updateRiskModel(experience.agentId, warnings);
    
    return {
      rootCause,
      guidelines,
      warnings,
    };
  }

  /**
   * 智能建议生成
   */
  async generateSuggestion(
    agentId: string,
    taskContext: TaskContext
  ): Promise<Suggestion[]> {
    // 1. 检索相关经验
    const memories = await this.retrieveRelevantMemories(
      agentId,
      taskContext
    );
    
    // 2. 分析历史决策
    const decisions = await this.analyzeDecisions(memories);
    
    // 3. 生成建议
    const suggestions = await this.synthesizeSuggestions(
      memories,
      decisions,
      taskContext
    );
    
    return suggestions;
  }
}
```

### 2.5 记忆查询 API

```yaml
# 记忆管理
POST   /api/memories                      # 创建记忆
GET    /api/memories/:id                  # 获取记忆
PUT    /api/memories/:id                  # 更新记忆
DELETE /api/memories/:id                  # 删除记忆

# 语义搜索
POST   /api/memories/search               # 语义相似搜索
POST   /api/memories/hybrid-search        # 混合搜索（向量+关键词）

# Agent 记忆
GET    /api/agents/:id/memories           # 获取 Agent 所有记忆
GET    /api/agents/:id/memories/recent    # 最近记忆
GET    /api/agents/:id/experiences        # Agent 经验列表

# 学习
POST   /api/memories/learn                # 从经验学习
GET    /api/agents/:id/suggestions        # 获取智能建议

# 统计
GET    /api/memories/stats                # 记忆统计
GET    /api/memories/trends               # 记忆趋势分析
```

---

## 3. 跨 Agent 协作消息路由优化

### 3.1 设计目标

- **低延迟**: 消息传递延迟 <50ms
- **高可靠**: 消息不丢失，保证送达
- **智能路由**: 根据消息类型和优先级优化路由
- **可扩展**: 支持大规模 Agent 集群

### 3.2 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                  MessageRouter 架构                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Router API Layer                         │ │
│  │                                                            │ │
│  │  POST   /api/router/send        # 发送消息                  │ │
│  │  POST   /api/router/broadcast   # 广播消息                  │ │
│  │  POST   /api/router/subscribe   # 订阅主题                  │ │
│  │  GET    /api/router/status      # 路由状态                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Router Core                              │ │
│  │                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │MessageQueue │  │TopicManager │  │RouterEngine │       │ │
│  │  │             │  │             │  │             │       │ │
│  │  │- 优先级队列 │  │- 主题订阅   │  │- 路由决策   │       │ │
│  │  │- 消息持久化 │  │- 模式匹配   │  │- 负载均衡   │       │ │
│  │  │- 重试机制   │  │- 广播优化   │  │- 故障转移   │       │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Transport Layer                          │ │
│  │                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │WebSocket    │  │gRPC Stream  │  │Redis PubSub │       │ │
│  │  │             │  │             │  │             │       │ │
│  │  │- 实时推送   │  │- 高性能流   │  │- 分布式广播 │       │ │
│  │  │- 双向通信   │  │- 流控管理   │  │- 消息持久化 │       │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 消息模型

#### 3.3.1 消息定义

```typescript
interface AgentMessage {
  id: string;
  
  // 路由信息
  from: AgentEndpoint;
  to: AgentEndpoint | AgentEndpoint[];
  routingKey?: string;          // 路由键
  
  // 消息内容
  type: MessageType;
  subject: string;
  payload: any;
  
  // 元数据
  priority: MessagePriority;
  ttl?: number;                 // 生存时间（秒）
  correlationId?: string;       // 关联ID（请求-响应）
  replyTo?: string;             // 回复地址
  
  // 可靠性
  persistent: boolean;          // 是否持久化
  requireAck: boolean;          // 是否需要确认
  ackTimeout?: number;          // 确认超时
  
  // 时间
  timestamp: string;
  expiresAt?: string;
}

interface AgentEndpoint {
  agentId: string;
  role?: string;
  capabilities?: string[];
}

enum MessageType {
  // 任务相关
  TASK_ASSIGNMENT = 'task.assignment',
  TASK_PROGRESS = 'task.progress',
  TASK_RESULT = 'task.result',
  TASK_ERROR = 'task.error',
  
  // 协作相关
  COLLABORATION_REQUEST = 'collaboration.request',
  COLLABORATION_RESPONSE = 'collaboration.response',
  KNOWLEDGE_SHARE = 'knowledge.share',
  FEEDBACK = 'feedback',
  
  // 系统相关
  HEARTBEAT = 'system.heartbeat',
  STATUS_UPDATE = 'system.status',
  ALERT = 'system.alert',
  
  // 工作流相关
  WORKFLOW_EVENT = 'workflow.event',
  NODE_TRIGGER = 'workflow.node.trigger',
}

enum MessagePriority {
  CRITICAL = 0,   // 紧急（系统告警）
  HIGH = 1,       // 高优先级（任务分配）
  NORMAL = 2,     // 正常（常规消息）
  LOW = 3,        // 低优先级（日志、统计）
}
```

#### 3.3.2 主题订阅模式

```typescript
interface TopicSubscription {
  id: string;
  agentId: string;
  
  // 主题模式
  pattern: string;              // 支持通配符: *, #
  examples:
    - 'task.*'                  // 所有任务消息
    - 'agent.001.>'             // agent.001 的所有消息
    - 'workflow.node.completed' // 特定事件
  
  // 过滤条件
  filter?: {
    messageTypes?: MessageType[];
    priorities?: MessagePriority[];
    fromAgents?: string[];
    customFilter?: string;      // 自定义过滤表达式
  };
  
  // 配置
  config: {
    maxQueueSize: number;
    prefetchCount: number;
    autoAck: boolean;
    deadLetterQueue?: string;
  };
  
  // 状态
  status: 'active' | 'paused' | 'error';
  messageCount: number;
  lastActiveAt: string;
}
```

### 3.4 路由优化策略

#### 3.4.1 智能路由决策

```typescript
class RouterEngine {
  /**
   * 智能路由决策
   */
  async route(message: AgentMessage): Promise<RoutingDecision> {
    // 1. 分析消息特征
    const analysis = this.analyzeMessage(message);
    
    // 2. 选择传输通道
    const channel = this.selectChannel(analysis);
    
    // 3. 优化路由路径
    const path = await this.optimizePath(
      message.from,
      message.to,
      analysis
    );
    
    // 4. 应用 QoS 策略
    const qos = this.applyQoS(message, channel);
    
    return {
      channel,
      path,
      qos,
      estimatedLatency: this.estimateLatency(path, channel),
    };
  }

  /**
   * 选择传输通道
   */
  private selectChannel(analysis: MessageAnalysis): TransportChannel {
    // 低延迟实时消息 -> WebSocket
    if (analysis.urgency === 'realtime' && analysis.size < '10KB') {
      return 'websocket';
    }
    
    // 高吞吐量流式消息 -> gRPC
    if (analysis.throughput === 'high' && analysis.streaming) {
      return 'grpc';
    }
    
    // 需要持久化或广播 -> Redis PubSub
    if (analysis.persistent || analysis.broadcast) {
      return 'redis';
    }
    
    // 默认 -> WebSocket
    return 'websocket';
  }

  /**
   * 优化路由路径
   */
  private async optimizePath(
    from: AgentEndpoint,
    to: AgentEndpoint | AgentEndpoint[],
    analysis: MessageAnalysis
  ): Promise<RoutingPath> {
    const targets = Array.isArray(to) ? to : [to];
    
    // 单播
    if (targets.length === 1) {
      return this.directPath(from, targets[0]);
    }
    
    // 广播（使用 Redis PubSub 优化）
    if (analysis.broadcast) {
      return this.broadcastPath(targets);
    }
    
    // 多播（分组优化）
    return this.multicastPath(targets);
  }
}
```

#### 3.4.2 消息优先级队列

```typescript
class PriorityMessageQueue {
  private queues: Map<MessagePriority, MessageQueue>;
  
  /**
   * 入队
   */
  async enqueue(message: AgentMessage): Promise<void> {
    const queue = this.queues.get(message.priority);
    
    // 持久化消息
    if (message.persistent) {
      await this.persistMessage(message);
    }
    
    // 加入队列
    await queue.push(message);
    
    // 更新指标
    this.updateMetrics(message.priority);
  }

  /**
   * 出队（优先级调度）
   */
  async dequeue(agentId: string): Promise<AgentMessage | null> {
    // 严格优先级调度
    for (const priority of [CRITICAL, HIGH, NORMAL, LOW]) {
      const queue = this.queues.get(priority);
      
      // 检查 Agent 订阅
      const message = await queue.pop(agentId);
      if (message) {
        return message;
      }
    }
    
    return null;
  }

  /**
   * 加权轮询调度（防止低优先级消息饥饿）
   */
  async dequeueWeighted(agentId: string): Promise<AgentMessage | null> {
    const weights = {
      CRITICAL: 10,
      HIGH: 5,
      NORMAL: 3,
      LOW: 1,
    };
    
    // 根据权重选择队列
    const selectedQueue = this.weightedSelect(weights);
    return await selectedQueue.pop(agentId);
  }
}
```

#### 3.4.3 可靠性保证

```typescript
class ReliableMessaging {
  /**
   * 发送消息（保证送达）
   */
  async sendWithGuarantee(message: AgentMessage): Promise<SendResult> {
    // 1. 持久化消息
    const messageId = await this.persistMessage(message);
    
    // 2. 发送消息
    const result = await this.send(message);
    
    if (message.requireAck) {
      // 3. 等待确认
      const ack = await this.waitForAck(messageId, message.ackTimeout);
      
      if (!ack) {
        // 4. 重试
        return await this.retryWithBackoff(message);
      }
    }
    
    return { success: true, messageId };
  }

  /**
   * 指数退避重试
   */
  private async retryWithBackoff(
    message: AgentMessage,
    attempt: number = 1
  ): Promise<SendResult> {
    const maxRetries = 3;
    const baseDelay = 1000;
    
    if (attempt > maxRetries) {
      // 发送到死信队列
      await this.sendToDeadLetterQueue(message);
      return { success: false, error: 'Max retries exceeded' };
    }
    
    const delay = baseDelay * Math.pow(2, attempt - 1);
    await this.sleep(delay);
    
    try {
      const result = await this.send(message);
      
      if (message.requireAck) {
        const ack = await this.waitForAck(message.id, message.ackTimeout);
        if (ack) {
          return { success: true, messageId: message.id };
        }
      }
      
      return await this.retryWithBackoff(message, attempt + 1);
    } catch (error) {
      return await this.retryWithBackoff(message, attempt + 1);
    }
  }
}
```

### 3.5 路由 API

```yaml
# 消息发送
POST   /api/router/send                 # 发送消息
POST   /api/router/broadcast            # 广播消息
POST   /api/router/multicast            # 多播消息

# 订阅管理
POST   /api/router/subscribe            # 订阅主题
DELETE /api/router/subscribe/:id        # 取消订阅
GET    /api/router/subscriptions        # 订阅列表

# 消息队列
GET    /api/router/queue/:agentId       # 获取队列消息
POST   /api/router/ack/:messageId       # 确认消息

# 路由状态
GET    /api/router/status               # 路由状态
GET    /api/router/metrics              # 路由指标
GET    /api/router/topology             # 路由拓扑
```

---

## 4. 性能监控和告警机制

### 4.1 设计目标

- **全方位监控**: 覆盖 Agent、任务、工作流、系统各层
- **实时告警**: 问题发现 <5分钟，告警准确率 >90%
- **智能分析**: 根因分析、趋势预测、自动修复
- **可视化**: 丰富的图表和仪表盘

### 4.2 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                  Monitoring System 架构                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Monitor Dashboard                        │ │
│  │                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │系统概览     │  │Agent监控    │  │告警面板     │       │ │
│  │  │             │  │             │  │             │       │ │
│  │  │- 健康状态   │  │- 状态分布   │  │- 活跃告警   │       │ │
│  │  │- 关键指标   │  │- 性能趋势   │  │- 历史告警   │       │ │
│  │  │- 快速入口   │  │- 负载情况   │  │- 告警规则   │       │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Monitor API Layer                        │ │
│  │                                                            │ │
│  │  GET    /api/monitor/health      # 健康检查                │ │
│  │  GET    /api/monitor/metrics     # 性能指标                │ │
│  │  GET    /api/monitor/alerts      # 告警列表                │ │
│  │  POST   /api/monitor/alerts/rules # 告警规则               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Monitor Core                             │ │
│  │                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │MetricsCollector│AlertEngine  │  │HealthChecker│       │ │
│  │  │             │  │             │  │             │       │ │
│  │  │- 指标采集   │  │- 规则引擎   │  │- 健康检查   │       │ │
│  │  │- 数据聚合   │  │- 告警触发   │  │- 故障检测   │       │ │
│  │  │- 存储管理   │  │- 通知发送   │  │- 自动恢复   │       │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │ │
│  │                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │TraceService │  │AnomalyDetect│  │PredictEngine│       │ │
│  │  │             │  │             │  │             │       │ │
│  │  │- 链路追踪   │  │- 异常检测   │  │- 趋势预测   │       │ │
│  │  │- 性能分析   │  │- 模式识别   │  │- 容量规划   │       │ │
│  │  │- 瓶颈定位   │  │- 根因分析   │  │- 智能建议   │       │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Storage Layer                            │ │
│  │                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │ClickHouse   │  │   Redis     │  │PostgreSQL   │       │ │
│  │  │             │  │             │  │             │       │ │
│  │  │- 时序数据   │  │- 实时缓存   │  │- 配置存储   │       │ │
│  │  │- 日志存储   │  │- 告警队列   │  │- 规则定义   │       │ │
│  │  │- 聚合查询   │  │- 状态缓存   │  │- 历史记录   │       │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 监控指标体系

#### 4.3.1 系统级指标

```typescript
interface SystemMetrics {
  // 资源使用
  cpu: {
    usage: number;              // CPU 使用率 (%)
    loadAverage: [number, number, number];
    cores: number;
  };
  
  memory: {
    used: number;               // 已用内存 (bytes)
    total: number;              // 总内存
    usage: number;              // 使用率 (%)
    swapUsed: number;
  };
  
  disk: {
    used: number;
    total: number;
    usage: number;
    readIOPS: number;
    writeIOPS: number;
  };
  
  network: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
    errors: number;
  };
  
  // 进程
  process: {
    uptime: number;
    memoryRSS: number;
    openFiles: number;
    threads: number;
  };
}
```

#### 4.3.2 Agent 级指标

```typescript
interface AgentMetrics {
  agentId: string;
  timestamp: string;
  
  // 状态
  status: 'online' | 'offline' | 'busy' | 'error';
  uptime: number;
  
  // 负载
  currentLoad: number;          // 当前负载 (0-100)
  queueLength: number;          // 队列长度
  activeTasks: number;          // 活跃任务数
  
  // 性能
  avgResponseTime: number;      // 平均响应时间 (ms)
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  
  // 成功率
  successRate: number;          // 成功率 (0-1)
  errorRate: number;            // 错误率 (0-1)
  timeoutRate: number;          // 超时率 (0-1)
  
  // 吞吐量
  tasksCompleted: number;       // 完成任务数
  tasksPerMinute: number;       // 每分钟任务数
  
  // 资源
  memoryUsage: number;          // 内存使用 (bytes)
  cpuUsage: number;             // CPU 使用 (%)
  
  // 调度
  scheduledCount: number;       // 被调度次数
  rejectedCount: number;        // 被拒绝次数
  avgWaitTime: number;          // 平均等待时间
}
```

#### 4.3.3 任务级指标

```typescript
interface TaskMetrics {
  taskId: string;
  agentId: string;
  timestamp: string;
  
  // 执行
  status: TaskStatus;
  duration: number;             // 执行时长 (ms)
  waitTime: number;             // 等待时长
  
  // 资源
  memoryPeak: number;           // 峰值内存
  cpuTime: number;              // CPU 时间
  networkBytes: number;         // 网络传输量
  
  // 质量
  success: boolean;
  retryCount: number;
  errorType?: string;
  
  // 调度
  priority: TaskPriority;
  scheduledAt: string;
  startedAt: string;
  completedAt: string;
  
  // 费用（如适用）
  cost?: {
    compute: number;
    storage: number;
    network: number;
    total: number;
  };
}
```

#### 4.3.4 工作流级指标

```typescript
interface WorkflowMetrics {
  workflowId: string;
  instanceId: string;
  timestamp: string;
  
  // 执行
  status: InstanceStatus;
  duration: number;
  nodeCount: number;
  completedNodes: number;
  failedNodes: number;
  
  // 性能
  avgNodeDuration: number;
  maxNodeDuration: number;
  minNodeDuration: number;
  
  // 资源
  totalCpuTime: number;
  totalMemoryUsed: number;
  totalNetworkBytes: number;
  
  // 协作
  agentsInvolved: string[];
  messagesExchanged: number;
  collaborationTime: number;    // 协作等待时间
  
  // 成本
  estimatedCost: number;
  actualCost: number;
}
```

### 4.4 告警规则引擎

#### 4.4.1 告警规则定义

```typescript
interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  
  // 条件
  condition: {
    metric: string;             // 指标名称
    operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
    threshold: number;
    duration?: number;          // 持续时间（秒）
    aggregation?: 'avg' | 'max' | 'min' | 'sum' | 'count';
  };
  
  // 严重级别
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  // 通知
  notification: {
    channels: NotificationChannel[];
    recipients: string[];
    template?: string;
    cooldown: number;           // 冷却时间（秒）
  };
  
  // 自动响应
  autoRemediation?: {
    enabled: boolean;
    action: string;
    parameters?: Record<string, any>;
  };
  
  // 元数据
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// 示例规则
const alertRules: AlertRule[] = [
  {
    id: 'agent-high-load',
    name: 'Agent 高负载告警',
    description: 'Agent 负载超过 90% 持续 5 分钟',
    enabled: true,
    condition: {
      metric: 'agent.currentLoad',
      operator: 'gt',
      threshold: 90,
      duration: 300,
      aggregation: 'avg',
    },
    severity: 'high',
    notification: {
      channels: ['slack', 'email'],
      recipients: ['admin@7zi.com'],
      cooldown: 600,
    },
    autoRemediation: {
      enabled: true,
      action: 'redistribute_tasks',
    },
  },
  {
    id: 'task-failure-spike',
    name: '任务失败激增',
    description: '5 分钟内失败任务数超过 10 个',
    enabled: true,
    condition: {
      metric: 'task.failed.count',
      operator: 'gt',
      threshold: 10,
      duration: 300,
      aggregation: 'count',
    },
    severity: 'critical',
    notification: {
      channels: ['slack', 'pagerduty'],
      recipients: ['ops@7zi.com'],
      cooldown: 300,
    },
  },
];
```

#### 4.4.2 告警引擎实现

```typescript
class AlertEngine {
  private rules: Map<string, AlertRule>;
  private activeAlerts: Map<string, ActiveAlert>;
  private metricsCollector: MetricsCollector;
  
  /**
   * 评估告警规则
   */
  async evaluateRules(): Promise<void> {
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;
      
      // 获取指标数据
      const metricValue = await this.getMetricValue(
        rule.condition.metric,
        rule.condition.duration,
        rule.condition.aggregation
      );
      
      // 评估条件
      const isTriggered = this.evaluateCondition(
        metricValue,
        rule.condition
      );
      
      // 处理告警
      if (isTriggered) {
        await this.triggerAlert(rule, metricValue);
      } else {
        await this.resolveAlert(rule);
      }
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(
    rule: AlertRule,
    metricValue: number
  ): Promise<void> {
    // 检查冷却期
    if (this.isInCooldown(rule.id)) {
      return;
    }
    
    // 创建告警
    const alert: ActiveAlert = {
      id: uuidv4(),
      ruleId: rule.id,
      severity: rule.severity,
      status: 'firing',
      message: this.generateMessage(rule, metricValue),
      startedAt: new Date().toISOString(),
      annotations: {
        metric: rule.condition.metric,
        value: metricValue.toString(),
        threshold: rule.condition.threshold.toString(),
      },
    };
    
    // 保存活跃告警
    this.activeAlerts.set(rule.id, alert);
    
    // 发送通知
    await this.sendNotification(alert, rule.notification);
    
    // 执行自动修复
    if (rule.autoRemediation?.enabled) {
      await this.executeAutoRemediation(rule.autoRemediation);
    }
    
    // 记录日志
    await this.logAlert(alert);
  }

  /**
   * 自动修复
   */
  private async executeAutoRemediation(
    config: AutoRemediationConfig
  ): Promise<void> {
    switch (config.action) {
      case 'redistribute_tasks':
        await this.redistributeTasks();
        break;
      case 'restart_agent':
        await this.restartAgent(config.parameters?.agentId);
        break;
      case 'scale_up':
        await this.scaleUpAgents(config.parameters?.count);
        break;
      case 'throttle_requests':
        await this.throttleRequests(config.parameters?.rate);
        break;
    }
  }
}
```

### 4.5 监控 API

```yaml
# 健康检查
GET    /api/monitor/health              # 系统健康状态
GET    /api/monitor/health/agents       # Agent 健康状态
GET    /api/monitor/health/services     # 服务健康状态

# 指标查询
GET    /api/monitor/metrics             # 指标列表
GET    /api/monitor/metrics/:name       # 指标详情
POST   /api/monitor/metrics/query       # 指标查询（PromQL 风格）

# 告警管理
GET    /api/monitor/alerts              # 告警列表
GET    /api/monitor/alerts/:id          # 告警详情
POST   /api/monitor/alerts/:id/ack      # 确认告警
POST   /api/monitor/alerts/:id/resolve  # 解决告警

# 告警规则
GET    /api/monitor/alerts/rules        # 规则列表
POST   /api/monitor/alerts/rules        # 创建规则
PUT    /api/monitor/alerts/rules/:id    # 更新规则
DELETE /api/monitor/alerts/rules/:id    # 删除规则

# 追踪
GET    /api/monitor/traces              # 追踪列表
GET    /api/monitor/traces/:id          # 追踪详情

# 仪表盘
GET    /api/monitor/dashboards          # 仪表盘列表
GET    /api/monitor/dashboards/:id      # 仪表盘数据
```

---

## 5. 数据库设计

### 5.1 新增表结构

#### 5.1.1 记忆表 (memories)

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- episodic, semantic, procedural, experience, insight, decision
  
  -- 内容
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  
  -- 向量（存储在 Milvus，这里只存 ID）
  embedding_id TEXT,
  embedding_model TEXT,
  
  -- 关联
  task_id UUID,
  workflow_id UUID,
  instance_id UUID,
  
  -- 元数据
  tags TEXT[],
  importance REAL DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  
  -- 学习
  learning_outcome JSONB,
  
  -- 时间
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  -- 索引
  CONSTRAINT fk_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_memories_agent_id ON memories(agent_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_importance ON memories(importance DESC);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_memories_content ON memories USING GIN(to_tsvector('english', content));
```

#### 5.1.2 经验表 (experiences)

```sql
CREATE TABLE experiences (
  id UUID PRIMARY KEY,
  agent_id TEXT NOT NULL,
  
  -- 场景
  scenario JSONB NOT NULL,
  
  -- 行动
  action JSONB NOT NULL,
  
  -- 结果
  outcome JSONB NOT NULL,
  
  -- 反思
  reflection JSONB,
  
  -- 向量
  scenario_embedding_id TEXT,
  
  -- 时间
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- 关联
  task_id UUID,
  memory_id UUID,
  
  CONSTRAINT fk_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_memory FOREIGN KEY (memory_id) REFERENCES memories(id)
);

CREATE INDEX idx_experiences_agent_id ON experiences(agent_id);
CREATE INDEX idx_experiences_timestamp ON experiences(timestamp DESC);
CREATE INDEX idx_experiences_outcome_success ON experiences((outcome->>'success'));
```

#### 5.1.3 消息路由表 (message_routes)

```sql
CREATE TABLE message_routes (
  id UUID PRIMARY KEY,
  
  -- 路由信息
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  routing_key TEXT,
  
  -- 消息
  message_type TEXT NOT NULL,
  message_id UUID NOT NULL,
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, delivered, acked, failed
  
  -- 时间
  sent_at TIMESTAMP NOT NULL,
  delivered_at TIMESTAMP,
  acked_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- 重试
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- 元数据
  latency_ms INTEGER,
  
  CONSTRAINT fk_from_agent FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  CONSTRAINT fk_to_agent FOREIGN KEY (to_agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_message_routes_from ON message_routes(from_agent_id);
CREATE INDEX idx_message_routes_to ON message_routes(to_agent_id);
CREATE INDEX idx_message_routes_status ON message_routes(status);
CREATE INDEX idx_message_routes_sent_at ON message_routes(sent_at DESC);
```

#### 5.1.4 订阅表 (subscriptions)

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  agent_id TEXT NOT NULL,
  
  -- 主题
  pattern TEXT NOT NULL,
  
  -- 过滤
  filter JSONB,
  
  -- 配置
  config JSONB NOT NULL,
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'active',
  message_count INTEGER DEFAULT 0,
  last_active_at TIMESTAMP,
  
  -- 时间
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_subscriptions_agent_id ON subscriptions(agent_id);
CREATE INDEX idx_subscriptions_pattern ON subscriptions(pattern);
CREATE UNIQUE INDEX idx_subscriptions_unique ON subscriptions(agent_id, pattern);
```

#### 5.1.5 指标表 (metrics)

```sql
-- 使用 ClickHouse 存储时序数据
CREATE TABLE metrics (
  timestamp DateTime64(3),
  metric_name String,
  metric_type Enum8('gauge' = 1, 'counter' = 2, 'histogram' = 3),
  value Float64,
  labels Map(String, String),
  
  -- 分区
  date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (metric_name, timestamp, labels)
TTL date + INTERVAL 90 DAY;
```

#### 5.1.6 告警表 (alerts)

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  rule_id TEXT NOT NULL,
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'firing',  -- firing, resolved, acknowledged
  severity TEXT NOT NULL,
  
  -- 内容
  message TEXT NOT NULL,
  annotations JSONB,
  
  -- 时间
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by TEXT,
  
  -- 通知
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_channels TEXT[],
  
  -- 元数据
  fingerprint TEXT,            -- 去重指纹
  
  CONSTRAINT fk_rule FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_started_at ON alerts(started_at DESC);
CREATE INDEX idx_alerts_fingerprint ON alerts(fingerprint);
```

#### 5.1.7 告警规则表 (alert_rules)

```sql
CREATE TABLE alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  
  -- 条件
  condition JSONB NOT NULL,
  
  -- 严重级别
  severity TEXT NOT NULL,
  
  -- 通知
  notification JSONB NOT NULL,
  
  -- 自动修复
  auto_remediation JSONB,
  
  -- 元数据
  tags TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX idx_alert_rules_severity ON alert_rules(severity);
```

### 5.2 Milvus 集合设计

```python
# 记忆向量集合
collection = Collection(
    name="memories",
    schema=CollectionSchema([
        FieldSchema(name="id", dtype=DataType.VARCHAR, max_length=36, is_primary=True),
        FieldSchema(name="agent_id", dtype=DataType.VARCHAR, max_length=50),
        FieldSchema(name="memory_id", dtype=DataType.VARCHAR, max_length=36),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=1536),
        FieldSchema(name="type", dtype=DataType.VARCHAR, max_length=20),
        FieldSchema(name="importance", dtype=DataType.FLOAT),
        FieldSchema(name="created_at", dtype=DataType.INT64),  # timestamp
    ]),
    index_params=IndexParams(
        field_name="embedding",
        index_type="IVF_FLAT",
        metric_type="COSINE",
        params={"nlist": 1024}
    )
)

# 经验向量集合
collection = Collection(
    name="experiences",
    schema=CollectionSchema([
        FieldSchema(name="id", dtype=DataType.VARCHAR, max_length=36, is_primary=True),
        FieldSchema(name="agent_id", dtype=DataType.VARCHAR, max_length=50),
        FieldSchema(name="experience_id", dtype=DataType.VARCHAR, max_length=36),
        FieldSchema(name="scenario_embedding", dtype=DataType.FLOAT_VECTOR, dim=1536),
        FieldSchema(name="success", dtype=DataType.BOOL),
        FieldSchema(name="task_type", dtype=DataType.VARCHAR, max_length=50),
        FieldSchema(name="timestamp", dtype=DataType.INT64),
    ]),
    index_params=IndexParams(
        field_name="scenario_embedding",
        index_type="IVF_FLAT",
        metric_type="COSINE",
        params={"nlist": 1024}
    )
)
```

---

## 6. API 变更

### 6.1 新增 API 汇总

| 模块 | 端点数量 | 描述 |
|------|---------|------|
| Memory API | 15 | 记忆管理和检索 |
| Router API | 10 | 消息路由和订阅 |
| Monitor API | 15 | 监控和告警 |
| **总计** | **40** | |

### 6.2 REST API 完整列表

```yaml
# ============================================
# Memory API (记忆系统)
# ============================================

# 记忆管理
POST   /api/memories                      # 创建记忆
GET    /api/memories                      # 列出记忆
GET    /api/memories/:id                  # 获取记忆
PUT    /api/memories/:id                  # 更新记忆
DELETE /api/memories/:id                  # 删除记忆

# 语义搜索
POST   /api/memories/search               # 语义相似搜索
POST   /api/memories/hybrid-search        # 混合搜索

# Agent 记忆
GET    /api/agents/:id/memories           # Agent 记忆列表
GET    /api/agents/:id/memories/recent    # 最近记忆
GET    /api/agents/:id/experiences        # Agent 经验
POST   /api/agents/:id/experiences        # 记录经验

# 学习
POST   /api/memories/learn                # 从经验学习
GET    /api/agents/:id/suggestions        # 智能建议

# 统计
GET    /api/memories/stats                # 记忆统计
GET    /api/memories/trends               # 趋势分析


# ============================================
# Router API (消息路由)
# ============================================

# 消息发送
POST   /api/router/send                   # 发送消息
POST   /api/router/broadcast              # 广播消息
POST   /api/router/multicast              # 多播消息

# 订阅管理
POST   /api/router/subscribe              # 订阅主题
DELETE /api/router/subscribe/:id          # 取消订阅
GET    /api/router/subscriptions          # 订阅列表
GET    /api/router/subscriptions/:id      # 订阅详情

# 消息队列
GET    /api/router/queue/:agentId         # 队列消息
POST   /api/router/ack/:messageId         # 确认消息

# 路由状态
GET    /api/router/status                 # 路由状态
GET    /api/router/metrics                # 路由指标
GET    /api/router/topology               # 路由拓扑


# ============================================
# Monitor API (监控告警)
# ============================================

# 健康检查
GET    /api/monitor/health                # 系统健康
GET    /api/monitor/health/agents         # Agent 健康
GET    /api/monitor/health/services       # 服务健康

# 指标
GET    /api/monitor/metrics               # 指标列表
GET    /api/monitor/metrics/:name         # 指标详情
POST   /api/monitor/metrics/query         # 指标查询
GET    /api/monitor/metrics/realtime      # 实时指标流

# 告警
GET    /api/monitor/alerts                # 告警列表
GET    /api/monitor/alerts/:id            # 告警详情
POST   /api/monitor/alerts/:id/ack        # 确认告警
POST   /api/monitor/alerts/:id/resolve    # 解决告警

# 告警规则
GET    /api/monitor/alerts/rules          # 规则列表
POST   /api/monitor/alerts/rules          # 创建规则
PUT    /api/monitor/alerts/rules/:id      # 更新规则
DELETE /api/monitor/alerts/rules/:id      # 删除规则

# 追踪
GET    /api/monitor/traces                # 追踪列表
GET    /api/monitor/traces/:id            # 追踪详情

# 仪表盘
GET    /api/monitor/dashboards            # 仪表盘列表
GET    /api/monitor/dashboards/:id        # 仪表盘数据
```

### 6.3 WebSocket 事件

```typescript
// 服务端 -> 客户端
interface ServerEvents {
  // 记忆事件
  'memory:created': (memory: Memory) => void;
  'memory:updated': (memory: Memory) => void;
  'memory:accessed': (memoryId: string, agentId: string) => void;
  
  // 路由事件
  'router:message': (message: AgentMessage) => void;
  'router:ack': (messageId: string, status: string) => void;
  'router:error': (error: RouterError) => void;
  
  // 监控事件
  'monitor:metrics': (metrics: MetricData[]) => void;
  'monitor:alert': (alert: ActiveAlert) => void;
  'monitor:alert:resolved': (alertId: string) => void;
  'monitor:health': (health: HealthStatus) => void;
}

// 客户端 -> 服务端
interface ClientEvents {
  // 记忆操作
  'memory:search': (query: SearchQuery) => void;
  'memory:subscribe': (agentId: string) => void;
  
  // 路由操作
  'router:subscribe': (pattern: string) => void;
  'router:unsubscribe': (subscriptionId: string) => void;
  'router:ack': (messageId: string) => void;
  
  // 监控操作
  'monitor:subscribe': (metrics: string[]) => void;
  'monitor:unsubscribe': () => void;
}
```

---

## 7. 实施计划

### 7.1 阶段划分

#### 第一阶段：基础设施（3周）

**Week 1-2: 数据层**
- [ ] Milvus 集群部署和配置
- [ ] ClickHouse 集群部署和配置
- [ ] Redis 集群扩容（用于消息路由）
- [ ] 数据库迁移脚本

**Week 3: 基础服务**
- [ ] MetricsService 实现
- [ ] TraceService 实现
- [ ] HealthChecker 实现
- [ ] 基础 API 网关

#### 第二阶段：长期记忆系统（4周）

**Week 4-5: 核心功能**
- [ ] MemoryStore 实现
- [ ] VectorIndex 集成
- [ ] ExperienceLearner 实现
- [ ] Memory API 实现

**Week 6-7: 高级功能**
- [ ] 语义搜索优化
- [ ] 智能建议生成
- [ ] 知识图谱构建
- [ ] 记忆浏览器前端

#### 第三阶段：消息路由优化（3周）

**Week 8-9: 核心功能**
- [ ] MessageRouter 实现
- [ ] TopicManager 实现
- [ ] 优先级队列
- [ ] Router API 实现

**Week 10: 高级功能**
- [ ] 智能路由决策
- [ ] 可靠性保证
- [ ] 性能优化
- [ ] 路由监控

#### 第四阶段：监控告警（3周）

**Week 11-12: 核心功能**
- [ ] MetricsCollector 实现
- [ ] AlertEngine 实现
- [ ] 监控 API 实现
- [ ] 前端监控面板

**Week 13: 高级功能**
- [ ] 异常检测
- [ ] 趋势预测
- [ ] 自动修复
- [ ] 告警通知集成

#### 第五阶段：集成测试和优化（2周）

**Week 14: 集成测试**
- [ ] 端到端测试
- [ ] 性能测试
- [ ] 压力测试
- [ ] 故障恢复测试

**Week 15: 优化和发布**
- [ ] 性能优化
- [ ] 文档完善
- [ ] 部署发布
- [ ] 监控验证

### 7.2 里程碑

| 里程碑 | 日期 | 交付物 | 验收标准 |
|--------|------|--------|---------|
| M1: 基础设施就绪 | 第3周末 | 数据层和服务层可用 | 所有服务健康检查通过 |
| M2: 记忆系统可用 | 第7周末 | 长期记忆功能上线 | 语义搜索准确率 >85% |
| M3: 路由优化完成 | 第10周末 | 消息路由优化上线 | 消息延迟 <50ms |
| M4: 监控告警上线 | 第13周末 | 监控系统上线 | 告警准确率 >90% |
| M5: 生产就绪 | 第15周末 | 完整系统上线 | 所有测试通过 |

### 7.3 资源需求

| 资源类型 | 数量 | 用途 |
|---------|------|------|
| **开发人员** | 4人 | 后端、前端、测试 |
| **Milvus 集群** | 3节点 | 向量存储（每节点 16GB RAM） |
| **ClickHouse** | 3节点 | 时序数据（每节点 32GB RAM） |
| **Redis 集群** | 3节点 | 消息路由（每节点 8GB RAM） |
| **存储** | 500GB SSD | 数据库存储 |

### 7.4 依赖关系

```
M1 (基础设施)
 └─→ M2 (记忆系统)
      └─→ M3 (消息路由)
           └─→ M4 (监控告警)
                └─→ M5 (生产就绪)
```

---

## 8. 风险评估

### 8.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| Milvus 性能不达标 | 高 | 中 | 提前性能测试，准备 Elasticsearch 备选 |
| 向量检索准确率低 | 中 | 中 | 多模型对比测试，优化索引参数 |
| 消息路由延迟超标 | 高 | 低 | 多层缓存，智能路由优化 |
| ClickHouse 写入瓶颈 | 中 | 低 | 批量写入优化，分区策略调整 |
| 告警风暴 | 中 | 中 | 告警聚合、冷却期、智能降噪 |

### 8.2 资源风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 开发人员不足 | 高 | 中 | 优先级排序，分阶段交付 |
| 硬件资源不足 | 中 | 低 | 云弹性扩展，资源监控 |
| 存储空间不足 | 中 | 低 | TTL 策略，数据归档 |

### 8.3 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| Agent 接受度低 | 中 | 低 | 渐进式启用，用户培训 |
| 性能影响现有功能 | 高 | 低 | 灰度发布，性能监控 |
| 数据隐私问题 | 高 | 低 | 数据加密，访问控制 |

---

## 9. 附录

### 9.1 技术栈总结

```yaml
新增技术:
  向量数据库: Milvus 2.3+
  时序数据库: ClickHouse 23.8+
  消息队列: Redis Streams
  监控: Prometheus + Grafana（可选）
  追踪: OpenTelemetry

保留技术:
  主数据库: PostgreSQL / SQLite
  缓存: Redis
  API框架: Next.js 16
  前端: React 19 + React Flow
  状态管理: Zustand
```

### 9.2 性能指标

| 指标 | 当前值 (v1.7.0) | 目标值 (v1.8.0) |
|------|----------------|-----------------|
| Agent 任务成功率 | 85% | 90%+ |
| 消息传递延迟 | ~100ms | <50ms |
| 问题发现时间 | ~30min | <5min |
| 告警准确率 | N/A | >90% |
| 记忆检索速度 | N/A | <100ms |
| 向量搜索准确率 | N/A | >85% |

### 9.3 参考资料

- [Milvus 官方文档](https://milvus.io/docs)
- [ClickHouse 官方文档](https://clickhouse.com/docs)
- [OpenTelemetry 规范](https://opentelemetry.io/docs)
- [v1.7.0 工作流编排器设计](../v1.7.0/visual-workflow-orchestrator-design.md)
- [Agent 调度器架构](../adr/0006-agent-scheduler-architecture.md)

---

**文档结束**

*本架构设计文档将随着开发进展持续更新。如有疑问或建议，请联系架构师团队。*

**维护者**: 🏗️ 架构师 (AI 团队)
**最后更新**: 2026-04-01
**版本**: v1.8.0