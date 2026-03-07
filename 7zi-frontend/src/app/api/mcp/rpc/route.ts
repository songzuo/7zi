/**
 * MCP JSON-RPC 2.0 API Route
 *
 * 处理 MCP (Model Context Protocol) JSON-RPC 请求
 * POST /api/mcp/rpc
 */

import { NextRequest, NextResponse } from "next/server";
import { mcpServer } from "@/lib/mcp/server";

/**
 * 支持 CORS（用于 Claude Desktop 等客户端）
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * 处理 OPTIONS 请求（CORS 预检）
 */
export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

/**
 * 处理 MCP JSON-RPC POST 请求
 */
export async function POST(request: NextRequest) {
  try {
    // 解析 JSON-RPC 请求
    const body = await request.json();

    // 验证请求格式
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
        { headers: CORS_HEADERS }
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
        { headers: CORS_HEADERS }
      );
    }

    // 处理 MCP 请求
    const response = await mcpServer.handleRequest(body);

    return NextResponse.json(response, {
      headers: CORS_HEADERS,
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
      { headers: CORS_HEADERS }
    );
  }
}

/**
 * GET 方法：返回 MCP Server 信息
 */
export async function GET() {
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
    },
    { headers: CORS_HEADERS }
  );
}