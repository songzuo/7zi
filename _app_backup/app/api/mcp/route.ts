/**
 * MCP Server API Route
 * 
 * Implements the MCP Streamable HTTP transport as defined in the
 * Model Context Protocol specification (2025-06-18).
 * 
 * Endpoints:
 * - POST /api/mcp - Send JSON-RPC messages
 * - GET /api/mcp - Open SSE stream for server messages
 * - DELETE /api/mcp - Terminate session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMcpServer } from '@/lib/mcp/server';
import { sessionManager, MCPHttpTransport, toSSE } from '@/lib/mcp/http-transport';

// MCP Protocol version
const MCP_PROTOCOL_VERSION = '2025-06-18';

/**
 * Handle POST requests - Receive JSON-RPC messages from client
 */
export async function POST(request: NextRequest) {
  try {
    // Validate Origin header for security
    const origin = request.headers.get('origin');
    if (!MCPHttpTransport.validateOrigin(origin)) {
      return NextResponse.json(
        { error: 'Invalid origin' },
        { status: 403 }
      );
    }

    // Get or create session
    let sessionId = request.headers.get('mcp-session-id');
    const body = await request.text();
    const message = MCPHttpTransport.parseMessage(body);

    if (!message) {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
        { status: 400 }
      );
    }

    // Handle initialize request
    if (MCPHttpTransport.isRequest(message) && message.method === 'initialize') {
      sessionId = sessionManager.createSession();
      const server = getMcpServer();
      
      const result = {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: false, listChanged: true },
          prompts: { listChanged: true },
        },
        serverInfo: {
          name: '7zi-mcp-server',
          version: '1.0.0',
        },
      };

      return NextResponse.json(
        { jsonrpc: '2.0', id: message.id, result },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Mcp-Session-Id': sessionId,
            'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
          },
        }
      );
    }

    // Validate session for non-initialize requests
    if (!sessionId || !sessionManager.hasSession(sessionId)) {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32001, message: 'Session not found' }, id: message.id || null },
        { status: 404 }
      );
    }

    // Handle notifications (no response needed)
    if (MCPHttpTransport.isNotification(message)) {
      // Process notification but don't send response
      return new NextResponse(null, { status: 202 });
    }

    // Handle tool-related requests
    if (MCPHttpTransport.isRequest(message)) {
      const server = getMcpServer();
      
      switch (message.method) {
        case 'tools/list': {
          const tools = server.getTools().map(t => ({
            name: t.name,
            title: t.title,
            description: t.description,
            inputSchema: t.inputSchema,
          }));
          
          return NextResponse.json(
            { jsonrpc: '2.0', id: message.id, result: { tools } },
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Mcp-Session-Id': sessionId,
                'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
              },
            }
          );
        }

        case 'tools/call': {
          const params = message.params as { name: string; arguments: Record<string, unknown> };
          const tools = server.getTools();
          const tool = tools.find(t => t.name === params.name);
          
          if (!tool) {
            return NextResponse.json(
              {
                jsonrpc: '2.0',
                id: message.id,
                error: { code: -32602, message: `Unknown tool: ${params.name}` },
              },
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Mcp-Session-Id': sessionId,
                },
              }
            );
          }

          try {
            const result = await tool.handler(params.arguments as Parameters<typeof tool.handler>[0]);
            return NextResponse.json(
              { jsonrpc: '2.0', id: message.id, result },
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Mcp-Session-Id': sessionId,
                  'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
                },
              }
            );
          } catch (error) {
            return NextResponse.json(
              {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                  content: [{ type: 'text', text: `Tool execution error: ${error}` }],
                  isError: true,
                },
              },
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Mcp-Session-Id': sessionId,
                },
              }
            );
          }
        }

        case 'ping': {
          return NextResponse.json(
            { jsonrpc: '2.0', id: message.id, result: {} },
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Mcp-Session-Id': sessionId,
                'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
              },
            }
          );
        }

        default:
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id: message.id,
              error: { code: -32601, message: `Method not found: ${message.method}` },
            },
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Mcp-Session-Id': sessionId,
              },
            }
          );
      }
    }

    // Handle response (from client to server)
    if (MCPHttpTransport.isResponse(message)) {
      return new NextResponse(null, { status: 202 });
    }

    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: null },
      { status: 400 }
    );
  } catch (error) {
    console.error('[MCP] Error handling request:', error);
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests - Open SSE stream for server messages
 */
export async function GET(request: NextRequest) {
  // Validate session
  const sessionId = request.headers.get('mcp-session-id');
  
  // Check Accept header
  const accept = request.headers.get('accept') || '';
  if (!accept.includes('text/event-stream')) {
    return NextResponse.json(
      { error: 'Accept header must include text/event-stream' },
      { status: 400 }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let keepAliveInterval: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(toSSE({
        event: 'connected',
        data: JSON.stringify({ sessionId, timestamp: new Date().toISOString() }),
      })));

      // Keep-alive messages every 30 seconds
      keepAliveInterval = setInterval(() => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 30000);
    },

    cancel() {
      clearInterval(keepAliveInterval);
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Mcp-Session-Id': sessionId || '',
      'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
    },
  });
}

/**
 * Handle DELETE requests - Terminate session
 */
export async function DELETE(request: NextRequest) {
  const sessionId = request.headers.get('mcp-session-id');
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Mcp-Session-Id header required' },
      { status: 400 }
    );
  }

  const deleted = sessionManager.deleteSession(sessionId);
  
  if (deleted) {
    return NextResponse.json(
      { message: 'Session terminated' },
      { status: 200 }
    );
  } else {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    );
  }
}