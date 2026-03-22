/**
 * A2A Agent Registry API Route
 * GET  /api/a2a/registry - List all agents
 * POST /api/a2a/registry - Register a new agent
 * GET  /api/a2a/registry/[id] - Get specific agent
 * PUT  /api/a2a/registry/[id] - Update agent
 * DELETE /api/a2a/registry/[id] - Unregister agent
 */

import { NextRequest } from 'next/server';
import { getAgentRegistry } from '@/lib/a2a/agent-registry';
import { AgentRegistration } from '@/lib/a2a/types';
import {
  success,
  created,
  validationError,
  internalError,
} from '@/lib/api/response';

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

    return success(agents);
  } catch (err) {
    console.error('Agent Registry GET error:', err);
    return internalError('Failed to list agents');
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
      return validationError('Missing required fields: name, url');
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

    return created({
      message: 'Agent registered successfully',
      agent: registry.get(registration.id),
    });
  } catch (err) {
    console.error('Agent Registry POST error:', err);
    return internalError('Failed to register agent');
  }
}
