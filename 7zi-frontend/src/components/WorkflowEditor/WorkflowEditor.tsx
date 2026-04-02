/**
 * WorkflowEditor - 可视化工作流编辑器
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-01
 * 版本: v1.9.0
 *
 * 主编辑器组件，集成 React Flow 画布、节点面板、属性面板等
 * 支持撤销/重做、键盘快捷键、自动保存
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
} from 'reactflow'

import 'reactflow/dist/style.css'

import { Toolbar } from './Toolbar'
import { NodePalette } from './NodePalette'
import { PropertiesPanel } from './PropertiesPanel'
import { StatusBar } from './StatusBar'
import { ExecutionPanel } from './ExecutionPanel'
import { ValidationPanel } from './ValidationPanel'

// 导入类型
import type { NodeType, WorkflowNodeData, WorkflowEdgeData } from './types'
import type { WorkflowDefinition } from './stores/workflow-editor-store'

// 导入带撤销/重做的 store
import {
  useWorkflowEditorStore,
  useUndoRedo,
} from './stores/workflow-editor-store'

// 导入节点类型
import {
  startNodeType,
  endNodeType,
  agentNodeType,
  conditionNodeType,
  parallelNodeType,
  waitNodeType,
  humanInputNodeType,
} from './NodeTypes'

// 导入边类型
import { conditionalEdgeType, animatedEdgeType } from './EdgeTypes'

// 导入 hooks
import { useWorkflowValidation } from './hooks/useWorkflowValidation'
import { useWorkflowExecution } from './hooks/useWorkflowExecution'

// 导入常量
import { NODE_TEMPLATES } from './constants'

// 节点类型注册
const nodeTypes = {
  start: startNodeType,
  end: endNodeType,
  agent: agentNodeType,
  condition: conditionNodeType,
  parallel: parallelNodeType,
  wait: waitNodeType,
  humanInput: humanInputNodeType,
}

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
  readOnly?: boolean
}

/**
 * WorkflowEditor 主组件
 */
export function WorkflowEditor({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  readOnly = false,
}: WorkflowEditorProps) {
  // 使用新的 store
  const store = useWorkflowEditorStore()
  const { undo, redo, canUndo, canRedo } = useUndoRedo()

  // 本地状态
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>(initialNodes)
  const [edges, setEdges] = useState<Edge<WorkflowEdgeData>[]>(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge<WorkflowEdgeData> | null>(null)

  // 验证 hook
  const { validationErrors, validateWorkflow } = useWorkflowValidation({ nodes, edges })

  // 执行 hook
  const { executionState, isExecuting, startExecution, stopExecution, logs } = useWorkflowExecution(
    { workflowId, nodes, edges }
  )

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
      nodes: nodes,
      edges: edges,
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

      // Delete / Backspace - 删除选中节点
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        setNodes(nds => nds.filter(n => n.id !== selectedNode.id))
        setEdges(eds =>
          eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id)
        )
        setSelectedNode(null)
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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readOnly, selectedNode, canUndo, canRedo, undo, redo, handleSave, handleRun])

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
        return '#F97316' // Orange 500
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
            snapGrid={[20, 20]}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
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

            {/* 撤销/重做提示 */}
            <Panel position="bottom-left" className="m-2">
              <div className="flex items-center gap-2 rounded bg-white/90 px-2 py-1 text-xs text-gray-500 shadow dark:bg-gray-800/90 dark:text-gray-400">
                <span className={canUndo ? 'text-gray-700 dark:text-gray-300' : 'opacity-50'}>
                  ↩️ Ctrl+Z
                </span>
                <span>|</span>
                <span className={canRedo ? 'text-gray-700 dark:text-gray-300' : 'opacity-50'}>
                  ↪️ Ctrl+Y
                </span>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* 右侧属性面板 */}
        {selectedNode && !readOnly && (
          <div className="w-80 border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <PropertiesPanel
              node={selectedNode}
              onChange={data => {
                setNodes(nds =>
                  nds.map(n =>
                    n.id === selectedNode.id
                      ? { ...n, data: { ...n.data, ...data } as WorkflowNodeData }
                      : n
                  )
                )
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
    </div>
  )
}

export default WorkflowEditor
