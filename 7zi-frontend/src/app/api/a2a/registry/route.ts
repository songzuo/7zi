/**
 * A2A Registry API Route
 *
 * Handles agent registration, unregistration, and status management.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateSecureId } from '@/lib/utils'
import { agentScheduler } from '@/lib/agents/scheduler/scheduler'
import type { RegisterAgentRequest } from '@/lib/agents/scheduler/types'
import { createSuccessResponse, createErrorResponse, ErrorType } from '@/lib/api/error-handler'
import { authenticateJWT } from '@/lib/auth/api-auth'

// GET /api/a2a/registry - List all agents
export async function GET(request: NextRequest) {
  const auth = await authenticateJWT(request)
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const capability = searchParams.get('capability')
  const agentId = searchParams.get('id')

  try {
    if (agentId) {
      const agent = agentScheduler.getAgent(agentId)
      if (!agent) {
        return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
      }
      return createSuccessResponse({ agent })
    }

    const agents = capability
      ? agentScheduler.getAgentsByCapability(capability)
      : agentScheduler.getAllAgents()

    return createSuccessResponse({ agents, count: agents.length })
  } catch (error) {
    console.error('Registry GET error:', error)
    return createErrorResponse(new Error('Failed to fetch agents'))
  }
}

// POST /api/a2a/registry - Register a new agent
export async function POST(request: NextRequest) {
  const auth = await authenticateJWT(request)
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: RegisterAgentRequest = await request.json()

    if (!body.name || !body.type) {
      return NextResponse.json(
        {
          success: false,
          error: { type: 'VALIDATION', message: 'Name and type are required' },
        },
        { status: 400 }
      )
    }

    if (!body.capabilities || !Array.isArray(body.capabilities)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION',
            message: 'Capabilities must be an array',
          },
        },
        { status: 400 }
      )
    }

    const agentId = generateSecureId('agent')
    const agent = agentScheduler.registerAgent(
      agentId,
      body.name,
      body.type,
      body.capabilities,
      body.metadata
    )

    return createSuccessResponse({ agent }, 201)
  } catch (error) {
    console.error('Registry POST error:', error)
    return createErrorResponse(new Error('Failed to register agent'))
  }
}

// PUT /api/a2a/registry - Update agent status
export async function PUT(request: NextRequest) {
  const auth = await authenticateJWT(request)
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { agentId, status } = body

    if (!agentId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION',
            message: 'Agent ID and status are required',
          },
        },
        { status: 400 }
      )
    }

    const validStatuses = ['idle', 'busy', 'offline', 'error']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION',
            message: `Status must be one of: ${validStatuses.join(', ')}`,
          },
        },
        { status: 400 }
      )
    }

    const updated = agentScheduler.updateAgentStatus(agentId, status)
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
    }

    const agent = agentScheduler.getAgent(agentId)
    return createSuccessResponse({ agent })
  } catch (error) {
    console.error('Registry PUT error:', error)
    return createErrorResponse(new Error('Failed to update agent'))
  }
}

// DELETE /api/a2a/registry - Unregister an agent
export async function DELETE(request: NextRequest) {
  const auth = await authenticateJWT(request)
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('id')

  if (!agentId) {
    return NextResponse.json(
      {
        success: false,
        error: { type: 'VALIDATION', message: 'Agent ID is required' },
      },
      { status: 400 }
    )
  }

  try {
    const removed = agentScheduler.unregisterAgent(agentId)
    if (!removed) {
      return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
    }

    return createSuccessResponse({ message: 'Agent unregistered successfully' })
  } catch (error) {
    console.error('Registry DELETE error:', error)
    return createErrorResponse(new Error('Failed to unregister agent'))
  }
}
