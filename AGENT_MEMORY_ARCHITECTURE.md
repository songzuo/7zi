# 智能体记忆持久化系统架构设计

> **文档版本**: v1.0.0
> **创建日期**: 2026-03-29
> **设计者**: 🏗️ 架构师 + 📚 咨询师
> **目标版本**: v1.5.0

---

## 一、概述

### 1.1 背景

v1.5.0 路线图要求实现"记忆持久化"功能，这是智能体系统的核心能力缺失。当前智能体没有长期记忆，每次会话都是全新开始。

### 1.2 设计目标

| 目标             | 描述                               | 优先级 |
| ---------------- | ---------------------------------- | ------ |
| **跨会话记忆**   | 智能体在多次会话间保持记忆         | P0     |
| **记忆分类**     | 区分短期记忆、长期记忆、情景记忆等 | P0     |
| **语义检索**     | 支持基于语义相似度的记忆检索       | P0     |
| **多智能体共享** | 支持智能体间共享记忆               | P1     |
| **隐私隔离**     | 主会话和共享上下文的记忆隔离       | P0     |
| **高效查询**     | 快速的记忆增删改查和关联查询       | P1     |

### 1.3 记忆类型定义

```
┌─────────────────────────────────────────────────────────────┐
│                    智能体记忆系统架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   短期记忆       │  │   工作记忆       │                  │
│  │  (Short-term)   │  │  (Working)      │                  │
│  │                 │  │                 │                  │
│  │ • 当前会话上下文 │  │ • 当前任务状态  │                  │
│  │ • 最近对话轮次   │  │ • 临时变量      │                  │
│  │ • 活动窗口 50条  │  │ • 推理中间结果  │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   情景记忆       │  │   语义记忆       │                  │
│  │  (Episodic)     │  │  (Semantic)     │                  │
│  │                 │  │                 │                  │
│  │ • 对话历史记录   │  │ • 用户偏好      │                  │
│  │ • 任务执行过程   │  │ • 项目信息      │                  │
│  │ • 事件时间线     │  │ • 知识事实      │                  │
│  │ • 学习案例       │  │ • 教训经验      │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   程序记忆       │  │   共享记忆       │                  │
│  │  (Procedural)   │  │  (Shared)       │                  │
│  │                 │  │                 │                  │
│  │ • 技能和工具     │  │ • 团队知识库    │                  │
│  │ • 工作流程       │  │ • 项目文档      │                  │
│  │ • 最佳实践       │  │ • 公共教训      │                  │
│  │ • 操作步骤       │  │ • 跨智能体协作  │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、存储架构设计

### 2.1 存储层设计

采用 **混合存储架构**，根据记忆类型选择最优存储方案：

```
┌─────────────────────────────────────────────────────────────┐
│                     存储架构层次图                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────────────────────────────────────────┐     │
│   │              记忆访问层 (Memory Access Layer)      │     │
│   │  • 统一 API 接口                                   │     │
│   │  • 查询路由                                        │     │
│   │  • 缓存管理                                        │     │
│   └──────────────────────────────────────────────────┘     │
│                           ↓                                 │
│   ┌──────────────────────────────────────────────────┐     │
│   │              向量检索层 (Vector Search Layer)      │     │
│   │  • 语义相似度搜索                                  │     │
│   │  • 嵌入向量管理                                    │     │
│   │  • 混合检索 (关键词 + 向量)                         │     │
│   └──────────────────────────────────────────────────┘     │
│                           ↓                                 │
│   ┌──────────────┬──────────────┬──────────────────────┐   │
│   │              │              │                      │   │
│   │   SQLite     │    JSON      │    向量数据库         │   │
│   │   (结构化)    │   (文档)     │    (语义检索)        │   │
│   │              │              │                      │   │
│   │ • 元数据索引  │ • 完整记忆   │ • 嵌入向量存储       │   │
│   │ • 关系查询    │ • 配置文件   │ • 相似度搜索         │   │
│   │ • 快速过滤    │ • 日志记录   │ • 聚类分析           │   │
│   │              │              │                      │   │
│   └──────────────┴──────────────┴──────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 存储方案选择

| 存储类型       | 技术选型            | 用途                   | 理由                   |
| -------------- | ------------------- | ---------------------- | ---------------------- |
| **结构化存储** | SQLite              | 元数据、索引、关系查询 | 轻量、无依赖、查询高效 |
| **文档存储**   | JSON                | 完整记忆内容           | 人类可读、灵活、易迁移 |
| **向量存储**   | SQLite-vec / Chroma | 语义检索               | 轻量、无外部依赖       |

### 2.3 数据模型设计

#### 2.3.1 记忆核心模型

```typescript
// 记忆基础结构
interface Memory {
  id: string // UUID
  type: MemoryType // 记忆类型
  scope: MemoryScope // 可见范围
  agentId?: string // 所属智能体 ID
  sessionId?: string // 所属会话 ID

  // 内容
  content: string // 记忆内容
  embedding?: number[] // 嵌入向量 (1536维)
  metadata: MemoryMetadata // 元数据

  // 时间信息
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date // 过期时间 (短期记忆)
  lastAccessedAt: Date
  accessCount: number // 访问次数

  // 关联
  tags: string[] // 标签
  relatedMemoryIds: string[] // 关联记忆
  sourceMemoryId?: string // 来源记忆 (用于派生)
}

// 记忆类型枚举
enum MemoryType {
  SHORT_TERM = 'short_term', // 短期记忆
  WORKING = 'working', // 工作记忆
  EPISODIC = 'episodic', // 情景记忆
  SEMANTIC = 'semantic', // 语义记忆
  PROCEDURAL = 'procedural', // 程序记忆
  SHARED = 'shared', // 共享记忆
}

// 记忆可见范围
enum MemoryScope {
  PRIVATE = 'private', // 仅当前智能体
  SESSION = 'session', // 当前会话内
  AGENT = 'agent', // 智能体所有会话
  TEAM = 'team', // 团队内共享
  PUBLIC = 'public', // 全局共享
}

// 记忆元数据
interface MemoryMetadata {
  importance: number // 重要性 1-10
  confidence: number // 置信度 0-1
  source: string // 来源 (user/system/agent)
  category?: string // 分类
  subCategory?: string // 子分类
  entities?: Entity[] // 提取的实体
  sentiment?: string // 情感分析
  language?: string // 语言
}
```

#### 2.3.2 数据库 Schema (SQLite)

```sql
-- 记忆主表
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  scope TEXT NOT NULL,
  agent_id TEXT,
  session_id TEXT,

  content TEXT NOT NULL,
  embedding BLOB,  -- 向量数据序列化

  -- 元数据 JSON
  importance INTEGER DEFAULT 5,
  confidence REAL DEFAULT 1.0,
  source TEXT DEFAULT 'system',
  category TEXT,
  metadata TEXT,  -- JSON 字符串

  -- 时间字段
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT,
  last_accessed_at TEXT,
  access_count INTEGER DEFAULT 0,

  -- 状态
  is_active INTEGER DEFAULT 1,
  is_pinned INTEGER DEFAULT 0
);

-- 标签表
CREATE TABLE memory_tags (
  memory_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (memory_id, tag),
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- 关联表
CREATE TABLE memory_relations (
  memory_id TEXT NOT NULL,
  related_memory_id TEXT NOT NULL,
  relation_type TEXT DEFAULT 'related',
  strength REAL DEFAULT 1.0,
  PRIMARY KEY (memory_id, related_memory_id),
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (related_memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_scope ON memories(scope);
CREATE INDEX idx_memories_agent ON memories(agent_id);
CREATE INDEX idx_memories_session ON memories(session_id);
CREATE INDEX idx_memories_created ON memories(created_at);
CREATE INDEX idx_memories_expires ON memories(expires_at);
CREATE INDEX idx_memories_importance ON memories(importance);
CREATE INDEX idx_memory_tags_tag ON memory_tags(tag);
```

#### 2.3.3 向量存储 (SQLite-vec)

```sql
-- 向量表 (使用 sqlite-vec 扩展)
CREATE VIRTUAL TABLE memory_vectors USING vec0(
  memory_id TEXT PRIMARY KEY,
  embedding FLOAT[1536]  -- OpenAI text-embedding-3-small 维度
);

-- 相似度搜索视图
CREATE VIEW memory_similarity AS
SELECT
  m.id,
  m.content,
  m.type,
  m.importance,
  vec_distance_cosine(v.embedding, ?) as distance
FROM memories m
JOIN memory_vectors v ON m.id = v.memory_id
WHERE m.is_active = 1
ORDER BY distance ASC
LIMIT ?;
```

### 2.4 文件结构设计

```
.openclaw/
├── memory/                          # 记忆存储目录
│   ├── db/                          # 数据库目录
│   │   ├── main.db                  # 主数据库 (SQLite)
│   │   ├── main.db-wal              # WAL 日志
│   │   └── backups/                 # 数据库备份
│   │       ├── main-2026-03-29.db
│   │       └── main-2026-03-28.db
│   │
│   ├── json/                        # JSON 文档存储
│   │   ├── semantic/                # 语义记忆
│   │   │   ├── user-profiles.json   # 用户画像
│   │   │   ├── project-info.json    # 项目信息
│   │   │   └── lessons.json         # 教训经验
│   │   ├── procedural/              # 程序记忆
│   │   │   ├── skills.json          # 技能库
│   │   │   └── workflows.json       # 工作流
│   │   └── shared/                  # 共享记忆
│   │       └── team-knowledge.json  # 团队知识
│   │
│   ├── cache/                       # 缓存目录
│   │   ├── working-memory.json      # 工作记忆缓存
│   │   └── session-context.json     # 会话上下文缓存
│   │
│   └── exports/                     # 导出目录
│       └── memories-2026-03-29.json # 定期导出
│
└── workspace/
    ├── MEMORY.md                    # 长期记忆 (兼容现有)
    └── memory/                      # 每日日志 (兼容现有)
        └── YYYY-MM-DD.md
```

---

## 三、API 接口设计

### 3.1 核心 API

```typescript
// 记忆管理器接口
interface MemoryManager {
  // 创建记忆
  create(input: CreateMemoryInput): Promise<Memory>

  // 查询记忆
  get(id: string): Promise<Memory | null>

  // 更新记忆
  update(id: string, input: UpdateMemoryInput): Promise<Memory>

  // 删除记忆
  delete(id: string): Promise<void>

  // 搜索记忆
  search(query: MemorySearchQuery): Promise<MemorySearchResult>

  // 语义搜索
  semanticSearch(query: string, options?: SemanticSearchOptions): Promise<Memory[]>

  // 获取相关记忆
  getRelated(id: string, limit?: number): Promise<Memory[]>

  // 记忆关联
  relate(memoryId: string, relatedId: string, type?: string): Promise<void>

  // 批量操作
  batchCreate(inputs: CreateMemoryInput[]): Promise<Memory[]>
  batchDelete(ids: string[]): Promise<void>

  // 记忆迁移
  migrate(type: MemoryType, newType: MemoryType): Promise<void>

  // 记忆清理
  cleanup(options?: CleanupOptions): Promise<CleanupResult>

  // 导出/导入
  export(options?: ExportOptions): Promise<MemoryExport>
  import(data: MemoryExport): Promise<ImportResult>
}

// 创建记忆输入
interface CreateMemoryInput {
  type: MemoryType
  scope?: MemoryScope
  content: string
  metadata?: Partial<MemoryMetadata>
  tags?: string[]
  expiresAt?: Date
  generateEmbedding?: boolean
}

// 搜索查询
interface MemorySearchQuery {
  // 过滤条件
  type?: MemoryType | MemoryType[]
  scope?: MemoryScope | MemoryScope[]
  agentId?: string
  sessionId?: string
  tags?: string[]

  // 时间范围
  createdAfter?: Date
  createdBefore?: Date
  updatedAfter?: Date

  // 内容搜索
  contentContains?: string

  // 元数据过滤
  minImportance?: number
  minConfidence?: number
  category?: string

  // 分页和排序
  limit?: number
  offset?: number
  orderBy?: 'created_at' | 'updated_at' | 'importance' | 'access_count'
  orderDirection?: 'asc' | 'desc'
}

// 语义搜索选项
interface SemanticSearchOptions {
  types?: MemoryType[]
  scopes?: MemoryScope[]
  minSimilarity?: number // 最小相似度阈值 (0-1)
  limit?: number
  includeContent?: boolean
}
```

### 3.2 记忆生命周期 API

```typescript
// 记忆生命周期管理
interface MemoryLifecycle {
  // 短期记忆 -> 长期记忆
  promote(memoryId: string): Promise<Memory>

  // 记忆衰减
  decay(options: DecayOptions): Promise<DecayResult>

  // 记忆压缩
  compress(memories: Memory[]): Promise<Memory>

  // 记忆整合 (合并相似记忆)
  consolidate(threshold?: number): Promise<ConsolidationResult>

  // 记忆恢复 (从归档恢复)
  restore(memoryId: string): Promise<Memory>
}

// 衰减选项
interface DecayOptions {
  // 基于时间的衰减
  timeBased?: boolean
  halfLife?: number // 半衰期 (天)

  // 基于访问的衰减
  accessBased?: boolean
  accessThreshold?: number // 访问次数阈值

  // 自动清理
  autoCleanup?: boolean
  cleanupAge?: number // 清理阈值 (天)
}
```

### 3.3 会话记忆 API

```typescript
// 会话记忆管理
interface SessionMemory {
  // 初始化会话记忆
  initialize(sessionId: string, agentId?: string): Promise<void>

  // 添加对话轮次
  addTurn(turn: ConversationTurn): Promise<void>

  // 获取会话上下文
  getContext(maxTokens?: number): Promise<SessionContext>

  // 保存会话摘要
  saveSummary(summary: string): Promise<void>

  // 结束会话 (归档记忆)
  endSession(): Promise<SessionSummary>
}

// 对话轮次
interface ConversationTurn {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: TurnMetadata
}

// 会话上下文
interface SessionContext {
  turns: ConversationTurn[]
  workingMemory: Memory[]
  relevantMemories: Memory[]
  tokenCount: number
}
```

### 3.4 多智能体共享 API

```typescript
// 共享记忆管理
interface SharedMemory {
  // 创建共享记忆
  createShared(input: CreateMemoryInput, teamId?: string): Promise<Memory>

  // 查询共享记忆
  getShared(options: SharedMemoryQuery): Promise<Memory[]>

  // 订阅记忆更新
  subscribe(memoryId: string, agentId: string): Promise<void>

  // 取消订阅
  unsubscribe(memoryId: string, agentId: string): Promise<void>

  // 获取订阅者
  getSubscribers(memoryId: string): Promise<string[]>

  // 权限管理
  grantAccess(memoryId: string, agentId: string, permission: Permission): Promise<void>
  revokeAccess(memoryId: string, agentId: string): Promise<void>
}

// 权限类型
enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  SHARE = 'share',
  ADMIN = 'admin',
}
```

---

## 四、记忆检索与关联机制

### 4.1 混合检索策略

```
┌─────────────────────────────────────────────────────────────┐
│                     混合检索流程                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   用户查询                                                   │
│      │                                                      │
│      ↓                                                      │
│   ┌────────────────────────────────────────────┐            │
│   │           查询预处理                         │            │
│   │  • 提取关键词                               │            │
│   │  • 实体识别                                 │            │
│   │  • 意图分类                                 │            │
│   └────────────────────────────────────────────┘            │
│      │                                                      │
│      ├─────────────────┬─────────────────┐                  │
│      ↓                  ↓                 ↓                  │
│   ┌────────┐       ┌────────┐       ┌────────┐              │
│   │关键词   │       │ 向量    │       │ 时间   │              │
│   │检索    │       │ 检索    │       │ 检索   │              │
│   │        │       │         │       │        │              │
│   │SQLite  │       │vec_search│      │时间索引│              │
│   │FTS     │       │         │       │        │              │
│   └────────┘       └────────┘       └────────┘              │
│      │                  │                 │                  │
│      └─────────────────┴─────────────────┘                  │
│                        ↓                                     │
│   ┌────────────────────────────────────────────┐            │
│   │           结果融合与排序                     │            │
│   │  • 相关性打分                               │            │
│   │  • 重要性加权                               │            │
│   │  • 时间衰减                                 │            │
│   │  • 去重                                     │            │
│   └────────────────────────────────────────────┘            │
│                        ↓                                     │
│                  返回结果                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 检索算法

```typescript
// 混合检索算法
class HybridRetriever {
  async search(query: string, options: SearchOptions): Promise<Memory[]> {
    // 1. 并行执行多种检索
    const [keywordResults, vectorResults, timeResults] = await Promise.all([
      this.keywordSearch(query, options),
      this.vectorSearch(query, options),
      this.timeSearch(options),
    ])

    // 2. 计算综合得分
    const scored = this.mergeResults(
      keywordResults,
      vectorResults,
      timeResults,
      options.weights || {
        keyword: 0.3,
        vector: 0.5,
        time: 0.2,
      }
    )

    // 3. 重排序
    const reranked = await this.rerank(scored, query)

    // 4. 应用过滤和分页
    return reranked.slice(0, options.limit || 10)
  }

  // 相关性得分计算
  calculateRelevanceScore(memory: Memory, query: string, options: SearchOptions): number {
    const scores = {
      // 关键词匹配度
      keyword: this.keywordMatchScore(memory, query),

      // 语义相似度
      semantic: memory.embedding ? this.cosineSimilarity(memory.embedding, queryEmbedding) : 0,

      // 重要性
      importance: memory.metadata.importance / 10,

      // 时间衰减
      recency: this.timeDecayScore(memory.createdAt, options.decayHalfLife),

      // 访问频率
      access: Math.min(memory.accessCount / 100, 1),
    }

    // 加权平均
    return (
      scores.keyword * 0.2 +
      scores.semantic * 0.3 +
      scores.importance * 0.2 +
      scores.recency * 0.15 +
      scores.access * 0.15
    )
  }
}
```

### 4.3 记忆关联机制

```typescript
// 记忆关联算法
class MemoryAssociation {
  // 自动关联
  async autoAssociate(memory: Memory): Promise<void> {
    // 1. 查找相似记忆
    const similar = await this.findSimilar(memory, {
      threshold: 0.8,
      limit: 10,
    })

    // 2. 提取实体关联
    const entities = await this.extractEntities(memory)

    // 3. 时间窗口关联
    const temporalRelated = await this.findTemporalRelated(memory)

    // 4. 创建关联关系
    for (const related of similar) {
      await this.createRelation({
        memoryId: memory.id,
        relatedMemoryId: related.id,
        relationType: 'similar',
        strength: related.similarity,
      })
    }
  }

  // 关联类型
  relationTypes = {
    SIMILAR: 'similar', // 语义相似
    DERIVED: 'derived', // 派生关系
    TEMPORAL: 'temporal', // 时间相关
    CAUSAL: 'causal', // 因果关系
    PART_OF: 'part_of', // 组成关系
    REFERENCE: 'reference', // 引用关系
  }
}
```

---

## 五、嵌入向量方案

### 5.1 向量生成策略

```typescript
// 嵌入向量管理
interface EmbeddingManager {
  // 生成嵌入向量
  generate(text: string): Promise<number[]>

  // 批量生成
  batchGenerate(texts: string[]): Promise<number[][]>

  // 模型信息
  model: {
    name: string // 模型名称
    dimensions: number // 向量维度
    maxTokens: number // 最大 token 数
    provider: string // 提供商
  }
}

// 默认配置
const defaultEmbeddingConfig: EmbeddingManager = {
  model: {
    name: 'text-embedding-3-small',
    dimensions: 1536,
    maxTokens: 8191,
    provider: 'openai',
  },

  async generate(text: string): Promise<number[]> {
    // 1. 文本预处理
    const processed = this.preprocess(text)

    // 2. 调用 API
    const response = await openai.embeddings.create({
      model: this.model.name,
      input: processed,
    })

    return response.data[0].embedding
  },

  preprocess(text: string): string {
    // 截断过长的文本
    const truncated = text.slice(0, this.model.maxTokens * 4)
    // 清理特殊字符
    return truncated.replace(/[\x00-\x1F\x7F]/g, '')
  },
}
```

### 5.2 本地嵌入选项 (可选)

```typescript
// 本地嵌入模型配置 (用于离线或成本优化)
const localEmbeddingConfig: EmbeddingManager = {
  model: {
    name: 'all-MiniLM-L6-v2',
    dimensions: 384,
    maxTokens: 256,
    provider: 'local',
  },

  async generate(text: string): Promise<number[]> {
    // 使用 transformers.js 或类似库
    const { pipeline } = await import('@xenova/transformers')
    const extractor = await pipeline('feature-extraction', this.model.name)
    const output = await extractor(text)
    return Array.from(output.data)
  },
}
```

---

## 六、隐私与安全设计

### 6.1 隐私隔离机制

```
┌─────────────────────────────────────────────────────────────┐
│                     隐私隔离架构                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   主会话 (Main Session)                                      │
│   ┌───────────────────────────────────────────────────┐     │
│   │  • PRIVATE 记忆可见                                │     │
│   │  • SESSION 记忆可见                                │     │
│   │  • AGENT 记忆可见                                  │     │
│   │  • 可访问 MEMORY.md                                │     │
│   │  • 敏感信息隔离                                    │     │
│   └───────────────────────────────────────────────────┘     │
│                                                             │
│   共享上下文 (Shared Context)                                │
│   ┌───────────────────────────────────────────────────┐     │
│   │  • PRIVATE 记忆不可见                              │     │
│   │  • SESSION 记忆不可见                              │     │
│   │  • 只访问 TEAM/PUBLIC 记忆                         │     │
│   │  • 不访问 MEMORY.md                                │     │
│   │  • 信息脱敏                                        │     │
│   └───────────────────────────────────────────────────┘     │
│                                                             │
│   子代理会话 (Subagent Session)                              │
│   ┌───────────────────────────────────────────────────┐     │
│   │  • 继承父会话权限                                   │     │
│   │  • 可创建 AGENT 记忆                               │     │
│   │  • 任务完成后记忆归档                               │     │
│   └───────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 访问控制实现

```typescript
// 访问控制管理
class AccessController {
  // 检查访问权限
  canAccess(memory: Memory, context: AccessContext): boolean {
    // 1. 检查记忆范围
    switch (memory.scope) {
      case MemoryScope.PRIVATE:
        return context.isOwner && context.isMainSession

      case MemoryScope.SESSION:
        return context.sessionId === memory.sessionId

      case MemoryScope.AGENT:
        return context.agentId === memory.agentId

      case MemoryScope.TEAM:
        return context.teamId === memory.teamId

      case MemoryScope.PUBLIC:
        return true
    }
  }

  // 过滤敏感记忆
  filterSensitive(memories: Memory[], context: AccessContext): Memory[] {
    return memories.filter(m => this.canAccess(m, context))
  }

  // 脱敏处理
  sanitize(memory: Memory, context: AccessContext): Memory {
    if (!context.isMainSession) {
      // 移除敏感字段
      const sanitized = { ...memory }
      delete sanitized.metadata.entities
      sanitized.content = this.redactSensitive(memory.content)
      return sanitized
    }
    return memory
  }
}
```

### 6.3 数据加密

```typescript
// 敏感数据加密
class MemoryEncryption {
  private key: Buffer

  constructor(key?: string) {
    this.key = key ? Buffer.from(key, 'hex') : this.generateKey()
  }

  // 加密记忆内容
  encrypt(content: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv)
    let encrypted = cipher.update(content, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  // 解密记忆内容
  decrypt(encrypted: string): string {
    const [ivHex, authTagHex, content] = encrypted.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(content, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
}
```

---

## 七、性能优化设计

### 7.1 缓存策略

```typescript
// 多级缓存
class MemoryCache {
  // L1: 内存缓存 (热点数据)
  private l1Cache: LRUCache<string, Memory>

  // L2: 工作记忆缓存
  private workingMemory: Map<string, Memory[]>

  // L3: 数据库
  private db: SQLiteDatabase

  async get(id: string): Promise<Memory | null> {
    // L1 检查
    if (this.l1Cache.has(id)) {
      return this.l1Cache.get(id)!
    }

    // L2 检查
    // ... 省略

    // L3 数据库查询
    const memory = await this.db.get(id)
    if (memory) {
      this.l1Cache.set(id, memory)
    }
    return memory
  }

  // 缓存配置
  config = {
    l1MaxSize: 1000, // 最多缓存 1000 条
    l1MaxAge: 1000 * 60 * 30, // 30 分钟过期
    workingMemorySize: 50, // 工作记忆 50 条
  }
}
```

### 7.2 批量操作优化

```typescript
// 批量写入优化
class BatchWriter {
  private queue: WriteOperation[] = []
  private flushTimer: NodeJS.Timeout | null = null

  // 添加写入操作
  add(op: WriteOperation): void {
    this.queue.push(op)

    // 达到阈值立即刷新
    if (this.queue.length >= 100) {
      this.flush()
    }
    // 否则延迟刷新
    else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 1000)
    }
  }

  // 批量执行
  async flush(): Promise<void> {
    if (this.queue.length === 0) return

    const ops = [...this.queue]
    this.queue = []
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    // 事务批量执行
    await this.db.transaction(async tx => {
      for (const op of ops) {
        await tx.execute(op.sql, op.params)
      }
    })
  }
}
```

### 7.3 向量检索优化

```typescript
// 向量索引优化
class VectorIndex {
  // 使用 HNSW 索引加速
  private index: HNSWIndex | null = null

  // 索引配置
  config = {
    m: 16, // 每个节点的最大连接数
    efConstruction: 200, // 构建时的搜索宽度
    efSearch: 50, // 搜索时的搜索宽度
  }

  // 增量更新
  async addVector(id: string, vector: number[]): Promise<void> {
    if (this.index) {
      this.index.addPoint(id, vector)
    }
  }

  // 批量构建
  async buildIndex(memories: Memory[]): Promise<void> {
    const vectors = memories.filter(m => m.embedding).map(m => ({ id: m.id, vector: m.embedding! }))

    this.index = new HNSWIndex(this.config)
    for (const { id, vector } of vectors) {
      this.index.addPoint(id, vector)
    }
  }
}
```

---

## 八、与现有系统集成

### 8.1 兼容现有 MEMORY.md

```typescript
// 现有记忆迁移
class MemoryMigration {
  // 从 MEMORY.md 导入
  async importFromMarkdown(path: string):
```
