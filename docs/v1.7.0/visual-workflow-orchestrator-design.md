# 可视化工作流编排器 - 架构设计文档

**版本**: v1.7.0
**创建日期**: 2026-04-01
**状态**: 设计阶段
**作者**: AI架构师 (🏗️)

---

## 文档概述

本文档定义了可视化工作流编排器的系统架构，该编排器将支持Multi-Agent协作的图形化工作流设计、执行和监控。该系统将与现有的Agent调度器集成，提供直观的拖拽式工作流设计界面。

### 核心特性

✅ **低代码设计** - 拖拽式节点编辑，无需编码即可设计复杂工作流
✅ **实时监控** - WebSocket实时推送执行状态、进度和日志
✅ **智能调度** - 与现有AgentScheduler无缝集成，自动任务分配
✅ **灵活控制** - 支持条件分支、并行执行、人工审批等复杂流程
✅ **版本管理** - 工作流版本控制、历史对比、一键回滚
✅ **高性能** - React Flow虚拟化渲染，支持大规模工作流

### 架构亮点

| 方面 | 方案 | 优势 |
|------|------|------|
| **前端渲染** | React Flow + SVG自定义节点 | 成熟方案、性能优秀、定制灵活 |
| **状态管理** | Zustand + 持久化中间件 | 轻量级、开发体验好、自动持久化 |
| **实时通信** | Socket.IO + Room机制 | 高效广播、按需订阅、低延迟 |
| **工作流引擎** | 状态机 + 执行器模式 | 可扩展、易测试、清晰的状态转换 |
| **数据持久化** | SQLite/PostgreSQL + Redis缓存 | 快速开发、生产可靠、缓存加速 |

### 目录

1. [系统概述](#系统概述)
2. [技术选型](#技术选型)
3. [数据模型设计](#数据模型设计)
4. [系统架构](#系统架构)
5. [状态管理方案](#状态管理方案)
6. [渲染技术实现](#渲染技术实现)
7. [Agent调度集成](#agent调度集成)
8. [API设计](#api设计)
9. [数据库设计](#数据库设计)
10. [安全设计](#安全设计)
11. [性能优化策略](#性能优化策略)
12. [实施计划](#实施计划)

---

## 1. 系统概述

### 1.1 目标

可视化工作流编排器旨在提供：

- **低代码工作流设计**: 通过拖拽节点和连线设计复杂的Multi-Agent协作流程
- **实时执行监控**: 可视化展示工作流执行状态、节点进度和数据流转
- **灵活的条件分支**: 支持条件判断、并行执行、等待节点等多种流程控制
- **版本管理**: 支持工作流版本控制和回滚
- **集成Agent调度器**: 与现有AgentScheduler无缝集成，智能分配任务

### 1.2 核心功能

| 功能模块 | 描述 | 优先级 |
|---------|------|--------|
| 可视化画布 | 无限画布、缩放、网格对齐 | P0 |
| 节点编辑器 | 拖拽节点、属性配置 | P0 |
| 连线系统 | 节点间连线、条件分支 | P0 |
| 工作流引擎 | 解析、验证、执行工作流 | P0 |
| 执行监控 | 实时状态、进度跟踪 | P0 |
| 版本管理 | 工作流版本历史 | P1 |
| 模板库 | 预定义工作流模板 | P1 |
| 导入导出 | JSON/YAML格式 | P2 |
| 协作编辑 | 多人实时编辑 | P2 |

### 1.3 系统边界

```
┌─────────────────────────────────────────────────────────┐
│                   可视化工作流编排器                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  工作流编辑器  │  │  执行监控器   │  │  版本管理器   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│  ┌──────▼─────────────────▼─────────────────▼───────┐ │
│  │              工作流引擎 (WorkflowEngine)           │ │
│  └──────────────────────┬────────────────────────────┘ │
│                         │                               │
│  ┌──────────────────────▼────────────────────────────┐ │
│  │           Agent调度器 (AgentScheduler)            │ │
│  └──────────────────────┬────────────────────────────┘ │
│                         │                               │
│  ┌──────────────────────▼────────────────────────────┐ │
│  │              Agent注册表 (AgentRegistry)          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 技术选型

### 2.1 前端渲染技术

#### 2.1.1 渲染技术对比

| 技术方案 | 优势 | 劣势 | 适用场景 | 推荐度 |
|---------|------|------|---------|--------|
| **React Flow** | 专为工作流设计、开箱即用、拖拽优化良好、节点系统完善 | 定制化程度有限、依赖库更新 | 快速开发、标准工作流 | ⭐⭐⭐⭐⭐ |
| **SVG + React** | 完全可控、DOM事件友好、样式灵活 | 大规模节点性能差、需要手写交互 | 中小型工作流 | ⭐⭐⭐⭐ |
| **HTML Canvas** | 高性能、适合大量节点 | 无DOM、事件处理复杂、无障碍性差 | 复杂可视化 | ⭐⭐⭐ |
| **D3.js** | 强大的数据绑定、动画能力 | 学习曲线陡、不适合交互式编辑 | 数据可视化 | ⭐⭐ |
| **React Three Fiber** | 3D可视化、沉浸式体验 | 3D交互复杂、性能开销大 | 创新UI | ⭐⭐ |

#### 2.1.2 最终选择：React Flow + SVG混合方案

**选择理由**：

1. **React Flow** 作为核心引擎
   - 提供成熟的节点/边系统
   - 内置拖拽、缩放、选择等交互
   - 活跃的社区和生态
   - 性能优化良好（虚拟化）

2. **自定义节点** 使用 SVG
   - 灵活的节点样式定制
   - 轻量级（相比React组件）
   - 矢量图形，缩放不失真

3. **SVG连线层**
   - 贝塞尔曲线、直线、分支线
   - 动画效果（执行中流光效果）
   - 条件标签显示

**技术栈**：
```json
{
  "核心": "reactflow@^11.10.0",
  "样式": "tailwindcss",
  "状态": "zustand",
  "动画": "framer-motion",
  "导出": "html2canvas + jsPDF"
}
```

### 2.2 状态管理方案

#### 2.2.1 状态分层

```
┌─────────────────────────────────────────────────────┐
│              应用级状态 (Application)                │
│  - 用户会话、主题、全局设置                           │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│            工作流编辑器状态 (WorkflowEditor)         │
│  - 当前工作流、编辑模式、选中节点                     │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│             工作流运行时状态 (WorkflowRuntime)        │
│  - 实例列表、执行状态、节点进度                       │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│               画布状态 (Canvas)                       │
│  - 缩放、平移、网格显示                               │
└─────────────────────────────────────────────────────┘
```

#### 2.2.2 Zustand Store设计

```typescript
// workflow-store.ts
interface WorkflowStore {
  // 工作流定义
  workflows: Map<string, WorkflowDefinition>;
  currentWorkflowId: string | null;

  // 运行时实例
  instances: Map<string, WorkflowInstance>;
  currentInstanceId: string | null;

  // UI状态
  selectedNodeId: string | null;
  editingNodeId: string | null;
  isExecuting: boolean;

  // 画布状态
  canvas: {
    zoom: number;
    pan: { x: number; y: number };
    gridSize: number;
    snapToGrid: boolean;
  };

  // Actions
  createWorkflow: (name: string) => string;
  updateWorkflow: (id: string, updates: Partial<WorkflowDefinition>) => void;
  deleteWorkflow: (id: string) => void;
  loadWorkflow: (id: string) => void;
  saveWorkflow: () => Promise<void>;

  // 节点操作
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;

  // 边操作
  addEdge: (edge: WorkflowEdge) => void;
  deleteEdge: (edgeId: string) => void;

  // 执行操作
  executeWorkflow: (inputs?: Record<string, any>) => Promise<string>;
  pauseWorkflow: (instanceId: string) => void;
  resumeWorkflow: (instanceId: string) => void;
  cancelWorkflow: (instanceId: string) => void;

  // 画布操作
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  toggleSnapToGrid: () => void;
}
```

#### 2.2.3 持久化策略

| 状态类型 | 存储方式 | 同步策略 | 备份 |
|---------|---------|---------|------|
| 工作流定义 | SQLite数据库 | 编辑时自动保存（防抖） | 每日备份 |
| 运行时实例 | 内存 + Redis缓存 | 实时同步 | 不备份 |
| 用户偏好设置 | localStorage | 本地持久化 | - |
| 画布状态 | URL query参数 | 深链接支持 | - |

### 2.3 后端技术

```typescript
// 后端技术栈
{
  "API框架": "Next.js API Routes + App Router",
  "数据库": "SQLite (开发) / PostgreSQL (生产)",
  "缓存": "Redis (ioredis)",
  "实时通信": "Socket.IO",
  "文件存储": "本地存储 (可扩展S3)",
  "任务队列": "内置队列 (可扩展BullMQ)"
}
```

---

## 3. 数据模型设计

### 3.1 核心类型定义

#### 3.1.1 节点类型

```typescript
enum NodeType {
  // 控制节点
  START = "start",           // 开始节点
  END = "end",               // 结束节点
  CONDITION = "condition",   // 条件分支
  PARALLEL = "parallel",     // 并行分支
  MERGE = "merge",           // 合并节点

  // 执行节点
  AGENT = "agent",           // Agent执行
  WAIT = "wait",             // 等待
  HUMAN_INPUT = "human_input", // 人工输入
  WEBHOOK = "webhook",       // Webhook触发

  // 数据节点
  TRANSFORM = "transform",   // 数据转换
  VALIDATE = "validate",     // 数据验证
  AGGREGATE = "aggregate",   // 数据聚合

  // 扩展节点
  CUSTOM = "custom",         // 自定义节点
  SUBWORKFLOW = "subworkflow" // 子工作流
}
```

#### 3.1.2 节点状态

```typescript
enum NodeStatus {
  IDLE = "idle",             // 待执行
  RUNNING = "running",       // 运行中
  SUCCESS = "success",       // 成功
  FAILED = "failed",         // 失败
  SKIPPED = "skipped",       // 跳过
  PENDING = "pending",       // 等待中
  CANCELLED = "cancelled"    // 已取消
}
```

#### 3.1.3 边类型

```typescript
enum EdgeType {
  SEQUENCE = "sequence",     // 顺序连接
  CONDITION = "condition",   // 条件连接
  PARALLEL = "parallel",     // 并行连接
  DEFAULT = "default",       // 默认分支
  ERROR = "error"            // 错误处理分支
}
```

#### 3.1.4 工作流定义

```typescript
interface WorkflowDefinition {
  // 基本信息
  id: string;                    // 工作流唯一ID
  name: string;                  // 名称
  description?: string;          // 描述
  version: number;               // 版本号
  status: WorkflowStatus;        // 状态

  // 流程图
  nodes: WorkflowNode[];         // 节点列表
  edges: WorkflowEdge[];         // 边列表

  // 全局配置
  config: {
    timeout?: number;            // 全局超时（秒）
    retryPolicy?: {
      maxRetries: number;
      backoff: "fixed" | "exponential";
      interval: number;
    };
    variables?: Record<string, any>;
    executionMode?: "sync" | "async";
  };

  // 元数据
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
    tags?: string[];
  };

  // 版本信息
  versionInfo?: {
    parentVersion?: number;
    changelog?: string;
  };
}
```

#### 3.1.5 节点定义

```typescript
interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;

  // 视觉属性
  position: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  style?: {
    color?: string;
    icon?: string;
    shape?: "rectangle" | "circle" | "diamond";
  };

  // Agent节点配置
  agentConfig?: {
    agentId: string;
    agentType: string;
    prompt?: string;
    model?: string;
    timeout?: number;
    retryCount?: number;
    parameters?: Record<string, any>;
  };

  // 条件节点配置
  conditionConfig?: {
    expression: string;          // 条件表达式（支持JavaScript）
    trueLabel?: string;
    falseLabel?: string;
    variables?: string[];
  };

  // 等待节点配置
  waitConfig?: {
    duration?: number;           // 等待时长（秒）
    waitForEvent?: string;        // 等待事件
    timeoutAction?: "continue" | "fail";
  };

  // 人工输入配置
  humanInputConfig?: {
    formSchema: Record<string, any>;
    requiredApprovals?: number;
    approvers?: string[];
    timeout?: number;
  };

  // 通用配置
  config?: {
    timeout?: number;
    retryPolicy?: {
      maxRetries: number;
      backoff: "fixed" | "exponential";
      interval: number;
    };
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    async?: boolean;
    continueOnError?: boolean;
  };

  // 数据绑定
  dataBindings?: {
    inputs?: Array<{
      source: string;           // 来源节点或变量
      target: string;           // 目标参数
      transform?: string;       // 转换表达式
    }>;
    outputs?: Array<{
      source: string;
      target: string;
    }>;
  };
}
```

#### 3.1.6 边定义

```typescript
interface WorkflowEdge {
  id: string;
  source: string;               // 源节点ID
  target: string;               // 目标节点ID
  type: EdgeType;

  // 条件边配置
  conditionConfig?: {
    condition: string;          // 条件表达式
    label?: string;             // 显示标签
    expression?: string;         // 完整表达式
  };

  // 样式配置
  style?: {
    color?: string;
    width?: number;
    style?: "solid" | "dashed" | "dotted";
    animated?: boolean;
  };

  // 数据传递
  dataMapping?: {
    filter?: string;             // 数据过滤表达式
    transform?: string;         // 数据转换
  };
}
```

#### 3.1.7 工作流实例

```typescript
interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: InstanceStatus;

  // 执行进度
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
    currentPath: string[];      // 当前执行路径
  };

  // 节点执行结果
  nodeResults: Map<string, NodeExecutionResult>;

  // 实例数据
  data: {
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    variables?: Record<string, any>;
    context?: Record<string, any>;
  };

  // 错误信息
  error?: {
    nodeId: string;
    code: string;
    message: string;
    stack?: string;
  };

  // 重试信息
  retryInfo?: {
    retryCount: number;
    maxRetries: number;
    lastRetryAt: string;
  };

  // 元数据
  metadata: {
    startedAt: string;
    endedAt?: string;
    duration?: number;
    triggeredBy: string;
    triggerType: "manual" | "api" | "scheduled" | "webhook";
    triggerSource?: string;    // API endpoint or webhook URL
  };
}
```

#### 3.1.8 节点执行结果

```typescript
interface NodeExecutionResult {
  nodeId: string;
  status: NodeStatus;
  startTime: string;
  endTime?: string;
  duration?: number;

  // 执行数据
  input?: Record<string, any>;
  output?: Record<string, any>;
  logs?: Array<{
    level: "info" | "warn" | "error";
    message: string;
    timestamp: string;
  }>;

  // 错误信息
  error?: {
    code: string;
    message: string;
    stack?: string;
    retryable?: boolean;
  };

  // 重试历史
  retryHistory?: Array<{
    attempt: number;
    timestamp: string;
    error?: string;
  }>;

  // 性能指标
  metrics?: {
    memoryUsage?: number;
    cpuTime?: number;
    networkTime?: number;
  };
}
```

### 3.2 数据库Schema设计

#### 3.2.1 工作流表 (workflows)

```sql
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',

  -- 流程定义（JSON）
  nodes_json TEXT NOT NULL,
  edges_json TEXT NOT NULL,
  config_json TEXT NOT NULL,

  -- 元数据
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  tags TEXT,

  -- 版本信息
  parent_version INTEGER,
  changelog TEXT,

  -- 索引
  idx_name: created_by,
  idx_status: status,
  idx_version: version
);

CREATE INDEX idx_workflows_created_by ON workflows(created_by);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_version ON workflows(version);
```

#### 3.2.2 工作流实例表 (workflow_instances)

```sql
CREATE TABLE workflow_instances (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  workflow_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',

  -- 进度
  progress_total INTEGER NOT NULL,
  progress_completed INTEGER NOT NULL DEFAULT 0,
  progress_failed INTEGER NOT NULL DEFAULT 0,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  current_path TEXT,

  -- 数据（JSON）
  inputs_json TEXT,
  outputs_json TEXT,
  variables_json TEXT,
  context_json TEXT,

  -- 错误信息
  error_node_id TEXT,
  error_code TEXT,
  error_message TEXT,
  error_stack TEXT,

  -- 元数据
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration INTEGER,
  triggered_by TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_source TEXT,

  -- 外键约束
  FOREIGN KEY (workflow_id) REFERENCES workflows(id),

  -- 索引
  idx_workflow_id: workflow_id,
  idx_status: status,
  idx_started_at: started_at
);

CREATE INDEX idx_instances_workflow_id ON workflow_instances(workflow_id);
CREATE INDEX idx_instances_status ON workflow_instances(status);
CREATE INDEX idx_instances_started_at ON workflow_instances(started_at);
```

#### 3.2.3 节点执行结果表 (node_executions)

```sql
CREATE TABLE node_executions (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',

  -- 时间
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration INTEGER,

  -- 数据（JSON）
  input_json TEXT,
  output_json TEXT,
  logs_json TEXT,

  -- 错误
  error_code TEXT,
  error_message TEXT,
  error_stack TEXT,
  retryable BOOLEAN DEFAULT FALSE,

  -- 重试
  retry_count INTEGER DEFAULT 0,
  retry_history_json TEXT,

  -- 性能
  memory_usage INTEGER,
  cpu_time INTEGER,
  network_time INTEGER,

  -- 外键约束
  FOREIGN KEY (instance_id) REFERENCES workflow_instances(id),

  -- 索引
  idx_instance_id: instance_id,
  idx_node_id: node_id,
  idx_status: status
);

CREATE INDEX idx_executions_instance_id ON node_executions(instance_id);
CREATE INDEX idx_executions_node_id ON node_executions(node_id);
CREATE INDEX idx_executions_status ON node_executions(status);
```

#### 3.2.4 工作流版本历史表 (workflow_versions)

```sql
CREATE TABLE workflow_versions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  version INTEGER NOT NULL,

  -- 定义快照
  nodes_json TEXT NOT NULL,
  edges_json TEXT NOT NULL,
  config_json TEXT NOT NULL,

  -- 变更信息
  changelog TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,

  -- 外键约束
  FOREIGN KEY (workflow_id) REFERENCES workflows(id),

  -- 唯一约束
  UNIQUE(workflow_id, version)
);
```

---

## 4. 系统架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                           前端层 (Frontend)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  工作流编辑器     │  │  执行监控器      │  │  节点属性面板    │  │
│  │  - React Flow    │  │  - 实时状态      │  │  - 表单配置      │  │
│  │  - SVG渲染       │  │  - 进度条        │  │  - 数据绑定      │  │
│  │  - 拖拽交互       │  │  - 日志流        │  │  - 验证规则      │  │
│  └────────┬──────────┘  └────────┬─────────┘  └─────────────────┘  │
│           │                      │                                 │
│           └──────────┬───────────┘                                 │
│                      ▼                                             │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                  Zustand Store                            │   │
│  │              (状态管理 + 业务逻辑)                          │   │
│  └───────────────────────┬────────────────────────────────────┘   │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           │ API调用 (REST + WebSocket)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API层 (Next.js)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────┐  ┌───────────────────┐  ┌──────────────┐ │
│  │  Workflow API     │  │  Instance API     │  │  Socket.IO   │ │
│  │  - CRUD           │  │  - 执行控制        │  │  - 实时推送   │ │
│  │  - 验证           │  │  - 状态查询        │  │  - 进度更新   │ │
│  │  - 版本管理        │  │  - 历史记录        │  │  - 事件通知   │ │
│  └─────────┬─────────┘  └─────────┬─────────┘  └──────────────┘ │
│            │                      │                                │
│            └──────────┬───────────┘                                │
└───────────────────────┼────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                       服务层 (Service)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ WorkflowService │  │ InstanceService │  │ EventService    │  │
│  │ - 工作流管理     │  │ - 实例生命周期    │  │ - 事件发布      │  │
│  │ - 验证逻辑       │  │ - 状态机管理      │  │ - 订阅通知      │  │
│  │ - 版本控制       │  │ - 错误处理        │  │ - 审计日志      │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘  │
│           │                     │                                 │
│           └──────────┬──────────┘                                 │
└──────────────────────┼────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌───────────┐ ┌──────────────┐
│ WorkflowEngine│ │ Scheduler │ │   Store      │
│ - 执行引擎    │ │ - 任务调度 │ │ - 数据持久化 │
│ - 节点执行    │ │ - 负载均衡 │ │ - 缓存管理   │
│ - 状态跟踪    │ │ - 重试逻辑 │ │ - 查询优化   │
└──────────────┘ └───────────┘ └──────────────┘
```

### 4.2 核心组件设计

#### 4.2.1 WorkflowEngine (工作流引擎)

**职责**:
- 工作流解析和验证
- 节点执行顺序控制
- 状态管理和转换
- 错误处理和重试

**关键方法**:
```typescript
class WorkflowEngine {
  // 工作流管理
  registerWorkflow(workflow: WorkflowDefinition): void
  getWorkflow(workflowId: string): WorkflowDefinition
  validateWorkflow(workflow: WorkflowDefinition): ValidationResult

  // 实例管理
  createInstance(workflowId: string, inputs?: any, options?: CreateOptions): WorkflowInstance
  executeInstance(instanceId: string): Promise<WorkflowInstance>
  pauseInstance(instanceId: string): void
  resumeInstance(instanceId: string): void
  cancelInstance(instanceId: string): void

  // 节点执行
  executeNode(instance: WorkflowInstance, nodeId: string, context: ExecutionContext): Promise<void>

  // 状态查询
  getInstance(instanceId: string): WorkflowInstance
  getInstanceStatus(instanceId: string): InstanceStatus
  getInstanceProgress(instanceId: string): ProgressInfo
}
```

#### 4.2.2 NodeExecutor (节点执行器)

**策略模式设计**:

```typescript
interface NodeExecutor {
  canHandle(nodeType: NodeType): boolean
  execute(context: ExecutionContext): Promise<ExecutionResult>
}

// 具体执行器
class AgentNodeExecutor implements NodeExecutor {
  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.AGENT
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, variables } = context
    const config = node.agentConfig

    // 1. 准备输入
    const inputs = this.prepareInputs(node, variables)

    // 2. 创建任务
    const task = createTask({
      type: config.agentType,
      parameters: config.parameters,
      inputs,
      ...config
    })

    // 3. 提交给调度器
    const agent = await agentScheduler.scheduleTask(task)

    // 4. 等待完成
    const result = await this.waitForCompletion(agent.id)

    return {
      status: result.success ? NodeStatus.SUCCESS : NodeStatus.FAILED,
      output: result.data,
      logs: result.logs
    }
  }
}

class ConditionNodeExecutor implements NodeExecutor {
  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.CONDITION
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, variables } = context
    const { expression } = node.conditionConfig

    // 安全执行条件表达式
    const result = this.safeEvaluate(expression, variables)

    return {
      status: NodeStatus.SUCCESS,
      output: { condition: result }
    }
  }
}

// 执行器注册表
class NodeExecutorRegistry {
  private executors: Map<NodeType, NodeExecutor> = new Map()

  register(executor: NodeExecutor): void {
    executor.canHandle // 注册所有支持的类型
  }

  get(nodeType: NodeType): NodeExecutor | undefined {
    return this.executors.get(nodeType)
  }
}
```

#### 4.2.3 StateMachine (状态机)

**工作流实例状态机**:

```
            [manual/api/scheduled/webhook]
                        │
                        ▼
                   [PENDING]
                        │
              [executeInstance()]
                        │
                        ▼
                   [RUNNING]
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          │             │             │
    [pauseInstance()] [cancel()] [complete/fail]
          │             │             │
          ▼             ▼             ▼
      [PAUSED]     [CANCELLED]   [COMPLETED/FAILED]
          │                           │
          │                    [completed/error]
          │                           │
          └───────────┬───────────────┘
                      │
              [archive()]
                      │
                      ▼
                  [ARCHIVED]
```

**实现**:

```typescript
class WorkflowStateMachine {
  private states: Map<string, Set<string>> = new Map()

  constructor() {
    // 初始化状态转换规则
    this.transitions = {
      pending: ['running', 'cancelled'],
      running: ['paused', 'cancelled', 'completed', 'failed'],
      paused: ['running', 'cancelled'],
      completed: ['archived'],
      failed: ['pending', 'archived'], // failed可以重试
      cancelled: ['archived']
    }
  }

  canTransition(from: InstanceStatus, to: InstanceStatus): boolean {
    return this.transitions[from]?.includes(to) || false
  }

  transition(instance: WorkflowInstance, to: InstanceStatus): void {
    const from = instance.status

    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid state transition: ${from} -> ${to}`)
    }

    instance.status = to

    // 触发状态变更事件
    this.emit('stateChange', { instance, from, to })
  }
}
```

---

## 5. 状态管理方案

### 5.1 Zustand Store架构

#### 5.1.1 Store分层

```typescript
// stores/workflow-editor-store.ts
interface WorkflowEditorState {
  // ========== 数据状态 ==========
  workflows: WorkflowDefinition[]
  currentWorkflow: WorkflowDefinition | null
  instances: WorkflowInstance[]
  currentInstance: WorkflowInstance | null

  // ========== UI状态 ==========
  selectedNodeId: string | null
  selectedEdgeId: string | null
  editingNodeId: string | null
  isExecuting: boolean
  isReadOnly: boolean

  // ========== 画布状态 ==========
  canvas: CanvasState

  // ========== 节点面板 ==========
  nodePalette: {
    visible: boolean
    filter: string
    categories: string[]
  }

  // ========== 历史记录 ==========
  history: {
    past: WorkflowDefinition[]
    future: WorkflowDefinition[]
    currentIndex: number
  }

  // ========== Actions ==========
  // 工作流操作
  createWorkflow: (name: string) => string
  loadWorkflow: (id: string) => void
  saveWorkflow: () => Promise<void>
  deleteWorkflow: (id: string) => void
  duplicateWorkflow: (id: string) => string

  // 节点操作
  addNode: (type: NodeType, position: Point) => void
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void
  deleteNode: (id: string) => void
  duplicateNode: (id: string) => void
  moveNode: (id: string, position: Point) => void

  // 边操作
  addEdge: (edge: WorkflowEdge) => void
  updateEdge: (id: string, updates: Partial<WorkflowEdge>) => void
  deleteEdge: (id: string) => void

  // 选择操作
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  clearSelection: () => void

  // 执行操作
  executeWorkflow: (inputs?: any) => Promise<string>
  pauseWorkflow: (instanceId: string) => void
  resumeWorkflow: (instanceId: string) => void
  cancelWorkflow: (instanceId: string) => void

  // 历史操作
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // 画布操作
  setZoom: (zoom: number) => void
  setPan: (pan: Point) => void
  fitToScreen: () => void
  toggleSnapToGrid: () => void

  // 验证
  validateWorkflow: () => ValidationResult
}

const useWorkflowEditorStore = create<WorkflowEditorState>((set, get) => ({
  // 初始状态
  workflows: [],
  currentWorkflow: null,
  instances: [],
  currentInstance: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  editingNodeId: null,
  isExecuting: false,
  isReadOnly: false,
  canvas: {
    zoom: 1,
    pan: { x: 0, y: 0 },
    gridSize: 20,
    snapToGrid: true
  },
  nodePalette: {
    visible: true,
    filter: '',
    categories: ['control', 'agent', 'data', 'custom']
  },
  history: {
    past: [],
    future: [],
    currentIndex: -1
  },

  // 实现方法...
}))
```

#### 5.1.2 持久化中间件

```typescript
// stores/middleware/persistence.ts
import { persist, createJSONStorage } from 'zustand/middleware'

const persistConfig = {
  name: 'workflow-editor-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    // 只持久化必要的状态
    workflows: state.workflows,
    canvas: state.canvas,
    nodePalette: state.nodePalette
  })
}

export const useWorkflowEditorStore = create(
  persist<WorkflowEditorState>(
    (set, get) => ({
      // ... store implementation
    }),
    persistConfig
  )
)
```

#### 5.1.3 实时同步中间件

```typescript
// stores/middleware/sync.ts
import { socket } from '@/lib/socket'

const syncMiddleware = (config) => (set, get, api) => {
  const newSet = (args) => {
    const oldState = get()
    set(args)
    const newState = get()

    // 检测变化并同步到服务器
    if (oldState.currentWorkflow !== newState.currentWorkflow) {
      socket.emit('workflow:update', newState.currentWorkflow)
    }
  }

  return config(newSet, get, api)
}

// 监听服务器推送
socket.on('workflow:updated', (workflow) => {
  useWorkflowEditorStore.getState().updateWorkflowFromServer(workflow)
})
```

---

## 6. 渲染技术实现

### 6.1 React Flow集成

#### 6.1.1 自定义节点组件

```typescript
// components/workflow/nodes/AgentNode.tsx
import { Handle, Position, NodeProps } from 'reactflow'
import { memo } from 'react'

interface AgentNodeData {
  label: string
  agentConfig: AgentConfig
  status: NodeStatus
  executionResult?: NodeExecutionResult
}

export const AgentNode = memo(({ data, selected }: NodeProps<AgentNodeData>) => {
  return (
    <div className={`
      relative min-w-[200px] rounded-lg border-2 bg-white shadow-md
      ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}
      ${data.status === 'running' ? 'animate-pulse' : ''}
    `}>
      {/* 输入Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      {/* 节点内容 */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`
            w-3 h-3 rounded-full
            ${data.status === 'running' ? 'bg-blue-500' : ''}
            ${data.status === 'success' ? 'bg-green-500' : ''}
            ${data.status === 'failed' ? 'bg-red-500' : ''}
            ${data.status === 'idle' ? 'bg-gray-300' : ''}
          `} />
          <span className="font-medium text-sm">{data.label}</span>
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          <div>Agent: {data.agentConfig.agentType}</div>
          {data.agentConfig.model && (
            <div>Model: {data.agentConfig.model}</div>
          )}
        </div>

        {/* 执行结果预览 */}
        {data.executionResult && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
            {data.executionResult.duration && (
              <div>耗时: {data.executionResult.duration}ms</div>
            )}
          </div>
        )}
      </div>

      {/* 输出Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-400 border-2 border-white"
      />
    </div>
  )
})

AgentNode.displayName = 'AgentNode'
```

#### 6.1.2 自定义边组件

```typescript
// components/workflow/edges/ConditionEdge.tsx
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow'

export const ConditionEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: data.condition === true ? '#22c55e' : '#f59e0b'
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all'
          }}
          className="nodrag nopan"
        >
          <div className={`
            px-2 py-1 rounded text-xs font-medium
            ${data.condition === true ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
          `}>
            {data.label || (data.condition ? 'Yes' : 'No')}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
```

### 6.2 动画效果

#### 6.2.1 执行动画

```typescript
// components/workflow/effects/ExecutionAnimation.tsx
import { useEffect, useRef } from 'react'
import { animated, useSpring } from '@react-spring/web'

export const ExecutionAnimation = ({
  edgeId,
  isActive
}: {
  edgeId: string
  isActive: boolean
}) => {
  const edgeRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    if (!isActive || !edgeRef.current) return

    const edge = edgeRef.current
    const totalLength = edge.getTotalLength()

    edge.style.strokeDasharray = `${totalLength} ${totalLength}`
    edge.style.strokeDashoffset = `${totalLength}`

    // 动画效果
    const animation = edge.animate([
      { strokeDashoffset: totalLength },
      { strokeDashoffset: -totalLength }
    ], {
      duration: 2000,
      iterations: Infinity
    })

    return () => animation.cancel()
  }, [isActive])

  return null
}
```

### 6.3 虚拟化优化

```typescript
// components/workflow/VirtualizedCanvas.tsx
import { useCallback, useMemo } from 'react'
import { ReactFlow, useNodesState, useEdgesState } from 'reactflow'

export const VirtualizedCanvas = ({ workflow }) => {
  // 只渲染可视区域内的节点
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow.edges)

  // 视口变化时过滤节点
  const onViewportChange = useCallback((viewport) => {
    const visibleNodes = filterNodesByViewport(
      nodes,
      viewport,
      { padding: 100 } // 预渲染边界
    )

    setNodes(visibleNodes)
  }, [nodes, setNodes])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onViewportChange={onViewportChange}
      // 性能优化选项
      onlyRenderVisibleElements={true}
      nodesDraggable={!isReadOnly}
      nodesConnectable={!isReadOnly}
      elementsSelectable={!isReadOnly}
    />
  )
}
```

---

## 7. Agent调度集成

### 7.1 集成架构

```
┌──────────────────────────────────────────────────────┐
│              WorkflowEngine                          │
│                                                      │
│  executeNode(nodeId, context)                       │
│         │                                            │
│         │ 检查节点类型                                │
│         ▼                                            │
│  ┌──────────────┐                                   │
│  │ NodeExecutor │                                   │
│  │   Registry   │                                   │
│  └──────┬───────┘                                   │
│         │                                            │
└─────────┼────────────────────────────────────────────┘
          │
          │ Agent节点
          ▼
┌──────────────────────────────────────────────────────┐
│          AgentNodeExecutor                           │
│                                                      │
│  1. 准备输入参数                                      │
│  2. 创建Task                                         │
│  3. 调用AgentScheduler.scheduleTask()               │
│  4. 等待任务完成                                      │
│  5. 返回执行结果                                      │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│             AgentScheduler                           │
│                                                      │
│  - 匹配最合适的Agent                                  │
│  - 考虑负载、能力、性能                               │
│  - 支持手动覆盖                                       │
│  - 支持重试机制                                       │
└──────────────────────────────────────────────────────┘
```

### 7.2 集成实现

```typescript
// lib/workflow/executors/agent-executor.ts
import { NodeExecutor, ExecutionContext, ExecutionResult } from '../types'
import { agentScheduler } from '@/lib/agents/scheduler'

export class AgentNodeExecutor implements NodeExecutor {
  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.AGENT
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, variables, instance } = context
    const config = node.agentConfig!

    try {
      // 1. 准备输入参数
      const inputs = this.prepareInputs(node, variables)

      // 2. 创建Task
      const task = createTask({
        id: `task_${instance.id}_${node.id}`,
        type: config.agentType,
        title: `Workflow Task: ${node.name}`,
        description: config.prompt || node.description,
        priority: this.calculatePriority(instance),
        estimatedDuration: config.timeout || 60, // 分钟
        dependencies: [],
        parameters: {
          ...config.parameters,
          inputs
        },
        metadata: {
          workflowId: instance.workflowId,
          instanceId: instance.id,
          nodeId: node.id
        }
      })

      // 3. 调用调度器
      const decision = await agentScheduler.scheduleTask(task.id)

      if (!decision) {
        throw new Error('No suitable agent available')
      }

      // 4. 监控执行
      const result = await this.monitorExecution(decision.assignedAgent, task)

      // 5. 返回结果
      return {
        status: result.success ? NodeStatus.SUCCESS : NodeStatus.FAILED,
        output: result.data,
        logs: result.logs,
        error: result.error
      }
    } catch (error) {
      return {
        status: NodeStatus.FAILED,
        error: {
          code: 'AGENT_EXECUTION_FAILED',
          message: error.message,
          retryable: true
        }
      }
    }
  }

  private async monitorExecution(
    agentId: string,
    task: Task
  ): Promise<TaskResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Task execution timeout'))
      }, task.estimatedDuration * 60 * 1000)

      // 监听任务完成事件
      const handler = (completedTask: Task) => {
        if (completedTask.id === task.id) {
          clearTimeout(timeout)
          agentScheduler.off('task:completed', handler)
          agentScheduler.off('task:failed', handler)

          resolve({
            success: completedTask.status === 'completed',
            data: completedTask.result,
            logs: completedTask.logs,
            error: completedTask.error
          })
        }
      }

      agentScheduler.on('task:completed', handler)
      agentScheduler.on('task:failed', handler)

      // 启动任务
      agentScheduler.startTask(task.id)
    })
  }
}
```

### 7.3 数据流转换

```typescript
// lib/workflow/data-flow.ts

/**
 * 处理节点间的数据流转
 */
export class DataFlowManager {
  /**
   * 准备节点输入数据
   */
  prepareInputs(
    node: WorkflowNode,
    variables: Record<string, any>
  ): Record<string, any> {
    if (!node.dataBindings?.inputs) {
      return variables
    }

    const inputs: Record<string, any> = {}

    for (const binding of node.dataBindings.inputs) {
      const value = this.resolveBinding(binding.source, variables)

      inputs[binding.target] = binding.transform
        ? this.applyTransform(value, binding.transform)
        : value
    }

    return inputs
  }

  /**
   * 解析数据绑定
   */
  private resolveBinding(
    source: string,
    variables: Record<string, any>
  ): any {
    // 支持点号路径: "node_1.output.result"
    const parts = source.split('.')
    let value = variables

    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined
      }
      value = value[part]
    }

    return value
  }

  /**
   * 应用数据转换
   */
  private applyTransform(value: any, transform: string): any {
    try {
      // 安全执行转换表达式
      const fn = new Function('value', `return ${transform}`)
      return fn(value)
    } catch (error) {
      console.error('Transform error:', error)
      return value
    }
  }
}
```

---

## 8. API设计

### 8.1 REST API

#### 8.1.1 工作流管理

```yaml
# 工作流 CRUD
POST   /api/workflows                    # 创建工作流
GET    /api/workflows                    # 列出工作流
GET    /api/workflows/:id                # 获取工作流
PUT    /api/workflows/:id                # 更新工作流
DELETE /api/workflows/:id                # 删除工作流
POST   /api/workflows/:id/duplicate      # 复制工作流
GET    /api/workflows/:id/versions       # 获取版本历史
POST   /api/workflows/:id/rollback/:v    # 回滚到指定版本

# 工作流验证
POST   /api/workflows/validate           # 验证工作流定义
```

#### 8.1.2 实例管理

```yaml
# 实例控制
POST   /api/instances                    # 创建实例
GET    /api/instances                    # 列出实例
GET    /api/instances/:id                # 获取实例详情
POST   /api/instances/:id/execute        # 执行实例
POST   /api/instances/:id/pause          # 暂停实例
POST   /api/instances/:id/resume         # 恢复实例
POST   /api/instances/:id/cancel         # 取消实例
GET    /api/instances/:id/logs           # 获取执行日志
GET    /api/instances/:id/trace          # 获取执行轨迹
```

#### 8.1.3 节点执行

```yaml
# 节点执行结果
GET    /api/instances/:id/nodes/:nodeId  # 获取节点执行结果
GET    /api/instances/:id/nodes/:nodeId/logs  # 获取节点日志
```

### 8.2 API实现示例

```typescript
// app/api/workflows/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { workflowService } from '@/lib/workflow/service'
import { validateRequest, authenticate } from '@/lib/api/middleware'

export async function GET(request: NextRequest) {
  try {
    // 认证
    const user = await authenticate(request)

    // 查询参数
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 查询工作流
    const result = await workflowService.listWorkflows({
      userId: user.id,
      status: status as WorkflowStatus,
      page,
      limit
    })

    return NextResponse.json({
      success: true,
      data: result.workflows,
      pagination: {
        total: result.total,
        page,
        limit,
        pages: Math.ceil(result.total / limit)
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 认证
    const user = await authenticate(request)

    // 解析请求体
    const body = await request.json()

    // 验证
    const validation = validateRequest(body, workflowCreateSchema)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      )
    }

    // 创建工作流
    const workflow = await workflowService.createWorkflow({
      ...body,
      createdBy: user.id
    })

    return NextResponse.json({
      success: true,
      data: workflow
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

### 8.3 WebSocket事件

```typescript
// 服务端事件
socket.emit('instance:created', instance)
socket.emit('instance:started', instance)
socket.emit('instance:progress', { instanceId, progress })
socket.emit('instance:node:started', { instanceId, nodeId })
socket.emit('instance:node:completed', { instanceId, nodeId, result })
socket.emit('instance:node:failed', { instanceId, nodeId, error })
socket.emit('instance:completed', instance)
socket.emit('instance:failed', { instance, error })

// 客户端订阅
socket.on('instance:progress', (data) => {
  updateInstanceProgress(data.instanceId, data.progress)
})

socket.on('instance:node:completed', (data) => {
  updateNodeResult(data.instanceId, data.nodeId, data.result)
})
```

---

## 9. 安全设计

### 9.1 权限控制

```typescript
// 工作流权限
enum WorkflowPermission {
  READ = 'workflow:read',
  CREATE = 'workflow:create',
  UPDATE = 'workflow:update',
  DELETE = 'workflow:delete',
  EXECUTE = 'workflow:execute',
  ADMIN = 'workflow:admin'
}

// 权限检查中间件
export async function checkWorkflowPermission(
  userId: string,
  workflowId: string,
  permission: WorkflowPermission
): Promise<boolean> {
  const workflow = await workflowService.getWorkflow(workflowId)

  if (!workflow) {
    return false
  }

  // 检查所有者权限
  if (workflow.createdBy === userId) {
    return true
  }

  // 检查RBAC权限
  const hasPermission = await rbacService.checkPermission(
    userId,
    permission,
    { resourceType: 'workflow', resourceId: workflowId }
  )

  return hasPermission
}
```

### 9.2 数据验证

```typescript
// 工作流创建验证
const workflowCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  nodes: z.array(nodeSchema).min(1),
  edges: z.array(edgeSchema),
  config: configSchema.optional()
})

const nodeSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(NodeType),
  name: z.string().min(1).max(100),
  position: z.object({
    x: z.number().min(0).max(10000),
    y: z.number().min(0).max(10000)
  }),
  agentConfig: agentConfigSchema.optional(),
  conditionConfig: conditionConfigSchema.optional(),
  // ... 其他配置
})

// 条件表达式安全检查
function validateConditionExpression(expression: string): boolean {
  // 禁止危险操作
  const dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /require\s*\(/,
    /import\s+/,
    /process\./,
    /global\./,
    /window\./,
    /document\./
  ]

  return !dangerousPatterns.some(pattern => pattern.test(expression))
}
```

### 9.3 执行沙箱

```typescript
// 条件表达式安全执行
import { VM } from 'vm2'

export class SafeExpressionEvaluator {
  private vm: VM

  constructor() {
    this.vm = new VM({
      timeout: 1000, // 1秒超时
      sandbox: {} // 空沙箱，只允许访问传入的变量
    })
  }

  evaluate(expression: string, context: Record<string, any>): any {
    try {
      // 验证表达式安全性
      if (!this.isSafeExpression(expression)) {
        throw new Error('Unsafe expression')
      }

      // 在沙箱中执行
      const script = `
        (function(context) {
          with(context) {
            return ${expression}
          }
        })(context)
      `

      return this.vm.run(script, { context })
    } catch (error) {
      console.error('Expression evaluation failed:', error)
      throw new Error('Expression evaluation failed')
    }
  }

  private isSafeExpression(expression: string): boolean {
    // 白名单模式：只允许特定语法
    const allowedPatterns = [
      /^[\w\s\.\[\]\(\)\+\-\*\/\%\<\>\=\!\&\|\?]*$/,
      /^(context|variables|data|result)/
    ]

    return allowedPatterns.every(pattern => pattern.test(expression))
  }
}
```

### 9.4 审计日志

```typescript
// 审计日志记录
interface AuditLog {
  id: string
  userId: string
  action: string
  resourceType: 'workflow' | 'instance'
  resourceId: string
  details: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: string
}

// 记录工作流操作
await auditService.log({
  userId: user.id,
  action: 'workflow.created',
  resourceType: 'workflow',
  resourceId: workflow.id,
  details: {
    name: workflow.name,
    nodeCount: workflow.nodes.length
  },
  ipAddress: request.ip,
  userAgent: request.headers['user-agent']
})
```

---

## 10. 性能优化策略

### 10.1 前端优化

#### 10.1.1 React性能优化

```typescript
// 使用memo避免不必要的渲染
export const WorkflowNode = memo(({ data, selected }: NodeProps) => {
  // ...
}, (prevProps, nextProps) => {
  // 自定义比较函数
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.status === nextProps.data.status &&
    prevProps.selected === nextProps.selected
  )
})

// 使用useMemo缓存计算结果
const sortedNodes = useMemo(() => {
  return nodes.sort((a, b) => a.position.y - b.position.y)
}, [nodes])

// 使用useCallback缓存回调
const handleNodeClick = useCallback((nodeId: string) => {
  selectNode(nodeId)
}, [selectNode])
```

#### 10.1.2 虚拟化

```typescript
// 大规模节点虚拟化
import { useVirtualizer } from '@tanstack/react-virtual'

export const VirtualizedNodeList = ({ nodes }) => {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: nodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // 节点高度
    overscan: 5 // 预渲染数量
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualNode => (
          <div
            key={virtualNode.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualNode.size}px`,
              transform: `translateY(${virtualNode.start}px)`
            }}
          >
            <NodeComponent node={nodes[virtualNode.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 10.2 后端优化

#### 10.2.1 数据库查询优化

```sql
-- 创建复合索引
CREATE INDEX idx_instances_workflow_status
ON workflow_instances(workflow_id, status, started_at DESC);

-- 使用覆盖索引
CREATE INDEX idx_workflows_list
ON workflows(created_by, status, updated_at DESC)
INCLUDE (name, description, version);

-- 分页优化
SELECT * FROM workflow_instances
WHERE workflow_id = ?
ORDER BY started_at DESC
LIMIT 20 OFFSET 0;
```

#### 10.2.2 缓存策略

```typescript
// Redis缓存层
export class WorkflowCache {
  private redis: Redis
  private prefix = 'workflow:'
  private ttl = 3600 // 1小时

  async getWorkflow(id: string): Promise<WorkflowDefinition | null> {
    const cached = await this.redis.get(`${this.prefix}${id}`)

    if (cached) {
      return JSON.parse(cached)
    }

    // 从数据库加载
    const workflow = await workflowRepository.findById(id)

    if (workflow) {
      await this.redis.setex(
        `${this.prefix}${id}`,
        this.ttl,
        JSON.stringify(workflow)
      )
    }

    return workflow
  }

  async invalidateWorkflow(id: string): Promise<void> {
    await this.redis.del(`${this.prefix}${id}`)
  }
}
```

#### 10.2.3 批量操作优化

```typescript
// 批量查询实例
async function getInstancesWithProgress(instanceIds: string[]) {
  // 使用IN查询
  const instances = await db.query(`
    SELECT i.*,
           COUNT(n.id) as node_count,
           SUM(CASE WHEN n.status = 'completed' THEN 1 ELSE 0 END) as completed_count
    FROM workflow_instances i
    LEFT JOIN node_executions n ON i.id = n.instance_id
    WHERE i.id IN (?)
    GROUP BY i.id
  `, [instanceIds])

  return instances
}
```

### 10.3 实时通信优化

```typescript
// 使用Socket.IO Room优化广播
socket.join(`workflow:${workflowId}`)

// 只向订阅的客户端发送
io.to(`workflow:${workflowId}`).emit('workflow:updated', workflow)

// 批量更新（防抖）
const debouncedEmit = debounce((instanceId, progress) => {
  io.to(`instance:${instanceId}`).emit('instance:progress', progress)
}, 100)
```

---

## 11. 实施计划

### 11.1 阶段划分

#### 第一阶段：核心功能（P0）- 4周

**Week 1-2: 基础架构**
- [ ] 数据模型定义和数据库迁移
- [ ] WorkflowEngine核心实现
- [ ] 基础节点执行器（Start, End, Agent, Condition）
- [ ] Zustand Store搭建
- [ ] 基础API实现（CRUD）

**Week 3-4: 可视化编辑器**
- [ ] React Flow集成
- [ ] 自定义节点组件（4-5种核心节点）
- [ ] 拖拽交互实现
- [ ] 连线系统
- [ ] 节点属性面板

#### 第二阶段：执行监控（P0）- 2周

**Week 5-6: 运行时功能**
- [ ] 实例执行流程
- [ ] 实时状态更新（WebSocket）
- [ ] 执行动画效果
- [ ] 日志流显示
- [ ] 错误处理和重试

#### 第三阶段：高级功能（P1）- 3周

**Week 7: Agent集成**
- [ ] AgentNodeExecutor完善
- [ ] 与AgentScheduler集成
- [ ] 任务队列管理
- [ ] 负载均衡

**Week 8: 版本管理**
- [ ] 版本快照保存
- [ ] 版本历史查看
- [ ] 版本对比
- [ ] 回滚功能

**Week 9: 模板和导入导出**
- [ ] 模板库系统
- [ ] JSON/YAML导入导出
- [ ] 模板分享

#### 第四阶段：优化和测试（P2）- 2周

**Week 10: 性能优化**
- [ ] 虚拟化渲染
- [ ] 缓存优化
- [ ] 数据库查询优化
- [ ] 压力测试

**Week 11: 测试和文档**
- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E测试
- [ ] API文档
- [ ] 用户指南

### 11.2 里程碑

| 里程碑 | 日期 | 交付物 |
|--------|------|--------|
| M1: 核心引擎 | 第2周末 | 可执行的工作流引擎 |
| M2: 可视化编辑器 | 第4周末 | 可视化设计界面 |
| M3: 执行监控 | 第6周末 | 完整的执行流程 |
| M4: Agent集成 | 第7周末 | 与AgentScheduler集成 |
| M5: 生产就绪 | 第11周末 | 可部署的生产版本 |

### 11.3 依赖关系

```
M1 (核心引擎)
 └─→ M2 (可视化编辑器)
      └─→ M3 (执行监控)
           ├─→ M4 (Agent集成)
           └─→ M5 (生产就绪)
```

### 11.4 风险和缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| React Flow学习曲线 | 中 | 高 | 提前技术调研，准备备选方案（SVG） |
| Agent集成复杂度 | 高 | 中 | 清晰定义接口，逐步集成 |
| 性能瓶颈 | 高 | 中 | 尽早进行性能测试，实施优化策略 |
| 并发执行问题 | 高 | 中 | 详细设计并发模型，充分测试 |
| 用户体验不佳 | 中 | 低 | 早期用户测试，快速迭代 |

### 11.5 成功指标

| 指标 | 目标值 | 测量方法 |
|------|--------|---------|
| 工作流创建时间 | <5分钟 | 用户测试 |
| 100节点渲染性能 | <100ms | 性能测试 |
| API响应时间 | <200ms (P95) | APM监控 |
| 实例执行成功率 | >95% | 系统监控 |
| 用户满意度 | >4.0/5.0 | 用户反馈 |

---

## 12. 附录

### 12.1 技术栈总结

```yaml
前端:
  框架: Next.js 16 + React 19
  工作流引擎: React Flow
  状态管理: Zustand
  样式: Tailwind CSS
  动画: Framer Motion
  图标: Lucide React

后端:
  框架: Next.js API Routes
  数据库: SQLite (开发) / PostgreSQL (生产)
  缓存: Redis
  实时通信: Socket.IO
  任务队列: 内置队列

开发工具:
  语言: TypeScript 5
  构建: Turbopack / Webpack
  测试: Vitest + Playwright
  代码质量: ESLint + Prettier
  API文档: OpenAPI 3.0
```

### 12.2 参考资料

- [React Flow官方文档](https://reactflow.dev/)
- [Zustand官方文档](https://github.com/pmndrs/zustand)
- [Next.js App Router文档](https://nextjs.org/docs/app)
- [AgentScheduler架构文档](../lib/agents/scheduler)
- [WorkflowEngine实现](../src/lib/workflow/engine.ts)

### 12.3 术语表

| 术语 | 定义 |
|------|------|
| 工作流 (Workflow) | 由节点和边组成的有向图，定义任务执行流程 |
| 节点 (Node) | 工作流中的执行单元，代表一个具体操作 |
| 边 (Edge) | 节点间的连接，定义执行顺序和数据流转 |
| 实例 (Instance) | 工作流的一次具体执行 |
| Agent | 具有特定能力的AI代理 |
| 调度器 (Scheduler) | 负责分配任务给Agent的系统组件 |

---

**文档结束**

*本架构设计文档将随着开发进展持续更新。如有疑问或建议，请联系架构师团队。*