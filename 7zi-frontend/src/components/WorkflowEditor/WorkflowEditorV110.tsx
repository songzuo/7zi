/**
 * WorkflowEditor v1.10.1 - 下一代工作流可视化编辑器
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.1
 *
 * 新增功能：
 * - 增强的复制粘贴功能
 * - 批量操作和多选
 * - 自动布局算法
 * - 节点搜索
 * - 快捷键面板
 * - 画布背景切换
 * - 性能优化
 *
 * v1.10.1 UX增强:
 * - 节点选择高亮效果（发光边框、脉冲动画）
 * - 拖拽时的视觉反馈（幽灵节点、放置目标高亮）
 * - 连接线的动画效果（流动粒子、渐变边）
 * - 工具栏按钮状态（加载动画、禁用状态）
 */

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// 动态导入 React Flow 核心组件
const ReactFlow = dynamic(
  () => import('reactflow').then(mod => ({ default: mod.default })),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center">Loading Workflow Editor...</div> }
)
const Background = dynamic(
  () => import('reactflow').then(mod => ({ default: mod.Background })),
  { ssr: false }
)
const Controls = dynamic(
  () => import('reactflow').then(mod => ({ default: mod.Controls })),
  { ssr: false }
)
const MiniMap = dynamic(
  () => import('reactflow').then(mod => ({ default: mod.MiniMap })),
  { ssr: false }
)
const Panel = dynamic(
  () => import('reactflow').then(mod => ({ default: mod.Panel })),
  { ssr: false }
)
const ReactFlowProvider = dynamic(
  () => import('reactflow').then(mod => ({ default: mod.ReactFlowProvider })),
  { ssr: false }
)

// 静态导入类型和工具函数（这些不会增加 bundle 大小）
import {
  Node,
  Edge,
  addEdge,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
  useReactFlow,
  SelectionMode,
} from 'reactflow'

import 'reactflow/dist/style.css'

import { EnhancedToolbar } from './EnhancedToolbar'
import { NodePalette } from './NodePalette'
import { PropertiesPanel } from './PropertiesPanel'
import { StatusBar } from './StatusBar'
import { ExecutionPanel } from './ExecutionPanel'
import { ValidationPanel } from './ValidationPanel'
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel'
import { NodeSearchPanel } from './NodeSearchPanel'

// 导入类型
import type {
  NodeType,
  WorkflowNodeData,
  WorkflowEdgeData,
  WorkflowDefinition,
} from './types'

// 导入 hooks
import { useWorkflowValidation } from './hooks/useWorkflowValidation'
import { useWorkflowExecution } from './hooks/useWorkflowExecution'
import { useClipboard } from './hooks/useClipboard'

// 导入节点类型
import { nodeTypes } from './NodeTypes'

// 导入边类型 (v1.10.1 UX增强版)
import { edgeTypes } from './EdgeTypes'

// 导入布局算法
import { applyLayout, LayoutType } from './AutoLayout'

// 导入常量
import { NODE_TEMPLATES, CANVAS_CONFIG, EDITOR_VERSION } from './constants'

// 边类型注册 (使用增强版)
const edgeTypesMap = {
  ...edgeTypes,
  default: edgeTypes.enhanced,
}

interface WorkflowEditorV110Props {
  workflowId?: string
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onSave?: (workflow: WorkflowDefinition) => void
  onExport?: (exportData: WorkflowDefinition) => void
  onImport?: (workflow: WorkflowDefinition) => void
  readOnly?: boolean
  maxHistorySize?: number
  performanceMode?: boolean
  onAutoLayout?: (type: 'horizontal' | 'vertical' | 'tree' | 'force') => void
}

/**
 * WorkflowEditor v1.10.0 主组件
 */
function WorkflowEditorV110Inner({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  onExport,
  onImport,
  readOnly = false,
  maxHistorySize = 100,
  performanceMode = false,
}: WorkflowEditorV110Props) {
  const { fitView, zoomIn, zoomOut, getNodes, getEdges, setNodes, setEdges } = useReactFlow()

  // 节点和边状态
  const [nodes, setLocalNodes] = useState<Node<WorkflowNodeData>[]>(initialNodes)
  const [edges, setLocalEdges] = useState<Edge<WorkflowEdgeData>[]>(initialEdges)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])

  // 视图状态
  const [showMiniMap, setShowMiniMap] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [gridType, setGridType] = useState<'dots' | 'lines' | 'none'>('dots')

  // 面板状态
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false)
  const [showSearchPanel, setShowSearchPanel] = useState(false)

  // 历史记录
  const [history, setHistory] = useState<{
    past: Array<{ nodes: Node<WorkflowNodeData>[]; edges: Edge<WorkflowEdgeData>[] }>
    future: Array<{ nodes: Node<WorkflowNodeData>[]; edges: Edge<WorkflowEdgeData>[] }>
  }>({ past: [], future: [] })

  // 剪贴板
  const clipboard = useClipboard()

  // 验证 hook
  const { validationErrors, validateWorkflow } = useWorkflowValidation({ nodes, edges })

  // 执行 hook
  const {
    executionState,
    isExecuting,
    startExecution,
    stopExecution,
    logs,
  } = useWorkflowExecution({ workflowId, nodes, edges })

  // 当前工作流定义
  const currentWorkflow: WorkflowDefinition = useMemo(
    () => ({
      id: workflowId || `workflow-${Date.now()}`,
      name: 'Untitled Workflow',
      nodes: nodes.map((n) => n.data),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        conditionConfig: e.data?.conditionConfig,
      })),
    }),
    [workflowId, nodes, edges]
  )

  // ============================================
  // 历史记录管理
  // ============================================

  const saveToHistory = useCallback(() => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-maxHistorySize + 1), { nodes, edges }],
      future: [],
    }))
  }, [nodes, edges, maxHistorySize])

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev

      const previous = prev.past[prev.past.length - 1]
      const newPast = prev.past.slice(0, -1)

      setLocalNodes(previous.nodes)
      setLocalEdges(previous.edges)

      return {
        past: newPast,
        future: [{ nodes, edges }, ...prev.future],
      }
    })
  }, [nodes, edges])

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev

      const next = prev.future[0]
      const newFuture = prev.future.slice(1)

      setLocalNodes(next.nodes)
      setLocalEdges(next.edges)

      return {
        past: [...prev.past, { nodes, edges }],
        future: newFuture,
      }
    })
  }, [nodes, edges])

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  // ============================================
  // 节点和边操作
  // ============================================

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 保存历史（仅在移动或删除时）
      if (
        changes.some(
          (c) => c.type === 'remove' || (c.type === 'position' && !('dragging' in c))
        )
      ) {
        saveToHistory()
      }

      setLocalNodes((nds) => applyNodeChanges(changes, nds))

      // 更新选择状态
      const selectChanges = changes.filter((c) => c.type === 'select')
      if (selectChanges.length > 0) {
        setSelectedNodeIds((prev) => {
          const newSet = new Set(prev)
          selectChanges.forEach((change) => {
            if (change.type === 'select' && change.selected) {
              newSet.add(change.id)
            } else if (change.type === 'select') {
              newSet.delete(change.id)
            }
          })
          return Array.from(newSet)
        })
      }
    },
    [saveToHistory]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.some((c) => c.type === 'remove')) {
        saveToHistory()
      }

      setLocalEdges((eds) => applyEdgeChanges(changes, eds))
    },
    [saveToHistory]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      saveToHistory()
      setLocalEdges((eds) => addEdge(connection, eds))
    },
    [saveToHistory]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<WorkflowNodeData>) => {
      if (!readOnly) {
        setSelectedNodeIds([node.id])
        setSelectedEdgeIds([])
      }
    },
    [readOnly]
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge<WorkflowEdgeData>) => {
      if (!readOnly) {
        setSelectedEdgeIds([edge.id])
        setSelectedNodeIds([])
      }
    },
    [readOnly]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNodeIds([])
    setSelectedEdgeIds([])
  }, [])

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes?: Node<WorkflowNodeData>[]; edges?: Edge<WorkflowEdgeData>[] }) => {
      setSelectedNodeIds(selectedNodes?.map((n) => n.id) || [])
      setSelectedEdgeIds(selectedEdges?.map((e) => e.id) || [])
    },
    []
  )

  // ============================================
  // 拖放操作
  // ============================================

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const nodeType = event.dataTransfer.getData('application/reactflow')
      if (!nodeType) return

      saveToHistory()

      const reactFlowBounds = (event.target as HTMLElement)
        .closest('.react-flow')
        ?.getBoundingClientRect()

      const position = reactFlowBounds
        ? {
            x: event.clientX - reactFlowBounds.left - 100,
            y: event.clientY - reactFlowBounds.top - 40,
          }
        : { x: event.clientX - 200, y: event.clientY - 50 }

      const template = NODE_TEMPLATES[nodeType as NodeType]
      const newNode: Node<WorkflowNodeData> = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType as NodeType,
        position,
        data: {
          id: `${nodeType}-${Date.now()}`,
          type: nodeType as NodeType,
          label: template?.label || nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
          config: template?.defaultConfig || {},
        },
      }

      setLocalNodes((nds) => nds.concat(newNode))
    },
    [saveToHistory]
  )

  // ============================================
  // 复制粘贴操作
  // ============================================

  const handleCopy = useCallback(() => {
    clipboard.copyNodes(nodes, edges, selectedNodeIds)
  }, [clipboard, nodes, edges, selectedNodeIds])

  const handlePaste = useCallback(() => {
    const result = clipboard.pasteNodes({ x: 50, y: 50 })
    if (!result) return

    saveToHistory()
    setLocalNodes((nds) => [...nds, ...result.nodes])
    setLocalEdges((eds) => [...eds, ...result.edges])
    setSelectedNodeIds(result.nodes.map((n) => n.id))
  }, [clipboard, saveToHistory])

  const handleDuplicate = useCallback(() => {
    handleCopy()
    setTimeout(() => handlePaste(), 0)
  }, [handleCopy, handlePaste])

  const handleDelete = useCallback(() => {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return

    saveToHistory()

    // 删除选中的节点
    setLocalNodes((nds) => nds.filter((n) => !selectedNodeIds.includes(n.id)))

    // 删除相关边
    setLocalEdges((eds) =>
      eds.filter(
        (e) =>
          !selectedNodeIds.includes(e.source) &&
          !selectedNodeIds.includes(e.target) &&
          !selectedEdgeIds.includes(e.id)
      )
    )

    setSelectedNodeIds([])
    setSelectedEdgeIds([])
  }, [selectedNodeIds, selectedEdgeIds, saveToHistory])

  // ============================================
  // 其他操作
  // ============================================

  const handleSave = useCallback(() => {
    const workflow: WorkflowDefinition = {
      id: workflowId || `workflow-${Date.now()}`,
      name: 'Untitled Workflow',
      nodes: nodes.map((n) => n.data),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        conditionConfig: e.data?.conditionConfig,
      })),
    }

    onSave?.(workflow)
  }, [workflowId, nodes, edges, onSave])

  const handleRun = useCallback(() => {
    const validation = validateWorkflow()
    if (!validation.valid) {
      console.error('Workflow validation failed:', validation.errors)
      return
    }
    startExecution()
  }, [validateWorkflow, startExecution])

  const handleAutoLayout = useCallback(
    (type: LayoutType) => {
      saveToHistory()
      const result = applyLayout(nodes, edges, type)
      setLocalNodes(result.nodes)
      setLocalEdges(result.edges)
      setTimeout(() => fitView({ padding: 0.2 }), 100)
    },
    [nodes, edges, saveToHistory, fitView]
  )

  const handleNodeSearch = useCallback(
    (nodeId: string) => {
      // 选中节点
      setSelectedNodeIds([nodeId])
      setSelectedEdgeIds([])

      // 将节点移动到视图中心
      const node = nodes.find((n) => n.id === nodeId)
      if (node) {
        fitView({
          nodes: [node],
          padding: 0.5,
          duration: 500,
        })
      }
    },
    [nodes, fitView]
  )

  const handleImport = useCallback(
    (workflow: WorkflowDefinition) => {
      const newNodes: Node<WorkflowNodeData>[] = workflow.nodes.map((nodeData, index) => ({
        id: nodeData.id || `node-${index}`,
        type: nodeData.type as NodeType,
        position: { x: index * 250, y: 0 },
        data: nodeData,
      }))

      const newEdges: Edge<WorkflowEdgeData>[] = workflow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: edge.conditionConfig
          ? {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              conditionConfig: edge.conditionConfig,
            }
          : undefined,
      }))

      saveToHistory()
      setLocalNodes(newNodes)
      setLocalEdges(newEdges)
      onImport?.(workflow)

      setTimeout(() => fitView({ padding: 0.2 }), 100)
    },
    [saveToHistory, fitView, onImport]
  )

  // ============================================
  // 键盘快捷键
  // ============================================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (readOnly) return

      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      // Ctrl+C - 复制
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        event.preventDefault()
        handleCopy()
        return
      }

      // Ctrl+V - 粘贴
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        event.preventDefault()
        handlePaste()
        return
      }

      // Ctrl+D - 复制节点
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault()
        handleDuplicate()
        return
      }

      // Ctrl+X - 剪切
      if ((event.ctrlKey || event.metaKey) && event.key === 'x') {
        event.preventDefault()
        const result = clipboard.cutNodes(nodes, edges, selectedNodeIds)
        if (result) {
          saveToHistory()
          setLocalNodes((nds) => nds.filter((n) => !result.nodesToDelete.includes(n.id)))
          setLocalEdges((eds) =>
            eds.filter((e) => !result.edgesToDelete.includes(e.id))
          )
        }
        return
      }

      // Delete / Backspace - 删除
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        handleDelete()
        return
      }

      // Ctrl+Z - 撤销
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        if (canUndo) undo()
        return
      }

      // Ctrl+Y 或 Ctrl+Shift+Z - 重做
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === 'y' || (event.key === 'z' && event.shiftKey))
      ) {
        event.preventDefault()
        if (canRedo) redo()
        return
      }

      // Ctrl+S - 保存
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        handleSave()
        return
      }

      // Ctrl+Enter - 运行
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        handleRun()
        return
      }

      // Ctrl+F - 搜索
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault()
        setShowSearchPanel(true)
        return
      }

      // ? - 快捷键面板
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        setShowShortcutsPanel(true)
        return
      }

      // Ctrl+L - 自动布局
      if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault()
        handleAutoLayout('horizontal')
        return
      }

      // Escape - 取消选择或关闭面板
      if (event.key === 'Escape') {
        if (showSearchPanel) {
          setShowSearchPanel(false)
        } else if (showShortcutsPanel) {
          setShowShortcutsPanel(false)
        } else {
          setSelectedNodeIds([])
          setSelectedEdgeIds([])
        }
        return
      }

      // Ctrl+= - 放大
      if ((event.ctrlKey || event.metaKey) && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        zoomIn()
        return
      }

      // Ctrl+- - 缩小
      if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault()
        zoomOut()
        return
      }

      // Ctrl+0 - 重置缩放
      if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        event.preventDefault()
        fitView()
        return
      }

      // Ctrl+A - 全选
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault()
        setSelectedNodeIds(nodes.map((n) => n.id))
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    readOnly,
    handleCopy,
    handlePaste,
    handleDuplicate,
    handleDelete,
    canUndo,
    canRedo,
    undo,
    redo,
    handleSave,
    handleRun,
    handleAutoLayout,
    zoomIn,
    zoomOut,
    fitView,
    nodes,
    selectedNodeIds,
    showSearchPanel,
    showShortcutsPanel,
    clipboard,
    saveToHistory,
  ])

  // ============================================
  // MiniMap 节点颜色
  // ============================================

  const nodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case 'start':
        return '#10B981'
      case 'end':
        return '#EF4444'
      case 'agent':
        return '#6366F1'
      case 'condition':
        return '#F59E0B'
      case 'parallel':
        return '#8B5CF6'
      case 'wait':
        return '#06B6D4'
      case 'humanInput':
        return '#F97316'
      case 'loop':
        return '#EC4899'
      case 'subworkflow':
        return '#14B8A6'
      case 'transform':
        return '#84CC16'
      default:
        return '#94A3B8'
    }
  }, [])

  // ============================================
  // 渲染
  // ============================================

  const selectedNode = selectedNodeIds.length === 1
    ? nodes.find((n) => n.id === selectedNodeIds[0]) || null
    : null

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* 工具栏 */}
      <EnhancedToolbar
        onSave={handleSave}
        onRun={handleRun}
        onValidate={validateWorkflow}
        onExport={onExport}
        onImport={handleImport}
        workflow={currentWorkflow}
        isExecuting={isExecuting}
        readOnly={readOnly}
        hasErrors={validationErrors.length > 0}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitView={() => fitView()}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onToggleMiniMap={() => setShowMiniMap(!showMiniMap)}
        onShowShortcuts={() => setShowShortcutsPanel(true)}
        onShowSearch={() => setShowSearchPanel(true)}
        onAutoLayout={handleAutoLayout}
      />

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧节点面板 */}
        <NodePalette
          onNodeDragStart={(event, nodeType) => {
            event.dataTransfer.setData('application/reactflow', nodeType)
            event.dataTransfer.effectAllowed = 'move'
          }}
          disabled={readOnly}
        />

        {/* 中间画布 */}
        <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes.map((node) => ({
              ...node,
              data: {
                ...node.data,
                executionStatus: executionState?.nodeStates?.[node.data.id]?.status,
              },
              selected: selectedNodeIds.includes(node.id),
            }))}
            edges={edges.map((edge) => ({
              ...edge,
              animated: isExecuting,
            }))}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypesMap}
            fitView
            deleteKeyCode={readOnly ? null : null} // 我们自己处理删除
            selectionMode={SelectionMode.Partial}
            selectionOnDrag
            panOnDrag={[1, 2]} // 右键或中键拖拽
            zoomOnDoubleClick={false}
            snapToGrid
            snapGrid={[CANVAS_CONFIG.GRID_SIZE, CANVAS_CONFIG.GRID_SIZE]}
            minZoom={CANVAS_CONFIG.MIN_ZOOM}
            maxZoom={CANVAS_CONFIG.MAX_ZOOM}
            defaultViewport={{ x: 0, y: 0, zoom: CANVAS_CONFIG.DEFAULT_ZOOM }}
          >
            {/* 背景 */}
            {gridType === 'dots' && (
              <Background
                variant={BackgroundVariant.Dots}
                gap={CANVAS_CONFIG.GRID_SIZE}
                size={1}
              />
            )}
            {gridType === 'lines' && (
              <Background
                variant={BackgroundVariant.Lines}
                gap={CANVAS_CONFIG.GRID_SIZE}
                size={1}
              />
            )}

            {/* 控制器 */}
            <Controls showInteractive={false} />

            {/* MiniMap */}
            {showMiniMap && (
              <MiniMap
                nodeColor={nodeColor}
                nodeStrokeWidth={3}
                zoomable
                pannable
              />
            )}

            {/* 验证错误面板 */}
            {validationErrors.length > 0 && (
              <Panel position="top-left" className="m-4">
                <ValidationPanel errors={validationErrors} />
              </Panel>
            )}

            {/* 选择信息面板 */}
            {selectedNodeIds.length > 1 && (
              <Panel position="top-right" className="m-4">
                <div className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-lg">
                  已选择 {selectedNodeIds.length} 个节点
                </div>
              </Panel>
            )}

            {/* 版本和快捷键提示 */}
            <Panel position="bottom-left" className="m-2">
              <div className="flex flex-col gap-1 rounded bg-white/90 px-2 py-1 text-xs text-gray-500 shadow dark:bg-gray-800/90 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span className={canUndo ? 'text-gray-700 dark:text-gray-300' : 'opacity-50'}>
                    ↩️ Ctrl+Z
                  </span>
                  <span>|</span>
                  <span className={canRedo ? 'text-gray-700 dark:text-gray-300' : 'opacity-50'}>
                    ↪️ Ctrl+Y
                  </span>
                  <span>|</span>
                  <span>? 快捷键</span>
                </div>
                <div className="text-gray-400 dark:text-gray-500">
                  v{EDITOR_VERSION} | {nodes.length} 节点 | {edges.length} 连接
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* 右侧属性面板 */}
        {selectedNode && !readOnly && (
          <div className="w-80 border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <PropertiesPanel
              node={selectedNode}
              onNodeChange={(data) => {
                saveToHistory()
                setLocalNodes((nds) =>
                  nds.map((n) =>
                    n.id === selectedNode.id
                      ? { ...n, data: { ...n.data, ...data } as WorkflowNodeData }
                      : n
                  )
                )
              }}
              onNodeDelete={() => {
                if (selectedNode && selectedNode.data.type !== 'start') {
                  setLocalNodes(nds => nds.filter(n => n.id !== selectedNode.id))
                }
              }}
              onNodeDuplicate={() => {
                // 复制节点逻辑
                const newNode = {
                  ...selectedNode,
                  id: `${selectedNode.type}-${Date.now()}`,
                  position: {
                    x: selectedNode.position.x + 50,
                    y: selectedNode.position.y + 50,
                  },
                  data: {
                    ...selectedNode.data,
                    id: `${selectedNode.type}-${Date.now()}`,
                    label: `${selectedNode.data.label} (copy)`,
                  },
                }
                setLocalNodes(nds => [...nds, newNode as Node<WorkflowNodeData>])
              }}
            />
          </div>
        )}
      </div>

      {/* 底部执行面板 */}
      {executionState && (
        <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <ExecutionPanel
            instance={executionState.instance}
            logs={logs}
            isExecuting={isExecuting}
            onStop={stopExecution}
          />
        </div>
      )}

      {/* 状态栏 */}
      <StatusBar
        nodesCount={nodes.length}
        edgesCount={edges.length}
        validationStatus={validationErrors.length === 0 ? 'valid' : 'invalid'}
        executionStatus={executionState?.instance?.status}
      />

      {/* 快捷键面板 */}
      <KeyboardShortcutsPanel
        isOpen={showShortcutsPanel}
        onClose={() => setShowShortcutsPanel(false)}
      />

      {/* 节点搜索面板 */}
      <NodeSearchPanel
        nodes={nodes}
        onNodeSelect={handleNodeSearch}
        isOpen={showSearchPanel}
        onClose={() => setShowSearchPanel(false)}
      />
    </div>
  )
}

/**
 * 导出包装组件（带 ReactFlowProvider）
 */
export function WorkflowEditorV110(props: WorkflowEditorV110Props) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorV110Inner {...props} />
    </ReactFlowProvider>
  )
}

export default WorkflowEditorV110