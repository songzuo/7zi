/**
 * AgentNode 测试
 *
 * v1.10.1 UX增强版
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from 'reactflow'
import { AgentNode } from '../NodeTypes/AgentNode'
import type { WorkflowNodeData } from '../types'
import type { NodeProps } from 'reactflow'

describe('AgentNode', () => {
  const renderWithProvider = (node: any) => {
    return render(
      <ReactFlowProvider>
        <AgentNode {...node} />
      </ReactFlowProvider>
    )
  }

  it('should render agent node with basic props', () => {
    const node = {
      data: {
        id: 'agent-1',
        type: 'agent',
        label: 'My Agent',
        config: {
          agentType: 'default',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('My Agent')).toBeInTheDocument()
    expect(screen.getByText('default')).toBeInTheDocument()
  })

  it('should render agent node with default label when no label provided', () => {
    const node = {
      data: {
        id: 'agent-2',
        type: 'agent',
        label: '',
        config: {
          agentType: 'gpt-4',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Agent')).toBeInTheDocument()
  })

  it('should render agent node with description', () => {
    const node = {
      data: {
        id: 'agent-3',
        type: 'agent',
        label: 'Agent with Description',
        description: 'This is a test agent',
        config: {
          agentType: 'claude',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Agent with Description')).toBeInTheDocument()
    expect(screen.getByText('This is a test agent')).toBeInTheDocument()
  })

  it('should render agent node with timeout configuration', () => {
    const node = {
      data: {
        id: 'agent-4',
        type: 'agent',
        label: 'Agent with Timeout',
        config: {
          agentType: 'gpt-3.5',
          timeout: 30000,
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('30s')).toBeInTheDocument()
  })

  it('should render agent node with retry configuration', () => {
    const node = {
      data: {
        id: 'agent-5',
        type: 'agent',
        label: 'Agent with Retry',
        config: {
          agentType: 'gpt-4',
          maxRetries: 3,
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('最多 3 次重试')).toBeInTheDocument()
  })

  it('should render agent node with both timeout and retry', () => {
    const node = {
      data: {
        id: 'agent-6',
        type: 'agent',
        label: 'Agent Full Config',
        config: {
          agentType: 'gpt-4',
          timeout: 60000,
          maxRetries: 5,
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('60s')).toBeInTheDocument()
    expect(screen.getByText('最多 5 次重试')).toBeInTheDocument()
  })

  it('should show execution status indicator SUCCESS', () => {
    const node = {
      data: {
        id: 'agent-7',
        type: 'agent',
        label: 'Success Agent',
        config: {
          agentType: 'gpt-4',
        },
        executionStatus: 'success',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should show execution status indicator FAILED', () => {
    const node = {
      data: {
        id: 'agent-8',
        type: 'agent',
        label: 'Failed Agent',
        config: {
          agentType: 'gpt-4',
        },
        executionStatus: 'failed',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('✗')).toBeInTheDocument()
  })

  it('should show execution status indicator RUNNING', () => {
    const node = {
      data: {
        id: 'agent-9',
        type: 'agent',
        label: 'Running Agent',
        config: {
          agentType: 'gpt-4',
        },
        executionStatus: 'running',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('▶')).toBeInTheDocument()
  })

  it('should show execution status indicator PENDING', () => {
    const node = {
      data: {
        id: 'agent-10',
        type: 'agent',
        label: 'Pending Agent',
        config: {
          agentType: 'gpt-4',
        },
        executionStatus: 'pending',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('○')).toBeInTheDocument()
  })

  it('should apply selected styling', () => {
    const node = {
      data: {
        id: 'agent-11',
        type: 'agent',
        label: 'Selected Agent',
        config: {
          agentType: 'gpt-4',
        },
      } as WorkflowNodeData,
      selected: true,
    }

    const { container } = renderWithProvider(node)
    const nodeElement = container.querySelector('.workflow-node-wrapper')
    expect(nodeElement).toHaveClass('border-indigo-500')
  })

  it('should render agent node without agentType', () => {
    const node = {
      data: {
        id: 'agent-12',
        type: 'agent',
        label: 'Agent No Type',
        config: {},
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Agent No Type')).toBeInTheDocument()
    expect(screen.queryByText('default')).not.toBeInTheDocument()
  })

  it('should render agent node with timeout less than 1 second', () => {
    const node = {
      data: {
        id: 'agent-13',
        type: 'agent',
        label: 'Agent Short Timeout',
        config: {
          agentType: 'gpt-4',
          timeout: 500,
        },
      } as WorkflowNodeData,
      selected: false,
    }

    const { container } = renderWithProvider(node)
    // Check that timeout is displayed (it will show '0s' or '1s' depending on rounding)
    expect(container.textContent).toMatch(/⏱️/)
  })

  it('should render agent node with zero retries', () => {
    const node = {
      data: {
        id: 'agent-14',
        type: 'agent',
        label: 'Agent No Retry',
        config: {
          agentType: 'gpt-4',
          maxRetries: 0,
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.queryByText(/重试/)).not.toBeInTheDocument()
  })

  it('should render agent node with emoji icon', () => {
    const node = {
      data: {
        id: 'agent-15',
        type: 'agent',
        label: 'Agent Icon',
        config: {
          agentType: 'gpt-4',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('🤖')).toBeInTheDocument()
  })

  it('should render agent node with all configurations', () => {
    const node = {
      data: {
        id: 'agent-16',
        type: 'agent',
        label: 'Complete Agent',
        description: 'A fully configured agent',
        config: {
          agentType: 'gpt-4-turbo',
          timeout: 120000,
          maxRetries: 10,
        },
        executionStatus: 'success',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Complete Agent')).toBeInTheDocument()
    expect(screen.getByText('A fully configured agent')).toBeInTheDocument()
    expect(screen.getByText('gpt-4-turbo')).toBeInTheDocument()
    expect(screen.getByText('120s')).toBeInTheDocument()
    expect(screen.getByText('最多 10 次重试')).toBeInTheDocument()
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should handle agent node with empty config', () => {
    const node = {
      data: {
        id: 'agent-17',
        type: 'agent',
        label: 'Empty Config Agent',
        config: {},
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Empty Config Agent')).toBeInTheDocument()
  })

  it('should render agent node with large timeout value', () => {
    const node = {
      data: {
        id: 'agent-18',
        type: 'agent',
        label: 'Large Timeout Agent',
        config: {
          agentType: 'gpt-4',
          timeout: 3600000, // 1 hour
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('3600s')).toBeInTheDocument()
  })
})