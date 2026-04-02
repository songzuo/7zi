# AI Agent 学习优化系统架构设计

> **文档版本**: v1.0.0  
> **创建日期**: 2026-03-29  
> **设计者**: 🌟 智能体世界专家 + 📚 咨询师  
> **目标版本**: v1.5.0

---

## 一、概述

### 1.1 背景

v1.5.0 路线图要求为 AI Agent 添加自我学习能力，让系统能从历史交互中学习并优化性能。当前系统缺乏：

- **决策记录机制** - 无法追踪 Agent 的决策过程和结果
- **模式分析能力** - 无法从历史数据中提取成功模式
- **自适应优化** - 无法根据历史经验调整策略

### 1.2 设计目标

| 目标         | 描述                                 | 优先级 |
| ------------ | ------------------------------------ | ------ |
| **决策记录** | 完整记录每次决策的上下文、过程和结果 | P0     |
| **模式提取** | 自动分析历史数据，提取成功/失败模式  | P0     |
| **性能基准** | 建立各任务类型的性能基准线           | P0     |
| **智能优化** | 根据历史数据自动调整决策策略         | P1     |
| **反馈循环** | 支持用户反馈驱动优化                 | P1     |
| **隐私保护** | 确保学习数据的安全和隐私             | P0     |

### 1.3 学习闭环

```
┌─────────────────────────────────────────────────────────────┐
│                    学习优化闭环                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     ┌──────────┐                                            │
│     │  记录    │ ← 捕获决策事件                              │
│     │ Record   │                                            │
│     └────┬─────┘                                            │
│          │                                                  │
│          ↓                                                  │
│     ┌──────────┐                                            │
│     │  存储    │ ← 持久化到数据库                            │
│     │  Store   │                                            │
│     └────┬─────┘                                            │
│          │                                                  │
│          ↓                                                  │
│     ┌──────────┐                                            │
│     │  分析    │ ← 提取模式、计算基准                        │
│     │ Analyze  │                                            │
│     └────┬─────┘                                            │
│          │                                                  │
│          ↓                                                  │
│     ┌──────────┐                                            │
│     │  优化    │ ← 调整策略、更新参数                        │
│     │ Optimize │                                            │
│     └────┬─────┘                                            │
│          │                                                  │
│          └────────────→ 应用于未来决策                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、系统架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Agent 学习优化系统架构                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     应用层 (Application Layer)                  │  │
│  │                                                                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │  │
│  │  │  API 路由   │  │  Dashboard  │  │  实时监控面板        │    │  │
│  │  │             │  │    UI       │  │                     │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                    ↓                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     服务层 (Service Layer)                      │  │
│  │                                                                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │  │
│  │  │  学习服务   │  │  分析服务   │  │  优化服务            │    │  │
│  │  │  Learning   │  │  Analytics  │  │  Optimization        │    │  │
│  │  │  Service    │  │  Service    │  │  Service             │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                    ↓                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     核心层 (Core Layer)                         │  │
│  │                                                                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │  │
│  │  │  决策记录器 │  │  模式提取器 │  │  优化执行器          │    │  │
│  │  │  Decision   │  │  Pattern    │  │  Optimizer           │    │  │
│  │  │  Recorder   │  │  Extractor  │  │                      │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘    │  │
│  │                                                                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │  │
│  │  │  特征工程   │  │  基准计算器 │  │  异常检测器          │    │  │
│  │  │  Feature    │  │  Baseline   │  │  Anomaly             │    │  │
│  │  │  Engineer   │  │  Calculator │  │  Detector            │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                    ↓                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     数据层 (Data Layer)                         │  │
│  │                                                                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │  │
│  │  │  决策存储   │  │  模式存储   │  │  基准存储            │    │  │
│  │  │  Decision   │  │  Pattern    │  │  Baseline            │    │  │
│  │  │  Store      │  │  Store      │  │  Store               │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘    │  │
│  │                                                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                  SQLite + JSON 混合存储                  │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 与现有系统集成

```
┌─────────────────────────────────────────────────────────────────────┐
│                    系统集成架构                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    现有系统组件                                │  │
│  │                                                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │  │
│  │  │ Agent 调度器  │  │ Agent 记忆   │  │ Agent 认证       │    │  │
│  │  │ (Scheduler)  │  │ (Memory)     │  │ (Auth)           │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            ↓           ↓           ↓               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    学习优化系统 (新增)                         │  │
│  │                                                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │  │
│  │  │ 决策记录     │  │ 模式分析     │  │ 策略优化         │    │  │
│  │  │              │  │              │  │                  │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  集成点:                                                            │
│  • 调度决策前后记录学习数据                                         │
│  • 记忆系统提供历史上下文                                           │
│  • 优化结果反馈给调度器                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、数据模型设计

### 3.1 核心数据结构

#### 3.1.1 决策事件 (DecisionEvent)

```typescript
/**
 * 决策事件 - 记录每次 Agent 决策
 */
interface DecisionEvent {
  // === 基础信息 ===
  id: string // UUID
  timestamp: Date // 决策时间
  agentId: string // Agent ID
  sessionId?: string // 会话 ID

  // === 任务信息 ===
  taskId?: string // 任务 ID (如果有)
  taskType: TaskType // 任务类型
  taskCategory: string // 任务分类

  // === 上下文 ===
  context: DecisionContext // 决策上下文

  // === 决策内容 ===
  decision: string // 决策描述
  decisionType: DecisionType // 决策类型
  alternatives?: Alternative[] // 备选方案

  // === 执行结果 ===
  result: DecisionResult // 结果状态
  outcome?: string // 结果描述

  // === 性能指标 ===
  metrics: DecisionMetrics // 性能数据

  // === 反馈 ===
  feedback?: DecisionFeedback // 用户/系统反馈

  // === 元数据 ===
  metadata: DecisionMetadata // 扩展元数据
}

/**
 * 决策上下文
 */
interface DecisionContext {
  // 环境上下文
  environment: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
    dayOfWeek: number // 0-6
    workload: 'low' | 'medium' | 'high'
    systemLoad: number // 0-1
  }

  // Agent 状态
  agentState: {
    load: number // 当前负载 0-1
    recentSuccessRate: number // 近期成功率
    activeTasks: number // 活跃任务数
    availableCapacity: number // 可用容量
  }

  // 相关记忆
  relevantMemories?: string[] // 相关记忆 ID

  // 历史决策参考
  similarPastDecisions?: string[] // 相似历史决策 ID

  // 用户偏好 (如果有)
  userPreferences?: Record<string, any>

  // 约束条件
  constraints?: {
    deadline?: Date
    budget?: number
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    requiredCapabilities?: string[]
  }
}

/**
 * 决策类型
 */
enum DecisionType {
  TASK_ASSIGNMENT = 'task_assignment', // 任务分配
  RESOURCE_ALLOCATION = 'resource_allocation', // 资源分配
  STRATEGY_SELECTION = 'strategy_selection', // 策略选择
  PRIORITY_ADJUSTMENT = 'priority_adjustment', // 优先级调整
  ERROR_HANDLING = 'error_handling', // 错误处理
  SCALING = 'scaling', // 扩缩容
  COLLABORATION = 'collaboration', // 协作决策
  OPTIMIZATION = 'optimization', // 优化决策
}

/**
 * 决策结果
 */
enum DecisionResult {
  SUCCESS = 'success', // 成功
  PARTIAL = 'partial', // 部分成功
  FAILURE = 'failure', // 失败
  TIMEOUT = 'timeout', // 超时
  CANCELLED = 'cancelled', // 取消
  PENDING = 'pending', // 待定
}

/**
 * 决策指标
 */
interface DecisionMetrics {
  // 时间指标
  duration: number // 决策到执行完成的时间 (ms)
  decisionTime: number // 决策耗时 (ms)
  executionTime: number // 执行耗时 (ms)

  // 资源指标
  resourceUsage: number // 资源使用量 (0-1)
  tokenUsage?: number // Token 使用量
  apiCalls?: number // API 调用次数

  // 质量指标
  outputQuality: number // 输出质量评分 (0-1)
  accuracy?: number // 准确率
  completeness?: number // 完整性

  // 效率指标
  efficiency: number // 效率评分 (0-1)
  costEffectiveness?: number // 成本效益
}

/**
 * 决策反馈
 */
interface DecisionFeedback {
  // 评分
  rating: number // 1-5 星评分
  score?: number // 0-100 评分

  // 反馈类型
  type: 'user' | 'system' | 'automated'

  // 反馈内容
  comment?: string // 评语
  tags?: string[] // 标签

  // 改进建议
  suggestions?: string[] // 改进建议

  // 时间
  timestamp: Date

  // 提供者
  providedBy?: string // 提供者 ID
}

/**
 * 决策元数据
 */
interface DecisionMetadata {
  // 版本信息
  version: string // 系统版本
  modelVersion?: string // 模型版本

  // 置信度
  confidence: number // 决策置信度 (0-1)

  // 学习标记
  usedForTraining: boolean // 是否用于训练
  patternExtracted: boolean // 是否已提取模式

  // 关联
  relatedDecisions?: string[] // 关联决策
  parentDecision?: string // 父决策 (子决策场景)

  // 标签
  tags: string[] // 自定义标签

  // 扩展
  custom?: Record<string, any> // 自定义字段
}

/**
 * 备选方案
 */
interface Alternative {
  id: string
  description: string
  score: number // 评分
  reason: string // 未选择原因
  metadata?: Record<string, any>
}
```

#### 3.1.2 学习模式 (LearningPattern)

```typescript
/**
 * 学习模式 - 提取的成功/失败模式
 */
interface LearningPattern {
  // === 基础信息 ===
  id: string // UUID
  createdAt: Date
  updatedAt: Date

  // === 模式定义 ===
  name: string // 模式名称
  description: string // 模式描述
  type: PatternType // 模式类型

  // === 适用范围 ===
  scope: {
    taskTypes: TaskType[] // 适用任务类型
    agentRoles?: AgentRole[] // 适用 Agent 角色
    conditions?: PatternCondition[] // 应用条件
  }

  // === 模式内容 ===
  pattern: {
    // 特征
    features: PatternFeature[]

    // 规则
    rules: PatternRule[]

    // 权重
    weights: Record<string, number>

    // 参数
    parameters: Record<string, any>
  }

  // === 统计数据 ===
  statistics: {
    sampleSize: number // 样本数量
    successCount: number // 成功次数
    failureCount: number // 失败次数
    successRate: number // 成功率

    avgDuration: number // 平均耗时
    avgQuality: number // 平均质量

    lastApplied: Date // 最后应用时间
    applicationCount: number // 应用次数
  }

  // === 置信度 ===
  confidence: number // 模式置信度 (0-1)
  significance: number // 统计显著性

  // === 验证状态 ===
  validation: {
    status: 'unvalidated' | 'validated' | 'deprecated'
    validatedAt?: Date
    validatedBy?: string
    validationScore?: number
  }

  // === 元数据 ===
  metadata: {
    source: 'automated' | 'manual' // 来源
    version: string
    tags: string[]
    notes?: string
  }
}

/**
 * 模式类型
 */
enum PatternType {
  SUCCESS = 'success', // 成功模式
  FAILURE = 'failure', // 失败模式
  OPTIMIZATION = 'optimization', // 优化模式
  ANTI_PATTERN = 'anti_pattern', // 反模式
  BEST_PRACTICE = 'best_practice', // 最佳实践
}

/**
 * 模式条件
 */
interface PatternCondition {
  field: string // 字段路径
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches'
  value: any
  weight?: number // 条件权重
}

/**
 * 模式特征
 */
interface PatternFeature {
  name: string // 特征名称
  type: 'numeric' | 'categorical' | 'boolean' | 'text'
  importance: number // 特征重要性 (0-1)
  distribution?: {
    mean?: number
    std?: number
    median?: number
    categories?: Record<string, number>
  }
}

/**
 * 模式规则
 */
interface PatternRule {
  id: string
  condition: string // 条件表达式
  action: string // 执行动作
  priority: number // 优先级
  confidence: number // 规则置信度
}
```

#### 3.1.3 性能基准 (PerformanceBaseline)

```typescript
/**
 * 性能基准 - 各任务类型的性能基准线
 */
interface PerformanceBaseline {
  // === 基础信息 ===
  id: string
  createdAt: Date
  updatedAt: Date

  // === 基准范围 ===
  scope: {
    taskType: TaskType // 任务类型
    taskCategory?: string // 任务分类
    agentRole?: AgentRole // Agent 角色 (可选)
  }

  // === 基准指标 ===
  metrics: {
    // 时间基准
    duration: {
      min: number
      max: number
      avg: number
      median: number
      p95: number // 95 分位
      p99: number // 99 分位
    }

    // 质量基准
    quality: {
      min: number
      max: number
      avg: number
      median: number
    }

    // 成功率基准
    successRate: number

    // 资源使用基准
    resourceUsage: {
      avg: number
      max: number
    }

    // 效率基准
    efficiency: {
      avg: number
      best: number
    }
  }

  // === 样本信息 ===
  sampleInfo: {
    size: number // 样本数量
    timeRange: {
      start: Date
      end: Date
    }
    dataQuality: number // 数据质量评分
  }

  // === 趋势分析 ===
  trends?: {
    durationTrend: 'improving' | 'stable' | 'degrading'
    qualityTrend: 'improving' | 'stable' | 'degrading'
    successRateTrend: 'improving' | 'stable' | 'degrading'
  }

  // === 对比基准 ===
  comparison?: {
    previousPeriod?: PerformanceBaseline
    improvement?: {
      duration: number // 改善百分比
      quality: number
      successRate: number
    }
  }
}
```

#### 3.1.4 优化建议 (OptimizationSuggestion)

```typescript
/**
 * 优化建议 - 基于分析生成的优化建议
 */
interface OptimizationSuggestion {
  // === 基础信息 ===
  id: string
  createdAt: Date

  // === 建议内容 ===
  title: string
  description: string
  type: OptimizationType

  // === 适用范围 ===
  scope: {
    taskTypes?: TaskType[]
    agentIds?: string[]
    priority: 'low' | 'medium' | 'high'
  }

  // === 影响分析 ===
  impact: {
    expectedImprovement: number // 预期改善 (百分比)
    confidence: number // 置信度
    affectedMetrics: string[] // 影响的指标
    riskLevel: 'low' | 'medium' | 'high'
  }

  // === 实施建议 ===
  implementation: {
    steps: ImplementationStep[]
    estimatedEffort: string // 'low' | 'medium' | 'high'
    prerequisites?: string[]
  }

  // === 状态 ===
  status: 'pending' | 'approved' | 'implemented' | 'rejected'
  approvedBy?: string
  approvedAt?: Date
  implementedAt?: Date

  // === 效果追踪 ===
  results?: {
    actualImprovement?: number
    metrics?: Record<string, number>
    feedback?: string
  }

  // === 来源 ===
  source: {
    type: 'automated' | 'manual'
    basedOn: string[] // 基于的决策 ID 或模式 ID
    algorithm?: string // 使用的算法
  }
}

/**
 * 优化类型
 */
enum OptimizationType {
  PARAMETER_TUNING = 'parameter_tuning', // 参数调优
  STRATEGY_CHANGE = 'strategy_change', // 策略变更
  RESOURCE_REALLOCATION = 'resource_reallocation', // 资源重分配
  PROCESS_IMPROVEMENT = 'process_improvement', // 流程改进
  CAPABILITY_ENHANCEMENT = 'capability_enhancement', // 能力增强
  ERROR_PREVENTION = 'error_prevention', // 错误预防
}

/**
 * 实施步骤
 */
interface ImplementationStep {
  order: number
  action: string
  details?: string
  automated: boolean // 是否可自动化
}
```

### 3.2 数据库 Schema (SQLite)

```sql
-- ============================================================================
-- 决策事件表
-- ============================================================================
CREATE TABLE decision_events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  session_id TEXT,

  -- 任务信息
  task_id TEXT,
  task_type TEXT NOT NULL,
  task_category TEXT NOT NULL,

  -- 决策内容
  decision TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  alternatives TEXT,  -- JSON

  -- 结果
  result TEXT NOT NULL,
  outcome TEXT,

  -- 上下文 (JSON)
  context TEXT NOT NULL,

  -- 指标 (JSON)
  metrics TEXT NOT NULL,

  -- 反馈 (JSON)
  feedback TEXT,

  -- 元数据 (JSON)
  metadata TEXT NOT NULL,

  -- 索引字段
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_decisions_agent ON decision_events(agent_id);
CREATE INDEX idx_decisions_task_type ON decision_events(task_type);
CREATE INDEX idx_decisions_result ON decision_events(result);
CREATE INDEX idx_decisions_timestamp ON decision_events(timestamp);
CREATE INDEX idx_decisions_session ON decision_events(session_id);

-- ============================================================================
-- 学习模式表
-- ============================================================================
CREATE TABLE learning_patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,

  -- 适用范围 (JSON)
  scope TEXT NOT NULL,

  -- 模式内容 (JSON)
  pattern TEXT NOT NULL,

  -- 统计数据 (JSON)
  statistics TEXT NOT NULL,

  -- 置信度和验证
  confidence REAL NOT NULL,
  significance REAL,
  validation_status TEXT DEFAULT 'unvalidated',
  validated_at TEXT,

  -- 元数据
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  version TEXT DEFAULT '1.0.0',
  tags TEXT,  -- JSON array
  notes TEXT
);

-- 索引
CREATE INDEX idx_patterns_type ON learning_patterns(type);
CREATE INDEX idx_patterns_confidence ON learning_patterns(confidence);
CREATE INDEX idx_patterns_validation ON learning_patterns(validation_status);

-- ============================================================================
-- 性能基准表
-- ============================================================================
CREATE TABLE performance_baselines (
  id TEXT PRIMARY KEY,

  -- 范围
  task_type TEXT NOT NULL,
  task_category TEXT,
  agent_role TEXT,

  -- 指标 (JSON)
  metrics TEXT NOT NULL,

  -- 样本信息 (JSON)
  sample_info TEXT NOT NULL,

  -- 趋势 (JSON)
  trends TEXT,

  -- 时间
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(task_type, task_category, agent_role)
);

-- 索引
CREATE INDEX idx_baselines_task_type ON performance_baselines(task_type);

-- ============================================================================
-- 优化建议表
-- ============================================================================
CREATE TABLE optimization_suggestions (
  id TEXT PRIMARY KEY,

  -- 内容
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,

  -- 范围 (JSON)
  scope TEXT NOT NULL,

  -- 影响分析 (JSON)
  impact TEXT NOT NULL,

  -- 实施建议 (JSON)
  implementation TEXT NOT NULL,

  -- 状态
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TEXT,
  implemented_at TEXT,

  -- 结果 (JSON)
  results TEXT,

  -- 来源 (JSON)
  source TEXT NOT NULL,

  -- 时间
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_suggestions_type ON optimization_suggestions(type);
CREATE INDEX idx_suggestions_status ON optimization_suggestions(status);
CREATE INDEX idx_suggestions_priority ON optimization_suggestions(
  json_extract(scope, '$.priority')
);

-- ============================================================================
-- 模式应用记录表
-- ============================================================================
CREATE TABLE pattern_applications (
  id TEXT PRIMARY KEY,
  pattern_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,

  -- 应用结果
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
  successful BOOLEAN,
  improvement REAL,  -- 改善程度

  -- 反馈
  feedback TEXT,

  FOREIGN KEY (pattern_id) REFERENCES learning_patterns(id),
  FOREIGN KEY (decision_id) REFERENCES decision_events(id)
);

-- 索引
CREATE INDEX idx_pattern_apps_pattern ON pattern_applications(pattern_id);
CREATE INDEX idx_pattern_apps_successful ON pattern_applications(successful);
```

### 3.3 文件存储结构

```
.openclaw/
├── learning/                          # 学习数据目录
│   ├── db/                            # 数据库
│   │   ├── learning.db                # 主数据库
│   │   └── backups/                   # 备份
│   │
│   ├── patterns/                      # 模式库 (JSON)
│   │   ├── success-patterns.json      # 成功模式
│   │   ├── failure-patterns.json      # 失败模式
│   │   └── best-practices.json        # 最佳实践
│   │
│   ├── baselines/                     # 基准数据 (JSON)
│   │   ├── task-baselines.json        # 任务基准
│   │   └── agent-baselines.json       # Agent 基准
│   │
│   ├── suggestions/                   # 优化建议 (JSON)
│   │   └── pending-suggestions.json   # 待处理建议
│   │
│   ├── exports/                       # 导出数据
│   │   ├── decisions-YYYY-MM-DD.json  # 决策导出
│   │   └── reports/                   # 报告
│   │
│   └── cache/                         # 缓存
│       ├── recent-decisions.json      # 最近决策缓存
│       └── pattern-cache.json         # 模式缓存
│
└── workspace/
    └── LEARNING_STATE.md              # 学习状态摘要 (可读)
```

---

## 四、核心组件设计

### 4.1 决策记录器 (DecisionRecorder)

```typescript
/**
 * 决策记录器 - 捕获和存储决策事件
 */
class DecisionRecorder {
  private store: DecisionStore
  private eventQueue: EventQueue
  private sanitizer: DataSanitizer

  /**
   * 记录决策开始
   */
  async recordDecisionStart(input: DecisionStartInput): Promise<string> {
    // 1. 生成决策 ID
    const decisionId = generateUUID()

    // 2. 捕获上下文
    const context = await this.captureContext(input)

    // 3. 创建决策事件
    const event: Partial<DecisionEvent> = {
      id: decisionId,
      timestamp: new Date(),
      agentId: input.agentId,
      sessionId: input.sessionId,
      taskType: input.taskType,
      taskCategory: input.taskCategory,
      context,
      decision: input.decision,
      decisionType: input.decisionType,
      result: DecisionResult.PENDING,
      metrics: {} as DecisionMetrics,
      metadata: this.createMetadata(input),
    }

    // 4. 数据脱敏
    const sanitized = this.sanitizer.sanitize(event)

    // 5. 异步存储
    await this.store.save(sanitized)

    return decisionId
  }

  /**
   * 记录决策结果
   */
  async recordDecisionResult(
    decisionId: string,
    result: DecisionResult,
    metrics: DecisionMetrics,
    feedback?: DecisionFeedback
  ): Promise<void> {
    // 1. 获取现有记录
    const existing = await this.store.get(decisionId)
    if (!existing) {
      throw new Error(`Decision ${decisionId} not found`)
    }

    // 2. 更新结果
    existing.result = result
    existing.metrics = metrics
    existing.feedback = feedback
    existing.updatedAt = new Date()

    // 3. 存储
    await this.store.update(decisionId, existing)

    // 4. 触发分析 (异步)
    this.eventQueue.publish('decision.completed', existing)
  }

  /**
   * 捕获决策上下文
   */
  private async captureContext(input: DecisionStartInput): Promise<DecisionContext> {
    return {
      environment: await this.getEnvironmentContext(),
      agentState: await this.getAgentState(input.agentId),
      relevantMemories: await this.findRelevantMemories(input),
      similarPastDecisions: await this.findSimilarDecisions(input),
      userPreferences: input.userPreferences,
      constraints: input.constraints,
    }
  }

  /**
   * 获取环境上下文
   */
  private async getEnvironmentContext(): Promise<EnvironmentContext> {
    const now = new Date()
    const hour = now.getHours()

    return {
      timeOfDay: this.categorizeTimeOfDay(hour),
      dayOfWeek: now.getDay(),
      workload: await this.assessSystemWorkload(),
      systemLoad: await this.getSystemLoad(),
    }
  }

  /**
   * 获取 Agent 状态
   */
  private async getAgentState(agentId: string): Promise<AgentStateContext> {
    // 从调度系统获取 Agent 状态
    const scheduler = getAgentScheduler()
    const agent = scheduler.getAgent(agentId)

    return {
      load: agent.currentLoad,
      recentSuccessRate: agent.stats.recentSuccessRate,
      activeTasks: agent.activeTaskCount,
      availableCapacity: agent.availableCapacity,
    }
  }
}

// 使用示例
const recorder = new DecisionRecorder()

// 记录决策开始
const decisionId = await recorder.recordDecisionStart({
  agentId: 'agent-001',
  taskType: TaskType.IMPLEMENTATION,
  taskCategory: 'backend',
  decision: 'Assign task to agent-002 for backend implementation',
  decisionType: DecisionType.TASK_ASSIGNMENT,
  constraints: {
    priority: 'high',
    deadline: new Date(Date.now() + 3600000),
  },
})

// 记录决策结果
await recorder.recordDecisionResult(
  decisionId,
  DecisionResult.SUCCESS,
  {
    duration: 5000,
    decisionTime: 100,
    executionTime: 4900,
    resourceUsage: 0.3,
    outputQuality: 0.95,
    efficiency: 0.9,
  },
  {
    rating: 5,
    type: 'automated',
    timestamp: new Date(),
  }
)
```

### 4.2 模式提取器 (PatternExtractor)

```typescript
/**
 * 模式提取器 - 从历史数据中提取模式
 */
class PatternExtractor {
  private store: DecisionStore
  private featureEngineer: FeatureEngineer
  private clusteringEngine: ClusteringEngine

  /**
   * 提取成功模式
   */
  async extractSuccessPatterns(
    taskType: TaskType,
    options?: ExtractionOptions
  ): Promise<LearningPattern[]> {
    // 1. 获取成功决策数据
    const successDecisions = await this.store.query({
      taskType,
      result: DecisionResult.SUCCESS,
      minQuality: options?.minQuality || 0.8,
      limit: options?.sampleSize || 1000,
    })

    if (successDecisions.length < 50) {
      console.warn('Insufficient data for pattern extraction')
      return []
    }

    // 2. 特征工程
    const features = await this.featureEngineer.extractFeatures(successDecisions)

    // 3. 聚类分析
    const clusters = await this.clusteringEngine.cluster(features)

    // 4. 提取模式
    const patterns: LearningPattern[] = []

    for (const cluster of clusters) {
      const pattern = await this.createPatternFromCluster(cluster, taskType, PatternType.SUCCESS)
      patterns.push(pattern)
    }

    // 5. 验证模式
    const validated = await this.validatePatterns(patterns, successDecisions)

    return validated
  }

  /**
   * 提取失败模式
   */
  async extractFailurePatterns(
    taskType: TaskType,
    options?: ExtractionOptions
  ): Promise<LearningPattern[]> {
    // 1. 获取失败决策数据
    const failureDecisions = await this.store.query({
      taskType,
      result: [DecisionResult.FAILURE, DecisionResult.TIMEOUT],
      limit: options?.sampleSize || 500,
    })

    if (failureDecisions.length < 30) {
      return []
    }

    // 2. 特征提取
    const features = await this.featureEngineer.extractFeatures(failureDecisions)

    // 3. 关联规则挖掘
    const rules = await this.mineAssociationRules(features)

    // 4. 创建模式
    const patterns: LearningPattern[] = []

    for (const rule of rules) {
      const pattern: LearningPattern = {
        id: generateUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        name: `Failure Pattern: ${rule.description}`,
        description: `Pattern that leads to failures: ${rule.description}`,
        type: PatternType.FAILURE,
        scope: {
          taskTypes: [taskType],
          conditions: rule.conditions,
        },
        pattern: {
          features: rule.features,
          rules: [
            {
              id: generateUUID(),
              condition: rule.condition,
              action: 'avoid',
              priority: rule.priority,
              confidence: rule.confidence,
            },
          ],
          weights: rule.weights,
          parameters: {},
        },
        statistics: {
          sampleSize: rule.support,
          successCount: 0,
          failureCount: rule.support,
          successRate: 0,
          avgDuration: rule.avgDuration,
          avgQuality: rule.avgQuality,
          lastApplied: new Date(),
          applicationCount: 0,
        },
        confidence: rule.confidence,
        significance: rule.significance,
        validation: {
          status: 'validated',
          validatedAt: new Date(),
          validationScore: rule.confidence,
        },
        metadata: {
          source: 'automated',
          version: '1.0.0',
          tags: ['failure', 'anti-pattern'],
          notes: 'Automatically extracted from failure data',
        },
      }

      patterns.push(pattern)
    }

    return patterns
  }

  /**
   * 从聚类创建模式
   */
  private async createPatternFromCluster(
    cluster: Cluster,
    taskType: TaskType,
    patternType: PatternType
  ): Promise<LearningPattern> {
    return {
      id: generateUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      name: `${patternType.toUpperCase()} Pattern for ${taskType}`,
      description: `Extracted from cluster with ${cluster.points.length} samples`,
      type: patternType,
      scope: {
        taskTypes: [taskType],
        conditions: this.extractConditionsFromCluster(cluster),
      },
      pattern: {
        features: cluster.features,
        rules: this.generateRulesFromCluster(cluster),
        weights: cluster.weights,
        parameters: cluster.parameters,
      },
      statistics: {
        sampleSize: cluster.points.length,
        successCount: cluster.successCount,
        failureCount: cluster.failureCount,
        successRate: cluster.successRate,
        avgDuration: cluster.avgDuration,
        avgQuality: cluster.avgQuality,
        lastApplied: new Date(),
        applicationCount: 0,
      },
      confidence: cluster.confidence,
      significance: cluster.significance,
      validation: {
        status: 'unvalidated',
      },
      metadata: {
        source: 'automated',
        version: '1.0.0',
        tags: [patternType, taskType],
      },
    }
  }

  /**
   * 验证模式
   */
  private async validatePatterns(
    patterns: LearningPattern[],
    decisions: DecisionEvent[]
  ): Promise<LearningPattern[]> {
    const validated: LearningPattern[] = []

    for (const pattern of patterns) {
      // 1. 计算模式在测试数据上的准确率
      const accuracy = await this.evaluatePattern(pattern, decisions)

      // 2. 计算统计显著性
      const significance = this.calculateSignificance(pattern)

      // 3. 更新验证状态
      if (accuracy >= 0.7 && significance >= 0.8) {
        pattern.validation = {
          status: 'validated',
          validatedAt: new Date(),
          validationScore: accuracy,
        }
        validated.push(pattern)
      } else {
        pattern.validation = {
          status: 'unvalidated',
          validationScore: accuracy,
        }
        // 仍然保留，但标记为需要验证
        validated.push(pattern)
      }
    }

    return validated
  }

  /**
   * 评估模式准确率
   */
  private async evaluatePattern(
    pattern: LearningPattern,
    decisions: DecisionEvent[]
  ): Promise<number> {
    let correct = 0
    let total = 0

    for (const decision of decisions) {
      if (this.matchesPattern(decision, pattern)) {
        total++

        // 检查结果是否符合模式
        if (pattern.type === PatternType.SUCCESS && decision.result === DecisionResult.SUCCESS) {
          correct++
        } else if (
          pattern.type === PatternType.FAILURE &&
          decision.result !== DecisionResult.SUCCESS
        ) {
          correct++
        }
      }
    }

    return total > 0 ? correct / total : 0
  }

  /**
   * 挖掘关联规则
   */
  private async mineAssociationRules(features: Feature[]): Promise<AssociationRule[]> {
    // 使用 Apriori 算法或 FP-Growth
    const miner = new AprioriMiner({
      minSupport: 0.1,
      minConfidence: 0.7,
    })

    const rules = await miner.mine(features)

    return rules
  }
}
```

### 4.3 基准计算器 (BaselineCalculator)

```typescript
/**
 * 基准计算器 - 计算和更新性能基准
 */
class BaselineCalculator {
  private store: DecisionStore
  private baselineStore: BaselineStore

  /**
   * 计算任务类型基准
   */
  async calculateBaseline(
    taskType: TaskType,
    options?: BaselineOptions
  ): Promise<PerformanceBaseline> {
    // 1. 获取历史决策数据
    const decisions = await this.store.query({
      taskType,
      startDate: options?.startDate,
      endDate: options?.endDate,
      minSampleSize: 30,
    })

    if (decisions.length < 30) {
      throw new Error('Insufficient data for baseline calculation')
    }

    // 2. 计算持续时间指标
    const durationMetrics = this.calculateDurationMetrics(decisions)

    // 3. 计算质量指标
    const qualityMetrics = this.calculateQualityMetrics(decisions)

    // 4. 计算成功率
    const successRate = this.calculateSuccessRate(decisions)

    // 5. 计算资源使用指标
    const resourceMetrics = this.calculateResourceMetrics(decisions)

    // 6. 计算效率指标
    const efficiencyMetrics = this.calculateEfficiencyMetrics(decisions)

    // 7. 分析趋势
    const trends = this.analyzeTrends(decisions)

    // 8. 创建基准
    const baseline: PerformanceBaseline = {
      id: generateUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      scope: {
        taskType,
      },
      metrics: {
        duration: durationMetrics,
        quality: qualityMetrics,
        successRate,
        resourceUsage: resourceMetrics,
        efficiency: efficiencyMetrics,
      },
      sampleInfo: {
        size: decisions.length,
        timeRange: {
          start: new Date(Math.min(...decisions.map(d => d.timestamp.getTime()))),
          end: new Date(Math.max(...decisions.map(d => d.timestamp.getTime()))),
        },
        dataQuality: this.assessDataQuality(decisions),
      },
      trends,
    }

    // 9. 存储基准
    await this.baselineStore.save(baseline)

    return baseline
  }

  /**
   * 计算持续时间指标
   */
  private calculateDurationMetrics(decisions: DecisionEvent[]): DurationMetrics {
    const durations = decisions.map(d => d.metrics.duration).sort((a, b) => a - b)

    return {
      min: durations[0],
      max: durations[durations.length - 1],
      avg: this.mean(durations),
      median: this.median(durations),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
    }
  }

  /**
   * 计算成功率
   */
  private calculateSuccessRate(decisions: DecisionEvent[]): number {
    const success = decisions.filter(d => d.result === DecisionResult.SUCCESS).length
    return success / decisions.length
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(decisions: DecisionEvent[]): TrendAnalysis {
    // 按时间排序
    const sorted = [...decisions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // 分段比较 (前半 vs 后半)
    const mid = Math.floor(sorted.length / 2)
    const firstHalf = sorted.slice(0, mid)
    const secondHalf = sorted.slice(mid)

    const firstAvgDuration = this.mean(firstHalf.map(d => d.metrics.duration))
    const secondAvgDuration = this.mean(secondHalf.map(d => d.metrics.duration))

    const firstSuccessRate = this.calculateSuccessRate(firstHalf)
    const secondSuccessRate = this.calculateSuccessRate(secondHalf)

    return {
      durationTrend: this.compareTrend(firstAvgDuration, secondAvgDuration, 'lower_is_better'),
      qualityTrend: 'stable', // 简化处理
      successRateTrend: this.compareTrend(firstSuccessRate, secondSuccessRate, 'higher_is_better'),
    }
  }

  /**
   * 比较趋势
   */
  private compareTrend(
    first: number,
    second: number,
    direction: 'higher_is_better' | 'lower_is_better'
  ): 'improving' | 'stable' | 'degrading' {
    const threshold = 0.05 // 5% 阈值
    const change = (second - first) / Math.abs(first)

    if (Math.abs(change) < threshold) {
      return 'stable'
    }

    if (direction === 'higher_is_better') {
      return change > 0 ? 'improving' : 'degrading'
    } else {
      return change < 0 ? 'improving' : 'degrading'
    }
  }
}
```

### 4.4 优化执行器 (OptimizationExecutor)

```typescript
/**
 * 优化执行器 - 执行优化建议
 */
class OptimizationExecutor {
  private patternStore: PatternStore
  private baselineStore: BaselineStore
  private scheduler: AgentScheduler

  /**
   * 应用学习模式
   */
  async applyPattern(
    pattern: LearningPattern,
    context: DecisionContext
  ): Promise<PatternApplicationResult> {
    // 1. 检查模式是否适用
    if (!this.isPatternApplicable(pattern, context)) {
      return {
        success: false,
        reason: 'Pattern not applicable to current context',
      }
    }

    // 2. 提取优化参数
    const optimizations = this.extractOptimizations(pattern)

    // 3. 应用优化
    const results: Record<string, any> = {}

    for (const opt of optimizations) {
      try {
        const result = await this.applyOptimization(opt, context)
        results[opt.id] = result
      } catch (error) {
        console.error(`Failed to apply optimization ${opt.id}:`, error)
        results[opt.id] = { success: false, error }
      }
    }

    // 4. 记录应用
    await this.recordApplication(pattern.id, results)

    return {
      success: true,
      results,
    }
  }

  /**
   * 调整 Prompt
   */
  adjustPrompt(basedOn: LearningPattern[]): string {
    // 1. 提取模式中的关键信息
    const keyPoints = basedOn.flatMap(p => this.extractKeyPointsFromPattern(p))

    // 2. 生成上下文提示
    const contextPrompt = this.generateContextPrompt(keyPoints)

    // 3. 添加约束条件
    const constraints = basedOn.flatMap(p => this.extractConstraintsFromPattern(p))

    return `
Based on historical analysis, consider the following:

${contextPrompt}

Key constraints:
${constraints.map(c => `- ${c}`).join('\n')}

Optimization tips:
${this.generateOptimizationTips(basedOn)}
    `.trim()
  }

  /**
   * 选择最佳策略
   */
  selectStrategy(task: Task): Strategy {
    // 1. 查找相关模式
    const patterns = await this.patternStore.findByTaskType(task.type)

    // 2. 评估每个模式的适用性
    const candidates = patterns
      .map(p => ({
        pattern: p,
        score: this.evaluatePatternForTask(p, task),
      }))
      .filter(c => c.score > 0.5)
      .sort((a, b) => b.score - a.score)

    // 3. 选择最佳模式
    if (candidates.length > 0) {
      const best = candidates[0]
      return {
        id: generateUUID(),
        patternId: best.pattern.id,
        name: best.pattern.name,
        description: best.pattern.description,
        confidence: best.score,
        parameters: best.pattern.pattern.parameters,
      }
    }

    // 4. 没有适用模式，返回默认策略
    return this.getDefaultStrategy(task)
  }

  /**
   * 动态调整参数
   */
  tuneParameters(metrics: Metrics): Parameters {
    // 1. 获取当前基准
    const baseline = await this.baselineStore.getByTaskType(metrics.taskType)

    // 2. 比较当前性能与基准
    const comparison = this.compareWithBaseline(metrics, baseline)

    // 3. 调整参数
    const adjustments: Record<string, any> = {}

    // 超时调整
    if (comparison.duration > baseline.metrics.duration.p95) {
      adjustments.timeout = baseline.metrics.duration.p95 * 1.2
    }

    // 重试调整
    if (comparison.successRate < baseline.metrics.successRate * 0.9) {
      adjustments.maxRetries = 3
      adjustments.retryDelay = 1000
    }

    // 资源调整
    if (comparison.resourceUsage > baseline.metrics.resourceUsage.max * 0.9) {
      adjustments.maxConcurrency = Math.floor(1 / baseline.metrics.resourceUsage.avg)
    }

    return adjustments
  }

  /**
   * 应用优化
   */
  private async applyOptimization(
    opt: Optimization,
    context: DecisionContext
  ): Promise<OptimizationResult> {
    switch (opt.type) {
      case 'parameter_tuning':
        return this.tuneParameters(opt.parameters)

      case 'strategy_change':
        return this.changeStrategy(opt.strategy)

      case 'resource_reallocation':
        return this.reallocateResources(opt.resources)

      default:
        throw new Error(`Unknown optimization type: ${opt.type}`)
    }
  }
}
```

### 4.5 学习管理器 (LearningManager)

```typescript
/**
 * 学习管理器 - 协调所有学习组件
 */
class LearningManager {
  private recorder: DecisionRecorder
  private extractor: PatternExtractor
  private calculator: BaselineCalculator
  private executor: OptimizationExecutor
  private scheduler: AgentScheduler

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    // 初始化各组件
    await this.recorder.initialize()
    await this.extractor.initialize()
    await this.calculator.initialize()
    await this.executor.initialize()

    // 设置调度器集成
    this.setupSchedulerIntegration()

    // 启动定期学习任务
    this.startPeriodicTasks()
  }

  /**
   * 设置调度器集成
   */
  private setupSchedulerIntegration(): void {
    // 监听决策事件
    this.scheduler.on('decision.start', async (data: DecisionStartData) => {
      await this.recorder.recordDecisionStart(data)
    })

    this.scheduler.on('decision.complete', async (data: DecisionCompleteData) => {
      await this.recorder.recordDecisionResult(
        data.decisionId,
        data.result,
        data.metrics,
        data.feedback
      )

      // 触发增量学习
      await this.incrementalLearn(data.decisionId)
    })
  }

  /**
   * 增量学习
   */
  private async incrementalLearn(decisionId: string): Promise<void> {
    // 获取决策详情
    const decision = await this.recorder.getDecision(decisionId)

    // 如果是重要决策，触发模式更新
    if (decision.metadata.importance > 7) {
      await this.extractor.extractSuccessPatterns(decision.taskType, { incremental: true })
    }
  }

  /**
   * 定期学习任务
   */
  private startPeriodicTasks(): void {
    // 每天午夜提取模式
    setInterval(
      async () => {
        await this.dailyPatternExtraction()
      },
      24 * 60 * 60 * 1000
    )

    // 每周更新基准
    setInterval(
      async () => {
        await this.weeklyBaselineUpdate()
      },
      7 * 24 * 60 * 60 * 1000
    )

    // 每月生成优化建议
    setInterval(
      async () => {
        await this.monthlyOptimizationReport()
      },
      30 * 24 * 60 * 60 * 1000
    )
  }

  /**
   * 每日模式提取
   */
  private async dailyPatternExtraction(): Promise<void> {
    const taskTypes = Object.values(TaskType)

    for (const taskType of taskTypes) {
      try {
        await this.extractor.extractSuccessPatterns(taskType)
        await this.extractor.extractFailurePatterns(taskType)
      } catch (error) {
        console.error(`Failed to extract patterns for ${taskType}:`, error)
      }
    }
  }

  /**
   * 获取学习状态
   */
  async getLearningStatus(): Promise<LearningStatus> {
    return {
      totalDecisions: await this.recorder.count(),
      totalPatterns: await this.extractor.count(),
      totalBaselines: await this.calculator.count(),
      lastPatternUpdate: await this.extractor.lastUpdate(),
      lastBaselineUpdate: await this.calculator.lastUpdate(),
      activeOptimizations: await this.executor.countActive(),
    }
  }
}
```

---

## 五、API 接口设计

### 5.1 REST API 端点

```typescript
// ============================================================================
// 决策记录 API
// ============================================================================

/**
 * 记录决策事件
 * POST /api/agent/learning/decisions
 */
interface RecordDecisionRequest {
  agentId: string
  sessionId?: string
  taskId?: string
  taskType: TaskType
  taskCategory: string
  decision: string
  decisionType: DecisionType
  context: DecisionContext
  alternatives?: Alternative[]
}

interface RecordDecisionResponse {
  success: boolean
  decisionId?: string
  error?: string
}

/**
 * 更新决策结果
 * PATCH /api/agent/learning/decisions/:id/result
 */
interface UpdateDecisionResultRequest {
  result: DecisionResult
  outcome?: string
  metrics: DecisionMetrics
  feedback?: DecisionFeedback
}

interface UpdateDecisionResultResponse {
  success: boolean
  patternUpdates?: {
    newPatterns: number
    updatedPatterns: number
  }
  error?: string
}

/**
 * 查询决策历史
 * GET /api/agent/learning/decisions
 */
interface QueryDecisionsRequest {
  agentId?: string
  taskType?: TaskType
  result?: DecisionResult
  startDate?: Date
  endDate?: Date
  minQuality?: number
  limit?: number
  offset?: number
}

interface QueryDecisionsResponse {
  success: boolean
  data?: {
    decisions: DecisionEvent[]
    total: number
    hasMore: boolean
  }
  error?: string
}

// ============================================================================
// 学习模式 API
// ============================================================================

/**
 * 获取学习模式
 * GET /api/agent/learning/patterns
 */
interface GetPatternsRequest {
  taskType?: TaskType
  type?: PatternType
  minConfidence?: number
  limit?: number
}

interface GetPatternsResponse {
  success: boolean
  data?: {
    patterns: LearningPattern[]
    total: number
  }
  error?: string
}

/**
 * 手动创建模式
 * POST /api/agent/learning/patterns
 */
interface CreatePatternRequest {
  name: string
  description: string
  type: PatternType
  scope: {
    taskTypes: TaskType[]
    agentRoles?: AgentRole[]
    conditions?: PatternCondition[]
  }
  pattern: {
    features: PatternFeature[]
    rules: PatternRule[]
    weights: Record<string, number>
    parameters: Record<string, any>
  }
}

interface CreatePatternResponse {
  success: boolean
  patternId?: string
  error?: string
}

/**
 * 验证模式
 * POST /api/agent/learning/patterns/:id/validate
 */
interface ValidatePatternRequest {
  testDecisionIds?: string[]
}

interface ValidatePatternResponse {
  success: boolean
  validation?: {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
  }
  error?: string
}

// ============================================================================
// 性能基准 API
// ============================================================================

/**
 * 获取性能基准
 * GET /api/agent/learning/baselines
 */
interface GetBaselinesRequest {
  taskType?: TaskType
}

interface GetBaselinesResponse {
  success: boolean
  data?: {
    baselines: PerformanceBaseline[]
  }
  error?: string
}

/**
 * 计算新基准
 * POST /api/agent/learning/baselines/calculate
 */
interface CalculateBaselineRequest {
  taskType: TaskType
  taskCategory?: string
  agentRole?: AgentRole
  startDate?: Date
  endDate?: Date
}

interface CalculateBaselineResponse {
  success: boolean
  baseline?: PerformanceBaseline
  error?: string
}

// ============================================================================
// 优化建议 API
// ============================================================================

/**
 * 获取优化建议
 * GET /api/agent/learning/suggestions
 */
interface GetSuggestionsRequest {
  taskType?: TaskType
  status?: 'pending' | 'approved' | 'implemented' | 'rejected'
  priority?: 'low' | 'medium' | 'high'
  limit?: number
}

interface GetSuggestionsResponse {
  success: boolean
  data?: {
    suggestions: OptimizationSuggestion[]
    total: number
  }
  error?: string
}

/**
 * 生成优化建议
 * POST /api/agent/learning/suggestions/generate
 */
interface GenerateSuggestionsRequest {
  taskType?: TaskType
  focusAreas?: string[]
  minImpact?: number
}

interface GenerateSuggestionsResponse {
  success: boolean
  suggestions?: OptimizationSuggestion[]
  error?: string
}

/**
 * 批准优化建议
 * POST /api/agent/learning/suggestions/:id/approve
 */
interface ApproveSuggestionRequest {
  approvedBy: string
  notes?: string
}

interface ApproveSuggestionResponse {
  success: boolean
  error?: string
}

/**
 * 实施优化建议
 * POST /api/agent/learning/suggestions/:id/implement
 */
interface ImplementSuggestionRequest {
  automated?: boolean
}

interface ImplementSuggestionResponse {
  success: boolean
  results?: Record<string, any>
  error?: string
}

// ============================================================================
// 性能报告 API
// ============================================================================

/**
 * 获取性能报告
 * GET /api/agent/learning/report
 */
interface GetReportRequest {
  period: 'day' | 'week' | 'month' | 'quarter'
  taskType?: TaskType
  agentId?: string
}

interface GetReportResponse {
  success: boolean
  data?: PerformanceReport
  error?: string
}

/**
 * 性能报告结构
 */
interface PerformanceReport {
  period: {
    start: Date
    end: Date
  }

  summary: {
    totalDecisions: number
    successRate: number
    avgDuration: number
    avgQuality: number

    improvement: {
      duration: number // 相比上期改善
      quality: number
      successRate: number
    }
  }

  byTaskType: {
    taskType: TaskType
    decisions: number
    successRate: number
    avgDuration: number
    avgQuality: number
  }[]

  byAgent: {
    agentId: string
    agentName: string
    decisions: number
    successRate: number
    avgQuality: number
    topTaskTypes: TaskType[]
  }[]

  patterns: {
    applied: number
    successful: number
    newPatterns: number
    topPatterns: {
      id: string
      name: string
      applications: number
      successRate: number
    }[]
  }

  recommendations: string[]
}

// ============================================================================
// 学习状态 API
// ============================================================================

/**
 * 获取学习状态
 * GET /api/agent/learning/status
 */
interface GetLearningStatusResponse {
  success: boolean
  data?: {
    status: 'active' | 'paused' | 'error'
    lastUpdate: Date

    statistics: {
      totalDecisions: number
      totalPatterns: number
      totalBaselines: number
      activeOptimizations: number
    }

    health: {
      recorder: 'healthy' | 'degraded' | 'error'
      extractor: 'healthy' | 'degraded' | 'error'
      calculator: 'healthy' | 'degraded' | 'error'
      executor: 'healthy' | 'degraded' | 'error'
    }

    nextScheduledTasks: {
      patternExtraction: Date
      baselineUpdate: Date
      optimizationReport: Date
    }
  }
  error?: string
}

/**
 * 触发学习任务
 * POST /api/agent/learning/tasks
 */
interface TriggerLearningTaskRequest {
  task: 'pattern_extraction' | 'baseline_calculation' | 'optimization_generation'
  taskType?: TaskType
  force?: boolean
}

interface TriggerLearningTaskResponse {
  success: boolean
  taskId?: string
  estimatedDuration?: number
  error?: string
}
```

### 5.2 API 路由实现示例

```typescript
// app/api/agent/learning/decisions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getLearningManager } from '@/lib/learning'
import { authenticateRequest } from '@/lib/auth'

/**
 * POST /api/agent/learning/decisions
 * 记录决策事件
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 认证
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 解析请求
    const body = await request.json()
    const validation = validateRecordDecisionRequest(body)

    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
    }

    // 3. 记录决策
    const learningManager = getLearningManager()
    const decisionId = await learningManager.recorder.recordDecisionStart(body)

    // 4. 返回结果
    return NextResponse.json({
      success: true,
      decisionId,
    })
  } catch (error) {
    console.error('Failed to record decision:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/agent/learning/decisions
 * 查询决策历史
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 认证
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url)
    const query: QueryDecisionsRequest = {
      agentId: searchParams.get('agentId') || undefined,
      taskType: (searchParams.get('taskType') as TaskType) || undefined,
      result: (searchParams.get('result') as DecisionResult) || undefined,
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      minQuality: searchParams.get('minQuality')
        ? parseFloat(searchParams.get('minQuality')!)
        : undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    }

    // 3. 查询数据
    const learningManager = getLearningManager()
    const result = await learningManager.recorder.query(query)

    // 4. 返回结果
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Failed to query decisions:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## 六、集成方案

### 6.1 与 Agent 调度器集成

```typescript
/**
 * 学习增强的 Agent 调度器
 */
class LearningEnhancedScheduler extends AgentScheduler {
  private learningManager: LearningManager

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    // 调用父类初始化
    await super.initialize()

    // 初始化学习管理器
    this.learningManager = new LearningManager()
    await this.learningManager.initialize()

    // 设置学习钩子
    this.setupLearningHooks()
  }

  /**
   * 设置学习钩子
   */
  private setupLearningHooks(): void {
    // 决策前钩子
    this.on('beforeDecision', async (context: DecisionContext) => {
      // 获取优化建议
      const suggestions = await this.learningManager.executor.getSuggestionsForContext(context)

      // 应用历史模式
      if (suggestions.length > 0) {
        context.optimizationHints = suggestions
      }
    })

    // 决策后钩子
    this.on('afterDecision', async (decision: ScheduleDecision) => {
      // 记录决策
      await this.learningManager.recorder.recordDecisionStart({
        agentId: decision.assignedAgent,
        taskType: decision.task.type,
        taskCategory: decision.task.category,
        decision: `Assigned task ${decision.task.id} to agent ${decision.assignedAgent}`,
        decisionType: DecisionType.TASK_ASSIGNMENT,
        context: decision.context,
      })
    })

    // 任务完成钩子
    this.on('taskCompleted', async (result: TaskResult) => {
      // 更新决策结果
      await this.learningManager.recorder.recordDecisionResult(
        result.decisionId,
        result.success ? DecisionResult.SUCCESS : DecisionResult.FAILURE,
        {
          duration: result.duration,
          decisionTime: result.decisionTime,
          executionTime: result.executionTime,
          resourceUsage: result.resourceUsage,
          outputQuality: result.quality,
          efficiency: result.efficiency,
        },
        result.feedback
      )
    })
  }

  /**
   * 智能调度 (使用学习优化)
   */
  async scheduleTask(task: Task): Promise<ScheduleDecision> {
    // 1. 捕获上下文
    const context = await this.captureContext(task)

    // 2. 获取历史学习
    const history = await this.learningManager.executor.getRelevantHistory(task)

    // 3. 应用学习模式
    const optimizedContext = await this.applyLearningPatterns(context, history)

    // 4. 执行决策
    const decision = await super.scheduleTask(task)

    // 5. 增强决策信息
    decision.learningContext = {
      patternsApplied: optimizedContext.patternsApplied,
      expectedImprovement: optimizedContext.expectedImprovement,
      confidence: optimizedContext.confidence,
    }

    return decision
  }

  /**
   * 应用学习模式
   */
  private async applyLearningPatterns(
    context: DecisionContext,
    history: LearningHistory
  ): Promise<OptimizedContext> {
    // 1. 查找适用模式
    const patterns = await this.learningManager.extractor.findApplicablePatterns(context.taskType)

    // 2. 评估每个模式
    const applicable = patterns
      .map(p => ({
        pattern: p,
        score: this.evaluatePatternForContext(p, context),
      }))
      .filter(item => item.score > 0.6)
      .sort((a, b) => b.score - a.score)

    // 3. 应用最佳模式
    const appliedPatterns: LearningPattern[] = []
    let expectedImprovement = 0

    for (const item of applicable.slice(0, 3)) {
      const result = await this.learningManager.executor.applyPattern(item.pattern, context)

      if (result.success) {
        appliedPatterns.push(item.pattern)
        expectedImprovement += item.pattern.impact?.expectedImprovement || 0
      }
    }

    return {
      patternsApplied: appliedPatterns,
      expectedImprovement: expectedImprovement / appliedPatterns.length,
      confidence: applicable[0]?.score || 0,
    }
  }
}
```

### 6.2 与 Agent 记忆系统集成

```typescript
/**
 * 学习增强的记忆系统
 */
class LearningEnhancedMemory extends MemoryManager {
  private learningManager: LearningManager

  /**
   * 搜索记忆 (带学习优化)
   */
  async search(query: MemorySearchQuery): Promise<MemorySearchResult> {
    // 1. 获取搜索基准
    const baseline = await this.learningManager.calculator.getBaseline('memory_search')

    // 2. 执行搜索
    const result = await super.search(query)

    // 3. 记录搜索决策
    const decisionId = await this.learningManager.recorder.recordDecisionStart({
      agentId: this.agentId,
      taskType: TaskType.MEMORY_SEARCH,
      taskCategory: 'memory',
      decision: `Search memory with query: ${query.query}`,
      decisionType: DecisionType.RESOURCE_ALLOCATION,
      context: {
        query: query.query,
        options: query.options,
      },
    })

    // 4. 记录结果
    await this.learningManager.recorder.recordDecisionResult(decisionId, DecisionResult.SUCCESS, {
      duration: result.duration,
      decisionTime: 0,
      executionTime: result.duration,
      resourceUsage: result.resourceUsage,
      outputQuality: result.relevance,
      efficiency: result.efficiency,
    })

    // 5. 应用学习优化
    const optimizations = await this.learningManager.executor.getOptimizationsForSearch(query)

    if (optimizations.length > 0) {
      result.optimizations = optimizations
    }

    return result
  }
}
```

### 6.3 React Hook 集成

```typescript
// hooks/useLearningStatus.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

/**
 * 获取学习状态
 */
export function useLearningStatus() {
  return useQuery({
    queryKey: ['learning', 'status'],
    queryFn: async () => {
      const response = await apiClient.get('/api/agent/learning/status')
      return response.data
    },
    refetchInterval: 30000, // 每 30 秒刷新
  })
}

/**
 * 获取性能报告
 */
export function usePerformanceReport(period: 'day' | 'week' | 'month') {
  return useQuery({
    queryKey: ['learning', 'report', period],
    queryFn: async () => {
      const response = await apiClient.get('/api/agent/learning/report', {
        params: { period },
      })
      return response.data
    },
  })
}

/**
 * 获取优化建议
 */
export function useOptimizationSuggestions(filters?: GetSuggestionsRequest) {
  return useQuery({
    queryKey: ['learning', 'suggestions', filters],
    queryFn: async () => {
      const response = await apiClient.get('/api/agent/learning/suggestions', {
        params: filters,
      })
      return response.data
    },
  })
}

/**
 * 批准优化建议
 */
export function useApproveSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const response = await apiClient.post(
        `/api/agent/learning/suggestions/${suggestionId}/approve`
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'suggestions'] })
    },
  })
}

/**
 * 触发学习任务
 */
export function useTriggerLearningTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: TriggerLearningTaskRequest) => {
      const response = await apiClient.post('/api/agent/learning/tasks', request)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] })
    },
  })
}
```

### 6.4 Dashboard 组件示例

```typescriptx
// components/learning/LearningDashboard.tsx

import React from 'react';
import {
  useLearningStatus,
  usePerformanceReport,
  useOptimizationSuggestions,
} from '@/hooks/useLearning';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function LearningDashboard() {
  const { data: status, isLoading: statusLoading } = useLearningStatus();
  const { data: report, isLoading: reportLoading } = usePerformanceReport('week');
  const { data: suggestions } = useOptimizationSuggestions({ status: 'pending' });

  if (statusLoading || reportLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* 状态概览 */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">学习系统状态</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              title="总决策数"
              value={status?.statistics.totalDecisions || 0}
              icon="📊"
            />
            <MetricCard
              title="学习模式"
              value={status?.statistics.totalPatterns || 0}
              icon="🧠"
            />
            <MetricCard
              title="性能基准"
              value={status?.statistics.totalBaselines || 0}
              icon="📈"
            />
            <MetricCard
              title="活跃优化"
              value={status?.statistics.activeOptimizations || 0}
              icon="⚡"
            />
          </div>
        </CardContent>
      </Card>

      {/* 性能趋势 */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">本周性能趋势</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <PerformanceBar
              label="成功率"
              current={report?.summary.successRate || 0}
              previous={report?.summary.improvement.successRate || 0}
            />
            <PerformanceBar
              label="平均质量"
              current={report?.summary.avgQuality || 0}
              previous={report?.summary.improvement.quality || 0}
            />
            <PerformanceBar
              label="平均时长"
              current={report?.summary.avgDuration || 0}
              previous={report?.summary.improvement.duration || 0}
              inverse
            />
          </div>
        </CardContent>
      </Card>

      {/* 优化建议 */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">待处理优化建议</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {suggestions?.data?.suggestions.slice(0, 5).map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon }: {
  title: string;
  value: number;
  icon: string
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}

function PerformanceBar({
  label,
  current,
  previous,
  inverse = false
}: {
  label: string;
  current: number;
  previous: number;
  inverse?: boolean;
}) {
  const improvement = inverse ? -previous : previous;
  const trend = improvement > 0 ? '↑' : improvement < 0 ? '↓' : '→';
  const trendColor = improvement > 0 ? 'text-green-600' :
                     improvement < 0 ? 'text-red-600' : 'text-gray-600';

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="font-medium">{label}</span>
        <span className={trendColor}>
          {trend} {Math.abs(improvement * 100).toFixed(1)}%
        </span>
      </div>
      <Progress value={current * 100} />
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: OptimizationSuggestion }) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{suggestion.title}</h4>
          <p className="text-sm text-gray-600 mt-1">
            {suggestion.description}
          </p>
        </div>
        <Badge variant={suggestion.scope.priority === 'high' ? 'destructive' : 'default'}>
          {suggestion.scope.priority}
        </Badge>
      </div>
      <div className="mt-3 flex justify-between items-center">
        <span className="text-sm text-gray-500">
          预期改善: {(suggestion.impact.expectedImprovement * 100).toFixed(0)}%
        </span>
        <div className="space-x-2">
          <Button size="sm" variant="outline">查看详情</Button>
          <Button size="sm">批准</Button>
        </div>
      </div>
    </div>
  );
}
```

---

## 七、安全与隐私设计

### 7.1 数据隔离策略

```
┌─────────────────────────────────────────────────────────────────────┐
│                    数据隔离架构                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  用户 A 的学习数据                                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  • 决策历史独立存储                                            │  │
│  │  • 学习模式用户级隔离                                          │  │
│  │  • 性能基准用户级计算                                          │  │
│  │  • 优化建议用户级生成                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  用户 B 的学习数据                                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  • 完全独立的数据库                                            │  │
│  │  • 无交叉访问权限                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  聚合学习数据 (可选，需用户同意)                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  • 脱敏后聚合                                                  │  │
│  │  • 用于全局模式提取                                            │  │
│  │  • 不包含个人信息                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 数据脱敏规则

```typescript
/**
 * 数据脱敏器
 */
class DataSanitizer {
  private sensitiveFields = ['userId', 'email', 'phone', 'address', 'apiKey', 'password', 'token']

  private sensitivePatterns = [
    /\b[\w\.-]+@[\w\.-]+\.\w+\b/, // 邮箱
    /\b\d{11}\b/, // 手机号
    /\b\d{15,19}\b/, // 身份证/银行卡
    /api[_-]?key/i, // API Key
    /password/i, // 密码
    /token/i, // Token
  ]

  /**
   * 脱敏决策事件
   */
  sanitize(event: Partial<DecisionEvent>): SanitizedDecisionEvent {
    return {
      ...event,

      // 脱敏上下文
      context: this.sanitizeContext(event.context),

      // 脱敏决策内容
      decision: this.sanitizeText(event.decision),

      // 移除敏感元数据
      metadata: {
        ...event.metadata,
        custom: this.sanitizeObject(event.metadata?.custom),
      },
    }
  }

  /**
   * 脱敏文本
   */
  private sanitizeText(text: string): string {
    let sanitized = text

    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }

    return sanitized
  }

  /**
   * 脱敏对象
   */
  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj
    }

    const sanitized: any = Array.isArray(obj) ? [] : {}

    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeText(value)
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * 检查敏感字段
   */
  private isSensitiveField(field: string): boolean {
    const normalized = field.toLowerCase()
    return this.sensitiveFields.some(f => normalized.includes(f.toLowerCase()))
  }
}
```

### 7.3 访问控制

```typescript
/**
 * 学习数据访问控制
 */
class LearningAccessControl {
  /**
   * 检查访问权限
   */
  async canAccess(
    userId: string,
    resourceType: 'decision' | 'pattern' | 'baseline' | 'suggestion',
    resourceId: string,
    action: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    // 1. 获取资源归属
    const resource = await this.getResource(resourceType, resourceId)

    // 2. 检查所有权
    if (resource.ownerId === userId) {
      return true
    }

    // 3. 检查共享权限
    const permission = await this.getPermission(userId, resourceId)

    if (permission && permission.actions.includes(action)) {
      return true
    }

    return false
  }

  /**
   * 过滤可访问资源
   */
  async filterAccessible<T extends { id: string; ownerId: string }>(
    userId: string,
    resources: T[],
    action: 'read' | 'write' | 'delete'
  ): Promise<T[]> {
    const accessible: T[] = []

    for (const resource of resources) {
      const canAccess = await this.canAccess(userId, 'decision', resource.id, action)

      if (canAccess) {
        accessible.push(resource)
      }
    }

    return accessible
  }
}
```

### 7.4 数据保留策略

```typescript
/**
 * 数据保留管理器
 */
class DataRetentionManager {
  private policies: RetentionPolicy[] = [
    {
      type: 'decision_events',
      retentionDays: 90,
      archiveAfterDays: 30,
      deleteAfterDays: 365,
    },
    {
      type: 'learning_patterns',
      retentionDays: 180,
      archiveAfterDays: 90,
      deleteAfterDays: 720,
    },
    {
      type: 'performance_baselines',
      retentionDays: 365,
      archiveAfterDays: 180,
      deleteAfterDays: 1095, // 3 年
    },
    {
      type: 'optimization_suggestions',
      retentionDays: 30,
      archiveAfterDays: 7,
      deleteAfterDays: 90,
    },
  ]

  /**
   * 执行保留策略
   */
  async enforceRetentionPolicy(): Promise<RetentionResult> {
    const result: RetentionResult = {
      archived: 0,
      deleted: 0,
      errors: [],
    }

    for (const policy of this.policies) {
      try {
        // 1. 归档旧数据
        const archived = await this.archiveOldData(policy)
        result.archived += archived

        // 2. 删除过期数据
        const deleted = await this.deleteExpiredData(policy)
        result.deleted += deleted
      } catch (error) {
        result.errors.push({
          type: policy.type,
          error: error.message,
        })
      }
    }

    return result
  }

  /**
   * 归档旧数据
   */
  private async archiveOldData(policy: RetentionPolicy): Promise<number> {
    const archiveDate = new Date(Date.now() - policy.archiveAfterDays * 24 * 60 * 60 * 1000)

    const toArchive = await this.query({
      type: policy.type,
      olderThan: archiveDate,
      status: 'active',
    })

    for (const item of toArchive) {
      await this.archive(item)
    }

    return toArchive.length
  }

  /**
   * 删除过期数据
   */
  private async deleteExpiredData(policy: RetentionPolicy): Promise<number> {
    const deleteDate = new Date(Date.now() - policy.deleteAfterDays * 24 * 60 * 60 * 1000)

    const toDelete = await this.query({
      type: policy.type,
      olderThan: deleteDate,
      status: 'archived',
    })

    for (const item of toDelete) {
      await this.delete(item.id)
    }

    return toDelete.length
  }
}
```

### 7.5 审计日志

```typescript
/**
 * 学习系统审计日志
 */
interface LearningAuditLog {
  id: string
  timestamp: Date
  userId: string
  action: AuditAction
  resourceType: string
  resourceId: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

enum AuditAction {
  // 决策
  DECISION_RECORDED = 'decision_recorded',
  DECISION_VIEWED = 'decision_viewed',
  DECISION_DELETED = 'decision_deleted',

  // 模式
  PATTERN_CREATED = 'pattern_created',
  PATTERN_APPLIED = 'pattern_applied',
  PATTERN_DELETED = 'pattern_deleted',

  // 优化
  SUGGESTION_GENERATED = 'suggestion_generated',
  SUGGESTION_APPROVED = 'suggestion_approved',
  SUGGESTION_IMPLEMENTED = 'suggestion_implemented',

  // 系统
  LEARNING_TRIGGERED = 'learning_triggered',
  BASELINE_CALCULATED = 'baseline_calculated',
  DATA_EXPORTED = 'data_exported',
}

/**
 * 审计日志记录器
 */
class AuditLogger {
  /**
   * 记录审计事件
   */
  async log(entry: Omit<LearningAuditLog, 'id' | 'timestamp'>): Promise<void> {
    const log: LearningAuditLog = {
      id: generateUUID(),
      timestamp: new Date(),
      ...entry,
    }

    // 存储到审计日志表
    await this.store(log)

    // 可选：发送到外部审计系统
    await this.sendToExternalAudit(log)
  }

  /**
   * 查询审计日志
   */
  async query(filters: AuditQueryFilters): Promise<LearningAuditLog[]> {
    return this.store.query(filters)
  }
}
```

---

## 八、性能优化

### 8.1 缓存策略

```typescript
/**
 * 学习数据缓存
 */
class LearningCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly maxAge = 5 * 60 * 1000 // 5 分钟

  /**
   * 获取缓存的模式
   */
  async getPatterns(taskType: TaskType): Promise<LearningPattern[] | null> {
    const key = `patterns:${taskType}`
    const entry = this.cache.get(key)

    if (entry && Date.now() - entry.timestamp < this.maxAge) {
      return entry.data
    }

    return null
  }

  /**
   * 缓存模式
   */
  async setPatterns(taskType: TaskType, patterns: LearningPattern[]): Promise<void> {
    const key = `patterns:${taskType}`
    this.cache.set(key, {
      data: patterns,
      timestamp: Date.now(),
    })
  }

  /**
   * 失效缓存
   */
  invalidate(taskType: TaskType): void {
    const key = `patterns:${taskType}`
    this.cache.delete(key)
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key)
      }
    }
  }
}
```

---

## 九、部署与监控

### 9.1 部署检查清单

```
[ ] 数据库初始化
    [ ] 创建 learning.db
    [ ] 执行 Schema 创建脚本
    [ ] 创建索引
    [ ] 配置备份

[ ] 配置学习管理器
    [ ] 初始化所有组件
    [ ] 设置定时任务
    [ ] 配置缓存
    [ ] 设置监控

[ ] 集成到现有系统
    [ ] 与调度器集成
    [ ] 与记忆系统集成
    [ ] 添加 API 路由
    [ ] 更新权限配置

[ ] 测试
    [ ] 单元测试
    [ ] 集成测试
    [ ] 性能测试
    [ ] 安全测试

[ ] 监控
    [ ] 配置日志
    [ ] 设置告警
    [ ] 配置 Dashboard
    [ ] 设置性能监控

[ ] 文档
    [ ] API 文档
    [ ] 部署文档
    [ ] 用户指南
    [ ] 运维手册
```

### 9.2 监控指标

```typescript
/**
 * 学习系统监控指标
 */
interface LearningMetrics {
  // 数据量指标
  data: {
    totalDecisions: number
    totalPatterns: number
    totalBaselines: number
    totalSuggestions: number
    dailyNewDecisions: number
    weeklyNewPatterns: number
  }

  // 性能指标
  performance: {
    avgDecisionRecordingTime: number
    avgPatternExtractionTime: number
    avgBaselineCalculationTime: number
    avgOptimizationTime: number
  }

  // 学习指标
  learning: {
    patternsApplied: number
    patternSuccessRate: number
    avgImprovementFromOptimizations: number
    learningCycleCount: number
  }

  // 资源指标
  resources: {
    dbSize: number
    cacheSize: number
    memoryUsage: number
    cpuUsage: number
  }

  // 错误指标
  errors: {
    recordingErrors: number
    extractionErrors: number
    calculationErrors: number
    optimizationErrors: number
  }
}
```

### 9.3 告警规则

```yaml
# 告警规则配置
alerts:
  - name: learning_system_down
    condition: learning_status != 'active'
    severity: critical
    message: '学习系统不可用'

  - name: high_error_rate
    condition: error_rate > 0.05
    severity: warning
    message: '错误率过高: {{ error_rate }}'

  - name: pattern_extraction_failure
    condition: pattern_extraction_errors > 10
    severity: warning
    message: '模式提取失败次数过多'

  - name: disk_space_low
    condition: disk_usage > 0.9
    severity: critical
    message: '磁盘空间不足: {{ disk_usage }}'

  - name: learning_stagnation
    condition: new_patterns_last_7days == 0
    severity: info
    message: '7天内未发现新模式'
```

---

## 十、实施路线图

### 10.1 阶段划分

#### Phase 1: 基础设施 (Week 1-2)

**目标**: 搭建学习和记录基础设施

- [ ] 设计并实现数据库 Schema
- [ ] 实现决策记录器
- [ ] 实现数据脱敏器
- [ ] 实现访问控制
- [ ] 设置监控和日志
- [ ] 编写单元测试

**交付物**:

- 完整的数据库 Schema
- 可用的决策记录 API
- 安全的数据脱敏
- 基础监控

#### Phase 2: 模式提取 (Week 3-4)

**目标**: 实现模式分析和提取

- [ ] 实现特征工程器
- [ ] 实现聚类引擎
- [ ] 实现模式提取器
- [ ] 实现基准计算器
- [ ] 实现模式验证
- [ ] 编写单元测试

**交付物**:

- 自动模式提取
- 性能基准计算
- 模式验证机制

#### Phase 3: 优化执行 (Week 5-6)

**目标**: 实现优化建议和执行

- [ ] 实现优化执行器
- [ ] 实现优化建议生成
- [ ] 实现策略选择
- [ ] 实现参数调优
- [ ] 集成到调度器
- [ ] 端到端测试

**交付物**:

- 智能优化执行
- 调度器集成
- 完整的学习闭环

#### Phase 4: UI 和可视化 (Week 7-8)

**目标**: 实现 Dashboard 和可视化

- [ ] 设计学习 Dashboard
- [ ] 实现性能报告
- [ ] 实现优化建议界面
- [ ] 实现模式可视化
- [ ] 实现实时监控
- [ ] 用户测试

**交付物**:

- 学习 Dashboard
- 性能报告
- 可视化图表

#### Phase 5: 优化和部署 (Week 9-10)

**目标**: 性能优化和正式部署

- [ ] 性能优化
- [ ] 压力测试
- [ ] 安全审计
- [ ] 文档完善
- [ ] 生产部署
- [ ] 监控告警

**交付物**:

- 生产就绪系统
- 完整文档
- 监控告警

### 10.2 依赖关系

```
Phase 1: 基础设施
    ↓
Phase 2: 模式提取 (依赖 Phase 1)
    ↓
Phase 3: 优化执行 (依赖 Phase 1, 2)
    ↓
Phase 4: UI 和可视化 (依赖 Phase 1, 2, 3)
    ↓
Phase 5: 优化和部署 (依赖 Phase 1, 2, 3, 4)
```

### 10.3 资源需求

**人员需求**:

- 后端工程师: 2 人
- 前端工程师: 1 人
- 数据工程师: 1 人
- 测试工程师: 1 人
- 项目经理: 1 人

**硬件需求**:

- 开发环境: 4 核 8GB RAM
- 测试环境: 8 核 16GB RAM
- 生产环境: 16 核 32GB RAM + SSD
- 数据库: 独立服务器或云数据库

---

## 十一、风险评估与缓解

### 11.1 技术风险

| 风险           | 影响 | 概率 | 缓解措施             |
| -------------- | ---- | ---- | -------------------- |
| 数据质量差     | 高   | 中   | 数据验证、质量监控   |
| 模式提取不准确 | 高   | 中   | 多算法验证、人工审核 |
| 性能影响       | 中   | 高   | 异步处理、缓存优化   |
| 数据泄露       | 高   | 低   | 数据脱敏、访问控制   |
| 系统复杂度高   | 中   | 高   | 模块化设计、文档完善 |

### 11.2 业务风险

| 风险           | 影响 | 概率 | 缓解措施           |
| -------------- | ---- | ---- | ------------------ |
| 用户不信任     | 高   | 中   | 透明度、可解释性   |
| 优化效果不明显 | 中   | 中   | A/B 测试、逐步推广 |
| 维护成本高     | 中   | 低   | 自动化运维、监控   |

### 11.3 合规风险

| 风险           | 影响 | 概率 | 缓解措施           |
| -------------- | ---- | ---- | ------------------ |
| 数据隐私违规   | 高   | 低   | 数据脱敏、访问控制 |
| 审计要求不满足 | 中   | 中   | 完整审计日志       |

---

## 十二、成功指标

### 12.1 技术指标

- **数据收集率**: >95% 的决策被记录
- **模式准确率**: >80% 的提取模式准确
- **优化效果**: 任务完成时间降低 20-30%
- **系统性能**: 学习开销 <5%

### 12.2 业务指标

- **用户满意度**: >4.5/5
- **使用率**: >80% 的用户启用学习功能
- **效率提升**: 整体工作效率提升 25%
- **成本降低**: API 成本降低 15%

### 12.3 质量指标

- **代码覆盖率**: >80%
- **Bug 率**: <0.5 per 1000 lines
- **平均恢复时间 (MTTR)**: <1 小时

---

## 十三、附录

### 13.1 术语表

| 术语                               | 定义                             |
| ---------------------------------- | -------------------------------- |
| 决策事件 (Decision Event)          | 记录一次 Agent 决策的完整信息    |
| 学习模式 (Learning Pattern)        | 从历史数据中提取的成功或失败模式 |
| 性能基准 (Performance Baseline)    | 各任务类型的性能参考标准         |
| 优化建议 (Optimization Suggestion) | 基于分析生成的改进建议           |
| 特征工程 (Feature Engineering)     | 从决策数据中提取特征的过程       |
| 聚类 (Clustering)                  | 将相似决策分组的技术             |

### 13.2 参考资料

- [Agent Memory Architecture](./AGENT_MEMORY_ARCHITECTURE.md)
- [Agent Scheduler Implementation](./AGENT_SCHEDULER_IMPLEMENTATION_20260329.md)
- [v1.5.0 Planning Document](./V150_PLANNING.md)

### 13.3 联系信息

- **架构设计**: 🏗️ 架构师
- **系统分析**: 📚 咨询师
- **未来布局**: 🌟 智能体世界专家

---

## 总结

本架构设计文档定义了完整的 AI Agent 学习优化系统，包括：

1. **数据采集** - 决策事件记录、上下文捕获、指标收集
2. **模式分析** - 特征工程、聚类分析、规则挖掘、模式验证
3. **性能基准** - 基准计算、趋势分析、对比评估
4. **优化执行** - 模式应用、策略选择、参数调优
5. **系统集成** - 与调度器、记忆系统的无缝集成
6. **安全隐私** - 数据脱敏、访问控制、审计日志
7. **性能优化** - 缓存策略、批量处理、异步执行
8. **监控运维** - 监控指标、告警规则、数据保留

该系统将赋予 AI Agent 自我学习能力，通过持续学习和优化，不断提升决策质量和执行效率。

---

**文档版本**: v1.0.0  
**最后更新**: 2026-03-29  
**状态**: ✅ 设计完成，待实施
