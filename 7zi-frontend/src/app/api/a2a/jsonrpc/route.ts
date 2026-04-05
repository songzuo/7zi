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
  try {
    // Parse JSON-RPC request
    const body: JSONRPCRequest = await request.json()

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
        const agentId = body.params?.agentId as string | undefined
        result = {
          agent: agentId
            ? agentScheduler.getAgent(agentId)
            : null,
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
        const taskResult = agentScheduler.scheduleTask({
          type: (body.params?.type as string) || 'default',
          priority: (body.params?.priority as 'low' | 'normal' | 'high' | 'urgent') || 'medium',
          input: (body.params?.payload as Record<string, unknown>) || {},
          timeout: body.params?.timeout as number | undefined,
        })
        result = { taskId: taskResult.taskId, success: taskResult.success, error: taskResult.error }
        break

      case 'task.get':
        const task = body.params?.taskId
          ? agentScheduler.getTask(body.params.taskId as string)
          : undefined
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
        break

      case 'task.status':
        const taskStatus = body.params?.taskId
          ? agentScheduler.getTask(body.params.taskId as string)
          : undefined
        result = {
          taskId: body.params?.taskId ?? undefined,
          status: taskStatus?.status || 'unknown',
        }
        break

      default:
        error = {
          code: -32601,
          message: `Method not found: ${body.method}`,
        }
    }

    // Build JSON-RPC response
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      result,
      error,
      id: body.id ?? undefined,
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

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
