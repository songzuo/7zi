/**
 * Workflow Store with Undo/Redo
 *
 * 使用 Zustand + temporal middleware 实现撤销/重做功能
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { temporal } from 'zundo'
import { useCallback } from 'react'
import type { Edge, Node } from 'reactflow'
import type {
  WorkflowNodeData,
  WorkflowEdgeData,
  ValidationError,
  ExecutionState,
  WorkflowDefinition,
  WorkflowVariable,
} from '../types'

// Re-export WorkflowDefinition for backward compatibility
export type { WorkflowDefinition } from '../types'

/**
 * 历史记录状态
 */
export interface HistoryState {
  nodes: Node<WorkflowNodeData>[]
  edges: Edge<WorkflowEdgeData>[]
}

/**
 * 工作流状态
 */
export interface WorkflowEditorState {
  // 工作流定义
  workflow: WorkflowDefinition | null
  nodes: Node<WorkflowNodeData>[]
  edges: Edge<WorkflowEdgeData>[]

  // 选择状态
  selectedNodeId: string | null
  selectedEdgeId: string | null

  // 验证
  validationErrors: ValidationError[]

  // 执行状态
  executionState: ExecutionState | null
  isExecuting: boolean

  // UI 状态
  isDirty: boolean
  isSaving: boolean
  autoSaveEnabled: boolean

  // 视图状态
  zoom: number
  panPosition: { x: number; y: number }

  // 基础操作
  setWorkflow: (workflow: WorkflowDefinition) => void
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void
  setEdges: (edges: Edge<WorkflowEdgeData>[]) => void
  addNode: (node: Node<WorkflowNodeData>) => void
  updateNode: (id: string, data: Partial<WorkflowNodeData>) => void
  updateNodePosition: (id: string, position: { x: number; y: number }) => void
  removeNode: (id: string) => void
  addEdge: (edge: Edge<WorkflowEdgeData>) => void
  removeEdge: (id: string) => void

  // 选择操作
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  clearSelection: () => void

  // 验证操作
  setValidationErrors: (errors: ValidationError[]) => void
  clearValidationErrors: () => void

  // 执行操作
  setExecutionState: (state: ExecutionState | null) => void
  setIsExecuting: (isExecuting: boolean) => void

  // 状态标记
  markDirty: () => void
  markClean: () => void

  // 视图操作
  setZoom: (zoom: number) => void
  setPanPosition: (position: { x: number; y: number }) => void

  // 重置
  reset: () => void
  resetToInitial: () => void
}

/**
 * 初始状态
 */
const initialState = {
  workflow: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  validationErrors: [],
  executionState: null,
  isExecuting: false,
  isDirty: false,
  isSaving: false,
  autoSaveEnabled: true,
  zoom: 1,
  panPosition: { x: 0, y: 0 },
}

/**
 * 创建 Workflow Editor Store with Undo/Redo
 */
export const useWorkflowEditorStore = create<WorkflowEditorState>()(
  temporal(
    persist(
      (set, get) => ({
        ...initialState,

        // ========== 工作流操作 ==========

        setWorkflow: workflow => {
          set({
            workflow,
            nodes: workflow.nodes,
            edges: workflow.edges,
            isDirty: false,
            selectedNodeId: null,
            selectedEdgeId: null,
          })
        },

        // ========== 节点操作 ==========

        setNodes: nodes => {
          set({ nodes, isDirty: true })
        },

        addNode: node => {
          set(state => ({
            nodes: [...state.nodes, node],
            isDirty: true,
          }))
        },

        updateNode: (id, data) => {
          set(state => ({
            nodes: state.nodes.map(node =>
              node.id === id
                ? { ...node, data: { ...node.data, ...data } }
                : node
            ),
            isDirty: true,
          }))
        },

        updateNodePosition: (id, position) => {
          set(state => ({
            nodes: state.nodes.map(node =>
              node.id === id
                ? { ...node, position }
                : node
            ),
            isDirty: true,
          }))
        },

        removeNode: id => {
          set(state => ({
            nodes: state.nodes.filter(node => node.id !== id),
            edges: state.edges.filter(
              edge => edge.source !== id && edge.target !== id
            ),
            selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
            isDirty: true,
          }))
        },

        // ========== 边操作 ==========

        setEdges: edges => {
          set({ edges, isDirty: true })
        },

        addEdge: edge => {
          set(state => ({
            edges: [...state.edges, edge],
            isDirty: true,
          }))
        },

        removeEdge: id => {
          set(state => ({
            edges: state.edges.filter(edge => edge.id !== id),
            selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
            isDirty: true,
          }))
        },

        // ========== 选择操作 ==========

        selectNode: id => {
          set({ selectedNodeId: id, selectedEdgeId: null })
        },

        selectEdge: id => {
          set({ selectedEdgeId: id, selectedNodeId: null })
        },

        clearSelection: () => {
          set({ selectedNodeId: null, selectedEdgeId: null })
        },

        // ========== 验证操作 ==========

        setValidationErrors: errors => {
          set({ validationErrors: errors })
        },

        clearValidationErrors: () => {
          set({ validationErrors: [] })
        },

        // ========== 执行操作 ==========

        setExecutionState: executionState => {
          set({ executionState })
        },

        setIsExecuting: isExecuting => {
          set({ isExecuting })
        },

        // ========== 状态标记 ==========

        markDirty: () => {
          set({ isDirty: true })
        },

        markClean: () => {
          set({ isDirty: false })
        },

        // ========== 视图操作 ==========

        setZoom: zoom => {
          set({ zoom: Math.max(0.1, Math.min(zoom, 3)) })
        },

        setPanPosition: panPosition => {
          set({ panPosition })
        },

        // ========== 重置操作 ==========

        reset: () => {
          set(initialState)
        },

        resetToInitial: () => {
          const { workflow } = get()
          if (workflow) {
            set({
              nodes: workflow.nodes,
              edges: workflow.edges,
              isDirty: false,
              selectedNodeId: null,
              selectedEdgeId: null,
            })
          }
        },
      }),
      {
        name: 'workflow-editor-store',
        storage: createJSONStorage(() => localStorage),
        partialize: state => ({
          workflow: state.workflow,
          nodes: state.nodes,
          edges: state.edges,
          autoSaveEnabled: state.autoSaveEnabled,
          zoom: state.zoom,
        }),
      }
    ),
    {
      // Temporal middleware options
      limit: 50, // 最多保存 50 步历史
      equality: (a, b) => {
        // 只比较 nodes 和 edges，忽略其他状态
        return (
          JSON.stringify(a.nodes) === JSON.stringify(b.nodes) &&
          JSON.stringify(a.edges) === JSON.stringify(b.edges)
        )
      },
      partialize: (state) => ({
        ...state,
        nodes: state.nodes,
        edges: state.edges,
      }),
    }
  )
)

/**
 * 撤销/重做 Hook
 */
export function useUndoRedo() {
  // 使用 temporal store 的 getState 来获取方法
  const temporalStore = useWorkflowEditorStore.temporal
  const temporalState = temporalStore?.getState?.() ?? temporalStore

  // 获取方法
  const undo = useCallback(() => {
    temporalState?.undo?.()
  }, [temporalState])

  const redo = useCallback(() => {
    temporalState?.redo?.()
  }, [temporalState])

  const clear = useCallback(() => {
    temporalState?.clear?.()
  }, [temporalState])

  // 获取历史状态
  const pastStates = temporalState?.pastStates ?? []
  const futureStates = temporalState?.futureStates ?? []

  const canUndo = pastStates.length > 0
  const canRedo = futureStates.length > 0
  const historySize = pastStates.length

  return {
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    historySize,
    pastStates,
    futureStates,
  }
}

/**
 * 选择器
 */
export const workflowEditorSelectors = {
  workflow: (state: WorkflowEditorState) => state.workflow,
  nodes: (state: WorkflowEditorState) => state.nodes,
  edges: (state: WorkflowEditorState) => state.edges,
  selectedNode: (state: WorkflowEditorState) =>
    state.nodes.find(n => n.id === state.selectedNodeId) || null,
  selectedEdge: (state: WorkflowEditorState) =>
    state.edges.find(e => e.id === state.selectedEdgeId) || null,
  validationErrors: (state: WorkflowEditorState) => state.validationErrors,
  executionState: (state: WorkflowEditorState) => state.executionState,
  isExecuting: (state: WorkflowEditorState) => state.isExecuting,
  isDirty: (state: WorkflowEditorState) => state.isDirty,
  zoom: (state: WorkflowEditorState) => state.zoom,
}

/**
 * 导出类型
 */
export type { WorkflowNodeData, WorkflowEdgeData }
