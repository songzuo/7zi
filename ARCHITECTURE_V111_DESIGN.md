# v1.11.0 核心架构设计文档

**版本**: v1.11.0  
**状态**: 规划中  
**日期**: 2026-04-03  
**架构师**: 🏗️ 架构师  
**工作目录**: `/root/.openclaw/workspace/7zi-project`

---

## 一、版本目标与背景

### 1.1 战略定位

v1.11.0 是从 **"AI 工具集"** 到 **"AI 协作平台"** 的战略转型版本。基于 v1.10.0 已完成的 Visual Workflow Orchestrator 和 AI 代码生成能力，v1.11.0 将聚焦于多租户支持、Agent 智能化、跨 Agent 协作和性能极致优化。

### 1.2 v1.10.0 完成状态回顾

| 功能模块 | 状态 | 代码位置 |
|----------|------|----------|
| **多模型智能路由** | ✅ 完成 | `src/lib/ai/providers/` |
| **智能代码生成** | ✅ 完成 | `src/lib/ai/CodeGenerator.ts` |
| **多 Agent 协作编排** | ✅ 完成 | `src/lib/multi-agent/MultiAgentOrchestrator.ts` |
| **A2A 协议** | ✅ 完成 | `src/lib/a2a/` |
| **Agent Registry** | ✅ 完成 | `src/lib/agents/AgentRegistry.ts` |
| **性能监控** | ✅ 完成 | `src/lib/monitoring/monitor.ts` |

**现有代码规模**: ~6,900 行 TypeScript

### 1.3 v1.11.0 核心目标

| 目标 | 描述 | 优先级 |
|------|------|--------|
| **多租户系统** | 企业级 SaaS 数据隔离、认证、配额 | P0 |
| **Agent 决策引擎** | 自主任务分解、路径规划、动态调整 | P0 |
| **Agent 记忆系统** | 跨会话持久化记忆、经验学习 | P1 |
| **工作流编排增强** | 条件分支、循环、并行网关等新节点 | P1 |
| **性能极致优化** | 端到端 P95 < 10ms，响应速度提升 60%+ | P2 |

---

## 二、核心功能架构

### 2.1 Multi-tenant 多租户系统 (Phase 1)

#### 2.1.1 设计目标

实现企业级多租户架构，支持数据隔离、租户认证、资源配额和计费。

#### 2.1.2 架构设计

```
src/lib/multi-tenant/
├── TenantManager.ts          # 租户管理器
├── TenantContext.ts          # 租户上下文（请求级别）
├── data-isolation/
│   ├── RowLevelIsolation.ts  # 行级数据隔离
│   └── SchemaIsolation.ts    # Schema 级隔离
├── auth/
│   ├── TenantAuth.ts         # 租户认证
│   ├── SSOAuth.ts            # SSO OAuth2
│   └── LDAPAuth.ts           # LDAP 认证
├── quota/
│   ├── QuotaManager.ts       # 配额管理器
│   └── ResourceLimiter.ts    # 资源限制器
├── billing/
│   ├── BillingService.ts     # 计费服务
│   └── InvoiceGenerator.ts   # 发票生成
└── middleware/
    └── TenantMiddleware.ts   # 租户中间件
```

#### 2.1.3 核心接口

```typescript
// src/lib/multi-tenant/TenantManager.ts

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'pending';
  config: TenantConfig;
  metadata: TenantMetadata;
}

export interface TenantConfig {
  isolation: 'row-level' | 'schema-level';
  authentication: AuthConfig;
  limits: ResourceLimits;
  branding: BrandingConfig;
}

export interface ResourceLimits {
  cpu: number;              // CPU 配额 (cores)
  memory: number;           // 内存配额 (MB)
  storage: number;          // 存储配额 (GB)
  requestsPerMinute: number; // RPM 限制
  maxAgents: number;        // 最大 Agent 数量
  maxWorkflows: number;     // 最大工作流数量
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  plan: Tenant['plan'];
  limits: ResourceLimits;
  features: string[];
}

export class TenantManager {
  // 创建租户
  async createTenant(config: CreateTenantConfig): Promise<Tenant>;
  
  // 获取租户
  async getTenant(tenantId: string): Promise<Tenant>;
  
  // 验证访问权限
  async validateAccess(tenantId: string, userId: string): Promise<AccessResult>;
  
  // 配额检查
  async checkQuota(tenantId: string, resource: ResourceType): Promise<QuotaStatus>;
  
  // 更新租户配置
  async updateTenant(tenantId: string, updates: Partial<TenantConfig>): Promise<Tenant>;
}
```

#### 2.1.4 数据隔离策略

```typescript
// src/lib/multi-tenant/data-isolation/RowLevelIsolation.ts

export class RowLevelIsolation {
  // 自动注入 tenant_id 过滤条件
  applyTenantFilter(query: any, tenantContext: TenantContext): any {
    return {
      ...query,
      filter: {
        ...query.filter,
        tenant_id: tenantContext.tenantId
      }
    };
  }
  
  // 验证数据归属
  validateOwnership(record: any, tenantContext: TenantContext): boolean {
    return record.tenant_id === tenantContext.tenantId;
  }
  
  // 跨租户数据查询防护
  sanitizeQuery(query: any, tenantContext: TenantContext): any {
    // 防止 tenant_id 注入
    if (query.filter?.tenant_id && query.filter.tenant_id !== tenantContext.tenantId) {
      throw new UnauthorizedError('Cross-tenant access denied');
    }
    return query;
  }
}
```

#### 2.1.5 租户中间件

```typescript
// src/lib/multi-tenant/middleware/TenantMiddleware.ts

export class TenantMiddleware {
  constructor(
    private tenantManager: TenantManager,
    private quotaManager: QuotaManager
  ) {}
  
  // Express/Koa 中间件
  middleware() {
    return async (ctx: Context, next: Next) => {
      // 1. 从 header/token 提取租户 ID
      const tenantId = this.extractTenantId(ctx);
      if (!tenantId) {
        throw new TenantRequiredError();
      }
      
      // 2. 加载租户上下文
      const tenant = await this.tenantManager.getTenant(tenantId);
      if (!tenant) {
        throw new TenantNotFoundError(tenantId);
      }
      
      // 3. 检查租户状态
      if (tenant.status !== 'active') {
        throw new TenantInactiveError(tenant.status);
      }
      
      // 4. 配额预检查
      await this.quotaManager.preflightCheck(tenantId);
      
      // 5. 注入上下文
      ctx.tenantContext = {
        tenantId: tenant.id,
        userId: this.extractUserId(ctx),
        plan: tenant.plan,
        limits: tenant.config.limits,
        features: this.getPlanFeatures(tenant.plan)
      };
      
      await next();
    };
  }
  
  private extractTenantId(ctx: Context): string | null {
    // 优先级: Header > Subdomain > JWT
    return ctx.headers['x-tenant-id'] 
      || ctx.subdomain 
      || ctx.state.user?.tenantId 
      || null;
  }
}
```

#### 2.1.6 配额管理

```typescript
// src/lib/multi-tenant/quota/QuotaManager.ts

export class QuotaManager {
  private limits: Map<string, ResourceLimits> = new Map();
  
  async checkQuota(tenantId: string, resource: ResourceRequest): Promise<QuotaCheck> {
    const tenant = await this.getTenant(tenantId);
    const currentUsage = await this.getCurrentUsage(tenantId, resource.type);
    const limit = tenant.config.limits[resource.type];
    
    return {
      allowed: currentUsage + resource.amount <= limit,
      current: currentUsage,
      limit,
      remaining: Math.max(0, limit - currentUsage),
      resetAt: this.getResetTime(tenantId)
    };
  }
  
  async enforceLimit(tenantId: string, resource: ResourceRequest): Promise<void> {
    const check = await this.checkQuota(tenantId, resource);
    if (!check.allowed) {
      throw new QuotaExceededError(resource.type, check.limit, check.current);
    }
  }
  
  // 滑动窗口限流
  async checkRateLimit(tenantId: string): Promise<RateLimitResult> {
    const key = `ratelimit:${tenantId}`;
    const now = Date.now();
    const windowMs = 60000; // 1 分钟窗口
    
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowMs / 1000);
    }
    
    const tenant = await this.getTenant(tenantId);
    const limit = tenant.config.limits.requestsPerMinute;
    
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: now + windowMs
    };
  }
}
```

---

### 2.2 Agent 决策引擎 (Phase 2)

#### 2.2.1 设计目标

让 Agent 具备自主分析任务、制定执行计划、选择最优路径的能力，减少人工干预。

#### 2.2.2 架构设计

```
src/lib/agents/decision/
├── DecisionEngine.ts          # 决策引擎核心
├── TaskAnalyzer.ts            # 任务分析器
├── Planner.ts                 # 规划器
├── RiskAssessor.ts            # 风险评估器
├── PathSelector.ts            # 路径选择器
├── ExecutionMonitor.ts        # 执行监控
└── types.ts                   # 决策相关类型
```

#### 2.2.3 核心接口

```typescript
// src/lib/agents/decision/types.ts

export interface TaskAnalysis {
  taskId: string;
  type: TaskType;
  complexity: 'low' | 'medium' | 'high' | 'very-high';
  requiredCapabilities: string[];
  dependencies: Dependency[];
  constraints: Constraint[];
  estimatedDuration: number;
  riskFactors: string[];
}

export interface ExecutionPlan {
  id: string;
  taskId: string;
  strategy: 'sequential' | 'parallel' | 'hybrid';
  steps: PlanStep[];
  estimatedDuration: number;
  estimatedCost: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  fallbackPlan?: ExecutionPlan;
  alternativePlans: ExecutionPlan[];
}

export interface PlanStep {
  id: string;
  agent: AgentType;
  action: string;
  input: any;
  dependencies: string[];
  estimatedDuration: number;
  requiredResources: Resource[];
  retryPolicy: RetryPolicy;
  rollbackAction?: string;
}

export interface RiskAssessment {
  overall: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  mitigations: Mitigation[];
  fallbackAvailable: boolean;
}

export interface RiskFactor {
  type: 'technical' | 'resource' | 'external' | 'unknown';
  description: string;
  probability: number;  // 0-1
  impact: number;      // 0-1
  score: number;        // probability * impact
}

export interface Mitigation {
  factor: string;
  action: string;
  effectiveness: number;  // 0-1
}
```

#### 2.2.4 决策引擎核心

```typescript
// src/lib/agents/decision/DecisionEngine.ts

export class DecisionEngine {
  private taskAnalyzer: TaskAnalyzer;
  private planner: Planner;
  private riskAssessor: RiskAssessor;
  private pathSelector: PathSelector;
  
  constructor(
    private agentRegistry: AgentRegistry,
    private a2aProtocol: A2AProtocol
  ) {
    this.taskAnalyzer = new TaskAnalyzer();
    this.planner = new Planner(agentRegistry);
    this.riskAssessor = new RiskAssessor();
    this.pathSelector = new PathSelector();
  }
  
  // 分析任务并生成执行计划
  async plan(task: Task): Promise<ExecutionPlan> {
    // 1. 任务分析
    const analysis = await this.taskAnalyzer.analyze(task);
    
    // 2. 生成多个执行方案
    const candidatePlans = await this.planner.generatePlans(task, analysis);
    
    // 3. 风险评估
    const assessedPlans = await Promise.all(
      candidatePlans.map(async (plan) => ({
        plan,
        risk: await this.riskAssessor.assess(plan)
      }))
    );
    
    // 4. 选择最优方案
    const selectedPlan = this.pathSelector.select(
      assessedPlans,
      {
        preferSpeed: task.priority === 'high',
        preferCost: task.budgetLimited,
        preferReliability: task.critical
      }
    );
    
    return selectedPlan;
  }
  
  // 动态调整计划
  async adjustPlan(
    plan: ExecutionPlan,
    feedback: ExecutionFeedback
  ): Promise<ExecutionPlan> {
    const adjustment = this.analyzeFeedback(feedback);
    
    if (adjustment.requiresReplan) {
      // 重新规划
      return this.planner.replan(plan, adjustment);
    }
    
    // 局部调整
    return this.planner.adjust(plan, adjustment);
  }
  
  // 监控执行并提供干预点
  async monitorExecution(
    plan: ExecutionPlan,
    onCheckpoint: (checkpoint: ExecutionCheckpoint) => void
  ): Promise<ExecutionResult> {
    const monitor = new ExecutionMonitor(this.a2aProtocol);
    
    monitor.on('checkpoint', onCheckpoint);
    monitor.on('risk-escalation', async (risk) => {
      // 自动风险缓解或人工干预
      if (risk.level === 'critical') {
        await this.handleCriticalRisk(plan, risk);
      }
    });
    
    return monitor.execute(plan);
  }
}
```

#### 2.2.5 任务分析器

```typescript
// src/lib/agents/decision/TaskAnalyzer.ts

export class TaskAnalyzer {
  async analyze(task: Task): Promise<TaskAnalysis> {
    const [type, complexity, capabilities, dependencies] = await Promise.all([
      this.identifyTaskType(task),
      this.assessComplexity(task),
      this.extractRequiredCapabilities(task),
      this.analyzeDependencies(task)
    ]);
    
    return {
      taskId: task.id,
      type,
      complexity,
      requiredCapabilities: capabilities,
      dependencies,
      constraints: task.constraints || [],
      estimatedDuration: this.estimateDuration(task, complexity),
      riskFactors: this.identifyRiskFactors(task, dependencies)
    };
  }
  
  private async identifyTaskType(task: Task): Promise<TaskType> {
    // 使用 LLM 或规则引擎识别任务类型
    const embedding = await this.embedTask(task);
    const cluster = await this.classifyEmbedding(embedding);
    
    return this.mapToTaskType(cluster);
  }
  
  private assessComplexity(task: Task): Promise<'low' | 'medium' | 'high' | 'very-high'> {
    const factors = [
      task.payload?.codeComplexity || 0,
      task.requiredCapabilities.length,
      task.dependencies?.length || 0,
      task.constraints?.length || 0
    ];
    
    const score = factors.reduce((sum, f) => sum + f, 0);
    
    if (score < 3) return 'low';
    if (score < 6) return 'medium';
    if (score < 10) return 'high';
    return 'very-high';
  }
}
```

---

### 2.3 Agent 记忆系统 (Phase 2)

#### 2.3.1 设计目标

为 Agent 建立持久化记忆系统，支持跨会话上下文保持、经验学习和知识积累。

#### 2.3.2 架构设计

```
src/lib/agents/memory/
├── MemorySystem.ts             # 记忆系统核心
├── WorkingMemory.ts            # 工作记忆（当前会话）
├── ShortTermMemory.ts         # 短期记忆（7天）
├── LongTermMemory.ts           # 长期记忆（永久）
├── MemoryStore.ts             # 记忆存储层
├── MemoryRetrieval.ts         # 记忆检索
├── ForgettingCurve.ts         # 遗忘曲线
└── types.ts                   # 记忆类型定义
```

#### 2.3.3 核心接口

```typescript
// src/lib/agents/memory/types.ts

export type MemoryType = 'working' | 'short-term' | 'long-term' | 'episodic' | 'semantic';

export interface MemoryEntry {
  id: string;
  agentId: string;
  type: MemoryType;
  content: MemoryContent;
  embedding?: number[];
  metadata: MemoryMetadata;
  associations: string[];  // 关联记忆 ID
  accessLevel: 'private' | 'team' | 'public';
}

export interface MemoryContent {
  summary: string;         // 摘要
  details: string;         // 详细信息
  facts: Fact[];           // 提取的事实
  skills: SkillRef[];      // 关联技能
}

export interface MemoryMetadata {
  importance: number;      // 0-1, 重要性权重
  accessCount: number;     // 访问次数
  lastAccessed: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;        // 过期时间
  source: 'interaction' | 'task' | 'observation' | 'inference';
  tags: string[];
}

export interface MemoryQuery {
  text?: string;           // 文本查询
  type?: MemoryType;       // 记忆类型过滤
  agentId?: string;        // Agent 过滤
  timeRange?: TimeRange;   // 时间范围
  importanceThreshold?: number;
  tags?: string[];
  limit?: number;
}
```

#### 2.3.4 记忆系统核心

```typescript
// src/lib/agents/memory/MemorySystem.ts

export class MemorySystem {
  private workingMemory: WorkingMemory;
  private shortTermMemory: ShortTermMemory;
  private longTermMemory: LongTermMemory;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;
  private forgettingCurve: ForgettingCurve;
  
  constructor(config: MemoryConfig) {
    this.workingMemory = new WorkingMemory(config.workingMemorySize);
    this.shortTermMemory = new ShortTermMemory(config.storage);
    this.longTermMemory = new LongTermMemory(config.storage);
    this.embeddingService = new EmbeddingService(config.embeddingModel);
    this.vectorStore = new VectorStore(config.vectorDb);
    this.forgettingCurve = new ForgettingCurve();
  }
  
  // 存储记忆
  async store(entry: MemoryEntry): Promise<void> {
    // 生成 embedding
    if (!entry.embedding) {
      entry.embedding = await this.embeddingService.embed(entry.content.summary);
    }
    
    // 根据类型选择存储位置
    switch (entry.type) {
      case 'working':
        this.workingMemory.store(entry);
        break;
      case 'short-term':
        await this.shortTermMemory.store(entry);
        await this.vectorStore.insert(entry);
        break;
      case 'long-term':
      case 'episodic':
      case 'semantic':
        await this.longTermMemory.store(entry);
        await this.vectorStore.insert(entry);
        break;
    }
    
    this.emit('memory:stored', entry);
  }
  
  // 检索相关记忆
  async retrieve(query: MemoryQuery): Promise<MemoryRetrievalResult[]> {
    const results: MemoryRetrievalResult[] = [];
    
    // 并行多策略检索
    const [byText, byTime, byImportance] = await Promise.all([
      query.text ? this.retrieveBySimilarity(query) : [],
      query.timeRange ? this.retrieveByTime(query.timeRange) : [],
      query.importanceThreshold 
        ? this.retrieveByImportance(query.importanceThreshold) 
        : []
    ]);
    
    // 合并去重
    const merged = this.mergeResults(byText, byTime, byImportance);
    
    // 排序和过滤
    return merged
      .filter(r => this.forgettingCurve.shouldRetain(r.entry))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, query.limit || 10);
  }
  
  // 基于相似度检索
  private async retrieveBySimilarity(
    query: MemoryQuery
  ): Promise<MemoryRetrievalResult[]> {
    const queryEmbedding = await this.embeddingService.embed(query.text!);
    
    const candidates = await this.vectorStore.search(queryEmbedding, {
      topK: query.limit || 20,
      filters: {
        type: query.type,
        agentId: query.agentId
      }
    });
    
    return candidates.map(c => ({
      entry: c.entry,
      relevance: c.score,
      source: 'similarity'
    }));
  }
  
  // 知识迁移（Agent 间共享）
  async migrateKnowledge(
    sourceAgentId: string,
    targetAgentId: string,
    filter?: MemoryQuery
  ): Promise<number> {
    const knowledge = await this.longTermMemory.query({
      agentId: sourceAgentId,
      accessLevel: ['team', 'public'],
      ...filter
    });
    
    let migrated = 0;
    for (const entry of knowledge) {
      // 创建新的记忆条目（带有来源引用）
      const migratedEntry: MemoryEntry = {
        ...entry,
        id: generateId(),
        agentId: targetAgentId,
        metadata: {
          ...entry.metadata,
          source: 'migration',
          migratedFrom: sourceAgentId
        }
      };
      
      await this.store(migratedEntry);
      migrated++;
    }
    
    return migrated;
  }
  
  // 遗忘机制（定期清理低价值记忆）
  async prune(minImportance: number = 0.1): Promise<number> {
    const toForget = await this.longTermMemory.query({
      'metadata.importance': { $lt: minImportance }
    });
    
    let pruned = 0;
    for (const entry of toForget) {
      if (this.forgettingCurve.shouldForget(entry)) {
        await this.longTermMemory.delete(entry.id);
        await this.vectorStore.delete(entry.id);
        pruned++;
      }
    }
    
    return pruned;
  }
}
```

#### 2.3.5 遗忘曲线实现

```typescript
// src/lib/agents/memory/ForgettingCurve.ts

export class ForgettingCurve {
  // Ebbinghaus 遗忘曲线: R = e^(-t/S)
  // R = 记忆保持率, t = 时间, S = 记忆强度
  
  calculateRetention(memory: MemoryEntry): number {
    const age = Date.now() - memory.metadata.createdAt.getTime();
    const strength = this.calculateStrength(memory);
    return Math.exp(-age / strength);
  }
  
  calculateStrength(memory: MemoryEntry): number {
    // 基础强度: 1 天
    const baseStrength = 24 * 3600 * 1000;
    
    // 访问次数加成
    const accessBonus = memory.metadata.accessCount * 0.1;
    
    // 重要性加成
    const importanceBonus = memory.metadata.importance * 0.5;
    
    // 最近访问加成
    const recentAccessBonus = this.calculateRecentAccessBonus(memory);
    
    return baseStrength * (1 + accessBonus + importanceBonus + recentAccessBonus);
  }
  
  shouldRetain(memory: MemoryEntry): boolean {
    return this.calculateRetention(memory) > 0.1;
  }
  
  shouldForget(memory: MemoryEntry): boolean {
    return this.calculateRetention(memory) < 0.05;
  }
  
  // 记忆强化（访问时调用）
  reinforce(memory: MemoryEntry): void {
    memory.metadata.lastAccessed = new Date();
    memory.metadata.accessCount++;
    
    // 重要性随访问动态调整
    if (memory.metadata.accessCount > 10) {
      memory.metadata.importance = Math.min(1, memory.metadata.importance + 0.05);
    }
  }
}
```

---

### 2.4 工作流编排增强 (Phase 3)

#### 2.4.1 设计目标

在 v1.10.0 Visual Workflow Orchestrator 基础上，增强可视化编排能力，支持更复杂的工作流设计。

#### 2.4.2 架构设计

```
src/lib/workflow/
├── engine/
│   ├── WorkflowEngine.ts       # 工作流执行引擎
│   ├── NodeExecutor.ts        # 节点执行器
│   └── ExecutionContext.ts   # 执行上下文
├── nodes/
│   ├── NodeRegistry.ts        # 节点类型注册
│   ├── types.ts               # 节点类型定义
│   ├── implementations/
│   │   ├── StartNode.ts
│   │   ├── EndNode.ts
│   │   ├── AgentNode.ts
│   │   ├── ConditionNode.ts   # 条件分支
│   │   ├── LoopNode.ts        # 循环节点
│   │   ├── ParallelNode.ts    # 并行网关
│   │   ├── SubprocessNode.ts  # 子流程
│   │   ├── HumanApprovalNode.ts # 人工审批
│   │   └── WebhookNode.ts
│   └── base/
│       └── BaseNode.ts
├── canvas/
│   ├── WorkflowCanvas.ts      # 画布组件
│   ├── NodeRenderer.ts        # 节点渲染
│   └── EdgeRenderer.ts        # 连线渲染
└── templates/
    ├── TemplateRegistry.ts    # 模板注册
    └── builtins/              # 内置模板
```

#### 2.4.3 节点类型定义

```typescript
// src/lib/workflow/nodes/types.ts

export type NodeType = 
  | 'start' 
  | 'end' 
  | 'agent' 
  | 'condition' 
  | 'loop' 
  | 'parallel' 
  | 'subprocess' 
  | 'event-trigger' 
  | 'human-approval' 
  | 'delay' 
  | 'webhook';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  config: NodeConfig;
  inputs: Port[];
  outputs: Port[];
}

export interface Port {
  id: string;
  name: string;
  type: 'data' | 'control';
  schema?: JsonSchema;
}

// 条件分支节点
export interface ConditionNode extends WorkflowNode {
  type: 'condition';
  config: {
    conditions: Condition[];
    defaultBranch: string;  // 默认分支节点 ID
  };
}

export interface Condition {
  id: string;
  expression: string;       // 条件表达式 (e.g., "data.status == 'approved'")
  label: string;
  targetNode: string;       // 目标节点 ID
}

// 循环节点
export interface LoopNode extends WorkflowNode {
  type: 'loop';
  config: {
    iterator: string;       // 迭代变量名
    collection: string;      // 集合表达式
    maxIterations: number;   // 最大迭代次数
    continueOnError: boolean;
  };
}

// 并行网关节点
export interface ParallelNode extends WorkflowNode {
  type: 'parallel';
  config: {
    mode: 'fork' | 'join';
    branches: string[];      // 分支节点 IDs
    joinCondition: 'all' | 'any' | 'n';
    n?: number;              // 当 joinCondition 为 'n' 时
  };
}

// 人工审批节点
export interface HumanApprovalNode extends WorkflowNode {
  type: 'human-approval';
  config: {
    approvers: string[];     // 审批人列表
    approvalType: 'any' | 'all' | 'sequential';
    timeout: number;          // 超时时间（分钟）
    timeoutAction: 'approve' | 'reject' | 'escalate';
    escalationTarget?: string;
    instructions: string;    // 审批说明
  };
}
```

#### 2.4.4 工作流执行引擎

```typescript
// src/lib/workflow/engine/WorkflowEngine.ts

export class WorkflowEngine {
  private nodeRegistry: NodeRegistry;
  private executor: NodeExecutor;
  
  constructor(
    nodeRegistry: NodeRegistry,
    private agentRegistry: AgentRegistry,
    private a2aProtocol: A2AProtocol
  ) {
    this.nodeRegistry = nodeRegistry;
    this.executor = new NodeExecutor(agentRegistry, a2aProtocol);
  }
  
  async execute(
    workflow: Workflow,
    input: any,
    options?: ExecutionOptions
  ): Promise<WorkflowResult> {
    const context = new ExecutionContext(workflow, input);
    let currentNodeId = this.findStartNode(workflow);
    
    try {
      while (currentNodeId && context.state === 'running') {
        const node = workflow.nodes.find(n => n.id === currentNodeId);
        if (!node) {
          throw new NodeNotFoundError(currentNodeId);
        }
        
        // 检查是否满足执行条件
        if (!this.canExecute(node, context)) {
          currentNodeId = this.waitForCondition(node, context);
          continue;
        }
        
        // 执行节点
        const result = await this.executor.execute(node, context);
        context.setNodeResult(node.id, result);
        
        // 处理执行结果
        if (result.type === 'wait') {
          // 等待外部事件
          return { status: 'waiting', instanceId: context.instanceId };
        }
        
        // 确定下一个节点
        currentNodeId = this.findNextNode(workflow, node, result);
        context.currentNodeId = currentNodeId;
      }
      
      return {
        status: 'completed',
        output: context.output,
        instanceId: context.instanceId
      };
      
    } catch (error) {
      return this.handleError(context, error);
    }
  }
  
  private async executeConditionNode(
    node: ConditionNode,
    context: ExecutionContext
  ): Promise<NodeResult> {
    for (const condition of node.config.conditions) {
      const result = this.evaluateExpression(condition.expression, context.variables);
      if (result) {
        return { type: 'continue', nextNodeId: condition.targetNode };
      }
    }
    
    // 默认分支
    return { type: 'continue', nextNodeId: node.config.defaultBranch };
  }
  
  private async executeParallelNode(
    node: ParallelNode,
    context: ExecutionContext
  ): Promise<NodeResult> {
    if (node.config.mode === 'fork') {
      // 分支执行
      const branchPromises = node.config.branches.map(branchId =>
        this.executeBranch(branchId, context.clone())
      );
      
      await Promise.all(branchPromises);
      
      return { type: 'continue', nextNodeId: this.findNextNodeId(node) };
    } else {
      // 合并节点：等待所有分支到达
      const ready = context.checkParallelJoin(node.id, node.config.branches);
      if (!ready) {
        return { type: 'wait', reason: 'waiting_for_branches' };
      }
      
      return { type: 'continue', nextNodeId: this.findNextNodeId(node) };
    }
  }
  
  private async executeLoopNode(
    node: LoopNode,
    context: ExecutionContext
  ): Promise<NodeResult> {
    const collection = this.evaluateExpression(node.config.collection, context.variables);
    const iterations = Array.isArray(collection) ? collection : [];
    
    if (iterations.length === 0) {
      return { type: 'continue', nextNodeId: this.findNextNodeId(node) };
    }
    
    const maxIterations = Math.min(node.config.maxIterations, iterations.length);
    
    for (let i = 0; i < maxIterations; i++) {
      context.variables[node.config.iterator] = iterations[i];
      context.variables['_loopIndex'] = i;
      
      try {
        // 执行循环体节点
        for (const bodyNodeId of this.getLoopBodyNodes(node)) {
          const result = await this.executor.execute(
            this.getNode(bodyNodeId),
            context
          );
          
          if (result.type === 'error' && !node.config.continueOnError) {
            return result;
          }
        }
      } catch (error) {
        if (!node.config.continueOnError) {
          return { type: 'error', error };
        }
      }
    }
    
    return { type: 'continue', nextNodeId: this.findNextNodeId(node) };
  }
}
```

---

### 2.5 性能极致优化 (Phase 4)

#### 2.5.1 设计目标

端到端性能优化，实现 API P95 响应时间 < 10ms，AI 任务启动时间 < 1s。

#### 2.5.2 架构设计

```
src/lib/performance/
├── optimizer/
│   ├── PerformanceOptimizer.ts     # 性能优化器
│   ├── RequestPreWarmer.ts         # 请求预热
│   ├── IntelligentCache.ts         # 智能缓存
│   └── ConnectionPool.ts           # 连接池优化
├── scheduler/
│   ├── ResourceScheduler.ts        # 资源调度器
│   └── LoadBalancer.ts             # 负载均衡
└── profiling/
    ├── Profiler.ts                 # 性能分析
    └── TraceCollector.ts           # 链路追踪
```

#### 2.5.3 关键优化策略

```typescript
// src/lib/performance/optimizer/RequestPreWarmer.ts

export class RequestPreWarmer {
  private warmupQueue: Queue<WarmupRequest> = new Queue();
  private isWarming = false;
  private modelCache: ModelCache;
  private connectionPool: ConnectionPool;
  
  constructor(
    private predictionModel: AIPredictionModel,
    private cacheStrategy: CacheStrategy
  ) {
    this.modelCache = new ModelCache();
    this.connectionPool = new ConnectionPool();
  }
  
  // 预测性预热
  async prewarm(): Promise<void> {
    const predictions = await this.predictionModel.predictNextRequests({
      windowMinutes: 5,
      topK: 20
    });
    
    for (const pred of predictions) {
      this.warmupQueue.enqueue({
        requestType: pred.type,
        priority: pred.probability,
        cacheKeys: pred.cacheKeys
      });
    }
    
    if (!this.isWarming) {
      this.startWarmingCycle();
    }
  }
  
  private async startWarmingCycle(): Promise<void> {
    this.isWarming = true;
    
    while (!this.warmupQueue.isEmpty()) {
      const request = this.warmupQueue.dequeue();
      
      // 按优先级排序
      const batch = this.warmupQueue.drainUntil(
        item => item.priority < request.priority
      );
      
      await Promise.all([
        ...batch.map(r => this.warmupRequest(r)),
        this.warmupRequest(request)
      ]);
    }
    
    this.isWarming = false;
  }
  
  private async warmupRequest(request: WarmupRequest): Promise<void> {
    const [model, connection, cache] = await Promise.all([
      this.modelCache.get(request.requestType),
      this.connectionPool.acquire(),
      this.cacheStrategy.warmup(request.cacheKeys)
    ]);
    
    // 记录预热命中
    metrics.record('warmup.hit', {
      type: request.requestType,
      cached: !!model
    });
  }
}

// src/lib/performance/optimizer/IntelligentCache.ts

export class IntelligentCache {
  private L1Cache: Map<string, CacheEntry> = new Map();      // 内存缓存
  private L2Cache: RedisCache;                               // Redis 缓存
  private predictivePrefetcher: PredictivePrefetcher;
  
  constructor(private redis: Redis, private embeddingService: EmbeddingService) {
    this.L2Cache = new RedisCache(redis);
    this.predictivePrefetcher = new PredictivePrefetcher(embeddingService);
  }
  
  async get(key: string): Promise<any> {
    // L1 查找
    const l1Entry = this.L1Cache.get(key);
    if (l1Entry && !this.isExpired(l1Entry)) {
      this.updateAccessStats(key, 'L1');
      return l1Entry.value;
    }
    
    // L2 查找
    const l2Value = await this.L2Cache.get(key);
    if (l2Value) {
      // 提升到 L1
      this.L1Cache.set(key, {
        value: l2Value,
        createdAt: Date.now(),
        accessCount: 1
      });
      this.updateAccessStats(key, 'L2');
      return l2Value;
    }
    
    return null;
  }
  
  // 智能预取
  async prefetch(pattern: string): Promise<void> {
    const predictedKeys = await this.predictivePrefetcher.predict(pattern);
    
    for (const key of predictedKeys) {
      if (!await this.exists(key)) {
        const value = await this.fetchSource(key);
        await this.set(key, value, { ttl: 300 }); // 5分钟 TTL
      }
    }
  }
  
  // LRU 清理
  private evictL1IfNeeded(): void {
    if (this.L1Cache.size > 1000) {
      const entries = Array.from(this.L1Cache.entries())
        .sort((a, b) => b[1].createdAt - a[1].createdAt);
      
      const toRemove = entries.slice(500);
      toRemove.forEach(([key]) => this.L1Cache.delete(key));
    }
  }
}

// 连接池优化
export class OptimizedConnectionPool {
  private pool: Pool;
  private minConnections = 10;
  private maxConnections = 100;
  private metrics: ConnectionMetrics;
  
  async adjustPoolSize(): Promise<void> {
    const currentLoad = await this.getCurrentLoad();
    const avgResponseTime = await this.getAvgResponseTime();
    
    if (currentLoad > 0.8 && this.pool.size < this.maxConnections) {
      await this.pool.expand(5);
    } else if (currentLoad < 0.3 && this.pool.size > this.minConnections) {
      await this.pool.shrink(5);
    }
    
    if (avgResponseTime > 100) {
      await this.pool.shrink(10);
    }
    
    this.metrics.record({ poolSize: this.pool.size, load: currentLoad });
  }
}
```

---

## 三、模块关系与依赖

### 3.1 核心模块依赖图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API Layer (入口)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ REST API    │  │ WebSocket   │  │ GraphQL     │  │ A2A Protocol│       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
└─────────┼────────────────┼────────────────┼────────────────┼───────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Tenant Middleware (多租户)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ 认证鉴权    │  │ 配额检查    │  │ 数据隔离    │  │ 上下文注入  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Service Layer (服务层)                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Decision Engine (决策引擎)                      │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │    │
│  │  │TaskAnalyzer│  │  Planner    │  │RiskAssessor│  │PathSelector │   │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Agent Memory System (记忆系统)                    │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │    │
│  │  │WorkingMemory│ │ShortTermMem │  │LongTermMem │  │VectorStore │   │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   Workflow Engine (工作流引擎)                        │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │    │
│  │  │  NodeExec  │  │ConditionNode│  │ LoopNode   │  │ParallelNode│   │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  Performance Optimizer (性能优化)                    │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │    │
│  │  │PreWarmer   │  │IntelliCache │  │PoolManager │  │ LoadBalancer│  │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Infrastructure Layer (基础设施)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ PostgreSQL  │  │   Redis     │  │  Vector DB  │  │  Message Q  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 模块职责边界

| 模块 | 职责 | 边界接口 |
|------|------|----------|
| **TenantManager** | 租户生命周期管理 | `createTenant()`, `getTenant()`, `updateTenant()` |
| **DecisionEngine** | 任务分析、规划、决策 | `plan()`, `adjustPlan()`, `monitorExecution()` |
| **MemorySystem** | 记忆存储、检索、遗忘 | `store()`, `retrieve()`, `migrateKnowledge()` |
| **WorkflowEngine** | 工作流执行、节点调度 | `execute()`, `pause()`, `resume()` |
| **PerformanceOptimizer** | 性能监控、预热、缓存 | `prewarm()`, `optimize()`, `getMetrics()` |

---

## 四、数据库设计

### 4.1 多租户数据隔离

```sql
-- 租户表
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 租户资源配额
CREATE TABLE tenant_quotas (
  tenant_id UUID REFERENCES tenants(id),
  resource_type VARCHAR(50) NOT NULL,
  current_usage BIGINT DEFAULT 0,
  limit_value BIGINT NOT NULL,
  reset_at TIMESTAMP,
  PRIMARY KEY (tenant_id, resource_type)
);

-- 工作流表（带租户隔离）
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  definition JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引策略: 自动包含 tenant_id
CREATE INDEX idx_workflows_tenant ON workflows(tenant_id);
CREATE INDEX idx_workflows_status ON workflows(tenant_id, status);
```

### 4.2 Agent 记忆存储

```sql
-- 记忆条目表
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(100) NOT NULL,
  memory_type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB NOT NULL DEFAULT '{}',
  associations TEXT[] DEFAULT '{}',
  access_level VARCHAR(50) DEFAULT 'private',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 向量索引
CREATE INDEX idx_memories_embedding ON agent_memories 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 检索优化索引
CREATE INDEX idx_memories_agent_type ON agent_memories(agent_id, memory_type);
CREATE INDEX idx_memories_importance ON agent_memories 
  USING btree ((metadata->>'importance'::numeric));
```

---

## 五、API 设计

### 5.1 多租户 API

```typescript
// 租户管理 API
POST   /api/v1/tenants                    // 创建租户
GET    /api/v1/tenants/:id                // 获取租户
PATCH  /api/v1/tenants/:id                // 更新租户
DELETE /api/v1/tenants/:id                // 删除租户
GET    /api/v1/tenants/:id/quota          // 获取配额
GET    /api/v1/tenants/:id/usage          // 获取用量
POST   /api/v1/tenants/:id/members        // 添加成员
DELETE /api/v1/tenants/:id/members/:uid   // 移除成员

// 认证 API
POST   /api/v1/auth/login                 // 登录
POST   /api/v1/auth/sso/connect           // SSO 连接
POST   /api/v1/auth/sso/callback          // SSO 回调
POST   /api/v1/auth/logout                // 登出
```

### 5.2 Agent 决策 API

```typescript
// 任务规划 API
POST   /api/v1/tasks/plan                 // 创建任务规划
GET    /api/v1/tasks/:id/plan             // 获取任务计划
POST   /api/v1/tasks/:id/execute          // 执行任务
GET    /api/v1/tasks/:id/status           // 获取执行状态
POST   /api/v1/tasks/:id/adjust            // 调整计划
POST   /api/v1/tasks/:id/cancel            // 取消任务

// Agent 注册 API
GET    /api/v1/agents                     // 列出 Agent
POST   /api/v1/agents/register            // 注册 Agent
GET    /api/v1/agents/:id                 // 获取 Agent 信息
PATCH  /api/v1/agents/:id                 // 更新 Agent
DELETE /api/v1/agents/:id                 // 注销 Agent
```

### 5.3 记忆系统 API

```typescript
// 记忆 API
POST   /api/v1/memories                   // 存储记忆
GET    /api/v1/memories                   // 检索记忆
GET    /api/v1/memories/:id               // 获取单条记忆
PATCH  /api/v1/memories/:id               // 更新记忆
DELETE /api/v1/memories/:id               // 删除记忆
POST   /api/v1/memories/migrate           // 迁移记忆
POST   /api/v1/memories/prune             // 清理低价值记忆

// 参数
// GET /api/v1/memories?type=long-term&agentId=xxx&limit=10
```

### 5.4 工作流 API

```typescript
// 工作流 CRUD
POST   /api/v1/workflows                   // 创建工作流
GET    /api/v1/workflows                   // 列出工作流
GET    /api/v1/workflows/:id               // 获取工作流
PATCH  /api/v1/workflows/:id               // 更新工作流
DELETE /api/v1/workflows/:id               // 删除工作流

// 工作流执行
POST   /api/v1/workflows/:id/execute       // 执行工作流
GET    /api/v1/workflows/:id/instances    // 列出执行实例
GET    /api/v1/workflows/instances/:iid    // 获取执行实例
POST   /api/v1/workflows/instances/:iid/pause    // 暂停
POST   /api/v1/workflows/instances/:iid/resume   // 恢复
POST   /api/v1/workflows/instances/:iid/cancel  // 取消

// 模板 API
GET    /api/v1/workflow-templates         // 列出模板
POST   /api/v1/workflow-templates         // 创建模板
GET    /api/v1/workflow-templates/:id     // 获取模板
POST   /api/v1/workflow-templates/:id/duplicate // 复制模板
```

---

## 六、文件结构规划

```
src/lib/
├── multi-tenant/                    # 🆕 多租户系统 (Phase 1)
│   ├── TenantManager.ts
│   ├── TenantContext.ts
│   ├── data-isolation/
│   │   ├── RowLevelIsolation.ts
│   │   └── SchemaIsolation.ts
│   ├── auth/
│   │   ├── TenantAuth.ts
│   │   ├── SSOAuth.ts
│   │   └── LDAPAuth.ts
│   ├── quota/
│   │   ├── QuotaManager.ts
│   │   └── ResourceLimiter.ts
│   ├── billing/
│   │   ├── BillingService.ts
│   │   └── InvoiceGenerator.ts
│   ├── middleware/
│   │   └── TenantMiddleware.ts
│   └── index.ts
│
├── agents/
│   ├── AgentRegistry.ts            # 已有
│   ├── decision/                    # 🆕 决策引擎 (Phase 2)
│   │   ├── DecisionEngine.ts
│   │   ├── TaskAnalyzer.ts
│   │   ├── Planner.ts
│   │   ├── RiskAssessor.ts
│   │   ├── PathSelector.ts
│   │   ├── ExecutionMonitor.ts
│   │   └── types.ts
│   ├── memory/                      # 🆕 记忆系统 (Phase 2)
│   │   ├── MemorySystem.ts
│   │   ├── WorkingMemory.ts
│   │   ├── ShortTermMemory.ts
│   │   ├── LongTermMemory.ts
│   │   ├── MemoryStore.ts
│   │   ├── MemoryRetrieval.ts
│   │   ├── ForgettingCurve.ts
│   │   └── types.ts
│   └── index.ts
│
├── workflow/                        # 🆕 工作流增强 (Phase 3)
│   ├── engine/
│   │   ├── WorkflowEngine.ts
│   │   ├── NodeExecutor.ts
│   │   └── ExecutionContext.ts
│   ├── nodes/
│   │   ├── NodeRegistry.ts
│   │   ├── types.ts
│   │   └── implementations/
│   │       ├── StartNode.ts
│   │       ├── EndNode.ts
│   │       ├── AgentNode.ts
│   │       ├── ConditionNode.ts
│   │       ├── LoopNode.ts
│   │       ├── ParallelNode.ts
│   │       ├── SubprocessNode.ts
│   │       ├── HumanApprovalNode.ts
│   │       └── WebhookNode.ts
│   ├── canvas/
│   │   ├── WorkflowCanvas.ts
│   │   ├── NodeRenderer.ts
│   │   └── EdgeRenderer.ts
│   └── templates/
│       ├── TemplateRegistry.ts
│       └── builtins/
│           ├── code-review.ts
│           ├── bug-fix.ts
│           └── content-creation.ts
│
├── performance/
│   ├── optimizer/                   # 🆕 性能优化 (Phase 4)
│   │   ├── PerformanceOptimizer.ts
│   │   ├── RequestPreWarmer.ts
│   │   ├── IntelligentCache.ts
│   │   └── ConnectionPool.ts
│   ├── scheduler/
│   │   ├── ResourceScheduler.ts
│   │   └── LoadBalancer.ts
│   └── profiling/
│       ├── Profiler.ts
│       └── TraceCollector.ts
│
├── a2a/                             # 已有
├── ai/                              # 已有
├── multi-agent/                      # 已有
├── monitoring/                      # 已有
└── utils/                           # 已有
```

---

## 七、实施计划

### 7.1 阶段划分

| Phase | 功能模块 | 时间 | 优先级 |
|-------|----------|------|--------|
| **Phase 1** | Multi-tenant 多租户系统 | Week 1-4 | P0 |
| **Phase 2** | Agent 决策引擎 + 记忆系统 | Week 3-7 | P0 |
| **Phase 3** | 工作流编排增强 | Week 5-9 | P1 |
| **Phase 4** | 性能极致优化 | Week 8-11 | P2 |

### 7.2 关键里程碑

| Milestone | 交付内容 | 日期 | 验收标准 |
|-----------|----------|------|----------|
| **M1** | 多租户核心 API + 数据隔离 | 2026-04-28 | 租户 CRUD 通过 |
| **M2** | Agent 决策引擎 Alpha | 2026-05-12 | 决策准确率 > 80% |
| **M3** | Agent 记忆系统 | 2026-05-19 | 跨会话记忆保持 |
| **M4** | 工作流新节点 (Condition/Loop/Parallel) | 2026-06-02 | 模板测试通过 |
| **M5** | 性能优化完成 | 2026-06-23 | P95 < 10ms |
| **M6** | v1.11.0 Release | 2026-07-01 | 全功能集成测试通过 |

---

## 八、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 多租户数据隔离漏洞 | 低 | 高 | 严格的代码审查 + 自动化测试 |
| Agent 决策准确率不达标 | 中 | 中 | 多轮迭代 + 人工干预点 |
| 性能优化效果不达预期 | 中 | 中 | 渐进式优化 + 基准测试 |
| 工作流复杂度过高 | 中 | 低 | 模块化设计 + 简化路径 |

---

**文档状态**: ✅ 架构设计完成  
**下一步**: 技术方案细化 → 原型开发 → 集成测试  
**预计完成**: 2026-04-07