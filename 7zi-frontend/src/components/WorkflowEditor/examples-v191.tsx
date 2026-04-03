/**
 * WorkflowEditor 使用示例
 *
 * v1.9.1 示例代码
 */

import React, { useState, useEffect } from 'react'
import {
  WorkflowEditor,
  ExpressionEditor,
  useCustomNodes,
  useWorkflowExport,
  useUndoRedo,
  type WorkflowDefinition,
  type CustomNodeRegistration,
} from '@/components/WorkflowEditor'

// ============================================
// 示例 1: 基本使用
// ============================================

export function BasicExample() {
  const handleSave = (workflow: WorkflowDefinition) => {
    console.log('保存工作流:', workflow)
    // 调用 API 保存工作流
  }

  return (
    <div className="h-screen w-screen">
      <WorkflowEditor onSave={handleSave} readOnly={false} />
    </div>
  )
}

// ============================================
// 示例 2: 带初始数据的工作流
// ============================================

export function InitialDataExample() {
  const initialNodes = [
    {
      id: 'start-1',
      type: 'start',
      position: { x: 100, y: 100 },
      data: {
        id: 'start-1',
        type: 'start',
        label: '开始',
        config: {},
      },
    },
    {
      id: 'agent-1',
      type: 'agent',
      position: { x: 350, y: 100 },
      data: {
        id: 'agent-1',
        type: 'agent',
        label: '处理数据',
        config: {
          agentType: 'data-processor',
          timeout: 30000,
        },
      },
    },
    {
      id: 'end-1',
      type: 'end',
      position: { x: 600, y: 100 },
      data: {
        id: 'end-1',
        type: 'end',
        label: '结束',
        config: {},
      },
    },
  ]

  const initialEdges = [
    {
      id: 'e-start-agent',
      source: 'start-1',
      target: 'agent-1',
    },
    {
      id: 'e-agent-end',
      source: 'agent-1',
      target: 'end-1',
    },
  ]

  return (
    <WorkflowEditor
      workflowId="example-workflow-1"
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      onSave={workflow => console.log('保存:', workflow)}
    />
  )
}

// ============================================
// 示例 3: v1.9.1 - 导出/导入功能
// ============================================

export function ExportImportExample() {
  const handleExport = (exportData: any) => {
    console.log('导出数据:', exportData)
    // exportData = {
    //   version: '1.9.1',
    //   exportedAt: '2026-04-03T...',
    //   workflow: { ... },
    //   metadata: { ... }
    // }
  }

  const handleImport = (workflow: WorkflowDefinition) => {
    console.log('导入工作流:', workflow)
    // 验证并应用导入的工作流
  }

  return (
    <WorkflowEditor
      onExport={handleExport}
      onImport={handleImport}
    />
  )
}

// ============================================
// 示例 4: v1.9.1 - 使用 Hook 进行导出/导入
// ============================================

export function UseExportHookExample() {
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null)

  const {
    exportToFile,
    importWorkflow,
    isExporting,
    isImporting,
    error,
  } = useWorkflowExport({
    onExportSuccess: data => console.log('导出成功:', data),
    onImportSuccess: wf => setWorkflow(wf),
    onError: err => console.error('错误:', err),
  })

  const handleExport = async () => {
    if (workflow) {
      await exportToFile(workflow)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await importWorkflow(file)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleExport}
        disabled={isExporting || !workflow}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {isExporting ? '导出中...' : '导出工作流'}
      </button>

      <input
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        disabled={isImporting}
      />

      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}

// ============================================
// 示例 5: v1.9.1 - 自定义节点注册
// ============================================

// 自定义节点组件
function MyCustomNode({ data, selected }: any) {
  return (
    <div
      className={`rounded-lg border-2 p-4 ${
        selected ? 'border-indigo-500' : 'border-gray-300'
      }`}
      style={{ backgroundColor: '#FEF3C7' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">🎯</span>
        <div>
          <div className="font-semibold">{data.label}</div>
          <div className="text-xs text-gray-500">自定义节点</div>
        </div>
      </div>
    </div>
  )
}

export function CustomNodeExample() {
  const { registerNode, customNodeTypes } = useCustomNodes()

  useEffect(() => {
    // 注册自定义节点
    registerNode({
      type: 'myCustom',
      label: '我的自定义节点',
      icon: '🎯',
      description: '这是一个自定义节点示例',
      category: 'custom',
      defaultConfig: {
        customField: 'default value',
      },
      render: MyCustomNode,
    })
  }, [registerNode])

  return (
    <div>
      <div className="mb-4">
        已注册的自定义节点: {customNodeTypes.join(', ')}
      </div>
      <WorkflowEditor />
    </div>
  )
}

// ============================================
// 示例 6: v1.9.1 - 表达式编辑器
// ============================================

export function ExpressionEditorExample() {
  const [expression, setExpression] = useState('return data.map(item => item.value * 2)')

  const availableVariables = [
    'data',
    'index',
    'count',
    'result',
    'input',
    'output',
  ]

  return (
    <div className="max-w-2xl space-y-4 p-4">
      <h3 className="text-lg font-semibold">表达式编辑器示例</h3>

      <ExpressionEditor
        value={expression}
        onChange={setExpression}
        language="javascript"
        placeholder="输入 JavaScript 表达式..."
        variables={availableVariables}
        minRows={3}
        maxRows={10}
      />

      <div className="text-sm text-gray-600">
        <p>当前表达式:</p>
        <pre className="mt-1 rounded bg-gray-100 p-2">{expression}</pre>
      </div>
    </div>
  )
}

// ============================================
// 示例 7: v1.9.1 - 使用撤销/重做 Hook
// ============================================

export function UndoRedoHookExample() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={undo}
        disabled={!canUndo}
        className="rounded border px-3 py-1 disabled:opacity-50"
      >
        ↩️ 撤销
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="rounded border px-3 py-1 disabled:opacity-50"
      >
        ↪️ 重做
      </button>
    </div>
  )
}

// ============================================
// 示例 8: v1.9.1 - 完整工作流示例（包含所有新节点）
// ============================================

export function CompleteWorkflowExample() {
  const initialNodes = [
    // 开始节点
    {
      id: 'start',
      type: 'start',
      position: { x: 100, y: 200 },
      data: {
        id: 'start',
        type: 'start',
        label: '开始',
        config: {},
      },
    },

    // 循环节点
    {
      id: 'loop-1',
      type: 'loop',
      position: { x: 350, y: 200 },
      data: {
        id: 'loop-1',
        type: 'loop',
        label: '遍历数据',
        config: {
          loopType: 'collection',
          collectionPath: 'data.items',
          iterationVariable: 'item',
        },
      },
    },

    // 条件节点
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 600, y: 200 },
      data: {
        id: 'condition-1',
        type: 'condition',
        label: '检查条件',
        config: {
          condition: '{{item.value}} > 10',
          trueBranchLabel: '处理',
          falseBranchLabel: '跳过',
        },
      },
    },

    // 数据转换节点
    {
      id: 'transform-1',
      type: 'transform',
      position: { x: 850, y: 100 },
      data: {
        id: 'transform-1',
        type: 'transform',
        label: '转换数据',
        config: {
          transformExpression: 'return { ...item, processed: true }',
          outputFormat: 'json',
        },
      },
    },

    // 子工作流节点
    {
      id: 'subworkflow-1',
      type: 'subworkflow',
      position: { x: 1100, y: 200 },
      data: {
        id: 'subworkflow-1',
        type: 'subworkflow',
        label: '调用子流程',
        config: {
          subworkflowId: 'sub-process-123',
          subworkflowInputs: {
            data: '{{transformResult}}',
          },
        },
      },
    },

    // 结束节点
    {
      id: 'end',
      type: 'end',
      position: { x: 1350, y: 200 },
      data: {
        id: 'end',
        type: 'end',
        label: '结束',
        config: {},
      },
    },
  ]

  const initialEdges = [
    { id: 'e1', source: 'start', target: 'loop-1' },
    { id: 'e2', source: 'loop-1', target: 'condition-1' },
    { id: 'e3', source: 'condition-1', target: 'transform-1', sourceHandle: 'true' },
    { id: 'e4', source: 'transform-1', target: 'subworkflow-1' },
    { id: 'e5', source: 'subworkflow-1', target: 'end' },
  ]

  return (
    <WorkflowEditor
      workflowId="complete-workflow-example"
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      onSave={workflow => console.log('保存:', workflow)}
    />
  )
}

export default BasicExample