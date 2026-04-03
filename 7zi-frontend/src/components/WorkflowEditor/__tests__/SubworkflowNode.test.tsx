/**
 * SubworkflowNode 测试
 *
 * v1.9.1 新增
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from 'reactflow'
import { SubworkflowNode } from '../NodeTypes/SubworkflowNode'
import type { WorkflowNodeData } from '../types'

describe('SubworkflowNode', () => {
  const renderWithProvider = (node: any) => {
    return render(
      <ReactFlowProvider>
        <SubworkflowNode {...node} />
      </ReactFlowProvider>
    )
  }

  it('should render subworkflow node', () => {
    const node = {
      data: {
        id: 'sub-1',
        type: 'subworkflow',
        label: 'My Subworkflow',
        config: {
          subworkflowId: 'workflow-123',
          subworkflowInputs: {
            param1: 'value1',
            param2: 123,
          },
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('My Subworkflow')).toBeInTheDocument()
    expect(screen.getByText('ID: workflow-123')).toBeInTheDocument()
    expect(screen.getByText('输入参数:')).toBeInTheDocument()
  })

  it('should show warning when subworkflow is not configured', () => {
    const node = {
      data: {
        id: 'sub-2',
        type: 'subworkflow',
        label: 'Unconfigured Subworkflow',
        config: {},
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Unconfigured Subworkflow')).toBeInTheDocument()
    expect(screen.getByText('⚠️ 未配置子工作流')).toBeInTheDocument()
  })

  it('should not show inputs section when empty', () => {
    const node = {
      data: {
        id: 'sub-3',
        type: 'subworkflow',
        label: 'No Inputs',
        config: {
          subworkflowId: 'workflow-456',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.queryByText('输入参数:')).not.toBeInTheDocument()
  })

  it('should show execution status indicator SUCCESS', () => {
    const node = {
      data: {
        id: 'sub-4',
        type: 'subworkflow',
        label: 'Success Subworkflow',
        config: {
          subworkflowId: 'workflow-789',
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
        id: 'sub-4a',
        type: 'subworkflow',
        label: 'Failed Subworkflow',
        config: {
          subworkflowId: 'workflow-789',
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
        id: 'sub-4b',
        type: 'subworkflow',
        label: 'Running Subworkflow',
        config: {
          subworkflowId: 'workflow-789',
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
        id: 'sub-5',
        type: 'subworkflow',
        label: 'Selected Subworkflow',
        config: {
          subworkflowId: 'workflow-select',
        },
      } as WorkflowNodeData,
      selected: true,
    }

    const { container } = renderWithProvider(node)
    const nodeElement = container.querySelector('.workflow-node')
    expect(nodeElement).toHaveClass('border-indigo-500')
  })

  it('should render with default label when no label provided', () => {
    const node = {
      data: {
        id: 'sub-6',
        type: 'subworkflow',
        label: '',
        config: {
          subworkflowId: 'workflow-empty',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Subworkflow')).toBeInTheDocument()
  })

  it('should render input parameters correctly', () => {
    const node = {
      data: {
        id: 'sub-7',
        type: 'subworkflow',
        label: 'With Params',
        config: {
          subworkflowId: 'workflow-params',
          subworkflowInputs: {
            name: 'test',
            count: 5,
            enabled: true,
          },
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('name:')).toBeInTheDocument()
    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('count:')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should render nested object input parameters', () => {
    const node = {
      data: {
        id: 'sub-8',
        type: 'subworkflow',
        label: 'Nested Params',
        config: {
          subworkflowId: 'workflow-nested',
          subworkflowInputs: {
            config: { nested: true },
          },
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText(/config:/)).toBeInTheDocument()
    expect(screen.getByText('{"nested":true}')).toBeInTheDocument()
  })

  it('should not render inputs when subworkflowInputs is empty object', () => {
    const node = {
      data: {
        id: 'sub-9',
        type: 'subworkflow',
        label: 'Empty Inputs',
        config: {
          subworkflowId: 'workflow-empty-obj',
          subworkflowInputs: {},
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.queryByText('输入参数:')).not.toBeInTheDocument()
  })

  it('should render subworkflow with empty subworkflowId but with inputs', () => {
    const node = {
      data: {
        id: 'sub-10',
        type: 'subworkflow',
        label: 'No ID With Inputs',
        config: {
          subworkflowInputs: {
            input1: 'value',
          },
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('⚠️ 未配置子工作流')).toBeInTheDocument()
    expect(screen.getByText('输入参数:')).toBeInTheDocument()
  })
})
