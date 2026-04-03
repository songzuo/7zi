/**
 * WorkflowEditor v1.10.0 测试
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClipboard } from '../hooks/useClipboard'
import { applyLayout, horizontalLayout, verticalLayout, treeLayout, forceLayout } from '../AutoLayout'
import type { Node, Edge } from 'reactflow'
import type { WorkflowNodeData } from '../types'

// ============================================
// 剪贴板测试
// ============================================

describe('useClipboard', () => {
  // 每个测试前清空 localStorage
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  const mockNodes: Node<WorkflowNodeData>[] = [
    {
      id: 'node-1',
      type: 'start',
      position: { x: 0, y: 0 },
      data: {
        id: 'node-1',
        type: 'start',
        label: 'Start',
        config: {},
      },
    },
    {
      id: 'node-2',
      type: 'end',
      position: { x: 200, y: 0 },
      data: {
        id: 'node-2',
        type: 'end',
        label: 'End',
        config: {},
      },
    },
  ]

  const mockEdges: Edge[] = [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
    },
  ]

  it('should copy nodes', () => {
    const { result } = renderHook(() => useClipboard())

    act(() => {
      result.current.copyNodes(mockNodes, mockEdges, ['node-1'])
    })

    expect(result.current.clipboardData).not.toBeNull()
    expect(result.current.clipboardData?.nodes).toHaveLength(1)
    expect(result.current.clipboardData?.nodes[0].id).toBe('node-1')
  })

  it('should paste nodes with offset', () => {
    const { result } = renderHook(() => useClipboard())

    act(() => {
      result.current.copyNodes(mockNodes, mockEdges, ['node-1'])
    })

    let pastedResult: any
    act(() => {
      pastedResult = result.current.pasteNodes({ x: 50, y: 50 })
    })

    expect(pastedResult).not.toBeNull()
    expect(pastedResult.nodes).toHaveLength(1)
    expect(pastedResult.nodes[0].id).not.toBe('node-1') // 新 ID
    expect(pastedResult.nodes[0].data.label).toBe('Start (Copy)')
  })

  it('should paste nodes with default offset', () => {
    const { result } = renderHook(() => useClipboard())

    act(() => {
      result.current.copyNodes(mockNodes, mockEdges, ['node-1'])
    })

    let pastedResult: any
    act(() => {
      pastedResult = result.current.pasteNodes()
    })

    expect(pastedResult).not.toBeNull()
    expect(pastedResult.nodes).toHaveLength(1)
  })

  it('should cut nodes', () => {
    const { result } = renderHook(() => useClipboard())

    let cutResult: any
    act(() => {
      cutResult = result.current.cutNodes(mockNodes, mockEdges, ['node-1'])
    })

    expect(cutResult.clipboardData.nodes).toHaveLength(1)
    expect(cutResult.nodesToDelete).toContain('node-1')
    expect(cutResult.edgesToDelete).toContain('edge-1')
  })

  it('should check if clipboard has data', () => {
    const { result } = renderHook(() => useClipboard())

    expect(result.current.hasClipboardData()).toBe(false)

    act(() => {
      result.current.copyNodes(mockNodes, mockEdges, ['node-1'])
    })

    expect(result.current.hasClipboardData()).toBe(true)
  })

  it('should clear clipboard', () => {
    const { result } = renderHook(() => useClipboard())

    act(() => {
      result.current.copyNodes(mockNodes, mockEdges, ['node-1'])
    })

    expect(result.current.hasClipboardData()).toBe(true)

    act(() => {
      result.current.clearClipboard()
    })

    expect(result.current.hasClipboardData()).toBe(false)
  })

  it('should return null when pasting empty clipboard', () => {
    const { result } = renderHook(() => useClipboard())

    let pastedResult: any
    act(() => {
      pastedResult = result.current.pasteNodes({ x: 50, y: 50 })
    })

    expect(pastedResult).toBeNull()
  })

  it('should copy multiple nodes', () => {
    const { result } = renderHook(() => useClipboard())

    act(() => {
      result.current.copyNodes(mockNodes, mockEdges, ['node-1', 'node-2'])
    })

    expect(result.current.clipboardData?.nodes).toHaveLength(2)
  })

  it('should preserve node data when copying', () => {
    const nodesWithData: Node<WorkflowNodeData>[] = [
      {
        id: 'node-data',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: {
          id: 'node-data',
          type: 'agent',
          label: 'Agent Node',
          config: {
            agentType: 'chat',
            timeout: 5000,
          },
        },
      },
    ]

    const { result } = renderHook(() => useClipboard())

    act(() => {
      result.current.copyNodes(nodesWithData, [], ['node-data'])
    })

    expect(result.current.clipboardData?.nodes[0].data.config.agentType).toBe('chat')
    expect(result.current.clipboardData?.nodes[0].data.config.timeout).toBe(5000)
  })
})

// ============================================
// 自动布局测试
// ============================================

describe('AutoLayout', () => {
  const mockNodes: Node<WorkflowNodeData>[] = [
    {
      id: 'start',
      type: 'start',
      position: { x: 0, y: 0 },
      data: {
        id: 'start',
        type: 'start',
        label: 'Start',
        config: {},
      },
    },
    {
      id: 'agent',
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        id: 'agent',
        type: 'agent',
        label: 'Agent',
        config: {},
      },
    },
    {
      id: 'end',
      type: 'end',
      position: { x: 0, y: 0 },
      data: {
        id: 'end',
        type: 'end',
        label: 'End',
        config: {},
      },
    },
  ]

  const mockEdges: Edge[] = [
    { id: 'e1', source: 'start', target: 'agent' },
    { id: 'e2', source: 'agent', target: 'end' },
  ]

  it('should apply horizontal layout', () => {
    const result = horizontalLayout(mockNodes, mockEdges)

    expect(result.nodes).toHaveLength(3)
    expect(result.edges).toHaveLength(2)

    // Start 应该在最左边
    const startNode = result.nodes.find((n) => n.id === 'start')
    const agentNode = result.nodes.find((n) => n.id === 'agent')
    expect(startNode?.position.x).toBeLessThan(agentNode?.position.x ?? Infinity)
  })

  it('should apply vertical layout', () => {
    const result = verticalLayout(mockNodes, mockEdges)

    expect(result.nodes).toHaveLength(3)
    expect(result.edges).toHaveLength(2)

    // Start 应该在最上边
    const startNode = result.nodes.find((n) => n.id === 'start')
    const agentNode = result.nodes.find((n) => n.id === 'agent')
    expect(startNode?.position.y).toBeLessThan(agentNode?.position.y ?? Infinity)
  })

  it('should apply tree layout', () => {
    const result = treeLayout(mockNodes, mockEdges)

    expect(result.nodes).toHaveLength(3)
    expect(result.edges).toHaveLength(2)
  })

  it('should apply force layout', () => {
    const result = forceLayout(mockNodes, mockEdges, 10)

    expect(result.nodes).toHaveLength(3)
    expect(result.edges).toHaveLength(2)

    // 节点应该有位置
    result.nodes.forEach((node) => {
      expect(node.position.x).toBeDefined()
      expect(node.position.y).toBeDefined()
    })
  })

  it('should apply force layout with fewer iterations', () => {
    const result = forceLayout(mockNodes, mockEdges, 5)

    expect(result.nodes).toHaveLength(3)
  })

  it('should apply layout by type', () => {
    const horizontalResult = applyLayout(mockNodes, mockEdges, 'horizontal')
    const verticalResult = applyLayout(mockNodes, mockEdges, 'vertical')
    const treeResult = applyLayout(mockNodes, mockEdges, 'tree')
    const forceResult = applyLayout(mockNodes, mockEdges, 'force')

    expect(horizontalResult.nodes).toHaveLength(3)
    expect(verticalResult.nodes).toHaveLength(3)
    expect(treeResult.nodes).toHaveLength(3)
    expect(forceResult.nodes).toHaveLength(3)
  })

  it('should handle empty nodes array', () => {
    const result = horizontalLayout([], mockEdges)
    expect(result.nodes).toHaveLength(0)
    // Edges are preserved even with empty nodes (layout doesn't filter edges)
    expect(result.edges).toHaveLength(mockEdges.length)
  })

  it('should handle single node', () => {
    const singleNode = [mockNodes[0]]
    const result = horizontalLayout(singleNode, [])
    expect(result.nodes).toHaveLength(1)
  })

  it('should handle disconnected nodes', () => {
    const disconnectedNodes: Node<WorkflowNodeData>[] = [
      {
        id: 'disc-1',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { id: 'disc-1', type: 'start', label: 'Disc 1', config: {} },
      },
      {
        id: 'disc-2',
        type: 'end',
        position: { x: 0, y: 0 },
        data: { id: 'disc-2', type: 'end', label: 'Disc 2', config: {} },
      },
    ]

    const result = horizontalLayout(disconnectedNodes, [])
    expect(result.nodes).toHaveLength(2)
  })
})

// ============================================
// 键盘快捷键测试
// ============================================

describe('KeyboardShortcuts', () => {
  it('should have correct keyboard shortcuts', async () => {
    const { KEYBOARD_SHORTCUTS } = await import('../constants')

    expect(KEYBOARD_SHORTCUTS.SAVE).toBe('Ctrl+S')
    expect(KEYBOARD_SHORTCUTS.UNDO).toBe('Ctrl+Z')
    expect(KEYBOARD_SHORTCUTS.REDO).toBe('Ctrl+Y')
    expect(KEYBOARD_SHORTCUTS.COPY).toBe('Ctrl+C')
    expect(KEYBOARD_SHORTCUTS.PASTE).toBe('Ctrl+V')
    expect(KEYBOARD_SHORTCUTS.DELETE).toBe('Delete')
    expect(KEYBOARD_SHORTCUTS.FIND).toBe('Ctrl+F')
  })

  it('should have correct additional shortcuts', async () => {
    const { KEYBOARD_SHORTCUTS } = await import('../constants')

    expect(KEYBOARD_SHORTCUTS.SELECT_ALL).toBe('Ctrl+A')
    expect(KEYBOARD_SHORTCUTS.DUPLICATE).toBe('Ctrl+D')
    expect(KEYBOARD_SHORTCUTS.AUTO_LAYOUT).toBe('Ctrl+L')
    expect(KEYBOARD_SHORTCUTS.ZOOM_IN).toBe('Ctrl+=')
    expect(KEYBOARD_SHORTCUTS.ZOOM_OUT).toBe('Ctrl+-')
    expect(KEYBOARD_SHORTCUTS.ZOOM_RESET).toBe('Ctrl+0')
  })
})

// ============================================
// 性能配置测试
// ============================================

describe('PerformanceConfig', () => {
  it('should have correct performance settings', async () => {
    const { PERFORMANCE_CONFIG } = await import('../constants.v110')

    expect(PERFORMANCE_CONFIG.MAX_NODES).toBe(1000)
    expect(PERFORMANCE_CONFIG.MAX_EDGES).toBe(2000)
    expect(PERFORMANCE_CONFIG.RENDER_THRESHOLD).toBe(100)
  })

  it('should have correct history settings', async () => {
    const { HISTORY_CONFIG } = await import('../constants.v110')

    expect(HISTORY_CONFIG.DEFAULT_LIMIT).toBe(100)
    expect(HISTORY_CONFIG.MAX_LIMIT).toBe(500)
    expect(HISTORY_CONFIG.MIN_LIMIT).toBe(10)
  })
})

// ============================================
// 导出配置测试
// ============================================

describe('ExportConfig', () => {
  it('should have correct export settings', async () => {
    const { EXPORT_CONFIG } = await import('../constants.v110')

    expect(EXPORT_CONFIG.version).toBe('1.10.0')
    expect(EXPORT_CONFIG.supportedVersions).toContain('1.9.0')
    expect(EXPORT_CONFIG.supportedVersions).toContain('1.9.1')
    expect(EXPORT_CONFIG.supportedVersions).toContain('1.10.0')
  })
})

// ============================================
// 版本测试
// ============================================

describe('Version', () => {
  it('should have correct version', async () => {
    const { EDITOR_VERSION } = await import('../constants.v110')

    expect(EDITOR_VERSION).toBe('1.10.0')
  })
})
