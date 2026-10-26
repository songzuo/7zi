/**
 * A2A Agent Registry API Route
 * GET  /api/a2a/registry - List all agents
 * POST /api/a2a/registry - Register a new agent
 */

import { NextRequest } from 'next/server'
import { withA2AAuth, canAccessAgent } from '@/lib/agents/a2a/auth'
import { getAgentRegistry } from '@/lib/agents/a2a/agent-registry'
import { AgentRegistration } from '@/lib/agents/a2a/types'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
} from '@/lib/api/error-handler'

export async function GET(request: NextRequest) {
  return withA2AAuth(request, GETHandler)
}

/**
 * GET /api/a2a/registry
 * List all registered agents
 */
async function GETHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const capability = searchParams.get('capability')
    const skill = searchParams.get('skill')
    const status = searchParams.get('status')
    const available = searchParams.get('available') === 'true'

    const registry = getAgentRegistry()
    let agents = registry.getAll()

    // Filter by capability
    if (capability) {
      agents = agents.filter(agent => agent.capabilities.includes(capability))
    }

    // Filter by skill
    if (skill) {
      agents = agents.filter(agent => agent.skills.includes(skill))
    }

    // Filter by status
    if (status) {
      agents = agents.filter(agent => agent.status === status)
    }

    // Filter available agents
    if (available) {
      agents = agents.filter(agent => agent.status === 'online')
    }

    return createSuccessResponse({
      agents,
      count: agents.length,
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export async function POST(request: NextRequest) {
  return withA2AAuth(request, POSTHandler)
}

/**
 * POST /api/a2a/registry
 * Register a new agent
 */
async function POSTHandler(request: NextRequest) {
  try {
    const body = await request.json()

    // Basic validation
    if (!body.name || !body.url) {
      return createValidationError('Missing required fields', { fields: ['name', 'url'] })
    }

    const registration: AgentRegistration = {
      id: body.id,
      name: body.name,
      url: body.url,
      capabilities: body.capabilities || [],
      skills: body.skills || [],
      status: body.status || 'online',
      lastHeartbeat: new Date().toISOString(),
      load: body.load,
      metadata: body.metadata,
    }

    const registry = getAgentRegistry()
    registry.register(registration)

    return createSuccessResponse(
      {
        message: 'Agent registered successfully',
        agent: registry.get(registration.id),
      },
      201
    )
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
