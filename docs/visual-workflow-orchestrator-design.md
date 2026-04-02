# v1.8.0 Visual Workflow Orchestrator - 架构设计文档

**版本:** 1.0.0  
**日期:** 2026-04-02  
**状态:** 设计完成  
**目标版本:** v1.8.0  

---

## 1. 执行摘要

本文档描述 v1.8.0 Visual Workflow Orchestrator（可视化工作流编排器）的架构设计方案。该版本将在现有工作流引擎基础上进行全面升级，提供更强大的拖拽式可视化编辑能力、自定义节点支持以及基于 A2A Protocol v2.1 的实时协作功能。

### 核心升级目标

1. **现代化编辑器** - 基于 React Flow 的专业级节点编辑器
2. **自定义节点** - 支持动态注册自定义节点类型
3. **实时协作** - 基于 A2A Protocol v2.1 的多人协作编辑
4. **持久化增强** - 支持版本控制、模板市场、云端同步

---

## 2. 现有架构分析

### 2.1 当前实现

现有工作流系统包含以下核心组件：

```
src/lib/workflow/
├── types.ts          # 类型定义 (NodeType, WorkflowDefinition, etc.)
├── engine.ts         # 基础工作流引擎
├── executor.ts       # 增强执行器 (带节点注册表)
├── index.ts          # 模块导出

src/lib/workflow/executors/
├── registry.ts       # 节点执行器注册表
├── start-executor.ts
├── end-executor.ts
├── agent-executor.ts
├── condition-executor.ts
├── parallel-executor.ts
└── wait-executor.ts
```

### 2.2 现有类型体系

```typescript
// 节点类型
enum NodeType {
  START = "start",
  END = "end", 
  AGENT = "agent",
  CONDITION = "condition",
  PARALLEL = "parallel",
  WAIT = "wait",
  HUMAN_INPUT = "human_input"
}

// 工作流定义
interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  config: {
    timeout?: number;
    retryPolicy?: RetryPolicy;
    variables?: Record<string, any>;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}
```

### 2.3 现有局限性

| 方面 | 当前实现 | 改进需求 |
|------|----------|----------|
| 编辑器 | 原生 SVG 实现 | 专业级节点编辑器 |
| 协作 | 无 | 实时多人协作 |
| 节点扩展 | 静态注册 | 动态注册 |
| 版本控制 | 无 | 完整版本历史 |
| 模板系统 | 无 | 模板市场 |

---

## 3. 架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Visual Workflow Orchestrator                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐│
│  │   UI Layer  │   │ State Layer │   │ Engine Layer│   │  Data Layer ││
│  ├─────────────┤   ├─────────────┤   ├─────────────┤   ├─────────────┤│
│  │ React Flow  │◄──│ Zustand     │◄──│ Workflow    │◄──│ Database    ││
│  │ + Custom    │   │ Store       │   │ Engine     │   │ Redis Cache ││
│  │ Nodes       │   │             │   │ Executor   │   │             ││
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘│
│         │                │                │                │             │
│         └────────────────┴────────────────┴────────────────┘           │
│                                    │                                      │
│                    ┌───────────────┴───────────────┐                    │
│                    │     Collaboration Layer       │                    │
│                    │   (A2A Protocol v2.1)         │                    │
│                    └───────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 分层架构

#### 3.2.1 UI 层 (Presentation Layer)

```
UI Layer
├── WorkflowEditor (主编辑器)
│   ├── Canvas (React Flow 画布)
│   │   ├── Background (网格背景)
│   │   ├── Controls (缩放/全屏控制)
│   │   ├── MiniMap (小地图)
│   │   └── EdgeTypes (自定义边类型)
│   ├── NodePanel (左侧节点面板)
│   │   ├── BuiltInNodes (内置节点)
│   │   └── CustomNodes (自定义节点)
│   ├── PropertyPanel (右侧属性面板)
│   │   ├── NodeConfig (节点配置)
│   │   └── EdgeConfig (边配置)
│   └── Toolbar (顶部工具栏)
│       ├── Save/Load (保存/加载)
│       ├── Undo/Redo (撤销/重做)
│       └── Run/Debug (运行/调试)
```

#### 3.2.2 状态层 (State Layer)

```typescript
// 核心状态结构
interface WorkflowEditorState {
  // 画布状态
  canvas: {
    zoom: number;
    pan: { x: number; y: number };
    snapToGrid: boolean;
    gridSize: number;
  };
  
  // 工作流数据
  workflow: {
    id: string;
    name: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    variables: Record<string, any>;
  };
  
  // 选择状态
  selection: {
    selectedNodeIds: string[];
    selectedEdgeIds: string[];
  };
  
  // 协作状态
  collaboration: {
    sessionId: string;
    participants: Participant[];
    cursorPositions: Map<string, { x: number; y: number }>;
  };
  
  // 历史状态 (撤销/重做)
  history: {
    past: HistoryEntry[];
    future: HistoryEntry[];
  };
}
```

#### 3.2.3 引擎层 (Engine Layer)

```
Engine Layer
├── WorkflowEngine (核心引擎)
│   ├── validate() - 工作流验证
│   ├── execute() - 执行工作流
│   ├── pause() - 暂停执行
│   ├── resume() - 恢复执行
│   └── cancel() - 取消执行
│
├── NodeExecutorRegistry (节点执行器注册表)
│   ├── register() - 注册执行器
│   ├── unregister() - 注销执行器
│   └── get() - 获取执行器
│
├── CustomExecutor (自定义执行器接口)
│   └── 用户实现的执行逻辑
```

#### 3.2.4 数据层 (Data Layer)

```
Data Layer
├── WorkflowRepository (工作流仓库)
│   ├── create() - 创建工作流
│   ├── read() - 读取工作流
│   ├── update() - 更新工作流
│   ├── delete() - 删除工作流
│   └── list() - 列表查询
│
├── VersionManager (版本管理)
│   ├── commit() - 提交版本
│   ├── rollback() - 回滚版本
│   └── diff() - 版本对比
│
└── CollaborationService (协作服务)
    ├── connect() - 连接会话
    ├── sync() - 同步状态
    └── broadcast() - 广播操作
```

---

## 4. 核心组件设计

### 4.1 节点编辑器设计

#### 4.1.1 React Flow 集成

```typescript
// 使用 React Flow 构建编辑器
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

// 自定义节点组件
import { AgentNode } from './nodes/AgentNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ParallelNode } from './nodes/ParallelNode';

// 节点类型注册
const nodeTypes = {
  agent: AgentNode,
  condition: ConditionNode,
  parallel: ParallelNode,
  start: StartNode,
  end: EndNode,
  wait: WaitNode,
  humanInput: HumanInputNode,
  // 可扩展的自定义节点
  ...customNodeTypes,
};

// 边类型注册
const edgeTypes = {
  default: DefaultEdge,
  condition: ConditionEdge,
  parallel: ParallelEdge,
};
```

#### 4.1.2 自定义节点架构

```typescript
// 自定义节点接口
interface ICustomNode {
  // 节点类型标识
  type: string;
  
  // 节点显示组件
  Component: React.FC<NodeProps>;
  
  // 节点配置面板
  ConfigPanel?: React.FC<ConfigPanelProps>;
  
  // 节点执行器 (可选)
  executor?: NodeExecutor;
  
  // 节点图标
  icon: React.ReactNode;
  
  // 节点分类
  category: 'flow' | 'agent' | 'logic' | 'io' | 'custom';
}

// 节点组件属性
interface NodeProps {
  id: string;
  data: {
    label: string;
    description?: string;
    config: Record<string, any>;
  };
  selected: boolean;
  dragging: boolean;
  position: { x: number; y: number };
}
```

#### 4.1.3 节点类型分类

| 分类 | 节点类型 | 说明 |
|------|----------|------|
| **Flow** | start, end, wait | 流程控制节点 |
| **Agent** | agent, humanInput | Agent 执行节点 |
| **Logic** | condition, parallel | 逻辑控制节点 |
| **IO** | webhook, http, trigger | 外部集成节点 |
| **Custom** | (用户定义) | 自定义节点 |

---

### 4.2 拖拽式界面架构

#### 4.2.1 拖拽流程

```
┌────────────────────────────────────────────────────────────┐
│                    Drag & Drop Flow                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Drag Start (NodePanel)                                 │
│     └── onDragStart(event, nodeType)                       │
│         └── 设置拖拽数据 (nodeType)                         │
│                                                             │
│  2. Drop (Canvas)                                          │
│     └── onDrop(event)                                      │
│         └── 获取拖拽位置                                    │
│         └── 计算网格对齐位置                                │
│         └── 创建新节点                                      │
│         └── 更新节点状态                                    │
│                                                             │
│  3. Connect                                                │
│     └── onConnect(connection)                              │
│         └── 验证连接有效性                                  │
│         └── 创建边                                          │
│         └── 更新边状态                                      │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

#### 4.2.2 拖拽实现

```typescript
// 拖拽事件处理
const onDragStart = (
  event: React.DragEvent,
  nodeType: string,
  nodeConfig?: Record<string, any>
) => {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.setData(
    'application/nodeConfig', 
    JSON.stringify(nodeConfig || {})
  );
  event.dataTransfer.effectAllowed = 'move';
};

const onDrop = (
  event: React.DragEvent,
  reactFlowWrapper: React.RefObject<HTMLDivElement>
) => {
  event.preventDefault();
  
  const nodeType = event.dataTransfer.getData('application/reactflow');
  const nodeConfig = JSON.parse(
    event.dataTransfer.getData('application/nodeConfig') || '{}'
  );
  
  // 计算位置
  const position = project({
    x: event.clientX - reactFlowBounds.left,
    y: event.clientY - reactFlowBounds.top,
  });
  
  // 网格对齐
  const snappedPosition = snapToGrid(position, gridSize);
  
  // 创建新节点
  const newNode = createNode(nodeType, snappedPosition, nodeConfig);
  setNodes((nds) => nds.concat(newNode));
};
```

---

### 4.3 状态管理方案

#### 4.3.1 Zustand Store 设计

```typescript
// src/lib/workflow/store/workflow-editor-store.ts
import { create } from 'zustand';
import { 
  Node, 
  Edge, 
  Connection, 
  ReactFlowInstance,
  Viewport 
} from 'reactflow';
import { 
  WorkflowDefinition, 
  WorkflowNode, 
  WorkflowEdge 
} from '@/types/workflow';

interface WorkflowEditorState {
  // React Flow 状态
  reactFlowInstance: ReactFlowInstance | null;
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  
  // 工作流定义
  workflow: Partial<WorkflowDefinition>;
  
  // 选择状态
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  
  // 编辑状态
  isDirty: boolean;
  isExecuting: boolean;
  
  // 协作状态
  collaboration: {
    isActive: boolean;
    sessionId: string | null;
    participants: CollaborationParticipant[];
    cursorPositions: Map<string, { x: number; y: number }>;
  };
  
  // 操作方法
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: Partial<Node['data']>) => void;
  addEdge: (connection: Connection) => void;
  removeEdge: (edgeId: string) => void;
  
  // 协作方法
  joinSession: (sessionId: string) => void;
  leaveSession: () => void;
  broadcastChange: (change: EditorChange) => void;
  
  // 历史方法
  undo: () => void;
  redo: () => void;
  pushHistory: (entry: HistoryEntry) => void;
  
  // 工作流方法
  loadWorkflow: (workflow: WorkflowDefinition) => void;
  saveWorkflow: () => Promise<WorkflowDefinition>;
  executeWorkflow: () => Promise<void>;
}

export const useWorkflowEditorStore = create<WorkflowEditorState>(
  (set, get) => ({
    // 初始状态
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNodeIds: [],
    selectedEdgeIds: [],
    isDirty: false,
    isExecuting: false,
    collaboration: {
      isActive: false,
      sessionId: null,
      participants: [],
      cursorPositions: new Map(),
    },
    
    // 实现...
  })
);
```

#### 4.3.2 状态分片策略

为避免状态过大，采用分片策略：

```typescript
// 主状态仓库 - 只包含引用
interface RootWorkflowState {
  editorId: string;           // 编辑器实例ID
  workflowId: string | null;  // 当前工作流ID
  localState: string;          // 本地状态 (加密)
  syncState: string;           // 同步状态 (加密)
}

// 子状态仓库 - 按功能分片
const editorSlices = {
  // 画布状态
  canvasSlice: create((set) => ({
    zoom: 1,
    pan: { x: 0, y: 0 },
    snapToGrid: true,
    gridSize: 20,
  })),
  
  // 节点状态
  nodesSlice: create((set, get) => ({
    nodes: [],
    selectedIds: [],
    addNode: (node) => set({ nodes: [...get().nodes, node] }),
    // ...
  })),
  
  // 协作状态
  collabSlice: create((set) => ({
    sessionId: null,
    participants: [],
    cursors: new Map(),
  })),
};
```

---

### 4.4 持久化策略

#### 4.4.1 多层存储架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Persistence Layers                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Memory  │───►│ Local   │───►│  Redis  │───►│Postgres │  │
│  │ Cache   │    │ Storage │    │  Cache  │    │   DB    │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│       │              │              │              │        │
│       ▼              ▼              ▼              ▼        │
│   Current       Auto-save      Sessions      Permanent      │
│   Editing      & Undo/Redo    & Collab       Storage        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 4.4.2 自动保存策略

```typescript
// 自动保存策略
interface AutoSaveConfig {
  // 启用自动保存
  enabled: boolean;
  
  // 保存间隔 (ms)
  interval: number;
  
  // 保存触发条件
  triggers: {
    onNodeDragEnd: boolean;
    onEdgeConnect: boolean;
    onSelectionChange: boolean;
    onConfigChange: boolean;
  };
  
  // 防抖延迟 (ms)
  debounceDelay: number;
  
  // 最大重试次数
  maxRetries: number;
}

// 默认配置
const defaultAutoSaveConfig: AutoSaveConfig = {
  enabled: true,
  interval: 30000,        // 30秒
  triggers: {
    onNodeDragEnd: true,
    onEdgeConnect: true,
    onSelectionChange: false,
    onConfigChange: true,
  },
  debounceDelay: 2000,    // 2秒防抖
  maxRetries: 3,
};
```

#### 4.4.3 版本控制

```typescript
// 版本管理接口
interface VersionManager {
  // 提交新版本
  commit(
    workflowId: string, 
    message: string,
    snapshot: WorkflowDefinition
  ): Promise<Version>;
  
  // 获取版本历史
  getHistory(workflowId: string): Promise<Version[]>;
  
  // 回滚到指定版本
  rollback(workflowId: string, version: number): Promise<void>;
  
  // 对比版本差异
  diff(v1: number, v2: number): Promise<VersionDiff>;
}

// 版本数据结构
interface Version {
  id: string;
  workflowId: string;
  version: number;
  message: string;
  snapshot: WorkflowDefinition;
  createdAt: string;
  createdBy: string;
  changes: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    edgesAdded: number;
    edgesRemoved: number;
  };
}
```

#### 4.4.4 模板系统

```typescript
// 模板接口
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  
  // 模板内容
  workflow: Omit<WorkflowDefinition, 'id' | 'version'>;
  
  // 元数据
  author: string;
  tags: string[];
  usageCount: number;
  rating: number;
  
  // 可见性
  visibility: 'public' | 'team' | 'private';
}

// 模板API
interface TemplateService {
  list(category?: string): Promise<WorkflowTemplate[]>;
  get(id: string): Promise<WorkflowTemplate>;
  create(template: WorkflowTemplate): Promise<void>;
  update(id: string, template: Partial<WorkflowTemplate>): Promise<void>;
  delete(id: string): Promise<void>;
  
  // 从模板创建工作流
  createWorkflow(templateId: string, name: string): Promise<WorkflowDefinition>;
}
```

---

## 5. 实时协作设计 (A2A Protocol v2.1)

### 5.1 协作架构

```
┌─────────────────────────────────────────────────────────────────┐
│                 Real-time Collaboration Architecture            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Client A              Server              Client B            │
│   ┌───────┐            ┌─────────┐          ┌───────┐          │
│   │Editor │◄──────────►│ WebSocket│◄────────►│Editor │          │
│   │State  │            │  Server  │          │State  │          │
│   └───────┘            └─────────┘          └───────┘          │
│        │                    │                   │               │
│        │                    │                   │               │
│   ┌────▼────┐          ┌────▼────┐         ┌────▼────┐        │
│   │ CRDT    │          │ Session │         │ CRDT    │        │
│   │ Sync    │          │ Manager │         │ Sync    │        │
│   └─────────┘          └─────────┘         └─────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 A2A Protocol v2.1 集成

基于 A2A Protocol v2.1 设计协作消息格式：

```typescript
// 协作消息类型
type CollaborationMessageType = 
  | 'collab.join'      // 加入会话
  | 'collab.leave'     // 离开会话
  | 'collab.cursor'   // 光标移动
  | 'collab.select'   // 选择变更
  | 'collab.node.add'    // 添加节点
  | 'collab.node.update' // 更新节点
  | 'collab.node.delete' // 删除节点
  | 'collab.edge.add'    // 添加边
  | 'collab.edge.delete' // 删除边
  | 'collab.state.sync'; // 状态同步

// 协作消息格式 (A2A v2.1 风格)
interface CollaborationMessage {
  version: '2.1';
  id: string;
  type: CollaborationMessageType;
  source: string;           // 发送者ID
  sessionId: string;        // 会话ID
  timestamp: number;
  payload: CollaborationPayload;
}

interface NodeChangePayload {
  nodeId: string;
  changes: Partial<WorkflowNode> | null;  // null 表示删除
  position?: { x: number; y: number };
}

interface CursorPayload {
  userId: string;
  userName: string;
  userColor: string;
  position: { x: number; y: number };
}
```

### 5.3 冲突解决策略

使用 CRDT (Conflict-free Replicated Data Types) 解决冲突：

```typescript
// 简化的 CRDT 实现
class WorkflowCRDT {
  private nodes: Map<string, CRDTNode>;
  private edges: Map<string, CRDTEdge>;
  private vectorClock: Map<string, number>;
  
  // 节点操作
  addNode(node: WorkflowNode, userId: string): Operation {
    const op: Operation = {
      type: 'add_node',
      entity: 'node',
      id: node.id,
      data: node,
      timestamp: this.incrementClock(userId),
      userId,
    };
    return op;
  }
  
  updateNode(nodeId: string, changes: Partial<WorkflowNode>, userId: string): Operation {
    return {
      type: 'update_node',
      entity: 'node',
      id: nodeId,
      changes,
      timestamp: this.incrementClock(userId),
      userId,
    };
  }
  
  // 合并远程操作
  merge(remoteOps: Operation[]): void {
    for (const op of remoteOps) {
      if (this.isNewer(op)) {
        this.apply(op);
      }
    }
  }
}
```

### 5.4 实时状态同步

```typescript
// 状态同步服务
class CollaborationService {
  private ws: WebSocket;
  private sessionId: string;
  private userId: string;
  private pendingOps: Operation[] = [];
  private acknowledgedOps: Set<string> = new Set();
  
  // 发送本地变更
  broadcastChange(operation: Operation): void {
    // 添加到待确认队列
    this.pendingOps.push(operation);
    
    // 发送消息
    this.ws.send(JSON.stringify({
      version: '2.1',
      type: 'collab.operation',
      sessionId: this.sessionId,
      source: this.userId,
      payload: operation,
    }));
  }
  
  // 处理远程消息
  handleMessage(message: CollaborationMessage): void {
    switch (message.type) {
      case 'collab.operation':
        this.applyRemoteOperation(message.payload);
        break;
      case 'collab.cursor':
        this.updateRemoteCursor(message.payload);
        break;
      case 'collab.state.sync':
        this.fullStateSync(message.payload);
        break;
    }
  }
}
```

---

## 6. 组件清单

### 6.1 目录结构

```
src/
├── components/
│   └── workflow/
│       ├── editor/
│       │   ├── WorkflowEditor.tsx      # 主编辑器组件
│       │   ├── Canvas.tsx               # 画布组件
│       │   ├── NodePanel.tsx             # 节点面板
│       │   ├── PropertyPanel.tsx        # 属性面板
│       │   ├── Toolbar.tsx               # 工具栏
│       │   └── index.ts
│       │
│       ├── nodes/                        # 节点组件
│       │   ├── BaseNode.tsx              # 基础节点
│       │   ├── AgentNode.tsx             # Agent节点
│       │   ├── ConditionNode.tsx         # 条件节点
│       │   ├── ParallelNode.tsx          # 并行节点
│       │   ├── StartNode.tsx             # 开始节点
│       │   ├── EndNode.tsx               # 结束节点
│       │   ├── WaitNode.tsx              # 等待节点
│       │   ├── HumanInputNode.tsx        # 人工输入节点
│       │   └── index.ts
│       │
│       ├── edges/                         # 边组件
│       │   ├── DefaultEdge.tsx           # 默认边
│       │   ├── ConditionEdge.tsx         # 条件边
│       │   └── index.ts
│       │
│       └── dialogs/                      # 对话框
│           ├── SaveDialog.tsx            # 保存对话框
│           ├── TemplateDialog.tsx       # 模板对话框
│           └── SettingsDialog.tsx        # 设置对话框
│
├── lib/
│   └── workflow/
│       ├── store/
│       │   └── workflow-editor-store.ts  # Zustand 状态管理
│       │
│       ├── engine/
│       │   ├── workflow-engine.ts        # 工作流引擎
│       │   ├── executor.ts               # 执行器
│       │   └── types.ts                  # 引擎类型
│       │
│       ├── collaboration/                 # 协作模块
│       │   ├── CollaborationService.ts   # 协作服务
│       │   ├── CRDT.ts                   # CRDT 实现
│       │   └── cursor-manager.ts         # 光标管理
│       │
│       ├── persistence/                  # 持久化模块
│       │   ├── WorkflowRepository.ts     # 工作流仓库
│       │   ├── VersionManager.ts        # 版本管理
│       │   └── TemplateService.ts        # 模板服务
│       │
│       ├── node-registry.ts              # 节点注册表
│       └── index.ts
│
├── types/
│   └── workflow.ts                        # 类型定义 (已存在)
│
└── app/
    └── api/
        └── workflow/
            ├── route.ts                   # 工作流CRUD
            ├── [id]/
            │   ├── route.ts
            │   ├── run/
            │   │   └── route.ts          # 执行工作流
            │   └── versions/
            │       └── route.ts           # 版本管理
            └── templates/
                └── route.ts                # 模板API
```

### 6.2 组件说明

| 组件 | 职责 | 依赖 |
|------|------|------|
| WorkflowEditor | 主编辑器容器，状态协调 | ReactFlow, Zustand |
| Canvas | 画布渲染，交互处理 | ReactFlow |
| NodePanel | 节点列表展示 | 自定义组件 |
| PropertyPanel | 节点/边属性编辑 | 动态表单组件 |
| Toolbar | 全局操作按钮 | UI组件库 |
| AgentNode | Agent节点渲染 | BaseNode |
| ConditionNode | 条件节点渲染 | BaseNode |
| WorkflowEditorStore | 全局状态管理 | Zustand |
| CollaborationService | 实时协作 | WebSocket |
| WorkflowRepository | 数据持久化 | Database |

---

## 7. API 设计

### 7.1 工作流 API

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | /api/workflow | 创建工作流 |
| GET | /api/workflow | 列表查询 |
| GET | /api/workflow/[id] | 获取详情 |
| PUT | /api/workflow/[id] | 更新工作流 |
| DELETE | /api/workflow/[id] | 删除工作流 |
| POST | /api/workflow/[id]/run | 执行工作流 |
| GET | /api/workflow/[id]/runs | 运行历史 |
| POST | /api/workflow/[id]/versions | 提交版本 |
| GET | /api/workflow/[id]/versions | 版本列表 |
| POST | /api/workflow/[id]/rollback | 回滚版本 |

### 7.2 模板 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /api/workflow/templates | 模板列表 |
| GET | /api/workflow/templates/[id] | 模板详情 |
| POST | /api/workflow/templates | 创建模板 |
| PUT | /api/workflow/templates/[id] | 更新模板 |
| DELETE | /api/workflow/templates/[id] | 删除模板 |
| POST | /api/workflow/templates/[id]/use | 使用模板创建 |

### 7.3 协作 API

| 方法 | 端点 | 描述 |
|------|------|------|
| WS | /api/workflow/[id]/collab | WebSocket协作 |

---

## 8. 技术选型

### 8.1 核心技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| React Flow | 节点编辑器 | ^11.x |
| Zustand | 状态管理 | ^5.x |
| React Query | 服务端状态 | ^5.x |
| Socket.io | WebSocket | ^4.x |
| Prisma | ORM | ^6.x |
| Redis | 缓存/会话 | ^7.x |

### 8.2 React Flow 配置

```typescript
// React Flow 配置
const reactFlowConfig = {
  // 节点
  nodesDraggable: true,
  nodesConnectable: true,
  nodesFocusable: true,
  nodeTypes: customNodeTypes,
  
  // 边
  edgesDraggable: true,
  edgesFocusable: true,
  edgeTypes: customEdgeTypes,
  
  // 画布
  fitView: true,
  snapToGrid: true,
  snapGrid: [20, 20],
  connectionLineType: 'smoothstep',
  defaultEdgeOptions: {
    type: 'default',
    animated: false,
  },
  
  // 交互
  panOnDrag: true,
  selectionOnDrag: false,
  zoomOnScroll: true,
  minZoom: 0.3,
  maxZoom: 3,
  
  // 性能
  deleteKeyCode: ['Backspace', 'Delete'],
  multiSelectionKeyCode: 'Shift',
};
```

---

## 9. 性能优化

### 9.1 渲染优化

```typescript
// 使用 React.memo 优化节点渲染
const AgentNode = React.memo<NodeProps>(({ data, selected }) => {
  return (
    <div className={cn('agent-node', { selected })}>
      <NodeIcon type="agent" />
      <NodeLabel>{data.label}</NodeLabel>
      <NodeStatus status={data.status} />
    </div>
  );
}, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.data.label === next.data.label &&
    prev.data.status === next.data.status
  );
});
```

### 9.2 虚拟化支持

```typescript
// 对于大量节点的场景，支持虚拟化
import { useVirtualizer } from '@tanstack/react-virtual';

// 节点数量超过500时启用虚拟化
const useNodeVirtualization = (nodes: Node[]) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: nodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });
  
  return { parentRef, virtualizer };
};
```

### 9.3 防抖与节流

```typescript
import { useDebouncedCallback } from 'use-debounce';

// 自动保存防抖
const debouncedSave = useDebouncedCallback(
  async (workflow: WorkflowDefinition) => {
    await workflowRepository.update(workflow.id, workflow);
  },
  2000
);

// 缩放变化节流
const handleZoom = useThrottleCallback(
  (zoom: number) => {
    analytics.track('canvas_zoom', { zoom });
  },
  1000
);
```

---

## 10. 安全性考虑

### 10.1 权限控制

```typescript
// 工作流权限
enum WorkflowPermission {
  VIEW = 'workflow:view',
  EDIT = 'workflow:edit',
  EXECUTE = 'workflow:execute',
  MANAGE = 'workflow:manage',
  DELETE = 'workflow:delete',
}

// 权限检查
const checkWorkflowPermission = async (
  userId: string,
  workflowId: string,
  permission: WorkflowPermission
): Promise<boolean> => {
  const user = await userService.get(userId);
  const workflow = await workflowRepository.get(workflowId);
  
  // 所有者拥有所有权限
  if (workflow.ownerId === userId) return true;
  
  // 检查用户角色权限
  return hasPermission(user.role, permission);
};
```

### 10.2 输入验证

```typescript
import { z } from 'zod';

// 节点配置验证
const nodeConfigSchema = z.object({
  label: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  timeout: z.number().min(1).max(3600).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(10),
    backoff: z.enum(['fixed', 'exponential']),
  }).optional(),
});

// 工作流验证
const workflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  nodes: z.array(nodeSchema).min(1),
  edges: z.array(edgeSchema),
});
```

---

## 11. 迁移计划

### 11.1 渐进式迁移策略

```
Phase 1 (Week 1-2): 基础架构
├── 设置项目结构
├── 集成 React Flow
├── 实现 Zustand store
└── 基础 CRUD API

Phase 2 (Week 3-4): 编辑器功能
├── 自定义节点组件
├── 拖拽功能
├── 属性面板
└── 撤销/重做

Phase 3 (Week 5-6): 持久化
├── 数据库Schema更新
├── 版本控制
└── 自动保存

Phase 4 (Week 7-8): 协作功能
├── WebSocket集成
├── 实时同步
└── 冲突解决

Phase 5 (Week 9-10): 优化与测试
├── 性能优化
├── 端到端测试
└── 文档编写
```

### 11.2 向后兼容性

- 保留现有 `/api/workflow` 接口
- 新编辑器作为独立路由 `/workflow/edit/[id]`
- 数据模型保持兼容
- 支持旧版本导入

---

## 12. 总结

本文档详细描述了 v1.8.0 Visual Workflow Orchestrator 的架构设计方案。核心改进包括：

1. **现代化编辑器** - 基于 React Flow 提供专业级拖拽编辑体验
2. **可扩展节点系统** - 支持动态注册自定义节点类型
3. **实时协作** - 基于 A2A Protocol v2.1 实现多人同时编辑
4. **完善持久化** - 支持版本控制、模板系统和自动保存

该架构设计遵循以下原则：
- **渐进式增强** - 平滑迁移现有功能
- **模块化设计** - 组件松耦合，易于维护
- **性能优先** - 优化大场景下的渲染性能
- **安全可靠** - 完善的权限控制和输入验证

---

**文档版本:** 1.0.0  
**创建日期:** 2026-04-02  
**下次评审:** 2026-04-09
