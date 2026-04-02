/**
 * WorkflowEditor Store
 *
 * 使用 Zustand 进行工作流状态管理
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Edge, Node, Connection } from 'reactflow'
import type { WorkflowNodeData, WorkflowEdgeData, ValidationError, ExecutionState } from '../types'

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  nodes: Node<WorkflowNodeData>[]
  edges: Edge<WorkflowEdgeData>[]
  variables?: Array<{
    name: string
    type: string
    defaultValue?: unknown
  }>
  metadata?: {
    createdAt?: string
    updatedAt?: string
    createdBy?: string
  }
}

// Legacy compatibility type for API responses
export interface WorkflowDefinitionLegacy {
  id: string
  name: string
  description?: string
  nodes: Array<{
    id: string
    type: string
    config: Record<string, unknown>
    position: { x: number; y: number }
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    conditionConfig?: Record<string, unknown>
  }>
  variables?: Array<{
    name: string
    type: string
    defaultValue?: unknown
  }>
  metadata?: {
    createdAt?: string
    updatedAt?: string
    createdBy?: string
  }
}

/**
 * 工作流状态
 */
export interface WorkflowState {
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

  // 操作
  setWorkflow: (workflow: WorkflowDefinition) => void
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void
  setEdges: (edges: Edge<WorkflowEdgeData>[]) => void
  addNode: (node: Node<WorkflowNodeData>) => void
  updateNode: (id: string, data: Partial<WorkflowNodeData>) => void
  removeNode: (id: string) => void
  addEdge: (edge: Edge<WorkflowEdgeData>) => void
  removeEdge: (id: string) => void
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  setValidationErrors: (errors: ValidationError[]) => void
  setExecutionState: (state: ExecutionState | null) => void
  setIsExecuting: (isExecuting: boolean) => void
  markDirty: () => void
  markClean: () => void
  reset: () => void
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
}

/**
 * 创建 Workflow Store
 */
export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * 设置工作流
       */
      setWorkflow: workflow => {
        set({
          workflow,
          nodes: workflow.nodes,
          edges: workflow.edges,
          isDirty: false,
        })
      },

      /**
       * 设置节点
       */
      setNodes: nodes => {
        set({ nodes, isDirty: true })
      },

      /**
       * 设置边
       */
      setEdges: edges => {
        set({ edges, isDirty: true })
      },

      /**
       * 添加节点
       */
      addNode: node => {
        set(state => ({
          nodes: [...state.nodes, node],
          isDirty: true,
        }))
      },

      /**
       * 更新节点
       */
      updateNode: (id, data) => {
        set(state => ({
          nodes: state.nodes.map(node =>
            node.id === id ? { ...node, data: { ...node.data, ...data } } : node
          ),
          isDirty: true,
        }))
      },

      /**
       * 删除节点
       */
      removeNode: id => {
        set(state => ({
          nodes: state.nodes.filter(node => node.id !== id),
          edges: state.edges.filter(edge => edge.source !== id && edge.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
          isDirty: true,
        }))
      },

      /**
       * 添加边
       */
      addEdge: edge => {
        set(state => ({
          edges: [...state.edges, edge],
          isDirty: true,
        }))
      },

      /**
       * 删除边
       */
      removeEdge: id => {
        set(state => ({
          edges: state.edges.filter(edge => edge.id !== id),
          selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
          isDirty: true,
        }))
      },

      /**
       * 选择节点
       */
      selectNode: id => {
        set({ selectedNodeId: id, selectedEdgeId: null })
      },

      /**
       * 选择边
       */
      selectEdge: id => {
        set({ selectedEdgeId: id, selectedNodeId: null })
      },

      /**
       * 设置验证错误
       */
      setValidationErrors: errors => {
        set({ validationErrors: errors })
      },

      /**
       * 设置执行状态
       */
      setExecutionState: state => {
        set({ executionState: state })
      },

      /**
       * 设置执行中状态
       */
      setIsExecuting: isExecuting => {
        set({ isExecuting })
      },

      /**
       * 标记为已修改
       */
      markDirty: () => {
        set({ isDirty: true })
      },

      /**
       * 标记为未修改
       */
      markClean: () => {
        set({ isDirty: false })
      },

      /**
       * 重置状态
       */
      reset: () => {
        set(initialState)
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
      }),
    }
  )
)

/**
 * 选择器
 */
export const workflowSelectors = {
  workflow: (state: WorkflowState) => state.workflow,
  nodes: (state: WorkflowState) => state.nodes,
  edges: (state: WorkflowState) => state.edges,
  selectedNode: (state: WorkflowState) =>
    state.nodes.find(n => n.id === state.selectedNodeId) || null,
  selectedEdge: (state: WorkflowState) =>
    state.edges.find(e => e.id === state.selectedEdgeId) || null,
  validationErrors: (state: WorkflowState) => state.validationErrors,
  executionState: (state: WorkflowState) => state.executionState,
  isExecuting: (state: WorkflowState) => state.isExecuting,
  isDirty: (state: WorkflowState) => state.isDirty,
}
