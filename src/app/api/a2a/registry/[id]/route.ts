/**
 * A2A Agent Registry - Individual Agent API Route
 * GET    /api/a2a/registry/[id] - Get specific agent
 * PUT    /api/a2a/registry/[id] - Update agent
 * DELETE /api/a2a/registry/[id] - Unregister agent
 * PATCH  /api/a2a/registry/[id] - Update heartbeat
 */

import { NextRequest } from 'next/server'
import { withA2AAuth, canAccessAgent, type A2AAuthContext } from '@/lib/agents/a2a/auth'
import { getAgentRegistry } from '@/lib/agents/a2a/agent-registry'
import { AgentRegistration } from '@/lib/agents/a2a/types'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  createNotFoundError,
  createForbiddenError,
} from '@/lib/api/error-handler'

/** AgentRegistration.status 的合法取值 */
const VALID_STATUSES = ['online', 'offline', 'busy'] as const

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  return withA2AAuth(request, (req, auth) => GETHandler(req, context, auth))
}

/**
 * GET /api/a2a/registry/[id]
 * Get a specific agent
 */
async function GETHandler(request: NextRequest, context: RouteContext, auth: A2AAuthContext) {
  try {
    const { id } = await context.params

    // 越权检查放在存在性检查之前：
    // 否则一个绑定在别的 agent 上的 API Key 可以通过 404/200 的差异
    // 探测出某个 agent 是否存在（存在性 oracle）。
    if (!canAccessAgent(auth, id)) {
      return createForbiddenError(`Access denied for agent: ${id}`)
    }

    const registry = getAgentRegistry()
    const agent = registry.get(id)

    if (!agent) {
      return createNotFoundError(`No agent found with ID: ${id}`)
    }

    return createSuccessResponse(agent)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return withA2AAuth(request, (req, auth) => PUTHandler(req, context, auth))
}

/**
 * PUT /api/a2a/registry/[id]
 * Update agent information
 */
async function PUTHandler(request: NextRequest, context: RouteContext, auth: A2AAuthContext) {
  try {
    const { id } = await context.params

    // 修改前必须校验访问权：防止用一个 scoped API Key 改别人的 agent
    if (!canAccessAgent(auth, id)) {
      return createForbiddenError(`Access denied for agent: ${id}`)
    }

    const body = await request.json()

    const registry = getAgentRegistry()
    const existingAgent = registry.get(id)

    if (!existingAgent) {
      return createNotFoundError(`No agent found with ID: ${id}`)
    }

    // status 必须是合法枚举值
    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      return createValidationError('Invalid status', {
        field: 'status',
        allowed: VALID_STATUSES,
      })
    }

    // capabilities / skills 必须是数组
    if (
      (body.capabilities !== undefined && !Array.isArray(body.capabilities)) ||
      (body.skills !== undefined && !Array.isArray(body.skills))
    ) {
      return createValidationError('capabilities and skills must be arrays', {
        fields: ['capabilities', 'skills'],
      })
    }

    // Update agent (create new registration with updated fields)
    const updatedAgent: AgentRegistration = {
      ...existingAgent,
      name: body.name ?? existingAgent.name,
      url: body.url ?? existingAgent.url,
      capabilities: body.capabilities ?? existingAgent.capabilities,
      skills: body.skills ?? existingAgent.skills,
      status: body.status ?? existingAgent.status,
      load: body.load ?? existingAgent.load,
      metadata: body.metadata ?? existingAgent.metadata,
      lastHeartbeat: body.lastHeartbeat ?? existingAgent.lastHeartbeat,
    }

    // Re-register with same ID
    registry.unregister(id)
    registry.register(updatedAgent)

    return createSuccessResponse({
      message: 'Agent updated successfully',
      agent: registry.get(id),
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withA2AAuth(request, (req, auth) => DELETEHandler(req, context, auth))
}

/**
 * DELETE /api/a2a/registry/[id]
 * Unregister an agent
 */
async function DELETEHandler(request: NextRequest, context: RouteContext, auth: A2AAuthContext) {
  try {
    const { id } = await context.params

    // 注销前必须校验访问权：防止用一个 scoped API Key 删掉别人的 agent
    if (!canAccessAgent(auth, id)) {
      return createForbiddenError(`Access denied for agent: ${id}`)
    }

    const registry = getAgentRegistry()
    const deleted = registry.unregister(id)

    if (!deleted) {
      return createNotFoundError(`No agent found with ID: ${id}`)
    }

    return createSuccessResponse({
      message: 'Agent unregistered successfully',
      id,
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withA2AAuth(request, (req, auth) => PATCHHandler(req, context, auth))
}

/**
 * PATCH /api/a2a/registry/[id]/heartbeat
 * Update agent heartbeat (keep-alive)
 */
async function PATCHHandler(request: NextRequest, context: RouteContext, auth: A2AAuthContext) {
  try {
    const { id } = await context.params

    // 心跳同样会修改 agent 状态，必须先校验访问权
    if (!canAccessAgent(auth, id)) {
      return createForbiddenError(`Access denied for agent: ${id}`)
    }

    const registry = getAgentRegistry()
    const updated = registry.updateHeartbeat(id)

    if (!updated) {
      return createNotFoundError(`No agent found with ID: ${id}`)
    }

    return createSuccessResponse({
      message: 'Heartbeat updated successfully',
      agent: registry.get(id),
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
