/**
 * WorkflowEditor 使用示例
 *
 * 展示如何在项目中使用工作流编辑器
 */

import React, { useState, useCallback } from 'react'
import { WorkflowEditor } from './WorkflowEditor'
import type { WorkflowDefinition } from './stores/workflow-editor-store'
import type { Node, Edge } from 'reactflow'
import type { WorkflowNodeData, WorkflowEdgeData } from './types'

/**
 * 示例 1: 基本使用
 */
export function BasicExample() {
  const handleSave = useCallback((workflow: WorkflowDefinition) => {
    console.log('保存工作流:', workflow)
    // 调用 API 保存工作流
  }, [])

  return (
    <div style={{ height: '600px' }}>
      <WorkflowEditor onSave={handleSave} />
    </div>
  )
}

/**
 * 示例 2: 带初始数据的工作流编辑器
 */
export function InitialDataExample() {
  const [initialNodes] = useState<Node<WorkflowNodeData>[]>([
    {
      id: 'start-1',
      type: 'start',
      position: { x: 100, y: 100 },
      data: {
        id: 'start-1',
        type: 'start',
        label: '开始',
        description: '工作流入口',
        config: {},
      },
    },
    {
      id: 'agent-1',
      type: 'agent',
      position: { x: 300, y: 100 },
      data: {
        id: 'agent-1',
        type: 'agent',
        label: 'AI 助手',
        description: '执行 AI 任务',
        config: {
          agentType: 'researcher',
          timeout: 30000,
        },
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 500, y: 100 },
      data: {
        id: 'condition-1',
        type: 'condition',
        label: '条件判断',
        description: '根据结果判断',
        config: {
          condition: 'outputs.success === true',
          trueBranchLabel: '成功',
          falseBranchLabel: '失败',
        },
      },
    },
    {
      id: 'end-1',
      type: 'end',
      position: { x: 700, y: 100 },
      data: {
        id: 'end-1',
        type: 'end',
        label: '结束',
        description: '工作流出口',
        config: {},
      },
    },
  ])

  const [initialEdges] = useState<Edge<WorkflowEdgeData>[]>([
    {
      id: 'edge-1',
      source: 'start-1',
      target: 'agent-1',
      type: 'default',
    },
    {
      id: 'edge-2',
      source: 'agent-1',
      target: 'condition-1',
      type: 'default',
    },
    {
      id: 'edge-3',
      source: 'condition-1',
      target: 'end-1',
      type: 'default',
      label: '成功',
    },
  ])

  const handleSave = useCallback((workflow: WorkflowDefinition) => {
    console.log('保存工作流:', workflow)
  }, [])

  return (
    <div style={{ height: '600px' }}>
      <WorkflowEditor
        workflowId="my-workflow"
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onSave={handleSave}
      />
    </div>
  )
}

/**
 * 示例 3: 只读模式（用于展示已保存的工作流）
 */
export function ReadOnlyExample() {
  const initialNodes: Node<WorkflowNodeData>[] = [
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
      id: 'end-1',
      type: 'end',
      position: { x: 300, y: 100 },
      data: {
        id: 'end-1',
        type: 'end',
        label: '结束',
        config: {},
      },
    },
  ]

  const initialEdges: Edge<WorkflowEdgeData>[] = [
    {
      id: 'edge-1',
      source: 'start-1',
      target: 'end-1',
    },
  ]

  return (
    <div style={{ height: '600px' }}>
      <WorkflowEditor
        workflowId="view-workflow"
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        readOnly={true}
      />
    </div>
  )
}

/**
 * 示例 4: 自定义保存逻辑
 */
export function CustomSaveExample() {
  const handleSave = useCallback(async (workflow: WorkflowDefinition) => {
    try {
      // 添加元数据
      const workflowWithMeta: WorkflowDefinition = {
        ...workflow,
        metadata: {
          createdAt: new Date().toISOString(),
          version: '1.0.0',
        },
      }

      // 调用 API
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowWithMeta),
      })

      if (!response.ok) {
        throw new Error('Failed to save workflow')
      }

      const savedWorkflow = await response.json()
      console.log('工作流已保存:', savedWorkflow)
    } catch (error) {
      console.error('保存失败:', error)
      // 可以显示错误提示
    }
  }, [])

  return (
    <div style={{ height: '600px' }}>
      <WorkflowEditor onSave={handleSave} />
    </div>
  )
}

/**
 * 示例 5: 工作流模板
 */
export function WorkflowTemplates() {
  // 简单聊天机器人工作流
  const chatBotWorkflow: {
    nodes: Node<WorkflowNodeData>[]
    edges: Edge<WorkflowEdgeData>[]
  } = {
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 200 },
        data: { id: 'start', type: 'start', label: '开始', config: {} },
      },
      {
        id: 'human-input',
        type: 'wait',
        position: { x: 300, y: 200 },
        data: {
          id: 'human-input',
          type: 'wait',
          label: '等待输入',
          config: { waitType: 'event', waitForEvent: 'user.message' },
        },
      },
      {
        id: 'agent',
        type: 'agent',
        position: { x: 500, y: 200 },
        data: {
          id: 'agent',
          type: 'agent',
          label: 'AI 回复',
          config: { agentType: 'chat', timeout: 30000 },
        },
      },
      {
        id: 'condition',
        type: 'condition',
        position: { x: 700, y: 200 },
        data: {
          id: 'condition',
          type: 'condition',
          label: '继续?',
          config: { condition: 'outputs.continue === true' },
        },
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 900, y: 200 },
        data: { id: 'end', type: 'end', label: '结束', config: {} },
      },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'human-input' },
      { id: 'e2', source: 'human-input', target: 'agent' },
      { id: 'e3', source: 'agent', target: 'condition' },
      { id: 'e4', source: 'condition', target: 'end' },
    ],
  }

  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>(chatBotWorkflow.nodes)
  const [edges, setEdges] = useState<Edge<WorkflowEdgeData>[]>(chatBotWorkflow.edges)

  const loadTemplate = useCallback(() => {
    setNodes(chatBotWorkflow.nodes)
    setEdges(chatBotWorkflow.edges)
  }, [])

  return (
    <div>
      <div style={{ padding: '10px' }}>
        <button onClick={loadTemplate}>加载聊天机器人模板</button>
      </div>
      <div style={{ height: '500px' }}>
        <WorkflowEditor
          initialNodes={nodes}
          initialEdges={edges}
          onSave={workflow => console.log('保存:', workflow)}
        />
      </div>
    </div>
  )
}

export default {
  BasicExample,
  InitialDataExample,
  ReadOnlyExample,
  CustomSaveExample,
  WorkflowTemplates,
}
