# v1.8.0 用户体验审计报告

**审计日期**: 2026-04-02
**审计范围**: Visual Workflow Orchestrator v1.8.0
**审计人员**: AI 子代理 (minimax)

---

## 📊 执行摘要

### 总体评分: 7.2/10

| 维度           | 评分 | 说明                             |
| -------------- | ---- | -------------------------------- |
| **组件设计**   | 8/10 | 架构清晰，类型定义完善           |
| **UI 一致性**  | 7/10 | 基本一致，但缺少设计系统         |
| **交互流畅性** | 7/10 | 核心交互流畅，但缺少反馈         |
| **错误处理**   | 6/10 | 有基础错误处理，但用户友好度不足 |
| **移动端适配** | 5/10 | 几乎未适配移动端                 |
| **可访问性**   | 6/10 | 基础支持，但不够完善             |

---

## 1. 组件设计审计

### 1.1 WorkflowCanvas.tsx

**评分: 8/10**

#### ✅ 优点

1. **类型安全**: 完整的 TypeScript 类型定义，包括 `WorkflowNodeType`, `NodeState`, `WorkflowNodeData` 等
2. **职责分离**: 清晰的接口定义 (`WorkflowCanvasProps`, `WorkflowCanvasRef`)
3. **状态管理**: 使用 React Hooks (`useState`, `useCallback`, `useMemo`) 进行状态管理
4. **性能优化**: 使用 `useMemo` 缓存渲染结果，避免不必要的重渲染
5. **纯 CSS 实现**: 无外部 UI 库依赖，减少包体积

#### ⚠️ 问题

1. **组件过大**: 单文件 600+ 行，建议拆分为子组件
2. **魔法数字**: 硬编码的尺寸常量 (`NODE_WIDTH = 180`, `NODE_HEIGHT = 80`)
3. **颜色配置**: 颜色值硬编码，未使用 CSS 变量或主题系统
4. **缺少 PropTypes/运行时验证**: 仅依赖 TypeScript 编译时检查

#### 📝 改进建议

```typescript
// 建议 1: 提取常量配置
export const WORKFLOW_CONFIG = {
  NODE: {
    WIDTH: 180,
    HEIGHT: 80,
    MIN_WIDTH: 120,
    MAX_WIDTH: 240,
  },
  GRID: {
    SIZE: 20,
    MIN_SIZE: 10,
    MAX_SIZE: 40,
  },
  ZOOM: {
    MIN: 0.3,
    MAX: 3,
    STEP: 1.2,
  },
} as const

// 建议 2: 使用 CSS 变量
const NODE_COLORS: Record<WorkflowNodeType, { bg: string; border: string; text: string }> = {
  start: { bg: 'var(--color-node-start-bg)', border: 'var(--color-node-start-border)', text: 'var(--color-node-start-text)' },
  // ...
}

// 建议 3: 拆分子组件
const WorkflowToolbar = ({ zoom, onZoomIn, onZoomOut, ... }: ToolbarProps) => { /* ... */ }
const WorkflowGrid = ({ zoom, panX, panY, gridSize }: GridProps) => { /* ... */ }
const WorkflowNode = ({ node, isSelected, onMouseDown, ... }: NodeProps) => { /* ... */ }
const WorkflowEdge = ({ edge, sourceNode, targetNode }: EdgeProps) => { /* ... */ }
```

---

### 1.2 VisualWorkflowOrchestrator.ts

**评分: 8/10**

#### ✅ 优点

1. **清晰的 API 设计**: 方法命名语义化 (`createInstance`, `execute`, `validateWorkflow`)
2. **事件驱动架构**: 支持事件监听器，便于扩展
3. **完整的生命周期管理**: 支持 create, execute, cancel, pause, resume
4. **类型安全**: 完整的 TypeScript 类型定义
5. **可扩展性**: 支持自定义执行器注册 (`registerExecutor`)

#### ⚠️ 问题

1. **单例模式**: 导出单例 `visualWorkflowOrchestrator`，限制了多实例场景
2. **错误信息不够友好**: 错误消息过于技术化，缺少用户友好的提示
3. **缺少进度回调**: 只有事件系统，没有直接的进度回调 API
4. **条件评估安全性**: 使用 `new Function()` 评估条件，存在安全风险

#### 📝 改进建议

```typescript
// 建议 1: 移除单例，改为工厂模式
export function createOrchestrator(config?: OrchestratorConfig): VisualWorkflowOrchestrator {
  return new VisualWorkflowOrchestrator(config)
}

// 建议 2: 添加进度回调接口
export interface ProgressCallback {
  (progress: {
    instanceId: string
    completed: number
    total: number
    percentage: number
    currentNode?: string
  }): void
}

class VisualWorkflowOrchestrator {
  private progressCallbacks: Set<ProgressCallback> = new Set()

  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.add(callback)
  }

  private updateProgress(instanceId: string): void {
    const instance = this.instances.get(instanceId)
    if (!instance) return

    this.progressCallbacks.forEach(cb => {
      cb({
        instanceId,
        completed: instance.progress.completed,
        total: instance.progress.total,
        percentage: instance.progress.percentage,
        currentNode: this.getCurrentNode(instanceId),
      })
    })
  }
}

// 建议 3: 使用安全的表达式解析器
import { ExpressionParser } from '@/lib/expression-parser'

private evaluateCondition(condition: string, context: ExecutionContext): boolean {
  try {
    const parser = new ExpressionParser(context.variables)
    return parser.evaluate(condition)
  } catch (error) {
    this.addLog(context, 'error', `Condition evaluation failed: ${error}`)
    return false
  }
}
```

---

## 2. UI 一致性审计

**评分: 7/10**

### 2.1 颜色系统

#### ⚠️ 问题

1. **颜色硬编码**: 颜色值直接写在组件中，未使用设计系统
2. **缺少主题支持**: 无法切换亮色/暗色主题
3. **状态颜色不一致**: `STATE_COLORS` 与其他组件的状态颜色可能不一致

#### 📝 改进建议

```css
/* 建议创建 workflow-theme.css */
:root {
  /* 节点颜色 */
  --workflow-node-start-bg: #dcfce7;
  --workflow-node-start-border: #16a34a;
  --workflow-node-start-text: #166534;

  --workflow-node-end-bg: #fef2f2;
  --workflow-node-end-border: #dc2626;
  --workflow-node-end-text: #991b1b;

  /* 状态颜色 */
  --workflow-state-pending: #9ca3af;
  --workflow-state-running: #3b82f6;
  --workflow-state-completed: #22c55e;
  --workflow-state-failed: #ef4444;

  /* 画布颜色 */
  --workflow-canvas-bg: #f9fafb;
  --workflow-grid-color: #e5e7eb;
  --workflow-edge-color: #9ca3af;
  --workflow-selection-color: #3b82f6;
}

/* 暗色主题 */
[data-theme='dark'] {
  --workflow-canvas-bg: #1f2937;
  --workflow-grid-color: #374151;
  --workflow-edge-color: #6b7280;
}
```

### 2.2 间距和尺寸

#### ⚠️ 问题

1. **间距不一致**: 工具栏按钮间距、节点内边距等未统一
2. **缺少响应式尺寸**: 固定尺寸在小屏幕上可能显示不佳

#### 📝 改进建议

```typescript
// 建议使用响应式尺寸配置
export const RESPONSIVE_CONFIG = {
  breakpoints: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
  },
  node: {
    width: {
      mobile: 140,
      tablet: 160,
      desktop: 180,
    },
    height: {
      mobile: 70,
      tablet: 75,
      desktop: 80,
    },
  },
}
```

---

## 3. 交互流畅性审计

**评分: 7/10**

### 3.1 拖拽交互

#### ✅ 优点

1. **网格对齐**: 支持网格对齐，提升布局整齐度
2. **实时反馈**: 拖拽时实时更新节点位置
3. **画布拖拽**: 支持中键或 Alt+左键拖动画布

#### ⚠️ 问题

1. **缺少拖拽预览**: 拖拽时没有视觉反馈（阴影、高亮等）
2. **拖拽边界检查**: 可以将节点拖出画布边界
3. **连接线预览**: 创建连接时只有虚线，缺少更明显的提示

#### 📝 改进建议

```typescript
// 建议 1: 添加拖拽视觉反馈
const [dragPreview, setDragPreview] = useState<{ nodeId: string; position: { x: number; y: number } } | null>(null)

// 在拖拽时显示半透明预览
{dragPreview && (
  <g opacity={0.5}>
    <rect
      x={dragPreview.position.x}
      y={dragPreview.position.y}
      width={NODE_WIDTH}
      height={NODE_HEIGHT}
      fill={colors.bg}
      stroke={colors.border}
      strokeDasharray="4,4"
    />
  </g>
)}

// 建议 2: 添加边界检查
const clampPosition = (position: { x: number; y: number }) => {
  const containerRect = containerRef.current?.getBoundingClientRect()
  if (!containerRect) return position

  return {
    x: Math.max(0, Math.min(position.x, containerRect.width / canvasState.zoom - NODE_WIDTH)),
    y: Math.max(0, Math.min(position.y, containerRect.height / canvasState.zoom - NODE_HEIGHT)),
  }
}

// 建议 3: 改进连接线预览
const renderConnectingLine = useMemo(() => {
  if (!connectionInfo.isConnecting || !connectionInfo.sourceId) return null

  const sourceNode = nodes.find(n => n.id === connectionInfo.sourceId)
  if (!sourceNode) return null

  const startX = sourceNode.position.x + NODE_WIDTH
  const startY = sourceNode.position.y + NODE_HEIGHT / 2
  const endX = connectionInfo.targetPosition.x
  const endY = connectionInfo.targetPosition.y

  // 检查是否悬停在目标节点上
  const targetElement = document.elementFromPoint(
    connectionInfo.targetPosition.x * canvasState.zoom + canvasState.panX,
    connectionInfo.targetPosition.y * canvasState.zoom + canvasState.panY
  )
  const isHoveringTarget = targetElement?.closest('[data-node-id]')

  return (
    <g>
      {/* 连接线 */}
      <path
        d={`M ${startX} ${startY} L ${endX} ${endY}`}
        stroke={isHoveringTarget ? '#22c55e' : '#3b82f6'}
        strokeWidth={isHoveringTarget ? 3 : 2}
        strokeDasharray="5,5"
      />
      {/* 目标点高亮 */}
      {isHoveringTarget && (
        <circle cx={endX} cy={endY} r={8} fill="#22c55e" opacity={0.3}>
          <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  )
}, [connectionInfo, nodes, canvasState])
```

### 3.2 缩放和平移

#### ✅ 优点

1. **多种缩放方式**: 支持按钮、滚轮缩放
2. **适应内容**: `fitToContent` 方法自动调整视图
3. **缩放指示器**: 显示当前缩放比例

#### ⚠️ 问题

1. **缺少缩放动画**: 缩放时没有平滑过渡
2. **滚轮缩放体验**: 需要按住 Ctrl/Cmd 键才能缩放，不符合直觉
3. **平移边界**: 可以无限平移，没有边界限制

#### 📝 改进建议

```typescript
// 建议 1: 添加缩放动画
const [isAnimating, setIsAnimating] = useState(false)

const animateZoom = useCallback(
  (targetZoom: number) => {
    setIsAnimating(true)
    const startZoom = canvasState.zoom
    const startTime = Date.now()
    const duration = 300 // ms

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic

      setCanvasState(prev => ({
        ...prev,
        zoom: startZoom + (targetZoom - startZoom) * eased,
      }))

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animate)
  },
  [canvasState.zoom]
)

// 建议 2: 改进滚轮缩放
const handleWheel = useCallback(
  (e: React.WheelEvent) => {
    // 直接缩放，不需要按住 Ctrl/Cmd
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    animateZoom(Math.min(Math.max(canvasState.zoom * delta, 0.3), 3))
  },
  [canvasState.zoom, animateZoom]
)

// 建议 3: 添加平移边界
const clampPan = useCallback((panX: number, panY: number) => {
  const containerRect = containerRef.current?.getBoundingClientRect()
  if (!containerRect) return { panX, panY }

  const maxPanX = containerRect.width * 0.5
  const maxPanY = containerRect.height * 0.5

  return {
    panX: Math.max(-maxPanX, Math.min(panX, maxPanX)),
    panY: Math.max(-maxPanY, Math.min(panY, maxPanY)),
  }
}, [])
```

### 3.3 键盘快捷键

#### ✅ 优点

1. **Delete/Backspace 删除**: 支持键盘删除节点
2. **Alt+拖拽平移**: 支持快捷键平移画布

#### ⚠️ 问题

1. **快捷键文档缺失**: 没有快捷键说明或帮助提示
2. **快捷键冲突**: Delete/Backspace 可能与输入框冲突
3. **缺少常用快捷键**: 没有 Ctrl+Z 撤销、Ctrl+Y 重做等

#### 📝 改进建议

```typescript
// 建议 1: 添加快捷键帮助
const SHORTCUTS = [
  { key: 'Delete / Backspace', action: '删除选中节点' },
  { key: 'Alt + 拖拽', action: '平移画布' },
  { key: 'Ctrl + 滚轮', action: '缩放画布' },
  { key: 'Ctrl + Z', action: '撤销 (待实现)' },
  { key: 'Ctrl + Y', action: '重做 (待实现)' },
  { key: 'Ctrl + A', action: '全选 (待实现)' },
  { key: 'Escape', action: '取消选择/取消连接' },
]

// 显示快捷键帮助
<ShortcutHelp shortcuts={SHORTCUTS} />

// 建议 2: 改进快捷键处理
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // 检查是否在输入框中
    const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
      document.activeElement?.tagName || ''
    )

    if (isInputFocused) return

    if (readOnly || !selectedNodeId) return

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        onNodeDelete?.(selectedNodeId)
        break
      case 'Escape':
        e.preventDefault()
        onNodeSelect?.(undefined)
        setConnectionInfo({
          isConnecting: false,
          sourceId: null,
          targetPosition: { x: 0, y: 0 },
        })
        break
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          // TODO: 实现撤销
        }
        break
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [readOnly, selectedNodeId, onNodeDelete, onNodeSelect])
```

---

## 4. 错误处理审计

**评分: 6/10**

### 4.1 WorkflowCanvas 错误处理

#### ⚠️ 问题

1. **缺少错误边界**: 组件崩溃时没有优雅降级
2. **无效输入处理**: 没有验证节点位置、边连接的有效性
3. **缺少用户提示**: 操作失败时没有明确的错误提示

#### 📝 改进建议

```typescript
// 建议 1: 添加错误边界
class WorkflowCanvasErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error)
    console.error('WorkflowCanvas error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="workflow-canvas-error">
          <h3>画布加载失败</h3>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>刷新页面</button>
        </div>
      )
    }

    return this.props.children
  }
}

// 建议 2: 添加输入验证
const validateNodePosition = (position: { x: number; y: number }) => {
  if (isNaN(position.x) || isNaN(position.y)) {
    throw new Error('Invalid node position')
  }
  if (position.x < 0 || position.y < 0) {
    throw new Error('Node position cannot be negative')
  }
}

const validateEdge = (sourceId: string, targetId: string, nodes: WorkflowNodeData[]) => {
  if (sourceId === targetId) {
    throw new Error('Cannot connect node to itself')
  }
  if (!nodes.find(n => n.id === sourceId)) {
    throw new Error(`Source node not found: ${sourceId}`)
  }
  if (!nodes.find(n => n.id === targetId)) {
    throw new Error(`Target node not found: ${targetId}`)
  }
}

// 建议 3: 添加错误提示
const [error, setError] = useState<{ message: string; type: 'warning' | 'error' } | null>(null)

const showError = (message: string, type: 'warning' | 'error' = 'error') => {
  setError({ message, type })
  setTimeout(() => setError(null), 5000)
}

// 在 UI 中显示错误
{error && (
  <div className={`workflow-error workflow-error-${error.type}`}>
    <span>{error.type === 'error' ? '❌' : '⚠️'}</span>
    <span>{error.message}</span>
    <button onClick={() => setError(null)}>✕</button>
  </div>
)}
```

### 4.2 VisualWorkflowOrchestrator 错误处理

#### ✅ 优点

1. **工作流验证**: `validateWorkflow` 方法检查工作流有效性
2. **错误传播**: 节点执行失败会抛出错误并停止工作流
3. **错误日志**: 支持日志记录

#### ⚠️ 问题

1. **错误信息不够友好**: 技术性错误消息，用户难以理解
2. **缺少错误恢复机制**: 失败后无法从特定节点恢复
3. **错误分类不明确**: 没有区分不同类型的错误（验证错误、执行错误、超时等）

#### 📝 改进建议

```typescript
// 建议 1: 定义错误类型
export enum WorkflowErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CANCELLED_ERROR = 'CANCELLED_ERROR',
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',
  INVALID_CONFIG = 'INVALID_CONFIG',
}

export class WorkflowError extends Error {
  constructor(
    public type: WorkflowErrorType,
    message: string,
    public nodeId?: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'WorkflowError'
  }
}

// 建议 2: 用户友好的错误消息
const ERROR_MESSAGES: Record<WorkflowErrorType, string> = {
  [WorkflowErrorType.VALIDATION_ERROR]: '工作流配置有误，请检查节点和连接',
  [WorkflowErrorType.EXECUTION_ERROR]: '工作流执行失败',
  [WorkflowErrorType.TIMEOUT_ERROR]: '工作流执行超时',
  [WorkflowErrorType.CANCELLED_ERROR]: '工作流已取消',
  [WorkflowErrorType.NODE_NOT_FOUND]: '找不到指定的节点',
  [WorkflowErrorType.INVALID_CONFIG]: '节点配置无效',
}

export function getUserFriendlyError(error: Error): string {
  if (error instanceof WorkflowError) {
    return ERROR_MESSAGES[error.type] || error.message
  }
  return '发生未知错误，请稍后重试'
}

// 建议 3: 添加错误恢复机制
class VisualWorkflowOrchestrator {
  /**
   * 从指定节点恢复执行
   */
  async resumeFromNode(
    instanceId: string,
    nodeId: string,
    inputs?: Record<string, unknown>
  ): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new WorkflowError(WorkflowErrorType.NODE_NOT_FOUND, `Instance not found: ${instanceId}`)
    }

    const workflow = this.getWorkflow(instance.workflowId)
    const node = workflow.nodes.find(n => n.id === nodeId)
    if (!node) {
      throw new WorkflowError(WorkflowErrorType.NODE_NOT_FOUND, `Node not found: ${nodeId}`)
    }

    // 重置节点状态
    const states = this.nodeStates.get(instanceId)!
    states[nodeId] = 'pending'

    // 更新输入
    if (inputs) {
      instance.data.inputs = { ...instance.data.inputs, ...inputs }
    }

    // 继续执行
    instance.status = InstanceStatus.RUNNING
    await this.executeNode(workflow, node, instance)

    return instance
  }
}
```

---

## 5. 移动端适配审计

**评分: 5/10**

### 5.1 当前状态

#### ⚠️ 问题

1. **几乎未适配**: WorkflowCanvas 组件完全没有移动端适配
2. **触摸事件缺失**: 只有鼠标事件，没有触摸事件处理
3. **固定尺寸**: 节点尺寸固定，在小屏幕上显示不佳
4. **工具栏布局**: 工具栏按钮在小屏幕上可能重叠

### 5.2 移动端适配建议

#### 📝 改进建议

```typescript
// 建议 1: 添加触摸事件支持
const [touchInfo, setTouchInfo] = useState<{
  isTouching: boolean
  nodeId: string | null
  startX: number
  startY: number
}>({
  isTouching: false,
  nodeId: null,
  startX: 0,
  startY: 0,
})

const handleTouchStart = useCallback((e: React.TouchEvent, nodeId: string) => {
  if (readOnly) return

  const touch = e.touches[0]
  const pos = getCanvasPosition(touch.clientX, touch.clientY)

  setTouchInfo({
    isTouching: true,
    nodeId,
    startX: pos.x,
    startY: pos.y,
  })

  onNodeSelect?.(nodeId)
}, [readOnly, getCanvasPosition, onNodeSelect])

const handleTouchMove = useCallback((e: React.TouchEvent) => {
  if (!touchInfo.isTouching || !touchInfo.nodeId) return

  e.preventDefault() // 防止滚动

  const touch = e.touches[0]
  const pos = getCanvasPosition(touch.clientX, touch.clientY)
  const newPosition = snapToGrid({
    x: pos.x - (touchInfo.startX - nodes.find(n => n.id === touchInfo.nodeId)!.position.x),
    y: pos.y - (touchInfo.startY - nodes.find(n => n.id === touchInfo.nodeId)!.position.y),
  })

  onNodeMove?.(touchInfo.nodeId, newPosition)
}, [touchInfo, nodes, getCanvasPosition, snapToGrid, onNodeMove])

const handleTouchEnd = useCallback(() => {
  setTouchInfo({
    isTouching: false,
    nodeId: null,
    startX: 0,
    startY: 0,
  })
}, [])

// 建议 2: 响应式节点尺寸
const getNodeSize = useCallback(() => {
  const isMobile = window.innerWidth < 640
  return {
    width: isMobile ? 140 : NODE_WIDTH,
    height: isMobile ? 70 : NODE_HEIGHT,
  }
}, [])

// 建议 3: 移动端工具栏
const renderMobileToolbar = () => {
  const isMobile = window.innerWidth < 640

  if (!isMobile) return null

  return (
    <div className="workflow-mobile-toolbar">
      <button onClick={zoomIn} className="touch-large">
        <span>🔍+</span>
      </button>
      <button onClick={zoomOut} className="touch-large">
        <span>🔍-</span>
      </button>
      <button onClick={fitToContent} className="touch-large">
        <span>⛶</span>
      </button>
      <button onClick={resetView} className="touch-large">
        <span>↺</span>
      </button>
    </div>
  )
}

// 建议 4: 移动端手势支持
const handleGesture = useCallback((e: React.TouchEvent) => {
  if (e.touches.length === 2) {
    // 双指缩放
    const touch1 = e.touches[0]
    const touch2 = e.touches[1]
    const distance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    )

    if (gestureState.lastDistance) {
      const delta = distance / gestureState.lastDistance
      const newZoom = Math.min(Math.max(canvasState.zoom * delta, 0.3), 3)
      setCanvasState(prev => ({ ...prev, zoom: newZoom }))
    }

    setGestureState({ lastDistance: distance })
  }
}, [canvasState.zoom])
```

#### 📱 移动端 CSS 适配

```css
/* 添加到 mobile-responsive.css */

/* Workflow Canvas 移动端适配 */
@media (max-width: 640px) {
  .workflow-canvas {
    touch-action: none; /* 禁用默认触摸行为 */
  }

  .workflow-toolbar {
    bottom: 80px; /* 为底部导航留出空间 */
    top: auto;
    right: 10px;
    flex-direction: column;
    padding: 8px;
  }

  .workflow-toolbar button {
    width: 48px;
    height: 48px;
    font-size: 16px;
  }

  .workflow-zoom-indicator {
    bottom: 140px;
  }

  /* 节点触摸目标优化 */
  [data-node-id] circle {
    r: 8; /* 增大连接点 */
  }

  /* 移动端节点样式 */
  .workflow-node rect {
    stroke-width: 3; /* 增加边框宽度 */
  }

  .workflow-node text {
    font-size: 12px; /* 减小字体 */
  }
}

/* 横屏模式优化 */
@media (max-height: 500px) and (orientation: landscape) {
  .workflow-toolbar {
    top: 10px;
    bottom: auto;
    right: 10px;
    flex-direction: row;
  }

  .workflow-zoom-indicator {
    bottom: 10px;
  }
}
```

---

## 6. 可访问性审计

**评分: 6/10**

### 6.1 当前状态

#### ✅ 优点

1. **键盘支持**: 支持键盘删除节点
2. **语义化 HTML**: 使用 SVG 元素

#### ⚠️ 问题

1. **缺少 ARIA 属性**: 没有添加 `aria-label`, `role` 等属性
2. **焦点管理**: 没有焦点管理，键盘导航困难
3. **屏幕阅读器支持**: SVG 内容对屏幕阅读器不友好
4. **颜色对比度**: 未验证颜色对比度是否符合 WCAG 标准

### 6.2 可访问性改进建议

#### 📝 改进建议

```typescript
// 建议 1: 添加 ARIA 属性
<div
  ref={containerRef}
  className="workflow-canvas"
  role="application"
  aria-label="工作流画布"
  aria-describedby="workflow-canvas-help"
>
  {/* ... */}
</div>

// 节点添加 ARIA 属性
<g
  role="button"
  tabIndex={0}
  aria-label={`${node.label} (${node.type})`}
  aria-selected={isSelected}
  aria-describedby={`node-${node.id}-status`}
>
  {/* ... */}
</g>

// 建议 2: 添加焦点管理
const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!focusedNodeId) return

    const nodeIndex = nodes.findIndex(n => n.id === focusedNodeId)

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        // 移动到上方节点
        break
      case 'ArrowDown':
        e.preventDefault()
        // 移动到下方节点
        break
      case 'ArrowLeft':
        e.preventDefault()
        // 移动到左侧节点
        break
      case 'ArrowRight':
        e.preventDefault()
        // 移动到右侧节点
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onNodeSelect?.(focusedNodeId)
        break
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [focusedNodeId, nodes, onNodeSelect])

// 建议 3: 添加屏幕阅读器支持
<div className="sr-only" id="workflow-canvas-help">
  工作流画布。使用方向键导航节点，按 Enter 或空格选择节点，按 Delete 删除节点。
  使用 Alt + 拖拽平移画布，使用滚轮缩放。
</div>

// 为每个节点添加隐藏的描述
<div className="sr-only" id={`node-${node.id}-status`}>
  {node.label}，类型：{node.type}，状态：{node.state || 'pending'}
</div>

// 建议 4: 验证颜色对比度
// 使用工具如 https://contrast-ratio.com/
// 确保文本与背景的对比度至少为 4.5:1（正常文本）或 3:1（大文本）
```

---

## 7. 性能审计

**评分: 7/10**

### 7.1 当前状态

#### ✅ 优点

1. **useMemo 优化**: 使用 `useMemo` 缓存渲染结果
2. **useCallback 优化**: 使用 `useCallback` 缓存事件处理函数
3. **虚拟化潜力**: SVG 渲染适合虚拟化

#### ⚠️ 问题

1. **大量节点时性能下降**: 没有虚拟化，节点多时可能卡顿
2. **频繁重渲染**: 状态更新可能导致不必要的重渲染
3. **缺少性能监控**: 没有性能指标收集

### 7.2 性能优化建议

#### 📝 改进建议

```typescript
// 建议 1: 添加虚拟化
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: nodes.length,
  getScrollElement: () => containerRef.current,
  estimateSize: () => NODE_HEIGHT,
  overscan: 5,
})

// 只渲染可见节点
const renderNodes = useMemo(() => {
  return virtualizer.getVirtualItems().map(virtualItem => {
    const node = nodes[virtualItem.index]
    // 渲染节点
  })
}, [nodes, virtualizer])

// 建议 2: 添加性能监控
const [performanceMetrics, setPerformanceMetrics] = useState({
  renderTime: 0,
  nodeCount: 0,
  fps: 0,
})

useEffect(() => {
  const startTime = performance.now()

  return () => {
    const endTime = performance.now()
    setPerformanceMetrics(prev => ({
      ...prev,
      renderTime: endTime - startTime,
    }))
  }
})

// 建议 3: 添加防抖/节流
import { debounce, throttle } from 'lodash'

const handleMouseMove = useCallback(
  throttle((e: React.MouseEvent) => {
    // 处理鼠标移动
  }, 16), // 60fps
  []
)

const handleWheel = useCallback(
  debounce((e: React.WheelEvent) => {
    // 处理滚轮
  }, 100),
  []
)

// 建议 4: 添加性能警告
useEffect(() => {
  if (performanceMetrics.renderTime > 16) {
    console.warn(`WorkflowCanvas render time: ${performanceMetrics.renderTime}ms`)
  }
}, [performanceMetrics.renderTime])
```

---

## 8. 改进优先级

### 🔴 高优先级 (P0)

1. **移动端触摸事件支持** - 影响移动端用户体验
2. **错误边界和错误提示** - 提升稳定性
3. **颜色主题系统** - 提升一致性和可维护性
4. **输入验证** - 防止无效操作

### 🟡 中优先级 (P1)

5. **组件拆分** - 提升可维护性
6. **快捷键完善** - 提升效率
7. **可访问性改进** - 提升包容性
8. **性能优化** - 提升大规模场景体验

### 🟢 低优先级 (P2)

9. **撤销/重做功能** - 提升便利性
10. **动画效果** - 提升视觉体验
11. **国际化支持** - 扩大用户群体
12. **主题切换** - 提升个性化

---

## 9. 总结

### 优势

1. **架构清晰**: 组件设计合理，职责分离明确
2. **类型安全**: 完整的 TypeScript 类型定义
3. **功能完整**: 核心功能都已实现
4. **可扩展性**: 支持自定义执行器和事件监听

### 不足

1. **移动端适配缺失**: 几乎没有移动端优化
2. **错误处理不够友好**: 错误消息过于技术化
3. **缺少设计系统**: 颜色、间距等未统一
4. **可访问性不足**: 对屏幕阅读器等辅助技术支持不够

### 建议

v1.8.0 的 Visual Workflow Orchestrator 是一个功能完整的基础版本，但在用户体验方面还有较大提升空间。建议优先解决移动端适配和错误处理问题，然后逐步完善设计系统和可访问性。

---

**审计完成时间**: 2026-04-02
**下次审计建议**: v1.9.0 发布前
