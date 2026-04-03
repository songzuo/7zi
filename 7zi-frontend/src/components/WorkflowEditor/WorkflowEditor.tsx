/**
 * WorkflowEditor - 可视化工作流编辑器
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-01
 * 版本: v1.9.1 (2026-04-03)
 *
 * 主编辑器组件，集成 React Flow 画布、节点面板、属性面板等
 * 支持撤销/重做、键盘快捷键、自动保存
 * 
 * v1.9.1 更新:
 * - 新增循环节点 (Loop)
 * - 新增子工作流节点 (Subworkflow)
 * - 新增数据转换节点 (Transform)
 * - 新增节点搜索功能
 * - 新增导出/导入功能
 * - 优化移动端支持
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'

import 'reactflow/dist/style.css'

import { Toolbar } from './Toolbar'
import { NodePalette } from './NodePalette'
import { PropertiesPanel } from './PropertiesPanel'
import { StatusBar } from './StatusBar'
import { ExecutionPanel } from './ExecutionPanel'
import { ValidationPanel } from './ValidationPanel'

// 导入类型
import type { NodeType, WorkflowNodeData, WorkflowEdgeData, WorkflowDefinition } from './types'

// 导入带撤销/重做的 store
import {
  useWorkflowEditorStore,
  useUndoRedo,
} from './stores/workflow-editor-store'

// 导入节点类型
import { nodeTypes } from './NodeTypes'

// 导入边类型
import { conditionalEdgeType, animatedEdgeType } from './EdgeTypes'

// 导入 hooks
import { useWorkflowValidation } from './hooks/useWorkflowValidation'
import { useWorkflowExecution } from './hooks/useWorkflowExecution'

// 导入常量
import { NODE_TEMPLATES, CANVAS_CONFIG, EDITOR_VERSION } from './constants'

// 边类型注册
const edgeTypes = {
  conditional: conditionalEdgeType,
  animated: animatedEdgeType,
}

interface WorkflowEditorProps {
  workflowId?: string
  initialNodes?: Node<WorkflowNodeData>[]
  initialEdges?: Edge<WorkflowEdgeData>[]
  onSave?: (workflow: WorkflowDefinition) => void
  onExport?: (exportData: WorkflowDefinition) => void
  onImport?: (workflow: WorkflowDefinition) => void
  readOnly?: boolean
}

/**
 * WorkflowEditor 主组件
 */
function WorkflowEditorInner({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  onExport,
  onImport,
  readOnly = false,
}: WorkflowEditorProps) {
  // 使用新的 store
  const store = useWorkflowEditorStore()
  const { undo, redo, canUndo, canRedo } = useUndoRedo()
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  // 本地状态
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>(initialNodes)
  const [edges, setEdges] = useState<Edge<WorkflowEdgeData>[]>(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge<WorkflowEdgeData> | null>(null)
  
  // 剪贴板状态（用于复制/粘贴）
  const [clipboard, setClipboard] = useState<Node<WorkflowNodeData> | null>(null)

  // 验证 hook
  const { validationErrors, validateWorkflow } = useWorkflowValidation({ nodes, edges })

  // 执行 hook
  const { executionState, isExecuting, startExecution, stopExecution, logs } = useWorkflowExecution(
    { workflowId, nodes, edges }
  )

  // 当前工作流定义
  const currentWorkflow: WorkflowDefinition = useMemo(() => ({
    id: workflowId || `workflow-${Date.now()}`,
    name: 'Untitled Workflow',
    nodes: nodes.map(n => n.data),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      conditionConfig: e.data?.conditionConfig,
    })),
  }), [workflowId, nodes, edges])

  // 处理节点变化
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(nds => applyNodeChanges(changes, nds))
    },
    []
  )

  // 处理边变化
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(eds => applyEdgeChanges(changes, eds))
    },
    []
  )

  // 处理连接
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge(connection, eds))
    },
    []
  )

  // 处理节点选择
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<WorkflowNodeData>) => {
      if (!readOnly) {
        setSelectedNode(node)
        setSelectedEdge(null)
      }
    },
    [readOnly]
  )

  // 处理边选择
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge<WorkflowEdgeData>) => {
      if (!readOnly) {
        setSelectedEdge(edge)
        setSelectedNode(null)
      }
    },
    [readOnly]
  )

  // 复制节点
  const handleCopyNode = useCallback(() => {
    if (selectedNode) {
      setClipboard(selectedNode)
    }
  }, [selectedNode])

  // 粘贴节点
  const handlePasteNode = useCallback(() => {
    if (!clipboard || readOnly) return

    const newNode: Node<WorkflowNodeData> = {
      ...clipboard,
      id: `${clipboard.type}-${Date.now()}`,
      position: {
        x: clipboard.position.x + 50,
        y: clipboard.position.y + 50,
      },
      data: {
        ...clipboard.data,
        id: `${clipboard.type}-${Date.now()}`,
      },
    }

    setNodes(nds => nds.concat(newNode))
  }, [clipboard, readOnly])

  // 复制选中的节点
  const handleDuplicateNode = useCallback(() => {
    if (!selectedNode || readOnly) return

    const newNode: Node<WorkflowNodeData> = {
      ...selectedNode,
      id: `${selectedNode.type}-${Date.now()}`,
      position: {
        x: selectedNode.position.x + 50,
        y: selectedNode.position.y + 50,
      },
      data: {
        ...selectedNode.data,
        id: `${selectedNode.type}-${Date.now()}`,
      },
    }

    setNodes(nds => nds.concat(newNode))
  }, [selectedNode, readOnly])

  // 处理画布点击（取消选择）
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
  }, [])

  // 处理拖放
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const nodeType = event.dataTransfer.getData('application/reactflow')
      if (!nodeType) return

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

      setNodes(nds => nds.concat(newNode))
    },
    []
  )

  // 保存工作流
  const handleSave = useCallback(() => {
    const workflow: WorkflowDefinition = {
      id: workflowId || `workflow-${Date.now()}`,
      name: 'Untitled Workflow',
      nodes: nodes.map(n => n.data),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        conditionConfig: e.data?.conditionConfig,
      })),
    }

    if (onSave) {
      onSave(workflow)
    }

    // 同步到 store
    store.setWorkflow(workflow)
  }, [workflowId, nodes, edges, onSave, store])

  // 运行工作流
  const handleRun = useCallback(() => {
    const validation = validateWorkflow()
    if (!validation.valid) {
      console.error('Workflow validation failed:', validation.errors)
      return
    }
    startExecution()
  }, [validateWorkflow, startExecution])

  // 导入工作流
  const handleImport = useCallback(
    (workflow: WorkflowDefinition) => {
      // 将工作流转换为 React Flow 格式
      const newNodes: Node<WorkflowNodeData>[] = workflow.nodes.map((nodeData, index) => ({
        id: nodeData.id || `node-${index}`,
        type: nodeData.type as NodeType,
        position: { x: index * 250, y: 0 },
        data: nodeData,
      }))

      const newEdges: Edge<WorkflowEdgeData>[] = workflow.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: edge.conditionConfig ? { id: edge.id, source: edge.source, target: edge.target, conditionConfig: edge.conditionConfig } : undefined,
      }))

      setNodes(newNodes)
      setEdges(newEdges)

      if (onImport) {
        onImport(workflow)
      }

      // 自动适配视图
      setTimeout(() => fitView({ padding: 0.2 }), 100)
    },
    [onImport, fitView]
  )

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (readOnly) return

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

      // Delete / Backspace - 删除选中节点或边
      if ((event.key === 'Delete' || event.key === 'Backspace') && (selectedNode || selectedEdge)) {
        if (selectedNode) {
          setNodes(nds => nds.filter(n => n.id !== selectedNode.id))
          setEdges(eds =>
            eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id)
          )
          setSelectedNode(null)
        } else if (selectedEdge) {
          setEdges(eds => eds.filter(e => e.id !== selectedEdge.id))
          setSelectedEdge(null)
        }
        return
      }

      // Ctrl+C - 复制
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        if (selectedNode) {
          handleCopyNode()
        }
        return
      }

      // Ctrl+V - 粘贴
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        handlePasteNode()
        return
      }

      // Ctrl+D - 复制节点
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault()
        handleDuplicateNode()
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

      // Escape - 取消选择
      if (event.key === 'Escape') {
        setSelectedNode(null)
        setSelectedEdge(null)
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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readOnly, selectedNode, selectedEdge, canUndo, canRedo, undo, redo, handleSave, handleRun, zoomIn, zoomOut, fitView, handleCopyNode, handlePasteNode, handleDuplicateNode])

  // 节点颜色映射（用于 MiniMap）
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
        return '#EC4899' // v1.9.1: 循环节点颜色
      case 'subworkflow':
        return '#14B8A6' // v1.9.1: 子工作流节点颜色
      case 'transform':
        return '#84CC16' // v1.9.1: 数据转换节点颜色
      default:
        return '#94A3B8'
    }
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* 工具栏 */}
      <Toolbar
        onSave={handleSave}
        onRun={handleRun}
        onValidate={validateWorkflow}
        onExport={onExport}
        onImport={handleImport}
        workflow={currentWorkflow}
        isExecuting={isExecuting}
        readOnly={readOnly}
        hasErrors={validationErrors.length > 0}
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
            nodes={nodes.map(node => ({
              ...node,
              data: {
                ...node.data,
                executionStatus: executionState?.nodeStates?.[node.data.id]?.status,
              },
            }))}
            edges={edges.map(edge => ({
              ...edge,
              animated: isExecuting,
            }))}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            deleteKeyCode={readOnly ? null : 'Delete'}
            snapToGrid
            snapGrid={[CANVAS_CONFIG.GRID_SIZE, CANVAS_CONFIG.GRID_SIZE]}
            minZoom={CANVAS_CONFIG.MIN_ZOOM}
            maxZoom={CANVAS_CONFIG.MAX_ZOOM}
            defaultViewport={{ x: 0, y: 0, zoom: CANVAS_CONFIG.DEFAULT_ZOOM }}
          >
            <Background variant={BackgroundVariant.Dots} gap={CANVAS_CONFIG.GRID_SIZE} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={nodeColor}
              nodeStrokeWidth={3}
              zoomable
              pannable
            />

            {/* 验证错误面板 */}
            {validationErrors.length > 0 && (
              <Panel position="top-left" className="m-4">
                <ValidationPanel errors={validationErrors} />
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
                </div>
                <div className="text-gray-400 dark:text-gray-500">
                  v{EDITOR_VERSION}
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* 右侧属性面板 */}
        {(selectedNode || selectedEdge) && !readOnly && (
          <div className="w-80 border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <PropertiesPanel
              node={selectedNode}
              edge={selectedEdge}
              onNodeChange={data => {
                if (selectedNode) {
                  setNodes(nds =>
                    nds.map(n =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, ...data } as WorkflowNodeData }
                        : n
                    )
                  )
                }
              }}
              onEdgeChange={data => {
                if (selectedEdge) {
                  setEdges(eds =>
                    eds.map(e =>
                      e.id === selectedEdge.id
                        ? { ...e, data: { ...e.data, ...data } as WorkflowEdgeData }
                        : e
                    )
                  )
                }
              }}
              onNodeDelete={() => {
                if (selectedNode && selectedNode.data.type !== 'start') {
                  setNodes(nds => nds.filter(n => n.id !== selectedNode.id))
                  setSelectedNode(null)
                }
              }}
              onNodeDuplicate={() => {
                handleDuplicateNode()
              }}
              validationErrors={validationErrors}
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
    </div>
  )
}

/**
 * 导出包装组件（带 ReactFlowProvider）
 */
export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  )
}

export default WorkflowEditor