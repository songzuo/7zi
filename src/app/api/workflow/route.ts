/**
 * Workflow API Route
 * GET  /api/workflow - 获取工作流列表
 * POST /api/workflow - 创建工作流
 */

import { NextRequest } from 'next/server';
import { WorkflowEngine } from '@/lib/workflow/engine';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
} from '@/lib/api/error-handler';

const workflowEngine = new WorkflowEngine();

/**
 * POST /api/workflow
 * 创建工作流
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必需字段
    if (!body.name) {
      return createValidationError('工作流名称不能为空');
    }

    // 创建工作流定义
    const workflow = {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      description: body.description,
      version: 1,
      status: 'draft' as const,
      nodes: body.nodes || [],
      edges: body.edges || [],
      config: {
        timeout: body.config?.timeout || 3600,
        retryPolicy: body.config?.retryPolicy || {
          maxRetries: 3,
          backoff: 'exponential' as const,
          interval: 5,
        },
        variables: body.config?.variables || {},
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: body.userId || 'system',
        updatedBy: body.userId || 'system',
      },
    };

    // 验证工作流
    const validation = workflowEngine.validateWorkflow(workflow);
    if (!validation.valid) {
      return createValidationError(
        '工作流验证失败',
        { errors: validation.errors }
      );
    }

    // 注册工作流
    workflowEngine.registerWorkflow(workflow);

    return createSuccessResponse(workflow, 201);
  } catch (_error) {
    return createErrorResponse(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * GET /api/workflow
 * 获取工作流列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 模拟数据 - 实际实现应该从数据库读取
    const workflows = [
      {
        id: 'workflow_1',
        name: '示例工作流',
        description: '一个简单的示例工作流',
        version: 1,
        status: 'active' as const,
        nodes: [
          {
            id: 'node_1',
            type: 'start' as const,
            name: '开始',
            position: { x: 100, y: 100 },
          },
          {
            id: 'node_2',
            type: 'agent' as const,
            name: '执行 Agent',
            position: { x: 350, y: 100 },
            agentConfig: {
              agentId: 'agent_1',
              agentType: 'assistant',
            },
          },
          {
            id: 'node_3',
            type: 'end' as const,
            name: '结束',
            position: { x: 600, y: 100 },
          },
        ],
        edges: [
          {
            id: 'edge_1',
            source: 'node_1',
            target: 'node_2',
            type: 'sequence' as const,
          },
          {
            id: 'edge_2',
            source: 'node_2',
            target: 'node_3',
            type: 'sequence' as const,
          },
        ],
        config: {
          timeout: 3600,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'user_1',
          updatedBy: 'user_1',
        },
      },
    ];

    // 过滤
    let filtered = workflows;
    if (status) {
      filtered = filtered.filter((w) => w.status === status);
    }

    // 分页
    const paginated = filtered.slice(offset, offset + limit);

    return createSuccessResponse({
      workflows: paginated,
      total: filtered.length,
      limit,
      offset,
    });
  } catch (_error) {
    return createErrorResponse(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
