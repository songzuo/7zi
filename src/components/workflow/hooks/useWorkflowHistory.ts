/**
 * 工作流撤销/重做历史管理
 * 支持 Canvas 操作的撤销和重做
 */

import { useCallback, useState, useRef, useEffect } from 'react'
import { WorkflowNode, WorkflowEdge, WorkflowDefinition } from '@/types/workflow'

/**
 * 历史记录操作类型
 */
export type HistoryActionType =
  | 'node_add'
  | 'node_delete'
  | 'node_move'
  | 'node_update'
  | 'edge_add'
  | 'edge_delete'
  | 'edge_update'
  | 'workflow_update'

/**
 * 历史记录项
 */
export interface HistoryItem {
  type: HistoryActionType
  timestamp: number
  description: string
  // 节点/边 ID
  targetId?: string
  // 操作前的状态
  previousState?: {
    nodes?: WorkflowNode[]
    edges?: WorkflowEdge[]
    node?: WorkflowNode
    edge?: WorkflowEdge
  }
  // 操作后的状态
  currentState?: {
    nodes?: WorkflowNode[]
    edges?: WorkflowEdge[]
    node?: WorkflowNode
    edge?: WorkflowEdge
  }
  // 完整的 workflow 定义（用于复杂操作）
  previousWorkflow?: WorkflowDefinition
  currentWorkflow?: WorkflowDefinition
}

/**
 * 工作流历史状态
 */
export interface WorkflowHistoryState {
  past: HistoryItem[]
  future: HistoryItem[]
}

/**
 * 工作流历史 Hook 配置
 */
export interface UseWorkflowHistoryOptions {
  /** 最大历史记录数 */
  maxHistorySize?: number
  /** 是否启用历史记录 */
  enabled?: boolean
}

/**
 * 工作流历史 Hook 返回值
 */
export interface UseWorkflowHistoryResult {
  /** 是否可以撤销 */
  canUndo: boolean
  /** 是否可以重做 */
  canRedo: boolean
  /** 撤销 */
  undo: () => void
  /** 重做 */
  redo: () => void
  /** 记录节点添加 */
  recordNodeAdd: (node: WorkflowNode) => void
  /** 记录节点删除 */
  recordNodeDelete: (node: WorkflowNode) => void
  /** 记录节点移动 */
  recordNodeMove: (nodeId: string, previousPosition: { x: number; y: number }, newPosition: { x: number; y: number }) => void
  /** 记录节点更新 */
  recordNodeUpdate: (nodeId: string, previousNode: WorkflowNode, updatedNode: WorkflowNode) => void
  /** 记录边添加 */
  recordEdgeAdd: (edge: WorkflowEdge) => void
  /** 记录边删除 */
  recordEdgeDelete: (edge: WorkflowEdge) => void
  /** 记录边更新 */
  recordEdgeUpdate: (edgeId: string, previousEdge: WorkflowEdge, updatedEdge: WorkflowEdge) => void
  /** 记录工作流变更 */
  recordWorkflowUpdate: (previousWorkflow: WorkflowDefinition, currentWorkflow: WorkflowDefinition) => void
  /** 清除历史记录 */
  clearHistory: () => void
  /** 获取历史描述 */
  getHistoryDescription: (action: HistoryActionType) => string
}

/**
 * 获取操作描述
 */
function getActionDescription(type: HistoryActionType, targetId?: string): string {
  const descriptions: Record<HistoryActionType, string> = {
    node_add: `添加节点 ${targetId || ''}`,
    node_delete: `删除节点 ${targetId || ''}`,
    node_move: `移动节点 ${targetId || ''}`,
    node_update: `更新节点 ${targetId || ''}`,
    edge_add: `添加连接 ${targetId || ''}`,
    edge_delete: `删除连接 ${targetId || ''}`,
    edge_update: `更新连接 ${targetId || ''}`,
    workflow_update: '更新工作流',
  }
  return descriptions[type]
}

/**
 * 使用工作流历史管理
 */
export function useWorkflowHistory(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: UseWorkflowHistoryOptions = {}
): UseWorkflowHistoryResult {
  const { maxHistorySize = 50, enabled = true } = options

  const [history, setHistory] = useState<WorkflowHistoryState>({
    past: [],
    future: [],
  })

  const currentNodesRef = useRef<WorkflowNode[]>(nodes)
  const currentEdgesRef = useRef<WorkflowEdge[]>(edges)

  // 同步当前状态
  useEffect(() => {
    currentNodesRef.current = nodes
    currentEdgesRef.current = edges
  }, [nodes, edges])

  // 添加历史记录
  const addHistoryItem = useCallback(
    (item: HistoryItem) => {
      if (!enabled) return

      setHistory(prev => {
        const newPast = [...prev.past, item].slice(-maxHistorySize)
        return {
          past: newPast,
          future: [], // 新的操作会清除未来的历史
        }
      })
    },
    [enabled, maxHistorySize]
  )

  // 撤销
  const handleUndo = useCallback(() => {
    if (history.past.length === 0) return

    const lastAction = history.past[history.past.length - 1]

    // 将当前状态添加到未来
    setHistory(prev => ({
      past: prev.past.slice(0, -1),
      future: [lastAction, ...prev.future],
    }))

    // 返回上一个状态供应用
    return lastAction.previousState || lastAction.previousWorkflow
  }, [history.past])

  // 重做
  const handleRedo = useCallback(() => {
    if (history.future.length === 0) return

    const nextAction = history.future[0]

    // 将操作应用到当前
    setHistory(prev => ({
      past: [...prev.past, nextAction],
      future: prev.future.slice(1),
    }))

    // 返回下一个状态供应用
    return nextAction.currentState || nextAction.currentWorkflow
  }, [history.future])

  // 记录节点添加
  const recordNodeAdd = useCallback(
    (node: WorkflowNode) => {
      const item: HistoryItem = {
        type: 'node_add',
        timestamp: Date.now(),
        description: getActionDescription('node_add', node.id),
        targetId: node.id,
        previousState: {},
        currentState: { nodes: [node], edges: [] },
      }
      addHistoryItem(item)
    },
    [addHistoryItem]
  )

  // 记录节点删除
  const recordNodeDelete = useCallback(
    (node: WorkflowNode) => {
      const item: HistoryItem = {
        type: 'node_delete',
        timestamp: Date.now(),
        description: getActionDescription('node_delete', node.id),
        targetId: node.id,
        previousState: { node: { ...node } },
        currentState: {},
      }
      addHistoryItem(item)
    },
    [addHistoryItem]
  )

  // 记录节点移动
  const recordNodeMove = useCallback(
    (nodeId: string, previousPosition: { x: number; y: number }, newPosition: { x: number; y: number }) => {
      const node = currentNodesRef.current.find(n => n.id === nodeId)
      if (!node) return

      const previousNode = { ...node, position: previousPosition }
      const updatedNode = { ...node, position: newPosition }

      const item: HistoryItem = {
        type: 'node_move',
        timestamp: Date.now(),
        description: getActionDescription('node_move', nodeId),
        targetId: nodeId,
        previousState: { node: previousNode },
        currentState: { node: updatedNode },
      }
      addHistoryItem(item)
    },
    [addHistoryItem]
  )

  // 记录节点更新
  const recordNodeUpdate = useCallback(
    (nodeId: string, previousNode: WorkflowNode, updatedNode: WorkflowNode) => {
      const item: HistoryItem = {
        type: 'node_update',
        timestamp: Date.now(),
        description: getActionDescription('node_update', nodeId),
        targetId: nodeId,
        previousState: { node: { ...previousNode } },
        currentState: { node: { ...updatedNode } },
      }
      addHistoryItem(item)
    },
    [addHistoryItem]
  )

  // 记录边添加
  const recordEdgeAdd = useCallback(
    (edge: WorkflowEdge) => {
      const item: HistoryItem = {
        type: 'edge_add',
        timestamp: Date.now(),
        description: getActionDescription('edge_add', edge.id),
        targetId: edge.id,
        previousState: {},
        currentState: { edges: [edge] },
      }
      addHistoryItem(item)
    },
    [addHistoryItem]
  )

  // 记录边删除
  const recordEdgeDelete = useCallback(
    (edge: WorkflowEdge) => {
      const item: HistoryItem = {
        type: 'edge_delete',
        timestamp: Date.now(),
        description: getActionDescription('edge_delete', edge.id),
        targetId: edge.id,
        previousState: { edge: { ...edge } },
        currentState: {},
      }
      addHistoryItem(item)
    },
    [addHistoryItem]
  )

  // 记录边更新
  const recordEdgeUpdate = useCallback(
    (edgeId: string, previousEdge: WorkflowEdge, updatedEdge: WorkflowEdge) => {
      const item: HistoryItem = {
        type: 'edge_update',
        timestamp: Date.now(),
        description: getActionDescription('edge_update', edgeId),
        targetId: edgeId,
        previousState: { edge: { ...previousEdge } },
        currentState: { edge: { ...updatedEdge } },
      }
      addHistoryItem(item)
    },
    [addHistoryItem]
  )

  // 记录工作流变更
  const recordWorkflowUpdate = useCallback(
    (previousWorkflow: WorkflowDefinition, currentWorkflow: WorkflowDefinition) => {
      const item: HistoryItem = {
        type: 'workflow_update',
        timestamp: Date.now(),
        description: getActionDescription('workflow_update'),
        previousWorkflow: { ...previousWorkflow, nodes: [...previousWorkflow.nodes], edges: [...previousWorkflow.edges] },
        currentWorkflow: { ...currentWorkflow, nodes: [...currentWorkflow.nodes], edges: [...currentWorkflow.edges] },
      }
      addHistoryItem(item)
    },
    [addHistoryItem]
  )

  // 清除历史记录
  const clearHistory = useCallback(() => {
    setHistory({ past: [], future: [] })
  }, [])

  // 获取历史描述
  const getHistoryDescription = useCallback((action: HistoryActionType): string => {
    return getActionDescription(action)
  }, [])

  // 快捷键处理
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z: 撤销
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Ctrl+Shift+Z 或 Ctrl+Y: 重做
      if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleUndo, handleRedo])

  return {
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo: handleUndo,
    redo: handleRedo,
    recordNodeAdd,
    recordNodeDelete,
    recordNodeMove,
    recordNodeUpdate,
    recordEdgeAdd,
    recordEdgeDelete,
    recordEdgeUpdate,
    recordWorkflowUpdate,
    clearHistory,
    getHistoryDescription,
  }
}

export type { WorkflowNode, WorkflowEdge, WorkflowDefinition }