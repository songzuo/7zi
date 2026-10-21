/**
 * Workflow Store with Undo/Redo
 *
 * 使用 Zustand + 手写 undo/redo 实现撤销/重做功能
 *
 * 说明（B/C 类历史遗留修复）：
 *   原实现依赖 `zundo` 的 temporal middleware，但该依赖从未被安装，
 *   导致 TS2307 + 大面积 implicit any 连锁报错。
 *   同目录 `workflow-editor-store-v110.ts` 已采用「手写 undo/redo」并注释说明
 *   zundo v2.x 的 temporal store API 尚未稳定，故此处沿用同一做法：
 *   不引入新依赖，手写实现历史栈（past/future），保持既有 API 名称与行为不变。
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useCallback } from 'react'
import type { Edge, Node } from 'reactflow'
import type {
  WorkflowNodeData,
  WorkflowEdgeData,
  ValidationError,
  ExecutionState,
  WorkflowDefinition,
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
  workflow: null as WorkflowDefinition | null,
  nodes: [] as Node<WorkflowNodeData>[],
  edges: [] as Edge<WorkflowEdgeData>[],
  selectedNodeId: null as string | null,
  selectedEdgeId: null as string | null,
  validationErrors: [] as ValidationError[],
  executionState: null as ExecutionState | null,
  isExecuting: false,
  isDirty: false,
  isSaving: false,
  autoSaveEnabled: true,
  zoom: 1,
  panPosition: { x: 0, y: 0 } as { x: number; y: number },
}

/**
 * 创建 Workflow Editor Store with Undo/Redo
 */
export const useWorkflowEditorStore = create<WorkflowEditorState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== 工作流操作 ==========

      setWorkflow: (workflow: WorkflowDefinition) => {
        // Convert simplified WorkflowNodeData[] to full Node<WorkflowNodeData>[]
        const convertedNodes: Node<WorkflowNodeData>[] = workflow.nodes.map(
          (nodeData: WorkflowNodeData, index: number) => ({
            id: nodeData.id || `node-${index}`,
            type: nodeData.type,
            position: { x: index * 250, y: 0 }, // Default position
            data: nodeData,
          })
        )

        // Convert simplified edges to full Edge<WorkflowEdgeData>[]
        const convertedEdges: Edge<WorkflowEdgeData>[] = workflow.edges.map(
          (edge: WorkflowDefinition['edges'][number]) => ({
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
          })
        )

        set({
          workflow,
          nodes: convertedNodes,
          edges: convertedEdges,
          isDirty: false,
          selectedNodeId: null,
          selectedEdgeId: null,
        })
      },

      // ========== 节点操作 ==========

      setNodes: (nodes: Node<WorkflowNodeData>[]) => {
        set({ nodes, isDirty: true })
      },

      addNode: (node: Node<WorkflowNodeData>) => {
        set(state => ({
          nodes: [...state.nodes, node],
          isDirty: true,
        }))
      },

      updateNode: (id: string, data: Partial<WorkflowNodeData>) => {
        set(state => ({
          nodes: state.nodes.map((node: Node<WorkflowNodeData>) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...data } }
              : node
          ),
          isDirty: true,
        }))
      },

      updateNodePosition: (id: string, position: { x: number; y: number }) => {
        set(state => ({
          nodes: state.nodes.map((node: Node<WorkflowNodeData>) =>
            node.id === id
              ? { ...node, position }
              : node
          ),
          isDirty: true,
        }))
      },

      removeNode: (id: string) => {
        set(state => ({
          nodes: state.nodes.filter((node: Node<WorkflowNodeData>) => node.id !== id),
          edges: state.edges.filter(
            (edge: Edge<WorkflowEdgeData>) => edge.source !== id && edge.target !== id
          ),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
          isDirty: true,
        }))
      },

      // ========== 边操作 ==========

      setEdges: (edges: Edge<WorkflowEdgeData>[]) => {
        set({ edges, isDirty: true })
      },

      addEdge: (edge: Edge<WorkflowEdgeData>) => {
        set(state => ({
          edges: [...state.edges, edge],
          isDirty: true,
        }))
      },

      removeEdge: (id: string) => {
        set(state => ({
          edges: state.edges.filter((edge: Edge<WorkflowEdgeData>) => edge.id !== id),
          selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
          isDirty: true,
        }))
      },

      // ========== 选择操作 ==========

      selectNode: (id: string | null) => {
        set({ selectedNodeId: id, selectedEdgeId: null })
      },

      selectEdge: (id: string | null) => {
        set({ selectedEdgeId: id, selectedNodeId: null })
      },

      clearSelection: () => {
        set({ selectedNodeId: null, selectedEdgeId: null })
      },

      // ========== 验证操作 ==========

      setValidationErrors: (errors: ValidationError[]) => {
        set({ validationErrors: errors })
      },

      clearValidationErrors: () => {
        set({ validationErrors: [] })
      },

      // ========== 执行操作 ==========

      setExecutionState: (executionState: ExecutionState | null) => {
        set({ executionState })
      },

      setIsExecuting: (isExecuting: boolean) => {
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

      setZoom: (zoom: number) => {
        set({ zoom: Math.max(0.1, Math.min(zoom, 3)) })
      },

      setPanPosition: (panPosition: { x: number; y: number }) => {
        set({ panPosition })
      },

      // ========== 重置操作 ==========

      reset: () => {
        set(initialState)
      },

      resetToInitial: () => {
        const { workflow } = get()
        if (workflow) {
          // Convert simplified workflow to full ReactFlow format
          const convertedNodes: Node<WorkflowNodeData>[] = workflow.nodes.map(
            (nodeData: WorkflowNodeData, index: number) => ({
              id: nodeData.id || `node-${index}`,
              type: nodeData.type,
              position: { x: index * 250, y: 0 },
              data: nodeData,
            })
          )

          const convertedEdges: Edge<WorkflowEdgeData>[] = workflow.edges.map(
            (edge: WorkflowDefinition['edges'][number]) => ({
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
            })
          )

          set({
            nodes: convertedNodes,
            edges: convertedEdges,
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
  )
)

// ============================================================================
// 手写 Undo/Redo（替代 zundo temporal middleware）
// ============================================================================

/**
 * 历史记录最大步数（与原 temporal middleware 的 `limit: 50` 保持一致）
 */
const HISTORY_LIMIT = 50

/**
 * 历史记录内部状态
 */
interface HistoryStoreState {
  pastStates: HistoryState[]
  futureStates: HistoryState[]
  /** 记录一次变更（将 previous 压入 past） */
  push: (previous: HistoryState) => void
  /** 撤销：返回要恢复的历史状态，无历史时返回 null */
  undo: () => HistoryState | null
  /** 重做：返回要恢复的历史状态，无历史时返回 null */
  redo: () => HistoryState | null
  /** 清空历史 */
  clear: () => void
}

const useWorkflowHistoryStore = create<HistoryStoreState>()((set, get) => ({
  pastStates: [],
  futureStates: [],

  push: (previous: HistoryState) => {
    const { pastStates, futureStates } = get()
    const nextPast = [...pastStates, previous]
    // 限制历史长度，超出后丢弃最早的记录
    const trimmed =
      nextPast.length > HISTORY_LIMIT ? nextPast.slice(nextPast.length - HISTORY_LIMIT) : nextPast
    set({ pastStates: trimmed, futureStates: [] })
  },

  undo: () => {
    const { pastStates, futureStates } = get()
    if (pastStates.length === 0) return null

    const previous = pastStates[pastStates.length - 1]
    const current = readCurrentSnapshot()
    set({
      pastStates: pastStates.slice(0, pastStates.length - 1),
      futureStates: [...futureStates, current],
    })
    return previous
  },

  redo: () => {
    const { pastStates, futureStates } = get()
    if (futureStates.length === 0) return null

    const next = futureStates[futureStates.length - 1]
    const current = readCurrentSnapshot()
    set({
      pastStates: [...pastStates, current],
      futureStates: futureStates.slice(0, futureStates.length - 1),
    })
    return next
  },

  clear: () => {
    set({ pastStates: [], futureStates: [] })
  },
}))

/**
 * 读取当前 store 中参与历史记录的快照（只比较 nodes / edges）
 */
function readCurrentSnapshot(): HistoryState {
  const state = useWorkflowEditorStore.getState()
  return { nodes: state.nodes, edges: state.edges }
}

/**
 * 判断两个快照是否等价（只比较 nodes / edges，忽略其他状态）
 */
function isSameSnapshot(a: HistoryState, b: HistoryState): boolean {
  return (
    JSON.stringify(a.nodes) === JSON.stringify(b.nodes) &&
    JSON.stringify(a.edges) === JSON.stringify(b.edges)
  )
}

/**
 * 恢复历史快照到主 store
 */
function applySnapshot(snapshot: HistoryState): void {
  isRestoring = true
  try {
    useWorkflowEditorStore.setState({
      nodes: snapshot.nodes,
      edges: snapshot.edges,
    })
    lastSnapshot = snapshot
  } finally {
    isRestoring = false
  }
}

/**
 * 是否正在执行 undo/redo 恢复（此时不再记录新的历史）
 */
let isRestoring = false

/**
 * 上一次已记录的快照
 */
let lastSnapshot: HistoryState = { nodes: [], edges: [] }

/**
 * 订阅主 store：nodes / edges 变化时记录历史
 */
useWorkflowEditorStore.subscribe((state: WorkflowEditorState) => {
  if (isRestoring) return

  const next: HistoryState = { nodes: state.nodes, edges: state.edges }
  if (isSameSnapshot(next, lastSnapshot)) return

  useWorkflowHistoryStore.getState().push(lastSnapshot)
  lastSnapshot = next
})

/**
 * persist 重新水合（rehydrate）会一次性写入 nodes / edges，
 * 这不属于用户操作，不应产生历史记录——水合完成后重置基准快照并清空历史。
 */
if (typeof window !== 'undefined' && useWorkflowEditorStore.persist) {
  useWorkflowEditorStore.persist.onFinishHydration(() => {
    lastSnapshot = readCurrentSnapshot()
    useWorkflowHistoryStore.getState().clear()
  })
}

/**
 * 兼容旧版 zundo temporal API 的形状（`store.temporal.getState().undo()` 等）。
 * 保留该入口以免破坏既有调用方，但底层为手写实现。
 */
export const workflowEditorTemporal = {
  getState: () => ({
    undo: () => {
      const snapshot = useWorkflowHistoryStore.getState().undo()
      if (snapshot) applySnapshot(snapshot)
    },
    redo: () => {
      const snapshot = useWorkflowHistoryStore.getState().redo()
      if (snapshot) applySnapshot(snapshot)
    },
    clear: () => {
      useWorkflowHistoryStore.getState().clear()
      lastSnapshot = readCurrentSnapshot()
    },
    get pastStates(): HistoryState[] {
      return useWorkflowHistoryStore.getState().pastStates
    },
    get futureStates(): HistoryState[] {
      return useWorkflowHistoryStore.getState().futureStates
    },
  }),
}

/**
 * 撤销/重做 Hook
 */
export function useUndoRedo() {
  const pastStates = useWorkflowHistoryStore(state => state.pastStates)
  const futureStates = useWorkflowHistoryStore(state => state.futureStates)

  const undo = useCallback(() => {
    const snapshot = useWorkflowHistoryStore.getState().undo()
    if (snapshot) applySnapshot(snapshot)
  }, [])

  const redo = useCallback(() => {
    const snapshot = useWorkflowHistoryStore.getState().redo()
    if (snapshot) applySnapshot(snapshot)
  }, [])

  const clear = useCallback(() => {
    useWorkflowHistoryStore.getState().clear()
    lastSnapshot = readCurrentSnapshot()
  }, [])

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
    state.nodes.find((n: Node<WorkflowNodeData>) => n.id === state.selectedNodeId) || null,
  selectedEdge: (state: WorkflowEditorState) =>
    state.edges.find((e: Edge<WorkflowEdgeData>) => e.id === state.selectedEdgeId) || null,
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
