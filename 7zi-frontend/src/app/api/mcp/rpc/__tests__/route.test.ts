/**
 * MCP JSON-RPC API Route Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, OPTIONS } from '../route'
import { mcpServer } from '@/lib/mcp/server'

// Mock MCP server
vi.mock('@/lib/mcp/server', () => ({
  mcpServer: {
    handleRequest: vi.fn(),
  },
}))

// Mock API auth
vi.mock('@/lib/auth/api-auth', () => ({
  authenticateAPIKey: vi.fn(() => ({
    authenticated: true,
    userId: 'api-service',
    username: 'api-service',
    role: 'service',
    authMethod: 'api-key',
  })),
  getMCPCORSHeaders: vi.fn(() => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  })),
}))

describe('MCP JSON-RPC API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('OPTIONS /api/mcp/rpc', () => {
    it('should handle CORS preflight request', async () => {
      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url, { method: 'OPTIONS' })
      const response = await OPTIONS(request)

      expect(response.status).toBe(204)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
        'Content-Type, Authorization, X-API-Key'
      )
    })
  })

  describe('GET /api/mcp/rpc', () => {
    it('should return MCP server information', async () => {
      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(data.name).toBe('OpenClaw MCP Server')
      expect(data.version).toBe('1.0.0')
      expect(data.protocol).toBe('Model Context Protocol (MCP)')
      expect(data.endpoints.rpc).toBe('/api/mcp/rpc')
      expect(data.methods['tools/list']).toBe('List available tools')
      expect(data.methods['tools/call']).toBe('Execute a tool')
    })
  })

  describe('POST /api/mcp/rpc', () => {
    it('should handle valid JSON-RPC request', async () => {
      const mockResponse = {
        jsonrpc: '2.0' as const,
        id: 1,
        result: {
          tools: [{ name: 'read_file', description: 'Read file' }],
        },
      }
      vi.mocked(mcpServer.handleRequest).mockResolvedValue(mockResponse)

      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(mcpServer.handleRequest).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      })
      expect(data).toEqual(mockResponse)
    })

    it('should handle tools/list request', async () => {
      const mockResponse = {
        jsonrpc: '2.0' as const,
        id: 1,
        result: {
          tools: [
            {
              name: 'read_file',
              description: 'Read file contents',
            },
            {
              name: 'write_file',
              description: 'Write file contents',
            },
          ],
        },
      }
      vi.mocked(mcpServer.handleRequest).mockResolvedValue(mockResponse)

      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.result.tools).toHaveLength(2)
    })

    it('should handle tools/call request', async () => {
      const mockResponse = {
        jsonrpc: '2.0' as const,
        id: 2,
        result: {
          content: [
            {
              type: 'text',
              text: 'File contents here',
            },
          ],
        },
      }
      vi.mocked(mcpServer.handleRequest).mockResolvedValue(mockResponse)

      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'read_file',
            arguments: {
              path: '/path/to/file.txt',
            },
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mcpServer.handleRequest).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'read_file',
          arguments: {
            path: '/path/to/file.txt',
          },
        },
      })
    })

    it('should return error for invalid jsonrpc version', async () => {
      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '1.0',
          id: 1,
          method: 'tools/list',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc version must be 2.0',
        },
      })
    })

    it('should return error for missing jsonrpc field', async () => {
      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          id: 1,
          method: 'tools/list',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc version must be 2.0',
        },
      })
    })

    it('should return error for missing method field', async () => {
      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid Request: method is required',
        },
      })
    })

    it('should return parse error for invalid JSON', async () => {
      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url, {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error: Invalid JSON',
        },
      })
    })

    it('should return correct CORS headers in error responses', async () => {
      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '1.0',
          id: 1,
          method: 'tools/list',
        }),
      })

      const response = await POST(request)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
        'Content-Type, Authorization, X-API-Key'
      )
    })

    it('should handle error responses from MCP server', async () => {
      const mockResponse = {
        jsonrpc: '2.0' as const,
        id: 1,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      }
      vi.mocked(mcpServer.handleRequest).mockResolvedValue(mockResponse)

      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'invalid_method',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.error).toEqual({
        code: -32601,
        message: 'Method not found',
      })
    })

    it('should handle batch requests', async () => {
      const mockResponse = [
        {
          jsonrpc: '2.0' as const,
          id: 1,
          result: { tools: [] },
        },
        {
          jsonrpc: '2.0' as const,
          id: 2,
          result: { content: [] },
        },
      ]
      vi.mocked(mcpServer.handleRequest).mockResolvedValue(
        mockResponse as unknown as Awaited<ReturnType<typeof mcpServer.handleRequest>>
      )

      const url = new URL('http://localhost/api/mcp/rpc')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify([
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
          },
          {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: { name: 'read_file', arguments: {} },
          },
        ]),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
    })
  })
})
