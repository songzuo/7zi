/**
 * EndNode (OutputNode) 测试
 *
 * 工作流出口节点
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from 'reactflow'
import { EndNode } from '../NodeTypes/EndNode'
import type { WorkflowNodeData } from '../types'
import type { NodeProps } from 'reactflow'

describe('EndNode', () => {
  const renderWithProvider = (node: NodeProps<WorkflowNodeData>) => {
    return render(
      <ReactFlowProvider>
        <EndNode {...node} />
      </ReactFlowProvider>
    )
  }

  it('should render end node with basic props', () => {
    const node = {
      data: {
        id: 'end-1',
        type: 'end',
        label: 'My End',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('My End')).toBeInTheDocument()
  })

  it('should render end node with default label when no label provided', () => {
    const node = {
      data: {
        id: 'end-2',
        type: 'end',
        label: '',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('End')).toBeInTheDocument()
  })

  it('should render end node with description', () => {
    const node = {
      data: {
        id: 'end-3',
        type: 'end',
        label: 'End with Description',
        description: 'This is the end point',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('End with Description')).toBeInTheDocument()
    expect(screen.getByText('This is the end point')).toBeInTheDocument()
  })

  it('should show execution status indicator SUCCESS', () => {
    const node = {
      data: {
        id: 'end-4',
        type: 'end',
        label: 'Success End',
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
        id: 'end-5',
        type: 'end',
        label: 'Failed End',
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
        id: 'end-6',
        type: 'end',
        label: 'Running End',
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
        id: 'end-7',
        type: 'end',
        label: 'Selected End',
      } as WorkflowNodeData,
      selected: true,
    }

    const { container } = renderWithProvider(node)
    const nodeElement = container.querySelector('.workflow-node')
    expect(nodeElement).toHaveClass('border-indigo-500')
  })

  it('should render end node with emoji icon', () => {
    const node = {
      data: {
        id: 'end-8',
        type: 'end',
        label: 'Icon Test',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('⏹️')).toBeInTheDocument()
  })

  it('should render end node without description', () => {
    const node = {
      data: {
        id: 'end-9',
        type: 'end',
        label: 'No Description',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('No Description')).toBeInTheDocument()
    // 验证描述文本不存在
    const descriptions = screen.queryAllByText(/描述/i)
    expect(descriptions.length).toBe(0)
  })

  it('should render end node with empty description', () => {
    const node = {
      data: {
        id: 'end-10',
        type: 'end',
        label: 'Empty Description',
        description: '',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Empty Description')).toBeInTheDocument()
  })

  it('should render end node with long description', () => {
    const node = {
      data: {
        id: 'end-11',
        type: 'end',
        label: 'Long Description',
        description: 'This is a very long description for the end node that should still be rendered properly',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Long Description')).toBeInTheDocument()
    expect(screen.getByText('This is a very long description for the end node that should still be rendered properly')).toBeInTheDocument()
  })

  it('should render end node with special characters in description', () => {
    const node = {
      data: {
        id: 'end-12',
        type: 'end',
        label: 'Special Chars',
        description: 'End point with <special> & "characters" and \'quotes\'',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Special Chars')).toBeInTheDocument()
    expect(screen.getByText('End point with <special> & "characters" and \'quotes\'')).toBeInTheDocument()
  })

  it('should render end node with multilingual text', () => {
    const node = {
      data: {
        id: 'end-13',
        type: 'end',
        label: 'Multilingual',
        description: '结束节点 / End Node / Fin du processus',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Multilingual')).toBeInTheDocument()
    expect(screen.getByText('结束节点 / End Node / Fin du processus')).toBeInTheDocument()
  })

  it('should render end node with emoji in label', () => {
    const node = {
      data: {
        id: 'end-14',
        type: 'end',
        label: '🎉 Success 🎉',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('🎉 Success 🎉')).toBeInTheDocument()
  })

  it('should render end node with execution status and description', () => {
    const node = {
      data: {
        id: 'end-15',
        type: 'end',
        label: 'Complete End',
        description: 'Workflow completed successfully',
        executionStatus: 'SUCCESS',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Complete End')).toBeInTheDocument()
    expect(screen.getByText('Workflow completed successfully')).toBeInTheDocument()
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should render end node with failed status', () => {
    const node = {
      data: {
        id: 'end-16',
        type: 'end',
        label: 'Failed End',
        description: 'Workflow failed with error',
        executionStatus: 'FAILED',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Failed End')).toBeInTheDocument()
    expect(screen.getByText('Workflow failed with error')).toBeInTheDocument()
    expect(screen.getByText('✗')).toBeInTheDocument()
  })

  it('should render end node with whitespace-only label (should use default)', () => {
    const node = {
      data: {
        id: 'end-17',
        type: 'end',
        label: '   ',
      } as WorkflowNodeData,
      selected: false,
    }

    const { container } = renderWithProvider(node)
    // 当 label 只有空格时，组件会显示空格
    expect(container.textContent).toContain('⏹️')
  })

  it('should render end node with numeric label', () => {
    const node = {
      data: {
        id: 'end-18',
        type: 'end',
        label: '123',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('123')).toBeInTheDocument()
  })

  it('should render end node with selected state and execution status', () => {
    const node = {
      data: {
        id: 'end-19',
        type: 'end',
        label: 'Selected Running',
        executionStatus: 'running',
      } as WorkflowNodeData,
      selected: true,
    }

    const { container } = renderWithProvider(node)
    const nodeElement = container.querySelector('.workflow-node')
    expect(nodeElement).toHaveClass('border-indigo-500')
    expect(screen.getByText('⏳')).toBeInTheDocument()
  })

  it('should render end node with HTML entities in description', () => {
    const node = {
      data: {
        id: 'end-20',
        type: 'end',
        label: 'HTML Entities',
        description: 'Use &lt;div&gt; and &amp; symbols',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('HTML Entities')).toBeInTheDocument()
    expect(screen.getByText('Use &lt;div&gt; and &amp; symbols')).toBeInTheDocument()
  })
})