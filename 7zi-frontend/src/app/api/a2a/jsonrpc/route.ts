/**
 * A2A JSON-RPC API Route
 *
 * JSON-RPC 2.0 endpoint for A2A protocol communication.
 * Supports task execution, agent discovery, and method invocation.
 *
 * Rate limit: 100 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server'
import { agentScheduler } from '@/lib/agents/scheduler/scheduler'
import type { JSONRPCRequest, JSONRPCResponse, TaskStatus } from '@/lib/agents/scheduler/types'
import { authenticateJWT } from '@/lib/auth/api-auth'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api-rate-limit'

export const POST = withRateLimit(RATE_LIMIT_PRESETS.relaxed, async (request: NextRequest) => {
  let body: JSONRPCRequest
  try {
    body = await request.json()
  } catch (parseError) {
    // Invalid JSON - return 400 with JSON-RPC parse error
    const errorResponse: JSONRPCResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error: invalid JSON',
      },
      id: undefined,
    }
    return NextResponse.json(errorResponse, { status: 400 })
  }

  try {
    // Validate JSON-RPC 2.0 format
    if (body.jsonrpc !== '2.0') {
      const errorResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc version must be "2.0"',
        },
        id: body.id,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    if (!body.method) {
      const errorResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found: method is required',
        },
        id: body.id,
      }
      return NextResponse.json(errorResponse, { status: 400 })
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
    ]

    if (!publicMethods.includes(body.method)) {
      const auth = await authenticateJWT(request)
      if (!auth.authenticated) {
        const errorResponse: JSONRPCResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Unauthorized: authentication required',
            data: auth.error,
          },
          id: body.id,
        }
        return NextResponse.json(errorResponse, { status: 401 })
      }
    }

    // Process the JSON-RPC request
    let result: unknown
    let error: { code: number; message: string; data?: unknown } | undefined

    switch (body.method) {
      case 'agent.list':
        result = {
          agents: agentScheduler.getAllAgents().map(a => ({
            id: a.id,
            name: a.name,
            status: a.status,
            capabilities: a.capabilities,
          })),
        }
        break

      case 'agent.get':
        if (!body.params?.agentId) {
          error = { code: -32602, message: 'Missing required parameter: agentId' }
        } else {
          result = {
            agent: agentScheduler.getAgent(body.params.agentId as string),
          }
        }
        break

      case 'agent.discover':
        result = {
          agents: body.params?.query
            ? agentScheduler.getAgentsByCapability(body.params.query as string)
            : agentScheduler.getAllAgents(),
        }
        break

      case 'task.create':
        // type is required for task.create
        if (!body.params?.type) {
          error = { code: -32602, message: 'Missing required parameter: type' }
        } else {
          const taskResult = agentScheduler.scheduleTask({
            type: body.params.type as string,
            priority: (body.params?.priority as 'low' | 'normal' | 'high' | 'urgent') || 'medium',
            input: (body.params?.payload as Record<string, unknown>) || {},
            timeout: body.params?.timeout as number | undefined,
          })
          result = { taskId: taskResult.taskId, success: taskResult.success, error: taskResult.error }
        }
        break

      case 'task.get':
        if (!body.params?.taskId) {
          error = { code: -32602, message: 'Missing required parameter: taskId' }
        } else {
          const task = agentScheduler.getTask(body.params.taskId as string)
          result = {
            task: task ? {
              id: task.id,
              type: task.type,
              status: task.status,
              input: task.input,
              output: task.output,
              error: task.error,
              createdAt: task.createdAt,
              startedAt: task.startedAt,
              completedAt: task.completedAt,
            } : null,
          }
        }
        break

      case 'task.status':
        if (!body.params?.taskId) {
          error = { code: -32602, message: 'Missing required parameter: taskId' }
        } else {
          const taskStatus = agentScheduler.getTask(body.params.taskId as string)
          result = {
            taskId: body.params.taskId as string,
            status: taskStatus?.status || 'unknown',
          }
        }
        break

      default:
        error = {
          code: -32601,
          message: `Method not found: ${body.method}`,
        }
    }

    // Build JSON-RPC response for known methods with validation errors
    if (error) {
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        error,
        id: body.id ?? undefined,
      }
      // Missing required params returns 400
      return NextResponse.json(response, { status: 400 })
    }

    // Unknown method - method not found in switch
    if (result === undefined && !error) {
      const errorResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${body.method}`,
        },
        id: body.id ?? undefined,
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Build success response
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      result,
      error: undefined,
      id: body.id ?? undefined,
    }

    // task.create returns 201 Created
    if (body.method === 'task.create') {
      return NextResponse.json(response, { status: 201 })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[A2A JSON-RPC] Error:', error)
    const errorResponse: JSONRPCResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : String(error),
      },
      id: undefined,
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
})

export const OPTIONS = async () => {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
