/**
 * A2A Agent Registry - Individual Agent API Route
 * GET    /api/a2a/registry/[id] - Get specific agent
 * PUT    /api/a2a/registry/[id] - Update agent
 * DELETE /api/a2a/registry/[id] - Unregister agent
 * PATCH  /api/a2a/registry/[id] - Update heartbeat
 */

import { NextRequest } from 'next/server'
import { withA2AAuth, canAccessAgent } from '@/lib/agents/a2a/auth'
import { getAgentRegistry } from '@/lib/agents/a2a/agent-registry'
import { AgentRegistration } from '@/lib/agents/a2a/types'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  createNotFoundError,
} from '@/lib/api/error-handler'

/** AgentRegistration.status 的合法取值 */
const VALID_STATUSES = ['online', 'offline', 'busy'] as const

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  return withA2AAuth(request, (req) => GETHandler(req, context))
}

/**
 * GET /api/a2a/registry/[id]
 * Get a specific agent
 */
async function GETHandler(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
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
  return withA2AAuth(request, (req) => PUTHandler(req, context))
}

/**
 * PUT /api/a2a/registry/[id]
 * Update agent information
 */
async function PUTHandler(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
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
  return withA2AAuth(request, (req) => DELETEHandler(req, context))
}

/**
 * DELETE /api/a2a/registry/[id]
 * Unregister an agent
 */
async function DELETEHandler(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
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
  return withA2AAuth(request, (req) => PATCHHandler(req, context))
}

/**
 * PATCH /api/a2a/registry/[id]/heartbeat
 * Update agent heartbeat (keep-alive)
 */
async function PATCHHandler(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
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
