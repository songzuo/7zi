'use client'

/**
 * WorkflowEditorEnhanced.tsx
 * 集成示例：使用 v1.12.3 增强组件的完整工作流编辑器
 *
 * 这个组件展示了如何使用以下增强功能：
 * - NodePalette: 节点面板，支持拖拽
 * - WorkflowToolbar: 增强工具栏
 * - WorkflowCanvas: 增强画布，支持拖拽、右键菜单、增强连接线
 * - NodeContextMenu: 节点右键菜单
 */

import React, { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { WorkflowNode, WorkflowEdge, WorkflowDefinition, NodeType, EdgeType, WorkflowStatus } from '@/types/workflow'
import {
  NodePalette,
  getDefaultNodeConfig,
  WorkflowToolbar,
  WorkflowCanvas,
  WorkflowCanvasRef,
  NodeContextMenu,
  useNodeContextMenu,
} from './index'

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
 * 创建空工作流
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
 * 编辑器属性
 */
export interface WorkflowEditorEnhancedProps {
  /** 初始工作流定义 */
  initialWorkflow?: WorkflowDefinition
  /** 工作流变更回调 */
  onChange?: (workflow: WorkflowDefinition) => void
  /** 工作流保存回调 */
  onSave?: (workflow: WorkflowDefinition) => void
  /** 只读模式 */
  readOnly?: boolean
  /** 是否显示节点面板 */
  showPalette?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 增强版工作流编辑器
 */
export function WorkflowEditorEnhanced({
  initialWorkflow,
  onChange,
  onSave,
  readOnly = false,
  showPalette = true,
  className,
}: WorkflowEditorEnhancedProps) {
  const canvasRef = React.useRef<WorkflowCanvasRef>(null)

  // 编辑器状态
  const [editorState, setEditorState] = useState<EditorState>(() => ({
    workflowId: initialWorkflow?.id || `workflow_${Date.now()}`,
    workflowName: initialWorkflow?.name || '新工作流',
    workflowDescription: initialWorkflow?.description || '',
    nodes: initialWorkflow?.nodes || [],
    edges: initialWorkflow?.edges || [],
    selectedNodeId: undefined,
    isEditing: false,
  }))

  // 画布状态
  const [canvasState, setCanvasState] = useState({
    zoom: 1,
    snapToGrid: true,
    panX: 0,
    panY: 0,
  })

  // 历史记录
  const [history, setHistory] = useState<WorkflowDefinition[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // 右键菜单
  const { menuState, openMenu, closeMenu } = useNodeContextMenu()

  // 添加历史记录
  const addToHistory = useCallback((workflow: WorkflowDefinition) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(workflow)
      // 限制历史记录数量
      if (newHistory.length > 50) {
        newHistory.shift()
      }
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [historyIndex])

  // 创建工作流定义
  const createWorkflowDefinition = useCallback((): WorkflowDefinition => {
    return {
      id: editorState.workflowId,
      name: editorState.workflowName,
      description: editorState.workflowDescription,
      version: 1,
      status: WorkflowStatus.DRAFT,
      nodes: editorState.nodes,
      edges: editorState.edges,
      config: { variables: {} },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      },
    }
  }, [editorState])

  // 更新工作流
  const updateWorkflow = useCallback((updates: Partial<EditorState>) => {
    setEditorState(prev => {
      const newState = { ...prev, ...updates }
      const workflow = {
        ...createWorkflowDefinition(),
        nodes: newState.nodes,
        edges: newState.edges,
      }
      onChange?.(workflow)
      return newState
    })
  }, [onChange, createWorkflowDefinition])

  // 添加节点
  const handleNodeAdd = useCallback((type: NodeType, position: { x: number; y: number }) => {
    if (readOnly) return

    const defaultConfig = getDefaultNodeConfig(type)
    const newNode: WorkflowNode = {
      id: generateId('node'),
      type,
      name: defaultConfig.name || '新节点',
      description: defaultConfig.description,
      position,
      config: defaultConfig.config as Record<string, unknown>,
    }

    updateWorkflow({
      nodes: [...editorState.nodes, newNode],
      selectedNodeId: newNode.id,
    })

    // 添加到历史记录
    addToHistory({
      ...createWorkflowDefinition(),
      nodes: [...editorState.nodes, newNode],
      edges: editorState.edges,
    })
  }, [readOnly, editorState.nodes, editorState.edges, updateWorkflow, addToHistory, createWorkflowDefinition])

  // 移动节点
  const handleNodeMove = useCallback((nodeId: string, position: { x: number; y: number }) => {
    if (readOnly) return

    updateWorkflow({
      nodes: editorState.nodes.map(node =>
        node.id === nodeId ? { ...node, position } : node
      ),
    })
  }, [readOnly, editorState.nodes, updateWorkflow])

  // 删除节点
  const handleNodeDelete = useCallback((nodeId: string) => {
    if (readOnly) return

    updateWorkflow({
      nodes: editorState.nodes.filter(node => node.id !== nodeId),
      edges: editorState.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodeId: undefined,
    })

    // 添加到历史记录
    addToHistory({
      ...createWorkflowDefinition(),
      nodes: editorState.nodes.filter(node => node.id !== nodeId),
      edges: editorState.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId),
    })
  }, [readOnly, editorState.nodes, editorState.edges, updateWorkflow, addToHistory, createWorkflowDefinition])

  // 复制节点
  const handleNodeCopy = useCallback((nodeId: string) => {
    if (readOnly) return

    const node = editorState.nodes.find(n => n.id === nodeId)
    if (!node) return

    const newNode: WorkflowNode = {
      ...node,
      id: generateId('node'),
      name: `${node.name} (副本)`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
    }

    updateWorkflow({
      nodes: [...editorState.nodes, newNode],
      selectedNodeId: newNode.id,
    })

    // 添加到历史记录
    addToHistory({
      ...createWorkflowDefinition(),
      nodes: [...editorState.nodes, newNode],
      edges: editorState.edges,
    })
  }, [readOnly, editorState.nodes, updateWorkflow, addToHistory, createWorkflowDefinition])

  // 设置开始节点
  const handleNodeSetStart = useCallback((nodeId: string) => {
    if (readOnly) return

    // 将第一个节点设置为 START 类型，其他 START 类型节点改为 AGENT
    updateWorkflow({
      nodes: editorState.nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, type: NodeType.START }
        }
        if (node.type === NodeType.START) {
          return { ...node, type: NodeType.AGENT }
        }
        return node
      }),
      selectedNodeId: nodeId,
    })

    // 添加到历史记录
    addToHistory({
      ...createWorkflowDefinition(),
      nodes: editorState.nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, type: NodeType.START }
        }
        if (node.type === NodeType.START) {
          return { ...node, type: NodeType.AGENT }
        }
        return node
      }),
      edges: editorState.edges,
    })
  }, [readOnly, editorState.nodes, editorState.edges, updateWorkflow, addToHistory, createWorkflowDefinition])

  // 双击节点
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    const node = editorState.nodes.find(n => n.id === nodeId)
    if (!node) return

    // 打开配置对话框
    console.log('Open config for node:', node)
    // TODO: 实现配置对话框
  }, [editorState.nodes])

  // 添加边
  const handleEdgeAdd = useCallback(
    (sourceId: string, targetId: string, edgeType?: EdgeType, condition?: string) => {
      if (readOnly) return

      // 检查是否已存在相同的边
      const existingEdge = editorState.edges.find(
        edge => edge.source === sourceId && edge.target === targetId
      )
      if (existingEdge) return

      const newEdge: WorkflowEdge = {
        id: generateId('edge'),
        source: sourceId,
        target: targetId,
        type: edgeType || EdgeType.SEQUENCE,
        conditionConfig: condition
          ? {
              condition,
              label: condition === 'true' ? 'YES' : condition === 'false' ? 'NO' : condition,
            }
          : undefined,
      }

      updateWorkflow({
        edges: [...editorState.edges, newEdge],
      })

      // 添加到历史记录
      addToHistory({
        ...createWorkflowDefinition(),
        nodes: editorState.nodes,
        edges: [...editorState.edges, newEdge],
      })
    },
    [readOnly, editorState.nodes, editorState.edges, updateWorkflow, addToHistory, createWorkflowDefinition]
  )

  // 删除边
  const handleEdgeDelete = useCallback((edgeId: string) => {
    if (readOnly) return

    updateWorkflow({
      edges: editorState.edges.filter(edge => edge.id !== edgeId),
    })

    // 添加到历史记录
    addToHistory({
      ...createWorkflowDefinition(),
      nodes: editorState.nodes,
      edges: editorState.edges.filter(edge => edge.id !== edgeId),
    })
  }, [readOnly, editorState.nodes, editorState.edges, updateWorkflow, addToHistory, createWorkflowDefinition])

  // 保存工作流
  const handleSave = useCallback(() => {
    const workflow = createWorkflowDefinition()
    onSave?.(workflow)
  }, [createWorkflowDefinition, onSave])

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevWorkflow = history[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      updateWorkflow({
        nodes: prevWorkflow.nodes,
        edges: prevWorkflow.edges,
      })
    }
  }, [history, historyIndex, updateWorkflow])

  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextWorkflow = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      updateWorkflow({
        nodes: nextWorkflow.nodes,
        edges: nextWorkflow.edges,
      })
    }
  }, [history, historyIndex, updateWorkflow])

  // 导出 JSON
  const handleExportJson = useCallback(() => {
    const workflow = createWorkflowDefinition()
    const json = JSON.stringify(workflow, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflow.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [createWorkflowDefinition])

  // 导入模板
  const handleImportTemplate = useCallback(() => {
    // TODO: 实现模板导入
    console.log('Import template')
  }, [])

  // 全屏
  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }, [])

  // 获取节点信息（用于右键菜单）
  const selectedNode = editorState.nodes.find(n => n.id === menuState.nodeId)

  // 处理右键菜单点击
  const handleContextMenuClick = useCallback(
    (item: { id: string }) => {
      switch (item.id) {
        case 'delete':
          handleNodeDelete(menuState.nodeId)
          break
        case 'copy':
          handleNodeCopy(menuState.nodeId)
          break
        case 'set-as-start':
          handleNodeSetStart(menuState.nodeId)
          break
      }
    },
    [menuState.nodeId, handleNodeDelete, handleNodeCopy, handleNodeSetStart]
  )

  return (
    <div className={cn('flex h-screen overflow-hidden bg-gray-50', className)}>
      {/* 左侧节点面板 */}
      {showPalette && (
        <div className="w-64 shrink-0 border-r border-gray-200 bg-white p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">工作流编辑器</h2>
            <p className="text-sm text-gray-500">v1.12.3 增强版</p>
          </div>

          <NodePalette
            disabled={readOnly}
            onNodeClick={type => {
              // 点击节点类型，在画布中心添加
              const rect = (canvasRef.current as unknown as { getBoundingClientRect?: () => DOMRect })?.getBoundingClientRect?.()
              if (rect) {
                handleNodeAdd(type, {
                  x: (rect.width / 2) / canvasState.zoom - (canvasState.panX || 0) - 90,
                  y: (rect.height / 2) / canvasState.zoom - (canvasState.panY || 0) - 40,
                })
              }
            }}
          />
        </div>
      )}

      {/* 画布区域 */}
      <div className="flex-1 relative">
        {/* 增强工具栏 */}
        <WorkflowToolbar
          zoom={canvasState.zoom}
          snapToGrid={canvasState.snapToGrid}
          readOnly={readOnly}
          onZoomIn={() => setCanvasState(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }))}
          onZoomOut={() => setCanvasState(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.3) }))}
          onResetView={() => {
            canvasRef.current?.resetView()
            setCanvasState({ zoom: 1, snapToGrid: true })
          }}
          onFitToContent={() => canvasRef.current?.fitToContent()}
          onToggleSnapToGrid={() => setCanvasState(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }))}
          onImportTemplate={handleImportTemplate}
          onExportJson={handleExportJson}
          onFullscreen={handleFullscreen}
          onSave={handleSave}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        {/* 增强画布 */}
        <WorkflowCanvas
          ref={canvasRef}
          nodes={editorState.nodes}
          edges={editorState.edges}
          selectedNodeId={editorState.selectedNodeId}
          onNodeSelect={nodeId => {
            setEditorState(prev => ({ ...prev, selectedNodeId: nodeId }))
          }}
          onNodeMove={handleNodeMove}
          onNodeAdd={handleNodeAdd}
          onNodeDelete={handleNodeDelete}
          onNodeCopy={handleNodeCopy}
          onNodeSetStart={handleNodeSetStart}
          onNodeDoubleClick={handleNodeDoubleClick}
          onEdgeAdd={handleEdgeAdd}
          onEdgeDelete={handleEdgeDelete}
          readOnly={readOnly}
        />

        {/* 右键菜单 */}
        {menuState.isOpen && (
          <NodeContextMenu
            x={menuState.x}
            y={menuState.y}
            nodeId={menuState.nodeId}
            isStartNode={selectedNode?.type === NodeType.START}
            isEndNode={selectedNode?.type === NodeType.END}
            onItemClick={handleContextMenuClick}
            onClose={closeMenu}
          />
        )}
      </div>

      {/* 右侧属性面板（可选） */}
      {/* <div className="w-80 shrink-0 border-l border-gray-200 bg-white p-4">
        <PropertyPanel selectedNode={selectedNode} />
      </div> */}
    </div>
  )
}

export default WorkflowEditorEnhanced
