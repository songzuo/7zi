/**
 * A2A Agent Registry - Individual Agent API Route
 * GET    /api/a2a/registry/[id] - Get specific agent
 * PUT    /api/a2a/registry/[id] - Update agent
 * DELETE /api/a2a/registry/[id] - Unregister agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgentRegistry } from '@/lib/agents/a2a/agent-registry';
import { AgentRegistration } from '@/lib/agents/a2a/types';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/a2a/registry/[id]
 * Get a specific agent
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;
    const registry = getAgentRegistry();
    const agent = registry.get(id);

    if (!agent) {
      return NextResponse.json(
        {
          error: 'Agent not found',
          message: `No agent found with ID: ${id}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Agent Registry GET [id] error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/a2a/registry/[id]
 * Update agent information
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;
    const body = await request.json();

    const registry = getAgentRegistry();
    const existingAgent = registry.get(id);

    if (!existingAgent) {
      return NextResponse.json(
        {
          error: 'Agent not found',
          message: `No agent found with ID: ${id}`,
        },
        { status: 404 }
      );
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
    };

    // Re-register with same ID
    registry.unregister(id);
    registry.register(updatedAgent);

    return NextResponse.json({
      message: 'Agent updated successfully',
      agent: registry.get(id),
    });
  } catch (error) {
    console.error('Agent Registry PUT [id] error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/a2a/registry/[id]
 * Unregister an agent
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;
    const registry = getAgentRegistry();
    const deleted = registry.unregister(id);

    if (!deleted) {
      return NextResponse.json(
        {
          error: 'Agent not found',
          message: `No agent found with ID: ${id}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Agent unregistered successfully',
      id,
    });
  } catch (error) {
    console.error('Agent Registry DELETE [id] error:', error);
    return NextResponse.json(
      {
        error: 'Failed to unregister agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/a2a/registry/[id]/heartbeat
 * Update agent heartbeat (keep-alive)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;
    const registry = getAgentRegistry();
    const updated = registry.updateHeartbeat(id);

    if (!updated) {
      return NextResponse.json(
        {
          error: 'Agent not found',
          message: `No agent found with ID: ${id}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Heartbeat updated successfully',
      agent: registry.get(id),
    });
  } catch (error) {
    console.error('Agent Registry PATCH [id] error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update heartbeat',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
