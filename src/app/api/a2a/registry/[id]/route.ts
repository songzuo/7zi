/**
 * A2A Agent Registry - Individual Agent API Route
 * GET    /api/a2a/registry/[id] - Get specific agent
 * PUT    /api/a2a/registry/[id] - Update agent
 * DELETE /api/a2a/registry/[id] - Unregister agent
 * PATCH  /api/a2a/registry/[id] - Update heartbeat
 */

import { NextRequest } from 'next/server';
import { getAgentRegistry } from '@/lib/agents/a2a/agent-registry';
import { AgentRegistration } from '@/lib/agents/a2a/types';
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundError,
} from '@/lib/api/error-handler';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/a2a/registry/[id]
 * Get a specific agent
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const registry = getAgentRegistry();
    const agent = registry.get(id);

    if (!agent) {
      return createNotFoundError(`No agent found with ID: ${id}`);
    }

    return createSuccessResponse(agent);
  } catch (_error) {
    return createErrorResponse(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * PUT /api/a2a/registry/[id]
 * Update agent information
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const registry = getAgentRegistry();
    const existingAgent = registry.get(id);

    if (!existingAgent) {
      return createNotFoundError(`No agent found with ID: ${id}`);
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

    return createSuccessResponse({
      message: 'Agent updated successfully',
      agent: registry.get(id),
    });
  } catch (_error) {
    return createErrorResponse(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * DELETE /api/a2a/registry/[id]
 * Unregister an agent
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const registry = getAgentRegistry();
    const deleted = registry.unregister(id);

    if (!deleted) {
      return createNotFoundError(`No agent found with ID: ${id}`);
    }

    return createSuccessResponse({
      message: 'Agent unregistered successfully',
      id,
    });
  } catch (_error) {
    return createErrorResponse(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * PATCH /api/a2a/registry/[id]/heartbeat
 * Update agent heartbeat (keep-alive)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const registry = getAgentRegistry();
    const updated = registry.updateHeartbeat(id);

    if (!updated) {
      return createNotFoundError(`No agent found with ID: ${id}`);
    }

    return createSuccessResponse({
      message: 'Heartbeat updated successfully',
      agent: registry.get(id),
    });
  } catch (_error) {
    return createErrorResponse(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
