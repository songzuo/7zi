/**
 * A2A Agent Registry API Route
 * GET  /api/a2a/registry - List all agents
 * POST /api/a2a/registry - Register a new agent
 * GET  /api/a2a/registry/[id] - Get specific agent
 * PUT  /api/a2a/registry/[id] - Update agent
 * DELETE /api/a2a/registry/[id] - Unregister agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgentRegistry } from '@/lib/a2a/agent-registry';
import { AgentRegistration } from '@/lib/a2a/types';

/**
 * GET /api/a2a/registry
 * List all registered agents
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const capability = searchParams.get('capability');
    const skill = searchParams.get('skill');
    const status = searchParams.get('status');
    const available = searchParams.get('available') === 'true';

    const registry = getAgentRegistry();
    let agents = registry.getAll();

    // Filter by capability
    if (capability) {
      agents = agents.filter(agent =>
        agent.capabilities.includes(capability)
      );
    }

    // Filter by skill
    if (skill) {
      agents = agents.filter(agent =>
        agent.skills.includes(skill)
      );
    }

    // Filter by status
    if (status) {
      agents = agents.filter(agent => agent.status === status);
    }

    // Filter available agents
    if (available) {
      agents = agents.filter(agent => agent.status === 'online');
    }

    return NextResponse.json({
      agents,
      count: agents.length,
    });
  } catch (error) {
    console.error('Agent Registry GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list agents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/a2a/registry
 * Register a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.name || !body.url) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Missing required fields: name, url',
        },
        { status: 400 }
      );
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
    };

    const registry = getAgentRegistry();
    registry.register(registration);

    return NextResponse.json(
      {
        message: 'Agent registered successfully',
        agent: registry.get(registration.id),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Agent Registry POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to register agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
