/**
 * A2A API Route - JSON-RPC Endpoint
 * POST /api/a2a/jsonrpc
 *
 * Handles JSON-RPC 2.0 requests for the A2A protocol
 *
 * @refactored - Added request validation and improved error handling
 */

import { A2ARequestHandler, createRequestHandler } from '@/lib/agents/a2a/jsonrpc-handler';
import { getTaskStore } from '@/lib/agents/a2a/task-store';
import { createSevenZiExecutor } from '@/lib/agents/a2a/executor';
import { getAgentCard, getExtendedAgentCard } from '@/lib/agents/a2a/agent-card';
import { JsonRpcRequest, JsonRpcResponse } from '@/lib/agents/a2a/types';
import { jsonRpcRequestSchema, jsonRpcBatchRequestSchema, validateBody, formatValidationErrors } from '@/lib/api/validation';
import { logger } from '@/lib/logger';

// Initialize handler (singleton pattern)
let handler: A2ARequestHandler | null = null;

/**
 * Get CORS headers
 * Enforces strict origin validation using NEXT_PUBLIC_SITE_URL
 */
function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

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

/**
 * Process a single JSON-RPC request
 */
async function processSingleRequest(body: unknown): Promise<JsonRpcResponse> {
  const _handler = getHandler();

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

  // Validate against JSON-RPC schema
  const validation = validateBody(request, jsonRpcRequestSchema);

  if (!validation.success) {
    const errors = formatValidationErrors(validation.errors);
    return {
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Invalid request format',
        data: errors,
      },
      id: request.id ?? null,
    };
  }

  // Process the request
  return handler.handleRequest(request);
}

/**
 * Process a batch of JSON-RPC requests
 */
async function processBatchRequest(body: unknown): Promise<JsonRpcResponse[]> {
  const handler = getHandler();

  // Validate batch request
  const validation = validateBody(body, jsonRpcBatchRequestSchema);

  if (!validation.success) {
    return [{
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Invalid batch request format',
      },
      id: null,
    }];
  }

  const requests = body as JsonRpcRequest[];

  // Process all requests in parallel
  return Promise.all(
    requests.map(request => processSingleRequest(request))
  );
}

/**
 * POST /api/a2a/jsonrpc
 * Handle JSON-RPC requests (single or batch)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Handle empty request
    if (body === null || body === undefined) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid request',
          },
          id: null,
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Handle batch requests
    if (Array.isArray(body)) {
      // Empty batch is invalid
      if (body.length === 0) {
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            error: {
              code: -32600,
              message: 'Invalid request - empty batch',
            },
            id: null,
          },
          { status: 400 }
        );
      }

      const responses = await processBatchRequest(body);
      return NextResponse.json(responses, { headers: getCorsHeaders() });
    }

    // Handle single request
    const response = await processSingleRequest(body);

    // Determine appropriate status code
    const statusCode = response.error ? determineErrorStatusCode(response.error.code) : 200;

    return NextResponse.json(response, { status: statusCode, headers: getCorsHeaders() });

  } catch (_error) {
    logger.error('A2A JSON-RPC error', error);

    // Check for JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error',
          },
          id: null,
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: process.env.NODE_ENV === 'development'
            ? { message: error instanceof Error ? error.message : String(error) }
            : undefined,
        },
        id: null,
      },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

/**
 * Determine HTTP status code based on JSON-RPC error code
 */
function determineErrorStatusCode(jsonRpcCode: number): number {
  // JSON-RPC error codes: https://www.jsonrpc.org/specification#error_object
  switch (jsonRpcCode) {
    case -32700: // Parse error
    case -32600: // Invalid request
    case -32602: // Invalid params
      return 400;

    case -32601: // Method not found
      return 404;

    case -32603: // Internal error
    default:
      return 500;
  }
}

/**
 * CORS headers for cross-origin requests
 * Enforces strict origin validation using NEXT_PUBLIC_SITE_URL
 */
export async function OPTIONS() {
  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}
