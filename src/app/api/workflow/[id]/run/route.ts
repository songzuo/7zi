/**
 * Workflow Run API Route
 * POST /api/workflow/[id]/run - 运行工作流
 * GET  /api/workflow/[id]/run - 获取工作流运行历史
 */

import { NextRequest } from 'next/server'
import { workflowEngine } from '@/lib/workflow/engine'
import { WorkflowStatus, NodeType, EdgeType, InstanceStatus } from '@/types/workflow'
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/workflow/[id]/run
 * 运行工作流
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    // 创建工作流定义（模拟 - 实际应该从数据库读取）
    const workflow = {
      id,
      name: '示例工作流',
      version: 1,
      status: WorkflowStatus.ACTIVE,
      nodes: [
        {
          id: 'node_1',
          type: NodeType.START,
          name: '开始',
          position: { x: 100, y: 100 },
        },
        {
          id: 'node_2',
          type: NodeType.AGENT,
          name: '执行 Agent',
          position: { x: 350, y: 100 },
          agentConfig: {
            agentId: 'agent_1',
            agentType: 'assistant',
          },
        },
        {
          id: 'node_3',
          type: NodeType.END,
          name: '结束',
          position: { x: 600, y: 100 },
        },
      ],
      edges: [
        {
          id: 'edge_1',
          source: 'node_1',
          target: 'node_2',
          type: EdgeType.SEQUENCE,
        },
        {
          id: 'edge_2',
          source: 'node_2',
          target: 'node_3',
          type: EdgeType.SEQUENCE,
        },
      ],
      config: {
        timeout: 3600,
        retryPolicy: {
          maxRetries: 3,
          backoff: 'exponential' as const,
          interval: 5,
        },
        variables: {},
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user_1',
        updatedBy: 'user_1',
      },
    }

    // 注册工作流
    workflowEngine.registerWorkflow(workflow)

    // 创建实例
    const instance = workflowEngine.createInstance(id, body.inputs, {
      triggeredBy: body.userId || 'system',
      triggerType: body.triggerType || 'manual',
    })

    // 异步执行工作流（不等待完成）
    workflowEngine.executeInstance(instance.id).catch(error => {
      console.error('工作流执行失败:', error)
    })

    return createSuccessResponse({
      instanceId: instance.id,
      workflowId: id,
      status: instance.status,
      message: '工作流已开始运行',
      metadata: instance.metadata,
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * GET /api/workflow/[id]/runs
 * 获取工作流运行历史
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 模拟数据 - 实际实现应该从数据库读取
    const instances = [
      {
        id: 'instance_1',
        workflowId: id,
        workflowVersion: 1,
        status: InstanceStatus.COMPLETED,
        progress: {
          total: 3,
          completed: 3,
          failed: 0,
          percentage: 100,
        },
        nodeResults: {
          node_1: {
            nodeId: 'node_1',
            status: 'success' as const,
            startTime: new Date(Date.now() - 5000).toISOString(),
            endTime: new Date(Date.now() - 4990).toISOString(),
            duration: 10,
          },
          node_2: {
            nodeId: 'node_2',
            status: 'success' as const,
            startTime: new Date(Date.now() - 4990).toISOString(),
            endTime: new Date(Date.now() - 2000).toISOString(),
            duration: 2990,
            output: {
              agentId: 'agent_1',
              result: '任务执行成功',
            },
          },
          node_3: {
            nodeId: 'node_3',
            status: 'success' as const,
            startTime: new Date(Date.now() - 2000).toISOString(),
            endTime: new Date(Date.now() - 1990).toISOString(),
            duration: 10,
          },
        },
        data: {
          inputs: { query: 'Hello World' },
          outputs: { result: '任务执行成功' },
        },
        metadata: {
          startedAt: new Date(Date.now() - 5000).toISOString(),
          endedAt: new Date(Date.now() - 1990).toISOString(),
          duration: 3010,
          triggeredBy: 'user_1',
          triggerType: 'manual' as const,
        },
      },
      {
        id: 'instance_2',
        workflowId: id,
        workflowVersion: 1,
        status: InstanceStatus.RUNNING,
        progress: {
          total: 3,
          completed: 1,
          failed: 0,
          percentage: 33,
        },
        nodeResults: {
          node_1: {
            nodeId: 'node_1',
            status: 'success' as const,
            startTime: new Date(Date.now() - 1000).toISOString(),
            endTime: new Date(Date.now() - 990).toISOString(),
            duration: 10,
          },
          node_2: {
            nodeId: 'node_2',
            status: 'running' as const,
            startTime: new Date(Date.now() - 990).toISOString(),
          },
          node_3: {
            nodeId: 'node_3',
            status: 'idle' as const,
            startTime: new Date(Date.now() - 1000).toISOString(),
          },
        },
        data: {
          inputs: { query: 'Test' },
        },
        metadata: {
          startedAt: new Date(Date.now() - 1000).toISOString(),
          triggeredBy: 'user_2',
          triggerType: 'api' as const,
        },
      },
    ]

    // 过滤
    let filtered = instances
    if (status) {
      filtered = filtered.filter(i => i.status === status)
    }

    // 分页
    const paginated = filtered.slice(offset, offset + limit)

    // 统计信息
    const stats = {
      total: instances.length,
      success: instances.filter(i => i.status === InstanceStatus.COMPLETED).length,
      failed: instances.filter(i => i.status === InstanceStatus.FAILED).length,
      running: instances.filter(i => i.status === InstanceStatus.RUNNING).length,
    }

    return createSuccessResponse({
      instances: paginated,
      stats,
      total: filtered.length,
      limit,
      offset,
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
