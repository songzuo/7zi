/**
 * A2A Agent Heartbeat API Route
 * POST /api/a2a/registry/[id]/heartbeat - Update agent heartbeat
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgentRegistry } from '@/lib/agents/a2a/agent-registry';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * POST /api/a2a/registry/[id]/heartbeat
 * Update agent heartbeat and status
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;
    const body = await request.json();

    const registry = getAgentRegistry();

    // Update heartbeat
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

    // Optionally update status if provided
    if (body.status) {
      registry.updateStatus(id, body.status);
    }

    // Optionally update load if provided
    if (body.load !== undefined) {
      const agent = registry.get(id);
      if (agent) {
        registry.unregister(id);
        registry.register({
          ...agent,
          load: body.load,
          lastHeartbeat: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      message: 'Heartbeat updated successfully',
      agent: registry.get(id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Agent Heartbeat POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update heartbeat',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
