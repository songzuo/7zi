/**
 * React Flow Mock
 *
 * Mock React Flow 组件和 hooks 用于测试
 */

import { vi } from 'vitest'
import React from 'react'

// 定义基本的 Node 和 Edge 类型
interface MockNode {
  id: string
  position: { x: number; y: number }
  data?: unknown
  type?: string
}

interface MockEdge {
  id: string
  source: string
  target: string
}

interface MockNodeChange {
  type: string
  id?: string
  position?: { x: number; y: number }
}

interface MockEdgeChange {
  type: string
  id?: string
}

// Mock nodes and edges state
const createMockNodesState = (initialNodes: MockNode[]) => {
  let nodes = [...initialNodes]

  return [
    nodes,
    vi.fn((updater: MockNode[] | ((nodes: MockNode[]) => MockNode[])) => {
      if (typeof updater === 'function') {
        nodes = updater(nodes)
      } else {
        nodes = updater
      }
    }),
    vi.fn((changes: MockNodeChange[]) => {
      // Handle node changes
      changes.forEach((change) => {
        if (change.type === 'remove' && change.id) {
          nodes = nodes.filter((n) => n.id !== change.id)
        } else if (change.type === 'position' && change.position && change.id) {
          const node = nodes.find((n) => n.id === change.id)
          if (node) {
            node.position = change.position
          }
        }
      })
    }),
  ]
}

const createMockEdgesState = (initialEdges: MockEdge[]) => {
  let edges = [...initialEdges]

  return [
    edges,
    vi.fn((updater: MockEdge[] | ((edges: MockEdge[]) => MockEdge[])) => {
      if (typeof updater === 'function') {
        edges = updater(edges)
      } else {
        edges = updater
      }
    }),
    vi.fn((changes: MockEdgeChange[]) => {
      // Handle edge changes
      changes.forEach((change) => {
        if (change.type === 'remove' && change.id) {
          edges = edges.filter((e) => e.id !== change.id)
        }
      })
    }),
  ]
}

// Mock React Flow hooks
vi.mock('reactflow', () => {
  const React = require('react')

  return {
    useNodesState: vi.fn(initialNodes => createMockNodesState(initialNodes)),
    useEdgesState: vi.fn(initialEdges => createMockEdgesState(initialEdges)),
    addEdge: vi.fn((connection, edges) => [
      ...edges,
      {
        id: `e${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        ...connection,
      },
    ]),
    applyNodeChanges: vi.fn((changes, nodes) => nodes),
    applyEdgeChanges: vi.fn((changes, edges) => edges),
    useReactFlow: vi.fn(() => ({
      fitView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      setNodes: vi.fn(),
      setEdges: vi.fn(),
      getNodes: vi.fn(() => []),
      getEdges: vi.fn(() => []),
      project: vi.fn(({ x, y }) => ({ x, y })),
    })),
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
    Panel: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'panel' }, children),
    Background: () => React.createElement('div', { 'data-testid': 'background' }),
    Controls: () => React.createElement('div', { 'data-testid': 'controls' }),
    MiniMap: () => React.createElement('div', { 'data-testid': 'minimap' }),
    Handle: ({ type, position, id, className }: { type: string; position: string; id?: string; className?: string }) =>
      React.createElement('div', { 'data-testid': `handle-${type}-${position}-${id || 'default'}`, className }),
    Position: {
      Top: 'top',
      Right: 'right',
      Bottom: 'bottom',
      Left: 'left',
    },
    MarkerType: {
      ArrowClosed: 'arrowClosed',
      Arrow: 'arrow',
      None: 'none',
    },
    BackgroundVariant: {
      Dots: 'dots',
      Lines: 'lines',
    },
    SelectionMode: {
      Partial: 'partial',
      Full: 'full',
    },
    useSelection: vi.fn(() => ({
      selectedNodes: [],
      selectedEdges: [],
    })),
    Connection: vi.fn(),
    Node: vi.fn(),
    Edge: vi.fn(),
  }
})

export { createMockNodesState, createMockEdgesState }
