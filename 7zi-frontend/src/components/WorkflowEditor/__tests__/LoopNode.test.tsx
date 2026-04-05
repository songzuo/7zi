/**
 * LoopNode 测试
 *
 * v1.9.1 新增
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from 'reactflow'
import { LoopNode } from '../NodeTypes/LoopNode'
import type { WorkflowNodeData } from '../types'
import type { NodeProps } from 'reactflow'

describe('LoopNode', () => {
  const renderWithProvider = (node: NodeProps<WorkflowNodeData>) => {
    return render(
      <ReactFlowProvider>
        <LoopNode {...node} />
      </ReactFlowProvider>
    )
  }

  it('should render loop node with count type', () => {
    const node = {
      data: {
        id: 'loop-1',
        type: 'loop',
        label: 'My Loop',
        config: {
          loopType: 'count',
          loopCount: 10,
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('My Loop')).toBeInTheDocument()
    expect(screen.getByText('计数循环')).toBeInTheDocument()
    expect(screen.getByText('重复 10 次')).toBeInTheDocument()
  })

  it('should render loop node with condition type', () => {
    const node = {
      data: {
        id: 'loop-2',
        type: 'loop',
        label: 'Condition Loop',
        config: {
          loopType: 'condition',
          loopCondition: '{{index}} < {{count}}',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Condition Loop')).toBeInTheDocument()
    expect(screen.getByText('条件循环')).toBeInTheDocument()
    expect(screen.getByText('{{index}} < {{count}}')).toBeInTheDocument()
  })

  it('should render loop node with collection type', () => {
    const node = {
      data: {
        id: 'loop-3',
        type: 'loop',
        label: 'Collection Loop',
        config: {
          loopType: 'collection',
          collectionPath: 'items',
          iterationVariable: 'item',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Collection Loop')).toBeInTheDocument()
    expect(screen.getByText('集合循环')).toBeInTheDocument()
    expect(screen.getByText('items')).toBeInTheDocument()
    expect(screen.getByText('变量: item')).toBeInTheDocument()
  })

  it('should show execution status indicator SUCCESS', () => {
    const node = {
      data: {
        id: 'loop-4',
        type: 'loop',
        label: 'Success Loop',
        config: {
          loopType: 'count',
          loopCount: 5,
        },
        executionStatus: 'SUCCESS',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should show execution status indicator FAILED', () => {
    const node = {
      data: {
        id: 'loop-4a',
        type: 'loop',
        label: 'Failed Loop',
        config: {
          loopType: 'count',
          loopCount: 5,
        },
        executionStatus: 'FAILED',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('✗')).toBeInTheDocument()
  })

  it('should show execution status indicator RUNNING', () => {
    const node = {
      data: {
        id: 'loop-4b',
        type: 'loop',
        label: 'Running Loop',
        config: {
          loopType: 'count',
          loopCount: 5,
        },
        executionStatus: 'running',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('⏳')).toBeInTheDocument()
  })

  it('should apply selected styling', () => {
    const node = {
      data: {
        id: 'loop-5',
        type: 'loop',
        label: 'Selected Loop',
        config: {
          loopType: 'count',
          loopCount: 3,
        },
      } as WorkflowNodeData,
      selected: true,
    }

    const { container } = renderWithProvider(node)
    const nodeElement = container.querySelector('.workflow-node')
    expect(nodeElement).toHaveClass('border-indigo-500')
  })

  it('should render loop node with iteration variable', () => {
    const node = {
      data: {
        id: 'loop-6',
        type: 'loop',
        label: 'Iterator Loop',
        config: {
          loopType: 'collection',
          collectionPath: 'users',
          iterationVariable: 'user',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('变量: user')).toBeInTheDocument()
  })

  it('should render loop node with default label when no label provided', () => {
    const node = {
      data: {
        id: 'loop-7',
        type: 'loop',
        label: '',
        config: {
          loopType: 'count',
          loopCount: 1,
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Loop')).toBeInTheDocument()
  })

  it('should handle count loop without loopCount', () => {
    const node = {
      data: {
        id: 'loop-8',
        type: 'loop',
        label: 'Count Loop No Count',
        config: {
          loopType: 'count',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Count Loop No Count')).toBeInTheDocument()
  })

  it('should handle collection loop without iteration variable', () => {
    const node = {
      data: {
        id: 'loop-9',
        type: 'loop',
        label: 'Collection No Variable',
        config: {
          loopType: 'collection',
          collectionPath: 'data',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Collection No Variable')).toBeInTheDocument()
    expect(screen.getByText('data')).toBeInTheDocument()
  })
})
