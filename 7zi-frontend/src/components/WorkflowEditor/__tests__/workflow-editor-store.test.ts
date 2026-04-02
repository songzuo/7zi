/**
 * WorkflowEditor Store Tests
 *
 * 测试工作流编辑器 store 的撤销/重做功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Edge, Node } from 'reactflow'
import {
  useWorkflowEditorStore,
  useUndoRedo,
} from '../stores/workflow-editor-store'
import type { WorkflowNodeData, WorkflowEdgeData } from '../types'

describe('WorkflowEditorStore', () => {
  beforeEach(() => {
    // 清除 store 状态
    useWorkflowEditorStore.getState().reset()
  })

  describe('基础操作', () => {
    it('应该能够添加节点', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      const newNode = {
        id: 'node-1',
        type: 'agent' as const,
        position: { x: 100, y: 100 },
        data: {
          id: 'node-1',
          type: 'agent' as const,
          label: 'Test Agent',
          config: {},
        } as WorkflowNodeData,
      }

      act(() => {
        result.current.addNode(newNode)
      })

      expect(result.current.nodes).toHaveLength(1)
      expect(result.current.nodes[0]).toEqual(newNode)
      expect(result.current.isDirty).toBe(true)
    })

    it('应该能够删除节点', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      const newNode = {
        id: 'node-1',
        type: 'agent' as const,
        position: { x: 100, y: 100 },
        data: {
          id: 'node-1',
          type: 'agent' as const,
          label: 'Test Agent',
          config: {},
        } as WorkflowNodeData,
      }

      act(() => {
        result.current.addNode(newNode)
      })

      expect(result.current.nodes).toHaveLength(1)

      act(() => {
        result.current.removeNode('node-1')
      })

      expect(result.current.nodes).toHaveLength(0)
    })

    it('应该能够添加边', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      const newEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'default',
      } as Edge<WorkflowEdgeData>

      act(() => {
        result.current.addEdge(newEdge)
      })

      expect(result.current.edges).toHaveLength(1)
      expect(result.current.edges[0]).toEqual(newEdge)
    })

    it('应该能够删除边', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      const newEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'default',
      } as Edge<WorkflowEdgeData>

      act(() => {
        result.current.addEdge(newEdge)
      })

      expect(result.current.edges).toHaveLength(1)

      act(() => {
        result.current.removeEdge('edge-1')
      })

      expect(result.current.edges).toHaveLength(0)
    })

    it('应该能够更新节点', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      const newNode = {
        id: 'node-1',
        type: 'agent' as const,
        position: { x: 100, y: 100 },
        data: {
          id: 'node-1',
          type: 'agent' as const,
          label: 'Test Agent',
          config: {},
        } as WorkflowNodeData,
      }

      act(() => {
        result.current.addNode(newNode)
      })

      act(() => {
        result.current.updateNode('node-1', { label: 'Updated Agent' })
      })

      expect(result.current.nodes[0].data.label).toBe('Updated Agent')
    })

    it('应该能够更新节点位置', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      const newNode = {
        id: 'node-1',
        type: 'agent' as const,
        position: { x: 100, y: 100 },
        data: {
          id: 'node-1',
          type: 'agent' as const,
          label: 'Test Agent',
          config: {},
        } as WorkflowNodeData,
      }

      act(() => {
        result.current.addNode(newNode)
      })

      act(() => {
        result.current.updateNodePosition('node-1', { x: 200, y: 200 })
      })

      expect(result.current.nodes[0].position).toEqual({ x: 200, y: 200 })
    })
  })

  describe('选择操作', () => {
    it('应该能够选择节点', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      act(() => {
        result.current.selectNode('node-1')
      })

      expect(result.current.selectedNodeId).toBe('node-1')
      expect(result.current.selectedEdgeId).toBe(null)
    })

    it('应该能够选择边', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      act(() => {
        result.current.selectEdge('edge-1')
      })

      expect(result.current.selectedEdgeId).toBe('edge-1')
      expect(result.current.selectedNodeId).toBe(null)
    })

    it('应该能够清除选择', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      act(() => {
        result.current.selectNode('node-1')
      })

      expect(result.current.selectedNodeId).toBe('node-1')

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.selectedNodeId).toBe(null)
      expect(result.current.selectedEdgeId).toBe(null)
    })
  })

  describe('撤销/重做', () => {
    it('应该能够撤销添加节点操作', async () => {
      const { result } = renderHook(() => useWorkflowEditorStore())
      const { result: undoRedoResult } = renderHook(() => useUndoRedo())

      const newNode = {
        id: 'node-1',
        type: 'agent' as const,
        position: { x: 100, y: 100 },
        data: {
          id: 'node-1',
          type: 'agent' as const,
          label: 'Test Agent',
          config: {},
        } as WorkflowNodeData,
      }

      act(() => {
        result.current.addNode(newNode)
      })

      expect(result.current.nodes).toHaveLength(1)

      // 等待状态更新
      await act(async () => {
        undoRedoResult.current.undo()
        // 添加一些延迟让状态同步
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(result.current.nodes).toHaveLength(0)
    })

    it('应该能够重做撤销的操作', async () => {
      const { result } = renderHook(() => useWorkflowEditorStore())
      const { result: undoRedoResult } = renderHook(() => useUndoRedo())

      const newNode = {
        id: 'node-1',
        type: 'agent' as const,
        position: { x: 100, y: 100 },
        data: {
          id: 'node-1',
          type: 'agent' as const,
          label: 'Test Agent',
          config: {},
        } as WorkflowNodeData,
      }

      act(() => {
        result.current.addNode(newNode)
      })

      expect(result.current.nodes).toHaveLength(1)

      // 等待状态更新
      await act(async () => {
        undoRedoResult.current.undo()
        // 添加一些延迟让状态同步
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(result.current.nodes).toHaveLength(0)

      // 重做
      await act(async () => {
        undoRedoResult.current.redo()
        // 添加一些延迟让状态同步
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(result.current.nodes).toHaveLength(1)
    })

    it('应该能够撤销删除节点操作', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())
      const { result: undoRedoResult } = renderHook(() => useUndoRedo())

      const newNode = {
        id: 'node-1',
        type: 'agent' as const,
        position: { x: 100, y: 100 },
        data: {
          id: 'node-1',
          type: 'agent' as const,
          label: 'Test Agent',
          config: {},
        } as WorkflowNodeData,
      }

      act(() => {
        result.current.addNode(newNode)
      })

      expect(result.current.nodes).toHaveLength(1)

      act(() => {
        result.current.removeNode('node-1')
      })

      expect(result.current.nodes).toHaveLength(0)

      act(() => {
        undoRedoResult.current.undo()
      })

      expect(result.current.nodes).toHaveLength(1)
    })

    it('应该能够撤销更新节点操作', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())
      const { result: undoRedoResult } = renderHook(() => useUndoRedo())

      const newNode = {
        id: 'node-1',
        type: 'agent' as const,
        position: { x: 100, y: 100 },
        data: {
          id: 'node-1',
          type: 'agent' as const,
          label: 'Test Agent',
          config: {},
        } as WorkflowNodeData,
      }

      act(() => {
        result.current.addNode(newNode)
      })

      act(() => {
        result.current.updateNode('node-1', { label: 'Updated Agent' })
      })

      expect(result.current.nodes[0].data.label).toBe('Updated Agent')

      act(() => {
        undoRedoResult.current.undo()
      })

      expect(result.current.nodes[0].data.label).toBe('Test Agent')
    })

    it('应该限制历史记录数量', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())
      const { result: undoRedoResult } = renderHook(() => useUndoRedo())

      // 添加超过限制的节点（限制为 50）
      for (let i = 0; i < 60; i++) {
        act(() => {
          result.current.addNode({
            id: `node-${i}`,
            type: 'agent' as const,
            position: { x: 100, y: 100 },
            data: {
              id: `node-${i}`,
              type: 'agent' as const,
              label: `Agent ${i}`,
              config: {},
            } as WorkflowNodeData,
          })
        })
      }

      // 历史记录应该被限制在 50 步
      expect(undoRedoResult.current.historySize).toBeLessThanOrEqual(50)
    })
  })

  describe('视图操作', () => {
    it('应该能够设置缩放级别', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      act(() => {
        result.current.setZoom(2)
      })

      expect(result.current.zoom).toBe(2)

      act(() => {
        result.current.setZoom(5) // 超过最大值
      })

      expect(result.current.zoom).toBe(3) // 最大值

      act(() => {
        result.current.setZoom(0.05) // 低于最小值
      })

      expect(result.current.zoom).toBe(0.1) // 最小值
    })

    it('应该能够设置平移位置', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      act(() => {
        result.current.setPanPosition({ x: 100, y: 200 })
      })

      expect(result.current.panPosition).toEqual({ x: 100, y: 200 })
    })
  })

  describe('状态标记', () => {
    it('应该能够标记为已修改', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      act(() => {
        result.current.markDirty()
      })

      expect(result.current.isDirty).toBe(true)
    })

    it('应该能够标记为未修改', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      act(() => {
        result.current.markDirty()
      })

      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.markClean()
      })

      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('重置操作', () => {
    it('应该能够重置到初始状态', () => {
      const { result } = renderHook(() => useWorkflowEditorStore())

      const newNode = {
        id: 'node-1',
        type: 'agent' as const,
        position: { x: 100, y: 100 },
        data: {
          id: 'node-1',
          type: 'agent' as const,
          label: 'Test Agent',
          config: {},
        } as WorkflowNodeData,
      }

      act(() => {
        result.current.addNode(newNode)
      })

      expect(result.current.nodes).toHaveLength(1)

      act(() => {
        result.current.reset()
      })

      expect(result.current.nodes).toHaveLength(0)
      expect(result.current.edges).toHaveLength(0)
      expect(result.current.selectedNodeId).toBe(null)
      expect(result.current.selectedEdgeId).toBe(null)
    })
  })
})