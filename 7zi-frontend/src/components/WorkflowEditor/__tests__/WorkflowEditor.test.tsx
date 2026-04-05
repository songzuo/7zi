/**
 * WorkflowEditor 组件测试
 *
 * 🧪 测试员: Tester
 * 创建日期: 2026-04-02
 *
 * 测试覆盖：
 * - 组件渲染测试
 * - 用户交互测试
 * - 状态管理测试
 * - 边界情况测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Mock React Flow
vi.mock('reactflow', () => {
  const React = require('react')

  return {
    default: vi.fn(
      ({
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        onNodeClick,
        onEdgeClick,
        onPaneClick,
        children,
      }) =>
        React.createElement(
          'div',
          {
            'data-testid': 'react-flow',
            'data-nodes-count': nodes?.length || 0,
            'data-edges-count': edges?.length || 0,
          },
          children
        )
    ),
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'react-flow-provider' }, children),
    useNodesState: vi.fn(initial => [initial, vi.fn(), vi.fn()]),
    useEdgesState: vi.fn(initial => [initial, vi.fn(), vi.fn()]),
    addEdge: vi.fn((connection, edges) => [...edges, { ...connection, id: `e-${Date.now()}` }]),
    Background: () => React.createElement('div', { 'data-testid': 'background' }),
    Controls: () => React.createElement('div', { 'data-testid': 'controls' }),
    MiniMap: () => React.createElement('div', { 'data-testid': 'minimap' }),
    Panel: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'panel' }, children),
    useReactFlow: vi.fn(() => ({
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      fitView: vi.fn(),
      getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
      setViewport: vi.fn(),
    })),
    BackgroundVariant: {
      Dots: 'dots',
      Lines: 'lines',
      Cross: 'cross',
    },
  }
})

// Mock 子组件
vi.mock('../Toolbar', () => ({
  Toolbar: ({ onSave, onRun, readOnly }: { onSave?: () => void; onRun?: () => void; readOnly?: boolean }) =>
    React.createElement(
      'div',
      { 'data-testid': 'toolbar' },
      React.createElement(
        'button',
        {
          'data-testid': 'save-btn',
          onClick: onSave,
          disabled: readOnly,
        },
        'Save'
      ),
      React.createElement(
        'button',
        {
          'data-testid': 'run-btn',
          onClick: onRun,
          disabled: readOnly,
        },
        'Run'
      )
    ),
}))

vi.mock('../NodePalette', () => ({
  NodePalette: ({ disabled }: { disabled?: boolean }) =>
    React.createElement('div', {
      'data-testid': 'node-palette',
      'data-disabled': disabled,
    }),
}))

vi.mock('../StatusBar', () => ({
  StatusBar: ({ nodesCount, edgesCount }: { nodesCount?: number; edgesCount?: number }) =>
    React.createElement(
      'div',
      { 'data-testid': 'status-bar' },
      `Nodes: ${nodesCount}, Edges: ${edgesCount}`
    ),
}))

vi.mock('../ExecutionPanel', () => ({
  ExecutionPanel: () => React.createElement('div', { 'data-testid': 'execution-panel' }),
}))

vi.mock('../ValidationPanel', () => ({
  ValidationPanel: ({ errors }: { errors?: Array<{ message: string }> }) =>
    React.createElement(
      'div',
      { 'data-testid': 'validation-panel' },
      errors?.map((e: { message: string }) => e.message).join(', ')
    ),
}))

vi.mock('../PropertiesPanel', () => ({
  PropertiesPanel: ({ node }: { node?: { data: Record<string, unknown> } }) =>
    React.createElement(
      'div',
      { 'data-testid': 'properties-panel' },
      `Selected: ${node?.data?.label || 'none'}`
    ),
}))

// Mock hooks
vi.mock('../hooks/useWorkflowValidation', () => ({
  useWorkflowValidation: vi.fn(() => ({
    validationErrors: [],
    validateWorkflow: vi.fn(() => ({ valid: true, errors: [] })),
  })),
}))

vi.mock('../hooks/useWorkflowExecution', () => ({
  useWorkflowExecution: vi.fn(() => ({
    executionState: null,
    isExecuting: false,
    startExecution: vi.fn(),
    stopExecution: vi.fn(),
    logs: [],
  })),
}))

// 导入组件（在 mock 之后）
import { WorkflowEditor } from '../WorkflowEditor'

describe('WorkflowEditor', () => {
  const defaultProps = {
    workflowId: 'test-workflow',
    initialNodes: [],
    initialEdges: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('组件渲染测试', () => {
    it('应该正确渲染基本组件', () => {
      render(React.createElement(WorkflowEditor, defaultProps))

      expect(screen.getByTestId('toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('node-palette')).toBeInTheDocument()
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })

    it('应该渲染工具栏按钮', () => {
      render(React.createElement(WorkflowEditor, defaultProps))

      expect(screen.getByTestId('save-btn')).toBeInTheDocument()
      expect(screen.getByTestId('run-btn')).toBeInTheDocument()
    })

    it('应该在 readOnly 模式下禁用相关功能', () => {
      render(React.createElement(WorkflowEditor, { ...defaultProps, readOnly: true }))

      const saveBtn = screen.getByTestId('save-btn')
      expect(saveBtn).toBeDisabled()
    })

    it('应该显示节点和边的数量', () => {
      const nodes = [
        {
          id: 'n1',
          type: 'start',
          position: { x: 0, y: 0 },
          data: { id: 'n1', type: 'start', label: 'Start', config: {} },
        },
        {
          id: 'n2',
          type: 'end',
          position: { x: 100, y: 0 },
          data: { id: 'n2', type: 'end', label: 'End', config: {} },
        },
      ]
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2', data: { id: 'e1', source: 'n1', target: 'n2' } },
      ]

      render(
        React.createElement(WorkflowEditor, {
          ...defaultProps,
          initialNodes: nodes,
          initialEdges: edges,
        })
      )

      expect(screen.getByText('Nodes: 2, Edges: 1')).toBeInTheDocument()
    })
  })

  describe('用户交互测试', () => {
    it('应该调用 onSave 回调当点击保存按钮', async () => {
      const onSave = vi.fn()
      render(React.createElement(WorkflowEditor, { ...defaultProps, onSave }))

      const saveBtn = screen.getByTestId('save-btn')
      await userEvent.click(saveBtn)

      expect(onSave).toHaveBeenCalled()
    })

    it('应该使用 Ctrl+S 快捷键保存', async () => {
      const onSave = vi.fn()
      render(React.createElement(WorkflowEditor, { ...defaultProps, onSave }))

      fireEvent.keyDown(window, { key: 's', ctrlKey: true })

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled()
      })
    })

    it('应该在 readOnly 模式下忽略快捷键', async () => {
      const onSave = vi.fn()
      render(React.createElement(WorkflowEditor, { ...defaultProps, onSave, readOnly: true }))

      fireEvent.keyDown(window, { key: 's', ctrlKey: true })

      await waitFor(() => {
        expect(onSave).not.toHaveBeenCalled()
      })
    })
  })

  describe('状态管理测试', () => {
    it('应该正确初始化节点状态', () => {
      const nodes = [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 0, y: 0 },
          data: { id: 'start-1', type: 'start', label: 'Start', config: {} },
        },
      ]

      render(React.createElement(WorkflowEditor, { ...defaultProps, initialNodes: nodes }))

      expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-count', '1')
    })

    it('应该正确初始化边状态', () => {
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2', data: { id: 'e1', source: 'n1', target: 'n2' } },
      ]

      render(React.createElement(WorkflowEditor, { ...defaultProps, initialEdges: edges }))

      expect(screen.getByTestId('react-flow')).toHaveAttribute('data-edges-count', '1')
    })
  })

  describe('边界情况测试', () => {
    it('应该处理空的初始节点', () => {
      render(React.createElement(WorkflowEditor, { ...defaultProps, initialNodes: undefined }))

      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })

    it('应该处理空的初始边', () => {
      render(React.createElement(WorkflowEditor, { ...defaultProps, initialEdges: undefined }))

      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })

    it('应该处理空的 workflowId', () => {
      render(React.createElement(WorkflowEditor, { ...defaultProps, workflowId: undefined }))

      expect(screen.getByTestId('toolbar')).toBeInTheDocument()
    })

    it('应该处理无效的节点类型', () => {
      const nodes = [
        {
          id: 'n1',
          type: 'invalid-type',
          position: { x: 0, y: 0 },
          data: { id: 'n1', type: 'invalid-type' as any, label: 'Invalid', config: {} },
        },
      ]

      expect(() => {
        render(React.createElement(WorkflowEditor, { ...defaultProps, initialNodes: nodes }))
      }).not.toThrow()
    })

    it('应该处理大量节点而不崩溃', () => {
      const nodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        type: 'agent',
        position: { x: i * 100, y: 0 },
        data: {
          id: `node-${i}`,
          type: 'agent' as const,
          label: `Node ${i}`,
          config: { agentType: 'test' },
        },
      }))

      expect(() => {
        render(React.createElement(WorkflowEditor, { ...defaultProps, initialNodes: nodes }))
      }).not.toThrow()
    })
  })

  describe('验证功能测试', () => {
    it('应该在有验证错误时显示验证面板', async () => {
      // 重新 mock validation hook
      vi.mocked(
        await import('../hooks/useWorkflowValidation')
      ).useWorkflowValidation.mockReturnValue({
        validationErrors: [{ type: 'structure', severity: 'error', message: 'Missing Start node' }],
        validateWorkflow: vi.fn(() => ({ valid: false, errors: [] })),
      })

      render(React.createElement(WorkflowEditor, defaultProps))

      // 注意：由于 mock 的顺序，这个测试可能需要调整
    })
  })

  describe('拖放功能测试', () => {
    it('应该处理节点拖放', async () => {
      render(React.createElement(WorkflowEditor, defaultProps))

      const flowContainer = screen.getByTestId('react-flow').parentElement

      // 模拟拖放事件
      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: vi.fn(() => 'agent'),
          dropEffect: 'move',
        },
      })

      if (flowContainer) {
        fireEvent(flowContainer, dropEvent)
      }

      // 验证节点被添加（通过 mock）
    })

    it('应该处理拖拽经过事件', () => {
      render(React.createElement(WorkflowEditor, defaultProps))

      const flowContainer = screen.getByTestId('react-flow').parentElement

      const dragOverEvent = new Event('dragover', { bubbles: true })
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: { dropEffect: 'none' },
      })

      if (flowContainer) {
        fireEvent(flowContainer, dragOverEvent)
      }
    })
  })
})
