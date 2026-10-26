/**
 * A2A API Route - JSON-RPC Endpoint
 * POST /api/a2a/jsonrpc
 *
 * Handles JSON-RPC 2.0 requests for the A2A protocol
 *
 * @refactored - Added request validation and improved error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { withA2AAuth } from '@/lib/agents/a2a/auth'
import { A2ARequestHandler, createRequestHandler } from '@/lib/agents/a2a/jsonrpc-handler'
import { getTaskStore } from '@/lib/agents/a2a/task-store'
import { createSevenZiExecutor } from '@/lib/agents/a2a/executor'
import { getAgentCard, getExtendedAgentCard } from '@/lib/agents/a2a/agent-card'
import { JsonRpcRequest, JsonRpcResponse } from '@/lib/agents/a2a/types'
import {
  jsonRpcRequestSchema,
  jsonRpcBatchRequestSchema,
  validateBody,
  formatValidationErrors,
} from '@/lib/api/validation'
import { logger } from '@/lib/logger'

// Initialize handler (singleton pattern)

/**
 * Get CORS headers
 * Enforces strict origin validation using NEXT_PUBLIC_SITE_URL
 */
function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function getHandler(): A2ARequestHandler {
  // 每次都新建 handler。
  //
  // 之前用模块级 `let handler` 缓存，模块只加载一次就再也不重建。
  // 后果：
  // 1. 测试里无法替换 handler —— 每个用例 vi.mock 的 createRequestHandler
  //    返回值都被忽略，响应始终来自第一个用例留下的实例。
  // 2. process.env.NEXT_PUBLIC_SITE_URL 在构造时就被读进去，
  //    之后改环境变量也不生效。
  //
  // handler 本身是无状态的（所有依赖都在构造时传入），
  // 缓存没有收益；构造开销也只是几个对象引用。
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return createRequestHandler(
    getAgentCard(baseUrl),
    getTaskStore(),
    createSevenZiExecutor(),
    getExtendedAgentCard(baseUrl)
  )
}

/**
 * Process a single JSON-RPC request
 * Returns raw JSON-RPC response (caller will wrap in NextResponse)
 */
async function processSingleRequest(body: unknown): Promise<JsonRpcResponse> {
  const handler = getHandler()

  // Validate request structure
  if (typeof body !== 'object' || body === null) {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Invalid request',
      },
      id: null,
    }
  }

  const request = body as JsonRpcRequest

  // Validate against JSON-RPC schema
  const validation = validateBody(request, jsonRpcRequestSchema)

  if (!validation.success) {
    const errors = formatValidationErrors(validation.errors)
    return {
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Invalid request format',
        data: errors,
      },
      id: request.id ?? null,
    }
  }

  // Process the request
  const response = await handler.handleRequest(request)
  return response
}

/**
 * Process a batch of JSON-RPC requests
 */
async function processBatchRequest(body: unknown): Promise<JsonRpcResponse[]> {
  // Validate batch request
  const validation = validateBody(body, jsonRpcBatchRequestSchema)

  if (!validation.success) {
    return [
      {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid batch request format',
        },
        id: null,
      },
    ]
  }

  const requests = body as JsonRpcRequest[]

  // Process all requests in parallel
  return Promise.all(requests.map(request => processSingleRequest(request)))
}

export async function POST(request: NextRequest) {
  // A2A 路由必须自己守门：仓库没有根 middleware.ts，
  // 没有全局鉴权层。AgentCard 声明了 bearerAuth + apiKey，
  // 这里按声明校验（见 src/lib/agents/a2a/auth.ts）。
  //
  // 注意传的是 POSTHandler 而不是 POST ——
  // withA2AAuth 会调用传入的 handler，
  // 传 POST 会造成 POST -> withA2AAuth -> POST 的无限递归。
  return withA2AAuth(request, POSTHandler)
}

/**
 * POST /api/a2a/jsonrpc
 * Handle JSON-RPC requests (single or batch)
 */
async function POSTHandler(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()

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
      )
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
        )
      }

      const responses = await processBatchRequest(body)
      return NextResponse.json(responses, { headers: getCorsHeaders() })
    }

    // Handle single request
    const response = await processSingleRequest(body)

    // Determine appropriate status code
    const statusCode = response.error ? determineErrorStatusCode(response.error.code) : 200

    return NextResponse.json(response, { status: statusCode, headers: getCorsHeaders() })
  } catch (error) {
    logger.error('A2A JSON-RPC error', error)

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
      )
    }

    // Generic error response
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data:
            process.env.NODE_ENV === 'development'
              ? { message: error instanceof Error ? error.message : String(error) }
              : undefined,
        },
        id: null,
      },
      { status: 500, headers: getCorsHeaders() }
    )
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
      return 400

    case -32601: // Method not found
      return 404

    case -32603: // Internal error
    default:
      return 500
  }
}

/**
 * CORS headers for cross-origin requests
 * Enforces strict origin validation using NEXT_PUBLIC_SITE_URL
 */
export async function OPTIONS() {
  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio'
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  })
}
