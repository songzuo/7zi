# 7zi v1.5.0 工作流编排器 - 架构设计文档

## 概述

工作流编排器是 7zi Multi-Agent 协作系统的核心 UI 组件，提供可视化的拖拽式工作流设计能力。

## 创建的文件清单

### 1. 类型定义 (`src/types/workflow.ts`)

**文件路径**: `/root/.openclaw/workspace/src/types/workflow.ts`

**主要类型**:

- `NodeType` - 节点类型枚举（START, END, AGENT, CONDITION, PARALLEL, WAIT, HUMAN_INPUT）
- `NodeStatus` - 节点状态枚举（IDLE, RUNNING, SUCCESS, FAILED, SKIPPED, PENDING）
- `EdgeType` - 边类型枚举（SEQUENCE, CONDITION, PARALLEL, DEFAULT）
- `WorkflowStatus` - 工作流状态枚举（DRAFT, ACTIVE, PAUSED, ARCHIVED）
- `InstanceStatus` - 运行实例状态枚举（PENDING, RUNNING, COMPLETED, FAILED, CANCELLED）

**数据模型**:

- `WorkflowNode` - 工作流节点定义
- `WorkflowEdge` - 工作流边定义
- `WorkflowDefinition` - 工作流定义
- `WorkflowInstance` - 工作流运行实例
- `NodeExecutionResult` - 节点执行结果
- `WorkflowHistory` - 历史记录
- `WorkflowStatistics` - 统计信息

### 2. 工作流引擎 (`src/lib/workflow/engine.ts`)

**文件路径**: `/root/.openclaw/workspace/src/lib/workflow/engine.ts`

**核心功能**:

- `registerWorkflow()` - 注册工作流定义
- `validateWorkflow()` - 验证工作流（检查节点、边、连接完整性）
- `createInstance()` - 创建运行实例
- `executeInstance()` - 执行工作流实例
- `executeNode()` - 执行单个节点（支持顺序、条件、并行）
- `cancelInstance()` - 取消实例运行
- `getStatistics()` - 获取统计信息

**设计特点**:

- 状态驱动执行模式
- 支持条件分支和并行执行
- 内置重试机制和超时控制
- 完整的错误处理和状态追踪

### 3. 画布组件 (`src/components/workflow/designer/canvas.tsx`)

**文件路径**: `/root/.openclaw/workspace/src/components/workflow/designer/canvas.tsx`

**功能特性**:

- 缩放（滚轮/按钮）- 支持 30% - 300%
- 拖拽画布（中键/Alt+左键）
- 网格对齐（20px 网格，可开关）
- 节点拖拽移动
- 节点选择和删除
- 连线绘制
- 适应屏幕（自动缩放和居中）
- 导出图片（预留接口）

**暴露方法** (via ref):

- `zoomIn()` - 放大
- `zoomOut()` - 缩小
- `fitToScreen()` - 适应屏幕
- `exportAsImage()` - 导出图片

### 4. 节点组件 (`src/components/workflow/designer/node.tsx`)

**文件路径**: `/root/.openclaw/workspace/src/components/workflow/designer/node.tsx`

**组件**:

- `WorkflowNodeComponent` - 单个节点渲染
  - 不同节点类型有不同的图标和颜色
  - 支持状态指示器（运行时可视化）
  - 输入/输出连接点（用于连线）
  - 选中状态高亮

- `NodeTypeSelector` - 节点类型选择器
  - 支持拖拽添加新节点
  - 提供 5 种节点类型

**节点类型支持**:

1. START - 开始节点（绿色）
2. END - 结束节点（红色）
3. AGENT - Agent 节点（蓝色）
4. CONDITION - 条件节点（黄色，菱形标记）
5. PARALLEL - 并行节点（紫色）
6. WAIT - 等待节点（灰色）
7. HUMAN_INPUT - 人工输入节点（橙色）

### 5. 边组件 (`src/components/workflow/designer/edge.tsx`)

**文件路径**: `/root/.openclaw/workspace/src/components/workflow/designer/edge.tsx`

**组件**:

- `WorkflowEdgeComponent` - 边渲染
  - 贝塞尔曲线或直线
  - 不同类型有不同的颜色和样式
  - 条件标签显示（true/false）
  - 删除按钮（hover 显示）

- `EdgeTypeSelector` - 边类型选择器

**边类型支持**:

1. SEQUENCE - 顺序连接（灰色实线）
2. CONDITION - 条件连接（绿色 true / 红色 false）
3. PARALLEL - 并行连接（紫色虚线）
4. DEFAULT - 默认分支（灰色虚线）

### 6. 工具栏组件 (`src/components/workflow/designer/toolbar.tsx`)

**文件路径**: `/root/.openclaw/workspace/src/components/workflow/designer/toolbar.tsx`

**组件**:

- `DesignerToolbar` - 顶部工具栏
  - 缩放控制（+ / -）
  - 适应屏幕
  - 网格开关
  - 导出图片

- `NodeToolbar` - 左侧节点工具栏
  - 节点类型列表
  - 支持点击或拖拽添加

- `PropertyPanel` - 右侧属性面板
  - 动态显示选中节点的属性
  - 支持编辑节点名称、配置等
  - 根据节点类型显示不同的配置项

### 7. 运行实例查看器 (`src/components/workflow/designer/instance-viewer.tsx`)

**文件路径**: `/root/.openclaw/workspace/src/components/workflow/designer/instance-viewer.tsx`

**组件**:

- `InstanceViewer` - 实例详情查看器
  - 状态指示器
  - 进度条
  - 节点执行列表（可展开查看详情）
  - 时间信息
  - 错误信息显示
  - 取消/重试按钮

- `InstanceList` - 实例列表
  - 状态颜色标识
  - 进度百分比
  - 时间戳

### 8. 设计器主组件 (`src/components/workflow/designer/index.ts`)

**文件路径**: `/root/.openclaw/workspace/src/components/workflow/designer/index.ts`

**主组件**: `WorkflowDesigner`

整合所有子组件：

- 画布（中央主要区域）
- 左侧节点工具栏
- 右侧属性面板
- 顶部工具栏（画布内置）

### 9. API 路由

#### 创建工作流 (`src/app/api/workflow/route.ts`)

**文件路径**: `/root/.openclaw/workspace/src/app/api/workflow/route.ts`

**端点**:

- `POST /api/workflow` - 创建工作流
- `GET /api/workflow` - 获取工作流列表

#### 工作流详情 (`src/app/api/workflow/[id]/route.ts`)

**文件路径**: `/root/.openclaw/workspace/src/app/api/workflow/[id]/route.ts`

**端点**:

- `GET /api/workflow/[id]` - 获取工作流详情
- `PUT /api/workflow/[id]` - 更新工作流
- `DELETE /api/workflow/[id]` - 删除工作流

#### 运行工作流 (`src/app/api/workflow/[id]/run/route.ts`)

**文件路径**: `/root/.openclaw/workspace/src/app/api/workflow/[id]/run/route.ts`

**端点**:

- `POST /api/workflow/[id]/run` - 运行工作流
- `GET /api/workflow/[id]/runs` - 获取运行历史

### 10. 模块导出

- `src/types/index.ts` - 更新类型导出
- `src/lib/workflow/index.ts` - 工作流模块导出

## 架构设计决策

### 1. 技术栈选择

- **React 19** - 最新稳定版本，提供更好的性能和开发体验
- **TypeScript** - 类型安全，减少运行时错误
- **SVG** - 用于画布绘制，提供高性能的矢量图形
- **现有 UI 组件库** - 复用项目已有的组件和工具

### 2. 状态管理

- **画布状态** - 组件内部管理（zoom, pan, gridSize, snapToGrid）
- **工作流数据** - 由父组件管理并通过 props 传递（受控组件模式）
- **选择状态** - selectedNodeId 由父组件管理
- **运行时状态** - WorkflowEngine 内部管理实例状态

### 3. 组件层次结构

```
WorkflowDesigner (主容器)
├── WorkflowCanvas (画布)
│   ├── SVG
│   │   ├── Grid (网格)
│   │   ├── Edges (边)
│   │   │   └── WorkflowEdgeComponent
│   │   └── Nodes (节点)
│   │       └── WorkflowNodeComponent
│   └── DesignerToolbar (工具栏)
├── NodeToolbar (左侧工具栏)
└── PropertyPanel (右侧属性面板)
```

### 4. 设计模式

- **受控组件模式** - 所有工作流数据由父组件管理
- **单例模式** - WorkflowEngine 使用单例模式，确保全局唯一
- **策略模式** - 不同节点类型有不同的执行逻辑
- **观察者模式** - 通过回调函数实现事件通知

### 5. 性能优化考虑

- **SVG 渲染** - 使用 SVG 而非 DOM 元素，提高大规模节点渲染性能
- **事件委托** - 画布级别的事件处理，减少事件监听器数量
- **memo 化** - 组件使用 React.memo 避免不必要的重新渲染
- **虚拟化预留** - 架构支持后续实现虚拟滚动（大量节点场景）

### 6. 可扩展性设计

- **节点类型扩展** - 通过 NodeType 枚举和配置对象轻松添加新类型
- **React Flow 集成** - 组件设计考虑了后续集成 React Flow 的可能性
- **插件化** - 节点执行逻辑可独立扩展
- **自定义渲染** - 支持自定义节点和边的渲染样式

### 7. 错误处理

- **验证层** - WorkflowEngine.validateWorkflow 提供完整的验证逻辑
- **错误边界** - 组件级错误边界（后续可添加）
- **错误状态** - 完整的错误状态管理（NodeExecutionResult.error, WorkflowInstance.error）
- **重试机制** - 内置重试策略配置

### 8. 数据持久化

- **API 层** - 提供完整的 CRUD API
- **运行时状态** - WorkflowEngine 内存中管理实例状态（可扩展为持久化到数据库）
- **历史记录** - 支持查询运行历史

## 组件清单

### 核心组件 (6)

1. **WorkflowCanvas** - 画布组件
2. **WorkflowNodeComponent** - 节点组件
3. **WorkflowEdgeComponent** - 边组件
4. **DesignerToolbar** - 工具栏组件
5. **InstanceViewer** - 实例查看器
6. **InstanceList** - 实例列表

### 辅助组件 (3)

1. **NodeTypeSelector** - 节点类型选择器
2. **EdgeTypeSelector** - 边类型选择器
3. **PropertyPanel** - 属性面板

### 布局组件 (3)

1. **WorkflowDesigner** - 设计器主组件
2. **NodeToolbar** - 节点工具栏
3. **DesignerToolbar** - 设计器工具栏

### 工具类 (1)

1. **WorkflowEngine** - 工作流执行引擎

## 节点类型支持

| 类型        | 图标 | 颜色 | 用途              |
| ----------- | ---- | ---- | ----------------- |
| START       | ▶    | 绿色 | 工作流入口        |
| END         | ■    | 红色 | 工作流出口        |
| AGENT       | 🤖   | 蓝色 | 执行 Agent 任务   |
| CONDITION   | ⚡   | 黄色 | 条件分支判断      |
| PARALLEL    | ⚡   | 紫色 | 并行执行多个分支  |
| WAIT        | ⏱    | 灰色 | 等待指定时间      |
| HUMAN_INPUT | 👤   | 橙色 | 等待人工输入/审批 |

## 边类型支持

| 类型      | 颜色  | 样式 | 用途     |
| --------- | ----- | ---- | -------- |
| SEQUENCE  | 灰色  | 实线 | 顺序执行 |
| CONDITION | 绿/红 | 实线 | 条件分支 |
| PARALLEL  | 紫色  | 虚线 | 并行执行 |
| DEFAULT   | 灰色  | 虚线 | 默认分支 |

## API 端点汇总

| 方法   | 端点                      | 描述           |
| ------ | ------------------------- | -------------- |
| POST   | `/api/workflow`           | 创建工作流     |
| GET    | `/api/workflow`           | 获取工作流列表 |
| GET    | `/api/workflow/[id]`      | 获取工作流详情 |
| PUT    | `/api/workflow/[id]`      | 更新工作流     |
| DELETE | `/api/workflow/[id]`      | 删除工作流     |
| POST   | `/api/workflow/[id]/run`  | 运行工作流     |
| GET    | `/api/workflow/[id]/runs` | 获取运行历史   |

## 后续集成建议

### 1. React Flow 集成

- 当前使用原生 SVG 实现，可无缝迁移到 React Flow
- React Flow 提供更强大的交互和内置功能

### 2. 数据库集成

- 使用 PostgreSQL/MySQL 存储工作流定义
- 使用 Redis 缓存运行时状态
- 实现工作流版本管理

### 3. WebSocket 实时更新

- 实时推送运行状态
- 多人协作编辑
- 实时日志流

### 4. 高级功能

- 工作流模板库
- 节点 marketplace
- 工作流复制/导入导出
- 可视化调试器
- 性能分析和监控

## 文件统计

- **类型定义**: 1 文件 (workflow.ts - 5773 bytes)
- **引擎逻辑**: 1 文件 (engine.ts - 12288 bytes)
- **UI 组件**: 6 文件 (~47740 bytes)
- **API 路由**: 3 文件 (~15560 bytes)
- **导出文件**: 2 文件 (~400 bytes)

**总计**: 13 个文件，约 81.8 KB 代码

## 使用示例

### 基本使用

```tsx
import { WorkflowDesigner } from '@/components/workflow/designer'

function MyWorkflowEditor() {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selectedId, setSelectedId] = useState()

  return (
    <WorkflowDesigner
      nodes={nodes}
      edges={edges}
      selectedNodeId={selectedId}
      onNodeSelect={setSelectedId}
      onNodeAdd={(type, pos) => {
        // 添加新节点
      }}
      onEdgeAdd={(source, target) => {
        // 添加新边
      }}
    />
  )
}
```

### 运行工作流

```tsx
import { workflowEngine } from '@/lib/workflow'

// 运行工作流
const instance = workflowEngine.createInstance(workflowId, inputs)
await workflowEngine.executeInstance(instance.id)

// 查看状态
const status = workflowEngine.getInstance(instance.id)
console.log(status)
```

---

**架构设计完成时间**: 2026-03-31
**设计版本**: 1.0.0
**技术栈**: React 19 + TypeScript + SVG
