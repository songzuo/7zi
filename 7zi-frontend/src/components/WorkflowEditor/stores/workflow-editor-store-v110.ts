/**
 * 增强的撤销/重做 Store
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.0
 *
 * 基于 Zustand + zundo 实现的增强撤销/重做功能
 * 支持更完善的历史记录和批量操作
 */

import { create } from 'zustand'
import type { Draft } from 'immer'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
// TODO: Fix zundo v2.x integration - currently using manual undo/redo
// import { undoMiddleware } from 'zundo'

import type { Node, Edge } from 'reactflow'
import type { WorkflowNodeData, WorkflowEdgeData, WorkflowDefinition } from '../types'

// ============================================
// 类型定义
// ============================================

interface WorkflowEditorState {
  // 工作流数据
  workflow: WorkflowDefinition | null
  nodes: Node<WorkflowNodeData>[]
  edges: Edge<WorkflowEdgeData>[]

  // 选择状态
  selectedNodeIds: string[]
  selectedEdgeIds: string[]

  // 视图状态
  viewport: { x: number; y: number; zoom: number }
  showMiniMap: boolean
  showGrid: boolean
  gridType: 'dots' | 'lines' | 'none'

  // 历史记录
  historyLimit: number
  historySize: number

  // 操作方法
  setWorkflow: (workflow: WorkflowDefinition) => void
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void
  setEdges: (edges: Edge<WorkflowEdgeData>[]) => void
  addNode: (node: Node<WorkflowNodeData>) => void
  addNodes: (nodes: Node<WorkflowNodeData>[]) => void
  removeNode: (nodeId: string) => void
  removeNodes: (nodeIds: string[]) => void
  updateNode: (nodeId: string, updates: Partial<WorkflowNodeData>) => void
  updateNodes: (updates: Array<{ nodeId: string; updates: Partial<WorkflowNodeData> }>) => void

  addEdge: (edge: Edge<WorkflowEdgeData>) => void
  addEdges: (edges: Edge<WorkflowEdgeData>[]) => void
  removeEdge: (edgeId: string) => void
  removeEdges: (edgeIds: string[]) => void
  updateEdge: (edgeId: string, updates: Partial<WorkflowEdgeData>) => void

  // 选择操作
  selectNode: (nodeId: string) => void
  selectNodes: (nodeIds: string[]) => void
  deselectNode: (nodeId: string) => void
  deselectAll: () => void
  selectEdge: (edgeId: string) => void
  selectEdges: (edgeIds: string[]) => void
  deselectEdge: (edgeId: string) => void

  // 视图操作
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void
  toggleMiniMap: () => void
  toggleGrid: () => void
  setGridType: (type: 'dots' | 'lines' | 'none') => void

  // 批量操作
  duplicateNodes: (nodeIds: string[]) => void
  deleteSelected: () => void
  groupNodes: (nodeIds: string[], groupId: string) => void
  ungroupNodes: (groupId: string) => void

  // 自动布局
  autoLayout: (layoutType?: 'horizontal' | 'vertical' | 'force') => void

  // 搜索
  searchNodes: (query: string) => Node<WorkflowNodeData>[]

  // 重置
  reset: () => void
}

// ============================================
// 创建 Store
// ============================================

const createWorkflowEditorStore = () =>
  create<WorkflowEditorState>()(
    devtools(
      persist(
        immer((set, get) => ({
            // 初始状态
            workflow: null,
            nodes: [],
            edges: [],
            selectedNodeIds: [],
            selectedEdgeIds: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            showMiniMap: true,
            showGrid: true,
            gridType: 'dots',
            historyLimit: 100, // v1.10.0: 增加到 100
            historySize: 0,

            // 设置工作流
            setWorkflow: (workflow: WorkflowDefinition) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.workflow = workflow
                state.nodes = workflow.nodes.map((nodeData, index) => ({
                  id: nodeData.id || `node-${index}`,
                  type: nodeData.type,
                  position: { x: index * 250, y: 0 },
                  data: nodeData,
                }))
                state.edges = workflow.edges.map((edge) => ({
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
              }),

            // 设置节点
            setNodes: (nodes: Node<WorkflowNodeData>[]) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.nodes = nodes
              }),

            // 设置边
            setEdges: (edges: Edge<WorkflowEdgeData>[]) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.edges = edges
              }),

            // 添加单个节点
            addNode: (node: Node<WorkflowNodeData>) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.nodes.push(node)
              }),

            // 批量添加节点
            addNodes: (nodes: Node<WorkflowNodeData>[]) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.nodes.push(...nodes)
              }),

            // 删除单个节点
            removeNode: (nodeId: string) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.nodes = state.nodes.filter((n) => n.id !== nodeId)
                state.edges = state.edges.filter(
                  (e) => e.source !== nodeId && e.target !== nodeId
                )
                state.selectedNodeIds = state.selectedNodeIds.filter((id) => id !== nodeId)
              }),

            // 批量删除节点
            removeNodes: (nodeIds: string[]) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.nodes = state.nodes.filter((n) => !nodeIds.includes(n.id))
                state.edges = state.edges.filter(
                  (e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
                )
                state.selectedNodeIds = state.selectedNodeIds.filter(
                  (id) => !nodeIds.includes(id)
                )
              }),

            // 更新单个节点
            updateNode: (nodeId: string, updates: Partial<WorkflowNodeData>) =>
              set((state: Draft<WorkflowEditorState>) => {
                const node = state.nodes.find((n) => n.id === nodeId)
                if (node) {
                  node.data = { ...node.data, ...updates }
                }
              }),

            // 批量更新节点
            updateNodes: (updates: Array<{ nodeId: string; updates: Partial<WorkflowNodeData> }>) =>
              set((state: Draft<WorkflowEditorState>) => {
                updates.forEach(({ nodeId, updates: nodeUpdates }) => {
                  const node = state.nodes.find((n) => n.id === nodeId)
                  if (node) {
                    node.data = { ...node.data, ...nodeUpdates }
                  }
                })
              }),

            // 添加单个边
            addEdge: (edge: Edge<WorkflowEdgeData>) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.edges.push(edge)
              }),

            // 批量添加边
            addEdges: (edges: Edge<WorkflowEdgeData>[]) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.edges.push(...edges)
              }),

            // 删除单个边
            removeEdge: (edgeId: string) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.edges = state.edges.filter((e) => e.id !== edgeId)
                state.selectedEdgeIds = state.selectedEdgeIds.filter((id) => id !== edgeId)
              }),

            // 批量删除边
            removeEdges: (edgeIds: string[]) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.edges = state.edges.filter((e) => !edgeIds.includes(e.id))
                state.selectedEdgeIds = state.selectedEdgeIds.filter(
                  (id) => !edgeIds.includes(id)
                )
              }),

            // 更新边
            updateEdge: (edgeId: string, updates: Partial<WorkflowEdgeData>) =>
              set((state: Draft<WorkflowEditorState>) => {
                const edge = state.edges.find((e) => e.id === edgeId)
                if (edge) {
                  // Initialize edge.data if undefined
                  if (!edge.data) {
                    edge.data = {
                      id: edge.id,
                      source: edge.source,
                      target: edge.target,
                    }
                  }
                  edge.data = { ...edge.data, ...updates }
                }
              }),

            // 选择节点
            selectNode: (nodeId: string) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.selectedNodeIds = [nodeId]
              }),

            // 批量选择节点
            selectNodes: (nodeIds: string[]) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.selectedNodeIds = nodeIds
              }),

            // 取消选择节点
            deselectNode: (nodeId: string) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.selectedNodeIds = state.selectedNodeIds.filter((id) => id !== nodeId)
              }),

            // 取消所有选择
            deselectAll: () =>
              set((state: Draft<WorkflowEditorState>) => {
                state.selectedNodeIds = []
                state.selectedEdgeIds = []
              }),

            // 选择边
            selectEdge: (edgeId: string) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.selectedEdgeIds = [edgeId]
              }),

            // 批量选择边
            selectEdges: (edgeIds: string[]) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.selectedEdgeIds = edgeIds
              }),

            // 取消选择边
            deselectEdge: (edgeId: string) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.selectedEdgeIds = state.selectedEdgeIds.filter((id) => id !== edgeId)
              }),

            // 设置视口
            setViewport: (viewport: { x: number; y: number; zoom: number }) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.viewport = viewport
              }),

            // 切换 MiniMap
            toggleMiniMap: () =>
              set((state: Draft<WorkflowEditorState>) => {
                state.showMiniMap = !state.showMiniMap
              }),

            // 切换网格
            toggleGrid: () =>
              set((state: Draft<WorkflowEditorState>) => {
                state.showGrid = !state.showGrid
              }),

            // 设置网格类型
            setGridType: (type: 'dots' | 'lines' | 'none') =>
              set((state: Draft<WorkflowEditorState>) => {
                state.gridType = type
              }),

            // 复制节点
            duplicateNodes: (nodeIds: string[]) =>
              set((state: Draft<WorkflowEditorState>) => {
                const nodesToDuplicate = state.nodes.filter((n) => nodeIds.includes(n.id))
                const duplicatedNodes: Node<WorkflowNodeData>[] = []
                const idMap: Record<string, string> = {}

                // 创建新节点
                nodesToDuplicate.forEach((node) => {
                  const newId = `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                  idMap[node.id] = newId

                  duplicatedNodes.push({
                    ...node,
                    id: newId,
                    position: {
                      x: node.position.x + 50,
                      y: node.position.y + 50,
                    },
                    data: {
                      ...node.data,
                      id: newId,
                      label: `${node.data.label} (Copy)`,
                    },
                  })
                })

                // 复制相关边
                const duplicatedEdges: Edge<WorkflowEdgeData>[] = state.edges
                  .filter((e) => nodeIds.includes(e.source) || nodeIds.includes(e.target))
                  .map((edge) => ({
                    ...edge,
                    id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    source: idMap[edge.source] || edge.source,
                    target: idMap[edge.target] || edge.target,
                  }))

                state.nodes.push(...duplicatedNodes)
                state.edges.push(...duplicatedEdges)
                state.selectedNodeIds = duplicatedNodes.map((n) => n.id)
              }),

            // 删除选中项
            deleteSelected: () =>
              set((state: Draft<WorkflowEditorState>) => {
                state.nodes = state.nodes.filter((n) => !state.selectedNodeIds.includes(n.id))
                state.edges = state.edges.filter(
                  (e) =>
                    !state.selectedNodeIds.includes(e.source) &&
                    !state.selectedNodeIds.includes(e.target) &&
                    !state.selectedEdgeIds.includes(e.id)
                )
                state.selectedNodeIds = []
                state.selectedEdgeIds = []
              }),

            // 分组节点
            groupNodes: (nodeIds: string[], groupId: string) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.nodes.forEach((node) => {
                  if (nodeIds.includes(node.id)) {
                    node.data.groupId = groupId
                  }
                })
              }),

            // 取消分组
            ungroupNodes: (groupId: string) =>
              set((state: Draft<WorkflowEditorState>) => {
                state.nodes.forEach((node) => {
                  if (node.data.groupId === groupId) {
                    delete node.data.groupId
                  }
                })
              }),

            // 自动布局
            autoLayout: (layoutType: 'horizontal' | 'vertical' | 'force' = 'horizontal') =>
              set((state: Draft<WorkflowEditorState>) => {
                const { nodes, edges } = state

                // 简单的水平布局算法
                if (layoutType === 'horizontal') {
                  const levels: Record<string, number> = {}
                  const visited = new Set<string>()

                  // 计算每个节点的层级
                  const calculateLevel = (nodeId: string, level: number = 0): number => {
                    if (visited.has(nodeId)) return levels[nodeId] || 0
                    visited.add(nodeId)

                    const incomingEdges = edges.filter((e) => e.target === nodeId)
                    if (incomingEdges.length === 0) {
                      levels[nodeId] = 0
                      return 0
                    }

                    const maxParentLevel = Math.max(
                      ...incomingEdges.map((e) => calculateLevel(e.source, level + 1))
                    )
                    levels[nodeId] = maxParentLevel + 1
                    return levels[nodeId]
                  }

                  nodes.forEach((node) => calculateLevel(node.id))

                  // 按层级排列节点
                  const nodesByLevel: Record<number, Node<WorkflowNodeData>[]> = {}
                  Object.entries(levels).forEach(([nodeId, level]) => {
                    if (!nodesByLevel[level]) nodesByLevel[level] = []
                    const node = nodes.find((n) => n.id === nodeId)
                    if (node) nodesByLevel[level].push(node)
                  })

                  // 更新节点位置
                  Object.entries(nodesByLevel).forEach(([level, levelNodes]) => {
                    levelNodes.forEach((node, index) => {
                      node.position = {
                        x: parseInt(level) * 300,
                        y: index * 150,
                      }
                    })
                  })
                }
              }),

            // 搜索节点
            searchNodes: (query: string) => {
              const { nodes } = get()
              const lowerQuery = query.toLowerCase()

              return nodes.filter(
                (node: Node<WorkflowNodeData>) =>
                  node.data.label.toLowerCase().includes(lowerQuery) ||
                  node.data.description?.toLowerCase().includes(lowerQuery) ||
                  node.data.type.toLowerCase().includes(lowerQuery)
              )
            },

            // 重置
            reset: () =>
              set((state: Draft<WorkflowEditorState>) => {
                state.workflow = null
                state.nodes = []
                state.edges = []
                state.selectedNodeIds = []
                state.selectedEdgeIds = []
                state.viewport = { x: 0, y: 0, zoom: 1 }
              }),
          })),
        {
          name: 'workflow-editor-storage',
          partialize: (state) => ({
            workflow: state.workflow,
            nodes: state.nodes,
            edges: state.edges,
            viewport: state.viewport,
            showMiniMap: state.showMiniMap,
            showGrid: state.showGrid,
            gridType: state.gridType,
          }),
        }
      ),
      { name: 'WorkflowEditorStore' }
    )
  )

// ============================================
// 导出
// ============================================

export const useWorkflowEditorStore = createWorkflowEditorStore()

// 撤销/重做 Hook (TODO: Implement proper undo/redo with zundo v2.x)
export const useUndoRedo = () => {
  // TODO: Implement with zundo v2.x temporal store
  // For now, return placeholder implementation
  return {
    undo: () => {
      console.warn('Undo not implemented yet')
    },
    redo: () => {
      console.warn('Redo not implemented yet')
    },
    canUndo: false,
    canRedo: false,
    historySize: 0,
  }
}