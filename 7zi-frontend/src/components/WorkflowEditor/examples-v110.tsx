/**
 * WorkflowEditor v1.10.0 使用示例
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.0
 *
 * 展示 v1.10.0 的所有新功能
 */

import React, { useState } from 'react'
import { WorkflowEditorV110 } from '@/components/WorkflowEditor'
import type { WorkflowDefinition, WorkflowNodeData, WorkflowEdgeData } from '@/components/WorkflowEditor'
import type { NodeProps } from 'reactflow'

// ============================================
// 示例 1: 基本使用
// ============================================

export function BasicExample() {
  const handleSave = (workflow: WorkflowDefinition) => {
    console.log('Saved workflow:', workflow)
    // 调用 API 保存
    fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
    })
  }

  return (
    <WorkflowEditorV110
      workflowId="example-workflow"
      onSave={handleSave}
      maxHistorySize={100}
    />
  )
}

// ============================================
// 示例 2: 使用自动布局
// ============================================

export function AutoLayoutExample() {
  const [layoutType, setLayoutType] = useState<'horizontal' | 'vertical' | 'tree' | 'force'>('horizontal')

  const handleAutoLayout = (type: typeof layoutType) => {
    setLayoutType(type)
    console.log('Applied layout:', type)
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">自动布局示例</h2>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => handleAutoLayout('horizontal')}
            className={`rounded px-3 py-1 ${
              layoutType === 'horizontal' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            水平布局
          </button>
          <button
            onClick={() => handleAutoLayout('vertical')}
            className={`rounded px-3 py-1 ${
              layoutType === 'vertical' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            垂直布局
          </button>
          <button
            onClick={() => handleAutoLayout('tree')}
            className={`rounded px-3 py-1 ${
              layoutType === 'tree' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            树形布局
          </button>
          <button
            onClick={() => handleAutoLayout('force')}
            className={`rounded px-3 py-1 ${
              layoutType === 'force' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            力导向布局
          </button>
        </div>
      </div>
      <div className="flex-1">
        <WorkflowEditorV110
          onAutoLayout={handleAutoLayout}
          maxHistorySize={100}
        />
      </div>
    </div>
  )
}

// ============================================
// 示例 3: 导入/导出
// ============================================

export function ImportExportExample() {
  const handleExport = (exportData: WorkflowDefinition) => {
    console.log('Exported:', exportData)

    // 下载文件
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workflow-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (workflow: WorkflowDefinition) => {
    console.log('Imported workflow:', workflow)
    // 验证并加载工作流
  }

  return (
    <WorkflowEditorV110
      onExport={handleExport}
      onImport={handleImport}
      maxHistorySize={100}
    />
  )
}

// ============================================
// 示例 4: 性能优化模式
// ============================================

export function PerformanceExample() {
  const [performanceMode, setPerformanceMode] = useState(false)

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">性能优化示例</h2>
        <label className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={performanceMode}
            onChange={(e) => setPerformanceMode(e.target.checked)}
          />
          <span>启用性能模式（适合 100+ 节点）</span>
        </label>
      </div>
      <div className="flex-1">
        <WorkflowEditorV110
          performanceMode={performanceMode}
          maxHistorySize={performanceMode ? 50 : 100}
        />
      </div>
    </div>
  )
}

// ============================================
// 示例 5: 只读模式
// ============================================

export function ReadOnlyExample() {
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null)

  // 从 API 加载工作流
  React.useEffect(() => {
    fetch('/api/workflows/some-id')
      .then((res) => res.json())
      .then((data) => setWorkflow(data))
  }, [])

  if (!workflow) {
    return <div>Loading...</div>
  }

  return (
    <WorkflowEditorV110
      workflowId={workflow.id}
      initialNodes={workflow.nodes.map((node: WorkflowNodeData) => ({
        id: node.id,
        type: node.type,
        position: { x: 0, y: 0 },
        data: node,
      }))}
      initialEdges={workflow.edges.map((edge: WorkflowEdgeData) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      }))}
      readOnly={true}
    />
  )
}

// ============================================
// 示例 6: 使用剪贴板 API
// ============================================

import { useClipboard } from '@/components/WorkflowEditor'

export function ClipboardExample() {
  const { copyNodes, pasteNodes, cutNodes, hasClipboardData } = useClipboard()
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])

  const handleCopy = () => {
    copyNodes([], [], selectedNodeIds)
    console.log('Copied nodes:', selectedNodeIds)
  }

  const handlePaste = () => {
    const result = pasteNodes({ x: 50, y: 50 })
    if (result) {
      console.log('Pasted nodes:', result.nodes)
      console.log('Pasted edges:', result.edges)
    }
  }

  const handleCut = () => {
    const result = cutNodes([], [], selectedNodeIds)
    if (result) {
      console.log('Cut nodes:', result.nodesToDelete)
      console.log('Cut edges:', result.edgesToDelete)
    }
  }

  return (
    <div className="flex gap-2 p-4">
      <button
        onClick={handleCopy}
        disabled={selectedNodeIds.length === 0}
        className="rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
      >
        复制 (Ctrl+C)
      </button>
      <button
        onClick={handlePaste}
        disabled={!hasClipboardData()}
        className="rounded bg-green-500 px-4 py-2 text-white disabled:opacity-50"
      >
        粘贴 (Ctrl+V)
      </button>
      <button
        onClick={handleCut}
        disabled={selectedNodeIds.length === 0}
        className="rounded bg-orange-500 px-4 py-2 text-white disabled:opacity-50"
      >
        剪切 (Ctrl+X)
      </button>
    </div>
  )
}

// ============================================
// 示例 7: 自定义节点注册
// ============================================

import { useCustomNodes } from '@/components/WorkflowEditor'

function MyCustomNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <div
      className={`rounded-lg border-2 p-4 ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
      }`}
    >
      <div className="text-2xl">🎯</div>
      <div className="font-semibold">{data.label}</div>
      <div className="text-sm text-gray-500">{data.description}</div>
    </div>
  )
}

export function CustomNodeExample() {
  const { registerNode } = useCustomNodes()

  React.useEffect(() => {
    registerNode({
      type: 'myCustom',
      label: 'My Custom Node',
      icon: '🎯',
      description: '自定义节点示例',
      category: 'custom',
      defaultConfig: {},
      render: MyCustomNode,
    })
  }, [registerNode])

  return <WorkflowEditorV110 />
}

// ============================================
// 示例 8: 完整的工作流应用
// ============================================

export function FullWorkflowApp() {
  const [workflowId, setWorkflowId] = useState<string | undefined>()
  const [isReadOnly, setIsReadOnly] = useState(false)

  const handleSave = async (workflow: WorkflowDefinition) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow),
      })

      if (!response.ok) {
        throw new Error('Failed to save workflow')
      }

      const saved = await response.json()
      setWorkflowId(saved.id)
      console.log('Workflow saved:', saved)
    } catch (error) {
      console.error('Error saving workflow:', error)
    }
  }

  const handleExport = (exportData: WorkflowDefinition) => {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportData.name || 'workflow'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (workflow: WorkflowDefinition) => {
    setWorkflowId(workflow.id)
    console.log('Workflow imported:', workflow)
  }

  const handleAutoLayout = (type: LayoutType) => {
    console.log('Auto layout applied:', type)
  }

  return (
    <div className="flex h-screen flex-col">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-3">
        <h1 className="text-xl font-bold">工作流编辑器</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isReadOnly}
              onChange={(e) => setIsReadOnly(e.target.checked)}
            />
            <span>只读模式</span>
          </label>
          <button
            onClick={() => setWorkflowId(undefined)}
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            新建工作流
          </button>
        </div>
      </div>

      {/* 编辑器 */}
      <div className="flex-1">
        <WorkflowEditorV110
          workflowId={workflowId}
          onSave={handleSave}
          onExport={handleExport}
          onImport={handleImport}
          onAutoLayout={handleAutoLayout}
          readOnly={isReadOnly}
          maxHistorySize={100}
          performanceMode={false}
        />
      </div>
    </div>
  )
}

// ============================================
// 示例 9: 使用布局算法 API
// ============================================

import { applyLayout } from '@/components/WorkflowEditor'
import type { Node, Edge } from 'reactflow'
import type { LayoutType } from '@/components/WorkflowEditor/AutoLayout'

export function LayoutAlgorithmExample() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const applyHorizontalLayout = () => {
    const result = applyLayout(nodes, edges, 'horizontal')
    setNodes(result.nodes)
    setEdges(result.edges)
  }

  const applyVerticalLayout = () => {
    const result = applyLayout(nodes, edges, 'vertical')
    setNodes(result.nodes)
    setEdges(result.edges)
  }

  const applyTreeLayout = () => {
    const result = applyLayout(nodes, edges, 'tree')
    setNodes(result.nodes)
    setEdges(result.edges)
  }

  const applyForceLayout = () => {
    const result = applyLayout(nodes, edges, 'force')
    setNodes(result.nodes)
    setEdges(result.edges)
  }

  return (
    <div className="flex gap-2 p-4">
      <button
        onClick={applyHorizontalLayout}
        className="rounded bg-blue-500 px-4 py-2 text-white"
      >
        水平布局
      </button>
      <button
        onClick={applyVerticalLayout}
        className="rounded bg-green-500 px-4 py-2 text-white"
      >
        垂直布局
      </button>
      <button
        onClick={applyTreeLayout}
        className="rounded bg-purple-500 px-4 py-2 text-white"
      >
        树形布局
      </button>
      <button
        onClick={applyForceLayout}
        className="rounded bg-orange-500 px-4 py-2 text-white"
      >
        力导向布局
      </button>
    </div>
  )
}

// ============================================
// 示例 10: 监听工作流变化
// ============================================

export function WorkflowChangeExample() {
  const [changeCount, setChangeCount] = useState(0)

  const handleSave = (workflow: WorkflowDefinition) => {
    setChangeCount((prev) => prev + 1)
    console.log('Workflow changed:', workflow)
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">工作流变化监听</h2>
        <p className="text-gray-600">已保存次数: {changeCount}</p>
      </div>
      <div className="flex-1">
        <WorkflowEditorV110 onSave={handleSave} />
      </div>
    </div>
  )
}

// ============================================
// 导出所有示例
// ============================================

export default {
  BasicExample,
  AutoLayoutExample,
  ImportExportExample,
  PerformanceExample,
  ReadOnlyExample,
  ClipboardExample,
  CustomNodeExample,
  FullWorkflowApp,
  LayoutAlgorithmExample,
  WorkflowChangeExample,
}