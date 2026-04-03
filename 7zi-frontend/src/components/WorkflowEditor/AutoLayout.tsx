/**
 * 自动布局工具
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.0
 *
 * 提供多种自动布局算法
 */

import React, { useState } from 'react'
import { Layout, ArrowRight, ArrowDown, Circle, GitBranch } from 'lucide-react'
import type { Node, Edge } from 'reactflow'
import type { WorkflowNodeData } from '../types'

// ============================================
// 布局算法
// ============================================

export type LayoutType = 'horizontal' | 'vertical' | 'force' | 'tree'

interface LayoutResult {
  nodes: Node<WorkflowNodeData>[]
  edges: Edge<any>[]
}

/**
 * 水平布局算法
 */
export function horizontalLayout(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge<any>[]
): LayoutResult {
  const levels: Record<string, number> = {}
  const visited = new Set<string>()

  // 计算每个节点的层级
  const calculateLevel = (nodeId: string): number => {
    if (visited.has(nodeId)) return levels[nodeId] || 0
    visited.add(nodeId)

    const incomingEdges = edges.filter((e) => e.target === nodeId)
    if (incomingEdges.length === 0) {
      levels[nodeId] = 0
      return 0
    }

    const maxParentLevel = Math.max(
      ...incomingEdges.map((e) => calculateLevel(e.source))
    )
    levels[nodeId] = maxParentLevel + 1
    return levels[nodeId]
  }

  nodes.forEach((node) => calculateLevel(node.id))

  // 按层级分组
  const nodesByLevel: Record<number, Node<WorkflowNodeData>[]> = {}
  Object.entries(levels).forEach(([nodeId, level]) => {
    if (!nodesByLevel[level]) nodesByLevel[level] = []
    const node = nodes.find((n) => n.id === nodeId)
    if (node) nodesByLevel[level].push(node)
  })

  // 更新节点位置
  const layoutedNodes = nodes.map((node) => {
    const level = levels[node.id] || 0
    const levelNodes = nodesByLevel[level] || []
    const indexInLevel = levelNodes.indexOf(node)

    return {
      ...node,
      position: {
        x: level * 300,
        y: indexInLevel * 150,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

/**
 * 垂直布局算法
 */
export function verticalLayout(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge<any>[]
): LayoutResult {
  const levels: Record<string, number> = {}
  const visited = new Set<string>()

  // 计算每个节点的层级
  const calculateLevel = (nodeId: string): number => {
    if (visited.has(nodeId)) return levels[nodeId] || 0
    visited.add(nodeId)

    const incomingEdges = edges.filter((e) => e.target === nodeId)
    if (incomingEdges.length === 0) {
      levels[nodeId] = 0
      return 0
    }

    const maxParentLevel = Math.max(
      ...incomingEdges.map((e) => calculateLevel(e.source))
    )
    levels[nodeId] = maxParentLevel + 1
    return levels[nodeId]
  }

  nodes.forEach((node) => calculateLevel(node.id))

  // 按层级分组
  const nodesByLevel: Record<number, Node<WorkflowNodeData>[]> = {}
  Object.entries(levels).forEach(([nodeId, level]) => {
    if (!nodesByLevel[level]) nodesByLevel[level] = []
    const node = nodes.find((n) => n.id === nodeId)
    if (node) nodesByLevel[level].push(node)
  })

  // 更新节点位置
  const layoutedNodes = nodes.map((node) => {
    const level = levels[node.id] || 0
    const levelNodes = nodesByLevel[level] || []
    const indexInLevel = levelNodes.indexOf(node)

    return {
      ...node,
      position: {
        x: indexInLevel * 250,
        y: level * 200,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

/**
 * 力导向布局算法（简化版）
 */
export function forceLayout(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge<any>[],
  iterations: number = 100
): LayoutResult {
  if (nodes.length === 0) return { nodes, edges }

  const width = 1000
  const height = 800
  const k = Math.sqrt((width * height) / nodes.length) // 最优距离

  // 初始化位置（随机分布）
  const positions: Record<string, { x: number; y: number; vx: number; vy: number }> = {}
  nodes.forEach((node, index) => {
    positions[node.id] = {
      x: node.position.x || (index % 5) * 200,
      y: node.position.y || Math.floor(index / 5) * 200,
      vx: 0,
      vy: 0,
    }
  })

  // 迭代计算
  for (let iter = 0; iter < iterations; iter++) {
    // 计算斥力
    nodes.forEach((node1) => {
      nodes.forEach((node2) => {
        if (node1.id === node2.id) return

        const p1 = positions[node1.id]
        const p2 = positions[node2.id]

        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        // 斥力（库仑力）
        const force = (k * k) / distance
        p1.vx += (dx / distance) * force * 0.1
        p1.vy += (dy / distance) * force * 0.1
      })
    })

    // 计算引力（边）
    edges.forEach((edge) => {
      const p1 = positions[edge.source]
      const p2 = positions[edge.target]
      if (!p1 || !p2) return

      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1

      // 引力（弹簧力）
      const force = (distance - k) / k
      p1.vx += (dx / distance) * force * 0.01
      p1.vy += (dy / distance) * force * 0.01
      p2.vx -= (dx / distance) * force * 0.01
      p2.vy -= (dy / distance) * force * 0.01
    })

    // 应用速度并添加阻尼
    nodes.forEach((node) => {
      const p = positions[node.id]
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.9 // 阻尼
      p.vy *= 0.9

      // 边界检查
      p.x = Math.max(0, Math.min(width, p.x))
      p.y = Math.max(0, Math.min(height, p.y))
    })
  }

  // 应用位置
  const layoutedNodes = nodes.map((node) => ({
    ...node,
    position: {
      x: positions[node.id].x,
      y: positions[node.id].y,
    },
  }))

  return { nodes: layoutedNodes, edges }
}

/**
 * 树形布局算法
 */
export function treeLayout(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge<any>[]
): LayoutResult {
  const levels: Record<string, number> = {}
  const visited = new Set<string>()

  // 计算每个节点的层级
  const calculateLevel = (nodeId: string, level: number = 0): void => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    levels[nodeId] = level

    const outgoingEdges = edges.filter((e) => e.source === nodeId)
    outgoingEdges.forEach((edge) => {
      calculateLevel(edge.target, level + 1)
    })
  }

  // 找到根节点（没有入边的节点）
  const rootNodes = nodes.filter(
    (node) => !edges.some((e) => e.target === node.id)
  )

  rootNodes.forEach((root) => calculateLevel(root.id))

  // 按层级分组
  const nodesByLevel: Record<number, Node<WorkflowNodeData>[]> = {}
  Object.entries(levels).forEach(([nodeId, level]) => {
    if (!nodesByLevel[level]) nodesByLevel[level] = []
    const node = nodes.find((n) => n.id === nodeId)
    if (node) nodesByLevel[level].push(node)
  })

  // 计算每层的宽度
  const maxNodesPerLevel = Math.max(
    ...Object.values(nodesByLevel).map((arr) => arr.length)
  )
  const levelWidth = 300
  const nodeSpacing = 200

  // 更新节点位置
  const layoutedNodes = nodes.map((node) => {
    const level = levels[node.id] ?? 0
    const levelNodes = nodesByLevel[level] || []
    const indexInLevel = levelNodes.indexOf(node)

    // 居中排列
    const totalWidth = (levelNodes.length - 1) * nodeSpacing
    const startX = -totalWidth / 2

    return {
      ...node,
      position: {
        x: startX + indexInLevel * nodeSpacing,
        y: level * levelWidth,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// ============================================
// 布局选择器组件
// ============================================

interface AutoLayoutPanelProps {
  onLayout: (type: LayoutType) => void
  disabled?: boolean
}

export const AutoLayoutPanel: React.FC<AutoLayoutPanelProps> = ({
  onLayout,
  disabled = false,
}) => {
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('horizontal')

  const layoutOptions: Array<{
    type: LayoutType
    icon: React.ReactNode
    label: string
    description: string
  }> = [
    {
      type: 'horizontal',
      icon: <ArrowRight className="h-5 w-5" />,
      label: '水平布局',
      description: '从左到右排列',
    },
    {
      type: 'vertical',
      icon: <ArrowDown className="h-5 w-5" />,
      label: '垂直布局',
      description: '从上到下排列',
    },
    {
      type: 'tree',
      icon: <GitBranch className="h-5 w-5" />,
      label: '树形布局',
      description: '按层级结构排列',
    },
    {
      type: 'force',
      icon: <Circle className="h-5 w-5" />,
      label: '力导向布局',
      description: '自动优化间距',
    },
  ]

  return (
    <div className="rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
      <div className="mb-3 flex items-center gap-2">
        <Layout className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">自动布局</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {layoutOptions.map((option) => (
          <button
            key={option.type}
            onClick={() => {
              setSelectedLayout(option.type)
              onLayout(option.type)
            }}
            disabled={disabled}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all ${
              selectedLayout === option.type
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <div className="text-gray-700 dark:text-gray-300">{option.icon}</div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {option.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================
// 导出布局函数
// ============================================

export const applyLayout = (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge<any>[],
  type: LayoutType
): LayoutResult => {
  switch (type) {
    case 'horizontal':
      return horizontalLayout(nodes, edges)
    case 'vertical':
      return verticalLayout(nodes, edges)
    case 'tree':
      return treeLayout(nodes, edges)
    case 'force':
      return forceLayout(nodes, edges)
    default:
      return { nodes, edges }
  }
}

export default AutoLayoutPanel