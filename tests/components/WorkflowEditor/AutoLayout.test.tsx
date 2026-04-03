/**
 * @fileoverview AutoLayout 组件测试
 * @description 测试自动布局算法的正确性
 * @version v1.10.0
 */

import { describe, it, expect } from 'vitest'
import {
  horizontalLayout,
  verticalLayout,
  treeLayout,
  autoLayout,
  LayoutType
} from '../../../../7zi-frontend/src/components/WorkflowEditor/AutoLayout'
import type { Node, Edge } from 'reactflow'
import type { WorkflowNodeData } from '../../../../7zi-frontend/src/components/WorkflowEditor/types'

// ============================================================================
// 测试数据准备
// ============================================================================

const createMockNode = (
  id: string,
  type: string = 'task',
  position: { x: number; y: number } = { x: 0, y: 0 }
): Node<WorkflowNodeData> => ({
  id,
  type,
  position,
  data: {
    label: `Node ${id}`,
    nodeType: type as any,
    status: 'pending'
  }
})

const createMockEdge = (
  id: string,
  source: string,
  target: string
): Edge => ({
  id,
  source,
  target,
  type: 'default'
})

// ============================================================================
// 测试用例
// ============================================================================

describe('AutoLayout 组件测试', () => {
  describe('horizontalLayout', () => {
    it('应该正确计算单节点的层级', () => {
      const nodes = [createMockNode('node-1')]
      const edges: Edge[] = []
      
      const result = horizontalLayout(nodes, edges)
      
      expect(result.nodes[0].position.x).toBe(0)
      expect(result.nodes[0].position.y).toBe(0)
    })

    it('应该正确计算多层级布局', () => {
      const nodes = [
        createMockNode('start'),
        createMockNode('task-1'),
        createMockNode('task-2'),
        createMockNode('end')
      ]
      const edges = [
        createMockEdge('e1', 'start', 'task-1'),
        createMockEdge('e2', 'task-1', 'task-2'),
        createMockEdge('e3', 'task-2', 'end')
      ]
      
      const result = horizontalLayout(nodes, edges)
      
      // start 应该在第 0 层
      const startNode = result.nodes.find(n => n.id === 'start')
      expect(startNode?.position.x).toBe(0)
      
      // task-1 应该在第 1 层
      const task1Node = result.nodes.find(n => n.id === 'task-1')
      expect(task1Node?.position.x).toBe(300)
      
      // end 应该在第 3 层
      const endNode = result.nodes.find(n => n.id === 'end')
      expect(endNode?.position.x).toBe(900)
    })

    it('应该处理并行分支', () => {
      const nodes = [
        createMockNode('start'),
        createMockNode('branch-1'),
        createMockNode('branch-2'),
        createMockNode('merge')
      ]
      const edges = [
        createMockEdge('e1', 'start', 'branch-1'),
        createMockEdge('e2', 'start', 'branch-2'),
        createMockEdge('e3', 'branch-1', 'merge'),
        createMockEdge('e4', 'branch-2', 'merge')
      ]
      
      const result = horizontalLayout(nodes, edges)
      
      // 两个分支节点应该在同一层级 (y 不同)
      const branch1 = result.nodes.find(n => n.id === 'branch-1')
      const branch2 = result.nodes.find(n => n.id === 'branch-2')
      
      expect(branch1?.position.x).toBe(branch2?.position.x)
      expect(branch1?.position.y).not.toBe(branch2?.position.y)
    })

    it('应该保持边的引用', () => {
      const nodes = [createMockNode('n1'), createMockNode('n2')]
      const edges = [createMockEdge('e1', 'n1', 'n2')]
      
      const result = horizontalLayout(nodes, edges)
      
      expect(result.edges).toHaveLength(1)
      expect(result.edges[0].id).toBe('e1')
    })
  })

  describe('verticalLayout', () => {
    it('应该正确计算垂直布局', () => {
      const nodes = [
        createMockNode('start'),
        createMockNode('task-1'),
        createMockNode('end')
      ]
      const edges = [
        createMockEdge('e1', 'start', 'task-1'),
        createMockEdge('e2', 'task-1', 'end')
      ]
      
      const result = verticalLayout(nodes, edges)
      
      const startNode = result.nodes.find(n => n.id === 'start')
      const task1Node = result.nodes.find(n => n.id === 'task-1')
      const endNode = result.nodes.find(n => n.id === 'end')
      
      // 垂直布局时，y 坐标随层级增加
      expect(startNode?.position.y).toBeLessThan(task1Node!.position.y)
      expect(task1Node!.position.y).toBeLessThan(endNode!.position.y)
    })
  })

  describe('treeLayout', () => {
    it('应该创建树形布局', () => {
      const nodes = [
        createMockNode('root'),
        createMockNode('child-1'),
        createMockNode('child-2'),
        createMockNode('grandchild-1')
      ]
      const edges = [
        createMockEdge('e1', 'root', 'child-1'),
        createMockEdge('e2', 'root', 'child-2'),
        createMockEdge('e3', 'child-1', 'grandchild-1')
      ]
      
      const result = treeLayout(nodes, edges)
      
      // root 应该在最左边
      const root = result.nodes.find(n => n.id === 'root')
      expect(root?.position.x).toBe(0)
      
      // 子节点应该在 root 右边
      const child1 = result.nodes.find(n => n.id === 'child-1')
      expect(child1!.position.x).toBeGreaterThan(0)
    })
  })

  describe('autoLayout', () => {
    it('应该根据类型选择正确的布局算法', () => {
      const nodes = [createMockNode('n1'), createMockNode('n2')]
      const edges = [createMockEdge('e1', 'n1', 'n2')]
      
      const hResult = autoLayout(nodes, edges, 'horizontal')
      expect(hResult.nodes[0].position.x).toBe(0)
      
      const vResult = autoLayout(nodes, edges, 'vertical')
      expect(vResult.nodes[0].position.y).toBe(0)
      
      const tResult = autoLayout(nodes, edges, 'tree')
      expect(tResult.nodes[0].position.x).toBe(0)
    })

    it('应该支持配置选项', () => {
      const nodes = [createMockNode('n1'), createMockNode('n2')]
      const edges = [createMockEdge('e1', 'n1', 'n2')]
      
      const result = autoLayout(nodes, edges, 'horizontal', {
        nodeWidth: 200,
        nodeHeight: 100,
        gapX: 400,
        gapY: 200
      })
      
      const n1 = result.nodes.find(n => n.id === 'n1')
      const n2 = result.nodes.find(n => n.id === 'n2')
      
      expect(n2!.position.x - n1!.position.x).toBeGreaterThanOrEqual(200)
    })
  })

  describe('边界情况', () => {
    it('应该处理空节点数组', () => {
      const result = horizontalLayout([], [])
      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })

    it('应该处理孤立节点', () => {
      const nodes = [
        createMockNode('isolated'),
        createMockNode('connected-1'),
        createMockNode('connected-2')
      ]
      const edges = [createMockEdge('e1', 'connected-1', 'connected-2')]
      
      const result = horizontalLayout(nodes, edges)
      
      // 孤立节点应该有默认位置
      const isolated = result.nodes.find(n => n.id === 'isolated')
      expect(isolated?.position).toBeDefined()
    })

    it('应该处理循环引用', () => {
      const nodes = [
        createMockNode('a'),
        createMockNode('b'),
        createMockNode('c')
      ]
      const edges = [
        createMockEdge('e1', 'a', 'b'),
        createMockEdge('e2', 'b', 'c'),
        createMockEdge('e3', 'c', 'a') // 循环
      ]
      
      // 不应抛出错误
      const result = horizontalLayout(nodes, edges)
      expect(result.nodes).toHaveLength(3)
    })

    it('应该处理自引用', () => {
      const nodes = [createMockNode('self')]
      const edges = [createMockEdge('e1', 'self', 'self')]
      
      const result = horizontalLayout(nodes, edges)
      expect(result.nodes).toHaveLength(1)
    })
  })
})
