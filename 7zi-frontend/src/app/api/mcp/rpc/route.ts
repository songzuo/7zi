/**
 * MCP JSON-RPC 2.0 API Route
 *
 * 处理 MCP (Model Context Protocol) JSON-RPC 请求
 * Requires API Key authentication
 *
 * @openapi
 * /api/mcp/rpc:
 *   get:
 *     summary: Get MCP Server information
 *     description: Returns information about the MCP Server including version, protocol, and available methods.
 *     tags:
 *       - MCP
 *     responses:
 *       200:
 *         description: MCP Server information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: OpenClaw MCP Server
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 protocol:
 *                   type: string
 *                   example: Model Context Protocol (MCP)
 *                 specification:
 *                   type: string
 *                   format: uri
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     rpc:
 *                       type: string
 *                       example: /api/mcp/rpc
 *                 methods:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     tools/list: List available tools
 *                     tools/call: Execute a tool
 *   post:
 *     summary: Process MCP JSON-RPC 2.0 request
 *     description: Processes JSON-RPC 2.0 requests for the Model Context Protocol. Requires API Key authentication.
 *     tags:
 *       - MCP
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/MCPRequest'
 *               - type: array
 *                 items:
 *                   $ref: '#/components/schemas/MCPRequest'
 *           examples:
 *             listTools:
 *               summary: List available tools
 *               value:
 *                 jsonrpc: 2.0
 *                 id: 1
 *                 method: tools/list
 *             callTool:
 *               summary: Call a tool
 *               value:
 *                 jsonrpc: 2.0
 *                 id: 2
 *                 method: tools/call
 *                 params:
 *                   name: read_file
 *                   arguments:
 *                     path: /path/to/file.txt
 *     responses:
 *       200:
 *         description: JSON-RPC response
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/MCPResponse'
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/MCPResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MCPError'
 *       400:
 *         description: Invalid request (parse error, invalid format)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MCPError'
 *       404:
 *         description: Method not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MCPError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MCPError'
 *   options:
 *     summary: CORS preflight request
 *     description: Handles CORS preflight requests for cross-origin access.
 *     tags:
 *       - MCP
 *     responses:
 *       204:
 *         description: CORS headers returned
 *
 * @openapi components:
 *   schemas:
 *     MCPRequest:
 *       type: object
 *       required:
 *         - jsonrpc
 *         - id
 *         - method
 *       properties:
 *         jsonrpc:
 *           type: string
 *           enum: ["2.0"]
 *           description: JSON-RPC version
 *         id:
 *           type: string
 *           description: Request identifier
 *         method:
 *           type: string
 *           description: Method name to invoke
 *           enum: [tools/list, tools/call]
 *         params:
 *           type: object
 *           description: Method parameters
 *           properties:
 *             name:
 *               type: string
 *               description: Tool name (for tools/call)
 *             arguments:
 *               type: object
 *               description: Tool arguments (for tools/call)
 *     MCPResponse:
 *       type: object
 *       required:
 *         - jsonrpc
 *         - id
 *       properties:
 *         jsonrpc:
 *           type: string
 *           enum: ["2.0"]
 *         id:
 *           type: string
 *         result:
 *           type: object
 *           description: Result data
 *           properties:
 *             tools:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ToolDefinition'
 *             content:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [text, image, resource]
 *                   text:
 *                     type: string
 *                   data:
 *                     type: string
 *                   mimeType:
 *                     type: string
 *             isError:
 *               type: boolean
 *     MCPError:
 *       type: object
 *       required:
 *         - jsonrpc
 *         - id
 *         - error
 *       properties:
 *         jsonrpc:
 *           type: string
 *           enum: ["2.0"]
 *         id:
 *           type: string
 *           nullable: true
 *         error:
 *           type: object
 *           required:
 *             - code
 *             - message
 *           properties:
 *             code:
 *               type: integer
 *               description: JSON-RPC error code
 *               enum: [-32700, -32600, -32601, -32602, -32603, -32001]
 *             message:
 *               type: string
 *               description: Error message
 *             data:
 *               type: object
 *               description: Additional error data
 *     ToolDefinition:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - inputSchema
 *       properties:
 *         name:
 *           type: string
 *           description: Tool name
 *           example: read_file
 *         description:
 *           type: string
 *           description: Tool description
 *           example: Read the contents of a file
 *         inputSchema:
 *           type: object
 *           required:
 *             - type
 *           properties:
 *             type:
 *               type: string
 *               enum: ["object"]
 *             properties:
 *               type: object
 *               additionalProperties: true
 *             required:
 *               type: array
 *               items:
 *                 type: string
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: X-API-Key
 */

import { NextRequest, NextResponse } from "next/server";
import { mcpServer } from "@/lib/mcp/server";
import { authenticateAPIKey, getMCPCORSHeaders } from "@/lib/auth/api-auth";

/**
 * 处理 OPTIONS 请求（CORS 预检）
 */
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getMCPCORSHeaders(request);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * 处理 MCP JSON-RPC POST 请求
 * Requires API Key authentication
 */
export async function POST(request: NextRequest) {
  // Authenticate with API key
  const authResult = authenticateAPIKey(request);
  const corsHeaders = getMCPCORSHeaders(request);

  if (!authResult.authenticated) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "Unauthorized: Invalid or missing API key",
        },
      },
      { 
        status: 401,
        headers: corsHeaders,
      }
    );
  }

  try {
    // 解析 JSON-RPC 请求
    const body = await request.json();

    // 检查是否是批量请求
    if (Array.isArray(body)) {
      const response = await mcpServer.handleRequest(body);
      return NextResponse.json(response, {
        headers: corsHeaders,
      });
    }

    // 验证请求格式（单个请求）
    if (!body.jsonrpc || body.jsonrpc !== "2.0") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: body.id || null,
          error: {
            code: -32600,
            message: "Invalid Request: jsonrpc version must be 2.0",
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.method) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: body.id || null,
          error: {
            code: -32600,
            message: "Invalid Request: method is required",
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 处理 MCP 请求
    const response = await mcpServer.handleRequest(body);

    return NextResponse.json(response, {
      headers: corsHeaders,
    });
  } catch {
    // JSON 解析错误
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error: Invalid JSON",
        },
      },
      { status: 400, headers: corsHeaders }
    );
  }
}

/**
 * GET 方法：返回 MCP Server 信息
 */
export async function GET(request: NextRequest) {
  const corsHeaders = getMCPCORSHeaders(request);
  
  return NextResponse.json(
    {
      name: "OpenClaw MCP Server",
      version: "1.0.0",
      protocol: "Model Context Protocol (MCP)",
      specification: "https://modelcontextprotocol.io/specification",
      endpoints: {
        rpc: "/api/mcp/rpc",
      },
      methods: {
        "tools/list": "List available tools",
        "tools/call": "Execute a tool",
      },
      auth: {
        method: "API Key",
        header: "X-API-Key",
      },
    },
    { headers: corsHeaders }
  );
}
