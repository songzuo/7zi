'use client'

/**
 * WorkflowEditor.tsx
 * 工作流编辑器主组件 - 整合所有功能
 *
 * 功能:
 * - 画布渲染和交互
 * - 节点编辑面板
 * - 工具栏（保存、加载、撤销、重做）
 * - 侧边栏节点类型选择
 * - 导入/导出工作流 JSON
 * - 模板保存和加载
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { WorkflowNode, WorkflowEdge, WorkflowDefinition, NodeType, EdgeType, WorkflowStatus } from '@/types/workflow'
import { WorkflowCanvas, WorkflowCanvasRef } from './designer/canvas'
import { NodeEditorPanel } from './NodeEditorPanel'
import { NodeToolbar } from './designer/toolbar'
import { useWorkflowHistory } from './hooks/useWorkflowHistory'
import { cn } from '@/lib/utils'

/**
 * 编辑器状态
 */
interface EditorState {
  workflowId: string
  workflowName: string
  workflowDescription: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId?: string
  isEditing: boolean
}

/**
 * 编辑器属性
 */
interface WorkflowEditorProps {
  /** 初始工作流定义 */
  initialWorkflow?: WorkflowDefinition
  /** 工作流变更回调 */
  onChange?: (workflow: WorkflowDefinition) => void
  /** 工作流保存回调 */
  onSave?: (workflow: WorkflowDefinition) => void
  /** 只读模式 */
  readOnly?: boolean
  /** 是否显示属性面板 */
  showPropertyPanel?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 默认工作流
 */
const createEmptyWorkflow = (): WorkflowDefinition => ({
  id: `workflow_${Date.now()}`,
  name: '新工作流',
  description: '',
  version: 1,
  status: WorkflowStatus.DRAFT,
  nodes: [],
  edges: [],
  config: { variables: {} },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
    updatedBy: 'system',
  },
})

/**
 * 生成唯一 ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 默认节点位置
 */
function getDefaultNodePosition(type: NodeType, existingNodes: WorkflowNode[]): { x: number; y: number } {
  const baseX = 100
  const baseY = 100
  const offset = existingNodes.length * 50
  return { x: baseX + offset, y: baseY + offset }
}

/**
 * 工作流编辑器主组件
 */
export function WorkflowEditor({
  initialWorkflow,
  onChange,
  onSave,
  readOnly = false,
  showPropertyPanel = true,
  className,
}: WorkflowEditorProps) {
  const canvasRef = useRef<WorkflowCanvasRef>(null)

  // 编辑器状态
  const [state, setState] = useState<EditorState>({
    workflowId: initialWorkflow?.id || generateId('workflow'),
    workflowName: initialWorkflow?.name || '新工作流',
    workflowDescription: initialWorkflow?.description || '',
    nodes: initialWorkflow?.nodes || [],
    edges: initialWorkflow?.edges || [],
    selectedNodeId: undefined,
    isEditing: false,
  })

  // 撤销/重做
  const history = useWorkflowHistory(state.nodes, state.edges)

  // 当前选中的节点
  const selectedNode = state.nodes.find(n => n.id === state.selectedNodeId) || null

  // 更新工作流状态
  const updateWorkflow = useCallback((updates: Partial<EditorState>) => {
    setState(prev => ({ ...prev, ...updates }))
    onChange?.({
      id: state.workflowId,
      name: state.workflowName,
      description: state.workflowDescription,
      version: 1,
      status: WorkflowStatus.DRAFT,
      nodes: state.nodes,
      edges: state.edges,
      config: { variables: {} },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      },
    })
  }, [onChange, state])

  // 节点选择
  const handleNodeSelect = useCallback((nodeId: string | undefined) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId, isEditing: !!nodeId }))
  }, [])

  // 双击节点打开编辑面板
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId, isEditing: true }))
  }, [])

  // 节点添加
  const handleNodeAdd = useCallback(
    (type: NodeType) => {
      const newNode: WorkflowNode = {
        id: generateId('node'),
        type,
        name: `新${type}节点`,
        position: getDefaultNodePosition(type, state.nodes),
      }

      const newNodes = [...state.nodes, newNode]
      history.recordNodeAdd(newNode)
      updateWorkflow({ nodes: newNodes, selectedNodeId: newNode.id, isEditing: true })
    },
    [state.nodes, history, updateWorkflow]
  )

  // 节点删除
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      const node = state.nodes.find(n => n.id === nodeId)
      if (!node) return

      // 如果是开始或结束节点，不允许删除
      if (node.type === NodeType.START || node.type === NodeType.END) {
        return
      }

      const newNodes = state.nodes.filter(n => n.id !== nodeId)
      const newEdges = state.edges.filter(e => e.source !== nodeId && e.target !== nodeId)

      history.recordNodeDelete(node)
      updateWorkflow({
        nodes: newNodes,
        edges: newEdges,
        selectedNodeId: state.selectedNodeId === nodeId ? undefined : state.selectedNodeId,
        isEditing: false,
      })
    },
    [state.nodes, state.edges, history, updateWorkflow]
  )

  // 节点移动
  const handleNodeMove = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      const node = state.nodes.find(n => n.id === nodeId)
      if (!node) return

      const previousPosition = node.position

      setState(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => (n.id === nodeId ? { ...n, position } : n)),
      }))

      // 记录历史
      history.recordNodeMove(nodeId, previousPosition, position)
    },
    [state.nodes, history]
  )

  // 节点更新
  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<WorkflowNode>) => {
      const node = state.nodes.find(n => n.id === nodeId)
      if (!node) return

      const previousNode = { ...node }
      const updatedNode = { ...node, ...updates }

      const newNodes = state.nodes.map(n => (n.id === nodeId ? updatedNode : n))

      history.recordNodeUpdate(nodeId, previousNode, updatedNode)
      updateWorkflow({ nodes: newNodes })
    },
    [state.nodes, history, updateWorkflow]
  )

  // 边添加
  const handleEdgeAdd = useCallback(
    (sourceId: string, targetId: string) => {
      // 检查是否已存在相同的边
      const exists = state.edges.some(
        e => e.source === sourceId && e.target === targetId
      )
      if (exists) return

      const newEdge: WorkflowEdge = {
        id: generateId('edge'),
        source: sourceId,
        target: targetId,
        type: EdgeType.SEQUENCE,
      }

      const newEdges = [...state.edges, newEdge]
      history.recordEdgeAdd(newEdge)
      updateWorkflow({ edges: newEdges })
    },
    [state.edges, history, updateWorkflow]
  )

  // 边删除
  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      const edge = state.edges.find(e => e.id === edgeId)
      if (!edge) return

      const newEdges = state.edges.filter(e => e.id !== edgeId)
      history.recordEdgeDelete(edge)
      updateWorkflow({ edges: newEdges })
    },
    [state.edges, history, updateWorkflow]
  )

  // 关闭编辑面板
  const handleCloseEditor = useCallback(() => {
    setState(prev => ({ ...prev, isEditing: false }))
  }, [])

  // 导出工作流为 JSON
  const handleExport = useCallback(() => {
    const workflow: WorkflowDefinition = {
      id: state.workflowId,
      name: state.workflowName,
      description: state.workflowDescription,
      version: 1,
      status: WorkflowStatus.DRAFT,
      nodes: state.nodes,
      edges: state.edges,
      config: { variables: {} },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      },
    }

    const json = JSON.stringify(workflow, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${state.workflowName.replace(/\s+/g, '_')}_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [state])

  // 导入工作流 JSON
  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const workflow = JSON.parse(text) as WorkflowDefinition

        // 验证工作流格式
        if (!workflow.nodes || !workflow.edges) {
          alert('无效的工作流文件')
          return
        }

        history.clearHistory()
        setState({
          workflowId: workflow.id,
          workflowName: workflow.name,
          workflowDescription: workflow.description || '',
          nodes: workflow.nodes,
          edges: workflow.edges,
          selectedNodeId: undefined,
          isEditing: false,
        })
      } catch (error) {
        alert('解析工作流文件失败')
      }
    }
    input.click()
  }, [history])

  // 保存工作流
  const handleSave = useCallback(() => {
    const workflow: WorkflowDefinition = {
      id: state.workflowId,
      name: state.workflowName,
      description: state.workflowDescription,
      version: 1,
      status: WorkflowStatus.DRAFT,
      nodes: state.nodes,
      edges: state.edges,
      config: { variables: {} },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      },
    }

    onSave?.(workflow)
  }, [state, onSave])

  // 保存为模板
  const handleSaveTemplate = useCallback(() => {
    const name = prompt('输入模板名称:')
    if (!name) return

    const template = {
      id: `template_${generateId('')}`,
      name,
      nodes: state.nodes,
      edges: state.edges,
      createdAt: new Date().toISOString(),
    }

    // 保存到 localStorage
    const templates = JSON.parse(localStorage.getItem('workflow_templates') || '[]')
    templates.push(template)
    localStorage.setItem('workflow_templates', JSON.stringify(templates))

    alert('模板保存成功!')
  }, [state])

  // 加载模板
  const handleLoadTemplate = useCallback(() => {
    const templates = JSON.parse(localStorage.getItem('workflow_templates') || '[]')

    if (templates.length === 0) {
      alert('没有保存的模板')
      return
    }

    const templateName = prompt(
      `可用的模板:\n${templates.map((t: { name: string }) => `- ${t.name}`).join('\n')}\n\n输入模板名称:`
    )

    const template = templates.find((t: { name: string }) => t.name === templateName)
    if (!template) {
      alert('未找到模板')
      return
    }

    // 生成新的节点 ID
    const nodeIdMap = new Map<string, string>()
    const newNodes = template.nodes.map((node: WorkflowNode) => {
      const newId = generateId('node')
      nodeIdMap.set(node.id, newId)
      return { ...node, id: newId }
    })

    const newEdges = template.edges.map((edge: WorkflowEdge) => ({
      ...edge,
      id: generateId('edge'),
      source: nodeIdMap.get(edge.source) || edge.source,
      target: nodeIdMap.get(edge.target) || edge.target,
    }))

    history.clearHistory()
    setState({
      workflowId: generateId('workflow'),
      workflowName: template.name,
      workflowDescription: '',
      nodes: newNodes,
      edges: newEdges,
      selectedNodeId: undefined,
      isEditing: false,
    })
  }, [history])

  // 定义工作流定义用于 Canvas
  const workflowDefinition: WorkflowDefinition = {
    id: state.workflowId,
    name: state.workflowName,
    description: state.workflowDescription,
    version: 1,
    status: WorkflowStatus.DRAFT,
    nodes: state.nodes,
    edges: state.edges,
    config: { variables: {} },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system',
    },
  }

  // 处理节点双击事件 - 修改画布组件需要支持
  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      const nodeElement = target.closest('[data-node-id]')
      if (nodeElement) {
        const nodeId = nodeElement.getAttribute('data-node-id')
        if (nodeId) {
          handleNodeDoubleClick(nodeId)
        }
      }
    },
    [handleNodeDoubleClick]
  )

  // 快捷键处理
  useEffect(() => {
    if (readOnly) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      // Ctrl+O: 导入
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        handleImport()
      }
      // Ctrl+E: 导出
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault()
        handleExport()
      }
      // Enter: 打开编辑面板
      if (e.key === 'Enter' && state.selectedNodeId && !state.isEditing) {
        e.preventDefault()
        handleNodeDoubleClick(state.selectedNodeId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readOnly, state.selectedNodeId, state.isEditing, handleSave, handleImport, handleExport, handleNodeDoubleClick])

  return (
    <div className={cn('relative flex h-full w-full', className)}>
      {/* 左侧节点工具栏 */}
      {!readOnly && (
        <div className="w-56 border-r border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-900">节点类型</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleNodeAdd(NodeType.START)}
              className="flex w-full items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-left hover:bg-green-100"
            >
              <span>▶️</span>
              <span className="text-sm text-green-700">开始节点</span>
            </button>
            <button
              onClick={() => handleNodeAdd(NodeType.AGENT)}
              className="flex w-full items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left hover:bg-blue-100"
            >
              <span>🤖</span>
              <span className="text-sm text-blue-700">Agent 节点</span>
            </button>
            <button
              onClick={() => handleNodeAdd(NodeType.CONDITION)}
              className="flex w-full items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-left hover:bg-yellow-100"
            >
              <span>⚡</span>
              <span className="text-sm text-yellow-700">条件节点</span>
            </button>
            <button
              onClick={() => handleNodeAdd(NodeType.PARALLEL)}
              className="flex w-full items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-left hover:bg-purple-100"
            >
              <span>⚡</span>
              <span className="text-sm text-purple-700">并行节点</span>
            </button>
            <button
              onClick={() => handleNodeAdd(NodeType.WAIT)}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left hover:bg-gray-100"
            >
              <span>⏱️</span>
              <span className="text-sm text-gray-700">等待节点</span>
            </button>
            <button
              onClick={() => handleNodeAdd(NodeType.HUMAN_INPUT)}
              className="flex w-full items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-left hover:bg-orange-100"
            >
              <span>👤</span>
              <span className="text-sm text-orange-700">人工输入</span>
            </button>
            <button
              onClick={() => handleNodeAdd(NodeType.END)}
              className="flex w-full items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left hover:bg-red-100"
            >
              <span>⏹️</span>
              <span className="text-sm text-red-700">结束节点</span>
            </button>
          </div>
        </div>
      )}

      {/* 画布区域 */}
      <div className="flex-1">
        {/* 顶部工具栏 */}
        {!readOnly && (
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={state.workflowName}
                onChange={e => updateWorkflow({ workflowName: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="工作流名称"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* 撤销/重做 */}
              <button
                onClick={() => history.undo()}
                disabled={!history.canUndo}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium',
                  history.canUndo
                    ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'cursor-not-allowed border border-gray-200 text-gray-400'
                )}
                title="撤销 (Ctrl+Z)"
              >
                ↩️ 撤销
              </button>
              <button
                onClick={() => history.redo()}
                disabled={!history.canRedo}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium',
                  history.canRedo
                    ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'cursor-not-allowed border border-gray-200 text-gray-400'
                )}
                title="重做 (Ctrl+Shift+Z)"
              >
                ↪️ 重做
              </button>

              <div className="h-4 w-px bg-gray-300" />

              {/* 导入 */}
              <button
                onClick={handleImport}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                title="导入 (Ctrl+O)"
              >
                📥 导入
              </button>

              {/* 导出 */}
              <button
                onClick={handleExport}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                title="导出 (Ctrl+E)"
              >
                📤 导出
              </button>

              {/* 保存模板 */}
              <button
                onClick={handleSaveTemplate}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                title="保存为模板"
              >
                💾 模板
              </button>

              {/* 加载模板 */}
              <button
                onClick={handleLoadTemplate}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                title="加载模板"
              >
                📂 模板
              </button>

              <div className="h-4 w-px bg-gray-300" />

              {/* 保存 */}
              <button
                onClick={handleSave}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                title="保存 (Ctrl+S)"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {/* 画布 */}
        <div className="h-[calc(100%-48px)]" onDoubleClick={handleCanvasDoubleClick}>
          <WorkflowCanvas
            ref={canvasRef}
            nodes={state.nodes}
            edges={state.edges}
            selectedNodeId={state.selectedNodeId}
            onNodeSelect={handleNodeSelect}
            onNodeMove={handleNodeMove}
            onNodeAdd={handleNodeAdd}
            onNodeDelete={handleNodeDelete}
            onEdgeAdd={handleEdgeAdd}
            onEdgeDelete={handleEdgeDelete}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* 右侧编辑面板 */}
      {showPropertyPanel && (
        <NodeEditorPanel
          node={selectedNode}
          isOpen={state.isEditing && !!selectedNode}
          onClose={handleCloseEditor}
          onUpdate={handleNodeUpdate}
          onDelete={handleNodeDelete}
        />
      )}
    </div>
  )
}

export default WorkflowEditor