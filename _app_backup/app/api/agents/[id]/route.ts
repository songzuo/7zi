/**
 * Agent API Routes
 * Main entry point for agent-related API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAgentById, 
  updateAgent, 
  deleteAgent, 
  updateAgentStatus,
  createAgentToken,
  getAgentDataAccessLog,
  AgentStatus 
} from '@/lib/agents';

/**
 * GET /api/agents/[id] - Get agent by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await getAgentById(params.id);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Get access log if requested
    const url = new URL(request.url);
    const includeAccessLog = url.searchParams.get('accessLog') === 'true';
    
    const response: Record<string, unknown> = { agent };
    
    if (includeAccessLog) {
      response.accessLog = await getAgentDataAccessLog(params.id, { limit: 50 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[id] - Update agent
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const agent = await updateAgent(params.id, body);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Failed to update agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id] - Delete agent
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await deleteAgent(params.id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Agent deleted successfully' 
    });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/[id] - Partial update (e.g., status change)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Handle status update specially
    if (body.status) {
      const agent = await updateAgentStatus(params.id, body.status as AgentStatus);
      
      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ agent });
    }

    // Handle other partial updates
    const agent = await updateAgent(params.id, body);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Failed to patch agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}