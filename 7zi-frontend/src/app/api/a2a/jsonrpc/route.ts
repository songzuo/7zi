/**
 * A2A JSON-RPC API Route
 * 
 * JSON-RPC 2.0 endpoint for A2A protocol communication.
 * Supports task execution, agent discovery, and method invocation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentScheduler } from '@/lib/agent-scheduler/scheduler';
import type { JSONRPCRequest, JSONRPCResponse } from '@/lib/agent-scheduler/types';
import { authenticateJWT } from '@/lib/auth/api-auth';

export async function POST(request: NextRequest) {
  try {
    // Parse JSON-RPC request
    const body: JSONRPCRequest = await request.json();

    // Validate JSON-RPC 2.0 format
    if (body.jsonrpc !== '2.0') {
      const errorResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc version must be "2.0"',
        },
        id: body.id,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!body.method) {
      const errorResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found: method is required',
        },
        id: body.id,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Optional authentication check
    // For public methods, skip auth; for private methods, require auth
    const publicMethods = [
      'agent.list',
      'agent.get',
      'agent.discover',
      'task.create',
      'task.get',
      'task.status',
    ];

    if (!publicMethods.includes(body.method)) {
      const auth = await authenticateJWT(request);
      if (!auth.authenticated) {
        const errorResponse: JSONRPCResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Unauthorized: authentication required',
          },
          id: body.id,
        };
        return NextResponse.json(errorResponse, { status: 401 });
      }
    }

    // Route to handler
    const result = await handleJSONRPCMethod(body.method, body.params);

    if (result.success) {
      const successResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        result: result.data,
        id: body.id,
      };
      return NextResponse.json(successResponse);
    } else {
      const errorResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        error: {
          code: result.error?.code || -32000,
          message: result.error?.message || 'Internal error',
          data: result.error?.data,
        },
        id: body.id,
      };
      return NextResponse.json(errorResponse, { status: result.httpStatus });
    }
  } catch (error) {
    console.error('JSON-RPC error:', error);
    const errorResponse: JSONRPCResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error: invalid JSON',
      },
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }
}

async function handleJSONRPCMethod(
  method: string,
  params?: Record<string, unknown>
): Promise<{
  success: boolean;
  data?: unknown;
  error?: { code: number; message: string; data?: unknown };
  httpStatus?: number;
}> {
  try {
    // Agent methods
    if (method === 'agent.list') {
      const agents = agentScheduler.getAllAgents();
      return { success: true, data: { agents, count: agents.length } };
    }

    if (method === 'agent.get') {
      const agentId = params?.agentId as string;
      if (!agentId) {
        return {
          success: false,
          error: { code: -32602, message: 'Invalid params: agentId required' },
        };
      }
      const agent = agentScheduler.getAgent(agentId);
      if (!agent) {
        return {
          success: false,
          error: { code: -32002, message: 'Agent not found' },
          httpStatus: 404,
        };
      }
      return { success: true, data: { agent } };
    }

    if (method === 'agent.discover') {
      const capability = params?.capability as string;
      const agents = capability
        ? agentScheduler.getAgentsByCapability(capability)
        : agentScheduler.getAllAgents();
      return {
        success: true,
        data: { agents, count: agents.length },
      };
    }

    if (method === 'agent.heartbeat') {
      const agentId = params?.agentId as string;
      if (!agentId) {
        return {
          success: false,
          error: { code: -32602, message: 'Invalid params: agentId required' },
        };
      }
      const success = agentScheduler.heartbeat(agentId);
      if (!success) {
        return {
          success: false,
          error: { code: -32002, message: 'Agent not found' },
          httpStatus: 404,
        };
      }
      return { success: true, data: { message: 'Heartbeat received' } };
    }

    // Task methods
    if (method === 'task.create') {
      const type = params?.type as string;
      const input = params?.input as Record<string, unknown>;

      if (!type) {
        return {
          success: false,
          error: { code: -32602, message: 'Invalid params: type required' },
        };
      }

      if (!input) {
        return {
          success: false,
          error: { code: -32602, message: 'Invalid params: input required' },
        };
      }

      const response = agentScheduler.scheduleTask({
        type,
        input,
        priority: (params?.priority ?? 'normal') as 'low' | 'normal' | 'high' | 'urgent',
        agentId: params?.agentId as string,
        metadata: params?.metadata as Record<string, unknown>,
        maxRetries: params?.maxRetries as number,
      });

      if (!response.success) {
        return {
          success: false,
          error: {
            code: -32003,
            message: response.error || 'Failed to create task',
          },
          httpStatus: 400,
        };
      }

      const task = agentScheduler.getTask(response.taskId!);
      return { success: true, data: { task, taskId: response.taskId }, httpStatus: 201 };
    }

    if (method === 'task.get') {
      const taskId = params?.taskId as string;
      if (!taskId) {
        return {
          success: false,
          error: { code: -32602, message: 'Invalid params: taskId required' },
        };
      }
      const task = agentScheduler.getTask(taskId);
      if (!task) {
        return {
          success: false,
          error: { code: -32004, message: 'Task not found' },
          httpStatus: 404,
        };
      }
      return { success: true, data: { task } };
    }

    if (method === 'task.status') {
      const taskId = params?.taskId as string;
      if (!taskId) {
        return {
          success: false,
          error: { code: -32602, message: 'Invalid params: taskId required' },
        };
      }
      const task = agentScheduler.getTask(taskId);
      if (!task) {
        return {
          success: false,
          error: { code: -32004, message: 'Task not found' },
          httpStatus: 404,
        };
      }
      return { success: true, data: { taskId, status: task.status } };
    }

    if (method === 'task.update') {
      const taskId = params?.taskId as string;
      const status = params?.status as string;
      const output = params?.output as Record<string, unknown>;
      const error = params?.error as string;

      if (!taskId) {
        return {
          success: false,
          error: { code: -32602, message: 'Invalid params: taskId required' },
        };
      }

      const updated = agentScheduler.updateTask({
        taskId,
        status: status as any,
        output,
        error,
      });

      if (!updated) {
        return {
          success: false,
          error: { code: -32004, message: 'Task not found' },
          httpStatus: 404,
        };
      }

      const task = agentScheduler.getTask(taskId);
      return { success: true, data: { task } };
    }

    if (method === 'task.cancel') {
      const taskId = params?.taskId as string;
      if (!taskId) {
        return {
          success: false,
          error: { code: -32602, message: 'Invalid params: taskId required' },
        };
      }

      const cancelled = agentScheduler.cancelTask(taskId);
      if (!cancelled) {
        return {
          success: false,
          error: { code: -32004, message: 'Task not found' },
          httpStatus: 404,
        };
      }

      return { success: true, data: { message: 'Task cancelled' } };
    }

    // Queue methods
    if (method === 'queue.stats') {
      const stats = agentScheduler.getQueueStats();
      return { success: true, data: { stats } };
    }

    // Unknown method
    return {
      success: false,
      error: {
        code: -32601,
        message: 'Method not found',
        data: { method },
      },
    };
  } catch (error) {
    console.error('JSON-RPC method handler error:', error);
    return {
      success: false,
      error: {
        code: -32000,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// OPTIONS for CORS support
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
