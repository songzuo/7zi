/**
 * ConditionNode 测试
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from 'reactflow'
import { ConditionNode } from '../NodeTypes/ConditionNode'
import type { WorkflowNodeData } from '../types'
import type { NodeProps } from 'reactflow'

describe('ConditionNode', () => {
  const renderWithProvider = (node: any) => {
    return render(
      <ReactFlowProvider>
        <ConditionNode {...node} />
      </ReactFlowProvider>
    )
  }

  it('should render condition node with basic props', () => {
    const node = {
      data: {
        id: 'condition-1',
        type: 'condition',
        label: 'My Condition',
        config: {
          condition: 'x > 10',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('My Condition')).toBeInTheDocument()
    expect(screen.getByText('x > 10')).toBeInTheDocument()
  })

  it('should render condition node with default label when no label provided', () => {
    const node = {
      data: {
        id: 'condition-2',
        type: 'condition',
        label: '',
        config: {
          condition: 'true',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Condition')).toBeInTheDocument()
  })

  it('should render condition node without condition config', () => {
    const node = {
      data: {
        id: 'condition-3',
        type: 'condition',
        label: 'No Condition',
        config: {},
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('No Condition')).toBeInTheDocument()
    expect(screen.queryByText(/true/)).not.toBeInTheDocument()
  })

  it('should render branch labels (True/False)', () => {
    const node = {
      data: {
        id: 'condition-4',
        type: 'condition',
        label: 'Branch Test',
        config: {
          condition: 'status === "active"',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('True →')).toBeInTheDocument()
    expect(screen.getByText('↓ False')).toBeInTheDocument()
  })

  it('should show execution status indicator SUCCESS', () => {
    const node = {
      data: {
        id: 'condition-5',
        type: 'condition',
        label: 'Success Condition',
        config: {
          condition: 'result === true',
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
        id: 'condition-6',
        type: 'condition',
        label: 'Failed Condition',
        config: {
          condition: 'result === true',
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
        id: 'condition-7',
        type: 'condition',
        label: 'Running Condition',
        config: {
          condition: 'result === true',
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
        id: 'condition-8',
        type: 'condition',
        label: 'Selected Condition',
        config: {
          condition: 'selected === true',
        },
      } as WorkflowNodeData,
      selected: true,
    }

    const { container } = renderWithProvider(node)
    const nodeElement = container.querySelector('.workflow-node')
    expect(nodeElement).toHaveClass('border-indigo-500')
  })

  it('should render condition node with complex expression', () => {
    const node = {
      data: {
        id: 'condition-9',
        type: 'condition',
        label: 'Complex Condition',
        config: {
          condition: 'user.age > 18 && user.status === "active"',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('user.age > 18 && user.status === "active"')).toBeInTheDocument()
  })

  it('should render condition node with emoji icon', () => {
    const node = {
      data: {
        id: 'condition-10',
        type: 'condition',
        label: 'Icon Test',
        config: {
          condition: 'true',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('🔀')).toBeInTheDocument()
  })

  it('should render condition node with very long condition', () => {
    const node = {
      data: {
        id: 'condition-11',
        type: 'condition',
        label: 'Long Condition',
        config: {
          condition: 'a === 1 && b === 2 && c === 3 && d === 4 && e === 5 && f === 6 && g === 7 && h === 8',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('a === 1 && b === 2 && c === 3 && d === 4 && e === 5 && f === 6 && g === 7 && h === 8')).toBeInTheDocument()
  })

  it('should render condition node with special characters in condition', () => {
    const node = {
      data: {
        id: 'condition-12',
        type: 'condition',
        label: 'Special Characters',
        config: {
          condition: 'value !== null && value !== undefined',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('value !== null && value !== undefined')).toBeInTheDocument()
  })

  it('should render condition node with numeric comparison', () => {
    const node = {
      data: {
        id: 'condition-13',
        type: 'condition',
        label: 'Numeric Test',
        config: {
          condition: 'count >= 100',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('count >= 100')).toBeInTheDocument()
  })

  it('should render condition node with boolean literal', () => {
    const node = {
      data: {
        id: 'condition-14',
        type: 'condition',
        label: 'Boolean Literal',
        config: {
          condition: 'true',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('true')).toBeInTheDocument()
  })

  it('should render condition node with string comparison', () => {
    const node = {
      data: {
        id: 'condition-15',
        type: 'condition',
        label: 'String Test',
        config: {
          condition: 'status === "pending"',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('status === "pending"')).toBeInTheDocument()
  })

  it('should render condition node with template expression', () => {
    const node = {
      data: {
        id: 'condition-16',
        type: 'condition',
        label: 'Template Expression',
        config: {
          condition: '{{value}} > 0',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('{{value}} > 0')).toBeInTheDocument()
  })

  it('should render condition node with nested object property', () => {
    const node = {
      data: {
        id: 'condition-17',
        type: 'condition',
        label: 'Nested Property',
        config: {
          condition: 'data.user.profile.age > 18',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('data.user.profile.age > 18')).toBeInTheDocument()
  })

  it('should render condition node with ternary operator', () => {
    const node = {
      data: {
        id: 'condition-18',
        type: 'condition',
        label: 'Ternary Test',
        config: {
          condition: 'isValid ? true : false',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('isValid ? true : false')).toBeInTheDocument()
  })

  it('should render condition node with array check', () => {
    const node = {
      data: {
        id: 'condition-19',
        type: 'condition',
        label: 'Array Check',
        config: {
          condition: 'items.length > 0',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('items.length > 0')).toBeInTheDocument()
  })

  it('should render condition node with method call', () => {
    const node = {
      data: {
        id: 'condition-20',
        type: 'condition',
        label: 'Method Call',
        config: {
          condition: 'text.includes("keyword")',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('text.includes("keyword")')).toBeInTheDocument()
  })
})