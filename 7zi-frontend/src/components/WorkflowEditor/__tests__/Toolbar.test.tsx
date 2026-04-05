/**
 * Toolbar 组件测试
 *
 * 🧪 测试员: Tester
 * 创建日期: 2026-04-03
 *
 * 测试覆盖：
 * - 组件渲染测试
 * - 按钮状态测试
 * - 回调函数测试
 * - 禁用状态测试
 * - 错误状态显示测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import type { WorkflowDefinition, WorkflowExport } from '../types'

// Mock WorkflowExporter
vi.mock('../WorkflowExporter', () => ({
  WorkflowExporter: ({ workflow, onExport, onImport }: { workflow: WorkflowDefinition; onExport?: (data: WorkflowExport) => void; onImport?: (data: WorkflowDefinition) => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'workflow-exporter' },
      React.createElement('button', {
        'data-testid': 'export-btn',
        onClick: () => onExport?.({ version: '1.9.1', exportedAt: new Date().toISOString(), workflow }),
      }),
      React.createElement('button', {
        'data-testid': 'import-btn',
        onClick: () => onImport?.({ nodes: [], edges: [] } as WorkflowDefinition),
      })
    ),
}))

// Mock workflow-editor-store
const mockUndo = vi.fn()
const mockRedo = vi.fn()

vi.mock('../stores/workflow-editor-store', () => ({
  useWorkflowEditorStore: vi.fn(() => ({
    nodes: [],
    edges: [],
    selectedNode: null,
    addNode: vi.fn(),
    removeNode: vi.fn(),
    updateNode: vi.fn(),
    addEdge: vi.fn(),
    removeEdge: vi.fn(),
    selectNode: vi.fn(),
    clearSelection: vi.fn(),
  })),
  useUndoRedo: vi.fn(() => ({
    undo: mockUndo,
    redo: mockRedo,
    canUndo: true,
    canRedo: false,
  })),
}))

// 导入组件（在 mock 之后）
import { Toolbar } from '../Toolbar'

describe('Toolbar', () => {
  const mockOnSave = vi.fn()
  const mockOnRun = vi.fn()
  const mockOnValidate = vi.fn()
  const mockOnExport = vi.fn()
  const mockOnImport = vi.fn()
  const mockWorkflow = {
    id: 'test-workflow',
    name: 'Test Workflow',
    nodes: [],
    edges: [],
  }

  const defaultProps = {
    onSave: mockOnSave,
    onRun: mockOnRun,
    onValidate: mockOnValidate,
    onExport: mockOnExport,
    onImport: mockOnImport,
    workflow: mockWorkflow,
    isExecuting: false,
    readOnly: false,
    hasErrors: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('组件渲染测试', () => {
    it('应该正确渲染工具栏', () => {
      render(React.createElement(Toolbar, defaultProps))

      expect(screen.getByText('工作流编辑器')).toBeInTheDocument()
    })

    it('应该渲染撤销按钮', () => {
      render(React.createElement(Toolbar, defaultProps))

      expect(screen.getByText('撤销')).toBeInTheDocument()
    })

    it('应该渲染重做按钮', () => {
      render(React.createElement(Toolbar, defaultProps))

      expect(screen.getByText('重做')).toBeInTheDocument()
    })

    it('应该渲染验证按钮', () => {
      render(React.createElement(Toolbar, defaultProps))

      expect(screen.getByText('验证')).toBeInTheDocument()
    })

    it('应该渲染保存按钮', () => {
      render(React.createElement(Toolbar, defaultProps))

      expect(screen.getByText('保存')).toBeInTheDocument()
    })

    it('应该渲染运行按钮', () => {
      render(React.createElement(Toolbar, defaultProps))

      expect(screen.getByText('运行')).toBeInTheDocument()
    })

    it('应该渲染导出/导入组件', () => {
      render(React.createElement(Toolbar, defaultProps))

      expect(screen.getByTestId('workflow-exporter')).toBeInTheDocument()
    })
  })

  describe('按钮状态测试', () => {
    it('运行按钮在 isExecuting=true 时应该禁用', () => {
      render(React.createElement(Toolbar, { ...defaultProps, isExecuting: true }))

      const runBtn = screen.getByText('运行中...').closest('button')
      expect(runBtn).toBeDisabled()
    })

    it('运行按钮在 hasErrors=true 时应该禁用', () => {
      render(React.createElement(Toolbar, { ...defaultProps, hasErrors: true }))

      const runBtn = screen.getByText('运行').closest('button')
      expect(runBtn).toBeDisabled()
    })

    it('所有按钮在 readOnly=true 时应该禁用', () => {
      render(React.createElement(Toolbar, { ...defaultProps, readOnly: true }))

      const saveBtn = screen.getByText('保存').closest('button')
      const validateBtn = screen.getByText('验证').closest('button')
      const runBtn = screen.getByText('运行').closest('button')

      expect(saveBtn).toBeDisabled()
      expect(validateBtn).toBeDisabled()
      expect(runBtn).toBeDisabled()
    })
  })

  describe('回调函数测试', () => {
    it('点击保存按钮应该调用 onSave', async () => {
      render(React.createElement(Toolbar, defaultProps))

      const saveBtn = screen.getByText('保存').closest('button')
      if (saveBtn) {
        await userEvent.click(saveBtn)
      }

      expect(mockOnSave).toHaveBeenCalled()
    })

    it('点击运行按钮应该调用 onRun', async () => {
      render(React.createElement(Toolbar, defaultProps))

      const runBtn = screen.getByText('运行').closest('button')
      if (runBtn) {
        await userEvent.click(runBtn)
      }

      expect(mockOnRun).toHaveBeenCalled()
    })

    it('点击验证按钮应该调用 onValidate', async () => {
      render(React.createElement(Toolbar, defaultProps))

      const validateBtn = screen.getByText('验证').closest('button')
      if (validateBtn) {
        await userEvent.click(validateBtn)
      }

      expect(mockOnValidate).toHaveBeenCalled()
    })

    it('点击撤销按钮应该调用 undo', async () => {
      render(React.createElement(Toolbar, defaultProps))

      const undoBtn = screen.getByText('撤销').closest('button')
      if (undoBtn) {
        await userEvent.click(undoBtn)
      }

      expect(mockUndo).toHaveBeenCalled()
    })

    it('点击重做按钮应该调用 redo', async () => {
      render(React.createElement(Toolbar, defaultProps))

      const redoBtn = screen.getByText('重做').closest('button')
      // 重做按钮默认禁用 (canRedo: false)
      expect(redoBtn).toBeDisabled()
    })

    it('点击导出按钮应该调用 onExport', async () => {
      render(React.createElement(Toolbar, defaultProps))

      const exportBtn = screen.getByTestId('export-btn')
      await userEvent.click(exportBtn)

      expect(mockOnExport).toHaveBeenCalledWith({
        format: 'json',
        data: mockWorkflow,
      })
    })

    it('点击导入按钮应该调用 onImport', async () => {
      render(React.createElement(Toolbar, defaultProps))

      const importBtn = screen.getByTestId('import-btn')
      await userEvent.click(importBtn)

      expect(mockOnImport).toHaveBeenCalledWith({
        nodes: [],
        edges: [],
      })
    })
  })

  describe('错误状态显示测试', () => {
    it('hasErrors=true 时应该显示错误提示', () => {
      render(React.createElement(Toolbar, { ...defaultProps, hasErrors: true }))

      expect(screen.getByText('⚠️')).toBeInTheDocument()
      expect(screen.getByText('有验证错误')).toBeInTheDocument()
    })

    it('hasErrors=false 时不应该显示错误提示', () => {
      render(React.createElement(Toolbar, { ...defaultProps, hasErrors: false }))

      expect(screen.queryByText('有验证错误')).not.toBeInTheDocument()
    })
  })

  describe('运行状态显示测试', () => {
    it('isExecuting=true 时应该显示运行中状态', () => {
      render(React.createElement(Toolbar, { ...defaultProps, isExecuting: true }))

      expect(screen.getByText('运行中...')).toBeInTheDocument()
      expect(screen.getByText('⏳')).toBeInTheDocument()
    })

    it('isExecuting=false 时应该显示运行按钮', () => {
      render(React.createElement(Toolbar, { ...defaultProps, isExecuting: false }))

      expect(screen.getByText('运行')).toBeInTheDocument()
      expect(screen.getByText('▶️')).toBeInTheDocument()
    })
  })

  describe('边界情况测试', () => {
    it('没有 workflow 时不应该渲染导出/导入', () => {
      render(React.createElement(Toolbar, { ...defaultProps, workflow: undefined }))

      expect(screen.queryByTestId('workflow-exporter')).not.toBeInTheDocument()
    })

    it('所有回调函数为 undefined 时不应该报错', () => {
      expect(() => {
        render(
          React.createElement(Toolbar, {
            onSave: vi.fn(),
            onRun: vi.fn(),
            onValidate: vi.fn(),
          })
        )
      }).not.toThrow()
    })
  })
})