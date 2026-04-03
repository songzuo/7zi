/**
 * TransformNode 测试
 *
 * v1.9.1 新增
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from 'reactflow'
import { TransformNode } from '../NodeTypes/TransformNode'
import type { WorkflowNodeData } from '../types'

describe('TransformNode', () => {
  const renderWithProvider = (node: any) => {
    return render(
      <ReactFlowProvider>
        <TransformNode {...node} />
      </ReactFlowProvider>
    )
  }

  it('should render transform node', () => {
    const node = {
      data: {
        id: 'transform-1',
        type: 'transform',
        label: 'My Transform',
        config: {
          transformExpression: 'return data.map(x => x * 2)',
          outputFormat: 'json',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('My Transform')).toBeInTheDocument()
    expect(screen.getByText('数据转换')).toBeInTheDocument()
    expect(screen.getByText('return data.map(x => x * 2)')).toBeInTheDocument()
    expect(screen.getByText('JSON')).toBeInTheDocument()
  })

  it('should render with different output formats', () => {
    const formatLabels: Record<string, string> = {
      json: 'JSON',
      xml: 'XML',
      csv: 'CSV',
      text: 'Text',
    }

    const formats = ['json', 'xml', 'csv', 'text'] as const

    formats.forEach(format => {
      const node = {
        data: {
          id: `transform-${format}`,
          type: 'transform',
          label: 'Format Test',
          config: {
            transformExpression: 'return data',
            outputFormat: format,
          },
        } as WorkflowNodeData,
        selected: false,
      }

      renderWithProvider(node)
      expect(screen.getByText(formatLabels[format])).toBeInTheDocument()
    })
  })

  it('should show execution status indicator for SUCCESS', () => {
    const node = {
      data: {
        id: 'transform-2',
        type: 'transform',
        label: 'Running Transform',
        config: {
          transformExpression: 'return data',
          outputFormat: 'json',
        },
        executionStatus: 'SUCCESS',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should show execution status indicator for FAILED', () => {
    const node = {
      data: {
        id: 'transform-2a',
        type: 'transform',
        label: 'Failed Transform',
        config: {
          transformExpression: 'return data',
          outputFormat: 'json',
        },
        executionStatus: 'FAILED',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('✗')).toBeInTheDocument()
  })

  it('should show execution status indicator for RUNNING', () => {
    const node = {
      data: {
        id: 'transform-2b',
        type: 'transform',
        label: 'Running Transform',
        config: {
          transformExpression: 'return data',
          outputFormat: 'json',
        },
        executionStatus: 'running',
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('⏳')).toBeInTheDocument()
  })

  it('should render without expression', () => {
    const node = {
      data: {
        id: 'transform-3',
        type: 'transform',
        label: 'Empty Transform',
        config: {
          outputFormat: 'json',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('Empty Transform')).toBeInTheDocument()
  })

  it('should apply selected styling when selected', () => {
    const node = {
      data: {
        id: 'transform-4',
        type: 'transform',
        label: 'Selected Transform',
        config: {
          transformExpression: 'return data',
          outputFormat: 'json',
        },
      } as WorkflowNodeData,
      selected: true,
    }

    const { container } = renderWithProvider(node)
    const nodeElement = container.querySelector('.workflow-node')
    expect(nodeElement).toHaveClass('border-indigo-500')
  })

  it('should render with xml output format', () => {
    const node = {
      data: {
        id: 'transform-xml',
        type: 'transform',
        label: 'XML Transform',
        config: {
          transformExpression: 'return <data/>',
          outputFormat: 'xml',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('XML Transform')).toBeInTheDocument()
    expect(screen.getByText('XML')).toBeInTheDocument()
    expect(screen.getByText('return <data/>')).toBeInTheDocument()
  })

  it('should render with csv output format', () => {
    const node = {
      data: {
        id: 'transform-csv',
        type: 'transform',
        label: 'CSV Transform',
        config: {
          transformExpression: 'return csv(data)',
          outputFormat: 'csv',
        },
      } as WorkflowNodeData,
      selected: false,
    }

    renderWithProvider(node)
    expect(screen.getByText('CSV Transform')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
  })
})
