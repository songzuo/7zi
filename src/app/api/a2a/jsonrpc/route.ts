/**
 * A2A API Route - JSON-RPC Endpoint
 * POST /api/a2a/jsonrpc
 *
 * Handles JSON-RPC 2.0 requests for the A2A protocol
 */

import { NextRequest, NextResponse } from 'next/server';
import { A2ARequestHandler, createRequestHandler } from '@/lib/a2a/jsonrpc-handler';
import { getTaskStore } from '@/lib/a2a/task-store';
import { createSevenZiExecutor } from '@/lib/a2a/executor';
import { getAgentCard, getExtendedAgentCard } from '@/lib/a2a/agent-card';
import { JsonRpcRequest } from '@/lib/a2a/types';

// Initialize handler (singleton pattern)
let handler: A2ARequestHandler | null = null;

function getHandler(): A2ARequestHandler {
  if (!handler) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    handler = createRequestHandler(
      getAgentCard(baseUrl),
      getTaskStore(),
      createSevenZiExecutor(),
      getExtendedAgentCard(baseUrl)
    );
  }
  return handler;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle batch requests
    if (Array.isArray(body)) {
      const responses = await Promise.all(
        body.map(req => processRequest(req))
      );
      return NextResponse.json(responses);
    }

    // Single request
    const response = await processRequest(body);
    return NextResponse.json(response);

  } catch (error) {
    console.error('A2A JSON-RPC Error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
        },
        id: null,
      },
      { status: 400 }
    );
  }
}

async function processRequest(body: unknown) {
  const handler = getHandler();

  // Validate request structure
  if (typeof body !== 'object' || body === null) {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Invalid request',
      },
      id: null,
    };
  }

  const request = body as JsonRpcRequest;
  return handler.handleRequest(request);
}

// CORS headers for cross-origin requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}